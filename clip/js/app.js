// Loomy Clips: a stream or long video in, short vertical clips out.
// 1. ffmpeg (in the browser) reads only the soundtrack.  2. Groq Whisper (via the Loomy server) times
// every word.  3. AI picks the strongest moments with a heading each.  4. Each clip is framed to 9:16,
// captioned and exported as MP4 with the original sound. Nothing is posted anywhere.

import { getFFmpeg, mountFile, run, probeDuration, removeFiles } from './ff.js';
import { extractAudio, transcribePieces } from './transcribe.js';
import { findMoments } from './moments.js';
import { trackSpeaker } from './track.js';
import { ClipPainter, exportClip, canExport } from './render.js';

const $ = (s, r = document) => r.querySelector(s);
// Working videos sit on the page, invisibly: browsers can stop handing out frames for a video
// that is not on the page, which would stall a clip.
function attach(v) {
  v.setAttribute('aria-hidden', 'true');
  v.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;opacity:0.01;pointer-events:none;z-index:-1';
  if (!v.isConnected) document.body.append(v);
  return v;
}
const state = { file: null, duration: 0, transcript: null, clips: [], video: null, playable: true, running: false, abort: null };

// ---------- small UI helpers ----------
function log(msg) {
  const el = $('#log');
  const line = document.createElement('div');
  line.textContent = msg;
  el.append(line);
  while (el.childElementCount > 60) el.firstElementChild.remove();
  el.scrollTop = el.scrollHeight;
}
function step(name, status, detail = '') {
  const li = document.querySelector(`#steps li[data-step="${name}"]`);
  if (!li) return;
  li.className = status;
  li.querySelector('.d').textContent = detail;
}
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('bad', bad); t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 5000);
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const pct = (f) => `${Math.round(f * 100)}%`;

// ---------- access (view-only code) ----------
let viewOnly = false;
fetch('/__access/status', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)).then((s) => {
  viewOnly = s?.role === 'view';
  $('#viewBanner').hidden = !viewOnly;
  updateGo();
}).catch(() => {});

// ---------- choosing a video ----------
function updateGo() {
  $('#btnGo').disabled = !state.file || state.running || viewOnly;
  $('#btnAgain').hidden = !state.transcript || state.running;
  $('#btnStop').hidden = !state.running;
}

async function pickFile(file) {
  if (!file) return;
  if (!/^video\//.test(file.type) && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) { toast('That is not a video file.', true); return; }
  state.file = file; state.transcript = null; state.clips = [];
  $('#results').replaceChildren();
  $('#fileName').textContent = file.name;
  $('#fileMeta').textContent = `${(file.size / 1e6).toFixed(file.size > 1e9 ? 0 : 1)} MB`;
  $('#drop').classList.add('has-file');
  const v = attach(state.video || document.createElement('video'));
  state.video = v;
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  if (v.src) URL.revokeObjectURL(v.src);
  v.src = URL.createObjectURL(file);
  const ok = await new Promise((resolve) => {
    const done = (r) => { v.onloadeddata = v.onerror = null; resolve(r); };
    v.onloadeddata = () => done(v.videoWidth > 0);
    v.onerror = () => done(false);
    setTimeout(() => done(v.readyState >= 2 && v.videoWidth > 0), 10000);
  });
  // Knowing the size is not enough: some files report it but the browser cannot decode a frame
  // (HEVC from phones, some MKV). Play a moment and wait for a real frame.
  const decodes = ok && await new Promise((resolve) => {
    let settled = false;
    const end = (r) => { if (settled) return; settled = true; clearTimeout(t); v.pause(); resolve(r); };
    const t = setTimeout(() => end(false), 6000);
    v.requestVideoFrameCallback(() => end(true));
    v.play().catch(() => end(false));
  });
  if (decodes) { v.pause(); v.currentTime = 0; }
  state.playable = !!decodes;
  state.duration = ok && Number.isFinite(v.duration) ? v.duration : 0;
  const prev = $('#preview');
  prev.src = v.src; prev.hidden = !state.playable;
  $('#fileMeta').textContent = `${$('#fileMeta').textContent}${state.duration ? ` · ${mmss(state.duration)}` : ''}${state.playable ? ` · ${v.videoWidth}×${v.videoHeight}` : ' · this browser cannot play it directly, so each clip will be converted'}`;
  updateGo();
}

$('#fileInput').addEventListener('change', (e) => pickFile(e.target.files[0]));
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));

function options() {
  const [minLen, maxLen] = $('#length').value.split('-').map(Number);
  return {
    count: Number($('#count').value), minLen, maxLen,
    framing: $('#framing').value, captions: $('#optCaptions').checked, heading: $('#optHeading').checked, emoji: $('#optEmoji').checked,
    language: $('#language').value,
  };
}

// ---------- the run ----------
async function go({ reuseTranscript = false } = {}) {
  if (!state.file || state.running) return;
  if (!canExport()) { toast('Making clips needs Chrome or Edge on a computer.', true); return; }
  state.running = true; updateGo();
  state.abort = new AbortController();
  const signal = state.abort.signal;
  const o = options();
  $('#results').replaceChildren();
  $('#log').replaceChildren();
  try {
    const ff = await getFFmpeg((f) => step('tools', 'active', `Downloading (once) ${pct(f)}`));
    step('tools', 'done', 'Ready');
    const path = await mountFile(ff, state.file);
    if (!state.duration) state.duration = await probeDuration(ff, path);

    if (!reuseTranscript || !state.transcript) {
      step('audio', 'active', 'Reading the soundtrack…');
      const pieces = await extractAudio(state.file, state.duration, { log, onProgress: (p) => p.stage === 'audio' && step('audio', 'active', pct(p.fraction)) });
      step('audio', 'done', `${pieces.length} part${pieces.length > 1 ? 's' : ''}`);
      step('words', 'active', 'Sending to Groq Whisper…');
      state.transcript = await transcribePieces(pieces, { language: o.language, log, signal, onProgress: (f) => step('words', 'active', pct(f)) });
      step('words', 'done', `${state.transcript.words.length.toLocaleString()} words${state.transcript.language ? ` · ${state.transcript.language}` : ''}`);
    } else {
      step('audio', 'done', 'Already read'); step('words', 'done', 'Already transcribed');
    }

    step('moments', 'active', 'Reading the whole video…');
    state.clips = await findMoments(state.transcript, { ...o, duration: state.duration, log, signal, onProgress: (f) => step('moments', 'active', pct(f)) });
    step('moments', 'done', `${state.clips.length} clips found`);

    const cards = state.clips.map((c, i) => makeCard(c, i));
    $('#results').replaceChildren(...cards.map(c => c.el));
    await document.fonts.load('900 92px Montserrat').catch(() => {});
    step('clips', 'active', `0 of ${state.clips.length}`);
    for (let i = 0; i < state.clips.length; i++) {
      if (signal.aborted) break;
      await renderCard(cards[i], o, signal);
      step('clips', 'active', `${i + 1} of ${state.clips.length}`);
    }
    step('clips', 'done', `${state.clips.length} ready`);
    toast('Your clips are ready.');
  } catch (e) {
    if (e?.name === 'AbortError') { toast('Stopped.'); }
    else {
      log(`Problem: ${e.message}`);
      toast(e.message, true);
      for (const li of document.querySelectorAll('#steps li.active')) { li.className = 'fail'; li.querySelector('.d').textContent = 'Stopped'; }
    }
  } finally {
    state.running = false; updateGo();
  }
}

// A clip's own source: the original file when the browser can play it, or a converted copy.
// A fresh player on the same source, so tracking and exporting never share (or break) one.
async function freshPlayer(src) {
  const v = attach(document.createElement('video'));
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = src;
  await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 15000); });
  return v;
}

async function sourceFor(clip, ff, path) {
  if (state.playable) return { src: state.video.src, off: 0, owned: false };
  const off = Math.max(0, clip.s - 0.5), len = clip.e - clip.s + 1;
  // Convert just this moment into a format this browser plays: H.264 where possible, else VP9.
  const h264 = !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"');
  const out = h264 ? 'cut.mp4' : 'cut.webm';
  log('Converting this moment so the browser can play it…');
  await run(ff, ['-hide_banner', '-ss', String(off), '-i', path, '-t', String(len), '-vf', "scale='min(1280,iw)':-2", '-an',
    ...(h264 ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20'] : ['-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '2M']), out]);
  const data = await ff.readFile(out);
  await removeFiles(ff, [out]);
  const v = attach(document.createElement('video'));
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = URL.createObjectURL(new Blob([data], { type: h264 ? 'video/mp4' : 'video/webm' }));
  await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 15000); });
  if (v.error) log(`The converted moment would not open (code ${v.error.code}).`);
  const src = v.src;
  v.remove();
  return { src, off, owned: true };
}

async function clipAudio(ff, path, clip) {
  // Streams come in at any level (a whisper-quiet mic, a blasting game): level each clip to the
  // loudness YouTube plays at (-14 LUFS, peaks under -1.5 dB). Plain copy if the filter is missing.
  const args = (af) => ['-hide_banner', '-ss', String(clip.s), '-i', path, '-t', String(clip.e - clip.s), '-vn', ...af, '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', 'clip.wav'];
  try { await run(ff, args(['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11'])); }
  catch { await run(ff, args([])); }
  const data = await ff.readFile('clip.wav');
  await removeFiles(ff, ['clip.wav']);
  const ctx = new OfflineAudioContext(2, 1, 48000);
  return ctx.decodeAudioData(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

async function renderCard(card, o, signal) {
  const clip = card.clip;
  card.setStatus('Framing…', 0);
  const ff = await getFFmpeg();
  const path = await mountFile(ff, state.file);
  const audio = await clipAudio(ff, path, clip);
  const { src, off, owned } = await sourceFor(clip, ff, path);
  const local = { ...clip, s: clip.s - off, e: clip.e - off, emoji: clip.emoji.map(x => ({ ...x, t: x.t - off })) };
  const words = state.transcript.words.map(w => ({ ...w, s: w.s - off, e: w.e - off }));
  let track = { mode: o.framing === 'crop' ? 'crop' : 'fit', at: () => 0.5 };
  if (o.framing === 'auto') {
    const tv = await freshPlayer(src);
    try { track = await trackSpeaker(tv, local.s, local.e, { log }); } finally { tv.remove(); }
  }
  const video = await freshPlayer(src);
  try {
    const painter = new ClipPainter(video, local, words, track, o);
    card.setStatus('Making the clip… keep this tab open', 0);
    const blob = await exportClip(painter, audio, { signal, onProgress: (f) => card.setStatus(`Making the clip… ${pct(f)}`, f) });
    card.done(blob);
  } finally {
    video.remove();
    if (owned) URL.revokeObjectURL(src);
  }
}

// ---------- result cards ----------
function makeCard(clip, i) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <div class="frame"><video playsinline controls hidden></video><div class="wait"><div class="bar"><i></i></div><span class="st">Waiting…</span></div></div>
    <div class="info">
      <div class="row"><span class="score"></span><span class="when"></span></div>
      <label class="head-edit"><span>Heading</span><input type="text" maxlength="70"></label>
      <p class="why"></p>
      <div class="btns"><a class="btn primary dl" hidden>Download MP4</a><button class="btn ghost redo" type="button" hidden>Re-make with this heading</button><button class="btn ghost copy" type="button">Copy heading</button></div>
    </div>`;
  el.querySelector('.score').textContent = `${clip.score}/10`;
  el.querySelector('.score').dataset.level = clip.score >= 8 ? 'hot' : clip.score >= 6 ? 'good' : 'ok';
  el.querySelector('.when').textContent = `${mmss(clip.s)}–${mmss(clip.e)} · ${Math.round(clip.e - clip.s)} s`;
  const input = el.querySelector('input');
  input.value = clip.heading;
  input.addEventListener('input', () => { clip.heading = input.value.trim(); el.querySelector('.redo').hidden = state.running || !el.querySelector('video').src; });
  el.querySelector('.why').textContent = clip.why;
  el.querySelector('.copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(clip.heading); toast('Heading copied.'); } catch { input.select(); }
  });
  const card = {
    el, clip,
    setStatus(text, f) { el.querySelector('.st').textContent = text; el.querySelector('.bar i').style.width = pct(f); },
    done(blob) {
      const v = el.querySelector('video');
      if (v.src) URL.revokeObjectURL(v.src);
      v.src = URL.createObjectURL(blob); v.hidden = false;
      el.querySelector('.wait').hidden = true;
      const a = el.querySelector('.dl');
      a.href = v.src; a.download = `clip-${i + 1}-${clip.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'loomy'}.mp4`; a.hidden = false;
      el.querySelector('.redo').hidden = true;
    },
  };
  el.querySelector('.redo').addEventListener('click', async () => {
    if (state.running) return;
    state.running = true; updateGo();
    el.querySelector('.wait').hidden = false; el.querySelector('video').hidden = true;
    try { await renderCard(card, options(), new AbortController().signal); } catch (e) { toast(e.message, true); }
    state.running = false; updateGo();
  });
  return card;
}

$('#btnGo').addEventListener('click', () => go());
$('#btnAgain').addEventListener('click', () => go({ reuseTranscript: true }));
$('#btnStop').addEventListener('click', () => state.abort?.abort());
window.addEventListener('beforeunload', (e) => { if (state.running) { e.preventDefault(); e.returnValue = ''; } });
updateGo();

// ---------- a pasted link ----------
// Share links become direct file links; the file streams through the Loomy server and is saved in
// the browser's private storage as it arrives, so even a long stream never has to fit in memory.
function directLink(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) { u.searchParams.delete('dl'); u.searchParams.set('dl', '1'); return u.toString(); }
  const drive = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/.exec(raw) || /[?&]id=([\w-]{10,})/.exec(/drive\.google\.com/.test(raw) ? raw : '');
  if (drive) return `https://drive.usercontent.google.com/download?id=${drive[1]}&export=download&confirm=t`;
  return u.toString();
}
const SITE_HELP = {
  youtube: 'YouTube does not let other sites download its videos. For your own video: <b>YouTube Studio → Content → ⋮ next to the video → Download</b>, then drop the file here.',
  twitch: 'Twitch does not let other sites download its videos. For your own stream: <b>Creator Dashboard → Content → Video Producer → ⋮ → Download</b>, then drop the file here.',
  tiktok: 'TikTok does not let other sites download its videos. Save your own video from the TikTok app (Share → Save video), then drop the file here.',
  other: 'That site does not let other sites download its videos. Download your video from the site first, then drop the file here.',
};
function note(html) { const n = $('#linkNote'); n.innerHTML = html; n.hidden = !html; }
$('#linkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.running) return;
  const raw = $('#linkInput').value;
  if (/youtu\.?be/i.test(raw)) { note(SITE_HELP.youtube); return; }
  if (/twitch\.tv/i.test(raw)) { note(SITE_HELP.twitch); return; }
  if (/tiktok\.com/i.test(raw)) { note(SITE_HELP.tiktok); return; }
  const url = directLink(raw);
  if (!url) { note('That does not look like a link.'); return; }
  note('');
  const btn = $('#btnLink'); btn.disabled = true; btn.textContent = 'Getting…';
  try {
    const res = await fetch('/api/fetchvideo', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    if (/json/.test(res.headers.get('Content-Type') || '')) {
      const j = await res.json();
      note(j.site ? SITE_HELP.other : (j.error || 'Could not get that video.'));
      return;
    }
    const total = Number(res.headers.get('Content-Length')) || 0;
    const name = decodeURIComponent(res.headers.get('X-Loomy-Name') || 'video.mp4').replace(/[\\/:*?"<>|]/g, '_');
    let file;
    try {
      // Stream to the browser's private disk storage (no memory limit), then open it as a File.
      const dir = await navigator.storage.getDirectory();
      const handle = await dir.getFileHandle(`clip-source-${Date.now()}`, { create: true });
      const w = await handle.createWritable();
      const reader = res.body.getReader();
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        await w.write(value); got += value.length;
        btn.textContent = total ? `Getting… ${Math.round(got / total * 100)}%` : `Getting… ${(got / 1e6).toFixed(0)} MB`;
      }
      await w.close();
      const f = await handle.getFile();
      file = new File([f], name, { type: f.type || 'video/mp4' });
    } catch {
      file = new File([await res.blob()], name, { type: 'video/mp4' });
    }
    if (file.size < 10000) { note('That link did not give a video file.'); return; }
    await pickFile(new File([file], /\.\w{2,4}$/.test(name) ? name : `${name}.mp4`, { type: file.type && file.type !== 'application/octet-stream' ? file.type : 'video/mp4' }));
  } catch (err) {
    note(`Could not get that video (${err.message}).`);
  } finally {
    btn.disabled = false; btn.textContent = 'Get video';
  }
});
