// Draws one output frame of the project: the video part playing at time t, then (in later steps)
// transitions, text and captions. The preview and the export both call compose(), so what you
// see while editing is what the MP4 shows.

import { FORMATS, at } from './model.js';

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
  if (v && v.readyState >= 2) drawVideo(g, W, H, v, hit.seg, k, state.blur);
  return hit;
}
