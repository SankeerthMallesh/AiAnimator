// Render log (loomy-manifest.json): what a finished video actually shows, recorded while it is
// exported, so tests can check it against the owner's targets. Renderers report each frame's shot
// and every caption as drawn (captured from the real fillText calls, so position, size and weight
// are what is on screen, not what was intended).

export class RenderLog {
  constructor(head = {}) {
    this.m = {
      tab: head.tab || '', style: head.style || '', duration: 0,
      voice: { engine: '', maxPlaybackRate: 1, wordsSpoken: 0, wpm: 0, spokenText: [] },
      script: { title: '', lines: [], characters: [] },
      shots: [], captions: [], clip: null,
      audio: { targetLufs: -13, measuredLufs: null, truePeak: null, normalizePath: 'none' },
    };
    this._shotKey = null; this._capKey = null;
  }

  // One call per frame with the shot on screen; consecutive frames with the same shot merge.
  shot(t, s) {
    const key = JSON.stringify(s);
    const last = this.m.shots[this.m.shots.length - 1];
    if (key === this._shotKey && last) { last.end = r3(t); return; }
    if (last && last.end < t) last.end = r3(t);
    this.m.shots.push({ start: r3(t), end: r3(t), ...s });
    this._shotKey = key;
  }

  // Run a caption drawing function, capture the text it draws, and log it.
  caption(t, ctx, H, draw) {
    const cap = captureText(ctx, draw);
    const lines = groupLines(cap);
    if (!lines.length) { this._capKey = null; return; }
    const text = lines.map(l => l.text).join(' ').replace(/\s+/g, ' ').trim();
    const yCenter = lines.reduce((a, l) => a + l.yMid, 0) / lines.length;
    const lineH = Math.max(...lines.map(l => l.h));
    const words = text.split(' ').filter(Boolean);
    const info = {
      text,
      yCenterPct: r1(yCenter / H * 100),
      lineHeightPct: r1(lineH / H * 100),
      fontWeight: Math.max(...cap.map(c => c.weight)),
      upperWords: words.filter(w => { const l = w.replace(/[^\p{L}]/gu, ''); return l.length >= 2 && l === l.toUpperCase() && l !== l.toLowerCase(); }).length,
      words: words.length,
      lines: lines.length,
    };
    // One caption while its text stays the same; the pop-in animation changes its size for a few
    // frames, so the values kept are the settled ones (the latest frame).
    const key = info.text;
    const last = this.m.captions[this.m.captions.length - 1];
    if (key === this._capKey && last) { Object.assign(last, info); last.end = r3(t); return; }
    this.m.captions.push({ start: r3(t), end: r3(t), ...info });
    this._capKey = key;
  }
  noCaption() { this._capKey = null; }

  finish(duration) { this.m.duration = r3(duration); return this.m; }
}

// Temporarily record every fillText the drawing function makes (with font and transform).
export function captureText(ctx, draw) {
  const out = [];
  const orig = ctx.fillText;
  ctx.fillText = function (text, x, y, maxW) {
    const s = String(text);
    if (s.trim()) {
      const m = ctx.measureText(s), tr = ctx.getTransform();
      const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
      const scaleY = Math.hypot(tr.b, tr.d) || 1;
      // Baseline y and the drawn box, in canvas pixels.
      const by = tr.b * x + tr.d * y + tr.f;
      const bx = tr.a * x + tr.c * y + tr.e;
      const weight = Number((/\b([1-9]00)\b/.exec(ctx.font) || [])[1]) || (/\bbold\b/.test(ctx.font) ? 700 : 400);
      out.push({ text: s, x: bx, top: by - asc * scaleY, bottom: by + desc * scaleY, weight, alpha: ctx.globalAlpha });
    }
    return orig.call(this, text, x, y, maxW);
  };
  try { draw(); } finally { ctx.fillText = orig; }
  return out.filter(c => c.alpha > 0.05);
}

// Calls on the same visual line (overlapping vertically) form one line; duplicate draws (shadow
// passes, outlines drawn as text) of the same word at the same place count once.
function groupLines(cap) {
  const seen = new Set(), uniq = [];
  for (const c of cap) { const k = `${c.text}|${Math.round(c.x)}|${Math.round(c.top)}`; if (!seen.has(k)) { seen.add(k); uniq.push(c); } }
  const lines = [];
  for (const c of uniq.sort((a, b) => a.top - b.top)) {
    const mid = (c.top + c.bottom) / 2;
    const l = lines.find(L => mid > L.top && mid < L.bottom);
    if (l) { l.items.push(c); l.top = Math.min(l.top, c.top); l.bottom = Math.max(l.bottom, c.bottom); }
    else lines.push({ items: [c], top: c.top, bottom: c.bottom });
  }
  return lines.map(l => ({
    text: l.items.sort((a, b) => a.x - b.x).map(c => c.text.trim()).join(' '),
    yMid: (l.top + l.bottom) / 2, h: l.bottom - l.top,
  }));
}

export const slugName = (s) => (s || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'video';
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

// Hand the finished log to tests: window.loomyManifest always; with ?test=1 it also downloads
// next to the video as <name>.loomy-manifest.json.
export function publishLog(manifest, name) {
  try { window.loomyManifest = manifest; } catch { /* not in a page */ }
  let test = false;
  try { test = new URLSearchParams(location.search).get('test') === '1' || new URLSearchParams(window.top.location.search).get('test') === '1'; } catch { /* cross-origin top */ }
  if (!test) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 1)], { type: 'application/json' }));
  a.download = `${name || 'loomy'}.loomy-manifest.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Loudness of a rendered AudioBuffer: BS.1770 integrated LUFS and sample peak (dBFS).
export function measureAudio(buffer) {
  const sr = buffer.sampleRate, chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  let peak = 0;
  for (const d of chans) for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  return { lufs: r1(loudness(chans, sr)), peakDb: r1(20 * Math.log10(Math.max(1e-9, peak))) };
}
function kWeighted(x, sr) {
  const shelf = (() => { const A = Math.pow(10, 3.99984 / 40), w = 2 * Math.PI * 1681.97445 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * 0.70718), s = 2 * Math.sqrt(A) * al;
    return [A * ((A + 1) + (A - 1) * c + s), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - s), (A + 1) - (A - 1) * c + s, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - s]; })();
  const hp = (() => { const w = 2 * Math.PI * 38.13547 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * 0.50033);
    return [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al]; })();
  let y = x;
  for (const [b0, b1, b2, a0, a1, a2] of [shelf, hp]) {
    const o = new Float32Array(y.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < y.length; i++) { const v = (b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; }
    y = o;
  }
  return y;
}
export function loudness(chans, sr) {
  const k = chans.map(c => kWeighted(c, sr));
  const block = Math.round(sr * 0.4), hop = Math.round(sr * 0.1), z = [];
  for (let s = 0; s + block <= k[0].length; s += hop) {
    let t = 0;
    for (const d of k) { let m = 0; for (let i = s; i < s + block; i++) m += d[i] * d[i]; t += m / block; }
    z.push(t);
  }
  const L = (v) => -0.691 + 10 * Math.log10(v), mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const abs = z.filter(v => L(v) > -70);
  if (!abs.length) return -Infinity;
  const gated = abs.filter(v => L(v) > L(mean(abs)) - 10);
  return L(mean(gated.length ? gated : abs));
}
