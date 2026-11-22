// L5: the Cartoons tab's 3D cartoon town look: script scenes become templated shots of the
// cartoon-3d engine (places of the town, light, cast, shot kinds), captions off unless asked for.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { townScenes, townShots } from '../../../cartoon/js/town.js';

const w = (n) => Array.from({ length: n }, (_, k) => ({ text: 'w', start: 0.1 + k * 0.35, end: 0.4 + k * 0.35 }));
const script = { cast: [{ id: 'maya', name: 'Maya' }, { id: 'leo', name: 'Leo' }] };
const scenes = [
  { start: 0, dur: 3, set: 'city', narration: 'One day the bridge started to sway.', say: 'maya', who: [{ id: 'maya', pose: 'idle', feel: 'neutral' }], words: w(7) },
  { start: 3, dur: 3, set: 'bridge', narration: 'Maya told Leo to run.', say: 'maya', who: [{ id: 'maya', pose: 'point' }, { id: 'leo', pose: 'shock' }], words: w(5) },
  { start: 6, dur: 2.5, set: 'night', narration: 'It fell!', say: 'leo', who: [{ id: 'leo', pose: 'shock', feel: 'shocked' }], words: w(2) },
  { start: 8.5, dur: 3, set: 'field', narration: 'Everyone cheered.', who: [{ id: 'maya', pose: 'cheer' }, { id: 'leo', pose: 'cheer' }, { id: 'maya', pose: 'cheer' }], words: w(2) },
];
const timeline = { scenes, total: 11.5 };

export const tests = [
  { name: 'scenes get a frame: aerial first, two people a two-shot, an exclamation a reaction, three a group', fn: () => {
    assert.deepEqual(townScenes(scenes).map(s => s.frame), ['wide', 'two', 'react', 'group']);
  } },
  { name: 'the first shot is the aerial over the town; sets map to the bridge, the bank and the park', fn: () => {
    const { shots } = townShots(timeline, script);
    assert.equal(shots[0].place, 'town'); assert.equal(shots[0].kind, 'wide');
    assert.ok(shots.every(s => ['town', 'bridge', 'bank', 'park'].includes(s.place)));
    assert.equal(shots.find(s => s.start >= 8.5).place, 'park');
  } },
  { name: 'night sets are golden light, the rest daylight', fn: () => {
    const { shots } = townShots(timeline, script);
    assert.deepEqual(shots.map(s => s.light), ['day', 'day', 'golden', 'day']);
  } },
  { name: 'the cast keeps one look per character and words are on the video timeline', fn: () => {
    const { shots } = townShots(timeline, script);
    const two = shots.find(s => s.kind === 'two');
    assert.deepEqual(two.cast, [0, 1]);
    assert.ok(two.words[0].start >= 3, JSON.stringify(two.words[0]));
  } },
  { name: 'the shots cover the whole video, in order', fn: () => {
    const { shots } = townShots(timeline, script);
    for (let i = 1; i < shots.length; i++) assert.ok(Math.abs(shots[i].start - shots[i - 1].end) < 1e-9);
    assert.ok(shots[shots.length - 1].end >= timeline.total);
  } },
  { name: 'the Cartoons composer offers the town look first, with captions off unless ticked', fn: () => {
    const html = readFileSync(new URL('../../../cartoon/index.html', import.meta.url), 'utf8');
    assert.match(html, /<select id="look"><option value="town3d" selected>/);
    assert.match(html, /<input type="checkbox" id="townCaptions">/);
    const pipe = readFileSync(new URL('../../../cartoon/js/pipeline.js', import.meta.url), 'utf8');
    assert.match(pipe, /captions: !!this\.p\.options\.townCaptions/);
  } },
  { name: 'old projects without a look keep the painted sets', fn: () => {
    const pipe = readFileSync(new URL('../../../cartoon/js/pipeline.js', import.meta.url), 'utf8');
    assert.match(pipe, /\(this\.p\.options\.look \|\| 'painted'\) === 'town3d'/);
  } },
];
