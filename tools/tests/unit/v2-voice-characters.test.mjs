// Big upgrade: narrator characters (pace, delivery lean, sound).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTERS, characterOf, characterDelivery, characterFx, characterLine } from '../../../shared/voicechars.js';
import { DELIVERIES } from '../../../shared/voicefx.js';
import { VOICES } from '../../../cartoon/js/presets.js';

const sr = 24000;
const tone = (f, n = sr) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin(2 * Math.PI * f * i / sr));
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);

export const tests = [
  { name: 'eight characters, each a real Kokoro voice, a sane pace and known deliveries', fn: () => {
    assert.ok(Object.keys(CHARACTERS).length >= 8);
    const ids = VOICES.map(v => v[0]);
    for (const [k, c] of Object.entries(CHARACTERS)) {
      assert.ok(ids.includes(c.voice), `${k}: ${c.voice}`);
      assert.ok(c.speed >= 0.85 && c.speed <= 1.15, k);
      for (const d of Object.values(c.lean)) assert.ok(DELIVERIES.includes(d), `${k}: ${d}`);
    }
  } },
  { name: 'a character leans the writer\'s delivery; no character leaves it alone', fn: () => {
    assert.equal(characterDelivery('neutral', CHARACTERS.hype), 'excited');
    assert.equal(characterDelivery('', CHARACTERS.secret), 'mysterious');
    assert.equal(characterDelivery('sad', CHARACTERS.hype), 'sad');
    assert.equal(characterDelivery('tense', null), 'tense');
    assert.equal(characterOf('nobody'), null);
  } },
  { name: 'the old-radio sound cuts the lows and highs, keeps length and loudness', fn: () => {
    for (const f of [100, 8000]) {
      const x = tone(f), y = characterFx(x, sr, 'radio');
      assert.equal(y.length, x.length);
      const mid = characterFx(tone(1000), sr, 'radio');
      assert.ok(rms(y.subarray(2000)) < 0.6 * rms(mid.subarray(2000)), `${f} Hz should be quieter than 1 kHz through the radio`);
    }
  } },
  { name: 'every sound keeps the peak level; no sound leaves the line untouched', fn: () => {
    const x = tone(440);
    for (const fx of ['warm', 'bright', 'deep', 'whisper', 'radio']) {
      const y = characterFx(x, sr, fx), pk = Math.max(...y.map(Math.abs));
      assert.ok(Math.abs(pk - 0.5) < 0.02, `${fx}: ${pk}`);
      assert.ok(y.every(Number.isFinite), fx);
    }
    assert.equal(characterFx(x, sr, null), x);
    assert.equal(characterLine({ samples: x, sampleRate: sr }, CHARACTERS.deadpan).samples, x);
  } },
  { name: 'both pipelines use the character for pace, delivery and sound', fn: () => {
    for (const p of ['../../../cartoon/js/pipeline.js', '../../../explainer/js/pipeline.js']) {
      const js = readFileSync(new URL(p, import.meta.url), 'utf8');
      assert.match(js, /this\.pace\.voice \* \(ch\?\.speed \|\| 1\), characterDelivery\(scene\.delivery, ch\)/);
      assert.match(js, /characterLine\(finishLine/);
      assert.match(js, /\|\$\{this\.s\.character \|\| ''\}`/);
    }
  } },
];
