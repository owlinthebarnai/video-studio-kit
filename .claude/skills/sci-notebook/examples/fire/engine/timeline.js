// Timing. Every helper takes absolute time t (s). These paces ARE the style: a quick, confident hand.
import { clamp, E } from './ease.js';

export const PACE = {
  pen: 2200,       // px/s of ink for a draw-on stroke
  minStroke: 0.12, // s, shortest stroke
  maxStroke: 0.5,  // s, longest single stroke
  write: 36,       // characters per second when writing (spaces free)
  arrow: 0.24,     // s, shaft + head
  circle: 0.25,     // s, circling / boxing a note
  hatch: 0.35,     // s, a patch of pencil hatching
  hl: 0.25,        // s, one highlighter swipe
  gap: 0.05,       // s, pen lift between consecutive marks
  breath: 0.25,    // s, minimum pause at the end of a beat
};

export const strokeDur = (len) => clamp(len / PACE.pen, PACE.minStroke, PACE.maxStroke);
export const writeDur = (str, cps = PACE.write) => Math.max(0.06, String(str).replace(/\s/g, '').length / cps);

// progress of a mark that starts at `at` and lasts `dur`; eased with the pen curve by default
export const cue = (t, at, dur, ease = E.pen) => ease(clamp((t - at) / dur));
// linear version (for things that ease internally, or for motion envelopes)
export const lin = (t, at, dur) => clamp((t - at) / dur);
// up-hold-down envelope (0 -> 1 -> 0) for transient things (sparks, motion); not for ink, ink stays
export const env = (t, a, b, fin = 0.15, fout = 0.15) => Math.min(clamp((t - a) / fin), clamp((b - t) / fout));

// plan(): a pen cursor. Marks are queued one after another (or synced) and read back by name.
//   const P = plan(0.1).add('stickA', 0.35).add('stickB', 0.3, { gap: -0.15 }).add('label', writeDur('rub'));
//   P.p(t, 'stickA')  -> eased 0..1     P.a('label') -> start time     P.end -> when the pen is free
export function plan(start = 0) {
  const cues = {}; let cur = start, first = true;
  const api = {
    add(name, dur, { gap = PACE.gap, at = null, sync = null, after = null } = {}) {
      let a;
      if (at != null) a = at;
      else if (sync) a = cues[sync].a + gap;
      else if (after) a = cues[after].a + cues[after].d + gap;
      else a = first ? cur : cur + gap;
      first = false; cues[name] = { a, d: dur }; cur = Math.max(cur, a + dur); return api;
    },
    wait(s) { cur += s; return api; },
    p: (t, name, ease = E.pen) => ease(clamp((t - cues[name].a) / cues[name].d)),
    a: (name) => cues[name].a,
    b: (name) => cues[name].a + cues[name].d,
    get end() { return cur; },
    cues,
  };
  return api;
}

// beats({ friction: [0, 1.5], triangle: [1.5, 3], combustion: [3, 5] })
export function beats(def) {
  const list = Object.entries(def).map(([name, [a, b]], i) => ({ name, a, b, i }));
  const of = (n) => list.find((x) => x.name === n);
  return { list, of, p: (n, t) => { const b = of(n); return clamp((t - b.a) / (b.b - b.a)); }, at: (t) => list.filter((b) => t >= b.a).pop() || list[0] };
}
