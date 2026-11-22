// Settings + project history, kept in this browser only (localStorage).
// Every read/write is wrapped so private windows / blocked storage never break the app.

const SETTINGS_KEY = 'explainer.settings.v1';
const HISTORY_KEY = 'explainer.history.v1';

export const DEFAULT_SETTINGS = {
  autoTighten: true,              // 1.2: cut long voice pauses after each export
  // Script writer (LLM)
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
  runwayKey: '', falKey: '', falModel: 'fal-ai/kling-video/v2.1/standard/image-to-video', videoProvider: 'auto',
  hfToken: '',
  // Voice
  ttsEngine: 'kokoro',            // kokoro | pollinations | none
  voice: 'am_michael',
  voiceSpeed: 1.04,
  cloudVoice: 'onyx',
  // Output
  // Fast by default: 720p / 24 fps / flat camera / no dust overlay renders far quicker, especially on
  // laptops. Switch 3D camera, atmosphere and 1080p back on in Settings for the full cinematic look.
  quality: '1080',                // 720 | 1080 | 1440
  depth3d: 'auto',                // auto | off
  atmosphere: false,
  elevenKey: '', elevenVoice: '', elevenModel: 'eleven_v3',
  realVoice: 'auto',              // 1.6: the real (ElevenLabs) voice by name, or auto
  expression: 'expressive',       // 1.6: expressive | natural | steady
  fps: 30,
  speed: 'balanced',              // fast | balanced | best (big upgrade)
  captionStyle: 'classic',        // word | classic | bold | box | minimal | off
  showTitle: false,
  stickers: false,                // floating stickers/icons for things the narrator mentions (off: they read as clutter)
  showProgress: false,
  handle: '',
  factCheck: true,
  reviewFirst: false,
  musicVolume: 0.55,
  theme: 'system',                // system | light | dark
  settingsVersion: 7,
};

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
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
    for (const k of ['quality', 'fps', 'depth3d', 'atmosphere', 'captionStyle', 'showTitle', 'voice', 'voiceSpeed']) merged[k] = DEFAULT_SETTINGS[k];
    merged.settingsVersion = DEFAULT_SETTINGS.settingsVersion;
  }
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
