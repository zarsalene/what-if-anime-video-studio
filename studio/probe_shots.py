import subprocess
import json
import numpy as np

SR = 16000
ff = r"C:\Users\zarsa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
sb = json.load(open("src/films/five-minutes/storyboard.json", encoding="utf-8"))

starts, t = {}, 0.0
for s in sb["shots"]:
    starts[s["id"]] = t
    t += s["seconds"]

raw = subprocess.run([ff, "-loglevel", "error", "-i", "out/five-minutes/raw.mp4",
                      "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
win = int(0.05 * SR)
n = len(x) // win
db = 20 * np.log10(np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12))

tot = 0.0
pic = np.concatenate([db[int(starts[s["id"]] / 0.05):int((starts[s["id"]] + s["seconds"]) / 0.05)] for s in sb["shots"] if s["kind"] != "card"])
bed = np.percentile(pic, 20)
print("bed %.1f" % bed)

for sid in ["s03", "s05", "s06", "s12", "s19", "s30", "s40", "s41", "s42", "s48"]:
    s = next(v for v in sb["shots"] if v["id"] == sid)
    a = starts[sid]
    seg = db[int(a / 0.05):int((a + s["seconds"]) / 0.05)]
    print("%s floor30 %.1f median %.1f max %.1f  need >%.1f" % (sid, np.percentile(seg, 30), np.median(seg), seg.max(), np.percentile(seg, 30) + 8))
    print("   ", " ".join("%.0f" % v for v in seg))
