// 07 RETRO ANIME. 80s cel look: painted gradient sky, a huge moon disc, two-tone shading, an impact frame on the spark, speed lines, film grain.
import { canvas, rng, easeOut } from '../lib/common.js'
import { fireScene, fireTL } from '../lib/fire.js'
const PAL = { skin: '#f0b48a', skinDark: '#c98a66', hair: '#2a1a2e', hide: '#c47c42', hideDark: '#8a4f2a', wood: '#7a4a2c', stone: '#8c86a6', flame1: '#ff4f6a', flame2: '#ffb347', flame3: '#fff6d0', smoke: '#cbb8e8', eye: '#1a1430' }
const LINE = '#1a1430'
export default {
  name: 'retro anime',
  create({ W, H }) {
    this.W = W; this.H = H
    const sky = (this.sky = canvas(W, H)), x = sky.getContext('2d')
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e0a34'); g.addColorStop(0.45, '#2c1660'); g.addColorStop(0.75, '#6a2a7e'); g.addColorStop(1, '#a8407a'); x.fillStyle = g; x.fillRect(0, 0, W, H)
    const r = rng(12)
    for (let i = 0; i < W * 0.34; i++) { const y = r() * H * 0.7, k = r(); x.fillStyle = `rgba(255,${235 + k * 20},${220 + k * 35},${0.25 + k * 0.7})`; x.beginPath(); x.arc(r() * W, y, 0.8 + k * 2.2, 0, 7); x.fill() }
    const gr = (this.grain = canvas(256, 256)), gx = gr.getContext('2d'), n = rng(77); for (let i = 0; i < 256; i++) for (let k = 0; k < 256; k++) { const v = n() * 255; gx.fillStyle = `rgba(${v},${v},${v},.075)`; gx.fillRect(i, k, 1, 1) }
  },
  render(t, ctx, dur) {
    const { W, H } = this, x = ctx, T = fireTL(t, dur)
    const tc = Math.floor(t * 12) / 12 // on twos, like a cel
    const a = t - T.sparkAt, hit = a >= 0
    const rn = rng(Math.floor(t * 12) * 3 + 2), shake = hit ? Math.max(0, 1 - a / 0.3) * 18 : 0
    x.save(); x.translate((rn() - 0.5) * shake, (rn() - 0.5) * shake)
    x.drawImage(this.sky, 0, 0)
    // the big anime moon, banded at the bottom
    const R = Math.min(460, W * 0.32), mx = W * 0.5, my = H * 0.4
    x.fillStyle = hit ? '#ffd9a8' : '#f2e8ff'; x.beginPath(); x.arc(mx, my, R, 0, 7); x.fill()
    x.fillStyle = hit ? '#ff8f7c' : '#9a86d6'; for (let i = 0; i < 6; i++) { const y = my + R * 0.2 + i * R * 0.125, h = R * 0.018 + i * R * 0.01; x.fillRect(mx - R * 1.04, y, R * 2.08, h) }
    // warm wash from the fire
    if (hit) { const g = x.createRadialGradient(W / 2 + 120, H * 0.82, 40, W / 2 + 120, H * 0.82, 1100); g.addColorStop(0, `rgba(255,150,70,${0.55 * T.glow})`); g.addColorStop(1, 'rgba(255,120,60,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H) }
    // speed lines after the spark
    if (hit && a < 1.2) {
      x.strokeStyle = `rgba(255,255,255,${0.85 * (1 - a / 1.2)})`
      const cx = W / 2 + 130, cy = H * 0.8
      for (let i = 0; i < 110; i++) { const an = rn() * 6.283, r0 = 260 + rn() * 300, r1 = r0 + 700 + rn() * 1300; x.lineWidth = 1 + rn() * 6; x.beginPath(); x.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); x.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); x.stroke() }
    }
    // rocks and ground, two-tone
    const gy = H * 0.86
    x.fillStyle = '#2a1e46'; x.beginPath(); x.moveTo(-20, gy); x.lineTo(-20, H * 0.62); x.quadraticCurveTo(W * 0.12, H * 0.58, W * 0.2, gy); x.closePath(); x.fill()
    x.fillStyle = '#3c2a5c'; x.fillRect(-20, gy, W + 40, H)
    x.fillStyle = hit ? 'rgba(255,140,80,.25)' : 'rgba(255,255,255,.04)'; x.fillRect(-20, gy, W + 40, 18)
    const paint = {
      fill(p, k) { x.lineJoin = 'round'; x.strokeStyle = LINE; x.lineWidth = 6; x.stroke(p); x.fillStyle = PAL[k]; x.fill(p) },
      lines(segs, w, k) { x.lineCap = 'round'; x.strokeStyle = LINE; x.lineWidth = w + 11; segs.forEach((s) => { x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); x.stroke() }); x.strokeStyle = PAL[k]; x.lineWidth = w; segs.forEach((s) => { x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); x.stroke() }) },
    }
    const sc = W / H > 1 ? 2.0 : 1.75
    fireScene(paint, W, gy, tc, dur, sc)
    // cel shadow across the caveman's back
    x.restore()
    // impact frame: 2 inverted frames at the spark
    if (hit && a < 2 / 30) { x.save(); x.globalCompositeOperation = 'difference'; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.restore() }
    // title in the 80s font look
    if (hit) {
      const u = easeOut(Math.min(1, (a - 0.2) / 0.3))
      if (u > 0) { x.save(); x.globalAlpha = u; x.textAlign = 'center'; x.font = 'italic 800 120px "Inter Tight", sans-serif'; x.lineWidth = 14; x.strokeStyle = LINE; x.strokeText('FIRE!', W / 2, 260); x.fillStyle = '#ffe27a'; x.fillText('FIRE!', W / 2, 260); x.restore(); x.textAlign = 'left' }
    }
    x.fillStyle = 'rgba(255,190,130,.05)'; x.fillRect(0, 0, W, H)
    x.save(); x.translate(Math.floor(t * 24) * 37 % 256, Math.floor(t * 24) * 91 % 256); x.fillStyle = x.createPattern(this.grain, 'repeat'); x.fillRect(-256, -256, W + 512, H + 512); x.restore()
  },
}
