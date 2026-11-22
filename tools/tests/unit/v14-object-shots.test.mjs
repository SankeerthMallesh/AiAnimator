// 1.4: Cartoons cuts to a big close-up of the thing a scene is about.
import assert from 'node:assert/strict';
import { Stage } from '../../../cartoon/js/stage.js';

const sc = (o) => ({ id: 's', narration: 'It has no signal up here.', say: 'a', who: [{ id: 'a', x: 0.5 }], acts: [], props: [], start: 0, dur: 4, ...o });

export const tests = [
  { name: 'the thing is what the speaker holds, else what anyone uses, else a real prop (not scenery)', fn: () => {
    assert.equal(Stage.thingOf(sc({ who: [{ id: 'a', hold: 'phone' }, { id: 'b', hold: 'cup' }] })).kind, 'phone');
    assert.equal(Stage.thingOf(sc({ acts: [{ t: 0.5, id: 'a', do: 'break', hold: 'cup' }] })).kind, 'cup');
    assert.equal(Stage.thingOf(sc({ props: [{ kind: 'house' }, { kind: 'rocket' }] })).kind, 'rocket');
    assert.equal(Stage.thingOf(sc({ props: [{ kind: 'icon', emoji: '🚀' }] })), null);
  } },
  { name: 'a scene with a thing gets an object close-up later in the scene, never as its first shot', fn: () => {
    for (let i = 0; i < 6; i++) {
      const s = sc({ index: i, who: [{ id: 'a', x: 0.5, hold: 'phone' }] });
      assert.equal(Stage.setupAt(s, 0.2).kind, 'first');
      const kinds = [1.6, 3.5].map(t => Stage.setupAt(s, t).kind);
      if (i % 2 === 0) assert.ok(kinds.includes('object'), `${i}: ${kinds}`);
    }
    assert.ok(![0, 1.6, 3.5].some(t => Stage.setupAt(sc({ index: 0 }), t).kind === 'object'), 'no thing, no close-up');
  } },
];
