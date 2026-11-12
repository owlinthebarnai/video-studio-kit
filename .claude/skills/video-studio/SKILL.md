---
name: video-studio
description: Make a video from an idea with every video tool installed in this build (animation styles, tvhead, animate, painted, kinetic, what-if, HyperFrames, Remotion, Blender clay/3D, motion-studio, lemo-opuscar…). Claude turns the idea into a script and a second-by-second scene table, opens the Video Studio UI where the user edits it and picks a style per scene (each tool has a 5-second example), then builds every scene with the chosen tool and stitches the final MP4 with free local music and, only if the user picks it, a Kokoro voice-over. Use for "/video-studio", "make a video about…", "turn this idea into a video", or when the user presses Build in the Video Studio UI.
---

# Video Studio

Paths: `BUILD` = the `AI Video generator` folder (this skill lives in `BUILD/.claude/skills/video-studio`). `VS` = `BUILD/video-studio`.
Everything is free and local: Claude (this session) writes and builds, the repos render, Kokoro speaks only when the user turns the voice-over on (it is off by default).

## 1. Open the studio
- Is the UI already up? `curl -s -o /dev/null -w "%{http_code}" http://localhost:4790/api/catalog`. If not, start it **in the background**: `node "$VS/vs.mjs" serve`.
- Read `$VS/catalog.json` once: every tool, its styles, status, speed and how to build with it (`build`), plus the example clip.

## 2. Idea → script → scenes (don't ask questions first)
From the user's idea, decide: title, format (default 9:16), length (default 30–45 s), and write the **scenes**:
- One scene = one picture, 2–6 s. Fields: `n`, `start`, `end` (seconds, contiguous from 0), `tool` (`<toolId>/<styleId>` from the catalog), `visual` (what we see, concrete), `narration` (≤ 2.4 words per second of the scene), `onscreen` (text burned in), `sound`, `notes` (empty: for the user).
- **Pick the tool per scene by what the picture needs** and keep one look unless the user wants a style change per beat (animation-styles is built for switching). Favour fast tools (tvhead, animation-styles 2D, HyperFrames, Remotion, kinetic) and warn in a note when a scene uses a slow one (Blender clay ≈ 6 min per second of video, lemo ≈ 30–60 min per film).
- Only tools in groups `makers` and `demo-only`; never `paid` ones.
Write it to a temp JSON `{ "title", "idea", "format", "voice": {"engine":"kokoro","voice":"none","on":false}, "music": "lofi", "scenes": [...] }`, then `node "$VS/vs.mjs" new <slug> <file>`.
Open it in the browser: `http://localhost:4790/?p=<slug>` (Windows: `start "" "<url>"`, macOS: `open "<url>"`; if the user has a preferred browser profile in their memory or CLAUDE.md, use that).
In chat: 3–5 lines (title, length, scenes, tools) and "edit anything in the studio, add notes, then press **Build**".

## 3. Wait for the user
Run `node "$VS/vs.mjs" wait <slug> --timeout 3600` **in the background**. When it returns:
- `event: "note"` → do what the notes ask (re-write scenes in the project file with `vs.mjs show` → edit → `vs.mjs new <slug> <file>` keeps the slug; keep the user's own edits), answer with `node vs.mjs reply <slug> "…"`, wait again.
- `event: "build"` → the project JSON in the output is the final word: the user's edits win over your first draft. Build it (section 4).

## 4. Build
For every scene, in order (report each with `node vs.mjs progress <slug> "scene N: …" --scene N`):
1. Make a clip of exactly `end - start` seconds in the scene's tool/style, at the project's format, **silent** (music, and a voice-over only if the user picked one in the studio, are added at the end). Put it in `VS/projects/<slug>/clips/scene-NN.mp4` and register it: `vs.mjs progress <slug> "scene N rendered" --scene N --clip clips/scene-NN.mp4`.
2. Use the tool's working setup in `BUILD/demos/…` (see `catalog.json` → `build`, and the notes below) as the template: copy it to `VS/projects/<slug>/work/<tool>-<n>/`, never edit the demo in place.
3. Check before moving on: `ffmpeg -i clip -vf "fps=2,scale=200:-2,tile=8x1" -frames:v 1 sheet.jpg`, then Read it. Does it show the scene's `visual`? Any blank frames, zoom flashes, cut-off subjects? Fix once.
Keep the subject identical across scenes (same character, colours) when it is the same story.
When all scenes are done: `node "$VS/tools/stitch.mjs" <slug> [--music lofi|ambient|upbeat|epic|none]` → `projects/<slug>/final.mp4`. Watch it as a contact sheet (1 frame per second) and fix real problems, then `node vs.mjs done <slug> final.mp4` and `vs.mjs reply` a 2-line summary (length, tools, anything you couldn't do). Tell the user to listen once: Claude can't hear the mix.

## Tool notes (learned on this PC: Windows, Intel GPU, user name with "Á")
- **animation-styles** (`demos/animation-styles`): one beat per scene in `story.json`; new subjects = new draw functions like `lib/fire.js` / `lib/fire3d.js`, used by every style. 3D looks ≈ 2–7 s/frame.
- **tvhead** (`studio/`): story.json in `studio/episodes/<slug>/`. Always top-level `"transition": "cut"`, `"flips": false`, scene `"cam": "still"`, cast `"enter": "none"` (the defaults read as zoom flashes). Standing props need `"y": 615`. Kokoro is the voice (patched in `studio/lib/voice.mjs`; re-apply `studio/tts/patch_voice.py` after tvhead's bootstrap). For a silent clip use `--offline` or mute it.
- **animate**: pieces in `demos/animate/pieces/<name>`; `node .claude/skills/animate/tools/build.mjs`, `still.mjs`, `export.mjs --share`.
- **painted**: `demos/painted` (copy, don't use its rsync scaffold); 16:9; 1–4 s/frame.
- **kinetic**: `demos/kinetic`; cue names in `reel/cues.js` must match `music/score.mjs`; 16:9.
- **what-if**: `demos/whatif/src/episodes/<slug>`; register in `episodes/index.ts`; Remotion render.
- **hyperframes**: `demos/hyperframes-fire` as template; always `export HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1`; `npx hyperframes@0.9.33 check`, `snapshot --at`, `render --output`.
- **remotion / cartoon3d / motion-studio**: set `TEMP`/`TMP` to `BUILD/tmp-remotion` and `--gl=angle`. cartoon-3d only renders with `--props='{"post":{"off":true}}'` here. motion-studio needs `TVHEAD_STUDIO=BUILD/studio`; its styles cue animations on spoken words (`W(scene, line, word)`), so the script must contain those words.
- **Blender clay** (`demos/claymation/scenes`): use `plocal()` for parenting, even video sizes (406 not 405), 720×406 / 28 samples ≈ 30 s per frame.
- **lemo-opuscar**: `LEMO_OPUSCAR_HOME=BUILD/repos/lemomo-ai_lemo-opuscar`, follow its `AGENTS.md`; budget 30–60 min.
- Python with this user's path: espeak/Kokoro need ASCII paths (handled in `studio/tts/speak.py`).
- Disk C: is nearly full: clean `BUILD/tmp-remotion` after big Remotion renders.

## Rules
- The user's scene table is the contract: build what it says; if something can't be done with the chosen tool, say so in a note and use the closest tool rather than silently changing the story.
- Never copy a real film's characters, logos or footage; styles are looks, stories are the user's.
- Report honestly: what rendered, what was approximated, what failed.
