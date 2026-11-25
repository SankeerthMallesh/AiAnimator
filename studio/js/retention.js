// The Shorts retention check: measures a script before production, line by line, with every rule written out.
// It points at sections that are likely to lose attention and says what to change. It does not predict views.
import { words, content } from './util.js';
import { scoreHook } from './story.js';
import { TURN_RE } from '../../shared/turns.js';

const WPS = 2.6;
const MYSTERY = /\?|\b(secret|nobody|no one|never|until|but|strange|weird|impossible|mystery|why|how|rule|forbidden|vanish\w*|disappear\w*|missing|hidden|the reason|turns out)\b/i;
const EXPO = /\b(was born|in the year|is a|was a|known as|located in|consists of|refers to|is defined|is called|historians|according to|it is important)\b/i;
const ACTION = /\b(ran|grabbed|opened|slammed|screamed|fell|exploded|found|broke|jumped|pushed|pulled|stole|hid|turned|looked|saw|heard|shook|burst|crashed|vanished|knocked|walked|sneaked|snuck|climbed|dug|pressed|fired|caught)\b/i;
const MORAL = /\b(the lesson|remember,|always remember|moral|we should all|never forget|so next time|in the end,)\b/i;
const OPENERS = (l) => words(l).slice(0, 2).join(' ').toLowerCase();

/** lines: the narration in order (the hook first). Returns { score, checks: [{name, score, detail, fix}], flags: [{line, why, fix}] } */
export function analyze(lines) {
  lines = lines.map((l) => String(l).trim()).filter(Boolean);
  const checks = [], flags = [];
  if (!lines.length) return { score: 0, checks, flags, seconds: 0 };
  const secs = lines.map((l) => words(l).length / WPS);
  const total = secs.reduce((a, b) => a + b, 0);
  const at = (i) => secs.slice(0, i).reduce((a, b) => a + b, 0);
  const body = lines.slice(1).join(' ');

  // 1. the first sentence
  const h = scoreHook(lines[0], body);
  checks.push({ name: 'First sentence', score: Math.round(h.total / 2.5), detail: h.rows.map(([n, s, why]) => `${n} ${s}/5: ${why}`).join(' · '), fix: h.total < 17 ? 'Make line 1 a question, a forbidden rule or the most surprising fact, in 14 words or fewer, with a concrete detail.' : '' });

  // 2. time before the main mystery
  const mi = lines.findIndex((l) => MYSTERY.test(l));
  const mt = mi < 0 ? total : at(mi);
  checks.push({ name: 'Time to the mystery', score: mi < 0 ? 0 : mt <= 1 ? 10 : mt <= 3 ? 8 : mt <= 6 ? 5 : 2, detail: mi < 0 ? 'No open question, secret or contrast anywhere.' : `The first open question arrives at ${mt.toFixed(1)} s (line ${mi + 1}).`, fix: mt > 3 ? 'Move the strange rule, the question or the contradiction into the first 3 seconds.' : '' });

  // 3. exposition
  const expo = lines.map((l, i) => (EXPO.test(l) && !ACTION.test(l)) || (words(l).length > 26 && !ACTION.test(l)) ? i : -1).filter((i) => i >= 0);
  expo.forEach((i) => flags.push({ line: i + 1, why: words(lines[i]).length > 26 ? `${words(lines[i]).length} words of explanation with nothing happening` : 'background explanation with nothing happening', fix: 'Show it as an action, or cut it to the one detail the story needs.' }));
  checks.push({ name: 'Exposition', score: Math.max(0, 10 - expo.length * 3), detail: expo.length ? `${expo.length} line(s) explain instead of show: ${expo.map((i) => i + 1).join(', ')}.` : 'Every line moves the story.', fix: expo.length ? 'Turn background facts into something a character does or sees.' : '' });

  // 4. repetition
  const grams = new Map();
  lines.forEach((l, i) => { const w = content(l); for (let k = 0; k + 2 < w.length; k++) { const g = w.slice(k, k + 3).join(' '); grams.set(g, [...(grams.get(g) || []), i]); } });
  const reps = [...grams].filter(([, ix]) => new Set(ix).size > 1);
  const op = new Map(); lines.forEach((l, i) => op.set(OPENERS(l), [...(op.get(OPENERS(l)) || []), i]));
  const sameOpen = [...op].filter(([k, ix]) => k && ix.length >= 3);
  reps.forEach(([g, ix]) => flags.push({ line: ix[1] + 1, why: `repeats "${g}" from line ${ix[0] + 1}`, fix: 'Say it once, or use the second time as a deliberate callback.' }));
  sameOpen.forEach(([k, ix]) => flags.push({ line: ix[2] + 1, why: `${ix.length} lines start with "${k}"`, fix: 'Vary how sentences start.' }));
  checks.push({ name: 'Repetition', score: Math.max(0, 10 - reps.length * 2 - sameOpen.length * 2), detail: reps.length || sameOpen.length ? `${reps.length} repeated phrase(s), ${sameOpen.length} repeated opener(s).` : 'No repeated phrases.', fix: reps.length || sameOpen.length ? 'Cut or rephrase the repeats flagged below.' : '' });

  // 5. pacing
  const slow = secs.map((s, i) => (s > 6.5 ? i : -1)).filter((i) => i >= 0);
  slow.forEach((i) => flags.push({ line: i + 1, why: `${secs[i].toFixed(1)} s on one line`, fix: 'Split it in two: one shot for each idea.' }));
  const lenOK = total >= 40 && total <= 95;
  checks.push({ name: 'Pacing', score: Math.max(0, (lenOK ? 10 : 6) - slow.length * 2), detail: `About ${Math.round(total)} s read aloud; ${slow.length} line(s) longer than 6.5 s.`, fix: !lenOK ? (total < 40 ? 'It is short for a story Short: add one more escalation before the twist.' : 'It is long: cut the weakest middle beat to stay under 90 s.') : slow.length ? 'Split the long lines.' : '' });

  // 6. clarity
  const avg = words(lines.join(' ')).length / lines.length;
  const names = new Set((lines.join(' ').match(/\b[A-Z][a-z]{2,}\b/g) || []).filter((n, i, a) => a.indexOf(n) !== i));
  checks.push({ name: 'Story clarity', score: Math.max(0, 10 - (avg > 18 ? 3 : 0) - (names.size > 4 ? 3 : 0)), detail: `${avg.toFixed(1)} words a line; ${names.size} recurring names.`, fix: avg > 18 ? 'Shorter sentences: one idea each.' : names.size > 4 ? 'Too many names to follow in under a minute: keep two or three.' : '' });

  // 7. the twist
  const ti = lines.findIndex((l, i) => i >= lines.length * 0.45 && (TURN_RE.test(l) || /\b(but|actually|the truth|really|all along|never was|wasn'?t|it was)\b/i.test(l)));
  checks.push({ name: 'Plot twist', score: ti < 0 ? 2 : ti >= lines.length * 0.6 ? 10 : 7, detail: ti < 0 ? 'No turn or reveal in the second half.' : `A turn at line ${ti + 1} (${Math.round(at(ti))} s).`, fix: ti < 0 ? 'Add a reveal in the last third that changes what the opening meant.' : '' });

  // 8. the ending
  const last = lines[lines.length - 1];
  const callback = content(last).some((w) => content(lines[0]).includes(w));
  const endScore = MORAL.test(last) ? 3 : (words(last).length <= 12 ? 6 : 4) + (callback ? 3 : 0) + (/[!.]$/.test(last) ? 1 : 0);
  if (MORAL.test(last)) flags.push({ line: lines.length, why: 'ends on a moral', fix: 'End on the consequence or one last twist instead.' });
  checks.push({ name: 'Ending', score: Math.min(10, endScore), detail: `${words(last).length} words${callback ? '; calls back to the hook' : ''}${MORAL.test(last) ? '; a moral' : ''}.`, fix: endScore < 7 ? 'A short last line that pays off the hook (echo a word from line 1).' : '' });

  const score = Math.round(checks.reduce((a, c) => a + c.score, 0) / checks.length * 10);
  return { score, checks, flags: flags.sort((a, b) => a.line - b.line), seconds: total };
}
export const RETENTION_NOTE = 'A structure check: it measures the script against common Shorts writing rules (hook, early mystery, no exposition, no repeats, steady pace, a twist, a strong ending). It cannot predict views.';
