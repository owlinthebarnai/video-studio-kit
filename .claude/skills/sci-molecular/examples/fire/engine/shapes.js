// shapes.js: solid props and diagram geometry that live in 3D with the molecules.
//   stick()  wooden rod with grain + end rings          orb()   glowing energy sphere (HEAT, photons, "energy")
//   beam()   glowing line A->B that draws on (diagram edges, bond-energy rays)   decal() a flat alpha patch
import * as THREE from '/_vendor/three.module.js';
import { PAL } from './palette.js';
import { woodTex, endGrainTex, softDotTex } from './textures.js';
import { GLOW } from './stage.js';

let DOT;
const dot = () => (DOT ||= softDotTex(128, 2.0));

// Glow sprite (additive, on the GLOW layer so it is kept out of the depth-of-field depth pass).
export function glowSprite(S, color = PAL.flameMid, { parent, tex } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex || dot(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  s.layers.set(GLOW); (parent || S.scene).add(s); return s;
}

// Wooden stick along +Y, centred. Rotate/position the returned mesh.
export function stick(S, { length = 5, radius = 0.22, seed = 3, parent } = {}) {
  const { map, bump } = woodTex({ seed }); map.repeat.set(1, 1); bump.repeat.copy(map.repeat); // one tile per stick: no seams
  const side = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.5, roughness: 0.78, metalness: 0 });
  const cap = new THREE.MeshStandardMaterial({ map: endGrainTex({ seed: seed + 1 }), roughness: 0.85 });
  const g = new THREE.CylinderGeometry(radius, radius * 0.94, length, 28, 6);
  // slight irregularity so it reads as a branch, not a dowel
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), w = 1 + 0.04 * Math.sin(y * 2.3 + seed) + 0.025 * Math.sin(y * 5.1); p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * w); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, [side, cap, cap]); (parent || S.scene).add(m); return m;
}

// Flat alpha patch (scorch marks, shadows). Lies in local XY; orient it yourself.
export function decal(S, alphaMap, { color = '#120804', w = 1, h = 0.25, additive = false, parent } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, alphaMap, transparent: true, depthWrite: false, opacity: 0, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
  if (additive) m.layers.set(GLOW);
  (parent || S.scene).add(m); return m;
}

// Glowing energy sphere with halo and expanding ripples. update(t, { pos, size, power }) power 0..1.
export function orb(S, { color = PAL.heat, core = PAL.flameCore, ripples = 3 } = {}) {
  const g = new THREE.Group(); S.scene.add(g);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), new THREE.MeshStandardMaterial({ color: '#3a1606', emissive: color, emissiveIntensity: 2.2, roughness: 0.4 }));
  g.add(ball);
  const halo = glowSprite(S, color, { parent: g }), hot = glowSprite(S, core, { parent: g });
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineWidth = 5; x.shadowColor = '#fff'; x.shadowBlur = 8; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke(); const t = new THREE.CanvasTexture(x.canvas); return t; })();
  const rings = Array.from({ length: ripples }, () => glowSprite(S, color, { parent: g, tex: ringTex }));
  const update = (t, { pos = [0, 0, 0], size = 0.5, power = 1 } = {}) => {
    g.position.set(...pos); g.visible = size > 1e-3;
    const fl = 1 + 0.05 * Math.sin(t * 23) + 0.04 * Math.sin(t * 37 + 1);
    ball.scale.setScalar(size * fl); ball.material.emissiveIntensity = 0.6 + 2.0 * power;
    halo.scale.setScalar(size * 6 * fl); halo.material.opacity = 0.55 * power;
    hot.scale.setScalar(size * 2.6); hot.material.opacity = 0.7 * power;
    rings.forEach((r, i) => { const u = ((t * 0.9 + i / ripples) % 1); r.scale.setScalar(size * (2 + u * 5)); r.material.opacity = power * 0.4 * (1 - u) * Math.min(1, u * 5); });
  };
  return { group: g, update };
}

// Glowing line between two points that draws on. update(a, b, k (0..1 drawn), opacity).
export function beam(S, { color = PAL.accent, radius = 0.035, head = true } = {}) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true); g.translate(0, 0.5, 0);
  const core = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const soft = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 }));
  core.layers.set(GLOW); soft.layers.set(GLOW); S.scene.add(core, soft);
  const tip = head ? glowSprite(S, color) : null;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const update = (a, b, k = 1, opacity = 1) => {
    A.set(...a); B.set(...b); d.subVectors(B, A); const L = d.length(); d.normalize();
    const vis = k > 0.002 && opacity > 0.01; core.visible = soft.visible = vis;
    for (const [m, r, o] of [[core, radius, 0.9], [soft, radius * 3.2, 0.22]]) { m.position.copy(A); m.quaternion.setFromUnitVectors(Y, d); m.scale.set(r, L * k, r); m.material.opacity = o * opacity; }
    if (tip) { tip.visible = vis && k < 0.999; tip.position.copy(A).addScaledVector(d, L * k); tip.scale.setScalar(radius * 14); tip.material.opacity = opacity * 0.9; }
  };
  return { update, core, soft };
}
