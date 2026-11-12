// labels.js: the 2D overlay (one canvas above the WebGL canvas). Redrawn completely every frame.
//   const O = overlay(S);  in render(t): O.begin(); ...calls...; (no end needed)
//   O.label({ at: Vector3|[x,y,z], text, sub, dx, dy, k, color })  floating pill with leader to a 3D point
//   O.tag({ at, text, k })                                          small centred tag (atom symbols, "CO2")
//   O.header({ kicker, title, k })                                  top-left kicker + title
//   O.formula({ text: 'CH4 + 2 O2 -> CO2 + 2 H2O', x, y, k, hi })   chemical equation with real subscripts
//   O.arrow(x0, y0, x1, y1, { k, color, both })                     2D arrow (screen px at 1080p)
//   O.meter({ x, y, h, value, text, unit })                         vertical gauge (temperature, energy)
//   O.vignette(strength)                                            darkened corners, draw first
// All sizes are 1080p px; the layer scales by height/1080. k = 0..1 reveal progress (fade + 10 px rise).
import * as THREE from '/_vendor/three.module.js';
import { PAL, TYPE, LINE } from './palette.js';
import { clamp, ease } from './core.js';

export function overlay(S, { parent = document.body } = {}) {
  const { width: W, height: H } = S;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  Object.assign(c.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
  parent.appendChild(c);
  const g = c.getContext('2d'), s = H / 1080, v = new THREE.Vector3();
  const font = (T, size = T.size, weight = T.weight) => { g.font = `${weight} ${size * s}px ${T.family}`; g.letterSpacing = `${(T.tracking || 0) * size * s}px`; };
  const proj = (p) => { v.copy(Array.isArray(p) ? new THREE.Vector3(...p) : p).project(S.camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z]; };
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  const api = {
    canvas: c, ctx: g, project: proj, scale: s,
    begin() { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalAlpha = 1; },

    vignette(str = 0.5) {
      const grd = g.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.5, H * 1.05);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${str})`);
      g.globalAlpha = 1; g.fillStyle = grd; g.fillRect(0, 0, W, H);
    },

    // Floating label: anchor dot + ring at the 3D point, thin leader, pill with text (+ optional sub line).
    label({ at, text, sub, dx = 120, dy = -90, k = 1, color = PAL.accent, align }) {
      if (k <= 0) return;
      const [ax, ay, z] = proj(at); if (z > 1) return;
      const e = ease.outCubic(clamp(k)), lx = ax + dx * s, ly = ay + dy * s;
      const side = align || (dx >= 0 ? 'left' : 'right');
      // anchor
      g.globalAlpha = e; g.fillStyle = color; g.beginPath(); g.arc(ax, ay, LINE.dot * s, 0, 7); g.fill();
      g.strokeStyle = color; g.lineWidth = 1 * s; g.globalAlpha = e * 0.5; g.beginPath(); g.arc(ax, ay, LINE.ring * s * (0.6 + 0.4 * e), 0, 7); g.stroke();
      // leader (draws on)
      const kl = ease.outCubic(clamp(k * 1.7));
      g.globalAlpha = e * 0.85; g.lineWidth = LINE.leader * s; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (lx - ax) * kl, ay + (ly - ay) * kl); g.stroke();
      // pill
      const kt = ease.outCubic(clamp((k - 0.35) / 0.65)); if (kt <= 0) return;
      font(TYPE.label); const tw = g.measureText(text).width;
      let sw = 0; if (sub) { font(TYPE.sub); sw = g.measureText(sub).width; }
      const padX = 18 * s, padY = 12 * s, lh = TYPE.label.size * s, sh = sub ? TYPE.sub.size * s * 1.25 : 0;
      const bw = Math.max(tw, sw) + padX * 2, bh = lh + sh + padY * 2;
      const bx = side === 'left' ? lx : lx - bw, by = ly - bh / 2 + (1 - kt) * 10 * s;
      g.globalAlpha = kt; g.fillStyle = PAL.pill; rr(bx, by, bw, bh, 10 * s); g.fill();
      g.strokeStyle = PAL.pillEdge; g.lineWidth = 1 * s; g.stroke();
      g.fillStyle = color; g.fillRect(side === 'left' ? bx : bx + bw - 3 * s, by + 8 * s, 3 * s, bh - 16 * s); // accent tab on the leader side
      g.textBaseline = 'top'; g.textAlign = 'left';
      font(TYPE.label); g.fillStyle = PAL.ink; g.fillText(text, bx + padX, by + padY - 2 * s);
      if (sub) { font(TYPE.sub); g.fillStyle = PAL.soft; g.fillText(sub, bx + padX, by + padY + lh + 4 * s); }
    },

    // Small centred tag under/over a 3D point (molecule names, atom symbols). Text is formula-aware.
    tag({ at, text, k = 1, dy = 0, size = 34, color = PAL.ink, pill = true }) {
      if (k <= 0) return;
      const [x, y, z] = proj(at); if (z > 1) return;
      const e = ease.outCubic(clamp(k)), w = api.formula({ text, measure: true, size });
      const yy = y + dy * s + (1 - e) * 8 * s;
      g.globalAlpha = e;
      if (pill) { g.fillStyle = PAL.pill; rr(x - w / 2 - 14 * s, yy - size * s * 0.72, w + 28 * s, size * s * 1.45, size * s * 0.72); g.fill(); g.strokeStyle = PAL.pillEdge; g.lineWidth = 1 * s; g.stroke(); }
      api.formula({ text, x: (x - w / 2) / s, y: yy / s, size, k: 1, color, raw: true, alpha: e });
    },

    header({ kicker, title, k = 1, x = 96, y = 92 }) {
      if (k <= 0) return;
      const e = ease.outCubic(clamp(k)), X = x * s, Y = y * s - (1 - e) * 10 * s;
      g.globalAlpha = e; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      if (kicker) { g.fillStyle = PAL.accent; g.fillRect(X, Y - 34 * s, 28 * s, LINE.rule * s); font(TYPE.kicker); g.fillStyle = PAL.soft; g.fillText(kicker, X, Y); }
      if (title) { font(TYPE.title); g.fillStyle = PAL.ink; g.fillText(title, X, Y + 54 * s); }
    },

    // Chemical text: digits right after a letter or ')' become subscripts, '->' becomes an arrow, '+' gets air.
    // hi: [i0, i1] term indices (split on ' + ' and '->') to highlight; others drawn in soft ink.
    formula({ text, x = 960, y = 980, size = TYPE.formula.size, k = 1, center = false, color = PAL.ink, hi = null, measure = false, raw = false, alpha = 1 }) {
      const T = TYPE.formula, toks = [];
      let term = 0;
      for (const part of text.split(/(\s*->\s*|\s+\+\s+)/)) {
        if (!part) continue;
        if (/->/.test(part)) { toks.push({ arrow: true }); term++; continue; }
        if (/\+/.test(part) && part.trim() === '+') { toks.push({ s: ' + ', op: true }); term++; continue; }
        let prev = '';
        for (const ch of part) { const sub = /\d/.test(ch) && /[A-Za-z)\]]/.test(prev); toks.push({ s: ch, sub, term }); if (!sub) prev = ch; }
      }
      const px = size * s;
      const wOf = (tk) => { if (tk.arrow) return px * 2.0; g.font = `${T.weight} ${tk.sub ? px * 0.62 : px}px ${T.family}`; g.letterSpacing = '0px'; return g.measureText(tk.s).width; };
      const total = toks.reduce((a, tk) => a + wOf(tk), 0);
      if (measure) return total;
      if (k <= 0) return total;
      const e = ease.outCubic(clamp(k));
      let X = raw ? x * s : (center ? x * s - total / 2 : x * s);
      const Y = raw ? y * s + px * 0.35 : y * s + (1 - e) * 10 * s;
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      for (const tk of toks) {
        const w = wOf(tk), lit = !hi || (tk.term >= hi[0] && tk.term <= hi[1]) || tk.arrow || tk.op;
        g.globalAlpha = (raw ? alpha : e) * (lit ? 1 : 0.38);
        g.fillStyle = tk.op || tk.arrow ? PAL.soft : color;
        if (tk.arrow) {
          g.strokeStyle = PAL.accent; g.fillStyle = PAL.accent; g.lineWidth = LINE.arrow * s;
          const ay = Y - px * 0.3; g.beginPath(); g.moveTo(X + px * 0.35, ay); g.lineTo(X + px * 1.5, ay); g.stroke();
          g.beginPath(); g.moveTo(X + px * 1.68, ay); g.lineTo(X + px * 1.38, ay - px * 0.17); g.lineTo(X + px * 1.38, ay + px * 0.17); g.closePath(); g.fill();
        } else g.fillText(tk.s, X, tk.sub ? Y + px * 0.2 : Y);
        X += w;
      }
      return total;
    },

    arrow(x0, y0, x1, y1, { k = 1, color = PAL.accent, both = false, width = LINE.arrow, head = 16 } = {}) {
      if (k <= 0) return;
      const S_ = s, X0 = x0 * S_, Y0 = y0 * S_, X1 = x1 * S_, Y1 = y1 * S_, a = Math.atan2(Y1 - Y0, X1 - X0);
      const e = ease.outCubic(clamp(k)), ex = X0 + (X1 - X0) * e, ey = Y0 + (Y1 - Y0) * e;
      g.globalAlpha = e; g.strokeStyle = g.fillStyle = color; g.lineWidth = width * S_; g.lineCap = 'round';
      g.beginPath(); g.moveTo(X0, Y0); g.lineTo(ex, ey); g.stroke();
      const hd = (x, y, ang) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang - 0.45) * head * S_, y - Math.sin(ang - 0.45) * head * S_); g.lineTo(x - Math.cos(ang + 0.45) * head * S_, y - Math.sin(ang + 0.45) * head * S_); g.closePath(); g.fill(); };
      hd(ex, ey, a); if (both) hd(X0, Y0, a + Math.PI);
    },

    // Vertical gauge with a warm fill. value 0..1, text = caption, readout = big number string.
    meter({ x = 1740, y = 300, h = 420, value = 0, text = 'TEMPERATURE', readout = '', k = 1, color = PAL.heat }) {
      if (k <= 0) return;
      const e = ease.outCubic(clamp(k)), X = x * s, Y = y * s, Hh = h * s, w = 14 * s;
      g.globalAlpha = e;
      g.fillStyle = 'rgba(255,255,255,0.08)'; rr(X - w / 2, Y, w, Hh, w / 2); g.fill();
      g.strokeStyle = PAL.pillEdge; g.lineWidth = 1 * s; g.stroke();
      const fh = Hh * clamp(value), grd = g.createLinearGradient(0, Y + Hh, 0, Y);
      grd.addColorStop(0, PAL.flameEdge); grd.addColorStop(1, PAL.flameCore);
      g.fillStyle = grd; rr(X - w / 2, Y + Hh - fh, w, fh, w / 2); g.fill();
      g.shadowColor = color; g.shadowBlur = 18 * s; g.beginPath(); g.arc(X, Y + Hh - fh, 9 * s, 0, 7); g.fillStyle = PAL.flameCore; g.fill(); g.shadowBlur = 0;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      font(TYPE.kicker); g.fillStyle = PAL.soft; g.fillText(text, X, Y - 56 * s);
      font(TYPE.label, 34); g.fillStyle = PAL.ink; g.fillText(readout, X, Y - 18 * s);
    },
  };
  return api;
}
