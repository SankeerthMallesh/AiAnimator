// L5: the Cartoons tab's "3D cartoon town, drawn in code" look: the cartoon-3d-short engine (cartoon/js/c3d,
// source tools/c3d-src) playing the script's scenes as templated shots in its riverside town (the bridge
// deck, the riverbank, the park, an aerial over the river), cut on Loomy's shot plan. 2.0: lines about a place
// (a prison, a bank vault, mission control...) are played in that place's 2.5D map (maps.js), the lead doing the
// line's action, while the narrator stays off screen. Same face as Stage for
// the encoder: canvas, W, H, drawFrame(t), dispose(), plus a ready promise. Captions are off unless asked for.
import { planShots } from '../../explainer/js/z3d/plan.js';
import { Stage } from './stage.js';
import { glare } from '../../shared/glare.js';
import { teaserIndex, withTeaser, headlineText, drawHeadline, drawCutFlash, drawChapterCard, chapterAt } from '../../shared/hooks.js';
import { mapFor, actFor, outfitLook, mapSeed } from './maps.js';

// The script's set -> a place of the town, and the evening sets -> golden light.
const PLACE = {
  field: 'park', forest: 'park', mountains: 'park', snow: 'park', school: 'park', temple: 'park',
  city: 'bank', road: 'bank', rails: 'bank', desert: 'bank', shop: 'bank', wall: 'bank', office: 'bank', room: 'bank',
  bridge: 'bridge', water: 'bridge', sea: 'bridge', deck: 'bridge', underwater: 'bridge', lab: 'bridge', sky: 'town', space: 'town', night: 'bridge',
};
const GOLDEN = new Set(['night', 'space', 'sky']);
// Viking-era stories: the town dresses its people as Vikings and puts longships on the river; their shots
// stay by the river (the bank faces the moored ships) and the park, away from the iron bridge.
export const VIKING = /\b(vikings?|norse|norsemen|longships?|danes|lindisfarne|ragnar|danelaw)\b/i;
const VIKING_PLACE = (set) => (['field', 'forest', 'mountains', 'snow', 'school', 'temple'].includes(set) ? 'park' : 'bank');
// The script's poses and feelings -> the shot library's pose words (z3d/vocab.js).
const POSE = { idle: 'stand', walk: 'stand', turn: 'stand', sit: 'stand', drive: 'stand', hold: 'talk', give: 'talk', point: 'point', shrug: 'shrug', jump: 'cheer', shock: 'surprised', facepalm: 'flinch', laugh: 'cheer', cry: 'flinch', cheer: 'cheer', think: 'think', wave: 'talk', enter: 'stand', exit: 'stand' };
const FEEL = { shocked: 'surprised', happy: 'cheer', skeptical: 'think', sad: 'flinch', angry: 'shrug', scared: 'flinch', nervous: 'think' };

// 1.4: the script's characters as the town draws them: their own colour, headwear and hair (crews and
// officers in caps, a scientist in a white coat), instead of the town's 1800s folk.
const HAIR = { brown: '#7a4a28', black: '#2a2422', blonde: '#d8a845', red: '#b8522c' };
export function townLooks(cast = []) {
  return cast.map((c) => {
    if (!c) return null;
    // 2.0: outfits (prison, guard, astronaut...), the right hats and accessories (headsets, cigars, shades...)
    if (c.outfit || c.acc || ['beanie', 'hardhat', 'chef', 'crown', 'helmet', 'headset'].includes(c.hat)) return outfitLook(c);
    const hair = HAIR[c.hair] || HAIR.brown;
    const jacket = c.costume === 'labcoat' ? '#f2f4f7' : c.costume === 'suit' ? '#2c3e6b' : c.color || '#3f6fb5';
    const capped = ['cap', 'officer', 'conductor', 'hardhat', 'beanie', 'flatcap', 'helmet'].includes(c.hat);
    const cap = c.hat === 'officer' ? '#2e3f73' : c.hat === 'hardhat' ? '#f2c230' : c.color || '#e2453c';
    return { jacket, hat: c.hat === 'tophat' ? 'tophat' : capped ? 'cap' : 'hair', cap, hair, buttons: '#f4f1ea', dress: '' };
  });
}

// Timeline scenes -> the shot plan's words: the frame comes from how many people are in the scene and
// what the line does (a question or an exclamation is a reaction); the first scene is an aerial.
export function townScenes(scenes) {
  const frames = [];
  return scenes.map((sc, i) => {
    const who = Array.isArray(sc.who) ? sc.who : [];
    const lead = who.find(w => w.id === sc.say) || who[0] || {};
    const act = FEEL[lead.feel] || POSE[lead.pose] || 'talk';
    const line = String(sc.narration || '');
    let frame = i === 0 ? 'wide' : who.length >= 3 ? 'group' : who.length === 2 ? (i % 3 === 2 ? 'react' : 'two')
      : /!$/.test(line.trim()) || act === 'surprised' ? 'react' : act === 'point' ? 'point' : ['talk', 'walk', 'talk', 'react'][i % 4];
    // A reaction close-up lands harder when it is rare: at most one in any three shots.
    if (frame === 'react' && frames.slice(-2).includes('react')) frame = who.length === 2 ? 'two' : ['talk', 'walk'][i % 2];
    frames.push(frame);
    return { ...sc, set: sc.set, frame, act: frame === 'react' || act !== 'surprised' ? act : 'talk', who: who.map(w => w.id) };
  });
}

// The plan's specs -> the engine's template shots (tools/c3d-src/src/tmpl.ts TSpec).
export function townShots(timeline, script, theme = 'town') {
  const ids = (script?.cast || []).map(c => String(c.id).toLowerCase());
  const castMap = new Map(ids.map((id, k) => [id, k]));
  const scenes = townScenes(timeline.scenes);
  const specs = withTeaser(planShots(scenes, castMap), teaserIndex(scenes, script?.teaser));
  const topic = `${script?.title || ''} ${script?.topic || ''}`, seed = mapSeed(script || {});
  const shots = specs.map((s, k) => {
    const sc = timeline.scenes[s.scene];
    const set = sc?.set || 'city';
    // 2.0: the line's own 2.5D map (a prison cell, a bank vault...); the town only when the story is in the street
    const map = theme === 'viking' ? '' : mapFor(sc || {}, topic);
    const place = map || (s.scene === 0 && !s.teaser && (k === 0 || specs[k - 1]?.teaser) ? 'town' : theme === 'viking' ? VIKING_PLACE(set) : PLACE[set] || 'bridge');
    // the line's action is always shown: a walking shot of a line with an action becomes a shot of the action
    const lineAct = map ? actFor(sc || {}) : '';
    const kind = lineAct && s.kind === 'walk' ? 'talk' : s.kind;
    const act = ['talk', 'wide', 'two', 'point'].includes(kind) ? lineAct : '';
    // background people: the cast members not in this shot (up to two), only inside a map
    const inShot = new Set(s.cast.filter(c => typeof c === 'number'));
    const extras = map ? ids.map((_, i) => i).filter(i => !inShot.has(i)).slice(0, 2) : [];
    return {
      mapSeed: seed, act, extras,
      start: s.start, end: s.end, kind, place: place === 'town' && kind !== 'wide' ? 'bridge' : place,
      cast: s.cast.map(c => (typeof c === 'number' ? c : ids.length + (k % 3))), pose: s.pose, camera: s.camera,
      light: GOLDEN.has(set) ? 'golden' : 'day', seed: s.seed, words: (s.words || []).map(w => ({ start: (sc?.start || 0) + w.start, end: (sc?.start || 0) + w.end })),
      effect: s.effect, icon: s.icon, teaser: !!s.teaser,
    };
  });
  if (shots.length) shots[shots.length - 1].end = Math.max(shots[shots.length - 1].end, timeline.total + 0.5);
  return { specs, shots };
}

export class TownRenderer {
  constructor(canvas, { timeline, script, W, H, captions = false, preview = false, punch = false, glow = true }) {
    this.canvas = canvas; this.W = W; this.H = H;
    canvas.width = W; canvas.height = H;
    this.g = canvas.getContext('2d', { alpha: false });
    this.timeline = timeline; this.captions = captions; this.log = null; this.punch = punch; this.glow = glow;
    this.headline = headlineText(script);
    this.preview = preview; this.lastMs = 0; this.lastAt = -1e9;
    this.theme = VIKING.test(`${script?.title || ''} ${script?.topic || ''} ${(timeline.scenes || []).map(x => x.narration || '').join(' ')}`) ? 'viking' : 'town';
    const { specs, shots } = townShots(timeline, script, this.theme);
    this.specs = specs; this.shots = shots;
    this.ready = (async () => {
      const { createTemplated, setStaticBase } = await import('./c3d/cartoon3d.js');
      setStaticBase(new URL('../c3d-assets/', import.meta.url).href);
      const engine = await createTemplated({ width: W, height: H, shots, theme: this.theme, looks: this.theme === 'viking' ? [] : townLooks(script?.cast || []) });
      if (this.disposed) engine.dispose(); else this.engine = engine; // disposed while it was building
    })();
  }

  describe() { return this.shots.map(s => `${s.start.toFixed(1)}-${s.end.toFixed(1)} ${s.kind} ${s.place} ${s.light} ${s.cast.join('+')} ${s.pose} ${s.camera}`); }

  // The export waits a moment after each frame, so the graphics card finishes it before the next one is
  // queued (a long unbroken queue can make a weaker card's driver reset).
  async prepareFrame() { await new Promise(r => setTimeout(r, Math.min(40, 4 + this.lastMs * 0.25))); }

  drawFrame(t) {
    if (!this.engine) return;
    // Playing the preview: a slow computer skips frames instead of freezing the page.
    const now = performance.now();
    if (this.preview && now - this.lastAt < this.lastMs * 2.5) return;
    const t0 = performance.now();
    this.g.drawImage(this.engine.renderAt(t), 0, 0, this.W, this.H);
    this.lastMs = performance.now() - t0; this.lastAt = performance.now();
    // 1.4: the 1.3 glow over the town too (bloom, sparkles, dust); the engine grades its own colour.
    if (this.glow) glare(this.g, this.W, this.H, t, { grade: false, seed: 7 });
    if (this.captions) {
      const scenes = this.timeline.scenes;
      const scene = scenes.find(s => t >= s.start && t < s.start + s.dur) || scenes[scenes.length - 1];
      if (scene) Stage.caption(this.g, this.W, this.H, scene, Math.max(0, t - scene.start), { punch: this.punch });
    }
    if (this.shots[0]?.teaser) drawCutFlash(this.g, this.W, this.H, t);
    drawHeadline(this.g, this.W, this.H, t, this.headline, { top: 0.13 });
    const ch = chapterAt(this.timeline.scenes, t);
    if (ch && ch.n > 1) drawChapterCard(this.g, this.W, this.H, ch.local, ch.n, ch.title);
  }

  dispose() { this.disposed = true; this.engine?.dispose(); this.engine = null; }
}
