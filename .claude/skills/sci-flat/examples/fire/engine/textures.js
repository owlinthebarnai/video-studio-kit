// Background paper, grids, hatching, wood grain, deterministic particles.
import { PAL, LW } from './palette.js';
import { rng, clamp, E } from './ease.js';
import { line } from './shapes.js';

const grainCache = new WeakMap();
function grainPattern(ctx, seed) {
  let pat = grainCache.get(ctx);
  if (pat) return pat;
  const c = new OffscreenCanvas(256, 256), g = c.getContext('2d'), img = g.createImageData(256, 256), r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = 22; img.data[i + 1] = 33; img.data[i + 2] = 62; img.data[i + 3] = r() * 255; }
  g.putImageData(img, 0, 0); pat = ctx.createPattern(c, 'repeat'); grainCache.set(ctx, pat); return pat;
}
// The ONE gradient of the style: soft radial paper, plus faint fixed grain.
export function paper(ctx, W, H, { base = PAL.paper, edge = PAL.paperEdge, grain = 0.03, seed = 7, cx = 0.5, cy = 0.45 } = {}) {
  const g = ctx.createRadialGradient(W * cx, H * cy, H * 0.15, W * 0.5, H * 0.5, H * 1.1);
  g.addColorStop(0, base); g.addColorStop(1, edge);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (grain > 0) { ctx.globalAlpha = grain; ctx.fillStyle = grainPattern(ctx, seed); ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
// thin grid that draws on (rows then columns staggered). Only behind graphs / measurements.
export function grid(ctx, x, y, w, h, step, p = 1, { color = PAL.rule, lw = LW.grid } = {}) {
  if (p <= 0) return;
  const cols = Math.round(w / step), rows = Math.round(h / step), n = cols + rows + 2;
  let k = 0;
  for (let i = 0; i <= rows; i++, k++) line(ctx, [[x, y + i * (h / rows)], [x + w, y + i * (h / rows)]], E.outCubic(clamp(p * 1.6 - (k / n) * 0.6)), { stroke: color, lw });
  for (let j = 0; j <= cols; j++, k++) line(ctx, [[x + j * (w / cols), y + h], [x + j * (w / cols), y]], E.outCubic(clamp(p * 1.6 - (k / n) * 0.6)), { stroke: color, lw });
}
export function dotGrid(ctx, x, y, w, h, step, { color = PAL.rule, r = 2, alpha = 1 } = {}) {
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  for (let yy = y; yy <= y + h + 0.1; yy += step) for (let xx = x; xx <= x + w + 0.1; xx += step) { ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// flat diagonal hatching clipped to the current path set up by `clip()` callback
export function hatch(ctx, clip, x, y, w, h, { gap = 14, color = PAL.ink, lw = LW.hair, alpha = 0.35 } = {}) {
  ctx.save(); clip(); ctx.clip(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); for (let d = -h; d < w; d += gap) { ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); } ctx.stroke(); ctx.restore();
}
// a few long, calm grain strokes inside a box (wood, fibres). Seeded.
export function grainLines(ctx, x, y, w, h, { seed = 3, n = 3, color = PAL.ink, lw = LW.hair, alpha = 0.45 } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const yy = y + h * (0.28 + 0.44 * (i / Math.max(1, n - 1))) + (r() - 0.5) * 4, x0 = x + w * (0.08 + r() * 0.2), x1 = x + w * (0.6 + r() * 0.32);
    line(ctx, [[x0, yy], [x1, yy]], 1, { stroke: color, lw });
  }
  ctx.restore();
}
// deterministic particle set: [{seed values}] built once; position them as f(t) in the scene
export function particles(n, seed = 11) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({ i, a: r(), b: r(), c: r(), d: r() }));
}
