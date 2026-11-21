// Draws and exports one vertical clip (1080x1920): the source video framed to 9:16, a heading on top,
// big word-by-word captions with the spoken word and key words highlighted, and emoji pops.
// The source plays once at normal speed while each of its frames is drawn and encoded, so a clip
// takes about as long to make as it lasts, with frame-exact timing and the original audio.

import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.mjs';

export const W = 1080, H = 1920;
const FONT = '"Montserrat", "Arial Black", Impact, system-ui, sans-serif';

// ---------- captions ----------
export function captionChunks(words, s, e) {
  const ws = words.filter(w => w.s >= s - 0.05 && w.s < e);
  const out = [];
  let cur = [];
  const flush = () => { if (cur.length) out.push({ a: cur[0].s, words: cur }); cur = []; };
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    if (cur.length && (cur.length >= 3 || chars > 17 || (prev && w.s - prev.e > 0.45) || (prev && /[.!?,;:]$/.test(prev.w)))) flush();
    cur.push(w);
  }
  flush();
  for (let i = 0; i < out.length; i++) {
    const last = out[i].words[out[i].words.length - 1];
    out[i].b = Math.min(i + 1 < out.length ? out[i + 1].a : e, last.e + 0.6);
  }
  return out;
}

const clean = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function wrap(g, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export class ClipPainter {
  constructor(video, clip, words, track, opts = {}) {
    this.video = video; this.clip = clip; this.track = track; this.opts = opts;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.small = document.createElement('canvas'); this.small.width = 54; this.small.height = 96;
    this.sg = this.small.getContext('2d');
    this.chunks = opts.captions === false ? [] : captionChunks(words, clip.s, clip.e);
    this.hi = new Set((clip.highlight || []).map(clean));
    this.mode = opts.framing === 'fit' ? 'fit' : opts.framing === 'crop' ? 'crop' : track.mode;
    this.log = null; // a RenderLog while exporting
  }

  layout() {
    const v = this.video, vw = v.videoWidth || 16, vh = v.videoHeight || 9;
    const vertical = vw / vh < 0.75;
    if (this.mode === 'crop' || vertical) return { kind: 'crop', headY: 210, capY: Math.round(H * 0.66), vw, vh };
    const fh = Math.round(W * vh / vw), top = Math.round((H - fh) / 2) - 40;
    return { kind: 'fit', top, fh, headY: Math.max(150, top - 230), capY: Math.min(H - 260, top + fh + 170), vw, vh };
  }

  drawVideo(t, L) {
    const { g, video: v } = this;
    if (L.kind === 'crop') {
      const cropW = Math.min(L.vw, L.vh * W / H), cropH = cropW * H / W;
      const cx = (this.mode === 'crop' ? this.track.at(t) : 0.5) * L.vw;
      const sx = Math.max(0, Math.min(L.vw - cropW, cx - cropW / 2)), sy = Math.max(0, (L.vh - cropH) / 2);
      g.drawImage(v, sx, sy, cropW, cropH, 0, 0, W, H);
      return;
    }
    // Blurred fill: a tiny copy scaled up is a cheap, smooth blur.
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    this.sg.drawImage(v, (L.vw - L.vh * 54 / 96) / 2, 0, L.vh * 54 / 96, L.vh, 0, 0, 54, 96);
    g.drawImage(this.small, 0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(0, 0, W, H);
    g.save();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40;
    g.drawImage(v, 0, L.top, W, L.fh);
    g.restore();
  }

  drawHeading(t, L) {
    const text = (this.clip.heading || '').trim();
    if (!text || this.opts.heading === false) return;
    const { g } = this;
    const k = ease((t - this.clip.s) / 0.35);
    g.save();
    let size = 74;
    g.font = `900 ${size}px ${FONT}`;
    let lines = wrap(g, text, 900);
    if (lines.length > 2) { size = 60; g.font = `900 ${size}px ${FONT}`; lines = wrap(g, text, 920).slice(0, 3); }
    // Never leave an emoji or a tiny word alone on the last line: pull it up and shrink to fit.
    while (lines.length > 1 && [...lines[lines.length - 1]].length <= 4 && size > 44) {
      const merged = [...lines.slice(0, -2), `${lines[lines.length - 2]} ${lines[lines.length - 1]}`];
      size -= 4; g.font = `900 ${size}px ${FONT}`;
      if (g.measureText(merged[merged.length - 1]).width <= 920) { lines = merged; break; }
    }
    const lh = size * 1.16, padX = 44, padY = 28;
    const bw = Math.min(980, Math.max(...lines.map(l => g.measureText(l).width)) + padX * 2);
    const bh = lines.length * lh + padY * 2 - (lh - size);
    const x = (W - bw) / 2, y = L.headY - (1 - k) * 30;
    g.globalAlpha = k;
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
    g.fillStyle = '#FFFFFF'; roundRect(g, x, y, bw, bh, 26); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#111111'; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, W / 2, y + padY + i * lh));
    g.restore();
  }

  drawCaption(t, L) {
    const c = this.chunks.find(ch => t >= ch.a && t < ch.b);
    if (!c) return;
    const { g } = this;
    const k = ease((t - c.a) / 0.09);
    const words = c.words.map(w => w.w.replace(/^[^\p{L}\p{N}$£€]+|[^\p{L}\p{N}%!?']+$/gu, '').toUpperCase());
    let size = 92;
    g.font = `900 ${size}px ${FONT}`;
    const space = () => g.measureText(' ').width;
    let width = words.reduce((n, w) => n + g.measureText(w).width, 0) + space() * (words.length - 1);
    if (width > 960) { size = Math.floor(size * 960 / width); g.font = `900 ${size}px ${FONT}`; width = words.reduce((n, w) => n + g.measureText(w).width, 0) + space() * (words.length - 1); }
    g.save();
    g.translate(W / 2, L.capY);
    const sc = 0.82 + 0.18 * k;
    g.scale(sc, sc);
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round'; g.miterLimit = 2;
    let x = -width / 2;
    words.forEach((w, i) => {
      const src = c.words[i];
      const speaking = t >= src.s && t < Math.max(src.e, src.s + 0.12);
      const key = this.hi.has(clean(src.w));
      g.lineWidth = size * 0.2; g.strokeStyle = '#000000';
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
      g.strokeText(w, x, 0);
      g.shadowColor = 'transparent';
      g.fillStyle = key ? '#FF3B30' : speaking ? '#FFE14D' : '#FFFFFF';
      g.fillText(w, x, 0);
      x += g.measureText(w).width + space();
    });
    g.restore();
  }

  drawEmoji(t, L) {
    if (this.opts.emoji === false) return;
    const { g } = this;
    for (const [i, em] of (this.clip.emoji || []).entries()) {
      const d = t - em.t;
      if (d < 0 || d > 1.3) continue;
      const pop = d < 0.22 ? ease(d / 0.22) * 1.18 : d < 0.34 ? 1.18 - 0.18 * ((d - 0.22) / 0.12) : 1;
      const fade = d > 1.05 ? 1 - (d - 1.05) / 0.25 : 1;
      g.save();
      g.globalAlpha = Math.max(0, fade);
      g.translate(i % 2 ? W * 0.24 : W * 0.76, L.capY - 300);
      g.rotate((i % 2 ? -1 : 1) * 0.12);
      g.scale(pop, pop);
      g.font = '210px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(em.e, 0, 0);
      g.restore();
    }
  }

  draw(t) {
    const L = this.layout();
    this.g.fillStyle = '#000'; this.g.fillRect(0, 0, W, H);
    this.drawVideo(t, L);
    this.drawHeading(t, L);
    const lt = t - this.clip.s;
    if (this.log) this.log.caption(lt, this.g, H, () => this.drawCaption(t, L));
    else this.drawCaption(t, L);
    this.drawEmoji(t, L);
    if (this.log) {
      const pops = this.opts.emoji === false ? [] : (this.clip.emoji || []).filter(em => t - em.t >= 0 && t - em.t <= 1.3);
      this.log.shot(lt, { scene: 0, source: 'clip', framing: L.kind === 'crop' ? 'medium' : 'wide', characterIds: [], world: '', props: pops.map(em => ({ kind: `emoji:${em.e}`, triggerWord: '' })), glow: false, picturePrompt: '', seed: 0 });
    }
  }
}

// ---------- export ----------
async function videoConfig(fps) {
  const bitrate = 10_000_000;
  for (const accel of ['prefer-hardware', 'no-preference']) {
    for (const [mux, codec] of [['avc', 'avc1.640034'], ['avc', 'avc1.640028'], ['avc', 'avc1.4D0034'], ['avc', 'avc1.42003E'], ['vp9', 'vp09.00.40.08'], ['av1', 'av01.0.08M.08']]) {
      const config = { codec, width: W, height: H, bitrate, framerate: fps, hardwareAcceleration: accel, latencyMode: 'quality' };
      if (mux === 'avc') config.avc = { format: 'avc' };
      try { const r = await VideoEncoder.isConfigSupported(config); if (r.supported) return { mux, config: r.config || config }; } catch { /* next */ }
    }
  }
  return null;
}
async function audioConfig(sampleRate, ch) {
  for (const [mux, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const config = { codec, sampleRate, numberOfChannels: ch, bitrate: 160000 };
    try { const r = await AudioEncoder.isConfigSupported(config); if (r.supported) return { mux, config: r.config || config }; } catch { /* next */ }
  }
  return null;
}

export function canExport() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

function seek(video, t) {
  return new Promise((resolve) => {
    const done = () => { video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done);
    video.currentTime = t;
    setTimeout(done, 5000);
  });
}

// painter: a ClipPainter. audio: AudioBuffer of exactly the clip's span. Returns an MP4 Blob.
export async function exportClip(painter, audio, { onProgress, signal } = {}) {
  const { video, clip } = painter;
  const fps = 30;
  const v = await videoConfig(fps), a = await audioConfig(audio.sampleRate, audio.numberOfChannels);
  if (!v || !a) throw new Error('This browser cannot encode video. Please use Chrome or Edge on a computer.');
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: v.mux, width: W, height: H, frameRate: fps },
    audio: { codec: a.mux, sampleRate: audio.sampleRate, numberOfChannels: audio.numberOfChannels },
    fastStart: 'in-memory', firstTimestampBehavior: 'offset',
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failure = e; } });
  venc.configure(v.config);
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failure = e; } });
  aenc.configure(a.config);
  const ch = audio.numberOfChannels, sr = audio.sampleRate, block = Math.floor(sr / 2);
  const chans = Array.from({ length: ch }, (_, c) => audio.getChannelData(c));
  for (let off = 0; off < audio.length; off += block) {
    const n = Math.min(block, audio.length - off);
    const data = new Float32Array(n * ch);
    for (let c = 0; c < ch; c++) data.set(chans[c].subarray(off, off + n), c * n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(off / sr * 1e6), data });
    aenc.encode(ad); ad.close();
  }

  const dur = clip.e - clip.s;
  let lastTs = -1, frames = 0;
  const put = (t) => {
    const ts = Math.max(lastTs + 1000, Math.round((t - clip.s) * 1e6));
    painter.draw(t);
    const frame = new VideoFrame(painter.canvas, { timestamp: ts });
    venc.encode(frame, { keyFrame: frames % (fps * 2) === 0 });
    frame.close();
    lastTs = ts; frames++;
  };
  video.muted = true;
  video.pause();
  video.playbackRate = 1;
  await seek(video, clip.s);
  put(clip.s);
  await new Promise((resolve, reject) => {
    let stopped = false;
    const finish = () => { if (stopped) return; stopped = true; video.pause(); resolve(); };
    // Every frame is drawn as the video plays. A busy computer misses frames (the picture would
    // stutter), so when frames are skipped the video plays slower until each one is caught: the
    // sound is encoded separately, so the speed of playback never shows in the clip. A 60 fps
    // source is taken at a smooth 30.
    let lastT = clip.s, lastPresented = -1, missed = 0, seen = 0, nextT = clip.s + 1 / fps * 0.5;
    const step = (now, meta) => {
      if (stopped) return;
      if (signal?.aborted) { stopped = true; video.pause(); reject(new DOMException('Cancelled', 'AbortError')); return; }
      if (failure) { stopped = true; video.pause(); reject(failure); return; }
      const t = meta.mediaTime;
      if (t >= clip.e) { finish(); return; }
      if (lastPresented >= 0 && meta.presentedFrames - lastPresented > 1 && t - lastT > 1.4 / fps) missed += meta.presentedFrames - lastPresented - 1;
      lastPresented = meta.presentedFrames; lastT = t; seen++;
      if (seen >= 20) {
        if (missed > seen * 0.08 && video.playbackRate > 0.26) video.playbackRate = Math.max(0.25, video.playbackRate * 0.6);
        missed = 0; seen = 0;
      }
      if (t > clip.s && t >= nextT) { put(t); nextT = Math.max(nextT + 1 / fps, t + 0.5 / fps); }
      onProgress?.(Math.min(1, (t - clip.s) / dur));
      video.requestVideoFrameCallback(step);
    };
    video.requestVideoFrameCallback(step);
    video.addEventListener('ended', finish, { once: true });
    // Safety nets: stop once playback passes the end, and never wait forever on a stalled video.
    // A stall first gets a nudge (play again); if nothing moves for 12 s, the clip ends where it got to.
    let lastFrames = frames, still = 0;
    const guard = setInterval(() => {
      if (stopped) { clearInterval(guard); return; }
      if (video.currentTime >= clip.e + 0.5 || video.ended) { clearInterval(guard); finish(); return; }
      if (frames === lastFrames) {
        still += 0.5;
        if (still === 3) video.play().catch(() => {});
        if (still >= 12) {
          clearInterval(guard);
          if (frames > fps) finish();
          else { stopped = true; video.pause(); reject(new Error('This part of the video would not play. Try another clip or a different file.')); }
        }
      } else { lastFrames = frames; still = 0; }
    }, 500);
    video.play().catch(reject);
  });
  await venc.flush(); await aenc.flush();
  if (failure) throw failure;
  muxer.finalize();
  venc.close(); aenc.close();
  onProgress?.(1);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
