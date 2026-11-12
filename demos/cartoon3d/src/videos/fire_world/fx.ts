// 2D effect drawings for the fire shot (flame tongues with plum ink, smoke curl, glow) and the painted night textures
// (sky matte with moon + stars + far hills, night grass, dirt clearing). All Canvas2D, deterministic per frame.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const TAU = Math.PI * 2;
const rng = (seed: number) => { let s = seed % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

/** one flame tongue: rounded base at (cx, by), width w, height h, tip swaying by `sway` (fraction of h) */
const tongue = (cx: number, by: number, w: number, h: number, sway: number, wig: number): P2[] => {
  const n = 26, left: P2[] = [], right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;                                                       // 0 base .. 1 tip
    const hw = s < 0.22 ? w * Math.sqrt(1 - ((0.22 - s) / 0.22) ** 2) * 0.98 + w * 0.02 : w * ((1 - s) / 0.78) ** 1.25;
    const x = cx + sway * h * s * s + wig * Math.sin(s * 7.5) * s * w * 0.25, y = by - s * h + (s < 0.22 ? 0.12 * w * (1 - s / 0.22) ** 2 : 0);
    left.push([x - hw, y]); right.push([x + hw, y]);
  }
  return [...left, ...right.reverse()];
};

type T = { x: number; w: number; h: number; sp: number; ph: number };
const OUT: T[] = [
  { x: 0, w: 120, h: 640, sp: 0.55, ph: 0 }, { x: -95, w: 85, h: 420, sp: 0.71, ph: 1.7 }, { x: 100, w: 90, h: 470, sp: 0.63, ph: 3.1 },
  { x: -165, w: 60, h: 250, sp: 0.83, ph: 4.4 }, { x: 170, w: 58, h: 270, sp: 0.77, ph: 2.2 }, { x: 40, w: 70, h: 540, sp: 0.9, ph: 5.3 },
];

/** fire on a 600 x 900 canvas, base at y = 860. g = size 0..1.3, t = frame. Layers: ink silhouette -> red -> orange
 *  -> yellow -> pale core (each a union of tongues), like a cartoon effect card. */
export const fxFire = (p: Pen, g: number, t: number) => {
  if (g <= 0.01) return;
  const by = 860, cx = 300;
  const layer = (k: number, wk: number, fill: string | null, inkW = 0) => {
    const shapes = OUT.map((o, i) => {
      const fl = 1 + 0.16 * Math.sin(t * o.sp + o.ph) + 0.08 * Math.sin(t * 1.9 * o.sp + i);
      const h = o.h * g * k * fl, w = o.w * Math.min(1, 0.45 + 0.55 * g) * wk;
      return tongue(cx + o.x * wk * Math.min(1, 0.6 + 0.4 * g), by, w, h, 0.18 * Math.sin(t * 0.37 + o.ph) + 0.04 * (o.x / 100), Math.sin(t * 0.8 + o.ph));
    });
    if (inkW) for (const s of shapes) { p.path(s, true); p.g.lineWidth = inkW; p.g.strokeStyle = INK; p.g.lineJoin = "round"; p.g.stroke(); }
    if (fill) for (const s of shapes) { p.path(s, true); p.g.fillStyle = fill; p.g.fill(); }
  };
  layer(1, 1, "#e8452e", 22);
  layer(0.78, 0.74, "#ff8a2a");
  layer(0.55, 0.5, "#ffc93d");
  layer(0.3, 0.3, "#fff1b8");
  // a few loose flicks breaking off the top
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.045 + i / 3) % 1), x = cx + 60 * Math.sin(i * 2.4 + t * 0.1), y = by - 600 * g - 160 * k * g, r = 26 * (1 - k) * g;
    if (r > 3) { p.ell(x, y, r * 0.7, r, "#ff8a2a", 6); }
  }
};

/** thin rising smoke curl on a 300 x 900 canvas (source at the bottom centre), amount a 0..1, frame t */
export const fxSmoke = (p: Pen, a: number, t: number) => {
  if (a <= 0.01) return;
  const g = p.g, top = 880 - 820 * Math.min(1, a * 1.15);
  for (let j = 0; j < 2; j++) {
    const pts: P2[] = [];
    for (let y = 880; y >= top; y -= 10) {
      const s = (880 - y) / 820;
      pts.push([150 + (22 + 46 * s) * Math.sin(s * 6.5 - t * 0.16 + j * 2.2) * (0.3 + s), y]);
    }
    g.lineCap = "round"; g.lineJoin = "round";
    for (let i = 1; i < pts.length; i++) {
      const s = i / pts.length;
      g.strokeStyle = `rgba(214,212,228,${(0.8 * a * (1 - s) ** 0.8 * (j ? 0.55 : 1)).toFixed(3)})`;
      g.lineWidth = (j ? 9 : 14) + 34 * s;
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
  }
};

/** soft additive glow disc (512 x 512) */
export const glowTex = (g: CanvasRenderingContext2D) => {
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, "rgba(255,190,110,1)"); gr.addColorStop(0.18, "rgba(255,150,70,0.55)");
  gr.addColorStop(0.5, "rgba(230,100,50,0.16)"); gr.addColorStop(1, "rgba(200,80,40,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};

/** ember dot (64 x 64) */
export const emberTex = (g: CanvasRenderingContext2D) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,245,200,1)"); gr.addColorStop(0.35, "rgba(255,170,60,0.9)"); gr.addColorStop(1, "rgba(255,90,30,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
};

/** painted night sky matte, 2048 x 1024: gradient, stars, moon with plum ink, two bands of far hills */
export const skyTex = (g: CanvasRenderingContext2D) => {
  const W = 2048, H = 1024, r = rng(77);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#0b1030"); gr.addColorStop(0.45, "#18245a"); gr.addColorStop(0.75, "#2d3b78"); gr.addColorStop(1, "#3b4884");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H * 0.7, s = r() < 0.08 ? 2.6 : 1.2 + r();
    g.fillStyle = `rgba(255,248,225,${(0.45 + 0.5 * r()).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    if (s > 2.5) { g.fillRect(x - 7, y - 0.8, 14, 1.6); g.fillRect(x - 0.8, y - 7, 1.6, 14); }
  }
  // moon
  const mx = 470, my = 210, mr = 62;
  const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 4);
  halo.addColorStop(0, "rgba(190,205,255,0.35)"); halo.addColorStop(1, "rgba(190,205,255,0)");
  g.fillStyle = halo; g.beginPath(); g.arc(mx, my, mr * 4, 0, TAU); g.fill();
  g.fillStyle = "#f4efd6"; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
  g.fillStyle = "#ddd6b8"; for (const [dx, dy, rr] of [[-18, -12, 13], [20, 14, 9], [6, -26, 7], [-8, 24, 8]]) { g.beginPath(); g.arc(mx + dx, my + dy, rr, 0, TAU); g.fill(); }
  g.lineWidth = 5; g.strokeStyle = INK; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.stroke();
  // far hills (two layers, ink top edge)
  for (const [base, amp, col, seed] of [[760, 120, "#212d63", 3], [860, 80, "#172150", 9]] as const) {
    const rr = rng(seed);
    const ph = [rr() * TAU, rr() * TAU, rr() * TAU];
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, base - amp * (0.5 + 0.3 * Math.sin(x / 260 + ph[0]) + 0.2 * Math.sin(x / 97 + ph[1]) + 0.1 * Math.sin(x / 41 + ph[2])));
    g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
    g.lineWidth = 4; g.strokeStyle = "rgba(10,8,20,0.9)"; g.stroke();
  }
};

/** night meadow, 1024 tile: muted green with blotches and tufts (lit blue by the moon, warm by the fire) */
export const groundTex = (g: CanvasRenderingContext2D) => {
  const S = 1024, r = rng(5);
  g.fillStyle = "#5d7b45"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = r() * S, y = r() * S, rr = 90 + 220 * r(), light = r() > 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, light ? "rgba(120,150,80,0.45)" : "rgba(60,92,50,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
  }
  g.lineCap = "round"; g.lineWidth = 2.4;
  for (let i = 0; i < 1500; i++) {
    const x = r() * S, y = r() * S, h = 8 + 10 * r(), l = (r() - 0.5) * 6;
    g.strokeStyle = r() < 0.4 ? "rgba(140,170,95,0.4)" : "rgba(52,84,44,0.5)";
    g.beginPath(); g.moveTo(x - 3 + l, y - h); g.lineTo(x, y); g.lineTo(x + 3 + l, y - h * 0.8); g.stroke();
  }
};

/** dirt clearing decal (1024): packed earth with pebbles, soft alpha edge */
export const dirtTex = (g: CanvasRenderingContext2D) => {
  const S = 1024, r = rng(19), c = S / 2;
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, "rgba(150,112,78,1)"); gr.addColorStop(0.62, "rgba(140,104,72,1)"); gr.addColorStop(0.85, "rgba(120,96,66,0.6)"); gr.addColorStop(1, "rgba(110,90,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 200; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * c * 0.8, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, rr = 3 + 7 * r();
    g.fillStyle = r() < 0.5 ? "rgba(96,72,52,0.55)" : "rgba(186,152,112,0.5)";
    g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, r() * 3, 0, TAU); g.fill();
  }
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * c * 0.75, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    g.strokeStyle = "rgba(70,50,40,0.5)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30 * (r() - 0.5), y + 30 * (r() - 0.5), x + 60 * (r() - 0.5), y + 60 * (r() - 0.5)); g.stroke();
  }
};
