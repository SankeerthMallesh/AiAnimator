export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function toast(msg, bad = false, ms = 4200) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, ms);
}
export function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function copy(text, what = 'Copied') { try { await navigator.clipboard.writeText(text); toast(`${what} to the clipboard.`); } catch { toast('Copy did not work here: select the text and copy it by hand.', true); } }
/** a button shows a spinner and its own label while it works */
export async function busy(btn, label, fn) {
  const old = btn.innerHTML; btn.disabled = true; btn.classList.add('working'); btn.innerHTML = `<span class="spin"></span>${esc(label)}`;
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('working'); btn.innerHTML = old; }
}
export const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
export const fmtTime = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
export const slug = (s) => String(s || 'loomy').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'loomy';
export const STOP = new Set('a an the and or but so of to in on at for with from by is was were are be been it its this that these those he she they we you i his her their our your my me him them us as if then than there here when what who how why not no do does did just very really into out up down over about after before again'.split(' '));
export const content = (s) => words(String(s).toLowerCase().replace(/[^a-z0-9' ]/g, ' ')).filter((w) => w.length > 2 && !STOP.has(w));
