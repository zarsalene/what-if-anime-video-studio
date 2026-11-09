import subprocess
import numpy as np

SR = 16000
ff = r"C:\Users\zarsa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

names = ["knock", "marker-tap", "plate-1", "plate-2", "cup-down", "switch", "page-flip",
         "key-1", "step-floor-1", "door-close", "door-open", "sigh", "gasp", "cloth",
         "whoosh", "laptop-close", "pencil-write", "marker-squeak-1", "water-tap",
         "beeps", "alarm", "shop-bell", "car-horn", "heartbeat", "pant"]
print("%-16s %5s %5s %5s" % ("name", "dur", "maxW", "peak"))
for name in names:
    raw = subprocess.run([ff, "-loglevel", "error", "-i", f"public/sfx/{name}.mp3",
                          "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    if not raw:
        print(name, "MISSING")
        continue
    x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
    win = int(0.05 * SR)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    print("%-16s %5.2f %5.1f %5.1f" % (name, len(x) / SR, db.max(), 20 * np.log10(np.abs(x).max())))
