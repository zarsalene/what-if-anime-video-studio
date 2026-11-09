"""
Checks a What If storyboard before animation. Fix every ERROR and review every WARN.

Usage (from the studio folder):  py ../.claude/skills/what-if/scripts/check_storyboard.py <slug>
"""
import json
import re
import sys
from pathlib import Path

errors, warns = [], []


def err(m):
    errors.append(m)


def warn(m):
    warns.append(m)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    slug = sys.argv[1]
    sb = json.loads(Path(f"src/films/{slug}/storyboard.json").read_text(encoding="utf-8"))
    shots = sb.get("shots", [])
    example = slug in ("later", "one-more", "five-minutes")  # legacy demos, not What If references

    required = ("slug", "title", "fps", "shots") if example else ("slug", "title", "premise", "fps", "shots")
    for k in required:
        if k not in sb:
            err(f"storyboard is missing '{k}'")
    if sb.get("slug") != slug:
        err(f"slug in file ({sb.get('slug')}) must match the folder name ({slug})")
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        err("slug must be lowercase letters, numbers and dashes only")

    if sb.get("mode", "2d") not in ("2d", "3d"):
        err("mode must be \"2d\" or \"3d\"")

    ids = [s["id"] for s in shots]
    if len(ids) != len(set(ids)):
        err("shot ids must be unique")

    total = sum(s["seconds"] for s in shots)
    fmt = sb.get("format", "short")
    if fmt not in ("short", "long"):
        err("format must be 'short' or 'long'")
    if not example and fmt == "short" and not (20 <= total <= 180):
        err(f"Short is {total:.1f}s. Keep a What If Short between 20s and 3 minutes")
    if not example and fmt == "long" and not (180 <= total <= 900):
        err(f"long video is {total:.1f}s. Keep it between 3 and 15 minutes")

    beats = [s["beat"] for s in shots]
    for b in range(1, 8):
        if b not in beats:
            err(f"beat {b} is missing (see references/story.md)")
    if beats != sorted(beats):
        err("beats must go in order 1→7 (no jumping back)")
    if shots and shots[0]["beat"] != 1:
        err("first shot must be beat 1: the visual hook")
    if shots and shots[-1]["beat"] != 7:
        err("last shot must be beat 7: the takeaway or final reveal")

    for s in shots:
        sec, kind, sid = s["seconds"], s["kind"], s["id"]
        if kind not in ("card", "story", "montage", "insert"):
            err(f"{sid}: kind must be card, story, montage or insert (is {kind})")
        if kind == "insert" and not (1.5 <= sec <= 4.5):
            warn(f"{sid}: inserts (phone, calendar, note close-ups) are usually 2–4s (is {sec}s)")
        if kind == "montage" and not (0.4 <= sec <= 1.2):
            err(f"{sid}: montage shots must be 0.5–1s (is {sec}s)")
        if kind == "story" and not (3 <= sec <= 8):
            warn(f"{sid}: story shots are usually 3–6s (is {sec}s)")
        if kind == "card" and not (2.5 <= sec <= 6):
            warn(f"{sid}: cards read best at 3–5s (is {sec}s)")
        if len(s.get("what", "")) < 15:
            err(f"{sid}: 'what' must describe the shot in a full sentence")
        for line in s.get("narration", []):
            if line.get("startSec", -1) < 0 or line.get("endSec", 0) <= line.get("startSec", -1) or line.get("endSec", 0) > sec:
                err(f"{sid}: narration timing must be positive and stay inside the shot")
        for fx in s.get("sfx", []):
            if not re.fullmatch(r"[a-z0-9-]+", fx["name"]):
                err(f"{sid}: sfx name '{fx['name']}' must be lowercase-dashes")
            if fx["at"] >= sec:
                err(f"{sid}: sfx '{fx['name']}' starts after the shot ends")
            if re.search(r"\b(says?|said|saying|speaks?|speaking|talks?|talking|dialogue)\b", fx.get("prompt", ""), re.I):
                warn(f"{sid}: sfx '{fx['name']}' sounds like speech. Voices must be wordless (sigh, gasp, 'mhm')")

    montage = sum(1 for s in shots if s["kind"] == "montage")

    fades = sum(1 for s in shots if s.get("fadeOut"))
    if fades > 4:
        warn(f"{fades} fades to black. Use hard cuts; fade only on big time jumps")

    short = sb.get("short")
    if short:
        ln = short["endSec"] - short["startSec"]
        if not (20 <= ln <= 180):
            err(f"short is {ln:.1f}s. Keep it 20–180s under current Shorts guidance")
        if short["endSec"] > total + 0.01 or short["startSec"] < 0:
            err("short startSec/endSec must be inside the film")
        if len(short.get("hook", "")) > 70:
            warn("short hook is long. One line, under ~60 characters")

    # ---- sound: never silent
    lib_file = Path("public/sfx/LIBRARY.txt")
    library = {l.split("\t")[0] for l in lib_file.read_text(encoding="utf-8").splitlines()[1:]} if lib_file.exists() else set()
    amb = sb.get("ambience", [])
    if not amb:
        err("no \"ambience\" planned. Every scene needs a background bed (amb-room, amb-night, amb-city, amb-rain, amb-wind, amb-birds, amb-gym)")
    for a in amb:
        if library and a["name"] not in library:
            err(f"ambience '{a['name']}' is not a built-in sound (see public/sfx/LIBRARY.txt)")
    t0 = 0.0
    for s in shots:
        mid = t0 + s["seconds"] / 2
        if s["kind"] != "card" and not any(a["startSec"] <= mid <= a["endSec"] for a in amb):
            warn(f"{s['id']}: no ambience under this shot")
        if s["kind"] in ("story", "montage", "insert") and not s.get("sfx") and not s.get("foley"):
            err(f"{s['id']}: no sound planned. Add \"sfx\" or list its \"foley\" (footsteps, typing, writing, objects…)")
        text = s.get("what", "").lower()
        heard = " ".join(s.get("foley", []) + [f["name"] for f in s.get("sfx", [])]).lower()
        for word, needs in (("walk", "step"), ("run", "step"), ("typ", "typ"), ("writ", "writ"), ("knock", "knock"), ("door", "door")):
            if word in text and needs not in heard and not (needs == "writ" and "marker" in heard):
                warn(f"{s['id']}: the shot mentions '{word}…' but its sound plan has no '{needs}…' sound")
        for fx in s.get("sfx", []):
            if library and fx["name"] not in library and not fx.get("prompt"):
                err(f"{s['id']}: sfx '{fx['name']}' is not a built-in sound and has no prompt for ElevenLabs")
        t0 += s["seconds"]

    music = sb.get("music", [])
    if not music:
        err("no music planned. Add a licensed track or an original score before calling the video publish-ready")
    for m in music:
        if m["endSec"] > total + 0.5:
            err(f"music '{m['name']}' ends after the film ends")

    print(f"{slug}: {len(shots)} shots, {total:.1f}s ({total/60:.1f} min), {montage} montage shots")
    for e in errors:
        print("ERROR:", e)
    for w in warns:
        print("WARN: ", w)
    if not errors:
        print("OK: storyboard passes the hard rules")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
