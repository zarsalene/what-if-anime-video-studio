"""Master fresh, natural-pitch neural narration for earth-stopped.

Only remove sub-bass rumble and set a consistent speech level. Do not pitch-shift
or time-stretch: those effects made the previous voice sound artificial.
"""
from pathlib import Path
import shutil
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt


ROOT = Path("out/earth-stopped/tts_raw")
PREP = Path("out/earth-stopped/tts_soft_pre")
OUT = Path("out/earth-stopped/tts_soft")
FFMPEG = shutil.which("ffmpeg") or "ffmpeg"


def main() -> None:
    PREP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for index in range(1, 9):
        source = ROOT / f"n{index}_raw.mp3"
        decoded = PREP / f"n{index}.decoded.wav"
        subprocess.run([
            str(FFMPEG), "-y", "-v", "error", "-i", str(source),
            "-ar", "22050", "-ac", "1", "-c:a", "pcm_s16le", str(decoded),
        ], check=True)
        sample_rate, samples = wavfile.read(decoded)
        if sample_rate != 22050:
            raise ValueError(f"Expected 22050 Hz input: {source} ({sample_rate} Hz)")
        values = samples.astype(np.float64)
        if values.ndim == 2:
            values = values.mean(axis=1)
        # Remove only low rumble; leave the body of the voice intact.
        sos = butter(2, 55, btype="highpass", fs=sample_rate, output="sos")
        values = sosfiltfilt(sos, values)
        values = np.clip(values, -32768, 32767).astype(np.int16)
        prepared = PREP / f"n{index}.wav"
        wavfile.write(prepared, sample_rate, values)
        output = OUT / f"n{index}.wav"
        chain = "loudnorm=I=-16:TP=-1.5:LRA=11"
        subprocess.run([
            str(FFMPEG), "-y", "-v", "error", "-i", str(prepared),
            "-af", chain, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le",
            str(output),
        ], check=True)
        print(f"Wrote {output}")


if __name__ == "__main__":
    main()
