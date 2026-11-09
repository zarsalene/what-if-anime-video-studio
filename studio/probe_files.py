import subprocess
import numpy as np

SR = 16000
ff = r"C:\Users\zarsa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

for name in ["mouse-click", "ping", "vibrate", "clock-tick", "cloth"]:
    raw = subprocess.run([ff, "-loglevel", "error", "-i", f"public/sfx/{name}.mp3",
                          "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
    win = int(0.05 * SR)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    print(name, "dur %.2fs" % (len(x) / SR), "peak %.1f" % (20 * np.log10(np.abs(x).max())), "maxwin %.1f" % db.max())
    print("   ", " ".join("%.0f" % v for v in db[:40]))
