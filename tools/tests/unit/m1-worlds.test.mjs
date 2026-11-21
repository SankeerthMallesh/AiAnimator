// M1: the painted fallback world matches the line.
import assert from 'node:assert/strict';
import * as R from '../../../explainer/js/renderer.js';
const w = (narration) => { assert.equal(typeof R.worldFor, 'function', 'worldFor is exported'); return R.worldFor({ narration, visual: '' }); };
export const tests = [
  { name: '"Great Wall" -> landmark or wall', fn: () => assert.match(w('The Great Wall is about 13,171 miles long.'), /wall|landmark/) },
  { name: '"space" -> space', fn: () => assert.equal(w('Can you see it from space?'), 'space') },
  { name: '"orbit" -> space', fn: () => assert.equal(w('The station stays in orbit for years.'), 'space') },
  { name: '"moon" -> space', fn: () => assert.equal(w('They landed on the moon in 1969.'), 'space') },
  { name: '"ocean" -> sea', fn: () => assert.equal(w('The ocean covers most of the planet.'), 'sea') },
  { name: '"sea" -> sea', fn: () => assert.equal(w('Out at sea, the storm grew.'), 'sea') },
  { name: '"school" -> indoor school', fn: () => assert.match(w('At school, nobody believed him.'), /school/) },
  { name: '"cafeteria" -> indoor school', fn: () => assert.match(w('The cafeteria went silent.'), /school/) },
  { name: '"forest" -> forest or snow', fn: () => assert.match(w('Deep in the forest, something moved.'), /^(forest|snow)$/) },
  { name: '"snow" -> forest or snow', fn: () => assert.match(w('The snow kept falling all night.'), /^(forest|snow)$/) },
  { name: '"kitchen" -> indoor home', fn: () => assert.match(w('In the kitchen, the bread kept rising.'), /home|room|kitchen/) },
  { name: 'unknown topic is never mountains', fn: () => { for (const n of ['Nobody expected the twist.', 'Here is the strange part.', 'It all started with one decision.', 'Most people get this wrong.']) assert.notEqual(w(n), 'mountains', n); } },
];
