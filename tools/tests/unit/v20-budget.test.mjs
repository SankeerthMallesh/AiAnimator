// 2.0: a video under a minute is made within 7 minutes: the render steps down only when it would not fit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planRender, budgetFor, probeFrames, BUDGET_S } from '../../../shared/budget.js';

export const tests = [
  { name: 'the budget is 7 minutes for a Short, 7 a minute for longer videos', fn: () => {
    assert.equal(BUDGET_S, 420); assert.equal(budgetFor(45), 420); assert.equal(budgetFor(180), 1260);
  } },
  { name: 'a fast computer keeps the asked quality', fn: () => {
    const p = planRender({ elapsedS: 60, durationS: 60, asked: { short: 1080, fps: 30 }, msPerFrame: 40 });
    assert.equal(p.changed, false); assert.equal(p.short, 1080); assert.equal(p.fps, 30); assert.ok(p.fits);
  } },
  { name: '2.1: a slow computer steps down pixels only, keeping 30 frames a second (smooth motion first)', fn: () => {
    // 60 s at 30 fps = 1800 frames; at 130 ms a frame that is ~270 s, too long with 3 minutes already used (220 s left);
    // at 900p it is ~187 s, which fits.
    const a = planRender({ elapsedS: 180, durationS: 60, asked: { short: 1080, fps: 30 }, msPerFrame: 130 });
    assert.equal(a.short, 900); assert.equal(a.fps, 30); assert.ok(a.fits);
    const b = planRender({ elapsedS: 180, durationS: 60, asked: { short: 1080, fps: 30 }, msPerFrame: 200 });
    assert.ok(b.short === 720 && b.fps === 30 && b.fits, JSON.stringify(b));
    assert.ok(b.estS <= b.leftS);
  } },
  { name: 'never above what was asked; a hopeless case takes the lightest render and says it does not fit', fn: () => {
    const a = planRender({ elapsedS: 0, durationS: 30, asked: { short: 720, fps: 24 }, msPerFrame: 1 });
    assert.equal(a.short, 720); assert.equal(a.fps, 24);
    const b = planRender({ elapsedS: 400, durationS: 60, asked: { short: 1080, fps: 30 }, msPerFrame: 900 });
    assert.equal(b.short, 720, 'never below 720p'); assert.equal(b.fps, 30, 'never choppy'); assert.equal(b.fits, false);
  } },
  { name: 'timing a renderer: the median of a few frames', fn: async () => {
    let n = 0; const r = { drawFrame() { n++; } };
    const ms = await probeFrames(r, 30, 5);
    assert.equal(n, 5); assert.ok(ms >= 0);
  } },
  { name: 'both pipelines use it (Best never steps down), and the town never waits on a timer in a background tab', fn: () => {
    for (const p of ['cartoon/js/pipeline.js', 'explainer/js/pipeline.js']) {
      const js = readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
      assert.match(js, /this\.s\.speed !== 'best'/); assert.match(js, /planRender\(/); assert.match(js, /this\.born = performance\.now\(\)/);
    }
    assert.match(readFileSync(new URL('../../../cartoon/js/town.js', import.meta.url), 'utf8'), /document\.hidden\) \{ await nextTask\(\)/);
  } },
];
