"""Clay Fire: a clay caveman rubs two sticks on a felt hill at night, a spark, clay flames swell, he throws his arms up.
5 s = 60 frames at 12 fps.  blender -b -P scenes/clay_fire.py -- [--still F] [--range A B] [--res W H] [--samples N] [--out DIR]
"""
import bpy, sys, os, math
SK = os.environ.get('CLAY_SKILL') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.claude', 'skills', 'blender-claymation')
sys.path.insert(0, os.path.join(SK, 'scripts'))
from claylib import *
from mathutils import Matrix

def plocal(child, par):
    child.parent = par
    child.matrix_parent_inverse = Matrix.Identity(4)
    return child


OPTS = cli('clay_fire')
reset()
sc = setup_render(res=OPTS['res'], samples=OPTS['samples'], frames=60)
world((0.05, 0.07, 0.16), 0.15)

SPARK, JOY = 26, 34

# ---------------------------------------------------------------- set: felt hill, night backdrop, rocks
felt = clay('felt', (0.16, 0.26, 0.12), rough=0.9, sss=0.0, bump=0.5, thumb=0.1)
ground = sphere('ground', r=1.0, loc=(0, 0.05, -1.0), scale=(1.0, 0.7, 1.0), mat=felt, segs=64, rings=32, lumpy=0.004, seed=2)
backdrop_m = clay('backdrop', (0.04, 0.06, 0.15), rough=0.95, sss=0.0, bump=0.2, thumb=0.05)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.42, 0.18), rotation=(math.radians(90), 0, 0))
bd = bpy.context.active_object; bd.scale = (1.4, 0.6, 1); assign(bd, backdrop_m)
moon_m = emissive('moon', (1.0, 0.95, 0.8), 2.0)
sphere('moon', r=0.025, loc=(0.16, 0.41, 0.26), mat=moon_m)
star_m = emissive('star', (1.0, 0.97, 0.85), 4.0)
import random
rnd = random.Random(4)
for i in range(26):
    sphere('star%d' % i, r=0.0018 + rnd.random() * 0.0016, loc=(rnd.uniform(-0.4, 0.4), 0.415, rnd.uniform(0.12, 0.34)), mat=star_m, segs=8, rings=4)
rock_m = clay('rock', (0.12, 0.11, 0.15), rough=0.75, bump=0.45, thumb=0.35)
for i, (x, y, s) in enumerate([(-0.13, 0.16, 0.05), (-0.07, 0.2, 0.035), (0.12, 0.18, 0.04), (0.17, 0.12, 0.028)]):
    sphere('rock%d' % i, r=s, loc=(x, y, 0.0), scale=(1.3, 1.0, 0.8), mat=rock_m, lumpy=0.006, seed=i)

# ---------------------------------------------------------------- the campfire
stone_m = clay('stone', (0.42, 0.41, 0.45), rough=0.7, bump=0.4, thumb=0.35)
wood_m = clay('wood', (0.33, 0.18, 0.08), rough=0.7, bump=0.5, thumb=0.4)
FX, FY = 0.035, 0.02
for i in range(8):
    a = i / 8 * math.tau
    sphere('st%d' % i, r=0.007, loc=(FX + math.cos(a) * 0.024, FY + math.sin(a) * 0.024, 0.004), scale=(1.3, 1, 0.8), mat=stone_m, lumpy=0.0015, seed=10 + i)
for i in range(3):
    a = i / 3 * math.tau + 0.4
    cylinder('log%d' % i, 0.0028, 0.04, loc=(FX + math.cos(a) * 0.008, FY + math.sin(a) * 0.008, 0.01), rot=(math.radians(62), 0, a + math.pi / 2), mat=wood_m, verts=16)
# the drill: a board and a stick (they go away when the fire takes)
board = rounded_box('board', (0.045, 0.012, 0.003), loc=(FX, FY - 0.004, 0.0035), mat=wood_m)
stick = cylinder('stick', 0.0016, 0.04, loc=(FX, FY - 0.004, 0.024), mat=wood_m, verts=12)
# flames: emissive clay tongues that swell from nothing at the spark
flames = []
fl_specs = [((0, 0, 0), 0.008, 0.060, (0.95, 0.18, 0.02), 3.5), ((-0.007, 0.002, 0), 0.006, 0.042, (0.95, 0.18, 0.02), 3.5),
            ((0.008, -0.002, 0), 0.006, 0.046, (0.95, 0.18, 0.02), 3.5), ((0, -0.002, 0.002), 0.006, 0.040, (1.0, 0.45, 0.03), 4),
            ((0, -0.004, 0.003), 0.003, 0.024, (1.0, 0.78, 0.25), 5)]
for i, ((dx, dy, dz), r, h, col, e) in enumerate(fl_specs):
    m = emissive('flame%d' % i, col, e)
    f = sphere('flame%d' % i, r=1.0, loc=(FX + dx, FY + dy, 0.008 + dz), mat=m, segs=24, rings=12, lumpy=0.0, seed=20 + i)
    flames.append((f, r, h))
spark_m = emissive('spark', (1.0, 0.95, 0.7), 20)
spark = sphere('spark', r=0.004, loc=(FX, FY - 0.004, 0.006), mat=spark_m, segs=12, rings=6)
fire_light = point_light('fire', (FX, FY - 0.01, 0.03), 0.0, radius=0.01, color=(1.0, 0.55, 0.22))
smoke_m = clay('smoke', (0.75, 0.74, 0.8), rough=0.9, sss=0.1, bump=0.2, thumb=0.1)
puffs = [sphere('puff%d' % i, r=1.0, loc=(FX, FY - 0.004, 0.02), mat=smoke_m, segs=16, rings=8) for i in range(4)]

# ---------------------------------------------------------------- the caveman (about 7 cm tall)
skin = clay('skin', (0.80, 0.48, 0.30), rough=0.6, sss=0.15, bump=0.35, thumb=0.3)
hide = clay('hide', (0.55, 0.33, 0.14), rough=0.7, bump=0.45, thumb=0.35)
spot = clay('spot', (0.30, 0.17, 0.07), rough=0.7, bump=0.3, thumb=0.2)
hair = clay('hair', (0.12, 0.07, 0.04), rough=0.8, bump=0.6, thumb=0.4)
root = empty('man', loc=(-0.02, 0.0, 0.0))
root.rotation_euler = (0, 0, math.radians(55))
torso = empty('torso', loc=(0, 0, 0.022), parent=root)
body = sphere('body', r=0.014, loc=(0, 0, 0.012), scale=(1.0, 0.8, 1.35), mat=hide, lumpy=0.0015, seed=31); plocal(body, torso)
for i, (x, z) in enumerate([(-0.006, 0.006), (0.005, 0.016), (0.008, 0.003)]):
    s = sphere('spot%d' % i, r=0.0028, loc=(x, -0.0105, z), scale=(1, 0.4, 1), mat=spot); plocal(s, torso)
head = sphere('head', r=0.0105, loc=(0.002, 0, 0.037), mat=skin, lumpy=0.001, seed=32); plocal(head, torso)
h = sphere('hair', r=0.012, loc=(-0.001, 0.003, 0.041), scale=(1, 1, 0.8), mat=hair, lumpy=0.002, seed=33); plocal(h, torso)
beard = sphere('beard', r=0.008, loc=(0.004, -0.006, 0.031), scale=(1, 0.8, 0.9), mat=hair, lumpy=0.0015, seed=34); plocal(beard, torso)
eye_m = glossy_black()
for sx in (-0.0035, 0.0045):
    e = sphere('eye', r=0.0014, loc=(0.002 + sx, -0.0098, 0.039), mat=eye_m, segs=12, rings=6); plocal(e, torso)
arms = []
for side in (-1, 1):
    sh = empty('shoulder%d' % side, loc=(side * 0.012, 0, 0.026), parent=torso)
    arm = cylinder('arm%d' % side, 0.0028, 0.018, loc=(0, 0, -0.009), mat=skin, verts=16); plocal(arm, sh)
    hand = sphere('hand%d' % side, r=0.0035, loc=(0, 0, -0.019), mat=skin); plocal(hand, sh)
    arms.append(sh)
for side in (-1, 1):
    leg = cylinder('leg%d' % side, 0.0032, 0.02, loc=(side * 0.006, 0, 0.01), mat=skin, verts=16); plocal(leg, root)
    foot = sphere('foot%d' % side, r=0.004, loc=(side * 0.006, -0.003, 0.002), scale=(1, 1.5, 0.6), mat=skin); plocal(foot, root)

# ---------------------------------------------------------------- lights and camera
area_light('key', (-0.25, -0.25, 0.35), (0, 0, 0.02), 3.0, 0.25, color=(0.75, 0.82, 1.0))
area_light('rim', (0.2, 0.3, 0.12), (0, 0, 0.02), 1.2, 0.2, color=(0.6, 0.7, 1.0))
camera((0.0, -0.36, 0.09), (0.0, 0.03, 0.03), lens=55, fstop=2.8, focus=0.37)

# ---------------------------------------------------------------- animation (on twos: keys every 2 frames)
boil = Boil(5)
for f in range(1, 61, 2):
    rub = math.sin(f * 1.4)
    lit = f >= SPARK
    k = ease_out_back(seg(f, SPARK, SPARK + 8)) if lit else 0.0
    joy = ease(seg(f, JOY, JOY + 6))
    hop = abs(math.sin((f - JOY) * 0.55)) * 0.008 * joy if f > JOY + 6 else 0.0
    # crouched forward over the drill, then up with arms high
    key(torso, f, loc=(0.004 * (1 - joy), 0, 0.022 - 0.008 * (1 - joy) + hop), rot=(math.radians(-30 * (1 - joy)), 0, 0))
    bv = boil.v(); key(root, f, loc=(-0.02 + bv[0], bv[1], hop * 0.3 + bv[2]))
    for i, sh in enumerate(arms):
        side = -1 if i == 0 else 1
        if joy > 0.01:
            sh.rotation_euler = (math.radians(-20 * joy), math.radians(side * 118 * joy), 0); sh.keyframe_insert('rotation_euler', frame=f)
        else:
            sh.rotation_euler = (math.radians(-60 + rub * 12 * side), math.radians(side * 20), 0); sh.keyframe_insert('rotation_euler', frame=f)
    # the stick spins and wobbles while rubbing; board and stick vanish once the fire takes
    for ob in (stick, board):
        ob.scale = (1, 1, 1) if not lit else (0.001, 0.001, 0.001); ob.keyframe_insert('scale', frame=f)
    stick.rotation_euler = (math.radians(rub * 6), 0, f * 0.9); stick.keyframe_insert('rotation_euler', frame=f)
    # smoke before the spark
    for i, p in enumerate(puffs):
        life = ((f - 6) * 0.05 + i / 4) % 1
        amt = seg(f, 6, 14) * (1 - seg(f, SPARK + 4, SPARK + 12))
        p.location = (FX + math.sin(f * 0.3 + i) * 0.004, FY - 0.004, 0.012 + life * 0.05)
        s = (0.002 + life * 0.006) * amt + 0.00001
        p.scale = (s, s, s); p.keyframe_insert('location', frame=f); p.keyframe_insert('scale', frame=f)
    # the spark flash
    s = 1.0 if SPARK <= f < SPARK + 4 else 0.001
    spark.scale = (s, s, s); spark.keyframe_insert('scale', frame=f)
    # flames swell and flicker
    for i, (fl, r, hgt) in enumerate(flames):
        flick = 1 + 0.12 * math.sin(f * 1.7 + i * 2)
        w = max(0.0001, r * k); hh = max(0.0001, hgt * 0.5 * k * flick)
        fl.scale = (w, w, hh); fl.location.z = 0.006 + hh * 0.9
        fl.keyframe_insert('scale', frame=f); fl.keyframe_insert('location', frame=f)
    fire_light.data.energy = 2.5 * k * (0.9 + 0.1 * math.sin(f * 2.3)); fire_light.data.keyframe_insert('energy', frame=f)
constant_interp()
run(sc, OPTS)
