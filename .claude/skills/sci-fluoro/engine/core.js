// Frame-page boot + the microscope post chain. Sets window.DUR, window.render(t), window.READY.
//
// boot({ dur, draw, hud, post }):
//   draw(L, t, stage)  L.main = sharp focal plane (full res), L.bg = out-of-focus layer (quarter res, parallax 0.45).
//                      Both are cleared to black and already in 'lighter' (additive) mode. Logical space w x h.
//   hud(ctx, t, stage) crisp overlay drawn AFTER post (labels, scale bar, channel list). source-over.
//   post: { focus(t) -> blur px, cam(t) -> {x,y,s}, bloom, fringe, grain, vignette }
import { FONTS } from './palette.js';
import { rng, clamp } from './ease.js';
import { canvas, grainTiles, vignetteCanvas } from './textures.js';

export function boot({ dur, w = 1920, h = 1080, draw, hud = null, setup = null, fonts = FONTS, post = {} }) {
  const P = {
    bloom: 0.85, bloomR: [18, 64], fringe: 0.22, fringePx: 4, grain: 1, vignette: 0.62,
    focus: () => 0, cam: () => ({ x: 0, y: 0, s: 1 }), ...post,
  };
  document.documentElement.style.cssText = 'margin:0;overflow:hidden;background:#000';
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#000';
  const out = canvas(1, 1); out.style.display = 'block'; document.body.appendChild(out);
  const o = out.getContext('2d', { alpha: false });
  const ctx2 = (c) => c.getContext('2d', { alpha: false });
  const M = canvas(1, 1), m = ctx2(M);          // focal plane
  const B = canvas(1, 1), b = ctx2(B);          // bg (quarter)
  const Hf = canvas(1, 1), hf = ctx2(Hf);       // defocus (half)
  const S1 = canvas(1, 1), s1 = ctx2(S1);       // bloom source (quarter)
  const S2 = canvas(1, 1), s2 = ctx2(S2);       // bloom tight
  const S3 = canvas(1, 1), s3 = ctx2(S3);       // bloom wide
  const Tn = canvas(1, 1), tn = ctx2(Tn);       // fringe tint
  const tiles = grainTiles(6, 256, 7);
  const stage = { W: w, H: h };
  let fit = { s: 1, ox: 0, oy: 0 }, VG = null, VW = 0, VH = 0;

  const resize = () => {
    const W = window.innerWidth, H = window.innerHeight;
    if (W === VW && H === VH) return;
    VW = W; VH = H;
    out.width = M.width = W; out.height = M.height = H; out.style.width = W + 'px'; out.style.height = H + 'px';
    for (const c of [B, S1, S2, S3, Tn]) { c.width = Math.ceil(W / 4); c.height = Math.ceil(H / 4); }
    Hf.width = Math.ceil(W / 2); Hf.height = Math.ceil(H / 2);
    const s = Math.min(W / w, H / h); fit = { s, ox: (W - w * s) / 2, oy: (H - h * s) / 2 };
    VG = vignetteCanvas(W, H, P.vignette);
  };
  const clear = (c) => {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
    c.fillStyle = '#000'; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  };
  const prep = (c, k, par, cam) => {
    clear(c);
    const { s, ox, oy } = fit, cx = w / 2, cy = h / 2, sc = 1 + (cam.s - 1) * par;
    c.setTransform(s * k, 0, 0, s * k, ox * k, oy * k);
    c.translate(cx + cam.x * par, cy + cam.y * par); c.scale(sc, sc); c.translate(-cx, -cy);
    c.globalCompositeOperation = 'lighter';
  };

  window.DUR = dur;
  window.render = (t) => {
    t = clamp(t, 0, dur);
    resize();
    const W = VW, H = VH, cam = P.cam(t), s = fit.s;
    prep(m, 1, 1, cam); prep(b, 0.25, 0.45, cam);
    draw({ main: m, bg: b }, t, stage);

    // --- compose
    clear(o); o.globalCompositeOperation = 'lighter';
    o.drawImage(B, 0, 0, W, H);
    const f = Math.max(0, P.focus(t)) * s, k = clamp((f - 0.6) / 1.6);
    let focal = M;
    if (k > 0) {
      clear(hf); hf.filter = `blur(${(f / 2).toFixed(2)}px)`; hf.drawImage(M, 0, 0, Hf.width, Hf.height); hf.filter = 'none';
      if (k < 1) { o.globalAlpha = 1 - k; o.drawImage(M, 0, 0); }
      o.globalAlpha = k; o.drawImage(Hf, 0, 0, W, H); o.globalAlpha = 1;
      focal = Hf;
    } else o.drawImage(M, 0, 0);

    // --- bloom (quarter res)
    if (P.bloom > 0) {
      clear(s1); s1.globalCompositeOperation = 'lighter';
      s1.drawImage(focal, 0, 0, S1.width, S1.height); s1.drawImage(B, 0, 0);
      clear(s2); s2.filter = `blur(${((P.bloomR[0] * s) / 4).toFixed(2)}px)`; s2.drawImage(S1, 0, 0); s2.filter = 'none';
      clear(s3); s3.filter = `blur(${((P.bloomR[1] * s) / 4).toFixed(2)}px)`; s3.drawImage(S1, 0, 0); s3.filter = 'none';
      o.globalAlpha = P.bloom * 0.6; o.drawImage(S2, 0, 0, W, H);
      o.globalAlpha = P.bloom * 0.5; o.drawImage(S3, 0, 0, W, H);
      // chromatic fringe: red-shifted copy right, blue-shifted copy left
      if (P.fringe > 0) {
        const d = P.fringePx * s;
        for (const [col, dx] of [['#FF2A6A', d], ['#2AD8FF', -d]]) {
          clear(tn); tn.drawImage(S2, 0, 0); tn.globalCompositeOperation = 'multiply'; tn.fillStyle = col; tn.fillRect(0, 0, Tn.width, Tn.height);
          o.globalAlpha = P.fringe; o.drawImage(Tn, dx, dx * 0.3, W, H);
        }
      }
      o.globalAlpha = 1;
    }

    // --- sensor: vignette, chroma specks, luminance grain (changes at 24 fps, seeded by frame)
    o.globalCompositeOperation = 'source-over'; o.drawImage(VG, 0, 0);
    if (P.grain > 0) {
      const fr = Math.floor(t * 24 + 1e-4), r = rng(fr * 977 + 3), tile = tiles[fr % tiles.length];
      const dx = (r() * 256) | 0, dy = (r() * 256) | 0;
      o.setTransform(1, 0, 0, 1, dx, dy);
      o.globalCompositeOperation = 'lighter'; o.globalAlpha = clamp(P.grain);
      o.fillStyle = o.createPattern(tile.add, 'repeat'); o.fillRect(-dx, -dy, W, H);
      o.globalCompositeOperation = 'multiply'; o.globalAlpha = clamp(P.grain * 0.8);
      o.fillStyle = o.createPattern(tile.mul, 'repeat'); o.fillRect(-dx, -dy, W, H);
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1;
    }

    // --- HUD (crisp, never bloomed or defocused)
    o.globalCompositeOperation = 'source-over'; o.filter = 'none';
    o.setTransform(s, 0, 0, s, fit.ox, fit.oy);
    if (hud) hud(o, t, stage);
  };

  (async () => {
    try { await Promise.all(fonts.map((f) => document.fonts.load(f))); } catch {}
    await document.fonts.ready;
    if (setup) await setup(stage);
    window.render(0); window.READY = true;
  })();
  return { stage };
}
