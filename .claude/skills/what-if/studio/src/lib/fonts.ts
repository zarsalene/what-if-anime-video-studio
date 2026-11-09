import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts ship inside the skill (public/fonts), so rendering works offline.
// All three are under the SIL Open Font License (free for commercial use).
export const SERIF = "Libre Baskerville"; // opening line (italic), concept cards, time labels, quote and end cards
export const HAND = "Patrick Hand"; // spoken lines and inner thoughts (rounded, hand-lettered)
export const SANS = "Inter"; // phone screens, notifications, pay slips, signs

const faces: [string, string, string, "normal" | "italic"][] = [
  [SERIF, "400", "libre-baskerville-latin-400-normal.woff2", "normal"],
  [SERIF, "700", "libre-baskerville-latin-700-normal.woff2", "normal"],
  [SERIF, "400", "libre-baskerville-latin-400-italic.woff2", "italic"],
  [HAND, "400", "patrick-hand-latin-400-normal.woff2", "normal"],
  [SANS, "400", "inter-latin-400-normal.woff2", "normal"],
  [SANS, "600", "inter-latin-600-normal.woff2", "normal"],
  [SANS, "700", "inter-latin-700-normal.woff2", "normal"],
];
for (const [family, weight, file, style] of faces) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style });
}
