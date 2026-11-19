import { writerOrder } from './router.js';
// Script writing + fact checking with free LLM providers.
// No key needed for Pollinations; Gemini / Groq / OpenRouter free keys are faster and more reliable.

import { fetchTimeout } from './net.js';
import { Script } from './script.js';

const WORDS_PER_SECOND = 2.55;

// A script is ~2k tokens; anything slower than this is a hung request, so fail over to the next provider.
const LLM_TIMEOUT_MS = 45000;

async function fetchJSON(url, opts, signal) {
  const { res, data: text } = await fetchTimeout(url, { ...opts, signal }, LLM_TIMEOUT_MS, 'text');
  if (!res.ok) {
    const short = text.slice(0, 300).replace(/\s+/g, ' ');
    const err = new Error(`HTTP ${res.status}: ${short}`);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

async function openAICompat(url, key, model, messages, signal, extra = {}, temperature = 0.8) {
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const body = { model, messages, temperature, ...extra };
  const data = await fetchJSON(url, { method: 'POST', headers, body: JSON.stringify(body) }, signal);
  if (data.__raw) return data.__raw;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Empty response from model');
  return content;
}

let pollinationsKeyRejected = false;

// The free text endpoint allows about one reply a minute per IP. A "retry after 1s"
// hint from that 402 has been wrong; the "every N seconds" figure is the real gap.
const FREE_TEXT_GAP_MS = 46000;
let freeTextAt = 0;

export function msUntilFreeText() {
  return Math.max(0, freeTextAt - Date.now());
}

function holdFreeText(ms = FREE_TEXT_GAP_MS) {
  freeTextAt = Math.max(freeTextAt, Date.now() + ms);
}

function limitWaitMs(message) {
  const every = /every\s+(\d+)\s*seconds?/i.exec(String(message || ''));
  const n = every ? Number(every[1]) * 1000 : FREE_TEXT_GAP_MS;
  return Math.min(90000, Math.max(FREE_TEXT_GAP_MS, n));
}

export async function waitForFreeText(signal, onWait) {
  let left = msUntilFreeText();
  if (left < 400) return;
  while (left > 0) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    onWait?.(left);
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, Math.min(1000, left));
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
    });
    left = msUntilFreeText();
  }
}

// The site's own Cloudflare AI (gpt-oss-120b on the free daily allowance), when the server has it.
let serverAI = null;
async function serverReady() {
  if (serverAI !== null) return serverAI;
  try {
    const r = await fetch('/api/config', { credentials: 'same-origin' });
    serverAI = r.ok ? !!(await r.json()).ai : false;
  } catch { serverAI = false; }
  return serverAI;
}

const PROVIDERS = {
  async cloudflare(messages, s, signal, temperature = 0.8) {
    const res = await fetch('/api/write', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: Math.min(1, temperature), max_tokens: 6000 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.text) {
      if (data.used) serverAI = false;
      const e = new Error(data.error || 'The Cloudflare writer did not answer');
      e.status = 502;
      throw e;
    }
    return data.text;
  },
  async gemini(messages, s, signal, temperature = 0.8) {
    if (!s.geminiKey) throw new Error('No Gemini key');
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    // "Lite" models answer in seconds; bigger "thinking" models can take a minute+ for a script.
    const models = [...new Set([s.geminiModel || 'gemini-flash-lite-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'])];
    let lastErr;
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
      try {
        const data = await fetchJSON(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
            contents,
            generationConfig: { temperature, responseMimeType: 'application/json' },
          }),
        }, signal);
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
        if (!text) throw new Error(`Empty response from Gemini (${data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'no text'})`);
        return text;
      } catch (e) {
        lastErr = e;
        // Only move to the next model when this one doesn't exist for this key.
        if (!(e.status === 404 || (e.status === 400 && /model/i.test(e.message)))) throw e;
      }
    }
    throw lastErr;
  },
  async groq(messages, s, signal, temperature = 0.8) {
    if (!s.groqKey) throw new Error('No Groq key');
    return openAICompat('https://api.groq.com/openai/v1/chat/completions', s.groqKey,
      s.groqModel || 'llama-3.3-70b-versatile', messages, signal, { response_format: { type: 'json_object' } }, temperature);
  },
  async openrouter(messages, s, signal, temperature = 0.8) {
    if (!s.openrouterKey) throw new Error('No OpenRouter key');
    return openAICompat('https://openrouter.ai/api/v1/chat/completions', s.openrouterKey,
      s.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free', messages, signal, {}, temperature);
  },
  // Pollinations routes to whichever model it likes (some reject non-default sampling), so it keeps
  // the original temperature instead of the per-task one the other providers receive.
  async pollinations(messages, s, signal, temperature = 0.8) {
    const model = s.pollinationsTextModel || 'openai';
    if (s.pollinationsKey && !pollinationsKeyRejected) {
      try {
        return await openAICompat('https://gen.pollinations.ai/v1/chat/completions', s.pollinationsKey, model, messages, signal, { reasoning_effort: 'low', max_tokens: 1400 }, temperature);
      } catch (e) {
        if (![401, 402, 403].includes(e.status)) throw e;
        pollinationsKeyRejected = true; // wrong kind of key or out of credit: use the free service
      }
    }
    // Anonymous, free endpoint (one reply about every 45 seconds per IP).
    // One endpoint only. The plain text.pollinations.ai/ URL answers slowly or not at all
    // from a browser, and waiting on it after a fast error left the script step stuck.
    try {
      const text = await openAICompat('https://text.pollinations.ai/openai', '', model, messages, signal, { private: true, referrer: 'storyforge', reasoning_effort: 'low', max_tokens: 1400 }, temperature);
      holdFreeText();
      return text;
    } catch (e) {
      if (e.status === 402) holdFreeText(limitWaitMs(e.message));
      throw e;
    }
  },
};

export function providerOrder(s, avoid = null) {
  // The AI Model Router picks the order for the chosen Production mode (Settings).
  const order = writerOrder(s, { server: !!serverAI });
  // `avoid` = the provider that wrote the script. A fact-check by a *different* model catches
  // errors the writer is blind to (a model re-reading its own work tends to agree with itself).
  if (avoid && order.length > 1 && order[0] === avoid) order.push(order.shift());
  return order;
}

// Ask the best provider first; if it hasn't answered within HEDGE_MS, start the next one too.
// The first valid answer wins and the others are cancelled, so one slow free service never stalls a video.
const HEDGE_MS = 10000;

export async function chat(messages, settings, opts = {}) {
  await serverReady();
  return chatNow(messages, settings, opts);
}

function chatNow(messages, settings, { signal, log, temperature, avoid, validate, hedge = true, onWait } = {}) {
  const order = providerOrder(settings, avoid);
  const errors = [];
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal?.addEventListener('abort', stop, { once: true });

  const tryProvider = async (name) => {
    let last;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        log?.(`Asking ${name}${attempt ? ' (retry)' : ''}…`);
        // A fresh tail stops the free service from replaying a cached, cut-off answer.
        const stamped = messages.map((m, idx) => idx === messages.length - 1
          ? { ...m, content: `${m.content}\n\nVariation ${attempt}-${Date.now().toString(36)}.` }
          : m);
        const text = await PROVIDERS[name](stamped, settings, ctrl.signal, temperature);
        let value;
        try { value = validate ? validate(text) : text; } catch (e) {
          const flat = String(text).replace(/\s+/g, ' ');
          log?.(`${name} answered: ${flat.slice(0, 180)} … ${flat.slice(-140)}`);
          throw e;
        }
        return { text, value, provider: name };
      } catch (e) {
        if (ctrl.signal.aborted) throw e;
        last = e;
        log?.(`${name} failed: ${e.message}`);
        if (e.status === 401 || e.status === 403 || /No .* key/.test(e.message)) break;
        // The free writer allows about one reply a minute. A short retry just hits the same wall.
        const wait = e.status === 402 ? Math.max(msUntilFreeText(), FREE_TEXT_GAP_MS) : 1200;
        if (e.status === 402) log?.(`Free text limit. Waiting ${Math.ceil(wait / 1000)}s for another reply…`);
        const end = Date.now() + wait;
        while (Date.now() < end) {
          if (ctrl.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
          onWait?.(end - Date.now());
          const slice = Math.min(1000, end - Date.now());
          await new Promise((resolve, reject) => {
            const t = setTimeout(resolve, slice);
            ctrl.signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
          });
        }
      }
    }
    throw last;
  };

  return new Promise((resolve, reject) => {
    let next = 0, running = 0, settled = false, timer = null;
    const finish = (fn, v) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      signal?.removeEventListener('abort', stop);
      ctrl.abort();
      fn(v);
    };
    const launch = () => {
      if (settled || next >= order.length) return false;
      const name = order[next++];
      running++;
      tryProvider(name).then((r) => finish(resolve, r), (e) => {
        running--;
        if (settled) return;
        if (signal?.aborted) { finish(reject, e); return; }
        errors.push(`${name}: ${e.message}`);
        if (!launch() && running === 0) finish(reject, new Error('All script writers failed. ' + errors.slice(-3).join(' | ')));
      });
      return true;
    };
    launch();
    if (hedge && order.length > 1) timer = setInterval(() => { if (!settled) launch(); }, HEDGE_MS);
    if (signal?.aborted) finish(reject, new DOMException('Cancelled', 'AbortError'));
  });
}

export function parseJSONLoose(text) {
  return Script.parse(text);
}

export function planFor(options) { return Script.plan(options); }
export function normalizeScript(raw, options) { return Script.normalize(raw, options); }
export function scriptFromText(text, options) { return Script.fromText(text, options); }
export function writerPrompt(topic, options) { return Script.prompt(topic, options); }

const SYSTEM_WRITER = `You write funny, accurate cartoon explainers for a vertical short.
The pictures are drawn in code, so you only return a compact storyboard JSON.
Never present a myth as fact. If a popular belief is wrong, the narration says so.
No nudity, no gore, no blood. Characters stay clothed. Body topics use organ props.`;

const SYSTEM_CHECKER = `You fact-check every spoken line of a short. Check each claim on its own.
Fix myths stated as fact, wrong dates, wrong numbers, wrong units, and a famous story that drops the half that makes it true.
Keep each replacement line short. Do not add nudity or gore. Output only JSON.`;

const PART_SCENES = 8;

export async function writeScript(topic, options, settings, extra = {}) {
  const plan = Script.plan(options);
  if (plan.scenes <= PART_SCENES + 2) return writeScriptOnce(topic, options, settings, extra);
  return writeScriptInParts(topic, options, settings, extra, plan);
}

// Long videos: the free writer can't return 20+ scenes in one answer, so the script is written in
// parts of up to 8 scenes that continue the same story, then merged into one storyboard.
async function writeScriptInParts(topic, options, settings, { signal, log } = {}, plan) {
  const count = Math.ceil(plan.scenes / PART_SCENES);
  const sizes = Array.from({ length: count }, (_, i) => Math.round(plan.scenes * (i + 1) / count) - Math.round(plan.scenes * i / count));
  const ask = async (content, check) => {
    let lastErr;
    for (let round = 0; round < 3; round++) {
      try {
        const { value, provider } = await chat([{ role: 'system', content: SYSTEM_WRITER }, { role: 'user', content }], settings, {
          signal, log, temperature: 0.6, validate: (text) => { const raw = Script.parse(text); check(raw); return raw; },
        });
        return { raw: value, provider };
      } catch (e) {
        if (signal?.aborted) throw e;
        lastErr = e;
        log?.(`Script part not ready yet. Trying again in ${5 * (round + 1)} seconds…`);
        await new Promise(r => setTimeout(r, 5000 * (round + 1)));
      }
    }
    throw lastErr;
  };
  const hasScenes = (min) => (raw) => { if (!Array.isArray(raw?.scenes) || raw.scenes.length < min) throw new Error('Too few scenes came back'); };
  log?.(`Long video: writing the script in ${count} parts.`);
  const first = await ask(Script.prompt(topic, options, { index: 1, count, scenes: sizes[0] }), hasScenes(2));
  const merged = { ...first.raw, scenes: [...first.raw.scenes] };
  for (let k = 2; k <= count; k++) {
    const lines = merged.scenes.map(x => String(x.line || x.narration || '').trim()).filter(Boolean);
    try {
      const part = await ask(Script.continuePrompt(topic, options, first.raw, lines, { index: k, count, scenes: sizes[k - 1] }), hasScenes(1));
      merged.scenes.push(...part.raw.scenes);
      log?.(`Script part ${k} of ${count}: ${part.raw.scenes.length} scenes.`);
    } catch (e) {
      if (signal?.aborted) throw e;
      log?.(`Script part ${k} could not be written (${e.message}). The video will be shorter.`);
      break;
    }
  }
  return { script: Script.normalize(merged, { ...options, topic }), provider: first.provider };
}

async function writeScriptOnce(topic, options, settings, { signal, log } = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_WRITER },
    { role: 'user', content: Script.prompt(topic, options) },
  ];
  const ask = () => chat(messages, settings, {
    signal, log, temperature: 0.6,
    validate: (text) => {
      const script = Script.normalize(Script.parse(text), { ...options, topic });
      if (script.scenes.length < 3) {
        throw new Error(`Only ${script.scenes.length} scenes came back`);
      }
      return script;
    },
  });
  let lastErr;
  for (let round = 0; round < 3; round++) {
    try {
      const { value: script, provider } = await ask();
      return { script, provider };
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
      if (round < 2) {
        log?.(`No script yet. Trying again in ${6 * (round + 1)} seconds…`);
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 6000 * (round + 1));
          signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
        });
      }
    }
  }
  throw lastErr;
}

export async function factCheck(script, settings, { signal, log, avoid, topic, onWait } = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_CHECKER },
    { role: 'user', content: Script.checkPrompt(script, topic) },
  ];
  const { value: data } = await chat(messages, settings, {
    signal, log, temperature: 0.1, avoid, hedge: false, onWait, validate: (text) => Script.parse(text),
  });
  const notes = (Array.isArray(data.notes) ? data.notes : []).map(n => Script.clean(n, 300)).filter(Boolean);
  const unverified = (Array.isArray(data.unverified) ? data.unverified : []).map(n => Script.clean(n, 200)).filter(Boolean).slice(0, 6);
  if (unverified.length) notes.push(`Please double-check before publishing: ${unverified.join('; ')}`);
  let changed = 0;
  for (const f of Array.isArray(data.fixes) ? data.fixes : []) {
    const scene = script.scenes[Number(f.i)];
    if (!scene) continue;
    const v = Script.clean(f.line || f.narration, 280);
    if (v && v !== scene.narration) { scene.narration = v; changed++; }
  }
  return { notes, changed };
}

// Settings → "Check keys": one tiny request per configured script writer, so a bad or
// out-of-quota key shows up here and not halfway through a video.
export async function checkWriters(settings) {
  const names = ['gemini', 'groq', 'openrouter', 'pollinations'].filter(n => n === 'pollinations' || settings[`${n}Key`]);
  const msg = [{ role: 'system', content: 'Reply with JSON only.' }, { role: 'user', content: 'Return {"ok":true}' }];
  return Promise.all(names.map(async (name) => {
    const t0 = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const out = await PROVIDERS[name](msg, settings, ctrl.signal, 0);
      parseJSONLoose(out);
      return { name, ok: true, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      return { name, ok: false, error: ctrl.signal.aborted ? 'no answer in 30 s' : String(e.message || e).slice(0, 160) };
    } finally { clearTimeout(timer); }
  }));
}
