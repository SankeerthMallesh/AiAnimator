// Optional real motion: turn a shot into an AI-generated video clip (Pollinations video models).
// Every video model there needs paid credit ("Pollen"), so this is off unless the user turns it on
// in Settings and has a secret (sk_) key with credit.
import { fetchTimeout } from './net.js';

const CLIP_TIMEOUT_MS = 6 * 60 * 1000; // video generation routinely takes minutes

export function clipsEnabled(settings) {
  return settings.videoClips === 'on' && !!settings.pollinationsKey;
}

export async function generateClip(prompt, { aspectRatio, duration = 5 }, settings, { signal } = {}) {
  const q = new URLSearchParams({
    model: settings.videoModel || 'wan-fast',
    duration: String(duration),
    aspectRatio,
    key: settings.pollinationsKey,
  });
  const url = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt.slice(0, 600))}?${q}`;
  const { res, data } = await fetchTimeout(url, { signal }, CLIP_TIMEOUT_MS, 'blob');
  if (!res.ok) {
    let msg = '';
    try { msg = JSON.parse(await data.text())?.error?.message || ''; } catch { /* ignore */ }
    const e = new Error(`HTTP ${res.status}${msg ? ': ' + msg.slice(0, 180) : ''}`);
    e.status = res.status;
    throw e;
  }
  if (!data || data.size < 20000) throw new Error('The video service returned no clip');
  const objectUrl = URL.createObjectURL(data);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = objectUrl;
  await new Promise((resolve, reject) => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('The clip could not be decoded')), { once: true });
  });
  return { video, url: objectUrl, duration: video.duration || duration };
}

// Put the clip on the exact frame for time `t` (seconds) and wait until it is decoded.
export function seekClip(clip, t) {
  const v = clip.video;
  const target = Math.max(0, Math.min(t, Math.max(0, clip.duration - 0.06)));
  if (Math.abs(v.currentTime - target) < 0.012 && !v.seeking) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); v.removeEventListener('seeked', done); resolve(); };
    const timer = setTimeout(done, 1500);
    v.addEventListener('seeked', done);
    v.currentTime = target;
  });
}
