import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { AudioManifest, Film, ShotPlan, Storyboard } from "../lib/Film";
import { Captions, Word } from "./Captions";
import { SCENES } from "./scenes";

/*
  KIT FILM — a film made only from storyboard.json. Each shot names a kit scene and
  its props, plus the line to say. kit_tts.py makes the voice and word timings
  (captions.json); shots grow to fit their line, captions follow the voice word by word.
*/

export const SAY_AT = 0.3; // seconds into the shot where the line starts (kit_tts.py uses the same)
const TAIL = 0.45; // breath after the line before the cut

export type KitCaptions = Record<string, { dur: number; words: { text: string; start: number; end: number }[] }>;

export const kitStoryboard = (raw: Storyboard, captions: KitCaptions): Storyboard => ({
  ...raw,
  shots: raw.shots.map((s, i) => {
    if (!s.scene || !SCENES[s.scene]) throw new Error(`shot ${s.id}: scene "${s.scene}" is unknown. Use one of: ${Object.keys(SCENES).join(", ")}`);
    const dur = s.say ? captions[s.id]?.dur ?? 0 : 0;
    return {
      ...s,
      beat: s.beat ?? i + 1,
      kind: s.kind ?? "story",
      what: s.what ?? s.say ?? s.scene,
      seconds: Math.max(s.seconds, s.say ? SAY_AT + dur + TAIL : 0),
      narration: s.say ? [{ at: SAY_AT, text: s.say, startSec: SAY_AT, endSec: SAY_AT + dur }] : s.narration,
    } as ShotPlan;
  }),
});

export const kitShots = (sb: Storyboard) =>
  Object.fromEntries(sb.shots.map((s) => {
    const Scene = SCENES[s.scene!];
    const props = s.props ?? {};
    return [s.id, () => <Scene {...props} />];
  })) as Record<string, React.FC>;

export const KitFilm: React.FC<{ sb: Storyboard; audio: AudioManifest; captions: KitCaptions; muted?: boolean }> = ({ sb, audio, captions, muted }) => {
  const shots = useMemo(() => kitShots(sb), [sb]);
  const words = useMemo(() => {
    const out: Word[] = [];
    let cursor = 0;
    for (const s of sb.shots) {
      for (const w of s.say ? captions[s.id]?.words ?? [] : []) {
        out.push({ text: w.text, from: cursor + Math.round((SAY_AT + w.start) * sb.fps), to: cursor + Math.round((SAY_AT + w.end) * sb.fps) });
      }
      cursor += Math.round(s.seconds * sb.fps);
    }
    return out;
  }, [sb, captions]);
  return (
    <AbsoluteFill>
      <Film storyboard={sb} shots={shots} audio={audio} muted={muted} />
      {!muted && <Captions words={words} />}
    </AbsoluteFill>
  );
};
