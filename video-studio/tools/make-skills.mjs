// Build new style skills with Claude Code headless (your subscription), one after another (memory is tight).
// Each skill = .claude/skills/<id>/ with SKILL.md (style rules + how to build a scene), engine/ (reusable code),
// examples/fire/ (a frame page) and a 5 s example clip in video-studio/examples/<id>--<example>.mp4.
//   node tools/make-skills.mjs [ids...]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.resolve(VS, '..');
const f = (...p) => path.join(...p).replace(/\\/g, '/');
const LOG = path.join(VS, 'examples', 'make-skills.log');
const empty = path.join(VS, '.empty-mcp.json'); if (!fs.existsSync(empty)) fs.writeFileSync(empty, '{"mcpServers":{}}');
const RENDER = f(VS, 'tools/page-render.mjs');

const FIRE_SCIENCE = `Example to make (5 s, 1920x1080, 30 fps): "the science of fire". Beat 1 (0-1.5 s): two sticks rub, friction marks and heat building. Beat 2 (1.5-3 s): the fire triangle (HEAT, FUEL, OXYGEN) assembles around a small flame. Beat 3 (3-5 s): combustion: CH4 + 2 O2 -> CO2 + 2 H2O (or wood volatiles burning), the flame grows. Adapt the emphasis to what this style shows best, but keep the three beats and keep every label in English and legible at 960x540.`;

const SKILL = (id, title, look, example, extra = '') => `Write a new Claude Code skill: "${title}". It must let any later Claude session make videos in this exact style, for any subject.

The look: ${look}

Deliverables, all under ${f(BUILD, '.claude/skills', id)}/:
1. SKILL.md with YAML frontmatter (name: ${id}; description: one or two sentences on the style and when to use it, starting with what it makes). Body: the style bible (palette with hex values, line weights, type, motion rules and timing, camera, composition, what to never do), then "How to build a scene" step by step for this engine, then a "Checks" list (what to look for in stills before rendering). Keep it practical and under ~250 lines.
2. engine/: a small reusable library (plain ES modules, no build step) with the style's primitives and helpers (shapes, labels, arrows, textures, easing, scene timeline helpers) so new videos are mostly composition. Deterministic: everything is a function of time t; seeded randomness only.${extra}
3. examples/fire/: a frame page that uses the engine. Contract: index.html sets window.DUR (seconds), window.render(t) draws the frame for time t, window.READY = true once fonts/images are loaded. It is served with its own folder as the web root, so it must import the engine with a relative path that resolves inside that folder: copy (do not symlink) the engine files you need into examples/fire/engine/ at the end, or import from './engine/...' after copying. three.js, if used, is at '/_vendor/three.module.js' and its addons at '/_vendor/addons/...' (e.g. '/_vendor/addons/controls/OrbitControls.js'). Use only fonts that are on Windows (Segoe UI, Bahnschrift, Consolas, Georgia, Cambria, Arial) or none; no network requests.
${example}
4. Render: stills first, node "${RENDER}" "<examples/fire dir>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<dir>/stills", Read them, fix (up to 3 rounds), then node "${RENDER}" "<examples/fire dir>" --out "${f(VS, 'examples', `${id}--fire.mp4`)}" --size 1920x1080 --fps 30.
Then ffmpeg -y -i "<that mp4>" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 "<dir>/sheet.jpg" and Read it: whole subject in frame, labels legible, unmistakably this style, nothing broken. Fix once more if needed.
Rules: this PC is Windows, Intel Iris Xe, ~4 GB RAM free: keep pages light. Quote paths (the user name has an "Á"). Never imitate a real studio's or channel's branding or characters: this is an original style. Do not ask questions. End with one line: the skill path and what the example shows.`;

const TASKS = {
  'sci-flat': () => SKILL('sci-flat', 'Science explainer: flat vector diagram',
    'a modern textbook / editorial science diagram in 2D: flat shapes, no gradients except one soft background, a restrained palette (deep navy ink, off-white paper, 3 accent colours), uniform rounded strokes, clean sans labels with leader lines, elements that build on (draw-on strokes, pop-in with slight overshoot, arrows that grow), numbered callouts, a thin grid only when it helps. Calm and precise.',
    FIRE_SCIENCE),
  'sci-fluoro': () => SKILL('sci-fluoro', 'Science explainer: fluorescence microscopy',
    'the look of a confocal / fluorescence microscope: pure black background, glowing structures in channel colours (cyan, magenta, yellow, green) with additive blending, soft bloom, slight chromatic noise and grain, organic wobbly shapes, a scale bar and small monospace channel labels (e.g. "CH1 488nm"), slow drifting focus pulls. Beautiful and a little mysterious.',
    FIRE_SCIENCE + ' In this style show fire "under the microscope": wood fibres and cells heating at the friction point, glowing particles (soot, embers) and molecules as fluorescent blobs; the fire triangle can be three glowing channel rings.'),
  'sci-molecular': () => SKILL('sci-molecular', 'Science explainer: 3D molecular',
    'premium 3D molecular visualisation with three.js: ball-and-stick and space-filling molecules with CPK colours (C dark grey, O red, H white, N blue), soft studio lighting with a rim light, subtle depth of field feel (fog / focus falloff), dark gradient background, smooth orbiting camera, atoms and bonds that animate (bonds breaking and forming), clean floating labels.',
    FIRE_SCIENCE + ' Beat 3 is the hero here: CH4 and two O2 approach, bonds break, CO2 and two H2O form, with a warm flame glow behind.',
    ' Include helpers to build molecules from a small atom/bond list and to animate a reaction (bonds breaking/forming by t).'),
  'sci-notebook': () => SKILL('sci-notebook', 'Science explainer: lab notebook sketch',
    'a scientist\'s lab notebook: cream graph paper with faint blue grid and a red margin line, blue-black ink drawn on stroke by stroke with slightly wobbly hand-drawn lines, handwritten-style labels (use a script-looking Windows font such as "Segoe Print" or "Ink Free", or hand-built letterforms), pencil hatching for shading, arrows and circled notes, a few highlighter marks, an equation written out by hand. Feels like ideas forming in real time.',
    FIRE_SCIENCE + ' Add margin notes like "wood ignites ~300 °C" and an arrow-heavy friction sketch.'),
  'exploded-product': () => SKILL('exploded-product', 'Product exploded view (3D)',
    'a premium product "exploded view" render with three.js: a clean seamless studio backdrop (light warm grey), soft shadows (contact shadow under the object), physically based metals and glass (brushed steel, polished bezel, sapphire crystal with reflections, matte dial), the assembled product turns slowly, then its parts separate along one axis in a staggered, eased sequence, hold with thin leader lines and small caps labels, optionally reassemble. Calm, precise, expensive.',
    'Example to make (5 s, 1920x1080, 30 fps): an original mechanical wristwatch (no real brand or logo). Parts built procedurally in code: strap halves, case, bezel, sapphire crystal, dial with indices, hour/minute/second hands, crown, movement plate, a few gears with real teeth, balance wheel, case back. 0-1.5 s assembled watch rotates in three-quarter view; 1.5-3.5 s it explodes upward/outward along its axis in a staggered sequence; 3.5-5 s hold with labels (CRYSTAL, BEZEL, DIAL, HANDS, MOVEMENT, CASE BACK, CROWN) and a slow camera drift.',
    ' Include a generic exploder: give it a list of parts (mesh, explode direction, distance, delay) and t, and it places them; plus a label/leader-line overlay that projects 3D anchors to 2D. Also gear/tooth and cylinder-with-bevel helpers so other products (headphones, cameras, sneakers) can reuse it.'),
};

function run(id) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('claude', ['-p', '--model', 'opus', '--output-format', 'json', '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep',
      '--add-dir', BUILD, '--no-session-persistence', '--strict-mcp-config', '--mcp-config', empty, '--setting-sources', '', '--disable-slash-commands'],
      { cwd: BUILD, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (err += d));
    child.stdin.end(TASKS[id]());
    child.on('close', () => {
      const file = path.join(VS, 'examples', `${id}--fire.mp4`);
      let r = {}; try { r = JSON.parse(out.trim()); } catch {}
      const ok = fs.existsSync(file) && fs.statSync(file).mtimeMs > t0 && fs.existsSync(path.join(BUILD, '.claude/skills', id, 'SKILL.md'));
      const line = `${id} ${ok ? 'OK' : 'FAIL'} ${((Date.now() - t0) / 60000).toFixed(1)} min, ${r.num_turns ?? '?'} turns | ${String(r.result ?? err).replace(/\s+/g, ' ').slice(0, 220)}`;
      fs.appendFileSync(LOG, line + '\n'); console.log(line); resolve();
    });
  });
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TASKS);
for (const id of ids) await run(id);
console.log('SKILLS DONE');
