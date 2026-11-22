// L4: the film sound's score and every cue build a valid audio graph (run against a stand-in for Web
// Audio that checks each node is used the way the real one would accept), and every source stops.
import assert from 'node:assert/strict';
import { renderCues, CUE_KINDS, filmScore, scoreSections, cueSheet } from '../../../shared/filmsound.js';
import { planShots } from '../../../explainer/js/z3d/plan.js';

function fakeAudio() {
  const made = { started: 0, stopped: 0 };
  const param = (v = 0) => ({ value: v, setValueAtTime() { return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime(x) { assert.ok(x > 0, 'exponential ramp to 0'); return this; }, setTargetAtTime() { return this; } });
  const node = (extra = {}) => ({ connect(n) { assert.ok(n && typeof n === 'object', 'connect to nothing'); return n; }, disconnect() {}, ...extra });
  const src = (extra) => node({ start() { made.started++; }, stop() { made.stopped++; }, ...extra });
  const ctx = {
    sampleRate: 48000, destination: node(), made,
    createGain: () => node({ gain: param(1) }),
    createOscillator: () => src({ type: 'sine', frequency: param(440), detune: param(0) }),
    createBufferSource: () => src({ buffer: null, loop: false, playbackRate: param(1) }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350), Q: param(1), gain: param(0) }),
    createStereoPanner: () => node({ pan: param(0) }),
    createConvolver: () => node({ buffer: null }),
    createDynamicsCompressor: () => node({ threshold: param(), ratio: param(), knee: param(), attack: param(), release: param() }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len), length: len, numberOfChannels: ch }),
    startRendering: async () => ({ ok: true }),
  };
  return ctx;
}

export const tests = [
  { name: 'every cue kind renders, and every source it starts also stops', fn: () => {
    const ctx = fakeAudio();
    renderCues(ctx, ctx.destination, CUE_KINDS.map((kind, i) => ({ t: i * 0.5, kind, gain: 0.8, dur: 1.2 })));
    assert.ok(ctx.made.started > CUE_KINDS.length);
    assert.equal(ctx.made.stopped, ctx.made.started);
  } },
  { name: 'the score for a whole plan renders, and every source stops', async fn() {
    const ctx = fakeAudio();
    globalThis.OfflineAudioContext = function () { return ctx; };
    try {
      const sc = (start, o) => ({ start, dur: 3, words: [], ...o });
      const specs = planShots([sc(0, { frame: 'wide' }), sc(3, { frame: 'talk' }), sc(6, { frame: 'react', camera: 'impact' }), sc(9, { frame: 'talk' }), sc(12, { frame: 'group' })], new Map());
      await filmScore(15, { sections: scoreSections(specs, 15), seed: 2 });
      renderCues(ctx, ctx.destination, cueSheet(specs, 15));
      assert.ok(ctx.made.started > 50, `${ctx.made.started} sources`);
      assert.equal(ctx.made.stopped, ctx.made.started);
    } finally { delete globalThis.OfflineAudioContext; }
  } },
];
