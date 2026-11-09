"""
Sound for a film. Sound effects come from two places:
  1. The BUILT-IN library (public/sfx/, see LIBRARY.txt) — always available, no key needed.
  2. ElevenLabs — only for sounds the library doesn't have (wordless voices like "mhm",
     a specific animal, a special machine…). Give those a "prompt" in storyboard.json.
This script makes the missing ElevenLabs sounds, checks the music, and writes
src/films/<slug>/audio.json so the film only plays files that exist.

Usage (from the studio folder):
  py ../.claude/skills/what-if/scripts/audio.py <slug>            # make missing sfx
  py ../.claude/skills/what-if/scripts/audio.py <slug> --redo NAME  # remake one sfx
  py ../.claude/skills/what-if/scripts/audio.py <slug> --list       # only refresh audio.json

ElevenLabs needs ELEVENLABS_API_KEY in a .env file (this folder or any folder above it).
Without a key, the built-in library still covers footsteps, typing, writing, doors,
phones, ambience and more — only the extra prompted sounds are skipped.
Music is NOT generated: put your own licensed tracks in
public/films/<slug>/music/<name>.mp3 (names come from storyboard.json "music").
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128"


def find_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"].strip()
    d = Path.cwd()
    for folder in [d, *d.parents]:
        env = folder / ".env"
        if env.exists():
            for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.strip().startswith("ELEVENLABS_API_KEY"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def make_sfx(key, prompt, seconds, out):
    body = {"text": prompt, "prompt_influence": 0.5}
    if seconds:
        body["duration_seconds"] = max(0.5, min(30.0, float(seconds)))
    req = urllib.request.Request(
        URL, data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        out.write_bytes(r.read())


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    slug = sys.argv[1]
    only_list = "--list" in sys.argv
    redo = sys.argv[sys.argv.index("--redo") + 1] if "--redo" in sys.argv else None

    sb = json.loads(Path(f"src/films/{slug}/storyboard.json").read_text(encoding="utf-8"))
    sfx_dir = Path(f"public/films/{slug}/sfx")
    music_dir = Path(f"public/films/{slug}/music")
    sfx_dir.mkdir(parents=True, exist_ok=True)
    music_dir.mkdir(parents=True, exist_ok=True)

    lib_file = Path("public/sfx/LIBRARY.txt")
    library = {l.split("\t")[0] for l in lib_file.read_text(encoding="utf-8").splitlines()[1:]} if lib_file.exists() else set()
    wanted, from_library = {}, set()
    for s in sb["shots"]:
        for fx in s.get("sfx", []):
            if fx["name"] in library and fx["name"] != redo:
                from_library.add(fx["name"])  # built-in: nothing to make
                continue
            if not fx.get("prompt"):
                print(f"WARNING {s['id']}: '{fx['name']}' is not a built-in sound and has no prompt — add a prompt or use a library name")
                continue
            wanted.setdefault(fx["name"], fx)  # same name = same file, reused

    key = None if only_list else find_key()
    if not only_list and not key:
        if wanted:
            print("No ELEVENLABS_API_KEY in .env — skipping the extra prompted sounds (the built-in library still plays).")
    used = 0
    if key:
        for name, fx in wanted.items():
            out = sfx_dir / f"{name}.mp3"
            if out.exists() and name != redo:
                continue
            try:
                make_sfx(key, fx["prompt"], fx.get("seconds"), out)
                used += 1
                print(f"made sfx: {name}  ({fx['prompt']})")
            except urllib.error.HTTPError as e:
                print(f"FAILED sfx {name}: HTTP {e.code} {e.read()[:300]!r}")
                if e.code in (401, 402, 429):
                    print("Stopping: check the key, your credits, or wait a minute.")
                    break

    have_sfx = sorted(p.stem for p in sfx_dir.glob("*.mp3"))
    have_music = sorted(p.stem for p in music_dir.glob("*.mp3"))
    Path(f"src/films/{slug}/audio.json").write_text(
        json.dumps({"sfx": have_sfx, "music": have_music}, indent=2), encoding="utf-8")

    missing_sfx = [n for n in wanted if n not in have_sfx]
    for a in sb.get("ambience", []):
        if a["name"] not in library:
            print(f"WARNING: ambience '{a['name']}' is not a built-in amb-* sound")
    missing_music = [m["name"] for m in sb.get("music", []) if m["name"] not in have_music]
    print(f"\nbuilt-in sounds used by the plan: {len(from_library)}")
    print(f"extra sounds ready: {len(have_sfx)}  (made now: {used})")
    if missing_sfx:
        print("extra sounds still missing (they will be silent):", ", ".join(missing_sfx))
    if missing_music:
        print("MUSIC MISSING — put these files in", music_dir, ":",
              ", ".join(f"{m}.mp3" for m in missing_music))
    print(f"wrote src/films/{slug}/audio.json")


if __name__ == "__main__":
    main()
