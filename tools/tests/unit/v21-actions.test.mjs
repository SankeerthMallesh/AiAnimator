// 2.1: nobody just stands there. The lead's hands do what the line says (hold the key, press the button,
// count the cash...), with no action in the line they are busy with what people do in that place, the second
// person and the people behind are busy too, and all three engines know every action.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTS, ITEMS, actFor, itemFor, busyFor, actBeat } from '../../../cartoon/js/maps.js';
import { townShots } from '../../../cartoon/js/town.js';

const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
export const tests = [
  { name: 'the line picks a hands action and the thing in the hands', fn: () => {
    const cases = [['He grabbed the key from the guard.', 'hold:key'], ['Then he pressed the big red button.', 'press'], ['He counted every dollar.', 'count'],
      ['He signed the letter.', 'write'], ['He studied the manual all night.', 'read'], ['He lifted a heavy crate.', 'lift:box'], ['The alarms went off.', 'panic'],
      ['He ran down the hall.', 'run'], ['He snuck past the guards.', 'walk'], ['He found a map of the sewers.', 'hold:map'], ['She mopped the floor.', 'sweep']];
    for (const [line, a] of cases) assert.equal(actFor({ narration: line }), a, line);
  } },
  { name: "the writer's action wins, and a holding action gets its thing from the line or the place", fn: () => {
    assert.equal(actFor({ do: 'press', narration: 'He dug.' }), 'press');
    assert.equal(actFor({ do: 'hold', narration: 'He had the diamond.' }), 'hold:gem');
    assert.equal(itemFor('nothing special', 'lab'), 'flask');
    assert.equal(itemFor('nothing special', 'nowhere'), 'box');
  } },
  { name: 'with nothing in the line, people do what people do in that place (never just standing)', fn: () => {
    for (const map of ['control', 'office', 'vault', 'cell', 'kitchen', 'farm']) {
      const a = actFor({ narration: 'Nobody noticed.' }, map, 0);
      assert.ok(a && a !== 'stand', map);
      assert.ok(ACTS.includes(a.split(':')[0]), `${map}: ${a}`);
    }
    assert.notEqual(actFor({ narration: 'Nobody noticed.' }, 'control', 0), actFor({ narration: 'Nobody noticed.' }, 'control', 1), 'shots in a place vary');
    assert.notEqual(busyFor('control', 0, 'press'), 'press', 'background people do something else');
  } },
  { name: 'every action has a smooth beat between 0 and 1', fn: () => {
    for (const a of ACTS) for (let t = 0; t < 4; t += 0.37) { const b = actBeat(a, t); assert.ok(b >= 0 && b <= 1, `${a} ${t} ${b}`); }
    // eased: a press goes in and out without jumping more than a small step between frames at 30 fps
    let last = actBeat('press', 0);
    for (let t = 1 / 30; t < 3; t += 1 / 30) { const b = actBeat('press', t); assert.ok(Math.abs(b - last) < 0.3, `press jumps at ${t.toFixed(2)}`); last = b; }
  } },
  { name: 'Cartoons shots: every shot has someone doing something, the second person and the extras too', fn: () => {
    const who = [{ id: 'a' }], two = [{ id: 'a' }, { id: 'b' }];
    const scenes = [{ start: 0, dur: 3, narration: 'He was locked in a prison cell.', who, set: 'room' }, { start: 3, dur: 3, narration: 'Nobody noticed.', who: two, set: 'room', map: 'office' },
      { start: 6, dur: 3, narration: 'Then he pressed the button.', who, set: 'room', map: 'control' }, { start: 9, dur: 3, narration: 'It was quiet.', who, set: 'room', map: 'vault' }];
    const { shots } = townShots({ scenes, total: 12 }, { title: 'The Tunnel', cast: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    for (const s of shots) assert.ok(s.act, `${s.kind} ${s.place} has an action`);
    assert.ok(shots.some(s => s.act === 'press'));
    assert.ok(shots.filter(s => s.kind === 'two').every(s => s.act2), 'the second person is busy');
    assert.ok(shots.filter(s => s.extras.length).every(s => s.extraAct), 'the people behind are busy');
  } },
  { name: 'the three engines draw every hands action', fn: () => {
    const toon = read('tools/c3d-src/src/toon.ts'), blocky = read('explainer/js/z3d/blocky.js'), people = read('explainer/js/z3d/people.js'), auto3d = read('explainer/js/z3d/auto3d.js');
    for (const a of ['hold', 'lift', 'press', 'point', 'write', 'read', 'cheer', 'think', 'shrug', 'panic', 'sweep', 'look', 'salute', 'clap', 'count']) {
      assert.match(toon, new RegExp(`"${a}"`), `Cartoons: ${a}`);
      assert.match(blocky, new RegExp(`case '${a}'`), `Blocky: ${a}`);
      assert.ok(new RegExp(`case '${a}'`).test(auto3d) || new RegExp(`\\b${a}: \\{`).test(people), `3D: ${a}`);
    }
    for (const it of ITEMS.filter(i => i !== 'box')) assert.match(toon, new RegExp(`case "${it}"`), `Cartoons item: ${it}`);
  } },
  { name: 'the writers are told about the new actions and never to leave someone standing', fn: () => {
    assert.match(read('cartoon/js/script.js'), /hit the button: press/);
    assert.match(read('cartoon/js/script.js'), /Never "stand"/);
    assert.match(read('explainer/js/llm.js'), /never "stand"/);
  } },
];
