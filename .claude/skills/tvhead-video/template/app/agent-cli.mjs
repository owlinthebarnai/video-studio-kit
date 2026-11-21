// agent-cli.mjs — one place that knows how to drive each supported agent CLI non-interactively.
// Used by the Video Studio server (script writing + builds), the tvhead studio app and the preview tools.
//
// Pick a CLI with the VS_AGENT env var (claude | devin | gemini | codex). Without it, the first
// installed AND logged-in one is used, in this order: claude → devin → gemini → codex.
//
// Two modes:
//   askAgent(agent, {prompt, system, schema, model, cwd, env, promptDir}) → {text, parsed}
//     one-shot answer; `schema` asks for a JSON object (claude gets --json-schema, the others get
//     the schema appended to the prompt and the first balanced {...} is extracted from the output)
//   runAgent(agent, {prompt, model, cwd, env, promptDir, addDir, onEvent}) → {child, done}
//     an autonomous agent run with its tools auto-approved (what each CLI calls yolo/dangerous/full-access)
//
// Per-CLI notes:
//   claude  prompt on stdin, --output-format json / stream-json events, --allowedTools
//   devin   --prompt-file <file>, --permission-mode auto|dangerous, --respect-workspace-trust=false
//   gemini  prompt on stdin (piped stdin alone forces headless), --approval-mode yolo
//   codex   `codex exec -` reads the prompt from stdin, --sandbox read-only|danger-full-access
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const WIN = process.platform === 'win32';
export const ORDER = ['claude', 'devin', 'gemini', 'codex'];

export const SPECS = {
  claude: { label: 'Claude Code', bin: 'claude', models: { script: 'sonnet', build: 'opus' } },
  devin:  { label: 'Devin',       bin: 'devin',  models: { script: 'swe-2-medium', build: 'swe-2-max' } },
  gemini: { label: 'Gemini CLI',  bin: 'gemini', models: { script: null, build: null } },
  codex:  { label: 'Codex',       bin: 'codex',  models: { script: null, build: null } },
};

export const whichBin = (bin) => {
  try {
    const r = spawnSync(WIN ? 'where' : 'which', [bin], { encoding: 'utf8' });
    const p = (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    return !r.status && p ? p : null;
  } catch { return null; }
};

// Quick auth probes so auto-pick skips CLIs that are installed but not logged in.
// gemini has no reliable local probe — being installed counts as available.
const AUTH = {
  claude: { args: ['auth', 'status'], ok: /"loggedIn"\s*:\s*true/i },
  devin:  { args: ['auth', 'status'], ok: /logged in/i },
  codex:  { args: ['login', 'status'], ok: /logged in/i },
};
export function probeAuth(id, bin) {
  const spec = AUTH[id]; if (!spec) return !!bin;
  if (!bin) return false;
  try {
    const isShim = WIN && /\.(cmd|bat)$/i.test(bin);
    const r = spawnSync(isShim ? 'cmd.exe' : bin,
      isShim ? ['/d', '/s', '/c', q(bin), ...spec.args.map(q)] : spec.args,
      { encoding: 'utf8', timeout: 15000, windowsHide: true });
    return spec.ok.test(`${r.stdout || ''}\n${r.stderr || ''}`);
  } catch { return false; }
}

// Installed agent CLIs, in preference order (authed = its login probe passed).
export function detect() {
  return ORDER.map((id) => {
    const bin = whichBin(SPECS[id].bin);
    return { id, bin, label: SPECS[id].label, authed: probeAuth(id, bin) };
  }).filter((a) => a.bin);
}

// The CLI to use: VS_AGENT/AGENT_CLI env wins, else the first installed in ORDER —
// preferring one that is actually logged in. null when none found.
export function pick(env = process.env) {
  const want = String(env.VS_AGENT || env.AGENT_CLI || '').toLowerCase();
  if (want) {
    const s = SPECS[want];
    if (!s) throw new Error(`unknown agent CLI "${want}" (expected one of: ${ORDER.join(', ')})`);
    return { id: want, bin: whichBin(s.bin) || s.bin, label: s.label };
  }
  const found = detect();
  return found.find((a) => a.authed) || found[0] || null;
}

export const modelFor = (id, kind) => process.env[`VS_${kind.toUpperCase()}_MODEL`] ?? SPECS[id].models[kind];

// Extract the first balanced {...} that JSON.parses — CLI outputs differ (envelopes, banners, logs).
export function extractJson(text) {
  const s = String(text || '').trim();
  try { return JSON.parse(s); } catch {}
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue;
    let depth = 0, str = false, esc = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
      if (c === '"') str = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { try { return JSON.parse(s.slice(i, j + 1)); } catch { break; } }
    }
  }
  return null;
}

// npm-installed CLIs are .cmd/.bat shims on Windows and can only be spawned through cmd.exe.
// The args joined here are fixed flags and paths only — never free prompt text (that goes via stdin or a file).
const q = (a) => (/[\s"']/.test(a) ? `"${String(a).replace(/"/g, '')}"` : a);
// WSL interop: a Windows .exe spawned from Linux node receives POSIX args verbatim; /mnt/<drive>/...
// paths must be rewritten to their drive-letter form so the exe can open them.
const winPath = (p) => { const m = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(String(p)); return m ? `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, '\\')}` : p; };
function sh(bin, args, opts) {
  if (WIN && /\.(cmd|bat)$/i.test(bin)) return spawn('cmd.exe', ['/d', '/s', '/c', [q(bin), ...args.map(q)].join(' ')], opts);
  if (!WIN && /\.exe$/i.test(bin)) return spawn(bin, args.map(winPath), { ...opts, cwd: opts.cwd ? winPath(opts.cwd) : opts.cwd });
  return spawn(bin, args, opts);
}

function promptFile(prompt, dir) {
  const d = dir || os.tmpdir(); fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, `agent-prompt-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(f, prompt);
  return f;
}

// claude-only flags that keep runs lean: no session persistence, no MCP, no user settings/skills.
// `emptyMcp` is a path to a {"mcpServers":{}} file the caller may provide; otherwise we make one in tmp.
let tmpEmptyMcp = null;
function lean(emptyMcp) {
  if (!emptyMcp && !tmpEmptyMcp) {
    tmpEmptyMcp = path.join(os.tmpdir(), `agent-cli-empty-mcp-${process.pid}.json`);
    try { fs.writeFileSync(tmpEmptyMcp, '{"mcpServers":{}}'); } catch { tmpEmptyMcp = null; }
  }
  const mcp = emptyMcp || tmpEmptyMcp;
  return ['--no-session-persistence', ...(mcp ? ['--strict-mcp-config', '--mcp-config', mcp] : []), '--setting-sources', '', '--disable-slash-commands'];
}

function spawnArgs(id, mode, { model, system, schema, prompt, promptDir, emptyMcp, addDir }) {
  switch (id) {
    case 'devin': {
      const f = promptFile(prompt, promptDir);
      const pm = mode === 'chat' ? 'auto' : (process.env.VS_PERMISSION_MODE || 'dangerous');
      return { args: ['-p', ...(model ? ['--model', model] : []), '--permission-mode', pm, '--respect-workspace-trust=false', '--prompt-file', f],
        cleanup: () => fs.unlink(f, () => {}) };
    }
    case 'gemini': {
      const args = [...(model ? ['-m', model] : [])];
      if (mode !== 'chat') args.push('--approval-mode', 'yolo');
      return { args, stdin: prompt };
    }
    case 'codex': {
      const sb = mode === 'chat' ? 'read-only' : 'danger-full-access';
      return { args: ['exec', '--sandbox', sb, ...(model ? ['-m', model] : []), '-'], stdin: prompt };
    }
    default: { // claude
      const args = mode === 'chat'
        ? ['-p', ...(model ? ['--model', model] : []), '--output-format', 'json', '--tools', '',
          ...(system ? ['--system-prompt', system] : []), ...(schema ? ['--json-schema', JSON.stringify(schema)] : []), ...lean(emptyMcp)]
        : ['-p', ...(model ? ['--model', model] : []), '--output-format', 'stream-json', '--verbose',
          '--tools', 'Bash,Read,Write,Edit,Glob,Grep', '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep',
          ...(addDir ? ['--add-dir', addDir] : []), ...lean(emptyMcp)];
      return { args, stdin: prompt };
    }
  }
}

function run(id, bin, mode, o) {
  const { args, stdin, cleanup } = spawnArgs(id, mode, o);
  const child = sh(bin, args, { cwd: o.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...o.env } });
  let buf = '', out = '', err = '', result = null;
  const done = new Promise((resolve, reject) => {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      out += d; buf += d;
      if (id !== 'claude' || mode === 'chat') return; // event stream only exists for claude build runs
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
        try { const ev = JSON.parse(line); if (ev.type === 'result') result = ev; else o.onEvent?.(ev); } catch { /* not json */ }
      }
    });
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => reject(new Error(`could not start ${SPECS[id].label}: ${e.message}`)));
    child.on('close', (code) => {
      if (id === 'claude' && !result && buf.trim()) { try { result = JSON.parse(buf.trim()); } catch {} }
      if (cleanup) cleanup();
      resolve({ code, stdout: out, stderr: err, result });
    });
    if (stdin != null) { child.stdin.write(stdin); child.stdin.end(); } else child.stdin.end();
    o.onEvent?.({ type: '_spawned', child });
  });
  return { child, done };
}

// One-shot answer. Returns { text, parsed } — `parsed` is set when a `schema` was requested and
// a JSON object was found in the output (always set for claude, which returns a result envelope).
export async function askAgent(agent, o) {
  const schema = o.schema;
  const prompt = [o.system, o.prompt].filter(Boolean).join('\n\n')
    + (schema && agent.id !== 'claude' ? `\n\nReply with only a JSON object matching this schema:\n${JSON.stringify(schema)}` : '');
  const { done } = run(agent.id, agent.bin, 'chat', { ...o, prompt, schema });
  const r = await done;
  if (agent.id === 'claude') {
    if (!r.result) throw new Error('Claude Code stopped without a result. ' + r.stderr.slice(-400));
    if (r.result.is_error) throw new Error('Claude Code: ' + r.result.result);
    return { text: r.result.result, parsed: r.result.structured_output || extractJson(r.result.result) };
  }
  if (r.code !== 0) throw new Error(`${agent.label} exited ${r.code}: ${(r.stderr || r.stdout).slice(-400)}`);
  return { text: r.stdout, parsed: schema ? extractJson(r.stdout) : null };
}

// Autonomous agent run (build). The caller keeps `child` to be able to stop it.
export function runAgent(agent, o) {
  return run(agent.id, agent.bin, 'run', o);
}
