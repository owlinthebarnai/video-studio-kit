// molecule.js: molecules from a small atom/bond list, rigid-body poses, and reactions (bonds breaking/forming by t).
//
// Spec format (angstrom units):  { atoms: [{ el: 'C', pos: [0,0,0] }, ...], bonds: [{ a: 0, b: 1, order: 1 }, ...] }
//   atom.pos may be a function (t) -> [x,y,z]; atom.size a number or (t) -> multiplier (0 hides the atom).
//   bond.life = { form: [t0, t1], break: [t0, t1] } (either optional): halves grow from / retract into their atoms.
//
// const m = molecule(S, MOL.CH4(), { pose: (t) => ({ pos: [0,0,0], rot: [0, t * 0.4, 0] }) });
// const r = reaction(S, { reactants: [...], products: [...], map, move, breakAt, formAt });
// in render(t): m.update(t)   (needs S.camera, used to fan double bonds toward the viewer)
import * as THREE from '/_vendor/three.module.js';
import { ELEMENTS, BOND, PAL } from './palette.js';
import { seg, lerp, bell, noise1, clamp, smoothstep, E } from './core.js';
import { softDotTex } from './textures.js';
import { GLOW } from './stage.js';

// ---------- presets (local coordinates, A) ----------
const TET = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((v) => v.map((x) => x / Math.sqrt(3)));
const sc = (v, s) => v.map((x) => x * s);
const bent = (len, angDeg) => { const h = (angDeg / 2) * Math.PI / 180; return [[-Math.sin(h) * len, -Math.cos(h) * len, 0], [Math.sin(h) * len, -Math.cos(h) * len, 0]]; };
export const MOL = {
  H2: () => ({ atoms: [{ el: 'H', pos: [-0.37, 0, 0] }, { el: 'H', pos: [0.37, 0, 0] }], bonds: [{ a: 0, b: 1 }] }),
  O2: () => ({ atoms: [{ el: 'O', pos: [-0.605, 0, 0] }, { el: 'O', pos: [0.605, 0, 0] }], bonds: [{ a: 0, b: 1, order: 2 }] }),
  N2: () => ({ atoms: [{ el: 'N', pos: [-0.55, 0, 0] }, { el: 'N', pos: [0.55, 0, 0] }], bonds: [{ a: 0, b: 1, order: 3 }] }),
  H2O: () => { const [h1, h2] = bent(0.96, 104.5); return { atoms: [{ el: 'O', pos: [0, 0.25, 0] }, { el: 'H', pos: [h1[0], h1[1] + 0.25, 0] }, { el: 'H', pos: [h2[0], h2[1] + 0.25, 0] }], bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }] }; },
  CO2: () => ({ atoms: [{ el: 'C', pos: [0, 0, 0] }, { el: 'O', pos: [-1.16, 0, 0] }, { el: 'O', pos: [1.16, 0, 0] }], bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2, order: 2 }] }),
  CH4: () => ({ atoms: [{ el: 'C', pos: [0, 0, 0] }, ...TET.map((d) => ({ el: 'H', pos: sc(d, 1.09) }))], bonds: [1, 2, 3, 4].map((b) => ({ a: 0, b })) }),
  NH3: () => ({ atoms: [{ el: 'N', pos: [0, 0.12, 0] }, ...[0, 1, 2].map((k) => { const a = k * 2.094; return { el: 'H', pos: [Math.cos(a) * 0.94, -0.26, Math.sin(a) * 0.94] }; })], bonds: [1, 2, 3].map((b) => ({ a: 0, b })) }),
  // ethanol, a typical wood/biomass volatile
  C2H5OH: () => ({
    atoms: [{ el: 'C', pos: [-0.75, -0.2, 0] }, { el: 'C', pos: [0.75, 0.2, 0] }, { el: 'O', pos: [1.6, -0.85, 0] },
      { el: 'H', pos: [-1.1, 0.3, 0.9] }, { el: 'H', pos: [-1.1, 0.3, -0.9] }, { el: 'H', pos: [-1.05, -1.25, 0] },
      { el: 'H', pos: [1.0, 0.8, 0.9] }, { el: 'H', pos: [1.0, 0.8, -0.9] }, { el: 'H', pos: [2.45, -0.45, 0] }],
    bonds: [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5], [1, 6], [1, 7], [2, 8]].map(([a, b]) => ({ a, b })),
  }),
};

// ---------- poses ----------
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3();
// Apply a pose { pos, rot (euler radians), scale } to a local point.
export function applyPose(p, pose) {
  _e.set(...(pose.rot || [0, 0, 0])); _q.setFromEuler(_e);
  _v.set(...p).multiplyScalar(pose.scale ?? 1).applyQuaternion(_q);
  const o = pose.pos || [0, 0, 0]; return [_v.x + o[0], _v.y + o[1], _v.z + o[2]];
}
// Turn a spec into per-atom functions of t following poseFn(t) -> { pos, rot, scale }.
export function rigid(spec, poseFn) {
  return { atoms: spec.atoms.map((a) => ({ ...a, pos: (t) => applyPose(a.pos, poseFn(t)) })), bonds: spec.bonds.map((b) => ({ ...b })) };
}
// Static copy at a fixed pose.
export const place = (spec, pose) => ({ atoms: spec.atoms.map((a) => ({ ...a, pos: applyPose(a.pos, pose) })), bonds: spec.bonds.map((b) => ({ ...b })) });
// Blend two position functions over [t0, t1] with an optional sideways arc (lift: [x,y,z] at mid-way).
export function blendPos(fa, fb, t0, t1, e = 'inOutCubic', lift = null) {
  return (t) => {
    const k = seg(t, t0, t1, e), a = fa(t), b = fb(t), s = Math.sin(Math.PI * k);
    return [0, 1, 2].map((i) => lerp(a[i], b[i], k) + (lift ? lift[i] * s : 0));
  };
}

// ---------- materials ----------
const MATS = {};
export function atomMaterial(el) {
  if (!MATS[el]) {
    const e = ELEMENTS[el] || ELEMENTS.C;
    MATS[el] = new THREE.MeshPhysicalMaterial({ color: e.color, roughness: el === 'H' ? 0.3 : 0.34, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#9fb6ff') });
  }
  return MATS[el];
}

let SPHERE, STICK, DOT;
const geo = () => {
  if (!SPHERE) {
    SPHERE = new THREE.SphereGeometry(1, 48, 32);
    STICK = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true); STICK.translate(0, 0.5, 0);
    DOT = softDotTex(128, 2.4);
  }
};
const val = (v, t, d = 1) => (v === undefined ? d : typeof v === 'function' ? v(t) : v);

// ---------- the molecule view ----------
// opts: { pose: (t) => pose | pose, style: 0 ball-and-stick .. 1 space-filling (number or fn),
//         vibrate: (t) => amplitude A (thermal jiggle), flashes: true (sparks where bonds break / form), seed }
export function molecule(S, spec, opts = {}) {
  geo();
  const group = new THREE.Group(); (opts.parent || S.scene).add(group);
  const atoms = spec.atoms.map((a, i) => {
    const mesh = new THREE.Mesh(SPHERE, atomMaterial(a.el)); group.add(mesh);
    return { ...a, i, mesh, p: new THREE.Vector3(), r: 0 };
  });
  const bonds = spec.bonds.map((b) => {
    const order = b.order || 1, halves = [];
    for (let k = 0; k < order * 2; k++) { const m = new THREE.Mesh(STICK, atomMaterial(atoms[k % 2 ? b.b : b.a].el)); group.add(m); halves.push(m); }
    let flash = null;
    if (opts.flashes !== false && b.life) {
      flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: b.life.form ? PAL.flameCore : '#CFE6FF', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
      flash.layers.set(GLOW); group.add(flash);
    }
    return { ...b, order, halves, flash };
  });
  const Y = new THREE.Vector3(0, 1, 0), camL = new THREE.Vector3(), d = new THREE.Vector3(), perp = new THREE.Vector3(), mid = new THREE.Vector3(), tmp = new THREE.Vector3();
  const seed = opts.seed ?? 1;

  function life(b, t) {
    let k = 1;
    if (b.life?.form) k *= seg(t, b.life.form[0], b.life.form[1], 'outCubic');
    if (b.life?.break) k *= 1 - seg(t, b.life.break[0], b.life.break[1], 'inCubic');
    return k;
  }

  function update(t) {
    const pose = typeof opts.pose === 'function' ? opts.pose(t) : opts.pose;
    if (pose) { group.position.set(...(pose.pos || [0, 0, 0])); group.rotation.set(...(pose.rot || [0, 0, 0])); group.scale.setScalar(pose.scale ?? 1); }
    group.updateMatrixWorld(true);
    const style = clamp(val(opts.style, t, 0)), amp = val(opts.vibrate, t, 0);
    for (const a of atoms) {
      const p = typeof a.pos === 'function' ? a.pos(t) : a.pos;
      a.p.set(...p);
      if (amp > 0) { const s = seed * 17 + a.i * 3.1; a.p.x += noise1(t * 9 + s, 1) * amp; a.p.y += noise1(t * 9 + s, 2) * amp; a.p.z += noise1(t * 9 + s, 3) * amp; }
      const e = ELEMENTS[a.el] || ELEMENTS.C;
      a.r = lerp(e.ball, e.vdw * 0.92, style) * val(a.size, t, 1);
      a.mesh.visible = a.r > 1e-3; a.mesh.position.copy(a.p); a.mesh.scale.setScalar(Math.max(a.r, 1e-4));
    }
    camL.copy(S.camera.position); group.worldToLocal(camL);
    const stickVis = 1 - smoothstep(0.55, 0.9, style);
    for (const b of bonds) {
      const A = atoms[b.a], B = atoms[b.b], k = life(b, t) * stickVis * Math.min(val(A.size, t, 1), val(B.size, t, 1), 1);
      d.subVectors(B.p, A.p); const L = d.length(); d.divideScalar(L || 1);
      mid.addVectors(A.p, B.p).multiplyScalar(0.5);
      // double/triple bonds fan out in the plane facing the camera, so they always read
      tmp.subVectors(camL, mid); perp.crossVectors(d, tmp).normalize();
      const rad = BOND.radius * (b.order > 1 ? 0.72 : 1) * (0.55 + 0.45 * k);
      for (let s = 0; s < b.order; s++) {
        const off = (s - (b.order - 1) / 2) * BOND.gap * 2;
        for (let h = 0; h < 2; h++) {
          const m = b.halves[s * 2 + h], from = h ? B.p : A.p;
          m.visible = k > 0.01;
          if (!m.visible) continue;
          m.position.copy(from).addScaledVector(perp, off);
          m.quaternion.setFromUnitVectors(Y, h ? tmp.copy(d).negate() : d);
          m.scale.set(rad, L * 0.5 * k, rad);
        }
      }
      if (b.flash) {
        const w = [b.life.break, b.life.form].filter(Boolean).map((r) => bell(t, r[0] - 0.05, r[1] + 0.18));
        const f = Math.max(...w);
        b.flash.visible = f > 0.01; b.flash.position.copy(mid); b.flash.material.opacity = f * 0.55; b.flash.scale.setScalar(0.35 + f * 0.6);
      }
    }
  }
  const world = (i) => atoms[i].mesh.getWorldPosition(new THREE.Vector3());
  const center = (idx = atoms.map((a) => a.i)) => { const c = new THREE.Vector3(); idx.forEach((i) => c.add(world(i))); return c.divideScalar(idx.length); };
  const radius = (i) => atoms[i].r * group.scale.x;
  return { group, atoms, bonds, update, world, center, radius };
}

// ---------- reactions ----------
// reaction(S, {
//   reactants: [{ spec, pose: (t)=>pose }, ...], products: [{ spec, pose: (t)=>pose }, ...],
//   map: [[productIndex, atomIndex], ...]   one entry per reactant atom, in flattened reactant order,
//   move: [t0, t1]  atoms travel from reactant poses to product poses (inOutCubic, with arcs),
//   breakAt: [t0, t1], formAt: [t0, t1], stagger: 0.04 (s between successive bond events), lift: (atomIdx) => [x,y,z] | null })
// Bonds present in both (same atom pair) are kept. Returns a molecule() plus { groups: { reactants, products } } atom index lists.
export function reaction(S, o) {
  const atoms = [], bonds = [], rOf = [], start = [];
  o.reactants.forEach((r, ri) => {
    const base = atoms.length; start.push(base);
    r.spec.atoms.forEach((a, ai) => { atoms.push({ el: a.el, rPos: (t) => applyPose(a.pos, r.pose(t)), size: a.size }); rOf.push([ri, ai]); });
    r.spec.bonds.forEach((b) => bonds.push({ a: base + b.a, b: base + b.b, order: b.order || 1, side: 'r' }));
  });
  // product atom -> reactant atom
  const inv = {};
  o.map.forEach(([pi, ai], k) => { inv[pi + ':' + ai] = k; });
  atoms.forEach((a, k) => {
    const [pi, ai] = o.map[k], P = o.products[pi];
    const pPos = (t) => applyPose(P.spec.atoms[ai].pos, P.pose(t));
    a.pos = blendPos(a.rPos, pPos, o.move[0], o.move[1], 'inOutCubic', o.lift ? o.lift(k) : null);
  });
  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const pb = [];
  o.products.forEach((P, pi) => P.spec.bonds.forEach((b) => pb.push({ a: inv[pi + ':' + b.a], b: inv[pi + ':' + b.b], order: b.order || 1 })));
  const pKeys = new Set(pb.map((b) => key(b.a, b.b) + ':' + b.order)), rKeys = new Set(bonds.map((b) => key(b.a, b.b) + ':' + b.order));
  const st = o.stagger ?? 0.04; let nb = 0, nf = 0;
  const out = [];
  for (const b of bonds) {
    if (pKeys.has(key(b.a, b.b) + ':' + b.order)) { out.push(b); continue; }
    const t0 = o.breakAt[0] + st * nb++, t1 = Math.max(t0 + 0.08, o.breakAt[1] + st * (nb - 1));
    out.push({ ...b, life: { break: [t0, t1] } });
  }
  for (const b of pb) {
    if (rKeys.has(key(b.a, b.b) + ':' + b.order)) continue;
    const t0 = o.formAt[0] + st * nf++, t1 = Math.max(t0 + 0.08, o.formAt[1] + st * (nf - 1));
    out.push({ ...b, life: { form: [t0, t1] } });
  }
  const m = molecule(S, { atoms, bonds: out }, o);
  // indices of the atoms of each product / reactant (for labels)
  m.products = o.products.map((P, pi) => P.spec.atoms.map((_, ai) => inv[pi + ':' + ai]));
  m.reactants = o.reactants.map((r, ri) => r.spec.atoms.map((_, ai) => start[ri] + ai));
  return m;
}

// Per-atom size for a whole spec (pop-ins): withSize(MOL.CH4(), (t) => ease.outBack(seg(t, 1.7, 2.1))).
export const withSize = (spec, f) => ({ ...spec, atoms: spec.atoms.map((a) => ({ ...a, size: f })) });
// Product pose that rests at `base` until t0, then drifts along `dir` (A/s) and spins about Y (rad/s).
export const drift = (base, dir, spin, t0 = 4.25, speed = 0.55) => (t) => { const k = Math.max(0, t - t0); return { pos: base.map((x, i) => x + dir[i] * k * speed), rot: [0, spin * k, 0] }; };
