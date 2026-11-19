// LOOMY AI Model Router: one place that decides which model handles each production step.
// Modes: auto, best, free, cheap (lowest cost), fast, manual. Every step has fallbacks, and the
// Model Hub table in Settings shows exactly what will be used and whether it costs money.
//
// caps.server: the site's own Cloudflare Workers AI is available (FLUX pictures, gpt-oss-120b
// scripts, Deepgram Aura-2 voice), all on the account's free daily allowance.

export const MODES = [
  ['auto', 'Auto: LOOMY picks the best mix'],
  ['best', 'Best quality'],
  ['free', 'Free only'],
  ['cheap', 'Lowest cost'],
  ['fast', 'Fastest'],
  ['manual', 'Manual: my choices below'],
];

const FAL = {
  veo: 'fal-ai/veo3/fast/image-to-video',
  kling: 'fal-ai/kling-video/v2.1/standard/image-to-video',
  hailuo: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
  wan: 'fal-ai/wan/v2.2-a14b/image-to-video',
};
const FAL_NAMES = { [FAL.veo]: 'Google Veo 3 Fast', [FAL.kling]: 'Kling 2.1', [FAL.hailuo]: 'Hailuo 02', [FAL.wan]: 'Wan 2.2' };

export function mode(s) { return MODES.some(m => m[0] === s.routeMode) ? s.routeMode : 'auto'; }

// Script writers in the order they are tried. Free-tier keys (Gemini, Groq, OpenRouter) count as free.
export function writerOrder(s, caps = {}) {
  const m = mode(s);
  const site = caps.server ? 'cloudflare' : 'pollinations';
  const keys = { gemini: !!s.geminiKey, groq: !!s.groqKey, openrouter: !!s.openrouterKey };
  const have = (list) => list.filter(x => x === site || keys[x]);
  // Auto and Manual respect a writer picked in Settings; the site's own writer is always the last resort.
  if ((m === 'auto' || m === 'manual') && s.llmProvider && s.llmProvider !== 'auto') {
    return s.llmProvider === 'pollinations' || s.llmProvider === site ? [site] : [s.llmProvider, site];
  }
  if (m === 'fast') return have(['groq', site, 'gemini', 'openrouter']);
  if (m === 'free' || m === 'cheap') return have([site, 'gemini', 'groq', 'openrouter']);
  // auto, best, manual: the strongest connected writer first.
  return have(['gemini', 'openrouter', 'groq', site]);
}

// Voice: elevenlabs | aura | kokoro (in-browser).
export function voiceChoice(s, caps = {}) {
  const m = mode(s);
  if (s.ttsEngine === 'none') return 'none';
  // ElevenLabs costs money, so Free and Lowest cost never use it.
  if (s.elevenKey && m !== 'free' && m !== 'cheap') return 'elevenlabs';
  return caps.server ? 'aura' : 'kokoro';
}

// Paid image-to-video for animated shots, or null (use the free Shot pack).
export function videoChoice(s) {
  const m = mode(s);
  const fal = !!s.falKey, runway = !!s.runwayKey;
  if (m === 'free' || (!fal && !runway)) return null;
  if (m === 'manual' || m === 'auto') {
    if (s.videoProvider === 'runway' && runway) return { provider: 'runway', model: 'gen4_turbo' };
    if (fal) return { provider: 'fal', model: s.falModel || FAL.kling };
    return { provider: 'runway', model: 'gen4_turbo' };
  }
  if (m === 'best') return fal ? { provider: 'fal', model: FAL.veo } : { provider: 'runway', model: 'gen4_turbo' };
  if (m === 'cheap') return fal ? { provider: 'fal', model: FAL.wan } : { provider: 'runway', model: 'gen4_turbo' };
  if (m === 'fast') return fal ? { provider: 'fal', model: FAL.hailuo } : { provider: 'runway', model: 'gen4_turbo' };
  return null;
}

export function videoName(v) {
  if (!v) return null;
  return v.provider === 'runway' ? 'Runway Gen-4 Turbo' : (FAL_NAMES[v.model] || v.model);
}

const WRITER_NAMES = { cloudflare: 'gpt-oss-120b (your Cloudflare AI)', pollinations: 'Free writer (Pollinations)', gemini: 'Gemini (your key)', groq: 'Groq Llama (your key)', openrouter: 'OpenRouter (your key)' };
const FREE_WRITERS = new Set(['cloudflare', 'pollinations', 'gemini', 'groq', 'openrouter']);

// Rows for the Model Hub table: what each step uses, the fallback, and the cost.
export function hubRows(s, caps = {}, kind = 'cartoon') {
  const w = writerOrder(s, caps);
  const v = voiceChoice(s, caps);
  const vid = videoChoice(s);
  const rows = [];
  rows.push({ step: 'Script & fact-check', model: WRITER_NAMES[w[0]] || w[0], fallback: w.slice(1).map(x => WRITER_NAMES[x] || x).join(' → ') || 'none', cost: FREE_WRITERS.has(w[0]) ? 'Free' : 'Paid' });
  rows.push({ step: kind === 'cartoon' ? 'Backgrounds' : 'Scene pictures', model: caps.server ? 'FLUX.1 schnell (your Cloudflare AI)' : 'Free painter (Pollinations)', fallback: caps.server ? 'Free painter → drawn sets' : 'drawn sets', cost: 'Free' });
  rows.push({ step: 'Voice', model: v === 'elevenlabs' ? 'ElevenLabs (your key)' : v === 'aura' ? 'Deepgram Aura-2 (your Cloudflare AI)' : v === 'none' ? 'No voice' : 'Kokoro (in your browser)', fallback: v === 'kokoro' || v === 'none' ? 'none' : 'Kokoro (in your browser)', cost: v === 'elevenlabs' ? 'Your ElevenLabs plan' : 'Free' });
  rows.push({ step: 'Animated shots', model: vid ? videoName(vid) : 'Shot pack (free credits in Flow, Kling, Magic Hour…)', fallback: vid ? 'drawn animation' : '—', cost: vid ? 'Paid per clip' : 'Free' });
  rows.push({ step: 'Music, sound, captions, edit, export', model: 'LOOMY (in your browser)', fallback: '—', cost: 'Free' });
  return rows;
}

let serverCaps = null;
export async function capabilities() {
  if (serverCaps) return serverCaps;
  try {
    const r = await fetch('/api/config', { credentials: 'same-origin' });
    serverCaps = { server: r.ok ? !!(await r.json()).ai : false };
  } catch { serverCaps = { server: false }; }
  return serverCaps;
}
