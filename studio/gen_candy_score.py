"""Small, original and restrained celeste/pad cue for the one-minute Short."""
import math
import wave
from pathlib import Path

import numpy as np

sr, duration = 44100, 60.0
n = int(sr * duration)
t = np.arange(n, dtype=np.float64) / sr
mix = np.zeros(n, dtype=np.float64)

# Warm, slow four-chord loop. Pure tones and a soft fifth harmonic keep it light.
chords = [([261.63, 329.63, 392.00, 493.88]), ([220.00, 261.63, 329.63, 392.00]),
          ([174.61, 220.00, 261.63, 349.23]), ([196.00, 246.94, 293.66, 392.00])]
bar = 4.0
for bi, start in enumerate(np.arange(0, duration, bar)):
    end = min(duration, start + bar)
    ix = (t >= start) & (t < end)
    local = t[ix] - start
    fade = np.minimum(1, local / .9) * np.minimum(1, (end-start-local) / .9)
    chord = chords[bi % len(chords)]
    pad = sum(np.sin(2*np.pi*hz*t[ix] + .12*np.sin(2*np.pi*.18*t[ix])) + .13*np.sin(2*np.pi*2*hz*t[ix]) for hz in chord) / (len(chord)*1.13)
    mix[ix] += .035 * fade * pad

# Airy celeste notes, deliberately sparse and soft beneath the narrator.
scale = [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33]
step = .75
for j, start in enumerate(np.arange(.25, duration - .5, step)):
    hz = scale[(j + (j//8)) % len(scale)]
    length = 0.48
    ix0, ix1 = int(start*sr), min(n, int((start+length)*sr))
    lt = np.arange(ix1-ix0) / sr
    env = np.exp(-lt*7.5) * np.minimum(1, lt/.012)
    ph = 2*np.pi*hz*lt
    tone = np.sin(ph) + .25*np.sin(ph*2.01) + .08*np.sin(ph*3.97)
    mix[ix0:ix1] += .055 * env * tone

# Gentle stereo width and clean fades. No transient-heavy impacts or drums.
fadein = np.minimum(1, t/1.8)
fadeout = np.minimum(1, (duration-t)/2.4)
mix *= fadein * fadeout
mix = np.clip(mix, -.32, .32)
stereo = np.column_stack((mix, np.roll(mix, int(sr*.012))*0.94))
pcm = (stereo * 32767).astype("<i2")
out = Path("public/films/candy-rain/music/candy-score.wav")
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(pcm.tobytes())
print(out, f"{duration:.1f}s")
