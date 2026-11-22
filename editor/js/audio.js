// The editor's sound: every part's own audio at its speed and volume, and the music track (E3),
// ducked under the parts' own sound, with fades at the start and end of the video. The same
// graph plays the preview (AudioContext) and renders the export (OfflineAudioContext), then the
// export is levelled to -13.5 LUFS with peaks under -3 dBFS like every Loomy video.

import { timeline, duration } from './model.js';
import { levelChannels } from '../../shared/level.js';
import { SR } from './media.js';

const EDGE = 0.006; // short fades at every cut, so joins never click

// Schedules the project's sound into ctx, starting `from` seconds into the video, `when` seconds
// on the context clock. Returns the nodes (so the preview can stop them).
export function schedule(ctx, p, media, { from = 0, when = 0 } = {}) {
  const nodes = [];
  const master = ctx.createGain();
  master.connect(ctx.destination);
  nodes.push(master);
  for (const e of timeline(p)) {
    if (e.end <= from) continue;
    const buf = media.get(e.seg.src)?.audio;
    if (!buf) continue;
    const vol = (e.seg.vol ?? 1) * (p.audio?.sourceVol ?? 1);
    if (vol <= 0) continue;
    const skip = Math.max(0, from - e.start); // output seconds already past
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = e.seg.speed;
    const gn = ctx.createGain();
    const t0 = when + Math.max(0, e.start - from), t1 = when + (e.end - from);
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(vol, t0 + EDGE);
    gn.gain.setValueAtTime(vol, Math.max(t0 + EDGE, t1 - EDGE));
    gn.gain.linearRampToValueAtTime(0, t1);
    src.connect(gn).connect(master);
    src.start(t0, e.seg.in + skip * e.seg.speed);
    src.stop(t1);
    nodes.push(src, gn);
  }
  // E3: the music from the start of the video (looped if shorter), under the parts' sound.
  const mus = p.music && media.get(p.music.id)?.audio;
  const total = duration(p);
  if (mus && (p.audio?.musicVol ?? 0) > 0 && total > from) {
    const vol = p.audio.musicVol, ducked = vol * 0.3;
    const src = ctx.createBufferSource();
    src.buffer = mus; src.loop = mus.duration < total;
    const gn = ctx.createGain();
    const T = (x) => when + Math.max(0, x - from);
    const level = (x) => (p.audio.duck && soundAt(p, media, x) ? ducked : vol);
    gn.gain.setValueAtTime(level(from), when);
    if (p.audio.duck) for (const e of timeline(p)) {
      if (e.end <= from) continue;
      gn.gain.setTargetAtTime(level(e.start + 0.01), T(e.start), 0.08);
    }
    src.connect(gn).connect(master);
    const offset = (p.music.start || 0) + from;
    src.start(when, src.loop ? offset % mus.duration : Math.min(offset, mus.duration));
    src.stop(when + (total - from));
    nodes.push(src, gn);
  }
  // Fades of the whole mix at the start and the end.
  const fi = p.audio?.fadeIn || 0, fo = p.audio?.fadeOut || 0;
  if (fi > 0 && from < fi) { master.gain.setValueAtTime(Math.max(0.0001, from / fi), when); master.gain.linearRampToValueAtTime(1, when + (fi - from)); }
  if (fo > 0 && total - fo > from) { master.gain.setValueAtTime(1, when + (total - fo - from)); master.gain.linearRampToValueAtTime(0.0001, when + (total - from)); }
  return { nodes, master, stop() { for (const n of nodes) { try { n.stop?.(); } catch { /* not started */ } try { n.disconnect(); } catch { /* gone */ } } } };
}

// The whole soundtrack for export: stereo 48 kHz, levelled.
export async function renderAudio(p, media) {
  const total = Math.max(0.1, duration(p));
  const ctx = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
  schedule(ctx, p, media);
  const out = await ctx.startRendering();
  const chans = [out.getChannelData(0), out.getChannelData(1)];
  const info = levelChannels(chans, SR);
  out.levelInfo = info;
  return out;
}

// Whether a part with its own sound is playing at output time t (the music ducks under it).
function soundAt(p, media, t) {
  const e = timeline(p).find(x => t >= x.start && t < x.end);
  return !!(e && media.get(e.seg.src)?.audio && (e.seg.vol ?? 1) * (p.audio?.sourceVol ?? 1) > 0);
}
