// Settings + project history, kept in this browser only (localStorage).
// Every read/write is wrapped so private windows / blocked storage never break the app.

const SETTINGS_KEY = 'storyforge.settings.v1';
const HISTORY_KEY = 'storyforge.history.v1';

export const DEFAULT_SETTINGS = {
  autoTighten: true,              // 1.2: cut long voice pauses after each export
  glow: true,                     // 1.2: bloom, sparkles and dust over Cartoons frames
  toonCast: true,                 // 1.5: the 3D town's characters on every set
  // Script writer (LLM)
  bgLook: '3d',                   // 3d (stylized 3D worlds) | flat (simple flat drawings)
  routeMode: 'auto',              // auto | best | free | cheap | fast | manual (the AI Model Router)
  llmProvider: 'auto',            // auto | pollinations | gemini | groq | openrouter
  geminiKey: '', geminiModel: 'gemini-flash-lite-latest',
  groqKey: '', groqModel: 'openai/gpt-oss-120b',
  openrouterKey: '', openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  pollinationsKey: '', pollinationsTextModel: 'openai',
  // Visuals
  imageProvider: 'pollinations',  // pollinations | huggingface | none
  pollinationsImageModel: 'flux',
  videoClips: 'off',              // off | on  (paid: real AI video clips per shot)
  videoModel: 'wan-fast',
  hfToken: '',
  // Voice
  ttsEngine: 'kokoro',            // kokoro | pollinations | none
  voice: 'am_michael',
  voiceSpeed: 1.04,
  cloudVoice: 'onyx',
  // Output
  // The picture is drawn in code, so 1080p / 30 fps renders in seconds even on ordinary laptops.
  quality: '1080',                // 720 | 1080 | 1440
  depth3d: 'off',
  atmosphere: false,
  elevenKey: '', elevenVoice: '', elevenModel: 'eleven_v3',
  realVoice: 'auto',              // 1.6: the real (ElevenLabs) voice by name, or auto
  expression: 'natural',          // 1.6: expressive | natural | steady (2.2: Natural by default, it sounds like a person)
  runwayKey: '', falKey: '', falModel: 'fal-ai/kling-video/v2.1/standard/image-to-video', videoProvider: 'auto',
  fps: 30,                        // Balanced speed (big upgrade): 30 fps renders twice as fast as 60
  speed: 'balanced',              // fast | balanced | best
  captionStyle: 'word',           // word | classic | bold | box | minimal | off
  showTitle: false,
  stickers: true,                 // 1.6: topic icons (a glass badge with the line's thing: a sword for war) are on by default
  showProgress: false,
  handle: '',
  factCheck: true,
  reviewFirst: false,
  musicVolume: 0.55,
  theme: 'system',                // system | light | dark
  settingsVersion: 11,
};

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

// ---------- My characters: a saved cast that comes back in every video ----------
const CREW_KEY = 'loomy.crew.v1';
export function loadCrew() {
  try { const a = JSON.parse(safeGet(CREW_KEY) || '[]'); return Array.isArray(a) ? a.filter(c => c && c.name).slice(0, 8) : []; }
  catch { return []; }
}
export function saveCrew(list) { return safeSet(CREW_KEY, JSON.stringify(list.slice(0, 8))); }
// Adds (or updates, by name) characters from a video's cast. Returns the names saved.
export function addToCrew(cast) {
  const crew = loadCrew();
  const saved = [];
  for (const c of cast || []) {
    if (!c?.name) continue;
    const look = { name: c.name, color: c.color, hat: c.hat, hair: c.hair, costume: c.costume };
    const old = crew.find(k => k.name.toLowerCase() === c.name.toLowerCase());
    if (old) Object.assign(old, look);
    else {
      if (crew.length >= 8) break;
      let id = c.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'pal';
      for (let n = 2; crew.some(k => k.id === id); n++) id = id.slice(0, 5) + n;
      crew.push({ id, ...look, on: true });
    }
    saved.push(c.name);
  }
  saveCrew(crew);
  return saved;
}

export function loadSettings() {
  const raw = safeGet(SETTINGS_KEY);
  let saved = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { saved = {}; }
  // The old default Gemini model was a slow 'thinking' model; move people who never changed it to the fast one.
  if (saved.geminiModel === 'gemini-flash-latest') saved.geminiModel = 'gemini-flash-lite-latest';
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  // One-time move to the fast defaults for people who already have saved settings (keys are kept).
  if (saved.settingsVersion !== DEFAULT_SETTINGS.settingsVersion) {
    for (const k of ['quality', 'fps', 'depth3d', 'atmosphere', 'captionStyle', 'showTitle', 'voice', 'voiceSpeed', 'stickers']) merged[k] = DEFAULT_SETTINGS[k];
    merged.settingsVersion = DEFAULT_SETTINGS.settingsVersion;
  }
  // 2.2: one time, the old Very expressive default moves to Natural (it sounds like a person, not acted)
  if (!saved.v22) { if (merged.expression === 'expressive') merged.expression = 'natural'; merged.v22 = 1; }
  // 1.6: captions are always on, in every tab.
  if (!merged.captionStyle || merged.captionStyle === 'off') merged.captionStyle = DEFAULT_SETTINGS.captionStyle;
  if (merged.quality === 'hd') merged.quality = '1080';
  if (merged.quality === 'fast') merged.quality = '720';
  return merged;
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadHistory() {
  const raw = safeGet(HISTORY_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

// Projects are stored without images/audio (those are re-created from the same seeds).
export function saveProjectToHistory(project) {
  const slim = {
    id: project.id,
    createdAt: project.createdAt,
    topic: project.topic,
    options: project.options,
    script: project.script,
    factCheckNotes: project.factCheckNotes || [],
    factChecked: project.factChecked === true,
    factStatus: project.factStatus || '',
  };
  const list = loadHistory().filter(p => p.id !== project.id);
  list.unshift(slim);
  while (list.length > 30) list.pop();
  // If storage is full, drop the oldest entries until it fits.
  while (list.length && !safeSet(HISTORY_KEY, JSON.stringify(list))) list.pop();
}

export function deleteFromHistory(id) {
  safeSet(HISTORY_KEY, JSON.stringify(loadHistory().filter(p => p.id !== id)));
}
