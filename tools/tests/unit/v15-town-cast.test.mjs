// 1.5: the 3D town's characters on every Cartoons set: looks, faces and poses map to the town drawing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outfitFor, exprFor, optsFor } from '../../../cartoon/js/toonrig.js';

export const tests = [
  { name: 'a character keeps its colour, headwear and hair; a lab coat is white, officers wear navy caps', fn: () => {
    const a = outfitFor({ color: '#F2C230', hat: 'hair', hair: 'blonde', costume: 'jumpsuit' }, 0);
    assert.equal(a.jacket, '#F2C230'); assert.equal(a.hat, 'hair'); assert.equal(a.hair, '#d8a845');
    assert.equal(outfitFor({ hat: 'officer' }).cap, '#2e3f73');
    assert.equal(outfitFor({ costume: 'labcoat', color: '#123456' }).jacket, '#f2f4f7');
    assert.equal(outfitFor({ hat: 'fedora' }).hat, 'tophat');
    assert.notEqual(outfitFor({}, 0).skin, outfitFor({}, 3).skin, 'skin tones vary');
  } },
  { name: 'faces follow the feeling, the pose and the voice', fn: () => {
    assert.equal(exprFor({ feel: 'shocked' }), 'shock');
    assert.equal(exprFor({ feel: 'nervous' }), 'nervous');
    assert.equal(exprFor({ feel: 'neutral', talk: 0.8 }), 'relief_open');
    assert.equal(exprFor({ feel: 'neutral', talk: 0 }), 'smile');
    assert.equal(exprFor({ pose: 'laugh', feel: 'sad' }), 'laugh');
  } },
  { name: 'poses: walking strolls, sitting sits, pointing and holding reach out, showing and cheering raise the arm', fn: () => {
    assert.equal(optsFor({ pose: 'walk', poseT: 0.4 }).mode, 'stroll');
    assert.equal(optsFor({ pose: 'sit' }).mode, 'sit');
    assert.deepEqual(optsFor({ pose: 'point' }).prop, ['reach', 0.42]);
    assert.equal(optsFor({ pose: 'idle', hold: 'cup' }).prop[0], 'reach');
    assert.equal(optsFor({ pose: 'hold', use: { act: 'show', p: 0.2 } }).wave, 1);
    assert.equal(optsFor({ pose: 'cheer' }).wave, 1);
  } },
  { name: 'the stage draws the town people unless the setting asks for the classic cast', fn: () => {
    const st = readFileSync(new URL('../../../cartoon/js/stage.js', import.meta.url), 'utf8');
    assert.match(st, /view\.settings\?\.toonCast === false \? Cast\.draw : drawToon/);
    const t2 = readFileSync(new URL('../../../cartoon/js/c3d/toon2d.js', import.meta.url), 'utf8');
    assert.ok(!/from\s*["']three["']/.test(t2), 'the drawing module does not load three.js');
  } },
];
