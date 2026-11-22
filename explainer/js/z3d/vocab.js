// The words the script writer may use for looks drawn in code (no three.js here, so the writer and
// the unit tests can load it). auto3d.js (realistic people) and autoblocky.js (blocky world) read them.
export const SETS = ['studio', 'snow', 'park', 'street', 'room', 'beach', 'night', 'desert', 'lab'];
export const SHOT_KINDS = ['talk', 'two', 'react', 'wide', 'walk', 'point', 'group', 'object'];
// Must match the keys of POSES in people.js (a unit test checks it).
export const POSE_NAMES = ['stand', 'talk', 'point', 'surprised', 'shrug', 'cheer', 'think', 'show', 'flinch'];
export const CAMERA_MOVES = ['push-in', 'pull-out', 'orbit', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'impact', 'vertigo', 'static'];
export const EFFECTS3D = ['none', 'pulse', 'shockwave', 'sparks', 'snow', 'rain', 'glow', 'bubbles', 'dust'];
// The picture styles' effects that the drawn engines do not have, mapped to the nearest one they do.
export const EFFECT_NEAREST = { embers: 'sparks', smoke: 'dust', speed: 'dust' };
export const effect3d = (e) => (EFFECTS3D.includes(e) ? e : EFFECT_NEAREST[e] || 'none');
// Things the drawn looks build in code (z3d/things.js) and what a scene does with one.
export const THINGS = ['brick', 'wall', 'phone', 'book', 'laptop', 'mug', 'ball', 'globe', 'magnet', 'coins', 'clock', 'hourglass', 'bulb', 'key', 'trophy', 'gift', 'apple', 'bottle', 'scale', 'rocket', 'car', 'gem', 'atom', 'dna', 'ice', 'flame', 'sword', 'shield'];
export const THING_ACTIONS = ['hold', 'show', 'drop', 'grow', 'spin', 'break'];
