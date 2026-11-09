import React, { createContext, useContext } from "react";
import { Audio, Sequence, interpolate, random, staticFile, useVideoConfig } from "remotion";
import { LibrarySound } from "./sfxLibrary";

/*
  FOLEY — the small real sounds that make the film feel alive. Put these INSIDE a
  shot component, next to the animation they belong to. Frames are relative to the
  shot (the same frames you animate with), so the sound lands exactly on the action.

    <Sfx name="knock" at={12} />                                one sound at a frame
    <Footsteps from={0} to={90} walk={1} surface="floor" />     a step on every footfall (match the Puppet's `walk`)
    <Typing from={20} to={120} />                               keyboard clicks while the hands type
    <Writing from={30} to={100} tool="marker" />                marker squeaks on a board ("pen" / "pencil" on paper)
    <Sfx name="water-tap" at={10} loopFor={90} />               a looping sound for 90 frames

  Built-in sounds: public/sfx/LIBRARY.txt (and references/sound.md). A wrong name is a
  type error, so `npx tsc -p .` catches typos.
  Background ambience (room tone, night, rain, city…) is planned per scene in
  storyboard.json → "ambience", not here.
*/

/** Set by the Film for the silent background copy in Shorts. */
export const SoundMuted = createContext(false);

const src = (name: string) => staticFile(`sfx/${name}.mp3`);

export const Sfx: React.FC<{
  name: LibrarySound;
  at?: number; // frame in the shot
  volume?: number; // 0–1 (typical 0.4–0.9)
  loopFor?: number; // frames — for looping sounds (water, alarm, clock, pant)
  rate?: number; // playback speed / pitch, 0.85–1.15 for variety
}> = ({ name, at = 0, volume = 0.8, loopFor, rate = 1 }) => {
  const muted = useContext(SoundMuted);
  const { fps } = useVideoConfig();
  if (muted) return null;
  const fadeF = Math.round(fps * 0.15);
  return (
    <Sequence from={Math.round(at)} durationInFrames={loopFor} layout="none">
      <Audio
        src={src(name)}
        loop={!!loopFor}
        playbackRate={rate}
        volume={loopFor ? (f) => volume * interpolate(f, [0, fadeF, loopFor - fadeF, loopFor], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : volume}
      />
    </Sequence>
  );
};

/**
 * A footstep on every footfall of a Puppet / Puppet3D walking with the same `walk` value.
 * The rig's legs are fully spread (heel strike) when sin(frame × 0.22 × walk) = ±1,
 * so the steps are placed on exactly those frames between `from` and `to`.
 */
export const Footsteps: React.FC<{
  from?: number;
  to: number;
  walk?: number; // same number as the Puppet's walk prop (1 walk, 2.2 run)
  surface?: "floor" | "street" | "grass";
  volume?: number;
  seed?: string;
}> = ({ from = 0, to, walk = 1, surface = "floor", volume, seed = "steps" }) => {
  const frames: number[] = [];
  for (let k = 0; ; k++) {
    const f = Math.round((Math.PI / 2 + k * Math.PI) / (0.22 * walk));
    if (f > to) break;
    if (f >= from) frames.push(f);
  }
  const vol = volume ?? (walk > 1.5 ? 0.85 : 0.6);
  return (
    <>
      {frames.map((f, i) => (
        <Sfx key={f} name={`step-${surface}-${(i % 4) + 1}` as LibrarySound} at={f}
          volume={vol * (0.8 + 0.2 * random(`${seed}${i}`))} rate={0.94 + 0.12 * random(`${seed}r${i}`)} />
      ))}
    </>
  );
};

/** Keyboard typing: irregular key presses, a space bar now and then, short thinking pauses. */
export const Typing: React.FC<{ from?: number; to: number; speed?: number; volume?: number; seed?: string }> = ({ from = 0, to, speed = 1, volume = 0.55, seed = "type" }) => {
  const { fps } = useVideoConfig();
  const hits: { f: number; name: LibrarySound }[] = [];
  let f = from + 2;
  let i = 0;
  while (f < to) {
    const space = random(`${seed}s${i}`) < 0.17;
    hits.push({ f: Math.round(f), name: space ? "key-space" : (`key-${1 + Math.floor(random(`${seed}k${i}`) * 6)}` as LibrarySound) });
    const gap = (0.07 + random(`${seed}g${i}`) * 0.11) / speed;
    const pause = random(`${seed}p${i}`) < 0.06 ? 0.35 + random(`${seed}pp${i}`) * 0.4 : 0;
    f += (gap + pause) * fps;
    i++;
  }
  return <>{hits.map((h, j) => <Sfx key={j} name={h.name} at={h.f} volume={volume * (0.75 + 0.25 * random(`${seed}v${j}`))} />)}</>;
};

/**
 * Writing sounds. tool="marker": squeaky strokes on a whiteboard (starts with the tap of the tip).
 * tool="pen" / "pencil": scratchy handwriting on paper.
 */
export const Writing: React.FC<{ from?: number; to: number; tool?: "marker" | "pen" | "pencil"; volume?: number; seed?: string }> = ({ from = 0, to, tool = "marker", volume = 0.7, seed = "write" }) => {
  const { fps } = useVideoConfig();
  if (tool !== "marker") {
    return <Sfx name={tool === "pen" ? "pen-write" : "pencil-write"} at={from} loopFor={Math.max(1, to - from)} volume={volume} />;
  }
  const strokes: { f: number; name: LibrarySound; rate: number }[] = [];
  let f = from + 3;
  let i = 0;
  while (f < to - 4) {
    strokes.push({ f: Math.round(f), name: `marker-squeak-${1 + Math.floor(random(`${seed}${i}`) * 3)}` as LibrarySound, rate: 0.9 + random(`${seed}r${i}`) * 0.2 });
    f += (0.3 + random(`${seed}g${i}`) * 0.35) * fps;
    i++;
  }
  return (
    <>
      <Sfx name="marker-tap" at={from} volume={volume * 0.8} />
      {strokes.map((s, j) => <Sfx key={j} name={s.name} at={s.f} volume={volume} rate={s.rate} />)}
    </>
  );
};
