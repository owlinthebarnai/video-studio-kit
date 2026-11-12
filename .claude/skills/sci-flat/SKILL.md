---
name: sci-flat
description: Makes calm, precise 2D science-explainer videos in a flat vector "modern textbook diagram" style (navy ink on off-white paper, three accents, uniform rounded strokes, leader-line labels, numbered callouts, elements that draw on and pop in). Use it for any "how X works", "the science of X", process, cycle, reaction, anatomy or cause-and-effect explainer that should look like an editorial diagram rather than a cartoon or a 3D render.
---

# Science explainer: flat vector diagram

A modern textbook / editorial science diagram that builds itself on screen. Flat shapes, one soft paper
background, deep navy ink, three accents, uniform round strokes, clean sans labels on leader lines.
Calm and precise: every element arrives for a reason, then sits still and is read.

Output is a **frame page** rendered by `video-studio/tools/page-render.mjs`: `index.html` loads `scene.js`, which
calls the engine's `boot()`; that sets `window.DUR`, `window.render(t)` (Canvas 2D, deterministic) and
`window.READY = true`. Worked example: `examples/fire/` ("the science of fire", 5 s, 3 beats). Copy it to start.

## Style bible

**Palette** (`engine/palette.js` → `PAL`; never invent a hex in a scene):

| role | key | hex | use |
|---|---|---|---|
| ink | `ink` | `#16213E` | every outline, text, axis, bond, arrow |
| ink soft | `inkSoft` | `#4A5570` | sub-labels, kicker, dust |
| muted | `muted` | `#8B93A7` | inactive things only |
| rule | `rule` | `#CFC8B8` | grid, hairlines, inactive progress |
| paper | `paper` → `paperEdge` | `#F5F1E8` → `#E7E0D0` | background (the ONE gradient, radial) |
| tint | `tint` | `#E8DCC2` | neutral object fill (wood, containers, panels) |
| white | `white` | `#FFFDF8` | highlights, H atoms, text on accents |
| accent 1 | `coral` | `#E4572E` | heat / energy / the main idea |
| accent 2 | `amber` | `#F3A712` | fuel / light / secondary process |
| accent 3 | `teal` | `#1F9E89` | air / water / cool / products |
| accent tints | `coralT` `amberT` `tealT` | | flat backing shapes only |

Give each accent ONE meaning per video and keep it (in fire: coral = heat/energy, amber = fuel, teal = oxygen).
Large areas are paper or tint; accents cover < 15 % of the frame.

**Lines** (`LW`, px at 1080p, always round cap + round join): main outline 6, secondary 4 (icons, axes, bonds,
brackets), leader 3, hairline 2 (grain, rules), grid 1.25. No hairline outlines on big shapes, no mixed weights
on one object, no tapered or sketchy strokes.

**Type** (`TYPE`, Windows system fonts, no webfonts): Bahnschrift for labels, numbers, formulas (600, track 1-3
for CAPS); Segoe UI for titles (600) and sub-labels (400). Sizes at 1080p: title 46, label 34, body 28,
small 26, **minimum 24** (must stay legible at 960x540). Labels CAPS, sub-labels sentence case, ≤ 4 words.
Formulas via `formula()` (auto subscripts: `'2H2O'`).

**Labels**: `callout()` = dot on the subject → diagonal leader → short horizontal → optional numbered badge →
label + sub. Leaders never cross text; they may cross a shape. Numbered round badges for callouts; the
chapter marker in `header()` is a rounded square `01 02 03` so the two never get confused.

**Motion** (`T` in `engine/timeline.js`; these durations are the style):
- draw-on stroke 0.4-0.5 s `inOutCubic` (`line(pts, p)`, `shape()` = outline first, fill fades in after)
- pop-in 0.35 s with slight overshoot (`pop()`, outBack s=1.4, ~7 %) for nodes, badges, atoms, pills
- arrows grow 0.4-0.45 s `outCubic` from tail to head (`arrow()`), head scales in with it
- labels 0.35 s: leader draws, then text fades + slides 12 px from the leader side
- stagger siblings 0.06-0.12 s; group moves 0.55 s `inOutCubic`; exits 0.3 s (`popOut`, inCubic, shrink to 85 %)
- ambient motion only where physics says so (flame flicker, heat waves, rubbing) and seeded (`noise1`, `rng`)
- one new idea every 0.3-0.5 s at most; every beat ends with ≥ 0.4 s where nothing new arrives

**Camera**: static diagram; a slow push-in only (`camera()`, ≤ 3 % per shot, `inOutSine`). No rotation, shake,
whip pans or depth of field. Re-layout by moving/scaling groups (`group()`), not by moving the camera.

**Composition**: 1920x1080 logical (use `boot({ w:1080, h:1920 })` for vertical and recompose). Header band
y < 150 (chapter marker + title left, kicker + progress segments right). Margins ≥ 70 px. Subject centred
while it is the only idea; when a second panel arrives, slide the first to the left third (scale ~0.8) and
build the new one on the right. Max ~12 labelled things on screen. Thin grid only behind graphs/measurements.

**Never**: gradients other than the paper background; drop shadows, blur, glow (use `halo()` flat discs),
bevels, 3D, textures beyond the fixed paper grain; outlines in any colour other than ink; more than three
accents; emoji, clip-art, mascots or faces; handwritten or decorative fonts; text under 24 px; random motion,
`Math.random()` or `Date.now()`; bouncy springs on everything; anything copied from a real channel's or
studio's branding, characters or title cards (this is an original look).

## Engine (`engine/`, plain ES modules, `import * as F from './engine/index.js'`)

- `palette.js` `PAL LW TYPE FONTS ACCENTS`
- `ease.js` `clamp lerp invLerp E.{linear,inCubic,outCubic,inOutCubic,outQuint,inOutSine,outBack} rng(seed) noise1(seed) TAU`
- `timeline.js` `T seg(t,a,d,ease) lin(t,a,d) stag(t,a,i,each,d) env(t,a,b) beats({name:[a,b]})`
- `shapes.js` point lists `arcPts circlePts bezPts quadPts wavePts rrectPts partial polyLen`; drawing `line shape circle rrect poly halo`; transforms `pop popOut group withAlpha`
- `arrows.js` `arrow(pts,p) arrowAB curveArrow(a,b,bend,p) arcArrow`
- `labels.js` `text measure badge callout formula pill`
- `textures.js` `paper grid dotGrid hatch grainLines particles`
- `science.js` `atom bond molecule MOL.{CH4,O2,CO2,H2O,N2} EL flame heatWaves`
- `core.js` `boot({dur,w,h,setup,draw}) camera(ctx,t,dur,opts,fn) header(ctx,t,beats,titles,{kicker})`

Progress arguments: `pop`, `callout`, `molecule`, `arrow`, `badge`, `pill` take **linear** p (`lin()`/`stag()`)
and ease inside; `line`/`shape` take already-eased p (`seg()`).

## How to build a scene

1. **Copy** `examples/fire/` to a new folder (e.g. `video-studio/pages/<topic>/`). It already contains
   `engine/`; if you change the skill engine later, re-copy it (`cp -r`, never symlink: the folder is the web root).
2. **Script the beats** on paper first: 2-4 beats, each = one sentence title (≤ 6 words) + one diagram idea.
   Write `const BT = beats({...})` and `TITLES`. 5 s → 1.5 / 1.5 / 2 s; longer videos ~3-5 s per beat.
3. **Assign the accents** (one meaning each) and write it as a comment at the top of `scene.js`.
4. **Lay out in logical px**: fix key coordinates as constants (contact points, triangle vertices, term x's).
   Sketch the final frame of every beat first; then decide where each element comes from.
5. **One function per element group** (`board(ctx,t)`, `graph(ctx,t)`, ...), each a pure function of t with its
   own appear/exit times. Wrap groups that move later in `group()` so earlier beats can re-layout.
6. **Build-on order**: container/subject outline → key shapes pop → arrows grow → labels → numbers/readouts.
   Exits: `popOut` 0.3 s, or keep the element and fade only its sub-labels when a group shrinks.
7. **Ambient life**: only physical motion, seeded (`noise1(seed)(t*k)`, `particles(n, seed)` positioned as f(t)).
8. `draw(ctx,t,{W,H})`: `paper()` → `camera(…, () => world(ctx,t))` → `header()` (header outside the camera).
9. **Stills**, read them, fix, repeat (≤ 3 rounds):
   `node "<repo>/video-studio/tools/page-render.mjs" "<page dir>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<page dir>/stills"`
   Pick still times at the *end* of each beat's build, plus one mid-motion.
10. **Render**: `... page-render.mjs "<page dir>" --out "<out>.mp4" --size 1920x1080 --fps 30` (≈ 10-20 s for
    150 frames: Canvas 2D is light). Contact sheet:
    `ffmpeg -y -i "<out>.mp4" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 "<dir>/sheet.jpg"`, read it.

Paths contain spaces and an "Á": always quote them. On this repo, the Write tool may prompt for `.claude/skills/…`;
stage files elsewhere and `cp` them in.

## Checks (in every still before rendering)

- [ ] Only PAL colours; background is the soft paper; no stray gradients, shadows or blur.
- [ ] Every outline is ink and the same weight family (6 / 4 / 3); caps and joins round.
- [ ] Every label ≥ 24 px, CAPS labels tracked, sub-labels sentence case; readable when the still is viewed at half size.
- [ ] Leader lines start with a dot on the subject, end in a short horizontal, never cross text.
- [ ] Nothing clipped: margins ≥ 70 px also after `camera()` push and `group()` re-layouts (check the last still).
- [ ] No overlaps between labels, readouts, axes and the header band (y < 150).
- [ ] Each accent keeps one meaning; accents cover a small part of the frame.
- [ ] Numbered callouts in reading order; chapter marker number matches the beat.
- [ ] Mid-motion still: overshoot is slight, half-drawn strokes look intentional, no element pops in at full size.
- [ ] Science is right (balanced equations, units with a space: `300 °C`, `21 %`), English everywhere.
- [ ] Last 0.4 s of each beat: nothing new arrives (the viewer can read).
- [ ] Contact sheet: whole subject in frame in every tile, the three beats are distinct, nothing flickers or breaks.
