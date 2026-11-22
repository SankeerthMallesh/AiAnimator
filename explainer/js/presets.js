// Visual styles, music moods, voices and example prompts shared by the UI and the pipeline.

export const STYLES = {
  'drawn-3d': {
    label: '3D people, drawn in code',
    hint: 'Realistic 3D people and places built in code, like the hand-made 3D shorts (no AI pictures)',
    drawn: '3d',
    direction: 'Direct it like a fast 3D explainer Short: open with a second-person hook ("What would happen if you fell through the ice?"), then follow ONE or two people through it, cutting every 3 to 4 seconds, and end on the consequence in a short, plain line, never a moral. Describe the main character once in "characters" (name and a short look, saying man or woman). Every scene is played by realistic 3D people in a place built in code, so pick for each scene: "set" (the place), "frame" (the shot: talk = one person talking to camera, two = two people, react = a close-up reaction, wide = an establishing shot, walk = someone walking in, point = pointing at a thing, group = three people, object = a close-up of a thing), "who" (the names in the shot) and "act" (the pose). Put real objects in the story with "thing" and "do": people hold them, show them, drop them, break them, so the video shows what the line is about, not only a person talking. Start with a wide shot, use react for surprises, point or object when the narration shows one thing, and change the set only when the story moves. Give scenes about a measurable thing an "icon" emoji (⚖️ ⏱️ 💨 🌡️ 💰 📏).',
    character: true,
  },
  'drawn-blocky': {
    label: 'Blocky world, drawn in code',
    hint: 'Blocky game-world characters and places built in code, like the hand-made blocky shorts (no AI pictures)',
    drawn: 'blocky',
    character: true,
  },
  'story-3d': {
    label: '3D story short',
    hint: 'Bright 3D renders with one recurring character, like popular 3D story Shorts',
    lead: '3D animated CGI render in Unreal Engine 5 style, not a photograph',
    prompt: 'high quality stylized realistic 3D animation still, bright clean daylight, saturated sky blue and warm tones, smooth soft materials, cinematic camera angle, sharp focus, highly detailed, everyone fully clothed',
    direction: 'For an explainer topic, open with a second-person hook ("What would happen if you jumped into ice water?") and end on the consequence in a short, plain line, never a moral. Tell it as a story about ONE main character, described once in "characters" with a detailed, specific look (age, build, hair, face, clothing colours) that never changes. Show that character in most scenes and say what they are doing. Everyone is always fully dressed (t-shirt and long shorts, or a long-sleeve swim shirt and swim shorts in water): never swimsuits or bare skin, and never describe bodies, skin or body parts in a visual; describe the action instead ("Mia smacks flat onto the water"). Vary the camera like a 3D story Short: extreme close-up of the face, top-down view, low angle, through-the-water or through-an-object view, wide establishing shot. Mark 2 to 4 scenes with "highlight": true where the narration points at one specific object or body part, and name that object first in the visual. Give scenes about a measurable thing (weight, time, speed, temperature, money, distance) an "icon": one emoji for it (⚖️ ⏱️ 💨 🌡️ 💰 📏).',
    character: true,
  },
  'blocky': {
    label: 'Blocky game world',
    hint: 'Chunky block-built characters in a bright game world, story-time style',
    lead: 'Video game screenshot of a blocky low-poly game world, not a photograph',
    prompt: 'blocky game world, characters built from simple blocks with cube heads, rectangular bodies, block arms and legs and square block hands, simple painted faces, sharp focus everywhere, no depth of field, hard daylight, flat shading, bright saturated colors, green grass ground, simple houses and round trees, everyone fully clothed, no studs, not toy bricks, not a minifigure, no logos, no text',
    direction: 'Make it a story-time video like popular game story Shorts: told in the first person ("I", "my"), with names you make up yourself, dramatic and funny, short punchy lines, a cliffhanger in the middle, a twist near the end and a real ending (never end on an open question). Never say "blocky", "pixel", "pixelated" or "voxel" in the narration: the pictures show the look. Describe the main character once in "characters" as a blocky game avatar with specific clothing colours (always fully dressed), and keep them in most scenes. Describe actions, never body parts. Vary the camera: close-ups on blocky faces with big emotions, over-the-shoulder shots, wide shots of the town, snow or forest when the story moves. Mark 2 to 3 scenes with "highlight": true where the narration points at one object.',
    character: true,
    composite: true, // the hero is Loomy's own cube avatar drawn over an empty AI-painted place
    placePrompt: 'blocky game world environment, everything built from simple blocks, video game screenshot, sharp focus everywhere, no depth of field, hard daylight, flat shading, bright saturated colors, green grass ground, simple houses and round trees, no studs, not toy bricks, no logos',
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
  // Ordered by how natural each voice sounds (Kokoro's own quality grades).
  ['af_heart', 'Heart — warm, most natural ★★★'],
  ['af_bella', 'Bella — bright, very natural ★★★'],
  ['af_nicole', 'Nicole — soft, natural ★★'],
  ['bf_emma', 'Emma — British, natural ★★'],
  ['am_michael', 'Michael — deep US narrator ★★'],
  ['am_fenrir', 'Fenrir — bold US male ★★'],
  ['am_puck', 'Puck — energetic US male ★★'],
  ['bm_george', 'George — British storyteller ★'],
  ['bm_fable', 'Fable — British male ★'],
  ['af_jessica', 'Jessica — upbeat US female ★'],
  ['af_river', 'River — relaxed US female ★'],
  ['af_sarah', 'Sarah — US female ★'],
  ['af_nova', 'Nova — US female ★'],
  ['bf_isabella', 'Isabella — British female ★'],
  ['bf_lily', 'Lily — young British female ★'],
  ['am_adam', 'Adam — US male'],
  ['am_eric', 'Eric — US male'],
  ['am_onyx', 'Onyx — low US male'],
  ['am_echo', 'Echo — clear US male'],
  ['am_liam', 'Liam — young US male'],
  ['bm_lewis', 'Lewis — British male'],
  ['bm_daniel', 'Daniel — calm British male'],
];

// Voices for the cloud fallback (Pollinations / OpenAI-style names).
export const CLOUD_VOICES = ['onyx', 'echo', 'fable', 'alloy', 'nova', 'shimmer'];

export const LENGTHS = [
  [15, '15 sec'], [30, '30 sec'], [45, '45 sec'], [60, '60 sec'], [75, '75 sec'], [90, '90 sec'], [120, '2 min'],
  // Long form, told in chapters (llm.js writeLongScript).
  [180, '3 min · long form'], [300, '5 min · long form'], [480, '8 min · long form'], [600, '10 min · long form'], [900, '15 min · long form'],
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

// The drawn Blocky look tells its story like the Blocky style and picks its shots from the library.
STYLES['drawn-blocky'].direction = `${STYLES.blocky.direction.replace(/ Vary the camera:[^.]*\./, '').replace(/ Mark 2 to 3 scenes[^.]*\./, '')} Every scene is played by blocky avatars in a block world built in code, so pick for each scene: "set" (the place), "frame" (the shot: talk = the narrator talking to camera, two = two characters, react = a close-up reaction with a big face, wide = an establishing shot, walk = someone walking in, point = pointing at a thing, group = three characters, object = a close-up of a thing), "who" (the names in the shot; the narrator is the first character), "act" (the pose) and, when the story has an object in it, "thing" and "do" (hold, show, drop, grow, spin, break). Start with a wide shot, use react for the cliffhanger and the twist, point when the narration shows one thing (with an "icon" emoji), and use snow, park, street or night when the story moves.`;

// The 3D tab's Auto look: stories about people get 3D people drawn in code; topics about things, places,
// history or science (which the drawn look cannot show: buildings, machines, planets, organs...) get
// the AI-picture look. Plain word scores, so it is instant, free and testable.
export const AUTO_STYLE = 'auto';
const PEOPLE = /\b(you|your|you're|i|i'm|my|me|we|our|he|she|his|her|they|story|friend|friends|kid|kids|child|person|people|someone|man|woman|boy|girl|family|mom|dad|brother|sister|teacher|boss|neighbou?r|stranger|date|wedding|prank|fight|argument|lost|lied|caught|dared)\b/gi;
const THINGS = /\b(how|why)\b|\b(concrete|building|buildings|bridge|tower|pyramid|pyramids|castle|temple|pantheon|colosseum|cathedral|city|cities|empire|ancient|roman|rome|greek|greece|egypt|egyptian|medieval|war|battle|history|planet|planets|space|moon|sun|star|stars|black hole|galaxy|universe|ocean|sea|volcano|earthquake|mountain|desert|forest|river|animal|animals|octopus|shark|whale|dinosaur|insect|bee|bees|bird|plant|plants|cell|cells|brain|heart|lungs|blood|dna|virus|bacteria|atom|atoms|chemistry|physics|engine|machine|machines|car|cars|truck|cybertruck|plane|rocket|ship|submarine|train|robot|computer|chip|magnet|metal|gold|diamond|oil|electricity|battery|technology|invention|material|materials|recipe|food|honey)\b/gi;
export function pickLook(text) {
  const t = String(text || '');
  const people = (t.match(PEOPLE) || []).length;
  const things = (t.match(THINGS) || []).length;
  // "What would happen if you..." is a person's story even when it names a thing.
  const youStory = /\bwhat (would|will) happen (to you )?if you\b|\bif you (fell|jumped|fall|jump|were|got|lived|stopped|ate|swallowed|held)\b/i.test(t);
  // A person doing something out in the world (falling into ice water, getting lost at sea) is acted by
  // people even when the line names the body; swallowing or eating something stays inside it (pictures).
  const outsideStory = /\bif you (fell|fall|jumped|jump|dove|dived|slipped|got (stuck|lost|stranded|trapped)|were (stuck|lost|stranded|trapped)|walked|ran|climbed)\b/i.test(t) && !/\b(swallow|swallowed|ate|eat|drank|drink|inhaled|breath)\b/i.test(t);
  // Places the drawn sets cannot build (space, the deep sea, volcanoes, the ancient world) need pictures too.
  if (/\b(black holes?|outer space|in space|planets?|the moon|mars|the sun|galaxy|volcano(es)?|lava|underwater|deep sea|ocean floor|dinosaurs?|ancient|rome|roman|egypt|pyramids?)\b/i.test(t)) return 'story-3d';
  // "What happens to your body if you fall into ice water" is acted by a person (the hand-made
  // "frozen lake" film): the drawn people show it, with effects for the heart and breath.
  if (outsideStory) return 'drawn-3d';
  // Inside the body (organs, blood, bones) only pictures can show it, whoever the story is about.
  if (/\byour body\b|\b(stomach|organs?|brain|heart|lungs|blood|bones?|muscles?|cells?|veins?)\b/i.test(t)) return 'story-3d';
  return youStory || people > things ? 'drawn-3d' : 'story-3d';
}
