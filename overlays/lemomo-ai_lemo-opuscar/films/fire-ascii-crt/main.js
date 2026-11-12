// THE DISCOVERY OF FIRE — ASCII / CRT, 5 s, one continuous shot.
// P1 green phosphor carries the night; the one soft second colour (warm fire orange, the demo's "earth" channel) switches on with the burst.
// Pipeline (from the style demo): paint a grayscale "negative" aligned to the character grid (R = phosphor, G = fire colour, B = flame flag),
// average per cell, pick a glyph by ink density, stamp it from the VT323 atlas, then the monochrome CRT post.
import { W, H, initTerm, glyph, text, cursor, makeRamp, pick, cellsFromImage } from '/styles/ascii-crt/demo/term.js';
import { makeCRT } from '/styles/ascii-crt/demo/crt.js';
import { fbm3 } from '/styles/ascii-crt/demo/art.js';

// ---------- output canvas: 16:9 at the viewport's size (scene stays 1920×1080) ----------
const out = document.getElementById('c');
{
  const vw = window.innerWidth || 1920, vh = window.innerHeight || 1080;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = Math.min(vw, vh * 16 / 9) * dpr; w = Math.max(640, Math.round(w));
  out.width = w; out.height = Math.round(w * 9 / 16);
}
const crt = makeCRT(out);
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const g = scene.getContext('2d');
await initTerm();

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const hsh = (a, b = 0) => { let h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const TAU = .12, decay = (t, tOff) => t < tOff ? 1 : Math.exp(-(t - tOff) / TAU);

const DUR = 5;
const T = { smoke0: 1.9, spark: 3.0, burst: 3.15, full: 3.9, raise0: 3.55, raise1: 4.35 };

// ---------- world layout (1920×1080 world units) ----------
const GROUND = 905;                    // where the caveman and the fire stand
const FIRE = { x: 1330, y: GROUND };
const DX = 125;                        // the caveman stands clear of the hill, against sky and ground
const MOON = { x: 560, y: 255, r: 58 };
const rockTop = x => x > 720 ? 1e9 : 330 + 380 * Math.pow(x / 720, 1.7) + 26 * Math.sin(x * .021) + 14 * Math.sin(x * .057 + 1);
const ridgeTop = x => 712 - 34 * Math.sin(x * .0042 + .6) - 18 * Math.sin(x * .013 + 2) - 8 * Math.sin(x * .041);
const CAVE = { x: 290, y: GROUND + 10, rx: 185, ry: 440 };
const inCave = (x, y) => y < CAVE.y && ((x - CAVE.x) / CAVE.rx) ** 2 + ((y - CAVE.y) / CAVE.ry) ** 2 < 1;

// ---------- precomputed albedo (quarter resolution): R = night picture incl. sky glow, G = surfaces the fire can light ----------
const AS = 4, AW = W / AS, AH = H / AS;
const albR = document.createElement('canvas'), albG = document.createElement('canvas');
albR.width = albG.width = AW; albR.height = albG.height = AH;
{
  const xr = albR.getContext('2d'), xg = albG.getContext('2d');
  const dr = xr.createImageData(AW, AH), dg = xg.createImageData(AW, AH);
  for (let py = 0; py < AH; py++) for (let px = 0; px < AW; px++) {
    const x = (px + .5) * AS, y = (py + .5) * AS, o = (py * AW + px) * 4;
    let r = 0, s = 0;
    const rt = rockTop(x), hz = ridgeTop(x);
    if (y > rt) {                                         // the cave hill
      const n = fbm3(x / 70, y / 70, 1.3, 4), c = fbm3(x / 22, y / 40, 7.1, 3);
      let v = .16 + .42 * n + (c > .62 ? .18 : 0) - (c < .32 ? .1 : 0);
      v *= .55 + .45 * clamp(1 - (y - rt) / 520);         // moon from above: higher faces brighter
      if (y - rt < 16) v = .95;                           // moonlit rim against the sky
      if (inCave(x, y)) {
        const e = ((x - CAVE.x) / CAVE.rx) ** 2 + ((y - CAVE.y) / CAVE.ry) ** 2;
        v = e > .86 ? .85 * (x < CAVE.x ? 1 : .55) : .05 * fbm3(x / 40, y / 40, 3, 3); // lit arch lip, black mouth
      }
      r = v; s = v;
    } else if (y > hz) {                                  // ground, far = darker and sparser
      const d = clamp((y - hz) / (H - hz));
      const n = fbm3(x / 60, y / 26, 4.2, 4);
      let v = (.1 + .38 * d) * (.55 + .9 * n);
      if (y - hz < 6) v = .55;                            // thin bright horizon line
      const pb = hsh(Math.floor(x / 26), Math.floor(y / 14)); if (pb > .93 && d > .3) v += .3; // pebbles
      r = v; s = v;
    } else {                                              // sky: faint glow above the horizon so silhouettes read
      r = .13 * Math.pow(clamp(1 - (hz - y) / 300), 1.5);
      s = .03 * Math.pow(clamp(1 - (hz - y) / 200), 2);
    }
    dr.data[o] = clamp(r) * 255; dr.data[o + 3] = 255;
    dg.data[o + 1] = clamp(s) * 255; dg.data[o + 3] = 255;
  }
  xr.putImageData(dr, 0, 0); xg.putImageData(dg, 0, 0);
}
const STARS = [];
for (let k = 0; STARS.length < 70 && k < 2000; k++) {
  const x = hsh(k, 1.7) * W, y = hsh(k, 5.3) * 640;
  if (y < rockTop(x) - 20 && y < ridgeTop(x) - 60 && Math.hypot(x - MOON.x, y - MOON.y) > 110) STARS.push({ x, y, b: .3 + .6 * hsh(k, 9.1), ph: hsh(k, 2.2) * 6.28 });
}

// ---------- the negative: grid-aligned offscreen canvases ----------
const SX = 3, SY = 6;
const mk = () => { const c = document.createElement('canvas'); c.width = 520; c.height = 320; return c; };
const NEG = mk(), TMP = mk(), FIG = mk(), LIT = mk();
const ng = NEG.getContext('2d', { willReadFrequently: true }), tg = TMP.getContext('2d'), fg = FIG.getContext('2d'), lg = LIT.getContext('2d');
const RAMP = makeRamp('.:-=+*#%@');
const RAMP_F = makeRamp(".:'^FIRE");

// ---------- the caveman: joints for "crouched, rubbing" and "kneeling up, arms raised" ----------
const POSE_C = {
  hip: [910, 805], sho: [1020, 655], head: [1083, 612],
  kF: [1050, 742], fF: [1037, 905], kB: [997, 770], fB: [953, 905],
  eF: [1110, 752], eB: [1087, 760],
};
const POSE_R = {
  hip: [925, 800], sho: [973, 595], head: [997, 528],
  kF: [1055, 770], fF: [1060, 905], kB: [983, 860], fB: [900, 905],
  eF: [1060, 520], eB: [915, 528],
};
function pose(t) {
  const r = eio(seg(t, T.raise0, T.raise1));
  const P = {};
  for (const k in POSE_C) P[k] = [lerp(POSE_C[k][0], POSE_R[k][0], r), lerp(POSE_C[k][1], POSE_R[k][1], r)];
  // rubbing: the stick tip saws back and forth on the hearth board, faster as he gets close
  const amp = 24 * (1 - seg(t, 2.95, 3.25)), ph = 2 * Math.PI * (3.2 * t + .55 * t * t);
  const tip = [1172 + DX + amp * Math.sin(ph), 896];
  const hand = [tip[0] - 100, tip[1] - 112];
  const jit = (1 - r) * amp * .25 * Math.sin(ph);
  P.hF = [lerp(hand[0], 978 + DX, r), lerp(hand[1], 410, r)];
  P.hB = [lerp(hand[0] - 16, 768 + DX, r), lerp(hand[1] + 8, 420, r)];
  P.sho[0] += jit * .3; P.head[0] += jit * .2;
  P.eF[0] += (1 - r) * amp * .5 * Math.sin(ph); P.eB[0] += (1 - r) * amp * .5 * Math.sin(ph);
  // the stick: held in his hands, then dropped by the hearth
  const dp = eo(seg(t, T.raise0, T.raise0 + .3));
  P.s0 = [lerp(hand[0] - 10, 1080 + DX, dp), lerp(hand[1] - 12, 908, dp)];
  P.s1 = [lerp(tip[0], 1150 + DX, dp), lerp(tip[1], 912, dp)];
  P.tip = tip; P.r = r;
  return P;
}
function figShapes(c, P, col, dx = 0, dy = 0) {
  c.save(); c.translate(dx, dy);
  c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  const L = (a, b, w) => { c.lineWidth = w; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); };
  const L3 = (a, b, d, w) => { c.lineWidth = w; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.stroke(); };
  L3(P.hip, P.kB, P.fB, 50);                                   // far leg
  c.lineWidth = 24; c.beginPath(); c.moveTo(...P.fB); c.lineTo(P.fB[0] + 38, P.fB[1] - 2); c.stroke();
  L3(P.sho, P.eB, P.hB, 30);                                   // far arm
  // torso: hunched back as a fat curved stroke
  c.lineWidth = 104; c.beginPath(); c.moveTo(...P.hip);
  const mid = [(P.hip[0] + P.sho[0]) / 2 - 30 * (1 - P.r), (P.hip[1] + P.sho[1]) / 2 - 18 * (1 - P.r)];
  c.quadraticCurveTo(mid[0], mid[1], P.sho[0], P.sho[1]); c.stroke();
  L(P.sho, [P.head[0] - 10, P.head[1] + 20], 46);             // neck
  // head: skull, heavy brow, nose, jaw with beard, shaggy hair
  const [hx, hy] = P.head, la = -.35 * (1 - P.r) + .25 * P.r;  // looks down at the hearth, then up
  c.save(); c.translate(hx, hy); c.rotate(la);
  c.beginPath(); c.ellipse(0, 0, 44, 48, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(36, -12, 16, 10, 0, 0, 7); c.fill();   // brow ridge
  c.beginPath(); c.moveTo(42, -6); c.lineTo(58, 14); c.lineTo(40, 20); c.fill(); // nose
  c.beginPath(); c.ellipse(22, 34, 26, 22, .3, 0, 7); c.fill();   // jaw + beard
  c.lineWidth = 9;
  for (let k = 0; k < 7; k++) { const a = -2.9 + k * .38; c.beginPath(); c.moveTo(Math.cos(a) * 40, Math.sin(a) * 42); c.lineTo(Math.cos(a) * 62 - 8, Math.sin(a) * 60 + 4); c.stroke(); }
  c.restore();
  L3(P.hip, P.kF, P.fF, 56);                                   // near leg
  c.lineWidth = 26; c.beginPath(); c.moveTo(...P.fF); c.lineTo(P.fF[0] + 42, P.fF[1] - 2); c.stroke();
  L3(P.sho, P.eF, P.hF, 34);                                   // near arm
  c.beginPath(); c.arc(P.hF[0], P.hF[1], 20, 0, 7); c.fill();  // fist
  c.restore();
}

// ---------- fire ----------
function fireH(t) {
  const gr = eo(seg(t, T.burst, T.full));
  const kick = t > 3.45 ? .16 * Math.exp(-(t - 3.45) / .35) : 0;
  return 640 * gr * (1 + kick) + (t > T.spark && t < T.burst + .3 ? 26 * seg(t, T.spark, T.burst) : 0);
}
function warmAt(t) { return eo(seg(t, T.burst - .05, T.full)) * (.9 + .1 * Math.sin(t * 13.1) * Math.sin(t * 7.7 + 1)); }
function paintFire(c, t) {
  const Hf = fireH(t); if (Hf < 2) return;
  const bx = FIRE.x, by = FIRE.y + 4;
  c.globalCompositeOperation = 'lighter';
  const tongue = (x, w, h, sway, a) => {
    const gr = c.createLinearGradient(0, by, 0, by - h);
    gr.addColorStop(0, `rgba(0,255,255,${a})`); gr.addColorStop(.55, `rgba(0,255,255,${a * .8})`); gr.addColorStop(1, `rgba(0,255,255,${a * .5})`);
    c.fillStyle = gr; c.beginPath(); c.moveTo(x - w / 2, by);
    c.bezierCurveTo(x - w * .62, by - h * .35, x + sway * .4 - w * .2, by - h * .7, x + sway, by - h);
    c.bezierCurveTo(x + sway * .4 + w * .2, by - h * .7, x + w * .62, by - h * .35, x + w / 2, by); c.fill();
  };
  const wd = clamp(Hf / 160) * .8 + .2;
  for (let k = 0; k < 7; k++) {
    const h0 = (k + .5) / 7 + (hsh(k, .3) - .5) * .08, x = bx + (h0 - .5) * 210 * wd, w = (60 + 40 * hsh(k, .9)) * wd;
    const h = Hf * (.72 + .28 * hsh(k, 1.7)) * (1 - Math.pow(Math.abs(x - bx) / 115, 2) * .55) * (.82 + .18 * Math.sin(t * (8 + 5 * hsh(k, 2.1)) + k * 1.9));
    tongue(x, w, h, Math.sin(t * 4.3 + k * 1.7) * 30 * wd + Math.sin(t * 11 + k) * 10, .3);
  }
  for (let k = 0; k < 4; k++) {                               // white-hot core
    const x = bx + (hsh(k, 4.4) - .5) * 70 * wd;
    tongue(x, 42 * wd, Hf * (.55 + .1 * Math.sin(t * 9 + k * 2.3)), Math.sin(t * 6 + k) * 12, .45);
  }
  for (let k = 0; k < 10; k++) {                              // detached licks rising off the tips
    const f = (t * 1.6 + hsh(k, 6.6)) % 1;
    const y = by - Hf * (.65 + .55 * f), x = bx + (hsh(k, 7.7) - .5) * 120 * wd + Math.sin(t * 5 + k) * 18;
    const s = 22 * (1 - f) * wd;
    if (s > 2) { c.fillStyle = `rgba(0,255,255,${.6 * (1 - f)})`; c.beginPath(); c.ellipse(x, y, s * .6, s * 1.2, 0, 0, 7); c.fill(); }
  }
  // embers & logs at the base
  c.fillStyle = `rgba(0,255,255,${.8 * clamp(Hf / 100)})`; c.beginPath(); c.ellipse(bx, by - 6, 125 * wd, 18, 0, 0, 7); c.fill();
}
function paintSmoke(c, t) {
  const a = seg(t, T.smoke0, T.smoke0 + .4) * (1 - seg(t, 3.4, 4.3)); if (a <= 0) return;
  const len = 360 * eo(seg(t, T.smoke0, 3.1)) + 120 * seg(t, 3.1, 4.3);
  const P = pose(t), x0 = P.tip[0], y0 = P.tip[1] - 6;
  c.globalCompositeOperation = 'lighter';
  for (let s = 0; s < len; s += 5) {
    const q = s / 380;
    const x = x0 + Math.sin(s * .022 - t * 2.4) * s * .16 + s * .12 + 6 * Math.sin(s * .07 + t * 3);
    const y = y0 - s - (t > 3.2 ? (t - 3.2) * 120 : 0);
    const v = .62 * a * (1 - q) * (q < .04 ? q / .04 : 1);
    if (v <= 0) continue;
    c.fillStyle = `rgba(255,0,0,${v})`; c.beginPath(); c.arc(x, y, 5 + s * .03, 0, 7); c.fill();
  }
}

// ---------- camera = grid scale ----------
function camera(t) {
  const p = eio(seg(t, 0, DUR));
  const z = lerp(1, 1.2, p);
  return { z, cx: lerp(990, 1110, p), cy: lerp(565, 610, p), cw: 12 * z };
}

function frame(t) {
  const cam = camera(t), cw = cam.cw;
  const ox = 960 - Math.ceil(960 / cw) * cw, oy = 540 - Math.ceil(540 / (2 * cw)) * 2 * cw;
  const cols = Math.ceil((W - ox) / cw), rows = Math.ceil((H - oy) / (2 * cw));
  const nw = cols * SX, nh = rows * SY;
  const k = cam.z * SX / cw;
  const tr = [k, 0, 0, k, (960 - cam.cx * cam.z - ox) * SX / cw, (540 - cam.cy * cam.z - oy) * SX / cw];
  const toNeg = (x, y) => [x * k + tr[4], y * k + tr[5]];
  const warm = warmAt(t);
  const P = pose(t);

  // 1. night picture (R) — moonlight dims as the fire takes over
  ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'source-over'; ng.globalAlpha = 1; ng.fillStyle = '#000'; ng.fillRect(0, 0, NEG.width, NEG.height);
  ng.setTransform(...tr);
  ng.globalCompositeOperation = 'lighter';
  ng.globalAlpha = 1 - .35 * warm; ng.drawImage(albR, 0, 0, W, H);
  ng.globalAlpha = 1;
  // moon: a crescent with a faint halo
  { const hg = ng.createRadialGradient(MOON.x, MOON.y, MOON.r, MOON.x, MOON.y, MOON.r * 3.2); hg.addColorStop(0, 'rgba(60,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
    ng.fillStyle = hg; ng.beginPath(); ng.arc(MOON.x, MOON.y, MOON.r * 3.2, 0, 7); ng.fill();
    ng.globalCompositeOperation = 'source-over';
    ng.fillStyle = 'rgb(250,0,0)'; ng.beginPath(); ng.arc(MOON.x, MOON.y, MOON.r, 0, 7); ng.fill();
    ng.fillStyle = 'rgb(0,0,0)'; ng.beginPath(); ng.arc(MOON.x + 26, MOON.y - 12, MOON.r * .9, 0, 7); ng.fill(); }

  // 2. firelight (G): surfaces × radial light, the caveman's long shadow thrown towards the cave
  if (warm > .01) {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.fillStyle = '#000'; tg.fillRect(0, 0, TMP.width, TMP.height);
    tg.setTransform(...tr); tg.drawImage(albG, 0, 0, W, H);
    tg.globalCompositeOperation = 'multiply';
    const lgd = tg.createRadialGradient(FIRE.x, FIRE.y - 120, 0, FIRE.x, FIRE.y - 120, 1150);
    const v = x => { const c = Math.round(255 * clamp(x)); return `rgb(${c},${c},${c})`; };
    lgd.addColorStop(0, v(1.0 * warm)); lgd.addColorStop(.18, v(.95 * warm)); lgd.addColorStop(.45, v(.55 * warm)); lgd.addColorStop(.8, v(.18 * warm)); lgd.addColorStop(1, v(0));
    tg.fillStyle = lgd; tg.fillRect(-200, -200, W + 400, H + 400);
    tg.globalCompositeOperation = 'source-over'; tg.fillStyle = 'rgba(0,0,0,.8)';
    tg.beginPath(); tg.moveTo(P.fF[0] + 30, GROUND - 2); tg.lineTo(P.fB[0] - 10, GROUND - 4); tg.lineTo(330, GROUND + 40); tg.lineTo(520, GROUND + 120); tg.closePath(); tg.fill();
    // the shadow climbs the cave wall
    tg.beginPath(); tg.ellipse(470, GROUND - 210 - 80 * P.r, 70, 150 + 60 * P.r, -.5, 0, 7); tg.fill();
    ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'lighter'; ng.drawImage(TMP, 0, 0);
    ng.setTransform(...tr);
  }

  // 3. smoke curl (R)
  paintSmoke(ng, t);

  // 4. the stick + hearth board
  ng.globalCompositeOperation = 'source-over';
  ng.strokeStyle = `rgb(${Math.round(140 - 60 * warm)},${Math.round(200 * warm)},0)`; ng.lineCap = 'round';
  ng.lineWidth = 16; ng.beginPath(); ng.moveTo(1095 + DX, GROUND + 6); ng.lineTo(1300 + DX, GROUND + 2); ng.stroke();
  ng.lineWidth = 13; ng.beginPath(); ng.moveTo(...P.s0); ng.lineTo(...P.s1); ng.stroke();

  // 5. the caveman: moon rim on his back, fire on his face and chest
  const figPass = (ctx, col, dx, dy) => { ctx.setTransform(...tr); figShapes(ctx, P, col, dx, dy); };
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-over'; fg.clearRect(0, 0, FIG.width, FIG.height);
  figPass(fg, `rgb(${Math.round(255 - 100 * warm)},0,0)`, 0, 0);
  fg.globalCompositeOperation = 'source-atop'; figPass(fg, 'rgb(0,0,0)', 22, 18);
  if (warm > .01) {
    const lit = (wash, edge) => {
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, LIT.width, LIT.height);
      figPass(lg, '#fff', 0, 0);
      if (edge) { lg.globalCompositeOperation = 'destination-out'; figPass(lg, '#fff', -edge, 5); }
      lg.globalCompositeOperation = 'source-in'; lg.setTransform(...tr);
      const gd = lg.createRadialGradient(FIRE.x, FIRE.y - 160, 0, FIRE.x, FIRE.y - 160, 560);
      gd.addColorStop(0, `rgb(0,${Math.round(255 * clamp(wash * warm))},0)`); gd.addColorStop(1, `rgb(0,${Math.round(255 * clamp(wash * warm * .45))},0)`);
      lg.fillStyle = gd; lg.fillRect(0, 0, W, H);
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'lighter'; fg.drawImage(LIT, 0, 0);
    };
    lit(.1, 0); lit(1.0, 24);
  }
  ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'source-over'; ng.drawImage(FIG, 0, 0);
  ng.setTransform(...tr);

  // 6. spark, then fire (G + flame flag in B)
  if (t >= T.spark && t < T.burst + .4) {
    const a = Math.exp(-(t - T.spark) / .12) + .5 * seg(t, T.spark + .08, T.burst);
    const sg = ng.createRadialGradient(P.tip[0], P.tip[1] - 6, 0, P.tip[0], P.tip[1] - 6, 46);
    sg.addColorStop(0, `rgba(0,255,255,${clamp(a)})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ng.globalCompositeOperation = 'lighter'; ng.fillStyle = sg; ng.fillRect(P.tip[0] - 50, P.tip[1] - 56, 100, 100);
  }
  paintFire(ng, t);

  // 7. negative → cells → glyphs
  const id = ng.getImageData(0, 0, nw, nh);
  const C = cellsFromImage(id.data, nw, cols, rows, SX, SY);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const n = j * cols + i, A = C.A[n], E = C.E[n], F = C.N[n] > .25;
    const m = Math.max(A, E);
    if (m < .05) continue;
    const lv = pick(F ? RAMP_F : RAMP, Math.pow(clamp(m * 1.06), 1.15), i, j, .7);
    if (lv.ch === ' ') continue;
    const chan = E / (A + E) > .3 + .4 * hsh(i * .37, j * .71) ? 1 : 0;
    const boost = m > .88 ? 1 + (m - .88) * 3.5 : 1;
    glyph(g, lv.ch, ox + i * cw, oy + j * 2 * cw, cw, lv.a * boost * (chan ? 1 : .95), chan);
  }
  // stars snap to cells and twinkle
  for (const s of STARS) {
    const [u, v] = toNeg(s.x, s.y); const i = Math.floor(u / SX), j = Math.floor(v / SY);
    if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
    const tw = .65 + .35 * Math.sin(t * 2.2 + s.ph);
    glyph(g, s.b > .8 ? '+' : '.', ox + i * cw, oy + j * 2 * cw, cw, s.b * tw * (1 - .4 * warm), 0);
  }
  // sparks at ignition + embers rising from the fire (particles: the only off-grid motion)
  if (t >= T.spark) {
    for (let q = 0; q < 46; q++) {
      const ts = q < 8 ? T.spark : T.burst + hsh(q, 3.3) * 1.8, age = t - ts, life = q < 8 ? .35 : .9 + .5 * hsh(q, 8.8);
      if (age < 0 || age > life) continue;
      const ang = q < 8 ? -Math.PI * (.1 + .8 * hsh(q, 1.1)) : -Math.PI / 2 + (hsh(q, 2.2) - .5) * .7;
      const sp = q < 8 ? 260 : 220 + 200 * hsh(q, 4.4);
      const x0 = q < 8 ? P.tip[0] : FIRE.x + (hsh(q, 5.5) - .5) * 120, y0 = q < 8 ? P.tip[1] : FIRE.y - fireH(t) * .5;
      const wx = x0 + Math.cos(ang) * sp * age + Math.sin(age * 6 + q) * 14, wy = y0 + Math.sin(ang) * sp * age;
      const sx = (wx - cam.cx) * cam.z + 960, sy = (wy - cam.cy) * cam.z + 540;
      const a = clamp(age / .05) * (1 - age / life);
      glyph(g, q % 3 ? '.' : "'", sx - cw / 2, sy - cw, cw * .8, a * 1.2, 1);
    }
  }

  // 8. status line: a cursor waits; at the burst the one word is typed by hand
  const by = 1004;
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, by - 22, W, H - by + 22);
  g.globalCompositeOperation = 'lighter';
  const V = { ox: 150, oy: by, cw: 17 };
  text(g, '-'.repeat(95), 0, -1, { ox: 120, oy: by - 6, cw: 17 }, .22);
  const keys = [3.5, 3.66, 3.74, 3.95], word = 'FIRE';
  const nk = keys.filter(k => t >= k).length;
  text(g, '>', 0, 0, V, .8);
  if (nk) text(g, word.slice(0, nk), 2, 0, V, 1, 1);
  const bl = t % .6, cOn = bl < .3 ? 1 : decay(bl, .3);
  cursor(g, 2 + nk, 0, V, cOn * .8, nk ? 1 : 0);

  return { earth: [1.0, .55, .16] };
}

const GREEN = { amber: [.36, 1.0, .46], amberLo: [.1, .62, .22], amberHi: [.86, 1.0, .9], glass: [.012, .026, .017], earth: [1.0, .55, .16] };
window.DUR = DUR;
window.render = t => {
  t = clamp(+t || 0, 0, DUR - 1e-6);
  frame(t);
  crt.render(scene, Math.round(t * 24), Object.assign({}, GREEN, { glow: .6, halo: .24 }));
};
window.READY = true;
