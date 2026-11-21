# Video Studio kit — agent notes

Make short animated videos from a prompt, locally. Any supported agent CLI can drive it:
**claude** (Claude Code), **devin**, **gemini** (Gemini CLI), **codex**.

## Agent selection

All headless agent calls go through `video-studio/agent-cli.mjs` (a copy lives in
`studio/app/agent-cli.mjs` for the tvhead app). Pick a CLI with `VS_AGENT`
(`claude|devin|gemini|codex`); without it the first installed wins, in that order.
Per-kind model overrides: `VS_SCRIPT_MODEL`, `VS_BUILD_MODEL`. Devin's permission
mode for builds: `VS_PERMISSION_MODE` (default `dangerous`).

## What runs where

- `node video-studio/vs.mjs serve` → Video Studio UI on http://localhost:4790
  (Windows: `Start Video Studio.cmd`, macOS/Linux: `start-studio.sh`).
  `vs.mjs` subcommands (`wait`, `progress`, `done`, `reply`, `new`, `show`) are the
  file-based protocol between an interactive agent session and the app — they are
  agent-agnostic, keep them that way.
- `node studio/app/launch.mjs` → tvhead studio app on http://localhost:4777.
  `studio/app/bridge.mjs` (`status`, `wait`, `claim`, `storyboard`, `render`, `fail`)
  is the same kind of file protocol for storyboard jobs.

## Conventions

- Never hard-code an agent binary outside `agent-cli.mjs` — new agent-driven
  scripts import `pick`/`modelFor`/`askAgent`/`runAgent`/`extractJson` from it.
- The skills live in `.claude/skills/` (the name is historical; the format is
  readable by all supported CLIs).
- Telemetry stays off: `HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1` on spawned runs.
- `VS_MANUAL=1` in `vs.mjs serve` means an interactive session builds via `vs.mjs wait`.

## Verify changes

`node --check` every edited `.mjs`; then `node video-studio/vs.mjs serve` and
`node studio/app/launch.mjs` should both start their servers without errors.
