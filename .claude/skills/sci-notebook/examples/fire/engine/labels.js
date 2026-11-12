// Handwriting: glyph-by-glyph layout with seeded jitter (size, baseline, rotation), revealed left to
// right like a pen (the current glyph is wiped in). Chemistry subscripts with { chem: true }.
import { PAL, TYPE, LW, FONT } from './palette.js';
import { rng, strSeed } from './rand.js';
import { clamp } from './ease.js';
import { stroke } from './ink.js';
import { handLine, handCircle, handRect, curve, add, unit } from './path.js';
import { arrow } from './arrows.js';
import { PACE, writeDur, cue } from './timeline.js';

const fontOf = (weight, size, family) => `${weight} ${size.toFixed(1)}px ${family}`;

// layout only: { glyphs, w, size }
export function layout(ctx, str, { size = TYPE.label, font = FONT.hand, weight = 400, chem = false, track = 0, seed = 0, jitter = 1 } = {}) {
  const r = rng(seed || strSeed(str)), glyphs = []; let x = 0, prev = '', prevSub = false;
  for (const ch of String(str)) {
    const digit = /[0-9]/.test(ch);
    const sub = chem && digit && (prevSub || /[A-Za-z)\]]/.test(prev));
    const s = sub ? size * 0.6 : size * (1 + (r() - 0.5) * 0.06 * jitter);
    ctx.font = fontOf(weight, s, font);
    const w = ctx.measureText(ch).width;
    glyphs.push({ ch, x, s, w, sub, dy: (sub ? size * 0.3 : 0) + (r() - 0.5) * size * 0.06 * jitter, rot: (r() - 0.5) * 0.08 * jitter });
    x += w + track; prev = ch; prevSub = sub;
  }
  return { glyphs, w: Math.max(0, x - track), size };
}

// box of a string as write() would place it: { x0, x1, y, w, h }
export function measure(ctx, str, x, y, o = {}) {
  const L = layout(ctx, str, o), al = o.align || 'left';
  const x0 = x - (al === 'center' ? L.w / 2 : al === 'right' ? L.w : 0);
  return { x0, x1: x0 + L.w, y, w: L.w, h: L.size };
}

// write(ctx, str, x, y, p, opts): y is the vertical middle of lowercase-ish text. Returns the box.
//   heavy: thicken thin fonts (Ink Free) with an ink outline
export function write(ctx, str, x, y, p = 1, o = {}) {
  const { color = PAL.ink, align = 'left', weight = 400, font = FONT.hand, heavy = font === FONT.note, alpha = 1 } = o;
  const L = layout(ctx, str, o), x0 = x - (align === 'center' ? L.w / 2 : align === 'right' ? L.w : 0);
  const box = { x0, x1: x0 + L.w, y, w: L.w, h: L.size };
  if (p <= 0) return box;
  const n = L.glyphs.filter((g) => g.ch !== ' ').length, k = clamp(p) * n;
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let i = 0;
  for (const g of L.glyphs) {
    if (g.ch === ' ') continue;
    const f = clamp(k - i); i++; if (f <= 0) break;
    const gx = x0 + g.x, gy = y + g.dy;
    ctx.save();
    if (f < 1) { ctx.beginPath(); ctx.rect(gx - 6, gy - g.s * 1.2, (g.w + 12) * f, g.s * 2.4); ctx.clip(); }
    ctx.translate(gx + g.w / 2, gy); ctx.rotate(g.rot); ctx.font = fontOf(weight, g.s, font);
    ctx.fillText(g.ch, -g.w / 2, 0);
    if (heavy) { ctx.lineWidth = g.s * 0.035; ctx.strokeText(g.ch, -g.w / 2, 0); }
    ctx.restore();
  }
  ctx.restore();
  return box;
}

// time-based write: starts at `at`, takes writeDur(str) (or o.dur). Returns { box, end }.
export function writeAt(ctx, t, at, str, x, y, o = {}) {
  const d = o.dur ?? writeDur(str, o.cps);
  return { box: write(ctx, str, x, y, cue(t, at, d, (u) => u), o), end: at + d };
}

export function underline(ctx, box, p, { seed = 4, lw = LW.second, dy = 0.62, double = false } = {}) {
  const y = box.y + box.h * dy;
  stroke(ctx, handLine([box.x0 - 6, y + 2], [box.x1 + 10, y - 2], seed, { bow: 0.01 }), double ? clamp(p * 2) : p, { lw, seed });
  if (double) stroke(ctx, handLine([box.x0 + 4, y + 11], [box.x1 + 2, y + 8], seed + 1, { bow: 0.01 }), clamp(p * 2 - 1), { lw: lw * 0.8, seed: seed + 1 });
}

// geometry of the frame around a (multi-line) text box: ellipses must clear the text's corners
export function frameGeom(box, pad = 16, shape = 'ellipse') {
  const H = box.lines ? box.lines * box.lead : box.h;
  const cx = (box.x0 + box.x1) / 2, cy = box.y + (box.lines ? (box.lines - 1) * box.lead / 2 : 0);
  return shape === 'box' ? { cx, cy, rx: box.w / 2 + pad, ry: H / 2 + pad * 0.5 }
    : { cx, cy, rx: (box.w / 2) * 1.18 + pad, ry: (H / 2) * 1.3 + pad * 0.5 };
}

// circle (ellipse) or box drawn around a text box
export function circleBox(ctx, box, p, { pad = 16, seed = 6, lw = LW.second, shape = 'ellipse' } = {}) {
  const g = frameGeom(box, pad, shape);
  if (shape === 'box') return stroke(ctx, handRect(g.cx - g.rx, g.cy - g.ry, g.rx * 2, g.ry * 2, seed, { over: 7 }).flat(), p, { lw, seed });
  return stroke(ctx, handCircle(g.cx, g.cy, g.rx, g.ry, seed), p, { lw, seed });
}

// A margin note: lines written one after another, optional ellipse/box around them, optional arrow to a
// target point. note(ctx, t, at, ['wood ignites', '~300 °C'], x, y, { frame: 'ellipse', to: [x, y] })
// Returns { end, box }.
export function note(ctx, t, at, lines, x, y, o = {}) {
  const { size = TYPE.note, font = FONT.note, lead = 1.18, frame = 'ellipse', pad = 16, to = null, bend = 0.25, seed = 11, align = 'left', lw = LW.fine } = o;
  let tt = at; const box = { x0: Infinity, x1: -Infinity, y, w: 0, h: size, lines: lines.length, lead: size * lead };
  lines.forEach((ln, i) => {
    const r = writeAt(ctx, t, tt, ln, x, y + i * size * lead, { size, font, seed: seed + i * 7, align });
    box.x0 = Math.min(box.x0, r.box.x0); box.x1 = Math.max(box.x1, r.box.x1); tt = r.end + PACE.gap;
  });
  box.w = box.x1 - box.x0;
  const { cx, cy, rx, ry } = frameGeom(box, pad, frame || 'ellipse');
  if (frame) { circleBox(ctx, box, cue(t, tt, PACE.circle), { pad, seed: seed + 3, lw, shape: frame }); tt += PACE.circle + PACE.gap; }
  if (to) {
    const ang = Math.atan2((to[1] - cy) / ry, (to[0] - cx) / rx);
    const s = [cx + Math.cos(ang) * rx * 1.04, cy + Math.sin(ang) * ry * 1.06], u = unit(s, to);
    const ta = frame ? tt - PACE.circle * 0.4 : tt; // the arrow leaves while the circle closes
    arrow(ctx, curve(s, add(to, u, -8), bend), cue(t, ta, PACE.arrow, (v) => v), { lw, seed: seed + 5, head: 18 });
    tt = ta + PACE.arrow;
  }
  return { end: tt, box };
}

// circled number for a section: (1) friction
export function section(ctx, t, at, num, title, x, y, { size = 38, seed = 70 } = {}) {
  const r = size * 0.62;
  const p1 = cue(t, at, 0.12, (u) => u);
  write(ctx, String(num), x, y, p1, { size: size * 0.9, weight: 700, align: 'center', seed });
  stroke(ctx, handCircle(x, y + 1, r, r * 0.95, seed, { over: 0.1 }), cue(t, at + 0.08, 0.2), { lw: LW.fine, seed });
  const w = writeAt(ctx, t, at + 0.22, title, x + r + 16, y, { size, weight: 700, seed: seed + 1 });
  return { end: w.end, box: w.box };
}

// A hand-written equation. Tokens split on spaces; '->' is drawn as a hand arrow; digits right after a
// letter are subscripts (CH4, 2H2O). Returns { boxes: [{ tok, x0, x1, y, w, h, a, b }], end } so scenes
// can highlight / brace / point at individual terms (boxes[i] = i-th token, '+' included).
export function equationAt(ctx, t, at, str, x, y, { size = TYPE.eq, gap = size * 0.3, cps = 40, seed = 200 } = {}) {
  let cx = x, tt = at; const boxes = [];
  str.split(/\s+/).forEach((tok, i) => {
    if (tok === '->' || tok === '→') {
      const L = size * 1.4, d = 0.2;
      arrow(ctx, [[cx + 4, y + 2], [cx + L - 4, y - 1]], cue(t, tt, d), { lw: LW.main * 0.85, seed: seed + i, head: size * 0.3 });
      boxes.push({ tok, x0: cx, x1: cx + L, y, w: L, h: size, a: tt, b: tt + d }); cx += L + gap; tt += d + PACE.gap * 0.4; return;
    }
    const d = writeDur(tok, cps);
    const b = write(ctx, tok, cx, y, clamp((t - tt) / d), { size, chem: true, seed: seed + 10 + i * 13 });
    boxes.push({ ...b, tok, a: tt, b: tt + d }); cx = b.x1 + gap; tt += d + PACE.gap * 0.4;
  });
  return { boxes, end: tt };
}
