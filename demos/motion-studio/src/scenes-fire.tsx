// MOTION REEL style, English "discovery of fire" cut: 3 scenes (night → rub → fire), cued on spoken words.
// Self-contained: reads src/timeline.reel-fire.json (made by `npm run voice` with tools/script.reel-fire.mjs as tools/script.mjs,
// then scene gaps tightened by 15 frames each so the reel runs ~5.3 s).
// Use: Root.tsx → <Composition id="Reel" component={FireReel} durationInFrames={FIRE_TOTAL} fps={30} width={1080} height={1920} />
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, Easing, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { C, Fonts, Grain, clamp, p, backOut, io, lerp, rand, smoothNoise } from "./lib";
import { Particles, Rough, Shader, hex3 } from "./fx";
import bg from "./shaders/bg.shader";
import tlj from "./timeline.reel-fire.json";

// ── timeline helpers (same contract as lib.tsx, bound to the reel-fire timeline)
type Word = [string, number];
type Line = { say: string; cap: string; file: string; from: number; dur: number; lead: number; words: Word[] };
type Scene = { id: string; from: number; to: number; lines: Line[] };
const TL = tlj as unknown as { fps: number; total: number; scenes: Scene[] };
const LINES = TL.scenes.flatMap((s) => s.lines);
const SC = (id: string) => TL.scenes.find((s) => s.id === id)!;
const L = (id: string, i: number) => SC(id).lines[i].from;
const LE = (id: string, i: number) => SC(id).lines[i].from + SC(id).lines[i].dur;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const W = (id: string, i: number, w: string, nth = 0) => {
  const m = SC(id).lines[i].words.filter(([t]) => norm(t).startsWith(w));
  if (!m[nth]) throw new Error(`no word ${w} in ${id}/${i}`); return m[nth][1];
};
export const FIRE_TOTAL = LE("fire", 0) + 32; // hold the fire ~1 s after the last word, then cut

// spoken cue frames
const NIGHT = { one: W("night", 0, "one"), cold: W("night", 0, "cold"), night: W("night", 0, "night") };
const RUB = { two: W("rub", 0, "two"), sticks: W("rub", 0, "sticks"), rub: W("rub", 0, "rub"), faster: W("rub", 0, "faster") };
const FIRE = { then: W("fire", 0, "then"), fire: W("fire", 0, "fire") };
const FIRE_COL = { core: "#fff4c2", hi: "#ffc53a", mid: "#ff7f1e", lo: "#e8381c" };

// rub phase (closed form) and heat 0..1
const rubPhase = (f: number) => f < RUB.rub ? 0 : f < RUB.faster ? (f - RUB.rub) * 0.75 : (RUB.faster - RUB.rub) * 0.75 + (f - RUB.faster) * 1.55;
const heat = (f: number) => f < RUB.rub ? 0 : f < RUB.faster ? 0.35 * clamp((f - RUB.rub) / (RUB.faster - RUB.rub))
  : f < FIRE.fire ? 0.35 + 0.5 * clamp((f - RUB.faster) / (FIRE.fire - RUB.faster)) : 0.85 + 0.15 * p(f, FIRE.fire, 10);
const fireGrow = (f: number) => f < FIRE.then ? 0 : f < FIRE.fire - 2 ? 0.1 * p(f, FIRE.then + 4, 10) : 0.1 + 0.9 * p(f, FIRE.fire - 2, 16, backOut) + 0.08 * p(f, FIRE.fire + 14, 40, io);

// ── voxel caveman: every pixel of the sprite is extruded into CDEPTH cubes (one InstancedMesh)
const CM = [
  ".....hhhhhhhhhh.....",
  "...hhhhhhhhhhhhhh...",
  "..hhhhhhhhhhhhhhhh..",
  "..hssssssssssssssh..",
  "..hsseesssssseessh..",
  "..hsseesssssseessh..",
  "..hssssssnnssssssh..",
  "..hbbbbssssssbbbbh..",
  "...bbbbbbbbbbbbbb...",
  "ssffffffffffffffffss",
  "ssffkffffkffffkfffss",
  ".sffffkffffkffffffs.",
  "...ffffffffffffff...",
  "....ss........ss....",
  "....ss........ss....",
  "...sss........sss...",
];
const CPAL: Record<string, string> = { h: "#2b1a10", s: "#d8a070", n: "#b8784c", e: "#0e0c0a", b: "#3d2414", f: "#b8742f", k: "#5c3615" };
const CDEPTH = 5;
type CVox = { x: number; y: number; z: number; col: THREE.Color; skin: THREE.Color; leg: boolean; eye: boolean };
const CVOX: CVox[] = (() => {
  const out: CVox[] = []; const cols = CM[0].length, rows = CM.length;
  CM.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === ".") return;
    for (let z = 0; z < CDEPTH; z++) {
      const c = ch === "e" && z < CDEPTH - 1 ? "s" : ch;
      out.push({ x: x - cols / 2 + 0.5, y: rows / 2 - y - 0.5, z: z - (CDEPTH - 1) / 2, col: new THREE.Color(CPAL[c]), skin: new THREE.Color(CPAL.s), leg: y >= 13, eye: ch === "e" && z === CDEPTH - 1 });
    }
  }));
  return out;
})();

type CState = { x: number; y: number; s: number; rx?: number; ry?: number; rz?: number; build?: number; hop?: number; blink?: boolean; sticks?: number; rubX?: number; heat?: number };
const tmp = new THREE.Object3D();
const Caveman: React.FC<{ st: CState }> = ({ st }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.9, 0.9, 0.9), []);
  const { x, y, s, rx = 0, ry = 0, rz = 0, build = Infinity, hop = 0, blink, sticks = 0, rubX = 0, heat: h = 0 } = st;
  useLayoutEffect(() => {
    const m = ref.current!;
    CVOX.forEach((v, i) => {
      const r1 = rand(3 + i * 1.7), r2 = rand(3 + i * 3.1), r3 = rand(3 + i * 5.3);
      const dir = new THREE.Vector3(r1 - 0.5, r2 - 0.5, r3 - 0.3).normalize();
      const delay = (r1 * 0.6 + (1 - (v.y + 8) / 16) * 0.4) * 24, t = clamp((build - delay) / 14);
      const k = 1 - Math.pow(1 - t, 3), over = Math.sin(t * Math.PI) * 0.25, far = (1 - k) * (22 + r2 * 26);
      tmp.position.set(v.x + dir.x * far, v.y + dir.y * far, v.z + dir.z * far);
      tmp.rotation.set((1 - k) * r1 * 9, (1 - k) * r2 * 9, 0);
      tmp.scale.setScalar(t <= 0 ? 0 : 1 + over); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, blink && v.eye ? v.skin : v.col);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  const sq = 1 + Math.sin(hop * Math.PI) * 0.12;
  return (
    <group position={[x - 540, 960 - y + Math.sin(hop * Math.PI) * s * 2.2, 0]} rotation={[rx, ry, rz]} scale={[s / Math.sqrt(sq), s * sq, s]}>
      <instancedMesh ref={ref} args={[geo, undefined, CVOX.length]}><meshStandardMaterial roughness={0.7} metalness={0} /></instancedMesh>
      {sticks > 0.01 && <group scale={sticks}>
        <mesh position={[0, -3, 3.4]} rotation={[0, 0, -0.08]}><boxGeometry args={[18, 0.9, 0.9]} /><meshStandardMaterial color="#7a4a22" roughness={0.9} /></mesh>
        <mesh position={[rubX, -2.2, 4.1]} rotation={[0, 0, 0.35]}><boxGeometry args={[10, 0.8, 0.8]} /><meshStandardMaterial color="#9a6030" roughness={0.9} /></mesh>
        <mesh position={[rubX * 0.55, -2.8, 4.2]}><boxGeometry args={[1.1, 1.1, 1.1]} /><meshBasicMaterial color={new THREE.Color("#4a2a14").lerp(new THREE.Color("#ff8a2a"), h)} toneMapped={false} /></mesh>
      </group>}
    </group>
  );
};

// ── voxel fire: columns of cubes, white core → red tips, flickering heights; logs + rising voxel embers
const FCOLS = 13, FROWS = 18, FDEP = 3, FN = FCOLS * FROWS * FDEP, EMB = 28;
const fc = [FIRE_COL.core, FIRE_COL.hi, FIRE_COL.mid, FIRE_COL.lo].map((c) => new THREE.Color(c));
const VoxFire: React.FC<{ x: number; y: number; s: number; grow: number; f: number; logs: number }> = ({ x, y, s, grow, f, logs }) => {
  const ref = useRef<THREE.InstancedMesh>(null), eref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.92, 0.92, 0.92), []);
  useLayoutEffect(() => {
    const m = ref.current!; let i = 0; const col = new THREE.Color();
    for (let c = 0; c < FCOLS; c++) for (let z = 0; z < FDEP; z++) for (let r = 0; r < FROWS; r++) {
      const cx = c - (FCOLS - 1) / 2, zd = Math.abs(z - 1);
      const prof = Math.max(0, 1 - Math.pow(Math.abs(cx) / 7.2, 1.7));
      const H = FROWS * prof * grow * (0.8 + 0.4 * smoothNoise(f, 4, c * 3 + z)) * (zd ? 0.72 : 1);
      const vis = clamp(H - r), t = r / Math.max(H, 1);
      const sway = Math.sin(f * 0.33 + r * 0.55 + cx * 0.8) * 0.45 * (r / FROWS) * Math.min(grow, 1);
      tmp.position.set(cx + sway, r + 0.5, z - 1); tmp.rotation.set(0, 0, sway * 0.15);
      tmp.scale.setScalar(vis > 0 ? (0.5 + 0.5 * vis) * (1 - t * 0.3) : 0); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
      const ix = t < 0.22 ? 0 : t < 0.48 ? 1 : t < 0.75 ? 2 : 3;
      col.copy(fc[Math.min(3, ix + (zd && Math.abs(cx) > 2 ? 1 : 0))]); m.setColorAt(i, col); i++;
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    const e = eref.current!;
    for (let k = 0; k < EMB; k++) {
      const ph = ((f * (0.018 + rand(k * 7) * 0.014) + rand(k)) % 1);
      tmp.position.set((rand(k * 3) - 0.5) * 11 + Math.sin(f * 0.1 + k) * 1.2, 4 + ph * 24, (rand(k * 5) - 0.5) * 3);
      tmp.rotation.set(f * 0.1 + k, f * 0.07, 0); tmp.scale.setScalar(grow > 0.5 ? 0.5 * (1 - ph) : 0); tmp.updateMatrix(); e.setMatrixAt(k, tmp.matrix);
    }
    e.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[x - 540, 960 - y, 0]} scale={[s, s, s]}>
      <instancedMesh ref={ref} args={[geo, undefined, FN]}><meshBasicMaterial toneMapped={false} /></instancedMesh>
      <instancedMesh ref={eref} args={[geo, undefined, EMB]}><meshBasicMaterial color="#ffb347" toneMapped={false} /></instancedMesh>
      <group scale={logs}>
        <mesh position={[0, -0.2, 0.4]} rotation={[0, 0.55, 0.06]}><boxGeometry args={[15, 1.3, 1.3]} /><meshStandardMaterial color="#6b3d1c" roughness={0.9} /></mesh>
        <mesh position={[0, -0.2, 0.4]} rotation={[0, -0.55, -0.06]}><boxGeometry args={[15, 1.3, 1.3]} /><meshStandardMaterial color="#5a3216" roughness={0.9} /></mesh>
      </group>
    </group>
  );
};

// ── where the caveman is in every moment
const FIREX = 590, FIREY = 1165, FIRES = 32;
const cavemanAt = (f: number): CState => {
  const rb = SC("rub"), fr = SC("fire"), blink = f % 80 >= 74;
  if (f < rb.from) { // night: assembles from flying cubes, shivers on "cold"
    const shiver = f >= NIGHT.cold ? smoothNoise(f, 1.6, 4) * 10 : 0;
    return { x: 540 + shiver, y: 1000, s: 26, ry: Math.sin(f / 30) * 0.3 + (1 - p(f, NIGHT.one - 8, 40)) * 2.4, rx: 0.12, build: f - (NIGHT.one - 8), blink };
  }
  if (f < fr.from) { // rub: steps closer, sticks pop in on "two", rubbing speeds up on "faster"
    const k = p(f, rb.from - 2, 14, io), ph = rubPhase(f);
    return { x: 540 + (f >= RUB.faster ? smoothNoise(f, 2, 9) * 6 : 0), y: lerp(1000, 975, k), s: lerp(26, 30, k), rx: 0.12, ry: Math.sin(f / 24) * 0.12, rz: Math.sin(ph) * 0.03,
      sticks: p(f, RUB.two - 2, 12, backOut), rubX: Math.sin(ph) * 3, heat: heat(f), blink };
  }
  // fire: steps aside so the fire is the hero, faces it, hops for joy after "fire"
  const k = p(f, fr.from, 14, io), hp = f > FIRE.fire + 8 ? ((f - FIRE.fire - 8) % 15) / 15 : 0;
  return { x: lerp(540, 200, k), y: lerp(975, 1050, k), s: lerp(30, 13, k), rx: 0.12, ry: lerp(0, 0.55, k), sticks: 1 - k, heat: heat(f), hop: hp, blink };
};

// ── kinetic type: rows of [word, spoken frame, accent colour]; letters drop in from the word's own frame
type KW = [string, number, string?];
const KT: React.FC<{ rows: KW[][]; f: number; y: number; size: number; color?: string; grad?: string; wobble?: number }> = ({ rows, f, y, size, color = C.ink, grad, wobble = 0 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", font: `400 ${size}px Russo`, color, letterSpacing: 3, lineHeight: 1.08, filter: grad ? `drop-shadow(0 0 ${36 + 14 * Math.sin(f / 4)}px #ff6a00)` : undefined }}>
    {rows.map((row, ri) => <div key={ri} style={{ whiteSpace: "pre" }}>{row.map(([w, at, col], wi) => <React.Fragment key={wi}>{wi ? " " : ""}{[...w].map((ch, ci) => {
      const k = p(f, at - 2 + ci * 1.2, 12, backOut), r = (rand(ci + at * 3 + wi) - 0.5) * 50 * (1 - k);
      const wb = wobble ? `skewX(${Math.sin(f / 2.5 + ci) * 8 * wobble}deg) translateY(${Math.sin(f / 1.7 + ci * 2) * 10 * wobble}px)` : "";
      return <span key={ci} style={{ display: "inline-block", transform: `translateY(${(1 - k) * -120}px) rotate(${r}deg) scale(${0.4 + k * 0.6}) ${wb}`, opacity: clamp(k * 2),
        color: grad ? "transparent" : col, backgroundImage: grad, WebkitBackgroundClip: grad ? "text" : undefined, backgroundClip: grad ? "text" : undefined,
        textShadow: grad ? undefined : col ? `0 0 40px ${col}` : "0 8px 30px rgba(0,0,0,0.6)" }}>{ch}</span>;
    })}</React.Fragment>)}</div>)}
  </div>
);
const Micro: React.FC<{ x: number; y: number; t: React.ReactNode; col?: string; align?: "left" | "right" | "center"; size?: number; o?: number }> = ({ x, y, t, col = C.dim, align = "left", size = 24, o = 1 }) =>
  <div style={{ position: "absolute", top: y, ...(align === "right" ? { right: 1080 - x } : align === "center" ? { left: 0, right: 0 } : { left: x }), textAlign: align, font: `700 ${size}px Mono`, color: col, letterSpacing: 2, opacity: o, whiteSpace: "pre" }}>{t}</div>;

// whip in/out of a scene's type layer
const Stage: React.FC<{ id: string; f: number; children: React.ReactNode }> = ({ id, f, children }) => {
  const s = SC(id); if (f < s.from - 2 || f > s.to + 10) return null;
  const a = p(f, s.from - 2, 10), b = p(f, s.to - 2, 10, Easing.in(Easing.cubic));
  const y = (1 - a) * 140 - b * 160, blur = (1 - a) * 18 + b * 22;
  return <AbsoluteFill style={{ transform: `translateY(${y}px) scale(${1 + b * 0.06})`, filter: blur > 0.4 ? `blur(${blur}px)` : undefined, opacity: a * (1 - b) }}>{children}</AbsoluteFill>;
};

// ── 1. NIGHT
const NightFx: React.FC<{ f: number }> = ({ f }) => {
  const o = 1 - p(f, SC("rub").from - 4, 12);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}>
    <div style={{ position: "absolute", left: 140, top: 650, width: 100, height: 100, borderRadius: 60, background: "radial-gradient(circle at 40% 40%, #f4f7ff, #b9c8e8)", boxShadow: "0 0 90px 20px rgba(125,183,255,0.35)", opacity: p(f, NIGHT.night - 4, 14) }} />
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <g style={{ opacity: p(f, NIGHT.night, 14) }}><Rough kind="circle" args={[190, 700, 150]} opts={{ stroke: C.blue, strokeWidth: 3, roughness: 1.8 }} boil={4} seed={6} /></g>
      {Array.from({ length: 70 }, (_, i) => { const sp = 1.2 + rand(i * 9) * 2.6; const yy = ((rand(i * 3) * 1920 + f * sp) % 1980) - 30;
        return <circle key={i} cx={rand(i) * 1080 + Math.sin(f / 20 + i) * 18} cy={yy} r={2 + rand(i * 5) * 4} fill="#dfe9ff" opacity={0.35 + rand(i * 7) * 0.5} />; })}
    </svg>
  </AbsoluteFill>;
};
const NightType: React.FC<{ f: number }> = ({ f }) => <Stage id="night" f={f}>
  <KT f={f} y={250} size={140} rows={[[["ONE", NIGHT.one], ["COLD", NIGHT.cold, C.blue]], [["NIGHT.", NIGHT.night]]]} />
  <Micro x={0} y={580} align="center" size={30} t="40,000 BC  ·  −12°C  ·  NO FIRE" o={p(f, NIGHT.night + 4, 10)} />
</Stage>;

// ── 2. RUB: hard cut on every spoken word
const RubFx: React.FC<{ f: number }> = ({ f }) => {
  const fr = SC("fire").from; if (f < RUB.rub - 2 || f > fr + 14) return null;
  const st = cavemanAt(f), h = heat(f), o = 1 - p(f, fr, 12);
  const kk = 2000 / (2000 - 4.2 * st.s), cx0 = st.x + (st.rubX ?? 0) * 0.55 * st.s, cy0 = st.y + 2.8 * st.s;
  const cx = 540 + (cx0 - 540) * kk, cy = 960 + (cy0 - 960) * kk;
  return <svg width={1080} height={1920} style={{ position: "absolute", opacity: o }}>
    <defs><radialGradient id="hot"><stop offset="0%" stopColor="#ffd27a" stopOpacity={0.95} /><stop offset="45%" stopColor="#ff7a1a" stopOpacity={0.5} /><stop offset="100%" stopColor="#ff4a00" stopOpacity={0} /></radialGradient></defs>
    <circle cx={cx} cy={cy} r={40 + h * 120} fill="url(#hot)" opacity={h * 1.1} />
    {Array.from({ length: 9 }, (_, i) => { const ph = (f - RUB.rub + i * 3.2) / 29; if (ph < 0) return null; const q = ph % 1;
      return <circle key={i} cx={cx + Math.sin(q * 4 + i) * 34 + (rand(i) - 0.5) * 40} cy={cy - 20 - q * 260} r={18 + q * 60} fill="#c9c1b6" opacity={(1 - q) * (0.18 + h * 0.4)} />; })}
    {Array.from({ length: 9 }, (_, j) => <Particles key={j} at={RUB.faster + j * 5} x={cx} y={cy} kind="sparks" n={16} seed={j * 13 + 2} life={20} power={0.7} colors={[FIRE_COL.hi, "#fff", FIRE_COL.mid]} />)}
  </svg>;
};
const RubType: React.FC<{ f: number }> = ({ f }) => <Stage id="rub" f={f}>
  {f < RUB.rub - 2 && <KT f={f} y={230} size={150} rows={[[["TWO", RUB.two]], [["STICKS.", RUB.sticks, C.clay]]]} />}
  {f >= RUB.rub - 2 && f < RUB.faster - 2 && <KT f={f} y={250} size={270} rows={[[["RUB.", RUB.rub, C.clay]]]} />}
  {f >= RUB.faster - 2 && <KT f={f} y={290} size={170} wobble={0.6 + heat(f) * 0.6} rows={[[["FASTER!", RUB.faster, FIRE_COL.hi]]]} />}
  <Micro x={0} y={f < RUB.rub - 2 ? 570 : 560} align="center" size={30} col={f >= RUB.faster ? FIRE_COL.hi : C.dim}
    t={f < RUB.rub - 2 ? "FRICTION  ×0" : `FRICTION  ×${f < RUB.faster ? 1 : 4}   ·   ${Math.round(rubPhase(f) * 2.4)} STROKES`} o={p(f, RUB.two + 4, 8)} />
</Stage>;

// ── 3. FIRE: "THEN:" … hard cut to FIRE, the voxel fire bursts up
const FireType: React.FC<{ f: number }> = ({ f }) => <Stage id="fire" f={f}>
  {f < FIRE.fire - 2 && <KT f={f} y={300} size={150} color={C.dim} rows={[[["THEN:", FIRE.then]]]} />}
  {f >= FIRE.fire - 2 && <div style={{ transform: `scale(${1 + 0.35 * (1 - p(f, FIRE.fire - 2, 10, backOut))})`, transformOrigin: "50% 400px" }}>
    <KT f={f} y={235} size={290} grad="linear-gradient(180deg, #fff6c8 0%, #ffc53a 42%, #ff6a1a 78%, #e8381c 100%)" rows={[[["FIRE", FIRE.fire]]]} /></div>}
  <Micro x={0} y={555} align="center" size={30} col={FIRE_COL.hi} t="DISCOVERED ✓   ·   HUMANITY v2.0" o={p(f, FIRE.fire + 12, 10)} />
</Stage>;

// ── HUD micro-type over the whole reel: corner brackets, REC, timecode, temperature, heat meter
const HUD: React.FC<{ f: number }> = ({ f }) => {
  const h = heat(f), temp = Math.round(-12 + h * 640), lit = f >= FIRE.fire, sc = TL.scenes.findIndex((s) => f >= s.from - 6 && f < s.to) + 1 || 1;
  const id = TL.scenes[Math.max(0, sc - 1)].id.toUpperCase(), tc = `00:00:${String(Math.floor(f / 30)).padStart(2, "0")}:${String(f % 30).padStart(2, "0")}`;
  const hot = h > 0.5 ? FIRE_COL.hi : h > 0 ? C.clay : C.blue, o = p(f, 2, 12);
  const br = (x: number, y: number, dx: number, dy: number) => <path d={`M${x} ${y + dy * 46} L${x} ${y} L${x + dx * 46} ${y}`} stroke="rgba(244,239,232,0.45)" strokeWidth={3} fill="none" />;
  return <AbsoluteFill style={{ opacity: o }}>
    <svg width={1080} height={1920} style={{ position: "absolute" }}>{br(64, 164, 1, 1)}{br(956, 164, -1, 1)}{br(64, 1236, 1, -1)}{br(956, 1236, -1, -1)}
      <rect x={918} y={640} width={18} height={420} rx={4} fill="none" stroke="rgba(244,239,232,0.3)" strokeWidth={2} />
      <rect x={922} y={644 + 412 * (1 - h)} width={10} height={412 * h} rx={3} fill={hot} style={{ filter: `drop-shadow(0 0 8px ${hot})` }} />
      {Array.from({ length: 11 }, (_, i) => <line key={i} x1={902} x2={912} y1={644 + i * 41.2} y2={644 + i * 41.2} stroke="rgba(244,239,232,0.3)" strokeWidth={2} />)}
    </svg>
    <Micro x={84} y={180} col={f % 30 < 18 ? C.red : "rgba(255,90,78,0.4)"} t="●" />
    <Micro x={112} y={180} t="REC  EP.01 / DISCOVERY OF FIRE" col={C.ink} />
    <Micro x={84} y={214} t={`SC 0${sc} · ${id}`} />
    <Micro x={936} y={180} align="right" t={tc} col={C.ink} />
    <Micro x={936} y={214} align="right" t="1080×1920 · 30FPS" />
    <Micro x={936} y={606} align="right" size={20} t="HEAT" />
    <Micro x={84} y={1190} t={`TEMP ${temp > 0 ? "+" : ""}${temp}°C`} col={hot} />
    <Micro x={936} y={1190} align="right" t={lit ? "SPARK: YES" : "SPARK: NO"} col={lit ? FIRE_COL.hi : C.dim} />
  </AbsoluteFill>;
};

// karaoke captions (same look as lib.tsx), groups of ≤4 words, current word in clay / fire orange
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const l = [...LINES].reverse().find((l) => f >= l.from - 2 && f < l.from + l.dur + 6); if (!l) return null;
  const ws = l.words; let idx = 0; ws.forEach(([, t], i) => { if (f >= t) idx = i; });
  const g0 = Math.floor(idx / 4) * 4, grp = ws.slice(g0, g0 + 4), pop = p(f, ws[g0][1] - 2, 8, backOut), acc = f >= FIRE.then ? FIRE_COL.hi : C.clay;
  return <div style={{ position: "absolute", left: 60, right: 120, top: 1262, display: "flex", justifyContent: "center", transform: `scale(${0.9 + pop * 0.1})`, opacity: pop }}>
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 18px", background: "rgba(8,8,12,0.62)", borderRadius: 26, padding: "10px 26px 14px" }}>
      {grp.map(([w, t], k) => { const on = g0 + k === idx && f >= t; return <span key={k} style={{ font: "800 66px Inter", color: on ? acc : f >= t ? C.ink : "rgba(244,239,232,0.35)", textShadow: "0 6px 24px rgba(0,0,0,0.65)", transform: on ? "translateY(-6px)" : undefined, display: "inline-block" }}>{w}</span>; })}
    </div>
  </div>;
};

// ── background palette per scene: [base, second, glow, amount]
const PALS: Record<string, [string, string, string, number]> = {
  night: ["#04060d", "#0b1830", "#7db7ff", 0.3], rub: ["#090605", "#24140b", "#D9774F", 0.45], fire: ["#0c0403", "#3a1005", "#ff7a1a", 0.95],
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

type Fx = [number, string, number, number?];
const SFX: Fx[] = [
  [0, "riser-cine", 0.25, 46], [NIGHT.one - 3, "swoosh-slow", 0.4], [NIGHT.cold, "sand-swish", 0.45, 46], [NIGHT.night, "hit-blow", 0.3],
  [SC("rub").from - 4, "air-woosh-quick", 0.5], [RUB.two, "hit-blow", 0.35], [RUB.sticks, "bass-hit-short", 0.4], [RUB.rub - 1, "bass-hit-short", 0.55],
  ...Array.from({ length: 8 }, (_, i): Fx => [RUB.rub + i * 4, "paper-slide", 0.32, 8]).filter(([a]) => a < RUB.faster),
  [RUB.faster - 2, "zoom-air-fast", 0.5], ...Array.from({ length: 16 }, (_, i): Fx => [RUB.faster + i * 2.6, "paper-slide", 0.3, 6]).filter(([a]) => a < FIRE.then),
  [FIRE.then - 4, "air-woosh-quick", 0.45], [FIRE.then + 2, "clock-tick-single", 0.4, 8],
  [FIRE.fire - 3, "impact-cine-big", 0.65], [FIRE.fire - 2, "whoosh-big", 0.55], [FIRE.fire + 4, "sparkle", 0.45], [FIRE.fire + 10, "sand-swish", 0.35, 50],
];

export const FireReel: React.FC = () => {
  const f = useCurrentFrame();
  const sc = [...TL.scenes].reverse().find((s) => f >= s.from - 6) ?? TL.scenes[0];
  const prev = TL.scenes[Math.max(0, TL.scenes.indexOf(sc) - 1)];
  const t = clamp((f - sc.from + 6) / 14), A = PALS[prev.id], B = PALS[sc.id];
  const g = fireGrow(f), flick = g > 0.3 ? smoothNoise(f, 3, 7) * 0.25 : 0;
  const u = { u_a: mix(hex3(A[0]), hex3(B[0]), t), u_b: mix(hex3(A[1]), hex3(B[1]), t), u_c: mix(hex3(A[2]), hex3(B[2]), t), u_glow: A[3] + (B[3] - A[3]) * t + flick, u_pulse: Math.pow(1 - ((f / 30 * 2.5) % 1), 3) };
  const shake = f >= FIRE.fire - 2 && f < FIRE.fire + 14 ? 1 - (f - FIRE.fire + 2) / 16 : f >= RUB.faster && f < FIRE.then ? 0.22 : [RUB.rub, NIGHT.night].some((w) => f >= w && f < w + 5) ? 0.3 : 0;
  const sx = smoothNoise(f, 1.5, 1) * 44 * shake, sy = smoothNoise(f, 1.5, 2) * 44 * shake;
  const flash = Math.max(interpolate(f, [FIRE.fire - 3, FIRE.fire - 1, FIRE.fire + 9], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    ...[RUB.two, RUB.rub, RUB.faster, FIRE.then].map((w) => interpolate(f, [w - 2, w, w + 5], [0, 0.14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const night = f < SC("rub").from, cs = cavemanAt(f), inFire = f >= SC("fire").from - 2;
  const speech = LINES.map((l) => [l.from - 4, l.from + l.dur + 4]);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Fonts />
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${1 + shake * 0.035})` }}>
        <Shader frag={bg} uniforms={u} />
        <NightFx f={f} />
        {inFire && <div style={{ position: "absolute", left: FIREX - 520, top: FIREY - 860, width: 1040, height: 1040, borderRadius: 520, background: "radial-gradient(circle, rgba(255,140,40,0.55) 0%, rgba(255,90,20,0.22) 40%, rgba(255,60,0,0) 70%)", opacity: clamp(g) * (0.85 + flick) }} />}
        <AbsoluteFill>
          <ThreeCanvas width={1080} height={1920} camera={{ fov: 2 * Math.atan(960 / 2000) * 180 / Math.PI, position: [0, 0, 2000], near: 10, far: 8000 }}>
            <ambientLight intensity={night ? 0.55 : 0.7} color={night ? "#9fb8ff" : "#ffffff"} />
            <directionalLight position={[-600, 900, 1200]} intensity={night ? 1.8 : 2.2} color={night ? "#bcd0ff" : "#fff0e0"} />
            <directionalLight position={[700, -300, 600]} intensity={0.7} color="#ffb48a" />
            {inFire && <pointLight position={[FIREX - 540, 960 - FIREY + 250, 300]} intensity={3.2 * clamp(g)} decay={0} color="#ff9a4a" />}
            <Caveman st={cs} />
            {inFire && <VoxFire x={FIREX} y={FIREY} s={FIRES} grow={g} f={f} logs={p(f, FIRE.then - 2, 12, backOut)} />}
          </ThreeCanvas>
        </AbsoluteFill>
        <RubFx f={f} />
        {inFire && <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <Particles at={FIRE.fire} x={FIREX} y={FIREY - 260} kind="sparks" n={70} seed={5} life={34} power={1.7} colors={[FIRE_COL.core, FIRE_COL.hi, FIRE_COL.mid]} />
          {[0, 1, 2].map((j) => <Particles key={j} at={FIRE.fire + 4 + j * 14} x={FIREX} y={FIREY - 300} kind="embers" n={26} seed={20 + j} life={60} power={0.6} colors={[FIRE_COL.hi, FIRE_COL.mid, "#fff"]} />)}
        </svg>}
        <NightType f={f} /><RubType f={f} /><FireType f={f} />
        <HUD f={f} />
        <Captions f={f} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: f >= FIRE.fire - 3 ? "#fff1d6" : "#fff", opacity: flash }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
      <Grain f={f} />
      <Audio src={staticFile("music-reel-fire.mp3")} volume={(fr) => (fr > FIRE_TOTAL - 14 ? interpolate(fr, [FIRE_TOTAL - 14, FIRE_TOTAL], [0.3, 0]) : speech.some(([a, b]) => fr >= a && fr <= b) ? 0.13 : 0.3)} />
      {LINES.map((l) => <Sequence key={l.file} from={Math.max(0, l.from - Math.round(l.lead * 30))}><Audio src={staticFile(l.file)} /></Sequence>)}
      {SFX.map(([at, n, v, len], k) => <Sequence key={k} from={Math.max(0, Math.round(at))} durationInFrames={len ?? 80}><Audio src={staticFile(`sfx/${n}.mp3`)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
