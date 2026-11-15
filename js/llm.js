// Script writing + fact checking with free LLM providers.
// No key needed for Pollinations; Gemini / Groq / OpenRouter free keys are faster and more reliable.

import { STYLES, CAMERAS, TRANSITIONS, PACES, FORMATS, formatOf } from './presets.js';
import { fetchTimeout } from './net.js';

const WORDS_PER_SECOND = 2.55;

// A script is ~2k tokens; anything slower than this is a hung request, so fail over to the next provider.
const LLM_TIMEOUT_MS = 60000;

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

const PROVIDERS = {
  async gemini(messages, s, signal, temperature = 0.8) {
    if (!s.geminiKey) throw new Error('No Gemini key');
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel || 'gemini-flash-latest')}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
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
    if (!text) throw new Error('Empty response from Gemini');
    return text;
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
  async pollinations(messages, s, signal) {
    const model = s.pollinationsTextModel || 'openai';
    if (s.pollinationsKey) {
      return openAICompat('https://gen.pollinations.ai/v1/chat/completions', s.pollinationsKey, model, messages, signal);
    }
    // Anonymous, free endpoint (rate limited per visitor).
    try {
      return await openAICompat('https://text.pollinations.ai/openai', '', model, messages, signal, { private: true, referrer: 'storyforge' });
    } catch (e) {
      if (signal?.aborted) throw e;
      // Older plain endpoint as a last resort.
      const { res, data: t } = await fetchTimeout('https://text.pollinations.ai/', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, private: true, referrer: 'storyforge' }),
      }, LLM_TIMEOUT_MS, 'text');
      if (!res.ok) throw new Error(`Pollinations: HTTP ${res.status} (${e.message}). Add a free key in Settings for reliable scripts.`);
      if (!t.trim()) throw new Error('Pollinations returned nothing');
      return t;
    }
  },
};

export function providerOrder(s, avoid = null) {
  if (s.llmProvider && s.llmProvider !== 'auto') return [s.llmProvider];
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

export async function chat(messages, settings, { signal, log, temperature, avoid } = {}) {
  const errors = [];
  for (const name of providerOrder(settings, avoid)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        log?.(`Asking ${name}${attempt ? ' (retry)' : ''}…`);
        const out = await PROVIDERS[name](messages, settings, signal, temperature);
        return { text: out, provider: name };
      } catch (e) {
        if (signal?.aborted) throw e;
        errors.push(`${name}: ${e.message}`);
        log?.(`${name} failed: ${e.message}`);
        if (e.status === 401 || e.status === 403 || /No .* key/.test(e.message)) break;
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw new Error('All script writers failed. ' + errors.slice(-3).join(' | '));
}

export function parseJSONLoose(text) {
  if (typeof text !== 'string') return text;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = t.slice(start, end + 1);
    try { return JSON.parse(slice); } catch { /* fall through */ }
    // Remove trailing commas, a common small-model mistake.
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1')); } catch { /* fall through */ }
  }
  throw new Error('The model did not return valid JSON.');
}

export function planFor(options) {
  const seconds = options.duration;
  const fmt = formatOf(options);
  const vertical = FORMATS[fmt].ratio <= 1;
  const pace = PACES[options.pace] || PACES.normal;
  const per = pace.secPerScene * (vertical ? 1 : 1.5);
  const scenes = Math.max(3, Math.min(vertical ? 30 : 45, Math.round(seconds / per)));
  const words = Math.round(seconds * pace.wps);
  return { scenes, words, wordsPerScene: Math.max(4, Math.round(words / scenes)), vertical, fmt };
}

const SYSTEM_WRITER = `You are the head writer and director of a hugely successful faceless animation channel. You make ANY kind of short video a creator asks for: educational explainers, history, science, "what if" scenarios, true stories, fiction and fables, motivational pieces, product or business promos, top-5 lists, funny skits, kids' stories, news recaps.

First, follow the creator's request EXACTLY: topic, angle, tone, point of view, audience, characters, length, ending, language. If they describe specific shots, characters or lines, use them. If they write in another language, write the narration in that language. Never refuse a normal creative request and never lecture.

Then make it great:
1. ACCURACY for anything factual — every fact is correct and mainstream-verifiable (textbooks, encyclopedias, scientific consensus). Dates, names, numbers and places are exact. If a popular belief is a myth or misconception, say so and tell the real story. Never invent quotes, statistics or events. When something is uncertain, say "historians think", "about", "probably". Fiction can be imaginative but stays internally consistent.
2. RETENTION — the first line is a scroll-stopping hook under 12 words (a surprising claim, a question, or an "imagine" moment). Open curiosity loops and pay them off. Short punchy sentences. No filler like "In this video" or "Let's dive in", no "like and subscribe". End on a satisfying payoff, twist or mind-blowing final fact.
3. CINEMATOGRAPHY — every scene is ONE clear shot that literally shows what the narration says at that moment, directed like a high-end 3D animated film.

Rules for the visual prompts:
- Write each "visual" as a detailed image-generation prompt for a single frame: subject, action, setting, era-accurate clothing/architecture/technology, camera angle (close-up, wide establishing shot, low angle, aerial, over-the-shoulder, macro…), lighting (golden hour, rim light, volumetric god rays, moody night), mood.
- Compose for depth: a clear foreground subject, a midground and a distant background, so a moving camera creates parallax.
- Historically and scientifically accurate details (e.g. ancient Greeks wear chitons/himations; no anachronisms).
- Recurring characters must look the same in every scene: define them once in "characters" and paste the SAME description into every visual where they appear.
- No text, letters, captions, logos or watermarks in the images. No gore, no real-person likenesses of private individuals.
- Vary the shots: wide establishing shots, close-ups of faces and hands, macro details, cutaways, aerials, space shots, maps as physical objects.

Output ONLY valid JSON, no markdown.`;

export function writerPrompt(topic, options) {
  const plan = planFor(options);
  const style = STYLES[options.style] || STYLES['cinematic-3d'];
  const where = { '9:16': 'vertical 9:16 YouTube Short / TikTok / Reel', '16:9': 'horizontal 16:9 YouTube video', '1:1': 'square 1:1 social video', '4:5': 'vertical 4:5 feed video' }[plan.fmt];
  const pace = { chill: 'calm and cinematic, with room to breathe', normal: 'brisk', fast: 'very fast and punchy, rapid cuts, short sentences' }[options.pace || 'normal'];
  return `Create a ${where} script.

CREATOR'S REQUEST (follow it exactly):
"""${topic}"""

TARGET LENGTH: about ${options.duration} seconds of narration = about ${plan.words} words total.
SCENES: exactly ${plan.scenes} scenes, about ${plan.wordsPerScene} words of narration each (the hook scene can be shorter).
PACING: ${pace}.
VISUAL STYLE (do not repeat in prompts, it is added automatically): ${style.label}.
${style.direction ? `DIRECTION: ${style.direction}\n` : ''}${options.extra ? `CREATOR NOTES: ${options.extra}\n` : ''}
Return JSON with this exact shape:
{
  "title": "short on-screen title, max 6 words",
  "youtubeTitle": "click-worthy but honest title, under 70 characters",
  "description": "2-3 sentence description of the video. For factual videos add a blank line and 'Sources: ' with 2-4 well-known sources a viewer could check",
  "hashtags": ["5-8 relevant hashtags"],
  "characters": [{"name": "Aristotle", "look": "elderly ancient Greek philosopher, short grey curly beard, receding hairline, cream wool himation draped over one shoulder, leather sandals"}],
  "scenes": [
    {
      "narration": "spoken words for this scene",
      "visual": "detailed single-frame image prompt with foreground, midground and background",
      "onScreenText": "optional tiny label like '350 BC' or 'Eratosthenes' or '' for none",
      "keywords": ["one or two words from the narration to highlight in captions"],
      "camera": one of ${JSON.stringify(CAMERAS)},
      "transition": one of ${JSON.stringify(TRANSITIONS)}
    }
  ]
}

Camera guide: push-in = slow dolly toward the subject (tension, focus); pull-out = reveal; pan-left/pan-right = sideways truck past the scene; tilt-up/tilt-down = crane move; orbit = drift around the subject; vertigo = dolly-zoom for shocking realizations; impact = punch-in for big reveals only. Use "onScreenText" for names, dates, numbers and places only (max 4 words). Write numbers in narration the way they are spoken ("two hundred and forty B.C.").`;
}

const SYSTEM_CHECKER = `You are a meticulous fact-checker with expertise in history, science and geography.
You receive a narration script for an educational video. Find anything that is false, misleading, oversimplified to the point of being wrong, anachronistic, or a popular myth presented as fact (for example: "medieval people believed the Earth was flat" is a myth; Columbus did not prove the Earth was round).
If the script is fiction, comedy, a promo or opinion, only check the real-world facts it mentions and never change story events or jokes.
Fix errors with the smallest possible edit that keeps the sentence length and punchy tone. Do not change correct sentences. Also fix any visual prompt that shows something anachronistic or wrong.
Output ONLY valid JSON.`;

function checkerPrompt(script) {
  const scenes = script.scenes.map((s, i) => ({ i, narration: s.narration, visual: s.visual, onScreenText: s.onScreenText || '' }));
  return `Script title: ${script.title}

SCENES:
${JSON.stringify(scenes, null, 1)}

Return JSON:
{
  "notes": ["one short line per problem you found and how you fixed it; empty array if everything is accurate"],
  "fixes": [{"i": 0, "narration": "corrected narration (omit if unchanged)", "visual": "corrected visual (omit if unchanged)", "onScreenText": "corrected label (omit if unchanged)"}],
  "unverified": ["specific names, dates or numbers you could not confirm from solid knowledge; do NOT change these, just list them so a human can check; empty array if none"]
}`;
}

function cleanText(v, max = 600) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeScript(raw, options) {
  if (!raw || !Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    throw new Error('The script came back without scenes.');
  }
  const scenes = raw.scenes
    .map((s, i) => ({
      id: `s${i}_${Math.random().toString(36).slice(2, 7)}`,
      narration: cleanText(s.narration || s.text || s.voiceover, 900),
      visual: cleanText(s.visual || s.image || s.imagePrompt || s.narration, 1200),
      onScreenText: cleanText(s.onScreenText || s.label || '', 40),
      keywords: (Array.isArray(s.keywords) ? s.keywords : []).map(k => cleanText(k, 40)).filter(Boolean).slice(0, 3),
      camera: CAMERAS.includes(s.camera) ? s.camera : ['push-in', 'pan-left', 'pull-out', 'orbit', 'pan-right', 'tilt-up'][i % 6],
      transition: TRANSITIONS.includes(s.transition) ? s.transition : TRANSITIONS[i % 4],
      seed: Math.floor(Math.random() * 1e9),
    }))
    .filter(s => s.narration);
  if (!scenes.length) throw new Error('The script came back empty.');
  return {
    title: cleanText(raw.title || options.topic, 60),
    youtubeTitle: cleanText(raw.youtubeTitle || raw.title || options.topic, 100),
    description: String(raw.description || '').trim().slice(0, 3000),
    hashtags: (Array.isArray(raw.hashtags) ? raw.hashtags : []).map(h => cleanText(h, 40)).filter(Boolean)
      .map(h => (h.startsWith('#') ? h : '#' + h.replace(/\s+/g, ''))).slice(0, 10),
    characters: (Array.isArray(raw.characters) ? raw.characters : [])
      .map(c => ({ name: cleanText(c.name, 60), look: cleanText(c.look || c.description, 400) }))
      .filter(c => c.name && c.look),
    scenes,
  };
}

export async function writeScript(topic, options, settings, { signal, log } = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_WRITER },
    { role: 'user', content: writerPrompt(topic, options) },
  ];
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, provider } = await chat(messages, settings, { signal, log, temperature: 0.6 });
    try {
      const script = normalizeScript(parseJSONLoose(text), { ...options, topic });
      return { script, provider };
    } catch (e) {
      lastErr = e;
      log?.(`Script was malformed (${e.message}) — asking again.`);
    }
  }
  throw lastErr;
}

export async function factCheck(script, settings, { signal, log, avoid } = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_CHECKER },
    { role: 'user', content: checkerPrompt(script) },
  ];
  // Low temperature: a checker should be consistent, not creative.
  const { text } = await chat(messages, settings, { signal, log, temperature: 0.1, avoid });
  const data = parseJSONLoose(text);
  const notes = (Array.isArray(data.notes) ? data.notes : []).map(n => cleanText(n, 300)).filter(Boolean);
  const unverified = (Array.isArray(data.unverified) ? data.unverified : []).map(n => cleanText(n, 200)).filter(Boolean).slice(0, 6);
  if (unverified.length) notes.push(`Please double-check before publishing: ${unverified.join('; ')}`);
  let changed = 0;
  for (const f of Array.isArray(data.fixes) ? data.fixes : []) {
    const scene = script.scenes[Number(f.i)];
    if (!scene) continue;
    for (const field of ['narration', 'visual', 'onScreenText']) {
      const v = cleanText(f[field], field === 'onScreenText' ? 40 : 1200);
      if (v && v !== scene[field]) { scene[field] = v; scene.dirty = true; changed++; }
    }
  }
  return { notes, changed };
}

// Build the final image prompt for a scene: scene visual + recurring character looks + style.
export function imagePromptFor(scene, script, styleKey) {
  const style = STYLES[styleKey] || STYLES['cinematic-3d'];
  let prompt = scene.visual;
  for (const c of script.characters || []) {
    const first = c.name.split(' ')[0];
    if (new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(prompt) && !prompt.includes(c.look.slice(0, 30))) {
      prompt += `. ${c.name}: ${c.look}`;
    }
  }
  return `${prompt}. ${style.prompt}, clear foreground subject with deep background, no text, no letters, no watermark`;
}

// Split user-written text into scenes (used for "I'll write my own script" mode).
export function scriptFromText(text, options) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [text];
  const plan = planFor({ ...options, duration: Math.max(10, Math.round(text.split(/\s+/).length / WORDS_PER_SECOND)) });
  const target = Math.max(6, plan.wordsPerScene);
  const scenes = [];
  let cur = '';
  for (const s of sentences) {
    const next = (cur + ' ' + s).trim();
    if (cur && next.split(' ').length > target) { scenes.push(cur); cur = s.trim(); } else cur = next;
  }
  if (cur) scenes.push(cur);
  return normalizeScript({
    title: options.topic?.slice(0, 50) || 'My video',
    scenes: scenes.map(n => ({ narration: n, visual: `${options.topic || ''}: ${n}` })),
  }, options);
}
