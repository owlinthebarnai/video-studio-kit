
// THE DISCOVERY OF FIRE — one close shot: his face above, his hands rubbing a fire drill below, then paper flames.
function sceneFire() {
  const cu = TIMELINE.cues, lit = TT >= cu.spark, k = popS(cu.spark), joy = popS(cu.joy)
  // night wall of the cave; it warms once the fire takes
  cut(rect(-30, -30, W + 60, H + 60, 0), lit ? '#6b3a3a' : PAL.night, { key: 'wall', shadow: false, tear: 0, shade: false, pat: pat.dots('rgba(255,230,180,0.08)', 4, 70) })
  if (lit) cut(ellipsePts(540, 1300, 520 * k + 100, 640 * k + 120, 0, 40), '#c4542e', { key: 'glow1', shadow: false, sb: 2 })
  if (lit) cut(ellipsePts(540, 1340, 360 * k + 60, 420 * k + 80, 0, 40), PAL.orange, { key: 'glow2', shadow: false, sb: 2 })
  // stars through the cave mouth, top right
  cut(ellipsePts(860, 330, 190, 160, 0, 30), lit ? '#3a2a5a' : '#0c1230', { key: 'mouth', shadow: false })
  { const R = RNG('st'); for (let i = 0; i < 9; i++) sparkle(R.r(720, 1000), R.r(220, 430), R.r(4, 8) * (0.6 + 0.4 * ((B + i) % 2))) }
  // the ground
  cut([[-40, 1440], [400, 1410], [760, 1450], [1120, 1420], [1120, 2000], [-40, 2000]], PAL.woodD, { key: 'ground', sy: -4, pat: pat.grainWood('rgba(60,30,10,0.18)') })
  // the caveman: face up top, mood follows the beat
  person(420, 700 + joy * -30, 1.5, { key: 'cav', shirt: PAL.wood, skin: PAL.skin2, hair: '#3a2416', beard: true, mood: lit ? (joy > 0.5 ? 'happy' : 'wow') : 'focus' })
  // the fire drill and the board
  cut(rect(380, 1430, 340, 50, 10), PAL.woodL, { key: 'board' })
  const rub = Math.sin(TT * 30) * (lit ? 0 : 1)
  if (!lit || k < 1) cut(capsulePts(540 + rub * 8, 1440, 540 - rub * 8, 1080, 26, 4), PAL.wood, { key: 'stick' })
  // two hands rubbing it (they drop away once the fire takes)
  if (!lit) {
    hand(500, 1180 + rub * 30, 0.7, 0.15, PAL.skin2, PAL.wood, { key: 'hl' })
    hand(580, 1230 - rub * 30, 0.7, Math.PI - 0.15, PAL.skin2, PAL.wood, { key: 'hr' })
  }
  // smoke curls up before the spark
  if (TT >= cu.smoke && !lit) { const R = RNG('sm'); for (let i = 0; i < 5; i++) { const life = ((TT - cu.smoke) * 0.6 + i / 5) % 1; cut(ellipsePts(560 + Math.sin(TT * 2 + i) * 20, 1400 - life * 380, 18 + life * 30, 14 + life * 24, 0, 16), '#cfc8d6', { key: 'sm' + i, shadow: false, sb: 3 }) } }
  // the spark, then the flames: torn paper tongues that flicker on the boil
  if (lit && TT < cu.spark + 0.35) sparkle(540, 1420, 60 + 80 * (1 - (TT - cu.spark) / 0.35), '#fff6c0')
  if (lit) {
    const f = (i) => 1 + 0.12 * Math.sin(TT * 14 + i * 2)
    const tongue = (x, w, h, c, i) => cut([[x - w, 1440], [x - w * 0.9, 1440 - h * 0.45 * k * f(i)], [x + Math.sin(TT * 7 + i) * 14, 1440 - h * k * f(i)], [x + w * 0.9, 1440 - h * 0.45 * k * f(i)], [x + w, 1440]], c, { key: 'fl' + i, sb: 4 })
    tongue(470, 70, 300, PAL.orangeD, 0); tongue(610, 70, 330, PAL.orangeD, 1); tongue(540, 110, 470, PAL.orange, 2)
    tongue(520, 60, 280, PAL.yellow, 3); tongue(560, 40, 170, '#fff3c0', 4)
    // logs in front
    cut(capsulePts(380, 1460, 700, 1400, 40, 4), PAL.woodD, { key: 'log1' }); cut(capsulePts(400, 1400, 720, 1460, 40, 4), PAL.wood, { key: 'log2' })
  }
  yearTag('100,000 bc')
  capStrip(lit ? 'and then: fire' : 'two sticks, one idea')
}
