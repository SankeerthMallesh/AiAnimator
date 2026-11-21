// Compact storyboard: cast, scenes, and a tiny action language.
// The free writer often returns truncated or slightly wrong JSON. Repair it.
// Never fail a video because one field is missing.

import { splitSentences } from '../../shared/speech.js';
import { PACES, formatOf } from './presets.js';
import { Cast } from './cast.js';
import { PropKit, SetKit } from './props.js';

const WORDS_PER_SECOND = 2.55;


// Words with two meanings: [context that means the other sense, the sticker for that sense ('' = skip)].
// "The sky turns orange at sunset" is a colour, not the fruit.
const WORD_SENSES = {
  orange: [/sky|sunset|sunrise|dusk|dawn|colou?r|light|glow|hue|shade|red|yellow|pink|purple|paint|turns? orange|bright orange|orange (sky|light|glow|colou?r)/, '🎨'],
  lemon: [/colou?r|yellow|paint|\blemon (car|law)/, ''],
  gold: [/medal|prize|winner|first place|olympic/, '🥇'],
  mouse: [/computer|click|cursor|keyboard|screen/, '🖱️'],
  bat: [/baseball|cricket|swing|hit|batter|pitch/, '⚾'],
  wave: [/light|sound|radio|micro|wavelength|electromagnetic|signal|frequenc|hand|wav(e|ing) (hello|goodbye)/, '〰️'],
  cell: [/phone|battery|solar|prison|jail|spreadsheet/, ''],
  plant: [/power|factory|nuclear|manufactur/, '🏭'],
  apple: [/iphone|mac\b|steve jobs|company|tech|stock/, '📱'],
  bank: [/river|stream|shore/, '🏞️'],
  key: [/keyboard|piano|key (idea|point|fact|part|reason)|the key (is|to)/, ''],
  star: [/celebrit|famous|movie star|pop star|rock star|rating|review/, ''],
  ruler: [/king|queen|emperor|empire|kingdom|reign|throne/, '👑'],
  spring: [/like a spring|coil|twist|bounc|metal|stretch|compress|squeez|jump/, '🌀'],
  fall: [/\b(falls?|falling|fell|drop)\b/, ''],
};
const VAGUE_EMOJI = new Set(['⚠', '🚪', '❓', '❔', '❗', '❕', '✨', '💧', '⚙', '📦', '⏱', '⏰', '💡', '⭐', '🌟', '💥', '🎉', '👍', '✅', '❌', '🔍', '🔎', '📈', '📉', '💭', '💬', '🗯', '❤', '🔥', '⚡', '🌀', '💫', '🎯', '🏆', '📌', '📝', '📚', '📖', '🧩', '🔑']);
const TOON_WORDS = {
  stick: /\b(sticks?|shadows?|poles?)\b/, atom: /\b(atoms?|molecules?|particles?|electrons?|protons?|chemi\w*)\b/, book: /\b(books?|read\w*|librar\w*|wr[io]te?\w*|stud\w*)\b/,
  earth: /\b(earth|globe|planets?|world|round)\b/, moon: /\b(moons?|lunar)\b/, eclipse: /\beclipse/, ship: /\b(ships?|boats?|sail\w*|horizon|seas?|oceans?)\b/,
  thermometer: /\b(temperat\w*|hot|cold|heat\w*|degrees?|thermo\w*|warm\w*|freez\w*)\b/,
};

// A sticker or prop must stand for a thing the line names literally: never a colour, a describing
// word, or a word inside a figure of speech ("orange sunset", "felt blue", "time flies").
const COLOUR_WORDS = /^(red|orange|yellow|green|blue|purple|violet|pink|brown|black|white|grey|gray|gold|golden|silver)$/;
const DESCRIBING = /^(cool|hot|cold|warm|big|small|huge|tiny|fast|slow|sweet|sour|sharp|bright|dark|happy|sad|angry|funny|weird|strange|crazy|wild|smart|good|bad|great|nice|heavy|light|loud|quiet|soft|hard|new|old|fresh|dry|wet)$/;
const FIGURES = [/\b(orange|red|pink|golden|purple) (sunsets?|skies|sky|glow|light|dawn|dusk)\b/, /\b(felt|feel|feeling|feels|is|was|looked) blue\b/, /\bcool (idea|move|trick|thing)\b/,
  /\bapple of (my|his|her|your|their|our) eyes?\b/, /\bbrain ?freeze\b/, /\btime flies\b/, /\bpiece of cake\b/, /\bbreak the ice\b/, /\bcold feet\b/, /\bunder the weather\b/,
  /\braining cats and dogs\b/, /\bon fire\b/, /\b(on|off|back on) track\b/, /\btrack record\b/, /\bkeep(s|ing)? track\b/, /\bheart of gold\b/, /\bspill the beans\b/, /\bhot potato\b/, /\bin hot water\b/];
// Small writers sometimes pad a line to its word count, or tack the scene's prop name onto it
// ("...smooth rides ticket", "...myths, bulb", "...eyes wide today"). Those tails are removed.
const OBJECT_WORDS = () => new Set([...PropKit.KINDS, ...Cast.HOLDS, 'prop', 'icon', 'emoji']);
const KEEP_BEFORE = /^(a|an|the|his|her|their|my|your|our|its|this|that|one|giant|tiny|little|old|new|big|small|brass|golden|silver|wooden|steel|paper|train|bus|movie|parking|lottery|gold|magic|secret|first|last)$/i;
const FILLER_TAIL = /[\s,]+(today|daily|now|really|here|indeed|right now|literally)$/i;
export function tidyLine(line) {
  let t = String(line || '').trim();
  for (let k = 0; k < 2; k++) {
    const end = /[.!?…]["')\]]*$/.exec(t)?.[0] || '';
    let body = end ? t.slice(0, -end.length) : t;
    const m = /^(.*?)([\s,—–-]+)([A-Za-z]+)$/.exec(body);
    if (m && OBJECT_WORDS().has(m[3].toLowerCase())) {
      const prev = (/([A-Za-z']+)\W*$/.exec(m[1]) || [])[1] || '';
      if (/[,—–-]/.test(m[2]) || !KEEP_BEFORE.test(prev)) body = m[1];
    }
    if (FILLER_TAIL.test(body) && body.split(/\s+/).length > 5) body = body.replace(FILLER_TAIL, '');
    const next = (body.replace(/[\s,—–-]+$/, '') + end).trim();
    if (next === t) break;
    t = next;
  }
  return /[.!?…]["')\]]*$/.test(t) ? t : `${t}.`;
}

// Grammar a small writer gets wrong ("leo grab cold cones on sunny street"): names and the first
// word capitalised, a verb after one named person agreeing with it ("Leo grabs"), and "a" before an
// adjective and a place or time word after a preposition ("on a sunny street"; "in cold water" stays).
const BASE_VERBS = 'grab take run jump walk say look find make give show tell know want need try ask see hear build fix pull push open close hold carry drop throw catch flip check measure warn block point smile laugh shout grin wave buy sell pay win lose eat drink cook bake swim climb fall read write sing play stop start wait watch notice realize decide explain claim insist sigh nod shrug freeze gasp race chase stare spot sneak rush dash slam grab snap rip lift'.split(' ');
const PREPS = 'on|at|in|to|from|by|near|onto|into|across|along|down|up|through|past';
const ADJ = 'sunny|busy|quiet|old|small|big|dark|long|empty|crowded|narrow|wide|tiny|huge|rainy|windy|snowy|cold|hot|freezing|steep|muddy|dusty|noisy|new|giant|secret|hidden|broken|rusty|shiny';
const PLACE_NOUNS = 'street|road|day|night|morning|evening|afternoon|hill|beach|train|platform|track|bridge|town|city|field|farm|house|room|corner|station|ship|boat|island|path|trail|mountain|square|market|shop|lab|kitchen|yard|stage|bench|rooftop|tunnel|cave|forest|desert|river|lake';
const ARTICLE_RE = new RegExp(`\\b(${PREPS})\\s+(${ADJ})\\s+(${PLACE_NOUNS})\\b`, 'gi');
function thirdPerson(v) { return /(s|sh|ch|x|z)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`; }
export function fixGrammar(line, names = []) {
  let t = String(line || '').trim();
  for (const n of names.filter(Boolean)) t = t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), n);
  const nameAlt = names.filter(Boolean).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (nameAlt) t = t.replace(new RegExp(`(^|[^\\w]|(?<!\\band\\s))\\b(${nameAlt})\\s+(${BASE_VERBS.join('|')})\\b`, 'g'), (m, pre, n, v) => (/\band\s*$/i.test(t.slice(0, t.indexOf(m) + pre.length)) ? m : `${pre}${n} ${thirdPerson(v)}`));
  t = t.replace(ARTICLE_RE, (m, p, a, n) => `${p} ${/^[aeiou]/i.test(a) ? 'an' : 'a'} ${a} ${n}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
// Lines that still look ungrammatical after fixGrammar, for the fact-check to rewrite.
export function grammarIssues(line, names = []) {
  const t = String(line || '');
  const out = [];
  if (/^[a-z]/.test(t)) out.push('starts in lower case');
  for (const n of names.filter(Boolean)) if (new RegExp(`\\b${n.toLowerCase()}\\b`).test(t) && !new RegExp(`\\b${n}\\b`).test(t)) out.push(`"${n}" not capitalised`);
  const nameAlt = names.filter(Boolean).join('|');
  if (nameAlt && new RegExp(`(?<!\\band\\s)\\b(${nameAlt})\\s+(${BASE_VERBS.join('|')})\\b`, 'i').test(t)) out.push('verb does not agree with its subject');
  if (new RegExp(`\\b(${PREPS})\\s+(${ADJ})\\s+(${PLACE_NOUNS})\\b`, 'i').test(t)) out.push('missing "a" or "the"');
  if (t.split(/\s+/).length >= 4 && !new RegExp(`\\b(is|are|was|were|has|have|had|\\w+s|\\w+ed|will|can|could|would|should|did|does|${BASE_VERBS.join('|')})\\b`, 'i').test(t)) out.push('no verb');
  return out;
}

export function literalTrigger(word, narration) {
  const w = String(word || '').toLowerCase().trim(), low = String(narration || '').toLowerCase();
  if (!w || COLOUR_WORDS.test(w) || DESCRIBING.test(w)) return false;
  return !FIGURES.some(re => { const m = re.exec(low); return m && new RegExp(`\\b${w}\\b`).test(m[0]); });
}

// Story objects a character can hold, and the words that name them in a line.
export const HOLD_WORDS = [
  ['ticket', /\btickets?\b/], ['money', /\b(money|cash|dollars?|coins?|paid|pay|wages?|price|cost|costs|bill|bribe|fare)\b/], ['phone', /\b(phones?|called|calls?|texted)\b/],
  ['map', /\b(maps?|route|directions)\b/], ['letter', /\b(letters?|note|envelope|telegram|message|mail)\b/], ['key', /\b(keys?|locked|unlocked)\b/],
  ['book', /\b(books?|diary|notebook|rulebook|manual|records?|ledger)\b/], ['lantern', /\b(lanterns?|lamps?|torch|candles?)\b/], ['cup', /\b(cups?|coffee|tea|mug)\b/],
  ['bag', /\b(bags?|sacks?|suitcases?|luggage|parcel|package)\b/], ['wrench', /\b(wrench|spanner|tools?)\b/], ['hammer', /\b(hammers?|mallet)\b/],
  ['newspaper', /\b(newspapers?|headlines?|paper)\b/], ['clipboard', /\b(clipboard|plans?|blueprints?|reports?|checklist|forms?)\b/], ['watch', /\b(watch|stopwatch|pocket watch|timer)\b/],
  ['camera', /\b(cameras?|photos?|photographs?|snapshots?)\b/], ['ruler', /\b(rulers?|gauges?|tape measure|measur\w*)\b/], ['rail', /\b(rails?|tracks?)\b/],
];
// Lines where those words are figurative ("cost him his job", "time flies") get no object.
const FIGURATIVE_HOLD = /\b(cost (him|her|them|us|me) (his|her|their|our|my)|pay attention|paid off|piece of cake|open book|key (point|fact|reason|idea|part)|in a nutshell)\b/;

// Backup stickers: common things and their emoji, used when the script writer leaves "icon" out.
const EMOJI_WORDS = {
  calendar: '🗓️', year: '🗓️', leap: '🗓️', february: '🗓️', month: '🗓️', week: '🗓️', birthday: '🎂', season: '🍂', autumn: '🍂', winter: '⛄', summer: '🏖️', spring: '🌸',
  orbit: '🌍', sky: '🌤️', light: '💡', sunlight: '☀️', shadow: '🌗', star: '⭐', galaxy: '🌌', comet: '☄️', meteor: '☄️', asteroid: '☄️', mars: '🔴', saturn: '🪐', jupiter: '🪐',
  wheat: '🌾', grain: '🌾', farm: '🚜', farmer: '🚜', crop: '🌾', harvest: '🌾', rice: '🍚', corn: '🌽', potato: '🥔', carrot: '🥕', tomato: '🍅', apple: '🍎', fruit: '🍎', vegetable: '🥦',
  cup: '☕', caffeine: '☕', espresso: '☕', water: '💧', river: '🏞️', lake: '🏞️', beach: '🏖️', sand: '🏖️', wave: '🌊', bubble: '🫧', glass: '🥛', bottle: '🍾',
  king: '👑', queen: '👑', emperor: '👑', war: '⚔️', army: '🪖', soldier: '🪖', knight: '🛡️', castle: '🏰', history: '📜', ancient: '🏛️', rome: '🏛️', roman: '🏛️', law: '⚖️', court: '⚖️', vote: '🗳️', flag: '🏳️',
  brain: '🧠', sleep: '😴', dream: '💭', muscle: '💪', bone: '🦴', blood: '🩸', lung: '🫁', lungs: '🫁', stomach: '🍽️', ear: '👂', nose: '👃', eye: '👁️', skin: '🧴', hair: '💇', doctor: '🩺', nurse: '🩺',
  speed: '💨', fast: '💨', race: '🏁', gravity: '🍎', energy: '⚡', power: '⚡', sound: '🔊', noise: '🔊', voice: '🗣️', song: '🎵', radio: '📻', tv: '📺', movie: '🎬', video: '🎬', photo: '📷', internet: '🌐', wifi: '📶', email: '📧', code: '💻', ai: '🤖',
  car: '🚗', wheel: '🛞', fuel: '⛽', gas: '⛽', oil: '🛢️', metal: '🔩', iron: '🔩', steel: '🔩', wood: '🪵', rock: '🪨', stone: '🪨', gem: '💎', crystal: '💎',
  bread: '🍞', pasta: '🍝', sushi: '🍣', taco: '🌮', soup: '🍲', ice: '🧊', cream: '🍦', icecream: '🍦', popcorn: '🍿', donut: '🍩', salt: '🧂', pepper: '🌶️', spicy: '🌶️',
  bird: '🐦', duck: '🦆', parrot: '🦜', bat: '🦇', bug: '🐛', insect: '🐛', worm: '🪱', snail: '🐌', jellyfish: '🪼', squid: '🦑', bear: '🐻', deer: '🦌', kangaroo: '🦘', sloth: '🦥', gorilla: '🦍',
  iceberg: '🧊', glacier: '🧊', titanic: '🚢', lifeboat: '🛟', anchor: '⚓', captain: '👨‍✈️',
  sunset: '🌅', sunsets: '🌅', sunrise: '🌅', dusk: '🌅', rainbow: '🌈', prism: '🌈', colour: '🎨', color: '🎨', paint: '🎨',
  cat: '🐱', kitten: '🐱', dog: '🐶', puppy: '🐶', bee: '🐝', honey: '🍯', hive: '🍯', ant: '🐜', spider: '🕷️', butterfly: '🦋',
  bird: '🐦', eagle: '🦅', owl: '🦉', penguin: '🐧', chicken: '🐔', egg: '🥚', fish: '🐟', shark: '🦈', whale: '🐋', dolphin: '🐬',
  octopus: '🐙', crab: '🦀', turtle: '🐢', snake: '🐍', frog: '🐸', lion: '🦁', tiger: '🐯', bear: '🐻', panda: '🐼', monkey: '🐒',
  elephant: '🐘', giraffe: '🦒', horse: '🐴', cow: '🐄', pig: '🐷', sheep: '🐑', mouse: '🐭', rat: '🐀', rabbit: '🐰', fox: '🦊',
  wolf: '🐺', dinosaur: '🦖', dino: '🦖', bat: '🦇', camel: '🐫', zebra: '🦓', bacteria: '🦠', germ: '🦠', virus: '🦠', cell: '🦠',
  tree: '🌳', forest: '🌲', flower: '🌸', plant: '🌱', seed: '🌱', leaf: '🍃', cactus: '🌵', mushroom: '🍄', apple: '🍎', banana: '🍌',
  orange: '🍊', lemon: '🍋', grape: '🍇', strawberry: '🍓', pizza: '🍕', burger: '🍔', bread: '🍞', cheese: '🧀', chocolate: '🍫',
  candy: '🍬', cake: '🍰', cookie: '🍪', coffee: '☕', tea: '🍵', milk: '🥛', salt: '🧂', sugar: '🍬', ice: '🧊', water: '💧',
  rain: '🌧️', snow: '❄️', storm: '⛈️', lightning: '⚡', tornado: '🌪️', volcano: '🌋', mountain: '⛰️', ocean: '🌊', sea: '🌊', wave: '🌊',
  island: '🏝️', desert: '🏜️', sun: '☀️', moon: '🌙', star: '⭐', planet: '🪐', earth: '🌍', world: '🌍', globe: '🌍', rocket: '🚀',
  satellite: '🛰️', astronaut: '🚀', telescope: '🔭', microscope: '🔬', magnet: '🧲', battery: '🔋', bulb: '💡', electricity: '⚡',
  fire: '🔥', heat: '🔥', thermometer: '🌡️', clock: '⏰', time: '⏰', money: '💰', coin: '🪙', dollar: '💵', bank: '🏦', gold: '🥇',
  diamond: '💎', car: '🚗', truck: '🚚', bus: '🚌', train: '🚂', rail: '🛤️', track: '🛤️', plane: '✈️', airplane: '✈️', ship: '🚢',
  boat: '⛵', submarine: '🚢', bike: '🚲', bicycle: '🚲', road: '🛣️', bridge: '🌉', house: '🏠', home: '🏠', castle: '🏰', city: '🏙️',
  school: '🏫', hospital: '🏥', factory: '🏭', phone: '📱', computer: '💻', robot: '🤖', game: '🎮', camera: '📷', book: '📚',
  pencil: '✏️', paper: '📄', letter: '✉️', map: '🗺️', key: '🔑', lock: '🔒', bell: '🔔', music: '🎵', guitar: '🎸', piano: '🎹',
  ball: '⚽', football: '🏈', soccer: '⚽', basketball: '🏀', trophy: '🏆', medal: '🏅', crown: '👑', hat: '🎩', shoe: '👟',
  heart: '❤️', brain: '🧠', bone: '🦴', tooth: '🦷', teeth: '🦷', eye: '👁️', medicine: '💊', pill: '💊', vaccine: '💉', dna: '🧬',
  atom: '⚛️', science: '🧪', chemistry: '⚗️', gear: '⚙️', engine: '⚙️', tool: '🔧', hammer: '🔨', ruler: '📏', scale: '⚖️',
  pyramid: '🔺', greek: '🏛️', temple: '🏛️', egypt: '🔺', pirate: '🏴‍☠️', sword: '🗡️', shield: '🛡️', gift: '🎁', party: '🎉',
  lottery: '🎟️', ticket: '🎟️', oil: '🛢️', plastic: '♻️', trash: '🗑️', recycle: '♻️', wind: '💨', cloud: '☁️', rainbow: '🌈',
};
// Common words that only pick the sticker when nothing more specific is in the line.
const BROAD_WORDS = new Set(['year', 'month', 'week', 'light', 'sky', 'speed', 'fast', 'power', 'energy', 'sound', 'history', 'ancient', 'race', 'water', 'time', 'world', 'home', 'house', 'city', 'road', 'game', 'science', 'music', 'money', 'school', 'heat']);

// Which words each sticker stands for, to check that a writer's sticker belongs to its line.
const EMOJI_FOR = new Map();
for (const [w, e] of Object.entries(EMOJI_WORDS)) {
  const k = e.replace(/\uFE0F/g, '');
  if (!EMOJI_FOR.has(k)) EMOJI_FOR.set(k, new Set());
  EMOJI_FOR.get(k).add(w);
}


// The word in a line that a prop or sticker stands for ('' if the line never says it). The render
// log records it, so a prop with no reason to be on screen shows up in tests.
export function propTrigger(p, narration) {
  const low = String(narration || '').toLowerCase();
  const find = (re) => { const m = re.exec(low); return m ? m[0].trim() : ''; };
  if (p.kind === 'icon') {
    const words = EMOJI_FOR.get(String(p.emoji || '').replace(/\uFE0F/g, ''));
    for (const w of words || []) { const hit = find(new RegExp(`\\b${w}(s|es)?\\b`)); if (hit) return hit; }
    return '';
  }
  if (TOON_WORDS[p.kind]) return find(TOON_WORDS[p.kind]);
  const held = HOLD_WORDS.find(([k]) => k === p.kind);
  if (held) return find(held[1]);
  return find(new RegExp(`\\b${String(p.kind).replace(/[^a-z]/g, '')}(s|es)?\\b`));
}

export class Script {
  static CAMS = ['hold', 'push', 'pull', 'pan', 'tilt', 'punch'];
  static CUTS = ['cut', 'whip', 'zoom'];
  static ACTIONS = ['idle', 'walk', 'enter', 'exit', 'sit', 'drive', 'hold', 'give', 'point', 'shrug', 'jump', 'facepalm', 'laugh', 'cry', 'cheer', 'think', 'wave', 'turn'];

  static plan(options) {
    const seconds = Math.max(15, Math.min(180, Number(options?.duration) || 30));
    const pace = PACES[options?.pace] || PACES.normal;
    // Longer videos hold each scene a little longer, like the references, so they need fewer parts.
    const want = Math.round(seconds / (pace.secPerScene * (seconds > 60 ? 1.5 : 1)));
    // The free model stops around 1,500 tokens, so the ask stays inside that.
    // Long videos are written in parts of up to 8 scenes (see writeScript), so no low cap here.
    const scenes = Math.max(4, Math.min(56, want));
    const words = Math.round(seconds * pace.wps);
    return {
      seconds, scenes, words,
      wordsPerScene: Math.max(5, Math.round(words / scenes)),
      fmt: formatOf(options || {}),
    };
  }

  static parse(text) {
    if (text && typeof text === 'object') return text;
    let t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = t.indexOf('{');
    if (start < 0) throw new Error('The model did not return valid JSON.');
    t = t.slice(start);
    // Small models sometimes insert a stray quote between objects: },"{
    t = t.replace(/\}\s*,\s*"\s*\{/g, '},{').replace(/\]\s*,\s*"\s*\{/g, '],{').replace(/\}\s*"\s*\{/g, '},{');
    const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
    const tidy = (s) => s.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/, '');
    let v = tryParse(t) || tryParse(tidy(t)) || tryParse(Script.closeJson(t));
    if (v) return v;
    // Walk backwards over commas so a cut-off scene is dropped and the earlier ones kept.
    let cur = t;
    for (let n = 0; n < 12; n++) {
      v = tryParse(Script.closeJson(cur));
      if (v) return v;
      const cut = Script.lastCut(cur);
      if (cut < 8) break;
      cur = cur.slice(0, cut);
    }
    // The whole document can be broken (an early closing brace) while the scene objects inside are fine.
    const scenes = Script.objectsWith(t, (o) => o && (o.line || o.narration || o.text));
    if (scenes.length) {
      const cast = Script.objectsWith(t, (o) => o && (o.hat || o.costume) && !o.line && !o.narration);
      const grab = (key) => {
        const m = new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*)"`).exec(t);
        return m ? m[1] : '';
      };
      return {
        title: grab('title'),
        youtubeTitle: grab('youtubeTitle'),
        description: grab('description'),
        hashtags: ['#shorts'],
        cast,
        scenes,
      };
    }
    throw new Error('The model did not return valid JSON.');
  }

  static objectsWith(text, pred) {
    const out = [];
    let str = false;
    let esc = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (str) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') str = false;
        continue;
      }
      if (ch === '"') { str = true; continue; }
      if (ch !== '{') continue;
      const end = Script.objectEnd(text, i);
      if (end < 0) continue;
      const raw = text.slice(i, end + 1).replace(/,\s*([}\]])/g, '$1');
      try {
        const obj = JSON.parse(raw);
        if (pred(obj)) out.push(obj);
      } catch { /* this brace did not start a complete object */ }
    }
    return out;
  }

  static objectEnd(text, start) {
    let depth = 0;
    let str = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (str) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') str = false;
        continue;
      }
      if (ch === '"') str = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  // Close strings and brackets left open when a model hits its token cap.
  static closeJson(s) {
    let out = s.replace(/,\s*$/, '');
    const scan = (text) => {
      const stack = [];
      let str = false;
      let esc = false;
      for (const ch of text) {
        if (str) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') str = false;
          continue;
        }
        if (ch === '"') str = true;
        else if (ch === '{') stack.push('}');
        else if (ch === '[') stack.push(']');
        else if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) stack.pop();
      }
      return { stack, str };
    };
    if (scan(out).str) out += '"';
    // A cut-off answer often ends on a key with no value: ,"feel" or ,"x":
    for (let n = 0; n < 4; n++) {
      const next = out.replace(/,?\s*"[^"\\]*"\s*:?\s*$/, '');
      if (next === out) break;
      out = next.replace(/,\s*$/, '');
    }
    out = out.replace(/,\s*$/, '').replace(/:\s*$/, ': null').replace(/,\s*([}\]])/g, '$1');
    const { stack, str } = scan(out);
    if (str) out += '"';
    return out + stack.reverse().join('');
  }

  static lastCut(s) {
    let str = false;
    let esc = false;
    let cut = -1;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (str) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') str = false;
        continue;
      }
      if (ch === '"') str = true;
      else if (ch === ',') cut = i;
    }
    return cut;
  }

  static find(raw, depth = 0) {
    if (!raw || typeof raw !== 'object' || depth > 4) return null;
    if (Array.isArray(raw)) {
      if (raw.length && raw.every(x => x && typeof x === 'object' && (x.line || x.narration || x.text))) return { scenes: raw };
      for (const x of raw) { const f = Script.find(x, depth + 1); if (f) return f; }
      return null;
    }
    for (const k of ['scenes', 'shots', 'storyboard', 'script', 'segments']) {
      const v = raw[k];
      if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object')) return { ...raw, scenes: v };
    }
    for (const v of Object.values(raw)) { const f = Script.find(v, depth + 1); if (f) return f; }
    return null;
  }

  static color(v, i) {
    const s = String(v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
    const named = { teal: '#2A9D8F', green: '#2A9D8F', yellow: '#E8B931', gold: '#E8B931', red: '#E85D4C', blue: '#3D74E0', navy: '#2C3E6B', orange: '#F08A2A', purple: '#7A4EBF' };
    return named[s.toLowerCase()] || Cast.PALETTE[i % Cast.PALETTE.length];
  }

  static oneOf(list, v, fallback) {
    const s = String(v || '').toLowerCase().trim();
    if (list.includes(s)) return s;
    const hit = list.find(x => s.includes(x));
    return hit || fallback;
  }

  static num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  static clean(v, max = 400) {
    return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  // Recurring characters from "My characters": the writer must use exactly these.
  static crewRule(options = {}) {
    const crew = Array.isArray(options.crew) ? options.crew.slice(0, 4) : [];
    if (!crew.length) return 'Cast of 2, 3 or 4. ';
    const list = crew.map(c => JSON.stringify({ id: c.id, name: c.name, color: c.color, hat: c.hat, hair: c.hair, costume: c.costume })).join(',');
    return `Cast: these are the channel's recurring characters. Use exactly them, with these ids and looks, and no one else: [${list}]. `;
  }

  static normalize(raw, options = {}) {
    raw = Script.find(raw) || raw;
    if (!raw || typeof raw !== 'object') throw new Error('The script came back without scenes.');
    const castIn = Array.isArray(raw.cast) ? raw.cast : Array.isArray(raw.characters) ? raw.characters : [];
    let cast = castIn.slice(0, 4).map((c, i) => ({
      id: Script.clean(c.id || c.name || ['a', 'b', 'c', 'd'][i], 8).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || ['a', 'b', 'c', 'd'][i],
      name: Script.clean(c.name || `Pal ${i + 1}`, 24),
      color: Script.color(c.color, i),
      hat: Script.oneOf(Cast.HATS, c.hat, ['cap', 'hardhat', 'beanie', 'fedora'][i % 4]),
      hair: Script.oneOf(Cast.HAIR, c.hair, ['brown', 'black', 'blonde', 'red'][i % 4]),
      costume: Script.oneOf(Cast.COSTUMES, c.costume, i === 2 ? 'suit' : 'vest'),
    }));
    // Every character gets its own colour so they never look like twins.
    {
      const palette = ['#2A9D8F', '#E8B931', '#E76F51', '#5B7FE0', '#9B5DE5', '#F15BB5'];
      const used = new Set();
      cast.forEach((c, i) => {
        if (used.has(c.color.toLowerCase())) c.color = palette.find(p => !used.has(p.toLowerCase())) || palette[i % palette.length];
        used.add(c.color.toLowerCase());
      });
    }
    // A bare round head reads as unfinished: everyone gets hair, and a hat if the writer gave none.
    cast.forEach((c, i) => {
      if (c.hair === 'none') c.hair = ['brown', 'black', 'blonde', 'red'][i % 4];
      if (c.hat === 'none' && i % 2 === 1) c.hat = ['cap', 'beanie', 'fedora'][i % 3];
    });
    if (cast.length < 2) {
      const extras = [
        { id: 'a', name: 'June', color: '#2A9D8F', hat: 'cap', hair: 'brown', costume: 'vest' },
        { id: 'b', name: 'Bo', color: '#E8B931', hat: 'hardhat', hair: 'black', costume: 'vest' },
      ];
      for (const e of extras) if (!cast.some(c => c.id === e.id) && cast.length < 2) cast.push(e);
    }
    // Saved characters keep their exact look in every video (matched by id, then name, then order).
    const crew = Array.isArray(options.crew) ? options.crew.filter(c => c?.name).slice(0, 4) : [];
    if (crew.length) {
      const used = new Set();
      const pick = (c, i) => {
        const k = crew.find(x => !used.has(x) && x.id === c.id) || crew.find(x => !used.has(x) && x.name.toLowerCase() === String(c.name).toLowerCase()) || crew.find(x => !used.has(x));
        if (k) used.add(k);
        return k;
      };
      cast = cast.map((c, i) => {
        const k = pick(c, i);
        return k ? { ...c, name: Script.clean(k.name, 24), color: Script.color(k.color, i), hat: Script.oneOf(Cast.HATS, k.hat, c.hat), hair: Script.oneOf(Cast.HAIR, k.hair, c.hair), costume: Script.oneOf(Cast.COSTUMES, k.costume, c.costume) } : c;
      });
    }
    const ids = new Set();
    cast = cast.map((c, i) => {
      let id = c.id;
      if (ids.has(id)) id = ['a', 'b', 'c', 'd'][i];
      ids.add(id);
      return { ...c, id };
    });
    const known = new Set(cast.map(c => c.id));
    const scenesIn = Array.isArray(raw.scenes) ? raw.scenes : [];
    const scenes = [];
    let lastIcon = '';
    scenesIn.forEach((s, i) => {
      // Writers sometimes prefix a line with "Scene 3:" or a speaker name; the narrator must not read that.
      const narration = fixGrammar(tidyLine(Script.clean(s.line || s.narration || s.text || s.voiceover, 280)
        .replace(/^\s*(scene|shot)\s*\d+\s*[:.\-–—]?\s*/i, '')
        .replace(/^\s*[A-Z][a-zA-Z]{1,14}\s*:\s+/, '')), cast.map(c => c.name));
      if (!narration) return;
      let set = Script.oneOf(SetKit.IDS, s.set || s.place, '');
      // A missing or generic set is replaced by what this line is actually about, then by the topic.
      if (!set || set === 'sky' || set === 'field' || set === 'temple') {
        const byLine = Script.guessSet(narration + ' ' + (s.bg || ''));
        set = byLine !== 'sky' ? byLine : (set && set !== 'sky' ? set : Script.guessSet(options.topic || ''));
      }
      const about = (narration + ' ' + (s.bg || '')).toLowerCase();
      if (/rail|railroad|\btracks?\b|\btrain\b/.test(about) && (set === 'road' || set === 'sky')) set = 'rails';
      if (/\b(heart|lung|lungs|blood|organ|stomach)\b/.test(about) && (set === 'sky' || set === 'room')) set = 'lab';
      const whoIn = Array.isArray(s.who) ? s.who : Array.isArray(s.actors) ? s.actors : [];
      let who = whoIn.map((w, k) => {
        const id = known.has(String(w.id || w.who || '').toLowerCase()) ? String(w.id || w.who).toLowerCase() : cast[k % cast.length].id;
        return {
          id,
          x: InkClamp(Script.num(w.x, 0.28 + k * 0.36), 0.12, 0.88),
          pose: Script.oneOf(Cast.POSES, w.pose || w.do, ['point', 'shrug', 'idle', 'think'][(i + k) % 4]),
          feel: Script.oneOf(Cast.FEELS, w.feel || w.emotion, 'neutral'),
          face: w.face === 'left' || w.face === -1 || w.face === '-1' ? -1 : 1,
          hold: Cast.HOLDS.includes(String(w.hold || '')) || PropKit.KINDS.includes(String(w.hold || '')) ? String(w.hold) : '',
        };
      }).filter((w, idx, arr) => arr.findIndex(x => x.id === w.id) === idx).slice(0, 4);
      if (!who.length) {
        who = cast.slice(0, Math.min(3, cast.length)).map((c, k) => ({
          id: c.id,
          x: 0.24 + k * (0.52 / Math.max(1, Math.min(3, cast.length) - 1 || 1)),
          pose: ['point', 'shrug', 'think', 'idle'][(i + k) % 4],
          feel: ['neutral', 'skeptical', 'happy', 'shocked'][i % 4],
          face: k === 0 ? 1 : -1,
          hold: '',
        }));
      }
      if (who.length === 2 && who[0].x > who[1].x) who.reverse();
      who.sort((a, b) => a.x - b.x);
      for (let n = 1; n < who.length; n++) {
        // Tall frames are narrow: keep the cast well apart so they never overlap.
        const gap = who.length === 2 ? (options.format === '16:9' ? 0.26 : 0.4) : 0.24;
        if (who[n].x - who[n - 1].x < gap) who[n].x = Math.min(0.9, who[n - 1].x + gap);
      }
      if (who.length && who[who.length - 1].x > 0.9) {
        const shift = who[who.length - 1].x - 0.9;
        for (const w of who) w.x = Math.max(0.08, w.x - shift);
      }
      if (who.length === 2 && who[1].x - who[0].x < 0.36 && options.format !== '16:9') { who[0].x = 0.28; who[1].x = 0.72; }
      if (who.length >= 2) { who[0].face = 1; who[who.length - 1].face = -1; }
      const specified = Array.isArray(s.props) || Array.isArray(s.objects);
      const propsIn = specified ? (s.props || s.objects) : [];
      let props = propsIn.map((p, k) => {
        const kind = Script.oneOf(PropKit.KINDS, p.kind || p.type || p.name, '');
        if (!kind) return null;
        return {
          id: Script.clean(p.id || `${kind}${k}`, 10).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || `${kind}${k}`,
          kind,
          x: InkClamp(Script.num(p.x, 0.5), -0.35, 1.35),
          y: p.y == null ? null : InkClamp(Script.num(p.y, 0.5), 0.05, 0.9),
        };
      }).filter(Boolean).slice(0, 4);
      if (!props.length) props = Script.guessProps(narration, set);
      // Every scene gets one animated floating prop that illustrates the line, centred above the cast.
      {
        const toons = props.filter(p => PropKit.TOONS.includes(p.kind));
        if (!toons.length) {
          const g = Script.guessProps(`${narration} ${s.bg || ''}`, set).find(p => PropKit.TOONS.includes(p.kind));
          if (g) props = [g, ...props].slice(0, 4);
        }
        let seen = false;
        props = props.filter(p => { if (!PropKit.TOONS.includes(p.kind)) return true; if (seen) return false; seen = true; return true; });
        for (const p of props) if (PropKit.TOONS.includes(p.kind)) { p.x = 0.5; p.y = null; }
      }
      // An emoji sticker shows the line's key thing for any topic. It replaces the generic floating
      // props (question mark, drop, bolt...) but sits beside the specific ones (globe, eclipse, ship...).
      {
        // The sinking-ship animation and the toy boat look wrong over real scenes (and a boat ends up
        // drawn across a character), so ships and boats are shown with a 🚢 sticker instead.
        props = props.filter(p => p.kind !== 'ship' && p.kind !== 'boat');
        // Vague symbols (❓ ✨ 📦 ⚙️) say nothing: the thing the line or the video is about goes first,
        // so a video about cats shows a cat, not a coffee cup.
        let emoji = Script.emoji(s.icon || s.emoji);
        const lineEmoji = Script.guessEmoji(narration);
        const topicEmoji = Script.guessEmoji(`${options.topic || ''} ${raw.title || ''}`);
        if (!emoji || VAGUE_EMOJI.has(emoji.replace(/\uFE0F/g, ''))) emoji = lineEmoji || topicEmoji || emoji;
        else if (topicEmoji && lineEmoji === topicEmoji) emoji = topicEmoji; // the line is about the subject
        // A sticker must match something in its line or the video's topic. A writer's pick we know
        // the words for (☕ coffee, 🌾 wheat) that matches neither is swapped for one that does.
        if (emoji) {
          const words = EMOJI_FOR.get(emoji.replace(/\uFE0F/g, ''));
          if (words) {
            const text = `${narration} ${options.topic || ''} ${raw.title || ''}`.toLowerCase();
            const stems = new Set((text.match(/[a-z]+/g) || []).flatMap(w => [w, w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')]));
            if (![...words].some(w => stems.has(w))) emoji = lineEmoji || topicEmoji || '';
          }
        }
        // The writer picked the wrong meaning of a word (🍊 for an orange sky): use the right one.
        if (emoji) {
          const low = narration.toLowerCase();
          const bare = emoji.replace(/\uFE0F/g, '');
          for (const [w, [ctx, alt]] of Object.entries(WORD_SENSES)) {
            if (EMOJI_WORDS[w]?.replace(/\uFE0F/g, '') === bare && new RegExp(`\\b${w}`).test(low) && ctx.test(low)) {
              emoji = Script.guessEmoji(narration) || alt || (topicEmoji !== emoji ? topicEmoji : '') || '';
              break;
            }
          }
        }
        // Never the same sticker two shots in a row: pick another thing from the line, or none.
        const same = (a, b) => !!a && !!b && a.replace(/\uFE0F/g, '') === b.replace(/\uFE0F/g, '');
        if (emoji && /^(📅|📆)$/u.test(emoji)) emoji = '🗓️'; // Apple's 📅 shows "July 17"
        if (same(emoji, lastIcon)) {
          emoji = Script.guessEmojis(narration).find(e => !same(e, lastIcon)) || (topicEmoji && !same(topicEmoji, lastIcon) ? topicEmoji : '');
        }
        lastIcon = emoji || '';
        if (emoji) {
          const GENERIC = ['question', 'exclaim', 'drop', 'bolt', 'star', 'bulb', 'clock', 'gear', 'fire'];
          // A specific prop the line never mentions (a stick, an atom for a line about cat spines) goes too.
          const low = narration.toLowerCase();
          props = props.filter(p => !GENERIC.includes(p.kind) && !(TOON_WORDS[p.kind] && !TOON_WORDS[p.kind].test(low)));
          // A specific animated prop (globe, eclipse, ship, thermometer...) already shows the idea,
          // so the sticker is only added when no such prop is in the scene.
          const toon = props.find(p => PropKit.TOONS.includes(p.kind));
          if (!toon) props = [...props, { id: 'icon', kind: 'icon', emoji, x: 0.5, y: null }].slice(-4);
        }
      }
      // Nothing appears without a reason (the sailboat rule): a prop stays only if its line names
      // it, literally, and a shot has at most two of them (stickers are separate and off by default).
      {
        const named = props.filter(p => literalTrigger(propTrigger(p, narration), narration));
        const objects = named.filter(p => p.kind !== 'icon').slice(0, 2);
        props = [...objects, ...named.filter(p => p.kind === 'icon')];
      }
      const actsIn = Array.isArray(s.acts) ? s.acts : Array.isArray(s.actions) ? s.actions : [];
      const acts = [];
      for (const a of actsIn) {
        const id = String(a.id || a.who || '').toLowerCase();
        const propIds = new Set(props.map(p => p.id));
        if (!known.has(id) && !propIds.has(id)) continue;
        const act = {
          t: Math.max(0, Script.num(a.t ?? a.at ?? a.time, 0)),
          id,
          do: Script.oneOf(Script.ACTIONS.concat(['drive', 'move']), a.do || a.pose || a.action, 'idle'),
        };
        if (a.x != null) act.x = InkClamp(Script.num(a.x, 0.5), -0.4, 1.4);
        if (a.feel) act.feel = Script.oneOf(Cast.FEELS, a.feel, '');
        if (a.face) act.face = a.face === 'left' || a.face === -1 ? -1 : 1;
        if (PropKit.KINDS.includes(String(a.hold || ''))) act.hold = String(a.hold);
        if (a.to && known.has(String(a.to).toLowerCase())) act.to = String(a.to).toLowerCase();
        if (a.dur != null) act.dur = InkClamp(Script.num(a.dur, 1), 0.2, 4);
        acts.push(act);
      }
      // Models sometimes send 0–1 fractions. If every time is tiny, stretch them across the shot.
      if (acts.length && acts.every(a => a.t <= 1)) {
        for (const a of acts) a.t = Math.round(a.t * 2.6 * 100) / 100;
      }
      const say = known.has(String(s.say || '').toLowerCase()) ? String(s.say).toLowerCase() : who[0].id;
      scenes.push({
        id: Script.clean(s.id, 16) || `s${i}_${Math.random().toString(36).slice(2, 6)}`,
        narration,
        // Scenery only. Never the spoken line: picture models paint the words of a sentence as text.
        bg: (s.bg || s.background || s.visual) ? Script.scenery(s.bg || s.background || s.visual)
          : (scenes.length && scenes[scenes.length - 1].set === set ? scenes[scenes.length - 1].bg : ''),
        set,
        cam: Script.cam(s.cam || s.camera, i),
        cut: Script.oneOf(Script.CUTS, s.cut || s.transition, i === 0 ? 'cut' : (i % 3 === 0 ? 'zoom' : 'whip')),
        say,
        who, props, acts,
        hold: Number(s.hold) > 0 ? Number(s.hold) : 0,
        seed: Number.isFinite(Number(s.seed)) ? Number(s.seed) : Math.floor(Math.random() * 1e9),
      });
    });
    if (!scenes.length) throw new Error('The script came back without scenes.');
    const seen = new Set();
    for (const s of scenes) {
      while (seen.has(s.id)) s.id += 'x';
      seen.add(s.id);
    }
    // Two characters in a narrow frame each keep to their own half, including where they walk to.
    if (options.format !== '16:9') {
      const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      for (const sc of scenes) {
        if (!Array.isArray(sc.who) || sc.who.length !== 2) continue;
        const [l, r] = sc.who;
        l.x = cl(l.x, 0.13, 0.25); r.x = cl(r.x, 0.75, 0.87);
        for (const act of sc.acts || []) {
          if (typeof act.x !== 'number') continue;
          if (act.id === l.id) act.x = cl(act.x, 0.12, 0.28);
          else if (act.id === r.id) act.x = cl(act.x, 0.72, 0.88);
        }
      }
    }
    // Interactions: the cast uses the things in the scene instead of standing next to them.
    // ride = sits in a vehicle and drives it across; carry = lifts the floating prop overhead and walks with it;
    // push = shoves a heavy object along; hand = holds a small item and passes it over; inspect = walks up and points.
    let lastHow = '', handCount = 0;
    scenes.forEach((sc, i) => {
      const who = sc.who || [];
      if (!who.length) return;
      // Variety: never the same interaction twice in a row, and at most two hand-overs per video.
      const allow = (how) => how !== lastHow && !(how === 'hand' && handCount >= 2);
      const props = sc.props || [];
      const acts = sc.acts = sc.acts || [];
      const speaker = who.find(w => w.id === sc.say) || who[0];
      const other = who.find(w => w !== speaker) || null;
      const text = String(sc.line || sc.narration || '').toLowerCase();
      const vehicle = props.find(p => ['car', 'train', 'boat'].includes(p.kind));
      const mini = props.find(p => ['money', 'coin', 'ticket', 'phone'].includes(p.kind));
      const toon = props.find(p => PropKit.TOONS.includes(p.kind));
      const heavy = props.find(p => ['engine', 'desk', 'chair', 'sign'].includes(p.kind));
      const ground = props.find(p => ['tree', 'house', 'counter', 'bridge', 'rocket', 'planet'].includes(p.kind));
      const dropActs = (id) => { for (let k = acts.length - 1; k >= 0; k--) if (acts[k].id === id) acts.splice(k, 1); };
      if (vehicle && allow('ride')) {
        const rider = speaker;
        const ltr = i % 2 === 0;
        dropActs(rider.id); dropActs(vehicle.id);
        rider.x = ltr ? 0.2 : 0.8; rider.face = ltr ? 1 : -1; rider.pose = 'drive';
        rider.x = ltr ? 0.14 : 0.86;
        acts.push({ t: 0.25, id: rider.id, do: 'drive', x: other ? (ltr ? 0.5 : 0.5) : (ltr ? 0.8 : 0.2), dur: 2.4 });
        if (other) { other.x = ltr ? 0.88 : 0.12; other.face = ltr ? -1 : 1; acts.push({ t: 1.2, id: other.id, do: 'jump' }); }
        sc.use = { who: rider.id, how: 'ride', prop: vehicle.id };
      } else if (mini && other && allow('hand')) {
        handCount++;
        sc.props = props.filter(p => p !== mini);
        speaker.hold = mini.kind;
        dropActs(speaker.id);
        acts.push({ t: 0.2, id: speaker.id, do: 'hold', hold: mini.kind }, { t: 1.3, id: speaker.id, do: 'give', hold: mini.kind, to: other.id }, { t: 1.85, id: other.id, do: 'hold', hold: mini.kind });
        acts.push({ t: 2.0, id: other.id, do: 'cheer' });
        sc.use = { who: speaker.id, how: 'hand', prop: mini.id };
      } else if ((heavy || /\b(push|pushes|pushing|shove|drag|move[sd]?|haul)\b/.test(text)) && allow('push')) {
        const target = heavy || props.find(p => !PropKit.TOONS.includes(p.kind) && p.kind !== 'sun');
        if (target) {
          const pusher = other || speaker;
          const ltr = pusher.x < 0.5;
          dropActs(pusher.id);
          pusher.x = ltr ? 0.14 : 0.86; pusher.face = ltr ? 1 : -1;
          acts.push({ t: 0.3, id: pusher.id, do: 'walk', x: ltr ? 0.42 : 0.58, dur: 2.6 });
          sc.use = { who: pusher.id, how: 'push', prop: target.id };
        }
      } else if (toon && ['earth', 'moon', 'bulb', 'book', 'clock', 'star', 'gear', 'atom', 'thermometer'].includes(toon.kind) && allow('carry')) {
        const carrier = other || speaker;
        const left = carrier.x < 0.5;
        dropActs(carrier.id);
        acts.push({ t: 0.35, id: carrier.id, do: 'walk', x: who.length === 1 ? (left ? 0.62 : 0.38) : (left ? 0.3 : 0.7), dur: 2.2 });
        sc.use = { who: carrier.id, how: 'carry', prop: toon.id };
      } else if (ground && allow('inspect')) {
        const near = who.slice().sort((a, b) => Math.abs(a.x - ground.x) - Math.abs(b.x - ground.x))[0];
        const side = near.x < ground.x ? -1 : 1;
        dropActs(near.id);
        acts.push({ t: 0.3, id: near.id, do: 'walk', x: Math.max(0.1, Math.min(0.9, ground.x + side * 0.2)), dur: 1.3 }, { t: 1.7, id: near.id, do: 'point' });
        near.face = -side;
        sc.use = { who: near.id, how: 'inspect', prop: ground.id };
      }
      lastHow = sc.use ? sc.use.how : '';
      acts.sort((a, b) => a.t - b.t);
    });
    // Cuts like a real animated short: a plain cut while the story stays in one place,
    // a whip or zoom only when it moves somewhere new, and never two flashy cuts in a row.
    {
      let flashy = false;
      scenes.forEach((sc, i) => {
        const moved = i > 0 && sc.set !== scenes[i - 1].set;
        if (i === 0 || !moved || flashy) { sc.cut = 'cut'; flashy = false; }
        else { sc.cut = sc.cut === 'zoom' ? 'zoom' : (i % 2 ? 'whip' : 'zoom'); flashy = true; }
      });
    }
    Script.storyPass(cast, scenes, options, raw);
    return {
      title: Script.clean(raw.title || options.topic || 'Untitled', 60),
      youtubeTitle: Script.clean(raw.youtubeTitle || raw.title || options.topic || 'Untitled', 90),
      description: String(raw.description || '').trim().slice(0, 1500),
      hashtags: Script.hashtags(raw.hashtags, `${raw.title || ''} ${options.topic || ''}`),
      cast,
      scenes,
    };
  }

  static cam(v, i) {
    const s = String(v || '').toLowerCase();
    if (Script.CAMS.includes(s)) return s;
    if (/punch|impact|zoom|vertigo/.test(s)) return 'punch';
    if (/pull/.test(s)) return 'pull';
    if (/pan|orbit|truck/.test(s)) return 'pan';
    if (/tilt|crane/.test(s)) return 'tilt';
    if (/push|dolly/.test(s)) return 'push';
    return ['push', 'pan', 'punch', 'hold', 'tilt', 'pull'][i % 6];
  }

  static scenery(text) {
    let t = Script.clean(text, 180);
    t = t.replace(/\b(naked|nude|nudity|shirtless|topless|bare|gore|gory|blood|bloody|guts|corpse)\b/gi, '');
    t = t.replace(/\b(person|people|man|woman|human|child|boy|girl|face|character|body|bodies|skin|torso|chest)\b/gi, '');
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t || 'bright open landscape';
  }

  static guessSet(text) {
    const t = text.toLowerCase();
    if (/titanic|ocean liner|\bliner\b|\bdeck\b|cruise|voyage|lifeboat|iceberg|captain|on board|aboard/.test(t)) return 'deck';
    if (/eclipse|lunar|moonlight|starry|stars? at night|\bmoon\b/.test(t)) return 'night';
    if (/egypt|syene|alexandria|pyramid|camel|nile|\bwell\b|stick|noon/.test(t)) return 'desert';
    if (/underwater|ocean floor|fish|submarine|dive|octopus|whale/.test(t)) return 'underwater';
    if (/ship|harbor|harbour|horizon|coast|beach|sailor|\bsea\b/.test(t)) return 'sea';
    if (/satellite|orbit|from space|astronaut|planet|globe|sphere/.test(t)) return 'space';
    if (/city|skyscraper|street|downtown|traffic/.test(t)) return 'city';
    if (/mountain|volcano|cliff|summit/.test(t)) return 'mountains';
    if (/snow|ice|arctic|winter|frozen|glacier/.test(t)) return 'snow';
    if (/forest|jungle|woods/.test(t)) return 'forest';
    if (/greek|greece|roman|rome|athens|temple|philosoph|aristotle|ancient|toga/.test(t)) return 'temple';
    if (/rail|train|track/.test(t)) return 'rails';
    if (/shop|store|cashier|lottery|counter/.test(t)) return 'shop';
    if (/heart|lung|organ|blood|breath|stomach|anatom|body|medic/.test(t)) return 'lab';
    if (/rocket|orbit|planet|space|moon|star/.test(t)) return 'space';
    if (/boat|ocean|sea|river|sail/.test(t)) return 'water';
    if (/bridge/.test(t)) return 'bridge';
    if (/car|road|drive|truck|highway/.test(t)) return 'road';
    if (/desert|sand|hot sun/.test(t)) return 'desert';
    if (/night|dark/.test(t)) return 'night';
    if (/office|desk|work/.test(t)) return 'office';
    if (/room|house|home|kitchen/.test(t)) return 'room';
    if (/tree|field|park|forest/.test(t)) return 'field';
    return 'sky';
  }

  // #shorts plus real topic tags. If the writer gave too few, build them from the title and topic.
  static hashtags(list, text) {
    const clean = (h) => '#' + String(h || '').replace(/^#+/, '').replace(/[^\p{L}\p{N}]+/gu, '');
    const out = [];
    const add = (h) => { const t = clean(h); if (t.length > 2 && !out.some(x => x.toLowerCase() === t.toLowerCase())) out.push(t); };
    add('shorts');
    for (const h of Array.isArray(list) ? list : String(list || '').split(/[\s,]+/)) add(h);
    if (out.length < 6) {
      const stop = new Set('the and for with that this from what why how does into your about were was are is its their they them when who will have has had than then also just only very much many more most some topic'.split(' '));
      const words = String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
      const keep = [...new Set(words.filter(w => w.length > 3 && !stop.has(w)))];
      const cap = (w) => w[0].toUpperCase() + w.slice(1);
      const named = keep.filter(w => !/^\d+$/.test(w));
      if (named.length >= 2) add(named.slice(0, 3).map(cap).join(''));
      for (const w of keep) { if (out.length >= 8) break; add(cap(w)); }
      for (const t of ['DidYouKnow', 'Facts', 'Explained', 'LearnOnShorts']) { if (out.length >= 8) break; add(t); }
    }
    return out.filter(t => t.toLowerCase() !== '#topic').slice(0, 10);
  }

  // An emoji for the first common thing named in the text, or ''.
  // Every sticker the text suggests, best first (for picking a different one than the last shot).
  static guessEmojis(text) {
    const low = String(text || '').toLowerCase();
    const strong = [], weak = [];
    for (const raw of low.match(/[a-z]+/g) || []) {
      for (const w of [raw, raw.replace(/ies$/, 'y'), raw.replace(/es$/, ''), raw.replace(/s$/, '')]) {
        if (!Object.prototype.hasOwnProperty.call(EMOJI_WORDS, w)) continue;
        const sense = WORD_SENSES[w];
        if (sense && sense[0].test(low)) { if (sense[1]) weak.push(sense[1]); break; }
        (BROAD_WORDS.has(w) ? weak : strong).push(EMOJI_WORDS[w]);
        break;
      }
    }
    return [...new Set([...strong, ...weak])];
  }

  static guessEmoji(text) {
    const low = String(text || '').toLowerCase();
    let other = ''; // the other meaning of a two-meaning word, or a broad word: used if nothing clearer comes up
    for (const raw of low.match(/[a-z]+/g) || []) {
      for (const w of [raw, raw.replace(/ies$/, 'y'), raw.replace(/es$/, ''), raw.replace(/s$/, '')]) {
        if (!Object.prototype.hasOwnProperty.call(EMOJI_WORDS, w)) continue;
        const sense = WORD_SENSES[w];
        if (sense && sense[0].test(low)) { other ||= sense[1]; break; }
        if (BROAD_WORDS.has(w)) { other ||= EMOJI_WORDS[w]; break; }
        return EMOJI_WORDS[w];
      }
    }
    return other;
  }

  // First emoji picture in the text, or '' (faces, people, hands and flags are skipped).
  static emoji(v) {
    const str = String(v || '').trim();
    if (!str) return '';
    const parts = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(str)].map(x => x.segment) : [...str];
    const bad = /[\u{1F600}-\u{1F64F}\u{1F466}-\u{1F487}\u{1F574}-\u{1F57A}\u{1F3C3}-\u{1F3CC}\u{1F6B4}-\u{1F6B6}\u{1F90C}-\u{1F91F}\u{1F926}\u{1F930}-\u{1F93E}\u{1F9B5}-\u{1F9BB}\u{1F9CD}-\u{1F9DF}\u{1F44A}-\u{1F450}\u{270A}-\u{270D}\u{1F1E6}-\u{1F1FF}\u{1F595}\u{1F596}\u{1F918}]/u;
    const g = parts.find(x => /\p{Extended_Pictographic}/u.test(x));
    return g && !bad.test(g) && g.length <= 12 ? g : '';
  }

  static guessProps(text, set) {
    const t = text.toLowerCase();
    const out = [];
    const add = (kind, x) => { if (!out.some(p => p.kind === kind)) out.push({ id: kind, kind, x, y: null }); };
    // Animated floating props first: they show what the line is about.
    if (/eclipse|earth'?s shadow|shadow on the moon/.test(t)) add('eclipse', 0.5);
    else if (/\bmoon\b|lunar/.test(t)) add('moon', 0.5);
    if (/\b(sticks?|shadows?|syene|alexandria|eratosthenes|angles?|measur\w*)\b/.test(t)) add('stick', 0.5);
    if (/\b(earth|globe|sphere|round|planets?|world|circumference)\b/.test(t)) add('earth', 0.5);
    if (/\b(ideas?|realiz\w*|figured|discover\w*|proved|proof|clever|genius|solution|answer)\b/.test(t)) add('bulb', 0.5);
    if (/\b(years|century|centuries|ago|b\.?c\.?|hours|minutes|time|clocks?)\b/.test(t)) add('clock', 0.5);
    if (/\b(wrote|books?|stud(y|ied|ies)|scholars?|library|read(s|ing)?|learn\w*)\b/.test(t)) add('book', 0.5);
    if (/\b(temperatures?|degrees|thermo\w*|hot|heat|cold|freez\w*)\b/.test(t)) add('thermometer', 0.5);
    if (/\b(machines?|gears?|engines?|mechan\w*|factor(y|ies))\b/.test(t)) add('gear', 0.5);
    if (/\b(atoms?|molecules?|particles?|chemicals?|electrons?)\b/.test(t)) add('atom', 0.5);
    if (/\b(fires?|burn\w*|flames?|lava)\b/.test(t)) add('fire', 0.5);
    if (/\b(water|rain\w*|drops?|liquids?|sweat\w*)\b/.test(t)) add('drop', 0.5);
    if (/\b(electric\w*|lightning|power|energy|shock\w*|volt\w*)\b/.test(t)) add('bolt', 0.5);
    if (/\b(win|wins|won|best|amazing|famous|record|champions?)\b/.test(t)) add('star', 0.5);
    if (/\?|\bwhy\b|\bhow\b|mystery|puzzle|what if/.test(t)) add('question', 0.5);
    if (/!|\b(danger\w*|warning|suddenly|but then|shock\w*|wrong)\b/.test(t)) add('exclaim', 0.5);
    if (/\btrains?\b/.test(t) || set === 'rails') add('train', 0.82);
    if (/\b(cars?|trucks?)\b/.test(t) || set === 'road') add('car', 0.7);
    if (/\brockets?\b/.test(t)) add('rocket', 0.62);
    if (/\b(planets?|orbit\w*|moons?)\b/.test(t) || set === 'space') add('planet', 0.72);
    if (/\b(hearts?|pulse|blood)\b/.test(t)) add('heart', 0.62);
    if (/\b(lungs?|breath\w*)\b/.test(t)) add('lungs', 0.62);
    if (/\b(stomachs?|digest\w*|swallow\w*)\b/.test(t)) add('stomach', 0.62);
    if (/\bmagnet\w*/.test(t)) add('magnet', 0.58);
    if (/\b(money|cash|dollars?|coins?|jackpots?|lotter(y|ies))\b/.test(t)) add('money', 0.55);
    if (/\btickets?\b/.test(t)) add('ticket', 0.48);
    if (/\bphones?\b/.test(t)) add('phone', 0.5);
    if (/\btrees?\b/.test(t) || set === 'field') add('tree', 0.8);
    if (/\b(sun|sunny|heat|summer)\b/.test(t)) add('sun', 0.5);
    if (set === 'shop') add('counter', 0.72);
    return out.slice(0, 3);
  }

  static fromText(text, options = {}) {
    const sentences = splitSentences(text);
    const words = String(text || '').split(/\s+/).filter(Boolean).length;
    const plan = Script.plan({ ...options, duration: Math.max(15, Math.round(words / WORDS_PER_SECOND)) });
    const target = Math.max(6, plan.wordsPerScene);
    const lines = [];
    let cur = '';
    for (const s of sentences) {
      const next = (cur + ' ' + s).trim();
      if (cur && next.split(' ').length > target) { lines.push(cur); cur = s.trim(); }
      else cur = next;
    }
    if (cur) lines.push(cur);
    const topic = options.topic || lines[0] || 'A short film';
    return Script.normalize({
      title: topic.slice(0, 50),
      description: '',
      hashtags: ['#shorts'],
      scenes: lines.map(n => ({ line: n, bg: topic })),
    }, { ...options, topic });
  }

  // A cast of at least three in different period costumes (no hard hats off building sites), the
  // speaker holding the story object the line names, and a range of feelings across the video.
  static storyPass(cast, scenes, options = {}, raw = {}) {
    const topic = `${options.topic || ''} ${raw.title || ''}`.toLowerCase();
    // Hard hats only when the video is about building something (decided by its topic).
    const building = /\b(construct\w*|building sites?|builders?|built|scaffold\w*|cranes?|skyscrapers?|road ?works?|demolition)\b/.test(topic);
    const ERA = ['flatcap', 'bowler', 'tophat', 'conductor', 'fedora', 'cap', 'beanie'];
    const usedHat = new Set();
    for (const c of cast) {
      if (c.hat === 'hardhat' && !building) c.hat = ERA.find(h => !usedHat.has(h) && !cast.some(o => o !== c && o.hat === h)) || 'flatcap';
      if (usedHat.has(c.hat) && c.hat !== 'hair' && c.hat !== 'none') c.hat = ERA.find(h => !usedHat.has(h)) || c.hat;
      usedHat.add(c.hat);
    }
    if (cast.length < 3 && !(options.crew?.length) && scenes.length >= 3) {
      const names = ['Otto', 'Iris', 'Hugo', 'Nell', 'Pip', 'Rosa'].filter(n => !cast.some(c => c.name === n));
      const colors = ['#9B5DE5', '#E76F51', '#5B7FE0', '#F15BB5'].filter(c => !cast.some(o => o.color.toLowerCase() === c.toLowerCase()));
      const third = { id: ['c', 'd', 'e'].find(id => !cast.some(o => o.id === id)), name: names[0], color: colors[0] || '#9B5DE5', hat: ERA.find(h => !usedHat.has(h)) || 'bowler', hair: 'black', costume: 'apron' };
      cast.push(third);
      // The third character joins every third scene, standing in the middle.
      scenes.forEach((sc, i) => {
        if (i % 3 !== 1 || sc.who.length >= 3 || sc.use) return;
        sc.who.sort((a, b) => a.x - b.x);
        if (sc.who[0]) sc.who[0].x = 0.24;
        if (sc.who[1]) sc.who[1].x = 0.76;
        sc.who.push({ id: third.id, x: 0.5, pose: 'think', feel: 'skeptical', face: 1, hold: '' });
      });
    }
    // A held object the line does not name goes; then the story object in hand: what the line
    // names, held by whoever says it.
    for (const sc of scenes) for (const w of sc.who) if (w.hold && !literalTrigger(propTrigger({ kind: w.hold }, sc.narration), sc.narration)) w.hold = '';
    for (const sc of scenes) {
      const sp = sc.who.find(w => w.id === sc.say) || sc.who[0];
      if (!sp || sp.hold || sc.use) continue;
      const low = sc.narration.toLowerCase();
      const hit = HOLD_WORDS.find(([k, re]) => re.test(low) && !FIGURATIVE_HOLD.test(low) && literalTrigger(propTrigger({ kind: k }, sc.narration), sc.narration));
      if (hit) sp.hold = hit[0];
    }
    // Feelings: at least four different ones across the video (neutral, angry, smug, shocked...).
    const feels = new Set(scenes.flatMap(sc => sc.who.map(w => w.feel)));
    if (feels.size < 4) {
      const rival = cast[1]?.id;
      scenes.forEach((sc, i) => {
        const low = sc.narration.toLowerCase();
        for (const w of sc.who) {
          const speaking = w.id === sc.say;
          if (/!/.test(low) && !speaking) w.feel = 'shocked';
          else if (/\?/.test(low) && !speaking) w.feel = 'skeptical';
          else if (w.id === rival && /\b(rival|won|wins?|beat|laugh\w*|cheat\w*|steal\w*|stole|first|faster|better|richer)\b/.test(low)) w.feel = speaking ? 'smug' : 'angry';
          else if (i === scenes.length - 1) w.feel = 'happy';
          else if (!speaking) w.feel = ['skeptical', 'smug', 'shocked', 'angry'][(i + (w.id === rival ? 1 : 0)) % 4];
        }
      });
    }
  }

  static prompt(topic, options, part = null) {
    const plan = { ...Script.plan(options) };
    if (part) { plan.scenes = part.scenes; plan.words = part.scenes * plan.wordsPerScene; }
    const where = { '9:16': 'vertical 9:16 YouTube Short', '16:9': 'horizontal 16:9 video', '1:1': 'square video', '4:5': '4:5 video' }[plan.fmt];
    const pace = { chill: 'calm', normal: 'brisk', fast: 'very fast' }[options.pace || 'normal'];
    return `Write a ${where}, ${plan.seconds}s, ${pace} comedy-explainer told as a story.
TOPIC (follow it, keep real facts accurate): """${topic}"""
${options.extra ? `NOTES: ${options.extra}\n` : ''}About ${plan.words} spoken words across exactly ${plan.scenes} scenes (about ${plan.wordsPerScene} words each).
${part && part.count > 1 ? `This is part 1 of ${part.count} of a ${plan.seconds}s video: write only the first ${plan.scenes} scenes (the hook and the set-up). Later parts continue the story.\n` : ''}Story beats, in order: 1) HOOK in scene 1 (the first 3 seconds): a named hero doing something surprising, or a sharp question. Never a passive fact ("X is a Y", "Have you ever wondered"). 2) SET-UP: who the hero is and what they want. 3) CONFLICT: a rival stands in the way. 4) ESCALATION: it gets bigger or worse. 5) TWIST: a surprising turn that reveals the real fact. 6) BUTTON: one short last line that lands the point or the joke. The real facts drive the story, and the story delivers exactly what the title promises (never contradict the title).
Upload kit: "youtubeTitle" is a viral, curiosity-gap title under 70 characters with one emoji, the kind people must click (e.g. "Why Train Tracks Have Gaps 🤯", "The War That Lasted 13 Days 😳"). "description" is 2 punchy sentences, then a line "Sources:" and 2 to 4 real sources (Wikipedia article names, books or museums). "hashtags" is 8 tags: #shorts plus specific ones for this topic.
Facts: dates, names and numbers must be right. If a popular belief is a myth, say so and give the real version. Never state a myth as fact. Uncertain claims use "about" or "historians think".
Safety: no nudity, no gore, no blood. People stay clothed. The human body is shown with clothed characters and cute standalone organ props (heart, lungs, stomach), never skin.
${Script.crewRule(options)}hats: ${Cast.HATS.join(' ')}. costumes: ${Cast.COSTUMES.join(' ')}. hair: ${Cast.HAIR.join(' ')}.
sets: ${SetKit.IDS.join(' ')}. cams: ${Script.CAMS.join(' ')}. cuts: ${Script.CUTS.join(' ')}.
poses: ${Cast.POSES.join(' ')}. feels: ${Cast.FEELS.join(' ')}.
props: ${PropKit.KINDS.join(' ')}. actions: walk enter exit sit drive point shrug jump facepalm laugh cry cheer think wave hold give.
${options.crew?.length ? '' : `Cast: at least 3 named characters: the hero, a rival and one more. Name them after the real people in the story when there are any (for example Aristotle, Eratosthenes), otherwise short everyday names. Give each a DIFFERENT period costume that fits the era: flatcap = 1900s workers, bowler = 1900s gentlemen, tophat = the 1800s, conductor = trains and railways, apron = shops, kitchens and workshops, laurel = ancient Greece or Rome, crown = royalty, chef = food, helmet = space, grad = science; hardhat ONLY for building sites. Give each a different colour.`}
Never pad a line to reach a word count (no filler like "today", "now", "really", "daily" at the end), and never tack an object's name onto a line: the "props", "hold" and "icon" fields carry the objects. Every line is a complete, grammatical sentence.
Story objects: in at least half of the scenes the line names an object the speaker holds or uses (${Cast.HOLDS.join(' ')}), for example "Mabel slaps her wrench on the rail" or "Gus waves the rulebook": set "hold" on that character in "who". Never a thing the line does not name, and never say the word "prop".
Lines are narration read by one narrator, written the way a fun person talks to a friend, not like a textbook: contractions (it's, you'd, that's), short punchy sentences, a question now and then, numbers said simply ("about 70 million", not "70,000,000"; "one and a half", not "1 1/2"; "five kilometers", not "5 km"). Sound like an upbeat Shorts narrator, never flat: a surprise turn now and then ("But here's the crazy part.", "Wait, it gets weirder."), and an exclamation or a question where it fits. Do not start a line with a speaker name. The narrator tells the story and names the hero and the rival.
Sets: pick the set that matches each line and CHANGE it when the story moves (temple = ancient Greece or Rome, deck = on board a ship, sea = the sea seen from the shore, desert = Egypt, night = the Moon, eclipses and stars, space, city, mountains, snow, forest, underwater, lab, room, road, rails, shop). Only use places that belong to this story (no lab or office unless the story is about science or work). Change the set when the story moves to a new place; 2 to 4 different sets that fit the story are plenty.
Props: every scene has one animated prop that shows what the line is about: earth, moon, eclipse (Earth's shadow crossing the Moon), stick (a stick and its moving shadow), bulb (an idea), question, exclaim, clock, book, thermometer, gear, atom, star, fire, drop, bolt. Add ground props (car, train, boat, house, tree, rocket...) when the line mentions them. Every scene also gets "icon": one emoji of the line's main thing, as specific as possible (🐝 🍯 🌋 🦈 🍕 🧲 🦠). When the video is about an animal or a thing, use that animal or thing in most scenes (a video about cats: 🐱 🐈). Never a face, person, hand or flag, and never vague symbols like ❓ ✨ 💧 ⚙️ 📦.
Acts: give every scene 2 or 3 acts so the cast keeps moving (walk to a new x, point, jump, shrug, cheer, facepalm, turn).
bg is scenery only: no people, no bodies, no text.
acts: t is seconds from the start of that scene. id is a cast id or a prop id. do is the action. x is the destination from 0 to 1.
Stay compact so the answer is never cut off: "bg" is 3 to 8 words of scenery for that scene (things and places only, no people, no words or numbers), at most 2 acts per scene, short names, no extra keys.
Output ONLY compact JSON on one line:
{"title":"","youtubeTitle":"","description":"","hashtags":["#shorts","#topic"],"cast":[{"id":"a","name":"","color":"#RRGGBB","hat":"","hair":"","costume":""},{"id":"b","name":"","color":"#RRGGBB","hat":"","hair":"","costume":""},{"id":"c","name":"","color":"#RRGGBB","hat":"","hair":"","costume":""}],"scenes":[{"line":"","bg":"","set":"","cam":"push","cut":"whip","say":"a","who":[{"id":"a","x":0.3,"pose":"point","feel":"neutral","face":1,"hold":""},{"id":"b","x":0.7,"pose":"shrug","feel":"smug","face":-1}],"icon":"","props":[{"id":"p","kind":"","x":0.5}],"acts":[{"t":0.3,"id":"a","do":"walk","x":0.42}]}]}`;
  }

  // Parts 2..n of a long video: more scenes with the same cast, continuing the story.
  static continuePrompt(topic, options, firstRaw, linesSoFar, part) {
    const plan = Script.plan(options);
    const ids = (firstRaw.cast || []).map(c => c.id).filter(Boolean).join(', ') || 'a, b';
    const last = part.index === part.count;
    return `Continue the same ${plan.seconds}s comedy-explainer about: """${topic}"""
This is part ${part.index} of ${part.count}. The lines so far:
${linesSoFar.map((l, i) => `${i + 1}. ${l}`).join('\n')}
Write the next ${part.scenes} scenes (about ${plan.wordsPerScene} words each). Do not repeat earlier lines; add new facts, twists and jokes. ${last ? 'The last scene is a satisfying payoff that ends the video.' : 'Do not end the video yet.'}
Facts must be right. No nudity, no gore. Use only these cast ids: ${ids}.
sets: ${SetKit.IDS.join(' ')}. Change the set when the story moves. Every scene gets "bg": 3 to 8 words of scenery (no people, no words), and "icon": one emoji of its main thing; when the video is about an animal or a thing, use it (never a face, person, hand, flag, or vague symbols like ❓ ✨ 📦).
Output ONLY compact JSON on one line:
{"scenes":[{"line":"","bg":"","set":"","cam":"push","cut":"whip","say":"a","who":[{"id":"a","x":0.3,"pose":"point","feel":"neutral","face":1}],"icon":"","props":[{"id":"p","kind":"","x":0.5}],"acts":[{"t":0.3,"id":"a","do":"walk","x":0.42}]}]}`;
  }

  static checkPrompt(script, topic) {
    const scenes = script.scenes.map((s, i) => ({ i, line: s.narration }));
    const flags = Script.sanity(script, topic);
    return `Topic: ${topic || script.title}
Title: ${script.title}
LINES:
${JSON.stringify(scenes)}

Check each line on its own. For every real-world claim, decide whether it is false, a myth told as fact, the wrong unit, or only half of a two-part account.
A two-part account is wrong when the line denies one of the parts or mashes them into one object. Eratosthenes used both, separately: at Syene a well had no noon shadow on the solstice, and at Alexandria a stick cast a shadow. "A stick in a well", "a stick, not a well", and "no well" are false.
Major-jackpot odds are hundreds of millions to one. Powerball is about 1 in 292 million. "1 in 292,201" is a thousand times too small.
A heartbeat moves about 70 mL. About 5 litres is a minute of output, not one beat.
Check the arithmetic in every line. If a line says two amounts are close, multiply or add them out. 288,000 is not close to 40,030.
${flags.length ? `A local check already flagged:\n${flags.map(f => `- ${f}`).join('\n')}\n` : ''}Also rewrite any line that is not a complete, grammatical sentence: missing "a"/"the", a verb that does not agree with its subject ("Leo grab" -> "Leo grabs"), lower-case names, or filler words tacked on the end. Keep its facts, its meaning and about its length, in the same lively voice.
${(() => { const names = (script.cast || []).map(c => c.name); const bad = script.scenes.map((s, i) => [i, grammarIssues(s.narration, names)]).filter(([, g]) => g.length); return bad.length ? `A grammar check flagged: ${bad.map(([i, g]) => `line ${i} (${g.join(', ')})`).join('; ')}.\n` : ''; })()}Fix every wrong line. Omit a line that is already right. Keep each fix short. No nudity, no gore.
Return JSON only:
{"notes":["what you fixed, or empty"],"fixes":[{"i":0,"line":"replacement, omit if the line was already right"}],"unverified":["names or numbers a human should double-check"]}`;
  }

  // Orders-of-magnitude slips the small writer makes. Not a fact encyclopedia.
  static sanity(script, topic = '') {
    const lines = (script?.scenes || []).map(s => s.narration || '').join('\n');
    const about = `${topic} ${script?.title || ''} ${lines}`.toLowerCase();
    const notes = [];
    const lottery = /lottery|powerball|mega millions|jackpot/.test(about);
    for (const m of lines.matchAll(/\b1\s+in\s+([\d][\d,]*(?:\.\d+)?)(?:\s*(thousand|million|billion))?/gi)) {
      let n = Number(m[1].replace(/,/g, ''));
      const unit = (m[2] || '').toLowerCase();
      if (unit === 'thousand') n *= 1e3;
      if (unit === 'million') n *= 1e6;
      if (unit === 'billion') n *= 1e9;
      if (lottery && n > 0 && n < 1e7) {
        notes.push(`"${m[0]}" is orders of magnitude too small for a major jackpot. Powerball is about 1 in 292 million.`);
      }
    }
    if (/\bheart|ventricle|pulse\b/.test(about) && /\b\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:l|litres|liters)\b[^.\n]{0,40}\b(?:per|each|a)\s+beat\b/i.test(lines)) {
      notes.push('Litres per beat is off by orders of magnitude. One beat moves tens of millilitres; about 5 litres is per minute.');
    }
    for (const s of script?.scenes || []) {
      if (/stick in a well|stick into a well|not a well|no well|without a well/i.test(s.narration || '')) {
        notes.push('A line puts the stick in the well, or denies the well. At Syene the well had no noon shadow; in Alexandria a stick cast the shadow.');
        break;
      }
    }
    const closeWord = /\b(?:close to|nearly equal to|about the same as)\b/gi;
    for (const m of lines.matchAll(closeWord)) {
      const before = lines.slice(Math.max(0, m.index - 48), m.index);
      const after = lines.slice(m.index + m[0].length, m.index + m[0].length + 48);
      const left = [...before.matchAll(/(\d[\d\s,]*)/g)].pop();
      const right = after.match(/(\d[\d\s,]*)/);
      const a = Number(String(left?.[1] || '').replace(/[\s,]/g, ''));
      const b = Number(String(right?.[1] || '').replace(/[\s,]/g, ''));
      if (!(a > 0 && b > 0)) continue;
      const ratio = Math.max(a, b) / Math.min(a, b);
      if (ratio > 2) notes.push(`A line calls ${a} close to ${b}, but they differ by about ${ratio.toFixed(1)}×.`);
    }
    return notes;
  }

  // The small writer keeps mashing Eratosthenes's two tools into one. Correct that line in place.
  static fixWellStick(script) {
    let changed = 0;
    for (const s of script?.scenes || []) {
      if (!/stick in a well|stick into a well|not a well|no well|without a well/i.test(s.narration || '')) continue;
      s.narration = 'At Syene a well had no noon shadow, and in Alexandria a stick cast one.';
      changed++;
    }
    return changed;
  }
}

function InkClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
