# Records each script line with ElevenLabs (the proxy adds the key) and keeps its word timings.
import json, sys, base64, urllib.request, os
out, voice, lines_file = sys.argv[1], sys.argv[2], sys.argv[3]
lines = [l.strip() for l in open(lines_file) if l.strip()]
settings = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True}
for i, text in enumerate(lines):
    mp3 = f"{out}/line{i:02d}.mp3"
    if os.path.exists(mp3): continue
    model = os.environ.get("MODEL", "eleven_multilingual_v2")
    body = {"text": text, "model_id": model, "voice_settings": settings}
    if model != "eleven_v3":
        body.update({"previous_text": " ".join(lines[max(0, i - 2):i]) or None, "next_text": " ".join(lines[i + 1:i + 2]) or None})
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open(mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    a = d["alignment"]
    # characters -> words
    words, cur, s = [], "", None
    for ch, st, en in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if ch.isspace():
            if cur: words.append({"w": cur, "s": s, "e": prev_e}); cur = ""
            continue
        if not cur: s = st
        cur += ch; prev_e = en
    if cur: words.append({"w": cur, "s": s, "e": prev_e})
    words = [w for w in words if not (w["w"].startswith("[") or w["w"].endswith("]"))]   # v3 audio tags are not spoken
    json.dump({"text": text, "words": words}, open(f"{out}/line{i:02d}.json", "w"))
    print(i, f"{words[-1]['e']:.2f}s", text[:50])
