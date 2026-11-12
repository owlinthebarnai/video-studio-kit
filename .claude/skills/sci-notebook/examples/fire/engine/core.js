// Frame-page boot: sets window.DUR, window.render(t), window.READY for page-render.mjs.
import { PAL, FONTS } from './palette.js';
import { E, clamp, lerp } from './ease.js';
import { makePaper } from './paper.js';

// camera keys: [{ t, cx, cy, s }] (world point at screen centre, zoom >= 1). Eased inOutSine between keys,
// clamped so the view never leaves the page. Think "phone held over the notebook", not a film camera.
export function camAt(t, keys, W, H) {
  let v = { cx: W / 2, cy: H / 2, s: 1 };
  if (keys && keys.length) {
    if (t <= keys[0].t) v = { ...keys[0] };
    else if (t >= keys[keys.length - 1].t) v = { ...keys[keys.length - 1] };
    else for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= a.t && t < b.t) { const u = E.inOutSine((t - a.t) / (b.t - a.t)); v = { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), s: lerp(a.s, b.s, u) }; break; }
    }
  }
  v.s = Math.max(1, v.s);
  const hw = W / 2 / v.s, hh = H / 2 / v.s;
  v.cx = clamp(v.cx, hw, W - hw); v.cy = clamp(v.cy, hh, H - hh);
  return v;
}

// boot({ dur, draw(ctx, t, stage), camera?: keys, setup?, w?, h?, fonts?, paper?: makePaper opts })
// draw() works in a w x h logical page (default 1920x1080) with the paper already drawn under it.
// stage = { W, H, paper } (paper = the offscreen page, for knockout()).
export function boot({ dur, draw, camera = null, setup = null, w = 1920, h = 1080, fonts = FONTS, paper = {} }) {
  document.documentElement.style.cssText = 'margin:0;overflow:hidden;background:' + PAL.paper;
  document.body.style.cssText = 'margin:0;overflow:hidden';
  const cv = document.createElement('canvas'); cv.style.display = 'block'; document.body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: false });
  const stage = { W: w, H: h, paper: null };
  let fit = { s: 1, ox: 0, oy: 0 };
  const resize = () => {
    const W = window.innerWidth, H = window.innerHeight;
    if (cv.width === W && cv.height === H) return;
    cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const s = Math.min(W / w, H / h); fit = { s, ox: (W - w * s) / 2, oy: (H - h * s) / 2 };
  };
  const maxZoom = camera ? Math.max(1, ...camera.map((k) => k.s)) : 1;
  window.DUR = dur;
  window.render = (t) => {
    resize(); t = Math.max(0, Math.min(dur, t));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, cv.width, cv.height);
    const v = camAt(t, camera, w, h);
    ctx.setTransform(fit.s, 0, 0, fit.s, fit.ox, fit.oy);
    ctx.translate(w / 2, h / 2); ctx.scale(v.s, v.s); ctx.translate(-v.cx, -v.cy);
    if (stage.paper) ctx.drawImage(stage.paper, 0, 0, w, h);
    draw(ctx, t, stage);
  };
  (async () => {
    try { await Promise.all(fonts.map((f) => document.fonts.load(f))); } catch {}
    await document.fonts.ready;
    resize();
    stage.paper = makePaper(w, h, { scale: fit.s * maxZoom, ...paper });
    if (setup) await setup(ctx, stage);
    window.render(0); window.READY = true;
  })();
  return { ctx, stage };
}
