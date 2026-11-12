// Flat shapes, draw-on strokes, pop-ins and transform groups (Canvas 2D).
import { PAL, LW } from './palette.js';
import { E, clamp, lerp, TAU } from './ease.js';

export function style(ctx, { stroke = PAL.ink, lw = LW.main, fill = null } = {}) {
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (fill) ctx.fillStyle = fill;
}

// ---- point lists (everything that draws on is a polyline) ----
export function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
// first fraction p (by length) of a polyline
export function partial(pts, p) {
  if (p >= 1) return pts;
  if (p <= 0) return [pts[0]];
  const L = polyLen(pts) * p; let acc = 0; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + d >= L) { const u = d ? (L - acc) / d : 0; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); return out; }
    acc += d; out.push(b);
  }
  return out;
}
export const arcPts = (cx, cy, r, a0, a1, n = 48) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
export const circlePts = (cx, cy, r, start = -Math.PI / 2, n = 64) => arcPts(cx, cy, r, start, start + TAU, n);
export function bezPts(p0, p1, p2, p3, n = 32) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
            v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  });
}
export function quadPts(p0, c, p1, n = 32) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]];
  });
}
// wavy line from (x,y) along angle `ang` (default: straight up)
export function wavePts(x, y, len, { amp = 8, waves = 2.5, phase = 0, ang = -Math.PI / 2, n = 40 } = {}) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (i / n) * len, w = Math.sin((i / n) * waves * TAU + phase) * amp;
    return [x + dx * s + nx * w, y + dy * s + ny * w];
  });
}
// rounded rectangle as a closed point list (for draw-on outlines)
export function rrectPts(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return [
    ...arcPts(x + w - r, y + r, r, -Math.PI / 2, 0, 8), ...arcPts(x + w - r, y + h - r, r, 0, Math.PI / 2, 8),
    ...arcPts(x + r, y + h - r, r, Math.PI / 2, Math.PI, 8), ...arcPts(x + r, y + r, r, Math.PI, Math.PI * 1.5, 8),
    [x + w - r, y],
  ];
}

export function trace(ctx, pts, close = false) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

// stroke the first fraction p of a polyline. opts: stroke, lw, dash
export function line(ctx, pts, p = 1, opts = {}) {
  if (p <= 0 || pts.length < 2) return;
  ctx.save(); style(ctx, opts);
  if (opts.dash) ctx.setLineDash(opts.dash);
  trace(ctx, partial(pts, p)); ctx.stroke(); ctx.restore();
}

// closed shape that builds on: outline draws (first 70 %), flat fill fades in after.
export function shape(ctx, pts, p = 1, { fill = null, stroke = PAL.ink, lw = LW.main } = {}) {
  if (p <= 0) return;
  const fa = clamp((p - 0.55) / 0.45);
  if (fill && fa > 0) { ctx.save(); ctx.globalAlpha *= fa; ctx.fillStyle = fill; trace(ctx, pts, true); ctx.fill(); ctx.restore(); }
  if (stroke && lw > 0) {
    const sp = E.inOutCubic(clamp(p / 0.7));
    if (sp >= 1) { ctx.save(); style(ctx, { stroke, lw }); trace(ctx, pts, true); ctx.stroke(); ctx.restore(); }
    else line(ctx, [...pts, pts[0]], sp, { stroke, lw });
  }
}

// immediate flat primitives
export function circle(ctx, x, y, r, { fill = null, stroke = PAL.ink, lw = LW.main } = {}) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { style(ctx, { stroke, lw }); ctx.stroke(); }
}
export function rrect(ctx, x, y, w, h, r, { fill = null, stroke = PAL.ink, lw = LW.main } = {}) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { style(ctx, { stroke, lw }); ctx.stroke(); }
}
export function poly(ctx, pts, { fill = null, stroke = PAL.ink, lw = LW.main, close = true } = {}) {
  trace(ctx, pts, close);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { style(ctx, { stroke, lw }); ctx.stroke(); }
}

// ---- transforms ----
// pop-in about (x,y). p is LINEAR 0..1 (use lin()/stag()); scale eases with slight overshoot.
export function pop(ctx, x, y, p, fn, { s = 1.4, fade = 0.35 } = {}) {
  if (p <= 0) return;
  const k = p >= 1 ? 1 : Math.max(0, E.outBack(clamp(p), s));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
  ctx.globalAlpha *= clamp(p / fade); fn(); ctx.restore();
}
// pop-out (exit): p 0..1 shrinks to `to` and fades
export function popOut(ctx, x, y, p, fn, { to = 0.85 } = {}) {
  if (p >= 1) return;
  const k = lerp(1, to, E.inCubic(clamp(p)));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
  ctx.globalAlpha *= 1 - E.inCubic(clamp(p)); fn(); ctx.restore();
}
// transform group: maps local point (ox,oy) to (x,y), scaled by s, rotated by rot
export function group(ctx, { x = 0, y = 0, s = 1, rot = 0, ox = 0, oy = 0, alpha = 1 } = {}, fn) {
  if (alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-ox, -oy);
  ctx.globalAlpha *= alpha; fn(); ctx.restore();
}
export function withAlpha(ctx, a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= Math.min(1, a); fn(); ctx.restore(); }
// flat "glow": concentric flat discs, no blur, no gradient
export function halo(ctx, x, y, r, color, { rings = 2, alpha = 0.18, step = 0.55 } = {}) {
  for (let i = rings; i >= 1; i--) withAlpha(ctx, alpha, () => circle(ctx, x, y, r * (1 + i * step), { fill: color, stroke: null }));
}
