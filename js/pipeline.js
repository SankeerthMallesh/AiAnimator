// Script, optional background plates, voice, score, then a code-drawn render.
// Plates never hold the video longer than 20 seconds. A missing plate is a drawn set.

import { writeScript, factCheck } from './llm.js';
import { Script } from './script.js';
import { Demo } from './demo.js';
import { fetchPlate, platePrompt, mapLimit } from './images.js';
import { getNarrator, warmNarrator } from './tts.js';
import { buildTimeline, synthMusic, mixSoundtrack } from './audio.js';
import { Stage, loadFonts } from './stage.js';
import { exportVideo } from './encoder.js';
import { FORMATS, PACES, formatOf } from './presets.js';

export const STEPS = [
  ['script', 'Write script'],
  ['facts', 'Fact-check'],
  ['plates', 'Backgrounds'],
  ['voice', 'Record voice'],
  ['sound', 'Score and effects'],
  ['render', 'Render MP4'],
];

export function qualityOf(options, settings) {
  const q = String(options.quality || settings.quality || '720');
  return q === 'fast' ? 720 : q === 'hd' ? 1080 : (Number(q) || 720);
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
    plates: new Map(),
    voices: new Map(),
    music: null, musicKey: '',
    timeline: null, audio: null,
    video: null,
  };
}

export class Pipeline {
  constructor(project, settings, hooks) {
    this.p = project;
    this.s = settings;
    this.h = hooks || {};
    this.abort = new AbortController();
    this.narrator = null;
    if (!this.p.plates) this.p.plates = new Map();
    if (!this.p.voices) this.p.voices = new Map();
  }

  cancel() { this.abort.abort(); this.narrator?.cancelPending(); }
  get signal() { return this.abort.signal; }
  log(m) { this.h.log?.(m); }
  get pace() { return PACES[this.p.options.pace] || PACES.normal; }
  get demo() { return this.p.options.mode === 'demo'; }

  async ensureScript() {
    const p = this.p;
    if (p.script?.scenes?.length) {
      this.h.step('script', 'done', `${p.script.scenes.length} scenes`);
      this.h.step('facts', p.factChecked ? 'done' : 'skip');
      return;
    }
    this.h.step('script', 'active');
    const t0 = performance.now();
    if (this.demo) {
      p.script = Script.normalize(Demo.raw(), { ...p.options, topic: p.topic });
      p.factChecked = true;
      this.h.step('script', 'done', 'Built-in test reel');
      this.h.step('facts', 'skip', 'Baked script');
      this.h.scriptReady?.();
      return;
    }
    if (p.options.mode === 'own') {
      p.script = Script.fromText(p.options.ownScript || p.topic, { ...p.options, topic: p.topic });
      this.h.step('script', 'done', `${p.script.scenes.length} scenes from your text`);
      this.h.step('facts', 'skip', 'Your own script');
      this.h.scriptReady?.();
      return;
    }
    const { script, provider } = await writeScript(p.topic, p.options, this.s, { signal: this.signal, log: (m) => this.log(m) });
    p.script = script;
    this.writerProvider = provider;
    this.h.step('script', 'done', `${script.scenes.length} scenes · ${provider} · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    this.h.scriptReady?.();
    if (this.s.factCheck === false) this.h.step('facts', 'skip', 'Off in settings');
    else this.startFactCheck();
  }

  startFactCheck() {
    const p = this.p;
    this.h.step('facts', 'active', 'Checking in the background…');
    this.factJob = (async () => {
      const ctrl = new AbortController();
      const onAbort = () => ctrl.abort();
      this.signal.addEventListener('abort', onAbort, { once: true });
      let late = false;
      const timer = setTimeout(() => { late = true; ctrl.abort(); }, 70000);
      try {
        const { notes, changed } = await factCheck(p.script, this.s, { signal: ctrl.signal, log: (m) => this.log(m), avoid: this.writerProvider });
        p.factCheckNotes = notes;
        p.factChecked = true;
        this.h.step('facts', 'done', changed ? `${changed} fix${changed > 1 ? 'es' : ''} applied` : 'No problems found');
        this.h.scriptReady?.();
        return { changed };
      } catch (e) {
        if (this.signal.aborted) return { aborted: true, changed: 0 };
        this.log(late ? 'Fact-check skipped: the free checker took over a minute.' : `Fact-check skipped: ${e.message}`);
        this.h.step('facts', 'warn', 'Skipped — review the lines yourself');
        return { changed: 0 };
      } finally {
        clearTimeout(timer);
        this.signal.removeEventListener('abort', onAbort);
      }
    })();
  }

  plateKey(scene) { return `${scene.bg}|${scene.seed}|${formatOf(this.p.options)}`; }
  voiceKey(scene) {
    return `${scene.narration}|${this.s.ttsEngine}|${this.s.voice}|${this.s.voiceSpeed}|${this.p.options.pace}|${this.s.elevenVoice || ''}`;
  }

  async ensurePlates() {
    const p = this.p;
    if (this.demo || this.s.imageProvider === 'none' || p.options.plates === false) {
      this.h.step('plates', 'skip', 'Drawn in code');
      return;
    }
    const scenes = p.script.scenes;
    const wanted = [];
    for (const scene of scenes) {
      const have = p.plates.get(scene.id);
      if (have?.custom || (have?.bitmap && have.key === this.plateKey(scene))) continue;
      if (wanted.some(s => s.bg === scene.bg)) continue;
      wanted.push(scene);
      if (wanted.length >= 2) break;
    }
    if (!wanted.length) { this.h.step('plates', 'done', 'Already have them'); return; }
    this.h.step('plates', 'active', 'Asking for a background…');
    const deadline = performance.now() + 20000;
    let got = 0;
    for (const scene of wanted) {
      if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const remain = deadline - performance.now();
      if (remain < 1500) { this.log('Stopped waiting on backgrounds (20 second cap).'); break; }
      const prompt = platePrompt(scene.bg);
      const bmp = await fetchPlate(prompt, { width: 640, height: 360, seed: scene.seed || 1 }, this.s, {
        signal: this.signal, timeout: Math.min(12000, remain), log: (m) => this.log(m),
      });
      if (!bmp) continue;
      got++;
      const key = this.plateKey(scene);
      for (const s of scenes) {
        if (s.bg !== scene.bg) continue;
        const cur = p.plates.get(s.id);
        if (cur?.custom) continue;
        p.plates.set(s.id, { key: this.plateKey(s), bitmap: bmp });
      }
      this.h.scene?.(scenes.indexOf(scene));
      this.h.step('plates', 'active', `${got} background${got > 1 ? 's' : ''}`);
    }
    this.h.step('plates', got ? 'done' : 'warn', got ? `${got} painted background${got > 1 ? 's' : ''}` : 'Drawn backgrounds — the image service was busy');
  }

  async ensureVoice() {
    const p = this.p;
    const scenes = p.script.scenes;
    if (this.demo || this.s.ttsEngine === 'none') {
      this.h.step('voice', 'skip', this.demo ? 'Test reel has no voice' : 'Captions only');
      return;
    }
    const todo = scenes.filter(s => p.voices.get(s.id)?.key !== this.voiceKey(s));
    this.narrator = getNarrator(this.s, (m) => this.log(m));
    if (!todo.length) { this.h.step('voice', 'done', this.voiceSummary()); return; }
    this.h.step('voice', 'active', this.narrator.engine === 'kokoro' ? 'Warming up voice…' : '');
    if (this.narrator.engine === 'kokoro') {
      this.narrator.onProgress = (d) => {
        if (d?.total) this.h.step('voice', 'active', `Downloading voice ${Math.round(d.loaded / d.total * 100)}% (one time)`);
      };
      try { await warmNarrator(this.narrator); }
      catch (e) {
        if (this.signal.aborted) throw e;
        this.log(`Built-in voice could not load (${e.message}). Captions will carry the film.`);
        this.narrator.engine = 'none';
        this.h.step('voice', 'warn', 'No voice — captions only');
        return;
      }
    }
    let done = 0;
    await mapLimit(todo, this.narrator.engine === 'kokoro' ? 1 : 3, async (scene) => {
      if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const narration = scene.narration;
      const key = `${narration}|${this.s.ttsEngine}|${this.s.voice}|${this.s.voiceSpeed}|${p.options.pace}|${this.s.elevenVoice || ''}`;
      const data = await this.narrator.speak(narration, this.pace.voice);
      p.voices.set(scene.id, { key, data });
      done++;
      this.h.step('voice', 'active', `${done} / ${todo.length} lines`);
    });
    const silent = this.narrator.engine === 'none';
    this.h.step('voice', silent ? 'warn' : 'done', silent ? 'No voice — captions only' : this.voiceSummary());
  }

  voiceSummary() {
    const e = this.narrator?.engine || this.s.ttsEngine;
    return e === 'kokoro' ? `Kokoro · ${this.s.voice}` : e === 'elevenlabs' ? 'ElevenLabs' : e === 'pollinations' ? 'Cloud voice' : 'Captions only';
  }

  async ensureMix() {
    const p = this.p;
    this.h.step('sound', 'active');
    const scenes = p.script.scenes;
    p.timeline = buildTimeline(scenes, scenes.map(s => p.voices.get(s.id)?.data || null), { wps: this.pace.wps, endPad: this.demo ? 0.9 : 0.7 });
    const mood = p.options.mood || 'curious';
    const musicKey = `${mood}|${Math.ceil(p.timeline.total)}|${p.userMusic ? p.userMusic.duration : ''}`;
    if (p.musicKey !== musicKey) {
      p.music = p.userMusic || (mood === 'none' ? null : await synthMusic(mood, p.timeline.total));
      p.musicKey = musicKey;
    }
    p.audio = await mixSoundtrack(p.timeline, { music: p.music, musicVolume: Number(this.s.musicVolume) });
    this.h.step('sound', 'done', `${p.timeline.total.toFixed(1)}s · ${mood === 'none' ? 'no music' : p.userMusic ? 'your music' : mood + ' score'}`);
  }

  async prepare() {
    await this.ensureScript();
    await Promise.all([this.ensurePlates(), this.ensureVoice()]);
    const check = await this.factJob;
    this.factJob = null;
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (check?.changed) {
      this.log(`Fact-check corrected ${check.changed} line${check.changed > 1 ? 's' : ''}. Re-recording only those lines.`);
      await this.ensureVoice();
    }
    await this.ensureMix();
  }

  makeRenderer(canvas) {
    const stage = new Stage(canvas);
    stage.setView({
      script: this.p.script,
      timeline: this.p.timeline,
      plates: this.p.plates,
      settings: this.s,
      options: this.p.options,
    });
    return stage;
  }

  async render() {
    const p = this.p;
    await loadFonts();
    this.h.step('render', 'active', 'Starting encoder…');
    const { width, height } = outputSize(p.options, this.s);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const renderer = this.makeRenderer(canvas);
    const t0 = performance.now();
    const fps = Number(p.options.fps || this.s.fps) || 24;
    try {
      const out = await exportVideo({
        renderer, audio: p.audio, fps, signal: this.signal,
        onProgress: ({ frame, total, eta, realtime }) => {
          const pct = Math.round(frame / total * 100);
          this.h.progress?.('render', frame / total, `${pct}% · frame ${frame}/${total}${eta != null ? ` · ~${Math.ceil(eta)}s left` : ''}${realtime ? ' · real-time mode' : ''}`);
        },
      });
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      this.h.step('render', 'done', `${width}×${height} · ${fps} fps · ${(out.blob.size / 1048576).toFixed(1)} MB · ${secs}s`);
      this.log(`Encoded with ${out.codec}`);
      if (p.video?.url) URL.revokeObjectURL(p.video.url);
      p.video = { ...out, url: URL.createObjectURL(out.blob), width, height };
      return p.video;
    } finally {
      renderer.dispose();
    }
  }
}
