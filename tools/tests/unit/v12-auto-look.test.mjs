// 1.2: the Cartoons Auto look: the 3D town for modern-town stories on a strong computer, painted sets
// for other places and on weaker computers.
import assert from 'node:assert/strict';
import { autoLook } from '../../../cartoon/js/presets.js';

export const tests = [
  { name: 'a modern-town story on a strong computer gets the 3D town', fn: () => {
    assert.equal(autoLook('Why a bank robbery went wrong in 9 minutes', { ok: true }).look, 'town3d');
  } },
  { name: 'the same story on a weak computer gets painted sets (the town once took a PC down)', fn: () => {
    const a = autoLook('Why a bank robbery went wrong in 9 minutes', { ok: false, why: 'software graphics' });
    assert.equal(a.look, 'painted'); assert.match(a.why, /computer/);
  } },
  { name: '2.0: places the town cannot build get their own 2.5D map on a strong computer, painted sets on a weak one', fn: () => {
    for (const t of ['How the Romans built roads', 'Life on the first space station', 'Knights defending a castle']) {
      assert.equal(autoLook(t, { ok: true }).look, 'town3d', t);
      assert.match(autoLook(t, { ok: true }).why, /2\.5D/, t);
      assert.equal(autoLook(t, { ok: false }).look, 'painted', t);
    }
  } },
  { name: 'Viking stories get the 3D town on a strong computer: the town has a Viking theme (TOWN2, asked for by the owner)', fn: () => {
    assert.equal(autoLook('The Viking raid on Lindisfarne', { ok: true }).look, 'town3d');
    assert.equal(autoLook('How the Vikings invaded England', { ok: true }).look, 'town3d');
    assert.equal(autoLook('The Viking raid on Lindisfarne', { ok: false, why: 'software graphics' }).look, 'painted');
  } },
];
