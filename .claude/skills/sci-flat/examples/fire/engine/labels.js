// Text, numbered badges, leader-line callouts and chemical formulas.
import { PAL, LW, TYPE } from './palette.js';
import { E, clamp } from './ease.js';
import { line, circle, pop, withAlpha } from './shapes.js';

export function setFont(ctx, { size = TYPE.label, weight = 600, family = TYPE.display, track = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${family}`; ctx.letterSpacing = `${track}px`;
}
export function measure(ctx, str, opts = {}) { ctx.save(); setFont(ctx, opts); const w = ctx.measureText(str).width; ctx.restore(); return w; }

// text(ctx, 'HEAT', x, y, { size, weight, family, color, align, baseline, track, alpha }) -> width
export function text(ctx, str, x, y, { size = TYPE.label, weight = 600, family = TYPE.display, color = PAL.ink,
  align = 'left', baseline = 'middle', track = 0, alpha = 1 } = {}) {
  if (alpha <= 0) return 0;
  ctx.save(); setFont(ctx, { size, weight, family, track });
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline; ctx.globalAlpha *= alpha;
  ctx.fillText(str, x, y); const w = ctx.measureText(str).width; ctx.restore(); return w;
}

// numbered callout disc. p LINEAR (pops in).
export function badge(ctx, n, x, y, p = 1, { r = 21, fill = PAL.ink, color = PAL.white } = {}) {
  pop(ctx, x, y, p, () => {
    circle(ctx, x, y, r, { fill, stroke: null });
    text(ctx, String(n), x, y + r * 0.06, { size: r * 1.2, weight: 700, color, align: 'center' });
  });
}

// Leader-line callout: dot on the subject (from), diagonal to elbow (to), short horizontal, then text.
// p LINEAR: line draws first, text fades + slides in after. side: 'right' | 'left' | 'auto'.
// opts: text, sub, num, color (leader + badge), size, subAlpha, run (horizontal run length)
export function callout(ctx, { from, to, text: str, sub = null, num = null, p = 1, side = 'auto', color = PAL.ink,
  size = TYPE.label, subSize = TYPE.small, subAlpha = 1, run = 26, dot = true } = {}) {
  if (p <= 0) return;
  const pl = clamp(p / 0.55), pt = E.outCubic(clamp((p - 0.4) / 0.6));
  const dir = side === 'auto' ? (to[0] >= from[0] ? 1 : -1) : side === 'right' ? 1 : -1;
  const end = [to[0] + dir * run, to[1]];
  if (dot) pop(ctx, from[0], from[1], clamp(pl * 2.5), () => circle(ctx, from[0], from[1], LW.leader * 2, { fill: color, stroke: null }));
  line(ctx, [from, to, end], E.inOutCubic(pl), { stroke: color, lw: LW.leader });
  if (pt <= 0) return;
  withAlpha(ctx, pt, () => {
    ctx.save(); ctx.translate(dir * (1 - pt) * -12, 0);
    let x = end[0] + dir * 14; const y = end[1];
    if (num != null) { const r = size * 0.62; badge(ctx, num, x + dir * r, y, 1, { r, fill: color }); x += dir * (2 * r + 12); }
    const align = dir > 0 ? 'left' : 'right';
    text(ctx, str, x, y, { size, weight: 600, align, track: 1 });
    if (sub) text(ctx, sub, x, y + size * 0.62 + subSize * 0.7, { size: subSize, weight: 400, family: TYPE.sans, color: PAL.inkSoft, align, alpha: subAlpha });
    ctx.restore();
  });
}

// Chemical formula with automatic subscripts: 'CH4', '2O2', '2H2O', 'Ca(OH)2'.
// A digit is a subscript when it follows a letter, ')' or another subscript digit.
function tokens(str) {
  const out = []; let prevSub = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], prev = str[i - 1] || '';
    const sub = /[0-9]/.test(ch) && (/[A-Za-z)]/.test(prev) || (prevSub && /[0-9]/.test(prev)));
    out.push({ ch, sub }); prevSub = sub;
  }
  return out;
}
export function formula(ctx, str, x, y, { size = TYPE.formula, color = PAL.ink, align = 'center', weight = 600, alpha = 1, family = TYPE.display } = {}) {
  const tk = tokens(str), ss = size * 0.6;
  // thin gap after a leading coefficient ('2O2' -> '2 O₂')
  const lead = (str.match(/^[0-9]+/) || [''])[0].length;
  if (lead && lead < tk.length) tk[lead - 1].gap = size * 0.08;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  const wOf = (t) => { ctx.font = `${weight} ${t.sub ? ss : size}px ${family}`; return ctx.measureText(t.ch).width + (t.gap || 0); };
  const W = tk.reduce((s, t) => s + wOf(t), 0);
  let cx = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  const base = y + size * 0.35; // y is the visual middle of the capitals
  for (const t of tk) {
    ctx.font = `${weight} ${t.sub ? ss : size}px ${family}`;
    ctx.fillText(t.ch, cx, t.sub ? base + size * 0.18 : base); cx += ctx.measureText(t.ch).width + (t.gap || 0);
  }
  ctx.restore(); return W;
}

// pill: flat rounded label on an accent (use for one key takeaway per scene, max)
export function pill(ctx, str, x, y, p = 1, { fill = PAL.coral, color = PAL.white, size = TYPE.body, padX = 26, h = null } = {}) {
  const w = measure(ctx, str, { size, weight: 600, track: 1.5 }) + padX * 2, hh = h ?? size * 1.9;
  pop(ctx, x, y, p, () => {
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2); ctx.fillStyle = fill; ctx.fill();
    text(ctx, str, x, y + 1, { size, color, align: 'center', track: 1.5 });
  });
  return w;
}
