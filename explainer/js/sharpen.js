// Gentle sharpening for AI pictures. They arrive around 1024 px and are enlarged up to 2x for a
// 1080x1920 video, which softens edges; a light sharpen at the original size keeps them crisp
// without halos. Costs a few milliseconds per picture.
export async function sharpenBitmap(bmp, amount = 0.32) {
  try {
    const w = bmp.width, h = bmp.height;
    if (!w || !h || w * h > 4_200_000) return bmp;
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const img = g.getImageData(0, 0, w, h);
    const s = img.data, o = new Uint8ClampedArray(s.length);
    const a = amount, k = 1 + 4 * a;
    for (let y = 0; y < h; y++) {
      const up = y > 0 ? -w * 4 : 0, dn = y < h - 1 ? w * 4 : 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, lf = x > 0 ? -4 : 0, rt = x < w - 1 ? 4 : 0;
        for (let ch = 0; ch < 3; ch++) {
          const j = i + ch;
          o[j] = k * s[j] - a * (s[j + up] + s[j + dn] + s[j + lf] + s[j + rt]);
        }
        o[i + 3] = s[i + 3];
      }
    }
    img.data.set(o);
    g.putImageData(img, 0, 0);
    const out = await createImageBitmap(c);
    bmp.close?.();
    return out;
  } catch {
    return bmp;
  }
}
