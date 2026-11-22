// H1: the hook stack in the first seconds: a cold open on the most dramatic scene, an on-screen headline
// (the writer's hookText), and a riser into a hit on the cut; the writer is asked for all of it.
import assert from 'node:assert/strict';
import { teaserIndex, withTeaser, headlineText, hookCues, TEASE } from '../../../shared/hooks.js';
import { planShots } from '../../../explainer/js/z3d/plan.js';
import { writerPrompt, normalizeScript } from '../../../explainer/js/llm.js';
import { cueSheet, CUE_KINDS } from '../../../shared/filmsound.js';

const sc = (start, o = {}) => ({ start, dur: 3, words: [], narration: 'A line.', ...o });
const scenes = [sc(0, { frame: 'wide' }), sc(3, { frame: 'talk' }), sc(6, { frame: 'talk' }), sc(9, { frame: 'react', camera: 'impact', narration: 'It cracked!' }), sc(12, { frame: 'talk' }), sc(15, { frame: 'group' })];

export const tests = [
  { name: 'the teaser is the writer\'s pick when it is a real later scene', fn: () => { assert.equal(teaserIndex(scenes, 4), 4); } },
  { name: 'otherwise the most dramatic scene from the third on (never a talking head)', fn: () => { assert.equal(teaserIndex(scenes, null), 3); assert.equal(teaserIndex(scenes, 0), 3); assert.equal(teaserIndex(scenes, 99), 3); } },
  { name: 'a reaction early in the video beats a talking head late in it', fn: () => {
    const s2 = [sc(0), sc(3), sc(6, { frame: 'react', act: 'surprised' }), sc(9, { frame: 'talk' }), sc(12, { frame: 'talk' }), sc(15, { frame: 'talk' })];
    assert.equal(teaserIndex(s2, null), 2);
  } },
  { name: 'a video of fewer than 3 scenes has no cold open', fn: () => { assert.equal(teaserIndex(scenes.slice(0, 2), 1), -1); } },
  { name: 'the cold open plays the teaser first, then the story starts at TEASE, nothing lost', fn: () => {
    const specs = planShots(scenes, new Map()), t = withTeaser(specs, 3);
    assert.equal(t.length, specs.length + 1);
    assert.ok(t[0].teaser); assert.equal(t[0].scene, 3); assert.equal(t[0].start, 0); assert.equal(t[0].end, TEASE);
    assert.equal(t[1].scene, 0); assert.equal(t[1].start, TEASE); assert.equal(t[1].end, specs[0].end);
    assert.deepEqual(t.slice(2), specs.slice(1));
  } },
  { name: 'no cold open when the first shot is too short to cut into', fn: () => {
    const specs = planShots([sc(0, { dur: 1.1 }), ...scenes.slice(1)], new Map());
    assert.equal(withTeaser(specs, 3), specs);
  } },
  { name: 'the headline is the hookText in capitals, at most 6 words, else the title', fn: () => {
    assert.equal(headlineText({ hookText: 'this wall is 2,000 years old and still standing strong', title: 'x' }), 'THIS WALL IS 2,000 YEARS OLD');
    assert.equal(headlineText({ title: 'Roman Concrete 🏛️' }), 'ROMAN CONCRETE');
  } },
  { name: 'the hook sounds: a hit, a riser that ends on the cut, a boom on it; known cue kinds', fn: () => {
    const c = hookCues();
    for (const x of c) assert.ok(CUE_KINDS.includes(x.kind), x.kind);
    const riser = c.find(x => x.kind === 'riser'), boom = c.find(x => x.kind === 'boom');
    assert.ok(Math.abs(riser.t + riser.dur - TEASE) < 0.1); assert.ok(Math.abs(boom.t - TEASE) < 0.05);
    assert.ok(cueSheet(withTeaser(planShots(scenes, new Map()), 3), 18).some(x => x.kind === 'whoosh' && Math.abs(x.t - (TEASE - 0.2)) < 0.01));
  } },
  { name: 'the writer is asked for the hook stack and keeps hookText and teaser', fn: () => {
    const p = writerPrompt('roman concrete', { style: 'story-3d', duration: 30, pace: 'normal', format: '9:16' });
    for (const w of ['HOOK STACK', '"hookText"', '"teaser"']) assert.ok(p.includes(w), w);
    const s = normalizeScript({ hookText: 'This wall is 2,000 years old', teaser: 2, scenes: [{ narration: 'a' }, { narration: 'b' }, { narration: 'c' }] }, { style: 'story-3d', topic: 't' });
    assert.equal(s.hookText, 'This wall is 2,000 years old'); assert.equal(s.teaser, 2);
    assert.equal(normalizeScript({ teaser: 7, scenes: [{ narration: 'a' }, { narration: 'b' }] }, { style: 'story-3d', topic: 't' }).teaser, null);
  } },
];
