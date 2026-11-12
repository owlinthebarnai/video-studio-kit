// labels.js: 2D overlay canvas for leader lines, caps labels, axis lines, arrows and the header block.
// 3D anchors are projected to screen every frame, so labels stick to moving parts.
//
// const L = labelLayer({ width, height });
// L.add({ text: 'CRYSTAL', sub: 'Sapphire, AR coated', index: '01', side: 'left',
//         anchor: { object: crystalMesh, local: [0.9, 0.05, 0] }, show: 3.5 });
// in render(t): L.draw(t, camera)  (clears and redraws everything)
import * as THREE from '/_vendor/three.module.js';
import { PAL, TYPE, LINE } from './palette.js';
import { clamp, invLerp, ease } from './core.js';

const font = (T, s) => `${T.weight} ${T.size * s}px ${T.family}`;

export function labelLayer({ width = 1920, height = 1080, parent = document.body, margin = 0.06, minGap = 54, columns = [0.27, 0.73] } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  Object.assign(c.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
  parent.appendChild(c);
  const ctx = c.getContext('2d'), s = height / 1080, labels = [], extras = [];
  const v = new THREE.Vector3();

  const project = (p, camera) => { v.copy(p).project(camera); return [(v.x * 0.5 + 0.5) * width, (-v.y * 0.5 + 0.5) * height, v.z]; };
  const anchorWorld = (a) => {
    if (typeof a === 'function') return a();
    if (a.isVector3) return a;
    a.object.updateWorldMatrix(true, false);
    return new THREE.Vector3(...(a.local || [0, 0, 0])).applyMatrix4(a.object.matrixWorld);
  };
  const spaced = (T) => { ctx.font = font(T, s); if ('letterSpacing' in ctx) ctx.letterSpacing = `${T.tracking * T.size * s}px`; };

  // partial polyline (draw-on)
  function polyline(pts, k) {
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let left = total * k; ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const f = Math.min(1, left / (seg[i - 1] || 1));
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); left -= seg[i - 1];
    }
    ctx.stroke();
  }

  function drawLabel(L, x, y, ax, ay, k, alpha) {
    const side = L.side === 'left' ? -1 : 1;
    const colX = L.column ?? width * (side < 0 ? columns[0] : columns[1]);
    const elbowX = colX - side * 34 * s;
    ctx.globalAlpha = alpha;
    // anchor: small dot + hairline ring
    const kd = clamp(k * 4);
    ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(ax, ay, LINE.dot * s * kd, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1 * s; ctx.globalAlpha = alpha * 0.55 * kd;
    ctx.beginPath(); ctx.arc(ax, ay, LINE.ring * s, 0, Math.PI * 2); ctx.stroke();
    // leader: anchor -> elbow (diagonal) -> column (horizontal)
    ctx.globalAlpha = alpha * 0.8; ctx.lineWidth = LINE.leader * s; ctx.strokeStyle = PAL.line;
    const start = [ax + side * LINE.ring * s, ay];
    polyline([start, [elbowX, y], [colX, y]], ease.outCubic(clamp(k * 1.6)));
    // text appears after the line lands
    const kt = ease.outCubic(clamp((k - 0.45) / 0.55));
    if (kt <= 0) return;
    const tx = colX + side * (12 * s + (1 - kt) * 8 * s);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = side < 0 ? 'right' : 'left';
    ctx.globalAlpha = alpha * kt;
    let x0 = tx;
    if (L.index) {
      spaced(TYPE.index); ctx.fillStyle = PAL.accent; ctx.fillText(L.index, x0, y + 5 * s);
      x0 += side * (ctx.measureText(L.index).width + 12 * s);
    }
    spaced(TYPE.label); ctx.fillStyle = PAL.ink; ctx.fillText(L.text, x0, y + 5.5 * s);
    if (L.sub) { spaced(TYPE.sub); ctx.fillStyle = PAL.inkSoft; ctx.fillText(L.sub, x0, y + 25 * s); }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // keep labels on one side at least minGap apart, in anchor order, inside the safe margins
  function resolve(list) {
    list.sort((a, b) => a.ay - b.ay);
    const g = minGap * s, top = height * margin + 20 * s, bot = height * (1 - margin) - 30 * s;
    list.forEach((L, i) => { L.y = clamp(L.ay + (L.dy || 0) * s, top, bot); if (i && L.y < list[i - 1].y + g) L.y = list[i - 1].y + g; });
    for (let i = list.length - 1; i >= 0; i--) { if (list[i].y > bot) list[i].y = bot; if (i < list.length - 1 && list[i].y > list[i + 1].y - g) list[i].y = list[i + 1].y - g; }
  }

  return {
    canvas: c, ctx, scale: s, project,
    // returns the live label object: later edits (L.dy = 30, L.hide = 4.8) take effect
    add(L) { if (L.fade == null) L.fade = 0.6; labels.push(L); return L; },
    // extra overlay drawing each frame: fn(ctx, t, camera, api)
    extra(fn) { extras.push(fn); },
    // dashed centre axis between two world points (exploded-view convention)
    axis(p0, p1, camera, { alpha = 1, dash = [6, 6] } = {}) {
      const a = project(p0, camera), b = project(p1, camera);
      ctx.save(); ctx.globalAlpha = 0.35 * alpha; ctx.strokeStyle = PAL.line; ctx.lineWidth = LINE.axis * s; ctx.setLineDash(dash.map((d) => d * s));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
    },
    // thin arrow between two screen points (direction-of-travel cue); k = draw-on progress
    arrow(a, b, { alpha = 1, k = 1, head = 7 } = {}) {
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, ang = Math.atan2(y - a[1], x - a[0]);
      ctx.save(); ctx.globalAlpha = 0.7 * alpha; ctx.strokeStyle = PAL.line; ctx.lineWidth = LINE.leader * s;
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang - 0.45) * head * s, y - Math.sin(ang - 0.45) * head * s); ctx.lineTo(x, y);
      ctx.lineTo(x - Math.cos(ang + 0.45) * head * s, y - Math.sin(ang + 0.45) * head * s); ctx.stroke(); ctx.restore();
    },
    // small header block, top-left: title in tracked caps + meta line + short rule
    header({ title, meta, x = 0.06, y = 0.085, alpha = 1 }) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const X = width * x, Y = height * y;
      spaced(TYPE.header); ctx.fillStyle = PAL.ink; ctx.fillText(title, X, Y);
      if (meta) { spaced(TYPE.sub); ctx.fillStyle = PAL.inkSoft; ctx.fillText(meta, X, Y + 22 * s); }
      ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = PAL.accent; ctx.fillRect(X, Y - 30 * s, 24 * s, 2 * s);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.restore();
    },
    clear() { ctx.clearRect(0, 0, width, height); },
    // draw all labels for time t. Each label: show (start s), fade (draw-on duration s), hide (optional end s).
    draw(t, camera, { alpha = 1, clear = true } = {}) {
      if (clear) ctx.clearRect(0, 0, width, height);
      const live = { left: [], right: [] };
      for (const L of labels) {
        let k = invLerp(L.show ?? 0, (L.show ?? 0) + L.fade, t);
        if (L.hide != null) k = Math.min(k, 1 - invLerp(L.hide, L.hide + 0.3, t));
        if (k <= 0) continue;
        const [ax, ay] = project(anchorWorld(L.anchor), camera);
        L.ax = ax; L.ay = ay; L.k = k; live[L.side === 'left' ? 'left' : 'right'].push(L);
      }
      resolve(live.left); resolve(live.right);
      for (const L of [...live.left, ...live.right]) drawLabel(L, 0, L.y, L.ax, L.ay, L.k, alpha);
      ctx.globalAlpha = 1;
      for (const fn of extras) fn(ctx, t, camera, this);
    },
  };
}
