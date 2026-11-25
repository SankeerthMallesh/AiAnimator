// Subtitles: cues of 2-4 words from the real voiceover word timings (when a voiceover was made) or from the scene
// durations (estimated, and labelled so). Exports SRT, WebVTT and ASS (1080x1920, big bold text, safe margins for
// the Shorts buttons, per-word highlight with karaoke timing when real word timings exist).
import { words } from './util.js';

const MAX_W = 4, MAX_CH = 22;
function chunk(ws) {
  const out = []; let cur = [];
  for (const w of ws) {
    const len = cur.map((x) => x.w).join(' ').length + w.w.length + 1;
    if (cur.length && (cur.length >= MAX_W || len > MAX_CH || /[.!?,;:]$/.test(cur[cur.length - 1].w))) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out.map((c) => ({ start: c[0].s, end: c[c.length - 1].e, text: c.map((x) => x.w).join(' '), words: c }));
}
/** from real timings: perLine = [[[start, end, word], ...], ...] */
export function cuesFromVoice(perLine) {
  const ws = perLine.flat().map(([s, e, w]) => ({ s, e, w }));
  return tidy(chunk(ws));
}
/** estimated: each scene's words spread evenly over its duration */
export function cuesFromScenes(scenes) {
  let t = 0; const ws = [];
  for (const sc of scenes) {
    const w = words(sc.narration), d = Number(sc.duration) || 2;
    w.forEach((x, i) => ws.push({ s: t + (d * i) / w.length, e: t + (d * (i + 1)) / w.length, w: x }));
    t += d;
  }
  return tidy(chunk(ws));
}
function tidy(cues) {
  cues.forEach((c, i) => { const n = cues[i + 1]; if (n && c.end > n.start) c.end = n.start; if (n && n.start - c.end < 0.25) c.end = n.start; c.start = +c.start.toFixed(3); c.end = +Math.max(c.start + 0.3, c.end).toFixed(3); });
  return cues;
}
const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
const ts = (s, sep = ',') => `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}${sep}${pad(Math.round((s % 1) * 1000), 3)}`;
export const toSRT = (cues) => cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n');
export const toVTT = (cues) => `WEBVTT\n\n${cues.map((c) => `${ts(c.start, '.')} --> ${ts(c.end, '.')} line:72% position:50% align:center\n${c.text}\n`).join('\n')}`;
const assT = (s) => `${Math.floor(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}.${pad(Math.round((s % 1) * 100))}`;
/** ASS for 1080x1920: Montserrat Black 92 px, white with a thick black outline, 560 px above the bottom (clear of the
 *  like/comment buttons and the title), 90 px side margins; the spoken word turns yellow when timings are real */
const assCol = (hex = '#ffffff') => { const h = String(hex).replace('#', '').padEnd(6, 'f'); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };
export function toASS(cues, { karaoke = false, style = {} } = {}) {
  const st = { font: 'Montserrat Black', size: 92, color: '#ffffff', hlColor: '#ffd200', outline: 7, pos: 70, ...style };
  const font = st.font === 'Montserrat' ? 'Montserrat Black' : st.font, marginV = Math.round(1920 * (1 - st.pos / 100));
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Loomy,${font},${st.size},${assCol(st.color)},${assCol(st.color)},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,${st.outline},3,2,90,90,${marginV},1\nStyle: LoomyK,${font},${st.size},${assCol(st.hlColor)},${assCol(st.color)},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,${st.outline},3,2,90,90,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  return head + cues.map((c) => {
    const text = karaoke && c.words?.length ? c.words.map((w, i) => `{\\k${Math.max(1, Math.round(((c.words[i + 1]?.s ?? w.e) - w.s) * 100))}}${w.w}`).join(' ') : c.text;
    return `Dialogue: 0,${assT(c.start)},${assT(c.end)},${karaoke && c.words?.length ? 'LoomyK' : 'Loomy'},,0,0,0,,${karaoke ? text : c.text.replace(/\{/g, '(')}`;
  }).join('\n') + '\n';
}
