// 1.2: a cinematic finish over a finished cartoon frame: bloom (bright parts glow into their
// surroundings), star sparkles on small bright highlights, a cool-shadow / warm-light grade, and a few
// specks of dust drifting through the light. Dark sets (night, space) get it stronger, as in lit
// 3D cartoon shorts. Cheap enough for a 60 fps export: the heavy work runs on a 1/8 size copy.

const SMALL = 8; // the bloom and highlight search run at 1/SMALL of the frame

export function glare(ctx, W, H, t, { strength = 1, dark = false, seed = 0, grade = true } = {}) {
  if (strength <= 0) return;
  const k = strength * (dark ? 1.5 : 1);
  const sw = Math.max(8, Math.round(W / SMALL)), sh = Math.max(8, Math.round(H / SMALL));
  const small = glare.small ||= document.createElement('canvas');
  if (small.width !== sw || small.height !== sh) { small.width = sw; small.height = sh; }
  const sg = small.getContext('2d', { willReadFrequently: true });
  // Only the bright parts survive this: they become the glow.
  // Shrink first (no filter on the full-size frame: that is the slow part), then keep the brights.
  const raw = glare.raw ||= document.createElement('canvas');
  if (raw.width !== sw || raw.height !== sh) { raw.width = sw; raw.height = sh; }
  raw.getContext('2d').drawImage(ctx.canvas, 0, 0, sw, sh);
  sg.filter = `brightness(${dark ? 0.95 : 0.85}) contrast(${dark ? 3.2 : 4}) saturate(1.3)`;
  sg.clearRect(0, 0, sw, sh);
  sg.drawImage(raw, 0, 0);
  sg.filter = 'none';
  // Blurred at the small size (cheap), then stretched up smoothly: a soft glow.
  const soft = glare.soft ||= document.createElement('canvas');
  if (soft.width !== sw || soft.height !== sh) { soft.width = sw; soft.height = sh; }
  const fg = soft.getContext('2d');
  fg.clearRect(0, 0, sw, sh); fg.filter = 'blur(1.6px)'; fg.drawImage(small, 0, 0); fg.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(0.45, 0.19 * k);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(soft, 0, 0, W, H);
  ctx.restore();
  // Star sparkles on small, very bright spots (lamps, screens, stars), not on big white areas.
  // The search reads pixels back, so it runs about 8 times a second, not every frame.
  const slot = Math.floor(t * 8);
  if (glare.slot !== slot || glare.dark !== dark) { glare.spots = brightSpots(sg, sw, sh, dark ? 7 : 4); glare.slot = slot; glare.dark = dark; }
  const spots = glare.spots || [];
  for (const [i, s] of spots.entries()) {
    const tw = 0.65 + 0.35 * Math.sin(t * 3.1 + i * 1.7 + seed);
    sparkle(ctx, (s.x + 0.5) * W / sw, (s.y + 0.5) * H / sh, Math.min(W, H) * (dark ? 0.06 : 0.045) * tw * Math.min(1.4, k), 0.85 * tw);
  }
  if (grade) ctx.drawImage(gradeLayer(W, H, strength, dark), 0, 0, W, H);
  // Dust drifting through the light.
  ctx.save();
  const n = dark ? 26 : 14, r0 = Math.min(W, H) / 380;
  for (let i = 0; i < n; i++) {
    const a = hash(i + seed * 31), b = hash(i * 7 + 3 + seed), c = hash(i * 13 + 5);
    const x = ((a + t * (0.012 + c * 0.02)) % 1) * W, y = ((b - t * (0.008 + a * 0.012)) % 1 + 1) % 1 * H;
    const al = (0.25 + 0.45 * c) * (0.6 + 0.4 * Math.sin(t * 2 + i)) * Math.min(1, k);
    ctx.globalAlpha = al; ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(x, y, r0 * (0.8 + c * 1.6), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// The grade as a tint layer (warm light from above, cool shadows below), made once per size and look.
// A page that already lays a finishing layer over each frame can draw this into it instead.
export function gradeLayer(W, H, strength = 1, dark = false) {
  const k = strength * (dark ? 1.5 : 1), key = `${W}x${H}|${k.toFixed(2)}`;
  gradeLayer.cache ||= new Map();
  if (gradeLayer.cache.has(key)) return gradeLayer.cache.get(key);
  const gc = document.createElement('canvas');
  gc.width = Math.max(2, Math.round(W / 4)); gc.height = Math.max(2, Math.round(H / 4));
  const gg = gc.getContext('2d'), g = gg.createLinearGradient(0, 0, 0, gc.height);
  g.addColorStop(0, `rgba(255,190,130,${0.07 * k})`); g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(30,55,120,${0.12 * k})`);
  gg.fillStyle = g; gg.fillRect(0, 0, gc.width, gc.height);
  if (gradeLayer.cache.size > 8) gradeLayer.cache.clear();
  gradeLayer.cache.set(key, gc);
  return gc;
}

// Up to `max` small bright spots on the 1/8 copy: very bright pixels with few bright neighbours.
export function brightSpots(g, w, h, max = 4) {
  const d = g.getImageData(0, 0, w, h).data;
  const lum = (x, y) => { const i = (y * w + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; };
  const out = [];
  // Only the upper part of the frame (ceilings, sky, lamps, screens): people stand lower down.
  for (let y = 2; y < Math.min(h - 2, Math.round(h * 0.4)); y += 1) {
    for (let x = 2; x < w - 2; x += 1) {
      const v = lum(x, y);
      if (v < 0.96) continue;
      let bright = 0, peak = true;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        const u = lum(x + dx, y + dy);
        if (u > 0.85) bright++;
        if (u > v) peak = false;
      }
      // On a dark background all round (a lamp, a star, a screen), never the edge of a white shape.
      let darkRing = 0;
      for (let a = 0; a < 16; a++) { const rx = Math.round(x + 3 * Math.cos(a * Math.PI / 8)), ry = Math.round(y + 3 * Math.sin(a * Math.PI / 8)); if (rx >= 0 && ry >= 0 && rx < w && ry < h && lum(rx, ry) < 0.45) darkRing++; }
      if (peak && bright <= 8 && darkRing >= 13 && !out.some(o => Math.abs(o.x - x) + Math.abs(o.y - y) < 6)) out.push({ x, y, v });
    }
  }
  return out.sort((a, b) => b.v - a.v).slice(0, max);
}

// A four-point star with a soft core.
export function sparkle(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  const core = ctx.createRadialGradient(x, y, 0, x, y, r * 0.45);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [dx, dy, len] of [[1, 0, 1], [0, 1, 1], [0.7, 0.7, 0.45], [0.7, -0.7, 0.45]]) {
    const L = r * len, w = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - dx * L, y - dy * L); ctx.lineTo(x - dy * w, y + dx * w);
    ctx.lineTo(x + dx * L, y + dy * L); ctx.lineTo(x + dy * w, y - dx * w); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
