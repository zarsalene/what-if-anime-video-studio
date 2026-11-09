# Kit mode — write one JSON file, run one command

**Rule: edit ONLY `studio/src/films/<slug>/storyboard.json`.** Never edit `.tsx`, `.py`, `index.tsx`, `audio.json`, `captions.json` or `kit.generated.ts` — `make.py` writes those.

## Steps (run inside `studio/`)

1. Research the question. Keep 2–4 sources (official agency, university, paper).
2. Write `src/films/<slug>/storyboard.json` (format below). `<slug>` = lowercase-dash, e.g. `moon-gone`.
3. `py make.py <slug> --check` — fix every listed error in the JSON, run again.
4. `py make.py <slug> --preview` — open `out/<slug>/contact_sheet.jpg`. Fix the JSON if a shot looks wrong.
5. `py make.py <slug>` — final. Hand off: `out/<slug>/<slug>-final.mp4`, `thumbnail.png`, `<slug>.srt`, `youtube.md`.

Voice, word captions, music, sound effects, sound mix, loudness, thumbnail, subtitles and model credits are automatic.

**Voice.** Edge TTS by default. For an ElevenLabs (or any) voice, the user records ONE file that reads every `say` line in order, with a short pause between lines, and saves it as `studio/voice/<slug>.mp3`. `make.py` cuts it per shot automatically and stops with a clear error if the recording does not match the `say` lines. Change the recording or the `say` text until they match word for word.

**Sound effects (automatic).** A whoosh plays when the scene type changes, and a pop on every `title` and `StatCard`. A `scared` move gets a gasp, and a `jump` move gets a boing on every hop. Candy weather adds a candy patter bed, and rain adds a rain bed. Add a shot `sfx` only for something extra.

## storyboard.json

```json
{
  "slug": "candy-sky",
  "title": "What If the Sky Rained Candy?",
  "mood": "playful",
  "format": "short",
  "fps": 30,
  "ambience": [{ "name": "amb-wind", "startSec": 0, "endSec": 70, "volume": 0.2 }],
  "thumbnail": { "shot": "s01", "at": 2.0 },
  "shots": [
    { "id": "s01", "scene": "Sky", "seconds": 3,
      "props": { "host": "kid", "move": "look-up", "time": "day", "weather": "candy", "camera": "low-angle", "title": "What if the sky rained candy?" },
      "say": "What if candy fell from the sky? At first, it would look magical.",
      "sfx": [{ "at": 0.1, "name": "whoosh", "volume": 0.25 }] },
    { "id": "s02", "scene": "StatCard", "seconds": 3,
      "props": { "value": "H2O", "label": "Real clouds", "sub": "Tiny water drops and ice crystals" },
      "say": "But real clouds are made of tiny water drops and ice." }
  ],
  "youtube": { "title": "What If the Sky Rained Candy? 🍬", "description": "2–3 lines.", "hashtags": ["#WhatIf", "#Science", "#Shorts"] },
  "sources": [{ "name": "NOAA — Clouds", "url": "https://www.noaa.gov/jetstream/clouds", "claim": "Cloud particles are tiny water droplets and/or ice crystals." }]
}
```

| Field | Rule |
|---|---|
| `mood` | music: `playful`, `wonder`, `calm`, `tense` |
| `seconds` | minimum length; the shot grows to fit `say` automatically. Use 3. `make.py` rewrites it and keeps your value in `seconds_min`. |
| `say` | the narration line for the shot. Required. |
| `sfx` | optional extras, built-in names only: `whoosh`, `pop`, `boing`, `ping`, `gasp`, `heartbeat`, `beeps`, `alarm`, `page-flip` |
| `ambience` | optional, one of `amb-wind`, `amb-rain`, `amb-night`, `amb-city`, `amb-birds`, `amb-room` |
| `thumbnail` | which shot and second to use as the cover (titles show, captions do not) |

## Scenes

The full list of props and allowed values is in `studio/src/kit/catalog.json`. In each list, the first value is the default.

- **Sky**: the host on a low-poly hill. Props: `host` (`kid` = main character, `robot`, `none`), `move`, `face` (robot only), `time`, `moon`, `weather` (`candy`, `candy-heavy`, `rain`), `ground` (`candy`, `syrup`), `camera`, `title`.
- **Planet**: Earth in space, `moon` (`orbit`, `fade`, `none`), `tides`, `wobble`.
- **StatCard**: one big `value` (≤ 6 characters) with a `label` and an optional `sub`.

If the topic needs a visual that no scene has, do not write code. Tell the user which new scene is needed.

## Writing rules

- 7–9 shots, about 35–55 s in total. A `say` line has at most 16 words; one fact per shot.
- Shot 1 is the hook: it puts the question in `title` and in `say`. The last shot asks the viewer a question in `title`.
- Change the `camera` or the scene on every cut, and vary `move`. Moves: `look-up` (scan the sky), `catch` (dart side to side), `spin`, `jump`, `walk` (crosses the frame in 4 s), `happy`, `scared` (shiver, back away), `yes`, `no`, `wave`, `dance`, `idle`. Use a `StatCard` for the one number or fact to remember.
- Write for the ear: short sentences and contractions. Hedge uncertain claims ("could", "scientists still debate").
- Every factual `say` line must be covered by a `sources[].claim`. Imaginary premises are labelled as imaginary in `youtube.description`.
