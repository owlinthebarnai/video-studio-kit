// Sandbox entry for the look pass: renders only src/videos/bridge_world (an isolated copy of the bridge short).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge_world/Bridge";
import { Cube } from "./Cube";
import { Fire } from "./Fire";
import { FireWorld, FIRE_FRAMES } from "./videos/fire_world/FireWorld";

const Root: React.FC = () => <><Composition id="Fire" component={Fire} durationInFrames={150} fps={30} width={1080} height={1920} /><Composition id="Cube" component={Cube} durationInFrames={60} fps={30} width={540} height={960} /><Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} /><Composition id="FireWorld" component={FireWorld} durationInFrames={FIRE_FRAMES} fps={30} width={1920} height={1080} /></>;
registerRoot(Root);
