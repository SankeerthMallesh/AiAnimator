// Loomy 2.2: turning points. A story told out loud turns on little phrases ("You see,", "But here's the thing:")
// that make a listener lean in. The writers are asked for them; if a script comes back without any, one (two in a
// longer video) is worked into the middle of the story, never the hook or the last line.
export const TURNS = ["You see, ", "But here's the thing: ", "Here's the crazy part: ", "And that's when ", "Turns out, ", "But wait, "];
export const TURN_RE = /\b(you see|here'?s the (thing|crazy part|catch|twist|kicker)|turns out|that'?s when|but wait|here'?s why|the crazy part|plot twist|and then,? suddenly)\b/i;
// first words that can follow a turn phrase in lower case (a name or "I" keeps its capital)
const PLAIN = /^(the|he|she|they|it|a|an|this|that|these|those|there|every|in|on|at|when|so|but|and|his|her|their|its|one|no|nobody|everyone|people|after|before|within|instead|now|then|scientists|researchers|soldiers|nothing|all|most|some|only|if|as|we|you|our)\b/i;

/** lines: the narration strings in order. Returns a copy with turn phrases where the story has none. */
export function addTurns(lines = [], seed = 0) {
  const out = lines.map((l) => String(l || ''));
  const n = out.length;
  if (n < 4 || out.some((l) => TURN_RE.test(l))) return out;
  const at = n >= 8 ? [Math.round(n * 0.4), Math.round(n * 0.75)] : [Math.max(1, Math.round(n * 0.5))];
  at.forEach((i, k) => {
    i = Math.min(n - 2, Math.max(1, i));
    const line = out[i].trim();
    if (!line || TURN_RE.test(line)) return;
    const phrase = TURNS[(seed + k * 2 + i) % TURNS.length];
    const body = PLAIN.test(line) ? line[0].toLowerCase() + line.slice(1) : line;
    // "And that's when" reads as one sentence only before a plain clause; others take any line
    out[i] = phrase.endsWith('when ') && !/^(he|she|they|it|the|a|an|we|you|everyone|nobody|people)\b/i.test(body) ? `${TURNS[0]}${body}` : `${phrase}${body}`;
  });
  return out;
}
