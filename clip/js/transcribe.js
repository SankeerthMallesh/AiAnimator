// Audio -> timed words. ffmpeg cuts the soundtrack into 10-minute pieces of small 16 kHz mono MP3,
// and the Loomy server sends each to Groq Whisper, which returns every word with its time.

import { getFFmpeg, mountFile, run, removeFiles } from './ff.js';

const PIECE = 600; // seconds per piece

export async function extractAudio(file, duration, { log, onProgress } = {}) {
  const ff = await getFFmpeg((f) => onProgress?.({ stage: 'tools', fraction: f }));
  const path = await mountFile(ff, file);
  log?.('Reading the soundtrack…');
  await run(ff, ['-hide_banner', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '32k',
    '-f', 'segment', '-segment_time', String(PIECE), '-reset_timestamps', '1', 'aud%03d.mp3'],
  { onTime: (t) => onProgress?.({ stage: 'audio', fraction: duration ? Math.min(1, t / duration) : 0 }) });
  const names = (await ff.listDir('/')).map(e => e.name).filter(n => /^aud\d{3}\.mp3$/.test(n)).sort();
  const pieces = [];
  for (const n of names) {
    const data = await ff.readFile(n);
    pieces.push(new Blob([data], { type: 'audio/mpeg' }));
  }
  await removeFiles(ff, names);
  return pieces;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendPiece(blob, i, { language, log, signal }) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const form = new FormData();
    form.append('file', blob, `piece${i}.mp3`);
    if (language) form.append('language', language);
    const res = await fetch('/api/transcribe', { method: 'POST', body: form, credentials: 'same-origin', signal });
    const j = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (j.ok) return j;
    if (j.viewOnly) throw new Error(j.error);
    if (j.limited && attempt < 5) {
      // Groq's free plan allows about two hours of audio per hour; wait as it asks.
      const m = /try again in (?:(\d+)m)?([\d.]+)s/i.exec(j.error || '');
      const wait = m ? ((+m[1] || 0) * 60 + parseFloat(m[2])) * 1000 + 1000 : 20000;
      log?.(`Transcription is busy; waiting ${Math.round(wait / 1000)} s…`);
      await sleep(Math.min(wait, 120000));
      continue;
    }
    if (attempt < 2) { await sleep(3000); continue; }
    throw new Error(j.error || 'Transcription failed');
  }
  throw new Error('Transcription stayed busy; try again in a few minutes');
}

// Returns { words: [{w, s, e}], segments: [{s, e, t}], language }
export async function transcribePieces(pieces, { language, log, onProgress, signal } = {}) {
  const words = [], segments = [];
  let offset = 0, lang = null;
  for (let i = 0; i < pieces.length; i++) {
    log?.(`Transcribing part ${i + 1} of ${pieces.length}…`);
    const j = await sendPiece(pieces[i], i, { language, log, signal });
    lang ||= j.language;
    for (const w of j.words || []) words.push({ w: String(w.w).trim(), s: w.s + offset, e: w.e + offset });
    for (const g of j.segments || []) segments.push({ s: g.s + offset, e: g.e + offset, t: String(g.t).trim() });
    offset += j.duration || PIECE;
    onProgress?.((i + 1) / pieces.length);
  }
  return { words: words.filter(w => w.w), segments: segments.filter(g => g.t), language: lang };
}
