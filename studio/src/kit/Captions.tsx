import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SANS } from "../lib/fonts";

// One spoken word, in film frames.
export type Word = { text: string; from: number; to: number };

const MAX_WORDS = 3;

// Group words into short pages (max 3 words, a new page after a pause).
const paginate = (words: Word[]) => {
  const pages: Word[][] = [];
  for (const w of words) {
    const last = pages[pages.length - 1];
    if (!last || last.length >= MAX_WORDS || w.from - last[last.length - 1].to > 8) pages.push([w]);
    else last.push(w);
  }
  return pages;
};

// Word-by-word captions: the spoken word is yellow. Placed above the Shorts UI zone.
export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const pages = React.useMemo(() => paginate(words), [words]);
  const page = pages.find((p, i) => frame >= p[0].from && frame < Math.min(pages[i + 1]?.[0].from ?? Infinity, p[p.length - 1].to + 12));
  if (!page) return null;
  const pop = interpolate(frame - page[0].from, [0, 4], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ top: 1300, height: 240, alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
      <div style={{ transform: `scale(${pop})`, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 92, lineHeight: 1.1, textTransform: "uppercase", WebkitTextStroke: "14px #0b0f1e", paintOrder: "stroke fill", letterSpacing: 1 }}>
        {page.map((w, i) => (
          <span key={i} style={{ color: frame >= w.from && frame < w.to + 2 ? "#FFD84D" : "#FFFFFF" }}>{w.text.replace(/[.,!?]$/, "")} </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
