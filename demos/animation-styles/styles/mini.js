// 10 MINIATURE DIORAMA. A tiny handmade set on a desk: cardboard, cotton smoke, tilt-shift blur. The camera pulls back to show the desk.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { makeFireScene } from '../lib/fire3d.js'
import { canvas, ss, rng, lerp } from '../lib/common.js'
const woodTex = () => { const c = canvas(1024, 1024), x = c.getContext('2d'), r = rng(7); x.fillStyle = '#a4703f'; x.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 520; i++) { const y = r() * 1024; x.strokeStyle = `rgba(${r() > 0.5 ? '60,34,14' : '214,164,112'},${0.05 + r() * 0.15})`; x.lineWidth = 0.6 + r() * 3; x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= 1024; k += 64) x.lineTo(k, y + Math.sin(k * 0.006 + i) * 11 + (r() - 0.5) * 3); x.stroke() } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t }
const felt = (col) => { const c = canvas(128, 128), x = c.getContext('2d'), r = rng(col & 255); x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = r() > 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},.06)`; x.fillRect(r() * 128, r() * 128, 2, 1) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t }
const VERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }'
const FRAG = `uniform sampler2D tex; uniform float focus,band,amt; uniform vec2 px; varying vec2 vUv;
void main(){ float d=max(0.,abs(vUv.y-focus)-band); float r=clamp(d*amt,0.,1.)*34.; vec3 c=vec3(0.); float w=0.;
 for(int i=0;i<44;i++){ float a=float(i)*2.39996; float k=sqrt(float(i)/44.)*r; c+=texture2D(tex,vUv+vec2(cos(a),sin(a))*k*px).rgb; w+=1.; }
 c/=w; c=pow(c,vec3(.97)); c*=vec3(1.03,1.0,.95); gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`
export default {
  name: 'miniature diorama',
  create({ W, H, renderer }) {
    this.W = W; this.H = H; this.r = renderer; const wide = W > H
    const s = (this.scene = new THREE.Scene()); s.background = new THREE.Color(0x2a2230)
    s.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.25
    const lamp = new THREE.SpotLight(0xffe2b0, 300, 60, 0.6, 0.6, 1.4); lamp.position.set(-6, 16, 6); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); s.add(lamp); s.add(lamp.target); this.lamp = lamp
    s.add(new THREE.HemisphereLight(0x8a90c0, 0x3a2a20, 0.35))
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })
    const sh = (m) => { m.castShadow = m.receiveShadow = true; return m }
    // the desk
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.55 })); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; s.add(desk)
    // the set: a felt-covered board with cardboard rocks, a cave and a painted night backdrop
    const board = sh(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.4, 48), new THREE.MeshStandardMaterial({ map: felt(0x4e6b3c), roughness: 1 }))); board.position.y = 0.2; s.add(board)
    const backdrop = sh(new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 5.5, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76), std(0x232a5a, { side: THREE.DoubleSide })))
    backdrop.position.y = 3.15; s.add(backdrop)
    const r = rng(4); for (let i = 0; i < 40; i++) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.05 + r() * 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xfff3c8 })); const a = Math.PI * (0.66 + r() * 0.68); st.position.set(Math.sin(a) * 4.2, 2.5 + r() * 3, Math.cos(a) * 4.2); st.lookAt(0, st.position.y, 0); s.add(st) }
    const cave = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), std(0x8c7a68, { flatShading: true }))); cave.position.set(-2.3, 1.2, -1.6); s.add(cave)
    for (let i = 0; i < 5; i++) { const rk = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + r() * 0.3, 0), std(0x9a8a78, { flatShading: true }))); rk.position.set(-2 + i * 1.1, 0.55, -2.6 + r()); s.add(rk) }
    const holder = new THREE.Group(); holder.position.y = 0.4; holder.scale.setScalar(0.85); s.add(holder)
    const kit = { seg: 18, selfShadow: true, mat: (c) => std(c, { roughness: 0.55 }), flameMat: (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.6 }), smoke: 0xf4f2ee, lightMax: 30, fireShadows: false }
    this.fire = makeFireScene(kit); holder.add(this.fire.group)
    // desk clutter that gives the scale away
    const mug = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.42, 3.2, 44, 1, true), std(0xe6e0d2, { side: THREE.DoubleSide, roughness: 0.28 }))); mug.position.set(wide ? -8 : -5.6, 1.6, 5.5); s.add(mug)
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(1.46, 40), std(0x3d2413, { roughness: 0.2 })); coffee.rotation.x = -Math.PI / 2; coffee.position.set(wide ? -8 : -5.6, 2.9, 5.5); s.add(coffee)
    const pencil = new THREE.Group(); const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 7.6, 6), std(0xf5c02e))); shaft.rotation.z = Math.PI / 2; pencil.add(shaft); const tip = sh(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 6), std(0xd9b07a))); tip.rotation.z = -Math.PI / 2; tip.position.x = 4.1; pencil.add(tip)
    pencil.position.set(wide ? 6 : 3.2, 0.18, 6.6); pencil.rotation.y = 0.5; s.add(pencil)
    this.cam = new THREE.PerspectiveCamera(28, W / H, 0.05, 200)
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 })
    this.post = new THREE.Scene(); this.pc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.pm = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { tex: { value: this.rt.texture }, focus: { value: 0.5 }, band: { value: 0.1 }, amt: { value: 3.2 }, px: { value: new THREE.Vector2(1 / W, 1 / H) } }, depthTest: false, depthWrite: false })
    this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.pm))
  },
  render(t, ctx, dur) {
    const T = this.fire.update(t, dur, t)
    const k = ss(0.62, 1, t / dur), e = k * k * (3 - 2 * k)
    // close on the tiny scene, then pull back once the fire is lit to show it's a model on a desk
    const near = new THREE.Vector3(0.2, 3.0, 7.0), far = new THREE.Vector3(0.6, 11, 26)
    this.cam.position.lerpVectors(near, far, e)
    this.cam.lookAt(new THREE.Vector3(0.1, 1.5, 0).lerp(new THREE.Vector3(0, 1.2, 0), e))
    this.lamp.target.position.set(0, 0, 0); this.lamp.target.updateMatrixWorld()
    const rr = this.r; rr.shadowMap.enabled = true; rr.shadowMap.needsUpdate = true
    rr.toneMapping = THREE.ACESFilmicToneMapping; rr.toneMappingExposure = 1.05
    rr.setSize(this.W, this.H, false)
    rr.setRenderTarget(this.rt); rr.render(this.scene, this.cam); rr.setRenderTarget(null)
    rr.toneMapping = THREE.NoToneMapping
    this.pm.uniforms.focus.value = lerp(0.52, 0.56, e); this.pm.uniforms.band.value = lerp(0.1, 0.14, e); this.pm.uniforms.amt.value = lerp(2.4, 3.0, e)
    rr.render(this.post, this.pc)
    ctx.drawImage(rr.domElement, 0, 0, this.W, this.H)
  },
}
