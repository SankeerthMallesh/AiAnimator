// AI depth estimation (Depth Anything V2 small) running in a background thread, in the browser.
// The model (~27 MB) downloads once and is cached by the browser.
import { pipeline, RawImage, env } from '../vendor/transformers.min.js';

env.allowLocalModels = false;
let estimator = null;
let loading = null;

function load() {
  if (estimator) return Promise.resolve(estimator);
  if (!loading) {
    loading = pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total });
      },
    }).then((m) => {
      // Smaller working size = ~2x faster; plenty of detail for camera parallax.
      try {
        const ip = m.processor?.image_processor || m.processor?.feature_extractor || m.processor;
        if (ip && ip.size) ip.size = { height: 392, width: 392 };
      } catch { /* keep defaults */ }
      estimator = m;
      return m;
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}

function blurNormalize(src, w, h) {
  // Normalize to 0..255, then two box-blur passes so edges don't tear when the camera moves.
  let mn = 255, mx = 0;
  for (let i = 0; i < src.length; i++) { if (src[i] < mn) mn = src[i]; if (src[i] > mx) mx = src[i]; }
  const span = Math.max(1, mx - mn);
  let a = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) a[i] = ((src[i] - mn) / span) * 255;
  const r = Math.max(1, Math.round(Math.max(w, h) / 90));
  let b = new Float32Array(a.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0, n = 0;
      for (let x = -r; x < w + r; x++) {
        if (x + r < w) { acc += a[y * w + x + r]; n++; }
        if (x - r - 1 >= 0) { acc -= a[y * w + x - r - 1]; n--; }
        if (x >= 0 && x < w) b[y * w + x] = acc / n;
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let y = -r; y < h + r; y++) {
        if (y + r < h) { acc += b[(y + r) * w + x]; n++; }
        if (y - r - 1 >= 0) { acc -= b[(y - r - 1) * w + x]; n--; }
        if (y >= 0 && y < h) a[y * w + x] = acc / n;
      }
    }
  }
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i];
  return out;
}

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    if (type === 'load') {
      await load();
      self.postMessage({ id, type: 'ready' });
      return;
    }
    if (type === 'estimate') {
      const model = await load();
      const bmp = e.data.bitmap;
      const scale = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const c = new OffscreenCanvas(w, h);
      const x = c.getContext('2d');
      x.drawImage(bmp, 0, 0, w, h);
      bmp.close?.();
      const img = new RawImage(x.getImageData(0, 0, w, h).data, w, h, 4);
      const out = await model(img);
      const dep = out.depth;
      const data = blurNormalize(dep.data, dep.width, dep.height);
      self.postMessage({ id, type: 'depth', data, width: dep.width, height: dep.height }, [data.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) });
  }
};
