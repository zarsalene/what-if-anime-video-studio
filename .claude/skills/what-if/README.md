# What If Anime Video — skill for OpenCode

Create short, original anime-style science explainers from a “What if…?” question. The skill researches the real mechanism, writes concise narration, builds illustrated shots, mixes effects under the voice, checks the full render and delivers a downloadable YouTube-ready MP4 with a cover and publishing copy.

Default output is an exactly 60-second vertical Short. Use a different runtime or widescreen format when the user explicitly asks.

Try:

```
/what-if What if Earth suddenly stopped spinning?
/what-if What if the Moon disappeared? Keep it under 45 seconds.
/what-if In anime style, what if humans could see infrared light?
```

The style is original anime-inspired illustration: expressive faces, inked contours, cel shading, shaped environments and consistent character design. The skill does not imitate a specific show or artist.

For shots that benefit from 3D, the skill includes a Three.js/React Three Fiber filmmaking workflow for camera composition, custom geometry, anime lighting, frame-deterministic motion, render performance and shot-by-shot visual review. It keeps 2D as the default and uses 3D where depth improves the explanation.

The default narration uses Edge TTS `en-US-ChristopherNeural` at `+5Hz` pitch and `+3%` rate, in a soft, conversational read. Do not pitch/time-stretch the finished voice or add bass boost or heavy compression.

The final file is saved in `studio/out/<film-name>/<film-name>-final.mp4`. The skill provides a direct link to download it. It does not upload the video to YouTube.

Before publishing, review the source notes, verify asset rights, and check YouTube's current upload guidance. Passing the export checks does not guarantee views, monetization or legal clearance.

## Tools

The workflow uses Remotion and TypeScript for animation, Python helper scripts for storyboards/audio checks, and FFmpeg for final mastering. Generated or code-drawn images must be inspected at full resolution and at phone size.
