// Makes the MP4 of a code-drawn 3D edit: every frame is rendered by the engine at its render size,
// scaled to the output size, given its caption and any dip to black, and encoded at a steady fps.
// Frame-exact by construction (each frame is rendered for its own time), so no frames are dropped
// or doubled, however slow the computer.

import { createEngine } from './engine.js';
import { mp4Writer } from '../../../shared/encode.js';

export const CAPTION_FONT = '"Montserrat", "Inter", system-ui, sans-serif';

// captions: [[start, text, end?], ...] as in the skill (a caption shows until the next starts or
// its end). The style follows the skill: white, bold, 1-3 words, centred at about 77% of the height.
export function captionAt(captions, t) {
  let c = null;
  for (const x of captions) if (t >= x[0]) c = x;
  return c && (c[2] == null || t < c[2]) ? c[1] : '';
}

export function drawCaption(g, W, H, text) {
  if (!text) return;
  const size = Math.round(H * 46 / 1280);
  g.save();
  g.font = `700 ${size}px ${CAPTION_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const y = H * 0.775;
  // Soft dark halo (as the skill's text-shadow), then a hairline edge, then white.
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = size * 0.22; g.shadowOffsetY = size * 0.06;
  g.fillStyle = '#FFFFFF';
  g.fillText(text, W / 2, y);
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = size * 0.5; g.shadowOffsetY = 0;
  g.fillText(text, W / 2, y);
  g.shadowColor = 'transparent';
  g.lineWidth = Math.max(1, size * 0.013); g.strokeStyle = 'rgba(0,0,0,.25)';
  g.strokeText(text, W / 2, y);
  g.fillText(text, W / 2, y);
  g.restore();
}

// fades: [[a, b, c, d], ...]: black rises a->b, holds b->c, falls c->d.
export function fadeAt(fades, t) {
  let f = 0;
  for (const [a, b, c, d] of fades || []) if (t >= a && t < d) f = Math.max(f, t < b ? (t - a) / (b - a) : t < c ? 1 : (d - t) / (d - c));
  return f;
}

// One output frame at time t into the 2D context g (W x H).
export function composeFrame(engine, g, W, H, t, { captions = [], fades = [], log = null } = {}) {
  const shot = engine.renderAt(t);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(engine.canvas, 0, 0, W, H);
  const f = fadeAt(fades, t);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
  const text = captionAt(captions, t);
  if (log) log.caption(t, g, H, () => drawCaption(g, W, H, text));
  else drawCaption(g, W, H, text);
  return shot;
}

// quality: 'standard' renders at the output size (1080x1920); 'best' renders at twice that and
// scales down (cleanest edges, about 3-4 times slower). The skill rendered 720x1280 and stretched it,
// which looked soft.
export const QUALITY = { standard: 1, best: 2 };
export async function renderFilm({ edit, captions = [], fades = [], duration, start = 0, audio = null, width = 1080, height = 1920, fps = 30, quality = 'standard', renderSize = null, onProgress, signal, onFrame } = {}) {
  const k = QUALITY[quality] || 1;
  renderSize ||= [width * k, height * k];
  const total = duration ?? Math.max(...edit.shots.map(s => s.end)) - start;
  await document.fonts?.load?.(`700 40px ${CAPTION_FONT}`).catch(() => {});
  const engine = createEngine({ width: renderSize[0], height: renderSize[1], grain: false });
  try {
    engine.setEdit(edit);
    const out = await mp4Writer({ width, height, fps, audio });
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const g = canvas.getContext('2d', { alpha: false });
    const n = Math.max(1, Math.round(total * fps));
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const t = start + i / fps;
      const shot = composeFrame(engine, g, width, height, t, { captions, fades });
      onFrame?.(t, shot, g);
      await out.addFrame(canvas, t - start);
      if (i % 5 === 0) {
        onProgress?.((i + 1) / n, (performance.now() - t0) / (i + 1));
        await new Promise(r => setTimeout(r, 0)); // let the page breathe
      }
    }
    onProgress?.(1);
    return await out.finish();
  } finally { engine.dispose(); }
}
