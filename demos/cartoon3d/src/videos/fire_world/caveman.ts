// Our caveman, drawn in the bridge cast's construction (toon.ts): bean head with the shared face library, stick limbs
// with ink-dot hands, shaded fills + thick-thin plum ink ring. Fur tunic over one shoulder, shaggy hair, big beard,
// bare feet. One continuous pose parameter s: 0 = crouched working a fire plough, 1 = standing with both arms up.
// Design space 600 x 1000 units, soles at y = 975, facing screen-right (the fire is on his right).
import { Pen, INK, mul, mix, blobPts, headBlob, thickAngle, faceFront, Expr, Blob } from "./toon";

type P2 = [number, number];
const SKIN = "#eab68c";
const FUR = "#c98d4b", FUR_SPOT = "#8f5a2c", HAIR = "#4a2c1c", BEARD = "#6b3d22", WOOD = "#9a6236", WOOD_D = "#6e4224";
const SH_SKIN: [number, number, number] = [0.9, 0.78, 0.8];
const SH_FUR: [number, number, number] = [0.66, 0.62, 0.72];
const rad = (d: number) => (d * Math.PI) / 180;
const L = (a: number, b: number, s: number) => a + (b - a) * s;
const L2 = (a: P2, b: P2, s: number): P2 => [L(a[0], b[0], s), L(a[1], b[1], s)];
const rot = (q: P2, a: number, c: P2): P2 => {
  const co = Math.cos(a), si = Math.sin(a);
  return [c[0] + (q[0] - c[0]) * co - (q[1] - c[1]) * si, c[1] + (q[0] - c[0]) * si + (q[1] - c[1]) * co];
};
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
  return out;
};

export type CaveOpts = { s: number; rub: number; expr: Expr; lid: number; light: number; look: number };

/** where the plough tip touches the board (design units) for a given rub: smoke / spark source */
export const ploughTip = (rub: number): P2 => [548 + 18 * rub, 948 - 2 * rub];

export const caveman = (p: Pen, o: CaveOpts) => {
  const { s, rub, expr, lid, light, look } = o;
  const H: Blob = headBlob(4, 118, 1), W = 2 * H.a, HH = 2 * H.b, u = W / 100, thick = thickAngle(light), ow = 5 * u;
  const limb = mix(SKIN, INK, 0.38), legW = 6.4 * u, armW = 5.8 * u;
  p.rot = null;

  // ---- board + plough (crouch only) ----
  const tip = ploughTip(rub);
  p.band([[402, 968], [592, 952]], WOOD, 4.2 * u, 1.6 * u, "round"); // base board on the ground
  p.band([[470, 966], [585, 955]], WOOD_D, 1.2 * u, 0, "round");      // groove
  // tinder at the groove end
  for (let i = 0; i < 5; i++) p.stroke([[566 + i * 5, 950], [574 + i * 6, 936 - (i % 2) * 6]], 1.4 * u, "#c9a25a");

  // ---- legs + bare feet ----
  const hip: P2 = L2([278, 872], [298, 690], s), tilt = L(24, -5, s);
  const legs: [P2, P2, P2][] = [
    [[hip[0] - 22, hip[1]], L2([322, 784], [282, 832], s), L2([238, 962], [250, 962], s)], // far leg
    [[hip[0] + 18, hip[1]], L2([392, 806], [334, 832], s), L2([366, 962], [352, 962], s)], // near leg
  ];
  for (const [h, k, a] of legs) {
    p.stroke([h, k, a], legW, limb);
    p.ell(a[0] + 15, a[1] + 3, 30, 12, SKIN, 3 * u);                       // bare foot
    for (const t of [0, 1, 2]) p.dot(a[0] + 34 + t * 1.5, a[1] - 3 + t * 5, 1.6 * u);   // toes
  }

  // ---- torso (rotates about the hips) ----
  const T: Blob = { a: 0.43 * W, b: 0.56 * HH, nTop: 2.2, nBot: 2.6, egg: 0.14, asym: 0.05, rot: 0, noise: 0.006, seed: 11 };
  const tc: P2 = [hip[0] + 4, hip[1] - T.b + 18], A = rad(tilt);
  const R = (q: P2) => rot(q, A, hip);
  const chin = R([tc[0] + 6, tc[1] - T.b + 6]);
  const sh = (side: number) => R([tc[0] + side * 0.78 * T.a, tc[1] - 0.74 * T.b]);
  // arms: crouch = both hands on the plough handle; stand = both fists high
  const hands: [P2, P2] = [L2([466 + 18 * rub, 846], [128, 168], s), L2([498 + 18 * rub, 868], [462, 150], s)];
  const elbows: [P2, P2] = [L2([368, 816], [140, 334], s), L2([470, 762], [446, 316], s)];
  const arm = (i: number) => {
    const S = sh(i ? 1 : -1);
    p.stroke(curve(S, elbows[i], hands[i]), armW, limb);
    p.dot(hands[i][0], hands[i][1], 6.4 * u);
  };
  if (s < 0.35) { // plough stick held in both hands, tip in the groove
    const a = L2(hands[0], [hands[0][0] - 40, hands[0][1] - 52], 1);
    p.band([a, tip], WOOD, 3.4 * u, 1.4 * u, "round");
  } else p.band([[420, 962], [560, 970]], WOOD, 3.4 * u, 1.4 * u, "round"); // dropped
  arm(0); // far arm behind the body

  // fur tunic: zigzag hem below the torso blob, then the shaded torso with bare skin above the diagonal strap line
  p.rot = [A, hip[0], hip[1]];
  const hemY = tc[1] + T.b - 6, hem: P2[] = [[tc[0] - T.a * 0.92, hemY - 30]];
  for (let i = 0; i <= 8; i++) hem.push([tc[0] - T.a * 0.92 + (i * 1.84 * T.a) / 8, hemY + (i % 2 ? 34 : 10)]);
  hem.push([tc[0] + T.a * 0.92, hemY - 30]);
  p.poly(hem, FUR, ow * 0.8);
  const tp = blobPts(tc[0], tc[1], T);
  p.gradFill(tp, SKIN, mul(SKIN, SH_SKIN), light);
  p.clip(tp, () => {
    const top = tc[1] - T.b, strap: P2[] = [[tc[0] - T.a * 1.2, top + 0.2 * T.b], [tc[0] - 0.2 * T.a, top - 10], [tc[0] + 0.25 * T.a, top - 10],
      [tc[0] + T.a * 1.2, top + 0.95 * T.b], [tc[0] + T.a * 1.2, tc[1] + T.b * 1.2], [tc[0] - T.a * 1.2, tc[1] + T.b * 1.2]];
    p.gradFill(strap, FUR, mul(FUR, SH_FUR), light);
    p.poly(strap, null, 2.2 * u);
    for (const [x, y, r] of [[-0.45, 0.1, 13], [0.3, 0.35, 10], [-0.1, 0.62, 12], [0.55, 0.75, 9], [-0.6, 0.6, 8], [0.1, 0.05, 7]])
      p.ell(tc[0] + x * T.a, tc[1] + y * T.b * 0.9 - 0.1 * T.b, r, r * 0.75, FUR_SPOT, 0);
    p.band([[tc[0] - T.a * 1.2, tc[1] + 0.62 * T.b], [tc[0] + T.a * 1.2, tc[1] + 0.58 * T.b]], "#6b4a2a", 3.2 * u, 1.2 * u); // rope belt
  });
  p.inkRing(tp, ow, thick);
  p.rot = null;
  arm(1); // near arm in front

  // ---- head ----
  const hc = rot([chin[0], chin[1] - H.b + 8], rad(L(14, -10, s)), chin), ha = rad(L(16, -9, s));
  p.rot = [ha, hc[0], hc[1]];
  // shaggy hair mass behind the head
  const back: P2[] = [];
  for (let i = 0; i < 30; i++) {
    const t = Math.PI + (i / 29) * Math.PI * 1.08 - 0.04, r = i % 2 ? 1.16 : 1.3;
    back.push([hc[0] + Math.cos(t) * H.a * r * 1.02 - 6, hc[1] + Math.sin(t) * H.b * r + 0.08 * H.b]);
  }
  back.push([hc[0] + H.a * 0.9, hc[1] + 0.25 * H.b], [hc[0] - H.a * 1.05, hc[1] + 0.35 * H.b]);
  p.shadedFill(back, HAIR, mul(HAIR, SH_FUR), light, H.a * 1.2, 0.35);
  p.poly(back, null, ow * 0.85);
  const hp = blobPts(hc[0], hc[1], H);
  p.shadedFill(hp, SKIN, mul(SKIN, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  // big beard: from cheek to cheek under the nose, jagged hem below the chin
  const jag: P2[] = [];
  for (let i = 0; i <= 10; i++) { const x = hc[0] + 6 + H.a * (0.98 - (i * 1.96) / 10); jag.push([x, hc[1] + H.b * (1.02 + 0.22 * Math.sin(Math.PI * (i / 10))) + (i % 2 ? 26 : 0)]); }
  const top: P2[] = [];
  for (let i = 0; i <= 10; i++) { const x = hc[0] + 6 + H.a * (-0.98 + (i * 1.96) / 10); top.push([x, hc[1] + 0.2 * H.b + 0.22 * H.b * Math.sin(Math.PI * (i / 10)) - 0.2 * H.b * (1 - Math.sin(Math.PI * (i / 10)))]); }
  const beard: P2[] = [...top, ...jag];
  p.shadedFill(beard, BEARD, mul(BEARD, SH_FUR), light, H.a, 0.3);
  p.poly(beard, null, ow * 0.8);
  // fringe over the forehead
  const cut = hc[1] - 0.58 * H.b, fr = hp.filter(([, y]) => y < cut).map(([x, y]) => [hc[0] + (x - hc[0]) * 1.05, hc[1] + (y - hc[1]) * 1.05] as P2);
  if (fr.length > 2) {
    const arc = fr.slice().sort((a, b) => Math.atan2(a[1] - hc[1], a[0] - hc[0]) - Math.atan2(b[1] - hc[1], b[0] - hc[0]));
    const lo = arc[0][0], hi = arc[arc.length - 1][0];
    for (let i = 1; i < 9; i++) arc.push([hi - ((hi - lo) * i) / 9, cut + (i % 2 ? 22 : 2)]);
    p.shadedFill(arc, HAIR, mul(HAIR, SH_FUR), light, H.a, 0.35);
    p.poly(arc, null, ow * 0.85);
  }
  faceFront(p, hc[0], hc[1], W, expr, 1, look, lid, false, SKIN);
  // nose: a soft skin bump over the beard line
  p.ell(hc[0] + 0.1 * W, hc[1] + 0.06 * HH, 0.07 * W, 0.055 * HH, mul(SKIN, [0.96, 0.86, 0.84]), 2.6 * u);
  p.rot = null;
};
