"""
Builds the skill's built-in sound library (studio/public/sfx/*.mp3) from code.
Every sound is synthesized here, so the skill owns it outright — no licence issues,
safe for monetised channels. The finished files already ship with the skill;
run this only to rebuild them.

Usage (from the studio folder):  py ../.claude/skills/what-if/scripts/make_sfx_library.py
Needs: numpy, ffmpeg.

To replace a sound with a better recording (your own, or the YouTube Audio Library's
sound effects), save it as studio/public/sfx/<same-name>.mp3 — every film picks it up.
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers
def t(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def brown(sec):
    x = np.cumsum(noise(sec))
    x -= np.convolve(x, np.ones(2000) / 2000, mode="same")  # remove drift
    return x / (np.abs(x).max() + 1e-9)


def shape(x, lo=None, hi=None, slope=0.15):
    """Band-limit with soft (cosine) edges, in the frequency domain."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        w = lo * slope + 20
        m *= np.clip((f - (lo - w)) / (2 * w), 0, 1)
    if hi:
        w = hi * slope + 20
        m *= np.clip(((hi + w) - f) / (2 * w), 0, 1)
    m = 0.5 - 0.5 * np.cos(np.pi * m)
    return np.fft.irfft(X * m, len(x))


def peak(x, f, q=8.0):
    """Add a resonant bump at frequency f (body of an object)."""
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    bump = 1 + 3 * np.exp(-((fr - f) / (f / q)) ** 2)
    return np.fft.irfft(X * bump, len(x))


def env(n, attack=0.002, decay=0.1, hold=0.0):
    tt = np.arange(n) / SR
    a = 1 - np.exp(-tt / max(attack, 1e-4))
    d = np.where(tt < hold, 1.0, np.exp(-(tt - hold) / decay))
    return a * d


def pad(x, sec):
    n = int(sec * SR)
    return np.concatenate([x, np.zeros(max(0, n - len(x)))])[:n] if len(x) < n else x[:n]


def place(buf, x, at):
    i = int(at * SR)
    j = min(len(buf), i + len(x))
    if i < len(buf):
        buf[i:j] += x[: j - i]
    return buf


def norm(x, db=-3.0):
    p = np.abs(x).max() + 1e-9
    return x / p * 10 ** (db / 20)


def fade(x, fin=0.003, fout=0.01):
    n1, n2 = int(fin * SR), int(fout * SR)
    if n1:
        x[:n1] *= np.linspace(0, 1, n1)
    if n2:
        x[-n2:] *= np.linspace(1, 0, n2)
    return x


def loopable(x, xf=0.5):
    """Crossfade the end into the start so the file loops with no click."""
    n = int(xf * SR)
    head, tail = x[:n].copy(), x[-n:].copy()
    ramp = np.linspace(0, 1, n)
    out = x[:-n].copy()
    out[:n] = head * ramp + tail * (1 - ramp)
    return out


def sines(freqs, decays, sec, amps=None):
    tt = t(sec)
    out = np.zeros_like(tt)
    amps = amps or [1] * len(freqs)
    for f, d, a in zip(freqs, decays, amps):
        out += a * np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * np.exp(-tt / d)
    return out


# ---------------------------------------------------------------- sounds
def footstep(surface, v):
    sec = 0.35
    j = 1 + (v - 2) * 0.06
    if surface == "floor":  # shoe on wooden floor: heel thump + toe tap
        heel = peak(shape(noise(sec), 60, 420), 110 * j, 3) * env(int(sec * SR), 0.002, 0.045)
        click = shape(noise(sec), 1800, 5200) * env(int(sec * SR), 0.0005, 0.006) * 0.35
        toe = shape(noise(sec), 120, 900) * env(int(sec * SR), 0.002, 0.03) * 0.45
        x = heel + click
        x = place(x, toe, 0.05 + 0.01 * v)
    elif surface == "street":  # hard sole on concrete: sharper, gritty
        heel = shape(noise(sec), 90, 900) * env(int(sec * SR), 0.001, 0.03)
        grit = shape(noise(sec), 1500, 7000) * env(int(sec * SR), 0.001, 0.035) * 0.5
        toe = shape(noise(sec), 400, 4000) * env(int(sec * SR), 0.001, 0.025) * 0.55
        x = heel + grit
        x = place(x, toe + grit * 0.4, 0.045 + 0.01 * v)
    else:  # grass: soft crunch of many tiny snaps
        x = shape(noise(sec), 60, 300) * env(int(sec * SR), 0.004, 0.05) * 0.6
        crackle = np.zeros(int(sec * SR))
        for _ in range(70):
            at = rng.uniform(0, 0.16)
            snap = shape(noise(0.01), 2500, 9000) * env(int(0.01 * SR), 0.0002, 0.0015)
            crackle = place(crackle, snap * rng.uniform(0.2, 1), at)
        x = x + crackle * env(len(crackle), 0.01, 0.07) * 1.4
    return fade(norm(x, -4))


def key(v, space=False):
    sec = 0.18
    n = int(sec * SR)
    down = shape(noise(sec), 1800, 7500) * env(n, 0.0003, 0.004 + 0.001 * (v % 3))
    body = sines([380 + 60 * v if not space else 180, 1200 + 90 * v], [0.012, 0.006], sec, [0.5, 0.25])
    up = shape(noise(sec), 2500, 8000) * env(n, 0.0003, 0.003) * 0.45
    x = down + body * env(n, 0.0005, 0.02)
    x = place(x, up, 0.06 + 0.012 * (v % 4) if not space else 0.09)
    if space:
        x = x + shape(noise(sec), 120, 900) * env(n, 0.001, 0.02) * 0.7
    return fade(norm(x, -6 if not space else -5))


def mouse_click():
    sec = 0.1
    n = int(sec * SR)
    x = shape(noise(sec), 2000, 9000) * env(n, 0.0002, 0.0025) + sines([2400], [0.004], sec, [0.3])
    x = place(x, shape(noise(sec), 2500, 9000) * env(n, 0.0002, 0.002) * 0.5, 0.045)
    return fade(norm(x, -8))


def marker_squeak(v):
    """Whiteboard marker: a felt-tip rasp with a squeaky pitched sweep."""
    sec = 0.32 + 0.12 * v
    tt = t(sec)
    n = len(tt)
    f0 = 1400 + 250 * v
    sweep = f0 * (1 + 0.35 * np.sin(np.pi * tt / sec * (1.2 + 0.3 * v))) + 40 * np.sin(2 * np.pi * 28 * tt)
    ph = 2 * np.pi * np.cumsum(sweep) / SR
    tone = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    rasp = shape(noise(sec), 900, 6000)
    am = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * (34 + 6 * v) * tt))  # stick-slip
    e = env(n, 0.02, 0.12, hold=sec * 0.55)
    x = (tone * 0.55 * am + rasp * 0.45) * e
    return fade(norm(x, -7), 0.01, 0.03)


def marker_tap():
    sec = 0.12
    n = int(sec * SR)
    x = shape(noise(sec), 700, 4000) * env(n, 0.0005, 0.01) + sines([900], [0.01], sec, [0.3])
    return fade(norm(x, -10))


def pen_write(sec=2.4, bright=False):
    """Ballpoint (or pencil when bright) on paper: every stroke has its own pitch, length and
    pressure, with scratchy micro-texture and short irregular gaps — like real handwriting."""
    n = int(sec * SR)
    out = np.zeros(n)
    at = 0.02
    while at < sec - 0.05:
        ln = rng.uniform(0.04, 0.26)
        m = int(ln * SR)
        lo = rng.uniform(1200, 2600) + (900 if bright else 0)
        stroke = shape(noise(ln), lo, lo * rng.uniform(2.2, 3.5))
        tt = np.arange(m) / SR
        press = np.sin(np.pi * tt / ln) ** rng.uniform(0.4, 1.2)          # pressure curve
        jitter = 0.55 + 0.45 * np.abs(shape(noise(ln), 20, 140)) * 4       # paper fibres
        ticks = np.zeros(m)
        for _ in range(int(ln * 40)):
            k = rng.integers(0, max(1, m - 200))
            ticks[k:k + 200] += shape(noise(200 / SR), 3000, 9000) * np.exp(-np.arange(200) / 30) * rng.uniform(0.3, 0.9)
        seg = stroke * press * np.clip(jitter, 0, 1.4) + ticks * press * 0.5
        out = place(out, seg * rng.uniform(0.45, 1.0), at)
        at += ln + (rng.uniform(0.15, 0.35) if rng.random() < 0.18 else rng.uniform(0.005, 0.06))
    return fade(norm(out, -9), 0.01, 0.05)


def knock(times=2):
    sec = 0.3 * times + 0.3
    x = np.zeros(int(sec * SR))
    for k in range(times):
        n = int(0.25 * SR)
        hit = sines([115, 235, 390, 610], [0.06, 0.04, 0.025, 0.015], 0.25, [1, 0.6, 0.4, 0.2])
        hit += shape(noise(0.25), 400, 3000) * env(n, 0.0005, 0.008) * 0.8
        x = place(x, hit * (1 - 0.15 * k), 0.02 + 0.24 * k)
    return fade(norm(x, -4))


def door_close():
    sec = 0.9
    n = int(sec * SR)
    thud = peak(shape(noise(sec), 40, 300), 75, 4) * env(n, 0.003, 0.12)
    latch = shape(noise(sec), 2000, 7000) * env(n, 0.0005, 0.01) * 0.5
    rattle = sines([210, 520], [0.08, 0.05], sec, [0.3, 0.15])
    x = thud + rattle * env(n, 0.002, 0.1)
    x = place(x, latch, 0.03)
    return fade(norm(x, -3))


def door_open():
    sec = 0.8
    n = int(sec * SR)
    latch = shape(noise(sec), 1800, 7000) * env(n, 0.0005, 0.012) * 0.7
    swish = shape(noise(sec), 200, 1500) * env(n, 0.1, 0.25) * 0.35
    return fade(norm(latch + swish, -6))


def plate(v):
    sec = 0.9
    n = int(sec * SR)
    fs = [2150 + 90 * v, 3420 + 120 * v, 5230, 7810 - 150 * v]
    ring = sines(fs, [0.35, 0.22, 0.12, 0.07], sec, [1, 0.7, 0.45, 0.3])
    hit = shape(noise(sec), 1500, 9000) * env(n, 0.0003, 0.004)
    x = ring * env(n, 0.0005, 0.25) * 0.6 + hit
    x = place(x, ring * env(n, 0.0005, 0.08) * 0.25, 0.035)  # small rattle as it settles
    return fade(norm(x, -7))


def cup_down():
    sec = 0.5
    n = int(sec * SR)
    thud = shape(noise(sec), 80, 700) * env(n, 0.001, 0.03)
    ring = sines([1650, 2900], [0.12, 0.06], sec, [0.5, 0.25])
    return fade(norm(thud + ring * env(n, 0.0005, 0.1), -7))


def water_tap(sec=4.0):
    tt = t(sec)
    flow = shape(noise(sec), 250, 3500)
    bubbles = np.zeros_like(tt)
    for _ in range(int(sec * 60)):
        at = rng.uniform(0, sec - 0.05)
        f = rng.uniform(500, 1800)
        b = np.sin(2 * np.pi * f * t(0.04) * (1 + 0.8 * t(0.04) / 0.04)) * env(int(0.04 * SR), 0.001, 0.01)
        bubbles = place(bubbles, b * rng.uniform(0.2, 0.7), at)
    am = 0.75 + 0.25 * shape(noise(sec), 2, 20) / 0.2
    x = flow * np.clip(am, 0.4, 1.2) * 0.6 + bubbles * 0.5 + shape(noise(sec), 40, 200) * 0.2
    return loopable(norm(x, -8))


def beeps(n=3, f=2100):
    sec = 0.32 * n + 0.2
    x = np.zeros(int(sec * SR))
    for k in range(n):
        b = np.sign(np.sin(2 * np.pi * f * t(0.11))) * 0.6 + np.sin(2 * np.pi * f * t(0.11))
        b = shape(b, 300, 6000) * env(len(b), 0.002, 0.2, hold=0.08)
        x = place(x, fade(b, 0.003, 0.01), 0.02 + 0.3 * k)
    return fade(norm(x, -8))


def alarm_loop():
    sec = 2.0
    x = np.zeros(int(sec * SR))
    for k in range(4):
        b = np.sin(2 * np.pi * 1750 * t(0.12)) + 0.4 * np.sin(2 * np.pi * 3500 * t(0.12))
        x = place(x, fade(b * env(len(b), 0.003, 0.3, hold=0.1), 0.003, 0.01), 0.05 + 0.18 * k)
    return norm(x, -9)


def ping():
    sec = 1.0
    n = int(sec * SR)
    a = sines([1318.5, 2637], [0.25, 0.1], sec, [1, 0.25]) * env(n, 0.002, 0.25)
    b = sines([1760, 3520], [0.35, 0.12], sec, [1, 0.25]) * env(n, 0.002, 0.35)
    x = place(a, b, 0.11)
    return fade(norm(x, -10))


def vibrate():
    sec = 1.1
    tt = t(sec)
    buzz = np.sign(np.sin(2 * np.pi * 165 * tt)) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * tt))
    gate = ((tt % 0.55) < 0.38).astype(float)
    x = shape(buzz, 80, 2000) * gate * env(len(tt), 0.005, 9)
    return fade(norm(x, -10))


def laptop_close():
    sec = 0.5
    n = int(sec * SR)
    x = shape(noise(sec), 60, 600) * env(n, 0.002, 0.04) + shape(noise(sec), 1500, 6000) * env(n, 0.0005, 0.006) * 0.4
    return fade(norm(x, -6))


def page_flip():
    sec = 0.55
    tt = t(sec)
    x = shape(noise(sec), 900, 7000) * np.exp(-((tt - 0.18) / 0.08) ** 2)
    x += shape(noise(sec), 2000, 8000) * env(len(tt), 0.0005, 0.01) * 0.3
    return fade(norm(x, -9))


def clock_loop():
    sec = 4.0
    x = np.zeros(int(sec * SR))
    for k in range(4):
        f = 2600 if k % 2 == 0 else 2250
        tick = sines([f, f * 1.9], [0.01, 0.006], 0.06, [1, 0.4]) + shape(noise(0.06), 2000, 8000) * env(int(0.06 * SR), 0.0002, 0.002)
        x = place(x, tick, 0.02 + k)
    return norm(x, -14)


def switch():
    sec = 0.15
    n = int(sec * SR)
    x = shape(noise(sec), 1000, 7000) * env(n, 0.0002, 0.004) + sines([1900], [0.01], sec, [0.4])
    return fade(norm(x, -9))


def heartbeat():
    sec = 1.6
    x = np.zeros(int(sec * SR))
    beat = sines([52, 70], [0.07, 0.05], 0.3, [1, 0.6]) * env(int(0.3 * SR), 0.004, 0.08)
    x = place(x, beat, 0.0)
    x = place(x, beat * 0.7, 0.28)
    return norm(x, -6)


def whoosh():
    sec = 1.1
    tt = t(sec)
    n = len(tt)
    x = np.zeros(n)
    nz = noise(sec)
    for i, (lo, hi) in enumerate([(200, 800), (500, 1800), (900, 3500), (500, 1800), (200, 800)]):
        w = np.exp(-((tt - (0.15 + i * 0.16)) / 0.13) ** 2)
        x += shape(nz, lo, hi) * w
    return fade(norm(x, -9), 0.02, 0.05)


def breath(kind):
    """Wordless voice sounds: a soft sigh (exhale), a gasp (sharp inhale), or panting."""
    if kind == "sigh":
        sec = 1.5
        tt = t(sec)
        x = shape(noise(sec), 250, 3000)
        x = peak(peak(x, 650, 4), 1150, 5)
        e = np.sin(np.pi * np.clip(tt / 1.3, 0, 1)) ** 1.5 * np.exp(-tt / 0.9)
        voice = sines([105, 210, 315], [0.6, 0.4, 0.3], sec, [0.08, 0.05, 0.03]) * (tt < 0.5)
        return fade(norm(x * e + voice * e, -10), 0.05, 0.1)
    if kind == "gasp":
        sec = 0.6
        tt = t(sec)
        x = peak(shape(noise(sec), 700, 5000), 1800, 4)
        e = np.clip(tt / 0.12, 0, 1) * np.exp(-np.clip(tt - 0.12, 0, None) / 0.09)
        return fade(norm(x * e, -10), 0.01, 0.05)
    sec = 2.0  # pant loop: in / out / in / out
    x = np.zeros(int(sec * SR))
    for k in range(4):
        ln = 0.42
        tt = t(ln)
        b = peak(shape(noise(ln), 400 if k % 2 else 600, 3500), 900 if k % 2 else 1300, 4)
        x = place(x, b * np.sin(np.pi * tt / ln) ** 2 * (1 if k % 2 else 0.7), 0.04 + k * 0.48)
    return norm(x, -12)


def cloth():
    sec = 0.45
    tt = t(sec)
    x = shape(noise(sec), 400, 4500) * np.sin(np.pi * tt / sec) ** 2 * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * tt)))
    return fade(norm(x, -14))


def shop_bell():
    sec = 1.6
    n = int(sec * SR)
    x = np.zeros(n)
    for k, f in enumerate([2093, 2637]):
        ring = sines([f, f * 2.76, f * 5.4], [0.6, 0.3, 0.15], sec, [1, 0.4, 0.2])
        x = place(x, ring * env(n, 0.001, 0.5) * (1 - 0.2 * k), 0.09 * k)
    return fade(norm(x, -11))


def car_horn():
    sec = 0.7
    tt = t(sec)
    x = np.sign(np.sin(2 * np.pi * 415 * tt)) + np.sign(np.sin(2 * np.pi * 500 * tt))
    x = shape(x, 200, 3500) * env(len(tt), 0.01, 0.5, hold=0.5)
    return fade(norm(x, -10), 0.01, 0.06)


# ---------------------------------------------------------------- ambience beds (loop)
def room_tone(sec=10):
    x = shape(noise(sec), 40, 900) * 0.6 + brown(sec) * 0.3 + np.sin(2 * np.pi * 60 * t(sec)) * 0.02
    return loopable(norm(x, -30))


def night(sec=10):
    base = room_tone(sec + 0.5)[: int(sec * SR)] * 0.8
    tt = t(sec)
    crick = np.zeros_like(tt)
    at = 0.2
    while at < sec - 0.5:
        f = rng.choice([4300, 4700, 5100])
        chirp = np.zeros(int(0.3 * SR))
        for p in range(3):
            pulse = np.sin(2 * np.pi * f * t(0.03)) * np.sin(np.pi * t(0.03) / 0.03) ** 2
            chirp = place(chirp, pulse, p * 0.05)
        crick = place(crick, chirp * rng.uniform(0.2, 0.6), at)
        at += rng.uniform(0.4, 1.1)
    x = norm(base, -32) + norm(crick, -30)
    return loopable(x)


def city(sec=10):
    rumble = brown(sec) * 0.7 + shape(noise(sec), 60, 500) * 0.3
    tt = t(sec)
    swells = np.zeros_like(tt)
    for _ in range(3):
        c = rng.uniform(1.5, sec - 1.5)
        swells += np.exp(-((tt - c) / 0.9) ** 2)
    hiss = shape(noise(sec), 500, 3000) * swells * 0.5
    return loopable(norm(rumble + hiss, -26))


def rain(sec=10):
    hiss = shape(noise(sec), 300, 9000) * 0.45 + shape(noise(sec), 60, 300) * 0.3
    drops = np.zeros(int(sec * SR))
    for _ in range(int(sec * 140)):
        d = shape(noise(0.015), 2000, 9000) * env(int(0.015 * SR), 0.0002, 0.0025)
        drops = place(drops, d * rng.uniform(0.1, 0.7), rng.uniform(0, sec))
    return loopable(norm(hiss + drops, -14))


def wind(sec=10):
    tt = t(sec)
    nz = noise(sec)
    x = np.zeros_like(tt)
    for k, (lo, hi) in enumerate([(100, 400), (300, 900), (600, 1600)]):
        x += shape(nz, lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * tt + k))
    return loopable(norm(x, -20))


def birds(sec=10):
    base = shape(noise(sec), 80, 800) * 0.05
    out = np.zeros(int(sec * SR))
    at = 0.3
    while at < sec - 0.6:
        f0 = rng.uniform(2600, 4200)
        notes = rng.integers(2, 5)
        song = np.zeros(int(0.6 * SR))
        for p in range(notes):
            ln = rng.uniform(0.05, 0.11)
            tt = t(ln)
            fsw = f0 * (1 + rng.uniform(-0.25, 0.3) * tt / ln)
            ph = 2 * np.pi * np.cumsum(fsw) / SR
            song = place(song, np.sin(ph) * np.sin(np.pi * tt / ln) ** 2, p * (ln + 0.03))
        out = place(out, song * rng.uniform(0.25, 0.7), at)
        at += rng.uniform(0.5, 1.6)
    return loopable(norm(base + out * 0.8, -22))


def gym(sec=10):  # big hollow room: distant thuds and a hum
    base = room_tone(sec + 0.5)[: int(sec * SR)]
    tt = t(sec)
    thuds = np.zeros_like(tt)
    for _ in range(6):
        th = shape(noise(0.4), 50, 300) * env(int(0.4 * SR), 0.003, 0.12)
        thuds = place(thuds, th * rng.uniform(0.2, 0.5), rng.uniform(0, sec - 0.5))
    return loopable(norm(base * 0.6 + thuds, -24))


LIBRARY = {}
for s in ("floor", "street", "grass"):
    for v in range(1, 5):
        LIBRARY[f"step-{s}-{v}"] = (lambda s=s, v=v: footstep(s, v), f"one footstep on {s}")
for v in range(1, 7):
    LIBRARY[f"key-{v}"] = (lambda v=v: key(v), "one keyboard key press")
LIBRARY["key-space"] = (lambda: key(3, space=True), "keyboard space bar")
LIBRARY["mouse-click"] = (mouse_click, "computer mouse click")
for v in range(1, 4):
    LIBRARY[f"marker-squeak-{v}"] = (lambda v=v: marker_squeak(v), "whiteboard marker stroke with a squeak")
LIBRARY["marker-tap"] = (marker_tap, "marker touching the board / cap click")
LIBRARY["pen-write"] = (lambda: pen_write(2.4, False), "pen writing on paper, 2.4s")
LIBRARY["pencil-write"] = (lambda: pen_write(2.4, True), "pencil writing on paper, 2.4s")
LIBRARY["knock"] = (lambda: knock(2), "two knocks on a wooden door")
LIBRARY["door-open"] = (door_open, "door latch and swing open")
LIBRARY["door-close"] = (door_close, "door shutting")
for v in range(1, 4):
    LIBRARY[f"plate-{v}"] = (lambda v=v: plate(v), "ceramic plate clink")
LIBRARY["cup-down"] = (cup_down, "mug set down on a table")
LIBRARY["water-tap"] = (water_tap, "kitchen tap running (loops)")
LIBRARY["beeps"] = (beeps, "three electronic beeps (microwave, timer done)")
LIBRARY["alarm"] = (alarm_loop, "phone alarm beeping (loops)")
LIBRARY["ping"] = (ping, "phone message notification")
LIBRARY["vibrate"] = (vibrate, "phone vibrating on a table")
LIBRARY["laptop-close"] = (laptop_close, "laptop lid closing")
LIBRARY["page-flip"] = (page_flip, "turning a page")
LIBRARY["clock-tick"] = (clock_loop, "clock ticking (loops)")
LIBRARY["switch"] = (switch, "light switch / lamp click")
LIBRARY["heartbeat"] = (heartbeat, "heartbeat (loops) — tension")
LIBRARY["whoosh"] = (whoosh, "soft whoosh — time jump, transition")
LIBRARY["sigh"] = (lambda: breath("sigh"), "a tired sigh (wordless)")
LIBRARY["gasp"] = (lambda: breath("gasp"), "a short gasp (wordless)")
LIBRARY["pant"] = (lambda: breath("pant"), "panting while running (loops)")
LIBRARY["cloth"] = (cloth, "clothes rustle — sitting down, standing up, turning")
LIBRARY["shop-bell"] = (shop_bell, "shop door bell")
LIBRARY["car-horn"] = (car_horn, "car horn")
LIBRARY["amb-room"] = (room_tone, "AMBIENCE: quiet indoor room tone (loops)")
LIBRARY["amb-night"] = (night, "AMBIENCE: night, room tone + distant crickets (loops)")
LIBRARY["amb-city"] = (city, "AMBIENCE: street / city hum with passing traffic (loops)")
LIBRARY["amb-rain"] = (rain, "AMBIENCE: rain (loops)")
LIBRARY["amb-wind"] = (wind, "AMBIENCE: wind outdoors (loops)")
LIBRARY["amb-birds"] = (birds, "AMBIENCE: morning birds — payoff outdoors (loops)")
LIBRARY["amb-gym"] = (gym, "AMBIENCE: big hollow room, distant thuds (loops)")


def write_mp3(x, path):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-b:a", "96k", str(path)], check=True)
    Path(tmp.name).unlink(missing_ok=True)


def main():
    out = Path("public/sfx")
    if not Path("public").exists():
        sys.exit("Run this from the studio folder.")
    out.mkdir(parents=True, exist_ok=True)
    lines = []
    for name, (fn, desc) in LIBRARY.items():
        x = fn()
        write_mp3(x, out / f"{name}.mp3")
        lines.append(f"{name}\t{len(x) / SR:.2f}s\t{desc}")
        print(f"made {name:18s} {len(x) / SR:5.2f}s  {desc}")
    (out / "LIBRARY.txt").write_text("name\tlength\twhat it is\n" + "\n".join(lines) + "\n", encoding="utf-8")
    # the list the film code checks, so a typo'd sound name is caught by the type checker
    ts = ["// Generated by scripts/make_sfx_library.py — the built-in sounds in public/sfx/.",
          "export const SFX_LIBRARY = ["] + [f'  "{n}",' for n in LIBRARY] + ["] as const;",
          "export type LibrarySound = (typeof SFX_LIBRARY)[number];", ""]
    Path("src/lib/sfxLibrary.ts").write_text("\n".join(ts), encoding="utf-8")
    print(f"\n{len(LIBRARY)} sounds in {out}")


if __name__ == "__main__":
    main()
