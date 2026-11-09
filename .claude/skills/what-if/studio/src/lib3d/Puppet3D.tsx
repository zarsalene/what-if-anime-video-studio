import React from "react";
import * as THREE from "three";
import { random, useCurrentFrame } from "remotion";
import { INK, EYE, BLUSH } from "../lib/palette";
import { Glow, ContactShadow } from "./World";
import type { Emotion, Pose, Hair, Prop } from "../lib/Puppet";

/*
  THE 3D PUPPET — same character system as the 2D puppet, as simple 3D bodies:
  sphere head, capsule body and limbs, round hands and feet. Still pure black
  (the darkest thing in the frame), with coloured clothes and hair. A thin rim
  (an inverted-hull outline) keeps it readable against dark backgrounds.

  Position: at = [x, z] on the floor. turn = degrees around the vertical axis
  (0 faces the camera's default +z direction, 90 faces +x, -90 faces -x, 180 faces away).
  Same props, hair, emotions and pose angles as the 2D Puppet (see references/characters.md).
*/

export type Puppet3DProps = {
  at: [number, number];
  y?: number; // raise the whole puppet (standing on a step)
  turn?: number;
  scale?: number;
  kid?: boolean;
  emotion?: Emotion;
  pose?: Pose;
  walk?: number;
  sit?: number; // seat height in metres (e.g. 0.45). Omit to stand.
  hair?: Hair;
  hairColor?: string;
  props?: Prop[];
  blush?: boolean;
  rim?: string | false;
  glow?: string;
  mouth?: boolean;
  seed?: string;
};

const R = (d: number) => (d * Math.PI) / 180;

/* One body part: the black shape + its rim outline. */
const Part: React.FC<{ geo: React.ReactNode; color?: string; rim?: string | false; rimSize?: number; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }> = ({ geo, color = INK, rim, rimSize = 1.06, position, rotation, scale = [1, 1, 1] }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>{geo}<meshStandardMaterial color={color} roughness={color === INK ? 1 : 0.85} metalness={0} /></mesh>
    {rim && <mesh scale={[rimSize, rimSize, rimSize]}>{geo}<meshBasicMaterial color={rim} side={THREE.BackSide} transparent opacity={0.4} depthWrite={false} /></mesh>}
  </group>
);

const Capsule = ({ r, len }: { r: number; len: number }) => <capsuleGeometry args={[r, len, 6, 12]} />;
const Ball = ({ r }: { r: number }) => <sphereGeometry args={[r, 24, 16]} />;

/* A two-segment limb hanging from a joint. swing = forward (deg), spread = sideways (deg), bend = second segment (deg). */
const Limb: React.FC<{ at: [number, number, number]; len: number; r: number; swing: number; spread: number; bend: number; end: React.ReactNode; rim?: string | false; color?: string; bendAxis?: "x" }> = ({ at, len, r, swing, spread, bend, end, rim, color }) => (
  <group position={at} rotation={[R(-swing), 0, R(spread)]}>
    <Part geo={<Capsule r={r} len={len / 2} />} position={[0, -len / 4, 0]} rim={rim} color={color} rimSize={1.12} />
    <group position={[0, -len / 2, 0]} rotation={[R(-bend), 0, 0]}>
      <Part geo={<Capsule r={r} len={len / 2} />} position={[0, -len / 4, 0]} rim={rim} color={color} rimSize={1.12} />
      <group position={[0, -len / 2, 0]}>{end}</group>
    </group>
  </group>
);

export const Puppet3D: React.FC<Puppet3DProps> = (p) => {
  const {
    at, y = 0, turn = 0, scale = 1, kid = false, emotion = "neutral", pose = {}, walk = 0, sit,
    hair = "none", hairColor = INK, props = [], blush = false, rim = "#E9E4DA", glow, mouth = false, seed = "a",
  } = p;
  const f = useCurrentFrame();
  const has = (t: Prop["type"]) => props.find((q) => q.type === t) as any;

  const phase = f * 0.22 * (walk || 0);
  const swing = walk ? Math.sin(phase) * (walk > 1.5 ? 45 : 28) : 0;
  const bob = walk ? Math.abs(Math.sin(phase)) * (walk > 1.5 ? 0.06 : 0.03) : 0;
  const breath = 1 + Math.sin(f / 18 + random(seed) * 6) * 0.015;
  const sway = walk ? 0 : Math.sin(f / 47 + random(`sw${seed}`) * 6) * 1.2;
  const slump = pose.slump ?? (emotion === "sad" || emotion === "tired" ? 0.45 : 0);
  const period = 90 + Math.floor(random(`blink-${seed}`) * 60);
  const blink = (f + Math.floor(random(`bo-${seed}`) * period)) % period < 4;

  // proportions
  const k = kid ? 0.62 : 1;
  const legLen = 0.82 * k;
  const hipY = sit !== undefined ? sit : legLen;
  const bodyLen = 0.36 * (kid ? 0.7 : 1);
  const bodyR = kid ? 0.15 : 0.17;
  const bodyMid = hipY + bodyLen / 2 + bodyR * 0.6;
  const shoulderY = hipY + bodyLen + bodyR * 0.55;
  const headR = kid ? 0.25 : 0.24;
  const headY = shoulderY + headR * 1.05 - slump * 0.05;
  const armLen = 0.62 * (kid ? 0.7 : 1);

  const bodyColor = has("hoodie")?.color ?? has("shirt")?.color ?? INK;
  const shoes = has("shoes");
  const foot = (
    <group>
      <Part geo={<Ball r={0.07} />} scale={[1, 0.6, 1.5]} position={[0, -0.02, 0.04]} color={shoes?.color ?? INK} rim={rim} />
      {shoes && <mesh position={[0, -0.055, 0.04]}><boxGeometry args={[0.13, 0.025, 0.22]} /><meshStandardMaterial color={shoes.soles ?? "#F1EEE8"} /></mesh>}
    </group>
  );
  const hand = <Part geo={<Ball r={0.055} />} rim={rim} />;

  const legSwingL = sit !== undefined ? 90 : (pose.legL ?? 0) + swing;
  const legSwingR = sit !== undefined ? 90 : (pose.legR ?? 0) - swing;
  const kneeL = sit !== undefined ? -90 : walk ? Math.max(0, -Math.sin(phase)) * -35 : 0;
  const kneeR = sit !== undefined ? -90 : walk ? Math.max(0, Math.sin(phase)) * -35 : 0;
  const armSwingL = (pose.armL ?? 0) - swing * 0.9;
  const armSwingR = (pose.armR ?? 0) + swing * 0.9;

  // eyes: white ovals on the front of the head, a lid above each
  const eyeOpen = blink ? 0.12 : emotion === "surprised" ? 1.35 : emotion === "tired" ? 0.5 : emotion === "focused" ? 0.7 : 1;
  const Eye = ({ side }: { side: 1 | -1 }) => {
    const ex = side * headR * 0.36, ey = headY + 0.02, ez = headR * 0.92;
    const lidTilt = emotion === "angry" ? -side * 22 : emotion === "sad" ? side * 22 : 0;
    return (
      <group position={[ex, ey, ez]}>
        {emotion === "happy" && !blink ? (
          <mesh rotation={[0, 0, 0]}><torusGeometry args={[0.03, 0.009, 6, 16, Math.PI]} /><meshBasicMaterial color={EYE} /></mesh>
        ) : (
          <mesh scale={[0.035, 0.05 * eyeOpen, 0.015]}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color={EYE} /></mesh>
        )}
        {(emotion === "angry" || emotion === "sad") && !blink && (
          <mesh position={[0, 0.042, 0.012]} rotation={[0, 0, R(lidTilt)]}><boxGeometry args={[0.09, 0.03, 0.02]} /><meshBasicMaterial color={INK} /></mesh>
        )}
      </group>
    );
  };

  return (
    <group position={[at[0], y + bob, at[1]]} rotation={[0, R(turn), 0]} scale={[scale, scale, scale]}>
      {sit === undefined && <ContactShadow at={[0, 0]} size={0.9} />}
      {glow && <Glow at={[0, headY - 0.3, 0]} color={glow} size={2.2} strength={0.35 + Math.sin(f / 10) * 0.08} />}
      <group rotation={[R((pose.lean ?? 0) + slump * 10 + (walk > 1.5 ? 10 : 0)), 0, R(sway)]}>
        {/* legs */}
        <Limb at={[-0.08, hipY, 0]} len={legLen} r={0.035} swing={legSwingL} spread={0} bend={kneeL} end={foot} rim={rim} />
        <Limb at={[0.08, hipY, 0]} len={legLen} r={0.035} swing={legSwingR} spread={0} bend={kneeR} end={foot} rim={rim} />
        {/* body */}
        <group position={[0, bodyMid, 0]} scale={[1, breath, 1]}>
          <Part geo={<Capsule r={bodyR} len={bodyLen} />} color={bodyColor} rim={rim} />
          {has("vest") && <mesh scale={[1.04, 0.8, 1.04]} position={[0, 0.02, 0]}><cylinderGeometry args={[bodyR, bodyR, bodyLen, 16, 1, true]} /><meshStandardMaterial color={has("vest").color} side={THREE.DoubleSide} /></mesh>}
          {has("scarf") && <mesh position={[0, bodyLen / 2 + 0.08, 0]} rotation={[R(90), 0, 0]}><torusGeometry args={[bodyR * 0.85, 0.04, 8, 20]} /><meshStandardMaterial color={has("scarf").color} /></mesh>}
          {has("tie") && <mesh position={[0, 0.03, bodyR + 0.005]}><boxGeometry args={[0.04, 0.24, 0.01]} /><meshStandardMaterial color={has("tie").color} /></mesh>}
          {has("lanyard") && <mesh position={[0, -0.04, bodyR + 0.01]}><boxGeometry args={[0.07, 0.09, 0.01]} /><meshStandardMaterial color="#EDE6D8" /></mesh>}
          {has("backpack") && <mesh position={[0, 0.02, -bodyR - 0.06]}><boxGeometry args={[0.26, 0.34, 0.14]} /><meshStandardMaterial color={has("backpack").color} /></mesh>}
        </group>
        {/* arms — rest slightly away from the body so they stay readable */}
        <Limb at={[-(bodyR + 0.04), shoulderY, 0]} len={armLen} r={0.03} swing={armSwingL} spread={-10} bend={pose.elbowL ?? 0} end={hand} rim={rim} color={bodyColor !== INK && has("hoodie") ? bodyColor : INK} />
        <Limb at={[bodyR + 0.04, shoulderY, 0]} len={armLen} r={0.03} swing={armSwingR} spread={10} bend={pose.elbowR ?? 0} end={hand} rim={rim} color={bodyColor !== INK && has("hoodie") ? bodyColor : INK} />
        {/* head */}
        <group position={[0, headY - headR, 0]} rotation={[R((pose.headTilt ?? 0) + slump * 14), 0, 0]}><group position={[0, -(headY - headR), 0]}>
          <Part geo={<Ball r={headR} />} position={[0, headY, 0]} rim={rim} rimSize={1.05} />
          <Eye side={-1} />
          <Eye side={1} />
          {blush && [-1, 1].map((s) => <mesh key={s} position={[s * headR * 0.55, headY - 0.07, headR * 0.82]} scale={[0.04, 0.018, 0.01]}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={BLUSH} /></mesh>)}
          {mouth && <mesh position={[0, headY - 0.1, headR * 0.93]}><boxGeometry args={[0.06, 0.008, 0.01]} /><meshBasicMaterial color={EYE} /></mesh>}
          {/* hair */}
          {hair === "ponytail" && <Part geo={<Capsule r={0.06} len={0.22} />} position={[0, headY + 0.02, -headR - 0.04]} rotation={[R(-30), 0, 0]} color={hairColor} rim={rim} />}
          {hair === "bun" && <Part geo={<Ball r={0.09} />} position={[0, headY + headR * 0.85, -headR * 0.4]} color={hairColor} rim={rim} />}
          {hair === "pigtails" && [-1, 1].map((s) => <Part key={s} geo={<Ball r={0.08} />} position={[s * headR * 1.05, headY, -0.02]} color={hairColor} rim={rim} />)}
          {hair === "curls" && Array.from({ length: 9 }).map((_, i) => { const a = (i / 9) * Math.PI * 2; return <Part key={i} geo={<Ball r={0.07} />} position={[Math.cos(a) * headR * 0.8, headY + headR * 0.6, Math.sin(a) * headR * 0.8 - 0.03]} color={hairColor} rim={rim} />; })}
          {hair === "long" && <Part geo={<Capsule r={headR * 0.9} len={0.2} />} position={[0, headY - 0.12, -0.08]} color={hairColor} rim={rim} />}
          {hair === "short" && hairColor !== INK && <mesh position={[0, headY + 0.03, -0.02]} scale={[1.04, 0.85, 1.02]}><sphereGeometry args={[headR, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={hairColor} /></mesh>}
          {/* hats & glasses */}
          {has("cap") && <group position={[0, headY + headR * 0.35, 0]}>
            <mesh scale={[1.03, 0.7, 1.03]}><sphereGeometry args={[headR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={has("cap").color} /></mesh>
            <mesh position={[0, 0, headR * 0.95]} rotation={[R(8), 0, 0]}><boxGeometry args={[headR * 1.2, 0.02, headR * 0.7]} /><meshStandardMaterial color={has("cap").color} /></mesh></group>}
          {has("beanie") && <mesh position={[0, headY + headR * 0.25, 0]} scale={[1.05, 0.95, 1.05]}><sphereGeometry args={[headR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={has("beanie").color} /></mesh>}
          {has("hardhat") && <group position={[0, headY + headR * 0.3, 0]}>
            <mesh scale={[1.08, 0.85, 1.08]}><sphereGeometry args={[headR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={has("hardhat").color} /></mesh>
            <mesh><cylinderGeometry args={[headR * 1.3, headR * 1.3, 0.02, 24]} /><meshStandardMaterial color={has("hardhat").color} /></mesh></group>}
          {has("headphones") && <group position={[0, headY, 0]}>
            <mesh rotation={[0, 0, 0]}><torusGeometry args={[headR * 1.05, 0.018, 6, 20, Math.PI]} /><meshStandardMaterial color={has("headphones").color} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * headR * 1.02, 0, 0]} rotation={[0, 0, R(90)]}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /><meshStandardMaterial color={has("headphones").color} /></mesh>)}</group>}
          {has("glasses") && [-1, 1].map((s) => <mesh key={s} position={[s * headR * 0.36, headY + 0.02, headR * 0.97]}><torusGeometry args={[0.045, 0.008, 6, 20]} /><meshStandardMaterial color={has("glasses").color} /></mesh>)}
          {has("bow") && <group position={[-headR * 0.45, headY + headR * 0.8, 0]} rotation={[0, 0, R(-20)]}>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, 0, 0]} rotation={[0, 0, R(90 * s)]}><coneGeometry args={[0.045, 0.09, 3]} /><meshStandardMaterial color={has("bow").color} /></mesh>)}</group>}
        </group></group>
      </group>
    </group>
  );
};
