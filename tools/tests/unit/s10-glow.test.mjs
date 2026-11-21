// S10: glow only around one solid shape covering 5-35% of the frame.
import assert from 'node:assert/strict';
import * as G from '../../../explainer/js/glow.js';
function disk(m, w, cx, cy, r) { for (let y = 0; y < m.length / w; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) m[y * w + x] = 1; }
export const tests = [
  { name: 'two separate blobs -> null', fn: () => { assert.equal(typeof G.glowMask, 'function', 'glowMask(mask, w, h) is exported'); const w = 200, h = 200, m = new Uint8Array(w * h); disk(m, w, 55, 100, 32); disk(m, w, 145, 100, 32); assert.equal(G.glowMask(m, w, h), null); } },
  { name: 'one solid shape covering ~15% -> glows', fn: () => { const w = 200, h = 200, m = new Uint8Array(w * h); disk(m, w, 100, 100, 44); assert.notEqual(G.glowMask(m, w, h), null); } },
  { name: 'a shape covering 50% -> null', fn: () => { const w = 200, h = 200, m = new Uint8Array(w * h); for (let i = 0; i < w * h / 2; i++) m[i] = 1; assert.equal(G.glowMask(m, w, h), null); } },
];
