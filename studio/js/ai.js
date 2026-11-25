// The site's own writer (/api/write: Cloudflare AI, Gemini or Groq on the server; no key in the page).
let ok = null;
export async function aiReady() {
  if (ok !== null) return ok;
  try { const r = await fetch('/api/config', { credentials: 'same-origin' }); ok = r.ok && !!(await r.json()).ai; } catch { ok = false; }
  return ok;
}
/** asks the writer for JSON; throws a plain-English error when it cannot answer */
export async function askJSON(system, user, { temperature = 0.85, max_tokens = 5000, signal } = {}) {
  if (!(await aiReady())) throw new Error('The AI writer is not connected on this site, so nothing was generated. The rest of Studio (characters, scenes you write, subtitles, retention check, analytics, export) still works.');
  let res;
  try {
    res = await fetch('/api/write', { method: 'POST', credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature, max_tokens }) });
  } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Could not reach the AI writer. Check your connection and try again.'); }
  if (res.status === 401) throw new Error('Studio needs the Loomy access code: open the home page and enter it, then try again.');
  const data = await res.json().catch(() => ({}));
  if (!data.text) throw new Error(data.error ? `The AI writer said: ${data.error}` : 'The AI writer did not answer. Try again in a moment.');
  return parseJSON(data.text);
}
export function parseJSON(text) {
  const s = String(text).replace(/```(json)?/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The AI writer answered in an unexpected format. Try again.');
  try { return JSON.parse(s.slice(a, b + 1)); } catch { throw new Error('The AI writer answered in an unexpected format. Try again.'); }
}
