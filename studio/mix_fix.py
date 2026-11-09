import json
import re
from pathlib import Path

# ---- mix levels: the library files are quiet, the beds were masking the foley ----
VOL = {
    "mouse-click": 1.2,
    "clock-tick": 1.2,
    "marker-tap": 1.0,
    "cloth": 0.9,
    "whoosh": 0.9,
    "page-flip": 0.8,
    "sigh": 0.75,
    "gasp": 0.85,
    "door-open": 0.7,
    "door-close": 0.6,
    "laptop-close": 0.7,
    "heartbeat": 0.45,
    "vibrate": 0.7,
    "ping": 0.7,
    "step-floor-1": 0.75,
    "step-floor-2": 0.75,
    "amb-city": 0.8,
}

# ---- storyboard: ambience + planned sfx ----
p = Path("src/films/five-minutes/storyboard.json")
sb = json.loads(p.read_text(encoding="utf-8"))
for a in sb.get("ambience", []):
    a["volume"] = {
        "amb-night": 1.0,
        "amb-room": 1.1,
        "amb-wind": 0.9,
        "amb-city": 0.8,
    }.get(a["name"], a.get("volume", 1.0))
for s in sb["shots"]:
    for fx in s.get("sfx", []):
        if fx["name"] in VOL:
            fx["volume"] = VOL[fx["name"]]
p.write_text(json.dumps(sb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# ---- shots.tsx: foley tags ----
q = Path("src/films/five-minutes/shots.tsx")
src = q.read_text(encoding="utf-8")


def fix_sfx(m):
    tag = m.group(0)
    name = re.search(r'name="([a-z0-9-]+)"', tag)
    if not name:
        return tag
    v = VOL.get(name.group(1))
    if v is None:
        return tag
    if re.search(r"volume=\{[\d.]+\}", tag):
        tag = re.sub(r"volume=\{[\d.]+\}", "volume={%s}" % v, tag, count=1)
    else:
        tag = tag.replace("/>", " volume={%s} />" % v)
    return tag


src, n = re.subn(r"<Sfx\b[^>]*?/>", fix_sfx, src, flags=re.S)
# footsteps: one level for all
src, m = re.subn(r"(<Footsteps\b[^>]*?volume=)\{[\d.]+\}", r"\g<1>{0.8}", src, flags=re.S)
q.write_text(src, encoding="utf-8")
print("storyboard updated; sfx tags:", n, "footsteps:", m)
