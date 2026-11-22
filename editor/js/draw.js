// Draws one output frame of the project: the video part playing at time t, then (in later steps)
// transitions, text and captions. The preview and the export both call compose(), so what you
// see while editing is what the MP4 shows.

import { FORMATS, at, textsAt, captionAt, transitionK, TEXT_SPOTS } from './model.js';

export function size(p) { return FORMATS[p.format] || FORMATS['9:16']; }

// Draws `video` (its current frame) into the W x H frame. fill: cropped to cover the frame;
// fit: the whole picture on a blurred, darkened copy of itself. zoom scales around (x, y).
export function drawVideo(g, W, H, video, seg, k = 0, blur = null) {
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const z = seg.zoom ? seg.zoom.from + (seg.zoom.to - seg.zoom.from) * k : 1;
  const zx = seg.zoom?.x ?? 0.5, zy = seg.zoom?.y ?? 0.5;
  g.save();
  g.translate(W * zx, H * zy); g.scale(z, z); g.translate(-W * zx, -H * zy);
  if (seg.fit === 'fit') {
    if (blur) {
      blur.g.drawImage(video, 0, 0, blur.c.width, blur.c.height);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(blur.c, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, W, H);
    }
    const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s;
    g.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const s = Math.max(W / vw, H / vh), cw = W / s, ch = H / s;
    g.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, W, H);
  }
  g.restore();
}

// A tiny canvas, scaled up, is a cheap smooth blur for the 'fit' background.
export function blurCanvas() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  return { c, g: c.getContext('2d') };
}

// state: { prev: canvas holding the last frame of the previous part (for transitions), blur }
// videoFor(seg) returns the <video> for that part, already showing the right frame.
export function compose(g, p, t, videoFor, state = {}) {
  const [W, H] = size(p);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const hit = at(p, t);
  if (!hit) return null;
  const v = videoFor(hit.seg);
  const k = (hit.end - hit.start) > 0 ? hit.local / (hit.end - hit.start) : 0;
  const tk = transitionK(hit, hit.local);
  const draw = () => { if (v && v.readyState >= 2) drawVideo(g, W, H, v, hit.seg, k, state.blur); };
  if (tk < 1 && state.prev) drawTransition(g, W, H, hit.seg.transition.kind, tk, state.prev, draw);
  else draw();
  drawTexts(g, W, H, p, t);
  const cap = captionAt(p, t);
  if (cap) drawCaption(g, W, H, cap.text, p.captionStyle);
  return hit;
}

// E4: the way into a part. prev: the last frame of the part before; k: 0..1 through the transition.
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export function drawTransition(g, W, H, kind, k, prev, drawNew) {
  const e = ease(k);
  if (kind === 'fade') {
    drawNew();
    g.save(); g.globalAlpha = 1 - e; g.drawImage(prev, 0, 0, W, H); g.restore();
  } else if (kind === 'whip') {
    // The old frame flies out left and the new one in from the right, smeared like a fast pan.
    const x = e * W;
    g.save();
    for (let i = 0; i < 4; i++) { g.globalAlpha = i ? 0.25 : 1; g.drawImage(prev, -x - i * W * 0.03 * (1 - e), 0, W, H); }
    g.translate(W - x, 0); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    drawNew();
    g.restore();
  } else if (kind === 'zoom') {
    // The old frame zooms in and fades; the new one settles from slightly larger.
    g.save(); const z = 1 + e * 0.35; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); g.drawImage(prev, 0, 0, W, H); g.restore();
    g.save(); g.globalAlpha = e; const z2 = 1.25 - 0.25 * e; g.translate(W / 2, H / 2); g.scale(z2, z2); g.translate(-W / 2, -H / 2); drawNew(); g.restore();
  } else drawNew();
}

const FONT = '"Montserrat", "Inter", system-ui, sans-serif';
// Wraps text to lines no wider than maxW.
function lines(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let cur = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { const next = cur ? `${cur} ${w}` : w; if (cur && g.measureText(next).width > maxW) { out.push(cur); cur = w; } else cur = next; }
    out.push(cur);
  }
  return out;
}

// E2: text boxes. Each pops in over its first 0.2 s.
export function drawTexts(g, W, H, p, t) {
  for (const x of textsAt(p, t)) {
    const pop = Math.min(1, (t - x.start) / 0.2), sc = 0.85 + 0.15 * ease(pop);
    const size = Math.round(H * 0.045 * (x.size || 1));
    g.save();
    g.font = `800 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const ls = lines(g, x.text, W * 0.84), lh = size * 1.15, cy = H * (TEXT_SPOTS[x.spot] ?? 0.18);
    g.translate(W / 2, cy); g.scale(sc, sc); g.globalAlpha = pop;
    const y0 = -((ls.length - 1) * lh) / 2;
    if (x.look === 'box') {
      const w = Math.max(...ls.map(l => g.measureText(l).width)) + size * 1.1, h = ls.length * lh + size * 0.6;
      g.fillStyle = 'rgba(255,255,255,.95)'; roundRect(g, -w / 2, y0 - lh / 2 - size * 0.3, w, h, size * 0.45); g.fill();
    }
    ls.forEach((l, i) => {
      const y = y0 + i * lh;
      if (x.look === 'outline') { g.lineWidth = size * 0.18; g.strokeStyle = '#000'; g.strokeText(l, 0, y); }
      else if (x.look !== 'box') { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = size * 0.25; g.shadowOffsetY = size * 0.06; }
      g.fillStyle = x.look === 'box' ? '#111' : (x.color || '#fff');
      g.fillText(l, 0, y);
      g.shadowColor = 'transparent';
    });
    g.restore();
  }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// E2: captions in Loomy's bold style (white, soft dark halo), at captionStyle.y of the height.
export function drawCaption(g, W, H, text, style = {}) {
  if (!text) return;
  const size = Math.round(H * 0.04 * (style.size || 1));
  g.save();
  g.font = `800 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const y = H * (style.y ?? 0.7);
  if (style.look === 'outline') { g.lineWidth = size * 0.2; g.strokeStyle = '#000'; g.strokeText(text, W / 2, y); }
  else { g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = size * 0.3; g.shadowOffsetY = size * 0.06; }
  g.fillStyle = '#fff'; g.fillText(text, W / 2, y);
  g.restore();
}
