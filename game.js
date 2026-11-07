'use strict';

const VERSION = '0.19.0';         // minden kiadásnál léptetni kell (lásd CHANGELOG.md)

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
window.addEventListener('keydown', e => {
  unlockAudio();
  if (donate.open) { if (!e.repeat) donateKey(e.code); return; }
  if (bank.open) { if (!e.repeat) bankKey(e.code); return; }
  if (taxiMenu.open) { if (!e.repeat) taxiMenuKey(e.code); return; }
  if (e.code === 'Escape') { if (!e.repeat) toggleMenu(); return; }
  if (menu.open) { if (!e.repeat) menuKey(e.code); return; }
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyT') timeScale = timeScale === 1 ? 60 : 1;
  if (e.code === 'KeyH') toggleStorm();
  if (e.code === 'KeyB') dropBomb();
  if (e.code === 'KeyX') callTaxi();
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
  if (taxiMenu.open) { if (e.button === 0) taxiMenuClick(e.clientX, e.clientY); return; }
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
          roof: ROOF_COLORS[(h() * ROOF_COLORS.length) | 0], chimney: h(), pub: h() < 0.12, bankRoll: h(), factoryRoll: h() });
        const hs = out[out.length - 1];
        hs.bank = !hs.pub && hs.bankRoll < 0.06;                                 // ~6% bank
        hs.factory = !hs.pub && !hs.bank && hs.factoryRoll < 0.06;               // ~6% gyár
      }
    }
  };
  for (const R of roadsIn(ya - 400, yb + 400)) forRoad('h', R, xa - 200, xb + 200);
  for (const R of roadsIn(xa - 400, xb + 400)) forRoad('v', R, ya - 200, yb + 200);
  return out.filter(o => o.x1 >= xa && o.x0 <= xb && o.y1 >= ya && o.y0 <= yb && !destroyedHouses.has(o.id));
}

// ===== Házak belseje (ADR-0025): külön koordináta-rendszerű szoba, az ajtón át =====
const ROOM_W = 560, ROOM_H = 360, ROOM_WALL = 14;
// ajtó: a ház út felőli oldalának közepén; kint a bejárati úton állsz
function doorOf(hs) {
  const front = HOUSE_GAP + EDGE, a = hs.along;
  const out = front - 14;
  return hs.axis === 'h' ? { x: a, y: hs.road + hs.side * out } : { x: hs.road + hs.side * out, y: a };
}
function nearestDoor() {
  return housesIn(player.x - 120, player.y - 120, player.x + 120, player.y + 120).find(hs => dist(doorOf(hs), player) < 35);
}
// bútorok: két elrendezés (tükrözve is), az ajtó előtti sáv mindig szabad
function furnitureOf(hs) {
  if (hs.pub) return PUB_FURNITURE;
  if (hs.bank) return BANK_FURNITURE;
  if (hs.factory) return FACTORY_FURNITURE;
  const r = rng(chunkSeed(Math.round(hs.x), Math.round(hs.y)));
  const mirror = r() < 0.5, alt = r() < 0.5;
  const items = alt ? [
    { k: 'bed', x: 24, y: 24, w: 130, h: 86 }, { k: 'wardrobe', x: 170, y: 20, w: 120, h: 36 },
    { k: 'table', x: 330, y: 150, w: 110, h: 70 }, { k: 'kitchen', x: ROOM_W - 44, y: 40, w: 24, h: 200 },
    { k: 'plant', x: 30, y: ROOM_H - 70, w: 34, h: 34 }, { k: 'radio', x: 300, y: 22, w: 38, h: 22 },
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
  player.inHouse = { hs, ix: ROOM_W / 2, iy: ROOM_H - 50, furniture: furnitureOf(hs), factory: hs.factory ? newFactory() : null };
  Object.assign(player, doorOf(hs));
  popup(hs.pub ? '🍺 Bementél a kocsmába – a pultnál ihatsz' : hs.bank ? '🏦 Bementél a bankba – a pultnál E' : hs.factory ? '🏭 Bementél a gyárba – pakold a zacskókat (Space)' : '🏠 Bementél a házba – itt nem talál meg a rendőrség', '#7df');
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
  Object.assign(c, { color: m.color, len: m.len, wid: m.wid, r: Math.max(m.len, m.wid * 2) * 0.39,
    accel: m.accel, maxRoad: m.maxRoad, maxSand: m.maxSand, sandDrag: m.sandDrag, fuelUse: m.fuelUse || 1, type: m.type || 'car',
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
const controllable = () => !player.dead && !player.arrested && !(player.passedOut > 0) && !(taxiTrip && taxiTrip.t > 0);
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
  return aiCars.find(c => c.citybus && !c.wrecked && dist(c, player) < c.r + 45 && Math.hypot(c.vx, c.vy) < 60);
}

// az E gomb felirata – PONTOSAN a toggleCar sorrendjét követi
function interactionPrompt() {
  if (player.dead || player.arrested || player.passedOut > 0) return null;
  if (player.riding) return { text: '🚌 Buszon utazol – E: leszállás (amikor megáll)', color: '#f28c1e' };
  if (atBankCounter()) return { text: `🏦 E: bank – hitel ($${LOAN_MIN}–$${LOAN_MAX}) és törlesztés`, color: '#7df' };
  if (player.inHouse && player.inHouse.factory) {
    const F = player.inHouse.factory;
    if (F.carrying) return { text: nearBox() >= 0 ? '📦 Space: berakás a dobozba' : '🥨 Viszel egy zacskót – vidd egy dobozhoz', color: '#ffd23a' };
    if (nearBag()) return { text: '🥨 Space: zacskó felvétele a szalagról', color: '#ffd23a' };
  }
  if (atBar()) return { text: `🍺 1: sör ($${BEER_PRICE}) · 🍷 2: bor ($${WINE_PRICE})`, color: '#ffd23a' };
  if (player.inHouse) return { text: atInnerDoor() ? '🚪 E: kimenés' : 'Menj az ajtóhoz (lent) a kimenéshez', color: '#7df' };
  if (player.inCar) return null;
  if (dist(player, car) < 75) return { text: 'Nyomd meg az E-t a beszálláshoz', color: '#fff' };
  if (taxiReady()) return { text: `🚕 E: taxi – válassz úti célt ($${TAXI_FARE})`, color: '#f2c230' };
  if (nearestBoardableBus()) return { text: `🚌 E: felszállás a buszra ($${BUS_FARE})`, color: '#f28c1e' };   // a toggleCar-ban a busz megelőzi a többit
  const ns = nearestBusStop(player.x, player.y);
  if (nearestDoor()) return { text: '🏠 E: bemenés a házba', color: '#7df' };
  if (nearestRentable()) return { text: `🔑 E: autóbérlés ($${RENT_PRICE})`, color: '#7f7' };
  if (nearestHomeless()) return { text: `🤲 E: adományozás ($${DONATE_MIN}–$${DONATE_MAX})`, color: '#7f7' };
  if (ns && Math.hypot(ns.x - player.x, ns.y - player.y) < 160) return { text: `🚌 Buszmegálló – a busz percenként jár, a következő ~${Math.ceil(nextBusIn())} mp múlva`, color: '#f28c1e' };
  return null;
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
  if (!player.inCar && dist(player, car) >= 75 && taxiReady()) { openTaxiMenu(); return; }
  const bus = !player.inCar && dist(player, car) >= 75 ? nearestBoardableBus() : null;
  if (player.inHouse) { if (atInnerDoor()) exitHouse(); else if (atBankCounter()) openBank(); return; }
  const door = !bus && !player.inCar && dist(player, car) >= 75 ? nearestDoor() : null;
  if (door) { enterHouse(door); return; }
  const lot = !bus && !player.inCar && dist(player, car) >= 75 ? nearestRentable() : null;
  if (lot) { rentCar(lot); return; }
  const homeless = !bus && !player.inCar && dist(player, car) >= 75 ? nearestHomeless() : null;
  if (homeless) { openDonate(homeless); return; }
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

  // először fordul az autó, a sebesség viszont nem fordul vele azonnal → oldalirányú csúszás
  const fwd0 = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  const drunkSteer = c === car && player.inCar ? Math.sin(clock * 1.7) * 0.6 * drunkK() : 0;   // részegen „húz” a kormány
  c.angle += (steer + drunkSteer) * (handbrake ? 3.4 : 2.6) * dt * clamp(fwd0 / 160, -1, 1);

  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
  let fwd = c.vx * fx + c.vy * fy;
  let lat = -c.vx * fy + c.vy * fx;

  const empty = c.fuel !== undefined && c.fuel <= 0;   // üres tankkal csak vánszorog
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
  for (const [label, pred] of [['🏦 Legközelebbi bank', h => h.bank], ['🍺 Legközelebbi kocsma', h => h.pub], ['🏭 Legközelebbi gyár', h => h.factory]]) {
    const hs = nearestHouseOf(pred); if (hs) { const d = doorOf(hs); out.push({ label, x: d.x, y: d.y }); }
  }
  if (race.state === 'idle' && race.offer) out.push({ label: '🏁 Verseny rajt', x: race.offer.x, y: race.offer.y });
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

function respawn() {
  Object.assign(player, { x: START_X, y: START_Y, angle: 0, inCar: false, riding: null, inHouse: null, health: 100, dead: 0, arrested: 0, drunk: 0, passedOut: 0 });
  taxiTrip = null; if (taxi) { const i = aiCars.indexOf(taxi); if (i >= 0) aiCars.splice(i, 1); taxi = null; }
  stopRadio();
  clearWanted();
  for (let i = aiCars.length - 1; i >= 0; i--) if (aiCars[i].police) aiCars.splice(i, 1);
  Object.assign(car, { x: START_X + 100, y: START_Y - 50, angle: 0, vx: 0, vy: 0, lastWheels: null, fuel: Math.max(car.fuel, 40) });
  if (car.rental) car.ownFuel = Math.max(car.ownFuel || 0, 40);   // bérlés közben a saját autó is megkapja a minimumot
  message = { text: 'Újraéledtél', until: clock + 2 };
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
  if (player.inCar && controllable() && onRoad(car.x, car.y, SIDEWALK_W) && kmh > SPEED_LIMIT) raiseWanted(1);
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

function updatePlayerShooting(dt) {
  player.cooldown -= dt;
  const byMouse = mouse.down, byKey = !!keys.KeyF;
  if (!controllable() || player.riding || player.inHouse || (!byMouse && !byKey) || player.cooldown > 0) return;
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
      }
    }
    b.life -= dt;
    if (hit || b.life <= 0) bullets.splice(i, 1);
  }
  for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].until < clock) flashes.splice(i, 1);
}

// ===== AI gyalogosok =====
function updateNpcs(dt) {
  for (const p of npcs) {
    if (p.dead) continue;
    let speed = 0;
    if (p.kind === 'homeless') continue;     // ül a helyén: a szél sem sodorja (nem tudna visszaülni)
    if (p.flee > 0) {
      p.flee -= dt;
      p.angle = Math.atan2(p.y - p.fy, p.x - p.fx);
      speed = 200;
      if (p.flee <= 0) assignSidewalk(p);     // megnyugodva visszamegy a járdára
    } else {
      p.wanderT -= dt;
      if (p.wanderT <= 0) { p.moving = rand() < 0.85; p.wanderT = p.moving ? 4 + rand() * 8 : 1 + rand() * 2; }
      if (p.moving) { walkSidewalk(p); speed = 60; }
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
const TORNADO_CORE = 70;    // ezen belül felszippant
let tornado = null;         // { x, y, age, life, power, spin, wander, flying: [] }
let tornadoEnabled = true;  // teszteléshez kikapcsolható

function spawnTornado(x, y) {
  const ang = rand() * Math.PI * 2, d = 900 + rand() * 600;
  tornado = { x: x ?? player.x + Math.cos(ang) * d, y: y ?? player.y + Math.sin(ang) * d, age: 0, life: 35 + rand() * 20,
    power: 0, spin: 0, wander: rand() * Math.PI * 2, flying: [] };
  popup('🌪 TORNÁDÓ! Menekülj!', '#ff6a3a');
}

function flyAway(kind, data, x, y) { tornado.flying.push({ kind, data, ang: Math.atan2(y - tornado.y, x - tornado.x), t: 0 }); }

// ===== Bomba: B – lerakod, 3 mp múlva robban (autók, emberek, házak; téged is megsebez) =====
const BOMB_FUSE = 3, BOMB_RADIUS = 220, BOMB_MAX = 5, BOMB_REGEN = 60;
const bombs = [];                                  // { x, y, fuse }
const explosions = [];                             // { x, y, born } – a robbanás látványa
const bombInv = { count: 3, regen: BOMB_REGEN };

function dropBomb() {
  if (!controllable() || player.inHouse || player.riding) return false;
  if (bombInv.count <= 0) { popup(`Nincs bombád – percenként kapsz egyet (max ${BOMB_MAX})`, '#f66'); return false; }
  const src = player.inCar ? car : player;
  const bx = player.inCar ? car.x - Math.cos(car.angle) * (car.len / 2 + 20) : player.x;   // autóból hátra ejted
  const by = player.inCar ? car.y - Math.sin(car.angle) * (car.len / 2 + 20) : player.y;
  bombs.push({ x: bx, y: by, fuse: BOMB_FUSE });
  bombInv.count--;
  popup(`💣 Bomba lerakva – ${BOMB_FUSE} mp! Fuss!`, '#ff6a3a');
  return src;
}

function explode(x, y) {
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
  const wasInside = !!player.inHouse;               // a ház ledőlése előtt kell megjegyezni (az kiveszi belőle a játékost)
  for (const hs of housesIn(x - BOMB_RADIUS, y - BOMB_RADIUS, x + BOMB_RADIUS, y + BOMB_RADIUS)) {
    const cx = clamp(x, hs.x0, hs.x1), cy = clamp(y, hs.y0, hs.y1);
    if (Math.hypot(cx - x, cy - y) < BOMB_RADIUS * 0.6) destroyHouse(hs, 'FELROBBANTÁL A HÁZZAL!');
  }
  if (!wasInside && !player.dead) {                 // a játékost is megsebzi (autóban kevésbé)
    const t = player.inCar ? car : player, d = Math.hypot(t.x - x, t.y - y);
    if (d < BOMB_RADIUS) {
      damagePlayer(Math.round((player.inCar ? 60 : 120) * fall(d)));
      if (player.dead) message = { text: 'FELROBBANTÁL!', until: clock + 3, color: '#ff6a3a' };
    }
  }
  if (!player.dead) raiseWanted(2, 'ROBBANTOTTÁL! ★★ ÜLDÖZ A RENDŐRSÉG!');   // halottként nem kap körözést (és a halál üzenete marad)
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
  T.x += (windX() * 80 + Math.cos(T.wander) * 60) * dt;
  T.y += (windY() * 80 + Math.sin(T.wander) * 60) * dt;
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
  if (player.dead > 0) {
    player.dead -= dt;
    if (player.dead <= 0) respawn();
  } else if (player.arrested > 0) {
    player.arrested -= dt;
    if (player.arrested <= 0) respawn();
  } else if (player.passedOut > 0) {
    player.passedOut -= dt;
    if (player.passedOut <= 0) wakeUp();
  } else if (player.inHouse) {
    updateInterior(dt);
    if (player.inHouse && player.inHouse.factory) updateFactory(dt);
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
  for (const c of aiCars) updateCarPhysics(c, c.chasing ? policeInput(c, dt) : c.racer ? racerInput(c, dt) : c.taxicab ? taxiInput(c, dt) : aiCarInput(c), dt);
  updateTaxi(dt);
  if (player.riding && controllable()) { player.x = player.riding.x; player.y = player.riding.y; }   // az utas a busz mozgása után kerül a helyére
  updateRace(dt);
  updateWanted(dt);
  carCollisions();
  updateNpcs(dt);
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

function drawHouse(hs, n) {
  const { x0, y0, x1, y1 } = hs, h = hs.axis === 'h';
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
    const c = { bed: '#e8e2d6', wardrobe: '#6b4a2e', table: '#8a5a32', kitchen: '#cfd3d6', sofa: '#3e6a8a', tv: '#151515', plant: '#3a8a3a' }[f.k];
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
  if (H.factory) for (const b of H.factory.bags) { ctx.fillStyle = b.color; ctx.fillRect(b.x - 8, BELT.y + 8, 16, 24); ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 5, BELT.y + 16, 10, 4); }
  const sk = SKINS[activeSkin];
  drawPerson(H.ix, H.iy, player.angle, player.walk, sk.shirt, sk.head, false, sk.legs, sk.hat, sk.pattern);
  if (H.factory && H.factory.carrying) { ctx.fillStyle = '#f2c230'; ctx.fillRect(H.ix + 8, H.iy - 18, 14, 20); }
  ctx.restore();
  ctx.fillStyle = '#7df'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(H.hs.bank ? '🏦 Bankban vagy – a pultnál E: hitel vagy törlesztés' : H.hs.factory ? `🏭 Gyár – fizetés $${FACTORY_WAGE}/perc · következő: ${Math.ceil(WAGE_PERIOD - H.factory.shift)} mp · ebben a percben bepakolva: ${H.factory.minutePacked}` : H.hs.pub ? `🍺 Kocsmában vagy – a pultnál ihatsz: sör $${BEER_PRICE}, bor $${WINE_PRICE}` : '🏠 Bent vagy a házban – itt nem talál meg a rendőrség, és gyorsabban gyógyulsz', w / 2, oy - 14);
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
  if (c.nitroOn) {                                  // nitróláng a kipufogóból
    const fl = 14 + Math.random() * 10;
    ctx.fillStyle = 'rgba(80,170,255,0.85)';
    for (const sy of [-W / 4, W / 4]) { ctx.beginPath(); ctx.moveTo(-L / 2, sy - 4); ctx.lineTo(-L / 2 - fl, sy); ctx.lineTo(-L / 2, sy + 4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(230,245,255,0.95)';
    for (const sy of [-W / 4, W / 4]) { ctx.beginPath(); ctx.moveTo(-L / 2, sy - 2); ctx.lineTo(-L / 2 - fl * 0.5, sy); ctx.lineTo(-L / 2, sy + 2); ctx.closePath(); ctx.fill(); }
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
  ctx.fillStyle = pattern === 'web' ? shirt : '#e0b088';         // karok (a ruhásnak kesztyűs keze van)
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
  ctx.fillText('Benzin', 20, 102);
  ctx.fillStyle = '#333'; ctx.fillRect(80, 91, 150, 13);
  ctx.fillStyle = car.fuel > 40 ? '#3c3' : car.fuel > 20 ? '#ec3' : (Math.floor(clock * 4) % 2 ? '#e33' : '#711');
  ctx.fillRect(80, 91, 150 * car.fuel / 100, 13);
  ctx.fillStyle = '#fff';
  ctx.fillText(car.refueling ? `⛽ Tankolás… ${car.fuel | 0}%` : `${car.fuel | 0}%`, 245, 102);
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
  ctx.fillText(`💣 ${bombInv.count}/${BOMB_MAX} (B)`, 335, 58); ctx.font = '14px sans-serif'; ctx.fillStyle = '#fff';
  if (tornado && tornado.power > 0.3) drawEdgeArrow(tornado.x, tornado.y, '#ff6a3a', `🌪 ${Math.round(dist(tornado, player) / 10)} m`, w, h);
  ctx.fillText('WASD/nyilak: mozgás · Shift: futás · E: be/ki', 20, 176);
  ctx.fillText('Space: kézifék (drift = pénz) · Bal klikk / F: lövés', 20, 196);
  ctx.fillText(`H: vihar · T: gyors idő (${timeScale}x) · X: taxi · Esc: menü / autóbolt`, 20, 216);
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

function drawTaxiMenu(w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);
  const n = taxiMenu.items.length, PW = 440, PH = 110 + n * 40, px = (w - PW) / 2, py = (h - PH) / 2;
  ctx.fillStyle = 'rgba(30,26,10,0.96)'; ctx.fillRect(px, py, PW, PH);
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3; ctx.strokeRect(px, py, PW, PH);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f2c230'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`🚕 Hova vigyelek? ($${TAXI_FARE})`, w / 2, py + 38);
  taxiMenu.hits = [];
  taxiMenu.items.forEach((it, i) => {
    const y = py + 56 + i * 40, sel = i === taxiMenu.sel;
    ctx.fillStyle = sel ? 'rgba(242,194,48,0.25)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 20, y, PW - 40, 32);
    if (sel) { ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.strokeRect(px + 20, y, PW - 40, 32); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(it.label, px + 34, y + 22);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif'; ctx.fillText(`${it.km} km`, px + PW - 34, y + 22);
    taxiMenu.hits.push({ i, x: px + 20, y, w: PW - 40, h: 32 });
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  ctx.fillText('↑↓: választás · Enter: indulás · Esc: mégse', w / 2, py + PH - 14); ctx.textAlign = 'left';
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
  const stations = stationsIn(view.x0, view.y0, view.x1, view.y1);
  for (const st of stations) drawStation(st, n);
  drawMissionMarker();
  drawRaceMarkers();
  for (const hs of destroyedHouses.values()) if (hs.x1 > view.x0 && hs.x0 < view.x1 && hs.y1 > view.y0 && hs.y0 < view.y1) drawRubble(hs);
  for (const hs of housesIn(view.x0, view.y0, view.x1, view.y1)) drawHouse(hs, n);
  for (const l of lotsIn(view.x0, view.y0, view.x1, view.y1)) drawParkingLot(l);
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
  for (const p of npcs) {
    if (p.dead || !inView(p)) continue;
    if (p.kind === 'homeless') drawHomeless(p);
    else drawPerson(p.x, p.y, p.angle, p.walk, p.shirt, p.head, false);
  }
  const sk = SKINS[activeSkin];
  if (player.dead) drawCorpse(player.x, player.y, player.angle, sk.shirt, sk.head);
  else if (!player.inCar && !player.riding && !player.inHouse) drawPerson(player.x, player.y, player.angle, player.walk, sk.shirt, sk.head, true, sk.legs, sk.hat, sk.pattern);
  for (const c of cars) drawCar(c, n);
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const b of bullets) { ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  ctx.fillStyle = '#fff2a0';
  for (const f of flashes) { ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill(); }
  drawSmoke();
  drawTornado();
  drawBombs();
  for (const l of lamps) drawLamp(l, n);
  ctx.restore();

  const lights = lamps.concat(stations.flatMap(st => st.pumps.map(p => ({ hx: p.x, hy: p.y }))));
  ctx.save(); applyDrunkSway(w, h);                                                   // a fények a világgal együtt himbálóznak
  drawLighting(n, cam, w, h, lights, cars);
  ctx.restore();
  drawStorm(w, h, n);
  if (player.inHouse) drawInterior(w, h);
  if (player.passedOut > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(player.passedOut / 2, 0.6, 0.95)})`; ctx.fillRect(0, 0, w, h); }   // ájulás: elsötétül
  else if (drunkK() > 0) { ctx.fillStyle = `rgba(160,60,140,${0.12 * drunkK()})`; ctx.fillRect(0, 0, w, h); }
  drawHud(w, h);
  drawMinimap(w);
  if (menu.open) drawMenu(w, h);
  if (donate.open) drawDonate(w, h);
  if (bank.open) drawBank(w, h);
  if (taxiMenu.open) drawTaxiMenu(w, h);
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
  if (!menu.open && !donate.open && !bank.open && !taxiMenu.open) {   // menüben, adományozás és banki ügyintézés közben megáll a játék
    time = (time + dt * timeScale) % CYCLE;
    clock += dt;
    update(dt);
    updateRadio();                  // szünetben (menü, adományozás) nem ütemez új hangot
  } else if (radio.playing && radio.ac) radio.nextTime = radio.ac.currentTime + 0.05;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
