// Image safety check, in a background thread: a small ViT classifier that flags explicit pictures.
// The free image model sometimes draws unclothed figures; nothing flagged here reaches a video.
import { pipeline, RawImage, env } from '../../vendor/transformers.min.js';

env.allowLocalModels = false;
let clf = null;
let loading = null;

function load() {
  if (clf) return Promise.resolve(clf);
  if (!loading) {
    loading = pipeline('image-classification', 'AdamCodd/vit-base-nsfw-detector', { dtype: 'q8', device: 'wasm' })
      .then((m) => (clf = m));
    loading.catch(() => { loading = null; });
  }
  return loading;
}

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    const model = await load();
    if (type === 'load') { self.postMessage({ id, type: 'ready' }); return; }
    const bmp = e.data.bitmap;
    const size = 384;
    const c = new OffscreenCanvas(size, size);
    const x = c.getContext('2d');
    // Check the whole frame and a centre crop: a figure can fill only part of a tall image.
    const views = [[0, 0, bmp.width, bmp.height], [bmp.width * 0.1, bmp.height * 0.15, bmp.width * 0.8, bmp.height * 0.6]];
    let worst = 0;
    for (const [sx, sy, sw, sh] of views) {
      x.drawImage(bmp, sx, sy, sw, sh, 0, 0, size, size);
      const img = new RawImage(x.getImageData(0, 0, size, size).data, size, size, 4);
      const out = await model(img, { top_k: 2 });
      const nsfw = out.find(o => /nsfw/i.test(o.label));
      worst = Math.max(worst, nsfw ? nsfw.score : 0);
    }
    bmp.close?.();
    self.postMessage({ id, type: 'score', score: worst });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) });
  }
};
