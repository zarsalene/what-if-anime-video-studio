import React from "react";
import { Storyboard } from "../lib/Film";
import { OneMoreFilm, sb as oneMoreSb } from "./one-more";
import { LaterFilm, sb as laterSb } from "./later";

// Every film is listed here ONCE. The composition id is the slug.
// To add a film: import it and add one line to FILMS.
export const FILMS: { component: React.FC<{ muted?: boolean }>; storyboard: Storyboard }[] = [
  { component: LaterFilm, storyboard: laterSb },
  { component: OneMoreFilm, storyboard: oneMoreSb },
];
