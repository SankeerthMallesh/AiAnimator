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
