// Ink: the one way lines get on the page. A stroke wobbles (low + high frequency, seeded by arc length),
// swells and thins with pen pressure, tapers at its real ends, and draws on from start to end with p.
import { PAL, LW } from './palette.js';
import { noise1 } from './rand.js';
import { resample, dist } from './path.js';
import { clamp } from './ease.js';

// wobbled copy of a path: [x, y, s] with s = arc length
export function inkPath(pts, seed = 1, amp = 1.3, step = 7) {
  const R = resample(pts, step), out = []; let s = 0;
  for (let i = 0; i < R.length; i++) {
    if (i) s += dist(R[i - 1], R[i]);
    const a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const o = amp * (noise1(seed, s / 75) + 0.35 * noise1(seed + 17, s / 12));
    out.push([R[i][0] - (dy / d) * o, R[i][1] + (dx / d) * o, s]);
  }
  return out;
}

// stroke(ctx, pts, p, opts) -> pen position [x, y] (or null if nothing drawn)
//   lw: base width; amp: wobble px (0 = ruler); pressure: width variation 0..1; taper: thin real ends
export function stroke(ctx, pts, p = 1, { lw = LW.main, color = PAL.ink, seed = 1, amp = 1.3, pressure = 0.3, taper = true, alpha = 1 } = {}) {
  if (p <= 0 || !pts || pts.length < 2) return null;
  const Q = inkPath(pts, seed, amp), L = Q[Q.length - 1][2], end = L * clamp(p);
  const width = (s) => {
    let w = lw * (1 - pressure / 2 + pressure * (0.5 + 0.5 * noise1(seed + 5, s / 60)));
    if (taper) w *= Math.min(0.55 + 0.45 * clamp(s / 16), 0.4 + 0.6 * clamp((L - s) / 22));
    return w;
  };
  ctx.save();
  ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let head = Q[0];
  for (let i = 1; i < Q.length; i++) {
    const a = Q[i - 1]; let b = Q[i];
    if (a[2] >= end) break;
    if (b[2] > end) { const f = (end - a[2]) / (b[2] - a[2]); b = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, end]; }
    ctx.lineWidth = width((a[2] + b[2]) / 2);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    head = b;
  }
  ctx.restore();
  return [head[0], head[1]];
}

// several strokes drawn one after another by the same pen; p shared by length (+ a small lift per stroke)
export function strokes(ctx, list, p = 1, opts = {}) {
  const lift = opts.lift ?? 40, lens = list.map((s) => { let L = 0; for (let i = 1; i < s.length; i++) L += dist(s[i - 1], s[i]); return L + lift; });
  const tot = lens.reduce((a, b) => a + b, 0); let acc = 0, head = null;
  list.forEach((s, i) => {
    const a = acc / tot, b = (acc + lens[i]) / tot; acc += lens[i];
    const q = clamp((p - a) / (b - a) * (lens[i] / (lens[i] - lift)));
    const h = stroke(ctx, s, q, { ...opts, seed: (opts.seed ?? 1) + i * 31 }); if (h) head = h;
  });
  return head;
}

// an ink dot (full stop, atom nucleus, point on a graph)
export function dot(ctx, x, y, r = 4.5, p = 1, color = PAL.ink) {
  if (p <= 0) return;
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * clamp(p * 1.5), 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
