// HUD typography: monospace instrument read-outs. Draw ONLY in the hud(ctx, t) pass (crisp, source-over).
import { C, CH, CHANNELS, HUD, TYPE, LW, rgba } from './palette.js';
import { clamp, E, smooth } from './ease.js';

export function mono(ctx, s, x, y, { size = TYPE.min, color = HUD.text, align = 'left', base = 'middle', a = 1, weight = 400, track = 0, family = TYPE.mono, glow = 0 } = {}) {
  if (a <= 0.003) return 0;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `${weight} ${size}px ${family}`; ctx.letterSpacing = track + 'px';
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width; ctx.restore();
  return w;
}
export const sans = (ctx, s, x, y, o = {}) => mono(ctx, s, x, y, { family: TYPE.sans, weight: 300, ...o });

// chem formula with real subscripts: "CH4 + 2 O2 -> CO2 + 2 H2O". A digit is a subscript when it follows a letter or ')'.
// colors: optional array, one colour per space-separated term (operators use HUD.dim). Returns width.
export function chem(ctx, str, x, y, { size = TYPE.eq, color = HUD.text, colors = null, align = 'left', a = 1, weight = 400, family = TYPE.mono, glow = 0, p = 1 } = {}) {
  if (a <= 0.003) return 0;
  const terms = str.split(' ');
  ctx.save(); ctx.globalAlpha *= a; ctx.textBaseline = 'middle';
  const F = `${weight} ${size}px ${family}`, Fs = `${weight} ${Math.round(size * 0.62)}px ${family}`;
  const runs = []; let ci = 0;
  terms.forEach((term, ti) => {
    const op = term === '+' || term === '->' || term === '=';
    const col = op ? HUD.dim : colors ? colors[ci++ % colors.length] : color;
    if (term === '->') runs.push({ arrow: true, w: size * 1.3, col });
    else [...term].forEach((chr, i) => {
      const sub = /\d/.test(chr) && i > 0 && /[A-Za-z)]/.test(term[i - 1]);
      ctx.font = sub ? Fs : F; runs.push({ chr, sub, w: ctx.measureText(chr).width, col });
    });
    if (ti < terms.length - 1) { ctx.font = F; runs.push({ chr: ' ', w: ctx.measureText(' ').width * 0.9, col }); }
  });
  const W = runs.reduce((s, r) => s + r.w, 0);
  let cx = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  const nShow = Math.ceil(runs.length * clamp(p));
  runs.slice(0, nShow).forEach((r) => {
    ctx.fillStyle = r.col; ctx.strokeStyle = r.col;
    if (glow) { ctx.shadowColor = r.col; ctx.shadowBlur = glow; }
    if (r.arrow) {
      const x0 = cx + size * 0.15, x1 = cx + r.w - size * 0.15;
      ctx.lineWidth = Math.max(2, size * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x1 - size * 0.22, y - size * 0.18); ctx.lineTo(x1, y); ctx.lineTo(x1 - size * 0.22, y + size * 0.18); ctx.stroke();
    } else { ctx.font = r.sub ? Fs : F; ctx.fillText(r.chr, cx, r.sub ? y + size * 0.24 : y); }
    cx += r.w;
  });
  ctx.restore();
  return W;
}

// "■ CH1 405nm  OXYGEN" — channel colour swatch + id, optional name in HUD grey. on: 0 (dim) .. 1 (active)
export function chLabel(ctx, x, y, ch, name = '', { a = 1, on = 1, size = TYPE.min, align = 'left' } = {}) {
  const c = C(ch), id = `${c.name} ${c.nm}`;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `400 ${size}px ${TYPE.mono}`;
  const wId = ctx.measureText(id).width, wN = name ? ctx.measureText('  ' + name).width : 0, sw = size * 0.55, gap = size * 0.5;
  const W = sw + gap + wId + wN, x0 = align === 'right' ? x - W : x;
  ctx.globalAlpha *= 0.35 + 0.65 * on;
  ctx.fillStyle = c.hex; ctx.fillRect(x0, y - sw / 2, sw, sw);
  mono(ctx, id, x0 + sw + gap, y, { size, color: c.hex });
  if (name) mono(ctx, '  ' + name, x0 + sw + gap + wId, y, { size, color: HUD.text });
  ctx.restore();
  return W;
}

// tag: reticle on the anchor (ax,ay), thin elbow leader, title (chem-formatted) + sub line in channel colour.
// align 'left' = text starts at lx, 'right' = text ends at lx. p 0..1 animates it in (leader grows, text fades).
export function tag(ctx, ax, ay, lx, ly, title, { sub = '', ch = 'white', p = 1, align = 'left', size = TYPE.label, reticle = 12 } = {}) {
  if (p <= 0.003) return;
  const c = C(ch), u = E.outCubic(clamp(p / 0.6)), ut = smooth((p - 0.35) / 0.65);
  ctx.save();
  ctx.strokeStyle = HUD.dim; ctx.lineWidth = LW.hud; ctx.globalAlpha *= u;
  ctx.beginPath(); ctx.arc(ax, ay, reticle, 0, Math.PI * 2); ctx.stroke();
  const ex = lx + (align === 'left' ? -14 : 14), dx = ax + (ex - ax) * u, dy = ay + (ly - ay) * u;
  const d = Math.hypot(lx - ax, ly - ay) || 1, sx = ax + ((ex - ax) / d) * reticle, sy = ay + ((ly - ay) / d) * reticle;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(dx, dy); ctx.stroke();
  ctx.restore();
  chem(ctx, title, lx, ly - (sub ? size * 0.36 : 0), { size, align, a: ut, weight: 700 });
  if (sub) mono(ctx, sub, lx, ly + size * 0.62, { size: TYPE.min, color: c.hex, align, a: ut });
}

// scale bar: solid bar + label above. label like "200 µm".
export function scaleBar(ctx, x, y, len, label, { a = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = HUD.bar; ctx.fillRect(x, y - LW.bar / 2, len, LW.bar); ctx.restore();
  mono(ctx, label, x + len / 2, y - 26, { a, align: 'center', color: HUD.bar });
}

// Instrument frame: channel list (top right), scale bar + objective (bottom left), timecode + z (bottom right).
// opt: { channels: [[ch, name, on]], scale: [len, label], objective, z, a }
export function hudFrame(ctx, t, { W = 1920, H = 1080, m = 96, channels = [], scale = null, objective = '', z = null, a = 1 } = {}) {
  channels.forEach(([ch, name, on = 1], i) => chLabel(ctx, W - m, m + 4 + i * 36, ch, name, { a, on, align: 'right' }));
  if (scale) scaleBar(ctx, m, H - m + 6, scale[0], scale[1], { a });
  if (objective) mono(ctx, objective, m + (scale ? scale[0] + 36 : 0), H - m + 6, { a, color: HUD.dim });
  const s = t.toFixed(2).padStart(5, '0');
  mono(ctx, `T+00:${s}`, W - m, H - m + 6, { a, align: 'right', color: HUD.text });
  if (z !== null) mono(ctx, `Z ${z >= 0 ? '+' : '-'}${Math.abs(z).toFixed(1)} µm`, W - m, H - m - 30, { a, align: 'right', color: HUD.dim });
}

// Beat caption, top left: "01 / 03" index, title (Bahnschrift light, caps), one mono sub line.
// items[i] = { title, sub } per beat of bt (beats()). Crossfades with a small vertical drift.
export function caption(ctx, t, bt, items, { x = 96, y = 104, inT = 0.5, outT = 0.3 } = {}) {
  bt.list.forEach((b, i) => {
    const it = items[i]; if (!it) return;
    const last = i === bt.list.length - 1, pin = smooth((t - b.a - 0.12) / inT), pout = last ? 0 : smooth((t - (b.b - outT)) / outT);
    const a = pin * (1 - pout); if (a <= 0.003) return;
    const dy = (1 - pin) * 10 - pout * 10;
    mono(ctx, `${String(i + 1).padStart(2, '0')} / ${String(bt.list.length).padStart(2, '0')}`, x, y + dy, { a, color: HUD.dim, track: 2 });
    mono(ctx, it.title, x, y + 52 + dy, { a, size: TYPE.caption, family: TYPE.sans, weight: 300, track: 4, color: '#FFFFFF' });
    if (it.sub) mono(ctx, it.sub, x, y + 102 + dy, { a, color: HUD.text });
  });
}
