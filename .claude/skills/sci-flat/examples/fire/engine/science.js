// Science motifs drawn in the style: atoms, bonds, molecules, flat flames, heat waves.
import { PAL, LW, TYPE } from './palette.js';
import { clamp, E, noise1 } from './ease.js';
import { circle, line, pop, wavePts, style } from './shapes.js';
import { text } from './labels.js';

// element look: fill + radius at scale 1. CPK-like but inside the palette.
export const EL = {
  C: { fill: PAL.ink, r: 26, label: PAL.white },
  H: { fill: PAL.white, r: 15, label: null },
  O: { fill: PAL.teal, r: 24, label: PAL.white },
  N: { fill: PAL.amber, r: 24, label: PAL.ink },
  X: { fill: PAL.coral, r: 24, label: PAL.white },
};
export function atom(ctx, x, y, el = 'C', { s = 1, letters = true, fill = null } = {}) {
  const e = EL[el] || EL.X, r = e.r * s;
  circle(ctx, x, y, r, { fill: fill || e.fill, stroke: PAL.ink, lw: LW.second });
  if (letters && e.label && r >= 18) text(ctx, el, x, y + 1, { size: r * 0.95, weight: 600, color: e.label, align: 'center' });
}
export function bond(ctx, a, b, order = 1, p = 1, { lw = LW.second, gap = 7 } = {}) {
  if (order === 1) return line(ctx, [a, b], p, { lw });
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * gap / 2, ny = (dx / L) * gap / 2;
  for (const k of order === 2 ? [-1, 1] : [-2, 0, 2]) line(ctx, [[a[0] + nx * k, a[1] + ny * k], [b[0] + nx * k, b[1] + ny * k]], p, { lw });
}
// spec: { atoms: [[dx, dy, 'C'], ...], bonds: [[i, j, order], ...] } in px at s=1, around (x,y).
// p LINEAR: atoms pop in order (staggered), bonds draw after both ends exist.
export function molecule(ctx, spec, x, y, p = 1, { s = 1, letters = true } = {}) {
  if (p <= 0) return;
  const n = spec.atoms.length, k = n > 1 ? 0.5 / (n - 1) : 0, ap = (i) => clamp((p - i * k) / 0.5);
  const P = spec.atoms.map(([dx, dy]) => [x + dx * s, y + dy * s]);
  for (const [i, j, o] of spec.bonds || []) bond(ctx, P[i], P[j], o, E.outCubic(clamp(Math.min(ap(i), ap(j)) * 1.4 - 0.2)));
  spec.atoms.forEach(([, , el], i) => pop(ctx, P[i][0], P[i][1], ap(i), () => atom(ctx, P[i][0], P[i][1], el, { s, letters })));
}
export const MOL = {
  CH4: { atoms: [[0, 0, 'C'], [0, -54, 'H'], [54, 0, 'H'], [0, 54, 'H'], [-54, 0, 'H']], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  O2: { atoms: [[-30, 0, 'O'], [30, 0, 'O']], bonds: [[0, 1, 2]] },
  CO2: { atoms: [[-56, 0, 'O'], [0, 0, 'C'], [56, 0, 'O']], bonds: [[0, 1, 2], [1, 2, 2]] },
  H2O: { atoms: [[0, -8, 'O'], [-34, 22, 'H'], [34, 22, 'H']], bonds: [[0, 1, 1], [0, 2, 1]] },
  N2: { atoms: [[-22, 0, 'N'], [22, 0, 'N']], bonds: [[0, 1, 3]] },
};

// teardrop path, base centre (x,y), width w, height h, tip lean dx
function dropPath(ctx, x, y, w, h, dx) {
  const r = w / 2, tip = [x + dx, y - h], cy = y - r;
  ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
  ctx.bezierCurveTo(x + dx * 0.5 - r * 0.15, y - h * 0.62, x - r, cy - (h - r) * 0.42, x - r, cy);
  ctx.arc(x, cy, r, Math.PI, 0, true);
  ctx.bezierCurveTo(x + r, cy - (h - r) * 0.42, x + dx * 0.5 + r * 0.15, y - h * 0.62, tip[0], tip[1]);
  ctx.closePath();
}
// Flat layered flame. t drives a gentle, seeded flicker (no particles, no blur).
const fn1 = noise1(41), fn2 = noise1(77);
export function flame(ctx, x, y, w, h, t, { layers = [PAL.coral, PAL.amber, PAL.white], outline = true, flicker = 1, seed = 0 } = {}) {
  const lean = fn1(t * 2.6 + seed) * w * 0.16 * flicker, breathe = 1 + fn2(t * 3.4 + seed) * 0.05 * flicker;
  const sc = [[1, 1], [0.66, 0.7], [0.34, 0.4]];
  layers.forEach((col, i) => {
    const [kw, kh] = sc[i] || sc[2], hh = h * kh * (i ? breathe : breathe * 0.98 + 0.02);
    dropPath(ctx, x, y - (i ? w * 0.05 * i : 0), w * kw, hh, lean * (1 - i * 0.25));
    ctx.fillStyle = col; ctx.fill();
    if (outline && i === 0) { style(ctx, { lw: LW.main }); ctx.stroke(); }
  });
}
// rising wavy heat lines. p LINEAR (draw-on), phase scrolls with t.
export function heatWaves(ctx, x, y, t, p = 1, { n = 3, gap = 42, len = 130, amp = 7, color = PAL.coral, lw = LW.second, speed = 5 } = {}) {
  if (p <= 0) return;
  for (let i = 0; i < n; i++) {
    const xi = x + (i - (n - 1) / 2) * gap, li = len * (i === (n - 1) / 2 ? 1.15 : 1);
    line(ctx, wavePts(xi, y, li, { amp, waves: 2, phase: -t * speed + i * 1.7 }), E.outCubic(clamp(p * 1.4 - i * 0.2)), { stroke: color, lw });
  }
}
