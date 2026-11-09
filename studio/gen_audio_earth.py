"""Sound design v2 for EARTH STOPPED SPINNING — full rewrite.

Big upgrades over v1:
  * stereo output with decorrelated width everywhere
  * Schroeder reverb (comb + allpass) on impacts / risers / crashes
  * real filters (scipy butter sos) instead of box-smoothing
  * richer music: chord-progression saw pads with brightness envelope,
    proper kick synthesis, band-sweep riser, ducking for the end card
  * saturated, layered braams with sub drops

Run from the studio folder:  python gen_audio_earth.py
Writes WAVs to public/films/earth-stopped/audio/ (same names as before).
"""
import numpy as np
import wave
from pathlib import Path
from scipy import signal

SR = 44100
OUT = Path("public/films/earth-stopped/audio")
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20261108)


# ------------------------------------------------------------------ helpers
def save(name, x, peak_db=-1.5):
    """x: (N,) mono or (N,2) stereo float -> 16-bit PCM wav."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.abs(x).max()
    if peak > 0:
        x = x / peak * (10 ** (peak_db / 20))
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"wrote {name}.wav  {len(x)/SR:.2f}s  stereo")


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def white(n, seed=None):
    r = rng if seed is None else np.random.default_rng(seed)
    return r.standard_normal(n)


def pink(n, seed=None):
    w = white(n, seed)
    X = np.fft.rfft(w)
    f = np.arange(len(X))
    f[0] = 1
    X /= np.sqrt(f)
    x = np.fft.irfft(X, n)
    return x / (np.abs(x).max() + 1e-9)


def brown(n, seed=None):
    w = white(n, seed)
    X = np.fft.rfft(w)
    f = np.arange(len(X))
    f[0] = 1
    X /= f
    x = np.fft.irfft(X, n)
    return x / (np.abs(x).max() + 1e-9)


def sos_bp(lo, hi, order=3):
    return signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "bandpass", output="sos")


def sos_lp(fc, order=3):
    return signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low", output="sos")


def sos_hp(fc, order=2):
    return signal.butter(order, fc / (SR / 2), "high", output="sos")


def flt(x, sos):
    return signal.sosfilt(sos, x)


def env_pts(dur, pts):
    t = t_axis(dur)
    xs = np.array([p[0] for p in pts])
    ys = np.array([p[1] for p in pts])
    return np.interp(t, xs, ys)


def smooth01(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def fades(x, dur, fin=0.05, fout=0.3):
    t = np.arange(x.shape[0]) / SR
    fi = np.clip(t / fin, 0, 1)
    fo = np.clip((dur - t) / fout, 0, 1)
    g = (fi * fo)[:, None] if x.ndim == 2 else fi * fo
    return x * g


def stereo(mono, width_ms=4.0, rev_phase=False):
    """Haas-style width: duplicate with a few ms delay + tiny gain diff."""
    d = int(SR * width_ms / 1000)
    L = mono.copy()
    R = np.zeros_like(mono)
    R[d:] = mono[:-d]
    if rev_phase:
        R = -R * 0.9
    return np.stack([L, R * 0.92], axis=1)


def reverb(x, room=0.82, wet=0.28, spread=23, pre=25):
    """Schroeder: 4 parallel combs + 2 series allpass per channel.

    x: (N,) mono or (N,2). Returns same shape, dry/wet mixed.
    """
    mono_in = x.ndim == 1
    if mono_in:
        x = np.stack([x, x], axis=1)
    out = np.zeros_like(x)
    combs = [1687, 1601, 2053, 2251]
    aps = [(556, 0.5), (441, 0.5)]
    for ch in range(2):
        xi = x[:, ch]
        acc = np.zeros_like(xi)
        for i, D in enumerate(combs):
            Dc = D + (spread if ch else 0)
            a = np.zeros(Dc + 1)
            a[0] = 1.0
            a[Dc] = -(room - i * 0.02)
            acc += signal.lfilter([1.0], a, xi)
        acc /= len(combs)
        for D, g in aps:
            b = np.zeros(D + 1)
            b[0] = -g
            b[D] = 1.0
            a = np.zeros(D + 1)
            a[0] = 1.0
            a[D] = -g
            acc = signal.lfilter(b, a, acc)
        acc = np.concatenate([np.zeros(pre), acc[:-pre]])
        out[:, ch] = (1 - wet) * xi + wet * acc
    if mono_in:
        return out.mean(axis=1)
    return out


def saw(f, t, harm=10, bright=1.0, phase=0.0):
    """Harmonic-limited sawtooth; bright in [0,1] opens/closes harmonics."""
    y = np.zeros_like(t)
    H = max(2, int(round(harm * (0.25 + 0.75 * bright))))
    for n in range(1, H + 1):
        roll = np.clip(bright * (harm + 1) - n + 1, 0, 1)  # soft top rolloff
        y += roll * np.sin(2 * np.pi * f * n * t + phase * n) / (n ** 1.15)
    return y


def kick(t0, dur, f_hi=68.0, f_lo=36.0, amp=0.5):
    n = int(dur * SR)
    i0 = int(t0 * SR)
    u = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-u / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-u / 0.16)
    click = white(n) * np.exp(-u / 0.0025) * 0.35
    return i0, amp * np.tanh(1.6 * (body + click)), n


def add_at(buf, i0, x, n):
    n = min(n, buf.shape[0] - i0)
    if n <= 0:
        return
    buf[i0 : i0 + n] += x[:n]


# ------------------------------------------------------------------ music bed
def music_bed():
    dur = 60.0
    t = t_axis(dur)
    n = len(t)
    # A restrained, warm cinematic bed: slow harmony, soft pulse, no horror hits.
    chords = [
        (0, 10, [110.00, 164.81, 220.00, 261.63]),
        (10, 20, [87.31, 130.81, 174.61, 220.00]),
        (20, 30, [73.42, 146.83, 174.61, 220.00]),
        (30, 39, [98.00, 146.83, 196.00, 246.94]),
        (39, 48, [65.41, 130.81, 164.81, 196.00]),
        (48, 56, [73.42, 110.00, 146.83, 220.00]),
        (56, 60, [87.31, 130.81, 174.61, 220.00]),
    ]
    pad = np.zeros(n)
    for start, end, notes in chords:
        gate = smooth01((t - start) / 1.2) * (1 - smooth01((t - (end - 0.9)) / 1.1))
        block = np.zeros(n)
        for i, freq in enumerate(notes):
            block += np.sin(2 * np.pi * freq * t + i * 0.63) * (0.7 - 0.1 * i)
        pad += block * gate / len(notes)
    pad = flt(pad, sos_lp(1500))
    pulse = np.zeros(n)
    at = 12.0
    while at < 38.0:
        i0, sample, length = kick(at, 0.24, f_hi=58, f_lo=42, amp=0.12)
        add_at(pulse, i0, sample, length)
        at += 1.6
    shimmer = 0.018 * np.sin(2 * np.pi * 659.25 * t + 0.3 * np.sin(2 * np.pi * 0.12 * t))
    shimmer *= smooth01((t - 37) / 3) * (1 - smooth01((t - 56) / 2))
    swell = 0.78 + 0.22 * smooth01(t / 9) + 0.18 * smooth01((t - 37) / 8)
    mono = np.tanh((pad * 0.15 + pulse * 0.25 + shimmer * 0.18) * swell)
    fade = smooth01(t / 1.5) * (1 - smooth01((t - 58.5) / 1.5))
    mono *= fade
    delayed = np.concatenate([np.zeros(80), mono[:-80]])
    mix = np.stack([mono, delayed * 0.92], axis=1)
    save("music-bed", mix, peak_db=-10.0)


# ------------------------------------------------------------------ wind roar
def wind_roar():
    dur = 10.5  # matches the wind sequence with a gentle fade into the ocean shot
    t = t_axis(dur)
    n = len(t)
    out = np.zeros((n, 2))
    gust = 0.5 + 0.5 * np.sin(2 * np.pi * 0.55 * t + 1.2) * np.sin(2 * np.pi * 0.13 * t)
    for ch in range(2):
        w = white(n, seed=200 + ch)
        low = flt(w, sos_bp(70, 350))
        mid = flt(w, sos_bp(350, 1400))
        high = flt(w, sos_bp(1400, 4800))
        x = low * 0.85 * (0.65 + 0.35 * gust) + mid * 0.5 * (0.35 + 0.65 * gust) + high * 0.22 * (0.15 + 0.85 * gust ** 2)
        howl = np.sin(2 * np.pi * np.cumsum(300 + 70 * np.sin(2 * np.pi * 0.4 * t)) / SR + ch)
        x += howl * gust * 0.10
        out[:, ch] = x
    out = flt(out, sos_hp(45))
    out = fades(out, dur, fin=0.6, fout=0.9)
    save("wind-roar", out, peak_db=-2.5)


# ------------------------------------------------------------------ ocean rumble
def ocean_rumble():
    dur = 18.0  # looped under the ocean and shoreline sequence
    t = t_axis(dur)
    n = len(t)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * 0.24 * t + 0.5)
    out = np.zeros((n, 2))
    for ch in range(2):
        b = brown(n, seed=300 + ch)
        low = flt(b, sos_lp(240))
        mid = flt(b, sos_bp(240, 900))
        top = flt(white(n, seed=400 + ch), sos_bp(1200, 4000))
        x = low * 1.15 * (0.7 + 0.3 * swell) + mid * 0.4 * swell + top * 0.10 * swell
        x += 0.35 * np.sin(2 * np.pi * 34.5 * t + ch) * swell
        out[:, ch] = x
    out = fades(out, dur, fin=0.9, fout=1.0)
    save("ocean-rumble", out, peak_db=-3.0)


# ------------------------------------------------------------------ braam
def impact_braam():
    dur = 2.4
    t = t_axis(dur)
    n = len(t)
    drop = 1.0 - 0.42 * np.clip(t / 1.1, 0, 1)          # pitch dive
    x = np.zeros(n)
    # sub drop
    x += 0.9 * np.sin(2 * np.pi * np.cumsum(58 * drop) / SR) * np.exp(-t / 1.0)
    # horn stack: detuned saws
    for f in (55.0, 82.41, 110.0, 146.83):
        for det in (0.994, 1.0, 1.007):
            x += 0.22 * saw(f * det, t, harm=8, bright=0.8) * np.exp(-t / 1.15)
    x = np.tanh(1.9 * x)
    # noise transient
    nb = int(0.05 * SR)
    tr = flt(white(nb), sos_bp(200, 6000)) * np.exp(-np.arange(nb) / (0.008 * SR))
    x[:nb] += tr * 0.7
    x *= np.exp(-t / 1.5)
    out = reverb(x, room=0.84, wet=0.30, pre=30)
    if out.ndim == 1:
        out = np.stack([out, out], axis=1)
    out = fades(out, dur, fin=0.002, fout=0.5)
    save("impact-braam", out, peak_db=-1.0)


def freeze_sweep():
    dur = 1.05
    t = t_axis(dur)
    n = len(t)
    f = 1200 * np.exp(-4.6 * t / dur) + 44
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * (0.55 + 0.45 * t / dur) * np.exp(-3.0 * t / dur)
    x += 0.30 * np.sin(ph / 2) * np.exp(-2.6 * t / dur)
    # icy noise sparkle
    x += 0.30 * flt(white(n), sos_bp(3000, 9000)) * np.exp(-4.5 * t / dur)
    x += 0.22 * flt(white(n), sos_bp(300, 2000)) * np.exp(-2.2 * t / dur)
    out = reverb(x, room=0.80, wet=0.34, pre=40)
    if out.ndim == 1:
        out = np.stack([out, out], axis=1)
    save("freeze-sweep", out, peak_db=-3.0)


def wave_crash():
    dur = 3.0
    t = t_axis(dur)
    n = len(t)
    body = brown(n)
    body = flt(body, sos_bp(40, 700))
    rise = smooth01((t - 0.2) / 1.2)
    decay = np.exp(-np.clip(t - 1.5, 0, None) / 0.6)
    amp = np.where(t < 1.5, rise, decay)
    out = np.zeros((n, 2))
    for ch in range(2):
        splash = flt(white(n, seed=500 + ch), sos_bp(900, 6500))
        x = body * amp * 1.1 + splash * decay * 0.45 * (0.7 + 0.3 * rise)
        # secondary thump as the crest collapses
        th = 0.5 * np.sin(2 * np.pi * 42 * t) * np.exp(-np.clip(t - 1.5, 0, None) / 0.25)
        out[:, ch] = x + th
    out = reverb(out, room=0.78, wet=0.24, pre=35)
    out = fades(out, dur, fin=0.1, fout=0.5)
    save("wave-crash", out, peak_db=-1.5)


def riser_earth(dur=2.4):
    """dark transition riser into space"""
    t = t_axis(dur)
    n = len(t)
    prog = np.clip(t / dur, 0, 1)
    x = np.zeros(n)
    bands = [(250, 600), (600, 1400), (1400, 3000), (3000, 6500)]
    for i, (lo, hi) in enumerate(bands):
        w = np.clip(1 - np.abs(prog * (len(bands) - 1) - i), 0, 1)
        x += flt(white(n, seed=600 + i), sos_bp(lo, hi)) * w * 0.5
    f = 260 * np.exp(2.1 * prog)
    x += 0.45 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    x += 0.3 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.4
    x *= smooth01(t / 0.35) ** 1.5 * (1 - smooth01((t - (dur - 0.18)) / 0.18))
    out = reverb(x, room=0.82, wet=0.32, pre=30)
    if out.ndim == 1:
        out = np.stack([out, out], axis=1)
    save("space-riser", out, peak_db=-4.0)


if __name__ == "__main__":
    music_bed()
    wind_roar()
    ocean_rumble()
    impact_braam()
    freeze_sweep()
    wave_crash()
    riser_earth()
    print("done")
