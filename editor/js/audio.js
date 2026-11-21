// The editor's sound: every part's own audio at its speed and volume (music comes in E3). The same
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
