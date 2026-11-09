"""Render the candy-rain narration using the project's approved soft neural voice."""
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).parent
SB = json.loads((ROOT / "src/films/candy-rain/storyboard.json").read_text(encoding="utf-8"))
OUT = ROOT / "public/films/candy-rain/tts"
OUT.mkdir(parents=True, exist_ok=True)
VOICE = "en-US-ChristopherNeural"


async def main():
    manifest = []
    for shot in SB["shots"]:
        for line in shot.get("narration", []):
            name = f"{shot['id']}-{round(line['at'] * 10)}"
            mp3 = OUT / f"{name}.mp3"
            wav = OUT / f"{name}.wav"
            await edge_tts.Communicate(line["text"], VOICE, pitch="+5Hz", rate="+1%").save(str(mp3))
            subprocess.run([
                "ffmpeg", "-y", "-v", "error", "-i", str(mp3),
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=7,highpass=f=65,lowpass=f=12000",
                "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)
            ], check=True)
            duration = float(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=nw=1:nk=1", str(wav)
            ], text=True).strip())
            slot = shot["seconds"] - line["at"]
            print(f"{name}: {duration:.2f}s / {slot:.2f}s slot")
            if duration > slot:
                raise SystemExit(f"Narration {name} overruns its shot by {duration-slot:.2f}s")
            manifest.append(name)
    (ROOT / "src/films/candy-rain/audio.json").write_text(
        json.dumps({"sfx": [], "music": ["candy-score"], "tts": manifest}, indent=2) + "\n",
        encoding="utf-8")


asyncio.run(main())
