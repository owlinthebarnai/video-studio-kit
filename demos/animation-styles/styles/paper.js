// 06 PAPER CUTOUT. Every piece is cut card with a little shadow under it. Moves in steps, 8 poses a second.
import { canvas, rng, lerp } from '../lib/common.js'
import { fireScene, fireTL } from '../lib/fire.js'
const PAL = { skin: '#e3a679', skinDark: '#c4875c', hair: '#4a2f22', hide: '#b98249', hideDark: '#87582c', wood: '#8d5b33', stone: '#a9a3a8', flame1: '#ea5b2a', flame2: '#f6a524', flame3: '#fde98a', smoke: '#cfc8d6', eye: '#2a1d18' }
export default {
  name: 'paper cutout',
  create({ W, H }) {
    this.W = W; this.H = H
    const g = (this.fibre = canvas(W, H)), x = g.getContext('2d'), r = rng(31)
    for (let i = 0; i < W * 27; i++) { const v = r() > 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},${0.018 + r() * 0.028})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2) }
    for (let i = 0; i < W * 1.5; i++) { x.strokeStyle = `rgba(${r() > 0.5 ? '255,255,255' : '60,40,30'},${0.03 + r() * 0.05})`; x.lineWidth = 0.7; const a = r() * W, b = r() * H, ang = r() * 6.28, l = 8 + r() * 26; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(ang) * l, b + Math.sin(ang) * l); x.stroke() }
  },
  render(t0, ctx, dur) {
    const { W, H } = this, x = ctx
    const f = Math.floor(t0 * 8), t = f / 8, jr = rng(f * 11 + 1)
    const T = fireTL(t0, dur)
    const piece = (color, build, lift = 9) => { x.save(); x.shadowColor = 'rgba(30,18,40,.42)'; x.shadowBlur = lift * 1.6; x.shadowOffsetX = lift * 0.45; x.shadowOffsetY = lift * 0.8; x.fillStyle = color; const p = new Path2D(); build(p); x.fill(p); x.restore() }
    // night sky in paper strips; the bottom strips warm up when the fire takes
    const warm = T.glow
    const cold = ['#141a44', '#1b2152', '#232a62', '#2c3370', '#36397a', '#3f3f82', '#4a4486', '#55498a']
    const hot = ['#141a44', '#1f2152', '#33285e', '#55346a', '#81446c', '#b5586a', '#de7660', '#f39a5c']
    const sh = H / cold.length
    cold.forEach((c, i) => {
      const y = i * sh - 30
      const col = i > 3 ? mix(c, hot[i], warm) : c
      piece(col, (p) => { p.moveTo(-20, y); let px = -20; const r = rng(i * 7 + 3); while (px < W + 40) { px += 40 + r() * 60; p.lineTo(px, y + (r() - 0.5) * 16) } p.lineTo(W + 40, H + 40); p.lineTo(-20, H + 40); p.closePath() }, 5)
    })
    // stars and a moon hung on threads
    const sr = rng(5)
    for (let i = 0; i < W / 110; i++) {
      const sx = 60 + sr() * (W - 120), len = 90 + sr() * 300, swing = Math.sin(t * 2 + i) * 0.05, k = 15 + sr() * 16
      x.save(); x.translate(sx, -10); x.rotate(swing)
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, len); x.stroke()
      x.translate(0, len + k)
      piece('#fbe9a6', (p) => { for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2 - Math.PI / 2, r = j % 2 ? k * 0.45 : k; p[j ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r) } p.closePath() }, 5)
      x.restore()
    }
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W * 0.78, -10); x.lineTo(W * 0.78, 190); x.stroke()
    piece('#f7efd2', (p) => { p.arc(W * 0.78, 290, 100, 0, 7) }, 8)
    piece(mix('#141a44', '#33285e', warm), (p) => { p.arc(W * 0.78 + 44, 262, 92, 0, 7) }, 2)
    // layered hills of card
    const hills = [['#2f3d3a', 0.66, 8], ['#3c5244', 0.72, 11], ['#4b6a4c', 0.79, 14]]
    hills.forEach(([col, yy, lift], i) => piece(mix(col, '#a2643c', warm * 0.35), (p) => { const r = rng(i * 13 + 2), base = H * yy; p.moveTo(-20, H + 40); p.lineTo(-20, base); let px = -20; while (px < W + 40) { px += 120 + r() * 140; p.quadraticCurveTo(px - 70, base - 40 - r() * 90, px, base + (r() - 0.5) * 30) } p.lineTo(W + 40, H + 40); p.closePath() }, lift))
    const gy = H * 0.84
    piece(mix('#5a7a50', '#9a7a4a', warm * 0.4), (p) => { p.moveTo(-20, gy); p.quadraticCurveTo(W / 2, gy - 30, W + 20, gy + 10); p.lineTo(W + 20, H + 40); p.lineTo(-20, H + 40); p.closePath() }, 16)
    // the scene, every piece a shadowed card, stepped at 8 poses a second
    const paint = {
      fill(p, k) { x.save(); x.shadowColor = 'rgba(30,18,40,.45)'; x.shadowBlur = 11; x.shadowOffsetX = 4; x.shadowOffsetY = 8; x.fillStyle = PAL[k]; x.fill(p); x.restore() },
      lines(segs, w, k) { x.save(); x.shadowColor = 'rgba(30,18,40,.45)'; x.shadowBlur = 11; x.shadowOffsetX = 4; x.shadowOffsetY = 8; x.strokeStyle = PAL[k]; x.lineCap = 'round'; x.lineWidth = w; x.beginPath(); segs.forEach((s) => { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]) }); x.stroke(); x.restore() },
    }
    x.save(); x.translate((jr() - 0.5) * 3, (jr() - 0.5) * 3)
    fireScene(paint, W, gy + 4, t, dur, W / H > 1 ? 1.9 : 1.7)
    x.restore()
    x.drawImage(this.fibre, 0, 0)
  },
}
function mix(a, b, k) {
  const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)), A = h(a), B = h(b)
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], Math.max(0, Math.min(1, k)))).toString(16).padStart(2, '0')).join('')
}
