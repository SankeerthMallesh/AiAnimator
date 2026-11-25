// The story generator: a genre, an idea and the cast in; a 45-90 second narrated story out, with three different
// hooks scored on a transparent rubric (the rules are below and shown on the page; they are not a view forecast).
import { askJSON } from './ai.js';
import { words, content } from './util.js';
import { addTurns, TURN_RE } from '../../shared/turns.js';
import { ENGINES } from './engines.js';

// ---------- the hook rubric (0-5 each, 25 in all) ----------
const CURIOUS = /\b(why|how|what|who|secret|nobody|no one|never|until|except|the reason|turns out|mystery|strange|weird|impossible|forbidden|disappear\w*|vanish\w*|hidden|rule)\b|\?/i;
const EMOTION = /\b(died|dead|death|kill\w*|terrif\w*|scared|afraid|alone|trapped|lost|cried|tears|love|hate|money|million|fired|arrested|prison|forbidden|danger\w*|scream\w*|panic\w*|last|never again|cursed|missing|betray\w*|laugh\w*)\b/i;
const CLICHE = /\b(you won'?t believe|imagine|did you know|in a world|what if i told you|have you ever wondered|let me tell you|once upon a time|this is the story of|today we|in this video)\b/i;
const CONTRAST = /\b(but|yet|until|except|instead|actually|only)\b/i;
/** scores one hook against the story; every point comes with its reason */
export function scoreHook(hook, story = '') {
  const w = words(hook), n = w.length, text = String(hook);
  const out = [];
  let c = 1 + (CURIOUS.test(text) ? 2 : 0) + (CONTRAST.test(text) ? 1 : 0) + (/\d/.test(text) ? 1 : 0);
  out.push(['Immediate curiosity', Math.min(5, c), [CURIOUS.test(text) ? 'opens a question or a secret' : 'no open question yet', CONTRAST.test(text) ? 'has a contrast word (but/until/only)' : '', /\d/.test(text) ? 'a specific number' : ''].filter(Boolean).join('; ')]);
  const long = w.filter((x) => x.replace(/[^a-z]/gi, '').length > 9).length;
  const cl = Math.max(0, (n <= 14 ? 5 : n <= 20 ? 3 : 1) - (long > 2 ? 1 : 0));
  out.push(['Clarity', cl, `${n} words${n > 14 ? ' (14 or fewer reads in one breath)' : ''}${long > 2 ? '; several long words' : ''}`]);
  const concrete = (text.match(/\b[A-Z][a-z]+\b/g) || []).length + (/\d/.test(text) ? 1 : 0);
  const o = Math.max(0, Math.min(5, 3 + Math.min(2, concrete) - (CLICHE.test(text) ? 3 : 0)));
  out.push(['Originality', o, CLICHE.test(text) ? 'uses a stock opener ("did you know", "imagine"...)' : concrete ? 'concrete names, places or numbers' : 'no stock phrases, but nothing specific yet']);
  const e = Math.min(5, 1 + (EMOTION.test(text) ? 3 : 0) + (/[!?]/.test(text) ? 1 : 0));
  out.push(['Emotional interest', e, EMOTION.test(text) ? 'real stakes or a strong feeling' : 'no stakes word (danger, loss, fear, money...)']);
  const hk = new Set(content(text)), body = new Set(content(story));
  const shared = [...hk].filter((x) => body.has(x));
  const conn = body.size ? Math.min(5, shared.length * 2) : 3;
  out.push(['Connection to the story', conn, shared.length ? `shares "${shared.slice(0, 3).join('", "')}" with the story` : 'shares no key words with the story']);
  return { rows: out, total: out.reduce((s, r) => s + r[1], 0) };
}
export const HOOK_RUBRIC = 'Each hook gets 0-5 points for: curiosity (an open question, a contrast, a number), clarity (14 words or fewer, plain words), originality (no stock openers, concrete details), emotional interest (stakes or a strong feeling) and connection (shares key words with the story). It measures how a hook is built, not how a video will perform.';

/** generates a story with the project's engine; cast = character profiles from the library (Town engine) */
export async function writeStory({ engine = 'stick', genre, idea, seconds, cast = [] }) {
  const E = ENGINES[engine] || ENGINES.stick, g = E.genres[genre] || Object.values(E.genres)[0];
  seconds = seconds || E.seconds;
  const wordsTarget = Math.round(seconds * 2.5);
  const people = !E.usesCast && !cast.length ? 'No recurring cartoon characters: anonymous 3D figures, objects and places carry the explanation.'
    : cast.length ? `Use these recurring characters (keep their names, looks and personalities):\n${cast.map((c) => `- ${c.name}: ${c.personality || ''} (${c.outfit || ''})`).join('\n')}` : 'Invent one or two named characters.';
  const user = `${engine === 'cinema' ? 'Topic area' : 'Genre'}: ${g}.
${engine === 'cinema' ? 'Subject' : 'Idea'}: ${idea || 'come up with a fresh one'}.
Length: about ${wordsTarget} spoken words (${seconds} seconds).
${people}
Return JSON: {"title": short title (max 7 words), "logline": one sentence, "hooks": [three DIFFERENT opening lines, max 14 words each: 1) ${E.hookKinds[0]}, 2) ${E.hookKinds[1]}, 3) ${E.hookKinds[2]}], "lines": [the narration AFTER the hook, one or two sentences per item, 10-16 items], "twist": ${engine === 'cinema' ? 'the most surprising reveal in one sentence' : 'the twist in one sentence'}, "ending": why the ending satisfies in one sentence, "sfx": [5-8 sound effect ideas with the line number they belong to, like "line 4: door creaks"]${engine === 'cinema' ? ', "facts": [each factual claim in the script, so it can be checked]' : ''}}`;
  const r = await askJSON(E.system, user, { temperature: engine === 'cinema' ? 0.7 : 0.95 });
  const lines = (Array.isArray(r.lines) ? r.lines : []).map((l) => String(l).trim()).filter(Boolean);
  const hooks = (Array.isArray(r.hooks) ? r.hooks : []).map((h) => String(h).trim()).filter(Boolean).slice(0, 3);
  if (lines.length < 4 || !hooks.length) throw new Error('The story came back too short. Try again or add more to your idea.');
  return finishStory({ title: String(r.title || idea || g).slice(0, 80), logline: String(r.logline || ''), hooks, lines, twist: String(r.twist || ''), ending: String(r.ending || ''), sfx: (r.sfx || []).map(String).slice(0, 10), facts: (r.facts || []).map(String).slice(0, 20), genre, engine });
}
/** adds hook scores and a turning point where the story has none */
export function finishStory(s) {
  const body = s.lines.join(' ');
  const turned = addTurns(['(hook)', ...s.lines], 3).slice(1);
  return { ...s, lines: turned, hooks: s.hooks.map((text) => ({ text, ...scoreHook(text, body) })), pick: 0, hasTurn: turned.some((l) => TURN_RE.test(l)) };
}
/** the full narration: the chosen hook then the lines */
export const narration = (story) => (story ? [story.hooks[story.pick || 0]?.text, ...story.lines].filter(Boolean) : []);

/** three fresh hooks for an existing story */
export async function moreHooks(story) {
  const E = ENGINES[story.engine] || ENGINES.stick;
  const r = await askJSON(E.system, `Story:\n${story.lines.join(' ')}\nWrite three NEW, different opening lines (max 14 words each): 1) ${E.hookKinds[0]}, 2) ${E.hookKinds[1]}, 3) ${E.hookKinds[2]}. JSON: {"hooks": [..3]}`, { temperature: 1 });
  const body = story.lines.join(' ');
  return (r.hooks || []).map(String).slice(0, 3).map((text) => ({ text, ...scoreHook(text, body) }));
}
