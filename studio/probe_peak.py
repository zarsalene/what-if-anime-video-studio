import subprocess
import numpy as np

SR = 16000
ff = r"C:\Users\zarsa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

raw = subprocess.run([ff, "-loglevel", "error", "-ss", "10.5", "-t", "1.2", "-i", "out/five-minutes/raw.mp4",
                      "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
print("peak %.1f dB" % (20 * np.log10(np.abs(x).max() + 1e-12)))
win = int(0.01 * SR)
n = len(x) // win
pk = np.max(np.abs(x[: n * win].reshape(n, win)), axis=1)
print(" ".join("%.0f" % v for v in 20 * np.log10(pk + 1e-12)))
