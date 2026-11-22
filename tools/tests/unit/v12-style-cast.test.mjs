// 1.2 style: crew outfits and headwear, new faces, and no two characters dressed alike.
import assert from 'node:assert/strict';
import { Script } from '../../../cartoon/js/script.js';
import { Cast } from '../../../cartoon/js/cast.js';

const line = { line: 'If you flush in space, it does not go down.', say: 'a', who: [{ id: 'a', x: 0.4 }] };

export const tests = [
  { name: 'new outfits, headwear and faces are known to the rig', fn: () => {
    for (const c of ['jumpsuit', 'labcoat']) assert.ok(Cast.COSTUMES.includes(c));
    for (const h of ['headset', 'officer', 'bun']) assert.ok(Cast.HATS.includes(h));
    for (const f of ['sleepy', 'nervous']) assert.ok(Cast.FEELS.includes(f));
  } },
  { name: 'a space story with no outfits given dresses the crew in jumpsuits, a lab coat and crew headwear', fn: () => {
    const s = Script.normalize({ title: 'Why astronauts cannot flush', cast: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }], scenes: [line] }, { topic: 'Why astronauts cannot flush in space' });
    assert.deepEqual(s.cast.map(c => c.costume), ['jumpsuit', 'jumpsuit', 'labcoat']);
    assert.ok(s.cast.some(c => c.hat === 'officer') && s.cast.some(c => c.hat === 'bun'), JSON.stringify(s.cast));
  } },
  { name: 'the writer\'s own outfits are kept, but twins are split up', fn: () => {
    const s = Script.normalize({ title: 'Shop', cast: [{ id: 'a', name: 'A', costume: 'apron', hat: 'cap' }, { id: 'b', name: 'B', costume: 'apron', hat: 'cap' }], scenes: [line] }, { topic: 'a corner shop' });
    assert.equal(s.cast[0].costume, 'apron'); assert.equal(s.cast[0].hat, 'cap');
    assert.notEqual(`${s.cast[1].costume}|${s.cast[1].hat}`, 'apron|cap');
  } },
];
