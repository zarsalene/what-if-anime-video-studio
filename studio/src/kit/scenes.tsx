import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS } from "../lib/fonts";
import { Face, Host, HostName, Move, useHostModel } from "./Hosts";
import catalog from "./catalog.json";

/*
  KIT SCENES — the only visuals a storyboard can ask for.
  Allowed props live in catalog.json (shared with make.py and the skill).
  A wrong value stops the render with the list of allowed values.
  Frame: 1080×1920 (Shorts). 1 unit = 1 m, floor at y = 0.
*/

const W = 1080;
const H = 1920;
type SceneName = "Sky" | "Planet" | "StatCard";
type Props = Record<string, unknown>;

// Read one enum prop through the catalog; the first catalog value is the default.
const pick = <T extends string>(scene: SceneName, name: string, p: Props): T => {
  const allowed = (catalog[scene].props as Record<string, unknown>)[name] as string[];
  const value = p[name];
  if (value === undefined) return allowed[0] as T;
  if (!allowed.includes(value as string)) throw new Error(`${scene}.${name}: "${String(value)}" is not allowed. Use one of: ${allowed.join(", ")}`);
  return value as T;
};

const useT = (from = 0, to = 1) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames * from, durationInFrames * to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
};

// ---------- camera ----------
type V3 = [number, number, number];
type CamName = "push-in" | "low-angle" | "orbit" | "close" | "wide" | "still";
const CAM: Record<CamName, { from: V3; to: V3; look: V3; fov: number }> = {
  "push-in": { from: [0, 1.5, 7.5], to: [0, 1.35, 5], look: [0, 1.1, 0], fov: 45 },
  "low-angle": { from: [1.6, 0.35, 4.6], to: [0.9, 0.45, 3.9], look: [0, 2.2, 0], fov: 52 },
  orbit: { from: [-3.2, 1.6, 4.6], to: [3.2, 1.6, 4.6], look: [0, 1, 0], fov: 45 },
  close: { from: [0, 1.4, 3.1], to: [0, 1.4, 2.6], look: [0, 1.2, 0], fov: 40 },
  wide: { from: [0, 2.6, 11], to: [0, 2.3, 9.5], look: [0, 1.5, 0], fov: 48 },
  still: { from: [0, 1.4, 6], to: [0, 1.4, 6], look: [0, 1.1, 0], fov: 45 },
};
const CameraRig: React.FC<{ from: V3; to: V3; look: V3; fov: number }> = ({ from, to, look, fov }) => {
  const { camera } = useThree();
  const t = useT();
  camera.position.set(...(from.map((v, i) => v + (to[i] - v) * t) as V3));
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  camera.lookAt(...look);
  return null;
};

// ---------- shared pieces ----------
const Stage3D: React.FC<{ sky: [string, string]; title?: string; children: React.ReactNode }> = ({ sky, title, children }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 70%)` }}>
    <ThreeCanvas width={W} height={H} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 45, near: 0.1, far: 300 }}>
      {children}
    </ThreeCanvas>
    {title && <Title text={title} />}
  </AbsoluteFill>
);

const Title: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ top: 230, height: 400, alignItems: "center", padding: "0 80px" }}>
      <div style={{ transform: `translateY(${(1 - s) * -40}px)`, opacity: s, fontFamily: SANS, fontWeight: 700, fontSize: 84, lineHeight: 1.08, color: "#fff", textAlign: "center", textTransform: "uppercase", WebkitTextStroke: "12px #0b0f1e", paintOrder: "stroke fill" }}>{text}</div>
    </AbsoluteFill>
  );
};

const Stars: React.FC<{ count?: number; opacity?: number }> = ({ count = 700, opacity = 1 }) => {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = random(`sa${i}`) * Math.PI * 2;
      const e = random(`se${i}`) * Math.PI * 0.48;
      pos.set([Math.cos(a) * Math.cos(e) * 120, Math.sin(e) * 120 - 5, Math.sin(a) * Math.cos(e) * 120], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  return <points geometry={geo}><pointsMaterial color="#ffffff" size={0.55} sizeAttenuation transparent opacity={opacity} fog={false} /></points>;
};

let glowTex: THREE.CanvasTexture | null = null;
const glowTexture = () => {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return (glowTex = new THREE.CanvasTexture(c));
};

const Glow: React.FC<{ at: V3; size: number; color: string; opacity: number }> = ({ at, size, color, opacity }) => (
  <sprite position={at} scale={[size, size, 1]}>
    <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} depthWrite={false} fog={false} />
  </sprite>
);

// ---------- weather & ground ----------
const CANDY = ["#ff496f", "#ffd64d", "#50e6d2", "#b48aff", "#ff9e55", "#7ee06a"];
const R = 40; // hill radius: a big low-poly sphere whose top is the floor
const hillY = (x: number, z: number) => Math.sqrt(Math.max(R * R - x * x - z * z, 0)) - R;

// Falling particles, positions computed from the frame (deterministic, loops every top / speed seconds).
const Fall: React.FC<{ kind: "candy" | "rain"; count: number }> = ({ kind, count }) => {
  const mesh = useMemo(() => {
    const geo = kind === "candy" ? new THREE.CapsuleGeometry(0.07, 0.1, 4, 8) : new THREE.BoxGeometry(0.015, 0.45, 0.015);
    const mat = kind === "candy" ? new THREE.MeshStandardMaterial({ roughness: 0.3 }) : new THREE.MeshBasicMaterial({ color: "#cfe3ff", transparent: true, opacity: 0.45 });
    const m = new THREE.InstancedMesh(geo, mat, count);
    if (kind === "candy") for (let i = 0; i < count; i++) m.setColorAt(i, new THREE.Color(CANDY[i % CANDY.length]));
    m.frustumCulled = false;
    return m;
  }, [kind, count]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = new THREE.Object3D();
  const top = 9;
  for (let i = 0; i < count; i++) {
    const speed = kind === "candy" ? 2.6 + random(`v${i}`) * 1.8 : 14 + random(`v${i}`) * 4;
    d.position.set((random(`x${i}`) - 0.5) * 12, top - ((t * speed + random(`y${i}`) * top) % top), (random(`z${i}`) - 0.5) * 10 - 1);
    if (kind === "candy") d.rotation.set(t * 2 + i, t * 3 + i * 0.7, i);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

const CandyGround: React.FC<{ syrup: boolean }> = ({ syrup }) => {
  const mesh = useMemo(() => {
    const n = 320;
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.07, 0.1, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.3 }), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = random(`ga${i}`) * Math.PI * 2;
      const r = 0.7 + Math.sqrt(random(`gr${i}`)) * 7;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 1;
      d.position.set(x, hillY(x, z) + 0.06, z);
      d.rotation.set(Math.PI / 2, random(`gy${i}`) * 6, 0);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, new THREE.Color(CANDY[i % CANDY.length]));
    }
    return m;
  }, []);
  return (
    <group>
      <primitive object={mesh} />
      {syrup && <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.6, 48]} /><meshStandardMaterial color="#ff6fa8" roughness={0.08} transparent opacity={0.85} /></mesh>}
    </group>
  );
};

const Hill: React.FC<{ ground: string; tree: string; shadow: boolean }> = ({ ground, tree, shadow }) => {
  const trees = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = random(`ta${i}`) * Math.PI * 2;
    const d = 3.5 + random(`td${i}`) * 14;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 3;
    return { x, z, y: hillY(x, z), h: 0.9 + random(`th${i}`) * 1.4, rock: random(`tr${i}`) < 0.25 };
  }), []);
  return (
    <group>
      <mesh position={[0, -R, 0]}><sphereGeometry args={[R, 64, 32]} /><meshStandardMaterial color={ground} flatShading roughness={1} /></mesh>
      {trees.map((t, i) => t.rock ? (
        <mesh key={i} position={[t.x, t.y + 0.15, t.z]} scale={t.h * 0.35}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={ground} flatShading /></mesh>
      ) : (
        <group key={i} position={[t.x, t.y, t.z]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.07, 0.09, 0.4, 6]} /><meshStandardMaterial color="#4a3426" flatShading /></mesh>
          <mesh position={[0, 0.4 + t.h / 2, 0]}><coneGeometry args={[t.h * 0.38, t.h, 7]} /><meshStandardMaterial color={tree} flatShading /></mesh>
        </group>
      ))}
      {shadow && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.6, 32]} /><meshBasicMaterial color="#000" transparent opacity={0.35} /></mesh>}
    </group>
  );
};

// ---------- scene: Sky ----------
type Time = "night" | "day" | "sunset" | "dark";
const LOOK: Record<Time, { sky: [string, string]; ground: string; tree: string; hemi: number; key: string; keyI: number }> = {
  day: { sky: ["#3f8ff0", "#bfe3ff"], ground: "#5d9a55", tree: "#2f6b45", hemi: 1.6, key: "#fff4dc", keyI: 2.6 },
  sunset: { sky: ["#2b2f6b", "#f59a6b"], ground: "#4a5a45", tree: "#2c3f35", hemi: 1.1, key: "#ffb27a", keyI: 2.2 },
  night: { sky: ["#0a1330", "#2c3d72"], ground: "#22364a", tree: "#18303a", hemi: 0.9, key: "#bcd2ff", keyI: 1.8 },
  dark: { sky: ["#020308", "#0a0f1d"], ground: "#0d151d", tree: "#0a1418", hemi: 0.35, key: "#7f8fb0", keyI: 0.5 },
};
const mix = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

export const Sky: React.FC<Props> = (p) => {
  const host = pick<HostName | "none">("Sky", "host", p);
  const move = pick<Move>("Sky", "move", p);
  const face = pick<Face>("Sky", "face", p);
  const time = pick<Time>("Sky", "time", p);
  const moonPick = pick<"auto" | "full" | "fade" | "none">("Sky", "moon", p);
  const weather = pick<"none" | "candy" | "candy-heavy" | "rain">("Sky", "weather", p);
  const ground = pick<"grass" | "candy" | "syrup">("Sky", "ground", p);
  const cam = CAM[pick<CamName>("Sky", "camera", p)];
  const moon = moonPick === "auto" ? (time === "night" ? "full" : "none") : moonPick;
  const fade = useT(0.25, 0.8); // moon "fade": gone by 80% of the shot
  const moonK = moon === "full" ? 1 : moon === "none" ? 0 : 1 - fade;
  // a night without its moon falls to "dark"
  const L = LOOK[time];
  const D = LOOK.dark;
  const k = time === "night" ? 1 - moonK : 0;
  const sky: [string, string] = [mix(L.sky[0], D.sky[0], k), mix(L.sky[1], D.sky[1], k)];
  const moonAt: V3 = [-2.6, 4.4, -16]; // low enough to clear the top title
  const gltf = useHostModel(host);
  if (host !== "none" && !gltf) return null;
  return (
    <Stage3D sky={sky} title={p.title as string | undefined}>
      <CameraRig {...cam} />
      <fog attach="fog" args={[sky[1], 12, 40]} />
      <hemisphereLight args={[sky[1], mix(L.ground, D.ground, k), L.hemi + (D.hemi - L.hemi) * k]} />
      <directionalLight position={[-3, 6, -4]} color={L.key} intensity={L.keyI + (D.keyI - L.keyI) * k} />
      <directionalLight position={[3, 3, 5]} color="#ffffff" intensity={0.9} />
      {(time === "night" || time === "dark") && <Stars opacity={0.5 + 0.5 * (1 - moonK * 0.4)} />}
      {moonK > 0.001 && (
        <group>
          <mesh position={moonAt} scale={0.6 + 0.4 * moonK}><icosahedronGeometry args={[1.15, 2]} /><meshBasicMaterial color="#f6f1df" transparent opacity={moonK} fog={false} /></mesh>
          <Glow at={moonAt} size={9} color="#cfe0ff" opacity={0.55 * moonK} />
        </group>
      )}
      <Hill ground={mix(L.ground, D.ground, k)} tree={mix(L.tree, D.tree, k)} shadow={host !== "none"} />
      {ground !== "grass" && <CandyGround syrup={ground === "syrup"} />}
      {weather === "candy" && <Fall kind="candy" count={160} />}
      {weather === "candy-heavy" && <Fall kind="candy" count={420} />}
      {weather === "rain" && <Fall kind="rain" count={700} />}
      {host !== "none" && gltf && <Host host={host} gltf={gltf} move={move} face={face} />}
    </Stage3D>
  );
};

// ---------- scene: Planet ----------
let earth: THREE.BufferGeometry | null = null;
const earthGeo = () => {
  if (earth) return earth;
  const g = new THREE.IcosahedronGeometry(1.2, 5).toNonIndexed();
  const pos = g.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // one colour per triangle: low-poly look
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const n = Math.sin(x * 3.1 + 1.7) * Math.cos(z * 2.7) + Math.sin(y * 4.3 + z * 1.3) * 0.6 + Math.sin(x * 7 + y * 5) * 0.2;
    if (Math.abs(y) > 1.02) c.set("#f2f6ff");
    else if (n > 0.45) c.set(n > 0.9 ? "#8a7a55" : "#4f9a4c");
    else c.set(n > 0.3 ? "#3d8fd6" : "#2667b8");
    for (let j = 0; j < 3; j++) col.set([c.r, c.g, c.b], (i + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return (earth = g);
};

export const Planet: React.FC<Props> = (p) => {
  const moon = pick<"orbit" | "fade" | "none">("Planet", "moon", p);
  const tides = p.tides === true;
  const wobble = p.wobble === true;
  const frame = useCurrentFrame();
  const fade = useT(0.2, 0.75);
  const wobbleIn = useT(0, 0.3);
  const moonK = moon === "orbit" ? 1 : moon === "none" ? 0 : 1 - fade;
  const a = 0.5 + frame * 0.012;
  const moonAt: V3 = [Math.cos(a) * 2.3, Math.sin(a) * 0.9 + 0.6, Math.sin(a) * 1.6];
  const tilt = ((23.5 + (wobble ? Math.sin(frame * 0.05) * 22 * wobbleIn : 0)) * Math.PI) / 180;
  const bulge = 1 + 0.16 * (0.32 + 0.68 * moonK); // sun-only tide ≈ 1/3 of today's
  return (
    <Stage3D sky={["#03050d", "#0b1230"]} title={p.title as string | undefined}>
      <CameraRig from={[0, 0.4, 12.5]} to={[0, 0.3, 11]} look={[0, 0.2, 0]} fov={40} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-6, 3, 5]} intensity={3} color="#fff6e6" />
      <Stars count={900} />
      <group rotation={[0, 0, -tilt]}>
        <mesh geometry={earthGeo()} rotation={[0, frame * 0.01, 0]}><meshStandardMaterial vertexColors flatShading roughness={0.9} /></mesh>
        {wobble && <mesh><cylinderGeometry args={[0.02, 0.02, 3.6, 6]} /><meshBasicMaterial color="#ffd84d" /></mesh>}
      </group>
      <mesh scale={1.1}><sphereGeometry args={[1.2, 48, 24]} /><meshBasicMaterial color="#6fb7ff" transparent opacity={0.12} side={THREE.BackSide} /></mesh>
      {tides && (
        <mesh rotation={[0, 0, Math.atan2(moonAt[1], moonAt[0])]} scale={[1.04 * bulge, 1.04, 1.04]}><sphereGeometry args={[1.2, 48, 24]} /><meshStandardMaterial color="#4fb3ff" transparent opacity={0.35} /></mesh>
      )}
      {moonK > 0.001 && (
        <group>
          <mesh position={moonAt} scale={0.3 * (0.5 + 0.5 * moonK)}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#cfcabb" flatShading transparent opacity={moonK} /></mesh>
          <Glow at={moonAt} size={1.4} color="#cfe0ff" opacity={0.35 * moonK} />
        </group>
      )}
    </Stage3D>
  );
};

// ---------- scene: StatCard (2D) ----------
export const StatCard: React.FC<Props> = (p) => {
  if (typeof p.value !== "string" || typeof p.label !== "string") throw new Error('StatCard needs props "value" and "label" (text)');
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 11 } });
  const s2 = spring({ frame: frame - 8, fps, config: { damping: 16 } });
  const color = typeof p.color === "string" ? p.color : "#FFD84D";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #1d2d63 0%, #070b1c 70%)", alignItems: "center", justifyContent: "center", fontFamily: SANS, color: "#fff", textAlign: "center" }}>
      {Array.from({ length: 60 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: random(`x${i}`) * W, top: random(`y${i}`) * H, width: 4, height: 4, borderRadius: 2, background: "#fff", opacity: 0.25 + random(`o${i}`) * 0.5 }} />
      ))}
      <div style={{ marginTop: -380, transform: `scale(${s})`, fontSize: p.value.length > 4 ? 200 : 300, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 60px ${color}66` }}>{p.value}</div>
      <div style={{ opacity: s2, transform: `translateY(${(1 - s2) * 30}px)`, fontSize: 78, fontWeight: 700, textTransform: "uppercase", marginTop: 20 }}>{p.label}</div>
      {typeof p.sub === "string" && <div style={{ opacity: s2 * 0.8, fontSize: 46, fontWeight: 600, marginTop: 18, color: "#c9d4ff", padding: "0 90px" }}>{p.sub}</div>}
    </AbsoluteFill>
  );
};

export const SCENES: Record<SceneName, React.FC<Props>> = { Sky, Planet, StatCard };
