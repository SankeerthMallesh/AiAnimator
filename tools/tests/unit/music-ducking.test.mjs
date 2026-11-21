// MUSIC: the music never lifts between two lines said back to back.
import assert from 'node:assert/strict';
const mods = await Promise.all(['../../../explainer/js/audio.js', '../../../cartoon/js/audio.js'].map(p => import(p).catch(e => ({ err: e }))));
const scene = (start, w0, w1) => ({ start, voiceOffset: 0, voice: {}, words: [{ start: w0, end: w0 + 0.3 }, { start: w1 - 0.3, end: w1 }] });
export const tests = mods.flatMap((m, i) => m.err ? [{ name: `${i ? 'cartoon' : 'explainer'} audio.js loads in node`, fn: () => { throw m.err; } }] : [
  { name: `${i ? 'cartoon' : 'explainer'}: scenes 0.2 s apart make one speech span (no lift between them)`, fn: () => {
    const spans = m.speechSpans({ scenes: [scene(0, 0.1, 4.4), scene(4.6, 0.05, 3.9), scene(8.6, 0.1, 4.2)] });
    assert.deepEqual(spans.length, 1, JSON.stringify(spans));
  } },
  { name: `${i ? 'cartoon' : 'explainer'}: a 1.5 s pause between lines keeps its lift`, fn: () => {
    const spans = m.speechSpans({ scenes: [scene(0, 0.1, 3.0), scene(4.6, 0.1, 3.9)] });
    assert.equal(spans.length, 2, JSON.stringify(spans));
  } },
]);
