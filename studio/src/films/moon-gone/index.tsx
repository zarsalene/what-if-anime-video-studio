import React from "react";
import { AudioManifest, Storyboard } from "../../lib/Film";
import { KitCaptions, KitFilm, kitStoryboard } from "../../kit";
import storyboard from "./storyboard.json";
import audio from "./audio.json";
import captions from "./captions.json";

export const sb = kitStoryboard(storyboard as unknown as Storyboard, captions as KitCaptions);
export const MoonGoneFilm: React.FC<{ muted?: boolean }> = ({ muted }) => <KitFilm sb={sb} audio={audio as AudioManifest} captions={captions as KitCaptions} muted={muted} />;
