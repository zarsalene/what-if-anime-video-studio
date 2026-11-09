import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/*
  The kit's 3D host: RobotExpressive by Tomás Laulhé (Quaternius), CC0 1.0,
  face morphs by Don McCurdy. File: public/models/robot.glb.
  Animation is seeked from the frame number (mixer.setTime), never from a clock,
  so every render is identical.
*/

export const ANIMS = ["Idle", "Wave", "Yes", "No", "ThumbsUp", "Jump", "Dance", "Walking", "Running", "Sitting", "Standing", "Punch", "Death", "WalkJump"] as const;
export type Anim = (typeof ANIMS)[number];
export const FACES = ["neutral", "surprised", "sad", "angry"] as const;
export type Face = (typeof FACES)[number];

const ONCE: Anim[] = ["Death", "Sitting", "Standing"];
// Measured: the posed robot is 4.46 units tall → ×0.4 ≈ 1.8 m.
const SCALE = 0.4;

let robot: Promise<GLTF> | null = null;
const loadRobot = () => (robot ??= new GLTFLoader().loadAsync(staticFile("models/robot.glb")));

// Call OUTSIDE the <ThreeCanvas> and mount the canvas only once this returns the model:
// the canvas draws only on frame changes, so a model that arrives later would be missing.
export const useRobotModel = () => {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender("Loading models/robot.glb"));
  useEffect(() => {
    loadRobot().then((g) => { setGltf(g); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [handle]);
  return gltf;
};

export const Robot: React.FC<{ gltf: GLTF; anim?: Anim; face?: Face; at?: [number, number, number]; turn?: number }> = ({ gltf, anim = "Idle", face = "neutral", at = [0, 0, 0], turn = 0 }) => {

  const rig = useMemo(() => {
    const scene = clone(gltf.scene);
    const clip = THREE.AnimationClip.findByName(gltf.animations, anim);
    if (!clip) throw new Error(`Robot has no animation "${anim}". Use one of: ${ANIMS.join(", ")}`);
    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(clip);
    if (ONCE.includes(anim)) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    action.play();
    const faces: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.frustumCulled = false; // skinned-mesh bounds follow the bind pose, not the animation; avoid parts popping out
      if (m.morphTargetDictionary) faces.push(m);
    });
    return { scene, mixer, faces };
  }, [gltf, anim]);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  rig.mixer.setTime(frame / fps);
  const k = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  for (const m of rig.faces) {
    for (const [name, i] of Object.entries(m.morphTargetDictionary!)) m.morphTargetInfluences![i] = name.toLowerCase() === face ? k : 0;
  }
  return <primitive object={rig.scene} position={at} rotation={[0, (turn * Math.PI) / 180, 0]} scale={SCALE} />;
};
