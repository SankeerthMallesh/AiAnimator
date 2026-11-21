// What the narrator says: numbers, money, units and fractions the way people read them aloud.
// Only the voice hears this; captions keep the written text (mapToWritten times them).

const FRAC = { '1/2': ['a half', 'half'], '1/3': ['a third', 'one third'], '2/3': ['two thirds', 'two thirds'], '1/4': ['a quarter', 'one quarter'], '3/4': ['three quarters', 'three quarters'], '1/8': ['an eighth', 'one eighth'], '3/8': ['three eighths', 'three eighths'], '1/10': ['a tenth', 'one tenth'] };
const UFRAC = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅒': '1/10' };
const ORD = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth', 16: 'sixteenth', 32: 'thirty-second', 64: 'sixty-fourth', 100: 'hundredth' };
function fracWords(a, b, mixed) {
  const f = FRAC[`${a}/${b}`];
  if (f) return mixed ? f[0] : f[1];
  const o = ORD[+b];
  return o ? `${a} ${o}${+a === 1 ? '' : 's'}` : `${a} over ${b}`;
}
const isFrac = (a, b) => +a > 0 && +a < +b && !!(FRAC[`${a}/${b}`] || ORD[+b]);

// [written, plural, singular]
const UNITS = [
  ['km/h', 'kilometers per hour', 'kilometer per hour'], ['kph', 'kilometers per hour', 'kilometer per hour'], ['mph', 'miles per hour', 'mile per hour'],
  ['km²', 'square kilometers', 'square kilometer'], ['m²', 'square meters', 'square meter'], ['km', 'kilometers', 'kilometer'], ['cm', 'centimeters', 'centimeter'],
  ['mm', 'millimeters', 'millimeter'], ['m', 'meters', 'meter'], ['mi', 'miles', 'mile'], ['ft', 'feet', 'foot'], ['yd', 'yards', 'yard'], ['in.', 'inches', 'inch'],
  ['kg', 'kilograms', 'kilogram'], ['mg', 'milligrams', 'milligram'], ['g', 'grams', 'gram'], ['lbs', 'pounds', 'pound'], ['lb', 'pounds', 'pound'], ['oz', 'ounces', 'ounce'],
  ['mL', 'milliliters', 'milliliter'], ['ml', 'milliliters', 'milliliter'], ['L', 'liters', 'liter'], ['l', 'liters', 'liter'], ['gal', 'gallons', 'gallon'],
  ['hrs', 'hours', 'hour'], ['hr', 'hours', 'hour'], ['mins', 'minutes', 'minute'], ['min', 'minutes', 'minute'], ['sec', 'seconds', 'second'], ['ms', 'milliseconds', 'millisecond'],
  ['°F', 'degrees Fahrenheit', 'degree Fahrenheit'], ['°C', 'degrees Celsius', 'degree Celsius'], ['°', 'degrees', 'degree'], ['%', 'percent', 'percent'],
  ['kWh', 'kilowatt hours', 'kilowatt hour'], ['kW', 'kilowatts', 'kilowatt'], ['W', 'watts', 'watt'], ['V', 'volts', 'volt'], ['GB', 'gigabytes', 'gigabyte'], ['MB', 'megabytes', 'megabyte'],
];
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// "in." only as inches with its full stop; "in" alone is the word.
const UNIT_ALT = UNITS.map(u => esc(u[0])).join('|');
const UNIT_RE = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s?(${UNIT_ALT})(?![\\w²])`, 'g');
// Words that follow a unit used as a describing word ("a 5 ft wall", "a 10 km run").
const NOT_NOUN = /^(tall|long|wide|high|deep|away|thick|heavy|old|across|per|of|and|or|in|on|at|to|from|by|with|for|is|was|are|were|the|a|an|than|more|less)$/i;
// A fraction of a unit ("3/16 inch" -> "3 sixteenths of an inch").
const UNIT_WORDS = 'inch|inches|foot|feet|mile|miles|meter|meters|yard|yards|cup|cups|teaspoon|teaspoons|tablespoon|tablespoons|pound|pounds|ounce|ounces|second|seconds|minute|minutes|hour|hours|mile|gallon|gallons|liter|liters|pint|pints|acre|acres';
const SINGULAR = { inches: 'inch', feet: 'foot', miles: 'mile', meters: 'meter', yards: 'yard', cups: 'cup', teaspoons: 'teaspoon', tablespoons: 'tablespoon', pounds: 'pound', ounces: 'ounce', seconds: 'second', minutes: 'minute', hours: 'hour', gallons: 'gallon', liters: 'liter', pints: 'pint', acres: 'acre' };
const article = (w) => (/^[aeiou]/i.test(w) || /^hour/i.test(w) ? 'an' : 'a');

export function sayNumbers(text) {
  let t = String(text || '');
  // Signs and feet-and-inches first: "−40°F" -> "minus 40°F", "5′10″" -> "5 foot 10".
  t = t.replace(/(^|[\s(])[−–-](?=\d)/g, '$1minus ');
  t = t.replace(/\b(\d{1,2})\s?[′'](\d{1,2})\s?(?:[″"]|'')?(?![\w'])/g, '$1 foot $2');
  t = t.replace(/\b(\d{1,2})\s?′(?!\d)/g, (_, n) => `${n} ${n === '1' ? 'foot' : 'feet'}`);
  // Money: "$3.99" -> "3 dollars and 99 cents"; "$1.5 billion" -> "1.5 billion dollars"; "$20" -> "20 dollars".
  t = t.replace(/\$\s?(\d[\d,]*)\.(\d{2})\b(?!\s?(?:thousand|million|billion|trillion|[kKmMbB]\b))/g, (_, d, c) => {
    const cents = String(+c);
    const dollars = d === '0' ? '' : `${d} ${d === '1' ? 'dollar' : 'dollars'}`;
    return +c ? `${dollars ? `${dollars} and ` : ''}${cents} ${cents === '1' ? 'cent' : 'cents'}` : dollars || '0 dollars';
  });
  t = t.replace(/\$\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:thousand|million|billion|trillion|[kKmMbB]\b))?/g, (_, n, big) => {
    const scale = (big || '').trim(); const word = { k: 'thousand', K: 'thousand', m: 'million', M: 'million', b: 'billion', B: 'billion' }[scale] || scale;
    return `${n}${word ? ` ${word}` : ''} ${n === '1' && !word ? 'dollar' : 'dollars'}`;
  });
  // A unit used as a describing word after "a"/"an": "a 5 ft wall" -> "a 5-foot wall".
  t = t.replace(new RegExp(`\\b(a|an|A|An)\\s+(\\d[\\d,]*(?:\\.\\d+)?)\\s?(${UNIT_ALT})\\s+([A-Za-z]+)`, 'g'), (m, art, n, u, next) => {
    const unit = UNITS.find(x => x[0] === u);
    if (!unit || NOT_NOUN.test(next) || ['%', '°', '°F', '°C'].includes(u)) return m;
    return `${art} ${n}-${unit[2]} ${next}`;
  });
  // Unicode fractions become plain ones; then a lone "1/2 cup" -> "half a cup".
  t = t.replace(/(\d)\s?([½⅓⅔¼¾⅛⅜⅒])/g, (_, n, f) => `${n} ${UFRAC[f]}`).replace(/[½⅓⅔¼¾⅛⅜⅒]/g, (f) => UFRAC[f]);
  // Mixed numbers: "1 1/2" -> "1 and a half" (with "in." after it read as inches).
  t = t.replace(/\b(\d+)\s+(\d{1,2})\/(\d{1,3})\b(\s?in\.)?/g, (m, n, a, b, inch) => (isFrac(a, b) ? `${n} and ${fracWords(a, b, true)}${inch ? ' inches' : ''}` : m));
  // A fraction of a unit: "3/16 inch" -> "3 sixteenths of an inch", "3/4 cup" -> "three quarters of a cup".
  t = t.replace(new RegExp(`(^|[^\\d/])(\\d{1,2})\\/(\\d{1,3})\\s+(${UNIT_WORDS})\\b`, 'g'), (m, pre, a, b, u) => {
    if (!isFrac(a, b)) return m;
    const unit = SINGULAR[u] || u;
    if (`${a}/${b}` === '1/2') return `${pre}half ${article(unit)} ${unit}`;
    return `${pre}${fracWords(a, b, true)} of ${article(unit)} ${unit}`;
  });
  t = t.replace(/(^|[^\d/])1\/2\s+(?!of\b|and\b|or\b|to\b)([A-Za-z]+)/g, (m, pre, w) => `${pre}half ${article(w)} ${w}`);
  // A lone fraction, but not a date (2/29, 9/11) or 24/7.
  t = t.replace(/(^|[^\d/])(\d{1,2})\/(\d{1,3})(?![\d/])/g, (m, pre, a, b) => (isFrac(a, b) && !(+b > 12 && !FRAC[`${a}/${b}`]) && !(/^(9\/11|24\/7)$/.test(`${a}/${b}`)) ? `${pre}${fracWords(a, b, false)}` : m));
  // Units on plain numbers: "5 ft" -> "5 feet", "2 in." -> "2 inches".
  t = t.replace(UNIT_RE, (_, n, u) => { const unit = UNITS.find(x => x[0] === u); return `${n} ${n === '1' ? unit[2] : unit[1]}`; });
  t = t.replace(/\b(\d+)\.5\b(?!\d)/g, '$1 and a half');
  t = t.replace(/\b(\d+)x\b/g, '$1 times');
  t = t.replace(/~\s?(?=\d)/g, 'about ').replace(/≈\s?/g, 'about ').replace(/(\d)\s?[x×]\s?(\d)/g, '$1 by $2');
  return t;
}

export function speakable(text) {
  return sayNumbers(text)
    .replace(/\bB\.C\.(?=\s|$)/g, 'B.C.')
    .replace(/\bvs\.?\b/gi, 'versus')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Captions show the written words; the narrator said the spoken ones. Given the spoken words with
// times ([{ w, s, e }], from the speech recogniser), time each written word: words that are the same
// in both are matched in order (longest common subsequence); written words between two matches
// ("1/2" for "and a half") share the time of the spoken words between them, by length.
export function mapToWritten(written, spoken) {
  const W = String(written || '').replace(/\s*[—–]\s*/g, ' ').split(/\s+/).filter(Boolean);
  const S = (spoken || []).filter(x => x && x.w != null);
  const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const a = W.map(norm), b = S.map(x => norm(x.w));
  const n = a.length, m = b.length;
  if (!n) return [];
  if (!m) return W.map(w => ({ w, s: 0, e: 0 }));
  // LCS table.
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] && a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const out = new Array(n);
  for (const [i, j] of pairs) out[i] = { w: W[i], s: S[j].s, e: S[j].e };
  // Fill the unmatched runs between anchors.
  const anchors = [[-1, -1], ...pairs, [n, m]];
  for (let k = 0; k < anchors.length - 1; k++) {
    const [i0, j0] = anchors[k], [i1, j1] = anchors[k + 1];
    if (i1 - i0 <= 1) continue;
    const runW = W.slice(i0 + 1, i1);
    const t0 = j1 - j0 > 1 ? S[j0 + 1].s : (j0 >= 0 ? S[j0].e : S[0].s);
    const t1 = j1 - j0 > 1 ? S[j1 - 1].e : (j1 < m ? S[j1].s : S[m - 1].e);
    const total = runW.reduce((x, w) => x + Math.max(1, norm(w).length), 0);
    let t = t0;
    runW.forEach((w, q) => {
      const d = (Math.max(0, t1 - t0) * Math.max(1, norm(w).length)) / total;
      out[i0 + 1 + q] = { w, s: t, e: t + d };
      t += d;
    });
  }
  return out;
}
