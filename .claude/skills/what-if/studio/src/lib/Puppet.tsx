import React from "react";
import { random, useCurrentFrame } from "remotion";
import { INK, EYE, BLUSH } from "./palette";

/*
  THE 2D PUPPET — every character in a layered-2D film is this one rig.
  Pure black (the darkest thing in the frame): big round head, simple body,
  thin line arms and legs, round hands. A thin rim light separates it from dark
  backgrounds. A soft contact shadow sits under the feet.
  Identity comes ONLY from size, hair shape and 1–3 coloured clothes/props.

  Origin (x, y) = the point between the feet, on the floor.
  At scale 1 an adult is ~310px tall. Use kid={true} for children (bigger head).

  Angles are in degrees. 0 = limb hangs straight down.
  Positive arm angle swings the arm FORWARD (toward the facing side).
  Rest pose: back arm -22, front arm +22. Arms must never sit flat against the
  body, or they vanish (black on black).
*/

export type Emotion = "neutral" | "sad" | "angry" | "happy" | "surprised" | "tired" | "focused";

export type Prop =
  | { type: "hardhat"; color: string; label?: string }
  | { type: "cap"; color: string }
  | { type: "beanie"; color: string }
  | { type: "headphones"; color: string }
  | { type: "bow"; color: string }
  | { type: "hoodie"; color: string } // colours the whole body
  | { type: "shirt"; color: string } // colours the body (same as hoodie, no hood)
  | { type: "vest"; color: string }
  | { type: "shoes"; color: string; soles?: string } // white soles by default
  | { type: "goggles"; color: string }
  | { type: "scarf"; color: string }
  | { type: "tie"; color: string }
  | { type: "lanyard"; color: string }
  | { type: "glasses"; color: string }
  | { type: "backpack"; color: string };

export type Hair = "none" | "ponytail" | "bun" | "curls" | "short" | "long" | "pigtails";

export type Pose = {
  armL?: number; // back arm
  armR?: number; // front arm
  elbowL?: number; // extra bend of the forearm
  elbowR?: number;
  legL?: number;
  legR?: number;
  lean?: number; // whole body lean, + = forward
  headTilt?: number;
  slump?: number; // 0 upright … 1 fully slumped (head drops, shoulders round)
};

export type PuppetProps = {
  x: number;
  y: number;
  scale?: number;
  kid?: boolean; // bigger head, shorter body
  facing?: 1 | -1; // 1 = faces right
  emotion?: Emotion;
  pose?: Pose;
  walk?: number; // 0 = standing. 1 = walk. 2.2 = run.
  sit?: boolean;
  hair?: Hair;
  hairColor?: string; // default: same black as the body
  props?: Prop[];
  blush?: boolean; // small pink marks (shy, happy, embarrassed)
  rim?: string | false; // rim light colour (pass the mood's rim). false = none
  glow?: string; // emotion aura (red anger, blue calm), pulses gently
  shadow?: boolean; // soft contact shadow under the feet (default true)
  mouth?: boolean; // tiny white line — only at big moments
  seed?: string; // makes blinks/idle differ between characters
  breathe?: boolean;
};

const toRad = (d: number) => (d * Math.PI) / 180;
const limbEnd = (x: number, y: number, len: number, angle: number) => ({
  x: x + Math.sin(toRad(angle)) * len,
  y: y + Math.cos(toRad(angle)) * len,
});

export const Puppet: React.FC<PuppetProps> = (p) => {
  const {
    x, y, scale = 1, kid = false, facing = 1, emotion = "neutral", pose = {}, walk = 0, sit = false,
    hair = "none", hairColor = INK, props = [], blush = false, rim = "#E9E4DA", glow, shadow = true,
    mouth = false, seed = "a", breathe = true,
  } = p;
  const frame = useCurrentFrame();
  const has = (t: Prop["type"]) => props.find((q) => q.type === t) as any;
  const uid = `pp-${seed}`;

  // --- motion: smooth, every frame changes (idle life never stops) ---------
  const phase = frame * 0.22 * (walk || 0);
  const swing = walk ? Math.sin(phase) * (walk > 1.5 ? 42 : 26) : 0;
  const bob = walk ? -Math.abs(Math.sin(phase)) * (walk > 1.5 ? 12 : 6) : 0;
  const breath = breathe ? 1 + Math.sin(frame / 18 + random(seed) * 6) * 0.014 : 1;
  const sway = walk ? 0 : Math.sin(frame / 47 + random(`sw${seed}`) * 6) * 1.4; // weight shift

  const slump = pose.slump ?? (emotion === "sad" || emotion === "tired" ? 0.45 : 0);
  const lean = (pose.lean ?? 0) + slump * 8 + (walk > 1.5 ? 10 : 0) + sway;
  const headDrop = slump * 22;

  const period = 90 + Math.floor(random(`blink-${seed}`) * 60);
  const offset = Math.floor(random(`blinko-${seed}`) * period);
  const inBlink = (frame + offset) % period < 4;

  // --- skeleton (local coords, feet at 0,0) ------------------------------
  const k = kid ? 0.78 : 1; // kids: shorter body and limbs, same-size head
  const headR = kid ? 46 : 42;
  const hipY = (sit ? -70 : -92) * k;
  const bodyTop = hipY - 112 * k;
  const shoulderY = bodyTop + 22 * k;
  const headY = bodyTop - headR * 0.72 + headDrop;
  const legLen = 88 * k;
  const armLen = 94 * k;

  const legLa = sit ? 90 : (pose.legL ?? 0) + swing;
  const legRa = sit ? 90 : (pose.legR ?? 0) - swing;
  const armLa = (pose.armL ?? -22) - swing * 0.9 - slump * 6;
  const armRa = (pose.armR ?? 22) + swing * 0.9 - slump * 6;

  const hipL = { x: -12, y: hipY }, hipR = { x: 12, y: hipY };
  const shL = { x: -6, y: shoulderY + slump * 6 }, shR = { x: 6, y: shoulderY + slump * 6 };
  const footL = sit ? { x: hipL.x + 62 * k, y: hipY + 4 } : limbEnd(hipL.x, hipL.y, legLen, legLa);
  const footR = sit ? { x: hipR.x + 70 * k, y: hipY + 4 } : limbEnd(hipR.x, hipR.y, legLen, legRa);
  const shinL = sit ? { x: footL.x, y: footL.y + 66 * k } : null;
  const shinR = sit ? { x: footR.x, y: footR.y + 66 * k } : null;
  const elbowL = limbEnd(shL.x, shL.y, armLen * 0.5, armLa);
  const elbowR = limbEnd(shR.x, shR.y, armLen * 0.5, armRa);
  const handL = limbEnd(elbowL.x, elbowL.y, armLen * 0.5, armLa + (pose.elbowL ?? 0));
  const handR = limbEnd(elbowR.x, elbowR.y, armLen * 0.5, armRa + (pose.elbowR ?? 0));

  const bodyColor = has("hoodie")?.color ?? has("shirt")?.color ?? INK;
  const shoes = has("shoes");
  const footColor = shoes ? shoes.color : INK;
  const soles = shoes ? shoes.soles ?? "#F1EEE8" : null;
  const limb = { stroke: INK, strokeWidth: 9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const glowPulse = 0.24 + Math.sin(frame / 10) * 0.06;

  const Foot = ({ fx, fy }: { fx: number; fy: number }) => (
    <g>
      <ellipse cx={fx + 6} cy={fy} rx={13} ry={8} fill={footColor} />
      {soles && <rect x={fx - 7} y={fy + 3} width={26} height={4} rx={2} fill={soles} />}
    </g>
  );

  return (
    <g transform={`translate(${x} ${y + bob * scale})`}>
      {shadow && !sit && <ellipse cx={0} cy={4} rx={70 * scale} ry={12 * scale} fill="#000" opacity={0.35} style={{ filter: "blur(6px)" }} />}
      <g transform={`scale(${scale * facing} ${scale})`}>
        <defs>
          {/* rim light: a thin bright edge around the whole silhouette */}
          <filter id={`${uid}-rim`} x="-30%" y="-30%" width="160%" height="160%">
            <feMorphology in="SourceAlpha" operator="dilate" radius={2.2 / scale} result="d" />
            <feGaussianBlur in="d" stdDeviation={1.2 / scale} result="b" />
            <feFlood floodColor={rim || "#000"} floodOpacity={rim ? 0.85 : 0} />
            <feComposite in2="b" operator="in" result="edge" />
            <feMerge><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {glow && (
          <ellipse cx={0} cy={headY + 60} rx={150} ry={200} fill={glow} opacity={glowPulse} style={{ filter: "blur(30px)" }} />
        )}
        <g filter={rim ? `url(#${uid}-rim)` : undefined}>
          <g transform={`rotate(${lean} 0 ${hipY})`}>
            {/* hair behind the head */}
            <HairBack hair={hair} color={hairColor} headY={headY} r={headR} />
            {has("backpack") && <rect x={-52} y={bodyTop + 14} width={30} height={78 * k} rx={10} fill={has("backpack").color} />}

            {/* back arm + back leg */}
            <polyline points={`${shL.x},${shL.y} ${elbowL.x},${elbowL.y} ${handL.x},${handL.y}`} {...limb} />
            {sit ? <polyline points={`${hipL.x},${hipL.y} ${footL.x},${footL.y} ${shinL!.x},${shinL!.y}`} {...limb} />
              : <line x1={hipL.x} y1={hipL.y} x2={footL.x} y2={footL.y} {...limb} />}
            <Foot fx={sit ? shinL!.x : footL.x} fy={sit ? shinL!.y : footL.y} />

            {/* body — breathing scales it gently from the hips */}
            <g transform={`translate(0 ${hipY}) scale(1 ${breath}) translate(0 ${-hipY})`}>
              <rect x={-30} y={bodyTop} width={60} height={hipY - bodyTop + 14} rx={28} fill={bodyColor} />
              {has("hoodie") && <path d={`M -24 ${bodyTop + 6} Q 0 ${bodyTop + 26} 24 ${bodyTop + 6}`} stroke={INK} strokeOpacity={0.35} strokeWidth={4} fill="none" />}
              {has("vest") && (
                <path d={`M -28 ${bodyTop + 28} L -28 ${hipY - 4} Q 0 ${hipY + 10} 28 ${hipY - 4} L 28 ${bodyTop + 28} Q 0 ${bodyTop + 14} -28 ${bodyTop + 28} Z`} fill={has("vest").color} />
              )}
              {has("tie") && <path d={`M 4 ${bodyTop + 8} l 7 12 l -5 44 l -2 6 l -2 -6 l -5 -44 Z`} fill={has("tie").color} />}
              {has("lanyard") && (
                <g><path d={`M -14 ${bodyTop + 4} L 6 ${bodyTop + 56} L 22 ${bodyTop + 4}`} stroke={has("lanyard").color} strokeWidth={3} fill="none" />
                  <rect x={-2} y={bodyTop + 54} width={18} height={24} rx={3} fill="#EDE6D8" /></g>
              )}
              {has("scarf") && <rect x={-28} y={bodyTop - 2} width={56} height={16} rx={8} fill={has("scarf").color} />}
            </g>

            {/* front leg + front arm */}
            {sit ? <polyline points={`${hipR.x},${hipR.y} ${footR.x},${footR.y} ${shinR!.x},${shinR!.y}`} {...limb} />
              : <line x1={hipR.x} y1={hipR.y} x2={footR.x} y2={footR.y} {...limb} />}
            <Foot fx={sit ? shinR!.x : footR.x} fy={sit ? shinR!.y : footR.y} />
            <polyline points={`${shR.x},${shR.y} ${elbowR.x},${elbowR.y} ${handR.x},${handR.y}`} {...limb} />
            <circle cx={handL.x} cy={handL.y} r={8} fill={INK} />
            <circle cx={handR.x} cy={handR.y} r={8} fill={INK} />

            {/* head */}
            <g transform={`rotate(${(pose.headTilt ?? 0) + slump * 10} 0 ${headY})`}>
              <circle cx={0} cy={headY} r={headR} fill={INK} />
              <HairFront hair={hair} color={hairColor} headY={headY} r={headR} />
              <Eyes cy={headY} r={headR} emotion={emotion} blink={inBlink} />
              {blush && <g fill={BLUSH} opacity={0.8}><ellipse cx={4} cy={headY + 14} rx={6} ry={3} /><ellipse cx={34} cy={headY + 14} rx={6} ry={3} /></g>}
              {mouth && (
                <path d={emotion === "happy" ? `M 10 ${headY + 20} q 9 6 18 0` : emotion === "sad" ? `M 10 ${headY + 23} q 9 -5 18 0` : `M 11 ${headY + 21} l 16 0`}
                  stroke={EYE} strokeWidth={2.5} fill="none" strokeLinecap="round" />
              )}
              <Hats has={has} headY={headY} r={headR} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
};

const HairBack: React.FC<{ hair: Hair; color: string; headY: number; r: number }> = ({ hair, color, headY, r }) => {
  if (hair === "ponytail") return <path d={`M ${-r * 0.7} ${headY - r * 0.5} q -46 10 -40 70 q 6 -40 30 -46 Z`} fill={color} />;
  if (hair === "long") return <rect x={-r - 4} y={headY - r * 0.4} width={r * 1.5} height={r * 2.1} rx={18} fill={color} />;
  if (hair === "pigtails") return <g fill={color}><circle cx={-r - 6} cy={headY + 6} r={14} /><circle cx={r + 4} cy={headY + 6} r={14} /></g>;
  return null;
};

const HairFront: React.FC<{ hair: Hair; color: string; headY: number; r: number }> = ({ hair, color, headY, r }) => {
  if (hair === "bun") return <circle cx={-6} cy={headY - r - 10} r={16} fill={color} />;
  if (hair === "curls") return (
    <g fill={color}>{Array.from({ length: 7 }).map((_, i) => {
      const a = toRad(-160 + i * 24);
      return <circle key={i} cx={Math.cos(a) * r * 0.95} cy={headY + Math.sin(a) * r * 0.95} r={13} />;
    })}</g>
  );
  if (hair === "short") return <path d={`M ${-r} ${headY - 4} Q ${-r} ${headY - r - 12} 0 ${headY - r - 8} Q ${r * 0.8} ${headY - r - 8} ${r * 0.9} ${headY - r * 0.55} Q ${r * 0.2} ${headY - r * 0.75} ${-r * 0.5} ${headY - r * 0.35} Z`} fill={color} />;
  if (color !== INK && hair !== "none") return <path d={`M ${-r} ${headY} Q ${-r} ${headY - r - 8} 0 ${headY - r - 4} Q ${r} ${headY - r - 8} ${r} ${headY - r * 0.4} Q 0 ${headY - r * 0.7} ${-r} ${headY} Z`} fill={color} />;
  return null;
};

const Hats: React.FC<{ has: (t: Prop["type"]) => any; headY: number; r: number }> = ({ has, headY, r }) => (
  <>
    {has("goggles") && (
      <g><rect x={-r} y={headY - 22} width={2 * r} height={8} fill={has("goggles").color} />
        <rect x={4} y={headY - 30} width={30} height={20} rx={9} fill="none" stroke={has("goggles").color} strokeWidth={5} /></g>
    )}
    {has("glasses") && (
      <g fill="none" stroke={has("glasses").color} strokeWidth={3}><circle cx={11} cy={headY - 4} r={10} /><circle cx={32} cy={headY - 4} r={9} /><line x1={21} y1={headY - 5} x2={23} y2={headY - 5} /></g>
    )}
    {has("headphones") && (
      <g><path d={`M ${-r + 4} ${headY} Q ${-r} ${headY - r - 18} 0 ${headY - r - 14} Q ${r} ${headY - r - 18} ${r - 4} ${headY}`} stroke={has("headphones").color} strokeWidth={7} fill="none" />
        <rect x={-r - 6} y={headY - 10} width={16} height={26} rx={6} fill={has("headphones").color} /></g>
    )}
    {has("hardhat") && (
      <g><path d={`M ${-r - 4} ${headY - 16} Q ${-r - 2} ${headY - r - 26} 0 ${headY - r - 28} Q ${r + 2} ${headY - r - 26} ${r + 4} ${headY - 16} Z`} fill={has("hardhat").color} />
        <rect x={-r - 10} y={headY - 20} width={2 * r + 24} height={9} rx={4} fill={has("hardhat").color} />
        {has("hardhat").label && <text x={0} y={headY - 30} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="Inter" fill={INK}>{has("hardhat").label}</text>}</g>
    )}
    {has("cap") && (
      <g><path d={`M ${-r} ${headY - 12} Q ${-r + 2} ${headY - r - 14} 0 ${headY - r - 14} Q ${r - 2} ${headY - r - 14} ${r} ${headY - 12} Z`} fill={has("cap").color} />
        <rect x={10} y={headY - 18} width={52} height={8} rx={4} fill={has("cap").color} /></g>
    )}
    {has("beanie") && (
      <g><path d={`M ${-r} ${headY - 8} Q ${-r} ${headY - r - 20} 0 ${headY - r - 20} Q ${r} ${headY - r - 20} ${r} ${headY - 8} Z`} fill={has("beanie").color} />
        <rect x={-r - 2} y={headY - 14} width={2 * r + 4} height={12} rx={6} fill={has("beanie").color} /></g>
    )}
    {has("bow") && (
      <g fill={has("bow").color} transform={`translate(-18 ${headY - r + 4}) rotate(-20)`}>
        <path d="M 0 0 L -18 -12 L -18 12 Z" /><path d="M 0 0 L 18 -12 L 18 12 Z" /><circle r={5} /></g>
    )}
  </>
);

const Eyes: React.FC<{ cy: number; r: number; emotion: Emotion; blink: boolean }> = ({ cy, r, emotion, blink }) => {
  // White ovals toward the facing side, with a curved lid line on top. Lid shape alone shows mood.
  const ex1 = r * 0.22, ex2 = r * 0.7, ey = cy - 4;
  const lid = { stroke: INK, strokeWidth: 3.2, fill: "none", strokeLinecap: "round" as const };
  if ((emotion === "happy" && !blink) || blink) {
    // happy = closed upward curves; blink = closed flat curves
    const d = (cx: number) => blink ? `M ${cx - 7} ${ey} q 7 3 14 0` : `M ${cx - 7} ${ey + 2} q 7 -9 14 0`;
    return <g stroke={EYE} strokeWidth={3.5} fill="none" strokeLinecap="round"><path d={d(ex1)} /><path d={d(ex2)} /></g>;
  }
  const big = emotion === "surprised" ? 1.4 : 1;
  const rx = 6.5 * big, ry = 9 * big * (emotion === "tired" ? 0.55 : emotion === "focused" ? 0.75 : 1);
  return (
    <g>
      <ellipse cx={ex1} cy={ey} rx={rx} ry={ry} fill={EYE} />
      <ellipse cx={ex2} cy={ey} rx={rx} ry={ry} fill={EYE} />
      {emotion === "angry" && ( // lids slant down toward the nose
        <g fill={INK}>
          <polygon points={`${ex1 - 10},${ey - 12} ${ex1 + 10},${ey - 12} ${ex1 + 10},${ey - 1}`} />
          <polygon points={`${ex2 - 10},${ey - 12} ${ex2 + 10},${ey - 12} ${ex2 - 10},${ey - 1}`} />
        </g>
      )}
      {emotion === "sad" && ( // lids droop to the outside
        <g fill={INK}>
          <polygon points={`${ex1 - 10},${ey - 1} ${ex1 - 10},${ey - 12} ${ex1 + 10},${ey - 12}`} />
          <polygon points={`${ex2 + 10},${ey - 1} ${ex2 + 10},${ey - 12} ${ex2 - 10},${ey - 12}`} />
        </g>
      )}
      {emotion === "tired" && <g fill={INK}><rect x={ex1 - 9} y={ey - 12} width={18} height={9} /><rect x={ex2 - 9} y={ey - 12} width={18} height={9} /></g>}
      {/* curved lid line on top of each eye */}
      <path d={`M ${ex1 - 8} ${ey - ry + 1} q 8 -5 16 0`} {...lid} />
      <path d={`M ${ex2 - 8} ${ey - ry + 1} q 8 -5 16 0`} {...lid} />
    </g>
  );
};
