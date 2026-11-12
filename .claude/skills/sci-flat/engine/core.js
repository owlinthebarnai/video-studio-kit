// Frame-page boot: sets window.DUR, window.render(t), window.READY for page-render.mjs.
import { PAL, FONTS, TYPE } from './palette.js';
import { E, clamp, lerp } from './ease.js';
import { text, badge, measure } from './labels.js';
import { line } from './shapes.js';

// boot({ dur, w, h, setup, draw }): draw(ctx, t, stage) works in a w x h logical space (default 1920x1080),
// fitted (contain) to whatever viewport page-render uses. Use w:1080,h:1920 for vertical.
export function boot({ dur, w = 1920, h = 1080, setup = null, draw, fonts = FONTS }) {
  document.documentElement.style.cssText = 'margin:0;overflow:hidden;background:' + PAL.paper;
  document.body.style.cssText = 'margin:0;overflow:hidden';
  const cv = document.createElement('canvas'); cv.style.display = 'block'; document.body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: false });
  const stage = { W: w, H: h };
  let fit = { s: 1, ox: 0, oy: 0 };
  const resize = () => {
    const W = window.innerWidth, H = window.innerHeight;
    if (cv.width === W && cv.height === H) return;
    cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const s = Math.min(W / w, H / h); fit = { s, ox: (W - w * s) / 2, oy: (H - h * s) / 2 };
  };
  window.DUR = dur;
  window.render = (t) => {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(fit.s, 0, 0, fit.s, fit.ox, fit.oy); ctx.globalAlpha = 1;
    draw(ctx, Math.max(0, Math.min(dur, t)), stage);
  };
  (async () => {
    try { await Promise.all(fonts.map((f) => document.fonts.load(f))); } catch {}
    await document.fonts.ready;
    if (setup) await setup(ctx, stage);
    window.render(0); window.READY = true;
  })();
  return { ctx, stage };
}

// Camera: a slow push-in only (max ~4 % over a shot). Wrap the world, not the header.
export function camera(ctx, t, dur, { cx = 960, cy = 540, from = 1, to = 1.03 } = {}, fn) {
  const s = lerp(from, to, E.inOutSine(clamp(t / dur)));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore();
}

// Chapter header (HUD): numbered badge + title per beat, crossfading at beat boundaries;
// kicker + progress segments top-right. beats = beats({...}) from timeline.js, titles in the same order.
export function header(ctx, t, bt, titles, { kicker = '', W = 1920, x = 112, y = 104, inT = 0.35, outT = 0.2 } = {}) {
  bt.list.forEach((b, i) => {
    const pin = clamp((t - b.a - (i ? 0.02 : 0.1)) / inT), last = i === bt.list.length - 1;
    const pout = last ? 0 : clamp((t - (b.b - outT)) / outT);
    const a = E.outCubic(pin) * (1 - E.inCubic(pout));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - E.outCubic(pin)) * 14 - E.inCubic(pout) * 14);
    // chapter marker = rounded square (callouts use round badges, so the two never get confused)
    ctx.beginPath(); ctx.roundRect(x, y - 26, 52, 52, 12); ctx.fillStyle = PAL.ink; ctx.fill();
    text(ctx, String(i + 1).padStart(2, '0'), x + 26, y + 2, { size: 26, weight: 700, color: PAL.white, align: 'center' });
    text(ctx, titles[i], x + 72, y + 2, { size: TYPE.title, weight: 600, family: TYPE.sans });
    ctx.restore();
  });
  const fin = E.outCubic(clamp(t / 0.4));
  ctx.save(); ctx.globalAlpha *= fin;
  const R = W - x;
  if (kicker) text(ctx, kicker, R, y - 12, { size: TYPE.min, weight: 600, color: PAL.inkSoft, align: 'right', track: 3 });
  const n = bt.list.length, sw = 64, gap = 12, x0 = R - n * sw - (n - 1) * gap;
  bt.list.forEach((b, i) => {
    const xs = x0 + i * (sw + gap), yy = y + 22;
    line(ctx, [[xs, yy], [xs + sw, yy]], 1, { stroke: PAL.rule, lw: 5 });
    const pp = clamp((t - b.a) / (b.b - b.a));
    if (pp > 0) line(ctx, [[xs, yy], [xs + sw * pp, yy]], 1, { stroke: PAL.ink, lw: 5 });
  });
  ctx.restore();
}
