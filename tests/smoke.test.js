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
;global.G = { player, car, get time(){return time}, set time(v){time=v}, get timeScale(){return timeScale}, nightAmount, skidMarks, smoke, WORLD, lamps, obstacles };`);

const step = n => { for (let i = 0; i < n; i++) { now += 16.7; rafCb(now); } };
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({ code, repeat: false });

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

step(10);
check('a játék elindul és fut', typeof rafCb === 'function');

const x0 = G.player.x;
key('KeyD', true); step(60); key('KeyD', false);
check('a karakter tud gyalogolni', G.player.x - x0 > 100);

G.player.x = G.car.x - 50; G.player.y = G.car.y;
key('KeyE', true); key('KeyE', false);
check('be lehet szállni az autóba', G.player.inCar === true);

// az autót az üres vízszintes útra tesszük, hogy ne ütközzön véletlen akadályba
Object.assign(G.car, { x: 1000, y: G.WORLD / 2, angle: 0, vx: 0, vy: 0 });
const cx0 = G.car.x;
key('KeyW', true); step(120);
check('az autó gyorsul és halad', Math.hypot(G.car.vx, G.car.vy) > 200 && G.car.x > cx0);
const a0 = G.car.angle;
key('KeyA', true); step(30); key('KeyA', false); key('KeyW', false);
check('az autó kanyarodik', Math.abs(G.car.angle - a0) > 0.3);

// sima kanyar kézifék nélkül: nem hagy nyomot
check('sima vezetésnél nincs féknyom', G.skidMarks.length === 0);

// kézifékes hirtelen kanyar: féknyom + füst
key('KeyW', true); step(90);
key('Space', true); key('KeyD', true); step(40);
check('kézifékes kanyarban féknyom keletkezik', G.skidMarks.length > 10);
check('kézifékes kanyarban füstöl', G.smoke.length > 5);
key('Space', false); key('KeyD', false); key('KeyW', false);
step(200);
check('a füst idővel eloszlik', G.smoke.length === 0);
check('a féknyom megmarad', G.skidMarks.length > 10);

key('KeyE', true); key('KeyE', false);
check('ki lehet szállni az autóból', G.player.inCar === false);

check('nagyobb pálya (legalább 10000 px)', G.WORLD >= 10000);
check('vannak villanyoszlopok', G.lamps.length > 0);
check('vannak akadályok (kaktusz, szikla)', G.obstacles.some(o => o.type === 'cactus') && G.obstacles.some(o => o.type === 'rock'));

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
