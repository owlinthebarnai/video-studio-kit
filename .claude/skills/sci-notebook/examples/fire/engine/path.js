// Geometry: hand-drawn point lists. Everything returns arrays of [x, y]; stroke() in ink.js draws them.
import { rng } from './rand.js';

export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const plen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; };
export const unit = (a, b) => { const L = dist(a, b) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
export const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
export const perp = (v) => [v[1], -v[0]]; // for v pointing right, perp points UP (screen space)

// evenly spaced points along a polyline
export function resample(pts, step = 8) {
  const out = [pts[0].slice()]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = dist(a, b); if (d === 0) continue;
    let s = step - carry;
    while (s <= d) { out.push([a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d]); s += step; }
    carry = d - (s - step);
  }
  const last = pts[pts.length - 1];
  if (dist(out[out.length - 1], last) > 0.5) out.push(last.slice());
  return out;
}

// Catmull-Rom through control points (n samples per span)
export function smooth(pts, n = 8, closed = false) {
  if (pts.length < 3) return pts.map((p) => p.slice());
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(P[P.length - 2].slice());
  return out;
}

// a ruler-less straight line: slight bow, optional overshoot past both ends (pen lifts late)
export function handLine(a, b, seed = 1, { bow = 0.018, over = 0 } = {}) {
  const r = rng(seed), L = dist(a, b) || 1, u = unit(a, b), n = perp(u);
  const k = (r() - 0.5) * 2 * bow * L;
  const A = add(a, u, -over * (0.4 + 0.6 * r())), B = add(b, u, over * (0.4 + 0.6 * r()));
  const M = add([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], n, k);
  return smooth([A, M, B], Math.max(4, Math.ceil(L / 40)));
}

// a hand circle / ellipse: the ends overshoot and don't quite meet, radius drifts a little
export function handCircle(cx, cy, rx, ry = rx, seed = 1, { over = 0.14, start = null, rot = 0 } = {}) {
  const r = rng(seed), a0 = start ?? (-2.5 + r() * 0.9), sweep = Math.PI * 2 * (1 + over);
  const dr = (r() - 0.5) * 0.12, tilt = rot + (r() - 0.5) * 0.12, ph = r() * 6;
  const n = Math.max(28, Math.ceil((rx + ry) * 0.4)), ct = Math.cos(tilt), st = Math.sin(tilt), pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + sweep * u, k = 1 + dr * (u - 0.5) * 2 + 0.025 * Math.sin(a * 2 + ph);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * ct - y * st, cy + x * st + y * ct]);
  }
  return pts;
}

// an arc (angles in radians, screen space)
export function arcPts(cx, cy, r, a0, a1, n = 24) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}

// polygon as separate strokes (one per side, pen lifted at every corner, small overshoots)
export function handPoly(verts, seed = 1, { closed = true, over = 8, bow = 0.015 } = {}) {
  const out = [], n = closed ? verts.length : verts.length - 1;
  for (let i = 0; i < n; i++) out.push(handLine(verts[i], verts[(i + 1) % verts.length], seed + i * 17, { over, bow }));
  return out;
}
export const handRect = (x, y, w, h, seed = 1, o = {}) => handPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], seed, o);

// quadratic bend from a to b; bend = fraction of length, + bulges to the LEFT of travel
export function curve(a, b, bend = 0.2, n = 24) {
  const L = dist(a, b), u = unit(a, b), nn = perp(u);
  const c = add([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nn, bend * L), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    pts.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

// sine squiggle from a to b (heat waves, springs of thought)
export function squiggle(a, b, { amp = 8, waves = 3, phase = 0 } = {}) {
  const L = dist(a, b), u = unit(a, b), n = perp(u), N = Math.max(12, Math.ceil(L / 6)), pts = [];
  for (let i = 0; i <= N; i++) { const s = i / N; pts.push(add(add(a, u, s * L), n, Math.sin(s * waves * Math.PI * 2 + phase) * amp)); }
  return pts;
}

// zig-zag (crack, break, rough end of a stick)
export function zigzag(a, b, { amp = 6, teeth = 5, seed = 1 } = {}) {
  const r = rng(seed), u = unit(a, b), n = perp(u), L = dist(a, b), pts = [a.slice()];
  for (let i = 1; i < teeth; i++) pts.push(add(add(a, u, L * i / teeth), n, (i % 2 ? 1 : -1) * amp * (0.6 + 0.6 * r())));
  pts.push(b.slice());
  return pts;
}

export const bbox = (pts, pad = 0) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
};
// clip/fill helper: adds a polygon to the current path
export const polyPath = (pts) => (ctx) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
