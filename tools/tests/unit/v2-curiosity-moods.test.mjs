// Big upgrade: music moods that build curiosity, in every tab.
import assert from 'node:assert/strict';
import { MOODS as CM } from '../../../cartoon/js/presets.js';
import { MOODS as EM } from '../../../explainer/js/presets.js';
import { FLAVORS } from '../../../shared/filmsound.js';

const NEW = ['mysterybox', 'tickingclock', 'detective', 'heartbeat', 'wonder', 'countdown', 'lofi'];
export const tests = [
  { name: 'seven curiosity moods in Cartoons and in 3D/Blocky, each with known layers', fn: () => {
    for (const M of [CM, EM]) for (const k of NEW) {
      assert.ok(M[k]?.label && M[k].scale && M[k].bpm, k);
      assert.ok(M[k].flavor.length && M[k].flavor.every(f => FLAVORS.includes(f)), k);
    }
  } },
  { name: '"No music" stays last in the list', fn: () => { assert.equal(Object.keys(CM).at(-1), 'none'); assert.equal(Object.keys(EM).at(-1), 'none'); } },
];
