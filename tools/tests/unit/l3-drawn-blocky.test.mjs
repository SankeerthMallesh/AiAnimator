// L3: the Blocky tab's "drawn in code" look: its own style (the Blocky story direction plus the shot
// words), the default on ?style=blocky, plain narration, and the Blocky caption rule (3-4 words, one
// key word, never across two lines).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { writerPrompt, normalizeScript, plainLine } from '../../../explainer/js/llm.js';
import { STYLES } from '../../../explainer/js/presets.js';
import { captionsBlocky, captions3d } from '../../../explainer/js/z3d/captions.js';

const scene = (start, text, keywords = []) => ({ start, keywords, words: text.split(' ').map((w, k) => ({ text: w, start: k * 0.35, end: k * 0.35 + 0.3 })) });
const scenes = [scene(0, 'The day Kai built the biggest fort on our street, I knew trouble was coming.', ['fort']), scene(6, 'Kai froze.'), scene(8, 'Then everyone on the street started helping us.')];

export const tests = [
  { name: 'drawn-blocky is a drawn blocky look with the Blocky story direction', fn: () => {
    const st = STYLES['drawn-blocky'];
    assert.equal(st.drawn, 'blocky');
    for (const w of ['"In this town,"', 'cliffhanger', 'twist', 'Never say "blocky"', '"frame"', '"act"']) assert.ok(st.direction.includes(w), w);
  } },
  { name: 'the Blocky tab (?style=blocky) opens on drawn-blocky', fn: () => {
    const app = readFileSync(new URL('../../../explainer/js/app.js', import.meta.url), 'utf8');
    assert.match(app, /if \(q === 'blocky'\) return 'drawn-blocky';/);
  } },
  { name: 'the writer asks drawn-blocky for the shot words', fn: () => {
    const p = writerPrompt('snow fort war', { style: 'drawn-blocky', duration: 60, pace: 'normal', format: '9:16' });
    for (const w of ['"set"', '"frame"', '"who"', '"act"']) assert.ok(p.includes(w), w);
    const s = normalizeScript({ scenes: [{ narration: 'I saw it.', set: 'night', frame: 'react', act: 'flinch', who: ['Me'] }] }, { style: 'drawn-blocky', topic: 't' });
    assert.deepEqual([s.scenes[0].set, s.scenes[0].frame, s.scenes[0].act], ['night', 'react', 'flinch']);
  } },
  { name: 'drawn-blocky narration never names the look', fn: () => {
    assert.equal(plainLine('My blocky house fell over.', 'drawn-blocky'), 'My house fell over.');
  } },
  { name: 'blocky captions are 3-4 words except a short line, never across two lines', fn: () => {
    const caps = captionsBlocky(scenes);
    for (const [, text] of caps) { const n = text.split(' ').length; assert.ok(n <= 4, text); }
    assert.ok(caps.some(c => c[1].replace(/\*/g, '') === 'Kai froze'), JSON.stringify(caps));
    assert.ok(caps.filter(c => c[1].split(' ').length < 3).every(c => c[1].replace(/\*/g, '') === 'Kai froze'), JSON.stringify(caps));
  } },
  { name: 'each blocky caption has one key word, the scene keyword when the group has it', fn: () => {
    const caps = captionsBlocky(scenes);
    for (const [, text] of caps) assert.equal((text.match(/\*[^*]+\*/g) || []).length, 1, text);
    assert.ok(caps.some(c => c[1].includes('*fort*')), JSON.stringify(caps));
  } },
  { name: 'captions run in order and never overlap', fn: () => {
    for (const caps of [captionsBlocky(scenes), captions3d(scenes)]) for (let i = 0; i + 1 < caps.length; i++) { assert.ok(caps[i][0] < caps[i][2]); assert.ok(caps[i][2] <= caps[i + 1][0] + 1e-9, JSON.stringify([caps[i], caps[i + 1]])); }
  } },
  { name: '3D captions are 1-3 words without end punctuation', fn: () => {
    for (const [, text] of captions3d(scenes)) { assert.ok(text.split(' ').length <= 3, text); assert.ok(!/[.,!?]$/.test(text), text); }
  } },
];
