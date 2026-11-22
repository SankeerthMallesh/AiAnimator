// Orchestrates a project: script → fact check → visuals + 3D depth + voice (in parallel) → soundtrack → render.
// Every step is incremental: editing one scene only regenerates what changed.

import { writeScript, factCheck, imagePromptFor, scriptFromText } from './llm.js';
import { generateImage, imageSize, mapLimit, imageConcurrency, isFreeImageTier, BLOCKED, cloudflareReady, cloudflareUsedUp } from './images.js';
import { getNarrator, warmNarrator } from './tts.js';
import { finishLine } from '../../shared/voicefx.js';
import { auraUsed, serverVoiceName, speakAllLines, voiceReport, resetVoiceReport } from './tts.js';
import { buildTimeline, synthMusic, mixSoundtrack } from './audio.js';
import { filmScore, cueSheet, scoreSections } from '../../shared/filmsound.js';
import { planShots } from './z3d/plan.js';
import { teaserIndex, withTeaser, hookCues } from '../../shared/hooks.js';
import { Renderer, loadFonts } from './renderer.js';
import { DrawnRenderer } from './drawn.js';
import { exportVideo } from './encoder.js';
import { RenderLog, publishLog, measureAudio, slugName } from '../../shared/renderlog.js';
import { estimateDepth, onDepthProgress } from './depth.js';
import { FORMATS, PACES, STYLES, MOODS, formatOf } from './presets.js';
import { clipsEnabled, generateClip } from './clips.js';

export const STEPS = [
  ['script', 'Write script'],
  ['facts', 'Fact-check'],
  ['visuals', 'Generate visuals'],
  ['depth', 'Build 3D scenes'],
  ['motion', 'Animate shots'],
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
  get use3d() { return this.s.depth3d !== 'off' && !this.drawn; }
  // A look drawn in code ('3d' or 'blocky'): no AI pictures, depth or clips, only the voice.
  get drawn() { return STYLES[this.p.options.style]?.drawn || null; }

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
      let done = 0, failed = 0, blocked = 0;
      const blockedScenes = [];
      await cloudflareReady(); // the site's own Cloudflare allowance removes the free-tier pacing
      // The free-tier pacing (wait 45 s, fetch one at a time) is for public services; when the site's
      // own allowance is used up for today there is nothing to wait for.
      const isFree = () => isFreeImageTier(this.s) && !cloudflareUsedUp(); // can flip mid-run if a saved key is refused
      const free = isFree();
      // Free tier: ask for shots spread across the video first (start, middle, end…), so if the
      // service's limit cuts us off, the images we did get cover the whole story.
      const order = free ? spreadOrder(todo) : todo;
      const videoSeed = (p.videoSeed ||= (scenes[0]?.seed || Math.floor(Math.random() * 1e9)));
      let limited = false;
      let waiting = [];
      const fetchRound = (list, limit = imageConcurrency(this.s)) => mapLimit(list, limit, async (scene) => {
        const key = this.imageKey(scene);
        if (limited) { waiting.push(scene); return; }
        const prompt = imagePromptFor(scene, p.script, p.options.style);
        // One seed for the whole video (where the picture service takes one), so shots stay alike.
        let bitmap = await generateImage(prompt, { ...size, seed: videoSeed }, this.s, { signal: this.signal, quick: isFree(), log: (m) => this.log(`Scene ${scenes.indexOf(scene) + 1}: ${m}`) });
        if (bitmap === BLOCKED) { bitmap = null; blocked++; blockedScenes.push(scene); }
        else if (!bitmap && isFree()) { limited = true; waiting.push(scene); return; }
        if (!bitmap) failed++;
        p.images.set(scene.id, { key, bitmap, custom: false, depth: null, prompt, seed: videoSeed });
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
      if (waiting.length && p.options.patient && isFree()) {
        // Patient mode: the free service gives about one image every 45 s, so fetch the rest one by one.
        const rest = waiting; waiting = [];
        for (let k = 0; k < rest.length; k++) {
          for (let left = 46; left > 0; left--) {
            this.h.step('visuals', 'active', `${done} / ${todo.length} · next free image in ${left}s`);
            await new Promise((resolve, reject) => {
              const t = setTimeout(resolve, 1000);
              this.signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
            });
          }
          limited = false;
          await fetchRound([rest[k]], 1);
        }
      }
      for (const scene of scenes) delete scene.reframe;
      // A shot whose picture was rejected shows the nearest safe picture, framed differently, instead of blank art.
      blockedScenes.forEach((scene, n) => {
        const i = scenes.indexOf(scene);
        const ok = scenes.map((sc, k) => ({ k, e: p.images.get(sc.id) })).filter(x => x.e?.bitmap && !blockedScenes.includes(scenes[x.k]));
        const near = ok.sort((a, b) => Math.abs(a.k - i) - Math.abs(b.k - i))[0];
        if (!near) return;
        p.images.set(scene.id, { key: this.imageKey(scene), bitmap: near.e.bitmap, custom: false, depth: null });
        const [zoom, x, y] = [[1.35, -0.12, 0.1], [1.3, 0.12, 0.08], [1.5, 0, 0.14], [1.4, -0.14, 0.04]][n % 4];
        scene.reframe = { zoom, x, y };
        failed = Math.max(0, failed - 1);
        this.h.scene?.(i);
      });
      if (waiting.length) {
        // Rate limited. Rather than wait 45 s per image (or show blank art), the remaining shots
        // reuse the nearest finished image, each framed on a different part of it. ↻ fetches a shot's own later.
        const have = scenes.map((s, i) => ({ i, e: p.images.get(s.id) })).filter(x => x.e?.bitmap && x.e.key !== 'borrowed');
        this.log(`Free image limit reached after ${have.length} image${have.length === 1 ? '' : 's'} (about 1 every 45 s without a key). Reusing them for the other ${waiting.length} shot${waiting.length === 1 ? '' : 's'}.`);
        // Gentle crops that favour the upper half, where faces and subjects usually are.
        const FRAMES = [[1.35, -0.12, 0.1], [1.3, 0.12, 0.08], [1.5, 0, 0.14], [1.35, 0.14, 0], [1.4, -0.14, 0.04], [1.55, 0.05, 0.12], [1.3, -0.08, 0.12]];
        waiting.sort((a, b) => scenes.indexOf(a) - scenes.indexOf(b));
        waiting.forEach((scene, n) => {
          const i = scenes.indexOf(scene);
          const near = have.slice().sort((a, b) => Math.abs(a.i - i) - Math.abs(b.i - i))[0];
          p.images.set(scene.id, { key: 'borrowed', bitmap: near ? near.e.bitmap : null, custom: false, depth: null });
          if (near) { const [zoom, x, y] = FRAMES[n % FRAMES.length]; scene.reframe = { zoom, x, y }; } else failed++;
          this.h.scene?.(i);
          queueDepth(scene);
        });
        this.h.step('visuals', 'warn', have.length
          ? `${have.length} of ${scenes.length} pictures (free limit). Tick "Unique picture for every shot" under More to wait for all.`
          : 'Image service is rate limited. Wait a minute, then hit ↻.');
        return;
      }
      if (blocked) { this.log(`${blocked} picture${blocked > 1 ? 's were' : ' was'} rejected by the safety check and replaced with plain artwork. Hit ↻ on that shot or edit its description to try again.`); }
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
      if (this.narrator.engine !== 'elevenlabs' && this.narrator.engine !== 'none' && todo.length > 1) {
        // One take for the whole script: wait for the fact-check first (a few seconds), so its fixes
      // are in the take instead of being re-recorded line by line afterwards.
      if (this.factJob) {
        this.h.step('voice', 'active', 'Waiting for the fact-check…');
        await Promise.race([this.factJob.catch(() => null), new Promise(r => setTimeout(r, 45000))]);
        todo.splice(0, todo.length, ...scenes.filter(s => p.voices.get(s.id)?.key !== this.voiceKey(s)));
      }
      this.h.step('voice', 'active', 'Reading the whole script…');
        this.narrator.batch = await speakAllLines(todo.map(s => s.narration), this.s.voice, todo.map(s => s.delivery || ''));
        if (this.narrator.batch) this.log('Narrator read the whole script in one take.');
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
        const data = finishLine(await this.narrator.speak(narration, this.pace.voice, scene.delivery));
        p.voices.set(scene.id, { key, data });
        done++;
        this.h.step('voice', 'active', `${done} / ${todo.length} lines`);
      });
      const silent = this.narrator.engine === 'none';
      this.h.step('voice', silent && this.s.ttsEngine !== 'none' ? 'warn' : 'done', silent ? 'No voice — captions only' : this.voiceSummary());
    };

    if (this.drawn) {
      for (const id of ['visuals', 'depth', 'motion']) this.h.step(id, 'skip', 'Drawn in code, no pictures needed');
      await voiceJob();
      if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      return;
    }
    if (!this.use3d) this.h.step('depth', 'skip', 'Off in settings');
    await Promise.all([visualJob(), voiceJob(), this.clipJob()]);
    await depthChain;
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (this.use3d) {
      const synthetic = scenes.some(s => p.images.get(s.id)?.depth?.synthetic);
      this.h.step('depth', 'done', synthetic ? 'Estimated depth (AI model unavailable)' : `${scenes.length} scenes in 3D`);
    }
  }

  // Paid, optional: a real AI video clip for every shot.
  async clipJob() {
    const p = this.p;
    if (!clipsEnabled(this.s)) { this.h.step('motion', 'skip', this.s.videoClips === 'on' ? 'Needs a fal.ai, Runway or paid Pollinations key' : 'Off (paid option in Settings)'); return; }
    p.clips = p.clips || new Map();
    const scenes = p.script.scenes;
    const style = STYLES[p.options.style] || {};
    const keyOf = (s) => `${s.visual}|${this.s.videoModel}|${formatOf(p.options)}`;
    const todo = scenes.filter(s => !p.clips.get(s.id)?.custom && p.clips.get(s.id)?.key !== keyOf(s));
    if (!todo.length) { this.h.step('motion', 'done', `${scenes.length} clips`); return; }
    let done = 0, failed = 0, stop = '';
    this.h.step('motion', 'active', `0 / ${todo.length} clips · this takes a few minutes`);
    await mapLimit(todo, 2, async (scene) => {
      if (stop) return;
      const motion = { 'push-in': 'slow push-in', 'pull-out': 'slow pull-back', 'pan-left': 'camera trucks left', 'pan-right': 'camera trucks right', orbit: 'camera orbits the subject', impact: 'fast punch-in' }[scene.camera] || 'gentle camera move';
      const prompt = `${scene.visual}. ${motion}, smooth natural motion. ${(style.prompt || '').slice(0, 160)}`;
      try {
        // The shot's picture, so image-to-video models animate exactly what the video shows.
        let image = null;
        const bmp = p.images?.get(scene.id)?.bitmap;
        if (bmp) {
          const c = document.createElement('canvas');
          const sc = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
          c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          image = c.toDataURL('image/jpeg', 0.88);
        }
        const clip = await generateClip(prompt, { aspectRatio: formatOf(p.options), image }, this.s, { signal: this.signal });
        const old = p.clips.get(scene.id);
        if (old?.clip?.url) URL.revokeObjectURL(old.clip.url);
        p.clips.set(scene.id, { key: keyOf(scene), clip });
        done++;
      } catch (e) {
        if (this.signal.aborted) throw e;
        failed++;
        this.log(`Scene ${scenes.indexOf(scene) + 1}: video clip failed (${e.message}); using the still picture.`);
        if ([401, 402, 403].includes(e.status)) stop = e.status === 402 ? 'Your video key has no paid credit' : 'Your video key was refused';
      }
      this.h.step('motion', 'active', `${done} / ${todo.length} clips`);
    });
    if (stop) this.h.step('motion', 'warn', `${stop}. Shots without a clip use pictures.`);
    else this.h.step('motion', failed ? 'warn' : 'done', failed ? `${done} clips, ${failed} fell back to pictures` : `${done} animated clips`);
  }

  voiceSummary() {
    const e = this.narrator?.engine || this.s.ttsEngine;
    if (e !== 'elevenlabs' && auraUsed()) return serverVoiceName();
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
    // Test switches: ?stem=voice|music renders only that part (same master gain as the full mix),
    // ?musicseed= fixes the score so two renders share it.
    const q = new URLSearchParams(location.search), stem = /^(voice|music)$/.test(q.get('stem') || '') ? q.get('stem') : null;
    if (q.get('musicseed') || stem) p.musicSeed = Number(q.get('musicseed')) || 1234567;
    p.stem = stem;
    p.musicSeed ||= Math.floor(Math.random() * 1e9);
    // Looks drawn in code get the film sound: a score in sections that follows the story and
    // effects on the shot plan (the same plan the renderer cuts to).
    const specs = this.drawn ? withTeaser(planShots(p.timeline.scenes, new Map()), teaserIndex(p.timeline.scenes, p.script.teaser)) : null;
    const sections = specs ? scoreSections(specs, p.timeline.total) : null;
    const musicKey = `${mood}|${p.musicSeed}|${Math.ceil(p.timeline.total)}|${p.userMusic ? p.userMusic.duration : ''}|${sections ? JSON.stringify(sections.map(x => [x.kind, x.start.toFixed(1)])) : ''}`;
    if (p.musicKey !== musicKey) {
      p.music = p.userMusic || (mood === 'none' ? null
        : sections ? await filmScore(p.timeline.total, { mood: MOODS[mood], sections, seed: p.musicSeed })
          : await synthMusic(mood, p.timeline.total, (p.musicSeed ||= Math.floor(Math.random() * 1e9))));
      p.musicKey = musicKey;
    }
    // The hook's sounds (a hit, a riser into the cold open's cut, a boom on it) for every look.
    const cues = specs ? [...hookCues(), ...cueSheet(specs, p.timeline.total)].sort((a, b) => a.t - b.t) : null;
    p.audio = await mixSoundtrack(p.timeline, { music: p.music, musicVolume: Number(this.s.musicVolume), stem: p.stem, cues, extraCues: cues ? null : hookCues() });
    this.h.step('sound', 'done', `${p.timeline.total.toFixed(1)}s · ${mood === 'none' ? 'no music' : p.userMusic ? 'your music' : mood + (sections ? ' film score' : ' score')}${cues ? ` · ${cues.length} sound effects` : ''}`);
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

  makeRenderer(canvas, size = null) {
    const p = this.p;
    if (this.drawn) {
      // The preview canvas keeps its page size; the export passes the output size.
      // The live preview renders at half size (fast on any computer); the export at the output size.
      const out = outputSize(p.options, this.s), even = (n) => Math.round(n / 2) * 2;
      const { width, height } = size || { width: even(out.width / 2), height: even(out.height / 2) };
      return new DrawnRenderer(canvas, { timeline: p.timeline, script: p.script, kind: this.drawn, W: width, H: height, perf: this.drawnPerf(size), captions: this.s.captionStyle !== 'off' });
    }
    const entries = p.script.scenes.map(s => p.images.get(s.id));
    return new Renderer(canvas, {
      timeline: p.timeline,
      images: entries.map(e => e?.bitmap || null),
      depths: entries.map(e => (this.use3d ? e?.depth || null : null)),
      clips: p.script.scenes.map(s => ((clipsEnabled(this.s) || p.clips?.get(s.id)?.custom) ? p.clips?.get(s.id)?.clip || null : null)),
      options: p.options,
      settings: this.s,
      script: p.script,
      meta: entries.map(e => ({ prompt: e?.prompt || '', seed: e?.seed ?? null })),
    });
  }

  // Render speed for drawn looks: the export uses full quality; the live preview is lighter.
  drawnPerf(size) {
    return size ? {} : { msaa: 0, aoSamples: 4, shadowMax: 1024 };
  }

  // The render log's script, voice and sound sections.
  fillLog(log) {
    const p = this.p, m = log.finish(p.timeline.total);
    const scenes = p.script.scenes;
    m.script = { title: p.script.title, lines: scenes.map(s => s.narration), characters: (p.script.characters || []).map(c => ({ id: c.id || c.name, description: c.look || '' })) };
    const v = voiceReport(scenes.map(s => s.narration));
    // Words per minute counts what the narrator said (numbers spelled out), not the written words.
    const words = v.spoken.reduce((n, l) => n + String(l || '').split(/\s+/).filter(Boolean).length, 0);
    // Over the span from the first word to the last, like a transcript-based count.
    const voiced = p.timeline.scenes.filter(s => s.voice);
    const first = voiced[0], last = voiced[voiced.length - 1];
    const talk = first ? (last.start + last.voiceOffset + last.voice.samples.length / last.voice.sampleRate) - (first.start + first.voiceOffset) : 0;
    m.voice = { engine: v.engine, maxPlaybackRate: v.maxRate, wordsSpoken: words, wpm: talk ? Math.round(words / talk * 60) : 0, spokenText: v.spoken };
    const a = measureAudio(p.audio);
    m.audio = { targetLufs: -13.5, measuredLufs: a.lufs, truePeak: a.peakDb, normalizePath: 'js-fallback', stem: p.stem || 'full', musicSeed: p.musicSeed ?? null, musicVolume: Number(this.s.musicVolume), masterGainDb: p.audio?.levelInfo ? Math.round(20 * Math.log10(p.audio.levelInfo.gain) * 100) / 100 : null, music: p.audio?.musicInfo || null };
    return m;
  }

  async render() {
    const p = this.p;
    await loadFonts();
    this.h.step('render', 'active', 'Starting encoder…');
    const { width, height } = outputSize(p.options, this.s);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const renderer = this.makeRenderer(canvas, { width, height });
    if (renderer.ready) { this.h.step('render', 'active', 'Building the 3D shots…'); await renderer.ready; }
    renderer.log = new RenderLog({ tab: p.options.style === 'blocky' || this.drawn === 'blocky' ? 'blocky' : '3d', style: p.options.style });
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
      this.log(`Encoded with ${out.codec}${this.drawn ? ' · drawn in code' : renderer.gl ? ' · 3D camera on' : ' · 2D camera'}`);
      if (renderer.describe) this.log(`Shots: ${renderer.describe().join(' | ')}`);
      if (p.video?.url) URL.revokeObjectURL(p.video.url);
      p.video = { ...out, url: URL.createObjectURL(out.blob), width, height };
      p.manifest = this.fillLog(renderer.log);
      publishLog(p.manifest, slugName(p.script.title));
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
