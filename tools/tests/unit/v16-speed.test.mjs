// 1.6: exports never pause on timers (a background tab slows timers to a second or more).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextTask, drain } from '../../../shared/yieldtask.js';

const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
export const tests = [
  { name: 'the encoders yield with message tasks and wait on the encoder, not on setTimeout', fn: () => {
    for (const p of ['cartoon/js/encoder.js', 'explainer/js/encoder.js']) {
      const js = read(p);
      assert.match(js, /await drain\(venc, 6\);/, p); assert.match(js, /await nextTask\(\);/, p);
      const loop = js.slice(js.indexOf('for (let f = 0; f < totalFrames; f++)'), js.indexOf('await venc.flush()'));
      assert.doesNotMatch(loop, /setTimeout/, p);
    }
    assert.match(read('shared/encode.js'), /await drain\(venc, 8\)/);
  } },
  { name: 'nextTask resolves without a timer, and drain waits until the queue is short', fn: async () => {
    const real = globalThis.setTimeout; let timers = 0;
    globalThis.setTimeout = (...a) => { timers++; return real(...a); };
    try {
      for (let i = 0; i < 50; i++) await nextTask();
      assert.equal(timers, 0);
      const enc = { encodeQueueSize: 9 };
      let n = 0; const shrink = async () => { while (enc.encodeQueueSize > 2) { await nextTask(); if (++n % 3 === 0) enc.encodeQueueSize--; } };
      await Promise.all([drain(enc, 6), shrink()]);
      assert.ok(enc.encodeQueueSize <= 6);
    } finally { globalThis.setTimeout = real; }
  } },
];
