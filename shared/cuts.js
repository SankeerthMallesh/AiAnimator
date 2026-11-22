// 1.1: the cut list for "cut parts out" on the export page, as plain numbers (no browser needed, so
// it is unit tested). A cut is { a, b } in seconds of the full video; the parts outside the cuts are
// kept and joined.

// Sorted, snapped to whole frames, inside the video, overlaps merged, slivers under a frame dropped.
// At least a second of video is always kept.
export function normalizeCuts(cuts, duration, fps = 30) {
  const snap = (t) => Math.round(Math.max(0, Math.min(duration, t)) * fps) / fps;
  const list = (cuts || []).map(c => ({ a: snap(Math.min(c.a, c.b)), b: snap(Math.max(c.a, c.b)) }))
    .filter(c => c.b - c.a >= 1 / fps - 1e-9).sort((x, y) => x.a - y.a);
  const out = [];
  for (const c of list) {
    const last = out[out.length - 1];
    if (last && c.a <= last.b + 1e-9) last.b = Math.max(last.b, c.b); else out.push({ ...c });
  }
  // Never cut the whole video: the last cuts give way until a second remains.
  while (out.length && duration - removed(out) < Math.min(1, duration)) out.pop();
  return out;
}

export const removed = (cuts) => cuts.reduce((s, c) => s + (c.b - c.a), 0);

// Where full-video time t lands in the cut video, or null when t is inside a cut.
export function mapTime(t, cuts) {
  let gone = 0;
  for (const c of cuts) {
    if (t < c.a - 1e-6) break;
    if (t < c.b - 1e-6) return null;
    gone += c.b - c.a;
  }
  return Math.max(0, t - gone);
}

// The cut that full-video time t is inside, or null.
export const cutAt = (t, cuts) => cuts.find(c => t >= c.a - 1e-6 && t < c.b - 1e-6) || null;

// The kept parts of planar audio (Float32Array per channel) joined, with a short fade at every join
// so a cut never clicks.
export function cutChannels(channels, sampleRate, cuts, fade = 0.006) {
  const len = channels[0]?.length || 0, F = Math.max(1, Math.round(fade * sampleRate));
  const parts = [];
  let from = 0;
  for (const c of cuts) { const a = Math.round(c.a * sampleRate), b = Math.round(c.b * sampleRate); if (a > from) parts.push([from, Math.min(a, len)]); from = Math.max(from, b); }
  if (from < len) parts.push([from, len]);
  const total = parts.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);
  return channels.map(src => {
    const dst = new Float32Array(total);
    let w = 0;
    parts.forEach(([a, b], i) => {
      dst.set(src.subarray(a, b), w);
      const n = b - a, f = Math.min(F, Math.floor(n / 2));
      if (i > 0) for (let k = 0; k < f; k++) dst[w + k] *= k / f;
      if (i < parts.length - 1) for (let k = 0; k < f; k++) dst[w + n - 1 - k] *= k / f;
      w += n;
    });
    return dst;
  });
}

// Long pauses in the sound (where a voice lags): stretches at least `min` seconds long that stay
// well under the voice's level. Each is offered as a cut that keeps `keep` seconds of quiet on both
// sides, so the speech still breathes. The music sits far under the voice, so it reads as quiet.
export function findPauses(channels, sampleRate, { min = 0.7, keep = 0.2, below = 14, from = 0 } = {}) {
  const win = Math.round(sampleRate * 0.02), n = Math.floor((channels[0]?.length || 0) / win);
  if (n < 10) return [];
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const ch of channels) for (let k = i * win, e = k + win; k < e; k++) s += ch[k] * ch[k];
    db[i] = 10 * Math.log10(s / (win * channels.length) + 1e-12);
  }
  const loud = Array.from(db).filter(v => v > -70).sort((x, y) => x - y);
  if (!loud.length) return [];
  const voice = loud[Math.floor(loud.length * 0.85)], quiet = voice - below;
  const out = [];
  for (let i = 0; i < n;) {
    if (db[i] >= quiet) { i++; continue; }
    let j = i; while (j < n && db[j] < quiet) j++;
    const a = i * win / sampleRate, b = j * win / sampleRate;
    // Not the very start (the cold open) and not the silent tail after the last word.
    if (b - a >= min && a > from && j < n) out.push({ a: a + keep, b: b - keep });
    i = j;
  }
  return out.filter(c => c.b - c.a > 0.1);
}

// m:ss.t
export function clock(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
