// S12: Cartoons captions keep capitals and end punctuation.
import assert from 'node:assert/strict';
import { Stage } from '../../../cartoon/js/stage.js';
export const tests = [
  { name: '"Maya", "bites." -> "Maya bites."', fn: () => { const c = Stage.chunks([{ text: 'Maya', start: 0, end: 0.3 }, { text: 'bites.', start: 0.3, end: 0.6 }]); assert.equal(c.map(x => x.text).join(' | '), 'Maya bites.'); } },
];
