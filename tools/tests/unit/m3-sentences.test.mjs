// M3 (found in the live check): pasted scripts must not split "$3.99" or "2.5" into two lines.
import assert from 'node:assert/strict';
import { Script } from '../../../cartoon/js/script.js';
import { scriptFromText } from '../../../explainer/js/llm.js';
const TEXT = 'The baking powder cost her $3.99 at the corner shop. It rose 2.5 inches. Dr. Smith was amazed!';
const has = (lines, s) => lines.some(l => l.includes(s));
export const tests = [
  { name: 'Cartoons pasted script keeps $3.99, 2.5 and Dr. Smith whole', fn: () => { const l = Script.fromText(TEXT, { topic: 'pancakes', format: '9:16' }).scenes.map(s => s.narration); assert.ok(has(l, '$3.99 at the corner shop') && has(l, '2.5 inches') && has(l, 'Dr. Smith'), JSON.stringify(l)); } },
  { name: '3D pasted script keeps $3.99, 2.5 and Dr. Smith whole', fn: () => { const l = scriptFromText(TEXT, { topic: 'pancakes', style: 'story-3d', format: '9:16' }).scenes.map(s => s.narration); assert.ok(has(l, '$3.99 at the corner shop') && has(l, '2.5 inches') && has(l, 'Dr. Smith'), JSON.stringify(l)); } },
];
