"""
Contact sheet: one still from the middle of every shot, in a labelled grid,
so the AI (and you) can check every shot at a glance before the final render.

Usage (run from the studio folder):
  py ../.claude/skills/what-if/scripts/contact_sheet.py <slug> <preview.mp4>
  (Mac/Linux: python3 instead of py)

Writes out/<slug>/stills/<shot-id>.jpg and out/<slug>/contact_sheet.jpg
Needs: ffmpeg on PATH, and Pillow (pip install pillow).
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    slug, video = sys.argv[1], Path(sys.argv[2])
    sb = json.loads(Path(f"src/films/{slug}/storyboard.json").read_text(encoding="utf-8"))
    out = Path(f"out/{slug}/stills")
    out.mkdir(parents=True, exist_ok=True)

    t = 0.0
    tiles = []
    for shot in sb["shots"]:
        mid = t + shot["seconds"] * 0.6
        p = out / f"{shot['id']}.jpg"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{mid:.3f}", "-i", str(video),
             "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "3", str(p)],
            check=True,
        )
        tiles.append((shot, p))
        t += shot["seconds"]

    cols = 4
    tw, th, label = 480, 270, 46
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + label)), (20, 20, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    for i, (shot, p) in enumerate(tiles):
        x, y = (i % cols) * tw, (i // cols) * (th + label)
        if p.exists():
            sheet.paste(Image.open(p).resize((tw, th)), (x, y))
        text = f"{shot['id']}  beat {shot['beat']}  {shot['kind']}  {shot['seconds']}s"
        draw.text((x + 8, y + th + 4), text, fill=(235, 230, 216), font=font)
        draw.text((x + 8, y + th + 24), shot["what"][:52], fill=(160, 160, 160), font=font)
    sheet_path = Path(f"out/{slug}/contact_sheet.jpg")
    sheet.save(sheet_path, quality=88)
    print(f"Contact sheet: {sheet_path}  ({len(tiles)} shots)")
    print(f"Single stills: {out}")


if __name__ == "__main__":
    main()
