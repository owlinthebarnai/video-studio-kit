// 初火 · The Discovery of Fire — a 5 s ukiyo-e print: night outside a cave, a hand drill, smoke, spark, fire.
// Reuses the ukiyo-e print engine (paper, woodgrain, baren, specks, bokashi, carved lines, seals) from the style demo.
import { clamp, lerp, seg, ss, eio, eo, back, mulberry, hash, vnoise, TAU } from '/core/lib.js';
import { W, H, FR, PAL, TX, mk, buildTextures, inkify, stampLayer, smooth, poly, carve, wob, bokashi, kasumi, rgba, mix, drawSeal, cartouche, fbm } from '/styles/ukiyoe/demo/print.js';
import { mountain, pine } from '/styles/ukiyoe/demo/nature.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
try { await document.fonts.load('400 40px Yuji', '初火'); } catch (e) { }
buildTextures();

const S = PAL.sumi;
const q8 = t => Math.floor(t * 8) / 8;
const GY = 885;                       // ground line
const FX = 1160;                      // figure origin (between the feet)
const TIP = [1000, 868];              // drill tip = birthplace of the fire
const REG = [[0, 0], [2.2, -1.4], [-1.9, 1.8], [1.6, 2.1]];

// —— Two pigment sets: one key block, reprinted as night and as firelight (alternate impressions) ——
const NIGHT = {
  skyTop: '#101f3a', sky: '#24406a', skyLow: '#5b7896', far: '#3c5878', far2: '#2f4a68', mist: PAL.paper,
  ground: '#33423f', groundD: '#232e2d', groundL: '#4a5a52', rock: '#4f5a62', rockD: '#343d45', rockL: '#6a747a',
  cave: '#141210', needle: '#22332c', bark: '#3a3029', board: '#5a4a3a', tinder: '#7d7050',
};
const WARM = {
  skyTop: '#2a1f38', sky: '#6a3a3c', skyLow: '#c8714a', far: '#7a4a48', far2: '#5e3a3c', mist: PAL.paper,
  ground: '#8a5a30', groundD: '#5e3a22', groundL: '#b0803e', rock: '#9a6440', rockD: '#6a4028', rockL: '#c08a52',
  cave: '#3a1a10', needle: '#4a4a26', bark: '#6a4028', board: '#a0703c', tinder: PAL.ochre,
};

// —— Static geometry ——
const CLIFF = [[1310, GY + 4], [1326, 790], [1364, 690], [1396, 600], [1420, 500], [1462, 420], [1478, 330], [1530, 250], [1550, 160], [1600, 90], [1630, 20], [1900, 20], [1900, GY + 4]];
const MOUTH = [[1500, GY + 4], [1506, 770], [1540, 662], [1596, 596], [1676, 578], [1748, 622], [1786, 708], [1802, 800], [1808, GY + 4]];
const FACETS = [
  [[1340, 770], [1396, 640], [1430, 700], [1386, 810]],
  [[1440, 470], [1480, 340], [1520, 400], [1480, 520]],
  [[1560, 160], [1610, 70], [1650, 140], [1590, 240]],
  [[1700, 300], [1790, 230], [1800, 330], [1730, 380]],
  [[1820, 480], [1880, 420], [1880, 560], [1840, 540]],
];
const CLIFF_P = (() => { const p = new Path2D(); CLIFF.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; })();
const MOUTH_P = (() => { const p = new Path2D(); MOUTH.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; })();
const groundY = X => GY + (vnoise(X * .004 + 3) - .5) * 10;

function skyBlock(P) {
  const c = mk(), x = c.getContext('2d');
  x.fillStyle = P.skyLow; x.fillRect(0, 0, W, H);
  bokashi(x, 0, FR.y0, W, 640, P.skyTop, 1, 0, { rough: 28, seed: 4, col2: P.sky });
  bokashi(x, 0, 560, W, 860, P.sky, .85, 0, { rough: 20, seed: 8 });
  // far ranges: pale, low contrast
  mountain(x, 470, 840, 780, 290, { body: P.far, seed: 5 });
  mountain(x, 120, 850, 760, 190, { body: P.far2, seed: 6 });
  // moon and mist are unprinted paper: cut them out of the sky block
  x.save(); x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(390, 220, 64, 0, TAU); x.fill();
  kasumi(x, 520, 262, 760, 26, '#000000', .9); kasumi(x, 300, 300, 420, 18, '#000000', .7);
  kasumi(x, 640, 780, 1100, 40, '#000000', .8); kasumi(x, 330, 818, 640, 26, '#000000', .6);
  x.restore();
  return inkify(c, { speck: .3, grain: .22, gx: -120, baren: .3, bx: 60, by: -40 });
}
function landBlock(P) {
  const c = mk(), x = c.getContext('2d');
  // ground: flat stacked layers
  x.fillStyle = P.ground; x.beginPath(); x.moveTo(0, H); for (let X = 0; X <= W; X += 20) x.lineTo(X, groundY(X) - 22); x.lineTo(W, H); x.fill();
  x.fillStyle = P.groundL; x.beginPath(); x.moveTo(0, 905); for (let X = 0; X <= W; X += 20) x.lineTo(X, 905 + Math.sin(X * .004) * 6); x.lineTo(W, 935); x.lineTo(0, 935); x.fill();
  x.fillStyle = P.groundD; x.beginPath(); x.moveTo(0, 980); for (let X = 0; X <= W; X += 20) x.lineTo(X, 980 + (vnoise(X * .006) - .5) * 14); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  // cliff + cave
  x.fillStyle = P.rock; x.beginPath(); poly(x, CLIFF); x.fill();
  x.fillStyle = P.rockD; FACETS.forEach(f => { x.beginPath(); poly(x, f); x.fill(); });
  x.fillStyle = P.rockL; x.beginPath(); poly(x, [[1300, GY], [1330, 800], [1360, 840], [1350, GY]]); x.fill();
  x.fillStyle = P.cave; x.beginPath(); smooth(x, MOUTH, false); x.closePath(); x.fill();
  // foreground stones
  x.fillStyle = P.rockD; x.beginPath(); smooth(x, [[260, 1050], [300, 990], [380, 970], [450, 995], [480, 1050]], true); x.fill();
  x.beginPath(); smooth(x, [[1560, 1050], [1590, 1000], [1660, 985], [1720, 1010], [1740, 1050]], true); x.fill();
  // pine at the far left (extreme foreground framing)
  pine(x, 150, 1000, 1.5, { seed: 5, lean: .3, lines: false, needle: P.needle, bark: P.bark, minI: 3 });
  // hearth board and tinder nest
  x.fillStyle = P.board; x.beginPath(); poly(x, [[915, 872], [1095, 876], [1092, 890], [912, 886]]); x.fill();
  x.fillStyle = P.tinder; x.beginPath(); smooth(x, [[955, 880], [970, 862], [1000, 856], [1030, 862], [1045, 880]], true); x.fill();
  return inkify(c, { speck: .3, grain: .1, gx: 300, baren: .35, bx: -80, by: 50 });
}
function keyBlock() {
  const c = mk(), x = c.getContext('2d');
  mountain(x, 470, 840, 780, 290, { lines: true, lw: 1.6, lineCol: PAL.greyD, seed: 5 });
  x.fillStyle = S;
  carve(x, wob(CLIFF.slice(0, 9), 3, 2), 3.4, { taper: [.05, .3], seed: 3, jit: .35 });
  carve(x, wob(MOUTH, 2.5, 4), 3, { taper: [.1, .1], seed: 6, jit: .35 });
  FACETS.forEach((f, i) => carve(x, wob(f.slice(0, 3), 1.5, i + 9), 2.2, { taper: [.2, .5], seed: i + 3 }));
  // cun texture strokes on the rock
  const R = mulberry(77);
  for (let i = 0; i < 70; i++) { const px = 1340 + R() * 540, py = 60 + R() * 760; if (!x.isPointInPath(CLIFF_P, px - 10, py) || x.isPointInPath(MOUTH_P, px + 20, py + 60) || x.isPointInPath(MOUTH_P, px, py)) continue; carve(x, [[px, py], [px + 14 + R() * 20, py + 26 + R() * 30], [px + 10 + R() * 10, py + 60 + R() * 30]], 1.8, { taper: [.3, .6], seed: i }); }
  // ground lines: flat, parallel, slanted cross strokes
  const gl = []; for (let X = 0; X <= W; X += 60) gl.push([X, groundY(X) - 22]);
  carve(x, gl, 2.8, { taper: [0, 0], seed: 11, jit: .4, per: 3 });
  x.fillStyle = PAL.sumiL;
  for (let i = 0; i < 30; i++) { const px = 40 + i * 64 + R() * 20, py = 945 + R() * 26; if (px > 1290 && px < 1830 && py < 900) continue; carve(x, [[px, py], [px + 26, py + 14]], 1.6, { taper: [.3, .3], seed: i + 40 }); }
  x.fillStyle = S;
  for (let i = 0; i < 22; i++) { const px = 30 + i * 90 + R() * 30, py = 1000 + R() * 30; carve(x, [[px, py], [px + 34, py + 16]], 2, { taper: [.3, .3], seed: i + 70 }); }
  carve(x, wob([[260, 1050], [300, 990], [380, 970], [450, 995], [480, 1050]], 2, 5), 2.6, { taper: [.1, .1], seed: 13 });
  carve(x, wob([[1560, 1050], [1590, 1000], [1660, 985], [1720, 1010], [1740, 1050]], 2, 6), 2.6, { taper: [.1, .1], seed: 14 });
  pine(x, 150, 1000, 1.5, { seed: 5, lean: .3, fills: false, minI: 3 });
  // moon ring (grey key line) and board/tinder lines
  x.strokeStyle = PAL.grey; x.lineWidth = 1.6; x.beginPath(); x.arc(390, 220, 64, 0, TAU); x.stroke();
  x.strokeStyle = S; x.lineWidth = 2.4; x.lineJoin = 'round'; x.beginPath(); poly(x, [[915, 872], [1095, 876], [1092, 890], [912, 886]]); x.stroke();
  x.lineWidth = 1.4; for (let i = 0; i < 9; i++) { const a = 958 + i * 10; x.beginPath(); x.moveTo(a, 879); x.quadraticCurveTo(a + 8, 866 - (i % 3) * 3, a + 18 + (i % 2) * 6, 862 + (i % 4) * 3); x.stroke(); }
  return inkify(c, { speck: .12 });
}
function compose(P) {
  const c = mk(), x = c.getContext('2d');
  stampLayer(x, skyBlock(P), 1, REG[1]); stampLayer(x, landBlock(P), 1, REG[2]); stampLayer(x, KEY, 1, REG[0]);
  return c;
}
const KEY = keyBlock();
const SCN_N = compose(NIGHT), SCN_W = compose(WARM);

// —— Firelight mask: the warm impression spreads from the fire with a noisy, rubbed edge ——
const MW = 480, MH = 270, MN = fbm(MW, MH, [40, 12, 4], 91, [1, .5, .3]);
const maskC = mk(MW, MH), maskX = maskC.getContext('2d'), maskID = maskX.createImageData(MW, MH);
const warmC = mk(), warmX = warmC.getContext('2d');
function warmMask(r) {
  const cx = TIP[0] / 4, cy = (TIP[1] - 120) / 4, rr = r / 4, d = maskID.data;
  for (let y = 0; y < MH; y++) for (let X = 0; X < MW; X++) {
    const i = y * MW + X, dist = Math.hypot(X - cx, (y - cy) * 1.25);
    const v = (rr - dist + (MN[i] - .5) * 70) / 26;
    d[i * 4 + 3] = clamp(v) * 255 * (.55 + .45 * clamp(1 - dist / (rr * 1.05 + 1)) + .0);
  }
  maskX.putImageData(maskID, 0, 0);
}

// —— Figure: flat caveman rig (fills and key lines printed in separate passes) ——
let PASS = 'fill';
function shape(x, pts, fill, lw = 2.6, closed = true, sm = true) {
  x.beginPath(); sm ? smooth(x, pts, closed) : poly(x, pts);
  if (PASS === 'fill' && fill) { x.fillStyle = fill; x.fill(); }
  if (PASS === 'line' && lw) { x.lineWidth = lw; x.strokeStyle = S; x.lineJoin = 'round'; x.stroke(); }
}
function limbPoly(pts, ws) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    L.push([pts[i][0] - dy * ws[i] / 2, pts[i][1] + dx * ws[i] / 2]); R.push([pts[i][0] + dy * ws[i] / 2, pts[i][1] - dx * ws[i] / 2]);
  }
  return L.concat(R.reverse());
}
const LP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const POSE0 = { hip: [38, -62], kF: [-52, -112], fF: [-66, 0], kB: [-6, -100], fB: [26, 0], sh: [-22, -182], head: [-58, -222], hr: -.15,
  eN: [-92, -128], hN: [-150, -104], eF: [-76, -108], hF: [-150, -74] };
const POSE1 = { hip: [42, -70], kF: [-46, -114], fF: [-66, 0], kB: [-2, -104], fB: [26, 0], sh: [20, -214], head: [6, -262], hr: .32,
  eN: [-44, -270], hN: [-82, -350], eF: [84, -270], hF: [104, -352] };
function figure(x, t, w) {
  const tq = q8(t), k = Math.round(tq * 8);
  const up = back(seg(tq, 3.45, 4.1), 1.4), J = {};
  for (const n in POSE0) J[n] = n === 'hr' ? lerp(POSE0.hr, POSE1.hr, up) : LP(POSE0[n], POSE1[n], up);
  // hand-drill rub: palms slide in opposite directions every frame (8 fps)
  const rub = t < 3.4 ? (k % 2 ? 1 : -1) * 9 * (1 - up) : 0;
  J.hN = [J.hN[0] + rub, J.hN[1]]; J.hF = [J.hF[0] - rub, J.hF[1]];
  J.eN = [J.eN[0] + rub * .4, J.eN[1]]; J.eF = [J.eF[0] - rub * .4, J.eF[1]];
  // effort bob while drilling
  const bob = t < 3.4 ? (k % 4 < 2 ? 0 : 2.5) : 0;
  const skin = mix('#8f8676', '#f0b886', w), skinD = mix('#6e6659', '#c98a5c', w), hide = mix('#5e5040', '#b0742e', w), hideD = mix('#40362c', '#7a4a20', w);
  x.save(); x.translate(FX, GY + bob * 0);
  // drill stick (held) or dropped
  if (up < .35) {
    const top = [J.hN[0] * .5 + J.hF[0] * .5 + 4, -196], tip = [TIP[0] - FX, TIP[1] - GY];
    shape(x, limbPoly([tip, top], [7, 8]), mix('#6a5640', '#c09060', w), 2, true, false);
    if (PASS === 'line') { x.strokeStyle = S; x.lineWidth = 1.2; const m = (k % 3) / 3; x.beginPath(); x.moveTo(lerp(tip[0], top[0], .3 + m * .3) - 3, lerp(tip[1], top[1], .3 + m * .3)); x.lineTo(lerp(tip[0], top[0], .36 + m * .3) + 3, lerp(tip[1], top[1], .36 + m * .3) - 4); x.stroke(); }
  } else shape(x, limbPoly([[-40, -6], [60, -14]], [7, 7]), mix('#6a5640', '#c09060', w), 2, true, false);
  // far leg and far arm
  shape(x, limbPoly([J.hip, J.kB, J.fB], [54, 36, 24]), skinD, 2.4, true, false);
  shape(x, [[J.fB[0] - 14, -4], [J.fB[0] + 22, -6], [J.fB[0] + 24, 2], [J.fB[0] - 16, 2]], skinD, 2.2, true, false);
  shape(x, limbPoly([J.sh, J.eF, J.hF], [34, 26, 18]), skinD, 2.4, true, false);
  shape(x, [[J.hF[0] - 9, J.hF[1] - 6], [J.hF[0] + 6, J.hF[1] - 9], [J.hF[0] + 9, J.hF[1] + 5], [J.hF[0] - 6, J.hF[1] + 8]], skinD, 2, true, true);
  // torso: hide tunic over one shoulder
  const mid = LP(J.hip, J.sh, .5);
  shape(x, limbPoly([J.hip, mid, J.sh], [92, 100, 78]), skin, 2.8, true, false);
  const tun = limbPoly([LP(J.hip, J.sh, -.05), mid, LP(J.hip, J.sh, .82)], [104, 100, 66]);
  shape(x, tun, hide, 2.8, true, false);
  // jagged hem over the thighs
  const hem = []; const h0 = LP(J.hip, J.kF, .05), h1 = LP(J.hip, J.kF, .7);
  hem.push([J.hip[0] + 30, J.hip[1] - 20], [h0[0] + 26, h0[1] + 24]);
  for (let i = 0; i <= 6; i++) { const u = i / 6, p = LP([h0[0] + 26, h0[1] + 24], [h1[0], h1[1] + 22], u); hem.push([p[0], p[1] + (i % 2 ? 10 : 0)]); }
  hem.push([h1[0] - 6, h1[1] - 20], [mid[0] - 10, mid[1]]);
  // near leg (thigh up to the knee, shin down)
  shape(x, limbPoly([J.hip, J.kF, J.fF], [60, 40, 26]), skin, 2.6, true, false);
  shape(x, [[J.fF[0] - 22, -5], [J.fF[0] + 14, -7], [J.fF[0] + 16, 2], [J.fF[0] - 24, 2]], skin, 2.4, true, false);
  shape(x, hem, hide, 2.6, true, false);
  if (PASS === 'fill') { x.fillStyle = hideD; const R = mulberry(5); for (let i = 0; i < 9; i++) { const u = R(), v = R() - .5, p = LP(J.hip, J.sh, .1 + u * .62); x.beginPath(); x.ellipse(p[0] + v * 60, p[1], 5 + R() * 4, 3.5 + R() * 2, R() * 3, 0, TAU); x.fill(); } }
  // near arm
  shape(x, limbPoly([J.sh, J.eN, J.hN], [38, 28, 20]), skin, 2.6, true, false);
  shape(x, [[J.hN[0] - 10, J.hN[1] - 7], [J.hN[0] + 7, J.hN[1] - 10], [J.hN[0] + 10, J.hN[1] + 6], [J.hN[0] - 7, J.hN[1] + 9]], skin, 2.2, true, true);
  if (up > .5) { // spread fingers of the raised hands
    for (const hd of [J.hN, J.hF]) for (let f = -2; f <= 2; f++) { const a = -Math.PI / 2 + f * .32; shape(x, limbPoly([hd, [hd[0] + Math.cos(a) * 20, hd[1] + Math.sin(a) * 20]], [6, 4]), hd === J.hN ? skin : skinD, 1.6, true, false); }
  }
  // head
  x.save(); x.translate(J.head[0], J.head[1]); x.rotate(J.hr);
  shape(x, [[18, -32], [42, -22], [52, 4], [44, 34], [26, 46], [14, 20]], S, 0);                   // hair mass behind
  shape(x, [[-24, -26], [-6, -36], [16, -32], [28, -8], [24, 18], [6, 32], [-14, 30], [-26, 14], [-36, 4], [-28, -4], [-30, -14]], skin, 2.4, true, false); // face in profile, nose left
  shape(x, [[-26, 12], [-12, 22], [6, 18], [22, 4], [26, 20], [14, 40], [-8, 46], [-24, 34]], S, 0);   // beard
  shape(x, [[-30, -18], [-26, -34], [-8, -46], [16, -46], [34, -34], [44, -14], [30, -18], [20, -28], [0, -32], [-14, -26]], S, 0); // hair crown
  if (PASS === 'fill') for (let i = 0; i < 7; i++) { const a = -2.6 + i * .42; x.fillStyle = S; x.beginPath(); poly(x, [[Math.cos(a) * 40, Math.sin(a) * 40 - 6], [Math.cos(a + .14) * 50, Math.sin(a + .14) * 50 - 8], [Math.cos(a + .3) * 40, Math.sin(a + .3) * 40 - 6]]); x.fill(); }
  if (PASS === 'line') {
    x.strokeStyle = S; x.lineCap = 'round'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(-26, -16); x.quadraticCurveTo(-16, -22, -4, -16); x.stroke(); // brow ridge
    x.lineWidth = 2.6; x.beginPath();
    if (up > .5) { x.moveTo(-22, -8); x.quadraticCurveTo(-16, -14, -10, -8); } else { x.moveTo(-22, -9); x.lineTo(-11, -9); }
    x.stroke(); x.lineWidth = 1.8; x.beginPath(); x.arc(4, -2, 6, -.8, 1.6); x.stroke(); // ear
  }
  if (up > .5 && PASS === 'fill') { x.fillStyle = '#5a1e16'; x.beginPath(); x.ellipse(-22, 18, 7, 9 * clamp((up - .5) * 2), 0, 0, TAU); x.fill(); }
  x.restore();
  x.restore();
}

// —— Smoke (2-3 s): one thin curl from the drill tip; paper-grey band with a key line ——
function smoke(x, t) {
  const tq = q8(t), a = seg(tq, 1.9, 2.4) * (1 - seg(tq, 3.3, 3.8)); if (a <= 0) return;
  const len = lerp(20, 330, eo(seg(tq, 1.9, 3.1))), k = Math.round(tq * 8);
  const pts = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, y = TIP[1] - 8 - u * len; pts.push([TIP[0] + Math.sin(u * 5.2 + k * .55) * 26 * u + u * u * 30, y]); }
  // curl at the top
  const e = pts[pts.length - 1]; for (let i = 1; i <= 6; i++) { const ang = Math.PI + i * .9; pts.push([e[0] + 22 + Math.cos(ang) * (22 - i * 2.6), e[1] + Math.sin(ang) * (22 - i * 2.6)]); }
  x.save(); x.globalAlpha = a;
  x.fillStyle = rgba('#b9b6a8', .9); carve(x, pts, 14, { taper: [.5, .3], seed: 2, jit: .4 });
  x.fillStyle = PAL.greyD; carve(x, pts.map(p => [p[0] + 6, p[1]]), 2, { taper: [.4, .3], seed: 5, jit: .5 });
  x.restore();
}

// —— Fire: flat flame tongues (beni → ochre → paper core) with carved key lines, stepped at 8 fps ——
const TONGUES = (() => { const R = mulberry(21), a = []; for (let i = 0; i < 9; i++) a.push({ bx: (i / 8 - .5) * 1.5 + (R() - .5) * .15, h: i === 4 ? 1 : i % 2 ? .78 + R() * .14 - Math.abs(i / 8 - .5) * .5 : .42 + R() * .2 - Math.abs(i / 8 - .5) * .3, bw: .13 + R() * .06, ph: R() * 9, dir: R() < .5 ? -1 : 1 }); return a.sort((p, q) => q.h - p.h); })();
function tonguePts(T, s, Wf, Hf, k, sc) {
  const h = T.h * Hf * sc, bw = T.bw * Wf * (sc * .6 + .4), bx = T.bx * Wf * .62 * sc + TIP[0] - 55 * sc, by = TIP[1] + 4, out = [], back_ = [];
  const sway = (vnoise(k * .45 + T.ph) - .5) * 2, n = 12;
  for (let i = 0; i <= n; i++) {
    const u = i / n, w = bw * Math.pow(1 - u, .75) * (1 + .35 * Math.sin(u * Math.PI));
    const c = bx + sway * 46 * Math.pow(u, 1.4) + T.dir * (Math.sin(u * Math.PI * 1.25 + k * .3) * 22 * u + Math.pow(u, 3) * 46);
    out.push([c - w, by - u * h]); back_.push([c + w, by - u * h]);
  }
  return out.concat(back_.reverse());
}
function fire(x, t) {
  const tq = q8(t), k = Math.round(tq * 8);
  // spark (2.9-3.3 s)
  if (tq >= 2.85 && tq < 3.5) {
    const sp = seg(tq, 2.85, 3.1), r = lerp(10, 46, sp) * (1 - seg(tq, 3.25, 3.5) * .6);
    x.save(); x.translate(TIP[0], TIP[1] - 6); x.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + k * .3, l = r * (i % 2 ? .55 : 1); x.strokeStyle = i % 2 ? PAL.beni : '#f2c64e'; x.lineWidth = i % 2 ? 3 : 4; x.beginPath(); x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.stroke(); }
    x.fillStyle = '#fff3c8'; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill(); x.restore();
  }
  const g = back(seg(tq, 3.1, 3.85), 1.6); if (g <= 0) return;
  const Wf = 270, Hf = 520 * (1 + (vnoise(k * .7) - .5) * .12);
  const layers = [[1, PAL.beni], [.72, '#e39a32'], [.42, '#f6e2a8']];
  // glow pool on the ground (flat bokashi band, the only gradient)
  // key line = the silhouette of the whole flame (sumi printed under the red, slightly larger)
  x.fillStyle = S; x.strokeStyle = S; x.lineWidth = 7; x.lineJoin = 'round';
  x.beginPath(); for (const T of TONGUES) poly(x, tonguePts(T, 0, Wf, Hf, k, g)); x.fill(); x.stroke();
  for (const [sc, col] of layers) {
    x.fillStyle = col; x.beginPath(); for (const T of TONGUES) { const p = tonguePts(T, 0, Wf, Hf, k, sc * g); poly(x, p); } x.fill();
    if (sc === 1) { x.save(); x.clip(); x.globalAlpha = .12; x.drawImage(TX.grain, (k % 4) * 3, 0); x.globalAlpha = .25; x.drawImage(TX.barenPaper, -k * 4, 0); x.restore(); }
  }
  // carved key lines around the outer tongues
  x.fillStyle = S;
  // carved flame-grain lines inside the red: tapered curls following each tongue
  x.fillStyle = '#7a2418';
  for (const T of TONGUES) { const p = tonguePts(T, 0, Wf, Hf, k, g), n = p.length / 2, c = []; for (let i = 2; i < n - 1; i++) c.push([lerp(p[i][0], p[p.length - 1 - i][0], .3), p[i][1]]); if (T.h > .5) carve(x, c, 3, { taper: [.5, .8], seed: T.ph, jit: .4, per: 3 }); }
  // detached flame wisps and embers rising
  const R = mulberry(300 + k);
  for (let i = 0; i < 5; i++) {
    const life = ((tq * .9 + i * .21) % 1), px = TIP[0] + (hash(i * 7.1) - .5) * 180 + Math.sin(life * 6 + i) * 20, py = TIP[1] - Hf * g * (.7 + life * .6), s = 18 * (1 - life) * g;
    if (s < 3) continue;
    x.fillStyle = PAL.beni; x.beginPath(); smooth(x, [[px - s * .5, py + s], [px, py - s * 1.3], [px + s * .5, py + s]], true); x.fill();
    x.strokeStyle = S; x.lineWidth = 1.8; x.stroke();
  }
  for (let i = 0; i < 16; i++) { const px = TIP[0] + (R() - .5) * 520 * g, py = TIP[1] - 120 - R() * 520 * g; x.fillStyle = R() < .5 ? '#f2c64e' : PAL.beni; x.fillRect(px, py, 4, 4); }
  // kindling sticks crossing at the base
  for (const [a, b] of [[[930, 884], [1060, 846]], [[1070, 886], [945, 850]], [[960, 890], [1050, 880]]]) {
    x.fillStyle = '#5e3a22'; x.beginPath(); poly(x, limbPoly([a, b], [11, 9])); x.fill(); x.strokeStyle = S; x.lineWidth = 2.2; x.stroke();
  }
}

// —— Frame ——
const figC = mk(), figX = figC.getContext('2d');
function render(t) {
  t = clamp(t, 0, 5);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAL.mountD; ctx.fillRect(0, 0, W, H);
  // camera: a very slow push toward the fire (on ones)
  const u = eio(t / 5), z = 1 + .03 * u, cx = lerp(960, 985, u), cy = lerp(540, 556, u);
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
  ctx.drawImage(TX.paper, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0); ctx.clip();
  ctx.drawImage(SCN_N, 0, 0);
  // firelight: the warm impression printed over the night one, spreading from the fire
  const tq12 = Math.floor(t * 12) / 12, w = ss(seg(tq12, 3.1, 4.0));
  if (w > 0) {
    warmMask((90 + 1400 * w) * (1 + (vnoise(tq12 * 9) - .5) * .05));
    warmX.globalCompositeOperation = 'copy'; warmX.drawImage(SCN_W, 0, 0);
    warmX.globalCompositeOperation = 'destination-in'; warmX.imageSmoothingQuality = 'high'; warmX.drawImage(maskC, 0, 0, W, H);
    warmX.globalCompositeOperation = 'source-over';
    ctx.drawImage(warmC, 0, 0);
  }
  smoke(ctx, t);
  fire(ctx, t);
  // figure: colour block (specked, out of register) then key block
  const fw = ss(seg(tq12, 3.15, 3.8));
  figX.setTransform(1, 0, 0, 1, 0, 0); figX.clearRect(0, 0, W, H);
  PASS = 'fill'; figure(figX, t, fw);
  figX.globalCompositeOperation = 'destination-out'; figX.globalAlpha = .28; figX.drawImage(TX.speck, 0, 0, W, H); figX.globalAlpha = 1; figX.globalCompositeOperation = 'source-over';
  ctx.drawImage(figC, REG[3][0], REG[3][1]);
  PASS = 'line'; figure(ctx, t, fw);
  ctx.restore();
  // double ink border
  ctx.strokeStyle = S; ctx.lineWidth = 3.4; ctx.strokeRect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0);
  ctx.lineWidth = 1.3; ctx.strokeRect(FR.x0 - 9, FR.y0 - 9, FR.x1 - FR.x0 + 18, FR.y1 - FR.y0 + 18);
  // vertical title cartouche + seal (the print's full stop)
  const b = cartouche(ctx, 1810, 70, '初火', { series: '', w: 78, size: 50 });
  drawSeal(ctx, '火', 1810, b.y0 + b.h + 48, 58, 1, { seed: 4, rot: .03, normal: true });
  ctx.globalAlpha = 1; ctx.drawImage(TX.fiber, 0, 0);
}

window.DUR = 5;
window.render = render;
render(0);
window.READY = true;
