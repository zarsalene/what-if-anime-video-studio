import React from "react";
import { SoundMuted } from "./Sound";
import { SFX_LIBRARY } from "./sfxLibrary";
import { AbsoluteFill, Audio, interpolate, Sequence, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/*
  Turns storyboard.json + a map of shot components into the finished film.
  Shot order and length come ONLY from storyboard.json, so the plan and the
  video can never drift apart. To change timing, edit storyboard.json.
*/

export type ShotPlan = {
  id: string;
  beat: number; // story beat or escalation stage
  kind: "card" | "story" | "montage" | "insert"; // insert = close-up of a key object (phone, calendar, note)
  seconds: number;
  what: string; // one plain sentence: what the viewer sees
  fadeOut?: boolean; // fade to black at the end (big time jumps). Shots before a card fade automatically.
  // sound effects placed by the plan: a built-in library name (no prompt needed), or a new
  // sound made with ElevenLabs by audio.py (give a prompt)
  sfx?: { at: number; name: string; prompt?: string; seconds?: number; volume?: number }[];
  foley?: string[]; // what the shot's code plays (Footsteps, Typing, Writing, Sfx) — for the checker
  narration?: { startSec: number; endSec: number }[]; // local speech windows; music/effects duck automatically
};

export type Storyboard = {
  slug: string;
  title: string;
  premise?: string;
  habit?: string; // retained for the legacy demo compositions
  format?: "short" | "long";
  mode?: "2d" | "3d"; // anime illustration layers or stylized 3D. Default 2d.
  fps: number;
  short?: { startSec: number; endSec: number; hook: string }; // the 9:16 cut-down (turning point only)
  music?: { name: string; startSec: number; endSec: number; volume?: number }[];
  // background sound under every scene (room tone, night, rain, city…) — a built-in amb-* sound
  ambience?: { name: string; startSec: number; endSec: number; volume?: number }[];
  shots: ShotPlan[];
};

export type AudioManifest = {
  sfx: string[]; // names of sfx files that really exist in public/films/<slug>/sfx/
  music: string[]; // names of music files that really exist in public/films/<slug>/music/
};

export const filmLength = (sb: Storyboard) =>
  sb.shots.reduce((a, s) => a + Math.round(s.seconds * sb.fps), 0);

const FadeOut: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const Missing: React.FC<{ id: string }> = ({ id }) => (
  <AbsoluteFill style={{ background: "#400", color: "#fff", fontSize: 60, alignItems: "center", justifyContent: "center" }}>
    MISSING SHOT: {id}
  </AbsoluteFill>
);

export const Film: React.FC<{
  storyboard: Storyboard;
  shots: Record<string, React.FC>;
  audio: AudioManifest;
  muted?: boolean; // used for the blurred background copy in Shorts
}> = ({ storyboard: sb, shots, audio, muted = false }) => {
  const fps = sb.fps;
  let cursor = 0;
  const sfxSequences: React.ReactNode[] = [];
  const voiceWindows: [number, number][] = [];
  let scan = 0;
  for (const s of sb.shots) {
    for (const line of s.narration ?? []) {
      voiceWindows.push([scan + Math.round(line.startSec * fps), scan + Math.round(line.endSec * fps)]);
    }
    scan += Math.round(s.seconds * fps);
  }
  const duck = (globalFrame: number) => {
    for (const [start, end] of voiceWindows) {
      if (globalFrame < start - 8 || globalFrame > end + 10) continue;
      const fadeIn = interpolate(globalFrame, [start - 8, start], [1, 0.28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fadeOut = interpolate(globalFrame, [end, end + 10], [0.28, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return Math.min(fadeIn, fadeOut);
    }
    return 1;
  };
  for (const s of sb.shots) {
    const len = Math.round(s.seconds * fps);
    for (const fx of s.sfx ?? []) {
      if (muted) continue;
      // the film's own sound (made by audio.py) wins; else the built-in library; else skip, never crash
      const file = audio.sfx.includes(fx.name) ? `films/${sb.slug}/sfx/${fx.name}.mp3`
        : (SFX_LIBRARY as readonly string[]).includes(fx.name) ? `sfx/${fx.name}.mp3` : null;
      if (!file) continue;
      const at = cursor + Math.round(fx.at * fps);
      sfxSequences.push(
        <Sequence key={`${s.id}-${fx.name}-${fx.at}`} from={at} layout="none">
          <Audio src={staticFile(file)} volume={(f) => (fx.volume ?? 0.2) * duck(at + f)} />
        </Sequence>
      );
    }
    cursor += len;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SoundMuted.Provider value={muted}>
      <Series>
        {sb.shots.map((s, i) => {
          const C = shots[s.id];
          const len = Math.round(s.seconds * fps);
          const body = C ? <C /> : <Missing id={s.id} />;
          // From the study: a fade to black comes before every text card.
          const next = sb.shots[i + 1];
          const fade = s.fadeOut || (s.kind !== "card" && next?.kind === "card");
          return (
            <Series.Sequence key={s.id} durationInFrames={len}>
              {fade ? <FadeOut frames={Math.min(20, Math.floor(len / 2))}>{body}</FadeOut> : body}
            </Series.Sequence>
          );
        })}
      </Series>
      </SoundMuted.Provider>

      {(sb.ambience ?? []).filter((a) => !muted && (SFX_LIBRARY as readonly string[]).includes(a.name)).map((a) => {
        const from = Math.round(a.startSec * fps);
        const dur = Math.round((a.endSec - a.startSec) * fps);
        const v = a.volume ?? 0.14;
        return (
          <Sequence key={`amb-${a.name}-${a.startSec}`} from={from} durationInFrames={dur} layout="none">
            <Audio src={staticFile(`sfx/${a.name}.mp3`)} loop
              volume={(f) => interpolate(f, [0, fps * 0.5, dur - fps * 0.5, dur], [0, v, v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * duck(from + f)} />
          </Sequence>
        );
      })}

      {(sb.music ?? []).filter((m) => !muted && audio.music.includes(m.name)).map((m) => {
        const from = Math.round(m.startSec * fps);
        const dur = Math.round((m.endSec - m.startSec) * fps);
        return (
          <Sequence key={m.name + m.startSec} from={from} durationInFrames={dur} layout="none">
            <Audio
              src={staticFile(`films/${sb.slug}/music/${m.name}.mp3`)}
              volume={(f) => interpolate(f, [0, fps * 2, dur - fps * 2, dur], [0, m.volume ?? 0.22, m.volume ?? 0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * duck(from + f)}
            />
          </Sequence>
        );
      })}
      {sfxSequences}
    </AbsoluteFill>
  );
};
