#!/usr/bin/env node
// Build the shareable "video-studio-kit" folder from this build folder (re-runnable; the target is replaced each time,
// except its .git). Leaves out: node_modules, Python venvs, model weights, renders, the user's own projects and episodes,
// logs.
//   node video-studio/tools/package.mjs [targetDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.resolve(VS, '..');
const OUT = path.resolve(process.argv[2] || path.join(BUILD, '..', 'video-studio-kit'));

const SKIP_DIRS = new Set(['node_modules', '.venv', '.git', '.next', 'out', 'build', 'renders', 'frames', 'tmp', '.hyperframes', '__pycache__', 'voice-cache', 'stills', 'kenney-dl', '.remotion']);
const SKIP_FILE = (n) => /\.(onnx|wav|log|err|tmp|lock)$/i.test(n) || /^server\.log/.test(n) || n === '.empty-mcp.json' || n === 'voices-v1.0.bin' || n === 'tsconfig.tsbuildinfo' || /log\.txt$/i.test(n);
let files = 0, bytes = 0;
function copy(src, dst, { skipDirs = SKIP_DIRS, skipFile = SKIP_FILE, filter = () => true } = {}) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (skipDirs.has(path.basename(src))) return;
    for (const n of fs.readdirSync(src)) copy(path.join(src, n), path.join(dst, n), { skipDirs, skipFile, filter });
    return;
  }
  if (skipFile(path.basename(src)) || !filter(src)) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); files++; bytes += st.size;
}

// fresh target (keep .git so re-packaging is a normal commit)
if (fs.existsSync(OUT)) for (const n of fs.readdirSync(OUT)) if (n !== '.git') fs.rmSync(path.join(OUT, n), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 1. Video Studio app (no user projects; only current example clips)
const STALE = new Set(['story-video-studio--proof.mp4', 'cartoon-3d-short--builtin.mp4', 'blender-3d--toon.mp4']);
copy(VS, path.join(OUT, 'video-studio'), {
  skipDirs: new Set([...SKIP_DIRS, 'projects']),
  filter: (f) => { const n = path.basename(f); if (n.startsWith('.') || n === 'record-demo.cjs') return false; if (f.includes(`${path.sep}examples${path.sep}`)) return n.endsWith('.mp4') && !STALE.has(n); return true; },
});

// 2. skills: everything except Remotion's (no licence file in its repo: setup fetches them) and the unlicensed kit
const NO_SHIP = () => false; // every skill ships (Remotion's included, by the owner's decision)
for (const n of fs.readdirSync(path.join(BUILD, '.claude', 'skills'))) if (!NO_SHIP(n)) copy(path.join(BUILD, '.claude', 'skills', n), path.join(OUT, '.claude', 'skills', n));

// 3. tvhead studio (Kokoro patch included; models downloaded by setup); only the fire example episodes
copy(path.join(BUILD, 'studio'), path.join(OUT, 'studio'), {
  filter: (f) => { const rel = path.relative(path.join(BUILD, 'studio'), f).split(path.sep); return rel[0] !== 'episodes' || rel[1]?.startsWith('fire-') || rel[1] === undefined; },
});

// 4. demos (the working setups the catalog's build recipes point to), without the kit-based one
for (const d of fs.readdirSync(path.join(BUILD, 'demos'))) copy(path.join(BUILD, 'demos', d), path.join(OUT, 'demos', d));

// 5. our additions inside third-party repos (applied by setup after cloning)
const LEMO = path.join(BUILD, 'repos', 'lemomo-ai_lemo-opuscar');
if (fs.existsSync(path.join(LEMO, 'films'))) copy(path.join(LEMO, 'films'), path.join(OUT, 'overlays', 'lemomo-ai_lemo-opuscar', 'films'));

// 6. repos manifest (pinned commits), MCP config
const repos = [];
for (const d of fs.readdirSync(path.join(BUILD, 'repos'))) {
  const git = path.join(BUILD, 'repos', d, '.git'); if (!fs.existsSync(git)) continue;
  const head = fs.readFileSync(path.join(git, 'HEAD'), 'utf8').trim();
  let commit = head; if (head.startsWith('ref:')) { const ref = head.slice(5); const rf = path.join(git, ref); commit = fs.existsSync(rf) ? fs.readFileSync(rf, 'utf8').trim() : (fs.readFileSync(path.join(git, 'packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(ref)) || '').split(' ')[0]; }
  const cfg = fs.readFileSync(path.join(git, 'config'), 'utf8'), url = (cfg.match(/url = (.+)/) || [])[1];
  repos.push({ dir: d, url, commit });
}
fs.writeFileSync(path.join(OUT, 'repos.json'), JSON.stringify(repos, null, 2));
if (fs.existsSync(path.join(BUILD, '.mcp.json'))) copy(path.join(BUILD, '.mcp.json'), path.join(OUT, '.mcp.json'));
for (const f of ['README.md', 'THIRD_PARTY.md', 'setup.mjs', '.gitignore', 'start-studio.sh', 'Start Video Studio.cmd']) {
  const src = path.join(VS, 'kit', f); if (fs.existsSync(src)) copy(src, path.join(OUT, f), { skipFile: () => false });
}
if (fs.existsSync(path.join(VS, 'kit', 'docs'))) copy(path.join(VS, 'kit', 'docs'), path.join(OUT, 'docs'), { skipFile: () => false });
fs.rmSync(path.join(OUT, 'video-studio', 'kit'), { recursive: true, force: true });
fs.rmSync(path.join(OUT, 'video-studio', 'Start Video Studio.cmd'), { force: true });

// 6b. keep the repo light: re-encode big example clips (the originals stay in the build folder)
import('node:child_process').then(() => {});
const { spawnSync } = await import('node:child_process');
const exDir = path.join(OUT, 'video-studio', 'examples');
for (const n of fs.readdirSync(exDir)) {
  const f = path.join(exDir, n); if (fs.statSync(f).size < 6e6) continue;
  const tmp = f + '.tmp.mp4';
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp]);
  if (r.status === 0 && fs.statSync(tmp).size < fs.statSync(f).size) { bytes -= fs.statSync(f).size - fs.statSync(tmp).size; fs.renameSync(tmp, f); } else fs.rmSync(tmp, { force: true });
}

// 7. safety: no personal paths or secrets
const bad = [];
(function scan(d) { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (n === '.git' || n === 'package.mjs') continue; const st = fs.statSync(f);
  if (st.isDirectory()) scan(f); else if (st.size < 2e6 && /\.(js|mjs|cjs|ts|tsx|py|json|md|sh|cmd|html|css|txt|yml)$/i.test(n)) {
    const s = fs.readFileSync(f, 'utf8'); if (/Álvaro|LVARO~1|alvsanchezrubio|alrubsan|sk-ant-|AIza[0-9A-Za-z_-]{20}/.test(s)) bad.push(path.relative(OUT, f)); } } })(OUT);
console.log(`packaged ${files} files, ${(bytes / 1048576).toFixed(0)} MB -> ${OUT}`);
if (bad.length) { console.log('PERSONAL DATA FOUND in:\n  ' + bad.join('\n  ')); process.exitCode = 3; }
