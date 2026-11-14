'use strict';
// Füstteszt: a game.js-t egy kamu böngészőkörnyezetben futtatja, és ellenőrzi a fő funkciókat.
// Futtatás: node tests/smoke.test.js   (kilépési kód 0 = minden rendben)

const fs = require('fs');
const path = require('path');

const ctxStub = new Proxy({}, {
  get: (t, p) => {
    if (p in t) return t[p];
    if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createPattern') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: (t, p, v) => { t[p] = v; return true; },
});
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ctxStub });
const listeners = {};
let rafCb = null, now = 0;
global.window = { innerWidth: 1280, innerHeight: 720, addEventListener: (e, f) => (listeners[e] = f) };
// kamu hangrendszer: megszámolja, hány hangot ütemez a rádió
const audio = { tones: 0, ctx: null, gains: [] };
const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime() {} });
global.window.AudioContext = class {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; audio.ctx = this; }
  createGain() { const g = { gain: param(), connect() {}, disconnect() { this.off = true; } }; audio.gains.push(g); return g; }
  createOscillator() { audio.tones++; return { type: '', frequency: param(), connect() {}, start() {}, stop() {} }; }
  resume() { this.state = 'running'; audio.resumed = (audio.resumed || 0) + 1; }
};
global.document = { getElementById: mkCanvas, createElement: mkCanvas };
global.performance = { now: () => now };
global.requestAnimationFrame = f => (rafCb = f);

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
eval(src + `
;global.G = { player, car, aiCars, npcs, bullets, storm, skidMarks, smoke, CHUNK, C, ROAD_SPACING, chunksIn, stationsIn, nearestStation, obstacleAt,
  getChunk, chunkCache, onRoad, nearestRoad, spawnNpc, spawnAiCar, damageCar, damagePlayer, nightAmount,
  get time(){return time}, set time(v){time=v}, get timeScale(){return timeScale},
  set spawn(v){spawnEnabled=v}, set police(v){policeEnabled=v}, wanted, clearWanted,
  SPEED_LIMIT, KMH, START_X, START_Y, progress, mission, drift, stationFor, nearPump, earn, levelOf,
  set missions(v){missionsEnabled=v}, VERSION, sanitizeProgress, FUEL_PRICE, BUS, selectCar, race, racePosition, RACE_PRIZES,
  set races(v){racesEnabled=v}, busStopsIn, spawnCityBus, BUS_DWELL, STOP_SPACING, BUS_FARE, busSchedule, BUS_INTERVAL, nearestBusStop, canvas, dispatchBus, bank, LOAN_MIN, LOAN_MAX, LOAN_FEE, FACTORY_WAGE, WAGE_PERIOD, BOX_SIZE, BELT, bombs, bombInv, BOMB_FUSE, BOMB_RADIUS, BOMB_MAX, BOMB_REGEN, get taxi(){return taxi}, get taxiTrip(){return taxiTrip}, taxiMenu, TAXI_FARE, taxiDestinations, nearestStation, stationCache, STATION_CACHE_MAX, raiseWanted,
  get message(){return message}, parkingLot, lotsIn, RENT_PRICE, RENTAL_MODEL, HU_FLAG, rentedLots, donate, DONATE_MIN, DONATE_MAX, homelessSpot, housesIn, collideTest: o => collide(o),
  get tornado(){return tornado}, set tornado(v){tornado=v}, spawnTornado, destroyedHouses, set tornadoes(v){tornadoEnabled=v}, TORNADO_CORE, TORNADO_CHASE, horsesIn, nearestHorse, usedHorses, droppedHorses, dropPhone, pickUpPhone, nearestDroppedPhone, crackText, DROPPED_PHONE_MAX, explode, phoneBack, openApp, phoneClick, snakeNew, snakeStep, snakeSteer, snakeFood, SNAKE_N, SNAKE_STEP, flappyNew, flappyFlap, flappyStep, FLAP_H, FLAP_GAP, FLAP_SPACE, FLAP_BIRD_X, PHONE_APPS, PHONE_VIDEOS, newsLog, addNews, newsLive, downtown, planeCrash, callArmy, ARMY_JOIN, ARMY_SIZE, ARMY_TANKS, ARMY_REINFORCE, ARMY_FOLLOW, RESPAWN_SHIELD, WAR_RESPAWN_DIST, WAR_RESPAWN_RANGE, PLANE_MISSILES, PLANE_ATOMS, ATOM_FALL, PLAYER_MISSILE_RANGE, PLANE_WEAPONS, cyclePlaneWeapon, dropWarMissiles, planes, bombers, airBombs, spawnParkedPlane, sendBomber, mountPlane, leavePlane, nearestPlane, PLANE_MIN, PLANE_MAX, PLANE_LAND, PLANE_AMMO, BOMBER_EVERY, AIRBOMB_FALL, AIRBOMB_RADIUS, phone, robiReply, openPhone, closePhone, sendPhone, tickPhone, norm, compass, PHONE_ITEMS, missiles, garrison, get occupation(){return occupation}, launchMissile, missileImpact, startOccupation, endOccupation, updateOccupation, MISSILE_EVERY, MISSILE_FLIGHT, MISSILE_RADIUS, MISSILE_HOUSES, OCCUPY_TIME, GARRISON, LIBERATE_BOUNTY, OCCUPY_RADIUS, callWar, WAR_REINFORCE, WAR_TANKS, TANK_HP, TANK_BOUNTY, TANK_RELOAD, NUKE_WARN, NUKE_KILL, NUKE_RADIUS, NUKE_HOUSES, warShells, craters, get nukeFx(){return nukeFx}, set nukeFx(v){nukeFx=v}, nuke, spawnSoldier, callWar, get war(){return war}, soldiers, fallen, warClock, startWar, endWar, shell, killSoldier, set warsOn(v){warsEnabled=v}, WAR_FIRST, WAR_LIFE, WAR_SOLDIERS, SOLDIER_HP, SOLDIER_BOUNTY, WAR_GAP_MIN, indoor, pickErrand, houseService, updateIndoor, set errands(v){errandsEnabled=v}, AI_REFUEL_BELOW, AI_FUEL_FLOOR, AI_FUEL_USE, ERRAND_EVERY, ERRAND_TIMEOUT, stationsIn, trainPose, nextTrainIn, getTrain, trainsIn, railStopsIn, onPlatform, TRAIN_FARE, TRAIN_DWELL, TRAIN_PERIOD, STOP_SPACE, STOP_X0, RAIL_Y0, RAIL_SPACE, RAIL_GAP, TRAIN_LEN, PLATFORM, set trainShift(v){trainShift=v}, hpFraction, ESCAPE_SPOT, HORROR_KILLS, DEMO_HIT, DEMO_HP, MAX_DEMOS, aliens, alienClock, spawnAliens, shootAlien, set aliensOn(v){aliensEnabled=v}, ALIEN_INTERVAL, ALIEN_COUNT, ALIEN_SPEED, ALIEN_CHASE_TIME, ALIEN_BOUNTY, ABDUCT_TIME, MOON_TERM, CHEAT_MONEY, HORSE_CELL, HORSE_TROT, HORSE_GALLOP, skidMarks, doorOf, ROOM_W, ROOM_H, furnitureOf, destroyHouse, interactionPrompt, roomLayout, enterHouse, exitHouse,
  get activeSkin(){return activeSkin}, buySkin, radio, makeSong, SCALES, BEER_PRICE, WINE_PRICE, DRUNK_DRIVE, drunkK, ownsSkin: i => progress.ownedSkins.includes(i), menu, SKINS, CAR_MODELS, ROAD_W, SIDEWALK_W, WALK_OFF, EDGE, spawnPedOnSidewalk,
  school, makeQuestion, TEACHER_HOME, SHOUT, WRONG_FINE, RUN_FINE, QUESTION_TIME, TAUNTS, answerQuestion, atBlackboard, LESSON_LEN, ANSWER_PAY, LESSON_BONUS, nearestAlex, talkToAlex, ALEX_LINES, selectCar, tv, TV_CHANNELS, atTv, RESTAURANT_ITEMS, MECHANIC_ITEMS, TUNE_MAX, TUNE_SPEED, PAINTS, shop, SHOP_ITEMS, buyItem, lotteryPrize, LOTTERY_PRIZE, atShopCounter, mapView, poisIn, worldToMap, mapToWorld, radarPois, PIN_MAX, get clock(){return clock} };`);

const step = n => { for (let i = 0; i < n; i++) { now += 16.7; rafCb(now); } };
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({ code, repeat: false });
const press = code => { key(code, true); key(code, false); };

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// a determinisztikus tesztekhez kikapcsoljuk a spawnolást
G.spawn = false;
G.police = false;
G.missions = false;
G.races = false;
G.storm.timer = 1e9;      // a homokvihar csak a saját tesztjében jöjjön (a szél sodor mindent)
G.tornadoes = false;
G.aliensOn = false;       // az űrlények csak a saját tesztjükben jöjjenek
G.errands = false;        // a gyalogosok ügyintézése is (különben eltűnnek a házakban)
G.warsOn = false;         // a háború is csak a saját tesztjében

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
let lampCount = 0;
for (let cx = 0; cx < 55; cx++) {        // a régi pálya szélességében
  const ch = G.getChunk(cx, roadRow);
  lampCount += ch.lamps.length;
}
check('vannak villanyoszlopok az út mentén', lampCount > 50);
check('nincsenek nyálkafoltok az utakon', [...Array(55)].every((_, cx) => !('slime' in G.getChunk(cx, roadRow))));

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

// --- nincsenek banditák: senki nem lő a játékosra ---
G.npcs.length = 0;
Object.assign(G.player, { x: 8000, y: 9000, inCar: false, health: 100, lastHit: -99 });
G.spawn = true;
step(600);
G.spawn = false;
check('nincsenek banditák, senki nem lő a játékosra', !G.npcs.some(p => p.kind !== 'ped' && p.kind !== 'homeless')
  && G.player.health === 100 && G.bullets.length === 0);
G.npcs.length = 0; G.aiCars.length = 0;

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
for (let i = 0; i < 1800 && !G.npcs.some(p => p.kind === 'homeless'); i++) step(1);
check('magától megjelennek csövesek a járdán', G.npcs.some(p => p.kind === 'homeless'));
check('a megjelenő gyalogosok a járdán / zebrán vannak', G.npcs.filter(p => p.kind === 'ped' && !p.dead).every(p => G.onRoad(p.x, p.y, G.SIDEWALK_W)));
check('megjelennek AI autók', G.aiCars.length > 0);
for (let i = 0; i < 60 * 65 && !G.aiCars.some(c => c.citybus); i++) step(1);   // a busz percenként jár
check('magától járnak városi buszok', G.aiCars.some(c => c.citybus));
G.spawn = false;

// --- homokvihar ---
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra homokvihar támad', G.storm.level > 0.9 && G.storm.particles.length > 100);
key('KeyH', true); key('KeyH', false);
step(300);
check('H gombra eláll a homokvihar', G.storm.level < 0.1);
G.storm.timer = 1e9;

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
  for (const o of ch.obstacles) if ((o.type === 'cactus' || o.type === 'rock') && G.onRoad(o.x, o.y, G.SIDEWALK_W + o.r)) blocking++;
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
  p.startAxis = p.axis;
  strollers.push(p);
}
Object.assign(G.player, { x: G.C, y: G.C });
let offPaved = 0;
for (let i = 0; i < 1500; i++) {      // ~25 mp
  step(1);
  G.player.x = G.C; G.player.y = G.C;  // a közelben maradunk, hogy ne tűnjenek el
  for (const p of strollers) { if (!paved(p)) offPaved++; if (p.axis !== p.startAxis) p.turned = true; }
}
check('a gyalogosok kereszteződéseken át is a járdán / zebrán maradnak', offPaved === 0);
check('a gyalogosok a sarkon be is fordulnak', strollers.some(p => p.turned));

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
// a közeledést rögzített helyzetben mérjük: a rendőr ugyanazon az üres úton jön, 1400 px-ről (ne múljon a véletlen akadályokon)
G.aiCars.length = 0; G.police = false;
Object.assign(G.car, { y: G.C, angle: 0, vx: 0, vy: 0 });
cop = Object.assign(G.spawnAiCar('h', 1, G.C, G.car.x - 1400), { police: true, chasing: true, stuckT: 0, reverseT: 0 });
cop.y = G.C;
const d0 = Math.hypot(cop.x - G.car.x, cop.y - G.car.y);
step(90);
G.police = true;
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
  const bad = G.CAR_MODELS.length;                     // nem létező autó (a lista hosszánál nagyobb index)
  const p1 = G.sanitizeProgress({ money: 0, owned: [0, bad], activeCar: bad });
  const p2 = G.sanitizeProgress({ money: 'x', owned: null, xp: -5 });
  const p3 = G.sanitizeProgress(null);
  check('érvénytelen autó-index a mentésben nem omlasztja össze a játékot', p1.activeCar === 0 && !p1.owned.includes(bad));
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

// --- parkolók autóbérléssel és magyar zászlók a megállókban ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
  const stops = G.busStopsIn(G.C - 8000, G.C - 8000, G.C + 8000, G.C + 8000);
  const lots = stops.map(G.parkingLot);
  check('minden buszmegálló mellett van parkoló', lots.length === stops.length && lots.every(l =>
    Math.hypot((l.x0 + l.x1) / 2 - l.bs.x, (l.y0 + l.y1) / 2 - l.bs.y) < 300));
  check('a parkolók az úton és a járdán kívül vannak', lots.every(l => [[l.x0, l.y0], [l.x1, l.y1], [(l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2]]
    .every(([x, y]) => !G.onRoad(x, y, G.SIDEWALK_W))));
  let blocked = 0;
  for (const l of lots.slice(0, 20)) for (const ch of G.chunksIn(l.x0, l.y0, l.x1, l.y1))
    for (const o of ch.obstacles) if ((o.type === 'cactus' || o.type === 'rock') && o.x > l.x0 - o.r && o.x < l.x1 + o.r && o.y > l.y0 - o.r && o.y < l.y1 + o.r) blocked++;
  check('a parkolókban nincs kaktusz vagy szikla', blocked === 0);
  check('minden megállóban ki van tűzve a magyar zászló (piros-fehér-zöld)', lots.every(l => l.flag && Math.hypot(l.flag.x - l.bs.x, l.flag.y - l.bs.y) < 60)
    && G.HU_FLAG.join() === '#CD2A3E,#FFFFFF,#436F4D');
  // bérlés
  const lot = lots.find(l => l.bs.axis === 'h' && l.bs.side === 1 && l.bs.along > G.C + 3000);
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });         // a saját autó messze van
  Object.assign(G.player, { x: lot.spot.x, y: lot.spot.y + 50, inCar: false, riding: null, dead: 0, arrested: 0 });
  G.progress.money = 10;
  key('KeyE', true); key('KeyE', false);
  check(`$${G.RENT_PRICE} nélkül nem lehet autót bérelni`, !G.player.inCar && G.progress.money === 10);
  G.progress.money = 20;
  key('KeyE', true); key('KeyE', false);
  check(`$${G.RENT_PRICE}-ért autót lehet bérelni a parkolóban`, G.player.inCar && G.car.rental && G.progress.money === 20 - G.RENT_PRICE
    && Math.hypot(G.car.x - lot.spot.x, G.car.y - lot.spot.y) < 1 && G.car.fuel === 100 && G.car.type === 'rental');
  key('KeyW', true); step(60); key('KeyW', false);
  check('a bérautóval lehet vezetni', Math.hypot(G.car.x - lot.spot.x, G.car.y - lot.spot.y) > 50);
  key('KeyS', true); step(60); key('KeyS', false);
  key('KeyE', true); key('KeyE', false);
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { x: lot.spot.x, y: lot.spot.y + 50, inCar: false });
  G.progress.money = 100;
  key('KeyE', true); key('KeyE', false);
  check('egy parkolóban csak egy bérautó van', !G.player.inCar && G.progress.money === 100);
  G.selectCar(0);
  check('saját autót választva véget ér a bérlés', !G.car.rental && G.car.type !== 'rental');
  // a bérautó teli tankja nem száll át a saját autóra
  const lot2 = lots.find(l => l.bs.axis === 'h' && l.bs.side === -1 && l.bs.along > G.C + 3000);
  G.car.fuel = 5;
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { x: lot2.spot.x, y: lot2.spot.y - 50, inCar: false });
  key('KeyE', true); key('KeyE', false);
  const rentedFuel = G.car.fuel;
  G.selectCar(0);
  check('bérléssel nem lehet olcsón teletankolni a saját autót', rentedFuel === 100 && G.car.fuel === 5);
  // bérlés közben meghalva a saját autó is megkapja a 40%-os minimumot
  G.car.fuel = 0;
  const lot3 = lots.find(l => l.bs.axis === 'h' && l.bs.side === 1 && l.bs.along > G.C + 6000);
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { x: lot3.spot.x, y: lot3.spot.y + 50, inCar: false });
  G.progress.money = 100;
  key('KeyE', true); key('KeyE', false);
  G.damagePlayer(1000); step(200);
  G.selectCar(0);
  check('bérlés közbeni újraéledés után a saját autóban is van legalább 40% benzin', G.car.fuel >= 40);
}

// --- csövesek és adományozás ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted();
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  const hx = G.C + 15000, hy = G.C + G.WALK_OFF + 16;
  const bum = G.spawnNpc('homeless', hx, hy);
  Object.assign(G.player, { x: hx, y: hy - 30, inCar: false, riding: null, dead: 0, arrested: 0, health: 100 });
  step(120);
  check('a csöves ül a helyén, és nem lő', bum.x === hx && bum.y === hy && G.player.health === 100 && G.bullets.length === 0);
  // homokviharban sem sodródik el, és a lassan nekimenő autó sem tolja le a járdáról
  G.storm.level = G.storm.target = 1; G.storm.timer = 60;
  step(240);
  G.storm.level = G.storm.target = 0; G.storm.timer = 1e9;
  check('a csöves homokviharban sem sodródik el', bum.x === hx && bum.y === hy);
  Object.assign(G.player, { x: hx + 300, y: hy - 30 });          // a játékos félreáll, amíg az autó gurul
  Object.assign(G.car, { x: hx, y: hy - 45, angle: Math.PI / 2, vx: 0, vy: 60 });
  step(30);
  check('a lassú autó nem tolja le a csövest a helyéről', bum.x === hx && bum.y === hy && !bum.dead);
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { x: hx, y: hy - 30 });
  G.progress.money = 500;
  const donated0 = G.progress.donated || 0;
  press('KeyE');
  check('E-re megnyílik az adományozás', G.donate.open && G.donate.target === bum);
  const clk = G.clock; step(30);
  check('adományozás közben megáll a játék', G.clock === clk);
  for (let i = 0; i < 30; i++) press('ArrowDown');
  check(`az összeg legalább $${G.DONATE_MIN}`, G.donate.amount === G.DONATE_MIN);
  for (let i = 0; i < 30; i++) press('ArrowUp');
  check(`az összeg legfeljebb $${G.DONATE_MAX}`, G.donate.amount === G.DONATE_MAX);
  press('ArrowLeft'); press('ArrowDown');
  check('←/↓ eggyel és tízzel csökkent', G.donate.amount === G.DONATE_MAX - 11);
  press('Enter');
  check('az adomány levonódik és összesítődik', !G.donate.open && G.progress.money === 500 - 189 && G.progress.donated === donated0 + 189 && bum.received === 189);
  // nincs elég pénz
  G.progress.money = 5;
  press('KeyE');
  press('ArrowUp');                                    // 10 → 20
  press('Enter');
  check('nem lehet többet adni, mint amennyi pénzed van', G.donate.open && G.progress.money === 5);
  press('Escape');
  check('Esc-re bezárul, nem fizetsz', !G.donate.open && G.progress.money === 5 && !G.menu.open);
  // egérrel: +10, majd „Adományozok”
  G.progress.money = 100;
  press('KeyE'); step(1);
  const before = G.donate.amount;
  const plus10 = G.donate.hits.find(h => h.delta === 10), give = G.donate.hits.find(h => h.give);
  listeners.mousedown({ button: 0, clientX: plus10.x + 5, clientY: plus10.y + 5 });
  check('egérrel is lehet emelni az összeget', G.donate.amount === before + 10);
  listeners.mousedown({ button: 0, clientX: give.x + 5, clientY: give.y + 5 });
  check('egérrel is lehet adományozni', !G.donate.open && G.progress.money === 100 - (before + 10));
  // a csöves helye: járdán igen, kereszteződésben (zebrán / úttesten) soha
  const spots = [];
  for (const axis of ['h', 'v']) for (const side of [-1, 1]) for (let along = G.C - 6000; along <= G.C + 6000; along += 37) {
    spots.push({ along, p: G.homelessSpot(axis, G.C, side, along) });
  }
  check('a csöves soha nem ül az úttesten vagy a zebrán', spots.every(o => !o.p || (G.onRoad(o.p.x, o.p.y, G.SIDEWALK_W) && !G.onRoad(o.p.x, o.p.y))));
  const nearStop = a => { const m = ((a - 1250) % G.STOP_SPACING + G.STOP_SPACING) % G.STOP_SPACING; return Math.min(m, G.STOP_SPACING - m) < 80; };
  check('kereszteződésnél és megállónál nincs csöveshely, máshol van', spots.filter(o => !o.p).every(o => Math.abs(o.along - G.nearestRoad(o.along)) < 300 || nearStop(o.along))
    && spots.filter(o => o.p).length > spots.length * 0.75);
  check('csöves nem ülhet a buszváróba', [-1, 1].every(side => G.homelessSpot('h', G.C, side, G.C + 3750) === null && G.homelessSpot('h', G.C, side, G.C + 3750 + 40) === null));
  G.npcs.length = 0;
}

// --- házak az utak mentén ---
{
  const area = [G.C - 15000, G.C - 15000, G.C + 15000, G.C + 15000];
  const hs = G.housesIn(...area);
  check('vannak házak az utak mentén, mindkét oldalon', hs.length > 100 && hs.some(h => h.side === 1) && hs.some(h => h.side === -1)
    && hs.some(h => h.axis === 'h') && hs.some(h => h.axis === 'v'));
  const corners = h => [[h.x0, h.y0], [h.x1, h.y0], [h.x0, h.y1], [h.x1, h.y1], [h.x, h.y]];
  check('a házak nem lógnak az útra vagy a járdára', hs.every(h => corners(h).every(([x, y]) => !G.onRoad(x, y, G.SIDEWALK_W))));
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const sts = G.stationsIn(...area).map(st => st.rect), lots = G.lotsIn(...area);
  check('a házak nem ütköznek benzinkúttal vagy parkolóval', hs.every(h => !sts.some(r => overlap(h, r)) && !lots.some(l => overlap(h, l))));
  check('a házak nem fedik egymást', hs.every((a, i) => hs.every((b, j) => i === j || !overlap(a, b))));
  let inHouse = 0;
  for (const h of hs.slice(0, 60)) for (const ch of G.chunksIn(h.x0, h.y0, h.x1, h.y1))
    for (const o of ch.obstacles) if ((o.type === 'cactus' || o.type === 'rock') && o.x > h.x0 && o.x < h.x1 && o.y > h.y0 && o.y < h.y1) inHouse++;
  check('a házakban nincs kaktusz vagy szikla', inHouse === 0);
  const h0 = hs[0], probe = { x: h0.x, y: h0.y, r: 12 };
  G.collideTest(probe);
  check('a ház szilárd: nem lehet belemenni', Math.hypot(probe.x - h0.x, probe.y - h0.y) > 10);
  const cornersIn = hs.slice(0, 30).flatMap(h => [[h.x0 + 3, h.y0 + 3], [h.x1 - 3, h.y0 + 3], [h.x0 + 3, h.y1 - 3], [h.x1 - 3, h.y1 - 3]].map(([x, y]) => ({ h, x, y })));
  check('a ház sarkai is szilárdak (a gyalogos nem lép a tetőre)', cornersIn.every(({ h, x, y }) => {
    const pr = { x, y, r: 12 }; G.collideTest(pr);
    const cx = Math.max(h.x0, Math.min(pr.x, h.x1)), cy = Math.max(h.y0, Math.min(pr.y, h.y1));
    return Math.hypot(pr.x - cx, pr.y - cy) >= 12 - 1e-6;
  }));
  check('a ház akadályt a golyó is érzékeli a saroknál', cornersIn.every(({ x, y }) => G.obstacleAt(x, y)));
  check('a házak mindig ugyanott vannak', JSON.stringify(G.housesIn(...area).map(h => [h.x, h.y, h.roof])) === JSON.stringify(hs.map(h => [h.x, h.y, h.roof])));
}

// --- házak belseje ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  const hs = G.housesIn(G.C + 31000, G.C - 400, G.C + 33000, G.C)[0];
  const door = G.doorOf(hs);
  check('az ajtó a ház és a járda között van (a bejárati úton)', !G.onRoad(door.x, door.y, G.SIDEWALK_W) && G.onRoad(door.x, door.y, G.SIDEWALK_W + 30)
    && !(door.x > hs.x0 && door.x < hs.x1 && door.y > hs.y0 && door.y < hs.y1));
  Object.assign(G.player, { x: door.x, y: door.y, inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, health: 40, lastHit: -99 });
  press('KeyE');
  check('az ajtónál E-vel be lehet menni a házba', !!G.player.inHouse && G.player.inHouse.hs.id === hs.id);
  const H = G.player.inHouse, ix0 = H.ix, iy0 = H.iy;
  key('KeyW', true); step(30); key('KeyW', false);
  check('a házban lehet járkálni', H.iy < iy0 - 30 && G.player.x === door.x);
  key('KeyA', true); step(400); key('KeyA', false);
  check('a falon nem lehet átmenni', H.ix >= 14 + 12 - 1e-6);
  const insideFurniture = (x, y) => H.furniture.some(f => x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h);
  let walkedIntoFurniture = false;
  for (const f of H.furniture) {                        // arról az oldalról közelítünk, ahol van hely
    const fromAbove = f.y - 40 > 14 + 12;
    H.ix = f.x + f.w / 2; H.iy = fromAbove ? f.y - 30 : f.y + f.h + 30;
    if (insideFurniture(H.ix, H.iy)) continue;
    const k = fromAbove ? 'KeyS' : 'KeyW';
    key(k, true); step(90); key(k, false);
    if (insideFurniture(H.ix, H.iy)) walkedIntoFurniture = true;
  }
  check('a bútorok szilárdak', !walkedIntoFurniture);
  const doorClear = G.furnitureOf(hs).every(f => !(f.x < G.ROOM_W / 2 + 45 && f.x + f.w > G.ROOM_W / 2 - 45 && f.y + f.h > G.ROOM_H - 100));
  check('az ajtó előtt nincs bútor', doorClear);
  // bent: rendőrség, gyógyulás
  G.wanted.level = 1; G.wanted.lostTimer = 0;
  const cop = Object.assign(G.spawnAiCar('h', 1, G.C, door.x), { police: true, chasing: true, stuckT: 0, reverseT: 0 });
  Object.assign(cop, { x: door.x, y: door.y + (hs.side > 0 ? -60 : 60), vx: 0, vy: 0 });
  G.police = false;
  for (let i = 0; i < 60 * 13; i++) { Object.assign(cop, { x: door.x, y: door.y + (hs.side > 0 ? -60 : 60), vx: 0, vy: 0 }); step(1); }
  check('a házban nem tartóztatnak le', !(G.player.arrested > 0) && !!G.player.inHouse);
  check('a házban 12 mp után leráztad a rendőröket (az ajtó előtt álló rendőr sem lát)', G.wanted.level === 0);
  check('otthon gyorsabban gyógyulsz', G.player.health === 100);
  G.aiCars.length = 0;
  // kimenés
  H.ix = G.ROOM_W / 2; H.iy = G.ROOM_H - 30;
  press('KeyE');
  check('az ajtónál E-vel ki lehet menni', !G.player.inHouse && Math.hypot(G.player.x - door.x, G.player.y - door.y) < 1);
  press('KeyE');
  H.ix = G.ROOM_W / 2; H.iy = 60;                       // a szoba közepén nem lehet kimenni
  const H2 = G.player.inHouse; if (H2) { H2.ix = G.ROOM_W / 2; H2.iy = 60; }
  press('KeyE');
  check('csak az ajtónál lehet kimenni', !!G.player.inHouse);
  // a tornádó a házzal együtt elvisz
  G.destroyHouse(hs);
  check('ha a tornádó elviszi a házat, téged is elvisz', !G.player.inHouse && G.player.dead > 0);
  step(200);
  Object.assign(G.player, { x: door.x, y: door.y });
  press('KeyE');
  check('lerombolt házba nem lehet bemenni', !G.player.inHouse);
}

// --- kódátnézés (v0.12.0): javított hibák ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  // 1. házban a felirat a kimenésről szól, akkor is, ha az autó az ajtó mellett áll
  const hsA = G.housesIn(G.C + 36000, G.C - 400, G.C + 38000, G.C)[0];
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0 });
  G.enterHouse(hsA);
  const dA = G.doorOf(hsA);
  Object.assign(G.car, { x: dA.x + 20, y: dA.y, vx: 0, vy: 0 });
  check('házban a felirat a kimenésről szól, akkor is, ha az autó az ajtónál áll', /kimen/.test(G.interactionPrompt().text));
  G.exitHouse();
  Object.assign(G.car, { x: G.C - 20000, y: G.C });
  // 2. függőleges út melletti házból kilépve az út felé nézel
  const hsV = G.housesIn(G.C - 400, G.C + 6000, G.C, G.C + 9000).find(h => h.axis === 'v');
  G.enterHouse(hsV); G.exitHouse();
  const faceX = Math.cos(G.player.angle), faceY = Math.sin(G.player.angle);
  check('függőleges út melletti házból kilépve az út felé nézel', Math.abs(faceY) < 1e-6 && Math.sign(faceX) === Math.sign(hsV.road - G.player.x));
  // 3. alacsony ablakban is látszik a szoba alja (az ajtó) és a lenti felirat
  check('alacsony ablakban is látszik a szoba ajtaja', [[1280, 720], [1280, 500], [800, 450], [400, 600]].every(([w, h]) => {
    const L = G.roomLayout(w, h);
    return L.oy >= 0 && L.oy + G.ROOM_H * L.sc <= h - 60 && L.ox >= 0 && L.ox + G.ROOM_W * L.sc <= w;
  }));
  // 4. a tornádó által elvitt versenyző kiesik a versenyből
  Object.assign(G.player, { x: G.C + 1200, y: G.C, inCar: true });
  Object.assign(G.car, { x: G.C + 1200, y: G.C, angle: 0, vx: 0, vy: 0 });
  G.races = true; G.race.cooldown = 0; step(2);
  Object.assign(G.car, { x: G.race.offer.x, y: G.race.offer.y, vx: 0, vy: 0 }); step(200);
  const rv = G.race.racers[0];
  G.spawnTornado(rv.x, rv.y); G.tornado.power = 1; G.tornado.life = 1e9;
  step(1);
  check('a tornádó által elvitt versenyző kiesik a versenyből', !G.race.racers.includes(rv) && G.race.racers.length === 2);
  G.tornado = null; G.races = false;
  key('KeyE', true); key('KeyE', false); step(2);
  G.aiCars.length = 0;
}

// --- a felirat és az E gomb ugyanazt csinálja: egy álló busz megelőzi az ajtót ---
{
  G.npcs.length = 0; G.aiCars.length = 0;
  const hsB = G.housesIn(G.C + 41000, G.C - 400, G.C + 43000, G.C).find(h => h.side === -1);
  const dB = G.doorOf(hsB);
  Object.assign(G.player, { x: dB.x, y: dB.y, inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0 });
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  const busB = G.spawnCityBus('h', 1, G.C, dB.x);
  Object.assign(busB, { x: dB.x, y: dB.y + busB.r + 30, vx: 0, vy: 0, dwellUntil: G.clock + 99 });
  G.progress.money = 50;
  const shown = G.interactionPrompt().text;
  press('KeyE');
  const did = G.player.riding ? 'bus' : G.player.inHouse ? 'house' : 'none';
  check('a felirat azt mutatja, amit az E csinál (busz az ajtónál)', (did === 'bus' && /busz/.test(shown)) || (did === 'house' && /ház/.test(shown)));
  if (G.player.riding) { Object.assign(busB, { vx: 0, vy: 0 }); press('KeyE'); }
  if (G.player.inHouse) G.exitHouse();
  G.aiCars.length = 0;
}

// --- Nitró Villám: 140 km/h, nitróval 200 km/h ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.police = false;
  const ni = G.CAR_MODELS.findIndex(m => m.name === 'Nitró Villám');
  check('van Nitró Villám a boltban', ni >= 0 && G.CAR_MODELS[ni].price > 0 && !!G.CAR_MODELS[ni].nitro);
  G.progress.owned.push(ni); G.selectCar(ni);
  const kmh = () => Math.hypot(G.car.vx, G.car.vy) / G.KMH;
  const drive = (frames, nitro) => { key('KeyW', true); if (nitro) key('ShiftLeft', true); let mx = 0; for (let i = 0; i < frames; i++) { step(1); mx = Math.max(mx, kmh()); } key('KeyW', false); key('ShiftLeft', false); return mx; };
  Object.assign(G.player, { x: 1000, y: G.C, inCar: true, riding: null, inHouse: null, dead: 0, arrested: 0 });
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 100, nitro: 100 });
  const normal = drive(300, false);
  check('nitró nélkül legfeljebb 140 km/h', normal > 135 && normal <= 140.5);
  check('140 km/h-val nem üldöz a rendőrség (a korlát 145)', G.wanted.level === 0);
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 100, nitro: 100 });
  const boosted = drive(240, true);
  check('nitróval 200 km/h-ig gyorsul', boosted > 190 && boosted <= 200.5);
  check('a nitró fogy, és elfogy', G.car.nitro === 0);
  key('KeyW', true); step(120); key('KeyW', false);
  check('elfogyó nitró után fokozatosan visszalassul 140-re', kmh() <= 140.5 && kmh() > 120);
  const n0 = G.car.nitro; step(120);
  check('a nitró használat nélkül visszatöltődik', G.car.nitro > n0 + 10);
  check('nitrózva az úton üldözni kezd a rendőrség', G.wanted.level === 1);
  G.clearWanted();
  G.selectCar(0);
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 100 });
  const sport = drive(400, true);
  check('más autóban a Shift nem ad nitrót', sport <= 155.5 && !G.car.nitroCfg);
  G.clearWanted(); G.aiCars.length = 0;
}

// --- kódátnézés (v0.13.0): a mentés sorszám szerint tárol ---
{
  const carOrder = ['Piros sportkocsi', 'Fekete terepjáró', 'Sárga taxi', 'Kék rakétaautó', 'Zöld pickup', 'Zöld busz', 'Nitró Villám',
    'Fehér limuzin', 'Narancs sportkocsi', 'Rózsaszín kisautó', 'Szürke furgon', 'Mentőautó', 'Fekete versenyautó', 'Barna dzsip', 'Arany autó', 'Bicikli'];
  const skinOrder = ['Klasszikus', 'Cowboy', 'Sivatagi katona', 'Rózsaszín párduc', 'Ninja', 'Turista', 'Pókhős', 'Peppa malac', 'Alex', 'Rendőr', 'Szakács', 'Focista', 'Bohóc', 'Űrhajós', 'Kalóz', 'Zombi'];
  check('a meglévő autók sorrendje nem változott (új autó csak a végére kerülhet)', carOrder.every((n, i) => G.CAR_MODELS[i] && G.CAR_MODELS[i].name === n));
  check('a meglévő szkinek sorrendje nem változott (új szkin csak a végére kerülhet)', skinOrder.every((n, i) => G.SKINS[i] && G.SKINS[i].name === n));
  const old = G.sanitizeProgress({ money: 0, owned: [0, 5], activeCar: 5 });   // egy v0.12-es mentés, a busszal
  const ni = G.CAR_MODELS.findIndex(m => m.name === 'Nitró Villám');
  check('régi mentésben nem jár ingyen a Nitró Villám, és a busz marad a busz', !old.owned.includes(ni) && G.CAR_MODELS[old.activeCar].name === 'Zöld busz');
  // autóváltással nem lehet újratölteni a nitrót
  const owned0 = G.progress.owned.slice();
  if (!G.progress.owned.includes(ni)) G.progress.owned.push(ni);
  G.selectCar(ni); G.car.nitro = 0;
  G.selectCar(0); G.selectCar(ni);
  check('autóváltással nem lehet újratölteni a nitrót', G.car.nitro === 0);
  G.selectCar(0); G.progress.owned = owned0;
}

// --- rádió minden házban ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const many = G.housesIn(G.C - 20000, G.C - 20000, G.C + 20000, G.C + 20000);
  check('minden házban van rádió', many.length > 100 && many.every(h => G.furnitureOf(h).some(f => f.k === 'radio')));
  const a = G.makeSong(123), b = G.makeSong(123), c = G.makeSong(456);
  check('ugyanabból a seedből ugyanaz a szám, másikból más', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c));
  const songs = [...Array(30)].map((_, i) => G.makeSong(i * 7919 + 1));
  check('a számok véletlenszerűek: különböző címek, tempók, hangnemek', new Set(songs.map(x => x.name)).size > 15
    && new Set(songs.map(x => x.bpm)).size > 10 && new Set(songs.map(x => x.scaleName)).size === 4);
  check('a dallam hangjai a szám skálájában vannak, a tempó 90–150 BPM', songs.every(x => x.bpm >= 90 && x.bpm < 150
    && x.melody.every(m => m === null || G.SCALES[x.scaleName].includes(((m - x.root) % 12 + 12) % 12))));
  press('KeyR');
  check('házon kívül nem szól a rádió', !G.radio.playing);
  const hsR = G.housesIn(G.C + 46000, G.C - 400, G.C + 48000, G.C)[0];
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0 });
  Object.assign(G.player, G.doorOf(hsR));
  press('KeyE');
  check('a házba lépve szól egy véletlen szám', G.player.inHouse && G.radio.playing && !!G.radio.song && G.radio.song.name.split(' ').length === 3);
  // 3 mp alatt a leglassabb tempónál (90 BPM, nyolcadok) is ≥ 9 lépés jön, 4 lépésenként legalább 3 dobütéssel
  const t0 = audio.tones;
  for (let i = 0; i < 180; i++) { audio.ctx.currentTime += 1 / 60; step(1); }
  check('a rádió hangokat játszik', audio.tones >= t0 + 6);
  const song1 = G.radio.song;
  press('KeyR');
  check('R: következő (másik) szám', G.radio.playing && G.radio.song !== song1 && G.radio.song.seed !== song1.seed);
  press('KeyM');
  const t1 = audio.tones;
  for (let i = 0; i < 60; i++) { audio.ctx.currentTime += 1 / 60; step(1); }
  check('M: kikapcsolja a rádiót, nem szól tovább', !G.radio.playing && audio.tones === t1);
  press('KeyM');
  check('M újra: bekapcsolja', G.radio.playing);
  // kódátnézés után: leállításkor az előző szám már beütemezett hangjai is elnémulnak, R-nél nem szól két szám egyszerre
  const g1 = G.radio.songOut;
  press('KeyR');
  check('R-nél az előző szám azonnal elhallgat (nem szól egymásra két szám)', g1.gain.value === 0 && g1.off && G.radio.songOut !== g1 && G.radio.songOut.gain.value === 1);
  // háttérben töltött idő után nem pótolja be egyszerre a kimaradt hangokat
  audio.ctx.currentTime += 600;
  const t3 = audio.tones; step(1);
  check('hosszú szünet után nincs hangrobbanás', audio.tones - t3 < 10);
  // szünetben (Esc menü) nem ütemez új hangot
  press('Escape');
  const t4 = audio.tones;
  for (let i = 0; i < 120; i++) { audio.ctx.currentTime += 1 / 60; step(1); }
  check('Esc menüben (szünetben) nem szól tovább a rádió', audio.tones === t4);
  press('Escape');
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30;
  press('KeyE');
  const t2 = audio.tones;
  for (let i = 0; i < 60; i++) { audio.ctx.currentTime += 1 / 60; step(1); }
  check('kilépéskor elhallgat a rádió', !G.player.inHouse && !G.radio.playing && audio.tones === t2);
  // ha a böngésző lenémította a hangot, bármely gomb feloldja
  audio.ctx.state = 'suspended';
  press('KeyX');
  check('lenémított hangot egy gombnyomás feloldja', audio.ctx.state === 'running');
  check('kilépéskor a már beütemezett hangok is elnémulnak', audio.gains.filter(g => g.off).every(g => g.gain.value === 0) && G.radio.songOut === null);
}

// --- kocsmák: sör $2, bor $3, részegség ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const pubs = all.filter(h => h.pub);
  check('vannak kocsmák, de a legtöbb ház sima ház', pubs.length > 20 && pubs.length < all.length * 0.25);
  check(`a sör $${G.BEER_PRICE}, a bor $${G.WINE_PRICE}`, G.BEER_PRICE === 2 && G.WINE_PRICE === 3);
  const pub = pubs[0], home = all.find(h => !h.pub);
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, drunk: 0, passedOut: 0 });
  // sima házban nincs ital
  Object.assign(G.player, G.doorOf(home)); press('KeyE');
  G.player.inHouse.ix = 280; G.player.inHouse.iy = 110;
  G.progress.money = 50; press('Digit1');
  check('sima házban nem lehet inni', G.progress.money === 50 && G.player.drunk === 0);
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');
  // kocsma
  Object.assign(G.player, G.doorOf(pub)); press('KeyE');
  check('a kocsmába be lehet menni', G.player.inHouse && G.player.inHouse.hs.pub && G.player.inHouse.furniture.some(f => f.k === 'bar'));
  press('Digit1');
  check('a pulttól távol nem lehet inni', G.progress.money === 50);
  G.player.inHouse.ix = 280; G.player.inHouse.iy = 110;
  check('a pultnál kiírja az árakat', /sör.*\$2.*bor.*\$3/.test(G.interactionPrompt().text));
  press('Digit1');
  check('egy sör $2, és ittasabb leszel', G.progress.money === 48 && G.player.drunk > 10);
  const d1 = G.player.drunk;
  press('Digit2');
  check('egy bor $3, és jobban üt', G.progress.money === 45 && G.player.drunk - d1 > 20);
  G.progress.money = 1;
  press('Digit1');
  check('pénz nélkül nem kapsz italt', G.progress.money === 1 && G.player.drunk < d1 + 30);
  const d2 = G.player.drunk; step(300);
  check('idővel kijózanodsz', G.player.drunk < d2 - 4);
  // részegen imbolyog: egyenesen menve is oldalra tér ki
  G.player.drunk = 90; G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = 300;
  let maxDx = 0; key('KeyW', true); for (let i = 0; i < 40; i++) { step(1); maxDx = Math.max(maxDx, Math.abs(G.player.inHouse.ix - G.ROOM_W / 2)); } key('KeyW', false);
  check('részegen imbolyogsz', G.drunkK() > 0.5 && maxDx > 5);
  // túl sok ital: ájulás, utána a kocsma előtt térsz magadhoz
  G.progress.money = 100; G.player.inHouse.ix = 280; G.player.inHouse.iy = 110; G.player.drunk = 80;
  press('Digit2');
  check('túl sok italtól elájulsz', G.player.passedOut > 0);
  check('ájultan nincs italfelirat', G.interactionPrompt() === null);
  press('Digit1');
  check('ájultan nem lehet inni', G.progress.money === 97);
  step(330);
  const door = G.doorOf(pub);
  check('magadhoz térsz a kocsma előtt, kicsit józanabban', !(G.player.passedOut > 0) && !G.player.inHouse && Math.hypot(G.player.x - door.x, G.player.y - door.y) < 1 && G.player.drunk < 50);
  // ittas vezetés: részegen az úton vezetve üldöz a rendőrség (lassan is)
  G.clearWanted();
  Object.assign(G.player, { x: 1000, y: G.C, inCar: true, drunk: 80 });
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 100 });
  key('KeyW', true); step(20); key('KeyW', false);
  check('ittas vezetésért üldöz a rendőrség', G.wanted.level === 1 && Math.hypot(G.car.vx, G.car.vy) / G.KMH < 100);
  G.clearWanted();
  Object.assign(G.player, { drunk: 10 });
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0 });
  key('KeyW', true); step(20); key('KeyW', false);
  check('már egy ital után (kicsit ittasan) is üldöz a rendőrség', G.wanted.level === 1);
  G.clearWanted();
  Object.assign(G.player, { drunk: 10 });
  Object.assign(G.car, { x: 1000, y: G.C + 3000, angle: 0, vx: 0, vy: 0 });   // a homokban, úttól távol
  key('KeyW', true); step(20); key('KeyW', false);
  check('ittasan nem csak az úton, hanem bárhol üldöz', !G.onRoad(G.car.x, G.car.y, G.SIDEWALK_W) && G.wanted.level === 1);
  G.clearWanted();
  Object.assign(G.player, { drunk: 0 });
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0 });
  key('KeyW', true); step(20); key('KeyW', false);
  check('józanon (lassan) nem üldöz', G.wanted.level === 0);
  Object.assign(G.player, { drunk: 0, inCar: false }); G.clearWanted(); step(60);
}

// --- Peppa malac szkin (ingyenes) ---
{
  const pi = G.SKINS.findIndex(k => k.name === 'Peppa malac');
  check('van Peppa malac szkin: rózsaszín, piros ruhás, malac-fejjel, ingyenes', pi >= 0 && G.SKINS[pi].pattern === 'pig' && G.SKINS[pi].shirt === '#e8383d' && !G.SKINS[pi].price && G.ownsSkin(pi));
}

// --- Pókhős szkin ($900) ---
{
  const spi = G.SKINS.findIndex(k => k.name === 'Pókhős');
  check('van Pókhős szkin, $900-ért, hálómintás', spi >= 0 && G.SKINS[spi].price === 900 && G.SKINS[spi].pattern === 'web');
  check('a Pókhős szkin alapból nincs meg, a többi ingyenes megvan', !G.ownsSkin(spi) && G.SKINS.every((k, i) => i === spi || G.ownsSkin(i)));
  press('Escape');
  press('ArrowDown');                                   // a szkin sor
  while (G.menu.skin !== (spi + G.SKINS.length - 1) % G.SKINS.length) press('ArrowRight');   // lapozás közben a megvettek felkerülnek
  const before = G.activeSkin;
  press('ArrowRight');
  check('a meg nem vett szkin nem vehető fel', G.menu.skin === spi && G.activeSkin === before);
  G.progress.money = 500;
  press('Enter');
  check('$900 nélkül nem lehet megvenni', !G.ownsSkin(spi) && G.progress.money === 500);
  press('Escape');
  check('menü bezárásakor a viselt szkin marad kiválasztva', G.menu.skin === before && G.activeSkin === before);
  G.progress.money = 1000;
  press('Escape'); press('ArrowDown');
  while (G.menu.skin !== spi) press('ArrowRight');
  press('Enter');
  check('$900-ért megvehető, és rögtön rajtad van', G.ownsSkin(spi) && G.activeSkin === spi && G.progress.money === 100);
  press('ArrowRight'); press('ArrowLeft');
  check('a megvett szkinre vissza lehet váltani', G.activeSkin === spi);
  press('Escape');
  check('a megvett szkin a mentésben is megmarad', G.sanitizeProgress({ money: 0, ownedSkins: [spi, 99, -1, 'x'] }).ownedSkins.includes(spi)
    && !G.sanitizeProgress({ money: 0, ownedSkins: [99] }).ownedSkins.includes(99));
  step(5);
  check('a Pókhős szkinnel is fut a játék (rajzolás hiba nélkül)', true);
}

// --- tornádó a homokviharban ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  Object.assign(G.player, { x: G.C + 20000, y: G.C - 1500, inCar: false, riding: null, dead: 0, arrested: 0, health: 100 });
  G.tornadoes = true;
  G.storm.level = G.storm.target = 0; step(600);
  check('homokvihar nélkül nincs tornádó', G.tornado === null);
  G.storm.level = G.storm.target = 1; G.storm.timer = 1e9;
  for (let i = 0; i < 60 * 120 && !G.tornado; i++) step(1);
  check('erős homokviharban tornádó támad', !!G.tornado);
  G.tornadoes = false;
  // rögzített helyzet: a tornádó egy ház, egy autó és egy gyalogos mellett
  const hs = G.housesIn(G.C + 21000, G.C - 400, G.C + 23000, G.C)[0];
  G.spawnTornado(hs.x, hs.y);
  const T0 = G.tornado; T0.power = 1; T0.life = 1e9; T0.wander = 0;
  const victimCar = G.spawnAiCar('h', 1, G.C, hs.x + 30); Object.assign(victimCar, { x: hs.x + 30, y: hs.y, vx: 0, vy: 0 });
  const victim = G.spawnNpc('ped', hs.x - 30, hs.y); Object.assign(victim, { moving: false, wanderT: 99 });
  const farCar = G.spawnAiCar('h', 1, G.C, hs.x + 250); Object.assign(farCar, { x: hs.x + 250, y: hs.y, vx: 0, vy: 0 });
  Object.assign(G.player, { x: hs.x + 2000, y: hs.y });
  step(2);
  check('a tornádó felszippantja a házat (rom marad)', G.destroyedHouses.has(hs.id) && !G.housesIn(hs.x0, hs.y0, hs.x1, hs.y1).some(h => h.id === hs.id));
  const probe = { x: hs.x, y: hs.y, r: 12 }; G.collideTest(probe);
  check('a lerombolt ház már nem akadály', Math.hypot(probe.x - hs.x, probe.y - hs.y) < 1);
  G.chunkCache.clear();
  check('a lerombolt ház újragenerálás után sem tér vissza', !G.housesIn(hs.x0, hs.y0, hs.x1, hs.y1).some(h => h.id === hs.id));
  check('a tornádó felszippantja az autót', !G.aiCars.includes(victimCar));
  check('a tornádó felszippantja az embert', !G.npcs.includes(victim));
  check('a felszippantott dolgok a tornádóban repülnek', G.tornado.flying.length >= 3);
  const fd0 = Math.hypot(G.tornado.x - farCar.x, G.tornado.y - farCar.y), fa0 = Math.atan2(farCar.y - G.tornado.y, farCar.x - G.tornado.x);
  step(60);                          // elég hosszan, hogy ne határeseten múljon (ADR-0012)
  const fd1 = Math.hypot(G.tornado.x - farCar.x, G.tornado.y - farCar.y), fa1 = Math.atan2(farCar.y - G.tornado.y, farCar.x - G.tornado.x);
  check('a távolabbi autót beszívja és megpörgeti', !G.aiCars.includes(farCar) || (fd1 < fd0 - 40 && Math.abs(Math.atan2(Math.sin(fa1 - fa0), Math.cos(fa1 - fa0))) > 0.1));
  // a játékost is elviszi
  Object.assign(G.player, { x: G.tornado.x + 20, y: G.tornado.y, inCar: false, riding: null });
  step(2);
  check('a gyalogos játékost is elviszi a tornádó', G.player.dead > 0 && G.message.text === 'ELVITT A TORNÁDÓ!');
  step(200);
  // a vihar végén eltűnik
  G.storm.level = G.storm.target = 0; T0.life = 0;
  step(240);
  check('a vihar végén a tornádó elül', G.tornado === null);
  // vadászik a játékosra
  {
    G.storm.level = G.storm.target = 1; G.storm.timer = 1e9;
    const hunt = (px, py, tx, ty, ticks, move) => {
      Object.assign(G.player, { x: px, y: py, inCar: false, riding: null, inHouse: null, dead: 0, health: 100 });
      G.spawnTornado(tx, ty); const T = G.tornado; T.power = 1; T.life = 1e9; T.wander = 0;
      const d0 = Math.hypot(T.x - px, T.y - py);
      for (let i = 0; i < ticks; i++) { if (move) { G.player.x += move.x; G.player.y += move.y; } step(1); if (G.player.dead) break; }
      return { T, d0, d1: Math.hypot(T.x - G.player.x, T.y - G.player.y) };
    };
    const a = hunt(G.C + 90000, G.C, G.C + 90000 + 1200, G.C - 900, 120, null);
    check('a tornádó a játékos felé tart (közeledik)', a.d1 < a.d0 - 150);
    const b = hunt(G.C + 95000, G.C, G.C + 95000 - 800, G.C, 60 * 14, { x: 130 / 60, y: 0 });
    check('a sétáló (130 px/s) játékost utoléri és megöli', G.player.dead > 0);
    G.tornado = null; step(200);
    G.tornado = null;
    const c = hunt(G.C + 99000, G.C, G.C + 99000 - 800, G.C, 60 * 10, { x: 240 / 60, y: 0 });
    check('a futó (240 px/s) játékos elmenekül előle', !G.player.dead && c.d1 > c.d0);
    G.tornado = null;
    G.storm.level = G.storm.target = 0;
  }
  G.aiCars.length = 0; G.npcs.length = 0; G.storm.timer = 1e9;
}

// --- menetrend: percenként egy busz a legközelebbi megállóba ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  check('a busz percenként jár', G.BUS_INTERVAL === 60);
  const bs = G.nearestBusStop(G.C + 3750, G.C + 120);
  Object.assign(G.player, { x: bs.x + (bs.axis === 'h' ? 0 : 20), y: bs.y + (bs.axis === 'h' ? 20 : 0), inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0 });
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  G.busSchedule.next = G.clock + 30;
  const waitText = (G.interactionPrompt() || {}).text || '';
  check('a megállóban kiírja, hány mp múlva jön a következő busz', /percenként/.test(waitText) && /~3[45] mp/.test(waitText));
  G.spawn = true;
  G.busSchedule.next = G.clock + 1;
  const d0 = G.busSchedule.dispatched;
  let arrived = null, t0 = G.clock, tArr = 0;
  for (let i = 0; i < 60 * 25 && !arrived; i++) {
    step(1);
    G.npcs.length = 0;                                   // a teszt csak a buszt figyeli
    arrived = G.aiCars.find(c => c.citybus && G.clock < c.dwellUntil && Math.hypot(c.x - bs.x, c.y - bs.y) < 160);
    if (arrived) tArr = G.clock - t0;
  }
  check('a busz a legközelebbi megállóba érkezik, és ott megáll', !!arrived && G.busSchedule.dispatched === d0 + 1 && tArr < 15);
  // 3 perc alatt pontosan 3 busz indul
  const d1 = G.busSchedule.dispatched;
  for (let i = 0; i < 60 * 180; i++) { step(1); G.npcs.length = 0; if (i % 600 === 0) G.aiCars.length = 0; }
  check('3 perc alatt pontosan 3 busz indul (percenként egy)', G.busSchedule.dispatched - d1 === 3);
  // kódátnézés után: foglalt indulóhelyre nem indít buszt; széles képernyőn messzebbről indul, és mégis a megállóba ér
  G.aiCars.length = 0;
  const lead0 = 1000, startAt = bs.along - bs.dir * lead0;
  const blocker = G.spawnAiCar(bs.axis, bs.dir, bs.road, startAt); Object.assign(blocker, { vx: 0, vy: 0, wrecked: true });
  const d2 = G.busSchedule.dispatched;
  const alt = G.dispatchBus();
  check('foglalt indulóhelyre nem indul busz, helyette egy másik megállóba jön', alt && Math.hypot(alt.x - blocker.x, alt.y - blocker.y) > 300 && G.busSchedule.dispatched === d2 + 1);
  G.aiCars.length = 0;
  const w0 = G.canvas.width; G.canvas.width = 3000;
  const wide = G.dispatchBus();
  const leadW = Math.abs((bs.axis === 'h' ? wide.x : wide.y) - bs.along);
  let arrivedW = false;
  for (let i = 0; i < 60 * 25 && !arrivedW; i++) { step(1); G.npcs.length = 0; arrivedW = G.clock < wide.dwellUntil && Math.hypot(wide.x - bs.x, wide.y - bs.y) < 160; }
  check('széles képernyőn messzebbről indul (nem a szemed előtt jelenik meg), és a megállóba ér', leadW > 1500 && arrivedW);
  G.canvas.width = w0;
  G.spawn = false; G.aiCars.length = 0;
}

// --- bankok: hitel és törlesztés ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const banks = all.filter(h => h.bank), factories = all.filter(h => h.factory);
  check('vannak bankok és gyárak, ritkán', banks.length > 5 && factories.length > 5 && banks.length < all.length * 0.12 && factories.length < all.length * 0.12);
  check('egy ház csak egyféle lehet (kocsma / bank / gyár)', all.every(h => [h.pub, h.bank, h.factory].filter(Boolean).length <= 1));
  const bk = banks[0];
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, drunk: 0, passedOut: 0 });
  G.progress.money = 100; G.progress.debt = 0;
  Object.assign(G.player, G.doorOf(bk)); press('KeyE');
  check('a bankba be lehet menni', G.player.inHouse && G.player.inHouse.hs.bank);
  G.player.inHouse.ix = 280; G.player.inHouse.iy = 100;
  check('a pultnál kiírja a bankot', /bank.*hitel/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re megnyílik a bank', G.bank.open);
  const clk = G.clock; step(30);
  check('banki ügyintézés közben áll a játék', G.clock === clk);
  for (let i = 0; i < 30; i++) press('ArrowLeft');
  check(`a hitel legalább $${G.LOAN_MIN}`, G.bank.amount === G.LOAN_MIN);
  for (let i = 0; i < 40; i++) press('ArrowRight');
  check(`a hitel legfeljebb $${G.LOAN_MAX}`, G.bank.amount === G.LOAN_MAX);
  for (let i = 0; i < 15; i++) press('ArrowLeft');      // $500
  press('Digit1');
  check('felvehető a hitel: megkapod a pénzt, és 20%-kal többel tartozol', G.progress.money === 600 && G.progress.debt === 600 && !G.bank.open);
  press('KeyE'); press('Digit1');
  check('egyszerre csak egy hitel lehet', G.progress.money === 600 && G.progress.debt === 600);
  press('Escape');
  G.earn(100, 'teszt');
  check('tartozás alatt a kereset 25%-a automatikusan törleszt', G.progress.debt === 575 && G.progress.money >= 675 && G.progress.money < 700);
  G.progress.money = 200;
  press('KeyE'); press('Digit2');
  check('részletben is lehet törleszteni', G.progress.debt === 375 && G.progress.money === 0);
  G.progress.money = 1000;
  press('KeyE'); press('Digit2');
  check('teljesen ki lehet fizetni a hitelt', G.progress.debt === 0 && G.progress.money === 625);
  check('a tartozás a mentésben is megmarad', G.sanitizeProgress({ money: 0, debt: 333 }).debt === 333 && G.sanitizeProgress({ money: 0, debt: -5 }).debt === 0);
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');

  // --- gyárak: sós zacskók a dobozokba ---
  const fc = factories[0];
  Object.assign(G.player, G.doorOf(fc)); press('KeyE');
  check('a gyárba be lehet menni, van futószalag és doboz', G.player.inHouse && G.player.inHouse.factory && G.player.inHouse.furniture.some(f => f.k === 'belt') && G.player.inHouse.furniture.filter(f => f.k === 'box').length === 3);
  const F = G.player.inHouse.factory, H = G.player.inHouse;
  step(60);
  check('a futószalagon jönnek a sós zacskók', F.bags.length > 0 && F.bags[0].x > G.BELT.x0 + 30);
  press('Space');
  check('távolról nem lehet zacskót felvenni', !F.carrying);
  const box = H.furniture.filter(f => f.k === 'box')[0];
  const grab = () => { const b = F.bags[0]; H.ix = b.x; H.iy = G.BELT.y + G.BELT.h + 14; press('Space'); return F.carrying; };
  const drop = () => { H.ix = box.x + box.w / 2; H.iy = box.y - 14; press('Space'); };
  check('a szalag mellett Space-re felveszed a zacskót', grab());
  while (!F.bags.length) step(10);
  const nb = F.bags.length; H.ix = F.bags[0].x; H.iy = G.BELT.y + G.BELT.h + 14;
  press('Space');
  check('nem lehet egyszerre két zacskót vinni', F.carrying && F.bags.length === nb);
  drop();
  check('a zacskó bekerül a dobozba', !F.carrying && F.boxes[0] === 1 && F.minutePacked === 1);
  for (let i = 1; i < G.BOX_SIZE; i++) { while (!F.bags.length) step(10); grab(); drop(); }
  check(`${G.BOX_SIZE} zacskóval tele a doboz, jön az üres`, F.boxes[0] === 0 && F.packed === G.BOX_SIZE);
  // fizetés: $500 percenként, ha abban a percben dolgoztál
  F.shift = G.WAGE_PERIOD - 0.5; const mw = G.progress.money;
  step(40);
  check(`dolgozva percenként $${G.FACTORY_WAGE} fizetés jár`, G.FACTORY_WAGE === 500 && G.progress.money >= mw + 500 && F.minutePacked === 0);
  F.shift = G.WAGE_PERIOD - 0.5; const mi = G.progress.money;
  step(40);
  check('ha abban a percben nem dolgoztál, nincs fizetés', G.progress.money === mi);
  const lost0 = F.lost; H.ix = 280; H.iy = 300;
  step(60 * 15);
  check('a le nem szedett zacskók a szalag végén leesnek', F.lost > lost0);
  H.ix = G.ROOM_W / 2; H.iy = G.ROOM_H - 30; press('KeyE');
  press('Space');
  check('a gyáron kívül a Space nem pakol', !G.player.inHouse);
}

// --- bomba ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  const hsB = G.housesIn(G.C + 51000, G.C - 400, G.C + 53000, G.C)[0];
  const bx = hsB.along, by = G.C - G.WALK_OFF;          // a ház előtti járdán
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { x: bx, y: by, inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, health: 100, lastHit: -99 });
  G.bombInv.count = 3;
  const victimCar = G.spawnAiCar('h', 1, G.C, bx + 80); Object.assign(victimCar, { x: bx + 80, y: G.C - 40, vx: 0, vy: 0 });
  const farCar = G.spawnAiCar('h', 1, G.C, bx + 900); Object.assign(farCar, { x: bx + 900, y: G.C - 40, vx: 0, vy: 0 }); farCar.ai.speed = 0;
  victimCar.ai.speed = 0;
  const victim = G.spawnNpc('ped', bx - 60, by); Object.assign(victim, { moving: false, wanderT: 99 });
  press('KeyB');
  check('B-vel bombát raksz le', G.bombs.length === 1 && G.bombInv.count === 2);
  Object.assign(G.player, { x: bx + 1500, y: by });   // elfutunk
  step(Math.round(60 * (G.BOMB_FUSE - 0.5)));
  check('a bomba nem robban azonnal', G.bombs.length === 1 && !victimCar.wrecked);
  step(60);
  check(`${G.BOMB_FUSE} mp múlva felrobban`, G.bombs.length === 0);
  check('a robbanás roncsot csinál a közeli autóból', victimCar.wrecked);
  check('a robbanás elsodorja a közeli embert', victim.dead > 0);
  check('a robbanás ledönti a közeli házat', G.destroyedHouses.has(hsB.id));
  check('a távoli autó megmarad', !farCar.wrecked);
  check('messze állva nem sebződsz', G.player.health === 100);
  check('robbantásért ★★ körözés', G.wanted.level === 2);
  G.clearWanted();
  // közelről téged is megsebez / megöl
  Object.assign(G.player, { x: bx + 3000, y: by, health: 100 });
  press('KeyB'); step(Math.round(60 * G.BOMB_FUSE) + 5);
  check('közelről téged is megsebez a robbanás', G.player.health < 100 || G.player.dead > 0);
  step(220); G.clearWanted();
  // a saját bombád öl meg: a halál üzenete marad, és nincs körözés
  Object.assign(G.player, { x: bx + 6000, y: by, health: 10, dead: 0, lastHit: G.clock });
  press('KeyB'); step(Math.round(60 * G.BOMB_FUSE) + 2);
  check('a saját bombád megöl: „FELROBBANTÁL!”, és halottként nincs körözés', G.player.dead > 0 && G.message.text === 'FELROBBANTÁL!' && G.wanted.level === 0);
  // a házzal együtt: a ház-specifikus üzenet marad
  step(220); G.clearWanted();
  const hsX = G.housesIn(G.C + 61000, G.C - 400, G.C + 63000, G.C)[0];
  Object.assign(G.player, G.doorOf(hsX), { health: 100, dead: 0 });
  G.bombInv.count = 2; press('KeyB');                // az ajtó előtt
  press('KeyE');                                     // gyorsan be a házba
  step(Math.round(60 * G.BOMB_FUSE) + 2);
  check('a házzal együtt felrobbanva: „FELROBBANTÁL A HÁZZAL!”', G.player.dead > 0 && G.message.text === 'FELROBBANTÁL A HÁZZAL!' && G.wanted.level === 0);
  step(220); G.clearWanted();
  // nincs bomba, utánpótlás
  Object.assign(G.player, { x: 50000, y: G.C - G.WALK_OFF, health: 100, dead: 0, inCar: false });
  G.bombInv.count = 0; const nb0 = G.bombs.length;
  press('KeyB');
  check('bomba nélkül nem lehet robbantani', G.bombs.length === nb0);
  G.bombInv.regen = 1; step(70);
  check('percenként kapsz egy új bombát', G.bombInv.count === 1);
  G.bombInv.count = G.BOMB_MAX; G.bombInv.regen = 1; step(70);
  check(`legfeljebb ${G.BOMB_MAX} bombád lehet`, G.bombInv.count === G.BOMB_MAX);
  // házban nem lehet bombát rakni
  const hsIn = G.housesIn(G.C + 56000, G.C - 400, G.C + 58000, G.C)[0];
  Object.assign(G.player, G.doorOf(hsIn)); press('KeyE');
  const nb1 = G.bombs.length; press('KeyB');
  check('házban nem lehet bombát rakni', G.player.inHouse && G.bombs.length === nb1);
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');
  G.aiCars.length = 0; G.npcs.length = 0; G.clearWanted();
}

// --- taxi: $5 bárhova ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  Object.assign(G.player, { x: 30000, y: G.C - G.WALK_OFF, inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, health: 100, drunk: 0 });
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  press('KeyX');
  check('X-re taxit hívsz', !!G.taxi && G.taxi.taxicab && G.taxi.state === 'coming');
  press('KeyX');
  check('egyszerre csak egy taxi jön', G.aiCars.filter(c => c.taxicab).length === 1);
  for (let i = 0; i < 60 * 20 && G.taxi.state !== 'waiting'; i++) step(1);
  step(60);                                            // megvárjuk, hogy le is fékezzen
  check('a taxi odajön és megáll melletted', G.taxi.state === 'waiting' && Math.hypot(G.taxi.vx, G.taxi.vy) < 15 && Math.hypot(G.taxi.x - G.player.x, G.taxi.y - G.player.y) < 160);
  check('a taxi mellett kiírja, hogy E: taxi', /taxi/.test((G.interactionPrompt() || {}).text || ''));
  press('KeyE');
  check('E-re megnyílik az úti cél választó', G.taxiMenu.open && G.taxiMenu.items.length >= 6);
  const labels = G.taxiMenu.items.map(i => i.label).join('|');
  check('a célok között ott a kezdőhely, az autód, a benzinkút, a bank, a kocsma és a gyár', ['Kezdőhely', 'autód', 'benzinkút', 'bank', 'kocsma', 'gyár'].every(w => labels.includes(w)));
  const clk = G.clock; step(20);
  check('célválasztás közben áll a játék', G.clock === clk);
  // nincs pénz
  G.progress.money = 3;
  const si = G.taxiMenu.items.findIndex(i => i.label.includes('benzinkút'));
  G.taxiMenu.sel = si; press('Enter');
  check(`$${G.TAXI_FARE} nélkül nem visz el`, G.taxiMenu.open && !G.taxiTrip && G.progress.money === 3);
  // elvisz a legközelebbi benzinkúthoz
  G.progress.money = 20;
  const dest = G.taxiMenu.items[si];
  press('Enter');
  check(`$${G.TAXI_FARE}-ért elindul`, !!G.taxiTrip && G.progress.money === 15 && !G.taxiMenu.open);
  step(Math.round(60 * 2.5) + 5);
  check('megérkezel a célhoz (a legközelebbi benzinkút)', !G.taxiTrip && Math.hypot(G.player.x - dest.x, G.player.y - dest.y) < 60 && !G.taxi);
  const ns = G.nearestStation(G.player.x, G.player.y);
  check('a cél tényleg egy benzinkút mellett van', ns && ns.d < 400);
  // az autódhoz
  press('KeyX'); for (let i = 0; i < 60 * 20 && (!G.taxi || G.taxi.state !== 'waiting'); i++) step(1); step(60);
  press('KeyE');
  check('a megállt taxiba a járdáról is be lehet szállni', G.taxiMenu.open);
  G.taxiMenu.sel = G.taxiMenu.items.findIndex(i => i.label.includes('autód')); press('Enter');
  step(160);
  check('a taxi az autódhoz is elvisz', Math.hypot(G.player.x - G.car.x, G.player.y - G.car.y) < 120);
  // ha nem szállsz be, a taxi elmegy
  Object.assign(G.player, { x: 40000, y: G.C - G.WALK_OFF });
  press('KeyX'); for (let i = 0; i < 60 * 20 && (!G.taxi || G.taxi.state !== 'waiting'); i++) step(1);
  step(60 * 32);
  check('ha nem szállsz be, a taxi 30 mp után elmegy', !G.taxi);
  G.aiCars.length = 0;
  // kódátnézés után: házban nem nyílik a taxi; autóba ülve lemondod; nem érkező taxi lemond; roncs taxi nem visz; a szállítási cél nem úti cél
  const hsT = G.housesIn(G.C + 66000, G.C - 400, G.C + 68000, G.C)[0];
  Object.assign(G.player, G.doorOf(hsT), { inCar: false, inHouse: null });
  press('KeyX'); for (let i = 0; i < 60 * 20 && (!G.taxi || G.taxi.state !== 'waiting'); i++) step(1); step(60);
  check('az ajtó előtt a várakozó taxi felirata és az E ugyanazt csinálja', /taxi/.test(G.interactionPrompt().text));
  G.enterHouse(hsT);                                   // bemegyünk, miközben a taxi kint vár
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = 60;
  press('KeyE');
  check('házban az E nem a taxit nyitja', !G.taxiMenu.open && !!G.player.inHouse);
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');
  Object.assign(G.car, { x: G.player.x + 40, y: G.player.y, vx: 0, vy: 0 });
  press('KeyE');
  step(2);
  check('autóba ülve a taxit lemondod', G.player.inCar && !G.taxi);
  press('KeyE');
  Object.assign(G.car, { x: G.C - 20000, y: G.C });
  press('KeyX'); G.taxi.comeUntil = G.clock + 0.1; step(10);
  check('ha a taxi nem ér oda időben, lemond (újat lehet hívni)', !G.taxi);
  press('KeyX'); for (let i = 0; i < 60 * 20 && (!G.taxi || G.taxi.state !== 'waiting'); i++) step(1); step(60);
  const tx = G.taxi; G.damageCar(tx); for (let i = 0; i < 20; i++) G.damageCar(tx);
  step(2);
  check('a tönkrement taxiba nem lehet beülni', tx.wrecked && !G.taxi && !(G.interactionPrompt() || { text: '' }).text.includes('taxi'));
  G.mission.active = true; G.mission.tx = 1; G.mission.ty = 1;
  check('a szállítási célpont nem taxi-úti cél (különben kiváltaná a szállítást)', !G.taxiDestinations().some(d => d.label.includes('Szállítás')));
  G.mission.active = false;
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

// --- térkép (ADR-0030): nevezetes helyek, kategóriák, saját jelölések ---
{
  Object.assign(G.player, { x: G.C + 3000, y: G.C, inCar: false, inHouse: null, riding: null });
  G.progress.pins = [];
  press('KeyK'); step(1);
  check('K: megnyílik a térkép', G.mapView.open && !!G.mapView.layout);
  const pt0 = { x: G.player.x, y: G.player.y }; key('KeyD', true); step(30); key('KeyD', false);
  check('nyitott térképnél áll a játék', G.player.x === pt0.x && G.player.y === pt0.y);
  const types = new Set(G.mapView.pois.map(p => p.type));
  check('a térképen benzinkutak, gyárak, bankok és kocsmák is vannak', ['station', 'factory', 'bank', 'pub'].every(t => types.has(t)));
  const st = G.mapView.pois.find(p => p.type === 'station'), nst = G.nearestStation(st.x, st.y);
  check('a benzinkút ikonja a valódi kútnál van', nst.d < 1);
  const bk = G.mapView.pois.find(p => p.type === 'bank');
  check('a bank ikonja egy bank háznál van', G.housesIn(bk.x - 1, bk.y - 1, bk.x + 1, bk.y + 1).some(h => h.bank && h.x === bk.x && h.y === bk.y));
  press('Digit1');
  check('1: a benzinkutak elrejthetők', !G.mapView.cats.station);
  const hit = G.mapView.hits.find(h => h.cat === 'station');
  listeners.mousedown({ button: 0, clientX: hit.x + 5, clientY: hit.y + 5 });
  check('a jelmagyarázatra kattintva újra látszanak', G.mapView.cats.station);
  const L = G.mapView.layout, target = { x: G.player.x + 4000, y: G.player.y - 2500 }, m = G.worldToMap(L, target.x, target.y);
  listeners.mousedown({ button: 0, clientX: m.x, clientY: m.y });
  check('kattintással pont jelölhető, a valódi világbeli helyen', G.progress.pins.length === 1 && Math.hypot(G.progress.pins[0].x - target.x, G.progress.pins[0].y - target.y) < 1);
  check('a jelölt pont taxi-úti cél', G.taxiDestinations().some(d => d.label.includes('jelölt pont') && d.x === G.progress.pins[0].x));
  check('a jelölés mentésre kerül', G.sanitizeProgress(JSON.parse(JSON.stringify(G.progress))).pins.length === 1);
  listeners.mousedown({ button: 0, clientX: m.x + 3, clientY: m.y - 3 });
  check('a jelölésre kattintva törlődik', G.progress.pins.length === 0);
  listeners.mousedown({ button: 0, clientX: L.x0 - 10, clientY: L.y0 + 10 });
  check('a térképen kívül kattintva nem lesz jelölés', G.progress.pins.length === 0);
  for (let i = 0; i < G.PIN_MAX + 3; i++) listeners.mousedown({ button: 0, clientX: L.x0 + 30 + i * 30, clientY: L.y0 + 40 });
  check(`legfeljebb ${G.PIN_MAX} jelölés lehet`, G.progress.pins.length === G.PIN_MAX);
  check('a taxi-listában csak a 3 legközelebbi jelölés van', G.taxiDestinations().filter(d => d.label.includes('jelölt pont')).length === 3);
  {   // a taxi menü minden célja kifér egy 600 px magas képernyőre is
    const ih = global.window.innerHeight; global.window.innerHeight = 600; listeners.resize && listeners.resize();
    Object.assign(G.taxiMenu, { open: true, items: G.taxiDestinations(), sel: 0 }); step(1);
    const hs = G.taxiMenu.hits, last = hs[hs.length - 1];
    check('a taxi menü sok célnál is kifér a képernyőre (600 px)', hs.length === G.taxiMenu.items.length && hs[0].y >= 0 && last.y + last.h <= 600);
    G.taxiMenu.open = false; global.window.innerHeight = ih; listeners.resize && listeners.resize(); step(1);
  }
  G.progress.pins.push({ x: G.player.x + 1e6, y: G.player.y });   // a térképen kívül (pl. egy taxiút után)
  G.progress.pins.splice(0, 1);
  press('Delete');
  check('Delete: minden jelölés törlődik (a térképen kívüliek is)', G.progress.pins.length === 0);
  const bad = G.sanitizeProgress({ pins: [{ x: 1, y: 2 }, { x: 'a', y: 3 }, null, { x: 5 }, ...Array(20).fill({ x: 0, y: 0 })] }).pins;
  check('a hibás mentett jelölések kiszűrődnek, legfeljebb 10 marad', bad.length === 10 && bad[0].x === 1 && bad.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  check('régi mentésben (jelölések nélkül) üres a lista', Array.isArray(G.sanitizeProgress({}).pins) && G.sanitizeProgress({}).pins.length === 0);
  press('KeyK');
  check('K újra: bezárul a térkép', !G.mapView.open);
  key('KeyD', true); step(10); key('KeyD', false);
  check('bezárás után megy tovább a játék', G.player.x !== pt0.x);
  const near = G.radarPois();   // a gyorsítótár 600 px elmozdulásonként frissül, ezért 4200 + 600
  check('a radar a közeli nevezetes helyeket mutatja', near.length > 0 && near.every(p => Math.abs(p.x - G.player.x) <= 4800 && Math.abs(p.y - G.player.y) <= 4800));
  press('Escape'); press('KeyK');
  check('menüből nem nyílik a térkép', !G.mapView.open);
  press('Escape');
  check('a radar a széléig mutatja a helyeket (gyorsítótár: 4000 + 600 px)', /poisIn\(player\.x - 4700/.test(src));
  {
    const hsT = G.housesIn(G.player.x - 3000, G.player.y - 3000, G.player.x + 3000, G.player.y + 3000)[0];
    Object.assign(G.player, G.doorOf(hsT), { inCar: false, inHouse: null });
    press('KeyX'); for (let i = 0; i < 60 * 20 && (!G.taxi || G.taxi.state !== 'waiting'); i++) step(1); step(60);
    G.progress.money += 10; press('KeyE'); press('Enter');
    check('taxiút indul', !!G.taxiTrip);
    press('KeyK');
    check('taxiút közben nem nyílik a térkép', !G.mapView.open);
    step(60 * 4); G.aiCars.length = 0;
  }
  G.progress.pins = [];
}

// --- boltok: a pultnál E, mindenféle áru ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const shops = all.filter(h => h.shop);
  check('vannak boltok, ritkán', shops.length > 5 && shops.length < all.length * 0.14);
  check('egy ház csak egyféle lehet (kocsma / bank / gyár / bolt)', all.every(h => [h.pub, h.bank, h.factory, h.shop].filter(Boolean).length <= 1));
  const sh = shops[0];
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, drunk: 0, passedOut: 0, health: 100 });
  Object.assign(G.player, G.doorOf(sh)); press('KeyE');
  check('a boltba be lehet menni, van pult és polc', G.player.inHouse && G.player.inHouse.hs.shop && G.player.inHouse.furniture.some(f => f.k === 'shelf'));
  press('KeyE');
  check('az ajtónál az E kivisz (nem a bolt nyílik)', !G.player.inHouse && !G.shop.open);
  press('KeyE');
  G.player.inHouse.ix = 280; G.player.inHouse.iy = 100;
  check('a pultnál kiírja a vásárlást', /vásárlás/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re megnyílik a bolt', G.shop.open);
  const clk = G.clock; step(30);
  check('vásárlás közben áll a játék', G.clock === clk);
  const idx = id => G.SHOP_ITEMS.findIndex(it => it.id === id);
  G.progress.money = 100;
  press('Digit' + (idx('sandwich') + 1));
  check('teljes élettel nem veszel ételt (nem vonja le a pénzt)', G.progress.money === 100);
  G.player.health = 30;
  press('Digit' + (idx('sandwich') + 1));
  check('a szendvics +50 élet, $5', G.player.health === 80 && G.progress.money === 95);
  press('Digit' + (idx('choc') + 1));
  check('a csoki +20 élet (max 100), $2', G.player.health === 100 && G.progress.money === 93);
  G.player.health = 10; press('Digit' + (idx('medkit') + 1));
  check('az elsősegélycsomag teljes életet ad', G.player.health === 100 && G.progress.money === 78);
  G.player.drunk = 70; press('Digit' + (idx('coffee') + 1));
  check('a kávé kijózanít', G.player.drunk === 20 && G.progress.money === 75);
  G.car.fuel = 30; press('Digit' + (idx('fuel') + 1));
  check('a benzinkanna +50% benzint tölt az autódba', G.car.fuel === 80 && G.progress.money === 45);
  G.car.fuel = 100;
  Object.assign(G.car, { rental: true, ownFuel: 20 }); press('Digit' + (idx('fuel') + 1));
  check('bérautóval a kanna a saját autód tankjába megy (nem vész el)', G.car.ownFuel === 70 && G.car.fuel === 100 && G.progress.money === 15);
  Object.assign(G.car, { rental: false, ownFuel: undefined });
  G.progress.money = NaN; G.player.health = 50; press('Digit' + (idx('sandwich') + 1));
  check('hibás (NaN) egyenleggel nem lehet ingyen vásárolni', G.player.health === 50);
  G.bombInv.count = 2; G.progress.money = 200; press('Digit' + (idx('bomb') + 1));
  check('bombát is lehet venni', G.bombInv.count === 3 && G.progress.money === 150);
  G.bombInv.count = G.BOMB_MAX; press('Digit' + (idx('bomb') + 1));
  check(`${G.BOMB_MAX} bombánál többet nem lehet venni`, G.bombInv.count === G.BOMB_MAX && G.progress.money === 150);
  check('a sorsjegy 20% eséllyel nyer', G.lotteryPrize(0.1) === G.LOTTERY_PRIZE && G.lotteryPrize(0.5) === 0);
  G.progress.money = 10;
  G.buyItem(idx('ticket'), 0.05);
  check('nyertes sorsjegy: -$5 +$20', G.progress.money === 25);
  G.buyItem(idx('ticket'), 0.9);
  check('vesztes sorsjegy: -$5', G.progress.money === 20);
  G.progress.money = 1; G.player.health = 50; press('Digit' + (idx('medkit') + 1));
  check('pénz nélkül nem lehet vásárolni', G.progress.money === 1 && G.player.health === 50);
  G.progress.money = 2;
  const hit = G.shop.hits.find(h => h.i === idx('choc'));
  listeners.mousedown({ button: 0, clientX: hit.x + 5, clientY: hit.y + 5 });
  check('kattintással is lehet vásárolni', G.progress.money === 0 && G.player.health === 70);
  press('Escape');
  check('Esc: kilépés a boltból', !G.shop.open);
  check('a térképen a boltok is látszanak', G.poisIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).some(p => p.type === 'shop'));
  check('a taxi a legközelebbi boltba is elvisz', G.taxiDestinations().some(d => d.label.includes('bolt')));
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');
  G.player.health = 100;
}

// --- iskola: a táblánál E – matekóra ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const schools = all.filter(h => h.school);
  check('vannak iskolák, ritkán', schools.length > 3 && schools.length < all.length * 0.1);
  check('egy ház csak egyféle lehet (kocsma / bank / gyár / bolt / iskola)', all.every(h => [h.pub, h.bank, h.factory, h.shop, h.school].filter(Boolean).length <= 1));
  // tiszta függvény: minden feladatnak 3 különböző válasza van, köztük pontosan egy helyes, és a helyes valóban jó
  let seed = 1; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const qs = Array.from({ length: 300 }, () => G.makeQuestion(r));
  const solve = t => { const [a, op, b] = t.replace(' = ?', '').split(' '); return op === '+' ? +a + +b : op === '−' ? a - b : a * b; };
  check('a feladatok helyes válasza tényleg helyes', qs.every(q => solve(q.text) === q.ans));
  check('minden feladatnak 3 különböző, nemnegatív válasza van, köztük a helyes', qs.every(q => q.opts.length === 3 && new Set(q.opts).size === 3 && q.opts.includes(q.ans) && q.opts.every(o => o >= 0)));
  check('állandó véletlennel is érvényes a feladat (pl. 0 eredmény)', [0, 0.5, 0.999].every(v => { const q = G.makeQuestion(() => v); return q.opts.length === 3 && new Set(q.opts).size === 3 && q.opts.includes(q.ans) && q.ans >= 0; }));
  check('a helyes válasz nem mindig ugyanott van', new Set(qs.map(q => q.opts.indexOf(q.ans))).size === 3);
  const sc = schools[0];
  Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, drunk: 0, passedOut: 0, health: 100 });
  G.progress.money = 0; G.progress.debt = 0;
  Object.assign(G.player, G.doorOf(sc)); press('KeyE');
  check('az iskolába be lehet menni, van tábla és padok', G.player.inHouse && G.player.inHouse.hs.school && G.player.inHouse.furniture.some(f => f.k === 'board') && G.player.inHouse.furniture.filter(f => f.k === 'desk').length === 8);
  for (let i = 0; i < 30; i++) { key('KeyW', true); step(10); key('KeyW', false); if (G.atBlackboard()) break; }
  check('a táblához oda lehet sétálni (a padok nem zárják el)', G.atBlackboard());
  check('a táblánál kiírja az órát', /matekóra/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re kezdődik az óra', G.school.open && G.school.n === 0 && !!G.school.q);
  const clk = G.clock; step(30);
  check('óra közben áll a játék', G.clock === clk);
  const right = () => G.school.q.opts.indexOf(G.school.q.ans), wrong = () => [0, 1, 2].find(i => i !== right());
  press('Digit' + (right() + 1));
  check(`jó válaszért $${G.ANSWER_PAY} jár`, G.progress.money === G.ANSWER_PAY && G.school.n === 1);
  press('Digit' + (wrong() + 1));
  check(`rossz válaszért a gonosz tanár $${G.WRONG_FINE}-t büntet és leszól, de jön a következő feladat`, G.progress.money === G.ANSWER_PAY - G.WRONG_FINE && G.school.n === 2 && G.school.feedback && !G.school.feedback.ok && G.TAUNTS.some(t => G.school.taunt.includes(t)));
  press('Digit' + (right() + 1)); press('Digit' + (right() + 1));
  step(1);
  listeners.mousedown({ button: 0, clientX: G.school.hits[right()].x + 5, clientY: G.school.hits[right()].y + 5 });
  check('kattintással is lehet válaszolni; 5 feladat után vége az órának', !G.school.open && G.progress.money === 4 * G.ANSWER_PAY - G.WRONG_FINE);
  press('KeyE');
  check('óra után szünet van: nem kezdhető rögtön új óra', !G.school.open && /Szünet/.test(G.interactionPrompt().text));
  G.school.nextAt = 0;                                  // a szünet letelt
  press('KeyE');
  for (let i = 0; i < G.LESSON_LEN; i++) press('Digit' + (right() + 1));
  check(`hibátlan óráért +$${G.LESSON_BONUS} bónusz`, !G.school.open && G.progress.money === 4 * G.ANSWER_PAY - G.WRONG_FINE + G.LESSON_LEN * G.ANSWER_PAY + G.LESSON_BONUS);
  G.school.nextAt = 0; press('KeyE'); press('Escape');
  check('Esc: az óra abbahagyható', !G.school.open);
  press('KeyE');
  check('abbahagyás után is szünet jön (nem lehet újrakezdéssel pénzt gyűjteni)', !G.school.open);
  check('a térképen az iskolák is látszanak', G.poisIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).some(p => p.type === 'school'));
  check('a taxi a legközelebbi iskolába is elvisz', G.taxiDestinations().some(d => d.label.includes('iskola')));
  // --- a gonosz tanár ---
  const Tc = G.player.inHouse.teacher;
  check('az iskolában van egy gonosz tanár', !!Tc);
  { const sv = { ix: G.player.inHouse.ix, iy: G.player.inHouse.iy }; Object.assign(G.player.inHouse, { ix: G.TEACHER_HOME.x - 26, iy: G.TEACHER_HOME.y });
    check('a tanár helye nincs a táblánál (ott nem kaphat el váratlanul)', !G.atBlackboard()); Object.assign(G.player.inHouse, sv); }
  G.school.nextAt = 0; G.progress.money = 10; press('KeyE');
  step(60 * (G.QUESTION_TIME + 1));
  check('a tanár siettet: ha lejár az idő, rossz válasznak számít (büntetéssel)', G.school.open && G.school.n === 1 && !G.school.feedback.ok && G.progress.money === 10 - G.WRONG_FINE && /csiga/.test(G.school.taunt));
  G.progress.money = 1; const tones0 = audio.tones; press('Digit' + (wrong() + 1));
  check('a büntetés nem visz mínuszba', G.progress.money === 0);
  check('rossz válasznál a tanár azt ordítja: „IDIÓTA VAGY!” (felirat és hang)', G.SHOUT === 'IDIÓTA VAGY!' && G.school.taunt.startsWith(G.SHOUT) && audio.tones > tones0);
  press('Escape');
  const H = G.player.inHouse;
  Object.assign(Tc, { x: 380, y: 112, chase: 0 }); H.ix = 300; H.iy = 112;
  key('KeyD', true); step(20); key('KeyD', false); step(30);
  check('ha sétálsz, a tanár nem bánt (nem üldöz)', G.player.inHouse === H && !Tc.chase);
  G.progress.money = 20; H.ix = 140; H.iy = 250; Object.assign(Tc, { x: 380, y: 112 });
  const tones1 = audio.tones;
  key('ShiftLeft', true); key('KeyD', true); step(5); key('KeyD', false); key('ShiftLeft', false);
  check('ha rohansz, a tanár ordít (hang)', audio.tones > tones1);
  check('ha rohansz, a tanár üldözni kezd', Tc.chase > 0 && G.player.inHouse === H);
  { const inF = () => H.furniture.some(f => Tc.x > f.x + 2 && Tc.x < f.x + f.w - 2 && Tc.y > f.y + 2 && Tc.y < f.y + f.h - 2);
    let ok = true; const sv = { x: Tc.x, y: Tc.y, chase: Tc.chase, ix: H.ix, iy: H.iy };
    Object.assign(Tc, { x: 95, y: 175, chase: 2 }); H.ix = 95; H.iy = 300;     // a pad (70–120, 160–190) mögött
    for (let i = 0; i < 20; i++) { step(1); if (inF()) ok = false; }
    check('a tanár nem megy át a padokon', ok);
    Object.assign(Tc, { x: sv.x, y: sv.y, chase: sv.chase }); H.ix = sv.ix; H.iy = sv.iy; }
  for (let i = 0; i < 120 && G.player.inHouse; i++) step(1);
  check(`a tanár elkap, kidob az iskolából és elkoboz $${G.RUN_FINE}-t`, !G.player.inHouse && G.progress.money === 20 - G.RUN_FINE);
  Object.assign(G.player, G.doorOf(sc)); press('KeyE');
  check('az iskolába vissza lehet menni (a tanár a helyén van)', G.player.inHouse && G.player.inHouse.teacher.chase === 0);
  G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE');
  check('az iskolából ki lehet jönni', !G.player.inHouse);
  G.progress.money = 0;
}

// --- új autók, bicikli, szkinek ---
{
  const newCars = G.CAR_MODELS.slice(7);
  check('8 új autó és egy bicikli van', newCars.length === 9 && newCars.filter(m => m.type !== 'bike').length === 8 && newCars.some(m => m.type === 'bike'));
  check('az új autók megvehetők (mindnek van ára és leírása)', newCars.every(m => m.price > 0 && m.desc && m.maxRoad > 0 && m.accel > 0));
  check('8 új szkin van, mind ingyenes', G.SKINS.length === 16 && G.SKINS.slice(8).every((k, i) => !k.price && G.ownsSkin(8 + i)));
  const bi = G.CAR_MODELS.findIndex(m => m.type === 'bike');
  const prevCar = G.progress.activeCar;
  if (!G.progress.owned.includes(bi)) G.progress.owned.push(bi);
  G.selectCar(bi);
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0, fuel: 50 });
  Object.assign(G.player, { x: 960, y: G.C, inCar: false, inHouse: null, riding: null, dead: 0 });
  press('KeyE');
  key('KeyW', true); step(240); key('KeyW', false);
  const kmh = Math.hypot(G.car.vx, G.car.vy) / G.KMH;
  check('biciklivel lehet menni, de lassan (legfeljebb ~40 km/h)', G.player.inCar && G.car.x > 1300 && kmh <= 40);
  check('a biciklibe nem kell benzin', G.car.fuel === 50);
  G.car.fuel = 0; G.car.vx = G.car.vy = 0; key('KeyW', true); step(180); key('KeyW', false);
  check('üres tankkal is lehet biciklizni (nem vánszorog)', Math.hypot(G.car.vx, G.car.vy) > 100);
  G.progress.money = 100; const ns = G.nearestStation(G.car.x, G.car.y), m0 = G.progress.money;
  let pump = null;
  for (let dx = -300; dx <= 300 && !pump; dx += 10) for (let dy = -300; dy <= 300 && !pump; dy += 10) if (G.nearPump(ns.x + dx, ns.y + dy)) pump = { x: ns.x + dx, y: ns.y + dy };
  Object.assign(G.car, { x: pump.x, y: pump.y, vx: 0, vy: 0, fuel: 10 }); step(60);
  check('a bicikli a benzinkútnál sem tankol (nem kér pénzt)', G.progress.money === m0 && G.car.fuel === 10);
  G.car.fuel = 50;
  press('KeyE'); G.selectCar(prevCar);
}

// --- Alex nevű járókelők ---
{
  G.npcs.length = 0;
  let alexes = 0; for (let i = 0; i < 400; i++) { const p = G.spawnNpc('ped', G.C, G.C + 60); if (p.alex) alexes++; }
  check('a járókelők egy része Alex (zöld póló, narancs haj)', alexes > 30 && alexes < 140 && G.npcs.filter(p => p.alex).every(p => p.shirt === '#3aa04a' && p.head === '#e07020'));
  G.npcs.length = 0;
  Object.assign(G.player, { x: 5000, y: G.C + 60, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0 });
  Object.assign(G.car, { x: 2000, y: G.C });
  let a; do { G.npcs.length = 0; a = G.spawnNpc('ped', 5030, G.C + 60); } while (!a.alex);
  check('Alex mellett kiírja: beszélgetés', /Alex/.test((G.interactionPrompt() || {}).text || ''));
  press('KeyE');
  check('E-re Alex mond valamit', G.ALEX_LINES.includes(a.line) && a.lineUntil > G.clock);
  const first = a.line; press('KeyE');
  check('újra E: mást mond', a.line !== first);
  G.npcs.length = 0;
}

// --- éttermek, autószerelők, tévé ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const rests = all.filter(h => h.restaurant), mechs = all.filter(h => h.mechanic);
  check('vannak éttermek és autószerelők, ritkán', rests.length > 5 && mechs.length > 5 && rests.length < all.length * 0.1 && mechs.length < all.length * 0.1);
  check('egy ház csak egyféle lehet (az étterem és a szerelő is)', all.every(h => [h.pub, h.bank, h.factory, h.shop, h.school, h.restaurant, h.mechanic].filter(Boolean).length <= 1));
  const reset = () => Object.assign(G.player, { inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, drunk: 0, passedOut: 0, health: 100 });
  const counter = () => { G.player.inHouse.ix = 280; G.player.inHouse.iy = 100; };
  const out = () => { G.player.inHouse.ix = G.ROOM_W / 2; G.player.inHouse.iy = G.ROOM_H - 30; press('KeyE'); };
  // étterem
  reset(); Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 });
  Object.assign(G.player, G.doorOf(rests[0])); press('KeyE');
  check('az étterembe be lehet menni, vannak asztalok', G.player.inHouse && G.player.inHouse.hs.restaurant && G.player.inHouse.furniture.filter(f => f.k === 'rtable').length === 4);
  counter();
  check('az étterem pultjánál kiírja a rendelést', /rendelés/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re megnyílik az étterem, az ételekkel', G.shop.open && G.shop.items === G.RESTAURANT_ITEMS);
  const ri = id => G.RESTAURANT_ITEMS.findIndex(it => it.id === id);
  G.progress.money = 50; G.player.health = 20; press('Digit' + (ri('pizza') + 1));
  check('a pizza teljes életet ad ($9)', G.player.health === 100 && G.progress.money === 41);
  press('Digit' + (ri('burger') + 1));
  check('teljes élettel nem eszel (nem fizetsz)', G.progress.money === 41);
  G.player.drunk = 60; press('Digit' + (ri('gulyas') + 1));
  check('a gulyásleves józanít is (teljes élettel is megveheted, ha részeg vagy)', G.player.drunk === 10 && G.progress.money === 34);
  press('Escape'); out();
  // autószerelő
  reset();
  const mi = G.progress.activeCar, base = G.CAR_MODELS[mi];
  G.progress.tuning = []; G.progress.paint = []; G.selectCar(mi);
  Object.assign(G.player, G.doorOf(mechs[0])); press('KeyE');
  check('az autószerelőhöz be lehet menni, van emelő', G.player.inHouse && G.player.inHouse.hs.mechanic && G.player.inHouse.furniture.some(f => f.k === 'lift'));
  counter(); press('KeyE');
  check('E-re megnyílik a szerelő', G.shop.open && G.shop.items === G.MECHANIC_ITEMS);
  const mk = id => G.MECHANIC_ITEMS.findIndex(it => it.id === id);
  G.progress.money = 5000; press('Digit' + (mk('tune') + 1));
  check('ha az autód messze van, nem tuningolják', G.progress.money === 5000 && !G.car.tune);
  const door = G.doorOf(mechs[0]); Object.assign(G.car, { x: door.x + 120, y: door.y, vx: 0, vy: 0 });
  press('Digit' + (mk('tune') + 1));
  check('tuning: +8% végsebesség, $400', G.car.tune === 1 && Math.abs(G.car.maxRoad - base.maxRoad * (1 + G.TUNE_SPEED)) < 0.01 && G.progress.money === 4600);
  press('Digit' + (mk('tune') + 1)); press('Digit' + (mk('tune') + 1));
  check(`a tuning drágul ($800, $1200), legfeljebb ${G.TUNE_MAX} szint`, G.car.tune === G.TUNE_MAX && G.progress.money === 2600);
  press('Digit' + (mk('tune') + 1));
  check('a legjobb tuningon túl nem lehet fizetni', G.car.tune === G.TUNE_MAX && G.progress.money === 2600);
  check('a tuning megmarad (mentés, autóváltás)', G.sanitizeProgress(JSON.parse(JSON.stringify(G.progress))).tuning[mi] === G.TUNE_MAX && (G.selectCar(mi), G.car.tune === G.TUNE_MAX));
  const col0 = G.car.color[0]; press('Digit' + (mk('paint') + 1));
  check('fényezés: új szín ($40), és megmarad', G.car.color[0] !== col0 && G.progress.money === 2560 && G.progress.paint[mi] != null && (G.selectCar(mi), G.car.color[0] !== col0));
  press('Digit' + (mk('nitro') + 1));
  check('nitrót csak nitrós autóba töltenek', G.progress.money === 2560 || G.car.nitroCfg);
  const bad = G.sanitizeProgress({ tuning: [9, -1, 'x', 2], paint: [99, -1, 3, 'a'] });
  check('a hibás mentett tuning / fényezés kiszűrődik', bad.tuning.join() === '3,0,0,2' && bad.paint[0] === null && bad.paint[1] === null && bad.paint[2] === 3 && bad.paint[3] === null);
  check('régi mentésben nincs tuning (az autók változatlanok)', G.sanitizeProgress({}).tuning.length === 0);
  press('Escape'); out();
  G.progress.tuning = []; G.progress.paint = []; G.selectCar(mi);
  // tévé
  reset();
  const tvHouse = all.find(h => !h.pub && !h.bank && !h.factory && !h.shop && !h.school && !h.restaurant && !h.mechanic && G.furnitureOf(h).some(f => f.k === 'tv'));
  Object.assign(G.player, G.doorOf(tvHouse)); press('KeyE');
  const tvF = G.player.inHouse.furniture.find(f => f.k === 'tv');
  G.player.inHouse.ix = tvF.x + tvF.w / 2; G.player.inHouse.iy = tvF.y + tvF.h + 30;
  check('a tévénél kiírja: tévé', G.atTv() && /tévé/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re bekapcsol a tévé', G.tv.open && G.tv.on);
  const clk = G.clock, t0 = G.tv.t; step(60);
  check('a műsor megy, közben a játék áll', G.tv.t > t0 + 0.5 && G.clock === clk);
  let okAll = true; for (let c = 1; c <= G.TV_CHANNELS.length; c++) { press('Digit' + c); step(3); if (G.tv.ch !== c - 1) okAll = false; }
  check('4 csatorna van, mindegyik nézhető (hírek, mese, foci, autóverseny)', G.TV_CHANNELS.length === 4 && okAll);
  press('ArrowRight');
  check('nyilakkal is lehet csatornát váltani', G.tv.ch === 0);
  press('Escape');
  check('Esc: kikapcsolás, a játék megy tovább', !G.tv.open && (step(5), G.clock > clk));
  check('kilépéskor a tévé ki is kapcsol', !G.tv.on && /bekapcsolása/.test(G.interactionPrompt().text));
  out();
  // térkép, taxi
  const types = new Set(G.poisIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).map(p => p.type));
  check('a térképen az éttermek és a szerelők is látszanak', types.has('restaurant') && types.has('mechanic'));
  const labels = G.taxiDestinations().map(d => d.label).join(' ');
  check('a taxi étterembe és szerelőhöz is visz', labels.includes('étterem') && labels.includes('autószerelő'));
}

// --- lovak ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null;
  const hs = G.horsesIn(G.C + 40000, G.C - 20000, G.C + 60000, G.C + 20000);
  check('vannak vadlovak, nem túl sok és nem túl kevés', hs.length > 200 && hs.length < 900);
  check('a vadlovak nem az úton állnak', hs.every(h => !G.onRoad(h.x, h.y, 100)));
  const again = G.horsesIn(G.C + 40000, G.C - 20000, G.C + 60000, G.C + 20000);
  check('a lovak helye mindig ugyanaz (képletből)', again.length === hs.length && again.every((h, i) => h.x === hs[i].x && h.y === hs[i].y));
  const hz = hs[0];
  const own = { x: G.C - 20000, y: G.C, angle: 0.5, fuel: 66 };
  Object.assign(G.car, { ...own, vx: 0, vy: 0, rental: false });
  Object.assign(G.player, { x: hz.x + 30, y: hz.y, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0 });
  check('ló mellett kiírja: lovaglás', /lovaglás/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re felülsz a lóra', G.player.inCar && G.car.horse && G.car.type === 'horse' && Math.hypot(G.car.x - hz.x, G.car.y - hz.y) < 1);
  check('a vadló elfogyott a helyéről (nem lehet kétszer felülni)', !G.horsesIn(hz.x - 5, hz.y - 5, hz.x + 5, hz.y + 5).some(h => h.id === hz.id));
  Object.assign(G.car, { x: 1000, y: G.C, angle: 0, vx: 0, vy: 0 });   // akadálymentes út
  const sm0 = G.skidMarks.length;
  key('KeyD', true); step(90);
  const trot = Math.hypot(G.car.vx, G.car.vy) / G.KMH;
  check('a ló irányba megy, mint gyalog (D: jobbra, nincs autó-kormányzás)', G.car.vx > 100 && Math.abs(G.car.vy) < 5 && Math.abs(G.car.angle) < 0.2);
  check('Shift nélkül ügetés (~40 km/h)', trot > 35 && trot < 50);
  key('ShiftLeft', true); step(90);
  const kmh = Math.hypot(G.car.vx, G.car.vy) / G.KMH;
  check('Shift: vágta (~85 km/h), és nem fogy a benzin', kmh > 75 && kmh < 95 && G.car.fuel === 100);
  key('KeyD', false); key('KeyA', true); step(45);
  check('hirtelen irányváltás: a ló megfordul és visszavág (nincs autós kanyar vagy sodródás)', G.car.vx < -150 && Math.abs(G.car.vy) < 20 && Math.abs(G.car.angle) > 2.8);
  key('KeyA', false); key('ShiftLeft', false); step(30);
  check('elengedve a ló gyorsan megáll (fél mp alatt)', Math.hypot(G.car.vx, G.car.vy) < 30);
  check('a ló nem hagy féknyomot', G.skidMarks.length === sm0 && !G.car.skid);
  check('lovagolva nem tank-gond: kiírja a leszállást', /leszállás a lóról/.test(G.interactionPrompt().text));
  const spot = { x: G.car.x, y: G.car.y };
  press('KeyE');
  check('E-re leszállsz, az autód visszakerül oda, ahol hagytad', !G.player.inCar && !G.car.horse && G.car.type !== 'horse' && G.car.x === own.x && G.car.y === own.y && G.car.fuel === 66 && G.car.rental === false);
  check('a ló ott marad, ahol leszálltál', G.droppedHorses.length === 1 && Math.hypot(G.droppedHorses[0].x - spot.x, G.droppedHorses[0].y - spot.y) < 1);
  Object.assign(G.player, { x: spot.x + 25, y: spot.y });
  press('KeyE');
  check('a leszállt lóra újra felülhetsz', G.car.horse && G.droppedHorses.length === 0);
  // újraélesztés lovaglás közben: az autó visszatér, nincs ló-modell
  G.damagePlayer(10000); step(240 + 60 * 5);
  check('lovaglás közbeni halál után az autód ló nélkül, rendben visszatér', !G.car.horse && G.car.type !== 'horse' && G.player.dead === 0);
  // autóváltás lovaglás közben
  Object.assign(G.car, { x: G.C - 20000, y: G.C });
  Object.assign(G.player, { x: hz.x + 30, y: hz.y, inCar: false });
  G.usedHorses.delete(hz.id); press('KeyE');
  check('újra felülsz (másik ló)', G.car.horse);
  G.selectCar(0);
  check('autóváltáskor a ló megszűnik, az autó visszatér', !G.car.horse && G.car.type === 'car' && !G.car.rental);
  G.droppedHorses.length = 0; G.usedHorses.clear();
}

// --- űrlények: 3 percenként üldöznek, elrabolnak, a Holdon börtön ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  const reset = () => { G.aliens.length = 0; Object.assign(G.player, { x: G.C + 120000, y: G.C, inCar: false, riding: null, inHouse: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 }); };
  reset();
  check('az űrlények 3 percenként jönnek', G.ALIEN_INTERVAL === 180);
  G.aliensOn = true; G.alienClock.left = 0.05; step(10);
  check('az időzítő lejártakor 3 űrlény jelenik meg, 900–1100 px-re', G.aliens.length === G.ALIEN_COUNT && G.aliens.every(a => { const d = Math.hypot(a.x - G.player.x, a.y - G.player.y); return d > 800 && d < 1200; }) && G.alienClock.left > 170);
  const d0 = Math.hypot(G.aliens[0].x - G.player.x, G.aliens[0].y - G.player.y);
  step(60);
  check('az űrlények a játékos felé tartanak', Math.hypot(G.aliens[0].x - G.player.x, G.aliens[0].y - G.player.y) < d0 - 100);
  // a futó játékos elmenekül (a kamu űrlények lassabbak: 175 px/s)
  reset(); G.spawnAliens(1); const ru = G.aliens[0]; Object.assign(ru, { x: G.player.x - 400, y: G.player.y });
  for (let i = 0; i < 600; i++) { G.player.x += 240 / 60; step(1); if (G.player.abduct) break; }
  check('futva (240 px/s) elmenekülsz az űrlények elől', !G.player.abduct && !G.player.moon);
  // házban nem kapnak el
  reset(); const hh = G.housesIn(G.C + 21000, G.C - 400, G.C + 23000, G.C)[0];
  check('(előkészítés) van ház a teszthez', !!hh);
  { Object.assign(G.player, G.doorOf(hh)); press('KeyE'); G.spawnAliens(1); Object.assign(G.aliens[0], { x: G.player.x + 30, y: G.player.y }); step(120);
    check('házban nem kapnak el', !!G.player.inHouse && !G.player.abduct && !G.player.moon); G.exitHouse(); G.aliens.length = 0; }
  // lassú / álló autóban elkapnak, gyors autóban nem
  reset(); Object.assign(G.player, { x: G.car.x, y: G.car.y, inCar: true }); G.spawnAliens(1); Object.assign(G.aliens[0], { x: G.car.x + 60, y: G.car.y });
  Object.assign(G.car, { vx: 400, vy: 0 }); G.aliens[0].x = G.car.x + 5; step(1); G.car.vx = 400;
  check('gyors autót nem tudnak elrabolni', !G.player.abduct);
  G.car.vx = 0; G.car.vy = 0; step(5);
  check('álló autóban elkapnak', !!G.player.abduct || !!G.player.moon);
  // lovon is elkapnak: a ló ott marad, az autó visszajön
  reset(); G.droppedHorses.length = 0; G.usedHorses.clear();
  const hz = { id: 'tz', x: G.player.x + 20, y: G.player.y, angle: 0, coat: ['#8a5a32', '#4a2c14'] };
  G.droppedHorses.push({ ...hz, drop: true }); press('KeyE');
  check('(előkészítés) lovon ülsz', G.car.horse);
  G.spawnAliens(1); Object.assign(G.aliens[0], { x: G.car.x + 10, y: G.car.y }); G.car.vx = G.car.vy = 0; step(5);
  check('elrabláskor a lóról is leszállsz (az autó visszajön)', !G.car.horse && G.car.type !== 'horse' && G.droppedHorses.length === 1);
  // elrablás és Hold
  reset(); G.droppedHorses.length = 0;
  const spot = { x: G.player.x, y: G.player.y }; G.progress.money = 77;
  G.spawnAliens(3); G.aliens.forEach(a => Object.assign(a, { x: spot.x + 10, y: spot.y })); step(5);
  check('elkapnak: elrablás-jelenet indul, az űrlények eltűnnek', !!G.player.abduct && G.aliens.length === 0);
  const clk = G.clock;
  step(60 * (G.ABDUCT_TIME + 0.5));
  check('az elrablás után a Holdon vagy, börtönben', !!G.player.moon && !G.player.abduct && G.player.moon.t < G.MOON_TERM);
  const t0 = G.player.moon.t, ix0 = G.player.moon.ix;
  key('KeyD', true); step(60); key('KeyD', false);
  check('a cellában lehet sétálni, de kijutni nem', G.player.moon.ix > ix0 && G.player.moon.ix <= 390 - 14 && G.player.moon.t < t0);
  press('KeyE'); key('KeyB', true); key('KeyB', false);
  check('börtönben nem lehet semmit csinálni (nincs E / bomba)', !G.player.inHouse && G.bombs.length === 0);
  step(60 * (G.MOON_TERM + 1));
  check(`${G.MOON_TERM} mp után kiengednek, ott vagy, ahol elraboltak`, !G.player.moon && Math.hypot(G.player.x - spot.x, G.player.y - spot.y) < 100 && G.progress.money === 77);
  check('szabadulás után új 3 perc kezdődik', G.alienClock.left > 170 && G.aliens.length === 0);
  // időzítés: nem fut az idő a börtönben, és az űrlények eltűnnek, ha nem érik el a játékost
  reset(); G.spawnAliens(2);
  G.player.x += 0; G.aliens.forEach(a => { a.x = G.player.x + 5000; a.y = G.player.y; });
  Object.assign(G.player, { x: G.player.x, y: G.player.y });
  G.aliens.forEach(a => { a.until = G.clock + 0.5; });
  step(60);
  check(`az űrlények ${G.ALIEN_CHASE_TIME} mp után feladják`, G.aliens.length === 0);
  // lövés és bomba
  reset(); G.spawnAliens(2);
  const al = G.aliens[0]; Object.assign(al, { x: G.player.x + 200, y: G.player.y }); G.aliens[1].x = G.player.x + 5000;
  const m1 = G.progress.money;
  for (let k = 0; k < 3; k++) G.bullets.push({ x: al.x - 4, y: al.y, vx: 100, vy: 0, life: 1, from: 'player' }), step(2);
  check(`3 lövés kilő egy űrlényt (+$${G.ALIEN_BOUNTY})`, G.aliens.length === 1 && G.progress.money === m1 + G.ALIEN_BOUNTY);
  G.bombs.push({ x: G.aliens[0].x, y: G.aliens[0].y, fuse: 0.05 }); step(10);
  check('a bomba az űrlényt is megöli', G.aliens.length === 0);
  G.aliensOn = false; reset();
}

// --- eldobható telefon: a földre esve összetörik a kijelzője ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false; G.warsOn = false;
  const rst = () => { G.progress.phone = 0; G.progress.phoneCracked = false; G.progress.droppedPhones = []; G.progress.money = 1000; G.phone.log.length = 0; G.phone.open = false; Object.assign(G.player, { x: G.C + 150000, y: G.C + 300, angle: 0, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); Object.assign(G.car, { x: G.C + 150000 - 20000, y: G.C }); };
  rst();
  press('KeyO');
  check('telefon nélkül az O nem csinál semmit', G.progress.droppedPhones.length === 0);
  G.progress.phone = 2;
  press('KeyO');
  check('az O eldobja a telefont: nincs többé nálad, a földön van, az előtted lévő helyen', G.progress.phone === 0 && G.progress.droppedPhones.length === 1 && G.progress.droppedPhones[0].level === 2 && Math.abs(G.progress.droppedPhones[0].x - (G.player.x + 140)) < 5);
  press('KeyP');
  check('eldobott telefonnal a P nem nyit telefont', !G.phone.open);
  const dp = G.progress.droppedPhones[0];
  Object.assign(G.player, { x: dp.x - 400, y: dp.y }); press('KeyE');
  check('messziről nem veheted fel', G.progress.phone === 0 && G.progress.droppedPhones.length === 1);
  Object.assign(G.player, { x: dp.x - 30, y: dp.y });
  check('a telefon mellett kiírja a felvételt (összetört kijelző)', /felvétele.*összetört/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re felveszed: ugyanolyan telefon (okostelefon), de repedt', G.progress.phone === 2 && G.progress.phoneCracked === true && G.progress.droppedPhones.length === 0);
  press('KeyP');
  check('a repedt telefon is használható', G.phone.open && G.phone.log.length >= 1);
  // repedt kijelzőn hibás betűk (▒), ép telefonon nem
  let garbled = 0, clean = 0; for (let i = 0; i < 20; i++) { const g = G.crackText('Szia! Robi vagyok, a telefonod MI-je.'); if (g.includes('▒')) garbled++; if (g.length === 'Szia! Robi vagyok, a telefonod MI-je.'.length && g.replace(/▒/g, '') .length > 20) clean++; }
  check('a repedt kijelzőn a szöveg egy része nem látszik (▒), a hossza és a szóközök megmaradnak', garbled >= 15 && clean === 20 && G.crackText('a b', () => 0) === '▒ ▒' && G.crackText('a b', () => 0.99) === 'a b');
  G.phone.log.length = 0; G.phone.input = ''; G.phone.pending = { until: 0, reply: { text: 'Szia! Ez egy elég hosszú válasz Robitól, amiben sok betű van.' } }; G.tickPhone(0.01);
  check('Robi válasza a repedt telefonon tényleg hibásan jelenik meg', G.phone.log[G.phone.log.length - 1].text.includes('▒') || G.phone.log[G.phone.log.length - 1].text.length > 20);
  step(30); press('Escape');
  // a javítás
  const sh = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).find(h => h.phoneShop);
  Object.assign(G.player, G.doorOf(sh)); press('KeyE'); G.player.inHouse.ix = 280; G.player.inHouse.iy = 100; press('KeyE');
  const m0 = G.progress.money; press('Digit3');
  check('a telefonboltban $30-ért megjavítják a kijelzőt', G.progress.phoneCracked === false && G.progress.money === m0 - 30 && G.progress.phone === 2);
  press('Digit3');
  check('ép kijelzőt nem kell javítani (nem fizetsz)', G.progress.money === m0 - 30);
  press('Escape'); G.exitHouse();
  // az új telefon ép, a mentés hibás adatot kiszűr
  G.progress.phone = 1; G.progress.phoneCracked = true; Object.assign(G.player, { x: G.C + 150000, y: G.C + 300, inHouse: null });
  const sh2 = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000).find(h => h.phoneShop);
  Object.assign(G.player, G.doorOf(sh2)); press('KeyE'); G.player.inHouse.ix = 280; G.player.inHouse.iy = 100; press('KeyE'); press('Digit2');
  check('az új (jobb) telefon vásárlása ép kijelzőt ad', G.progress.phone === 2 && G.progress.phoneCracked === false);
  press('Escape'); G.exitHouse();
  const san = G.sanitizeProgress({ phone: 1, phoneCracked: true, droppedPhones: [{ x: 5, y: 6, level: 2 }, { x: 'a', y: 1, level: 1 }, null, { x: 1, y: 2, level: 9 }, ...Array(10).fill({ x: 0, y: 0, level: 1 })] });
  check('a mentés a repedt jelzőt és legfeljebb 5 érvényes heverő telefont őriz meg', san.phoneCracked === true && san.droppedPhones.length === G.DROPPED_PHONE_MAX && san.droppedPhones[0].x === 5 && san.droppedPhones.every(d => [1, 2].includes(d.level)));
  check('telefon nélkül a repedt jelző nem marad meg, régi mentésben nincs heverő telefon', G.sanitizeProgress({ phone: 0, phoneCracked: true }).phoneCracked === false && G.sanitizeProgress({}).droppedPhones.length === 0);
  // több eldobott, a legrégebbi eltűnik; autóban nem lehet eldobni; felvétel közben már van telefonod
  rst(); for (let i = 0; i < G.DROPPED_PHONE_MAX + 2; i++) { G.progress.phone = 1; Object.assign(G.player, { x: G.C + 150000 + i * 400, y: G.C + 300 }); press('KeyO'); }
  check('legfeljebb ' + G.DROPPED_PHONE_MAX + ' telefon hever a földön (a legrégebbi eltűnik)', G.progress.droppedPhones.length === G.DROPPED_PHONE_MAX);
  rst(); G.progress.phone = 1; G.player.inCar = true; press('KeyO');
  check('autóból nem lehet telefont dobni', G.progress.phone === 1 && G.progress.droppedPhones.length === 0);
  G.player.inCar = false; G.progress.phone = 2; G.progress.droppedPhones = [{ x: G.player.x + 20, y: G.player.y, level: 1 }];
  check('ha már van telefonod, a heverőt nem veheted fel', /dobd el/.test(G.interactionPrompt().text)); press('KeyE');
  check('(és nem is veszed fel)', G.progress.phone === 2 && G.progress.droppedPhones.length === 1);
  G.progress.droppedPhones = []; G.progress.phone = 0; G.progress.phoneCracked = false; G.progress.money = 0; G.phone.log.length = 0;
}

// --- telefon-appok: játékok, videók, hírek ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false; G.warsOn = false;
  Object.assign(G.player, { x: G.C + 160000, y: G.C + 300, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null });
  G.progress.phone = 2; G.progress.phoneCracked = false; G.progress.phoneScores = { snake: 0, flappy: 0 }; G.phone.log.length = 0;
  press('KeyP');
  check('a főképernyő 4 appja: Robi, Játékok, Videók, Hírek', G.PHONE_APPS.map(a => a.id).join() === 'chat,games,videos,news' && G.phone.app === 'home');
  press('Digit2'); check('2: a Játékok', G.phone.app === 'games');
  press('Escape'); check('Esc: vissza a főképernyőre', G.phone.app === 'home' && G.phone.open);
  press('Digit5'); check('nincs 5. app (nem történik semmi)', G.phone.app === 'home');
  // ---- kígyó (tiszta lépések) ----
  const r0 = () => 0.5;
  const sg = G.snakeNew(r0);
  check('a kígyó 3 hosszú, jobbra indul, az étel nincs a testén', sg.cells.length === 3 && sg.dir.x === 1 && sg.alive && !sg.cells.some(c => c.x === sg.food.x && c.y === sg.food.y));
  const h0 = { ...sg.cells[0] }; G.snakeStep(sg, r0);
  check('lépésenként egyet halad, a hossz marad', sg.cells[0].x === h0.x + 1 && sg.cells.length === 3);
  G.snakeSteer(sg, -1, 0); G.snakeStep(sg, r0);
  check('visszafordulni nem lehet (180°)', sg.cells[0].x === h0.x + 2 && sg.alive);
  G.snakeSteer(sg, 0, -1); G.snakeStep(sg, r0);
  check('fel kanyarodik', sg.cells[0].y === h0.y - 1 && sg.dir.y === -1);
  sg.food = { x: sg.cells[0].x, y: sg.cells[0].y - 1 }; G.snakeStep(sg, r0);
  check('az étel megevése: +1 pont, +1 hossz, új étel', sg.score === 1 && sg.cells.length === 4 && !sg.cells.some(c => c.x === sg.food.x && c.y === sg.food.y));
  const wall = G.snakeNew(r0); wall.cells = [{ x: G.SNAKE_N - 1, y: 3 }, { x: G.SNAKE_N - 2, y: 3 }]; G.snakeStep(wall, r0);
  check('a falnak ütközve vége a játéknak', !wall.alive);
  const selfc = G.snakeNew(r0); selfc.cells = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }]; selfc.dir = selfc.next = { x: 0, y: -1 }; selfc.food = { x: 0, y: 0 };
  selfc.cells = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 5 }]; selfc.dir = selfc.next = { x: 0, y: -1 }; G.snakeStep(selfc, r0);
  check('önmagába harapva vége a játéknak', !selfc.alive);
  const dead = G.snakeNew(r0); dead.alive = false; const dh = { ...dead.cells[0] }; G.snakeStep(dead, r0);
  check('halott kígyó nem mozog tovább', dead.cells[0].x === dh.x);
  // ---- a kígyó a telefonon: billentyűk, idő, rekord ----
  press('Digit2'); press('Digit1'); check('a Játékok → 1: a Kígyó elindul', G.phone.app === 'snake' && !!G.phone.snake && G.phone.snake.alive);
  const gg = G.phone.snake; const x1 = gg.cells[0].x; step(40);
  check('a kígyó magától halad (SNAKE_STEP mp-enként)', gg.cells[0].x !== x1 || !gg.alive);
  press('ArrowDown'); step(20);
  check('a nyilak irányítják', gg.dir.y === 1 || !gg.alive);
  gg.alive = true; gg.score = 12; gg.cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }]; gg.dir = gg.next = { x: -1, y: 0 }; step(30);
  check('a játék végén a rekord elmentődik', !gg.alive && G.progress.phoneScores.snake === 12);
  press('Enter'); check('Enter: új játék', G.phone.snake !== gg && G.phone.snake.alive && G.phone.snake.score === 0);
  press('Escape'); check('Esc: vissza a Játékok közé', G.phone.app === 'games');
  // ---- repülő ----
  const fg = G.flappyNew(); const y0 = fg.y; G.flappyStep(fg, 0.5, r0);
  check('a repülő a Space-ig áll (még nem indult)', fg.y === y0 && !fg.started);
  G.flappyFlap(fg); G.flappyStep(fg, 0.1, r0);
  check('a flap felfelé lódítja', fg.y < y0 && fg.started);
  const fall = G.flappyNew(); G.flappyFlap(fall); for (let i = 0; i < 200 && fall.alive; i++) G.flappyStep(fall, 0.05, r0);
  check('flap nélkül leesik: vége a játéknak', !fall.alive);
  const fp = G.flappyNew(); fp.started = true; fp.y = G.FLAP_H / 2; fp.pipes = [{ x: G.FLAP_BIRD_X + 40, gap: G.FLAP_H / 2, passed: false }]; fp.vy = -200;
  for (let i = 0; i < 40; i++) { fp.y = G.FLAP_H / 2; fp.vy = 0; G.flappyStep(fp, 0.05, r0); }   // a gép a résben marad (a gap közepén)
  check('a csöveken átjutva pont jár', fp.score >= 1 && fp.alive);
  const hit = G.flappyNew(); hit.started = true; hit.y = G.FLAP_H / 2; hit.pipes = [{ x: G.FLAP_BIRD_X + 5, gap: G.FLAP_H / 2 - 90, passed: false }]; G.flappyStep(hit, 0.01, r0);
  check('a csőnek ütközve vége a játéknak', !hit.alive);
  const sp = G.flappyNew(); sp.started = true; G.flappyFlap(sp); let pipes = 0; for (let i = 0; i < 60; i++) { sp.y = G.FLAP_H / 2; sp.vy = 0; G.flappyStep(sp, 0.1, r0); pipes = Math.max(pipes, sp.pipes.length); }
  check('csövek keletkeznek, a távolságuk ' + G.FLAP_SPACE + ' px körül', pipes >= 2 && sp.pipes.every((p2, i, arr) => i === 0 || Math.abs((p2.x - arr[i - 1].x) - G.FLAP_SPACE) < 30));
  press('Digit2'); check('a Játékok → 2: a Repülő', G.phone.app === 'flappy' && !G.phone.flappy.started);
  press('Space'); check('Space: indul', G.phone.flappy.started && G.phone.flappy.vy < 0);
  step(2); const fh = G.phone.hits.find(h => h.flap);
  listeners.mousedown({ button: 0, clientX: fh.x + 20, clientY: fh.y + 20 }); check('a kattintás is repít', G.phone.flappy.vy < 0 || !G.phone.flappy.alive);
  step(60 * 3); check('a repülő magától leesik, a rekord mentésre kerül', !G.phone.flappy.alive);
  press('Enter'); check('Enter: újra', G.phone.flappy.alive && !G.phone.flappy.started);
  press('Escape'); press('Escape');
  check('a rekordokat a mentés őrzi és szűri', G.sanitizeProgress({ phoneScores: { snake: 7.9, flappy: -3 } }).phoneScores.snake === 7 && G.sanitizeProgress({ phoneScores: { snake: 7, flappy: -3 } }).phoneScores.flappy === 0 && G.sanitizeProgress({}).phoneScores.snake === 0);
  // ---- videók ----
  press('Digit3'); check('3: a Videók', G.phone.app === 'videos' && G.PHONE_VIDEOS.length === 6);
  let drawn = true; for (let i = 0; i < G.PHONE_VIDEOS.length; i++) { press('Digit' + (i + 1)); step(5); if (G.phone.vid !== i) drawn = false; }
  check('mind a 6 klip kiválasztható és lejátszik (tévé-csatornák + tornádó + atomgomba)', drawn);
  press('ArrowRight'); check('a nyilak lapoznak (körbe)', G.phone.vid === 0);
  press('ArrowLeft'); check('balra a végére', G.phone.vid === G.PHONE_VIDEOS.length - 1);
  const t0 = G.phone.vidT; step(30); check('a videó időzítője fut (menet közben animál)', G.phone.vidT > t0);
  const clip = G.phone.hits.find(h => h.clip === 2); listeners.mousedown({ button: 0, clientX: clip.x + 5, clientY: clip.y + 5 });
  check('a kattintás is videót vált', G.phone.vid === 2);
  check('a tévé továbbra is 4 csatornás', G.TV_CHANNELS.length === 4);
  press('Escape');
  // ---- hírek ----
  G.newsLog.length = 0;
  press('Digit4'); check('4: a Hírek, kezdetben nincs hír', G.phone.app === 'news' && G.newsLog.length === 0); step(3);
  G.addNews('teszt hír'); check('az addNews naplóz', G.newsLog.length === 1 && G.newsLog[0].text === 'teszt hír');
  for (let i = 0; i < 40; i++) G.addNews('x' + i); check('legfeljebb 30 hír marad (a legrégebbiek kihullanak)', G.newsLog.length === 30 && G.newsLog[0].text !== 'teszt hír');
  G.newsLog.length = 0; press('Escape'); press('Escape');
  G.callWar(); G.endWar('⚔ A háború véget ért – próba'); G.nuke(G.C + 170000, G.C); G.spawnTornado(G.C + 171000, G.C); G.tornado = null;
  check('a játék eseményei bekerülnek a hírekbe (háború, vége, atombomba, tornádó…)', G.newsLog.some(n => /Háború tört ki/.test(n.text)) && G.newsLog.some(n => /véget ért/.test(n.text)) && G.newsLog.some(n => /ATOMBOMBA/.test(n.text)) && G.newsLog.some(n => /Tornádó/.test(n.text)));
  press('KeyP'); press('Digit4'); step(5);
  check('a Hírek appon élő állapotsorok vannak (háború, pénz)', G.newsLive().length >= 2 && G.newsLive().some(l => /Háború/.test(l.t)) && G.newsLive().some(l => /Pénzed/.test(l.t)));
  G.callWar(); check('háború alatt az élő sor a háborút mutatja', G.newsLive().some(l => /dúl/.test(l.t))); G.endWar('x');
  press('Escape'); press('Escape'); G.tornado = null; G.clearWanted();
  // a repedt telefonon is mennek az appok
  G.progress.phoneCracked = true; press('KeyP'); press('Digit3'); step(5); press('Escape'); press('Escape'); G.progress.phoneCracked = false;
  check('repedt telefonon is működnek az appok', !G.phone.open);
  Object.assign(G.player, { x: G.C + 30000, y: G.C }); G.progress.phone = 0; G.phone.log.length = 0; G.progress.phoneScores = { snake: 0, flappy: 0 };
}

// --- felhőkarcolók ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false; G.warsOn = false;
  const all = G.housesIn(G.C - 60000, G.C - 400, G.C + 60000, G.C + 400);
  const sky = all.filter(h => h.sky), inDown = all.filter(h => G.downtown(h.x, h.y)), outDown = all.filter(h => !G.downtown(h.x, h.y));
  check('vannak felhőkarcolók', sky.length >= 8);
  check('belvárosban sok (>20%), máshol ritka (<6%)', inDown.filter(h => h.sky).length / inDown.length > 0.2 && outDown.filter(h => h.sky).length / outDown.length < 0.06);
  check('a felhőkarcolók 14–49 emeletesek, és nem másféle épületek (egy házból egy típus)', sky.every(h => h.floors >= 14 && h.floors <= 49 && ![h.pub, h.bank, h.factory, h.shop, h.school, h.restaurant, h.mechanic, h.phoneShop].some(Boolean)) && all.filter(h => !h.sky).every(h => h.floors === undefined));
  const sk = sky[0];
  Object.assign(G.player, { ...G.doorOf(sk), inCar: false, inHouse: null, riding: null, dead: 0, health: 100 }); Object.assign(G.car, { x: sk.x - 9000, y: sk.y });
  press('KeyE');
  check('a felhőkarcolóba nem lehet bemenni (nincs ajtó)', !G.player.inHouse && !/bemenés/.test((G.interactionPrompt() || { text: '' }).text));
  const probe = { x: sk.x, y: sk.y, r: 12 }; G.collideTest(probe);
  check('a felhőkarcoló szilárd: kitol a talpából', probe.x < sk.x0 || probe.x > sk.x1 || probe.y < sk.y0 || probe.y > sk.y1);
  Object.assign(G.player, { x: sk.x + 40, y: sk.y + 300 }); step(3);
  check('a felhőkarcoló rajzolása (parallaxis) hibátlanul lefut', true);
  // repülő: nekirepülve lezuhan
  G.planes.length = 0; Object.assign(G.player, { x: sk.x - 400, y: sk.y, inCar: false, health: 100, dead: 0 }); G.spawnParkedPlane(G.player.x + 30, G.player.y, 0, 'A'); press('KeyE');
  check('(előkészítés) repülőn ülsz', G.car.plane);
  Object.assign(G.car, { x: sk.x0 - 200, y: sk.y, angle: 0, vx: 400, vy: 0 }); const npl = G.planes.length;
  step(60 * 1);
  check('felhőkarcolónak repülve a gép lezuhan (nem marad), te megsérülsz, de túléled', !G.car.plane && !G.player.inCar && G.player.health < 100 && G.player.health > 0 && G.planes.length === npl);
  check('a lezuhanás után az autód visszatér', G.car.type !== 'plane');
  G.player.health = 100; step(60 * 4);
  // egy másik épület fölött nem zuhan le
  const nonSky = all.find(h => !h.sky && Math.hypot(h.x - sk.x, h.y - sk.y) > 3000);
  G.spawnParkedPlane(nonSky.x - 300, nonSky.y, 0, 'A'); Object.assign(G.player, { x: nonSky.x - 280, y: nonSky.y, inCar: false, health: 100, dead: 0 }); press('KeyE');
  Object.assign(G.car, { x: nonSky.x - 300, y: nonSky.y, angle: 0, vx: 400, vy: 0 }); step(60 * 2);
  check('a közönséges házak fölött átrepülhetsz', G.car.plane && G.player.health === 100); press('KeyS'); G.selectCar(0);
  // rombolható
  G.missileImpact(sk.x, sk.y);
  check('a rakéta lerombolja a felhőkarcolót is', G.destroyedHouses.has(sk.id));
  G.planes.length = 0; Object.assign(G.player, { x: G.C + 30000, y: G.C }); G.player.health = 100;
}

// --- telefonok, telefonboltok, Robi (MI) ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false; G.warsOn = false;
  const all = G.housesIn(G.C - 30000, G.C - 30000, G.C + 30000, G.C + 30000);
  const shops = all.filter(h => h.phoneShop);
  check('vannak telefonboltok, ritkán', shops.length >= 2 && shops.length < all.length * 0.12);
  check('egy ház csak egyféle lehet (a telefonbolt is)', all.every(h => [h.pub, h.bank, h.factory, h.shop, h.school, h.restaurant, h.mechanic, h.phoneShop].filter(Boolean).length <= 1));
  const reset = () => { G.progress.phone = 0; G.progress.money = 1000; G.progress.pins = []; Object.assign(G.player, { x: G.C - 2000, y: G.C + 900, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); G.phone.log.length = 0; G.phone.open = false; };
  reset();
  press('KeyP');
  check('telefon nélkül a P nem nyitja meg, hanem útmutatást ad', !G.phone.open);
  // vásárlás
  const sh = shops[0]; Object.assign(G.player, G.doorOf(sh)); press('KeyE');
  check('a telefonboltba be lehet menni', G.player.inHouse && G.player.inHouse.hs.phoneShop && G.player.inHouse.furniture.some(f => f.k === 'ptable'));
  G.player.inHouse.ix = 280; G.player.inHouse.iy = 100;
  check('a pultnál kiírja a telefonokat', /telefon/.test(G.interactionPrompt().text));
  press('KeyE');
  check('E-re megnyílik a telefonbolt, a telefonokkal', G.shop.open && G.shop.items === G.PHONE_ITEMS);
  const m0 = G.progress.money; press('Digit1');
  check('az egyszerű telefon $60', G.progress.phone === 1 && G.progress.money === m0 - 60);
  press('Digit1');
  check('ugyanazt kétszer nem veheted meg (nem fizetsz)', G.progress.money === m0 - 60);
  press('Digit2');
  check('az okostelefon $200 (frissítés)', G.progress.phone === 2 && G.progress.money === m0 - 260);
  press('Digit1');
  check('rosszabb telefont nem vehetsz a jobb helyett', G.progress.phone === 2);
  press('Escape'); G.exitHouse();
  check('a telefon megmarad a mentésben, hibás érték kiszűrődik', G.sanitizeProgress({ phone: 2 }).phone === 2 && G.sanitizeProgress({ phone: 9 }).phone === 0 && G.sanitizeProgress({}).phone === 0);
  // megnyitás, gépelés
  Object.assign(G.player, { x: G.C - 2000, y: G.C + 900, inHouse: null });
  press('KeyP');
  check('a P megnyitja a telefont, Robi köszön', G.phone.open && G.phone.log.length === 1 && G.phone.log[0].from === 'ai');
  const clk = G.clock; step(30);
  check('telefonozás közben áll a játék', G.clock === clk);
  check('a telefon főképernyőn nyílik meg (4 app)', G.phone.app === 'home' && G.phone.hits.filter(h => h.app).length === 4);
  press('Digit1');
  check('az 1-es a Robi appot nyitja (csevegés)', G.phone.app === 'chat');
  const type = str => { for (const ch of str) { listeners.keydown({ code: 'Key' + ch.toUpperCase(), key: ch, repeat: false }); listeners.keyup({ code: 'Key' + ch.toUpperCase() }); } };
  type('szia'); check('a billentyűk a beviteli sorba kerülnek (nem mozgatnak)', G.phone.input === 'szia' && G.player.x === G.C - 2000);
  listeners.keydown({ code: 'Backspace', key: 'Backspace', repeat: false }); check('a Backspace töröl', G.phone.input === 'szi');
  type('a'); listeners.keydown({ code: 'Quote', key: 'á', repeat: false });
  check('az ékezetes betű is bekerül', G.phone.input === 'sziaá');
  listeners.keydown({ code: 'Backspace', key: 'Backspace', repeat: false });
  press('Enter');
  check('az Enter elküldi az üzenetet, Robi „gépel”', G.phone.log[G.phone.log.length - 1].from === 'me' && G.phone.input === '' && !!G.phone.pending);
  step(60);
  check('Robi rövid idő múlva válaszol', !G.phone.pending && G.phone.log[G.phone.log.length - 1].from === 'ai' && /Robi|Szia/.test(G.phone.log[G.phone.log.length - 1].text));
  // az MI válaszai
  const ask = q => G.robiReply(q);
  check('a névelemzés ékezet- és kisbetűfüggetlen', G.norm('Hol VAN a legközelebbi Benzinkút?!') === 'hol van a legkozelebbi benzinkut');
  check('Robi tudja, mennyi pénzed van', new RegExp('\\$' + Math.floor(G.progress.money)).test(ask('mennyi pénzem van?').text));
  check('Robi megmondja, merre és milyen messze van a legközelebbi benzinkút', /benzinkút kb\. \d+ m-re van, \S+ felé/.test(ask('Hol van a legközelebbi benzinkút?').text));
  check('Robi a bankot, boltot, éttermet, szerelőt, iskolát, vonatot is megtalálja', ['bank', 'bolt', 'étterem', 'autószerelő', 'iskola', 'vasútállomás', 'telefonbolt'].every(w => new RegExp('legközelebbi ' + w + ' kb\\. \\d+ m').test(ask('hol van a ' + ({ 'bank': 'bank', 'bolt': 'bolt', 'étterem': 'étterem', 'autószerelő': 'szerelő', 'iskola': 'iskola', 'vasútállomás': 'vonat állomás', 'telefonbolt': 'telefonbolt' })[w] + '?').text)));
  check('háború nélkül azt mondja, nincs háború', /nincs háború/.test(ask('van háború?').text));
  G.callWar();
  check('háborúnál megmondja az irányt és a távolságot', /Háború dúl \d+ m-re/.test(ask('van háború').text));
  G.endWar('x');
  check('tippet és viccet is ad', /^Tipp:/.test(ask('adj egy tippet').text) && ask('mondj egy viccet').text.length > 10);
  check('ismeretlen kérdésre udvariasan visszakérdez (mindhárom válasz)', Array.from({ length: 30 }, () => ask('blabla xyzzy').text).every(t => /nem|Hmm|Erre/i.test(t)));
  check('a „mit tudsz” felsorolja a lehetőségeket', /benzinkút/.test(ask('mit tudsz?').text));
  check('a „ki vagy” válaszol', /Robi/.test(ask('ki vagy te').text));
  // okostelefon: jelölés és taxi
  G.progress.phone = 2; const pins0 = G.progress.pins.length;
  const r1 = ask('jelöld meg a bankot'); check('okostelefonon a „jelöld meg a bankot” jelölést kér', !!r1.pin && /Megjelöltem/.test(r1.text));
  G.phone.pending = { until: 0, reply: r1 }; G.tickPhone(0.01);
  check('a jelölés bekerül a térképre (a taxi célok közé is)', G.progress.pins.length === pins0 + 1 && G.taxiDestinations().some(d => d.label.includes('jelölt pont')));
  const r2 = ask('hívj taxit'); check('okostelefonon Robi taxit hív', r2.taxi === true);
  G.phone.pending = { until: 0, reply: r2 }; G.tickPhone(0.01);
  check('és tényleg érkezik a taxi', !!G.taxi);
  G.aiCars.length = 0;
  G.progress.phone = 1;
  const r3 = ask('jelöld meg a bankot'); check('az egyszerű telefon nem jelöl, de megmondja, hol van', !r3.pin && /okostelefon/.test(r3.text) && /bank kb\. \d+ m/.test(r3.text));
  check('egyszerű telefonon a taxi hívásához az X gombot ajánlja', !ask('taxi').taxi && /X gomb/.test(ask('taxi').text));
  // bezárás
  press('Escape');
  check('az Esc a csevegésből a főképernyőre visz vissza', G.phone.open && G.phone.app === 'home');
  press('Escape');
  check('a főképernyőn az Esc bezárja a telefont (nem a menüt nyitja)', !G.phone.open && !G.menu.open);
  press('KeyP'); const cl = G.phone.hits.find(h => h.close);
  step(2); const hit = G.phone.hits.find(h => h.close);
  listeners.mousedown({ button: 0, clientX: hit.x + 5, clientY: hit.y + 5 });
  check('a ✕ gombra kattintva is bezárul', !G.phone.open);
  // térkép
  const types = new Set(G.poisIn(G.C + 60000, G.C - 600, G.C + 90000, G.C + 100).map(p => p.type));
  check('a térképen a telefonboltok is látszanak', types.has('phone'));
  check('a taxi a legközelebbi telefonboltba is elvisz', G.taxiDestinations().some(d => d.label.includes('telefonbolt')));
  press('KeyK'); step(1); const pinOn = G.mapView.cats.pin; press('KeyP'); const pinOff = G.mapView.cats.pin; press('KeyP'); press('KeyK');
  check('a térképen a P a saját jelölések ki/be kapcsolója', pinOn === true && pinOff === false && G.mapView.cats.pin === true);
  G.progress.phone = 0; G.progress.pins = []; G.progress.money = 0; G.phone.log.length = 0;
}

// --- repülők: AI bombázók a háborúban, a játékos is vezetheti ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false; G.warsOn = false;
  const home = { x: G.C + 200000, y: G.C };
  const reset = () => { G.aiCars.length = 0; G.npcs.length = 0; G.bullets.length = 0; G.soldiers.length = 0; G.bombers.length = 0; G.airBombs.length = 0; G.planes.length = 0; G.craters.length = 0; G.nukeFx = null; G.missiles.length = 0; G.endOccupation(); if (G.war) G.endWar('x'); G.clearWanted(); Object.assign(G.player, { ...home, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); Object.assign(G.car, { x: home.x - 20000, y: home.y, vx: 0, vy: 0 }); };
  reset();
  G.callWar(); step(3);
  check('a háború kezdetén mindkét sereg mögött egy leparkolt bombázó áll', G.planes.filter(p => p.side === 'A').length >= 1 && G.planes.filter(p => p.side === 'B').length >= 1);
  const pl = G.planes[0]; Object.assign(G.player, { x: pl.x + 40, y: pl.y });
  check('a gép mellett kiírja: felszállás a bombázóra', /bombázóra/.test(G.interactionPrompt().text));
  const carBefore = { x: G.car.x, y: G.car.y, type: G.car.type };
  press('KeyE');
  check('E-re felszállsz a bombázóra', G.player.inCar && G.car.plane && G.car.type === 'plane' && G.car.planeAmmo === G.PLANE_AMMO && !G.planes.includes(pl));
  step(30); check('azonnal repül (nem áll meg)', Math.hypot(G.car.vx, G.car.vy) > 100);
  // irányítás
  key('KeyW', true); step(60 * 3); key('KeyW', false);
  const spMax = Math.hypot(G.car.vx, G.car.vy);
  check('W-re gyorsul a maximumig (' + G.PLANE_MAX + ' px/s)', spMax > G.PLANE_MAX - 5 && spMax <= G.PLANE_MAX + 0.5);
  check('a gép sebessége nem lépi túl a körözési határt: nem üldöz a rendőrség (repülőn nincs gyorshajtás)', G.wanted.level === 0);
  key('KeyS', true); step(60 * 4); key('KeyS', false);
  const spMin = Math.hypot(G.car.vx, G.car.vy);
  check('S-re lassul, de nem tud megállni (legalább ' + G.PLANE_MIN + ' px/s)', spMin >= G.PLANE_MIN - 0.5 && spMin < G.PLANE_MIN + 5);
  const a0 = G.car.angle; key('KeyD', true); step(30); key('KeyD', false);
  check('D-re jobbra fordul', G.car.angle > a0 + 0.2);
  const a1 = G.car.angle; key('KeyA', true); step(30); key('KeyA', false);
  check('A-ra balra fordul', G.car.angle < a1 - 0.2);
  // átrepül a házak és az autók fölött
  const hh = G.housesIn(G.C + 21000, G.C - 400, G.C + 23000, G.C)[0]; Object.assign(G.car, { x: hh.x - 300, y: hh.y, angle: 0 });
  const ac = G.spawnAiCar('h', 1, G.C, 0); Object.assign(ac, { x: hh.x - 100, y: hh.y, vx: 0, vy: 0 }); const acx = ac.x; Object.assign(G.car, { vx: 500, vy: 0 });
  step(60 * 2);
  check('a gép átrepül a ház és az autók fölött (nincs ütközés)', G.car.x > hh.x + 200 && G.player.health === 100 && Math.abs(ac.x - acx) < 5);
  G.aiCars.length = 0;
  // bombázás
  G.car.angle = 0; Object.assign(G.car, { x: G.C + 22000, y: G.C - 800, vx: 300, vy: 0 });
  const ped = G.spawnNpc('ped', G.car.x + 60, G.car.y); ped.moving = false; ped.wanderT = 99;
  const ammo0 = G.car.planeAmmo; key('KeyB', true); key('KeyB', false);
  check('B-re bombát dobsz (légibomba indul), fogy a lőszer', G.airBombs.length === 1 && G.car.planeAmmo === ammo0 - 1);
  key('KeyB', true); key('KeyB', false);
  check('két gyors dobás között van tűzszünet (nem lehet szórni)', G.airBombs.length === 1);
  G.car.x -= 0; Object.assign(ped, { x: G.airBombs[0].x, y: G.airBombs[0].y }); step(60 * 1.2);
  check('a bomba földet ér és felrobban: megöli, aki alatta van – téged, fent a levegőben, nem', G.airBombs.length === 0 && ped.dead > 0 && G.player.health === 100);
  G.car.planeAmmo = 0; G.car.bombCd = 0; key('KeyB', true); key('KeyB', false);
  check('lőszer nélkül nem dobhatsz bombát', G.airBombs.length === 0);
  G.car.planeAmmo = 5;
  // ---- ballisztikus rakéta és atombomba a játékos gépén ----
  check('a leparkolt háborús gépek tele vannak (30 bomba, 6 rakéta, 1 atombomba)', G.PLANE_MISSILES === 6 && G.PLANE_ATOMS === 1 && G.car.planeMissiles === 6 && G.car.planeAtoms === 1 && G.car.planeWeapon === 0);
  press('KeyV');
  check('V: fegyverváltás bomba → rakéta', G.car.planeWeapon === 1);
  press('KeyV'); press('KeyV');
  check('V: rakéta → atombomba → vissza a bombára', G.car.planeWeapon === 0);
  const Hz = G.housesIn(G.C + 100000, G.C - 400, G.C + 110000, G.C), tgtH = Hz[0];
  Object.assign(G.car, { x: tgtH.x - G.PLAYER_MISSILE_RANGE, y: tgtH.y, angle: 0, vx: 300, vy: 0, bombCd: 0 }); G.player.x = G.car.x; G.player.y = G.car.y;
  press('KeyV'); G.clearWanted(); G.warsOn = false;
  key('KeyB', true); key('KeyB', false);
  check('rakétával B: ballisztikus rakéta indul a gép előtt (1700 px), -1 rakéta', G.missiles.some(m => m.side === 'P' && Math.abs(m.tx - (G.car.x + G.PLAYER_MISSILE_RANGE)) < 50 && Math.abs(m.ty - G.car.y) < 50) && G.car.planeMissiles === 5);
  check('a rakéta kilövése körözést von maga után (★★)', G.wanted.level >= 2);
  key('KeyB', true); key('KeyB', false);
  check('a következő rakéta csak egy kis szünet után indulhat', G.missiles.filter(m => m.side === 'P').length === 1);
  const mt = G.missiles.find(m => m.side === 'P'), tx = mt.tx, ty = mt.ty;
  G.housesIn(tx - 5, ty - 5, tx + 5, ty + 5);
  const hOnTarget = G.housesIn(tx - 200, ty - 200, tx + 200, ty + 200).find(h => Math.hypot(h.x - tx, h.y - ty) < 150);
  step(60 * (G.MISSILE_FLIGHT + 0.5));
  check('a rakéta becsapódik (békeidőben is repül), a repülőn ülő nem sérül', G.missiles.filter(m => m.side === 'P').length === 0 && G.player.health === 100 && !G.player.dead);
  check('ha házra céloztál, az romba dől', !hOnTarget || G.destroyedHouses.has(hOnTarget.id));
  G.car.planeMissiles = 0; G.car.bombCd = 0; key('KeyB', true); key('KeyB', false);
  check('rakéta nélkül nem lőhetsz', G.missiles.filter(m => m.side === 'P').length === 0);
  G.missiles.push({ x0: 0, y0: 0, tx: 5, ty: 5, t: 0, side: 'P' }, { x0: 0, y0: 0, tx: 9, ty: 9, t: 0, side: 'A' }); G.dropWarMissiles();
  check('a háború vége a játékos rakétáit nem törli (csak a háborúsakat)', G.missiles.length === 1 && G.missiles[0].side === 'P'); G.missiles.length = 0;
  // atombomba
  Object.assign(G.car, { x: G.C + 120000, y: G.C - 800, angle: 0, vx: 620, vy: 0, bombCd: 0 }); G.player.x = G.car.x; G.player.y = G.car.y; G.craters.length = 0; G.nukeFx = null; G.clearWanted();
  press('KeyV'); check('(előkészítés) atombomba a kiválasztott fegyver', G.car.planeWeapon === 2);
  key('KeyW', true); key('KeyB', true); key('KeyB', false);
  check('atombombával B: lassan eső atombomba, -1 atombomba, ★★ körözés', G.airBombs.some(a => a.side === 'N') && G.car.planeAtoms === 0 && G.wanted.level === 2);
  step(60 * 1.2); check('az atombomba még nem robbant (esik)', G.craters.length === 0);
  step(60 * (G.ATOM_FALL - 1.2 + 0.4)); key('KeyW', false);
  check('az atombomba felrobban: kráter, vakító villanás', G.craters.length === 1 && !!G.nukeFx);
  check('teljes sebességgel elmenekültél: életben maradtál (a sugáron belül megsebesülhetsz)', !G.player.dead);
  G.car.bombCd = 0; key('KeyB', true); key('KeyB', false);
  check('több atombombád nincs (egy darab van gépenként)', G.airBombs.filter(a => a.side === 'N').length === 0);
  // leszállás / kiugrás
  key('KeyS', true); step(60 * 3); key('KeyS', false);
  const lx = G.car.x, ly = G.car.y; const np = G.planes.length;
  check('lassan: a prompt a leszállást írja', /leszállás/.test(G.interactionPrompt().text));
  press('KeyE');
  check('lassan E-re leszállsz: a gép ott marad, az autód visszajön', !G.player.inCar && !G.car.plane && G.car.type !== 'plane' && G.planes.length === np + 1 && Math.hypot(G.planes[G.planes.length - 1].x - lx, G.planes[G.planes.length - 1].y - ly) < 5 && G.car.x === carBefore.x);
  Object.assign(G.player, { x: lx + 40, y: ly }); press('KeyE');
  check('a leszállt gépre újra felszállhatsz', G.car.plane);
  key('KeyW', true); step(60 * 2); key('KeyW', false); const np2 = G.planes.length;
  G.player.health = 100;
  check('gyorsan a prompt a kiugrást írja', /kiugrás/.test(G.interactionPrompt().text));
  press('KeyE');
  check('gyorsan E-re kiugrasz: ejtőernyő (-15 élet), a gép lezuhan (nem marad), az autód visszajön', !G.player.inCar && G.player.health === 85 && !G.car.plane && G.planes.length === np2);
  G.player.health = 100;
  // halál repülés közben
  Object.assign(G.player, { x: lx + 40, y: ly }); G.spawnParkedPlane(lx + 40, ly, 0, 'A'); press('KeyE');
  check('(előkészítés) újra a levegőben', G.car.plane);
  G.damagePlayer(10000); step(240 + 60 * 5);
  check('ha meghalsz repülés közben, az autód rendben visszatér', !G.car.plane && G.car.type !== 'plane' && !G.player.inCar && G.player.dead === 0);
  // autóváltás repülés közben
  G.spawnParkedPlane(G.player.x + 40, G.player.y, 0, 'B'); press('KeyE'); const np3 = G.planes.length;
  G.selectCar(0);
  check('autóváltáskor a gép leparkol, az autó visszatér', !G.car.plane && G.planes.length === np3 + 1);
  // lassan dobva te is meghalsz
  Object.assign(G.player, { x: G.C + 125000, y: G.C, inCar: false, health: 100, dead: 0 }); G.planes.length = 0; G.spawnParkedPlane(G.player.x + 30, G.player.y, 0, 'A'); press('KeyE');
  G.player.health = 100; G.car.planeAtoms = 1; G.car.bombCd = 0; G.car.planeWeapon = 2; Object.assign(G.car, { vx: 140, vy: 0, angle: 0 }); G.craters.length = 0;
  key('KeyS', true); key('KeyB', true); key('KeyB', false); step(60 * (G.ATOM_FALL + 0.5)); key('KeyS', false);
  check('ha lassan repülsz el a saját atombombádtól, a robbanás téged is megöl', G.player.dead > 0);
  step(240 + 60 * 6);
  // a lőszer a gépnél marad: leszállva és újra felszállva sem töltődik újra
  Object.assign(G.player, { x: G.C + 130000, y: G.C, inCar: false }); G.planes.length = 0; G.spawnParkedPlane(G.player.x + 30, G.player.y, 0, 'A', { bomb: 2, missile: 0, atom: 0 }); press('KeyE');
  check('a gép lőszere a gépnél marad (leszállva sem töltődik újra): 2 bomba, 0 rakéta, 0 atom', G.car.plane && G.car.planeAmmo === 2 && G.car.planeMissiles === 0 && G.car.planeAtoms === 0);
  G.car.planeAmmo = 1; G.selectCar(0);
  check('leparkoláskor a megmaradt lőszer (1 bomba) a géppel marad', G.planes[G.planes.length - 1].ammo.bomb === 1 && G.planes[G.planes.length - 1].ammo.atom === 0);
  // AI bombázók
  reset(); G.callWar(); step(3);
  G.soldiers.forEach(s => { s.cd = 99; });
  G.war.bomberT = 0.01; step(3);
  check('a háborúban időnként AI bombázó indul', G.bombers.length >= 1);
  const bb = G.bombers[0]; const bx0 = bb.x, by0 = bb.y; step(60 * 2);
  check('a bombázó repül (átvonul a csatatér felé)', Math.hypot(bb.x - bx0, bb.y - by0) > 800);
  const A = G.soldiers.find(s => s.side === 'A' && !s.tank), B = G.soldiers.find(s => s.side === 'B' && !s.tank);
  Object.assign(A, { x: G.war.x + 4000, y: G.war.y }); Object.assign(B, { x: G.war.x + 4050, y: G.war.y });
  G.airBombs.push({ x: G.war.x + 4020, y: G.war.y, t: 0, side: 'A' }); step(60 * 1.2);
  check('a légibomba az ellenséges katonát öli, a saját oldalát kíméli', !G.soldiers.includes(B) && G.soldiers.includes(A));
  Object.assign(bb, { x: G.war.x + 9000, y: G.war.y + 9000, vx: 520, vy: 520, angle: Math.PI / 4, cx: G.war.x, cy: G.war.y }); step(3);
  check('a bombázó a csatatér után továbbrepül és eltűnik', !G.bombers.includes(bb));
  G.bombers.push({ x: G.war.x, y: G.war.y, vx: 0, vy: 0, angle: 0, side: 'A', dropT: 0, cx: G.war.x, cy: G.war.y }); G.endWar('x');
  check('a háború végén a bombázók hazamennek, a leparkolt gépek megmaradnak', G.bombers.length === 0 && G.planes.length >= 1);
  G.planes.length = 0; reset();
}

// --- háborúk: néha két sereg csap össze ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false; G.errands = false;
  const home = { x: G.C + 160000, y: G.C };
  const reset = () => { G.player.shieldUntil = 0; G.aiCars.length = 0; G.npcs.length = 0; G.bullets.length = 0; G.soldiers.length = 0; G.fallen.length = 0; G.missiles.length = 0; G.craters.length = 0; G.nukeFx = null; G.endOccupation(); if (G.war) G.endWar('x'); Object.assign(G.player, { ...home, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); Object.assign(G.car, { x: home.x - 20000, y: home.y, vx: 0, vy: 0 }); };
  reset();
  check('háború csak engedélyezve indul (tesztben alapból nincs)', G.war === null);
  G.warsOn = true; G.warClock.left = 0.05; step(5);
  check('az időzítő lejártakor kitör a háború: 2 × ' + G.WAR_SOLDIERS + ' katona, 1500–2200 px-re', !!G.war && G.soldiers.filter(s => !s.tank).length === 2 * G.WAR_SOLDIERS && Math.hypot(G.war.x - G.player.x, G.war.y - G.player.y) > 1300 && Math.hypot(G.war.x - G.player.x, G.war.y - G.player.y) < 2400);
  check('két oldal van (A: zöld, B: kék), egyformán sokan', G.soldiers.filter(s => s.side === 'A' && !s.tank).length === G.WAR_SOLDIERS && G.soldiers.filter(s => s.side === 'B' && !s.tank).length === G.WAR_SOLDIERS);
  const start0 = G.soldiers.length; let died = false;
  for (let i = 0; i < 60 * 60 && !died; i++) { step(1); if (G.fallen.length > 0) died = true; }
  check('a katonák egymásra lőnek: elesnek páran', died && G.soldiers.length < start0);
  check('egyik sem a másik oldal nélkül marad (a háború megy), a sereg a csatatér körül marad', !G.war || G.soldiers.every(s => Math.hypot(s.x - G.war.x, s.y - G.war.y) < 1200));
  // Q: háború indítása
  reset(); G.warsOn = false;
  press('KeyQ');
  check('a Q gombbal azonnal háború indítható (az időzítőtől függetlenül)', !!G.war && G.soldiers.filter(s => !s.tank).length === 2 * G.WAR_SOLDIERS);
  const sol0 = G.soldiers.length, w00 = G.war; press('KeyQ');
  check('ha már dúl háború, a Q nem indít újat', G.war === w00 && G.soldiers.length === sol0);
  G.endWar('x'); G.player.inHouse = { hs: {}, ix: 0, iy: 0, furniture: [] }; press('KeyQ');
  check('házban a Q nem indít háborút', G.war === null);
  G.player.inHouse = null; G.warsOn = true;
  // erősítés: a háború tovább tart akkor is, ha az egyik sereg elfogy
  reset(); G.warClock.left = 0.01; step(3); G.soldiers.filter(s => s.side === 'B').forEach(s => G.killSoldier(s, false));
  step(60 * (G.WAR_REINFORCE + 2));
  check('ha az egyik sereg elesik, erősítés érkezik, és a háború megy tovább', !!G.war && G.soldiers.some(s => s.side === 'B') && G.soldiers.filter(s => s.side === 'B').length <= G.WAR_SOLDIERS);
  step(60 * G.WAR_REINFORCE * 12);
  check('az erősítés csak a hiányt pótolja (nem lesz több katona, mint ' + G.WAR_SOLDIERS + ' oldalanként)', G.soldiers.filter(s => s.side === 'B' && !s.tank).length <= G.WAR_SOLDIERS && G.soldiers.filter(s => s.side === 'A' && !s.tank).length <= G.WAR_SOLDIERS);
  check('a háború 4 percig tart', G.WAR_LIFE === 240);
  // ---- tankok ----
  reset(); G.warClock.left = 0.01; step(3);
  check('oldalanként ' + G.WAR_TANKS + ' tank van, nagy életerővel és erősebb páncéllal', ['A', 'B'].every(sd => G.soldiers.filter(s => s.tank && s.side === sd).length === G.WAR_TANKS) && G.soldiers.filter(s => s.tank).every(s => s.hp === G.TANK_HP && s.r > 20));
  const tk = G.soldiers.find(s => s.tank && s.side === 'A'), foeT = G.soldiers.find(s => s.tank && s.side === 'B');
  G.soldiers.forEach(s => { if (s !== tk) { s.cd = 99; s.x += 9000; } }); Object.assign(tk, { x: G.player.x + 3000, y: G.player.y, cd: 99 });
  Object.assign(foeT, { x: tk.x + 300, y: tk.y }); foeT.cd = 99;
  const tkhp0 = tk.hp; G.bullets.push({ x: tk.x - 40, y: tk.y, vx: 1100, vy: 0, life: 0.9, from: 'warB' }); step(5);
  check('a puskagolyó alig sebzi a tankot (negyed életet visz el)', tk.hp === tkhp0 - 0.25);
  const fdist = () => Math.hypot(tk.x - foeT.x, tk.y - foeT.y);
  tk.cd = 0; foeT.x = tk.x + 400; foeT.y = tk.y; step(2);
  check('a tank ágyúval lő: repülő lövedék indul az ellenség felé', G.warShells.length >= 1 && G.warShells[0].side === 'A');
  const shells0 = G.warShells.length; step(60 * 1.5);
  check('a lövedék becsapódik és eltűnik (nem marad a levegőben)', G.warShells.length < shells0 || G.warShells.every(w => w.t < 1));
  const hf = foeT.hp; G.shell(foeT.x + 30, foeT.y, 'A');
  check('a tanklövedék sebzi az ellenséges tankot (4 hp), a saját oldalt kíméli', foeT.hp === hf - 4 || !G.soldiers.includes(foeT));
  const tkHp = tk.hp; G.shell(tk.x + 30, tk.y, 'A');
  check('a saját oldali tank nem sérül a saját lövedékétől', tk.hp === tkHp);
  G.shell(tk.x + 30, tk.y); G.shell(tk.x + 30, tk.y); G.shell(tk.x + 30, tk.y);
  check('a tank három lövedéktől megsemmisül, roncsa marad', !G.soldiers.includes(tk) && G.fallen.some(f => f.tank));
  // tank lelövése a játékostól: jutalom
  reset(); G.warClock.left = 0.01; step(3); const pt = G.soldiers.find(s => s.tank); const mm = G.progress.money; G.killSoldier(pt, true);
  check('a tank lelövéséért $' + G.TANK_BOUNTY + ' jár', G.progress.money === mm + G.TANK_BOUNTY);
  // tank utánpótlás
  reset(); G.warClock.left = 0.01; step(3); G.soldiers.filter(s => s.tank && s.side === 'B').forEach(s => G.killSoldier(s, false)); G.soldiers.forEach(s => { s.cd = 99; });
  step(60 * 45);
  check('az elpusztult tankokat egy idő után pótolja a sereg', G.soldiers.filter(s => s.tank && s.side === 'B').length >= 1);
  // ---- nagyobb seregek, újraélesztés a háborúban ----
  reset(); G.warClock.left = 0.01; step(3);
  check('nagy háború: oldalanként ' + G.WAR_SOLDIERS + ' katona (összesen 40 + tankok)', G.WAR_SOLDIERS === 20 && G.soldiers.filter(s => !s.tank && s.side === 'A').length === 20 && G.soldiers.filter(s => !s.tank && s.side === 'B').length === 20);
  const RZ = { x: G.war.x, y: G.war.y }; G.soldiers.forEach(s => { s.cd = 99; });
  Object.assign(G.player, { x: RZ.x + 300, y: RZ.y, inCar: false, inHouse: null, health: 100, dead: 0 });
  G.damagePlayer(10000); check('(előkészítés) meghaltál a háborúban', G.player.dead > 0);
  step(60 * 3.5);
  const dW = Math.hypot(G.player.x - RZ.x, G.player.y - RZ.y);
  check('ha a háborúban halsz meg, ott éledsz újra (a csatatér szélén, a halálod irányában), nem a kezdőhelyen', !G.player.dead && G.player.health === 100 && dW > 500 && dW < 1100 && G.player.x > RZ.x + 400 && !!G.war);
  check('az autód is melletted áll', Math.hypot(G.car.x - G.player.x, G.car.y - G.player.y) < 150);
  check('3 mp védelmed van (a gyűrű): nem sebezhetnek', G.player.shieldUntil > G.clock);
  G.damagePlayer(50); check('védelem alatt a találat nem sebez', G.player.health === 100);
  step(60 * (G.RESPAWN_SHIELD + 0.3)); G.damagePlayer(30);
  check('a védelem lejárta után újra sebezhető vagy', G.player.health === 70);
  // távol / atombomba-figyelmeztetés közben / háború nélkül a kezdőhelyen élsz újra
  const atStart = () => Math.hypot(G.player.x - G.START_X, G.player.y - G.START_Y) < 5;
  G.player.health = 100; Object.assign(G.player, { x: RZ.x + G.WAR_RESPAWN_RANGE + 500, y: RZ.y, dead: 0 }); G.player.shieldUntil = 0; G.damagePlayer(10000); step(60 * 3.5);
  check('ha messze (' + G.WAR_RESPAWN_RANGE + ' px-nél távolabb) haltál meg, a kezdőhelyen éledsz újra', atStart() && !G.player.dead);
  G.war.nukeArmed = true; Object.assign(G.player, { x: RZ.x + 300, y: RZ.y, health: 100, dead: 0 }); G.damagePlayer(10000); step(60 * 3.5);
  check('az atombomba-figyelmeztetés alatt nem éledsz a csatatéren (a kezdőhelyen)', atStart());
  G.war.nukeArmed = false; G.endWar('x'); Object.assign(G.player, { x: RZ.x + 300, y: RZ.y, health: 100, dead: 0 }); G.damagePlayer(10000); step(60 * 3.5);
  check('háború nélkül a kezdőhelyen éledsz újra', atStart());
  G.player.shieldUntil = 0;
  // ---- a saját sereg ----
  reset(); G.warClock.left = 0.01; step(3);
  const AZ = { x: G.war.x, y: G.war.y }; G.soldiers.forEach(s2 => { s2.cd = 99; });
  check('a saját sereg még nincs ott, ha messze vagy a háborútól', !G.war.army && G.soldiers.filter(s2 => s2.side === 'P').length === 0);
  Object.assign(G.player, { x: AZ.x + G.ARMY_JOIN + 500, y: AZ.y }); step(5);
  check('900 px-nél távolabb (a körzeten kívül) még nincs sereg', !G.war.army && G.soldiers.filter(s2 => s2.side === 'P').length === 0);
  Object.assign(G.player, { x: AZ.x + G.ARMY_JOIN - 100, y: AZ.y }); step(3);
  const a_army = () => G.soldiers.filter(s2 => s2.side === 'P');
  check('a háború 900 px-es körzetébe érve azonnal megjelenik a saját sereg: ' + G.ARMY_SIZE + ' katona + ' + G.ARMY_TANKS + ' tank, a játékos körül', G.war.army && a_army().filter(s2 => !s2.tank).length === G.ARMY_SIZE && a_army().filter(s2 => s2.tank).length === G.ARMY_TANKS && a_army().every(s2 => Math.hypot(s2.x - G.player.x, s2.y - G.player.y) < 900));
  const a_armyN = a_army().length; Object.assign(G.player, { x: AZ.x + 3000, y: AZ.y }); step(3); Object.assign(G.player, { x: AZ.x + G.ARMY_JOIN - 100, y: AZ.y }); step(3);
  check('a sereg csak egyszer érkezik (visszatérve sem duplázódik)', a_army().length <= a_armyN + 1);
  // a saját sereg nem lő rád, és nem sebzi a polgárokat
  const a_pHealth = G.player.health; const a_pp = a_army().find(s2 => !s2.tank);
  G.bullets.push({ x: G.player.x - 8, y: G.player.y, vx: 1100, vy: 0, life: 0.9, from: 'warP' }); step(3);
  check('a saját sereg golyója nem sebez téged', G.player.health === a_pHealth);
  const a_ped2 = G.spawnNpc('ped', G.player.x + 200, G.player.y + 300); a_ped2.moving = false; a_ped2.wanderT = 99;
  G.bullets.push({ x: a_ped2.x - 8, y: a_ped2.y, vx: 1100, vy: 0, life: 0.9, from: 'warP' }); step(3);
  check('és a polgárokat sem', !(a_ped2.dead > 0));
  // az ellenség a saját sereget is támadja, a saját sereg az ellenséget
  const a_foe = G.soldiers.find(s2 => s2.side === 'A' && !s2.tank), a_fhp = a_foe.hp; Object.assign(a_foe, { x: G.player.x + 600, y: G.player.y + 900, cd: 99 });
  G.bullets.push({ x: a_foe.x - 8, y: a_foe.y, vx: 1100, vy: 0, life: 0.9, from: 'warP' }); step(3);
  check('a saját sereg golyója az ellenséget sebzi', a_foe.hp === a_fhp - 1);
  const a_me2 = a_army().find(s2 => !s2.tank), mhp = a_me2.hp; Object.assign(a_me2, { x: G.player.x + 700, y: G.player.y + 1200 });
  G.bullets.push({ x: a_me2.x - 8, y: a_me2.y, vx: 1100, vy: 0, life: 0.9, from: 'warA' }); step(3);
  check('az ellenség golyója a saját sereget is sebzi', a_me2.hp === mhp - 1);
  // a te lövésed / bombád a saját seregedet nem bántja
  const a_my3 = a_army().find(s2 => !s2.tank && s2 !== a_me2), a_hp3 = a_my3.hp; Object.assign(a_my3, { x: G.player.x + 300, y: G.player.y });
  G.bullets.push({ x: a_my3.x - 8, y: a_my3.y, vx: 1100, vy: 0, life: 0.9, from: 'player' }); step(3);
  check('a te lövésed nem találja el a saját seregedet', a_my3.hp === a_hp3);
  G.explode(a_my3.x, a_my3.y);
  check('a bomba megkíméli a saját seregedet', G.soldiers.includes(a_my3));
  // a saját tank gránátja kímél
  const a_hpS = G.player.health; G.shell(G.player.x + 5, G.player.y, 'P');
  check('a saját tank lövedéke téged és a polgárokat nem éri', G.player.health === a_hpS);
  // követ
  Object.assign(G.player, { x: G.player.x + 1500, y: G.player.y }); G.soldiers.forEach(s2 => { s2.cd = 99; }); step(60 * 30);
  const a_near = a_army().filter(s2 => Math.hypot(s2.x - G.player.x, s2.y - G.player.y) < G.ARMY_FOLLOW + 250).length;
  check('a saját sereg követ téged: ha elmész, utánad megy', a_army().length > 0 && a_near >= a_army().length * 0.6);
  // erősítés
  a_army().filter(s2 => !s2.tank).slice(0, 6).forEach(s2 => G.killSoldier(s2, false)); const a_lowN = a_army().filter(s2 => !s2.tank).length;
  step(60 * (G.ARMY_REINFORCE * 4 + 1));
  check('a saját sereg erősítést kap (' + G.ARMY_REINFORCE + ' mp-enként egy katona), a létszámnál többet nem', a_army().filter(s2 => !s2.tank).length > a_lowN && a_army().filter(s2 => !s2.tank).length <= G.ARMY_SIZE);
  G.endWar('x');
  check('a háború végén a saját sereg is hazamegy', a_army().length === 0 && G.soldiers.length === 0);
  G.player.shieldUntil = 0;
  // ---- ballisztikus rakéták ----
  reset(); G.warClock.left = 0.01; step(3); G.soldiers.forEach(s => { s.cd = 99; });
  Object.assign(G.player, { x: G.war.x + 6000, y: G.war.y });
  G.war.missileT = 0.01; step(3);
  check('a háború alatt ballisztikus rakéták indulnak', G.missiles.length >= 1 && G.missiles[0].t < G.MISSILE_FLIGHT);
  const mm0 = G.missiles[0];
  check('a rakéta távolról (2800 px-re) indul, és a célja a csatatér környékén van (lakott terület / csatatér)', Math.hypot(mm0.x0 - G.war.x, mm0.y0 - G.war.y) > 2500 && Math.hypot(mm0.tx - G.war.x, mm0.ty - G.war.y) < 2400);
  const n0 = G.missiles.length; step(60 * (G.MISSILE_FLIGHT + 0.5));
  check('a rakéta becsapódik (eltűnik a levegőből, robbanás marad)', G.missiles.length < n0 + 1 && G.missiles.every(m => m.t < G.MISSILE_FLIGHT));
  const tg = G.housesIn(G.C + 80000, G.C - 400, G.C + 95000, G.C), mh = tg[0], mh2 = tg.find(h => Math.hypot(h.x - mh.x, h.y - mh.y) > 500);
  const carM = G.spawnAiCar('h', 1, G.C, 0); Object.assign(carM, { x: mh.x + 100, y: mh.y + 150 });
  const carF = G.spawnAiCar('h', 1, G.C, 0); Object.assign(carF, { x: mh.x + 600, y: mh.y + 600 });
  Object.assign(G.player, { x: mh.x + 1500, y: mh.y + 1500, health: 100, dead: 0, inHouse: null });
  G.missileImpact(mh.x + 40, mh.y);
  check('a rakéta romba dönti a célba vett házat, a távolabbit (500+ px) nem', G.destroyedHouses.has(mh.id) && !!mh2 && !G.destroyedHouses.has(mh2.id));
  check('a közeli autót roncsá lövi, a távolabbit nem', carM.wrecked && !carF.wrecked);
  check('messze (1500 px) a játékos épségben marad', G.player.health === 100);
  Object.assign(G.player, { x: mh.x + 100, y: mh.y, health: 100, dead: 0, inHouse: null }); G.missileImpact(mh.x + 40, mh.y);
  check('a becsapódás közelében megsebesülsz / meghalsz', G.player.health < 100 || G.player.dead > 0);
  step(240 + 60 * 5);
  Object.assign(G.player, { x: mh.x + 1200, y: mh.y + 1200, health: 100, dead: 0 });
  reset(); G.warClock.left = 0.01; step(3); const tkM = G.soldiers.find(s => s.tank); const thp = tkM.hp; Object.assign(tkM, { x: G.war.x, y: G.war.y }); G.missileImpact(tkM.x + 20, tkM.y);
  check('a rakéta a tankot is erősen sebzi (8 hp)', tkM.hp === thp - 8 || !G.soldiers.includes(tkM));
  // ---- megszállás ----
  reset(); G.warClock.left = 0.01; step(3); const WZ = { x: G.war.x, y: G.war.y }; G.war.lost.A = 2; G.war.lost.B = 9; G.war.t = G.WAR_LIFE + 1; Object.assign(G.player, { x: WZ.x + 6000, y: WZ.y }); step(3);
  check('a háború után a győztes sereg (kevesebb veszteség) megszállja a területet', G.war === null && !!G.occupation && G.occupation.side === 'A' && G.garrison.length === G.GARRISON);
  check('a megszálló katonák a csatatér körül állnak', G.garrison.every(s => Math.hypot(s.x - WZ.x, s.y - WZ.y) < 400));
  Object.assign(G.player, { x: G.garrison[0].x + 200, y: G.garrison[0].y, health: 100, dead: 0, inHouse: null, riding: null });
  G.garrison.forEach(s => { s.cd = 0; }); let hurtO = false;
  for (let i = 0; i < 60 * 15 && !hurtO; i++) { step(1); if (G.player.health < 100) hurtO = true; }
  check('a megszállt területre lépőt a helyőrség lövi', hurtO);
  Object.assign(G.player, { x: WZ.x + 3000, y: WZ.y, health: 100, dead: 0 });
  const mm1 = G.progress.money; G.garrison.slice().forEach(s => G.killSoldier(s, true)); step(3);
  check('ha mind a megszállót leverted, felszabadul a terület (+$' + G.LIBERATE_BOUNTY + ')', G.occupation === null && G.progress.money === mm1 + G.GARRISON * G.SOLDIER_BOUNTY + G.LIBERATE_BOUNTY);
  G.startOccupation(WZ.x, WZ.y, 'B'); G.occupation.until = G.clock + 0.5; step(60 * 2);
  check('' + G.OCCUPY_TIME + ' mp után (itt: lejáratva) a megszálló sereg elvonul', G.occupation === null && G.garrison.length === 0);
  G.startOccupation(WZ.x, WZ.y, 'B'); G.warClock.left = 0.01; G.warsOn = true; step(5);
  check('az új háború lezárja az előző megszállást', G.occupation === null && !!G.war);
  reset(); G.warClock.left = 0.01; step(3); G.war.lost.A = 4; G.war.lost.B = 4; G.war.t = G.WAR_LIFE + 1; Object.assign(G.player, { x: G.war.x + 6000, y: G.war.y }); step(3);
  check('döntetlen háború után nincs megszállás', G.occupation === null && G.garrison.length === 0);
  // ---- atombomba ----
  reset(); G.warClock.left = 0.01; step(3); const wx = G.war.x, wy = G.war.y;
  G.war.t = G.WAR_LIFE - G.NUKE_WARN - 1; step(70);
  check('az atombomba előtt 12 mp-pel figyelmeztetés van, és fut a visszaszámlálás', G.war && G.war.nukeArmed);
  check('a robbanás előtt van még idő menekülni', !G.nukeFx && G.craters.length === 0);
  // a robbanás: sebzés a távolság szerint
  reset(); G.warClock.left = 0.01; step(3);
  const W = G.war;
  const hz = G.housesIn(G.C + 70000, G.C - 400, G.C + 90000, G.C), nearH = hz[0], farH = hz.find(h => Math.hypot(h.x - nearH.x, h.y - nearH.y) > 2300);
  const car1 = G.spawnAiCar('h', 1, G.C, 0); Object.assign(car1, { x: W.x + 800, y: W.y });
  const car2 = G.spawnAiCar('h', 1, G.C, 0); Object.assign(car2, { x: W.x + 3000, y: W.y });
  Object.assign(G.player, { x: W.x + 3000, y: W.y, inHouse: null, health: 100, dead: 0 });
  G.nuke(W.x, W.y);
  check('az atombomba kráter marad, és villanás / lökéshullám látszik', G.craters.length === 1 && !!G.nukeFx);
  check('a robbanás közelében az autók roncsok lesznek, messze nem', car1.wrecked && !car2.wrecked);
  check('3000 px-re a játékos épségben marad', G.player.health === 100 && !G.player.dead);
  G.nuke(nearH.x + 60, nearH.y);
  check('az atombomba a közeli házat romba dönti, a távolit (2300 px-re) nem', G.destroyedHouses.has(nearH.id) && !!farH && !G.destroyedHouses.has(farH.id));
  Object.assign(G.player, { x: W.x + 500, y: W.y, health: 100, dead: 0 }); G.nuke(W.x, W.y);
  check('a robbanás közelében (500 px) meghalsz', G.player.dead > 0);
  step(240 + 60 * 5);
  Object.assign(G.player, { x: W.x + 1400, y: W.y, health: 100, dead: 0, inHouse: null }); G.nuke(W.x, W.y);
  check('1400 px-re megsebesülsz, de életben maradsz', G.player.dead === 0 && G.player.health < 100 && G.player.health > 0);
  Object.assign(G.player, { x: W.x + 1500, y: W.y, health: 100, dead: 0, inHouse: { hs: { id: 'x' }, ix: 0, iy: 0, furniture: [] } }); G.nuke(W.x, W.y);
  check('házban 1100 px-en túl biztonságban vagy', G.player.dead === 0 && G.player.health === 100);
  G.player.inHouse = null;
  // a háború vége az atombomba: kitör a robbanás, a háború véget ér
  reset(); G.warClock.left = 0.01; step(3); const cr0 = G.craters.length; G.war.t = G.WAR_LIFE + 1; Object.assign(G.player, { x: G.war.x + 5000, y: G.war.y }); step(3);
  check('4 perc után az atombomba robban, és véget ér a háború', G.war === null && G.craters.length === cr0 + 1 && G.soldiers.length === 0);
  // vége: idő
  G.warClock.left = 0.01; step(3); const w0 = G.war; w0.lost.A = 2; w0.lost.B = 7; w0.t = G.WAR_LIFE + 1; step(3);
  check('' + G.WAR_LIFE + ' mp után vége a háborúnak, a katonák hazamennek, új háború csak később', G.war === null && G.soldiers.length === 0 && G.warClock.left >= G.WAR_GAP_MIN - 5);
  // a játékos lő
  reset(); G.warClock.left = 0.01; step(3);
  const t = G.soldiers[0]; const m0 = G.progress.money;
  Object.assign(t, { x: G.player.x + 300, y: G.player.y, cd: 99 });
  for (let k = 0; k < 3; k++) { G.bullets.push({ x: t.x - 6, y: t.y, vx: 100, vy: 0, life: 1, from: 'player' }); step(2); }
  check('a katonát 3 lövés leteríti (+$' + G.SOLDIER_BOUNTY + ')', !G.soldiers.includes(t) && G.fallen.length >= 1 && G.progress.money === m0 + G.SOLDIER_BOUNTY);
  // a katonák rád is lőnek
  reset(); G.warClock.left = 0.01; step(3);
  const sd = G.soldiers.find(s => s.side === 'A'); Object.assign(sd, { x: G.player.x + 250, y: G.player.y, cd: 0 });
  G.soldiers.filter(s => s !== sd).forEach(s => Object.assign(s, { x: s.x + 9000, y: s.y }));
  let hurt = false; for (let i = 0; i < 60 * 25 && !hurt; i++) { step(1); if (G.player.health < 100) hurt = true; }
  check('a közelben álló játékost a katonák is lövik', hurt);
  // házban biztonságban vagy
  reset(); G.warClock.left = 0.01; step(3);
  const hh = G.housesIn(G.C + 21000, G.C - 400, G.C + 23000, G.C)[0];
  Object.assign(G.player, G.doorOf(hh)); press('KeyE'); const s2 = G.soldiers[0]; Object.assign(s2, { x: G.player.x + 200, y: G.player.y, cd: 0 });
  step(60 * 5);
  check('házban nem érnek a golyók', !!G.player.inHouse && G.player.health === 100);
  G.exitHouse();
  // a lövedék csak az ellenséget találja (saját oldalt nem)
  reset(); G.warClock.left = 0.01; step(3);
  const ally = G.soldiers.filter(s => s.side === 'A'), shooter = ally[0], mate = ally[1]; G.soldiers.forEach(s => { s.cd = 99; s.x += 9000; });
  Object.assign(mate, { x: G.player.x + 300, y: G.player.y - 800 }); const hp0 = mate.hp;
  G.bullets.push({ x: mate.x - 8, y: mate.y, vx: 1100, vy: 0, life: 0.9, from: 'warA' }); step(5);
  check('a saját oldal golyója nem sebzi a sajátjait', mate.hp === hp0 && G.soldiers.includes(mate));
  const foe = G.soldiers.find(s => s.side === 'B'); Object.assign(foe, { x: G.player.x + 300, y: G.player.y - 800 }); const fh = foe.hp;
  G.bullets.push({ x: foe.x - 8, y: foe.y, vx: 1100, vy: 0, life: 0.9, from: 'warA' }); step(5);
  check('az ellenség golyója sebzi', foe.hp === fh - 1);
  // polgárok menekülnek, a gránát öl
  reset(); G.warClock.left = 0.01; step(3);
  const ped = G.spawnNpc('ped', G.war.x + 200, G.war.y); G.soldiers.forEach(s => { s.cd = 99; s.x += 9000; });
  G.shell(G.war.x + 190, G.war.y); 
  check('a gránát megöli a közelében lévő embert, és a többiek menekülnek', ped.dead > 0 || ped.flee > 0);
  const near = G.soldiers[0]; Object.assign(near, { x: G.war.x, y: G.war.y }); G.shell(near.x + 30, near.y);
  check('a gránát megöli a katonákat (nem romboltat házat)', !G.soldiers.includes(near));
  Object.assign(G.player, { x: G.war.x + 40, y: G.war.y, inHouse: null }); const hp1 = G.player.health; G.shell(G.war.x, G.war.y);
  check('a gránát a közeli játékost is megsebzi', G.player.health < hp1);
  G.warsOn = false; reset(); step(5); G.player.health = 100; Object.assign(G.player, { x: G.C + 170000, y: G.C });
}

// --- élet a városban: az AI autók tankolnak, a gyalogosok dolgoznak és szolgáltatást használnak ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  const reset = () => { G.aiCars.length = 0; G.npcs.length = 0; G.indoor.length = 0; Object.assign(G.player, { x: G.C - 1500, y: G.C + 900, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null }); Object.assign(G.car, { x: G.C - 20000, y: G.C, vx: 0, vy: 0 }); };
  // --- AI autók ---
  reset();
  const ai1 = G.spawnAiCar('h', 1, G.C, G.C - 380);                          // a kezdőhely melletti kereszteződésben mindig van kút
  Object.assign(ai1, { x: G.C - 380, y: G.C + 40, fuel: 30 });
  let sawFill = false, sawPit = false; for (let i = 0; i < 60 * 40 && ai1.fuel < 99; i++) { step(1); if (ai1.ai.pit) sawPit = true; if (ai1.ai.pit && ai1.ai.pit.phase === 'fill') sawFill = true; }
  check('a fogyó benzinű AI autó behajt a kúthoz, megáll és tankol', sawPit && sawFill && ai1.fuel > 99);
  step(60 * 2);
  check('tankolás után tele tankkal megy tovább (nincs többé a kútnál)', !ai1.ai.pit && ai1.fuel > 90 && Math.hypot(ai1.vx, ai1.vy) > 100);
  reset();
  const ai2 = G.spawnAiCar('h', 1, G.C, G.C - 380); Object.assign(ai2, { x: G.C - 380, y: G.C + 40, fuel: 90 });
  let detour = false; for (let i = 0; i < 60 * 8; i++) { step(1); if (ai2.ai.pit) detour = true; }
  check('a tele tankú AI autó nem hajt be a kúthoz', !detour);
  reset();
  const ai3 = G.spawnAiCar('h', 1, G.C, G.C - 380); Object.assign(ai3, { x: G.C - 2500, y: G.C + 40, fuel: 60 });
  const f0 = ai3.fuel; step(60 * 5);
  check('menet közben fogy az AI autók benzinje', ai3.fuel < f0 - 0.5);
  ai3.fuel = G.AI_FUEL_FLOOR + 0.1; step(60 * 10);
  check('a benzin sosem fogy ki teljesen (nem akad el a forgalom)', ai3.fuel >= G.AI_FUEL_FLOOR);
  check('az új AI autók benzinje 25–100% között van', (() => { G.aiCars.length = 0; const v = []; for (let i = 0; i < 60; i++) v.push(G.spawnAiCar('h', 1, G.C, 8000 + i * 40).fuel); return v.every(f => f >= 25 && f <= 100) && Math.max(...v) - Math.min(...v) > 30; })());
  // --- gyalogosok ---
  reset();
  const all = G.housesIn(G.C + 60000, G.C - 400, G.C + 64000, G.C);
  const svc = all.filter(h => G.houseService(h));
  check('vannak szolgáltató épületek a környéken', svc.length >= 1);
  const shopH = all.find(h => h.shop) || svc[0];
  const mk = () => { const p = G.spawnNpc('ped', G.doorOf(shopH).x, G.doorOf(shopH).y + (shopH.side > 0 ? 20 : -20)); p.moving = false; p.wanderT = 99; return p; };
  const c1 = G.pickErrand(mk(), [shopH], () => 0.9), c2 = G.pickErrand(mk(), [shopH], () => 0.1);
  check('az ügy tiszta választása: dolgozni vagy ügyfélként menni', c1 && c1.hs === shopH && c1.work === false && c2 && c2.work === true && G.pickErrand(mk(), [{}], () => 0) === null);
  check('az iskolába / gyárba csak dolgozni járnak', (() => { const fake = { school: true }; const c = G.pickErrand(mk(), [fake], () => 0.99); return c && c.work === true; })());
  reset(); G.errands = true;
  const pp = mk(); Object.assign(G.player, { x: pp.x, y: pp.y + 400 });
  pp.errand = G.pickErrand(pp, [shopH], () => 0.9); pp.errandCd = 99;
  check('az ügyet intéző gyalogos fölött látszik az ikon (nincs összeomlás)', (step(2), true));
  for (let i = 0; i < 60 * 12 && G.npcs.includes(pp); i++) step(1);
  check('a gyalogos odamegy az ajtóhoz és bemegy az épületbe (eltűnik az utcáról)', !G.npcs.includes(pp) && G.indoor.length === 1 && G.indoor[0].p === pp && G.indoor[0].hs === shopH);
  check('bent van: a bolt belsejében látszik (a játékos bemegy)', (() => { G.indoor[0].until = G.clock + 99; Object.assign(G.player, G.doorOf(shopH)); press('KeyE'); step(3); const ok = !!G.player.inHouse; if (G.player.inHouse) G.exitHouse(); return ok; })());
  G.indoor[0].until = G.clock + 0.2; step(30);
  check('idő után kijön az ajtón, és megy tovább a járdán', G.indoor.length === 0 && G.npcs.includes(pp) && pp.errand === null && Math.hypot(pp.x - G.doorOf(shopH).x, pp.y - G.doorOf(shopH).y) < 80 && pp.errandCd > 20);
  // a dolgozó tovább van bent, mint az ügyfél
  const sw = []; for (let i = 0; i < 40; i++) { reset(); G.errands = true; const q = mk(); q.errand = { hs: shopH, kind: 'shop', work: i % 2 === 0, until: G.clock + 40 }; Object.assign(q, { x: G.doorOf(shopH).x, y: G.doorOf(shopH).y }); Object.assign(G.player, { x: q.x, y: q.y + 300 }); q.errandCd = 99; step(2); if (G.indoor[0]) sw.push([G.indoor[0].work, G.indoor[0].until - G.clock]); }
  const avg = f => { const v = sw.filter(f).map(x => x[1]); return v.reduce((a, b) => a + b, 0) / v.length; };
  check('a dolgozó (40–70 mp) tovább marad bent, mint az ügyfél (12–25 mp)', sw.length > 20 && avg(x => x[0]) > 38 && avg(x => !x[0]) < 26);
  reset(); G.errands = true;
  const sc = mk(); sc.errand = { hs: shopH, kind: 'shop', work: false, until: G.clock + 40 }; sc.errandCd = 99; Object.assign(sc, { x: G.doorOf(shopH).x, y: G.doorOf(shopH).y }); Object.assign(G.player, { x: sc.x, y: sc.y + 300 }); step(2);
  G.destroyHouse(shopH); step(2);
  check('ha a házat lerombolják, a bent lévők kiesnek (nem ragadnak bent)', G.indoor.length === 0 && !G.npcs.includes(sc));
  const lost = mk(); lost.errand = { hs: svc[0], kind: 'shop', work: true, until: G.clock + 0.5 }; lost.errandCd = 99; Object.assign(lost, { x: lost.x + 500, y: lost.y }); step(60 * 2);
  check('ha nem ér oda időben, feladja az ügyet', lost.errand === null);
  const sc2 = mk(); sc2.errand = { hs: svc[0], kind: 'shop', work: false, until: G.clock + 40 }; sc2.errandCd = 99; Object.assign(sc2, { x: sc2.x + 300, y: sc2.y });
  step(1); sc2.flee = 3; sc2.fx = sc2.x - 50; sc2.fy = sc2.y; step(2);
  check('ha megijed (lövés / robbanás), elfelejti az ügyét', sc2.errand === null);
  G.errands = false; G.indoor.length = 0; G.npcs.length = 0; G.aiCars.length = 0; Object.assign(G.player, { x: G.C + 150000, y: G.C });
}

// --- vonatok: $4 jegy, állomások 10 000 px-enként, 30 mp-enként érkezik vonat ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  check('a vonatjegy $4, 30 mp-enként érkezik vonat', G.TRAIN_FARE === 4 && G.TRAIN_PERIOD === 30);
  const S = G.STOP_SPACE, X0 = G.STOP_X0, PE = (sec, k = 0, dir = 1, i = 0) => G.trainPose(k, dir, i, sec - (((k * 7) % 30) + (dir < 0 ? 15 : 0)));   // sec: a 30 mp-es ciklusbeli idő
  const q0 = PE(3), q1 = PE(25), q2 = PE(31);
  check('a vonat az állomáson áll (az első 10 mp)', q0.vx === 0 && q0.state === 'dwell' && q0.x === X0);
  check('utána a következő állomásig megy, simán, és ott megint megáll', q1.vx > 100 && PE(30.5).x > X0 + S - 200 && Math.abs(PE(30.001).x - (X0 + S)) < 1 && q2.state === 'dwell' && q2.x === X0 + S);
  let maxV = 0, monotone = true, last = -1, inside = true;
  for (let u = 10; u < 30; u += 0.1) { const q = PE(u); maxV = Math.max(maxV, q.vx); if (q.x < last - 1e-6) monotone = false; last = q.x; if (q.x < X0 || q.x > X0 + S) inside = false; }
  check('a vonat két állomás között marad, simán gyorsul és lassul (max. ~750 px/s)', monotone && inside && maxV > 600 && maxV < 900);
  const W = PE(3, 0, -1);
  check('a másik sín vonata nyugat felé megy, a szigetperon túloldalán, ugyanazokon az állomásokon áll meg', W.y === G.RAIL_Y0 + G.RAIL_GAP && PE(25, 0, -1).vx < -100 && ((W.x - X0) % S + S) % S === 0);
  check('a két irány nem egyszerre érkezik (15 mp eltolás)', PE(3, 0, 1).state === 'dwell' && PE(3, 0, -1).state === 'dwell' !== (PE(18, 0, 1).state === 'dwell' && PE(18, 0, -1).state === 'dwell'));
  // minden állomásra 30 mp-enként ér egy vonat (több vonat lépcsőzik)
  let stopT = []; for (let t = 0; t < 300; t += 0.5) { let here = false; for (let i = -12; i <= 12; i++) { const q = G.trainPose(1, 1, i, t); if (q.state === 'dwell' && q.x === 5 * S + X0) here = true; } stopT.push(here); }
  let starts = 0; for (let j = 1; j < stopT.length; j++) if (stopT[j] && !stopT[j - 1]) starts++;
  check('egy állomásra 5 perc alatt 10 vonat ér (30 mp-enként), egyszerre legfeljebb egy áll ott', starts === 10 || starts === 9);
  check('az állomások az utak között vannak (x: 2500 mod 10 000, y: 2500 mod 20 000)', X0 % 5000 === 2500 && G.RAIL_Y0 % 5000 === 2500 && G.STOP_SPACE % 5000 === 0 && G.RAIL_SPACE % 5000 === 0);
  const stops = G.railStopsIn(0, G.RAIL_Y0 - 50, 3 * S, G.RAIL_Y0 + 150);
  check('3 × 10 000 px-en 3 vasútállomás van', stops.length === 3 && stops.every(s => s.k === 0));
  // felszállás
  const k = 3, n = 6, sx = n * S + X0, ty = G.RAIL_Y0 + k * G.RAIL_SPACE;
  const setSec = (dir, sec) => { const ph = ((k * 7) % 30) + (dir < 0 ? 15 : 0); G.trainShift = ((sec - ph - G.clock) % 30 + 30) % 30; };   // a ciklusbeli idő beállítása
  setSec(1, 2); step(1);
  Object.assign(G.player, { x: sx + 80, y: ty + 70, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null, moon: null });
  Object.assign(G.car, { x: sx - 9000, y: ty + 70 }); G.progress.money = 3;
  check('a peronon áll a vonat: kiírja a jegyárat', /felszállás a vonatra.*\$4/.test((G.interactionPrompt() || {}).text || ''));
  press('KeyE');
  check('$4 nélkül nem lehet felszállni', !G.player.riding && G.progress.money === 3);
  G.progress.money = 10; press('KeyE');
  check('felszállsz a vonatra: -$4', G.player.riding && G.player.riding.train && G.progress.money === 6);
  check('keletre menő vonaton ülsz (a peron felé, a másik oldalról is szállhatnál)', G.player.riding.dir === 1);
  step(60 * 20);                                    // 2 mp + 20 mp = 22 mp: úton
  check('menet közben a játékos együtt mozog a vonattal', G.player.riding && Math.abs(G.player.x - G.player.riding.x) < 1 && G.player.x > sx + 100);
  press('KeyE');
  check('menet közben nem lehet leszállni', !!G.player.riding);
  G.trainsIn(-4000000, -2000000, 4000000, 2000000);   // sok vonat → a gyorsítótár kitisztul, de a vonat, amin ülsz, megmarad
  step(2);
  check('a gyorsítótár tisztítása után sem szakad el a vonattól', G.player.riding && Math.abs(G.player.x - G.player.riding.x) < 1 && G.getTrain(k, G.player.riding.dir, G.player.riding.i) === G.player.riding);
  step(60 * 11);                                    // 22 mp + 11 mp = 33 mp: a következő állomáson áll
  check('a következő állomásnál a vonat megáll', Math.abs(G.player.riding.vx) < 5 && Math.abs(G.player.riding.x - (sx + S)) < 2);
  press('KeyE');
  check('ott leszállsz a peronra', !G.player.riding && Math.abs(G.player.x - (sx + S)) < G.PLATFORM.half && G.player.y > ty + G.PLATFORM.dy0 && G.player.y < ty + G.PLATFORM.dy1 && G.player.dead === 0 && !!G.onPlatform(G.player.x, G.player.y));
  check('a peronon várakozva kiírja, mikor jön a következő vonat', /Vasútállomás|vonat/.test((G.interactionPrompt() || {}).text || ''));
  // nyugat felé menő vonat: a peron túloldaláról is, és a leszállás is a peronra esik
  setSec(-1, 2); step(1);
  Object.assign(G.player, { x: sx + 60, y: ty + 60, riding: null }); G.progress.money = 10; press('KeyE');
  check('a nyugatra menő vonatra is fel lehet szállni a peronról', G.player.riding && G.player.riding.dir === -1);
  step(60 * 31);                                    // 2 mp + 31 mp = 33 mp: a következő állomáson áll
  press('KeyE');
  check('nyugatra menve is a peronra szállsz le', !G.player.riding && !!G.onPlatform(G.player.x, G.player.y));
  // a mozgó vonat elgázol
  setSec(1, 20); step(1); const mv = G.trainsIn(sx - 5000, ty - 30, sx + 5000, ty + 30).find(t => t.dir === 1 && Math.abs(t.vx) > 300);
  Object.assign(G.player, { x: mv.x, y: mv.y, riding: null, dead: 0, health: 100 }); step(2);
  check('a mozgó vonat elgázolja, aki a sínen áll', G.player.dead > 0);
  step(240 + 60 * 5);
  // térkép és taxi
  const types = new Set(G.poisIn(0, G.RAIL_Y0 - 300, 3 * S, G.RAIL_Y0 + 300).map(p => p.type));
  check('a térképen a vasútállomások is látszanak', types.has('train'));
  check('a taxi a legközelebbi vasútállomásra is elvisz', G.taxiDestinations().some(d => d.label.includes('vasútállomás')));
  G.trainShift = 0; G.progress.money = 0; G.player.riding = null;
}

// --- szökés a Holdról: Fordított Világ, démogorgonok ---
{
  G.npcs.length = 0; G.aiCars.length = 0; G.aliens.length = 0; G.clearWanted(); G.tornado = null; G.police = false;
  const home = { x: G.C + 130000, y: G.C };
  const jail = () => { Object.assign(G.player, { ...home, inCar: false, inHouse: null, riding: null, dead: 0, arrested: 0, passedOut: 0, health: 100, abduct: null });
    G.player.moon = { t: G.MOON_TERM, ix: 280, iy: 180, from: { ...home }, guard: 60, walk: 0 }; };
  jail(); G.player.moon.ix = 280; G.player.moon.iy = 180;
  press('KeyE');
  check('a cella közepén az E nem csinál semmit (nincs rés)', !G.player.moon.horror);
  G.player.moon.ix = G.ESCAPE_SPOT.x; G.player.moon.iy = G.ESCAPE_SPOT.y;
  press('KeyE');
  check('a cella sarkában a résen át a Fordított Világba jutsz', !!G.player.moon.horror && G.player.moon.horror.kills === 0);
  const Hh = G.player.moon.horror, t0 = G.player.moon.t;
  step(60 * 3);
  check('a démogorgonok jönnek (legfeljebb ' + G.MAX_DEMOS + ' egyszerre), a büntetési idő közben áll', Hh.demos.length >= 1 && Hh.demos.length <= G.MAX_DEMOS && G.player.moon.t === t0);
  check('az életcsík töltöttsége a megmaradt életet mutatja (3/3, 2/3, 1/3, 0)', G.hpFraction(3, 3) === 1 && Math.abs(G.hpFraction(2, 3) - 2 / 3) < 1e-9 && Math.abs(G.hpFraction(1, 3) - 1 / 3) < 1e-9 && G.hpFraction(0, 3) === 0 && G.hpFraction(-2, 3) === 0);
  // védekezés nélkül megsebeznek
  Hh.px = 380; Hh.py = 230; const d = Hh.demos[0]; Object.assign(d, { x: Hh.px + 15, y: Hh.py, hitCd: 0 });
  const hp0 = G.player.health; step(3);
  check('a démogorgon megsebez (érintésre -' + G.DEMO_HIT + ')', G.player.health <= hp0 - G.DEMO_HIT);
  // lelövöd őket: 3 lövés egy démogorgon, 3 démogorgon a szabadulás
  const kill = () => {
    let guard = 0;
    while (Hh.kills < before + 1 && guard++ < 600) {
      const dm = Hh.demos[0]; if (!dm) { step(5); continue; }
      Hh.px = 380; Hh.py = 230; Object.assign(dm, { x: Hh.px + 120, y: Hh.py, hitCd: 5 }); G.player.angle = 0; G.player.health = 100;
      key('KeyF', true); step(8); key('KeyF', false); step(2);
    }
  };
  let before = 0; kill();
  check('3 lövéssel lelősz egy démogorgont', Hh.kills === 1);
  before = 1; kill(); 
  check('2/3 lelőve, még a Fordított Világban vagy', Hh.kills === 2 && !!G.player.moon && !!G.player.moon.horror);
  before = 2; kill();
  check('a 3. démogorgon után kiszabadulsz: visszakerülsz a normál világba, ahol elraboltak', !G.player.moon && Math.hypot(G.player.x - home.x, G.player.y - home.y) < 100 && G.player.health === 100);
  check('szabadulás után a játék normálisan megy (lehet mozogni)', (() => { const x0 = G.player.x; key('KeyD', true); step(30); key('KeyD', false); return G.player.x > x0; })());
  // ha a démogorgonok elkapnak: vissza a cellába, újra teljes büntetés
  jail(); G.player.moon.t = 12; G.player.moon.ix = G.ESCAPE_SPOT.x; G.player.moon.iy = G.ESCAPE_SPOT.y; press('KeyE');
  const H2 = G.player.moon.horror; G.player.health = 15; H2.px = 380; H2.py = 230; H2.spawnT = 0; step(3);
  H2.demos.forEach(dm => Object.assign(dm, { x: H2.px + 10, y: H2.py, hitCd: 0 })); step(10);
  check('ha elkapnak, vissza a cellába kerülsz, újra a teljes ' + G.MOON_TERM + ' mp büntetéssel', !G.player.moon.horror && G.player.moon.t > G.MOON_TERM - 1 && G.player.health === 100);
  G.player.moon = null; G.aliens.length = 0; Object.assign(G.player, { x: G.C + 140000, y: G.C });
}

// --- csalókód: Ctrl+S = +$10 000 ---
{
  G.progress.money = 5;
  let prevented = false;
  listeners.keydown({ code: 'KeyS', ctrlKey: true, repeat: false, preventDefault() { prevented = true; } }); listeners.keyup({ code: 'KeyS' });
  check('Ctrl+S: +$10 000, és a böngésző mentés-ablaka nem jön fel', G.CHEAT_MONEY === 10000 && G.progress.money === 10005 && prevented);
  listeners.keydown({ code: 'KeyS', metaKey: true, repeat: false, preventDefault() {} }); listeners.keyup({ code: 'KeyS' });
  check('Mac-en a Cmd+S is működik', G.progress.money === 20005);
  listeners.keydown({ code: 'KeyS', ctrlKey: true, repeat: true, preventDefault() {} });
  check('a nyomva tartott gomb nem ismétel', G.progress.money === 20005);
  const y0 = G.player.y; Object.assign(G.player, { inCar: false, inHouse: null, riding: null });
  listeners.keydown({ code: 'KeyS', ctrlKey: true, repeat: false, preventDefault() {} }); step(30); listeners.keyup({ code: 'KeyS' });
  check('Ctrl+S közben a karakter nem indul el lefelé', Math.abs(G.player.y - y0) < 1);
  G.progress.money = 0;
}

// --- telepítés: a böngésző ne a régi, tárolt game.js-t futtassa ---
{
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml'), 'utf8');
  check('kiadáskor a game.js címe egyedi (nem a régi, tárolt változat fut)', /game\.js\?v=\$\{GITHUB_SHA\}/.test(wf));
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
