// Settings + project history, kept in this browser only (localStorage).
// Every read/write is wrapped so private windows / blocked storage never break the app.

const SETTINGS_KEY = 'storyforge.settings.v1';
const HISTORY_KEY = 'storyforge.history.v1';

export const DEFAULT_SETTINGS = {
  // Script writer (LLM)
  llmProvider: 'auto',            // auto | pollinations | gemini | groq | openrouter
  geminiKey: '', geminiModel: 'gemini-flash-lite-latest',
  groqKey: '', groqModel: 'llama-3.3-70b-versatile',
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
  voice: 'am_puck',
  voiceSpeed: 1.12,
  cloudVoice: 'onyx',
  // Output
  // The picture is drawn in code, so 1080p / 30 fps renders in seconds even on ordinary laptops.
  quality: '1080',                // 720 | 1080 | 1440
  depth3d: 'off',
  atmosphere: false,
  elevenKey: '', elevenVoice: '', elevenModel: 'eleven_multilingual_v2',
  fps: 60,
  captionStyle: 'word',           // word | classic | bold | box | minimal | off
  showTitle: false,
  showProgress: false,
  handle: '',
  factCheck: true,
  reviewFirst: false,
  musicVolume: 0.55,
  theme: 'system',                // system | light | dark
  settingsVersion: 8,
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
