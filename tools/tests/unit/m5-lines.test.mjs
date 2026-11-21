// M5 (found in the live check): lines padded with filler or a tacked-on prop name are tidied; real uses stay.
import assert from 'node:assert/strict';
import { tidyLine } from '../../../cartoon/js/script.js';
const CASES = [
  ['Milo, a daring rail-hacker, wants nonstop smooth rides ticket', 'Milo, a daring rail-hacker, wants nonstop smooth rides.'],
  ['Sam warns rails expand, shrink—gaps prevent buckling catastrophes ruler', 'Sam warns rails expand, shrink—gaps prevent buckling catastrophes.'],
  ['But the reason: thermal stress, not train-braking myths, bulb', 'But the reason: thermal stress, not train-braking myths.'],
  ['Milo measures gap with giant ruler, eyes wide today', 'Milo measures gap with giant ruler, eyes wide.'],
  ['Milo waves his train ticket at the crowd.', 'Milo waves his train ticket at the crowd.'],
  ['She bought a ticket', 'She bought a ticket.'],
  ['Mabel grabs the old map!', 'Mabel grabs the old map!'],
  ['Do it now', 'Do it now.'],
];
export const tests = CASES.map(([a, b]) => ({ name: `tidyLine(${JSON.stringify(a)})`, fn: () => assert.equal(tidyLine(a), b) }));
