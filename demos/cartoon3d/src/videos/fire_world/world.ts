// The fire world: a painted low-poly night clearing outside a cave (Kenney Nature Kit, CC0, recoloured), toon-lit by a
// blue moon + sky fill and, from the burst on, a flickering warm point light in the fire pit. World ink lines are
// drawn by screen-space inverted hulls (constant pixel width), so the look holds without the post chain. The caveman,
// flames, smoke and spark are 2D cards (yaw billboards) on top, like the bridge cast.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { staticFile } from "remotion";
import { Pen, fxBurst } from "./toon";
import { caveman, ploughTip } from "./caveman";
import { fxFire, fxSmoke, glowTex, emberTex, skyTex, groundTex, dirtTex } from "./fx";
import { BURST, SPARK, TOTAL, rubAt, smokeAt, emberAt, fireAt, poseAt, hopAt, exprAt, lidAt, smoother, smooth } from "./story";

export type Kit = Record<string, THREE.Object3D>;
const MODELS = ["campfire_stones", "campfire_logs", "cliff_blockCave_rock", "cliff_cave_rock", "rock_largeA", "rock_largeB", "rock_largeD", "stone_largeA",
  "log", "log_large", "tree_pineDefaultA", "tree_pineDefaultB", "grass_large", "plant_bush"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(MODELS.map((n) => loader.loadAsync(staticFile(`fire/kenney/${n}.glb`)).then((g) => [n, g.scene] as const)))
      .then((l) => Object.fromEntries(l) as Kit);
  }
  return kitP;
};

// ---------------- materials ----------------
const RECOLOR: Record<string, string> = {
  dirt: "#8c7b6a", _defaultMat: "#8c7b6a", grass: "#5f8048", stone: "#a69e92", wood: "#a8724a", woodDark: "#7a4f33",
  woodBark: "#8a5a3c", woodInner: "#e8cfa4", leafsDark: "#3f6e4c", woodBarkDark: "#6e4a34",
};
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 150, 215, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
const toonCache = new Map<string, THREE.MeshToonMaterial>();
const toon = (col: string, map: THREE.Texture | null = null) => {
  const k = col + (map ? map.uuid : "");
  let m = toonCache.get(k);
  if (!m) { m = new THREE.MeshToonMaterial({ color: col, gradientMap: GRAD, map }); toonCache.set(k, m); }
  return m;
};
const ctex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

// ---------------- world ink: screen-space inverted hull ----------------
const INK_U = { uW: { value: 2.6 }, uRes: { value: new THREE.Vector2(1920, 1080) } };
const inkMat = new THREE.ShaderMaterial({
  uniforms: INK_U, side: THREE.BackSide,
  vertexShader: /* glsl */ `uniform float uW; uniform vec2 uRes;
    void main() {
      vec4 cp = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 vn = normalize(normalMatrix * normal);
      vec2 d = (projectionMatrix * vec4(vn, 0.0)).xy;
      d = normalize(d + vec2(1e-6));
      cp.xy += d * uW * 2.0 / uRes * cp.w;
      gl_Position = cp;
    }`,
  fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(0.043, 0.039, 0.047, 1.0); }`,
});
const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const hullOf = (g: THREE.BufferGeometry) => {
  let h = hullCache.get(g);
  if (!h) {
    const p = new THREE.BufferGeometry(); p.setAttribute("position", g.getAttribute("position").clone()); if (g.index) p.setIndex(g.index.clone());
    h = mergeVertices(p, 1e-2); h.computeVertexNormals(); hullCache.set(g, h);
  }
  return h;
};
const inkify = (o: THREE.Object3D) => {
  const meshes: THREE.Mesh[] = [];
  o.traverse((x) => { if ((x as THREE.Mesh).isMesh) meshes.push(x as THREE.Mesh); });
  for (const m of meshes) { const h = new THREE.Mesh(hullOf(m.geometry), inkMat); h.renderOrder = -1; m.add(h); }
};

const boxes = new Map<string, THREE.Box3>();
/** Kenney model scaled by s (or to height h when h > 0), toon-recoloured, inked */
const place = (root: THREE.Object3D, kit: Kit, name: string, x: number, z: number, s: number, yaw = 0, y = 0) => {
  const src = kit[name];
  if (!boxes.has(name)) boxes.set(name, new THREE.Box3().setFromObject(src));
  const c = src.clone(true);
  c.traverse((x0) => {
    const m = x0 as THREE.Mesh;
    if (!m.isMesh) return;
    const mm = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    m.material = toon(RECOLOR[mm.name] ?? "#" + mm.color.getHexString());
  });
  inkify(c);
  const g = new THREE.Group();
  c.position.y = -boxes.get(name)!.min.y; g.add(c);
  g.scale.setScalar(s); g.position.set(x, y, z); g.rotation.y = yaw;
  root.add(g);
  return g;
};

// ---------------- cards ----------------
const SU = 0.00216; // metres per design unit (bridge cast scale: 1000 units = 2.16 m)
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD_U = { uNight: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Vector3(1.4, 0.88, 0.52) }, uFire: { value: 0 } };
/** character card: night tint, plus a warm wash rising toward the fire side (screen right) */
const cardMat = (map: THREE.Texture) => {
  const m = new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CARD_U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uNight; uniform vec3 uWarm; uniform float uFire;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        float uu = clamp((vMapUv.x - 0.5) * 2.2, -1.0, 1.0);
        vec3 lightK = uNight * (1.0 - 0.5 * uFire) + uWarm * uFire * (0.5 + 0.55 * smoothstep(-1.0, 0.9, uu));
        diffuseColor.rgb *= lightK;`);
  };
  m.customProgramCacheKey = () => "fireCard1";
  return m;
};
class CanvasCard {
  cv: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key = "";
  constructor(public w: number, public h: number, public k: number) {
    this.cv = document.createElement("canvas"); this.cv.width = w; this.cv.height = h;
    this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
  draw(key: string, fn: (p: Pen) => void) {
    if (key === this.key) return;
    this.key = key;
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.w, this.h); g.setTransform(this.k, 0, 0, this.k, 0, 0);
    fn(new Pen(g)); this.tex.needsUpdate = true;
  }
}

// ---------------- layout ----------------
const CAM0 = new THREE.Vector3(0.25, 1.22, 5.7), LOOK0 = new THREE.Vector3(0.45, 0.92, 0);
const CAM1 = new THREE.Vector3(0.8, 1.02, 4.75), LOOK1 = new THREE.Vector3(0.72, 1.0, 0);
const YAW = Math.atan2(0.55, 5.2);                                       // cards face the mean lens position
const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)), TOWARD = new THREE.Vector3(Math.sin(YAW), 0, Math.cos(YAW));
const MAN = new THREE.Vector3(0, 0, 0);
const at = (dx: number, dy: number) => MAN.clone().addScaledVector(RIGHT, (dx - 300) * SU).setY((975 - dy) * SU);
const PIT = at(548, 975).addScaledVector(RIGHT, 0.44).addScaledVector(TOWARD, 0.2);

export class World {
  root = new THREE.Group();
  private man: CanvasCard; private manMesh: THREE.Mesh;
  private fire: CanvasCard; private fireMesh: THREE.Mesh;
  private smoke: CanvasCard; private smokeMesh: THREE.Mesh; private smokeMat: THREE.MeshBasicMaterial;
  private spark: CanvasCard; private sparkMesh: THREE.Mesh;
  private glow: THREE.Mesh; private glowMat: THREE.MeshBasicMaterial;
  private embers: THREE.Points; private emberPos: Float32Array;
  private fireLight: THREE.PointLight; private moon: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;

  constructor(kit: Kit) {
    const r = this.root;
    // sky matte far behind, ground, dirt clearing
    const skyMat = new THREE.MeshBasicMaterial({ map: ctex(2048, 1024, skyTex), fog: false, toneMapped: false, depthWrite: false });
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), skyMat); this.sky.position.set(0, 14, -55); this.sky.renderOrder = -10; r.add(this.sky);
    const gt = ctex(1024, 1024, groundTex, true); gt.repeat.set(14, 14);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon("#ffffff", gt)); ground.rotation.x = -Math.PI / 2; r.add(ground);
    const dm = new THREE.MeshToonMaterial({ map: ctex(1024, 1024, dirtTex), gradientMap: GRAD, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), dm); dirt.rotation.x = -Math.PI / 2; dirt.position.set(0.2, 0.002, -0.4); r.add(dirt);

    // cave + rocks + pines (the cave block's mouth faces +z)
    place(r, kit, "cliff_blockCave_rock", -1.0, -5.2, 5.4, Math.PI); // the kit's cave mouth is on its -z side
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.2), new THREE.MeshBasicMaterial({ color: "#0d0a14" }));
    mouth.position.set(-1.0, 2.1, -5.2); r.add(mouth); // dark cave depth behind the opening
    place(r, kit, "rock_largeD", -5.6, -3.0, 4.2, 0.6);
    place(r, kit, "rock_largeB", -4.2, -0.6, 2.2, 2.0);
    place(r, kit, "rock_largeD", 2.9, -4.8, 2.6, 2.3);
    place(r, kit, "stone_largeA", 2.2, -1.6, 1.1, 0.9);
    place(r, kit, "stone_largeA", -1.5, 0.9, 0.9, 0.4);
    place(r, kit, "rock_largeA", 3.3, 0.2, 1.3, 2.6);
    place(r, kit, "log", -0.9, -0.75, 1.6, 1.25);
    for (const [n, x, z, s, y] of [["tree_pineDefaultA", 4.6, -7.5, 4.6, 0.3], ["tree_pineDefaultB", 6.8, -11, 5.4, 1.1], ["tree_pineDefaultA", 9.5, -15, 6, 2.0],
      ["tree_pineDefaultB", 3.6, -12.5, 4.2, 0.7], ["tree_pineDefaultA", -7.5, -10, 6, 0.2]] as const) place(r, kit, n, x, z, s, y);
    for (const [n, x, z, s] of [["grass_large", -2.2, 1.4, 1.8], ["grass_large", 2.7, 1.3, 1.6], ["plant_bush", 3.9, -1.2, 2.2], ["grass_large", -3.1, -0.3, 2.0],
      ["plant_bush", -2.9, 0.6, 1.6], ["grass_large", 1.6, -2.4, 1.5], ["grass_large", 4.6, 0.9, 1.9]] as const) place(r, kit, n, x, z, s, x * 3.1);
    // fire pit: stone ring + laid logs
    place(r, kit, "campfire_stones", PIT.x, PIT.z, 2.1, 0.3);
    place(r, kit, "campfire_logs", PIT.x, PIT.z, 2.5, 0.9);

    // lights: moon key from upper left, night sky fill, fire point light
    this.moon = new THREE.DirectionalLight("#a8b8ff", 1.6); this.moon.position.set(-6, 9, 5); r.add(this.moon);
    this.hemi = new THREE.HemisphereLight("#4a5ca8", "#231c34", 1.3); r.add(this.hemi);
    this.fireLight = new THREE.PointLight("#ff9446", 0, 0, 2); this.fireLight.position.copy(PIT).setY(0.75); r.add(this.fireLight);
    r.add(new THREE.AmbientLight("#ffffff", 0)); // placeholder slot (keeps the light count fixed across frames)

    // caveman card + contact blob
    this.man = new CanvasCard(1200, 2000, 2);
    this.manMesh = new THREE.Mesh(BODY, cardMat(this.man.tex)); this.manMesh.position.copy(MAN); this.manMesh.rotation.y = YAW; this.manMesh.renderOrder = 2; r.add(this.manMesh);
    const blobT = ctex(256, 128, (g) => { const gr = g.createRadialGradient(128, 64, 0, 128, 64, 64); gr.addColorStop(0, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.setTransform(2, 0, 0, 1, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    blob.rotation.x = -Math.PI / 2; blob.position.copy(at(300, 975)).setY(0.004); blob.rotation.z = YAW; r.add(blob);

    // fire card (600 x 900 design), glow, embers, smoke, spark
    this.fire = new CanvasCard(600, 900, 1);
    this.fireMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.025), new THREE.MeshBasicMaterial({ map: this.fire.tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    this.fireMesh.geometry.translate(0, 2.025 * (860 / 900 - 0.5), 0);
    this.fireMesh.position.copy(PIT).setY(0.06); this.fireMesh.renderOrder = 3; r.add(this.fireMesh);
    this.glowMat = new THREE.MeshBasicMaterial({ map: ctex(512, 512, glowTex), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), this.glowMat); this.glow.renderOrder = 4; r.add(this.glow);
    const N = 18; this.emberPos = new Float32Array(N * 3);
    const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.BufferAttribute(this.emberPos, 3));
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: ctex(64, 64, emberTex), size: 0.07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    this.embers.frustumCulled = false; this.embers.renderOrder = 5; r.add(this.embers);
    this.smoke = new CanvasCard(300, 900, 1);
    this.smokeMat = new THREE.MeshBasicMaterial({ map: this.smoke.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    this.smokeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 1.35), this.smokeMat); this.smokeMesh.geometry.translate(0, 1.35 * (880 / 900 - 0.5), 0);
    this.smokeMesh.renderOrder = 3; r.add(this.smokeMesh);
    this.spark = new CanvasCard(500, 500, 1);
    this.sparkMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshBasicMaterial({ map: this.spark.tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    this.sparkMesh.renderOrder = 4; r.add(this.sparkMesh);
  }

  update(f: number, cam: THREE.PerspectiveCamera, gl: THREE.WebGLRenderer, scene: THREE.Scene) {
    // ---- camera: creeping push-in, then a glide toward the fire after the burst, flip-shake on the burst ----
    const m = 0.3 * (f / TOTAL) + 0.7 * smoother(84, TOTAL + 6, f);
    cam.position.lerpVectors(CAM0, CAM1, m);
    const look = new THREE.Vector3().lerpVectors(LOOK0, LOOK1, m);
    const k = f - BURST, kick = k >= 0 && k < 7 ? 0.03 * (1 - k / 7) * (k % 2 ? -1 : 1) : 0;
    cam.position.y += kick; look.y += kick * 0.6;
    cam.fov = 35; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix();
    cam.up.set(Math.sin(kick * 0.5), 1, 0).normalize(); cam.lookAt(look);
    const size = gl.getDrawingBufferSize(new THREE.Vector2()); INK_U.uRes.value.copy(size); INK_U.uW.value = 3.6 * (size.y / 1080);
    gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0;
    scene.fog = scene.fog ?? new THREE.Fog("#1b2350", 14, 60);
    scene.background = new THREE.Color("#0b1030");

    // ---- light ----
    const g = fireAt(f), e = emberAt(f);
    const fl = 1 + 0.13 * Math.sin(f * 0.93) + 0.08 * Math.sin(f * 2.31 + 1.3) + 0.05 * Math.sin(f * 4.7 + 0.4);
    const fire = Math.min(1.15, g) * fl;
    this.fireLight.intensity = 9 * fire + 0.9 * e * (1 + 0.3 * Math.sin(f * 1.7));
    this.fireLight.position.y = 0.75 + 0.06 * Math.sin(f * 0.71);
    this.moon.intensity = 1.6 * (1 - 0.3 * Math.min(1, g));
    this.hemi.intensity = 1.3 * (1 - 0.25 * Math.min(1, g));
    CARD_U.uNight.value.set(0.56, 0.62, 0.98);
    CARD_U.uFire.value = Math.min(1, 0.85 * fire + 0.12 * e);

    // ---- caveman ----
    const s = poseAt(f), rub = rubAt(f), lit = g > 0.05;
    const light = lit ? -0.2 : (-130 * Math.PI) / 180;
    const opts = { s, rub, expr: exprAt(f), lid: lidAt(f), light, look: f < BURST ? 0.8 : 0.4 };
    this.man.draw(JSON.stringify(opts), (p) => caveman(p, opts));
    this.manMesh.position.y = hopAt(f);

    // ---- fire / glow / embers ----
    const bill = (o: THREE.Object3D) => { o.rotation.set(0, Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z), 0); };
    this.fireMesh.visible = g > 0.01;
    if (this.fireMesh.visible) { this.fire.draw(`${f}`, (p) => fxFire(p, g, f)); bill(this.fireMesh); }
    this.glow.position.copy(PIT).setY(0.65).addScaledVector(TOWARD, 0.3); this.glow.lookAt(cam.position);
    this.glowMat.opacity = Math.min(1, 0.75 * fire + 0.35 * e);
    this.glow.scale.setScalar(0.35 + 0.65 * Math.min(1, g + 0.4 * e));
    for (let i = 0; i < this.emberPos.length / 3; i++) {
      const life = 26 + (i * 7) % 13, t0 = BURST + 2 + ((i * 11) % 23), age = ((f - t0) % life + life) % life, on = f >= t0 ? 1 : 0, a = age / life;
      const x = PIT.x + 0.35 * Math.sin(i * 2.7) * (0.3 + a) + 0.08 * Math.sin(f * 0.3 + i), z = PIT.z + 0.15 * Math.cos(i * 1.9);
      this.emberPos.set([x, on ? 0.4 + 1.9 * a + 0.1 * Math.sin(i) : -5, z], i * 3);
    }
    this.embers.geometry.attributes.position.needsUpdate = true;
    // smoke curl from the plough tip
    const [tx, ty] = ploughTip(rub), tipW = at(tx, ty);
    const sm = smokeAt(f);
    this.smokeMesh.visible = sm > 0.01;
    if (this.smokeMesh.visible) {
      this.smoke.draw(`${f}`, (p) => fxSmoke(p, sm, f));
      this.smokeMesh.position.copy(tipW).addScaledVector(TOWARD, 0.05); bill(this.smokeMesh);
      const w = Math.min(1, e * 0.8 + g);
      this.smokeMat.color.setRGB(0.62 + 0.5 * w, 0.66 + 0.25 * w, 0.92 - 0.2 * w);
    }
    // spark: a burst star at the tip just before the fire
    const sk = (f - SPARK) / 9;
    this.sparkMesh.visible = sk >= 0 && sk < 1;
    if (this.sparkMesh.visible) {
      this.spark.draw(`${f}`, (p) => fxBurst(p, sk, "#ffe27a", 8, 30, 210));
      this.sparkMesh.position.copy(tipW).setY(tipW.y + 0.05).addScaledVector(TOWARD, 0.08); bill(this.sparkMesh);
      this.sparkMesh.scale.setScalar(0.6 + 0.6 * smooth(0, 0.4, sk));
    }
  }
}
