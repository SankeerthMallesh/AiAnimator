// L4: the film sound for the looks drawn in code: effects placed on the shot plan and a score whose
// sections follow the story (intro, build, tension at the cliffhanger, payoff, outro).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cueSheet, scoreSections, CUE_KINDS } from '../../../shared/filmsound.js';
import { planShots } from '../../../explainer/js/z3d/plan.js';

const sc = (start, dur, o) => ({ start, dur, words: [], ...o });
const scenes = [
  sc(0, 3.5, { set: 'snow', frame: 'wide' }),
  sc(3.5, 3, { set: 'snow', frame: 'walk' }),
  sc(6.5, 3, { set: 'snow', frame: 'talk', effect: 'pulse' }),
  sc(9.5, 2.5, { set: 'snow', frame: 'react', act: 'surprised', camera: 'impact' }),
  sc(12, 3, { set: 'studio', frame: 'point', icon: '⏱️' }),
  sc(15, 3, { set: 'beach', frame: 'talk', effect: 'bubbles' }),
  sc(18, 3, { set: 'night', frame: 'wide', effect: 'shockwave' }),
  sc(21, 3.5, { set: 'park', frame: 'group', act: 'cheer' }),
];
const specs = planShots(scenes, new Map());
const total = 25;

export const tests = [
  { name: 'every cut gets a whoosh just before it', fn: () => {
    const cues = cueSheet(specs, total);
    for (const s of specs.slice(1)) assert.ok(cues.some(c => c.kind === 'whoosh' && Math.abs(c.t - (s.start - 0.2)) < 0.01), `cut at ${s.start}`);
  } },
  { name: 'a reaction gets a riser into it, a thump and a breath', fn: () => {
    const cues = cueSheet(specs, total), r = specs.find(s => s.kind === 'react');
    assert.ok(cues.some(c => c.kind === 'riser' && c.t < r.start && c.t + c.dur >= r.start - 0.01));
    assert.ok(cues.some(c => c.kind === 'thump' && c.t === r.start));
    assert.ok(cues.some(c => c.kind === 'breath' && c.t > r.start && c.t < r.start + 0.3));
  } },
  { name: 'walking on snow crunches, the pulse beats, the shockwave booms, water splashes, a group cheers', fn: () => {
    const kinds = new Set(cueSheet(specs, total).map(c => c.kind));
    for (const k of ['crunch', 'heartbeat', 'boom', 'splash', 'bubbles', 'cheer', 'beeps', 'wind', 'scrape', 'engine']) assert.ok(kinds.has(k), k);
  } },
  { name: 'only known cue kinds, in time order, inside the film, never doubled within 0.25 s', fn: () => {
    const cues = cueSheet(specs, total), last = {};
    cues.forEach((c, i) => {
      assert.ok(CUE_KINDS.includes(c.kind), c.kind);
      assert.ok(c.t >= 0 && c.t < total);
      if (i) assert.ok(c.t >= cues[i - 1].t);
      if (c.kind in last) assert.ok(c.t - last[c.kind] >= 0.25, `${c.kind} at ${c.t}`);
      last[c.kind] = c.t;
    });
  } },
  { name: 'the score has intro, build, tension, payoff and outro in order, covering the film', fn: () => {
    const secs = scoreSections(specs, total);
    assert.deepEqual(secs.map(s => s.kind), ['intro', 'build', 'tension', 'payoff', 'outro']);
    assert.equal(secs[0].start, 0); assert.equal(secs[secs.length - 1].end, total);
    for (let i = 1; i < secs.length; i++) assert.equal(secs[i].start, secs[i - 1].end);
  } },
  { name: 'the tension starts on the cliffhanger reaction', fn: () => {
    const secs = scoreSections(specs, total), r = specs.find(s => s.kind === 'react');
    assert.equal(secs.find(s => s.kind === 'tension').start, r.start);
  } },
  { name: 'a short film still gets a sane score', fn: () => {
    const secs = scoreSections(planShots([sc(0, 3, {}), sc(3, 3, {}), sc(6, 3, {})], new Map()), 9);
    assert.ok(secs.length >= 3);
    for (const s of secs) assert.ok(s.end > s.start);
  } },
  { name: 'the 3D and Blocky tabs use the film sound for drawn looks', fn: () => {
    const p = readFileSync(new URL('../../../explainer/js/pipeline.js', import.meta.url), 'utf8');
    assert.match(p, /filmScore\(/); assert.match(p, /cueSheet\(specs/);
  } },
];
