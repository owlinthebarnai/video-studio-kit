---
name: sci-notebook
description: Makes 2D science-explainer videos that look like a scientist's lab notebook being filled in live (cream graph paper, red margin, blue-black ink drawn stroke by stroke, handwritten labels, pencil hatching, arrows, circled notes, highlighter, hand-written equations). Use it for any "how X works" / "the science of X" explainer that should feel like ideas forming in real time rather than a polished diagram or a 3D render.
---

# Science explainer: lab notebook sketch

A single notebook page that fills up while you watch. Each idea is sketched, labelled, pointed at,
circled, and noted in the margin by a quick, confident hand. Nothing slides in and nothing fades:
**ink only ever appears**, and it stays.

Output is a **frame page** rendered by `video-studio/tools/page-render.mjs`: `index.html` loads `scene.js`,
which calls the engine's `boot()`. That sets `window.DUR`, `window.render(t)` (Canvas 2D, deterministic)
and `window.READY = true`. Worked example: `examples/fire/` ("the science of fire", 5 s, 3 beats). Copy it to start.

## Style bible

**Palette** (`engine/palette.js` → `PAL`; never invent a hex in a scene):

| role | key | hex | use |
|---|---|---|---|
| paper | `paper` → `paperEdge` | `#F4EDD8` → `#E7DCBF` | the page (radial falloff + grain + fibres, pre-rendered) |
| grid | `grid` / `gridMajor` | `#9DBAD8` / `#7FA3CC` | 36 px squares at alpha .32, every 5th at .5 |
| margin | `margin` | `#D4544C` | the double red rule at x = 250. Paper only, never ink |
| ink | `ink` | `#1F2A48` | every outline, letter, arrow, equation |
| ink soft | `inkSoft` | `#4A5577` | date / page number, faint construction lines |
| pencil | `pencil` | `#5E5A57` | hatching only, alpha ~0.4-0.5 |
| highlighter | `hlYellow` `hlOrange` | `#FFE14D` `#FF9F43` | key term (yellow), heat / hot things (orange) |
| extra highlighters | `hlGreen` `hlPink` | `#9BE36A` `#FF8DBA` | optional, at most one per video |

Colour comes **only** from highlighter (multiply blend, under or over ink). No coloured ink, no fills
except highlighter scribbles and the paper knockout. Highlighter covers < 8 % of the frame: 3-6 marks per video.

**Lines** (`LW`, px at 1080p): main ink 5 (objects, triangle sides, flames), second 3.6 (arrows, small
objects, underlines), fine 2.6 (note circles, leaders, ticks, waves), hatch 1.7 (pencil). Every ink line
goes through `stroke()`: seeded wobble (±1.3 px, low and high frequency), pressure swell, tapered ends.
Straight lines come from `handLine()` (slight bow, overshoot), circles from `handCircle()` (ends overshoot
and never close exactly), boxes from `handRect()` (pen lifts at the corners). Never `ctx.rect`/`arc` for ink.

**Type** (`FONT`, `TYPE`; Windows fonts, no webfonts): **Segoe Print** for titles (700), labels, equations;
**Ink Free** for margin notes and asides (write() thickens it with an ink outline). Sizes at 1080p: title 56,
corner label 44 caps (700, track 2), equation 60, note 34-36, small 32, **minimum 30** (legible at 960x540).
Text is written glyph by glyph with seeded size, baseline and rotation jitter (`write()`); chemistry
subscripts with `{ chem: true }` (`CH4`, `2H2O`). Labels ≤ 4 words; notes ≤ 2 lines of ≤ 18 chars.

**Marks vocabulary**: circled section number + bold word (`section()`), arrows with one-stroke heads
(curved by default, `arrowTo(..., { bend })`; double-headed for back and forth), notes circled or boxed
with an arrow to what they explain (`note()`), underline the title, curly braces under equation terms
(`brace()`), pencil hatching on shadow sides and cast shadows (`hatch()`), highlighter swipe behind
the key word (`highlightBox()`), highlighter scribble fills for hot or glowing things (`scribble()`).

**Motion** (`PACE` in `engine/timeline.js`; these are the style):
- ink draws on at ~2200 px/s, 0.12-0.5 s per stroke (`strokeDur()`), eased with `E.pen`
- writing 36 chars/s (`writeDur()`), equations 40 chars/s; a note's arrow leaves while its circle closes
- arrow 0.24 s (shaft, then head in one stroke); circle/box 0.25 s; highlighter swipe 0.25 s; hatch patch 0.35 s
- **things that move do so on twos** (12 fps: `onTwos(t)`) and line-boil (`boil(t)` as a seed offset):
  rubbing sticks, flames, sparks, heat waves. Draw-ons stay smooth at 30 fps.
- one pen at a time, with at most two marks in progress at once (e.g. a label while a hatch fills)
- motion transients (sparks, friction ticks) may stop; **ink never fades out, erases or moves away**
- each beat ends with ≥ 0.25 s where only ambient boil happens

**Camera**: "a phone held over the notebook". Slow pans/zooms between key framings only (`camera` keys
in `boot()`, inOutSine, zoom 1.0-1.12), ending on the full page so the last frames show everything. No
rotation, shake, whip pans, blur or depth of field. The paper moves with the camera (it is the world).

**Composition**: one page, 1920x1080. Title top-left after the margin (x ≈ 300, y ≈ 100), date and page
number top-right in `inkSoft`. Divide the page into 2-3 zones, one per beat, each starting with a circled
number; reading order left→right, top→bottom; the last beat usually takes a bottom band (equations,
summaries). Keep 40 px clear of the margin rule and 60 px from the page edges. Notes sit in the gaps,
next to what they explain, with a short arrow. Leave ~25 % paper empty: a notebook, not a poster.

**Never**: flat-filled vector shapes, gradients on objects, drop shadows, glow, coloured ink, perfect
geometry, typeset-looking fonts (Segoe UI/Arial) on the page, text sliding/fading in, elements scaling or
popping in, erasing, Math.random, mascots/characters, logos or any real studio/channel branding, more than
one exclamation mark per video, text smaller than 30 px.

## How to build a scene

1. **Copy** `examples/fire/` to your new folder (it includes `engine/`; keep the engine a copy, not a link).
   Edit only `scene.js`; `index.html` stays as is.
2. **Script the beats** (≈ 1.5-2 s each for a 5 s piece): for each, one sketch + 2-4 labels/arrows + at most
   one margin note. Write the facts in plain English and check them (numbers in notes must be right).
3. **Lay out on paper coordinates**: put every anchor in constants at the top (`const V = {...}`), derive
   positions with `add`, `lerp2`, `unit`, `perp`. Text boxes come back from `write()`/`measure()`; anchor
   arrows, highlights and braces to those boxes, not to guessed numbers.
4. **Draw back to front inside `draw(ctx, t, stage)`**: highlighter that sits under ink → pencil hatching /
   cast shadows → objects (`stick(..., { paper: stage.paper })` knocks out what is behind it) → labels →
   arrows → notes. Every call gets a progress from `cue(t, at, dur)` / `lin()` / `writeAt()` / `note()`.
5. **Time it like a pen**: chain start times from the durations above (use `plan()` or the `end` values
   returned by `writeAt`/`note`/`equationAt`). Animated things: `onTwos(t)` for motion, `boil(t)` for
   flicker, `env()` to start/stop transients.
6. **New objects**: build from `handLine`/`handCircle`/`curve`/`smooth` + `stroke()` + `hatch()`; add them
   to `engine/sketch.js` if reusable (take `p`, and `t` if animated; seeds as params).
7. **Camera**: 3-5 keys, start framed on beat 1 (s ≈ 1.1), end on the full page (s = 1) by the last beat.
8. **Stills**: `node "<repo>/video-studio/tools/page-render.mjs" "<dir>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<dir>/stills"`,
   Read them, fix, repeat (≤ 3 rounds). Then render:
   `node "<repo>/video-studio/tools/page-render.mjs" "<dir>" --out "<out>.mp4" --size 1920x1080 --fps 30`
   (pure Canvas 2D: 150 frames at 1080p ≈ 30 s on the Iris Xe).
9. **Contact sheet**: `ffmpeg -y -i "<out>.mp4" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 "<dir>/sheet.jpg"`, Read it.

Paths contain "Á": always quote them. Engine API in one line each:
`boot({dur, draw, camera})` · `stroke/strokes/dot` · `handLine/handCircle/handPoly/handRect/curve/squiggle/zigzag/smooth`
· `arrow/arrowTo/rubArrow` · `write/writeAt/measure/underline/circleBox/note/section/equationAt` ·
`hatch/highlight/highlightBox/scribble` · `stick/flame/heatWaves/sparks/thermometer/atom/brace` ·
`knockout(ctx, stage.paper, clip)` · `cue/lin/env/plan/beats/PACE/writeDur/strokeDur` · `rng/noise1/boil/onTwos`.

## Checks (on the stills, before rendering)

- [ ] Paper reads as graph paper: blue grid visible but faint, red double margin on the left, grain present
- [ ] All ink is blue-black and visibly hand-drawn (wobble, tapered ends, overshooting circles); no perfect shapes
- [ ] Every label is Segoe Print / Ink Free, ≥ 30 px, and legible when the still is viewed at half size
- [ ] No text overlaps a line or another text (notes' circles clear their letters; arrowheads don't touch words)
- [ ] Subscripts are right (`CH₄`, `2O₂`, `H₂O`); facts and numbers in the notes are correct
- [ ] Each beat has its sketch + labels + arrows; at least one note is circled/boxed with an arrow
- [ ] Highlighter: 3-6 marks total, multiply look (ink shows through), nowhere else is colour used
- [ ] Hatching only on shadow sides / cast shadows, pencil grey, never covering labels
- [ ] Moving objects knock out what is behind them (no lines showing through a stick)
- [ ] The mid-beat still shows partial writing/strokes (the page is "being written"), not finished blocks
- [ ] Final frame: the whole page fits the frame (camera at s = 1), ≥ 60 px margin to the frame edges
- [ ] Nothing slides, fades or scales; no branding, characters or logos; no console errors in the render log
