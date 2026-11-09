import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { MOODS, Mood, MoodName, INK } from "./palette";

export const W = 1920;
export const H = 1080;
const moodOf = (m: MoodName | Mood) => (typeof m === "string" ? MOODS[m] : m);

/*
  <Scene> is the frame for EVERY picture shot in the 2D mode. It gives you:
   - a 1920x1080 SVG to draw in
   - the camera (still / slow push-in / pan / slow drift)
   - the film look on top: heavy vignette, very light grain, slight desaturation.
   Children are drawn back to front. Wrap far things in <Layer blur={…}> for depth.
*/
export type Camera =
  | { type: "still" }
  | { type: "push"; amount?: number; focusX?: number; focusY?: number } // emotional beat
  | { type: "pan"; from: number; to: number } // follow a car / runner (px)
  | { type: "drift"; amount?: number }; // very slow sideways drift on wide shots

export const Scene: React.FC<{
  mood?: MoodName | Mood;
  camera?: Camera;
  children: React.ReactNode;
  overlay?: React.ReactNode; // text and UI on top — not moved by the camera
  grain?: number;
}> = ({ mood = "night", camera = { type: "still" }, children, overlay, grain }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const m = moodOf(mood);
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  let transform = "";
  if (camera.type === "push") {
    const s = 1 + (camera.amount ?? 0.08) * t;
    const fx = camera.focusX ?? W / 2, fy = camera.focusY ?? H / 2;
    transform = `translate(${fx} ${fy}) scale(${s}) translate(${-fx} ${-fy})`;
  } else if (camera.type === "pan") {
    transform = `translate(${-(camera.from + (camera.to - camera.from) * t)} 0)`;
  } else if (camera.type === "drift") {
    const a = camera.amount ?? 40;
    transform = `translate(${W / 2} ${H / 2}) scale(1.04) translate(${-W / 2 - a / 2 + a * t} ${-H / 2})`;
  }
  return (
    <AbsoluteFill style={{ backgroundColor: m.skyTop }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ filter: "saturate(0.88)" }}>
        <g transform={transform}>{children}</g>
      </svg>
      {overlay}
      <FilmLook grain={grain} />
    </AbsoluteFill>
  );
};

/* Heavy vignette + very light grain. Always on, on every frame. */
export const FilmLook: React.FC<{ grain?: number; vignette?: number }> = ({ grain = 0.035, vignette = 0.7 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 12;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {grain > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "overlay", opacity: grain * 4 }}>
          <filter id={`g${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width={W} height={H} filter={`url(#g${seed})`} />
        </svg>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(0,0,0,${vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

/* Depth: blur a whole group. Far background 4–8, foreground objects in close shots 6–12. */
export const Layer: React.FC<{ blur?: number; opacity?: number; children: React.ReactNode }> = ({ blur = 0, opacity = 1, children }) => (
  <g style={{ filter: blur ? `blur(${blur}px)` : undefined }} opacity={opacity}>{children}</g>
);

/* Wall/sky gradient + floor. horizon = y of the floor line. */
export const Backdrop: React.FC<{ mood?: MoodName | Mood; horizon?: number; indoor?: boolean }> = ({ mood = "night", horizon = 820, indoor = false }) => {
  const m = moodOf(mood);
  const id = `bd-${horizon}-${indoor}-${m.wall.slice(1)}`;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={indoor ? m.wall : m.skyTop} />
          <stop offset="1" stopColor={indoor ? m.wall : m.skyBottom} />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.floor} />
          <stop offset="1" stopColor={INK} stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <rect x={-2000} y={-200} width={W + 4000} height={horizon + 200} fill={`url(#${id}-sky)`} />
      <rect x={-2000} y={horizon} width={W + 4000} height={H - horizon + 300} fill={`url(#${id}-floor)`} />
    </g>
  );
};

/* Soft round pool of light (on a wall or floor). */
export const LightPool: React.FC<{ x: number; y: number; r?: number; color: string; strength?: number; flat?: number }> = ({ x, y, r = 380, color, strength = 0.55, flat = 1 }) => {
  const id = `lp-${Math.round(x)}-${Math.round(y)}-${Math.round(r)}`;
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={strength} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={r} ry={r * flat} fill={`url(#${id})`} />
    </g>
  );
};

/*
  A practical light — the lamps carry the mood. Draws the lamp, a bloom around
  the bulb and a pool of light on the floor.
  kind: "street" (pole), "ceiling" (hanging), "desk", "floor".
*/
export const Lamp: React.FC<{ x: number; floorY: number; kind?: "street" | "ceiling" | "desk" | "floor"; color: string; height?: number; on?: number }> = ({ x, floorY, kind = "floor", color, height, on = 1 }) => {
  const h = height ?? (kind === "street" ? 620 : kind === "ceiling" ? 520 : kind === "desk" ? 140 : 300);
  const bulbY = kind === "ceiling" ? floorY - h : floorY - h;
  return (
    <g>
      <LightPool x={x} y={floorY + 10} r={kind === "street" ? 340 : 240} flat={0.22} color={color} strength={0.55 * on} />
      <LightPool x={x} y={bulbY + 20} r={kind === "street" ? 420 : 300} color={color} strength={0.32 * on} />
      {kind === "street" && <g fill={INK}><rect x={x - 7} y={bulbY} width={14} height={h} /><path d={`M ${x - 40} ${bulbY + 6} L ${x + 40} ${bulbY + 6} L ${x + 22} ${bulbY - 18} L ${x - 22} ${bulbY - 18} Z`} /></g>}
      {kind === "ceiling" && <g fill={INK}><rect x={x - 2} y={-200} width={4} height={bulbY + 200} /><path d={`M ${x - 55} ${bulbY + 18} Q ${x} ${bulbY - 40} ${x + 55} ${bulbY + 18} Z`} /></g>}
      {kind === "floor" && <g fill={INK}><rect x={x - 4} y={bulbY} width={8} height={h} /><rect x={x - 30} y={floorY - 6} width={60} height={8} rx={4} /><path d={`M ${x - 46} ${bulbY + 30} L ${x + 46} ${bulbY + 30} L ${x + 28} ${bulbY - 22} L ${x - 28} ${bulbY - 22} Z`} /></g>}
      {kind === "desk" && <g fill={INK}><path d={`M ${x} ${floorY} L ${x} ${bulbY + 30} L ${x + 30} ${bulbY}`} stroke={INK} strokeWidth={6} fill="none" /><path d={`M ${x + 10} ${bulbY + 8} L ${x + 60} ${bulbY - 12} L ${x + 60} ${bulbY + 22} Z`} /></g>}
      {/* bloom on the bulb */}
      <circle cx={kind === "desk" ? x + 52 : x} cy={kind === "ceiling" ? bulbY + 16 : kind === "desk" ? bulbY + 8 : bulbY + 10} r={14} fill="#FFF8E6" opacity={0.9 * on} style={{ filter: "blur(3px)" }} />
      <circle cx={kind === "desk" ? x + 52 : x} cy={kind === "ceiling" ? bulbY + 16 : kind === "desk" ? bulbY + 8 : bulbY + 10} r={44} fill={color} opacity={0.45 * on} style={{ filter: "blur(16px)" }} />
    </g>
  );
};

/* A phone or laptop lighting a face at night: a white-blue glow rising onto the character. */
export const ScreenGlow: React.FC<{ x: number; y: number; color?: string; strength?: number }> = ({ x, y, color = "#CFE3FF", strength = 0.5 }) => {
  const f = useCurrentFrame();
  const flick = 1 + Math.sin(f / 7) * 0.04;
  return (
    <g>
      <LightPool x={x} y={y - 60} r={170} color={color} strength={strength * flick} />
      <rect x={x - 16} y={y - 10} width={32} height={20} rx={4} fill={color} opacity={0.95} />
    </g>
  );
};

/* Out-of-focus lights in the background (bokeh). */
export const Bokeh: React.FC<{ count?: number; color: string; y?: number; spread?: number; seed?: string }> = ({ count = 14, color, y = 380, spread = 260, seed = "bk" }) => {
  const f = useCurrentFrame();
  return (
    <g style={{ filter: "blur(6px)" }}>
      {Array.from({ length: count }).map((_, i) => {
        const r = 14 + random(`${seed}r${i}`) * 30;
        const o = 0.25 + random(`${seed}o${i}`) * 0.35 + Math.sin(f / 30 + i) * 0.05;
        return <circle key={i} cx={random(`${seed}x${i}`) * W} cy={y + (random(`${seed}y${i}`) - 0.5) * spread} r={r} fill={color} opacity={o} />;
      })}
    </g>
  );
};

/* Parallax strip for running/driving shots. Use 3–4 layers: far (1–2 px/frame), mid (4–6), near (12–18). */
export const ParallaxStrip: React.FC<{
  speed: number; y: number; color: string;
  kind: "hills" | "buildings" | "trees" | "posts"; seed?: string; scale?: number; blur?: number;
}> = ({ speed, y, color, kind, seed = "p", scale = 1, blur = 0 }) => {
  const frame = useCurrentFrame();
  const tile = 2400;
  const shift = -((frame * speed) % tile);
  const items: React.ReactNode[] = [];
  for (let rep = 0; rep < 3; rep++) {
    const base = rep * tile;
    if (kind === "hills") {
      items.push(<path key={`h${rep}`} fill={color}
        d={`M ${base} ${y} Q ${base + 300} ${y - 160 * scale} ${base + 600} ${y} Q ${base + 900} ${y - 110 * scale} ${base + 1200} ${y} Q ${base + 1600} ${y - 190 * scale} ${base + 2000} ${y} Q ${base + 2200} ${y - 80 * scale} ${base + tile} ${y} L ${base + tile} ${y + 600} L ${base} ${y + 600} Z`} />);
    } else {
      const n = kind === "posts" ? 8 : 14;
      for (let i = 0; i < n; i++) {
        const r = random(`${seed}-${i}`);
        const px = base + (i / n) * tile + r * 60;
        if (kind === "buildings") {
          const h = (180 + r * 320) * scale, w = (110 + r * 90) * scale;
          items.push(<rect key={`${rep}-${i}`} x={px} y={y - h} width={w} height={h + 400} fill={color} />);
        } else if (kind === "trees") {
          const h = (120 + r * 120) * scale;
          items.push(<g key={`${rep}-${i}`} fill={color}><rect x={px - 5 * scale} y={y - h * 0.4} width={10 * scale} height={h * 0.4 + 10} /><circle cx={px} cy={y - h * 0.65} r={h * 0.32} /></g>);
        } else {
          items.push(<rect key={`${rep}-${i}`} x={px} y={y - 140 * scale} width={12 * scale} height={140 * scale + 20} fill={color} />);
        }
      }
    }
  }
  return <g transform={`translate(${shift} 0)`} style={{ filter: blur ? `blur(${blur}px)` : undefined }}>{items}</g>;
};

/* Weather and air ------------------------------------------------------- */
export const Rain: React.FC<{ density?: number; color?: string }> = ({ density = 0.6, color = "#AFC0D6" }) => {
  const frame = useCurrentFrame();
  const n = Math.floor(160 * density);
  return (
    <g stroke={color} strokeWidth={2} opacity={0.35} strokeLinecap="round">
      {Array.from({ length: n }).map((_, i) => {
        const x0 = random(`rx${i}`) * (W + 200) - 100;
        const sp = 28 + random(`rs${i}`) * 14;
        const yy = ((random(`ry${i}`) * H + frame * sp) % (H + 120)) - 60;
        return <line key={i} x1={x0} y1={yy} x2={x0 - 6} y2={yy + 34} />;
      })}
    </g>
  );
};

export const Snow: React.FC<{ density?: number }> = ({ density = 0.6 }) => {
  const frame = useCurrentFrame();
  const n = Math.floor(140 * density);
  return (
    <g fill="#F2F4F8">
      {Array.from({ length: n }).map((_, i) => {
        const sp = 1.2 + random(`sv${i}`) * 1.6;
        const yy = ((random(`sy${i}`) * H + frame * sp) % (H + 40)) - 20;
        const xx = random(`sx${i}`) * W + Math.sin(frame / 25 + i) * 12;
        return <circle key={i} cx={xx} cy={yy} r={2 + random(`sr${i}`) * 3} opacity={0.5 + random(`so${i}`) * 0.4} />;
      })}
    </g>
  );
};

/* Steam rising from food or a mug at (x, y). */
export const Steam: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const f = useCurrentFrame();
  return (
    <g stroke="#F4F1EA" strokeWidth={5} fill="none" strokeLinecap="round" style={{ filter: "blur(2px)" }}>
      {[0, 1, 2].map((i) => {
        const t = ((f + i * 20) % 60) / 60;
        return <path key={i} opacity={(1 - t) * 0.5} d={`M ${x - 14 + i * 14} ${y - t * 70} q 10 -16 0 -32 q -10 -16 0 -32`} />;
      })}
    </g>
  );
};

/* Floating musical notes when a character wears headphones. (x, y) = above the head. */
export const MusicNotes: React.FC<{ x: number; y: number; color?: string }> = ({ x, y, color = "#EDE6D8" }) => {
  const f = useCurrentFrame();
  return (
    <g fill={color}>
      {[0, 1, 2].map((i) => {
        const t = ((f + i * 25) % 75) / 75;
        return (
          <g key={i} opacity={Math.sin(t * Math.PI)} transform={`translate(${x + i * 26 + Math.sin(t * 6 + i) * 10} ${y - t * 90})`}>
            <ellipse cx={0} cy={0} rx={8} ry={6} transform="rotate(-20)" /><rect x={6} y={-28} width={3} height={28} />
          </g>
        );
      })}
    </g>
  );
};

/* Furniture helpers ----------------------------------------------------- */
export const Window: React.FC<{ x: number; y: number; w?: number; h?: number; glass: string; frame?: string; grid?: boolean }> = ({ x, y, w = 260, h = 300, glass, frame: fr = INK, grid = false }) => {
  const id = `win-${x}-${y}`;
  return (
    <g>
      <defs><pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse"><path d="M 14 0 L 0 0 0 14" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={1.5} /></pattern></defs>
      <rect x={x} y={y} width={w} height={h} fill={glass} />
      {grid && <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={fr} strokeWidth={14} />
      {!grid && <><line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={fr} strokeWidth={10} /><line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={fr} strokeWidth={10} /></>}
    </g>
  );
};

export const Box: React.FC<{ x: number; y: number; w: number; h: number; color?: string; r?: number }> = ({ x, y, w, h, color = INK, r = 6 }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={color} />
);

/* POV hands: two black hands holding something at the bottom of the frame (phone, box, notebook). */
export const PovHands: React.FC<{ holding?: React.ReactNode; rim?: string }> = ({ holding, rim = "#C9D3E3" }) => {
  const f = useCurrentFrame();
  const bob = Math.sin(f / 20) * 4;
  return (
    <g transform={`translate(0 ${bob})`}>
      <g stroke={rim} strokeOpacity={0.5} strokeWidth={3}>
        <path d={`M 560 1100 Q 640 900 720 800 L 790 840 Q 720 960 700 1100 Z`} fill={INK} />
        <path d={`M 1360 1100 Q 1280 900 1200 800 L 1130 840 Q 1200 960 1220 1100 Z`} fill={INK} />
      </g>
      {holding}
      <circle cx={760} cy={812} r={34} fill={INK} />
      <circle cx={1160} cy={812} r={34} fill={INK} />
    </g>
  );
};
