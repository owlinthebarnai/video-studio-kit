// Fluorescent primitives. Draw them into L.main / L.bg (already additive). Every shape is organic:
// outlines come from wobblePts (seeded harmonics + time), never perfect circles or straight rules.
import { C, CH, LW, rgba, hot } from './palette.js';
import { rng, noise1, TAU, clamp, frac, lerp } from './ease.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------- sprites: cached radial glows, the cheapest way to draw light ----------
const SP = new Map();
export function sprite(ch, kind = 'soft') {
  const c = C(ch), key = c.key + kind;
  if (SP.has(key)) return SP.get(key);
  const S = 128, cv = mk(S, S), x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (kind === 'core') {
    g.addColorStop(0, rgba(hot(c.rgb, 0.75), 1)); g.addColorStop(0.1, rgba(hot(c.rgb, 0.3), 0.95));
    g.addColorStop(0.28, rgba(c.rgb, 0.45)); g.addColorStop(0.6, rgba(c.rgb, 0.1)); g.addColorStop(1, rgba(c.rgb, 0));
  } else {
    for (let i = 0; i <= 10; i++) { const u = i / 10; g.addColorStop(u, rgba(c.rgb, Math.exp(-u * u * 4.2) * (1 - u))); }
  }
  x.fillStyle = g; x.fillRect(0, 0, S, S); SP.set(key, cv);
  return cv;
}
// dot: one fluorescent spot of radius r. kind 'soft' (diffuse) or 'core' (bright puncta with a white-hot centre)
export function dot(ctx, x, y, r, ch, a = 1, kind = 'soft') {
  if (a <= 0.003 || r <= 0.3) return;
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * Math.min(1, a);
  ctx.drawImage(sprite(ch, kind), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = ga;
}
export function withAlpha(ctx, a, fn) { if (a <= 0.003) return; const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; fn(); ctx.globalAlpha = ga; }
export function group(ctx, { x = 0, y = 0, rot = 0, s = 1, a = 1 } = {}, fn) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); fn(); ctx.restore();
}

// ---------- organic outlines ----------
const HC = new Map();
const harm = (seed) => {
  if (HC.has(seed)) return HC.get(seed);
  const r = rng(seed * 101 + 7), hs = [2, 3, 4, 6, 9].map((k) => ({ k, ph: r() * TAU, a: (0.5 + r() * 0.5) / Math.sqrt(k), sp: (r() - 0.5) * 2 }));
  HC.set(seed, hs); return hs;
};
// closed wobbly outline (array of [x,y]); amp ~0.04 (rings) .. 0.15 (blobs); speed in harmonic turns/s
export function wobblePts(cx, cy, r, { seed = 1, t = 0, amp = 0.08, n = 72, speed = 0.12, sx = 1, sy = 1, rot = 0 } = {}) {
  const hs = harm(seed), pts = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU - Math.PI / 2;
    let d = 0; for (const h of hs) d += h.a * Math.sin(h.k * th + h.ph + t * h.sp * speed * TAU);
    const rr = r * (1 + amp * d), x = Math.cos(th) * rr * sx, y = Math.sin(th) * rr * sy;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}
export function path(ctx, pts, closed = false) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
// first fraction p of a polyline (closed: wraps back to the start)
export function partial(pts, p, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts;
  if (p >= 1) return P;
  const f = clamp(p) * (P.length - 1), i = Math.floor(f), u = f - i, out = P.slice(0, i + 1);
  if (i + 1 < P.length) out.push([lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u)]);
  return out;
}

// glowing line: wide dim halo + mid glow + thin hot core. The basic "line" of the style.
export function glowStroke(ctx, pts, ch, { lw = LW.core, halo = LW.halo, a = 1, closed = false, p = 1 } = {}) {
  if (a <= 0.003 || p <= 0) return;
  const P = closed || p < 1 ? partial(pts, p, closed) : pts; if (P.length < 2) return;
  const c = C(ch);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; path(ctx, P, false);
  ctx.strokeStyle = rgba(c.rgb, 0.09 * a); ctx.lineWidth = halo; ctx.stroke();
  ctx.strokeStyle = rgba(c.rgb, 0.26 * a); ctx.lineWidth = halo * 0.38; ctx.stroke();
  ctx.strokeStyle = rgba(hot(c.rgb, 0.4), 0.9 * a); ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}
// fill a closed outline with a radial falloff (bright centre, invisible edge)
export function glowFill(ctx, pts, ch, cx, cy, r, { a = 1, hotK = 0.35, inner = 0.25 } = {}) {
  if (a <= 0.003) return;
  const c = C(ch), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
  g.addColorStop(0, rgba(hot(c.rgb, hotK), 0.85 * a)); g.addColorStop(inner, rgba(c.rgb, 0.55 * a));
  g.addColorStop(0.75, rgba(c.rgb, 0.16 * a)); g.addColorStop(1, rgba(c.rgb, 0));
  path(ctx, pts, true); ctx.fillStyle = g; ctx.fill();
}

// ---------- structures ----------
// blob: wobbly fluorescent mass (vesicle, atom, heat spot)
export function blob(ctx, x, y, r, ch, { a = 1, seed = 1, t = 0, amp = 0.12, hotK = 0.35, speed = 0.15 } = {}) {
  glowFill(ctx, wobblePts(x, y, r, { seed, t, amp, speed, n: 40 }), ch, x, y, r, { a, hotK });
}
// ring: membrane-like closed outline, drawn on with p (starts at 12 o'clock, clockwise)
export function ring(ctx, x, y, r, ch, { p = 1, a = 1, seed = 1, t = 0, amp = 0.025, lw = LW.ring, halo = 26, fill = 0.07 } = {}) {
  const pts = wobblePts(x, y, r, { seed, t, amp, n: 120 });
  if (fill > 0 && p >= 1) withAlpha(ctx, a, () => { path(ctx, pts, true); ctx.fillStyle = rgba(C(ch).rgb, fill); ctx.fill(); });
  glowStroke(ctx, pts, ch, { lw, halo, a, closed: true, p });
}
// cell: membrane + faint cytoplasm + nucleus + puncta
export function cell(ctx, x, y, r, ch, { a = 1, seed = 1, t = 0, nucleus = null, puncta = 6, p = 1, sx = 1, sy = 1, rot = 0 } = {}) {
  const pts = wobblePts(x, y, r, { seed, t, amp: 0.09, sx, sy, rot });
  if (p >= 1) glowFill(ctx, pts, ch, x, y, r * Math.max(sx, sy), { a: a * 0.22, hotK: 0 });
  glowStroke(ctx, pts, ch, { a, closed: true, p });
  if (nucleus) blob(ctx, x + r * 0.12, y - r * 0.08, r * 0.38, nucleus, { a: a * p, seed: seed + 3, t });
  const R = rng(seed * 13 + 1);
  for (let i = 0; i < puncta; i++) {
    const th = R() * TAU, d = Math.sqrt(R()) * r * 0.7, n = noise1(seed * 50 + i);
    dot(ctx, x + Math.cos(th) * d * sx + n(t * 0.6) * 5, y + Math.sin(th) * d * sy + n(t * 0.6 + 9) * 5, 6 + R() * 6, ch, a * p * 0.9, 'core');
  }
}
// tube: a long plant cell / fibre from (x0,y0) to (x1,y1): two wobbly walls, faint lumen, cross walls (septa).
// p draws it on along its length.
export function tube(ctx, x0, y0, x1, y1, wd, ch, { a = 1, seed = 1, t = 0, septa = 4, wob = 4, p = 1, lw = LW.core, halo = 12, fill = 0.08, pits = 0, pitCh = null } = {}) {
  if (a <= 0.003 || p <= 0) return;
  const L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), n = noise1(seed), Lp = L * p;
  const N = Math.max(8, Math.round(Lp / 22));
  const wall = (side) => Array.from({ length: N + 1 }, (_, i) => { const x = (i / N) * Lp; return [x, side * wd / 2 + n(x / 70 + side * 7.3 + t * 0.25) * wob]; });
  const top = wall(-1), bot = wall(1);
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
  withAlpha(ctx, a, () => { path(ctx, [...top, ...bot.slice().reverse()], true); ctx.fillStyle = rgba(C(ch).rgb, fill); ctx.fill(); });
  glowStroke(ctx, top, ch, { a, lw, halo }); glowStroke(ctx, bot, ch, { a, lw, halo });
  for (let k = 0; k <= septa; k++) {
    const x = (k / septa) * L; if (x > Lp + 0.5) break;
    const s = n(k * 3.1) * wd * 0.25, yT = -wd / 2 + n(x / 70 - 7.3 + t * 0.25) * wob, yB = wd / 2 + n(x / 70 + 7.3 + t * 0.25) * wob;
    glowStroke(ctx, [[x - s, yT], [x + s * 0.4, 0], [x + s, yB]], ch, { a: a * 0.8, lw: lw * 0.8, halo: halo * 0.7 });
  }
  const R = rng(seed * 17 + 5);                            // pits: bright puncta in the lumen
  for (let i = 0; i < pits; i++) { const x = R() * L; if (x <= Lp) dot(ctx, x, (R() - 0.5) * wd * 0.5, 4 + R() * 4, pitCh || ch, a * (0.5 + 0.5 * R()), 'core'); }
  ctx.restore();
}

// ---------- particles (all f(t): phase = frac(t * speed + offset)) ----------
// rising sparks from a source box; returns nothing. chs picked per particle.
export function embers(ctx, t, { x, y, spread = 80, rise = 300, n = 30, seed = 21, a = 1, chs = ['yellow'], r = [3, 7], speed = 0.6, sway = 40, kind = 'core' } = {}) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const off = R(), sp = speed * (0.6 + R() * 0.8), x0 = (R() - 0.5) * spread, rr = r[0] + R() * (r[1] - r[0]), ch = chs[(R() * chs.length) | 0];
    const ph = frac(t * sp + off), nz = noise1(seed * 97 + i);
    const px = x + x0 + nz(t * 0.8) * sway * ph, py = y - ph * rise;
    const fl = 0.65 + 0.35 * nz(t * 6 + 11);
    dot(ctx, px, py, rr * (1 - ph * 0.5), ch, a * Math.sin(Math.PI * ph) * fl, kind);
  }
}
// brownian swarm inside a box (molecules in solution, dust)
export function swarm(ctx, t, { x, y, w, h, n = 24, seed = 31, a = 1, chs = ['cyan'], r = [4, 9], speed = 0.25, kind = 'core' } = {}) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h, rr = r[0] + R() * (r[1] - r[0]), ch = chs[(R() * chs.length) | 0], nz = noise1(seed * 59 + i);
    dot(ctx, px + nz(t * speed) * 40, py + nz(t * speed + 40) * 40, rr, ch, a * (0.6 + 0.4 * nz(t * 1.5 + 7)), kind);
  }
}
// flame: a fluorescent flame standing on (x, y), height ~ 260*size. cyan base, yellow body, magenta tips.
export function flame(ctx, x, y, size, t, { seed = 11, a = 1, n = 54 } = {}) {
  if (a <= 0.003 || size <= 0) return;
  const H = 260 * size, W = 64 * size, R = rng(seed), sw = noise1(seed);
  for (let i = 0; i < n; i++) {
    const off = R(), sp = 1.1 + R() * 0.9, xo = (R() - 0.5) * 2, ph = frac(t * sp + off), nz = noise1(seed * 11 + i);
    const nar = Math.pow(1 - ph, 0.8);
    const px = x + xo * W * 0.55 * nar + (sw(t * 1.2 + ph * 1.5) * 0.6 + nz(t * 2) * 0.4) * W * 0.45 * ph;
    const py = y - ph * H * (0.85 + 0.3 * R());
    const rr = W * (0.62 * nar + 0.14), ch = ph < 0.16 ? 'cyan' : ph < 0.62 ? 'yellow' : 'magenta';
    dot(ctx, px, py, rr, ch, a * Math.sin(Math.PI * Math.min(1, ph * 1.15)) * (ch === 'cyan' ? 0.22 : ch === 'yellow' ? 0.24 : 0.3));
  }
  const fl = 1 + 0.08 * sw(t * 5);
  dot(ctx, x + sw(t * 1.3) * W * 0.12, y - H * 0.22, W * 1.0 * fl, 'yellow', a * 0.45, 'core');
  dot(ctx, x, y - H * 0.05, W * 0.7, 'cyan', a * 0.35);
  dot(ctx, x, y - H * 0.4, W * 1.9, 'magenta', a * 0.22);
}
