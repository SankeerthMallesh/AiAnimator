import { FORMATS, formatOf } from './presets.js';
import { fetchTimeout } from './net.js';

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
    model: s.pollinationsImageModel || 'flux', nologo: 'true', private: 'true', enhance: 'false',
  });
  const p = encodeURIComponent(prompt.slice(0, 1500));
  if (s.pollinationsKey) {
    q.set('key', s.pollinationsKey);
    return `https://gen.pollinations.ai/image/${p}?${q}`;
  }
  q.set('referrer', 'storyforge');
  return `https://image.pollinations.ai/prompt/${p}?${q}`;
}

async function blobToBitmap(blob) {
  if (!blob || blob.size < 2000 || !/^image\//.test(blob.type || 'image/')) {
    throw new Error('Not an image');
  }
  return await createImageBitmap(blob);
}

const IMAGE_TIMEOUT_MS = 50000; // a stalled request is retried instead of holding a slot forever

let keyRejected = false; // set when the saved Pollinations key is refused, for the rest of this visit

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
    return blobToBitmap(data);
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

export async function generateImage(prompt, opts, settings, { signal, log, quick = false } = {}) {
  const order = [];
  if (settings.imageProvider === 'none') return null;
  if (settings.imageProvider === 'huggingface' && settings.hfToken) order.push('huggingface');
  order.push('pollinations');
  if (settings.hfToken && !order.includes('huggingface')) order.push('huggingface');

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
  return settings.imageProvider !== 'none' && (!settings.pollinationsKey || keyRejected) && !settings.hfToken;
}
