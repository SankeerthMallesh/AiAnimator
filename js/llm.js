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

const PROVIDERS = {
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
    // Anonymous, free endpoint (rate limited per visitor).
    try {
      // The free model is a reasoning model: without low effort it spends its whole output budget thinking and returns HTTP 400.
      return await openAICompat('https://text.pollinations.ai/openai', '', model, messages, signal, { private: true, referrer: 'storyforge', reasoning_effort: 'low', max_tokens: 1400 }, temperature);
    } catch (e) {
      if (signal?.aborted) throw e;
      // Older plain endpoint as a last resort.
      const { res, data: t } = await fetchTimeout('https://text.pollinations.ai/', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, private: true, referrer: 'storyforge', reasoning_effort: 'low', max_tokens: 1400 }),
      }, LLM_TIMEOUT_MS, 'text');
      if (!res.ok) throw new Error(`Pollinations: HTTP ${res.status} (${e.message}). Add a free key in Settings for reliable scripts.`);
      if (!t.trim()) throw new Error('Pollinations returned nothing');
      return t;
    }
  },
};

export function providerOrder(s, avoid = null) {
  // A chosen provider goes first, but the free no-key writer is always the last resort.
  if (s.llmProvider && s.llmProvider !== 'auto') return s.llmProvider === 'pollinations' ? ['pollinations'] : [s.llmProvider, 'pollinations'];
  const order = [];
  if (s.geminiKey) order.push('gemini');
  if (s.groqKey) order.push('groq');
  if (s.openrouterKey) order.push('openrouter');
  order.push('pollinations');
  // `avoid` = the provider that wrote the script. A fact-check by a *different* model catches
  // errors the writer is blind to (a model re-reading its own work tends to agree with itself).
  if (avoid && order.length > 1 && order[0] === avoid) order.push(order.shift());
  return order;
}

// Ask the best provider first; if it hasn't answered within HEDGE_MS, start the next one too.
// The first valid answer wins and the others are cancelled, so one slow free service never stalls a video.
const HEDGE_MS = 10000;

export function chat(messages, settings, { signal, log, temperature, avoid, validate } = {}) {
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
        const wait = e.status === 402 ? 46000 : 1200;
        if (e.status === 402) log?.('Free text limit reached. Waiting 45 seconds for another reply…');
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, wait);
          ctrl.signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
        });
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
    timer = setInterval(() => { if (!settled) launch(); }, HEDGE_MS);
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

const SYSTEM_CHECKER = `You fact-check a short narration. Fix myths stated as fact, wrong dates and wrong numbers.
Keep each replacement line short. Do not add nudity or gore. Output only JSON.`;

export async function writeScript(topic, options, settings, { signal, log } = {}) {
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

export async function factCheck(script, settings, { signal, log, avoid } = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_CHECKER },
    { role: 'user', content: Script.checkPrompt(script) },
  ];
  const { value: data } = await chat(messages, settings, {
    signal, log, temperature: 0.1, avoid, validate: (text) => Script.parse(text),
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
