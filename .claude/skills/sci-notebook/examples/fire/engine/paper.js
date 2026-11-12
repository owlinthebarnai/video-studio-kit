// The page: cream graph paper, faint blue grid, red margin rule, paper grain, binding shade.
// Rendered ONCE into an offscreen canvas at setup; boot() draws it under the camera every frame.
import { PAL, PAGE } from './palette.js';
import { rng } from './rand.js';

export function makePaper(W, H, { scale = 1, margin = PAGE.margin, grid = PAGE.grid, major = PAGE.major, seed = 7 } = {}) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * scale); cv.height = Math.ceil(H * scale);
  const c = cv.getContext('2d'); c.scale(scale, scale);
  const g = c.createRadialGradient(W * 0.55, H * 0.45, H * 0.2, W * 0.55, H * 0.45, W * 0.75);
  g.addColorStop(0, PAL.paper); g.addColorStop(1, PAL.paperEdge);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // grain: a small seeded noise tile, repeated
  const tile = document.createElement('canvas'); tile.width = tile.height = 192;
  const tc = tile.getContext('2d'), id = tc.createImageData(192, 192), r = rng(seed);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 10 + r() * 14; }
  tc.putImageData(id, 0, 0);
  c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(0, 0, W, H);
  // fibres
  c.strokeStyle = 'rgba(120,100,70,0.06)'; c.lineWidth = 1;
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI, l = 6 + r() * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  // grid, aligned so a major line sits on the margin
  const x0 = margin % grid, y0 = 18;
  for (let k = 0, x = x0; x < W; x += grid, k++) {
    const maj = Math.round((x - margin) / grid) % major === 0;
    c.globalAlpha = maj ? 0.5 : 0.32; c.strokeStyle = maj ? PAL.gridMajor : PAL.grid; c.lineWidth = maj ? 1.4 : 1;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
  }
  for (let k = 0, y = y0; y < H; y += grid, k++) {
    const maj = k % major === 0;
    c.globalAlpha = maj ? 0.5 : 0.32; c.strokeStyle = maj ? PAL.gridMajor : PAL.grid; c.lineWidth = maj ? 1.4 : 1;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // red margin (double rule)
  c.strokeStyle = PAL.margin; c.globalAlpha = 0.75; c.lineWidth = 2.4; c.beginPath(); c.moveTo(margin, 0); c.lineTo(margin, H); c.stroke();
  c.globalAlpha = 0.45; c.lineWidth = 1.1; c.beginPath(); c.moveTo(margin + 6, 0); c.lineTo(margin + 6, H); c.stroke();
  c.globalAlpha = 1;
  // binding shade on the left edge + soft vignette
  const b = c.createLinearGradient(0, 0, 70, 0); b.addColorStop(0, 'rgba(70,50,20,0.16)'); b.addColorStop(1, 'rgba(70,50,20,0)');
  c.fillStyle = b; c.fillRect(0, 0, 70, H);
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.7); v.addColorStop(0, 'rgba(60,40,10,0)'); v.addColorStop(1, 'rgba(60,40,10,0.10)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  cv.scaleFactor = scale;
  return cv;
}

// "Occlusion" for a sketch: paint the paper itself over a region, so a front object hides lines behind it
// without a flat colour patch (the grid continues). clip: (ctx) => adds a path.
export function knockout(ctx, paper, clip) {
  if (!paper) return;
  ctx.save(); ctx.beginPath(); clip(ctx); ctx.clip();
  ctx.drawImage(paper, 0, 0, paper.width / paper.scaleFactor, paper.height / paper.scaleFactor);
  ctx.restore();
}
