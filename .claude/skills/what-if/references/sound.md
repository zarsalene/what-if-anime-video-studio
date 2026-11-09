# Sound and narration mix

Narration is the mix anchor. A viewer must understand every word on a phone speaker at ordinary volume. Effects support the picture; they never compete with the voice.

## Approved default voice

For this skill, default to Edge TTS `en-US-ChristopherNeural` at pitch `+5Hz` and rate `+3%`. The approved read is soft, natural and conversational. Do not pitch-shift or time-stretch finished narration, add bass emphasis, or apply heavy compression; those treatments can make the voice sound robotic or frightening. If the exact voice is unavailable, select the closest natural voice and preserve the same delivery. Change this default only when the user asks for a different voice or style.

## Mix order

1. **Narration/TTS:** clean, centered, consistent level, with a natural conversational tone. Keep pitch near the speaker's comfortable register; avoid extreme lowering, heavy bass boost and harsh compression that can make the voice sound threatening. Use ominous delivery only when requested. Remove long silences and fix clipping or harsh sibilance.
2. **Music:** original or licensed score; keep it well below speech. Duck it under narration and let it rise gently in pauses.
3. **Ambience:** a quiet bed that suggests place/weather. Keep it lower than music and duck it further when narration is dense.
4. **Sound effects/foley:** sync to visible actions. Keep transient peaks restrained; do not layer multiple full-level impacts.

## Relative levels

Use meters and listening, not the Remotion `volume` number alone. It is a linear gain, not a dB value.

- Start music roughly 18–24 dB below the narration's average level.
- Keep ambience roughly 24–30 dB below narration while the voice is speaking.
- Keep one-shot effects at least 8–12 dB below the narration peak when they overlap speech. Strong impacts belong in a pause or between lines.
- Duck music/ambience by another 6–10 dB during dense narration. Automate a short fade around each line to avoid pumping.
- Keep the voice intelligible after the final loudness pass. Lowering all tracks together does not fix a bad relative mix.

These are starting points. Listen through the whole mix on speakers and headphones, then adjust by ear and meter. If effects mask even one word, lower or move those effects.

## TTS timing

Create a timing table with each narration line's start and end. Place captions from the same timings. Leave small gaps between lines for breaths and effects. Do not place a crash on top of the most important number or sentence.

## Music and rights

Use music made for the video or a track the user is allowed to publish. Avoid famous songs, unlicensed anime soundtracks and samples with unclear rights. If no track is supplied, compose a simple original bed with available tools. Keep the music file and rights/source note in the project.

## Review and final loudness

Render a preview with all audio. Listen from beginning to end; compare narration, music, ambience and effects during both speech and pauses. Inspect the waveform/peaks for clipping and make sure every word remains intelligible.

Run `SCRIPTS/sound_check.py <slug> out/<slug>/raw.mp4` and fix every FAIL. Then use `SCRIPTS/finish.py <slug>` for the mastered output. Verify the final audio stream and integrated loudness; do not use normalization to hide an over-loud effect relative to narration.
