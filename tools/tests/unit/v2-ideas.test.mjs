// Big upgrade: hundreds of video ideas.
import assert from 'node:assert/strict';
import { IDEAS, IDEA_COUNT, findIdeas, shuffled } from '../../../shared/ideas.js';

export const tests = [
  { name: 'over 200 ideas in 20 categories, no repeats, each a usable topic', fn: () => {
    assert.ok(IDEA_COUNT >= 240, String(IDEA_COUNT));
    assert.ok(Object.keys(IDEAS).length >= 20);
    const all = Object.values(IDEAS).flat();
    assert.equal(new Set(all).size, all.length);
    for (const t of all) assert.ok(t.length >= 10 && t.length <= 70, t);
  } },
  { name: 'search matches every word, in any order; a category narrows it', fn: () => {
    assert.ok(findIdeas('All', 'space toilet').some(t => /flush a toilet in space/.test(t)));
    assert.ok(findIdeas('Food', '').every(t => IDEAS.Food.includes(t)));
    assert.equal(findIdeas('All', 'zzzz').length, 0);
  } },
  { name: 'shuffle is stable for a seed and different for another', fn: () => {
    const a = shuffled(IDEAS.Space, 3), b = shuffled(IDEAS.Space, 3), c = shuffled(IDEAS.Space, 10);
    assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.length, IDEAS.Space.length);
  } },
];
