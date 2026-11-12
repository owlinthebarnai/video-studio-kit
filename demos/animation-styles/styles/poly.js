// 08 LOW POLY 3D. Flat faces, hard light, nothing round.
import * as THREE from 'three'
import { makeFireScene } from '../lib/fire3d.js'
import { rng, clamp } from '../lib/common.js'
const flat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...extra })
function rock(r, detail, seed, col) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rn = rng(seed), seen = new Map()
  for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!seen.has(k)) seen.set(k, 0.78 + rn() * 0.42); const v = seen.get(k); p.setXYZ(i, p.getX(i) * v, p.getY(i) * v, p.getZ(i) * v) }
  g.computeVertexNormals(); return new THREE.Mesh(g, flat(col))
}
export default {
  name: 'low poly 3d',
  create({ W, H, renderer }) {
    this.W = W; this.H = H; this.r = renderer
    const s = (this.scene = new THREE.Scene()); s.background = new THREE.Color(0x151a4a)
    this.hemi = new THREE.HemisphereLight(0x6f88ff, 0x2a1848, 1.2); s.add(this.hemi)
    const moon = new THREE.DirectionalLight(0xc8d4ff, 1.6); moon.position.set(-9, 12, 8); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -10, right: 10, top: 10, bottom: -6, far: 50 }); s.add(moon)
    // backdrop of faceted gradient triangles
    const bg = new THREE.PlaneGeometry(90, 120, 12, 16).toNonIndexed(), np = bg.attributes.position, rn = rng(4), col = []
    for (let i = 0; i < np.count; i += 3) { const y = (np.getY(i) + 60) / 120, c = new THREE.Color().lerpColors(new THREE.Color(0x3b2a8c), new THREE.Color(0x0c1038), clamp(y * 1.3)).offsetHSL(0, 0, rn() * 0.05); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b) }
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    const back = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true })); back.position.z = -40; s.add(back)
    const starM = new THREE.MeshBasicMaterial({ color: 0xfff7df }), im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.18), starM, 220), m4 = new THREE.Matrix4(), rs = rng(9)
    for (let i = 0; i < 220; i++) { const k = 0.5 + rs() * 1.5; m4.compose(new THREE.Vector3((rs() - 0.5) * 80, 6 + rs() * 40, -36 + rs() * 8), new THREE.Quaternion(), new THREE.Vector3(k, k, k)); im.setMatrixAt(i, m4) }
    s.add(im)
    const m = rock(2.2, 1, 8, 0xd9d6c4); m.position.set(6, 11, -20); s.add(m); this.moon = m
    // faceted ground, mountains and boulders
    const gg = new THREE.PlaneGeometry(60, 40, 18, 12), gp = gg.attributes.position, gr = rng(2); for (let i = 0; i < gp.count; i++) gp.setZ(i, (gr() - 0.5) * 0.35); gg.computeVertexNormals()
    const ground = new THREE.Mesh(gg, flat(0x3f6a3a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground)
    for (let i = 0; i < 5; i++) { const mt = new THREE.Mesh(new THREE.ConeGeometry(5 + i, 8 + i * 2, 5), flat([0x2c2a5a, 0x33306a, 0x282650][i % 3])); mt.position.set(-16 + i * 8, 3, -18 - (i % 2) * 4); mt.rotation.y = i; s.add(mt) }
    const rk = rng(5); for (let i = 0; i < 7; i++) { const b = rock(0.6 + rk() * 0.9, 0, i * 7 + 1, [0x8d7b86, 0x77728e, 0x9a8a7a][i % 3]); b.position.set(-7 + i * 2.3, 0.3, -3.5 - rk() * 3); b.castShadow = b.receiveShadow = true; s.add(b) }
    const kit = { seg: 6, flat: true, mat: (c) => flat(c), selfShadow: false, lightMax: 70 }
    this.fire = makeFireScene(kit); s.add(this.fire.group)
    this.cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 200)
  },
  render(t, ctx, dur) {
    const T = this.fire.update(t, dur, t)
    this.hemi.intensity = 1.2 + T.glow * 0.3; this.moon.rotation.y = t * 0.15
    const wide = this.W > this.H
    this.cam.position.set(Math.sin(t * 0.6) * 0.5, 3.0, wide ? 9.5 : 12.5); this.cam.lookAt(0.1, 1.3, 0)
    const rr = this.r; rr.shadowMap.enabled = true; rr.shadowMap.needsUpdate = true
    rr.setSize(this.W, this.H, false); rr.render(this.scene, this.cam)
    ctx.drawImage(rr.domElement, 0, 0, this.W, this.H)
  },
}
