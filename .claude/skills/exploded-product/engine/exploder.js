// exploder.js: the generic exploded-view placer. Pure function of t.
//
// const ex = exploder([
//   { object: crystal, dir: [0, 1, 0], dist: 3.5, delay: 0.0 },   // delay is seconds after the explode start
//   { object: crown,   dir: [1, 0, 0], dist: 0.6, delay: 0.3, also: [{ dir: [0,1,0], dist: 1.5 }], spin: [0.5, 0, 0] },
// ], { out: [1.5, 3.5], back: null, ease: 'inOutCubic' });
// ex.update(t)   // places every part; returns overall progress 0..1
//
// Each part: object (Object3D, its current position is the assembled pose), dir (unit-ish vector, in the
// parent's space), dist, delay (s), dur (s, default = fits inside the window), ease, spin ([rx,ry,rz] radians
// added at full explode), also (extra {dir, dist} offsets moved with the same progress).
// Options: out: [a, b] explode window; back: [a, b] optional reassemble window (parts return in reverse order).
import * as THREE from '/_vendor/three.module.js';
import { invLerp, E } from './core.js';

export function exploder(parts, { out = [1.5, 3.5], back = null, ease = 'inOutCubic', defaultDur = null } = {}) {
  const maxDelay = Math.max(0, ...parts.map((p) => p.delay || 0));
  const items = parts.map((p) => {
    const span = out[1] - out[0];
    const dur = p.dur ?? defaultDur ?? Math.max(span - maxDelay, span * 0.35);
    const offs = [{ dir: p.dir, dist: p.dist }, ...(p.also || [])].map((o) => new THREE.Vector3(...o.dir).normalize().multiplyScalar(o.dist));
    const off = offs.reduce((a, b) => a.add(b), new THREE.Vector3());
    return { ...p, dur, off, base: p.object.position.clone(), baseRot: p.object.rotation.clone(), e: E(p.ease || ease) };
  });

  // progress of one part at time t (0 assembled .. 1 fully exploded)
  const progress = (it, t) => {
    let k = it.e(invLerp(out[0] + (it.delay || 0), out[0] + (it.delay || 0) + it.dur, t));
    if (back) {
      // reverse order on the way back: last-out returns first
      const bd = maxDelay - (it.delay || 0), bspan = back[1] - back[0], bdur = Math.max(bspan - maxDelay, bspan * 0.35);
      k *= 1 - it.e(invLerp(back[0] + bd, back[0] + bd + bdur, t));
    }
    return k;
  };

  return {
    items,
    progress: (i, t) => progress(items[i], t),
    update(t) {
      let sum = 0;
      for (const it of items) {
        const k = progress(it, t); sum += k;
        it.object.position.copy(it.base).addScaledVector(it.off, k);
        if (it.spin) it.object.rotation.set(it.baseRot.x + it.spin[0] * k, it.baseRot.y + it.spin[1] * k, it.baseRot.z + it.spin[2] * k);
      }
      return items.length ? sum / items.length : 0;
    },
    // world-space bounding box of all parts right now (for framing / contact shadow)
    bounds() { const b = new THREE.Box3(); items.forEach((it) => b.expandByObject(it.object)); return b; },
  };
}

// Helper to build a vertical stack quickly: layers listed bottom -> top get increasing lift and a stagger
// that starts from the top (the cap leaves first), which reads most naturally.
// stack([{ object, lift }...], { dir, stagger }) -> parts for exploder()
export function stackParts(layers, { dir = [0, 1, 0], stagger = 0.09, fromTop = true } = {}) {
  const n = layers.length;
  return layers.map((l, i) => ({ dir, dist: l.lift, delay: l.delay ?? (fromTop ? n - 1 - i : i) * stagger, ...l, object: l.object }));
}
