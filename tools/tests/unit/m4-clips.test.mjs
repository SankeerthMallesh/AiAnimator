// M4: clips end on the payoff and never repeat themselves.
import assert from 'node:assert/strict';
import { findMoments } from '../../../clip/js/moments.js';
const VOCAB = 'we found the strangest thing in the old garage yesterday and nobody could explain why it was still glowing after all these years my brother thought it was radioactive but the guy from the museum said it was just a weird kind of paint they used before the war then he offered us a lot of money for it'.split(' ');
function transcript(words) {
  const segments = [];
  for (let i = 0; i < words.length; i += 8) { const g = words.slice(i, i + 8); segments.push({ s: g[0].s, e: g[g.length - 1].e, t: g.map(x => x.w).join(' ') }); }
  return { words, segments };
}
function stub(clips) { globalThis.fetch = async () => ({ json: async () => ({ ok: true, text: JSON.stringify({ clips }) }) }); }
export const tests = [
  {
    name: 'payoff at 16.2 s with minLen 25: the clip ends at or before 17.7 s',
    fn: async () => {
      const words = []; let t = 0;
      for (let i = 0; i < 110; i++) { const w = VOCAB[i % VOCAB.length] + (i % 9 === 8 ? '.' : ''); words.push({ w, s: t, e: t + 0.3 }); t += 0.4; }
      stub([{ start: 2.0, end: 30.0, payoffEnd: 16.2, heading: 'They Offered Us Money For It', score: 8, why: 'twist', highlight: [], emoji: [] }]);
      const clips = await findMoments(transcript(words), { count: 1, minLen: 25, maxLen: 60, duration: 44 });
      assert.equal(clips.length, 1, 'the clip is kept (between 12 s and minLen)');
      assert.ok(clips[0].e <= 17.7, `clip ends at ${clips[0].e.toFixed(2)} s`);
      assert.ok(clips[0].e >= 16.2, `clip ends at ${clips[0].e.toFixed(2)} s, before the payoff`);
    },
  },
  {
    name: 'a transcript with the same 8 s twice: the clip is rejected',
    fn: async () => {
      const block = []; let t = 0;
      for (let i = 0; i < 20; i++) { block.push({ w: VOCAB[i] + (i === 19 ? '.' : ''), s: t, e: t + 0.3 }); t += 0.4; }
      const words = [...block, ...block.map(x => ({ ...x, s: x.s + 8, e: x.e + 8 }))];
      for (let i = 0; i < 60; i++) words.push({ w: VOCAB[(i + 20) % VOCAB.length], s: 16 + i * 0.4, e: 16 + i * 0.4 + 0.3 });
      stub([{ start: 0, end: 16, payoffEnd: 15.8, heading: 'Wait For It', score: 9, why: '', highlight: [], emoji: [] }]);
      let clips = [];
      try { clips = await findMoments(transcript(words), { count: 1, minLen: 12, maxLen: 30, duration: 40 }); } catch { clips = []; }
      assert.equal(clips.filter(c => c.s < 8 && c.e > 8).length, 0, 'no clip spans the repeated stretch');
    },
  },
  {
    name: 'a tight 7 s moment ending on its payoff is kept: lead-in from a sentence start, same ending, 12 s or more',
    fn: async () => {
      const words = []; let t = 0;
      for (let i = 0; i < 250; i++) { const w = VOCAB[i % VOCAB.length] + (i % 9 === 8 ? '.' : ''); words.push({ w, s: t, e: t + 0.3 }); t += 0.4; }
      stub([{ start: 44.2, end: 51.2, payoffEnd: 51.2, heading: 'I Shouted His Secret', score: 8, why: 'fast payoff', highlight: [], emoji: [] }]);
      const clips = await findMoments(transcript(words), { count: 1, minLen: 15, maxLen: 30, duration: 100 });
      assert.equal(clips.length, 1, 'the moment is kept');
      const c = clips[0], first = words.find(w => w.s >= c.s);
      const i = words.indexOf(first);
      assert.ok(c.e - c.s >= 12, `lasts ${(c.e - c.s).toFixed(2)} s`);
      assert.ok(c.e <= 51.2 + 1.5 && c.e >= 51.0, `ends at ${c.e.toFixed(2)} s, on the payoff`);
      assert.ok(i === 0 || /[.!?]$/.test(words[i - 1].w), `starts on a sentence start ("${first.w}" at ${first.s.toFixed(1)} s)`);
    },
  },
];
