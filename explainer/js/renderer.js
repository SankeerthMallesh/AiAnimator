// Frame renderer: turns a timeline of AI stills into a moving, captioned video.
// Camera moves, handheld drift, transitions, captions, labels, grain and vignette — all on a 2D canvas.
// drawFrame(t) is deterministic, so the live preview and the exported MP4 look identical.

import { DepthStage, isSoftwareGL } from './gl3d.js';
import { seekClip } from './clips.js';
import { drawMascot } from './mascot.js';
import { glowImage } from './glow.js';
import { drawProp } from './props.js';
import { STYLES } from './presets.js';
import { drawWorld } from '../../cartoon/js/worlds.js';
import { heroLook, drawHero, feelFor } from './hero.js';

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
const ACCENT = '#4C86FF';
const HIGHLIGHT = '#FFD84D';
const CAPTION_FONT = '"Montserrat", "Arial Black", Impact, sans-serif';
const LABEL_FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';

export class Renderer {
  constructor(canvas, { timeline, images, depths = [], clips = [], options, settings, script, meta = null }) {
    this.clips = timeline.scenes.map((s, i) => clips[i] || null);
    this.hostOn = !!STYLES[options.style]?.mascot && settings.host !== false;
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
    // Where each scene's picture came from, for the render log.
    this.sources = timeline.scenes.map((s, i) => (clips[i] ? 'clip' : images[i] ? 'ai' : 'fallback'));
    this.meta = timeline.scenes.map((s, i) => (meta && meta[i]) || {});
    // Shots with no AI picture: a painted world and the recurring hero, cut every 1.0-1.8 s.
    this.blocky = options.style === 'blocky';
    this.hero = heroLook(script, timeline.scenes[0]?.seed || 0);
    // Blocky AI pictures are places only: the hero is composited over them, cut like the fallback.
    this.composite = this.blocky && !!STYLES[options.style]?.composite;
    this.drawnHero = timeline.scenes.map((s, i) => this.sources[i] === 'fallback' || (this.composite && this.sources[i] === 'ai'));
    this.plans = planFallbackShots(timeline.scenes, this.drawnHero.map(d => (d ? 'fallback' : 'other')), this.blocky ? 1.15 : 1.4);
    // Each line's place; a line that names none stays where the story already is.
    this.worlds = [];
    timeline.scenes.forEach((sc, i) => this.worlds.push(worldFor(sc, this.worlds[i - 1] || null, script?.title || '')));
    this._bg = new Map();
    this.images = timeline.scenes.map((s, i) => images[i] || this._poster(s));
    this.depths = timeline.scenes.map((s, i) => depths[i] || null);
    // Scenes that point at something get a glowing outline around it, baked into the picture.
    this.glowed = timeline.scenes.map(() => false);
    this.plain = this.images.slice(); // without the glow, for fading it out before a transition
    this.images = this.images.map((img, i) => {
      if (!timeline.scenes[i].highlight || !this.depths[i] || this.drawnHero?.[i]) return img;
      try { const gl = glowImage(img, this.depths[i]); if (gl) this.glowed[i] = true; return gl || img; } catch { return img; }
    });
    this.log = null; // a RenderLog while exporting
    this.gl = null;
    if (this.depths.some(Boolean)) {
      // AI images are ~864px on their short side, so rendering the 3D layer above that adds cost, not detail.
      const k = Math.min(1, (isSoftwareGL() ? 540 : 880) / Math.min(this.W, this.H));
      try { this.gl = new DepthStage(Math.round(this.W * k), Math.round(this.H * k)); } catch { this.gl = null; }
    }
    const flatStyle = ['flat', 'comic'].includes(options.style);
    const cleanCGI = options.style === 'cgi-short';
    // Blocky looks like a game screenshot: sharp everywhere, no depth-of-field blur or haze.
    const sharp = options.style === 'blocky';
    this.look = {
      dof: flatStyle || sharp ? 0 : cleanCGI ? 0.45 : 0.55,
      haze: flatStyle || sharp ? 0 : cleanCGI ? 0.06 : 0.22,
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
    // No picture could be made (the free daily picture allowance ran out, or the service is down):
    // paint the place the line is about, like the Cartoons section does. Blocky stories get it
    // painted at low resolution and enlarged without smoothing, so it reads as a blocky game world.
    const w = this.vertical ? 864 : 1536, h = Math.round(w * this.H / this.W);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const id = worldFor(scene);
    if (this.options.style === 'blocky') {
      const k = 9, sw = Math.ceil(w / k), sh = Math.ceil(h / k);
      const small = document.createElement('canvas'); small.width = sw; small.height = sh;
      drawWorld(small.getContext('2d'), sw, sh, id, 0);
      x.imageSmoothingEnabled = false;
      x.drawImage(small, 0, 0, sw * k, sh * k);
      // A faint edge on every block, like a voxel game's texture.
      x.strokeStyle = 'rgba(0,0,0,0.07)'; x.lineWidth = 1;
      x.beginPath();
      for (let gx = 0; gx <= w; gx += k) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, h); }
      for (let gy = 0; gy <= h; gy += k) { x.moveTo(0, gy + 0.5); x.lineTo(w, gy + 0.5); }
      x.stroke();
    } else if (!drawWorld(x, w, h, id, 0)) {
      x.fillStyle = '#7EC8F2'; x.fillRect(0, 0, w, h);
    }
    c.painted = true;
    return c;
  }

  _groupWords(scene) {
    // Story styles caption like their references: 3D two or three words, Blocky three or four.
    const story = ['story-3d', 'blocky'].includes(this.options.style) && this.settings.captionStyle !== 'off';
    const blocky = this.options.style === 'blocky';
    const [minWords, maxWords] = story ? (blocky ? [3, 4] : [2, 3]) : [1, this.tall ? 3 : this.vertical ? 4 : 5];
    const maxChars = story ? (blocky ? 24 : 20) : this.tall ? 16 : this.vertical ? 20 : 28;
    let groups = [];
    const all = scene.words || [];
    if (story && all.length) {
      // Split the line so every caption has min..max words, breaking at punctuation where possible
      // (a caption that runs over a full stop costs a little; one out of range costs a lot).
      const ends = (w) => /[.!?;:,]["')]?$/.test(w.text);
      const cost = new Array(all.length + 1).fill(Infinity), from = new Array(all.length + 1).fill(-1);
      cost[0] = 0;
      for (let i = 1; i <= all.length; i++) {
        for (let j = Math.max(0, i - maxWords - 2); j < i; j++) {
          if (!isFinite(cost[j])) continue;
          const chunk = all.slice(j, i), n = chunk.length;
          const chars = chunk.reduce((k, x) => k + x.text.length + 1, -1);
          let c = (n < minWords || n > maxWords) ? 100 + Math.abs(n - (n < minWords ? minWords : maxWords)) * 10 : 0;
          if (i < all.length && !ends(all[i - 1])) c += 2;
          c += chunk.slice(0, -1).filter(w => /[.!?]["')]?$/.test(w.text)).length * 3;
          if (chars > maxChars * 1.5) c += 6;
          if (cost[j] + c < cost[i]) { cost[i] = cost[j] + c; from[i] = j; }
        }
      }
      for (let i = all.length; i > 0; i = from[i]) groups.unshift(all.slice(from[i], i));
    } else {
      let cur = [];
      const flush = () => { if (cur.length) groups.push(cur); cur = []; };
      for (const w of all) {
        const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
        if (cur.length >= maxWords || (cur.length && chars > maxChars)) flush();
        cur.push(w);
        if (/[.!?,;:]["')]?$/.test(w.text)) flush();
      }
      flush();
    }
    const kw = new Set((scene.keywords || []).flatMap(k => k.toLowerCase().split(/\s+/)).map(norm));
    return groups.map((ws, i) => {
      let words = ws.map(w => ({ ...w, key: kw.has(norm(w.text)) }));
      if (blocky) {
        // Exactly one key word in capitals: the writer's, otherwise the longest word of 4+ letters.
        const keys = words.filter(w => w.key);
        words.forEach(w => { w.key = false; });
        const pick = keys[0] || words.filter(w => norm(w.text).length >= 4 && !STOP.has(norm(w.text))).sort((a, b) => norm(b.text).length - norm(a.text).length)[0]
          || words.slice().sort((a, b) => norm(b.text).length - norm(a.text).length)[0];
        if (pick) pick.key = true;
      }
      return { words, start: ws[0].start, end: i + 1 < groups.length ? groups[i + 1][0].start : ws[ws.length - 1].end + 0.35 };
    });
  }

  // ---------- frame ----------

  // A pop-up icon for a measurable thing (weight, time, speed...), like the 3D icons in story Shorts.
  _icon(scene, lt) {
    if (!scene.icon || this.settings.stickers !== true) return;
    const a = 0.35, b = Math.min(scene.dur - 0.2, 2.6);
    if (lt < a || lt > b + 0.3) return;
    const { ctx, W, H } = this;
    const k = (lt - a) / 0.28;
    const pop = k < 1 ? 1 - Math.pow(1 - k, 3) * 1.0 + Math.sin(k * Math.PI) * 0.18 : 1 + Math.sin((lt - a) * 3) * 0.03;
    const fade = lt > b ? 1 - (lt - b) / 0.3 : 1;
    const size = Math.round(Math.min(W, H) * 0.24);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.translate(W / 2, H * (this.vertical ? 0.24 : 0.22));
    ctx.scale(pop, pop);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.05;
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(scene.icon, 0, 0);
    ctx.restore();
  }

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
    if (this.log) {
      this._heroBox = null;
      const info = this._shotInfo(cur, t - cur.start);
      const hero = this.drawnHero[cur.index] && this._lastHero?.scene === cur.index ? this._lastHero : null;
      const frac = (b) => b.map((v, k) => v / (k % 2 ? H : W));
      this.log.shot(t, info, hero ? frac(hero.box) : null, hero ? frac(hero.face) : null);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._atmosphere(cur, t - cur.start);
    this._effect(cur, t - cur.start);
    if (this.hostOn) this._host(cur, t - cur.start);
    this._icon(cur, t - cur.start);

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
    if (this.settings.captionStyle !== 'off') {
      if (this.log) this.log.caption(t, ctx, H, () => this._captions(cur, t - cur.start - cur.voiceOffset));
      else this._captions(cur, t - cur.start - cur.voiceOffset);
    }
    if (this.settings.showProgress) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, 0, W, Math.max(6, H * 0.004));
      ctx.fillStyle = ACCENT;
      ctx.fillRect(0, 0, W * clamp(t / timeline.total, 0, 1), Math.max(6, H * 0.004));
    }
    if (this.settings.handle) this._handle();
  }

  // A shot with no AI picture: the painted world for the line and the hero, framed wide, medium
  // or close, with a slow push within each shot.
  _fallbackShot(scene, lt) {
    const plan = this.plans[scene.index] || [{ a: 0, b: scene.dur, framing: 'wide', side: 1 }];
    return plan.find(p => lt < p.b) || plan[plan.length - 1];
  }

  _fallbackBg(scene) {
    const id = this.worlds[scene.index];
    if (!this.blocky) return { id, canvas: null };
    // Blocky: the world painted small and enlarged without smoothing (only the background).
    const key = id;
    if (!this._bg.has(key)) {
      const { W, H } = this, k = 9;
      const sw = Math.ceil(W * 1.4 / k), sh = Math.ceil(H * 1.4 / k);
      const small = document.createElement('canvas'); small.width = sw; small.height = sh;
      const sg = small.getContext('2d');
      sg.scale(sw / (W * 1.4), sh / (H * 1.4)); sg.translate(W * 0.2, H * 0.2);
      drawWorld(sg, W, H, id, 0);
      const big = document.createElement('canvas'); big.width = Math.round(W * 1.4); big.height = Math.round(H * 1.4);
      const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(small, 0, 0, big.width, big.height);
      this._bg.set(key, big);
    }
    return { id, canvas: this._bg.get(key) };
  }

  _drawFallback(ctx, scene, lt, extra = {}) {
    const { W, H } = this;
    const shot = this._fallbackShot(scene, lt);
    const F = FRAMING[shot.framing];
    const k = clamp((lt - shot.a) / Math.max(0.3, shot.b - shot.a), 0, 1);
    const zoom = lerp(F.zoom, F.zoom + 0.05, k);
    const heroX = W * (0.5 + shot.side * F.offset);
    ctx.save();
    ctx.globalAlpha = extra.alpha ?? 1;
    ctx.translate(W / 2 + (extra.dx || 0), H / 2 + (extra.dy || 0));
    ctx.scale(extra.scale || 1, extra.scale || 1);
    ctx.translate(-W / 2, -H / 2);
    // Background: zoomed toward the hero's side, a little less than the hero (depth).
    ctx.save();
    const cx = lerp(W / 2, heroX, 0.35), cy = H * 0.6;
    ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
    if (this.sources[scene.index] === 'ai') {
      // The AI-painted place, filling the frame.
      const img = this.images[scene.index];
      const cover = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * cover) / 2, (H - img.height * cover) / 2, img.width * cover, img.height * cover);
    } else {
      const bg = this._fallbackBg(scene);
      if (bg.canvas) ctx.drawImage(bg.canvas, -W * 0.2, -H * 0.2);
      else drawWorld(ctx, W, H, bg.id, lt + scene.start);
    }
    ctx.restore();
    // The hero, sharp (drawn at full resolution even when the background is pixelated).
    const vt = lt - (scene.voiceOffset || 0);
    const talking = (this.captionGroups[scene.index] || []).some(g => vt >= g.start && vt < g.end);
    const heroH = H * F.height * (1 + 0.04 * k);
    const ground = H * F.ground;
    const drawn = drawHero(ctx, this.hero, { x: heroX, ground, height: heroH, t: lt + scene.start, talk: talking ? 1 : 0, face: shot.side > 0 ? -1 : 1, blocky: this.blocky, feel: feelFor(scene.narration) });
    if (!extra.alpha || extra.alpha >= 0.5) this._lastHero = { scene: scene.index, box: drawn.box, face: drawn.face };
    ctx.restore();
  }

  // What the render log records for the shot on screen.
  _shotInfo(scene, lt) {
    const i = scene.index, src = this.sources[i], style = STYLES[this.options.style] || {};
    const pk = this._punch(scene, lt);
    const hero = (this.script?.characters || [])[0];
    if (this.drawnHero[i]) {
      const shot = this._fallbackShot(scene, lt);
      return { scene: i, source: src, framing: shot.framing, shotIndex: shot.n, characterIds: [this.hero.id], world: src === 'fallback' ? this.worlds[i] : '', props: [], glow: false, picturePrompt: this.meta[i].prompt || '', seed: this.meta[i].seed ?? 0 };
    }
    return {
      scene: i, source: src, framing: ['wide', 'medium', 'close'][pk], shotIndex: pk,
      characterIds: src === 'ai' && style.character && hero ? [hero.id || hero.name || 'hero'] : [],
      world: src === 'fallback' ? worldFor(scene) : '',
      props: this.settings.stickers === true && scene.icon ? [{ kind: `icon:${scene.icon}`, triggerWord: scene.iconWord || '' }] : [],
      glow: !!this.glowed[i] && this._glowAlpha(scene, lt) > 0.5, picturePrompt: this.meta[i].prompt || '', seed: this.meta[i].seed ?? scene.seed ?? 0,
    };
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
    if (scene.effect === 'pulse') { const b = (lt % 0.9) / 0.9; zoom *= 1 + 0.022 * Math.max(Math.exp(-b * 9), 0.7 * Math.exp(-Math.abs(b - 0.28) * 14)); }
    if (scene.effect === 'speed') zoom *= 1 + 0.05 * clamp(lt / scene.dur, 0, 1);
    // Shots that share a picture look at a different part of it.
    const rf = scene.reframe;
    if (rf) {
      zoom *= rf.zoom;
      x += rf.x * W * rf.zoom; y += rf.y * H * rf.zoom;
      // Never slide past the edge of the picture.
      const mx = Math.max(0, (zoom - 1) / 2 - 0.02) * W, my = Math.max(0, (zoom - 1) / 2 - 0.02) * H;
      x = clamp(x, -mx, mx); y = clamp(y, -my, my);
    }
    // Gentler 3D: strong depth moves bend straight edges and make parts of the picture melt
    // into each other. About half the parallax keeps the depth without the warping.
    px *= 0.5; py *= 0.5; dolly *= 0.5;
    // Two punch-ins in longer shots (at a third and two thirds), like the 1.5 s shots of popular
    // story Shorts: first on the subject the depth map finds nearest, then on its upper part (a face
    // or a detail) from the other side, so each cut is a new framing.
    const pk = this._punch(scene, lt);
    if (pk) {
      const t = this._targets(scene.index)[pk - 1];
      const z1 = pk === 1 ? 1.32 : 1.55;
      zoom *= z1;
      const mx = Math.max(0, (zoom - 1) / 2 - 0.02) * W, my = Math.max(0, (zoom - 1) / 2 - 0.02) * H;
      x = clamp(x + (0.5 - t.u) * W * zoom, -mx, mx);
      y = clamp(y + (0.5 - t.v) * H * zoom, -my, my);
      focus = Math.min(0.9, focus + 0.08 * pk);
    }
    return { zoom, x, y, rot, px, py, dolly, focus, three };
  }

  // How much of a scene's glow shows: it fades out over the 0.25 s before the outgoing transition.
  _glowAlpha(scene, lt) {
    if (!this.glowed[scene.index]) return 0;
    const next = this.timeline.scenes[scene.index + 1];
    const T = next ? (TRANSITION_LEN[next.transition] ?? 0.36) : 0;
    const end = scene.dur - T / 2;
    return clamp((end - lt) / 0.25, 0, 1);
  }

  // Which punch-in is on screen: 0 (the opening framing), 1 or 2, for shots over 2 s.
  _punch(scene, lt) {
    if (!(scene.dur > 2.0) || this.clips[scene.index] || this.drawnHero?.[scene.index]) return 0;
    return lt >= (scene.dur * 2) / 3 ? 2 : lt >= scene.dur / 3 ? 1 : 0;
  }

  // Punch-in targets for a picture, as shares of its width and height: the nearest subject in the
  // depth map, then its upper part on the other side. Without depth, two rule-of-thirds points.
  _targets(i) {
    this._tg ||= [];
    if (this._tg[i]) return this._tg[i];
    const d = this.depths[i];
    const side = i % 2 ? 1 : -1;
    let a = { u: 0.5 + side * 0.12, v: 0.42 }, b = { u: 0.5 - side * 0.12, v: 0.34 };
    if (d?.data && d.width > 8) {
      const { data, width: w, height: h } = d;
      // The nearest 8% of the picture (largest depth values), ignoring the bottom edge (floor).
      const vals = [];
      for (let y = 0; y < h * 0.88; y += 2) for (let x = 0; x < w; x += 2) vals.push(data[y * w + x]);
      vals.sort((p, q) => q - p);
      // A small subject (under 8% of the picture) would put the cut on the background: then take the
      // values clearly nearer than the median instead.
      const med = vals[Math.floor(vals.length / 2)] ?? 0, max = vals[0] ?? 0;
      let cut = vals[Math.floor(vals.length * 0.08)] ?? 0;
      if (cut <= med) cut = (max + med) / 2;
      let sx = 0, sy = 0, n = 0, top = h;
      for (let y = 0; y < h * 0.88; y += 2) for (let x = 0; x < w; x += 2) if (data[y * w + x] >= cut && data[y * w + x] > med) { sx += x; sy += y; n++; if (y < top) top = y; }
      if (n > 20) {
        const cu = sx / n / w, cv = sy / n / h;
        a = { u: clamp(cu, 0.2, 0.8), v: clamp(cv, 0.2, 0.75) };
        // The upper part of the subject, pushed to the other side of it.
        b = { u: clamp(cu + (cu < 0.5 ? 0.08 : -0.08), 0.2, 0.8), v: clamp(Math.min(cv - 0.1, top / h + 0.08), 0.15, 0.7) };
      }
    }
    return (this._tg[i] = [a, b]);
  }

  // Where in its clip a shot is at local time lt. Clips are ~5 s: longer shots play them a little slower.
  _clipTime(scene, lt) {
    const clip = this.clips[scene.index];
    const rate = scene.dur > clip.duration ? clip.duration / scene.dur : 1;
    return clamp(lt, 0, scene.dur) * rate;
  }

  // Export only: seek every clip that is on screen at time t to its exact frame.
  async prepareFrame(t) {
    const jobs = [];
    for (const scene of this.timeline.scenes) {
      const clip = this.clips[scene.index];
      if (!clip || t < scene.start - 0.5 || t > scene.start + scene.dur + 0.5) continue;
      jobs.push(seekClip(clip, this._clipTime(scene, t - scene.start)));
    }
    if (jobs.length) await Promise.all(jobs);
    this.prepared = true;
  }

  _drawScene(ctx, scene, lt, extra = {}) {
    const { W, H } = this;
    if (this.drawnHero[scene.index]) { this._drawFallback(ctx, scene, lt, extra); return; }
    const clip = this.clips[scene.index];
    if (clip && clip.video.readyState >= 2) {
      const v = clip.video;
      if (!this.prepared) {
        // Live preview: nudge the clip toward the right moment (export seeks exactly in prepareFrame).
        const want = this._clipTime(scene, lt);
        if (!v.seeking && Math.abs(v.currentTime - want) > 0.05) { try { v.currentTime = Math.min(want, clip.duration - 0.06); } catch { /* ignore */ } }
      }
      const vw = v.videoWidth || W, vh = v.videoHeight || H;
      const cover = Math.max(W / vw, H / vh) * 1.02 * (extra.scale || 1);
      ctx.save();
      ctx.globalAlpha = extra.alpha ?? 1;
      ctx.translate(W / 2 + (extra.dx || 0), H / 2 + (extra.dy || 0));
      ctx.scale(cover, cover);
      ctx.drawImage(v, -vw / 2, -vh / 2);
      ctx.restore();
      return;
    }
    const cam = this._camera(scene, lt);
    if (cam.three) {
      cam.nx = cam.x / W; cam.ny = cam.y / H;
      const ga = this._glowAlpha(scene, lt);
      const draw = (layer, alpha) => {
        const sc = extra.scale || 1;
        ctx.save();
        ctx.globalAlpha = (extra.alpha ?? 1) * alpha;
        ctx.translate(W / 2 + (extra.dx || 0), H / 2 + (extra.dy || 0));
        ctx.scale(sc, sc);
        ctx.drawImage(layer, -W / 2, -H / 2, W, H);
        ctx.restore();
      };
      if (this.glowed[scene.index] && ga < 1) {
        // Fading the glow: the plain picture, then the glowing one on top at the glow's strength.
        draw(this.gl.render(scene.index + 100000, this.plain[scene.index], this.depths[scene.index], cam, this.look), 1);
        if (ga > 0) draw(this.gl.render(scene.index, this.images[scene.index], this.depths[scene.index], cam, this.look), ga);
      } else draw(this.gl.render(scene.index, this.images[scene.index], this.depths[scene.index], cam, this.look), 1);
      return;
    }
    const ga = this._glowAlpha(scene, lt);
    const layers = this.glowed[scene.index] && ga < 1 ? [[this.plain[scene.index], 1], [this.images[scene.index], ga]] : [[this.images[scene.index], 1]];
    for (const [img, alpha] of layers) {
      if (!(alpha > 0)) continue;
      const iw = img.width, ih = img.height;
      const cover = Math.max(W / iw, H / ih);
      const zoom = cam.zoom * (extra.scale || 1);
      ctx.save();
      ctx.globalAlpha = (extra.alpha ?? 1) * alpha;
      ctx.translate(W / 2 + cam.x + (extra.dx || 0), H / 2 + cam.y + (extra.dy || 0));
      ctx.rotate(cam.rot);
      ctx.scale(cover * zoom, cover * zoom);
      ctx.drawImage(img, -iw / 2, -ih / 2);
      ctx.restore();
    }
  }

  // Floating dust in the light + slow light rays, moving with the 3D camera.
  // Per-shot motion effects: deterministic particles and pulses drawn over the picture.
  _effect(scene, lt) {
    const fx = scene.effect;
    if (!fx || fx === 'none') return;
    const { ctx, W, H } = this;
    const u = Math.min(W, H) / 1080;
    const r = rand((scene.seed >>> 0) + 911);
    const wrap01 = (v) => ((v % 1) + 1) % 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fadeIn = clamp(lt / 0.4, 0, 1);
    switch (fx) {
      case 'dust': case 'bubbles': case 'embers': case 'snow': {
        const cfg = {
          dust:    { n: 60, vy: -0.02, size: [8, 30], a: 0.34, comp: 'screen', sway: 0.02 },
          bubbles: { n: 64, vy: -0.13, size: [14, 64], a: 0.75, comp: 'source-over', sway: 0.025 },
          embers:  { n: 60, vy: -0.16, size: [4, 14], a: 0.95, comp: 'lighter', sway: 0.04 },
          snow:    { n: 90, vy: 0.1, size: [5, 16], a: 0.85, comp: 'source-over', sway: 0.03 },
        }[fx];
        ctx.globalCompositeOperation = cfg.comp;
        for (let k = 0; k < cfg.n; k++) {
          const z = 0.3 + r() * 0.7, bx = r(), by = r(), sp = 0.5 + r(), ph = r() * 6.28;
          const x = wrap01(bx + Math.sin(lt * 1.3 * sp + ph) * cfg.sway) * W;
          const y = wrap01(by + lt * cfg.vy * sp * (0.5 + z)) * H;
          const size = lerp(cfg.size[0], cfg.size[1], z) * u;
          const tw = 0.6 + 0.4 * Math.sin(lt * 3 * sp + ph);
          ctx.globalAlpha = cfg.a * (0.35 + z * 0.65) * tw * fadeIn;
          if (fx === 'bubbles') {
            ctx.lineWidth = Math.max(1.5, size * 0.09);
            ctx.fillStyle = 'rgba(200,235,255,0.14)';
            ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.283); ctx.fill();
            ctx.strokeStyle = 'rgba(235,248,255,0.95)';
            ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.283); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(x - size * 0.16, y - size * 0.16, size * 0.09, 0, 6.283); ctx.fill();
          } else if (fx === 'embers') {
            ctx.fillStyle = k % 3 ? '#FF9A3C' : '#FFD66B';
            ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.283); ctx.fill();
            ctx.globalAlpha *= 0.35;
            ctx.drawImage(this.mote, x - size * 2, y - size * 2, size * 4, size * 4);
          } else if (fx === 'snow') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.283); ctx.fill();
          } else ctx.drawImage(this.mote, x - size / 2, y - size / 2, size, size);
        }
        break;
      }
      case 'rain': {
        ctx.strokeStyle = 'rgba(210,225,245,0.55)';
        ctx.lineCap = 'round';
        for (let k = 0; k < 130; k++) {
          const z = 0.4 + r() * 0.6, bx = r(), by = r();
          const y = wrap01(by + lt * 1.6 * z) * H * 1.2 - H * 0.1;
          const x = wrap01(bx + lt * 0.12 * z) * W * 1.1 - W * 0.05;
          const len = (40 + z * 70) * u;
          ctx.globalAlpha = (0.25 + z * 0.5) * fadeIn;
          ctx.lineWidth = (1 + z * 1.6) * u;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.12, y + len); ctx.stroke();
        }
        break;
      }
      case 'sparks': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let k = 0; k < 46; k++) {
          const period = 0.7 + r() * 1.1, off = r() * period, ang = r() * 6.283, speed = (0.18 + r() * 0.5), ox = 0.3 + r() * 0.4, oy = 0.35 + r() * 0.3;
          const life = ((lt + off) % period) / period;
          const d = speed * life * Math.min(W, H);
          const x = ox * W + Math.cos(ang) * d, y = oy * H + Math.sin(ang) * d + life * life * H * 0.12;
          const tail = (16 + speed * 50) * u * (1 - life);
          ctx.globalAlpha = (1 - life) * fadeIn;
          ctx.strokeStyle = k % 4 ? '#FFD27A' : '#FFFFFF';
          ctx.lineWidth = (2 + (1 - life) * 3) * u;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * tail, y - Math.sin(ang) * tail); ctx.stroke();
        }
        break;
      }
      case 'smoke': {
        ctx.globalCompositeOperation = 'screen';
        for (let k = 0; k < 16; k++) {
          const bx = r(), by = 0.45 + r() * 0.55, sp = 0.4 + r() * 0.8, ph = r() * 6.28;
          const life = wrap01(lt * 0.07 * sp + ph / 6.28);
          const size = (260 + life * 520) * u;
          const x = (bx + Math.sin(lt * 0.25 * sp + ph) * 0.06) * W, y = (by - life * 0.5) * H;
          ctx.globalAlpha = 0.3 * Math.sin(Math.PI * life) * fadeIn;
          const g = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
          g.addColorStop(0, 'rgba(220,225,232,1)'); g.addColorStop(1, 'rgba(220,225,232,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
        break;
      }
      case 'pulse': {
        // Double-thump heartbeat: red edge glow that swells on each beat.
        const beat = (lt % 0.9) / 0.9;
        const k = Math.max(Math.exp(-beat * 9), 0.7 * Math.exp(-Math.abs(beat - 0.28) * 14));
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
        g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(1, `rgba(255,30,30,${0.5 * k * fadeIn})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'shockwave': {
        ctx.globalCompositeOperation = 'screen';
        for (const delay of [0.15, 0.4]) {
          const p = (lt - delay) / 0.9;
          if (p <= 0 || p >= 1) continue;
          ctx.globalAlpha = (1 - p) * 0.7;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = (26 * (1 - p) + 4) * u;
          ctx.beginPath(); ctx.arc(W / 2, H * 0.5, easeOutCubic(p) * Math.hypot(W, H) * 0.6, 0, 6.283); ctx.stroke();
        }
        break;
      }
      case 'speed': {
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
        for (let k = 0; k < 70; k++) {
          const ang = r() * 6.283, period = 0.35 + r() * 0.5, off = r();
          const life = wrap01(lt / period + off);
          const d0 = (0.35 + life * 0.75) * R, d1 = d0 + (0.08 + life * 0.22) * R;
          ctx.globalAlpha = 0.75 * Math.sin(Math.PI * life) * fadeIn;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = (1.5 + life * 3.5) * u;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * d0, cy + Math.sin(ang) * d0); ctx.lineTo(cx + Math.cos(ang) * d1, cy + Math.sin(ang) * d1); ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

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
      this._drawScene(ctx, scene, lt, { dx: dx + blurX * f, dy: dy + blurY * f, alpha: alpha * 0.14 });
      this._drawScene(ctx, scene, lt, { dx: dx - blurX * f, dy: dy - blurY * f, alpha: alpha * 0.14 });
    }
  }

  _transition(a, b, q, t) {
    const { ctx, W, H } = this;
    q = clamp(q, 0, 1);
    const la = t - a.start, lb = t - b.start;
    switch (b.transition) {
      case 'fade': {
        // A clean cut with a small settle, never two pictures blended on top of each other.
        if (q < 0.5) this._drawScene(ctx, a, la);
        else this._drawScene(ctx, b, lb, { scale: 1 + (1 - q) * 0.1 });
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
        // Light motion blur only: heavy see-through copies looked like the pictures were merging.
        const blur = Math.sin(Math.PI * q) * W * 0.025;
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
    const title = (this.script.title || '').replace(/\p{Extended_Pictographic}\uFE0F?|\u200D/gu, '').trim().toUpperCase();
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

  // The animated cartoon host for this shot.
  _host(scene, lt) {
    const { ctx, W, H } = this;
    const vt = lt - scene.voiceOffset;
    const speaking = (scene.words || []).some(w => vt >= w.start && vt < w.end);
    const talking = speaking ? 0.35 + 0.65 * Math.abs(Math.sin(vt * 17)) : 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Hop when a highlighted key word is spoken.
    const keys = (scene.keywords || []).flatMap(k => k.toLowerCase().split(/\s+/)).map(norm);
    let hop = 0;
    for (const w of scene.words || []) {
      const d = vt - w.start;
      if (d >= 0 && d < 0.3 && keys.includes(norm(w.text))) hop = Math.sin((d / 0.3) * Math.PI);
    }
    // The prop floats on the opposite side from the host (or above-right when the host is centred).
    if (scene.prop && scene.prop !== 'none') {
      const side = scene.side || 'center';
      const px = side === 'left' ? 0.7 : side === 'right' ? 0.3 : 0.74;
      const size = (this.tall ? W * 0.34 : H * 0.34);
      const py = this.tall ? (scene.shot === 'close' ? H * 0.2 : side === 'center' ? H * 0.25 : H * 0.3) : H * 0.3;
      drawProp(ctx, scene.prop, px * W, py, size, Math.max(0, lt));
    }
    drawMascot(ctx, W, H, {
      shot: scene.shot, hop,
      pose: scene.pose || 'idle', emotion: scene.emotion || 'neutral', side: scene.side || 'center',
      hat: this.script.host?.hat || 'none', color: this.script.host?.color || '#2F5DA8',
      lt: Math.max(0, lt), dur: scene.dur, talking, seed: scene.seed % 1000,
    });
    ctx.restore();
  }

  // One word at a time, white with a black outline: the classic cartoon-explainer caption.
  _wordCaption(scene, vt) {
    const words = scene.words || [];
    let w = null;
    for (let k = 0; k < words.length; k++) {
      const end = k + 1 < words.length ? words[k + 1].start : words[k].end + 0.3;
      if (vt >= words[k].start - 0.02 && vt < end) { w = words[k]; break; }
    }
    if (!w) return;
    const { ctx, W, H } = this;
    const text = w.text.replace(/^["'(]+|["'),.;:!?]+$/g, '');
    if (!text) return;
    const size = Math.round(this.vertical ? W * 0.092 : H * 0.095);
    const pop = easeOutBack((vt - w.start + 0.02) / 0.12);
    ctx.save();
    ctx.font = `900 ${size}px ${CAPTION_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.translate(W / 2, this.tall ? H * 0.715 : this.vertical ? H * 0.8 : H * 0.86);
    // Long words shrink to stay inside the frame.
    const fit = Math.min(1, (W * 0.9) / Math.max(1, ctx.measureText(text).width + size * 0.3));
    ctx.scale(lerp(0.8, 1, pop) * fit, lerp(0.8, 1, pop) * fit);
    ctx.lineWidth = size * 0.2;
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // Captions in the style of 3D story Shorts and blocky-game story Shorts: 2-4 words in normal case,
  // white with a dark edge, the key word in CAPITALS; blocky stories put them near the top.
  // Story captions, measured from the references. 3D: centre at 78% of the height, weight 700, a
  // soft shadow and no stroke, normal case. Blocky: near the top (23%), weight 600 with an outline,
  // one key word in capitals. Sizes give a drawn line of 4.2% (3D) and 5.1% (Blocky) of the height.
  _storyCaption(g, vt, top) {
    const { ctx, W, H } = this;
    const size = Math.round((top ? 0.0548 : 0.0452) * H);
    ctx.save();
    ctx.font = `${top ? 600 : 700} ${size}px ${CAPTION_FONT}`;
    ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.textAlign = 'left';
    const words = g.words.map(w => ({ ...w, label: top && w.key ? w.text.toUpperCase() : w.text }));
    const space = ctx.measureText(' ').width;
    const lines = [[]]; let lw = 0;
    for (const w of words) {
      w.w = ctx.measureText(w.label).width;
      if (lines[lines.length - 1].length && lw + space + w.w > W * 0.84) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push(w); lw += (lw ? space : 0) + w.w;
    }
    const pop = easeOutBack(Math.min(1, (vt - g.start + 0.03) / 0.12));
    const cy = (top ? 0.23 : 0.78) * H;
    ctx.translate(W / 2, cy);
    ctx.scale(lerp(0.88, 1, pop), lerp(0.88, 1, pop));
    lines.forEach((line, li) => {
      const total = line.reduce((n, w) => n + w.w, 0) + space * (line.length - 1);
      let x = -total / 2;
      const y = (li - (lines.length - 1) / 2) * size * 1.1;
      for (const w of line) {
        if (top) {
          ctx.lineWidth = size * 0.14;
          ctx.strokeStyle = 'rgba(0,0,0,0.9)';
          ctx.strokeText(w.label, x, y);
        }
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = size * (top ? 0.18 : 0.3); ctx.shadowOffsetY = size * 0.05;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(w.label, x, y);
        ctx.shadowColor = 'transparent';
        x += w.w + space;
      }
    });
    ctx.restore();
  }

  _captions(scene, vt) {
    const groups = this.captionGroups[scene.index];
    const g = groups.find(gr => vt >= gr.start - 0.03 && vt < gr.end);
    if (!g) return;
    const style = this.settings.captionStyle;
    // Story styles caption like the Shorts they come from: normal case, white, key word in capitals.
    if (['story-3d', 'blocky'].includes(this.options.style) && style !== 'off') { this._storyCaption(g, vt, this.options.style === 'blocky'); return; }
    if (style === 'word') { this._wordCaption(scene, vt); return; }
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
const STOP = new Set('that this with from they them their there then than what when where which while were have been your about into just only some very really would could should because after before'.split(' '));

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
      document.fonts.load('600 64px "Montserrat"'),
      document.fonts.load('600 32px "JetBrains Mono"'),
    ]);
  } catch { /* system fallbacks are fine */ }
}

// ---------- shots with no AI picture ----------
// Hero size (share of frame height), where its feet are, the background zoom and how far off
// centre it stands. Wide and medium keep the whole body inside an 8% margin; close shows the face.
const FRAMING = {
  wide: { height: 0.3, ground: 0.86, zoom: 1.0, offset: 0.14 },
  medium: { height: 0.47, ground: 0.885, zoom: 1.16, offset: 0.1 },
  close: { height: 1.0, ground: 1.3, zoom: 1.34, offset: 0.05 },
};
const FRAMES = ['wide', 'medium', 'close'];
// Each fallback scene is cut into shots of 1.0-1.8 s (at least two when it lasts 2 s or more),
// cycling wide, medium and close across the whole video and alternating the hero's side.
export function planFallbackShots(scenes, sources, target) {
  let n = 0;
  return scenes.map((sc, i) => {
    if (sources[i] !== 'fallback') return null;
    const dur = Math.max(0.1, sc.dur);
    let parts = dur < 2 ? 1 : Math.max(2, Math.round(dur / target));
    while (dur / parts > 1.8) parts++;
    while (parts > 2 && dur / parts < 1.0) parts--;
    return Array.from({ length: parts }, (_, k) => { const p = { a: (k * dur) / parts, b: k === parts - 1 ? dur + 1 : ((k + 1) * dur) / parts, framing: FRAMES[n % 3], side: n % 2 ? 1 : -1, n }; n++; return p; });
  });
}

// ---------- the painted place for a line with no picture ----------
const WORLD_WORDS = [
  ['wall', /\b(great wall|city walls?|castle walls?|fortress|fortif\w*|ramparts?|watchtowers?)\b/],
  ['deck', /\b(ship|titanic|liner|deck|cruise|sail(ed|ing)?|captain|lifeboats?|voyage)s?\b/],
  ['underwater', /\b(underwater|reef|coral|shark|whale|dolphin|seabed|deep sea|submarine|fish(es)?)s?\b/],
  ['school', /\b(school|classroom|cafeteria|lunchroom|teacher|homework|principal|recess|class|students?|hallway|lockers?)s?\b/],
  ['snow', /\b(snow|ice|icy|frozen|arctic|antarctic|penguins?|winter|blizzard|freez\w*|polar)s?\b/],
  ['sea', /\b(ocean|sea|beach|wave|island|coast|shore|iceberg|water|lake|pond|swim\w*|float\w*|splash\w*|treading)s?\b/],
  ['space', /\b(space|rocket|astronaut|orbit|planet|moon|mars|galaxy|star(s|ship)?|satellite|nasa|apollo|saturn)s?\b/],
  ['forest', /\b(forest|jungle|woods|rainforest|camp(ing)?|bear|wolf|deer|trees?)s?\b/],
  ['desert', /\b(desert|pyramids?|egypt\w*|sand|camel|sahara|dune)s?\b/],
  ['mountains', /\b(mountains?|volcano\w*|everest|cliff|peak|hiking|lava|magma)s?\b/],
  ['lab', /\b(lab|science|scientists?|experiment|chemical|molecule|atoms?|cells?|bacteria|virus|dna|brain|nerves?|blood|doctor|enzymes?|microscope|gas)s?\b/],
  ['rails', /\b(train|railway|rails?|locomotive)s?\b/],
  ['bridge', /\b(bridge|river)s?\b/],
  ['temple', /\b(temple|ancient|rome|roman|greek|empire|king|queen|castle|pharaoh)s?\b/],
  ['night', /\b(night|midnight|ghost|haunted)s?\b/],
  ['office', /\b(office|money|billion|million|company|business|bank|cost|price|paid|job|boss)s?\b/],
  ['shop', /\b(shop|store|market|buy|bought|sell|mall)s?\b/],
  ['room', /\b(home|house|room|bed|bedroom|kitchen|cook\w*|bake\w*|bread|food|eat\w*|drink\w*|cat|dog|pet|family|mom|dad|sofa|couch|cabin|bath\w*|fireplace|blanket)s?\b/],
  ['city', /\b(city|town|street|cars?|traffic|buildings?|skyscraper|crowd)s?\b/],
  ['field', /\b(sky|clouds?|sun|rain|weather|fly|flight|plane|airplane|birds?|wind|storm|farm|field|grass|garden|flowers?|bees?|park|meadow)s?\b/],
];
const SET_TO_WORLD = { sky: 'field', water: 'sea', ship: 'deck', ocean: 'sea', beach: 'sea', kitchen: 'room', volcano: 'mountains', mountain: 'mountains', savanna: 'field', garage: 'room', classroom: 'school' };
// Neutral places that fit most stories, for a line that names no place (never mountains).
const NEUTRAL = ['field', 'city', 'road', 'room'];
export function worldFor(scene, prev = null, topic = '') {
  const set = String(scene.set || '').toLowerCase();
  if (SET_TO_WORLD[set]) return SET_TO_WORLD[set];
  if (set && WORLD_WORDS.some(([id]) => id === set)) return set;
  // The picture description names the place more reliably than the narration: try it first.
  const visual = String(scene.visual || '').toLowerCase(), said = String(scene.narration || '').toLowerCase();
  const text = `${visual} ${said}`;
  for (const part of [visual, said]) for (const [id, re] of WORLD_WORDS) if (part && re.test(part)) return id;
  if (prev) return prev;
  const t = String(topic || '').toLowerCase();
  for (const [id, re] of WORLD_WORDS) if (t && re.test(t)) return id;
  return NEUTRAL[hash(text) % NEUTRAL.length];
}

