// Finds captions already burned into the source video: bright, high-contrast text in the same
// horizontal band in at least 3 of 8 frames sampled across the clip. Loomy then moves its own
// captions to the other band (and offers to turn them off).

export const SAMPLE_W = 320;

// One frame of brightness values (0-255), w x h: the bands of rows that look like a line of
// caption text. Caption text is dense, centred, and switches many times between bright fill and a
// dark outline or background along each row.
export const TEXT = { diff: 110, hi: 150, lo: 60, minN: 10, density: 0.08, minH: 0.012, gap: 0.08, cx: 0.3 };

export function textRuns(L, w, h, P = TEXT) {
  const rows = [], xs = [];
  for (let y = 0; y < h; y++) {
    xs.length = 0;
    const o = y * w;
    for (let x = 1; x < w - 1; x++) {
      const a = L[o + x - 1], b = L[o + x + 1];
      const hi = a > b ? a : b, lo = a > b ? b : a;
      if (hi - lo > P.diff && hi > P.hi && lo < P.lo) xs.push(x);
    }
    // The longest stretch of edges with no gap wider than a word space: a line of text is one
    // unbroken stretch, while texture and outlines elsewhere in the frame are separate.
    let best = null;
    for (let i = 0, j = 0; i < xs.length; i = j) {
      for (j = i + 1; j < xs.length && xs[j] - xs[j - 1] <= P.gap * w; j++);
      if (!best || j - i > best.n) { let sx = 0; for (let k = i; k < j; k++) sx += xs[k]; best = { n: j - i, span: xs[j - 1] - xs[i], cx: sx / (j - i) / w }; }
    }
    rows.push(best && best.n >= P.minN && best.span >= 0.12 * w && best.n / best.span >= P.density ? { y, cx: best.cx } : null);
  }
  const runs = [];
  let cur = null, gap = 0;
  for (const r of rows) {
    if (r) { if (cur) { cur.y1 = r.y; cur.cx.push(r.cx); } else cur = { y0: r.y, y1: r.y, cx: [r.cx] }; gap = 0; }
    else if (cur && ++gap > 2) { runs.push(cur); cur = null; gap = 0; }
  }
  if (cur) runs.push(cur);
  // A brightness profile of the band (32 columns), to tell changing words from a still drawing.
  const sig = (r) => {
    const out = new Float32Array(32), n = new Float32Array(32);
    for (let y = r.y0; y <= r.y1; y++) for (let x = 0; x < w; x++) { const b = (x * 32 / w) | 0; out[b] += L[y * w + x]; n[b]++; }
    return out.map((v, i) => v / n[i]);
  };
  return runs
    .map(r => ({ y0: r.y0 / h, y1: (r.y1 + 1) / h, cx: r.cx.reduce((p, q) => p + q, 0) / r.cx.length, sig: sig(r) }))
    .filter(r => r.y1 - r.y0 >= P.minH && r.y1 - r.y0 <= 0.12 && r.cx >= P.cx && r.cx <= 1 - P.cx);
}

// Runs from each sampled frame -> the band seen in the most frames, if in 3 or more.
const meanDiff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };

export function captionBand(framesRuns, need = 3, changed = 8, minKinds = 2) {
  const all = framesRuns.flatMap((runs, f) => runs.map(r => ({ ...r, f, c: (r.y0 + r.y1) / 2 })));
  let best = null;
  for (const a of all) {
    const near = all.filter(b => Math.abs(b.c - a.c) <= 0.08);
    const frames = new Set(near.map(b => b.f)).size;
    // How many different versions of the band: captions change words, a logo or drawing does not.
    const kinds = [];
    for (const b of near) if (!b.sig || kinds.every(k => meanDiff(k, b.sig) > changed)) kinds.push(b.sig);
    if (!best || frames > best.frames) best = { frames, kinds: kinds.length, y0: Math.min(...near.map(b => b.y0)), y1: Math.max(...near.map(b => b.y1)) };
  }
  const sampled = framesRuns.length;
  if (!best || best.frames < need || best.kinds < minKinds) return { found: false, frames: best ? best.frames : 0, kinds: best ? best.kinds : 0, sampled };
  return { found: true, frames: best.frames, kinds: best.kinds, sampled, y0: Math.round(best.y0 * 1000) / 1000, y1: Math.round(best.y1 * 1000) / 1000 };
}

// Samples `frames` frames between s and e of a <video> and looks for burned-in captions: by default
// the same band in 3 of 8 frames with changing words. The Bold heading's first 3 s use 6 frames and
// any text at all (need 1), since even one caption under it there would be covered.
export async function burnedCaptions(video, s, e, seek, { frames = 8, need = 3, minKinds = 2 } = {}) {
  const w = SAMPLE_W, h = Math.max(2, Math.round(w * video.videoHeight / video.videoWidth));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const L = new Uint8ClampedArray(w * h), runs = [];
  for (let k = 0; k < frames; k++) {
    await seek(video, s + (e - s) * (k + 0.5) / frames);
    if (video.error) break;
    g.drawImage(video, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    runs.push(textRuns(L, w, h));
  }
  return captionBand(runs, need, 8, minKinds);
}
