// Finding the clips worth posting. The transcript is read in overlapping 8-minute windows, so any
// length of stream works with any writer; each window proposes its best moments with a score, and
// the best-scoring ones across the whole video are kept.

const WINDOW = 480, OVERLAP = 60;

const SYSTEM = `You are the best short-form video editor on TikTok, YouTube Shorts and Reels. You cut long streams, podcasts and videos into clips that go viral.
A great clip:
- starts on a hook in the first 2 seconds: a bold claim, a question, a reaction, conflict, a funny or shocking line. Never start mid-thought or on filler ("so", "um", "anyway").
- is self-contained: someone who never saw the stream understands it.
- has a payoff: a punchline, reveal, twist, strong reaction or satisfying ending, and ends right after it. Shorter is better than padded: 12 to 30 seconds is ideal.
- has no dead air or slow setup.
Score honestly from 1 to 10 for how likely it is to go viral. Most moments are 4-6; give 8+ only to genuinely great ones.
The heading is the text on screen above the video, and it decides whether people stop scrolling: 3 to 7 words that create curiosity, tension or emotion about THIS clip, true to it (no lying clickbait), no hashtags, no quotes, at most one emoji.
Strong headings: "He Tried To Break It With Fire", "Chat Did NOT Expect This", "The Worst Advice I've Ever Heard", "Why He Quit At 25". Weak headings (never write these): "First test", "Funny moment", "Stream highlight", "Part 1".`;

function fmt(t) { return t.toFixed(1); }

function windowText(segments, a, b) {
  return segments.filter(g => g.e > a && g.s < b).map(g => `[${fmt(g.s)}] ${g.t}`).join('\n');
}

function parseJSON(text) {
  const s = String(text || '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON in the answer');
  return JSON.parse(s.slice(a, b + 1));
}

async function ask(messages, signal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('/api/write', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: 0.4, max_tokens: 3000 }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { try { return parseJSON(j.text); } catch { /* ask again */ } }
    else if (j.viewOnly) throw new Error(j.error);
    await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
  }
  return null;
}

// Snap a proposed clip to word boundaries. It ends on its payoff (the punchline or reaction), at
// most 1.5 s after it, and is never stretched past it to reach a length: a clip longer than the
// maximum starts later instead, one shorter than 12 s is dropped.
function snap(c, words, minLen, maxLen, duration) {
  let s = Number(c.start), e = Number(c.end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  const pay = Number.isFinite(Number(c.payoffEnd)) && Number(c.payoffEnd) > s ? Math.min(Number(c.payoffEnd), e + 1) : e;
  const inRange = words.filter(w => w.s >= s - 1.5 && w.e <= pay + 1.5);
  if (inRange.length < 4) return null;
  const first = inRange.find(w => w.s >= s - 0.6) || inRange[0];
  s = Math.max(0, first.s - 0.12);
  // The last word of the payoff: the last one ending by the payoff time (small tolerance).
  const last = [...inRange].reverse().find(w => w.e <= pay + 0.15) || inRange[inRange.length - 1];
  e = Math.min(last.e + 0.35, Math.max(pay, last.e) + 1.5);
  if (e - s > maxLen) {
    // Keep the payoff: start later, on the first word of a sentence if one is close.
    const from = e - maxLen;
    const starts = words.filter((w, i) => w.s >= from && w.s < from + 6 && (i === 0 || /[.!?]["')]?$/.test(words[i - 1].w)));
    const st = starts[0] || words.find(w => w.s >= from);
    if (!st) return null;
    s = Math.max(0, st.s - 0.12);
  }
  // A tight moment (the writer may give 7 s that end on the payoff) keeps its ending and gets lead-in
  // instead: it starts earlier, on the first word of a sentence, until it lasts at least 12 s (or
  // minLen when that is shorter). It is dropped only when the video has too little before it (under 10 s).
  const need = Math.min(minLen, 12);
  if (e - s < need) {
    const from = e - need;
    const isStart = (i) => i === 0 || /[.!?]["')]?$/.test(words[i - 1].w);
    const idx = words.map((w, i) => i).filter(i => words[i].s <= from && words[i].s >= from - 8 && isStart(i));
    const st = idx.length ? words[idx[idx.length - 1]] : [...words].reverse().find(w => w.s <= from) || words[0];
    s = Math.max(0, Math.min(s, st.s - 0.12));
    if (e - s < 10) return null;
  }
  // Never past the end of the video (a cut-off file can have speech timed beyond it).
  if (duration) {
    if (s >= duration - 3) return null;
    e = Math.min(e, duration - 0.05);
    if (e - s < Math.min(minLen, 12)) return null;
  }
  return { s, e, payoffEnd: Math.min(pay, e) };
}

// A clip that says the same thing over and over (a loop, a chant, a transcription glitch) is not a
// moment: rejected when more than half of its 4-word runs appear twice inside it.
function repeats(words, s, e) {
  const w = words.filter(x => x.s >= s && x.e <= e).map(x => x.w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')).filter(Boolean);
  if (w.length < 8) return false;
  const grams = [];
  for (let i = 0; i + 4 <= w.length; i++) grams.push(w.slice(i, i + 4).join(' '));
  const count = new Map();
  for (const g of grams) count.set(g, (count.get(g) || 0) + 1);
  return grams.filter(g => count.get(g) > 1).length / grams.length > 0.5;
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

// An emoji that pictures a word said around it ("think" and a thinking face) is clutter: dropped.
export const MIRRORS = [[/🤔/u, /\b(think|thinking|thought|wonder)/], [/🔥/u, /\b(fire|hot|burn)/], [/💰|💵|🤑/u, /\b(money|cash|rich|dollars?)/], [/⏰|⌛|⏳/u, /\b(time|clock|hour|minute)/],
  [/🍊/u, /\borange/], [/❤️|💔/u, /\b(love|heart)/], [/👀/u, /\b(look|see|watch|eyes?)/], [/🧠/u, /\b(brain|smart)/], [/💀/u, /\b(dead|die|skull)/], [/😂|🤣/u, /\b(funny|laugh)/]];
export function mirrorsWord(e, t, words) {
  const near = words.filter(w => Math.abs(w.s - t) < 1.6).map(w => w.w.toLowerCase()).join(' ');
  return MIRRORS.some(([em, word]) => em.test(e) && word.test(near));
}

// transcript: { words, segments }. opts: { count, minLen, maxLen, duration, log, onProgress, signal }
export async function findMoments(transcript, { count = 5, minLen = 20, maxLen = 60, duration = 0, log, onProgress, signal } = {}) {
  const { words, segments } = transcript;
  if (!segments.length || words.length < 20) throw new Error('There is not enough speech in this video to find clips.');
  const end = duration || segments[segments.length - 1].e;
  const windows = [];
  for (let a = 0; a < end; a += WINDOW - OVERLAP) {
    windows.push([a, Math.min(end, a + WINDOW)]);
    if (a + WINDOW >= end) break;
  }
  const perWindow = Math.max(2, Math.min(4, Math.ceil((count * 2) / windows.length)));
  const found = [];
  for (let i = 0; i < windows.length; i++) {
    const [a, b] = windows[i];
    const text = windowText(segments, a, b);
    if (text.split(/\s+/).length < 40) continue;
    log?.(`Looking for the best moments (${i + 1} of ${windows.length})…`);
    const out = await ask([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Transcript (each line starts with its time in seconds):\n${text}\n\nFind up to ${perWindow} of the best clips in this part, each about ${minLen} to ${maxLen} seconds long (shorter if the moment is over sooner). Use the line times for start and end, and give "payoffEnd": the time the punchline or reaction ends; the clip ends there.\nFor each clip also give "highlight": 3 to 8 single words from the clip worth highlighting in the captions (the punchiest words), and "emoji": 0 to 2 reaction emoji, only as a reaction to what happens (like 💀 for something funny, 😳 shocking), each with its time in seconds. Never an emoji that repeats or pictures a word in the captions (no 🤔 when someone says "think", no 🔥 for "fire", no 🍊 for "orange"); when unsure, give none.\nReturn JSON only:\n{"clips":[{"start":0.0,"end":0.0,"payoffEnd":0.0,"heading":"","headingKey":"the one word of the heading to colour","score":7,"why":"one short line on why it works","highlight":["word"],"emoji":[{"t":0.0,"e":"💀"}]}]}` },
    ], signal);
    for (const c of out?.clips || []) found.push(c);
    onProgress?.((i + 1) / windows.length);
  }
  const clips = [];
  for (const c of found.sort((x, y) => (Number(y.score) || 0) - (Number(x.score) || 0))) {
    const span = snap(c, words, minLen, maxLen, end);
    if (!span) continue;
    if (repeats(words, span.s, span.e)) { log?.('Skipped a moment that repeats itself.'); continue; }
    // Skip moments that overlap one already chosen by more than a third.
    if (clips.some(k => Math.min(k.e, span.e) - Math.max(k.s, span.s) > (span.e - span.s) / 3)) continue;
    clips.push({
      ...span,
      heading: String(c.heading || '').replace(/#\S+/g, '').replace(/["“”]/g, '').trim().slice(0, 70) || 'Wait for it…',
      headingKey: String(c.headingKey || '').replace(/[^\p{L}\p{N}']/gu, '').slice(0, 30),
      score: Math.max(1, Math.min(10, Math.round(Number(c.score) || 5))),
      why: String(c.why || '').slice(0, 140),
      highlight: (Array.isArray(c.highlight) ? c.highlight : []).map(w => String(w).toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')).filter(Boolean).slice(0, 10),
      emoji: (Array.isArray(c.emoji) ? c.emoji : []).filter(x => x && EMOJI_RE.test(String(x.e)) && Number(x.t) >= span.s && Number(x.t) <= span.e && !mirrorsWord(String(x.e), Number(x.t), words))
        .map(x => ({ t: Number(x.t), e: [...new Intl.Segmenter().segment(String(x.e))][0]?.segment || '🔥' })).slice(0, 3),
    });
    if (clips.length >= count) break;
  }
  if (!clips.length) throw new Error('No good clips came back. Try a longer video, or try again.');
  return clips;
}
