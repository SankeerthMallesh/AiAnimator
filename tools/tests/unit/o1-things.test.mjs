// O1: 3D objects in the drawn looks: the writer picks a thing and what happens to it, the shot plan
// carries both (and cuts a long scene to the thing up close), and each action is heard.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THINGS, THING_ACTIONS, SHOT_KINDS, POSE_NAMES } from '../../../explainer/js/z3d/vocab.js';
import { planShots } from '../../../explainer/js/z3d/plan.js';
import { writerPrompt, normalizeScript } from '../../../explainer/js/llm.js';
import { cueSheet } from '../../../shared/filmsound.js';

const sc = (start, dur, o) => ({ start, dur, words: [], narration: 'x', ...o });

export const tests = [
  { name: 'there is an object shot, a show pose and every thing has a builder in things.js', fn: () => {
    assert.ok(SHOT_KINDS.includes('object')); assert.ok(POSE_NAMES.includes('show'));
    const src = readFileSync(new URL('../../../explainer/js/z3d/things.js', import.meta.url), 'utf8');
    for (const t of THINGS) assert.match(src, new RegExp(`\\n  ${t}\\(\\) \\{`), t);
  } },
  { name: 'the writer is asked for a thing and what it does, and the normalizer keeps known words only', fn: () => {
    const p = writerPrompt('roman concrete', { style: 'drawn-3d', duration: 30, pace: 'normal', format: '9:16' });
    for (const w of ['"thing"', '"do"', JSON.stringify(THINGS), JSON.stringify(THING_ACTIONS)]) assert.ok(p.includes(w), w);
    const s = normalizeScript({ scenes: [{ narration: 'a', thing: 'Brick', do: 'BREAK' }, { narration: 'b', thing: 'spaceship', do: 'fly' }] }, { style: 'drawn-3d', topic: 't' });
    assert.deepEqual([s.scenes[0].thing, s.scenes[0].do, s.scenes[1].thing, s.scenes[1].do], ['brick', 'break', '', '']);
  } },
  { name: 'the plan carries the thing; without a "do" it is held in talking shots, shown in object shots, dropped in wides', fn: () => {
    const specs = planShots([sc(0, 3, { frame: 'talk', thing: 'brick' }), sc(3, 3, { frame: 'object', thing: 'gem' }), sc(6, 3, { frame: 'wide', thing: 'wall' }), sc(9, 3, { frame: 'talk' })], new Map());
    assert.deepEqual(specs.map(s => [s.thing, s.do]), [['brick', 'hold'], ['gem', 'show'], ['wall', 'drop'], ['', '']]);
  } },
  { name: 'a long scene with a thing cuts to the thing up close for its second shot', fn: () => {
    const specs = planShots([sc(0, 6, { frame: 'talk', thing: 'brick', do: 'hold' }), sc(6, 6, { frame: 'talk', thing: 'brick', do: 'break' })], new Map());
    assert.deepEqual(specs.map(s => s.kind), ['talk', 'object', 'talk', 'object']);
    assert.deepEqual(specs.map(s => s.do), ['hold', 'show', 'break', 'break']);
  } },
  { name: 'drops land with a thump, breaks crunch and boom, grows and spins are heard', fn: () => {
    const specs = planShots([sc(0, 3, { frame: 'wide', thing: 'wall', do: 'drop' }), sc(3, 3, { frame: 'object', thing: 'brick', do: 'break' }), sc(6, 3, { frame: 'point', thing: 'atom', do: 'grow' })], new Map());
    const cues = cueSheet(specs, 9);
    assert.ok(cues.some(c => c.kind === 'thump' && Math.abs(c.t - 0.55) < 0.01));
    assert.ok(cues.some(c => c.kind === 'crunch' && Math.abs(c.t - 3.6) < 0.01) && cues.some(c => c.kind === 'boom' && c.t > 3.5 && c.t < 3.7));
    assert.ok(cues.some(c => c.kind === 'thump' && Math.abs(c.t - 6.15) < 0.01));
  } },
];
