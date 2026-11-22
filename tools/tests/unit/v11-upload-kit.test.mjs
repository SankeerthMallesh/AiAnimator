// 1.1: lowercase hashtags and short, compact titles in every tab's upload kit.
import assert from 'node:assert/strict';
import { lowerTags, compactTitle } from '../../../shared/upload.js';
import { normalizeScript, writerPrompt } from '../../../explainer/js/llm.js';
import { Script } from '../../../cartoon/js/script.js';

const scene = { narration: 'Roman concrete heals its own cracks.', visual: 'a wall', camera: 'push', transition: 'cut' };

export const tests = [
  { name: 'hashtags are lowercase, one word, no repeats, no #topic', fn: () => {
    assert.deepEqual(lowerTags(['#Shorts', '#RomanConcrete', 'History', '#history', '#topic', 'Ancient Rome!']), ['#shorts', '#romanconcrete', '#history', '#ancientrome']);
  } },
  { name: 'titles lose filler openings and long tails, and stay under 57 characters', fn: () => {
    assert.equal(compactTitle('The Shocking Truth About Roman Concrete 🤯'), 'Roman Concrete 🤯');
    assert.equal(compactTitle('How the Romans Built Concrete That Lasts 2,000 Years | Ancient Engineering Explained'), 'How the Romans Built Concrete That Lasts 2,000 Years');
    assert.equal(compactTitle('Why Train Tracks Have Gaps 🤯'), 'Why Train Tracks Have Gaps 🤯');
    const long = compactTitle('This incredibly long title keeps going and going about many different things in history and science');
    assert.ok(long.length <= 56 && !/\s(and|the|in)$/.test(long), long);
  } },
  { name: '3D and Blocky tab: the writer is asked for both, and the script is tidied either way', fn: () => {
    const p = writerPrompt('Roman concrete', { duration: 45, style: 'auto', pace: 'normal' });
    assert.match(p, /under 45 characters/); assert.match(p, /lowercase/);
    const s = normalizeScript({ title: 'Roman Concrete', youtubeTitle: 'You Won\'t Believe Why Roman Concrete Still Stands After Two Thousand Years', hashtags: ['#Shorts', 'RomanConcrete', '#History'], scenes: [scene, scene] }, { topic: 'Roman concrete', style: 'auto' });
    assert.deepEqual(s.hashtags, ['#shorts', '#romanconcrete', '#history']);
    assert.ok(s.youtubeTitle.length <= 56 && !/believe/i.test(s.youtubeTitle), s.youtubeTitle);
  } },
  { name: 'Cartoons tab: hashtags are lowercase, also the ones it makes up from the topic', fn: () => {
    const tags = Script.hashtags(['#Trains'], 'Why Railroad Tracks Have Gaps');
    assert.ok(tags.length >= 6); assert.equal(tags[0], '#shorts');
    for (const t of tags) assert.equal(t, t.toLowerCase());
    assert.ok(tags.includes('#trains'));
  } },
];
