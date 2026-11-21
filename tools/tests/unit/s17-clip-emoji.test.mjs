// S17: Clips emoji are off by default and never picture a word said around them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mirrorsWord } from '../../../clip/js/moments.js';
const words = [{ w: 'I', s: 5 }, { w: 'think', s: 5.3 }, { w: 'you', s: 5.6 }, { w: 'need', s: 9 }, { w: 'fire', s: 9.4 }];
export const tests = [
  { name: 'emoji checkbox is off by default', fn: () => assert.match(readFileSync(new URL('../../../clip/index.html', import.meta.url), 'utf8'), /<input type="checkbox" id="optEmoji">/) },
  { name: '🤔 next to "think" and 🔥 next to "fire" are dropped', fn: () => { assert.ok(mirrorsWord('🤔', 5.5, words)); assert.ok(mirrorsWord('🔥', 9.2, words)); } },
  { name: 'a reaction emoji away from any matching word stays', fn: () => { assert.ok(!mirrorsWord('💀', 9.2, words)); assert.ok(!mirrorsWord('🔥', 2.0, words)); } },
];
