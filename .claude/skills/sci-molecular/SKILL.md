---
name: sci-molecular
description: Makes premium 3D molecular science-explainer videos in three.js. CPK-coloured ball-and-stick or space-filling molecules under soft studio light with a cool rim, on a dark gradient with depth-of-field falloff, a slow orbiting camera, bonds that break and form on cue, and clean floating labels. Use it for any "how it works at the molecular level" explainer (combustion, photosynthesis, dissolving, rusting, digestion, drugs binding, polymers), whatever the subject.
---

# Science explainer: 3D molecular

Calm, glossy, exact. Real molecules with real geometry sit in a dark studio and do one chemical thing per beat
while the camera breathes around them. Energy (heat, light, sparks) is the only warm colour on screen.

Output is a **frame page** rendered by `video-studio/tools/page-render.mjs`: `index.html` sets `window.DUR`,
`window.render(t)` draws frame t deterministically, and `window.READY = true` (`engine/page.js` `boot()` does all three).
Worked example: `examples/fire/` (the science of fire, 5 s, 1920x1080). Copy it to start a new video.

## Style bible

**Palette** (all in `engine/palette.js`; import `PAL` / `ELEMENTS`, never invent per-scene hexes):

| role | hex | notes |
|---|---|---|
| background top / bottom / centre lift | `#0E1528` / `#05070D` / `#18223D` | screen-space gradient + seeded grain |
| fog | `#0B1222` | far molecules fade into it |
| carbon C | `#3B3E44` | dark grey, never pure black |
| oxygen O | `#E0322B` | |
| hydrogen H | `#F2F2EE` | off-white, never pure white |
| nitrogen N | `#2F5BEA` | |
| S / P / Cl / Na / Fe | `#E8C23A` / `#F08A24` / `#3CC45A` / `#8E5BD6` / `#D0772E` | |
| key / fill / rim light | `#FFF3E6` / `#7086B8` / `#9CC2FF` | warm key, cool fill, strong cool rim from behind |
| label ink / soft / pill | `#EEF3FB` / `#93A3C2` / `rgba(10,16,30,0.70)` + edge `rgba(170,200,255,0.30)` | |
| diagram accent (cool) | `#7FD6FF` | leaders, arrows, diagram lines, the header rule |
| energy (warm) | heat `#FF7A2E`, flame core `#FFE2A0`, mid `#FFA43C`, edge `#E2481C` | ONLY for energy: heat, flame, light, sparks |

**Materials.** Atoms: `MeshPhysicalMaterial`, roughness 0.30-0.34, clearcoat 0.6, faint cool sheen. One material
per element, shared. Bonds are **split-colour**: each half uses its own atom's material. Props (wood, metal, glass)
stay matte-ish and desaturated so the molecules own the gloss.

**Sizes (world unit = 1 angstrom).** Ball-and-stick radii: H 0.25, C 0.40, N 0.38, O 0.37. Space-filling uses the
van der Waals radius x 0.92. Bond radius 0.10; double/triple bonds 0.072 each, spaced 0.26, always fanned toward
the camera so they read. Use real bond lengths (C-H 1.09, O=O 1.21, C=O 1.16, O-H 0.96) and angles (CH4 tetrahedral,
H2O 104.5 deg). Ball-and-stick for anything that reacts; space-filling for background "air" and crowds.

**Line weights** (px at 1080p): leader 1.5, anchor dot r 4 + ring r 9, header rule 28x2, 2D arrows 3 with 16 px heads.
3D diagram lines (`beam`): radius 0.018 world, glowing, end 1.3 units short of the nodes so they never read as bonds.

**Type** (Windows fonts only, no web fonts): labels Segoe UI 600 30 px, tracking 0.04 em, CAPS; sub-lines Segoe UI
400 22 px, sentence case; header kicker Bahnschrift 600 20 px tracking 0.30 em + title Segoe UI Light 44 px; chemical
formulas Cambria 46 px with real subscripts (`O.formula` / `O.tag` parse `H2O`, `->`). Nothing smaller than 22 px
at 1080p (11 px at 540p). Labels sit in dark pills with a 3 px accent tab on the leader side.

**Motion rules and timing.**
- One idea per beat; 1.5-2 s per beat at 5 s total, 3-6 s per beat in longer films.
- Molecules arrive with `outBack` pops (0.35 s), travel with `inOutCubic` (0.5-0.7 s), and never stop dead:
  slow tumble (0.3-0.7 rad/s) or thermal jiggle (`vibrate` 0.01-0.06 A; more when hot).
- Reactions: approach -> bonds **break** (halves retract into their atoms, `inCubic`, 0.2-0.25 s, staggered
  0.025-0.04 s, cool flash) -> atoms regroup along arcs (0.6-0.7 s) -> bonds **form** (halves grow and meet,
  `outCubic`, warm flash) -> products drift apart and keep turning. Atoms are conserved: never pop atoms in or
  out mid-reaction.
- Labels enter 0.3-0.4 s after their subject settles, fade out 0.25 s before the next beat. Max 3 pills on screen.
- Energy beats get the warm glow (flame, orb); its brightness follows the chemistry (grows as bonds form).

**Camera.** Perspective, fov 30. Always orbiting: 4-12 deg of azimuth per beat, `inOutSine`/`inOutCubic` keys via
`track()`. Wide shots look down 13-16 deg; close-ups 12-16 deg. Dolly between beats in 0.8-1 s. Focus distance is
locked to the orbit target every frame (`S.focusOn(target)`); aperture 0.0006-0.0008, maxblur 0.009, so only
things 3+ A off the focal plane soften.

**Composition.** Hero molecule(s) in the centre third; labels in the outer thirds; formula centred at y 985;
header top-left at (96, 92). Background air molecules (N2/O2, space-filling) 12-22 units behind the subject: fogged,
blurred, never in front. Keep the frame 30-40 % empty dark.

**Never:** pure black or flat backgrounds; neon/rainbow atoms or non-CPK colours for standard elements; warm colours
on things that are not energy; bonds that pass through atoms or float free; atoms that appear/vanish during a
reaction; labels on top of the hero or under 22 px; more than one formula on screen; text in a language other than
the brief's; wobbly/handheld camera; logos, mascots, or another studio's/channel's look.

## How to build a scene

1. **Copy** `examples/fire/` to a new folder (it already contains `engine/`, `index.html` with the `three` import map,
   and `scene.js`). Keep the import map: three addons import the bare specifier `three`.
2. **Beats.** Write the beats with times in a comment at the top of `scene.js`, then the layout constants
   (node positions, molecule centres) in world units. Put reacting molecules in the plane z ~ 0.3, props and glows
   2-3 units behind, air 12-22 behind.
3. **Stage + overlay.** `S = createStage({ width, height, aperture, bloom })`, `O = overlay(S)`,
   `air = airField(S, {...})`. The stage owns the lights, environment, fog, DOF, glow pass and bloom.
4. **Molecules.** Presets: `MOL.H2, O2, N2, H2O, CO2, CH4, NH3, C2H5OH`; anything else as
   `{ atoms: [{ el, pos }], bonds: [{ a, b, order }] }`. A standalone molecule:
   `molecule(S, spec, { pose: (t) => ({ pos, rot, scale }), style: 0..1, vibrate: (t) => amp })`.
   Per-atom `size` (number or fn) pops atoms in: `withSize(spec, (t) => ease.outBack(seg(t, a, b)))`.
5. **Reactions.** `reaction(S, { reactants: [{ spec, pose }], products: [{ spec, pose }], map, move, breakAt,
   formAt, stagger, lift, vibrate })`. `map` lists, for every reactant atom in flattened order, its
   `[productIndex, atomIndex]`. Bonds present in both are kept; the rest break in `breakAt` and form in `formAt`
   (with flashes). Plan `map` so atoms take short, non-crossing paths; `lift(k)` arcs chosen atoms around the rest.
   Reactant poses are `track()`-keyed (rest -> approach); product poses usually `drift()` after formation.
   `m.center(m.products[i])` gives label anchors.
6. **Effects/props.** `flame()` (tongues + halo + warm point light; update height/width/power by t), `sparks()`,
   `smoke()`, `orb()` (energy node), `beam()` (diagram lines that draw on), `stick()`, `decal()`, `glowSprite()`.
   Everything additive lives on layer `GLOW`: it is drawn sharp, after the blur, depth-tested against the solids.
7. **Camera.** `const cam = track([[t, [tx, ty, tz, dist, az, el]], ...])`; per frame
   `S.orbit(...)` then `S.focusOn(target)`.
8. **Overlay**, per frame after `S.render()`: `O.begin(); O.vignette(0.55); O.header(...)`, then `O.label` (pill +
   leader to a 3D point), `O.tag` (formula chip), `O.formula` (with `hi: [termA, termB]` to light up one side),
   `O.arrow`, `O.meter`. Use `env(t, a, b, fadeIn, fadeOut)` for every label's `k`.
9. **Determinism.** Only `t` drives the frame. Randomness only through `seeded(n)`; noise through `noise1`.
   No `Math.random`, `Date`, `performance.now` or accumulated state in `frame()`.
10. **Render.** Stills first, then the video (see the checks):
    `node "<repo>/video-studio/tools/page-render.mjs" "<scene dir>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<scene dir>/stills"`
    `node "<repo>/video-studio/tools/page-render.mjs" "<scene dir>" --out "<file>.mp4" --size 1920x1080 --fps 30`
    Contact sheet: `ffmpeg -y -i "<file>.mp4" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 sheet.jpg`.
    Quote every path (the user folder contains "Á"). On the Iris Xe the fire example renders 150 frames in ~28 s.

Live preview in a browser tab: serve the folder and open `index.html?play` (loop) or `?t=3.8` (freeze).

## Checks (look at every still before rendering)

- [ ] Whole subject in frame: no atom, label pill or formula clipped at the edges; 1-beat stills sit mid-beat.
- [ ] Every label legible at 960x540: pills over dark areas, not over the hero; no leader crossing an atom.
- [ ] CPK colours read: C dark grey (not black, not brown), O red, H off-white, N blue. Glossy highlight + cool rim
      visible on the hero atoms.
- [ ] Bonds: split-colour, attached at both ends, double bonds visible as two sticks; during a break, stubs retract
      into atoms; no bond pierces another atom.
- [ ] Depth: background air soft and fogged, hero sharp. Glows (flame, sparks, flashes) sharp, not smeared.
- [ ] Warm only where there is energy; the flame/glow sits *behind* the molecules and never washes them out
      (lower `flame` power or bloom if an atom turns white).
- [ ] Diagram lines stop short of nodes and do not coincide with props (shift props in depth or change camera `el`).
- [ ] Formula: correct, balanced, subscripts real, the active side highlighted.
- [ ] Atoms conserved across the reaction; paths do not visibly cross through each other.
- [ ] Contact sheet: the beats are distinguishable at thumbnail size and nothing pops between frames.
