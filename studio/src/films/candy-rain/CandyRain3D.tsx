import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";

const W = 1080;
const H = 1920;
const CAMERA_Z = 26.4;
const VIEW_W = 10.8;
const VIEW_H = 19.2;
const COLORS = ["#ff496f", "#ffd64d", "#50e6d2", "#b48aff", "#ff9e55"];
const INK = "#332944";

const beanGeometry = new THREE.SphereGeometry(1, 28, 20);
const dropGeometry = new THREE.SphereGeometry(1, 24, 18);
const beanHighlight = new THREE.SphereGeometry(1, 12, 8);
const ringShape = new THREE.Shape();
ringShape.absarc(0, 0, 0.79, 0, Math.PI * 2, false);
const ringHole = new THREE.Path();
ringHole.absarc(0, 0, 0.34, 0, Math.PI * 2, true);
ringShape.holes.push(ringHole);
const ringGeometry = new THREE.ExtrudeGeometry(ringShape, {
  depth: 0.3,
  bevelEnabled: true,
  bevelSegments: 3,
  steps: 1,
  bevelSize: 0.07,
  bevelThickness: 0.07,
  curveSegments: 28,
});

const Candy: React.FC<{
  shape: "bean" | "gummy" | "ring";
  color: string;
  radius: number;
  rotation: [number, number, number];
}> = ({ shape, color, radius, rotation }) => {
  const material = <meshPhysicalMaterial color={color} roughness={0.19} metalness={0.02} clearcoat={0.9} clearcoatRoughness={0.13} />;
  const outline = <meshBasicMaterial color={INK} side={THREE.BackSide} />;
  if (shape === "ring") {
    return <group rotation={rotation} scale={radius}>
      <mesh scale={1.11} position={[0, 0, -0.03]} geometry={ringGeometry}>{outline}</mesh>
      <mesh position={[0, 0, 0.02]} geometry={ringGeometry}>{material}</mesh>
      <mesh position={[-0.26, 0.35, 0.39]} scale={[0.12, 0.09, 0.035]} geometry={beanHighlight}>
        <meshBasicMaterial color="#fff8e8" transparent opacity={0.88} />
      </mesh>
    </group>;
  }
  if (shape === "gummy") {
    return <group rotation={rotation} scale={radius * 0.92}>
      <mesh position={[0, -0.06, 0]} scale={[0.7, 0.78, 0.64]} geometry={dropGeometry}>{outline}</mesh>
      <mesh position={[0, -0.06, 0.02]} scale={[0.63, 0.71, 0.59]} geometry={dropGeometry}>{material}</mesh>
      <mesh position={[0, 0.59, 0.02]} scale={[0.48, 0.48, 0.48]} geometry={dropGeometry}>{outline}</mesh>
      <mesh position={[0, 0.59, 0.05]} scale={[0.43, 0.43, 0.43]} geometry={dropGeometry}>{material}</mesh>
      {[-1, 1].map((side) => <React.Fragment key={side}>
        <mesh position={[side * 0.36, 0.1, 0.02]} rotation={[0, 0, side * -0.42]} scale={[0.25, 0.5, 0.29]} geometry={dropGeometry}>{outline}</mesh>
        <mesh position={[side * 0.36, 0.1, 0.06]} rotation={[0, 0, side * -0.42]} scale={[0.21, 0.45, 0.25]} geometry={dropGeometry}>{material}</mesh>
        <mesh position={[side * 0.24, -0.68, 0.02]} rotation={[0, 0, side * -0.12]} scale={[0.22, 0.42, 0.28]} geometry={dropGeometry}>{outline}</mesh>
        <mesh position={[side * 0.24, -0.66, 0.06]} rotation={[0, 0, side * -0.12]} scale={[0.18, 0.37, 0.24]} geometry={dropGeometry}>{material}</mesh>
      </React.Fragment>)}
      <mesh position={[-0.24, 0.76, 0.43]} scale={[0.12, 0.1, 0.045]} geometry={beanHighlight}>
        <meshBasicMaterial color="#fff8e8" transparent opacity={0.84} />
      </mesh>
    </group>;
  }
  return <group rotation={rotation} scale={radius}>
    <mesh scale={[1.1, 0.81, 0.77]} geometry={beanGeometry}>{outline}</mesh>
    <mesh scale={[1.02, 0.74, 0.7]} geometry={beanGeometry}>{material}</mesh>
    <mesh position={[-0.3, 0.34, 0.58]} scale={[0.17, 0.105, 0.045]} geometry={beanHighlight}>
      <meshBasicMaterial color="#fff8e8" transparent opacity={0.92} />
    </mesh>
  </group>;
};

const seeded = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const FallingCandies: React.FC<{ scene: string }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const count = scene === "s03" || scene === "s07" ? 0 : scene === "s04" ? 12 : scene === "s08" ? 4 : 16;
  const candies = Array.from({ length: count }, (_, i) => {
    const size = 22 + seeded(i + 6) * 19;
    const baseX = 50 + seeded(i + 20) * 980;
    const z = 1 + seeded(i + 40) * 6.5;
    const cameraRatio = (CAMERA_Z - z) / CAMERA_Z;
    const y = ((seeded(i + 70) * 1450 + t * (130 + seeded(i + 100) * 100)) % 1520) + 75;
    const x = baseX + Math.sin(t * 1.1 + i * 2.6) * (19 + seeded(i + 140) * 28);
    const inStudyLabel = scene === "s04" && y > 440 && y < 580;
    const inImpactLabel = scene === "s05" && y > 970 && y < 1100;
    const inSafeArea = y < 160 || y > 1570;
    const inFace = (scene === "s01" || scene === "s02" || scene === "s05" || scene === "s08")
      && y > 1190 && y < 1510 && x > 360 && x < 720;
    let bounceY = y;
    if ((scene === "s02" || scene === "s05") && y > 930 && y < 1060) {
      bounceY = 930 + Math.abs(Math.sin((y - 930) * 0.018)) * 110;
    }
    return {
      i,
      size,
      z,
      x,
      y: bounceY,
      cameraRatio,
      hidden: inStudyLabel || inImpactLabel || inSafeArea || inFace,
      shape: (i % 5 === 0 ? "gummy" : i % 3 === 0 ? "ring" : "bean") as "bean" | "gummy" | "ring",
      color: COLORS[i % COLORS.length],
    };
  });

  return <>
    <ambientLight intensity={1.15} color="#fff0dc" />
    <directionalLight position={[-4, 7, 11]} intensity={2.5} color="#fff3df" />
    <pointLight position={[5, 1, 7]} intensity={22} distance={30} color="#ffd59b" />
    {candies.filter((c) => !c.hidden).map((c) => {
      const worldX = ((c.x / W) - 0.5) * VIEW_W * c.cameraRatio;
      const worldY = (0.5 - c.y / H) * VIEW_H * c.cameraRatio;
      return <group key={c.i} position={[worldX, worldY, c.z]}>
        <Candy
          shape={c.shape}
          color={c.color}
          radius={(c.size / 100) * (0.85 + c.z * 0.04)}
          rotation={[0.45 + Math.sin(t * 1.2 + c.i) * 0.8, t * (c.i % 2 ? 0.85 : -0.7) + c.i, t * (c.i % 2 ? 1.35 : -1.1) + c.i * 0.6]}
        />
      </group>;
    })}
    {scene === "s08" && <group position={[2.25, -5.8, 3.5]} rotation={[0.1, 0.2, -0.2]}>
      <Candy shape="gummy" color="#ff496f" radius={0.33} rotation={[0, 0, 0]} />
    </group>}
  </>;
};

export const CandyRain3D: React.FC<{ scene: string }> = ({ scene }) => (
  <ThreeCanvas
    width={W}
    height={H}
    linear={false}
    gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
    camera={{ fov: 40, near: 0.1, far: 100, position: [0, 0, CAMERA_Z] }}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}
  >
    <FallingCandies scene={scene} />
  </ThreeCanvas>
);
