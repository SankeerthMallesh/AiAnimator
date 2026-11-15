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
        const d = await this._call({ type: 'speak', text: speakable(text), voice: s.voice, speed });
        return { samples: d.samples, sampleRate: d.sampleRate };
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
  const words = text.split(/\s+/).filter(Boolean);
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
