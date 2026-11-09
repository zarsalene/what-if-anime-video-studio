"""
Listens to a rendered film and reports, shot by shot, whether it has sound.
Run it after a render WITH sound (not --muted). Fix every FAIL before handing over.

Usage (from the studio folder):
  py ../.claude/skills/what-if/scripts/sound_check.py <slug> out/<slug>/raw.mp4

For each shot it measures:
  level   — average loudness (dBFS)
  events  — sound effects that stand out from the background (steps, keys, knocks…)
FAIL  dead silence: a stretch of 1.5 s or more with almost no sound at all
FAIL  a story/montage/insert shot with no sound effect standing out (only background)
WARN  a story shot with fewer events than its action suggests (check footsteps/typing)
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 16000


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    slug, video = sys.argv[1], sys.argv[2]
    sb = json.loads(Path(f"src/films/{slug}/storyboard.json").read_text(encoding="utf-8"))
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True).stdout
    if len(raw) < 1000:
        # some ffmpeg builds (Remotion's bundled one) lack the raw s16le muxer: retry via a
        # wav pipe and skip the 44-byte header — the measured numbers stay identical
        wav = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vn", "-ac", "1", "-ar", str(SR), "-f", "wav", "-"],
                              capture_output=True).stdout
        raw = wav[44:] if len(wav) > 44 else b""
    if not raw:
        sys.exit("FAIL: the video has no audio track at all. Render without --muted.")
    x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
    win = int(0.05 * SR)  # 50 ms windows
    n = len(x) // win
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)

    # the film's background bed level: quiet windows across all picture shots
    starts, tt = [], 0.0
    for sh in sb["shots"]:
        starts.append(tt)
        tt += sh["seconds"]
    pic = np.concatenate([db[int(a / 0.05):int((a + sh["seconds"]) / 0.05)] for a, sh in zip(starts, sb["shots"]) if sh["kind"] != "card"] or [db])
    bed = np.percentile(pic, 20)

    fails, warns = 0, 0
    print(f"{'shot':6} {'kind':8} {'sec':>5} {'level':>7} {'events':>6}  result")
    t = 0.0
    for s in sb["shots"]:
        a, b = int(t / 0.05), int((t + s["seconds"]) / 0.05)
        seg = db[a:b] if b > a else np.array([-120.0])
        floor = np.percentile(seg, 30)
        # an "event" = a window that jumps 8 dB above the shot's background and above -45 dBFS
        hot = (seg > floor + 8) & (seg > -45)
        events = int(np.sum(hot[1:] & ~hot[:-1]) + (1 if hot[0] else 0))
        level = 10 * np.log10(np.mean(10 ** (seg / 10)))
        busy = np.median(seg) > bed + 6 and np.median(seg) > -45  # continuous foley (water, writing, rain on top of the bed)
        if busy and events == 0:
            events = 1
        # dead silence: 1.5 s under -60 dBFS
        quiet = seg < -60
        run, longest = 0, 0
        for q in quiet:
            run = run + 1 if q else 0
            longest = max(longest, run)
        result = "ok"
        if longest * 0.05 >= 1.5 and s["kind"] != "card":
            result = "FAIL dead silence — add ambience under this scene"
            fails += 1
        elif s["kind"] in ("story", "montage", "insert") and events == 0:
            result = "FAIL no sound effects — add foley for what happens (steps, keys, writing, objects)"
            fails += 1
        elif s["kind"] == "story" and s["seconds"] >= 4 and events < 2:
            result = "WARN only one sound — is there more action to hear?"
            warns += 1
        print(f"{s['id']:6} {s['kind']:8} {s['seconds']:5.1f} {level:7.1f} {events:6d}  {result}")
        t += s["seconds"]

    total = 10 * np.log10(np.mean(rms ** 2))
    print(f"\nwhole film average level: {total:.1f} dBFS")
    if fails:
        print(f"{fails} FAIL — fix these shots, render again, and re-run this check.")
        sys.exit(1)
    print(f"OK — every shot has sound ({warns} warnings to look at).")


if __name__ == "__main__":
    main()
