// Q1 (found by the 1000-video test): a 3D caption never shows a lone one- or two-letter word that
// ends a line, like the "F" of "28 degrees F."; it stays with the words before it.
import assert from 'node:assert/strict';
import { captions3d } from '../../../explainer/js/z3d/captions.js';
const scene = (start, text) => ({ start, words: text.split(' ').map((w, k) => ({ text: w, start: k * 0.3, end: k * 0.3 + 0.25 })) });
export const tests = [
  { name: 'a trailing unit letter joins the caption before it', fn: () => {
    const caps = captions3d([scene(0, 'About 1,500 people died in water near 28 degrees F.')]);
    assert.ok(!caps.some(c => /^\w{1,2}$/.test(c[1])), JSON.stringify(caps.map(c => c[1])));
    assert.ok(caps.some(c => / F$/.test(c[1])), JSON.stringify(caps.map(c => c[1])));
  } },
  { name: 'a short word in the middle of a line still starts a new caption normally', fn: () => {
    const caps = captions3d([scene(0, 'She went up to the top of it all')]);
    for (const [, t] of caps) assert.ok(t.split(' ').length <= 3, t);
  } },
  { name: 'a one-word line is still its own caption', fn: () => {
    assert.deepEqual(captions3d([scene(0, 'Boom!')]).map(c => c[1]), ['Boom']);
  } },
];
