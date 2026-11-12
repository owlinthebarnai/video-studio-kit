#!/usr/bin/env node
// Render any "frame page" to video or stills. A frame page is a folder with index.html that sets
//   window.DUR (seconds), window.render(t) (draws the frame for time t, deterministically), window.READY = true.
//   node tools/page-render.mjs <dir> --out clip.mp4 [--size 1080x1920] [--fps 30] [--from 0] [--to DUR]
//   node tools/page-render.mjs <dir> --stills 0.5,2.5,4.5 --outdir stills/ [--size ...]
// The folder is served at / (so the page can use relative paths). Shared vendor files are served at /_vendor/
// (three.module.js and its addons, from the build's own node_modules).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const VS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEMO = path.resolve(VS, '..', 'repos', 'lemomo-ai_lemo-opuscar');
const req = createRequire(path.join(LEMO, 'package.json'));
const { chromium } = req('playwright-core');
const VENDOR = { 'three.module.js': path.join(LEMO, 'node_modules/three/build/three.module.js'), addons: path.join(LEMO, 'node_modules/three/examples/jsm') };

const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const dir = path.resolve(a[0] || '.');
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`no index.html in ${dir}`); process.exit(2); }
const [W, H] = opt('--size', '1920x1080').split('x').map(Number), FPS = +opt('--fps', 30);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream' };

const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f;
  if (p === '/_vendor/three.module.js') f = VENDOR['three.module.js'];
  else if (p.startsWith('/_vendor/addons/')) f = path.join(VENDOR.addons, p.slice('/_vendor/addons/'.length));
  else f = path.join(dir, p === '/' ? 'index.html' : p);
  if (!f.startsWith(dir) && !f.startsWith(path.dirname(VENDOR['three.module.js'])) && !f.startsWith(VENDOR.addons)) { r.writeHead(403); return r.end(); }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('not found'); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let failed = null;
page.on('pageerror', (e) => { failed = e.message; console.error('[pageerror]', e.message); });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text().slice(0, 300)); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) console.error('[404]', r.url()); });
await page.goto(url);
try { await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 }); }
catch { console.error('window.READY never became true (120 s)' + (failed ? ': ' + failed : '')); await browser.close(); server.close(); process.exit(1); }
const DUR = await page.evaluate(() => window.DUR);

const done = async (code) => { await browser.close(); server.close(); process.exit(code); };
if (a.includes('--stills')) {
  const outdir = path.resolve(opt('--outdir', path.join(dir, 'stills'))); fs.mkdirSync(outdir, { recursive: true });
  for (const t of opt('--stills').split(',').map(Number)) {
    await page.evaluate((x) => window.render(x), t);
    await page.screenshot({ path: path.join(outdir, `t_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 92 });
  }
  console.log(`stills in ${outdir}`); await done(failed ? 1 : 0);
}
const out = path.resolve(opt('--out', path.join(dir, 'out.mp4')));
const t0 = +opt('--from', 0), t1 = Math.min(+opt('--to', DUR), DUR), n = Math.round((t1 - t0) * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const started = Date.now();
for (let f = 0; f < n && !failed; f++) {
  await page.evaluate((x) => window.render(x), t0 + f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`frame ${f}/${n} ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
console.log(failed ? 'FAILED: ' + failed : `done ${out} (${n} frames, ${W}x${H})`);
await done(failed ? 1 : 0);
