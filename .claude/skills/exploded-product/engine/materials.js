// materials.js: physically based material presets for the style. Textures are shared across materials (memory).
import * as THREE from '/_vendor/three.module.js';
import { brushedTex, circularBrushTex } from './textures.js';
import { PAL } from './palette.js';

let _lin, _circ;
const lin = () => (_lin ||= brushedTex({ seed: 3 }));
const circ = () => (_circ ||= circularBrushTex({ seed: 5 }));

// Brushed steel. polar: true for flat discs with planar UVs (concentric grain); default grain runs along U.
export function brushedSteel({ color = PAL.steel, roughness = 0.34, polar = false, aniso = 0.55 } = {}) {
  const t = polar ? circ() : lin();
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness, roughnessMap: t, bumpMap: t, bumpScale: 0.25,
    anisotropy: polar ? 0 : aniso, envMapIntensity: 1.1,
  });
}
// Mirror-polished steel (bezels, hands, indices, crown). Shows the studio softboxes as crisp strips.
export const polishedSteel = ({ color = '#D9DCDF', roughness = 0.07 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.25 });
// Gilt / brass (movement wheels, balance). Light brushing.
export const gilt = ({ color = PAL.gold, roughness = 0.26 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, roughnessMap: lin(), envMapIntensity: 1.1 });
// Rhodium plate (movement plates/bridges). Pass map: stripesTex() for cotes decoration.
export const plate = ({ color = '#B9BDC1', roughness = 0.4, map = null } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, roughnessMap: map || circ(), bumpMap: map || null, bumpScale: 0.4, envMapIntensity: 1 });
// Sapphire / glass. Real transmission (one extra pass); near-clear with a faint AR-coating iridescence.
export const sapphire = ({ tint = '#F4FAFF' } = {}) =>
  new THREE.MeshPhysicalMaterial({
    color: tint, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.06, ior: 1.77,
    specularIntensity: 0.4, attenuationColor: '#D8E8F0', attenuationDistance: 0.6, iridescence: 0.25, iridescenceIOR: 1.35,
    iridescenceThicknessRange: [200, 400], envMapIntensity: 0.85, // no clearcoat: it doubles the grazing reflection

  });
// Cheap glass alternative (no transmission pass) if a page gets too slow.
export const glassLite = ({ tint = '#EEF4F8', opacity = 0.18 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color: tint, metalness: 0, roughness: 0.02, transparent: true, opacity, depthWrite: false, clearcoat: 1, envMapIntensity: 2 });
// Matte dial: give it a dialTex() map. Low specular so it reads as matte lacquer.
export const matte = ({ color = '#ffffff', map = null, roughness = 0.82 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, map, roughness, metalness: 0, specularIntensity: 0.35, envMapIntensity: 0.6 });
export const rubber = ({ color = PAL.rubber, map = null } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, map, roughness: 0.75, metalness: 0, sheen: 0.3, sheenRoughness: 0.8, envMapIntensity: 0.5 });
export const leather = ({ color = '#ffffff', map = null } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, map, roughness: 0.62, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
export const jewel = ({ color = PAL.ruby } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, clearcoat: 1, specularIntensity: 1, envMapIntensity: 1.4 });
export const lacquer = ({ color = '#151515', roughness = 0.18 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
// Flat painted accent (seconds hand, one highlighted detail).
export const paint = ({ color = PAL.accent, roughness = 0.45 } = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.4 });
