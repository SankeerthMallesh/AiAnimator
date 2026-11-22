// 1.2: Cartoons characters use the thing in hand: show, drop, grow, spin, break.
import assert from 'node:assert/strict';
import { Script } from '../../../cartoon/js/script.js';
import { Stage } from '../../../cartoon/js/stage.js';
import { Cast } from '../../../cartoon/js/cast.js';

const raw = (scenes) => ({ title: 'T', cast: [{ id: 'a', name: 'Ann', color: '#E85D4C', hat: 'cap' }, { id: 'b', name: 'Bo', color: '#3D74E0', hat: 'none' }], scenes });

export const tests = [
  { name: 'the five uses are actions the writer may send, and they keep their thing', fn: () => {
    for (const u of ['show', 'drop', 'grow', 'spin', 'break']) assert.ok(Script.ACTIONS.includes(u) && Cast.USES.includes(u));
    const s = Script.normalize(raw([
      { line: 'Look at this old key, it opens the vault.', say: 'a', who: [{ id: 'a', x: 0.3, hold: 'key' }], acts: [{ t: 0.5, id: 'a', do: 'show', hold: 'key' }] },
      { line: 'Then the cup slipped and it shattered on the floor.', say: 'b', who: [{ id: 'b', x: 0.6, hold: 'cup' }], acts: [{ t: 0.4, id: 'b', do: 'break', hold: 'cup' }] },
    ]), { topic: 't' });
    const acts = s.scenes.flatMap(sc => sc.acts || []);
    assert.ok(acts.some(a => a.do === 'show' && a.hold === 'key'), JSON.stringify(acts));
    assert.ok(acts.some(a => a.do === 'break' && a.hold === 'cup'), JSON.stringify(acts));
  } },
  { name: 'a line that drops or breaks the held thing gets that action even when the writer forgot it', fn: () => {
    const s = Script.normalize(raw([
      { line: 'She dropped the coin into the well.', say: 'a', who: [{ id: 'a', x: 0.4, hold: 'coin' }] },
      { line: 'He held up the book and it started to grow.', say: 'b', who: [{ id: 'b', x: 0.6, hold: 'book' }] },
    ]), { topic: 't' });
    const acts = s.scenes.flatMap(sc => (sc.acts || []).filter(a => Cast.USES.includes(a.do)));
    assert.ok(acts.some(a => a.do === 'drop'), JSON.stringify(s.scenes.map(sc => [sc.who, sc.acts])));
    assert.ok(acts.some(a => a.do === 'grow'), JSON.stringify(s.scenes.map(sc => [sc.who, sc.acts])));
  } },
  { name: 'the stage plays a use: the arm goes up to show, a broken thing is gone afterwards', fn: () => {
    const who = { id: 'a', x: 0.4, hold: 'cup' };
    const show = Stage.sampleActor(who, [{ t: 0.5, id: 'a', do: 'show' }], 1.0, 3);
    assert.equal(show.pose, 'show'); assert.equal(show.use.act, 'show'); assert.ok(Math.abs(show.use.p - 0.5) < 1e-9);
    const acts = [{ t: 0.2, id: 'a', do: 'break' }, { t: 2.0, id: 'a', do: 'point' }];
    assert.equal(Stage.sampleActor(who, acts, 0.5, 3).use.act, 'break');
    const after = Stage.sampleActor(who, acts, 2.5, 3);
    assert.equal(after.hold, ''); assert.equal(after.use, null);
    assert.equal(Stage.sampleActor({ id: 'a', x: 0.4 }, [{ t: 0.2, id: 'a', do: 'spin' }], 1, 3).use, null, 'nothing in hand, nothing to spin');
  } },
];
