import React from "react";
import { Storyboard } from "../lib/Film";
import { CandyRainFilm, sb as candyRainSb } from "./candy-rain";
import { FiveMinutesFilm, sb as fiveMinutesSb } from "./five-minutes";
import { OneMoreFilm, sb as oneMoreSb } from "./one-more";
import { LaterFilm, sb as laterSb } from "./later";
import { MoonGoneFilm, sb as moonGoneSb } from "./moon-gone";

// Every film is listed here ONCE. The composition id is the slug.
// To add a film: import it and add one line to FILMS.
export const FILMS: { component: React.FC<{ muted?: boolean }>; storyboard: Storyboard }[] = [
  { component: LaterFilm, storyboard: laterSb },
  { component: OneMoreFilm, storyboard: oneMoreSb },
  { component: FiveMinutesFilm, storyboard: fiveMinutesSb },
  { component: CandyRainFilm, storyboard: candyRainSb },
  { component: MoonGoneFilm, storyboard: moonGoneSb },
];
