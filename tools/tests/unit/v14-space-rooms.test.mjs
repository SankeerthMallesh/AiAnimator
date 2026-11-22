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
