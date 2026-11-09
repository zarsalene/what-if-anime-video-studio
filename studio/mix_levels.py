import json
from pathlib import Path

p = Path("src/films/five-minutes/storyboard.json")
sb = json.loads(p.read_text(encoding="utf-8"))

VOL = {
    "clock-tick": 0.9,
    "cloth": 0.5,
    "marker-tap": 0.7,
    "door-close": 0.55,
    "page-flip": 0.5,
    "sigh": 0.45,
    "whoosh": 0.5,
    "gasp": 0.6,
    "vibrate": 0.6,
    "heartbeat": 0.4,
    "marker-squeak-1": 0.6,
    "plate-1": 0.4,
}
for s in sb["shots"]:
    for fx in s.get("sfx", []):
        fx["volume"] = VOL.get(fx["name"], fx.get("volume", 0.7))
p.write_text(json.dumps(sb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("storyboard sfx normalized")
