// sci-notebook example: "the science of fire" (5 s, 1920x1080). Three beats on ONE notebook page:
//   1 (0-1.5)  friction: two sticks rub, friction marks, heat builds, thermometer climbs to ~300 °C
//   2 (1.5-3)  the fire triangle assembles around a small flame
//   3 (3-5)    combustion: the equation is written out, the flame grows, products leave
import {
  boot, PAL, LW, TYPE, FONT, E, clamp, lerp, lerp2, onTwos, cue, lin, env, PACE, writeDur,
  stroke, strokes, dot, handLine, handPoly, curve, add, unit, perp, polyPath, bbox,
  arrow, arrowTo, rubArrow, write, writeAt, measure, underline, note, section, equationAt,
  hatch, highlight, highlightBox, stick, flame, heatWaves, sparks, thermometer, atom, brace,
} from './engine/index.js';

const DUR = 5;

// ---- layout (page coords, 1920x1080) ----
const A1 = [330, 680], A2 = [850, 600], rA = 22;          // the board (static stick)
const uA = unit(A1, A2), nA = perp(uA);                   // nA points up-left of the board
const uB = unit([0, 0], [200, -250]), rB = 17, LB = 330;  // the rubbing stick leans up-right
const S0 = 0.52;                                          // rest position of the contact along the board
const onBoard = (s) => add(lerp2(A1, A2, s), nA, rA);     // a point on the board's top surface
const V = { O: [1310, 250], H: [1050, 620], F: [1570, 620] }; // fire triangle
const FB = [1310, 572];                                   // flame base
const EQ = { x: 330, y: 892 };
const yTick = 492 - 20 * 0.8 - (492 - 20 * 0.8 - 285 - 11) * 0.75; // thermometer y of the 300 °C tick (v = 300/400)

// rubbing: contact slides along the board, on twos, with an envelope
const rubS = (t) => {
  const tq = onTwos(t), k = env(tq, 0.32, 1.6, 0.15, 0.2);
  return S0 + 0.085 * k * Math.sin((tq - 0.32) * Math.PI * 2 * 2.6);
};
// temperature at the contact (°C): 20 -> 300 over beat 1, keeps climbing a little
const temp = (t) => lerp(20, 300, E.outCubic(clamp((t - 0.4) / 1.1))) + Math.max(0, t - 1.5) * 15;
// flame height
const flameH = (t) => 92 * E.outBack(clamp((t - 1.62) / 0.3), 1.3) + 150 * E.inOutCubic(clamp((t - 3.0) / 1.3));

function draw(ctx, t, stage) {
  const paper = stage.paper;

  // ---------- page header ----------
  const ttl = writeAt(ctx, t, 0.0, 'The science of fire', 300, 100, { size: TYPE.title, weight: 700, seed: 3, dur: 0.55 });
  underline(ctx, ttl.box, cue(t, 0.5, 0.2), { seed: 5, dy: 0.55 });
  write(ctx, 'Nov 12  ·  p. 37', 1860, 82, cue(t, 0.6, 0.3, (u) => u), { size: TYPE.min, font: FONT.note, align: 'right', color: PAL.inkSoft, seed: 9 });

  // ================= BEAT 1: friction =================
  section(ctx, t, 0.15, 1, 'friction', 310, 205, { seed: 71 });

  const s = rubS(t), C = onBoard(s);                     // live contact point
  const C0 = onBoard(S0);
  // ember glow on the board, growing as it heats (highlighter, under the ink)
  const g = clamp((t - 0.55) / 0.9);
  highlight(ctx, add(onBoard(S0 - 0.07), nA, -6), add(onBoard(S0 + 0.07), nA, -6), cue(t, 0.55, 0.3), { color: PAL.hlOrange, w: 16 + 30 * g, seed: 12, alpha: 0.45 + 0.3 * g });
  // board, with a pencil cast shadow on the paper
  hatch(ctx, polyPath([add(A1, nA, -rA), add(A2, nA, -rA), add(add(A2, nA, -rA - 16), uA, -24), add(add(A1, nA, -rA - 16), uA, 30)]),
    bbox([add(A1, nA, -rA - 20), add(A2, nA, -rA)]), cue(t, 0.35, 0.3), { seed: 14, gap: 8, alpha: 0.4 });
  stick(ctx, A1, A2, rA, cue(t, 0.0, 0.5), { seed: 20, paper });
  // groove / friction marks on the board around the contact
  for (let i = 0; i < 6; i++) {
    const q = S0 - 0.07 + i * 0.028, P = onBoard(q);
    stroke(ctx, [add(P, nA, -3), add(add(P, nA, -12), uA, -6)], cue(t, 0.5 + i * 0.03, 0.08), { lw: LW.fine, seed: 300 + i, amp: 0.3 });
  }
  // rubbing stick (moves on twos)
  const Bt = add(C, nA, -5), Be = add(Bt, uB, LB);
  stick(ctx, Bt, Be, rB, cue(t, 0.12, 0.45), { seed: 30, paper });
  // friction sparks + heat waves at the contact
  const rubbing = env(onTwos(t), 0.45, 1.75, 0.1, 0.2);
  sparks(ctx, t, C[0], C[1] - 4, rubbing, { seed: 41, n: 7, r0: 30, r1: 58, arc: [-Math.PI * 1.0, -Math.PI * 0.62] });
  sparks(ctx, t, C[0], C[1] - 4, rubbing, { seed: 42, n: 4, r0: 30, r1: 54, arc: [-Math.PI * 0.18, Math.PI * 0.05] });
  heatWaves(ctx, t, C0[0] - 70, C0[1] - 70, cue(t, 0.8, 0.35), { n: 3, h: 78, gap: 26, seed: 33 });
  // arrows: rub back & forth (under the board), press (along the rubbing stick)
  const rc = add(lerp2(A1, A2, S0), nA, -rA - 46);
  rubArrow(ctx, rc, uA, 230, cue(t, 0.48, PACE.arrow), { seed: 80, head: 20 });
  write(ctx, 'rub back & forth', rc[0], rc[1] + 44, lin(t, 0.68, writeDur('rub back & forth')), { size: TYPE.small, align: 'center', seed: 81 });
  const nB = [-uB[1], uB[0]];   // right-hand side of the rubbing stick
  const pr0 = add(add(C0, uB, 270), nB, 58), pr1 = add(add(C0, uB, 110), nB, 58);
  arrow(ctx, [pr0, pr1], cue(t, 0.62, PACE.arrow), { seed: 82, head: 20 });
  write(ctx, 'press', pr0[0] + 18, pr0[1] - 16, lin(t, 0.82, writeDur('press')), { size: TYPE.small, seed: 83 });
  // "hot spot" with an arrow to the contact
  writeAt(ctx, t, 0.95, 'hot spot', 395, 560, { size: TYPE.small, seed: 84 });
  arrowTo(ctx, [520, 572], add(C0, [-14, -10], 1), cue(t, 1.08, 0.22), { bend: -0.25, seed: 85, head: 18 });
  // thermometer climbs to the ignition mark
  const lvl = (v) => (v - 0) / 400;
  thermometer(ctx, 330, 285, 492, lvl(temp(t)) * cue(t, 0.4, 0.2, (u) => u), cue(t, 0.25, 0.4), { seed: 24, ticks: [{ v: lvl(300) }] });
  write(ctx, 'T', 330, 250, cue(t, 0.55, 0.1, (u) => u), { size: TYPE.small, weight: 700, align: 'center', seed: 26 });
  // margin note
  note(ctx, t, 0.8, ['wood ignites', 'at ~300 °C'], 490, 318, { frame: 'ellipse', to: [366, yTick], bend: 0.3, seed: 90 });

  // ================= BEAT 2: the fire triangle =================
  section(ctx, t, 1.5, 2, 'fire triangle', 990, 205, { seed: 72 });
  const sides = handPoly([V.H, V.O, V.F], 101, { over: 12, bow: 0.012 });
  strokes(ctx, sides, cue(t, 1.55, 0.55), { lw: LW.main, seed: 101 });
  // flame appears in the middle
  flame(ctx, t, FB[0], FB[1], flameH(t), cue(t, 1.62, 0.35), { seed: 7 });
  // corner labels + icons
  const lab = { size: TYPE.label + 2, weight: 700, track: 2 };
  const hb = writeAt(ctx, t, 1.95, 'HEAT', V.H[0], V.H[1] + 58, { ...lab, align: 'center', seed: 111 });
  heatWaves(ctx, t, V.H[0] + 112, V.H[1] + 84, cue(t, 2.05, 0.25), { n: 3, h: 50, gap: 18, amp: 5, seed: 112 });
  const fb = writeAt(ctx, t, 2.12, 'FUEL', V.F[0], V.F[1] + 58, { ...lab, align: 'center', seed: 113 });
  stick(ctx, [V.F[0] + 75, V.F[1] + 72], [V.F[0] + 175, V.F[1] + 52], 13, cue(t, 2.22, 0.3), { seed: 114, lw: LW.second, paper });
  const ob = writeAt(ctx, t, 2.28, 'OXYGEN', V.O[0] + 40, V.O[1] - 16, { ...lab, seed: 115 });
  atom(ctx, 'O', ob.box.x1 + 42, V.O[1] - 16, 20, cue(t, 2.45, 0.2, (u) => u), { seed: 116, size: 24 });
  atom(ctx, 'O', ob.box.x1 + 82, V.O[1] - 16, 20, cue(t, 2.5, 0.2, (u) => u), { seed: 117, size: 24 });
  // heat from the sticks feeds the HEAT corner
  arrowTo(ctx, [880, 612], [hb.box.x0 - 18, hb.box.y - 4], cue(t, 2.15, PACE.arrow), { bend: 0.3, seed: 118, head: 20 });
  // note: remove any side
  const midR = lerp2(V.O, V.F, 0.5);
  note(ctx, t, 2.45, ['remove any side', '→ fire goes out'], 1610, 420, { frame: 'box', size: TYPE.small + 2, to: add(midR, [14, 0], 1), bend: -0.2, seed: 120 });

  // ================= BEAT 3: combustion =================
  section(ctx, t, 3.0, 3, 'combustion', 310, 805, { seed: 73 });
  // the equation, written by hand
  const eq = equationAt(ctx, t, 3.0, 'CH4 + 2O2 -> CO2 + 2H2O + energy', EQ.x, EQ.y);
  // highlighter on "energy", braces under reactants / products
  const en = eq.boxes[eq.boxes.length - 1];
  highlightBox(ctx, en, cue(t, en.b + 0.05, PACE.hl), { seed: 140 });
  const r0 = eq.boxes[0], r1 = eq.boxes[2], p0 = eq.boxes[4], p1 = eq.boxes[6];
  brace(ctx, r0.x0, r1.x1, EQ.y + 48, lin(t, 3.95, 0.3), { label: 'fuel gas + oxygen', seed: 141 });
  brace(ctx, p0.x0, p1.x1, EQ.y + 48, lin(t, 4.1, 0.3), { label: 'products', seed: 142 });
  // products leave the growing flame
  const tip = [FB[0], FB[1] - flameH(t)];
  arrowTo(ctx, add(tip, [-30, 26], 1), [1150, 300], cue(t, 4.0, PACE.arrow), { bend: 0.2, seed: 150, head: 18 });
  write(ctx, 'CO2 + H2O', 1135, 290, lin(t, 4.18, 0.3), { size: TYPE.small, chem: true, align: 'right', seed: 151 });
  // margin note: how much energy
  note(ctx, t, 3.55, ['≈ 890 kJ per', 'mole of methane'], 1560, 870, { frame: 'ellipse', to: [en.x1 + 16, en.y - 4], bend: 0.25, seed: 160, size: TYPE.small + 2 });
}

boot({
  dur: DUR, draw,
  camera: [
    { t: 0.0, cx: 760, cy: 470, s: 1.12 },
    { t: 1.3, cx: 760, cy: 470, s: 1.1 },
    { t: 2.0, cx: 1000, cy: 470, s: 1.05 },
    { t: 3.0, cx: 1000, cy: 500, s: 1.04 },
    { t: 3.7, cx: 960, cy: 540, s: 1.0 },
  ],
});
