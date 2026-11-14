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
// ezekről a weboldalakról is lehet csatlakozni (a saját címén túl): a GitHub Pages-en futó játék
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://voparin.github.io').split(',').map(s => s.trim()).filter(Boolean);
const MAX_PLAYERS = 32, MAX_MSG = 60000, IDLE_MS = 15000, MAX_BACKLOG = 64 * 1024;   // a lassú / nem olvasó kliens kidobása (ne nőjön a memória)

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

// ===== Játékosprofilok (ADR-0047): név + jelszó, a mentés a szerveren =====
// Tárhely: a Google Cloud Runon a Firestore (REST, függőség nélkül, a gép saját fiókjával); máshol (otthoni gép, teszt) egy JSON-fájl.
const NAME_RE = /^[\p{L}\p{N} _.-]{3,16}$/u, PASS_MIN = 6, PASS_MAX = 64, MAX_PROGRESS = 50000, TOKEN_DAYS = 90, AUTH_PER_MIN = 10;
const LOCK_FAILS = 5, LOCK_MS = 15 * 60000, IP_PER_10MIN = 40, SAVE_GAP_MS = 1000, MAX_STATE = 2048, IO_TIMEOUT = 8000;
const normName = n => (typeof n === 'string' ? n.normalize('NFKC').trim().replace(/\s+/g, ' ') : '');   // NFKC: a széles / összetett alakok egyformák
const nameId = n => 'u_' + encodeURIComponent(normName(n).toLowerCase());   // kis- és nagybetű nem számít
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const hashPass = (pass, salt) => new Promise((ok, no) => crypto.scrypt(pass, salt, 32, (e, k) => (e ? no(e) : ok(k.toString('hex')))));
function cleanProgress(pr) {                        // a mentést szövegként tároljuk; csak a méretét és a formáját ellenőrizzük (a játék úgyis szűri)
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) return null;
  const t = JSON.stringify(pr);
  return t.length <= MAX_PROGRESS ? t : null;
}

function fileStore(dir = process.env.PROFILE_DIR || path.join(ROOT, 'data')) {
  const file = path.join(dir, 'profiles.json');
  let db = { profiles: {}, secret: null };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* még nincs */ }
  const flush = () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db), { mode: 0o600 }); fs.renameSync(file + '.tmp', file); };   // csak a tulajdonos olvashatja (jelszó-hash-ek, kulcs)
  return {
    async get(id) { return db.profiles[id] || null; },
    async create(id, doc) { if (db.profiles[id]) return false; db.profiles[id] = doc; flush(); return true; },
    async update(id, fields) { if (!db.profiles[id]) return false; Object.assign(db.profiles[id], fields); flush(); return true; },
    async secret() { if (!db.secret) { db.secret = crypto.randomBytes(32).toString('hex'); flush(); } return db.secret; },
  };
}

function firestoreStore() {                         // Firestore REST API; a hozzáférési jegyet a Cloud Run gép adja (metadata szerver)
  const META = 'http://metadata.google.internal/computeMetadata/v1/';
  let tok = null, tokUntil = 0, project = process.env.GOOGLE_CLOUD_PROJECT || null;
  const to = () => (AbortSignal.timeout ? AbortSignal.timeout(IO_TIMEOUT) : undefined);
  const meta = async p => { const r = await fetch(META + p, { headers: { 'Metadata-Flavor': 'Google' }, signal: to() }); if (!r.ok) throw new Error('metadata ' + r.status); return r; };
  async function auth() {
    if (!project) project = await (await meta('project/project-id')).text();
    if (!tok || Date.now() > tokUntil) { const j = await (await meta('instance/service-accounts/default/token')).json(); tok = j.access_token; tokUntil = Date.now() + (j.expires_in - 60) * 1000; }
    return { headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, base: `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/` };
  }
  const toF = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }])) });
  const fromF = d => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, v.integerValue !== undefined ? +v.integerValue : v.stringValue]));
  const doc = async (method, p, body) => { const a = await auth(); return fetch(a.base + p, { method, headers: a.headers, body: body ? JSON.stringify(body) : undefined, signal: to() }); };
  return {
    async get(id) { const r = await doc('GET', 'profiles/' + encodeURIComponent(id)); if (r.status === 404) return null; if (!r.ok) throw new Error('get ' + r.status); return fromF(await r.json()); },
    async create(id, d) { const r = await doc('POST', 'profiles?documentId=' + encodeURIComponent(id), toF(d)); if (r.status === 409) return false; if (!r.ok) throw new Error('create ' + r.status); return true; },
    async update(id, f) {
      const mask = Object.keys(f).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
      const r = await doc('PATCH', 'profiles/' + encodeURIComponent(id) + '?currentDocument.exists=true&' + mask, toF(f)); return r.ok;
    },
    async secret() {
      const r = await doc('GET', 'config/secret');
      if (r.ok) return fromF(await r.json()).value;
      const value = crypto.randomBytes(32).toString('hex');
      const c = await doc('POST', 'config?documentId=secret', toF({ value }));
      if (c.ok) return value;
      return fromF(await (await doc('GET', 'config/secret')).json()).value;   // közben más hozta létre
    },
  };
}
const defaultStore = () => (process.env.K_SERVICE && !process.env.PROFILE_DIR ? firestoreStore() : fileStore());   // K_SERVICE: a Cloud Run állítja be

function accounts(store) {                          // regisztráció, belépés, bejelentkezési jegy (HMAC-aláírt), mentés
  let secret = null;
  const getSecret = async () => (secret = secret || await store.secret());
  async function makeToken(id) {
    const payload = b64u(JSON.stringify({ id, exp: Date.now() + TOKEN_DAYS * 864e5 }));
    return payload + '.' + b64u(crypto.createHmac('sha256', await getSecret()).update(payload).digest());
  }
  async function readToken(t) {
    if (typeof t !== 'string' || t.length > 500 || !t.includes('.')) return null;
    const [payload, sig] = t.split('.'), good = b64u(crypto.createHmac('sha256', await getSecret()).update(payload).digest());
    const sb = Buffer.from(sig || ''), gb = Buffer.from(good);
    if (sb.length !== gb.length || !crypto.timingSafeEqual(sb, gb)) return null;   // bájthossz alapján (a nem ASCII karakter se dobjon hibát)
    try { const j = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); return j.exp > Date.now() ? j.id : null; } catch (e) { return null; }
  }
  const ok = async (id, d) => ({ t: 'auth_ok', name: d.name, token: await makeToken(id), progress: d.progress ? JSON.parse(d.progress) : null, rev: +d.rev || 0 });
  const fails = new Map();                          // fiókonként a sikertelen belépések (zárolás: 5 hiba → 15 perc)
  const locked = id => { const f = fails.get(id); return f && f.n >= LOCK_FAILS && Date.now() - f.at < LOCK_MS; };
  const failed = id => { const f = fails.get(id); const n = f && Date.now() - f.at < LOCK_MS ? f.n + 1 : 1; fails.set(id, { n, at: Date.now() }); if (fails.size > 10000) fails.clear(); };
  return {
    async register(name, pass, progress) {
      name = normName(name);
      if (!NAME_RE.test(name)) return { t: 'auth_err', msg: 'A név 3–16 betű, szám, szóköz, _ . - lehet' };
      if (/^vend[ée]g\b/i.test(name)) return { t: 'auth_err', msg: 'Ez a név foglalt – válassz másikat' };   // a vendégek neve
      if (typeof pass !== 'string' || pass.length < PASS_MIN || pass.length > PASS_MAX) return { t: 'auth_err', msg: `A jelszó ${PASS_MIN}–${PASS_MAX} karakter legyen` };
      const salt = crypto.randomBytes(16).toString('hex'), id = nameId(name);
      const pt = progress ? cleanProgress(progress) : '';
      if (pt === null) return { t: 'auth_err', msg: 'A játékállás túl nagy – szólj a fejlesztőnek' };   // ne vesszen el csendben
      const d = { name, salt, hash: await hashPass(pass, salt), progress: pt, rev: +(progress && progress.rev) || 0, created: Date.now() };
      if (!(await store.create(id, d))) return { t: 'auth_err', msg: 'Ez a név már foglalt – válassz másikat, vagy lépj be' };
      return { ...(await ok(id, d)), id };
    },
    async login(name, pass) {
      const id = nameId(name);
      if (locked(id)) return { t: 'auth_err', msg: 'Túl sok hibás jelszó – ez a profil 15 percre zárolva' };
      const d = typeof pass === 'string' && pass.length <= PASS_MAX ? await store.get(id) : null;
      const h = await hashPass(typeof pass === 'string' ? pass : '', d ? d.salt : 'nincs-ilyen');   // ismeretlen névnél is számol (ne lehessen időből kitalálni)
      if (!d || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(d.hash.length === h.length ? d.hash : h.replace(/./g, '0')))) { failed(id); return { t: 'auth_err', msg: 'Hibás név vagy jelszó' }; }
      fails.delete(id);
      return { ...(await ok(id, d)), id };
    },
    async resume(token) {
      const id = await readToken(token), d = id && await store.get(id);
      if (!d) return { t: 'auth_err', msg: 'Lejárt a belépés – lépj be újra', expired: true };
      return { ...(await ok(id, d)), id };
    },
    // mentés verzióval: a régebbi (pl. egy elavult lap / másik gép) nem írhatja felül az újabbat
    async save(id, progress) {
      const t = cleanProgress(progress), rev = +(progress && progress.rev) || 0;
      if (!t) return { ok: false };
      const d = await store.get(id);
      if (!d) return { ok: false };
      if (rev <= (+d.rev || 0)) return { ok: false, stale: true, rev: +d.rev || 0 };
      return { ok: !!(await store.update(id, { progress: t, rev, saved: Date.now() })), rev };
    },
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

function createServer(store = defaultStore()) {
  const acc = accounts(store);
  const ipTries = new Map();                        // IP-címenként a belépési kísérletek (10 percenként legfeljebb 40)
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
    const sameOrigin = !origin || origin.replace(/^https?:\/\//, '') === req.headers.host || ALLOWED_ORIGINS.includes(origin);
    if ((req.url || '').split('?')[0] !== '/ws' || !req.headers['sec-websocket-key'] || !/websocket/i.test(req.headers.upgrade || '') || !sameOrigin || players.size >= MAX_PLAYERS) { sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    sock.setNoDelay(true);
    const ip = String(req.headers['x-forwarded-for'] || sock.remoteAddress || '').split(',')[0].trim();   // a Cloud Run az eredeti címet az X-Forwarded-For-ban adja
    const id = nextId++, p = { sock, state: null, seen: Date.now(), user: null, tries: [], lastSave: 0, ip };
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
        if (f.text.length > MAX_STATE && !/^\{"t":"(save|register)"/.test(f.text)) continue;   // a nagy üzenet csak mentés lehet
        let msg; try { msg = JSON.parse(f.text); } catch (e) { continue; }
        if (msg && msg.t === 'state') { const st = cleanState(msg.s); if (st) { st.name = p.user ? p.user.name : 'Vendég ' + id; p.state = st; } }   // a név a fiókból jön (ne lehessen másnak kiadni magad)
        else if (msg && ['register', 'login', 'auth'].includes(msg.t)) {
          const now = Date.now(); p.tries = p.tries.filter(t => now - t < 60000);
          const it = (ipTries.get(p.ip) || []).filter(t => now - t < 600000);
          if (p.tries.length >= AUTH_PER_MIN || it.length >= IP_PER_10MIN) { send({ t: 'auth_err', msg: 'Túl sok próbálkozás – várj egy kicsit' }); continue; }
          p.tries.push(now); it.push(now); ipTries.set(p.ip, it); if (ipTries.size > 5000) ipTries.clear();
          const job = msg.t === 'register' ? acc.register(msg.name, msg.pass, msg.progress) : msg.t === 'login' ? acc.login(msg.name, msg.pass) : acc.resume(msg.token);
          job.then(r => { if (r.t === 'auth_ok') p.user = { id: r.id, name: r.name }; delete r.id; send(r); })
            .catch(e => { console.error('fiókhiba', e.message); send({ t: 'auth_err', msg: 'A szerver most nem éri el a fiókokat – próbáld újra' }); });
        } else if (msg && msg.t === 'save' && p.user) {
          const now = Date.now();
          if (now - p.lastSave < SAVE_GAP_MS) { send({ t: 'saved', ok: false, slow: true }); continue; }   // másodpercenként legfeljebb egy mentés
          p.lastSave = now;
          acc.save(p.user.id, msg.progress).then(r => send({ t: 'saved', ...r })).catch(e => { console.error('mentési hiba', e.message); send({ t: 'saved', ok: false }); });
        } else if (msg && msg.t === 'logout') p.user = null;
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

module.exports = { createServer, encodeFrame, decodeFrames, cleanState, fileStore, accounts, normName, nameId };

if (require.main === module) {
  const port = +process.env.PORT || 8080;
  createServer().server.listen(port, () => console.log(`Sivatagi GTA szerver fut: http://localhost:${port}  (a többiek a hálózaton: http://<a géped IP-címe>:${port})`));
}
