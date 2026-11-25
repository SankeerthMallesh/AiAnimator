// Narration for ElevenLabs: lines split at sentence breaks, dramatic pauses as line breaks and "...", a delivery
// note for each line, and the same voice for the whole video. A real voiceover is made through the site's own
// /api/speakall (ElevenLabs on the server when it has a key; it says which voice engine really spoke).
import { words } from './util.js';
import { REAL_VOICES } from '../../shared/voicechars.js';
export { REAL_VOICES };

const DELIVERY = [[/\?$/, 'curious'], [/!$/, 'excited'], [/\b(but|until|suddenly|then)\b/i, 'tense'], [/\b(secret|nobody|never|forbidden|dark|alone)\b/i, 'mysterious'], [/\b(died|lost|gone|cried)\b/i, 'sad'], [/\b(you see|here'?s the|turns out)\b/i, 'dramatic']];
export const deliveryOf = (line) => (DELIVERY.find(([re]) => re.test(line.trim())) || [null, 'warm'])[1];

/** copy-and-paste text for ElevenLabs v3: delivery tags, a pause before the turn and the ending */
export function elevenScript(lines, { tags = true } = {}) {
  return lines.map((l, i) => {
    const d = deliveryOf(l), pause = i > 0 && (/\b(you see|here'?s the|but|turns out)\b/i.test(l) || i === lines.length - 1) ? '... ' : '';
    return `${tags ? `[${d}] ` : ''}${pause}${l.replace(/\s*—\s*/g, '... ')}`;
  }).join('\n\n');
}

/** makes the voiceover; returns { blob, voiceUsed, perLine (word timings), cuts, duration } or throws a plain error */
export async function makeVoice(lines, voiceName, expression = 'natural') {
  const res = await fetch('/api/speakall', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, deliveries: lines.map(deliveryOf), eleven: voiceName, expression }) }).catch(() => null);
  if (!res) throw new Error('Could not reach the voice service. Check the connection and try again.');
  if (res.status === 401) throw new Error('Studio needs the Loomy access code: open the home page and enter it first.');
  const type = res.headers.get('Content-Type') || '';
  if (!/audio/.test(type)) { const j = await res.json().catch(() => ({})); throw new Error(`No voiceover was made: ${j.error || 'the voice service is not set up on this site (it needs ELEVEN_KEY, or the Gemini and Groq keys, in the Cloudflare settings)'}.`); }
  const blob = await res.blob();
  let perLine = []; try { perLine = JSON.parse(res.headers.get('X-Loomy-Words') || '[]'); } catch { perLine = []; }
  let cuts = []; try { cuts = JSON.parse(res.headers.get('X-Loomy-Cuts') || '[]'); } catch { cuts = []; }
  const duration = await new Promise((ok) => { const a = new Audio(URL.createObjectURL(blob)); a.onloadedmetadata = () => ok(a.duration); a.onerror = () => ok(0); });
  return { blob, voiceUsed: res.headers.get('X-Loomy-Voice') || 'unknown', note: res.headers.get('X-Loomy-Note') || '', perLine, cuts, duration };
}
export const estSeconds = (lines) => lines.reduce((a, l) => a + words(l).length / 2.6, 0);
