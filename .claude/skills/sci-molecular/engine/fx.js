// fx.js: deterministic particle effects. No state carried between frames: every particle is a pure function of
// (t, seed, index), so any frame renders identically in any order.
//   flame()  layered additive tongues + core + halo + warm point light
//   sparks() ballistic embers from an origin       smoke()  soft rising wisps       airField() out-of-focus background molecules
import * as THREE from '/_vendor/three.module.js';
import { PAL } from './palette.js';
import { seeded, frac, noise1, lerp, clamp } from './core.js';
import { flameTex, softDotTex } from './textures.js';
import { glowSprite } from './shapes.js';
import { molecule, MOL } from './molecule.js';

let FT, DOT;
const C = (h) => new THREE.Color(h);

// flame(S, { base, seed, tongues }) -> { update(t, { height, width, power, base }) , light }
export function flame(S, { base = [0, 0, 0], seed = 4, tongues = 26, light = true } = {}) {
  FT ||= flameTex(); DOT ||= softDotTex(128, 2.0);
  const r = seeded(seed);
  const parts = Array.from({ length: tongues }, () => ({ s: glowSprite(S, '#fff', { tex: FT }), ph: r(), rate: r.range(1.5, 2.4), x: r.range(-0.5, 0.5), w: r.range(0.5, 0.9), h: r.range(0.45, 0.8), sw: r.range(0, 10) }));
  const core = glowSprite(S, PAL.flameCore, { tex: FT }), body = glowSprite(S, PAL.flameMid, { tex: FT });
  const halo = glowSprite(S, PAL.flameMid), halo2 = glowSprite(S, PAL.flameEdge);
  const L = light ? new THREE.PointLight(PAL.flameMid, 0, 0, 2) : null; if (L) S.scene.add(L);
  const cCore = C(PAL.flameCore), cMid = C(PAL.flameMid), cEdge = C(PAL.flameEdge), tmp = new THREE.Color();
  const update = (t, { height = 2, width = 1, power = 1, base: b = base } = {}) => {
    const on = power > 0.005 && height > 0.01;
    const fl = 1 + 0.06 * noise1(t * 7, seed) + 0.04 * Math.sin(t * 29);
    for (const p of parts) {
      p.s.visible = on; if (!on) continue;
      const u = frac(t * p.rate + p.ph), sway = noise1(t * 1.7 + p.sw, seed) * 0.18 * width * u;
      p.s.position.set(b[0] + p.x * width * 0.55 * (1 - u * 0.75) + sway, b[1] + height * (0.2 + u * 0.62), b[2] + p.x * 0.2);
      p.s.scale.set(width * p.w * (1 - u * 0.6), height * p.h * (1 - u * 0.35), 1);
      tmp.copy(u < 0.35 ? cCore : cMid).lerp(u < 0.35 ? cMid : cEdge, u < 0.35 ? u / 0.35 : (u - 0.35) / 0.65);
      p.s.material.color.copy(tmp); p.s.material.opacity = power * 0.4 * Math.pow(Math.sin(Math.PI * u), 0.8);
    }
    body.visible = core.visible = halo.visible = halo2.visible = on;
    body.position.set(b[0], b[1] + height * 0.42, b[2]); body.scale.set(width * 1.05 * fl, height * 0.95 * fl, 1); body.material.opacity = power * 0.26;
    core.position.set(b[0], b[1] + height * 0.26, b[2] + 0.05); core.scale.set(width * 0.5, height * 0.5 * fl, 1); core.material.opacity = power * 0.55;
    halo.position.set(b[0], b[1] + height * 0.45, b[2] - 0.2); halo.scale.setScalar(height * 2.6 * fl); halo.material.opacity = power * 0.30;
    halo2.position.set(b[0], b[1] + height * 0.5, b[2] - 0.4); halo2.scale.setScalar(height * 5.0); halo2.material.opacity = power * 0.12;
    if (L) { L.position.set(b[0], b[1] + height * 0.45, b[2] + 0.3); L.intensity = power * height * 9 * fl; }
  };
  return { update, light: L };
}

// sparks(S, { seed, count, life, speed, gravity }) -> update(t, { origin, rate (0..1 emission), dir })
export function sparks(S, { seed = 7, count = 24, life = 0.45, speed = 2.2, gravity = -5, size = 0.06, color = PAL.ember } = {}) {
  DOT ||= softDotTex(128, 2.0);
  const r = seeded(seed);
  const ps = Array.from({ length: count }, (_, i) => ({ s: glowSprite(S, color), ph: i / count + r.range(0, 0.5 / count), v: [r.range(-1, 1), r.range(0.3, 1.2), r.range(-0.6, 0.6)], sp: r.range(0.5, 1.2), gate: r() }));
  return (t, { origin = [0, 0, 0], rate = 1, period = 0.9 } = {}) => {
    for (const p of ps) {
      const n = Math.floor(t / period - p.ph), born = (n + p.ph) * period, u = (t - born) / life; // age / life
      const alive = u < 1 && p.gate < rate && born >= 0;
      p.s.visible = alive; if (!alive) continue;
      const dt = u * life, v = speed * p.sp;
      p.s.position.set(origin[0] + p.v[0] * v * dt, origin[1] + p.v[1] * v * dt + 0.5 * gravity * dt * dt, origin[2] + p.v[2] * v * dt);
      p.s.scale.setScalar(size * (1 - u * 0.6)); p.s.material.opacity = (1 - u) * 0.95;
    }
  };
}

// smoke(S, { seed, count }) -> update(t, { origin, amount (0..1), height })
export function smoke(S, { seed = 12, count = 10, color = '#8b8f99' } = {}) {
  DOT ||= softDotTex(128, 1.4);
  const r = seeded(seed);
  const ps = Array.from({ length: count }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color, transparent: true, depthWrite: false, opacity: 0 }));
    s.layers.set(1); S.scene.add(s); return { s, ph: r(), x: r.range(-1, 1), rot: r.range(0, 6) };
  });
  return (t, { origin = [0, 0, 0], amount = 1, height = 1.6, rate = 0.55 } = {}) => {
    for (const p of ps) {
      const u = frac(t * rate + p.ph);
      p.s.visible = amount > 0.01;
      p.s.position.set(origin[0] + p.x * 0.15 + noise1(t + p.rot, 5) * 0.25 * u, origin[1] + u * height, origin[2]);
      p.s.scale.setScalar(0.25 + u * 0.9); p.s.material.opacity = amount * 0.16 * Math.sin(Math.PI * u);
    }
  };
}

// Out-of-focus background molecules (air: mostly N2, some O2). Space-filling, slow drift, fogged + blurred.
// airField(S, { seed, count, box: [[x0,x1],[y0,y1],[z0,z1]], kinds }) -> update(t, opacityIgnored)
export function airField(S, { seed = 21, count = 14, box = [[-14, 14], [-7, 7], [-16, -7]], kinds = ['N2', 'N2', 'N2', 'O2'], style = 1, scale = 0.6 } = {}) {
  const r = seeded(seed);
  const ms = Array.from({ length: count }, (_, i) => {
    const p0 = box.map(([a, b]) => r.range(a, b)), v = [r.range(-0.3, 0.3), r.range(-0.15, 0.15), 0], w = [r.range(-0.4, 0.4), r.range(-0.4, 0.4), r.range(-0.4, 0.4)], rot0 = [r() * 6, r() * 6, r() * 6];
    const m = molecule(S, MOL[kinds[i % kinds.length]](), { style, flashes: false, pose: (t) => ({ pos: p0.map((x, j) => x + v[j] * t), rot: rot0.map((x, j) => x + w[j] * t), scale }) });
    return m;
  });
  return (t) => ms.forEach((m) => m.update(t));
}
