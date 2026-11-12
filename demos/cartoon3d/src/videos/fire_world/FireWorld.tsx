// "Discovery of fire": a 5 s single shot (1920 x 1080, 30 fps, 150 f) in the cartoon-3d-short look: a 2D caveman card
// in a painted low-poly night world (three.js inside Remotion). No post chain: world ink is drawn by inverted hulls
// and tone mapping is the renderer's, so the shot renders the same with inputProps { post: { off: true } }.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { World, loadKit, Kit } from "./world";
import { TOTAL } from "./story";

export const FIRE_FRAMES = TOTAL;

const Inner: React.FC<{ kit: Kit }> = ({ kit }) => {
  const f = useCurrentFrame();
  const { camera, gl, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  world.update(f, camera as THREE.PerspectiveCamera, gl, scene);
  return <primitive object={world.root} dispose={null} />;
};

export const FireWorld: React.FC = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("fire kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return (
    <AbsoluteFill style={{ background: "#0b1030" }}>
      {kit ? (
        <ThreeCanvas width={1920} height={1080} gl={{ antialias: true, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 35, near: 0.1, far: 200 }}>
          <Inner kit={kit} />
        </ThreeCanvas>
      ) : null}
    </AbsoluteFill>
  );
};
