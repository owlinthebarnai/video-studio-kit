// The discovery of fire in 3D. `kit` decides how round things are and what they're made of, as in three-claude.js.
import * as THREE from 'three'
import { fireTL } from './fire.js'
const D = (d) => (d * Math.PI) / 180

export function makeCaveman(kit) {
  const m = kit.mat, seg = kit.seg ?? 16, g = new THREE.Group()
  const skin = m(kit.skin ?? 0xe0a072), hair = m(kit.hair ?? 0x3b2416), hide = m(kit.hide ?? 0xa8743e), hideDark = m(kit.hideDark ?? 0x6e4824)
  const cap = (r, l, mat) => kit.box ? new THREE.Mesh(new THREE.BoxGeometry(r * 2, l + r * 2, r * 2), mat) : new THREE.Mesh(new THREE.CapsuleGeometry(r, l, Math.max(2, seg >> 2), seg), mat)
  const ball = (r, mat) => kit.box ? new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 2, r * 2), mat) : new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1)), mat)
  const hips = new THREE.Group(); hips.position.y = 0.9; g.add(hips)
  const torso = new THREE.Group(); hips.add(torso)
  const body = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.55), hide) : new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.95, seg), hide)
  body.position.y = 0.48; torso.add(body)
  const strap = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.6), hideDark) : new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, seg, Math.PI), hideDark)
  if (kit.box) { strap.position.set(0.15, 0.55, 0); strap.rotation.z = D(30) } else { strap.position.set(0, 0.6, 0); strap.rotation.set(D(90), D(30), 0) }
  torso.add(strap)
  for (const [x, y, z] of [[-0.18, 0.3, 0.38], [0.16, 0.66, 0.34], [0.22, 0.2, 0.36]]) { const s = ball(0.08, hideDark); s.position.set(x, y, kit.box ? 0.28 : z); s.scale.z = 0.4; torso.add(s) }
  // head with hair, beard and brow
  const head = new THREE.Group(); head.position.y = 1.32; torso.add(head)
  const skull = ball(0.36, skin); skull.scale.set(1, 1.08, 1); head.add(skull)
  const mop = ball(0.42, hair); mop.position.set(-0.08, 0.14, -0.08); mop.scale.set(1, 0.85, 1); head.add(mop)
  const beard = ball(0.3, hair); beard.position.set(0.06, -0.24, 0.16); beard.scale.set(1.05, 0.9, 0.8); head.add(beard)
  const brow = cap(0.06, 0.32, hair); brow.rotation.z = D(90); brow.position.set(0.04, 0.12, 0.32); head.add(brow)
  const eye = ball(0.05, m(0x14110f)); eye.position.set(0.14, 0.03, 0.33); head.add(eye)
  const eye2 = eye.clone(); eye2.position.x = -0.06; head.add(eye2)
  const mouth = ball(0.07, m(0x3a1410)); mouth.position.set(0.06, -0.14, 0.33); mouth.scale.set(1, 0.3, 0.6); head.add(mouth)
  // limbs: a joint group with the limb hanging below it
  const limb = (parent, r, l, mat, x, y) => { const j = new THREE.Group(); j.position.set(x, y, 0); const c = cap(r, l, mat); c.position.y = -(l / 2 + r * 0.6); j.add(c); parent.add(j); return j }
  const armL = limb(torso, 0.11, 0.5, skin, -0.42, 0.86), armR = limb(torso, 0.11, 0.5, skin, 0.42, 0.86)
  for (const a of [armL, armR]) { const h = ball(0.13, skin); h.position.y = -0.8; a.add(h) }
  const legL = limb(hips, 0.14, 0.44, skin, -0.18, 0.04), legR = limb(hips, 0.14, 0.44, skin, 0.18, 0.04)
  for (const l of [legL, legR]) { const f = ball(0.16, skin); f.scale.set(1, 0.55, 1.5); f.position.set(0, -0.72, 0.1); l.add(f) }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = !!kit.selfShadow } })
  g.userData = { hips, torso, head, armL, armR, legL, legR, mouth }
  // crouch 0..1, cheer 0..1, rub -1..1
  g.userData.pose = ({ crouch = 0, cheer = 0, rub = 0 } = {}) => {
    hips.position.y = 0.9 - crouch * 0.45
    legL.rotation.x = D(-80 * crouch); legR.rotation.x = D(-30 * crouch); legR.rotation.z = D(0)
    torso.rotation.x = D(28 * crouch * (1 - cheer))
    // rubbing: both hands forward on the drill; cheering: both arms up
    const fwd = D(-70 * (1 - cheer) - 10), up = D(-165 * cheer)
    armL.rotation.set(cheer > 0.01 ? up : fwd + D(rub * 10), 0, D(cheer * -25))
    armR.rotation.set(cheer > 0.01 ? up : fwd - D(rub * 10), 0, D(cheer * 25))
    head.rotation.x = D(14 * crouch * (1 - cheer) - 12 * cheer)
    mouth.scale.set(1, 0.3 + cheer * 0.9, 0.6)
  }
  g.userData.pose()
  return g
}

// Stones, logs, the drill, flames, smoke, a spark and the fire light. Call stage.update(t, dur) every frame.
export function makeFireStage(kit) {
  const m = kit.mat, seg = kit.seg ?? 16, g = new THREE.Group()
  const wood = m(kit.wood ?? 0x8a5a2b), stone = m(kit.stone ?? 0x8f8f9c)
  const stones = new THREE.Group(); g.add(stones)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, s = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.3), stone) : new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, kit.flat ? 0 : 1), stone)
    s.position.set(Math.cos(a) * 0.72, 0.1, Math.sin(a) * 0.72); s.scale.set(1.2, 0.8, 1); s.rotation.y = a; stones.add(s)
  }
  const logs = new THREE.Group(); g.add(logs)
  for (let i = 0; i < 3; i++) {
    const l = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), wood) : new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.2, Math.max(5, seg >> 1)), wood)
    l.rotation.set(D(70), (i / 3) * Math.PI * 2, 0); l.position.y = 0.22; const piv = new THREE.Group(); piv.rotation.y = (i / 3) * Math.PI * 2 + 0.3; piv.add(l); l.rotation.set(D(68), 0, 0); logs.add(piv)
  }
  // the fire drill: a board and a stick
  const drill = new THREE.Group(); g.add(drill)
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.34), wood); board.position.y = 0.06; drill.add(board)
  const stick = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), wood) : new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8), wood)
  stick.position.y = 0.6; drill.add(stick)
  // flames: three nested cones (or boxes), unlit so they glow
  const fmat = (c) => (kit.flameMat ? kit.flameMat(c) : new THREE.MeshBasicMaterial({ color: c }))
  const flames = new THREE.Group(); flames.position.y = 0.15; g.add(flames)
  const tongues = []
  const tongue = (r, h, c, x, z) => { const f = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, h, r * 1.6), fmat(c)) : new THREE.Mesh(new THREE.ConeGeometry(r, h, Math.max(5, seg >> 1)), fmat(c)); f.position.set(x, h / 2, z); f.userData = { h, x, z }; flames.add(f); tongues.push(f) }
  tongue(0.42, 1.5, kit.f1 ?? 0xf0442a, 0, 0); tongue(0.3, 1.1, kit.f1 ?? 0xf0442a, 0.22, -0.1); tongue(0.28, 1.0, kit.f1 ?? 0xf0442a, -0.2, 0.08)
  tongue(0.26, 1.0, kit.f2 ?? 0xffa31f, 0.02, 0.12); tongue(0.14, 0.6, kit.f3 ?? 0xfff27a, 0, 0.22)
  // smoke and embers
  const smokeM = new THREE.MeshLambertMaterial({ color: kit.smoke ?? 0xcfcad8, transparent: true, opacity: 0.7 })
  const puffs = []; for (let i = 0; i < 7; i++) { const p = kit.box ? new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), smokeM) : new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), smokeM); g.add(p); puffs.push(p) }
  const embers = []; for (let i = 0; i < 10; i++) { const e = new THREE.Mesh(kit.box ? new THREE.BoxGeometry(0.07, 0.07, 0.07) : new THREE.OctahedronGeometry(0.05), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd34d : 0xff7a2a })); g.add(e); embers.push(e) }
  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xfff6c0 })); spark.position.y = 0.2; g.add(spark)
  const light = new THREE.PointLight(kit.lightColor ?? 0xff8a3a, 0, 22, 1.6); light.position.y = 1.0; light.castShadow = !!kit.fireShadows; g.add(light)
  g.traverse((o) => { if (o.isMesh && o !== spark && !tongues.includes(o)) { o.castShadow = true; o.receiveShadow = true } })
  const update = (t, dur, stepped = t) => {
    const T = fireTL(t, dur), tt = stepped
    drill.visible = T.grow < 0.05
    stick.rotation.y = tt * 40; stick.position.x = Math.sin(tt * 34) * 0.02
    flames.visible = T.grow > 0.02
    const fl = 1 + 0.12 * Math.sin(tt * 31) + 0.08 * Math.sin(tt * 57)
    tongues.forEach((f, i) => { const k = T.grow * (fl + Math.sin(tt * 13 + i) * 0.08); f.scale.set(Math.min(1, T.grow * 1.3), Math.max(0.01, k), Math.min(1, T.grow * 1.3)); f.position.y = (f.userData.h * k) / 2; f.position.x = f.userData.x + Math.sin(tt * 9 + i) * 0.05 })
    puffs.forEach((p, i) => { const life = (tt * 0.55 + i / 7) % 1; p.visible = T.smoke > 0.02; p.position.set(Math.sin(tt * 2 + i * 1.7) * 0.15 + life * 0.3, 0.4 + life * 2.6, 0); p.scale.setScalar((0.35 + life * 1.1) * T.smoke) })
    embers.forEach((e, i) => { const life = (tt * (0.6 + (i % 4) * 0.12) + i * 0.17) % 1; e.visible = T.grow > 0.1; e.position.set(Math.sin(i * 2.1 + tt * 3) * 0.5, 0.5 + life * 3 * T.grow, Math.cos(i * 1.3) * 0.3) })
    spark.visible = T.spark > 0; spark.scale.setScalar(0.4 + T.spark); spark.rotation.y = tt * 20
    light.intensity = (kit.lightMax ?? 60) * T.glow * fl
    return T
  }
  return { group: g, update }
}

// Caveman + fire laid out together. Returns { group, man, stage, update }.
export function makeFireScene(kit) {
  const group = new THREE.Group()
  const stage = makeFireStage(kit); stage.group.position.set(0.9, 0, 0); group.add(stage.group)
  const man = makeCaveman(kit); man.position.set(-0.75, 0, 0.1); man.rotation.y = D(70); group.add(man)
  const update = (t, dur, stepped = t) => {
    const T = stage.update(t, dur, stepped)
    man.userData.pose({ crouch: 1 - T.joy, cheer: T.joy, rub: T.rubbing ? Math.sin(stepped * 34) : 0 })
    man.position.y = T.hop * 0.5
    man.position.x = -0.75 - T.joy * 0.05
    man.rotation.y = D(70 - T.joy * 50)
    return T
  }
  return { group, man, stage, update }
}
