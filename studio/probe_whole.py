import subprocess
import numpy as np

SR = 16000
ff = r"C:\Users\zarsa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

raw = subprocess.run([ff, "-loglevel", "error", "-i", "out/five-minutes/raw.mp4",
                      "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
print("whole peak %.1f dB" % (20 * np.log10(np.abs(x).max() + 1e-12)))

win = int(0.05 * SR)
n = len(x) // win
rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms)
idx = np.argsort(db)[-12:][::-1]
print("loudest windows (s, dB):", [(round(i * 0.05, 2), round(db[i], 1)) for i in idx])
