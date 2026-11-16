// Orchestrates a project: script → fact check → visuals + 3D depth + voice (in parallel) → soundtrack → render.
// Every step is incremental: editing one scene only regenerates what changed.

import { writeScript, factCheck, imagePromptFor, scriptFromText } from './llm.js';
import { generateImage, imageSize, mapLimit, imageConcurrency, isFreeImageTier } from './images.js';
import { getNarrator, warmNarrator } from './tts.js';
import { buildTimeline, synthMusic, mixSoundtrack } from './audio.js';
import { Renderer, loadFonts } from './renderer.js';
import { exportVideo } from './encoder.js';
import { estimateDepth, onDepthProgress } from './depth.js';
import { FORMATS, PACES, formatOf } from './presets.js';

export const STEPS = [
  ['script', 'Write script'],
  ['facts', 'Fact-check'],
  ['visuals', 'Generate visuals'],
  ['depth', 'Build 3D scenes'],
  ['voice', 'Record voiceover'],
  ['sound', 'Score & mix'],
  ['render', 'Render MP4'],
];

export function qualityOf(options, settings) {
  const q = String(options.quality || settings.quality || '1080');
  return q === 'fast' ? 720 : q === 'hd' ? 1080 : (Number(q) || 1080);
}

export function outputSize(options, settings) {
  const ratio = FORMATS[formatOf(options)].ratio;
  const short = qualityOf(options, settings);
  const even = (n) => Math.round(n / 2) * 2;
  return ratio < 1 ? { width: short, height: even(short / ratio) } : { width: even(short * ratio), height: short };
}

export function newProject(topic, options) {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
    topic, options,
    script: null,
    factCheckNotes: [],
    images: new Map(),   // scene.id -> { key, bitmap, custom, depth }
    voices: new Map(),   // scene.id -> { key, data }
    music: null, musicKey: '',
    timeline: null, audio: null,
    video: null,
  };
}

export class Pipeline {
  constructor(project, settings, hooks) {
    this.p = project;
    this.s = settings;
    this.h = hooks; // { step(id, state, detail), log(msg), scene(i), progress(id, frac, text), scriptReady() }
    this.abort = new AbortController();
    this.narrator = null;
  }

  cancel() { this.abort.abort(); this.narrator?.cancelPending(); }
  get signal() { return this.abort.signal; }
  log(m) { this.h.log?.(m); }
  get pace() { return PACES[this.p.options.pace] || PACES.normal; }
  get use3d() { return this.s.depth3d !== 'off'; }

  async ensureScript() {
    const p = this.p;
    if (p.script) { this.h.step('script', 'done'); this.h.step('facts', p.factChecked ? 'done' : 'skip'); return; }
    this.h.step('script', 'active');
    const t0 = performance.now();
    if (p.options.mode === 'own') {
      p.script = scriptFromText(p.options.ownScript || p.topic, { ...p.options, topic: p.topic });
      this.h.step('script', 'done', `${p.script.scenes.length} scenes from your text`);
    } else {
      const { script, provider } = await writeScript(p.topic, p.options, this.s, { signal: this.signal, log: (m) => this.log(m) });
      p.script = script;
      this.writerProvider = provider;
      this.h.step('script', 'done', `${script.scenes.length} scenes · ${provider} · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    }
    this.h.scriptReady?.();

    if (this.s.factCheck && p.options.mode !== 'own') {
      this.startFactCheck();
    } else {
      this.h.step('facts', 'skip', p.options.mode === 'own' ? 'Your own script' : 'Off in settings');
    }
  }

  // The fact-check runs *while* images and voice are being made, instead of in front of them.
  // It usually changes 0-2 lines, and anything it changes is simply regenerated afterwards (only
  // those scenes, because every asset is keyed on the exact text it was made from). Same accuracy,
  // but the check no longer sits on the critical path.
  startFactCheck() {
    const p = this.p;
    this.h.step('facts', 'active', 'Checking in the background…');
    this.factJob = (async () => {
      // The check must never hold the video up: it gets 30 s, then the video goes on without it.
      const ctrl = new AbortController();
      const onAbort = () => ctrl.abort();
      this.signal.addEventListener('abort', onAbort, { once: true });
      let late = false;
      const timer = setTimeout(() => { late = true; ctrl.abort(); }, 30000);
      try {
        const { notes, changed } = await factCheck(p.script, this.s, { signal: ctrl.signal, log: (m) => this.log(m), avoid: this.writerProvider });
        p.factCheckNotes = notes;
        p.factChecked = true;
        this.h.step('facts', 'done', changed ? `${changed} fix${changed > 1 ? 'es' : ''} applied` : 'No problems found');
        this.h.scriptReady?.();
        return { changed };
      } catch (e) {
        if (this.signal.aborted) return { aborted: true, changed: 0 };
        this.log(late ? 'Fact-check skipped: the free checker took over 30 s.' : `Fact-check skipped: ${e.message}`);
        this.h.step('facts', 'warn', 'Skipped — review facts yourself');
        return { changed: 0 };
      } finally {
        clearTimeout(timer);
        this.signal.removeEventListener('abort', onAbort);
      }
    })();
  }

  async ensureAssets() {
    const p = this.p;
    const scenes = p.script.scenes;
    const size = imageSize(p.options, qualityOf(p.options, this.s));

    // 3D depth runs one image at a time as each image lands.
    let depthChain = Promise.resolve();
    let depthDone = 0, depthTodo = 0;
    const queueDepth = (scene) => {
      if (!this.use3d) return;
      const entry = p.images.get(scene.id);
      if (!entry || entry.depth) return;
      depthTodo++;
      this.h.step('depth', 'active', `${depthDone} / ${depthTodo}`);
      depthChain = depthChain.then(async () => {
        if (this.signal.aborted) return;
        const img = entry.bitmap || null;
        entry.depth = img ? await estimateDepth(img, { log: (m) => this.log(m) }) : null;
        depthDone++;
        this.h.step('depth', 'active', `${depthDone} / ${depthTodo}${entry.depth?.synthetic ? ' · estimated' : ''}`);
      });
    };
    onDepthProgress((d) => this.h.step('depth', 'active', `Downloading 3D model ${Math.round(d.loaded / d.total * 100)}% (one time)`));

    const visualJob = async () => {
      const todo = scenes.filter(s => {
        const have = p.images.get(s.id);
        return !have || (!have.custom && have.key !== this.imageKey(s));
      });
      for (const s of scenes) if (!todo.includes(s)) queueDepth(s); // e.g. custom uploads
      if (!todo.length) { this.h.step('visuals', 'done', `${scenes.length} images`); return; }
      this.h.step('visuals', 'active', `0 / ${todo.length}`);
      let done = 0, failed = 0;
      const isFree = () => isFreeImageTier(this.s); // can flip mid-run if a saved key is refused
      const free = isFree();
      // Free tier: ask for shots spread across the video first (start, middle, end…), so if the
      // service's limit cuts us off, the images we did get cover the whole story.
      const order = free ? spreadOrder(todo) : todo;
      let limited = false;
      let waiting = [];
      const fetchRound = (list, limit = imageConcurrency(this.s)) => mapLimit(list, limit, async (scene) => {
        const key = this.imageKey(scene);
        if (limited) { waiting.push(scene); return; }
        const prompt = imagePromptFor(scene, p.script, p.options.style);
        const bitmap = await generateImage(prompt, { ...size, seed: scene.seed }, this.s, { signal: this.signal, quick: isFree(), log: (m) => this.log(`Scene ${scenes.indexOf(scene) + 1}: ${m}`) });
        if (!bitmap && isFree()) { limited = true; waiting.push(scene); return; }
        if (!bitmap) failed++;
        p.images.set(scene.id, { key, bitmap, custom: false, depth: null });
        done++;
        this.h.step('visuals', 'active', `${done} / ${todo.length}`);
        this.h.scene?.(scenes.indexOf(scene));
        queueDepth(scene);
      });
      await fetchRound(order);
      if (isFree() && waiting.length === order.length) {
        // Not a single image: the allowance is used up right now. One wait for it to reset is worth it.
        this.h.step('visuals', 'active', 'Free image limit hit — waiting 45 s for it to reset…');
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 46000);
          this.signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
        });
        const again = waiting; waiting = []; limited = false;
        await fetchRound(again, 1); // one at a time: a burst right after the reset gets refused
      }
      if (waiting.length) {
        // Rate limited. Rather than wait 45 s per image (or show blank art), the remaining shots
        // reuse the nearest finished image with their own camera move. ↻ on a shot fetches its own later.
        const have = scenes.map((s, i) => ({ i, e: p.images.get(s.id) })).filter(x => x.e?.bitmap && x.e.key !== 'borrowed');
        this.log(`Free image limit reached after ${have.length} image${have.length === 1 ? '' : 's'} (about 1 every 45 s without a key). Reusing them for the other ${waiting.length} shot${waiting.length === 1 ? '' : 's'}.`);
        for (const scene of waiting) {
          const i = scenes.indexOf(scene);
          const near = have.slice().sort((a, b) => Math.abs(a.i - i) - Math.abs(b.i - i))[0];
          p.images.set(scene.id, { key: 'borrowed', bitmap: near ? near.e.bitmap : null, custom: false, depth: null });
          if (!near) failed++;
          this.h.scene?.(i);
          queueDepth(scene);
        }
        this.h.step('visuals', 'warn', have.length
          ? `${have.length} images shared across ${scenes.length} shots (free limit). A free Pollinations key gives every shot its own.`
          : 'Image service is rate limited. Wait a minute, then hit ↻, or add a free Pollinations key.');
        return;
      }
      this.h.step('visuals', failed ? 'warn' : 'done', failed ? `${failed} used fallback art — hit ↻ to retry` : `${scenes.length} images`);
    };

    const voiceJob = async () => {
      const todo = scenes.filter(s => p.voices.get(s.id)?.key !== this.voiceKey(s));
      this.narrator = getNarrator(this.s, (m) => this.log(m));
      if (!todo.length) { this.h.step('voice', 'done', this.voiceSummary()); return; }
      this.h.step('voice', 'active', this.narrator.engine === 'kokoro' ? 'Warming up voice…' : '');
      if (this.narrator.engine === 'kokoro') {
        this.narrator.onProgress = (d) => this.h.step('voice', 'active', `Downloading voice ${Math.round(d.loaded / d.total * 100)}% (one time)`);
        try {
          await warmNarrator(this.narrator);
        } catch (e) {
          if (this.signal.aborted) throw e;
          this.log(`Built-in voice could not load (${e.message}); using cloud voice.`);
          this.narrator.engine = 'pollinations';
        }
      }
      let done = 0;
      // The built-in voice is one worker thread, so it goes line by line; cloud voices are network
      // calls and can run several at once.
      const lanes = this.narrator.engine === 'kokoro' ? 1 : 3;
      await mapLimit(todo, lanes, async (scene) => {
        if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        // Capture the text and its key together, before waiting. The fact-check may rewrite this
        // line while it is being spoken; the key must describe the audio we actually made.
        const narration = scene.narration;
        const key = this.voiceKey(scene);
        const data = await this.narrator.speak(narration, this.pace.voice);
        p.voices.set(scene.id, { key, data });
        done++;
        this.h.step('voice', 'active', `${done} / ${todo.length} lines`);
      });
      const silent = this.narrator.engine === 'none';
      this.h.step('voice', silent && this.s.ttsEngine !== 'none' ? 'warn' : 'done', silent ? 'No voice — captions only' : this.voiceSummary());
    };

    if (!this.use3d) this.h.step('depth', 'skip', 'Off in settings');
    await Promise.all([visualJob(), voiceJob()]);
    await depthChain;
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (this.use3d) {
      const synthetic = scenes.some(s => p.images.get(s.id)?.depth?.synthetic);
      this.h.step('depth', 'done', synthetic ? 'Estimated depth (AI model unavailable)' : `${scenes.length} scenes in 3D`);
    }
  }

  voiceSummary() {
    const e = this.narrator?.engine || this.s.ttsEngine;
    return e === 'kokoro' ? `Kokoro · ${this.s.voice}` : e === 'elevenlabs' ? 'ElevenLabs' : e === 'pollinations' ? 'Cloud voice' : 'Captions only';
  }

  imageKey(s) { return `${s.visual}|${s.seed}|${this.p.options.style}|${formatOf(this.p.options)}|${this.s.imageProvider}`; }
  voiceKey(s) { return `${s.narration}|${this.s.ttsEngine}|${this.s.voice}|${this.s.voiceSpeed}|${this.p.options.pace}|${this.s.elevenVoice || ''}`; }

  async ensureMix() {
    const p = this.p;
    this.h.step('sound', 'active');
    const scenes = p.script.scenes;
    p.timeline = buildTimeline(scenes, scenes.map(s => p.voices.get(s.id)?.data || null), { wps: this.pace.wps });
    const mood = p.options.mood;
    const musicKey = `${mood}|${Math.ceil(p.timeline.total)}|${p.userMusic ? p.userMusic.duration : ''}`;
    if (p.musicKey !== musicKey) {
      p.music = p.userMusic || (mood === 'none' ? null : await synthMusic(mood, p.timeline.total));
      p.musicKey = musicKey;
    }
    p.audio = await mixSoundtrack(p.timeline, { music: p.music, musicVolume: Number(this.s.musicVolume) });
    this.h.step('sound', 'done', `${p.timeline.total.toFixed(1)}s · ${mood === 'none' ? 'no music' : p.userMusic ? 'your music' : mood + ' score'}`);
  }

  async prepare() {
    await this.prepareAssets();
    await this.ensureMix();
  }

  async prepareAssets() {
    await this.ensureScript();
    await this.ensureAssets();
    const check = await this.factJob;
    this.factJob = null; // consumed; a re-used pipeline must not replay an old result
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (check?.changed) {
      this.log(`Fact-check corrected ${check.changed} line${check.changed > 1 ? 's' : ''}; regenerating only those scenes.`);
      await this.ensureAssets();
    }
  }

  makeRenderer(canvas) {
    const p = this.p;
    const entries = p.script.scenes.map(s => p.images.get(s.id));
    return new Renderer(canvas, {
      timeline: p.timeline,
      images: entries.map(e => e?.bitmap || null),
      depths: entries.map(e => (this.use3d ? e?.depth || null : null)),
      options: p.options,
      settings: this.s,
      script: p.script,
    });
  }

  async render() {
    const p = this.p;
    await loadFonts();
    this.h.step('render', 'active', 'Starting encoder…');
    const { width, height } = outputSize(p.options, this.s);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const renderer = this.makeRenderer(canvas);
    const t0 = performance.now();
    const fps = Number(p.options.fps || this.s.fps) || 30;
    try {
      const out = await exportVideo({
        renderer, audio: p.audio, fps, signal: this.signal,
        onProgress: ({ frame, total, eta, realtime }) => {
          const pct = Math.round(frame / total * 100);
          this.h.progress?.('render', frame / total, `${pct}% · frame ${frame}/${total}${eta != null ? ` · ~${Math.ceil(eta)}s left` : ''}${realtime ? ' · real-time mode' : ''}`);
        },
      });
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      this.h.step('render', 'done', `${width}×${height} · ${fps}fps · ${(out.blob.size / 1048576).toFixed(1)} MB · ${secs}s`);
      this.log(`Encoded with ${out.codec}${renderer.gl ? ' · 3D camera on' : ' · 2D camera'}`);
      if (p.video?.url) URL.revokeObjectURL(p.video.url);
      p.video = { ...out, url: URL.createObjectURL(out.blob), width, height };
      return p.video;
    } finally {
      renderer.dispose();
    }
  }
}

// First, middle, last, then the gaps: [0..6] -> 0, 3, 6, 1, 4, 2, 5 (roughly).
function spreadOrder(items) {
  const n = items.length;
  if (n <= 2) return items.slice();
  const picked = new Set();
  const out = [];
  for (let parts = 2; out.length < n; parts *= 2) {
    for (let k = 0; k <= parts; k++) {
      const i = Math.round((k / parts) * (n - 1));
      if (!picked.has(i)) { picked.add(i); out.push(items[i]); }
    }
  }
  return out;
}
