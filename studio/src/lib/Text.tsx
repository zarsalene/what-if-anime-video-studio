import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SERIF, SANS, HAND } from "./fonts";
import { STORY, VOICE, Voice } from "./palette";
import { FilmLook } from "./Stage";

/*
  THE TEXT SYSTEM (from the study). There is no narrator and no voice acting:
  every word is on screen, most lines are 2–6 words, and text fades in over ~0.2 s.

   1. OpeningLine   — italic serif, white, centred on black, one sentence
   2. ConceptCard   — small spaced caps label + two-line italic serif definition, over a darkened scene
   3. Line          — spoken words: rounded hand font on a soft dark smudge (NO bubble box), near the speaker
                      colour = who is speaking: say (white) · think (orange) · shout (red) · care (light blue) · advice (yellow)
   4. QuoteCard     — serif on black, short REAL quote + small-caps author
   5. EndCard       — spaced serif caps title + one small italic line (or a question)
   + Interstitial   — three one-word sentences on black at the low point ("Safer. Quieter. Lonelier.")
   + InnerFight     — several lines at once: old urge loud + orange, new advice quieter + white
   + TimeLabel / ClockOverlay — time does the narrating
*/

const FADE = 6; // 0.2 s at 30 fps
const fadeIn = (f: number, delay = 0) => interpolate(f, [delay, delay + FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const fadeInOut = (f: number, dur: number, fin = 12, fout = 12) =>
  interpolate(f, [0, fin, dur - fout, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Black: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: "#070708", alignItems: "center", justifyContent: "center" }}>
    {children}
    <FilmLook grain={0.02} />
  </AbsoluteFill>
);

/* 1. Opening line */
export const OpeningLine: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Black>
      <div style={{ opacity: fadeInOut(f, durationInFrames, 18, 18), color: "#F4F1EA", fontFamily: SERIF, fontStyle: "italic", fontSize: 58, textAlign: "center", maxWidth: 1300, lineHeight: 1.4 }}>
        {text}
      </div>
    </Black>
  );
};

/* 2. Concept card — use as a Scene overlay (it darkens the scene under it). */
export const ConceptCard: React.FC<{ label: string; lines: [string, string] | [string]; delay?: number }> = ({ label, lines, delay = 0 }) => {
  const f = useCurrentFrame();
  const o = fadeIn(f, delay);
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * o})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: o, textAlign: "center", color: "#F4F1EA" }}>
        <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: 10, textTransform: "uppercase", opacity: 0.8, marginBottom: 26 }}>{label}</div>
        {lines.map((l, i) => <div key={i} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 50, lineHeight: 1.4 }}>{l}</div>)}
      </div>
    </AbsoluteFill>
  );
};

/*
  3. Line — a spoken line or inner thought. Put it in a Scene's `overlay`.
  (x, y) = centre of the text, placed near (usually just above) the speaker's head.
  voice: "say" | "think" | "shout" | "care" | "advice". Keep it to 2–6 words.
*/
export const Line: React.FC<{ text: string; x: number; y: number; voice?: Voice; delay?: number; size?: number; italic?: boolean; hold?: number }> = ({ text, x, y, voice = "say", delay = 0, size, italic, hold }) => {
  const f = useCurrentFrame();
  if (f < delay) return null;
  let o = fadeIn(f, delay);
  if (hold !== undefined) o *= interpolate(f, [delay + hold, delay + hold + FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shout = voice === "shout";
  const fs = size ?? (shout ? 60 : voice === "think" ? 44 : 46);
  const jitter = shout ? Math.sin(f * 1.7) * 2 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateX(${jitter}px)`, opacity: o, pointerEvents: "none" }}>
      {/* the soft dark smudge behind the words */}
      <div style={{ position: "absolute", inset: "-26px -46px", background: "radial-gradient(ellipse at center, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 72%)", filter: "blur(6px)" }} />
      <div style={{ position: "relative", whiteSpace: "nowrap", fontFamily: HAND, fontSize: fs, color: VOICE[voice], fontStyle: italic || voice === "think" ? "italic" : "normal", letterSpacing: 0.5, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
        {text}
      </div>
    </div>
  );
};

/* InnerFight — the old urge (loud, orange, big, many) against the new advice (quiet, white). Scene overlay. */
export const InnerFight: React.FC<{ urges: string[]; advice: string; cx?: number; cy?: number; adviceDelay?: number }> = ({ urges, advice, cx = 960, cy = 300, adviceDelay = 45 }) => {
  const f = useCurrentFrame();
  const spots = [[-360, -60], [300, -110], [-200, 90], [380, 70], [0, -170], [-420, 160]];
  const fadeUrges = interpolate(f, [adviceDelay + 20, adviceDelay + 50], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {urges.map((u, i) => (
        <div key={i} style={{ opacity: fadeUrges }}>
          <Line text={u} voice="think" x={cx + spots[i % spots.length][0]} y={cy + spots[i % spots.length][1]} delay={i * 8} size={56 + (i % 2) * 14} />
        </div>
      ))}
      <Line text={advice} voice="say" x={cx} y={cy + 230} delay={adviceDelay} size={40} />
    </>
  );
};

/* Interstitial — three one-word sentences on black, one after another. */
export const Interstitial: React.FC<{ words: [string, string, string] }> = ({ words }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const step = Math.floor((durationInFrames - 20) / 3);
  return (
    <Black>
      <div style={{ display: "flex", gap: 46, fontFamily: SERIF, fontSize: 64, color: "#F4F1EA", opacity: fadeInOut(f, durationInFrames, 1, 14) }}>
        {words.map((w, i) => <span key={i} style={{ opacity: fadeIn(f, 6 + i * step) }}>{w}</span>)}
      </div>
    </Black>
  );
};

/* 4. Quote card — ONLY a real, verified quote. Put the source in the storyboard. */
export const QuoteCard: React.FC<{ quote: string; author: string }> = ({ quote, author }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Black>
      <div style={{ opacity: fadeInOut(f, durationInFrames, 18, 18), textAlign: "center", color: "#F4F1EA", maxWidth: 1250 }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, lineHeight: 1.45 }}>“{quote}”</div>
        <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: 6, fontVariant: "small-caps", marginTop: 30, opacity: 0.75 }}>— {author}</div>
      </div>
    </Black>
  );
};

/* 5. End card — the habit in one word (spaced serif caps) + one small italic line. Or a question. */
export const EndCard: React.FC<{ title?: string; tagline?: string; question?: string }> = ({ title, tagline, question }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <Black>
      <div style={{ opacity: fadeInOut(f, durationInFrames, 20, 24), textAlign: "center", color: "#F4F1EA" }}>
        {question ? (
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 64, maxWidth: 1300, lineHeight: 1.3 }}>{question}</div>
        ) : (
          <>
            <div style={{ fontFamily: SERIF, fontSize: 96, letterSpacing: 26, paddingLeft: 26 }}>{title}</div>
            {tagline && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 32, marginTop: 26, opacity: fadeIn(f, 24) * 0.85 }}>{tagline}</div>}
          </>
        )}
      </div>
    </Black>
  );
};

/* Time labels — "MONDAY", "A FEW WEEKS LATER". Scene overlay, or position="center" over black. */
export const TimeLabel: React.FC<{ text: string; position?: "center" | "top-left" | "bottom" }> = ({ text, position = "top-left" }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pos: React.CSSProperties =
    position === "center" ? { inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }
      : position === "bottom" ? { left: 0, right: 0, bottom: 90, textAlign: "center" } : { left: 110, top: 90 };
  return (
    <div style={{ position: "absolute", ...pos, opacity: fadeInOut(f, durationInFrames, 8, 8), color: "#F4F1EA", fontFamily: SERIF, fontSize: position === "center" ? 54 : 36, letterSpacing: 8, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
      {text}
    </div>
  );
};

/* Big clock overlay — "9:33 PM" on top of a scene. */
export const ClockOverlay: React.FC<{ time: string }> = ({ time }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ opacity: fadeIn(f) * 0.92, fontFamily: SANS, fontWeight: 300 as any, fontSize: 200, color: "#F4F1EA", letterSpacing: -4, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>{time}</div>
    </AbsoluteFill>
  );
};

/*
  Phone screen — fills the frame like a real phone UI (story device).
  kind: "alarm" (big time + Snooze/Stop) · "timer" (orange ring counting) · "messages" (texts) ·
        "confirm" ("Order placed" check) · "lock" (time + notifications)
*/
export type PhoneProps =
  | { kind: "alarm"; time: string; label?: string; buzz?: boolean }
  | { kind: "timer"; seconds: number; label?: string } // counts down over the shot
  | { kind: "messages"; contact: string; messages: { from: "them" | "me"; text: string }[] }
  | { kind: "confirm"; title: string; sub?: string }
  | { kind: "lock"; time: string; date?: string; notes?: { app: string; text: string }[] };

export const PhoneScreen: React.FC<PhoneProps> = (p) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const shake = p.kind === "alarm" && p.buzz ? Math.sin(f * 2.2) * 6 : 0;
  const ink = "#F4F1EA";
  let screen: React.ReactNode = null;
  if (p.kind === "alarm") {
    screen = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center", gap: 18 }}>
        <div style={{ fontSize: 30, opacity: 0.7 }}>{p.label ?? "Alarm"}</div>
        <div style={{ fontSize: 132, fontWeight: 300 as any, letterSpacing: -4 }}>{p.time}</div>
        <div style={{ display: "flex", gap: 26, marginTop: 80 }}>
          <div style={{ padding: "18px 44px", borderRadius: 40, background: "#3A3F4B", fontSize: 30 }}>Snooze</div>
          <div style={{ padding: "18px 44px", borderRadius: 40, background: STORY.timer, color: "#1A1A1A", fontSize: 30, fontWeight: 600 }}>Stop</div>
        </div>
      </div>
    );
  } else if (p.kind === "timer") {
    const left = Math.max(0, p.seconds - Math.floor(f / fps));
    const frac = interpolate(f, [0, durationInFrames], [1, 0], { extrapolateRight: "clamp" });
    const c = 2 * Math.PI * 150;
    screen = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <svg width={360} height={360}>
          <circle cx={180} cy={180} r={150} stroke="#3A3F4B" strokeWidth={14} fill="none" />
          <circle cx={180} cy={180} r={150} stroke={STORY.timer} strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 180 180)" />
          <text x={180} y={200} textAnchor="middle" fontSize={64} fill={ink} fontFamily={SANS}>{`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</text>
        </svg>
        {p.label && <div style={{ fontSize: 30, opacity: 0.8, marginTop: 20 }}>{p.label}</div>}
      </div>
    );
  } else if (p.kind === "messages") {
    screen = (
      <div style={{ padding: "60px 26px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
        <div style={{ textAlign: "center", fontSize: 28, fontWeight: 600, marginBottom: 20 }}>{p.contact}</div>
        {p.messages.map((m, i) => (
          <div key={i} style={{ opacity: fadeIn(f, 10 + i * 18), alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "78%", padding: "14px 20px", borderRadius: 24, fontSize: 27, lineHeight: 1.3, background: m.from === "me" ? "#4F7FD8" : "#3A3F4B" }}>{m.text}</div>
        ))}
      </div>
    );
  } else if (p.kind === "confirm") {
    const s = spring({ frame: f - 6, fps, config: { damping: 12 } });
    screen = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 26 }}>
        <div style={{ width: 150, height: 150, borderRadius: 75, background: STORY.good, transform: `scale(${s})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 90, color: "#fff" }}>✓</div>
        <div style={{ fontSize: 44, fontWeight: 600 }}>{p.title}</div>
        {p.sub && <div style={{ fontSize: 26, opacity: 0.7 }}>{p.sub}</div>}
      </div>
    );
  } else {
    screen = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", paddingTop: 110 }}>
        {p.date && <div style={{ fontSize: 28, opacity: 0.75 }}>{p.date}</div>}
        <div style={{ fontSize: 128, fontWeight: 300 as any, letterSpacing: -4 }}>{p.time}</div>
        <div style={{ marginTop: 60, width: "90%", display: "flex", flexDirection: "column", gap: 14 }}>
          {(p.notes ?? []).map((n, i) => (
            <div key={i} style={{ opacity: fadeIn(f, 10 + i * 14), background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "14px 18px", fontSize: 24 }}>
              <b>{n.app}</b><div style={{ opacity: 0.85 }}>{n.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "#0C0E13" }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 450, background: "radial-gradient(circle, rgba(170,200,255,0.12), rgba(0,0,0,0) 70%)" }} />
      <div style={{ transform: `translateX(${shake}px)`, width: 470, height: 940, borderRadius: 64, background: "#050506", padding: 16, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 50, background: "linear-gradient(180deg, #232836, #151821)", color: ink, fontFamily: SANS, overflow: "hidden" }}>{screen}</div>
      </div>
      <FilmLook />
    </AbsoluteFill>
  );
};

/* Floating notification cards above a head, with red counts rising (overwhelm). Scene overlay. */
export const NotificationCards: React.FC<{ x: number; y: number; cards: { app: string; from: number; to: number }[] }> = ({ x, y, cards }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      {cards.map((c, i) => {
        const n = Math.round(interpolate(f, [10, durationInFrames - 10], [c.from, c.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
        const dx = (i - (cards.length - 1) / 2) * 230;
        const float = Math.sin(f / 18 + i) * 8;
        return (
          <div key={i} style={{ position: "absolute", left: x + dx, top: y + float - (i % 2) * 40, transform: "translate(-50%,-50%)", opacity: fadeIn(f, i * 6), background: "rgba(237,230,216,0.92)", color: "#2A2622", borderRadius: 18, padding: "14px 22px", fontFamily: SANS, fontSize: 26, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
            {c.app}
            <span style={{ position: "absolute", right: -14, top: -14, minWidth: 38, height: 38, borderRadius: 19, background: STORY.bad, color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>{n}</span>
          </div>
        );
      })}
    </>
  );
};

/*
  Calendar — the story's scoreboard. marks: one per day. "x" red X · "check" green check ·
  "circle" red pen circle (a date that matters) · "" empty. reveal: marks appear one by one.
*/
export const Calendar: React.FC<{ title: string; marks: ("x" | "check" | "circle" | "")[]; reveal?: boolean; cols?: number }> = ({ title, marks, reveal = true, cols = 7 }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const shown = reveal ? Math.floor(interpolate(f, [8, durationInFrames - 10], [0, marks.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : marks.length;
  const rows = Math.ceil(marks.length / cols);
  const cell = 110;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #4A4A50, #24252A)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: STORY.paper, padding: 40, borderRadius: 8, boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
        <div style={{ fontFamily: SERIF, fontSize: 46, color: STORY.paperInk, textAlign: "center", marginBottom: 20, letterSpacing: 6 }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)`, gap: 6 }}>
          {marks.map((m, i) => (
            <div key={i} style={{ border: "2px solid #B9AF9C", position: "relative", fontFamily: SANS, fontSize: 20, color: "#7A7062", padding: 6 }}>
              {i + 1}
              {i < shown && m === "x" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: STORY.bad, fontSize: 92, fontWeight: 700 }}>✕</div>}
              {i < shown && m === "check" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: STORY.good, fontSize: 84, fontWeight: 700 }}>✓</div>}
              {i < shown && m === "circle" && <div style={{ position: "absolute", inset: 8, border: `5px solid ${STORY.bad}`, borderRadius: "50%", transform: "rotate(-8deg)" }} />}
            </div>
          ))}
        </div>
      </div>
      <FilmLook />
    </AbsoluteFill>
  );
};

/* Feeling meter — the temper thermometer. Draw inside a Scene SVG beside the character. */
export const Thermometer: React.FC<{ x: number; y: number; from: number; to: number; color?: string }> = ({ x, y, from, to, color = STORY.bad }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const lvl = interpolate(f, [0, durationInFrames * 0.8], [from, to], { extrapolateRight: "clamp" });
  const h = 260;
  return (
    <g>
      <rect x={x - 18} y={y - h} width={36} height={h} rx={18} fill={STORY.paper} opacity={0.9} />
      <rect x={x - 10} y={y - h * lvl} width={20} height={h * lvl} rx={10} fill={color} />
      <circle cx={x} cy={y + 20} r={32} fill={color} />
      <circle cx={x} cy={y + 20} r={60} fill={color} opacity={0.25 + Math.sin(f / 8) * 0.08} style={{ filter: "blur(14px)" }} />
    </g>
  );
};
