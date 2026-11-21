// C4 / S7: the brief guard catches what the owner ruled out, and the app does not produce it.
import assert from 'node:assert/strict';
import { propViolation, guardScript, guardManifest } from '../briefguard.mjs';
import { Script, propTrigger } from '../../../cartoon/js/script.js';
const FIGURATIVE = [
  ['The sky turned an orange sunset over the bay.', 'orange'],
  ['When she lost, she felt blue for weeks.', 'blue'],
  ['Then Leo had a cool idea.', 'cool'],
  ['That puppy was the apple of my eye.', 'apple'],
  ['One bite of ice cream gave him brain freeze.', 'brain'],
  ['Time flies when the race is close.', 'time'],
];
export const tests = [
  ...FIGURATIVE.map(([line, w]) => ({ name: `guard: no sticker for "${w}" in "${line}"`, fn: () => assert.notEqual(propViolation(w, line), '') })),
  { name: 'guard: a literal thing in its line is fine', fn: () => assert.equal(propViolation('apple', 'She bit into a red apple.'), '') },
  { name: 'guard: a prop with no trigger word fails (sailboat rule)', fn: () => assert.notEqual(propViolation('', 'The train left the station.'), '') },
  { name: 'guard: a trigger word not in the line fails', fn: () => assert.notEqual(propViolation('sailboat', 'The train left the station.'), '') },
  { name: 'guard: more than 2 props in one shot fails', fn: () => assert.ok(guardManifest({ tab: 'cartoons', script: { lines: ['A cat, a dog and a bird sat there.'] }, shots: [{ start: 0, end: 1, scene: 0, props: [{ kind: 'cat', triggerWord: 'cat' }, { kind: 'dog', triggerWord: 'dog' }, { kind: 'bird', triggerWord: 'bird' }] }], captions: [] }).length > 0) },
  { name: 'guard: sneeze gag fails', fn: () => assert.ok(guardScript({ lines: ['Achoo! Bless you, Leo.'] }).length > 0) },
  { name: 'guard: brand name fails', fn: () => assert.ok(guardScript({ lines: ['It looked like Roblox.'] }).length > 0) },
  { name: 'guard: Blocky narration never says blocky or pixel', fn: () => assert.ok(guardScript({ tab: 'blocky', lines: ['My blocky house fell apart.'] }).length > 0) },
  { name: 'S7 guard: a 3D script with a banned phrase fails', fn: () => { for (const l of ['The ocean beckons.', 'They embrace the cold.', 'A dance of light.', 'A testament to courage.', 'Remember, always swim safe.', 'In the end, he won.', 'What a journey it was.']) assert.ok(guardScript({ tab: '3d', lines: [l] }).length > 0, l); } },
  { name: 'S7 guard: a plain 3D line passes', fn: () => assert.equal(guardScript({ tab: '3d', lines: ['What happens if you jump into ice water?'] }).length, 0) },
  {
    name: 'app: Cartoons scripts make no sticker or prop for the six figurative lines',
    fn: () => {
      const raw = { title: 'Test', cast: [{ id: 'a', name: 'Leo' }, { id: 'b', name: 'Maya' }], scenes: FIGURATIVE.map(([line]) => ({ line, say: 'a' })) };
      const sc = Script.normalize(raw, { topic: 'a day at the beach', format: '9:16' });
      const bad = [];
      sc.scenes.forEach((s, i) => { for (const p of s.props || []) { const w = propTrigger(p, s.narration); const why = propViolation(w, s.narration); if (why) bad.push(`"${s.narration}": ${p.kind}${p.emoji ? ' ' + p.emoji : ''} ${why}`); } });
      assert.equal(bad.length, 0, bad.join('\n'));
    },
  },
];
