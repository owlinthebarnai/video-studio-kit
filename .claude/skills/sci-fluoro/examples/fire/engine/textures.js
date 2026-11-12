// Sensor textures (grain, chromatic noise, vignette) and background debris. All seeded.
import { CH, CHANNELS, rgba } from './palette.js';
import { rng, noise1, TAU } from './ease.js';
import { dot } from './glow.js';

export const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };

// n tiles, each { add, mul }: add = sparse coloured photon specks (draw 'lighter'),
// mul = luminance grain near white (draw 'multiply': only shows on lit areas).
export function grainTiles(n = 6, size = 256, seed = 7, { density = 0.05, spark = 46, lum = 70 } = {}) {
  const r = rng(seed), tiles = [];
  const cols = [...CHANNELS.map((k) => CH[k].rgb), [255, 255, 255]];
  for (let k = 0; k < n; k++) {
    const add = canvas(size, size), mul = canvas(size, size);
    const ax = add.getContext('2d'), mx = mul.getContext('2d');
    const A = ax.createImageData(size, size), M = mx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const o = i * 4;
      if (r() < density) {
        const c = cols[(r() * cols.length) | 0], v = (8 + r() * spark) / 255;
        A.data[o] = c[0] * v; A.data[o + 1] = c[1] * v; A.data[o + 2] = c[2] * v;
      }
      A.data[o + 3] = 255;
      const g = 255 - r() * r() * lum; M.data[o] = M.data[o + 1] = M.data[o + 2] = g; M.data[o + 3] = 255;
    }
    ax.putImageData(A, 0, 0); mx.putImageData(M, 0, 0);
    tiles.push({ add, mul });
  }
  return tiles;
}

// Black-alpha radial vignette (draw source-over). strength 0..1.
export function vignetteCanvas(W, H, strength = 0.6) {
  const c = canvas(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c;
}

// Out-of-focus debris for the bg layer: big soft discs, very dim, drifting slowly. Draw into L.bg.
export function bokeh(ctx, t, { n = 20, seed = 3, w = 1920, h = 1080, chs = CHANNELS, rMin = 30, rMax = 120, a = 0.14, speed = 0.08 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * w, y0 = r() * h, rr = rMin + r() * (rMax - rMin), ch = chs[(r() * chs.length) | 0], ai = a * (0.4 + r() * 0.6);
    const nx = noise1(seed * 31 + i), ny = noise1(seed * 31 + i + 500);
    dot(ctx, x0 + nx(t * speed) * 60, y0 + ny(t * speed) * 45, rr, ch, ai * (0.75 + 0.25 * nx(t * 0.7 + 3)));
  }
}

// Faint autofluorescent haze: 3-5 huge, barely visible clouds. Draw into L.bg.
export function haze(ctx, t, { seed = 4, w = 1920, h = 1080, chs = ['cyan', 'magenta'], a = 0.06 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    const n = noise1(seed * 17 + i);
    dot(ctx, r() * w, r() * h, 380 + r() * 300, chs[i % chs.length], a * (0.7 + 0.3 * n(t * 0.3)));
  }
}
