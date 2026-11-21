// S14: Blocky pictures ask for a sharp game screenshot, never toy bricks or minifigures.
import assert from 'node:assert/strict';
import { STYLES } from '../../../explainer/js/presets.js';
const NEED = ['video game screenshot', 'sharp focus everywhere', 'no depth of field', 'hard daylight', 'flat shading', 'no studs', 'not toy bricks', 'no logos'];
export const tests = [
  { name: 'character prompt has every required phrase', fn: () => { const p = `${STYLES.blocky.lead} ${STYLES.blocky.prompt}`.toLowerCase(); for (const n of [...NEED, 'square block hands', 'not a minifigure']) assert.ok(p.includes(n), n); } },
  { name: 'place prompt (composited hero) has the look phrases', fn: () => { const p = `${STYLES.blocky.lead} ${STYLES.blocky.placePrompt}`.toLowerCase(); for (const n of NEED) assert.ok(p.includes(n), n); } },
  { name: 'no "plastic", "toy-like" or "baseplate"', fn: () => { const p = `${STYLES.blocky.hint} ${STYLES.blocky.lead} ${STYLES.blocky.prompt} ${STYLES.blocky.placePrompt}`.toLowerCase(); for (const w of ['plastic', 'toy-like', 'baseplate']) assert.ok(!p.includes(w), w); } },
];
