// studio.js: renderer, seamless sweep, studio lighting + reflection environment, contact shadow, camera orbit.
import * as THREE from '/_vendor/three.module.js';
import { backdropTex, blobTex } from './textures.js';
import { PAL } from './palette.js';
import { deg } from './core.js';

// Reflection environment: warm-grey dome, three softboxes (top, left strip, right rim strip), a bounce card,
// dark floor. Polished metal mirrors these as clean highlight bands: that is the "expensive" look.
function studioEnv(renderer) {
  const s = new THREE.Scene();
  // light warm sweep all around: metal mostly mirrors the bright backdrop, as in a real cyclorama
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#b9b3ab', side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(19.5, 32), new THREE.MeshBasicMaterial({ color: '#a7a198' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4; s.add(floor);
  const card = (w, h, x, y, z, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  const k = (v) => new THREE.Color(v, v, v);
  card(16, 10, 0, 15, 2, k(5));      // big overhead softbox
  card(2.4, 16, -15, 2, 5, k(4));    // left strip
  card(2.4, 16, 13, 3, -8, k(3.2));  // right/back rim strip
  card(9, 3, 3, 1, 16, k(1.8));      // low front bounce card
  // black flags: give polished edges and cylinder sides their dark contrast lines
  card(5, 18, 15, 0, 6, '#1d1b1a');
  card(4, 18, -10, 0, -14, '#24221f');
  card(30, 2.2, 0, -2.5, -18, '#3a3734');
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.03);
  pm.dispose(); s.traverse((o) => o.geometry && o.geometry.dispose());
  return rt.texture;
}

// createStudio({ width, height, fov, shadowExtent, floorY, mapSize }) -> studio object (see SKILL.md).
export function createStudio({ width = 1920, height = 1080, fov = 26, shadowExtent = 6, floorY = 0, mapSize = 512, softness = 22, parent = document.body } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  // the transmission pass (glass) does not draw scene.background: clear to the sweep colour so glass shows it
  renderer.setClearColor(PAL.backdropCenter, 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; // soft, blur-able
  Object.assign(renderer.domElement.style, { position: 'absolute', left: '0', top: '0' });
  parent.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = backdropTex({ center: PAL.backdropCenter, edge: PAL.backdropEdge });
  scene.environment = studioEnv(renderer);

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 200);

  // Key: soft overhead-left, the only shadow caster. Fill: neutral hemisphere. Never coloured lights.
  const key = new THREE.DirectionalLight('#fffaf3', 2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(mapSize, mapSize); key.shadow.bias = -0.0005; key.shadow.radius = softness; key.shadow.blurSamples = 20;
  const sc = key.shadow.camera; sc.left = sc.bottom = -shadowExtent; sc.right = sc.top = shadowExtent; sc.near = 0.5; sc.far = 40;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#b9b2aa', 0.5); scene.add(hemi);

  // Floor: invisible shadow catcher (a disc inside the shadow frustum, so no frustum-edge line ever shows).
  // The backdrop is screen space, so the sweep is perfectly seamless.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(shadowExtent * 0.8, 64), new THREE.ShadowMaterial({ color: PAL.shadow, opacity: 0.13 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true; scene.add(floor);

  // Contact shadow: soft blob right under the object. contact(x, z, radius, opacity, stretchX) each frame.
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: PAL.shadow, alphaMap: blobTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = floorY + 0.002; blob.renderOrder = -1; scene.add(blob);
  const contact = (x, z, radius, opacity = 0.5, sx = 1, rotY = 0) => {
    blob.position.x = x; blob.position.z = z; blob.rotation.z = rotY;
    blob.scale.set(radius * 2 * sx, radius * 2, 1); blob.material.opacity = opacity;
  };

  // Camera orbit: az = degrees around Y from +Z toward +X, el = degrees above the horizon.
  const orbit = ({ target = [0, 0, 0], dist = 10, az = 30, el = 20, roll = 0 }) => {
    const a = deg(az), e = deg(el);
    camera.position.set(target[0] + dist * Math.cos(e) * Math.sin(a), target[1] + dist * Math.sin(e), target[2] + dist * Math.cos(e) * Math.cos(a));
    camera.up.set(0, 1, 0); camera.lookAt(target[0], target[1], target[2]);
    if (roll) camera.rotateZ(deg(roll));
    camera.updateMatrixWorld();
  };
  // Keep the shadow frustum on the subject so map resolution is spent where it matters.
  const aimShadow = (x, y, z) => { key.target.position.set(x, y, z); key.position.set(x - 3, y + 10, z + 4); key.target.updateMatrixWorld(); floor.position.x = x; floor.position.z = z; };
  aimShadow(0, 0, 0);

  return { renderer, scene, camera, key, hemi, floor, blob, contact, orbit, aimShadow, width, height, render: () => renderer.render(scene, camera) };
}

// Mark every mesh under obj as a shadow caster (and optionally receiver).
export function shadows(obj, cast = true, receive = false) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}
