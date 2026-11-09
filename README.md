# What If Video Studio

An anime-inspired science video production project. It combines a reusable What If workflow with a Remotion and React Three Fiber studio for creating, previewing, and rendering videos.

## Project layout

- `.claude/skills/what-if/` — the What If video skill, reference guides, and helper scripts
- `.opencode/commands/what-if.md` — OpenCode command for invoking the workflow
- `studio/` — Remotion video studio and source compositions

## Get started

```powershell
cd studio
npm install
npm run studio
```

Use the `what-if` skill to create a new film: it documents the research, storyboard, illustration, audio, review, and export workflow. Generated renders and Python cache files are excluded from Git.

## Notes

The project uses Remotion, React, TypeScript, React Three Fiber, and Python helper scripts. Check the font licenses under `studio/public/fonts/` before redistributing the bundled fonts. Review the sound-effects library notes at `studio/public/sfx/LIBRARY.txt` before publishing content that uses those assets.
