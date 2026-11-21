import { voiceChoice } from './router.js';
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
    if (this.engine !== 'elevenlabs' && this.batch?.has(text)) return this.batch.get(text);
    // The site's own Cloudflare voice (Deepgram Aura-2) sounds far more human than the in-browser
    // model, so it goes first unless an ElevenLabs key is saved.
    if (this.engine !== 'elevenlabs' && s.ttsEngine !== 'kokoro-only' && await auraReady()) {
      const r = await auraSpeak(text, s, this.log).catch(() => null);
      if (r) return r;
    }
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
        // In phrases of 2-3 sentences, so the voice flows like a person reading. Each phrase's span
        // is known exactly, so captions and mouths stay locked to the voice.
        const parts = phrases(text, 200);
        const pieces = [];
        let sampleRate = 24000;
        for (const part of parts) {
          // People speed up and slow down a little from phrase to phrase; questions lift slightly.
          // A touch quicker than the model's default (it reads like an audiobook), with lift on
          // exclamations and questions, so the narrator sounds awake and interested.
          const vary = 1.06 + (wobble(part, 7) - 0.5) * 0.06 + (/!/.test(part) ? 0.04 : /\?/.test(part) ? 0.02 : 0);
          const d = await this._call({ type: 'speak', text: speakable(part), voice: s.voice, speed: Math.max(0.6, Math.min(1.6, speed * vary)) });
          sampleRate = d.sampleRate;
          pieces.push({ text: part, samples: trimmed(d) });
        }
        const { samples, sentences } = joinPhrases(pieces, sampleRate);
        return { samples, sampleRate, sentences };
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
  const eleven = voiceChoice(settings) === 'elevenlabs';
  const engine = settings.ttsEngine === 'none' ? 'none' : eleven ? 'elevenlabs'
    : settings.ttsEngine === 'elevenlabs' ? 'kokoro' : settings.ttsEngine;
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
      text: speakable(text),
      model_id: s.elevenModel || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.4, speed: Math.max(0.7, Math.min(1.2, (Number(s.voiceSpeed) || 1) * speedMul)) },
    }),
  }, 40000, 'arrayBuffer');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  return { samples: audio.getChannelData(0).slice(), sampleRate: audio.sampleRate };
}

// Small text cleanups that make TTS read naturally.
function speakable(text) {
  return sayNumbers(text)
    .replace(/\bB\.C\.(?=\s|$)/g, 'B.C.')
    .replace(/\bvs\.?\b/gi, 'versus')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function cloudSpeak(text, s) {
  const voice = /^(onyx|echo|fable|alloy|nova|shimmer)$/.test(s.cloudVoice || '') ? s.cloudVoice : 'onyx';
  const enc = encodeURIComponent(speakable(text).slice(0, 1500));
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

// ---------- Deepgram Aura-2 through the site's Cloudflare AI ----------
let auraState = null; // null unknown, true usable, false not this visit
let auraHits = 0;
export const auraUsed = () => auraHits > 0;
let serverVoice = 'aura'; // which voice the server used last: aura or elevenlabs
export const serverVoiceName = () => (serverVoice === 'gemini' ? 'Gemini narrator voice' : serverVoice === 'elevenlabs' ? 'ElevenLabs voice (your site)' : 'Aura-2 voice (Cloudflare)');
async function auraReady() {
  if (auraState !== null) return auraState;
  try {
    const r = await fetch('/api/config', { credentials: 'same-origin' });
    auraState = r.ok ? !!(await r.json()).ai : false;
  } catch { auraState = false; }
  return auraState;
}
// Kokoro voice -> a matching Aura-2 narrator.
const AURA_FOR = { af_heart: 'thalia', af_bella: 'aurora', af_nicole: 'luna', bf_emma: 'helena', am_michael: 'arcas', am_fenrir: 'orion', am_puck: 'apollo', bm_george: 'draco', bm_fable: 'hermes' };
function auraSpeaker(v) { return AURA_FOR[v] || (/^[ab]f_/.test(v || '') ? 'thalia' : 'arcas'); }

async function auraLine(text, speaker) {
  const res = await fetch('/api/speak', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker }),
  });
  if (!/^audio\//.test(res.headers.get('Content-Type') || '')) {
    const why = await res.json().catch(() => ({}));
    const e = new Error(why.error || 'No voice');
    e.used = !!why.used;
    throw e;
  }
  serverVoice = res.headers.get('X-Loomy-Voice') || 'aura';
  const buf = await res.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 24000);
  const audio = await ctx.decodeAudioData(buf);
  return { samples: audio.getChannelData(0).slice(), sampleRate: audio.sampleRate };
}

async function auraSpeak(text, s, log) {
  const speaker = auraSpeaker(s.voice);
  // Aura-2 reads a whole line in one go, with its own natural flow between sentences.
  const parts = phrases(text, 900);
  const pieces = [];
  let sampleRate = 24000;
  try {
    for (const part of parts) {
      const d = await auraLine(speakable(part), speaker);
      sampleRate = d.sampleRate;
      // A line re-recorded alone (after a fact-check fix) matches the pace of the whole read.
      if (serverVoice === 'gemini' && lastStretch > 1) d.samples = timeStretch(d.samples, d.sampleRate, lastStretch);
      pieces.push({ text: part, samples: trimmed(d) });
    }
  } catch (e) {
    if (e.used) { auraState = false; log?.('The free daily Cloudflare voice allowance is used up: using the built-in voice.'); }
    throw e;
  }
  const { samples, sentences } = joinPhrases(pieces, sampleRate);
  auraHits++;
  return { samples, sampleRate, sentences, engine: 'aura' };
}

// ---------- Natural delivery ----------
// A person reads a few sentences in one breath, so the voice is recorded in phrases (2-3 sentences)
// instead of one sentence at a time, which made every sentence start and end in the same flat way.
// A sentence ends at . ! or ? followed by a space or the end, so "1.5" or "0.05" never splits.
const SENT_RE = /.+?[.!?]+["')\]]*(?=\s|$)|.+$/gs;
function phrases(text, maxChars) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const sents = clean.match(SENT_RE)?.map(x => x.trim()).filter(Boolean) || [clean];
  const out = [];
  for (const s of sents) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + s.length <= maxChars && !/\?["')\]]*$/.test(last)) out[out.length - 1] = `${last} ${s}`;
    else out.push(s);
  }
  return out;
}
// Small, stable variation from the text itself, so the same line always sounds the same.
function wobble(str, k = 0) {
  let h = 2166136261 ^ k;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000; // 0..1
}
// The pause after a phrase: longer after a question, shorter after a quick line, never the same twice.
function pauseAfter(phrase) {
  const base = /\?["')\]]*$/.test(phrase) ? 0.27 : /!["')\]]*$/.test(phrase) ? 0.22 : phrase.split(/\s+/).length < 6 ? 0.15 : 0.2;
  return base + (wobble(phrase) - 0.5) * 0.1;
}
// Join recorded phrases with natural pauses; returns the line and each phrase's span (for captions).
function joinPhrases(pieces, sampleRate) {
  const gaps = pieces.map((p, i) => (i < pieces.length - 1 ? Math.round(sampleRate * pauseAfter(p.text)) : 0));
  const total = pieces.reduce((n, p, i) => n + p.samples.length + gaps[i], 0);
  const samples = new Float32Array(total);
  const sentences = [];
  let o = 0;
  pieces.forEach((p, i) => {
    samples.set(p.samples, o);
    const b = speechBounds(p.samples, sampleRate);
    sentences.push({ text: p.text, start: o / sampleRate + b.start, end: o / sampleRate + b.end });
    o += p.samples.length + gaps[i];
  });
  return { samples, sentences };
}
function trimmed(d) {
  const b = speechBounds(d.samples, d.sampleRate);
  const pad = Math.round(d.sampleRate * 0.05);
  const a0 = Math.max(0, Math.round(b.start * d.sampleRate) - pad);
  const a1 = Math.min(d.samples.length, Math.round(b.end * d.sampleRate) + pad);
  const out = d.samples.slice(a0, a1);
  // 8 ms fades at both ends, so a cut between lines can never click.
  const f = Math.min(Math.round(d.sampleRate * 0.008), out.length >> 2);
  for (let i = 0; i < f; i++) { const k = i / f; out[i] *= k; out[out.length - 1 - i] *= k; }
  return out;
}

// ---------- Say numbers and units the way people do ----------
// "1 1/2 cups" -> "one and a half cups", "3/4" -> "three quarters", "5 km" -> "5 kilometers".
// Only the voice hears this; captions keep the written text.
const FRAC = { '1/2': ['a half', 'half'], '1/3': ['a third', 'one third'], '2/3': ['two thirds', 'two thirds'], '1/4': ['a quarter', 'one quarter'], '3/4': ['three quarters', 'three quarters'], '1/8': ['an eighth', 'one eighth'], '3/8': ['three eighths', 'three eighths'], '1/10': ['a tenth', 'one tenth'] };
const UFRAC = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅒': '1/10' };
const ORD = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth', 16: 'sixteenth', 100: 'hundredth' };
function fracWords(a, b, mixed) {
  const f = FRAC[`${a}/${b}`];
  if (f) return mixed ? f[0] : f[1];
  const o = ORD[+b];
  return o ? `${a} ${o}${+a === 1 ? '' : 's'}` : `${a} over ${b}`;
}
const UNITS = [
  ['km/h', 'kilometers per hour', 'kilometer per hour'], ['kph', 'kilometers per hour', 'kilometer per hour'], ['mph', 'miles per hour', 'mile per hour'],
  ['km²', 'square kilometers', 'square kilometer'], ['m²', 'square meters', 'square meter'], ['km', 'kilometers', 'kilometer'], ['cm', 'centimeters', 'centimeter'],
  ['mm', 'millimeters', 'millimeter'], ['m', 'meters', 'meter'], ['mi', 'miles', 'mile'], ['ft', 'feet', 'foot'], ['yd', 'yards', 'yard'],
  ['kg', 'kilograms', 'kilogram'], ['mg', 'milligrams', 'milligram'], ['g', 'grams', 'gram'], ['lbs', 'pounds', 'pound'], ['lb', 'pounds', 'pound'], ['oz', 'ounces', 'ounce'],
  ['mL', 'milliliters', 'milliliter'], ['ml', 'milliliters', 'milliliter'], ['L', 'liters', 'liter'], ['l', 'liters', 'liter'], ['gal', 'gallons', 'gallon'],
  ['hrs', 'hours', 'hour'], ['hr', 'hours', 'hour'], ['mins', 'minutes', 'minute'], ['min', 'minutes', 'minute'], ['sec', 'seconds', 'second'], ['ms', 'milliseconds', 'millisecond'],
  ['°F', 'degrees Fahrenheit', 'degree Fahrenheit'], ['°C', 'degrees Celsius', 'degree Celsius'], ['°', 'degrees', 'degree'], ['%', 'percent', 'percent'],
  ['kWh', 'kilowatt hours', 'kilowatt hour'], ['kW', 'kilowatts', 'kilowatt'], ['W', 'watts', 'watt'], ['V', 'volts', 'volt'], ['GB', 'gigabytes', 'gigabyte'], ['MB', 'megabytes', 'megabyte'],
];
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const UNIT_RE = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s?(${UNITS.map(u => esc(u[0])).join('|')})(?![\\w²])`, 'g');
export function sayNumbers(text) {
  let t = String(text || '');
  // Money first ("$1.5 billion" -> "1.5 billion dollars"), then units on plain numbers, then fractions.
  t = t.replace(/\$\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:thousand|million|billion|trillion|[kKmMbB]\b))?/g, (_, n, big) => {
    const scale = (big || '').trim(); const word = { k: 'thousand', K: 'thousand', m: 'million', M: 'million', b: 'billion', B: 'billion' }[scale] || scale;
    return `${n}${word ? ` ${word}` : ''} ${n === '1' && !word ? 'dollar' : 'dollars'}`;
  });
  t = t.replace(UNIT_RE, (_, n, u) => { const unit = UNITS.find(x => x[0] === u); return `${n} ${n === '1' ? unit[2] : unit[1]}`; });
  t = t.replace(/(\d)\s?([½⅓⅔¼¾⅛⅜⅒])/g, (_, n, f) => `${n} ${UFRAC[f]}`).replace(/[½⅓⅔¼¾⅛⅜⅒]/g, (f) => UFRAC[f]);
  const isFrac = (a, b) => +a < +b && (FRAC[`${a}/${b}`] || ORD[+b]);
  t = t.replace(/\b(\d+)\s+(\d{1,2})\/(\d{1,3})\b/g, (m, n, a, b) => (isFrac(a, b) ? `${n} and ${fracWords(a, b, true)}` : m));
  // A lone fraction, but not a date (2/29, 9/11) or 24/7.
  t = t.replace(/(^|[^\d/])(\d{1,2})\/(\d{1,3})(?![\d/])/g, (m, pre, a, b) => (isFrac(a, b) && !(+b > 12 && !FRAC[`${a}/${b}`]) && !(/^(9\/11|24\/7)$/.test(`${a}/${b}`)) ? `${pre}${fracWords(a, b, false)}` : m));
  t = t.replace(/\b(\d+)\.5\b(?!\d)/g, '$1 and a half');
  t = t.replace(/\b(\d+)x\b/g, '$1 times');
  t = t.replace(/~\s?(?=\d)/g, 'about ').replace(/≈\s?/g, 'about ').replace(/(\d)\s?[x×]\s?(\d)/g, '$1 by $2');
  return t;
}

// ---------- Whole-script read ----------
// One request reads every line in one go (one voice, natural flow, far less of the daily
// allowance); the server sends the cut times, and each scene gets its own slice.
export async function speakAllLines(lines, voice) {
  if (!(await auraReady()) || !Array.isArray(lines) || lines.length < 2) return null;
  try {
    const res = await fetch('/api/speakall', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, speaker: auraSpeaker(voice) }) });
    if (!/^audio\//.test(res.headers.get('Content-Type') || '')) return null;
    const cuts = JSON.parse(res.headers.get('X-Loomy-Cuts') || '[]');
    if (cuts.length !== lines.length - 1) return null;
    const audio = await new OfflineAudioContext(1, 1, 24000).decodeAudioData(await res.arrayBuffer());
    const sr = audio.sampleRate;
    // Faster, Shorts-style pace without a pitch change; the cut times scale with it.
    // Bring this read to the target pace, whatever model read it (each talks at its own speed).
    const wpm = Number(res.headers.get('X-Loomy-Wpm')) || 165;
    lastStretch = Math.max(1, Math.min(1.35, TARGET_WPM / wpm));
    const all = timeStretch(audio.getChannelData(0), sr, lastStretch);
    const k = all.length / audio.length;
    const bounds = [0, ...cuts.map(c => Math.round(c * sr * k)), all.length];
    const out = new Map();
    lines.forEach((line, i) => {
      const slice = all.slice(bounds[i], bounds[i + 1]);
      if (slice.length < sr * 0.3) return;
      const samples = trimmed({ samples: slice, sampleRate: sr });
      const b = speechBounds(samples, sr);
      out.set(line, { samples, sampleRate: sr, sentences: [{ text: line, start: b.start, end: b.end }], engine: 'aura' });
    });
    if (out.size < lines.length * 0.8) return null;
    serverVoice = res.headers.get('X-Loomy-Voice') || 'gemini';
    auraHits++;
    return out;
  } catch { return null; }
}

// ---------- Pace ----------
// Gemini's narrators read about 160 words a minute; popular Shorts run near 190. WSOLA time
// stretching speeds speech up without raising its pitch (no chipmunk): short overlapping frames
// are re-spaced, each nudged to the spot that best continues the previous one.
export function timeStretch(x, sr, rate) {
  if (!(rate > 1.01) || x.length < sr) return x;
  const N = Math.round(sr * 0.032), Hs = N >> 1, Ha = Math.round(Hs * rate), tol = Math.round(sr * 0.009);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const frames = Math.floor((x.length - N - tol * 2) / Ha);
  const out = new Float32Array(frames * Hs + N);
  const norm = new Float32Array(out.length);
  let prev = 0;
  for (let k = 0; k < frames; k++) {
    const nominal = k * Ha;
    let best = nominal;
    if (k > 0) {
      const target = prev + Hs;
      let bestC = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const c0 = nominal + d;
        if (c0 < 0 || c0 + N > x.length) continue;
        let c = 0;
        for (let i = 0; i < N; i += 4) c += x[target + i] * x[c0 + i];
        if (c > bestC) { bestC = c; best = c0; }
      }
    }
    const o = k * Hs;
    for (let i = 0; i < N; i++) { out[o + i] += x[best + i] * win[i]; norm[o + i] += win[i]; }
    prev = best;
  }
  for (let i = 0; i < out.length; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out;
}
let lastStretch = 1; // the speed-up of the last whole-script read, reused for lines re-recorded alone
const TARGET_WPM = 195; // the pace of popular narrated Shorts (the reference videos measure 196)
