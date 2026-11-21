// Loudness levelling for every Loomy output: gain to the target loudness (BS.1770, what YouTube
// measures), then a look-ahead limiter so peaks stay under the ceiling even after the audio codec
// (which adds up to about 1 dB). Works on planar Float32 channels in place.
import { loudness } from './renderlog.js';

export const TARGET_LUFS = -13.5;
export const CEILING = Math.pow(10, -3 / 20); // -3 dBFS sample peak: -1.7 dBTP or lower once encoded (Opus or AAC)

export function levelChannels(chans, sr, { target = TARGET_LUFS, ceiling = CEILING, maxGain = 8 } = {}) {
  const before = loudness(chans, sr);
  if (!isFinite(before)) return { before, gain: 1 };
  const g = Math.min(Math.pow(10, (target - before) / 20), maxGain);
  const n = chans[0].length, look = Math.max(1, Math.round(sr * 0.005));
  // The gain each sample needs so it stays under the ceiling.
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const c of chans) { const a = Math.abs(c[i]); if (a > p) p = a; }
    const v = p * g;
    need[i] = v > ceiling ? ceiling / v : 1;
  }
  // Minimum over the next 5 ms (sliding window), so the gain is already down when a peak arrives.
  const minAhead = new Float32Array(n);
  const dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (t > h && need[dq[t - 1]] >= need[i]) t--;
    dq[t++] = i;
    while (dq[h] > i + look) h++;
    minAhead[i] = need[dq[h]];
  }
  // Fast attack (1.5 ms) toward it, slow release (150 ms) back up: no clicks, no flattened tops.
  const att = 1 - Math.exp(-1 / (sr * 0.0015)), rel = Math.exp(-1 / (sr * 0.15));
  let cur = 1;
  for (let i = 0; i < n; i++) {
    const m = minAhead[i];
    cur = m < cur ? cur + (m - cur) * att : m + (cur - m) * rel;
    const k = g * cur;
    for (const c of chans) c[i] = Math.max(-ceiling, Math.min(ceiling, c[i] * k));
  }
  return { before, gain: g };
}
