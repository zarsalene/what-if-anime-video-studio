import React from "react";
import { Film, Storyboard } from "../../lib/Film";
import storyboard from "./storyboard.json";
import audio from "./audio.json";
import * as shots from "./shots";

export const sb = storyboard as Storyboard;
export const LaterFilm: React.FC<{ muted?: boolean }> = ({ muted }) => <Film storyboard={sb} shots={shots as Record<string, React.FC>} audio={audio} muted={muted} />;
