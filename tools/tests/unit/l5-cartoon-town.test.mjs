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
  { name: 'reaction close-ups are rare: never two within three shots', fn: () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ start: i * 3, dur: 3, set: 'city', narration: 'Wow!', say: 'maya', who: [{ id: 'maya', pose: 'shock', feel: 'shocked' }], words: w(1) }));
    const f = townScenes(many).map(s => s.frame);
    for (let i = 0; i < f.length; i++) if (f[i] === 'react') assert.ok(!f.slice(Math.max(0, i - 2), i).includes('react'), f.join(','));
    assert.ok(f.filter(x => x === 'react').length >= 2, f.join(','));
  } },
  { name: 'after the cold open (the teaser) comes the aerial over the town; sets map to the bridge, the bank and the park', fn: () => {
    const { shots } = townShots(timeline, script);
    assert.ok(shots[0].teaser); assert.equal(shots[0].end, 0.9);
    assert.equal(shots[1].place, 'town'); assert.equal(shots[1].kind, 'wide');
    assert.ok(shots.every(s => ['town', 'bridge', 'bank', 'park'].includes(s.place)));
    assert.equal(shots.find(s => s.start >= 8.5).place, 'park');
  } },
  { name: 'night sets are golden light, the rest daylight', fn: () => {
    const { shots } = townShots(timeline, script);
    assert.deepEqual(shots.map(s => s.light), ['golden', 'day', 'day', 'golden', 'day']); // the teaser is the night scene
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
  { name: 'the Cartoons composer opens on Auto (1.2: the town only where it fits and the graphics are strong); captions always on (1.6)', fn: () => {
    const html = readFileSync(new URL('../../../cartoon/index.html', import.meta.url), 'utf8');
    // Auto is the default; it never gives the town to a weak computer (see v12-auto-look).
    assert.match(html, /<option value="auto" selected>/);
    assert.match(html, /<option value="town3d">[^<]*needs a strong graphics card/);
    const app = readFileSync(new URL('../../../cartoon/js/app.js', import.meta.url), 'utf8');
    assert.match(app, /\['town3d', 'painted', 'auto'\]\.includes\(settings\.look\) \? settings\.look : 'auto'/);
    assert.match(app, /autoLook\(topic, strongGraphics\(\)\)/);
    const gpu = readFileSync(new URL('../../../cartoon/js/gpu.js', import.meta.url), 'utf8');
    for (const w of ['failIfMajorPerformanceCaveat', 'swiftshader', 'llvmpipe', 'MAX_TEXTURE_SIZE', 'deviceMemory', 'loomy.townWeak']) assert.ok(gpu.includes(w), w);
    assert.doesNotMatch(html, /id="townCaptions"/); // 1.6: no way to turn captions off
    const pipe = readFileSync(new URL('../../../cartoon/js/pipeline.js', import.meta.url), 'utf8');
    assert.match(pipe, /TownRenderer\(canvas, \{[^}]*captions: true,/);
    assert.match(pipe, /if \(this\.town && e\?\.name !== 'AbortError'\) \{\s*markTownWeak\(\);/, 'a failed town render moves the computer to painted sets');
  } },
  { name: 'old projects without a look keep the painted sets', fn: () => {
    const pipe = readFileSync(new URL('../../../cartoon/js/pipeline.js', import.meta.url), 'utf8');
    assert.match(pipe, /\(this\.p\.options\.look \|\| 'painted'\) === 'town3d'/);
  } },
];
