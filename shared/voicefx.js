// The narrator voice as the hand-made films do it: ElevenLabs v3 reads each line with a delivery tag
// ("[tense] The shock makes you gasp…"), returns real word timings for the captions, long pauses
// inside a line are shortened, and every line goes through a small voice chain (rumble cut, less
// boxiness, presence, air, a gentle 2.5:1 compressor) so soft words stay clear over the music.

// How a line is read. The writer picks one per scene; anything else falls back to 'neutral'.
export const DELIVERIES = ['neutral', 'serious', 'excited', 'calm', 'tense', 'urgent', 'curious', 'amused', 'sad', 'warm',
  'firm', 'shocked', 'happy', 'mysterious', 'whispering', 'proud', 'deadpan', 'annoyed', 'relieved', 'dramatic'];
const TAG = { whispering: 'whispers', neutral: '' };

export const V3 = 'eleven_v3';

// The text sent to the model: v3 takes a leading [tag]; older models would read the tag out loud.
export function voiceText(text, delivery, model = V3) {
  if (model !== V3) return text;
  const tag = TAG[delivery] ?? (DELIVERIES.includes(delivery) ? delivery : '');
  return tag ? `[${tag}] ${text}` : text;
}

// ElevenLabs character alignment -> spoken words [{ w, s, e }] (audio tags are not spoken).
export function alignmentWords(a) {
  const out = [];
  if (!a?.characters) return out;
  let cur = '', s = 0, e = 0;
  const push = () => { if (cur && !/^\[.*\]$/.test(cur) && !cur.startsWith('[') && !cur.endsWith(']')) out.push({ w: cur, s, e }); cur = ''; };
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { push(); return; }
    if (!cur) s = a.character_start_times_seconds[i];
    cur += ch; e = a.character_end_times_seconds[i];
  });
  push();
  return out;
}

// Base64 16-bit PCM -> Float32Array.
export function pcmFromBase64(b64) {
  const bin = atob(b64), n = bin.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; out[i] = v / 32768; }
  return out;
}

// Level in dB (relative to the loudest block) of 20 ms blocks.
function blocks(x, sr) {
  const h = Math.max(1, Math.round(0.02 * sr)), n = Math.floor(x.length / h), db = new Float32Array(n);
  let peak = 1e-9;
  for (let b = 0; b < n; b++) { let acc = 0; for (let i = b * h; i < (b + 1) * h; i++) acc += x[i] * x[i]; db[b] = Math.sqrt(acc / h) + 1e-9; peak = Math.max(peak, db[b]); }
  for (let b = 0; b < n; b++) db[b] = 20 * Math.log10(db[b] / peak);
  return { db, h };
}

// Where the speech really stops (v3's alignment stretches the last word over a trailing breath).
export function speechEnd(x, sr) {
  const { db, h } = blocks(x, sr);
  for (let b = db.length - 1; b >= 0; b--) if (db[b] > -32) return Math.min(x.length / sr, ((b + 1) * h) / sr);
  return x.length / sr;
}

// Shortens silences inside a line (between its first and last word) to `keep` seconds; words follow.
// words: [{ w|text, s|start, e|end }] in seconds from the start of x (either naming works).
export function squeezePauses(x, sr, words, { keep = 0.2, longer = 0.3 } = {}) {
  if (!words?.length) return { samples: x, words, shift: (t) => t };
  const S = (w) => w.s ?? w.start, E = (w) => w.e ?? w.end;
  const first = S(words[0]), last = E(words[words.length - 1]);
  const { db, h } = blocks(x, sr);
  const cuts = [];
  for (let b = 0; b < db.length;) {
    if (db[b] < -36) {
      let j = b; while (j < db.length && db[j] < -36) j++;
      const a = (b * h) / sr, z = (j * h) / sr;
      if (z - a > longer && a > first && z < last) cuts.push([a + keep / 2, z - a - keep]);
      b = j;
    } else b++;
  }
  if (!cuts.length) return { samples: x, words, shift: (t) => t };
  const fade = Math.round(0.01 * sr), parts = [];
  let pos = 0;
  for (const [a, L] of cuts) {
    const s0 = Math.round(a * sr), s1 = Math.round((a + L) * sr);
    const head = x.slice(pos, s0);
    for (let i = 0; i < fade && i < head.length; i++) head[head.length - 1 - i] *= i / fade;
    parts.push(head);
    pos = s1;
  }
  const tail = x.slice(pos);
  for (let i = 0; i < fade && i < tail.length; i++) tail[i] *= i / fade;
  parts.push(tail);
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  const shift = (t) => t - cuts.reduce((n, [a, L]) => n + Math.min(L, Math.max(0, t - a)), 0);
  const moved = words.map((w) => {
    const c = { ...w };
    if ('s' in w) { c.s = shift(w.s); c.e = shift(w.e); } else { c.start = shift(w.start); c.end = shift(w.end); }
    return c;
  });
  return { samples: out, words: moved, shift };
}

// RBJ biquad, applied in place.
function biquad(x, sr, type, f0, q = 0.707, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40), w = (2 * Math.PI * f0) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  else { // high shelf
    const sq = 2 * Math.sqrt(A) * al;
    b0 = A * ((A + 1) + (A - 1) * cw + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sq);
    a0 = (A + 1) - (A - 1) * cw + sq; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sq;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
  return x;
}

// The voice chain. Returns a new Float32Array at the same peak level as the input.
export function polishVoice(input, sr) {
  const x = Float32Array.from(input);
  if (x.length < sr * 0.1) return x;
  let peakIn = 0; for (const v of input) peakIn = Math.max(peakIn, Math.abs(v));
  biquad(x, sr, 'hp', 75, 0.707);
  biquad(x, sr, 'peak', 300, 1.0, -1.5);
  biquad(x, sr, 'peak', 3200, 0.9, 2.0);
  biquad(x, sr, 'shelf', Math.min(9000, sr * 0.4), 0.707, 1.5);
  // gentle compressor: fast attack, 180 ms release, 2.5:1 above the 70th percentile of speech level
  const att = Math.exp(-1 / (0.008 * sr)), rel = Math.exp(-1 / (0.18 * sr));
  const lvl = new Float32Array(x.length);
  let e = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); e = a > e ? att * e + (1 - att) * a : rel * e + (1 - rel) * a; lvl[i] = 20 * Math.log10(e + 1e-9); }
  let max = -200; for (let i = 0; i < lvl.length; i += 64) max = Math.max(max, lvl[i]);
  const speech = []; for (let i = 0; i < lvl.length; i += 64) if (lvl[i] > max - 40) speech.push(lvl[i]);
  speech.sort((a, b) => a - b);
  const thr = speech.length ? speech[Math.floor(speech.length * 0.7)] : max - 12;
  let peakOut = 0;
  for (let i = 0; i < x.length; i++) { if (lvl[i] > thr) x[i] *= Math.pow(10, ((thr - lvl[i]) * (1 - 1 / 2.5)) / 20); peakOut = Math.max(peakOut, Math.abs(x[i])); }
  if (peakOut > 0) { const k = peakIn / peakOut; for (let i = 0; i < x.length; i++) x[i] *= k; }
  return x;
}

// One finished line: squeeze long pauses, polish. data: { samples, sampleRate, words?[{text,start,end}] }.
export function finishLine(data) {
  if (!data?.samples || data.finished) return data;
  const sr = data.sampleRate;
  const sq = squeezePauses(data.samples, sr, data.words);
  const sentences = data.sentences?.map((x) => ({ ...x, start: sq.shift(x.start), end: sq.shift(x.end) }));
  return { ...data, samples: polishVoice(sq.samples, sr), words: sq.words, ...(sentences ? { sentences } : {}), finished: true };
}
