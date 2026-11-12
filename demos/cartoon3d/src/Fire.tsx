import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";

// A Remotion motion-graphics take on the discovery of fire: springs, interpolate, SVG.
export const Fire: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SPARK = 66;
  const lit = spring({ frame: f - SPARK, fps, config: { damping: 9, mass: 0.8 } });
  const rub = f < SPARK ? Math.sin(f * 1.2) * 14 : 0;
  const joy = spring({ frame: f - SPARK - 20, fps, config: { damping: 12 } });
  const warm = interpolate(f, [SPARK, SPARK + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const flick = (i: number) => 1 + 0.08 * Math.sin(f * 0.6 + i * 2);
  const title = (d: number) => spring({ frame: f - d, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(#0c0b22, ${warm > 0 ? "#5a2230" : "#1c1840"})`, fontFamily: "Inter, sans-serif" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 72%, #ff9a3c 0%, rgba(196,74,42,0.6) 30%, rgba(0,0,0,0) 60%)", opacity: warm }} />
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", color: "#f5e6c8", fontSize: 44, letterSpacing: 14, opacity: title(8) }}>THE DISCOVERY OF</div>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", color: "#ffb347", fontSize: 260, fontWeight: 900, transform: `scale(${lit})`, letterSpacing: -6 }}>FIRE</div>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <rect y={1480} width={1080} height={440} fill="#120f1c" />
        <g transform={`translate(330 ${1480 - joy * 30})`}>
          <path d="M -80 0 Q -100 -150 -20 -215 L 80 -205 Q 120 -120 90 0 Z" fill="#c07a3e" />
          <circle cx={10} cy={-280} r={70} fill="#e3a679" />
          <path d="M -66 -300 Q -40 -380 44 -362 Q 96 -340 76 -290 Q 20 -320 -66 -290 Z" fill="#2e1a10" />
          <path d="M -30 -258 Q 10 -180 76 -252 Q 40 -220 -30 -258 Z" fill="#2e1a10" />
          <circle cx={44} cy={-288} r={8} fill="#111" />
          <g transform={`rotate(${-joy * 120} 50 -190)`}><rect x={50} y={-205 + rub} width={170} height={36} rx={18} fill="#e3a679" /></g>
          <g transform={`rotate(${-joy * 60} 40 -150)`}><rect x={40} y={-160 - rub} width={180} height={36} rx={18} fill="#c98a5c" /></g>
        </g>
        {f < SPARK + 3 ? <g><rect x={480} y={1452} width={220} height={26} rx={8} fill="#a4703f" /><rect x={584 + rub * 0.4} y={1250} width={14} height={210} rx={7} fill="#8d5b33" /></g> : null}
        {f > 20 && f < SPARK + 8 ? [0, 1, 2].map((i) => { const life = ((f - 20) / 40 + i / 3) % 1; return <circle key={i} cx={600 + life * 30} cy={1420 - life * 260} r={14 + life * 30} fill="#cfc8d6" opacity={0.7 * (1 - life)} />; }) : null}
        {f >= SPARK && f < SPARK + 10 ? <path transform={`translate(590 1450) scale(${interpolate(f, [SPARK, SPARK + 10], [1.4, 0])})`} d="M 0 -140 L 22 -22 L 140 0 L 22 22 L 0 140 L -22 22 L -140 0 L -22 -22 Z" fill="#fff3c0" /> : null}
        <g transform={`translate(595 1470) scale(${lit} ${lit})`}>
          <path transform={`scale(1 ${flick(0)})`} d="M -150 0 Q -170 -220 -60 -380 Q -40 -250 0 -230 Q 30 -470 120 -560 Q 130 -360 170 -260 Q 190 -120 150 0 Z" fill="#e8542a" />
          <path transform={`scale(1 ${flick(1)})`} d="M -100 0 Q -110 -170 -30 -290 Q 0 -200 30 -190 Q 50 -340 110 -400 Q 120 -250 120 0 Z" fill="#f28a2e" />
          <path transform={`scale(1 ${flick(2)})`} d="M -55 0 Q -60 -110 0 -200 Q 60 -110 55 0 Z" fill="#ffd25a" />
        </g>
        {[440, 520, 610, 700, 760].map((x, i) => <ellipse key={i} cx={x} cy={1488 + (i % 2) * 12} rx={40} ry={24} fill="#6a6478" />)}
      </svg>
    </AbsoluteFill>
  );
};
