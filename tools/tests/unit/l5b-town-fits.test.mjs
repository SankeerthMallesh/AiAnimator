// L5b: the 3D cartoon town is the default only for stories it can show (park, bank street, bridge, square).
import assert from 'node:assert/strict';
import { townFits } from '../../../cartoon/js/presets.js';
export const tests = [
  { name: 'stories set somewhere the town cannot build get painted sets', fn: () => {
    for (const t of ['How the Vikings invaded England', 'The first moon landing', 'Why pirates buried treasure', 'How the pyramids were built', 'Knights in a medieval castle', 'The last dinosaurs']) assert.equal(townFits(t), false, t);
  } },
  { name: 'everyday stories keep the town', fn: () => {
    for (const t of ['Why do cats land on their feet', 'How banks make money', 'A boy who saves his town', 'Why bridges sway', 'How a speed bump works']) assert.equal(townFits(t), true, t);
  } },
];
