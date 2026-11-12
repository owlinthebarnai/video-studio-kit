// Hand arrows: the shaft draws first, then the head as ONE pen stroke (barb -> tip -> barb), like a person.
import { PAL, LW } from './palette.js';
import { clamp } from './ease.js';
import { stroke } from './ink.js';
import { curve, resample, add } from './path.js';

function headPts(tip, from, size, spread = 0.5) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const b1 = [tip[0] - Math.cos(a - spread) * size, tip[1] - Math.sin(a - spread) * size];
  const b2 = [tip[0] - Math.cos(a + spread) * size * 0.92, tip[1] - Math.sin(a + spread) * size * 0.92];
  return [b1, tip, b2];
}

// arrow(ctx, pts, p, opts): pts = polyline (use curve(a, b, bend) for a bent one). double: heads at both ends.
export function arrow(ctx, pts, p, { lw = LW.second, color = PAL.ink, seed = 1, head = 22, double = false, headAt = 0.75, amp = 1.1 } = {}) {
  if (p <= 0) return;
  const R = resample(pts, 6), ps = clamp(p / headAt), ph = clamp((p - headAt) / (1 - headAt));
  stroke(ctx, R, ps, { lw, color, seed, amp });
  const k = Math.min(R.length - 1, 4);
  if (ph > 0) {
    stroke(ctx, headPts(R[R.length - 1], R[R.length - 1 - k], head), ph, { lw, color, seed: seed + 2, amp: 0.5, taper: false });
    if (double) stroke(ctx, headPts(R[0], R[k], head), ph, { lw, color, seed: seed + 3, amp: 0.5, taper: false });
  }
}

// bent arrow from a to b in one call
export const arrowTo = (ctx, a, b, p, { bend = 0.15, ...o } = {}) => arrow(ctx, curve(a, b, bend), p, o);

// a straight double-headed "back and forth" arrow centered on c along unit vector u, length L
export const rubArrow = (ctx, c, u, L, p, o = {}) => arrow(ctx, [add(c, u, -L / 2), add(c, u, L / 2)], p, { double: true, ...o });
