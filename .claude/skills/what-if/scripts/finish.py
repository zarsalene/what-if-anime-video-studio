"""
Final step: sets the finished film to YouTube loudness (-14 LUFS, peaks under -1.5 dB)
and writes out/<slug>/<slug>-final.mp4. The picture is copied, not re-encoded.

Usage (from the studio folder):
  py ../.claude/skills/what-if/scripts/finish.py <slug>           # film:  out/<slug>/raw.mp4 → <slug>-final.mp4
  py ../.claude/skills/what-if/scripts/finish.py <slug> --short   # short: out/<slug>/short-raw.mp4 → <slug>-short-final.mp4
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def has_audio(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                        "stream=index", "-of", "json", str(p)], capture_output=True, text=True)
    return bool(json.loads(r.stdout or "{}").get("streams"))


def measure(video):
    """loudnorm measurements (I, TP, LRA, thresh). Some ffmpeg builds (Remotion's) cannot mux
    `null` — measure by encoding a throwaway wav instead; loudnorm still prints its JSON to stderr."""
    wav = video.with_name(video.stem + "-loudnorm-probe.wav")
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(video), "-af",
                            "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-y", str(wav)],
                           capture_output=True, text=True)
        txt = (r.stderr or "") + (r.stdout or "")
        m = re.search(r"\{[^{}]*\}", txt, re.S)
        js = json.loads(m.group(0)) if m else {}
        if "input_i" not in js:
            sys.exit("FAIL: loudnorm gave no measurements (see output above)\n" + txt[-2000:])
        return js
    finally:
        wav.unlink(missing_ok=True)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    slug = sys.argv[1]
    short = "--short" in sys.argv
    raw = Path(f"out/{slug}/{'short-raw' if short else 'raw'}.mp4")
    final = Path(f"out/{slug}/{slug}{'-short' if short else ''}-final.mp4")
    if not raw.exists():
        sys.exit(f"Missing {raw}. Render the film first.")
    if not has_audio(raw):
        print("WARNING: the film has no sound. Copying it as-is.")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-c", "copy", str(final)], check=True)
    else:
        # two passes: measure, then apply ONE fixed gain (linear) so quiet and loud scenes keep
        # their balance. If that leaves the true peak over -1.5 dBTP there is no linear fix, so
        # loudnorm's own peak-limited dynamic mode is used instead (it limits to TP=-1.5).
        js = measure(raw)
        gain = -14.0 - float(js["input_i"])  # one fixed gain for the whole film
        limiter = "alimiter=limit=%.4f:attack=5:release=60:level=false" % (10 ** (-1.5 / 20))
        have_limiter = "alimiter" in subprocess.run(["ffmpeg", "-hide_banner", "-filters"],
                                                   capture_output=True, text=True).stdout
        peak_ok = float(js["input_tp"]) + gain <= -1.5
        if have_limiter or peak_ok:
            af = f"volume={gain:.2f}dB" + ("," + limiter if have_limiter else "")
            print(f"gain {gain:+.1f} dB (one level for the whole film)"
                  + (", limiter on" if have_limiter else " (peaks stay under -1.5 dBTP)"))
        else:
            # linear gain would clip: loudnorm dynamic mode with the measured values
            af = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=false"
                  f":measured_I={js['input_i']}:measured_TP={js['input_tp']}"
                  f":measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}")
            print(f"dynamic loudnorm to -14 LUFS (peaks limited to -1.5 dBTP; fixed gain of "
                  f"{gain:+.1f} dB would clip this film)")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-c:v", "copy", "-af", af,
                        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(final)], check=True)
        # verify the finished file: integrated level ≈ -14 and peaks under -1.5 dBTP
        out = measure(final)
        adj = -14.0 - float(out["input_i"])          # > 0 means too quiet
        tp = float(out["input_tp"])                  # > -1.5 means too hot
        if abs(adj) > 1.5 or tp > -1.0:
            tmp = final.with_name(final.stem + "-trim.mp4")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(final),
                            "-c:v", "copy", "-af", f"volume={adj:.2f}dB",
                            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(tmp)], check=True)
            tmp.replace(final)
            out = measure(final)
        print(f"final: {out['input_i']} LUFS, true peak {out['input_tp']} dBTP, LRA {out['input_lra']}")
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                          "default=nw=1:nk=1", str(final)], capture_output=True, text=True).stdout.strip()
    print(f"Finished: {final}  ({float(dur):.1f}s)")


if __name__ == "__main__":
    main()
