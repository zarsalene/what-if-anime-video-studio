"""
Creates a new What If short and registers it as a composition.

Usage (from the studio folder):  py ../.claude/skills/what-if/scripts/new_film.py <slug> "<TITLE>" "<what-if premise>" [--3d]
Example: py ../.claude/skills/what-if/scripts/new_film.py earth-stopped "EARTH STOPS" "What if Earth's rotation stopped suddenly?"
"""
import json
import re
import sys
from pathlib import Path


def camel(slug):
    return "".join(p.capitalize() for p in slug.split("-")) + "Film"


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    slug, title, premise = sys.argv[1], sys.argv[2], sys.argv[3]
    mode = "3d" if "--3d" in sys.argv else "2d"
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        sys.exit("slug must be lowercase words joined by dashes, e.g. the-last-bite")
    d = Path(f"src/films/{slug}")
    if d.exists():
        sys.exit(f"{d} already exists — pick another slug or keep working in it")
    d.mkdir(parents=True)
    for sub in ("sfx", "music"):
        Path(f"public/films/{slug}/{sub}").mkdir(parents=True, exist_ok=True)

    (d / "storyboard.json").write_text(json.dumps({
        "slug": slug, "title": title, "premise": premise, "format": "short", "mode": mode, "fps": 30, "music": [], "ambience": [], "shots": [
            {"id": "s01", "beat": 1, "kind": "story", "seconds": 3, "what": "Anime hook image and concise narration (replace).", "narration": [{"startSec": 0, "endSec": 2.5}], "foley": ["narration"]},
            {"id": "s99", "beat": 7, "kind": "card", "seconds": 3, "what": "Memorable science takeaway and end card (replace)."},
        ]}, indent=2), encoding="utf-8")
    (d / "audio.json").write_text('{ "sfx": [], "music": [] }\n', encoding="utf-8")
    common = (
        'import React from "react";\n'
        'import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame } from "remotion";\n'
        'import { Sfx } from "../../lib/Sound";\n')
    if mode == "2d":
        imports = common + (
            'import { Scene, Backdrop, Layer, LightPool, Lamp, ScreenGlow, Bokeh, ParallaxStrip, Rain, Snow, Steam, MusicNotes, Window } from "../../lib/Stage";\n')
        example = "../later/shots.tsx"
    else:
        imports = common + (
            'import { Scene3D, Room, Ground, Lamp3D, Window3D, ScreenGlow3D, Glow, Weather3D } from "../../lib3d/World";\n')
        example = "../one-more/shots.tsx"
    (d / "shots.tsx").write_text(
        imports + "\n"
        f'// {mode.upper()} film. One exported component per shot id in storyboard.json.\n'
        f'// Use {example} only for Remotion timing and audio architecture. Draw original anime-style characters and backgrounds.\n'
        '// Keep narration clear; lower and duck music, ambience and effects underneath it.\n'
        '// Add synced captions, original anime visuals, and a restrained <Sfx> for visible actions.\n\n'
        'export const s01: React.FC = () => <AbsoluteFill style={{ background: "#10172c", alignItems: "center", justifyContent: "center" }}><div>Replace with the What If hook.</div></AbsoluteFill>;\n'
        f'export const s99: React.FC = () => <AbsoluteFill style={{ background: "#10172c", alignItems: "center", justifyContent: "center" }}><div>{title}: replace with the takeaway.</div></AbsoluteFill>;\n',
        encoding="utf-8")
    comp = camel(slug)
    (d / "index.tsx").write_text(
        'import React from "react";\n'
        'import { Film, Storyboard } from "../../lib/Film";\n'
        'import storyboard from "./storyboard.json";\n'
        'import audio from "./audio.json";\n'
        'import * as shots from "./shots";\n\n'
        'export const sb = storyboard as Storyboard;\n'
        f'export const {comp}: React.FC<{{ muted?: boolean }}> = ({{ muted }}) => <Film storyboard={{sb}} shots={{shots as Record<string, React.FC>}} audio={{audio}} muted={{muted}} />;\n',
        encoding="utf-8")

    reg = Path("src/films/registry.ts")
    text = reg.read_text(encoding="utf-8")
    var = re.sub(r"[^a-zA-Z0-9]", "", slug.title().replace("-", "")) + "Sb"
    var = var[0].lower() + var[1:]
    imp = f'import {{ {comp}, sb as {var} }} from "./{slug}";\n'
    text = text.replace('import { Storyboard } from "../lib/Film";\n', 'import { Storyboard } from "../lib/Film";\n' + imp, 1)
    text = text.replace("];", f"  {{ component: {comp}, storyboard: {var} }},\n];", 1)
    reg.write_text(text, encoding="utf-8")
    print(f"Created src/films/{slug}/ (storyboard.json, shots.tsx, index.tsx, audio.json)")
    print(f"Registered composition id: {slug}  (mode: {mode})")


if __name__ == "__main__":
    main()
