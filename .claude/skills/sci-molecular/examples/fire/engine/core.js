// core.js: time, easing, seeded randomness, timeline cues. No three.js dependency.
// Everything in a frame is a pure function of t (seconds). Never use Math.random or Date in a scene.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smoothstep = (a, b, x) => { const k = invLerp(a, b, x); return k * k * (3 - 2 * k); };
export const TAU = Math.PI * 2;
export const deg = (d) => (d * Math.PI) / 180;

// Easing. House curves: inOutCubic (approach, rearrange), outBack (bond snap), inOutSine (camera).
export const ease = {
  linear: (k) => k,
  inOutSine: (k) => 0.5 - 0.5 * Math.cos(Math.PI * k),
  outSine: (k) => Math.sin((Math.PI * k) / 2),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  inOutQuint: (k) => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
  outQuint: (k) => 1 - Math.pow(1 - k, 5),
  outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  outBack: (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
export const E = (e) => (typeof e === 'function' ? e : ease[e || 'linear']);

// Progress of t through [a, b], clamped and eased.
export const seg = (t, a, b, e = 'linear') => E(e)(invLerp(a, b, t));

// Staggered window for item i of n inside [a, b]: each item lasts `dur` s, starts spread evenly.
export function stagger(i, n, a, b, dur) {
  const span = b - a, d = Math.min(dur ?? span * 0.6, span);
  const gap = n > 1 ? (span - d) / (n - 1) : 0;
  return [a + i * gap, a + i * gap + d];
}

// Named cues: const tl = timeline({ approach: [3, 3.5], react: [3.5, 4.4], hold: [4.4, 5] });
// tl.p('react', t, 'inOutCubic') -> 0..1 ; tl.in('hold', t) -> bool ; tl.cue('hold') -> [a, b]
export function timeline(cues) {
  return {
    cues,
    cue: (n) => cues[n],
    p: (n, t, e) => seg(t, cues[n][0], cues[n][1], e),
    in: (n, t) => t >= cues[n][0] && t < cues[n][1],
  };
}

// Keyframe track: track([[0, 0], [1.5, 10], [5, 12, 'outCubic']], 'inOutSine')(t). Values: numbers or arrays.
export function track(keys, e = 'inOutSine') {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const k = E(e1 || e)(invLerp(t0, t1, t));
        return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  };
}

// Seeded PRNG (mulberry32). const r = seeded(7); r() -> [0,1); r.range(a,b); r.pick(arr)
export function seeded(seed = 1) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

// Deterministic smooth 1D value noise in [-1, 1] (micro camera breathing etc.).
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

export const frac = (x) => x - Math.floor(x);
// 0 -> 1 -> 0 bump over [a, b] (sine), for flashes and pulses.
export const bell = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
// in/out envelope: fades in over [a, a+fi], holds, fades out over [b-fo, b].
export const env = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smoothstep(a, a + fi, t), 1 - smoothstep(b - fo, b, t));
