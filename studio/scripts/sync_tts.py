#!/usr/bin/env python3
"""
Sync audio.json's `tts` list from storyboard.json narration blocks.

Reads every shot's `narration[{ at, text }]` and writes the matching file names
to audio.json → `tts`, using the same naming convention the Film component expects:
  <shotId>-<at*10 rounded>   e.g. s03-25 for a line at 2.5s into shot s03

Usage:
  python scripts/sync_tts.py five-minutes
"""

from __future__ import annotations

import json
from pathlib import Path

STUDIO = Path(__file__).resolve().parent.parent


def tts_name(shot_id: str, at_seconds: float) -> str:
    return f"{shot_id}-{round(at_seconds * 10)}"


def main() -> None:
    slug = "five-minutes"
    sb_path = STUDIO / "src" / "films" / slug / "storyboard.json"
    audio_path = STUDIO / "src" / "films" / slug / "audio.json"

    sb = json.loads(sb_path.read_text(encoding="utf-8"))

    names: list[str] = []
    seen: set[str] = set()
    for shot in sb.get("shots", []):
        sid = shot["id"]
        for n in shot.get("narration") or []:
            at = float(n.get("at", 0.0))
            name = tts_name(sid, at)
            if name not in seen:
                seen.add(name)
                names.append(name)

    audio = {
        "sfx": [],
        "music": [],
        "tts": names,
    }
    audio_path.write_text(json.dumps(audio, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {audio_path} with {len(names)} TTS entry/ies:")
    for n in names:
        print(f"  {n}.wav")


if __name__ == "__main__":
    main()
