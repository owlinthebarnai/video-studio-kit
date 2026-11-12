// 01 PIXEL ART. Drawn at ~120x214 real pixels, snapped to a small palette, scaled up with no smoothing. Game HUD.
import { canvas, rng } from '../lib/common.js'
import { fireScene, fireTL } from '../lib/fire.js'
const PH = 214
const PALETTE = ['#10123a', '#171a4d', '#1f2460', '#2a3074', '#3a3f8a', '#16244a', '#1f6b47', '#2a8a58', '#c9cdf2', '#ffffff', '#3b2416', '#8a5a2b', '#a8743e', '#6e4824', '#e0a072', '#b97a52', '#8a8aa0', '#5a5a70', '#f0442a', '#ffa31f', '#fff27a', '#ffd86a', '#14110f', '#6b3a2a', '#a85a3a']
const RGB = PALETTE.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
const PAL = { skin: '#e0a072', skinDark: '#b97a52', hair: '#3b2416', hide: '#a8743e', hideDark: '#6e4824', wood: '#8a5a2b', stone: '#8a8aa0', flame1: '#f0442a', flame2: '#ffa31f', flame3: '#fff27a', smoke: '#5a5a70', eye: '#14110f' }
const GLYPHS = { A:'010,101,111,101,101', B:'110,101,110,101,110', C:'011,100,100,100,011', D:'110,101,101,101,110', E:'111,100,110,100,111', F:'111,100,110,100,100', G:'011,100,101,101,011', H:'101,101,111,101,101', I:'111,010,010,010,111', J:'001,001,001,101,010', K:'101,101,110,101,101', L:'100,100,100,100,111', M:'10001,11011,10101,10001,10001', N:'1001,1101,1011,1001,1001', O:'111,101,101,101,111', P:'110,101,110,100,100', Q:'010,101,101,110,011', R:'110,101,110,101,101', S:'011,100,010,001,110', T:'111,010,010,010,010', U:'101,101,101,101,111', V:'101,101,101,101,010', W:'10001,10001,10101,11011,10001', X:'101,101,010,101,101', Y:'101,101,010,010,010', Z:'111,001,010,100,111', '0':'111,101,101,101,111', '1':'010,110,010,010,111', '2':'111,001,111,100,111', '3':'111,001,111,001,111', '4':'101,101,111,001,001', '5':'111,100,111,001,111', '6':'111,100,111,101,111', '7':'111,001,010,010,010', '8':'111,101,111,101,111', '9':'111,101,111,001,111', ' ':'000,000,000,000,000', '.':'000,000,000,000,010', '!':'010,010,010,000,010', ':':'000,010,000,010,000', '/':'001,001,010,100,100', '+':'000,010,111,010,000' }
export default {
  name: 'pixel art',
  create({ W, H }) { this.W = W; this.H = H; this.PW = Math.round((W / H) * PH); this.c = canvas(this.PW, PH); this.x = this.c.getContext('2d', { willReadFrequently: true }) },
  render(t, ctx, dur) {
    const PW = this.PW, x = this.x, T = fireTL(t, dur), px = (a, b, w = 1, h = 1) => x.fillRect(Math.round(a), Math.round(b), w, h)
    x.setTransform(1, 0, 0, 1, 0, 0)
    // night sky bands
    const NAVY = ['#10123a', '#171a4d', '#1f2460', '#2a3074', '#3a3f8a']
    ;[0, 38, 80, 124, 170].forEach((b, i) => { x.fillStyle = NAVY[i]; px(0, b, PW, 60) })
    const r = rng(7)
    for (let i = 0; i < PW * 0.4; i++) { const a = r() * PW, b = r() * 140, on = Math.sin(t * 5 + r() * 6.28) > -0.3; x.fillStyle = on ? '#c9cdf2' : '#3a3f8a'; px(a, b, 1, 1) }
    // cave + hills
    x.fillStyle = '#16244a'; for (let a = 0; a < PW; a++) px(a, 158 - Math.round(4 * Math.sin(a * 0.09) + 3 * Math.sin(a * 0.21)), 1, 30)
    x.fillStyle = '#5a5a70'; for (let a = 0; a < 34; a++) px(a, 120 + Math.round(Math.abs(a - 4) * 0.6), 1, 60)
    x.fillStyle = '#10123a'; for (let a = 3; a < 26; a++) px(a, 140 + Math.round(Math.abs(a - 14) * 0.9), 1, 40)
    const ground = 174
    x.fillStyle = '#1f6b47'; px(0, ground, PW, 60); x.fillStyle = '#2a8a58'; px(0, ground, PW, 2)
    // the scene, drawn smooth at low res, then snapped to the palette below
    const S = PH / 1716
    x.save(); x.scale(S, S)
    const paint = {
      fill(p, k) { x.fillStyle = PAL[k]; x.fill(p) },
      lines(segs, w, k) { x.strokeStyle = PAL[k]; x.lineCap = 'butt'; x.lineWidth = w; x.beginPath(); segs.forEach((s) => { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]) }); x.stroke() },
    }
    const step = Math.floor(t * 10) / 10
    fireScene(paint, PW / S, ground / S + 8 / S, step, dur, 1.75)
    x.restore()
    // snap every pixel to the palette: no anti-aliasing survives
    const im = x.getImageData(0, 0, PW, PH), d = im.data
    for (let i = 0; i < d.length; i += 4) {
      let best = 0, bd = 1e9
      for (let k = 0; k < RGB.length; k++) { const c = RGB[k], dd = (d[i] - c[0]) ** 2 + (d[i + 1] - c[1]) ** 2 + (d[i + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = k } }
      d[i] = RGB[best][0]; d[i + 1] = RGB[best][1]; d[i + 2] = RGB[best][2]; d[i + 3] = 255
    }
    x.putImageData(im, 0, 0)
    // HUD
    const text = (s, a, b, col) => { x.fillStyle = col; let cur = a; for (const ch of s.toUpperCase()) { const g = (GLYPHS[ch] || GLYPHS[' ']).split(','); g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') px(cur + i, b + j) })); cur += g[0].length + 1 } }
    text('LV 01', 5, 6, '#ffffff')
    text(T.grow > 0.05 ? 'FIRE: 1/1' : 'FIRE: 0/1', 5, 13, '#ffd86a')
    if (T.grow > 0.3 && Math.floor(t * 6) % 2 === 0) text('+ FIRE UNLOCKED!', Math.round(PW / 2 - 32), 40, '#fff27a')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.c, 0, 0, this.W, this.H)
    ctx.imageSmoothingEnabled = true
  },
}
