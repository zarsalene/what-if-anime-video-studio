import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmLook, W, H } from "../lib/Stage";
import { MOODS, Mood, MoodName } from "../lib/palette";

/*
  FULL 3D MODE — the look of the newest films: low-poly, soft-shaded rooms and
  streets like a toy diorama, seen at real angles. Lit low and soft: dim base
  light, one or two warm practical lights doing the storytelling.

  <Scene3D> is the frame for every 3D shot. Units: 1 = about 1 metre.
  The floor is y = 0. An adult puppet is ~1.75 tall.
*/

const moodOf = (m: MoodName | Mood) => (typeof m === "string" ? MOODS[m] : m);

export type Cam = {
  from: [number, number, number]; // camera position at the start of the shot
  to?: [number, number, number]; // …and at the end (slow push, pan, drift). Omit for a still camera.
  look: [number, number, number]; // point the camera looks at (start)
  lookTo?: [number, number, number]; // …and at the end (for pans following a car/runner)
  fov?: number; // 30 = close/telephoto, 45 = normal, 60 = wide
};

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(f, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const lerp = (a: number[], b: number[] | undefined) => (b ? a.map((v, i) => v + (b[i] - v) * t) : a) as [number, number, number];
  const p = lerp(cam.from, cam.to);
  const l = lerp(cam.look, cam.lookTo);
  camera.position.set(...p);
  (camera as THREE.PerspectiveCamera).fov = cam.fov ?? 40;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  camera.lookAt(...l);
  return null;
};

export const Scene3D: React.FC<{
  mood?: MoodName | Mood;
  cam: Cam;
  children: React.ReactNode;
  overlay?: React.ReactNode; // text/UI on top (uses the same Text components as 2D)
  ambient?: number; // base light, keep it dim: 0.25–0.6
  fog?: [number, number]; // fog near/far — adds depth and softens the background
  focus?: number; // 0 = all sharp. 1–3 = blur the edges of the frame (shallow focus feel)
}> = ({ mood = "night", cam, children, overlay, ambient = 0.4, fog = [8, 26], focus = 1.5 }) => {
  const m = moodOf(mood);
  return (
    <AbsoluteFill style={{ backgroundColor: m.skyBottom }}>
      <AbsoluteFill style={{ filter: "saturate(0.85)" }}>
        <ThreeCanvas width={W} height={H} linear={false} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: cam.fov ?? 40, near: 0.1, far: 200 }}>
          <color attach="background" args={[m.skyBottom]} />
          <fog attach="fog" args={[m.skyBottom, fog[0], fog[1]]} />
          <ambientLight intensity={ambient} color="#C9D2E6" />
          <hemisphereLight args={[m.skyTop, m.floor, ambient * 0.6]} />
          <CameraRig cam={cam} />
          {children}
        </ThreeCanvas>
      </AbsoluteFill>
      {focus > 0 && (
        // shallow focus: the edges of the frame go soft, the centre stays sharp
        <AbsoluteFill style={{ backdropFilter: `blur(${focus * 2.5}px)`, WebkitMaskImage: "radial-gradient(ellipse at center, transparent 45%, black 85%)", maskImage: "radial-gradient(ellipse at center, transparent 45%, black 85%)" }} />
      )}
      {overlay}
      <FilmLook />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------
   Soft round textures, made in code (glows, bokeh, contact shadows)
------------------------------------------------------------------------- */
const radialTexture = (inner: string, outer: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
let _soft: THREE.Texture | null = null;
const softTex = () => (_soft ??= radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"));

/* A glowing halo (bloom on a bulb, bokeh in the distance). Always faces the camera. */
export const Glow: React.FC<{ at: [number, number, number]; color: string; size?: number; strength?: number }> = ({ at, color, size = 1, strength = 0.8 }) => {
  const tex = useMemo(softTex, []);
  return (
    <sprite position={at} scale={[size, size, size]}>
      <spriteMaterial map={tex} color={color} transparent opacity={strength} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </sprite>
  );
};

/* Soft dark blob under feet or furniture — the only shadows in this style. */
export const ContactShadow: React.FC<{ at: [number, number]; size?: number; strength?: number }> = ({ at, size = 0.9, strength = 0.55 }) => {
  const tex = useMemo(() => radialTexture("rgba(0,0,0,1)", "rgba(0,0,0,0)"), []);
  return (
    <mesh position={[at[0], 0.005, at[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={strength} depthWrite={false} />
    </mesh>
  );
};

/* Pool of light on the floor under a lamp. */
export const LightPool3D: React.FC<{ at: [number, number]; color: string; size?: number; strength?: number }> = ({ at, color, size = 3, strength = 0.35 }) => {
  const tex = useMemo(softTex, []);
  return (
    <mesh position={[at[0], 0.006, at[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={strength} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

/* ------------------------------------------------------------------------
   Sets: rooms, furniture, lamps, windows
------------------------------------------------------------------------- */
const mat = (color: string, rough = 0.95) => <meshStandardMaterial color={color} roughness={rough} metalness={0} flatShading />;

/* A room corner: floor + back wall + optional left wall. Mid-grey even in daytime. */
export const Room: React.FC<{ mood?: MoodName | Mood; w?: number; d?: number; h?: number; leftWall?: boolean }> = ({ mood = "night", w = 12, d = 9, h = 3.2, leftWall = true }) => {
  const m = moodOf(mood);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[w, d]} />{mat(m.floor)}</mesh>
      <mesh position={[0, h / 2, -d / 2]}><planeGeometry args={[w, h]} />{mat(m.wall)}</mesh>
      {leftWall && <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[d, h]} />{mat(m.wall)}</mesh>}
    </group>
  );
};

/* Open ground for streets, rooftops, hills. */
export const Ground: React.FC<{ color: string; size?: number }> = ({ color, size = 200 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[size, size]} />{mat(color)}</mesh>
);

/* Any piece of furniture / building: a box. Combine boxes for tables, beds, counters, cars. */
export const Block: React.FC<{ at: [number, number, number]; size: [number, number, number]; color: string; rotY?: number; emissive?: string }> = ({ at, size, color, rotY = 0, emissive }) => (
  <mesh position={[at[0], at[1] + size[1] / 2, at[2]]} rotation={[0, (rotY * Math.PI) / 180, 0]}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.95} flatShading emissive={emissive ?? "#000"} emissiveIntensity={emissive ? 1 : 0} />
  </mesh>
);

/* A practical lamp: warm point light + bulb + bloom + floor pool. kind: ceiling | floor | street | desk. */
export const Lamp3D: React.FC<{ at: [number, number]; kind?: "ceiling" | "floor" | "street" | "desk"; color: string; intensity?: number; height?: number }> = ({ at, kind = "ceiling", color, intensity = 1, height }) => {
  const h = height ?? (kind === "street" ? 4 : kind === "ceiling" ? 2.6 : kind === "desk" ? 1.15 : 1.6);
  const [x, z] = at;
  const f = useCurrentFrame();
  const flicker = 1 + Math.sin(f / 13) * 0.015;
  return (
    <group>
      <pointLight position={[x, h - 0.1, z]} color={color} intensity={6 * intensity * flicker} distance={kind === "street" ? 11 : 8} decay={1.6} />
      <mesh position={[x, h, z]}><sphereGeometry args={[0.07, 12, 8]} /><meshBasicMaterial color="#FFF6E2" /></mesh>
      <Glow at={[x, h, z]} color={color} size={kind === "street" ? 2.4 : 1.6} strength={0.75 * intensity} />
      <LightPool3D at={[x, z]} color={color} size={kind === "street" ? 5 : 3.2} strength={0.4 * intensity} />
      {kind === "ceiling" && <><mesh position={[x, h + 0.12, z]}><coneGeometry args={[0.32, 0.25, 16, 1, true]} /><meshStandardMaterial color="#141416" side={THREE.DoubleSide} /></mesh>
        <mesh position={[x, h + 1.5, z]}><cylinderGeometry args={[0.01, 0.01, 2.8]} /><meshBasicMaterial color="#111" /></mesh></>}
      {kind === "street" && <mesh position={[x, h / 2, z]}><cylinderGeometry args={[0.06, 0.08, h]} /><meshStandardMaterial color="#141416" /></mesh>}
      {kind === "floor" && <mesh position={[x, h / 2, z]}><cylinderGeometry args={[0.025, 0.025, h]} /><meshStandardMaterial color="#141416" /></mesh>}
    </group>
  );
};

/* A window: glowing glass panel set into a wall (z = wall position). night: dark blue; day: bright. */
export const Window3D: React.FC<{ at: [number, number, number]; w?: number; h?: number; glass: string; glow?: number }> = ({ at, w = 1.4, h = 1.5, glass, glow = 0.6 }) => (
  <group position={at}>
    <mesh position={[0, 0, 0.01]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={glass} toneMapped={false} /></mesh>
    {[[0, h / 2, w + 0.1, 0.08], [0, -h / 2, w + 0.1, 0.08], [0, 0, 0.06, h]].map(([px, py, sw, sh], i) => (
      <mesh key={i} position={[px, py, 0.02]}><planeGeometry args={[sw, sh]} /><meshBasicMaterial color="#141416" /></mesh>
    ))}
    {[-w / 2, w / 2].map((px, i) => <mesh key={`v${i}`} position={[px, 0, 0.02]}><planeGeometry args={[0.08, h + 0.1]} /><meshBasicMaterial color="#141416" /></mesh>)}
    <pointLight position={[0, 0, 0.8]} color={glass} intensity={glow * 2} distance={5} />
  </group>
);

/* A phone or laptop screen lighting a face from below: cool white-blue light. */
export const ScreenGlow3D: React.FC<{ at: [number, number, number]; color?: string; strength?: number }> = ({ at, color = "#CFE3FF", strength = 1 }) => (
  <group>
    <mesh position={at} rotation={[-0.6, 0, 0]}><planeGeometry args={[0.09, 0.16]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <pointLight position={[at[0], at[1] + 0.05, at[2] + 0.15]} color={color} intensity={2.2 * strength} distance={1.6} decay={1.5} />
    <Glow at={at} color={color} size={0.35} strength={0.5 * strength} />
  </group>
);

/* Rain / snow as instanced streaks in a box around the camera target. */
export const Weather3D: React.FC<{ kind: "rain" | "snow"; center?: [number, number, number]; count?: number }> = ({ kind, center = [0, 0, 0], count = 500 }) => {
  const f = useCurrentFrame();
  const pts = useMemo(() => Array.from({ length: count }).map((_, i) => [((i * 9301 + 49297) % 233280) / 233280, ((i * 4657 + 1234) % 9973) / 9973, ((i * 7919) % 6007) / 6007]), [count]);
  return (
    <group>
      {pts.map(([a, b, c], i) => {
        const fall = kind === "rain" ? 0.35 : 0.02;
        const y = 6 - (((b * 6) + f * fall) % 6);
        const x = center[0] + (a - 0.5) * 14 + (kind === "snow" ? Math.sin(f / 20 + i) * 0.1 : 0);
        const z = center[2] + (c - 0.5) * 10;
        return kind === "rain"
          ? <mesh key={i} position={[x, y, z]}><boxGeometry args={[0.008, 0.28, 0.008]} /><meshBasicMaterial color="#B7C6DA" transparent opacity={0.45} /></mesh>
          : <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.025, 5, 4]} /><meshBasicMaterial color="#F2F4F8" /></mesh>;
      })}
    </group>
  );
};
