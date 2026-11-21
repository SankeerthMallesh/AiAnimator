// Media for the editor: each source file becomes a blob URL, its sound decoded once into an
// AudioBuffer, and a strip of small thumbnails for the timeline. Two <video> players per source:
// one for the preview and one for the export, so exporting never fights the preview.

export const SR = 48000;

export class Media {
  constructor() { this.items = new Map(); }

  get(id) { return this.items.get(id); }

  // Loads a File or Blob. Resolves with the info the project needs; throws a readable message.
  async load(id, file, { name } = {}) {
    const url = URL.createObjectURL(file);
    const probe = await openVideo(url);
    if (!probe.ok) { URL.revokeObjectURL(url); throw new Error(`${name || file.name || 'This file'} will not play in this browser. Try an MP4 or WebM.`); }
    const item = { id, file, url, width: probe.width, height: probe.height, duration: probe.duration, audio: null, thumbs: [], players: {} };
    this.items.set(id, item);
    item.audio = await decodeAudio(file).catch(() => null);
    item.thumbs = await thumbnails(probe.video, probe.duration, 12).catch(() => []);
    probe.video.remove();
    return { name: name || file.name || 'Video', duration: probe.duration, width: probe.width, height: probe.height, hasAudio: !!item.audio };
  }

  // A <video> for this source; 'preview' and 'export' are separate elements.
  player(id, role = 'preview') {
    const item = this.items.get(id);
    if (!item) return null;
    if (!item.players[role]) {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
      v.src = item.url;
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
      document.body.append(v);
      item.players[role] = v;
    }
    return item.players[role];
  }

  remove(id) {
    const item = this.items.get(id);
    if (!item) return;
    for (const v of Object.values(item.players)) v.remove();
    URL.revokeObjectURL(item.url);
    this.items.delete(id);
  }
}

function openVideo(url) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0';
    document.body.append(v);
    const done = (ok) => { clearTimeout(timer); v.onloadeddata = v.onerror = null; resolve({ ok, video: v, width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : 0 }); };
    const timer = setTimeout(() => done(v.readyState >= 2 && v.videoWidth > 0), 15000);
    v.onloadeddata = () => done(v.videoWidth > 0 && v.duration > 0);
    v.onerror = () => done(false);
  });
}

// The file's sound as 48 kHz stereo. Null when it has none (or the browser cannot read it).
async function decodeAudio(file) {
  const data = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, SR, SR);
  const buf = await ctx.decodeAudioData(data);
  if (!buf || buf.length < 2) return null;
  return buf;
}

// Seeks and waits until that frame can be drawn (a new player first waits for its first frame).
export async function seek(video, t) {
  if (video.readyState < 2) {
    await new Promise((resolve) => {
      const done = () => { video.removeEventListener('loadeddata', done); clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, 8000);
      video.addEventListener('loadeddata', done);
    });
  }
  if (Math.abs(video.currentTime - t) < 0.002) return;
  await new Promise((resolve) => {
    const done = () => { video.removeEventListener('seeked', done); clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 4000);
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}

async function thumbnails(video, dur, n) {
  const h = 72, w = Math.max(24, Math.round(h * (video.videoWidth / video.videoHeight || 9 / 16)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(dur - 0.05, (i + 0.5) * dur / n);
    await seek(video, Math.max(0, t));
    g.drawImage(video, 0, 0, w, h);
    out.push({ t, url: c.toDataURL('image/jpeg', 0.6) });
  }
  return out;
}
