// Narration: Kokoro (free, runs in the browser) with a cloud fallback and a silent mode.
import { fetchTimeout } from './net.js';

export class Narrator {
  constructor(settings, log) {
    this.settings = settings;
    this.log = log || (() => {});
    this.worker = null;
    this.pending = new Map();
    this.nextId = 1;
    this.engine = settings.ttsEngine;
    this.onProgress = null;
  }

  _call(msg) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id });
    });
  }

  async load() {
    if (this.engine !== 'kokoro') return;
    if (!this.worker) {
      this.worker = new Worker(withVersion(new URL('./tts-worker.js', import.meta.url)), { type: 'module' });
      this.worker.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'progress') { this.onProgress?.(d); return; }
        const p = this.pending.get(d.id);
        if (!p) return;
        this.pending.delete(d.id);
        if (d.type === 'error') p.reject(new Error(d.message)); else p.resolve(d);
      };
      this.worker.onerror = (e) => {
        for (const p of this.pending.values()) p.reject(new Error(e.message || 'Voice engine crashed'));
        this.pending.clear();
      };
    }
    await this._call({ type: 'load', dtype: 'q8' });
  }

  async speak(text, speedMul = 1) {
    const s = this.settings;
    if (this.engine === 'none' || !text.trim()) return null;
    if (this.engine === 'elevenlabs') {
      try {
        return await elevenSpeak(text, s, speedMul);
      } catch (e) {
        this.log(`ElevenLabs failed (${e.message}); switching to the free built-in voice.`);
        this.engine = 'kokoro';
        await this.load().catch(() => { this.engine = 'pollinations'; });
      }
    }
    if (this.engine === 'kokoro') {
      try {
        const speed = Math.max(0.6, Math.min(1.6, (Number(s.voiceSpeed) || 1) * speedMul));
        // One sentence at a time, so we know exactly where each sentence starts and ends:
        // captions and mouths then stay locked to the voice for the whole line.
        const sentences = speakable(text).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map(x => x.trim()).filter(Boolean) || [speakable(text)];
        const pieces = [];
        let sampleRate = 24000;
        for (const sent of sentences) {
          const d = await this._call({ type: 'speak', text: sent, voice: s.voice, speed });
          sampleRate = d.sampleRate;
          // Trim the model's own silence at both ends, keeping 40 ms so consonants aren't clipped.
          const b = speechBounds(d.samples, d.sampleRate);
          const pad = Math.round(d.sampleRate * 0.04);
          const a0 = Math.max(0, Math.round(b.start * d.sampleRate) - pad);
          const a1 = Math.min(d.samples.length, Math.round(b.end * d.sampleRate) + pad);
          pieces.push({ text: sent, samples: d.samples.slice(a0, a1) });
        }
        const gap = Math.round(sampleRate * 0.22); // a natural breath between sentences
        const total = pieces.reduce((n, p) => n + p.samples.length, 0) + gap * Math.max(0, pieces.length - 1);
        const samples = new Float32Array(total);
        const sentencesOut = [];
        let o = 0;
        for (const p of pieces) {
          samples.set(p.samples, o);
          const b = speechBounds(p.samples, sampleRate);
          sentencesOut.push({ text: p.text, start: o / sampleRate + b.start, end: o / sampleRate + b.end });
          o += p.samples.length + gap;
        }
        return { samples, sampleRate, sentences: sentencesOut };
      } catch (e) {
        this.log(`Built-in voice failed (${e.message}); trying the cloud voice.`);
        this.engine = 'pollinations';
      }
    }
    if (this.engine === 'pollinations') {
      // One retry: with deadlines on requests, a single slow line must not silence the whole video.
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await cloudSpeak(text, s);
        } catch (e) {
          lastErr = e;
          if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        }
      }
      this.log(`Cloud voice failed (${lastErr.message}); continuing with captions only.`);
      this.engine = 'none';
      return null;
    }
    return null;
  }

  // Stop waiting on in-flight lines but keep the loaded model warm for the next video.
  cancelPending() {
    for (const p of this.pending.values()) p.reject(new DOMException('Cancelled', 'AbortError'));
    this.pending.clear();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.cancelPending();
  }
}

// One shared narrator per engine, so the voice model loads once (in the background) and stays warm.
let shared = null;
export function getNarrator(settings, log) {
  const engine = settings.ttsEngine === 'elevenlabs' && !settings.elevenKey ? 'kokoro' : settings.ttsEngine;
  if (!shared || shared.wantEngine !== engine) {
    shared?.dispose();
    shared = new Narrator({ ...settings, ttsEngine: engine }, log);
    shared.wantEngine = engine;
    shared.ready = null;
  }
  shared.settings = settings;
  shared.log = log || shared.log;
  if (shared.engine === 'none' && engine !== 'none') shared.engine = engine;
  return shared;
}
export function warmNarrator(n) {
  if (!n.ready) {
    n.ready = n.engine === 'kokoro' ? n.load() : Promise.resolve();
    n.ready.catch(() => { n.ready = null; });
  }
  return n.ready;
}

async function elevenSpeak(text, s, speedMul) {
  const voice = (s.elevenVoice || 'JBFqnCBsd6RMkjVDRZzb').trim();
  const { res, data: buf } = await fetchTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': s.elevenKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: s.elevenModel || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, speed: Math.max(0.7, Math.min(1.2, (Number(s.voiceSpeed) || 1) * speedMul)) },
    }),
  }, 40000, 'arrayBuffer');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  return { samples: audio.getChannelData(0).slice(), sampleRate: audio.sampleRate };
}

// Small text cleanups that make TTS read naturally.
function speakable(text) {
  return text
    .replace(/\bB\.C\.(?=\s|$)/g, 'B.C.')
    .replace(/\bvs\.?\b/gi, 'versus')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function cloudSpeak(text, s) {
  const voice = /^(onyx|echo|fable|alloy|nova|shimmer)$/.test(s.cloudVoice || '') ? s.cloudVoice : 'onyx';
  const enc = encodeURIComponent(text.slice(0, 1500));
  const url = s.pollinationsKey
    ? `https://gen.pollinations.ai/audio/${enc}?voice=${voice}&key=${encodeURIComponent(s.pollinationsKey)}`
    : `https://text.pollinations.ai/${enc}?model=openai-audio&voice=${voice}&referrer=storyforge`;
  const { res, data: buf } = await fetchTimeout(url, {}, 40000, 'arrayBuffer');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (buf.byteLength < 1000) throw new Error('empty audio');
  const ctx = new OfflineAudioContext(1, 1, 24000);
  const audio = await ctx.decodeAudioData(buf);
  return { samples: audio.getChannelData(0).slice(), sampleRate: audio.sampleRate };
}

// Find where speech actually starts/ends so caption timing lines up with the voice.
export function speechBounds(samples, sampleRate) {
  const win = Math.round(sampleRate * 0.02);
  let peak = 0;
  for (let i = 0; i < samples.length; i += 4) peak = Math.max(peak, Math.abs(samples[i]));
  const thr = Math.max(0.01, peak * 0.06);
  let start = 0, end = samples.length;
  for (let i = 0; i < samples.length; i += win) {
    let m = 0; for (let j = i; j < Math.min(i + win, samples.length); j++) m = Math.max(m, Math.abs(samples[j]));
    if (m > thr) { start = i; break; }
  }
  for (let i = samples.length - win; i > 0; i -= win) {
    let m = 0; for (let j = i; j < Math.min(i + win, samples.length); j++) m = Math.max(m, Math.abs(samples[j]));
    if (m > thr) { end = i + win; break; }
  }
  return { start: start / sampleRate, end: Math.max(start + win, end) / sampleRate };
}

// Spread words over the spoken time, weighted by length and punctuation pauses.
export function wordTimings(text, t0, t1) {
  // Long dashes join two words with no space ("sphere—science"); caption them as separate words.
  const words = text.replace(/\s*[—–]\s*/g, ' ').split(/\s+/).filter(Boolean);
  const weights = words.map(w => {
    const letters = w.replace(/[^\p{L}\p{N}]/gu, '').length;
    let wgt = 1.2 + letters * 0.9;
    if (/[,;:—–-]$/.test(w)) wgt += 2.2;
    if (/[.!?]["')]?$/.test(w)) wgt += 3.5;
    if (/\d/.test(w)) wgt += letters * 1.6; // numbers are spoken long
    return wgt;
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const span = Math.max(0.2, t1 - t0);
  let t = t0;
  return words.map((w, i) => {
    const d = (weights[i] / total) * span;
    const item = { text: w, start: t, end: t + d };
    t += d;
    return item;
  });
}

// Carry this file's ?v= stamp to the worker so browsers never mix old and new code.
function withVersion(u) { u.search = new URL(import.meta.url).search; return u; }

// ---------- lip sync and caption sync ----------

// A smooth loudness curve for the voice, sampled every 10 ms: fast attack, gentle release,
// normalised to the line's own peak. Drives the mouths so they open on syllables and close
// in pauses without fluttering from one frame to the next.
export function voiceEnvelope(samples, sampleRate) {
  const hop = Math.max(1, Math.round(sampleRate * 0.01));
  const n = Math.ceil(samples.length / hop);
  const raw = new Float32Array(n);
  let peak = 1e-6;
  for (let f = 0; f < n; f++) {
    let s = 0, c = 0;
    const a = f * hop, b = Math.min(samples.length, a + hop * 2);
    for (let i = a; i < b; i += 2) { s += samples[i] * samples[i]; c++; }
    raw[f] = Math.sqrt(s / (c || 1));
    if (raw[f] > peak) peak = raw[f];
  }
  const env = new Float32Array(n);
  let v = 0;
  for (let f = 0; f < n; f++) {
    const x = Math.min(1, raw[f] / (peak * 0.7));
    v = x > v ? v + (x - v) * 0.65 : v + (x - v) * 0.22;
    env[f] = v;
  }
  return { env, rate: sampleRate / hop };
}

// Place each word on the parts of the line where the voice is actually sounding.
// Silent gaps (breaths, commas, full stops) get no words, so captions change exactly
// when the narrator moves on instead of drifting ahead or behind.
export function alignWords(text, samples, sampleRate, offset = 0, sentences = null) {
  // Best case: we recorded sentence by sentence and know each one's exact span.
  if (Array.isArray(sentences) && sentences.length) {
    const all = text.replace(/\s*[—–]\s*/g, ' ').split(/\s+/).filter(Boolean);
    const out = [];
    let wi = 0;
    sentences.forEach((sent, k) => {
      const n = sent.text.replace(/\s*[—–]\s*/g, ' ').split(/\s+/).filter(Boolean).length;
      const take = k === sentences.length - 1 ? all.slice(wi) : all.slice(wi, wi + n);
      wi += take.length;
      if (take.length) out.push(...wordTimings(take.join(' '), offset + sent.start, offset + sent.end));
    });
    if (out.length) return out;
  }
  const words = text.replace(/\s*[—–]\s*/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const { env, rate } = voiceEnvelope(samples, sampleRate);
  // Voiced frames, with tiny gaps (< 70 ms, inside words) filled in.
  const on = Array.from(env, (x) => x > 0.12);
  const fill = Math.round(0.07 * rate);
  for (let f = 0; f < on.length; f++) {
    if (on[f]) continue;
    let g = f; while (g < on.length && !on[g]) g++;
    if (f > 0 && g < on.length && g - f <= fill) for (let k = f; k < g; k++) on[k] = true;
    f = g;
  }
  const runs = [];
  for (let f = 0; f < on.length; f++) {
    if (!on[f]) continue;
    let g = f; while (g < on.length && on[g]) g++;
    runs.push([f / rate, g / rate]);
    f = g;
  }
  if (!runs.length) {
    const b = speechBounds(samples, sampleRate);
    return wordTimings(text, offset + b.start, offset + b.end);
  }
  const voiced = runs.reduce((n, [a, b]) => n + (b - a), 0);
  // Map "share of spoken time" to real time, skipping the silent gaps.
  const at = (frac) => {
    let need = frac * voiced;
    for (const [a, b] of runs) {
      if (need <= b - a) return a + need;
      need -= b - a;
    }
    return runs[runs.length - 1][1];
  };
  const weights = words.map(w => {
    const letters = w.replace(/[^\p{L}\p{N}]/gu, '').length;
    return 1 + letters * (/\d/.test(w) ? 2.2 : 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return words.map((w, i) => {
    const s = at(acc / total);
    acc += weights[i];
    const e = at(acc / total);
    return { text: w, start: offset + s, end: offset + Math.max(s + 0.06, e) };
  });
}
