// 09 RISOGRAPH. Two inks on off-white paper: each is its own halftone screen, printed slightly out of register.
import { canvas, rng } from '../lib/common.js'
import { fireScene, fireTL } from '../lib/fire.js'
const RH = 858
const PAPER = [244, 238, 224], A = [255, 86, 62], B = [38, 66, 170] // fluoro orange, medium blue
const toneA = { skin: 0.42, skinDark: 0.55, hair: 0.2, hide: 0.62, hideDark: 0.8, wood: 0.5, stone: 0, flame1: 1, flame2: 0.72, flame3: 0.32, smoke: 0, eye: 0.2 }
const toneB = { skin: 0.05, skinDark: 0.2, hair: 0.95, hide: 0.3, hideDark: 0.55, wood: 0.62, stone: 0.5, flame1: 0, flame2: 0, flame3: 0, smoke: 0.28, eye: 1 }
export default {
  name: 'risograph',
  create({ W, H }) {
    this.W = W; this.H = H; const RW = (this.RW = Math.round(W / 2))
    const mk = () => { const c = canvas(RW, RH); return { c, x: c.getContext('2d', { willReadFrequently: true }) } }
    this.a = mk(); this.b = mk(); this.o = canvas(RW, RH); this.ox = this.o.getContext('2d'); this.img = this.ox.createImageData(RW, RH)
    const scr = (ang, cell) => { const c = Math.cos(ang), s = Math.sin(ang), arr = new Float32Array(RW * RH); for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const u = (x * c + y * s) / cell, v = (-x * s + y * c) / cell; arr[y * RW + x] = 0.5 + 0.25 * (Math.cos(u * 6.283) + Math.cos(v * 6.283)) } return arr }
    this.sa = scr(0.26, 4.3); this.sb = scr(1.31, 4.3)
    const r = rng(4), gr = new Float32Array(RW * RH); for (let i = 0; i < gr.length; i++) gr[i] = r(); this.gr = gr
  },
  render(t0, ctx, dur) {
    const f = Math.floor(t0 * 12), t = f / 12, W = this.W, H = this.H, RW = this.RW, T = fireTL(t0, dur)
    const a = this.a.x, b = this.b.x
    for (const l of [a, b]) { l.setTransform(RW / W, 0, 0, RH / H, 0, 0); l.fillStyle = '#000'; l.fillRect(0, 0, W, H) }
    const g = (v) => { const k = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${k},${k},${k})` }
    const shape = (build, va, vb) => { a.fillStyle = g(va); b.fillStyle = g(vb); const p = new Path2D(); build(p); a.fill(p); b.fill(p) }
    // night sky: blue ink, stars knocked out; the orange ink rises from the horizon as the fire grows
    const skyB = b.createLinearGradient(0, 0, 0, H * 0.8); skyB.addColorStop(0, g(0.86)); skyB.addColorStop(1, g(0.5)); b.fillStyle = skyB; b.fillRect(0, 0, W, H)
    const skyA = a.createLinearGradient(0, H * 0.25, 0, H * 0.85); skyA.addColorStop(0, g(0)); skyA.addColorStop(1, g(0.1 + 0.55 * T.glow)); a.fillStyle = skyA; a.fillRect(0, 0, W, H)
    const sr = rng(6); b.fillStyle = '#000'
    for (let i = 0; i < 150; i++) { b.beginPath(); b.arc(sr() * W, sr() * H * 0.55, 2 + sr() * 5, 0, 7); b.fill() }
    // a crescent moon printed in both inks
    shape((p) => p.arc(W * 0.74, H * 0.18, 120, 0, 7), 0.1, 0)
    shape((p) => p.arc(W * 0.74 + 52, H * 0.18 - 26, 112, 0, 7), 0, 0.86)
    // mountains, then the ground
    shape((p) => { p.moveTo(-10, H * 0.72); p.lineTo(W * 0.16, H * 0.56); p.lineTo(W * 0.34, H * 0.68); p.lineTo(W * 0.58, H * 0.52); p.lineTo(W * 0.82, H * 0.66); p.lineTo(W + 10, H * 0.58); p.lineTo(W + 10, H); p.lineTo(-10, H); p.closePath() }, 0.08 + 0.2 * T.glow, 0.72)
    const gy = H * 0.84
    shape((p) => { p.moveTo(-10, gy); p.quadraticCurveTo(W / 2, gy - 26, W + 10, gy + 8); p.lineTo(W + 10, H); p.lineTo(-10, H); p.closePath() }, 0.18 + 0.3 * T.glow, 0.4)
    const paint = {
      fill(p, k) { a.fillStyle = g(toneA[k] ?? 0); b.fillStyle = g(toneB[k] ?? 0); a.fill(p); b.fill(p) },
      lines(segs, w, k) { for (const [l, tone] of [[a, toneA], [b, toneB]]) { l.strokeStyle = g(tone[k] ?? 0); l.lineCap = 'round'; l.lineWidth = w; l.beginPath(); segs.forEach((s) => { l.moveTo(s[0], s[1]); l.lineTo(s[2], s[3]) }); l.stroke() } },
    }
    fireScene(paint, W, gy + 4, t, dur, W / H > 1 ? 1.9 : 1.7)
    // title in orange ink only
    if (T.grow > 0.3) { a.save(); a.fillStyle = g(1); a.font = '800 150px "Inter Tight", sans-serif'; a.textAlign = 'center'; a.fillText('FIRE', W / 2, H * 0.36); a.restore() }
    // ------ print it ------
    const da = a.getImageData(0, 0, RW, RH).data, db = b.getImageData(0, 0, RW, RH).data
    const out = this.img.data, sa = this.sa, sb = this.sb, gr = this.gr, off = 2
    const gs = (f * 2311) % (RW * RH)
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const i = y * RW + x
      const xb = Math.min(RW - 1, x + off), yb = Math.min(RH - 1, y + 1), ib = yb * RW + xb
      const dA = da[i * 4] / 255, dB = db[ib * 4] / 255
      const n = gr[(i + gs) % gr.length], n2 = gr[(i * 3 + gs) % gr.length]
      const inkA = dA > 0.02 && dA * 1.08 + (n - 0.5) * 0.16 > sa[i] ? 0.94 + n * 0.06 : 0
      const inkB = dB > 0.02 && dB * 1.08 + (n2 - 0.5) * 0.16 > sb[i] ? 0.92 + n2 * 0.08 : 0
      const px = i * 4
      for (let c = 0; c < 3; c++) out[px + c] = PAPER[c] * (1 - inkA * (1 - A[c] / 255)) * (1 - inkB * (1 - B[c] / 255))
      out[px + 3] = 255
    }
    this.ox.putImageData(this.img, 0, 0)
    ctx.imageSmoothingEnabled = false; ctx.drawImage(this.o, 0, 0, this.W, this.H); ctx.imageSmoothingEnabled = true
  },
}
