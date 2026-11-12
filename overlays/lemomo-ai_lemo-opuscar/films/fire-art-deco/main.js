// The Discovery of Fire, in the Art Deco manner: black lacquer night, gold keylines, a stepped cave arch on the centre axis,
// a faceted deco caveman, and the fire as "the one colour" (vermilion) igniting a counted sunburst.
import * as D from '/styles/art-deco/demo/engine/deco.js';
const { C, TAU, clamp, lerp, mix, rgba, seg, ss, eio, eo, ei, back, hash, mulberry, gline, airbrush, toPath } = D;

const cv = document.getElementById('c'), g = cv.getContext('2d');
const W = 1920, H = 1080, AX = 960, GY = 905;           // centre axis, ground line
const FIRE = '#d8361e', FIRE_M = '#f27a26', FIRE_I = '#ffd27a', FIRE_LINE = '#ff9a3c';

// ---------- helpers copied from the demo's character rig (chars.js) ----------
function capsulePath(x0, y0, r0, x1, y1, r1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || .001, a = Math.atan2(dy, dx);
  const s = clamp((r0 - r1) / L, -.99, .99), b = Math.acos(s);
  const p = new Path2D(); p.arc(x0, y0, r0, a + b, a - b + TAU, false); p.arc(x1, y1, r1, a - b, a + b, false); p.closePath(); return p;
}
function lin(x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function bbox(pts) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }
// faceted lacquer fill: shadow plane, lit plane past a hard terminator, thin rim on the lit side
function facet(path, bb, split, base, light, dark, L, rim = 1.4, rimCol = 'rgba(243,217,139,.85)') {
  const [x0, y0, x1, y1] = bb, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(x1 - x0, y1 - y0) * .6;
  g.fillStyle = lin(cx + L[0] * R, cy + L[1] * R, cx - L[0] * R, cy - L[1] * R, [[0, base], [.55, mix(base, dark, .55)], [1, dark]]); g.fill(path);
  if (split) {
    const [[ax, ay], [bx, by]] = split, dx = bx - ax, dy = by - ay; let nx = -dy, ny = dx; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    if (nx * L[0] + ny * L[1] < 0) { nx = -nx; ny = -ny; }
    const E = 600; g.save(); g.clip(path);
    g.beginPath(); g.moveTo(ax - dx * E, ay - dy * E); g.lineTo(bx + dx * E, by + dy * E); g.lineTo(bx + dx * E + nx * E, by + dy * E + ny * E); g.lineTo(ax - dx * E + nx * E, ay - dy * E + ny * E); g.closePath();
    g.fillStyle = lin(cx + L[0] * R, cy + L[1] * R, cx, cy, [[0, light], [1, base]]); g.fill();
    g.restore();
  }
  if (rim) { g.save(); g.clip(path); g.translate(-L[0] * rim * 1.2, -L[1] * rim * 1.2); g.strokeStyle = rimCol; g.lineWidth = rim * 2; g.stroke(path); g.restore(); }
}
function limb(x0, y0, r0, x1, y1, r1, M, L, rim) {
  const p = capsulePath(x0, y0, r0, x1, y1, r1);
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * L[0] + ny * L[1] < 0) { nx = -nx; ny = -ny; }
  const k = -Math.min(r0, r1) * .18;
  facet(p, [Math.min(x0, x1) - r0, Math.min(y0, y1) - r0, Math.max(x0, x1) + r0, Math.max(y0, y1) + r0], [[x0 + nx * k, y0 + ny * k], [x1 + nx * k, y1 + ny * k]], M.base, M.light, M.dark, L, rim, M.rim);
  return p;
}
function ik(S, T, L1, L2, bend) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - .5);
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  return [S[0] + Math.cos(a + bend * b) * L1, S[1] + Math.sin(a + bend * b) * L1];
}
const P2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// ---------- timeline ----------
const fireK = t => ss(seg(t, 3.05, 3.65));                       // how much the fire lights the world
const fireH = t => t < 3.08 ? 0 : back(seg(t, 3.08, 3.75), 1.9) * (1 + .03 * Math.sin(t * 17));
const tq24 = t => Math.floor(t * 24) / 24, tq12 = t => Math.floor(t * 12) / 12;

// ---------- background ----------
const STARS = (() => { const R = mulberry(11), o = []; for (let i = 0; i < 46; i++) o.push([R() * W, R() * 360, .4 + R() * 1, R() * TAU]); return o; })();
function cliffPts() {
  const L = [[0, GY], [0, 92], [330, 92], [330, 160], [540, 160], [540, 238], [745, 238], [745, 330]];
  const R = L.slice().reverse().map(([x, y]) => [W - x, y]);
  return [...L, ...R];
}
function sky(t, k) {
  const gr = g.createLinearGradient(0, 0, 0, 520);
  gr.addColorStop(0, mix(C.ink, '#140805', k * .6)); gr.addColorStop(.55, mix('#0a0e16', '#2a1208', k * .7)); gr.addColorStop(1, mix('#0f3a30', '#5a2410', k * .8));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (const [x, y, s, ph] of STARS) {
    const tw = .55 + .45 * Math.sin(tq24(t) * 3 + ph);
    D.sparkle(g, x, y, 5 + 7 * s * tw, { alpha: (.5 + .5 * tw) * (1 - k * .5), color: C.gold2, glow: 0 });
  }
  // the moon sits on the axis, in the notch of the stepped cliff, with a hairline sunburst
  const mx = AX, my = 182, r = 66;
  D.sunburst(g, mx, my, { rays: 40, r0: r + 16, r1: r + 150, mode: 'lines', w: 1.4, alpha: .35 * (1 - k * .4) });
  const outer = new Path2D(); outer.arc(mx, my, r, 0, TAU);
  const cres = new Path2D(); cres.arc(mx, my, r, 0, TAU); cres.arc(mx + 30, my - 16, r * .9, 0, TAU);
  g.save(); g.clip(outer); g.fillStyle = lin(mx - r, my - r, mx + r, my + r, [[0, '#fffaf0'], [.5, C.ivory], [1, C.ivoryD]]); g.fill(cres, 'evenodd'); g.restore();
  gline(g, D.arcPts(mx, my, r + 7, 0, TAU, 64), { w: 1.4, alpha: .7 });
  D.glow(g, mx, my, 200, '#f6ecd0', .12);
}
function cliff(t, k) {
  const pts = cliffPts(), path = toPath(pts, true);
  airbrush(g, path, { base: mix('#2a1f26', '#5a2a1c', k * .7), dark: mix('#0b0809', '#1a0a06', k), light: mix('#4a3a40', '#a0502a', k * .8), dir: -2.2, bbox: [0, 80, W, GY] });
  g.save(); g.clip(path);
  // ashlar strata: horizontal double rules and vertical fluting under every setback
  for (let y = 120; y < GY; y += 64) { g.globalAlpha = .18 + k * .18; gline(g, [[0, y], [W, y]], { w: 1.1 }); }
  g.globalAlpha = 1;
  for (const [x0, x1, y] of [[0, 330, 92], [330, 540, 160], [540, 745, 238]]) {
    for (let x = x0 + 22; x < x1 - 10; x += 26) { for (const X of [x, W - x]) { const gr = g.createLinearGradient(0, y, 0, y + 240); gr.addColorStop(0, rgba(C.gold1, .4 + k * .3)); gr.addColorStop(1, rgba(C.gold1, 0)); g.fillStyle = gr; g.fillRect(X - .8, y + 8, 1.6, 240); } }
  }
  g.restore();
  // gold keyline along the stepped silhouette (setbacks)
  gline(g, pts.slice(1, -1), { w: 2.6, glow: .3 + k * .6, sheen: .5 });
}
function caveArch(t, k) {
  const inner = D.stepArchPts(AX, GY, 700 - 3 * 32, 540 - 3 * 16, { steps: 3, crown: 'round' });
  // receding inner arches give the cave depth
  g.save(); g.fillStyle = '#040302'; g.fill(toPath(inner, true)); g.clip(toPath(inner, true));
  for (let i = 1; i <= 4; i++) { const s = 1 - i * .16; gline(g, D.stepArchPts(AX, GY, 604 * s, 492 * s, { steps: 3 }), { w: 1.2, alpha: (.32 - i * .05) * (.5 + k) }); }
  g.restore();
  D.archFrame(g, AX, GY, 700, 540, { rings: 3, gap: 16, steps: 3, burst: false, glow: .2 + k * .9, sheen: .3 + .4 * ss(seg(t, 3.4, 4.6)), lw: 2.6 });
}
function groundPlane(t, k) {
  const path = toPath([[0, GY], [W, GY], [W, H], [0, H]], true);
  g.fillStyle = lin(0, GY, 0, H, [[0, mix('#1c1512', '#4a1c0c', k)], [1, '#070504']]); g.fill(path);
  g.save(); g.clip(path);
  const vx = AX, vy = 640;
  for (let i = -14; i <= 14; i++) { const bx = AX + i * 150; g.globalAlpha = .28 + k * .2; gline(g, [[lerp(vx, bx, (GY - vy) / (H - vy)), GY], [bx, H]], { w: 1.2 }); }
  for (let j = 1; j < 7; j++) { const y = GY + (H - GY) * Math.pow(j / 7, 1.7); g.globalAlpha = .25 + k * .2; gline(g, [[0, y], [W, y]], { w: 1.1 }); }
  g.restore();
  gline(g, [[0, GY], [W, GY]], { w: 2.4, glow: k * .5 });
}

// ---------- the fire's sunburst: rays switch on one by one from the axis outward, with an ignition overshoot ----------
function fireBurst(t, k) {
  if (t < 3.2) return;
  const cx = AX, cy = GY - 120, N = 30;
  for (let i = 0; i < N; i++) {
    const a = Math.PI + (i + .5) / N * Math.PI, rank = Math.abs(i - (N - 1) / 2);
    const t0 = 3.25 + rank * .07, u = t - t0; if (u < 0) continue;
    const flash = u < .06 ? u / .06 * 1.6 : lerp(1.6, 1, clamp((u - .06) / .18));
    const long = i % 2 === 0, r0 = 190, r1 = long ? 1250 : 820, ww = long ? 9 : 5;
    const nx = -Math.sin(a), ny = Math.cos(a);
    g.save(); g.globalAlpha = clamp(.55 * flash);
    if (i % 2 === 0) { // warm wedge between rays
      const b = a + Math.PI / N; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * 1500, cy + Math.sin(a) * 1500); g.lineTo(cx + Math.cos(b) * 1500, cy + Math.sin(b) * 1500); g.lineTo(cx + Math.cos(b) * r0, cy + Math.sin(b) * r0); g.closePath();
      g.fillStyle = rgba('#ff8a3a', .06); g.fill();
    }
    const gr = g.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    gr.addColorStop(0, C.goldHi); gr.addColorStop(.25, C.gold2); gr.addColorStop(.7, rgba(C.gold1, .5)); gr.addColorStop(1, rgba(C.gold1, 0));
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * r1 + nx * ww, cy + Math.sin(a) * r1 + ny * ww); g.lineTo(cx + Math.cos(a) * r1 - nx * ww, cy + Math.sin(a) * r1 - ny * ww); g.closePath();
    g.fillStyle = gr; g.fill();
    g.restore();
  }
}

// ---------- the fire (the one colour) ----------
function tongue(x, base, w, h, sway) {
  const p = new Path2D(), tx = x + sway, ty = base - h;
  p.moveTo(x - w, base);
  p.bezierCurveTo(x - w * 1.1, base - h * .42, tx - w * .38, ty + h * .36, tx, ty);
  p.bezierCurveTo(tx + w * .38, ty + h * .36, x + w * 1.1, base - h * .42, x + w, base);
  p.closePath(); return p;
}
const TONGUES = [[0, 1, 1, 0], [-86, .7, .78, 1.7], [86, .72, .78, 3.1], [-160, .44, .6, 4.4], [160, .46, .6, 5.6]];
function fire(t, k) {
  const f = fireH(t); if (f <= 0) return;
  const tf = tq24(t), Hf = 430 * f, base = GY - 4;
  D.glow(g, AX, base - Hf * .4, 260 + 360 * f, '#ff9a40', .45 * k);
  for (const [layer, col, sc, line] of [[0, FIRE, 1, FIRE_LINE], [1, FIRE_M, .72, '#ffc060'], [2, FIRE_I, .44, '#fff0c0']]) {
    for (const [dx, hh, ww, ph] of TONGUES) {
      const fl = 1 + .07 * Math.sin(tf * 13 + ph * 2 + layer) + .04 * Math.sin(tf * 23 + ph);
      const h = Hf * hh * sc * fl, w = 62 * ww * (.55 + .45 * Math.min(1, f)) * (layer ? sc * 1.15 : 1);
      if (h < 4) continue;
      const sway = Math.sin(tf * 7 + ph) * w * .35 + dx * .12 * f;
      const p = tongue(AX + dx * (layer ? .8 : 1) * Math.min(1, f + .2), base, w, h, sway);
      airbrush(g, p, { base: col, dark: mix(col, '#3a0500', layer ? .3 : .55), light: mix(col, '#fff6d8', .55), dir: Math.PI / 2, bbox: [AX - 200, base - h, AX + 200, base] });
      if (layer < 2) gline(g, p, { w: layer ? 1.6 : 2.6, color: line, glow: .6 });
    }
  }
  // hearth logs in front of the base (gold-ringed, crossed)
  for (const s of [-1, 1]) {
    const p = capsulePath(AX - 150 * s, base + 4, 13, AX + 110 * s, base - 22, 11);
    airbrush(g, p, { base: '#5a3020', dark: '#1a0a06', light: '#c06a3a', dir: -Math.PI / 2, bbox: [AX - 160, base - 40, AX + 160, base + 20] });
    gline(g, p, { w: 1.6 });
  }
  // embers: four-point glints rising on ones
  for (let i = 0; i < 18; i++) {
    const per = 1.1 + hash(i) * .6, age = ((t - 3.2 + hash(i + 9) * per) % per) / per;
    if (t < 3.2 + hash(i + 3) * .4) continue;
    const x = AX + (hash(i + .5) - .5) * 300 + Math.sin(tf * 3 + i) * 30 * age, y = base - 120 - age * (420 + hash(i + 2) * 300) * Math.min(1, f);
    D.sparkle(g, x, y, 6 + 10 * (1 - age), { alpha: (1 - age) * k, color: i % 3 ? C.gold2 : '#ffb060', rot: .2 * Math.sin(i) });
  }
}

// ---------- smoke: an ivory engraved curl that draws itself on ----------
function smoke(t) {
  const p = eo(seg(t, 1.95, 2.95)), fade = 1 - ss(seg(t, 3.1, 3.5)); if (p <= 0 || fade <= 0) return;
  const x0 = AX - 14, y0 = GY - 8, Hs = 330 * (.4 + .6 * p), tf = tq24(t);
  const pts = []; for (let i = 0; i <= 50; i++) { const s = i / 50; pts.push([x0 + Math.sin(s * 7.5 - tf * 2.4) * 30 * s - s * 40, y0 - s * Hs]); }
  const [ex, ey] = pts[50];
  const curl = []; for (let i = 0; i <= 30; i++) { const a = -Math.PI / 2 - i / 30 * 4.2, r = 34 * (1 - i / 38); curl.push([ex + 0 + Math.cos(a) * r + 0, ey + 34 + Math.sin(a) * r]); }
  const all = pts.concat(curl.map(([x, y]) => [x, y - 34 * 0 - 0]));
  g.save(); g.globalAlpha = fade * .9;
  gline(g, all, { w: 3.2, part: p, color: '#e9dfc8', glow: .3 });
  gline(g, pts.map(([x, y], i) => [x + 10 + 4 * Math.sin(i * .3), y + 6]), { w: 1.3, part: p * .85, color: '#cbbd9f' });
  g.restore();
}

// ---------- the caveman (side view, facing the fire = screen-left) ----------
function pose(t) {
  const tc = tq12(t);
  const rubAmp = 1 - ss(seg(tc, 2.95, 3.1)), phase = TAU * (1.6 * tc + .55 * tc * tc), d = 15 * Math.sin(phase) * rubAmp;
  const rise = back(seg(tc, 3.5, 4.1), 1.3), recoil = ss(seg(tc, 3.05, 3.4)) * (1 - ss(seg(tc, 3.5, 3.9)));
  const bob = rubAmp * 3 * Math.sin(phase * 2);
  const pump = ss(seg(tc, 4.2, 4.4)) * Math.sin((tc - 4.2) * TAU * 1.6) * 14;
  const hip = P2([1185, 800 + bob * .3], [1262, 772], rise);
  hip[0] += recoil * 18;
  const sh = P2([1098, 652 + bob], [1240, 596], rise); sh[0] += recoil * 30; sh[1] -= recoil * 8;
  const head = P2([1042, 618 + bob], [1238, 520], rise); head[0] += recoil * 38; head[1] -= recoil * 10;
  const tilt = lerp(-.35, .42, rise) + recoil * .15;
  const handN0 = [972 + d, 792], handF0 = [968 - d, 768];
  const rest = [1060, 790];   // hands pulled back at the spark
  let handN = P2(handN0, rest, recoil), handF = P2(handF0, [1080, 770], recoil);
  handN = P2(handN, [1150, 402 - pump], rise); handF = P2(handF, [1392, 418 + pump * .7], rise);
  const kneeN = P2([1080, 780], [1160, 772], rise), footN = P2([1070, GY], [1150, GY], rise), kneeF = P2([1152, GY], [1238, GY], rise), footF = P2([1268, GY - 4], [1348, GY - 4], rise);
  return { hip, sh, head, tilt, handN, handF, kneeN, footN, kneeF, footF, rise, joy: ss(seg(tc, 3.4, 3.8)), drill: tc < 3.25 ? 0 : ei(seg(tc, 3.25, 3.6)), d };
}
function mats(k) {
  return {
    skin: { base: mix('#9c6a50', '#f08a52', k), light: mix('#c9967a', '#ffd9aa', k), dark: mix('#2a1714', '#6a2414', k), rim: k > .3 ? rgba('#ffc070', .95) : 'rgba(243,217,139,.75)' },
    pelt: { base: mix('#1d6b57', '#3a6a3a', k * .5), light: mix('#3f9a7f', '#c8b060', k * .6), dark: mix('#06201a', '#2a1a08', k * .5), rim: k > .3 ? rgba('#ffc070', .9) : 'rgba(243,217,139,.75)' },
    hair: { base: mix('#0d0908', '#2a140a', k), light: mix('#2c211b', '#7a3a1a', k), dark: '#030202', rim: k > .3 ? rgba('#ffb060', .9) : 'rgba(243,217,139,.7)' },
  };
}
const darker = M => ({ base: mix(M.base, M.dark, .35), light: mix(M.light, M.dark, .3), dark: M.dark, rim: M.rim });
function caveman(t, k, drawDrill) {
  const P = pose(t), M = mats(k);
  // light: moon from upper-left, then the fire from the lower left
  const Lm = [-.6, -.8], Lf = [-.95, .1], L = [lerp(Lm[0], Lf[0], k), lerp(Lm[1], Lf[1], k)], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll;
  const UA = 108, FA = 100;
  const shF = [P.sh[0] + 16, P.sh[1] - 4];
  // far leg + far arm
  const sk2 = darker(M.skin);
  limb(P.hip[0] + 8, P.hip[1], 27, P.kneeF[0], P.kneeF[1], 17, sk2, L, 1);
  limb(P.kneeF[0], P.kneeF[1], 17, P.footF[0], P.footF[1], 11, sk2, L, 1);
  footShape(P.footF, 1, sk2, L);
  const eF = ik(shF, P.handF, UA, FA, 1);
  limb(shF[0], shF[1], 16, eF[0], eF[1], 12, sk2, L, 1); limb(eF[0], eF[1], 12, P.handF[0], P.handF[1], 10, sk2, L, 1);
  fist(P.handF, 13, sk2, L);
  drawDrill(P);
  // torso: tapered streamline wedge, broad shoulders, narrow waist
  const ux = P.sh[0] - P.hip[0], uy = P.sh[1] - P.hip[1], ul = Math.hypot(ux, uy), u = [ux / ul, uy / ul], n = [u[1], -u[0]]; // n points to the front (left)
  const T = [[P.sh[0] + n[0] * 54 + u[0] * 6, P.sh[1] + n[1] * 54 + u[1] * 6], [P.sh[0] + u[0] * 22 - n[0] * 10, P.sh[1] + u[1] * 22 - n[1] * 10], [P.sh[0] - n[0] * 48, P.sh[1] - n[1] * 48],
    [P.hip[0] - n[0] * 34, P.hip[1] - n[1] * 34], [P.hip[0] - u[0] * 18, P.hip[1] - u[1] * 18], [P.hip[0] + n[0] * 30, P.hip[1] + n[1] * 30], [lerp(P.hip[0], P.sh[0], .55) + n[0] * 44, lerp(P.hip[1], P.sh[1], .55) + n[1] * 44]];
  const tp = toPath(T, true), tb = bbox(T);
  facet(tp, tb, [P.hip, P.sh], M.skin.base, M.skin.light, M.skin.dark, L, 1.6, M.skin.rim);
  // pelt: diagonal sash from the far shoulder + a chevron-hemmed skirt around the hips
  const at = (s, o) => [lerp(P.hip[0], P.sh[0], s) + n[0] * o, lerp(P.hip[1], P.sh[1], s) + n[1] * o];
  const pelt = [at(1.02, -44), at(1.08, -14), at(.35, 44), at(.12, 46)];
  const hemA = at(-.18, 56), hemB = at(-.25, -44);
  const zz = []; for (let i = 0; i <= 8; i++) { const q = P2(hemA, hemB, i / 8); zz.push([q[0] + (i % 2 ? 10 : -4) * u[0] * -1, q[1] + (i % 2 ? 18 : 0)]); }
  const peltPts = [...pelt, ...zz, at(.05, -44)];
  const pp = toPath(peltPts, true);
  facet(pp, bbox(peltPts), [at(-.2, 0), at(1, 0)], M.pelt.base, M.pelt.light, M.pelt.dark, L, 1.4, M.pelt.rim);
  gline(g, zz, { w: 2, sheen: .5 });
  gline(g, [pelt[0], pelt[1], pelt[2]], { w: 1.4, alpha: .8 });
  // gold lozenge spots on the pelt
  g.save(); g.clip(pp);
  for (let i = 0; i < 9; i++) { const q = at(.1 + (i % 3) * .3 + hash(i) * .1, -30 + Math.floor(i / 3) * 30); const sp = D.starPts(q[0], q[1], 8, .45, .3, 4); g.fillStyle = rgba(C.gold1, .55); g.fill(toPath(sp, true)); }
  g.restore();
  // near leg (kneeling forward, foot planted)
  limb(P.hip[0] - 6, P.hip[1] + 6, 30, P.kneeN[0], P.kneeN[1], 19, M.skin, L, 1.4);
  limb(P.kneeN[0], P.kneeN[1], 19, P.footN[0], P.footN[1] - 12, 12, M.skin, L, 1.4);
  footShape(P.footN, -1, M.skin, L);
  head(P, M, L, k);
  // near arm
  const eN = ik(P.sh, P.handN, UA, FA, P.rise > .5 ? -1 : 1);
  limb(P.sh[0], P.sh[1], 18, eN[0], eN[1], 13, M.skin, L, 1.5); limb(eN[0], eN[1], 13, P.handN[0], P.handN[1], 11, M.skin, L, 1.5);
  fist(P.handN, 14, M.skin, L);
  return P;
}
function fist(p, r, M, L) { const c = new Path2D(); c.arc(p[0], p[1], r, 0, TAU); facet(c, [p[0] - r, p[1] - r, p[0] + r, p[1] + r], [[p[0] - r, p[1] + r], [p[0] + r, p[1] - r]], M.base, M.light, M.dark, L, 1.2, M.rim); }
function footShape(p, dir, M, L) {
  const pts = dir < 0 ? [[p[0] + 14, p[1] - 22], [p[0] - 38, p[1] - 6], [p[0] - 40, p[1]], [p[0] + 18, p[1]]] : [[p[0] - 14, p[1] - 18], [p[0] + 26, p[1] - 4], [p[0] + 28, p[1] + 2], [p[0] - 20, p[1] + 2]];
  facet(toPath(pts, true), bbox(pts), null, M.base, M.light, M.dark, L, 1, M.rim);
}
function head(P, M, L, k) {
  g.save(); g.translate(P.head[0], P.head[1]); g.rotate(P.tilt); g.scale(1.15, 1.15);
  const c = Math.cos(-P.tilt), s = Math.sin(-P.tilt), Ll = [L[0] * c - L[1] * s, L[0] * s + L[1] * c];
  // neck
  const nk = capsulePath(10, 30, 15, 26, 62, 18); facet(nk, [-10, 20, 50, 80], null, M.skin.base, M.skin.light, M.skin.dark, Ll, 1, M.skin.rim);
  // hair mass behind: stepped geometric shag
  const hair = [[-30, -30], [-14, -52], [12, -54], [36, -40], [62, -36], [50, -18], [72, -6], [52, 2], [66, 24], [40, 20], [44, 46], [18, 30], [8, 0], [-20, -18]];
  const hp = toPath(hair, true); facet(hp, bbox(hair), [[-30, -50], [60, 30]], M.hair.base, M.hair.light, M.hair.dark, Ll, 1.4, M.hair.rim);
  // skull + heavy jaw (egg, a lit plane and a shadow plane)
  const face = [[-6, -46], [-28, -36], [-36, -14], [-40, 4], [-34, 14], [-36, 28], [-24, 42], [0, 44], [22, 30], [28, 6], [24, -26]];
  const fp = new Path2D(); { const n = face.length; fp.moveTo((face[0][0] + face[1][0]) / 2, (face[0][1] + face[1][1]) / 2); for (let i = 1; i <= n; i++) { const a = face[i % n], b = face[(i + 1) % n]; fp.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } fp.closePath(); }
  facet(fp, bbox(face), [[-4, -50], [-14, 46]], M.skin.base, M.skin.light, M.skin.dark, Ll, 1.6, M.skin.rim);
  // hair fringe over the brow
  const fr = [[-32, -24], [-26, -44], [0, -52], [26, -40], [10, -34], [4, -24], [-8, -32], [-14, -22]];
  facet(toPath(fr, true), bbox(fr), null, M.hair.base, M.hair.light, M.hair.dark, Ll, 1.2, M.hair.rim);
  // brow ridge, almond eye, one-stroke nose
  g.fillStyle = M.skin.dark; g.beginPath(); g.moveTo(-40, -16); g.lineTo(-6, -22); g.lineTo(-8, -14); g.lineTo(-36, -10); g.closePath(); g.fill();
  const open = lerp(.55, 1.2, P.joy);
  g.fillStyle = '#f2e8d5'; g.beginPath(); g.ellipse(-22, -5, 8, 4 * open, -.1, 0, TAU); g.fill();
  g.fillStyle = '#120a08'; g.beginPath(); g.arc(-25, -5, 3.2 * Math.min(1, open), 0, TAU); g.fill();
  if (k > .1) { g.fillStyle = rgba('#fff2c0', k); g.beginPath(); g.arc(-27, -6.5, 1.3, 0, TAU); g.fill(); }
  g.strokeStyle = M.skin.dark; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-36, -8); g.quadraticCurveTo(-50, 8, -38, 12); g.stroke();
  // beard: pointed lacquer wedge with engraved gold strands
  const brd = [[-36, 18], [-42, 46], [-28, 70], [-14, 54], [4, 52], [20, 28], [6, 30], [-20, 30]];
  const bp = toPath(brd, true); facet(bp, bbox(brd), [[-42, 20], [0, 60]], M.hair.base, M.hair.light, M.hair.dark, Ll, 1.3, M.hair.rim);
  for (let i = 0; i < 3; i++) gline(g, [[-30 + i * 9, 36], [-30 + i * 6, 58 - i * 4]], { w: 1, alpha: .7 });
  // mouth: a closed line, then an open joyful shout
  if (P.joy > .2) { g.fillStyle = '#1a0605'; g.beginPath(); g.moveTo(-36, 24); g.quadraticCurveTo(-28, 26 + 14 * P.joy, -16, 24); g.quadraticCurveTo(-26, 20, -36, 24); g.fill(); g.fillStyle = rgba('#f2e8d5', .9); g.fillRect(-33, 23.5, 14, 2.4); }
  else { g.strokeStyle = '#1a0605'; g.lineWidth = 2; g.beginPath(); g.moveTo(-36, 25); g.lineTo(-22, 24); g.stroke(); }
  g.restore();
}
function drill(t, P) {
  // the hearth board on the ground, the drill stick between the palms (spinning bands), falling into the flame
  const bd = capsulePath(AX - 120, GY - 8, 9, AX + 90, GY - 10, 9);
  airbrush(g, bd, { base: '#6a4026', dark: '#1c0e08', light: '#b07a4a', dir: -2, bbox: [AX - 130, GY - 20, AX + 100, GY] }); gline(g, bd, { w: 1.4 });
  if (t < 3.05) { const tk = new Path2D(); tk.ellipse(AX - 4, GY - 16, 22, 8, 0, 0, TAU); g.fillStyle = mix('#cbbd9f', '#7a5a3a', .4); g.fill(tk); }
  const a = -P.drill * 1.25, L = 175, bx = AX, by = GY - 14;
  if (P.drill >= 1) return;
  g.save(); g.translate(bx, by); g.rotate(a);
  const st = new Path2D(); st.rect(-6, -L, 12, L);
  airbrush(g, st, { base: '#8a5a32', dark: '#2a160a', light: '#d8a46a', dir: Math.PI, bbox: [-6, -L, 6, 0] });
  g.save(); g.clip(st); const off = (P.d * 3) % 22; for (let y = -L - 22; y < 0; y += 22) { g.fillStyle = rgba(C.gold1, .55); g.beginPath(); g.moveTo(-6, y + off); g.lineTo(6, y + off + 8); g.lineTo(6, y + off + 11); g.lineTo(-6, y + off + 3); g.fill(); } g.restore();
  gline(g, D.rectPts(-6, -L, 12, L), { w: 1.2 });
  g.restore();
}
function friction(t) {
  // tiny glints at the drill tip as friction builds (2.4–3.0 s), then the spark (3.0 s) with an ignition overshoot
  const x = AX, y = GY - 16;
  for (let i = 0; i < 6; i++) {
    const t0 = 2.35 + i * .1, u = t - t0; if (u < 0 || u > .25 || t > 3.1) continue;
    D.sparkle(g, x + (hash(i) - .5) * 50, y - u * 120 - hash(i + 4) * 20, 10 * (1 - u / .25), { color: i % 2 ? '#ffb060' : C.gold2 });
  }
  const u = t - 2.98; if (u < 0 || u > .45) return;
  const r = u < .06 ? u / .06 * 150 : lerp(150, 60, clamp((u - .06) / .18)) * (1 - ss(seg(u, .25, .45)));
  D.glow(g, x, y, r * 3, '#ffd080', .7 * (1 - u / .45));
  D.sparkle(g, x, y, r, { rot: u * 2, color: '#fff4d2' });
  D.sparkle(g, x, y, r * .55, { rot: Math.PI / 4 + u * 2, color: '#ffc060' });
}

// ---------- frame ----------
function render(t) {
  t = clamp(t, 0, window.DUR - 1e-6);
  const k = fireK(t), kf = k * (1 + .06 * Math.sin(tq24(t) * 19) + .04 * Math.sin(tq24(t) * 31));
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  // one continuous shot: a slow mechanical push-in on the axis, a touch faster as the fire lifts
  const z = 1 + .05 * eio(t / 5) + .04 * ss(seg(t, 3.2, 5)), ox = AX, oy = 700;
  g.translate(ox, oy); g.scale(z, z); g.translate(-ox, -oy);
  sky(t, kf); cliff(t, kf); caveArch(t, kf); groundPlane(t, kf);
  fireBurst(t, kf);
  // fire light washes the set (airbrushed warm pool)
  if (kf > 0) { g.save(); g.globalCompositeOperation = 'lighter'; D.glow(g, AX, GY - 120, 1200, '#ff7a30', .32 * kf); D.glow(g, AX, GY, 700, '#ffb060', .25 * kf, .35); g.restore(); }
  smoke(t);
  caveman(t, kf, P => drill(t, P));
  fire(t, kf);
  friction(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  D.vignette(g, W, H, .6 - kf * .15);
  // light film grain (seeded per frame)
  const R = mulberry(Math.floor(t * 24) + 1); g.fillStyle = 'rgba(255,240,210,.035)';
  for (let i = 0; i < 900; i++) g.fillRect(R() * W, R() * H, 1.5, 1.5);
}

try { await document.fonts.ready; } catch (e) { }
window.DUR = 5;
window.render = render;
render(0);
window.READY = true;
