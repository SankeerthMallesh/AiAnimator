// 1.4: the 3D town dresses the script's own characters and shows the nervous face.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { townLooks, townScenes } from '../../../cartoon/js/town.js';

export const tests = [
  { name: 'each character keeps their colour; crews and officers wear caps, scientists a white coat, no 1800s dresses', fn: () => {
    const [a, b, c] = townLooks([
      { color: '#F2C230', hat: 'hair', hair: 'brown', costume: 'jumpsuit' },
      { color: '#E5673B', hat: 'officer', hair: 'black', costume: 'jumpsuit' },
      { color: '#7A4EBF', hat: 'bun', hair: 'red', costume: 'labcoat' }]);
    assert.equal(a.jacket, '#F2C230'); assert.equal(a.hat, 'hair');
    assert.equal(b.hat, 'cap'); assert.equal(b.cap, '#2e3f73');
    assert.equal(c.jacket, '#f2f4f7');
    for (const l of [a, b, c]) assert.equal(l.dress, '');
  } },
  { name: 'a nervous lead gets the nervous face (the think pose)', fn: () => {
    const [s] = townScenes([{ start: 0, dur: 3, narration: 'Hmm.', say: 'a', who: [{ id: 'a', feel: 'nervous' }] }]);
    assert.equal(s.act, 'think');
  } },
  { name: 'the engine takes the looks and the town gets the glow', fn: () => {
    const js = readFileSync(new URL('../../../cartoon/js/c3d/cartoon3d.js', import.meta.url), 'utf8');
    assert.match(js, /setLooks\(looks\)/);
    const town = readFileSync(new URL('../../../cartoon/js/town.js', import.meta.url), 'utf8');
    assert.match(town, /looks: townLooks\(script\?\.cast/); assert.match(town, /glare\(this\.g/);
  } },
];
