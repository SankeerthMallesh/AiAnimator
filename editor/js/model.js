// The editor's project: plain data and pure functions, so every edit is easy to test and undo.
//
// sources:  { [id]: { name, duration, width, height, hasAudio, kind: 'upload' | 'loomy' } }
// segments: the video track, in order. Each plays source `src` from `in` to `out` (source seconds)
//           at `speed`, with `vol` for its own sound, `fit` ('fill' crops to the frame, 'fit' shows
//           the whole picture on a blurred copy), `zoom` and the `transition` into it.
// texts:    boxes at fixed times on the output timeline (they stay put when the video is edited).
// captions: words tied to a source's own time, so they follow the video through every trim,
//           split and reorder (Loomy videos bring theirs; you can add or change them).
// music:    one music track for the whole video (E3).

export const FORMATS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080] };
export const MIN_LEN = 0.1;
export const TRANSITIONS = ['cut', 'fade', 'whip', 'zoom'];

let counter = 0;
export const uid = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));
const round = (v) => Math.round(v * 1000) / 1000;

export function newProject() {
  return {
    version: 1, format: '9:16', fps: 30,
    sources: {}, segments: [], texts: [], captions: [],
    music: null,
    audio: { sourceVol: 1, musicVol: 0.35, duck: true, fadeIn: 0, fadeOut: 0 },
    captionStyle: { look: 'bold', y: 0.7, size: 1 },
  };
}

export function newSegment(src, duration) {
  return { id: uid('s'), src, in: 0, out: round(duration), speed: 1, vol: 1, fit: 'fill', zoom: { from: 1, to: 1, x: 0.5, y: 0.5 }, transition: { kind: 'cut', dur: 0.4 } };
}

export const segLen = (s) => (s.out - s.in) / s.speed;

// Where each segment sits on the output timeline.
export function timeline(p) {
  let t = 0;
  return p.segments.map((seg, index) => { const start = t; t += segLen(seg); return { seg, index, start, end: t }; });
}

export const duration = (p) => p.segments.reduce((n, s) => n + segLen(s), 0);

// The segment playing at output time t (the last one at the very end), and the source time shown.
export function at(p, t) {
  const tl = timeline(p);
  if (!tl.length) return null;
  const hit = tl.find(x => t >= x.start && t < x.end) || (t >= tl[tl.length - 1].end ? tl[tl.length - 1] : tl[0]);
  const local = Math.max(0, Math.min(t, hit.end) - hit.start);
  return { ...hit, srcT: Math.min(hit.seg.out, hit.seg.in + local * hit.seg.speed), local };
}

// Output time at which source time `srcT` of segment `seg` plays.
export const outTime = (entry, srcT) => entry.start + (srcT - entry.seg.in) / entry.seg.speed;

// ---------- edits: each returns a new project (the old one is kept for undo) ----------

export function addSource(p, id, info) {
  const q = clone(p);
  q.sources[id] = { name: info.name || 'Video', duration: info.duration, width: info.width || 0, height: info.height || 0, hasAudio: info.hasAudio !== false, kind: info.kind || 'upload' };
  return q;
}

// Adds the whole source as a new segment at the end (or at index).
export function addSegment(p, src, index = p.segments.length) {
  const info = p.sources[src];
  if (!info) throw new Error(`unknown source ${src}`);
  const q = clone(p);
  const seg = newSegment(src, info.duration);
  q.segments.splice(Math.max(0, Math.min(index, q.segments.length)), 0, seg);
  return { project: q, id: seg.id };
}

// Splits the segment under output time t. Both halves must last MIN_LEN or more.
export function split(p, t) {
  const hit = at(p, t);
  if (!hit) return { project: p, id: null };
  const cut = round(hit.srcT);
  if (cut - hit.seg.in < MIN_LEN || hit.seg.out - cut < MIN_LEN) return { project: p, id: null };
  const q = clone(p);
  const a = q.segments[hit.index];
  const b = { ...clone(a), id: uid('s'), in: cut, transition: { kind: 'cut', dur: a.transition.dur } };
  a.out = cut;
  q.segments.splice(hit.index + 1, 0, b);
  return { project: q, id: b.id };
}

// Moves one edge of a segment. edge 'in' or 'out', value in source seconds; clamped to the source
// and to MIN_LEN.
export function trim(p, id, edge, value) {
  const q = clone(p);
  const s = q.segments.find(x => x.id === id);
  if (!s) return p;
  const max = q.sources[s.src]?.duration ?? s.out;
  if (edge === 'in') s.in = round(Math.max(0, Math.min(Number(value), s.out - MIN_LEN)));
  else s.out = round(Math.min(max, Math.max(Number(value), s.in + MIN_LEN)));
  return q;
}

export function move(p, id, toIndex) {
  const q = clone(p);
  const i = q.segments.findIndex(x => x.id === id);
  if (i < 0) return p;
  const [s] = q.segments.splice(i, 1);
  q.segments.splice(Math.max(0, Math.min(toIndex, q.segments.length)), 0, s);
  return q;
}

export function remove(p, id) {
  const q = clone(p);
  q.segments = q.segments.filter(x => x.id !== id);
  q.texts = q.texts.filter(x => x.id !== id);
  q.captions = q.captions.filter(x => x.id !== id);
  // A source nothing uses any more is dropped from the project.
  const used = new Set(q.segments.map(s => s.src));
  for (const k of Object.keys(q.sources)) if (!used.has(k) && !q.captions.some(c => c.src === k)) delete q.sources[k];
  return q;
}

export function update(p, id, patch) {
  const q = clone(p);
  for (const list of [q.segments, q.texts, q.captions]) {
    const x = list.find(y => y.id === id);
    if (x) { deepAssign(x, patch); return q; }
  }
  return p;
}
function deepAssign(x, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && x[k] && typeof x[k] === 'object') deepAssign(x[k], v);
    else x[k] = v;
  }
}

export function setFormat(p, format) {
  if (!FORMATS[format]) return p;
  const q = clone(p); q.format = format; return q;
}

// ---------- undo ----------
export class History {
  constructor(p, limit = 100) { this.past = []; this.future = []; this.now = p; this.limit = limit; }
  push(p) { if (p === this.now) return p; this.past.push(this.now); if (this.past.length > this.limit) this.past.shift(); this.now = p; this.future = []; return p; }
  undo() { if (!this.past.length) return this.now; this.future.push(this.now); this.now = this.past.pop(); return this.now; }
  redo() { if (!this.future.length) return this.now; this.past.push(this.now); this.now = this.future.pop(); return this.now; }
}

export function fmtTime(t) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
