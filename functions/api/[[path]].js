// Loomy account API (Cloudflare Pages Functions + D1).
// Optional Google sign-in. A signed-in person's library, settings (minus API keys) and boards
// are stored under their Google account id so they follow them to other devices.
//
// Bindings (set by the deploy script):  DB = D1 database,  GOOGLE_CLIENT_ID = OAuth web client id.
// Without them the site still works; /api/config just reports that sign-in is off.

const SESSION_DAYS = 30;
const MAX_VALUE = 900_000;            // characters per stored item
const SYNC_KEYS = new Set([
  'storyforge.settings.v1', 'storyforge.history.v1',
  'explainer.settings.v1', 'explainer.history.v1',
  'ideaboard.v1',
]);
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let schemaReady = null;
let jwksCache = { keys: null, until: 0 };

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = (params.path || []).join('/');
  try {
    // Writes must come from this site (cookies are SameSite=Lax as well).
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('Origin');
      if (origin && new URL(origin).host !== url.host) return json({ error: 'Wrong origin' }, 403);
    }
    if (path === 'config' && request.method === 'GET') {
      return json({ googleClientId: env.GOOGLE_CLIENT_ID || null, sync: !!env.DB, ai: !!(env.AI || env.GEMINI_KEY || env.GROQ_KEY || env.ELEVEN_KEY), writer: env.GROQ_KEY ? 'groq' : env.GEMINI_KEY ? 'gemini' : env.AI ? 'cloudflare' : null, voice: env.GEMINI_KEY ? 'gemini' : env.ELEVEN_KEY ? 'elevenlabs' : env.AI ? 'aura' : null });
    }
    if (path === 'image' && request.method === 'POST') return await image(request, env);
    if (path === 'write' && request.method === 'POST') return await write(request, env);
    if (path === 'speak' && request.method === 'POST') return await speak(request, env);
    if (path === 'runway' && request.method === 'POST') return await runway(request);
    if (path === 'fal' && request.method === 'POST') return await fal(request);
    if (path === 'transcribe' && request.method === 'POST') return await transcribe(request, env);
    if (!env.DB || !env.GOOGLE_CLIENT_ID) {
      // Signed-out is the normal state on a site without sign-in: answer it without an error status.
      if (path === 'me') return json({ user: null });
      return json({ error: 'Sign-in is not set up on this site.' }, 503);
    }
    await ensureSchema(env.DB);

    if (path === 'login' && request.method === 'POST') return await login(request, env, url);
    if (path === 'logout' && request.method === 'POST') return await logout(request, env, url);

    const user = await currentUser(request, env);
    // Signed out is a normal answer, not an error, so the browser console stays clean.
    if (path === 'me' && request.method === 'GET') return json({ user: user ? publicUser(user) : null });
    if (!user) return json({ error: 'Not signed in' }, 401);

    if (path === 'data' && request.method === 'GET') return await getData(env, user);
    if (path === 'data' && request.method === 'PUT') return await putData(request, env, user);
    if (path === 'account' && request.method === 'DELETE') return await deleteAccount(request, env, url, user);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.status ? e.message : 'Server error' }, e.status || 500);
  }
}

// ---------- images (Cloudflare Workers AI, free daily allowance) ----------
// FLUX.1 schnell on the account's own free allowance: about 200 backgrounds a day. When the
// allowance is used up Cloudflare refuses (no charge on the free plan) and the page falls back.
async function image(request, env) {
  // Every outcome is a 200: a picture, or JSON saying why not. A failed request would show up as a
  // red error in the browser console even though the page handles it.
  if (!env.AI) return json({ ok: false, error: 'Cloudflare AI is not connected.' });
  const body = await readJson(request, 6000);
  const prompt = String(body.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!prompt) return json({ ok: false, error: 'No prompt' });
  try {
    // FLUX.1 schnell accepts only prompt and steps (a "seed" is refused).
    const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 4 });
    const b64 = out?.image;
    if (!b64) return json({ ok: false, error: 'No picture came back' });
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
  } catch (e) {
    const msg = String(e?.message || e);
    const used = /quota|limit|neuron|exceed|4006|capacity|daily/i.test(msg);
    return json({ ok: false, used, error: used ? 'The free daily picture allowance is used up.' : msg.slice(0, 200), detail: msg.slice(0, 300) });
  }
}

// ---------- script writing (Cloudflare Workers AI, gpt-oss-120b) ----------
function pickText(out) {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out.response === 'string') return out.response;
  if (out.response && typeof out.response === 'object') return JSON.stringify(out.response);
  const c = out.choices?.[0]?.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(out.output)) {
    return out.output.filter(o => o?.type === 'message').flatMap(o => o.content || []).map(x => x?.text || '').join('');
  }
  if (typeof out.output_text === 'string') return out.output_text;
  return '';
}

// Optional writers stored as Pages secrets (GEMINI_KEY, GROQ_KEY): free tiers, used before the
// Cloudflare allowance (Gemini) or after it (Groq). Keys stay on the server.
let geminiTrace = [];
async function geminiOne(env, messages, temperature, max_tokens, model, think) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
    body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { temperature, maxOutputTokens: Math.max(max_tokens, 1024), ...(think ? { thinkingConfig: think } : {}) } }),
  });
  const j = await res.json().catch(() => ({}));
  const text = (j.candidates?.[0]?.content?.parts || []).filter(x => !x.thought).map(x => x.text || '').join('').trim();
  if (res.ok && text) return text;
  throw new Error(`${res.status} ${j.error?.message || 'no text'}`);
}
async function groqOne(env, messages, temperature, max_tokens, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_KEY}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: Math.min(max_tokens, 8000) }),
  });
  const j = await res.json().catch(() => ({}));
  const text = String(j.choices?.[0]?.message?.content || '').trim();
  if (res.ok && text) return text;
  throw new Error(`${res.status} ${j.error?.message || 'no text'}`);
}
async function geminiWrite(env, messages, temperature, max_tokens) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  let last = '';
  geminiTrace = [];
  // Short thinking keeps answers fast. Newer models take thinkingLevel; if one refuses a setting
  // (400), the next attempt asks without it.
  const tries = [['gemini-flash-lite-latest', null], ['gemini-flash-latest', { thinkingLevel: 'low' }]];
  for (const [model, think] of tries) {
    const t0 = Date.now();
    // A busy model can queue a request for over a minute: give up after 25 seconds and move on.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { temperature, maxOutputTokens: Math.max(max_tokens, 8192), ...(think ? { thinkingConfig: think } : {}) } }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e?.message || e) } }) }));
    const j = await res.json().catch(() => ({}));
    const text = (j.candidates?.[0]?.content?.parts || []).filter(x => !x.thought).map(x => x.text || '').join('').trim();
    geminiTrace.push(`${model}${think ? '+' + Object.keys(think)[0] : ''}:${res.status}:${Date.now() - t0}ms`);
    if (res.ok && text) return text;
    last = j.error?.message || `Gemini said ${res.status}`;
    if (![0, 400, 404, 429, 500, 503].includes(res.status)) break;
  }
  throw new Error(last);
}
// ---------- transcription (Clipping section): Groq Whisper with word timings ----------
// The page sends small audio pieces (about 10 minutes of 16 kHz mono MP3 each); the key stays here.
async function transcribe(request, env) {
  if (!env.GROQ_KEY) return json({ ok: false, error: 'Transcription needs a Groq key on the server (tools/add-ai-keys.sh).' });
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'Send the audio as a form upload.' }); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'No audio' });
  if (file.size > 24 * 1024 * 1024) return json({ ok: false, error: 'Audio piece too large (24 MB max)' });
  const lang = String(form.get('language') || '').slice(0, 5);
  let last = '';
  for (const model of ['whisper-large-v3-turbo', 'whisper-large-v3']) {
    const out = new FormData();
    out.append('file', file, file.name || 'audio.mp3');
    out.append('model', model);
    out.append('response_format', 'verbose_json');
    out.append('timestamp_granularities[]', 'word');
    out.append('timestamp_granularities[]', 'segment');
    out.append('temperature', '0');
    if (/^[a-z]{2}$/.test(lang)) out.append('language', lang);
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${env.GROQ_KEY}` }, body: out, signal: AbortSignal.timeout(120000),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e?.message || e) } }) }));
    const j = await res.json().catch(() => ({}));
    if (res.ok && (j.text != null)) {
      return json({
        ok: true, model, language: j.language || null, duration: j.duration || null, text: j.text,
        words: (j.words || []).map(w => ({ w: w.word, s: w.start, e: w.end })),
        segments: (j.segments || []).map(g => ({ s: g.start, e: g.end, t: g.text })),
      });
    }
    last = j.error?.message || `Groq said ${res.status}`;
    if (res.status === 429) return json({ ok: false, limited: true, error: last.slice(0, 300) });
    if (![0, 400, 404].includes(res.status)) break;
  }
  return json({ ok: false, error: last.slice(0, 300) });
}

async function groqWrite(env, messages, temperature, max_tokens) {
  let last = '';
  // gpt-oss-120b answers in well under a second on Groq; short thinking keeps it that way.
  for (const [model, extra] of [['openai/gpt-oss-120b', { reasoning_effort: 'low' }], ['openai/gpt-oss-120b', {}], ['openai/gpt-oss-20b', {}]]) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_KEY}` },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model, messages, temperature, max_tokens: Math.min(Math.max(max_tokens, 4000), 8000), ...extra }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e?.message || e) } }) }));
    const j = await res.json().catch(() => ({}));
    const text = String(j.choices?.[0]?.message?.content || '').trim();
    if (res.ok && text) return text;
    last = j.error?.message || `Groq said ${res.status}`;
    if (![0, 400, 404, 413, 429].includes(res.status)) break;
  }
  throw new Error(last);
}

async function write(request, env) {
  if (!env.AI && !env.GEMINI_KEY && !env.GROQ_KEY) return json({ ok: false, error: 'Cloudflare AI is not connected.' });
  const body = await readJson(request, 1500000);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && typeof m.content === 'string' && m.content.trim())
    .slice(0, 16)
    .map(m => ({ role: ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user', content: m.content.slice(0, 400000) }));
  if (!messages.length) return json({ ok: false, error: 'No messages' });
  const temperature = Math.max(0.05, Math.min(1, Number(body.temperature) || 0.6));
  const max_tokens = Math.max(256, Math.min(8000, Math.floor(Number(body.max_tokens) || 6000)));
  const notes = [];
  // Diagnostics: try one voice or picture model once ({only: "tts:groq:<model>:<voice>", "tts:gemini:<model>:<voice>",
  // "img:gemini:<model>"}) and report the status, the time and a short sample of what came back.
  if (typeof body.only === 'string' && /^(tts|img):(groq|gemini):/.test(body.only)) {
    const [kind, who, model, voice] = body.only.split(':');
    const t0 = Date.now();
    const text = String(body.text || 'Okay, so here is the crazy part. The ship was called unsinkable, and it sank in under three hours!').slice(0, 400);
    let res;
    if (kind === 'tts' && who === 'groq') {
      res = await fetch('https://api.groq.com/openai/v1/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_KEY}` }, body: JSON.stringify({ model, input: text, voice: voice || 'troy', response_format: 'wav' }) });
      const ct = res.headers.get('Content-Type') || '';
      if (res.ok && /audio|octet/.test(ct)) { const buf = new Uint8Array(await res.arrayBuffer()); return json({ ok: true, ms: Date.now() - t0, type: ct, bytes: buf.length, b64: btoa(String.fromCharCode(...buf.slice(0, 600000).reduce((a, b) => (a.push(b), a), []).slice(0, 0))) }); }
      return json({ ok: false, ms: Date.now() - t0, status: res.status, body: (await res.text()).slice(0, 400) });
    }
    const st = body.style || 'say';
    const spoken = st === 'say' ? `Say excitedly: ${text}` : text;
    const gen = (kind === 'tts')
      ? { ...(st === 'system' ? { systemInstruction: { parts: [{ text: 'You are an energetic, fast-paced YouTube Shorts narrator. Read the user text exactly, with excitement and natural rises and falls.' }] } } : {}), contents: [{ parts: [{ text: spoken }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Puck' } } } } }
      : { contents: [{ parts: [{ text: body.text || 'Stylized 3D cartoon game environment: the wooden deck of an old ocean liner at sea, vivid colors, wide angle, no people, no text' }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '9:16' } } };
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: JSON.stringify(gen) });
    const j = await res.json().catch(() => ({}));
    const part = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData);
    if (res.ok && part) return json({ ok: true, ms: Date.now() - t0, type: part.inlineData.mimeType, bytes: Math.round(part.inlineData.data.length * 0.75), data: body.full ? part.inlineData.data : undefined });
    return json({ ok: false, ms: Date.now() - t0, status: res.status, body: JSON.stringify(j.error || j).slice(0, 400) });
  }
  // Diagnostics: which models the stored keys can use (names only).
  if (body.only === 'models') {
    const out = {};
    if (env.GROQ_KEY) { const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${env.GROQ_KEY}` } }).then(x => x.json()).catch(() => ({})); out.groq = (r.data || []).map(m => m.id); }
    if (env.GEMINI_KEY) { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_KEY } }).then(x => x.json()).catch(() => ({})); out.gemini = (r.models || []).map(m => `${m.name.replace('models/', '')}[${(m.supportedGenerationMethods || []).join('/')}]`); }
    return json({ ok: true, ...out });
  }
  // Diagnostics: {only: "gemini:<model>" | "groq:<model>"} runs one writer once and reports its time.
  if (typeof body.only === 'string' && /^(gemini|groq):[a-z0-9.\-\/]{2,60}$/.test(body.only)) {
    const [who, model] = body.only.split(':');
    const t0 = Date.now();
    try {
      const text = who === 'gemini' ? await geminiOne(env, messages, temperature, max_tokens, model, body.think || null) : await groqOne(env, messages, temperature, max_tokens, model);
      return json({ ok: true, text, by: who, model, ms: Date.now() - t0 });
    } catch (e) { return json({ ok: false, error: String(e?.message || e).slice(0, 300), ms: Date.now() - t0 }); }
  }
  // Fastest first: Groq (well under a second), then Gemini, then the Cloudflare allowance.
  if (env.GROQ_KEY) {
    try { const t0 = Date.now(); const text = await groqWrite(env, messages, temperature, max_tokens); return json({ ok: true, text, by: 'groq', ms: Date.now() - t0 }); }
    catch (e) { notes.push(`Groq: ${String(e?.message || e).slice(0, 120)}`); }
  }
  if (env.GEMINI_KEY) {
    try { const t0 = Date.now(); const text = await geminiWrite(env, messages, temperature, max_tokens); return json({ ok: true, text, by: 'gemini', ms: Date.now() - t0, trace: geminiTrace }); }
    catch (e) { notes.push(`Gemini: ${String(e?.message || e).slice(0, 120)}`); }
  }
  const groq = async () => null;
  if (!env.AI) return json({ ok: false, error: notes.join(' · ') || 'No writer available' });
  try {
    // Short thinking makes scripts come back in about half the time. If this model version
    // rejects the setting (or answers empty), ask again the plain way.
    let out = null, text = '';
    try {
      out = await env.AI.run('@cf/openai/gpt-oss-120b', { messages, max_tokens, temperature, reasoning: { effort: 'low' } });
      text = pickText(out).trim();
    } catch (e) {
      if (/quota|limit|neuron|exceed|4006|capacity|daily/i.test(String(e?.message || e))) throw e;
    }
    if (!text) {
      out = await env.AI.run('@cf/openai/gpt-oss-120b', { messages, max_tokens, temperature });
      text = pickText(out).trim();
    }
    if (!text) return (await groq()) || json({ ok: false, error: `Empty answer (${Object.keys(out || {}).join(', ') || 'nothing'})` });
    return json({ ok: true, text, by: 'cloudflare' });
  } catch (e) {
    const fallback = await groq();
    if (fallback) return fallback;
    const msg = String(e?.message || e);
    const used = /quota|limit|neuron|exceed|4006|capacity|daily/i.test(msg);
    return json({ ok: false, used, error: used ? 'The free daily AI allowance is used up.' : msg.slice(0, 200), detail: [msg.slice(0, 300), ...notes].join(' · ') });
  }
}

// ---------- voice (Cloudflare Workers AI, Deepgram Aura-2) ----------
// A natural, context-aware narrator voice on the site's free daily allowance ($0.03 per 1,000
// characters of it). When the allowance is used up, the page falls back to the in-browser voice.
const AURA_SPEAKERS = new Set('amalthea andromeda apollo arcas aries asteria athena atlas aurora callista cora cordelia delia draco electra harmonia helena hera hermes hyperion iris janus juno jupiter luna mars minerva neptune odysseus ophelia orion orpheus pandora phoebe pluto saturn thalia theia vesta zeus'.split(' '));
// With an ElevenLabs key stored as a Pages secret (ELEVEN_KEY), its voices come first: the most
// human-sounding. When its monthly allowance runs out, Aura-2 takes over.
const AURA_FEMALE = new Set('amalthea andromeda asteria athena aurora callista cora cordelia delia electra harmonia helena hera iris juno luna minerva ophelia pandora phoebe thalia theia vesta'.split(' '));
async function elevenVoice(env, text, speaker) {
  const voice = AURA_FEMALE.has(speaker) ? (env.ELEVEN_VOICE_F || 'EXAVITQu4vr4xnSDxMaL') : (env.ELEVEN_VOICE_M || 'JBFqnCBsd6RMkjVDRZzb');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': env.ELEVEN_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: env.ELEVEN_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.4 } }),
  });
  if (!res.ok || !/audio/.test(res.headers.get('Content-Type') || '')) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`ElevenLabs said ${res.status}: ${String(j.detail?.status || j.detail?.message || j.detail || '').slice(0, 120)}`);
  }
  return res;
}
// Gemini voices (free on the stored Gemini key): very natural, and they follow a direction for
// the delivery, so they read like an energetic Shorts narrator. Each model has its own daily
// allowance, so a used-up one falls through to the next.
const GEMINI_TTS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
const DIRECTION = 'Read this aloud like a top YouTube Shorts storyteller: energetic, fast-paced and punchy, curious and amused, with natural rises and falls, like telling a friend something amazing. Never robotic. Read only the words after the colon:';
function wavFromPcm(pcm, rate = 24000) {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}
async function geminiVoice(env, text, speaker) {
  const voice = AURA_FEMALE.has(speaker) ? (env.GEMINI_VOICE_F || 'Zephyr') : (env.GEMINI_VOICE_M || 'Puck');
  let last = '';
  for (const model of GEMINI_TTS) for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, signal: AbortSignal.timeout(40000),
      body: JSON.stringify({ contents: [{ parts: [{ text: `${DIRECTION} ${text}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e?.message || e) } }) }));
    const j = await res.json().catch(() => ({}));
    const part = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData?.data);
    if (res.ok && part) {
      const raw = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
      const mime = part.inlineData.mimeType || '';
      if (/wav/i.test(mime)) return { bytes: raw, type: 'audio/wav' };
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1]) || 24000;
      return { bytes: wavFromPcm(raw, rate), type: 'audio/wav' };
    }
    last = `${model} ${res.status}`;
    // A per-minute limit: wait as asked (up to 25 s) and keep the same voice, rather than switching
    // voices halfway through a video. A daily limit (long wait) moves on to the next model.
    const wait = Number(/(\d+(?:\.\d+)?)s/.exec(JSON.stringify(j.error?.details || '').match(/retryDelay[^,}]*/)?.[0] || '')?.[1]);
    if (res.status === 429 && wait && wait <= 25 && attempt < 2) { await new Promise(r => setTimeout(r, (wait + 1) * 1000)); continue; }
    break;
  }
  throw new Error(`Gemini voice: ${last}`);
}

async function speak(request, env) {
  if (!env.AI && !env.ELEVEN_KEY && !env.GEMINI_KEY) return json({ ok: false, error: 'Cloudflare AI is not connected.' });
  const body = await readJson(request, 8000);
  const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
  if (!text) return json({ ok: false, error: 'No text' });
  const speaker = AURA_SPEAKERS.has(body.speaker) ? body.speaker : 'arcas';
  let elevenNote = '';
  if (env.GEMINI_KEY) {
    try {
      const v = await geminiVoice(env, text, speaker);
      return new Response(v.bytes, { headers: { 'Content-Type': v.type, 'Cache-Control': 'no-store', 'X-Loomy-Voice': 'gemini' } });
    } catch (e) { elevenNote = String(e?.message || e).slice(0, 80) + ' / '; }
  }
  if (env.ELEVEN_KEY) {
    try {
      const res = await elevenVoice(env, text, speaker);
      return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Loomy-Voice': 'elevenlabs' } });
    } catch (e) { elevenNote += String(e?.message || e).slice(0, 120); }
  }
  if (!env.AI) return json({ ok: false, error: elevenNote || 'No voice available' });
  try {
    const out = await env.AI.run('@cf/deepgram/aura-2-en', { text, speaker, encoding: 'mp3' });
    const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Loomy-Voice': 'aura', ...(elevenNote ? { 'X-Loomy-Note': elevenNote.replace(/[^\x20-\x7E]/g, ' ').slice(0, 160) } : {}) };
    if (out instanceof ReadableStream || out instanceof ArrayBuffer || ArrayBuffer.isView(out)) return new Response(out, { headers });
    if (out?.audio) return new Response(Uint8Array.from(atob(out.audio), c => c.charCodeAt(0)), { headers });
    return json({ ok: false, error: 'No audio came back' });
  } catch (e) {
    const msg = String(e?.message || e);
    const used = /quota|limit|neuron|exceed|4006|capacity|daily/i.test(msg);
    return json({ ok: false, used, error: used ? 'The free daily voice allowance is used up.' : msg.slice(0, 200), detail: msg.slice(0, 300) });
  }
}

// ---------- Runway (optional, the visitor's own paid key) ----------
// Turns a finished cartoon frame into a real animated clip. The key comes from the page with each
// request and is passed straight to Runway; it is never stored here.
const RUNWAY = 'https://api.dev.runwayml.com/v1';
async function runway(request) {
  const body = await readJson(request, 7_000_000);
  const key = String(body.key || '').trim();
  if (!/^key_[A-Za-z0-9]{20,}$/.test(key) && key.length < 20) return json({ ok: false, error: 'Add your Runway API key in Settings.' });
  const headers = { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' };
  try {
    if (body.action === 'start') {
      const res = await fetch(`${RUNWAY}/image_to_video`, {
        method: 'POST', headers,
        body: JSON.stringify({
          model: body.model || 'gen4_turbo',
          promptImage: String(body.image || ''),
          promptText: String(body.prompt || '').slice(0, 900),
          ratio: body.ratio || '720:1280',
          duration: body.duration === 10 ? 10 : 5,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) return json({ ok: false, error: j.error || j.message || `Runway said ${res.status}` });
      return json({ ok: true, id: j.id });
    }
    if (body.action === 'poll') {
      const res = await fetch(`${RUNWAY}/tasks/${encodeURIComponent(String(body.id || ''))}`, { headers });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return json({ ok: false, error: j.error || `Runway said ${res.status}` });
      return json({ ok: true, status: j.status, progress: j.progress ?? null, output: Array.isArray(j.output) ? j.output : [], failure: j.failure || j.failureCode || null });
    }
    if (body.action === 'fetch') {
      // Download the finished clip for the page (Runway's file host may not allow browsers).
      let u = null;
      try { u = new URL(String(body.url || '')); } catch { /* bad address */ }
      if (!u || u.protocol !== 'https:') return json({ ok: false, error: 'Bad clip address' });
      const res = await fetch(u.toString());
      if (!res.ok) return json({ ok: false, error: `Clip download said ${res.status}` });
      return new Response(res.body, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'video/mp4', 'Cache-Control': 'no-store' } });
    }
    return json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}

// ---------- fal.ai (optional, the visitor's own paid key): Kling, Veo, Hailuo, Wan ----------
// One key, many image-to-video models. The key is passed through to fal and never stored.
async function fal(request) {
  const body = await readJson(request, 7_000_000);
  const key = String(body.key || '').trim();
  if (key.length < 20) return json({ ok: false, error: 'Add your fal.ai API key in Settings.' });
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  const onFal = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' && /(^|\.)fal\.run$/.test(x.hostname) ? x.toString() : null; } catch { return null; } };
  try {
    if (body.action === 'start') {
      const model = String(body.model || '').trim();
      if (!/^[a-z0-9-]+\/[a-z0-9._\/-]+$/i.test(model)) return json({ ok: false, error: 'Pick a fal.ai model in Settings.' });
      const res = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(body.input || {}) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.request_id) return json({ ok: false, error: j.detail ? JSON.stringify(j.detail).slice(0, 200) : (j.error || `fal said ${res.status}`) });
      return json({ ok: true, status_url: j.status_url, response_url: j.response_url });
    }
    if (body.action === 'poll') {
      const u = onFal(body.status_url);
      if (!u) return json({ ok: false, error: 'Bad status address' });
      const res = await fetch(u, { headers });
      const j = await res.json().catch(() => ({}));
      return json({ ok: res.ok, status: j.status || null, error: res.ok ? null : `fal said ${res.status}` });
    }
    if (body.action === 'result') {
      const u = onFal(body.response_url);
      if (!u) return json({ ok: false, error: 'Bad result address' });
      const res = await fetch(u, { headers });
      const j = await res.json().catch(() => ({}));
      const url = j?.video?.url || j?.videos?.[0]?.url || j?.output?.video?.url || null;
      return json({ ok: !!url, url, error: url ? null : (j.detail ? JSON.stringify(j.detail).slice(0, 200) : 'No clip in the answer') });
    }
    if (body.action === 'fetch') {
      // Only fal's own file hosts: this is not a general download relay.
      let u = null;
      try { u = new URL(String(body.url || '')); } catch { /* bad address */ }
      if (!u || u.protocol !== 'https:' || !/(^|\.)(fal\.media|fal\.run|fal\.ai)$/.test(u.hostname)) return json({ ok: false, error: 'Bad clip address' });
      const res = await fetch(u.toString());
      if (!res.ok) return json({ ok: false, error: `Clip download said ${res.status}` });
      return new Response(res.body, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'video/mp4', 'Cache-Control': 'no-store' } });
    }
    return json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}

// ---------- auth ----------
async function login(request, env, url) {
  const body = await readJson(request, 20_000);
  const claims = await verifyGoogleToken(String(body.credential || ''), env);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO users (sub, email, name, picture, created, seen) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
    ON CONFLICT(sub) DO UPDATE SET email = ?2, name = ?3, picture = ?4, seen = ?5`)
    .bind(claims.sub, claims.email || '', claims.name || '', claims.picture || '', now).run();
  const token = randomHex(32);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires < ?1').bind(now),
    env.DB.prepare('INSERT INTO sessions (id, sub, expires) VALUES (?1, ?2, ?3)').bind(await sha256(token), claims.sub, now + SESSION_DAYS * 864e5),
  ]);
  return json({ user: publicUser(claims) }, 200, { 'Set-Cookie': cookie(url, token, SESSION_DAYS * 86400) });
}

async function logout(request, env, url) {
  const token = readCookie(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(url, '', 0) });
}

async function currentUser(request, env) {
  const token = readCookie(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return env.DB.prepare(`SELECT u.sub, u.email, u.name, u.picture FROM sessions s JOIN users u ON u.sub = s.sub
    WHERE s.id = ?1 AND s.expires > ?2`).bind(await sha256(token), Date.now()).first();
}

async function deleteAccount(request, env, url, user) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM data WHERE sub = ?1').bind(user.sub),
    env.DB.prepare('DELETE FROM sessions WHERE sub = ?1').bind(user.sub),
    env.DB.prepare('DELETE FROM users WHERE sub = ?1').bind(user.sub),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(url, '', 0) });
}

// ---------- data ----------
async function getData(env, user) {
  const { results } = await env.DB.prepare('SELECT k, v, updated FROM data WHERE sub = ?1').bind(user.sub).all();
  const items = {};
  for (const r of results || []) items[r.k] = { v: r.v, updated: r.updated };
  return json({ items });
}

async function putData(request, env, user) {
  const body = await readJson(request, 5 * MAX_VALUE + 10_000);
  const items = body && typeof body.items === 'object' ? body.items : {};
  const now = Date.now();
  const stmts = [];
  const saved = {};
  for (const [k, item] of Object.entries(items)) {
    if (!SYNC_KEYS.has(k) || typeof item?.v !== 'string') continue;
    if (item.v.length > MAX_VALUE) continue;
    const updated = Math.min(now, Math.max(0, Number(item.updated) || now));
    // Keep whichever copy is newer.
    stmts.push(env.DB.prepare(`INSERT INTO data (sub, k, v, updated) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(sub, k) DO UPDATE SET v = excluded.v, updated = excluded.updated WHERE excluded.updated >= data.updated`)
      .bind(user.sub, k, item.v, updated));
    saved[k] = updated;
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, saved });
}

// ---------- Google ID token ----------
async function verifyGoogleToken(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw httpError(400, 'Bad sign-in token');
  let header, claims;
  try { header = JSON.parse(b64urlText(parts[0])); claims = JSON.parse(b64urlText(parts[1])); }
  catch { throw httpError(400, 'Bad sign-in token'); }
  if (header.alg !== 'RS256') throw httpError(401, 'Bad sign-in token');
  const jwk = (await googleKeys(env)).find(k => k.kid === header.kid);
  if (!jwk) throw httpError(401, 'Sign-in key not recognised. Try again.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw httpError(401, 'Sign-in token failed its check');
  const now = Date.now() / 1000;
  if (!GOOGLE_ISS.has(claims.iss)) throw httpError(401, 'Token is not from Google');
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw httpError(401, 'Token is for a different app');
  if (!(claims.exp > now - 60)) throw httpError(401, 'Sign-in expired. Try again.');
  if (!claims.sub) throw httpError(401, 'Bad sign-in token');
  return claims;
}

async function googleKeys(env) {
  if (jwksCache.keys && jwksCache.until > Date.now()) return jwksCache.keys;
  // DEV_JWKS_URL exists only for local tests; production uses Google's keys.
  const res = await fetch(env.DEV_JWKS_URL || GOOGLE_JWKS);
  if (!res.ok) throw httpError(502, 'Could not reach Google. Try again.');
  const { keys } = await res.json();
  jwksCache = { keys, until: Date.now() + 3600e3 };
  return keys;
}

// ---------- helpers ----------
async function ensureSchema(db) {
  schemaReady ||= db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS users (sub TEXT PRIMARY KEY, email TEXT, name TEXT, picture TEXT, created INTEGER, seen INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, sub TEXT NOT NULL, expires INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS data (sub TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (sub, k))'),
  ]).catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}
function publicUser(u) { return { name: u.name || '', email: u.email || '', picture: u.picture || '' }; }
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
async function readJson(request, limit) {
  const text = await request.text();
  if (text.length > limit) throw httpError(413, 'Too much data');
  try { return JSON.parse(text); } catch { throw httpError(400, 'Bad request'); }
}
function cookie(url, value, maxAge) {
  return `loomy_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function readCookie(request) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)loomy_sid=([^;]+)/);
  return m ? m[1] : null;
}
function randomHex(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function b64urlText(s) { return new TextDecoder().decode(b64urlBytes(s)); }
