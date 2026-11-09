"""Split the user's single ElevenLabs read into scene-aligned narration clips."""
import json
import subprocess
from pathlib import Path

root = Path(__file__).parent
source = root / "public/films/candy-rain/tts/elevenlabs-narration-source.mp3"
sb_path = root / "src/films/candy-rain/storyboard.json"
sb = json.loads(sb_path.read_text(encoding="utf-8"))
segments = [
    (0.00, 4.58),
    (5.10, 10.20),
    (10.66, 15.69),
    (16.07, 21.32),
    (21.63, 27.68),
    (28.09, 32.82),
    (33.07, 39.24),
    (39.15, 44.96),
]
manifest = []
for shot, (start, end) in zip(sb["shots"], segments):
    line = shot["narration"][0]
    name = f"{shot['id']}-{round(line['at'] * 10)}"
    out = root / f"public/films/candy-rain/tts/{name}.wav"
    length = end - start
    fade_out = max(0, length - 0.06)
    audio_filter = f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.02,afade=t=out:st={fade_out}:d=0.06"
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", str(source), "-af", audio_filter,
        "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(out)
    ], check=True)
    duration = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(out)
    ], text=True).strip())
    line["endSec"] = round(line["at"] + duration + 0.12, 2)
    print(f"{name}: {duration:.2f}s; speech window ends {line['endSec']:.2f}s into shot")
    manifest.append(name)

sb_path.write_text(json.dumps(sb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
manifest_path = root / "src/films/candy-rain/audio.json"
audio = json.loads(manifest_path.read_text(encoding="utf-8"))
audio["tts"] = manifest
manifest_path.write_text(json.dumps(audio, indent=2) + "\n", encoding="utf-8")
