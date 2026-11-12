# Video Studio kit

Make short animated videos from a prompt, on your own computer, with your own Claude subscription.

**▶ [Watch the 1-minute demo](docs/demo.mp4)**: pick a style, write a prompt, get a script, validate, generate.

You get:
- **Video Studio**, a local web app. Pick one of 109 styles (93 have a 5-second preview), write a prompt, and Claude writes a timed, scene-by-scene script. Edit it, choose music and an optional voice-over, validate, and Claude Code builds the video.
- **50+ Claude Code skills** for video: the ten Claude animation styles (pixel art, PS2, comic, brick toy, claymation, paper cutout, retro anime, low poly, risograph, miniature diorama), tvhead stickman explainers, lemo-opuscar's 66 film styles, HyperFrames, Remotion, kinetic type, painted watercolour, cut paper, what-if stick figures, motion-studio anime and reels, cartoon cards in 3D, story-video survival HUD, Blender clay and toon, exploded product views and four science-explainer styles (flat diagram, fluorescence microscopy, 3D molecular, lab notebook).
- A free local voice (Kokoro) and generated music. **No API keys.**

44 of the previews retell the same story, *the discovery of fire*, so you can compare styles side by side. The others show a clip of each style's own demo film.

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
3. Refreshes the Remotion skills from their own repo.
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

## Credits

This kit stands on the work of these open-source projects. Thank you to their authors.

- [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase): the painted watercolour engine (same as painted-animation)
- [Leonxlnx/earshot](https://github.com/Leonxlnx/earshot): earshot and real-sound: judging and building sound
- [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill): motion-design principles
- [morgsdoti/story-video-studio](https://github.com/morgsdoti/story-video-studio): story-video-studio: stickman survival story prompt
- [Vladic20/tvhead-studio](https://github.com/Vladic20/tvhead-studio): tvhead-video (15 story looks incl. stickman), motion-studio (anime, motion reel), blender-3d, ai-montage
- [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender): Blender MCP (Claude controls an open Blender)
- [angrypenguinpng/blender-claymation-skill](https://github.com/angrypenguinpng/blender-claymation-skill): blender-claymation: Cycles clay stop-motion
- [cth9191/animate](https://github.com/cth9191/animate): animate: one-canvas procedural pieces with a synth score
- [greensock/gsap-skills](https://github.com/greensock/gsap-skills): GSAP animation skills
- [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes): HyperFrames: HTML + GSAP to video, registry of blocks, media tools
- [kelano86/what-if-animation](https://github.com/kelano86/what-if-animation): what-if-animation stick-figure episodes
- [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar): lemo-opuscar: 66 short-film styles
- [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts): cartoon-3d-short: 2D cartoon cards in a 3D world
- [openai/whisper](https://github.com/openai/whisper): Whisper: word timings for captions
- [remotion-dev/skills](https://github.com/remotion-dev/skills): the Remotion skills (React video)
- [showheyohtaki/motion-prompt](https://github.com/showheyohtaki/motion-prompt): motion-prompt: library of 120 motion moves
- [tuzhechen2005/opus-video-skills](https://github.com/tuzhechen2005/opus-video-skills): kinetic-reel and painted-animation
- [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills): index of Claude video skills (where many of these were found)
- **claude-animation-styles** kit by [@ernestosoftware](https://x.com/ernestosoftware) on X: the ten Claude animation styles (pixel art, PS2, comic, brick toy, claymation, paper cutout, retro anime, low poly, risograph, miniature diorama)

Built on: [Claude Code](https://claude.com/claude-code), [Remotion](https://www.remotion.dev), [three.js](https://threejs.org), [GSAP](https://gsap.com), [Playwright](https://playwright.dev), [FFmpeg](https://ffmpeg.org), [Blender](https://www.blender.org), the [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) voice via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), and [Kenney](https://kenney.nl) CC0 3D models.

## Licences

Third-party code keeps its own licence; see [THIRD_PARTY.md](THIRD_PARTY.md). Remotion's skills are included as published in [remotion-dev/skills](https://github.com/remotion-dev/skills) (that repo has no licence file); Remotion itself has its own licence: https://www.remotion.dev/docs/license
