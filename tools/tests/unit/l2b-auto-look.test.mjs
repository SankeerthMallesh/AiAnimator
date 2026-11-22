// The 3D tab's Auto look: people stories get 3D people drawn in code; things, places, history,
// science and the inside of the body get the AI-picture look (the drawn look cannot show them).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickLook, STYLES, AUTO_STYLE } from '../../../explainer/js/presets.js';

const PICTURES = ['How Roman concrete has lasted 2,000 years', 'Roman concrete secret', 'What could actually move a Cybertruck?',
  'How ancient Greeks proved the Earth was round 2,000 years before satellites', 'Why octopuses are the closest thing to aliens on Earth',
  'What happens to your body if you swallow a magnet', 'What actually happens to your body when you hold your breath', 'What would happen if you fell into a black hole'];
const DRAWN = ['What would happen if you fell through the ice', 'The day my best friend lied to me', 'A kid finds a secret door in his school',
  'My neighbour kept stealing my packages, so I set a trap', 'What would happen if you jumped into ice water'];

export const tests = [
  { name: 'topics about things, places, history, science and the body get AI pictures', fn: () => { for (const t of PICTURES) assert.equal(pickLook(t), 'story-3d', t); } },
  { name: 'stories about people get 3D people drawn in code', fn: () => { for (const t of DRAWN) assert.equal(pickLook(t), 'drawn-3d', t); } },
  { name: 'both picks are real looks; Auto is not one (it is resolved before the writer sees it)', fn: () => {
    assert.ok(STYLES['drawn-3d'] && STYLES['story-3d']); assert.equal(STYLES[AUTO_STYLE], undefined);
  } },
  { name: 'the 3D tab opens on Auto; the Blocky tab keeps the drawn blocky world', fn: () => {
    const app = readFileSync(new URL('../../../explainer/js/app.js', import.meta.url), 'utf8');
    assert.match(app, /return STYLES\[q\] \? q : AUTO_STYLE;/);
    assert.match(app, /if \(q === 'blocky'\) return 'drawn-blocky';/);
    assert.match(app, /if \(!STYLES\[options\.style\]\) \{/);
  } },
  { name: 'a person out in the world ("if you fall into ice water") gets 3D people even when the topic names the body (A1, from the live test)', fn: () => {
    for (const t of ['What happens to your body if you fall into ice water', 'What would happen if you got lost at sea', 'What happens if you jumped into a frozen lake']) assert.equal(pickLook(t), 'drawn-3d', t);
    for (const t of ['What happens to your body if you swallow a magnet', 'What would happen if you fell into a black hole']) assert.equal(pickLook(t), 'story-3d', t);
  } },
  { name: 'how a machine or an object works gets the 3D render look, with no invented hero (A2, from the speed-bump video)', fn: () => {
    for (const t of ['How a speed bump works', 'How does a fridge work', 'How speed bumps slow cars down']) assert.equal(pickLook(t), 'cgi-short', t);
    for (const t of ['A boy who saves his town', 'What happens to your body if you fall into ice water']) assert.equal(pickLook(t), 'drawn-3d', t);
  } },
];
