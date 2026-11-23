// Loomy 2.0: the 2.5D maps the Cartoons engine builds in code (tools/c3d-src/src/sets.ts), how a script picks one
// for each line (the writer's "map", else the line's own words, else the topic), what the lead does there (the
// writer's "do", else the line's verbs), and how the cast's outfit and accessories are drawn.

export const MAPS = ['cell', 'cellblock', 'banklobby', 'vault', 'spacecabin', 'spacetoilet', 'control', 'cockpit', 'classroom', 'office',
  'kitchen', 'diner', 'livingroom', 'bedroom', 'hospital', 'lab', 'courtroom', 'museum', 'castle', 'shop', 'tunnel', 'trench', 'camp',
  'beach', 'desert', 'farm'];
/** the riverside town's own places (street = the bank by the bridge) */
export const TOWN = ['street', 'park', 'bridge'];
export const ACTS = ['sit', 'sleep', 'dig', 'eat', 'drink', 'type', 'phone', 'carry', 'walk', 'point', 'cheer', 'think', 'stand'];
export const OUTFITS = ['prison', 'guard', 'astro', 'coat', 'suit', 'chef', 'soldier', 'worker', 'royal', 'casual'];
export const ACCESSORIES = ['headset', 'cigar', 'shades', 'glasses', 'chain', 'headlamp', 'tie', 'badge', 'nametag', 'patch'];

const SPACEY = /\b(astronauts?|space station|\biss\b|in orbit|spacecraft|nasa|zero gravity|weightless|in space|spaceship|space shuttle)\b/;
// Ordered: the first rule whose words are in the line wins.
const RULES = [
  [/\b(mission control|houston|ground control|launch control|countdown)\b/, 'control'],
  [/\b(cockpit|capsule|windshield|pilot\w*|docking)\b/, 'cockpit'],
  [/\b(toilets?|flush\w*|bathroom|pee|poop|urine)\b/, (t, all) => (SPACEY.test(all) ? 'spacetoilet' : '')],
  [/\b(vault|heist|robbery|robbed|safe deposit|gold bars?|loot)\b/, 'vault'],
  [/\b(banks?|teller|loan|deposit\w*|withdraw\w*)\b/, 'banklobby'],
  [/\b(guards?|warden|cell ?block|patrol\w*|headcount|lockdown|search\w*)\b/, (t, all) => (/\b(prison|jail|inmates?|cells?)\b/.test(all) ? 'cellblock' : '')],
  [/\b(prison\w*|jail\w*|inmates?|cells?|behind bars|locked up|sentenced|convict\w*)\b/, 'cell'],
  [/\b(tunnel\w*|mines?|miners?|mining|underground|cave|dug|digging)\b/, 'tunnel'],
  [/\b(space station|\biss\b|astronauts?|orbit\w*|zero gravity|weightless|floating)\b/, 'spacecabin'],
  [/\b(trench\w*|battlefield|war|battles?|soldiers?|army|troops|bomb\w*|front line)\b/, 'trench'],
  [/\b(court\w*|judge|trial|lawyers?|jury|guilty|verdict)\b/, 'courtroom'],
  [/\b(hospital|doctors?|nurses?|surgery|patients?|sick|illness|virus|vaccines?)\b/, 'hospital'],
  [/\b(lab|laboratory|scientists?|experiment\w*|chemicals?|invent\w*)\b/, 'lab'],
  [/\b(museum|paintings?|artists?|statues?|exhibit\w*|gallery)\b/, 'museum'],
  [/\b(kings?|queens?|castles?|throne|knights?|medieval|royal|kingdom|princes?|princess)\b/, 'castle'],
  [/\b(classroom|school|teachers?|students?|exams?|homework|class)\b/, 'classroom'],
  [/\b(office|boss|meeting|coworkers?|emails?|job|work\w*|desk)\b/, 'office'],
  [/\b(restaurant|diner|burgers?|milkshakes?|waiter|waitress|cafe|fries)\b/, 'diner'],
  [/\b(kitchen|cook\w*|chefs?|recipes?|bak(e|ed|ing)|oven|fridge)\b/, 'kitchen'],
  [/\b(shops?|stores?|supermarket|cashier|bought|buying|sold)\b/, 'shop'],
  [/\b(beds?|bedroom|asleep|slept|sleep\w*|dreams?|nap\w*|woke)\b/, 'bedroom'],
  [/\b(couch|sofa|tv|television|living room|at home|family)\b/, 'livingroom'],
  [/\b(camp\w*|forest|woods|hik\w*|tent|campfire)\b/, 'camp'],
  [/\b(beach|ocean|island|surf\w*|sand)\b/, 'beach'],
  [/\b(desert|sahara|egypt\w*|pyramids?|cactus|dunes?)\b/, 'desert'],
  [/\b(farm\w*|cows?|barn|crops?|harvest|tractor)\b/, 'farm'],
];
// In a line the most specific place wins (the rules are ordered: "the bank vault" is the vault).
function byRules(text, all) {
  for (const [re, to] of RULES) if (re.test(text)) { const m = typeof to === 'function' ? to(text, all) : to; if (m) return m; }
  return '';
}
// In a topic the place it names first wins ("the prisoner who tunneled into a bank" starts in the cell).
function byFirst(text, all) {
  let best = '', at = Infinity;
  for (const [re, to] of RULES) {
    const m = re.exec(text); if (!m || m.index >= at) continue;
    const map = typeof to === 'function' ? to(text, all) : to;
    if (map) { best = map; at = m.index; }
  }
  return best;
}
/** the map a line is about ('' when the line names no place): the line first, then the whole story */
export function guessMap(text, topic = '') {
  const t = String(text || '').toLowerCase(), all = `${t} ${String(topic || '').toLowerCase()}`;
  return byRules(t, all) || byFirst(all, all);
}

// The older painted sets, mapped onto the maps.
export const SET_MAP = {
  cabin: 'spacecabin', control: 'control', bunks: 'spacecabin', cockpit: 'cockpit', office: 'office', lab: 'lab', room: 'livingroom',
  shop: 'shop', battlefield: 'trench', castle: 'castle', hospital: 'hospital', museum: 'museum', kitchen: 'kitchen', desert: 'desert',
  forest: 'camp', jungle: 'camp', school: 'classroom', sea: 'beach', underwater: 'beach', snow: 'camp', mountains: 'camp', volcano: 'desert',
};

/** the map for a scene: the writer's pick, else its own words, else its set, else the topic; '' = the town */
export function mapFor(scene = {}, topic = '') {
  if (MAPS.includes(scene.map)) return scene.map;
  if (TOWN.includes(scene.map)) return '';
  const own = byRules(`${scene.narration || scene.line || ''} ${scene.bg || ''}`.toLowerCase(), `${scene.narration || ''} ${topic}`.toLowerCase());
  return own || SET_MAP[scene.set] || guessMap('', topic);
}

const ACT_RULES = [
  [/\b(dig\w*|dug|shovel\w*|tunnel(ed|ing)?)\b/, 'dig'],
  [/\b(asleep|slept|sleep\w*|nap\w*|snor\w*|bedtime)\b/, 'sleep'],
  [/\b(ate|eat\w*|lunch|dinner|breakfast|burgers?|pizza|sandwich\w*|snacks?|food)\b/, 'eat'],
  [/\b(drank|drink\w*|coffee|tea|soda|juice|sip\w*)\b/, 'drink'],
  [/\b(typ(e|ed|ing)|computers?|hack\w*|keyboard|cod(e|ing)|laptop)\b/, 'type'],
  [/\b(phone\w*|called|calling|texted|dial\w*|radio(ed)?)\b/, 'phone'],
  [/\b(stole|steal\w*|cash|money|loot|carr(y|ied|ies|ying)|bags?)\b/, 'carry'],
  [/\b(sat|sits?|sitting|waited|waiting|watch(ed|ing)? tv|seated)\b/, 'sit'],
];
/** what the lead does in a scene: the writer's "do", else the line's verbs ('' = they just stand and react) */
export function actFor(scene = {}) {
  const d = String(scene.do || '').toLowerCase();
  if (ACTS.includes(d)) return ['walk', 'point', 'cheer', 'think', 'stand'].includes(d) ? '' : d;
  const t = String(scene.narration || scene.line || '').toLowerCase();
  for (const [re, a] of ACT_RULES) if (re.test(t)) return a;
  return '';
}

const HAIR = { brown: '#7a4a28', black: '#2a2422', blonde: '#d8a845', red: '#b8522c', gray: '#9a9a9a', grey: '#9a9a9a' };
const CAPPED = ['cap', 'officer', 'conductor', 'flatcap'];
const OWN_HATS = { beanie: 'beanie', hardhat: 'hardhat', chef: 'chef', crown: 'crown', helmet: 'helmet', tophat: 'tophat', fedora: 'tophat', bowler: 'tophat' };
/** a cast member as the engine draws them (tools/c3d-src/src/toon.ts Outfit): clothes from the outfit, hat, hair, accessories */
export function outfitLook(c = {}) {
  const outfit = OUTFITS.includes(c.outfit) ? c.outfit : c.costume === 'labcoat' ? 'coat' : c.costume === 'suit' ? 'suit' : 'casual';
  const color = c.color || '#3f6fb5';
  const base = {
    prison: { jacket: '#f08a2c', pants: '#e07a22', suit: 'prison' },
    guard: { jacket: '#8a97a8', pants: '#3b3f52', suit: 'guard' },
    astro: { jacket: /^#/.test(color) ? color : '#f2c230', pants: '#4a5060', suit: 'astro' },
    coat: { jacket: '#f2f4f7', pants: '#3b3f52', suit: 'coat' },
    suit: { jacket: '#2c3e6b', pants: '#23304f', suit: 'suit' },
    chef: { jacket: '#f4f1ea', pants: '#3b3f52', suit: 'chef' },
    soldier: { jacket: '#5a6b3a', pants: '#4a5530' },
    worker: { jacket: color, pants: '#3b4f7a' },
    royal: { jacket: '#7a2a8a', pants: '#3b2a52' },
    casual: { jacket: color, pants: '#3b3f52' },
  }[outfit];
  const implied = { guard: 'cap', soldier: 'helmet', worker: 'hardhat', royal: 'crown', chef: 'chef' }[outfit];
  const hatWord = c.hat && c.hat !== 'none' && c.hat !== 'headset' && c.hat !== 'bun' ? c.hat : implied || '';
  const hat = OWN_HATS[hatWord] || (CAPPED.includes(hatWord) ? 'cap' : 'hair');
  const cap = hatWord === 'officer' || outfit === 'guard' ? '#2e3f73' : hatWord === 'hardhat' ? '#f2c230' : hatWord === 'beanie' ? (c.color || '#c8102e') : (c.color || '#e2453c');
  const acc = [...new Set([...(Array.isArray(c.acc) ? c.acc : []).filter(a => ACCESSORIES.includes(a)), ...(c.hat === 'headset' ? ['headset'] : []),
    ...(outfit === 'guard' ? ['badge'] : [])])].slice(0, 4);
  return { ...base, hat, cap, hair: HAIR[c.hair] || HAIR.brown, buttons: '#f4f1ea', dress: '', acc, boots: '#4a3426' };
}

/** one build seed per video, so every shot in a map sees the same room (and each video gets its own variation) */
export function mapSeed(script = {}) {
  const s = `${script.title || ''}|${script.topic || ''}`;
  let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 1 + (h % 997);
}

// When the writer gave nobody an outfit: dress the cast for the story (inmates and a guard for a prison story...).
const STORY_OUTFITS = [
  [/\b(prison\w*|jail\w*|inmates?|escape\w*|cells?)\b/, ['prison', 'guard', 'prison', 'guard'], [['headlamp'], ['shades'], ['cigar', 'chain'], []]],
  [/\b(astronauts?|space|nasa|orbit|rocket|mission control)\b/, ['astro', 'astro', 'coat', 'astro'], [['headset'], [], ['headset', 'glasses'], []]],
  [/\b(bank|heist|robbery|vault|money)\b/, ['suit', 'guard', 'casual', 'suit'], [['shades', 'chain'], ['badge'], ['cigar'], []]],
  [/\b(hospital|doctors?|nurses?|surgery|virus|medicine)\b/, ['coat', 'coat', 'casual', 'coat'], [['glasses'], [], [], []]],
  [/\b(war|battle|soldiers?|army|trench\w*)\b/, ['soldier', 'soldier', 'soldier', 'suit'], [[], [], [], []]],
  [/\b(kings?|queens?|castles?|knights?|medieval|royal)\b/, ['royal', 'soldier', 'casual', 'royal'], [[], [], [], []]],
  [/\b(kitchen|chefs?|restaurant|cook\w*|recipe)\b/, ['chef', 'casual', 'chef', 'suit'], [[], [], [], []]],
  [/\b(lab|scientists?|experiment|chemistry|invent\w*)\b/, ['coat', 'coat', 'casual', 'suit'], [['glasses'], [], [], []]],
  [/\b(court|judge|trial|lawyers?|jury)\b/, ['suit', 'suit', 'casual', 'guard'], [['tie'], [], [], ['badge']]],
  [/\b(mines?|miners?|tunnel\w*|construction|builders?)\b/, ['worker', 'worker', 'casual', 'suit'], [['headlamp'], [], [], []]],
];
export function storyOutfits(topic = '', n = 3) {
  const t = String(topic).toLowerCase();
  const hit = STORY_OUTFITS.find(([re]) => re.test(t));
  return Array.from({ length: n }, (_, i) => hit ? { outfit: hit[1][i % 4], acc: hit[2][i % 4] } : null);
}
