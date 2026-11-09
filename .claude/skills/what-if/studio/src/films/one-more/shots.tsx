import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Scene3D, Room, Block, Lamp3D, Window3D, ScreenGlow3D, Ground, Glow } from "../../lib3d/World";
import { Puppet3D } from "../../lib3d/Puppet3D";
import { OpeningLine, Line, InnerFight, EndCard, TimeLabel, PhoneScreen, ClockOverlay } from "../../lib/Text";
import { NIGHT, LOW, DUSK, BRIGHT } from "../../lib/palette";
import { Sfx, Footsteps, Typing } from "../../lib/Sound";

// SOUND: beds in storyboard.json → "ambience"; planned one-offs in its "sfx";
// sounds tied to the motion (typing, clicks, steps) here, outside <Scene3D>, on the same frames.

/*
  EXAMPLE FILM "ONE MORE" (3D mode) — a 37-second demo of the 3D kit.
  Copy the PATTERNS (sets as components, same framing for the loop,
  cast defined once), never the story.
*/

// ---- cast ----
const DAD = { seed: "dad", hair: "short" as const, props: [{ type: "hoodie" as const, color: "#2F4A6B" }] };
const SON = { seed: "son", kid: true, hair: "curls" as const, props: [{ type: "goggles" as const, color: "#8FB8D8" }, { type: "shoes" as const, color: "#C7473D" }] };
const MOM = { seed: "mom", hair: "bun" as const, props: [{ type: "scarf" as const, color: "#C98B5B" }] };

// ---- sets ----
const Bedroom: React.FC<{ screenOn?: number }> = ({ screenOn = 1 }) => (
  <group>
    <Room mood="night" />
    <Window3D at={[1.5, 1.7, -4.49]} glass="#1E2A44" glow={0.3} />
    <Block at={[0, 0, -2.8]} size={[2.2, 0.45, 2.4]} color="#2B2F3B" />{/* bed */}
    <Block at={[0, 0.45, -3.85]} size={[2.2, 0.6, 0.25]} color="#22252E" />{/* headboard */}
    <Block at={[0.4, 0.45, -3.4]} size={[0.7, 0.14, 0.4]} color="#C9CED8" />{/* pillow */}
    <Block at={[-2.1, 0, -3.6]} size={[0.8, 0.75, 0.6]} color="#2A2D36" />{/* bedside table */}
    <Lamp3D at={[-2.1, -3.6]} kind="desk" color={NIGHT.lamp} height={1.15} intensity={0.8} />
    {screenOn > 0 && <ScreenGlow3D at={[0.15, 0.95, -2.05]} strength={screenOn} />}
  </group>
);

const BedroomShot: React.FC<{ clock?: string; excuse?: string; typing?: [number, number]; clicks?: number[] }> = ({ clock, excuse, typing, clicks = [] }) => {
  const f = useCurrentFrame();
  // hands move on the keys only while he types — the sound follows the same frames
  const typingNow = typing && f >= typing[0] && f <= typing[1];
  const tap = typingNow ? Math.sin(f * 1.7) * 6 : 0;
  return (
    <>
      {typing && <Typing from={typing[0]} to={typing[1]} volume={0.45} />}
      {clicks.map((c) => <Sfx key={c} name="mouse-click" at={c} volume={0.45} />)}
      <Scene3D mood="night" ambient={0.35} cam={{ from: [3.2, 2.2, 2.4], look: [-0.2, 0.9, -2.6], fov: 38 }}
        overlay={<>{excuse && <Line text={excuse} voice="think" x={880} y={330} />}{clock && <ClockOverlay time={clock} />}</>}>
        <Bedroom />
        <Puppet3D at={[0, -2.2]} sit={0.45} emotion="tired" pose={{ armR: 50 + tap, elbowR: 40, armL: 50 - tap, elbowL: 40 }} rim={NIGHT.rim} {...DAD} />
      </Scene3D>
    </>
  );
};

const Kitchen: React.FC = () => (
  <group>
    <Room mood="low" />
    <Window3D at={[0, 1.7, -4.49]} glass="#DDE6EE" glow={0.7} />
    <Block at={[0, 0, -1.8]} size={[2.4, 0.75, 1.1]} color="#5B5550" />{/* table */}
    <Lamp3D at={[0, -1.8]} kind="ceiling" color={LOW.lamp} height={2.4} intensity={0.6} />
  </group>
);

// ---- shots ----
export const s01 = () => <OpeningLine text="Tonight always feels longer than it is." />;
export const s02 = () => <BedroomShot excuse="One more." typing={[12, 70]} clicks={[96, 118]} />;
export const s03 = () => <BedroomShot clock="1:12 AM" clicks={[10]} />;
export const s04 = () => <BedroomShot clock="2:47 AM" excuse="One more." clicks={[12]} />;
export const s05 = () => <PhoneScreen kind="alarm" time="6:30" label="Work" buzz />;

export const s06: React.FC = () => {
  const f = useCurrentFrame();
  // the son runs in from the right, stops, then waves
  const sx = interpolate(f, [0, 26], [2.6, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const running = f < 26;
  const raise = interpolate(f, [32, 48], [0, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
    <Footsteps from={0} to={25} walk={2.2} surface="floor" volume={0.55} seed="son" />
    <Sfx name="cloth" at={34} volume={0.5} />
    <Scene3D mood="low" ambient={0.5} cam={{ from: [0, 1.5, 3.4], to: [0, 1.4, 2.7], look: [0, 0.95, -1.4], fov: 40 }}
      overlay={<Line text="Dad? Look!" voice="say" x={1260} y={300} delay={30} />}>
      <Kitchen />
      <Puppet3D at={[-0.8, -1.0]} turn={20} emotion="tired" pose={{ slump: 0.85 }} rim={LOW.rim} {...DAD} />
      <Puppet3D at={[sx, -1.0]} turn={running ? -90 : -30} walk={running ? 2.2 : 0} emotion="happy" pose={{ armR: raise, armL: raise * 0.8 }} rim={LOW.rim} {...SON} />
    </Scene3D>
    </>
  );
};

export const s07: React.FC = () => {
  const f = useCurrentFrame();
  const mz = interpolate(f, [8, 38], [-4.6, -3.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
  <>
  <Footsteps from={8} to={37} walk={1} surface="floor" volume={0.45} seed="mom" />
  <Scene3D mood="dusk" ambient={0.45} cam={{ from: [-2.4, 1.5, 1.8], look: [0.6, 1.1, -2.4], fov: 36 }}
    overlay={<Line text="Close it at ten. Just tonight." voice="advice" x={1180} y={230} delay={25} />}>
    <Room mood="dusk" />
    <Block at={[1.3, 0, -4.45]} size={[1.0, 2.1, 0.05]} color="#E8B87A" emissive="#9A6B35" />{/* lit doorway */}
    <Lamp3D at={[1.3, -3.6]} kind="ceiling" color={DUSK.lamp} height={2.5} intensity={0.7} />
    <Puppet3D at={[1.3, mz]} turn={-20} walk={f >= 8 && f < 38 ? 1 : 0} emotion="happy" rim={DUSK.rim} {...MOM} />
    <Puppet3D at={[-1.3, -1.5]} turn={55} emotion="tired" rim={DUSK.rim} {...DAD} />
  </Scene3D>
  </>
  );
};

export const s08: React.FC = () => {
  const f = useCurrentFrame();
  const screen = interpolate(f, [114, 122], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reach = interpolate(f, [80, 112], [50, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
    {[22, 48, 66, 88].map((c) => <Sfx key={c} name="mouse-click" at={c} volume={0.4} />)}{/* slow, hesitant clicks */}
    <Scene3D mood="night" ambient={0.3} focus={2.2} cam={{ from: [2.4, 1.5, 0.6], to: [2.1, 1.45, 0.1], look: [-0.1, 0.9, -2.3], fov: 36 }}
      overlay={<InnerFight urges={["One more.", "It's early.", "Just this one."]} advice="Close it." cx={620} cy={250} adviceDelay={45} />}>
      <Bedroom screenOn={screen} />
      <Puppet3D at={[0, -2.2]} sit={0.45} emotion={f > 90 ? "focused" : "tired"} pose={{ armR: reach, elbowR: 40, armL: 50, elbowL: 40 }} rim={NIGHT.rim} {...DAD} />
    </Scene3D>
    </>
  );
};

export const s09: React.FC = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 150], [-1.5, -0.3]);
  return (
    <>
    <Footsteps from={0} to={150} walk={1} surface="grass" volume={0.55} seed="dad-walk" />
    <Footsteps from={0} to={150} walk={1.2} surface="grass" volume={0.4} seed="son-walk" />
    <Scene3D mood="bright" ambient={0.9} fog={[18, 60]} focus={1} cam={{ from: [4.5, 1.6, 4], to: [4.1, 1.6, 4.6], look: [0, 0.9, -1], fov: 40 }}
      overlay={<TimeLabel text="A FEW WEEKS LATER" position="bottom" />}>
      <directionalLight position={[5, 8, 4]} intensity={1.6} color="#FFF1D6" />
      <Ground color={BRIGHT.floor} />
      <mesh position={[0, -6, -26]}><sphereGeometry args={[14, 32, 16]} /><meshStandardMaterial color="#86B566" flatShading /></mesh>
      <mesh position={[-20, -8, -34]}><sphereGeometry args={[18, 32, 16]} /><meshStandardMaterial color="#7BA95E" flatShading /></mesh>
      <Glow at={[12, 14, -40]} color="#FFF4D6" size={12} strength={0.6} />
      <Puppet3D at={[-0.35, z]} walk={1} emotion="happy" rim={BRIGHT.rim} {...DAD} />
      <Puppet3D at={[0.45, z + 0.1]} walk={1.2} emotion="happy" blush rim={BRIGHT.rim} {...SON} />
    </Scene3D>
    </>
  );
};

export const s10 = () => <EndCard title="ONE MORE" tagline="The night is shorter than the morning." />;
