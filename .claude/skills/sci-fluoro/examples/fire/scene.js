// "The science of fire" under the microscope (5 s, 1920x1080).
// Beats: friction (wood fibres heat up) -> fire triangle (three channel rings) -> combustion (molecules + flame).
import * as F from './engine/index.js';
const { E, T, clamp, lerp, seg, lin, env, smooth, beats, TAU, frac, HUD } = F;

const DUR = 5;
const BT = beats({ friction: [0, 1.5], triangle: [1.5, 3], combustion: [3, 5] });
const CAPS = [
  { title: 'FRICTION MAKES HEAT', sub: 'two wood surfaces rubbing, 10x' },
  { title: 'THE FIRE TRIANGLE', sub: 'heat + fuel + oxygen, all at once' },
  { title: 'COMBUSTION', sub: 'wood gas burns in oxygen' },
];
const focus = F.focusTrack([{ at: 1.5, peak: 14 }, { at: 3.0, peak: 14 }], { intro: 0.6, introPeak: 10 });
const cam = F.driftCam({ amp: 9, dur: DUR });

// ---------- beat 1: friction ----------
const CY = 646;                                            // board top surface
const ramp = (t) => smooth((t - 0.1) / 0.3) * (1 - smooth((t - 1.15) / 0.3));
const rub = (t) => Math.sin((t - 0.1) * TAU * 2.6) * 38 * ramp(t);
const heat = (t) => seg(t, 0.1, 1.1, E.outSine);
const stickA = (t) => 1 - smooth((t - 1.25) / 0.4);
const DIR = [-Math.cos(0.7), -Math.sin(0.7)];              // upper stick runs up-left at 40 deg

function sticks(L, t) {
  const a = stickA(t); if (a <= 0) return;
  const m = L.main, h = heat(t), bloomIn = smooth(t / 0.5);
  // lower stick: 6 fibres
  for (let k = 0; k < 6; k++) {
    const y = CY + 16 + k * 31, x0 = 330 + ((k * 37) % 50), x1 = 1590 - ((k * 23) % 44);
    F.tube(m, x0, y, x1, y, 26, 'green', { a: a * bloomIn * (0.95 - k * 0.07), seed: 10 + k, t, septa: 9, wob: 5, pits: 7, pitCh: k % 2 ? 'cyan' : 'green' });
  }
  // upper stick: 5 fibres, its worn end flat on the board, sliding with rub(t)
  const cx = 960 + rub(t);
  for (let k = 0; k < 5; k++) {
    const sx = cx + (k - 2) * 40, sy = CY - 14, L1 = 470 + ((k * 53) % 60);
    F.tube(m, sx, sy, sx + DIR[0] * L1, sy + DIR[1] * L1, 24, 'green', { a: a * bloomIn * 0.9, seed: 30 + k, t, septa: 5, wob: 5, pits: 4 });
  }
  // heated cells along the contact: magenta puncta in the top rows, fading with distance
  for (let i = 0; i < 26; i++) {
    const x = 960 + (i - 12.5) * 22, d = Math.abs(x - 960) / (60 + 260 * h);
    const g = clamp(1 - d) * h;
    F.dot(m, x, CY + 16 + (i % 2) * 31, 9, 'magenta', a * g * 0.9, 'core');
  }
  // friction marks: streaks that accumulate on the board surface
  const R = F.rng(77);
  for (let i = 0; i < 18; i++) {
    const ti = 0.3 + i * 0.045, x = 960 + (R() - 0.5) * 150, y = CY + 2 + R() * 12, len = 28 + R() * 60;
    const u = smooth((t - ti) / 0.15); if (u <= 0) continue;
    F.glowStroke(m, [[x - len / 2, y], [x - len / 2 + len * u, y + (R() - 0.5) * 4]], 'yellow', { a: a * (0.45 + 0.55 * h), lw: 2, halo: 10 });
  }
  // sparks and wood dust thrown off the contact
  F.embers(m, t, { x: 960, y: CY - 4, spread: 160, rise: 230, n: 26, seed: 5, a: a * clamp(h * 1.6), chs: ['yellow', 'yellow', 'magenta'], r: [3, 7], speed: 0.9, sway: 70 });
}
function heatSpot(L, t) {
  const h = heat(t), toFlame = smooth((t - 1.2) / 0.5), m = L.main;
  const x = 960, y = lerp(CY, 680, toFlame), r = 40 + 150 * h, a = 1 - smooth((t - 1.45) / 0.35);
  if (a <= 0) return;
  F.blob(m, x, y, r, 'magenta', { a: a * (0.2 + 0.55 * h), seed: 3, t, amp: 0.18 });
  F.dot(m, x, y, 30 + 50 * h, 'yellow', a * clamp((h - 0.4) * 1.8), 'core');
  for (let k = 0; k < 4; k++) {                           // thermal waves
    const ph = frac(t * 0.8 + k / 4);
    F.ring(m, x, y, 50 + ph * 280, 'magenta', { a: a * (1 - ph) * h * 0.4, seed: 60 + k, t, amp: 0.06, lw: 2, halo: 16, fill: 0 });
  }
}

// ---------- beat 2: fire triangle ----------
const RR = 190, RC = [[960, 430], [820, 672], [1100, 672]];
const RINGS = [
  { name: 'HEAT', ch: 'magenta', sub: 'CH4 640nm', dir: [0, -1] },
  { name: 'FUEL', ch: 'green', sub: 'CH2 488nm · wood', dir: [-0.87, 0.5] },
  { name: 'OXYGEN', ch: 'cyan', sub: 'CH1 405nm · air', dir: [0.87, 0.5] },
];
const ringIn = (t, i) => lin(t, 1.6 + i * 0.15, 0.65);
const ringOut = (t) => smooth((t - 2.85) / 0.45);
const allLit = (t) => Math.exp(-Math.pow((t - 2.58) / 0.12, 2));          // flash when the triangle closes

function triangle(L, t) {
  const m = L.main, out = ringOut(t); if (t < 1.5 || out >= 1) return;
  RINGS.forEach((rg, i) => {
    const u = ringIn(t, i); if (u <= 0) return;
    const mv = E.outCubic(u), d = (1 - mv) * 420, s = 1 + out * 0.5;
    const cx = RC[i][0] + rg.dir[0] * d, cy = RC[i][1] + rg.dir[1] * d;
    const ex = cx + (cx - 960) * out * 0.6, ey = cy + (cy - 590) * out * 0.6, a = (1 - out) * (1 + allLit(t) * 0.6);
    // contents (dim), clipped to the ring
    m.save(); m.beginPath(); m.arc(ex, ey, RR * s * 0.96, 0, TAU); m.clip();
    const ca = a * smooth((u - 0.4) / 0.6) * 0.55;
    if (i === 0) for (let k = 0; k < 5; k++) {           // rising heat shimmer
      const xs = ex - 120 + k * 60, pts = Array.from({ length: 20 }, (_, j) => [xs + Math.sin(j * 0.7 - t * 6 + k) * 10, ey + 160 - j * 17]);
      F.glowStroke(m, pts, 'magenta', { a: ca * 0.7, lw: 2, halo: 12 });
    }
    if (i === 1) for (let k = 0; k < 4; k++) {           // wood fibres
      const y = ey - 75 + k * 42;
      F.tube(m, ex - 170, y + 20, ex + 170, y - 20, 28, 'green', { a: ca, seed: 80 + k, t, septa: 4 });
    }
    if (i === 2) [[-70, -60], [60, -80], [-40, 60], [80, 40], [0, -5]].forEach(([ox, oy], k) =>
      F.molecule(m, 'O2', ex + ox + Math.sin(t * 1.3 + k) * 12, ey + oy + Math.cos(t * 1.1 + k * 2) * 10, t, { s: 0.7, a: ca * 1.4, rot: t * 0.6 + k, seed: 90 + k }));
    m.restore();
    F.ring(m, ex, ey, RR * s, rg.ch, { p: E.inOutSine(u), a, seed: 40 + i, t, amp: 0.03 });
  });
}

// ---------- beat 3: combustion ----------
const flameSize = (t) => (t < 1.5 ? 0.7 * smooth((t - 1.25) / 0.4) : 0.7 + 0.1 * seg(t, 1.5, 1.4) + 1.0 * seg(t, 3.0, 1.5));
const flameBase = (t) => lerp(680, 760, seg(t, 3.0, 0.8));
const REACT = [
  { mol: 'CH4', from: [330, 470], to: [870, 650], seed: 1, label: 'CH4', sub: 'methane (wood gas)' },
  { mol: 'O2', from: [270, 720], to: [890, 720], seed: 2, label: 'O2', sub: 'oxygen' },
  { mol: 'O2', from: [470, 870], to: [910, 760], seed: 3, label: 'O2', sub: '' },
];
const PROD = [
  { mol: 'CO2', at: 3.7, from: [1010, 560], to: [1440, 420], seed: 4 },
  { mol: 'H2O', at: 3.85, from: [1000, 620], to: [1560, 640], seed: 5 },
  { mol: 'H2O', at: 4.0, from: [990, 680], to: [1380, 800], seed: 6 },
];
const reactPos = (r, t) => F.lerp2(r.from, r.to, seg(t, 3.15, 0.9, E.inOutCubic));
const reactA = (t) => smooth((t - 3.0) / 0.35) * (1 - smooth((t - 3.85) / 0.3));
const prodU = (p, t) => seg(t, p.at, 0.85, E.outCubic);

function combustion(L, t) {
  const m = L.main; if (t < 2.9) return;
  REACT.forEach((r, i) => { const [x, y] = reactPos(r, t); F.molecule(m, r.mol, x, y, t, { a: reactA(t), seed: r.seed, rot: t * 0.5 + i, vib: 2 + 6 * seg(t, 3.4, 0.6) }); });
  PROD.forEach((p) => {
    const u = prodU(p, t); if (t < p.at) return;
    const [x, y] = F.lerp2(p.from, p.to, u);
    F.molecule(m, p.mol, x, y, t, { a: smooth((t - p.at) / 0.4), s: lerp(0.6, 1, u), seed: p.seed, rot: -t * 0.4 + p.seed, vib: 4 });
  });
  // a steady stream of wood gas and air keeps feeding the flame (unlabelled, dimmer)
  for (let k = 0; k < 5; k++) {
    const ph = frac((t - 3.2) * 0.32 + k / 5), on = smooth((t - 3.6) / 0.5), y0 = 380 + ((k * 137) % 460);
    const x = lerp(140, 880, E.inOutSine(ph)), y = lerp(y0, 700, E.inOutSine(ph));
    F.molecule(m, k % 2 ? 'O2' : 'CH4', x, y, t, { s: 0.7, a: on * Math.sin(Math.PI * ph) * 0.55, seed: 20 + k, rot: t * 0.7 + k, vib: 3 });
  }
  // soot and embers rising out of the flame
  const g = seg(t, 3.0, 1.2), H = 260 * flameSize(t);
  F.embers(m, t, { x: 960, y: flameBase(t) - H * 0.55, spread: 150, rise: 360, n: 40, seed: 9, a: g, chs: ['yellow', 'yellow', 'magenta'], r: [4, 9], speed: 0.45, sway: 90 });
}

// ---------- draw ----------
function draw(L, t) {
  F.haze(L.bg, t, { chs: t < 1.5 ? ['green', 'magenta'] : ['cyan', 'magenta'], a: 0.05 });
  F.bokeh(L.bg, t, { n: 18, seed: 3, a: 0.12, chs: t < 1.5 ? ['green', 'yellow'] : ['cyan', 'green', 'magenta'] });
  sticks(L, t); heatSpot(L, t); triangle(L, t);
  F.flame(L.main, 960, flameBase(t), flameSize(t), t, { a: 1 + allLit(t) * 0.5 });
  combustion(L, t);
}

// ---------- HUD ----------
const SCALE = [[160, '200 µm', '10x / 0.40'], [160, '1 mm', '4x / 0.13'], [160, '1 nm', '100x / 1.40 oil']];
function hud(ctx, t) {
  const b = BT.at(t).i, on = (k) => [[0.15, 1, 0.6, 1], [1, 1, 0.6, 1], [1, 1, 1, 1]][b][k];
  F.hudFrame(ctx, t, {
    channels: [['cyan', 'OXYGEN', on(0)], ['green', 'FUEL', on(1)], ['yellow', 'CARBON', on(2)], ['magenta', 'HEAT', on(3)]],
    scale: SCALE[b].slice(0, 2), objective: SCALE[b][2], z: 12.4 + b * 3.1 + focus(t) * 0.35, a: smooth(t / 0.4),
  });
  F.caption(ctx, t, BT, CAPS);
  // beat 1
  const tA = 1 - smooth((t - 1.2) / 0.3);
  if (tA > 0) {
    const temp = Math.round(24 + 330 * heat(t));
    F.tag(ctx, 960, CY + 4, 1180, 470, 'FRICTION POINT', { sub: `CH4 640nm · ${temp} °C`, ch: 'magenta', p: lin(t, 0.05, 0.4) * tA });
    F.tag(ctx, 520, CY + 47, 400, 560, 'WOOD FIBRES', { sub: 'CH2 488nm · cellulose', ch: 'green', p: lin(t, 0.1, 0.4) * tA, align: 'right' });
  }
  // beat 2
  const tB = 1 - smooth((t - 2.8) / 0.25);
  if (t > 1.5 && tB > 0) {
    const pos = [[1055, 265, 1180, 236, 'left'], [641, 737, 560, 800, 'right'], [1279, 737, 1360, 800, 'left']];
    RINGS.forEach((rg, i) => { const [ax, ay, lx, ly, al] = pos[i]; F.tag(ctx, ax, ay, lx, ly, rg.name, { sub: rg.sub, ch: rg.ch, p: lin(t, 1.85 + i * 0.15, 0.5) * tB, align: al }); });
  }
  // beat 3
  if (t > 3) {
    REACT.forEach((r) => {
      const [x, y] = reactPos(r, t), a = env(t, 3.2, 3.85, 0.3, 0.25);
      F.chem(ctx, r.label, x, y + 66, { size: F.TYPE.label, align: 'center', a, weight: 700 });
      if (r.sub) F.mono(ctx, r.sub, x, y + 98, { align: 'center', a, color: F.CH[r.mol === 'CH4' ? 'yellow' : 'cyan'].hex });
    });
    F.tag(ctx, 1440, 420, 1560, 330, 'CO2', { sub: 'carbon dioxide', ch: 'cyan', p: lin(t, 3.95, 0.45) });
    F.tag(ctx, 1560, 640, 1650, 560, 'H2O', { sub: 'water vapour', ch: 'green', p: lin(t, 4.1, 0.45) });
    F.tag(ctx, 930, 300, 640, 300, 'SOOT + EMBERS', { sub: 'CH3 561nm · hot carbon', ch: 'yellow', p: lin(t, 3.75, 0.45), align: 'right' });
    const eq = lin(t, 3.25, 0.8);
    F.chem(ctx, 'CH4 + 2 O2 -> CO2 + 2 H2O', 960, 930, { align: 'center', p: eq, a: smooth(eq * 3), color: '#FFFFFF' });
    F.mono(ctx, '+ heat + light', 960, 985, { align: 'center', color: F.CH.magenta.hex, a: smooth((t - 4.0) / 0.4) });
  }
}

F.boot({ dur: DUR, draw, hud, post: { focus, cam } });
