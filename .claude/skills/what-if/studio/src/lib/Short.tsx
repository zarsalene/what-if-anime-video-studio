import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { SERIF, SANS } from "./fonts";
import { Storyboard } from "./Film";

/*
  The Shorts cut-down (from the study): the 16:9 film sits in the middle of a
  9:16 frame, a blurred, zoomed copy fills the top and bottom, a one-line hook
  sits at the top, and the film title + "Full film on the channel" at the bottom.
  It keeps only the turning point (storyboard.short.startSec → endSec, ~25–45 s).
*/
const BG = 1920 / 1080 + 0.05;

export const ShortCut: React.FC<{ storyboard: Storyboard; Film: React.FC<{ muted?: boolean }> }> = ({ storyboard: sb, Film }) => {
  const f = useCurrentFrame();
  const short = sb.short!;
  const from = -Math.round(short.startSec * sb.fps);
  const o = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* blurred, zoomed copy filling the frame (scaled so its height = 1920) */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 1920, height: 1080, left: (1080 - 1920 * BG) / 2, top: (1920 - 1080 * BG) / 2, transform: `scale(${BG})`, transformOrigin: "top left", filter: "blur(18px) brightness(0.5)" }}>
          <Sequence from={from} layout="none"><AbsoluteFill><Film muted /></AbsoluteFill></Sequence>
        </div>
      </AbsoluteFill>
      {/* the film, centred */}
      <div style={{ position: "absolute", left: 0, top: (1920 - 607.5) / 2, width: 1080, height: 607.5, overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 1920, height: 1080, transform: "scale(0.5625)", transformOrigin: "top left", position: "relative" }}>
          <Sequence from={from} layout="none"><AbsoluteFill><Film /></AbsoluteFill></Sequence>
        </div>
      </div>
      <div style={{ position: "absolute", top: 300, left: 70, right: 70, textAlign: "center", color: "#F4F1EA", fontFamily: SANS, fontWeight: 700, fontSize: 58, lineHeight: 1.25, opacity: o, textShadow: "0 3px 16px rgba(0,0,0,0.7)" }}>
        {short.hook}
      </div>
      <div style={{ position: "absolute", bottom: 330, left: 0, right: 0, textAlign: "center", color: "#F4F1EA", opacity: o }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, letterSpacing: 14 }}>{sb.title}</div>
        <div style={{ fontFamily: SANS, fontSize: 30, opacity: 0.8, marginTop: 14 }}>Full film on the channel</div>
      </div>
    </AbsoluteFill>
  );
};
