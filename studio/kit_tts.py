"""Voice + word timings for a kit film.  Usage (inside studio/):  py kit_tts.py <slug>

Reads src/films/<slug>/storyboard.json (each shot's "say"), writes
public/films/<slug>/tts/<id>-3.wav, src/films/<slug>/audio.json and
src/films/<slug>/captions.json (word start/end in seconds, for word-by-word captions).
"""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).parent
VOICE, PITCH, RATE = "en-US-ChristopherNeural", "+5Hz", "+3%"  # approved voice (SKILL.md step 6)
SAY_AT, TAIL = 0.3, 0.45  # must match SAY_AT and TAIL in src/kit/index.tsx


async def speak(text: str, mp3: Path) -> list[dict]:
    # the online voice sometimes drops a request: retry before giving up
    for attempt in range(3):
        try:
            return await speak_once(text, mp3)
        except edge_tts.exceptions.NoAudioReceived:
            if attempt == 2:
                raise
            print("  voice service gave no audio, retrying...", flush=True)
            await asyncio.sleep(3 * (attempt + 1))


async def speak_once(text: str, mp3: Path) -> list[dict]:
    audio, words = bytearray(), []
    stream = edge_tts.Communicate(text, VOICE, pitch=PITCH, rate=RATE, boundary="WordBoundary").stream()
    async for c in stream:
        if c["type"] == "audio":
            audio += c["data"]
        elif c["type"] == "WordBoundary":
            words.append({"text": c["text"], "start": c["offset"] / 1e7, "end": (c["offset"] + c["duration"]) / 1e7})
    mp3.write_bytes(audio)
    if not words:
        raise SystemExit(f"No word timings for: {text!r}")
    return words


async def main(slug: str):
    film = ROOT / "src/films" / slug
    sb = json.loads((film / "storyboard.json").read_text(encoding="utf-8"))
    out = ROOT / "public/films" / slug / "tts"
    out.mkdir(parents=True, exist_ok=True)
    names, captions = [], {}
    for shot in sb["shots"]:
        if not shot.get("say"):
            continue
        name = f"{shot['id']}-{round(SAY_AT * 10)}"
        mp3, wav = out / f"{name}.mp3", out / f"{name}.wav"
        words = await speak(shot["say"], mp3)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3),
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=7,highpass=f=65,lowpass=f=12000",
                        "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], check=True)
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "default=nw=1:nk=1", str(wav)], text=True).strip())
        captions[shot["id"]] = {"dur": round(dur, 3), "words": words}
        # grow the shot to fit its line, so storyboard.json matches the video (sound_check reads it)
        shot["seconds"] = max(shot["seconds"], round(SAY_AT + dur + TAIL + 0.005, 2))
        shot.setdefault("kind", "story")
        names.append(name)
        print(f"{name}: {dur:.2f}s  {len(words)} words")
    (film / "storyboard.json").write_text(json.dumps(sb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (film / "audio.json").write_text(json.dumps({"sfx": [], "music": [], "tts": names}, indent=2) + "\n", encoding="utf-8")
    (film / "captions.json").write_text(json.dumps(captions, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: py kit_tts.py <slug>")
    asyncio.run(main(sys.argv[1]))
