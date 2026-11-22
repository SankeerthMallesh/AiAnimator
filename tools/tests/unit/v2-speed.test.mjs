// Big upgrade: faster video making (Speed: Fast / Balanced / Best).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_SETTINGS as C } from '../../../cartoon/js/storage.js';
import { DEFAULT_SETTINGS as E } from '../../../explainer/js/storage.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
export const tests = [
  { name: 'new videos default to Balanced: 1080p at 30 fps (Cartoons was 60 fps, twice the frames)', fn: () => {
    for (const s of [C, E]) { assert.equal(s.speed, 'balanced'); assert.equal(s.fps, 30); assert.equal(s.quality, '1080'); }
  } },
  { name: 'the voice waits for the fact-check 0 s on Fast, 12 s on Balanced, 45 s on Best', fn: () => {
    for (const p of ['../../../cartoon/js/pipeline.js', '../../../explainer/js/pipeline.js']) {
      const js = read(p);
      assert.match(js, /const FACT_WAIT = \{ fast: 0, balanced: 12000, best: 45000 \};/);
      assert.match(js, /FACT_WAIT\[this\.s\.speed\] \?\? FACT_WAIT\.balanced/);
    }
  } },
  { name: 'the Speed choice sets size, frame rate and effects in both tabs', fn: () => {
    for (const [h, a] of [['../../../cartoon/index.html', '../../../cartoon/js/app.js'], ['../../../explainer/index.html', '../../../explainer/js/app.js']]) {
      assert.match(read(h), /<select id="speed">/);
      assert.match(read(a), /fast: \['720', 30\], balanced: \['1080', 30\], best: \['1080', 60\]/);
    }
  } },
];
