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
  { name: 'places the town cannot build get painted sets, however strong the computer', fn: () => {
    for (const t of ['The Viking raid on Lindisfarne', 'How the Romans built roads', 'Life on the first space station']) assert.equal(autoLook(t, { ok: true }).look, 'painted', t);
  } },
];
