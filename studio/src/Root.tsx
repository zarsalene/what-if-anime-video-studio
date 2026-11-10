import React from "react";
import { Composition } from "remotion";
import { FILMS } from "./films/registry";
import { filmLength } from "./lib/Film";
import { ShortCut } from "./lib/Short";
import { EarthStopped, EarthThumb } from "./films/earth-stopped/EarthStopped";

// Films normally render landscape. candy-rain is authored directly as a vertical Short.
export const Root: React.FC = () => (
  <>
    {FILMS.map(({ component, storyboard, thumb, thumbFrames }) => (
      <React.Fragment key={storyboard.slug}>
        <Composition id={storyboard.slug} component={component} durationInFrames={filmLength(storyboard)} fps={storyboard.fps} width={storyboard.format === "short" ? 1080 : 1920} height={storyboard.format === "short" ? 1920 : 1080} />
        {thumb && <Composition id={`${storyboard.slug}-thumb`} component={thumb} durationInFrames={thumbFrames ?? 1} fps={storyboard.fps} width={1080} height={1920} />}
        {storyboard.short && (
          <Composition
            id={`${storyboard.slug}-short`}
            component={() => <ShortCut storyboard={storyboard} Film={component} />}
            durationInFrames={Math.round((storyboard.short.endSec - storyboard.short.startSec) * storyboard.fps)}
            fps={storyboard.fps} width={1080} height={1920}
          />
        )}
      </React.Fragment>
    ))}
    {/* Standalone vertical science Short (not a storyboard film) */}
    <Composition id="earth-stopped" component={EarthStopped} durationInFrames={1800} fps={30} width={1080} height={1920} />
    {/* Thumbnail still for the Short */}
    <Composition id="earth-thumb" component={EarthThumb} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
