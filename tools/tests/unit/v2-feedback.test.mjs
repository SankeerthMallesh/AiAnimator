// Big upgrade: Feedback grades and "Fix it for me".
import assert from 'node:assert/strict';
import { reviewVideo, grade, quickFixes, revisePrompt, SECTIONS } from '../../../shared/feedback.js';

const sc = (narration, o = {}) => ({ narration, ...o });
const weak = {
  title: 'History', youtubeTitle: 'A VERY LONG TITLE ABOUT THE HISTORY OF THE FIRST WORLD WAR AND EVERYTHING', hashtags: ['#History'],
  scenes: [sc('Have you ever wondered about the history of the First World War and all of the many different countries that were involved in it at the time?', { set: 'field' }),
    sc('It was a war that happened between nineteen fourteen and nineteen eighteen in Europe and in other places around the world as well.', { set: 'field' }),
    sc('Many countries fought in it for a long time and a great number of people sadly died during the conflict over those years.', { set: 'field' })],
};
const strong = {
  title: 'One Wrong Turn', youtubeTitle: 'Why One Wrong Turn Started WW1', thumbText: 'ONE WRONG TURN', hookText: 'ONE WRONG TURN', teaser: 2,
  hashtags: ['#shorts', '#ww1', '#history'],
  scenes: [
    sc('If you lived in 1914, one wrong turn could start a world war.', { set: 'city', who: [{ feel: 'smug', hold: 'map' }] }),
    sc('June 28th. The Archduke\'s driver takes the wrong street.', { set: 'road', who: [{ feel: 'nervous' }], props: [{ kind: 'car' }] }),
    sc('A young man is standing right there. Two shots!', { set: 'city', who: [{ feel: 'shocked' }] }),
    sc('But here\'s the catch: alliances pull everyone in.', { set: 'office', who: [{ feel: 'angry' }] }),
    sc('Who would stop it? Nobody did.', { set: 'office', who: [{ feel: 'sad' }] }),
    sc('So both sides dug trenches from the sea to Switzerland.', { set: 'field', who: [{ feel: 'neutral' }] }),
    sc('That\'s how one wrong turn changed the world.', { set: 'field', who: [{ feel: 'happy' }] }),
  ],
};

export const tests = [
  { name: 'grades run A+ to F', fn: () => { assert.equal(grade(97), 'A+'); assert.equal(grade(86), 'A-'); assert.equal(grade(72), 'B-'); assert.equal(grade(58), 'C-'); assert.equal(grade(10), 'F'); } },
  { name: 'every section is graded with tips; a weak script grades low and says why', fn: () => {
    const r = reviewVideo({ script: weak, options: { duration: 30, mood: 'none' }, settings: { ttsEngine: 'kokoro' } });
    assert.equal(r.sections.length, SECTIONS.length);
    assert.ok(r.overall.score < 70, JSON.stringify(r.overall));
    const hook = r.sections.find(s => s.key === 'hook');
    assert.ok(/[CDF]/.test(hook.grade[0]), hook.grade);
    assert.ok(hook.tips.some(t => /Have you ever wondered/.test(t)));
    assert.ok(r.sections.find(s => s.key === 'packaging').tips.some(t => /45/.test(t)));
  } },
  { name: 'a strong script grades well, and the real timeline sharpens pacing and length', fn: () => {
    const r = reviewVideo({ script: strong, options: { duration: 30, mood: 'tickingclock' }, settings: { ttsEngine: 'kokoro', character: 'hype' } });
    assert.ok(r.overall.score >= 80, JSON.stringify(r.sections.map(s => [s.key, s.score])));
    const slow = reviewVideo({ script: strong, timeline: { total: 80, scenes: [] }, options: { duration: 30, mood: 'curious' }, settings: {} });
    assert.ok(slow.sections.find(s => s.key === 'length').score < 40);
    assert.ok(slow.sections.find(s => s.key === 'pacing').score < r.sections.find(s => s.key === 'pacing').score);
  } },
  { name: 'quick fixes tidy the title, hashtags and thumbnail words without the AI', fn: () => {
    const f = quickFixes(weak);
    assert.ok(f.youtubeTitle.length <= 45); assert.deepEqual(f.hashtags, ['#history']);
    assert.ok(f.thumbText.split(' ').length >= 1 && f.thumbText.split(' ').length <= 4);
  } },
  { name: 'the fix prompt names the weak sections, keeps facts and the JSON shape', fn: () => {
    const r = reviewVideo({ script: weak, options: { duration: 30 }, settings: {} });
    const p = revisePrompt(weak, r);
    assert.match(p, /Hook \(first 3 seconds\) \([CDF]/); assert.match(p, /keep every fact true/); assert.match(p, /same JSON shape/);
    assert.ok(p.includes(JSON.stringify(weak)));
  } },
];
