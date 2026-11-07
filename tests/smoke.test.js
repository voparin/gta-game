'use strict';
// Füstteszt: a game.js-t egy kamu böngészőkörnyezetben futtatja, és ellenőrzi a fő funkciókat.
// Futtatás: node tests/smoke.test.js   (kilépési kód 0 = minden rendben)

const fs = require('fs');
const path = require('path');

const ctxStub = new Proxy({}, {
  get: (t, p) => {
    if (p in t) return t[p];
    if (p === 'createRadialGradient' || p === 'createPattern') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: (t, p, v) => { t[p] = v; return true; },
});
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ctxStub });
const listeners = {};
let rafCb = null, now = 0;
global.window = { innerWidth: 1280, innerHeight: 720, addEventListener: (e, f) => (listeners[e] = f) };
global.document = { getElementById: mkCanvas, createElement: mkCanvas };
global.performance = { now: () => now };
global.requestAnimationFrame = f => (rafCb = f);

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
eval(src + `
;global.G = { player, car, aiCars, npcs, bullets, storm, skidMarks, smoke, WORLD, OLD_WORLD, CHUNK, C,
  getChunk, chunkCache, onRoad, onSlime, nearestRoad, spawnNpc, spawnAiCar, damageCar, damagePlayer, nightAmount,
  get time(){return time}, set time(v){time=v}, get timeScale(){return timeScale},
  set spawn(v){spawnEnabled=v}, set slime(v){slimeEnabled=v} };`);

const step = n => { for (let i = 0; i < n; i++) { now += 16.7; rafCb(now); } };
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({ code, repeat: false });

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// a determinisztikus tesztekhez kikapcsoljuk a spawnolást és a nyálkát
G.spawn = false;
G.slime = false;

step(10);
check('a játék elindul és fut', typeof rafCb === 'function');

const x0 = G.player.x;
key('KeyD', true); step(60); key('KeyD', false);
check('a karakter tud gyalogolni', G.player.x - x0 > 100);

G.player.x = G.car.x - 50; G.player.y = G.car.y;
key('KeyE', true); key('KeyE', false);
check('be lehet szállni az autóba', G.player.inCar === true);

// --- vezetés az üres vízszintes úton ---
Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0 });
const cx0 = G.car.x;
key('KeyW', true); step(120);
check('az autó gyorsul és halad', Math.hypot(G.car.vx, G.car.vy) > 200 && G.car.x > cx0);
const a0 = G.car.angle;
key('KeyA', true); step(30); key('KeyA', false); key('KeyW', false);
check('az autó kanyarodik', Math.abs(G.car.angle - a0) > 0.3);
check('sima vezetésnél nincs féknyom', G.skidMarks.length === 0);

// --- kézifékes hirtelen kanyar: féknyom + füst ---
Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0 });
key('KeyW', true); step(90);
key('Space', true); key('KeyD', true); step(40);
check('kézifékes kanyarban féknyom keletkezik', G.skidMarks.length > 10);
check('kézifékes kanyarban füstöl', G.smoke.length > 5);
key('Space', false); key('KeyD', false); key('KeyW', false);
step(150);   // ~2,5 mp
check('a füst idővel eloszlik', G.smoke.length === 0);
check('a féknyom 2,5 mp után még látszik', G.skidMarks.length > 10);
step(180);   // összesen ~5,5 mp a csúszás vége óta
check('a féknyom 5 mp alatt eltűnik', G.skidMarks.length === 0);

key('KeyE', true); key('KeyE', false);
check('ki lehet szállni az autóból', G.player.inCar === false);

// --- pálya ---
check('a pálya legalább 30x akkora területű', G.WORLD * G.WORLD >= 30 * G.OLD_WORLD * G.OLD_WORLD);
const ch1 = G.getChunk(10, 10);
const sig = c => c.obstacles.length + ':' + c.obstacles.map(o => o.x.toFixed(1)).join(',');
const s1 = sig(ch1);
G.chunkCache.clear();
check('a világ darabjai mindig ugyanúgy generálódnak', sig(G.getChunk(10, 10)) === s1);
check('vannak akadályok (kaktusz, szikla)', ch1.obstacles.some(o => o.type === 'cactus') && ch1.obstacles.some(o => o.type === 'rock'));
const roadRow = Math.floor(G.C / G.CHUNK);
let lampCount = 0, slimes = [];
for (let cx = 0; cx < G.WORLD / G.CHUNK; cx++) {
  const ch = G.getChunk(cx, roadRow);
  lampCount += ch.lamps.length;
  slimes.push(...ch.slime);
}
check('vannak villanyoszlopok az út mentén', lampCount > 50);
check('vannak nyálkafoltok az úton', slimes.length > 5);
check('minden nyálkafolt az úton van', slimes.every(s => G.onRoad(s.x, s.y)));

// --- nyálka: kicsúszik az autó ---
G.slime = true;
const sl = slimes.find(s => Math.abs(s.y - G.C) < 60);
Object.assign(G.car, { x: sl.x - 300, y: sl.y, angle: 0, vx: 450, vy: 0, spin: 0, onSlime: false });
G.player.x = G.car.x; G.player.y = G.car.y; G.player.inCar = true;
let sawSlime = false, maxSpin = 0;
key('KeyW', true);
for (let i = 0; i < 90; i++) {
  step(1);
  sawSlime = sawSlime || G.car.onSlime;
  maxSpin = Math.max(maxSpin, Math.abs(G.car.spin));
}
key('KeyW', false);
check('az autó ráhajt a nyálkára', sawSlime);
check('a nyálkán megpördül az autó', maxSpin > 2 && Math.abs(Math.atan2(Math.sin(G.car.angle), Math.cos(G.car.angle))) > 0.4);
G.slime = false;
key('KeyE', true); key('KeyE', false);

// --- lövöldözés ---
// az út közepén, ahol nincs akadály
Object.assign(G.player, { x: 10000, y: G.C, angle: 0, inCar: false });
const ped = G.spawnNpc('ped', 10200, G.C);
ped.wanderT = 99; ped.moving = false;
key('KeyF', true); step(3); key('KeyF', false);
check('F gombra lő a karakter', G.bullets.length > 0);
step(30);
check('a golyó eltalálja és megöli a gyalogost', ped.dead > 0 && G.player.kills === 1);
const ped2 = G.spawnNpc('ped', 10000, G.C - 300);
key('KeyF', true); step(1); key('KeyF', false);
check('lövés hallatán a gyalogosok menekülnek', ped2.flee > 0);
step(30);

// --- AI autók --- (a játékos közelében, mert a messzi szereplők eltűnnek)
Object.assign(G.player, { x: 10500, y: G.C - 300, inCar: false });
const ai = G.spawnAiCar('h', 1, G.C, 10000);
const aiX0 = ai.x;
step(120);
check('az AI autó halad az úton', ai.x - aiX0 > 300);
check('az AI autó a saját sávjában marad', Math.abs(ai.y - (G.C + 40)) < 30);
for (let i = 0; i < 6; i++) G.damageCar(ai);
check('szétlőhető az AI autó', ai.wrecked === true);
step(120);
check('a roncs megáll', Math.hypot(ai.vx, ai.vy) < 30);

// --- elütés ---
Object.assign(G.player, { x: 20000, y: G.C - 300, inCar: false });
Object.assign(G.car, { x: 20000, y: G.C, angle: 0, vx: 400, vy: 0 });
const victim = G.spawnNpc('ped', 20100, G.C);
victim.wanderT = 99; victim.moving = false;
step(20);
check('a gyors autó elüti a gyalogost', victim.dead > 0);

// --- banditák ---
G.npcs.length = 0;
Object.assign(G.player, { x: 8000, y: 9000, inCar: false, health: 100, lastHit: -99 });
G.spawnNpc('bandit', 8400, 9000);
step(240);
check('a bandita rálő a játékosra', G.player.health < 100);
G.npcs.length = 0;

// --- halál és újraéledés ---
G.player.health = 5;
G.damagePlayer(10);
check('elfogyó életerőnél meghal a játékos', G.player.dead > 0);
step(200);
check('3 mp után újraéled teljes életerővel', G.player.dead <= 0 && G.player.health === 100);

// --- spawnolás ---
G.spawn = true;
step(300);
check('megjelennek AI gyalogosok', G.npcs.some(p => p.kind === 'ped'));
check('megjelennek AI autók', G.aiCars.length > 0);
G.spawn = false;

// --- homokvihar ---
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra homokvihar támad', G.storm.level > 0.9 && G.storm.particles.length > 100);
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra eláll a homokvihar', G.storm.level < 0.1);

// --- nappal / éjszaka ---
check('nappal: 0–29 perc', near(G.nightAmount(60), 0) && near(G.nightAmount(1000), 0));
check('alkonyat a 30. percnél', near(G.nightAmount(1800), 0.5));
check('éjszaka: 31–59 perc', near(G.nightAmount(2500), 1));
check('hajnal a 60. percnél', near(G.nightAmount(0), 0.5) && near(G.nightAmount(60), 0));

G.time = 2500; step(5);
check('éjszakai kirajzolás hiba nélkül', true);

key('KeyT', true); key('KeyT', false);
const t0 = G.time; step(60);
check('T gomb gyorsítja az időt (60x)', G.timeScale === 60 && Math.abs((G.time - t0) - 60) < 2);

console.log(failed ? `\n${failed} teszt elbukott` : '\nMinden teszt sikeres');
process.exit(failed ? 1 : 0);
