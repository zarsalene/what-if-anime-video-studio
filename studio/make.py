"""One command for a kit film. The LLM edits ONLY src/films/<slug>/storyboard.json.

Usage (inside studio/):
  py make.py --keywords "what if the moon"   # real YouTube searches, to pick youtube.keyword and tags
  py make.py <slug> --check     # check the storyboard only (seconds)
  py make.py <slug> --preview   # + voice, music, half-size render, contact sheet (look, then fix the JSON)
  py make.py <slug>             # full: + final render, sound check, loudness, thumbnail, captions, YouTube text
  py make.py <slug> --seo       # only redo thumbnail + YouTube text (after editing "youtube"; no re-render)

Outputs in out/<slug>/: preview.mp4, contact_sheet.jpg, <slug>-final.mp4, thumbnail.png, <slug>.srt, youtube.md, youtube.json
"""
import asyncio
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

import kit_tts

ROOT = Path(__file__).parent
SCRIPTS = ROOT.parent / ".claude/skills/what-if/scripts"
CATALOG = json.loads((ROOT / "src/kit/catalog.json").read_text(encoding="utf-8"))
NPX = "npx.cmd" if sys.platform == "win32" else "npx"
GL = "--gl=angle"
HEX = set("0123456789abcdefABCDEF")
CREDITS = {
    "kid": '"Character" by ShaderLoop, generated with Sloyd, licensed under CC BY 4.0 — https://www.sloyd.ai/free-3d-models/model/character-t6zhhnze',
    "robot": "RobotExpressive by Tomás Laulhé (Quaternius), CC0",
}


def run(*cmd: str) -> None:
    print("  $", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, cwd=ROOT)


# ---------- 1. check the storyboard ----------
def check(sb: dict, slug: str, final: bool) -> list[str]:
    errs = []
    need = ["title", "mood", "shots"] + (["youtube", "sources"] if final else [])
    errs += [f'missing top-level "{k}"' for k in need if k not in sb]
    if sb.get("slug") != slug:
        errs.append(f'"slug" must be "{slug}" (the folder name)')
    if sb.get("mood") not in MOODS:
        errs.append(f'"mood" must be one of: {", ".join(MOODS)}')
    ids = set()
    for i, s in enumerate(sb.get("shots", [])):
        where = f"shot {s.get('id', i + 1)}"
        if not s.get("id") or s["id"] in ids:
            errs.append(f'{where}: needs a unique "id" like "s0{i + 1}"')
        ids.add(s.get("id"))
        if not isinstance(s.get("seconds"), (int, float)) or s["seconds"] <= 0:
            errs.append(f'{where}: "seconds" must be a number > 0 (shots grow to fit "say")')
        if not s.get("say"):
            errs.append(f'{where}: "say" (the narration line) is missing')
        scene = CATALOG.get(s.get("scene"))
        if not scene or s["scene"].startswith("_"):
            errs.append(f'{where}: "scene" must be one of: {", ".join(k for k in CATALOG if not k.startswith("_"))}')
            continue
        props, spec = s.get("props", {}), scene["props"]
        for k, v in props.items():
            rule = spec.get(k)
            if rule is None:
                errs.append(f'{where}: {s["scene"]} has no prop "{k}". Props: {", ".join(spec)}')
            elif isinstance(rule, list) and v not in rule:
                errs.append(f'{where}: {k} = {v!r} is not allowed. Use one of: {", ".join(rule)}')
            elif rule in ("text", "text*") and not isinstance(v, str):
                errs.append(f"{where}: {k} must be text")
            elif rule == "bool" and not isinstance(v, bool):
                errs.append(f"{where}: {k} must be true or false")
            elif rule == "color" and not (isinstance(v, str) and len(v) == 7 and v[0] == "#" and set(v[1:]) <= HEX):
                errs.append(f'{where}: {k} must be a colour like "#FFD84D"')
        errs += [f'{where}: {s["scene"]} needs prop "{k}"' for k, r in spec.items() if r == "text*" and k not in props]
    if final:
        errs += check_youtube(sb.get("youtube", {}))
        errs += [f"source {i + 1} needs name, url and claim" for i, src in enumerate(sb.get("sources", []))
                 if not all(src.get(k) for k in ("name", "url", "claim"))]
    return errs


def check_youtube(yt: dict) -> list[str]:
    """SEO rules for a Short (see references/kit.md → YouTube SEO)."""
    errs = [f'youtube needs "{k}"' for k in ("keyword", "title", "description", "hashtags", "tags", "thumbnail_text", "audience") if not yt.get(k)]
    if errs:
        return errs
    kw = [w for w in yt["keyword"].lower().split() if len(w) > 2]
    title, desc = yt["title"], yt["description"]
    if not 20 <= len(title) <= 60:
        errs.append(f"youtube.title is {len(title)} characters: use 20–60 so it is not cut off on phones")
    if "#" in title:
        errs.append("youtube.title: no hashtags in the title (put them in youtube.hashtags)")
    if sum(w in title.lower() for w in kw) < max(1, round(len(kw) * 0.6)):
        errs.append(f'youtube.title must contain the keyword "{yt["keyword"]}"')
    if sum(w in desc[:150].lower() for w in kw) < max(1, round(len(kw) * 0.6)):
        errs.append(f'youtube.description: say the keyword "{yt["keyword"]}" in the first sentence')
    tags = yt["hashtags"]
    if not 3 <= len(tags) <= 5 or "#Shorts" not in tags or any(not t.startswith("#") or " " in t for t in tags):
        errs.append('youtube.hashtags: 3–5 single words starting with "#", including "#Shorts" (the first 3 show above the title)')
    if not 5 <= len(yt["tags"]) <= 15 or len(",".join(yt["tags"])) > 450:
        errs.append("youtube.tags: 5–15 search phrases, under 450 characters in total")
    if len(yt["thumbnail_text"].split()) > 4 or len(yt["thumbnail_text"]) > 24:
        errs.append("youtube.thumbnail_text: 2–4 big words, at most 24 characters")
    if yt["audience"] not in ("general", "kids"):
        errs.append('youtube.audience: "general" (13+ and adults: NOT made for kids) or "kids" (under-13 target: made for kids)')
    if yt.get("thumbnail_text_position", "top") not in ("top", "bottom"):
        errs.append('youtube.thumbnail_text_position: "top" (host low in the frame) or "bottom" (sky or moon is the subject)')
    for lang, tr in yt.get("translations", {}).items():
        if len(lang) != 2 or not tr.get("title") or not tr.get("description") or len(tr["title"]) > 70:
            errs.append(f'youtube.translations.{lang}: needs a 2-letter language code, "title" (≤ 70 characters) and "description"')
    return errs


def spoken_keyword_warning(sb: dict) -> None:
    # YouTube also reads what is said: the keyword in the first spoken line helps search
    kw = [w for w in sb["youtube"]["keyword"].lower().split() if len(w) > 2]
    first = sb["shots"][0].get("say", "").lower()
    if sum(w in first for w in kw) < max(1, round(len(kw) * 0.6)):
        print(f'  SEO tip: say the keyword "{sb["youtube"]["keyword"]}" in the first "say" line next time.')


# ---------- keyword research: what people really type into YouTube search ----------
def keywords(seed: str) -> None:
    # shortcut: unofficial YouTube autocomplete endpoint (no key); swap for the YouTube Data API if it ever breaks
    import urllib.parse
    import urllib.request
    seen = []
    for q in (seed, seed + " "):
        url = "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&q=" + urllib.parse.quote(q)
        with urllib.request.urlopen(url, timeout=10) as r:
            seen += [s for s in json.loads(r.read().decode("utf-8", "replace"))[1] if s not in seen]
    print(f'YouTube searches for "{seed}" (most searched first):')
    print("\n".join(f"  {s}" for s in seen) or "  (none: try a shorter seed)")


# ---------- 2. generated code (never edited by hand) ----------
INDEX = """// GENERATED by make.py — do not edit. Edit storyboard.json instead.
import { kitFilm } from "../../kit";
import storyboard from "./storyboard.json";
import audio from "./audio.json";
import captions from "./captions.json";

export default kitFilm(storyboard, audio, captions);
"""


def write_code() -> None:
    # every kit film needs its index.tsx, because the generated list imports them all
    slugs = sorted(p.parent.name for p in (ROOT / "src/films").glob("*/storyboard.json")
                   if any("scene" in s for s in json.loads(p.read_text(encoding="utf-8"))["shots"]))
    for slug in slugs:
        film = ROOT / "src/films" / slug
        (film / "index.tsx").write_text(INDEX, encoding="utf-8")
        for name, empty in (("audio.json", {"sfx": [], "music": [], "tts": []}), ("captions.json", {})):
            if not (film / name).exists():
                (film / name).write_text(json.dumps(empty) + "\n", encoding="utf-8")
    lines = ["// GENERATED by make.py — every kit film (a storyboard whose shots name a scene).", ""]
    lines += [f'import f{i} from "./{s}";' for i, s in enumerate(slugs)]
    lines += ["", f"export const KIT_FILMS = [{', '.join(f'f{i}' for i in range(len(slugs)))}];", ""]
    (ROOT / "src/films/kit.generated.ts").write_text("\n".join(lines), encoding="utf-8")


# ---------- 3. music: an original, quiet score made from code ----------
MOODS = {  # chords (Hz), bar length (s), note step (s), melody scale
    "playful": ([[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 349.23], [196.00, 246.94, 293.66, 392.00]], 4.0, 0.75, [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33]),
    "wonder": ([[220.00, 277.18, 329.63, 415.30], [185.00, 220.00, 277.18, 329.63], [146.83, 220.00, 293.66, 369.99], [164.81, 207.65, 246.94, 329.63]], 5.0, 1.25, [659.25, 739.99, 880.00, 987.77, 880.00, 739.99]),
    "calm": ([[196.00, 246.94, 293.66], [164.81, 196.00, 246.94], [130.81, 164.81, 196.00], [146.83, 185.00, 220.00]], 6.0, 1.5, [392.00, 440.00, 493.88, 587.33, 493.88, 440.00]),
    "tense": ([[220.00, 261.63, 329.63], [207.65, 246.94, 329.63], [174.61, 220.00, 261.63], [164.81, 207.65, 246.94]], 3.0, 0.5, [440.00, 523.25, 493.88, 415.30]),
}


def make_music(slug: str, mood: str, seconds: float) -> None:
    chords, bar, step, scale = MOODS[mood]
    sr = 44100
    n = int(sr * seconds)
    t = np.arange(n) / sr
    mix = np.zeros(n)
    for bi, start in enumerate(np.arange(0, seconds, bar)):  # soft pad
        end = min(seconds, start + bar)
        ix = (t >= start) & (t < end)
        lt = t[ix] - start
        fade = np.minimum(1, lt / .9) * np.minimum(1, (end - start - lt) / .9)
        chord = chords[bi % len(chords)]
        pad = sum(np.sin(2 * np.pi * hz * t[ix] + .12 * np.sin(2 * np.pi * .18 * t[ix])) + .13 * np.sin(4 * np.pi * hz * t[ix]) for hz in chord)
        mix[ix] += .035 * fade * pad / (len(chord) * 1.13)
    for j, start in enumerate(np.arange(.25, seconds - .5, step)):  # sparse bell notes
        hz = scale[(j + j // 8) % len(scale)]
        i0, i1 = int(start * sr), min(n, int((start + .48) * sr))
        lt = np.arange(i1 - i0) / sr
        ph = 2 * np.pi * hz * lt
        mix[i0:i1] += .055 * np.exp(-lt * 7.5) * np.minimum(1, lt / .012) * (np.sin(ph) + .25 * np.sin(ph * 2.01) + .08 * np.sin(ph * 3.97))
    mix *= np.minimum(1, t / 1.8) * np.minimum(1, (seconds - t) / 2.4)
    mix = np.clip(mix, -.32, .32)
    pcm = (np.column_stack((mix, np.roll(mix, int(sr * .012)) * .94)) * 32767).astype("<i2")
    out = ROOT / "public/films" / slug / "music"
    out.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out / "score.wav"), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / "score.wav"), "-b:a", "192k", str(out / "score.mp3")], check=True)
    (out / "score.wav").unlink()
    audio_path = ROOT / "src/films" / slug / "audio.json"
    audio = json.loads(audio_path.read_text(encoding="utf-8"))
    audio["music"] = ["score"]
    audio_path.write_text(json.dumps(audio, indent=2) + "\n", encoding="utf-8")


# ---------- 4. text outputs ----------
def frames(sec: float, fps: int) -> int:
    return round(sec * fps)  # same rounding as the renderer


def srt_time(sec: float) -> str:
    ms = round(sec * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def write_srt(sb: dict, captions: dict, path: Path) -> None:
    out, cursor, fps = [], 0, sb["fps"]
    for s in sb["shots"]:
        if s["id"] in captions:
            start = cursor / fps + kit_tts.SAY_AT
            out.append(f"{len(out) + 1}\n{srt_time(start)} --> {srt_time(start + captions[s['id']]['dur'])}\n{s['say']}\n")
        cursor += frames(s["seconds"], fps)
    path.write_text("\n".join(out), encoding="utf-8")


def write_youtube(sb: dict, out: Path, slug: str) -> None:
    yt = sb["youtube"]
    hosts = {s.get("props", {}).get("host", "kid") for s in sb["shots"] if s["scene"] == "Sky"} - {"none"}
    desc = [yt["description"], "", "Sources:"] + [f"- {s['name']}: {s['url']}" for s in sb["sources"]]
    desc += ["", "Credits:"] + [f"- 3D model: {CREDITS[h]}" for h in sorted(hosts)]
    desc += ["- Music: original score made for this video", "", " ".join(yt["hashtags"])]
    kids = yt["audience"] == "kids"
    # upload-ready fields in YouTube Data API shape (videos.insert), for a future upload script
    trs = yt.get("translations", {})
    api = {"snippet": {"title": yt["title"], "description": "\n".join(desc), "tags": yt["tags"],
                       "categoryId": "27", "defaultLanguage": "en", "defaultAudioLanguage": "en"},
           "status": {"privacyStatus": "private", "selfDeclaredMadeForKids": kids},
           "localizations": {k: {"title": v["title"], "description": v["description"] + "\n\n" + " ".join(yt["hashtags"])} for k, v in trs.items()}}
    (out / "youtube.json").write_text(json.dumps(api, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    alts = yt.get("title_alternatives", [])
    md = [f"# Upload kit — {slug}", "",
          "## 1. Video", f"Upload `{slug}-final.mp4` (YouTube Studio → Create → Upload videos).", "",
          "## 2. Title", "```", yt["title"], "```"]
    if alts:
        md += ["Test & Compare: try these against the title above:"] + [f"- {a}" for a in alts]
    md += ["", "## 3. Description", "```", *desc, "```", "",
           "## 4. Thumbnail", "Upload `thumbnail.png` (1080×1920). Custom Shorts thumbnails roll out to Partner Program "
           "channels first; without the upload button, pick the frame closest to it.", "",
           "## 5. Tags (Show more → Tags)", "```", ", ".join(yt["tags"]), "```", "",
           "## 6. Settings",
           f"- Audience: **{'Yes, it is made for kids' if kids else 'No, it is not made for kids'}**"
           + ("" if kids else " (general audience: teens and adults; children watching too is fine)"),
           "- Category: Education · Language: English · Captions: upload `" + slug + ".srt` (Subtitles → English)",
           "- Altered or synthetic content: **No**: a clearly animated cartoon with a generic narrator voice is not realistic content",
           "- Comments: on" + (" (made-for-kids videos have comments turned off by YouTube)" if kids else ""),
           f"- Playlist: **{yt.get('playlist', 'What If? Science Shorts')}** (one series playlist for every What If Short)",
           "- Related video: link the previous What If Short (Shorts edit screen → Related video)", ""]
    if trs:
        md += ["## 7. Translations (Subtitles → Add language → Title & description)", ""]
        for k, v in trs.items():
            md += [f"### {k}", "```", v["title"], "", v["description"], "", " ".join(yt["hashtags"]), "```", ""]
    md += ["## After upload", "- Studio → Analytics → *Viewed vs. swiped away*: under ~70% viewed means the hook "
           "(shot 1) needs work, not the title.", "", "## Fact notes (not for upload)"]
    md += [f"- {s['claim']} — {s['url']}" for s in sb["sources"]]
    (out / "youtube.md").write_text("\n".join(md) + "\n", encoding="utf-8")


# ---------- main ----------
def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--keywords":
        return keywords(sys.argv[2])
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        raise SystemExit(__doc__)
    modes = [m for m in ("check", "preview", "seo") if f"--{m}" in sys.argv]
    slug, mode = args[0], (modes[0] if modes else "final")
    sb_path = ROOT / "src/films" / slug / "storyboard.json"
    if not sb_path.exists():
        raise SystemExit(f"Write {sb_path} first (see .claude/skills/what-if/references/kit.md).")
    sb = json.loads(sb_path.read_text(encoding="utf-8"))
    errs = check(sb, slug, final=(mode in ("final", "seo")))
    if errs:
        print("STORYBOARD ERRORS — fix storyboard.json and run again:")
        print("\n".join(f"  - {e}" for e in errs))
        sys.exit(1)
    print("1/6 storyboard OK")
    if "youtube" in sb and "keyword" in sb["youtube"]:
        spoken_keyword_warning(sb)
    if mode == "check":
        return
    if mode == "seo":  # thumbnail + YouTube text only, no new voice or render
        if not json.loads((ROOT / "src/films" / slug / "captions.json").read_text(encoding="utf-8")):
            raise SystemExit(f"Run py make.py {slug} once first (no voice yet).")
        write_code()
        return publish_files(sb, slug, ROOT / "out" / slug)

    write_code()
    print("2/6 voice + word timings")
    asyncio.run(kit_tts.main(slug))  # also grows each shot's "seconds" to fit its line
    sb = json.loads(sb_path.read_text(encoding="utf-8"))
    total = sum(frames(s["seconds"], sb["fps"]) for s in sb["shots"]) / sb["fps"]
    print(f"3/6 music ({sb['mood']}, {total:.1f}s)")
    make_music(slug, sb["mood"], total + 1)

    out = ROOT / "out" / slug
    out.mkdir(parents=True, exist_ok=True)
    video = out / ("preview.mp4" if mode == "preview" else "raw.mp4")
    print("4/6 render")
    run(NPX, "remotion", "render", "src/index.ts", slug, str(video), GL, *(["--scale=0.5"] if mode == "preview" else []))
    run("py" if sys.platform == "win32" else "python3", str(SCRIPTS / "contact_sheet.py"), slug, str(video))
    if mode == "preview":
        print(f"PREVIEW READY: look at {out / 'contact_sheet.jpg'}, then fix storyboard.json or run the full make.")
        return

    print("5/6 sound check + loudness")
    py = "py" if sys.platform == "win32" else "python3"
    run(py, str(SCRIPTS / "sound_check.py"), slug, str(video))
    run(py, str(SCRIPTS / "finish.py"), slug)

    print("6/6 thumbnail, captions, YouTube text")
    publish_files(sb, slug, out)
    print(f"DONE: {out / f'{slug}-final.mp4'}  ({total:.1f}s)")


def publish_files(sb: dict, slug: str, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    at = frames(sb.get("thumbnail", {}).get("at", 1.5), sb["fps"])
    run(NPX, "remotion", "still", "src/index.ts", f"{slug}-thumb", str(out / "thumbnail.png"), GL, f"--frame={at}")
    captions = json.loads((ROOT / "src/films" / slug / "captions.json").read_text(encoding="utf-8"))
    write_srt(sb, captions, out / f"{slug}.srt")
    write_youtube(sb, out, slug)
    print(f"Upload kit: {out / 'youtube.md'} (+ thumbnail.png, {slug}.srt, youtube.json)")


if __name__ == "__main__":
    main()
