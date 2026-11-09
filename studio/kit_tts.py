"""Voice + word timings for a kit film.  Usage (inside studio/):  py kit_tts.py <slug>

Voice source, in this order:
  1. studio/voice/<slug>.mp3 — ONE recording (e.g. ElevenLabs) that reads every shot's "say"
     line in order, with a clear pause (~1 s) between lines. It is cut at its longest pauses.
  2. otherwise Edge TTS (en-US-ChristopherNeural).

Writes public/films/<slug>/tts/<id>-3.wav, src/films/<slug>/audio.json and
src/films/<slug>/captions.json (word start/end in seconds, for word-by-word captions),
and grows each shot's "seconds" in storyboard.json to fit its line.
"""
import asyncio
import json
import re
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).parent
VOICE, PITCH, RATE = "en-US-ChristopherNeural", "+5Hz", "+3%"  # approved voice (SKILL.md step 6)
SAY_AT, TAIL = 0.3, 0.45  # must match SAY_AT and TAIL in src/kit/index.tsx
CLEAN = "loudnorm=I=-16:TP=-1.5:LRA=7,highpass=f=65,lowpass=f=12000"
LEAD, END_PAD = 0.06, 0.12  # silence kept before / after each recorded line


async def speak(text: str, mp3: Path) -> list[dict]:
    # the online voice sometimes drops a request: retry before giving up
    for attempt in range(3):
        try:
            return await speak_once(text, mp3)
        except edge_tts.exceptions.NoAudioReceived:
            if attempt == 2:
                raise
            print("  voice service gave no audio, retrying...", flush=True)
            await asyncio.sleep(3 * (attempt + 1))


async def speak_once(text: str, mp3: Path) -> list[dict]:
    audio, words = bytearray(), []
    stream = edge_tts.Communicate(text, VOICE, pitch=PITCH, rate=RATE, boundary="WordBoundary").stream()
    async for c in stream:
        if c["type"] == "audio":
            audio += c["data"]
        elif c["type"] == "WordBoundary":
            words.append({"text": c["text"], "start": c["offset"] / 1e7, "end": (c["offset"] + c["duration"]) / 1e7})
    mp3.write_bytes(audio)
    if not words:
        raise SystemExit(f"No word timings for: {text!r}")
    return words


def duration(path: Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "default=nw=1:nk=1", str(path)], text=True).strip())


def split_recording(src: Path, expected: list[float]) -> list[tuple[float, float]]:
    """Cut one recording into len(expected) lines. Pauses inside a line can be as long as pauses
    between lines, so pick the pauses closest to where each line should end (expected = Edge TTS
    length of the same lines), then check every part has about the expected length."""
    total = duration(src)
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(v) for v in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", log)]
    speech_start = ends[0] if starts and starts[0] < 0.05 and ends else 0.0
    speech_end = starts[-1] if len(starts) > len(ends) or (ends and ends[-1] > total - 0.05) else total
    gaps = [(s, e) for s, e in zip(starts, ends) if s > speech_start + 0.1 and e < speech_end - 0.1]
    n = len(expected)
    if len(gaps) < n - 1:
        raise SystemExit(f"{src.name}: found {len(gaps) + 1} spoken parts, but the storyboard has {n} \"say\" lines. "
                         "Record every line in order with a clear pause between lines.")
    span, acc, targets = speech_end - speech_start, 0.0, []
    for d in expected[:-1]:
        acc += d
        targets.append(speech_start + span * acc / sum(expected))
    # dynamic programming: choose n-1 increasing pauses; cost = distance to target, minus a bonus for long pauses
    INF = float("inf")
    cost = [[abs((g[0] + g[1]) / 2 - t) - 0.8 * (g[1] - g[0]) for g in gaps] for t in targets]
    best = [[INF] * len(gaps) for _ in targets]
    back = [[-1] * len(gaps) for _ in targets]
    for j in range(len(gaps)):
        best[0][j] = cost[0][j]
    for k in range(1, n - 1):
        for j in range(k, len(gaps)):
            i = min(range(k - 1, j), key=lambda i: best[k - 1][i])
            best[k][j], back[k][j] = best[k - 1][i] + cost[k][j], i
    j = min(range(len(gaps)), key=lambda j: best[n - 2][j]) if n > 1 else -1
    picked = []
    for k in range(n - 2, -1, -1):
        picked.append(gaps[j])
        j = back[k][j]
    cuts = picked[::-1]
    bounds, a = [], speech_start
    for s, e in cuts:
        bounds.append((max(0.0, a - LEAD), s + END_PAD))
        a = e
    bounds.append((max(0.0, a - LEAD), min(total, speech_end + END_PAD)))
    ratios = [(b - a) / d for (a, b), d in zip(bounds, expected)]
    med = statistics.median(ratios)
    bad = [i + 1 for i, r in enumerate(ratios) if not 0.6 * med < r < 1.6 * med]
    if bad:
        raise SystemExit(f"{src.name}: line(s) {bad} do not match their \"say\" text in length. "
                         "Make the recording read exactly the say lines, in order, with a pause between lines.")
    return bounds


async def main(slug: str):
    film = ROOT / "src/films" / slug
    sb = json.loads((film / "storyboard.json").read_text(encoding="utf-8"))
    out = ROOT / "public/films" / slug / "tts"
    out.mkdir(parents=True, exist_ok=True)
    shots = [s for s in sb["shots"] if s.get("say")]
    recording = ROOT / "voice" / f"{slug}.mp3"
    parts = None
    if recording.exists():
        # Edge timings of the same lines: they set where each recorded line should end, and word rhythm
        edge_words = []
        with tempfile.TemporaryDirectory() as tmp:
            for s in shots:
                edge_words.append(await speak(s["say"], Path(tmp) / "x.mp3"))
        parts = split_recording(recording, [w[-1]["end"] for w in edge_words])
    print(f"  voice: {recording.name + ' (recording)' if parts else 'Edge TTS ' + VOICE}")
    names, captions = [], {}
    for i, shot in enumerate(sb["shots"]):
        if not shot.get("say"):
            continue
        name = f"{shot['id']}-{round(SAY_AT * 10)}"
        wav = out / f"{name}.wav"
        if parts:
            a, b = parts[shots.index(shot)]
            fade = f"afade=t=in:st=0:d=0.02,afade=t=out:st={max(0, b - a - 0.06):.3f}:d=0.06"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(recording),
                            "-af", f"atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,{fade},{CLEAN}",
                            "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], check=True)
            dur = duration(wav)
            # no aligner installed: take Edge's word rhythm for the same text, stretched onto the recorded line
            edge = edge_words[shots.index(shot)]
            k = (dur - LEAD - END_PAD) / edge[-1]["end"]
            words = [{"text": w["text"], "start": round(LEAD + w["start"] * k, 3), "end": round(LEAD + w["end"] * k, 3)} for w in edge]
        else:
            mp3 = out / f"{name}.mp3"
            words = await speak(shot["say"], mp3)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-af", CLEAN,
                            "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], check=True)
            dur = duration(wav)
        captions[shot["id"]] = {"dur": round(dur, 3), "words": words}
        # grow the shot to fit its line, so storyboard.json matches the video (sound_check reads it)
        shot.setdefault("seconds_min", shot["seconds"])  # the author's value survives re-runs with a new voice
        shot["seconds"] = max(shot["seconds_min"], round(SAY_AT + dur + TAIL + 0.005, 2))
        # fields the shared check scripts (sound_check, contact_sheet) expect
        shot.setdefault("beat", i + 1)
        shot.setdefault("kind", "story")
        shot.setdefault("what", shot["say"])
        names.append(name)
        print(f"{name}: {dur:.2f}s  {len(words)} words")
    (film / "storyboard.json").write_text(json.dumps(sb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (film / "audio.json").write_text(json.dumps({"sfx": [], "music": [], "tts": names}, indent=2) + "\n", encoding="utf-8")
    (film / "captions.json").write_text(json.dumps(captions, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: py kit_tts.py <slug>")
    asyncio.run(main(sys.argv[1]))
