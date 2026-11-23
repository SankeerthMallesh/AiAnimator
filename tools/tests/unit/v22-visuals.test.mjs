// 2.2: lines that explain something cut to a diagram, battles show armies, scripts turn ("You see,"), the first two
// seconds hook the eye, and the voices sound like people (natural library voices with built-in stand-ins).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainKind, planExplains, explainAt } from '../../../shared/explain.js';
import { addTurns, TURN_RE } from '../../../shared/turns.js';
import { mapFor, actFor, MAPS } from '../../../cartoon/js/maps.js';
import { onRequest } from '../../../functions/api/[[path]].js';

const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const realFetch = globalThis.fetch;
const call = (path, body) => onRequest({
  request: new Request(`https://loomy.test/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  env: { ELEVEN_KEY: 'e' }, params: { path: [path] },
});

export const tests = [
  { name: 'a line that explains something gets the right diagram', fn: () => {
    const cases = [['Some lakes can explode because carbon dioxide builds up underwater.', 'lake'], ['At the Battle of Bunker Hill the redcoats charged.', 'battle'],
      ['Hydrogen and oxygen react to make water.', 'reaction'], ['The pressure kept building until it burst.', 'pressure'], ['The moon orbits the Earth.', 'space'],
      ['Sales jumped 80 percent in a year.', 'chart'], ['He walked into the room.', '']];
    for (const [line, k] of cases) assert.equal(explainKind(line), k, line);
  } },
  { name: 'cutaways sit inside their scene, skip the hook and never run back to back with the same diagram', fn: () => {
    const scenes = ['Lakes can explode.', 'The lake hides carbon dioxide underwater.', 'The gas bubbles stay under the water.', 'Then pressure bursts out.', 'Everyone ran.']
      .map((narration, i) => ({ start: i * 3, dur: 3, narration }));
    const ex = planExplains(scenes);
    assert.ok(ex.length >= 2, JSON.stringify(ex));
    assert.ok(!ex.some(e => e.start < 3), 'not on the hook');
    for (const e of ex) { const s = scenes.find(x => e.start >= x.start && e.end <= x.start + x.dur + 1e-9); assert.ok(s, 'inside a scene'); }
    for (let i = 1; i < ex.length; i++) assert.ok(!(ex[i].kind === ex[i - 1].kind && ex[i].start - ex[i - 1].start < 4), 'not the same diagram twice in a row');
    assert.equal(explainAt(ex, ex[0].start + 0.1), ex[0]);
    assert.equal(ex.find(e => e.kind === 'lake')?.label, 'CARBON DIOXIDE');
  } },
  { name: 'all three tabs draw the cutaways and the first-two-seconds hook under their captions', fn: () => {
    for (const f of ['cartoon/js/town.js', 'explainer/js/renderer.js', 'explainer/js/drawn.js']) {
      const js = read(f); assert.match(js, /drawExplain\(/, f); assert.match(js, /hookFx\(/, f);
    }
    assert.match(read('explainer/js/z3d/film.js'), /under\?\.\(g, t\)/);
  } },
  { name: 'turning points: a script without one gets "You see," (or the like) in the middle, never the hook or the end', fn: () => {
    const lines = ['Some lakes can explode.', 'In 1986 Lake Nyos went quiet.', 'The lake was full of gas.', 'One night it burst out.', 'It killed everyone nearby.', 'Nobody saw it coming.'];
    const out = addTurns(lines, 1);
    const turned = out.map(l => TURN_RE.test(l));
    assert.equal(turned.filter(Boolean).length, 1);
    assert.ok(!turned[0] && !turned[turned.length - 1]);
    assert.deepEqual(addTurns(['You see, it works.', 'B.', 'C.', 'D.'], 0), ['You see, it works.', 'B.', 'C.', 'D.'], 'a script that turns already is left alone');
    assert.match(read('cartoon/js/script.js'), /TURNING POINTS/); assert.match(read('explainer/js/llm.js'), /turning-point phrases/);
  } },
  { name: 'battles: an old battle plays on the battlefield with armies aiming muskets; the world wars stay in the trench', fn: () => {
    assert.ok(MAPS.includes('battlefield'));
    assert.equal(mapFor({ narration: 'At the Battle of Bunker Hill the colonists waited.' }), 'battlefield');
    assert.equal(mapFor({ narration: 'In World War 1 the soldiers lived in a trench.' }), 'trench');
    assert.equal(actFor({ narration: 'Then they opened fire.' }), 'aim');
    assert.match(read('tools/c3d-src/src/sets.ts'), /\n  battlefield\(g, r\)/);
    assert.match(read('tools/c3d-src/src/tmpl.ts'), /s\.place === "battlefield"/);
    assert.match(read('tools/c3d-src/src/toon.ts'), /export const drawHorse/);
    assert.match(read('explainer/js/z3d/autoblocky.js'), /function blockyBattle/);
  } },
  { name: 'voices: natural by default at a normal pace, and a library voice the key cannot use falls back to its built-in stand-in', fn: async () => {
    const sent = [];
    globalThis.fetch = async (url, o = {}) => {
      sent.push({ url: String(url), body: JSON.parse(o.body || '{}') });
      if (/1qz7q3ZW54FIyiWDvo33/.test(url)) return Response.json({ detail: { status: 'voice_not_found' } }, { status: 404 });
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
    };
    try {
      const r = await call('speak', { text: 'It never came back!', eleven: 'edgar' });
      assert.equal(r.status, 200);
      assert.match(sent[0].url, /1qz7q3ZW54FIyiWDvo33/); assert.match(sent[1].url, /JBFqnCBsd6RMkjVDRZzb/, 'Edgar falls back to George');
      assert.equal(sent[1].body.voice_settings.stability, 0.5); assert.equal(sent[1].body.voice_settings.speed, 1.0);
      assert.equal(sent[1].body.text, 'It never came back!', 'natural reads the line as written');
    } finally { globalThis.fetch = realFetch; }
  } },
];
