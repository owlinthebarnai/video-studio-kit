// The discovery of fire, as pieces every 2D style can paint its own way.
// Piece keys: skin, skinDark, hair, hide, hideDark, wood, stone, flame1, flame2, flame3, smoke, eye.
import { clamp, ss, easeOut, rng, lerp } from './common.js'

// One 5-second arc, as fractions of the beat: rub the fire drill, smoke, a spark, the fire takes, he cheers.
export function fireTL(t, dur) {
  const u = clamp(t / dur)
  const spark = 0.46
  return {
    u,
    rubbing: u < spark + 0.04,
    rub: Math.sin(t * 34), // hands up/down along the drill
    smoke: ss(0.14, 0.4, u) * (1 - ss(0.62, 0.86, u)),
    spark: u >= spark && u < spark + 0.07 ? 1 - (u - spark) / 0.07 : 0,
    sparkAt: spark * dur,
    grow: u < spark ? 0 : easeOut((u - spark) / 0.2),
    joy: ss(0.6, 0.7, u),
    hop: u > 0.66 ? Math.abs(Math.sin((t - 0.66 * dur) * 7)) * ss(0.66, 0.72, u) : 0,
    glow: u < spark ? 0.05 : 0.25 + 0.75 * easeOut((u - spark) / 0.2),
  }
}

// x, y = between his feet. s = 1 is ~230 px tall standing. Faces right, toward the fire.
// pose: crouch 0..1, rub -1..1 (hand stroke), cheer 0..1, drill: [x, y] world point the drill stands on.
export function drawCaveman(paint, x, y, s, pose = {}) {
  const { crouch = 0, rub = 0, cheer = 0, drill = null, flip = false } = pose
  const d = flip ? -1 : 1
  const P = (dx, dy) => [x + dx * s * d, y + dy * s]
  const seg = (a, b) => [...P(...a), ...P(...b)]
  const c = clamp(crouch)
  const hip = [lerp(0, -6, c), lerp(-96, -50, c)]
  // legs: back leg kneels when crouched, front leg squats
  const kneeB = [lerp(-8, -38, c), lerp(-48, -14, c)], footB = [lerp(-12, -74, c), lerp(0, -2, c)]
  const kneeF = [lerp(8, 44, c), lerp(-48, -56, c)], footF = [lerp(14, 30, c), 0]
  paint.lines([seg(hip, kneeB), seg(kneeB, footB)], 26 * s, 'skinDark')
  paint.lines([seg(hip, kneeF), seg(kneeF, footF)], 27 * s, 'skin')
  const foot = (f, k) => { const p = new Path2D(); const [fx, fy] = P(f[0] + 8, f[1] - 4); p.ellipse(fx, fy, 19 * s, 10 * s, 0, 0, Math.PI * 2); paint.fill(p, k) }
  foot(footB, 'skinDark'); foot(footF, 'skin')
  // torso leans toward the fire when crouched, straightens when he cheers
  const lean = lerp(0, 24, c) * (1 - cheer)
  const L = (lean * Math.PI) / 180
  const up = (len) => [hip[0] + Math.sin(L) * len, hip[1] - Math.cos(L) * len]
  const shoulder = up(84), neck = up(98), headC = up(132)
  // back arm
  const handTargets = () => {
    if (cheer > 0.01 || !drill) {
      const hb = [lerp(shoulder[0] + 30, shoulder[0] - 58, cheer), lerp(shoulder[1] + 70, shoulder[1] - 84, cheer)]
      const hf = [lerp(shoulder[0] + 44, shoulder[0] + 62, cheer), lerp(shoulder[1] + 62, shoulder[1] - 90, cheer)]
      return [hb, hf]
    }
    // both hands on the drill, rubbing it between the palms
    const dx = (drill[0] - x) / (s * d), dy = (drill[1] - y) / s
    return [[dx - 12, dy - 56 - rub * 8], [dx + 12, dy - 70 + rub * 8]]
  }
  const [hb, hf] = handTargets()
  const elbow = (sh, h, out) => [(sh[0] + h[0]) / 2 + out, (sh[1] + h[1]) / 2 + 22 * (1 - cheer) - 10 * cheer]
  const eb = elbow(shoulder, hb, -16), ef = elbow(shoulder, hf, 10)
  paint.lines([seg(shoulder, eb), seg(eb, hb)], 22 * s, 'skinDark')
  // the hide tunic, one shoulder strap
  const body = new Path2D()
  const pts = [[-34, 14], [36, 18], [30, -46], [20, -86], [-22, -88], [-30, -40]].map(([a, b]) => {
    const rx = a * Math.cos(L) - b * Math.sin(L), ry = a * Math.sin(L) + b * Math.cos(L)
    return P(hip[0] + rx, hip[1] + ry)
  })
  body.moveTo(...pts[0]); pts.slice(1).forEach((p) => body.lineTo(...p)); body.closePath()
  paint.fill(body, 'hide')
  // ragged hem
  const hem = new Path2D(); const h0 = pts[0], h1 = pts[1]
  hem.moveTo(...h0); for (let i = 1; i <= 6; i++) { const u = i / 6; hem.lineTo(lerp(h0[0], h1[0], u - 0.08), lerp(h0[1], h1[1], u) + (i % 2 ? 14 : 2) * s) } hem.lineTo(...h1); hem.closePath()
  paint.fill(hem, 'hide')
  const strap = new Path2D(); strap.moveTo(...P(...up(80))); strap.lineTo(...P(...up(66))); paint.lines([seg(up(84), [hip[0] + 24, hip[1] - 20])], 9 * s, 'hideDark')
  // spots on the hide
  for (const [a, b, r] of [[-10, -30, 7], [12, -58, 6], [16, -16, 5]]) { const rx = a * Math.cos(L) - b * Math.sin(L), ry = a * Math.sin(L) + b * Math.cos(L); const p = new Path2D(); const [px, py] = P(hip[0] + rx, hip[1] + ry); p.arc(px, py, r * s, 0, Math.PI * 2); paint.fill(p, 'hideDark') }
  // front arm
  paint.lines([seg(shoulder, ef), seg(ef, hf)], 23 * s, 'skin')
  const hand = (h, k) => { const p = new Path2D(); const [hx, hy] = P(...h); p.arc(hx, hy, 13 * s, 0, Math.PI * 2); paint.fill(p, k) }
  hand(hb, 'skinDark'); hand(hf, 'skin')
  // neck + head
  paint.lines([seg(shoulder, neck)], 22 * s, 'skin')
  const [hx, hy] = P(...headC)
  const hair = new Path2D(); const hr = rng(3)
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.95 + (i / 8) * 1.15) * d, r = (38 + hr() * 10) * s; const ox = d < 0 ? -1 : 1; hair.moveTo(hx, hy); hair.arc(hx - 6 * s * d + Math.cos(a) * 6 * s, hy - 4 * s + Math.sin(a) * 6 * s, r * 0.62, 0, Math.PI * 2) }
  paint.fill(hair, 'hair')
  const head = new Path2D(); head.ellipse(hx + 4 * s * d, hy, 31 * s, 34 * s, 0, 0, Math.PI * 2); paint.fill(head, 'skin')
  // brow ridge + beard
  const beard = new Path2D(); beard.moveTo(hx - 18 * s * d, hy + 6 * s); beard.quadraticCurveTo(hx + 6 * s * d, hy + 56 * s, hx + 32 * s * d, hy + 10 * s); beard.quadraticCurveTo(hx + 10 * s * d, hy + 26 * s, hx - 18 * s * d, hy + 6 * s); paint.fill(beard, 'hair')
  paint.lines([[hx + 6 * s * d, hy - 12 * s, hx + 30 * s * d, hy - 10 * s]], 7 * s, 'hair')
  const eye = new Path2D(); eye.arc(hx + 20 * s * d, hy - 3 * s, 4.2 * s, 0, Math.PI * 2); paint.fill(eye, 'eye')
  // open mouth when he cheers
  if (cheer > 0.5) { const m = new Path2D(); m.ellipse(hx + 22 * s * d, hy + 16 * s, 7 * s, 9 * s, 0, 0, Math.PI * 2); paint.fill(m, 'eye') }
  return { head: [hx, hy] }
}

// The fire drill: a board on the ground and a stick standing on it. x, y = where the stick meets the board.
export function drawDrill(paint, x, y, s, spin = 0) {
  const board = new Path2D(); board.roundRect(x - 54 * s, y - 4 * s, 108 * s, 16 * s, 5 * s); paint.fill(board, 'wood')
  paint.lines([[x + spin * 3 * s, y, x - spin * 3 * s, y - 98 * s]], 9 * s, 'wood')
}

// The campfire: stones, crossed logs, flames that grow from 0 to 1 and flicker. x, y = centre of the fire on the ground.
export function drawCampfire(paint, x, y, s, grow, t, { logs = true } = {}) {
  if (logs) {
    paint.lines([[x - 62 * s, y + 4 * s, x + 46 * s, y - 34 * s], [x + 62 * s, y + 4 * s, x - 46 * s, y - 34 * s]], 20 * s, 'wood')
    paint.lines([[x - 30 * s, y + 6 * s, x + 30 * s, y + 6 * s]], 18 * s, 'wood')
  }
  if (grow > 0.02) {
    const f = 1 + 0.1 * Math.sin(t * 31) + 0.07 * Math.sin(t * 57)
    const tongue = (ox, w, h, key, ph) => {
      const sway = Math.sin(t * 9 + ph) * 10 * s
      const p = new Path2D(); const H = h * grow * f * s, Wd = w * Math.min(1, grow * 1.4) * s
      p.moveTo(x + ox * s - Wd, y)
      p.bezierCurveTo(x + ox * s - Wd * 1.2, y - H * 0.45, x + ox * s - Wd * 0.2 + sway, y - H * 0.7, x + ox * s + sway * 1.6, y - H)
      p.bezierCurveTo(x + ox * s + Wd * 0.3 + sway, y - H * 0.66, x + ox * s + Wd * 1.2, y - H * 0.42, x + ox * s + Wd, y)
      p.closePath(); paint.fill(p, key)
    }
    tongue(-26, 30, 150, 'flame1', 1); tongue(26, 30, 165, 'flame1', 2); tongue(0, 46, 230, 'flame1', 0)
    tongue(-12, 26, 140, 'flame2', 3); tongue(14, 24, 120, 'flame2', 4)
    tongue(0, 16, 80, 'flame3', 5)
    // embers rising
    const r = rng(19)
    for (let i = 0; i < 9; i++) {
      const life = (t * (0.6 + r() * 0.5) + r()) % 1, ex = x + (r() - 0.5) * 120 * s + Math.sin(t * 3 + i) * 14 * s, ey = y - (60 + life * 300) * s * grow
      const p = new Path2D(); p.arc(ex, ey, (5 - life * 4) * s, 0, Math.PI * 2); paint.fill(p, i % 2 ? 'flame2' : 'flame3')
    }
  }
  // stones around the front
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.06 + (i / 6) * 0.88), sx = x + Math.cos(a) * 86 * s, sy = y + Math.sin(a) * 18 * s + 6 * s; const p = new Path2D(); p.ellipse(sx, sy, 20 * s, 14 * s, 0, 0, Math.PI * 2); paint.fill(p, 'stone') }
}

// Smoke puffs drifting up from x, y. amount 0..1.
export function drawSmoke(paint, x, y, s, amount, t) {
  if (amount <= 0.01) return
  for (let i = 0; i < 7; i++) {
    const life = (t * 0.55 + i / 7) % 1
    const px = x + Math.sin(t * 2 + i * 1.7) * 18 * s + life * 30 * s, py = y - life * 260 * s
    const r = (7 + life * 22) * s * amount
    const p = new Path2D(); p.arc(px, py, r, 0, Math.PI * 2); paint.fill(p, 'smoke')
  }
}

// The spark: a small star burst at the tip of the drill. k = 1 at its brightest.
export function drawSpark(paint, x, y, s, k) {
  if (k <= 0) return
  const p = new Path2D(), R = 46 * s * (0.6 + k * 0.6), r = R * 0.28
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r : R; p[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
  p.closePath(); paint.fill(p, 'flame3')
}

// Everything at once, laid out for a frame. gy = ground line. Returns where things are, for the style's own extras.
export function fireScene(paint, W, gy, t, dur, s = 1, opts = {}) {
  const T = fireTL(t, dur)
  const fx = W / 2 + 80 * s, manX = fx - 150 * s
  // before the fire takes: the drill sits where the fire will be
  if (T.grow < 0.05) { drawDrill(paint, fx, gy - 6 * s, s, T.rubbing ? T.rub : 0) }
  drawCampfire(paint, fx, gy, s, T.grow, t, { logs: T.grow > 0.02 || !opts.hideLogsBefore })
  drawSmoke(paint, fx, gy - 20 * s, s, T.smoke, t)
  const crouch = 1 - T.joy
  drawCaveman(paint, manX + T.joy * 40 * s, gy - T.hop * 60 * s, 1.08 * s, { crouch, rub: T.rubbing ? T.rub : 0, cheer: T.joy, drill: T.grow < 0.05 ? [fx, gy - 6 * s] : null })
  drawSpark(paint, fx, gy - 10 * s, s, T.spark)
  return { T, fireX: fx, manX, gy }
}
