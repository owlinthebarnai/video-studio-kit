// "The science of fire" (5 s, 1920x1080). Three beats: friction -> fire triangle -> combustion.
import * as F from './engine/index.js';
const { PAL, LW, TYPE, E, T, clamp, lerp, seg, lin, beats, TAU } = F;

const DUR = 5;
const BT = beats({ friction: [0, 1.5], triangle: [1.5, 3], combustion: [3, 5] });
const TITLES = ['Friction turns motion into heat', 'Fire needs three things at once', 'Burning is a chemical reaction'];
const C = [985, 667];                                   // contact point on the board's top face
const V = [[960, 262], [628, 820], [1292, 820]];        // triangle: HEAT, FUEL, OXYGEN
const DUST = F.particles(34, 5);

// ---------- beat 1: sticks, friction, heat ----------
const rubOffset = (t) => {
  const ramp = seg(t, 0.2, 0.3), stop = 1 - seg(t, 1.1, 0.3);
  return t < 0.2 ? 0 : Math.sin((t - 0.2) * TAU * 3.2) * 36 * ramp * stop;
};
const rubSpeed = (t) => (t < 0.2 ? 0 : Math.abs(Math.cos((t - 0.2) * TAU * 3.2)) * seg(t, 0.2, 0.3) * (1 - seg(t, 1.1, 0.3)));
const heat = (t) => seg(t, 0.2, 1.0, E.inOutSine);
const exit1 = (t) => lin(t, 1.28, 0.34);

function board(ctx, t) {
  const shrink = seg(t, 1.3, 0.55), w = lerp(640, 300, shrink), x = 960 - w / 2, y = 667, h = 66;
  const p = lin(t, 0, 0.45);
  F.shape(ctx, F.rrectPts(x, y, w, h, 18), p, { fill: PAL.tint });
  F.withAlpha(ctx, clamp((p - 0.7) / 0.3), () => F.grainLines(ctx, x, y, w, h, { seed: 4, n: 2 }));
}

function stick(ctx, t) {
  const ex = exit1(t); if (ex >= 1) return;
  const ex0 = C[0] + rubOffset(t), ey = C[1] - 20;
  F.popOut(ctx, 780, 540, ex, () => F.pop(ctx, 780, 540, lin(t, 0.06, T.pop), () =>
    F.group(ctx, { x: ex0, y: ey, rot: Math.PI + 0.49 }, () => {
      F.rrect(ctx, -6, -23, 520, 46, 23, { fill: PAL.tint });
      F.grainLines(ctx, 60, -23, 420, 46, { seed: 8, n: 2 });
    })));
}

function friction(ctx, t) {
  const ex = exit1(t), v = rubSpeed(t);
  if (ex >= 1) return;
  F.withAlpha(ctx, 1 - ex, () => {
    const x = C[0] + rubOffset(t), y = C[1] - 4;
    // motion marks either side of the contact, length follows rubbing speed
    if (v > 0.05) for (const deg of [-168, -142, -38, -12]) {
      const a = (deg * Math.PI) / 180, r0 = 40, r1 = r0 + 10 + 26 * v;
      F.line(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], 1, { stroke: PAL.coral, lw: LW.second });
    }
    // dust / hot fibres: seeded, ballistic, f(t)
    for (const d of DUST) {
      const tb = 0.3 + d.a * 0.95, life = 0.4 + d.b * 0.3, age = t - tb;
      if (age < 0 || age > life) continue;
      const px = C[0] + (d.c - 0.5) * 50 + (d.c - 0.5) * 300 * age, py = C[1] - 6 - (110 + d.d * 200) * age + 480 * age * age;
      F.withAlpha(ctx, 1 - age / life, () => F.circle(ctx, px, py, 3 + d.d * 3, { fill: d.i % 3 ? PAL.inkSoft : PAL.coral, stroke: null }));
    }
    // rising heat
    F.withAlpha(ctx, heat(t), () => F.heatWaves(ctx, 1070, 628, t, lin(t, 0.35, 0.6), { len: 120, gap: 44 }));
  });
}

function ember(ctx, t) {
  const a = clamp((heat(t) - 0.35) / 0.3) * (1 - seg(t, 1.5, 0.3));
  if (a <= 0) return;
  const r = 6 + 12 * seg(t, 0.6, 0.8);
  F.withAlpha(ctx, a, () => {
    F.halo(ctx, C[0], C[1] - 2, r, PAL.amber, { rings: 2, alpha: 0.22, step: 0.7 });
    F.circle(ctx, C[0], C[1] - 2, r, { fill: PAL.coral, stroke: PAL.ink, lw: LW.hair });
    F.circle(ctx, C[0], C[1] - 2, r * 0.45, { fill: PAL.amber, stroke: null });
  });
}

function graph(ctx, t) {
  const ex = lin(t, 1.22, 0.34);
  const x0 = 1380, y0 = 610, w = 400, h = 250, Ty = (deg) => y0 - (deg / 350) * h;
  F.popOut(ctx, 1580, 480, ex, () => {
    F.grid(ctx, x0, y0 - h, w, h, 50, lin(t, 0.12, 0.5));
    F.arrow(ctx, [[x0, y0], [x0 + w + 26, y0]], lin(t, 0.18, 0.4), { lw: LW.second, head: 16 });
    F.arrow(ctx, [[x0, y0], [x0, y0 - h - 26]], lin(t, 0.18, 0.4), { lw: LW.second, head: 16 });
    const la = seg(t, 0.35, 0.3);
    F.text(ctx, 'TIME', x0 + w + 26, y0 + 30, { size: TYPE.min, color: PAL.inkSoft, align: 'right', track: 2, alpha: la });
    F.text(ctx, '°C', x0 - 16, y0 - h - 18, { size: TYPE.min, color: PAL.inkSoft, align: 'right', alpha: la });
    F.line(ctx, [[x0, Ty(300)], [x0 + w, Ty(300)]], seg(t, 0.4, 0.4), { stroke: PAL.coral, lw: LW.leader, dash: [1, 11] });
    F.text(ctx, 'wood ignites ≈ 300 °C', x0 + 10, Ty(300) - 24, { size: TYPE.min, weight: 600, color: PAL.coral, alpha: seg(t, 0.55, 0.3) });
    const g = lin(t, 0.3, 0.95);
    if (g > 0) {
      const temp = (u) => 20 + 300 * Math.pow(u, 2.2), pts = [];
      for (let i = 0; i <= 40; i++) { const u = (g * i) / 40; pts.push([x0 + u * w, Ty(temp(u))]); }
      F.line(ctx, pts, 1, { stroke: PAL.coral, lw: LW.main });
      const [hx, hy] = pts[pts.length - 1];
      F.circle(ctx, hx, hy, 9, { fill: PAL.white, stroke: PAL.ink, lw: LW.second });
      F.text(ctx, `${Math.round(temp(g))} °C`, Math.max(hx - 18, x0 + 130), hy - 34, { size: TYPE.body, weight: 600, align: 'right' });
    }
    F.badge(ctx, 2, x0 + 21, y0 - h - 72, lin(t, 0.3, T.pop));
    F.text(ctx, 'HEAT BUILDS', x0 + 56, y0 - h - 70, { size: TYPE.label, track: 1, alpha: seg(t, 0.38, 0.3) });
  });
}

// ---------- beat 2: fire triangle ----------
function triangle(ctx, t) {
  const sides = [[V[0], V[1], 1.62], [V[1], V[2], 1.92], [V[2], V[0], 2.22]];
  for (const [a, b, s] of sides) F.line(ctx, [a, b], seg(t, s, 0.4), { lw: LW.main });
  const nodes = [
    { at: 1.52, fill: PAL.coral, icon: (x, y) => F.heatWaves(ctx, x, y + 26, t, 1, { n: 3, gap: 20, len: 50, amp: 5, color: PAL.white, lw: 5 }) },
    { at: 1.86, fill: PAL.amber, icon: (x, y) => {
      F.rrect(ctx, x - 36, y - 15, 64, 30, 15, { fill: PAL.tint, lw: LW.second });
      F.circle(ctx, x + 20, y, 15, { fill: PAL.tint, lw: LW.second }); F.circle(ctx, x + 20, y, 6, { stroke: PAL.ink, lw: LW.hair });
    } },
    { at: 2.16, fill: PAL.teal, icon: (x, y) => {
      F.bond(ctx, [x - 17, y], [x + 17, y], 2, 1, { lw: LW.second, gap: 9 });
      for (const dx of [-17, 17]) F.circle(ctx, x + dx, y, 16, { fill: PAL.white, lw: LW.second });
    } },
  ];
  nodes.forEach((n, i) => F.pop(ctx, V[i][0], V[i][1], lin(t, n.at, T.pop), () => {
    F.circle(ctx, V[i][0], V[i][1], 62, { fill: n.fill });
    n.icon(V[i][0], V[i][1]);
  }));
  const subA = 1 - seg(t, 3.0, 0.3);
  const lab = [
    { from: [1007, 222], to: [1090, 178], text: 'HEAT', sub: 'enough to ignite' },
    { from: [581, 860], to: [548, 932], text: 'FUEL', sub: 'something to burn' },
    { from: [1339, 860], to: [1372, 932], text: 'OXYGEN', sub: '21 % of the air' },
  ];
  lab.forEach((l, i) => F.callout(ctx, { ...l, num: i + 1, p: lin(t, nodes[i].at + 0.12, 0.45), subAlpha: subA }));
}

// ---------- beat 3: combustion ----------
const X = { ch4: 1070, p1: 1180, o2: 1285, a0: 1362, a1: 1472, co2: 1578, p2: 1680, h2o: 1782, mid: 1425 };
const MY = 440, FY = 585, NY = 642, BY = 698, PY = 832;
function reaction(ctx, t) {
  if (t < 3.05) return;
  F.text(ctx, 'COMBUSTION OF METHANE (NATURAL GAS)', 1010, 322, { size: TYPE.min, color: PAL.inkSoft, track: 3, alpha: seg(t, 3.1, 0.3) });
  F.line(ctx, [[1010, 350], [1840, 350]], seg(t, 3.12, 0.5), { stroke: PAL.rule, lw: LW.hair });
  const term = (at, x, mol, f, name, stack = 1) => {
    if (stack === 1) F.molecule(ctx, mol, x, MY, lin(t, at, 0.42));
    else for (let k = 0; k < stack; k++) F.molecule(ctx, mol, x, MY - 38 + k * 76, lin(t, at + k * 0.06, 0.42), { s: 0.92 });
    const fa = seg(t, at + 0.08, 0.3, E.outCubic);
    F.withAlpha(ctx, fa, () => {
      F.formula(ctx, f, x, FY + (1 - fa) * 10, { size: 54 });
      F.text(ctx, name, x, NY, { size: TYPE.small, weight: 400, family: TYPE.sans, color: PAL.inkSoft, align: 'center' });
    });
  };
  const plus = (at, x) => F.withAlpha(ctx, seg(t, at, 0.25), () => F.text(ctx, '+', x, FY + 2, { size: TYPE.formula, weight: 400, align: 'center' }));
  term(3.25, X.ch4, F.MOL.CH4, 'CH4', 'methane');
  plus(3.38, X.p1);
  term(3.44, X.o2, F.MOL.O2, '2O2', 'oxygen', 2);
  F.arrow(ctx, [[X.a0, FY], [X.a1, FY]], lin(t, 3.62, T.arrow), { lw: LW.main });
  term(3.82, X.co2, F.MOL.CO2, 'CO2', 'carbon dioxide');
  plus(3.94, X.p2);
  term(4.0, X.h2o, F.MOL.H2O, '2H2O', 'water', 2);
  // reactants / products brackets
  const br = (x0, x1, at, str) => {
    F.line(ctx, [[x0, BY - 14], [x0, BY], [x1, BY], [x1, BY - 14]], seg(t, at, 0.4), { lw: LW.second });
    F.text(ctx, str, (x0 + x1) / 2, BY + 34, { size: TYPE.min, align: 'center', track: 3, alpha: seg(t, at + 0.2, 0.25) });
  };
  br(1000, 1340, 4.1, 'REACTANTS');
  br(1508, 1840, 4.18, 'PRODUCTS');
  F.arrow(ctx, [[X.mid, FY + 34], [X.mid, PY - 34]], lin(t, 4.18, 0.4), { color: PAL.coral, lw: LW.main });
  F.pill(ctx, 'ENERGY OUT: HEAT + LIGHT', X.mid, PY, lin(t, 4.34, T.pop), { fill: PAL.coral });
}

// ---------- world ----------
function world(ctx, t) {
  const gm = seg(t, 3.0, T.move);
  F.group(ctx, { x: lerp(960, 560, gm), y: lerp(600, 622, gm), s: lerp(1, 0.8, gm), ox: 960, oy: 600 }, () => {
    triangle(ctx, t);
    const grow = seg(t, 3.05, 1.6);
    F.pop(ctx, 960, 680, lin(t, 1.42, 0.45), () => F.flame(ctx, 960, 680, lerp(118, 164, grow), lerp(200, 300, grow), t));
    board(ctx, t);
    stick(ctx, t);
    ember(ctx, t);
    friction(ctx, t);
    F.popOut(ctx, 1180, 860, exit1(t), () =>
      F.callout(ctx, { from: [C[0] + 6, C[1] + 4], to: [1150, 862], text: 'FRICTION', sub: 'motion becomes heat', num: 1, p: lin(t, 0.22, 0.55) }));
  });
  graph(ctx, t);
  reaction(ctx, t);
}

F.boot({
  dur: DUR,
  draw(ctx, t, { W, H }) {
    F.paper(ctx, W, H);
    F.camera(ctx, t, DUR, { cx: 960, cy: 600, to: 1.02 }, () => world(ctx, t));
    F.header(ctx, t, BT, TITLES, { kicker: 'THE SCIENCE OF FIRE' });
  },
});
