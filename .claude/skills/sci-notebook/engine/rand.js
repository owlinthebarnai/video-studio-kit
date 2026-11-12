// Seeded randomness only. Never Math.random() in a scene.

export function hash(n) {
  n = (n | 0) ^ 0x9e3779b9;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

// rng(seed)() -> [0,1), mulberry32
export function rng(seed) {
  let a = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// smooth 1D value noise in [-1, 1]
export function noise1(seed, x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = hash(i * 7919 + seed * 104729), b = hash((i + 1) * 7919 + seed * 104729);
  return (a + (b - a) * u) * 2 - 1;
}

export function strSeed(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Hand-drawn animation runs "on twos": 12 drawings per second.
// boil(t) = integer drawing index (use as a seed offset for flicker / line boil);
// onTwos(t) = t quantised to that grid (use it for anything that MOVES).
export const boil = (t, fps = 12) => Math.floor(t * fps + 1e-6);
export const onTwos = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
