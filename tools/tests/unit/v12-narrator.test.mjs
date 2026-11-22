// 1.2 style: the narrator talks to the viewer ("If you...") and keeps loops open, in every tab.
import assert from 'node:assert/strict';
import { Script } from '../../../cartoon/js/script.js';
import { writerPrompt } from '../../../explainer/js/llm.js';

const check = (p) => {
  assert.match(p, /NARRATOR VOICE/);
  assert.match(p, /"If you flushed a toilet in space/);
  assert.match(p, /keep a loop open/);
  assert.match(p, /Never open with "Have you ever wondered"/);
  assert.ok(!p.includes('\\"'), 'quotes reach the writer unescaped');
};

export const tests = [
  { name: 'Cartoons writer: you-hook, open loops, short lines', fn: () => {
    const p = Script.prompt('Why astronauts cannot flush in space', { duration: 45, pace: 'normal' });
    check(p);
    assert.match(p, /a "you" line that drops the viewer into it/);
  } },
  { name: '3D and Blocky writer: the same narrator voice next to the hook stack', fn: () => {
    const p = writerPrompt('Why astronauts cannot flush in space', { duration: 45, style: 'auto', pace: 'normal' });
    check(p); assert.match(p, /HOOK STACK/);
  } },
];
