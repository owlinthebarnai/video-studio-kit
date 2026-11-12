import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const Cube: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#202040" }}>
      <ThreeCanvas width={540} height={960} camera={{ fov: 40, position: [0, 0, 6] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[3, 4, 5]} intensity={2} />
        <mesh rotation={[f * 0.05, f * 0.07, 0]}><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#ff7a2a" /></mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
