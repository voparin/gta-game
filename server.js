'use strict';
// Sivatagi GTA – többjátékos szerver (ADR-0044). Függőség nélkül: a Node beépített http + crypto moduljával.
// Kiszolgálja a játék fájljait, és a /ws címen WebSocketen továbbítja a játékosok helyzetét a többieknek.
// Indítás: node server.js   (port: PORT környezeti változó, alapból 8080) – aztán a böngészőben: http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/game.js': 'game.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const TICK_MS = 100;                 // ennyi időnként küldi szét mindenki helyzetét
const MAX_PLAYERS = 32, MAX_MSG = 2048, IDLE_MS = 15000, MAX_BACKLOG = 64 * 1024;   // a lassú / nem olvasó kliens kidobása (ne nőjön a memória)

// egy játékos állapotának szűrése (a kliensre nem bízunk semmit)
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);
const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : '');
function cleanState(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    name: str(s.name, 16) || 'Játékos', x: num(s.x, -1e7, 1e7), y: num(s.y, -1e7, 1e7), a: num(s.a, -10, 10),
    car: !!s.car, len: num(s.len, 10, 200), wid: num(s.wid, 8, 120), c0: str(s.c0, 9), c1: str(s.c1, 9), kind: str(s.kind, 12),
    shirt: str(s.shirt, 9), head: str(s.head, 9), legs: str(s.legs, 9), hat: str(s.hat, 9), hp: num(s.hp, 0, 100), dead: !!s.dead,
  };
}

// ---- WebSocket keretek (RFC 6455): a kliens maszkolt szöveget küld, a szerver maszkolatlant ----
function encodeFrame(text) {
  const data = Buffer.from(text, 'utf8'), n = data.length;
  const head = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : null;
  if (!head) return null;                          // ekkora üzenetet nem küldünk
  return Buffer.concat([head, data]);
}
// a pufferből kiveszi az összes teljes keretet; { frames: [{op, text}], rest }
function decodeFrames(buf) {
  const frames = [];
  let off = 0;
  while (buf.length - off >= 2) {
    const b0 = buf[off], b1 = buf[off + 1], op = b0 & 15, masked = !!(b1 & 128);
    let len = b1 & 127, p = off + 2;
    if (len === 126) { if (buf.length - p < 2) break; len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) return { frames, rest: Buffer.alloc(0), bad: true };   // túl nagy
    if (len > MAX_MSG) return { frames, rest: Buffer.alloc(0), bad: true };
    if (!masked) return { frames, rest: Buffer.alloc(0), bad: true };            // a kliensnek maszkolnia kell (RFC 6455)
    if (op >= 8 && (len > 125 || !(b0 & 128))) return { frames, rest: Buffer.alloc(0), bad: true };   // vezérlőkeret: kicsi és nem darabolt
    const mask = buf.slice(p, p + 4); p += 4;
    if (buf.length - p < len) break;
    const data = Buffer.from(buf.slice(p, p + len));
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    frames.push({ op, text: data.toString('utf8') });
    off = p + len;
  }
  return { frames, rest: buf.slice(off) };
}

function createServer() {
  const players = new Map();                       // id → { sock, state, seen }
  let nextId = 1;
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0], file = FILES[url];
    if (url === '/status') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ players: players.size })); return; }
    if (!file) { res.writeHead(404); res.end('Nincs ilyen oldal'); return; }
    fs.readFile(path.join(ROOT, file), (err, data) => {
      if (err) { res.writeHead(500); res.end('Hiba'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-cache' }); res.end(data);
    });
  });
  server.on('upgrade', (req, sock) => {
    const origin = req.headers.origin;                                            // csak a saját oldalról (más weboldal ne foglalhasson helyet)
    const sameOrigin = !origin || origin.replace(/^https?:\/\//, '') === req.headers.host;
    if ((req.url || '').split('?')[0] !== '/ws' || !req.headers['sec-websocket-key'] || !/websocket/i.test(req.headers.upgrade || '') || !sameOrigin || players.size >= MAX_PLAYERS) { sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    sock.setNoDelay(true);
    const id = nextId++, p = { sock, state: null, seen: Date.now() };
    players.set(id, p);
    const send = obj => { const f = encodeFrame(JSON.stringify(obj)); if (f && !sock.destroyed) sock.write(f); };
    send({ t: 'hello', id });
    let buf = Buffer.alloc(0);
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      const { frames, rest, bad } = decodeFrames(buf);
      buf = rest;
      if (bad) { sock.destroy(); return; }
      p.seen = Date.now();                                                    // bármilyen keret életjel
      for (const f of frames) {
        if (f.op === 8) { sock.write(Buffer.from([0x88, 0])); sock.end(); return; }   // bezárás (visszaigazolva)
        if (f.op === 9) { sock.write(Buffer.from([0x8a, 0])); continue; }        // ping → pong
        if (f.op !== 1) continue;
        let msg; try { msg = JSON.parse(f.text); } catch (e) { continue; }
        if (msg && msg.t === 'state') { const st = cleanState(msg.s); if (st) p.state = st; }
      }
    });
    const drop = () => players.delete(id);
    sock.on('close', drop); sock.on('error', drop); sock.on('end', drop);
  });
  const timer = setInterval(() => {                // időnként mindenkinek elküldi a többiek helyzetét
    const now = Date.now(), list = [];
    for (const [id, p] of players) {
      if (now - p.seen > IDLE_MS) { p.sock.destroy(); players.delete(id); continue; }
      if (p.state) list.push({ id, ...p.state });
    }
    const f = encodeFrame(JSON.stringify({ t: 'players', list }));
    if (f) for (const [id, p] of players) {
      if (p.sock.destroyed) continue;
      if (p.sock.writableLength > MAX_BACKLOG) { p.sock.destroy(); players.delete(id); continue; }   // nem olvas: kidobjuk
      p.sock.write(f);
    }
  }, TICK_MS);
  if (timer.unref) timer.unref();                   // a szerver leállításakor ne tartsa életben a folyamatot
  server.on('close', () => clearInterval(timer));
  return { server, players };
}

module.exports = { createServer, encodeFrame, decodeFrames, cleanState };

if (require.main === module) {
  const port = +process.env.PORT || 8080;
  createServer().server.listen(port, () => console.log(`Sivatagi GTA szerver fut: http://localhost:${port}  (a többiek a hálózaton: http://<a géped IP-címe>:${port})`));
}
