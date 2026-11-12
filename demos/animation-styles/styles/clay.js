// 05 CLAYMATION. Soft shapes with thumbprints, soft light, and only 12 poses a second, like stop motion.
import * as THREE from 'three'
import { makeFireScene } from '../lib/fire3d.js'
import { canvas, rng } from '../lib/common.js'
function thumbprints() {
  const c = canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512)
  const r = rng(5)
  for (let i = 0; i < 90; i++) {
    const a = r() * 512, b = r() * 512, k = 14 + r() * 26, tilt = r() * 6.28
    x.save(); x.translate(a, b); x.rotate(tilt); x.lineWidth = 1.1
    for (let j = 2; j < k; j += 3.2) { x.strokeStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},.13)`; x.beginPath(); x.ellipse(0, 0, j, j * 1.25, 0, 0, Math.PI * 2); x.stroke() }
    x.restore()
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}
export default {
  name: 'claymation',
  create({ W, H, renderer }) {
    this.W = W; this.H = H; this.r = renderer
    const s = (this.scene = new THREE.Scene()); s.background = new THREE.Color(0x2b3566)
    s.fog = new THREE.Fog(0x2b3566, 20, 48)
    this.hemi = new THREE.HemisphereLight(0x9fb0ff, 0x3a3050, 0.9); s.add(this.hemi)
    const moonL = new THREE.DirectionalLight(0xbcd0ff, 1.1); moonL.position.set(-8, 12, 10); moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024); moonL.shadow.radius = 8; Object.assign(moonL.shadow.camera, { left: -10, right: 10, top: 10, bottom: -6, far: 50 }); s.add(moonL)
    const bump = thumbprints()
    this.mats = []
    const K = (c, rep = 1.2) => { const b = bump.clone(); b.repeat.set(rep, rep); b.needsUpdate = true; const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.75, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(c), bumpMap: b, bumpScale: 3.2 }); this.mats.push(m); return m }
    const kit = { seg: 24, selfShadow: true, mat: (c) => K(c), flameMat: (c) => { const m = K(c, 1); m.emissive = new THREE.Color(c); m.emissiveIntensity = 1.4; return m }, lightMax: 90, fireShadows: true }
    this.fire = makeFireScene(kit); s.add(this.fire.group)
    // clay ground, rocks and a cave
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), K(0x5f7a48, 4)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground)
    const rk = rng(3)
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), K(0x7c7480, 2)); m.scale.set(1.4 + rk(), 0.9 + rk() * 0.8, 1.2); m.position.set(-6 + i * 2.6 + rk(), 0.3, -6 - rk() * 3); m.castShadow = m.receiveShadow = true; s.add(m) }
    const cave = new THREE.Mesh(new THREE.SphereGeometry(3.4, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2), K(0x6c6474, 2)); cave.position.set(-5.2, 0, -2.6); cave.castShadow = cave.receiveShadow = true; s.add(cave)
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24, 0, Math.PI), K(0x1b1624, 1)); mouth.position.set(-4.2, 0.01, 0.55); mouth.rotation.y = 0.5; s.add(mouth)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 20), K(0xf0e6c0, 1.5)); moon.position.set(5, 9, -14); s.add(moon)
    this.cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 150)
    this.grain = canvas(240, 240); const gx = this.grain.getContext('2d'); const gr = rng(2); for (let i = 0; i < 240; i++) for (let k = 0; k < 240; k++) { const v = gr() * 255; gx.fillStyle = `rgba(${v},${v},${v},.05)`; gx.fillRect(i, k, 1, 1) }
  },
  render(t0, ctx, dur) {
    const f = Math.floor(t0 * 12), t = f / 12, r = rng(f * 7 + 3)
    const T = this.fire.update(t, dur, t)
    this.fire.group.position.x = (r() - 0.5) * 0.02
    this.hemi.intensity = 0.9 + T.glow * 0.4
    this.mats.forEach((m, i) => m.bumpMap.offset.set(((f * 13 + i) % 7) * 0.003, ((f * 7 + i) % 5) * 0.003))
    const wide = this.W > this.H
    this.cam.position.set(0.2, 3.2, wide ? 9.5 : 12.5); this.cam.lookAt(0.1, 1.3, 0)
    const rr = this.r; rr.shadowMap.enabled = true; rr.shadowMap.needsUpdate = true
    rr.toneMapping = THREE.ACESFilmicToneMapping; rr.toneMappingExposure = 1.0
    rr.setSize(this.W, this.H, false); rr.render(this.scene, this.cam)
    rr.toneMapping = THREE.NoToneMapping
    ctx.drawImage(rr.domElement, 0, 0, this.W, this.H)
    ctx.fillStyle = ctx.createPattern(this.grain, 'repeat'); ctx.fillRect(0, 0, this.W, this.H)
  },
}
