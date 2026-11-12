// Scene timeline helpers. All take absolute time t (seconds) and return 0..1 (or px for focusTrack).
import { clamp, E, smooth, noise1 } from './ease.js';

// Default durations (s). This style is SLOW: things bloom in, they never pop.
export const T = { bloomIn: 0.6, draw: 0.7, label: 0.4, stagger: 0.18, exit: 0.45, fade: 0.35, move: 0.9, pull: 0.3 };

// eased progress of a segment starting at a, lasting d
export const seg = (t, a, d, ease = E.inOutSine) => ease(clamp((t - a) / d));
// linear progress
export const lin = (t, a, d) => clamp((t - a) / d);
// i-th item of a staggered group
export const stag = (t, a, i, each = T.stagger, d = T.bloomIn, ease = E.outSine) => ease(clamp((t - (a + i * each)) / d));
// visibility envelope: fades in at a, fades out ending at b (b = Infinity for "stays")
export const env = (t, a, b = Infinity, fin = T.fade, fout = T.fade) => Math.min(smooth((t - a) / fin), smooth((b - t) / fout));

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

// Focus pulls = the style's transition. pulls: [{ at, peak = 12, rise = 0.3, fall = 0.4 }], blur in px at 1080p.
// intro: start defocused and rack in. breathe: tiny constant focus hunting (px).
export function focusTrack(pulls, { intro = 0.6, introPeak = 10, breathe = 0.7, seed = 5 } = {}) {
  const n = noise1(seed);
  return (t) => {
    let f = intro > 0 ? introPeak * (1 - smooth(t / intro)) : 0;
    for (const { at, peak = 12, rise = T.pull, fall = 0.4 } of pulls) {
      const u = t < at ? smooth((t - (at - rise)) / rise) : 1 - smooth((t - at) / fall);
      f = Math.max(f, peak * u);
    }
    return f + breathe * (0.5 + 0.5 * n(t * 0.9));
  };
}

// Slow stage drift (the slide floating on the stage) + a slow push-in. Returns { x, y, s } for boot's post.cam.
export function driftCam({ amp = 10, speed = 0.25, from = 1, to = 1.035, dur = 5, seed = 9 } = {}) {
  const nx = noise1(seed), ny = noise1(seed + 1);
  return (t) => ({ x: amp * nx(t * speed), y: amp * 0.8 * ny(t * speed), s: from + (to - from) * E.inOutSine(clamp(t / dur)) });
}
