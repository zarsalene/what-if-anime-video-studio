import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Puppet } from "../../lib/Puppet";
import { Scene, Backdrop, LightPool, Lamp, ScreenGlow, Window, Box, Layer } from "../../lib/Stage";
import { OpeningLine, Line, Interstitial, InnerFight, EndCard, TimeLabel, PhoneScreen, Calendar, ClockOverlay } from "../../lib/Text";
import { INK, NIGHT, DUSK, WARM, STORY } from "../../lib/palette";
import { Sfx, Footsteps } from "../../lib/Sound";

// SOUND: background beds are in storyboard.json → "ambience"; one-off planned sounds in
// its "sfx"; sounds tied to the animation (steps, scrubbing, marker) are placed here,
// OUTSIDE the <Scene> (never inside the SVG), on the same frames as the motion.

/*
  EXAMPLE FILM "LATER" (2D mode) — a 48-second demo of the kit.
  Real films are 3–5.5 minutes. Copy the PATTERNS, never the story.
  One exported component per shot id in storyboard.json.
*/

// ---- the cast: defined once, spread into every Puppet -------------------
const DAD = { seed: "dad", scale: 1.3, hair: "short" as const, props: [{ type: "hoodie" as const, color: "#6B2A2E" }] };
const MIA = { seed: "mia", scale: 1.15, kid: true, hair: "pigtails" as const, props: [{ type: "bow" as const, color: "#E59AAE" }, { type: "shoes" as const, color: "#E59AAE" }] };
const NEIGHBOUR = { seed: "old", scale: 1.25, props: [{ type: "cap" as const, color: "#8E6E4E" }, { type: "glasses" as const, color: "#EDE6D8" }] };

// ---- reusable set: the kitchen, always the same framing ------------------
const FLOOR = 860;
const Kitchen: React.FC<{ mood: "night" | "dusk" | "warm"; plates: number }> = ({ mood, plates }) => {
  const m = mood === "night" ? NIGHT : mood === "dusk" ? DUSK : WARM;
  return (
    <g>
      <Backdrop mood={mood} horizon={FLOOR} indoor />
      <Layer blur={mood === "warm" ? 0 : 1.5}>
        <Window x={1400} y={250} glass={mood === "warm" ? "#CFE2EE" : "#1A2232"} />
      </Layer>
      <Lamp x={1180} floorY={FLOOR} kind="ceiling" color={m.lamp} height={560} on={mood === "warm" ? 0.6 : 1} />
      {mood === "warm" && <LightPool x={1530} y={420} r={700} color={m.lamp} strength={0.55} />}
      <Box x={980} y={620} w={760} h={240} color={mood === "warm" ? "#6E5A45" : "#1A1D25"} r={4} />
      <Box x={960} y={605} w={800} h={22} color={mood === "warm" ? "#8A735A" : "#2A2F3A"} r={4} />
      <Box x={1420} y={608} w={200} h={14} color={mood === "warm" ? "#B9C2C9" : "#3B4352"} r={6} />
      <path d="M 1520 608 L 1520 540 Q 1520 520 1545 520 L 1570 520" stroke={mood === "warm" ? "#B9C2C9" : "#3B4352"} strokeWidth={10} fill="none" />
      <PlatePile x={1150} y={605} n={plates} />
    </g>
  );
};

const PlatePile: React.FC<{ x: number; y: number; n: number }> = ({ x, y, n }) => (
  <g>
    {Array.from({ length: n }).map((_, i) => {
      const lean = n > 15 ? (i - 15) * 1.8 : 0;
      return <rect key={i} x={x - 70 + Math.max(0, lean) + ((i * 37) % 7) - 3} y={y - 14 - i * 13} width={140} height={11} rx={5} fill={STORY.paper} opacity={0.82} />;
    })}
  </g>
);

const Couch: React.FC<{ x: number }> = ({ x }) => (
  <g fill={INK}>
    <rect x={x} y={FLOOR - 245} width={520} height={160} rx={36} />
    <rect x={x} y={FLOOR - 95} width={520} height={60} rx={20} />
    <rect x={x - 24} y={FLOOR - 160} width={70} height={140} rx={24} />
    <rect x={x + 474} y={FLOOR - 160} width={70} height={140} rx={24} />
    <rect x={x + 20} y={FLOOR - 40} width={20} height={40} /><rect x={x + 480} y={FLOOR - 40} width={20} height={40} />
  </g>
);

// ---- the loop: same framing every time, only the pile and the excuse change ----
const Loop: React.FC<{ plates: number; excuse?: string; clock?: string; taps?: number[] }> = ({ plates, excuse, clock, taps = [] }) => (
  <>
  {taps.map((f) => <Sfx key={f} name="mouse-click" at={f} volume={0.5} rate={1.3} />)}{/* thumb taps on the phone */}
  <Scene mood="night" overlay={<>{excuse && <Line text={excuse} voice="think" x={540} y={420} />}{clock && <ClockOverlay time={clock} />}</>}>
    <Kitchen mood="night" plates={plates} />
    <Couch x={260} />
    <Puppet x={500} y={FLOOR} sit emotion="tired" pose={{ armR: 70, elbowR: -60 }} rim={NIGHT.rim} {...DAD} />
    <ScreenGlow x={590} y={FLOOR - 250} strength={0.3} />
  </Scene>
  </>
);

export const s01 = () => <OpeningLine text="Later always sounds like a plan." />;
export const s02 = () => <Loop plates={3} excuse="Later." taps={[20, 52, 61, 98, 120]} />;
export const s03 = () => <Loop plates={6} excuse="Later." />;
export const s04 = () => <Loop plates={11} excuse="Tomorrow." />;
export const s05 = () => <Loop plates={16} clock="11:48 PM" />;
export const s06 = () => <Loop plates={21} excuse="Later." />;

export const s07 = () => (
  <PhoneScreen kind="messages" contact="Mia" messages={[{ from: "them", text: "Coming over tonight!" }, { from: "them", text: "Can we have tea? 🙂" }]} />
);

export const s08: React.FC = () => {
  const f = useCurrentFrame();
  // Mia walks in from the left and stops at the pile — a footstep on every footfall
  const x = interpolate(f, [0, 45], [700, 1010], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const walking = f < 45;
  return (
    <>
      <Footsteps from={0} to={44} walk={1} surface="floor" volume={0.5} seed="mia" />
      <Scene mood="night" camera={{ type: "push", amount: 0.1, focusX: 760, focusY: 600 }}
        overlay={<Line text="No clean cups?" voice="say" x={1010} y={500} delay={60} />}>
        <Kitchen mood="night" plates={21} />
        <Puppet x={600} y={FLOOR} facing={1} emotion="sad" pose={{ slump: 0.75 }} rim={NIGHT.rim} {...DAD} />
        <Puppet x={x} y={FLOOR} facing={1} walk={walking ? 1 : 0} emotion={walking ? "happy" : "surprised"} rim={NIGHT.rim} {...MIA} />
      </Scene>
    </>
  );
};

export const s09 = () => <Interstitial words={["Tired.", "Behind.", "Ashamed."]} />;

export const s10: React.FC = () => (
  <Scene mood="dusk" overlay={<Line text="Don't wash them all. Wash one." voice="advice" x={1330} y={380} delay={30} />}>
    <Backdrop mood="dusk" horizon={FLOOR} indoor />
    <rect x={1180} y={300} width={300} height={560} fill="#E8B87A" opacity={0.8} />
    <LightPool x={1330} y={FLOOR + 20} r={480} flat={0.3} color="#E8B87A" strength={0.5} />
    <LightPool x={1330} y={560} r={520} color="#E8B87A" strength={0.25} />
    <Puppet x={1320} y={FLOOR} facing={-1} emotion="happy" pose={{ armR: 50 }} rim={DUSK.rim} {...NEIGHBOUR} />
    <Puppet x={720} y={FLOOR} facing={1} emotion="neutral" rim={DUSK.rim} {...DAD} />
  </Scene>
);

export const s11: React.FC = () => {
  const f = useCurrentFrame();
  const scrub = f > 75 ? Math.sin(f / 4) * 18 : 0; // starts washing once the advice lands
  return (
    <>
      <Sfx name="water-tap" at={72} loopFor={78} volume={0.35} />{/* tap on when he starts */}
      <Sfx name="plate-2" at={95} volume={0.35} />
      <Sfx name="plate-3" at={124} volume={0.3} />
      <Scene mood="dusk" camera={{ type: "push", amount: 0.06, focusX: 1480, focusY: 560 }}
        overlay={<InnerFight urges={["Later.", "Too tired.", "Tomorrow."]} advice="Just one." cx={760} cy={330} adviceDelay={50} />}>
        <Kitchen mood="dusk" plates={20} />
        <Puppet x={1480} y={FLOOR} facing={1} emotion={f < 70 ? "tired" : "focused"} pose={{ armR: 75 + scrub, elbowR: -45 }} rim={DUSK.rim} {...DAD} />
      </Scene>
    </>
  );
};

const SQUEAKS = ["marker-squeak-1", "marker-squeak-2", "marker-squeak-3"] as const;
const MARKS: ("x" | "check")[] = ["x", "x", "x", "x", ...Array(17).fill("check")];
export const s12: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  // the Calendar reveals mark i at frame 8 + (i+1)·(duration−18)/marks — one marker sound per mark
  const markFrame = (i: number) => 8 + ((i + 1) * (durationInFrames - 18)) / MARKS.length;
  return (
    <>
      {MARKS.map((m, i) => (
        // a squeaky stroke for each red X, a quick tap-and-flick for each check
        <Sfx key={i} name={m === "x" ? SQUEAKS[i % 3] : "marker-tap"} at={markFrame(i) - 2} volume={m === "x" ? 0.35 : 0.3} rate={m === "x" ? 1 : 0.9 + (i % 3) * 0.08} />
      ))}
      <Calendar title="NOVEMBER" marks={MARKS} />
      <TimeLabel text="A FEW WEEKS LATER" position="bottom" />
    </>
  );
};

export const s13: React.FC = () => {
  const f = useCurrentFrame();
  const sip = interpolate(f, [60, 80, 100], [80, 120, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
    <Sfx name="cup-down" at={12} volume={0.6} />
    <Sfx name="cloth" at={58} volume={0.6} />
    <Sfx name="cup-down" at={104} volume={0.4} rate={1.1} />
    <Scene mood="warm" camera={{ type: "push", amount: 0.05, focusX: 900, focusY: 600 }}>
      <Kitchen mood="warm" plates={0} />
      <Puppet x={780} y={FLOOR} facing={1} emotion="happy" pose={{ armR: sip, elbowR: -70 }} rim={WARM.rim} {...DAD} />
      <Puppet x={1010} y={FLOOR} facing={-1} emotion="happy" blush pose={{ armR: 85, elbowR: -70 }} rim={WARM.rim} {...MIA} />
    </Scene>
    </>
  );
};

export const s14 = () => <EndCard title="LATER" tagline="One plate is enough to start." />;
