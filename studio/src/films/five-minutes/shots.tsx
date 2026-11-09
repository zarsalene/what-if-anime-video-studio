import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Puppet3D } from "../../lib3d/Puppet3D";
import { Scene3D, Room, Ground, Block, Lamp3D, Window3D, ScreenGlow3D, Glow, ContactShadow, LightPool3D } from "../../lib3d/World";
import { OpeningLine, ConceptCard, Line, InnerFight, Interstitial, EndCard, TimeLabel, ClockOverlay, PhoneScreen, Calendar } from "../../lib/Text";
import { INK, NIGHT, LOW, WARM, SUNSET, STORY } from "../../lib/palette";
import { Sfx, Footsteps, Writing } from "../../lib/Sound";
import { FilmLook } from "../../lib/Stage";
import { SERIF, SANS } from "../../lib/fonts";
import type { Prop } from "../../lib/Puppet";

// SOUND: beds live in storyboard.json → "ambience"; planned one-offs in its "sfx";
// sounds tied to the motion (taps, steps, drawer, cloth) are here, outside <Scene3D>,
// on the same frames as the animation.

const R = (d: number) => (d * Math.PI) / 180;

// ---- cast: defined once, aged only by hair colour, glasses and posture ----
const him = (age: number) => {
  const props: Prop[] = [{ type: "hoodie", color: "#33475E" }];
  if (age > 0.62) props.push({ type: "glasses", color: "#D8D2C6" });
  return {
    seed: "him",
    hair: "short" as const,
    hairColor: age > 0.22 ? (age > 0.6 ? "#B9B4AA" : "#8E8A82") : INK,
    props,
  };
};

const GIRL = {
  seed: "girl",
  kid: true,
  hair: "ponytail" as const,
  props: [
    { type: "hoodie", color: "#D9A93E" },
    { type: "backpack", color: "#6E5B45" },
    { type: "shoes", color: "#C7473D" },
  ] as Prop[],
};

const WIDE = { from: [3.4, 2.2, 2.6] as [number, number, number], look: [-0.3, 0.9, -2.9] as [number, number, number], fov: 38 };
const WIDE_PUSH = { from: [3.4, 2.2, 2.6] as [number, number, number], to: [3.0, 2.05, 2.0] as [number, number, number], look: [-0.3, 0.9, -2.9] as [number, number, number], fov: 38 };
const CLOSE = { from: [1.75, 1.55, 0.6] as [number, number, number], look: [0.7, 1.05, -2.2] as [number, number, number], fov: 34 };
const MEDIUM = { from: [2.4, 1.75, 1.1] as [number, number, number], look: [0.45, 1.0, -2.5] as [number, number, number], fov: 37 };

/* ------------------------------------------------------------------ */
/*  small black 3D props (hand)                                        */
/* ------------------------------------------------------------------ */
const BlackPart: React.FC<{ geo: React.ReactNode; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }> = ({ geo, position, rotation, scale = [1, 1, 1] }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>{geo}<meshStandardMaterial color={INK} roughness={1} /></mesh>
    <mesh scale={[1.06, 1.06, 1.06]}>{geo}<meshBasicMaterial color="#C9D3E3" side={THREE.BackSide} transparent opacity={0.32} depthWrite={false} /></mesh>
  </group>
);

const Hand: React.FC<{ at: [number, number, number]; rot?: [number, number, number]; tremble?: number }> = ({ at, rot = [0, 0, 0], tremble = 0 }) => {
  const f = useCurrentFrame();
  const t = Math.sin(f * 1.15) * tremble;
  return (
    <group position={[at[0], at[1] + t * 0.006, at[2]]} rotation={rot}>
      <BlackPart geo={<sphereGeometry args={[0.11, 16, 12]} />} scale={[1, 0.55, 1.25]} />
      {[-0.072, -0.024, 0.024, 0.072].map((x, i) => (
        <BlackPart key={i} geo={<capsuleGeometry args={[0.022, 0.13, 4, 8]} />} position={[x, -0.02, 0.13]} rotation={[R(72), 0, 0]} />
      ))}
      <BlackPart geo={<capsuleGeometry args={[0.026, 0.11, 4, 8]} />} position={[-0.12, -0.03, 0.02]} rotation={[0, 0, R(-45)]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  telescope + star chart + plant                                     */
/* ------------------------------------------------------------------ */
const Telescope: React.FC<{ at: [number, number]; rotY?: number; broken?: boolean; dust?: number }> = ({ at, rotY = -18, broken = false, dust = 0 }) => {
  const brass = dust > 0.5 ? "#7E6E52" : "#C2A06A";
  const tube = broken ? "#4A4C55" : dust > 0.5 ? "#6A6C74" : "#8A8F9B";
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, R(rotY), 0]}>
      {!broken && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.66, 0.02]} rotation={[R(s * 7), 0, R(s * 15)]}>
          <cylinderGeometry args={[0.022, 0.03, 1.35, 8]} />
          <meshStandardMaterial color="#2A2C33" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, -0.26]} rotation={[R(-13), 0, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 1.35, 8]} />
        <meshStandardMaterial color="#2A2C33" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.37, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#3A3D45" /></mesh>
      <group position={[0, 1.46, 0]} rotation={[R(broken ? -15 : -52), 0, 0]}>
        <mesh><cylinderGeometry args={[0.13, 0.17, 1.2, 16]} /><meshStandardMaterial color={tube} roughness={0.72} metalness={0.15} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.18, 0.18, 0.12, 16]} /><meshStandardMaterial color={brass} /></mesh>
        <mesh position={[0, 0.68, 0]}><cylinderGeometry args={[0.12, 0.12, 0.07, 16]} /><meshStandardMaterial color="#1A1C22" /></mesh>
        <mesh position={[0, -0.64, 0]}><cylinderGeometry args={[0.06, 0.08, 0.22, 12]} /><meshStandardMaterial color="#1A1C22" /></mesh>
        <mesh position={[0, -0.78, 0]}><cylinderGeometry args={[0.045, 0.045, 0.1, 12]} /><meshStandardMaterial color="#14161C" /></mesh>
      </group>
      {broken && (
        <mesh position={[0.3, 0.16, -0.2]} rotation={[0, 0, R(78)]}>
          <cylinderGeometry args={[0.03, 0.03, 0.85, 8]} />
          <meshStandardMaterial color="#2A2C33" />
        </mesh>
      )}
      <ContactShadow at={[0, 0]} size={1.2} strength={0.5} />
    </group>
  );
};

const WallChart: React.FC<{ state: "wall" | "floor" | "new" | "none"; value?: number }> = ({ state, value = 1 }) => {
  if (state === "none") return null;
  const floor = state === "floor";
  const paper = state === "floor" ? "#CFC5AB" : "#EDE6D8";
  return (
    <group position={floor ? [0.9, 0.02, -1.5] : state === "new" ? [-0.9, 1.95, -4.47] : [0.5, 2.0, -4.47]}
      rotation={floor ? [R(-90), 0, R(18)] : [0, 0, R(state === "new" ? -2 : 2)]}>
      <mesh><planeGeometry args={[0.8, 1.05]} /><meshStandardMaterial color={paper} roughness={1} /></mesh>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[((i * 37) % 70 - 35) / 100, ((i * 53) % 85 - 42) / 100 - 0.08, 0.006]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshBasicMaterial color={STORY.paperInk} />
        </mesh>
      ))}
      <mesh position={[0.12, -0.26, 0.008]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.1, 0.011, 6, 24]} />
        <meshBasicMaterial color={STORY.bad} />
      </mesh>
      {value < 1 && <mesh position={[0, 0.35, 0.01]} rotation={[0, 0, R(14)]}><planeGeometry args={[0.9, 0.1]} /><meshBasicMaterial color="#2A2622" transparent opacity={0.6} /></mesh>}
    </group>
  );
};

const ChartPaper: React.FC<{ at: [number, number, number]; rot?: [number, number, number] }> = ({ at, rot = [R(-12), 0, 0] }) => (
  <group position={at} rotation={rot}>
    <mesh><planeGeometry args={[0.62, 0.82]} /><meshStandardMaterial color="#D8CFB8" roughness={1} side={THREE.DoubleSide} /></mesh>
    {Array.from({ length: 10 }).map((_, i) => (
      <mesh key={i} position={[((i * 41) % 46 - 23) / 100, ((i * 67) % 60 - 30) / 100 - 0.06, 0.006]}>
        <sphereGeometry args={[0.007, 6, 5]} /><meshBasicMaterial color={STORY.paperInk} />
      </mesh>
    ))}
    <mesh position={[0.16, -0.3, 0.008]}><torusGeometry args={[0.1, 0.01, 6, 24]} /><meshBasicMaterial color={STORY.bad} /></mesh>
  </group>
);

const Plant: React.FC<{ at: [number, number]; dead?: boolean; fresh?: boolean }> = ({ at, dead = false, fresh = false }) => {
  const leaf = dead ? "#6B5A44" : fresh ? "#7FB06F" : "#5E7C55";
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.16, 0.12, 0.32, 12]} /><meshStandardMaterial color="#4A4038" roughness={1} /></mesh>
      {[-0.09, 0, 0.09].map((x, i) => (
        <mesh key={i} position={[x, 0.42 + i * 0.03, 0]} rotation={[R(dead ? 35 : -10), 0, R(x * 120)]}>
          <coneGeometry args={[0.07, dead ? 0.28 : 0.42, 6]} />
          <meshStandardMaterial color={leaf} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

const Dust: React.FC<{ strength: number }> = ({ strength }) => {
  const f = useCurrentFrame();
  if (strength <= 0) return null;
  return (
    <group>
      {Array.from({ length: 46 }).map((_, i) => {
        const x = ((i * 7919) % 1000) / 1000 * 6 - 3;
        const z = ((i * 4657) % 1000) / 1000 * 5 - 4;
        const y = 0.35 + ((i * 9301) % 1000) / 1000 * 2.3 + Math.sin(f / 42 + i) * 0.06;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.008, 4, 3]} />
            <meshBasicMaterial color="#CBD4E2" transparent opacity={0.2 * strength} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const WindowStars: React.FC = () => (
  <group>
    {[[1.35, 1.55], [1.72, 2.05], [2.05, 1.45], [2.28, 1.95], [1.55, 2.25], [2.2, 1.3]].map(([x, y], i) => (
      <Glow key={i} at={[x, y, -4.42]} color="#E9F0FF" size={0.07 + (i % 3) * 0.02} strength={0.7} />
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/*  the bedroom: built once, dressed by props                          */
/* ------------------------------------------------------------------ */
const Bedroom: React.FC<{
  mood?: "night" | "low" | "warm";
  dust?: number;
  plantDead?: boolean;
  plantFresh?: boolean;
  chart?: "wall" | "floor" | "new" | "none";
  phoneOn?: number;
  brokenScope?: boolean;
  drawerOpen?: number;
  showScope?: boolean;
  dawn?: boolean;
  pale?: number;
}> = ({ mood = "night", dust = 0, plantDead = false, plantFresh = false, chart = "wall", phoneOn = 1, brokenScope = false, drawerOpen = 0, showScope = true, dawn = false, pale = 0 }) => {
  const m = mood === "warm" ? WARM : mood === "low" ? LOW : NIGHT;
  const glassBase = dawn ? "#C9D3DE" : mood === "warm" ? "#F0CC9E" : "#4E6A9E";
  const glassC = new THREE.Color(glassBase).lerp(new THREE.Color("#C9D3DE"), pale);
  const winC = new THREE.Color("#AEC3E8").lerp(new THREE.Color("#D3CFC2"), pale);
  return (
    <group>
      <Room mood={mood} />
      <Window3D at={[1.8, 1.7, -4.49]} glass={`#${glassC.getHexString()}`} glow={dawn ? 0.8 : mood === "warm" ? 0.55 : 0.55} />
      {mood !== "warm" && <pointLight position={[1.9, 1.5, -3.9]} color={`#${winC.getHexString()}`} intensity={2.2 + pale * 0.8} distance={6} decay={1.6} />}
      {mood !== "warm" && <WindowStars />}
      {/* bed */}
      <Block at={[0.2, 0, -2.8]} size={[2.3, 0.45, 2.4]} color={mood === "warm" ? "#4B4238" : "#2B2F3B"} />
      <Block at={[0.2, 0.45, -4.28]} size={[2.3, 0.7, 0.12]} color={mood === "warm" ? "#3E372F" : "#22252E"} />
      <Block at={[-0.25, 0.45, -3.9]} size={[0.8, 0.14, 0.42]} color={mood === "warm" ? "#D8CBB4" : "#C9CED8"} />
      <Block at={[0.55, 0.45, -2.9]} size={[2.0, 0.05, 1.3]} color={mood === "warm" ? "#6A5A47" : "#323846"} />
      {/* nightstand + drawer */}
      <Block at={[-2.2, 0, -3.2]} size={[0.9, 0.62, 0.62]} color="#2E313A" />
      <group position={[-2.2, 0.4, -2.9 + drawerOpen * 0.46]}>
        <mesh><boxGeometry args={[0.78, 0.2, 0.06]} /><meshStandardMaterial color="#3A3E48" roughness={0.9} /></mesh>
        <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.3, 0.03, 0.02]} /><meshStandardMaterial color="#8A8F9A" /></mesh>
        {drawerOpen > 0.2 && <mesh position={[0, -0.055, -0.22]}><boxGeometry args={[0.74, 0.05, 0.42]} /><meshStandardMaterial color="#24262D" /></mesh>}
      </group>
      {drawerOpen > 0.35 && (
        <group position={[-2.2, 0.42, -2.52]}>
          <mesh><boxGeometry args={[0.09, 0.012, 0.18]} /><meshStandardMaterial color="#050506" /></mesh>
          <Glow at={[0, 0.02, 0]} color="#CFE3FF" size={0.22} strength={0.18} />
        </group>
      )}
      <Lamp3D at={[-2.2, -3.2]} kind="desk" color={m.lamp} height={1.12} intensity={mood === "low" ? 0.45 : 0.75} />
      <Plant at={[2.95, -3.9]} dead={plantDead} fresh={plantFresh} />
      {showScope && <Telescope at={[1.9, -3.62]} broken={brokenScope} dust={dust} />}
      <WallChart state={chart} />
      {phoneOn > 0 && <ScreenGlow3D at={[0.78, 1.06, -1.95]} strength={phoneOn} />}
      <Dust strength={dust} />
      <ContactShadow at={[0.7, -2.1]} size={1.4} strength={0.45} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  screens and cards built in 2D                                      */
/* ------------------------------------------------------------------ */
const StarChart: React.FC<{ aged?: boolean }> = ({ aged = false }) => {
  const paper = aged ? "#D3C8AC" : "#EDE6D8";
  return (
    <AbsoluteFill style={{ background: aged ? "radial-gradient(ellipse at center, #3A3833, #16171A)" : "radial-gradient(ellipse at center, #4A4A50, #24252A)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 880, height: 1120, background: paper, position: "relative", padding: 64, boxShadow: "0 22px 50px rgba(0,0,0,0.5)", transform: `rotate(${aged ? -2.2 : 0}deg)`, filter: aged ? "saturate(0.7)" : "none" }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, letterSpacing: 5, color: STORY.paperInk, textAlign: "center" }}>METEOR SHOWER</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 36, color: STORY.paperInk, opacity: 0.8, textAlign: "center", marginTop: 8 }}>FRIDAY — 2 AM</div>
        <svg width={752} height={760} viewBox="0 0 752 760" style={{ marginTop: 18 }}>
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx={20 + ((i * 137) % 712)} cy={30 + ((i * 211) % 690)} r={2.6 + (i % 3)} fill={STORY.paperInk} opacity={0.55} />
          ))}
          <polyline points="120,600 230,470 330,510 430,350 560,390 640,250" fill="none" stroke={STORY.paperInk} strokeWidth={2} opacity={0.35} />
          <polyline points="180,180 300,240 390,170" fill="none" stroke={STORY.paperInk} strokeWidth={2} opacity={0.28} />
          <circle cx={520} cy={700} r={92} fill="none" stroke={STORY.bad} strokeWidth={6} transform="rotate(-7 520 700)" />
          {aged && <rect x={0} y={860} width={752} height={110} fill="#3A3833" opacity={0.28} />}
        </svg>
        <div style={{ position: "absolute", left: 64, bottom: 40, fontFamily: SERIF, fontStyle: "italic", fontSize: 30, color: STORY.paperInk, opacity: 0.65 }}>{aged ? "the date has passed" : "look up."}</div>
      </div>
      <FilmLook />
    </AbsoluteFill>
  );
};

const HandPhone: React.FC = () => {
  const f = useCurrentFrame();
  const t = Math.sin(f * 1.2) * 2.6;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1A2233, #07080B)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 560, height: 900, transform: `translate(${t}px, 0)` }}>
        <div style={{ position: "absolute", left: 190, top: 120, width: 190, height: 380, borderRadius: 26, background: "#050506", boxShadow: "0 0 90px rgba(170,200,255,0.3), 0 24px 50px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 8, borderRadius: 20, background: "linear-gradient(180deg,#3C4C6A,#232C40)" }}>
            <div style={{ fontSize: 30, color: "#C8D4E8", textAlign: "center", marginTop: 90, fontFamily: SANS }}>5:41</div>
            <div style={{ fontSize: 18, color: "#93A2BC", textAlign: "center", marginTop: 6, fontFamily: SANS }}>FRIDAY</div>
            <div style={{ width: 120, height: 4, background: "#55648A", borderRadius: 2, margin: "40px auto 0" }} />
          </div>
        </div>
        {/* the old hand: four fingers over the edge, thumb below */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ position: "absolute", left: 160 + i * 52, top: 380 + (i === 0 || i === 3 ? 26 : 8), width: 46, height: 250, borderRadius: 26, background: "#08080A", border: "1.5px solid rgba(201,211,227,0.18)", transform: `rotate(${(i - 1.5) * 3}deg)` }} />
        ))}
        <div style={{ position: "absolute", left: 130, top: 540, width: 300, height: 125, borderRadius: 60, background: "#08080A", border: "1.5px solid rgba(201,211,227,0.18)" }} />
        <div style={{ position: "absolute", left: 92, top: 470, width: 120, height: 235, borderRadius: 55, background: "#08080A", border: "1.5px solid rgba(201,211,227,0.18)", transform: "rotate(24deg)" }} />
      </div>
      <FilmLook />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  the loop: same framing, only clock / excuse / age change           */
/* ------------------------------------------------------------------ */
const Loop: React.FC<{ clock?: string; label?: string; excuse?: string; age: number; dust?: number; plantDead?: boolean; chart?: "wall" | "floor" | "new" | "none"; taps?: number[]; phoneOn?: number; pale?: number }> = ({ clock, label, excuse, age, dust = 0, plantDead = false, chart = "wall", taps = [], phoneOn = 1, pale = 0 }) => {
  const f = useCurrentFrame();
  const tap = Math.sin(f * 0.9) * 3;
  return (
    <>
      {taps.length > 0 && <Sfx name="page-flip" at={Math.max(0, taps[0] - 4)} volume={0.5} rate={1.08} />}
      {taps.map((c) => <Sfx key={c} name="marker-tap" at={c + 2} volume={0.75} rate={1.05} />)}
      <Scene3D mood="night" ambient={0.3 + pale * 0.18} focus={1.2} cam={WIDE}
        overlay={<>
          {excuse && <Line text={excuse} voice="think" x={1280} y={300} />}
          {clock && <ClockOverlay time={clock} />}
          {label && <TimeLabel text={label} position="center" />}
        </>}>
        <Bedroom dust={dust} plantDead={plantDead} chart={chart} phoneOn={phoneOn} pale={pale} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="tired" pose={{ slump: 0.3 + age * 0.5, armR: 52 + tap, elbowR: 58, armL: 52 - tap, elbowL: 58 }} rim={NIGHT.rim} {...him(age)} />
      </Scene3D>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  hallway (beat 4)                                                   */
/* ------------------------------------------------------------------ */
const Hallway: React.FC = () => (
  <group>
    <Room mood="low" w={10} d={7} h={3} leftWall />
    {/* right wall so the corridor reads as a corridor, not a void */}
    <Block at={[5, 0, 0]} size={[0.1, 3, 7]} color="#3A3E48" />
    <Block at={[2.05, 0, -3.44]} size={[1.45, 2.15, 0.1]} color="#5A5F6A" />
    <Block at={[2.05, 0, -3.38]} size={[0.03, 2.1, 0.04]} color="#2A2D36" />
    <Block at={[1.2, 2.25, -3.3]} size={[0.5, 0.18, 0.12]} color="#2A2D36" emissive="#5A4A2E" />
    <Glow at={[2.05, 2.3, -3.2]} color="#FFD8A0" size={1.1} strength={0.35} />
    {/* his doorway */}
    <Block at={[-1.55, 0, -3.44]} size={[1.1, 2.15, 0.1]} color="#12141A" />
    <Block at={[-2.12, 0, -3.4]} size={[0.07, 2.2, 0.12]} color="#7A6248" />
    <Block at={[-0.98, 0, -3.4]} size={[0.07, 2.2, 0.12]} color="#7A6248" />
    <Block at={[-1.55, 2.15, -3.4]} size={[1.2, 0.08, 0.12]} color="#7A6248" />
    <Block at={[-0.95, 0, -3.05]} size={[0.06, 2.05, 1.0]} color="#4A3B2E" rotY={62} />
    <Lamp3D at={[0.1, -1.2]} kind="ceiling" color={LOW.lamp} height={2.7} intensity={0.7} />
    <LightPool3D at={[0.1, -1.2]} color={LOW.lamp} size={5} strength={0.3} />
  </group>
);

/* ------------------------------------------------------------------ */
/*  rooftop payoff (beat 6)                                            */
/* ------------------------------------------------------------------ */
const Stars3D: React.FC = () => (
  <group>
    {Array.from({ length: 26 }).map((_, i) => (
      <Glow key={i} at={[((i * 137) % 220 - 110) / 4, 7 + ((i * 211) % 90) / 10, -30 - (i % 5) * 2]} color="#FFF4E0" size={0.12 + (i % 3) * 0.05} strength={0.55} />
    ))}
  </group>
);

const Meteor: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [start, start + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (t <= 0 || t >= 1) return null;
  const x = 7 - 11 * t;
  const y = 9 - 4 * t;
  return (
    <group position={[x, y, -26]} rotation={[0, 0, R(38)]}>
      <mesh><boxGeometry args={[0.07, 1.5, 0.07]} /><meshBasicMaterial color="#FFF6E0" toneMapped={false} /></mesh>
      <Glow at={[0, 0.4, 0]} color="#FFE9C0" size={1.4} strength={0.7} />
    </group>
  );
};

const Rooftop: React.FC<{ meteorStart?: number }> = ({ meteorStart = 999 }) => (
  <group>
    <Ground color={SUNSET.floor} size={60} />
    <Block at={[0, -0.5, -1.5]} size={[16, 0.5, 12]} color="#4A3B44" />
    <Block at={[0, 0, -4.4]} size={[16, 0.95, 0.28]} color="#5E4652" />
    <Block at={[-6.5, 0, -1.5]} size={[0.28, 0.95, 6]} color="#5E4652" />
    <Block at={[6.5, 0, -1.5]} size={[0.28, 0.95, 6]} color="#5E4652" />
    {Array.from({ length: 12 }).map((_, i) => (
      <Block key={i} at={[-14 + i * 2.6, -6, -16 - (i % 4) * 3]} size={[1.8, 4 + (i % 5) * 1.4, 1.6]} color="#3A3348" />
    ))}
    {Array.from({ length: 8 }).map((_, i) => (
      <Glow key={`w${i}`} at={[-11 + i * 2.4, -2.4 + (i % 3) * 1.1, -15 - (i % 4) * 3]} color="#FFC99A" size={0.5} strength={0.45} />
    ))}
    <Glow at={[9, 6, -30]} color="#FFC99A" size={10} strength={0.55} />
    <Stars3D />
    <Meteor start={meteorStart} />
    <Telescope at={[1.5, -2.7]} rotY={-8} />
    <directionalLight position={[7, 9, 4]} intensity={1.4} color="#FFE0C0" />
  </group>
);

/* ================================================================== */
/*  SHOTS                                                              */
/* ================================================================== */
export const s01 = () => <OpeningLine text="Five minutes is never five minutes." />;

export const s02 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={18} volume={0.5} />
      <Sfx name="marker-tap" at={62} volume={0.7} rate={1.1} />
      <Sfx name="marker-tap" at={104} volume={0.7} rate={1.15} />
      <Scene3D mood="night" ambient={0.32} focus={1.1} cam={WIDE}
        overlay={<ConceptCard label="FIVE MINUTES" lines={["The time you borrow", "from tomorrow."]} delay={48} />}>
        <Bedroom />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="neutral" pose={{ slump: 0.18, armR: 52 + Math.sin(f * 0.8) * 2, elbowR: 56, armL: 52, elbowL: 56 }} rim={NIGHT.rim} {...him(0)} />
      </Scene3D>
    </>
  );
};

export const s03 = () => (
  <>
    <Sfx name="cloth" at={8} volume={0.5} />
    <Sfx name="sigh" at={150} volume={0.35} />
    <Loop excuse="Just five minutes." taps={[16, 40, 66, 96, 126, 158]} age={0.03} />
  </>
);

export const s04 = () => (
  <PhoneScreen kind="lock" time="11:58" date="FRIDAY" notes={[{ app: "Messages", text: "You up?" }, { app: "Feed", text: "3 new posts" }]} />
);

export const s05 = () => <Loop clock="12:14 AM" age={0.03} taps={[8, 20]} />;
export const s06 = () => <Loop clock="12:51 AM" excuse="One more." age={0.05} taps={[10]} />;
export const s07 = () => <Loop clock="1:37 AM" age={0.08} taps={[6, 22]} />;
export const s08 = () => <Loop clock="2:26 AM" age={0.12} taps={[12]} />;
export const s09 = () => <Loop clock="3:08 AM" age={0.2} taps={[8]} />;
export const s10 = () => <Loop clock="3:58 AM" age={0.27} taps={[16]} />;
export const s11 = () => <Loop clock="4:41 AM" age={0.34} dust={0.2} pale={0.4} taps={[7]} />;
export const s12 = () => <Loop clock="5:20 AM" age={0.42} dust={0.3} pale={0.75} taps={[11]} />;
export const s13 = () => <Loop label="MORNING" age={0.48} dust={0.35} pale={1} taps={[9]} />;
export const s14 = () => <Loop label="NEXT NIGHT" age={0.52} dust={0.4} plantDead taps={[12]} />;
export const s15 = () => <Loop clock="11:58 PM" age={0.56} dust={0.45} plantDead taps={[7]} />;

export const s16 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="marker-tap" at={30} volume={0.75} rate={1.05} />
      <Sfx name="marker-tap" at={90} volume={0.75} rate={1.1} />
      <Sfx name="page-flip" at={134} volume={0.5} />
      <Sfx name="cloth" at={20} volume={0.5} />
      <Scene3D mood="night" ambient={0.3} focus={2.2} cam={CLOSE}
        overlay={<Line text="Just five minutes." voice="think" x={640} y={310} />}>
        <Bedroom dust={0.2} phoneOn={1} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="tired" pose={{ slump: 0.55, armR: 54 + Math.sin(f * 0.8) * 3, elbowR: 58, armL: 54, elbowL: 58 }} rim={NIGHT.rim} {...him(0.5)} />
      </Scene3D>
    </>
  );
};

export const s17 = () => (
  <PhoneScreen kind="lock" time="1:12" date="FRIDAY" notes={[{ app: "Notifications", text: "214 new" }]} />
);

export const s18 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="marker-tap" at={20} volume={0.75} rate={1.05} />
      <Sfx name="marker-tap" at={70} volume={0.75} rate={1.1} />
      <Sfx name="page-flip" at={128} volume={0.5} />
      <Scene3D mood="night" ambient={0.28} focus={1.2} cam={WIDE_PUSH}
        overlay={<ClockOverlay time="5:41 AM" />}>
        <Bedroom dust={0.6} plantDead phoneOn={1} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="sad" pose={{ slump: 0.7, armR: 52 + Math.sin(f * 0.7) * 4, elbowR: 58, armL: 52, elbowL: 58 }} rim={NIGHT.rim} {...him(0.62)} />
      </Scene3D>
    </>
  );
};

export const s19 = () => (
  <>
    <Sfx name="page-flip" at={22} volume={0.45} rate={0.95} />
    <Sfx name="marker-tap" at={58} volume={0.7} />
    <StarChart />
  </>
);

export const s20 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="page-flip" at={40} volume={0.55} rate={1.1} />
      <Sfx name="marker-tap" at={75} volume={0.75} />
      <Sfx name="page-flip" at={110} volume={0.55} rate={1.05} />
      <Scene3D mood="low" ambient={0.48} focus={1.6} cam={MEDIUM}
        overlay={<ClockOverlay time="5:41 AM" />}>
        <Bedroom mood="low" dawn dust={0.7} plantDead phoneOn={1} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="tired" pose={{ slump: 0.8, armR: 52 + Math.sin(f * 0.6) * 4, elbowR: 58, armL: 52, elbowL: 58 }} rim={LOW.rim} {...him(0.72)} />
      </Scene3D>
    </>
  );
};

export const s21 = () => (
  <PhoneScreen kind="lock" time="5:41" date="FRIDAY" notes={[{ app: "Notifications", text: "412 new" }, { app: "Calendar", text: "Meteor shower — 2 AM" }]} />
);

export const s22 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={60} volume={0.9} />
      <Sfx name="cloth" at={130} volume={0.9} />
      <Sfx name="sigh" at={95} volume={0.4} />
      <Scene3D mood="low" ambient={0.44} focus={1.2} cam={WIDE_PUSH}
        overlay={<>{f > 30 && <Line text="Where did it go?" voice="think" x={1280} y={280} delay={34} />}</>}>
        <Bedroom mood="low" dawn dust={1} plantDead chart="floor" phoneOn={1} brokenScope />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="sad" pose={{ slump: 0.6, armR: 54, elbowR: 78, armL: 54, elbowL: 78, headTilt: 10 + Math.sin(f / 30) * 2 }} rim={LOW.rim} {...him(0.96)} />
      </Scene3D>
    </>
  );
};

export const s23 = () => <HandPhone />;

export const s24 = () => {
  const f = useCurrentFrame();
  const rise = interpolate(f, [6, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }); // reach down
  const lift = interpolate(f, [34, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }); // chart comes to his chest
  return (
    <>
      <Sfx name="page-flip" at={30} volume={0.8} />
      <Sfx name="cloth" at={64} volume={0.9} />
      <Sfx name="step-floor-1" at={14} volume={0.35} />
      <Sfx name="sigh" at={92} volume={0.4} />
      <Scene3D mood="low" ambient={0.44} focus={2.0} cam={MEDIUM}>
        <Bedroom mood="low" dawn dust={0.9} plantDead phoneOn={0} brokenScope chart={lift > 0.4 ? "none" : "floor"} />
        {/* he leans down for the chart, straightens as it comes to his chest */}
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="sad" pose={{ slump: 1 - lift * 0.45, headTilt: (1 - lift) * 18, armR: 48 + lift * 34, elbowR: 52 + lift * 28, armL: 48 + lift * 22, elbowL: 52 + lift * 22 }} rim={LOW.rim} {...him(0.98)} />
        {/* the chart: flat on the fallen spot, then up to his chest, angled so his face stays clear */}
        <ChartPaper at={[0.9 + lift * 0.15, 0.05 + lift * 0.92, -1.5 - lift * 0.36]} rot={[R(-88) + lift * R(74), lift * R(26), R(14) - lift * R(6)]} />
      </Scene3D>
    </>
  );
};

export const s25 = () => <StarChart aged />;

export const s26 = () => <Interstitial words={["Older.", "Emptier.", "Later."]} />;

export const s27 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={70} volume={0.9} />
      <Sfx name="sigh" at={130} volume={0.75} />
      <Scene3D mood="low" ambient={0.38} focus={1.3} cam={WIDE_PUSH}>
        <Bedroom mood="low" dawn dust={1} plantDead chart="floor" phoneOn={1} brokenScope />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="sad" pose={{ slump: 0.75, armR: 52, elbowR: 78, armL: 52, elbowL: 78, headTilt: 10 + Math.sin(f / 30) * 2 }} rim={LOW.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s28 = () => {
  const f = useCurrentFrame();
  return (
    <>
      {/* she is already waiting by the lift — no walking, no footsteps here */}
      <Sfx name="cloth" at={50} volume={0.9} />
      <Scene3D mood="low" ambient={0.58} focus={1.4} cam={{ from: [0.2, 1.55, 3.2], look: [0.2, 1.0, -2.4], fov: 42 }}>
        <Hallway />
        <Puppet3D at={[1.15, -2.0]} turn={0} emotion="happy" pose={{ armR: 20, armL: 20 }} rim={LOW.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s29 = () => {
  const f = useCurrentFrame();
  const door = interpolate(f, [20, 60], [62, 88], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <>
      <Sfx name="door-open" at={24} volume={0.7} />
      <Sfx name="cloth" at={70} volume={0.9} />
      <Scene3D mood="low" ambient={0.52} focus={1.5} cam={{ from: [0.1, 1.55, 2.6], look: [-0.6, 1.0, -2.9], fov: 40 }}>
        <group>
          <Hallway />
          <Block at={[-0.95, 0, -3.05]} size={[0.06, 2.05, 1.0]} color="#4A3B2E" rotY={door} />
        </group>
        <Puppet3D at={[-1.3, -2.55]} turn={35} emotion="tired" pose={{ slump: 0.8, armR: 50, armL: 20 }} rim={LOW.rim} {...him(1)} />
        <Puppet3D at={[0.95, -1.95]} turn={-22} emotion="neutral" pose={{ armR: 18, armL: 18 }} rim={LOW.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s30 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={78} volume={0.9} />
      <Sfx name="page-flip" at={96} volume={0.45} rate={1.15} />
      <Sfx name="step-floor-2" at={26} volume={0.3} />
      <Scene3D mood="low" ambient={0.55} focus={2.2} cam={{ from: [0.15, 1.32, 1.0], to: [0.25, 1.3, 0.7], look: [1.1, 0.95, -2.0], fov: 33 }}
        overlay={<Line text="My dad puts his phone in a drawer." voice="advice" x={960} y={850} delay={45} />}>
        <Hallway />
        <Puppet3D at={[1.1, -2.0]} turn={-8} emotion="happy" pose={{ armR: 22, armL: 22 }} rim={LOW.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s31 = () => {
  const f = useCurrentFrame();
  const gx = interpolate(f, [0, 70], [1.1, 2.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const gz = interpolate(f, [0, 70], [-2.0, -2.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const walking = f < 70;
  return (
    <>
      <Footsteps from={0} to={69} walk={1} surface="floor" volume={0.8} seed="girl-leave" />
      <Sfx name="door-close" at={80} volume={0.6} />
      <Scene3D mood="low" ambient={0.55} focus={1.5} cam={{ from: [0.1, 1.55, 3.0], look: [0.2, 1.0, -2.5], fov: 41 }}>
        <Hallway />
        <Puppet3D at={[-1.3, -2.55]} turn={55} emotion="sad" pose={{ slump: 0.8, armR: 52, armL: 20 }} rim={LOW.rim} {...him(1)} />
        <Puppet3D at={[gx, gz]} turn={125} walk={walking ? 1 : 0} emotion="happy" pose={{ armR: 18, armL: 18 }} rim={LOW.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s32 = () => {
  const f = useCurrentFrame();
  const open = interpolate(f, [20, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <>
      <Sfx name="door-open" at={22} volume={0.7} rate={1.4} />
      <Sfx name="cloth" at={70} volume={0.9} />
      <Sfx name="heartbeat" at={100} loopFor={50} volume={0.45} />
      <Scene3D mood="night" ambient={0.3} focus={1.7} cam={{ from: [0.6, 1.75, 2.0], look: [-1.1, 0.95, -3.0], fov: 40 }}
        overlay={<InnerFight urges={["Just five minutes.", "One more.", "After this."]} advice="Drawer." cx={640} cy={260} adviceDelay={70} />}>
        <Bedroom dust={0.4} plantDead chart="floor" phoneOn={0} drawerOpen={open} brokenScope={false} />
        {/* he stands right at the nightstand — the drawer is within arm's reach */}
        <Puppet3D at={[-1.5, -2.5]} turn={-110} emotion="tired" pose={{ slump: 0.85, armR: 62 + open * 16, elbowR: 44, armL: 20 }} rim={NIGHT.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s33 = () => {
  const f = useCurrentFrame();
  const hover = interpolate(f, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sfx name="vibrate" at={20} volume={0.7} />
      <Sfx name="cloth" at={50} volume={0.9} />
      <Scene3D mood="night" ambient={0.26} focus={2.4} cam={{ from: [-1.25, 1.55, -1.4], to: [-1.45, 1.45, -1.6], look: [-2.2, 0.62, -2.55], fov: 32 }}>
        <Bedroom dust={0.4} plantDead chart="floor" phoneOn={0} drawerOpen={1} brokenScope={false} showScope={false} />
        {/* the hand hovers just above the phone in the drawer, then stops */}
        <Hand at={[-2.18, 0.56 - hover * 0.05, -2.2]} rot={[R(-40), 0, R(-8)]} tremble={1.2} />
      </Scene3D>
    </>
  );
};

export const s34 = () => {
  const f = useCurrentFrame();
  const open = interpolate(f, [30, 80], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <>
      <Sfx name="laptop-close" at={74} volume={0.7} />
      <Sfx name="sigh" at={100} volume={0.75} />
      <Scene3D mood="night" ambient={0.28} focus={2.0} cam={{ from: [-1.15, 1.5, -1.2], look: [-2.15, 0.7, -2.7], fov: 36 }}>
        <Bedroom dust={0.4} plantDead chart="floor" phoneOn={0} drawerOpen={open} brokenScope={false} showScope={false} />
        {/* the hand rides the drawer all the way in as it closes */}
        <Hand at={[-2.2, 0.56, -2.24 - (1 - open) * 0.42]} rot={[R(-40), 0, R(-8)]} tremble={0.4} />
      </Scene3D>
    </>
  );
};

export const s35 = () => {
  const f = useCurrentFrame();
  // walk along the FRONT of the bed first, then round its right corner to the telescope
  const x = interpolate(f, [0, 55], [-1.0, 1.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const z = interpolate(f, [55, 95], [-1.2, -3.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const walking = f < 95;
  const wipe = interpolate(f, [100, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const turn = f < 95
    ? interpolate(f, [45, 60], [85, 168], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(f, [95, 112], [168, 143], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Footsteps from={0} to={94} walk={1} surface="floor" volume={0.8} seed="old-walk" />
      <Sfx name="cloth" at={110} volume={0.9} />
      <Sfx name="cloth" at={128} volume={0.9} />
      <Scene3D mood="night" ambient={0.32} focus={1.4} cam={{ from: [2.8, 1.65, 1.6], to: [2.7, 1.6, 1.35], look: [0.7, 1.0, -3.0], fov: 40 }}>
        <Bedroom dust={0.5} plantDead chart="floor" phoneOn={0} drawerOpen={0} brokenScope={false} />
        <Puppet3D at={[x, z]} turn={turn} walk={walking ? 1 : 0} emotion={walking ? "tired" : "focused"} pose={{ slump: 0.7 - wipe * 0.2, armR: walking ? 0 : 55 + wipe * 18, elbowR: walking ? 0 : 45 }} rim={NIGHT.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s36 = () => {
  const f = useCurrentFrame();
  const turn = interpolate(f, [0, 60], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sfx name="cloth" at={20} volume={0.9} />
      <Sfx name="cloth" at={70} volume={0.9} />
      <Scene3D mood="night" ambient={0.34} focus={2.4} cam={{ from: [2.45, 1.4, -2.2], to: [2.3, 1.38, -2.5], look: [1.9, 1.1, -3.15], fov: 30 }}>
        <Bedroom dust={0.5} plantDead chart="floor" phoneOn={0} drawerOpen={0} brokenScope={false} />
        {/* the hand turns the eyepiece at the bottom end of the tube */}
        <Hand at={[1.92, 1.14, -3.06]} rot={[R(-40), 0, R(turn)]} tremble={0.5} />
      </Scene3D>
    </>
  );
};

export const s37 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="sigh" at={20} volume={0.75} />
      <Sfx name="cloth" at={90} volume={0.9} />
      <Sfx name="plate-1" at={56} volume={0.32} rate={1.1} />
      <Sfx name="cloth" at={132} volume={0.7} />
      <Scene3D mood="night" ambient={0.34} focus={1.8} cam={{ from: [3.0, 1.7, 1.0], to: [2.85, 1.66, 0.75], look: [1.5, 1.15, -3.1], fov: 36 }}>
        <Bedroom dust={0.4} plantDead chart="floor" phoneOn={0} drawerOpen={0} brokenScope={false} />
        <Puppet3D at={[1.65, -3.2]} turn={143} emotion="focused" pose={{ slump: 0.55, armR: 62, elbowR: 35, armL: 40, headTilt: 18 }} rim={NIGHT.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s38 = () => {
  const f = useCurrentFrame();
  const look = interpolate(f, [55, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sfx name="vibrate" at={40} volume={0.7} />
      <Sfx name="heartbeat" at={60} volume={0.45} />
      <Sfx name="cloth" at={95} volume={0.9} />
      <Scene3D mood="night" ambient={0.3} focus={2.1} cam={CLOSE}>
        <Bedroom dust={0.4} plantDead chart="floor" phoneOn={0} drawerOpen={0} brokenScope={false} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} turn={look * 24} emotion={look > 0.4 ? "focused" : "tired"} pose={{ slump: 0.7, armR: 54, elbowR: 58, armL: 54, elbowL: 58, headTilt: look * -8 }} rim={NIGHT.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s39 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="sigh" at={30} volume={0.75} />
      <Sfx name="cloth" at={80} volume={0.9} />
      <Scene3D mood="low" ambient={0.5} focus={2.1} cam={CLOSE}>
        <Bedroom mood="low" dawn dust={0.3} plantDead chart="floor" phoneOn={0} drawerOpen={0} brokenScope={false} />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion={f > 60 ? "neutral" : "tired"} pose={{ slump: 0.75 - Math.min(f, 90) / 300, armR: 50, elbowR: 55, armL: 50, elbowL: 55 }} rim={LOW.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s40 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="plate-1" at={40} volume={0.35} rate={1.15} />
      <Sfx name="cloth" at={100} volume={0.9} />
      <Sfx name="plate-2" at={112} volume={0.3} rate={1.05} />
      <Scene3D mood="warm" ambient={0.56} focus={1.3} cam={WIDE}
        overlay={<TimeLabel text="A FEW WEEKS LATER" position="bottom" />}>
        <Bedroom mood="warm" plantFresh chart="new" phoneOn={0} drawerOpen={0} dawn />
        <Puppet3D at={[1.0, -2.95]} turn={145} emotion="focused" pose={{ slump: 0.3, armR: 60, elbowR: 40, armL: 35, headTilt: 12 }} rim={WARM.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

const CHECKS: ("check" | "")[] = ["check", "check", "", "check", "check", "check", "", "check", "check", "", "check", "check", "check", "", "check", "check", "check", "", "check", "check", "check", "", "check", "check", "", "check", "check", "check"];

export const s41 = () => {
  const { durationInFrames } = useVideoConfig();
  const markFrame = (i: number) => 8 + ((i + 1) * (durationInFrames - 18)) / CHECKS.length;
  return (
    <>
      {CHECKS.map((m, i) => m === "check" ? <Sfx key={i} name="marker-tap" at={markFrame(i) - 2} volume={0.55} rate={0.9 + (i % 3) * 0.08} /> : null)}
      <Writing from={4} to={86} tool="marker" volume={0.32} seed="nov" />
      <Calendar title="NOVEMBER" marks={CHECKS} />
    </>
  );
};

export const s42 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={30} volume={0.9} />
      <Sfx name="cloth" at={100} volume={0.9} />
      <Sfx name="step-floor-1" at={12} volume={0.35} />
      <Sfx name="plate-1" at={46} volume={0.32} rate={0.95} />
      <Scene3D mood="warm" ambient={0.56} focus={1.6} cam={{ from: [3.0, 1.7, 1.2], to: [2.8, 1.65, 0.95], look: [1.5, 1.05, -3.1], fov: 36 }}>
        <Bedroom mood="warm" plantFresh chart="new" phoneOn={0} drawerOpen={0} dawn />
        {/* the eyepiece sits at a kid's eye height, so she stands on the floor beside him */}
        <Puppet3D at={[2.3, -3.0]} turn={199} emotion="happy" pose={{ slump: 0.2, armR: 60, elbowR: 35, armL: 25 }} rim={WARM.rim} {...him(1)} />
        <Puppet3D at={[1.78, -3.0]} turn={168} emotion="focused" pose={{ slump: 0.05 }} rim={WARM.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s43 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="gasp" at={35} volume={0.85} />
      <Sfx name="cloth" at={60} volume={0.9} />
      <Sfx name="cloth" at={104} volume={0.7} />
      <Scene3D mood="warm" ambient={0.58} focus={2.5} cam={{ from: [1.05, 1.5, -2.3], to: [1.0, 1.46, -2.45], look: [1.78, 1.1, -3.05], fov: 30 }}>
        <Bedroom mood="warm" plantFresh chart="new" phoneOn={0} drawerOpen={0} dawn />
        <Puppet3D at={[1.78, -3.0]} turn={168} emotion={f > 35 ? "surprised" : "focused"} pose={{ slump: 0.05, headTilt: f > 35 ? -12 : 0 }} rim={WARM.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s44 = () => {
  const f = useCurrentFrame();
  const focus = interpolate(f, [0, 60, 120], [1.2, 3, 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sfx name="sigh" at={20} volume={0.75} />
      <Sfx name="cloth" at={80} volume={0.9} />
      <Sfx name="cloth" at={132} volume={0.7} />
      <Scene3D mood="warm" ambient={0.56} focus={focus} cam={{ from: [1.9, 1.55, 0.2], to: [1.8, 1.52, 0.0], look: [0.7, 1.1, -2.4], fov: 34 }}>
        <Bedroom mood="warm" plantFresh chart="new" phoneOn={0} drawerOpen={0} dawn />
        <Puppet3D at={[0.7, -2.12]} sit={0.54} emotion="happy" pose={{ slump: 0.12, armR: 50, elbowR: 58, armL: 50, elbowL: 58 }} rim={WARM.rim} {...him(1)} />
      </Scene3D>
    </>
  );
};

export const s45 = () => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, 120], [-1.4, -0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const gx = interpolate(f, [0, 120], [-0.7, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <>
      <Footsteps from={0} to={119} walk={1} surface="floor" volume={0.8} seed="roof-him" />
      <Footsteps from={0} to={119} walk={1} surface="floor" volume={0.8} seed="roof-girl" />
      <Scene3D mood="sunset" ambient={0.82} fog={[24, 70]} focus={1.0} cam={{ from: [3.6, 2.15, 4.2], look: [-0.1, 1.2, -2.2], fov: 42 }}>
        <Rooftop />
        <Puppet3D at={[x, -1.0]} turn={80} walk={1} emotion="happy" pose={{ slump: 0.1 }} rim={SUNSET.rim} {...him(1)} />
        <Puppet3D at={[gx, -0.95]} turn={80} walk={1} emotion="happy" pose={{ armR: 25, armL: 25 }} rim={SUNSET.rim} {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s46 = () => {
  const f = useCurrentFrame();
  const tilt = interpolate(f, [0, 40], [0, -22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sfx name="whoosh" at={30} volume={0.9} />
      <Sfx name="cloth" at={90} volume={0.9} />
      <Sfx name="gasp" at={102} volume={0.5} />
      <Scene3D mood="sunset" ambient={0.8} fog={[22, 65]} focus={1.2} cam={{ from: [1.2, 1.75, 3.2], look: [0.2, 2.6, -3.0], fov: 42 }}>
        <Rooftop meteorStart={28} />
        <Puppet3D at={[-0.45, -1.0]} turn={20} emotion="surprised" pose={{ slump: 0, headTilt: tilt, armR: 20 }} rim={SUNSET.rim} {...him(1)} />
        <Puppet3D at={[0.45, -1.0]} turn={-15} emotion="happy" pose={{ slump: 0, headTilt: tilt, armR: 150, armL: 140 }} rim={SUNSET.rim} blush {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s47 = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Sfx name="cloth" at={60} volume={0.9} />
      <Sfx name="sigh" at={118} volume={0.4} />
      <Sfx name="cloth" at={30} volume={0.7} />
      <Scene3D mood="sunset" ambient={0.78} fog={[26, 80]} focus={0.8} cam={{ from: [4.6, 2.6, 5.4], look: [0.1, 1.2, -2.6], fov: 46 }}>
        <Rooftop />
        <Puppet3D at={[-0.35, -1.0]} turn={40} emotion="happy" pose={{ slump: 0, headTilt: -18, armR: 18 }} rim={SUNSET.rim} {...him(1)} />
        <Puppet3D at={[0.5, -1.0]} turn={-25} emotion="happy" pose={{ slump: 0, headTilt: -18, armR: 150 }} rim={SUNSET.rim} blush {...GIRL} />
      </Scene3D>
    </>
  );
};

export const s48 = () => (
  <>
    <Sfx name="cloth" at={64} volume={0.7} />
    <Sfx name="sigh" at={120} volume={0.4} />
    <Scene3D mood="low" ambient={0.6} focus={1.2} cam={WIDE}>
      <Bedroom mood="low" dawn dust={0} plantFresh chart="new" phoneOn={0} drawerOpen={0} showScope={false} />
    </Scene3D>
  </>
);

export const s49 = () => <EndCard title="FIVE MINUTES" tagline="It takes your life one minute at a time." />;
