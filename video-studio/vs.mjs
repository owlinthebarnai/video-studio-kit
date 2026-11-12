#!/usr/bin/env node
// Video Studio: a tiny local server for the UI, plus the commands Claude uses to talk to it.
//   node vs.mjs serve [--port 4790]                 start the UI (http://localhost:4790)
//   node vs.mjs new <slug> <project.json>           create/replace a project from a file
//   node vs.mjs wait <slug> [--timeout 3600]        block until the user presses Build or sends a note; prints JSON
//   node vs.mjs progress <slug> "text" [--scene N] [--clip path] [--status building|done|error]
//   node vs.mjs done <slug> <final.mp4>             mark the project finished and show the video in the UI
//   node vs.mjs reply <slug> "text"                 a message from Claude, shown in the UI chat
//   node vs.mjs show <slug>                          print the project JSON
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeScript, buildProject, stopBuild } from './agent.mjs';
const MANUAL = process.env.VS_MANUAL === '1'; // 1 = an interactive Claude session builds (vs.mjs wait)

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS = path.join(ROOT, 'projects');
fs.mkdirSync(PROJECTS, { recursive: true });
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const now = () => new Date().toISOString();
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(s || '');
const pfile = (slug) => path.join(PROJECTS, slug, 'project.json');
const load = (slug) => JSON.parse(fs.readFileSync(pfile(slug), 'utf8'));
const save = (p) => { fs.mkdirSync(path.join(PROJECTS, p.slug), { recursive: true }); const f = pfile(p.slug), t = f + '.tmp'; p.updatedAt = now(); fs.writeFileSync(t, JSON.stringify(p, null, 2)); fs.renameSync(t, f); return p; };
// finished videos are also copied to <build>/outputs/<title>.mp4 so they are easy to find
const OUTPUTS = path.resolve(ROOT, '..', 'outputs');
function publishFinal(p) {
  const src = path.join(PROJECTS, p.slug, p.final || 'final.mp4'); if (!fs.existsSync(src)) return null;
  fs.mkdirSync(OUTPUTS, { recursive: true });
  const name = `${String(p.title || p.slug).replace(/[\/:*?"<>|]+/g, '').trim() || p.slug}.mp4`, dst = path.join(OUTPUTS, name);
  if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) fs.copyFileSync(src, dst);
  return dst;
}
const blank = (slug) => ({ slug, title: slug, idea: '', format: '9:16', voice: { engine: 'kokoro', voice: 'none', on: false }, music: 'auto', status: 'draft', scenes: [], notes: [], log: [], final: null, createdAt: now() });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function sendFile(req, res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
  const size = fs.statSync(file).size, type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const m = (req.headers.range || '').match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } }); });
const inside = (base, p) => { const f = path.resolve(base, p); return f.startsWith(path.resolve(base) + path.sep) ? f : null; };

async function handle(req, res) {
  const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  if (p === '/' ) return sendFile(req, res, path.join(ROOT, 'ui', 'index.html'));
  if (p.startsWith('/ui/')) { const f = inside(path.join(ROOT, 'ui'), p.slice(4)); return f ? sendFile(req, res, f) : json(res, 403, {}); }
  if (p.startsWith('/examples/')) { const f = inside(path.join(ROOT, 'examples'), p.slice(10)); return f ? sendFile(req, res, f) : json(res, 403, {}); }
  if (p.startsWith('/files/')) { const f = inside(PROJECTS, p.slice(7)); return f ? sendFile(req, res, f) : json(res, 403, {}); }
  if (p === '/api/catalog') { // only styles whose example clip exists (previews appear as they finish rendering)
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
    // lemo lists all 66 styles (a missing clip shows "preview rendering"); other tools only show styles with a clip
    for (const t of c.tools) t.styles = t.styles.map((s) => ({ ...s, example: s.example && fs.existsSync(path.join(ROOT, s.example)) ? s.example : null })).filter((s) => s.example || t.id === 'lemo');
    c.tools = c.tools.filter((t) => t.styles.length);
    return json(res, 200, c);
  }
  if (p === '/api/projects') {
    const list = fs.readdirSync(PROJECTS).filter((d) => fs.existsSync(pfile(d))).map((d) => { const x = load(d); return { slug: x.slug, title: x.title, status: x.status, updatedAt: x.updatedAt }; });
    return json(res, 200, list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
  }
  if (p === '/api/script' && req.method === 'POST') {
    const b = await body(req); const prompt = String(b.prompt || '').trim();
    if (!prompt) return json(res, 400, { error: 'write a prompt' });
    try { return json(res, 200, { slug: await writeScript(prompt, b.format || '9:16', b.style) }); } catch (e) { return json(res, 400, { error: e.message }); }
  }
  const pm = p.match(/^\/api\/project\/([a-z0-9-]+)(\/[a-z]+)?$/);
  if (pm) {
    const slug = pm[1], action = pm[2];
    if (!fs.existsSync(pfile(slug))) { if (req.method === 'PUT') save(blank(slug)); else return json(res, 404, { error: 'no such project' }); }
    const cur = load(slug);
    if (!action && req.method === 'GET') { if (cur.final && !cur.savedPath) { cur.savedPath = publishFinal(cur); save(cur); } return json(res, 200, cur); }
    if (action === '/reveal' && req.method === 'POST') {
      const f = publishFinal(cur); if (!f) return json(res, 404, { error: 'no final video yet' });
      cur.savedPath = f; save(cur);
      const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [`/select,${f}`]] : process.platform === 'darwin' ? ['open', ['-R', f]] : ['xdg-open', [path.dirname(f)]];
      spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
      return json(res, 200, { path: f });
    }
    if (!action && req.method === 'PUT') {
      const b = await body(req);
      for (const k of ['title', 'idea', 'format', 'voice', 'music', 'scenes', 'style', 'styleName']) if (b[k] !== undefined) cur[k] = b[k];
      if (cur.status === 'done' && b.scenes !== undefined) cur.status = 'script-ready'; // edited after finishing: ready to generate again
      if (cur.status === 'draft' && cur.scenes.length) cur.status = 'script-ready';
      return json(res, 200, save(cur));
    }
    if (action === '/build' && req.method === 'POST') {
      const b = await body(req);
      if (b.text) cur.notes.push({ from: 'user', text: b.text, at: now(), read: false });
      if (MANUAL) { cur.status = 'build-requested'; cur.log.push({ at: now(), text: 'Build requested from the UI' }); return json(res, 200, save(cur)); }
      save(cur); buildProject(slug); return json(res, 200, load(slug));
    }
    if (action === '/stop' && req.method === 'POST') { stopBuild(slug); return json(res, 200, load(slug));
    }
    if (action === '/note' && req.method === 'POST') {
      const b = await body(req);
      if (b.text) cur.notes.push({ from: 'user', text: String(b.text).slice(0, 4000), at: now(), read: false });
      return json(res, 200, save(cur));
    }
  }
  json(res, 404, { error: 'not found' });
}

const cmd = process.argv[2];
if (cmd === 'serve') {
  const port = +arg('--port', 4790);
  http.createServer((req, res) => handle(req, res).catch((e) => json(res, 500, { error: String(e) }))).listen(port, '127.0.0.1', () => console.log(`Video Studio: http://localhost:${port}`));
} else if (cmd === 'new') {
  const slug = process.argv[3]; if (!slugOk(slug)) { console.error('slug: lowercase letters, digits, hyphens'); process.exit(2); }
  const data = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const p = { ...blank(slug), ...data, slug, status: 'ready', log: [{ at: now(), text: 'Script and scenes written by Claude' }] };
  save(p); console.log(`project ${slug}: ${p.scenes.length} scenes → http://localhost:4790/?p=${slug}`);
} else if (cmd === 'wait') {
  const slug = process.argv[3], timeout = +arg('--timeout', 3600) * 1000, t0 = Date.now();
  const tick = () => {
    const p = load(slug), unread = p.notes.filter((n) => n.from === 'user' && !n.read);
    if (p.status === 'build-requested' || unread.length) {
      unread.forEach((n) => (n.read = true));
      const event = p.status === 'build-requested' ? 'build' : 'note';
      if (event === 'build') { p.status = 'building'; p.log.push({ at: now(), text: 'Claude picked up the build' }); }
      save(p); console.log(JSON.stringify({ event, notes: unread.map((n) => n.text), project: p }, null, 1)); process.exit(0);
    }
    if (Date.now() - t0 > timeout) { console.log(JSON.stringify({ event: 'timeout' })); process.exit(0); }
    setTimeout(tick, 1500);
  };
  tick();
} else if (cmd === 'progress') {
  const slug = process.argv[3], p = load(slug), text = process.argv[4] || '';
  const sc = arg('--scene'), clip = arg('--clip'), st = arg('--status');
  if (sc) { const s = p.scenes.find((x) => String(x.n) === String(sc)); if (s) { if (clip) s.clip = clip; s.status = clip ? 'done' : 'building'; } }
  if (st) p.status = st;
  if (text) p.log.push({ at: now(), text });
  save(p); console.log('ok');
} else if (cmd === 'done') {
  const slug = process.argv[3], p = load(slug); p.final = process.argv[4]; p.status = 'done'; p.savedPath = publishFinal(p); p.log.push({ at: now(), text: 'Finished: ' + (p.savedPath || p.final) }); save(p); console.log('ok');
} else if (cmd === 'reply') {
  const slug = process.argv[3], p = load(slug); p.notes.push({ from: 'claude', text: process.argv[4] || '', at: now(), read: true }); save(p); console.log('ok');
} else if (cmd === 'show') {
  console.log(JSON.stringify(load(process.argv[3]), null, 1));
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n'));
}
