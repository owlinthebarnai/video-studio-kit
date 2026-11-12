import React from 'react';
import { Hero, poseAt, faceAt, kf, clamp, easeOut, backOut, camT, NightSky, Stars, Moon, Glow, Sparkle, TitleCard, LOOKS, ShotProps } from '../../engine';

const PIP = LOOKS.pipHood;
const GROUND = 820;

// the night hillside: sky, stars, moon, a dark ridge and the ground
const Night: React.FC<{ t: number; warm?: number }> = ({ t, warm = 0 }) => (
  <g>
    <NightSky id="fireSky" horizonY={GROUND - 80} />
    <Stars seed={7} x0={-200} y0={-200} w={2400} h={800} t={t} n={60} o={0.9 - warm * 0.4} />
    <Moon x={1520} y={210} r={46} />
    <path d={`M -400 ${GROUND - 60} Q 300 ${GROUND - 190} 900 ${GROUND - 90} T 2300 ${GROUND - 120} L 2300 1400 L -400 1400 Z`} fill="#1B1830" />
    <rect x={-400} y={GROUND} width={2800} height={700} fill={warm > 0 ? '#3A2A2A' : '#18141F'} />
    <path d={`M -400 ${GROUND} L 2400 ${GROUND}`} stroke="#0D0A12" strokeWidth={6} />
  </g>
);

const Flames: React.FC<{ x: number; y: number; k: number; t: number; s?: number }> = ({ x, y, k, t, s = 1 }) => {
  const f = (i: number) => 1 + 0.12 * Math.sin(t * 0.9 + i * 2) + 0.06 * Math.sin(t * 1.7 + i);
  const tongue = (dx: number, w: number, h: number, c: string, i: number) => {
    const H = h * k * f(i) * s, Wd = w * s, sw = Math.sin(t * 0.5 + i) * 10 * s;
    return <path key={i} d={`M ${x + dx - Wd} ${y} Q ${x + dx - Wd} ${y - H * 0.55} ${x + dx + sw} ${y - H} Q ${x + dx + Wd} ${y - H * 0.55} ${x + dx + Wd} ${y} Z`} fill={c} />;
  };
  return (
    <g>
      <path d={`M ${x - 90 * s} ${y + 6} L ${x + 70 * s} ${y - 40 * s}`} stroke="#5A3A22" strokeWidth={18 * s} strokeLinecap="round" />
      <path d={`M ${x + 90 * s} ${y + 6} L ${x - 70 * s} ${y - 40 * s}`} stroke="#6E4824" strokeWidth={18 * s} strokeLinecap="round" />
      {k > 0.01 ? [tongue(-40, 40, 170, '#E8542A', 0), tongue(44, 40, 190, '#E8542A', 1), tongue(0, 66, 280, '#F28A2E', 2), tongue(0, 34, 160, '#FFD25A', 3)] : null}
      {Array.from({ length: 7 }).map((_, i) => { const a = Math.PI * (0.06 + (i / 6) * 0.88); return <ellipse key={'s' + i} cx={x + Math.cos(a) * 120 * s} cy={y + 10 + Math.sin(a) * 18 * s} rx={26 * s} ry={16 * s} fill="#6A6478" stroke="#0D0A12" strokeWidth={4} />; })}
    </g>
  );
};

// SH1: wide. Pip crouches over two sticks and rubs, the title lands.
export const Sh1: React.FC<ShotProps> = ({ t }) => {
  const rub = Math.sin(t * 1.6) * 16;
  const pose = poseAt(t, [{ f: 0, p: { x: 860, y: GROUND - 8, yaw: 0.6, tilt: 14, legL: { a: 70, b: -110 }, legR: { a: 20, b: -70 }, armL: { a: 70 + rub, b: 20 }, armR: { a: 70 - rub, b: 20 }, look: 0.8 } }]);
  return (
    <g transform={camT(kf(t, [[0, 950], [55, 970]]), 600, kf(t, [[0, 1.55], [55, 1.65]]))}>
      <Night t={t} />
      <Hero look={PIP} pose={{ ...pose, ...faceAt(t, [[0, 'worried']]) }} shadow={0} rimId="rimR" />
      <path d={`M ${1040 + rub * 0.4} ${GROUND - 6} L ${1030 - rub * 0.4} ${GROUND - 150}`} stroke="#8D5B33" strokeWidth={10} strokeLinecap="round" />
      <rect x={960} y={GROUND - 14} width={170} height={16} rx={5} fill="#A4703F" stroke="#0D0A12" strokeWidth={3} />
      <TitleCard t={t} lines={['WHAT IF YOU', 'DISCOVERED FIRE?']} accent="FIRE" accentT={14} y={250} size={80} />
    </g>
  );
};

// SH2: insert. The stick on the board: smoke, then a spark.
export const Sh2: React.FC<ShotProps> = ({ t }) => {
  const rub = Math.sin(t * 1.8) * 14;
  return (
    <g transform={camT(960, 640, 2.4)}>
      <Night t={t + 55} />
      <rect x={860} y={GROUND - 16} width={220} height={20} rx={6} fill="#A4703F" stroke="#0D0A12" strokeWidth={4} />
      <path d={`M ${970 + rub} ${GROUND - 10} L ${955 - rub} ${GROUND - 220}`} stroke="#8D5B33" strokeWidth={14} strokeLinecap="round" />
      {Array.from({ length: 6 }).map((_, i) => { const life = ((t * 0.04) + i / 6) % 1; return <circle key={i} cx={990 + Math.sin(t * 0.2 + i) * 14 + life * 30} cy={GROUND - 20 - life * 200} r={6 + life * 22} fill="#CFC8D6" opacity={0.7 * (1 - life) * clamp(t / 6)} />; })}
      {t > 18 ? <Sparkle x={968} y={GROUND - 14} t={t - 18} s={2.2} /> : null}
      {t > 18 ? <Glow x={968} y={GROUND - 20} r={160 * easeOut(clamp((t - 18) / 8))} kind="warm" o={0.8} /> : null}
    </g>
  );
};

// SH3: wide again. The fire takes, lights everything warm; Pip jumps up and cheers.
export const Sh3: React.FC<ShotProps> = ({ t }) => {
  const k = easeOut(clamp(t / 10));
  const hop = t > 12 ? Math.abs(Math.sin((t - 12) * 0.35)) * 40 : 0;
  const pose = poseAt(t, [
    { f: 0, p: { x: 800, y: GROUND - 8, yaw: 0.4, tilt: 10, legL: { a: 50, b: -90 }, legR: { a: 20, b: -60 }, armL: { a: 40, b: 10 }, armR: { a: 40, b: 10 } } },
    { f: 10, p: { tilt: 0, legL: { a: 5, b: 0 }, legR: { a: -5, b: 0 }, armL: { a: 160, b: -10 }, armR: { a: 160, b: -10 }, squash: -0.1 }, ease: backOut },
  ]);
  return (
    <g transform={camT(kf(t, [[0, 950], [65, 930]]), kf(t, [[0, 600], [65, 580]]), kf(t, [[0, 1.5], [65, 1.6]]))}>
      <Night t={t + 85} warm={k} />
      <Glow x={1080} y={GROUND - 120} r={700 * k} kind="warm" o={0.75} />
      <Flames x={1080} y={GROUND} k={k} t={t} s={1.2} />
      <Hero look={PIP} pose={{ ...pose, y: pose.y - hop, ...faceAt(t, [[0, 'shock'], [10, 'happy']]) }} shadow={0} rimId="rimR" />
    </g>
  );
};
