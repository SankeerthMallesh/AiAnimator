// Export: the soundtrack is rendered first, then each part's video plays (muted) while every frame
// is drawn with compose() and encoded at a steady 30 fps. Like Clips, playback slows down when the
// computer misses frames, so the MP4 keeps every frame; the sound is separate, so speed never shows.

import { timeline, duration } from './model.js';
import { compose, size, blurCanvas } from './draw.js';
import { renderAudio } from './audio.js';
import { seek } from './media.js';
import { mp4Writer } from '../../shared/encode.js';

const clampRate = (r) => Math.max(0.0625, Math.min(16, r));

export async function exportProject(p, media, { onProgress, onStage, signal } = {}) {
  const [W, H] = size(p), fps = p.fps || 30, total = duration(p);
  if (!(total > 0)) throw new Error('Add a video to the timeline first.');
  onStage?.('Mixing the sound…');
  const audio = await renderAudio(p, media);
  const out = await mp4Writer({ width: W, height: H, fps, audio });
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d', { alpha: false });
  const state = { blur: blurCanvas(), prev: null };
  const step = 1 / fps;
  let next = 0;
  onStage?.('Making the video… keep this tab open');
  for (const e of timeline(p)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const v = media.player(e.seg.src, 'export');
    v.pause();
    await seek(v, e.seg.in);
    // Every output frame due up to output time outT (within half a frame) is drawn from the frame
    // on screen now, so each source frame lands on its nearest output slot: no doubled frames from
    // rounding, and slow motion repeats frames only where it has to.
    const due = (outT) => {
      while (next <= outT + 0.5 * step && next < e.end - 1e-6) {
        compose(g, p, next, () => v, state);
        out.addFrame(canvas, next);
        next += step;
      }
      onProgress?.(Math.min(1, next / total));
    };
    due(e.start);
    if (e.end - e.start > step) await playThrough(v, e, fps, due, signal, () => out.failure);
    due(e.end); // a part that ended early holds its last frame to the end of its slot
    state.prev = snapshot(canvas, state.prev);
  }
  onProgress?.(1);
  return out.finish();
}

function snapshot(canvas, reuse) {
  const c = reuse || document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  return c;
}

// Plays one part from in to out, calling due(outputTime) for every frame the browser shows.
function playThrough(v, e, fps, due, signal, failed) {
  const { seg } = e;
  return new Promise((resolve, reject) => {
    let stopped = false, factor = 0.35, ceiling = 1, clean = 0, seen = 0, missed = 0, lastPresented = -1, lastT = seg.in;
    let lastDropped = v.getVideoPlaybackQuality?.().droppedVideoFrames || 0, lastCount = 0, still = 0, calls = 0;
    const onEnded = () => { due(e.end); end(); };
    const end = () => { if (stopped) return; stopped = true; clearInterval(guard); v.removeEventListener('ended', onEnded); v.pause(); resolve(); };
    const fail = (err) => { if (stopped) return; stopped = true; clearInterval(guard); v.removeEventListener('ended', onEnded); v.pause(); reject(err); };
    v.playbackRate = clampRate(seg.speed * factor);
    const frame = (now, meta) => {
      if (stopped) return;
      if (signal?.aborted) return fail(new DOMException('Cancelled', 'AbortError'));
      if (failed()) return fail(failed());
      const t = meta.mediaTime;
      calls++;
      if (t >= seg.out - 0.25 / fps) { due(e.end); return end(); }
      if (t >= seg.in - 0.02) due(e.start + (t - seg.in) / seg.speed);
      // Missed frames (skipped by us or dropped by the browser) slow playback down; three clean
      // stretches in a row let it speed back up, never past a speed that missed.
      if (lastPresented >= 0 && meta.presentedFrames - lastPresented > 1 && t - lastT > 1.4 / fps) missed += meta.presentedFrames - lastPresented - 1;
      lastPresented = meta.presentedFrames; lastT = t;
      if (++seen >= 15) {
        const dropped = v.getVideoPlaybackQuality?.().droppedVideoFrames || 0;
        missed += Math.max(0, dropped - lastDropped); lastDropped = dropped;
        if (missed > 0) { clean = 0; ceiling = Math.max(0.25, factor * 0.85); factor = Math.max(0.25, factor * 0.5); }
        else if (++clean >= 3 && factor < ceiling) { clean = 0; factor = Math.min(ceiling, factor * 1.15); }
        v.playbackRate = clampRate(seg.speed * factor);
        missed = 0; seen = 0;
      }
      v.requestVideoFrameCallback(frame);
    };
    v.requestVideoFrameCallback(frame);
    v.addEventListener('ended', onEnded);
    // A stalled video gets a nudge after 3 s; after 12 s without a frame the part ends where it got to.
    const guard = setInterval(() => {
      if (stopped) return;
      if (v.currentTime >= seg.out + 0.3) { due(e.end); end(); return; }
      if (calls === lastCount) {
        still += 0.5;
        if (still === 3) v.play().catch(() => {});
        if (still >= 12) { due(e.end); end(); }
      } else { lastCount = calls; still = 0; }
    }, 500);
    v.play().catch(fail);
  });
}
