// Fire-story previews for cartoon-3d-short, blender-3d and story-video-studio, made by Claude Code headless
// (your subscription), one after another (memory is tight on this PC). Each writes examples/<tool>--fire.mp4 in the
// tool's OWN native format (never cropped), checks a contact sheet, and logs a summary to examples/fire-tools.log.
//   node tools/fire-tools.mjs [cartoon3d] [blender3d] [story-video]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.resolve(VS, '..');
const f = (...p) => path.join(...p).replace(/\\/g, '/');
const LOG = path.join(VS, 'examples', 'fire-tools.log');
const empty = path.join(VS, '.empty-mcp.json'); if (!fs.existsSync(empty)) fs.writeFileSync(empty, '{"mcpServers":{}}');

const STORY = `The story, 5 seconds, one continuous shot: night outside a cave. A caveman crouches rubbing two sticks together (0-2 s); a thin curl of smoke rises (2-3 s); a spark, then the fire bursts up, lights his face and the scene warm, and he raises both arms in joy (3-5 s). The fire is the hero at the end.`;
const COMMON = (out) => `
Rules:
- Render in the tool's own native format and size; never crop or zoom a finished render to change its shape. Final file: ${out} (H.264, yuv420p, even width and height, 24-30 fps, about 5 s, silent).
- Check before finishing: ffmpeg -y -i "${out}" -vf "fps=2,scale=240:-2,tile=5x2" -frames:v 1 sheet.jpg (write it next to your work), then Read it. Is the whole subject inside the frame (nothing cut at the edges), is the caveman readable, is the fire clearly the hero at the end, does it look like this tool's style? Fix and re-render once if not.
- This PC: Windows, Intel Iris Xe (no CUDA), 16 GB RAM with only ~4 GB free: keep renders light (Remotion --concurrency=2, one Blender at a time). The user name has an "Á": quote paths.
- Work only in the folder given below. Do not ask questions. End with one line: what you made and where.`;

const TASKS = {
  cartoon3d: () => `Make a 5-second "discovery of fire" shot with the cartoon-3d-short look: 2D cartoon cards (flat-shaded characters drawn like the soldiers) standing in a painted low-poly 3D world (three.js inside Remotion).
${STORY}
Where: the Remotion project ${f(BUILD, 'demos/cartoon3d')}. Study src/videos/bridge_world (Bridge.tsx, cast.ts, lights.ts, paint.ts) and the skill ${f(BUILD, '.claude/skills/cartoon-3d-short/SKILL.md')} to copy the look. Create src/videos/fire_world/ with a new composition "FireWorld" (register it where bridge_world is registered), 1920x1080, 30 fps, 150 frames. Night palette with warm firelight.
Models: Kenney Nature Kit (CC0) is in kenney-dl/nature-kit.zip (inside "Models/GLTF format/"): extract only what you use, e.g. campfire_stones.glb, cliff_cave_rock.glb, rock_largeA.glb, log.glb, tree_pineDefaultA.glb, into public/fire/kenney/ (the textures they need are in the same zip; the bridge already uses public/bridge/kenney/Textures/colormap.png). The caveman is a cartoon card in the bridge's character style (fur tunic, beard, bare feet); the flames are animated cards or shader planes, plus a warm point light that flickers.
Known issue here: the EffectComposer post-processing renders blank on this PC, so render with post off, the way the bridge renders: set TEMP and TMP to ${f(BUILD, 'tmp-remotion')}, then npx remotion render <entry> FireWorld "${f(VS, 'examples/cartoon-3d-short--fire.mp4')}" --gl=angle --concurrency=2 --props='{"post":{"off":true}}' (read package.json / how the bridge composition takes its props first).
${COMMON(f(VS, 'examples/cartoon-3d-short--fire.mp4'))}`,

  blender3d: () => `Make a 5-second "discovery of fire" shot with the blender-3d skill's toon look (the soft clay-toy character with round head and little arms, on a simple stylised set, EEVEE).
${STORY}
Where: create ${f(BUILD, 'demos/blender3d-fire')}/ and write fire_plate.py there. Base it on ${f(BUILD, '.claude/skills/blender-3d/scripts/plate.py')} and ${f(BUILD, '.claude/skills/blender-3d/SKILL.md')} (read both: reuse the toon materials, lighting and character building). Build in code: a low-poly cave mouth and rocks, a caveman version of the toy character (brown fur tunic, small beard, two sticks in his hands), a ring of stones and logs, and animated flames (a few emissive, noise-displaced cones scaling up from 3 s), a warm flickering point light, a subtle night sky. Camera still, three-quarter view, everything in frame.
Render: Blender is "${process.env.BLENDER || 'blender'}" -b --factory-startup -P fire_plate.py -- ... EEVEE, 1080x1920 is the skill's vertical format, but to keep render time sane on this GPU render 540x960, 24 fps, 120 frames, low samples (EEVEE 16). Test 3 stills first (frames 12, 60, 110), check them, then the full sequence to PNGs and encode with ffmpeg to ${f(VS, 'examples/blender-3d--fire.mp4')}.
${COMMON(f(VS, 'examples/blender-3d--fire.mp4'))}`,

  'story-video': () => `Make a 5-second preview shot in the look of story-video-studio: a stickman survival story in 3D low-poly sets with a game-like HUD (day/clock chip in a corner, a white "RULE #N" card with a red tab, bold captions with one highlighted word), vertical 9:16.
${STORY} HUD for this shot: the clock chip "DAY 1 · 9:00 PM", a rule card "RULE #1 / MAKE FIRE" that pops in at the start, and a caption that reads "RUB THE STICKS" then "FIRE!" with the last word highlighted.
Read ${f(BUILD, 'repos/Theoxmotion_story-video-studio__backup-morgsdoti/story_video_prompt.md')} and README.md there to learn the exact look and the tech it prescribes, and look at the reference frames: ffmpeg -ss 2 -i "${f(VS, 'examples/story-video-studio--proof.mp4')}" -frames:v 1 ref.jpg (Read it). Do NOT run the full 1-2 hour pipeline: build just this one 5-second shot with the same look.
Where: work in ${f(BUILD, 'demos/story-fire')}/ (create it). Use the stack the prompt prescribes; if it is Remotion + three.js you can copy the setup of ${f(BUILD, 'demos/cartoon3d')} (already installed: reuse its node_modules by working inside a new composition there if that is simpler, but keep your files in their own folder). 1080x1920, 30 fps, 150 frames, render with --gl=angle --concurrency=2 and TEMP/TMP set to ${f(BUILD, 'tmp-remotion')}. Output ${f(VS, 'examples/story-video-studio--fire.mp4')}.
${COMMON(f(VS, 'examples/story-video-studio--fire.mp4'))}`,
  'motion-reel': () => `Make a short English "discovery of fire" version of motion-studio's MOTION REEL style (kinetic typography, voxel mascot, HUD micro-type, shader backgrounds, hard cuts on spoken words), vertical 1080x1920, 30 fps.
The current reel is a Russian demo about Claude Code. Replace its words and story, keep its look. Target 6-8 seconds, 3 scenes, punchy: e.g. "One cold night." / "Two sticks. Rub. Faster." / "Then: FIRE." The voxel mascot can play the caveman (fur-coloured voxels) and a voxel fire can grow; the last scene's type should say FIRE.
Where: ${f(BUILD, 'demos/motion-studio')} (a Remotion project, deps installed). How it works: tools/script.mjs holds the scenes (say = spoken line, cap = caption); npm run voice makes the narration with word timings into timeline.json (Kokoro, local, English); node tools/music.mjs makes the score; src/Root.tsx picks the component (Video = the reel, from src/scenes.tsx; AnimeVideo = the anime style). The reel's animations are cued on spoken words with W(sceneId, lineIndex, "word") in src/scenes.tsx (and helpers in src/lib.tsx / src/fx.tsx): every cue word must exist in your English script, so rewrite those cues (and any Russian on-screen text) for the new script; keep scene ids consistent between script and scenes.
Right now tools/script.mjs and Root.tsx are set to an English fire ANIME episode that must keep working: first copy tools/script.mjs to tools/script.anime-fire.mjs and note Root.tsx's current component; make your reel version as tools/script.reel-fire.mjs and a copy of scenes.tsx as src/scenes-fire.tsx (do not break the original files), switch script/Root only for your render, and at the end restore tools/script.mjs, timeline.json and Root.tsx exactly as they were (keep a copy of your timeline as timeline.reel-fire.json).
Env: TVHEAD_STUDIO=${f(BUILD, 'studio')} (the voice tool needs it); TEMP and TMP = ${f(BUILD, 'tmp-remotion')}; render with npx remotion render src/index.ts Reel "${f(VS, 'examples/motion-studio--reel.mp4')}" --gl=angle --concurrency=2 --crf=20. Keep the narration and music in this file (this style is built on the voice).
${COMMON(f(VS, 'examples/motion-studio--reel.mp4')).replace('silent', 'with its narration and music')}`,
  'blender3d-hq': () => `Redo the blender-3d "discovery of fire" preview. The user compared it with the skill's ORIGINAL toon plate and found the original much better: it showcases the clay texture and render quality and is distinctive. The current fire version (${f(BUILD, 'demos/blender3d-fire/fire_plate.py')}) is too dark, too far away and flat, so the material quality is lost.
Reference: Read ${f(VS, 'examples/blender-3d--toon.mp4')} frames (ffmpeg -ss 0.5 -i it -frames:v 1 ref.png, then Read ref.png) and ${f(BUILD, '.claude/skills/blender-3d/scripts/plate.py')} with --look toon. Match that look exactly: the SAME toy character built the same way (rounded box body, little round arms and stubby legs, ink outline from outline(), ink face with eye highlights, smile, pink blush), the same toon materials and soft shading, clean saturated colours, the deep blue-violet backdrop and the soft green ground disc. The character is the hero: big in frame (60-70% of the height), close three-quarter camera, sharp.
Dress him lightly as a caveman (a brown fur tunic patch with an outline, a tuft of hair, two sticks held in his little arms), keep his face readable. ${STORY.replace('night outside a cave', 'dusk on the green hill')} The fire sits beside him, built in the same toon style (outlined stones, stylised flame shapes in yellow/orange with emission, animated), and its warm light rims his body and face without crushing the colours: the scene must stay bright and readable from start to end. A tiny cave or rock can sit in the background but stays secondary.
Render: Blender 5.3 at "${process.env.BLENDER || 'blender'}" -b --factory-startup -P <script> -- ...; EEVEE, 1080x1920, 24 fps, 120 frames, taa_render_samples 64, Standard view transform as the toon look uses. Write your script as ${f(BUILD, 'demos/blender3d-fire/fire_toon_hq.py')} (keep the old one). Test 3 stills (frames 12, 70, 115) at full resolution and compare them side by side with ref.png before the full render; the clay texture, outline and face must look as good as the reference. Then PNG sequence to ffmpeg (crf 16) to ${f(VS, 'examples/blender-3d--fire.mp4')}.
${COMMON(f(VS, 'examples/blender-3d--fire.mp4'))}`,

  'exploded-lighter': () => `The skill ${f(BUILD, '.claude/skills/exploded-product')} (read its SKILL.md and engine/) has a watch as its example. The user wants the preview to fit the "discovery of fire" theme: make a second example with an original classic flip-top petrol lighter (no real brand, no logo; brushed and polished steel, a little brass) and render it as the skill's preview.
Create ${f(BUILD, '.claude/skills/exploded-product/examples/lighter')}/ (same frame-page contract as examples/fire, copying the engine files it needs into it). Parts built procedurally with the engine: outer case bottom, hinged lid, hinge, inner chimney with its vent holes, flint wheel (knurled), flint, flint spring and tube, wick, cotton/felt insert, inner case. 0-1.5 s: the closed lighter turns slowly in three-quarter view on the studio backdrop; 1.5-3.5 s: the lid flips open, then the parts separate upward/outward along the axis in a staggered sequence; 3.5-5 s: hold with thin leader lines and small caps labels (LID, HINGE, CHIMNEY, FLINT WHEEL, FLINT, SPRING, WICK, INSERT, CASE), and a small clean flame appears on the wick (stylised, emissive, soft glow) so the shot ends on fire. Keep the skill's look: seamless warm grey studio, contact shadow, PBR metals with reflections, calm eased motion.
Render with node "${f(VS, 'tools/page-render.mjs')}" <dir> --stills 0.5,2.5,4.5 --size 1920x1080 --outdir <dir>/stills (check them), then --out "${f(VS, 'examples/exploded-product--fire.mp4')}" --size 1920x1080 --fps 30. Keep the watch example where it is, and add a line about the lighter example to SKILL.md.
${COMMON(f(VS, 'examples/exploded-product--fire.mp4'))}`,
};

function run(id) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('claude', ['-p', '--model', 'opus', '--output-format', 'json', '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep',
      '--add-dir', BUILD, '--no-session-persistence', '--strict-mcp-config', '--mcp-config', empty, '--setting-sources', '', '--disable-slash-commands'],
      { cwd: BUILD, windowsHide: true, env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1', PYTHONUTF8: '1' } });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (err += d));
    child.stdin.end(TASKS[id]());
    child.on('close', () => {
      const file = path.join(VS, 'examples', { cartoon3d: 'cartoon-3d-short--fire', blender3d: 'blender-3d--fire', 'blender3d-hq': 'blender-3d--fire', 'story-video': 'story-video-studio--fire', 'motion-reel': 'motion-studio--reel', 'exploded-lighter': 'exploded-product--fire' }[id] + '.mp4');
      let r = {}; try { r = JSON.parse(out.trim()); } catch {}
      const ok = fs.existsSync(file) && fs.statSync(file).mtimeMs > t0;
      const line = `${id} ${ok ? 'OK' : 'FAIL'} ${((Date.now() - t0) / 60000).toFixed(1)} min, ${r.num_turns ?? '?'} turns | ${String(r.result ?? err).replace(/\s+/g, ' ').slice(0, 220)}`;
      fs.appendFileSync(LOG, line + '\n'); console.log(line); resolve();
    });
  });
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TASKS);
for (const id of ids) await run(id);
console.log('FIRE TOOLS DONE');
