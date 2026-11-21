// S8: the Blocky brief copies no names, never names its look, and ends for real.
import assert from 'node:assert/strict';
import { STYLES, LENGTHS } from '../../../explainer/js/presets.js';
import { plainLine } from '../../../explainer/js/llm.js';
import { guardScript } from '../briefguard.mjs';
export const tests = [
  { name: 'no example names in the Blocky direction (no "Milo")', fn: () => assert.doesNotMatch(STYLES.blocky.direction, /Milo|best friend [A-Z]/) },
  { name: 'the direction asks for a cliffhanger, a twist and a real ending, not an open question', fn: () => { assert.match(STYLES.blocky.direction, /cliffhanger/); assert.match(STYLES.blocky.direction, /twist/); assert.match(STYLES.blocky.direction, /never end on an open question/); } },
  { name: 'Blocky narration never says blocky, pixel or voxel', fn: () => { for (const l of ['My blocky house fell apart.', 'The pixel dog ran off.', 'A voxel castle stood there.']) { const out = plainLine(l, 'blocky'); assert.equal(guardScript({ tab: 'blocky', lines: [out] }).length, 0, `${l} -> ${out}`); } } },
  { name: '75 s is an option (the Blocky default)', fn: () => assert.ok(LENGTHS.some(([v]) => v === 75)) },
];
