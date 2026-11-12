// Pencil hatching + highlighter. Both are "media" laid over / under ink, never used for outlines.
import { PAL, LW } from './palette.js';
import { rng, noise1 } from './rand.js';
import { clamp } from './ease.js';
import { dist, unit, perp, add } from './path.js';

// Parallel pencil strokes clipped to a region, appearing one after another (p 0..1).
//   clip: (ctx) => adds a path (use polyPath(pts) or a ctx.ellipse); box: {x,y,w,h} covering the region
export function hatch(ctx, clip, box, p, { angle = -Math.PI / 4, gap = 9, lw = LW.hatch, color = PAL.pencil, alpha = 0.5, seed = 1, cross = false } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.beginPath(); clip(ctx); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.globalAlpha *= alpha;
  const pass = (ang, q, sd) => {
    const r = rng(sd), c = [box.x + box.w / 2, box.y + box.h / 2], R = Math.hypot(box.w, box.h) / 2 + 4;
    const N = Math.ceil((2 * R) / gap), k = q * N;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const jo = (r() - 0.5) * gap * 0.35, ja = ang + (r() - 0.5) * 0.06, sk = 0.85 + r() * 0.15, f = clamp(k - i);
      if (f <= 0) continue;
      const d = [Math.cos(ja), Math.sin(ja)], n = [-Math.sin(ang), Math.cos(ang)];
      const s0 = add(add(c, n, -R + i * gap + jo), d, -R * sk);
      const s1 = add(s0, d, 2 * R * sk * f);
      ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]);
    }
    ctx.stroke();
  };
  if (cross) { pass(angle, clamp(p * 2), seed); pass(angle + Math.PI / 2, clamp(p * 2 - 1), seed + 9); }
  else pass(angle, p, seed);
  ctx.restore();
}

// Highlighter swipe from a to b (chisel tip, flat ends, multiply, darker where the 2 passes overlap)
export function highlight(ctx, a, b, p, { color = PAL.hlYellow, w = LW.hl, seed = 1, alpha = 0.5 } = {}) {
  if (p <= 0) return;
  const L = dist(a, b), u = unit(a, b), n = perp(u);
  const quad = (len, ww, off, sd) => {
    const N = Math.max(4, Math.ceil(len / 14)), top = [], bot = [], sl = ww * 0.2;
    for (let i = 0; i <= N; i++) {
      const s = (len * i) / N, c = add(add(a, u, s), n, off + noise1(sd, s / 140) * 3), hw = (ww / 2) * (1 + noise1(sd + 9, s / 45) * 0.07);
      top.push(add(add(c, n, hw), u, sl)); bot.push(add(add(c, n, -hw), u, -sl));
    }
    ctx.beginPath(); [...top, ...bot.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  };
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color;
  ctx.globalAlpha *= alpha; quad(L * clamp(p), w, 0, seed);
  ctx.globalAlpha *= 0.55; quad(L * clamp(p * 1.08 - 0.12), w * 0.8, w * 0.12, seed + 3);
  ctx.restore();
}

// highlight behind a text box returned by write()/measure()
export const highlightBox = (ctx, box, p, o = {}) =>
  highlight(ctx, [box.x0 - 10, box.y + 4], [box.x1 + 10, box.y + 1], p, { w: box.h * 0.85, ...o });

// Zig-zag scribble fill clipped to a region (highlighter or pencil). p reveals along the zig-zag.
export function scribble(ctx, clip, box, p, { color = PAL.hlOrange, lw = 20, gap = 14, angle = -1.1, alpha = 0.5, seed = 1, multiply = true } = {}) {
  if (p <= 0) return;
  const r = rng(seed), c = [box.x + box.w / 2, box.y + box.h / 2], R = Math.hypot(box.w, box.h) / 2;
  const d = [Math.cos(angle), Math.sin(angle)], n = [-d[1], d[0]], N = Math.ceil((2 * R) / gap), pts = [];
  for (let i = 0; i <= N; i++) pts.push(add(add(c, n, -R + i * gap + (r() - 0.5) * gap * 0.4), d, (i % 2 ? 1 : -1) * R * (0.92 + r() * 0.08)));
  const k = clamp(p) * N;
  ctx.save(); ctx.beginPath(); clip(ctx); ctx.clip();
  if (multiply) ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= N; i++) {
    const f = clamp(k - (i - 1)); if (f <= 0) break;
    const a = pts[i - 1], b = pts[i]; ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
  }
  ctx.stroke(); ctx.restore();
}
