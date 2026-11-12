// 5-second preview of a lemo-opuscar style demo: node tools/lemo-preview.mjs <style> <out.mp4> [--at 0.3] [--secs 5]
// Uses the library's own page loader (window.READY / window.DUR / window.render(t)), renders only a window of the film.
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const LEMO = process.env.LEMO_OPUSCAR_HOME;
const { openDemo, closeServer } = await import(pathToFileURL(path.join(LEMO, 'core/render/page.mjs')).href);
const [style, out] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const AT = opt('--at', 0.3), SECS = opt('--secs', 5), FPS = 24, W = 1920, H = 1080; // the pages are laid out for 1920x1080; the clip is scaled down to 960x540
process.chdir(LEMO);
const dir = style.includes('/') ? style : path.join('styles', style, 'demo'); // a style id, or a film folder like films/fire-ukiyoe
const { browser, page } = await openDemo(dir, { w: W, h: H });
const DUR = await page.evaluate(() => window.DUR);
const t0 = Math.max(0, Math.min(DUR - SECS, DUR * AT));
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=960:540:flags=lanczos', '-c:v', 'libx264', '-crf', '23', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(out)], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(Math.min(SECS, DUR) * FPS);
for (let f = 0; f < n; f++) {
  await page.evaluate((t) => window.render(t), t0 + f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close(); closeServer();
console.log(`${style}: ${n} frames from ${t0.toFixed(1)} s of ${DUR.toFixed(1)} s`);
process.exit(0);
