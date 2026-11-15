'use strict';
// A többjátékos szerver tesztje (ADR-0044): elindítja a szervert egy szabad porton, két WebSocket-klienssel
// ellenőrzi, hogy kiszolgálja a játékot, és a játékosok látják egymás helyzetét.
// Futtatás: node tests/server.test.js   (Node 22+, a beépített WebSocket-kliens miatt)
const { createServer, encodeFrame, decodeFrames, cleanState, fileStore, normName, nameId, googleVerifier, GOOGLE_CLIENT_ID } = require('../server.js');
const crypto = require('crypto');
// kamu Google: saját kulcspárral aláírt azonosító-jegyek (a valódi Google-t a teszt nem hívja)
const { publicKey: G_PUB, privateKey: G_PRIV } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const G_JWK = { ...G_PUB.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const gToken = (claims, key = G_PRIV, kid = 'k1') => {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: GOOGLE_CLIENT_ID, sub: '1234567890', exp: Math.floor(Date.now() / 1000) + 3600, ...claims })).toString('base64url');
  return h + '.' + p + '.' + crypto.sign('RSA-SHA256', Buffer.from(h + '.' + p), key).toString('base64url');
};
const os = require('os'), fs = require('fs'), path = require('path');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gta-profiles-'));

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
  const { server, players } = createServer(fileStore(DIR), googleVerifier(GOOGLE_CLIENT_ID, async () => [G_JWK]));
  await new Promise(r => server.listen(0, r));
  const port = server.address().port, base = `http://127.0.0.1:${port}`;
  const html = await (await fetch(base + '/')).text(), js = await fetch(base + '/game.js'), nf = await fetch(base + '/nincs');
  check('kiszolgálja a játékot (index.html, game.js)', html.includes('game.js') && js.status === 200 && (await js.text()).includes('netConnect'));
  check('ismeretlen címre 404', nf.status === 404);
  const mk = () => { const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`), c = { ws, id: 0, last: null, got: [] }; ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.t === 'hello') c.id = m.id; if (m.t === 'players') c.last = m.list; if (m.t === 'hit' || m.t === 'frag') c.got.push(m); }; return c; };
  const a = mk(), b = mk();
  await until(() => a.id && b.id);
  check('mindkét kliens csatlakozik, saját azonosítót kap', a.id > 0 && b.id > 0 && a.id !== b.id && players.size === 2);
  a.ws.send(JSON.stringify({ t: 'state', s: { name: 'Anna', x: 100, y: 200, a: 1, car: false, shirt: '#2f6fd0' } }));
  b.ws.send(JSON.stringify({ t: 'state', s: { name: 'Bence', x: 5000, y: 6000, a: 0, car: true, c0: '#d42020', len: 72, wid: 36 } }));
  await until(() => a.last && a.last.length === 2 && b.last && b.last.length === 2);
  const seenByA = a.last && a.last.find(p => p.id === b.id), seenByB = b.last && b.last.find(p => p.id === a.id);
  check('a játékosok látják egymás helyzetét és kinézetét', !!seenByA && seenByA.x === 5000 && seenByA.car === true && !!seenByB && seenByB.shirt === '#2f6fd0');
  check('fiók nélkül a név „Vendég” (a kliens nem adhatja ki magát másnak)', seenByA.name === 'Vendég ' + b.id && seenByB.name === 'Vendég ' + a.id);
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
  const pages = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { origin: 'https://voparin.github.io' } });
  let pagesOpen = false; pages.onopen = () => { pagesOpen = true; };
  await until(() => pagesOpen, 2000);
  check('a GitHub Pages-en futó játék csatlakozhat (engedélyezett oldal)', pagesOpen);
  pages.close(); await until(() => players.size === 1, 2000);
  // ---- fiókok: regisztráció, belépés, jegy, mentés ----
  check('a név szabályai: kis- és nagybetű egyforma, szóköz összevonva', nameId('  Kis  Pista ') === nameId('kis pista') && normName('  Kis  Pista ') === 'Kis Pista');
  const ask = (c, msg) => new Promise(res => { const prev = c.ws.onmessage; c.ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.t === 'auth_ok' || m.t === 'auth_err' || m.t === 'auth_need' || m.t === 'saved') { c.ws.onmessage = prev; res(m); } else prev(ev); }; c.ws.send(JSON.stringify(msg)); });
  const c1 = mk(); await until(() => c1.id);
  const r1 = await ask(c1, { t: 'register', name: 'Vadim', pass: 'titok1', progress: { money: 123, xp: 5 } });
  check('regisztráció: jegyet kap, és a magával hozott mentés megmarad', r1.t === 'auth_ok' && r1.name === 'Vadim' && typeof r1.token === 'string' && r1.progress && r1.progress.money === 123);
  check('a jelszó nincs sima szövegként tárolva', !fs.readFileSync(path.join(DIR, 'profiles.json'), 'utf8').includes('titok1'));
  c1.ws.send(JSON.stringify({ t: 'state', s: { name: 'Hamis Név', x: 7, y: 7 } }));
  await until(() => b.last && b.last.find(p2 => p2.id === c1.id));
  check('belépve a fiók nevével látszik (nem azzal, amit a kliens küld)', b.last.find(p2 => p2.id === c1.id).name === 'Vadim');
  const dup = await ask(b, { t: 'register', name: 'VADIM', pass: 'mas123' });
  check('foglalt nevet nem lehet újra regisztrálni (kis-nagybetűtől függetlenül)', dup.t === 'auth_err' && /foglalt/.test(dup.msg));
  check('rossz név / rövid jelszó: hibaüzenet', (await ask(b, { t: 'register', name: 'ab', pass: 'titok1' })).t === 'auth_err' && (await ask(b, { t: 'register', name: 'Jóska', pass: '12' })).t === 'auth_err');
  const sv = await ask(c1, { t: 'save', progress: { money: 999, xp: 50, rev: 1 } });
  check('mentés a szerverre (új verzió)', sv.t === 'saved' && sv.ok === true && sv.rev === 1);
  await wait(1100);
  const old = await ask(c1, { t: 'save', progress: { money: 5, xp: 1, rev: 1 } });
  check('régebbi / azonos verzió nem írja felül az újabbat (másik gép, elavult lap)', old.ok === false && old.stale === true && old.rev === 1);
  const fast = await ask(c1, { t: 'save', progress: { money: 6, rev: 2 } });
  check('másodpercenként legfeljebb egy mentés', fast.ok === false && fast.slow === true);
  const wrong = await ask(b, { t: 'login', name: 'vadim', pass: 'rossz' });
  check('rossz jelszóval nem lehet belépni', wrong.t === 'auth_err');
  const good = await ask(b, { t: 'login', name: 'vadim', pass: 'titok1' });
  check('jó jelszóval belép, és a saját (mentett) profilját kapja', good.t === 'auth_ok' && good.name === 'Vadim' && good.progress.money === 999 && good.rev === 1);
  const c2 = mk(); await until(() => c2.id);
  const re = await ask(c2, { t: 'auth', token: r1.token });
  check('a jeggyel (új lap / újratöltés) jelszó nélkül visszalép', re.t === 'auth_ok' && re.name === 'Vadim' && re.progress.money === 999);
  const fake = await ask(c2, { t: 'auth', token: r1.token.slice(0, -3) + 'abc' });
  check('a hamisított jegyet elutasítja', fake.t === 'auth_err' && fake.expired === true);
  await wait(1100);
  const big = await ask(c1, { t: 'save', progress: { junk: 'x'.repeat(55000), rev: 9 } });
  check('a túl nagy mentést elutasítja', big.t === 'saved' && big.ok === false);
  check('fiók nélkül nem lehet menteni', await new Promise(res => { b.ws.send(JSON.stringify({ t: 'logout' })); b.ws.send(JSON.stringify({ t: 'save', progress: { money: 1 } })); setTimeout(() => res(true), 300); }) && JSON.parse(fs.readFileSync(path.join(DIR, 'profiles.json'), 'utf8')).profiles[nameId('vadim')].progress.includes('999'));
  let locks = 0; for (let i = 0; i < 6; i++) { const r = await ask(c2, { t: 'login', name: 'vadim', pass: 'rossz' + i }); if (/zárolva/.test(r.msg || '')) locks++; }
  check('5 hibás jelszó után a profil 15 percre zárolva (új kapcsolattal sem lehet tovább találgatni)', locks >= 1 && (await (async () => { const c3 = mk(); await until(() => c3.id); const r = await ask(c3, { t: 'login', name: 'vadim', pass: 'titok1' }); c3.ws.close(); return /zárolva/.test(r.msg || ''); })()));
  check('a vendég-nevet nem lehet regisztrálni, és a túl nagy kezdő-állást sem (ne vesszen el csendben)', /foglalt/.test((await ask(c2, { t: 'register', name: 'Vendég 5', pass: 'titok12' })).msg || '') && (await ask(c2, { t: 'register', name: 'Nagyállás', pass: 'titok12', progress: { junk: 'x'.repeat(52000) } })).t === 'auth_err');
  const c4 = mk(); await until(() => c4.id);   // új kapcsolat (a c2 már elérte a percenkénti korlátot)
  const hom = await ask(c4, { t: 'register', name: 'ＶＡＤＩＭ', pass: 'titok12' });
  check('a széles betűs névváltozat is foglaltnak számít (NFKC)', hom.t === 'auth_err' && /foglalt/.test(hom.msg));
  check('a nem ASCII karakteres hamis jegy sem okoz hibát (szabályos elutasítás)', (await ask(c4, { t: 'auth', token: r1.token.split('.')[0] + '.' + 'é'.repeat(22) })).expired === true);
  c4.ws.close();
  c1.ws.close(); c2.ws.close(); await until(() => players.size === 1, 3000);
  // ---- Google-fiókos belépés ----
  const gv = googleVerifier(GOOGLE_CLIENT_ID, async () => [G_JWK]);
  check('a valódi (aláírt, nekünk szóló, érvényes) Google-jegyet elfogadja', (await gv(gToken({}))).sub === '1234567890');
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  check('a hamis aláírású / más alkalmazásnak szóló / lejárt / idegen kiadójú jegyet elutasítja', (await gv(gToken({}, other))) === null && (await gv(gToken({ aud: 'mas.apps.googleusercontent.com' }))) === null
    && (await gv(gToken({ exp: Math.floor(Date.now() / 1000) - 10 }))) === null && (await gv(gToken({ iss: 'https://gonosz.example' }))) === null && (await gv('nem.jegy')) === null && (await gv(gToken({}, G_PRIV, 'ismeretlen'))) === null);
  const hs = (() => { const h = Buffer.from(JSON.stringify({ alg: 'HS256', kid: 'k1' })).toString('base64url'), p = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: GOOGLE_CLIENT_ID, sub: '1', exp: 9e9 })).toString('base64url'); return h + '.' + p + '.' + crypto.createHmac('sha256', 'x').update(h + '.' + p).digest('base64url'); })();
  check('a más algoritmusú (HS256) és a nem számjegyes azonosítójú jegyet is elutasítja', (await gv(hs)) === null && (await gv(gToken({ sub: '../x' }))) === null && (await gv(gToken({ exp: 'holnap' }))) === null);
  const g1 = mk(); await until(() => g1.id);
  const ga = await ask(g1, { t: 'google', credential: gToken({}) });
  check('első Google-belépéskor játékbeli nevet kér', ga.t === 'auth_need');
  const gtaken = await ask(g1, { t: 'google', credential: gToken({}), name: 'vadim' });
  check('a jelszavas profil neve foglalt a Google-profilnak is', gtaken.t === 'auth_err' && /foglalt/.test(gtaken.msg));
  check('foglalt névnél nem marad árva hozzárendelés (utána más névvel létrehozható)', !JSON.parse(fs.readFileSync(path.join(DIR, 'profiles.json'), 'utf8')).profiles['gsub_1234567890']);
  const gb = await ask(g1, { t: 'google', credential: gToken({}), name: 'Gugli Géza', progress: { money: 55, rev: 1 } });
  check('névvel létrejön a Google-profil (a helyi állással), jegyet kap', gb.t === 'auth_ok' && gb.name === 'Gugli Géza' && gb.progress.money === 55 && typeof gb.token === 'string');
  check('a Google e-mail-címe / valódi neve nincs tárolva, csak a játékbeli név', !/@|1234567890.*@/.test(fs.readFileSync(path.join(DIR, 'profiles.json'), 'utf8')) && JSON.parse(fs.readFileSync(path.join(DIR, 'profiles.json'), 'utf8')).profiles['gsub_1234567890'].ref === nameId('Gugli Géza'));
  g1.ws.close();
  const g2 = mk(); await until(() => g2.id);
  const gc = await ask(g2, { t: 'google', credential: gToken({}) });
  check('újra Google-lel (más gépről): ugyanaz a profil, név kérdezése nélkül', gc.t === 'auth_ok' && gc.name === 'Gugli Géza' && gc.progress.money === 55);
  const gp = await ask(g2, { t: 'login', name: 'Gugli Géza', pass: 'akarmi12' });
  check('a Google-profilba jelszóval nem lehet belépni (útmutatást ad)', gp.t === 'auth_err' && /Google/.test(gp.msg));
  const gd = await ask(g2, { t: 'google', credential: gToken({ sub: '999' }) });
  check('egy másik Google-fiók külön profil (nevet kér)', gd.t === 'auth_need');
  g2.ws.close(); await until(() => players.size === 1, 3000);
  // ---- játékosok közötti harc (ADR-0049) ----
  const sh = mk(), vi = mk(); await until(() => sh.id && vi.id);
  const at = (c, x, y, extra = {}) => c.ws.send(JSON.stringify({ t: 'state', s: { name: 'x', x, y, a: 0, ...extra } }));
  at(sh, 20000, 20000); at(vi, 20300, 20000); await wait(150);
  sh.ws.send(JSON.stringify({ t: 'hit', to: vi.id, dmg: 10 })); await until(() => vi.got.length >= 1);
  check('a találatot továbbítja az áldozatnak (a lövő nevével, a sebzéssel)', vi.got[0] && vi.got[0].t === 'hit' && vi.got[0].dmg === 10 && vi.got[0].from === sh.id && /Vendég/.test(vi.got[0].name));
  sh.ws.send(JSON.stringify({ t: 'hit', to: vi.id, dmg: 99999 })); await until(() => vi.got.length >= 2);
  check('a túl nagy sebzést a korlátra vágja', vi.got[1].dmg === 120);
  const n0 = vi.got.length;
  sh.ws.send(JSON.stringify({ t: 'hit', to: sh.id, dmg: 10 })); sh.ws.send(JSON.stringify({ t: 'hit', to: 99999, dmg: 10 })); sh.ws.send(JSON.stringify({ t: 'hit', to: b.id, dmg: 10 })); await wait(200);
  check('önmagát, nem létezőt és messzi játékost nem lehet eltalálni', sh.got.length === 0 && vi.got.length === n0 && !(b.last === null));
  at(vi, 20300, 20000, { dead: true }); await wait(150);
  sh.ws.send(JSON.stringify({ t: 'hit', to: vi.id, dmg: 10 })); await wait(150);
  check('halott játékost nem sebez tovább', vi.got.length === n0);
  at(vi, 20300, 20000); await wait(150);
  vi.ws.send(JSON.stringify({ t: 'frag', to: b.id })); await wait(150);
  check('hamis ölés-jelzés (akitől nem kapott találatot) nem megy át', b.got.length === 0);
  vi.ws.send(JSON.stringify({ t: 'frag', to: sh.id })); await until(() => sh.got.length >= 1);
  check('az áldozat halálát a lövő megkapja (az áldozat nevével)', sh.got[0] && sh.got[0].t === 'frag' && /Vendég/.test(sh.got[0].name));
  vi.ws.send(JSON.stringify({ t: 'frag', to: sh.id })); await wait(150);
  check('ugyanazért a találatért az ölés csak egyszer jár', sh.got.length === 1);
  await wait(1100); const dn = vi.got.length;
  for (let i = 0; i < 5; i++) sh.ws.send(JSON.stringify({ t: 'hit', to: vi.id, dmg: 120 })); await wait(300);
  check('egy másodperc alatt legfeljebb 150 összsebzést enged át (nem lehet sorozatban ölni)', vi.got.slice(dn).reduce((a, m) => a + m.dmg, 0) <= 150);
  await wait(1100); const f1 = sh.got.length;
  vi.ws.send(JSON.stringify({ t: 'frag', to: sh.id })); await wait(150);
  check('ölés-jelzés csak 15 mp-enként fogadható el (nem lehet pénzt farmolni)', sh.got.length === f1);
  await wait(1100); const dm = vi.got.length;
  for (let i = 0; i < 60; i++) sh.ws.send(JSON.stringify({ t: 'hit', to: vi.id, dmg: 1 })); await wait(300);
  check('másodpercenként legfeljebb 30 találatot fogad el (kéréssel ne lehessen elárasztani)', vi.got.length - dm <= 31);
  sh.ws.close(); vi.ws.close(); await until(() => players.size === 1, 3000);
  const status = await (await fetch(base + '/status')).json();
  check('a /status kiírja, hányan játszanak', status.players === 1);
  b.ws.close(); await wait(100);
  server.close(); fs.rmSync(DIR, { recursive: true, force: true });
  console.log(failed ? `\n${failed} teszt elbukott` : '\nMinden szerverteszt sikeres');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
