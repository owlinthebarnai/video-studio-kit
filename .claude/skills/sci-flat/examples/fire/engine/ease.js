// Easing, maths and seeded randomness. Never use Math.random(): everything is f(t, seed).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const lerp2 = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
export const TAU = Math.PI * 2;

export const E = {
  linear: (u) => u,
  inCubic: (u) => u * u * u,
  outCubic: (u) => 1 - Math.pow(1 - u, 3),
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outQuint: (u) => 1 - Math.pow(1 - u, 5),
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  // slight overshoot (~7 % at s = 1.4). Use for pop-ins only.
  outBack: (u, s = 1.4) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
};

// mulberry32: rng(seed)() -> [0,1)
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise in [-1,1]: const n = noise1(3); n(t * 2)
export function noise1(seed = 1) {
  const r = rng(seed), v = Array.from({ length: 256 }, r);
  return (x) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(v[i & 255], v[(i + 1) & 255], u) * 2 - 1;
  };
}
