// Visual styles, music moods, voices and example prompts shared by the UI and the pipeline.

export const STYLES = {
  'toon-host': {
    label: 'Cartoon host',
    hint: 'An animated hand-drawn character explains the topic in front of a colourful 3D world',
    mascot: true,
    lead: 'Bright colorful 2D cartoon background from a kids animated TV show, daytime, empty scene with nobody in it',
    prompt: 'flat bright colors, simple shapes with clean dark outlines, cheerful, open ground in the lower middle, scenery and objects only',
    direction: 'An animated cartoon host character is added on top of every shot automatically, so each "visual" must describe ONLY the place and the objects the narration talks about (for example: a railroad track with a gap between two rails, a steel bridge, a factory floor, a desert, the inside of an engine) as a bright, simple cartoon scene. Name the concrete objects (a red car on a country road, a lottery counter in a shop, a steel rail with a gap). NEVER put people, characters, faces or animals in a visual. Keep the lower middle of the frame open ground where the host can stand. Give every scene a "prop": an animated cartoon object shown beside the host that illustrates the line (earth, moon, eclipse = Earth\'s shadow crossing the Moon, ship = a ship sinking below the horizon, stick = a stick and its moving shadow, train, car, rocket, bulb = an idea, question, exclaim, money, clock, book, magnet, thermometer, heart, gear, atom, star, fire, drop = water, bolt = electricity); use a real prop on most scenes and vary them. Use "shot": "close" for reactions and punchlines, "wide" otherwise. Give every scene a "pose", "emotion" and "side" for the host that match the line being spoken, and change them from scene to scene.',
  },
  'cgi-short': {
    label: '3D render short',
    hint: 'Clean, realistic 3D animation renders, like popular 3D explainer Shorts',
    lead: '3D animated CGI render, Blender animation still, not a photograph',
    prompt: '3D computer animation, smooth matte materials, clean simple set, soft studio lighting, muted colors, frame from a 3D animated explainer video, everyone fully clothed',
    direction: 'Direct it like a 3D animated explainer Short. Prefer shots WITHOUT people: standalone 3D models of organs (lungs, brain, heart, blood cells), objects, machines, cutaways of mechanisms, landscapes, maps, side-by-side comparisons, on a plain dark or neutral studio background. Never write close-ups of faces and never describe bodies, skin, mannequins or anatomy on a person. When a person is essential, describe them as small in the frame, fully clothed (say what they wear, e.g. blue hoodie and jeans), seen from behind or from far away, doing the action.',
  },
  'cinematic-3d': {
    label: 'Cinematic 3D',
    hint: 'Realistic-stylized 3D renders, the classic "explainer short" look',
    prompt: 'hyper-detailed stylized 3D render, cinematic CGI animation still, dramatic volumetric lighting, shallow depth of field, rich textures, vivid but natural colors, octane render, 8k detail',
  },
  'animated-film': {
    label: '3D animated film',
    hint: 'Soft, friendly animated-movie characters',
    prompt: '3D animated feature film still, stylized expressive characters, soft global illumination, warm cinematic color grading, highly detailed, family animation movie look',
  },
  'clay': {
    label: 'Claymation',
    hint: 'Handmade stop-motion clay figures',
    prompt: 'claymation stop-motion scene, handcrafted plasticine figures and sets, visible fingerprints in clay, miniature diorama, soft studio lighting, tilt-shift',
  },
  'anime': {
    label: 'Anime',
    hint: 'Painterly anime backgrounds and characters',
    prompt: 'high quality anime film still, painterly detailed background, dramatic sky, clean line art, cinematic composition, studio anime movie look',
  },
  'realistic': {
    label: 'Photoreal',
    hint: 'Documentary-style realistic imagery',
    prompt: 'photorealistic cinematic documentary still, natural lighting, 35mm film look, highly detailed, realistic textures, historically accurate details',
  },
  'painting': {
    label: 'Oil painting',
    hint: 'Museum-style classical paintings',
    prompt: 'classical oil painting, museum masterpiece, rich brush strokes, chiaroscuro lighting, renaissance composition, highly detailed',
  },
  'comic': {
    label: 'Comic book',
    hint: 'Bold inks and halftones',
    prompt: 'bold comic book illustration, clean inks, halftone shading, dynamic composition, vibrant flat colors, graphic novel panel',
  },
  'flat': {
    label: 'Flat vector',
    hint: 'Clean infographic-style illustrations',
    prompt: 'clean flat vector illustration, minimal geometric shapes, smooth gradients, modern infographic style, crisp edges, limited harmonious palette',
  },
};

export const MOODS = {
  mysterious: { label: 'Mysterious', root: 50, scale: 'minor', bpm: 84, pulse: false, prog: [0, 5, 3, 4] },
  epic:       { label: 'Epic',       root: 45, scale: 'minor', bpm: 96, pulse: true,  prog: [0, 5, 2, 6] },
  curious:    { label: 'Curious',    root: 52, scale: 'major', bpm: 104, pulse: true, prog: [0, 4, 5, 3] },
  chill:      { label: 'Chill',      root: 48, scale: 'major', bpm: 80, pulse: false, prog: [0, 5, 3, 4] },
  dark:       { label: 'Dark',       root: 43, scale: 'minor', bpm: 72, pulse: true,  prog: [0, 1, 5, 4] },
  none:       { label: 'No music' },
};

// Kokoro voices that sound good for narration. (a = American, b = British; f/m = female/male)
export const VOICES = [
  ['am_michael', 'Michael — deep US narrator'],
  ['am_fenrir', 'Fenrir — bold US male'],
  ['am_puck', 'Puck — energetic US male'],
  ['am_adam', 'Adam — US male'],
  ['am_eric', 'Eric — US male'],
  ['am_onyx', 'Onyx — low US male'],
  ['bm_george', 'George — British storyteller'],
  ['bm_fable', 'Fable — British male'],
  ['bm_lewis', 'Lewis — British male'],
  ['af_heart', 'Heart — warm US female'],
  ['af_bella', 'Bella — bright US female'],
  ['af_nicole', 'Nicole — soft US female'],
  ['af_sarah', 'Sarah — US female'],
  ['af_nova', 'Nova — US female'],
  ['bf_emma', 'Emma — British female'],
  ['bf_isabella', 'Isabella — British female'],
];

// Voices for the cloud fallback (Pollinations / OpenAI-style names).
export const CLOUD_VOICES = ['onyx', 'echo', 'fable', 'alloy', 'nova', 'shimmer'];

export const LENGTHS = [
  [15, '15 sec'], [30, '30 sec'], [45, '45 sec'], [60, '60 sec'], [90, '90 sec'], [120, '2 min'], [180, '3 min'], [300, '5 min'], [600, '10 min'],
];

export const EXAMPLES = [
  'What could actually move a Cybertruck?',
  'How ancient Greeks proved the Earth was round 2,000 years before satellites',
  'What happens to your body if you swallow a magnet',
  'What would happen if you fell into a black hole',
  'How Roman concrete has lasted 2,000 years',
  'Why octopuses are the closest thing to aliens on Earth',
  'What actually happens to your body when you hold your breath',
];

export const CAMERAS = ['push-in', 'pull-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'orbit', 'vertigo', 'impact'];

// Output frames. ratio = width / height.
export const FORMATS = {
  '9:16': { label: '9:16', hint: 'Shorts · TikTok · Reels', ratio: 9 / 16, image: { width: 864, height: 1536 }, imageCompact: { width: 576, height: 1024 } },
  '16:9': { label: '16:9', hint: 'YouTube video', ratio: 16 / 9, image: { width: 1536, height: 864 }, imageCompact: { width: 1024, height: 576 } },
  '1:1':  { label: '1:1', hint: 'Square post', ratio: 1, image: { width: 1152, height: 1152 }, imageCompact: { width: 768, height: 768 } },
  '4:5':  { label: '4:5', hint: 'Instagram feed', ratio: 4 / 5, image: { width: 1024, height: 1280 }, imageCompact: { width: 704, height: 880 } },
};
export function formatOf(options) {
  const f = options?.format;
  if (f === 'short') return '9:16';
  if (f === 'long') return '16:9';
  return FORMATS[f] ? f : '9:16';
}

// Pacing: how long each shot lasts and how fast the narrator talks.
export const PACES = {
  chill:  { label: 'Chill',  secPerScene: 5.8, voice: 0.94, wps: 2.35 },
  normal: { label: 'Normal', secPerScene: 4.2, voice: 1.0,  wps: 2.55 },
  fast:   { label: 'Fast',   secPerScene: 3.0, voice: 1.12, wps: 2.85 },
};

export const QUALITIES = { '720': 720, '1080': 1080, '1440': 1440 };
export const TRANSITIONS = ['whip', 'zoom', 'fade', 'flash', 'slide', 'glitch'];
// Moving effects drawn over a shot, so stills have real motion in them.
export const EFFECTS = ['none', 'dust', 'bubbles', 'sparks', 'embers', 'rain', 'snow', 'smoke', 'pulse', 'shockwave', 'speed'];
