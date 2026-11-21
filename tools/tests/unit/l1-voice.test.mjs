// L1: the ElevenLabs v3 voice path: delivery tags, alignment -> words, pause squeeze, polish.
import assert from 'node:assert/strict';
import { voiceText, alignmentWords, squeezePauses, polishVoice, speechEnd, finishLine, DELIVERIES } from '../../../shared/voicefx.js';

export const tests = [{ name: "v3 tags, words, pause squeeze, polish", fn: () => {
  // tags only for v3, only known deliveries, whispering -> whispers
  assert.equal(voiceText('Hi there.', 'tense'), '[tense] Hi there.');
  assert.equal(voiceText('Hi there.', 'whispering'), '[whispers] Hi there.');
  assert.equal(voiceText('Hi there.', 'neutral'), 'Hi there.');
  assert.equal(voiceText('Hi there.', 'yelling at bob'), 'Hi there.');
  assert.equal(voiceText('Hi there.', 'tense', 'eleven_multilingual_v2'), 'Hi there.');
  assert.ok(DELIVERIES.includes('deadpan'));

  // alignment: the tag is dropped, words keep their times
  const text = '[calm] Two words.';
  const chars = [...text];
  const a = { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.1), character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.08) };
  const w = alignmentWords(a);
  assert.deepEqual(w.map(x => x.w), ['Two', 'words.']);
  assert.ok(Math.abs(w[0].s - 0.7) < 1e-9);

  // a 1.2 s pause inside a line is cut to 0.2 s; later words move up by 1.0 s
  const sr = 8000, tone = (d) => Float32Array.from({ length: Math.round(d * sr) }, (_, i) => 0.5 * Math.sin(i / 3));
  const x = new Float32Array(Math.round(3.0 * sr));
  x.set(tone(0.8), 0); x.set(tone(0.8), Math.round(2.0 * sr));
  const words = [{ text: 'one', start: 0.0, end: 0.8 }, { text: 'two', start: 2.0, end: 2.8 }];
  const sq = squeezePauses(x, sr, words);
  assert.ok(Math.abs(sq.samples.length / sr - 2.0) < 0.05, `length ${sq.samples.length / sr}`);
  assert.ok(Math.abs(sq.words[1].start - 1.0) < 0.05, `moved ${sq.words[1].start}`);
  // a short pause is left alone
  const y = new Float32Array(Math.round(2.0 * sr)); y.set(tone(0.8), 0); y.set(tone(0.8), Math.round(1.0 * sr));
  assert.equal(squeezePauses(y, sr, [{ text: 'a', start: 0, end: 0.8 }, { text: 'b', start: 1.0, end: 1.8 }]).samples.length, y.length);

  // polish keeps the length and the peak, and is not silent
  const p = polishVoice(x, sr);
  assert.equal(p.length, x.length);
  const peak = (v) => v.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  assert.ok(Math.abs(peak(p) - peak(x)) < 1e-3);
  assert.ok(speechEnd(x, sr) > 2.7 && speechEnd(x, sr) <= 3.0);

  // finishLine runs once and keeps sentence timings in step
  const f = finishLine({ samples: x, sampleRate: sr, words, sentences: [{ text: 's', start: 2.0, end: 2.8 }] });
  assert.ok(f.finished && Math.abs(f.sentences[0].start - 1.0) < 0.05);
  assert.equal(finishLine(f), f);
} }];
