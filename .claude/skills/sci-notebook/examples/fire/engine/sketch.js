// Reusable sketch objects built from ink + marks. Each takes p (0..1 draw-on) and, if animated, t.
import { PAL, LW, TYPE, FONT } from './palette.js';
import { clamp, lerp } from './ease.js';
import { boil, noise1, rng } from './rand.js';
import { stroke, strokes } from './ink.js';
import { hatch, scribble } from './marks.js';
import { handLine, handCircle, arcPts, zigzag, squiggle, unit, perp, add, bbox, polyPath, smooth } from './path.js';
import { write } from './labels.js';
import { knockout } from './paper.js';

const seg = (p, a, b) => clamp((p - a) / (b - a));

// A wooden stick / rod from a to b, radius r. Rough broken end at a, cut face (with rings) at b,
// grain lines, pencil hatching on the shadow side. paper: pass stage.paper so it hides what is behind it.
export function stick(ctx, a, b, r, p, { seed = 1, paper = null, shade = true, cut = true, lw = LW.main } = {}) {
  if (p <= 0) return;
  const u = unit(a, b), n = perp(u);
  const T0 = add(a, n, r), T1 = add(b, n, r), B0 = add(a, n, -r), B1 = add(b, n, -r);
  const body = [T0, T1, B1, B0];
  if (paper) knockout(ctx, paper, (c) => { polyPath(body)(c); c.ellipse(b[0], b[1], r * 0.42, r, Math.atan2(u[1], u[0]), 0, Math.PI * 2); });
  if (shade) hatch(ctx, polyPath([add(a, n, -r * 0.15), add(b, n, -r * 0.15), B1, B0]), bbox(body), seg(p, 0.65, 1), { seed: seed + 40, gap: 7, angle: Math.atan2(u[1], u[0]) - 0.9 });
  const o = { lw, seed };
  stroke(ctx, handLine(T0, T1, seed, { over: 4, bow: 0.008 }), seg(p, 0, 0.4), o);
  stroke(ctx, handLine(B0, B1, seed + 1, { over: 4, bow: 0.008 }), seg(p, 0.12, 0.5), { ...o, seed: seed + 1 });
  stroke(ctx, zigzag(T0, B0, { amp: r * 0.22, teeth: 4, seed }), seg(p, 0.45, 0.6), { ...o, lw: lw * 0.8, seed: seed + 2 });
  if (cut) {
    const ang = Math.atan2(u[1], u[0]);
    stroke(ctx, handCircle(b[0], b[1], r * 0.42, r, seed + 3, { over: 0.06, rot: ang }), seg(p, 0.5, 0.68), { ...o, lw: lw * 0.8, seed: seed + 3 });
    stroke(ctx, handCircle(b[0], b[1], r * 0.18, r * 0.45, seed + 4, { over: 0.3, rot: ang }), seg(p, 0.66, 0.76), { ...o, lw: LW.fine * 0.8, seed: seed + 4 });
  }
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), R = rng(seed + 9);
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * r * 0.45 + (R() - 0.5) * 4, s0 = L * (0.12 + R() * 0.3), s1 = s0 + L * (0.2 + R() * 0.25);
    stroke(ctx, handLine(add(add(a, u, s0), n, off), add(add(a, u, Math.min(s1, L - r)), n, off + (R() - 0.5) * 4), seed + 10 + i), seg(p, 0.6 + i * 0.07, 0.78 + i * 0.07), { lw: LW.fine * 0.75, seed: seed + 10 + i });
  }
}

// Ink flame with highlighter fill. Base centre (x, y), height h. Boils at 12 fps (redrawn every 1/12 s).
export function flame(ctx, t, x, y, h, p = 1, { seed = 5, lw = LW.main, fill = true } = {}) {
  if (h <= 2 || p <= 0) return;
  const b = boil(t);
  const shape = (H, W, sd, by) => {
    const pts = [], N = 44, sway = noise1(sd + 3, t * 1.7) * W * 0.35;
    for (let i = 0; i <= N; i++) {
      const ph = Math.PI + (i / N) * Math.PI * 2, half = Math.pow(Math.abs(Math.sin(ph / 2)), 1.7);
      const hy = (1 + Math.cos(ph)) / 2, wob = 1 + 0.1 * noise1(sd + b * 7, ph * 2.2);
      const px = W * Math.sin(ph) * half * wob + (sway + noise1(sd + b * 13, 1.3) * W * 0.12) * Math.pow(hy, 1.6);
      pts.push([x + px, by - H * hy * (1 + 0.08 * noise1(sd + b * 5, 0.4) * hy)]);
    }
    return pts;
  };
  const outer = shape(h, h * 0.34, seed, y), inner = shape(h * 0.52, h * 0.17, seed + 50, y - h * 0.04);
  if (fill) {
    const pf = seg(p, 0.45, 1);
    scribble(ctx, polyPath(outer), bbox(outer), pf, { color: PAL.hlOrange, lw: Math.max(10, h * 0.09), gap: Math.max(8, h * 0.06), seed: seed + b, alpha: 0.55 });
    scribble(ctx, polyPath(inner), bbox(inner), pf, { color: PAL.hlYellow, lw: Math.max(8, h * 0.08), gap: Math.max(6, h * 0.05), angle: -0.5, seed: seed + 7 + b, alpha: 0.7 });
  }
  stroke(ctx, outer, seg(p, 0, 0.6), { lw, seed: seed + b, amp: 1 });
  stroke(ctx, inner, seg(p, 0.35, 0.85), { lw: lw * 0.7, seed: seed + 1 + b, amp: 0.8 });
  // a loose tongue above the tip, now and then
  if (p >= 1 && h > 60 && hash01(seed + b) > 0.35) {
    const tx = outer[22][0] + noise1(seed + b, 2) * h * 0.08, ty = y - h * 1.08;
    stroke(ctx, smooth([[tx - h * 0.04, ty + h * 0.06], [tx + h * 0.02, ty - h * 0.04], [tx - h * 0.01, ty - h * 0.12]], 6), 1, { lw: lw * 0.6, seed: seed + b + 3 });
  }
}
const hash01 = (n) => (noise1(n, 0.5) + 1) / 2;

// rising heat squiggles above (x, y); phase steps on twos so they "boil" upward
export function heatWaves(ctx, t, x, y, p, { n = 3, h = 80, gap = 30, amp = 7, seed = 31, lw = LW.fine } = {}) {
  const b = boil(t);
  for (let i = 0; i < n; i++) {
    const x0 = x + (i - (n - 1) / 2) * gap, lift = (b % 4) * 3;
    const pts = squiggle([x0, y - lift], [x0 + (i - (n - 1) / 2) * 6, y - h - lift], { amp, waves: 1.6, phase: b * 0.9 + i * 2 });
    stroke(ctx, pts, clamp(p * n - i * 0.6), { lw, seed: seed + i + b * 3 });
  }
}

// short radiating "friction / impact" ticks around (x, y), redrawn every 1/12 s. arc = [a0, a1] radians.
export function sparks(ctx, t, x, y, p, { n = 6, r0 = 24, r1 = 46, arc = [-Math.PI * 0.95, -Math.PI * 0.05], seed = 41, lw = LW.fine } = {}) {
  if (p <= 0) return;
  const R = rng(seed + boil(t) * 101);
  for (let i = 0; i < n; i++) {
    const a = lerp(arc[0], arc[1], (i + 0.5 + (R() - 0.5) * 0.6) / n), k0 = r0 * (0.8 + R() * 0.4), k1 = r1 * (0.7 + R() * 0.5);
    if (R() < 0.25) continue;
    const s = [x + Math.cos(a) * k0, y + Math.sin(a) * k0], e = [x + Math.cos(a) * k1, y + Math.sin(a) * k1];
    stroke(ctx, [s, e], clamp(p * 1.5 - i * 0.08), { lw, seed: seed + i, amp: 0.4 });
  }
}

// thermometer: tube from top to bulb centre at (x, bottom). level 0..1 of the tube. ticks: [{ v, label }]
export function thermometer(ctx, x, top, bottom, level, p, { seed = 21, w = 22, ticks = [], paper = null } = {}) {
  if (p <= 0) return;
  const hw = w / 2, br = w * 0.95, y1 = bottom - br * 0.8;
  const yAt = (v) => lerp(y1, top + hw, v);
  // mercury: highlighter orange, on top of the ink would look wrong, so drawn first
  if (level > 0 && p > 0.6) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = PAL.hlOrange; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, bottom, br * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - hw * 0.5, yAt(level), hw, y1 - yAt(level) + br * 0.4); ctx.restore();
  }
  const o = { lw: LW.second, seed };
  stroke(ctx, handLine([x - hw, y1], [x - hw, top + hw], seed), seg(p, 0, 0.3), o);
  stroke(ctx, smooth([[x - hw, top + hw], [x, top - 1], [x + hw, top + hw]], 6), seg(p, 0.28, 0.38), o);
  stroke(ctx, handLine([x + hw, top + hw], [x + hw, y1], seed + 1), seg(p, 0.36, 0.62), { ...o, seed: seed + 1 });
  stroke(ctx, arcPts(x, bottom, br, -Math.PI / 2 + 0.55, Math.PI * 1.5 - 0.55, 30), seg(p, 0.6, 0.85), { ...o, seed: seed + 2 });
  ticks.forEach((tk, i) => {
    const yy = yAt(tk.v);
    stroke(ctx, [[x + hw + 4, yy], [x + hw + 18, yy]], seg(p, 0.8 + i * 0.05, 0.9 + i * 0.05), { lw: LW.fine, seed: seed + 5 + i, amp: 0.3 });
    if (tk.label) write(ctx, tk.label, x + hw + 24, yy, seg(p, 0.85, 1), { size: TYPE.min, font: FONT.note, seed: seed + 9 + i });
  });
  return { yAt };
}

// an atom / particle: hand circle with a letter (O, H, C ...)
export function atom(ctx, label, x, y, r, p, { seed = 51, size = null, hl = null } = {}) {
  if (p <= 0) return;
  if (hl) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5 * clamp(p * 2 - 1); ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(x + 2, y + 2, r * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  stroke(ctx, handCircle(x, y, r, r, seed, { over: 0.08 }), clamp(p * 1.6), { lw: LW.fine, seed });
  write(ctx, label, x, y - r * 0.04, clamp(p * 2 - 1), { size: size ?? r * 1.15, align: 'center', weight: 700, seed: seed + 1 });
}

// curly brace under (or over) a span, with an optional label written below it
export function brace(ctx, x0, x1, y, p, { dir = 1, depth = 18, seed = 61, label = null, size = TYPE.small } = {}) {
  const m = (x0 + x1) / 2, d = depth * dir;
  const pts = smooth([[x0, y], [x0 + 10, y + d * 0.7], [m - 14, y + d * 0.75], [m, y + d * 1.5], [m + 14, y + d * 0.75], [x1 - 10, y + d * 0.7], [x1, y]], 6);
  stroke(ctx, pts, clamp(p * 1.5), { lw: LW.fine, seed });
  if (label) write(ctx, label, m, y + d * 1.5 + dir * size * 0.75, clamp(p * 2 - 0.8), { size, font: FONT.note, align: 'center', seed: seed + 1 });
}
