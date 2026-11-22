// Feedback (big upgrade): how good a video will be, graded A+ to F, in sections that each say what
// to change. Works on the script alone (before the video is made) and gets sharper once the timeline
// exists (real pacing, length and pauses). Pure functions: the card is shared/feedbackui.js, and
// "Fix it for me" sends revisePrompt() to the tab's own writer.

import { compactTitle, lowerTags } from './upload.js';

export const SECTIONS = [
  ['hook', 'Hook (first 3 seconds)', 0.25],
  ['curiosity', 'Curiosity', 0.15],
  ['pacing', 'Pacing', 0.15],
  ['clarity', 'Clarity', 0.1],
  ['visuals', 'Visual variety', 0.15],
  ['packaging', 'Title, thumbnail and tags', 0.1],
  ['length', 'Length', 0.05],
  ['sound', 'Sound', 0.05],
];

export function grade(score) {
  const s = Math.max(0, Math.min(100, score));
  return s >= 95 ? 'A+' : s >= 90 ? 'A' : s >= 85 ? 'A-' : s >= 80 ? 'B+' : s >= 75 ? 'B' : s >= 70 ? 'B-'
    : s >= 65 ? 'C+' : s >= 60 ? 'C' : s >= 55 ? 'C-' : s >= 45 ? 'D' : 'F';
}

const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean);
const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const lineOf = (s) => s?.narration || s?.line || '';

const HOOK_GOOD = /^(in this town|if you|you |imagine|what if|right now|this |there's|there is|in \d|\d|why |how |nobody|no one|meet |stop|wait)/i;
const HOOK_BAD = /^(have you ever wondered|in this video|did you know|today we|hello|hi |welcome|so,? )/i;
const LOOPS = /\b(but here'?s the (catch|thing|twist)|but (that'?s|that is) not (even )?the|wait|here'?s where|and that'?s when|turns out|the weird part|the crazy part|but then|until|except|the problem\b|plot twist|guess what|you won'?t believe)/i;
const CURIOUS_TITLE = /\b(why|how|what|secret|never|nobody|actually|really|only|strangest|weird|truth|\d)/i;

// script: { title, youtubeTitle, thumbText, hookText, teaser, hashtags, scenes: [{ narration, set, frame, cam, camera, who, acts, props, thing, feel... }] }
// timeline (optional): { total, scenes: [{ start, dur, words }] }; options: { duration, mood }; settings: { ttsEngine, character }
export function reviewVideo({ script = {}, timeline = null, options = {}, settings = {} } = {}) {
  const scenes = (script.scenes || []).filter(s => lineOf(s));
  const lines = scenes.map(lineOf);
  const allWords = lines.flatMap(words);
  const out = {};
  const sec = (key, score, tips) => { out[key] = { key, score: Math.round(clamp(score)), grade: grade(score), tips: tips.filter(Boolean).slice(0, 3) }; };

  // Hook: the first line (and the on-screen headline, the cold open).
  {
    const first = lines[0] || '', fw = words(first).length;
    let s = 55, tips = [];
    if (HOOK_GOOD.test(first)) s += 22; else tips.push('Open by talking to the viewer: "If you…", "Imagine…", "Right now…" or a sharp question.');
    if (HOOK_BAD.test(first)) { s -= 30; tips.push('Never open with "Have you ever wondered", "Did you know" or "In this video": they make people scroll.'); }
    if (fw <= 16) s += 10; else { s -= Math.min(20, (fw - 16) * 2); tips.push(`The first line is ${fw} words; keep it under 16 so it lands in 3 seconds.`); }
    if (/[?!]$/.test(first.trim()) || /\d/.test(first)) s += 6;
    if (script.hookText || script.thumbText) s += 5; else tips.push('Add an on-screen headline that teases the payoff.');
    if (Number.isInteger(script.teaser) || scenes.length >= 3) s += 4;
    sec('hook', s, tips);
  }
  // Curiosity: open loops, questions, a payoff at the end.
  {
    const loops = lines.filter(l => LOOPS.test(l)).length, questions = lines.filter(l => /\?/.test(l)).length;
    const minutes = Math.max(0.25, (timeline?.total || allWords.length / 2.6) / 60);
    const perMin = (loops + questions * 0.6) / minutes;
    let s = 45 + Math.min(40, perMin * 9);
    const tips = [];
    if (loops === 0) tips.push('Keep a loop open every few lines: "but here\'s the catch…", "and that\'s when it gets worse…".');
    if (questions === 0) tips.push('Ask the viewer one question they will want answered.');
    const last = lines[lines.length - 1] || '';
    if (words(last).length >= 4 && words(last).length <= 18) s += 10; else tips.push('End on one short line that lands the point.');
    if (/^(so|and that|that'?s why|now you know)/i.test(last)) s += 5;
    sec('curiosity', s, tips);
  }
  // Pacing: words per second, sentence length, time per shot, long pauses.
  {
    const total = timeline?.total || allWords.length / 2.6;
    const wps = allWords.length / Math.max(1, total);
    const sents = lines.flatMap(sentences), avg = sents.length ? allWords.length / sents.length : 0;
    let s = 100, tips = [];
    if (wps < 2.2) { s -= (2.2 - wps) * 35; tips.push(`About ${wps.toFixed(1)} words a second: tighten it (2.4 to 3.2 keeps scrollers).`); }
    if (wps > 3.6) { s -= (wps - 3.6) * 30; tips.push('Very fast: give the big moments a beat to land.'); }
    if (avg > 14) { s -= (avg - 14) * 3; tips.push(`Sentences average ${avg.toFixed(0)} words; aim for under 14.`); }
    const shot = scenes.length ? total / scenes.length : 0;
    if (shot > 5) { s -= (shot - 5) * 6; tips.push(`Each scene lasts about ${shot.toFixed(1)} s; cut faster (2 to 4 s).`); }
    if (timeline?.scenes?.length) {
      const gaps = timeline.scenes.flatMap(sc => (sc.words || []).slice(1).map((w, i) => w.start - sc.words[i].end)).filter(g => g > 0.8).length;
      if (gaps) { s -= gaps * 4; tips.push(`${gaps} long pause${gaps > 1 ? 's' : ''} in the voice; tighten them.`); }
    }
    sec('pacing', s, tips);
  }
  // Clarity: short sentences, plain words.
  {
    const sents = lines.flatMap(sentences), long = sents.filter(x => words(x).length > 20).length;
    const hard = allWords.filter(w => w.replace(/[^\p{L}]/gu, '').length >= 13).length / Math.max(1, allWords.length);
    let s = 100 - long * 8 - hard * 300;
    const tips = [];
    if (long) tips.push(`${long} sentence${long > 1 ? 's are' : ' is'} over 20 words; split ${long > 1 ? 'them' : 'it'}.`);
    if (hard > 0.04) tips.push('Swap long words for everyday ones.');
    sec('clarity', s, tips);
  }
  // Visual variety: places, shot kinds, feelings, things.
  {
    const sets = new Set(scenes.map(s => s.set || s.place).filter(Boolean)).size;
    const shots = new Set(scenes.map(s => s.frame || s.cam || s.camera).filter(Boolean)).size;
    const feels = new Set(scenes.flatMap(s => (s.who || []).map(w => w?.feel).filter(Boolean)).concat(scenes.map(s => s.act).filter(Boolean))).size;
    const things = scenes.filter(s => s.thing || (s.who || []).some(w => w?.hold) || (s.acts || []).some(a => a.hold) || (s.props || []).length || s.icon).length;
    const n = Math.max(1, scenes.length);
    let s = 40 + Math.min(20, sets * 5) + Math.min(15, shots * 3) + Math.min(15, feels * 3) + Math.min(10, things / n * 25);
    const tips = [];
    if (sets < Math.min(3, n)) tips.push('Move the story to more places (at least 3).');
    if (things / n < 0.2) tips.push('Show more things on screen: objects people hold, drop, break or point at.');
    if (feels < 3 && scenes.some(s => s.who)) tips.push('Give the characters more feelings: shocked, smug, nervous…');
    sec('visuals', s, tips);
  }
  // Packaging: the title, the thumbnail words, the hashtags.
  {
    const title = script.youtubeTitle || script.title || '', tags = script.hashtags || [];
    let s = 50, tips = [];
    if (title.length && title.length <= 45) s += 18; else tips.push(`The title is ${title.length} characters; keep it under 45.`);
    if (CURIOUS_TITLE.test(title)) s += 12; else tips.push('Make the title a question or a promise: "Why…", "How…", a number.');
    if (title && title === title.toUpperCase() && /[A-Z]/.test(title)) { s -= 15; tips.push('Avoid an all-capitals title.'); }
    const tw = words(script.thumbText).length;
    if (tw >= 2 && tw <= 4) s += 12; else tips.push('Give the thumbnail 2 to 4 big words that are not the title.');
    if (tags.length >= 3 && tags.length <= 10 && tags.every(t => t === t.toLowerCase())) s += 8; else tips.push('Use 3 to 10 lowercase hashtags.');
    sec('packaging', s, tips);
  }
  // Length: close to what was asked for; a Short stays under a minute.
  {
    const total = timeline?.total || allWords.length / 2.6, want = Number(options.duration) || 0;
    let s = 100; const tips = [];
    if (want) { const off = Math.abs(total - want) / want; s -= off * 120; if (off > 0.2) tips.push(`It runs ${Math.round(total)} s for a ${want} s target.`); }
    if (want && want <= 60 && total > 60) { s -= 15; tips.push('Over 60 seconds is no longer a Short on most apps.'); }
    if (total < 12) { s -= 20; tips.push('Very short: give the story a beat more.'); }
    sec('length', s, tips);
  }
  // Sound: a voice, music, a character.
  {
    let s = 60; const tips = [];
    if (settings.ttsEngine === 'none') { s -= 40; tips.push('Turn the narrator on: silent videos lose most viewers.'); }
    if (options.mood && options.mood !== 'none') s += 20; else tips.push('Add music under the voice.');
    if (['mysterybox', 'tickingclock', 'detective', 'heartbeat', 'wonder', 'countdown', 'lofi', 'mysterious', 'curious'].includes(options.mood)) s += 10;
    if (settings.character) s += 10; else tips.push('Try a narrator character (Hype Host, Secret Teller…) for more personality.');
    sec('sound', s, tips);
  }
  const total = SECTIONS.reduce((n, [k, , w]) => n + (out[k]?.score || 0) * w, 0);
  return { overall: { score: Math.round(total), grade: grade(total) }, sections: SECTIONS.map(([k, name]) => ({ ...out[k], name })) };
}

// Fixes that need no AI: the title, the hashtags, the thumbnail words.
export function quickFixes(script) {
  const s = { ...script };
  s.youtubeTitle = compactTitle(s.youtubeTitle || s.title || '', 45);
  s.hashtags = lowerTags(s.hashtags || []);
  if (words(s.thumbText).length < 2 || words(s.thumbText).length > 4) s.thumbText = words(s.hookText || s.title).slice(0, 4).join(' ');
  return s;
}

// What the writer is asked when the person presses "Fix it for me".
export function revisePrompt(script, report) {
  const weak = report.sections.filter(x => x.score < 85);
  const notes = weak.map(x => `- ${x.name} (${x.grade}): ${x.tips.join(' ') || 'make it stronger'}`).join('\n');
  return `You are a script doctor for viral short videos. Improve this video script so it holds scrollers to the end.
Its grades: overall ${report.overall.grade}.
Fix these first:
${notes || '- Make the hook and the curiosity even stronger.'}

Rules: keep every fact true (do not invent facts); keep the same JSON shape and field names, the same cast and ids, and about the same number of scenes (at most 2 more or fewer); open with a line that talks to the viewer ("If you…", "Imagine…", "Right now…") in under 16 words; keep a loop open every few lines; sentences under 14 words; move the story through at least 3 places; a title under 45 characters that is a question or a promise; "thumbText" of 2-4 big words that are not the title; 3-10 lowercase hashtags. Return ONLY the full JSON script, no commentary.

The script:
${JSON.stringify(script)}`;
}
