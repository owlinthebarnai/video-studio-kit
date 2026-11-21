// Runs an agent CLI headless for the Video Studio UI:
//   writeScript(prompt, format) → a new project with title + second-by-second scenes, status "script-ready"
//   buildProject(slug)         → the agent renders every scene with its tool and stitches final.mp4, logging into the project
// Which CLI: VS_AGENT env (claude|devin|gemini|codex), else the first installed — see agent-cli.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pick, modelFor, askAgent, runAgent, extractJson } from './agent-cli.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(ROOT, '..');
const PROJECTS = path.join(ROOT, 'projects');
const AGENT = pick(); // null when no supported agent CLI is installed
const now = () => new Date().toISOString();
const pfile = (slug) => path.join(PROJECTS, slug, 'project.json');
export const load = (slug) => JSON.parse(fs.readFileSync(pfile(slug), 'utf8'));
export const save = (p) => { fs.mkdirSync(path.join(PROJECTS, p.slug), { recursive: true }); const f = pfile(p.slug), t = f + '.tmp'; p.updatedAt = now(); fs.writeFileSync(t, JSON.stringify(p, null, 2)); fs.renameSync(t, f); return p; };
const update = (slug, fn) => { const p = load(slug); fn(p); return save(p); };
const logTo = (slug, text) => update(slug, (p) => { p.log.push({ at: now(), text }); if (p.log.length > 400) p.log.splice(0, p.log.length - 400); });

const running = new Map(); // slug -> child process
export const isRunning = (slug) => running.has(slug);
const needAgent = () => { if (!AGENT) throw new Error('No agent CLI found — install one of: claude, devin, gemini, codex'); return AGENT; };

function emptyMcp() {
  const f = path.join(ROOT, '.empty-mcp.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, '{"mcpServers":{}}');
  return f;
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

export async function writeScript(prompt, format = '9:16', style = null) {
  const agent = needAgent();
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const [tid, sid] = String(style || '').split('/');
  const tool = c.tools.find((t) => t.id === tid), st = tool?.styles.find((s) => s.id === sid);
  if (!st) throw new Error('Pick a style on the left first');
  const styleName = st.name === tool.name ? tool.name : `${st.name} (${tool.name})`;
  const base = (prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'video');
  let slug = base, k = 2; while (fs.existsSync(pfile(slug))) slug = `${base}-${k++}`;
  save({ slug, title: prompt.slice(0, 60), idea: prompt, style, styleName, format, voice: { engine: 'kokoro', voice: 'none', on: false }, music: 'lofi', status: 'writing-script', scenes: [], notes: [], log: [{ at: now(), text: `${agent.label} is writing the script in ${styleName}…` }], final: null, createdAt: now() });
  const system = 'You are a short-form video director. You turn an idea into a script told scene by scene, second by second, and pick the best available animation tool for each scene. Return only the JSON requested.';
  const input = `The user's idea:\n"""${prompt}"""\n\nFormat: ${format}.\n\nThe user chose ONE style for the whole video: ${styleName}, tool id "${style}". About it: ${tool.what}\nEvery scene uses this style and only this style. Design every scene for what this style does well.\n\nWrite the video:
- title (short), slug (lowercase-with-hyphens), music (lofi/ambient/upbeat/epic/none).
- scenes: one picture each, 2-6 s, contiguous from 0, total 20-45 s unless the idea asks for another length.
- visual: exactly what we see (subject, action, framing), concrete enough to animate.
- narration: what the voice says in that scene, at most 2.4 words per second of the scene ("" for a silent beat).
- onscreen: text burned into the picture ("" if none). sound: the sound moment.
- tool: always "${style}".`;
  (async () => {
    try {
      const r = await askAgent(agent, { prompt: input, system, schema: SCENE_SCHEMA, model: modelFor(agent.id, 'script'), cwd: ROOT, promptDir: path.join(PROJECTS, slug), emptyMcp: emptyMcp() });
      const d = r.parsed || extractJson(r.text);
      if (!d || !Array.isArray(d.scenes)) throw new Error(`${agent.label} returned no scene JSON`);
      update(slug, (p) => { p.title = d.title; p.format = d.format || format; p.music = d.music || 'lofi'; p.scenes = d.scenes.map((s, i) => ({ ...s, tool: style, n: i + 1, notes: '' })); p.status = 'script-ready'; p.log.push({ at: now(), text: `Script ready: ${d.scenes.length} scenes. Edit anything, then validate to generate the video.` }); });
    } catch (e) { update(slug, (p) => { p.status = 'error'; p.log.push({ at: now(), text: 'Script failed: ' + e.message }); }); }
  })();
  return slug;
}

const SUGGEST_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['suggestions'],
  properties: {
    suggestions: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['tool', 'style', 'why'],
      properties: { tool: { type: 'string' }, style: { type: 'string' }, why: { type: 'string' } } } },
  },
};

// The "suggest the style" switch: the agent reads the idea and proposes a few catalogue styles to pick from.
export async function suggestStyles(prompt, format = '9:16') {
  const agent = needAgent();
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const list = [];
  for (const t of c.tools) for (const s of t.styles)
    list.push(`${t.id}/${s.id} — ${s.name === t.name ? t.name : `${s.name} (${t.name})`} · ${t.what || ''} · ${t.speed || ''}`);
  const system = 'You are a video style director. Given a video idea, recommend the best-matching animation styles from a fixed catalogue. Return only the JSON requested.';
  const input = `The user's idea:\n"""${prompt}"""\nFormat: ${format}.\n\nCatalogue (tool/style — name · about · speed):\n${list.join('\n')}\n\nRecommend the 3 styles that fit this idea best — mix one safe pick with bolder ones. For each: tool (id before /), style (id after /), why (one short sentence for the user).`;
  const r = await askAgent(agent, { prompt: input, system, schema: SUGGEST_SCHEMA, model: modelFor(agent.id, 'script'), cwd: ROOT, promptDir: ROOT, emptyMcp: emptyMcp() });
  const d = r.parsed || extractJson(r.text);
  const out = [];
  for (const s of d?.suggestions || []) {
    const t = c.tools.find((t) => t.id === s.tool), st = t?.styles.find((x) => x.id === s.style);
    if (!st) continue;
    out.push({ tool: t.id, style: st.id, name: st.name === t.name ? t.name : `${st.name} (${t.name})`, why: String(s.why || '').slice(0, 200), example: st.example && fs.existsSync(path.join(ROOT, st.example)) ? st.example : null });
  }
  if (!out.length) throw new Error(`${agent.label} suggested no usable styles`);
  return out;
}

export function buildProject(slug) {
  const agent = needAgent();
  if (running.has(slug)) return;
  update(slug, (p) => { p.status = 'building'; p.final = null; p.savedPath = null; p.scenes.forEach((s) => { delete s.clip; s.status = 'pending'; }); p.log.push({ at: now(), text: `${agent.label} started building the video` }); });
  const skill = path.join(BUILD, '.claude', 'skills', 'video-studio', 'SKILL.md');
  const input = `Build the Video Studio project "${slug}". The user already validated its script: the scenes in ${pfile(slug)} are the contract (tool, timing, visual, narration, on-screen text, sound, notes).
Read ${skill} first (sections 4 "Build", "Tool notes" and "Rules") and ${path.join(ROOT, 'catalog.json')}, then build every scene, register each clip with node "${path.join(ROOT, 'vs.mjs')}" progress ${slug} "…" --scene N --clip clips/scene-NN.mp4, stitch with node "${path.join(ROOT, 'tools', 'stitch.mjs')}" ${slug}, check the result, and finish with node "${path.join(ROOT, 'vs.mjs')}" done ${slug} final.mp4. Report short progress lines with vs.mjs progress as you go. Work only inside ${path.join(PROJECTS, slug)} (copy templates from ${path.join(BUILD, 'demos')} there). Do not ask questions: decide and build.`;
  const dir = path.join(PROJECTS, slug);
  const { child, done } = runAgent(agent, {
    prompt: input, model: modelFor(agent.id, 'build'), cwd: BUILD, addDir: BUILD,
    promptDir: dir, emptyMcp: emptyMcp(),
    env: { TVHEAD_STUDIO: path.join(BUILD, 'studio'), HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' },
    onEvent: (() => {
      let lastLog = 0;
      return (ev) => {
        if (ev.type !== 'assistant') return;
        for (const c of ev.message?.content ?? []) {
          if (c.type === 'tool_use' && Date.now() - lastLog > 1500) {
            const i = c.input ?? {};
            const what = c.name === 'Bash' ? String(i.description || i.command || '').slice(0, 110) : `${c.name.toLowerCase()} ${path.basename(String(i.file_path || i.pattern || ''))}`;
            if (!/vs\.mjs/.test(what)) { logTo(slug, agent.label + ' · ' + what); lastLog = Date.now(); }
          }
        }
      };
    })(),
  });
  running.set(slug, child);
  done.then((r) => {
    running.delete(slug);
    const p = load(slug);
    if (p.status !== 'done') update(slug, (x) => {
      x.status = x.final ? 'done' : 'error';
      const tail = (r.stderr || r.stdout || '').trim().split('\n').filter(Boolean).pop();
      x.log.push({ at: now(), text: x.final ? 'Finished' : `${agent.label} stopped before the final video` + (r.code ? ` (exit ${r.code})` : '') + (tail ? `: ${tail.slice(0, 160)}` : '') });
    });
  }).catch((e) => { running.delete(slug); update(slug, (p) => { p.status = 'error'; p.log.push({ at: now(), text: 'Build failed: ' + e.message }); }); });
}

export function stopBuild(slug) {
  const c = running.get(slug); if (!c) return false;
  try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(c.pid), '/T', '/F']) : c.kill(); } catch {}
  running.delete(slug); update(slug, (p) => { p.status = 'script-ready'; p.log.push({ at: now(), text: 'Build stopped' }); });
  return true;
}
