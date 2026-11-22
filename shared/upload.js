// 1.1: the upload kit's tidy-up, the same in every tab. Hashtags are lowercase (#hello, not #Hello)
// and titles are short and compact.

// '#' + lowercase letters and digits; repeats, '#topic' and tags under 2 letters are dropped.
export function lowerTags(list, max = 10) {
  const items = Array.isArray(list) ? list : String(list || '').split(/[\s,]+/);
  const out = [];
  for (const h of items) {
    const t = '#' + String(h || '').replace(/^#+/, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    if (t.length > 2 && t !== '#topic' && !out.includes(t)) out.push(t);
  }
  return out.slice(0, max);
}

const FILLER = /^(the (shocking|crazy|insane|surprising|real|hidden|untold|strange|wild) (truth|story|reason|secret)s? (about|of|behind|why)\s+|you (won'?t|will not) believe\s+|this is (why|how)\s+|here'?s (why|how)\s+)/i;

// A short title: no "| part" or " - subtitle" tail when it is long, no filler opening, at most
// `max` characters cut at a word, and one emoji at most (kept at the end).
export function compactTitle(text, max = 56) {
  let s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return s;
  const emoji = (s.match(/\p{Extended_Pictographic}\uFE0F?/u) || [''])[0];
  s = s.replace(/\p{Extended_Pictographic}\uFE0F?|\u200D/gu, '').replace(/\s+/g, ' ').trim();
  if (s.length > max) s = s.split(/\s+[|•]\s+|\s+[-–—]\s+|:\s+/)[0].trim() || s;
  const bare = s.replace(FILLER, '');
  if (bare.length >= 12 && bare !== s) s = bare[0].toUpperCase() + bare.slice(1);
  if (s.length > max) {
    const cut = s.slice(0, max + 1);
    s = (cut.lastIndexOf(' ') > max * 0.5 ? cut.slice(0, cut.lastIndexOf(' ')) : cut.slice(0, max)).trim();
    for (let i = 0; i < 3; i++) s = s.replace(/[\s,;:.\-–—]+$/, '').replace(/\s+(and|or|the|a|an|of|to|in|for|with|that|is|was|are)$/i, '').trim();
  }
  s = s.replace(/[\s,;:\-–—]+$/, '');
  return emoji ? `${s} ${emoji}` : s;
}

// 1.2: YouTube chapters for a long video, from the timeline's chapter starts ({ start, chapter: { n,
// title } } scenes). YouTube shows chapters when the list starts at 0:00, has 3 or more, and each
// lasts 10 s or more; otherwise this gives none. map(t) moves a time into a cut video (or null when t
// was cut out: the chapter then starts where the video picks up again, which map gives for the cut's end).
export function chapterLines(scenes = [], total = 0, map = (t) => t) {
  const starts = scenes.filter(sc => sc?.chapter?.title && Number.isFinite(sc.start)).map(sc => ({ t: sc.start, title: String(sc.chapter.title).trim() }));
  if (starts.length < 3) return [];
  const list = starts.map(c => ({ ...c, t: map(c.t) })).filter(c => c.t != null).sort((a, b) => a.t - b.t);
  if (!list.length) return [];
  list[0].t = 0; // YouTube needs the first chapter at 0:00 (the cold open belongs to chapter 1)
  const end = map(total) ?? total;
  const ok = list.filter((c, i) => (list[i + 1]?.t ?? end) - c.t >= 10);
  if (ok.length < 3 || ok[0] !== list[0]) return [];
  return ok.map(c => `${stamp(c.t)} ${c.title}`);
}

function stamp(t) {
  const s = Math.floor(t), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

// The description with its chapter list replaced (or added at the end, or removed when there is none).
export function withChapters(desc, lines) {
  const bare = String(desc || '').replace(/\n*Chapters\n(?:\d+:\d{2}(?::\d{2})? [^\n]*\n?)+/g, '').replace(/\s+$/, '');
  return lines.length ? `${bare}\n\nChapters\n${lines.join('\n')}` : bare;
}
