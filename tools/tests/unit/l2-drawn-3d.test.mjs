// L2: the 3D tab's "drawn in code" look. The writer asks for a place, shot, cast and pose per scene,
// the normalizer keeps only words the shot library knows, and picture styles are left as they were.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { writerPrompt, normalizeScript } from '../../../explainer/js/llm.js';
import { STYLES } from '../../../explainer/js/presets.js';
import { SETS, SHOT_KINDS, POSE_NAMES, EFFECTS3D, effect3d } from '../../../explainer/js/z3d/vocab.js';

const raw = { title: 'Ice', scenes: [
  { narration: 'What if you fell through the ice?', set: 'Snow', frame: 'wide', who: ['Mia'], act: 'surprised', effect: 'snow', camera: 'push-in' },
  { narration: 'Your body gasps in shock.', set: 'volcano', frame: 'closeup', who: 'Mia and Leo', act: 'dance', effect: 'embers' },
  { narration: 'Then the cold slows you down.', effect: 'speed' },
], characters: [{ name: 'Mia', look: 'woman in her 20s, red coat' }] };

export const tests = [
  { name: 'drawn-3d is a drawn look and the first style in the list', fn: () => {
    assert.equal(STYLES['drawn-3d'].drawn, '3d');
    assert.equal(Object.keys(STYLES)[0], 'drawn-3d');
  } },
  { name: 'the 3D tab opens on drawn-3d', fn: () => {
    const app = readFileSync(new URL('../../../explainer/js/app.js', import.meta.url), 'utf8');
    assert.match(app, /return STYLES\[q\] \? q : AUTO_STYLE;/); // Auto picks drawn-3d for people stories (l2b)
  } },
  { name: 'the pose words match the poses people.js can play', fn: () => {
    const src = readFileSync(new URL('../../../explainer/js/z3d/people.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('export const POSES = {'), src.indexOf('};', src.indexOf('export const POSES = {')));
    const keys = [...block.matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
    assert.deepEqual(keys, POSE_NAMES);
  } },
  { name: 'the drawn writer prompt asks for set, frame, who and act with the library words', fn: () => {
    const p = writerPrompt('ice water', { style: 'drawn-3d', duration: 30, pace: 'normal', format: '9:16' });
    for (const w of ['"set"', '"frame"', '"who"', '"act"', JSON.stringify(SETS), JSON.stringify(SHOT_KINDS), JSON.stringify(POSE_NAMES), JSON.stringify(EFFECTS3D)]) assert.ok(p.includes(w), w);
  } },
  { name: 'picture styles do not ask for drawn fields', fn: () => {
    const p = writerPrompt('ice water', { style: 'story-3d', duration: 30, pace: 'normal', format: '9:16' });
    assert.ok(!p.includes('"frame"') && !p.includes('"act"'));
  } },
  { name: 'the normalizer keeps known words, lower-cased, and drops unknown ones', fn: () => {
    const s = normalizeScript(raw, { style: 'drawn-3d', topic: 'ice' });
    assert.deepEqual(s.scenes.map(x => [x.set, x.frame, x.act]), [['snow', 'wide', 'surprised'], ['', '', ''], ['', '', '']]);
    assert.deepEqual(s.scenes[0].who, ['Mia']);
    assert.deepEqual(s.scenes[1].who, ['Mia', 'Leo']);
  } },
  { name: 'picture-only effects map to the nearest drawn one', fn: () => {
    const s = normalizeScript(raw, { style: 'drawn-3d', topic: 'ice' });
    assert.deepEqual(s.scenes.map(x => x.effect), ['snow', 'sparks', 'dust']);
    assert.equal(effect3d('nonsense'), 'none');
  } },
  { name: 'picture styles keep their own scene fields', fn: () => {
    const s = normalizeScript(raw, { style: 'story-3d', topic: 'ice' });
    assert.equal(s.scenes[0].frame, undefined);
    assert.equal(s.scenes[1].effect, 'embers');
  } },
];
