// The live preview: compose() into a half-size canvas. While playing, the sound plays through the
// same audio graph as the export and its clock drives the picture; each part's video plays muted
// beside it and is nudged back whenever it drifts.

import { at, duration } from './model.js';
import { compose, size, blurCanvas } from './draw.js';
import { schedule } from './audio.js';
import { seek } from './media.js';

export class Preview {
  constructor(canvas, media, getProject, { onTime } = {}) {
    this.canvas = canvas; this.media = media; this.get = getProject; this.onTime = onTime;
    this.g = canvas.getContext('2d', { alpha: false });
    this.state = { blur: blurCanvas(), prev: null };
    this.t = 0; this.playing = false; this.ctx = null; this.sound = null; this.seg = null; this.token = 0;
  }

  resize() {
    const [W, H] = size(this.get());
    const scale = Math.min(1, 720 / Math.max(W, H));
    this.scale = scale;
    if (this.canvas.width !== Math.round(W * scale) || this.canvas.height !== Math.round(H * scale)) {
      this.canvas.width = Math.round(W * scale); this.canvas.height = Math.round(H * scale);
    }
  }

  draw(video) {
    this.resize();
    const p = this.get();
    this.g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    compose(this.g, p, this.t, () => video, this.state);
  }

  // Shows output time t (paused): seeks that part's video, then draws.
  async show(t) {
    const p = this.get(), total = duration(p);
    this.t = Math.max(0, Math.min(t, Math.max(0, total - 1e-3)));
    this.onTime?.(this.t);
    const hit = at(p, this.t);
    if (!hit) { this.resize(); this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.fillStyle = '#000'; this.g.fillRect(0, 0, this.canvas.width, this.canvas.height); return; }
    const v = this.media.player(hit.seg.src, 'preview');
    const token = ++this.token;
    await seek(v, hit.srcT);
    if (token !== this.token || this.playing) return;
    this.draw(v);
  }

  async play() {
    const p = this.get(), total = duration(p);
    if (this.playing || !(total > 0)) return;
    if (this.t >= total - 0.05) this.t = 0;
    this.ctx ||= new AudioContext({ latencyHint: 'playback' });
    await this.ctx.resume();
    this.playing = true; this.seg = null;
    const lead = 0.08;
    const c0 = this.ctx.currentTime + lead, t0 = this.t;
    this.sound = schedule(this.ctx, p, this.media, { from: t0, when: c0 });
    const tick = () => {
      if (!this.playing) return;
      const q = this.get();
      const t = t0 + Math.max(0, this.ctx.currentTime - c0);
      if (t >= duration(q)) { this.pause(); this.show(Math.max(0, duration(q) - 1e-3)); return; }
      this.t = t; this.onTime?.(t);
      const hit = at(q, t);
      const v = this.media.player(hit.seg.src, 'preview');
      if (this.seg !== hit.seg.id) {
        this.stopVideos(v);
        this.seg = hit.seg.id;
        v.currentTime = hit.srcT; v.playbackRate = hit.seg.speed;
        v.play().catch(() => {});
      } else if (Math.abs(v.currentTime - hit.srcT) > 0.2) {
        v.currentTime = hit.srcT;
      }
      this.draw(v);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.sound?.stop(); this.sound = null;
    this.stopVideos();
  }

  toggle() { return this.playing ? (this.pause(), false) : (this.play(), true); }

  stopVideos(except) {
    for (const item of this.media.items.values()) { const v = item.players.preview; if (v && v !== except) v.pause(); }
  }

  // After an edit: keep the same time (clamped) and redraw; a playing preview restarts there.
  refresh() {
    const was = this.playing;
    if (was) this.pause();
    return this.show(this.t).then(() => { if (was) this.play(); });
  }
}
