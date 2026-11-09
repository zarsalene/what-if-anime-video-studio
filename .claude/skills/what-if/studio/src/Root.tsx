import React from "react";
import { Composition } from "remotion";
import { FILMS } from "./films/registry";
import { filmLength } from "./lib/Film";

// What If Shorts default to vertical; long videos use widescreen unless specified.
export const Root: React.FC = () => (
  <>
    {FILMS.map(({ component, storyboard }) => (
      <React.Fragment key={storyboard.slug}>
        <Composition id={storyboard.slug} component={component} durationInFrames={filmLength(storyboard)} fps={storyboard.fps}
          width={storyboard.format === "short" ? 1080 : 1920} height={storyboard.format === "short" ? 1920 : 1080} />
      </React.Fragment>
    ))}
  </>
);
