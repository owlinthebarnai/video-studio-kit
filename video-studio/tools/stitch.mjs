#!/usr/bin/env node
// Stitch a Video Studio project: clips (one per scene) → fitted to each scene's length and the format → narration per
// scene (Kokoro, local) placed at the scene's start → optional generated music under it → final.mp4 at -14 LUFS.
//   node tools/stitch.mjs <slug> [--music lofi|ambient|upbeat|epic|none] [--no-voice]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.resolve(ROOT, '..');
const slug = process.argv[2];
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const dir = path.join(ROOT, 'projects', slug), P = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
const work = path.join(dir, 'stitch'); fs.mkdirSync(work, { recursive: true });
const SIZE = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080] }[P.format || '9:16'];
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) { console.error(r.stderr?.slice(-1500)); throw new Error(`${cmd} failed`); } return r.stdout; };
const ff = (args) => run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const dur = (f) => +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim();

// 1. every scene clip → exact length, format, 30 fps (freeze the last frame if a clip is short; fit inside with a dark pad)
const parts = [];
for (const s of P.scenes) {
  const len = +(s.end - s.start).toFixed(3);
  if (!(len > 0)) continue;
  const src = s.clip ? path.join(dir, s.clip) : null;
  const out = path.join(work, `part-${String(s.n).padStart(2, '0')}.mp4`);
  const [W, H] = SIZE;
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x101018,fps=30,format=yuv420p,setsar=1`;
  if (src && fs.existsSync(src)) {
    const have = dur(src);
    const vf = have < len ? `${fit},tpad=stop_mode=clone:stop_duration=${(len - have + 0.1).toFixed(2)}` : fit;
    ff(['-i', src, '-t', String(len), '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', out]);
  } else {
    console.warn(`scene ${s.n}: no clip, using a placeholder card`);
    ff(['-f', 'lavfi', '-i', `color=c=0x101018:s=${W}x${H}:r=30:d=${len}`, '-vf', `drawtext=text='scene ${s.n}':fontcolor=white:fontsize=60:x=(w-tw)/2:y=(h-th)/2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
  }
  parts.push(out);
}
const list = path.join(work, 'list.txt'); fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const video = path.join(work, 'video.mp4'); ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
const total = dur(video);

// 2. narration: one Kokoro line per scene, placed at the scene's start
const voiceName = P.voice?.voice || 'am_michael';
// voice-over is opt-in: only when the user picked a voice in the studio (voice.on === true)
const useVoice = !process.argv.includes('--no-voice') && P.voice?.on === true && voiceName !== 'none';
const tts = path.join(BUILD, 'studio', 'tts');
const py = path.join(tts, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const lines = [];
if (useVoice) for (const s of P.scenes) {
  const text = (s.narration || '').trim(); if (!text) continue;
  const f = path.join(work, `vo-${String(s.n).padStart(2, '0')}.mp3`);
  const r = spawnSync(py, [path.join(tts, 'speak.py'), f, voiceName, '1.0'], { input: text, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(f)) { console.warn(`scene ${s.n}: voice failed ${r.stderr?.slice(-300)}`); continue; }
  const d = dur(f), room = s.end - s.start;
  if (d > room + 0.05) console.warn(`scene ${s.n}: narration is ${d.toFixed(1)} s for a ${room.toFixed(1)} s scene (it will run over)`);
  lines.push({ f, at: s.start + 0.15 });
}

// 3. music from tvhead's free generator (optional)
let music = null; const preset = arg('--music', P.music && P.music !== 'auto' ? P.music : 'lofi');
if (preset !== 'none') {
  try {
    const { renderMusic } = await import(pathToFileURL(path.join(BUILD, 'studio', 'lib', 'music.mjs')).href);
    music = path.join(work, 'music.mp3');
    await renderMusic({ preset, duration: total + 0.5, seed: 7 }, music);
  } catch (e) { console.warn('music skipped: ' + e.message); music = null; }
}

// 4. mix and mux
const inputs = ['-i', video]; const filters = []; const mixIn = [];
lines.forEach((l, i) => { inputs.push('-i', l.f); filters.push(`[${i + 1}:a]adelay=${Math.round(l.at * 1000)}|${Math.round(l.at * 1000)},aresample=48000[v${i}]`); mixIn.push(`[v${i}]`); });
if (music && fs.existsSync(music)) { const k = lines.length + 1; inputs.push('-i', music); filters.push(`[${k}:a]volume=${lines.length ? 0.22 : 0.6},aresample=48000[m]`); mixIn.push('[m]'); }
const final = path.join(dir, 'final.mp4');
if (mixIn.length) {
  filters.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  ff([...inputs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[a]', '-t', String(total), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
} else ff(['-i', video, '-c', 'copy', '-movflags', '+faststart', final]);
console.log(`final.mp4: ${total.toFixed(2)} s, ${SIZE.join('x')}, ${lines.length} narration line(s), music: ${music ? preset : 'none'}`);
