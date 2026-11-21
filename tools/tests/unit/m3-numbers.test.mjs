// M3: numbers are read naturally. Exact outputs from the owner's spec.
import assert from 'node:assert/strict';
import * as cartoon from '../../../cartoon/js/tts.js';
import * as explainer from '../../../explainer/js/tts.js';
const CASES = [
  ['Add 1 1/2 cups', 'Add 1 and a half cups'],
  ['about 3/4 of it', 'about three quarters of it'],
  ['3/16 inch', '3 sixteenths of an inch'],
  ['$1.5 billion', '1 and a half billion dollars'],
  ['$3.99', '3 dollars and 99 cents'],
  ['$20', '20 dollars'],
  ['a 5 ft wall', 'a 5-foot wall'],
  ['it is 5 ft tall', 'it is 5 feet tall'],
  ['a 10 km run', 'a 10-kilometer run'],
  ['½ cup', 'half a cup'],
  ['2 1/4 in.', '2 and a quarter inches'],
  ['3 in a row', '3 in a row'],
  ['−40°F', 'minus 40 degrees Fahrenheit'],
  ['5′10″', '5 foot 10'],
  ['3.5%', '3 and a half percent'],
  ['on 9/11', 'on 9/11'],
  ['in 1999', 'in 1999'],
];
export const tests = [];
for (const [mod, name] of [[cartoon, 'cartoon'], [explainer, 'explainer']]) {
  for (const [input, want] of CASES) tests.push({ name: `${name} sayNumbers(${JSON.stringify(input)})`, fn: () => assert.equal(mod.sayNumbers(input), want) });
  tests.push({
    name: `${name} captions keep the written words, timed from the spoken ones ("1 1/2")`,
    fn: () => {
      assert.equal(typeof mod.mapToWritten, 'function', 'mapToWritten(written, spokenWords) is exported');
      const written = 'Add 1 1/2 cups of flour to the bowl.';
      const spokenText = mod.sayNumbers(written);
      let t = 0.1;
      const spoken = spokenText.split(/\s+/).map(w => { const x = { w, s: t, e: t + 0.25 }; t += 0.3; return x; });
      const out = mod.mapToWritten(written, spoken);
      assert.deepEqual(out.map(x => x.w), written.split(/\s+/), 'one caption word per written word, in order');
      for (let i = 0; i < out.length; i++) {
        assert.ok(out[i].e >= out[i].s, `word ${i} ends after it starts`);
        if (i) {
          assert.ok(out[i].s >= out[i - 1].s, `word ${i} starts after word ${i - 1}`);
          assert.ok(out[i].s - out[i - 1].e <= 0.3, `gap before word ${i} is ${(out[i].s - out[i - 1].e).toFixed(2)} s`);
        }
      }
    },
  });
}
