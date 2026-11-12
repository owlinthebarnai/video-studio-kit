// 02 PS2 STYLE. Few polygons, muddy little textures, fog, a low-res picture stretched up, and a mission HUD.
import * as THREE from 'three'
import { makeFireScene } from '../lib/fire3d.js'
import { canvas, rng } from '../lib/common.js'
const LOW = 0.34 // render at a third of the size, then stretch it up blurry, like a 2001 console
function muddy(col, n = 32) {
  const c = canvas(n, n), x = c.getContext('2d'), r = rng(col & 0xffff)
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const v = (r() - 0.5) * 34; const R = ((col >> 16) & 255) + v, G = ((col >> 8) & 255) + v, B = (col & 255) + v; x.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; x.fillRect(i, k, 1, 1) }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t
}
export default {
  name: 'ps2 style',
  create({ W, H, renderer }) {
    this.W = W; this.H = H; this.r = renderer
    const s = (this.scene = new THREE.Scene()); s.background = new THREE.Color(0x1d2340); s.fog = new THREE.Fog(0x1d2340, 9, 30)
    s.add(new THREE.HemisphereLight(0x8090c0, 0x302820, 1.1))
    const moon = new THREE.DirectionalLight(0xb8c4ff, 0.9); moon.position.set(-6, 10, 6); s.add(moon)
    const lam = (c, rep = 1) => { const tx = muddy(c); tx.repeat.set(rep, rep); return new THREE.MeshLambertMaterial({ color: 0xffffff, map: tx }) }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 4, 4), lam(0x4d5a32, 14)); ground.rotation.x = -Math.PI / 2; s.add(ground)
    // a few chunky trees and a rock cliff
    const r = rng(8)
    for (let i = 0; i < 7; i++) { const tr = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.4, 5), lam(0x4a3220)); trunk.position.y = 0.7; tr.add(trunk); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2 - k * 0.3, 1.4, 6), lam(0x2c4a2a)); c.position.y = 1.6 + k * 0.7; tr.add(c) } tr.position.set(-9 + i * 3 + r() * 1.5, 0, -5 - r() * 6); s.add(tr) }
    const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), lam(0x5a5560, 2)); cliff.position.set(-5.5, 1.2, -2.5); cliff.scale.set(1.2, 1, 1); s.add(cliff)
    const kit = { seg: 6, smooth: false, mat: (c) => new THREE.MeshLambertMaterial({ color: c }), lightMax: 40 }
    this.fire = makeFireScene(kit); s.add(this.fire.group)
    this.cam = new THREE.PerspectiveCamera(46, W / H, 0.1, 100)
    this.low = canvas(Math.round(W * LOW), Math.round(H * LOW))
  },
  render(t, ctx, dur) {
    const T = this.fire.update(t, dur, t)
    const wide = this.W > this.H
    // third-person camera that drifts behind the hero, like a cutscene
    this.cam.position.set(-1.6 + Math.sin(t * 0.5) * 0.4, 2.4, wide ? 6.5 : 8.2); this.cam.lookAt(0.2, 1.1, 0)
    const rr = this.r; rr.shadowMap.enabled = false
    const lw = this.low.width, lh = this.low.height
    rr.setSize(lw, lh, false); rr.render(this.scene, this.cam)
    const lx = this.low.getContext('2d'); lx.drawImage(rr.domElement, 0, 0, lw, lh)
    ctx.imageSmoothingEnabled = true; ctx.drawImage(this.low, 0, 0, this.W, this.H)
    // mission HUD
    const x = ctx, W = this.W
    x.save(); x.font = 'italic 800 46px "Inter Tight", sans-serif'; x.fillStyle = '#ffd35a'; x.shadowColor = '#000'; x.shadowBlur = 0; x.shadowOffsetX = 3; x.shadowOffsetY = 3
    x.fillText(T.grow > 0.05 ? 'MISSION COMPLETE' : 'NEW MISSION', 50, 90)
    x.font = 'italic 800 64px "Inter Tight", sans-serif'; x.fillStyle = '#fff'; x.fillText(T.grow > 0.05 ? 'FIRE DISCOVERED' : 'MAKE FIRE', 50, 160)
    // a heat bar fills while he rubs
    const heat = Math.min(1, T.u / 0.46)
    x.shadowOffsetX = 0; x.shadowOffsetY = 0; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(50, this.H - 140, 420, 34); x.fillStyle = heat >= 1 ? '#ff6a2a' : '#ffb03a'; x.fillRect(56, this.H - 134, 408 * heat, 22)
    x.font = 'italic 800 34px "Inter Tight", sans-serif'; x.fillStyle = '#fff'; x.fillText('HEAT', 50, this.H - 156)
    x.restore()
  },
}
