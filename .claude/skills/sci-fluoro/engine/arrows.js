// World-space arrows: light travelling along a path (flow), not drawn vector arrows.
import { glowStroke, dot, partial } from './glow.js';
import { frac, clamp, lerp } from './ease.js';

// sample a point at u along a polyline
export function along(pts, u) {
  const P = partial(pts, clamp(u)); return P[P.length - 1];
}
// flow: faint guide line + bright dots streaming along it. p draws the guide on. Use for transport / heat flow.
export function flow(ctx, pts, t, ch, { p = 1, a = 1, n = 6, speed = 0.5, r = 7, guide = 0.35 } = {}) {
  if (a <= 0.003 || p <= 0) return;
  glowStroke(ctx, pts, ch, { a: a * guide, p, lw: 1.5, halo: 10 });
  for (let i = 0; i < n; i++) {
    const u = frac(t * speed + i / n); if (u > p) continue;
    const q = along(pts, u); dot(ctx, q[0], q[1], r, ch, a * Math.sin(Math.PI * u), 'core');
  }
}
// glowArrow: straight glowing shaft with an open chevron head. p draws it on.
export function glowArrow(ctx, x0, y0, x1, y1, ch, { p = 1, a = 1, head = 22, lw = 3 } = {}) {
  if (p <= 0) return;
  const x = lerp(x0, x1, p), y = lerp(y0, y1, p), ang = Math.atan2(y1 - y0, x1 - x0);
  glowStroke(ctx, [[x0, y0], [x, y]], ch, { a, lw });
  const h = (s) => [x - Math.cos(ang + s * 0.5) * head, y - Math.sin(ang + s * 0.5) * head];
  glowStroke(ctx, [h(1), [x, y], h(-1)], ch, { a: a * clamp(p * 3 - 2), lw });
}
