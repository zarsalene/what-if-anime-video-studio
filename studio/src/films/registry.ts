import React from "react";
import { Storyboard } from "../lib/Film";
import { CandyRainFilm, sb as candyRainSb } from "./candy-rain";
import { FiveMinutesFilm, sb as fiveMinutesSb } from "./five-minutes";
import { OneMoreFilm, sb as oneMoreSb } from "./one-more";
import { LaterFilm, sb as laterSb } from "./later";
import { KIT_FILMS } from "./kit.generated";

// Every film is listed here ONCE. The composition id is the slug.
// To add a film: import it and add one line to FILMS. Kit films need nothing here: make.py lists them.
export const FILMS: { component: React.FC<{ muted?: boolean }>; storyboard: Storyboard; thumb?: React.FC; thumbFrames?: number }[] = [
  { component: LaterFilm, storyboard: laterSb },
  { component: OneMoreFilm, storyboard: oneMoreSb },
  { component: FiveMinutesFilm, storyboard: fiveMinutesSb },
  { component: CandyRainFilm, storyboard: candyRainSb },
  ...KIT_FILMS, // storyboard-only films, listed by make.py
];
