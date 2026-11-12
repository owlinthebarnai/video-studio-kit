// fire.js: "The discovery of fire", a 5-second example. A caveman rubs a fire drill at night, smoke, a spark,
// the fire takes and lights the hillside, he jumps up and cheers. One shot, slow push-in, warm grade on the spark.
(() => {
  const tSmoke = 0.9, tSpark = 2.3, tJoy = 3.0
  const G = 900, FX = 1110, MX = 790

  function sky(t, warm) {
    boilSeed('sky')
    paint(rectPts(-600, -400, W + 1200, H + 800), { wash: mixCol(PAL.night, '#5a2a3a', warm * .6), ink: null })
    paint(ellPts(W / 2, H * .95, W * .75, H * .45, 30, 10), { fill: mixCol(PAL.violet, '#e07a4a', warm), fillOp: 110, bleed: .3, tex: .6, ink: null })
    for (let i = 0; i < 36; i++) {
      boilSeed('star' + i)
      const x = hash(i) * (W + 200) - 100, y = hash(i + 100) * H * .5 - 40
      const tw = .55 + .45 * Math.sin(t * (2 + 2 * hash(i + 300)) + i)
      paint(starPts(x, y, (3 + 5 * hash(i + 200)) * tw * (1 - warm * .5), .35, 4), { wash: PAL.cream, washOp: 150 + 100 * tw, ink: null })
    }
    boilSeed('moon')
    paint(ellPts(300, 170, 60, 60, 24, 1.5), { wash: PAL.cream, fill: PAL.ochre, fillOp: 40, ink: PAL.ink, sw: .8 })
  }

  function land(warm) {
    boilSeed('cave')
    paint(ellPts(260, G + 40, 420, 380, 30, 6), { wash: mixCol('#5b5268', '#7a5a50', warm), fill: '#3a3446', fillOp: 90, bleed: .1, tex: .6, ink: PAL.ink, sw: 1 })
    paint(ellPts(250, G + 60, 170, 230, 24, 4), { wash: '#16121e', ink: PAL.ink, sw: .8 })
    boilSeed('ground')
    paint(rectPts(-200, G - 20, W + 400, 400, 3), { wash: mixCol(mixCol(PAL.sap, PAL.night, .35), '#8a6a3a', warm * .7), fill: mixCol(PAL.sap, PAL.night, .55), fillOp: 100, bleed: .05, tex: .6, ink: null })
    inkLine([[-200, G - 18], [W / 2, G - 24], [W + 200, G - 16]], 1, PAL.ink, 'ink', .5)
  }

  // A watercolour caveman. crouch 0..1, cheer 0..1, rub -1..1. Faces right.
  function caveman(x, y, u, o) {
    const { crouch = 0, cheer = 0, rub = 0, dy = 0 } = o
    const hip = [x, y - lerp(5.2, 2.8, crouch) * u + dy * u]
    const lean = lerp(0, .45, crouch) * (1 - cheer)
    const up = (l) => [hip[0] + Math.sin(lean) * l * u, hip[1] - Math.cos(lean) * l * u]
    const sh = up(4.2), head = up(6.1)
    boilSeed('cm-legs')
    const knee = [x + lerp(.4, 2.2, crouch) * u, y - lerp(2.6, 2.9, crouch) * u + dy * u], foot = [x + lerp(.6, 1.6, crouch) * u, y + dy * u]
    const kneeB = [x - lerp(.4, 1.8, crouch) * u, y - lerp(2.6, .7, crouch) * u + dy * u], footB = [x - lerp(.6, 3.6, crouch) * u, y + dy * u]
    for (const [a, b, c] of [[hip, kneeB, footB], [hip, knee, foot]]) inkLine([a, b, c], 2.6, PAL.ink, 'ink', .4)
    for (const f of [foot, footB]) paint(ellPts(f[0] + .3 * u, f[1] - .2 * u, .7 * u, .35 * u, 12, 1), { wash: '#d9a07a', ink: PAL.ink, sw: .7 })
    // hide tunic
    boilSeed('cm-body')
    push(); translate(...hip); rotate(lean)
    paint([[-1.7 * u, .6 * u], [1.8 * u, .7 * u], [1.5 * u, -2.6 * u], [.9 * u, -4.4 * u], [-1.1 * u, -4.5 * u], [-1.6 * u, -2.2 * u]], { wash: '#b98249', fill: '#87582c', fillOp: 70, bleed: .1, tex: .7, ink: PAL.ink, sw: 1 })
    for (const [a, b, r] of [[-.6, -1.5, .35], [.6, -3, .3], [.9, -.8, .25]]) paint(ellPts(a * u, b * u, r * u, r * u * .8, 10), { wash: '#6e4824', ink: null })
    pop()
    // arms: on the drill while rubbing, up while cheering
    boilSeed('cm-arms')
    const drill = [FX - 10, G - 3.2 * u]
    const hb = cheer > .01 ? [lerp(drill[0] - .8 * u, sh[0] - 2.6 * u, cheer), lerp(drill[1] - rub * .5 * u, sh[1] - 3.8 * u, cheer)] : [drill[0] - .6 * u, drill[1] - rub * .5 * u]
    const hf = cheer > .01 ? [lerp(drill[0] + .6 * u, sh[0] + 2.6 * u, cheer), lerp(drill[1] + rub * .5 * u - u, sh[1] - 4 * u, cheer)] : [drill[0] + .6 * u, drill[1] + rub * .5 * u - u]
    for (const h of [hb, hf]) { const el = [(sh[0] + h[0]) / 2, (sh[1] + h[1]) / 2 + (1 - cheer) * .9 * u]; inkLine([sh, el, h], 2.4, PAL.ink, 'ink', .4); paint(ellPts(h[0], h[1], .45 * u, .45 * u, 10), { wash: '#d9a07a', ink: PAL.ink, sw: .7 }) }
    // head, hair, beard
    boilSeed('cm-head')
    paint(ellPts(head[0] - .3 * u, head[1] - .4 * u, 1.75 * u, 1.55 * u, 16, 2), { wash: '#3b2416', ink: null })
    paint(ellPts(head[0] + .2 * u, head[1], 1.3 * u, 1.45 * u, 18, 1), { wash: '#e3a679', fill: '#c4875c', fillOp: 50, ink: PAL.ink, sw: .9 })
    paint([[head[0] - .8 * u, head[1] + .2 * u], [head[0] + 1.4 * u, head[1] + .3 * u], [head[0] + .5 * u, head[1] + 2.1 * u]], { wash: '#3b2416', ink: null })
    inkLine([[head[0] + .2 * u, head[1] - .55 * u], [head[0] + 1.2 * u, head[1] - .5 * u]], 1.6, '#3b2416', 'ink', .2)
    paint(ellPts(head[0] + .8 * u, head[1] - .15 * u, .16 * u, .2 * u, 8), { wash: PAL.ink, ink: null })
    if (cheer > .5) paint(ellPts(head[0] + .9 * u, head[1] + .75 * u, .3 * u, .38 * u, 10), { wash: '#5a1a14', ink: null })
  }

  function fire(t, k) {
    const f = (i) => 1 + .12 * Math.sin(t * 13 + i * 2) + .06 * Math.sin(t * 23 + i)
    boilSeed('logs')
    inkLine([[FX - 110, G + 4], [FX + 90, G - 50]], 7, '#6e4824', 'ink', .3); inkLine([[FX + 110, G + 4], [FX - 90, G - 50]], 7, '#8d5b33', 'ink', .3)
    if (k > .01) {
      glow(FX, G - 120, 200 + 380 * k, '#FFB45A', .7 * k)
      const tongue = (dx, w, h, wash, i) => { boilSeed('fl' + i); paint([[FX + dx - w, G], [FX + dx - w * .8, G - h * .5 * k * f(i)], [FX + dx + 14 * Math.sin(t * 8 + i), G - h * k * f(i)], [FX + dx + w * .8, G - h * .5 * k * f(i)], [FX + dx + w, G]], { wash, fill: '#FFE27A', fillOp: 60, bleed: .15, tex: .4, ink: PAL.ink, sw: .7 }) }
      tongue(-50, 55, 200, '#E8542A', 0); tongue(55, 55, 215, '#E8542A', 1); tongue(0, 85, 300, '#F28A2E', 2); tongue(0, 45, 170, '#FFD25A', 3)
      for (let i = 0; i < 8; i++) { const life = (t * (.6 + hash(i) * .5) + hash(i + 5)) % 1; paint(ellPts(FX + (hash(i + 9) - .5) * 160, G - 120 - life * 420 * k, 4 * (1 - life) + 1, 4 * (1 - life) + 1, 6), { wash: '#FFE27A', ink: null }) }
    }
    boilSeed('stones')
    for (let i = 0; i < 7; i++) { const a = Math.PI * (.06 + i / 6 * .88); paint(ellPts(FX + Math.cos(a) * 150, G + 12 + Math.sin(a) * 26, 32, 22, 10, 2), { wash: '#9a94a0', fill: '#6a6478', fillOp: 60, ink: PAL.ink, sw: .7 }) }
  }

  function shotFire(t, lt, dur) {
    const warm = ease(seg(t, tSpark, tSpark + .8))
    const shake = t > tSpark ? shakeXY(t, 6 * Math.exp(-(t - tSpark) * 7)) : [0, 0]
    camBegin(960 + shake[0], 640 + shake[1], kf(t, [[0, 1.25], [tSpark, 1.34], [dur, 1.28]]))
    sky(t, warm)
    land(warm)
    const k = easeOut(seg(t, tSpark, tSpark + .5))
    fire(t, k)
    // the drill before the fire takes
    if (k < .05) { boilSeed('drill'); const r = Math.sin(t * 30); inkLine([[FX + r * 6, G - 6], [FX - r * 6, G - 190]], 4, '#8d5b33', 'ink', .2); paint(rectPts(FX - 110, G - 14, 220, 22, 2), { wash: '#a4703f', ink: PAL.ink, sw: .7 }) }
    // smoke
    if (t > tSmoke && k < .9) for (let i = 0; i < 6; i++) { boilSeed('smoke' + i); const life = ((t - tSmoke) * .55 + i / 6) % 1; paint(ellPts(FX + 30 * Math.sin(t * 2 + i) + life * 40, G - 40 - life * 360, 16 + life * 40, 14 + life * 34, 14, 3), { wash: '#cfc8d6', washOp: 200 * (1 - life), ink: null }) }
    // the spark
    if (t > tSpark && t < tSpark + .4) { const q = seg(t, tSpark, tSpark + .4); paint(starPts(FX, G - 20, 90 * backOut(q) * (1 - q * .6), .25, 4, q * 2), { wash: PAL.cream, washOp: 255 * (1 - q * q), ink: null }) }
    const joy = ease(seg(t, tJoy, tJoy + .3)), hop = t > tJoy + .3 ? Math.abs(Math.sin((t - tJoy) * 7)) * .8 : 0
    caveman(MX - joy * 40, G, 40, { crouch: 1 - joy, cheer: joy, rub: k < .05 ? Math.sin(t * 30) : 0, dy: -hop })
    camEnd()
  }

  shots([[0, shotFire]])
})()
