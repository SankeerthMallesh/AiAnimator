// 1.6: places that match the topic, icons on by default, captions always on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from '../../../cartoon/js/script.js';
import { SetKit } from '../../../cartoon/js/props.js';

const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
export const tests = [
  { name: 'war shows a battlefield; castles, hospitals, museums, stadiums, kitchens, jungles and volcanoes get their own place', fn: () => {
    const cases = [['The war began in August.', 'battlefield'], ['Soldiers marched for days.', 'battlefield'], ['The king locked the castle gates.', 'castle'],
      ['The knight raised his sword.', 'castle'], ['Doctors could not explain it.', 'hospital'], ['The painting hangs in a museum.', 'museum'],
      ['Fans packed the stadium.', 'stadium'], ['The chef cooked it slowly.', 'kitchen'], ['Monkeys swung through the rainforest.', 'jungle'],
      ['Then the volcano erupted.', 'volcano'], ['The ship sailed across the sea.', 'sea']];
    for (const [line, set] of cases) assert.equal(Script.guessSet(line), set, line);
  } },
  { name: 'the writer can pick every new place, and each one has a palette', fn: () => {
    for (const id of ['battlefield', 'castle', 'hospital', 'museum', 'stadium', 'kitchen', 'jungle', 'volcano']) {
      assert.ok(SetKit.IDS.includes(id), id);
      const p = SetKit.palette(id); assert.equal(p.set, id); assert.ok(p.sky && p.floor, id);
    }
    assert.match(read('cartoon/js/worlds.js'), /P\.battlefield = /);
  } },
  { name: 'topic icons are on by default, and settings move everyone to them once', fn: () => {
    const st = read('cartoon/js/storage.js');
    assert.match(st, /stickers: true,/);
    assert.match(st, /settingsVersion: 11,/);
    assert.match(st, /'voiceSpeed', 'stickers'\]/);
  } },
  { name: 'captions are always on: no Off choice, no town or clip switch, and an old "off" is moved back on', fn: () => {
    for (const p of ['cartoon/index.html', 'explainer/index.html']) assert.doesNotMatch(read(p), /<option value="off">Off<\/option><\/select>/, p);
    for (const p of ['cartoon/js/storage.js', 'explainer/js/storage.js']) assert.match(read(p), /merged\.captionStyle === 'off'\) merged\.captionStyle = DEFAULT_SETTINGS\.captionStyle/, p);
    assert.match(read('clip/index.html'), /id="optCaptions" checked disabled/);
    assert.match(read('explainer/js/pipeline.js'), /new DrawnRenderer\(canvas, \{.*captions: true \}\)/);
  } },
];
