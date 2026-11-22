// 1.4: indoor space-station rooms for Cartoons, picked when the story is inside a spacecraft.
import assert from 'node:assert/strict';
import { Script } from '../../../cartoon/js/script.js';
import { SetKit } from '../../../cartoon/js/props.js';
import { WORLD_IDS } from '../../../cartoon/js/worlds.js';

export const tests = [
  { name: 'the four rooms are sets the writer can pick, each with a painted world', fn: () => {
    for (const id of ['cabin', 'control', 'bunks', 'cockpit']) { assert.ok(SetKit.IDS.includes(id), id); assert.ok(WORLD_IDS.includes(id), id); assert.ok(SetKit.palette(id).sky, id); }
  } },
  { name: 'lines inside a spacecraft land in the right room', fn: () => {
    assert.equal(Script.guessSet('Mission control starts the countdown.'), 'control');
    assert.equal(Script.guessSet('He floats back into the cockpit.'), 'cockpit');
    assert.equal(Script.guessSet('The new guy was asleep.', 'Why astronauts cannot flush in space'), 'bunks');
    assert.equal(Script.guessSet('If you flush the toilet, it comes back up.', 'Why astronauts cannot flush in space'), 'cabin');
  } },
  { name: 'the same words on Earth keep their usual places', fn: () => {
    assert.notEqual(Script.guessSet('The new guy was asleep.', 'Why cats sleep all day'), 'bunks');
    assert.notEqual(Script.guessSet('If you flush the toilet, it goes down.', 'How plumbing works'), 'cabin');
  } },
];
tests.push({ name: 'a writer\'s generic space, night or lab set becomes the right room inside a spacecraft', fn: () => {
  const s = Script.normalize({ title: 'Why astronauts cannot flush', cast: [{ id: 'a', name: 'A' }], scenes: [
    { line: 'If you flushed a toilet in space, it would come back up.', set: 'space', say: 'a', who: [{ id: 'a' }] },
    { line: 'The new guy was asleep.', set: 'night', say: 'a', who: [{ id: 'a' }] },
    { line: 'Mission control starts the countdown.', set: 'lab', say: 'a', who: [{ id: 'a' }] },
    { line: 'The view of Earth is amazing.', set: 'space', say: 'a', who: [{ id: 'a' }] }] }, { topic: 'Why astronauts cannot flush in space' });
  assert.deepEqual(s.scenes.map(sc => sc.set), ['cabin', 'bunks', 'control', 'space']);
} });
tests.push({ name: 'trenches and battlefields are fields, even when the line names the sea', fn: () => {
  assert.equal(Script.guessSet('So both sides dug in. Trenches ran about 700 kilometers, from the sea to Switzerland.'), 'field');
  assert.equal(Script.guessSet('Machine guns turned every charge into a disaster.'), 'field');
  assert.equal(Script.guessSet('The ship sailed across the sea.'), 'sea');
} });
