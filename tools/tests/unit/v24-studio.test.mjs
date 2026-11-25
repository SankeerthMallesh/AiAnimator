// Loomy Studio: three separate engines, the hook rubric, script-to-action, scenes, retention, subtitles,
// analytics from real data only, the production package, and the hand-over to the real renderers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENGINES } from '../../../studio/js/engines.js';
import { scoreHook } from '../../../studio/js/story.js';
import { segment, localPlan, fixRepeats, promptsFor, sheet } from '../../../studio/js/scenes.js';
import { decompose } from '../../../studio/js/actions.js';
import { check } from '../../../studio/js/qc.js';
import { analyze } from '../../../studio/js/retention.js';
import { cuesFromVoice, cuesFromScenes, toSRT, toVTT, toASS } from '../../../studio/js/subs.js';
import { parseCSV, learn, hookStyle } from '../../../studio/js/analytics.js';
import { elevenScript } from '../../../studio/js/voice.js';
import { Script } from '../../../cartoon/js/script.js';

const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
export const tests = [
  { name: 'three independent engines, each with its own writer, places, shots, style and renderer', fn: () => {
    assert.deepEqual(Object.keys(ENGINES), ['stick', 'blocky', 'cinema']);
    const E = Object.values(ENGINES);
    assert.equal(new Set(E.map((e) => e.system)).size, 3); assert.equal(new Set(E.map((e) => e.style)).size, 3); assert.equal(new Set(E.map((e) => e.renderTab)).size, 3);
    assert.deepEqual(E.map((e) => e.renderTab), ['cartoon', 'blocky', '3d']);
    for (const e of E) { assert.deepEqual(e.lengths, [30, 45, 60, 90]); assert.ok(e.shots.length >= 6 && e.moves.length >= 6 && e.editing.length >= 5); }
    assert.ok(!/stickman/i.test(ENGINES.blocky.style) && !/stickman/i.test(ENGINES.cinema.style), 'no stickmen outside engine 1');
    assert.ok(!/roblox|zack/i.test(JSON.stringify(ENGINES)), 'no third-party brand names in the product');
  } },
  { name: 'the hook rubric is transparent: five criteria, each with its reason', fn: () => {
    const a = scoreHook('In this town, nobody is allowed outside after midnight.', 'nobody went outside the town after midnight until Mia did');
    const b = scoreHook('Did you know that there are many interesting things in the world today that we can learn about?', 'a story about lakes');
    assert.equal(a.rows.length, 5); assert.ok(a.rows.every((r) => r[2]));
    assert.ok(a.total > b.total, `${a.total} > ${b.total}`);
  } },
  { name: 'script-to-action: every verb becomes anticipation -> action -> reaction steps with all the fields', fn: () => {
    const r = decompose({ narration: 'The miner picked up his newspaper and discovered he was going to become a millionaire.', duration: 4.5 }, 'stick', []);
    assert.equal(r.actor, 'The miner'); assert.deepEqual(r.verbs, ['grab', 'discover']);
    const names = r.steps.map((s) => s.action);
    assert.ok(names.indexOf('reach') < names.indexOf('grip') && names.indexOf('grip') < names.indexOf('lift'));
    for (const k of ['action', 'character', 'startPos', 'endPos', 'body', 'head', 'eyes', 'face', 'arms', 'hands', 'legs', 'object', 'duration', 'start', 'end', 'camera', 'transition']) assert.ok(k in r.steps[0], k);
    assert.ok(Math.abs(r.steps[r.steps.length - 1].end - 4.5) < 0.05, 'the steps fill the scene');
    assert.ok(r.steps.some((s) => /newspaper/.test(s.object) && /bend/.test(s.object)), 'the newspaper bends in the grip');
    const d = decompose({ narration: 'He grabbed his pickaxe and started breaking the rock.', duration: 4 }, 'stick', [], 'The miner');
    assert.ok(d.steps.some((s) => s.action === 'swing' && /dust/.test(s.object)), 'the rock throws dust on impact');
    const door = decompose({ narration: 'The youngest boy opened the forbidden basement door.', duration: 4 }, 'blocky', []);
    assert.equal(door.actor, 'The youngest boy'); assert.deepEqual(door.steps.map((s) => s.action), ['approach', 'reach', 'grip and turn', 'push/pull', 'look in']);
  } },
  { name: 'scenes keep the exact narration, never repeat a shot back to back, and prompts carry the locked character sheet', fn: () => {
    const segs = segment(['In 1872 Abe worked a dusty mine.', 'He picked up the newspaper. Then he froze!']);
    assert.ok(segs.join(' ').includes('He picked up the newspaper.'));
    const abe = { name: 'Abe', face: 'big white round head', body: 'thin black limbs', outfit: 'worker', colors: { main: '#c8102e' } };
    const sc = localPlan(ENGINES.stick, segs, [abe]).map((s, i) => ({ ...s, id: `s${i}`, duration: 3, shot: 'medium' }));
    fixRepeats(sc, ENGINES.stick);
    for (let i = 1; i < sc.length; i++) assert.notEqual(sc[i].shot, sc[i - 1].shot);
    sc.forEach((s) => promptsFor(s, ENGINES.stick, [abe]));
    assert.ok(sc.every((s) => !s.characters.length || s.imagePrompt.includes(sheet(abe))), 'the same sheet text in every prompt');
  } },
  { name: 'quality control flags static lines, unknown characters and what the renderer cannot animate', fn: () => {
    const p = { scenes: [{ id: 's1', narration: 'It was a quiet year.', description: 'a quiet town', background: 'town', shot: 'wide', move: 'push', movement: '', characters: [] }, { id: 's2', narration: 'Zed drove the truck away.', description: 'Zed drives the truck', background: 'road', shot: 'wide', move: 'pan', movement: 'drives', characters: ['Zed'] }] };
    const r = check(p, [], 'stick', []);
    assert.ok(r.scenes[0].items.some((x) => /stand still/.test(x.msg)));
    assert.ok(r.scenes[1].items.some((x) => x.level === 'error' && /not in this project/.test(x.msg)));
    assert.ok(r.scenes[1].items.some((x) => x.level === 'error' && /cannot animate/.test(x.msg)), 'driving is not animated: said, not hidden');
    assert.ok(r.scenes[1].items.some((x) => /Same shot type/.test(x.msg)));
  } },
  { name: 'retention check points at specific lines', fn: () => {
    const r = analyze(['Lakes are interesting.', 'Lake Nyos is a lake located in Cameroon and it is known as one of the deadliest lakes, according to historians who have studied it.', 'It is a lake.', 'It is a lake.', 'The lesson is to respect nature.']);
    assert.ok(r.flags.some((f) => f.line === 2)); assert.ok(r.flags.some((f) => /moral/.test(f.why)));
    assert.ok(r.score < 60);
  } },
  { name: 'subtitles: real word timings, 2-4 words, SRT/VTT/ASS with styles and karaoke', fn: () => {
    const cues = cuesFromVoice([[[0, 0.3, 'In'], [0.3, 0.6, 'this'], [0.6, 0.9, 'town,'], [0.9, 1.3, 'nobody'], [1.3, 1.7, 'sleeps.']]]);
    assert.ok(cues.every((c) => c.text.split(' ').length <= 4));
    assert.match(toSRT(cues), /^1\n00:00:00,000 --> /);
    assert.match(toVTT(cues), /^WEBVTT/);
    const ass = toASS(cues, { karaoke: true, style: { font: 'Inter', size: 100, color: '#ffffff', hlColor: '#ff0000', pos: 60 } });
    assert.match(ass, /Style: LoomyK,Inter,100,&H000000FF/); assert.match(ass, /\{\\k\d+\}/); assert.match(ass, /,768,1\n/);
    assert.ok(cuesFromScenes([{ narration: 'one two three four five', duration: 2 }]).length >= 2);
  } },
  { name: 'analytics: only real numbers (a YouTube Studio CSV), patterns with sample sizes, no guesses', fn: () => {
    const csv = 'Content,Video title,Views,Average percentage viewed (%),Duration\nTotal,,100,,\na,In this town nobody sleeps,9000,80,58\nb,Why lakes explode?,2000,60,40\nc,In this town keys glow,8000,78,59\nd,How ENIAC worked?,1500,55,41\n';
    const rows = parseCSV(csv);
    assert.equal(rows.length, 4); assert.equal(rows[0].views, 9000);
    assert.equal(hookStyle('In this town, x'), 'town law'); assert.equal(hookStyle('Why?'), 'question');
    const l = learn(rows, 'views');
    assert.ok(l.enough && l.recs.some((r) => /town law/.test(r) && /2 videos/.test(r)), l.recs.join(' | '));
    assert.equal(learn(rows.slice(0, 2), 'views').enough, false);
    assert.throws(() => parseCSV('a,b\n1,2'), /Video title/);
  } },
  { name: 'ElevenLabs narration: delivery tags and pauses before the turn', fn: () => {
    const t = elevenScript(['Some lakes explode.', "But here's the thing: nobody saw it."]);
    assert.match(t, /^\[warm\] Some lakes/); assert.match(t, /\[\w+\] \.\.\. But here's the thing/);
  } },
  { name: 'hand-over: the approved script (and the stickman cast) reaches the real renderer in "Use my script" mode', fn: () => {
    const s = Script.fromText('The miner picked up his newspaper. He ran to the bank. Investors opened the cart. They counted the gold.', { topic: 'Salted mine', studioCast: [{ id: 'a', name: 'Abe', color: '#c8102e', hat: 'hardhat', hair: 'brown', outfit: 'worker', acc: ['headlamp'] }] });
    assert.equal(s.cast[0].name, 'Abe'); assert.equal(s.cast[0].outfit, 'worker'); assert.deepEqual(s.cast[0].acc, ['headlamp']);
    for (const f of ['cartoon/js/app.js', 'explainer/js/app.js']) assert.match(read(f), /loomy\.studio\.handoff/, f);
    assert.match(read('index.html'), /loomy !== 'studio-render'/); assert.match(read('index.html'), /studio:  \{ src: 'studio\/'/);
    assert.match(read('studio/js/app.js'), /Nothing starts until you press its make button/);
  } },
];
