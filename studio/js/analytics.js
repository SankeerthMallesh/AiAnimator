// Analytics learning: only numbers you enter or import from YouTube Studio. Compares your stronger and weaker
// videos and groups them by the things you tag (engine, category, hook style, length, ending), showing averages
// with how many videos each is based on. Nothing is estimated or invented.
export const FIELDS = [['title', 'Video title', 'text'], ['engine', 'Engine', 'engine'], ['category', 'Category', 'text'], ['hook', 'Opening line (hook)', 'text'], ['ending', 'Ending type', 'ending'], ['scenes', 'Scenes', 'num'], ['length', 'Length (s)', 'num'], ['views', 'Views', 'num'], ['subs', 'Subscribers gained', 'num'], ['avd', 'Avg view duration (s)', 'num'], ['apv', 'Avg % viewed', 'num'], ['stayed', 'Stayed to watch %', 'num'], ['likes', 'Likes', 'num'], ['comments', 'Comments', 'num']];
export const ENDINGS = ['twist', 'reveal', 'cliffhanger', 'punchline', 'consequence', 'question'];
export const METRICS = { views: 'Views', apv: 'Avg % viewed', stayed: 'Stayed to watch %', subsPer1k: 'Subscribers per 1,000 views', engagement: 'Likes + comments per 1,000 views' };
export const hookStyle = (h = '') => /^\s*in this town/i.test(h) ? 'town law' : /\?\s*$/.test(h) ? 'question' : /\b\d/.test(h) ? 'number/fact' : /\b(you|your)\b/i.test(h) ? 'talks to the viewer' : h ? 'statement' : '';
export const lengthBucket = (s) => (!s ? '' : s < 30 ? 'under 30 s' : s < 45 ? '30-44 s' : s < 60 ? '45-59 s' : s <= 90 ? '60-90 s' : 'over 90 s');
const secs = (v) => { const p = String(v || '').trim().split(':').map(Number); if (p.some(isNaN)) return Number(v) || 0; return p.reduce((a, b) => a * 60 + b, 0); };

/** YouTube Studio's "Table data.csv" (Advanced mode export) or any CSV with similar headers */
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  // the first name that a column has wins (YouTube's "Content" column is the video id, not its title)
  const col = (...names) => { for (const n of names) { const i = head.findIndex((h) => h === n || h.startsWith(n)); if (i >= 0) return i; } return -1; };
  const C = { title: col('video title', 'title', 'content'), views: col('views'), subs: col('subscribers gained', 'subscribers'), avd: col('average view duration'), apv: col('average percentage viewed'), stayed: col('stayed to watch'), likes: col('likes'), comments: col('comments added', 'comments'), length: col('duration', 'length') };
  if (C.title < 0 || C.views < 0) throw new Error('This CSV has no "Video title" and "Views" columns. In YouTube Studio: Analytics → Advanced mode → Export current view → Comma-separated values (.csv).');
  return rows.filter((r) => r[C.title] && !/^total$/i.test(r[C.title].trim())).map((r) => ({
    id: Math.random().toString(36).slice(2), title: r[C.title].trim(), views: Number(String(r[C.views]).replace(/,/g, '')) || 0,
    subs: C.subs >= 0 ? Number(r[C.subs]) || 0 : '', avd: C.avd >= 0 ? secs(r[C.avd]) : '', apv: C.apv >= 0 ? Number(r[C.apv]) || 0 : '', stayed: C.stayed >= 0 ? Number(r[C.stayed]) || 0 : '',
    likes: C.likes >= 0 ? Number(r[C.likes]) || 0 : '', comments: C.comments >= 0 ? Number(r[C.comments]) || 0 : '', length: C.length >= 0 ? secs(r[C.length]) : '',
    engine: '', category: '', hook: '', ending: '', scenes: '',
  }));
}

const metricOf = (v, m) => m === 'subsPer1k' ? (v.views ? (Number(v.subs) || 0) / v.views * 1000 : null) : m === 'engagement' ? (v.views ? ((Number(v.likes) || 0) + (Number(v.comments) || 0)) / v.views * 1000 : null) : (v[m] === '' || v[m] == null ? null : Number(v[m]));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** patterns in your own data, by a chosen metric */
export function learn(videos, metric = 'views') {
  const rows = videos.map((v) => ({ v, m: metricOf(v, metric) })).filter((r) => r.m != null && !isNaN(r.m));
  if (rows.length < 4) return { enough: false, n: rows.length, note: `Add at least 4 videos with ${METRICS[metric]} to compare (${rows.length} so far).` };
  rows.sort((a, b) => b.m - a.m);
  const third = Math.max(1, Math.floor(rows.length / 3)), top = rows.slice(0, third), low = rows.slice(-third);
  const overall = avg(rows.map((r) => r.m));
  const dims = { engine: (v) => v.engine, category: (v) => v.category, 'hook style': (v) => hookStyle(v.hook), 'title style': (v) => hookStyle(v.title), length: (v) => lengthBucket(Number(v.length)), ending: (v) => v.ending, scenes: (v) => (v.scenes ? (v.scenes < 10 ? 'under 10 scenes' : v.scenes <= 16 ? '10-16 scenes' : 'over 16 scenes') : '') };
  const groups = Object.entries(dims).map(([name, f]) => {
    const g = new Map(); rows.forEach((r) => { const k = f(r.v); if (k) g.set(k, [...(g.get(k) || []), r.m]); });
    return { name, rows: [...g].map(([k, ms]) => ({ key: k, n: ms.length, avg: avg(ms), vs: avg(ms) / overall - 1 })).sort((a, b) => b.avg - a.avg) };
  }).filter((g) => g.rows.length);
  const recs = [];
  for (const g of groups) {
    const best = g.rows.find((r) => r.n >= 2), worst = [...g.rows].reverse().find((r) => r.n >= 2);
    if (best && worst && best !== worst && best.avg > worst.avg * 1.2) recs.push(`${g.name}: "${best.key}" averages ${fmt(best.avg, metric)} over ${best.n} videos, against ${fmt(worst.avg, metric)} for "${worst.key}" (${worst.n} videos). Try more ${best.key}.`);
  }
  const lengthTop = avg(top.map((r) => Number(r.v.length)).filter(Boolean)), lengthLow = avg(low.map((r) => Number(r.v.length)).filter(Boolean));
  if (lengthTop && lengthLow && Math.abs(lengthTop - lengthLow) > 8) recs.push(`Your top third runs ${Math.round(lengthTop)} s on average; your bottom third ${Math.round(lengthLow)} s.`);
  if (!recs.length) recs.push('No clear difference yet: tag more videos (engine, category, hook, ending) and add at least two videos per group.');
  return { enough: true, n: rows.length, metric, overall, top, low, groups, recs, caveat: rows.length < 12 ? `Based on only ${rows.length} videos: treat these as hints, not rules.` : `Based on ${rows.length} of your videos. Patterns are correlations, not guarantees.` };
}
export const fmt = (x, m) => (x == null ? '–' : m === 'views' ? Math.round(x).toLocaleString() : `${x.toFixed(1)}${m === 'apv' || m === 'stayed' ? '%' : ''}`);
