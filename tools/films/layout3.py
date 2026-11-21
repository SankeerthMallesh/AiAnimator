# Lays recorded lines (mp3 + word json pairs) on the timeline with the given pauses. The last word's end is
# clamped to where the speech actually stops (v3's alignment stretches the last word over trailing breath).
# usage: layout3.py <outdir> '<gaps json>' <end pad> line1.mp3 line2.mp3 ...
import json, subprocess, numpy as np, wave, sys
SR = 48000
out, GAP, END, files = sys.argv[1], json.loads(sys.argv[2]), float(sys.argv[3]), sys.argv[4:]
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, "<i2").astype(np.float64) / 32768
def speech_end(x):
    h = int(0.02 * SR); n = len(x) // h
    rms = np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    on = np.flatnonzero(db > -32)
    return (on[-1] + 1) * h / SR
t = float(GAP.get('start', 0.3)); parts = []; words = []; lines = []
for i, f in enumerate(files):
    d = json.load(open(f[:-4] + '.json')); x = load(f)
    se = speech_end(x)
    x = x[: int((se + 0.3) * SR)]; x[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))
    t += float(GAP.get(str(i), 0 if i == 0 else 0.42))
    parts.append((t, x))
    ws = d['words']; ws[-1]['e'] = min(ws[-1]['e'], se + 0.03)
    for w in ws: words.append({'w': w['w'], 's': round(t + w['s'], 3), 'e': round(t + w['e'], 3), 'line': i})
    lines.append({'i': i, 'text': d['text'], 'start': round(t + ws[0]['s'], 3), 'end': round(t + ws[-1]['e'], 3)})
    t += ws[-1]['e']
total = round(t + END, 3)
voice = np.zeros(int(total * SR) + 1)
for a, x in parts: s0 = int(a * SR); voice[s0:s0 + len(x)] += x[:len(voice) - s0]
with wave.open(f'{out}/voice.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(voice, -1, 1) * 32767).astype('<i2').tobytes())
json.dump(words, open(f'{out}/words.json', 'w')); json.dump({'total': total, 'lines': lines}, open(f'{out}/lines.json', 'w'), indent=1)
for l in lines: print(f"{l['i']:2d} {l['start']:6.2f}-{l['end']:6.2f}  {l['text'][:60]}")
print('total', total)
