// The Blocky tab's films, drawn in code: the same shot library as auto3d.js (place, shot type, who,
// pose, camera move, effect) played by the code-built blocky cast in the blocky world, with the
// props of "The Snow Fort" (fort, flag, pile, shovel, plow). Sharp everywhere (no depth of field),
// bright game light, 3-4 word captions with one key word (the Blocky rule).
// Same exports as auto3d: castFor, planShots, buildShot(spec, ctx), captionsFrom.
import * as THREE from 'three';
import { lerp, easeOut, easeInOut, range, V, cam } from './anim.js';
import { Avatar, LOOKS, makeWorld, roundBox, plainMat } from './blocky.js';
import { fort, flag, pile, shovel, plow } from './blockyprops.js';
import { makeThing, thingAction } from './things.js';
import { frameCam, narrowMove, emojiSprite, makeEffect, speakingAt, rnd } from './auto3d.js';
import { planShots as plan3d } from './plan.js';
export { SETS, SHOT_KINDS, POSE_NAMES, CAMERA_MOVES, EFFECTS3D } from './vocab.js';

// ---------- places: the shot library's sets as blocky worlds ----------
const DAY = { top: 0x3f86d8, mid: 0x7fb6ec, horizon: 0xd4e8f8, floorC: 0xdfeaf5 };
const NIGHT = { top: 0x0c1430, mid: 0x1d2e5e, horizon: 0x4d5f96, floorC: 0x2a3550 };
const WARM = { top: 0x3c86cf, mid: 0x8cbde4, horizon: 0xf2dcb0, floorC: 0xe2bd85 };
export const WORLD_FOR = { studio: 'studio', snow: 'snow', park: 'park', street: 'town', room: 'town', beach: 'park', night: 'town', desert: 'park', lab: 'school' };
export function stageFor(set) {
  const base = { shadowSize: 12, sun: 3.0, sunDir: [-10, 9, 5], sunColor: 0xfff0dc, hemi: 0.8, rimLight: 1.8, rimDir: [7, 5, -6], shadowMap: 3072, fog: [35, 130], sky: DAY };
  if (set === 'night') return { ...base, sun: 0.45, sunColor: 0x9fb4ff, hemi: 0.22, rimLight: 0.9, sky: NIGHT, fog: [20, 90] };
  if (set === 'desert' || set === 'beach') return { ...base, sun: 3.3, sunColor: 0xffe2b8, sky: WARM };
  return base;
}

// ---------- the cast: the script's characters as blocky avatars ----------
const FEMALE = /\b(woman|women|girl|she|her|mother|mom|wife|queen|lady|female|sister|daughter|grandma|aunt)\b/i;
// castFor(characters) -> Map(name -> LOOKS index). The narrator ("I") is the first character.
export function castFor(characters = []) {
  const f = [2, 5, 1], m = [0, 3, 4];
  const out = new Map();
  for (const c of characters.slice(0, 3)) {
    const pool = FEMALE.test(`${c.look || ''} ${c.name || ''}`) ? f : m;
    const id = pool.find(x => ![...out.values()].includes(x)) ?? pool[0];
    out.set(String(c.name || '').toLowerCase(), id);
  }
  return out;
}

// The shot plan is the 3D one (same rhythm and shot kinds); cast ids are LOOKS indexes here.
export function planShots(scenes, castMap) {
  const specs = plan3d(scenes, castMap.size ? castMap : new Map([['me', 2]]));
  // auto3d pads a shot with its own presenters (by name); swap those for blocky looks.
  const used = [...castMap.values()];
  const spare = [2, 3, 5, 0, 1, 4].filter(i => !used.includes(i));
  for (const s of specs) s.cast = s.cast.map((id, k) => (typeof id === 'number' ? id : spare[k % spare.length]));
  return specs;
}

// ---------- poses: the library's pose words in the blocky rig ----------
const POSE = { stand: 'stand', talk: 'talk', point: 'point', surprised: 'surprised', shrug: 'shrug', cheer: 'cheer', think: 'think', show: 'point', flinch: 'scared' };
const poseOf = (name) => POSE[name] || 'stand';

// ---------- props for a scene: snow sets get the fort film's props, others a flag or nothing ----------
function setDressing(scene, set, r) {
  if (set === 'snow') {
    const f = fort({ size: 1.2 }); f.position.set(-4.5, 0, -6); f.rotation.y = 0.35; scene.add(f);
    const fl = flag(['#e5483b', '#2f6fd6', '#3aa357'][Math.floor(r() * 3)]);
    fl.position.set(-4.5 + 1.2, f.userData.wall, -6 + 0.6); scene.add(fl);
    const p = pile(); p.position.set(4.2, 0, -5); p.scale.setScalar(0.8); scene.add(p);
    const sh = shovel(); sh.position.set(3.0, 1.15, -3.6); sh.rotation.z = 0.35; scene.add(sh);
    if (r() < 0.5) { const pl = plow(); pl.position.set(9, 0, -14); pl.rotation.y = -0.6; scene.add(pl); }
    return { wave: fl.wave };
  }
  if (set === 'park' || set === 'street') {
    const fl = flag(['#e5483b', '#f2c33c'][Math.floor(r() * 2)]); fl.position.set(3.4, 0, -4.5); scene.add(fl);
    return { wave: fl.wave };
  }
  if (set === 'room' || set === 'lab') {
    // A plain "inside": a block wall behind the cast so the shot reads as indoors.
    const wall = new THREE.Mesh(roundBox(14, 4, 0.4, 0.06), plainMat(set === 'lab' ? '#eef2f5' : '#f0e2c8'));
    wall.position.set(0, 2, -3.2); wall.receiveShadow = true; scene.add(wall);
    return {};
  }
  return {};
}

// ---------- the shots ----------
// Builds one engine shot from a spec. ctx: the engine's { makeStage, W, H }.
export function buildShot(spec, { makeStage, W, H }) {
  const scene = makeStage(stageFor(spec.set));
  scene.add(makeWorld(WORLD_FOR[spec.set] || 'town', 11 + (spec.seed % 7)));
  if (spec.set === 'night') { scene.environmentIntensity = 0.15; const f = new THREE.PointLight(0xffd59a, 6, 10, 2); f.position.set(1.4, 2.8, 2.2); scene.add(f); }
  const r = rnd(spec.seed);
  const dress = setDressing(scene, spec.set, r);
  const wide = W > H, tall = H > W * 1.2, fov0 = wide ? 32 : 36;
  const c = cam(fov0); c.near = 0.05; c.far = 500;
  const P = spec.cast.map(i => new Avatar(LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length]));
  for (const a of P) scene.add(a.object);
  const dur = spec.end - spec.start;
  const yawJ = (r() - 0.5) * 0.3;
  const fx = makeEffect(spec.effect, scene, spec.seed);
  const thing = spec.thing ? makeThing(spec.thing) : null;
  if (thing) scene.add(thing);
  const holds = thing && (spec.do === 'hold' || spec.do === 'show') && spec.kind !== 'object';
  const icon = !thing && spec.icon && (spec.kind === 'point' || r() < 0.5) ? emojiSprite(spec.icon, 0.6) : null;
  if (icon) scene.add(icon);
  if (spec.kind === 'object') { const st = new THREE.Mesh(roundBox(0.7, 0.9, 0.7, 0.05), plainMat('#8a5a33')); st.position.y = 0.45; st.castShadow = st.receiveShadow = true; scene.add(st); }
  // The blocky hand: the end of the right arm (things are held there, a block's width in front).
  // Blocky arms are stiff, so a held thing sits in front of the chest, a little to the hand's side.
  const handOf = (a) => () => { a.object.updateMatrixWorld(true); return a.object.localToWorld(new THREE.Vector3(-0.12, 0.98, 0.42)); };
  const words = spec.words.map(w => ({ start: w.start - spec.offset, end: w.end - spec.offset }));
  const near = wide ? 0.85 : 1;
  const at = (a, x, z, ry) => { a.object.position.set(x, 0, z); a.object.rotation.set(0, ry, 0); };
  const head = (a) => { a.object.updateMatrixWorld(true); return a.head.getWorldPosition(new THREE.Vector3()); };
  const chest = (a) => head(a).add(V(0, -0.45, 0.1));
  // A pose that starts from standing and settles in, with the face's talk flaps while speaking.
  // Close shots (react, talk): the blocky think pose lifts a fist to the chin, straight across the face
  // at that distance; there the hand rests beside the chin instead.
  const close = spec.kind === 'react' || spec.kind === 'talk';
  const act = (a, name, t, { onset = 0.25, talking = false } = {}) => {
    const now = t < onset ? 'stand' : poseOf(name);
    a.pose(now, t, { talking });
    if (close && now === 'think') a.armR.rotation.set(-1.75, 0, -0.15);
  };

  return { scene, camera: c, update(t) {
    const k = easeInOut(range(t, 0, dur));
    const talk = speakingAt(words, t);
    let target = V(0, 1.2, 0), eff = null;
    const [A, B, C] = P;
    dress.wave?.(t);
    let spot = null, tScale = 1;
    const hand = holds && A ? handOf(A) : null;
    switch (spec.kind) {
      case 'object': {
        const h = thing?.userData.h || 0.2;
        tScale = (h < 0.12 ? 2.4 : h > 0.5 ? 1 : 1.6) * 1.2;
        spot = V(0, 0.9, 0);
        // The speaker stands behind, inside the frame; the lens looks a little down on the thing, so its
        // stand stays a small base at the bottom instead of a wall across the lower half.
        if (A) { at(A, tall ? 0.36 : 0.75, -1.6, -0.35); act(A, spec.pose === 'talk' ? 'think' : spec.pose, t, { onset: 0.3 }); }
        target = V(0, 0.9 + h * tScale * 0.62, 0);
        const big = (thing ? new THREE.Box3().setFromObject(thing).getSize(new THREE.Vector3()) : V(0.2, 0.2, 0.2));
        const span = Math.max(big.x, big.y, big.z, 0.12) * tScale;
        frameCam(c, target, { dist: Math.max(0.8, span * (tall ? 4.4 : 2.6)) * near, height: span * 1.1, yaw: 0.22 + yawJ }, spec.camera === 'impact' ? 'push-in' : spec.camera, k, t, spec.seed, fov0);
        eff = target.clone(); break;
      }
      case 'talk': {
        at(A, 0, 0, 0.18);
        act(A, holds ? 'show' : spec.pose === 'stand' ? 'talk' : spec.pose, t, { onset: 0, talking: talk });
        target = head(A).add(V(0, -0.05, 0));
        frameCam(c, target, { dist: 3.2 * near, height: 0.05, yaw: 0.18 + yawJ }, spec.camera, k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
      case 'two': {
        const gap = tall ? 0.42 : 0.6;
        at(A, -gap, 0, tall ? 0.5 : 0.85); at(B, gap, 0.05, tall ? -0.5 : -0.85);
        act(A, holds ? 'show' : 'talk', t, { onset: 0, talking: talk });
        act(B, spec.pose, t, { onset: dur * 0.4 });
        target = head(A).lerp(head(B), 0.5);
        frameCam(c, target, { dist: (tall ? 4.6 : 3.4) * near, height: 0.1, yaw: tall ? 0.12 : 0.25 }, spec.camera === 'impact' ? 'push-in' : (tall ? narrowMove(spec.camera) : spec.camera), k, t, spec.seed, fov0);
        eff = chest(B); break;
      }
      case 'react': {
        at(A, 0, 0, -0.1);
        act(A, spec.pose === 'talk' ? 'surprised' : spec.pose, t, { onset: 0.2 });
        target = head(A).add(V(0, 0.12, 0));
        frameCam(c, target, { dist: 1.9 * near, height: 0.02, yaw: -0.12 }, spec.camera === 'pull-out' ? 'pull-out' : 'impact', k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
      case 'wide': {
        at(A, -0.5, 0, 0.3); if (B) at(B, 0.8, -0.6, -0.4);
        act(A, spec.pose, t, { onset: 0.4 }); B?.pose('stand', t + 1);
        target = V(0.1, 1.2, -0.6);
        frameCam(c, target, { dist: 9 * near, height: 2.2, yaw: 0.35 }, spec.camera === 'impact' ? 'pull-out' : spec.camera, k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
      case 'walk': {
        // Indoors the back wall stands 3 m back: start in front of it (from 3.5 m the walker was
        // hidden behind it for the first part of the shot, a blank frame).
        const z0 = spec.set === 'room' || spec.set === 'lab' ? -2.5 : -3.5;
        const z = lerp(z0, -0.4, t / Math.max(dur, 0.1));
        at(A, 0, z, 0); A.pose('walk', t);
        target = V(0, 1.55, z);
        frameCam(c, target, { dist: 3.8 * near, height: 0.2, yaw: 0.25 }, 'static', k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
      case 'point': {
        // The blocky point raises the right arm straight ahead: turn them toward the thing.
        at(A, tall ? 0.12 : 0.6, 0, -1.0);
        act(A, 'point', t, { onset: 0.3, talking: talk });
        const pt = tall ? V(-0.5, 1.55, 0.1) : V(-1.0, 1.4, 0.1);
        if (icon) { icon.position.copy(pt); icon.scale.setScalar(0.6 * (0.7 + 0.3 * easeOut(range(t, 0.3, 0.8))) + Math.sin(t * 3) * 0.02); }
        if (thing) { spot = pt.clone().add(V(0, -0.3, 0)); tScale = 2.6; }
        target = tall ? V(-0.12, 1.5, 0) : V(-0.15, 1.4, 0);
        frameCam(c, target, { dist: (tall ? 4.6 : 3.4) * near, height: 0.1, yaw: 0.05 }, spec.camera === 'orbit' ? 'orbit' : 'push-in', k, t, spec.seed, fov0);
        eff = pt; break;
      }
      case 'group': {
        const side = tall ? 0.7 : 1.0, back = tall ? -0.5 : -0.25;
        at(A, 0, 0, 0); if (B) at(B, -side, back, 0.3); if (C) at(C, side, back, -0.3);
        const pz = spec.pose === 'talk' ? 'cheer' : spec.pose;
        act(A, pz, t, { onset: 0.25 }); if (B) act(B, pz, t + 0.15, { onset: 0.4 }); if (C) act(C, pz, t + 0.3, { onset: 0.55 });
        target = V(0, 1.5, -0.2);
        frameCam(c, target, { dist: (tall ? 6.0 : 4.4) * near, height: 0.25, yaw: 0.1 }, tall ? narrowMove(spec.camera) : spec.camera, k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
    }
    if (thing) {
      if (!spot && !hand) {
        const base = A ? A.object.position.clone() : V(0, 0, 0);
        spot = base.add(V(tall ? 0.55 : 0.95, spec.do === 'drop' || spec.do === 'break' ? 0 : 1.1, 0.35));
        tScale = spec.kind === 'wide' ? 3 : 2;
        if (thing.userData.h > 0.5) tScale = Math.min(tScale, 1.3);
      }
      thingAction(thing, spec.do, t, { spot: spot || V(0, 1, 0), hand, camPos: c.position, scale: hand ? 1.6 : tScale });
    }
    // Hide anyone the shot does not use (a two-shot spec may carry a spare).
    P.forEach((a, i) => { a.object.visible = i < ({ talk: 1, react: 1, walk: 1, point: 1, two: 2, wide: 2, group: 3, object: 1 }[spec.kind] || 1); });
    if (icon && spec.kind !== 'point') { icon.position.copy(target).add(V(0.6, 0.6, 0.1)); icon.material.opacity = easeOut(range(t, 0.2, 0.6)); }
    if (fx && eff) fx(t, eff, c.position);
    const night = spec.set === 'night';
    return { bloom: night ? 0.5 : 0.2, ao: icon || spec.effect === 'glow' ? 0 : 0.85, exposure: night ? 0.9 : 1.0, grade: { sat: 1.1, con: 1.05, vig: 0.18 } };
  } };
}

// ---------- captions: 3-4 words, one *key* word (captions.js) ----------
export { captionsBlocky as captionsFrom } from './captions.js';
