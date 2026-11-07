'use strict';

// ===== Beállítások =====
const WORLD = 10000;             // a sivatag mérete (pixel)
const START_X = WORLD / 2 - 300, START_Y = WORLD / 2 - 100;   // kezdőhely
const HALF_CYCLE = 30 * 60;      // 30 perc nappal, 30 perc éjszaka (másodperc)
const CYCLE = HALF_CYCLE * 2;
const FADE = 120;                // alkonyat / hajnal hossza (másodperc)
const ROAD_W = 160;

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
let timeScale = 1;
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyT') timeScale = timeScale === 1 ? 60 : 1;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

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
const onRoad = (x, y, m = 0) =>
  Math.abs(y - WORLD / 2) < ROAD_W / 2 + m || Math.abs(x - WORLD / 2) < ROAD_W / 2 + m;

// ===== Világ =====
const obstacles = [];   // {x, y, r, type}
const lamps = [];       // {x, y, hx, hy}
const dunes = [];

// Villanyoszlopok mindkét út mentén, mindkét oldalon váltakozva
for (let i = 150; i < WORLD; i += 320) {
  if (Math.abs(i - WORLD / 2) < 200) continue;           // kereszteződésben nincs
  const side = (i / 320) % 2 < 1 ? -1 : 1;
  const off = ROAD_W / 2 + 22;
  // vízszintes út
  lamps.push({ x: i, y: WORLD / 2 + side * off, hx: i, hy: WORLD / 2 + side * (off - 40) });
  // függőleges út
  lamps.push({ x: WORLD / 2 + side * off, y: i, hx: WORLD / 2 + side * (off - 40), hy: i });
}
for (const l of lamps) obstacles.push({ x: l.x, y: l.y, r: 8, type: 'lamp' });

// Kaktuszok és sziklák (nem az úton)
function placeRandom(count, type, rMin, rMax) {
  let placed = 0;
  while (placed < count) {
    const x = 60 + rand() * (WORLD - 120), y = 60 + rand() * (WORLD - 120);
    const r = rMin + rand() * (rMax - rMin);
    if (onRoad(x, y, r + 40)) continue;
    if (Math.hypot(x - START_X, y - START_Y) < 250) continue;  // kezdőhely szabadon
    obstacles.push({ x, y, r, type, rot: rand() * Math.PI * 2, seed: rand() });
    placed++;
  }
}
placeRandom(1400, 'cactus', 10, 16);
placeRandom(560, 'rock', 18, 42);

for (let i = 0; i < 1600; i++) {
  dunes.push({ x: rand() * WORLD, y: rand() * WORLD, rx: 80 + rand() * 220, ry: 30 + rand() * 80, rot: rand() * Math.PI });
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
const player = { x: START_X, y: START_Y, angle: 0, r: 12, inCar: false, walk: 0 };
const car = { x: START_X + 100, y: START_Y - 50, angle: 0, vx: 0, vy: 0, r: 28, len: 72, wid: 36, skid: false };
const skidMarks = [];   // féknyomok: {x1, y1, x2, y2, born}
const smoke = [];       // füstrészecskék: {x, y, vx, vy, r, life, max}
const MAX_SKID = 4000, MAX_SMOKE = 300;
const SKID_LIFE = 5;    // ennyi másodperc alatt tűnik el egy féknyom
let clock = 0;          // valós idő másodpercben (a T gomb nem gyorsítja)
let lastWheels = null;
let time = 60;   // játékidő másodpercben: nappal indulunk

function toggleCar() {
  if (player.inCar) {
    // kiszállás a vezető oldalán
    const px = car.x + Math.sin(car.angle) * 40;
    const py = car.y - Math.cos(car.angle) * 40;
    player.x = px; player.y = py; player.angle = car.angle;
    player.inCar = false;
    collide(player);
  } else if (Math.hypot(player.x - car.x, player.y - car.y) < 75) {
    player.inCar = true;
  }
}

function collide(o, bounce) {
  for (const ob of obstacles) {
    const dx = o.x - ob.x, dy = o.y - ob.y;
    const d = Math.hypot(dx, dy), min = o.r + ob.r;
    if (d < min && d > 0.0001) {
      const nx = dx / d, ny = dy / d;
      o.x = ob.x + nx * min; o.y = ob.y + ny * min;
      if (bounce) {
        const vn = o.vx * nx + o.vy * ny;
        if (vn < 0) { o.vx -= 1.4 * vn * nx; o.vy -= 1.4 * vn * ny; o.vx *= 0.6; o.vy *= 0.6; }
      }
    }
  }
  o.x = clamp(o.x, o.r, WORLD - o.r);
  o.y = clamp(o.y, o.r, WORLD - o.r);
}

// ===== Frissítés =====
function updatePlayer(dt) {
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    const sp = keys.ShiftLeft || keys.ShiftRight ? 260 : 140;
    player.x += (mx / len) * sp * dt;
    player.y += (my / len) * sp * dt;
    player.angle = Math.atan2(my, mx);
    player.walk += dt * sp / 12;
  }
  collide(player);
  // ne lehessen átsétálni az autón
  const dx = player.x - car.x, dy = player.y - car.y, d = Math.hypot(dx, dy);
  if (d < player.r + car.r && d > 0) {
    player.x = car.x + (dx / d) * (player.r + car.r);
    player.y = car.y + (dy / d) * (player.r + car.r);
  }
}

function updateCar(dt) {
  const drive = player.inCar;
  const up = drive && (keys.KeyW || keys.ArrowUp);
  const down = drive && (keys.KeyS || keys.ArrowDown);
  const steer = drive ? ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0) : 0;
  const handbrake = drive && keys.Space;
  const sandy = !onRoad(car.x, car.y);

  // először fordul az autó, a sebesség viszont nem fordul vele azonnal → oldalirányú csúszás
  const fwd0 = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);
  car.angle += steer * (handbrake ? 3.4 : 2.6) * dt * clamp(fwd0 / 160, -1, 1);

  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  let fwd = car.vx * fx + car.vy * fy;
  let lat = -car.vx * fy + car.vy * fx;

  if (up) fwd += 420 * dt;
  if (down) fwd -= (fwd > 20 ? 700 : 300) * dt;
  if (handbrake) fwd *= Math.exp(-1.5 * dt);
  fwd *= Math.exp(-(sandy ? 0.9 : 0.4) * dt);          // homokban lassabb
  if (!up && !down && Math.abs(fwd) < 5) fwd = 0;
  fwd = clamp(fwd, -180, sandy ? 380 : 620);
  lat *= Math.exp(-(handbrake ? 1.2 : 12) * dt);         // kézifékkel alig tapad → driftel

  car.vx = fwd * fx - lat * fy;
  car.vy = fwd * fy + lat * fx;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  collide(car, true);
  if (player.inCar) { player.x = car.x; player.y = car.y; }

  // csúszás: féknyom és füst a hátsó kerekeknél
  const speed = Math.hypot(car.vx, car.vy);
  car.skid = speed > 90 && (Math.abs(lat) > (handbrake ? 40 : 250) || (handbrake && Math.abs(fwd) > 200));
  const wheels = [-1, 1].map(side => {
    const lx = -car.len / 3, ly = side * (car.wid / 2 - 3);
    return { x: car.x + fx * lx - fy * ly, y: car.y + fy * lx + fx * ly };
  });
  if (car.skid) {
    if (lastWheels) {
      for (let i = 0; i < 2; i++) {
        skidMarks.push({ x1: lastWheels[i].x, y1: lastWheels[i].y, x2: wheels[i].x, y2: wheels[i].y, born: clock });
      }
      if (skidMarks.length > MAX_SKID) skidMarks.splice(0, skidMarks.length - MAX_SKID);
    }
    for (const w of wheels) {
      if (rand() < 0.6) smoke.push({
        x: w.x, y: w.y,
        vx: -car.vx * 0.1 + (rand() - 0.5) * 40, vy: -car.vy * 0.1 + (rand() - 0.5) * 40,
        r: 6 + rand() * 6, life: 0, max: 1 + rand() * 0.8,
      });
    }
    if (smoke.length > MAX_SMOKE) smoke.splice(0, smoke.length - MAX_SMOKE);
  }
  lastWheels = car.skid ? wheels : null;
}

function updateSmoke(dt) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.life += dt;
    if (p.life >= p.max) { smoke.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
    p.r += 22 * dt;                                    // tágul
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
  const c = WORLD / 2;
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, c - ROAD_W / 2, WORLD, ROAD_W);
  ctx.fillRect(c - ROAD_W / 2, 0, ROAD_W, WORLD);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, c - ROAD_W / 2 + 6, WORLD, 3); ctx.fillRect(0, c + ROAD_W / 2 - 9, WORLD, 3);
  ctx.fillRect(c - ROAD_W / 2 + 6, 0, 3, WORLD); ctx.fillRect(c + ROAD_W / 2 - 9, 0, 3, WORLD);
  ctx.fillStyle = '#f2c230';
  for (let i = Math.floor(view.x0 / 80) * 80; i < view.x1; i += 80)
    if (Math.abs(i - c) > ROAD_W) ctx.fillRect(i, c - 2, 40, 4);
  for (let i = Math.floor(view.y0 / 80) * 80; i < view.y1; i += 80)
    if (Math.abs(i - c) > ROAD_W) ctx.fillRect(c - 2, i, 4, 40);
}

function updateSkidMarks() {
  let old = 0;
  while (old < skidMarks.length && clock - skidMarks[old].born >= SKID_LIFE) old++;
  if (old) skidMarks.splice(0, old);
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
    ctx.fillStyle = `rgba(225,222,215,${a})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCar(n) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  const L = car.len, W = car.wid;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L / 2 + 5, -W / 2 + 5, L, W);
  ctx.fillStyle = '#111';
  for (const [x, y] of [[-L / 3, -W / 2 - 3], [L / 4, -W / 2 - 3], [-L / 3, W / 2 - 3], [L / 4, W / 2 - 3]]) ctx.fillRect(x - 8, y, 16, 6);
  ctx.fillStyle = '#d42020';
  ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 8); ctx.fill();
  ctx.fillStyle = '#a31515'; ctx.fillRect(-L / 2 + 10, -W / 2 + 4, L - 26, W - 8);
  ctx.fillStyle = '#7fb6d9';
  ctx.fillRect(L / 2 - 26, -W / 2 + 5, 10, W - 10);    // szélvédő
  ctx.fillRect(-L / 2 + 8, -W / 2 + 6, 6, W - 12);     // hátsó ablak
  ctx.fillStyle = n > 0.2 ? '#fffbe0' : '#f5f0c8';
  ctx.fillRect(L / 2 - 4, -W / 2 + 3, 4, 7); ctx.fillRect(L / 2 - 4, W / 2 - 10, 4, 7);
  ctx.fillStyle = (player.inCar && (keys.KeyS || keys.ArrowDown || keys.Space)) ? '#ff3030' : '#801010';
  ctx.fillRect(-L / 2, -W / 2 + 3, 3, 7); ctx.fillRect(-L / 2, W / 2 - 10, 3, 7);
  ctx.restore();
}

function drawPlayer() {
  if (player.inCar) return;
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
  const swing = Math.sin(player.walk) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, 4, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b4a';                                     // lábak
  ctx.fillRect(swing - 4, -7, 8, 5); ctx.fillRect(-swing - 4, 2, 8, 5);
  ctx.fillStyle = '#2f6fd0';                                     // póló
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0b088';                                     // karok
  ctx.beginPath(); ctx.arc(-swing * 0.6, -13, 3.5, 0, Math.PI * 2); ctx.arc(swing * 0.6, 13, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2615';                                     // fej (haj)
  ctx.beginPath(); ctx.arc(1, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLighting(n, cam, w, h) {
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

  for (const l of lamps) {
    const x = sx(l.hx), y = sy(l.hy);
    if (x < -250 || y < -250 || x > w + 250 || y > h + 250) continue;
    hole(x, y, 220, 1);
  }
  // fényszórók
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const cx = sx(car.x + fx * car.len / 2), cy = sy(car.y + fy * car.len / 2);
  const reach = 380;
  const g = lctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
  g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = g;
  lctx.beginPath(); lctx.moveTo(cx, cy);
  lctx.arc(cx, cy, reach, car.angle - 0.4, car.angle + 0.4); lctx.closePath(); lctx.fill();
  hole(sx(car.x), sy(car.y), 70, 0.4);
  if (!player.inCar) hole(sx(player.x), sy(player.y), 70, 0.45);

  ctx.drawImage(light, 0, 0);

  // meleg fényudvar a lámpák körül
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lamps) {
    const x = sx(l.hx), y = sy(l.hy);
    if (x < -250 || y < -250 || x > w + 250 || y > h + 250) continue;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 200);
    gg.addColorStop(0, `rgba(255,200,120,${0.35 * n})`); gg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 200, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // alkonyati / hajnali narancs árnyalat
  const dusk = Math.sin(Math.PI * n);
  if (dusk > 0.01) { ctx.fillStyle = `rgba(255,120,40,${0.18 * dusk})`; ctx.fillRect(0, 0, w, h); }
}

function fmt(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function drawHud(w) {
  const isDay = time < HALF_CYCLE;
  const left = isDay ? HALF_CYCLE - time : CYCLE - time;
  const speed = Math.round(Math.hypot(car.vx, car.vy) / 4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(10, 10, 330, 104);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${isDay ? '☀ Nappal' : '☾ Éjszaka'} – ${isDay ? 'éjszakáig' : 'nappalig'}: ${fmt(left / timeScale)}`, 20, 34);
  ctx.font = '14px sans-serif';
  ctx.fillText(player.inCar ? `Sebesség: ${speed} km/h` : 'Gyalog', 20, 56);
  ctx.fillText('WASD/nyilak: mozgás · Shift: futás · E: be/ki', 20, 78);
  ctx.fillText(`Space: kézifék · T: gyorsított idő (${timeScale}x)`, 20, 98);

  if (!player.inCar && Math.hypot(player.x - car.x, player.y - car.y) < 75) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nyomd meg az E-t a beszálláshoz', w / 2, canvas.height - 40);
    ctx.textAlign = 'left';
  }
}

function drawMinimap(w) {
  const S = 150, k = S / WORLD, x0 = w - S - 12, y0 = 12;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0 - 4, y0 - 4, S + 8, S + 8);
  ctx.fillStyle = '#c9a964'; ctx.fillRect(x0, y0, S, S);
  ctx.fillStyle = '#555';
  ctx.fillRect(x0, y0 + WORLD / 2 * k - 2, S, 4); ctx.fillRect(x0 + WORLD / 2 * k - 2, y0, 4, S);
  ctx.fillStyle = '#d42020'; ctx.fillRect(x0 + car.x * k - 3, y0 + car.y * k - 3, 6, 6);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + player.x * k, y0 + player.y * k, 3, 0, Math.PI * 2); ctx.fill();
}

function render() {
  const w = canvas.width, h = canvas.height;
  const cam = { x: clamp(player.x, w / 2, WORLD - w / 2), y: clamp(player.y, h / 2, WORLD - h / 2) };
  const view = { x0: cam.x - w / 2 - 100, x1: cam.x + w / 2 + 100, y0: cam.y - h / 2 - 100, y1: cam.y + h / 2 + 100 };
  const inView = o => o.x > view.x0 && o.x < view.x1 && o.y > view.y0 && o.y < view.y1;
  const n = nightAmount(time);

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(Math.round(w / 2 - cam.x), Math.round(h / 2 - cam.y));

  ctx.fillStyle = sandPattern; ctx.fillRect(0, 0, WORLD, WORLD);
  ctx.fillStyle = 'rgba(190,150,85,0.25)';
  for (const d of dunes) {
    if (d.x + d.rx < view.x0 || d.x - d.rx > view.x1 || d.y + d.rx < view.y0 || d.y - d.rx > view.y1) continue;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, Math.PI * 2); ctx.fill();
  }
  drawRoads(view);
  drawSkidMarks(view);
  for (const o of obstacles) {
    if (!inView(o)) continue;
    if (o.type === 'cactus') drawCactus(o);
    else if (o.type === 'rock') drawRock(o);
  }
  drawPlayer();
  drawCar(n);
  drawSmoke();
  for (const l of lamps) if (inView(l)) drawLamp(l, n);
  ctx.restore();

  drawLighting(n, cam, w, h);
  drawHud(w);
  drawMinimap(w);
}

// ===== Fő ciklus =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time = (time + dt * timeScale) % CYCLE;
  clock += dt;
  if (!player.inCar) updatePlayer(dt);
  updateCar(dt);
  updateSmoke(dt);
  updateSkidMarks();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
