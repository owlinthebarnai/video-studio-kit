// Arrows that grow along a path, with a rounded filled head.
import { PAL, LW } from './palette.js';
import { E, clamp } from './ease.js';
import { partial, line, quadPts, arcPts, style } from './shapes.js';

// pts: polyline; p: LINEAR 0..1 (eased inside with outCubic)
export function arrow(ctx, pts, p, { color = PAL.ink, lw = LW.main, head = null, ease = E.outCubic, dash = null } = {}) {
  if (p <= 0) return;
  const q = partial(pts, ease(clamp(p)));
  if (q.length < 2) return;
  const hs = (head ?? lw * 3.4) * clamp(p * 4);
  let i = q.length - 2, b = q[q.length - 1], a = q[i];
  while (i > 0 && Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-3) a = q[--i];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  // stop the shaft inside the head so the round cap never pokes through
  const back = [b[0] - Math.cos(ang) * hs * 0.6, b[1] - Math.sin(ang) * hs * 0.6];
  line(ctx, [...q.slice(0, -1), back], 1, { stroke: color, lw, dash });
  const c = Math.cos(ang), s = Math.sin(ang), w = hs * 0.62;
  ctx.save(); style(ctx, { stroke: color, lw: Math.max(2, lw * 0.6), fill: color });
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(b[0] - c * hs - s * w, b[1] - s * hs + c * w);
  ctx.lineTo(b[0] - c * hs + s * w, b[1] - s * hs - c * w);
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
// straight arrow from a to b
export const arrowAB = (ctx, a, b, p, opts) => arrow(ctx, [a, b], p, opts);
// curved arrow: bend = perpendicular offset of the control point (px, + = left of travel)
export function curveArrow(ctx, a, b, bend, p, opts) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  arrow(ctx, quadPts(a, [mx + (dy / L) * bend, my - (dx / L) * bend], b), p, opts);
}
// arc arrow around a centre (cycles, rotation)
export const arcArrow = (ctx, cx, cy, r, a0, a1, p, opts) => arrow(ctx, arcPts(cx, cy, r, a0, a1), p, opts);
