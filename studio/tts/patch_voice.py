import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)


rep(
    """export function provider() {
  const forced = process.env.VOICE_PROVIDER;
  if (forced) return forced;
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.FISH_AUDIO_API_KEY) return 'fish';
  return null;
}""",
    """// [Viral Replicator patch] free local narration with Kokoro (studio/tts) when no key is set. Re-apply after bootstrap.sh.
const KOKORO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tts');
const KOKORO_PY = path.join(KOKORO_DIR, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const hasKokoro = () => existsSync(KOKORO_PY);
export const kokoroVoice = v => (/^[a-z]{2}_[a-z]+$/.test(v || '') ? v : process.env.TVHEAD_KOKORO_VOICE || 'am_michael');

export function provider() {
  const forced = process.env.VOICE_PROVIDER;
  if (forced) return forced;
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.FISH_AUDIO_API_KEY) return 'fish';
  if (hasKokoro()) return 'kokoro';
  return null;
}""",
)
rep(
    "import path from 'node:path';",
    "import path from 'node:path';\nimport { fileURLToPath } from 'node:url';",
)
rep(
    """async function tts(text, voice, model) {
  const p = provider();""",
    """async function tts(text, voice, model) {
  const p = provider();
  if (p === 'kokoro') {
    const tmp = path.join(KOKORO_DIR, `line-${process.pid}-${Math.random().toString(36).slice(2)}.mp3`);
    const r = spawnSync(KOKORO_PY, [path.join(KOKORO_DIR, 'speak.py'), tmp, kokoroVoice(voice), process.env.TVHEAD_KOKORO_SPEED || '1.05'], { input: text, windowsHide: true });
    if (r.status !== 0 || !existsSync(tmp)) throw new Error(`kokoro tts failed: ${String(r.stderr || '').slice(-300)}`);
    const buf = readFileSync(tmp);
    try { unlinkSync(tmp); } catch {}
    return buf;
  }""",
)
rep(
    "import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';",
    "import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';",
)
rep(
    "    const id = createHash('sha1').update(`${model}\\n${voice}\\n${text}`).digest('hex').slice(0, 14);",
    "    const kk = prov === 'kokoro';\n    const id = createHash('sha1').update(`${kk ? 'kokoro' : model}\\n${kk ? kokoroVoice(voice) : voice}\\n${text}`).digest('hex').slice(0, 14);",
)
rep(
    "  if (estimated) console.warn",
    "  if (prov === 'kokoro' && generated) console.log(`voice[${lang}]: ${generated} line(s) voiced locally with Kokoro (${kokoroVoice(voice)})`);\n  if (estimated) console.warn",
)
open(p, "w", encoding="utf-8").write(s)
print("patched")
