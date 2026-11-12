// "Discovery of fire": one continuous 5 s shot at night outside a cave (150 f @ 30 fps).
// 0-2 s rub the fire plough, 2-3 s a thin curl of smoke, ~2.9 s spark, 3.2 s the fire bursts up, he jumps up arms high.
import type { Expr } from "./toon";

export const FPS = 30;
export const TOTAL = 150;
export const SMOKE0 = 58;   // first wisp
export const SPARK = 88;    // spark at the plough tip
export const BURST = 96;    // fire bursts up in the pit
export const JOY0 = 100;    // starts to rise
export const JOY1 = 112;    // standing, arms up

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smoother = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * t * (t * (6 * t - 15) + 10); };

/** plough stroke: -1..1, speeding up as he gets close, stops once the fire is up */
export const rubAt = (f: number) => {
  const ph = 0.62 * f + 0.0032 * f * f;
  return Math.sin(ph) * (1 - smooth(BURST - 2, BURST + 4, f));
};
/** smoke amount 0..1 (thin curl, then swallowed by the fire) */
export const smokeAt = (f: number) => smooth(SMOKE0, SMOKE0 + 22, f) * (1 - smooth(BURST + 2, BURST + 16, f));
/** ember glow in the tinder before the burst */
export const emberAt = (f: number) => smooth(70, SPARK, f) * (1 - smooth(BURST, BURST + 6, f));
/** fire size 0..~1.25 (pop with overshoot, then settles) */
export const fireAt = (f: number) => {
  if (f < BURST) return 0;
  const t = f - BURST;
  return smooth(0, 7, t) + 0.28 * Math.sin(Math.PI * clamp01((t - 3) / 14)) * (1 - smooth(14, 22, t)) + 0.04 * smooth(20, 54, t);
};
/** crouch (0) -> standing with both arms up (1) */
export const poseAt = (f: number) => smoother(JOY0, JOY1, f);
/** joyful hops after he is up (metres) */
export const hopAt = (f: number) => (f < JOY1 ? 0 : 0.055 * Math.abs(Math.sin(((f - JOY1) * Math.PI) / 10)) * (1 - smooth(140, 150, f) * 0.5));
export const exprAt = (f: number): Expr => (f < 64 ? "stern" : f < SPARK ? "smile" : f < JOY0 ? "shock" : "laugh");
const LID = [0.5, 1, 1, 0.5];
export const lidAt = (f: number) => {
  for (const s of [24, 61, 97]) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; }
  return 0;
};
