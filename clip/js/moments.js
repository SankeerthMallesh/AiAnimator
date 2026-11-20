// Finding the clips worth posting. The transcript is read in overlapping 8-minute windows, so any
// length of stream works with any writer; each window proposes its best moments with a score, and
// the best-scoring ones across the whole video are kept.

const WINDOW = 480, OVERLAP = 60;

const SYSTEM = `You are the best short-form video editor on TikTok, YouTube Shorts and Reels. You cut long streams, podcasts and videos into clips that go viral.
A great clip:
- starts on a hook in the first 2 seconds: a bold claim, a question, a reaction, conflict, a funny or shocking line. Never start mid-thought or on filler ("so", "um", "anyway").
- is self-contained: someone who never saw the stream understands it.
- has a payoff: a punchline, reveal, twist, strong reaction or satisfying ending, and ends right after it.
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

// Snap a proposed clip to word boundaries and the length range.
function snap(c, words, minLen, maxLen, duration) {
  let s = Number(c.start), e = Number(c.end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  const inRange = words.filter(w => w.s >= s - 1.5 && w.e <= e + 2.5);
  if (inRange.length < 4) return null;
  const first = inRange.find(w => w.s >= s - 0.6) || inRange[0];
  s = Math.max(0, first.s - 0.12);
  let last = [...inRange].reverse().find(w => w.e <= e + 0.8) || inRange[inRange.length - 1];
  e = last.e + 0.35;
  if (e - s > maxLen) {
    const cut = inRange.filter(w => w.e <= s + maxLen);
    // end on a sentence end if one is near the limit
    const enders = cut.filter(w => /[.!?]["')]?$/.test(w.w));
    last = enders.length && enders[enders.length - 1].e > s + minLen ? enders[enders.length - 1] : cut[cut.length - 1];
    if (!last) return null;
    e = last.e + 0.35;
  }
  // Too short: carry on through the next whole sentences until the clip reaches the minimum length.
  if (e - s < minLen) {
    const after = words.filter(w => w.s >= e - 0.3 && w.e <= s + maxLen);
    let best = null;
    for (const w of after) {
      if (w.e - s >= minLen && (/[.!?]["')]?$/.test(w.w) || w.e - s >= minLen + 8)) { best = w; break; }
    }
    if (!best && after.length) best = after[after.length - 1];
    if (best && best.e > e) e = best.e + 0.35;
  }
  if (e - s < Math.min(minLen, 10)) return null;
  e = Math.min(e, duration || e);
  return { s, e };
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

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
      { role: 'user', content: `Transcript (each line starts with its time in seconds):\n${text}\n\nFind up to ${perWindow} of the best clips in this part, each ${minLen} to ${maxLen} seconds long. Use the line times for start and end.\nFor each clip also give "highlight": 3 to 8 single words from the clip worth highlighting in the captions (the punchiest words), and "emoji": 0 to 3 reaction emoji at moments where they fit, each with its time in seconds (like 💀 for something funny, 😳 shocking, 🔥 hype).\nReturn JSON only:\n{"clips":[{"start":0.0,"end":0.0,"heading":"","score":7,"why":"one short line on why it works","highlight":["word"],"emoji":[{"t":0.0,"e":"💀"}]}]}` },
    ], signal);
    for (const c of out?.clips || []) found.push(c);
    onProgress?.((i + 1) / windows.length);
  }
  const clips = [];
  for (const c of found.sort((x, y) => (Number(y.score) || 0) - (Number(x.score) || 0))) {
    const span = snap(c, words, minLen, maxLen, end);
    if (!span) continue;
    // Skip moments that overlap one already chosen by more than a third.
    if (clips.some(k => Math.min(k.e, span.e) - Math.max(k.s, span.s) > (span.e - span.s) / 3)) continue;
    clips.push({
      ...span,
      heading: String(c.heading || '').replace(/#\S+/g, '').replace(/["“”]/g, '').trim().slice(0, 70) || 'Wait for it…',
      score: Math.max(1, Math.min(10, Math.round(Number(c.score) || 5))),
      why: String(c.why || '').slice(0, 140),
      highlight: (Array.isArray(c.highlight) ? c.highlight : []).map(w => String(w).toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')).filter(Boolean).slice(0, 10),
      emoji: (Array.isArray(c.emoji) ? c.emoji : []).filter(x => x && EMOJI_RE.test(String(x.e)) && Number(x.t) >= span.s && Number(x.t) <= span.e)
        .map(x => ({ t: Number(x.t), e: [...new Intl.Segmenter().segment(String(x.e))][0]?.segment || '🔥' })).slice(0, 3),
    });
    if (clips.length >= count) break;
  }
  if (!clips.length) throw new Error('No good clips came back. Try a longer video, or try again.');
  return clips;
}
