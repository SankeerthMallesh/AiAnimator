// S7: 3D story narration stays plain; the brief guard fails any script with a banned phrase.
import assert from 'node:assert/strict';
import { plainLine } from '../../../explainer/js/llm.js';
import { guardScript } from '../briefguard.mjs';
const LINES = ['The frozen lake beckons.', 'She embraces the cold.', 'A dance of light on the ice.', 'It is a testament to courage.', 'Remember, always swim with a friend.', 'In the end, he made it out.', 'What a journey it was.'];
export const tests = [
  { name: 'the brief guard fails a 3D script with any banned phrase', fn: () => { for (const l of LINES) assert.ok(guardScript({ tab: '3d', lines: [l] }).length > 0, l); } },
  { name: 'story-3d narration comes out without banned phrases', fn: () => { for (const l of LINES) { const out = plainLine(l, 'story-3d'); assert.equal(guardScript({ tab: '3d', lines: [out] }).length, 0, `${l} -> ${out}`); } } },
  { name: 'plain lines are untouched', fn: () => { for (const l of ['What happens if you jump into ice water?', 'Your heart races.']) assert.equal(plainLine(l, 'story-3d'), l); } },
];
