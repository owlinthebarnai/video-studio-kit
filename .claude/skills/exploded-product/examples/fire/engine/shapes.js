// shapes.js: procedural geometry helpers. Convention: rotational parts have their axis on +Y, base at y = 0.
// Reuse for any product: watches (discs, rings, gears), headphones (rings, cushions = torus/lathe, strips),
// cameras (beveled cylinders = lens barrels, knurled rings = focus grips), sneakers (bent strips, lathe soles).
import * as THREE from '/_vendor/three.module.js';
import { TAU } from './core.js';

// Insert near-duplicate points around interior corners so the lathe keeps crisp edges
// (otherwise LatheGeometry smooths normals across a whole flat face).
function sharpen(pts, eps = 0.0015) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
    const cos = (d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2 || 1);
    if (cos < 0.995 && l1 > 3 * eps && l2 > 3 * eps) {
      out.push([b[0] - (d1[0] / l1) * eps, b[1] - (d1[1] / l1) * eps], b, [b[0] + (d2[0] / l2) * eps, b[1] + (d2[1] / l2) * eps]);
    } else out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// lathe([[r, y], ...], { seg, sharp }) -> geometry around Y. Order points bottom -> top along the outside
// (for closed rings: bottom outward, outer side up, top inward, inner side down). U runs around (circular grain).
export function lathe(profile, { seg = 96, sharp = true } = {}) {
  const pts = (sharp ? sharpen(profile) : profile).map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y));
  return new THREE.LatheGeometry(pts, seg);
}

// Solid cylinder (disc, button, lens barrel, case back) with chamfered top/bottom edges. Base at y = 0.
export function bevelCylinder({ r = 1, h = 0.2, bevel = 0.03, bevelBottom = null, dome = 0, seg = 96 } = {}) {
  const bt = bevel, bb = bevelBottom ?? bevel, p = [[0, 0], [r - bb, 0], [r, bb], [r, h - bt], [r - bt, h]];
  if (dome > 0) { for (let i = 1; i <= 6; i++) { const k = i / 6; p.push([(r - bt) * (1 - k), h + dome * Math.sin((k * Math.PI) / 2)]); } }
  else p.push([0, h]);
  return lathe(p, { seg });
}

// Ring / tube with chamfers (bezel, case middle, ear cup, focus ring). Base at y = 0.
export function bevelRing({ rOut = 1, rIn = 0.8, h = 0.2, bevel = 0.02, bevelIn = null, seg = 96 } = {}) {
  const b = bevel, bi = bevelIn ?? bevel;
  return lathe([[rIn, 0], [rOut - b, 0], [rOut, b], [rOut, h - b], [rOut - b, h], [rIn + bi, h], [rIn, h - bi], [rIn, 0.0001]], { seg });
}

// Spur-gear outline with real teeth, optional spokes and centre hole. Teeth have curved (involute-ish) flanks.
// gearShape({ teeth: 24, r: 0.5, depth: 0.06, hole: 0.05, spokes: 5, rim: 0.07, hub: 0.12 })
export function gearShape({ teeth = 24, r = 0.5, depth = null, hole = 0, spokes = 0, rim = null, hub = null, tip = 0.42, root = 0.5 } = {}) {
  const d = depth ?? Math.min(0.12 * r, (TAU * r) / teeth * 0.55), rT = r, rR = r - d;
  const s = new THREE.Shape(), pitch = TAU / teeth;
  const P = (rad, a) => [Math.cos(a) * rad, Math.sin(a) * rad];
  for (let i = 0; i < teeth; i++) {
    const a = i * pitch, rootW = pitch * root, tipW = pitch * tip * 0.6;
    const flank = (pitch - rootW - tipW) / 2;
    const pts = [
      P(rR, a), P(rR, a + rootW * 0.5),
      P(rR + d * 0.35, a + rootW * 0.5 + flank * 0.25), P(rR + d * 0.75, a + rootW * 0.5 + flank * 0.65), P(rT, a + rootW * 0.5 + flank),
      P(rT, a + rootW * 0.5 + flank + tipW),
      P(rR + d * 0.75, a + rootW * 0.5 + flank * 1.35 + tipW), P(rR + d * 0.35, a + rootW * 0.5 + flank * 1.75 + tipW), P(rR, a + pitch - rootW * 0.5),
    ];
    pts.forEach(([x, y], j) => (i === 0 && j === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  }
  s.closePath();
  if (spokes > 0) {
    const ro = rR - (rim ?? d * 1.4), ri = hub ?? Math.max(hole * 2.2, r * 0.22), sw = (spokes > 3 ? 0.11 : 0.16) * TAU / spokes * 2.2;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * TAU + sw / 2, a1 = ((k + 1) / spokes) * TAU - sw / 2, h = new THREE.Path();
      h.absarc(0, 0, ro, a0, a1, false); h.absarc(0, 0, ri, a1, a0, true); h.closePath(); s.holes.push(h);
    }
  }
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}

// Extrude a 2D shape (XY) into a flat part lying in XZ with thickness along +Y, base at y = 0.
export function flatExtrude(shape, { h = 0.05, bevel = 0.006, curveSeg = 24 } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - 2 * bevel, 0.0005), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: curveSeg,
  });
  g.translate(0, 0, bevel); g.rotateX(-Math.PI / 2); // extrusion depth -> +Y, shape y -> -Z
  g.computeVertexNormals();
  return g;
}

// gear({ teeth, r, h, hole, spokes }) -> geometry (axis Y, base y = 0).
export const gear = ({ h = 0.05, bevel = 0.004, ...o } = {}) => flatExtrude(gearShape(o), { h, bevel, curveSeg: 32 });

// Knurled / fluted cylinder (crowns, focus rings, dials, knobs): a fine gear extruded tall. Axis Y, base 0.
export const knurl = ({ r = 0.12, h = 0.12, flutes = 36, depth = null, bevel = 0.006 } = {}) =>
  flatExtrude(gearShape({ teeth: flutes, r, depth: depth ?? r * 0.06, tip: 0.6, root: 0.5 }), { h, bevel, curveSeg: 8 });

// Annulus with a gap of spokes (balance wheels, wheels, speaker grilles): rim + n arms + hub.
export function spokedWheel({ r = 0.4, rim = 0.04, arms = 3, armW = 0.03, hub = 0.05, h = 0.03 } = {}) {
  const s = new THREE.Shape(); s.absarc(0, 0, r, 0, TAU, false);
  const ri = r - rim, half = Math.asin(Math.min(armW / 2 / ri, 0.9));
  for (let k = 0; k < arms; k++) {
    const a0 = (k / arms) * TAU + half, a1 = ((k + 1) / arms) * TAU - half, hubHalf = Math.asin(Math.min(armW / 2 / hub, 0.9)), p = new THREE.Path();
    p.absarc(0, 0, ri, a0, a1, false); p.absarc(0, 0, hub, (k + 1) / arms * TAU - hubHalf, (k / arms) * TAU + hubHalf, true); p.closePath();
    s.holes.push(p);
  }
  return flatExtrude(s, { h, bevel: Math.min(0.004, h / 4), curveSeg: 48 });
}

// Flat archimedean spiral as a thin tube (hairsprings, coils, cable wraps). Lies in XZ at height y.
export function spiral({ r0 = 0.05, r1 = 0.3, turns = 8, tube = 0.004, y = 0, n = 400 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n, a = k * turns * TAU, rr = r0 + (r1 - r0) * k; pts.push(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, tube, 4, false);
}

// Bent strip (watch straps, headband, sneaker tongue): a box along +Z that curls downward by `bend` radians,
// with width taper. Base starts at the origin. Top face UVs: U across, V along (use strapTex).
export function bentStrip({ length = 1.5, width = 0.4, thick = 0.07, bend = 1.2, taper = 1, round = 0.35, segs = 48 } = {}) {
  const g = new THREE.BoxGeometry(width, thick, length, 6, 1, segs); g.translate(0, 0, length / 2);
  const p = g.attributes.position, R = length / Math.max(bend, 1e-3);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i); const z = p.getZ(i), k = z / length;
    x *= 1 + (taper - 1) * k;
    const xe = Math.abs(x) / (width / 2); y *= 1 - round * Math.pow(xe, 6); // softened edges
    const phi = z / R;
    p.setXYZ(i, x, -R + (R + y) * Math.cos(phi), (R + y) * Math.sin(phi));
  }
  g.computeVertexNormals();
  return g;
}

// Convenience: mesh with shadows on.
export function mesh(geo, mat, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m;
}
// Place n copies of a factory around the Y axis at radius r (indices, screws, jewels, buttons).
export function ringOf(n, r, make, { y = 0, phase = 0, face = true, skip = () => false } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue;
    const a = phase + (i / n) * TAU, o = make(i);
    o.position.set(Math.sin(a) * r, y, -Math.cos(a) * r); if (face) o.rotation.y = -a; g.add(o);
  }
  return g;
}
