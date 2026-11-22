// 1.2: chapters in the YouTube description for long videos.
import assert from 'node:assert/strict';
import { chapterLines, withChapters } from '../../../shared/upload.js';
import { mapForward } from '../../../shared/cuts.js';

const sc = (start, title) => ({ start, chapter: title ? { n: 1, title } : null });
const scenes = [sc(0.9, 'The Raid'), sc(30), sc(80, 'The Chase'), sc(120), sc(160, 'The Trial'), sc(400, 'Aftermath')];

export const tests = [
  { name: 'chapters start at 0:00, one line per chapter, minutes and seconds', fn: () => {
    assert.deepEqual(chapterLines(scenes, 600), ['0:00 The Raid', '1:20 The Chase', '2:40 The Trial', '6:40 Aftermath']);
  } },
  { name: 'no list for shorts or for fewer than 3 chapters (YouTube would ignore it)', fn: () => {
    assert.deepEqual(chapterLines([sc(0, 'A'), sc(20, 'B')], 40), []);
    assert.deepEqual(chapterLines([sc(0), sc(5)], 30), []);
  } },
  { name: 'a chapter shorter than 10 s is left out', fn: () => {
    assert.deepEqual(chapterLines([sc(0, 'A'), sc(30, 'B'), sc(35, 'C'), sc(60, 'D')], 90), ['0:00 A', '0:35 C', '1:00 D']);
  } },
  { name: 'hours show as h:mm:ss', fn: () => { assert.equal(chapterLines([sc(0, 'A'), sc(1800, 'B'), sc(3700, 'C')], 4000)[2], '1:01:40 C'); } },
  { name: 'after cuts, chapters move to match the cut video', fn: () => {
    const cuts = [{ a: 10, b: 20 }, { a: 75, b: 85 }];
    assert.deepEqual(chapterLines(scenes, 600, (t) => mapForward(t, cuts)), ['0:00 The Raid', '1:05 The Chase', '2:20 The Trial', '6:20 Aftermath']);
  } },
  { name: 'the description keeps its own text; the chapter block is replaced, not repeated', fn: () => {
    const d1 = withChapters('A story.\n\nSources: Wikipedia', ['0:00 A', '1:00 B', '2:00 C']);
    assert.equal(d1, 'A story.\n\nSources: Wikipedia\n\nChapters\n0:00 A\n1:00 B\n2:00 C');
    const d2 = withChapters(d1 + '\n', ['0:00 A', '0:50 B', '1:50 C']);
    assert.equal((d2.match(/Chapters/g) || []).length, 1); assert.match(d2, /0:50 B/);
    assert.equal(withChapters(d1, []), 'A story.\n\nSources: Wikipedia');
  } },
];
