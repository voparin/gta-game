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
;global.G = { player, car, aiCars, npcs, bullets, storm, skidMarks, smoke, CHUNK, C, ROAD_SPACING, chunksIn, stationsIn, nearestStation, obstacleAt,
  getChunk, chunkCache, onRoad, onSlime, nearestRoad, spawnNpc, spawnAiCar, damageCar, damagePlayer, nightAmount,
  get time(){return time}, set time(v){time=v}, get timeScale(){return timeScale},
  set spawn(v){spawnEnabled=v}, set slime(v){slimeEnabled=v}, set police(v){policeEnabled=v}, wanted, clearWanted,
  SPEED_LIMIT, KMH, START_X, START_Y, progress, mission, drift, stationFor, nearPump, earn, levelOf,
  set missions(v){missionsEnabled=v}, VERSION, sanitizeProgress, FUEL_PRICE, BUS, selectCar, race, racePosition, RACE_PRIZES,
  set races(v){racesEnabled=v}, busStopsIn, spawnCityBus, BUS_DWELL, STOP_SPACING, BUS_FARE, stationCache, STATION_CACHE_MAX, raiseWanted,
  get message(){return message}, menu, SKINS, CAR_MODELS, ROAD_W, SIDEWALK_W, WALK_OFF, EDGE, spawnPedOnSidewalk,
  get clock(){return clock} };`);

const step = n => { for (let i = 0; i < n; i++) { now += 16.7; rafCb(now); } };
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({ code, repeat: false });
const press = code => { key(code, true); key(code, false); };

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// a determinisztikus tesztekhez kikapcsoljuk a spawnolást és a nyálkát
G.spawn = false;
G.slime = false;
G.police = false;
G.missions = false;
G.races = false;

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
const moneyBeforeDrift = G.progress.money;
key('Space', false); key('KeyD', false); key('KeyW', false);
step(150);   // ~2,5 mp
check('a drift pénzt ér', G.progress.money > moneyBeforeDrift && G.progress.bestDrift > 0);
check('a füst idővel eloszlik', G.smoke.length === 0);
check('a féknyom 2,5 mp után még látszik', G.skidMarks.length > 10);
step(180);   // összesen ~5,5 mp a csúszás vége óta
check('a féknyom 5 mp alatt eltűnik', G.skidMarks.length === 0);

key('KeyE', true); key('KeyE', false);
check('ki lehet szállni az autóból', G.player.inCar === false);
{
  // a régi pályaszélen (0. koordináta) túl is lehet gyalogolni – az úton, ahol nincs akadály
  const px = G.player.x, py = G.player.y;
  Object.assign(G.player, { x: 40, y: G.C, inCar: false });
  key('KeyA', true); step(60); key('KeyA', false);
  check('a régi pályaszélen túl is lehet menni (negatív koordináta)', G.player.x < -80);
  Object.assign(G.player, { x: px, y: py });
}

// --- pálya ---
// végtelen pálya: nagyon messze és negatív koordinátákon is van világ
{
  const far = [[-300000, 800000], [-12345, -67890], [5e6, -2e6]];
  check('a pálya végtelen: messze is generálódnak pályadarabok', far.every(([x, y]) =>
    G.chunksIn(x, y, x + 10, y + 10).length === 1 && G.chunksIn(x, y, x + 10, y + 10)[0].obstacles.length > 0));
  check('a végtelen pályán is vannak utak', far.every(([x, y]) => G.onRoad(x, G.nearestRoad(y)) && G.onRoad(G.nearestRoad(x), y)));
  check('a végtelen pályán is van benzinkút a közelben', far.every(([x, y]) => { const ns = G.nearestStation(x, y); return ns && ns.d < 4 * G.ROAD_SPACING; }));
  const ns0 = G.nearestStation(G.C + 1234, G.C - 4321);
  const brute = G.stationsIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).map(st =>
    Math.hypot(G.C + 1234 - (st.canopy.x0 + st.canopy.x1) / 2, G.C - 4321 - (st.canopy.y0 + st.canopy.y1) / 2));
  check('a legközelebbi kút keresése tényleg a legközelebbit adja', Math.abs(ns0.d - Math.min(...brute)) < 1e-6);
}
const ch1 = G.getChunk(10, 10);
const sig = c => c.obstacles.length + ':' + c.obstacles.map(o => o.x.toFixed(1)).join(',');
const s1 = sig(ch1);
G.chunkCache.clear();
check('a világ darabjai mindig ugyanúgy generálódnak', sig(G.getChunk(10, 10)) === s1);
check('vannak akadályok (kaktusz, szikla)', ch1.obstacles.some(o => o.type === 'cactus') && ch1.obstacles.some(o => o.type === 'rock'));
const roadRow = Math.floor(G.C / G.CHUNK);
let lampCount = 0, slimes = [];
for (let cx = 0; cx < 55; cx++) {        // a régi pálya szélességében
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
G.spawnNpc('bandit', 8200, 9000);   // közelről, hogy a szórás ellenére is találjon
step(600);
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
check('a megjelenő gyalogosok a járdán / zebrán vannak', G.npcs.filter(p => p.kind === 'ped' && !p.dead).every(p => G.onRoad(p.x, p.y, G.SIDEWALK_W)));
check('megjelennek AI autók', G.aiCars.length > 0);
for (let i = 0; i < 1800 && !G.aiCars.some(c => c.citybus); i++) step(1);
check('magától járnak városi buszok', G.aiCars.some(c => c.citybus));
G.spawn = false;

// --- homokvihar ---
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra homokvihar támad', G.storm.level > 0.9 && G.storm.particles.length > 100);
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra eláll a homokvihar', G.storm.level < 0.1);

// --- járda és sétáló gyalogosok ---
const onSidewalk = p => {
  const dy = Math.abs(p.y - G.nearestRoad(p.y)), dx = Math.abs(p.x - G.nearestRoad(p.x));
  const band = d => d >= G.ROAD_W / 2 && d <= G.EDGE;
  return band(dy) || band(dx);
};
const paved = p => G.onRoad(p.x, p.y, G.SIDEWALK_W);
let blocking = 0, lampsOnWalkLine = 0;
for (let cx = 20; cx < 34; cx++) for (let cy = 20; cy < 34; cy++) {
  const ch = G.getChunk(cx, cy);
  for (const o of ch.obstacles) if (o.type !== 'lamp' && G.onRoad(o.x, o.y, G.SIDEWALK_W + o.r)) blocking++;
  for (const l of ch.lamps) {
    const d = Math.min(Math.abs(l.y - G.nearestRoad(l.y)), Math.abs(l.x - G.nearestRoad(l.x)));
    if (Math.abs(d - G.WALK_OFF) < 8 + 11) lampsOnWalkLine++;
  }
}
check('a járdán nincs kaktusz vagy szikla', blocking === 0);
check('a villanyoszlopok nem állják el a sétáló vonalat', lampsOnWalkLine === 0);

G.npcs.length = 0; G.aiCars.length = 0;
Object.assign(G.player, { x: 14000, y: G.C - 400, inCar: false });
const walker = G.spawnPedOnSidewalk('h', G.C, -1, 14000, 1);
Object.assign(walker, { moving: true, wanderT: 99 });
check('a gyalogos a járdán jelenik meg', onSidewalk(walker));
const wx0 = walker.x;
step(180);
check('a gyalogos végigsétál a járdán', walker.x - wx0 > 80 && onSidewalk(walker));

// hosszabb séta kereszteződéseken át: végig burkolt felületen marad
const strollers = [];
for (let i = 0; i < 8; i++) {
  const p = G.spawnPedOnSidewalk(i % 2 ? 'h' : 'v', G.C, i % 4 < 2 ? -1 : 1, G.C - 200 + i * 50, i % 3 ? 1 : -1);
  Object.assign(p, { moving: true, wanderT: 99 });
  strollers.push(p);
}
Object.assign(G.player, { x: G.C, y: G.C });
let offPaved = 0;
for (let i = 0; i < 1500; i++) {      // ~25 mp
  step(1);
  G.player.x = G.C; G.player.y = G.C;  // a közelben maradunk, hogy ne tűnjenek el
  for (const p of strollers) if (!paved(p)) offPaved++;
}
check('a gyalogosok kereszteződéseken át is a járdán / zebrán maradnak', offPaved === 0);
check('a gyalogosok a sarkon be is fordulnak', strollers.some(p => p.axis !== (strollers.indexOf(p) % 2 ? 'h' : 'v')));

const scared = G.spawnPedOnSidewalk('h', G.C, 1, G.C + 600, 1);
Object.assign(scared, { flee: 0.5, fx: scared.x, fy: scared.y - 50 });
step(60);
Object.assign(scared, { moving: true, wanderT: 99 });
step(240);
check('megijedés után visszatér a járdára', onSidewalk(scared));
G.npcs.length = 0;

// --- rendőrség: gyorshajtás → üldözés ---
G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
G.police = true;
Object.assign(G.player, { x: 30000, y: G.C, inCar: true, health: 100 });
Object.assign(G.car, { x: 30000, y: G.C, angle: 0, vx: 0, vy: 0, spin: 0 });
const speedKmh = () => Math.hypot(G.car.vx, G.car.vy) / G.KMH;
key('KeyW', true);
let maxSlow = 0;
for (let i = 0; i < 600 && speedKmh() < G.SPEED_LIMIT - 8; i++) { step(1); maxSlow = Math.max(maxSlow, speedKmh()); }
key('KeyW', false); step(30);
check(`${G.SPEED_LIMIT} km/h alatt nincs körözés`, G.wanted.level === 0 && maxSlow < G.SPEED_LIMIT);
key('KeyW', true); step(60); key('KeyW', false);
check(`${G.SPEED_LIMIT} km/h felett körözni kezdenek`, G.wanted.level === 1);
key('KeyS', true); step(90); key('KeyS', false);    // megállunk
G.aiCars.length = 0;                                  // egy frissen érkező rendőrautót figyelünk
let cop = null;
for (let i = 0; i < 600 && !cop; i++) { step(1); cop = G.aiCars.find(c => c.police && c.chasing); }
check('megjelenik az üldöző rendőrautó', !!cop);
const d0 = Math.hypot(cop.x - G.car.x, cop.y - G.car.y);
step(90);
const d1 = Math.hypot(cop.x - G.car.x, cop.y - G.car.y);
check('a rendőrautó közeledik', d1 < d0 - 200);
let busted = false;
for (let i = 0; i < 900 && !busted; i++) { step(1); busted = G.player.arrested > 0; }
check('ha megállsz, a rendőr letartóztat', busted);
step(200);
check('letartóztatás után újrakezdés, körözés nélkül', G.player.arrested <= 0 && G.wanted.level === 0 && G.player.x === G.START_X);
check('a rendőrautók eltűnnek', !G.aiCars.some(c => c.police));

// rendőrre lövés: 2 csillag
G.aiCars.length = 0;
G.police = false;
G.wanted.level = 1;
const cop2 = Object.assign(G.spawnAiCar('h', 1, G.C, 30250), { police: true, vx: 0, vy: 0 });
cop2.ai.speed = 0;
Object.assign(G.player, { x: 30000, y: cop2.y, inCar: false, angle: 0 });   // egy vonalban az autóval
key('KeyF', true); step(10); key('KeyF', false);
step(20);
check('rendőrre lövéskor 2 csillagos a körözés', G.wanted.level === 2);
G.aiCars.length = 0;

// lerázás: ha 12 mp-ig nincs rendőr a közelben
step(60 * 13);
check('12 mp rendőr nélkül → lerázod őket', G.wanted.level === 0);
G.police = false;

// --- benzinkutak és tankolás ---
G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
const st = G.stationFor(5, 5);   // a kezdőhely melletti kereszteződés
check('a kezdőhely mellett van benzinkút', !!st);
const oldArea = G.stationsIn(0, 0, 55000, 55000);
check('a régi pályaterületen is sok benzinkút van', oldArea.length >= 20);
let cactiInStations = 0, pumps = 0;
for (const s2 of oldArea.slice(0, 15)) {
  for (let cx = Math.floor(s2.rect.x0 / G.CHUNK); cx <= Math.floor(s2.rect.x1 / G.CHUNK); cx++)
    for (let cy = Math.floor(s2.rect.y0 / G.CHUNK); cy <= Math.floor(s2.rect.y1 / G.CHUNK); cy++)
      for (const o of G.getChunk(cx, cy).obstacles) {
        const inside = o.x > s2.rect.x0 && o.x < s2.rect.x1 && o.y > s2.rect.y0 && o.y < s2.rect.y1;
        if (inside && (o.type === 'cactus' || o.type === 'rock')) cactiInStations++;
        if (inside && o.type === 'pump') pumps++;
      }
}
check('a kutak területén nincs kaktusz vagy szikla', cactiInStations === 0);
check('a benzinkutak (pumpák) szilárd akadályok', pumps >= 30);

// fogyasztás
Object.assign(G.player, { x: 20000, y: G.C, inCar: true });
Object.assign(G.car, { x: 20000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 50 });
key('KeyW', true); step(120); key('KeyW', false);
check('gázadáskor fogy a benzin', G.car.fuel < 50 && G.car.fuel > 45);
// üres tank
Object.assign(G.car, { x: 20000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 0 });
key('KeyW', true); step(180); key('KeyW', false);
check('üres tankkal csak vánszorog az autó', Math.hypot(G.car.vx, G.car.vy) <= 61 && G.car.x > 20000);
// tankolás a kút mellett (két kút között állva)
const p0 = st.pumps[0], p1 = st.pumps[1];
Object.assign(G.car, { x: (p0.x + p1.x) / 2, y: p0.y, angle: 0, vx: 0, vy: 0, fuel: 20 });
Object.assign(G.player, { x: G.car.x, y: G.car.y, inCar: true });
G.progress.money = 100;
step(60);
check('a kútnál megállva tankol', G.car.refueling && G.car.fuel > 40);
check('a tankolás pénzbe kerül', G.progress.money < 100 && G.progress.money > 60);
step(200);
check('a tank megtelik és a tankolás leáll', G.car.fuel === 100 && !G.car.refueling);
Object.assign(G.car, { x: (p0.x + p1.x) / 2, y: p0.y, vx: 400, vy: 0, fuel: 20 });
step(1);
check('menet közben nem tankol', !G.car.refueling);
Object.assign(G.car, { vx: 0, vy: 0 });
key('KeyE', true); key('KeyE', false);

// --- szállítási küldetések ---
G.missions = true;
G.mission.cooldown = 0;
step(2);
check('magától indul szállítási küldetés', G.mission.active && G.mission.reward > 60);
const md = Math.hypot(G.mission.tx - G.player.x, G.mission.ty - G.player.y);
check('a célpont messze, járdán van', md > 1000 && G.onRoad(G.mission.tx, G.mission.ty, G.SIDEWALK_W));
const money0 = G.progress.money;
Object.assign(G.player, { x: G.mission.tx, y: G.mission.ty, inCar: false });
step(1);
check('a célba érve fizet és nő a sorozat', G.progress.money > money0 + 60 && G.mission.streak === 1 && !G.mission.active);
step(150);
check('utána jön a következő küldetés', G.mission.active);
const reward2 = G.mission.reward, money1 = G.progress.money;
Object.assign(G.player, { x: G.mission.tx, y: G.mission.ty });
step(1);
check('a sorozat szorzója nő (x1.25)', G.progress.money - money1 >= Math.round(reward2 * 1.25) && G.mission.streak === 2);
step(150);
check('a harmadik szállítás is elindul', G.mission.active);
Object.assign(G.player, { x: G.mission.tx + 3000, y: G.mission.ty, inCar: false });
step(60 * 150);   // 2,5 perc várakozás
check('a szállításnak nincs időlimitje', G.mission.active && G.mission.streak === 2);
G.damagePlayer(1000);
check('halálnál elvész a sorozat', G.mission.streak === 0);
step(200);
G.missions = false;

// --- jutalmak, szintek ---
G.npcs.length = 0;
Object.assign(G.player, { x: 10000, y: G.C, angle: 0, inCar: false, health: 100 });
const bandit = G.spawnNpc('bandit', 10150, G.C);
const money2 = G.progress.money;
key('KeyF', true); step(40); key('KeyF', false);
step(10);
check('bandita lelövéséért fejpénz jár', bandit.dead > 0 && G.progress.money >= money2 + 50);
G.npcs.length = 0;
const lvl0 = G.levelOf(G.progress.xp), m3 = G.progress.money;
G.earn(5000, 'teszt');
check('elég XP-vel szintet lépsz, és szintbónuszt kapsz', G.levelOf(G.progress.xp) > lvl0 && G.progress.money > m3 + 5000);

// --- Esc menü: szünet, szkin- és autóváltás ---
Object.assign(G.player, { x: 10000, y: G.C, inCar: false });
press('Escape');
check('Esc-re megnyílik a menü', G.menu.open === true);
const clk = G.clock, px0 = G.player.x;
key('KeyD', true); step(60); key('KeyD', false);
check('menüben megáll a játék', G.clock === clk && G.player.x === px0);
const skin0 = G.menu.skin;
press('ArrowDown'); press('ArrowRight');
check('a menüben lehet szkint váltani', G.menu.skin === (skin0 + 1) % G.SKINS.length);
press('ArrowLeft');
check('vissza is lehet lapozni a szkint', G.menu.skin === skin0);
press('ArrowDown'); press('ArrowRight');
const model = G.CAR_MODELS[1];
G.progress.money = 100;
check('a meg nem vett autó nem használható', G.menu.carModel === 1 && G.car.color !== model.color);
press('Enter');
check('pénz nélkül nem lehet megvenni', !G.progress.owned.includes(1) && G.progress.money === 100);
G.progress.money = model.price + 500;
press('Enter');
check('elég pénzzel megvehető és rögtön használható', G.progress.owned.includes(1) && G.car.color === model.color
  && G.car.maxSand === model.maxSand && G.progress.money === 500);
// egérrel: jobb nyíl, majd kattintás a névre = vásárlás
G.progress.money = 1000;
step(1);
const arrow = G.menu.hits.find(h => h.row === 2 && h.delta === 1);
listeners.mousedown({ button: 0, clientX: arrow.x + arrow.w / 2, clientY: arrow.y + arrow.h / 2 });
check('egérrel is lehet lapozni az autók között', G.menu.carModel === 2 && G.car.color === model.color);
step(1);
const buy = G.menu.hits.find(h => h.buy);
listeners.mousedown({ button: 0, clientX: buy.x + buy.w / 2, clientY: buy.y + buy.h / 2 });
check('egérrel is lehet autót venni', G.progress.owned.includes(2) && G.car.color === G.CAR_MODELS[2].color && G.progress.money === 200);
press('ArrowRight');
check('a megvett autók között szabadon lehet váltani', G.menu.carModel === 3 && G.car.color === G.CAR_MODELS[2].color);
press('ArrowLeft'); press('ArrowLeft');
check('visszaváltás egy megvett autóra', G.menu.carModel === 1 && G.car.color === G.CAR_MODELS[1].color);
press('ArrowRight'); press('ArrowRight');   // a zárolt rakétaautónál zárjuk be a menüt
const resume = G.menu.hits.find(h => h.row === 0);
listeners.mousedown({ button: 0, clientX: resume.x + 5, clientY: resume.y + 5 });
check('a Folytatás gomb bezárja a menüt', G.menu.open === false);
check('zárt menü után a ténylegesen használt autó marad kiválasztva', G.menu.carModel === 2);
step(5);
check('menü után újra megy a játék', G.clock > clk);
press('Escape'); press('Enter');
check('Enter a Folytatáson bezárja a menüt', G.menu.open === false);
press('Escape'); press('Escape');
check('Esc újra megnyomva visszavisz a játékba', G.menu.open === false);
// a terepjáró homokban gyorsabb, mint a sportkocsi
check('a terepjáró homokban gyorsabb a sportkocsinál', G.CAR_MODELS[1].maxSand > G.CAR_MODELS[0].maxSand);

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

// --- kódátnézés: javított hibák ---
// pénz nélkül nem lehet tankolni
G.npcs.length = 0; G.aiCars.length = 0;
{
  const stx = G.stationFor(5, 5), q0 = stx.pumps[0], q1 = stx.pumps[1];
  Object.assign(G.car, { x: (q0.x + q1.x) / 2, y: q0.y, angle: 0, vx: 0, vy: 0, fuel: 10 });
  Object.assign(G.player, { x: G.car.x, y: G.car.y, inCar: true, dead: 0, arrested: 0 });
  G.progress.money = 0;
  step(60);
  check('pénz nélkül nem lehet tankolni', G.car.fuel < 10.5 && !G.car.refueling);
  G.progress.money = 5;
  step(60);
  check('kevés pénzből csak annyi benzin jár, amennyit kifizetsz', Math.abs(G.car.fuel - (10 + 5 / G.FUEL_PRICE)) < 1 && G.progress.money < 0.01);
  key('KeyE', true); key('KeyE', false);
}
// több szint egyszerre: minden szint bónusza jár
{
  G.progress.xp = 0; G.progress.money = 0;
  G.earn(5000, 'teszt');               // 1. → 6. szint
  const lv = G.levelOf(5000);
  let expected = 5000;
  for (let l = 2; l <= lv; l++) expected += l * 50;
  check('több szint átlépésekor minden szint bónusza jár', lv === 6 && G.progress.money === expected);
}
// sérült / régi mentés
{
  const p1 = G.sanitizeProgress({ money: 0, owned: [0, 7], activeCar: 7 });
  const p2 = G.sanitizeProgress({ money: 'x', owned: null, xp: -5 });
  const p3 = G.sanitizeProgress(null);
  check('érvénytelen autó-index a mentésben nem omlasztja össze a játékot', p1.activeCar === 0 && !p1.owned.includes(7));
  check('hibás típusú mentés alapértékre javul', p2.money === 0 && p2.xp === 0 && Array.isArray(p2.owned) && p2.owned[0] === 0);
  check('üres mentés alapállapot', p3.money === 0 && p3.owned.length === 2 && p3.activeCar === 0);
}
// a pályadarab-tárolóból a legrégebben HASZNÁLT darab esik ki
{
  G.chunkCache.clear();
  const first = G.getChunk(0, 0);
  for (let i = 1; i < 700; i++) { G.getChunk(i % 50, 1 + Math.floor(i / 50)); G.getChunk(0, 0); }
  check('a folyamatosan használt pályadarab nem esik ki a tárolóból', G.getChunk(0, 0) === first);
}

// --- autóversenyek ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.police = false;
  Object.assign(G.player, { x: G.C + 1200, y: G.C, inCar: true, dead: 0, arrested: 0, health: 100 });
  Object.assign(G.car, { x: G.C + 1200, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 100 });
  G.races = true; G.race.cooldown = 0;
  step(2);
  check('megjelenik egy verseny a közelben', G.race.state === 'idle' && !!G.race.offer);
  check('a verseny útvonala az úton halad', G.race.route.length === 6 && G.race.route.every(p => G.onRoad(p.x, p.y)));
  Object.assign(G.car, { x: G.race.offer.x, y: G.race.offer.y, vx: 0, vy: 0 });
  step(1);
  check('a rajtba hajtva indul a visszaszámlálás', G.race.state === 'countdown' && G.race.racers.length === 3);
  const sx = G.car.x, sy = G.car.y;
  key('KeyW', true); step(60); key('KeyW', false);
  check('visszaszámlálás alatt senki nem indulhat el', G.car.x === sx && G.car.y === sy && G.race.racers.every(r => r.x === r.slot.x));
  step(130);
  check('a visszaszámlálás után indul a verseny', G.race.state === 'running');
  const r0 = G.race.racers[0], d0 = Math.hypot(r0.x - G.race.route[0].x, r0.y - G.race.route[0].y);
  step(120);
  check('az ellenfelek az ellenőrzőpont felé hajtanak', Math.hypot(r0.x - G.race.route[0].x, r0.y - G.race.route[0].y) < d0 - 400);
  Object.assign(G.player, { x: 10, y: 10 });   // messze vagyunk, de a versenyzők nem tűnhetnek el
  step(1);
  check('a versenyzők nem tűnnek el, ha messze vannak', G.race.racers.every(r => G.aiCars.includes(r)));
  // ellenőrzőpontok sorrendben: a 2.-ra ugrva nem számít
  Object.assign(G.car, { x: G.race.route[1].x, y: G.race.route[1].y, vx: 0, vy: 0 });
  step(1);
  check('az ellenőrzőpontokat sorrendben kell érinteni', G.race.cp === 0);
  // a játékos végigmegy, mielőtt bárki célba ér → 1. hely
  G.race.racers.forEach(r => { r.cp = 0; });
  const money0 = G.progress.money;
  for (let i = 0; i < 6; i++) { Object.assign(G.car, { x: G.race.route[i].x, y: G.race.route[i].y, vx: 0, vy: 0 }); step(1); }
  check('célba érve 1. hely és fődíj', G.race.state === 'idle' && G.progress.money >= money0 + G.RACE_PRIZES[0]);
  check('a verseny után az ellenfelek eltűnnek', !G.aiCars.some(c => c.racer));
  // második verseny: az ellenfelek előbb érnek célba → 4. hely, nincs díj
  G.race.cooldown = 0; step(2);
  Object.assign(G.car, { x: G.race.offer.x, y: G.race.offer.y, vx: 0, vy: 0 }); step(200);
  G.race.racers.forEach(r => { r.cp = 6; G.race.finished.push(r); });
  check('élőben számolt helyezés (utolsó)', G.racePosition() === 4);
  const money1 = G.progress.money;
  for (let i = 0; i < 6; i++) { Object.assign(G.car, { x: G.race.route[i].x, y: G.race.route[i].y, vx: 0, vy: 0 }); step(1); }
  check('utolsó helyért nincs díj', G.race.state === 'idle' && G.progress.money === money1);
  // harmadik verseny: kiszállás = feladás
  G.race.cooldown = 0; step(2);
  Object.assign(G.car, { x: G.race.offer.x, y: G.race.offer.y, vx: 0, vy: 0 }); step(200);
  key('KeyE', true); key('KeyE', false); step(1);
  check('kiszállva feladod a versenyt', G.race.state === 'idle' && !G.aiCars.some(c => c.racer));
  G.races = false;
}

// --- buszmegállók és városi buszok ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
  const stops = G.busStopsIn(G.C - 6000, G.C - 200, G.C + 6000, G.C + 200);
  check('vannak buszmegállók az út mentén, mindkét oldalon', stops.length >= 8 && stops.some(s => s.side === 1) && stops.some(s => s.side === -1));
  check('a megállók a járdán vannak, távol a kereszteződésektől', stops.every(s => G.onRoad(s.x, s.y, G.SIDEWALK_W) && !G.onRoad(s.x, s.y)
    && Math.abs((s.axis === 'h' ? s.x : s.y) - G.nearestRoad(s.axis === 'h' ? s.x : s.y)) >= 1000));
  // busz a vízszintes úton kelet felé, a következő megálló előtt
  const stopX = 1250 + 2500 * Math.ceil((G.C + 3000 - 1250) / 2500);
  Object.assign(G.player, { x: stopX, y: G.C + G.WALK_OFF, inCar: false, riding: null, dead: 0, arrested: 0 });
  const bus = G.spawnCityBus('h', 1, G.C, stopX - 900);
  check('a városi busz nem a zöld busz', bus.type === 'citybus' && bus.color !== G.CAR_MODELS[G.BUS].color);
  let stoppedAt = null;
  for (let i = 0; i < 600 && !stoppedAt; i++) { step(1); if (G.clock < bus.dwellUntil) stoppedAt = bus.x; }
  check('a busz megáll a megállóban', stoppedAt !== null && Math.abs(stoppedAt - stopX) < 40);
  step(30);
  check('a busz áll, amíg a megállóban vár', Math.hypot(bus.vx, bus.vy) < 15);
  // felszállás: a megállóban, a busz mellett
  Object.assign(G.player, { x: bus.x, y: bus.y + bus.wid / 2 + 20 });
  G.progress.money = 1;
  key('KeyE', true); key('KeyE', false);
  check(`$${G.BUS_FARE} nélkül nem lehet felszállni`, !G.player.riding && G.progress.money === 1);
  G.progress.money = 10;
  key('KeyE', true); key('KeyE', false);
  check(`a megálló buszra fel lehet szállni, a jegy $${G.BUS_FARE}`, G.player.riding === bus && G.progress.money === 10 - G.BUS_FARE);
  step(60 * (G.BUS_DWELL + 3));
  check('a busz továbbindul, és viszi az utast', bus.x > stopX + 300 && G.player.x === bus.x && G.player.y === bus.y);
  // menet közben nem lehet leszállni
  if (Math.hypot(bus.vx, bus.vy) > 100) { key('KeyE', true); key('KeyE', false); }
  check('menet közben nem lehet leszállni', G.player.riding === bus);
  // a következő megállóban leszállunk
  let stopped2 = false;
  for (let i = 0; i < 1200 && !stopped2; i++) { step(1); stopped2 = G.clock < bus.dwellUntil && Math.hypot(bus.vx, bus.vy) < 15; }
  // a kereszteződésben el is fordulhat, ezért bármelyik megállót elfogadjuk: a sávja mentén 1250 + k·2500 px-nél
  const alongNow = bus.ai.axis === 'h' ? bus.x : bus.y;
  const offStop = Math.abs(((alongNow - 1250) % G.STOP_SPACING + G.STOP_SPACING) % G.STOP_SPACING);
  check('a busz a következő megállóban is megáll', stopped2 && Math.min(offStop, G.STOP_SPACING - offStop) < 40);
  key('KeyE', true); key('KeyE', false);
  const offD = Math.hypot(G.player.x - bus.x, G.player.y - bus.y);
  check('megálláskor le lehet szállni, a busz mellé (járdára)', !G.player.riding && Math.abs(offD - (bus.wid / 2 + 22)) < 3
    && G.onRoad(G.player.x, G.player.y, G.SIDEWALK_W) && !G.onRoad(G.player.x, G.player.y));
  // a járdán álló gyalogos miatt nem fékez az autó (csak a saját sávjában lévőre)
  G.aiCars.length = 0;
  const car2 = G.spawnAiCar('h', 1, G.C, 40000);
  const walker2 = G.spawnNpc('ped', 40120, G.C + G.WALK_OFF);
  Object.assign(walker2, { moving: false, wanderT: 99 });
  Object.assign(G.player, { x: 40000, y: G.C - 400, riding: null });
  step(60);
  check('a járdán álló gyalogos miatt nem fékez az autó', car2.x > 40000 + 200);
  const blocker = G.spawnNpc('ped', car2.x + 120, car2.y);
  Object.assign(blocker, { moving: false, wanderT: 99 });
  step(60);
  check('a sávjában álló gyalogos előtt megáll', Math.hypot(car2.vx, car2.vy) < 30 && blocker.dead === 0);
  G.aiCars.length = 0; G.npcs.length = 0;
}

// --- kódátnézés (v0.10.0): javított hibák ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
  // 1. a kicsit túlfutott megállóban is megáll a busz
  const stopX2 = 1250 + 2500 * Math.ceil((G.C + 9000 - 1250) / 2500);
  Object.assign(G.player, { x: stopX2, y: G.C - 600, inCar: false, riding: null, dead: 0, arrested: 0 });
  const busO = G.spawnCityBus('h', 1, G.C, stopX2 + 10);    // már 10 px-rel túl van a megállón
  Object.assign(busO, { vx: 60, vy: 0 });
  let dwelt = false;
  for (let i = 0; i < 120 && !dwelt; i++) { step(1); dwelt = G.clock < busO.dwellUntil; }
  check('a kicsit túlfutott megállóban is megáll a busz', dwelt && busO.x < stopX2 + 60);
  // 2–3. utasként: mozgó buszon nem tartóztatnak le, halálnál leszállsz
  busO.dwellUntil = 0; busO.lastStop = 'x';
  G.progress.money = 50;
  Object.assign(G.player, { x: busO.x, y: busO.y + busO.wid / 2 + 20 });
  Object.assign(busO, { vx: 0, vy: 0 });
  key('KeyE', true); key('KeyE', false);
  for (let i = 0; i < 900 && Math.hypot(busO.vx, busO.vy) < 200; i++) step(1);   // megvárjuk, amíg a busz menetsebességgel halad
  const cop = Object.assign(G.spawnAiCar('h', 1, G.C, busO.x - 60), { police: true, chasing: false });
  G.wanted.level = 1; G.wanted.lostTimer = 0;
  for (let i = 0; i < 110; i++) { Object.assign(cop, { x: busO.x - 60, y: busO.y, vx: busO.vx, vy: busO.vy }); cop.chasing = true; step(1); }
  check('mozgó buszon nem lehet letartóztatni', !(G.player.arrested > 0) && Math.hypot(busO.vx, busO.vy) > 40);
  G.clearWanted(); G.aiCars.splice(G.aiCars.indexOf(cop), 1);
  const deathX = G.player.x;
  G.damagePlayer(1000);
  step(30);
  check('halálkor leszállsz a buszról, a holttest nem utazik tovább', !G.player.riding && G.player.x === deathX);
  step(200);
  // 4. verseny közbeni halálnál a halál üzenete marad
  G.aiCars.length = 0;
  Object.assign(G.player, { x: G.C + 1200, y: G.C, inCar: true, dead: 0, arrested: 0, health: 100 });
  Object.assign(G.car, { x: G.C + 1200, y: G.C, angle: 0, vx: 0, vy: 0 });
  G.races = true; G.race.cooldown = 0; step(2);
  Object.assign(G.car, { x: G.race.offer.x, y: G.race.offer.y, vx: 0, vy: 0 }); step(200);
  G.damagePlayer(1000);
  step(2);
  check('verseny közbeni halálnál a „MEGHALTÁL” üzenet marad', G.race.state === 'idle' && G.message.text === 'MEGHALTÁL');
  G.races = false;
  step(200);
  // 5. a benzinkút-tároló korlátos
  for (let i = 0; i < 400; i++) G.nearestStation(1e6 + i * 60000, -1e6);   // korlát nélkül ~10 000 bejegyzés lenne
  check('a benzinkút-tároló mérete korlátos', G.stationCache.size <= G.STATION_CACHE_MAX);
  G.aiCars.length = 0;
}

// --- zöld busz: csak a játékosé ---
{
  const bus = G.CAR_MODELS[G.BUS];
  check('van zöld busz', bus && bus.type === 'bus' && bus.name === 'Zöld busz');
  check('a busz alapból a játékosé', G.sanitizeProgress(null).owned.includes(G.BUS) && G.progress.owned.includes(G.BUS));
  const prev = G.progress.activeCar;
  G.selectCar(G.BUS);
  check('a busz kiválasztható, és busz-tulajdonságai vannak', G.car.type === 'bus' && G.car.len === bus.len && G.car.maxRoad === bus.maxRoad);
  G.aiCars.length = 0;
  for (let i = 0; i < 40; i++) G.spawnAiCar('h', 1, G.C, 10000 + i * 300);
  check('AI sosem vezet buszt', G.aiCars.every(c => c.type !== 'bus' && c.color !== bus.color));
  G.aiCars.length = 0;
  G.selectCar(prev);
}

// --- verzió ---
const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const topEntry = (changelog.match(/^## (\d+\.\d+\.\d+)/m) || [])[1];
check(`a verziószám érvényes (v${G.VERSION})`, /^\d+\.\d+\.\d+$/.test(G.VERSION));
check('a CHANGELOG legfelső bejegyzése a jelenlegi verzió', topEntry === G.VERSION);

// --- architekturális döntések (ADR) ---
const adrDir = path.join(__dirname, '..', 'docs', 'adr');
const adrIndex = fs.readFileSync(path.join(adrDir, 'README.md'), 'utf8');
const adrFiles = fs.readdirSync(adrDir).filter(f => /^\d{4}-.+\.md$/.test(f)).sort();
check('vannak ADR-ek', adrFiles.length > 0);
check('minden ADR szerepel az ADR-listában', adrFiles.every(f => adrIndex.includes(`](${f})`)));
const indexRows = [...adrIndex.matchAll(/^\| \[(\d{4})\]\(([^)]+)\) \| [^|]+ \| ([^|]+) \|/gm)];
check('az ADR-lista minden sora létező fájlra mutat', indexRows.length === adrFiles.length && indexRows.every(r => adrFiles.includes(r[2])));
const fileStatus = f => (fs.readFileSync(path.join(adrDir, f), 'utf8').match(/\*\*Státusz:\*\* ([^\n]+)/) || [])[1];
check('a listában ugyanaz a státusz, mint az ADR-ben', indexRows.every(r => (fileStatus(r[2]) || '').trim().startsWith(r[3].trim().split(':')[0])));
check('az ADR-ek sorszáma folytonos', adrFiles.every((f, i) => f.startsWith(String(i + 1).padStart(4, '0') + '-')));
check('minden ADR-ben van státusz, kontextus, döntés, alternatívák és következmények', adrFiles.every(f => {
  const t = fs.readFileSync(path.join(adrDir, f), 'utf8');
  return /\*\*Státusz:\*\* (Javasolt|Elfogadva|Elvetve|Felváltva)[^|\n]*$/m.test(t)
    && ['## Kontextus', '## Döntés', '## Elvetett alternatívák', '## Következmények'].every(h => t.includes(h));
}));
check('nincs kitöltetlen ADR (a minta szövegével)', adrFiles.every(f => {
  const t = fs.readFileSync(path.join(adrDir, f), 'utf8');
  return !/ADR-NNNN|ÉÉÉÉ-HH-NN|<rövid cím|^- <alternatíva>/m.test(t);
}));

console.log(failed ? `\n${failed} teszt elbukott` : '\nMinden teszt sikeres');
process.exit(failed ? 1 : 0);
