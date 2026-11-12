// page.js: frame-page contract for tools/page-render.mjs.
//   boot({ dur, setup, frame }) sets window.DUR, window.render(t) and window.READY = true when ready.
//   setup(): async, builds the scene once. frame(t): draws the frame for time t (pure function of t).
//   Open the page with ?play for a live looping preview, ?t=2.5 to freeze one time.
export async function boot({ dur = 5, fonts = ['600 30px "Segoe UI"', '400 22px "Segoe UI"', '300 44px "Segoe UI"', '600 20px Bahnschrift', '46px Cambria'], setup, frame }) {
  window.DUR = dur;
  document.documentElement.style.cssText = 'margin:0;background:#05070D;overflow:hidden';
  document.body.style.cssText = 'margin:0;position:relative;overflow:hidden';
  try { await Promise.all(fonts.map((f) => document.fonts.load(f))); } catch (e) { /* system fonts: fine either way */ }
  await setup();
  window.render = (t) => { frame(Math.max(0, Math.min(dur, t))); };
  const q = new URLSearchParams(location.search);
  if (q.has('play')) { const t0 = performance.now(); const loop = () => { window.render(((performance.now() - t0) / 1000) % dur); requestAnimationFrame(loop); }; loop(); }
  else window.render(q.has('t') ? +q.get('t') : 0);
  window.READY = true;
}
