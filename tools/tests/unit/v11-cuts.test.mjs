// 1.1: the cut list behind "cut parts out" on the export page.
import assert from 'node:assert/strict';
import { normalizeCuts, removed, mapTime, cutAt, cutChannels, findPauses, clock } from '../../../shared/cuts.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

export const tests = [
  { name: 'cuts are sorted, snapped to frames, merged and kept inside the video', fn: () => {
    const c = normalizeCuts([{ a: 5, b: 4 }, { a: 4.5, b: 6 }, { a: 10, b: 10.01 }, { a: 18, b: 25 }], 20, 30);
    assert.deepEqual(c, [{ a: 4, b: 6 }, { a: 18, b: 20 }]);
    near(removed(c), 4);
    const s = normalizeCuts([{ a: 1.013, b: 2.02 }], 10, 24);
    near(s[0].a * 24, Math.round(s[0].a * 24)); near(s[0].b * 24, Math.round(s[0].b * 24));
  } },
  { name: 'a cut can never take the whole video', fn: () => {
    assert.deepEqual(normalizeCuts([{ a: 0, b: 10 }], 10, 30), []);
    assert.equal(normalizeCuts([{ a: 0, b: 4 }, { a: 4.5, b: 10 }], 10, 30).length, 1);
  } },
  { name: 'times map into the cut video; times inside a cut have no place', fn: () => {
    const c = [{ a: 2, b: 3 }, { a: 5, b: 7 }];
    near(mapTime(1, c), 1); assert.equal(mapTime(2.5, c), null); near(mapTime(3, c), 2); near(mapTime(4, c), 3); assert.equal(mapTime(6.9, c), null); near(mapTime(8, c), 5);
    assert.deepEqual(cutAt(6, c), { a: 5, b: 7 }); assert.equal(cutAt(4, c), null);
  } },
  { name: 'the sound loses exactly the cut parts, with soft joins', fn: () => {
    const sr = 1000, ch = new Float32Array(10 * sr).fill(1);
    const [out] = cutChannels([ch], sr, [{ a: 2, b: 3 }, { a: 5, b: 7 }]);
    assert.equal(out.length, 7 * sr);
    assert.equal(out[1000], 1); assert.ok(out[1999] < 0.2 && out[2000] < 0.2, 'faded at the join');
    assert.equal(out[out.length - 1], 1);
  } },
  { name: 'long pauses in the voice are found, with a little quiet kept on each side', fn: () => {
    const sr = 8000, ch = new Float32Array(8 * sr);
    const talk = (a, b) => { for (let i = a * sr; i < b * sr; i++) ch[i] = 0.5 * Math.sin(i * 0.3); };
    const hum = () => { for (let i = 0; i < ch.length; i++) ch[i] += 0.02 * Math.sin(i * 0.05); }; // music far under the voice
    talk(0, 2); talk(3.5, 5); talk(5.3, 8); hum();
    const p = findPauses([ch], sr);
    assert.equal(p.length, 1, JSON.stringify(p));
    assert.ok(Math.abs(p[0].a - 2.2) < 0.05 && Math.abs(p[0].b - 3.3) < 0.05, JSON.stringify(p));
  } },
  { name: 'clock shows minutes, seconds and tenths', fn: () => { assert.equal(clock(65.24), '1:05.2'); assert.equal(clock(3), '0:03.0'); } },
];
