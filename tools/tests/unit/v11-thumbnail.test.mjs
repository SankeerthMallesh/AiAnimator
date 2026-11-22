// 1.1: thumbnails: the words, the yellow word, the moments to grab, and text that fits.
import assert from 'node:assert/strict';
import { thumbWords, accentWord, pickMoments, fitText, detailOf } from '../../../shared/thumbnail.js';
import { normalizeScript } from '../../../explainer/js/llm.js';

export const tests = [
  { name: 'the words: the writer\'s thumbnail text first, in capitals, 4 words at most, never ending on a little word', fn: () => {
    assert.equal(thumbWords({ thumbText: 'It heals itself', hookText: 'x', title: 'y' }), 'IT HEALS ITSELF');
    assert.equal(thumbWords({ thumbText: 'It falls through the ice' }), 'IT FALLS THROUGH ICE');
    assert.equal(thumbWords({ hookText: 'This wall is 2,000 years old' }), 'THIS WALL 2,000 YEARS');
    assert.equal(thumbWords({ thumbText: 'Nobody expected this' }), 'NOBODY EXPECTED THIS');
    assert.equal(thumbWords({ title: 'Roman Concrete 🤯' }), 'ROMAN CONCRETE');
    assert.equal(thumbWords({}), 'WATCH THIS');
  } },
  { name: 'the yellow word is a number if there is one, else the longest word', fn: () => {
    assert.equal(accentWord('13 DAYS OF PANIC'), 0);
    assert.equal(accentWord('IT HEALS ITSELF'), 2);
    assert.equal(accentWord('WOW'), -1);
  } },
  { name: 'moments: reactions and impacts first, never in the first 3 s, spread out, at most 4', fn: () => {
    const sc = (i, o = {}) => ({ start: i * 3, dur: 3, frame: 'talk', ...o });
    const scenes = [sc(0, { frame: 'react' }), sc(1), sc(2, { frame: 'wide' }), sc(3), sc(4, { frame: 'react', act: 'surprised' }), sc(5), sc(6, { camera: 'impact' }), sc(7), sc(8), sc(9)];
    const m = pickMoments(scenes, { total: 30 });
    assert.ok(m.length === 4, JSON.stringify(m));
    assert.ok(m.every(t => t >= 3));
    assert.ok(m.some(t => t > 12 && t < 15) && m.some(t => t > 18 && t < 21), JSON.stringify(m));
    const sorted = m.slice().sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 1.5);
    // Best first: the first moment is a reaction or an impact (scenes 4 and 6), not just the earliest.
    assert.ok((m[0] > 12 && m[0] < 15) || (m[0] > 18 && m[0] < 21), String(m[0]));
    assert.equal(pickMoments([], { total: 10 })[0], 4);
  } },
  { name: 'text fits its box: the biggest size, at most 3 lines', fn: () => {
    const measure = (s, size) => s.length * size * 0.6;
    const f = fitText(measure, 'IT HEALS ITSELF', 600, 400, { max: 200 });
    assert.ok(f.lines.length <= 3);
    for (const l of f.lines) assert.ok(measure(l.join(' '), f.size) <= 600);
    assert.ok(f.lines.length * f.size * 0.98 <= 400);
    assert.ok(f.size >= 120, String(f.size));
  } },
  { name: 'the 3D tab keeps the writer\'s thumbnail words', fn: () => {
    const s = normalizeScript({ title: 'T', thumbText: 'It heals itself now please', scenes: [{ narration: 'A line.' }, { narration: 'B line.' }] }, { topic: 't', style: 'auto' });
    assert.equal(s.thumbText, 'It heals itself now');
  } },
  { name: 'frame picker: more moments on request, and a busy frame scores above a flat one', fn: () => {
    const scenes = Array.from({ length: 20 }, (_, i) => ({ start: i * 3, dur: 3, narration: 'Line ' + i }));
    assert.ok(pickMoments(scenes, { total: 60, max: 8 }).length > 4);
    assert.ok(pickMoments(scenes, { total: 60 }).length <= 4);
    const w = 16, rows = 16, flat = new Uint8ClampedArray(w * rows * 4).fill(120), busy = flat.map((_, i) => ((i >> 2) % 3) * 90);
    assert.equal(detailOf(flat, w, rows), 0);
    assert.ok(detailOf(busy, w, rows) > 20);
  } },
];
