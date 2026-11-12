// Scene timeline helpers. All take absolute time t (seconds) and return 0..1.
import { clamp, E } from './ease.js';

// Default durations (s). Stay close to these: they ARE the style's rhythm.
export const T = { draw: 0.5, pop: 0.35, arrow: 0.45, label: 0.35, stagger: 0.09, exit: 0.3, fade: 0.25, move: 0.55 };

// eased progress of a segment starting at a, lasting d
export const seg = (t, a, d, ease = E.inOutCubic) => ease(clamp((t - a) / d));
// linear progress (feed this to pop(), callout(), molecule(): they ease internally)
export const lin = (t, a, d) => clamp((t - a) / d);
// i-th item of a staggered group
export const stag = (t, a, i, each = T.stagger, d = T.pop, ease = E.linear) => ease(clamp((t - (a + i * each)) / d));
// visibility envelope: fades in at a, fades out ending at b
export const env = (t, a, b, fin = T.fade, fout = T.fade) => Math.min(clamp((t - a) / fin), clamp((b - t) / fout));

// beats({ friction: [0, 1.5], triangle: [1.5, 3], ... })
export function beats(def) {
  const list = Object.entries(def).map(([name, [a, b]], i) => ({ name, a, b, i }));
  const of = (n) => list.find((b) => b.name === n);
  return {
    list, of,
    p: (n, t) => { const b = of(n); return clamp((t - b.a) / (b.b - b.a)); },
    local: (n, t) => t - of(n).a,
    at: (t) => list.filter((b) => t >= b.a).pop() || list[0],
  };
}
