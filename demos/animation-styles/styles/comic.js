// 03 COMIC ART. Ink outlines, flat colour, Ben-Day dots, action lines, a caption box and a WHOOSH you can read from space.
import { canvas, rng, backOut } from '../lib/common.js'
import { fireScene, fireTL } from '../lib/fire.js'
const INK = '#14110f'
const PAL = { skin: '#e0a072', skinDark: '#b97a52', hair: '#3b2416', hide: '#a8743e', hideDark: '#6e4824', wood: '#8a5a2b', stone: '#9a9aa6', flame1: '#f0442a', flame2: '#ffa31f', flame3: '#fff27a', smoke: '#e9e6f2', eye: '#14110f' }
function burst(x, cx, cy, R, r, n, seed) { const rn = rng(seed); x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, k = i % 2 ? r * (0.85 + rn() * 0.3) : R * (0.82 + rn() * 0.32); x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * k, cy + Math.sin(a) * k) } x.closePath() }
export default {
  name: 'comic art',
  create({ W, H }) {
    this.W = W; this.H = H; this.wide = W / H > 1
    const d = (this.dots = canvas(26, 26)), dx = d.getContext('2d'); dx.fillStyle = 'rgba(255,255,255,.18)'; dx.beginPath(); dx.arc(6.5, 6.5, 4.6, 0, 7); dx.arc(19.5, 19.5, 4.6, 0, 7); dx.fill()
    const dk = (this.dotsDark = canvas(18, 18)), kx = dk.getContext('2d'); kx.fillStyle = 'rgba(20,17,15,.34)'; kx.beginPath(); kx.arc(4.5, 4.5, 3, 0, 7); kx.arc(13.5, 13.5, 3, 0, 7); kx.fill()
  },
  render(t, ctx, dur) {
    const { W, H } = this, x = ctx, T = fireTL(t, dur), lit = T.grow > 0.05
    const sh = T.spark > 0 ? 16 * T.spark : 0, rn = rng(Math.floor(t * 30))
    x.save(); x.translate((rn() - 0.5) * sh, (rn() - 0.5) * sh)
    // night sky that warms once the fire takes
    x.fillStyle = lit ? '#ff9a3c' : '#24306e'; x.fillRect(-40, -40, W + 80, H + 80)
    if (lit) { x.fillStyle = '#ffc14a'; x.beginPath(); x.arc(W / 2 + 80, H * 0.8, 900 * T.grow + 200, 0, 7); x.fill(); x.fillStyle = '#ffe36a'; x.beginPath(); x.arc(W / 2 + 80, H * 0.8, 560 * T.grow + 100, 0, 7); x.fill() }
    x.fillStyle = x.createPattern(this.dots, 'repeat'); x.fillRect(-40, -40, W + 80, H + 80)
    // stars while it's still dark
    if (!lit) { const r = rng(4); x.fillStyle = '#fff6c8'; for (let i = 0; i < 40; i++) { const a = r() * W, b = r() * H * 0.55, k = 4 + r() * 7; x.beginPath(); x.moveTo(a, b - k); x.lineTo(a + k * 0.3, b); x.lineTo(a, b + k); x.lineTo(a - k * 0.3, b); x.fill() } }
    // action lines burst out of the fire
    if (lit) {
      const cx = W / 2 + 140, cy = H * 0.78, lr = rng(Math.floor(t * 12) + 5); x.fillStyle = 'rgba(255,255,255,.6)'
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2 + lr() * 0.09, w = 0.012 + lr() * 0.024, r0 = 380 + lr() * 90; x.beginPath(); x.moveTo(cx + Math.cos(a - w) * 2400, cy + Math.sin(a - w) * 2400); x.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a + w) * 2400, cy + Math.sin(a + w) * 2400); x.fill() }
    }
    // the cave mouth on the left and the ground
    const gy = H * 0.8
    x.lineWidth = 10; x.strokeStyle = INK; x.lineJoin = 'round'
    x.fillStyle = '#5b4a6a'; x.beginPath(); x.moveTo(-40, gy + 10); x.lineTo(-40, H * 0.34); x.quadraticCurveTo(W * 0.18, H * 0.26, W * 0.32, H * 0.5); x.quadraticCurveTo(W * 0.38, H * 0.66, W * 0.36, gy + 10); x.closePath(); x.fill(); x.stroke()
    x.fillStyle = '#1c1426'; x.beginPath(); x.moveTo(W * 0.02, gy + 10); x.quadraticCurveTo(W * 0.04, H * 0.46, W * 0.17, H * 0.46); x.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.28, gy + 10); x.closePath(); x.fill()
    x.fillStyle = '#6f8b3a'; x.beginPath(); x.moveTo(-40, gy + 24); x.quadraticCurveTo(W * 0.4, gy - 30, W * 0.7, gy + 6); x.quadraticCurveTo(W * 0.86, gy + 24, W + 40, gy - 10); x.lineTo(W + 40, H + 200); x.lineTo(-40, H + 200); x.closePath(); x.fill(); x.stroke()
    x.fillStyle = x.createPattern(this.dotsDark, 'repeat'); x.fill()
    const paint = {
      fill(p, k) { x.lineJoin = 'round'; x.strokeStyle = INK; x.lineWidth = 9; x.stroke(p); x.fillStyle = PAL[k]; x.fill(p) },
      lines(segs, w, k) {
        x.lineCap = 'round'; x.strokeStyle = INK; x.lineWidth = w + 14
        segs.forEach((s) => { x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); x.stroke() })
        x.strokeStyle = PAL[k]; x.lineWidth = w
        segs.forEach((s) => { x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); x.stroke() })
      },
    }
    fireScene(paint, W, gy + 6, t, dur, this.wide ? 2.0 : 1.75)
    x.restore()
    // caption box
    x.save(); x.translate(56, 70); x.rotate(-0.02)
    x.fillStyle = '#fff27a'; x.strokeStyle = INK; x.lineWidth = 9; x.fillRect(0, 0, 520, 126); x.strokeRect(0, 0, 520, 126)
    x.fillStyle = INK; x.font = '70px Bangers, Impact, sans-serif'; x.textBaseline = 'middle'; x.fillText(lit ? 'AND THEN... FIRE!' : '100,000 YEARS AGO...', 22, 66)
    x.restore()
    if (lit) {
      const a = (t - T.sparkAt), u = backOut(a / 0.26, 2.2), wob = Math.sin(a * 22) * 0.012
      x.save(); this.wide ? x.translate(W / 2 + 700, 470) : x.translate(W * 0.64, 520); const bs = this.wide ? 0.85 : 0.56; x.scale(u * bs, u * bs); x.rotate(-0.09 + wob)
      burst(x, 0, 0, 520, 300, 15, 4); x.fillStyle = INK; x.save(); x.translate(10, 16); x.fill(); x.restore()
      burst(x, 0, 0, 520, 300, 15, 4); x.fillStyle = '#e23a2a'; x.fill(); x.lineWidth = 14; x.strokeStyle = INK; x.stroke()
      burst(x, 0, 0, 430, 265, 15, 9); x.fillStyle = '#ffd31f'; x.fill()
      x.font = '200px Bangers, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'
      x.lineWidth = 24; x.strokeStyle = INK; x.strokeText('WHOOSH!', 0, 8); x.fillStyle = '#fff'; x.fillText('WHOOSH!', 0, 8)
      x.restore(); x.textAlign = 'left'
    }
    x.lineWidth = 16; x.strokeStyle = INK; x.strokeRect(8, 8, W - 16, H - 16)
  },
}
