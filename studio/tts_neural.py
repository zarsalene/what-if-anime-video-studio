"""Natural, conversational neural narration for the one-minute Earth What If Short."""
import asyncio, os, subprocess, sys
import edge_tts

VOICE = "en-US-ChristopherNeural"
PITCH = "+5Hz"
RATE = "+3%"

LINES = [
    "At the equator, Earth moves east at about sixteen hundred seventy kilometers an hour.",
    "We don't feel the spin; the ground, air and oceans travel with us.",
    "Imagine the solid ground stops instantly. It's a thought experiment; no known process can halt Earth that way.",
    "The air and loose objects keep moving. The mismatch is greatest near the equator.",
    "The oceans carry momentum too. Water would surge, but exact flooding depends on how the stop happens.",
    "If Earth stopped spinning but kept orbiting the Sun, one solar day would last about a year.",
    "That means months of daylight, then months of night. Winds and ocean circulation would change.",
    "Climate needs models; spin shapes winds and oceans.",
]
WINDOWS = [5.9, 5.9, 8.6, 6.8, 7.8, 7.6, 7.0, 5.4]

OUT = os.path.join("out", "earth-stopped", "tts_raw")
os.makedirs(OUT, exist_ok=True)


async def gen(i: int, text: str, rate: str) -> str:
    path = os.path.join(OUT, f"n{i+1}_raw.mp3")
    await edge_tts.Communicate(text, VOICE, pitch=PITCH, rate=rate).save(path)
    return path


def dur(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True)
    return float(out.stdout.strip())


async def main():
    rates = [RATE] * len(LINES)
    for attempt in range(3):
        paths = [await gen(i, t, rates[i]) for i, t in enumerate(LINES)]
        ds = [dur(p) for p in paths]
        over = [(i, ds[i], WINDOWS[i]) for i in range(len(LINES)) if ds[i] > WINDOWS[i]]
        print("durations:", ", ".join(f"n{i+1}={d:.2f}/{WINDOWS[i]:.2f}" for i, d in enumerate(ds)))
        if not over:
            print("ALL FIT")
            return
        for i, d, w in over:
            # need speed-up factor w/d, convert to percentage on top of current
            cur = int(rates[i].rstrip("%"))
            # Edge rate is relative to normal speech; duration scales roughly
            # with the inverse of (100 + rate). Correct in the faster direction.
            target = (100 + cur) * (d / w) - 100
            rates[i] = f"{round(target):+d}%"
            print(f"  over: n{i+1} {d:.2f}s > {w}s -> rate {rates[i]}")
    sys.exit(1)

asyncio.run(main())
