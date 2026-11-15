// Frame renderer: turns a timeline of AI stills into a moving, captioned video.
// Camera moves, handheld drift, transitions, captions, labels, grain and vignette — all on a 2D canvas.
// drawFrame(t) is deterministic, so the live preview and the exported MP4 look identical.

import { DepthStage, isSoftwareGL } from './gl3d.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; const x = clamp(t, 0, 1) - 1; return 1 + c3 * x * x * x + c1 * x * x; };
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rand(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const TRANSITION_LEN = { whip: 0.36, zoom: 0.42, fade: 0.6, flash: 0.36, slide: 0.42, glitch: 0.3, cut: 0 };
const ACCENT = '#A3B24E';
const HIGHLIGHT = '#FFD84D';
const CAPTION_FONT = '"Montserrat", "Arial Black", Impact, sans-serif';
const LABEL_FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';

export class Renderer {
  constructor(canvas, { timeline, images, depths = [], options, settings, script }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = canvas.width;
    this.H = canvas.height;
    this.timeline = timeline;
    this.options = options;
    this.settings = settings;
    this.script = script;
    this.vertical = this.H >= this.W;
    this.tall = this.H / this.W > 1.5;
    this.images = timeline.scenes.map((s, i) => images[i] || this._poster(s));
    this.depths = timeline.scenes.map((s, i) => depths[i] || null);
    this.gl = null;
    if (this.depths.some(Boolean)) {
      // AI images are ~864px on their short side, so rendering the 3D layer above that adds cost, not detail.
      const k = Math.min(1, (isSoftwareGL() ? 540 : 880) / Math.min(this.W, this.H));
      try { this.gl = new DepthStage(Math.round(this.W * k), Math.round(this.H * k)); } catch { this.gl = null; }
    }
    const flatStyle = ['flat', 'comic'].includes(options.style);
    const cleanCGI = options.style === 'cgi-short';
    this.look = {
      dof: flatStyle ? 0 : cleanCGI ? 0.45 : 0.55,
      haze: flatStyle ? 0 : cleanCGI ? 0.06 : 0.22,
      grade: flatStyle ? 0.35 : cleanCGI ? 0.45 : 1,
      grain: cleanCGI ? 0.025 : 0.055,
      vignette: cleanCGI ? 0.55 : 1,
      atmosphere: settings.atmosphere !== false && !flatStyle && !cleanCGI,
    };
    this._buildOverlays();
    this.captionGroups = timeline.scenes.map(s => this._groupWords(s));
  }

  // ---------- precomputed layers ----------

  _buildOverlays() {
    const { W, H } = this;
    const v = document.createElement('canvas');
    v.width = W; v.height = H;
    const vc = v.getContext('2d');
    const g = vc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    vc.fillStyle = g;
    vc.fillRect(0, 0, W, H);
    this.vignette = v;

    this.grain = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const cc = c.getContext('2d');
      const img = cc.createImageData(256, 256);
      const r = rand(1234 + k);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = Math.floor(r() * 255);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
        img.data[i + 3] = 255;
      }
      cc.putImageData(img, 0, 0);
      this.grain.push(this.ctx.createPattern(c, 'repeat'));
    }

    // Soft glowing mote used for floating dust.
    const m = document.createElement('canvas');
    m.width = m.height = 64;
    const mc = m.getContext('2d');
    const mg = mc.createRadialGradient(32, 32, 0, 32, 32, 32);
    mg.addColorStop(0, 'rgba(255,244,225,1)');
    mg.addColorStop(0.35, 'rgba(255,236,205,0.45)');
    mg.addColorStop(1, 'rgba(255,230,200,0)');
    mc.fillStyle = mg; mc.fillRect(0, 0, 64, 64);
    this.mote = m;

    // Small buffer used by the glitch transition.
    this.layer = document.createElement('canvas');
    this.layer.width = W; this.layer.height = H;
    this.layerCtx = this.layer.getContext('2d');
  }

  _poster(scene) {
    // Fallback art when no image could be generated: moody gradient + bokeh + keyword.
    const w = this.vertical ? 864 : 1536, h = Math.round(w * this.H / this.W);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const r = rand(hash(scene.visual || scene.narration));
    const hue = Math.floor(r() * 360);
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${hue},45%,18%)`);
    g.addColorStop(1, `hsl(${(hue + 50) % 360},55%,8%)`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const rr = 20 + r() * Math.min(w, h) * 0.18;
      const gx = x.createRadialGradient(0, 0, 0, 0, 0, rr);
      gx.addColorStop(0, `hsla(${(hue + r() * 80) % 360},80%,70%,${0.08 + r() * 0.15})`);
      gx.addColorStop(1, 'hsla(0,0%,100%,0)');
      x.save(); x.translate(r() * w, r() * h); x.fillStyle = gx;
      x.beginPath(); x.arc(0, 0, rr, 0, Math.PI * 2); x.fill(); x.restore();
    }
    const word = (scene.onScreenText || scene.keywords?.[0] || '').toUpperCase();
    if (word) {
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.font = `900 ${Math.round(w * 0.14)}px ${CAPTION_FONT}`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(word.slice(0, 14), w / 2, h * 0.42);
    }
    return c;
  }

  _groupWords(scene) {
    const maxWords = this.tall ? 3 : this.vertical ? 4 : 5;
    const maxChars = this.tall ? 16 : this.vertical ? 20 : 28;
    const groups = [];
    let cur = [];
    const flush = () => { if (cur.length) groups.push(cur); cur = []; };
    for (const w of scene.words || []) {
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
      if (cur.length >= maxWords || (cur.length && chars > maxChars)) flush();
      cur.push(w);
      if (/[.!?,;:]["')]?$/.test(w.text)) flush();
    }
    flush();
    const kw = new Set((scene.keywords || []).flatMap(k => k.toLowerCase().split(/\s+/)).map(norm));
    return groups.map((ws, i) => ({
      words: ws.map(w => ({ ...w, key: kw.has(norm(w.text)) })),
      start: ws[0].start,
      end: i + 1 < groups.length ? groups[i + 1][0].start : ws[ws.length - 1].end + 0.35,
    }));
  }

  // ---------- frame ----------

  drawFrame(t) {
    const { ctx, W, H, timeline } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scenes = timeline.scenes;
    let i = scenes.findIndex(s => t < s.start + s.dur);
    if (i < 0) i = scenes.length - 1;
    const cur = scenes[i];

    // Transition with the next scene (centered on the boundary) or from the previous one.
    const next = scenes[i + 1];
    const prev = scenes[i - 1];
    let drawn = false;
    if (next) {
      const T = TRANSITION_LEN[next.transition] ?? 0.36;
      const tb = next.start;
      if (T && t > tb - T / 2) { this._transition(cur, next, (t - (tb - T / 2)) / T, t); drawn = true; }
    }
    if (!drawn && prev) {
      const T = TRANSITION_LEN[cur.transition] ?? 0.36;
      const tb = cur.start;
      if (T && t < tb + T / 2) { this._transition(prev, cur, (t - (tb - T / 2)) / T, t); drawn = true; }
    }
    if (!drawn) this._drawScene(ctx, cur, t - cur.start);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._atmosphere(cur, t - cur.start);

    // Grade: vignette + grain.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalAlpha = this.look.vignette;
    ctx.drawImage(this.vignette, 0, 0);
    const frame = Math.floor(t * 30);
    ctx.globalAlpha = this.look.grain;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = this.grain[frame % 4];
    const r = rand(frame + 7);
    ctx.translate(-Math.floor(r() * 256), -Math.floor(r() * 256));
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    this._label(cur, t - cur.start);
    if (this.settings.showTitle && i === 0) this._title(t);
    if (this.settings.captionStyle !== 'off') this._captions(cur, t - cur.start - cur.voiceOffset);
    if (this.settings.showProgress) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, 0, W, Math.max(6, H * 0.004));
      ctx.fillStyle = ACCENT;
      ctx.fillRect(0, 0, W * clamp(t / timeline.total, 0, 1), Math.max(6, H * 0.004));
    }
    if (this.settings.handle) this._handle();
  }

  _camera(scene, lt) {
    const p = clamp(lt / scene.dur, -0.3, 1.3);
    const e = lerp(-0.05, 1.05, p); // continuous motion that keeps moving through transitions
    const es = lerp(-0.05, 1.05, easeInOut(p)); // eased version for 3D moves
    const W = this.W, H = this.H;
    // 2D framing (zoom/x/y/rot) + 3D parallax (px/py = truck/crane, dolly = push through depth).
    let zoom = 1.12, x = 0, y = 0, rot = 0, px = 0, py = 0, dolly = 0, focus = 0.62;
    const three = !!this.gl && !!this.depths[scene.index];
    switch (scene.camera) {
      case 'push-in':
        zoom = lerp(1.07, three ? 1.15 : 1.24, e); dolly = lerp(0, 0.42, es); break;
      case 'pull-out':
        zoom = lerp(three ? 1.17 : 1.26, 1.07, e); dolly = lerp(0.42, 0, es); break;
      case 'pan-left':
        zoom = 1.18; x = lerp(0.035, -0.035, e) * W; px = lerp(-0.07, 0.07, es); break;
      case 'pan-right':
        zoom = 1.18; x = lerp(-0.035, 0.035, e) * W; px = lerp(0.07, -0.07, es); break;
      case 'tilt-up':
        zoom = 1.18; y = lerp(-0.03, 0.03, e) * H; py = lerp(0.06, -0.06, es); break;
      case 'tilt-down':
        zoom = 1.18; y = lerp(0.03, -0.03, e) * H; py = lerp(-0.06, 0.06, es); break;
      case 'orbit':
        zoom = lerp(1.15, 1.2, e); rot = lerp(-1.4, 1.4, e) * Math.PI / 180; x = lerp(-0.02, 0.02, e) * W;
        px = lerp(-0.09, 0.09, es); dolly = 0.12; break;
      case 'vertigo':
        // Dolly-zoom: the subject holds its size while the world behind it stretches.
        zoom = lerp(1.3, 1.14, es); dolly = lerp(0, 0.6, es); focus = 0.7; break;
      case 'impact': {
        const punch = easeOutCubic(lt / 0.4);
        zoom = lerp(1.42, 1.12, punch) + 0.06 * clamp((lt - 0.4) / scene.dur, 0, 1);
        dolly = lerp(0.7, 0.2, punch);
        const shake = Math.max(0, 1 - lt / 0.6);
        x = Math.sin(lt * 71) * W * 0.012 * shake;
        y = Math.cos(lt * 63) * H * 0.01 * shake;
        break;
      }
      default: zoom = lerp(1.08, 1.2, e); dolly = lerp(0, 0.3, es);
    }
    // Handheld drift so nothing is ever perfectly still.
    const s = (scene.seed % 1000) / 100;
    x += (Math.sin(lt * 0.9 + s) * 0.6 + Math.sin(lt * 2.3 + s * 2) * 0.25) * W * 0.004;
    y += (Math.cos(lt * 0.7 + s) * 0.6 + Math.sin(lt * 1.9 + s) * 0.25) * H * 0.003;
    rot += Math.sin(lt * 0.6 + s) * 0.0018;
    px += Math.sin(lt * 0.8 + s) * 0.008;
    py += Math.cos(lt * 0.6 + s) * 0.006;
    return { zoom, x, y, rot, px, py, dolly, focus, three };
  }

  _drawScene(ctx, scene, lt, extra = {}) {
    const { W, H } = this;
    const cam = this._camera(scene, lt);
    if (cam.three) {
      cam.nx = cam.x / W; cam.ny = cam.y / H;
      const layer = this.gl.render(scene.index, this.images[scene.index], this.depths[scene.index], cam, this.look);
      const sc = extra.scale || 1;
      ctx.save();
      ctx.globalAlpha = extra.alpha ?? 1;
      ctx.translate(W / 2 + (extra.dx || 0), H / 2 + (extra.dy || 0));
      ctx.scale(sc, sc);
      ctx.drawImage(layer, -W / 2, -H / 2, W, H);
      ctx.restore();
      return;
    }
    const img = this.images[scene.index];
    const iw = img.width, ih = img.height;
    const cover = Math.max(W / iw, H / ih);
    const zoom = cam.zoom * (extra.scale || 1);
    ctx.save();
    ctx.globalAlpha = extra.alpha ?? 1;
    ctx.translate(W / 2 + cam.x + (extra.dx || 0), H / 2 + cam.y + (extra.dy || 0));
    ctx.rotate(cam.rot);
    ctx.scale(cover * zoom, cover * zoom);
    ctx.drawImage(img, -iw / 2, -ih / 2);
    ctx.restore();
  }

  // Floating dust in the light + slow light rays, moving with the 3D camera.
  _atmosphere(scene, lt) {
    if (!this.look.atmosphere) return;
    const { ctx, W, H } = this;
    const cam = this._camera(scene, lt);
    const r = rand(scene.seed >>> 0);
    const unit = Math.min(W, H) / 1080;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const n = 34;
    for (let k = 0; k < n; k++) {
      const z = 0.25 + r() * 0.75;              // depth: bigger + faster when near
      const bx = r(), by = r(), sp = 0.4 + r(), ph = r() * 6.28;
      let x = (bx + Math.sin(lt * 0.35 * sp + ph) * 0.02 + cam.px * z * 1.6) % 1;
      let y = (by - lt * 0.012 * sp * z + cam.py * z * 1.6) % 1;
      if (x < 0) x += 1; if (y < 0) y += 1;
      const size = (6 + z * 22) * unit;
      const tw = 0.5 + 0.5 * Math.sin(lt * 2 * sp + ph);
      ctx.globalAlpha = (0.05 + z * 0.16) * (0.6 + 0.4 * tw);
      ctx.drawImage(this.mote, x * W - size / 2, y * H - size / 2, size, size);
    }
    // Two soft light shafts from the upper corner.
    const sway = Math.sin(lt * 0.4 + scene.seed % 7) * 0.05;
    ctx.globalAlpha = 0.07;
    for (const [off, wdt] of [[0.18, 0.12], [0.42, 0.07]]) {
      ctx.save();
      ctx.translate(W * (off + sway), -H * 0.05);
      ctx.rotate(0.38);
      const g = ctx.createLinearGradient(0, 0, 0, H * 1.2);
      g.addColorStop(0, 'rgba(255,240,215,0.9)');
      g.addColorStop(1, 'rgba(255,240,215,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W * wdt / 2, 0, W * wdt, H * 1.3);
      ctx.restore();
    }
    ctx.restore();
  }

  dispose() {
    this.gl?.dispose();
    this.gl = null;
  }

  _smear(ctx, scene, lt, dx, dy, blurX, blurY, alpha = 1) {
    // Cheap directional motion blur: a few offset, translucent copies.
    this._drawScene(ctx, scene, lt, { dx, dy, alpha });
    const n = 3;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      this._drawScene(ctx, scene, lt, { dx: dx + blurX * f, dy: dy + blurY * f, alpha: alpha * 0.28 });
      this._drawScene(ctx, scene, lt, { dx: dx - blurX * f, dy: dy - blurY * f, alpha: alpha * 0.28 });
    }
  }

  _transition(a, b, q, t) {
    const { ctx, W, H } = this;
    q = clamp(q, 0, 1);
    const la = t - a.start, lb = t - b.start;
    switch (b.transition) {
      case 'fade': {
        this._drawScene(ctx, a, la);
        this._drawScene(ctx, b, lb, { alpha: easeInOut(q) });
        break;
      }
      case 'flash': {
        if (q < 0.5) this._drawScene(ctx, a, la, { scale: 1 + q * 0.12 }); else this._drawScene(ctx, b, lb, { scale: 1 + (1 - q) * 0.12 });
        const f = 1 - Math.abs(q - 0.5) * 2;
        ctx.fillStyle = `rgba(255,255,255,${Math.pow(f, 1.6) * 0.95})`;
        ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'zoom': {
        const e = easeInOut(q);
        if (q < 0.5) this._drawScene(ctx, a, la, { scale: 1 + e * 1.3, alpha: 1 });
        else this._drawScene(ctx, b, lb, { scale: 1 + (1 - e) * 0.9, alpha: 1 });
        const f = 1 - Math.abs(q - 0.5) * 2;
        ctx.fillStyle = `rgba(255,255,255,${f * f * 0.35})`;
        ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'slide': {
        const e = easeInOut(q);
        const axisY = this.vertical;
        this._drawScene(ctx, a, la, { dx: axisY ? 0 : -e * W * 0.3, dy: axisY ? -e * H * 0.3 : 0 });
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60;
        this._drawScene(ctx, b, lb, { dx: axisY ? 0 : (1 - e) * W, dy: axisY ? (1 - e) * H : 0 });
        ctx.restore();
        break;
      }
      case 'glitch': {
        const src = q < 0.5 ? a : b;
        const lc = this.layerCtx;
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.fillStyle = '#000'; lc.fillRect(0, 0, W, H);
        this._drawScene(lc, src, q < 0.5 ? la : lb);
        const r = rand(Math.floor(t * 30) * 97 + 13);
        const bands = 9;
        const intensity = 1 - Math.abs(q - 0.5) * 2;
        for (let k = 0; k < bands; k++) {
          const y0 = Math.floor((k / bands) * H), h = Math.ceil(H / bands);
          const off = (r() - 0.5) * W * 0.12 * intensity;
          ctx.drawImage(this.layer, 0, y0, W, h, off, y0, W, h);
        }
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.35 * intensity;
        ctx.drawImage(this.layer, W * 0.012 * intensity, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        break;
      }
      case 'whip':
      default: {
        const e = easeInOut(q);
        const dir = (b.index % 2 === 0) ? 1 : -1;
        const blur = Math.sin(Math.PI * q) * W * 0.06;
        this._smear(ctx, a, la, -e * W * dir, 0, blur, 0);
        this._smear(ctx, b, lb, (1 - e) * W * dir, 0, blur, 0);
      }
    }
  }

  // ---------- overlays ----------

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _label(scene, lt) {
    const text = (scene.onScreenText || '').toUpperCase();
    if (!text) return;
    const { ctx, W, H } = this;
    const inP = easeOutCubic((lt - 0.2) / 0.35);
    const outP = clamp((scene.dur - lt - 0.15) / 0.3, 0, 1);
    const a = Math.min(inP, outP);
    if (a <= 0) return;
    const size = Math.round((this.vertical ? W : H) * (this.vertical ? 0.036 : 0.042));
    ctx.font = `600 ${size}px ${LABEL_FONT}`;
    const tw = ctx.measureText(text).width;
    const padX = size * 0.7, h = size * 1.9;
    const x = W * 0.06 - (1 - inP) * size * 2, y = this.tall ? H * 0.115 : H * 0.06;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,20,19,0.72)';
    this._roundRect(ctx, x, y, tw + padX * 2 + size * 0.35, h, size * 0.35);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x + size * 0.45, y + h * 0.25, size * 0.18, h * 0.5);
    ctx.fillStyle = '#FAF9F5';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX + size * 0.35, y + h / 2 + 1);
    ctx.restore();
  }

  _title(t) {
    const title = (this.script.title || '').toUpperCase();
    if (!title) return;
    const first = this.timeline.scenes[0];
    const end = Math.min(2.8, first.dur - 0.1);
    if (t > end) return;
    const { ctx, W, H } = this;
    const pop = easeOutBack((t - 0.05) / 0.35);
    const fade = clamp((end - t) / 0.25, 0, 1);
    if (pop <= 0) return;
    const size = Math.round(this.vertical ? W * 0.082 : H * 0.095);
    ctx.save();
    ctx.font = `900 ${size}px ${CAPTION_FONT}`;
    const lines = wrap(ctx, title, W * 0.84);
    const y0 = this.tall ? H * 0.2 : H * 0.17;
    ctx.translate(W / 2, y0);
    ctx.scale(pop, pop);
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    lines.forEach((ln, k) => {
      const y = (k - (lines.length - 1) / 2) * size * 1.08;
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = '#000';
      ctx.strokeText(ln, 0, y);
      ctx.fillStyle = k === lines.length - 1 ? HIGHLIGHT : '#fff';
      ctx.fillText(ln, 0, y);
    });
    ctx.restore();
  }

  _captions(scene, vt) {
    const groups = this.captionGroups[scene.index];
    const g = groups.find(gr => vt >= gr.start - 0.03 && vt < gr.end);
    if (!g) return;
    const style = this.settings.captionStyle;
    if (style === 'classic') { this._classicCaption(g, vt); return; }
    const { ctx, W, H } = this;
    const minimal = style === 'minimal';
    const size = Math.round(this.vertical ? W * (minimal ? 0.058 : 0.088) : H * (minimal ? 0.06 : 0.085));
    const upper = !minimal;
    ctx.save();
    ctx.font = `${minimal ? 700 : 900} ${size}px ${CAPTION_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const words = g.words.map(w => ({ ...w, label: upper ? w.text.toUpperCase().replace(/[,.;:]+$/, '') : w.text }));
    // Thick outlines + the active-word pop need extra room between words.
    const space = ctx.measureText(' ').width + (minimal ? 0 : size * 0.32);
    // Lay words into lines.
    const lines = [[]];
    let lw = 0;
    for (const w of words) {
      w.w = ctx.measureText(w.label).width;
      if (lines[lines.length - 1].length && lw + space + w.w > W * 0.86) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push(w);
      lw += (lw ? space : 0) + w.w;
    }
    const pop = minimal ? 1 : easeOutBack((vt - g.start + 0.03) / 0.16);
    const cy = this.tall ? H * 0.69 : this.vertical ? H * 0.78 : H * 0.83;
    ctx.translate(W / 2, cy);
    ctx.scale(lerp(0.75, 1, pop), lerp(0.75, 1, pop));
    lines.forEach((line, li) => {
      const total = line.reduce((n, w) => n + w.w, 0) + space * (line.length - 1);
      let x = -total / 2;
      const y = (li - (lines.length - 1) / 2) * size * 1.12;
      for (const w of line) {
        const active = vt >= w.start && vt < w.end + 0.05;
        if (style === 'box' && active) {
          ctx.fillStyle = ACCENT;
          this._roundRect(ctx, x - size * 0.16, y - size * 0.62, w.w + size * 0.32, size * 1.2, size * 0.2);
          ctx.fill();
        }
        if (minimal) {
          ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = size * 0.35;
          ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.82)';
          ctx.fillText(w.label, x, y);
          ctx.shadowBlur = 0;
        } else {
          const s = active && style === 'bold' ? 1.06 : 1;
          ctx.save();
          ctx.translate(x + w.w / 2, y);
          ctx.scale(s, s);
          ctx.lineWidth = size * 0.2;
          ctx.strokeStyle = '#000';
          ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = size * 0.2; ctx.shadowOffsetY = size * 0.05;
          ctx.strokeText(w.label, -w.w / 2, 0);
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = style === 'box' ? '#fff' : (active || w.key ? HIGHLIGHT : '#fff');
          ctx.fillText(w.label, -w.w / 2, 0);
          ctx.restore();
        }
        x += w.w + space;
      }
    });
    ctx.restore();
  }

  // Clean white words with a black outline, sentence case, a quick gentle pop: the 3D-explainer-Short look.
  _classicCaption(g, vt) {
    const { ctx, W, H } = this;
    const size = Math.round(this.vertical ? W * 0.074 : H * 0.075);
    const text = g.words.map(w => w.text).join(' ').replace(/[,;:]+$/, '');
    ctx.save();
    ctx.font = `800 ${size}px ${CAPTION_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const lines = wrap(ctx, text, W * 0.8);
    const pop = easeOutCubic((vt - g.start + 0.03) / 0.12);
    const cy = this.tall ? H * 0.64 : this.vertical ? H * 0.76 : H * 0.84;
    ctx.translate(W / 2, cy);
    ctx.scale(lerp(0.92, 1, pop), lerp(0.92, 1, pop));
    ctx.globalAlpha = clamp(pop * 1.4, 0, 1);
    lines.forEach((ln, k) => {
      const y = (k - (lines.length - 1) / 2) * size * 1.15;
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = '#000';
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.04;
      ctx.strokeText(ln, 0, y);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff';
      ctx.fillText(ln, 0, y);
    });
    ctx.restore();
  }

  _handle() {
    const { ctx, W, H } = this;
    const size = Math.round((this.vertical ? W : H) * 0.03);
    ctx.save();
    ctx.font = `600 ${size}px ${LABEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = size * 0.4;
    const h = this.settings.handle.startsWith('@') ? this.settings.handle : '@' + this.settings.handle;
    ctx.fillText(h, W / 2, this.tall ? H * 0.785 : H * 0.93);
    ctx.restore();
  }
}

function norm(w) { return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (cur && ctx.measureText(next).width > maxW) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export async function loadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('900 64px "Montserrat"'),
      document.fonts.load('700 64px "Montserrat"'),
      document.fonts.load('600 32px "JetBrains Mono"'),
    ]);
  } catch { /* system fallbacks are fine */ }
}
