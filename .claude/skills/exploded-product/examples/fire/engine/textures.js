// textures.js: procedural canvas textures (seeded, no image files). All return THREE.CanvasTexture.
import * as THREE from '/_vendor/three.module.js';
import { seeded, TAU } from './core.js';

// Generic: canvasTex(512, 512, (ctx, w, h) => {...}, { srgb: true, repeat: [1, 1] })
export function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Brushed-metal streaks (data texture for roughnessMap / bumpMap). Streaks run along U.
// On a lathe or cylinder cap with polar UVs, U = around, so the brushing reads circular.
export function brushedTex({ seed = 3, size = 512, base = 150, spread = 60, lines = 900 } = {}) {
  const r = seeded(seed);
  return canvasTex(size, size, (ctx, w, h) => {
    ctx.fillStyle = `rgb(${base},${base},${base})`; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < lines; i++) {
      const y = r() * h, v = base + (r() - 0.5) * spread, a = 0.15 + r() * 0.35;
      ctx.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},${a})`; ctx.lineWidth = 0.5 + r() * 1.2;
      const x0 = r() * w, len = w * (0.3 + r() * 0.9);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
      if (x0 + len > w) { ctx.beginPath(); ctx.moveTo(x0 - w, y); ctx.lineTo(x0 + len - w, y); ctx.stroke(); }
    }
  }, { srgb: false, repeat: [1, 1] });
}

// Concentric (radial) brushing for flat discs with planar UVs (CylinderGeometry caps, dial backs, case backs).
export function circularBrushTex({ seed = 5, size = 512, base = 150, spread = 50, rings = 500 } = {}) {
  const r = seeded(seed);
  return canvasTex(size, size, (ctx, w, h) => {
    ctx.fillStyle = `rgb(${base},${base},${base})`; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < rings; i++) {
      const rad = r() * w * 0.5, v = base + (r() - 0.5) * spread;
      ctx.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},${0.2 + r() * 0.4})`; ctx.lineWidth = 0.6 + r();
      const a0 = r() * TAU; ctx.beginPath(); ctx.arc(w / 2, h / 2, rad, a0, a0 + 1 + r() * 5); ctx.stroke();
    }
  }, { srgb: false });
}

// Cotes (parallel wave stripes) decoration for movement plates; data texture for bump/roughness.
export function stripesTex({ size = 512, stripes = 9, angle = 0.5 } = {}) {
  return canvasTex(size, size, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2); ctx.rotate(angle); ctx.translate(-w, -h);
    const sw = (w * 2) / stripes;
    for (let i = 0; i < stripes * 2; i++) {
      const g = ctx.createLinearGradient(i * sw, 0, (i + 1) * sw, 0);
      g.addColorStop(0, '#606060'); g.addColorStop(0.5, '#d0d0d0'); g.addColorStop(1, '#606060');
      ctx.fillStyle = g; ctx.fillRect(i * sw, 0, sw, h * 2);
    }
  }, { srgb: false });
}

// Seamless studio backdrop: screen-space radial gradient (set as scene.background). Floor = shadow catcher.
export function backdropTex({ center = '#ECE9E4', edge = '#D2CDC6', w = 512, h = 288, cy = 0.42, seed = 9 } = {}) {
  const r = seeded(seed);
  return canvasTex(w, h, (ctx) => {
    const g = ctx.createRadialGradient(w * 0.5, h * cy, h * 0.05, w * 0.5, h * cy, w * 0.62);
    g.addColorStop(0, center); g.addColorStop(1, edge);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // faint seeded grain kills banding in the gradient after h264
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 3; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  });
}

// Soft radial blob (contact shadow). Alpha map: white centre -> transparent edge.
export function blobTex({ size = 256, falloff = 1 } = {}) {
  return canvasTex(size, size, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35 * falloff, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
  }, { srgb: false });
}

// Watch-style dial face (planar disc texture): minute track, optional printed numerals/text. Brand-free.
// opts: { bg, print, size, track: true, ring: 0.94, text: ['AUTOMATIC'], numerals: null | ['12','3','6','9'] }
export function dialTex({ bg = '#1E2A33', print = '#E9E6DF', size = 1024, ring = 0.93, text = [], numerals = null, seed = 2 } = {}) {
  const r = seeded(seed);
  return canvasTex(size, size, (ctx, w) => {
    const c = w / 2, R = c * ring;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, w);
    // matte grain
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.025})`; ctx.fillRect(r() * w, r() * w, 1.5, 1.5); }
    // subtle radial vignette (matte, not sunburst)
    const g = ctx.createRadialGradient(c, c, 0, c, c, c); g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = print; ctx.fillStyle = print;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, major = i % 5 === 0, l = major ? w * 0.03 : w * 0.014;
      ctx.lineWidth = major ? w * 0.004 : w * 0.0022;
      ctx.beginPath(); ctx.moveTo(c + Math.sin(a) * R, c - Math.cos(a) * R); ctx.lineTo(c + Math.sin(a) * (R - l), c - Math.cos(a) * (R - l)); ctx.stroke();
    }
    ctx.lineWidth = w * 0.0018; ctx.beginPath(); ctx.arc(c, c, R + w * 0.006, 0, TAU); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (numerals) numerals.forEach((n, i) => {
      const a = (i / numerals.length) * TAU; ctx.font = `600 ${w * 0.06}px Bahnschrift, Arial`;
      ctx.fillText(n, c + Math.sin(a) * R * 0.78, c - Math.cos(a) * R * 0.78);
    });
    text.forEach((s, i) => {
      ctx.font = `${i ? 300 : 600} ${w * (i ? 0.024 : 0.03)}px Bahnschrift, Arial`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${w * 0.006}px`;
      ctx.fillText(s, c, c + w * (0.17 + i * 0.045));
    });
  });
}

// Leather / rubber strap surface: grain + optional stitching along both long edges. U = across, V = along.
export function strapTex({ base = '#3A2C25', stitch = '#CFC6B8', size = 512, stitchOn = true, seed = 4 } = {}) {
  const r = seeded(seed);
  return canvasTex(size, size, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = r(); ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.12})`; ctx.fillRect(r() * w, r() * h, 2, 2); }
    if (stitchOn) {
      ctx.strokeStyle = stitch; ctx.lineWidth = w * 0.012; ctx.lineCap = 'round';
      for (const x of [w * 0.09, w * 0.91]) for (let y = 4; y < h; y += h / 28) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h / 56); ctx.stroke(); }
    }
  }, { repeat: [1, 1] });
}
