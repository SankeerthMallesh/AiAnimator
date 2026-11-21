// S9: two punch-ins per long shot, aimed at different targets from the depth map.
import assert from 'node:assert/strict';
import { Renderer } from '../../../explainer/js/renderer.js';
function depthWithSubject(w, h, cx, cy, r) {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = (x - cx) ** 2 + (y - cy) ** 2 < r * r ? 1 : 0.2;
  return { data, width: w, height: h };
}
export const tests = [
  { name: 'punch-ins at a third and two thirds of a 3 s shot', fn: () => { const r = { clips: [], drawnHero: [] }; const sc = { index: 0, dur: 3 }; assert.deepEqual([0.5, 1.2, 2.2].map(t => Renderer.prototype._punch.call(r, sc, t)), [0, 1, 2]); } },
  { name: 'no punch-in in a shot of 2 s or less', fn: () => assert.equal(Renderer.prototype._punch.call({ clips: [], drawnHero: [] }, { index: 0, dur: 1.9 }, 1.5), 0) },
  { name: 'targets: the nearest subject first, then its upper part on the other side', fn: () => {
    const d = depthWithSubject(200, 300, 140, 150, 30); // subject right of centre
    const [a, b] = Renderer.prototype._targets.call({ depths: [d] }, 0);
    assert.ok(Math.abs(a.u - 0.7) < 0.05 && Math.abs(a.v - 0.5) < 0.05, `first target ${JSON.stringify(a)}`);
    assert.ok(b.v < a.v - 0.05, 'second target is higher');
    assert.ok(b.u < a.u, 'second target moves toward the other side');
  } },
];
