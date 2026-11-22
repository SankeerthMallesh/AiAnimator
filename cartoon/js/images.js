import { sharpenBitmap } from './sharpen.js';
import { FORMATS, formatOf } from './presets.js';
import { fetchTimeout } from './net.js';
import { isSafeImage } from './safety.js';

// Free AI image generation. Pollinations needs no key; Hugging Face uses a free token.
// Always resolves: if every provider fails the scene gets a generated "poster" fallback.

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

// Image generation time grows with pixel count, and the 3D camera and the 720p export never use
// more than ~600px on the short side anyway. So 720p exports get compact images (about 45% fewer
// pixels, noticeably faster), while 1080p / 2K keep the full-size ones.
export function imageSize(options, outputShortSide = 1080) {
  const f = FORMATS[formatOf(options)];
  return { ...(outputShortSide <= 720 ? f.imageCompact : f.image) };
}

function pollinationsURL(prompt, { width, height, seed }, s) {
  const q = new URLSearchParams({
    width: String(width), height: String(height), seed: String(seed),
    model: s.pollinationsImageModel || 'flux', nologo: 'true', private: 'true', enhance: 'false', safe: 'true',
  });
  const p = encodeURIComponent(prompt.slice(0, 1500));
  if (s.pollinationsKey) {
    q.set('key', s.pollinationsKey);
    return `https://gen.pollinations.ai/image/${p}?${q}`;
  }
  q.set('referrer', 'storyforge');
  return `https://image.pollinations.ai/prompt/${p}?${q}`;
}

async function blobToBitmap(blob, trimLogo = false) {
  if (!blob || blob.size < 2000 || !/^image\//.test(blob.type || 'image/')) {
    throw new Error('Not an image');
  }
  const bmp = await createImageBitmap(blob);
  if (!trimLogo) return sharpenBitmap(bmp);
  // The free no-key service stamps its logo in the bottom-right corner and ignores nologo.
  // Cut that strip off so it never shows up in a video.
  const cut = await createImageBitmap(bmp, 0, 0, bmp.width, Math.round(bmp.height * 0.9));
  bmp.close?.();
  return sharpenBitmap(cut);
}

const IMAGE_TIMEOUT_MS = 50000; // a stalled request is retried instead of holding a slot forever

let keyRejected = false; // set when the saved Pollinations key is refused, for the rest of this visit

// Gemini image generation with the user's own (free) Gemini key. null = untested, false = not available for this key.
let geminiImages = null;
const GEMINI_IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-2.0-flash-preview-image-generation'];
let geminiImageModel = null;

function b64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type || 'image/png' });
}

async function geminiImage(prompt, { width, height }, s, signal) {
  const ratio = width / height;
  const aspectRatio = ratio < 0.65 ? '9:16' : ratio < 0.9 ? '4:5' : ratio < 1.2 ? '1:1' : '16:9';
  const models = geminiImageModel ? [geminiImageModel] : GEMINI_IMAGE_MODELS;
  let last;
  for (const model of models) {
    for (const withRatio of [true, false]) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
      const generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
      if (withRatio) generationConfig.imageConfig = { aspectRatio };
      const text = withRatio ? prompt : `${prompt}. Aspect ratio ${aspectRatio}${ratio < 1 ? ', vertical portrait composition' : ''}.`;
      const { res, data } = await fetchTimeout(url, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Generate an image: ${text}` }] }], generationConfig }),
      }, IMAGE_TIMEOUT_MS, 'text');
      if (res.ok) {
        let part = null;
        try { part = JSON.parse(data)?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data); } catch { /* fall through */ }
        if (part) { geminiImageModel = model; return blobToBitmap(b64ToBlob(part.inlineData.data, part.inlineData.mimeType)); }
        last = new Error('Gemini returned no image');
        break; // this model answered; a missing image is not a config problem
      }
      let msg = '';
      try { msg = JSON.parse(data)?.error?.message || ''; } catch { /* ignore */ }
      last = new Error(`HTTP ${res.status}${msg ? ': ' + msg.slice(0, 140) : ''}`);
      last.status = res.status;
      if (res.status === 429) throw last;            // rate limited: the model works, just slow down
      if (res.status !== 400) break;                 // 404 / 403: try the next model
    }
  }
  throw last || new Error('Gemini images unavailable');
}

const providers = {
  async pollinations(prompt, opts, s, signal, log) {
    if (s.pollinationsKey && !keyRejected) {
      let why = '';
      try {
        const { res, data } = await fetchTimeout(pollinationsURL(prompt, opts, s), { signal }, IMAGE_TIMEOUT_MS, 'blob');
        if (res.ok) return await blobToBitmap(data);
        why = `HTTP ${res.status}`;
        try { why += ': ' + (JSON.parse(await data.text())?.error?.message || '').slice(0, 160); } catch { /* ignore */ }
      } catch (e) {
        if (signal?.aborted) throw e;
        why = e.message;
      }
      // The keyed service refused or failed (wrong kind of key, no credit, blocked): use the free no-key service.
      keyRejected = true;
      log?.(`Pollinations key did not work (${why}). Using free no-key images instead. Image keys must be secret keys starting with sk_.`);
    }
    // The no-key painter now asks for payment: after one refusal, or on a site with its own AI
    // (today's allowance used up), stop asking so the console stays clean.
    // The free painter is tried even on a site with its own AI whose daily allowance ran out (it works
    // again, 2026-11-22); only a refusal (402) turns it off for the visit.
    if (anonRefused) { const e = new Error('The free painter is not available'); e.status = 402; throw e; }
    const { res, data } = await fetchTimeout(pollinationsURL(prompt, opts, { ...s, pollinationsKey: '' }), { signal }, IMAGE_TIMEOUT_MS, 'blob');
    if (!res.ok) { if ([401, 402, 403].includes(res.status)) anonRefused = true; const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
    return blobToBitmap(data, true);
  },
  async huggingface(prompt, { width, height, seed }, s, signal) {
    if (!s.hfToken) throw new Error('No Hugging Face token');
    const { res, data } = await fetchTimeout('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${s.hfToken}`, 'Content-Type': 'application/json', Accept: 'image/png' },
      body: JSON.stringify({ inputs: prompt, parameters: { width, height, seed: seed % 2147483647, num_inference_steps: 4 } }),
    }, IMAGE_TIMEOUT_MS, 'blob');
    if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
    return blobToBitmap(data);
  },
};

// Every generated picture passes the safety check before it can be used.
// Returns an ImageBitmap, null (nothing came back) or BLOCKED (a picture came back but was rejected).
export const BLOCKED = 'blocked';
export async function generateImage(prompt, opts, settings, extra = {}) {
  const bmp = await generateImageRaw(prompt, opts, settings, extra);
  if (!bmp) return null;
  if (await isSafeImage(bmp, prompt, extra.log)) return bmp;
  bmp.close?.();
  return BLOCKED;
}

async function generateImageRaw(prompt, opts, settings, { signal, log, quick = false } = {}) {
  const order = [];
  if (settings.imageProvider === 'none') return null;
  if (settings.imageProvider === 'huggingface' && settings.hfToken) order.push('huggingface');
  order.push('pollinations');
  if (settings.hfToken && !order.includes('huggingface')) order.push('huggingface');

  if (settings.geminiKey && geminiImages !== false) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const bmp = await geminiImage(prompt, opts, settings, signal);
        if (geminiImages === null) log?.('Using your Gemini key for images.');
        geminiImages = true;
        return bmp;
      } catch (e) {
        if (signal?.aborted) throw e;
        if (e.status === 429 && geminiImages === true && attempt === 0) { await sleep(8000, signal); continue; }
        if (geminiImages !== true || e.status === 429) {
          // Never worked (not offered on this key) or its quota ran out: stop trying for this visit.
          geminiImages = false;
          log?.(`Gemini images not available on this key (${e.message}). Using the free image service.`);
        } else log?.(`Gemini image failed (${e.message})`);
        break;
      }
    }
  }
  for (const name of order) {
    for (let attempt = 0; attempt < ((quick || isFreeImageTier(settings)) ? 1 : 4); attempt++) {
      try {
        return await providers[name](prompt, opts, settings, signal, log);
      } catch (e) {
        if (signal?.aborted) throw e;
        log?.(`${name} image attempt ${attempt + 1} failed (${e.message})`);
        if (e.status === 401 || e.status === 403 || /No .* token/.test(e.message)) break;
        if (quick || isFreeImageTier(settings)) break;
        // Anonymous tiers are rate limited; back off and try again.
        await sleep(e.status === 429 ? 6000 + attempt * 4000 : 2500 + attempt * 2500, signal);
      }
    }
  }
  return null; // renderer draws a fallback poster
}

// Run tasks with limited concurrency, reporting each result as it lands.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// One background plate. Never retries for 45 seconds — the caller caps the whole wait at 20s.
export function platePrompt(bg) {
  const clean = String(bg || 'open landscape')
    .replace(/\b(naked|nude|gore|gory|blood|bloody|person|people|man|woman|human|child|boy|girl|body|bodies|skin|face|character)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 180);
  return `bright colorful 2D cartoon background from a kids animated TV show, flat colors, clean dark outlines, empty scenery, landscape and objects only, no figures, no letters. ${clean || 'open landscape'}`;
}

// A full-frame 3D cartoon environment, the look of the reference Shorts: bright, saturated,
// soft light, an empty floor in the lower half where the drawn cast stands.
const SET_WORDS = {
  rails: 'a train station platform beside railway tracks', shop: 'inside a colorful little shop with a counter',
  road: 'a sunny countryside road', lab: 'a bright science lab', office: 'a tidy office', room: 'a cozy living room',
  water: 'a wooden dock on a lake', bridge: 'a big bridge over a river', space: 'the grey surface of the Moon under a starry sky',
  desert: 'a sandy desert with dunes', field: 'green fields under a blue sky', sky: 'green hills under a big blue sky',
  temple: 'ancient Greek temple ruins on a sunny hill', sea: 'a seaside harbor', city: 'a city street',
  deck: 'the wooden deck of a big old ocean liner at sea, white railings and lifeboats',
  mountains: 'a mountain valley', snow: 'a snowy landscape', forest: 'a forest clearing', underwater: 'the sea floor underwater',
  night: 'a quiet town street at night',
};
export function scenePrompt(bg, set, topic = '', look = '3d') {
  const place = SET_WORDS[set] || (set ? `${set} scene` : 'an open outdoor scene');
  const indoor = ['shop', 'lab', 'office', 'room', 'inside'].includes(set);
  const clean = String(bg || '')
    .replace(/\b(naked|nude|gore|gory|blood|bloody|person|people|man|woman|human|child|boy|girl|body|bodies|skin|face|character|crowd|dark|dim|gloomy|grim|realistic|photo\w*)\b/gi, '')
    .replace(/\s{2,}/g, ' ').trim().slice(0, 120);
  // Simple flat cartoon drawings that match the stick-figure cast, not detailed renders.
  // The topic leads, so the place matches the video (the Great Wall, a railway yard, a hive...).
  const about = String(topic || '').replace(/^(why|how|what|when|who|the story of)\s+(do|does|did|is|are|was|were)?\s*/i, '').replace(/[?!.]+$/, '').trim().slice(0, 90);
  if (look === 'flat') {
    return `Simple flat 2D cartoon drawing for a kids TV show background, thick clean black outlines, flat bright colors, very few details, simple shapes, ${about ? `a place from the story of ${about}: ` : ''}${place}${clean ? `, ${clean}` : ''}, ${indoor ? 'plain walls and floor' : 'plain blue sky with a few simple clouds'}, wide shot, empty, no people, no text, not realistic, not 3D`;
  }
  // The look of popular animated explainer Shorts: a bright, stylized 3D world with real depth
  // (tracks running into the distance, canyon walls, a station hall), clean ground in the lower
  // half where the drawn cast stands.
  return `3D-rendered game-engine environment, wide-angle lens, low or aerial camera, warm saturated light, empty foreground floor, stylized cartoon world with clean simple shapes and painted textures, ${about ? `a place from the story of ${about}: ` : ''}${place}${clean ? `, ${clean}` : ''}, ${indoor ? 'detailed interior with depth' : 'bright sky with puffy white clouds'}, strong perspective and depth, empty scene, no people, no characters, no animals, no text, no letters`;
}

export async function fetchPlate(prompt, opts, settings, { signal, timeout = 12000, log } = {}) {
  if (!settings || settings.imageProvider === 'none') return null;
  const ms = Math.max(2000, Math.min(35000, timeout));
  let bmp = await cloudflareImage(prompt, opts, signal);
  if (bmp) {
    if (!(await isSafeImage(bmp, prompt, log))) { bmp.close?.(); return null; }
    return bmp;
  }
  // While the site's own Cloudflare allowance works, the free service is not called at all: it
  // refuses most requests and every refusal is a red error in the console.
  if (cloudflareOn()) return null;
  try {
    if (settings.imageProvider === 'huggingface' && settings.hfToken) {
      bmp = await providers.huggingface(prompt, opts, settings, signal);
    } else {
      const keyed = settings.pollinationsKey && !keyRejected;
      // The no-key painter now asks for payment (402). Once it has refused, or when this site has its
      // own AI (whose daily allowance just ran out), the drawn sets are used instead of red errors.
      if (!keyed && anonRefused) return null;
      const url = pollinationsURL(prompt, opts, keyed ? settings : { ...settings, pollinationsKey: '' });
      const { res, data } = await fetchTimeout(url, { signal }, ms, 'blob');
      if (!res.ok) {
        if ([401, 402, 403].includes(res.status)) { if (keyed) keyRejected = true; else anonRefused = true; }
        log?.(`Background plate HTTP ${res.status}`);
        return null;
      }
      bmp = await blobToBitmap(data, !keyed);
    }
  } catch (e) {
    if (signal?.aborted) throw e;
    log?.(`Background plate skipped (${e.message})`);
    return null;
  }
  if (!bmp) return null;
  if (!(await isSafeImage(bmp, prompt, log))) { bmp.close?.(); return null; }
  return bmp;
}

export function imageConcurrency(settings) {
  if ((settings.pollinationsKey && !keyRejected) || (settings.imageProvider === 'huggingface' && settings.hfToken)) return 4;
  return 3;
}

// With no key the free image service allows a short burst, then about one image every 45 seconds.
export function isFreeImageTier(settings) {
  return settings.imageProvider !== 'none' && (!settings.pollinationsKey || keyRejected) && !settings.hfToken && !(settings.geminiKey && geminiImages !== false);
}

// ---------- Cloudflare Workers AI (the site's own free daily allowance) ----------
// The Loomy server paints with FLUX.1 schnell on the owner's Cloudflare account. If the server has
// no AI connection, or the daily allowance is used up, everything falls back to the free services.
let cfState = null; // null: not checked yet, true: available, false: not available this visit
let cfFails = 0;
let cfSite = false;   // the site has its own Cloudflare AI (even if today's allowance is used up)
let anonRefused = false; // the no-key painter refused this visit
export async function cloudflareReady() {
  if (cfState !== null) return cfState;
  try {
    const r = await fetch('/api/config', { credentials: 'same-origin' });
    cfState = r.ok ? !!(await r.json()).ai : false;
    cfSite = cfState;
  } catch { cfState = false; }
  return cfState;
}
export async function cloudflareImage(prompt, opts = {}, signal) {
  if (!(await cloudflareReady())) return null;
  try {
    const res = await fetch('/api/image', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    // The server always answers 200: a picture, or JSON explaining why not.
    if (!res.ok || !/^image\//.test(res.headers.get('Content-Type') || '')) {
      const why = await res.json().catch(() => ({}));
      cfFails++;
      if (why.used || cfFails >= 3) cfState = false; // allowance used up, or not working today
      return null;
    }
    cfFails = 0;
    const blob = await res.blob();
    if (blob.size < 2000) return null;
    return await sharpenBitmap(await createImageBitmap(blob));
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}
export const cloudflareOn = () => cfState === true;
