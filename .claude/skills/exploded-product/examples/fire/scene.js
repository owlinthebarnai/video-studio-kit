// Exploded view: an original (unbranded) mechanical wristwatch. 5 s, 1920x1080.
// 0-1.5 s assembled watch turns in three-quarter view; 1.5-3.5 s staggered explode up the case axis;
// 3.5-5 s hold with leader-line labels and a slow camera drift.
import * as THREE from '/_vendor/three.module.js';
import { boot } from './engine/page.js';
import { createStudio } from './engine/studio.js';
import { timeline, track, seg, ease, deg, TAU, noise1 } from './engine/core.js';
import { PAL } from './engine/palette.js';
import { dialTex, strapTex, stripesTex } from './engine/textures.js';
import * as M from './engine/materials.js';
import { lathe, bevelCylinder, bevelRing, gear, knurl, spokedWheel, spiral, bentStrip, flatExtrude, mesh, ringOf } from './engine/shapes.js';
import { exploder } from './engine/exploder.js';
import { labelLayer } from './engine/labels.js';

const W = 1920, H = 1080, DUR = 5;
const tl = timeline({ turn: [0, 1.5], explode: [1.5, 3.5], hold: [3.5, 5] });
let S, L, EX, watch, P = {};

// ---------- parts (watch axis = +Y, case back bottom at y = 0, 12 o'clock = -Z, crown = +X) ----------
function buildWatch() {
  const steel = M.brushedSteel({ roughness: 0.27 }), polish = M.polishedSteel(), gold = M.gilt();
  const g = new THREE.Group();

  // CASE BACK: brushed disc with a polished stepped centre and an engraved ring
  const back = new THREE.Group();
  back.add(mesh(bevelCylinder({ r: 0.95, h: 0.08, bevel: 0.025, bevelBottom: 0.05 }), steel));
  back.add(mesh(bevelCylinder({ r: 0.86, h: 0.125, bevel: 0.012 }), M.brushedSteel({ roughness: 0.28 })));
  const step = mesh(bevelCylinder({ r: 0.5, h: 0.012, bevel: 0.006 }), M.brushedSteel({ color: '#d4d7da', roughness: 0.2 })); step.position.y = 0.125; back.add(step);
  const engr = mesh(bevelRing({ rOut: 0.66, rIn: 0.645, h: 0.004, bevel: 0.001 }), M.polishedSteel({ color: '#9aa0a6' })); engr.position.y = 0.125; back.add(engr);
  back.add(ringOf(6, 0.76, () => { const n = mesh(new THREE.BoxGeometry(0.05, 0.01, 0.025), M.lacquer({ color: '#4a4d50' })); n.position.y = 0.122; return n; }, { phase: deg(30) }));
  g.add(back); P.back = back;

  // MOVEMENT: plate with cotes, jewels, a bridge; wheels and balance are separate exploding parts
  const mov = new THREE.Group(); mov.position.y = 0.13;
  mov.add(mesh(bevelCylinder({ r: 0.83, h: 0.06, bevel: 0.012 }), M.plate({ map: stripesTex({ stripes: 10, angle: 0.6 }) })));
  const bridgeShape = new THREE.Shape(); bridgeShape.absarc(0, 0, 0.78, deg(200), deg(320), false); bridgeShape.absarc(0, 0, 0.45, deg(320), deg(200), true);
  const bridge = mesh(flatExtrude(bridgeShape, { h: 0.035, bevel: 0.008 }), M.brushedSteel({ color: '#d0d3d6', roughness: 0.24 })); bridge.position.y = 0.06; mov.add(bridge);
  [[0.0, 0.0], [0.42, -0.3], [-0.1, 0.5], [-0.42, -0.3], [0.5, 0.3], [-0.6, 0.2], [0.15, -0.66]].forEach(([x, z]) => {
    const j = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), M.jewel()); j.position.set(x, 0.07, z); mov.add(j);
    const set = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 24), M.gilt({ roughness: 0.15 })); set.position.set(x, 0.062, z); mov.add(set);
  });
  g.add(mov); P.mov = mov;

  const wheel = (teeth, r, x, z, y, spokes) => {
    const w = new THREE.Group(); w.position.set(x, y, z);
    w.add(mesh(gear({ teeth, r, h: 0.03, hole: 0.02, spokes }), gold));
    const pin = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 16), M.polishedSteel()); pin.position.y = 0.0; w.add(pin);
    const pinion = mesh(gear({ teeth: 8, r: 0.06, h: 0.04, hole: 0 }), M.polishedSteel({ roughness: 0.12 })); pinion.position.y = 0.03; w.add(pinion);
    g.add(w); return w;
  };
  P.wheelA = wheel(64, 0.36, 0.0, 0.0, 0.215, 5);
  P.wheelB = wheel(48, 0.25, 0.48, 0.3, 0.215, 4);
  P.wheelC = wheel(20, 0.15, -0.08, 0.55, 0.215, 0);

  const bal = new THREE.Group(); bal.position.set(-0.42, 0.215, -0.3);
  bal.add(mesh(spokedWheel({ r: 0.27, rim: 0.035, arms: 3, armW: 0.035, hub: 0.045, h: 0.035 }), M.gilt({ color: '#cfae78', roughness: 0.18 })));
  bal.add(ringOf(12, 0.27, () => mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.035, 10), polish), { y: 0.018 }));
  const hs = mesh(spiral({ r0: 0.05, r1: 0.2, turns: 9, tube: 0.0035, y: 0.05 }), M.polishedSteel({ color: '#5f7590', roughness: 0.2 })); bal.add(hs);
  const staff = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12), polish); staff.position.y = 0.03; bal.add(staff);
  g.add(bal); P.balance = bal;

  // CASE: middle with curved lugs, spring bars; the crown and straps ride with it
  const kase = new THREE.Group();
  kase.add(mesh(lathe([[0.9, 0.06], [0.95, 0.06], [0.99, 0.12], [1.005, 0.26], [0.99, 0.42], [0.96, 0.47], [0.9, 0.47], [0.9, 0.0601]]), steel));
  for (const sz of [1, -1]) for (const sx of [1, -1]) {
    const lug = mesh(bentStrip({ length: 0.5, width: 0.15, thick: 0.17, bend: 0.5, round: 0.5 }), steel);
    lug.position.set(sx * 0.58, 0.34, sz * 0.82); lug.rotation.y = sz > 0 ? 0 : Math.PI; kase.add(lug);
  }
  for (const sz of [1, -1]) { const bar = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.08, 12), polish); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.24, sz * 1.18); kase.add(bar); }
  g.add(kase); P.case = kase;

  const crown = new THREE.Group(); // built along +Y then turned to +X
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 12), polish); stem.position.y = 0.0; crown.add(stem);
  const kn = mesh(knurl({ r: 0.115, h: 0.12, flutes: 40 }), M.polishedSteel({ roughness: 0.12 })); kn.position.y = 0.06; crown.add(kn);
  const cap = mesh(bevelCylinder({ r: 0.1, h: 0.025, bevel: 0.01, dome: 0.012 }), polish); cap.position.y = 0.18; crown.add(cap);
  crown.rotation.z = -Math.PI / 2; crown.position.set(0.94, 0.27, 0); g.add(crown); P.crown = crown;

  const strapMat = (stitch) => M.leather({ map: strapTex({ base: '#3b2c24', stitch: '#d8cfc1', stitchOn: stitch }) });
  const mkStrap = (sz, holes) => {
    const s = new THREE.Group(); s.position.set(0, 0.24, sz * 1.18); s.rotation.y = sz > 0 ? 0 : Math.PI;
    const m = mesh(bentStrip({ length: 1.25, width: 0.98, thick: 0.085, bend: 0.85, taper: 0.86, round: 0.4 }), strapMat(true)); s.add(m);
    if (holes) for (let i = 0; i < 4; i++) {
      const z = 0.62 + i * 0.13, R = 1.25 / 0.85, phi = z / R;
      const h = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 14), M.lacquer({ color: '#130e0b', roughness: 0.6 }));
      h.position.set(0, -R + (R + 0.035) * Math.cos(phi), (R + 0.035) * Math.sin(phi)); h.rotation.x = phi; s.add(h);
    }
    g.add(s); return s;
  };
  P.strapA = mkStrap(1, true); P.strapB = mkStrap(-1, false);

  // DIAL: matte slate disc, printed minute track, applied polished indices
  const dial = new THREE.Group(); dial.position.y = 0.4;
  const dg = new THREE.CylinderGeometry(0.885, 0.885, 0.03, 96); dg.translate(0, 0.015, 0); dg.rotateY(Math.PI / 2); // cap UV "up" -> 12 o'clock (-Z)
  const dt = dialTex({ bg: PAL.dial, print: PAL.dialPrint, text: ['AUTOMATIC', 'CAL. 01  ·  21 JEWELS'] });
  dial.add(mesh(dg, [M.matte({ color: PAL.dial }), M.matte({ map: dt }), M.matte({ color: PAL.dial })]));
  dial.add(ringOf(12, 0.66, (i) => {
    const w = i === 0 ? 0.075 : 0.04, b = mesh(new THREE.BoxGeometry(w, 0.022, i % 3 === 0 ? 0.15 : 0.11), M.polishedSteel({ roughness: 0.05 }));
    b.position.y = 0.04; return b;
  }));
  g.add(dial); P.dial = dial;

  // HANDS: dauphine hour/minute, accent seconds with counterweight, polished cannon
  const dauphine = (len, w, tail) => { const s = new THREE.Shape(); s.moveTo(0, -tail); s.lineTo(w / 2, 0); s.lineTo(0, len); s.lineTo(-w / 2, 0); s.closePath(); return s; };
  const hand = (shape, mat, y, ang, hub) => {
    const h = new THREE.Group(); h.position.y = y;
    const m = mesh(flatExtrude(shape, { h: 0.014, bevel: 0.004 }), mat); m.rotation.y = ang; h.add(m);
    h.add(mesh(new THREE.CylinderGeometry(hub, hub, 0.02, 24), M.polishedSteel())); g.add(h); return { h, m };
  };
  P.hour = hand(dauphine(0.46, 0.085, 0.07), M.polishedSteel({ roughness: 0.06 }), 0.465, -((10 + 9 / 60) / 12) * TAU, 0.05);
  P.minute = hand(dauphine(0.72, 0.065, 0.09), M.polishedSteel({ roughness: 0.06 }), 0.49, -(9 / 60) * TAU, 0.04);
  const sec = new THREE.Shape(); sec.moveTo(-0.007, -0.2); sec.lineTo(0.007, -0.2); sec.lineTo(0.004, 0.8); sec.lineTo(-0.004, 0.8); sec.closePath();
  P.second = hand(sec, M.paint({ color: PAL.accent }), 0.515, 0, 0.028);
  const cw = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.014, 20), M.paint({ color: PAL.accent })); cw.position.set(0, 0.0, 0.16); P.second.m.add(cw);

  // BEZEL: polished, sloped top
  const bezel = mesh(lathe([[0.86, 0], [0.995, 0], [1.01, 0.025], [1.0, 0.055], [0.93, 0.085], [0.875, 0.085], [0.86, 0.07], [0.86, 0.0001]]), M.polishedSteel({ roughness: 0.05 }));
  bezel.position.y = 0.47; g.add(bezel); P.bezel = bezel;

  // CRYSTAL: domed sapphire
  const crystal = mesh(bevelCylinder({ r: 0.875, h: 0.03, bevel: 0.012, dome: 0.035 }), M.sapphire(), { cast: false });
  crystal.position.y = 0.53; g.add(crystal); P.crystal = crystal;
  return g;
}

// rim point of a horizontal disc part, on the screen side of the label (keeps anchors on the silhouette)
const _c = new THREE.Vector3(), _r = new THREE.Vector3();
const rim = (obj, r, side, y = 0, inset = 0.92) => () => {
  obj.updateWorldMatrix(true, false); _c.set(0, y, 0).applyMatrix4(obj.matrixWorld);
  _r.setFromMatrixColumn(S.camera.matrixWorld, 0); _r.y = 0; _r.normalize();
  return _c.clone().addScaledVector(_r, side * r * inset);
};

async function setup() {
  S = createStudio({ width: W, height: H, fov: 24, shadowExtent: 7.5 });
  watch = buildWatch(); watch.position.y = 0.55; S.scene.add(watch);

  // explode: everything rides up the case axis; the case back is the datum. Cap leaves first.
  const up = [0, 1, 0];
  EX = exploder([
    { object: P.crystal, dir: up, dist: 3.5, delay: 0.0 },
    { object: P.bezel, dir: up, dist: 3.1, delay: 0.08 },
    { object: P.second.h, dir: up, dist: 2.72, delay: 0.16 },
    { object: P.minute.h, dir: up, dist: 2.6, delay: 0.2 },
    { object: P.hour.h, dir: up, dist: 2.48, delay: 0.24 },
    { object: P.dial, dir: up, dist: 2.1, delay: 0.32 },
    { object: P.case, dir: up, dist: 1.5, delay: 0.42 },
    { object: P.crown, dir: [1, 0, 0], dist: 0.55, also: [{ dir: up, dist: 1.5 }], delay: 0.46, spin: [0, deg(160), 0] },
    { object: P.strapA, dir: [0, 0, 1], dist: 0.5, also: [{ dir: up, dist: 1.5 }], delay: 0.44 },
    { object: P.strapB, dir: [0, 0, -1], dist: 0.5, also: [{ dir: up, dist: 1.5 }], delay: 0.44 },
    { object: P.balance, dir: up, dist: 1.02, delay: 0.52 },
    { object: P.wheelA, dir: up, dist: 0.98, delay: 0.54 },
    { object: P.wheelB, dir: up, dist: 0.9, delay: 0.56 },
    { object: P.wheelC, dir: up, dist: 0.86, delay: 0.58 },
    { object: P.mov, dir: up, dist: 0.5, delay: 0.62 },
  ], { out: tl.cue('explode'), ease: 'inOutCubic' });

  L = labelLayer({ width: W, height: H, columns: [0.27, 0.77], minGap: 58 });
  const at = 3.4, st = 0.09;
  const lab = (i, text, sub, side, anchor) => L.add({ index: String(i + 1).padStart(2, '0'), text, sub, side, anchor, show: at + i * st, fade: 0.55 });
  lab(0, 'CRYSTAL', 'Domed sapphire, AR coated', 'left', rim(P.crystal, 0.875, -1, 0.03));
  lab(1, 'BEZEL', 'Mirror-polished steel', 'right', rim(P.bezel, 1.0, 1, 0.05));
  lab(2, 'HANDS', 'Dauphine, diamond-cut', 'left', rim(P.minute.h, 0.0, -1, 0.01, 1));
  lab(3, 'DIAL', 'Matte lacquer, applied indices', 'right', rim(P.dial, 0.885, 1, 0.03));
  lab(4, 'CROWN', 'Fluted, screw-down', 'right', () => { P.crown.updateWorldMatrix(true, false); return new THREE.Vector3(0, 0.12, 0).applyMatrix4(P.crown.matrixWorld); }).dy = 44;
  lab(5, 'MOVEMENT', 'Automatic calibre, 21 jewels', 'left', rim(P.mov, 0.83, -1, 0.03));
  lab(6, 'CASE BACK', 'Brushed steel, screw-in', 'left', rim(P.back, 0.95, -1, 0.06));
  L.extra((ctx, t, cam, api) => {
    const k = seg(t, 0.2, 0.9, 'outCubic');
    api.header({ title: 'EXPLODED VIEW', meta: 'MECHANICAL WRISTWATCH  ·  40 MM  ·  15 COMPONENTS', x: 0.06, y: 0.9, alpha: k });
    ctx.save(); ctx.globalAlpha = 0.55 * k; ctx.font = `12px Consolas`; ctx.fillStyle = PAL.inkSoft; ctx.textAlign = 'right';
    ctx.fillText('FIG. 01', W * 0.94, H * 0.93); ctx.restore();
  });
}

// camera: close hero three-quarter while assembled; framing is driven by the top part's explode progress
// (so the stack never outruns the frame), then a slow drift through the hold.
const lerp = (a, b, k) => a + (b - a) * k;
function camera(t) {
  const kc = ease.inOutSine(Math.min(1, EX.progress(0, t) * 1.08)); // lead the crystal slightly
  const push = seg(t, 0, 1.5, 'inOutSine'), drift = seg(t, 3.4, 5, 'inOutSine');
  return {
    target: [0, lerp(0.85 + 0.05 * push, 2.3, kc) + 0.05 * drift, 0],
    dist: lerp(7.9 - 0.3 * push, 14.2, kc) - 0.5 * drift,
    el: lerp(30 - 2 * push, 17, kc) + 1.5 * drift + 0.15 * noise1(t * 0.6, 3),
    az: 32 + 1 * kc + 6 * drift,
  };
}

function frame(t) {
  // assembled turn decelerates into the final orientation by the end of the explode
  watch.rotation.y = deg(-40) - deg(80) * (1 - ease.outCubic(seg(t, 0, 3.3)));
  EX.update(t);
  // living details: wheels turn slowly, balance swings, seconds hand sweeps
  P.wheelA.rotation.y = -t * 0.25; P.wheelB.rotation.y = t * 0.42; P.wheelC.rotation.y = -t * 1.1;
  P.balance.rotation.y = 0.5 * Math.sin(t * TAU * 1.0);
  P.second.m.rotation.y = -deg(198) - t * deg(6);
  const k = tl.p('explode', t, 'inOutSine');
  S.contact(0, 0, 1.15 + 0.1 * k, 0.32 - 0.1 * k, 1.5, watch.rotation.y + Math.PI / 2);
  S.aimShadow(0, 1.2, 0);
  S.orbit(camera(t));
  S.render();
  L.draw(t, S.camera);
}

boot({ dur: DUR, setup, frame });
