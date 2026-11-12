// page.js: frame-page contract for tools/page-render.mjs.
//   boot({ dur, fonts, setup, frame }) sets window.DUR, window.render(t) and window.READY = true when ready.
//   setup(): async, builds the scene once. frame(t): draws the frame for time t (pure function of t).
export async function boot({ dur = 5, fonts = ['600 15px Bahnschrift', '300 12px Bahnschrift', '12px Consolas'], setup, frame }) {
  window.DUR = dur;
  document.documentElement.style.cssText = 'margin:0;background:#E4E0DA;overflow:hidden';
  document.body.style.cssText = 'margin:0;position:relative;overflow:hidden';
  try { await Promise.all(fonts.map((f) => document.fonts.load(f))); } catch (e) { /* system fonts: fine either way */ }
  await setup();
  window.render = (t) => { frame(Math.max(0, Math.min(dur, t))); };
  // live preview when opened in a normal browser tab: add ?play to the URL
  if (location.search.includes('play')) { const t0 = performance.now(); const loop = () => { window.render(((performance.now() - t0) / 1000) % dur); requestAnimationFrame(loop); }; loop(); }
  else window.render(0);
  window.READY = true;
}
