# "Discovery of fire" — 5 s toon shot, built from the blender-3d skill's plate.py (toon look: cel bands via
# Shader-to-RGB + constant ColorRamp, inverted-hull ink outline, EEVEE).
#   blender -b --factory-startup -P fire_plate.py -- --out out/frames --res 540x960 --fps 24 --frames 120 --samples 16
#   add --stills 12,60,110 to render only those frames as still_XXXX.png
import bpy, bmesh, math, sys, os, argparse, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="out/frames")
ap.add_argument("--frames", type=int, default=120)
ap.add_argument("--fps", type=int, default=24)
ap.add_argument("--res", default="540x960")
ap.add_argument("--samples", type=int, default=16)
ap.add_argument("--stills", default="")
ap.add_argument("--blend", default="")
a = ap.parse_args(argv)
W, H = (int(v) for v in a.res.lower().split("x"))
FPS = a.fps
def T(sec): return 1 + round(sec * FPS)          # seconds -> frame number (frame 1 = t 0)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try: sc.render.engine = eng; break
    except Exception: pass
try: sc.eevee.taa_render_samples = a.samples
except Exception: pass
for k, v in (("shadow_ray_count", 2), ("shadow_step_count", 10), ("use_shadow_jitter_viewport", False)):
    try: setattr(sc.eevee, k, v)
    except Exception: pass
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = 100
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, a.frames
sc.render.film_transparent = False
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGB"
sc.view_settings.view_transform = "Standard"
random.seed(7)

# ───────────────────────── materials (toon, from plate.py, extended so light colour tints the bands)
INK = (0.04, 0.025, 0.03, 1)

def _emit_mat(name, color, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = color; em.inputs[1].default_value = strength
    nt.links.new(em.outputs[0], out.inputs[0])
    return m

def toon(name, color):
    """cel shading: white diffuse -> Shader to RGB -> constant ramp (4 bands) x base colour x light hue -> emission.
    Bands are darker than plate.py's so the night really reads as night and the fire lifts everything."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    N, L = nt.nodes.new, nt.links.new
    dif = N("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = N("ShaderNodeShaderToRGB"); L(dif.outputs[0], s2r.inputs[0])
    ramp = N("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.0, (0.16, 0.16, 0.16, 1)
    el[1].position, el[1].color = 0.62, (1.0, 1.0, 1.0, 1)
    e = el.new(0.07); e.color = (0.36, 0.36, 0.36, 1)
    e = el.new(0.26); e.color = (0.66, 0.66, 0.66, 1)
    L(s2r.outputs[0], ramp.inputs[0])
    # light hue = L / max(r,g,b)
    sep = N("ShaderNodeSeparateColor"); L(s2r.outputs[0], sep.inputs[0])
    m1 = N("ShaderNodeMath"); m1.operation = "MAXIMUM"; L(sep.outputs[0], m1.inputs[0]); L(sep.outputs[1], m1.inputs[1])
    m2 = N("ShaderNodeMath"); m2.operation = "MAXIMUM"; L(m1.outputs[0], m2.inputs[0]); L(sep.outputs[2], m2.inputs[1])
    m3 = N("ShaderNodeMath"); m3.operation = "MAXIMUM"; L(m2.outputs[0], m3.inputs[0]); m3.inputs[1].default_value = 1e-3
    hue = N("ShaderNodeVectorMath"); hue.operation = "DIVIDE"; L(s2r.outputs[0], hue.inputs[0]); L(m3.outputs[0], hue.inputs[1])
    tint = N("ShaderNodeVectorMath"); tint.operation = "MULTIPLY_ADD"; L(hue.outputs[0], tint.inputs[0])
    tint.inputs[1].default_value = (0.7, 0.7, 0.7); tint.inputs[2].default_value = (0.3, 0.3, 0.3)
    c1 = N("ShaderNodeVectorMath"); c1.operation = "MULTIPLY"; c1.inputs[0].default_value = color[:3]; L(ramp.outputs[0], c1.inputs[1])
    c2 = N("ShaderNodeVectorMath"); c2.operation = "MULTIPLY"; L(c1.outputs[0], c2.inputs[0]); L(tint.outputs[0], c2.inputs[1])
    em = N("ShaderNodeEmission"); L(c2.outputs[0], em.inputs[0]); L(em.outputs[0], out.inputs[0])
    return m

_inks = {}
def outline(o, thick=0.02, color=INK):
    # inverted hull (plate.py): solidify with flipped normals + backface-culled ink material
    key = tuple(round(c, 3) for c in color)
    if key not in _inks:
        ink = _emit_mat(f"INK{len(_inks)}", color); ink.use_backface_culling = True; _inks[key] = ink
    s = o.modifiers.new("outline", "SOLIDIFY"); s.thickness = -thick; s.use_flip_normals = True
    s.material_offset = len(o.data.materials)
    o.data.materials.append(_inks[key])

def sphere(name, r, loc, m, scale=(1, 1, 1), parent=None, seg=24, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg * 2 // 3))
    o = bpy.context.active_object; o.name = name; o.scale = scale
    o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    if parent: o.parent = parent
    return o

def rock(name, r, loc, m, scale=(1, 1, 1), jitter=0.22, subdiv=1, rot=None):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=subdiv, location=loc)
    o = bpy.context.active_object; o.name = name
    for v in o.data.vertices: v.co *= 1 + random.uniform(-jitter, jitter)
    o.scale = scale
    o.rotation_euler = rot or (0, 0, random.uniform(0, 6.28))   # yaw only, so the scale axes stay put
    o.data.materials.append(m)
    bpy.ops.object.shade_flat()
    return o

def cyl(name, r, depth, loc, rot, m, parent=None, verts=10):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object; o.name = name; o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def key(o, path, f, v):
    setattr(o, path, v); o.keyframe_insert(path, frame=f)

# palette
SKIN, SKIN_DK = (0.92, 0.62, 0.44, 1), (0.78, 0.48, 0.33, 1)
FUR, FUR_DK, HAIR = (0.55, 0.33, 0.15, 1), (0.30, 0.17, 0.07, 1), (0.20, 0.11, 0.06, 1)
WOOD, ROCK, ROCK2, STONE = (0.52, 0.32, 0.16, 1), (0.46, 0.42, 0.42, 1), (0.38, 0.35, 0.38, 1), (0.55, 0.52, 0.50, 1)
GROUND = (0.40, 0.30, 0.20, 1)
mSkin, mSkinDk = toon("skin", SKIN), toon("skin_dk", SKIN_DK)
mFur, mFurDk, mHair = toon("fur", FUR), toon("fur_dk", FUR_DK), toon("hair", HAIR)
mWood, mRock, mRock2, mStone = toon("wood", WOOD), toon("rock", ROCK), toon("rock2", ROCK2), toon("stone", STONE)
mGround = toon("ground", GROUND)
mFace = _emit_mat("face_ink", INK)
mWhite = _emit_mat("white", (1, 1, 1, 1))
mCaveIn = _emit_mat("cave_in", (0.025, 0.018, 0.03, 1))

# ───────────────────────── set: ground, cave mouth, rocks
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); g = bpy.context.active_object
g.name = "ground"; g.data.materials.append(mGround)

# cave: dark interior blob, two pillars + a lintel forming the mouth, a big hill behind
cave_x, cave_y = 0.05, 3.0
bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1, depth=0.05, location=(cave_x, cave_y - 0.5, 0.25), rotation=(math.pi / 2, 0, 0))
inner = bpy.context.active_object; inner.name = "cave_mouth"; inner.scale = (0.95, 1.35, 1); inner.data.materials.append(mCaveIn)
cave_rocks = [
    rock("pillarL", 0.8, (cave_x - 1.3, cave_y, 0.9), mRock, (0.85, 0.85, 1.6), 0.15),
    rock("pillarR", 0.8, (cave_x + 1.3, cave_y, 0.85), mRock, (0.85, 0.85, 1.5), 0.15),
    rock("lintel", 1.0, (cave_x - 0.05, cave_y + 0.05, 2.05), mRock, (1.9, 0.85, 0.65), 0.15),
    rock("hill", 2.6, (cave_x, cave_y + 3.4, 0.9), mRock2, (1.9, 1.0, 1.0), 0.15, 2),
    rock("sideL", 1.0, (cave_x - 2.9, cave_y + 0.5, 0.4), mRock2, (1.2, 1.0, 0.8)),
    rock("sideR", 0.9, (cave_x + 2.8, cave_y + 0.6, 0.35), mRock2, (1.2, 1.0, 0.75)),
]
for o in cave_rocks: outline(o, 0.04)
props = [
    rock("boulder1", 0.32, (-1.75, 1.2, 0.15), mStone, (1.2, 1, 0.8)),
    rock("boulder2", 0.22, (1.45, 1.6, 0.1), mStone),
    rock("boulder3", 0.22, (1.05, -0.95, 0.08), mStone, (1.3, 1, 0.6)),
    rock("boulder4", 0.18, (-1.25, -1.35, 0.06), mStone, (1.2, 1, 0.6)),
]
for o in props: outline(o, 0.02)

# night sky: gradient backdrop far behind (does not cast shadows), stars, moon, distant hills
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 22, 8), rotation=(math.pi / 2, 0, 0)); sky = bpy.context.active_object
sky.name = "sky"; sky.scale = (80, 50, 1); sky.visible_shadow = False
ms = bpy.data.materials.new("sky"); ms.use_nodes = True; nt = ms.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
tc = nt.nodes.new("ShaderNodeTexCoord"); sp = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sp.inputs[0])
rp = nt.nodes.new("ShaderNodeValToRGB"); nt.links.new(sp.outputs[1], rp.inputs[0])   # plane local Y = world up
rp.color_ramp.elements[0].position, rp.color_ramp.elements[0].color = 0.40, (0.09, 0.10, 0.22, 1)
rp.color_ramp.elements[1].position, rp.color_ramp.elements[1].color = 0.62, (0.015, 0.02, 0.06, 1)
em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(rp.outputs[0], em.inputs[0])
nt.links.new(em.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs[0])
sky.data.materials.append(ms)
mStar = _emit_mat("star", (0.9, 0.92, 1.0, 1))
for i in range(38):
    s = sphere(f"star{i}", random.uniform(0.03, 0.075), (random.uniform(-7, 7), 21, random.uniform(5.5, 17)), mStar, seg=6, smooth=False)
    s.visible_shadow = False
moon = sphere("moon", 0.75, (4.0, 20.5, 13.0), _emit_mat("moon", (0.95, 0.93, 0.80, 1)), seg=24); moon.visible_shadow = False
mHills = toon("hills", (0.16, 0.18, 0.32, 1))
for i, (x, r) in enumerate(((-7, 4.5), (5.5, 4), (12, 5), (-14, 5))):
    h = rock(f"far{i}", r, (x, 16, -1.5), mHills, (1.6, 0.6, 0.9), 0.1, 2); h.visible_shadow = False

# ───────────────────────── caveman (the soft clay-toy character: round head, egg body, little arms)
ROOT_LOC, ROOT_ROT = Vector((-0.8, 0.4, 0)), math.radians(48)
root = bpy.data.objects.new("caveman", None); sc.collection.objects.link(root)
root.location = ROOT_LOC; root.rotation_euler = (0, 0, ROOT_ROT)
body = bpy.data.objects.new("body", None); sc.collection.objects.link(body); body.parent = root   # squash / hop layer
torso = sphere("torso", 0.38, (0, 0, 0.42), mFur, (1.0, 0.9, 1.0), body)
# fur tunic: darker spots and a jagged hem
for i, (az, el, r) in enumerate(((-110, 15, 0.07), (-70, -10, 0.06), (-95, -35, 0.05), (-45, 25, 0.05), (-130, -20, 0.055), (180, 10, 0.07), (20, -20, 0.06))):
    az, el = math.radians(az), math.radians(el)
    p = Vector((math.cos(el) * math.cos(az) * 0.38, math.cos(el) * math.sin(az) * 0.9 * 0.38, 0.42 + math.sin(el) * 0.38))
    sp_ = sphere(f"spot{i}", r, p, mFurDk, (1, 1, 0.45), body, seg=12)
    sp_.rotation_euler = (0, math.pi / 2 - el, az);
for i in range(10):
    ang = i / 10 * 2 * math.pi
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.08, depth=0.14, location=(math.cos(ang) * 0.34, math.sin(ang) * 0.3, 0.16), rotation=(math.pi, 0, ang))
    c = bpy.context.active_object; c.data.materials.append(mFur); c.parent = body
head = sphere("head", 0.32, (0, 0, 0.98), mSkin, (1, 1, 1), body)
hair = sphere("hair", 0.31, (0, 0.07, 1.07), mHair, (1.06, 0.98, 0.78), body)
for i, (x, z) in enumerate(((-0.16, 1.28), (0.0, 1.32), (0.15, 1.27))):
    sphere(f"tuft{i}", 0.09, (x, 0.02, z), mHair, (1, 1, 1.2), body, seg=12)
beard = sphere("beard", 0.2, (0, -0.17, 0.78), mHair, (1.2, 0.8, 0.9), body)
nose = sphere("nose", 0.065, (0, -0.335, 0.95), mSkinDk, (1.1, 1, 0.9), body, seg=16)
brow = sphere("brow", 0.1, (0, -0.27, 1.11), mHair, (2.0, 0.5, 0.42), body, seg=16)
eyes = []
for s in (-1, 1):
    e = sphere(f"eye{s}", 0.05, (s * 0.11, -0.295, 1.03), mFace, (0.85, 0.4, 1.2), body, seg=12); eyes.append(e)
    sphere(f"hl{s}", 0.016, (s * 0.11 + 0.015, -0.315, 1.055), mWhite, (1, 1, 1), body, seg=8)
    sphere(f"blush{s}", 0.05, (s * 0.2, -0.25, 0.93), toon(f"blush{s}", (1.0, 0.45, 0.42, 1)), (1.2, 0.3, 0.7), body, seg=12).rotation_euler = (0, 0, s * -0.6)
mouth = sphere("mouth", 0.05, (0, -0.325, 0.86), mFace, (1.2, 0.4, 0.45), body, seg=12)
for s in (-1, 1):   # crouched legs + feet
    sphere(f"thigh{s}", 0.15, (s * 0.21, -0.12, 0.15), mSkin, (1, 1.35, 0.85), body)
    sphere(f"foot{s}", 0.11, (s * 0.24, -0.3, 0.05), mSkinDk, (1, 1.5, 0.5), body, seg=16)
arms, sticks = [], []
for s in (-1, 1):
    piv = bpy.data.objects.new(f"shoulder{s}", None); sc.collection.objects.link(piv); piv.parent = body
    piv.location = (s * 0.35, -0.02, 0.62); arms.append(piv)
    arm = cyl(f"arm{s}", 0.07, 0.3, (0, 0, -0.15), (0, 0, 0), mSkin, piv, 14)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.shade_smooth()
    hand = sphere(f"hand{s}", 0.09, (0, 0, -0.32), mSkin, (1, 1, 1), piv, seg=16)
    stick = cyl(f"stick{s}", 0.026, 0.55, (0, 0, -0.55), (0, 0, 0), mWood, piv, 6)
    sticks.append(stick)
    for o in (arm, hand, stick): outline(o, 0.014)
for o in [torso, head, hair, beard]: outline(o, 0.018)

# ───────────────────────── fire pit: ring of stones, crossed logs
bpy.context.view_layer.update()
d = Vector((math.sin(ROOT_ROT), -math.cos(ROOT_ROT), 0))
F = Vector((0.3, 0.05, 0))                              # fire centre: to his front-right
for i in range(10):
    ang = i / 10 * 2 * math.pi + 0.2
    st = rock(f"pit{i}", 0.1, F + Vector((math.cos(ang) * 0.4, math.sin(ang) * 0.4, 0.05)), mStone, (1.2, 1, 0.75), 0.25)
    outline(st, 0.012)
for i in range(4):
    ang = i / 4 * math.pi + 0.3
    lg = cyl(f"log{i}", 0.05, 0.62, F + Vector((0, 0, 0.07 + 0.045 * (i % 2))), (math.pi / 2, 0.18 * (1 if i % 2 else -1), ang), mWood, None, 8)
    outline(lg, 0.012)
mEmber = _emit_mat("ember", (1.0, 0.35, 0.08, 1), 1.0)
embers = sphere("embers", 0.2, F + Vector((0, 0, 0.04)), mEmber, (1, 1, 0.25), seg=12)

# flames: emissive cones, subdivided, displaced by a rising noise, ink-red outline, scaling up from 3 s
noise_ctl = bpy.data.objects.new("noise_ctl", None); sc.collection.objects.link(noise_ctl)
tex = bpy.data.textures.new("flame_noise", "CLOUDS"); tex.noise_scale = 0.22
flames = []
FLAME_SPEC = [  # (offset xy, radius, height, colour, ink)
    ((0.0, 0.0), 0.28, 0.95, (1.0, 0.36, 0.05, 1), (0.45, 0.06, 0.02, 1)),
    ((0.12, 0.08), 0.15, 0.6, (1.0, 0.42, 0.06, 1), (0.45, 0.06, 0.02, 1)),
    ((-0.13, -0.05), 0.14, 0.55, (1.0, 0.42, 0.06, 1), (0.45, 0.06, 0.02, 1)),
    ((0.0, -0.03), 0.19, 0.68, (1.0, 0.66, 0.12, 1), None),
    ((0.0, -0.06), 0.1, 0.4, (1.0, 0.93, 0.55, 1), None),
]
for i, (off, r, h, col, ink) in enumerate(FLAME_SPEC):
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=r, radius2=0, depth=h, location=(0, 0, 0))
    o = bpy.context.active_object; o.name = f"flame{i}"
    o.data.transform(Matrix.Translation((0, 0, h / 2)))
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
    bm.to_mesh(o.data); bm.free()
    o.location = F + Vector((off[0], off[1], 0.06))
    o.data.materials.append(_emit_mat(f"flame_m{i}", col, 1.0))
    dm = o.modifiers.new("wobble", "DISPLACE"); dm.texture = tex; dm.texture_coords = "OBJECT"
    dm.texture_coords_object = noise_ctl; dm.strength = 0.28 * (r / 0.28) ** 0.5; dm.mid_level = 0.5
    if ink: outline(o, 0.016, ink)
    o.visible_shadow = False
    flames.append((o, h))

# soft warm glow sphere (additive), no shadows
mg = bpy.data.materials.new("glow"); mg.use_nodes = True; nt = mg.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; nt.links.new(lw.outputs["Facing"], inv.inputs[1])
pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 2.5; nt.links.new(inv.outputs[0], pw.inputs[0])
gem = nt.nodes.new("ShaderNodeEmission"); gem.inputs[0].default_value = (1.0, 0.45, 0.12, 1); nt.links.new(pw.outputs[0], gem.inputs[1])
tr = nt.nodes.new("ShaderNodeBsdfTransparent"); add = nt.nodes.new("ShaderNodeAddShader")
nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(gem.outputs[0], add.inputs[1])
nt.links.new(add.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs[0])
try: mg.surface_render_method = "BLENDED"
except Exception: pass
glow = sphere("glow", 1.0, F + Vector((0, 0, 0.45)), mg, seg=24); glow.visible_shadow = False

# ───────────────────────── lights
fire_d = bpy.data.lights.new("fire", "POINT"); fire_d.color = (1.0, 0.55, 0.22); fire_d.shadow_soft_size = 0.03
fire_l = bpy.data.objects.new("fire", fire_d); sc.collection.objects.link(fire_l); fire_l.location = F + Vector((0, -0.05, 0.55))
bnc_d = bpy.data.lights.new("fire_bounce", "POINT"); bnc_d.color = (1.0, 0.6, 0.3); bnc_d.shadow_soft_size = 0.3; bnc_d.use_shadow = False   # fake fire bounce on his face
bnc = bpy.data.objects.new("fire_bounce", bnc_d); sc.collection.objects.link(bnc); bnc.location = F + Vector((-0.35, -0.75, 0.9))
sun_d = bpy.data.lights.new("moon", "SUN"); sun_d.color = (0.55, 0.65, 1.0); sun_d.energy = 0.55; sun_d.angle = math.radians(3)
sun = bpy.data.objects.new("moonlight", sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-150))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.06, 0.12, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35

# ───────────────────────── camera: still, three-quarter
cd = bpy.data.cameras.new("cam"); cd.lens = 32; cd.sensor_fit = "AUTO"
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.95, -4.5, 1.5)
tgt = bpy.data.objects.new("cam_target", None); sc.collection.objects.link(tgt); tgt.location = (-0.25, 0.6, 1.2)
c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"

# ───────────────────────── animation
N = a.frames
IGN = T(3.0)            # ignition frame (73)
SPARK0 = T(2.75)
rnd = random.Random(3)
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def flick(f, k):        # deterministic layered flicker in ~[-1,1]
    return 0.55 * math.sin(f * 0.9 + k) + 0.3 * math.sin(f * 2.3 + 2 * k) + 0.15 * math.sin(f * 5.1 + 3 * k)

RUB_X, RAISE_X = math.radians(-62), math.radians(-158)
for f in range(1, N + 1):
    t = (f - 1) / FPS
    joy = smooth((f - (IGN + 3)) / 9)             # arms go up over ~0.4 s after the burst
    rub = 1 - smooth((f - (IGN - 2)) / 4)          # rubbing stops at the burst
    osc = math.sin(t * 2 * math.pi * 3.2) * rub
    for s, piv in zip((-1, 1), arms):
        rx = RUB_X + s * osc * math.radians(9) + (RAISE_X - RUB_X) * joy + math.radians(6) * joy * math.sin(t * 9 + s)
        ry = math.radians(-30 * s) * joy * (1 if s > 0 else 1)
        ry = (math.radians(-28) if s < 0 else math.radians(28)) * joy
        rz = (math.radians(36) * (-s)) * (1 - joy)
        key(piv, "rotation_euler", f, (rx, ry, rz))
    # body: slight lean into the work, a startled pull-back at the spark, then a little hop of joy
    lean = math.radians(6) * rub + math.radians(1.5) * osc
    startle = math.exp(-((f - (IGN + 1)) / 3.0) ** 2)
    hop = max(0.0, math.sin((f - (IGN + 6)) / 10 * math.pi)) * 0.07 if IGN + 6 <= f <= IGN + 16 else 0.0
    hop += max(0.0, math.sin((f - (IGN + 20)) / 10 * math.pi)) * 0.05 if IGN + 20 <= f <= IGN + 30 else 0.0
    key(body, "rotation_euler", f, (lean - math.radians(8) * startle, 0, 0))
    sq = 1 + 0.04 * math.sin(t * 2 * math.pi * 3.2) * rub + 0.06 * joy
    key(body, "scale", f, (1 / math.sqrt(sq), 1 / math.sqrt(sq), sq))
    key(body, "location", f, (0, 0, hop))
    # mouth: small "o" while working, big open grin with joy
    key(mouth, "scale", f, (1.2 + 1.3 * joy, 0.4, 0.45 + 1.4 * joy + 0.4 * startle))
    for e in eyes: key(e, "scale", f, (0.85, 0.4, 1.2 + 0.35 * startle - 0.45 * joy))
    # fire: burst with overshoot, then flicker
    g_ = 0.0 if f < IGN else min(1.0, (f - IGN) / 5)
    burst = g_ * (1 + 0.35 * math.exp(-((f - (IGN + 6)) / 4.0) ** 2))
    for i, (o, h) in enumerate(flames):
        fl = flick(f, i * 1.7)
        sxy = max(1e-3, burst * (1 + 0.07 * fl))
        sz = max(1e-3, burst * (1 + 0.16 * flick(f + 3, i * 2.9)))
        key(o, "scale", f, (sxy, sxy, sz))
        key(o, "rotation_euler", f, (0.07 * flick(f, i + 5) * burst, 0.07 * flick(f, i + 9) * burst, i * 0.7 + f * 0.05))
    key(noise_ctl, "location", f, (0, 0, -f * 0.09))
    key(glow, "scale", f, tuple([max(1e-3, burst * (1 + 0.05 * flick(f, 11)))] * 3))
    key(embers, "scale", f, (max(0.001, g_), max(0.001, g_), 0.25 * max(0.001, g_)))
    spark_flash = math.exp(-((f - (IGN - 1)) / 1.5) ** 2)
    fire_d.energy = 160 * burst * (1 + 0.18 * flick(f, 21)) + 25 * spark_flash
    fire_d.keyframe_insert("energy", frame=f)
    bnc_d.energy = 0.8 * fire_d.energy; bnc_d.keyframe_insert("energy", frame=f)

# smoke: a thin curl of little puffs rising from where the sticks cross (2-3 s), thinning after the burst
bpy.context.view_layer.update()
rub_pt = root.matrix_world @ Vector((0.0, -0.52, 0.3))
msmoke = bpy.data.materials.new("smoke"); msmoke.use_nodes = True; nt = msmoke.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
se = nt.nodes.new("ShaderNodeEmission"); se.inputs[0].default_value = (0.62, 0.64, 0.72, 1)
st_ = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = 0.5
nt.links.new(se.outputs[0], mx.inputs[1]); nt.links.new(st_.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs[0])
try: msmoke.surface_render_method = "BLENDED"
except Exception: pass
LIFE = 26
for i, born in enumerate(range(T(1.9), T(3.3), 2)):
    p = sphere(f"smoke{i}", 1.0, rub_pt, msmoke, seg=12); p.visible_shadow = False
    for f in range(1, N + 1):
        u = (f - born) / LIFE
        if u < 0 or u > 1: sc_ = 1e-3; pos = rub_pt
        else:
            fade = 1.0 if born < IGN else 0.6
            sc_ = max(1e-3, (0.022 + 0.07 * u) * math.sin(math.pi * min(1, u * 1.15)) * fade)
            pos = rub_pt + Vector((0.12 * math.sin(u * 5 + i) * u + 0.15 * u, 0.05 * math.cos(u * 4 + i) * u, 0.9 * u))
        key(p, "location", f, tuple(pos)); key(p, "scale", f, (sc_, sc_, sc_))

# spark: a bright speck jumps from the sticks into the pit just before the burst
spark = sphere("spark", 0.035, rub_pt, _emit_mat("spark", (1.0, 0.95, 0.6, 1)), seg=8); spark.visible_shadow = False
for f in range(1, N + 1):
    u = (f - SPARK0) / (IGN - SPARK0)
    if 0 <= u <= 1:
        pos = rub_pt.lerp(F + Vector((0, 0, 0.12)), u) + Vector((0, 0, 0.25 * math.sin(math.pi * u)))
        s_ = 1.0 + 0.6 * math.sin(f * 3)
    else: pos, s_ = rub_pt, 1e-3
    key(spark, "location", f, tuple(pos)); key(spark, "scale", f, (s_, s_, s_))

# ───────────────────────── render
os.makedirs(a.out, exist_ok=True)
if a.blend: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.blend))
if a.stills:
    for fr in [int(x) for x in a.stills.split(",")]:
        sc.frame_set(fr); sc.render.filepath = os.path.join(os.path.abspath(a.out), f"still_{fr:04d}.png")
        bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = os.path.join(os.path.abspath(a.out), "f_")
    bpy.ops.render.render(animation=True)
print("PLATE_DONE", a.out, sc.frame_end, "frames")
