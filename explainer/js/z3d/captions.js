// Captions for the looks drawn in code, from timeline scenes ({ start, words: [{ text, start, end }] },
// word times relative to the scene). Each caption is [start, text, end].
// No three.js here, so the unit tests can load it.

// 3D (the zach-style rule): 1-3 words, a new caption at every pause or punctuation.

// A "word" that is only punctuation ("...", "!!!", "—") joins the word before it (or the next one),
// so no caption is ever empty or starts with a stray mark.
const WORDY = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;
function joinMarks(ws) {
  const out = [];
  for (const w of ws) {
    if (WORDY.test(w.text)) { out.push({ ...w }); continue; }
    if (out.length) { const p = out[out.length - 1]; p.text = /^[—–-]+$/.test(w.text) ? p.text : p.text + w.text; p.e = Math.max(p.e, w.e); }
    else out.pending = (out.pending || '') + w.text;
  }
  return out;
}

export function captions3d(scenes) {
  const caps = [];
  for (const sc of scenes) {
    const ws = joinMarks((sc.words || []).map(w => ({ text: String(w.text ?? ''), s: sc.start + w.start, e: sc.start + w.end })));
    let cur = [];
    const flush = () => { if (!cur.length) return; caps.push([cur[0].s - 0.02, cur.map(w => w.text.replace(/[.,!?;:"]+$/g, '')).join(' '), cur[cur.length - 1].e + 0.12]); cur = []; };
    ws.forEach((w) => { if (cur.length && (cur.length >= 3 || w.s - cur[cur.length - 1].e > 0.3)) flush(); cur.push(w); if (/[.,!?;:]$/.test(w.text) && cur.length >= 1) flush(); });
    flush();
  }
  for (let i = 0; i + 1 < caps.length; i++) caps[i][2] = Math.min(caps[i][2], caps[i + 1][0]);
  return caps;
}

// Blocky (the S11 rule, as in "The Snow Fort"): 3-4 words, never across two lines, one key word
// marked *word* (drawn in capitals): the scene's keyword if the group has it, else its longest
// word that is not a small word.
const SMALL = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'it', 'is', 'was', 'he', 'she', 'we', 'i', 'my', 'our', 'so', 'his', 'her', 'that', 'this', 'with', 'for', 'be', 'would', "we'd", "he'd", "won't", 'even', 'just', 'one', 'out', 'there', 'since', 'they', 'them', 'me', 'you', 'your', 'then', 'what', 'when', 'were', 'are', 'had', 'have']);
export function captionsBlocky(scenes) {
  const words = [];
  scenes.forEach((sc, line) => joinMarks((sc.words || []).map(w => ({ text: String(w.text ?? ''), s: sc.start + w.start, e: sc.start + w.end }))).forEach(w => words.push({ w: w.text, s: w.s, e: w.e, line, keys: (Array.isArray(sc.keywords) ? sc.keywords : []).map(k => String(k).toLowerCase()) })));
  const groups = []; let cur = [];
  const flush = () => { if (cur.length) groups.push(cur); cur = []; };
  for (const w of words) {
    if (cur.length && (cur.length >= 4 || w.line !== cur[0].line || w.s - cur[cur.length - 1].e > 0.35)) flush();
    cur.push(w);
    if (/[.,!?;:"]$/.test(w.w) && cur.length >= 3) flush();
  }
  flush();
  // Fold a one- or two-word tail into the group before it (same line), so captions stay 3-4 words.
  for (let i = groups.length - 1; i > 0; i--) if (groups[i].length < 3 && groups[i][0].line === groups[i - 1][0].line && groups[i - 1].length + groups[i].length <= 4) { groups[i - 1].push(...groups[i]); groups.splice(i, 1); }
  const clean = (w) => w.replace(/^["'“]|[.,!?;:"”]+$/g, '');
  return groups.map((g, i) => {
    const ws = g.map(w => clean(w.w));
    let key = ws.findIndex(w => g[0].keys.includes(w.toLowerCase()));
    if (key < 0) {
      let best = 0;
      ws.forEach((w, j) => { const l = w.replace(/[^a-z]/gi, '').length; if (!SMALL.has(w.toLowerCase()) && l > best) { best = l; key = j; } });
    }
    const text = ws.map((w, j) => (j === key ? `*${w}*` : w)).join(' ');
    const end = i + 1 < groups.length ? Math.min(groups[i + 1][0].s - 0.03, g[g.length - 1].e + 0.35) : g[g.length - 1].e + 0.5;
    return [g[0].s - 0.03, text, end];
  });
}
