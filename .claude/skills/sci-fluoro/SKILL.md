---
name: sci-fluoro
description: Makes science-explainer videos that look like confocal / fluorescence microscopy footage - glowing channel-coloured structures (cyan, magenta, yellow, green) on pure black, additive light, bloom, sensor grain, monospace instrument read-outs, and focus pulls between beats. Use it for any "under the microscope" explainer (biology, chemistry, materials, everyday phenomena seen at cell or molecule scale) rendered as a Canvas 2D frame page with video-studio/tools/page-render.mjs.
---

# sci-fluoro: science under the microscope

Original style. The whole video plays as if you're watching a live fluorescence microscope. Each idea is a
**specimen** lit in one channel, and labels read like instrument read-outs. The feel is beautiful, quiet and
a little mysterious. It doesn't copy any studio, channel or product branding.

Files: `engine/` (ES modules, no build), `examples/fire/` (reference scene: index.html + scene.js + engine copy).

## Style bible

### Palette (only these)
| role | hex | use |
|---|---|---|
| background | `#000000` | always pure black. Light is only ever **added** |
| CH1 405nm cyan | `#38E8FF` | oxygen / air / water / "cold" things, O atoms |
| CH2 488nm green | `#5CFF8A` | structure: cell walls, fibres, fuel, H atoms |
| CH3 561nm yellow | `#FFD24A` | carbon, soot, sparks, hot puncta, C atoms |
| CH4 640nm magenta | `#FF3FD0` | energy, heat, signalling, the "active" thing |
| white (not a channel) | `#DCEBFF` | bonds and faint structure only |
| HUD text / dim / rule | `#D6DEE6` / `#7C8894` / `#4A545E` | overlay type and leaders |

- Give every concept **one channel for the whole video**, and print that mapping in the channel list (top right).
- White only shows up where channels overlap (that's what additive blending does). Never paint white fills.
- At most 3 channels should be dominant in a frame. A 4th can be a few puncta.

### Line weights (at 1080p)
- Glow line (`glowStroke`): hot core **2.5 px**, halo **14 px** (two passes, 9 % and 26 % alpha).
- Rings / membranes: core **4 px**, halo **26 px**. Thin detail (heat shimmer, scratches): core 1.5–2 px.
- HUD leaders and reticles: **2 px** `#7C8894`. Scale bar: **6 px** solid `#F2F6FA`.
- Nothing has a hard outline. Every edge is light that falls off.

### Type
- **Consolas** for every read-out: channel ids (`CH1 405nm`), tags, timecode, Z depth, formulas.
  Tag titles 30 px bold, sub-lines 24 px in the channel colour. **24 px minimum** (12 px at 960x540).
- **Bahnschrift Light** (300), caps, +4 tracking, 46 px: beat titles only (top left).
- Formulas go through `chem()`, which handles real subscripts and a drawn arrow: `'CH4 + 2 O2 -> CO2 + 2 H2O'`.
- All text lives in the **HUD pass** (crisp, never bloomed or defocused). Text is never in the world layers.

### Motion and timing
- Slow. Things **bloom in** (0.5–0.7 s fade/draw-on with outSine), drift and breathe. They never pop or bounce.
  There's no overshoot easing in this engine on purpose.
- Everything alive keeps moving a little: outlines wobble (`wobblePts`, amp 0.03 rings … 0.15 blobs),
  particles drift on noise, molecules vibrate (`vib` px, higher when hot).
- Stagger groups 0.15–0.2 s. Tags appear 0.1–0.3 s after their subject: the reticle and leader grow first, then the text fades in.
- **Beat transitions are focus pulls**: blur peaks at ~14 px exactly on the beat boundary
  (`focusTrack([{ at, peak: 14 }])`, 0.3 s rise / 0.4 s fall). Outgoing content fades during the rise and
  incoming content starts during the fall. The intro racks in from 10 px over 0.6 s. Never use hard cuts or wipes.
- Each beat gets 1.5–2 s and one idea. The last ~0.5 s of a beat holds still enough to read.

### Camera
- `driftCam`: the slide floats (±9 px noise drift) plus a slow push-in of ≤ 3.5 % over the whole video.
  bg layer parallax 0.45. No rotations, no fast moves, no zoom punches.
- Change magnification between beats through the HUD (scale bar label + objective), not through camera zooms.
  E.g. `200 µm / 10x`, then `1 mm / 4x`, then `1 nm / 100x oil`. The mismatch is part of the charm.

### Composition (1920x1080 logical)
- Margins 96 px. HUD corners: beat caption top left (index `01 / 03`, title, one mono sub line); channel
  list top right; scale bar + objective bottom left; `Z +12.4 µm` and `T+00:01.50` bottom right.
- The specimen sits in the central ~1300x700 area (x 300–1620, y 240–880). The whole subject stays in frame.
- Tags: a reticle ring on the subject, a thin leader, and text outside the subject. Keep tags clear of the HUD corners.
- Leave black. Black space is the mystery: about 40 % of the frame should be near-black.

### Never
- Never use backgrounds other than `#000`, gradients-as-backgrounds, or paper/flat fills.
- Never use source-over opaque fills in the world: everything is additive, translucent light.
- Never use perfect geometric circles or straight rules for specimens. Use `wobblePts`, `tube`, `cell`.
- Never put text inside the world layers, use text below 24 px, or use fonts that aren't on Windows.
- Never use `Math.random()`, `Date.now()`, or state carried between frames. Everything is f(t, seed).
- Never use pop/bounce easing, hard cuts, or fast camera moves. Never put more than ~6 labels on screen.
- Never imitate real lab-software UIs, brand logos, or a real channel's look.

## How to build a scene

1. **Script 3 beats** (one idea each, ~1.5–2 s). For each beat, write the specimen (what you'd "see under the
   microscope"), its channel mapping, the scale/objective, and one caption + sub line in English.
2. **Copy the reference**: copy `examples/fire/` to the new frame-page folder, including its `engine/` copy.
   The page is served with its own folder as web root, so import `./engine/index.js`. Never use `../`.
3. **Timeline** in `scene.js`:
   `const BT = beats({ a: [0, 1.5], b: [1.5, 3], c: [3, 5] })`,
   `const focus = focusTrack([{ at: 1.5, peak: 14 }, { at: 3, peak: 14 }])`, `const cam = driftCam({ dur })`.
   Write small pure functions of `t` per element (`heat(t)`, `ringIn(t, i)`, …) with `seg`, `lin`, `stag`, `env`, `smooth`.
4. **draw(L, t)**: put the out-of-focus depth in `L.bg` (quarter res, already blurry): `haze()` + `bokeh()`.
   Put specimens in `L.main` with the primitives:
   - `tube(ctx, x0,y0,x1,y1, width, ch, {septa, wob, pits, p})`: fibres, plant cells, vessels, axons
   - `cell(ctx, x,y,r, ch, {nucleus, puncta, p})`, `blob(...)`, `ring(ctx,x,y,r,ch,{p})`, `wobblePts` + `glowStroke` / `glowFill`
   - `dot(ctx,x,y,r,ch,a,'soft'|'core')` (sprite light, cheap: use hundreds), `embers`, `swarm`, `flame`
   - `molecule(ctx, 'CH4'|'O2'|'CO2'|'H2O'|'N2', x,y,t,{s,a,rot,vib})`. Add shapes to `MOL` in science.js
   - `flow(ctx, pts, t, ch)` / `glowArrow(...)` for transport. Light moves along a path.
   - `group(ctx, {x,y,rot,s,a}, fn)` / `withAlpha(ctx, a, fn)` for transforms and fades. Clip with `ctx.save/clip`.
5. **hud(ctx, t)**: `hudFrame(ctx, t, { channels: [[ch, NAME, on]], scale: [160, '200 µm'], objective, z })`,
   `caption(ctx, t, BT, [{title, sub}])`, `tag(ctx, ax,ay, lx,ly, 'TITLE', {sub, ch, p, align})`,
   `chem(ctx, formula, x, y, {align:'center', p})`, `chLabel`, `mono`. HUD positions are in stage space,
   so for tags on moving things, compute the same position function you use in draw.
6. **Boot**: `F.boot({ dur, draw, hud, post: { focus, cam } })`. Optional post: `bloom` (0.85), `bloomR` ([18,64] px),
   `fringe` (0.22), `grain` (1), `vignette` (0.62). `boot` sets `window.DUR`, `window.render(t)` and `window.READY`
   (after fonts load).
7. **Stills first**, then video:
   ```
   node "<repo>/video-studio/tools/page-render.mjs" "<page dir>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<page dir>/stills"
   node "<repo>/video-studio/tools/page-render.mjs" "<page dir>" --out "<out>.mp4" --size 1920x1080 --fps 30
   ffmpeg -y -i "<out>.mp4" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 "<page dir>/sheet.jpg"
   ```
   Quote every path (the user folder contains "Á"). On the Iris Xe, a 5 s 1080p30 render takes ~27 s.
   The mp4 comes out `yuvj420p`. If a deliverable must be `yuv420p`, re-encode with
   `-vf scale=in_range=pc:out_range=tv,format=yuv420p`.
8. If you're writing under `.claude/skills/`, the Write tool may prompt. Stage files elsewhere and `cp` them over.

### Performance budget (≈4 GB RAM free, Intel iGPU)
- One page, Canvas 2D only (three.js isn't needed for this look). Main canvas full res; bg, bloom and fringe at 1/4; defocus at 1/2.
- Prefer `dot()` sprites over gradients. Keep `glowStroke` calls under ~400 per frame, and each `tube` is ~3 + septa strokes.
- `ctx.filter` is only used inside the post chain at reduced resolution. Don't add your own filters in draw.

## Checks (read every still before rendering)
- [ ] Background is truly black between structures, with no grey wash. Bloom hasn't flattened the frame into fog.
- [ ] Colours read as channels: each concept has one channel, and the HUD channel list matches what's on screen.
- [ ] Hot spots go white only where light overlaps. No large blown-out white blobs: lower `dot` alphas if so.
- [ ] Shapes are organic (wobble, uneven septa). Nothing looks like vector clip-art or a perfect circle.
- [ ] Every label is ≥ 24 px, in English, crisp, and clear of the subject and the HUD corners. Tags at the still times
      have finished fading in (check `p` timings: text appears in the last 65 % of a tag's `p`).
- [ ] Still times land on readable holds, not mid focus pull. Each beat's main subject is fully in frame.
- [ ] Scale bar, objective, Z and timecode are present and change between beats where magnification changes.
- [ ] Grain and fringe are subtle (visible at 100 %, invisible at thumbnail). Nothing flickers frame to frame except grain.
- [ ] The contact sheet shows three distinct beats joined by soft defocus frames (no hard cuts) and nothing broken.
