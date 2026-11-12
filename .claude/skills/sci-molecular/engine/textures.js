// textures.js: procedural canvas textures (no image files, no network). All seeded, so identical every run.
import * as THREE from '/_vendor/three.module.js';
import { seeded } from './core.js';
import { PAL } from './palette.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };

// Screen-space background: vertical gradient + soft radial lift at (cx, cy), with seeded grain against banding.
export function backgroundTex({ top = PAL.bgTop, bottom = PAL.bgBottom, center = PAL.bgCenter, cx = 0.5, cy = 0.42, w = 960, h = 540 } = {}) {
  const [c, g] = canvas(w, h);
  const lin = g.createLinearGradient(0, 0, 0, h); lin.addColorStop(0, top); lin.addColorStop(1, bottom);
  g.fillStyle = lin; g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, w * 0.55);
  rad.addColorStop(0, center); rad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.85; g.fillStyle = rad; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  const img = g.getImageData(0, 0, w, h), d = img.data, r = seeded(11);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c);
}

// Soft round dot (glows, bokeh, sparks). falloff: higher = tighter core.
export function softDotTex(size = 128, falloff = 2.2) {
  const [c, g] = canvas(size, size), m = size / 2, img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot(x + 0.5 - m, y + 0.5 - m) / m, a = r >= 1 ? 0 : Math.pow(1 - r, falloff);
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0); return tex(c, false);
}

// Teardrop flame tongue (white, tinted by sprite colour): wide soft base, pointed top.
export function flameTex(w = 64, h = 128) {
  const [c, g] = canvas(w, h), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = 1 - y / h;                                 // 0 bottom .. 1 top
    const half = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, (v * 0.85 + 0.08))), 0.8) * (1 - v * 0.55);
    const dx = Math.abs((x + 0.5) / w - 0.5) / Math.max(half, 1e-3);
    const a = dx >= 1 ? 0 : Math.pow(1 - dx * dx, 1.5) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05)), 0.7);
    const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.max(0, a) * 255;
  }
  g.putImageData(img, 0, 0); return tex(c, false);
}

// Wood side grain (wraps around a cylinder: u = around, v = along). Returns { map, bump }.
export function woodTex({ seed = 3, base = PAL.wood, dark = PAL.woodDark, light = PAL.woodLight, w = 256, h = 1024 } = {}) {
  const [c, g] = canvas(w, h), r = seeded(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {               // long grain streaks along v
    const x = r() * w, wd = 1 + r() * 4;
    g.strokeStyle = r() < 0.6 ? dark : light; g.globalAlpha = 0.15 + r() * 0.3; g.lineWidth = wd;
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.02 + i) * 3 + (r() - 0.5) * 1.5, y);
    g.stroke();
  }
  for (let i = 0; i < 5; i++) {               // a few knots
    const x = r() * w, y = r() * h, rr = 5 + r() * 8;
    g.globalAlpha = 0.5; g.fillStyle = dark; g.beginPath(); g.ellipse(x, y, rr, rr * 2.2, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const map = tex(c); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = tex(c, false); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

// End grain rings for cylinder caps.
export function endGrainTex({ seed = 5, w = 256 } = {}) {
  const [c, g] = canvas(w, w), r = seeded(seed), m = w / 2;
  g.fillStyle = PAL.woodLight; g.fillRect(0, 0, w, w);
  for (let k = 1; k < 14; k++) { g.strokeStyle = PAL.woodDark; g.globalAlpha = 0.25 + r() * 0.3; g.lineWidth = 1 + r() * 3; g.beginPath(); g.arc(m + (r() - 0.5) * 6, m + (r() - 0.5) * 6, k * m / 14, 0, Math.PI * 2); g.stroke(); }
  g.globalAlpha = 0.6; g.strokeStyle = PAL.woodDark; g.lineWidth = 6; g.beginPath(); g.arc(m, m, m - 3, 0, Math.PI * 2); g.stroke();
  return tex(c);
}

// Friction scorch: dark streaks fading at both ends (alpha map, horizontal).
export function scorchTex({ seed = 9, w = 256, h = 64 } = {}) {
  const [c, g] = canvas(w, h), r = seeded(seed);
  for (let i = 0; i < 40; i++) {
    const y = h * (0.25 + r() * 0.5), x0 = w * r() * 0.2, x1 = w * (0.8 + r() * 0.2);
    g.strokeStyle = '#fff'; g.globalAlpha = 0.08 + r() * 0.2; g.lineWidth = 1 + r() * 3;
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + (r() - 0.5) * 4); g.stroke();
  }
  g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1;
  const fade = g.createLinearGradient(0, 0, w, 0); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.25, '#000'); fade.addColorStop(0.75, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade; g.fillRect(0, 0, w, h);
  return tex(c, false);
}
