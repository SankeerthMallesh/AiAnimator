// 1.6: the Blocky tab tells "In this town" stories only, with hundreds of rule ideas.
import assert from 'node:assert/strict';
import { TOWN_IDEAS, TOWN_IDEA_COUNT } from '../../../shared/townideas.js';
import { findIdeas } from '../../../shared/ideas.js';
import { STYLES } from '../../../explainer/js/presets.js';
import { reviewVideo } from '../../../shared/feedback.js';

export const tests = [
  { name: 'hundreds of town ideas, each one a rule that starts "In this town,", no repeats', fn: () => {
    assert.ok(TOWN_IDEA_COUNT >= 200, String(TOWN_IDEA_COUNT));
    const all = Object.values(TOWN_IDEAS).flat();
    assert.equal(new Set(all.map(t => t.toLowerCase())).size, all.length);
    for (const t of all) assert.match(t, /^In this town, /, t);
    assert.ok(Object.keys(TOWN_IDEAS).length >= 10);
  } },
  { name: 'the ideas panel can search the town ideas', fn: () => {
    assert.ok(findIdeas('All', 'cry', TOWN_IDEAS).some(t => /cry, you lose one year/.test(t)));
    assert.equal(findIdeas('Food', '', TOWN_IDEAS).length, TOWN_IDEAS.Food.length);
  } },
  { name: 'both blocky looks write "In this town" stories with an odd twist and a meaning', fn: () => {
    for (const k of ['blocky', 'drawn-blocky']) {
      const d = STYLES[k].direction;
      assert.match(d, /"In this town,"/, k); assert.match(d, /ODD TWIST/, k); assert.match(d, /meaning/, k);
      assert.doesNotMatch(d, /first person/, k);
    }
  } },
  { name: 'Feedback counts an "In this town" opening as a strong hook', fn: () => {
    const script = { title: 'x', scenes: [{ narration: 'In this town, if you cry, you lose one year off your life.' }, { narration: 'Meet Sam.' }] };
    const other = { title: 'x', scenes: [{ narration: 'There once was a town with a rule about tears.' }, { narration: 'Meet Sam.' }] };
    const h = (s) => reviewVideo({ script: s }).sections.find(x => x.key === 'hook').score;
    assert.ok(h(script) > h(other));
  } },
];
