// Fire version of lemo-opuscar styles: Claude Code (headless, your subscription) writes a 5 s "discovery of fire" film in
// each style's own technique, checks stills, then renders the 5 s preview into examples/lemo-opuscar--<style>.mp4.
//   node tools/lemo-fire.mjs ukiyoe art-deco ascii-crt [--model opus]
// Writes a summary line per style (minutes, cost-equivalent, turns) to examples/lemo-fire.log.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.resolve(VS, '..', 'repos', 'lemomo-ai_lemo-opuscar');
const args = process.argv.slice(2), mi = args.indexOf('--model'), MODEL = mi >= 0 ? args.splice(mi, 2)[1] : 'opus';
const LOG = path.join(VS, 'examples', 'lemo-fire.log');
const empty = path.join(VS, '.empty-mcp.json'); if (!fs.existsSync(empty)) fs.writeFileSync(empty, '{"mcpServers":{}}');
const fwd = (p) => p.replace(/\\/g, '/');

const brief = (s) => `You are in the lemo-opuscar library (the current folder). Make a 5-second silent preview film of "the discovery of fire" in the style "${s}".

1. Learn the style: read styles/${s}/STYLE.md, then look at styles/${s}/demo (index.html and the scripts it loads) to see how this style is actually drawn: its palette, textures, line work, camera, type. Reuse that technique; the look must be unmistakably this style.
2. Create the film in films/fire-${s}/ (index.html plus any js). Copy and adapt code from the demo as needed. Pages are served from the library root, so use absolute URLs (/core/..., /styles/${s}/demo/...). Some demo fonts and generated textures may be missing (they are gitignored): only use files that exist, otherwise system fonts or procedural textures.
3. The story, 5 s, one continuous shot: night outside a cave. A caveman crouches rubbing two sticks together (0-2 s); a thin curl of smoke rises (2-3 s); a spark, then the fire bursts up, lights his face and the scene warm, and he raises his arms in joy (3-5 s). No text unless the style is built on type (then at most one short line, e.g. "FIRE").
4. Contract for the renderer: 16:9, drawn to fill whatever 16:9 viewport it gets (it renders at 1920x1080); window.DUR = 5; window.render(t) draws the frame for time t in seconds, deterministically (no Date.now, no unseeded Math.random, no requestAnimationFrame loop needed); window.READY = true once fonts and images are loaded. No audio.
5. Check: node core/render/still.mjs films/fire-${s} 0.5 2.5 4.5 --size 1920x1080 --out films/fire-${s}/stills, then Read the three stills. Is the caveman readable, is the fire the hero at 4.5 s, does it look like ${s}? Fix and re-check (at most 3 rounds).
6. Render the preview: node "${fwd(path.join(VS, 'tools', 'lemo-preview.mjs'))}" films/fire-${s} "${fwd(path.join(VS, 'examples', `lemo-opuscar--${s}.mp4`))}" --at 0
Do not modify anything under styles/ or core/. Do not ask questions. End with one line: what you made.`;

function run(s) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('claude', ['-p', '--model', MODEL, '--output-format', 'json', '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep',
      '--no-session-persistence', '--strict-mcp-config', '--mcp-config', empty, '--setting-sources', '', '--disable-slash-commands'],
      { cwd: LIB, windowsHide: true, env: { ...process.env, LEMO_OPUSCAR_HOME: LIB, PYTHONUTF8: '1' } });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (err += d));
    child.stdin.end(brief(s));
    child.on('close', () => {
      const min = ((Date.now() - t0) / 60000).toFixed(1);
      let r = {}; try { r = JSON.parse(out.trim()); } catch {}
      const ok = fs.existsSync(path.join(VS, 'examples', `lemo-opuscar--${s}.mp4`)) && fs.statSync(path.join(VS, 'examples', `lemo-opuscar--${s}.mp4`)).mtimeMs > t0;
      const line = `${s} ${ok ? 'OK' : 'FAIL'} ${min} min, ~$${(r.total_cost_usd ?? 0).toFixed(2)} equiv, ${r.num_turns ?? '?'} turns | ${String(r.result ?? err).replace(/\s+/g, ' ').slice(0, 200)}`;
      fs.appendFileSync(LOG, line + '\n'); console.log(line); resolve();
    });
  });
}
for (const s of args) await run(s);
console.log('PILOT DONE');
