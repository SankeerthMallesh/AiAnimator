// Compact storyboard: cast, scenes, and a tiny action language.
// The free writer often returns truncated or slightly wrong JSON. Repair it.
// Never fail a video because one field is missing.

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
};
const VAGUE_EMOJI = new Set(['❓', '❔', '❗', '❕', '✨', '💧', '⚙', '📦', '⏱', '⏰', '💡', '⭐', '🌟', '💥', '🎉', '👍', '✅', '❌', '🔍', '🔎', '📈', '📉', '💭', '💬', '🗯', '❤', '🔥', '⚡', '🌀', '💫', '🎯', '🏆', '📌', '📝', '📚', '📖', '🧩', '🔑']);
const TOON_WORDS = {
  stick: /\b(sticks?|shadows?|poles?)\b/, atom: /\b(atoms?|molecules?|particles?|electrons?|protons?|chemi\w*)\b/, book: /\b(books?|read\w*|librar\w*|wr[io]te?\w*|stud\w*)\b/,
  earth: /\b(earth|globe|planets?|world|round)\b/, moon: /\b(moons?|lunar)\b/, eclipse: /\beclipse/, ship: /\b(ships?|boats?|sail\w*|horizon|seas?|oceans?)\b/,
  thermometer: /\b(temperat\w*|hot|cold|heat\w*|degrees?|thermo\w*|warm\w*|freez\w*)\b/,
};

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
      const narration = Script.clean(s.line || s.narration || s.text || s.voiceover, 280)
        .replace(/^\s*(scene|shot)\s*\d+\s*[:.\-–—]?\s*/i, '')
        .replace(/^\s*[A-Z][a-zA-Z]{1,14}\s*:\s+/, '');
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
          hold: PropKit.KINDS.includes(String(w.hold || '')) ? String(w.hold) : '',
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
        if (emoji && emoji === lastIcon) {
          emoji = Script.guessEmojis(narration).find(e => e !== lastIcon) || (topicEmoji && topicEmoji !== lastIcon ? topicEmoji : '');
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
    if (/\b(ships?|hulls?|sail\w*|horizon)\b/.test(t)) add('ship', 0.5);
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
    if (/\b(boats?|ships?)\b/.test(t)) add('boat', 0.62);
    if (/\btrees?\b/.test(t) || set === 'field') add('tree', 0.8);
    if (/\b(sun|sunny|heat|summer)\b/.test(t)) add('sun', 0.5);
    if (set === 'shop') add('counter', 0.72);
    return out.slice(0, 3);
  }

  static fromText(text, options = {}) {
    const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [String(text || '')];
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

  static prompt(topic, options, part = null) {
    const plan = { ...Script.plan(options) };
    if (part) { plan.scenes = part.scenes; plan.words = part.scenes * plan.wordsPerScene; }
    const where = { '9:16': 'vertical 9:16 YouTube Short', '16:9': 'horizontal 16:9 video', '1:1': 'square video', '4:5': '4:5 video' }[plan.fmt];
    const pace = { chill: 'calm', normal: 'brisk', fast: 'very fast' }[options.pace || 'normal'];
    return `Write a ${where}, ${plan.seconds}s, ${pace} comedy-explainer.
TOPIC (follow it, keep real facts accurate): """${topic}"""
${options.extra ? `NOTES: ${options.extra}\n` : ''}About ${plan.words} spoken words across exactly ${plan.scenes} scenes (about ${plan.wordsPerScene} words each).
${part && part.count > 1 ? `This is part 1 of ${part.count} of a ${plan.seconds}s video: write only the first ${plan.scenes} scenes (the hook and the setup). Later parts continue the story.\n` : 'Hook in scene 1, a small story with the cast, a payoff in the last scene.\n'}Upload kit: "youtubeTitle" is a viral, curiosity-gap title under 70 characters with one emoji, the kind people must click (e.g. "Why Train Tracks Have Gaps 🤯", "The War That Lasted 13 Days 😳"). "description" is 2 punchy sentences, then a line "Sources:" and 2 to 4 real sources (Wikipedia article names, books or museums). "hashtags" is 8 tags: #shorts plus specific ones for this topic.
Facts: dates, names and numbers must be right. If a popular belief is a myth, say so and give the real version. Never state a myth as fact. Uncertain claims use "about" or "historians think".
Safety: no nudity, no gore, no blood. People stay clothed. The human body is shown with clothed characters and cute standalone organ props (heart, lungs, stomach), never skin.
${Script.crewRule(options)}hats: ${Cast.HATS.join(' ')}. costumes: ${Cast.COSTUMES.join(' ')}. hair: ${Cast.HAIR.join(' ')}.
sets: ${SetKit.IDS.join(' ')}. cams: ${Script.CAMS.join(' ')}. cuts: ${Script.CUTS.join(' ')}.
poses: ${Cast.POSES.join(' ')}. feels: ${Cast.FEELS.join(' ')}.
props: ${PropKit.KINDS.join(' ')}. actions: walk enter exit sit drive point shrug jump facepalm laugh cry cheer think wave hold give.
${options.crew?.length ? '' : `Cast: name them after the real people in the story when there are any (for example Aristotle, Eratosthenes), otherwise short everyday names. Choose each hat, costume and colour to fit the topic and era: laurel = ancient Greece or Rome, hardhat = engineering, cap = trains and pilots, helmet = space, chef = food, grad = science, crown = royalty, tophat = the 1800s. Give the two main characters different colours.`}
Lines are narration read by one narrator, written the way a fun person talks to a friend, not like a textbook: contractions (it's, you'd, that's), short punchy sentences, a question now and then, numbers said simply ("about 70 million", not "70,000,000"). Do not start a line with a speaker name, and do not mention cast names unless they are those real people.
Sets: pick the set that matches each line and CHANGE it when the story moves (temple = ancient Greece or Rome, sea = ships and coasts, desert = Egypt, night = the Moon, eclipses and stars, space, city, mountains, snow, forest, underwater, lab, room, road, rails, shop). Move to a new set that fits the line every 1 or 2 scenes, as if the cast walks and talks through different places on the journey; use at least 4 different sets in a video.
Props: every scene has one animated prop that shows what the line is about: earth, moon, eclipse (Earth's shadow crossing the Moon), ship (a ship sinking below the horizon), stick (a stick and its moving shadow), bulb (an idea), question, exclaim, clock, book, thermometer, gear, atom, star, fire, drop, bolt. Add ground props (car, train, boat, house, tree, rocket...) when the line mentions them. Every scene also gets "icon": one emoji of the line's main thing, as specific as possible (🐝 🍯 🌋 🦈 🍕 🧲 🦠). When the video is about an animal or a thing, use that animal or thing in most scenes (a video about cats: 🐱 🐈). Never a face, person, hand or flag, and never vague symbols like ❓ ✨ 💧 ⚙️ 📦.
Acts: give every scene 2 or 3 acts so the cast keeps moving (walk to a new x, point, jump, shrug, cheer, facepalm, turn).
bg is scenery only: no people, no bodies, no text.
acts: t is seconds from the start of that scene. id is a cast id or a prop id. do is the action. x is the destination from 0 to 1.
Stay compact so the answer is never cut off: "bg" is 3 to 8 words of scenery for that scene (things and places only, no people, no words or numbers), at most 2 acts per scene, short names, no extra keys.
Output ONLY compact JSON on one line:
{"title":"","youtubeTitle":"","description":"","hashtags":["#shorts","#topic"],"cast":[{"id":"a","name":"","color":"#RRGGBB","hat":"","hair":"","costume":""},{"id":"b","name":"","color":"#RRGGBB","hat":"","hair":"","costume":""}],"scenes":[{"line":"","bg":"","set":"","cam":"push","cut":"whip","say":"a","who":[{"id":"a","x":0.3,"pose":"point","feel":"neutral","face":1},{"id":"b","x":0.7,"pose":"shrug","feel":"skeptical","face":-1}],"icon":"","props":[{"id":"p","kind":"","x":0.5}],"acts":[{"t":0.3,"id":"a","do":"walk","x":0.42}]}]}`;
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
${flags.length ? `A local check already flagged:\n${flags.map(f => `- ${f}`).join('\n')}\n` : ''}Fix every wrong line. Omit a line that is already right. Keep each fix short. No nudity, no gore.
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
