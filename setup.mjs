#!/usr/bin/env node
// Video Studio kit — one-time setup.   node setup.mjs [--all] [--skip-voice]
//   1. checks the tools you need (Node 20+, git, ffmpeg, Python 3.10+, Claude Code logged in; Blender optional)
//   2. clones the third-party repos it needs at the pinned commits in repos.json (--all: every repo, incl. optional ones)
//   3. installs the Remotion skills from their own repo, applies our additions (overlays/)
//   4. npm installs the studio, the demos and lemo-opuscar, and the headless browser the renderers use
//   5. creates the local Kokoro voice (Python venv + model files, ~340 MB) unless --skip-voice
// Safe to run again: finished steps are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ALL = process.argv.includes('--all'), SKIP_VOICE = process.argv.includes('--skip-voice');
const WIN = process.platform === 'win32';
const say = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);
const ok = (s) => console.log(`  \x1b[32m✓\x1b[0m ${s}`), warn = (s) => console.log(`  \x1b[33m!\x1b[0m ${s}`), bad = (s) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
// npm/npx/claude are .cmd shims on Windows and need a shell; everything else runs without one (paths with spaces stay intact)
const SHELL = new Set(['npm', 'npx', 'claude']);
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: WIN && SHELL.has(cmd), ...opts });
const out = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', shell: WIN && SHELL.has(cmd) }); return r.status === 0 ? (r.stdout || r.stderr || '').trim() : null; };

// ---------- 1. requirements ----------
say('1/5 Checking requirements');
let missing = 0;
const node = +process.versions.node.split('.')[0]; node >= 20 ? ok(`Node ${process.versions.node}`) : (bad(`Node 20+ needed (you have ${process.versions.node})`), missing++);
out('git', ['--version']) ? ok('git') : (bad('git not found: https://git-scm.com'), missing++);
out('ffmpeg', ['-version']) ? ok('ffmpeg') : (bad('ffmpeg not found on PATH: https://ffmpeg.org/download.html (Windows: winget install Gyan.FFmpeg)'), missing++);
const PY = ['python', 'python3', 'py'].find((p) => /Python 3\.(1\d|[2-9]\d)/.test(out(p, ['--version']) || ''));
PY ? ok(`Python (${out(PY, ['--version'])})`) : (bad('Python 3.10+ not found: https://www.python.org'), missing++);
const claude = out('claude', ['--version']);
if (!claude) { bad('Claude Code not found: https://claude.com/claude-code (then run `claude` once and log in with your Claude account)'); missing++; }
else { const st = out('claude', ['auth', 'status']) || ''; /"loggedIn":\s*true/.test(st) ? ok(`Claude Code ${claude.split(' ')[0]} (logged in)`) : warn(`Claude Code ${claude.split(' ')[0]}: run \`claude\` once and log in with your subscription`); }
const blender = process.env.BLENDER || (WIN ? ['5.3', '5.2', '5.1', '5.0', '4.5', '4.4', '4.3', '4.2'].map((v) => `C:/Program Files/Blender Foundation/Blender ${v}/blender.exe`).find((p) => fs.existsSync(p)) : (out('which', ['blender']) || (fs.existsSync('/Applications/Blender.app/Contents/MacOS/Blender') ? '/Applications/Blender.app/Contents/MacOS/Blender' : null)));
blender ? ok(`Blender (${blender}) — set BLENDER to this path for the Blender styles`) : warn('Blender not found (optional: only the Blender clay / 3D styles need it). https://www.blender.org');
if (missing) { console.log(`\n${missing} requirement(s) missing: install them and run node setup.mjs again.`); process.exit(1); }

// ---------- 2. third-party repos ----------
say('2/5 Third-party repos (pinned)');
const REQUIRED = new Set(['lemomo-ai_lemo-opuscar', 'remotion-dev_skills', 'Theoxmotion_story-video-studio__backup-morgsdoti', 'showheyohtaki_motion-prompt']);
const repos = JSON.parse(fs.readFileSync(path.join(ROOT, 'repos.json'), 'utf8'));
fs.mkdirSync(path.join(ROOT, 'repos'), { recursive: true });
for (const r of repos) {
  if (!ALL && !REQUIRED.has(r.dir)) continue;
  const d = path.join(ROOT, 'repos', r.dir);
  if (fs.existsSync(path.join(d, '.git'))) { ok(`${r.dir} (already there)`); continue; }
  fs.mkdirSync(d, { recursive: true });
  run('git', ['init', '-q'], { cwd: d }); run('git', ['remote', 'add', 'origin', r.url], { cwd: d });
  const f = run('git', ['fetch', '-q', '--depth', '1', 'origin', r.commit], { cwd: d });
  if (f.status === 0) { run('git', ['checkout', '-q', 'FETCH_HEAD'], { cwd: d }); ok(`${r.dir} @ ${r.commit.slice(0, 8)}`); }
  else { fs.rmSync(d, { recursive: true, force: true }); const c = run('git', ['clone', '-q', '--depth', '1', r.url, d]); c.status === 0 ? warn(`${r.dir}: pinned commit not available, cloned latest`) : bad(`${r.dir}: could not clone ${r.url}`); }
}
if (!ALL) console.log('  (optional repos skipped: run node setup.mjs --all to get every source repo)');

// ---------- 3. skills + overlays ----------
say('3/5 Skills and our additions');
const rs = path.join(ROOT, 'repos', 'remotion-dev_skills', 'skills');
if (fs.existsSync(rs)) { for (const n of fs.readdirSync(rs)) fs.cpSync(path.join(rs, n), path.join(ROOT, '.claude', 'skills', n), { recursive: true }); ok('Remotion skills installed from remotion-dev/skills'); }
else warn('Remotion skills not installed (repo missing)');
const ov = path.join(ROOT, 'overlays');
if (fs.existsSync(ov)) for (const r of fs.readdirSync(ov)) if (fs.existsSync(path.join(ROOT, 'repos', r))) { fs.cpSync(path.join(ov, r), path.join(ROOT, 'repos', r), { recursive: true }); ok(`overlay applied to ${r}`); }
ok(`${fs.readdirSync(path.join(ROOT, '.claude', 'skills')).length} skills in .claude/skills`);

// ---------- 4. npm + browser ----------
say('4/5 Node dependencies (this takes a while the first time)');
const npmDirs = ['studio', ...fs.readdirSync(path.join(ROOT, 'demos')).map((d) => path.join('demos', d)), path.join('repos', 'lemomo-ai_lemo-opuscar')];
for (const d of npmDirs) {
  const abs = path.join(ROOT, d); if (!fs.existsSync(path.join(abs, 'package.json'))) continue;
  if (fs.existsSync(path.join(abs, 'node_modules'))) { ok(`${d} (already installed)`); continue; }
  const r = run('npm', [fs.existsSync(path.join(abs, 'package-lock.json')) ? 'ci' : 'install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: abs });
  r.status === 0 ? ok(d) : bad(`${d}: npm failed (see above)`);
}
const lemo = path.join(ROOT, 'repos', 'lemomo-ai_lemo-opuscar');
if (fs.existsSync(path.join(lemo, 'node_modules', 'playwright-core'))) { const r = run('node', ['node_modules/playwright-core/cli.js', 'install', 'chromium-headless-shell'], { cwd: lemo }); r.status === 0 ? ok('headless browser for the renderers') : bad('headless browser install failed'); }
run('npx', ['--yes', 'playwright', 'install', 'chromium'], { cwd: ROOT }).status === 0 ? ok('Playwright Chromium (animate, Remotion helpers)') : warn('Playwright Chromium install failed (only the animate style needs it)');

// ---------- 5. voice ----------
say('5/5 Local voice (Kokoro, free, English)');
const tts = path.join(ROOT, 'studio', 'tts'), venvPy = path.join(tts, '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
if (SKIP_VOICE) warn('skipped (--skip-voice): voice-over will be unavailable');
else {
  if (!fs.existsSync(venvPy)) run(PY, ['-m', 'venv', path.join(tts, '.venv')]);
  run(venvPy, ['-m', 'pip', 'install', '-q', 'kokoro-onnx', 'soundfile', 'espeakng-loader']).status === 0 ? ok('kokoro-onnx installed') : bad('pip install failed');
  const base = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/';
  for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) {
    const dst = path.join(tts, f); if (fs.existsSync(dst) && fs.statSync(dst).size > 1e6) { ok(`${f} (already there)`); continue; }
    console.log(`  downloading ${f}…`);
    const res = await fetch(base + f); if (!res.ok) { bad(`${f}: HTTP ${res.status}`); continue; }
    fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer())); ok(f);
  }
  const test = spawnSync(venvPy, [path.join(tts, 'speak.py'), path.join(tts, 'test.mp3'), 'am_michael', '1.0'], { input: 'Video Studio is ready.', encoding: 'utf8' });
  test.status === 0 ? (ok('voice test passed'), fs.rmSync(path.join(tts, 'test.mp3'), { force: true })) : bad('voice test failed: ' + (test.stderr || '').slice(-300));
}

say('Done.');
console.log(`  Start the studio:  ${WIN ? 'double-click "Start Video Studio.cmd"' : 'sh start-studio.sh'}   (or: node video-studio/vs.mjs serve, then http://localhost:4790)
  Or from Claude Code in this folder:  /video-studio <your idea>
  Everything runs on your machine with your own Claude subscription (Claude Code). No API keys needed.`);
