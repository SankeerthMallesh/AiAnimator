// Script, optional background plates, voice, score, then a code-drawn render.
// Plates never hold the video longer than 20 seconds. A missing plate is a drawn set.

import { writeScript, factCheck, waitForFreeText } from './llm.js';
import { Script, propTrigger } from './script.js';
import { Demo } from './demo.js';
import { fetchPlate, platePrompt, scenePrompt, mapLimit, cloudflareReady, cloudflareOn } from './images.js';
import { topicPictures } from './wiki.js';
import { isSafeImage } from './safety.js';
import { getNarrator, warmNarrator, auraUsed, serverVoiceName, speakAllLines, voiceReport } from './tts.js';
import { finishLine } from '../../shared/voicefx.js';
import { buildTimeline, synthMusic, mixSoundtrack } from './audio.js';
import { Stage, loadFonts } from './stage.js';
import { exportVideo } from './encoder.js';
import { RenderLog, publishLog, measureAudio, slugName } from '../../shared/renderlog.js';
import { FORMATS, PACES, MOODS, formatOf } from './presets.js';
import { TownRenderer, townShots } from './town.js';
import { markTownWeak } from './gpu.js';
import { filmScore, cueSheet, scoreSections } from '../../shared/filmsound.js';
import { characterOf, characterDelivery, characterLine } from '../../shared/voicechars.js';
// How long the voice waits for the fact-check before reading (big upgrade): Fast reads straight away and
// re-records only lines the check changes.
const FACT_WAIT = { fast: 0, balanced: 12000, best: 45000 };
import { hookCues } from '../../shared/hooks.js';

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
    factStatus: '',
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
      if (p.factStatus === 'unchecked') this.h.step('facts', 'warn', 'Not fact-checked');
      else if (p.factStatus === 'flagged') this.h.step('facts', 'warn', 'Flagged — a number is off');
      else this.h.step('facts', p.factChecked ? 'done' : 'skip');
      return;
    }
    this.h.step('script', 'active');
    const t0 = performance.now();
    if (this.demo) {
      p.script = Script.normalize(Demo.raw(), { ...p.options, topic: p.topic });
      p.factChecked = true;
      p.factStatus = 'baked';
      this.h.step('script', 'done', 'Built-in test reel');
      this.h.step('facts', 'skip', 'Baked script');
      this.h.scriptReady?.();
      return;
    }
    if (p.options.mode === 'own') {
      p.script = Script.fromText(p.options.ownScript || p.topic, { ...p.options, topic: p.topic });
      this.h.step('script', 'done', `${p.script.scenes.length} scenes from your text`);
      p.factChecked = false;
      p.factStatus = 'unchecked';
      p.factCheckNotes = ['Not fact-checked. This is your own script, so nothing verified these lines.'];
      this.log('Not fact-checked: this is your own script.');
      this.h.step('facts', 'warn', 'Not fact-checked');
      this.h.scriptReady?.();
      return;
    }
    this.startPainting();
    this.h.step('script', 'active', 'Asking the writer…');
    this.log('Asking the writer…');
    let waited = 0;
    const tick = setInterval(() => {
      waited += 1;
      this.h.step('script', 'active', `Asking the writer… ${waited}s`);
    }, 1000);
    let script, provider;
    try {
      ({ script, provider } = await writeScript(p.topic, p.options, this.s, {
        signal: this.signal,
        log: (m) => { this.log(m); this.h.step('script', 'active', m.slice(0, 90)); },
      }));
    } finally {
      clearInterval(tick);
    }
    p.script = script;
    this.writerProvider = provider;
    this.h.step('script', 'done', `${script.scenes.length} scenes · ${provider} · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    this.h.scriptReady?.();
    if (this.s.factCheck === false) this.h.step('facts', 'skip', 'Off in settings');
    else this.startFactCheck();
  }

  factTick(left) {
    const secs = Math.max(1, Math.ceil(left / 1000));
    this.h.step('facts', 'active', `Free text limit. Fact-check in ${secs}s…`);
  }

  startFactCheck() {
    const p = this.p;
    this.h.step('facts', 'active', 'Checking each claim…');
    this.log('Fact-check started.');
    this.factJob = (async () => {
      const onWait = (left) => this.factTick(left);
      try {
        await waitForFreeText(this.signal, onWait);
        if (this.signal.aborted) return { aborted: true, changed: 0 };
        const { notes, changed } = await factCheck(p.script, this.s, {
          signal: this.signal, log: (m) => this.log(m), avoid: this.writerProvider, topic: p.topic, onWait,
        });
        const fixed = Script.fixWellStick(p.script);
        if (fixed) {
          notes.push('Replaced a line that put the stick in the well. Syene’s well had no noon shadow; Alexandria’s stick cast the shadow.');
          this.log('Fact-check caught “a stick in a well” and split it into the well at Syene and the stick at Alexandria.');
        }
        const flags = Script.sanity(p.script, p.topic);
        p.factCheckNotes = [...notes, ...flags];
        p.factChecked = true;
        p.factStatus = flags.length ? 'flagged' : 'checked';
        if (flags.length) {
          this.log(`Fact-check finished, and a quantity is still off by orders of magnitude. ${flags.join(' ')}`);
          this.h.step('facts', 'warn', 'Flagged — a number is off');
        } else {
          const n = changed + fixed;
          this.h.step('facts', 'done', n ? `${n} fix${n > 1 ? 'es' : ''} applied` : 'No problems found');
        }
        this.h.scriptReady?.();
        return { changed: changed + fixed };
      } catch (e) {
        if (this.signal.aborted) return { aborted: true, changed: 0 };
        const fixed = Script.fixWellStick(p.script);
        const flags = Script.sanity(p.script, p.topic);
        if (fixed) flags.unshift('Replaced a line that put the stick in the well. Syene’s well had no noon shadow; Alexandria’s stick cast the shadow.');
        p.factChecked = false;
        p.factStatus = 'unchecked';
        p.factCheckNotes = [
          'Not fact-checked. The free checker did not answer, so these lines are not verified.',
          ...flags,
        ];
        this.log(`Not fact-checked: the free checker did not answer after the rate-limit wait (${e.message}). Do not treat these lines as verified.`);
        this.h.step('facts', 'warn', 'Not fact-checked');
        this.h.scriptReady?.();
        return { changed: fixed };
      }
    })();
  }

  plateKey(scene) { return `${scene.bg}|${scene.seed}|${formatOf(this.p.options)}`; }
  voiceKey(scene) {
    return `${scene.narration}|${this.s.ttsEngine}|${this.s.voice}|${this.s.voiceSpeed}|${this.p.options.pace}|${this.s.elevenVoice || ''}|${this.s.character || ''}`;
  }

  // Painting starts the moment the video starts: the free image service allows about one picture
  // every 45 seconds, and writing the script takes 15 seconds to a few minutes, so that time
  // becomes extra backgrounds. Before the script exists it paints topic views; after, the sets.
  startPainting() {
    const p = this.p;
    // The 3D cartoon town is drawn in code: no backgrounds to paint (and no image allowance spent).
    if (this.town || this.demo || this.s.imageProvider === 'none' || p.options.plates === false || this.paint) return;
    const views = [['wide establishing view', 'field'], ['up close at street level', 'city'], ['inside a building', 'inside'], ['at golden sunset', 'mountains']];
    const pool = [];
    const done = new Set();
    this.paint = { pool, stop: false };
    const fmt = formatOf(p.options);
    const size = fmt === '16:9' ? { width: 1024, height: 576 } : fmt === '1:1' ? { width: 768, height: 768 } : fmt === '4:5' ? { width: 640, height: 800 } : { width: 576, height: 1024 };
    const next = () => {
      const sc = p.script?.scenes || [];
      // With the site's own allowance there is no wait, so every scene gets a picture of its own line.
      if (cloudflareOn() && sc.length) {
        const scene = sc.find(x => !done.has(`scene:${x.id}`));
        if (scene) { done.add(`scene:${scene.id}`); return { prompt: scenePrompt(scene.bg || '', scene.set, p.topic, this.s.bgLook), set: scene.set, scene: scene.id }; }
      }
      const set = sc.map(x => x.set).find(x => x && !done.has(`set:${x}`));
      if (set) { done.add(`set:${set}`); return { prompt: scenePrompt(sc.find(x => x.set === set)?.bg || '', set, p.topic, this.s.bgLook), set }; }
      const v = views.find(([w]) => !done.has(w));
      if (v && !sc.length) { done.add(v[0]); return { prompt: scenePrompt(v[0], v[1], p.topic, this.s.bgLook), set: null }; }
      return null;
    };
    this.paint.running = (async () => {
      let misses = 0;
      await cloudflareReady();
      // One picture per scene (plus one spare) is all a video uses: painting more just burns the daily allowance.
      while (!this.paint.stop && pool.length < (cloudflareOn() ? Math.min(24, Math.max(6, (p.script?.scenes?.length || 9) + 1)) : 8) && misses < 12) {
        if (this.signal.aborted) return;
        const job = next();
        if (!job) { await new Promise(r => setTimeout(r, 2000)); misses++; continue; }
        const bmp = await fetchPlate(job.prompt, { ...size, seed: (Math.random() * 1e9) | 0 }, this.s, { signal: this.signal, timeout: cloudflareOn() ? 20000 : 35000, log: (m) => this.log(m) }).catch(() => null);
        if (bmp) { pool.push({ bitmap: bmp, set: job.set, scene: job.scene || null }); misses = 0; this.log(`Painted background ${pool.length}.`); }
        else { misses++; await new Promise(r => setTimeout(r, cloudflareOn() ? 1500 : 9000)); }
      }
    })();
  }

  // L5: the 3D cartoon town look (the default for new videos): drawn in code, no backgrounds to paint.
  get town() { return !this.demo && (this.p.options.look || 'painted') === 'town3d'; }

  async ensurePlates() {
    const p = this.p;
    if (this.town) { this.h.step('plates', 'skip', 'Drawn in code: the 3D cartoon town'); return; }
    if (this.demo || this.s.imageProvider === 'none' || p.options.plates === false) {
      this.h.step('plates', 'skip', 'Drawn in code');
      return;
    }
    const scenes = p.script.scenes;
    this.paintOnly = null;
    // Real photos, maps and paintings of the topic from Wikipedia come first.
    if (p.options.photos !== false && !this.demo) {
      const missing = scenes.filter(sc => { const h = p.plates.get(sc.id); return !(h?.custom || (h?.photo && h.key === this.plateKey(sc))); });
      if (!missing.length && p.credits) { this.h.step('plates', 'done', 'Already have them'); return; }
      this.h.step('plates', 'active', 'Finding real pictures…');
      try {
        const r = await topicPictures(p.topic, scenes, {
          signal: this.signal, log: (m) => this.log(m), timeout: 25000,
          isSafe: (bmp, name) => isSafeImage(bmp, name, (m) => this.log(m)),
        });
        p.sources = r.sources;
        p.credits = r.credits;
        if (r.byScene.size) {
          // Plenty of pictures: every scene gets one. Only a few: a picture goes where it clearly
          // matches the line, and the other scenes get painted 3D backgrounds, so one photo never
          // fills the whole video. A photo shown more than once is framed differently each time.
          const few = r.credits.length < Math.min(3, scenes.length);
          const shown = new Map();
          const rest = [];
          scenes.forEach((sc, i) => {
            const v = r.byScene.get(sc.id);
            if (p.plates.get(sc.id)?.custom) return;
            if (!v || (few && i > 0 && v.score < 2 && (shown.get(v.bitmap) || 0) > 0)) { rest.push(sc); return; }
            const n = shown.get(v.bitmap) || 0;
            shown.set(v.bitmap, n + 1);
            p.plates.set(sc.id, { key: this.plateKey(sc), bitmap: v.bitmap, photo: true, own: true,
              vx: [0, -0.18, 0.18, -0.1, 0.12][n % 5], vz: n ? [1, 1.35, 1.5, 1.4, 1.6][n % 5] : 1 });
            this.h.scene?.(i);
          });
          this.h.step('plates', 'active', `${r.credits.length} real picture${r.credits.length === 1 ? '' : 's'} from Wikipedia`);
          if (!rest.length) {
            this.h.step('plates', 'done', `${r.credits.length} real picture${r.credits.length === 1 ? '' : 's'} from Wikipedia`);
            if (this.paint) this.paint.stop = true;
            return;
          }
          this.paintOnly = new Set(rest.map(x => x.id));
          this.log(`Only ${r.credits.length} usable Wikipedia picture${r.credits.length === 1 ? '' : 's'}: painting backgrounds for ${rest.length} more scenes.`);
        }
        else this.log('Wikipedia had no usable pictures for this topic. Painting 3D scenes instead.');
      } catch (e) {
        if (this.signal.aborted) throw e;
        this.log(`Real pictures unavailable (${e.message}). Painting 3D scenes instead.`);
      }
    }
    this.startPainting();
    if (!this.paint) { this.h.step('plates', 'skip', 'Drawn in code'); return; }
    const pool = this.paint.pool;
    const sets = [...new Set(scenes.map(x => x.set))];
    // The free painter is slower: still ask for a picture per place, up to 8, so scenes do not repeat one view.
    const want = cloudflareOn() ? Math.min(24, scenes.length) : Math.min(8, Math.max(3, sets.length + 1));
    this.h.step('plates', 'active', pool.length ? `${pool.length} painted so far…` : 'Painting 3D scenes…');
    // Keep painting while the voice records (up to 90 s with the site allowance, 100 s with the free painter), or until there are enough.
    const deadline = performance.now() + (cloudflareOn() ? 90000 : 100000);
    while (pool.length < want && performance.now() < deadline && !this.signal.aborted) {
      await new Promise(r => setTimeout(r, 1000));
      this.h.step('plates', 'active', `${pool.length} painted 3D scene${pool.length === 1 ? '' : 's'}…`);
    }
    this.paint.stop = true;
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (!pool.length) { this.h.step('plates', this.paintOnly ? 'done' : 'warn', this.paintOnly ? 'Real pictures, plus drawn sets' : 'Drawn sets: the image service was busy'); return; }
    // Each set gets its own picture when there is one; otherwise pictures are shared round-robin.
    // Every scene gets its own crop, zoom, mirror and light so neighbours never look the same.
    const bySet = new Map();
    let rr = 0;
    for (const set of sets) {
      const own = pool.find(x => x.set === set);
      bySet.set(set, own || pool[rr++ % pool.length]);
    }
    const tints = [null, 'warm', null, 'cool', null, 'gold'];
    scenes.forEach((sc, i) => {
      if (p.plates.get(sc.id)?.custom) return;
      if (this.paintOnly && !this.paintOnly.has(sc.id)) return;
      const pic = pool.find(x => x.scene === sc.id) || bySet.get(sc.set) || pool[i % pool.length];
      p.plates.set(sc.id, {
        key: this.plateKey(sc), bitmap: pic.bitmap, scene: true, own: true,
        flip: i % 2 === 1, vx: [0, -0.09, 0.08, -0.05, 0.1][i % 5], vz: [1, 1.12, 1.05, 1.2, 1.08][i % 5], tint: tints[i % tints.length],
      });
      this.h.scene?.(i);
    });
    this.h.step('plates', 'done', `${pool.length} painted 3D scene${pool.length === 1 ? '' : 's'}`);
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
      try { await deadline(warmNarrator(this.narrator), 90000, 'Voice download'); }
      catch (e) {
        if (this.signal.aborted) throw e;
        // Like the 3D tab: the site's own narrator (and then the cloud voice) still reads it.
        // Captions-only is left for when those fail too (speak() returns null and says so).
        this.log(`Built-in voice could not load (${e.message}); using the site's narrator voice.`);
        this.narrator.engine = 'pollinations';
      }
    }
    // The whole script in one read when the site's narrator can do it; the loop below then only
    // records lines it could not cut out.
    if (this.narrator.engine !== 'elevenlabs' && this.narrator.engine !== 'none' && todo.length > 1) {
      // One take for the whole script: wait for the fact-check first (a few seconds), so its fixes
    // are in the take instead of being re-recorded line by line afterwards.
    if (this.factJob) {
      this.h.step('voice', 'active', 'Waiting for the fact-check…');
      await Promise.race([this.factJob.catch(() => null), new Promise(r => setTimeout(r, FACT_WAIT[this.s.speed] ?? FACT_WAIT.balanced))]);
      todo.splice(0, todo.length, ...scenes.filter(s => p.voices.get(s.id)?.key !== this.voiceKey(s)));
    }
    this.h.step('voice', 'active', 'Reading the whole script…');
      this.narrator.batch = await speakAllLines(todo.map(s => s.narration), this.s.voice, todo.map(s => characterDelivery(s.delivery, characterOf(this.s.character))));
      if (this.narrator.batch) this.log('Narrator read the whole script in one take.');
    }
    let done = 0;
    await mapLimit(todo, this.narrator.engine === 'kokoro' ? 1 : this.narrator.engine === 'elevenlabs' ? 2 : 3, async (scene) => {
      if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const narration = scene.narration;
      const key = this.voiceKey(scene);
      let data = null;
      try {
        // A narrator character (big upgrade) sets the pace, leans the delivery and gives the line its sound.
        const ch = characterOf(this.s.character);
        data = characterLine(finishLine(await deadline(this.narrator.speak(narration, this.pace.voice * (ch?.speed || 1), characterDelivery(scene.delivery, ch)), 40000, 'Voice line')), ch);
      } catch (e) {
        if (this.signal.aborted) throw e;
        this.log(`Voice line failed (${e.message}). That line stays as captions.`);
      }
      p.voices.set(scene.id, { key, data });
      done++;
      this.h.step('voice', 'active', `${done} / ${todo.length} lines`);
    });
    const silent = this.narrator.engine === 'none';
    this.h.step('voice', silent ? 'warn' : 'done', silent ? 'No voice — captions only' : this.voiceSummary());
  }

  voiceSummary() {
    const e = this.narrator?.engine || this.s.ttsEngine;
    if (e !== 'elevenlabs' && auraUsed()) return serverVoiceName();
    return e === 'kokoro' ? `Kokoro · ${this.s.voice}` : e === 'elevenlabs' ? 'ElevenLabs' : e === 'pollinations' ? 'Cloud voice' : 'Captions only';
  }

  async ensureMix() {
    const p = this.p;
    this.h.step('sound', 'active');
    const scenes = p.script.scenes;
    p.timeline = buildTimeline(scenes, scenes.map(s => p.voices.get(s.id)?.data || null), { wps: this.pace.wps, endPad: this.demo ? 0.9 : 0.7 });
    const mood = p.options.mood || 'curious';
    // Test switches: ?stem=voice|music renders only that part (same master gain as the full mix),
    // ?musicseed= fixes the score so two renders share it.
    const q = new URLSearchParams(location.search), stem = /^(voice|music)$/.test(q.get('stem') || '') ? q.get('stem') : null;
    if (q.get('musicseed') || stem) p.musicSeed = Number(q.get('musicseed')) || 1234567;
    p.stem = stem;
    p.musicSeed ||= Math.floor(Math.random() * 1e9);
    // The town look gets the film sound (a sectioned score and effects on the shots it cuts to).
    const specs = this.town ? townShots(p.timeline, p.script).specs : null;
    const sections = specs ? scoreSections(specs, p.timeline.total) : null;
    const musicKey = `${mood}|${p.musicSeed}|${Math.ceil(p.timeline.total)}|${p.userMusic ? p.userMusic.duration : ''}|${sections ? JSON.stringify(sections.map(x => [x.kind, x.start.toFixed(1)])) : ''}`;
    if (p.musicKey !== musicKey) {
      p.music = p.userMusic || (mood === 'none' ? null
        : sections ? await filmScore(p.timeline.total, { mood: MOODS[mood], sections, seed: p.musicSeed })
          : await synthMusic(mood, p.timeline.total, (p.musicSeed ||= Math.floor(Math.random() * 1e9))));
      p.musicKey = musicKey;
    }
    const cues = specs ? [...hookCues(), ...cueSheet(specs, p.timeline.total)].sort((a, b) => a.t - b.t) : null;
    p.audio = await mixSoundtrack(p.timeline, { music: p.music, musicVolume: Number(this.s.musicVolume), stem: p.stem, cues });
    this.h.step('sound', 'done', `${p.timeline.total.toFixed(1)}s · ${mood === 'none' ? 'no music' : p.userMusic ? 'your music' : mood + (sections ? ' film score' : ' score')}${cues ? ` · ${cues.length} sound effects` : ''}`);
  }

  async prepare() {
    await this.ensureScript();
    await Promise.all([this.ensurePlates(), this.ensureVoice()]);
    const check = await this.factJob;
    this.factJob = null;
    if (this.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (check?.changed) {
      // The voice usually waited for the fact-check, so the take already has the fixes.
      const stale = this.p.script.scenes.filter(s => this.p.voices.get(s.id)?.key !== this.voiceKey(s)).length;
      this.log(`Fact-check corrected ${check.changed} line${check.changed > 1 ? 's' : ''}.${stale ? ` Re-recording ${stale} line${stale > 1 ? 's' : ''}.` : ' The narration already has the fixes.'}`);
      if (stale) await this.ensureVoice();
    }
    await this.ensureMix();
  }

  makeRenderer(canvas, size = null) {
    if (this.town) {
      // The live preview renders at half size (fast on any computer); the export at the output size.
      const out = outputSize(this.p.options, this.s), even = (n) => Math.round(n / 2) * 2;
      const { width, height } = size || { width: even(out.width / 2), height: even(out.height / 2) };
      return new TownRenderer(canvas, { timeline: this.p.timeline, script: this.p.script, W: width, H: height, captions: true, preview: !size, punch: this.s.captionStyle === 'punch', glow: this.s.glow !== false });
    }
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

  // The render log's script, voice and sound sections, and each prop's trigger word.
  fillLog(log) {
    const p = this.p, m = log.finish(p.timeline.total);
    const scenes = p.script.scenes;
    for (const sh of m.shots) {
      const line = scenes[sh.scene]?.narration || '';
      sh.props = sh.props.map(pr => ({ kind: pr.kind, triggerWord: propTrigger({ kind: pr.kind.startsWith('icon:') ? 'icon' : pr.kind, emoji: pr.emoji }, line) }));
    }
    m.script = { title: p.script.title, lines: scenes.map(s => s.narration), characters: (p.script.cast || []).map(c => ({ id: c.id, description: [c.name, c.costume, c.hat && c.hat !== 'none' ? `${c.hat} hat` : '', c.hair ? `${c.hair} hair` : '', c.color].filter(Boolean).join(', ') })) };
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
    if (p.factStatus === 'unchecked') this.log('Exporting without a fact-check. This film is marked not fact-checked.');
    if (p.factStatus === 'flagged') this.log('Exporting with a quantity still flagged.');
    this.h.step('render', 'active', 'Starting encoder…');
    const { width, height } = outputSize(p.options, this.s);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const renderer = this.makeRenderer(canvas, { width, height });
    if (renderer.ready) { this.h.step('render', 'active', 'Building the 3D cartoon town…'); await renderer.ready; }
    renderer.log = new RenderLog({ tab: 'cartoons', style: this.town ? 'town3d' : this.s.bgLook || 'cartoon' });
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
      if (renderer.describe) this.log(`Shots: ${renderer.describe().join(' | ')}`);
      if (p.video?.url) URL.revokeObjectURL(p.video.url);
      p.video = { ...out, url: URL.createObjectURL(out.blob), width, height };
      p.manifest = this.fillLog(renderer.log);
      publishLog(p.manifest, slugName(p.script.title));
      return p.video;
    } catch (e) {
      // A town render that breaks (the graphics card gave up) moves this computer to painted sets.
      if (this.town && e?.name !== 'AbortError') {
        markTownWeak();
        throw new Error(`The 3D cartoon town was too heavy for this computer's graphics (${e?.message || e}). Switch Look to painted sets and export again.`);
      }
      throw e;
    } finally {
      renderer.dispose();
    }
  }
}

function deadline(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
