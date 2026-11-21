# Places each recorded line at its section of the bridge picture, sped up (pitch kept) only as much
# as needed to fit, and writes voice/voice.wav (48 kHz mono, 67.5 s) and voice/words.json.
import json, subprocess, numpy as np, wave, os, sys
P = os.path.dirname(os.path.abspath(__file__)); SR = 48000; TOTAL = 67.5
# line -> (start, end of its slot); a slot may run 0.25 s into the next section.
SLOT = [(0.06, 4.33), (4.39, 9.43), (9.49, 14.80), (14.86, 17.9), (17.95, 21.43), (21.49, 27.43), (27.49, 32.90),
        (None, 37.80), (37.86, 40.33), (40.49, 43.43), (43.49, 47.03), (47.09, 54.00), (54.06, 57.83), (57.89, 62.10), (62.16, 67.3)]
SNAP = 34.62
def load(i):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{P}/lines3/line{i:02d}.mp3", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, "<i2").astype(np.float64) / 32768
def squeeze(x, ws, rms, h, keep=0.2, longer=0.3):
    """shorten silent gaps inside a line (between words) to `keep` s; word times follow"""
    db = 20 * np.log10(rms / rms.max()); quiet = db < -36
    cuts = []   # (start, length) in seconds, in the original clip
    i = 0
    first, last = ws[0]["s"], ws[-1]["e"]
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            a, b = i * h / SR, j * h / SR
            if b - a > longer and a > first and b < last:
                cuts.append((a + keep / 2, (b - a) - keep))
            i = j
        else: i += 1
    if not cuts: return x, ws
    keep_mask = np.ones(len(x), bool)
    for a, L in cuts:
        s0 = int(a * SR); f = int(0.01 * SR)
        x[s0 - f:s0] *= np.linspace(1, 0, f); x[s0 + int(L * SR): s0 + int(L * SR) + f] *= np.linspace(0, 1, f)
        keep_mask[s0:s0 + int(L * SR)] = False
    shift = lambda t: t - sum(min(L, max(0.0, t - a)) for a, L in cuts)
    for w in ws: w["s"], w["e"] = shift(w["s"]), shift(w["e"])
    return x[keep_mask], ws


def tempo(x, k):
    if k <= 1.0005: return x
    raw = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    out = subprocess.run(["ffmpeg", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={k:.4f}", "-f", "s16le", "-"], input=raw, capture_output=True).stdout
    return np.frombuffer(out, "<i2").astype(np.float64) / 32768
voice = np.zeros(int(TOTAL * SR)); words = []; prev_end = 0.0
for i, (a, b) in enumerate(SLOT):
    d = json.load(open(f"{P}/lines3/line{i:02d}.json")); x = load(i)
    ws = d["words"]
    h = int(0.02 * SR); n = len(x) // h; rms = np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1) + 1e-12)
    se = (np.flatnonzero(20 * np.log10(rms / rms.max()) > -32)[-1] + 1) * h / SR   # where the speech really stops
    ws[-1]["e"] = min(ws[-1]["e"], se + 0.03); x = x[: int((se + 0.3) * SR)]
    x, ws = squeeze(x, ws, rms, h)
    dur = ws[-1]["e"] + 0.05
    if a is None:  # the snap line: "snaps" lands 2 frames before the bolt breaks, then hurries to its slot's end
        snap_w = next(w for w in ws if w["w"].lower().startswith("snaps"))
        k = 1.0
        for _ in range(20):
            a = SNAP - 0.07 - snap_w["s"] / k
            k = min(1.2, max(1.0, dur / (b + 0.05 - a)))
        a = max(a, prev_end + 0.08)
    else:
        a = max(a, prev_end + 0.12)   # never over the line before
        k = min(1.2, max(1.0, dur / (b + 0.1 - a)))
        if dur / (b + 0.1 - a) > 1.2: print(f'  !! line {i} needs {dur / (b + 0.1 - a):.3f}')
    prev_end = a + dur / k
    y = tempo(x, k)
    s0 = int(a * SR); voice[s0:s0 + len(y)] += y[: max(0, len(voice) - s0)]
    for w in ws: words.append({"w": w["w"], "s": round(a + w["s"] / k, 3), "e": round(a + w["e"] / k, 3)})
    print(f"line {i:2d} at {a:6.2f}s  tempo {k:.3f}  ends {a + dur / k:6.2f}s (slot end {b:.2f})")
os.makedirs(f"{P}/voice3", exist_ok=True)
with wave.open(f"{P}/voice3/voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(voice, -1, 1) * 32767).astype("<i2").tobytes())
json.dump(words, open(f"{P}/voice3/words.json", "w"))
print(len(words), "words")
