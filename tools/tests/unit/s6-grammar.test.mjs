// S6: Cartoons lines come back as grammatical sentences, names capitalised.
import assert from 'node:assert/strict';
import { Script, grammarIssues } from '../../../cartoon/js/script.js';
const norm = (lines) => Script.normalize({ title: 'Ice cream day', cast: [{ id: 'a', name: 'Leo' }, { id: 'b', name: 'Maya' }], scenes: lines.map(line => ({ line, say: 'a' })) }, { topic: 'ice cream', format: '9:16' }).scenes.map(s => s.narration);
export const tests = [
  { name: '"leo grab cold cones on sunny street" comes back grammatical with "Leo" capitalised', fn: () => { const [l] = norm(['leo grab cold cones on sunny street']); assert.equal(l, 'Leo grabs cold cones on a sunny street.'); assert.deepEqual(grammarIssues(l, ['Leo', 'Maya']), []); } },
  { name: 'correct lines are left alone', fn: () => { const ls = ['Maya and Leo grab the map.', 'Leo swims in cold water.', 'Why do cones melt so fast?']; assert.deepEqual(norm(ls), ls); for (const l of ls) assert.deepEqual(grammarIssues(l, ['Leo', 'Maya']), [], l); } },
  { name: 'the fact-check prompt asks for grammar rewrites and lists flagged lines', fn: () => { const p = Script.checkPrompt({ title: 'x', cast: [{ name: 'Leo' }], scenes: [{ narration: 'Leo and the cones melt fast cones' }, { narration: 'cones on busy road melt' }] }, 'ice cream'); assert.match(p, /not a complete, grammatical sentence/); assert.match(p, /grammar check flagged: line 1/); } },
];
