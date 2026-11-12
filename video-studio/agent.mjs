// Runs Claude Code headless (your subscription) for the Video Studio UI:
//   writeScript(prompt, format) → a new project with title + second-by-second scenes, status "script-ready"
//   buildProject(slug)         → Claude renders every scene with its tool and stitches final.mp4, logging into the project
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(ROOT, '..');
const PROJECTS = path.join(ROOT, 'projects');
const SCRIPT_MODEL = process.env.VS_SCRIPT_MODEL || 'sonnet';
const BUILD_MODEL = process.env.VS_BUILD_MODEL || 'opus';
const now = () => new Date().toISOString();
const pfile = (slug) => path.join(PROJECTS, slug, 'project.json');
export const load = (slug) => JSON.parse(fs.readFileSync(pfile(slug), 'utf8'));
export const save = (p) => { fs.mkdirSync(path.join(PROJECTS, p.slug), { recursive: true }); const f = pfile(p.slug), t = f + '.tmp'; p.updatedAt = now(); fs.writeFileSync(t, JSON.stringify(p, null, 2)); fs.renameSync(t, f); return p; };
const update = (slug, fn) => { const p = load(slug); fn(p); return save(p); };
const logTo = (slug, text) => update(slug, (p) => { p.log.push({ at: now(), text }); if (p.log.length > 400) p.log.splice(0, p.log.length - 400); });

const running = new Map(); // slug -> child process
export const isRunning = (slug) => running.has(slug);

function emptyMcp() {
  const f = path.join(ROOT, '.empty-mcp.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, '{"mcpServers":{}}');
  return f;
}

function catalogSummary() {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  return c.tools.map((t) => `- ${t.id} (${t.name}): ${t.what} Speed: ${t.speed || '?'}. Styles: ${t.styles.map((s) => `${t.id}/${s.id} = ${s.name}`).join('; ')}`).join('\n');
}

const SCENE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'slug', 'format', 'scenes'],
  properties: {
    title: { type: 'string' }, slug: { type: 'string' }, format: { type: 'string', enum: ['9:16', '16:9', '1:1'] },
    music: { type: 'string', enum: ['lofi', 'ambient', 'upbeat', 'epic', 'none'] },
    scenes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['n', 'start', 'end', 'tool', 'visual', 'narration', 'onscreen', 'sound'],
      properties: { n: { type: 'integer' }, start: { type: 'number' }, end: { type: 'number' }, tool: { type: 'string' }, visual: { type: 'string' }, narration: { type: 'string' }, onscreen: { type: 'string' }, sound: { type: 'string' } } } },
  },
};

function claude(args, input, { cwd, onEvent }) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, TVHEAD_STUDIO: path.join(BUILD, 'studio'), HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' } });
    let buf = '', result = null, err = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
        try { const ev = JSON.parse(line); if (ev.type === 'result') result = ev; else onEvent?.(ev); } catch { /* not json */ }
      }
    });
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => reject(new Error('could not start Claude Code: ' + e.message)));
    child.on('close', () => {
      if (!result && buf.trim()) { try { result = JSON.parse(buf.trim()); } catch {} }
      if (!result) return reject(new Error('Claude Code stopped without a result. ' + err.slice(-400)));
      if (result.is_error) return reject(new Error('Claude Code: ' + result.result));
      resolve(result);
    });
    child.stdin.end(input);
    resolve.child = child;
    onEvent?.({ type: '_spawned', child });
  });
}

const leanFlags = () => ['--no-session-persistence', '--strict-mcp-config', '--mcp-config', emptyMcp(), '--setting-sources', '', '--disable-slash-commands'];

export async function writeScript(prompt, format = '9:16', style = null) {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const [tid, sid] = String(style || '').split('/');
  const tool = c.tools.find((t) => t.id === tid), st = tool?.styles.find((s) => s.id === sid);
  if (!st) throw new Error('Pick a style on the left first');
  const styleName = st.name === tool.name ? tool.name : `${st.name} (${tool.name})`;
  const base = (prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'video');
  let slug = base, k = 2; while (fs.existsSync(pfile(slug))) slug = `${base}-${k++}`;
  save({ slug, title: prompt.slice(0, 60), idea: prompt, style, styleName, format, voice: { engine: 'kokoro', voice: 'none', on: false }, music: 'lofi', status: 'writing-script', scenes: [], notes: [], log: [{ at: now(), text: `Claude is writing the script in ${styleName}…` }], final: null, createdAt: now() });
  const system = 'You are a short-form video director. You turn an idea into a script told scene by scene, second by second, and pick the best available animation tool for each scene. Return only the JSON requested.';
  const input = `The user's idea:\n"""${prompt}"""\n\nFormat: ${format}.\n\nThe user chose ONE style for the whole video: ${styleName}, tool id "${style}". About it: ${tool.what}\nEvery scene uses this style and only this style. Design every scene for what this style does well.\n\nWrite the video:
- title (short), slug (lowercase-with-hyphens), music (lofi/ambient/upbeat/epic/none).
- scenes: one picture each, 2-6 s, contiguous from 0, total 20-45 s unless the idea asks for another length.
- visual: exactly what we see (subject, action, framing), concrete enough to animate.
- narration: what the voice says in that scene, at most 2.4 words per second of the scene ("" for a silent beat).
- onscreen: text burned into the picture ("" if none). sound: the sound moment.
- tool: always "${style}".`;
  const args = ['-p', '--model', SCRIPT_MODEL, '--output-format', 'json', '--tools', '', '--system-prompt', system, '--json-schema', JSON.stringify(SCENE_SCHEMA), ...leanFlags()];
  (async () => {
    try {
      const r = await claude(args, input, { cwd: ROOT });
      const d = r.structured_output || JSON.parse(r.result);
      update(slug, (p) => { p.title = d.title; p.format = d.format || format; p.music = d.music || 'lofi'; p.scenes = d.scenes.map((s, i) => ({ ...s, tool: style, n: i + 1, notes: '' })); p.status = 'script-ready'; p.log.push({ at: now(), text: `Script ready: ${d.scenes.length} scenes. Edit anything, then validate to generate the video.` }); });
    } catch (e) { update(slug, (p) => { p.status = 'error'; p.log.push({ at: now(), text: 'Script failed: ' + e.message }); }); }
  })();
  return slug;
}

export function buildProject(slug) {
  if (running.has(slug)) return;
  update(slug, (p) => { p.status = 'building'; p.final = null; p.savedPath = null; p.scenes.forEach((s) => { delete s.clip; s.status = 'pending'; }); p.log.push({ at: now(), text: `Claude Code (${BUILD_MODEL}) started building the video` }); });
  const skill = path.join(BUILD, '.claude', 'skills', 'video-studio', 'SKILL.md');
  const input = `Build the Video Studio project "${slug}". The user already validated its script: the scenes in ${pfile(slug)} are the contract (tool, timing, visual, narration, on-screen text, sound, notes).
Read ${skill} first (sections 4 "Build", "Tool notes" and "Rules") and ${path.join(ROOT, 'catalog.json')}, then build every scene, register each clip with node "${path.join(ROOT, 'vs.mjs')}" progress ${slug} "…" --scene N --clip clips/scene-NN.mp4, stitch with node "${path.join(ROOT, 'tools', 'stitch.mjs')}" ${slug}, check the result, and finish with node "${path.join(ROOT, 'vs.mjs')}" done ${slug} final.mp4. Report short progress lines with vs.mjs progress as you go. Work only inside ${path.join(PROJECTS, slug)} (copy templates from ${path.join(BUILD, 'demos')} there). Do not ask questions: decide and build.`;
  const args = ['-p', '--model', BUILD_MODEL, '--output-format', 'stream-json', '--verbose', '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep', '--add-dir', BUILD, ...leanFlags()];
  let lastLog = 0;
  claude(args, input, {
    cwd: BUILD,
    onEvent: (ev) => {
      if (ev.type === '_spawned') { running.set(slug, ev.child); return; }
      if (ev.type !== 'assistant') return;
      for (const c of ev.message?.content ?? []) {
        if (c.type === 'tool_use' && Date.now() - lastLog > 1500) {
          const i = c.input ?? {};
          const what = c.name === 'Bash' ? String(i.description || i.command || '').slice(0, 110) : `${c.name.toLowerCase()} ${path.basename(String(i.file_path || i.pattern || ''))}`;
          if (!/vs\.mjs/.test(what)) { logTo(slug, 'Claude · ' + what); lastLog = Date.now(); }
        }
      }
    },
  }).then(() => {
    running.delete(slug);
    const p = load(slug);
    if (p.status !== 'done') update(slug, (x) => { x.status = x.final ? 'done' : 'error'; x.log.push({ at: now(), text: x.final ? 'Finished' : 'Claude stopped before the final video' }); });
  }).catch((e) => { running.delete(slug); update(slug, (p) => { p.status = 'error'; p.log.push({ at: now(), text: 'Build failed: ' + e.message }); }); });
}

export function stopBuild(slug) {
  const c = running.get(slug); if (!c) return false;
  try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(c.pid), '/T', '/F']) : c.kill(); } catch {}
  running.delete(slug); update(slug, (p) => { p.status = 'script-ready'; p.log.push({ at: now(), text: 'Build stopped' }); });
  return true;
}
