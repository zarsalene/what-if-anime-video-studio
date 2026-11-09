import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { cancelRender, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/*
  The kit's hosts (credits in public/models/CREDITS.md):
  - kid   = public/models/kid.glb   — "Character" by ShaderLoop, Sloyd, CC BY 4.0 (credit required). Static: moves are code.
  - robot = public/models/robot.glb — RobotExpressive by Tomás Laulhé (Quaternius), CC0. Rigged: moves are its clips.
  All motion is computed from the frame number, so every render is identical.
*/

export type Move = "idle" | "look-up" | "happy" | "yes" | "no" | "wave" | "jump" | "dance" | "scared";
export type Face = "neutral" | "surprised" | "sad" | "angry";
export type HostName = "kid" | "robot";

const FILE: Record<HostName, string> = { kid: "models/kid.glb", robot: "models/robot.glb" };
const cache: Partial<Record<HostName, Promise<GLTF>>> = {};

// Call OUTSIDE the <ThreeCanvas>, and mount the canvas only once the model is here:
// the canvas draws only on frame changes, so a model that arrived later would be missing.
export const useHostModel = (host: HostName | "none") => {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => (host === "none" ? null : delayRender(`Loading ${FILE[host]}`)));
  useEffect(() => {
    if (host === "none" || handle === null) return;
    (cache[host] ??= new GLTFLoader().loadAsync(staticFile(FILE[host])))
      .then((g) => { setGltf(g); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [host, handle]);
  return gltf;
};

// ---------- robot: rigged clips ----------
const ROBOT_CLIP: Record<Move, string> = { idle: "Idle", "look-up": "Idle", happy: "ThumbsUp", yes: "Yes", no: "No", wave: "Wave", jump: "Jump", dance: "Dance", scared: "No" };
const ROBOT_SCALE = 0.4; // measured: posed robot is 4.46 units tall → ~1.8 m

const Robot: React.FC<{ gltf: GLTF; move: Move; face: Face }> = ({ gltf, move, face }) => {
  const rig = useMemo(() => {
    const scene = clone(gltf.scene);
    const clip = THREE.AnimationClip.findByName(gltf.animations, ROBOT_CLIP[move])!;
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(clip).play();
    const faces: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.frustumCulled = false; // skinned-mesh bounds follow the bind pose, not the animation; avoid parts popping out
      if (m.morphTargetDictionary) faces.push(m);
    });
    return { scene, mixer, faces };
  }, [gltf, move]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  rig.mixer.setTime(frame / fps);
  const k = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  for (const m of rig.faces) {
    for (const [name, i] of Object.entries(m.morphTargetDictionary!)) m.morphTargetInfluences![i] = name.toLowerCase() === face ? k : 0;
  }
  const lookUp = move === "look-up" ? -0.18 * k : 0;
  return <primitive object={rig.scene} rotation={[lookUp, 0, 0]} scale={ROBOT_SCALE} />;
};

// ---------- kid: static figure, moved by code ----------
const KID_HEIGHT = 1.5;

const kidPose = (move: Move, t: number, enter: number) => {
  const s = Math.sin;
  let y = 0.02 * s(t * 2.2), rx = 0, ry = 0, rz = 0.02 * s(t * 1.1), sy = 1;
  switch (move) {
    case "look-up": rx = -0.3 * enter; break;
    case "happy": y = Math.abs(s(t * 5)) * 0.14; rz = 0.07 * s(t * 5); break;
    case "yes": rx = 0.13 * s(t * 8); break;
    case "no": ry = 0.4 * s(t * 7); break;
    case "wave": rz = 0.14 * s(t * 5); y = Math.abs(s(t * 5)) * 0.04; break;
    case "jump": { const p = Math.abs(s(t * Math.PI * 1.4)); y = p * 0.4; sy = 1 - 0.12 * Math.max(0, 0.25 - p) * 4; break; }
    case "dance": ry = t * 3; y = Math.abs(s(t * 6)) * 0.12; break;
    case "scared": rx = -0.1 * enter; rz = 0.035 * s(t * 40); sy = 0.97; break;
    case "idle": break;
  }
  return { y, rx, ry, rz, sy };
};

const Kid: React.FC<{ gltf: GLTF; move: Move }> = ({ gltf, move }) => {
  const scene = useMemo(() => {
    const c = gltf.scene.clone();
    const box = new THREE.Box3().setFromObject(c); // static mesh: the box is exact
    const k = KID_HEIGHT / (box.max.y - box.min.y);
    const centre = box.getCenter(new THREE.Vector3());
    c.position.set(-centre.x * k, -box.min.y * k, -centre.z * k); // feet on the floor, centred
    c.scale.setScalar(k);
    return c;
  }, [gltf]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const p = kidPose(move, frame / fps, enter);
  return (
    <group position={[0, p.y, 0]} rotation={[p.rx, p.ry, p.rz]} scale={[1, p.sy, 1]}>
      <primitive object={scene} />
    </group>
  );
};

export const Host: React.FC<{ host: HostName; gltf: GLTF; move: Move; face: Face }> = ({ host, gltf, move, face }) =>
  host === "robot" ? <Robot gltf={gltf} move={move} face={face} /> : <Kid gltf={gltf} move={move} />;
