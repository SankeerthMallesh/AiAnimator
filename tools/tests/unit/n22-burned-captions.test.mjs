// N22: captions already burned into the source are found (bright text in 3 or more of 8 sampled
// frames), and Loomy's own captions move to the other band.
import assert from 'node:assert/strict';
import { textRuns, captionBand } from '../../../clip/js/burned.js';
import { ClipPainter, H } from '../../../clip/js/render.js';

const w = 320, h = 568;
// A frame of mid-grey picture with, optionally, one line of white text with a black outline at
// rows y0-y1 (shares of the height), letters seeded by `seed` so each frame's words differ.
function frame({ text = null, seed = 1, bg = 120 } = {}) {
  const L = new Uint8ClampedArray(w * h).fill(bg);
  if (!text) return L;
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const [y0, y1] = [Math.round(text[0] * h), Math.round(text[1] * h)];
  const x0 = Math.round(w * 0.25), x1 = Math.round(w * 0.75);
  for (let x = x0; x < x1;) {
    if (rnd() < 0.12) { x += 5; continue; } // a word space
    const stroke = 2 + Math.floor(rnd() * 3);
    for (let y = y0; y <= y1; y++) {
      L[y * w + x] = 10; // outline
      for (let k = 1; k <= stroke && x + k < x1; k++) L[y * w + x + k] = 245; // white fill
      if (x + stroke + 1 < x1) L[y * w + x + stroke + 1] = 10;
    }
    x += stroke + 2 + Math.floor(rnd() * 3);
  }
  return L;
}
const band = (frames) => captionBand(frames.map(L => textRuns(L, w, h)));
const bars = () => { const L = new Uint8ClampedArray(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) L[y * w + x] = [235, 210, 170, 145, 105, 80, 40][Math.floor(x / w * 7)]; return L; };

export const tests = [
  { name: 'changing white-on-black text at 80-84% in 6 of 8 frames is found at that band', fn: () => {
    const b = band(Array.from({ length: 8 }, (_, i) => frame(i < 6 ? { text: [0.80, 0.84], seed: i + 1 } : {})));
    assert.ok(b.found, JSON.stringify(b)); assert.equal(b.frames, 6);
    assert.ok(Math.abs(b.y0 - 0.80) < 0.01 && Math.abs(b.y1 - 0.84) < 0.01, `${b.y0}-${b.y1}`);
  } },
  { name: 'text in only 2 of 8 frames is not called burned-in captions', fn: () => {
    const b = band(Array.from({ length: 8 }, (_, i) => frame(i < 2 ? { text: [0.80, 0.84], seed: i + 1 } : {})));
    assert.equal(b.found, false); assert.equal(b.frames, 2);
  } },
  { name: 'the same text in all 8 frames (a logo, a drawing) is not captions', fn: () => {
    const b = band(Array.from({ length: 8 }, () => frame({ text: [0.80, 0.84], seed: 7 })));
    assert.equal(b.found, false); assert.equal(b.frames, 8);
  } },
  { name: 'colour bars and a plain picture find nothing', fn: () => {
    assert.equal(band(Array.from({ length: 8 }, () => bars())).frames, 0);
    assert.equal(band(Array.from({ length: 8 }, () => frame())).frames, 0);
  } },
  { name: 'burned captions under Loomy\'s caption line move Loomy\'s captions to the upper band', fn: () => {
    const L = { kind: 'crop', headY: 210, capY: Math.round(H * 0.66), ax: 0, ay: 0, vw: 1280, vh: 720, fw: 1280 };
    const out = ClipPainter.prototype.avoidBurned.call({ opts: { burned: { found: true, y0: 0.63, y1: 0.70 } } }, { ...L }, 720);
    assert.equal(out.capFrom, Math.round(H * 0.66));
    assert.ok(out.capY <= H * 0.30 && out.capY + 70 < out.burned[0], `caption at ${out.capY}, burned from ${out.burned[0]}`);
    assert.equal(out.emojiDy, 300);
  } },
  { name: 'burned captions away from Loomy\'s caption line leave it where it is; captions off moves nothing', fn: () => {
    const L = { kind: 'crop', headY: 210, capY: Math.round(H * 0.66), ax: 0, ay: 0, vw: 1280, vh: 720, fw: 1280 };
    const far = ClipPainter.prototype.avoidBurned.call({ opts: { burned: { found: true, y0: 0.83, y1: 0.89 } } }, { ...L }, 720);
    assert.equal(far.capFrom, undefined); assert.equal(far.capY, Math.round(H * 0.66));
    const off = ClipPainter.prototype.avoidBurned.call({ opts: { captions: false, burned: { found: true, y0: 0.63, y1: 0.70 } } }, { ...L }, 720);
    assert.equal(off.capFrom, undefined);
  } },
];
