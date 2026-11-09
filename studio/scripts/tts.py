#!/usr/bin/env python3
"""
Generate open-source TTS narration for a film with Piper (local, offline, small).

Reads narration text from storyboard.json shots[].narration and renders WAV files
into public/films/<slug>/tts/ so Remotion can play them in sync with the shots.

Usage:
  python scripts/tts.py five-minutes              # render all narration
  python scripts/tts.py five-minutes --voice en_US-amanda-medium
  python scripts/tts.py five-minutes --check      # verify files exist & match

Install Piper once:
  winget install rhasspy.Piper   # or download from github.com/rhasspy/piper/releases
  # then make sure `piper` is on your PATH

Voice models (download to ~/.local/share/piper/voices/ or pass --voices-dir):
  https://huggingface.co/rhasspy/piper-voices/tree/main/v1/en_US/en_US/amanda/medium
  https://huggingface.co/rhasspy/piper-voices/tree/main/v1/en_US/en_US/lessac/medium
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

STUDIO = Path(__file__).resolve().parent.parent
PUBLIC = STUDIO / "public"
FILMS_PUBLIC = PUBLIC / "films"
DEFAULT_VOICE = "en_US-amada-medium"
SAMPLE_RATE = 22050


def find_piper() -> str | None:
    """Return the piper CLI path if it's on PATH, else None."""
    import shutil

    return shutil.which("piper")


def voice_path(voices_dir: Path, voice: str) -> Path:
    # Accept either a bare voice name (looks for .onnx) or an explicit .onnx path.
    p = Path(voice)
    if p.suffix == ".onnx" and p.exists():
        return p
    candidate = voices_dir / f"{voice}.onnx"
    if candidate.exists():
        return candidate
    # also try nested: voices_dir/<voice>/<voice>.onnx
    nested = voices_dir / voice / f"{voice}.onnx"
    if nested.exists():
        return nested
    return candidate  # let piper fail with a clear message if missing


def load_storyboard(slug: str) -> dict:
    sb = STUDIO / "src" / "films" / slug / "storyboard.json"
    if not sb.exists():
        sys.exit(f"storyboard not found: {sb}")
    return json.loads(sb.read_text(encoding="utf-8"))


def narration_items(sb: dict) -> list[tuple[str, str, float]]:
    """Return [(shot_id, text, at_seconds), ...] for every shot that has narration."""
    items: list[tuple[str, str, float]] = []
    for shot in sb.get("shots", []):
        sid = shot["id"]
        for i, n in enumerate(shot.get("narration") or []):
            text = n.get("text", "").strip()
            if not text:
                continue
            at = float(n.get("at", 0.0))
            items.append((sid, text, at))
    return items


def render(piper: str, model: Path, text: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    # Piper reads text from stdin and writes WAV to --output_file.
    cmd = [
        piper,
        "--model", str(model),
        "--output_file", str(out),
        "--sample_rate", str(SAMPLE_RATE),
    ]
    result = subprocess.run(cmd, input=text, text=True,
                            capture_output=True)
    if result.returncode != 0:
        sys.exit(f"piper failed for {out}: {result.stderr.strip()}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Render Piper TTS narration for a film")
    ap.add_argument("slug", help="film slug (e.g. five-minutes)")
    ap.add_argument("--voice", default=DEFAULT_VOICE,
                    help=f"Piper voice name or .onnx path (default: {DEFAULT_VOICE})")
    ap.add_argument("--voices-dir", default=str(Path.home() / ".local" / "share" / "piper" / "voices"),
                    help="directory containing Piper voice .onnx models")
    ap.add_argument("--check", action="store_true",
                    help="only verify narration WAV files exist, don't render")
    args = ap.parse_args()

    piper = find_piper()
    if piper is None:
        sys.exit("piper CLI not found on PATH. Install it: winget install rhasspy.Piper "
                 "(or github.com/rhasspy/piper/releases), then re-run.")

    sb = load_storyboard(args.slug)
    items = narration_items(sb)
    if not items:
        print("No narration found in storyboard.json. Add a `narration` array to shots.")
        return

    model = voice_path(Path(args.voices_dir), args.voice)
    if not model.exists():
        sys.exit(f"Voice model not found: {model}\n"
                 f"Download a voice to {args.voices_dir}, e.g.:\n"
                 f"  https://huggingface.co/rhasspy/piper-voices/resolve/main/v1/en_US/en_US/amada/medium/en_US-amada-medium.onnx")

    out_dir = FILMS_PUBLIC / args.slug / "tts"
    rendered = 0
    for sid, text, at in items:
        out = out_dir / f"{sid}.wav"
        if args.check:
            if out.exists():
                print(f"OK   {out.name}")
            else:
                print(f"MISS {out.name}  (shot {sid})")
            continue
        render(piper, model, text, out)
        print(f"WROTE {out}  ({len(text)} chars, shot {sid} @ {at}s)")
        rendered += 1

    if not args.check:
        print(f"\nDone. Rendered {rendered} narration file(s) to {out_dir}")
        print("Next: add the files to audio.json (tts list) and the Film component will play them.")


if __name__ == "__main__":
    main()
