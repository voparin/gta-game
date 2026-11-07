'use strict';

const VERSION = '0.10.0';         // minden kiadásnál léptetni kell (lásd CHANGELOG.md)

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
window.addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (!e.repeat) toggleMenu(); return; }
  if (menu.open) { if (!e.repeat) menuKey(e.code); return; }
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyT') timeScale = timeScale === 1 ? 60 : 1;
  if (e.code === 'KeyH') toggleStorm();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mousedown', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  if (menu.open) { if (e.button === 0) menuClick(e.clientX, e.clientY); return; }
  if (e.button === 0) mouse.down = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
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
let slimeEnabled = true;    // teszteléshez kikapcsolható

function chunkSeed(cx, cy) {
  return (Math.imul(cx + 1, 73856093) ^ Math.imul(cy + 1, 19349663) ^ 0x5bd1e995) | 0;
}

function generateChunk(cx, cy) {
  const r = rng(chunkSeed(cx, cy));
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const ch = { obstacles: [], lamps: [], dunes: [], slime: [] };
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
      if (insideStation(x, y, rad + 20)) continue;
      ch.obstacles.push({ x, y, r: rad, type, rot, seed });
    }
  };
  place(14, 'cactus', 10, 16);
  place(6, 'rock', 18, 42);

  for (let i = 0; i < 16; i++) {
    ch.dunes.push({ x: x0 + r() * CHUNK, y: y0 + r() * CHUNK, rx: 80 + r() * 220, ry: 30 + r() * 80, rot: r() * Math.PI });
  }

  // nyálkafoltok az utakon
  const makeSlime = (x, y) => {
    const s = { x, y, r: 26 + r() * 20, blobs: [] };
    for (let i = 0; i < 5; i++) s.blobs.push({ dx: (r() - 0.5) * s.r, dy: (r() - 0.5) * s.r, rr: s.r * (0.45 + r() * 0.35) });
    return s;
  };
  for (const R of roadsIn(y0, y0 + CHUNK)) {
    if (r() < 0.45) {
      const x = x0 + r() * CHUNK, y = R + (r() - 0.5) * (ROAD_W - 70);
      if (Math.abs(x - nearestRoad(x)) > ROAD_W) ch.slime.push(makeSlime(x, y));
    }
  }
  for (const R of roadsIn(x0, x0 + CHUNK)) {
    if (r() < 0.45) {
      const y = y0 + r() * CHUNK, x = R + (r() - 0.5) * (ROAD_W - 70);
      if (Math.abs(y - nearestRoad(y)) > ROAD_W) ch.slime.push(makeSlime(x, y));
    }
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

function obstacleAt(x, y, pad = 0) {
  for (const ch of chunksAround(x, y, 50 + pad)) {
    for (const ob of ch.obstacles) if (Math.hypot(x - ob.x, y - ob.y) < ob.r + pad) return true;
  }
  return false;
}

function onSlime(x, y) {
  for (const ch of chunksAround(x, y, 60)) {
    for (const s of ch.slime) if (Math.hypot(x - s.x, y - s.y) < s.r + 6) return true;
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
];
const CAR_MODELS = [
  { name: 'Piros sportkocsi', color: ['#d42020', '#a31515'], len: 72, wid: 36, accel: 420, maxRoad: 620, maxSand: 380, sandDrag: 0.9, fuelUse: 1, price: 0, desc: 'gyors aszfalton' },
  { name: 'Fekete terepjáró', color: ['#2a2a2a', '#151515'], len: 80, wid: 42, accel: 360, maxRoad: 500, maxSand: 470, sandDrag: 0.35, fuelUse: 1.3, price: 3000, desc: 'homokban is gyors' },
  { name: 'Sárga taxi', color: ['#f2c230', '#c09010'], len: 74, wid: 36, accel: 380, maxRoad: 560, maxSand: 340, sandDrag: 0.9, fuelUse: 0.7, price: 800, desc: 'takarékos' },
  { name: 'Kék rakétaautó', color: ['#2f6fd0', '#1f4f9a'], len: 70, wid: 32, accel: 560, maxRoad: 760, maxSand: 330, sandDrag: 1.2, fuelUse: 2, price: 8000, desc: 'nagyon gyors, sokat eszik' },
  { name: 'Zöld pickup', color: ['#3a9a4a', '#257035'], len: 84, wid: 40, accel: 330, maxRoad: 520, maxSand: 420, sandDrag: 0.5, fuelUse: 1.1, price: 1500, desc: 'strapabíró' },
  { name: 'Zöld busz', type: 'bus', color: ['#1e9e48', '#137a35'], len: 130, wid: 46, accel: 260, maxRoad: 460, maxSand: 300, sandDrag: 0.8, fuelUse: 1.6, price: 0, desc: 'csak a tiéd – nagy és erős' },
];
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

const menu = { open: false, sel: 0, skin: loadChoice('gta.skin', SKINS.length),
  carModel: owns(progress.activeCar) ? progress.activeCar : 0, hits: [], note: '' };
const MENU_ROWS = ['Folytatás', 'Szkin', 'Autó'];

function makeCar(x, y, angle, color) {
  return { x, y, angle, vx: 0, vy: 0, r: 28, len: 72, wid: 36, color, skid: false, spin: 0,
    onSlime: false, braking: false, lastWheels: null, health: 6, wrecked: false, ai: null, ...DEFAULT_MODEL };
}

function applyCarModel(c, m) {
  Object.assign(c, { color: m.color, len: m.len, wid: m.wid, r: Math.max(m.len, m.wid * 2) * 0.39,
    accel: m.accel, maxRoad: m.maxRoad, maxSand: m.maxSand, sandDrag: m.sandDrag, fuelUse: m.fuelUse || 1, type: m.type || 'car' });
}

const player = { x: START_X, y: START_Y, angle: 0, r: 12, inCar: false, walk: 0,
  health: 100, dead: 0, arrested: 0, cooldown: 0, kills: 0, lastHit: -99 };
const car = makeCar(START_X + 100, START_Y - 50, 0, ['#d42020', '#a31515']);
applyCarModel(car, CAR_MODELS[menu.carModel]);
car.fuel = 100;          // benzin %
const aiCars = [];      // AI által vezetett autók
const npcs = [];        // gyalogosok ('ped') és banditák ('bandit')
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
const controllable = () => !player.dead && !player.arrested;
let lastCam = { x: player.x, y: player.y };

// Homokvihar
const storm = { level: 0, target: 0, timer: 120 + rand() * 120, angle: rand() * Math.PI * 2, particles: [] };
function toggleStorm() {
  storm.target = storm.target > 0 ? 0 : 1;
  storm.timer = storm.target ? 35 + rand() * 25 : 120 + rand() * 120;
  if (storm.target) storm.angle = rand() * Math.PI * 2;
}

function toggleMenu() {
  menu.open = !menu.open;
  menu.sel = 0;
  menu.note = '';
  if (!menu.open && !owns(menu.carModel)) menu.carModel = progress.activeCar;   // a meg nem vett autó nem marad kiválasztva
  for (const k in keys) keys[k] = false;   // ne ragadjon be egy gomb
  mouse.down = false;
}

function changeChoice(row, delta) {
  if (row === 1) {
    menu.skin = (menu.skin + delta + SKINS.length) % SKINS.length;
    saveChoice('gta.skin', menu.skin);
  } else if (row === 2) {
    menu.carModel = (menu.carModel + delta + CAR_MODELS.length) % CAR_MODELS.length;
    menu.note = '';
    if (owns(menu.carModel)) selectCar(menu.carModel);
  }
}

function selectCar(i) {
  applyCarModel(car, CAR_MODELS[i]);
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
    else if (menu.sel === 2 && !owns(menu.carModel)) buyCar(menu.carModel);
    else changeChoice(menu.sel, 1);
  }
}

function menuClick(x, y) {
  for (const h of menu.hits) {
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      menu.sel = h.row;
      if (h.row === 0) toggleMenu();
      else if (h.buy) buyCar(menu.carModel);
      else changeChoice(h.row, h.delta);
      return;
    }
  }
}

function nearestBoardableBus() {
  return aiCars.find(c => c.citybus && !c.wrecked && dist(c, player) < c.r + 45 && Math.hypot(c.vx, c.vy) < 60);
}

function toggleCar() {
  if (!controllable()) return;
  if (player.riding) {                               // leszállás a busz jobb oldalán (a járda felé)
    const b = player.riding;
    if (Math.hypot(b.vx, b.vy) > 100) { popup('Várd meg, amíg a busz megáll!', '#f66'); return; }
    player.x = b.x - Math.sin(b.angle) * (b.wid / 2 + 22);
    player.y = b.y + Math.cos(b.angle) * (b.wid / 2 + 22);
    player.riding = null;
    collide(player);
    return;
  }
  const bus = !player.inCar && dist(player, car) >= 75 ? nearestBoardableBus() : null;
  if (bus) {
    if (progress.money < BUS_FARE) { popup(`A buszjegy $${BUS_FARE} – nincs elég pénzed!`, '#f66'); return; }
    progress.money -= BUS_FARE;
    saveProgress();
    player.riding = bus;
    popup(`🚌 Felszálltál a buszra (-$${BUS_FARE}) – E: leszállás`, '#f28c1e');
    return;
  }
  if (player.inCar) {
    // kiszállás a vezető oldalán
    player.x = car.x + Math.sin(car.angle) * 40;
    player.y = car.y - Math.cos(car.angle) * 40;
    player.angle = car.angle;
    player.inCar = false;
    collide(player);
  } else if (dist(player, car) < 75) {
    player.inCar = true;
  }
}

function collide(o, bounce) {
  for (const ch of chunksAround(o.x, o.y, o.r + 50)) {
    for (const ob of ch.obstacles) {
      const dx = o.x - ob.x, dy = o.y - ob.y;
      const d = Math.hypot(dx, dy), min = o.r + ob.r;
      if (d < min && d > 0.0001) {
        const nx = dx / d, ny = dy / d;
        o.x = ob.x + nx * min; o.y = ob.y + ny * min;
        if (bounce) {
          const vn = o.vx * nx + o.vy * ny;
          if (vn < 0) { o.vx -= 1.4 * vn * nx; o.vy -= 1.4 * vn * ny; o.vx *= 0.6; o.vy *= 0.6; }
          if (vn < -150) o.crashT = clock;
        }
      }
    }
  }
}

// ===== Spawnolás =====
function spawnNpc(kind, x, y) {
  const p = { kind, x, y, r: 11, angle: rand() * Math.PI * 2, speed: 0, walk: 0,
    health: kind === 'bandit' ? 3 : 1, dead: 0, wanderT: 0, moving: false, flee: 0, fx: 0, fy: 0,
    cooldown: 1 + rand(),
    shirt: kind === 'bandit' ? '#1c1c1c' : PED_SHIRTS[(rand() * PED_SHIRTS.length) | 0],
    head: kind === 'bandit' ? '#b01010' : PED_HAIR[(rand() * PED_HAIR.length) | 0] };
  if (kind === 'ped') assignSidewalk(p);
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

function spawnAiCar(axis, dir, road, along) {
  const ai = { axis, dir, road, speed: 240 + rand() * 120, lastCross: null };
  const lane = laneFor(ai);
  const x = axis === 'h' ? along : lane, y = axis === 'h' ? lane : along;
  const angle = axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const c = makeCar(x, y, angle, CAR_COLORS[(rand() * CAR_COLORS.length) | 0]);
  c.ai = ai;
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

function spawnAround(dt) {
  // a távoliakat eltüntetjük
  for (let i = npcs.length - 1; i >= 0; i--) {
    const p = npcs[i];
    if (dist(p, player) > 2600 || (p.dead && clock - p.dead > 15)) npcs.splice(i, 1);
  }
  for (let i = aiCars.length - 1; i >= 0; i--) {
    const c = aiCars[i];
    if (c.racer || c === player.riding) continue;          // a versenyzők és a busz, amin ülsz, maradnak
    if (dist(c, player) > (c.chasing ? 4500 : 3000)) aiCars.splice(i, 1);
  }
  if (!spawnEnabled || player.dead) return;

  const ring = (a, b) => {
    const ang = rand() * Math.PI * 2, d = a + rand() * (b - a);
    return { x: player.x + Math.cos(ang) * d, y: player.y + Math.sin(ang) * d };
  };
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
  if (alive('bandit') < 2 && rand() < dt * 0.2) {
    const pos = ring(1000, 1400);
    if (!obstacleAt(pos.x, pos.y, 15)) spawnNpc('bandit', pos.x, pos.y);
  }
  if (aiCars.filter(c => c.citybus).length < 2 && rand() < dt) {          // városi buszok
    const axis = rand() < 0.5 ? 'h' : 'v', dir = rand() < 0.5 ? 1 : -1;
    const road = nearestRoad(axis === 'h' ? player.y : player.x);
    const along = (axis === 'h' ? player.x : player.y) + (rand() < 0.5 ? -1 : 1) * (900 + rand() * 700);
    const pos = axis === 'h' ? { x: along, y: road } : { x: road, y: along };
    const d = dist(pos, player);
    if (d > 700 && d < 2400 && ![car, ...aiCars].some(c => dist(c, pos) < 300)) spawnCityBus(axis, dir, road, along);
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
    player.x += (mx / len) * sp * dt;
    player.y += (my / len) * sp * dt;
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
    const roll = rand();
    if (roll < 0.5) {
      const right = roll < 0.25;
      const newAxis = ai.axis === 'h' ? 'v' : 'h';
      const newDir = ai.axis === 'h' ? (right ? ai.dir : -ai.dir) : (right ? -ai.dir : ai.dir);
      const oldRoad = ai.road;
      ai.axis = newAxis; ai.dir = newDir; ai.road = cross;
      ai.lastCross = newAxis + cross + ':' + oldRoad;
    }
  }

  const tx = ai.axis === 'h' ? c.x + ai.dir * 160 : laneFor(ai);
  const ty = ai.axis === 'h' ? laneFor(ai) : c.y + ai.dir * 160;
  const diff = wrapAngle(Math.atan2(ty - c.y, tx - c.x) - c.angle);
  const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  let target = Math.abs(diff) > 0.4 ? 150 : ai.speed;
  if (c.citybus) {                                   // városi busz: a következő megállóban megáll
    if (clock < c.dwellUntil) return { up: false, down: false, steer: 0, handbrake: true };
    const al = ai.axis === 'h' ? c.x : c.y;
    const k = ai.dir > 0 ? Math.ceil((al - 20 - STOP_OFFSET) / STOP_SPACING) : Math.floor((al + 20 - STOP_OFFSET) / STOP_SPACING);   // a kicsit túlfutott megálló is számít
    const stopAt = STOP_OFFSET + k * STOP_SPACING, ahead = (stopAt - al) * ai.dir, stopKey = ai.axis + ai.road + ':' + stopAt;
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

function updateCarPhysics(c, input, dt) {
  const { up, down, steer, handbrake } = input;
  const sandy = !onRoad(c.x, c.y, SIDEWALK_W);   // a járda is szilárd burkolat
  const slimy = slimeEnabled && onSlime(c.x, c.y);
  if (slimy && !c.onSlime) c.spin = (rand() < 0.5 ? -1 : 1) * (2.5 + rand() * 2);   // nyálkán megpördül
  c.onSlime = slimy;
  c.spin *= Math.exp(-1.5 * dt);

  // először fordul az autó, a sebesség viszont nem fordul vele azonnal → oldalirányú csúszás
  const fwd0 = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  c.angle += steer * (handbrake ? 3.4 : 2.6) * dt * clamp(fwd0 / 160, -1, 1)
    + c.spin * dt * clamp(Math.abs(fwd0) / 200, 0, 1);

  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
  let fwd = c.vx * fx + c.vy * fy;
  let lat = -c.vx * fy + c.vy * fx;

  const empty = c.fuel !== undefined && c.fuel <= 0;   // üres tankkal csak vánszorog
  if (up) fwd += (empty ? 120 : c.accel) * dt;
  if (down) fwd -= (fwd > 20 ? 700 : 300) * dt;
  if (handbrake) fwd *= Math.exp(-1.5 * dt);
  fwd *= Math.exp(-(sandy ? c.sandDrag : 0.4) * dt);    // homokban lassabb
  if (!up && !down && Math.abs(fwd) < 5) fwd = 0;
  fwd = clamp(fwd, -180, empty ? 60 : sandy ? c.maxSand : c.maxRoad);
  const grip = slimy ? 0.4 : handbrake ? 1.2 : 12;     // kézifékkel / nyálkán alig tapad → csúszik
  lat *= Math.exp(-grip * dt);

  c.vx = fwd * fx - lat * fy + windX() * 40 * dt;
  c.vy = fwd * fy + lat * fx + windY() * 40 * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.braking = down || handbrake;
  collide(c, true);

  // csúszás: féknyom és füst a hátsó kerekeknél
  const speed = Math.hypot(c.vx, c.vy);
  c.skid = speed > 90 && (Math.abs(lat) > (handbrake || slimy ? 40 : 250) || (handbrake && Math.abs(fwd) > 200));
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
  const all = [car, ...aiCars];
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
      else { p.x = c.x + dx / d * (c.r + p.r); p.y = c.y + dy / d * (c.r + p.r); }
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
  if (byPlayer && p.kind === 'bandit') earn(50, 'bandita');
  alertPeds(p.x, p.y);
}

function damagePlayer(n) {
  if (player.dead) return;
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

function respawn() {
  Object.assign(player, { x: START_X, y: START_Y, angle: 0, inCar: false, riding: null, health: 100, dead: 0, arrested: 0 });
  clearWanted();
  for (let i = aiCars.length - 1; i >= 0; i--) if (aiCars[i].police) aiCars.splice(i, 1);
  Object.assign(car, { x: START_X + 100, y: START_Y - 50, angle: 0, vx: 0, vy: 0, spin: 0, lastWheels: null, fuel: Math.max(car.fuel, 40) });
  for (let i = npcs.length - 1; i >= 0; i--) if (npcs[i].kind === 'bandit') npcs.splice(i, 1);
  message = { text: 'Újraéledtél', until: clock + 2 };
}

// ===== Rendőrség =====
function raiseWanted(level) {
  if (level <= wanted.level) return;
  wanted.level = level;
  wanted.lostTimer = 0;
  message = { text: level === 1 ? 'GYORSHAJTÁS! ÜLDÖZ A RENDŐRSÉG!' : 'RENDŐRRE LŐTTÉL! ★★', until: clock + 2.5, color: '#4af' };
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
  Object.assign(car, { x: race.slot.x, y: race.slot.y, angle, vx: 0, vy: 0, spin: 0 });
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
  if (player.inCar && controllable() && onRoad(car.x, car.y, SIDEWALK_W) && kmh > SPEED_LIMIT) raiseWanted(1);
  if (!wanted.level) return;

  const cops = aiCars.filter(c => c.chasing && !c.wrecked);
  if (policeEnabled && cops.length < POLICE_COUNT[wanted.level] && rand() < dt * 0.8) spawnPolice();

  // lerázás: ha 12 mp-ig egy rendőr sincs 1500 px-en belül
  const t = player.inCar ? car : player;
  if (cops.some(c => dist(c, t) < 1500)) wanted.lostTimer = 0;
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
  if (controllable() && slow && cops.some(c => dist(c, t) < (player.inCar ? 110 : 90))) wanted.bustTimer += dt;
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

function updatePlayerShooting(dt) {
  player.cooldown -= dt;
  const byMouse = mouse.down, byKey = !!keys.KeyF;
  if (!controllable() || player.riding || (!byMouse && !byKey) || player.cooldown > 0) return;
  const src = player.inCar ? car : player;
  let ang = player.inCar ? car.angle : player.angle;
  if (byMouse) {
    const wx = mouse.x - canvas.width / 2 + lastCam.x, wy = mouse.y - canvas.height / 2 + lastCam.y;
    ang = Math.atan2(wy - src.y, wx - src.x);
    if (!player.inCar) player.angle = ang;
  }
  shoot(src.x, src.y, ang, 'player', src.r + 8);
  player.cooldown = 0.14;
}

function updateBullets(dt) {
  const STEPS = 3;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let hit = false;
    for (let s = 0; s < STEPS && !hit; s++) {
      b.x += b.vx * dt / STEPS; b.y += b.vy * dt / STEPS;
      if (obstacleAt(b.x, b.y)) { hit = true; break; }
      if (b.from === 'player') {
        for (const p of npcs) {
          if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < p.r + 3) {
            p.health -= 1;
            if (p.health <= 0) killNpc(p, true); else alertPeds(p.x, p.y);
            hit = true; break;
          }
        }
        if (!hit) for (const c of aiCars) {
          if (Math.hypot(c.x - b.x, c.y - b.y) < c.r) {
            damageCar(c); hit = true;
            if (c.police) raiseWanted(2);   // rendőrre lőni súlyos
            break;
          }
        }
      } else if (!player.dead) {
        const t = player.inCar ? car : player;
        if (Math.hypot(t.x - b.x, t.y - b.y) < t.r + 3) { damagePlayer(player.inCar ? 5 : 10); hit = true; }
      }
    }
    b.life -= dt;
    if (hit || b.life <= 0) bullets.splice(i, 1);
  }
  for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].until < clock) flashes.splice(i, 1);
}

// ===== AI gyalogosok és banditák =====
function updateNpcs(dt) {
  for (const p of npcs) {
    if (p.dead) continue;
    let speed = 0;
    if (p.kind === 'ped') {
      if (p.flee > 0) {
        p.flee -= dt;
        p.angle = Math.atan2(p.y - p.fy, p.x - p.fx);
        speed = 200;
        if (p.flee <= 0) assignSidewalk(p);   // megnyugodva visszamegy a járdára
      } else {
        p.wanderT -= dt;
        if (p.wanderT <= 0) { p.moving = rand() < 0.85; p.wanderT = p.moving ? 4 + rand() * 8 : 1 + rand() * 2; }
        if (p.moving) { walkSidewalk(p); speed = 60; }
      }
    } else {
      const d = dist(p, player);
      if (!player.dead && d < 900) {
        p.angle = Math.atan2(player.y - p.y, player.x - p.x);
        speed = d > 280 ? 110 : 0;
        p.cooldown -= dt;
        if (p.cooldown <= 0 && d < 650) {
          shoot(p.x, p.y, p.angle + (rand() - 0.5) * 0.25, 'enemy', p.r + 8);
          p.cooldown = 0.9 + rand() * 0.6;
        }
      } else if (!player.dead) {
        p.angle = Math.atan2(player.y - p.y, player.x - p.x);
        speed = 90;
      }
    }
    p.x += Math.cos(p.angle) * speed * dt + windX() * 30 * dt;
    p.y += Math.sin(p.angle) * speed * dt + windY() * 30 * dt;
    p.walk += dt * speed / 12;
    collide(p);
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
  const after = levelOf(progress.xp);
  if (after > before) {
    let bonus = 0;
    for (let l = before + 1; l <= after; l++) bonus += l * 50;   // minden átlépett szintért jár bónusz
    progress.money += bonus;
    message = { text: `SZINTLÉPÉS! ${after}. szint`, until: clock + 2.5, color: '#ffd23a' };
    popup(`+$${bonus} szintbónusz`, '#ffd23a');
  }
  saveProgress();
}

// ===== Benzin =====
function updateFuel(dt, input) {
  const wasRefueling = car.refueling;
  car.refueling = false;
  if (!player.inCar) { if (wasRefueling) saveProgress(); return; }
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
  if (controllable() && Math.hypot(player.x - mission.tx, player.y - mission.ty) < 80) {
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
  if (player.dead > 0) {
    player.dead -= dt;
    if (player.dead <= 0) respawn();
  } else if (player.arrested > 0) {
    player.arrested -= dt;
    if (player.arrested <= 0) respawn();
  } else if (player.riding) {                        // utas: a busszal együtt mozog
    const b = player.riding;
    if (!aiCars.includes(b) || b.wrecked) { player.riding = null; collide(player); }
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
  for (const c of aiCars) updateCarPhysics(c, c.chasing ? policeInput(c, dt) : c.racer ? racerInput(c, dt) : aiCarInput(c), dt);
  if (player.riding && controllable()) { player.x = player.riding.x; player.y = player.riding.y; }   // az utas a busz mozgása után kerül a helyére
  updateRace(dt);
  updateWanted(dt);
  carCollisions();
  updateNpcs(dt);
  updateBullets(dt);
  updateSmoke(dt);
  updateSkidMarks();
  spawnAround(dt);
  if (!player.dead && clock - player.lastHit > 4) player.health = Math.min(100, player.health + 4 * dt);  // gyógyul
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

function drawSlime(s) {
  ctx.fillStyle = 'rgba(80,190,50,0.85)';
  ctx.beginPath();
  for (const b of s.blobs) { ctx.moveTo(s.x + b.dx + b.rr, s.y + b.dy); ctx.arc(s.x + b.dx, s.y + b.dy, b.rr, 0, Math.PI * 2); }
  ctx.fill();
  ctx.fillStyle = 'rgba(190,255,140,0.55)';
  ctx.beginPath(); ctx.arc(s.x - s.r * 0.2, s.y - s.r * 0.2, s.r * 0.18, 0, Math.PI * 2); ctx.fill();
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

function drawCar(c, n) {
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
  if (c.police) {                                    // fényhíd: üldözéskor villog
    const on = c.chasing && !c.wrecked, blink = Math.floor(clock * 6) % 2;
    ctx.fillStyle = on && blink ? '#ff2020' : '#701010'; ctx.fillRect(-6, -W / 2 + 4, 8, W / 2 - 4);
    ctx.fillStyle = on && !blink ? '#2060ff' : '#102070'; ctx.fillRect(-6, 0, 8, W / 2 - 4);
    ctx.fillStyle = '#1d2a4a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', -L / 4 - 4, 3); ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawPerson(x, y, angle, walk, shirt, head, gun, legs = '#2b2b4a', hat = null) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const swing = Math.sin(walk) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, 4, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = legs;                                          // lábak
  ctx.fillRect(swing - 4, -7, 8, 5); ctx.fillRect(-swing - 4, 2, 8, 5);
  ctx.fillStyle = shirt;                                         // póló
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0b088';                                     // karok
  ctx.beginPath(); ctx.arc(-swing * 0.6, -13, 3.5, 0, Math.PI * 2); ctx.arc(swing * 0.6, 13, 3.5, 0, Math.PI * 2); ctx.fill();
  if (gun) { ctx.fillStyle = '#222'; ctx.fillRect(2, 11, 14, 4); }  // pisztoly
  ctx.fillStyle = head;                                          // fej (haj)
  ctx.beginPath(); ctx.arc(1, 0, 7, 0, Math.PI * 2); ctx.fill();
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
  ctx.fillStyle = '#fff';
  if (wanted.level) {
    ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#4af' : '#f44';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('★'.repeat(wanted.level) + '☆'.repeat(2 - wanted.level) + ' KÖRÖZÉS', 20, 272);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  }
  // benzin
  ctx.fillText('Benzin', 20, 102);
  ctx.fillStyle = '#333'; ctx.fillRect(80, 91, 150, 13);
  ctx.fillStyle = car.fuel > 40 ? '#3c3' : car.fuel > 20 ? '#ec3' : (Math.floor(clock * 4) % 2 ? '#e33' : '#711');
  ctx.fillRect(80, 91, 150 * car.fuel / 100, 13);
  ctx.fillStyle = '#fff';
  ctx.fillText(car.refueling ? `⛽ Tankolás… ${car.fuel | 0}%` : `${car.fuel | 0}%`, 245, 102);
  // pénz és szint
  const lvl = levelOf(progress.xp), xp0 = xpForLevel(lvl), xp1 = xpForLevel(lvl + 1);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`$${Math.floor(progress.money)}`, 20, 128);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`${lvl}. szint`, 150, 127);
  ctx.fillStyle = '#333'; ctx.fillRect(215, 117, 120, 10);
  ctx.fillStyle = '#ffd23a'; ctx.fillRect(215, 117, 120 * (progress.xp - xp0) / (xp1 - xp0), 10);
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
  if (storm.level > 0.3) { ctx.fillStyle = '#ffb040'; ctx.fillText('⚠ Homokvihar!', 300, 80); ctx.fillStyle = '#fff'; }
  ctx.fillText('WASD/nyilak: mozgás · Shift: futás · E: be/ki', 20, 176);
  ctx.fillText('Space: kézifék (drift = pénz) · Bal klikk / F: lövés', 20, 196);
  ctx.fillText(`H: homokvihar · T: gyors idő (${timeScale}x) · Esc: menü / autóbolt`, 20, 216);
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
  if (mission.active) drawEdgeArrow(mission.tx, mission.ty, '#ffd23a', `${Math.round(Math.hypot(player.x - mission.tx, player.y - mission.ty) / 10)} m`, w, h);
  if (player.inCar && car.fuel < 25) {
    const ns = nearestStation(car.x, car.y);
    if (ns) {
      drawEdgeArrow(ns.x, ns.y, '#ff8a1f', `⛽ ${Math.round(ns.d / 10)} m`, w, h);
      ctx.fillStyle = Math.floor(clock * 3) % 2 ? '#ff8a1f' : '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`⛽ Kevés a benzin! Legközelebbi kút: ${Math.round(ns.d / 10)} m`, w / 2, h - 66);
      ctx.textAlign = 'left';
    }
  }
  if (player.inCar && !car.refueling && car.fuel < 100 && nearPump(car.x, car.y)) {
    ctx.fillStyle = '#ff8a1f'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(progress.money > 0 ? 'Állj meg a tankoláshoz' : 'Nincs pénzed tankolni – szerezz pénzt (szállítás, drift)!', w / 2, h - 40);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  if (player.riding) {
    ctx.fillStyle = '#f28c1e';
    ctx.fillText('🚌 Buszon utazol – E: leszállás (amikor megáll)', w / 2, h - 40);
  } else if (!player.inCar && !player.dead && dist(player, car) < 75) {
    ctx.fillText('Nyomd meg az E-t a beszálláshoz', w / 2, h - 40);
  } else if (!player.inCar && !player.dead && nearestBoardableBus()) {
    ctx.fillStyle = '#f28c1e';
    ctx.fillText(`🚌 E: felszállás a buszra ($${BUS_FARE})`, w / 2, h - 40);
  }
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
  for (const p of npcs) if (p.kind === 'bandit' && !p.dead) { ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ff8a1f';
  for (const st of stationsIn(player.x - RAD, player.y - RAD, player.x + RAD, player.y + RAD)) {
    ctx.fillRect(px((st.rect.x0 + st.rect.x1) / 2) - 4, py((st.rect.y0 + st.rect.y1) / 2) - 4, 8, 8);
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
  const values = [null, SKINS[menu.skin].name, cm.name + (owns(menu.carModel) ? '' : `  🔒 $${cm.price}`)];
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
      if (i === 2 && !owns(menu.carModel)) menu.hits.push({ row: i, delta: 0, buy: true, x: rx + 175, y: ry, w: rw - 240, h: rh });
    }
  }

  // pénz, szint, rekordok, vásárlás
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffd23a';
  ctx.fillText(`$${Math.floor(progress.money)} · ${levelOf(progress.xp)}. szint`, w / 2, py + 296);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`Legjobb drift: ${progress.bestDrift} · Leghosszabb sorozat: ${progress.bestStreak} · Szállítások: ${progress.missions}`, w / 2, py + 318);
  if (!owns(menu.carModel) || menu.note) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = menu.note ? (menu.note.startsWith('Megvetted') ? '#7f7' : '#f66') : progress.money >= cm.price ? '#7f7' : '#f99';
    ctx.fillText(menu.note || (progress.money >= cm.price ? `Enter vagy kattints a névre: megveszed $${cm.price}-ért`
      : `Ehhez az autóhoz még $${cm.price - Math.floor(progress.money)} kell – szállíts, driftelj!`), w / 2, py + 342);
  }

  // előnézet
  const m = cm, sk = SKINS[menu.skin], prevY = py + 400;
  ctx.save(); ctx.translate(px + 150, prevY); ctx.scale(2.2, 2.2);
  drawPerson(0, 0, -Math.PI / 2, clock * 6, sk.shirt, sk.head, true, sk.legs, sk.hat);
  ctx.restore();
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
  const stations = stationsIn(view.x0, view.y0, view.x1, view.y1);
  for (const st of stations) drawStation(st, n);
  drawMissionMarker();
  drawRaceMarkers();
  for (const bs of busStopsIn(view.x0, view.y0, view.x1, view.y1)) drawBusStop(bs);
  if (slimeEnabled) for (const ch of chunks) for (const s of ch.slime) if (inView(s)) drawSlime(s);
  drawSkidMarks(view);
  for (const p of npcs) if (p.dead && inView(p)) drawCorpse(p.x, p.y, p.angle, p.shirt, p.head);
  for (const ch of chunks) {
    for (const o of ch.obstacles) {
      if (!inView(o)) continue;
      if (o.type === 'cactus') drawCactus(o);
      else if (o.type === 'rock') drawRock(o);
    }
  }
  for (const p of npcs) if (!p.dead && inView(p)) drawPerson(p.x, p.y, p.angle, p.walk, p.shirt, p.head, p.kind === 'bandit');
  const sk = SKINS[menu.skin];
  if (player.dead) drawCorpse(player.x, player.y, player.angle, sk.shirt, sk.head);
  else if (!player.inCar && !player.riding) drawPerson(player.x, player.y, player.angle, player.walk, sk.shirt, sk.head, true, sk.legs, sk.hat);
  for (const c of cars) drawCar(c, n);
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const b of bullets) { ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  ctx.fillStyle = '#fff2a0';
  for (const f of flashes) { ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill(); }
  drawSmoke();
  for (const l of lamps) drawLamp(l, n);
  ctx.restore();

  const lights = lamps.concat(stations.flatMap(st => st.pumps.map(p => ({ hx: p.x, hy: p.y }))));
  drawLighting(n, cam, w, h, lights, cars);
  drawStorm(w, h, n);
  drawHud(w, h);
  drawMinimap(w);
  if (menu.open) drawMenu(w, h);
}

// ===== Fő ciklus =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!menu.open) {                // menüben megáll a játék
    time = (time + dt * timeScale) % CYCLE;
    clock += dt;
    update(dt);
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
