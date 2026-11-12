// The science of fire: 5 s, 1920x1080. Three beats, one continuous world:
//   0-1.5   two sticks rub: scorch, sparks, heat gauge climbs           (camera close on the contact)
//   1.5-3   the fire triangle (HEAT orb, FUEL = CH4, OXYGEN = O2) assembles around the new flame (camera pulls back)
//   3-5     HERO: CH4 + 2 O2 -> CO2 + 2 H2O; bonds break, atoms regroup, bonds form, the flame grows behind
import * as THREE from '/_vendor/three.module.js';
import {
  boot, createStage, overlay, molecule, reaction, MOL, withSize, drift, flame, sparks, smoke, airField, stick, decal, orb, beam, glowSprite,
  scorchTex, softDotTex, track, seg, env, bell, lerp, clamp, ease, PAL,
} from './engine/index.js';

const W = 1920, H = 1080, DUR = 5;
let S, O, F, spk, smk, air, bottom, top, scorch, ember, hotspot, heat, edges, R;

// ---------- layout (world units = angstrom for molecules) ----------
// The bottom stick lies on the ground and recedes to the right (yaw), so in the wide shots it runs into depth
// instead of doubling the triangle's base line. The top stick is a fire plough: it rubs along the same axis.
const STICK_Y = -2.95, STICK_Z = -3.0, STICK_R = 0.24, YAW = 0.55;
const AX = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));            // bottom stick axis
const CONTACT = [0.1, STICK_Y + STICK_R, STICK_Z];
const V = { heat: [0, 2.1, 0.3], fuel: [-3.0, -2.0, 0.3], oxy: [3.0, -2.0, 0.3] };
const TOP_DIR = AX.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.62, 0)).normalize(), TOP_LEN = 4.2;

// rubbing: back and forth along the bottom stick, ~2.6 Hz, stops by 1.55 s
const rubAmp = (t) => 0.3 * (1 - seg(t, 1.25, 1.6, 'inOutSine'));
const rubOff = (t) => rubAmp(t) * Math.sin(t * Math.PI * 2 * 2.6);
const heatLevel = (t) => seg(t, 0.1, 1.45, 'inOutSine');

// camera keys: [t, [tx, ty, tz, dist, az, el]]
const cam = track([
  [0, [0.2, -2.55, -3.0, 5.2, 4, 16]],
  [1.2, [0.1, -2.5, -3.0, 4.7, 12, 13]],
  // wide shots look down ~15 deg: the flame (further back) then sits inside the triangle, above its base edge
  [2.15, [0, -0.5, 0, 12.6, -5, 16], 'inOutCubic'],
  [2.9, [0, -0.45, 0, 12.4, -1, 15]],
  [3.6, [0, -0.1, 0.3, 10.6, 2, 14], 'inOutCubic'],
  [5, [0, -0.05, 0.3, 10.2, 8, 13]],
]);

// ---------- reactant / product poses ----------
const pop = (a, b) => (t) => ease.outBack(seg(t, a, b));
const P = (keys) => { const p = track(keys.map(([t, v, e]) => [t, v.pos, e])), r = track(keys.map(([t, v, e]) => [t, v.rot, e])); return (t) => ({ pos: p(t), rot: r(t) }); };

const CH4_ROT = [0.15, 0.0, 0.0];
const ch4Pose = P([
  [0, { pos: V.fuel, rot: CH4_ROT }],
  [2.95, { pos: [V.fuel[0] + 0.1, V.fuel[1] + 0.05, V.fuel[2]], rot: [0.15, 0.9, 0.05] }],
  [3.55, { pos: [0, -0.05, 0.3], rot: [0.15, 1.57, 0.0] }, 'inOutCubic'],
  [5, { pos: [0, -0.05, 0.3], rot: [0.15, 1.75, 0.0] }],
]);
const o2aPose = P([
  [0, { pos: V.oxy, rot: [0, 0, 0.5] }],
  [2.95, { pos: [V.oxy[0], V.oxy[1] + 0.05, V.oxy[2]], rot: [0.6, 0.2, 0.55] }],
  [3.55, { pos: [2.15, 1.2, 0.3], rot: [0, 0, -0.2] }, 'inOutCubic'],
  [5, { pos: [2.15, 1.2, 0.3], rot: [0, 0, -0.2] }],
]);
const o2bPose = P([
  [0, { pos: [-7.5, 3.4, -3], rot: [0, 0, 0.8] }],
  [2.85, { pos: [-7.5, 3.4, -3], rot: [0, 0, 0.8] }],
  [3.55, { pos: [-2.15, 1.2, 0.3], rot: [0, 0, 0.2] }, 'inOutCubic'],
  [5, { pos: [-2.15, 1.2, 0.3], rot: [0, 0, 0.2] }],
]);
// products drift apart a little and keep turning during the hold
const co2Pose = drift([0, 1.0, 0.3], [0, 0.35, 0], 0.5);
const w1Pose = drift([-2.75, -0.55, 0.6], [-0.6, -0.2, 0], -0.7);
const w2Pose = drift([2.75, -0.55, 0.6], [0.6, -0.2, 0], 0.7);

async function setup() {
  S = createStage({ width: W, height: H, aperture: 0.0007, maxblur: 0.009, bloom: 0.6, bloomThreshold: 0.8, fogNear: 13, fogFar: 32 });
  O = overlay(S);
  air = airField(S, { count: 11, box: [[-17, 17], [-8, 9], [-22, -12]], scale: 0.55 });

  // sticks: bottom lies on the ground, top leans on it and rubs along its axis
  bottom = stick(S, { length: 6.5, radius: STICK_R, seed: 3 });
  bottom.rotation.set(0, YAW, Math.PI / 2); bottom.position.set(CONTACT[0], STICK_Y, STICK_Z);
  top = stick(S, { length: TOP_LEN, radius: 0.2, seed: 8 });
  top.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), TOP_DIR);
  const flat = (m, y) => { m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, YAW, 0); m.position.set(CONTACT[0], CONTACT[1] + y, STICK_Z); };
  scorch = decal(S, scorchTex(), { color: '#0d0603', w: 1.1, h: 0.36 }); flat(scorch, 0.006);
  ember = decal(S, softDotTex(128, 1.6), { color: PAL.ember, w: 0.9, h: 0.17, additive: true }); flat(ember, 0.012);
  hotspot = glowSprite(S, PAL.heat);

  F = flame(S, { base: [CONTACT[0], CONTACT[1] - 0.05, STICK_Z], seed: 4 });
  spk = sparks(S, { seed: 7, count: 30, life: 0.45, speed: 2.6, gravity: -6, size: 0.12, color: PAL.flameMid });
  smk = smoke(S, { seed: 12, count: 9 });

  // fire triangle
  heat = orb(S, { color: PAL.heat });
  edges = [0, 1, 2].map(() => beam(S, { color: PAL.accent, radius: 0.018 }));

  // the hero reaction (also supplies the FUEL and OXYGEN nodes of the triangle)
  R = reaction(S, {
    reactants: [
      { spec: withSize(MOL.CH4(), pop(1.72, 2.1)), pose: ch4Pose },
      { spec: withSize(MOL.O2(), pop(1.84, 2.2)), pose: o2aPose },
      { spec: withSize(MOL.O2(), (t) => (t > 2.85 ? 1 : 0)), pose: o2bPose },
    ],
    products: [{ spec: MOL.CO2(), pose: co2Pose }, { spec: MOL.H2O(), pose: w1Pose }, { spec: MOL.H2O(), pose: w2Pose }],
    // flattened reactant atoms: CH4 [C,H1,H2,H3,H4], O2a [O,O], O2b [O,O]
    map: [[0, 0], [2, 1], [2, 2], [1, 1], [1, 2], [0, 2], [2, 0], [1, 0], [0, 1]],
    move: [3.62, 4.3], breakAt: [3.55, 3.78], formAt: [4.02, 4.3], stagger: 0.025,
    lift: (k) => (k >= 1 && k <= 4 ? [0, -0.35, 0.5] : null),
    vibrate: (t) => 0.012 + 0.05 * bell(t, 3.2, 3.9),
  });
}

function frame(t) {
  // camera
  const [tx, ty, tz, dist, az, el] = cam(t);
  S.orbit({ target: [tx, ty, tz], dist, az, el });
  S.focusOn([tx, ty, tz]);

  air(t);

  // ---- beat 1: sticks rubbing
  const h = heatLevel(t);
  const tip = new THREE.Vector3(...CONTACT).addScaledVector(AX, rubOff(t)); tip.y += 0.17;
  top.position.copy(tip).addScaledVector(TOP_DIR, TOP_LEN / 2 - 0.05);
  scorch.material.opacity = 0.9 * seg(t, 0.1, 1.0);
  scorch.scale.x = 0.5 + 0.6 * seg(t, 0.05, 1.0);
  ember.material.opacity = 0.7 * (0.3 + 0.7 * h) * seg(t, 0.05, 0.4) * (0.85 + 0.15 * Math.sin(t * 31)) * (1 - 0.6 * seg(t, 3, 4));
  ember.scale.set(0.6 + 0.6 * h, 1, 1);
  hotspot.position.set(tip.x, CONTACT[1] + 0.05, tip.z + 0.05); hotspot.scale.setScalar(0.5 + 1.1 * h);
  hotspot.material.opacity = (0.25 + 0.6 * h) * seg(t, 0.05, 0.4) * (1 - seg(t, 1.6, 2.2));
  spk(t, { origin: [tip.x, CONTACT[1] + 0.08, tip.z + 0.1], rate: 0.45 + 0.55 * seg(t, 0.3, 1.2) - seg(t, 1.6, 2.2), period: 0.5 });
  smk(t, { origin: [CONTACT[0], CONTACT[1] + 0.2, STICK_Z], amount: seg(t, 0.5, 1.3) * (1 - seg(t, 1.6, 2.2)), height: 1.4 });

  // flame: ignites at ~1.4 s, small through beat 2, grows big in beat 3 (bonds forming push it further)
  const fh = lerp(0, 1.7, seg(t, 1.35, 1.95, 'outCubic')) + 2.4 * seg(t, 3.0, 4.6, 'inOutSine') + 0.5 * bell(t, 4.0, 4.8);
  F.update(t, { height: fh, width: 0.6 + 0.35 * fh, power: seg(t, 1.35, 1.6) });

  // ---- beat 2: the fire triangle
  const tri = env(t, 1.55, 3.3, 0.35, 0.35);
  heat.update(t, { pos: V.heat, size: 0.34 * ease.outBack(seg(t, 1.6, 1.95)) * (1 - seg(t, 3.0, 3.35)), power: tri });
  const pts = [V.heat, V.fuel, V.oxy];
  edges.forEach((e, i) => {
    const a = pts[i], b = pts[(i + 1) % 3];
    // stop short of the nodes so the lines read as a diagram, not as bonds
    const dir = b.map((v, j) => v - a[j]), L = Math.hypot(...dir), u = dir.map((v) => v / L), pad = 1.3;
    e.update(a.map((v, j) => v + u[j] * pad), b.map((v, j) => v - u[j] * pad), seg(t, 1.95 + i * 0.12, 2.4 + i * 0.12, 'inOutCubic'), tri);
  });

  // ---- beat 3: reaction
  R.update(t);
  S.render();

  // ---------- overlay ----------
  O.begin();
  O.vignette(0.55);
  O.header({ kicker: 'THE SCIENCE OF FIRE', title: null, k: seg(t, 0.05, 0.45) });
  const titles = [['Friction makes heat', 0, 1.6], ['The fire triangle', 1.6, 3.05], ['Combustion', 3.05, 5.2]];
  titles.forEach(([txt, a, b], i) => {
    const k = env(t, a, b, i ? 0.3 : 0.4, 0.25);
    if (k > 0) O.header({ kicker: '', title: `${i + 1}   ${txt}`, k, y: 92 });
  });

  // beat 1 labels
  const k1 = env(t, 0.08, 1.6, 0.35, 0.25);
  O.label({ at: [CONTACT[0], CONTACT[1] + 0.05, STICK_Z], text: 'FRICTION', sub: 'motion turns into heat', dx: -230, dy: -190, k: k1, color: PAL.heat });
  if (k1 > 0) {
    // double arrow along the rubbing axis, just below the bottom stick
    const c = new THREE.Vector3(CONTACT[0], STICK_Y - 0.55, STICK_Z), q = (s_) => O.project(c.clone().addScaledVector(AX, s_)).map((v) => v / O.scale);
    const [a0, a1] = [q(-0.55), q(0.55)];
    O.arrow(a0[0], a0[1], a1[0], a1[1], { k: k1, both: true, color: PAL.ink });
  }
  const tmp = Math.round(lerp(20, 300, h) / 5) * 5;
  O.meter({ x: 1700, y: 330, h: 400, value: h, text: 'TEMPERATURE', readout: `${tmp} °C`, k: env(t, 0.2, 1.75, 0.35, 0.3) });

  // beat 2 labels
  const kl = (a) => env(t, a, 3.05, 0.4, 0.25);
  const up = new THREE.Vector3(...V.heat);
  O.label({ at: up, text: 'HEAT', sub: 'energy to start it', dx: 170, dy: -40, k: kl(2.05), color: PAL.heat });
  O.label({ at: R.center(R.reactants[0]), text: 'FUEL', sub: 'methane, CH₄', dx: -190, dy: 110, k: kl(2.15), color: PAL.accent });
  O.label({ at: R.center(R.reactants[1]), text: 'OXYGEN', sub: 'O₂ from the air', dx: 170, dy: 110, k: kl(2.25), color: PAL.accent });

  // beat 3: names of the reactants, then of the products; equation along the bottom
  const kr = env(t, 3.3, 3.62, 0.15, 0.12);
  ['CH4', 'O2', 'O2'].forEach((n, i) => O.tag({ at: R.center(R.reactants[i]), text: n, dy: i ? -80 : 110, k: kr }));
  const kp = seg(t, 4.28, 4.5);
  O.tag({ at: R.center(R.products[0]), text: 'CO2', dy: -90, k: kp, size: 36 });
  O.tag({ at: R.center(R.products[1]), text: 'H2O', dy: 105, k: seg(t, 4.31, 4.53), size: 36 });
  O.tag({ at: R.center(R.products[2]), text: 'H2O', dy: 105, k: seg(t, 4.34, 4.56), size: 36 });
  const ke = seg(t, 3.05, 3.4);
  if (ke > 0) {
    const hi = t < 3.6 ? [0, 1] : t < 4.3 ? null : [2, 3];
    O.formula({ text: 'CH4 + 2 O2 -> CO2 + 2 H2O', x: 960, y: 985, center: true, k: ke, hi });
  }
  O.label({ at: [CONTACT[0] + 0.3, -0.6, STICK_Z], text: 'ENERGY RELEASED', sub: 'new bonds give off heat and light', dx: 330, dy: -40, k: seg(t, 4.15, 4.55), color: PAL.heat });
}

boot({ dur: DUR, setup, frame });
