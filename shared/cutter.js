// 1.1: "Cut parts out" on the export page of the 3D, Blocky and Cartoons tabs. A bar under the player
// shows the sound; drag across it (or use Start / End while the video plays) and cut the part out,
// or let it find the long pauses where a voice lags. The player skips the cut parts straight away;
// "Save the cut video" makes the new MP4 in this browser from the finished one (decoded and
// re-encoded with WebCodecs), so nothing is drawn again and nothing is uploaded. Cuts can be marked
// while the export is still running: the sound is ready before the pictures are.

import { normalizeCuts, removed, mapTime, cutAt, cutChannels, findPauses, clock } from './cuts.js';
import { readVideoTrack } from './mp4read.js';
import { mp4Writer, canEncode } from './encode.js';

const tick = () => new Promise(r => setTimeout(r, 0));

function channelsOf(buf) { return Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)); }

function bufferFrom(channels, sampleRate) {
  const b = new AudioBuffer({ length: Math.max(1, channels[0].length), numberOfChannels: channels.length, sampleRate });
  channels.forEach((ch, c) => b.copyToChannel(ch, c));
  return b;
}

async function decodeSound(blob) {
  const ctx = new OfflineAudioContext(2, 1, 48000);
  return ctx.decodeAudioData(await blob.arrayBuffer());
}

// The finished MP4 with the cuts taken out -> Blob. audio is the video's own soundtrack (an
// AudioBuffer) when the tab still has it; otherwise the MP4's sound is decoded.
export async function cutVideo(blob, cuts, { audio = null, onProgress, signal } = {}) {
  if (!canEncode() || typeof VideoDecoder === 'undefined') throw new Error('This browser cannot cut videos. Please use Chrome or Edge on a computer.');
  const track = await readVideoTrack(blob);
  const fps = Math.abs(track.fps - Math.round(track.fps)) < 0.02 ? Math.round(track.fps) : track.fps;
  const list = normalizeCuts(cuts, track.duration, fps);
  const sound = audio || await decodeSound(blob).catch(() => null);
  const newSound = sound ? bufferFrom(cutChannels(channelsOf(sound), sound.sampleRate, list), sound.sampleRate) : null;
  const videoBytes = track.samples.reduce((s, x) => s + x.size, 0);
  const bitrate = Math.max(2_000_000, Math.min(20_000_000, Math.round(videoBytes * 8 / Math.max(1, track.duration) * 1.15)));
  const config = { codec: track.codec, codedWidth: track.codedWidth, codedHeight: track.codedHeight, ...(track.description ? { description: track.description } : {}) };
  const ok = await VideoDecoder.isConfigSupported(config).catch(() => ({ supported: false }));
  if (!ok.supported) throw new Error(`This browser cannot read this video (${track.codec}).`);
  const out = await mp4Writer({ width: track.codedWidth, height: track.codedHeight, fps, audio: newSound, bitrate });
  const ready = [];
  let failure = null, done = 0;
  const dec = new VideoDecoder({ output: (f) => ready.push(f), error: (e) => { failure = e; } });
  dec.configure(config);
  const drain = async () => {
    while (ready.length) {
      const f = ready.shift();
      try {
        const t = mapTime(f.timestamp / 1e6, list);
        if (t != null) await out.addFrame(f, t);
      } finally { f.close(); }
      onProgress?.(Math.min(0.99, ++done / track.samples.length));
    }
  };
  try {
    const S = track.samples;
    for (let i = 0; i < S.length;) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      // Read a run of samples (up to ~8 MB of the file) at once.
      let j = i + 1, hi = S[i].offset + S[i].size;
      const lo = S[i].offset;
      while (j < S.length && S[j].offset >= lo && Math.max(hi, S[j].offset + S[j].size) - lo < 8 << 20) { hi = Math.max(hi, S[j].offset + S[j].size); j++; }
      const buf = await blob.slice(lo, hi).arrayBuffer();
      for (let k = i; k < j; k++) {
        const s = S[k];
        dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round(s.time * 1e6), duration: Math.round(s.dur * 1e6), data: new Uint8Array(buf, s.offset - lo, s.size) }));
        if (failure || out.failure) throw failure || out.failure;
        while (dec.decodeQueueSize > 4 || ready.length > 4) { await drain(); if (dec.decodeQueueSize > 4) await tick(); }
      }
      i = j;
    }
    await dec.flush();
    await drain();
    if (failure) throw failure;
  } finally {
    ready.forEach(f => f.close());
    if (dec.state !== 'closed') dec.close();
  }
  const result = await out.finish();
  onProgress?.(1);
  return { blob: result, cuts: list, duration: track.duration - removed(list) };
}

// ---------------- the panel ----------------

const HTML = `
  <div class="cut-head">
    <p class="sect-title">✂️ Cut parts out</p>
    <span class="cut-sum fine" data-k="sum"></span>
  </div>
  <canvas class="cut-bar" data-k="bar" height="56" aria-label="The video's sound: drag across a part to select it"></canvas>
  <div class="cut-row">
    <button class="btn small ghost" type="button" data-k="start" title="Start the selection where the player is">⟦ Start here</button>
    <button class="btn small ghost" type="button" data-k="end" title="End the selection where the player is">End here ⟧</button>
    <button class="btn small" type="button" data-k="cut" disabled>✂️ Cut it out</button>
    <button class="btn small ghost" type="button" data-k="pauses" title="Mark every long pause in the voice">Find long pauses</button>
  </div>
  <div class="cut-chips" data-k="chips"></div>
  <div class="cut-row">
    <button class="btn small primary" type="button" data-k="save" disabled>Save the cut video</button>
    <button class="btn small ghost hidden" type="button" data-k="reset">Back to the full video</button>
  </div>
  <div class="progress hidden" data-k="prog"><div class="bar"><i data-k="progBar"></i></div></div>
  <p class="fine cut-help" data-k="help">Drag across the bar to pick a part (a voice that lags, a pause, a line you don't want), then cut it out. The player skips cut parts right away.</p>`;

// after: the element the panel goes after. player: the <video>. onSaved({ blob, url, cuts, mapTime })
// is called with each saved cut video, and onSaved(null) when the cuts are taken back.
export function attachCutter({ after, player, toast = () => {}, onSaved = () => {} }) {
  const el = document.createElement('div');
  el.className = 'cutter hidden';
  el.innerHTML = HTML;
  after.insertAdjacentElement('afterend', el);
  const $ = (k) => el.querySelector(`[data-k="${k}"]`);
  const bar = $('bar');
  const st = { audio: null, video: null, duration: 0, fps: 30, cuts: [], sel: null, peaks: null, saved: null, savedKey: '', busy: false, abort: null };

  const key = () => JSON.stringify(st.cuts);
  const visible = () => !el.classList.contains('hidden');

  function peaksOf(buf) {
    const N = 1200, ch = channelsOf(buf), step = Math.max(1, Math.floor(buf.length / N)), out = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let m = 0;
      for (const c of ch) for (let k = i * step, e = Math.min(buf.length, k + step); k < e; k += 4) { const v = Math.abs(c[k]); if (v > m) m = v; }
      out[i] = m;
    }
    return out;
  }

  function draw() {
    if (!visible()) return;
    const dpr = window.devicePixelRatio || 1, w = Math.max(10, bar.clientWidth), h = 56;
    if (bar.width !== Math.round(w * dpr)) { bar.width = Math.round(w * dpr); bar.height = Math.round(h * dpr); }
    const g = bar.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(el);
    const ink = css.getPropertyValue('--muted').trim() || '#888', accent = css.getPropertyValue('--accent').trim() || '#1F5FE0';
    g.clearRect(0, 0, w, h);
    const D = st.duration || 1, x = (t) => t / D * w;
    if (st.peaks) {
      g.fillStyle = ink;
      const P = st.peaks, n = P.length;
      for (let px = 0; px < w; px++) {
        const v = P[Math.min(n - 1, Math.floor(px / w * n))], hh = Math.max(1, Math.min(1, v * 1.6) * (h - 8));
        g.fillRect(px, (h - hh) / 2, 1, hh);
      }
    }
    for (const c of st.cuts) {
      g.fillStyle = 'rgba(229,56,59,0.32)'; g.fillRect(x(c.a), 0, Math.max(2, x(c.b) - x(c.a)), h);
      g.strokeStyle = 'rgba(229,56,59,0.9)'; g.lineWidth = 1; g.strokeRect(x(c.a) + 0.5, 0.5, Math.max(1, x(c.b) - x(c.a) - 1), h - 1);
    }
    if (st.sel) {
      const a = Math.min(st.sel.a, st.sel.b), b = Math.max(st.sel.a, st.sel.b);
      g.globalAlpha = 0.25; g.fillStyle = accent; g.fillRect(x(a), 0, Math.max(2, x(b) - x(a)), h); g.globalAlpha = 1;
      g.fillStyle = accent; g.fillRect(x(a) - 1, 0, 2, h); g.fillRect(x(b) - 1, 0, 2, h);
    }
    if (st.video && player.duration) { g.fillStyle = '#E5383B'; g.fillRect(x(player.currentTime) - 1, 0, 2, h); }
  }

  function render() {
    const gone = removed(st.cuts), changed = st.saved && key() !== st.savedKey;
    $('sum').textContent = st.cuts.length
      ? `${st.cuts.length} cut${st.cuts.length > 1 ? 's' : ''} · ${gone.toFixed(1)} s out · new length ${clock(st.duration - gone)}`
      : st.duration ? `Length ${clock(st.duration)}` : '';
    $('cut').disabled = !st.sel || Math.abs(st.sel.b - st.sel.a) < 1 / st.fps || st.busy;
    $('start').disabled = $('end').disabled = !st.video || st.busy;
    $('pauses').disabled = !st.audio || st.busy;
    $('save').disabled = !st.video || st.busy || (!st.cuts.length && !st.saved) || (st.saved && !changed);
    $('save').textContent = !st.video ? 'Save the cut video (when the export is done)' : st.saved && changed ? 'Save the cut video again' : st.saved ? 'Saved ✓' : 'Save the cut video';
    $('reset').classList.toggle('hidden', !st.saved || st.busy);
    const chips = $('chips');
    chips.replaceChildren(...st.cuts.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cut-chip'; b.disabled = st.busy;
      b.title = 'Put this part back';
      b.textContent = `${clock(c.a)} – ${clock(c.b)} ✕`;
      b.addEventListener('click', () => { st.cuts.splice(i, 1); render(); });
      return b;
    }));
    draw();
  }

  // ---- the bar: drag selects, a click moves the player (or listens there while exporting)
  let drag = null;
  const timeAt = (ev) => { const r = bar.getBoundingClientRect(); return r.width > 0 ? Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * st.duration : 0; };
  bar.addEventListener('pointerdown', (ev) => {
    if (!st.duration || st.busy) return;
    try { bar.setPointerCapture(ev.pointerId); } catch { /* a synthetic pointer */ }
    drag = { x: ev.clientX, t: timeAt(ev) };
  });
  bar.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (Math.abs(ev.clientX - drag.x) > 4) { st.sel = { a: drag.t, b: timeAt(ev) }; render(); }
  });
  bar.addEventListener('pointerup', (ev) => {
    if (!drag) return;
    const click = Math.abs(ev.clientX - drag.x) <= 4, t = timeAt(ev);
    drag = null;
    if (click) {
      st.sel = null;
      if (st.video) { player.currentTime = Math.min(t, Math.max(0, st.duration - 0.05)); } else listen(t);
    } else {
      const a = Math.min(st.sel.a, st.sel.b), b = Math.max(st.sel.a, st.sel.b);
      st.sel = { a, b };
      if (st.video) { player.pause(); player.currentTime = a; }
    }
    render();
  });

  // While the export runs there is no video yet: a click plays two seconds of the sound from there.
  let ctx = null, src = null;
  function listen(t) {
    if (!st.audio) return;
    try {
      ctx ||= new AudioContext();
      src?.stop();
      src = ctx.createBufferSource(); src.buffer = st.audio; src.connect(ctx.destination);
      src.start(0, t, 2);
    } catch { /* no sound device */ }
  }

  $('start').addEventListener('click', () => { const t = player.currentTime; st.sel = { a: t, b: st.sel && st.sel.b > t ? st.sel.b : Math.min(st.duration, t + 1) }; render(); });
  $('end').addEventListener('click', () => { const t = player.currentTime; st.sel = { a: st.sel && st.sel.a < t ? st.sel.a : Math.max(0, t - 1), b: t }; render(); });
  $('cut').addEventListener('click', () => {
    if (!st.sel) return;
    const before = st.cuts.length;
    st.cuts = normalizeCuts([...st.cuts, st.sel], st.duration, st.fps);
    st.sel = null;
    if (st.cuts.length === before && !removed(st.cuts)) toast('That would cut the whole video.', true);
    render();
  });
  $('pauses').addEventListener('click', () => {
    if (!st.audio) return;
    const found = findPauses(channelsOf(st.audio), st.audio.sampleRate, { from: 0.9 });
    if (!found.length) { toast('No long pauses found: the voice keeps going.'); return; }
    st.cuts = normalizeCuts([...st.cuts, ...found], st.duration, st.fps);
    render();
    toast(`Marked ${found.length} long pause${found.length > 1 ? 's' : ''} in red. Click a chip below the bar to put one back.`);
  });
  $('save').addEventListener('click', async () => {
    if (!st.video || st.busy) return;
    if (!st.cuts.length) { useFull(); return; }
    st.busy = true; render();
    $('prog').classList.remove('hidden'); $('progBar').style.width = '0%';
    st.abort = new AbortController();
    try {
      const r = await cutVideo(st.video.blob, st.cuts, { audio: st.audio, signal: st.abort.signal, onProgress: (f) => { $('progBar').style.width = `${Math.round(f * 100)}%`; } });
      if (st.saved?.url) URL.revokeObjectURL(st.saved.url);
      const cuts = r.cuts.slice();
      st.saved = { blob: r.blob, url: URL.createObjectURL(r.blob), cuts, duration: r.duration, mapTime: (t) => mapTime(t, cuts) };
      st.savedKey = key();
      onSaved(st.saved);
      toast(`Cut video saved: ${clock(r.duration)} long. Hit Download.`);
    } catch (e) {
      if (e?.name !== 'AbortError') toast(`Could not cut the video: ${e.message}`, true);
    } finally {
      st.busy = false; st.abort = null;
      $('prog').classList.add('hidden');
      render();
    }
  });
  function useFull() {
    if (st.saved?.url) URL.revokeObjectURL(st.saved.url);
    st.saved = null; st.savedKey = '';
    onSaved(null);
    render();
  }
  $('reset').addEventListener('click', () => { st.cuts = []; st.sel = null; useFull(); toast('Back to the full video.'); });

  // The player skips the cut parts while it plays, so what you see is what you will save.
  let watching = false;
  const watch = () => {
    if (!st.video || player.paused) { watching = false; draw(); return; }
    const c = cutAt(player.currentTime, st.cuts);
    if (c) player.currentTime = Math.min(c.b, Math.max(0, st.duration - 0.02));
    draw();
    requestAnimationFrame(watch);
  };
  player.addEventListener('play', () => { if (!watching) { watching = true; requestAnimationFrame(watch); } });
  player.addEventListener('seeked', draw);
  window.addEventListener('resize', draw);

  return {
    // The sound is ready (the export is starting): show the bar, cuts can be marked already.
    prepare(audio, fps = 30) {
      st.abort?.abort();
      if (st.saved?.url) URL.revokeObjectURL(st.saved.url);
      Object.assign(st, { audio, video: null, duration: audio?.duration || 0, fps, cuts: [], sel: null, saved: null, savedKey: '', peaks: audio ? peaksOf(audio) : null });
      el.classList.toggle('hidden', !audio || !canEncode());
      render();
    },
    // The video is made.
    ready(video, fps) {
      if (!canEncode() || video?.ext !== 'mp4') { el.classList.add('hidden'); return; }
      st.video = video; if (fps) st.fps = fps;
      if (!st.audio) { st.duration = video.duration || player.duration || 0; decodeSound(video.blob).then(a => { st.audio = a; st.duration = a.duration; st.peaks = peaksOf(a); render(); }).catch(() => {}); }
      st.cuts = normalizeCuts(st.cuts, st.duration, st.fps);
      el.classList.remove('hidden');
      render();
    },
    hide() { st.abort?.abort(); el.classList.add('hidden'); },
    get saved() { return st.saved; },
    get cuts() { return st.cuts.slice(); },
    el,
  };
}
