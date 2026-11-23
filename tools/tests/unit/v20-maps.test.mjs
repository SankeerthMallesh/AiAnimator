// 2.0: every line plays in a map that matches it, the lead acts the line out, and the cast is dressed for the story.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS, guessMap, mapFor, actFor, outfitLook, storyOutfits, mapSeed } from '../../../cartoon/js/maps.js';
import { townShots, townLooks } from '../../../cartoon/js/town.js';

const src = readFileSync(new URL('../../../tools/c3d-src/src/sets.ts', import.meta.url), 'utf8');
export const tests = [
  { name: 'the page and the engine know the same maps', fn: () => {
    for (const m of MAPS) assert.match(src, new RegExp(`\\n  ${m}\\(g, r\\)`), m);
    assert.ok(MAPS.length >= 26);
  } },
  { name: 'a line about a place plays in that place', fn: () => {
    const cases = [['He was locked in a tiny prison cell.', 'cell'], ['The guards searched every cell at night.', 'cellblock'], ['They cracked the vault at midnight.', 'vault'],
      ['Mission control started the countdown.', 'control'], ['Flushing a toilet on the space station is a nightmare.', 'spacetoilet'], ['The judge banged the gavel.', 'courtroom'],
      ['Doctors rushed him to the hospital.', 'hospital'], ['The miners dug deeper underground.', 'tunnel'], ['The soldiers waited in the trench.', 'trench']];
    for (const [line, map] of cases) assert.equal(guessMap(line), map, line);
    assert.equal(guessMap('Flush the toilet.'), '', 'a toilet on Earth is not a space toilet');
  } },
  { name: "the writer's map wins; the town is kept for street scenes; the topic fills a line that names no place", fn: () => {
    assert.equal(mapFor({ map: 'vault', narration: 'He smiled.' }), 'vault');
    assert.equal(mapFor({ map: 'street', narration: 'In the prison...' }), '');
    assert.equal(mapFor({ narration: 'Nobody noticed a thing.' }, 'The prisoner who tunneled into a bank'), 'cell');
  } },
  { name: 'the lead acts out the line', fn: () => {
    for (const [line, a] of [['Every night he dug with a spoon.', 'dig'], ['The guard fell asleep.', 'sleep'], ['He stole all the cash.', 'carry'], ['She hacked the computer.', 'type'], ['They ate lunch together.', 'eat'], ['Nobody noticed.', '']]) assert.equal(actFor({ narration: line }), a, line);
    assert.equal(actFor({ do: 'phone', narration: 'He dug.' }), 'phone');
  } },
  { name: 'outfits and accessories reach the drawing; a prison story dresses inmates and a guard', fn: () => {
    const o = outfitLook({ outfit: 'prison', acc: ['cigar', 'chain', 'nonsense'], color: '#123456', hair: 'black' });
    assert.equal(o.suit, 'prison'); assert.equal(o.jacket, '#f08a2c'); assert.deepEqual(o.acc, ['cigar', 'chain']);
    assert.equal(outfitLook({ outfit: 'guard' }).hat, 'cap'); assert.ok(outfitLook({ outfit: 'guard' }).acc.includes('badge'));
    assert.equal(outfitLook({ hat: 'headset' }).acc[0], 'headset');
    const d = storyOutfits('The prisoner who tunneled into a bank', 3);
    assert.deepEqual(d.map(x => x.outfit), ['prison', 'guard', 'prison']);
    assert.equal(townLooks([{ outfit: 'astro', acc: ['headset'] }])[0].suit, 'astro');
  } },
  { name: 'town shots go to the maps with the action and one seed per video', fn: () => {
    const scenes = [{ start: 0, dur: 3, narration: 'He was locked in a prison cell.', who: [{ id: 'a' }], set: 'room' }, { start: 3, dur: 3, narration: 'Every night he dug with a spoon.', who: [{ id: 'a' }], set: 'room' },
      { start: 6, dur: 3, narration: 'Then he cracked the bank vault.', who: [{ id: 'a' }], set: 'city' }];
    const { shots } = townShots({ scenes, total: 9 }, { title: 'The Tunnel', cast: [{ id: 'a' }] });
    assert.ok(shots.some(s => s.place === 'cell'));
    assert.ok(shots.some(s => s.place === 'vault'));
    assert.ok(shots.some(s => s.act === 'dig'));
    assert.ok(shots.every(s => s.mapSeed === mapSeed({ title: 'The Tunnel' })));
  } },
];
