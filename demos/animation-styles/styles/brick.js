// 04 LEGO STYLE. Everything is plastic bricks with studs: the ground, the cave, the fire and the caveman.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { makeFireScene } from '../lib/fire3d.js'
import { rng } from '../lib/common.js'
const U = 0.8, PLATE = 0.32
export default {
  name: 'lego style',
  create({ W, H, renderer }) {
    this.W = W; this.H = H; this.r = renderer
    const s = (this.scene = new THREE.Scene()); s.background = new THREE.Color(0x1c2a5a)
    s.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.3
    this.hemi = new THREE.HemisphereLight(0x9fb4ff, 0x40384a, 0.8); s.add(this.hemi)
    const moon = new THREE.DirectionalLight(0xc8d6ff, 1.4); moon.position.set(-10, 18, 14); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -10, far: 80 }); moon.shadow.bias = -0.0006; s.add(moon)
    const mat = {}, M = (c) => (mat[c] ??= new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0 }))
    const boxG = new THREE.BoxGeometry(1, 1, 1), studG = new THREE.CylinderGeometry(0.24 * U, 0.24 * U, 0.17, 14)
    const bricks = [], studs = []
    const add = (x, y, z, w, d, h, c, top = true) => {
      bricks.push({ x: x + (w * U) / 2, y: y + (h * PLATE) / 2, z: z + (d * U) / 2, sx: w * U - 0.02, sy: h * PLATE - 0.015, sz: d * U - 0.02, c })
      if (top) for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) studs.push({ x: x + (a + 0.5) * U, y: y + h * PLATE + 0.08, z: z + (b + 0.5) * U, c })
    }
    // green baseplate
    for (let a = -12; a < 12; a += 4) for (let b = -10; b < 8; b += 4) add(a * U, -PLATE, b * U, 4, 4, 1, 0x3a9a4c)
    // a brick cave: stepped grey walls with a dark doorway
    const r = rng(5)
    for (let lvl = 0; lvl < 9; lvl++) for (let a = -11; a < -3; a += 2) { if (lvl < 5 && a >= -9 && a < -6) continue; const w = lvl > 6 ? 1 : 2; if (a + lvl * 0.4 > -3) continue; add(a * U, lvl * PLATE * 3, -5 * U, w, 3, 3, [0x7a7a86, 0x6a6a76, 0x8a8a96][Math.floor(r() * 3)], lvl === 8) }
    add(-9 * U, 0, -4.9 * U, 3, 1, 15, 0x1a1626, false)
    // a few brick trees
    for (const [tx, tz] of [[7, -6], [10, -3], [-12, 2]]) { add(tx * U, 0, tz * U, 1, 1, 9, 0x6a4022, false); add((tx - 1) * U, 9 * PLATE, (tz - 1) * U, 3, 3, 3, 0x2f7a3a); add((tx - 0.5) * U, 12 * PLATE, (tz - 0.5) * U, 2, 2, 3, 0x3a8a44) }
    // build the meshes, one instanced mesh per colour
    const byC = new Map(); bricks.forEach((b) => (byC.get(b.c) ?? byC.set(b.c, []).get(b.c)).push(b))
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion()
    for (const [c, list] of byC) { const im = new THREE.InstancedMesh(boxG, M(c), list.length); list.forEach((b, i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.sx, b.sy, b.sz)))); im.castShadow = im.receiveShadow = true; s.add(im) }
    const sByC = new Map(); studs.forEach((b) => (sByC.get(b.c) ?? sByC.set(b.c, []).get(b.c)).push(b))
    for (const [c, list] of sByC) { const im = new THREE.InstancedMesh(studG, M(c), list.length); list.forEach((b, i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(1, 1, 1)))); im.castShadow = im.receiveShadow = true; s.add(im) }
    // stars as round plates far away
    const starIm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), 120), rs = rng(9)
    for (let i = 0; i < 120; i++) { m4.compose(new THREE.Vector3((rs() - 0.5) * 60, 6 + rs() * 30, -30), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)); starIm.setMatrixAt(i, m4) }
    s.add(starIm)
    // the caveman and fire, all boxes, in shiny plastic
    const kit = { box: true, seg: 8, mat: (c) => M(c), flameMat: (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, roughness: 0.3, transparent: true, opacity: 0.92 }), lightMax: 70 }
    this.fire = makeFireScene(kit); s.add(this.fire.group); this.fire.group.scale.setScalar(1.9); this.fire.group.position.set(-0.4, 0, 1.5)
    this.cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 200)
  },
  render(t, ctx, dur) {
    const f = Math.floor(t * 15) / 15 // brick films move on 15 fps
    const T = this.fire.update(t, dur, f)
    this.hemi.intensity = 0.8 + T.glow * 0.3
    const wide = this.W > this.H
    this.cam.position.set(1.2, 5.5, wide ? 15 : 19); this.cam.lookAt(0.4, 2.4, 0)
    const rr = this.r; rr.shadowMap.enabled = true; rr.shadowMap.needsUpdate = true
    rr.toneMapping = THREE.ACESFilmicToneMapping; rr.toneMappingExposure = 1.0
    rr.setSize(this.W, this.H, false); rr.render(this.scene, this.cam)
    rr.toneMapping = THREE.NoToneMapping
    ctx.drawImage(rr.domElement, 0, 0, this.W, this.H)
  },
}
