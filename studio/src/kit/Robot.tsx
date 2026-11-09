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
const HEIGHT = 1.8; // robot is normalised to ~1.8 m tall

let robot: Promise<GLTF> | null = null;
const loadRobot = () => (robot ??= new GLTFLoader().loadAsync(staticFile("models/robot.glb")));

export const Robot: React.FC<{ anim?: Anim; face?: Face; at?: [number, number, number]; turn?: number }> = ({ anim = "Idle", face = "neutral", at = [0, 0, 0], turn = 0 }) => {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender("Loading models/robot.glb"));
  useEffect(() => {
    loadRobot().then((g) => { setGltf(g); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [handle]);

  const rig = useMemo(() => {
    if (!gltf) return null;
    const scene = clone(gltf.scene);
    const clip = THREE.AnimationClip.findByName(gltf.animations, anim);
    if (!clip) throw new Error(`Robot has no animation "${anim}". Use one of: ${ANIMS.join(", ")}`);
    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(clip);
    if (ONCE.includes(anim)) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    action.play();
    const faces: THREE.Mesh[] = [];
    scene.traverse((o) => { const m = o as THREE.Mesh; if (m.morphTargetDictionary) faces.push(m); });
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    return { scene, mixer, faces, scale: HEIGHT / size.y };
  }, [gltf, anim]);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!rig) return null;
  rig.mixer.setTime(frame / fps);
  const k = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  for (const m of rig.faces) {
    for (const [name, i] of Object.entries(m.morphTargetDictionary!)) m.morphTargetInfluences![i] = name.toLowerCase() === face ? k : 0;
  }
  return <primitive object={rig.scene} position={at} rotation={[0, (turn * Math.PI) / 180, 0]} scale={rig.scale} />;
};
