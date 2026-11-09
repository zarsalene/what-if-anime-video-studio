import json, subprocess
from pathlib import Path

root = Path(__file__).parent
sb = json.loads((root / "src/films/candy-rain/storyboard.json").read_text(encoding="utf-8"))
lines, cursor = [], 0.0
def stamp(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

for shot in sb["shots"]:
    for line in shot.get("narration", []):
        name = f"{shot['id']}-{round(line['at']*10)}"
        wav = root / f"public/films/candy-rain/tts/{name}.wav"
        duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(wav)], text=True).strip())
        start = cursor + line["at"]
        lines.append((start, start + duration, line["text"]))
    cursor += shot["seconds"]

out = root / "out/candy-rain/candy-rain.en.srt"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n\n".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{text}" for i, (a,b,text) in enumerate(lines,1)) + "\n", encoding="utf-8")
print(out, len(lines), "captions", "last ends", f"{lines[-1][1]:.2f}s")
