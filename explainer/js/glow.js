// Glowing outline around the thing a scene talks about (like the yellow rim on the waterslide in
// popular 3D story Shorts). The depth map says what stands out from its surroundings; that shape gets
// a bright rim and a soft halo, baked into the picture so it moves with the 3D camera.

function boxBlur(src, w, h, r) {
  const a = Float32Array.from(src), b = new Float32Array(a.length);
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
  return a;
}

// Returns a canvas with the glow baked in, or null when the picture has no clear subject.
export function glowImage(img, depth, color = '#FFE14D') {
  if (!img || !depth?.data || depth.width <= 160) return null; // estimated depth is too rough
  const { data, width: dw, height: dh } = depth;
  // What stands out: nearer than its neighbourhood by a clear margin. A floor that simply gets
  // nearer toward the bottom of the frame does not stand out, so it gets no rim.
  const around = boxBlur(data, dw, dh, Math.max(4, Math.round(Math.max(dw, dh) / 10)));
  let median = 0;
  { const s = Float32Array.from(data).sort(); median = s[Math.floor(s.length / 2)]; }
  const mask = new ImageData(dw, dh);
  let on = 0;
  for (let i = 0; i < data.length; i++) {
    const hit = data[i] - around[i] > 14 && data[i] > median;
    if (hit) { mask.data[i * 4 + 3] = 255; on++; }
  }
  // Keep the main shape: the biggest connected piece and any nearly as big, but not thin strips
  // along the bottom edge (the floor or pool edge right in front of the camera).
  {
    const lab = new Int32Array(dw * dh).fill(-1);
    const comps = [];
    const q = new Int32Array(dw * dh);
    for (let i = 0; i < dw * dh; i++) {
      if (!mask.data[i * 4 + 3] || lab[i] >= 0) continue;
      const id = comps.length; let qh = 0, qt = 0, n = 0, y0 = dh, y1 = 0;
      q[qt++] = i; lab[i] = id;
      while (qh < qt) {
        const j = q[qh++]; n++;
        const x = j % dw, y = (j / dw) | 0;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const k of [x > 0 ? j - 1 : -1, x < dw - 1 ? j + 1 : -1, y > 0 ? j - dw : -1, y < dh - 1 ? j + dw : -1]) {
          if (k >= 0 && mask.data[k * 4 + 3] && lab[k] < 0) { lab[k] = id; q[qt++] = k; }
        }
      }
      comps.push({ n, strip: y1 >= dh - 2 && (y1 - y0) < dh * 0.2 });
    }
    const big = Math.max(0, ...comps.filter(c => !c.strip).map(c => c.n));
    const keep = comps.map(c => !c.strip && c.n >= big * 0.35);
    on = 0;
    for (let i = 0; i < dw * dh; i++) {
      if (mask.data[i * 4 + 3] && !keep[lab[i]]) mask.data[i * 4 + 3] = 0;
      else if (mask.data[i * 4 + 3]) on++;
    }
  }
  const share = on / data.length;
  if (share < 0.02 || share > 0.45) return null;
  const mc = document.createElement('canvas'); mc.width = dw; mc.height = dh;
  mc.getContext('2d').putImageData(mask, 0, 0);

  const iw = img.width, ih = img.height;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // Mask at full size (smooth edges from the scale-up).
  const m = mk(iw, ih), mg = m.getContext('2d');
  mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high';
  mg.filter = 'blur(1px)';
  mg.drawImage(mc, 0, 0, iw, ih);
  // Rim: the mask grown by a few pixels, minus the mask itself.
  const R = Math.max(3, Math.round(Math.min(iw, ih) / 170));
  const rim = mk(iw, ih), rg = rim.getContext('2d');
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    rg.drawImage(m, Math.cos(a) * R, Math.sin(a) * R);
  }
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(m, 0, 0);
  rg.globalCompositeOperation = 'source-in';
  rg.fillStyle = color; rg.fillRect(0, 0, iw, ih);
  // Final: picture, soft halo from the rim, then the crisp rim.
  const out = mk(iw, ih), og = out.getContext('2d');
  og.drawImage(img, 0, 0, iw, ih);
  og.save();
  og.globalCompositeOperation = 'lighter';
  og.shadowColor = color; og.shadowBlur = R * 6;
  og.globalAlpha = 0.85;
  og.drawImage(rim, 0, 0);
  og.drawImage(rim, 0, 0);
  og.restore();
  og.drawImage(rim, 0, 0);
  return out;
}
