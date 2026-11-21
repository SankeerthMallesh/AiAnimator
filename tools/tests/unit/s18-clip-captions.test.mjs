// S18: a long first word does not show its caption early.
import assert from 'node:assert/strict';
import { captionChunks } from '../../../clip/js/render.js';
export const tests = [
  { name: 'first word timed 0.0-3.2 s starts at 2.85 s', fn: () => { const c = captionChunks([{ w: 'Okay', s: 0, e: 3.2 }, { w: 'listen', s: 3.3, e: 3.6 }], 0, 10); assert.ok(Math.abs(c[0].a - 2.85) < 1e-6, `starts at ${c[0].a}`); } },
];
