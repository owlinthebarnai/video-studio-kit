// stage.js: renderer, dark gradient background, studio lights (key + fill + rim), dark reflection environment,
// fog, depth of field (BokehPass), gentle bloom, and the orbit camera.
//
// const S = createStage({ width: 1920, height: 1080 });
// per frame: S.orbit({ target, dist, az, el }); S.focusOn(target); S.render();
// Additive glows must live on layer S.GLOW (fx.js / shapes.js helpers do it): they are drawn sharp, after the blur.
import * as THREE from '/_vendor/three.module.js';
import { EffectComposer } from '/_vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '/_vendor/addons/postprocessing/RenderPass.js';
import { BokehPass } from '/_vendor/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from '/_vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '/_vendor/addons/postprocessing/OutputPass.js';
import { Pass } from '/_vendor/addons/postprocessing/Pass.js';
import { PAL } from './palette.js';
import { backgroundTex } from './textures.js';
import { deg } from './core.js';

export const GLOW = 1; // camera layer for additive sprites

// Dark studio environment: almost-black dome + three softbox cards. Atoms mirror these as clean highlights.
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#080b14', side: THREE.BackSide })));
  const card = (w, h, x, y, z, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  card(12, 8, -8, 12, 10, new THREE.Color(3.2, 3.0, 2.8));   // key softbox, top front left
  card(3, 16, 14, 4, -9, new THREE.Color(1.1, 1.6, 2.6));     // cool rim strip, back right
  card(14, 3, 0, -9, 10, new THREE.Color(0.35, 0.4, 0.55));   // low front bounce
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.04);
  pm.dispose(); s.traverse((o) => o.geometry && o.geometry.dispose());
  return rt.texture;
}

// Draws layer GLOW on top of the (blurred) frame: depth pre-pass of the solids, then the glows.
class GlowPass extends Pass {
  constructor(scene, camera) { super(); this.scene = scene; this.camera = camera; this.needsSwap = false; this.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false }); }
  render(renderer, writeBuffer, readBuffer) {
    const { scene, camera } = this, bg = scene.background, mask = camera.layers.mask, ac = renderer.autoClear;
    renderer.autoClear = false; renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); renderer.clearDepth();
    scene.background = null; scene.overrideMaterial = this.depthOnly; camera.layers.set(0); renderer.render(scene, camera);
    scene.overrideMaterial = null; camera.layers.set(GLOW); renderer.render(scene, camera);
    camera.layers.mask = mask; scene.background = bg; renderer.autoClear = ac;
  }
}

export function createStage({ width = 1920, height = 1080, fov = 30, dof = true, aperture = 0.0006, maxblur = 0.009,
  bloom = 0.55, bloomThreshold = 0.82, fogNear = 14, fogFar = 34, exposure = 1.0, parent = document.body } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  Object.assign(renderer.domElement.style, { position: 'absolute', left: '0', top: '0' });
  parent.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = backgroundTex();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(PAL.fog, fogNear, fogFar);

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 120);

  // Lights. Key: warm white from top-front-left. Fill: cool, weak, from the right. Rim: cool, strong, from behind.
  const key = new THREE.DirectionalLight(PAL.key, 2.4); key.position.set(-6, 8, 7);
  const fill = new THREE.DirectionalLight(PAL.fill, 0.55); fill.position.set(7, 1, 5);
  const rim = new THREE.DirectionalLight(PAL.rim, 2.6); rim.position.set(3, 5, -9);
  const amb = new THREE.HemisphereLight('#2a3550', '#06080e', 0.6);
  scene.add(key, fill, rim, amb);

  // Post: solids -> depth of field -> glows (sharp, depth-tested against the solids) -> bloom -> tone map/sRGB.
  // Glows (layer GLOW) are drawn AFTER the blur: otherwise they have no depth and get the maximum blur.
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  let bokeh = null;
  if (dof) {
    bokeh = new BokehPass(scene, camera, { focus: 10, aperture, maxblur });
    // keep the background out of the depth pass (cleared white = far = max blur)
    const orig = bokeh.render.bind(bokeh);
    bokeh.render = (...a) => { const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; orig(...a); scene.background = bg; scene.fog = fog; };
    composer.addPass(bokeh);
  }
  composer.addPass(new GlowPass(scene, camera));
  let bloomPass = null;
  if (bloom > 0) { bloomPass = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), bloom, 0.6, bloomThreshold); composer.addPass(bloomPass); }
  composer.addPass(new OutputPass());

  // Orbit: az = degrees around Y from +Z toward +X, el = degrees above the horizon.
  const tgt = new THREE.Vector3();
  const orbit = ({ target = [0, 0, 0], dist = 12, az = 0, el = 10, roll = 0 }) => {
    const a = deg(az), e = deg(el); tgt.set(...target);
    camera.position.set(tgt.x + dist * Math.cos(e) * Math.sin(a), tgt.y + dist * Math.sin(e), tgt.z + dist * Math.cos(e) * Math.cos(a));
    camera.up.set(0, 1, 0); camera.lookAt(tgt);
    if (roll) camera.rotateZ(deg(roll));
    camera.updateMatrixWorld();
  };
  // Focus distance = camera to point (default: the orbit target). aperture can be animated too.
  const focusOn = (p = tgt, ap) => {
    if (!bokeh) return;
    const v = Array.isArray(p) ? new THREE.Vector3(...p) : p;
    bokeh.uniforms.focus.value = camera.position.distanceTo(v);
    if (ap !== undefined) bokeh.uniforms.aperture.value = ap;
  };

  return { renderer, scene, camera, composer, bokeh, bloomPass, key, fill, rim, amb, orbit, focusOn, width, height, GLOW,
    render: () => composer.render() };
}
