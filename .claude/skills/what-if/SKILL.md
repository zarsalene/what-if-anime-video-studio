---
name: what-if
description: Create original 3D science “What If?” YouTube Shorts by writing one storyboard.json and running make.py (kit mode) — researched narration, 3D host, voice, captions, music, thumbnail and a verified MP4 export.
---

# What If Anime Video

## Kit mode (default): the LLM writes only JSON

Read `references/kit.md` and follow it. Write ONE file, `studio/src/films/<slug>/storyboard.json`, then run `py make.py <slug>` inside `studio/`. Do not write or edit code. The 3D toy-figure kit (main character: the kid; scenes in `studio/src/kit/catalog.json`), voice, captions, music, mix, thumbnail, SRT and YouTube text are all automatic. Use the custom mode below only when the user explicitly asks for hand-built shots.

## Custom mode (only on request)

Turn one imaginative question into a short, clear, scientifically grounded anime explainer. Make every What If Short exactly 60 seconds in 9:16 unless the user explicitly asks for a different runtime or aspect ratio. Deliver the complete video package and call it ready only after the final export passes the checks below.

## Read the relevant references

- `references/story.md` — What If research, script and escalation structure
- `references/characters.md` — original anime character and expression design
- `references/look-camera-edit.md` — anime backgrounds, lighting, camera and composition
- `references/mode-3d.md` — anime art direction for 3D shots
- `references/threejs-filmmaking.md` — cinematic Three.js / React Three Fiber workflow, deterministic motion, lighting, optimization and 3D review
- `references/text.md` — narration captions, labels and graphic overlays
- `references/sound.md` — narration-first sound design and mix targets
- `references/originality-and-youtube.md` — originality, source use and upload notes
- `references/shorts.md` — vertical Short timing and framing

The `later/` and `one-more/` studio films are legacy Remotion examples. Reuse their timing, component and audio wiring patterns only. Their old habit-film stories and puppet silhouettes are not the What If visual direction.

## Paths and commands

- This skill is in `.claude/skills/what-if/`; the Remotion studio is `./studio/`.
- Run project commands from inside `studio/`.
- `SCRIPTS` means `py ../.claude/skills/what-if/scripts` on Windows and `python3 ../.claude/skills/what-if/scripts` on Mac/Linux.
- Use a lowercase-dash `<slug>` such as `earth-stopped`.
- For 3D renders, add `--gl=angle`; use `--gl=swangle` if WebGL fails.

## Step 1 — Choose and research the question

Frame the premise as one variable changing: *What if X happened?* Prefer an immediate, visual consequence that can be explained in under a minute. Search primary scientific sources for the mechanism, scale and timeline. Use official agencies, scientific papers or university sources; keep source links and the distinction between established effects and dramatic inference in `out/<slug>/sources.md`. Do not present a speculative chain as certain fact.

## Step 2 — Write the narration and story

Read `references/story.md`. Write `out/<slug>/story.md` with:

Write narration for the ear, not as an essay: vary sentence length, use natural contractions, keep one idea per breath, check pronunciation of names and numbers, and leave pauses where the image can carry meaning. Keep suspense in the question, evidence and visual reveal; avoid a permanently ominous announcer cadence.

- the question and a one-sentence answer
- narration in speakable, conversational sentences (usually about 80–125 words for a 60-second Short)
- a 7-beat arc: hook, setup, trigger, first effect, escalation, largest consequence, takeaway/question
- the visual for every narration line, plus source links for factual claims
- the YouTube title and a 2–3 line description

Read it aloud against the planned runtime. Remove repeated explanations, unsupported certainty and jargon the image cannot clarify.

## Step 3 — Storyboard

1. Create the composition with `SCRIPTS/new_film.py <slug> "<TITLE>" "<WHAT IF PREMISE>"`.
2. Set `"format": "short"` for a vertical video. Make the default runtime exactly 60 seconds; only use another runtime or aspect ratio when the user explicitly asks. Set `"format": "long"` for a 3–15 minute widescreen video only when requested. Confirm current Shorts duration guidance in the linked YouTube reference before export.
3. Fill each shot with its id, beat, kind, duration, a concrete visible action, narration/caption timing, and every audible sound. Mark voice windows in the shot's `narration: [{startSec, endSec}]` list; the renderer uses these windows to duck music, ambience and effects. Keep most shots 1–4 seconds; use longer holds only for a strong reveal.
4. Run `SCRIPTS/check_storyboard.py <slug>`. Fix all errors and review all warnings before animating.

## Step 4 — Set the anime art direction

Read `references/characters.md` and `references/look-camera-edit.md`. Create an original model sheet and environment palette before building many shots. Keep character proportions, face, hair, line weight, shading, palette and background treatment consistent. Use expressive anime eyes and poses, clean inked contours, controlled cel shading and deliberate environmental detail. Avoid generic cube buildings, empty gradients and repeated window grids; draw varied rooflines, façades, signs, balconies, silhouettes and foreground layers. Do not imitate a named studio, franchise or living artist.

Use generated images only when an image-generation tool is available and the user’s request benefits from them. Otherwise create original vector or code-drawn anime art and make that style cohesive across shots. Do not leave failed, blurry or mismatched image placeholders in the render.

## Step 5 — Animate the shots

Build one exported component per shot in `src/films/<slug>/shots.tsx`. Use `useCurrentFrame()` and `interpolate`/`spring` for deterministic motion. Let the question drive the imagery: establish scale, show cause and effect, then land the reveal. Use varied shot sizes, parallax, held expressions, speed lines and impact frames with restraint. Keep text away from faces and safe margins.

Use 2D anime art by default. If 3D clearly improves a shot, read `references/mode-3d.md` and `references/threejs-filmmaking.md`; model the silhouette and roofline instead of assembling every city from plain boxes. Work through the beats in order and run `npx tsc -p .` after meaningful groups of changes.

## Step 6 — Sound and narration

Read `references/sound.md`. Default to the approved soft, natural male voice profile: Edge TTS `en-US-ChristopherNeural`, pitch `+5Hz`, rate `+3%`. Keep the delivery calm and conversational. Do not pitch-shift or time-stretch the finished voice, boost its bass, or use heavy compression; if that exact voice is unavailable, choose a natural-sounding alternative and keep the same tone. Preview the generated voice before timing the edit; correct pronunciation, stress, pauses, and unnatural phrasing before animation. Narration is the mix anchor and must remain clear on a phone speaker. Keep ambience and music well below speech; duck them during narration. Keep one-shot effects restrained and at least 8–12 dB below narration peaks unless a deliberate impact occurs between lines. Never stack full-level music, ambience and effects over speech. Use synced captions for all narration.

Use original or properly licensed music. If none is supplied, make an original simple score with available tools. Do not leave missing music or other audio placeholders in a video described as publish-ready. Keep sound effects synchronized with visible action.

## Step 7 — Review the preview

1. Render a preview with sound and create a contact sheet:
   `npx remotion render src/index.ts <slug> out/<slug>/preview.mp4 --scale=0.5` (+ `--gl=angle` for 3D).
2. Open the contact sheet and inspect every shot, plus full-size stills for details. Check that the anime style stays consistent, buildings and props have intentional shapes, the science reads without captions, text is legible, the frame has no clipping or missing assets, and motion is smooth.
3. Listen through the preview on speakers/headphones. Confirm every word is intelligible and sound effects never mask narration. Measure speech/effects/music windows if their balance is uncertain.
4. Write problems in `out/<slug>/review.md`, fix them, re-render and review again. Do at least one full visual and audio fix round.

## Step 8 — Final export and YouTube-ready gate

1. Render the full-resolution master with sound to `out/<slug>/raw.mp4`.
2. Run `SCRIPTS/sound_check.py <slug> out/<slug>/raw.mp4`; fix every FAIL and render again.
3. Run `SCRIPTS/finish.py <slug>` to create `out/<slug>/<slug>-final.mp4` at the intended YouTube loudness.
4. Inspect the final file with `ffprobe` (use Remotion’s bundled FFmpeg/ffprobe if system tools are unavailable). Confirm it opens, has video and audio, has the intended duration, aspect ratio, resolution and frame rate, uses progressive H.264 and AAC-LC at 48 kHz, and is not silent, clipped or corrupted. Preserve the source frame rate.
5. Watch the final MP4 from beginning to end with sound. Check narration sync, caption timing, cuts, every scene, beginning and ending frames. Review the thumbnail/cover at full size. Fix any defect and repeat the final render and review.
6. Provide the MP4, thumbnail/cover, captions file when narration is used, source list, title and description. Verify current YouTube encoding and Shorts guidance using the official links in `references/originality-and-youtube.md` before export.

Do not call it YouTube-ready while any required technical, visual, audio or asset check is incomplete. If the user’s supplied media needs rights confirmation, say exactly what remains unverified. “YouTube-ready” means the local export passed this preflight; it does not mean the video has been uploaded or guarantee reach, monetization or legal clearance.

## Step 9 — Handoff

Give the user a direct downloadable link to the final MP4, its duration and format, the thumbnail, title and description, and a short summary of the visual/audio checks. State any unresolved rights question or unverified step plainly.

## User notes

For a note about one scene, change that scene and its timing only, then render and inspect the affected scene and adjacent cuts. If the user asks for a full style change, update the model sheet and every affected shot so the style remains consistent throughout.
