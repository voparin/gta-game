'use strict';
// A többjátékos szerver tesztje (ADR-0044): elindítja a szervert egy szabad porton, két WebSocket-klienssel
// ellenőrzi, hogy kiszolgálja a játékot, és a játékosok látják egymás helyzetét.
// Futtatás: node tests/server.test.js   (Node 22+, a beépített WebSocket-kliens miatt)
const { createServer, encodeFrame, decodeFrames, cleanState } = require('../server.js');

let failed = 0;
function check(name, cond) { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) failed++; }
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (cond, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await wait(20); } return cond(); };

(async () => {
  // tiszta függvények
  const f = encodeFrame('szia');
  check('a szerver keretében a szöveg maszkolatlanul, helyes hosszal megy', f[0] === 0x81 && f[1] === 4 && f.slice(2).toString() === 'szia');
  const mask = [1, 2, 3, 4], body = Buffer.from('hello'), masked = Buffer.from(body.map((b, i) => b ^ mask[i % 4]));
  const frame = Buffer.concat([Buffer.from([0x81, 0x80 | body.length, ...mask]), masked]);
  const half = decodeFrames(frame.slice(0, 5));
  check('a félbe érkezett keretet kivárja (nem dolgozza fel)', half.frames.length === 0 && half.rest.length === 5);
  const two = decodeFrames(Buffer.concat([frame, frame]));
  check('a maszkolt kliens-keretet visszafejti, egymás után kettőt is', two.frames.length === 2 && two.frames.every(x => x.text === 'hello' && x.op === 1) && two.rest.length === 0);
  check('a túl nagy keretet elutasítja', decodeFrames(Buffer.from([0x81, 127, 0, 0, 0, 0, 0, 0, 0, 1])).bad === true);
  const st = cleanState({ name: '<b>Pista</b>\u0007 nagyon hosszú név', x: 1e12, y: 'x', a: 2, car: 1, hp: 500, c0: '#ff0000' });
  check('a kliens adatait szűri (név, számok, határok)', st.name === 'bPista/b nagyon ' && st.x === 1e7 && st.y === 0 && st.car === true && st.hp === 100 && st.c0 === '#ff0000');
  check('hibás állapotot eldob', cleanState(null) === null && cleanState(5) === null);
  check('a maszkolatlan kliens-keretet elutasítja (RFC 6455)', decodeFrames(Buffer.from([0x81, 2, 0x68, 0x69])).bad === true);
  check('a túl nagy vezérlőkeretet elutasítja', decodeFrames(Buffer.concat([Buffer.from([0x89, 0x80 | 126, 0, 200, 1, 2, 3, 4]), Buffer.alloc(200)])).bad === true);

  // élő szerver két klienssel
  const { server, players } = createServer();
  await new Promise(r => server.listen(0, r));
  const port = server.address().port, base = `http://127.0.0.1:${port}`;
  const html = await (await fetch(base + '/')).text(), js = await fetch(base + '/game.js'), nf = await fetch(base + '/nincs');
  check('kiszolgálja a játékot (index.html, game.js)', html.includes('game.js') && js.status === 200 && (await js.text()).includes('netConnect'));
  check('ismeretlen címre 404', nf.status === 404);
  const mk = () => { const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`), c = { ws, id: 0, last: null }; ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.t === 'hello') c.id = m.id; if (m.t === 'players') c.last = m.list; }; return c; };
  const a = mk(), b = mk();
  await until(() => a.id && b.id);
  check('mindkét kliens csatlakozik, saját azonosítót kap', a.id > 0 && b.id > 0 && a.id !== b.id && players.size === 2);
  a.ws.send(JSON.stringify({ t: 'state', s: { name: 'Anna', x: 100, y: 200, a: 1, car: false, shirt: '#2f6fd0' } }));
  b.ws.send(JSON.stringify({ t: 'state', s: { name: 'Bence', x: 5000, y: 6000, a: 0, car: true, c0: '#d42020', len: 72, wid: 36 } }));
  await until(() => a.last && a.last.length === 2 && b.last && b.last.length === 2);
  const seenByA = a.last && a.last.find(p => p.id === b.id), seenByB = b.last && b.last.find(p => p.id === a.id);
  check('a játékosok látják egymás helyzetét és kinézetét', !!seenByA && seenByA.name === 'Bence' && seenByA.x === 5000 && seenByA.car === true && !!seenByB && seenByB.name === 'Anna' && seenByB.shirt === '#2f6fd0');
  a.ws.send('nem json'); a.ws.send(JSON.stringify({ t: 'state', s: { name: 'Anna', x: 150, y: 200 } }));
  await until(() => b.last && b.last.find(p => p.id === a.id && p.x === 150));
  check('a hibás üzenetet kihagyja, a mozgást továbbítja', !!(b.last && b.last.find(p => p.id === a.id && p.x === 150)));
  a.ws.close();
  await until(() => players.size === 1 && b.last && b.last.length === 1);
  check('a kilépett játékos eltűnik a többiek listájáról', players.size === 1 && b.last.length === 1 && b.last[0].id === b.id);
  // más weboldalról nem lehet csatlakozni
  const evil = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { origin: 'http://gonosz.example' } });
  let evilOpen = false; evil.onopen = () => { evilOpen = true; }; let evilClosed = false; evil.onerror = () => { evilClosed = true; }; evil.onclose = () => { evilClosed = true; };
  await until(() => evilClosed || evilOpen, 2000);
  check('más weboldal nem csatlakozhat a szerverhez (Origin-ellenőrzés)', !evilOpen && players.size === 1);
  const status = await (await fetch(base + '/status')).json();
  check('a /status kiírja, hányan játszanak', status.players === 1);
  b.ws.close(); await wait(100);
  server.close();
  console.log(failed ? `\n${failed} teszt elbukott` : '\nMinden szerverteszt sikeres');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
