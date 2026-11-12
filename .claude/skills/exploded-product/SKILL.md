---
name: exploded-product
description: Makes premium product "exploded view" videos in three.js. A PBR product (brushed and polished metal, glass, matte surfaces) on a seamless warm-grey studio sweep turns slowly, comes apart along one axis in a staggered, eased sequence, then holds with thin leader lines and small tracked-caps labels. Use it for any "exploded view", "teardown", "what's inside", "components / anatomy of a product" or calm luxury product-reveal shot (watches, headphones, cameras, sneakers, gadgets).
---

# Product exploded view (3D)

Calm, precise, expensive. One object, one axis, one accent colour, lots of air. It should look like a
technical-catalogue render that started to move: no hype, no particles, no glow.

Output is a **frame page** rendered by `video-studio/tools/page-render.mjs`: `index.html` sets `window.DUR`,
`window.render(t)` draws frame t deterministically, and `window.READY = true` (the engine's `boot()` does all three).
Worked example: `examples/fire/` (mechanical wristwatch, 5 s, 1920x1080). Copy it to start a new video.

## Style bible

**Palette** (all in `engine/palette.js`, import `PAL`; never invent per-scene hexes):

| role | hex | notes |
|---|---|---|
| sweep centre / edge | `#ECE9E4` / `#D2CDC6` | screen-space radial gradient, seeded grain against banding |
| contact shadow | `#4F4943` | floor shadow at 0.13 opacity + blob 0.2-0.35 |
| label ink | `#2A2927` | names |
| soft ink | `#7B7770` | sub-captions, header meta, FIG. number |
| leader lines | `#3A3936` at 0.8 alpha | |
| accent (one only) | `#B8582E` | index numbers, header rule, at most ONE 3D detail (e.g. seconds hand) |
| steel / dark steel | `#C8CBCF` / `#8E9297` | |
| gilt | `#C9A46A` | movement wheels, warm parts |
| deep matte (dial etc.) | `#1E2A33` | the one dark surface that anchors the composition |
| leather / rubber | `#3A2C25` / `#2B2B2C` | |

Product colours outside this table are fine when the product demands them, but keep them desaturated and keep
the accent unique.

**Materials** (`engine/materials.js`): `brushedSteel` (anisotropic, streak roughness+bump), `polishedSteel`
(roughness 0.05-0.08, shows softbox strips), `gilt`, `plate`, `sapphire` (transmission, ior 1.77, faint AR
iridescence, no clearcoat), `glassLite` (cheap fallback), `matte`, `leather`, `rubber`, `jewel`, `lacquer`,
`paint`. Every surface is PBR and lit by the studio environment; contrast comes from the reflections (softboxes
and black flags in `studio.js`), not from coloured lights.

**Line weights** (px at 1080p, `LINE`): leader 1.25, anchor dot r 3.2 + hairline ring r 7, axis 1 (dashed 6/6).
Leaders are anchor -> short elbow (34 px) -> horizontal run to the label column. Never curved, never arrows on
leaders.

**Type** (Windows fonts only, no web fonts): labels Bahnschrift 600, 15 px, tracking 0.22 em, ALL CAPS;
sub-caption Bahnschrift 300, 12 px, sentence case; index numbers Consolas 12 px in the accent (`01`..`07`);
header Bahnschrift 600 14 px tracking 0.32 em + 12 px meta line + a 24x2 px accent rule above. Label columns
at 27 % and 77 % of the width; labels at least 58 px apart vertically (the layer resolves collisions).

**Motion rules and timing** (5 s template; scale proportionally):
- 0-1.5 s **turn**: assembled product, slow yaw that decelerates (`outCubic`) into the final orientation by ~3.3 s.
  Camera pushes in a few % only.
- 1.5-3.5 s **explode**: parts move along ONE axis (plus small radial moves for side parts such as a crown or
  straps), `inOutCubic`, each part 1.2-1.5 s long, staggered 0.04-0.1 s. The outermost part leaves first, the
  datum part (base / case back) does not move. Lift grows monotonically with stack order: gaps 0.35-0.6 x the part
  diameter, so no two parts ever overlap on screen.
- 3.5-5 s **hold**: labels draw on top to bottom, 0.09 s apart, 0.55 s each (dot, then line, then text slides
  8 px). Camera drifts ~6 deg azimuth, ~1.5 deg elevation, 3-4 % dolly, `inOutSine`.
- Optional **reassemble**: `exploder(..., { back: [a, b] })` reverses the order; fade labels out first (`L.hide`).
- Living details are allowed only if slow: wheels turning < 0.5 rad/s, a seconds hand, a balance swing.
  Nothing bounces, overshoots, shakes or flashes.

**Camera**: long lens (fov 24-26), three-quarter view az ~30-40 deg. Assembled: el ~30 deg, product fills ~55 %
of the width. Exploded: el 15-20 deg so the gaps read, whole stack within 10-90 % of the height. Drive framing
from the top part's explode progress (see `camera()` in the example), not from a free-running track, so the stack
never outruns the frame.

**Composition**: product centred, stack vertical, labels in two quiet columns, header block bottom-left
(`EXPLODED VIEW` + meta), `FIG. 01` bottom-right. The floor is invisible apart from a soft contact shadow.

**Never**: real brands, logos, model names or a recreation of a real product or studio look; dark or coloured
backgrounds; visible floor edge or horizon; hard black shadows; bloom, lens flares, particles, DOF blur, motion
blur; fast or spring/bounce easing; parts rotating wildly while exploding; labels with boxes, pills, drop shadows
or more than one accent; leader lines crossing parts or each other; text smaller than 12 px at 1080p;
`Math.random` / `Date` / real-time anything in the render path.

## How to build a scene

1. **Copy the example**: `cp -r "<skill>/examples/fire" "<project>/my-shot"`. Its `engine/` folder is a copy of
   `<skill>/engine/` (the page is served with its own folder as web root, so the engine must live inside it).
   If you change the engine in the skill, copy it again: `cp "<skill>/engine/"*.js "<shot>/engine/"`.
   three.js is imported from `/_vendor/three.module.js`, addons from `/_vendor/addons/...`.
2. **Set the timeline** in `scene.js`: `timeline({ turn: [0, 1.5], explode: [1.5, 3.5], hold: [3.5, 5] })`, `DUR`.
3. **Studio**: `createStudio({ width, height, fov: 24, shadowExtent })`. `shadowExtent` must cover the
   exploded stack's footprint (about 1.5x its radius in world units); call `S.aimShadow(x, y, z)` on the subject.
4. **Model each part as its own Group**, product axis on +Y, base at y = 0, in assembled position. Helpers in
   `engine/shapes.js`:
   - `lathe(profile)` / `bevelCylinder({ r, h, bevel, dome })` / `bevelRing({ rOut, rIn, h, bevel })` for anything
     round (case, ear-cup, lens barrel, sole). Lathe UVs run around, so `brushedSteel()` reads as circular grain.
   - `gear({ teeth, r, h, hole, spokes })`, `gearShape()`, `knurl({ r, h, flutes })` (crowns, focus rings, knobs),
     `spokedWheel()`, `spiral()` (hairsprings, coils).
   - `bentStrip({ length, width, thick, bend, taper })` (straps, headbands, tongues, lugs), `flatExtrude(shape)`
     for any 2D outline (hands, brackets, PCBs), `ringOf(n, r, make)` for indices/screws/buttons, `mesh()`.
   - Textures (`engine/textures.js`): `dialTex`, `strapTex`, `stripesTex`, `brushedTex`, `circularBrushTex`,
     `canvasTex(w, h, draw)` for anything else (seeded; no image files, no network).
   Budget: under ~40 meshes, textures 512-1024 px, shared materials. Iris Xe renders the example at ~8 fps.
5. **Exploder** (`engine/exploder.js`):
   `EX = exploder([{ object, dir: [0,1,0], dist, delay, also: [{ dir, dist }], spin }], { out: tl.cue('explode') })`
   and `EX.update(t)` each frame. `stackParts(layers)` builds a top-first stagger for plain vertical stacks.
6. **Labels** (`engine/labels.js`): `L = labelLayer({ width, height, columns: [0.27, 0.77] })`, then
   `L.add({ index: '01', text: 'CRYSTAL', sub: 'Domed sapphire', side: 'left', anchor, show })`. Anchor is
   `{ object, local: [x,y,z] }`, a Vector3, or a function; use a rim point on the label's side of the part
   (`rim()` helper in the example), so leaders never cross the object. `L.add` returns the live label
   (`.dy = 40` nudges it). Extras: `L.extra(fn)` with `api.header()`, `api.axis()`, `api.arrow()`.
7. **frame(t)**: set yaw, `EX.update(t)`, living details, `S.contact(...)`, `S.orbit(camera(t))`, `S.render()`,
   `L.draw(t, S.camera)`. Finish with `boot({ dur, setup, frame })`.
8. **Stills** (always before the full render):
   `node "<repo>/video-studio/tools/page-render.mjs" "<shot>" --stills 0.5,2.5,4.5 --size 1920x1080 --outdir "<shot>/stills"`
   Read them, fix, repeat (max ~3 rounds).
9. **Render**: `node "<repo>/video-studio/tools/page-render.mjs" "<shot>" --out "<file>.mp4" --size 1920x1080 --fps 30`
   then a contact sheet: `ffmpeg -y -i "<file>.mp4" -vf "fps=2,scale=320:-2,tile=5x2" -frames:v 1 "<shot>/sheet.jpg"`.
   Quote every path (the user folder contains an accented character).

## Checks (look at the stills before rendering)

- [ ] Backdrop is one seamless warm grey; no floor edge, horizon, frustum line or banding.
- [ ] Shadow is soft and light; a darker contact shadow sits directly under the lowest part.
- [ ] Polished parts show clean highlight bands and dark flag lines; no part reads as flat grey plastic or black.
- [ ] Glass reads as glass (backdrop visible through it, a highlight), not as a white or grey opaque disc.
- [ ] Printed text on the product (dial etc.) is not mirrored or rotated wrongly in the assembled shot.
- [ ] Mid-explode still (2.5 s): every part is inside the frame, including the one that travels furthest.
- [ ] Exploded still: gaps are even, nothing overlaps, parts are in the right physical order.
- [ ] Every label is legible, inside the margins, not over the header, its leader starts on the part's edge
      and does not cross another part or leader. Exactly one accent colour in the frame.
- [ ] No brand, logo or real model name anywhere. Nothing moves fast; nothing flickers between frames.
- [ ] Contact sheet: the whole subject in frame on every tile; the three acts (turn, explode, hold) are obvious.

## Gotchas

- `CylinderGeometry` cap UVs put the texture's "up" toward +X: rotate the geometry `rotateY(PI/2)` so it points to -Z.
- Glass seen at 15-20 deg is mostly Fresnel reflection: keep `specularIntensity` ~0.4 and no clearcoat (it
  doubles the grazing reflection and turns the crystal into an opaque grey disc). The studio also sets the
  clear colour to the sweep so the transmission pass never sees black.
- VSM shadows (blur `softness` 22 on a 512 map) are the soft look; the shadow-catcher is a disc smaller than the
  frustum so no edge line appears.
- Keep pages light (~4 GB RAM free on this PC): pixel ratio 1, one shadow light, no post-processing.
