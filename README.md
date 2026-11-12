# Video Studio kit

Make short animated videos from a prompt, on your own computer, with your own Claude subscription.

You get:
- **Video Studio**, a local web app. Pick a style from more than 100 (each has a 5-second example), write a prompt, and Claude writes a second-by-second script. Edit it, choose music and an optional voice-over, validate, and Claude Code builds the video.
- **50+ Claude Code skills** for video: tvhead stickman explainers, lemo-opuscar's 66 film styles, HyperFrames, Remotion, kinetic type, painted watercolour, cut paper, what-if stick figures, motion-studio anime and reels, cartoon cards in 3D, story-video survival HUD, Blender clay and toon, exploded product views and four science-explainer styles (flat diagram, fluorescence microscopy, 3D molecular, lab notebook).
- A free local voice (Kokoro) and generated music. **No API keys.**

All the example clips tell the same story, *the discovery of fire*, so you can compare styles.

## Requirements

| | |
|---|---|
| [Claude Code](https://claude.com/claude-code), logged in with your Claude plan (Pro or Max) | writes the scripts and builds the videos |
| Node.js 20+ and git | |
| Python 3.10+ | for the local voice |
| ffmpeg on your PATH | Windows: `winget install Gyan.FFmpeg` · macOS: `brew install ffmpeg` |
| Blender 4.2+ (optional) | only for the Blender clay / toon styles. Set `BLENDER` to its path. |
| ~3 GB of free disk space | dependencies, the voice model and renders |

Tested on Windows 11. macOS and Linux should work but are untested.

## Install

```sh
git clone <this repo> video-studio-kit
cd video-studio-kit
node setup.mjs          # add --all to also fetch every optional source repo
```

The setup script does the following:
1. Checks the requirements.
2. Clones the third-party repos it needs at pinned versions.
3. Installs the Remotion skills from their own repo.
4. Installs the Node dependencies and a headless browser.
5. Downloads the Kokoro voice (about 340 MB).

You can run it again safely.

## Use

**In the app.** On Windows, double-click `Start Video Studio.cmd`. On macOS or Linux, run `sh start-studio.sh`. It opens http://localhost:4790.
1. Pick a style on the left. The viewer plays its example.
2. Write your prompt and press **Write the script**. The whole video uses the style you picked.
3. Edit the script table: times, what we see, narration, on-screen text, sound, notes.
4. Choose the voice-over (off by default) and the music.
5. Press **Validate script & generate video**. Claude Code renders each scene and stitches them. When it finishes, the video opens in a window with **Open folder** and **Save a copy**. Finished videos are also copied to `outputs/`.

**In Claude Code.** Open a terminal in this folder, run `claude`, then type `/video-studio a 30-second story about …`.

## How it uses your subscription

Writing a script is one short Claude Code call. Building a video runs Claude Code headless (`claude -p`) in this folder with file and shell tools: it reads the style's skill, writes the scene code, renders and checks frames. That uses your plan's usage like a long conversation does, and depends on the style and length. Nothing is billed separately, and nothing is sent anywhere except to Claude through Claude Code.

## Speed (Intel laptop GPU)

| Style family | 5 s of video |
|---|---|
| Fast: tvhead, HyperFrames, Remotion, kinetic, science, exploded view | about 1 to 3 min |
| Medium: painted, lemo films, motion-studio | about 3 to 10 min |
| Slow: Blender clay (Cycles) | about 30 min |

## Folders

| Folder | What's in it |
|---|---|
| `video-studio/` | the app (`vs.mjs` server, `agent.mjs` Claude runner, `ui/`, `catalog.json`, `tools/`, `examples/`) |
| `.claude/skills/` | the skills, including `video-studio`, the orchestrator |
| `studio/` | the tvhead engine, with the Kokoro voice patch |
| `demos/` | the working setup of each tool that the build recipes start from |
| `repos/` | third-party sources, cloned by setup (not in git) |
| `overlays/` | our additions to those sources, applied by setup |
| `outputs/` | your finished videos (not in git) |

## Licences

Third-party code keeps its own licence; see [THIRD_PARTY.md](THIRD_PARTY.md). Remotion's skills are downloaded from their repo at setup and not redistributed here.
