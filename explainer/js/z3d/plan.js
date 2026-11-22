// The shot plan for the looks drawn in code, without three.js: who plays whom (castFor), who is in a
// shot (whoFor) and the cut list (planShots). auto3d.js and autoblocky.js build the shots from it;
// the film sound (shared/filmsound.js) places its cues on it.
import { SETS, SHOT_KINDS, POSE_NAMES, CAMERA_MOVES, effect3d } from './vocab.js';

// ---------- the cast for a script ----------
const FEMALE = /\b(woman|women|girl|she|her|mother|mom|wife|queen|lady|female|sister|daughter|grandma|aunt)\b/i;
export function castFor(characters = []) {
  const f = ['carla', 'sophia', 'claudia'], m = ['nathan', 'eric', 'manuel'];
  const out = new Map();
  for (const c of characters.slice(0, 3)) {
    const female = FEMALE.test(`${c.look || ''} ${c.name || ''}`);
    const pool = female ? f : m;
    const id = pool.find(x => ![...out.values()].includes(x)) || pool[0];
    out.set(String(c.name || '').toLowerCase(), id);
  }
  return out;
}
// The people a scene names (by character name), else the hero, else a presenter.
export function whoFor(spec, castMap) {
  const names = (spec.who || []).map(n => castMap.get(String(n).toLowerCase())).filter(x => x != null); // ids can be 0 (blocky looks)
  const all = [...castMap.values()];
  const want = spec.kind === 'two' ? 2 : spec.kind === 'group' ? 3 : 1;
  const out = [...new Set(names)];
  for (const id of [...all, 'nathan', 'carla', 'eric']) { if (out.length >= want) break; if (!out.includes(id)) out.push(id); }
  return out.slice(0, want);
}
// ---------- the shot plan ----------
// scenes: timeline scenes ({ start, dur, words, set, shot, who, pose, camera, effect, icon, narration }).
// A long line is cut into two shots (the writer's shot, then a reaction or a wide), so the edit keeps
// the 2.5-4.5 s rhythm of the reference shorts.
const COMPLEMENT = { talk: 'react', two: 'react', react: 'wide', wide: 'talk', walk: 'react', point: 'react', group: 'react' };
export function planShots(scenes, castMap) {
  const out = [];
  let lastSet = 'studio';
  scenes.forEach((sc, i) => {
    const set = SETS.includes(sc.set) ? sc.set : lastSet; lastSet = set;
    const frame = SHOT_KINDS.includes(sc.frame) ? sc.frame : SHOT_KINDS.includes(sc.shot) ? sc.shot : null;
    const kind = frame || (i === 0 ? 'wide' : ['talk', 'react', 'two', 'point', 'wide'][i % 5]);
    const act = POSE_NAMES.includes(sc.act) ? sc.act : POSE_NAMES.includes(sc.pose) ? sc.pose : 'talk';
    const base = {
      set, seed: (i + 1) * 31, effect: effect3d(sc.effect), icon: sc.icon || '',
      pose: act, camera: CAMERA_MOVES.includes(sc.camera) ? sc.camera : ['push-in', 'orbit', 'pull-out', 'pan-left', 'tilt-up'][i % 5],
      who: Array.isArray(sc.who) ? sc.who : [], words: sc.words || [], scene: i,
    };
    const a = sc.start, b = sc.start + sc.dur;
    const parts = sc.dur > 4.8 ? [[a, a + sc.dur * 0.55], [a + sc.dur * 0.55, b]] : [[a, b]];
    parts.forEach(([s, e], k) => {
      const spec = { ...base, start: s, end: e, kind: k ? COMPLEMENT[kind] : kind, camera: k ? (base.camera === 'push-in' ? 'pull-out' : 'push-in') : base.camera, offset: s - sc.start };
      if (k && spec.kind === 'react') spec.pose = { talk: 'think', point: 'surprised', stand: 'shrug' }[base.pose] || base.pose;
      spec.cast = whoFor(spec, castMap);
      out.push(spec);
    });
  });
  return out;
}

