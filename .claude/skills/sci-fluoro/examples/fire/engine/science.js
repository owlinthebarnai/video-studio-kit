// Molecules as fluorescent blobs. Atom colour = channel: C yellow, H green, O cyan, N magenta.
// (Keep magenta free for heat/energy in most scenes; re-map ATOM per video if the story needs it.)
import { blob, dot, glowStroke, group } from './glow.js';
import { noise1 } from './ease.js';

export const ATOM = { C: { ch: 'yellow', r: 30 }, H: { ch: 'green', r: 18 }, O: { ch: 'cyan', r: 27 }, N: { ch: 'magenta', r: 28 } };
// local geometry in px at s = 1: [element, x, y]; bonds as index pairs
export const MOL = {
  CH4: { atoms: [['C', 0, 0], ['H', -44, -30], ['H', 44, -30], ['H', -26, 46], ['H', 30, 40]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  O2:  { atoms: [['O', -25, 0], ['O', 25, 0]], bonds: [[0, 1]] },
  CO2: { atoms: [['O', -54, 0], ['C', 0, 0], ['O', 54, 0]], bonds: [[0, 1], [1, 2]] },
  H2O: { atoms: [['O', 0, -6], ['H', -36, 24], ['H', 36, 24]], bonds: [[0, 1], [0, 2]] },
  N2:  { atoms: [['N', -24, 0], ['N', 24, 0]], bonds: [[0, 1]] },
};

// molecule(ctx, 'CH4', x, y, t, { s, a, rot, seed, vib }) — vib = thermal jitter in px (raise it when hot)
export function molecule(ctx, name, x, y, t, { s = 1, a = 1, rot = 0, seed = 1, vib = 2.5 } = {}) {
  const M = MOL[name]; if (!M || a <= 0.003) return;
  group(ctx, { x, y, rot, s, a }, () => {
    const pos = M.atoms.map(([el, ax, ay], i) => { const n = noise1(seed * 41 + i); return [ax + n(t * 3) * vib, ay + n(t * 3 + 17) * vib]; });
    for (const [i, j] of M.bonds) {
      const [p, q] = [pos[i], pos[j]], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      glowStroke(ctx, [p, m], ATOM[M.atoms[i][0]].ch, { a: 0.55, lw: 3, halo: 12 });
      glowStroke(ctx, [m, q], ATOM[M.atoms[j][0]].ch, { a: 0.55, lw: 3, halo: 12 });
    }
    M.atoms.forEach(([el], i) => {
      const A = ATOM[el];
      blob(ctx, pos[i][0], pos[i][1], A.r * 1.5, A.ch, { a: 0.75, seed: seed * 7 + i, t, amp: 0.1 });
      dot(ctx, pos[i][0], pos[i][1], A.r * 1.1, A.ch, 0.9, 'core');
    });
  });
}
