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
  if (!trimLogo) return bmp;
  // The free no-key service stamps its logo in the bottom-right corner and ignores nologo.
  // Cut that strip off so it never shows up in a video.
  const cut = await createImageBitmap(bmp, 0, 0, bmp.width, Math.round(bmp.height * 0.9));
  bmp.close?.();
  return cut;
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
    const { res, data } = await fetchTimeout(pollinationsURL(prompt, opts, { ...s, pollinationsKey: '' }), { signal }, IMAGE_TIMEOUT_MS, 'blob');
    if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
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

export function imageConcurrency(settings) {
  if ((settings.pollinationsKey && !keyRejected) || (settings.imageProvider === 'huggingface' && settings.hfToken)) return 4;
  return 3;
}

// With no key the free image service allows a short burst, then about one image every 45 seconds.
export function isFreeImageTier(settings) {
  return settings.imageProvider !== 'none' && (!settings.pollinationsKey || keyRejected) && !settings.hfToken && !(settings.geminiKey && geminiImages !== false);
}
