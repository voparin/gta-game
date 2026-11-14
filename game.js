'use strict';

const VERSION = '0.36.0';         // minden kiadásnál léptetni kell (lásd CHANGELOG.md)

// ===== Beállítások =====
// A pálya végtelen (ADR-0019): nincs széle, a chunkok bármely koordinátán generálódnak.
const CHUNK = 1000;              // a világ ekkora négyzetekből épül fel, menet közben generálva
const ROAD_W = 160;
const ROAD_SPACING = 5000;       // utak távolsága (rácsban)
const ROAD_OFFSET = 2500;
const SIDEWALK_W = 50;           // járda szélessége az út mindkét oldalán
const WALK_OFF = ROAD_W / 2 + 18; // a gyalogosok ezen a vonalon sétálnak (az út közepétől)
const EDGE = ROAD_W / 2 + SIDEWALK_W;   // út + járda fél szélessége
const LAMP_OFF = EDGE - 6;        // villanyoszlopok a járda külső szélén
const C = 27500;                 // a kezdőhely melletti kereszteződés (a régi pálya közepe)
const START_X = C - 300, START_Y = C - 250;   // kezdőhely
const HALF_CYCLE = 30 * 60;      // 30 perc nappal, 30 perc éjszaka (másodperc)
const CYCLE = HALF_CYCLE * 2;
const FADE = 120;                // alkonyat / hajnal hossza (másodperc)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const light = document.createElement('canvas');   // éjszakai fénytérkép
const lctx = light.getContext('2d');

function resize() {
  canvas.width = light.width = window.innerWidth;
  canvas.height = light.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ===== Bemenet =====
const keys = {};
const mouse = { x: 0, y: 0, down: false, active: false };
let timeScale = 1;
// a böngészők csak felhasználói művelet után engedik a hangot: bármely gomb / kattintás feloldja, ha le volt tiltva
function unlockAudio() { if (radio.ac && radio.ac.state === 'suspended') radio.ac.resume(); }
const CHEAT_MONEY = 10000;                       // Ctrl+S (Mac: Cmd+S): pénz-csalókód – a böngésző „mentés” ablakát is letiltja
window.addEventListener('keydown', e => {
  unlockAudio();
  if (e.code === 'KeyE' && player.moon && !player.moon.horror && !e.repeat) { if (nearEscape()) enterHorror(); return; }   // szökés a Holdról
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
    if (e.preventDefault) e.preventDefault();
    if (!e.repeat) { progress.money += CHEAT_MONEY; saveProgress(); popup(`💰 Csalókód: +$${CHEAT_MONEY}`, '#ffd23a'); }
    return;                                        // az S (lefelé mozgás) ilyenkor nem érvényesül
  }
  if (donate.open) { if (!e.repeat) donateKey(e.code); return; }
  if (bank.open) { if (!e.repeat) bankKey(e.code); return; }
  if (shop.open) { if (!e.repeat) shopKey(e.code); return; }
  if (school.open) { if (!e.repeat) schoolKey(e.code); return; }
  if (tv.open) { if (!e.repeat) tvKey(e.code); return; }
  if (phone.open) { phoneKey(e); return; }                       // gépelés: a betűket az e.key adja (ékezetek is)
  if (taxiMenu.open) { if (!e.repeat) taxiMenuKey(e.code); return; }
  if (mapView.open) { if (!e.repeat) mapKey(e.code); return; }
  if (e.code === 'Escape') { if (!e.repeat) toggleMenu(); return; }
  if (menu.open) { if (!e.repeat) menuKey(e.code); return; }
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyT') timeScale = timeScale === 1 ? 60 : 1;
  if (e.code === 'KeyH') toggleStorm();
  if (e.code === 'KeyB') dropBomb();
  if (e.code === 'KeyX') callTaxi();
  if (e.code === 'KeyK' && !taxiTrip) openMap();
  if (e.code === 'KeyQ' && !e.repeat) callWar();
  if (e.code === 'KeyP' && !e.repeat) openPhone();
  if (e.code === 'KeyO' && !e.repeat) dropPhone();
  if (e.code === 'KeyV' && !e.repeat && player.inCar && car.plane && controllable()) cyclePlaneWeapon();
  if (e.code === 'KeyG') cycleWeapon(1);
  if (e.code === 'KeyJ') callOwnPlane();
  if (e.code === 'KeyR' && player.inHouse) startRadio();                            // következő szám
  if (e.code === 'Space' && player.inHouse && player.inHouse.factory) factoryAction();
  if (e.code === 'Digit1' || e.code === 'Numpad1') buyDrink('beer');
  if (e.code === 'Digit2' || e.code === 'Numpad2') buyDrink('wine');
  if (e.code === 'KeyM' && player.inHouse) { if (radio.playing) stopRadio(); else startRadio(); }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mousedown', e => {
  unlockAudio();
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  if (donate.open) { if (e.button === 0) donateClick(e.clientX, e.clientY); return; }
  if (bank.open) { if (e.button === 0) bankClick(e.clientX, e.clientY); return; }
  if (shop.open) { if (e.button === 0) shopClick(e.clientX, e.clientY); return; }
  if (school.open) { if (e.button === 0) schoolClick(e.clientX, e.clientY); return; }
  if (tv.open) { if (e.button === 0) closeTv(); return; }
  if (phone.open) { if (e.button === 0) phoneClick(e.clientX, e.clientY); return; }
  if (taxiMenu.open) { if (e.button === 0) taxiMenuClick(e.clientX, e.clientY); return; }
  if (mapView.open) { if (e.button === 0) mapClick(e.clientX, e.clientY); return; }
  if (menu.open) { if (e.button === 0) menuClick(e.clientX, e.clientY); return; }
  if (e.button === 0) mouse.down = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
let wheelAcc = 0;
window.addEventListener('wheel', e => {             // görgő: fegyverváltás (ha nincs nyitott ablak); a kis (touchpad-)elmozdulásokat összegyűjti
  if (menu.open || donate.open || bank.open || shop.open || school.open || tv.open || phone.open || taxiMenu.open || mapView.open || !controllable()) return;
  if (!e.deltaY) return;
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) < 60) return;
  cycleWeapon(wheelAcc > 0 ? 1 : -1); wheelAcc = 0;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });

// ===== Segédfüggvények =====
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(1234);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Utak: rácsban, ROAD_SPACING távolságra egymástól
const nearestRoad = v =>
  Math.round((v - ROAD_OFFSET) / ROAD_SPACING) * ROAD_SPACING + ROAD_OFFSET;
const onRoad = (x, y, m = 0) =>
  Math.abs(y - nearestRoad(y)) < ROAD_W / 2 + m || Math.abs(x - nearestRoad(x)) < ROAD_W / 2 + m;
function roadsIn(a, b) {
  const out = [];
  for (let r = Math.ceil((a - ROAD_OFFSET) / ROAD_SPACING) * ROAD_SPACING + ROAD_OFFSET; r < b; r += ROAD_SPACING) {
    out.push(r);
  }
  return out;
}

// ===== Világ (chunkokban, menet közben generálva) =====
const chunkCache = new Map();

function chunkSeed(cx, cy) {
  return (Math.imul(cx + 1, 73856093) ^ Math.imul(cy + 1, 19349663) ^ 0x5bd1e995) | 0;
}

function generateChunk(cx, cy) {
  const r = rng(chunkSeed(cx, cy));
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const ch = { obstacles: [], lamps: [], dunes: [] };
  const inChunk = (x, y) => x >= x0 && x < x0 + CHUNK && y >= y0 && y < y0 + CHUNK;

  // villanyoszlopok az utak mentén, váltakozó oldalon
  for (const R of roadsIn(y0 - LAMP_OFF - 1, y0 + CHUNK + LAMP_OFF + 1)) {
    for (let i = Math.ceil((x0 - 150) / 320); 150 + i * 320 < x0 + CHUNK; i++) {
      const x = 150 + i * 320, side = i % 2 ? 1 : -1, y = R + side * LAMP_OFF;
      if (Math.abs(x - nearestRoad(x)) < 200 || !inChunk(x, y)) continue;   // kereszteződésben nincs
      ch.lamps.push({ x, y, hx: x, hy: R + side * (LAMP_OFF - 40) });
    }
  }
  for (const R of roadsIn(x0 - LAMP_OFF - 1, x0 + CHUNK + LAMP_OFF + 1)) {
    for (let i = Math.ceil((y0 - 150) / 320); 150 + i * 320 < y0 + CHUNK; i++) {
      const y = 150 + i * 320, side = i % 2 ? 1 : -1, x = R + side * LAMP_OFF;
      if (Math.abs(y - nearestRoad(y)) < 200 || !inChunk(x, y)) continue;
      ch.lamps.push({ x, y, hx: R + side * (LAMP_OFF - 40), hy: y });
    }
  }
  for (const l of ch.lamps) ch.obstacles.push({ x: l.x, y: l.y, r: 8, type: 'lamp' });
  // házak: téglalap alakú akadály (a sarkok is szilárdak); a chunkba a középpontja szerint kerül
  for (const hs of housesIn(x0, y0, x0 + CHUNK, y0 + CHUNK)) {
    if (inChunk(hs.x, hs.y)) ch.obstacles.push({ x: hs.x, y: hs.y, r: Math.hypot(hs.w, hs.d) / 2, type: 'house',
      rect: { x0: hs.x0, y0: hs.y0, x1: hs.x1, y1: hs.y1 } });
  }
  // benzinkutak: kutak és az épület fala
  for (const st of stationsIn(x0, y0, x0 + CHUNK, y0 + CHUNK)) {
    for (const q of st.pumps) if (inChunk(q.x, q.y)) ch.obstacles.push({ x: q.x, y: q.y, r: 10, type: 'pump' });
    for (const q of st.walls) if (inChunk(q.x, q.y)) ch.obstacles.push({ x: q.x, y: q.y, r: 34, type: 'wall' });
  }

  // kaktuszok és sziklák (nem az úton, nem a kezdőhelyen)
  const place = (count, type, rMin, rMax) => {
    for (let k = 0; k < count; k++) {
      const x = x0 + r() * CHUNK, y = y0 + r() * CHUNK, rad = rMin + r() * (rMax - rMin);
      const rot = r() * Math.PI * 2, seed = r();
      if (onRoad(x, y, rad + 40 + SIDEWALK_W)) continue;   // úton és járdán nincs akadály
      if (Math.hypot(x - START_X, y - START_Y) < 250) continue;
      if (insideStation(x, y, rad + 20) || insideLot(x, y, rad + 20) || insideHouse(x, y, rad + 30)) continue;   // a ház mellett egy gyalogos (24 px) is elfér
      ch.obstacles.push({ x, y, r: rad, type, rot, seed });
    }
  };
  place(14, 'cactus', 10, 16);
  place(6, 'rock', 18, 42);

  for (let i = 0; i < 16; i++) {
    ch.dunes.push({ x: x0 + r() * CHUNK, y: y0 + r() * CHUNK, rx: 80 + r() * 220, ry: 30 + r() * 80, rot: r() * Math.PI });
  }

  return ch;
}

function getChunk(cx, cy) {
  const key = cx + ',' + cy;
  let ch = chunkCache.get(key);
  if (ch) {
    chunkCache.delete(key);          // használatkor a sor végére kerül → a legrégebben HASZNÁLT esik ki
    chunkCache.set(key, ch);
  } else {
    ch = generateChunk(cx, cy);
    chunkCache.set(key, ch);
    if (chunkCache.size > 600) chunkCache.delete(chunkCache.keys().next().value);
  }
  return ch;
}

function chunksIn(xa, ya, xb, yb) {
  const out = [];
  const c0x = Math.floor(xa / CHUNK), c1x = Math.floor(xb / CHUNK);
  const c0y = Math.floor(ya / CHUNK), c1y = Math.floor(yb / CHUNK);
  for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) out.push(getChunk(cx, cy));
  return out;
}
const chunksAround = (x, y, rad) => chunksIn(x - rad, y - rad, x + rad, y + rad);

const OB_REACH = 100;   // a legnagyobb akadály „sugara” (ház fél-átlója) – ennyivel tágabban keresünk chunkot

function obstacleAt(x, y, pad = 0) {
  for (const ch of chunksAround(x, y, OB_REACH + pad)) {
    for (const ob of ch.obstacles) {
      if (ob.rect ? x > ob.rect.x0 - pad && x < ob.rect.x1 + pad && y > ob.rect.y0 - pad && y < ob.rect.y1 + pad
        : Math.hypot(x - ob.x, y - ob.y) < ob.r + pad) return true;
    }
  }
  return false;
}

// ===== Benzinkutak: néhány kereszteződés egyik sarkán =====
const stationCache = new Map();
const STATION_CACHE_MAX = 3000;
function stationFor(i, j) {
  const key = i + ',' + j;
  if (stationCache.has(key)) {                     // használatkor a sor végére kerül (LRU, mint a chunkoknál)
    const hit = stationCache.get(key);
    stationCache.delete(key); stationCache.set(key, hit);
    return hit;
  }
  const X = ROAD_OFFSET + i * ROAD_SPACING, Y = ROAD_OFFSET + j * ROAD_SPACING;
  const center = X === C && Y === C;          // a kezdőhely melletti kereszteződésben mindig van
  const h = rng(chunkSeed(i + 1000, j + 1000));
  let st = null;
  if (center || h() < 0.45) {
    const qx = center ? 1 : (h() < 0.5 ? -1 : 1), qy = center ? -1 : (h() < 0.5 ? -1 : 1);
    const ox = X + qx * (EDGE + 10), oy = Y + qy * (EDGE + 10);
    const L = (a, b) => ({ x: ox + qx * a, y: oy + qy * b });   // a: távolság a függőleges úttól, b: a vízszintestől
    const box = (a0, b0, a1, b1) => {
      const p = L(a0, b0), q = L(a1, b1);
      return { x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y) };
    };
    st = { X, Y, qx, qy, rect: box(0, 0, 320, 240), building: box(56, 168, 304, 236), canopy: box(60, 55, 280, 135),
      pumps: [L(110, 95), L(230, 95)], walls: [90, 150, 210, 270].map(a => L(a, 202)), sign: L(-20, -20) };
  }
  stationCache.set(key, st);
  if (stationCache.size > STATION_CACHE_MAX) stationCache.delete(stationCache.keys().next().value);
  return st;
}

function stationsIn(xa, ya, xb, yb) {
  const out = [];
  const i0 = Math.floor((xa - ROAD_OFFSET - 500) / ROAD_SPACING), i1 = Math.ceil((xb - ROAD_OFFSET + 500) / ROAD_SPACING);
  const j0 = Math.floor((ya - ROAD_OFFSET - 500) / ROAD_SPACING), j1 = Math.ceil((yb - ROAD_OFFSET + 500) / ROAD_SPACING);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const st = stationFor(i, j);
    if (st && st.rect.x1 >= xa && st.rect.x0 <= xb && st.rect.y1 >= ya && st.rect.y0 <= yb) out.push(st);
  }
  return out;
}

function insideStation(x, y, pad = 0) {
  return stationsIn(x - pad, y - pad, x + pad, y + pad).some(st =>
    x > st.rect.x0 - pad && x < st.rect.x1 + pad && y > st.rect.y0 - pad && y < st.rect.y1 + pad);
}

function nearPump(x, y) {
  for (const st of stationsIn(x - 100, y - 100, x + 100, y + 100)) {
    for (const p of st.pumps) if (Math.hypot(x - p.x, y - p.y) < 75) return p;
  }
  return null;
}

// a pálya végtelen (ADR-0019), ezért egyre nagyobb négyzetben keres; ha talált, a négyzet sarkáig
// (√2-szeres sugárig) még egyszer megnézi, hogy biztosan a legközelebbit adja
function nearestStation(x, y) {
  const search = rad => {
    let best = null;
    for (const st of stationsIn(x - rad, y - rad, x + rad, y + rad)) {
      const cx = (st.canopy.x0 + st.canopy.x1) / 2, cy = (st.canopy.y0 + st.canopy.y1) / 2, d = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d) best = { st, x: cx, y: cy, d };
    }
    return best;
  };
  for (let rad = ROAD_SPACING; rad <= ROAD_SPACING * 16; rad *= 2) {
    const found = search(rad);
    if (found) return found.d <= rad ? found : search(found.d);
  }
  return null;
}

// ===== Buszmegállók: minden úton 2500 px-enként, mindkét oldalon (a kereszteződésektől 1250 px-re) =====
const STOP_SPACING = 2500, STOP_OFFSET = 1250;
const CITY_BUS = { type: 'citybus', color: ['#f28c1e', '#c96a0a'], len: 120, wid: 44, accel: 240, maxRoad: 360, maxSand: 250, sandDrag: 0.9, fuelUse: 1 };
const BUS_DWELL = 4;          // ennyi másodpercig áll a busz a megállóban
const BUS_FARE = 2;           // buszjegy ára ($)
// Menetrend (ADR-0027): percenként egy busz a játékoshoz legközelebbi megállóba
const BUS_INTERVAL = 60, BUS_LEAD = 1000;   // indulás a megálló előtt legalább 1000 px-rel
const busSchedule = { next: 15, dispatched: 0 };

// ===== Trolibuszok (ADR-0043): minden 3. vízszintes úton (a kezdőhelyén is) trolivonal, felsővezetékkel; saját megállók 2500 px-enként; jegy $3 =====
const TROLLEY_FARE = 3, TROLLEY_OFFSET = 625, TROLLEY_INTERVAL = 40;            // a megállók a buszmegállóktól 625 px-re (ne essenek egybe)
const TROLLEY = { type: 'citybus', color: ['#c8202a', '#f2e6c8'], len: 124, wid: 44, accel: 240, maxRoad: 330, maxSand: 250, sandDrag: 0.9, fuelUse: 1 };
const trolleySchedule = { next: 8 };
const trolleyRoad = R => { const k = Math.round((R - ROAD_OFFSET) / ROAD_SPACING), b = Math.round((C - ROAD_OFFSET) / ROAD_SPACING); return (((k - b) % 3) + 3) % 3 === 0 && ((R - RAIL_Y0) % RAIL_SPACE + RAIL_SPACE) % RAIL_SPACE !== 0; };   // a vasútvonal útján nincs troli
function trolleyStopsIn(xa, ya, xb, yb) {          // csak a trolivonalakon (vízszintes utak), mindkét oldalon
  const out = [];
  for (const R of roadsIn(ya - EDGE, yb + EDGE)) {
    if (!trolleyRoad(R)) continue;
    for (let k = Math.ceil((xa - TROLLEY_OFFSET) / STOP_SPACING); TROLLEY_OFFSET + k * STOP_SPACING <= xb; k++) {
      const a = TROLLEY_OFFSET + k * STOP_SPACING;
      for (const side of [-1, 1]) out.push({ axis: 'h', road: R, along: a, side, dir: side, x: a, y: R + side * (EDGE - 12), trolley: true });
    }
  }
  return out;
}
function nearestTrolleyStop(x, y) {
  let best = null, bd = Infinity;
  for (const bs of trolleyStopsIn(x - 2600, y - 2600, x + 2600, y + 2600)) { const d = Math.hypot(bs.x - x, bs.y - y); if (d < bd) { bd = d; best = bs; } }
  return best;
}
function spawnTrolley(dir, road, along) {
  const c = spawnAiCar('h', dir, road, along);
  applyCarModel(c, TROLLEY);
  Object.assign(c, { citybus: true, trolley: true, health: 12, dwellUntil: 0, lastStop: null });
  c.ai.speed = 280;
  return c;
}
function dispatchTrolley() {                       // a játékoshoz legközelebbi trolimegálló felé, a megálló előtt indul
  const lead = busLead();
  const stops = trolleyStopsIn(player.x - 2600, player.y - 2600, player.x + 2600, player.y + 2600)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, 6);
  for (const bs of stops) {
    const along = bs.along - bs.dir * lead, lane = { x: along, y: bs.road + bs.dir * 40 };
    if (dist(lane, player) > 2700) continue;                                     // különben a távoli autókat eltüntető takarítás rögtön törölné
    if ([car, ...aiCars].some(c => dist(c, lane) < 300)) continue;
    return spawnTrolley(bs.dir, bs.road, along);
  }
  return null;
}
const nextTrolleyIn = () => Math.max(0, trolleySchedule.next - clock) + busLead() / 280 + 1.5;
function drawTrolleyWires(view) {                  // felsővezeték a trolivonalak két sávja fölött, oszlopokkal
  for (const R of roadsIn(view.y0 - EDGE, view.y1 + EDGE)) {
    if (!trolleyRoad(R)) continue;
    ctx.save(); ctx.strokeStyle = 'rgba(30,30,30,0.75)'; ctx.lineWidth = 1.5;
    for (const ly of [R - 40 - 4, R - 40 + 4, R + 40 - 4, R + 40 + 4]) { ctx.beginPath(); ctx.moveTo(view.x0, ly); ctx.lineTo(view.x1, ly); ctx.stroke(); }
    ctx.fillStyle = '#555';
    for (let x = Math.ceil(view.x0 / 300) * 300; x < view.x1; x += 300) {
      ctx.fillRect(x - 2, R - EDGE - 2, 4, EDGE * 2 + 4);                         // tartókötél az út fölött
      ctx.beginPath(); ctx.arc(x, R - EDGE, 5, 0, Math.PI * 2); ctx.arc(x, R + EDGE, 5, 0, Math.PI * 2); ctx.fill();   // oszlopok a járdán
    }
    ctx.restore();
  }
}
function drawTrolleyStop(bs) {
  ctx.fillStyle = 'rgba(200,32,42,0.85)'; ctx.fillRect(bs.x - 28, bs.y - 8, 56, 16);              // fedett váró
  ctx.fillStyle = 'rgba(255,220,220,0.6)'; ctx.fillRect(bs.x - 25, bs.y - 5, 50, 10);
  ctx.fillStyle = '#c8202a'; ctx.fillRect(bs.x + 27, bs.y - 9, 18, 18);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚎', bs.x + 36, bs.y + 5);
  const ly = bs.road + bs.dir * 40;                                                              // felfestés az úton
  ctx.strokeStyle = 'rgba(200,32,42,0.8)'; ctx.lineWidth = 3; ctx.strokeRect(bs.along - 70, ly - 22, 140, 44);
  ctx.fillStyle = 'rgba(200,32,42,0.9)'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('TROLI', bs.along, ly + 5); ctx.textAlign = 'left';
}

// side: az út melyik oldalán (±1); dir: az a haladási irány, amelyik itt áll meg (jobb oldali közlekedés)
function busStopsIn(xa, ya, xb, yb) {
  const out = [];
  const alongs = (a, b) => {
    const res = [];
    for (let k = Math.ceil((a - STOP_OFFSET) / STOP_SPACING); STOP_OFFSET + k * STOP_SPACING <= b; k++) res.push(STOP_OFFSET + k * STOP_SPACING);
    return res;
  };
  for (const R of roadsIn(ya - EDGE, yb + EDGE)) for (const a of alongs(xa, xb)) for (const side of [-1, 1]) {
    out.push({ axis: 'h', road: R, along: a, side, dir: side, x: a, y: R + side * (EDGE - 12) });
  }
  for (const R of roadsIn(xa - EDGE, xb + EDGE)) for (const a of alongs(ya, yb)) for (const side of [-1, 1]) {
    out.push({ axis: 'v', road: R, along: a, side, dir: -side, x: R + side * (EDGE - 12), y: a });
  }
  return out;
}

// ===== Házak az utak mentén (analitikusan, mint az utak és a megállók) =====
// 420 px-enként egy telek mindkét oldalon, a járdán túl. Nincs ház a kereszteződések / benzinkutak
// közelében (650 px) és a megállók melletti parkolóknál; a telkek ~25%-a üres.
const HOUSE_SPACING = 420, HOUSE_START = 210, HOUSE_GAP = 22;
const ROOF_COLORS = ['#b5533c', '#8c4a3a', '#6d6a66', '#a0643c', '#7a5a8a', '#4f6d7a'];

function housesIn(xa, ya, xb, yb) {
  const out = [];
  const forRoad = (axis, R, a0, a1) => {
    for (let k = Math.ceil((a0 - HOUSE_START) / HOUSE_SPACING); HOUSE_START + k * HOUSE_SPACING <= a1; k++) {
      const a = HOUSE_START + k * HOUSE_SPACING;
      if (Math.abs(a - nearestRoad(a)) < 650) continue;                       // kereszteződés, benzinkút
      const m = ((a - STOP_OFFSET) % STOP_SPACING + STOP_SPACING) % STOP_SPACING;
      if (m < 360 || m > STOP_SPACING - 40) continue;                         // megálló melletti parkoló
      for (const side of [-1, 1]) {
        const h = rng(chunkSeed(Math.round(a / 10) * (axis === 'h' ? 3 : 5), Math.round(R / 10) * side + 77));
        if (h() < 0.25) continue;                                              // üres telek
        const w = 150 - h() * 30, d = 100 - h() * 20, d0 = EDGE + HOUSE_GAP;
        const toXY = (al, dd) => axis === 'h' ? { x: al, y: R + side * dd } : { x: R + side * dd, y: al };
        const p = toXY(a - w / 2, d0), q = toXY(a + w / 2, d0 + d), c = toXY(a, d0 + d / 2);
        out.push({ id: `${axis}:${R}:${a}:${side}`, axis, side, road: R, along: a, w, d, x: c.x, y: c.y,
          x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y),
          roof: ROOF_COLORS[(h() * ROOF_COLORS.length) | 0], chimney: h(), pub: h() < 0.12, bankRoll: h(), factoryRoll: h(), shopRoll: h(), schoolRoll: h(), restaurantRoll: h(), mechanicRoll: h(), phoneRoll: h(), skyRoll: h() });
        const hs = out[out.length - 1];
        hs.bank = !hs.pub && hs.bankRoll < 0.06;                                 // ~6% bank
        hs.factory = !hs.pub && !hs.bank && hs.factoryRoll < 0.06;               // ~6% gyár
        hs.shop = !hs.pub && !hs.bank && !hs.factory && hs.shopRoll < 0.08;      // ~8% bolt
        hs.school = !hs.pub && !hs.bank && !hs.factory && !hs.shop && hs.schoolRoll < 0.05;   // ~5% iskola
        const taken = hs.pub || hs.bank || hs.factory || hs.shop || hs.school;
        hs.restaurant = !taken && hs.restaurantRoll < 0.06;                      // ~6% étterem
        hs.mechanic = !taken && !hs.restaurant && hs.mechanicRoll < 0.05;        // ~5% autószerelő
        hs.phoneShop = !taken && !hs.restaurant && !hs.mechanic && hs.phoneRoll < 0.05;   // ~5% telefonbolt
        hs.sky = !taken && !hs.restaurant && !hs.mechanic && !hs.phoneShop && hs.skyRoll < (downtown(hs.x, hs.y) ? 0.6 : 0.02);   // felhőkarcoló: a belvárosban sok, máshol ritka
        if (hs.sky) hs.floors = 14 + ((hs.skyRoll * 1000) | 0) % 36;                                                       // 14–49 emelet
      }
    }
  };
  for (const R of roadsIn(ya - 400, yb + 400)) forRoad('h', R, xa - 200, xb + 200);
  for (const R of roadsIn(xa - 400, xb + 400)) forRoad('v', R, ya - 200, yb + 200);
  return out.filter(o => o.x1 >= xa && o.x0 <= xb && o.y1 >= ya && o.y0 <= yb && !destroyedHouses.has(o.id));
}

// belváros: a 20 000 px-es cellák kb. harmadában sok a felhőkarcoló (ADR-0039)
const downtown = (x, y) => rng(chunkSeed(Math.floor(x / 20000) + 700, Math.floor(y / 20000) + 700))() < 0.35;
// ===== Házak belseje (ADR-0025): külön koordináta-rendszerű szoba, az ajtón át =====
const ROOM_W = 560, ROOM_H = 360, ROOM_WALL = 14;
// ajtó: a ház út felőli oldalának közepén; kint a bejárati úton állsz
function doorOf(hs) {
  const front = HOUSE_GAP + EDGE, a = hs.along;
  const out = front - 14;
  return hs.axis === 'h' ? { x: a, y: hs.road + hs.side * out } : { x: hs.road + hs.side * out, y: a };
}
function nearestDoor() {
  return housesIn(player.x - 120, player.y - 120, player.x + 120, player.y + 120).find(hs => !hs.sky && dist(doorOf(hs), player) < 35);   // a felhőkarcolóba nem lehet bemenni
}
// bútorok: két elrendezés (tükrözve is), az ajtó előtti sáv mindig szabad
function furnitureOf(hs) {
  if (hs.pub) return PUB_FURNITURE;
  if (hs.bank) return BANK_FURNITURE;
  if (hs.factory) return FACTORY_FURNITURE;
  if (hs.shop) return SHOP_FURNITURE;
  if (hs.school) return SCHOOL_FURNITURE;
  if (hs.restaurant) return RESTAURANT_FURNITURE;
  if (hs.mechanic) return MECHANIC_FURNITURE;
  if (hs.phoneShop) return PHONE_FURNITURE;
  const r = rng(chunkSeed(Math.round(hs.x), Math.round(hs.y)));
  const mirror = r() < 0.5, alt = r() < 0.5;
  const items = alt ? [
    { k: 'bed', x: 24, y: 24, w: 130, h: 86 }, { k: 'wardrobe', x: 170, y: 20, w: 120, h: 36 },
    { k: 'table', x: 330, y: 150, w: 110, h: 70 }, { k: 'kitchen', x: ROOM_W - 44, y: 40, w: 24, h: 200 },
    { k: 'plant', x: 30, y: ROOM_H - 70, w: 34, h: 34 }, { k: 'radio', x: 300, y: 22, w: 38, h: 22 },
    { k: 'tv', x: 360, y: 20, w: 100, h: 16 },
  ] : [
    { k: 'sofa', x: 30, y: 150, w: 54, h: 140 }, { k: 'tv', x: 220, y: 20, w: 110, h: 16 },
    { k: 'table', x: 220, y: 140, w: 120, h: 70 }, { k: 'bed', x: ROOM_W - 160, y: 24, w: 136, h: 90 },
    { k: 'kitchen', x: ROOM_W - 44, y: 160, w: 24, h: 130 }, { k: 'plant', x: ROOM_W - 70, y: ROOM_H - 70, w: 34, h: 34 },
    { k: 'radio', x: 110, y: 22, w: 38, h: 22 },
  ];
  return items.map(o => ({ ...o, x: mirror ? ROOM_W - o.x - o.w : o.x }));
}
// ===== Rádió (ADR-0026): Web Audio-val, menet közben generált véletlen számok – nincs hangfájl =====
const radio = { playing: false, song: null, step: 0, nextTime: 0, ac: null, out: null, songOut: null };   // songOut: az aktuális szám saját hangereje
const SONG_STEPS = 32;
const SCALES = { 'dúr': [0, 2, 4, 5, 7, 9, 11], 'moll': [0, 2, 3, 5, 7, 8, 10], 'pentaton': [0, 2, 4, 7, 9], 'blues': [0, 3, 5, 6, 7, 10] };
const SONG_WORDS = [['Sivatagi', 'Éjféli', 'Poros', 'Forró', 'Kék', 'Homokos', 'Magányos', 'Száguldó', 'Zöld', 'Narancs'],
  ['Kaktusz', 'Országút', 'Tornádó', 'Busz', 'Naplemente', 'Benzinkút', 'Délibáb', 'Sas', 'Csillag', 'Homokvihar'],
  ['Blues', 'Boogie', 'Ballada', 'Disco', 'Rock', 'Swing', 'Techno']];

// egy szám a seedből: hangnem, skála, tempó, hangszín, 32 lépéses dallam (szünetekkel) és basszus
function makeSong(seed) {
  const r = rng(seed), pick = a => a[(r() * a.length) | 0];
  const scaleName = pick(Object.keys(SCALES)), scale = SCALES[scaleName];
  const root = 48 + ((r() * 12) | 0), bpm = 90 + ((r() * 60) | 0), wave = pick(['square', 'triangle', 'sawtooth', 'sine']);
  const melody = [];
  let idx = (r() * scale.length) | 0;
  for (let i = 0; i < SONG_STEPS; i++) {
    idx = clamp(idx + Math.round((r() - 0.5) * 4), 0, scale.length * 2 - 1);      // véletlen séta a skálán (két oktáv)
    melody.push(r() < 0.2 ? null : root + 12 + scale[idx % scale.length] + 12 * Math.floor(idx / scale.length));
  }
  const bass = [0, 1, 2, 3].map(() => root - 12 + pick([0, scale[2 % scale.length], 7, scale[scale.length - 2]]));
  return { seed, name: `${pick(SONG_WORDS[0])} ${pick(SONG_WORDS[1])} ${pick(SONG_WORDS[2])}`, scaleName, root, bpm, wave, melody, bass };
}

function audioOut() {
  if (!radio.ac) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { radio.ac = new AC(); radio.out = radio.ac.createGain(); radio.out.gain.value = 0.25; radio.out.connect(radio.ac.destination); }
    } catch (e) { radio.ac = null; }                       // nincs hang (pl. teszt) – a rádió állapota attól még működik
  }
  return radio.ac;
}

function startRadio(seed = (Math.random() * 1e9) | 0) {
  stopRadio();                                         // az előző szám már beütemezett hangjai se szóljanak bele
  radio.song = makeSong(seed); radio.step = 0; radio.playing = true;
  const ac = audioOut();
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    radio.songOut = ac.createGain(); radio.songOut.gain.setValueAtTime(1, ac.currentTime); radio.songOut.connect(radio.out);
    radio.nextTime = ac.currentTime + 0.05;
  }
  popup(`📻 Most szól: ${radio.song.name}`, '#ffd23a');
}

// leállítás: a szám saját hangerejét azonnal nullára veszi, így a már beütemezett hangok (pl. hosszú basszus) is elhallgatnak
function stopRadio() {
  radio.playing = false;
  if (radio.songOut && radio.ac) { radio.songOut.gain.setValueAtTime(0, radio.ac.currentTime); radio.songOut.disconnect(); }
  radio.songOut = null;
}

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
function playTone(freq, t, dur, type, vol) {
  const ac = radio.ac, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(radio.songOut); o.start(t); o.stop(t + dur + 0.02);
}
function playDrum(t, kick) {
  const ac = radio.ac, o = ac.createOscillator(), g = ac.createGain();
  o.type = kick ? 'sine' : 'square';
  o.frequency.setValueAtTime(kick ? 140 : 6000, t); o.frequency.exponentialRampToValueAtTime(kick ? 40 : 3000, t + (kick ? 0.15 : 0.04));
  g.gain.setValueAtTime(kick ? 0.9 : 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kick ? 0.18 : 0.05));
  o.connect(g); g.connect(radio.songOut); o.start(t); o.stop(t + 0.2);
}

// előre ütemezi a következő ~0,25 mp hangjait (nyolcadonként egy lépés)
function updateRadio() {
  const ac = radio.ac;
  if (!radio.playing || !ac || !radio.songOut) return;
  const S = radio.song, stepLen = 60 / S.bpm / 2;
  if (radio.nextTime < ac.currentTime) radio.nextTime = ac.currentTime + 0.05;   // háttérben töltött idő után ne pótolja be a kimaradt hangokat
  while (radio.nextTime < ac.currentTime + 0.25) {
    const t = radio.nextTime, i = radio.step;
    if (S.melody[i] !== null) playTone(midiHz(S.melody[i]), t, stepLen * 0.9, S.wave, 0.35);
    if (i % 8 === 0) playTone(midiHz(S.bass[(i / 8) | 0]), t, stepLen * 7.5, 'triangle', 0.5);
    if (i % 4 === 0) playDrum(t, true); else if (i % 2 === 1) playDrum(t, false);
    radio.nextTime += stepLen; radio.step = (i + 1) % SONG_STEPS;
  }
}

// ===== Kocsma: pult, székek, asztalok; a pultnál 1: sör, 2: bor =====
const BEER_PRICE = 2, WINE_PRICE = 3;
const DRINKS = { beer: { name: 'sör', price: BEER_PRICE, drunk: 15 }, wine: { name: 'bor', price: WINE_PRICE, drunk: 22 } };
// ===== Robi, a telefon beépített „MI”-je (ADR-0037): kulcsszavas, a játék állását ismerő csevegőpartner – nincs külső szolgáltatás, a játék egy statikus oldal =====
const phone = { open: false, input: '', log: [], pending: null, t: 0, hits: [], app: 'home', vid: 0, vidT: 0, snake: null, flappy: null };
const PHONE_TIPS = ['Tipp: a szállítási célpontokért pénzt kapsz – kombóban egyre többet!', 'Tipp: a bankban hitelt vehetsz fel, de 20% a díja.', 'Tipp: a Q gombbal háborút indíthatsz – de ne a közelében legyél, ha az atombomba jön!',
  'Tipp: a vonat $4, és 30 mp-enként jön – gyorsabb, mint sétálni.', 'Tipp: házban biztonságban vagy a golyóktól és a tornádótól… a házat leszámítva.', 'Tipp: az iskolában vigyázz a gonosz tanárral, és ne rohangálj!',
  'Tipp: a lovakra nem kell benzin, és a Shift a vágta.', 'Tipp: a kávé kijózanít, a gulyásleves is.', 'Tipp: az űrlényektől futva vagy gyors autóval tudsz elmenekülni.'];
const PHONE_JOKES = ['Miért nem tud a tornádó titkot tartani? Mert mindent elfúj!', 'Mit mond a benzinkút a kocsinak? „Tölts el egy kis időt velem!”', 'Miért dolgozik a gyalogos a gyárban? Mert a sós zacskó sosem fogy ki!',
  'Mit csinál a tank a kocsmában? Semmit, mert tankolni jött.', 'Hogy hívják az űrlényt a Holdon? Hold-lakó társ!'];
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (t, ...ws) => { const toks = t.split(' '); return ws.some(w => (w.includes(' ') ? t.includes(w) : toks.some(k => k.startsWith(w)))); };   // egy szó eleje vagy egy kifejezés
function compass(dx, dy) {                          // irány szavakkal (a képernyő teteje észak)
  const a = Math.atan2(dy, dx) / Math.PI * 180, names = ['kelet', 'délkelet', 'dél', 'délnyugat', 'nyugat', 'északnyugat', 'észak', 'északkelet'];
  return names[((Math.round(a / 45) % 8) + 8) % 8];
}
const where = (what, pt) => (pt ? `A legközelebbi ${what} kb. ${Math.round(Math.hypot(pt.x - player.x, pt.y - player.y) / 10)} m-re van, ${compass(pt.x - player.x, pt.y - player.y)} felé.` : `Nem találok ${what}ot a közelben.`);
function nearestPlace(kind) {                       // { x, y, label } a legközelebbi hely, vagy null
  if (kind === 'station') { const n = nearestStation(player.x, player.y); return n ? { x: n.x, y: n.y, label: 'benzinkút' } : null; }
  if (kind === 'train') {
    for (let rad = 6000; rad <= 48000; rad *= 2) { const st = railStopsIn(player.x - rad, player.y - rad, player.x + rad, player.y + rad); if (st.length) { const b = st.reduce((a, c) => (Math.hypot(a.x - player.x, a.y - player.y) <= Math.hypot(c.x - player.x, c.y - player.y) ? a : c)); return { x: b.x, y: b.y, label: 'vasútállomás' }; } }
    return null;
  }
  const preds = { bank: h => h.bank, pub: h => h.pub, shop: h => h.shop, restaurant: h => h.restaurant, mechanic: h => h.mechanic, school: h => h.school, factory: h => h.factory, phone: h => h.phoneShop };
  const names = { bank: 'bank', pub: 'kocsma', shop: 'bolt', restaurant: 'étterem', mechanic: 'autószerelő', school: 'iskola', factory: 'gyár', phone: 'telefonbolt' };
  const hs = preds[kind] && nearestHouseOf(preds[kind]);
  if (!hs) return null; const d = doorOf(hs);
  return { x: d.x, y: d.y, label: names[kind] };
}
const PLACE_WORDS = [['station', 'benzin', 'kut', 'tankol'], ['bank', 'bank', 'hitel'], ['pub', 'kocsma', 'pub'], ['shop', 'bolt', 'csoki'], ['restaurant', 'etterem', 'pizza', 'ennivalo', 'enni'],
  ['mechanic', 'szerelo', 'tuning'], ['school', 'iskola'], ['factory', 'gyar', 'munka'], ['train', 'vonat', 'allomas', 'vasut'], ['phone', 'telefonbolt']];
// a válasz: { text, pin?: {x,y}, taxi?: true } – a mellékhatásokat (jelölés, taxi) a hívó hajtja végre
function robiReply(raw) {
  const t = norm(raw), smart = (progress.phone || 0) >= 2;
  if (!t) return { text: 'Írj valamit, és válaszolok! 🙂' };
  if (has(t, 'szia', 'hello', 'szervusz', 'helo', 'csao', 'jo napot', 'hali')) return { text: `Szia! Robi vagyok, a telefonod MI-je. 🤖 Kérdezz bármit: hol a legközelebbi benzinkút, bank, bolt? Mennyi a pénzem? Mi a hír a háborúról? Vagy kérj tippet, viccet!` };
  if (has(t, 'ki vagy', 'hogy hivnak', 'mi a neved', 'a neved')) return { text: 'Robi vagyok, egy kis MI a telefonodban. Nem vagyok igazi nagy nyelvi modell, de ismerem a játék minden zugát! 🤖' };
  if (has(t, 'koszi', 'koszonom', 'thx', 'kosz')) return { text: 'Szívesen! Ha kell valami, itt vagyok. 🙂' };
  if (has(t, 'viszlat', 'szia szia', 'bye', 'pa pa')) return { text: 'Viszlát! Vigyázz magadra odakint! 👋' };
  if (has(t, 'vicc')) return { text: PHONE_JOKES[(rand() * PHONE_JOKES.length) | 0] };
  if (has(t, 'tipp', 'tanacs', 'segits', 'mit csinaljak', 'mit tegyek')) return { text: PHONE_TIPS[(rand() * PHONE_TIPS.length) | 0] };
  if (has(t, 'penz', 'egyenleg', 'mennyim van', 'gazdag', 'hitel')) { const d = progress.debt || 0; return { text: `$${Math.floor(progress.money)} van a zsebedben${d > 0 ? `, és $${d} hitelt kell visszafizetned` : ', adósságod nincs'}. Szint: ${levelOf(progress.xp)}.` }; }
  if (has(t, 'eletem', 'elet', 'hp', 'egeszseg')) return { text: `Az életed ${Math.round(player.health)}/100.${player.health < 50 ? ' Menj egy boltba (szendvics, elsősegély)!' : ''}` };
  if (has(t, 'haboru', 'hadsereg', 'katona', 'atombomba', 'raketa')) {
    if (!war) return { text: `Most nincs háború. A következő kb. ${Math.max(0, Math.ceil(warClock.left / 60))} perc múlva törhet ki${occupation ? ' – és most egy megszállt terület is van a környéken 🏴' : ''}. (A Q gombbal te is indíthatsz egyet.)` };
    const dm = Math.round(Math.hypot(player.x - war.x, player.y - war.y) / 10);
    return { text: `⚔ Háború dúl ${dm} m-re, ${compass(war.x - player.x, war.y - player.y)} felé! ${war.nukeArmed ? '☢ ATOMBOMBA KÖZELEG – menekülj legalább 1800 px-re, vagy bújj házba!' : `Még ${Math.max(0, Math.ceil((WAR_LIFE - war.t) / 60))} perc és atombomba robban a végén, addig kerüld el!`}` };
  }
  if (has(t, 'idojaras', 'vihar', 'homok', 'szel')) return { text: storm.level > 0.5 ? '🌪 Most homokvihar van!' + (tornado ? ` Tornádó is kószál ${Math.round(Math.hypot(player.x - tornado.x, player.y - tornado.y) / 10)} m-re!` : '') : 'Szép idő van, nincs homokvihar. (A H gombbal viharrá változtathatod.)' };
  if (has(t, 'tornado')) return { text: tornado ? `🌪 Tornádó van ${Math.round(Math.hypot(player.x - tornado.x, player.y - tornado.y) / 10)} m-re, ${compass(tornado.x - player.x, tornado.y - player.y)} felé – ráadásul utánad ered! Menekülj!` : 'Most nincs tornádó. Erős homokviharban viszont támadhat.' };
  if (has(t, 'urleny', 'ufo', 'hold')) return { text: aliens.length ? `👽 ${aliens.length} űrlény üldöz! Fuss (Shift) vagy menekülj autóval!` : `Most nincs űrlény. 3 percenként jönnek (kb. ${Math.max(0, Math.ceil(alienClock.left / 60))} perc múlva). Ha elkapnak, a Holdon a cella sarkában van egy rés a szökéshez!` };
  if (has(t, 'rendor', 'korozes', 'csillag')) return { text: wanted.level ? `Most ${wanted.level} csillagos körözés alatt állsz – menekülj 12 mp-re a rendőrök elől!` : 'Most nem keres a rendőrség. 😇 (145 km/h fölött kezdenek üldözni.)' };
  if (has(t, 'ido', 'ora', 'mennyi az ido', 'nappal', 'ejszaka')) { const n = nightAmount(time); return { text: n > 0.6 ? '🌙 Éjszaka van.' : n > 0.2 ? '🌆 Alkonyodik / hajnalodik.' : '☀️ Nappal van.' }; }
  if (has(t, 'taxi')) { if (!smart) return { text: 'A taxit az X gombbal hívhatod ($5 bárhova). Az okostelefonon én is megteszem helyetted!' }; return { text: '🚕 Hívom a taxit!', taxi: true }; }
  if (has(t, 'sebesseg', 'benzinem', 'tank')) return { text: player.inCar ? `A tankod ${Math.round(car.fuel)}%-on áll.${car.fuel < 30 ? ' Keress egy kutat!' : ''}` : 'Most nem ülsz autóban.' };
  // helyek: „hol van …”, „jelöld meg …”
  for (const [kind, ...words] of PLACE_WORDS) {
    if (!has(t, ...words)) continue;
    const pt = nearestPlace(kind);
    if (!pt) return { text: `Nem találok ilyet a közelben.` };
    if (has(t, 'jelol', 'pin', 'terkep')) {
      if (!smart) return { text: `A térképre jelölést az okostelefonon tudok tenni – ez az egyszerű telefon azt nem tudja. ${where(pt.label, pt)}` };
      return { text: `📍 Megjelöltem a térképen (K): ${where(pt.label, pt)}`, pin: { x: pt.x, y: pt.y } };
    }
    if (kind === 'train' && has(t, 'mikor', 'indul', 'jon')) { const st = onPlatform(player.x, player.y); if (st) return { text: `🚆 A következő vonat kb. ${Math.ceil(nextTrainIn(st.k, clock + trainShift))} mp múlva érkezik (jegy $${TRAIN_FARE}).` }; }
    return { text: where(pt.label, pt) + (smart ? ' Mondd: „jelöld meg”, és felteszem a térképre.' : '') };
  }
  if (has(t, 'mit tudsz', 'segitseg', 'help', 'parancs')) return { text: 'Kérdezhetsz: hol a legközelebbi benzinkút/bank/bolt/étterem/kocsma/vonat, mennyi pénzem van, van-e háború/vihar/űrlény, hány óra van. Kérhetsz tippet vagy viccet. Okostelefonon: „jelöld meg a bankot”, „hívj taxit”.' };
  const fallbacks = ['Hmm, ezt nem egészen értem. 🤔 Kérdezd meg például: „hol van a legközelebbi benzinkút?”', 'Erre nem tudok válaszolni, de kérj tippet vagy viccet!', 'Nem tudom, de mondd: „mit tudsz?” és felsorolom, miben segíthetek.'];
  return { text: fallbacks[(rand() * fallbacks.length) | 0] };
}
// repedt kijelzőn a betűk egy része nem látszik (▒) – tiszta függvény, hogy tesztelhető legyen
const crackText = (text, r = rand) => Array.from(text).map(ch => (/\s/.test(ch) || r() >= 0.14 ? ch : '▒')).join('');
function phoneSay(from, text) { phone.log.push({ from, text: from === 'ai' && progress.phoneCracked ? crackText(text) : text }); if (phone.log.length > 40) phone.log.shift(); }
// ===== Eldobható telefon: O – eldobod (a földre esve összetörik a kijelzője), E – felveszed (repedten) =====
const nearestDroppedPhone = () => progress.droppedPhones.find(d => Math.hypot(d.x - player.x, d.y - player.y) < 55);
function dropPhone() {
  if (!controllable() || player.inCar || player.inHouse || player.riding) return false;
  if (!(progress.phone > 0)) { popup('📱 Nincs telefonod, amit eldobhatnál', '#7fe0ff'); return false; }
  let x = player.x + Math.cos(player.angle) * 140, y = player.y + Math.sin(player.angle) * 140;
  if (obstacleAt(x, y)) { x = player.x; y = player.y; }                       // faltól / háztól nem pattan vissza: a lábadnál landol
  progress.droppedPhones.push({ x, y, level: progress.phone });
  if (progress.droppedPhones.length > DROPPED_PHONE_MAX) progress.droppedPhones.shift();
  progress.phone = 0; progress.phoneCracked = false;
  saveProgress(); closePhone();
  explosions.push({ x, y, born: clock - 0.55 });
  popup('📱💥 KRÁKK! Eldobtad a telefont – a kijelzője összetört. (E: felvétel, a telefonbolt megjavítja)', '#ff8a8a');
  alertPeds(x, y);
  return true;
}
function pickUpPhone(d) {
  if (progress.phone > 0) { popup('Már van telefonod – előbb dobd el (O)', '#f66'); return false; }
  progress.droppedPhones.splice(progress.droppedPhones.indexOf(d), 1);
  progress.phone = d.level; progress.phoneCracked = true;                      // a földre esett telefon repedt marad
  saveProgress();
  popup('📱 Felvetted a telefont – a kijelzője repedt (a telefonbolt $30-ért megjavítja)', '#7fe0ff');
  return true;
}
function drawDroppedPhone(d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-6, -10, 18, 28);
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-8, -14, 16, 28, 3); ctx.fill();
  ctx.fillStyle = '#7fe0ff'; ctx.fillRect(-6, -11, 12, 21);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(2, -2); ctx.lineTo(6, 10); ctx.moveTo(2, -2); ctx.lineTo(-6, 6); ctx.moveTo(2, -2); ctx.lineTo(6, -8); ctx.stroke();   // a repedés
  ctx.restore();
  if (Math.hypot(d.x - player.x, d.y - player.y) < 160) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📱 repedt', d.x, d.y - 24); ctx.textAlign = 'left'; }
}
// ===== Telefon-appok (ADR-0041): főképernyő – Robi (csevegés), Játékok (kígyó, repülő), Videók (rövid klipek), Hírek (a játék eseményei) =====
const PHONE_APPS = [{ id: 'chat', icon: '💬', name: 'Robi' }, { id: 'games', icon: '🎮', name: 'Játékok' }, { id: 'videos', icon: '📺', name: 'Videók' }, { id: 'news', icon: '📰', name: 'Hírek' }];
const PHONE_VIDEOS = [{ title: 'Esti híradó', ch: 0, views: 1203 }, { title: 'Peppa a sárban', ch: 1, views: 88401 }, { title: 'Gólgála: Sivatag FC', ch: 2, views: 5120 },
  { title: 'Nagydíj-összefoglaló', ch: 3, views: 3377 }, { title: 'Tornádó-felvétel', ch: 4, views: 20418 }, { title: 'Az utolsó atombomba', ch: 5, views: 99999 }];
const newsLog = [];                                 // a játék eseményei: { t, text } – a Hírek app mutatja
function addNews(text) { newsLog.push({ t: clock, text }); if (newsLog.length > 30) newsLog.shift(); }
// --- kígyó (tiszta lépésfüggvényekkel, hogy tesztelhető legyen) ---
const SNAKE_N = 15, SNAKE_STEP = 0.13;
function snakeFood(g, r = rand) {
  for (let i = 0; i < 400; i++) { const f = { x: (r() * SNAKE_N) | 0, y: (r() * SNAKE_N) | 0 }; if (!g.cells.some(c => c.x === f.x && c.y === f.y)) return f; }
  return { x: 0, y: 0 };
}
function snakeNew(r = rand) { const g = { cells: [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: null, alive: true, score: 0, t: 0, scored: false }; g.food = snakeFood(g, r); return g; }
function snakeSteer(g, dx, dy) { if (dx === -g.dir.x && dy === -g.dir.y) return; g.next = { x: dx, y: dy }; }   // visszafordulni nem lehet
function snakeStep(g, r = rand) {
  if (!g.alive) return;
  g.dir = g.next;
  const h = { x: g.cells[0].x + g.dir.x, y: g.cells[0].y + g.dir.y }, eat = !!g.food && h.x === g.food.x && h.y === g.food.y;
  const body = eat ? g.cells : g.cells.slice(0, -1);                          // a farok helye felszabadul, ha nem nő
  if (h.x < 0 || h.y < 0 || h.x >= SNAKE_N || h.y >= SNAKE_N || body.some(c => c.x === h.x && c.y === h.y)) { g.alive = false; return; }
  g.cells.unshift(h);
  if (eat) { g.score++; g.food = snakeFood(g, r); } else g.cells.pop();
}
// --- repülő („flappy”): Space / ↑ / kattintás – a csövek között kell átjutni ---
const FLAP_W = 300, FLAP_H = 320, FLAP_G = 900, FLAP_JUMP = 300, FLAP_SPEED = 120, FLAP_GAP = 100, FLAP_SPACE = 170, FLAP_BIRD_X = 70;
function flappyNew() { return { y: FLAP_H / 2, vy: 0, pipes: [], score: 0, alive: true, started: false, scored: false }; }
function flappyFlap(g) { if (!g.alive) return; g.started = true; g.vy = -FLAP_JUMP; }
function flappyStep(g, dt, r = rand) {
  if (!g.alive || !g.started) return;
  g.vy += FLAP_G * dt; g.y += g.vy * dt;
  for (const pp of g.pipes) pp.x -= FLAP_SPEED * dt;
  const last = g.pipes[g.pipes.length - 1];
  if (!last || last.x < FLAP_W + 30 - FLAP_SPACE) g.pipes.push({ x: FLAP_W + 30, gap: 70 + r() * (FLAP_H - 140), passed: false });
  g.pipes = g.pipes.filter(pp => pp.x > -40);
  for (const pp of g.pipes) {
    if (!pp.passed && pp.x + 20 < FLAP_BIRD_X) { pp.passed = true; g.score++; }
    if (Math.abs(pp.x - FLAP_BIRD_X) < 20 + 9 && Math.abs(g.y - pp.gap) > FLAP_GAP / 2 - 9) g.alive = false;
  }
  if (g.y < 9 || g.y > FLAP_H - 9) g.alive = false;
}
function recordScore(name, g) {                     // a játék végén: legjobb pontszám a mentésben
  if (g.scored) return; g.scored = true;
  const best = progress.phoneScores[name] || 0;
  if (g.score > best) { progress.phoneScores[name] = g.score; saveProgress(); popup(`🎮 Új rekord: ${g.score} pont!`, '#7fe0ff'); }
}
function openPhone() {
  if (!controllable() || player.inHouse) return false;
  if (!(progress.phone > 0)) { popup('📱 Nincs telefonod – vegyél a telefonboltban (a térképen 📱, a taxi is odavisz)', '#7fe0ff'); return false; }
  phone.open = true; phone.app = 'home'; phone.input = ''; phone.pending = null;
  if (!phone.log.length) phoneSay('ai', 'Szia! Robi vagyok, a telefonod MI-je. 🤖 Kérdezz bármit, vagy mondd: „mit tudsz?”');
  for (const k in keys) keys[k] = false; mouse.down = false;
  return true;
}
function closePhone() { phone.open = false; phone.input = ''; }
function openApp(id) {
  phone.app = id;
  if (id === 'snake') phone.snake = snakeNew();
  if (id === 'flappy') phone.flappy = flappyNew();
  if (id === 'videos') phone.vidT = 0;
}
function phoneBack() { phone.app = phone.app === 'snake' || phone.app === 'flappy' ? 'games' : 'home'; phone.input = ''; }
function sendPhone() {
  const txt = phone.input.trim();
  if (!txt || phone.pending) return false;
  phoneSay('me', txt); phone.input = '';
  phone.pending = { until: phone.t + 0.7, reply: robiReply(txt) };      // „gépel…” egy rövid ideig
  return true;
}
function phoneKey(e) {
  const app = phone.app;
  if (e.code === 'Escape') { if (app === 'home') closePhone(); else phoneBack(); return; }
  if (app === 'chat') {
    if (e.code === 'Enter') sendPhone();
    else if (e.code === 'Backspace') phone.input = phone.input.slice(0, -1);
    else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && phone.input.length < 90) phone.input += e.key;
    return;
  }
  const num = /^(?:Digit|Numpad)([1-9])$/.exec(e.code), n = num ? +num[1] : 0;
  if (app === 'home') { if (n && n <= PHONE_APPS.length) openApp(PHONE_APPS[n - 1].id); }
  else if (app === 'games') { if (n === 1) openApp('snake'); else if (n === 2) openApp('flappy'); }
  else if (app === 'snake') {
    const g = phone.snake, c = e.code;
    if (!g.alive && (c === 'Enter' || c === 'Space')) { phone.snake = snakeNew(); return; }
    if (c === 'ArrowUp' || c === 'KeyW') snakeSteer(g, 0, -1); else if (c === 'ArrowDown' || c === 'KeyS') snakeSteer(g, 0, 1);
    else if (c === 'ArrowLeft' || c === 'KeyA') snakeSteer(g, -1, 0); else if (c === 'ArrowRight' || c === 'KeyD') snakeSteer(g, 1, 0);
  } else if (app === 'flappy') {
    const g = phone.flappy, c = e.code;
    if (!g.alive && (c === 'Enter' || c === 'Space')) { phone.flappy = flappyNew(); return; }
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') flappyFlap(g);
  } else if (app === 'videos') {
    if (n && n <= PHONE_VIDEOS.length) { phone.vid = n - 1; phone.vidT = 0; }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { phone.vid = (phone.vid + 1) % PHONE_VIDEOS.length; phone.vidT = 0; }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { phone.vid = (phone.vid + PHONE_VIDEOS.length - 1) % PHONE_VIDEOS.length; phone.vidT = 0; }
  }
}
function phoneClick(x, y) {
  const h = phone.hits.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
  if (!h) return;
  if (h.close) closePhone(); else if (h.back) phoneBack(); else if (h.app) openApp(h.app);
  else if (h.clip !== undefined) { phone.vid = h.clip; phone.vidT = 0; }
  else if (h.flap) { if (phone.flappy.alive) flappyFlap(phone.flappy); else phone.flappy = flappyNew(); }
}
function tickPhone(dt) {
  phone.t += dt;
  if (phone.app === 'videos') phone.vidT = (phone.vidT || 0) + dt;
  if (phone.app === 'snake' && phone.snake) {
    const g = phone.snake;
    if (g.alive) { g.t += dt; while (g.t >= SNAKE_STEP && g.alive) { g.t -= SNAKE_STEP; snakeStep(g); } }
    if (!g.alive) recordScore('snake', g);
  }
  if (phone.app === 'flappy' && phone.flappy) { flappyStep(phone.flappy, dt); if (!phone.flappy.alive) recordScore('flappy', phone.flappy); }
  if (phone.pending && phone.t >= phone.pending.until) {
    const r = phone.pending.reply; phone.pending = null;
    phoneSay('ai', r.text);
    if (r.pin && (progress.phone || 0) >= 2) { if (progress.pins.length < PIN_MAX) { progress.pins.push({ x: r.pin.x, y: r.pin.y }); saveProgress(); } else phoneSay('ai', `Sajnos már ${PIN_MAX} jelölésed van – töröld a térképen (K, Delete).`); }
    if (r.taxi) callTaxi();
  }
}
// a Hírek app: élő állapotsorok + a legutóbbi események
function newsLive() {
  const out = [];
  if (war) out.push({ c: '#ff8a5a', t: `⚔ Háború dúl ${Math.round(Math.hypot(player.x - war.x, player.y - war.y) / 10)} m-re, ${compass(war.x - player.x, war.y - player.y)} felé${war.nukeArmed ? ' – ☢ ATOMBOMBA KÖZELEG!' : ''}` });
  else out.push({ c: '#8a9', t: `Háború: most nincs (a következő kb. ${Math.max(0, Math.ceil(warClock.left / 60))} perc múlva)` });
  if (occupation) out.push({ c: '#ffd23a', t: `🏴 Megszállt terület van a környéken (${occupation.side === 'A' ? 'zöld' : 'kék'} sereg)` });
  if (tornado) out.push({ c: '#ff8a5a', t: `🌪 Tornádó ${Math.round(Math.hypot(player.x - tornado.x, player.y - tornado.y) / 10)} m-re!` });
  else if (storm.level > 0.5) out.push({ c: '#e0c080', t: '🌪 Homokvihar van' });
  if (aliens.length) out.push({ c: '#7fff7f', t: `👽 ${aliens.length} űrlény üldöz!` });
  out.push({ c: '#9cf', t: `💰 Pénzed: $${Math.floor(progress.money)} · szint: ${levelOf(progress.xp)} · legjobb drift: ${Math.floor(progress.bestDrift || 0)}` });
  return out;
}
const ago = t => { const s = Math.max(0, Math.round(clock - t)); return s < 60 ? `${s} mp` : `${Math.round(s / 60)} perc`; };
function drawPhone(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, h);
  const PW = 360, PH = Math.min(h - 30, 600), px = Math.round((w - PW) / 2), py = Math.round((h - PH) / 2), app = phone.app;
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(px - 10, py - 10, PW + 20, PH + 20, 34); ctx.fill();               // a telefon háza
  ctx.fillStyle = '#e9eef5'; ctx.beginPath(); ctx.roundRect(px, py, PW, PH, 26); ctx.fill();                                // kijelző
  ctx.fillStyle = '#2b6cb0'; ctx.beginPath(); ctx.roundRect(px, py, PW, 54, [26, 26, 0, 0]); ctx.fill();
  const titles = { home: '📱 Főképernyő', chat: '🤖 Robi – MI', games: '🎮 Játékok', snake: '🐍 Kígyó', flappy: '🛩 Repülő', videos: '📺 Videók', news: '📰 Sivatagi Hírek' };
  phone.hits = [{ x: px + PW - 40, y: py + 8, w: 34, h: 38, close: true }];
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
  if (app !== 'home') { phone.hits.push({ x: px + 6, y: py + 8, w: 38, h: 38, back: true }); ctx.fillText('◀', px + 16, py + 33); ctx.fillText(titles[app], px + 52, py + 33); }
  else ctx.fillText(titles.home, px + 18, py + 33);
  ctx.textAlign = 'right'; ctx.font = '13px sans-serif'; ctx.fillText(progress.phone >= 2 ? '📲' : '📱', px + PW - 44, py + 32); ctx.fillText('✕', px + PW - 18, py + 33); ctx.textAlign = 'left';
  const cy0 = py + 66, cH = PH - 80;
  if (app === 'home') {                                                                                                       // 2×2 app-ikon
    PHONE_APPS.forEach((a, i) => {
      const bx = px + 22 + (i % 2) * 160, by = cy0 + 20 + ((i / 2) | 0) * 150, bw = 146, bh = 130;
      ctx.fillStyle = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981'][i]; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '46px sans-serif'; ctx.fillText(a.icon, bx + bw / 2, by + 62); ctx.font = 'bold 16px sans-serif'; ctx.fillText(`${i + 1}: ${a.name}`, bx + bw / 2, by + 106); ctx.textAlign = 'left';
      phone.hits.push({ x: bx, y: by, w: bw, h: bh, app: a.id });
    });
    ctx.fillStyle = '#6b7280'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1–4 vagy kattintás: app megnyitása · Esc: bezár', px + PW / 2, py + PH - 12); ctx.textAlign = 'left';
  } else if (app === 'chat') {
    const wrap = (txt, max) => { const out = []; let line = ''; for (const wd of txt.split(' ')) { if ((line + ' ' + wd).trim().length > max) { if (line) out.push(line); line = wd; } else line = (line + ' ' + wd).trim(); } if (line) out.push(line); return out; };
    const msgs = [...phone.log]; if (phone.pending) msgs.push({ from: 'ai', text: 'gépel…' });
    let y = py + PH - 70;
    ctx.font = '14px sans-serif';
    for (let i = msgs.length - 1; i >= 0 && y > py + 70; i--) {
      const m = msgs[i], lines = wrap(m.text, 30), bh = lines.length * 18 + 14, bw = 270, bx = m.from === 'me' ? px + PW - bw - 14 : px + 14;
      y -= bh + 8;
      ctx.fillStyle = m.from === 'me' ? '#3b82f6' : '#fff'; ctx.beginPath(); ctx.roundRect(bx, y, bw, bh, 12); ctx.fill();
      ctx.fillStyle = m.from === 'me' ? '#fff' : '#1a202c'; lines.forEach((ln, k) => ctx.fillText(ln, bx + 12, y + 20 + k * 18));
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(px + 12, py + PH - 54, PW - 24, 38, 19); ctx.fill();              // beviteli sor
    ctx.strokeStyle = '#cbd5e0'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1a202c'; ctx.font = '15px sans-serif';
    const shown = phone.input.length > 28 ? '…' + phone.input.slice(-27) : phone.input;
    ctx.fillText(shown + (Math.floor(phone.t * 2) % 2 ? '|' : ''), px + 26, py + PH - 29);
    ctx.fillStyle = '#a0aec0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Enter: küldés · Esc: vissza', px + PW / 2, py + PH - 4); ctx.textAlign = 'left';
  } else if (app === 'games') {
    ctx.fillStyle = '#1a202c'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('Válassz játékot:', px + 22, cy0 + 16);
    [['snake', '🐍', 'Kígyó', 'nyilak / WASD'], ['flappy', '🛩', 'Repülő', 'Space / kattintás']].forEach(([id, ic, nm, hint], i) => {
      const by = cy0 + 34 + i * 100;
      ctx.fillStyle = i ? '#0ea5e9' : '#22c55e'; ctx.beginPath(); ctx.roundRect(px + 22, by, PW - 44, 84, 16); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '38px sans-serif'; ctx.fillText(ic, px + 40, by + 56); ctx.font = 'bold 18px sans-serif'; ctx.fillText(`${i + 1}: ${nm}`, px + 100, by + 34);
      ctx.font = '13px sans-serif'; ctx.fillText(`${hint} · rekord: ${progress.phoneScores[id] || 0}`, px + 100, by + 58);
      phone.hits.push({ x: px + 22, y: by, w: PW - 44, h: 84, app: id });
    });
  } else if (app === 'snake') {
    const g = phone.snake, cs = 20, gx = px + (PW - SNAKE_N * cs) / 2, gy = cy0 + 14;
    ctx.fillStyle = '#1f2937'; ctx.fillRect(gx, gy, SNAKE_N * cs, SNAKE_N * cs);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(gx + g.food.x * cs + cs / 2, gy + g.food.y * cs + cs / 2, cs / 2 - 3, 0, Math.PI * 2); ctx.fill();
    g.cells.forEach((c, i) => { ctx.fillStyle = i ? '#22c55e' : '#16a34a'; ctx.fillRect(gx + c.x * cs + 1, gy + c.y * cs + 1, cs - 2, cs - 2); });
    ctx.fillStyle = '#1a202c'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(`Pont: ${g.score}   Rekord: ${progress.phoneScores.snake || 0}`, gx, gy + SNAKE_N * cs + 28);
    if (!g.alive) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(gx, gy, SNAKE_N * cs, SNAKE_N * cs); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('Játék vége', px + PW / 2, gy + 120); ctx.font = '14px sans-serif'; ctx.fillText('Enter: újra', px + PW / 2, gy + 150); ctx.textAlign = 'left'; }
  } else if (app === 'flappy') {
    const g = phone.flappy, gx = px + (PW - FLAP_W) / 2, gy = cy0 + 6;
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(gx, gy, FLAP_W, FLAP_H);
    ctx.fillStyle = '#16a34a'; for (const pp of g.pipes) { ctx.fillRect(gx + pp.x - 20, gy, 40, pp.gap - FLAP_GAP / 2); ctx.fillRect(gx + pp.x - 20, gy + pp.gap + FLAP_GAP / 2, 40, FLAP_H - pp.gap - FLAP_GAP / 2); }
    ctx.save(); ctx.translate(gx + FLAP_BIRD_X, gy + g.y); ctx.rotate(clamp(g.vy / 600, -0.5, 0.8));                          // a „madár” egy kis repülő
    ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-4, -11, 7, 22); ctx.fillStyle = '#7fb6d9'; ctx.fillRect(5, -3, 5, 5); ctx.restore();
    ctx.fillStyle = '#1a202c'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(g.score), px + PW / 2, gy + 28);
    ctx.font = 'bold 14px sans-serif'; ctx.fillText(`Rekord: ${progress.phoneScores.flappy || 0}`, px + PW / 2, gy + FLAP_H + 26);
    if (!g.started) { ctx.fillStyle = '#1a202c'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('Space / kattintás: indulás', px + PW / 2, gy + FLAP_H / 2 + 50); }
    if (!g.alive) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(gx, gy, FLAP_W, FLAP_H); ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('Lezuhantál!', px + PW / 2, gy + 140); ctx.font = '14px sans-serif'; ctx.fillText('Enter / kattintás: újra', px + PW / 2, gy + 170); }
    ctx.textAlign = 'left'; phone.hits.push({ x: gx, y: gy, w: FLAP_W, h: FLAP_H, flap: true });
  } else if (app === 'videos') {
    const v = PHONE_VIDEOS[phone.vid || 0], vw = PW - 28, vh = Math.round(vw * 0.6), vx = px + 14, vy = cy0 + 4;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip(); ctx.translate(vx, vy); ctx.scale(vw / 560, vh / 336);
    drawTvScreen(0, 0, 560, 336, v.ch, phone.vidT || 0); ctx.restore();
    ctx.fillStyle = '#1a202c'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(v.title, vx, vy + vh + 24);
    ctx.fillStyle = '#6b7280'; ctx.font = '12px sans-serif'; ctx.fillText(`👁 ${v.views.toLocaleString ? v.views.toLocaleString('hu-HU') : v.views} megtekintés · 👍 ${Math.round(v.views / 9)}`, vx, vy + vh + 44);
    PHONE_VIDEOS.forEach((c, i) => {
      const bx = vx + (i % 2) * (vw / 2 + 2), by = vy + vh + 56 + ((i / 2) | 0) * 34, bw = vw / 2 - 4;
      ctx.fillStyle = i === (phone.vid || 0) ? '#3b82f6' : '#cbd5e0'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 28, 8); ctx.fill();
      ctx.fillStyle = i === (phone.vid || 0) ? '#fff' : '#1a202c'; ctx.font = '12px sans-serif'; ctx.fillText(`${i + 1}: ${c.title}`.slice(0, 26), bx + 8, by + 18);
      phone.hits.push({ x: bx, y: by, w: bw, h: 28, clip: i });
    });
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1–6 vagy ←→: videóváltás · Esc: vissza', px + PW / 2, py + PH - 10); ctx.textAlign = 'left';
  } else if (app === 'news') {
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.roundRect(px + 18, cy0 + 4, 54, 20, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('● ÉLŐ', px + 26, cy0 + 19);
    let y = cy0 + 44; ctx.font = '13px sans-serif';
    const wrap = (txt, max) => { const out = []; let line = ''; for (const wd of txt.split(' ')) { if ((line + ' ' + wd).trim().length > max) { if (line) out.push(line); line = wd; } else line = (line + ' ' + wd).trim(); } if (line) out.push(line); return out; };
    for (const l of newsLive()) { for (const ln of wrap(l.t, 40)) { ctx.fillStyle = l.c === '#8a9' ? '#374151' : '#1a202c'; ctx.fillText(ln, px + 18, y); y += 18; } y += 4; }
    y += 6; ctx.fillStyle = '#2b6cb0'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('Legfrissebb hírek', px + 18, y); y += 8;
    const recent = newsLog.slice(-8).reverse();
    if (!recent.length) { ctx.fillStyle = '#6b7280'; ctx.font = '13px sans-serif'; ctx.fillText('Még nincs hír – csendes a sivatag.', px + 18, y + 22); }
    for (const nw of recent) {
      const lines = wrap(nw.text, 40); y += 8;
      if (y + lines.length * 17 > py + PH - 14) break;
      ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.fillText(`${ago(nw.t)} ezelőtt`, px + 18, y + 10); y += 14;
      ctx.fillStyle = '#1a202c'; ctx.font = '13px sans-serif'; lines.forEach(ln => { ctx.fillText(ln, px + 18, y + 8); y += 17; });
    }
  }
  if (progress.phoneCracked) {                                                                                               // repedt kijelző: sugaras repedések egy ütközési pontból
    const cx = px + PW * 0.72, cy = py + PH * 0.3;
    ctx.strokeStyle = 'rgba(40,40,60,0.75)'; ctx.lineWidth = 2;
    for (const [a2, l] of [[0.2, 250], [1.1, 190], [1.9, 280], [2.6, 170], [3.4, 230], [4.2, 200], [5.0, 260], [5.7, 150]]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a2) * l, cy + Math.sin(a2) * l * 0.9); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.arc(cx, cy, 70, 0.3, 5.2); ctx.stroke();
    ctx.fillStyle = '#ff8a8a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('💥 repedt kijelző', px + PW - 46, py + 46); ctx.textAlign = 'left';
  }
}

// ===== Tévé: a házakban a tévénél E – 4 csatorna (hírek, mese, foci, autóverseny), menet közben rajzolva =====
const TV_CHANNELS = ['📰 Hírek', '🐷 Mese', '⚽ Foci', '🏎 Autóverseny'];
const tv = { open: false, on: false, ch: 0, t: 0 };
function atTv() {
  const H = player.inHouse; if (!H) return false;
  const f = H.furniture.find(o => o.k === 'tv');
  return !!f && Math.hypot(Math.max(f.x, Math.min(H.ix, f.x + f.w)) - H.ix, Math.max(f.y, Math.min(H.iy, f.y + f.h)) - H.iy) < 70;
}
function openTv() { Object.assign(tv, { open: true, on: true }); for (const k in keys) keys[k] = false; mouse.down = false; }
function closeTv() { tv.open = false; tv.on = false; }   // kilépéskor ki is kapcsol
function tvKey(code) {
  if (code === 'Escape' || code === 'KeyE') closeTv();
  else if (code === 'ArrowRight' || code === 'KeyD') tv.ch = (tv.ch + 1) % TV_CHANNELS.length;
  else if (code === 'ArrowLeft' || code === 'KeyA') tv.ch = (tv.ch + TV_CHANNELS.length - 1) % TV_CHANNELS.length;
  else { const m = /^(?:Digit|Numpad)([1-9])$/.exec(code); if (m && +m[1] <= TV_CHANNELS.length) tv.ch = +m[1] - 1; }
}

// ===== Iskola: a táblánál E – matekóra, 5 feladat, jó válaszonként pénz, hibátlan óráért bónusz =====
const SCHOOL_FURNITURE = [
  { k: 'board', x: 140, y: 16, w: 280, h: 18 }, { k: 'tdesk', x: 240, y: 56, w: 80, h: 34 },
  ...[70, 160, 350, 440].flatMap(x => [160, 230].map(y => ({ k: 'desk', x, y, w: 50, h: 30 }))),
  { k: 'plant', x: 30, y: 30, w: 34, h: 34 }, { k: 'radio', x: ROOM_W - 70, y: 22, w: 38, h: 22 },
];
const LESSON_LEN = 5, ANSWER_PAY = 5, LESSON_BONUS = 25, LESSON_BREAK = 60;
// a gonosz tanár: rossz válaszért büntet és leszól, siettet (QUESTION_TIME mp / feladat), a rohangálót üldözi és kidobja
const WRONG_FINE = 2, QUESTION_TIME = 10, RUN_FINE = 5, TEACHER_HOME = { x: 495, y: 112 }, TEACHER_CHASE = 170, TEACHER_WALK = 80;
const SHOUT = 'IDIÓTA VAGY!';                     // amit a tanár ordít
// ordítás hangja: rövid, recsegő, lefelé csúszó kiabálás (Web Audio, hangfájl nélkül, ADR-0026)
function teacherShout() {
  const ac = audioOut(); if (!ac) return;
  const t = ac.currentTime;
  for (const [f0, dl] of [[320, 0], [260, 0.22]]) {   // „idi-óta!” – két szótag
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t + dl); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dl + 0.3);
    g.gain.setValueAtTime(0.5, t + dl); g.gain.exponentialRampToValueAtTime(0.001, t + dl + 0.32);
    o.connect(g); g.connect(radio.out); o.start(t + dl); o.stop(t + dl + 0.34);
  }
}
const TAUNTS = ['Ezt még egy óvodás is tudja!', 'Egyes! Ülj le!', 'Hát te semmit sem tanultál?', 'Pfuj, de buta vagy!', 'Majd a szüleidnek is elmondom!'];
const fine = n => { const f = Math.min(Math.max(0, Math.floor(progress.money) || 0), n); progress.money -= f; saveProgress(); return f; };   // sosem megy mínuszba
function newTeacher() { return { x: TEACHER_HOME.x, y: TEACHER_HOME.y, angle: Math.PI / 2, walk: 0, chase: 0 }; }
function updateTeacher(dt) {
  const H = player.inHouse, T = H.teacher;
  const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
  if (moving && (keys.ShiftLeft || keys.ShiftRight)) {
    if (!T.chase) { popup(`👩‍🏫 „${SHOUT} NE ROHANGÁLJ!” – a gonosz tanár üldöz!`, '#f66'); teacherShout(); }
    T.chase = 2;                                       // a rohanás után még 2 mp-ig üldöz
  } else T.chase = Math.max(0, T.chase - dt);
  const tx = T.chase ? H.ix : TEACHER_HOME.x, ty = T.chase ? H.iy : TEACHER_HOME.y, d = Math.hypot(tx - T.x, ty - T.y);
  if (d > 2) {
    const sp = Math.min(d, (T.chase ? TEACHER_CHASE : TEACHER_WALK) * dt);
    T.x += (tx - T.x) / d * sp; T.y += (ty - T.y) / d * sp; T.angle = Math.atan2(ty - T.y, tx - T.x); T.walk += sp / 12;
    const o = { x: T.x, y: T.y, r: 12 };                // a padokon nem megy át
    for (const f of H.furniture) pushOutOfRect(o, { x0: f.x, y0: f.y, x1: f.x + f.w, y1: f.y + f.h });
    T.x = o.x; T.y = o.y;
  } else if (!T.chase) T.angle = Math.atan2(H.iy - T.y, H.ix - T.x);   // otthon: téged figyel
  if (T.chase && Math.hypot(H.ix - T.x, H.iy - T.y) < 26) {              // elkapott: kidob és elkobozza a pénzed
    const f = fine(RUN_FINE);
    exitHouse();
    school.nextAt = clock + LESSON_BREAK;
    teacherShout();
    popup(`👩‍🏫 „${SHOUT}” – a gonosz tanár kidobott, mert rohangáltál!${f ? ` (elkobzott $${f})` : ''}`, '#f66');
  }
}   // óra után 60 mp szünet (ne lehessen végtelenül pénzt gyűjteni)
const atBlackboard = () => player.inHouse && player.inHouse.hs.school && player.inHouse.iy < 140 && player.inHouse.ix > 120 && player.inHouse.ix < 440;
// tiszta függvény: egy feladat a véletlenszám-forrásból (r() 0..1) – tesztelhető
function makeQuestion(r) {
  const op = ['+', '−', '×'][(r() * 3) | 0];
  let a = 2 + ((r() * 18) | 0), b = 2 + ((r() * 9) | 0);
  if (op === '−' && b > a) [a, b] = [b, a];
  const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
  const wrong = new Set();
  for (const d of [1, -1, 2, -2, 10, -10, 3]) { if (wrong.size < 2 && ans + d >= 0 && r() < 0.7) wrong.add(ans + d); }
  for (const d of [1, -1, 2]) if (wrong.size < 2 && ans + d >= 0) wrong.add(ans + d);
  const opts = [ans, ...wrong];
  for (let i = opts.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [opts[i], opts[j]] = [opts[j], opts[i]]; }   // keverés
  return { text: `${a} ${op} ${b} = ?`, ans, opts };
}
const school = { open: false, q: null, n: 0, correct: 0, feedback: null, nextAt: 0, timeLeft: QUESTION_TIME, taunt: null };
const breakLeft = () => Math.max(0, Math.ceil(school.nextAt - clock));
function openSchool() {
  if (breakLeft() > 0) { popup(`🔔 Szünet van – a következő óra ${breakLeft()} mp múlva`, '#ffd23a'); return false; }
  Object.assign(school, { open: true, n: 0, correct: 0, feedback: null, taunt: null, timeLeft: QUESTION_TIME, q: makeQuestion(Math.random) });
  for (const k in keys) keys[k] = false; mouse.down = false;
}
function closeSchool() { if (school.open) school.nextAt = clock + LESSON_BREAK; school.open = false; }   // abbahagyás után is szünet
function answerQuestion(i, next = Math.random) {
  if (!school.open || !school.q || !school.q.opts[i] && school.q.opts[i] !== 0) return false;
  return resolveAnswer(school.q.opts[i] === school.q.ans, next);
}
function resolveAnswer(ok, next = Math.random, late = false) {
  if (ok) { school.correct++; earn(ANSWER_PAY, 'jó válasz ✏️'); school.taunt = null; }
  else {                                               // a gonosz tanár büntet és leszól
    const f = fine(WRONG_FINE);
    school.taunt = `${SHOUT} ` + (late ? 'Lassú vagy, mint a csiga! ' : '') + TAUNTS[school.n % TAUNTS.length];
    teacherShout();
    popup(`👩‍🏫 ${late ? 'Lejárt az idő' : 'Rossz válasz'}!${f ? ` Büntetés: -$${f}` : ''} (helyesen: ${school.q.ans})`, '#f66');
  }
  school.feedback = { ok, ans: school.q.ans };
  school.timeLeft = QUESTION_TIME;
  school.n++;
  if (school.n >= LESSON_LEN) {                         // vége az órának
    if (school.correct === LESSON_LEN) earn(LESSON_BONUS, 'hibátlan óra – ötös! 🏅');
    else popup(`🏫 Vége az órának: ${school.correct}/${LESSON_LEN} jó válasz`, '#ffd23a');
    closeSchool();
  } else school.q = makeQuestion(next);
  return ok;
}
function tickSchool(dt) {                            // a tanár siettet: lejárt idő = rossz válasz
  school.timeLeft -= dt;
  if (school.timeLeft <= 0) resolveAnswer(false, Math.random, true);
}
function schoolKey(code) {
  if (code === 'Escape') closeSchool();
  const m = /^(?:Digit|Numpad)([1-3])$/.exec(code);
  if (m) answerQuestion(+m[1] - 1);
}
function schoolClick(x, y) {
  for (const h of school.hits || []) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { answerQuestion(h.i); return; }
}

// ===== Bolt: a pultnál E – csoki, szendvics, elsősegély, kávé, benzinkanna, bomba, sorsjegy =====
const SHOP_FURNITURE = [
  { k: 'shopcounter', x: 100, y: 20, w: 360, h: 44 },
  { k: 'shelf', x: 24, y: 110, w: 40, h: 170 }, { k: 'shelf', x: ROOM_W - 64, y: 110, w: 40, h: 170 },
  { k: 'shelf', x: 150, y: 150, w: 90, h: 34 }, { k: 'shelf', x: ROOM_W - 240, y: 150, w: 90, h: 34 },
  { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
const LOTTERY_PRIZE = 20, LOTTERY_CHANCE = 0.2;
const lotteryPrize = roll => (roll < LOTTERY_CHANCE ? LOTTERY_PRIZE : 0);   // tiszta függvény: tesztelhető
// az árucikkek hatása mezőkkel: heal (élet), sober (józanodás); a többit az id dönti el
const SHOP_ITEMS = [
  { id: 'choc', icon: '🍫', name: 'Csoki', price: 2, info: '+20 élet', heal: 20 },
  { id: 'sandwich', icon: '🥪', name: 'Szendvics', price: 5, info: '+50 élet', heal: 50 },
  { id: 'medkit', icon: '🩹', name: 'Elsősegélycsomag', price: 15, info: 'teljes élet', heal: 100 },
  { id: 'coffee', icon: '☕', name: 'Kávé', price: 3, info: 'kijózanít', sober: 50 },
  { id: 'fuel', icon: '⛽', name: 'Benzinkanna', price: 30, info: '+50% benzin az autódba' },
  { id: 'bomb', icon: '💣', name: 'Bomba', price: 50, info: '+1 bomba' },
  { id: 'ticket', icon: '🎟', name: 'Sorsjegy', price: 5, info: `${Math.round(LOTTERY_CHANCE * 100)}% eséllyel $${LOTTERY_PRIZE}` },
];
// Autószerelő (ADR-0031): tuning-szint és fényezés autómodellenként, a mentésben (progress.tuning / progress.paint, index = CAR_MODELS sorszám)
const TUNE_MAX = 3, TUNE_SPEED = 0.08, TUNE_ACCEL = 0.1;
const PAINTS = [['#d42020', '#a31515'], ['#2f6fd0', '#1f4f9a'], ['#3a9a4a', '#257035'], ['#f2c230', '#c09010'], ['#111', '#333'],
  ['#f5f5f5', '#cfcfcf'], ['#ff8fc8', '#d0609a'], ['#8a3ad0', '#5a1f8a'], ['#ff7a1a', '#c85a08'], ['#20c8c8', '#108a8a']];
// ===== Telefonok (ADR-0037): a telefonboltban vehető; P – telefon, csetelés Robival, a beépített „MI”-vel =====
const PHONE_ITEMS = [
  { id: 'phone1', icon: '📱', name: 'Egyszerű telefon', price: 60, info: 'Robi: kérdések, tippek, viccek' },
  { id: 'phone2', icon: '📲', name: 'Okostelefon', price: 200, info: 'Robi: + jelölés a térképre, taxi hívása' },
  { id: 'phonefix', icon: '🔧', name: 'Kijelzőjavítás', price: 30, info: 'a repedt kijelző újra ép' },
];
const PHONE_FURNITURE = [
  { k: 'shopcounter', x: 100, y: 20, w: 360, h: 44 },
  { k: 'shelf', x: 24, y: 120, w: 40, h: 150 }, { k: 'shelf', x: ROOM_W - 64, y: 120, w: 40, h: 150 },
  { k: 'ptable', x: 190, y: 160, w: 180, h: 40 }, { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
// ===== Étterem: a pultnál E – ételek, italok (életet adnak, a gulyás józanít is) =====
const RESTAURANT_ITEMS = [
  { id: 'cola', icon: '🥤', name: 'Kóla', price: 2, info: '+10 élet', heal: 10 },
  { id: 'soup', icon: '🍜', name: 'Leves', price: 4, info: '+30 élet', heal: 30 },
  { id: 'cake', icon: '🍰', name: 'Torta', price: 4, info: '+25 élet', heal: 25 },
  { id: 'burger', icon: '🍔', name: 'Hamburger', price: 6, info: '+60 élet', heal: 60 },
  { id: 'gulyas', icon: '🍲', name: 'Gulyásleves', price: 7, info: '+50 élet és kijózanít', heal: 50, sober: 50 },
  { id: 'pizza', icon: '🍕', name: 'Pizza', price: 9, info: 'teljes élet', heal: 100 },
];
const RESTAURANT_FURNITURE = [
  { k: 'rcounter', x: 100, y: 20, w: 360, h: 44 },
  ...[[60, 150], [60, 240], [420, 150], [420, 240]].map(([x, y]) => ({ k: 'rtable', x, y, w: 70, h: 50 })),
  { k: 'plant', x: 260, y: 160, w: 34, h: 34 }, { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
// ===== Autószerelő (ADR-0031): tuning (3 szint), fényezés, nitró – az autódnak a műhely előtt kell lennie =====
const MECHANIC_REACH = 450;
const tunePrice = () => 400 * ((car.tune || 0) + 1);
const MECHANIC_ITEMS = [
  { id: 'tune', icon: '🔧', name: 'Tuning (+1 szint)', get price() { return tunePrice(); }, info: `+${TUNE_SPEED * 100}% sebesség, +${TUNE_ACCEL * 100}% gyorsulás` },
  { id: 'paint', icon: '🎨', name: 'Új fényezés', price: 40, info: 'új szín az autódnak' },
  { id: 'nitro', icon: '🚀', name: 'Nitró feltöltés', price: 15, info: 'tele nitró (nitrós autóba)' },
];
const MECHANIC_FURNITURE = [
  { k: 'shopcounter', x: 100, y: 20, w: 360, h: 44 },
  { k: 'lift', x: 30, y: 120, w: 150, h: 170 }, { k: 'tools', x: ROOM_W - 70, y: 110, w: 46, h: 120 },
  { k: 'tires', x: ROOM_W - 150, y: 250, w: 50, h: 50 }, { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
const STORES = {
  shop: { title: '🛒 Bolt', color: '#c9f', items: SHOP_ITEMS, prompt: '🛒 E: vásárlás (csoki, szendvics, elsősegély, kávé, benzin, bomba, sorsjegy)' },
  restaurant: { title: '🍽 Étterem', color: '#ffb060', items: RESTAURANT_ITEMS, prompt: '🍽 E: rendelés (kóla, leves, torta, hamburger, gulyás, pizza)' },
  mechanic: { title: '🔧 Autószerelő', color: '#7df', items: MECHANIC_ITEMS, prompt: '🔧 E: autószerelő (tuning, fényezés, nitró)' },
  phone: { title: '📱 Telefonbolt', color: '#7fe0ff', items: PHONE_ITEMS, prompt: '📱 E: telefonok (egyszerű $60, okostelefon $200)' },
};
const storeKind = hs => (hs.shop ? 'shop' : hs.restaurant ? 'restaurant' : hs.mechanic ? 'mechanic' : hs.phoneShop ? 'phone' : null);
const atShopCounter = () => !!(player.inHouse && storeKind(player.inHouse.hs) && player.inHouse.iy < 20 + 44 + 50 && player.inHouse.ix > 90 && player.inHouse.ix < 470);
const shop = { open: false, sel: 0, hits: [], kind: 'shop', items: SHOP_ITEMS };
function openShop() {
  const kind = storeKind(player.inHouse.hs);
  Object.assign(shop, { open: true, sel: 0, kind, items: STORES[kind].items }); for (const k in keys) keys[k] = false; mouse.down = false;
}
function closeShop() { shop.open = false; }
const ownTank = () => (car.rental ? car.ownFuel || 0 : car.fuel);   // a kanna mindig a SAJÁT autódba megy (bérléskor is)
// mi akadályozza a vásárlást (null = semmi) – így a pénzt csak akkor vonjuk le, ha van értelme
const carNearShop = () => player.inHouse && dist(car, doorOf(player.inHouse.hs)) < MECHANIC_REACH;
function shopBlocker(it) {
  const full = player.health >= 100, sober = (player.drunk || 0) <= 0;
  if (it.heal && it.sober) return full && sober ? 'Teljes az életed, és józan vagy' : null;
  if (it.heal) return full ? 'Teljes az életed' : null;
  if (it.sober) return sober ? 'Józan vagy' : null;
  if (it.id === 'phonefix') return !(progress.phone > 0) ? 'Nincs telefonod' : !progress.phoneCracked ? 'Nem törött a kijelződ' : null;
  if (it.id === 'phone1' || it.id === 'phone2') return (progress.phone || 0) >= (it.id === 'phone2' ? 2 : 1) ? 'Már van ilyen vagy jobb telefonod' : null;
  if (it.id === 'tune' || it.id === 'paint' || it.id === 'nitro') {
    if (car.rental) return 'Bérautón nem dolgozunk';
    if (!carNearShop()) return 'Hozd az autódat a műhely elé';
    if (it.id === 'tune' && (car.tune || 0) >= TUNE_MAX) return 'Már a legjobb tuning van rajta';
    if (it.id === 'nitro') return !car.nitroCfg ? 'Csak nitrós autóba' : car.nitro >= 99.9 ? 'Tele a nitró' : null;
  }
  if (it.id === 'fuel') return ownTank() >= 99.9 ? 'Tele a tankod' : null;
  if (it.id === 'bomb') return bombInv.count >= BOMB_MAX ? `Már ${BOMB_MAX} bombád van` : null;
  return null;
}
function buyItem(i, roll = Math.random()) {
  const it = shop.items[i];
  if (!it || !atShopCounter() || !controllable()) return false;
  const why = shopBlocker(it);
  if (why) { popup(`${it.icon} ${why} – most nem kell`, '#f66'); return false; }
  if (!(progress.money >= it.price)) { popup(`${it.icon} ${it.name}: $${it.price} – nincs elég pénzed!`, '#f66'); return false; }
  progress.money -= it.price;
  if (it.heal) player.health = Math.min(100, player.health + it.heal);
  if (it.sober) player.drunk = Math.max(0, (player.drunk || 0) - it.sober);
  if (it.id === 'tune' || it.id === 'paint') {                  // a mentett autóadatba kerül, és rögtön látszik
    const mi = progress.activeCar;
    if (it.id === 'tune') progress.tuning[mi] = (progress.tuning[mi] || 0) + 1;
    else { const cur = progress.paint[mi]; let k = Math.floor(roll * PAINTS.length) % PAINTS.length; while (k === cur || PAINTS[k][0] === car.color[0]) k = (k + 1) % PAINTS.length; progress.paint[mi] = k; }
    applyCarModel(car, CAR_MODELS[mi]);
  }
  if (it.id === 'nitro') car.nitro = 100;
  if (it.id === 'phone1' || it.id === 'phone2') { progress.phone = Math.max(progress.phone || 0, it.id === 'phone2' ? 2 : 1); progress.phoneCracked = false; popup('📱 Új telefon! P: megnyitod, és cseteleghetsz Robival', '#7fe0ff'); }   // az új telefon ép
  if (it.id === 'phonefix') { progress.phoneCracked = false; popup('🔧 Kijavították a kijelzőt – újra ép!', '#7fe0ff'); }
  if (it.id === 'fuel') { if (car.rental) car.ownFuel = Math.min(100, ownTank() + 50); else car.fuel = Math.min(100, car.fuel + 50); }
  if (it.id === 'bomb') bombInv.count++;
  saveProgress();
  if (it.id === 'ticket') {
    const win = lotteryPrize(roll);
    if (win) earn(win, '🎟 nyertes sorsjegy!'); else popup('🎟 Sajnos nem nyert – próbáld újra!', '#ccc');
  } else popup(`${it.icon} Megvetted: ${it.name} (-$${it.price})`, '#7f7');
  return true;
}
function shopKey(code) {
  if (code === 'Escape') closeShop();
  else if (code === 'ArrowUp' || code === 'KeyW') shop.sel = (shop.sel + shop.items.length - 1) % shop.items.length;
  else if (code === 'ArrowDown' || code === 'KeyS') shop.sel = (shop.sel + 1) % shop.items.length;
  else if (code === 'Enter' || code === 'Space') buyItem(shop.sel);
  else { const m = /^(?:Digit|Numpad)([1-9])$/.exec(code); if (m && +m[1] <= shop.items.length) { shop.sel = +m[1] - 1; buyItem(shop.sel); } }
}
function shopClick(x, y) {
  for (const h of shop.hits) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { if (h.cancel) closeShop(); else { shop.sel = h.i; buyItem(h.i); } return; }
}

// ===== Bank (ADR-0028): hitel $100–$2000, 20% díj, egyszerre egy; tartozás alatt a kereset 25%-a törleszt =====
const LOAN_MIN = 100, LOAN_MAX = 2000, LOAN_STEP = 100, LOAN_FEE = 0.2, AUTO_REPAY = 0.25;
const BANK_FURNITURE = [
  { k: 'counter', x: 100, y: 20, w: 360, h: 44 }, { k: 'vault', x: ROOM_W - 90, y: 120, w: 60, h: 90 },
  { k: 'plant', x: 30, y: 120, w: 34, h: 34 }, { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
const atBankCounter = () => player.inHouse && player.inHouse.hs.bank && player.inHouse.iy < 20 + 44 + 50 && player.inHouse.ix > 90 && player.inHouse.ix < 470;
const bank = { open: false, amount: 500, hits: [] };
function openBank() { Object.assign(bank, { open: true, amount: 500 }); for (const k in keys) keys[k] = false; mouse.down = false; }
function closeBank() { bank.open = false; }
function takeLoan() {
  if ((progress.debt || 0) > 0) { popup('Már van hiteled – előbb törleszd!', '#f66'); return false; }
  const amt = clamp(bank.amount, LOAN_MIN, LOAN_MAX);
  progress.money += amt;
  progress.debt = Math.round(amt * (1 + LOAN_FEE));
  saveProgress();
  popup(`🏦 Felvettél $${amt} hitelt – tartozás: $${progress.debt}`, '#7df');
  closeBank();
  return true;
}
function repayLoan() {
  const pay = Math.min(Math.floor(progress.money), progress.debt || 0);
  if (pay <= 0) { popup((progress.debt || 0) > 0 ? 'Nincs pénzed a törlesztéshez!' : 'Nincs tartozásod', '#f66'); return false; }
  progress.money -= pay; progress.debt -= pay; saveProgress();
  popup(progress.debt > 0 ? `🏦 Törlesztettél $${pay}-t – maradt: $${progress.debt}` : `🏦 Kifizetted a hiteled ($${pay})!`, '#7f7');
  closeBank();
  return true;
}
function bankKey(code) {
  if (code === 'Escape') closeBank();
  else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowUp' || code === 'KeyW') bank.amount = clamp(bank.amount + LOAN_STEP, LOAN_MIN, LOAN_MAX);
  else if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowDown' || code === 'KeyS') bank.amount = clamp(bank.amount - LOAN_STEP, LOAN_MIN, LOAN_MAX);
  else if (code === 'Digit1' || code === 'Numpad1' || code === 'Enter') takeLoan();
  else if (code === 'Digit2' || code === 'Numpad2') repayLoan();
}
function bankClick(x, y) {
  for (const h of bank.hits) {
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      if (h.loan) takeLoan(); else if (h.repay) repayLoan(); else if (h.cancel) closeBank();
      else bank.amount = clamp(bank.amount + h.delta, LOAN_MIN, LOAN_MAX);
      return;
    }
  }
}

// ===== Gyár: futószalag sós zacskókkal; Space: felvesz / dobozba tesz =====
const FACTORY_WAGE = 500, WAGE_PERIOD = 60;   // fizetés: $500 percenként – ha abban a percben dolgoztál (legalább 1 zacskót bepakoltál)
const BOX_SIZE = 10, BAG_EVERY = 2.2, BELT_SPEED = 45;
const BELT = { x0: 60, x1: 500, y: 60, h: 40 };
const FACTORY_FURNITURE = [
  { k: 'belt', x: BELT.x0, y: BELT.y, w: BELT.x1 - BELT.x0, h: BELT.h },
  { k: 'box', x: 50, y: 230, w: 60, h: 60 }, { k: 'box', x: 150, y: 230, w: 60, h: 60 }, { k: 'box', x: ROOM_W - 110, y: 230, w: 60, h: 60 },
  { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
function newFactory() { return { bags: [], carrying: false, nextBag: 0.5, boxes: [0, 0, 0], packed: 0, lost: 0, shift: 0, minutePacked: 0 }; }
function updateFactory(dt) {
  const F = player.inHouse.factory;
  F.shift += dt;                                       // percenként fizetés
  if (F.shift >= WAGE_PERIOD) {
    F.shift -= WAGE_PERIOD;
    if (F.minutePacked > 0) earn(FACTORY_WAGE, 'gyári fizetés 💵');
    else popup('Ebben a percben nem dolgoztál – nincs fizetés', '#f66');
    F.minutePacked = 0;
  }
  F.nextBag -= dt;
  if (F.nextBag <= 0) { F.bags.push({ x: BELT.x0 + 10, color: ['#f2c230', '#e05a5a', '#5ab0e0'][F.bags.length % 3] }); F.nextBag = BAG_EVERY; }
  for (const b of F.bags) b.x += BELT_SPEED * dt;
  const lost = F.bags.filter(b => b.x > BELT.x1 - 6).length;
  if (lost) { F.lost += lost; F.bags = F.bags.filter(b => b.x <= BELT.x1 - 6); popup(`Leesett ${lost} zacskó a szalag végén!`, '#f66'); }
}
const factoryBoxes = () => FACTORY_FURNITURE.filter(f => f.k === 'box');
function nearBag() {
  const H = player.inHouse;
  return H && H.factory && H.factory.bags.find(b => Math.hypot(b.x - H.ix, BELT.y + BELT.h / 2 - H.iy) < 50);
}
function nearBox() {
  const H = player.inHouse;
  if (!H || !H.factory) return -1;
  return factoryBoxes().findIndex(f => Math.hypot(Math.max(f.x, Math.min(H.ix, f.x + f.w)) - H.ix, Math.max(f.y, Math.min(H.iy, f.y + f.h)) - H.iy) < 30);
}
function factoryAction() {
  const H = player.inHouse;
  if (!H || !H.factory || !controllable()) return false;
  const F = H.factory;
  if (!F.carrying) {
    const b = nearBag();
    if (!b) return false;
    F.bags.splice(F.bags.indexOf(b), 1); F.carrying = true;
    return true;
  }
  const bi = nearBox();
  if (bi < 0) return false;
  F.carrying = false; F.boxes[bi]++; F.packed++; F.minutePacked++;
  if (F.boxes[bi] >= BOX_SIZE) { F.boxes[bi] = 0; popup('📦 Tele a doboz – jön az üres!', '#ffd23a'); }
  return true;
}

const PUB_FURNITURE = [
  { k: 'bar', x: 120, y: 20, w: 320, h: 40 },
  ...[150, 210, 270, 330, 390].map(x => ({ k: 'stool', x: x - 10, y: 76, w: 20, h: 20 })),
  { k: 'table', x: 40, y: 160, w: 70, h: 70 }, { k: 'table', x: ROOM_W - 110, y: 160, w: 70, h: 70 },
  { k: 'radio', x: 30, y: 22, w: 38, h: 22 },
];
const atBar = () => player.inHouse && player.inHouse.hs.pub && player.inHouse.iy < 20 + 40 + 70 && player.inHouse.ix > 110 && player.inHouse.ix < 450;
const DRUNK_DECAY = 1.2;      // ennyit józanodsz másodpercenként
const DRUNK_DRIVE = 1;        // ittasan (már egy ital után is) vezetni ittas vezetés – a rendőrség üldöz

function buyDrink(kind) {
  const d = DRINKS[kind];
  if (!atBar() || !controllable()) return false;      // ájultan (vagy holtan) nem lehet inni
  if (progress.money < d.price) { popup(`A ${d.name} $${d.price} – nincs elég pénzed!`, '#f66'); return false; }
  progress.money -= d.price; saveProgress();
  player.drunk = Math.min(100, (player.drunk || 0) + d.drunk);
  popup(`🍺 Ittál egy ${d.name}t (-$${d.price})`, '#ffd23a');
  if (player.drunk >= 100) passOut();
  return true;
}

// túl sokat ittál: elájulsz, és pár mp múlva a kocsma előtt térsz magadhoz
function passOut() {
  player.passedOut = 5;
  message = { text: 'BERÚGTÁL – ELÁJULTÁL…', until: clock + 5, color: '#c9a' };
}
function wakeUp() {
  if (player.inHouse) { Object.assign(player, doorOf(player.inHouse.hs)); player.inHouse = null; stopRadio(); }
  player.drunk = 40; player.passedOut = 0;
  popup('😵 Magadhoz tértél a kocsma előtt', '#c9a');
}
const drunkK = () => clamp(((player.drunk || 0) - 25) / 75, 0, 1);   // 0: józan … 1: nagyon részeg

function enterHouse(hs) {
  player.inHouse = { hs, ix: ROOM_W / 2, iy: ROOM_H - 50, furniture: furnitureOf(hs), factory: hs.factory ? newFactory() : null, teacher: hs.school ? newTeacher() : null };
  Object.assign(player, doorOf(hs));
  popup(hs.pub ? '🍺 Bementél a kocsmába – a pultnál ihatsz' : hs.bank ? '🏦 Bementél a bankba – a pultnál E' : hs.factory ? '🏭 Bementél a gyárba – pakold a zacskókat (Space)' : hs.shop ? '🛒 Bementél a boltba – a pultnál E' : hs.school ? '🏫 Bementél az iskolába – vigyázz a gonosz tanárral, ne rohangálj!' : hs.restaurant ? '🍽 Bementél az étterembe – a pultnál E: rendelés' : hs.mechanic ? '🔧 Bementél az autószerelőhöz – a pultnál E' : hs.phoneShop ? '📱 Bementél a telefonboltba – a pultnál E' : '🏠 Bementél a házba – itt nem talál meg a rendőrség', '#7df');
  startRadio();
}
function exitHouse() {
  Object.assign(player, doorOf(player.inHouse.hs));
  const hs = player.inHouse.hs;
  player.angle = hs.axis === 'h' ? Math.atan2(hs.road - player.y, 0) : Math.atan2(0, hs.road - player.x);   // az út felé
  player.inHouse = null;
  stopRadio();
}
const atInnerDoor = () => player.inHouse && player.inHouse.iy > ROOM_H - ROOM_WALL - 40 && Math.abs(player.inHouse.ix - ROOM_W / 2) < 45;

function updateInterior(dt) {
  const H = player.inHouse;
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my), sp = keys.ShiftLeft || keys.ShiftRight ? 220 : 130;
    const sway = Math.sin(clock * 3.1) * 70 * drunkK();                          // részegen imbolyog
    H.ix += ((mx / len) * sp + (-my / len) * sway) * dt; H.iy += ((my / len) * sp + (mx / len) * sway) * dt;
    player.angle = Math.atan2(my, mx); player.walk += dt * sp / 12;
  }
  const o = { x: clamp(H.ix, ROOM_WALL + 12, ROOM_W - ROOM_WALL - 12), y: clamp(H.iy, ROOM_WALL + 12, ROOM_H - ROOM_WALL - 12), r: 12 };
  for (const f of H.furniture) pushOutOfRect(o, { x0: f.x, y0: f.y, x1: f.x + f.w, y1: f.y + f.h });   // a fal után a bútor tol ki
  H.ix = o.x; H.iy = o.y;
}

// A tornádó által lerombolt házak (ADR-0024): a játékmenet idejére megmaradnak, a helyükön rom van.
const destroyedHouses = new Map();   // id → ház (a romok rajzolásához)
function destroyHouse(hs, killMsg = 'ELVITT A TORNÁDÓ!') {
  destroyedHouses.set(hs.id, hs);
  if (player.inHouse && player.inHouse.hs.id === hs.id) {          // a házzal együtt téged is
    player.inHouse = null; stopRadio();
    closeTv(); closeShop(); closeSchool(); closeBank();          // a házzal együtt a nyitott ablak is eltűnik
    damagePlayer(10000); message = { text: killMsg, until: clock + 3, color: '#ff6a3a' };
  }
  const ch = chunkCache.get(Math.floor(hs.x / CHUNK) + ',' + Math.floor(hs.y / CHUNK));   // a már legenerált chunkból is kivesszük
  if (ch) ch.obstacles = ch.obstacles.filter(o => !(o.type === 'house' && o.x === hs.x && o.y === hs.y));
}

function insideHouse(x, y, pad = 0) {
  return housesIn(x - pad, y - pad, x + pad, y + pad).some(o => x > o.x0 - pad && x < o.x1 + pad && y > o.y0 - pad && y < o.y1 + pad);
}

// ===== Parkolók autóbérléssel: minden buszmegálló mellett egy (ADR-0022) =====
const RENT_PRICE = 15;
const RENTAL_MODEL = { name: 'Bérautó', type: 'rental', color: ['#f4f4f4', '#c8c8c8'], len: 72, wid: 36, accel: 400, maxRoad: 580, maxSand: 360, sandDrag: 0.9, fuelUse: 0.9 };
const HU_FLAG = ['#CD2A3E', '#FFFFFF', '#436F4D'];   // a magyar zászló színei: piros, fehér, zöld
const rentedLots = new Set();                       // a már kibérelt parkolók (ott üres a hely)
const stopKey = bs => `${bs.axis}:${bs.road}:${bs.along}:${bs.side}`;

// a parkoló a megálló utáni részen, a járdán túl (az úttól távolodva) van; a bérautó a 2. helyen áll
function parkingLot(bs) {
  const a0 = bs.along + 60, a1 = bs.along + 260, d0 = EDGE + 8, d1 = EDGE + 128;
  const spotA = a0 + 25 + 50, spotD = (d0 + d1) / 2;
  const toXY = (a, d) => bs.axis === 'h' ? { x: a, y: bs.road + bs.side * d } : { x: bs.road + bs.side * d, y: a };
  const p = toXY(a0, d0), q = toXY(a1, d1), sp = toXY(spotA, spotD);
  const angle = bs.axis === 'h' ? (bs.side > 0 ? -Math.PI / 2 : Math.PI / 2) : (bs.side > 0 ? Math.PI : 0);   // orral az út felé
  return { bs, key: stopKey(bs), x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y),
    spot: { x: sp.x, y: sp.y, angle }, flag: toXY(bs.along - 44, EDGE - 8) };
}

function lotsIn(xa, ya, xb, yb) {
  return busStopsIn(xa - 400, ya - 400, xb + 400, yb + 400).map(parkingLot)
    .filter(l => l.x1 >= xa && l.x0 <= xb && l.y1 >= ya && l.y0 <= yb);
}

function insideLot(x, y, pad = 0) {
  return lotsIn(x - pad, y - pad, x + pad, y + pad).some(l => x > l.x0 - pad && x < l.x1 + pad && y > l.y0 - pad && y < l.y1 + pad);
}

function nearestRentable() {
  return lotsIn(player.x - 100, player.y - 100, player.x + 100, player.y + 100)
    .find(l => !rentedLots.has(l.key) && Math.hypot(player.x - l.spot.x, player.y - l.spot.y) < 70);
}

// ===== Lovak (ADR-0032): vadlovak a pusztán (képletből), E – felülsz; a ló átmenetileg az autód helyére lép =====
const HORSE_CELL = 1000, HORSE_CHANCE = 0.7, HORSE_REACH = 70, HORSE_DROP_MAX = 12;
const HORSE_COATS = [['#8a5a32', '#4a2c14'], ['#2a1a10', '#111'], ['#c8a060', '#8a6a30'], ['#e8e0d0', '#aaa'], ['#a0522d', '#5a2a10']];
const HORSE_MODEL = { name: 'Ló', type: 'horse', color: HORSE_COATS[0], len: 64, wid: 24, accel: 420, maxRoad: 340, maxSand: 340, sandDrag: 0.5, fuelUse: 0 };
const usedHorses = new Set();                      // már megülte valaki a vadlovat (id)
const droppedHorses = [];                          // ahol leszálltál, ott a ló marad
// vadlovak egy négyzetben: cellánként determinisztikusan (az útra és házba nem kerülnek)
function horsesIn(xa, ya, xb, yb) {
  const out = [];
  for (let cx = Math.floor(xa / HORSE_CELL); cx <= Math.floor(xb / HORSE_CELL); cx++) {
    for (let cy = Math.floor(ya / HORSE_CELL); cy <= Math.floor(yb / HORSE_CELL); cy++) {
      const id = cx + ',' + cy;
      if (usedHorses.has(id)) continue;
      const h = rng(chunkSeed(cx * 7 + 3, cy * 11 + 5));
      if (h() >= HORSE_CHANCE) continue;
      const x = (cx + 0.15 + h() * 0.7) * HORSE_CELL, y = (cy + 0.15 + h() * 0.7) * HORSE_CELL, angle = h() * Math.PI * 2, coat = HORSE_COATS[(h() * HORSE_COATS.length) | 0];
      if (onRoad(x, y, 160) || insideHouse(x, y, 60)) continue;
      if (x >= xa && x <= xb && y >= ya && y <= yb) out.push({ id, x, y, angle, coat });
    }
  }
  for (const d of droppedHorses) if (d.x >= xa && d.x <= xb && d.y >= ya && d.y <= yb) out.push(d);
  return out;
}
const nearestHorse = () => horsesIn(player.x - HORSE_REACH, player.y - HORSE_REACH, player.x + HORSE_REACH, player.y + HORSE_REACH)
  .find(hz => Math.hypot(hz.x - player.x, hz.y - player.y) < HORSE_REACH);
function mountHorse(hz) {
  if (hz.drop) droppedHorses.splice(droppedHorses.indexOf(hz), 1); else usedHorses.add(hz.id);
  const snap = { ...car };                         // az autód pillanatképe: leszálláskor ez jön vissza
  applyCarModel(car, { ...HORSE_MODEL, color: hz.coat });
  Object.assign(car, { x: hz.x, y: hz.y, angle: hz.angle, vx: 0, vy: 0, fuel: 100, rental: true, horse: true, horseSnap: snap, lastWheels: null });
  player.inCar = true;
  popup('🐴 Felültél a lóra – WASD: irány, Shift: vágta, E: leszállás', '#c8a060');
}
// leszállás / megszakítás: a ló ott marad, az autód visszakerül oda, ahol hagytad
function leaveHorse(dropAt = true) {
  if (!car.horse) return;
  if (dropAt) { droppedHorses.push({ id: 'd' + clock, drop: true, x: car.x, y: car.y, angle: car.angle, coat: car.color }); if (droppedHorses.length > HORSE_DROP_MAX) droppedHorses.shift(); }
  const snap = car.horseSnap;
  Object.assign(car, snap, { horse: false, horseSnap: null, vx: 0, vy: 0 });
}

function rentCar(lot) {
  if (progress.money < RENT_PRICE) { popup(`Az autóbérlés $${RENT_PRICE} – nincs elég pénzed!`, '#f66'); return false; }
  progress.money -= RENT_PRICE;
  saveProgress();
  rentedLots.add(lot.key);
  if (!car.rental) car.ownFuel = car.fuel;         // a saját autó benzinje: a bérlés végén ez jár vissza
  applyCarModel(car, RENTAL_MODEL);
  Object.assign(car, { x: lot.spot.x, y: lot.spot.y, angle: lot.spot.angle, vx: 0, vy: 0, fuel: 100, rental: true, lastWheels: null });
  player.inCar = true;
  popup(`🔑 Kibérelted az autót (-$${RENT_PRICE}) – a saját autóidat az Esc menüben választhatod vissza`, '#7f7');
  return true;
}

// Homok textúra
const sandTile = document.createElement('canvas');
sandTile.width = sandTile.height = 256;
{
  const s = sandTile.getContext('2d');
  s.fillStyle = '#e2c27d';
  s.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const v = rand();
    s.fillStyle = v < 0.5 ? 'rgba(180,140,80,0.35)' : 'rgba(255,235,180,0.35)';
    s.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2);
  }
}
const sandPattern = ctx.createPattern(sandTile, 'repeat');

// ===== Szereplők =====
const CAR_COLORS = [['#2f6fd0', '#1f4f9a'], ['#e6e6e6', '#b4b4b4'], ['#f2c230', '#c09010'],
  ['#3a9a4a', '#257035'], ['#2a2a2a', '#151515'], ['#ff8a1f', '#cc6600'], ['#8a3ac0', '#622a8a']];
// Alex: a járókelők egy része – zöld póló, narancs haj, barna nadrág, névtábla a feje fölött; E-re beszél veled
const ALEX_CHANCE = 0.18, ALEX_LOOK = { shirt: '#3aa04a', head: '#e07020', legs: '#6b4a2e' };
const ALEX_LINES = ['Szia, Alex vagyok!', 'Láttál már tornádót? Én igen!', 'A kocsmában jó a sör.', 'Az iskolában vigyázz a tanárral!',
  'Én is Alex vagyok. Mindenki Alex itt.', 'A gyárban jól lehet keresni.', 'Szép az autód!', 'Ne bombázz, légyszi!', 'A taxi csak $5!'];
function nearestAlex() { return npcs.find(p => p.alex && !p.dead && dist(p, player) < 60); }
function talkToAlex(p) {
  p.line = ALEX_LINES[(p.lineIdx = ((p.lineIdx ?? -1) + 1) % ALEX_LINES.length)];
  p.lineUntil = clock + 3;
  p.angle = Math.atan2(player.y - p.y, player.x - p.x);   // feléd fordul
  return p.line;
}
const PED_SHIRTS = ['#e05a5a', '#5ab0e0', '#e0c05a', '#70c070', '#c070c0', '#f0f0f0', '#8a6040'];
const PED_HAIR = ['#3a2615', '#111', '#c8a060', '#7a4a20', '#999'];

// Választható szkinek és autók (a menüben, Esc)
const SKINS = [
  { name: 'Klasszikus', shirt: '#2f6fd0', head: '#3a2615', legs: '#2b2b4a' },
  { name: 'Cowboy', shirt: '#8a5a2b', head: '#5a3a1a', legs: '#3a5a8a', hat: '#6b4420' },
  { name: 'Sivatagi katona', shirt: '#b9a26a', head: '#2a2a2a', legs: '#7d6d45', hat: '#8a7a4a' },
  { name: 'Rózsaszín párduc', shirt: '#ff6fb5', head: '#f2d27a', legs: '#ffffff' },
  { name: 'Ninja', shirt: '#151515', head: '#151515', legs: '#151515', hat: '#c01010' },
  { name: 'Turista', shirt: '#ffd23a', head: '#c8a060', legs: '#e0e0e0', hat: '#f5f5f5' },
  { name: 'Pókhős', shirt: '#c8102e', head: '#c8102e', legs: '#1f3fa0', pattern: 'web', price: 900 },   // piros-kék, hálómintás
  { name: 'Peppa malac', shirt: '#e8383d', head: '#f7a8c0', legs: '#f7a8c0', pattern: 'pig' },          // rózsaszín malac piros ruhában
  { name: 'Alex', shirt: '#3aa04a', head: '#e07020', legs: '#6b4a2e' },                                     // zöld póló, narancs haj
  { name: 'Rendőr', shirt: '#1f3f8a', head: '#3a2615', legs: '#15204a', hat: '#101830' },
  { name: 'Szakács', shirt: '#f5f5f5', head: '#3a2615', legs: '#333', hat: '#ffffff' },
  { name: 'Focista', shirt: '#d42020', head: '#111', legs: '#f5f5f5' },
  { name: 'Bohóc', shirt: '#ffd23a', head: '#ff3a3a', legs: '#3a7aff', hat: '#2ad04a' },
  { name: 'Űrhajós', shirt: '#e8e8e8', head: '#bbb', legs: '#e8e8e8', hat: '#9fd8ff' },
  { name: 'Kalóz', shirt: '#8a1a1a', head: '#111', legs: '#222', hat: '#151515' },
  { name: 'Zombi', shirt: '#5a6a3a', head: '#7aa060', legs: '#4a3a2a' },
];
const skinPrice = i => SKINS[i].price || 0;
const CAR_MODELS = [
  { name: 'Piros sportkocsi', color: ['#d42020', '#a31515'], len: 72, wid: 36, accel: 420, maxRoad: 620, maxSand: 380, sandDrag: 0.9, fuelUse: 1, price: 0, desc: 'gyors aszfalton' },
  { name: 'Fekete terepjáró', color: ['#2a2a2a', '#151515'], len: 80, wid: 42, accel: 360, maxRoad: 500, maxSand: 470, sandDrag: 0.35, fuelUse: 1.3, price: 3000, desc: 'homokban is gyors' },
  { name: 'Sárga taxi', color: ['#f2c230', '#c09010'], len: 74, wid: 36, accel: 380, maxRoad: 560, maxSand: 340, sandDrag: 0.9, fuelUse: 0.7, price: 800, desc: 'takarékos' },
  { name: 'Kék rakétaautó', color: ['#2f6fd0', '#1f4f9a'], len: 70, wid: 32, accel: 560, maxRoad: 760, maxSand: 330, sandDrag: 1.2, fuelUse: 2, price: 8000, desc: 'nagyon gyors, sokat eszik' },
  { name: 'Zöld pickup', color: ['#3a9a4a', '#257035'], len: 84, wid: 40, accel: 330, maxRoad: 520, maxSand: 420, sandDrag: 0.5, fuelUse: 1.1, price: 1500, desc: 'strapabíró' },
  { name: 'Zöld busz', type: 'bus', color: ['#1e9e48', '#137a35'], len: 130, wid: 46, accel: 260, maxRoad: 460, maxSand: 300, sandDrag: 0.8, fuelUse: 1.6, price: 0, desc: 'csak a tiéd – nagy és erős' },
  { name: 'Nitró Villám', type: 'nitro', color: ['#6a1fb0', '#3d0f6b'], len: 74, wid: 36, accel: 400, maxRoad: 560, maxSand: 340, sandDrag: 0.9, fuelUse: 1.2, price: 2500,
    nitro: { max: 800, accel: 650, burn: 25, regen: 8 }, desc: '140 km/h, nitróval (Shift / N) 200 km/h' },
  { name: 'Fehér limuzin', type: 'limo', color: ['#f2f2f2', '#c8c8c8'], len: 112, wid: 38, accel: 340, maxRoad: 560, maxSand: 280, sandDrag: 1, fuelUse: 1.5, price: 4000, desc: 'hosszú és elegáns' },
  { name: 'Narancs sportkocsi', color: ['#ff7a1a', '#c85a08'], len: 70, wid: 34, accel: 480, maxRoad: 700, maxSand: 340, sandDrag: 1.1, fuelUse: 1.4, price: 5000, desc: 'nagyon gyors' },
  { name: 'Rózsaszín kisautó', color: ['#ff8fc8', '#d0609a'], len: 56, wid: 32, accel: 400, maxRoad: 520, maxSand: 330, sandDrag: 0.9, fuelUse: 0.5, price: 600, desc: 'kicsi és takarékos' },
  { name: 'Szürke furgon', color: ['#8a8f96', '#62676e'], len: 94, wid: 44, accel: 300, maxRoad: 480, maxSand: 380, sandDrag: 0.6, fuelUse: 1.2, price: 1200, desc: 'nagy és erős' },
  { name: 'Mentőautó', type: 'ambulance', color: ['#f5f5f5', '#dadada'], len: 90, wid: 42, accel: 380, maxRoad: 580, maxSand: 340, sandDrag: 0.8, fuelUse: 1.2, price: 2500, desc: 'villogó fényekkel' },
  { name: 'Fekete versenyautó', type: 'racecar', color: ['#1a1a1a', '#e8c020'], len: 76, wid: 34, accel: 600, maxRoad: 800, maxSand: 300, sandDrag: 1.3, fuelUse: 2.2, price: 12000, desc: 'a leggyorsabb' },
  { name: 'Barna dzsip', color: ['#8a6a3a', '#6a4e28'], len: 78, wid: 42, accel: 380, maxRoad: 520, maxSand: 500, sandDrag: 0.25, fuelUse: 1.4, price: 3500, desc: 'a sivatag királya' },
  { name: 'Arany autó', type: 'gold', color: ['#f2c440', '#c8961a'], len: 74, wid: 36, accel: 450, maxRoad: 650, maxSand: 380, sandDrag: 0.9, fuelUse: 1, price: 20000, desc: 'csillogó színarany' },
  { name: 'Bicikli', type: 'bike', color: ['#e03030', '#222'], len: 40, wid: 14, accel: 260, maxRoad: 150, maxSand: 90, sandDrag: 1.2, fuelUse: 0, price: 100, desc: 'nem kell bele benzin' },
];
// FONTOS: a mentés sorszám szerint tárolja az autókat (progress.owned, activeCar), ezért új autót CSAK a lista
// VÉGÉRE szabad felvenni, a meglévők sorrendje nem változhat. Ugyanez igaz a SKINS listára.
// A játékosnak ezek alapból megvannak. A busz csak a játékosé: az AI sosem kap CAR_MODELS-beli járművet.
const BUS = CAR_MODELS.findIndex(m => m.type === 'bus');
const FREE_CARS = [0, BUS];
const DEFAULT_MODEL = { accel: 420, maxRoad: 620, maxSand: 380, sandDrag: 0.9, fuelUse: 1 };
const FUEL_PRICE = 1;            // $ / 1% benzin
const POLICE_MODEL = { name: 'Rendőrautó', color: ['#f4f4f4', '#1d2a4a'], len: 76, wid: 36, accel: 520, maxRoad: 680, maxSand: 450, sandDrag: 0.4 };
const SPEED_LIMIT = 145;         // km/h – aki ennél gyorsabban megy az úton, azt üldözi a rendőrség
const KMH = 4;                   // 1 km/h = 4 px/s (a HUD is így számol)

function loadChoice(key, max) {
  try { const v = parseInt(window.localStorage.getItem(key), 10); return v >= 0 && v < max ? v : 0; } catch (e) { return 0; }
}
function saveChoice(key, v) { try { window.localStorage.setItem(key, String(v)); } catch (e) { /* nincs tárhely */ } }

// Előrehaladás (pénz, XP, megvett autók, rekordok) – a böngésző megjegyzi
const PROGRESS_KEY = 'gta.progress';
const PIN_MAX = 10;
const DROPPED_PHONE_MAX = 5;                     // saját térképes jelölések száma (ADR-0030)
// a sérült vagy más verzióból származó mentést érvényes állapotra javítja
function sanitizeProgress(p) {
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);
  const valid = i => Number.isInteger(i) && i >= 0 && i < CAR_MODELS.length;
  const src = p && typeof p === 'object' ? p : {};
  const owned = [...FREE_CARS, ...(Array.isArray(src.owned) ? src.owned.filter(valid) : [])].filter((v, i, a) => a.indexOf(v) === i);
  return {
    money: num(src.money), xp: num(src.xp), owned,
    activeCar: owned.includes(src.activeCar) ? src.activeCar : 0,
    bestDrift: num(src.bestDrift), bestStreak: num(src.bestStreak), missions: num(src.missions), raceWins: num(src.raceWins),
    donated: num(src.donated), debt: num(src.debt),
    phone: [1, 2].includes(src.phone) ? src.phone : 0,                       // 0: nincs, 1: egyszerű, 2: okostelefon
    phoneScores: { snake: Math.max(0, Math.floor(num((src.phoneScores || {}).snake))), flappy: Math.max(0, Math.floor(num((src.phoneScores || {}).flappy))) },   // a telefonos játékok rekordjai
    phoneCracked: !!src.phoneCracked && [1, 2].includes(src.phone),          // összetört kijelző (eldobás után)
    droppedPhones: (Array.isArray(src.droppedPhones) ? src.droppedPhones : []).filter(d => d && Number.isFinite(d.x) && Number.isFinite(d.y) && [1, 2].includes(d.level)).slice(0, DROPPED_PHONE_MAX).map(d => ({ x: +d.x, y: +d.y, level: d.level })),   // a földön heverő (repedt) telefonok
    tuning: (Array.isArray(src.tuning) ? src.tuning : []).slice(0, CAR_MODELS.length).map(v => (Number.isInteger(v) ? clamp(v, 0, TUNE_MAX) : 0)),
    paint: (Array.isArray(src.paint) ? src.paint : []).slice(0, CAR_MODELS.length).map(v => (Number.isInteger(v) && v >= 0 && v < PAINTS.length ? v : null)),
    pins: (Array.isArray(src.pins) ? src.pins : []).filter(pn => pn && Number.isFinite(pn.x) && Number.isFinite(pn.y)).slice(0, PIN_MAX).map(pn => ({ x: +pn.x, y: +pn.y })),
    ownedSkins: [...SKINS.map((k, i) => i).filter(i => !skinPrice(i)),
      ...(Array.isArray(src.ownedSkins) ? src.ownedSkins.filter(i => Number.isInteger(i) && i >= 0 && i < SKINS.length) : [])]
      .filter((v, i, a) => a.indexOf(v) === i),
  };
}
function loadProgress() {
  try { return sanitizeProgress(JSON.parse(window.localStorage.getItem(PROGRESS_KEY))); }
  catch (e) { return sanitizeProgress(null); }   // nincs mentés / nincs tárhely
}
const progress = loadProgress();
function saveProgress() { try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* nincs tárhely */ } }
const levelOf = xp => Math.floor(Math.sqrt(xp / 150)) + 1;
const xpForLevel = l => 150 * (l - 1) * (l - 1);
const owns = i => progress.owned.includes(i);

const ownsSkin = i => progress.ownedSkins.includes(i);
let activeSkin = loadChoice('gta.skin', SKINS.length);         // a ténylegesen viselt szkin (menu.skin a menüben nézett)
if (!ownsSkin(activeSkin)) activeSkin = 0;
const menu = { open: false, sel: 0, skin: activeSkin,
  carModel: owns(progress.activeCar) ? progress.activeCar : 0, hits: [], note: '' };
const MENU_ROWS = ['Folytatás', 'Szkin', 'Autó'];

function makeCar(x, y, angle, color) {
  return { x, y, angle, vx: 0, vy: 0, r: 28, len: 72, wid: 36, color, skid: false,
    braking: false, lastWheels: null, health: 6, wrecked: false, ai: null, ...DEFAULT_MODEL };
}

let nitroTank = 100;   // a nitró szintje autóváltáson át is megmarad (nem lehet váltással újratölteni)
function applyCarModel(c, m) {
  if (c === car && c.nitroCfg) nitroTank = c.nitro;
  const mi = c === car ? CAR_MODELS.indexOf(m) : -1;
  const lvl = mi >= 0 && progress.tuning ? progress.tuning[mi] || 0 : 0, paint = mi >= 0 && progress.paint ? progress.paint[mi] : null;
  const sp = 1 + TUNE_SPEED * lvl, ac = 1 + TUNE_ACCEL * lvl;
  Object.assign(c, { color: paint != null && PAINTS[paint] ? PAINTS[paint] : m.color, len: m.len, wid: m.wid, r: Math.max(m.len, m.wid * 2) * 0.39,
    accel: m.accel * ac, maxRoad: m.maxRoad * sp, maxSand: m.maxSand * sp, tune: lvl, sandDrag: m.sandDrag, fuelUse: m.fuelUse ?? 1, type: m.type || 'car',
    nitroCfg: m.nitro || null, nitro: m.nitro ? nitroTank : 0, nitroOn: false });
}

const player = { x: START_X, y: START_Y, angle: 0, r: 12, inCar: false, walk: 0,
  health: 100, dead: 0, arrested: 0, cooldown: 0, kills: 0, lastHit: -99 };
const car = makeCar(START_X + 100, START_Y - 50, 0, ['#d42020', '#a31515']);
applyCarModel(car, CAR_MODELS[menu.carModel]);
car.fuel = 100;          // benzin %
const aiCars = [];      // AI által vezetett autók
const npcs = [];        // gyalogosok ('ped') és csövesek ('homeless')
const bullets = [];     // {x, y, vx, vy, life, from}
const flashes = [];     // torkolattűz
const skidMarks = [];   // féknyomok: {x1, y1, x2, y2, born}
const smoke = [];       // füstrészecskék: {x, y, vx, vy, r, life, max}
const MAX_SKID = 4000, MAX_SMOKE = 300;
const SKID_LIFE = 5;    // ennyi másodperc alatt tűnik el egy féknyom
let clock = 0;          // valós idő másodpercben (a T gomb nem gyorsítja)
let time = 60;          // játékidő másodpercben: nappal indulunk
let spawnEnabled = true;    // teszteléshez kikapcsolható
let message = null;     // {text, until, color}
let policeEnabled = true;   // teszteléshez kikapcsolható
// körözés: 0 = nincs, 1 = gyorshajtás, 2 = rendőrre lőtt
const wanted = { level: 0, lostTimer: 0, bustTimer: 0 };
const POLICE_COUNT = [0, 2, 3];
const controllable = () => !player.dead && !player.arrested && !(player.passedOut > 0) && !(taxiTrip && taxiTrip.t > 0) && !player.abduct && !player.moon;
let lastCam = { x: player.x, y: player.y };

// Homokvihar
const storm = { level: 0, target: 0, timer: 120 + rand() * 120, angle: rand() * Math.PI * 2, particles: [] };
function toggleStorm() {
  storm.target = storm.target > 0 ? 0 : 1;
  storm.timer = storm.target ? 35 + rand() * 25 : 120 + rand() * 120;
  if (storm.target) storm.angle = rand() * Math.PI * 2;
  addNews(storm.target ? '🌪 Homokvihar kezdődött a sivatagban' : '☀ Elült a homokvihar');
}

function toggleMenu() {
  menu.open = !menu.open;
  menu.sel = 0;
  menu.note = '';
  if (!menu.open && !owns(menu.carModel)) menu.carModel = progress.activeCar;
  if (!menu.open && !ownsSkin(menu.skin)) menu.skin = activeSkin;   // a meg nem vett szkin sem marad kiválasztva   // a meg nem vett autó nem marad kiválasztva
  for (const k in keys) keys[k] = false;   // ne ragadjon be egy gomb
  mouse.down = false;
}

function changeChoice(row, delta) {
  if (row === 1) {
    menu.skin = (menu.skin + delta + SKINS.length) % SKINS.length;
    menu.note = '';
    if (ownsSkin(menu.skin)) { activeSkin = menu.skin; saveChoice('gta.skin', activeSkin); }
  } else if (row === 2) {
    menu.carModel = (menu.carModel + delta + CAR_MODELS.length) % CAR_MODELS.length;
    menu.note = '';
    if (owns(menu.carModel)) selectCar(menu.carModel);
  }
}

function buySkin(i) {
  if (ownsSkin(i)) return true;
  const price = skinPrice(i);
  if (progress.money < price) { menu.note = `Nincs elég pénzed! Még $${price - Math.floor(progress.money)} kell.`; return false; }
  progress.money -= price;
  progress.ownedSkins.push(i);
  activeSkin = i; saveChoice('gta.skin', i);
  saveProgress();
  menu.note = `Megvetted: ${SKINS[i].name}!`;
  popup(`Új szkin: ${SKINS[i].name}!`, '#7f7');
  return true;
}

function selectCar(i) {
  if (car.plane) leavePlane(true);
  if (car.horse) { droppedHorses.push({ id: 'd' + clock, drop: true, x: car.x, y: car.y, angle: car.angle, coat: car.color }); Object.assign(car, car.horseSnap, { horse: false, horseSnap: null }); }
  applyCarModel(car, CAR_MODELS[i]);
  if (car.rental) car.fuel = car.ownFuel;          // a bérautó benzinje nem száll át a saját autóra
  car.rental = false;                              // saját autó választásával véget ér a bérlés
  progress.activeCar = i;
  saveProgress();
}

function buyCar(i) {
  const m = CAR_MODELS[i];
  if (owns(i)) return true;
  if (progress.money < m.price) { menu.note = `Nincs elég pénzed! Még $${m.price - Math.floor(progress.money)} kell.`; return false; }
  progress.money -= m.price;
  progress.owned.push(i);
  selectCar(i);
  menu.note = `Megvetted: ${m.name}!`;
  popup(`Új autó: ${m.name}!`, '#7f7');
  return true;
}

function menuKey(code) {
  if (code === 'ArrowUp' || code === 'KeyW') menu.sel = (menu.sel + MENU_ROWS.length - 1) % MENU_ROWS.length;
  else if (code === 'ArrowDown' || code === 'KeyS') menu.sel = (menu.sel + 1) % MENU_ROWS.length;
  else if (code === 'ArrowLeft' || code === 'KeyA') changeChoice(menu.sel, -1);
  else if (code === 'ArrowRight' || code === 'KeyD') changeChoice(menu.sel, 1);
  else if (code === 'Enter' || code === 'Space') {
    if (menu.sel === 0) toggleMenu();
    else if (menu.sel === 1 && !ownsSkin(menu.skin)) buySkin(menu.skin);
    else if (menu.sel === 2 && !owns(menu.carModel)) buyCar(menu.carModel);
    else changeChoice(menu.sel, 1);
  }
}

function menuClick(x, y) {
  for (const h of menu.hits) {
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      menu.sel = h.row;
      if (h.row === 0) toggleMenu();
      else if (h.buy) { if (h.row === 1) buySkin(menu.skin); else buyCar(menu.carModel); }
      else changeChoice(h.row, h.delta);
      return;
    }
  }
}

function nearestBoardableBus() {
  return aiCars.find(c => c.citybus && !c.wrecked && dist(c, player) < c.r + 45 && Math.hypot(c.vx, c.vy) < 60) || nearestBoardableTrain();   // a busz és a vonat ugyanúgy szállít
}

// az E gomb felirata – PONTOSAN a toggleCar sorrendjét követi
function interactionPrompt() {
  if (player.dead || player.arrested || player.passedOut > 0 || player.abduct || player.moon) return null;
  if (player.riding) return player.riding.train ? { text: '🚆 Vonaton utazol – E: leszállás (amikor megáll az állomáson)', color: '#7df' } : player.riding.trolley ? { text: '🚎 Trolibuszon utazol – E: leszállás (amikor megáll)', color: '#ff8a8a' } : { text: '🚌 Buszon utazol – E: leszállás (amikor megáll)', color: '#f28c1e' };
  if (atBlackboard() && breakLeft() > 0) return { text: `🔔 Szünet – a következő óra ${breakLeft()} mp múlva`, color: '#ffd23a' };
  if (atBlackboard()) return { text: `🏫 E: matekóra (${LESSON_LEN} feladat, jó válaszonként $${ANSWER_PAY}, hibátlanért +$${LESSON_BONUS})`, color: '#ffd23a' };
  if (atShopCounter()) return { text: STORES[storeKind(player.inHouse.hs)].prompt, color: '#7f7' };
  if (atTv()) return { text: tv.on ? '📺 E: tévé nézése' : '📺 E: tévé bekapcsolása', color: '#7df' };
  if (atBankCounter()) return { text: `🏦 E: bank – hitel ($${LOAN_MIN}–$${LOAN_MAX}) és törlesztés`, color: '#7df' };
  if (player.inHouse && player.inHouse.factory) {
    const F = player.inHouse.factory;
    if (F.carrying) return { text: nearBox() >= 0 ? '📦 Space: berakás a dobozba' : '🥨 Viszel egy zacskót – vidd egy dobozhoz', color: '#ffd23a' };
    if (nearBag()) return { text: '🥨 Space: zacskó felvétele a szalagról', color: '#ffd23a' };
  }
  if (atBar()) return { text: `🍺 1: sör ($${BEER_PRICE}) · 🍷 2: bor ($${WINE_PRICE})`, color: '#ffd23a' };
  if (player.inHouse) return { text: atInnerDoor() ? '🚪 E: kimenés' : 'Menj az ajtóhoz (lent) a kimenéshez', color: '#7df' };
  if (player.inCar) return car.plane ? { text: Math.hypot(car.vx, car.vy) <= PLANE_LAND ? '✈ E: leszállás' : '🪂 E: kiugrás (a gép lezuhan) – lassíts a leszálláshoz (S)', color: '#ffb040' } : car.horse ? { text: '🐴 E: leszállás a lóról', color: '#c8a060' } : null;
  if (dist(player, car) < 75) return { text: 'Nyomd meg az E-t a beszálláshoz', color: '#fff' };
  if (taxiReady()) return { text: `🚕 E: taxi – válassz úti célt ($${TAXI_FARE})`, color: '#f2c230' };
  { const tb = nearestBoardableBus(); if (tb) return tb.train ? { text: `🚆 E: felszállás a vonatra ($${TRAIN_FARE})`, color: '#7df' } : tb.trolley ? { text: `🚎 E: felszállás a trolibuszra ($${TROLLEY_FARE})`, color: '#ff8a8a' } : { text: `🚌 E: felszállás a buszra ($${BUS_FARE})`, color: '#f28c1e' }; }   // a toggleCar-ban a busz megelőzi a többit
  const ns = nearestBusStop(player.x, player.y);
  if (nearestDoor()) return { text: '🏠 E: bemenés a házba', color: '#7df' };
  if (nearestRentable()) return { text: `🔑 E: autóbérlés ($${RENT_PRICE})`, color: '#7f7' };
  if (nearestPlane()) return { text: '✈ E: felszállás a bombázóra (B: tűz, V: fegyver)', color: '#ffb040' };
  if (nearestDroppedPhone()) return { text: progress.phone > 0 ? '📱 Már van telefonod – előbb dobd el (O)' : '📱 E: a telefon felvétele (a kijelzője összetört)', color: '#7fe0ff' };
  if (nearestHorse()) return { text: '🐴 E: lovaglás (a ló ingyen van, benzin sem kell)', color: '#c8a060' };
  if (nearestAlex()) return { text: '💬 E: beszélgetés Alexszel', color: '#7f7' };
  { const st = onPlatform(player.x, player.y); if (st) return { text: `🚆 Vasútállomás – ${nextTrainIn(st.k, clock + trainShift) | 0} mp múlva érkezik a következő vonat (jegy $${TRAIN_FARE})`, color: '#7df' }; }
  if (nearestHomeless()) return { text: `🤲 E: adományozás ($${DONATE_MIN}–$${DONATE_MAX})`, color: '#7f7' };
  { const ts = nearestTrolleyStop(player.x, player.y); if (ts && Math.hypot(ts.x - player.x, ts.y - player.y) < 160) return { text: `🚎 Trolimegálló – a trolibusz 40 mp-enként jár, a következő ~${Math.ceil(nextTrolleyIn())} mp múlva (jegy $${TROLLEY_FARE})`, color: '#ff8a8a' }; }
  if (ns && Math.hypot(ns.x - player.x, ns.y - player.y) < 160) return { text: `🚌 Buszmegálló – a busz percenként jár, a következő ~${Math.ceil(nextBusIn())} mp múlva`, color: '#f28c1e' };
  return null;
}

function toggleCar() {
  if (!controllable()) return;
  if (player.riding) {                               // leszállás a busz jobb oldalán (a járda felé)
    const b = player.riding;
    if (Math.hypot(b.vx, b.vy) > 100) { popup(`Várd meg, amíg ${b.train ? 'a vonat' : b.trolley ? 'a trolibusz' : 'a busz'} megáll!`, '#f66'); return; }
    player.x = b.x - Math.sin(b.angle) * (b.wid / 2 + 22);
    player.y = b.y + Math.cos(b.angle) * (b.wid / 2 + 22);
    player.riding = null;
    collide(player);
    return;
  }
  if (!player.inCar && dist(player, car) >= 75 && taxiReady()) { openTaxiMenu(); return; }
  const bus = !player.inCar && dist(player, car) >= 75 ? nearestBoardableBus() : null;
  if (player.inHouse) { if (atInnerDoor()) exitHouse(); else if (atBankCounter()) openBank(); else if (atShopCounter()) openShop(); else if (atBlackboard()) openSchool(); else if (atTv()) openTv(); return; }
  const door = !bus && !player.inCar && dist(player, car) >= 75 ? nearestDoor() : null;
  if (door) { enterHouse(door); return; }
  const lot = !bus && !player.inCar && dist(player, car) >= 75 ? nearestRentable() : null;
  if (lot) { rentCar(lot); return; }
  const horse = !bus && !player.inCar && dist(player, car) >= 75 ? nearestHorse() : null;
  if (horse) { mountHorse(horse); return; }
  const plane = !bus && !player.inCar && dist(player, car) >= 75 ? nearestPlane() : null;
  if (plane) { mountPlane(plane); return; }
  const dph = !bus && !player.inCar && dist(player, car) >= 75 ? nearestDroppedPhone() : null;
  if (dph) { pickUpPhone(dph); return; }
  const alex = !bus && !player.inCar && dist(player, car) >= 75 ? nearestAlex() : null;
  if (alex) { talkToAlex(alex); return; }
  const homeless = !bus && !player.inCar && dist(player, car) >= 75 ? nearestHomeless() : null;
  if (homeless) { openDonate(homeless); return; }
  if (bus) {
    const fare = bus.train ? TRAIN_FARE : bus.trolley ? TROLLEY_FARE : BUS_FARE, what = bus.train ? 'vonatjegy' : bus.trolley ? 'trolijegy' : 'buszjegy';
    if (!(progress.money >= fare)) { popup(`A ${what} $${fare} – nincs elég pénzed!`, '#f66'); return; }
    progress.money -= fare;
    saveProgress();
    player.riding = bus;
    popup(bus.train ? `🚆 Felszálltál a vonatra (-$${fare}) – a másik állomáson E: leszállás` : bus.trolley ? `🚎 Felszálltál a trolibuszra (-$${fare}) – E: leszállás` : `🚌 Felszálltál a buszra (-$${fare}) – E: leszállás`, bus.train ? '#7df' : bus.trolley ? '#ff8a8a' : '#f28c1e');
    return;
  }
  if (player.inCar && car.plane) { playerPlaneExit(); return; }
  if (player.inCar) {
    // kiszállás a vezető oldalán
    player.x = car.x + Math.sin(car.angle) * 40;
    player.y = car.y - Math.cos(car.angle) * 40;
    player.angle = car.angle;
    player.inCar = false;
    leaveHorse();                                   // lóról leszállva a ló marad, az autód visszajön
    collide(player);
  } else if (dist(player, car) < 75) {
    player.inCar = true;
  }
}

// kör–téglalap ütközés: a téglalap legközelebbi pontjától tolja ki a kört
function pushOutOfRect(o, rc) {
  const cx = clamp(o.x, rc.x0, rc.x1), cy = clamp(o.y, rc.y0, rc.y1);
  let dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
  if (d >= o.r) return null;
  if (d < 0.0001) {                                     // a középpont a téglalapon belül: a legközelebbi oldalon át ki
    const opts = [[o.x - rc.x0, -1, 0], [rc.x1 - o.x, 1, 0], [o.y - rc.y0, 0, -1], [rc.y1 - o.y, 0, 1]].sort((a, b) => a[0] - b[0]);
    const [pen, nx, ny] = opts[0];
    o.x += nx * (pen + o.r); o.y += ny * (pen + o.r);
    return { nx, ny };
  }
  const nx = dx / d, ny = dy / d;
  o.x = cx + nx * o.r; o.y = cy + ny * o.r;
  return { nx, ny };
}

function collide(o, bounce) {
  for (const ch of chunksAround(o.x, o.y, o.r + OB_REACH)) {
    for (const ob of ch.obstacles) {
      let n = null;
      if (ob.rect) n = pushOutOfRect(o, ob.rect);
      else {
        const dx = o.x - ob.x, dy = o.y - ob.y;
        const d = Math.hypot(dx, dy), min = o.r + ob.r;
        if (d < min && d > 0.0001) { n = { nx: dx / d, ny: dy / d }; o.x = ob.x + n.nx * min; o.y = ob.y + n.ny * min; }
      }
      if (n) {
        const { nx, ny } = n;
        if (bounce) {
          const vn = o.vx * nx + o.vy * ny;
          if (vn < 0) { o.vx -= 1.4 * vn * nx; o.vy -= 1.4 * vn * ny; o.vx *= 0.6; o.vy *= 0.6; }
          if (vn < -150) o.crashT = clock;
        }
      }
    }
  }
}

// ===== Csövesek: a járdán ülnek, $1–$200 adományt lehet nekik adni =====
const DONATE_MIN = 1, DONATE_MAX = 200;
const donate = { open: false, target: null, amount: 10, hits: [] };

// a csöves helye a járda külső részén; kereszteződésben (zebrán, úttesten) nincs hely → null
function homelessSpot(axis, road, side, along) {
  if (Math.abs(along - nearestRoad(along)) < EDGE + 40) return null;
  const m = ((along - STOP_OFFSET) % STOP_SPACING + STOP_SPACING) % STOP_SPACING;
  if (Math.min(m, STOP_SPACING - m) < 80) return null;          // buszmegálló (váró, tábla, zászló) helyén sem
  const line = road + side * (WALK_OFF + 16);
  return axis === 'h' ? { x: along, y: line } : { x: line, y: along };
}

function nearestHomeless() {
  return npcs.find(p => p.kind === 'homeless' && !p.dead && dist(p, player) < 60);
}

function openDonate(p) {
  Object.assign(donate, { open: true, target: p, amount: clamp(10, DONATE_MIN, Math.max(DONATE_MIN, Math.min(DONATE_MAX, Math.floor(progress.money)))) });
  for (const k in keys) keys[k] = false;
  mouse.down = false;
}

function closeDonate() { donate.open = false; donate.target = null; }

function changeDonation(delta) { donate.amount = clamp(donate.amount + delta, DONATE_MIN, DONATE_MAX); }

function giveDonation() {
  const p = donate.target, amt = donate.amount;
  if (!p || p.dead || amt < DONATE_MIN || amt > DONATE_MAX) { closeDonate(); return false; }
  if (progress.money < amt) { popup(`Nincs ennyi pénzed ($${amt})!`, '#f66'); return false; }
  progress.money -= amt;
  progress.donated = (progress.donated || 0) + amt;
  p.received = (p.received || 0) + amt;
  p.thanksUntil = clock + 3;
  saveProgress();
  popup(`🤲 Adományoztál $${amt}-t – „Köszönöm, jó ember!”`, '#7f7');
  closeDonate();
  return true;
}

function donateKey(code) {
  if (code === 'Escape') closeDonate();
  else if (code === 'ArrowRight' || code === 'KeyD') changeDonation(1);
  else if (code === 'ArrowLeft' || code === 'KeyA') changeDonation(-1);
  else if (code === 'ArrowUp' || code === 'KeyW') changeDonation(10);
  else if (code === 'ArrowDown' || code === 'KeyS') changeDonation(-10);
  else if (code === 'Enter' || code === 'Space') giveDonation();
}

function donateClick(x, y) {
  for (const h of donate.hits) {
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      if (h.give) giveDonation(); else if (h.cancel) closeDonate(); else changeDonation(h.delta);
      return;
    }
  }
}

// ===== Spawnolás =====
function spawnNpc(kind, x, y) {
  const p = { kind, x, y, r: 11, angle: rand() * Math.PI * 2, speed: 0, walk: 0,
    health: 1, dead: 0, wanderT: 0, moving: false, flee: 0, fx: 0, fy: 0,
    shirt: PED_SHIRTS[(rand() * PED_SHIRTS.length) | 0], head: PED_HAIR[(rand() * PED_HAIR.length) | 0] };
  if (kind === 'ped') assignSidewalk(p);
  if (kind === 'homeless') Object.assign(p, { shirt: '#6b5a44', head: '#8a8a80', health: 1 });
  else if (rand() < ALEX_CHANCE) Object.assign(p, ALEX_LOOK, { alex: true });   // minden ~5. járókelő egy Alex
  npcs.push(p);
  return p;
}

// a gyalogos a legközelebbi járdára áll be, véletlen irányban
function assignSidewalk(p) {
  const rx = nearestRoad(p.x), ry = nearestRoad(p.y);
  if (Math.abs(p.y - ry) < Math.abs(p.x - rx)) { p.axis = 'h'; p.road = ry; p.side = p.y < ry ? -1 : 1; }
  else { p.axis = 'v'; p.road = rx; p.side = p.x < rx ? -1 : 1; }
  p.dir = rand() < 0.5 ? -1 : 1;
  p.lastCross = null;
}
const walkLine = p => p.road + p.side * WALK_OFF;

function spawnPedOnSidewalk(axis, road, side, along, dir) {
  const line = road + side * WALK_OFF;
  const p = spawnNpc('ped', axis === 'h' ? along : line, axis === 'h' ? line : along);
  if (dir) p.dir = dir;
  return p;
}

// sáv: jobb oldali közlekedés (vízszintes +x → road+40; függőleges +y → road-40)
const laneFor = ai => (ai.axis === 'h' ? ai.road + ai.dir * 40 : ai.road - ai.dir * 40);

// ===== AI autók tankolnak (ADR-0035): fogy a benzin; fogyóban a kútnál lévő kereszteződésben behajtanak a kúthoz, megállnak a töltőnél, tele tankkal mennek tovább =====
const AI_FUEL_USE = 0.4, AI_REFUEL_BELOW = 45, AI_FUEL_FLOOR = 8, AI_FILL_RATE = 25;   // %/mp
function updateAiFuel(dt) {
  for (const c of aiCars) {
    if (!c.ai || c.fuel === undefined || c.wrecked || c.citybus || c.taxicab || c.police || c.racer) continue;
    const pit = c.ai.pit;
    if (pit && pit.phase === 'fill') {
      c.fuel = Math.min(100, c.fuel + AI_FILL_RATE * dt);
      if (c.fuel >= 100 || clock > pit.until) c.ai.pit = null;          // tele: továbbmegy
    } else {
      if (Math.hypot(c.vx, c.vy) > 20) c.fuel = Math.max(AI_FUEL_FLOOR, c.fuel - AI_FUEL_USE * dt);   // sosem fogy ki teljesen (nem akad el a forgalom)
      if (pit && clock > pit.until) c.ai.pit = null;                    // elakadt: feladja
    }
  }
}
function spawnAiCar(axis, dir, road, along) {
  const ai = { axis, dir, road, speed: 240 + rand() * 120, lastCross: null };
  const lane = laneFor(ai);
  const x = axis === 'h' ? along : lane, y = axis === 'h' ? lane : along;
  const angle = axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const c = makeCar(x, y, angle, CAR_COLORS[(rand() * CAR_COLORS.length) | 0]);
  c.ai = ai;
  c.fuel = 25 + rand() * 75;                       // az AI autónak is van benzinje
  c.vx = Math.cos(angle) * 200; c.vy = Math.sin(angle) * 200;
  aiCars.push(c);
  return c;
}

function spawnCityBus(axis, dir, road, along) {
  const c = spawnAiCar(axis, dir, road, along);
  applyCarModel(c, CITY_BUS);
  Object.assign(c, { citybus: true, health: 12, dwellUntil: 0, lastStop: null });
  c.ai.speed = 300;
  return c;
}

function nearestBusStop(x, y) {
  let best = null, bd = Infinity;
  for (const bs of busStopsIn(x - 2600, y - 2600, x + 2600, y + 2600)) {
    const d = Math.hypot(bs.x - x, bs.y - y);
    if (d < bd) { bd = d; best = bs; }
  }
  return best;
}

// az indulás távolsága: legalább BUS_LEAD, széles képernyőn messzebb (ne a játékos szeme előtt jelenjen meg),
// de kevesebb, mint a megállók távolsága, így közben nincs másik megálló
const busLead = () => clamp(Math.max(BUS_LEAD, canvas.width / 2 + 300), BUS_LEAD, STOP_SPACING - 100);

// a busz a megálló előtt indul, a megálló sávjában; ha közben kereszteződés van, ott egyenesen megy
function dispatchBus() {
  const lead = busLead();
  // a legközelebbi megállótól kezdve az első, amelynek az indulóhelye szabad (parkoló autó, roncs, másik busz nincs ott)
  const stops = busStopsIn(player.x - 2600, player.y - 2600, player.x + 2600, player.y + 2600)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, 6);
  for (const bs of stops) {
    const along = bs.along - bs.dir * lead;
    const lane = bs.axis === 'h' ? { x: along, y: bs.road + bs.dir * 40 } : { x: bs.road - bs.dir * 40, y: along };
    if ([car, ...aiCars].some(c => dist(c, lane) < 300)) continue;
    const c = spawnCityBus(bs.axis, bs.dir, bs.road, along);
    c.ai.lastCross = bs.axis + bs.road + ':' + (bs.along - bs.dir * STOP_OFFSET);   // a köztes kereszteződésben nem fordul el
    busSchedule.dispatched++;
    return c;
  }
  return null;                                          // mind foglalt: 2 mp múlva újra próbálja
}

const nextBusIn = () => Math.max(0, busSchedule.next - clock) + busLead() / 300 + 1.5;

function spawnAround(dt) {
  // a távoliakat eltüntetjük
  for (let i = npcs.length - 1; i >= 0; i--) {
    const p = npcs[i];
    if (dist(p, player) > 2600 || (p.dead && clock - p.dead > 15)) npcs.splice(i, 1);
  }
  for (let i = aiCars.length - 1; i >= 0; i--) {
    const c = aiCars[i];
    if (c.racer || c === player.riding || c === taxi) continue;   // a versenyzők, a busz, amin ülsz, és a hívott taxi maradnak
    if (dist(c, player) > (c.chasing ? 4500 : 3000)) aiCars.splice(i, 1);
  }
  if (!spawnEnabled || player.dead) return;

  const alive = kind => npcs.filter(p => p.kind === kind && !p.dead).length;

  if (alive('ped') < 14) {           // gyalogosok a közeli járdákon
    const axis = rand() < 0.5 ? 'h' : 'v', side = rand() < 0.5 ? -1 : 1;
    const road = nearestRoad(axis === 'h' ? player.y : player.x);
    const along = (axis === 'h' ? player.x : player.y) + (rand() < 0.5 ? -1 : 1) * (700 + rand() * 700);
    const line = road + side * WALK_OFF;
    const pos = axis === 'h' ? { x: along, y: line } : { x: line, y: along };
    const d = dist(pos, player);
    if (d > 600 && d < 2400 && !obstacleAt(pos.x, pos.y, 15)) spawnPedOnSidewalk(axis, road, side, along);
  }
  if (alive('homeless') < 2 && rand() < dt * 0.3) {   // csövesek a járda külső szélén ülnek
    const axis = rand() < 0.5 ? 'h' : 'v', side = rand() < 0.5 ? -1 : 1;
    const road = nearestRoad(axis === 'h' ? player.y : player.x);
    const along = (axis === 'h' ? player.x : player.y) + (rand() < 0.5 ? -1 : 1) * (600 + rand() * 800);
    const pos = homelessSpot(axis, road, side, along);
    if (pos && dist(pos, player) > 500 && dist(pos, player) < 2400 && !obstacleAt(pos.x, pos.y, 15)) {
      const h = spawnNpc('homeless', pos.x, pos.y);
      h.angle = axis === 'h' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : (side > 0 ? Math.PI : 0);   // az út felé néz
    }
  }
  if (clock >= trolleySchedule.next) {              // trolibusz menetrend: 40 mp-enként, ha van trolivonal a közelben
    trolleySchedule.next = clock + (dispatchTrolley() ? TROLLEY_INTERVAL : 3);
  }
  if (clock >= busSchedule.next) {                  // percenként egy városi busz (menetrend)
    busSchedule.next = clock + (dispatchBus() ? BUS_INTERVAL : 2);   // ha foglalt az indulóhely, 2 mp múlva újra próbálja
  }
  if (aiCars.filter(c => !c.police && !c.racer && !c.citybus).length < 6 && rand() < dt) {
    const axis = rand() < 0.5 ? 'h' : 'v', dir = rand() < 0.5 ? 1 : -1;
    const road = nearestRoad(axis === 'h' ? player.y : player.x);
    const along = (axis === 'h' ? player.x : player.y) + (rand() < 0.5 ? -1 : 1) * (900 + rand() * 700);
    const pos = axis === 'h' ? { x: along, y: road } : { x: road, y: along };
    const d = dist(pos, player);
    if (d > 700 && d < 2400 && ![car, ...aiCars].some(c => dist(c, pos) < 250)) spawnAiCar(axis, dir, road, along);
  }
}

// ===== Frissítés =====
function windX() { return Math.cos(storm.angle) * storm.level; }
function windY() { return Math.sin(storm.angle) * storm.level; }

function updatePlayer(dt) {
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    const sp = (keys.ShiftLeft || keys.ShiftRight ? 260 : 140) * (1 - 0.3 * storm.level);
    const sway = Math.sin(clock * 3.1) * 70 * drunkK();                          // részegen imbolyog
    player.x += ((mx / len) * sp + (-my / len) * sway) * dt;
    player.y += ((my / len) * sp + (mx / len) * sway) * dt;
    player.angle = Math.atan2(my, mx);
    player.walk += dt * sp / 12;
  }
  player.x += windX() * 35 * dt; player.y += windY() * 35 * dt;   // a szél sodor
  collide(player);
  // ne lehessen átsétálni az autókon
  for (const c of [car, ...aiCars]) {
    const dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
    if (d < player.r + c.r && d > 0) {
      player.x = c.x + (dx / d) * (player.r + c.r);
      player.y = c.y + (dy / d) * (player.r + c.r);
    }
  }
}

function playerCarInput() {
  const drive = player.inCar && controllable();
  return {
    up: drive && !!(keys.KeyW || keys.ArrowUp),
    down: drive && !!(keys.KeyS || keys.ArrowDown),
    steer: drive ? ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0) : 0,
    handbrake: drive && !!keys.Space,
    nitro: drive && !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyN),
  };
}

function aiCarInput(c) {
  if (c.wrecked) return { up: false, down: false, steer: 0, handbrake: true };
  const ai = c.ai;
  const along = ai.axis === 'h' ? c.x : c.y;

  // kereszteződés: egyenesen, jobbra vagy balra
  const cross = nearestRoad(along);
  const key = ai.axis + ai.road + ':' + cross;
  if (Math.abs(along - cross) < 60 && ai.lastCross !== key) {
    ai.lastCross = key;
    const X = ai.axis === 'h' ? cross : ai.road, Y = ai.axis === 'h' ? ai.road : cross;
    const st = c.fuel !== undefined && c.fuel < AI_REFUEL_BELOW && !ai.pit && !c.citybus ? stationFor(Math.round((X - ROAD_OFFSET) / ROAD_SPACING), Math.round((Y - ROAD_OFFSET) / ROAD_SPACING)) : null;
    if (st) {                                                                       // fogyóban van benzin és kút van itt: behajt, és a töltő MELLETT áll meg (nem rá – különben nem tud kitolatni)
      const pump = st.pumps[(rand() * st.pumps.length) | 0], ux = X - pump.x, uy = Y - pump.y, ul = Math.hypot(ux, uy) || 1;
      ai.pit = { x: pump.x + ux / ul * 90, y: pump.y + uy / ul * 90, phase: 'go', until: clock + 30 };
    }
    const roll = st || c.trolley ? 1 : rand();       // a troli a felsővezeték mentén egyenesen megy
    if (roll < 0.5) {
      const right = roll < 0.25;
      const newAxis = ai.axis === 'h' ? 'v' : 'h';
      const newDir = ai.axis === 'h' ? (right ? ai.dir : -ai.dir) : (right ? -ai.dir : ai.dir);
      const oldRoad = ai.road;
      ai.axis = newAxis; ai.dir = newDir; ai.road = cross;
      ai.lastCross = newAxis + cross + ':' + oldRoad;
    }
  }

  const pit = ai.pit;
  const tx = pit ? pit.x : ai.axis === 'h' ? c.x + ai.dir * 160 : laneFor(ai);
  const ty = pit ? pit.y : ai.axis === 'h' ? laneFor(ai) : c.y + ai.dir * 160;
  const diff = wrapAngle(Math.atan2(ty - c.y, tx - c.x) - c.angle);
  const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  let target = Math.abs(diff) > 0.4 ? 150 : ai.speed;
  if (pit) {                                         // a kúthoz hajt, ott megáll tankolni
    const pd = Math.hypot(pit.x - c.x, pit.y - c.y);
    if (pit.phase === 'go' && pd < 45) { pit.phase = 'fill'; pit.until = clock + 25; }
    if (pit.phase === 'fill') return { up: false, down: fwd > 20, steer: 0, handbrake: true };
    target = Math.min(target, pd < 200 ? 90 : 170);
  }
  if (c.citybus) {                                   // városi busz: a következő megállóban megáll
    if (clock < c.dwellUntil) return { up: false, down: false, steer: 0, handbrake: true };
    const al = ai.axis === 'h' ? c.x : c.y;
    const off = c.trolley ? TROLLEY_OFFSET : STOP_OFFSET;                    // a troli a saját megállóinál áll meg
    const k = ai.dir > 0 ? Math.ceil((al - 20 - off) / STOP_SPACING) : Math.floor((al + 20 - off) / STOP_SPACING);   // a kicsit túlfutott megálló is számít
    const stopAt = off + k * STOP_SPACING, ahead = (stopAt - al) * ai.dir, stopKey = ai.axis + ai.road + ':' + stopAt;
    if (stopKey !== c.lastStop && ahead >= -20 && ahead < 220) {
      if (ahead < 30 && fwd < 30) { c.dwellUntil = clock + BUS_DWELL; c.lastStop = stopKey; }
      target = Math.min(target, Math.max(0, ahead * 1.6));
      if (target < 30) return { up: false, down: fwd > 20, steer: clamp(diff * 2.5, -1, 1), handbrake: fwd <= 20 };
    }
  }

  // ha valaki előtte van, fékez
  const hx = Math.cos(c.angle), hy = Math.sin(c.angle);
  const ahead = o => {                               // csak a saját sávjában lévőre fékez (a járdán állóra nem)
    const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy);
    return d > 0 && d < 150 && (dx * hx + dy * hy) / d > 0.8 && Math.abs(dx * -hy + dy * hx) < c.wid / 2 + 25;
  };
  const blocked = [car, ...aiCars].some(o => o !== c && ahead(o)) || (!player.inCar && !player.dead && ahead(player))
    || npcs.some(p => !p.dead && ahead(p));   // a zebrán átkelő gyalogosnak is megáll

  return {
    up: !blocked && fwd < target,
    down: (blocked && fwd > 20) || fwd > target + 60,
    steer: clamp(diff * 2.5, -1, 1),
    handbrake: false,
  };
}

// Lovaglás: nem autó – a WASD közvetlenül az irányt adja (mint gyaloglásnál), a ló gyorsan fordul és megáll, nincs csúszás.
// Shift: vágta. (A ló gyorsulása/fordulása állandó, nem a CAR_MODELS-féle autófizika.)
const HORSE_TROT = 170, HORSE_GALLOP = 340, HORSE_TURN = 8, HORSE_ACCEL = 6;
function updateHorse(c, dt) {
  const ride = player.inCar && controllable();
  let mx = 0, my = 0;
  if (ride) {
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
  }
  const len = Math.hypot(mx, my), sp = keys.ShiftLeft || keys.ShiftRight ? HORSE_GALLOP : HORSE_TROT;
  const sway = ride && len ? Math.sin(clock * 3.1) * 70 * drunkK() : 0;           // részegen imbolyog
  const tx = len ? mx / len * sp + (-my / len) * sway : 0, ty = len ? my / len * sp + (mx / len) * sway : 0;
  const k = 1 - Math.exp(-HORSE_ACCEL * dt);
  c.vx += (tx - c.vx) * k + windX() * 40 * dt; c.vy += (ty - c.vy) * k + windY() * 40 * dt;
  if (len) {                                                                         // a ló az irányba fordul (legrövidebb úton)
    const want = Math.atan2(my, mx), diff = Math.atan2(Math.sin(want - c.angle), Math.cos(want - c.angle));
    c.angle += clamp(diff, -HORSE_TURN * dt, HORSE_TURN * dt);
  }
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.braking = false; c.skid = false; c.lastWheels = null;
  collide(c, true);
}

function updateCarPhysics(c, input, dt) {
  if (c.horse && c === car) { updateHorse(c, dt); return; }
  if (c.plane && c === car) { updatePlane(c, dt); return; }
  const { up, down, steer, handbrake } = input;
  const sandy = !onRoad(c.x, c.y, SIDEWALK_W);   // a járda is szilárd burkolat

  // először fordul az autó, a sebesség viszont nem fordul vele azonnal → oldalirányú csúszás
  const fwd0 = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  const drunkSteer = c === car && player.inCar ? Math.sin(clock * 1.7) * 0.6 * drunkK() : 0;   // részegen „húz” a kormány
  c.angle += (steer + drunkSteer) * (handbrake ? 3.4 : 2.6) * dt * clamp(fwd0 / 160, -1, 1);

  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
  let fwd = c.vx * fx + c.vy * fy;
  let lat = -c.vx * fy + c.vy * fx;

  const empty = usesFuel(c) && c.fuel !== undefined && c.fuel <= 0;   // üres tankkal csak vánszorog (a bicikli nem)
  // nitró: amíg van a tartályban, erősebb gyorsulás és magasabb végsebesség; használat nélkül visszatöltődik
  const nc = c.nitroCfg;
  c.nitroOn = !!(nc && input.nitro && up && c.nitro > 0 && !empty);
  if (nc) c.nitro = c.nitroOn ? Math.max(0, c.nitro - nc.burn * dt) : input.nitro ? c.nitro : Math.min(100, c.nitro + nc.regen * dt);
  const fwdBefore = fwd;
  if (up) fwd += (empty ? 120 : c.accel + (c.nitroOn ? nc.accel : 0)) * dt;
  if (down) fwd -= (fwd > 20 ? 700 : 300) * dt;
  if (handbrake) fwd *= Math.exp(-1.5 * dt);
  fwd *= Math.exp(-(sandy ? c.sandDrag : 0.4) * dt);    // homokban lassabb
  if (!up && !down && Math.abs(fwd) < 5) fwd = 0;
  const cap = empty ? 60 : c.nitroOn ? (sandy ? c.maxSand + 120 : nc.max) : sandy ? c.maxSand : c.maxRoad;
  // a végsebességnél megáll a gyorsulás; ha fölötte volt (pl. nitró után, homokba érve), fokozatosan lassul vissza
  if (fwd > cap) fwd = fwdBefore > cap ? Math.max(cap, Math.min(fwd, fwdBefore) - 400 * dt) : cap;
  fwd = Math.max(-180, fwd);
  const grip = handbrake ? 1.2 : 12;                   // kézifékkel alig tapad → csúszik
  lat *= Math.exp(-grip * dt);

  c.vx = fwd * fx - lat * fy + windX() * 40 * dt;
  c.vy = fwd * fy + lat * fx + windY() * 40 * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.braking = down || handbrake;
  collide(c, true);

  // csúszás: féknyom és füst a hátsó kerekeknél
  const speed = Math.hypot(c.vx, c.vy);
  c.skid = speed > 90 && (Math.abs(lat) > (handbrake ? 40 : 250) || (handbrake && Math.abs(fwd) > 200));
  const wheels = [-1, 1].map(side => {
    const lx = -c.len / 3, ly = side * (c.wid / 2 - 3);
    return { x: c.x + fx * lx - fy * ly, y: c.y + fy * lx + fx * ly };
  });
  if (c.skid) {
    if (c.lastWheels) {
      for (let i = 0; i < 2; i++) {
        skidMarks.push({ x1: c.lastWheels[i].x, y1: c.lastWheels[i].y, x2: wheels[i].x, y2: wheels[i].y, born: clock });
      }
      if (skidMarks.length > MAX_SKID) skidMarks.splice(0, skidMarks.length - MAX_SKID);
    }
    for (const w of wheels) if (rand() < 0.6) addSmoke(w.x, w.y, -c.vx * 0.1, -c.vy * 0.1);
  }
  c.lastWheels = c.skid ? wheels : null;
  if (c.wrecked && rand() < dt * 10) addSmoke(c.x, c.y, 0, 0, '#555');   // a roncs füstöl
}

function addSmoke(x, y, vx, vy, dark) {
  smoke.push({ x, y, vx: vx + (rand() - 0.5) * 40, vy: vy + (rand() - 0.5) * 40,
    r: 6 + rand() * 6, life: 0, max: 1 + rand() * 0.8, dark: !!dark });
  if (smoke.length > MAX_SMOKE) smoke.splice(0, smoke.length - MAX_SMOKE);
}

function carCollisions() {
  const all = car.plane ? [...aiCars] : [car, ...aiCars];          // a repülő a földi autók fölött halad
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min || d < 0.001) continue;
      const nx = dx / d, ny = dy / d, push = (min - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) {
        const imp = -rv * 0.65;
        a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
        if (-rv > 250) { if (a !== car) damageCar(a); if (b !== car) damageCar(b); }
      }
    }
  }
  // elütés: gyors autó megöli a gyalogost
  for (const c of all) {
    for (const p of npcs) {
      if (p.dead) continue;
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
      if (d >= c.r + p.r || d < 0.001) continue;
      if (Math.hypot(c.vx, c.vy) > 120) killNpc(p, c === car && player.inCar);
      else if (p.kind === 'homeless') {                // az ülő csöves nem tolható el: az autó áll meg
        c.x = p.x - dx / d * (c.r + p.r); c.y = p.y - dy / d * (c.r + p.r);
        c.vx *= 0.3; c.vy *= 0.3;
      } else { p.x = c.x + dx / d * (c.r + p.r); p.y = c.y + dy / d * (c.r + p.r); }
    }
  }
}

function damageCar(c) {
  if (c.wrecked) return;
  c.health -= 1;
  if (c.health <= 0) { c.wrecked = true; for (let i = 0; i < 12; i++) addSmoke(c.x, c.y, 0, 0, true); }
}

function killNpc(p, byPlayer) {
  if (p.dead) return;
  p.dead = clock;
  if (byPlayer) player.kills++;
  alertPeds(p.x, p.y);
}

function damagePlayer(n) {
  if (player.dead) return;
  if (clock < (player.shieldUntil || 0)) return;                 // újraéledés utáni rövid védelem a harcmezőn
  player.health -= n;
  player.lastHit = clock;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = 3;
    player.riding = null;
    if (player.inCar) { player.inCar = false; player.x = car.x; player.y = car.y; }
    message = { text: 'MEGHALTÁL', until: clock + 3 };
    loseStreak();
  }
}

// ===== Térkép (ADR-0030): K – nagy térkép a nevezetes helyekkel; kattintással saját pontok jelölése =====
const MAP_RADIUS = 25000, TAXI_PINS = 3;   // a taxi-listában csak a 3 legközelebbi jelölés (különben kilóg a képernyőről)
const POI_TYPES = {
  station: { icon: '⛽', name: 'Benzinkutak', color: '#ff8a1f' },
  factory: { icon: '🏭', name: 'Gyárak', color: '#bbb' },
  bank: { icon: '🏦', name: 'Bankok', color: '#7df' },
  pub: { icon: '🍺', name: 'Kocsmák', color: '#7f7' },
  shop: { icon: '🛒', name: 'Boltok', color: '#c9f' },
  school: { icon: '🏫', name: 'Iskolák', color: '#ffd23a' },
  restaurant: { icon: '🍽', name: 'Éttermek', color: '#ffb060' },
  mechanic: { icon: '🔧', name: 'Autószerelők', color: '#7df' },
  train: { icon: '🚆', name: 'Vasútállomások', color: '#9fd8ff' },
  phone: { icon: '📱', name: 'Telefonboltok', color: '#7fe0ff' },
  pin: { icon: '📍', name: 'Saját jelölések', color: '#f6c' },
};
const mapView = { open: false, pois: [], cats: { station: true, factory: true, bank: true, pub: true, shop: true, school: true, restaurant: true, mechanic: true, train: true, phone: true, pin: true }, hits: [], layout: null };

// nevezetes helyek egy négyzetben (benzinkút, gyár, bank, kocsma)
function poisIn(xa, ya, xb, yb) {
  const out = stationsIn(xa, ya, xb, yb).map(st => ({ type: 'station', x: (st.canopy.x0 + st.canopy.x1) / 2, y: (st.canopy.y0 + st.canopy.y1) / 2 }));
  for (const hs of housesIn(xa, ya, xb, yb)) {
    const type = hs.bank ? 'bank' : hs.factory ? 'factory' : hs.pub ? 'pub' : hs.shop ? 'shop' : hs.school ? 'school' : hs.restaurant ? 'restaurant' : hs.mechanic ? 'mechanic' : hs.phoneShop ? 'phone' : null;
    if (type) out.push({ type, x: hs.x, y: hs.y });
  }
  for (const st of railStopsIn(xa, ya, xb, yb)) out.push({ type: 'train', x: st.x, y: st.y });
  return out;
}
const visiblePois = () => mapView.pois.filter(p => mapView.cats[p.type]);

function openMap() {
  mapView.pois = poisIn(player.x - MAP_RADIUS, player.y - MAP_RADIUS, player.x + MAP_RADIUS, player.y + MAP_RADIUS);
  mapView.center = { x: player.x, y: player.y };
  mapView.open = true;
  for (const k in keys) keys[k] = false; mouse.down = false;
}
function closeMap() { mapView.open = false; }
function toggleMapCat(type) { mapView.cats[type] = !mapView.cats[type]; }

// képernyő ↔ világ átváltás a nagy térképen
function mapLayout(w, h) {
  const S = Math.max(200, Math.min(w - 300, h - 80)), x0 = 40, y0 = (h - S) / 2;
  return { S, x0, y0, k: S / (2 * MAP_RADIUS) };
}
const mapToWorld = (L, sx, sy) => ({ x: mapView.center.x + (sx - L.x0 - L.S / 2) / L.k, y: mapView.center.y + (sy - L.y0 - L.S / 2) / L.k });
const worldToMap = (L, x, y) => ({ x: L.x0 + L.S / 2 + (x - mapView.center.x) * L.k, y: L.y0 + L.S / 2 + (y - mapView.center.y) * L.k });

// kattintás: a jelmagyarázaton kategória ki/be, a térképen saját pont jelölése (vagy a meglévő törlése)
function mapClick(sx, sy) {
  for (const h of mapView.hits) if (sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) { if (h.close) closeMap(); else toggleMapCat(h.cat); return; }
  const L = mapView.layout;
  if (!L || sx < L.x0 || sx > L.x0 + L.S || sy < L.y0 || sy > L.y0 + L.S) return;
  const hit = progress.pins.findIndex(pn => { const m = worldToMap(L, pn.x, pn.y); return Math.hypot(m.x - sx, m.y - sy) < 12; });
  if (hit >= 0) { progress.pins.splice(hit, 1); popup('📍 Jelölés törölve', '#f6c'); }
  else if (progress.pins.length >= PIN_MAX) popup(`Legfeljebb ${PIN_MAX} jelölésed lehet – kattints egyre a törléshez`, '#f66');
  else { progress.pins.push(mapToWorld(L, sx, sy)); popup('📍 Pont megjelölve (a radaron és taxi célként is)', '#f6c'); }
  saveProgress();
}
function mapKey(code) {
  if (code === 'Escape' || code === 'KeyK') closeMap();
  if ((code === 'Delete' || code === 'Backspace') && progress.pins.length) {   // a térképen kívülre esett jelölések is törölhetők
    progress.pins = []; saveProgress(); popup('📍 Minden jelölés törölve', '#f6c');
  }
  const m = /^Digit([0-9])$/.exec(code), cat = code === 'KeyP' ? 'pin' : m && Object.keys(POI_TYPES)[(+m[1] + 9) % 10];   // 1–9, 0: a jelmagyarázat sorrendjében; P: a saját jelölések
  if (cat) toggleMapCat(cat);
}

// a radarhoz: a közeli nevezetes helyek másodpercenként frissítve (ne számoljuk minden képkockában)
const radarPoiCache = { t: -99, x: 0, y: 0, list: [] };
function radarPois() {
  if (clock - radarPoiCache.t > 1 || Math.hypot(player.x - radarPoiCache.x, player.y - radarPoiCache.y) > 600) {
    Object.assign(radarPoiCache, { t: clock, x: player.x, y: player.y, list: poisIn(player.x - 4700, player.y - 4700, player.x + 4700, player.y + 4700) });
  }
  return radarPoiCache.list;
}

// ===== Taxi (ADR-0029): X – hívás, E – úti cél, $5; az út rövid elsötétítéssel „átugorható” (a pálya végtelen) =====
const TAXI_FARE = 5, TAXI_WAIT = 30, TAXI_TRIP = 2.5, TAXI_COME = 45;   // ha 45 mp alatt nem ér oda, lemond
const TAXI_MODEL = { type: 'taxicab', color: ['#f2c230', '#c09010'], len: 74, wid: 36, accel: 450, maxRoad: 620, maxSand: 380, sandDrag: 0.9, fuelUse: 1 };
let taxi = null;                                   // a hívott taxi (aiCars-ban, taxicab jelzővel)
let taxiTrip = null;                               // { dest, t }
const taxiMenu = { open: false, items: [], sel: 0, hits: [] };

// a játékoshoz legközelebbi sávpont (ide áll be a taxi)
function pickupPoint() {
  const rx = nearestRoad(player.x), ry = nearestRoad(player.y);
  return Math.abs(player.y - ry) < Math.abs(player.x - rx)
    ? { x: player.x, y: ry + (player.y > ry ? 40 : -40) } : { x: rx + (player.x > rx ? 40 : -40), y: player.y };
}

function callTaxi() {
  if (!controllable() || player.inCar || player.inHouse || player.riding) return false;
  if (taxi && aiCars.includes(taxi)) { popup('🚕 A taxi már úton van', '#f2c230'); return false; }
  const p = pickupPoint(), horiz = Math.abs(p.y - nearestRoad(p.y)) <= 40;
  const dir = rand() < 0.5 ? 1 : -1, along = (horiz ? p.x : p.y) - dir * 700;
  taxi = spawnAiCar(horiz ? 'h' : 'v', dir, horiz ? nearestRoad(p.y) : nearestRoad(p.x), along);
  applyCarModel(taxi, TAXI_MODEL);
  Object.assign(taxi, { taxicab: true, state: 'coming', waitUntil: 0, comeUntil: clock + TAXI_COME, stuckT: 0, reverseT: 0 });
  popup(`🚕 Hívtál egy taxit – pár mp és itt van ($${TAXI_FARE} bárhova)`, '#f2c230');
  return true;
}

function taxiInput(c, dt) {
  if (c.wrecked) return { up: false, down: false, steer: 0, handbrake: true };
  if (c.state !== 'coming') return { up: false, down: Math.hypot(c.vx, c.vy) > 20, steer: 0, handbrake: Math.hypot(c.vx, c.vy) <= 20 };
  const t = pickupPoint(), d = Math.hypot(t.x - c.x, t.y - c.y);
  if (d < 60) { c.state = 'waiting'; c.waitUntil = clock + TAXI_WAIT; popup('🚕 Megérkezett a taxi – állj mellé, E', '#f2c230'); }
  const diff = wrapAngle(Math.atan2(t.y - c.y, t.x - c.x) - c.angle);
  const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  if (c.reverseT > 0) { c.reverseT -= dt; return { up: false, down: true, steer: -clamp(diff * 2, -1, 1), handbrake: false }; }
  if (Math.abs(fwd) < 20 && d > 60) { c.stuckT += dt; if (c.stuckT > 1.5) { c.stuckT = 0; c.reverseT = 1; } } else c.stuckT = 0;
  const want = Math.min(500, d * 1.1);                // a cél előtt időben lassít
  return { up: fwd < want, down: fwd > want + 20, steer: clamp(diff * 3, -1, 1), handbrake: false };
}

const taxiReady = () => taxi && taxi.state === 'waiting' && aiCars.includes(taxi) && !taxi.wrecked && !player.inCar && !player.inHouse && !player.riding
  && dist(player, taxi) < taxi.r + 110;   // a járdáról is elérhető

// úti célok: mindig a legközelebbi (egyre nagyobb körben keresve)
function nearestHouseOf(pred) {
  for (let rad = 6000; rad <= 48000; rad *= 2) {
    const hs = housesIn(player.x - rad, player.y - rad, player.x + rad, player.y + rad).filter(pred);
    if (hs.length) return hs.reduce((a, b) => (Math.hypot(a.x - player.x, a.y - player.y) <= Math.hypot(b.x - player.x, b.y - player.y) ? a : b));
  }
  return null;
}
function taxiDestinations() {
  const out = [{ label: '🏠 Kezdőhely', x: START_X, y: START_Y }];
  out.push({ label: '🚗 Az autód', x: car.x + 60, y: car.y });
  const ns = nearestStation(player.x, player.y); if (ns) out.push({ label: '⛽ Legközelebbi benzinkút', x: ns.st.sign.x, y: ns.st.sign.y });
  for (const [label, pred] of [['🏦 Legközelebbi bank', h => h.bank], ['🍺 Legközelebbi kocsma', h => h.pub], ['🏭 Legközelebbi gyár', h => h.factory], ['🛒 Legközelebbi bolt', h => h.shop], ['🏫 Legközelebbi iskola', h => h.school],
    ['🍽 Legközelebbi étterem', h => h.restaurant], ['🔧 Legközelebbi autószerelő', h => h.mechanic], ['📱 Legközelebbi telefonbolt', h => h.phoneShop]]) {
    const hs = nearestHouseOf(pred); if (hs) { const d = doorOf(hs); out.push({ label, x: d.x, y: d.y }); }
  }
  for (let rad = 6000; rad <= 48000; rad *= 2) {                       // legközelebbi vasútállomás (a peronra visz)
    const st = railStopsIn(player.x - rad, player.y - rad, player.x + rad, player.y + rad);
    if (st.length) { const b = st.reduce((a, c) => (Math.hypot(a.x - player.x, a.y - player.y) <= Math.hypot(c.x - player.x, c.y - player.y) ? a : c)); out.push({ label: '🚆 Legközelebbi vasútállomás', x: b.x, y: b.y }); break; }
  }
  if (race.state === 'idle' && race.offer) out.push({ label: '🏁 Verseny rajt', x: race.offer.x, y: race.offer.y });
  progress.pins.map((pn, i) => ({ label: `📍 ${i + 1}. jelölt pont`, x: pn.x, y: pn.y }))
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))
    .slice(0, TAXI_PINS).forEach(d => out.push(d));
  return out.map(o => ({ ...o, km: (Math.hypot(o.x - player.x, o.y - player.y) / 10000).toFixed(1) }));
}
function openTaxiMenu() { Object.assign(taxiMenu, { open: true, items: taxiDestinations(), sel: 0 }); for (const k in keys) keys[k] = false; mouse.down = false; }
function closeTaxiMenu() { taxiMenu.open = false; }
function startTrip(i) {
  const dest = taxiMenu.items[i];
  if (!dest) return false;
  if (progress.money < TAXI_FARE) { popup(`A taxi $${TAXI_FARE} – nincs elég pénzed!`, '#f66'); return false; }
  progress.money -= TAXI_FARE; saveProgress();
  taxiTrip = { dest, t: TAXI_TRIP };
  closeTaxiMenu();
  return true;
}
function dismissTaxi(msg) {
  if (taxi) { const i = aiCars.indexOf(taxi); if (i >= 0 && !taxi.wrecked) aiCars.splice(i, 1); }
  taxi = null;
  if (msg) popup(msg, '#f2c230');
}
function updateTaxi(dt) {
  if (taxi && !aiCars.includes(taxi)) taxi = null;
  if (taxi && !taxiTrip) {
    if (taxi.wrecked) { taxi = null; popup('🚕 A taxi tönkrement – hívj egy másikat (X)', '#f66'); }
    else if (player.inCar) dismissTaxi('🚕 Beültél az autódba – a taxit lemondtad');
    else if (taxi.state === 'coming' && clock > taxi.comeUntil) dismissTaxi('🚕 A taxi nem ért oda – hívj újat (X)');
  }
  if (taxi && taxi.state === 'waiting' && clock > taxi.waitUntil && !taxiTrip) {   // nem szálltál be: elmegy
    aiCars.splice(aiCars.indexOf(taxi), 1); taxi = null; popup('🚕 A taxi nem várt tovább', '#f2c230');
  }
  if (!taxiTrip) return;
  taxiTrip.t -= dt;
  if (taxiTrip.t > 0) { if (taxi) { player.x = taxi.x; player.y = taxi.y; } return; }
  const d = taxiTrip.dest;                         // megérkezés: a cél mellett szállsz ki
  Object.assign(player, { x: d.x, y: d.y, inCar: false, riding: null, inHouse: null });
  collide(player);
  if (taxi) { const i = aiCars.indexOf(taxi); if (i >= 0) aiCars.splice(i, 1); }
  taxi = null; taxiTrip = null;
  popup(`🚕 Megérkeztél: ${d.label.slice(2).trim()}`, '#f2c230');
}
function taxiMenuKey(code) {
  if (code === 'Escape') closeTaxiMenu();
  else if (code === 'ArrowUp' || code === 'KeyW') taxiMenu.sel = (taxiMenu.sel + taxiMenu.items.length - 1) % taxiMenu.items.length;
  else if (code === 'ArrowDown' || code === 'KeyS') taxiMenu.sel = (taxiMenu.sel + 1) % taxiMenu.items.length;
  else if (code === 'Enter' || code === 'Space') startTrip(taxiMenu.sel);
}
function taxiMenuClick(x, y) {
  for (const h of taxiMenu.hits) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { if (h.cancel) closeTaxiMenu(); else startTrip(h.i); return; }
}

const RESPAWN_SHIELD = 3, WAR_RESPAWN_DIST = 800, WAR_RESPAWN_RANGE = 4000;
function respawn(fromDeath = false) {
  const dx = player.x, dy = player.y;
  // háborúban meghalva ott éledsz újra, a csatatér szélén (3 mp védelemmel); atombomba-figyelmeztetés alatt, vagy ha messze haltál meg, a kezdőhelyen
  const inWar = fromDeath && war && !war.nukeArmed && Math.hypot(dx - war.x, dy - war.y) < WAR_RESPAWN_RANGE;
  Object.assign(player, { x: START_X, y: START_Y, angle: 0, inCar: false, riding: null, inHouse: null, health: 100, dead: 0, arrested: 0, drunk: 0, passedOut: 0, abduct: null, moon: null });
  taxiTrip = null; if (taxi) { const i = aiCars.indexOf(taxi); if (i >= 0) aiCars.splice(i, 1); taxi = null; }
  leaveHorse(false);                                 // meghalt lovaglás közben: az autója visszakerül
  leavePlane(false);                                 // repülés közben: a gép lezuhan, az autó visszakerül
  nukeDevices.length = 0;                            // a lerakott atombombát hatástalanítják (ne öljön meg újra a kezdőhelyen)
  stopRadio();
  clearWanted();
  for (let i = aiCars.length - 1; i >= 0; i--) if (aiCars[i].police) aiCars.splice(i, 1);
  Object.assign(car, { x: START_X + 100, y: START_Y - 50, angle: 0, vx: 0, vy: 0, lastWheels: null, fuel: Math.max(car.fuel, 40) });
  if (car.rental) car.ownFuel = Math.max(car.ownFuel || 0, 40);   // bérlés közben a saját autó is megkapja a minimumot
  message = { text: 'Újraéledtél', until: clock + 2 };
  if (inWar) {                                                     // a csatatér szélén, a halálod irányában; az autód melletted áll
    const ax = dx - war.x, ay = dy - war.y, al = Math.hypot(ax, ay) || 1, ux = al > 1 ? ax / al : 1, uy = al > 1 ? ay / al : 0;
    Object.assign(player, { x: war.x + ux * WAR_RESPAWN_DIST, y: war.y + uy * WAR_RESPAWN_DIST, angle: Math.atan2(-uy, -ux) });
    Object.assign(car, { x: player.x + 70, y: player.y + 30 });
    collide(player); collide(car, true);
    player.shieldUntil = clock + RESPAWN_SHIELD;
    message = { text: '⚔ Újraéledtél a harcmezőn – 3 mp védelem!', until: clock + 2.5, color: '#ff5a2a' };
  }
}

// ===== Rendőrség =====
function raiseWanted(level, why) {
  if (level <= wanted.level) return;
  wanted.level = level;
  wanted.lostTimer = 0;
  message = { text: why || (level === 1 ? 'GYORSHAJTÁS! ÜLDÖZ A RENDŐRSÉG!' : 'RENDŐRRE LŐTTÉL! ★★'), until: clock + 2.5, color: '#4af' };
}

function clearWanted() {
  wanted.level = 0; wanted.lostTimer = 0; wanted.bustTimer = 0;
  for (const c of aiCars) {
    if (!c.chasing) continue;
    c.chasing = false;                       // visszaáll forgalomba
    const rx = nearestRoad(c.x), ry = nearestRoad(c.y);
    c.ai = Math.abs(c.y - ry) < Math.abs(c.x - rx)
      ? { axis: 'h', dir: Math.cos(c.angle) >= 0 ? 1 : -1, road: ry, speed: 280, lastCross: null }
      : { axis: 'v', dir: Math.sin(c.angle) >= 0 ? 1 : -1, road: rx, speed: 280, lastCross: null };
  }
}

function spawnPolice() {
  const axis = rand() < 0.5 ? 'h' : 'v', dir = rand() < 0.5 ? 1 : -1;
  const road = nearestRoad(axis === 'h' ? player.y : player.x);
  const along = (axis === 'h' ? player.x : player.y) - dir * (900 + rand() * 500);
  const pos = axis === 'h' ? { x: along, y: road + dir * 40 } : { x: road - dir * 40, y: along };
  if (dist(pos, player) < 700 || dist(pos, player) > 2400) return null;
  const angle = axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const c = makeCar(pos.x, pos.y, angle, POLICE_MODEL.color);
  applyCarModel(c, POLICE_MODEL);
  Object.assign(c, { police: true, chasing: true, health: 10, stuckT: 0, reverseT: 0 });
  c.vx = Math.cos(angle) * 300; c.vy = Math.sin(angle) * 300;
  aiCars.push(c);
  return c;
}

// üldözés: a játékos felé hajt, éles kanyarban kézifékkel driftel, ha elakad, tolat
function policeInput(c, dt) {
  if (c.wrecked) return { up: false, down: false, steer: 0, handbrake: true };
  const t = player.inCar ? car : player;
  const tvx = player.inCar ? car.vx : 0, tvy = player.inCar ? car.vy : 0;
  const tx = t.x + tvx * 0.4, ty = t.y + tvy * 0.4;
  const d = dist(c, t);
  const diff = wrapAngle(Math.atan2(ty - c.y, tx - c.x) - c.angle);
  const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  if (c.reverseT > 0) {
    c.reverseT -= dt;
    return { up: false, down: true, steer: -clamp(diff * 2, -1, 1), handbrake: false };
  }
  if (Math.abs(fwd) < 20 && d > 160) { c.stuckT += dt; if (c.stuckT > 1.5) { c.stuckT = 0; c.reverseT = 1; } }
  else c.stuckT = 0;
  // közel lassít, és szorosan (a letartóztatási távolságon belül) mellé áll
  const tsp = Math.hypot(tvx, tvy);
  const want = d < 85 ? Math.max(0, tsp - 30) : d < 260 ? Math.max(120, tsp) : 700;
  return {
    up: fwd < want,
    down: fwd > want + 40,
    steer: clamp(diff * 3, -1, 1),
    handbrake: Math.abs(diff) > 1.2 && fwd > 250,
  };
}

// ===== Autóversenyek (ADR-0020) =====
// Rajt a közeli kereszteződésnél; 3 szakasz a rácson (6 ellenőrzőpont); 3 AI ellenfél; díj a helyezésért.
const RACE_PRIZES = [600, 250, 100, 0];
const RACE_RIVALS = [
  { name: 'Lila Villám', color: ['#c040e0', '#8a20a8'], maxRoad: 600 },
  { name: 'Kék Cápa', color: ['#00b4f0', '#0080b0'], maxRoad: 620 },
  { name: 'Narancs Rakéta', color: ['#ff7a10', '#c05a00'], maxRoad: 640 },
];
const race = { state: 'idle', offer: null, route: [], racers: [], cp: 0, countdown: 0, time: 0, finished: [], cooldown: 5, slot: null };
let racesEnabled = true;   // teszteléshez kikapcsolható

function planRace() {
  const X0 = nearestRoad(player.x), Y0 = nearestRoad(player.y);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let [dx, dy] = dirs[(rand() * 4) | 0];
  const first = [dx, dy];
  const route = [];
  let x = X0, y = Y0;
  for (let leg = 0; leg < 3; leg++) {
    if (leg > 0 && rand() < 0.6) { const t = rand() < 0.5 ? 1 : -1; [dx, dy] = [-dy * t, dx * t]; }   // kanyar a kereszteződésben
    const nx = x + dx * ROAD_SPACING, ny = y + dy * ROAD_SPACING;
    route.push({ x: (x + nx) / 2, y: (y + ny) / 2 }, { x: nx, y: ny });
    x = nx; y = ny;
  }
  race.route = route;
  race.offer = { x: X0 + first[0] * 600, y: Y0 + first[1] * 600, dx: first[0], dy: first[1] };
}

function startRace() {
  const { x, y, dx, dy } = race.offer, angle = Math.atan2(dy, dx);
  const px = -dy, py = dx;                                 // oldalirány
  const slots = [[0, 40], [0, -40], [-130, 40], [-130, -40]].map(([a, l]) => ({ x: x + dx * a + px * l, y: y + dy * a + py * l }));
  race.slot = slots[2];                                    // a játékos a második sorból indul
  Object.assign(car, { x: race.slot.x, y: race.slot.y, angle, vx: 0, vy: 0 });
  race.racers = [0, 1, 3].map((si, i) => {
    const m = RACE_RIVALS[i], c = makeCar(slots[si].x, slots[si].y, angle, m.color);
    Object.assign(c, { racer: true, number: i + 1, rivalName: m.name, cp: 0, maxRoad: m.maxRoad, maxSand: 420, accel: 430,
      slot: slots[si], stuckT: 0, reverseT: 0 });
    aiCars.push(c);
    return c;
  });
  Object.assign(race, { state: 'countdown', countdown: 3, cp: 0, time: 0, finished: [] });
}

function endRace(text, color) {
  for (const r of race.racers) { const i = aiCars.indexOf(r); if (i >= 0) aiCars.splice(i, 1); }
  Object.assign(race, { state: 'idle', offer: null, route: [], racers: [], cooldown: 20, slot: null });
  if (text) message = { text, until: clock + 3, color };
}

// a versenyző a következő ellenőrzőpont felé hajt; ha elakad, tolat
function racerInput(c, dt) {
  if (c.wrecked || race.state !== 'running' || c.cp >= race.route.length) return { up: false, down: false, steer: 0, handbrake: true };
  const t = race.route[c.cp];
  const diff = wrapAngle(Math.atan2(t.y - c.y, t.x - c.x) - c.angle);
  const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  if (c.reverseT > 0) { c.reverseT -= dt; return { up: false, down: true, steer: -clamp(diff * 2, -1, 1), handbrake: false }; }
  if (Math.abs(fwd) < 20) { c.stuckT += dt; if (c.stuckT > 1.5) { c.stuckT = 0; c.reverseT = 1; } } else c.stuckT = 0;
  const want = Math.abs(diff) > 0.5 ? 220 : 800;           // kanyar előtt lassít
  return { up: fwd < want, down: fwd > want + 60, steer: clamp(diff * 3, -1, 1), handbrake: Math.abs(diff) > 1.1 && fwd > 300 };
}

function racePosition() {
  const left = o => Math.hypot(o.x - (race.route[o.cpIdx] || o).x, o.y - (race.route[o.cpIdx] || o).y);
  const rows = [{ me: true, cp: race.cp, x: car.x, y: car.y }, ...race.racers.map(r => ({ cp: r.cp, x: r.x, y: r.y }))]
    .map(o => ({ ...o, cpIdx: o.cp }));
  rows.sort((a, b) => b.cp - a.cp || left(a) - left(b));
  return rows.findIndex(o => o.me) + 1;
}

function updateRace(dt) {
  if (!racesEnabled && race.state === 'idle') return;
  if (race.state === 'idle') {
    race.cooldown -= dt;
    if (race.offer && dist(race.offer, player) > 9000) { race.offer = null; race.cooldown = 2; }
    if (!race.offer && race.cooldown <= 0) { planRace(); popup('🏁 Autóverseny a közelben – hajts be a rajtba!', '#7df'); }
    if (race.offer && player.inCar && controllable() && dist(car, race.offer) < 90) startRace();
    return;
  }
  const n = race.route.length;
  if (race.state === 'countdown') {                        // visszaszámlálás alatt mindenki áll a rajtban
    race.countdown -= dt;
    for (const c of [car, ...race.racers]) {
      const sl = c === car ? race.slot : c.slot;
      Object.assign(c, { x: sl.x, y: sl.y, vx: 0, vy: 0, angle: Math.atan2(race.offer.dy, race.offer.dx) });
    }
    message = { text: race.countdown > 0 ? String(Math.ceil(race.countdown)) : 'RAJT!', until: clock + 0.6, color: '#7df' };
    if (race.countdown <= 0) race.state = 'running';
    return;
  }
  race.time += dt;
  for (const r of race.racers) {
    if (r.cp < n && dist(r, race.route[r.cp]) < 150) {
      r.cp++;
      if (r.cp === n) race.finished.push(r);
    }
  }
  if (dist(car, race.route[race.cp]) < 150 && player.inCar) {
    race.cp++;
    if (race.cp === n) {
      const place = race.finished.length + 1;
      progress.raceWins = (progress.raceWins || 0) + (place === 1 ? 1 : 0);
      earn(RACE_PRIZES[place - 1], `verseny – ${place}. hely`);
      endRace(place === 1 ? 'GYŐZTÉL! 🏆' : `CÉLBA ÉRTÉL: ${place}. hely`, place === 1 ? '#ffd23a' : '#7df');
      return;
    }
    popup(`Ellenőrzőpont ${race.cp}/${n}`, '#7df');
  }
  if (!controllable()) endRace(null);                       // halál / letartóztatás üzenete marad
  else if (!player.inCar || race.time > 240) endRace('A versenyt feladtad', '#f66');
}

function updateWanted(dt) {
  // gyorshajtás az úton (és járdán)
  const kmh = Math.hypot(car.vx, car.vy) / KMH;
  if (player.inCar && controllable() && !car.plane && onRoad(car.x, car.y, SIDEWALK_W) && kmh > SPEED_LIMIT) raiseWanted(1);
  if (player.inCar && controllable() && kmh > 10 && (player.drunk || 0) >= DRUNK_DRIVE) raiseWanted(1, 'ITTAS VEZETÉS! ÜLDÖZ A RENDŐRSÉG!');   // bárhol, nem csak az úton
  if (!wanted.level) return;

  const cops = aiCars.filter(c => c.chasing && !c.wrecked);
  if (policeEnabled && cops.length < POLICE_COUNT[wanted.level] && rand() < dt * 0.8) spawnPolice();

  // lerázás: ha 12 mp-ig egy rendőr sincs 1500 px-en belül
  const t = player.inCar ? car : player;
  if (!player.inHouse && cops.some(c => dist(c, t) < 1500)) wanted.lostTimer = 0;   // házban nem látnak
  else wanted.lostTimer += dt;
  if (wanted.lostTimer > 12) {
    const lvl = wanted.level;
    clearWanted();
    earn(150 * lvl, 'lerázás');
    message = { text: 'Leráztad a rendőröket!', until: clock + 2.5, color: '#7f7' };
    return;
  }
  // letartóztatás: ha állsz és egy rendőr melletted van
  const veh = player.inCar ? car : player.riding;   // autóban vagy buszon a jármű sebessége számít
  const slow = !veh || Math.hypot(veh.vx, veh.vy) < 40;
  if (controllable() && !player.inHouse && slow && cops.some(c => dist(c, t) < (player.inCar ? 110 : 90))) wanted.bustTimer += dt;
  else wanted.bustTimer = 0;
  if (wanted.bustTimer > 1.5) {
    player.arrested = 3;
    player.riding = null;
    if (player.inCar) { player.inCar = false; player.x = car.x + 40; player.y = car.y; }
    const fine = Math.round(progress.money * 0.1);
    progress.money -= fine;
    saveProgress();
    message = { text: fine ? `LETARTÓZTATTAK! -$${fine}` : 'LETARTÓZTATTAK!', until: clock + 3, color: '#4af' };
    loseStreak();
  }
}

// ===== Lövöldözés =====
function shoot(x, y, ang, from, offset) {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  bullets.push({ x: x + cx * offset, y: y + cy * offset, vx: cx * 1100, vy: cy * 1100, life: 0.9, from });
  flashes.push({ x: x + cx * (offset + 2), y: y + cy * (offset + 2), until: clock + 0.05 });
  alertPeds(x, y);
}

function alertPeds(x, y) {
  for (const p of npcs) {
    if (p.kind === 'ped' && !p.dead && Math.hypot(p.x - x, p.y - y) < 600) { p.flee = 4; p.fx = x; p.fy = y; }
  }
}

// ===== Többjátékos mód (ADR-0044): ha a játék a saját szerveréről (node server.js) fut, a /ws-en látjuk egymást =====
// A világ képletből épül (mindenkinél ugyanolyan), ezért csak a játékosok helyzete és kinézete utazik a hálózaton.
const NET_SEND = 0.1;
const net = { ws: null, id: 0, online: false, others: new Map(), sendT: 0, name: '', tries: 0, keepAlive: null };
function netName() {
  try { const n = window.localStorage.getItem('gta.name'); if (n) return n; } catch (e) { /* nincs tárhely */ }
  const n = 'Játékos ' + (100 + ((Math.random() * 900) | 0));
  try { window.localStorage.setItem('gta.name', n); } catch (e) { /* nincs tárhely */ }
  return n;
}
function netConnect() {                             // a GitHub Pages-en (statikus oldal) nincs szerver: ott egyjátékos marad
  const loc = window.location, WS = window.WebSocket;
  if (!WS || !loc || !/^https?:$/.test(loc.protocol) || /github\.io$/.test(loc.hostname)) return false;
  net.name = netName();
  let ws; try { ws = new WS((loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host + '/ws'); } catch (e) { return false; }
  net.ws = ws;
  ws.onopen = () => { net.online = true; net.tries = 0; popup(`🌐 Csatlakoztál a szerverhez – ${net.name} néven`, '#7fe0ff'); };
  ws.onclose = () => {                              // kapcsolatbontás: újracsatlakozás egyre ritkábban (2, 4, … legfeljebb 30 mp)
    if (net.online) popup('🌐 Megszakadt a kapcsolat a szerverrel – újracsatlakozás…', '#f66');
    net.online = false; net.others.clear(); net.ws = null; net.id = 0;
    net.tries++;
    if (net.tries <= 20 && typeof setTimeout === 'function') setTimeout(netConnect, Math.min(30000, 2000 * net.tries));
  };
  ws.onerror = () => {};
  ws.onmessage = ev => netReceive(ev.data);
  if (!net.keepAlive && typeof setInterval === 'function') net.keepAlive = setInterval(netSend, 1000);   // életjel akkor is, ha a játék áll (menü, telefon) vagy a lap a háttérben van
  return true;
}
function netReceive(text) {                         // a szerver üzenetei: hello (saját azonosító), players (mindenki helyzete)
  let msg; try { msg = JSON.parse(text); } catch (e) { return; }
  if (!msg) return;
  if (msg.t === 'hello') net.id = msg.id;
  if (msg.t === 'players' && Array.isArray(msg.list)) {
    const seen = new Set();
    for (const o of msg.list) {
      if (!o || o.id === net.id || !Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
      seen.add(o.id);
      const cur = net.others.get(o.id);
      if (cur) Object.assign(cur, o, { px: cur.dx, py: cur.dy, pa: cur.da, k: 0 });        // a régi kirajzolt helyről úszik az újra
      else net.others.set(o.id, { ...o, px: o.x, py: o.y, pa: o.a, dx: o.x, dy: o.y, da: o.a, k: 1 });
    }
    for (const id of [...net.others.keys()]) if (!seen.has(id)) net.others.delete(id);   // kilépett
  }
}
function netState() {                               // amit a többiek látnak belőlünk
  const sk = SKINS[activeSkin], t = player.inCar ? car : player;
  return { name: net.name, x: Math.round(t.x), y: Math.round(t.y), a: +(player.inCar ? car.angle : player.angle).toFixed(2), car: !!player.inCar, len: car.len, wid: car.wid,
    c0: car.color[0], c1: car.color[1], kind: car.type, shirt: sk.shirt, head: sk.head, legs: sk.legs || '', hat: sk.hat || '', hp: Math.round(player.health), dead: !!player.dead };
}
function netSend() {
  if (!net.online || !net.ws) return;
  try { net.ws.send(JSON.stringify({ t: 'state', s: netState() })); } catch (e) { /* a következő körben újra */ }
}
function netInterp(dt) {                            // sima mozgás a két üzenet között (a frame-ből: menü / telefon alatt is)
  for (const o of net.others.values()) {
    o.k = Math.min(1, o.k + dt / NET_SEND);
    o.dx = o.px + (o.x - o.px) * o.k; o.dy = o.py + (o.y - o.py) * o.k;
    o.da = o.pa + Math.atan2(Math.sin(o.a - o.pa), Math.cos(o.a - o.pa)) * o.k;
  }
}
function updateNet(dt) {
  net.sendT -= dt;
  if (net.sendT > 0) return;
  net.sendT = NET_SEND;
  netSend();
}
function drawOthers(inView) {
  for (const o of net.others.values()) {
    const v = { x: o.dx, y: o.dy };
    if (!inView(v)) continue;
    if (o.dead) drawCorpse(v.x, v.y, o.da, o.shirt || '#888', o.head || '#333');
    else if (o.car) drawCar({ x: v.x, y: v.y, angle: o.da, len: o.len || 72, wid: o.wid || 36, color: [o.c0 || '#888', o.c1 || '#555'], type: o.kind === 'plane' || o.kind === 'horse' || o.kind === 'bike' ? o.kind : 'car', vx: 0, vy: 0 }, 0);
    else drawPerson(v.x, v.y, o.da, clock * 6, o.shirt || '#888', o.head || '#333', true, o.legs || '#2b2b4a', o.hat || null, null);
    ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(v.x - 46, v.y - 52, 92, 18);
    ctx.fillStyle = '#7fe0ff'; ctx.fillText(`🌐 ${o.name}`, v.x, v.y - 39); ctx.textAlign = 'left';
  }
}

// ===== Fegyvertár (ADR-0042): G / egérgörgő – váltás; bal klikk / F – tűz. A nehézfegyverek lőszere idővel újratöltődik =====
const WEAPONS = [
  { id: 'pistol', icon: '🔫', name: 'Pisztoly', cd: 0.14 },
  { id: 'shotgun', icon: '💥', name: 'Sörétes puska', cd: 0.75 },
  { id: 'mg', icon: '🔥', name: 'Gépfegyver', cd: 0.06 },
  { id: 'rpg', icon: '🎯', name: 'Rakétavető', cd: 1.1, max: 10, regen: 15 },
  { id: 'missile', icon: '🚀', name: 'Ballisztikus rakéta', cd: 2, max: 3, regen: 60, special: true },
  { id: 'nuke', icon: '☢', name: 'Atombomba', cd: 3, max: 1, regen: 300, special: true },
];
const RPG_SPEED = 700, MISSILE_MAX_RANGE = 2500, NUKE_FUSE = 15, OWN_PLANE_CD = 30;
const arsenal = { sel: 0, ammo: {}, regen: {}, latch: false };
for (const w of WEAPONS) if (w.max) { arsenal.ammo[w.id] = w.max; arsenal.regen[w.id] = w.regen; }
const nukeDevices = [];                            // lerakott atombombák: { x, y, fuse }
const curWeapon = () => WEAPONS[arsenal.sel];
function cycleWeapon(d = 1) {
  arsenal.sel = (arsenal.sel + d + WEAPONS.length) % WEAPONS.length;
  if (mouse.down || keys.KeyF) arsenal.latch = true;                          // nyomva tartott gombbal a rakéta / atombomba ne süljön el rögtön
  const w = curWeapon();
  popup(`${w.icon} ${w.name}${w.max ? ` (${arsenal.ammo[w.id]}/${w.max})` : ''}`, '#ffd23a');
}
function updateArsenal(dt) {                        // a nehézfegyverek lőszere lassan visszatöltődik
  for (const w of WEAPONS) {
    if (!w.max) continue;
    if (arsenal.ammo[w.id] >= w.max) { arsenal.regen[w.id] = w.regen; continue; }
    arsenal.regen[w.id] -= dt;
    if (arsenal.regen[w.id] <= 0) { arsenal.ammo[w.id]++; arsenal.regen[w.id] = w.regen; }
  }
  for (let i = nukeDevices.length - 1; i >= 0; i--) {                           // a lerakott atombomba visszaszámol, aztán robban
    nukeDevices[i].fuse -= dt;
    if (nukeDevices[i].fuse <= 0) { const n = nukeDevices.splice(i, 1)[0]; nuke(n.x, n.y); }
  }
}
// egy lövés a kiválasztott fegyverrel; true, ha elsült
function fireWeapon(src, ang, target) {
  const w = curWeapon();
  if (w.max && arsenal.ammo[w.id] <= 0) { popup(`${w.icon} Elfogyott: ${w.name} – ${Math.ceil(arsenal.regen[w.id])} mp múlva lesz újra (G: váltás)`, '#f66'); player.cooldown = 1; return false; }   // a figyelmeztetés ne ismétlődjön minden képkockában
  const off = src.r + 8;
  if (w.id === 'pistol') shoot(src.x, src.y, ang, 'player', off);
  else if (w.id === 'mg') shoot(src.x, src.y, ang + (rand() - 0.5) * 0.12, 'player', off);
  else if (w.id === 'shotgun') {                   // 6 sörét legyezőben, rövidebb hatótáv
    for (let i = 0; i < 6; i++) { shoot(src.x, src.y, ang + (i - 2.5) * 0.09, 'player', off); bullets[bullets.length - 1].life = 0.35; }
  } else if (w.id === 'rpg') {                     // lassabb rakéta, becsapódáskor felrobban
    const cx = Math.cos(ang), cy = Math.sin(ang);
    bullets.push({ x: src.x + cx * (off + 6), y: src.y + cy * (off + 6), vx: cx * RPG_SPEED, vy: cy * RPG_SPEED, life: 1.4, from: 'player', rocket: true });
    flashes.push({ x: src.x + cx * off, y: src.y + cy * off, until: clock + 0.1 });
    alertPeds(src.x, src.y);
  } else if (w.id === 'missile') {                 // ballisztikus csapás oda, ahová célzol (egérrel), vagy előre
    let tx = target ? target.x : src.x + Math.cos(ang) * PLAYER_MISSILE_RANGE, ty = target ? target.y : src.y + Math.sin(ang) * PLAYER_MISSILE_RANGE;
    const d = Math.hypot(tx - src.x, ty - src.y);
    if (d > MISSILE_MAX_RANGE) { tx = src.x + (tx - src.x) / d * MISSILE_MAX_RANGE; ty = src.y + (ty - src.y) / d * MISSILE_MAX_RANGE; }
    missiles.push({ x0: src.x - Math.cos(ang) * 2400, y0: src.y - Math.sin(ang) * 2400, tx, ty, t: 0, side: 'P' });
    raiseWanted(2, '🚀 BALLISZTIKUS RAKÉTÁT LŐTTÉL KI! ★★');
    popup(`🚀 Ballisztikus rakéta úton – ${MISSILE_FLIGHT} mp múlva csapódik be (célkör)!`, '#ff6a3a');
  } else if (w.id === 'nuke') {                    // atombomba: lerakod, 15 mp – menekülj legalább 1000 px-re!
    nukeDevices.push({ x: src.x, y: src.y, fuse: NUKE_FUSE });
    raiseWanted(2, '☢ ATOMBOMBÁT ÉLESÍTETTÉL! ★★');
    message = { text: `☢ ATOMBOMBA – ${NUKE_FUSE} mp! MENEKÜLJ!`, until: clock + 3, color: '#ff3030' };
    addNews('☢ Valaki atombombát élesített a sivatagban!');
  }
  if (w.max) arsenal.ammo[w.id]--;
  player.cooldown = w.cd;
  return true;
}
function updatePlayerShooting(dt) {
  player.cooldown -= dt;
  const byMouse = mouse.down, byKey = !!keys.KeyF;
  if (!byMouse && !byKey) arsenal.latch = false;
  if (!controllable() || player.riding || player.inHouse || (!byMouse && !byKey) || player.cooldown > 0) return;
  const w = car.plane && player.inCar ? WEAPONS[2] : curWeapon();           // a repülőből géppuska (a bombákat B dobja)
  if (w.special && arsenal.latch) return;                                     // a rakétához / atombombához újra meg kell nyomni
  const src = player.inCar ? car : player;
  let ang = player.inCar ? car.angle : player.angle, target = null;
  if (byMouse) {
    const wx = mouse.x - canvas.width / 2 + lastCam.x, wy = mouse.y - canvas.height / 2 + lastCam.y;
    ang = Math.atan2(wy - src.y, wx - src.x); target = { x: wx, y: wy };
    if (!player.inCar) player.angle = ang;
  }
  if (car.plane && player.inCar) { shoot(src.x, src.y, ang + (rand() - 0.5) * 0.12, 'player', src.r + 8); player.cooldown = w.cd; return; }
  if (fireWeapon(src, ang, target) && w.special) arsenal.latch = true;
  else if (w.special) arsenal.latch = true;                                    // üres tárnál se ismételje a figyelmeztetést
}
// ===== Saját bombázó: J – a saját géped melléd száll (tele lőszerrel); egyszerre egy, 30 mp-enként hívható =====
let ownPlaneAt = -1e9, ownAtomAt = -1e9;          // a saját gépbe 5 percenként jár új atombomba (mint gyalog)
function callOwnPlane() {
  if (!controllable() || player.inHouse || player.riding || (player.inCar && car.plane)) return false;
  const left = Math.ceil(OWN_PLANE_CD - (clock - ownPlaneAt));
  if (left > 0) { popup(`✈ A saját bombázód ${left} mp múlva hívható újra`, '#f66'); return false; }
  for (let i = planes.length - 1; i >= 0; i--) if (planes[i].own) planes.splice(i, 1);   // a régi saját gép eltűnik
  const src = player.inCar ? car : player;
  let spot = null;
  for (const da of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {                   // szabad hely a közelben (ne házba / falba szálljon)
    const a = player.angle + da, q = { x: src.x + Math.cos(a) * 130, y: src.y + Math.sin(a) * 130 };
    if (!obstacleAt(q.x, q.y) && !obstacleAt(q.x + 40, q.y) && !obstacleAt(q.x - 40, q.y)) { spot = q; break; }
  }
  if (!spot) spot = { x: src.x, y: src.y };
  const atom = clock - ownAtomAt >= WEAPONS.find(w => w.id === 'nuke').regen ? 1 : 0;
  if (atom) ownAtomAt = clock;
  spawnParkedPlane(spot.x, spot.y, player.angle, 'P', { bomb: PLANE_AMMO, missile: PLANE_MISSILES, atom });
  planes[planes.length - 1].own = true;
  ownPlaneAt = clock;
  popup(`✈ Megérkezett a saját bombázód (bomba, rakéta${atom ? ', atombomba' : ''}) – állj mellé, E: felszállás`, '#ffb040');
  return true;
}

function updateBullets(dt) {
  const STEPS = 3;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let hit = false;
    for (let s = 0; s < STEPS && !hit; s++) {
      b.x += b.vx * dt / STEPS; b.y += b.vy * dt / STEPS;
      if (obstacleAt(b.x, b.y)) { hit = true; break; }
      if (b.from && b.from.startsWith('war')) {              // háborús lövedék: minden más oldalt talál; a saját sereg nem sebez téged és a polgárokat
        const side = b.from.slice(3);
        for (const sd of soldiers) if (sd.side !== side && Math.hypot(sd.x - b.x, sd.y - b.y) < (isTank(sd) ? 28 : 14)) { sd.hp -= isTank(sd) ? TANK_RIFLE : 1; if (sd.hp <= 0) killSoldier(sd, false); hit = true; break; }
        if (!hit && side !== 'P' && !player.dead && !player.inHouse && !player.riding) {
          const t = player.inCar ? car : player;
          if (Math.hypot(t.x - b.x, t.y - b.y) < (player.inCar ? car.r : 12)) { damagePlayer(player.inCar ? 5 : 10); hit = true; }
        }
        if (!hit && side !== 'P') for (const n of npcs) if (!n.dead && Math.hypot(n.x - b.x, n.y - b.y) < n.r + 3) { killNpc(n, false); hit = true; break; }
        if (!hit && side !== 'P') for (const c of aiCars) if (!c.wrecked && Math.hypot(c.x - b.x, c.y - b.y) < c.r) { damageCar(c); hit = true; break; }
      }
      if (b.from === 'player') {
        for (const p of npcs) {
          if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < p.r + 3) {
            p.health -= 1;
            if (p.health <= 0) killNpc(p, true); else alertPeds(p.x, p.y);
            hit = true; break;
          }
        }
        if (!hit) for (const a of aliens) {
          if (Math.hypot(a.x - b.x, a.y - b.y) < 16) { shootAlien(a); hit = true; break; }
        }
        if (!hit) for (const sd of [...soldiers, ...garrison]) {
          if (sd.side !== 'P' && Math.hypot(sd.x - b.x, sd.y - b.y) < (isTank(sd) ? 28 : 14)) { sd.hp -= isTank(sd) ? TANK_RIFLE : 1; if (sd.hp <= 0) killSoldier(sd, true); hit = true; break; }
        }
        if (!hit) for (const c of aiCars) {
          if (Math.hypot(c.x - b.x, c.y - b.y) < c.r) {
            damageCar(c); hit = true;
            if (c.police) raiseWanted(2);   // rendőrre lőni súlyos
            break;
          }
        }
      }
    }
    b.life -= dt;
    if (hit || b.life <= 0) { bullets.splice(i, 1); if (b.rocket) explode(b.x, b.y, true); }   // a rakétavető lövedéke felrobban
  }
  for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].until < clock) flashes.splice(i, 1);
}

// ===== Városlakók (ADR-0035): a gyalogosok dolgozni vagy szolgáltatást használni mennek az épületekbe, bent töltenek egy kis időt, aztán kijönnek =====
const ERRAND_EVERY = 45, ERRAND_RANGE = 700, INDOOR_MAX = 80, ERRAND_TIMEOUT = 45;
const SERVICE_ICONS = { shop: '🛒', restaurant: '🍽', pub: '🍺', bank: '🏦', mechanic: '🔧', school: '🏫', factory: '🏭' };
const CUSTOMER_SERVICES = new Set(['shop', 'restaurant', 'pub', 'bank', 'mechanic']);
const houseService = hs => (hs.shop ? 'shop' : hs.restaurant ? 'restaurant' : hs.pub ? 'pub' : hs.bank ? 'bank' : hs.mechanic ? 'mechanic' : hs.school ? 'school' : hs.factory ? 'factory' : null);
const indoor = [];                                 // { p, hs, until, work } – az épületben tartózkodók
let errandsEnabled = true;                         // teszteléshez kikapcsolható
// tiszta választás: milyen ügyet intéz a gyalogos (dolgozik vagy ügyfél) a közeli épületek közül
function pickErrand(p, houses, r = rand) {
  const list = houses.filter(h => houseService(h));
  if (!list.length) return null;
  const hs = list[(r() * list.length) | 0], kind = houseService(hs);
  const work = r() < 0.4 || !CUSTOMER_SERVICES.has(kind);                             // az iskolába / gyárba csak dolgozni járnak
  return { hs, kind, work, until: clock + ERRAND_TIMEOUT };
}
const stayTime = work => (work ? 40 + rand() * 30 : 12 + rand() * 13);              // dolgozó tovább van bent, mint az ügyfél
function updateIndoor(dt) {
  for (let i = indoor.length - 1; i >= 0; i--) {
    const e = indoor[i];
    if (destroyedHouses.has(e.hs.id) || dist(e.hs, player) > 8000) { indoor.splice(i, 1); continue; }   // lerombolt ház / messze: kiesik
    if (clock < e.until) continue;
    indoor.splice(i, 1);
    const d = doorOf(e.hs), p = e.p;
    Object.assign(p, { x: d.x, y: d.y, errand: null, errandCd: 25 + rand() * 25, flee: 0, moving: true, wanderT: 4 });
    assignSidewalk(p);
    npcs.push(p);                                  // kijön az ajtón, és megy tovább a járdán
  }
}

// ===== AI gyalogosok =====
function updateNpcs(dt) {
  const entering = [];
  for (const p of npcs) {
    if (p.dead) continue;
    let speed = 0;
    if (p.kind === 'homeless') continue;     // ül a helyén: a szél sem sodorja (nem tudna visszaülni)
    if (p.flee > 0) {
      p.flee -= dt;
      p.errand = null;                        // ijedtében elfelejti az ügyét
      p.angle = Math.atan2(p.y - p.fy, p.x - p.fx);
      speed = 200;
      if (p.flee <= 0) assignSidewalk(p);     // megnyugodva visszamegy a járdára
    } else if (p.errand) {                    // úton az épület ajtajához
      const d = doorOf(p.errand.hs);
      if (destroyedHouses.has(p.errand.hs.id) || clock > p.errand.until) { p.errand = null; assignSidewalk(p); }
      else if (dist(p, d) < 26) entering.push(p);
      else { p.angle = Math.atan2(d.y - p.y, d.x - p.x); speed = 85; }
    } else {
      if (errandsEnabled && p.kind === 'ped') {
        p.errandCd = (p.errandCd ?? rand() * ERRAND_EVERY) - dt;
        if (p.errandCd <= 0) {
          p.errandCd = ERRAND_EVERY * (0.7 + rand() * 0.6);
          p.errand = pickErrand(p, housesIn(p.x - ERRAND_RANGE, p.y - ERRAND_RANGE, p.x + ERRAND_RANGE, p.y + ERRAND_RANGE));
        }
      }
      p.wanderT -= dt;
      if (p.wanderT <= 0) { p.moving = rand() < 0.85; p.wanderT = p.moving ? 4 + rand() * 8 : 1 + rand() * 2; }
      if (p.moving) { walkSidewalk(p); speed = 60; }
    }
    p.x += Math.cos(p.angle) * speed * dt + windX() * 30 * dt;
    p.y += Math.sin(p.angle) * speed * dt + windY() * 30 * dt;
    p.walk += dt * speed / 12;
    collide(p);
  }
  for (const p of entering) {                 // beléptek: eltűnnek az utcáról, bent töltik az idejüket
    npcs.splice(npcs.indexOf(p), 1);
    if (indoor.length < INDOOR_MAX) indoor.push({ p, hs: p.errand.hs, work: p.errand.work, until: clock + stayTime(p.errand.work) });
  }
}

// séta a járdán: a sarkon befordul vagy a zebrán átkel
function walkSidewalk(p) {
  const along = p.axis === 'h' ? p.x : p.y;
  const cross = nearestRoad(along);
  const corner = cross - p.dir * WALK_OFF;
  const key = p.axis + p.road + ':' + cross;
  if (Math.abs(along - corner) < 8 && p.lastCross !== key) {
    p.lastCross = key;
    if (rand() < 0.5) {                     // befordul a sarkon, el az úttól
      const oldRoad = p.road, oldSide = p.side;
      p.axis = p.axis === 'h' ? 'v' : 'h';
      p.road = cross;
      p.side = Math.sign(along - cross) || -1;
      p.dir = oldSide;
      p.lastCross = p.axis + p.road + ':' + oldRoad;
    }
  }
  const tx = p.axis === 'h' ? p.x + p.dir * 40 : walkLine(p);
  const ty = p.axis === 'h' ? walkLine(p) : p.y + p.dir * 40;
  p.angle = Math.atan2(ty - p.y, tx - p.x);
}

function updateSmoke(dt) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.life += dt;
    if (p.life >= p.max) { smoke.splice(i, 1); continue; }
    p.x += (p.vx + windX() * 120) * dt; p.y += (p.vy + windY() * 120) * dt;
    p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
    p.r += 22 * dt;                                    // tágul
  }
}

function updateSkidMarks() {
  let old = 0;
  while (old < skidMarks.length && clock - skidMarks[old].born >= SKID_LIFE) old++;
  if (old) skidMarks.splice(0, old);
}

function updateStorm(dt) {
  storm.timer -= dt;
  if (storm.timer <= 0) toggleStorm();
  storm.level += clamp(storm.target - storm.level, -0.25 * dt, 0.25 * dt);   // ~4 mp alatt erősödik / gyengül
  storm.angle += (rand() - 0.5) * 0.3 * dt;
  // homokszemcsék a képernyőn
  const want = Math.floor(320 * storm.level), w = canvas.width, h = canvas.height;
  while (storm.particles.length < want) {
    storm.particles.push({ x: rand() * w, y: rand() * h, len: 15 + rand() * 30, spd: 600 + rand() * 600 });
  }
  if (storm.particles.length > want) storm.particles.length = want;
  const ca = Math.cos(storm.angle), sa = Math.sin(storm.angle);
  for (const p of storm.particles) {
    p.x += ca * p.spd * dt; p.y += sa * p.spd * dt;
    if (p.x < -50) p.x += w + 100; else if (p.x > w + 50) p.x -= w + 100;
    if (p.y < -50) p.y += h + 100; else if (p.y > h + 50) p.y -= h + 100;
  }
}

// ===== Pénz, szintek, felugró üzenetek =====
const popups = [];        // {text, color, born}
function popup(text, color = '#fff') {
  popups.push({ text, color, born: clock });
  if (popups.length > 6) popups.shift();
}

function earn(amount, label) {
  amount = Math.round(amount);
  if (amount <= 0) return;
  const before = levelOf(progress.xp);
  progress.money += amount;
  progress.xp += amount;
  popup(`+$${amount} ${label}`, '#7f7');
  if ((progress.debt || 0) > 0) {                       // tartozás alatt a kereset 25%-a a hitelt törleszti
    const part = Math.min(progress.debt, Math.max(1, Math.round(amount * AUTO_REPAY)));
    progress.money -= part; progress.debt -= part;
    popup(`🏦 -$${part} hiteltörlesztés (maradt: $${progress.debt})`, '#7df');
  }
  const after = levelOf(progress.xp);
  if (after > before) {
    let bonus = 0;
    for (let l = before + 1; l <= after; l++) bonus += l * 50;   // minden átlépett szintért jár bónusz
    progress.money += bonus;
    message = { text: `SZINTLÉPÉS! ${after}. szint`, until: clock + 2.5, color: '#ffd23a' };
    addNews(`⭐ A játékos szintet lépett: ${after}. szint`);
    popup(`+$${bonus} szintbónusz`, '#ffd23a');
  }
  saveProgress();
}

// ===== Benzin =====
const usesFuel = c => c.fuelUse > 0;               // a bicikli nem tankol, nem fogy
function updateFuel(dt, input) {
  const wasRefueling = car.refueling;
  car.refueling = false;
  if (!player.inCar) { if (wasRefueling) saveProgress(); return; }
  if (!usesFuel(car)) return;
  const moving = Math.hypot(car.vx, car.vy) > 20;     // álló autó (alapjárat) nem fogyaszt
  car.fuel = Math.max(0, car.fuel - (input.up ? 0.45 * car.fuelUse : moving ? 0.03 : 0) * dt);
  if (car.fuel <= 0 && !car.emptyWarned) {
    car.emptyWarned = true;
    message = { text: 'KIFOGYOTT A BENZIN!', until: clock + 2.5, color: '#ff8a1f' };
  }
  if (car.fuel > 5) car.emptyWarned = false;
  if (car.fuel < 20 && !car.lowWarned) { car.lowWarned = true; popup('⛽ Kevés a benzin – keress egy kutat!', '#ff8a1f'); }
  if (car.fuel > 30) car.lowWarned = false;
  // tankolás: állj meg egy kút mellett
  if (car.fuel < 99.9 && nearPump(car.x, car.y) && Math.hypot(car.vx, car.vy) < 100) {
    const add = Math.min(100 - car.fuel, 30 * dt, progress.money / FUEL_PRICE);   // csak annyit, amennyit ki tudsz fizetni
    if (add > 0) {
      car.refueling = true;
      car.fuel += add;
      progress.money = Math.max(0, progress.money - add * FUEL_PRICE);
      if (car.fuel >= 99.9) { car.fuel = 100; popup('Tele a tank!', '#7f7'); }
    } else if (!car.brokeWarned) {
      car.brokeWarned = true;
      popup('Nincs pénzed tankolni – szerezz pénzt (szállítás, drift)!', '#f66');
    }
  } else car.brokeWarned = false;
  if (wasRefueling && !car.refueling) saveProgress();   // a tankolás végén (félbehagyva is) mentünk
}

// ===== Drift-kombó: minél tovább driftelsz ütközés nélkül, annál nagyobb a szorzó =====
const drift = { active: false, time: 0, points: 0, idle: 0, mult: 1, seenCrash: 0 };
function updateDrift(dt) {
  if (car.crashT && car.crashT !== drift.seenCrash) {
    drift.seenCrash = car.crashT;
    if (drift.active && drift.points > 5) popup('Drift elveszett – ütközés!', '#f66');
    Object.assign(drift, { active: false, time: 0, points: 0, idle: 0, mult: 1 });
  }
  const speed = Math.hypot(car.vx, car.vy);
  if (player.inCar && car.skid && speed > 150) {
    drift.active = true; drift.idle = 0; drift.time += dt;
    drift.mult = Math.min(5, 1 + Math.floor(drift.time / 1.5));
    drift.points += speed * dt * 0.08 * drift.mult;
  } else if (drift.active) {
    drift.idle += dt;
    if (drift.idle > 0.8) {
      const pts = Math.round(drift.points);
      if (pts >= 5) {
        progress.bestDrift = Math.max(progress.bestDrift, pts);
        earn(pts, `drift x${drift.mult}`);
      }
      Object.assign(drift, { active: false, time: 0, points: 0, idle: 0, mult: 1 });
    }
  }
}

// ===== Szállítási küldetések: időlimit nélkül, egymás után, sorozatszorzóval =====
// A sorozat csak halálnál vagy letartóztatásnál vész el.
const mission = { active: false, tx: 0, ty: 0, reward: 0, cooldown: 3, streak: 0 };
let missionsEnabled = true;   // teszteléshez kikapcsolható
const streakMult = () => 1 + 0.25 * mission.streak;

function newMission() {
  const axis = rand() < 0.5 ? 'h' : 'v';
  const base = nearestRoad(axis === 'h' ? player.y : player.x);
  const road = base + (Math.floor(rand() * 3) - 1) * ROAD_SPACING;
  const along = (axis === 'h' ? player.x : player.y) + (rand() < 0.5 ? -1 : 1) * (1500 + rand() * 2500);
  const line = road + (rand() < 0.5 ? -1 : 1) * WALK_OFF;
  const t = axis === 'h' ? { x: along, y: line } : { x: line, y: along };
  const d = dist(t, player);
  Object.assign(mission, { active: true, tx: t.x, ty: t.y, reward: Math.round(60 + d / 12) });
  popup(`📦 Új szállítás: ${Math.round(d / 10)} m`, '#ffd23a');
}

function updateMission(dt) {
  if (!mission.active) {
    mission.cooldown -= dt;
    if (mission.cooldown <= 0 && missionsEnabled && controllable()) newMission();
    return;
  }
  if (controllable() && !player.inHouse && Math.hypot(player.x - mission.tx, player.y - mission.ty) < 80) {
    const mult = streakMult();
    const pay = mission.reward * mult;
    mission.streak++;
    progress.missions++;
    progress.bestStreak = Math.max(progress.bestStreak, mission.streak);
    earn(pay, `szállítás x${mult.toFixed(2)}`);
    message = { text: `SZÁLLÍTÁS KÉSZ! Sorozat: ${mission.streak}`, until: clock + 1.8, color: '#ffd23a' };
    mission.active = false; mission.cooldown = 2;
  }
}

function loseStreak() {
  if (mission.streak) popup(`Sorozat elveszett (${mission.streak})`, '#f66');
  mission.streak = 0;
}

// ===== Tornádó: erős homokviharban támad, beszív és felszippant (ADR-0024) =====
const TORNADO_R = 380;      // ezen belül húz és pörget
const TORNADO_CHASE = 150;  // px/s: a tornádó a játékos felé tart (sétálva utolér, futva / autóval meg lehet lépni)
const TORNADO_CORE = 70;    // ezen belül felszippant
let tornado = null;         // { x, y, age, life, power, spin, wander, flying: [] }
let tornadoEnabled = true;  // teszteléshez kikapcsolható

function spawnTornado(x, y) {
  const ang = rand() * Math.PI * 2, d = 900 + rand() * 600;
  tornado = { x: x ?? player.x + Math.cos(ang) * d, y: y ?? player.y + Math.sin(ang) * d, age: 0, life: 35 + rand() * 20,
    power: 0, spin: 0, wander: rand() * Math.PI * 2, flying: [] };
  popup('🌪 TORNÁDÓ! Menekülj!', '#ff6a3a');
  addNews('🌪 Tornádó alakult ki a sivatagban – házakat és autókat szippant fel');
}

function flyAway(kind, data, x, y) { tornado.flying.push({ kind, data, ang: Math.atan2(y - tornado.y, x - tornado.x), t: 0 }); }

// ===== Vonatok (ADR-0034): vasútvonalak képletből; két sín (kelet / nyugat felé), állomások 10 000 px-enként, 30 mp-enként érkezik vonat; jegy $4 =====
const TRAIN_FARE = 4;
const RAIL_SPACE = 20000, RAIL_Y0 = 2500, RAIL_GAP = 138;                            // vonalak y = 2500 + k·20000 (az utak között); a két sín között 138 px: szigetperon
const STOP_SPACE = 10000, STOP_X0 = 2500;                                            // állomások x = 2500 + n·10000 (az utak között)
const TRAIN_PERIOD = 30, TRAIN_DWELL = 10;                                           // 30 mp-enként érkezik vonat, 10 mp-ig áll
const TRAIN_LEN = 420, TRAIN_WID = 46;
const PLATFORM = { dy0: 38, dy1: 100, half: 290 };                                   // a keleti sín alatt, ±290 px az állomástól
let trainShift = 0;                                                                  // teszteléshez: a vonatok órájának eltolása
const smooth = x => x * x * (3 - 2 * x);
// tiszta függvény: a (k. vonal, dir irányú sín, i. vonat) helyzete a t időpontban. A vonatok „lépcsőznek”: mindegyik minden 30 mp-ben a következő
// állomásra ér, 10 mp-ig áll, aztán sima gyorsulással a következőre megy → minden állomásra pontosan 30 mp-enként ér egy vonat.
function trainPose(k, dir, i, t) {
  const u = t + ((((k * 7) % TRAIN_PERIOD) + TRAIN_PERIOD) % TRAIN_PERIOD) + (dir < 0 ? TRAIN_PERIOD / 2 : 0);
  const H = Math.floor(u / TRAIN_PERIOD), sec = u - H * TRAIN_PERIOD, from = (H + i) * STOP_SPACE + STOP_X0;
  let xe, vxe, state = 'moving';
  if (sec < TRAIN_DWELL) { xe = from; vxe = 0; state = 'dwell'; }
  else { const sp = (sec - TRAIN_DWELL) / (TRAIN_PERIOD - TRAIN_DWELL); xe = from + STOP_SPACE * smooth(sp); vxe = STOP_SPACE * 6 * sp * (1 - sp) / (TRAIN_PERIOD - TRAIN_DWELL); }
  const ty = RAIL_Y0 + k * RAIL_SPACE;
  return dir > 0 ? { x: xe, y: ty, vx: vxe, vy: 0, state, dir } : { x: 2 * STOP_X0 - xe, y: ty + RAIL_GAP, vx: -vxe, vy: 0, state, dir };
}
// mennyi idő múlva ér be a következő vonat valamelyik irányból az állomásra (0 = most áll egy)
function nextTrainIn(k, t) {
  let best = TRAIN_PERIOD;
  for (const dir of [1, -1]) {
    const u = t + ((((k * 7) % TRAIN_PERIOD) + TRAIN_PERIOD) % TRAIN_PERIOD) + (dir < 0 ? TRAIN_PERIOD / 2 : 0), sec = ((u % TRAIN_PERIOD) + TRAIN_PERIOD) % TRAIN_PERIOD;
    best = Math.min(best, sec < TRAIN_DWELL ? 0 : TRAIN_PERIOD - sec);
  }
  return best;
}
const trainCache = new Map();
function getTrain(k, dir, i) {                       // tartós objektum (a rajta ülő játékos erre hivatkozik)
  const key = k + ',' + dir + ',' + i;
  let tr = trainCache.get(key);
  if (!tr) {
    if (trainCache.size > 400) for (const [kk, v] of trainCache) if (v !== player.riding) trainCache.delete(kk);
    tr = { train: true, k, i, angle: dir > 0 ? 0 : Math.PI, wid: TRAIN_WID, len: TRAIN_LEN, r: TRAIN_LEN / 2 };   // a leszállás a peron felé esik
    trainCache.set(key, tr);
  }
  Object.assign(tr, trainPose(k, dir, i, clock + trainShift));
  return tr;
}
// a négyzetet érintő vonatok mindkét sínen
function trainsIn(xa, ya, xb, yb) {
  const out = [], H = Math.floor((clock + trainShift + TRAIN_PERIOD) / TRAIN_PERIOD) + 2;
  for (let k = Math.ceil((ya - RAIL_Y0 - RAIL_GAP - TRAIN_WID) / RAIL_SPACE); k <= Math.floor((yb - RAIL_Y0 + TRAIN_WID) / RAIL_SPACE); k++) {
    for (const dir of [1, -1]) {
      const lo = dir > 0 ? xa - TRAIN_LEN : 2 * STOP_X0 - xb - TRAIN_LEN, hi = dir > 0 ? xb + TRAIN_LEN : 2 * STOP_X0 - xa + TRAIN_LEN;
      for (let i = Math.floor((lo - STOP_X0) / STOP_SPACE) - H - 1; i <= Math.floor((hi - STOP_X0) / STOP_SPACE) - H + 3; i++) {
        const tr = getTrain(k, dir, i);
        if (tr.x > xa - TRAIN_LEN && tr.x < xb + TRAIN_LEN) out.push(tr);
      }
    }
  }
  return out;
}
// állomások (peronok közepe) egy négyzetben
function railStopsIn(xa, ya, xb, yb) {
  const out = [];
  for (let k = Math.ceil((ya - RAIL_Y0 - PLATFORM.dy1) / RAIL_SPACE); k <= Math.floor((yb - RAIL_Y0) / RAIL_SPACE); k++) {
    for (let n = Math.ceil((xa - STOP_X0) / STOP_SPACE); n <= Math.floor((xb - STOP_X0) / STOP_SPACE); n++) out.push({ x: n * STOP_SPACE + STOP_X0, y: RAIL_Y0 + k * RAIL_SPACE + (PLATFORM.dy0 + PLATFORM.dy1) / 2, k, n });
  }
  return out.filter(o => o.y >= ya && o.y <= yb);
}
const onPlatform = (x, y) => railStopsIn(x - PLATFORM.half, y - 80, x + PLATFORM.half, y + 80).find(st => Math.abs(x - st.x) <= PLATFORM.half && Math.abs(y - st.y) <= (PLATFORM.dy1 - PLATFORM.dy0) / 2 + 10);
function nearestBoardableTrain() {
  return trainsIn(player.x - TRAIN_LEN, player.y - 200, player.x + TRAIN_LEN, player.y + 200)
    .find(tr => Math.abs(tr.vx) < 20 && Math.abs(player.x - tr.x) < TRAIN_LEN / 2 + 30 && (player.y - tr.y) * tr.dir > 20 && (player.y - tr.y) * tr.dir < PLATFORM.dy1 + 40);
}
function updateTrains() {                            // minden képkockában: a rajtad ülő vonat helyzete frissül; a sínen állót elgázolják
  if (player.riding && player.riding.train) getTrain(player.riding.k, player.riding.dir, player.riding.i);
  if (player.riding || player.inHouse || player.dead || !controllable()) return;
  for (const tr of trainsIn(player.x - TRAIN_LEN, player.y - 80, player.x + TRAIN_LEN, player.y + 80)) {
    if (Math.abs(tr.vx) > 120 && Math.abs(player.x - tr.x) < TRAIN_LEN / 2 && Math.abs(player.y - tr.y) < TRAIN_WID / 2 + 6) {
      damagePlayer(10000);
      message = { text: 'ELGÁZOLT A VONAT!', until: clock + 3, color: '#ff6a3a' };
      return;
    }
  }
}
function drawRail(view) {
  for (let k = Math.ceil((view.y0 - RAIL_Y0 - RAIL_GAP - 40) / RAIL_SPACE); k <= Math.floor((view.y1 - RAIL_Y0 + 40) / RAIL_SPACE); k++) {
    const ty = RAIL_Y0 + k * RAIL_SPACE;
    for (const y of [ty, ty + RAIL_GAP]) {                                          // két sín: talpfák + sínek
      ctx.fillStyle = '#5a4a38';
      for (let x = Math.ceil(view.x0 / 36) * 36; x < view.x1; x += 36) ctx.fillRect(x, y - 22, 8, 44);
      ctx.fillStyle = '#9a9a9a'; ctx.fillRect(view.x0, y - 14, view.x1 - view.x0, 4); ctx.fillRect(view.x0, y + 10, view.x1 - view.x0, 4);
    }
    for (let n = Math.ceil((view.x0 - PLATFORM.half - STOP_X0) / STOP_SPACE); n <= Math.floor((view.x1 + PLATFORM.half - STOP_X0) / STOP_SPACE); n++) {   // szigetperon a két sín között
      const sx = n * STOP_SPACE + STOP_X0;
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(sx - PLATFORM.half, ty + PLATFORM.dy0 - 6, PLATFORM.half * 2, PLATFORM.dy1 - PLATFORM.dy0 + 12);
      ctx.fillStyle = '#e8d34a'; ctx.fillRect(sx - PLATFORM.half, ty + PLATFORM.dy0 - 6, PLATFORM.half * 2, 4); ctx.fillRect(sx - PLATFORM.half, ty + PLATFORM.dy1 + 2, PLATFORM.half * 2, 4);
      ctx.fillStyle = '#17304f'; ctx.fillRect(sx - 70, ty + 56, 140, 26);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🚆 VASÚTÁLLOMÁS', sx, ty + 74); ctx.textAlign = 'left';
    }
  }
  for (const tr of trainsIn(view.x0, view.y0 - 40, view.x1, view.y1 + 40)) drawTrain(tr);
}
function drawTrain(tr) {
  const dir = tr.vx !== 0 ? Math.sign(tr.vx) : tr.dir, x0 = tr.x - TRAIN_LEN / 2, y0 = tr.y - TRAIN_WID / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0 + 5, y0 + 6, TRAIN_LEN, TRAIN_WID);
  for (let i = 0; i < 4; i++) {                                                       // mozdony + 3 kocsi
    const loco = i === 0, w = loco ? 100 : 104;
    const bx = dir > 0 ? (loco ? x0 + TRAIN_LEN - 100 : x0 + (3 - i) * 106) : (loco ? x0 : x0 + 100 + (i - 1) * 106 + 6);
    ctx.fillStyle = loco ? '#b02020' : '#e8e8ee'; ctx.beginPath(); ctx.roundRect(bx, y0, w, TRAIN_WID, 6); ctx.fill();
    ctx.fillStyle = '#17304f'; ctx.fillRect(bx, y0 + TRAIN_WID / 2 - 3, w, 6);
    if (!loco) { ctx.fillStyle = '#7fb6d9'; for (let j = 0; j < 4; j++) { ctx.fillRect(bx + 8 + j * 24, y0 + 6, 16, 9); ctx.fillRect(bx + 8 + j * 24, y0 + TRAIN_WID - 15, 16, 9); } }
    else { ctx.fillStyle = '#7fb6d9'; ctx.fillRect(dir > 0 ? bx + w - 26 : bx + 8, y0 + 8, 18, TRAIN_WID - 16); }
  }
  ctx.fillStyle = '#fff6b0'; ctx.fillRect(dir > 0 ? x0 + TRAIN_LEN - 4 : x0, y0 + 6, 4, 8); ctx.fillRect(dir > 0 ? x0 + TRAIN_LEN - 4 : x0, y0 + TRAIN_WID - 14, 4, 8);   // fényszórók
}

// ===== Űrlények (ADR-0033): 3 percenként üldözőbe vesznek; ha elkapnak, elrabolnak és a Holdon börtönbe zárnak =====
const ALIEN_INTERVAL = 180, ALIEN_COUNT = 3, ALIEN_SPEED = 175, ALIEN_CHASE_TIME = 75, ALIEN_CATCH = 28, ALIEN_CAR_SLOW = 120, ALIEN_BOUNTY = 50;
const ABDUCT_TIME = 2.5, MOON_TERM = 40;
const MOON_CELL = { x0: 170, y0: 100, x1: 390, y1: 260 }, MOON_W = 560, MOON_H = 360;
const aliens = [];                                 // { x, y, angle, walk, hp, until }
let aliensEnabled = true;                          // teszteléshez kikapcsolható
const alienClock = { left: ALIEN_INTERVAL };
function spawnAliens(n = ALIEN_COUNT) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, d = 900 + rand() * 200;
    aliens.push({ x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d, angle: 0, walk: rand() * 6, hp: 3, until: clock + ALIEN_CHASE_TIME });
  }
  popup('👽 ŰRLÉNYEK! Menekülj, mielőtt elrabolnak!', '#7fff7f');
  addNews('👽 Űrlények érkeztek a környékre, üldözőbe vettek valakit');
}
function startAbduction() {
  if (car.horse) leaveHorse();                     // a ló ott marad, az autó visszajön
  if (car.plane) leavePlane(true);                 // a gép leparkol, az autó visszajön
  player.abduct = { t: 0, x: player.x, y: player.y };
  if (player.inCar) { player.inCar = false; player.x = car.x + Math.sin(car.angle) * 40; player.y = car.y - Math.cos(car.angle) * 40; player.abduct.x = player.x; player.abduct.y = player.y; }
  player.riding = null;
  aliens.length = 0;
  clearWanted();
  message = { text: '👽 ELRABOLNAK!', until: clock + ABDUCT_TIME, color: '#7fff7f' };
  addNews('👽 Űrlények elraboltak egy járókelőt – a Holdra vitték');
}
function updateAbduct(dt) {
  const A = player.abduct; A.t += dt;
  if (A.t < ABDUCT_TIME) return;
  const from = { x: A.x, y: A.y };
  player.abduct = null;
  player.moon = { t: MOON_TERM, ix: (MOON_CELL.x0 + MOON_CELL.x1) / 2, iy: (MOON_CELL.y0 + MOON_CELL.y1) / 2, from, guard: 60, walk: 0 };
  popup('🌙 A Holdon vagy, börtönben! Kiengednek, ha letelt az idő.', '#9fd8ff');
}
// Szabadulás (ADR-0033): a cella sarkában E – átbújsz a Fordított Világba; 3 démogorgon lelövése után visszakerülsz a Földre
const ESCAPE_SPOT = { x: 190, y: 242 }, HORROR_W = 760, HORROR_H = 460, HORROR_KILLS = 3, DEMO_SPEED = 105, DEMO_HP = 3, DEMO_HIT = 20, MAX_DEMOS = 2;
const nearEscape = () => player.moon && !player.moon.horror && Math.hypot(player.moon.ix - ESCAPE_SPOT.x, player.moon.iy - ESCAPE_SPOT.y) < 34;
function enterHorror() {
  const M = player.moon;
  M.horror = { px: HORROR_W / 2, py: HORROR_H - 70, demos: [], shots: [], kills: 0, cd: 0, spawnT: 1.2, layout: null, t: 0 };
  popup('🕳 Átbújsz a Fordított Világba – démogorgonok! Lőj le hármat! (WASD, egér / F)', '#ff5a5a');
}
function leaveMoon(msg) {                           // vissza a Földre, ahol elraboltak
  const M = player.moon;
  player.moon = null;
  Object.assign(player, M.from);
  collide(player);
  alienClock.left = ALIEN_INTERVAL;
  popup(msg, '#7fff7f');
}
function updateHorror(dt) {
  const M = player.moon, Hh = M.horror;
  Hh.t += dt;
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) { const len = Math.hypot(mx, my); Hh.px += mx / len * 150 * dt; Hh.py += my / len * 150 * dt; player.walk += dt * 10; }
  Hh.px = clamp(Hh.px, 24, HORROR_W - 24); Hh.py = clamp(Hh.py, 24, HORROR_H - 24);
  // lövés: egérrel arra, amerre mutatsz; F-fel arra, amerre nézel
  Hh.cd -= dt;
  if (mouse.down && Hh.layout) player.angle = Math.atan2((mouse.y - Hh.layout.oy) / Hh.layout.sc - Hh.py, (mouse.x - Hh.layout.ox) / Hh.layout.sc - Hh.px);
  else if (mx || my) player.angle = Math.atan2(my, mx);
  if ((mouse.down || keys.KeyF) && Hh.cd <= 0) {
    Hh.shots.push({ x: Hh.px + Math.cos(player.angle) * 18, y: Hh.py + Math.sin(player.angle) * 18, vx: Math.cos(player.angle) * 700, vy: Math.sin(player.angle) * 700, life: 0.9 });
    Hh.cd = 0.16;
  }
  // démogorgonok: az oldalakról jönnek, utánad másznak
  Hh.spawnT -= dt;
  if (Hh.demos.length < MAX_DEMOS && Hh.spawnT <= 0 && Hh.kills + Hh.demos.length < HORROR_KILLS + 2) {
    const side = (rand() * 3) | 0, f = rand();
    Hh.demos.push({ x: side === 0 ? -30 : side === 1 ? HORROR_W + 30 : f * HORROR_W, y: side === 2 ? -30 : 60 + f * (HORROR_H - 120), hp: DEMO_HP, hitCd: 0, flash: 0, walk: 0, angle: 0 });
    Hh.spawnT = 1.8;
  }
  for (const d of Hh.demos) {
    const dx = Hh.px - d.x, dy = Hh.py - d.y, dd = Math.hypot(dx, dy) || 1;
    d.angle = Math.atan2(dy, dx); d.walk += dt * 9; d.flash = Math.max(0, d.flash - dt); d.hitCd = Math.max(0, d.hitCd - dt);
    if (dd > 22) { const sp = DEMO_SPEED * (1 + 0.12 * Hh.kills); d.x += dx / dd * sp * dt; d.y += dy / dd * sp * dt; }
    else if (d.hitCd <= 0) { player.health -= DEMO_HIT; player.lastHit = clock; d.hitCd = 0.9; Hh.px -= dx / dd * 30; Hh.py -= dy / dd * 30; Hh.hurt = 0.3; }
  }
  Hh.hurt = Math.max(0, (Hh.hurt || 0) - dt);
  for (let i = Hh.shots.length - 1; i >= 0; i--) {
    const b = Hh.shots[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let hit = false;
    for (const d of Hh.demos) if (Math.hypot(d.x - b.x, d.y - b.y) < 20) { d.hp -= 1; d.flash = 0.15; hit = true; break; }
    if (hit || b.life <= 0 || b.x < -40 || b.x > HORROR_W + 40 || b.y < -40 || b.y > HORROR_H + 40) Hh.shots.splice(i, 1);
  }
  for (let i = Hh.demos.length - 1; i >= 0; i--) if (Hh.demos[i].hp <= 0) { Hh.demos.splice(i, 1); Hh.kills++; popup(`👹 Démogorgon lelőve (${Hh.kills}/${HORROR_KILLS})`, '#ffd23a'); }
  if (Hh.kills >= HORROR_KILLS) { leaveMoon('🎉 Megszöktél a Holdról – a démogorgonok legyőzve, visszakerültél a Földre!'); return; }
  if (player.health <= 0) {                         // a démogorgonok elkaptak: vissza a cellába, újra a teljes büntetés
    M.horror = null; M.t = MOON_TERM; player.health = 100; M.ix = (MOON_CELL.x0 + MOON_CELL.x1) / 2; M.iy = (MOON_CELL.y0 + MOON_CELL.y1) / 2;
    popup('💀 A démogorgonok elkaptak – vissza a cellába, újra van büntetés!', '#ff5a5a');
  }
}
const hpFraction = (hp, max) => clamp(hp / max, 0, 1);       // életcsík töltöttsége (tiszta függvény)
function drawDemogorgon(d) {
  const f = hpFraction(d.hp, DEMO_HP);                                                              // életcsík a fej fölött (nem forog a lénnyel)
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(d.x - 22, d.y - 34, 44, 7);
  ctx.fillStyle = f > 0.66 ? '#3c3' : f > 0.33 ? '#ec3' : '#e33'; ctx.fillRect(d.x - 21, d.y - 33, 42 * f, 5);
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle);
  const sw = Math.sin(d.walk) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(2, 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = d.flash ? '#fff' : '#1a0f12'; ctx.lineWidth = 5; ctx.lineCap = 'round';        // hosszú karok karmokkal
  ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(26 + sw, -20); ctx.moveTo(6, 8); ctx.lineTo(26 - sw, 20); ctx.stroke();
  ctx.fillStyle = d.flash ? '#fff' : '#2a1a1e'; ctx.beginPath(); ctx.ellipse(-4, 0, 17, 11, 0, 0, Math.PI * 2); ctx.fill();   // sovány test
  ctx.fillStyle = d.flash ? '#fff' : '#3a2428'; ctx.beginPath(); ctx.arc(12, 0, 9, 0, Math.PI * 2); ctx.fill();            // fej
  ctx.fillStyle = '#c0203a';                                                                        // a virág-arc: szirmok
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; ctx.beginPath(); ctx.ellipse(19 + Math.cos(a) * 3, Math.sin(a) * 9, 6, 2.6, a, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ffb0b8'; ctx.beginPath(); ctx.arc(19, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawHorror(w, h) {
  const Hh = player.moon.horror, sc = Math.min(1, (w - 40) / HORROR_W, (h - 120) / HORROR_H), ox = Math.round((w - HORROR_W * sc) / 2), oy = Math.round(Math.max(50, (h - HORROR_H * sc) / 2));
  Hh.layout = { sc, ox, oy };
  ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  const g = ctx.createRadialGradient(HORROR_W / 2, HORROR_H / 2, 40, HORROR_W / 2, HORROR_H / 2, 480);
  g.addColorStop(0, '#1a2440'); g.addColorStop(1, '#2a0a12'); ctx.fillStyle = g; ctx.fillRect(0, 0, HORROR_W, HORROR_H);
  ctx.strokeStyle = 'rgba(120,20,40,0.55)'; ctx.lineWidth = 4;                                           // indák a földön
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo((i * 131) % HORROR_W, HORROR_H); ctx.quadraticCurveTo((i * 131 + 90) % HORROR_W, 250 + (i * 37) % 120, (i * 211) % HORROR_W, (i * 53) % 200); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';                                                                // lebegő spórák
  for (let i = 0; i < 50; i++) ctx.fillRect(((i * 97 + Hh.t * (10 + i % 7)) % HORROR_W), ((i * 53 - Hh.t * (8 + i % 5) + HORROR_H * 4) % HORROR_H), 2, 2);
  for (const d of Hh.demos) drawDemogorgon(d);
  const sk = SKINS[activeSkin];
  drawPerson(Hh.px, Hh.py, player.angle, player.walk, sk.shirt, sk.head, true, sk.legs, sk.hat, sk.pattern);
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3;
  ctx.beginPath(); for (const b of Hh.shots) { ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); } ctx.stroke();
  if (Hh.hurt > 0) { ctx.fillStyle = `rgba(255,0,0,${Hh.hurt})`; ctx.fillRect(0, 0, HORROR_W, HORROR_H); }
  ctx.strokeStyle = '#4a1020'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, HORROR_W, HORROR_H);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`👹 Fordított Világ – démogorgonok: ${Hh.kills}/${HORROR_KILLS} lelőve`, w / 2, 34);
  ctx.fillStyle = '#333'; ctx.fillRect(w / 2 - 100, 44, 200, 10); ctx.fillStyle = player.health > 40 ? '#3c3' : '#e33'; ctx.fillRect(w / 2 - 100, 44, 200 * clamp(player.health / 100, 0, 1), 10);
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif'; ctx.fillText('WASD: mozgás · egér / F: lövés', w / 2, oy + HORROR_H * sc + 28); ctx.textAlign = 'left';
}

function updateMoon(dt) {
  const M = player.moon;
  if (M.horror) { updateHorror(dt); return; }
  M.t -= dt;
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    M.ix += mx / len * 110 * dt; M.iy += my / len * 110 * dt;
    player.angle = Math.atan2(my, mx); player.walk += dt * 9;
  }
  M.ix = clamp(M.ix, MOON_CELL.x0 + 14, MOON_CELL.x1 - 14); M.iy = clamp(M.iy, MOON_CELL.y0 + 14, MOON_CELL.y1 - 14);
  M.guard = (M.guard + dt * 70) % 900; M.walk += dt * 8;
  player.health = Math.min(100, player.health + 10 * dt);
  if (M.t <= 0) leaveMoon('🚀 Kiengedtek a Holdról – visszavittek a Földre!');   // kiengedtek: oda tesznek vissza, ahol elraboltak
}
function updateAliens(dt) {
  if (!aliensEnabled) return;
  if (!player.moon && !player.abduct) {
    alienClock.left -= dt;
    if (alienClock.left <= 0) { alienClock.left = ALIEN_INTERVAL; if (!aliens.length) spawnAliens(); }
  }
  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i];
    if (clock > a.until) { aliens.splice(i, 1); if (!aliens.length) popup('👽 Az űrlények elmentek', '#7fff7f'); continue; }
    const dx = player.x - a.x, dy = player.y - a.y, d = Math.hypot(dx, dy) || 1;
    if (d > 20) { a.x += dx / d * ALIEN_SPEED * dt; a.y += dy / d * ALIEN_SPEED * dt; a.walk += dt * 10; }
    a.angle = Math.atan2(dy, dx);
    const slow = !player.inCar || Math.hypot(car.vx, car.vy) < ALIEN_CAR_SLOW;
    if (d < ALIEN_CATCH + (player.inCar ? car.r : 0) && slow && !player.inHouse && !player.riding && controllable()) { startAbduction(); return; }
  }
}
function shootAlien(a) {                            // true, ha meghalt
  a.hp -= 1;
  if (a.hp > 0) return false;
  aliens.splice(aliens.indexOf(a), 1);
  earn(ALIEN_BOUNTY, 'űrlény kilőve 👽');
  if (!aliens.length) popup('👽 Legyőzted az űrlényeket!', '#7fff7f');
  return true;
}
function drawAlien(a) {
  ctx.save(); ctx.translate(a.x, a.y);
  const sw = Math.sin(a.walk) * 4;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 5, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2e8a3a'; ctx.fillRect(-5 + sw, 6, 4, 8); ctx.fillRect(1 - sw, 6, 4, 8);             // lábak
  ctx.fillStyle = '#4ad04a'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); ctx.fill();   // test
  ctx.beginPath(); ctx.ellipse(0, -11, 11, 12, 0, 0, Math.PI * 2); ctx.fill();                          // nagy fej
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-5, -12, 3.5, 5, 0.4, 0, Math.PI * 2); ctx.ellipse(5, -12, 3.5, 5, -0.4, 0, Math.PI * 2); ctx.fill();   // szemek
  ctx.strokeStyle = '#4ad04a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-7, -30); ctx.moveTo(4, -22); ctx.lineTo(7, -30); ctx.stroke();   // csápok
  ctx.fillStyle = '#ff5ad0'; ctx.beginPath(); ctx.arc(-7, -30, 2, 0, Math.PI * 2); ctx.arc(7, -30, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawAbduct() {                             // az űrhajó fénynyalábja felszívja a játékost
  const A = player.abduct, k = A.t / ABDUCT_TIME, uy = A.y - 120 + (1 - Math.min(1, k * 3)) * -200;
  ctx.fillStyle = `rgba(170,255,170,${0.25 + 0.15 * Math.sin(clock * 20)})`;
  ctx.beginPath(); ctx.moveTo(A.x - 18, uy + 10); ctx.lineTo(A.x + 18, uy + 10); ctx.lineTo(A.x + 60, A.y + 18); ctx.lineTo(A.x - 60, A.y + 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9aa8b8'; ctx.beginPath(); ctx.ellipse(A.x, uy, 60, 18, 0, 0, Math.PI * 2); ctx.fill();   // csésze
  ctx.fillStyle = '#7fe0ff'; ctx.beginPath(); ctx.ellipse(A.x, uy - 10, 24, 14, 0, Math.PI, Math.PI * 2); ctx.fill();   // kupola
  ctx.fillStyle = '#ff5a5a'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(A.x + i * 18, uy + 4, 3, 0, Math.PI * 2); ctx.fill(); }
  const sk = SKINS[activeSkin], lift = k * 110;
  ctx.save(); ctx.globalAlpha = 1 - k * 0.6;
  drawPerson(A.x + Math.sin(clock * 12) * 3, A.y - lift, player.angle + k * 8, player.walk, sk.shirt, sk.head, false, sk.legs, sk.hat, sk.pattern);
  ctx.restore();
}
function drawMoon(w, h) {
  if (player.moon.horror) { drawHorror(w, h); return; }
  const M = player.moon, ox = Math.round((w - MOON_W) / 2), oy = Math.round((h - MOON_H) / 2);
  ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`; ctx.fillRect((i * 97) % w, (i * 53) % Math.max(60, h * 0.55), 2, 2); }   // csillagok
  const gy = oy + 20;
  ctx.fillStyle = '#9a9aa4'; ctx.fillRect(0, gy, w, h - gy);                                         // holdfelszín
  ctx.fillStyle = '#85858f'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse((i * 211 + 60) % w, gy + 30 + (i * 67) % (h - gy - 40), 40 + (i % 3) * 14, 12 + (i % 3) * 4, 0, 0, Math.PI * 2); ctx.fill(); }   // kráterek
  ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(w - 120, 90, 46, 0, Math.PI * 2); ctx.fill();   // a Föld az égen
  ctx.fillStyle = '#3aa04a'; ctx.beginPath(); ctx.ellipse(w - 130, 80, 16, 12, 0.5, 0, Math.PI * 2); ctx.ellipse(w - 104, 104, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(ox, oy);
  const C = MOON_CELL;
  ctx.fillStyle = '#4a4a56'; ctx.fillRect(C.x0, C.y0, C.x1 - C.x0, C.y1 - C.y0);                      // cella padlója
  const sk = SKINS[activeSkin];
  drawPerson(M.ix, M.iy, player.angle, player.walk, '#ff8a1f', sk.head, false, '#ff8a1f', null, null);   // narancs fogolyruha
  ctx.strokeStyle = '#cfd3d8'; ctx.lineWidth = 4;                                                     // rácsok
  for (let x = C.x0; x <= C.x1; x += 22) { ctx.beginPath(); ctx.moveTo(x, C.y0 - 10); ctx.lineTo(x, C.y1 + 10); ctx.stroke(); }
  ctx.strokeRect(C.x0 - 4, C.y0 - 10, C.x1 - C.x0 + 8, C.y1 - C.y0 + 20);
  const near = nearEscape();                                                                          // titkos járat a cella sarkában
  ctx.fillStyle = '#16161c'; ctx.beginPath(); ctx.ellipse(ESCAPE_SPOT.x, ESCAPE_SPOT.y, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = near ? '#ff5a5a' : '#6a2030'; ctx.lineWidth = near ? 4 : 2; ctx.stroke();
  ctx.fillStyle = near ? '#ff8a8a' : '#8a4050'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('rés', ESCAPE_SPOT.x, ESCAPE_SPOT.y + 4);
  const gx = M.guard < 450 ? 40 + M.guard : 40 + (900 - M.guard);                                     // őr: ide-oda járkál a cella előtt
  drawAlien({ x: gx, y: C.y1 + 50, angle: 0, walk: M.walk });
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(C.x0 + 60, C.y0 - 36, 100, 22);
  ctx.fillStyle = '#7fff7f'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HOLD-BÖRTÖN', C.x0 + 110, C.y0 - 20);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`🌙 Börtönben vagy a Holdon – szabadulásig: ${Math.ceil(M.t)} mp`, w / 2, oy + MOON_H + 60);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText(nearEscape() ? '🕳 E: átbújsz a résen a Fordított Világba – ott 3 démogorgont kell lelőnöd, hogy megszökj!' : 'Az őr azt mondja: „Bzzt! Itt maradsz, földi!” · WASD: sétálgatás · a cella sarkában van egy rés…', w / 2, oy + MOON_H + 86); ctx.textAlign = 'left';
}

// ===== Háború (ADR-0036): néha két sereg csap össze a közelben – katonák és tankok; 4 perc után atombomba robban a csatatéren =====
const WAR_FIRST = 240, WAR_GAP_MIN = 300, WAR_GAP_MAX = 540, WAR_LIFE = 240, WAR_REINFORCE = 3, WAR_SOLDIERS = 20, SOLDIER_HP = 3, SOLDIER_BOUNTY = 20, WAR_RADIUS = 650;
const WAR_TANKS = 2, TANK_HP = 12, TANK_BOUNTY = 100, TANK_RELOAD = 3.5, TANK_SPEED = 55, TANK_RIFLE = 0.25, TANK_SHELL_HIT = 4, TANK_REINFORCE = 40;
const NUKE_WARN = 12, NUKE_KILL = 1000, NUKE_RADIUS = 1800, NUKE_HOUSES = 1100;
const MISSILE_EVERY = 22, MISSILE_FLIGHT = 4.5, MISSILE_RADIUS = 220, MISSILE_HOUSES = 170;               // ballisztikus rakéta: 4,5 mp-es repülés, piros célkör figyelmeztet
const OCCUPY_TIME = 150, GARRISON = 5, LIBERATE_BOUNTY = 200, OCCUPY_RADIUS = 450;                        // a győztes sereg megszállja a területet
const ARMY_JOIN = 900, ARMY_SIZE = 14, ARMY_TANKS = 1, ARMY_REINFORCE = 5, ARMY_FOLLOW = 650;       // a saját sereg: azonnal megérkezik, ha a háború közelébe érsz
const WAR_COLORS = { P: { shirt: '#a83232', legs: '#6a1f1f', hat: '#5a1a1a', head: '#2a1a10', hull: '#a83a3a', dark: '#6a2020' }, A: { shirt: '#5a6a3a', legs: '#4a5a2a', hat: '#46552a', head: '#3a2a1a', hull: '#586b36', dark: '#3c4a24' }, B: { shirt: '#6a7a9a', legs: '#3a4a6a', hat: '#2a3a5a', head: '#2a1a10', hull: '#566a8e', dark: '#38496a' } };
let warsEnabled = true;                            // teszteléshez kikapcsolható
let war = null;                                    // { x, y, t, axis, shellT, reinT, tankT, lost, nukeArmed }
const warClock = { left: WAR_FIRST };
const soldiers = [];                               // katonák és tankok: { x, y, r, side, hp, angle, walk, cd, id, tank?, aim? }
const fallen = [];                                 // elesett katonák és tankroncsok (rövid ideig látszanak)
const warShells = [];                              // a tankok repülő lövedékei: { x, y, tx, ty, t, dur, side }
const missiles = [];                               // ballisztikus rakéták: { x0, y0, tx, ty, t, side }
const garrison = [];                               // a megszálló sereg katonái (a háború után)
let occupation = null;                             // { x, y, side, until }
const craters = [];                                // atomkráterek (a játékmenet végéig megmaradnak)
let nukeFx = null;                                 // a robbanás látványa: { x, y, born }
let soldierId = 0;
const isTank = o => !!o.tank;
function spawnArmySoldier(x, y, tank = false) {     // a játékos serege: a megadott pont körül jelenik meg
  const ang = Math.atan2(war.y - y, war.x - x);
  const sd = { x, y, r: tank ? 26 : 11, side: 'P', hp: tank ? TANK_HP : SOLDIER_HP, angle: ang, walk: rand() * 6, cd: 0.5 + rand(), id: soldierId++ };
  if (tank) Object.assign(sd, { tank: true, aim: ang });
  soldiers.push(sd);
  return sd;
}
function callArmy() {                                // megérkeztél a háborúhoz: a saját sereged azonnal megjelenik körülötted
  war.army = true;
  for (let i = 0; i < ARMY_SIZE; i++) { const a = i / ARMY_SIZE * Math.PI * 2, d = 110 + rand() * 150; spawnArmySoldier(player.x + Math.cos(a) * d, player.y + Math.sin(a) * d); }
  for (let i = 0; i < ARMY_TANKS; i++) spawnArmySoldier(player.x - Math.cos(player.angle) * 260, player.y - Math.sin(player.angle) * 260, true);
  popup(`🪖 Megérkezett a saját seregem: ${ARMY_SIZE} katona és ${ARMY_TANKS} tank – követnek, és minden ellenséget lőnek!`, '#ff9a9a');
  message = { text: '🪖 A SAJÁT SEREGED MEGÉRKEZETT!', until: clock + 2.5, color: '#ff9a9a' };
  addNews('🪖 Megérkezett a játékos serege a csatatérre');
}
function spawnSoldier(side, dist, tank = false) {   // a sereg oldalán, a csatatér szélén jelenik meg (induláskor és erősítésként is)
  const ax = Math.cos(war.axis), ay = Math.sin(war.axis), along = (side === 'A' ? -1 : 1) * dist, across = (rand() - 0.5) * 900;
  const ang = side === 'A' ? war.axis : war.axis + Math.PI;
  const sd = { x: war.x + ax * along - ay * across, y: war.y + ay * along + ax * across, r: tank ? 26 : 11, side, hp: tank ? TANK_HP : SOLDIER_HP, angle: ang, walk: rand() * 6, cd: tank ? 1.5 + rand() * 2 : 0.5 + rand(), id: soldierId++ };
  if (tank) Object.assign(sd, { tank: true, aim: ang });
  soldiers.push(sd);
  return sd;
}
function dropWarMissiles() { for (let i = missiles.length - 1; i >= 0; i--) if (missiles[i].side !== 'P') missiles.splice(i, 1); }   // a játékos rakétái a háború végén is tovább repülnek
function startWar() {
  const a = rand() * Math.PI * 2, d = 1500 + rand() * 700, cx = player.x + Math.cos(a) * d, cy = player.y + Math.sin(a) * d;
  const axis = rand() * Math.PI * 2;
  war = { x: cx, y: cy, t: 0, shellT: 2, alertT: 0, missileT: 14, bomberT: 18, axis, reinT: { A: 0, B: 0, P: 0 }, tankT: { A: 0, B: 0 }, lost: { A: 0, B: 0, P: 0 }, nukeArmed: false, army: false };
  soldiers.length = 0; warShells.length = 0; dropWarMissiles();
  endOccupation();                                  // az új háború az előző megszállást is lezárja
  for (const side of ['A', 'B']) {                  // mindkét sereg mögött egy leparkolt bombázó áll – a játékos is felülhet rá
    const ax = Math.cos(axis), ay = Math.sin(axis), dn = side === 'A' ? -1 : 1, off = (rand() - 0.5) * 300;
    spawnParkedPlane(cx + ax * dn * 800 - ay * off, cy + ay * dn * 800 + ax * off, side === 'A' ? axis : axis + Math.PI, side);
  }
  for (const side of ['A', 'B']) for (let i = 0; i < WAR_SOLDIERS; i++) spawnSoldier(side, 330 + rand() * 120);
  for (const side of ['A', 'B']) for (let i = 0; i < WAR_TANKS; i++) spawnSoldier(side, 520 + rand() * 80, true);   // a tankok hátrébb állnak
  popup('⚔ HÁBORÚ tört ki a környéken – katonákkal és tankokkal! Ne menj a csatatérre!', '#ff5a2a');
  addNews('⚔ Háború tört ki a sivatagban: a zöld és a kék sereg csapott össze, katonákkal és tankokkal');
  message = { text: '⚔ HÁBORÚ!', until: clock + 2.5, color: '#ff5a2a' };
}
function callWar() {                                // Q: háború indítása (csalókód-szerű: nem kell várni az időzítőre)
  if (!controllable() || player.inHouse) return false;
  if (war) { popup('⚔ Már dúl a háború – nézd a nyilat!', '#ff5a2a'); return false; }
  startWar();
  return true;
}
function endWar(text) {
  popup(text, '#ffd23a');
  addNews(text);
  war = null; soldiers.length = 0; warShells.length = 0; dropWarMissiles(); bombers.length = 0;
  warClock.left = WAR_GAP_MIN + rand() * (WAR_GAP_MAX - WAR_GAP_MIN);
}
function killSoldier(sd, byPlayer) {                // meghal: marad a teste (a tank roncsa), a játékos jutalmat kap
  let list = soldiers, i = soldiers.indexOf(sd);
  if (i < 0) { list = garrison; i = garrison.indexOf(sd); }                  // a megszálló katona is ide tartozik
  if (i < 0) return;
  list.splice(i, 1);
  if (war) war.lost[sd.side] += isTank(sd) ? 2 : 1;                           // egy tank két katonát ér a veszteségben
  fallen.push({ x: sd.x, y: sd.y, angle: sd.angle, side: sd.side, born: clock, tank: isTank(sd) });
  if (fallen.length > 40) fallen.shift();
  if (isTank(sd)) { explosions.push({ x: sd.x, y: sd.y, born: clock }); flashes.push({ x: sd.x, y: sd.y, until: clock + 0.25 }); for (let k = 0; k < 10; k++) addSmoke(sd.x + (rand() - 0.5) * 60, sd.y + (rand() - 0.5) * 60, 0, 0, true); }
  if (byPlayer) earn(isTank(sd) ? TANK_BOUNTY : SOLDIER_BOUNTY, isTank(sd) ? 'tank ⚔💥' : 'katona ⚔');
}
function shell(x, y, spare, rad = 110) {            // tüzérségi / tanklövedék / légibomba: a házakat nem rombolja (az a bombáé); a `spare` oldalt kíméli
  explosions.push({ x, y, born: clock });
  flashes.push({ x, y, until: clock + 0.25 });
  for (let i = 0; i < 14; i++) addSmoke(x + (rand() - 0.5) * 100, y + (rand() - 0.5) * 100, (rand() - 0.5) * 160, (rand() - 0.5) * 160, true);
  for (const sd of [...soldiers]) {
    if (spare && sd.side === spare) continue;
    if (Math.hypot(sd.x - x, sd.y - y) >= rad) continue;
    if (isTank(sd)) { sd.hp -= TANK_SHELL_HIT; if (sd.hp <= 0) killSoldier(sd, false); }      // a tank három lövedéket bír
    else killSoldier(sd, false);
  }
  if (spare === 'P') { alertPeds(x, y); return; }                               // a saját tank lövedéke csak az ellenséget éri (téged és a polgárokat nem)
  for (const c of aiCars) if (!c.wrecked && Math.hypot(c.x - x, c.y - y) < rad) { c.health = 0; c.wrecked = true; }
  for (const n of npcs) if (!n.dead && Math.hypot(n.x - x, n.y - y) < rad) killNpc(n, false);
  if (!player.dead && !player.inHouse && !player.riding && !car.plane) {                 // a repülőn ülőt a földi robbanás nem éri
    const t = player.inCar ? car : player, d = Math.hypot(t.x - x, t.y - y), pr = rad * 1.27;
    if (d < pr) damagePlayer(Math.round((player.inCar ? 25 : 45) * (1 - d / pr)) + 5);
  }
  alertPeds(x, y);
}
// ===== Repülők (ADR-0038): a háborúban AI bombázók húznak el a csatatér fölött; a leparkolt gépekre a játékos is felülhet és bombázhat =====
const PLANE_MIN = 140, PLANE_MAX = 620, PLANE_LAND = 260, PLANE_AMMO = 30, PLANE_ACCEL = 260, PLANE_TURN = 1.4;
const BOMBER_EVERY = 38, BOMBER_SPEED = 520, AIRBOMB_FALL = 0.9, AIRBOMB_RADIUS = 140, PLANE_PARKED_MAX = 8;
const PLANE_MISSILES = 6, PLANE_ATOMS = 1, ATOM_FALL = 2.5, PLAYER_MISSILE_RANGE = 1700;                      // a játékos gépének fegyverei: bomba (B), rakéta, atombomba – V váltja
const PLANE_WEAPONS = ['💣 bomba', '🚀 rakéta', '☢ atombomba'];
const PLANE_MODEL = { name: 'Bombázó', type: 'plane', color: ['#8a8f96', '#555'], len: 90, wid: 90, accel: 0, maxRoad: 620, maxSand: 620, sandDrag: 0, fuelUse: 0 };
const planes = [];                                 // leparkolt gépek: { x, y, angle, side }
const bombers = [];                                // AI bombázók: { x, y, vx, vy, angle, side, dropT, ax, ay }
const airBombs = [];                               // zuhanó bombák: { x, y, t, side }
function spawnParkedPlane(x, y, angle, side, ammo) {
  planes.push({ x, y, angle, side, ammo: ammo || { bomb: PLANE_AMMO, missile: PLANE_MISSILES, atom: PLANE_ATOMS } });   // a lőszer a géppel marad (nem tölthető újra leszállással)
  if (planes.length > PLANE_PARKED_MAX) planes.shift();
}
function sendBomber(side) {                         // átrepül a csatatér fölött, és bombákat szór
  const perp = war.axis + Math.PI / 2 * (rand() < 0.5 ? 1 : -1), dx = Math.cos(perp), dy = Math.sin(perp), off = (rand() - 0.5) * 500;
  const sx = war.x - dx * 2800 - dy * off, sy = war.y - dy * 2800 + dx * off;
  bombers.push({ x: sx, y: sy, vx: dx * BOMBER_SPEED, vy: dy * BOMBER_SPEED, angle: perp, side, dropT: 0, cx: war.x, cy: war.y });
  popup(`✈ ${side === 'A' ? 'Zöld' : 'Kék'} bombázó közeledik a csatatér felé!`, '#ffb040');
}
function updateAirforce(dt) {
  if (war) {
    war.bomberT = (war.bomberT ?? 18) - dt;
    if (war.bomberT <= 0) { war.bomberT = BOMBER_EVERY * (0.8 + rand() * 0.4); sendBomber(rand() < 0.5 ? 'A' : 'B'); }
  }
  for (let i = bombers.length - 1; i >= 0; i--) {
    const b = bombers[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.dropT -= dt;
    const along = (b.x - b.cx) * Math.cos(b.angle) + (b.y - b.cy) * Math.sin(b.angle);
    if (Math.abs(along) < 520 && b.dropT <= 0) { b.dropT = 0.28; airBombs.push({ x: b.x + (rand() - 0.5) * 30, y: b.y + (rand() - 0.5) * 30, t: 0, side: b.side }); }
    if (along > 3200) bombers.splice(i, 1);
  }
  for (let i = airBombs.length - 1; i >= 0; i--) {
    const a = airBombs[i]; a.t += dt;
    if (a.t >= (a.dur || AIRBOMB_FALL)) { airBombs.splice(i, 1); if (a.side === 'N') nuke(a.x, a.y); else if (a.side === 'P') explode(a.x, a.y); else shell(a.x, a.y, a.side, AIRBOMB_RADIUS); }   // a játékos bombája igazi bomba (házak is dőlnek), az atombomba igazi atombomba
  }
  for (let i = missiles.length - 1; i >= 0; i--) {                              // repülő rakéták (háborús és a játékosé): becsapódáskor nagy robbanás
    const m = missiles[i]; m.t += dt;
    if (m.t >= MISSILE_FLIGHT) { missiles.splice(i, 1); missileImpact(m.tx, m.ty); }
  }
}
const nearestPlane = () => planes.find(pl => Math.hypot(pl.x - player.x, pl.y - player.y) < 90);
function mountPlane(pl) {
  planes.splice(planes.indexOf(pl), 1);
  const snap = { ...car }, col = WAR_COLORS[pl.side] || WAR_COLORS.A;
  applyCarModel(car, { ...PLANE_MODEL, color: [col.hull, col.dark] });
  Object.assign(car, { x: pl.x, y: pl.y, angle: pl.angle, vx: Math.cos(pl.angle) * 220, vy: Math.sin(pl.angle) * 220, fuel: 100, rental: true, plane: true, planeSnap: snap, planeAmmo: pl.ammo.bomb, planeMissiles: pl.ammo.missile, planeAtoms: pl.ammo.atom, planeWeapon: 0, planeSide: pl.side, planeOwn: !!pl.own, bombCd: 0, lastWheels: null });
  player.inCar = true;
  popup('✈ Felszálltál a bombázóra! W/S: gáz/fék, A/D: kormány, B: tűz, V: fegyverváltás (bomba / rakéta / atombomba), E: leszállás vagy kiugrás', '#ffb040');
}
function leavePlane(park = true) {                  // leszállás: a gép ott marad; kiugrás: a gép lezuhan (nem marad)
  if (!car.plane) return;
  if (park) { spawnParkedPlane(car.x, car.y, car.angle, car.planeSide || 'A', { bomb: car.planeAmmo, missile: car.planeMissiles, atom: car.planeAtoms }); planes[planes.length - 1].own = !!car.planeOwn; }
  const snap = car.planeSnap;
  Object.assign(car, snap, { plane: false, planeSnap: null, vx: 0, vy: 0 });
}
function playerPlaneExit() {                        // E a repülőn: lassan leszállsz, gyorsan kiugrasz (ejtőernyő, kis sérüléssel)
  const sp = Math.hypot(car.vx, car.vy);
  player.x = car.x + Math.sin(car.angle) * 70; player.y = car.y - Math.cos(car.angle) * 70; player.angle = car.angle; player.inCar = false;
  if (sp <= PLANE_LAND) { leavePlane(true); popup('✈ Leszálltál – a gép itt marad (E: újra felszállás)', '#ffb040'); }
  else {
    explosions.push({ x: car.x, y: car.y, born: clock }); for (let k = 0; k < 14; k++) addSmoke(car.x + (rand() - 0.5) * 80, car.y + (rand() - 0.5) * 80, 0, 0, true);
    leavePlane(false); damagePlayer(15); popup('🪂 Kiugrottál – a gép lezuhant!', '#ffb040');
  }
  collide(player);
}
function cyclePlaneWeapon() {
  car.planeWeapon = ((car.planeWeapon || 0) + 1) % PLANE_WEAPONS.length;
  popup(`✈ Fegyver: ${PLANE_WEAPONS[car.planeWeapon]}`, '#ffb040');
}
function dropAirBomb() {                           // B a repülőn: a kiválasztott fegyver (bomba / ballisztikus rakéta / atombomba)
  if (car.bombCd > 0) return false;
  const w = car.planeWeapon || 0;
  if (w === 0) {
    if (car.planeAmmo <= 0) { popup('✈ Elfogyott a bomba! Válts fegyvert (V), vagy szállj le.', '#f66'); return false; }
    car.planeAmmo--; car.bombCd = 0.25;
    airBombs.push({ x: car.x, y: car.y, t: 0, side: 'P' });
  } else if (w === 1) {                            // ballisztikus rakéta: a gép előtt, az orra irányában csapódik be (a célkör mutatja)
    if (car.planeMissiles <= 0) { popup('🚀 Elfogyott a rakéta! Válts fegyvert (V).', '#f66'); return false; }
    car.planeMissiles--; car.bombCd = 1;
    const a = car.angle;
    missiles.push({ x0: car.x, y0: car.y, tx: car.x + Math.cos(a) * PLAYER_MISSILE_RANGE, ty: car.y + Math.sin(a) * PLAYER_MISSILE_RANGE, t: 0, side: 'P' });
    raiseWanted(2, '🚀 RAKÉTÁT LŐTTÉL KI! ★★');
    popup(`🚀 Ballisztikus rakéta indult – ${Math.round(PLAYER_MISSILE_RANGE / 10)} m-re csapódik be (célkör)!`, '#ff6a3a');
  } else {                                         // atombomba: lassan esik – addig menekülj messzire (1000 px-en belül te is meghalsz)!
    if (car.planeAtoms <= 0) { popup('☢ Elfogyott az atombomba! Válts fegyvert (V).', '#f66'); return false; }
    car.planeAtoms--; car.bombCd = 1.5;
    airBombs.push({ x: car.x, y: car.y, t: 0, side: 'N', dur: ATOM_FALL });
    raiseWanted(2, '☢ ATOMBOMBÁT DOBTÁL! ★★');            // a körözésnek két szintje van (★★ a legtöbb)
    popup(`☢ ATOMBOMBA ledobva – ${ATOM_FALL} mp múlva robban! Menekülj legalább ${NUKE_KILL} px-re (gyorsíts: W)!`, '#ff3030');
  }
  return true;
}
function updatePlane(c, dt) {                       // repülés: nincs ütközés a földi dolgokkal, a gép nem tud megállni
  const ride = player.inCar && controllable();
  let sp = Math.hypot(c.vx, c.vy) || 200;
  if (ride) {
    if (keys.KeyW || keys.ArrowUp) sp += PLANE_ACCEL * dt;
    if (keys.KeyS || keys.ArrowDown) sp -= PLANE_ACCEL * dt;
    const steer = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
    c.angle += steer * PLANE_TURN * dt * clamp(sp / 300, 0.5, 1.2);
  }
  sp = clamp(sp, PLANE_MIN, PLANE_MAX);
  c.vx = Math.cos(c.angle) * sp; c.vy = Math.sin(c.angle) * sp;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.bombCd = Math.max(0, (c.bombCd || 0) - dt);
  c.braking = false; c.skid = false; c.lastWheels = null;
  if (c === car && player.inCar) {                                             // felhőkarcolónak repülve a gép lezuhan
    for (const hs of housesIn(c.x - 90, c.y - 90, c.x + 90, c.y + 90)) {
      if (hs.sky && c.x > hs.x0 - 20 && c.x < hs.x1 + 20 && c.y > hs.y0 - 20 && c.y < hs.y1 + 20) { planeCrash(); return; }
    }
  }
}
function planeCrash() {
  addNews('✈💥 Egy bombázó lezuhant egy felhőkarcolónak');
  explosions.push({ x: car.x, y: car.y, born: clock }); flashes.push({ x: car.x, y: car.y, until: clock + 0.3 });
  for (let k = 0; k < 24; k++) addSmoke(car.x + (rand() - 0.5) * 120, car.y + (rand() - 0.5) * 120, (rand() - 0.5) * 200, (rand() - 0.5) * 200, true);
  player.x = car.x; player.y = car.y; player.inCar = false;
  leavePlane(false);
  damagePlayer(70);
  if (!player.dead) message = { text: '✈💥 NEKIREPÜLTÉL EGY FELHŐKARCOLÓNAK!', until: clock + 2.5, color: '#ff6a3a' };
  else message = { text: '✈💥 NEKIREPÜLTÉL EGY FELHŐKARCOLÓNAK!', until: clock + 3, color: '#ff6a3a' };
  alertPeds(player.x, player.y); boom();
}
function drawPlane(c, flying) {                     // felülnézeti bombázó: törzs, szárnyak, hajtóművek, árnyék
  const ang = c.angle, col = c.color || (c.side && [WAR_COLORS[c.side].hull, WAR_COLORS[c.side].dark]) || ['#8a8f96', '#555'];
  const sh = flying ? 34 : 6;
  ctx.save(); ctx.translate(c.x + sh, c.y + sh * 1.2); ctx.rotate(ang); ctx.fillStyle = 'rgba(0,0,0,0.28)';           // árnyék (repülés közben távolabb esik)
  ctx.fillRect(-40, -6, 80, 12); ctx.fillRect(-8, -48, 16, 96); ctx.restore();
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
  ctx.fillStyle = col[1]; ctx.fillRect(-10, -50, 22, 100);                                                                  // szárny
  ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(0, 0, 46, 9, 0, 0, Math.PI * 2); ctx.fill();                          // törzs
  ctx.fillStyle = col[1]; ctx.fillRect(-48, -20, 12, 40);                                                                   // farokszárny
  ctx.fillStyle = '#7fb6d9'; ctx.beginPath(); ctx.ellipse(22, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();                       // pilótafülke
  ctx.fillStyle = '#333'; for (const sy of [-26, 26]) { ctx.fillRect(2, sy - 4, 16, 8); }                                    // hajtóművek
  if (flying) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (const sy of [-26, 26]) { ctx.beginPath(); ctx.arc(20, sy, 6 + (clock * 40 % 3), 0, Math.PI * 2); ctx.stroke(); } }   // pörgő légcsavar
  ctx.restore();
}
function drawAirBombs() {
  for (const a of airBombs) {
    const nk = a.side === 'N', k = a.t / (a.dur || AIRBOMB_FALL), alt = (1 - k) * (nk ? 520 : 260), sz = nk ? 2.2 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(a.x, a.y, 9 * sz, 5 * sz, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = nk ? '#2a2a2a' : '#1a1a1a'; ctx.beginPath(); ctx.ellipse(a.x, a.y - alt, 6 * sz, 10 * sz, 0, 0, Math.PI * 2); ctx.fill();
    if (nk) { ctx.fillStyle = Math.floor(clock * 8) % 2 ? '#ff3030' : '#ffd23a'; ctx.beginPath(); ctx.arc(a.x, a.y - alt, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,60,60,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x, a.y, NUKE_KILL * (0.4 + 0.6 * (1 - k)), 0, Math.PI * 2); ctx.stroke(); }   // a halálos kör szűkül: látszik, meddig kell menekülni
  }
}

// ===== Ballisztikus rakéták (a háború alatt) és a megszállás (a háború után) =====
function launchMissile() {
  const side = rand() < 0.5 ? 'A' : 'B', dirn = side === 'A' ? -1 : 1, ax = Math.cos(war.axis), ay = Math.sin(war.axis);
  let tx, ty;
  const roll = rand(), hs = housesIn(war.x - 1800, war.y - 1800, war.x + 1800, war.y + 1800);
  if (roll < 0.25 && !player.dead && !player.inHouse && Math.hypot(player.x - war.x, player.y - war.y) < 2300) { tx = player.x; ty = player.y; }   // néha rád céloz (a célkör időt ad a menekülésre)
  else if (roll < 0.7 && hs.length) { const h = hs[(rand() * hs.length) | 0]; tx = h.x; ty = h.y; }                                               // „meg akarják szállni a világot”: lakott területet lőnek
  else { tx = war.x + (rand() - 0.5) * 900; ty = war.y + (rand() - 0.5) * 900; }
  missiles.push({ x0: war.x + ax * dirn * 2800, y0: war.y + ay * dirn * 2800, tx, ty, t: 0, side });
  popup('🚀 BALLISZTIKUS RAKÉTA indult! Nézd a piros célkört!', '#ff3030');
}
function missileImpact(x, y) {
  addNews('🚀 Ballisztikus rakéta csapódott be a környéken');
  explosions.push({ x, y, born: clock }); explosions.push({ x: x + 40, y: y - 30, born: clock + 0.15 });
  flashes.push({ x, y, until: clock + 0.35 });
  for (let i = 0; i < 30; i++) addSmoke(x + (rand() - 0.5) * 260, y + (rand() - 0.5) * 260, (rand() - 0.5) * 240, (rand() - 0.5) * 240, true);
  const wasInside = !!player.inHouse;
  for (const sd of [...soldiers, ...garrison]) if (Math.hypot(sd.x - x, sd.y - y) < MISSILE_RADIUS) { if (isTank(sd)) { sd.hp -= 8; if (sd.hp <= 0) killSoldier(sd, false); } else killSoldier(sd, false); }
  for (const c of aiCars) if (!c.wrecked && Math.hypot(c.x - x, c.y - y) < MISSILE_RADIUS) { c.health = 0; c.wrecked = true; }
  for (const n of npcs) if (!n.dead && Math.hypot(n.x - x, n.y - y) < MISSILE_RADIUS) killNpc(n, false);
  const dc = Math.hypot(car.x - x, car.y - y);
  if (dc < MISSILE_RADIUS * 1.5 && dc > 1) { car.vx += (car.x - x) / dc * 700; car.vy += (car.y - y) / dc * 700; }
  for (const hs of housesIn(x - MISSILE_HOUSES, y - MISSILE_HOUSES, x + MISSILE_HOUSES, y + MISSILE_HOUSES)) if (Math.hypot(hs.x - x, hs.y - y) < MISSILE_HOUSES) destroyHouse(hs, 'ELTALÁLT A RAKÉTA!');
  if (!wasInside && !player.dead && !player.riding && !car.plane) {
    const t = player.inCar ? car : player, d = Math.hypot(t.x - x, t.y - y);
    if (d < MISSILE_RADIUS) { damagePlayer(Math.round((player.inCar ? 80 : 120) * (1 - d / MISSILE_RADIUS)) + 10); if (player.dead) message = { text: '🚀 ELTALÁLT A RAKÉTA!', until: clock + 3, color: '#ff6a3a' }; }
  }
  alertPeds(x, y); boom();
}
function endOccupation() { occupation = null; garrison.length = 0; }
function startOccupation(x, y, side) {              // a győztes sereg katonái a területen maradnak, zászlót tűznek ki
  endOccupation();
  occupation = { x, y, side, until: clock + OCCUPY_TIME };
  for (let i = 0; i < GARRISON; i++) {
    const a = i / GARRISON * Math.PI * 2 + 0.4, d = 140 + rand() * 120;
    garrison.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: 11, side, hp: SOLDIER_HP, angle: a, walk: 0, cd: 1 + rand(), id: soldierId++ });
  }
  addNews(`🏴 A ${side === 'A' ? 'zöld' : 'kék'} sereg megszállta a háború helyszínét`);
  popup(`🏴 A ${side === 'A' ? 'zöld' : 'kék'} sereg megszállta a területet! Aki a közelébe megy, tűz alá kerül – űzd el őket (+$${LIBERATE_BOUNTY})!`, '#ffd23a');
}
function updateOccupation(dt) {
  if (!occupation) return;
  if (clock > occupation.until) { popup('🏴 A megszálló sereg elvonult', '#ffd23a'); endOccupation(); return; }
  if (!garrison.length) { earn(LIBERATE_BOUNTY, 'terület felszabadítva 🏴'); addNews('🏴 Felszabadult a megszállt terület – a megszállók elmenekültek'); endOccupation(); return; }
  const pOK = !player.dead && !player.inHouse && !player.riding && !player.moon && !player.abduct;
  for (const sd of garrison) {
    const pd = pOK ? Math.hypot(player.x - sd.x, player.y - sd.y) : 1e9;
    if (pd < OCCUPY_RADIUS) {                                                   // aki a közelbe jön, azt lövik
      sd.angle = Math.atan2(player.y - sd.y, player.x - sd.x); sd.cd -= dt;
      if (sd.cd <= 0 && pd < 620) {
        const ang = sd.angle + (rand() - 0.5) * 0.3, cx = Math.cos(ang), cy = Math.sin(ang);
        bullets.push({ x: sd.x + cx * 16, y: sd.y + cy * 16, vx: cx * 1100, vy: cy * 1100, life: 0.9, from: 'war' + sd.side });
        flashes.push({ x: sd.x + cx * 18, y: sd.y + cy * 18, until: clock + 0.05 });
        alertPeds(sd.x, sd.y); sd.cd = 0.9 + rand() * 0.8;
      }
    }
  }
}
function drawOccupation() {
  if (!occupation) return;
  const { x, y, side } = occupation, c = WAR_COLORS[side];
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash && ctx.setLineDash([16, 14]);
  ctx.beginPath(); ctx.arc(x, y, OCCUPY_RADIUS, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]);       // a megszállt terület széle
  ctx.fillStyle = '#ddd'; ctx.fillRect(x - 2, y - 70, 4, 70);                                                              // zászlórúd
  ctx.fillStyle = c.hull; ctx.beginPath(); ctx.moveTo(x + 2, y - 70); ctx.lineTo(x + 46, y - 60 + Math.sin(clock * 4) * 3); ctx.lineTo(x + 2, y - 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`megszállva: ${Math.max(0, Math.ceil(occupation.until - clock))} mp`, x, y + 18); ctx.textAlign = 'left';
}
function drawMissiles() {
  for (const m of missiles) {
    const k = m.t / MISSILE_FLIGHT, gx = m.x0 + (m.tx - m.x0) * k, gy = m.y0 + (m.ty - m.y0) * k, alt = Math.sin(k * Math.PI) * 520, ang = Math.atan2(m.ty - m.y0, m.tx - m.x0);
    ctx.strokeStyle = `rgba(255,40,40,${0.45 + 0.35 * Math.sin(clock * 12)})`; ctx.lineWidth = 5;                              // célkör
    ctx.beginPath(); ctx.arc(m.tx, m.ty, MISSILE_RADIUS * (0.55 + 0.45 * (1 - k)), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(m.tx, m.ty, MISSILE_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff3030'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`🚀 ${Math.max(0, MISSILE_FLIGHT - m.t).toFixed(1)}`, m.tx, m.ty + 7); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(gx, gy, 26, 8, ang, 0, Math.PI * 2); ctx.fill();                // árnyék
    ctx.save(); ctx.translate(gx, gy - alt); ctx.rotate(ang);
    ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-52 - Math.random() * 14, -5); ctx.lineTo(-52 - Math.random() * 14, 5); ctx.closePath(); ctx.fill();   // lángcsóva
    ctx.fillStyle = '#d8d8dc'; ctx.fillRect(-22, -6, 44, 12);                                                                      // törzs
    ctx.fillStyle = '#c03030'; ctx.beginPath(); ctx.moveTo(22, -6); ctx.lineTo(40, 0); ctx.lineTo(22, 6); ctx.closePath(); ctx.fill(); // orr
    ctx.fillStyle = '#888'; ctx.fillRect(-22, -11, 12, 5); ctx.fillRect(-22, 6, 12, 5);                                            // stabilizátor
    ctx.restore();
  }
}

// ===== Atombomba: a háború végén robban a csatatér közepén; 12 mp-es figyelmeztetés előzi meg =====
function boom() {                                    // mély, hosszú dörrenés (Web Audio, hangfájl nélkül, ADR-0026)
  const ac = audioOut(); if (!ac) return;
  const t = ac.currentTime;
  for (const [f0, f1, dur, gain] of [[90, 18, 2.2, 0.9], [220, 40, 1.2, 0.5]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(radio.out); o.start(t); o.stop(t + dur + 0.05);
  }
}
function nuke(x, y) {
  nukeFx = { x, y, born: clock };
  addNews('☢ ATOMBOMBA robbant! A környék romokban, kráter maradt');
  craters.push({ x, y, born: clock });
  boom();
  const wasInside = !!player.inHouse;               // a ház ledőlése előtt kell megjegyezni
  const t = player.inCar ? car : player, d = Math.hypot(t.x - x, t.y - y);
  for (const sd of [...soldiers]) killSoldier(sd, false);
  for (const c of aiCars) if (!c.wrecked && Math.hypot(c.x - x, c.y - y) < NUKE_RADIUS) { c.health = 0; c.wrecked = true; }
  const dc = Math.hypot(car.x - x, car.y - y);
  if (dc < NUKE_RADIUS && dc > 1) { car.vx += (car.x - x) / dc * 1500; car.vy += (car.y - y) / dc * 1500; }   // a játékos autóját csak ellöki
  for (const n of npcs) if (!n.dead && Math.hypot(n.x - x, n.y - y) < NUKE_RADIUS) killNpc(n, false);
  for (let i = aliens.length - 1; i >= 0; i--) if (Math.hypot(aliens[i].x - x, aliens[i].y - y) < NUKE_RADIUS) aliens.splice(i, 1);
  for (let i = indoor.length - 1; i >= 0; i--) if (Math.hypot(indoor[i].hs.x - x, indoor[i].hs.y - y) < NUKE_HOUSES) indoor.splice(i, 1);
  for (const hs of housesIn(x - NUKE_HOUSES, y - NUKE_HOUSES, x + NUKE_HOUSES, y + NUKE_HOUSES)) if (Math.hypot(hs.x - x, hs.y - y) < NUKE_HOUSES) destroyHouse(hs, 'ELPUSZTÍTOTT AZ ATOMBOMBA!');   // a bent lévőt is megöli
  for (let i = 0; i < 40; i++) addSmoke(x + (rand() - 0.5) * 500, y + (rand() - 0.5) * 500, (rand() - 0.5) * 300, (rand() - 0.5) * 300, true);
  if (!wasInside && !player.dead && !player.riding) {                         // házban 1100 px-en túl biztonságban vagy
    if (d < NUKE_KILL) { damagePlayer(10000); message = { text: '☢ ELPUSZTÍTOTT AZ ATOMBOMBA!', until: clock + 3, color: '#ffd23a' }; }
    else if (d < NUKE_RADIUS) damagePlayer(Math.round(90 * (1 - (d - NUKE_KILL) / (NUKE_RADIUS - NUKE_KILL))) + 10);
  }
  message = player.dead ? message : { text: '☢ ATOMBOMBA ROBBANT!', until: clock + 3, color: '#ffd23a' };
  alertPeds(x, y);
}
function updateWar(dt) {
  if (!warsEnabled) return;
  if (!war) {
    if (!player.moon && !player.abduct) warClock.left -= dt;
    if (warClock.left <= 0) startWar();
    return;
  }
  war.t += dt;
  if (!war.army && !war.nukeArmed && !player.dead && !player.moon && !player.abduct && Math.hypot(player.x - war.x, player.y - war.y) < ARMY_JOIN) callArmy();
  for (let si = soldiers.length - 1; si >= 0; si--) {
    const sd = soldiers[si];
    if (!soldiers.includes(sd)) continue;
    const tank = isTank(sd);
    let tgt = null, td = 1e9;
    for (const o of soldiers) if (o.side !== sd.side) { const d = Math.hypot(o.x - sd.x, o.y - sd.y); if (d < td) { td = d; tgt = o; } }
    const pOK = sd.side !== 'P' && !player.dead && !player.inHouse && !player.riding && !player.moon && !player.abduct;   // a saját sereg nem lő rád
    const pd = pOK ? Math.hypot(player.x - sd.x, player.y - sd.y) : 1e9;
    if (pd < (tank ? 700 : 450) && pd < td) { tgt = player; td = pd; }        // a közelben lévő játékos is célpont
    let mx = 0, my = 0;
    if (tgt) {
      const dx = tgt.x - sd.x, dy = tgt.y - sd.y, dd = Math.hypot(dx, dy) || 1, aim = Math.atan2(dy, dx);
      if (tank) sd.aim = aim; else sd.angle = aim;
      const near = tank ? 300 : 150, far = tank ? 420 : 260, sp = tank ? TANK_SPEED : 75;
      const dir = dd > far ? 1 : dd < near ? -1 : 0;                          // közelít, tartja a távolságot, kicsit oldalaz
      mx = dx / dd * dir * sp + (-dy / dd) * Math.sin(clock * 1.3 + sd.id) * (tank ? 8 : 30); my = dy / dd * dir * sp + (dx / dd) * Math.sin(clock * 1.3 + sd.id) * (tank ? 8 : 30);
      sd.cd -= dt;
      if (tank) {
        if (dd < 760 && sd.cd <= 0) {                                         // ágyúlövés: repülő lövedék, kicsit mellé is mehet
          warShells.push({ x: sd.x + Math.cos(aim) * 40, y: sd.y + Math.sin(aim) * 40, tx: tgt.x + (rand() - 0.5) * 120, ty: tgt.y + (rand() - 0.5) * 120, t: 0, dur: 0.75, side: sd.side });
          flashes.push({ x: sd.x + Math.cos(aim) * 46, y: sd.y + Math.sin(aim) * 46, until: clock + 0.1 });
          alertPeds(sd.x, sd.y);
          sd.cd = TANK_RELOAD * (0.8 + rand() * 0.4);
        }
      } else if (dd < 620 && sd.cd <= 0) {
        const ang = sd.angle + (rand() - 0.5) * 0.28, cx = Math.cos(ang), cy = Math.sin(ang);
        bullets.push({ x: sd.x + cx * 16, y: sd.y + cy * 16, vx: cx * 1100, vy: cy * 1100, life: 0.9, from: 'war' + sd.side });
        flashes.push({ x: sd.x + cx * 18, y: sd.y + cy * 18, until: clock + 0.05 });
        alertPeds(sd.x, sd.y);
        sd.cd = 0.8 + rand() * 0.8;
      }
    }
    if (sd.side === 'P') {                                                     // a saját sereg követ téged (messze menve utánad ered)
      const fx = player.x - sd.x, fy = player.y - sd.y, fd = Math.hypot(fx, fy);
      if (fd > ARMY_FOLLOW || (!tgt && fd > 220)) { const sp = tank ? TANK_SPEED : 95; mx += fx / fd * sp; my += fy / fd * sp; }
    } else {
      const lx = war.x - sd.x, ly = war.y - sd.y, ld = Math.hypot(lx, ly);     // a csatatérnál marad
      if (ld > WAR_RADIUS * 1.3) { mx += lx / ld * 80; my += ly / ld * 80; }
    }
    sd.x += mx * dt; sd.y += my * dt; sd.walk += dt * Math.hypot(mx, my) / 12;
    if (tank && (mx || my)) sd.angle = Math.atan2(my, mx);                    // a tank hajtás irányába fordul, a torony a célra néz
    collide(sd);
  }
  for (let i = warShells.length - 1; i >= 0; i--) {                            // repülő tanklövedékek: becsapódáskor robbannak (a saját oldalt kímélik)
    const w = warShells[i]; w.t += dt;
    if (w.t >= w.dur) { warShells.splice(i, 1); shell(w.tx, w.ty, w.side); }
  }
  war.missileT -= dt;
  if (war.missileT <= 0) { war.missileT = MISSILE_EVERY * (0.8 + rand() * 0.4); launchMissile(); }
  war.shellT -= dt;
  if (war.shellT <= 0) { war.shellT = 3 + rand() * 4; shell(war.x + (rand() - 0.5) * WAR_RADIUS * 1.2, war.y + (rand() - 0.5) * WAR_RADIUS * 1.2); }
  for (let i = fallen.length - 1; i >= 0; i--) if (clock - fallen[i].born > 25) fallen.splice(i, 1);
  if (war.army) {                                                             // a saját sereg is kap erősítést (mögötted érkezik)
    if (soldiers.filter(o => o.side === 'P' && !isTank(o)).length >= ARMY_SIZE) war.reinT.P = 0;
    else { war.reinT.P += dt; if (war.reinT.P >= ARMY_REINFORCE) { war.reinT.P = 0; const a = rand() * Math.PI * 2; spawnArmySoldier(player.x + Math.cos(a) * 450, player.y + Math.sin(a) * 450); } }
  }
  for (const side of ['A', 'B']) {                                            // erősítés: a fogyatkozó sereg újabb katonákat (és tankot) kap, így a háború tovább tart
    if (soldiers.filter(o => o.side === side && !isTank(o)).length >= WAR_SOLDIERS) war.reinT[side] = 0;
    else { war.reinT[side] += dt; if (war.reinT[side] >= WAR_REINFORCE) { war.reinT[side] = 0; spawnSoldier(side, 480 + rand() * 80); } }
    if (soldiers.filter(o => o.side === side && isTank(o)).length >= WAR_TANKS) war.tankT[side] = 0;
    else { war.tankT[side] += dt; if (war.tankT[side] >= TANK_REINFORCE) { war.tankT[side] = 0; spawnSoldier(side, 560, true); } }
  }
  if (!war.nukeArmed && war.t >= WAR_LIFE - NUKE_WARN) {                       // figyelmeztetés: atombomba közeleg
    war.nukeArmed = true;
    popup(`☢ ATOMBOMBA ${NUKE_WARN} mp múlva a csatatéren! Menekülj legalább ${NUKE_RADIUS} px-re, vagy bújj házba (a csatatértől 1100 px-nél messzebb)!`, '#ff3030');
    message = { text: '☢ ATOMBOMBA KÖZELEG!', until: clock + 3, color: '#ff3030' };
  }
  if (war.t >= WAR_LIFE) {                                                     // 4 perc: az atombomba robban, vége a háborúnak
    const la = war.lost.A, lb = war.lost.B, wx = war.x, wy = war.y, winner = la < lb ? 'A' : lb < la ? 'B' : null;
    nuke(wx, wy);
    endWar(`☢ A háború atombombával ért véget (veszteség: ${la}–${lb})`);
    if (winner) startOccupation(wx, wy, winner);                               // a győztes sereg megszállja a romokat
  }
}
function drawSoldier(sd) {
  if (isTank(sd)) { drawTank(sd); return; }
  const c = WAR_COLORS[sd.side];
  drawPerson(sd.x, sd.y, sd.angle, sd.walk, c.shirt, c.head, true, c.legs, c.hat, null);
  if (sd.hp < SOLDIER_HP) { ctx.fillStyle = '#e33'; for (let i = 0; i < sd.hp; i++) ctx.fillRect(sd.x - 8 + i * 6, sd.y - 20, 5, 3); }
}
function drawTank(sd, wreck = false) {
  const c = WAR_COLORS[sd.side];
  ctx.save(); ctx.translate(sd.x, sd.y); ctx.rotate(sd.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-34, -20, 76, 46);
  ctx.fillStyle = wreck ? '#1c1c1c' : '#222'; ctx.fillRect(-38, -26, 76, 11); ctx.fillRect(-38, 15, 76, 11);                    // lánctalpak
  if (!wreck) { ctx.fillStyle = '#444'; for (let x = -34; x < 36; x += 8) { ctx.fillRect(x + ((sd.walk * 4) % 8), -26, 3, 11); ctx.fillRect(x + ((sd.walk * 4) % 8), 15, 3, 11); } }
  ctx.fillStyle = wreck ? '#2a2a2a' : c.hull; ctx.beginPath(); ctx.roundRect(-34, -17, 68, 34, 5); ctx.fill();                  // páncéltest
  ctx.fillStyle = wreck ? '#1a1a1a' : c.dark; ctx.fillRect(-28, -10, 24, 20);
  ctx.restore();
  ctx.save(); ctx.translate(sd.x, sd.y); ctx.rotate(wreck ? sd.angle : sd.aim);                                                 // torony + ágyúcső a célra néz
  ctx.fillStyle = wreck ? '#1a1a1a' : c.dark; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = wreck ? '#111' : '#2a2a2a'; ctx.fillRect(8, -3, wreck ? 22 : 40, 6);
  ctx.restore();
  if (!wreck) {                                                                                                                 // életcsík
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sd.x - 22, sd.y - 38, 44, 7);
    const f = hpFraction(sd.hp, TANK_HP); ctx.fillStyle = f > 0.5 ? '#3c3' : f > 0.25 ? '#ec3' : '#e33'; ctx.fillRect(sd.x - 21, sd.y - 37, 42 * f, 5);
  }
}
function drawWarShells() {
  for (const w of warShells) {
    const k = w.t / w.dur, x = w.x + (w.tx - w.x) * k, y = w.y + (w.ty - w.y) * k - Math.sin(k * Math.PI) * 40;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(w.x + (w.tx - w.x) * k, w.y + (w.ty - w.y) * k, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  }
}
// az atomrobbanás látványa a világban: kráter, lökéshullám, felforrósodó tűzgömb, füst; a villanás az egész képernyőt elönti
function drawCraters() {
  for (const cr of craters) {
    const g = ctx.createRadialGradient(cr.x, cr.y, 40, cr.x, cr.y, 420);
    g.addColorStop(0, 'rgba(10,8,6,0.95)'); g.addColorStop(0.55, 'rgba(30,22,14,0.8)'); g.addColorStop(1, 'rgba(60,45,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cr.x, cr.y, 420, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,14,0.9)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cr.x, cr.y, 260, 0, Math.PI * 2); ctx.stroke();
  }
}
function drawNukeFx(cam, w, h) {
  if (!nukeFx) return;
  const age = clock - nukeFx.born;
  if (age > 14) { nukeFx = null; return; }
  const { x, y } = nukeFx;
  if (age < 2.5) {                                                                 // lökéshullám
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - age / 2.5)})`; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(x, y, Math.min(NUKE_RADIUS, age * 900), 0, Math.PI * 2); ctx.stroke();
  }
  const fr = 120 + Math.min(age, 6) * 70, fade = clamp(1 - Math.max(0, age - 4) / 10, 0, 1);   // tűzgömb → füstfelhő
  const g = ctx.createRadialGradient(x, y, 0, x, y, fr);
  g.addColorStop(0, `rgba(255,250,200,${0.95 * fade})`); g.addColorStop(0.35, `rgba(255,150,40,${0.85 * fade})`); g.addColorStop(0.75, `rgba(120,60,30,${0.7 * fade})`); g.addColorStop(1, 'rgba(60,40,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, fr, 0, Math.PI * 2); ctx.fill();
  const flash = Math.max(0, 1 - age / 2.2);                                        // vakító fehér villanás
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(cam.x - w / 2 - 50, cam.y - h / 2 - 50, w + 100, h + 100); }
}

// ===== Bomba: B – lerakod, 3 mp múlva robban (autók, emberek, házak; téged is megsebez) =====
const BOMB_FUSE = 3, BOMB_RADIUS = 220, BOMB_MAX = 5, BOMB_REGEN = 60;
const bombs = [];                                  // { x, y, fuse }
const explosions = [];                             // { x, y, born } – a robbanás látványa
const bombInv = { count: 3, regen: BOMB_REGEN };

function dropBomb() {
  if (!controllable() || player.inHouse || player.riding) return false;
  if (player.inCar && car.plane) return dropAirBomb();
  if (bombInv.count <= 0) { popup(`Nincs bombád – percenként kapsz egyet (max ${BOMB_MAX})`, '#f66'); return false; }
  const src = player.inCar ? car : player;
  const bx = player.inCar ? car.x - Math.cos(car.angle) * (car.len / 2 + 20) : player.x;   // autóból hátra ejted
  const by = player.inCar ? car.y - Math.sin(car.angle) * (car.len / 2 + 20) : player.y;
  bombs.push({ x: bx, y: by, fuse: BOMB_FUSE });
  bombInv.count--;
  popup(`💣 Bomba lerakva – ${BOMB_FUSE} mp! Fuss!`, '#ff6a3a');
  return src;
}

function explode(x, y, rocket = false) {           // rocket: a rakétavető robbanása – a lövőt kevésbé sebzi, és csak ★ körözés jár
  explosions.push({ x, y, born: clock });
  flashes.push({ x, y, until: clock + 0.25 });
  for (let i = 0; i < 24; i++) addSmoke(x + (rand() - 0.5) * 120, y + (rand() - 0.5) * 120, (rand() - 0.5) * 200, (rand() - 0.5) * 200, true);
  const fall = d => 1 - d / BOMB_RADIUS;            // közel erősebb
  for (const c of [car, ...aiCars]) {               // autók: roncs és lökés
    const d = Math.hypot(c.x - x, c.y - y);
    if (d >= BOMB_RADIUS) continue;
    const nx = d > 1 ? (c.x - x) / d : 1, ny = d > 1 ? (c.y - y) / d : 0;
    c.vx += nx * 900 * fall(d); c.vy += ny * 900 * fall(d);
    if (c !== car) { c.health = 0; c.wrecked = true; }
  }
  for (const p of npcs) if (!p.dead && Math.hypot(p.x - x, p.y - y) < BOMB_RADIUS) killNpc(p, true);
  for (let i = aliens.length - 1; i >= 0; i--) if (Math.hypot(aliens[i].x - x, aliens[i].y - y) < BOMB_RADIUS) { aliens[i].hp = 1; shootAlien(aliens[i]); }   // a bomba az űrlényt is megöli
  for (const sd of [...soldiers, ...garrison]) if (sd.side !== 'P' && Math.hypot(sd.x - x, sd.y - y) < BOMB_RADIUS) killSoldier(sd, true);   // a saját seregedet a bomba megkíméli                                                       // és a katonákat is
  const wasInside = !!player.inHouse;               // a ház ledőlése előtt kell megjegyezni (az kiveszi belőle a játékost)
  for (const hs of housesIn(x - BOMB_RADIUS, y - BOMB_RADIUS, x + BOMB_RADIUS, y + BOMB_RADIUS)) {
    const cx = clamp(x, hs.x0, hs.x1), cy = clamp(y, hs.y0, hs.y1);
    if (Math.hypot(cx - x, cy - y) < BOMB_RADIUS * 0.6) destroyHouse(hs, 'FELROBBANTÁL A HÁZZAL!');
  }
  if (!wasInside && !player.dead && !car.plane) {   // a játékost is megsebzi (autóban kevésbé; a magasan repülőt nem)
    const t = player.inCar ? car : player, d = Math.hypot(t.x - x, t.y - y);
    if (d < BOMB_RADIUS) {
      const dmg = Math.round((player.inCar ? 60 : 120) * fall(d));
      damagePlayer(rocket ? Math.min(30, dmg) : dmg);
      if (player.dead) message = { text: 'FELROBBANTÁL!', until: clock + 3, color: '#ff6a3a' };
    }
  }
  if (!player.dead) raiseWanted(rocket ? 1 : 2, rocket ? 'RAKÉTAVETŐ! ★ ÜLDÖZ A RENDŐRSÉG!' : 'ROBBANTOTTÁL! ★★ ÜLDÖZ A RENDŐRSÉG!');   // halottként nem kap körözést (és a halál üzenete marad)
}

function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    bombs[i].fuse -= dt;
    if (bombs[i].fuse <= 0) { const b = bombs.splice(i, 1)[0]; explode(b.x, b.y); }
  }
  for (let i = explosions.length - 1; i >= 0; i--) if (clock - explosions[i].born > 0.8) explosions.splice(i, 1);
  if (bombInv.count < BOMB_MAX) {                   // percenként egy új bomba
    bombInv.regen -= dt;
    if (bombInv.regen <= 0) { bombInv.count++; bombInv.regen = BOMB_REGEN; }
  } else bombInv.regen = BOMB_REGEN;
}

function drawNukeDevices() {
  for (const n of nukeDevices) {
    ctx.strokeStyle = `rgba(255,40,40,${0.35 + 0.3 * Math.sin(clock * 8)})`; ctx.lineWidth = 6;           // a halálos kör
    ctx.beginPath(); ctx.arc(n.x, n.y, NUKE_KILL, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.roundRect(n.x - 18, n.y - 12, 36, 24, 5); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☢', n.x - 6, n.y + 5);
    ctx.fillStyle = Math.floor(clock * 6) % 2 ? '#ff3030' : '#ffd23a'; ctx.fillText(String(Math.ceil(n.fuse)), n.x + 8, n.y + 5);
    ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#ff3030'; ctx.fillText(`☢ ${Math.ceil(n.fuse)} mp`, n.x, n.y - 24); ctx.textAlign = 'left';
  }
}
function drawBombs() {
  for (const b of bombs) {
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(b.x, b.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Math.floor(clock * (b.fuse < 1 ? 12 : 5)) % 2 ? '#ff3a1a' : '#ffd23a';   // villogó gyújtózsinór
    ctx.beginPath(); ctx.arc(b.x + 8, b.y - 8, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(Math.ceil(b.fuse)), b.x, b.y + 4); ctx.textAlign = 'left';
  }
  for (const e of explosions) {
    const t = (clock - e.born) / 0.8, r = BOMB_RADIUS * (0.3 + t * 0.8);
    const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
    g.addColorStop(0, `rgba(255,240,180,${0.9 * (1 - t)})`); g.addColorStop(0.4, `rgba(255,140,40,${0.8 * (1 - t)})`); g.addColorStop(1, 'rgba(120,40,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
  }
}

function tornadoKillsPlayer() {
  damagePlayer(10000);
  message = { text: 'ELVITT A TORNÁDÓ!', until: clock + 3, color: '#ff6a3a' };
}

function updateTornado(dt) {
  if (!tornado) {
    if (tornadoEnabled && storm.level > 0.6 && rand() < dt * 0.15) spawnTornado();
    return;
  }
  const T = tornado;
  T.age += dt;
  const ending = storm.level < 0.3 || T.age > T.life;
  T.power = clamp(T.power + (ending ? -0.5 : 0.5) * dt, 0, 1);
  if (ending && T.power <= 0) { tornado = null; return; }
  T.wander += (rand() - 0.5) * dt * 2;
  const dx = player.x - T.x, dy = player.y - T.y, dd = Math.hypot(dx, dy) || 1;   // vadászik rád (házban is: a házat elviszi)
  const hunt = !player.dead ? TORNADO_CHASE * T.power : 0;
  T.x += (windX() * 40 + Math.cos(T.wander) * 25 + dx / dd * hunt) * dt;
  T.y += (windY() * 40 + Math.sin(T.wander) * 25 + dy / dd * hunt) * dt;
  T.spin += dt * 7;
  for (const f of T.flying) { f.t += dt; f.ang += dt * 5; }
  T.flying = T.flying.filter(f => f.t < 3);
  if (T.power < 0.3) return;

  const R = TORNADO_R * T.power;
  const pull = (o, d) => {                     // befelé húzó és körbeforgató irány
    const nx = (T.x - o.x) / d, ny = (T.y - o.y) / d, f = (1 - d / R) * T.power;
    return { ax: nx * f, ay: ny * f, tx: -ny * f, ty: nx * f };
  };
  // autók
  for (const c of [car, ...aiCars]) {
    const d = Math.hypot(T.x - c.x, T.y - c.y);
    if (d >= R || d < 0.001) continue;
    if (d < TORNADO_CORE) {                    // felszippantja
      flyAway('car', { color: c.color, len: c.len, wid: c.wid, type: c.type }, c.x, c.y);
      if (c === car) {
        if (player.inCar) tornadoKillsPlayer();
        Object.assign(car, { x: START_X + 100, y: START_Y - 50, angle: 0, vx: 0, vy: 0, lastWheels: null });   // az autó a kezdőhelyen kerül elő
      } else {
        if (player.riding === c) tornadoKillsPlayer();
        aiCars.splice(aiCars.indexOf(c), 1);
        if (c.racer) race.racers = race.racers.filter(r => r !== c);   // kiesik a versenyből is
      }
      continue;
    }
    const p = pull(c, d);
    c.vx += (p.ax * 900 + p.tx * 700) * dt; c.vy += (p.ay * 900 + p.ty * 700) * dt;
    c.x += (p.ax * 260 + p.tx * 200) * dt; c.y += (p.ay * 260 + p.ty * 200) * dt;   // a szél a tapadástól függetlenül sodor
  }
  // emberek
  for (let i = npcs.length - 1; i >= 0; i--) {
    const n = npcs[i], d = Math.hypot(T.x - n.x, T.y - n.y);
    if (d >= R || d < 0.001) continue;
    if (d < TORNADO_CORE) { flyAway('person', { shirt: n.shirt, head: n.head }, n.x, n.y); npcs.splice(i, 1); continue; }
    const p = pull(n, d);
    n.x += (p.ax * 230 + p.tx * 170) * dt; n.y += (p.ay * 230 + p.ty * 170) * dt;
  }
  if (!player.inCar && !player.riding && !player.inHouse && controllable()) {
    const d = Math.hypot(T.x - player.x, T.y - player.y);
    if (d < TORNADO_CORE) { flyAway('person', { shirt: SKINS[activeSkin].shirt, head: SKINS[activeSkin].head }, player.x, player.y); tornadoKillsPlayer(); }
    else if (d < R) { const p = pull(player, d); player.x += (p.ax * 230 + p.tx * 170) * dt; player.y += (p.ay * 230 + p.ty * 170) * dt; }
  }
  // házak: ha a tornádó közepe a ház fölé ér
  for (const hs of housesIn(T.x - TORNADO_CORE, T.y - TORNADO_CORE, T.x + TORNADO_CORE, T.y + TORNADO_CORE)) {
    const cx = clamp(T.x, hs.x0, hs.x1), cy = clamp(T.y, hs.y0, hs.y1);
    if (Math.hypot(T.x - cx, T.y - cy) < TORNADO_CORE) { flyAway('house', { roof: hs.roof, w: hs.w, d: hs.d }, hs.x, hs.y); destroyHouse(hs); }
  }
}

// Éjszaka mértéke: 0 = nappal, 1 = teljes éjszaka
function nightAmount(t) {
  if (t >= HALF_CYCLE - FADE / 2 && t < HALF_CYCLE + FADE / 2) return (t - (HALF_CYCLE - FADE / 2)) / FADE;
  if (t >= HALF_CYCLE + FADE / 2 && t < CYCLE - FADE / 2) return 1;
  if (t >= CYCLE - FADE / 2) return 1 - (t - (CYCLE - FADE / 2)) / FADE;
  if (t < FADE / 2) return 0.5 - t / FADE;
  return 0;
}

function update(dt) {
  updateStorm(dt);
  if (player.drunk > 0 && !(player.passedOut > 0)) player.drunk = Math.max(0, player.drunk - DRUNK_DECAY * dt);   // józanodás
  updateTornado(dt);
  updateBombs(dt);
  updateArsenal(dt);
  updateNet(dt);
  updateAliens(dt);
  updateWar(dt);
  updateAirforce(dt);
  updateOccupation(dt);
  updateTrains();
  if (player.dead > 0) {
    player.dead -= dt;
    if (player.dead <= 0) respawn(true);
  } else if (player.arrested > 0) {
    player.arrested -= dt;
    if (player.arrested <= 0) respawn();
  } else if (player.abduct) {
    updateAbduct(dt);
  } else if (player.moon) {
    updateMoon(dt);
  } else if (player.passedOut > 0) {
    player.passedOut -= dt;
    if (player.passedOut <= 0) wakeUp();
  } else if (player.inHouse) {
    updateInterior(dt);
    if (player.inHouse && player.inHouse.factory) updateFactory(dt);
    if (player.inHouse && player.inHouse.teacher) updateTeacher(dt);
  } else if (player.riding) {                        // utas: a busszal együtt mozog
    const b = player.riding;
    if (!b.train && (!aiCars.includes(b) || b.wrecked)) { player.riding = null; collide(player); }
    else { player.x = b.x; player.y = b.y; }
  } else if (!player.inCar) {
    updatePlayer(dt);
  }
  updatePlayerShooting(dt);
  const pin = playerCarInput();
  updateCarPhysics(car, pin, dt);
  updateFuel(dt, pin);
  updateDrift(dt);
  updateMission(dt);
  if (player.inCar) { player.x = car.x; player.y = car.y; }
  for (const c of aiCars) updateCarPhysics(c, c.chasing ? policeInput(c, dt) : c.racer ? racerInput(c, dt) : c.taxicab ? taxiInput(c, dt) : aiCarInput(c), dt);
  updateTaxi(dt);
  if (player.riding && controllable()) { player.x = player.riding.x; player.y = player.riding.y; }   // az utas a busz mozgása után kerül a helyére
  updateRace(dt);
  updateWanted(dt);
  carCollisions();
  updateAiFuel(dt);
  updateNpcs(dt);
  updateIndoor(dt);
  updateBullets(dt);
  updateSmoke(dt);
  updateSkidMarks();
  spawnAround(dt);
  if (!player.dead && clock - player.lastHit > 4) player.health = Math.min(100, player.health + (player.inHouse ? 12 : 4) * dt);  // gyógyul (otthon gyorsabban)
  while (popups.length && clock - popups[0].born > 2.5) popups.shift();
}

// ===== Rajzolás =====
function drawCactus(o) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(o.x + 6, o.y + 6, o.r * 1.8, o.r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
  ctx.fillStyle = '#3f8a3a';
  ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-o.r * 2, -4, o.r * 4, 8);
  ctx.beginPath(); ctx.arc(-o.r * 2, 0, 5, 0, Math.PI * 2); ctx.arc(o.r * 2, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2c6628'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, o.r * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawRock(o) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(6, 6, o.r, o.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9c7f62';
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, rr = o.r * (0.75 + 0.25 * Math.sin(i * 3 + o.seed * 10));
    i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b89a7a';
  ctx.beginPath(); ctx.arc(-o.r * 0.25, -o.r * 0.25, o.r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLamp(l, n) {
  ctx.strokeStyle = '#444'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.hx, l.hy); ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(l.x, l.y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = n > 0.2 ? '#fff4c2' : '#888';
  ctx.beginPath(); ctx.arc(l.hx, l.hy, 6, 0, Math.PI * 2); ctx.fill();
}

function drawRoads(view) {
  const xa = view.x0, xb = view.x1, ya = view.y0, yb = view.y1;
  const hRoads = roadsIn(view.y0 - EDGE, view.y1 + EDGE), vRoads = roadsIn(view.x0 - EDGE, view.x1 + EDGE);
  // járdák (az út alatt, így a kereszteződésben az úttest takarja)
  ctx.fillStyle = '#bdb6a8';
  for (const R of hRoads) ctx.fillRect(xa, R - EDGE, xb - xa, EDGE * 2);
  for (const R of vRoads) ctx.fillRect(R - EDGE, ya, EDGE * 2, yb - ya);
  ctx.fillStyle = '#8f887a';                 // járdaszegély és lapok illesztése
  for (const R of hRoads) {
    ctx.fillRect(xa, R - EDGE, xb - xa, 2); ctx.fillRect(xa, R + EDGE - 2, xb - xa, 2);
    ctx.fillRect(xa, R - ROAD_W / 2 - 3, xb - xa, 3); ctx.fillRect(xa, R + ROAD_W / 2, xb - xa, 3);
    for (let i = Math.floor(xa / 40) * 40; i < xb; i += 40) { ctx.fillRect(i, R - EDGE, 1, SIDEWALK_W); ctx.fillRect(i, R + ROAD_W / 2, 1, SIDEWALK_W); }
  }
  for (const R of vRoads) {
    ctx.fillRect(R - EDGE, ya, 2, yb - ya); ctx.fillRect(R + EDGE - 2, ya, 2, yb - ya);
    ctx.fillRect(R - ROAD_W / 2 - 3, ya, 3, yb - ya); ctx.fillRect(R + ROAD_W / 2, ya, 3, yb - ya);
    for (let i = Math.floor(ya / 40) * 40; i < yb; i += 40) { ctx.fillRect(R - EDGE, i, SIDEWALK_W, 1); ctx.fillRect(R + ROAD_W / 2, i, SIDEWALK_W, 1); }
  }
  ctx.fillStyle = '#4a4a4a';
  for (const R of hRoads) ctx.fillRect(xa, R - ROAD_W / 2, xb - xa, ROAD_W);
  for (const R of vRoads) ctx.fillRect(R - ROAD_W / 2, ya, ROAD_W, yb - ya);
  ctx.fillStyle = '#d8d8d8';
  for (const R of hRoads) { ctx.fillRect(xa, R - ROAD_W / 2 + 6, xb - xa, 3); ctx.fillRect(xa, R + ROAD_W / 2 - 9, xb - xa, 3); }
  for (const R of vRoads) { ctx.fillRect(R - ROAD_W / 2 + 6, ya, 3, yb - ya); ctx.fillRect(R + ROAD_W / 2 - 9, ya, 3, yb - ya); }
  ctx.fillStyle = '#f2c230';
  for (const R of hRoads) {
    for (let i = Math.floor(xa / 80) * 80; i < xb; i += 80) if (Math.abs(i - nearestRoad(i)) > EDGE + 10) ctx.fillRect(i, R - 2, 40, 4);
  }
  for (const R of vRoads) {
    for (let i = Math.floor(ya / 80) * 80; i < yb; i += 80) if (Math.abs(i - nearestRoad(i)) > EDGE + 10) ctx.fillRect(R - 2, i, 4, 40);
  }
  // sebességkorlát-táblák a jobb oldali járdán
  const sign = (x, y) => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d01010'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = `bold ${SPEED_LIMIT > 99 ? 8 : 10}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(String(SPEED_LIMIT), x, y + 3); ctx.textAlign = 'left';
  };
  for (const R of hRoads) for (let i = Math.floor(xa / 1000) * 1000 + 500; i < xb; i += 1000) { sign(i, R + ROAD_W / 2 + 36); sign(i + 60, R - ROAD_W / 2 - 36); }
  for (const R of vRoads) for (let i = Math.floor(ya / 1000) * 1000 + 500; i < yb; i += 1000) { sign(R - ROAD_W / 2 - 36, i); sign(R + ROAD_W / 2 + 36, i + 60); }
  // zebrák a kereszteződésekben, ahol a járda átvezet az úttesten
  ctx.fillStyle = '#f0f0f0';
  for (const H of hRoads) {
    for (const V of vRoads) {
      for (const s of [-1, 1]) {
        const y0 = s < 0 ? H - EDGE + 6 : H + ROAD_W / 2 + 6;     // a függőleges úton át
        for (let x = V - ROAD_W / 2 + 6; x < V + ROAD_W / 2 - 6; x += 20) ctx.fillRect(x, y0, 10, SIDEWALK_W - 12);
        const x0 = s < 0 ? V - EDGE + 6 : V + ROAD_W / 2 + 6;     // a vízszintes úton át
        for (let y = H - ROAD_W / 2 + 6; y < H + ROAD_W / 2 - 6; y += 20) ctx.fillRect(x0, y, SIDEWALK_W - 12, 10);
      }
    }
  }
}

function drawStation(st, n) {
  const r = st.rect, b = st.building, c = st.canopy;
  ctx.fillStyle = '#a7a296'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);          // beton
  ctx.strokeStyle = '#7d786c'; ctx.lineWidth = 2; ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  ctx.fillStyle = 'rgba(255,138,31,0.18)'; ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);   // tankolósáv
  ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2; ctx.strokeRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  for (const p of st.pumps) {
    ctx.fillStyle = '#333'; ctx.fillRect(p.x - 9, p.y - 13, 18, 26);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(p.x - 9, p.y - 13, 18, 7);
    ctx.fillStyle = n > 0.2 ? '#bfffbf' : '#7c7'; ctx.fillRect(p.x - 5, p.y - 2, 10, 6);
  }
  ctx.fillStyle = '#eee6d2'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);           // bolt
  ctx.fillStyle = '#d03030'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, 12);
  ctx.fillStyle = n > 0.2 ? '#ffe9a0' : '#9cc4e0'; ctx.fillRect(b.x0 + 20, b.y0 + 22, b.x1 - b.x0 - 40, 12);
  ctx.fillStyle = '#d03030'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⛽ BENZIN', (b.x0 + b.x1) / 2, b.y1 - 10);
  ctx.fillStyle = '#ff8a1f'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`$${FUEL_PRICE}/%`, st.sign.x, st.sign.y);
  ctx.textAlign = 'left';
}

function drawMissionMarker() {
  if (!mission.active) return;
  const pulse = 1 + 0.15 * Math.sin(clock * 6);
  ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mission.tx, mission.ty, 50 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,58,0.25)';
  ctx.beginPath(); ctx.arc(mission.tx, mission.ty, 50 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('📦', mission.tx, mission.ty + 8); ctx.textAlign = 'left';
}

function drawHungarianFlag(x, y) {
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();      // zászlórúd
  const wave = Math.sin(clock * 4 + x * 0.01) * 2;
  for (let i = 0; i < 3; i++) {                                                               // piros, fehér, zöld csík
    ctx.fillStyle = HU_FLAG[i];
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 18 + i * 6); ctx.lineTo(x + 30, y - 18 + i * 6 + wave);
    ctx.lineTo(x + 30, y - 12 + i * 6 + wave); ctx.lineTo(x + 2, y - 12 + i * 6); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y - 18, 28, 18);
}

// felhőkarcoló: a talpa itt, a magas teste a tetejével a többi dolog FÖLÖTT (drawSkyTop) – látszik a magassága (parallaxis)
function drawSkyTop(hs) {
  const { x0, y0, x1, y1 } = hs, Ht = hs.floors * 5, d = Math.hypot(hs.x - lastCam.x, hs.y - lastCam.y) || 1;
  const k = Math.min(Ht * 0.7, d * 0.22 * (Ht / 120)), ox = (hs.x - lastCam.x) / d * k, oy = (hs.y - lastCam.y) / d * k;   // a tető a kamerától „elhajlik”
  const b = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r = b.map(([x, y]) => [x + ox, y + oy]);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 1; i < 4; i++) ctx.lineTo(b[i][0] + ox * 0.6 + 14, b[i][1] + oy * 0.6 + 14); ctx.fill();   // árnyék
  for (let i = 0; i < 4; i++) {                                                      // oldallapok: sötétebb-világosabb, ablaksorokkal
    const a = b[i], c = b[(i + 1) % 4], ar = r[i], cr = r[(i + 1) % 4];
    ctx.fillStyle = ['#3e4856', '#566272', '#47525f', '#626f80'][i]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(cr[0], cr[1]); ctx.lineTo(ar[0], ar[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,255,0.35)'; ctx.lineWidth = 1.2;
    for (let f = 1; f < Math.min(hs.floors, 18); f++) { const t = f / Math.min(hs.floors, 18); ctx.beginPath(); ctx.moveTo(a[0] + ox * t, a[1] + oy * t); ctx.lineTo(c[0] + ox * t, c[1] + oy * t); ctx.stroke(); }
  }
  ctx.fillStyle = '#9aa6b4'; ctx.beginPath(); ctx.moveTo(r[0][0], r[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(r[i][0], r[i][1]); ctx.closePath(); ctx.fill();   // tető
  ctx.strokeStyle = '#2c3440'; ctx.lineWidth = 2; ctx.stroke();
  const cx = hs.x + ox, cy = hs.y + oy;
  if (hs.floors > 32) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('H', cx, cy + 6); ctx.textAlign = 'left'; }   // helikopter-leszállóhely
  else { ctx.fillStyle = '#5c6877'; ctx.fillRect(cx - 14, cy - 10, 28, 20); }                                                                    // gépház
  if (hs.floors > 40) { ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ox * 0.4, cy + oy * 0.4 - 30); ctx.stroke(); ctx.fillStyle = Math.floor(clock * 2) % 2 ? '#f33' : '#600'; ctx.beginPath(); ctx.arc(cx + ox * 0.4, cy + oy * 0.4 - 30, 4, 0, Math.PI * 2); ctx.fill(); }   // antenna villogó fénnyel
}
function drawHouse(hs, n) {
  const { x0, y0, x1, y1 } = hs, h = hs.axis === 'h';
  if (hs.sky) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0 + 9, y0 + 9, x1 - x0, y1 - y0); ctx.fillStyle = '#2f3742'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); return; }   // talp; a teste később
  ctx.fillStyle = '#6b4a2e';                                                            // bejárati ajtó
  if (h) ctx.fillRect(hs.along - 10, hs.side > 0 ? y0 - 3 : y1 - 3, 20, 6); else ctx.fillRect(hs.side > 0 ? x0 - 3 : x1 - 3, hs.along - 10, 6, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x0 + 7, y0 + 7, x1 - x0, y1 - y0);   // árnyék
  // bejárati út a járdáig
  ctx.fillStyle = '#b9b2a2';
  if (h) { const yy = hs.side > 0 ? y0 - HOUSE_GAP : y1; ctx.fillRect(hs.along - 9, yy, 18, HOUSE_GAP); }
  else { const xx = hs.side > 0 ? x0 - HOUSE_GAP : x1; ctx.fillRect(xx, hs.along - 9, HOUSE_GAP, 18); }
  // nyeregtető: a gerinc az úttal párhuzamos, a két fele eltérő árnyalatú
  ctx.fillStyle = hs.roof; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';                                                  // a tető túlsó fele árnyékos
  if (h) ctx.fillRect(x0, (y0 + y1) / 2, x1 - x0, (y1 - y0) / 2); else ctx.fillRect((x0 + x1) / 2, y0, (x1 - x0) / 2, y1 - y0);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.beginPath();                                                                     // tetőgerinc
  if (h) { ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); } else { ctx.moveTo((x0 + x1) / 2, y0); ctx.lineTo((x0 + x1) / 2, y1); }
  ctx.stroke();
  if (hs.bank || hs.factory) {                                                         // bank / gyár: tető és cégtábla
    ctx.fillStyle = hs.bank ? 'rgba(60,80,120,0.9)' : 'rgba(110,110,115,0.92)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(hs.x - 42, hs.y - 11, 84, 22);
    ctx.fillStyle = hs.bank ? '#9fd8ff' : '#ffd23a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(hs.bank ? '🏦 BANK' : '🏭 GYÁR', hs.x, hs.y + 5); ctx.textAlign = 'left';
  }
  if (hs.pub) {                                                                        // kocsma: zöld tető, cégtábla
    ctx.fillStyle = 'rgba(30,90,40,0.85)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#2b1a0e'; ctx.fillRect(hs.x - 42, hs.y - 11, 84, 22);
    ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🍺 KOCSMA', hs.x, hs.y + 5); ctx.textAlign = 'left';
  }
  if (hs.restaurant || hs.mechanic || hs.phoneShop) {                                  // étterem / szerelő / telefonbolt: tető és cégtábla
    ctx.fillStyle = hs.restaurant ? 'rgba(200,90,40,0.9)' : hs.phoneShop ? 'rgba(20,110,150,0.92)' : 'rgba(60,70,80,0.92)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#1a1410'; ctx.fillRect(hs.x - 60, hs.y - 11, 120, 22);
    ctx.fillStyle = hs.restaurant ? '#ffd8a0' : hs.phoneShop ? '#8fe8ff' : '#9fd8ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(hs.restaurant ? '🍽 ÉTTEREM' : hs.phoneShop ? '📱 TELEFONBOLT' : '🔧 AUTÓSZERELŐ', hs.x, hs.y + 5); ctx.textAlign = 'left';
  }
  if (hs.school) {                                                                     // iskola: sárga tető, cégtábla
    ctx.fillStyle = 'rgba(200,160,40,0.9)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#2a2010'; ctx.fillRect(hs.x - 48, hs.y - 11, 96, 22);
    ctx.fillStyle = '#ffe680'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏫 ISKOLA', hs.x, hs.y + 5); ctx.textAlign = 'left';
  }
  if (hs.shop) {                                                                       // bolt: lila tető, cégtábla
    ctx.fillStyle = 'rgba(110,60,140,0.88)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#1e1028'; ctx.fillRect(hs.x - 42, hs.y - 11, 84, 22);
    ctx.fillStyle = '#e6c8ff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🛒 BOLT', hs.x, hs.y + 5); ctx.textAlign = 'left';
  }
  // kémény
  const cx = x0 + (x1 - x0) * (0.2 + hs.chimney * 0.6), cy = y0 + (y1 - y0) * (0.2 + (1 - hs.chimney) * 0.6);
  ctx.fillStyle = '#5a4a40'; ctx.fillRect(cx - 6, cy - 6, 12, 12);
  ctx.fillStyle = '#222'; ctx.fillRect(cx - 3, cy - 3, 6, 6);
  if (n > 0.2) {                                                                       // éjszaka világító tetőablak
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(h ? hs.along + 20 : cx - 4, h ? cy - 4 : hs.along + 20, 8, 8);
  }
}

function drawRubble(hs) {
  ctx.fillStyle = '#9b9488'; ctx.fillRect(hs.x0, hs.y0, hs.x1 - hs.x0, hs.y1 - hs.y0);     // alapozás
  ctx.strokeStyle = '#6d665b'; ctx.lineWidth = 2; ctx.strokeRect(hs.x0, hs.y0, hs.x1 - hs.x0, hs.y1 - hs.y0);
  ctx.fillStyle = hs.roof;                                                                 // törmelék
  for (let i = 0; i < 9; i++) {
    const u = (Math.sin(i * 12.9898 + hs.x) * 43758.5453) % 1, v = (Math.sin(i * 78.233 + hs.y) * 12345.678) % 1;
    ctx.fillRect(hs.x0 + Math.abs(u) * (hs.x1 - hs.x0 - 12), hs.y0 + Math.abs(v) * (hs.y1 - hs.y0 - 8), 12, 8);
  }
}

function drawTornado() {
  const T = tornado;
  if (!T) return;
  const P = T.power;
  const g = ctx.createRadialGradient(T.x, T.y, 0, T.x, T.y, TORNADO_R * P);          // por a talajon
  g.addColorStop(0, `rgba(120,95,60,${0.45 * P})`); g.addColorStop(1, 'rgba(120,95,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(T.x, T.y, TORNADO_R * P, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 26; i++) {                                                        // spirál tölcsér
    const a = T.spin * (1 + i * 0.04) + i * 0.55, r = (14 + i * 7) * P;
    ctx.fillStyle = `rgba(${150 - i * 2},${120 - i * 2},${85 - i * 2},${(0.55 - i * 0.015) * P})`;
    ctx.beginPath(); ctx.arc(T.x + Math.cos(a) * r, T.y + Math.sin(a) * r, (12 + i * 1.6) * P, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = `rgba(60,48,35,${0.8 * P})`; ctx.beginPath(); ctx.arc(T.x, T.y, 26 * P, 0, Math.PI * 2); ctx.fill();
  for (const f of T.flying) {                                                           // a felszippantott dolgok körbe-körbe, egyre feljebb
    const r = 50 + f.t * 70, x = T.x + Math.cos(f.ang) * r, y = T.y + Math.sin(f.ang) * r, sc = 1 + f.t * 0.5;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - f.t / 3); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(f.ang * 2);
    if (f.kind === 'car') { const fc = makeCar(0, 0, 0, f.data.color); Object.assign(fc, { len: f.data.len, wid: f.data.wid, type: f.data.type }); drawCar(fc, 0); }
    else if (f.kind === 'person') drawPerson(0, 0, 0, 0, f.data.shirt, f.data.head, false);
    else { ctx.fillStyle = f.data.roof; ctx.fillRect(-f.data.w / 2, -f.data.d / 2, f.data.w, f.data.d); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(-f.data.w / 2, -f.data.d / 2, f.data.w, f.data.d); }
    ctx.restore();
  }
}

// a szoba helye a képernyőn: lehetőleg a bal felső panel alatt; alacsony ablakban kicsinyítve, hogy az ajtó
// (a szoba alja) és a lenti felirat (h − 40) is mindig látsszon
function roomLayout(w, h) {
  const sc = Math.min(1, (h - 130) / ROOM_H, (w - 40) / ROOM_W);
  const oy = Math.round(clamp(h - 70 - ROOM_H * sc, 40, 275));
  return { sc, ox: Math.round((w - ROOM_W * sc) / 2), oy };
}

function applyDrunkSway(w, h) {
  const dk = drunkK();
  if (dk > 0) { ctx.translate(w / 2, h / 2); ctx.rotate(Math.sin(clock * 1.3) * 0.05 * dk); ctx.scale(1 + 0.03 * dk * Math.sin(clock * 2.1), 1); ctx.translate(-w / 2, -h / 2); }
}

function drawInterior(w, h) {
  const H = player.inHouse, L = roomLayout(w, h), ox = L.ox, oy = L.oy;
  ctx.fillStyle = '#1a1612'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(L.sc, L.sc);
  ctx.fillStyle = H.hs.pub ? '#7a5030' : '#b07a4a'; ctx.fillRect(0, 0, ROOM_W, ROOM_H);                         // fapadló
  ctx.strokeStyle = 'rgba(80,45,20,0.35)'; ctx.lineWidth = 1;
  for (let y = 18; y < ROOM_H; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ROOM_W, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(150,40,40,0.55)'; ctx.fillRect(ROOM_W / 2 - 110, ROOM_H / 2 - 60, 220, 130);   // szőnyeg
  for (const f of H.furniture) {
    const c = { bed: '#e8e2d6', wardrobe: '#6b4a2e', table: '#8a5a32', kitchen: '#cfd3d6', sofa: '#3e6a8a', tv: '#151515', plant: '#3a8a3a', board: '#1f3a2a', tdesk: '#6b4a2e', desk: '#b08a5a',
      rcounter: '#7a4a2a', rtable: '#f2f2f2', lift: '#555', tools: '#c02020', tires: '#222', ptable: '#243b55' }[f.k];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(f.x + 4, f.y + 4, f.w, f.h);
    ctx.fillStyle = c; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(f.x, f.y, f.w, f.h);
    if (f.k === 'bed') { ctx.fillStyle = '#fff'; ctx.fillRect(f.x + 6, f.y + 6, f.w * 0.25, f.h - 12); ctx.fillStyle = '#4a7ab0'; ctx.fillRect(f.x + f.w * 0.35, f.y + 4, f.w * 0.6, f.h - 8); }
    if (f.k === 'kitchen') { ctx.fillStyle = '#8a9096'; ctx.fillRect(f.x + 4, f.y + 20, f.w - 8, 26); }
    if (f.k === 'tv') { ctx.fillStyle = '#2a5a8a'; ctx.fillRect(f.x + 4, f.y + 3, f.w - 8, f.h - 6); }
    if (f.k === 'bar') {                                                                // pult poharakkal, csapokkal
      ctx.fillStyle = '#5a3418'; ctx.fillRect(f.x, f.y + f.h - 10, f.w, 10);
      for (let x = f.x + 20; x < f.x + f.w - 10; x += 40) { ctx.fillStyle = '#d8b04a'; ctx.fillRect(x, f.y + 8, 6, 14); ctx.fillStyle = '#c0203a'; ctx.fillRect(x + 14, f.y + 10, 5, 12); }
    }
    if (f.k === 'counter') { ctx.fillStyle = '#2f4a6a'; ctx.fillRect(f.x, f.y + f.h - 10, f.w, 10); ctx.fillStyle = '#9fd8ff'; for (let x = f.x + 30; x < f.x + f.w; x += 90) ctx.fillRect(x, f.y + 6, 40, 18); }
    if (f.k === 'ptable') { ctx.fillStyle = '#243b55'; ctx.fillRect(f.x, f.y, f.w, f.h); for (let x = f.x + 14; x < f.x + f.w - 14; x += 30) { ctx.fillStyle = '#111'; ctx.fillRect(x, f.y + 8, 16, 24); ctx.fillStyle = '#7fe0ff'; ctx.fillRect(x + 2, f.y + 10, 12, 18); } }   // kiállított telefonok
    if (f.k === 'rtable') { ctx.fillStyle = '#e05a5a'; ctx.fillRect(f.x + 6, f.y + 6, f.w - 12, f.h - 12); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 8, 0, Math.PI * 2); ctx.fill(); }   // kockás terítő, tányér
    if (f.k === 'rcounter') { ctx.fillStyle = '#ddd'; for (let x = f.x + 30; x < f.x + f.w - 20; x += 70) { ctx.beginPath(); ctx.arc(x, f.y + 20, 9, 0, Math.PI * 2); ctx.fill(); } }
    if (f.k === 'lift') {                                                                // emelő: rajta egy autó a te színeddel
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(f.x, f.y, 8, f.h); ctx.fillRect(f.x + f.w - 8, f.y, 8, f.h);
      ctx.fillStyle = car.color[0]; ctx.beginPath(); ctx.roundRect(f.x + 40, f.y + 20, 70, 130, 10); ctx.fill();
      ctx.fillStyle = '#7fb6d9'; ctx.fillRect(f.x + 48, f.y + 34, 54, 14);
    }
    if (f.k === 'tools') { ctx.fillStyle = '#999'; for (let y = f.y + 10; y < f.y + f.h - 10; y += 22) ctx.fillRect(f.x + 6, y, f.w - 12, 4); }
    if (f.k === 'tires') { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 8, 0, Math.PI * 2); ctx.fill(); }
    if (f.k === 'tv' && tv.on) { ctx.fillStyle = ['#3a7aff', '#ff8fc8', '#3ac050', '#f2c230'][tv.ch]; ctx.fillRect(f.x + 4, f.y + 3, f.w - 8, f.h - 6); }   // bekapcsolt tévé fénye
    if (f.k === 'board') { ctx.fillStyle = '#eee'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('2 + 2 = 4   ·   3 × 3 = 9', f.x + f.w / 2, f.y + 13); ctx.textAlign = 'left'; }
    if (f.k === 'desk') { ctx.fillStyle = '#555'; ctx.fillRect(f.x + f.w / 2 - 8, f.y + f.h + 4, 16, 12); }   // szék
    if (f.k === 'shopcounter') { ctx.fillStyle = '#5a3a6a'; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.fillStyle = '#ddd'; ctx.fillRect(f.x + f.w - 70, f.y + 8, 40, 26); }   // pult kasszával
    if (f.k === 'shelf') {                                                              // polc színes árukkal
      ctx.fillStyle = '#7a6a5a'; ctx.fillRect(f.x, f.y, f.w, f.h);
      const cols = ['#e05a5a', '#f2c230', '#5ab0e0', '#7f7', '#c9f'];
      for (let y = f.y + 4, k = 0; y < f.y + f.h - 8; y += 12) for (let x = f.x + 4; x < f.x + f.w - 8; x += 12, k++) { ctx.fillStyle = cols[k % cols.length]; ctx.fillRect(x, y, 8, 8); }
    }
    if (f.k === 'vault') { ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(f.x + f.w / 2 - 2, f.y + f.h / 2 - 16, 4, 32); }
    if (f.k === 'belt') { ctx.fillStyle = '#333'; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.fillStyle = '#555'; for (let x = f.x + ((clock * BELT_SPEED) % 20); x < f.x + f.w; x += 20) ctx.fillRect(x, f.y, 3, f.h); }
    if (f.k === 'box') {
      const i = factoryBoxes().indexOf(f), cnt = H.factory ? H.factory.boxes[i] : 0;
      ctx.fillStyle = '#c8a06a'; ctx.fillRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
      ctx.fillStyle = '#5a3a1a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${cnt}/${BOX_SIZE}`, f.x + f.w / 2, f.y + f.h / 2 + 5); ctx.textAlign = 'left';
    }
    if (f.k === 'stool') { ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, 0, Math.PI * 2); ctx.fill(); }
    if (f.k === 'radio') {                                                              // rádió: hangszóró, antenna
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#c9a45a'; ctx.beginPath(); ctx.arc(f.x + 10, f.y + f.h / 2, 6, 0, Math.PI * 2); ctx.arc(f.x + f.w - 10, f.y + f.h / 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x + f.w - 4, f.y); ctx.lineTo(f.x + f.w + 8, f.y - 14); ctx.stroke();
      if (radio.playing) {
        ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        for (let k = 0; k < 3; k++) { const t = (clock * 0.8 + k / 3) % 1; ctx.globalAlpha = 1 - t; ctx.fillText(k % 2 ? '♫' : '♪', f.x + f.w / 2 + Math.sin(t * 6 + k) * 10, f.y + f.h + 14 + t * 40); }
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
    }
    if (f.k === 'plant') { ctx.fillStyle = '#5ab05a'; ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = '#e8dcc6'; ctx.lineWidth = ROOM_WALL; ctx.strokeRect(ROOM_WALL / 2, ROOM_WALL / 2, ROOM_W - ROOM_WALL, ROOM_H - ROOM_WALL);   // falak
  ctx.fillStyle = '#6b4a2e'; ctx.fillRect(ROOM_W / 2 - 34, ROOM_H - ROOM_WALL, 68, ROOM_WALL);                                  // ajtó
  indoor.filter(e => e.hs.id === H.hs.id).forEach((e, i) => {                          // az épületben lévő városlakók: ügyfelek sorban, dolgozók a pult / terem mellett
    const x = e.work ? (i % 2 ? 90 : 470) : 190 + (i % 3) * 90, y = e.work ? 100 + (i % 3) * 55 : 150 + ((i / 3) | 0) * 36;
    drawPerson(x, y, e.work ? Math.PI / 2 : -Math.PI / 2, 0, e.p.shirt, e.p.head, false, e.p.legs || '#2b2b4a');
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.work ? '💼' : '🛍', x, y - 18); ctx.textAlign = 'left';
  });
  if (H.teacher) {                                                                     // gonosz tanár: lila ruha, ősz konty, szemüveg
    const T = H.teacher;
    drawPerson(T.x, T.y, T.angle, T.walk, '#4a2060', '#bbb', false, '#222', null, null);
    ctx.save(); ctx.translate(T.x, T.y); ctx.rotate(T.angle);
    ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(-4, 0, 3.5, 0, Math.PI * 2); ctx.fill();                      // konty
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(5, -2.6, 1.8, 0, Math.PI * 2); ctx.moveTo(6.8, 2.6); ctx.arc(5, 2.6, 1.8, 0, Math.PI * 2); ctx.stroke();   // szemüveg
    ctx.restore();
    ctx.fillStyle = T.chase ? '#f22' : '#fff'; ctx.font = T.chase ? 'bold 18px sans-serif' : 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(T.chase ? `😡 ${SHOUT}` : '😒', T.x, T.y - 22); ctx.textAlign = 'left';
  }
  if (H.factory) for (const b of H.factory.bags) { ctx.fillStyle = b.color; ctx.fillRect(b.x - 8, BELT.y + 8, 16, 24); ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 5, BELT.y + 16, 10, 4); }
  const sk = SKINS[activeSkin];
  drawPerson(H.ix, H.iy, player.angle, player.walk, sk.shirt, sk.head, false, sk.legs, sk.hat, sk.pattern);
  if (H.factory && H.factory.carrying) { ctx.fillStyle = '#f2c230'; ctx.fillRect(H.ix + 8, H.iy - 18, 14, 20); }
  ctx.restore();
  ctx.fillStyle = '#7df'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(H.hs.restaurant ? '🍽 Étteremben vagy – a pultnál E: rendelés' : H.hs.mechanic ? '🔧 Autószerelő – a pultnál E (az autód a műhely előtt legyen)' : H.hs.phoneShop ? '📱 Telefonbolt – a pultnál E: telefonvásárlás' : H.hs.school ? '🏫 Iskola – a táblánál E: óra · 👩‍🏫 ne rohangálj!' : H.hs.shop ? '🛒 Boltban vagy – a pultnál E: vásárlás' : H.hs.bank ? '🏦 Bankban vagy – a pultnál E: hitel vagy törlesztés' : H.hs.factory ? `🏭 Gyár – fizetés $${FACTORY_WAGE}/perc · következő: ${Math.ceil(WAGE_PERIOD - H.factory.shift)} mp · ebben a percben bepakolva: ${H.factory.minutePacked}` : H.hs.pub ? `🍺 Kocsmában vagy – a pultnál ihatsz: sör $${BEER_PRICE}, bor $${WINE_PRICE}` : '🏠 Bent vagy a házban – itt nem talál meg a rendőrség, és gyorsabban gyógyulsz', w / 2, oy - 14);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 16px sans-serif';
  if (radio.playing && radio.ac && radio.ac.state === 'suspended') ctx.fillText('🔇 A böngésző lenémította a hangot – kattints vagy nyomj meg egy gombot', w / 2, oy + 24);
  ctx.fillText(radio.playing && radio.song ? `📻 Most szól: ${radio.song.name} (${radio.song.scaleName}, ${radio.song.bpm} BPM) · R: következő szám · M: rádió ki`
    : '📻 A rádió ki van kapcsolva · M: bekapcsolás', w / 2, Math.min(h - 62, oy + ROOM_H * L.sc + 22));
  ctx.textAlign = 'left';
}

function drawParkingLot(l) {
  ctx.fillStyle = '#55575b'; ctx.fillRect(l.x0, l.y0, l.x1 - l.x0, l.y1 - l.y0);                // aszfalt
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2;
  const h = l.bs.axis === 'h';
  for (let i = 0; i <= 4; i++) {                                                              // parkolóhelyek
    ctx.beginPath();
    if (h) { const x = l.x0 + 25 + i * 50 - 25; ctx.moveTo(x, l.y0 + 10); ctx.lineTo(x, l.y1 - 10); }
    else { const y = l.y0 + 25 + i * 50 - 25; ctx.moveTo(l.x0 + 10, y); ctx.lineTo(l.x1 - 10, y); }
    ctx.stroke();
  }
  ctx.fillStyle = '#7f7'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`🔑 AUTÓBÉRLÉS $${RENT_PRICE}`, (l.x0 + l.x1) / 2, h ? (l.bs.side > 0 ? l.y1 - 4 : l.y0 + 14) : l.y0 + 14);
  ctx.textAlign = 'left';
  if (!rentedLots.has(l.key)) {
    const rc = makeCar(l.spot.x, l.spot.y, l.spot.angle, RENTAL_MODEL.color);
    applyCarModel(rc, RENTAL_MODEL);
    drawCar(rc, 0);
  }
}

function drawBusStop(bs) {
  const h = bs.axis === 'h', w = h ? 56 : 16, hh = h ? 16 : 56;
  ctx.fillStyle = 'rgba(40,90,200,0.85)'; ctx.fillRect(bs.x - w / 2, bs.y - hh / 2, w, hh);       // fedett váró
  ctx.fillStyle = 'rgba(170,210,255,0.6)'; ctx.fillRect(bs.x - w / 2 + 3, bs.y - hh / 2 + 3, w - 6, hh - 6);
  const sx = h ? bs.x + 36 : bs.x, sy = h ? bs.y : bs.y + 36;                                    // megállótábla
  ctx.fillStyle = '#1d4fc0'; ctx.fillRect(sx - 9, sy - 9, 18, 18);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🚌', sx, sy + 5);
  // sárga felfestés a megállóhelynél az úton
  const lx = h ? bs.along : bs.road - bs.dir * 40, ly = h ? bs.road + bs.dir * 40 : bs.along;
  ctx.strokeStyle = 'rgba(242,194,48,0.8)'; ctx.lineWidth = 3;
  if (h) ctx.strokeRect(lx - 70, ly - 22, 140, 44); else ctx.strokeRect(lx - 22, ly - 70, 44, 140);
  ctx.fillStyle = 'rgba(242,194,48,0.9)'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BUSZ', lx, ly + 5); ctx.textAlign = 'left';
}

function drawCheckerRing(x, y, r, label) {
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = i % 2 ? '#111' : '#fff'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x, y, r, i / 16 * Math.PI * 2, (i + 1) / 16 * Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#7df'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 7); ctx.textAlign = 'left';
}

function drawRaceMarkers() {
  if (race.state === 'idle' && race.offer) drawCheckerRing(race.offer.x, race.offer.y, 70 + 6 * Math.sin(clock * 5), '🏁 RAJT');
  if (race.state === 'running' || race.state === 'countdown') {
    const n = race.route.length, t = race.route[race.cp];
    if (race.cp === n - 1) drawCheckerRing(t.x, t.y, 90, '🏁 CÉL');
    else {
      ctx.strokeStyle = '#7df'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(t.x, t.y, 90 + 5 * Math.sin(clock * 6), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#7df'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${race.cp + 1}/${n}`, t.x, t.y + 8); ctx.textAlign = 'left';
    }
  }
}

// a képernyő szélén nyíl mutat egy képen kívüli célpont felé
function drawEdgeArrow(wx, wy, color, label, w, h) {
  const sx = wx - lastCam.x + w / 2, sy = wy - lastCam.y + h / 2;
  if (sx > 30 && sx < w - 30 && sy > 30 && sy < h - 30) return;
  const ang = Math.atan2(sy - h / 2, sx - w / 2);
  const k = Math.min((w / 2 - 50) / Math.abs(Math.cos(ang) || 1e-6), (h / 2 - 50) / Math.abs(Math.sin(ang) || 1e-6));
  const ax = w / 2 + Math.cos(ang) * k, ay = h / 2 + Math.sin(ang) * k;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
  ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, ax - Math.cos(ang) * 30, ay - Math.sin(ang) * 30 + 4); ctx.textAlign = 'left';
}

function drawSkidMarks(view) {
  // halványodó nyomok: átlátszóság szerint 8 csoportban rajzoljuk ki
  const BUCKETS = 8;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let b = 0; b < BUCKETS; b++) {
    ctx.strokeStyle = `rgba(25,20,15,${0.35 * (1 - b / BUCKETS)})`;
    ctx.beginPath();
    for (const m of skidMarks) {
      if (Math.min(BUCKETS - 1, Math.floor((clock - m.born) / SKID_LIFE * BUCKETS)) !== b) continue;
      if (m.x2 < view.x0 || m.x2 > view.x1 || m.y2 < view.y0 || m.y2 > view.y1) continue;
      ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2);
    }
    ctx.stroke();
  }
}

function drawSmoke() {
  for (const p of smoke) {
    const a = 0.45 * (1 - p.life / p.max);
    ctx.fillStyle = p.dark ? `rgba(70,70,70,${a})` : `rgba(225,222,215,${a})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHorse(c, wild) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  const [body, dark] = c.color, t = clock * (wild ? 1.5 : Math.hypot(c.vx || 0, c.vy || 0) / 40), step = Math.sin(t * 6) * 5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 4, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark;                                                                     // lábak (futáskor lengnek)
  for (const [lx, ly, ph] of [[-16, -8, 1], [-16, 8, -1], [14, -8, -1], [14, 8, 1]]) ctx.fillRect(lx + step * ph, ly - 2, 9, 4);
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2); ctx.fill();   // törzs
  ctx.beginPath(); ctx.ellipse(28, wild ? 2 + Math.sin(clock * 0.7 + c.x) * 3 : 0, 11, 6, 0, 0, Math.PI * 2); ctx.fill();   // fej
  ctx.fillStyle = dark; ctx.fillRect(14, -3, 12, 6);                                        // sörény
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-38, 3 + Math.sin(t * 4) * 3); ctx.lineTo(-26, 4); ctx.closePath(); ctx.fill();   // farok
  ctx.beginPath(); ctx.arc(32, -3, 1.5, 0, Math.PI * 2); ctx.arc(32, 3, 1.5, 0, Math.PI * 2); ctx.fill();
  if (!wild) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-4, -9, 10, 18); }                    // nyereg
  ctx.restore();
  if (!wild && c === car && player.inCar) {                                                   // a lovas te vagy, a szkineddel
    const sk = SKINS[activeSkin];
    drawPerson(c.x - Math.cos(c.angle) * 2, c.y - Math.sin(c.angle) * 2, c.angle, 0, sk.shirt, sk.head, false, sk.legs, sk.hat, sk.pattern);
  }
}
function drawBike(c) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-18, -3, 40, 8);
  ctx.fillStyle = '#111'; ctx.fillRect(-20, -2.5, 12, 5); ctx.fillRect(8, -2.5, 12, 5);        // kerekek
  ctx.fillStyle = c.color[0]; ctx.fillRect(-12, -1.5, 24, 3);                                   // váz
  ctx.fillStyle = '#ccc'; ctx.fillRect(10, -9, 3, 18);                                          // kormány
  ctx.restore();
  if (c === car && player.inCar) {                                                               // a biciklis te vagy, a szkineddel
    const sk = SKINS[activeSkin];
    drawPerson(c.x, c.y, c.angle, 0, sk.shirt, sk.head, false, sk.legs, sk.hat, sk.pattern);
  }
}
function drawCar(c, n) {
  if (c.type === 'plane') { drawPlane(c, true); return; }
  if (c.ai && c.ai.pit && c.ai.pit.phase === 'fill') { ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⛽', c.x, c.y - 30); ctx.textAlign = 'left'; }   // tankol
  if (c.type === 'bike') { drawBike(c); return; }
  if (c.type === 'horse') { drawHorse(c, false); return; }
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  const L = c.len, W = c.wid;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L / 2 + 5, -W / 2 + 5, L, W);
  ctx.fillStyle = '#111';
  for (const [x, y] of [[-L / 3, -W / 2 - 3], [L / 4, -W / 2 - 3], [-L / 3, W / 2 - 3], [L / 4, W / 2 - 3]]) ctx.fillRect(x - 8, y, 16, 6);
  ctx.fillStyle = c.wrecked ? '#3a3a3a' : c.color[0];
  ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 8); ctx.fill();
  ctx.fillStyle = c.wrecked ? '#2a2a2a' : c.color[1]; ctx.fillRect(-L / 2 + 10, -W / 2 + 4, L - 26, W - 8);
  ctx.fillStyle = c.wrecked ? '#445' : '#7fb6d9';
  ctx.fillRect(L / 2 - 26, -W / 2 + 5, 10, W - 10);    // szélvédő
  ctx.fillRect(-L / 2 + 8, -W / 2 + 6, 6, W - 12);     // hátsó ablak
  ctx.fillStyle = c.wrecked ? '#333' : n > 0.2 ? '#fffbe0' : '#f5f0c8';
  ctx.fillRect(L / 2 - 4, -W / 2 + 3, 4, 7); ctx.fillRect(L / 2 - 4, W / 2 - 10, 4, 7);
  ctx.fillStyle = c.braking && !c.wrecked ? '#ff3030' : '#801010';
  ctx.fillRect(-L / 2, -W / 2 + 3, 3, 7); ctx.fillRect(-L / 2, W / 2 - 10, 3, 7);
  if (c.nitroOn) {                                  // nitróláng a kipufogóból
    const fl = 14 + Math.random() * 10;
    ctx.fillStyle = 'rgba(80,170,255,0.85)';
    for (const sy of [-W / 4, W / 4]) { ctx.beginPath(); ctx.moveTo(-L / 2, sy - 4); ctx.lineTo(-L / 2 - fl, sy); ctx.lineTo(-L / 2, sy + 4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(230,245,255,0.95)';
    for (const sy of [-W / 4, W / 4]) { ctx.beginPath(); ctx.moveTo(-L / 2, sy - 2); ctx.lineTo(-L / 2 - fl * 0.5, sy); ctx.lineTo(-L / 2, sy + 2); ctx.closePath(); ctx.fill(); }
  }
  if (c.type === 'ambulance' && !c.wrecked) {       // mentő: piros kereszt és villogó kék fény
    ctx.fillStyle = '#e02020'; ctx.fillRect(-8, -3, 16, 6); ctx.fillRect(-3, -8, 6, 16);
    ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#3a7aff' : '#ff3030'; ctx.fillRect(L / 2 - 34, -W / 2 + 4, 6, W - 8);
  }
  if (c.type === 'racecar' && !c.wrecked) {         // versenyautó: sárga csíkok és rajtszám
    ctx.fillStyle = c.color[1]; ctx.fillRect(-L / 2, -4, L, 3); ctx.fillRect(-L / 2, 1, L, 3);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7', -10, 4); ctx.textAlign = 'left';
  }
  if (c.type === 'gold' && !c.wrecked) {            // arany: csillogás
    ctx.fillStyle = `rgba(255,255,220,${0.35 + 0.35 * Math.sin(clock * 6)})`; ctx.fillRect(-L / 4, -W / 2 + 6, 10, W - 12);
  }
  if (c.type === 'limo' && !c.wrecked) {            // limuzin: hosszú sötét ablaksor
    ctx.fillStyle = '#223'; ctx.fillRect(-L / 2 + 22, -W / 2 + 6, L - 56, 5); ctx.fillRect(-L / 2 + 22, W / 2 - 11, L - 56, 5);
  }
  if (c.type === 'nitro') {                         // NOS csíkok a motorháztetőn
    ctx.fillStyle = '#4ab0ff'; ctx.fillRect(L / 2 - 30, -W / 2 + 6, 24, 3); ctx.fillRect(L / 2 - 30, W / 2 - 9, 24, 3);
  }
  if (c.type === 'rental') {                        // bérautó: zöld csík és felirat
    ctx.fillStyle = '#2e9e48'; ctx.fillRect(-L / 2 + 2, -2, L - 4, 4);
    ctx.fillStyle = '#1d6e33'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BÉRAUTÓ', -4, -6); ctx.textAlign = 'left';
  }
  if (c.taxicab) {                                   // taxi tábla a tetőn
    ctx.fillStyle = '#222'; ctx.fillRect(-12, -7, 18, 14);
    ctx.fillStyle = '#f2c230'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', -3, 3); ctx.textAlign = 'left';
  }
  if (c.racer) {                                     // rajtszám a tetőn
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(c.number), -4, 4); ctx.textAlign = 'left';
  }
  if (c.type === 'bus' || c.type === 'citybus') {   // busz: ablaksor két oldalt, klíma a tetőn
    ctx.fillStyle = '#7fb6d9';
    for (let x = -L / 2 + 14; x < L / 2 - 34; x += 16) { ctx.fillRect(x, -W / 2 + 2, 11, 5); ctx.fillRect(x, W / 2 - 7, 11, 5); }
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-14, -8, 26, 16);
  }
  if (c.trolley) {                                   // troli: két áramszedő rúd hátrafelé, a vezetékig
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    for (const sy of [-4, 4]) { ctx.beginPath(); ctx.moveTo(-L / 6, sy); ctx.lineTo(-L / 2 - 26, sy * 2); ctx.stroke(); }
    ctx.fillStyle = '#c8202a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TROLI', L / 6, 4); ctx.textAlign = 'left';
  }
  if (c.police) {                                    // fényhíd: üldözéskor villog
    const on = c.chasing && !c.wrecked, blink = Math.floor(clock * 6) % 2;
    ctx.fillStyle = on && blink ? '#ff2020' : '#701010'; ctx.fillRect(-6, -W / 2 + 4, 8, W / 2 - 4);
    ctx.fillStyle = on && !blink ? '#2060ff' : '#102070'; ctx.fillRect(-6, 0, 8, W / 2 - 4);
    ctx.fillStyle = '#1d2a4a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', -L / 4 - 4, 3); ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawPerson(x, y, angle, walk, shirt, head, gun, legs = '#2b2b4a', hat = null, pattern = null) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const swing = Math.sin(walk) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, 4, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = legs;                                          // lábak
  ctx.fillRect(swing - 4, -7, 8, 5); ctx.fillRect(-swing - 4, 2, 8, 5);
  ctx.fillStyle = shirt;                                         // póló
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
  if (pattern === 'web') {                                       // hálóminta a ruhán: sugarak és körök
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 13); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 6.5, 0, 0, Math.PI * 2); ctx.ellipse(0, 0, 6.5, 10.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1f3fa0'; ctx.fillRect(-3, -13, 6, 4); ctx.fillRect(-3, 9, 6, 4);   // kék oldalcsík
  }
  ctx.fillStyle = pattern === 'web' ? shirt : pattern === 'pig' ? head : '#e0b088';   // karok (a ruhásnak kesztyűs keze, a malacnak rózsaszín)
  ctx.beginPath(); ctx.arc(-swing * 0.6, -13, 3.5, 0, Math.PI * 2); ctx.arc(swing * 0.6, 13, 3.5, 0, Math.PI * 2); ctx.fill();
  if (gun) { ctx.fillStyle = '#222'; ctx.fillRect(2, 11, 14, 4); }  // pisztoly
  ctx.fillStyle = head;                                          // fej (haj)
  ctx.beginPath(); ctx.arc(1, 0, 7, 0, Math.PI * 2); ctx.fill();
  if (pattern === 'web') {                                       // maszk: háló és nagy fehér szemek előre
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(1 + Math.cos(a) * 7, Math.sin(a) * 7); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
    for (const sy of [-2.6, 2.6]) { ctx.beginPath(); ctx.ellipse(5, sy, 2.4, 1.6, sy > 0 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  if (pattern === 'pig') {                                       // malac: fülek hátul, nagy ormány előre, orrlyukak, pirospozsgás arc
    ctx.fillStyle = head; ctx.strokeStyle = 'rgba(150,40,80,0.6)'; ctx.lineWidth = 0.8;
    for (const sy of [-4.5, 4.5]) { ctx.beginPath(); ctx.ellipse(-4, sy, 3.2, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(9, 0, 3.6, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b04070'; ctx.beginPath(); ctx.arc(10, -1.6, 0.9, 0, Math.PI * 2); ctx.arc(10, 1.6, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6f8f'; ctx.beginPath(); ctx.arc(2, -5, 1.6, 0, Math.PI * 2); ctx.arc(2, 5, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4.5, -2.2, 0.9, 0, Math.PI * 2); ctx.arc(4.5, 2.2, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  if (hat) {                                                     // kalap
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.arc(1, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(1, 0, 5.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCorpse(x, y, angle, shirt, head) {
  ctx.fillStyle = 'rgba(120,0,0,0.75)';
  ctx.beginPath(); ctx.ellipse(x, y, 20, 13, angle, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = head; ctx.beginPath(); ctx.arc(14, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLighting(n, cam, w, h, lamps, cars) {
  if (n <= 0) return;
  const sx = x => x - cam.x + w / 2, sy = y => y - cam.y + h / 2;

  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, w, h);
  lctx.fillStyle = `rgba(5,10,35,${0.86 * n})`;
  lctx.fillRect(0, 0, w, h);
  lctx.globalCompositeOperation = 'destination-out';

  const hole = (x, y, r, a) => {
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
  };

  for (const l of lamps) hole(sx(l.hx), sy(l.hy), 220, 1);
  // fényszórók
  for (const c of cars) {
    if (c.wrecked) continue;
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    const cx = sx(c.x + fx * c.len / 2), cy = sy(c.y + fy * c.len / 2);
    const reach = 380;
    const g = lctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.moveTo(cx, cy);
    lctx.arc(cx, cy, reach, c.angle - 0.4, c.angle + 0.4); lctx.closePath(); lctx.fill();
    hole(sx(c.x), sy(c.y), 70, 0.4);
  }
  for (const f of flashes) hole(sx(f.x), sy(f.y), 90, 0.8);
  if (!player.inCar) hole(sx(player.x), sy(player.y), 70, 0.45);

  ctx.drawImage(light, 0, 0);

  // meleg fényudvar a lámpák körül
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lamps) {
    const x = sx(l.hx), y = sy(l.hy);
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 200);
    gg.addColorStop(0, `rgba(255,200,120,${0.35 * n})`); gg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 200, 0, Math.PI * 2); ctx.fill();
  }
  // villogó szirénafény a rendőrautók körül
  const blink = Math.floor(clock * 6) % 2;
  for (const c of cars) {
    if (!c.police || !c.chasing || c.wrecked) continue;
    const x = sx(c.x), y = sy(c.y);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 160);
    const col = blink ? '255,40,40' : '40,90,255';
    g.addColorStop(0, `rgba(${col},${0.5 * n})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 160, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // alkonyati / hajnali narancs árnyalat
  const dusk = Math.sin(Math.PI * n);
  if (dusk > 0.01) { ctx.fillStyle = `rgba(255,120,40,${0.18 * dusk})`; ctx.fillRect(0, 0, w, h); }
}

function drawStorm(w, h, n) {
  const L = storm.level;
  if (L < 0.01) return;
  const k = 1 - 0.75 * n;   // éjszaka sötétebb a homok
  ctx.fillStyle = `rgba(${200 * k | 0},${160 * k | 0},${95 * k | 0},${0.62 * L})`;
  ctx.fillRect(0, 0, w, h);
  const ca = Math.cos(storm.angle), sa = Math.sin(storm.angle);
  ctx.strokeStyle = `rgba(${245 * k | 0},${220 * k | 0},${170 * k | 0},${0.55 * L})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const p of storm.particles) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - ca * p.len, p.y - sa * p.len); }
  ctx.stroke();
}

function fmt(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function drawHud(w, h) {
  const isDay = time < HALF_CYCLE;
  const left = isDay ? HALF_CYCLE - time : CYCLE - time;
  const speed = Math.round(Math.hypot(car.vx, car.vy) / 4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(10, 10, 400, 238);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${isDay ? '☀ Nappal' : '☾ Éjszaka'} – ${isDay ? 'éjszakáig' : 'nappalig'}: ${fmt(left / timeScale)}`, 20, 34);
  ctx.font = '14px sans-serif';
  ctx.fillText('Életerő', 20, 58);
  ctx.fillStyle = '#400'; ctx.fillRect(80, 47, 150, 13);
  ctx.fillStyle = player.health > 50 ? '#3c3' : player.health > 25 ? '#ec3' : '#e33';
  ctx.fillRect(80, 47, 150 * player.health / 100, 13);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Ölések: ${player.kills}`, 245, 58);
  const speeding = player.inCar && onRoad(car.x, car.y, SIDEWALK_W) && speed > SPEED_LIMIT;
  ctx.fillStyle = speeding ? '#f55' : '#fff';
  ctx.fillText(player.inCar ? `Sebesség: ${speed} km/h (korlát: ${SPEED_LIMIT})` : 'Gyalog', 20, 80);
  if (player.drunk > 1) {                            // részegség
    ctx.fillStyle = player.drunk >= 50 ? '#f6c' : '#c9a'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`🍺 ${player.drunk >= 50 ? 'Részeg' : 'Ittas'} – ne vezess! ${Math.round(player.drunk)}%`, player.inCar ? 20 : 120, player.inCar ? 92 : 80);
    ctx.font = '14px sans-serif';
  }
  if (player.inCar && car.nitroCfg) {                // nitrótartály
    ctx.fillStyle = '#333'; ctx.fillRect(300, 70, 90, 10);
    ctx.fillStyle = car.nitroOn ? '#9fe0ff' : '#4ab0ff'; ctx.fillRect(300, 70, 90 * car.nitro / 100, 10);
    ctx.fillStyle = '#9fe0ff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('NITRÓ (Shift)', 300, 92); ctx.font = '14px sans-serif';
  }
  ctx.fillStyle = '#fff';
  if (wanted.level) {
    ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#4af' : '#f44';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('★'.repeat(wanted.level) + '☆'.repeat(2 - wanted.level) + ' KÖRÖZÉS', 20, 272);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  }
  // benzin
  if (car.plane) ctx.fillText(`✈ ${PLANE_WEAPONS[car.planeWeapon || 0]} (B, váltás: V) · 💣${car.planeAmmo} 🚀${car.planeMissiles} ☢${car.planeAtoms} · ${Math.round(Math.hypot(car.vx, car.vy) / KMH)} km/h`, 20, 102);
  else if (!usesFuel(car)) ctx.fillText('Benzin: 🚲 nem kell', 20, 102);
  else {
    ctx.fillText('Benzin', 20, 102);
    ctx.fillStyle = '#333'; ctx.fillRect(80, 91, 150, 13);
    ctx.fillStyle = car.fuel > 40 ? '#3c3' : car.fuel > 20 ? '#ec3' : (Math.floor(clock * 4) % 2 ? '#e33' : '#711');
    ctx.fillRect(80, 91, 150 * car.fuel / 100, 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(car.refueling ? `⛽ Tankolás… ${car.fuel | 0}%` : `${car.fuel | 0}%`, 245, 102);
  }
  // pénz és szint
  const lvl = levelOf(progress.xp), xp0 = xpForLevel(lvl), xp1 = xpForLevel(lvl + 1);
  // a feliratok egymás után, a tényleges szélességük szerint (nagy összegnél / hitelnél se fedjék egymást)
  const textW = (t, fallback) => { const m = ctx.measureText(t); return m && m.width ? m.width : fallback; };
  const moneyTxt = `$${Math.floor(progress.money)}`;
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText(moneyTxt, 20, 128);
  let hx = 20 + textW(moneyTxt, moneyTxt.length * 11) + 10;
  if (progress.debt > 0) {
    const debtTxt = `hitel: -$${progress.debt}`;
    ctx.fillStyle = '#7df'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(debtTxt, hx, 127);
    hx += textW(debtTxt, debtTxt.length * 6.5) + 10;
  }
  const lvlX = Math.max(150, hx), barX = lvlX + 65, barW = Math.max(40, 395 - barX);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`${lvl}. szint`, lvlX, 127);
  ctx.fillStyle = '#333'; ctx.fillRect(barX, 117, barW, 10);
  ctx.fillStyle = '#ffd23a'; ctx.fillRect(barX, 117, barW * (progress.xp - xp0) / (xp1 - xp0), 10);
  // küldetés
  if (mission.active) {
    const m = Math.round(Math.hypot(player.x - mission.tx, player.y - mission.ty) / 10);
    ctx.fillStyle = '#ffd23a';
    ctx.fillText(`📦 Szállítás: ${m} m · nincs időlimit · sorozat x${streakMult().toFixed(2)}`, 20, 150);
  } else {
    ctx.fillStyle = '#ffd23a';
    ctx.fillText(`📦 Új szállítás hamarosan… (sorozat: ${mission.streak})`, 20, 150);
  }
  ctx.fillStyle = '#fff';
  if (storm.level > 0.3) { ctx.fillStyle = '#ffb040'; ctx.fillText(tornado ? '🌪 TORNÁDÓ!' : '⚠ Homokvihar!', 300, 80); ctx.fillStyle = '#fff'; }
  ctx.fillStyle = '#ff9a6a'; ctx.font = 'bold 12px sans-serif';                     // bombák
  ctx.fillText(`💣 ${bombInv.count}/${BOMB_MAX} (B)`, 335, 58);
  { const cw = curWeapon(); ctx.fillStyle = '#ffd23a'; ctx.fillText(`${cw.icon} ${cw.name}${cw.max ? ` ${arsenal.ammo[cw.id]}/${cw.max}` : ''} (G)`, 420, 58); }   // a kiválasztott fegyver
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  if (tornado && tornado.power > 0.3) drawEdgeArrow(tornado.x, tornado.y, '#ff6a3a', `🌪 ${Math.round(dist(tornado, player) / 10)} m`, w, h);
  ctx.fillText('WASD/nyilak: mozgás · Shift: futás · E: be/ki', 20, 176);
  ctx.fillText('Space: kézifék (drift = pénz) · Bal klikk / F: lövés · G / görgő: fegyver · J: saját bombázó', 20, 196);
  ctx.fillText(`H: vihar · T: idő (${timeScale}x) · X: taxi · K: térkép · Q: háború · P: telefon · O: eldob · Esc: menü`, 20, 216);
  ctx.fillStyle = '#bbb'; ctx.font = '12px sans-serif';
  ctx.fillText(`Az úton ${SPEED_LIMIT} km/h felett jön a rendőrség · tankolni a ⛽ kutaknál lehet`, 20, 238);

  // drift-kombó számláló
  if (drift.active && drift.points > 2) {
    ctx.textAlign = 'center'; ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = ['#fff', '#fff', '#ffd23a', '#ff8a1f', '#ff4a4a', '#ff3aff'][drift.mult];
    ctx.fillText(`DRIFT ${Math.round(drift.points)}  x${drift.mult}`, w / 2, h - 90);
    ctx.textAlign = 'left';
  }
  // felugró üzenetek (pénz, figyelmeztetések)
  ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
  popups.forEach((p, i) => {
    ctx.globalAlpha = clamp(2.5 - (clock - p.born), 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, w / 2, 40 + i * 26 - (clock - p.born) * 8);
  });
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  // nyilak: küldetés célpontja, kevés benzinnél a legközelebbi kút
  if (race.state === 'idle' && race.offer) drawEdgeArrow(race.offer.x, race.offer.y, '#7df', `🏁 ${Math.round(dist(race.offer, player) / 10)} m`, w, h);
  if (race.state === 'running') {
    const t = race.route[race.cp];
    drawEdgeArrow(t.x, t.y, '#7df', `${race.cp + 1}/${race.route.length}`, w, h);
    ctx.fillStyle = '#7df'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`🏁 ${racePosition()}. hely · ellenőrzőpont ${race.cp + 1}/${race.route.length} · ${fmt(race.time)}`, w / 2, 70);
    ctx.textAlign = 'left';
  }
  if (mapView.cats.pin && progress.pins.length) {                      // nyíl a legközelebbi saját jelöléshez
    const pn = progress.pins.reduce((a, b) => (Math.hypot(a.x - player.x, a.y - player.y) <= Math.hypot(b.x - player.x, b.y - player.y) ? a : b));
    drawEdgeArrow(pn.x, pn.y, '#f6c', `📍 ${Math.round(Math.hypot(pn.x - player.x, pn.y - player.y) / 10)} m`, w, h);
  }
  if (war && war.army) { const np = soldiers.filter(o => o.side === 'P').length; ctx.textAlign = 'center'; ctx.fillStyle = '#ff9a9a'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`🪖 Saját sereg: ${np} katona`, w / 2, 60); ctx.textAlign = 'left'; }
  if (war && war.nukeArmed) {                                                   // atombomba-visszaszámlálás
    const left = Math.max(0, Math.ceil(WAR_LIFE - war.t)), dn = Math.round(Math.hypot(player.x - war.x, player.y - war.y));
    ctx.textAlign = 'center'; ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#ff3030' : '#ffd23a'; ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`☢ ATOMBOMBA: ${left} mp`, w / 2, 90);
    ctx.fillStyle = dn < NUKE_RADIUS ? '#ff9a9a' : '#9aff9a'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(dn < NUKE_RADIUS ? `Menekülj! Még ${dn} px-re vagy (biztonságos: ${NUKE_RADIUS} px fölött)` : 'Biztonságos távolságban vagy', w / 2, 112); ctx.textAlign = 'left';
  }
  if (occupation) drawEdgeArrow(occupation.x, occupation.y, '#ffd23a', `🏴 megszállva ${Math.round(Math.hypot(player.x - occupation.x, player.y - occupation.y) / 10)} m`, w, h);
  if (war) drawEdgeArrow(war.x, war.y, '#ff5a2a', `⚔ háború ${Math.round(Math.hypot(player.x - war.x, player.y - war.y) / 10)} m`, w, h);
  if (mission.active) drawEdgeArrow(mission.tx, mission.ty, '#ffd23a', `${Math.round(Math.hypot(player.x - mission.tx, player.y - mission.ty) / 10)} m`, w, h);
  if (player.inCar && usesFuel(car) && car.fuel < 25) {
    const ns = nearestStation(car.x, car.y);
    if (ns) {
      drawEdgeArrow(ns.x, ns.y, '#ff8a1f', `⛽ ${Math.round(ns.d / 10)} m`, w, h);
      ctx.fillStyle = Math.floor(clock * 3) % 2 ? '#ff8a1f' : '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`⛽ Kevés a benzin! Legközelebbi kút: ${Math.round(ns.d / 10)} m`, w / 2, h - 66);
      ctx.textAlign = 'left';
    }
  }
  if (player.inCar && usesFuel(car) && !car.refueling && car.fuel < 100 && nearPump(car.x, car.y)) {
    ctx.fillStyle = '#ff8a1f'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(progress.money > 0 ? 'Állj meg a tankoláshoz' : 'Nincs pénzed tankolni – szerezz pénzt (szállítás, drift)!', w / 2, h - 40);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  const prompt = interactionPrompt();
  if (prompt) { ctx.fillStyle = prompt.color; ctx.fillText(prompt.text, w / 2, h - 40); }
  ctx.fillStyle = '#fff';
  if (message && clock < message.until) {
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = message.color || (message.text === 'MEGHALTÁL' ? '#e33' : '#fff');
    ctx.fillText(message.text, w / 2, h / 2 - 60);
  }
  ctx.textAlign = 'left';

  if (mouse.active && !player.dead) {   // célkereszt
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 14, mouse.y); ctx.lineTo(mouse.x - 4, mouse.y);
    ctx.moveTo(mouse.x + 4, mouse.y); ctx.lineTo(mouse.x + 14, mouse.y);
    ctx.stroke();
  }
}

function drawMinimap(w) {
  // radar: a játékos körüli 8000 × 8000 px-es terület
  const S = 170, RAD = 4000, k = S / (2 * RAD), x0 = w - S - 12, y0 = 12;
  const px = x => x0 + (x - player.x + RAD) * k, py = y => y0 + (y - player.y + RAD) * k;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0 - 4, y0 - 4, S + 8, S + 8);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
  ctx.fillStyle = '#c9a964'; ctx.fillRect(x0, y0, S, S);
  ctx.fillStyle = '#555';
  for (const R of roadsIn(player.y - RAD - 100, player.y + RAD + 100)) ctx.fillRect(x0, py(R) - 2, S, 4);
  for (const R of roadsIn(player.x - RAD - 100, player.x + RAD + 100)) ctx.fillRect(px(R) - 2, y0, 4, S);
  for (const c of aiCars) {
    ctx.fillStyle = c.wrecked ? '#333' : c.chasing ? (Math.floor(clock * 6) % 2 ? '#f22' : '#26f') : c.color[0];
    const sz = c.chasing ? 6 : 4;
    ctx.fillRect(px(c.x) - sz / 2, py(c.y) - sz / 2, sz, sz);
  }
  ctx.fillStyle = '#e33';
  ctx.fillStyle = '#ff8a1f';
  for (const st of stationsIn(player.x - RAD, player.y - RAD, player.x + RAD, player.y + RAD)) {
    ctx.fillRect(px((st.rect.x0 + st.rect.x1) / 2) - 4, py((st.rect.y0 + st.rect.y1) / 2) - 4, 8, 8);
  }
  if (tornado) { ctx.fillStyle = '#ff6a3a'; ctx.beginPath(); ctx.arc(clamp(px(tornado.x), x0 + 5, x0 + S - 5), clamp(py(tornado.y), y0 + 5, y0 + S - 5), 6, 0, Math.PI * 2); ctx.fill(); }
  for (const pt of radarPois()) {                       // nevezetes helyek a radaron
    if (!mapView.cats[pt.type]) continue;
    ctx.fillStyle = POI_TYPES[pt.type].color; ctx.beginPath(); ctx.arc(px(pt.x), py(pt.y), 3, 0, Math.PI * 2); ctx.fill();
  }
  if (mapView.cats.pin) for (const pn of progress.pins) {
    ctx.fillStyle = '#f6c'; ctx.beginPath(); ctx.arc(clamp(px(pn.x), x0 + 4, x0 + S - 4), clamp(py(pn.y), y0 + 4, y0 + S - 4), 4.5, 0, Math.PI * 2); ctx.fill();
  }
  const raceTarget = race.state === 'idle' ? race.offer : race.route[race.cp];
  if (raceTarget) {
    ctx.fillStyle = '#7df';
    ctx.fillRect(clamp(px(raceTarget.x), x0 + 4, x0 + S - 4) - 4, clamp(py(raceTarget.y), y0 + 4, y0 + S - 4) - 4, 8, 8);
  }
  if (mission.active) {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(clamp(px(mission.tx), x0 + 4, x0 + S - 4), clamp(py(mission.ty), y0 + 4, y0 + S - 4), 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#d42020'; ctx.fillRect(px(car.x) - 3, py(car.y) - 3, 6, 6);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px(player.x), py(player.y), 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHomeless(p) {
  const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
  ctx.fillStyle = '#a08458'; ctx.fillRect(p.x - 16, p.y - 16, 32, 32);          // kartonlap, amin ül
  drawPerson(p.x, p.y, p.angle, 0, p.shirt, p.head, false, '#3d3a33');
  const cx = p.x + fx * 20, cy = p.y + fy * 20;                                 // pohár előtte
  ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a43a'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8b28a'; ctx.fillRect(p.x - fy * 22 - 14, p.y + fx * 22 - 7, 28, 14);   // tábla mellette
  ctx.fillStyle = '#333'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SEGÍTS', p.x - fy * 22, p.y + fx * 22 + 2.5);
  if (clock < (p.thanksUntil || 0)) { ctx.fillStyle = '#7f7'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('Köszönöm! ❤', p.x, p.y - 26); }
  ctx.textAlign = 'left';
}

function drawBigMap(w, h) {
  const L = mapView.layout = mapLayout(w, h), c = mapView.center;
  ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c9a964'; ctx.fillRect(L.x0, L.y0, L.S, L.S);
  ctx.save(); ctx.beginPath(); ctx.rect(L.x0, L.y0, L.S, L.S); ctx.clip();
  ctx.fillStyle = '#555';
  for (const r of roadsIn(c.y - MAP_RADIUS, c.y + MAP_RADIUS)) ctx.fillRect(L.x0, worldToMap(L, 0, r).y - 1.5, L.S, 3);
  for (const r of roadsIn(c.x - MAP_RADIUS, c.x + MAP_RADIUS)) ctx.fillRect(worldToMap(L, r, 0).x - 1.5, L.y0, 3, L.S);
  ctx.textAlign = 'center'; ctx.font = '13px sans-serif';
  for (const pt of visiblePois()) { const m = worldToMap(L, pt.x, pt.y); ctx.fillText(POI_TYPES[pt.type].icon, m.x, m.y + 5); }
  if (mapView.cats.pin) { ctx.font = '18px sans-serif'; for (const pn of progress.pins) { const m = worldToMap(L, pn.x, pn.y); ctx.fillText('📍', m.x, m.y + 2); } }
  const mc = worldToMap(L, car.x, car.y); ctx.fillStyle = '#d42020'; ctx.fillRect(mc.x - 4, mc.y - 4, 8, 8);
  const mp = worldToMap(L, player.x, player.y); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mp.x, mp.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#e2c27d'; ctx.lineWidth = 3; ctx.strokeRect(L.x0, L.y0, L.S, L.S);
  // jelmagyarázat: kattintható kategóriák
  mapView.hits = [];
  const lx = L.x0 + L.S + 24;
  ctx.textAlign = 'left'; ctx.fillStyle = '#e2c27d'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('🗺 Térkép', lx, L.y0 + 24);
  Object.entries(POI_TYPES).forEach(([type, t], i) => {
    const y = L.y0 + 44 + i * 33, on = mapView.cats[type];
    ctx.fillStyle = on ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'; ctx.fillRect(lx, y, 220, 28);
    ctx.strokeStyle = on ? t.color : '#555'; ctx.lineWidth = 2; ctx.strokeRect(lx, y, 220, 28);
    ctx.fillStyle = on ? '#fff' : '#777'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${type === 'pin' ? 'P' : (i + 1) % 10}: ${t.icon} ${t.name}`, lx + 10, y + 19);
    mapView.hits.push({ cat: type, x: lx, y, w: 220, h: 28 });
  });
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif';
  const tips = ['Kattints a térképre: pont jelölése', 'Kattints egy 📍-re: törlés', `Legfeljebb ${PIN_MAX} jelölés`, 'Delete: minden jelölés törlése', 'K / Esc: bezárás'];
  const ty = L.y0 + 62 + Object.keys(POI_TYPES).length * 33;   // a jelmagyarázat alatt
  tips.forEach((t, i) => ctx.fillText(t, lx, ty + i * 18));
}

function drawTaxiMenu(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const n = taxiMenu.items.length, RH = clamp(Math.floor((h - 130) / n), 26, 40), PW = 440, PH = 110 + n * RH, px = (w - PW) / 2, py = Math.max(4, (h - PH) / 2);
  ctx.fillStyle = 'rgba(30,26,10,0.96)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f2c230'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`🚕 Hova vigyelek? ($${TAXI_FARE})`, w / 2, py + 38);
  taxiMenu.hits = [];
  taxiMenu.items.forEach((it, i) => {
    const y = py + 56 + i * RH, sel = i === taxiMenu.sel, bh = RH - 8, ty = y + bh / 2 + 6;
    ctx.fillStyle = sel ? 'rgba(242,194,48,0.25)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 20, y, PW - 40, bh);
    if (sel) { ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.strokeRect(px + 20, y, PW - 40, bh); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(it.label, px + 34, ty);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif'; ctx.fillText(`${it.km} km`, px + PW - 34, ty);
    taxiMenu.hits.push({ i, x: px + 20, y, w: PW - 40, h: bh });
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  ctx.fillText('↑↓: választás · Enter: indulás · Esc: mégse', w / 2, py + PH - 14); ctx.textAlign = 'left';
}

// a tévé és a telefon videóinak közös rajza: ch 0–3 a tévé csatornái, 4–5 csak a telefon klipjei
function drawTvScreen(x0, y0, SW, SH, ch, t) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, SW, SH); ctx.clip();
  ctx.textAlign = 'center';
  if (ch === 0) {                                                                    // hírek: bemondó és futó hírszalag
    ctx.fillStyle = '#123a7a'; ctx.fillRect(x0, y0, SW, SH);
    ctx.fillStyle = '#e8c27d'; ctx.fillRect(x0 + SW / 2 - 40, y0 + SH * 0.35, 80, SH * 0.45);
    ctx.fillStyle = '#e0b088'; ctx.beginPath(); ctx.arc(x0 + SW / 2, y0 + SH * 0.3, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2615'; ctx.fillRect(x0 + SW / 2 - 26, y0 + SH * 0.3 - 26, 52, 14);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x0 + 40, y0 + SH * 0.7, SW - 80, 26);         // pult
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('HÍRADÓ', x0 + 70, y0 + 34);
    const news = ['Tornádó-figyelmeztetés a sivatagban!', 'Gonosz tanár garázdálkodik az iskolákban', `A legjobb drift eddig: ${Math.floor(progress.bestDrift || 0)} pont`,
      'Alexek mindenhol – senki sem tudja, miért', `Szerencsés játékos: $${Math.floor(progress.money)} a zsebében`, 'Új bicikliút épül (talán)'];
    const line = news.join('   ★   '); ctx.font = 'bold 16px sans-serif';
    const lw = ((ctx.measureText && ctx.measureText(line)) || {}).width || 900;
    ctx.fillStyle = '#c01818'; ctx.fillRect(x0, y0 + SH - 32, SW, 32);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(line, x0 + SW - ((t * 90) % (lw + SW)), y0 + SH - 10); ctx.textAlign = 'center';
  } else if (ch === 1) {                                                             // mese: malac ugrál a sárban
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x0, y0, SW, SH);
    ctx.fillStyle = '#5ac050'; ctx.beginPath(); ctx.ellipse(x0 + SW / 2, y0 + SH, SW * 0.7, SH * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a20'; ctx.beginPath(); ctx.ellipse(x0 + SW / 2, y0 + SH * 0.82, 90, 18, 0, 0, Math.PI * 2); ctx.fill();   // sár
    const jy = y0 + SH * 0.62 - Math.abs(Math.sin(t * 3)) * 70, px = x0 + SW / 2;
    ctx.fillStyle = '#e8383d'; ctx.beginPath(); ctx.ellipse(px, jy + 30, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7a8c0'; ctx.beginPath(); ctx.ellipse(px, jy - 14, 34, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 34, jy - 18, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b04070'; ctx.beginPath(); ctx.arc(px + 38, jy - 21, 2.5, 0, Math.PI * 2); ctx.arc(px + 38, jy - 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px + 10, jy - 22, 3, 0, Math.PI * 2); ctx.fill();
    if (Math.sin(t * 3) > 0.95 || Math.sin(t * 3) < -0.95) { ctx.fillStyle = '#7a4a20'; for (let i = 0; i < 6; i++) ctx.fillRect(px - 60 + i * 22, y0 + SH * 0.74 - (i % 2) * 14, 6, 6); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Ugrálás a sárban! Hihihi! 🐷', x0 + SW / 2, y0 + 34);
  } else if (ch === 2) {                                                             // foci: pálya, labda, játékosok
    ctx.fillStyle = '#2e8a3a'; ctx.fillRect(x0, y0, SW, SH);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 20, y0 + 40, SW - 40, SH - 60);
    ctx.beginPath(); ctx.moveTo(x0 + SW / 2, y0 + 40); ctx.lineTo(x0 + SW / 2, y0 + SH - 20); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + SW / 2, y0 + SH / 2 + 10, 40, 0, Math.PI * 2); ctx.stroke();
    const bx = x0 + SW / 2 + Math.sin(t * 1.3) * (SW / 2 - 50), by = y0 + SH / 2 + 10 + Math.sin(t * 2.1) * (SH / 2 - 50);
    for (let i = 0; i < 6; i++) {
      const tx = bx + Math.cos(t + i * 2) * (40 + i * 12), ty = by + Math.sin(t * 1.4 + i) * (30 + i * 8);
      ctx.fillStyle = i % 2 ? '#d42020' : '#2f6fd0'; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    const g1 = Math.floor(t / 9) % 5, g2 = Math.floor(t / 13) % 4;
    ctx.fillStyle = '#000'; ctx.fillRect(x0 + SW / 2 - 140, y0 + 6, 280, 28);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.fillText(`Sivatag FC ${g1} – ${g2} Oázis United`, x0 + SW / 2, y0 + 26);
  } else if (ch === 3) {                                                                // autóverseny: körpálya, három autó
    ctx.fillStyle = '#c9a964'; ctx.fillRect(x0, y0, SW, SH);
    const cx = x0 + SW / 2, cy = y0 + SH / 2 + 10, rx = SW / 2 - 50, ry = SH / 2 - 50;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 36; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash && ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]);
    [['#d42020', 1.0], ['#2f6fd0', 0.93], ['#f2c230', 0.87]].forEach(([col, v], i) => {
      const a = t * v * 1.2 + i * 0.25, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = col; ctx.fillRect(-14, -7, 28, 14); ctx.restore();
    });
    ctx.fillStyle = '#000'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(`🏁 Sivatagi Nagydíj – ${1 + Math.floor(t / 6) % 10}. kör`, cx, y0 + 30);
  } else if (ch === 4) {                                                                  // tornádó-felvétel: sötét ég, forgó tölcsér, repülő törmelék
    const g = ctx.createLinearGradient(0, y0, 0, y0 + SH); g.addColorStop(0, '#2a3040'); g.addColorStop(1, '#8a7a5a'); ctx.fillStyle = g; ctx.fillRect(x0, y0, SW, SH);
    const cx = x0 + SW / 2 + Math.sin(t * 0.8) * SW * 0.18;
    for (let i = 0; i < 12; i++) { const k = i / 11, w = 14 + k * 70, yy = y0 + SH * 0.15 + k * SH * 0.8; ctx.fillStyle = `rgba(${90 + i * 8},${80 + i * 6},${70 + i * 4},0.85)`; ctx.beginPath(); ctx.ellipse(cx + Math.sin(t * 5 + i) * 12, yy, w, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const a = t * 3 + i * 0.7, rr = 40 + (i % 3) * 25; ctx.fillStyle = '#222'; ctx.fillRect(cx + Math.cos(a) * rr - 3, y0 + SH * 0.5 + Math.sin(a) * rr * 0.35 - 3, 6, 6); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('🌪 Tornádó a sivatagban – saját felvétel!', x0 + SW / 2, y0 + 28);
  } else if (ch === 5) {                                                                // atomgomba: sötét ég, növő tűzgömb, füstoszlop
    ctx.fillStyle = '#10131c'; ctx.fillRect(x0, y0, SW, SH);
    const k = Math.min(1, (t % 12) / 7), gy = y0 + SH * 0.85;
    ctx.fillStyle = '#6a5a3a'; ctx.fillRect(x0, gy, SW, SH * 0.15);
    ctx.fillStyle = '#5a4a40'; ctx.fillRect(x0 + SW / 2 - 12 - k * 10, gy - k * SH * 0.45, 24 + k * 20, k * SH * 0.45);                                             // szár
    const gr = ctx.createRadialGradient(x0 + SW / 2, gy - k * SH * 0.5, 4, x0 + SW / 2, gy - k * SH * 0.5, 30 + k * 70); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.5, '#ff8a2a'); gr.addColorStop(1, 'rgba(120,60,30,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x0 + SW / 2, gy - k * SH * 0.5, 30 + k * 70, 0, Math.PI * 2); ctx.fill();                                           // sapka
    if ((t % 12) < 0.5) { ctx.fillStyle = `rgba(255,255,255,${1 - (t % 12) * 2})`; ctx.fillRect(x0, y0, SW, SH); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('☢ A háború vége – lassítva', x0 + SW / 2, y0 + 28);
  }
  ctx.restore();
}
function drawTv(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, w, h);
  const SW = Math.min(560, w - 40), SH = Math.round(SW * 0.6), x0 = (w - SW) / 2, y0 = Math.max(10, (h - SH) / 2 - 20), t = tv.t;
  ctx.fillStyle = '#222'; ctx.fillRect(x0 - 16, y0 - 16, SW + 32, SH + 32);                 // a tévé kerete
  drawTvScreen(x0, y0, SW, SH, tv.ch, t);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`📺 ${tv.ch + 1}. csatorna: ${TV_CHANNELS[tv.ch]}`, w / 2, y0 + SH + 44);
  ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
  ctx.fillText('1–4 vagy ←→: csatornaváltás · E / Esc: kikapcsolás', w / 2, y0 + SH + 64); ctx.textAlign = 'left';
}

function drawSchool(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const PW = 480, PH = 300, px = (w - PW) / 2, py = Math.max(4, (h - PH) / 2), q = school.q;
  ctx.fillStyle = '#1f3a2a'; ctx.fillRect(px, py, PW, PH);                     // tábla
  ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 8; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffe680'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`🏫 Matekóra – ${school.n + 1}. feladat / ${LESSON_LEN}`, w / 2, py + 40);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif'; ctx.fillText(`jó válaszok: ${school.correct}`, w / 2, py + 64);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif'; ctx.fillText(q.text, w / 2, py + 130);
  if (school.feedback && !school.feedback.ok) {                                  // a tanár ordít: nagy piros felirat a tábla fölött
    ctx.fillStyle = '#f22'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(`👩‍🏫 ${SHOUT}`, w / 2, Math.max(36, py - 14));
  }
  school.hits = [];
  q.opts.forEach((o, i) => {
    const bw = 120, x = w / 2 - 1.5 * bw - 20 + i * (bw + 20), y = py + 170;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y, bw, 50);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, 50);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(`${i + 1}: ${o}`, x + bw / 2, y + 33);
    school.hits.push({ i, x, y, w: bw, h: 50 });
  });
  if (school.feedback) { ctx.fillStyle = school.feedback.ok ? '#7f7' : '#f66'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(school.feedback.ok ? '✓ Jó válasz!' : `👩‍🏫 „${school.taunt}” (helyesen: ${school.feedback.ans})`, w / 2, py + 248); }
  const tk = clamp(school.timeLeft / QUESTION_TIME, 0, 1);                       // idősáv: a tanár siettet
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(px + 40, py + 80, PW - 80, 8);
  ctx.fillStyle = tk > 0.3 ? '#7f7' : '#f44'; ctx.fillRect(px + 40, py + 80, (PW - 80) * tk, 8);
  ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
  ctx.fillText(`1–3: válasz · jó $${ANSWER_PAY}, hibátlan óra +$${LESSON_BONUS} · rossz / lassú: -$${WRONG_FINE} · Esc: kilépés`, w / 2, py + PH - 16); ctx.textAlign = 'left';
}

function drawShop(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const st = STORES[shop.kind], n = shop.items.length, PW = 520, PH = 120 + n * 40, px = (w - PW) / 2, py = Math.max(4, (h - PH) / 2);
  ctx.fillStyle = 'rgba(28,16,36,0.96)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = st.color; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center'; ctx.fillStyle = st.color; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${st.title} – pénzed: $${Math.floor(progress.money)}${shop.kind === 'mechanic' ? ` · tuning: ${car.tune || 0}/${TUNE_MAX}` : ''}`, w / 2, py + 38);
  shop.hits = [];
  shop.items.forEach((it, i) => {
    const y = py + 56 + i * 40, sel = i === shop.sel, why = shopBlocker(it), poor = !(progress.money >= it.price);
    ctx.fillStyle = sel ? 'rgba(200,150,255,0.25)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 20, y, PW - 40, 32);
    if (sel) { ctx.strokeStyle = '#c9f'; ctx.lineWidth = 2; ctx.strokeRect(px + 20, y, PW - 40, 32); }
    ctx.textAlign = 'left'; ctx.fillStyle = why || poor ? '#888' : '#fff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${i + 1}: ${it.icon} ${it.name}`, px + 34, y + 22);
    ctx.fillStyle = '#bbb'; ctx.font = '13px sans-serif'; ctx.fillText(why || it.info, px + 250, y + 21);
    ctx.textAlign = 'right'; ctx.fillStyle = poor ? '#f66' : '#ffd23a'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(`$${it.price}`, px + PW - 34, y + 22);
    shop.hits.push({ i, x: px + 20, y, w: PW - 40, h: 32 });
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  ctx.fillText(`1–${n} vagy kattintás: vásárlás · ↑↓ + Enter · Esc: kilépés`, w / 2, py + PH - 14); ctx.textAlign = 'left';
}

function drawBank(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const PW = 500, PH = 270, px = (w - PW) / 2, py = (h - PH) / 2, debt = progress.debt || 0;
  ctx.fillStyle = 'rgba(16,24,36,0.96)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = '#7df'; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7df'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('🏦 Bank', w / 2, py + 40);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText(`Egyenleg: $${Math.floor(progress.money)} · Tartozás: $${debt} · díj: ${Math.round(LOAN_FEE * 100)}%`, w / 2, py + 66);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 40px sans-serif'; ctx.fillText(`$${bank.amount}`, w / 2, py + 122);
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif'; ctx.fillText(`visszafizetendő: $${Math.round(bank.amount * (1 + LOAN_FEE))}`, w / 2, py + 144);
  bank.hits = [];
  const btn = (label, x, y, bw, hit, color = '#e2c27d') => {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, bw, 36);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, 36);
    ctx.fillStyle = color; ctx.font = 'bold 17px sans-serif'; ctx.fillText(label, x + bw / 2, y + 24);
    bank.hits.push({ x, y, w: bw, h: 36, ...hit });
  };
  btn(`−$${LOAN_STEP}`, px + 40, py + 92, 80, { delta: -LOAN_STEP }); btn(`+$${LOAN_STEP}`, px + PW - 120, py + 92, 80, { delta: LOAN_STEP });
  btn('1: Hitel felvétele', px + 30, py + 170, 210, { loan: true }, debt > 0 ? '#777' : '#7f7');
  btn('2: Törlesztés', px + 260, py + 170, 210, { repay: true }, debt > 0 ? '#7df' : '#777');
  ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  ctx.fillText(`Egyszerre egy hitel · tartozás alatt minden kereset ${Math.round(AUTO_REPAY * 100)}%-a törleszt · Esc: bezárás`, w / 2, py + PH - 16);
  ctx.textAlign = 'left';
}

function drawDonate(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const PW = 460, PH = 250, px = (w - PW) / 2, py = (h - PH) / 2;
  ctx.fillStyle = 'rgba(30,24,16,0.95)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = '#7f7'; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7f7'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('🤲 Adományozás', w / 2, py + 42);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText(`$${DONATE_MIN} és $${DONATE_MAX} között · egyenleged: $${Math.floor(progress.money)}`, w / 2, py + 68);
  ctx.fillStyle = progress.money >= donate.amount ? '#ffd23a' : '#f66'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`$${donate.amount}`, w / 2, py + 128);
  donate.hits = [];
  const btn = (label, x, y, bw, hit, color = '#e2c27d') => {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, bw, 36);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, 36);
    ctx.fillStyle = color; ctx.font = 'bold 18px sans-serif'; ctx.fillText(label, x + bw / 2, y + 24);
    donate.hits.push({ x, y, w: bw, h: 36, ...hit });
  };
  btn('−10', px + 30, py + 92, 60, { delta: -10 }); btn('−1', px + 95, py + 92, 50, { delta: -1 });
  btn('+1', px + PW - 145, py + 92, 50, { delta: 1 }); btn('+10', px + PW - 90, py + 92, 60, { delta: 10 });
  btn('Adományozok', px + 60, py + 160, 200, { give: true }, '#7f7');
  btn('Mégse', px + 280, py + 160, 120, { cancel: true }, '#f99');
  ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  ctx.fillText('←→: ±1 · ↑↓: ±10 · Enter: adományozás · Esc: mégse', w / 2, py + PH - 14);
  ctx.textAlign = 'left';
}

function drawMenu(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, w, h);
  const PW = 600, PH = 500, px = (w - PW) / 2, py = (h - PH) / 2;
  ctx.fillStyle = 'rgba(30,24,16,0.95)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = '#e2c27d'; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e2c27d'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText('SIVATAGI GTA – MENÜ', w / 2, py + 50);

  menu.hits = [];
  const cm = CAR_MODELS[menu.carModel];
  const values = [null, SKINS[menu.skin].name + (ownsSkin(menu.skin) ? '' : `  🔒 $${skinPrice(menu.skin)}`), cm.name + (owns(menu.carModel) ? '' : `  🔒 $${cm.price}`)];
  for (let i = 0; i < MENU_ROWS.length; i++) {
    const ry = py + 90 + i * 62, rx = px + 30, rw = PW - 60, rh = 48;
    const sel = menu.sel === i;
    ctx.fillStyle = sel ? 'rgba(226,194,125,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(rx, ry, rw, rh);
    if (sel) { ctx.strokeStyle = '#e2c27d'; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    if (values[i] === null) {
      ctx.fillText(MENU_ROWS[i], w / 2, ry + 31);
      menu.hits.push({ row: i, delta: 0, x: rx, y: ry, w: rw, h: rh });
    } else {
      ctx.textAlign = 'left'; ctx.fillText(MENU_ROWS[i] + ':', rx + 16, ry + 31);
      ctx.textAlign = 'center'; ctx.fillText('◀  ' + values[i] + '  ▶', rx + rw / 2 + 50, ry + 31);
      menu.hits.push({ row: i, delta: -1, x: rx + 110, y: ry, w: 60, h: rh });
      menu.hits.push({ row: i, delta: 1, x: rx + rw - 60, y: ry, w: 60, h: rh });
      if ((i === 2 && !owns(menu.carModel)) || (i === 1 && !ownsSkin(menu.skin))) menu.hits.push({ row: i, delta: 0, buy: true, x: rx + 175, y: ry, w: rw - 240, h: rh });
    }
  }

  // pénz, szint, rekordok, vásárlás
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffd23a';
  ctx.fillText(`$${Math.floor(progress.money)} · ${levelOf(progress.xp)}. szint`, w / 2, py + 296);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`Legjobb drift: ${progress.bestDrift} · Leghosszabb sorozat: ${progress.bestStreak} · Adományok: $${progress.donated || 0} · Szállítások: ${progress.missions}`, w / 2, py + 318);
  const lockedSkin = !ownsSkin(menu.skin) && (menu.sel === 1 || owns(menu.carModel));
  const lockPrice = lockedSkin ? skinPrice(menu.skin) : cm.price, lockWhat = lockedSkin ? 'szkinhez' : 'autóhoz';
  if (lockedSkin || !owns(menu.carModel) || menu.note) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = menu.note ? (menu.note.startsWith('Megvetted') ? '#7f7' : '#f66') : progress.money >= lockPrice ? '#7f7' : '#f99';
    ctx.fillText(menu.note || (progress.money >= lockPrice ? `Enter vagy kattints a névre: megveszed $${lockPrice}-ért`
      : `Ehhez a ${lockWhat} még $${lockPrice - Math.floor(progress.money)} kell – szállíts, driftelj!`), w / 2, py + 342);
  }

  // előnézet
  const m = cm, sk = SKINS[menu.skin], prevY = py + 400;
  ctx.save(); ctx.translate(px + 150, prevY); ctx.scale(2.2, 2.2);
  if (!ownsSkin(menu.skin)) ctx.globalAlpha = 0.45;
  drawPerson(0, 0, -Math.PI / 2, clock * 6, sk.shirt, sk.head, true, sk.legs, sk.hat, sk.pattern);
  ctx.globalAlpha = 1; ctx.restore();
  const preview = makeCar(0, 0, 0, m.color);
  applyCarModel(preview, m);
  ctx.save(); ctx.translate(px + 410, prevY); ctx.scale(1.6, 1.6);
  if (!owns(menu.carModel)) ctx.globalAlpha = 0.45;
  drawCar(preview, 0); ctx.globalAlpha = 1; ctx.restore();
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText(m.desc + ` · ${Math.round(m.maxRoad / 4)} km/h · fogyasztás x${m.fuelUse}`, px + 410, prevY + 58);

  ctx.fillStyle = '#999'; ctx.font = '13px sans-serif';
  ctx.fillText(`↑↓: választás · ←→: váltás · Enter: Folytatás · Esc: vissza a játékba · egérrel is kattintható · v${VERSION}`, w / 2, py + PH - 14);
  ctx.textAlign = 'left';
}

function render() {
  const w = canvas.width, h = canvas.height;
  const cam = { x: player.x, y: player.y };
  lastCam = cam;
  const view = { x0: cam.x - w / 2 - 100, x1: cam.x + w / 2 + 100, y0: cam.y - h / 2 - 100, y1: cam.y + h / 2 + 100 };
  const inView = o => o.x > view.x0 && o.x < view.x1 && o.y > view.y0 && o.y < view.y1;
  const n = nightAmount(time);
  const chunks = chunksIn(view.x0 - 300, view.y0 - 300, view.x1 + 300, view.y1 + 300);
  const lamps = [];
  for (const ch of chunks) for (const l of ch.lamps) if (inView(l)) lamps.push(l);
  const cars = [car, ...aiCars].filter(inView);

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  applyDrunkSway(w, h);                                                               // részegen himbálózik a kép
  ctx.translate(Math.round(w / 2 - cam.x), Math.round(h / 2 - cam.y));

  ctx.fillStyle = sandPattern;
  ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  ctx.fillStyle = 'rgba(190,150,85,0.25)';
  for (const ch of chunks) {
    for (const d of ch.dunes) {
      if (d.x + d.rx < view.x0 || d.x - d.rx > view.x1 || d.y + d.rx < view.y0 || d.y - d.rx > view.y1) continue;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawRoads(view);
  drawRail(view);
  const stations = stationsIn(view.x0, view.y0, view.x1, view.y1);
  for (const st of stations) drawStation(st, n);
  drawMissionMarker();
  if (mapView.cats.pin) for (const pn of progress.pins) {               // saját jelölés a világban
    ctx.strokeStyle = '#f6c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pn.x, pn.y, 40 + 4 * Math.sin(clock * 5), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f6c'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📍', pn.x, pn.y + 8); ctx.textAlign = 'left';
  }
  drawRaceMarkers();
  for (const hs of destroyedHouses.values()) if (hs.x1 > view.x0 && hs.x0 < view.x1 && hs.y1 > view.y0 && hs.y0 < view.y1) drawRubble(hs);
  const viewHouses = housesIn(view.x0, view.y0, view.x1, view.y1);
  for (const hs of viewHouses) drawHouse(hs, n);
  for (const l of lotsIn(view.x0, view.y0, view.x1, view.y1)) drawParkingLot(l);
  drawTrolleyWires(view);
  for (const ts of trolleyStopsIn(view.x0, view.y0, view.x1, view.y1)) drawTrolleyStop(ts);
  for (const bs of busStopsIn(view.x0, view.y0, view.x1, view.y1)) { drawBusStop(bs); const f = parkingLot(bs).flag; drawHungarianFlag(f.x, f.y); }
  drawSkidMarks(view);
  for (const p of npcs) if (p.dead && inView(p)) drawCorpse(p.x, p.y, p.angle, p.shirt, p.head);
  for (const ch of chunks) {
    for (const o of ch.obstacles) {
      if (!inView(o)) continue;
      if (o.type === 'cactus') drawCactus(o);
      else if (o.type === 'rock') drawRock(o);
    }
  }
  drawCraters();
  for (const f of fallen) if (inView(f)) { if (f.tank) drawTank({ ...f, aim: f.angle, walk: 0, hp: 0 }, true); else drawCorpse(f.x, f.y, f.angle, WAR_COLORS[f.side].shirt, WAR_COLORS[f.side].head); }
  for (const sd of soldiers) if (inView(sd)) drawSoldier(sd);
  drawWarShells();
  drawOccupation();
  for (const sd of garrison) if (inView(sd)) drawSoldier(sd);
  drawMissiles();
  for (const pl of planes) if (inView(pl)) drawPlane(pl, false);
  for (const b of bombers) drawPlane(b, true);
  drawAirBombs();
  for (const a of aliens) if (inView(a)) drawAlien(a);
  if (player.abduct) drawAbduct();
  for (const dp of progress.droppedPhones) if (inView(dp)) drawDroppedPhone(dp);
  for (const hz of horsesIn(player.x - 1100, player.y - 800, player.x + 1100, player.y + 800)) drawHorse({ ...hz, color: hz.coat, vx: 0, vy: 0 }, true);   // vadlovak legelnek
  for (const p of npcs) {
    if (p.dead || !inView(p)) continue;
    if (p.kind === 'homeless') drawHomeless(p);
    else drawPerson(p.x, p.y, p.angle, p.walk, p.shirt, p.head, false, p.legs || '#2b2b4a');
    if (p.errand) { ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.errand.work ? '💼' : SERVICE_ICONS[p.errand.kind], p.x, p.y - 18); ctx.textAlign = 'left'; }   // úton: munkába / szolgáltatáshoz
    if (p.alex) {                                                    // névtábla, és amit éppen mond
      ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#7f7'; ctx.fillText('Alex', p.x, p.y - 20);
      if (p.lineUntil > clock) { ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(`💬 ${p.line}`, p.x, p.y - 36); }
      ctx.textAlign = 'left';
    }
  }
  const sk = SKINS[activeSkin];
  if (player.dead) drawCorpse(player.x, player.y, player.angle, sk.shirt, sk.head);
  else if (!player.inCar && !player.riding && !player.inHouse && !player.abduct) drawPerson(player.x, player.y, player.angle, player.walk, sk.shirt, sk.head, true, sk.legs, sk.hat, sk.pattern);
  if (clock < (player.shieldUntil || 0) && !player.dead && !player.inHouse) { ctx.strokeStyle = `rgba(120,220,255,${0.5 + 0.4 * Math.sin(clock * 14)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(player.x, player.y, 26, 0, Math.PI * 2); ctx.stroke(); }   // védőgyűrű újraéledés után
  drawOthers(inView);                                // a többi játékos (többjátékos módban)
  for (const c of cars) drawCar(c, n);
  viewHouses.filter(hs => hs.sky).sort((a, b) => Math.hypot(b.x - cam.x, b.y - cam.y) - Math.hypot(a.x - cam.x, a.y - cam.y)).forEach(drawSkyTop);   // a felhőkarcolók magas teste mindenek fölött (távolabbiak előbb)
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const b of bullets) if (!b.rocket) { ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  for (const b of bullets) if (b.rocket) {                                         // rakétavető: kis rakéta lángcsóvával
    const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-18 - Math.random() * 6, -3); ctx.lineTo(-18 - Math.random() * 6, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#556'; ctx.fillRect(-7, -3, 14, 6); ctx.fillStyle = '#c33'; ctx.fillRect(5, -3, 4, 6); ctx.restore();
  }
  ctx.fillStyle = '#fff2a0';
  for (const f of flashes) { ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill(); }
  drawSmoke();
  drawNukeFx(cam, w, h);
  drawTornado();
  drawBombs();
  drawNukeDevices();
  for (const l of lamps) drawLamp(l, n);
  ctx.restore();

  const lights = lamps.concat(stations.flatMap(st => st.pumps.map(p => ({ hx: p.x, hy: p.y }))));
  ctx.save(); applyDrunkSway(w, h);                                                   // a fények a világgal együtt himbálóznak
  drawLighting(n, cam, w, h, lights, cars);
  ctx.restore();
  drawStorm(w, h, n);
  if (player.inHouse) drawInterior(w, h);
  if (player.moon) drawMoon(w, h);
  if (player.passedOut > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(player.passedOut / 2, 0.6, 0.95)})`; ctx.fillRect(0, 0, w, h); }   // ájulás: elsötétül
  else if (drunkK() > 0) { ctx.fillStyle = `rgba(160,60,140,${0.12 * drunkK()})`; ctx.fillRect(0, 0, w, h); }
  drawHud(w, h);
  drawMinimap(w);
  if (menu.open) drawMenu(w, h);
  if (donate.open) drawDonate(w, h);
  if (bank.open) drawBank(w, h);
  if (shop.open) drawShop(w, h);
  if (school.open) drawSchool(w, h);
  if (tv.open) drawTv(w, h);
  if (phone.open) drawPhone(w, h);
  if (taxiMenu.open) drawTaxiMenu(w, h);
  if (mapView.open) drawBigMap(w, h);
  if (taxiTrip) {                                    // utazás: elsötétül, felirat
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2c230'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`🚕 Utazás: ${taxiTrip.dest.label}…`, w / 2, h / 2); ctx.textAlign = 'left';
  }
}

// ===== Fő ciklus =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  netInterp(dt);                                    // a többi játékos akkor is mozog, ha nálunk menü / telefon van nyitva
  if (!menu.open && !donate.open && !bank.open && !shop.open && !school.open && !tv.open && !phone.open && !taxiMenu.open && !mapView.open) {   // menüben, adományozás és banki ügyintézés közben megáll a játék
    time = (time + dt * timeScale) % CYCLE;
    clock += dt;
    update(dt);
    updateRadio();                  // szünetben (menü, adományozás) nem ütemez új hangot
  } else if (radio.playing && radio.ac) radio.nextTime = radio.ac.currentTime + 0.05;
  if (school.open) tickSchool(dt);                  // az óra ideje szünetben is telik (a tanár nem vár)
  if (tv.open) tv.t += dt;                          // a műsor megy, a játék áll
  if (phone.open) tickPhone(dt);                    // Robi válaszol, a játék áll
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
netConnect();                                       // többjátékos mód, ha a saját szerverről fut a játék
