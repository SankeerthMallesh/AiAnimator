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

// The glow's shape test, on a 0/1 mask (w x h). Returns the shape to outline, or null unless there
// is exactly one connected shape (specks under 15% of the largest are ignored, as are thin strips
// along the bottom edge), it covers 5-35% of the frame, and it is solid: its area is at least 0.8
// of its convex hull (splashes, spray and water ripples are not).
export function glowMask(mask, w, h) {
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const q = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || lab[i] >= 0) continue;
    const id = comps.length; let qh = 0, qt = 0, n = 0, y0 = h, y1 = 0;
    const left = new Map(), right = new Map();
    q[qt++] = i; lab[i] = id;
    while (qh < qt) {
      const j = q[qh++]; n++;
      const x = j % w, y = (j / w) | 0;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (!left.has(y) || x < left.get(y)) left.set(y, x);
      if (!right.has(y) || x > right.get(y)) right.set(y, x);
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) {
        if (k >= 0 && mask[k] && lab[k] < 0) { lab[k] = id; q[qt++] = k; }
      }
    }
    comps.push({ id, n, strip: y1 >= h - 2 && (y1 - y0) < h * 0.2, left, right });
  }
  const real = comps.filter(c => !c.strip);
  if (!real.length) return null;
  const big = real.reduce((a, c) => (c.n > a.n ? c : a));
  if (real.filter(c => c.n >= big.n * 0.15).length !== 1) return null;
  const share = big.n / (w * h);
  if (share < 0.05 || share > 0.35) return null;
  // Convex hull of the shape's row ends (monotone chain), and its area.
  const pts = [];
  for (const [y, x] of big.left) pts.push([x, y]);
  for (const [y, x] of big.right) pts.push([x + 1, y + 1]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let area = 0;
  for (let i = 0; i < hull.length; i++) { const [x1, y1] = hull[i], [x2, y2] = hull[(i + 1) % hull.length]; area += x1 * y2 - x2 * y1; }
  const hullArea = Math.abs(area) / 2;
  if (!hullArea || big.n / hullArea < 0.8) return null;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (lab[i] === big.id) out[i] = 1;
  return out;
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
  // Glow only around ONE solid subject (see glowMask): not two blobs, not splashes or water.
  const bin = new Uint8Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) bin[i] = mask.data[i * 4 + 3] ? 1 : 0;
  const keepMask = glowMask(bin, dw, dh);
  if (!keepMask) return null;
  for (let i = 0; i < dw * dh; i++) mask.data[i * 4 + 3] = keepMask[i] ? 255 : 0;
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
