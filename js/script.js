// Compact storyboard: cast, scenes, and a tiny action language.
// The free writer often returns truncated or slightly wrong JSON. Repair it.
// Never fail a video because one field is missing.

import { PACES, formatOf } from './presets.js';
import { Cast } from './cast.js';
import { PropKit, SetKit } from './props.js';

const WORDS_PER_SECOND = 2.55;

export class Script {
  static CAMS = ['hold', 'push', 'pull', 'pan', 'tilt', 'punch'];
  static CUTS = ['cut', 'whip', 'zoom'];
  static ACTIONS = ['idle', 'walk', 'enter', 'exit', 'sit', 'drive', 'hold', 'give', 'point', 'shrug', 'jump', 'facepalm', 'laugh', 'cry', 'cheer', 'think', 'wave', 'turn'];

  static plan(options) {
    const seconds = Math.max(15, Math.min(180, Number(options?.duration) || 30));
    const pace = PACES[options?.pace] || PACES.normal;
    const want = Math.round(seconds / pace.secPerScene);
    // The free model stops around 1,500 tokens, so the ask stays inside that.
    const scenes = Math.max(4, Math.min(12, want));
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
    if (cast.length < 2) {
      const extras = [
        { id: 'a', name: 'June', color: '#2A9D8F', hat: 'cap', hair: 'brown', costume: 'vest' },
        { id: 'b', name: 'Bo', color: '#E8B931', hat: 'hardhat', hair: 'black', costume: 'vest' },
      ];
      for (const e of extras) if (!cast.some(c => c.id === e.id) && cast.length < 2) cast.push(e);
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
    scenesIn.forEach((s, i) => {
      const narration = Script.clean(s.line || s.narration || s.text || s.voiceover, 280);
      if (!narration) return;
      let set = Script.oneOf(SetKit.IDS, s.set || s.place, Script.guessSet(narration + ' ' + (options.topic || '')));
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
        if (who[n].x - who[n - 1].x < 0.22) who[n].x = Math.min(0.9, who[n - 1].x + 0.22);
      }
      if (who.length && who[who.length - 1].x > 0.9) {
        const shift = who[who.length - 1].x - 0.9;
        for (const w of who) w.x = Math.max(0.08, w.x - shift);
      }
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
      if (!props.length && !(specified && propsIn.length === 0)) props = Script.guessProps(narration, set);
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
        bg: Script.scenery(s.bg || s.background || s.visual || narration),
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
    return {
      title: Script.clean(raw.title || options.topic || 'Untitled', 60),
      youtubeTitle: Script.clean(raw.youtubeTitle || raw.title || options.topic || 'Untitled', 90),
      description: String(raw.description || '').trim().slice(0, 1500),
      hashtags: (Array.isArray(raw.hashtags) ? raw.hashtags : []).map(h => Script.clean(h, 32)).filter(Boolean)
        .map(h => (h.startsWith('#') ? h : '#' + h.replace(/\s+/g, ''))).slice(0, 8),
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

  static guessProps(text, set) {
    const t = text.toLowerCase();
    const out = [];
    const add = (kind, x) => { if (!out.some(p => p.kind === kind)) out.push({ id: kind, kind, x, y: null }); };
    if (/train/.test(t) || set === 'rails') add('train', 0.82);
    if (/car|truck/.test(t) || set === 'road') add('car', 0.7);
    if (/rocket/.test(t)) add('rocket', 0.62);
    if (/planet|orbit|moon/.test(t) || set === 'space') add('planet', 0.72);
    if (/heart|pulse|blood/.test(t)) add('heart', 0.62);
    if (/lung|breath/.test(t)) add('lungs', 0.62);
    if (/stomach|digest|swallow/.test(t)) add('stomach', 0.62);
    if (/magnet/.test(t)) add('magnet', 0.58);
    if (/money|cash|dollar|coin|jackpot|lottery/.test(t)) add('money', 0.55);
    if (/ticket/.test(t)) add('ticket', 0.48);
    if (/phone/.test(t)) add('phone', 0.5);
    if (/boat|ship/.test(t)) add('boat', 0.62);
    if (/tree/.test(t) || set === 'field') add('tree', 0.8);
    if (/sun|heat|summer/.test(t)) add('sun', 0.5);
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

  static prompt(topic, options) {
    const plan = Script.plan(options);
    const where = { '9:16': 'vertical 9:16 YouTube Short', '16:9': 'horizontal 16:9 video', '1:1': 'square video', '4:5': '4:5 video' }[plan.fmt];
    const pace = { chill: 'calm', normal: 'brisk', fast: 'very fast' }[options.pace || 'normal'];
    return `Write a ${where}, ${plan.seconds}s, ${pace} comedy-explainer.
TOPIC (follow it, keep real facts accurate): """${topic}"""
${options.extra ? `NOTES: ${options.extra}\n` : ''}About ${plan.words} spoken words across exactly ${plan.scenes} scenes (about ${plan.wordsPerScene} words each).
Hook in scene 1, a small story with the cast, a payoff in the last scene.
Facts: dates, names and numbers must be right. If a popular belief is a myth, say so and give the real version. Never state a myth as fact. Uncertain claims use "about" or "historians think".
Safety: no nudity, no gore, no blood. People stay clothed. The human body is shown with clothed characters and cute standalone organ props (heart, lungs, stomach), never skin.
Cast of 2, 3 or 4. hats: ${Cast.HATS.join(' ')}. costumes: ${Cast.COSTUMES.join(' ')}. hair: ${Cast.HAIR.join(' ')}.
sets: ${SetKit.IDS.join(' ')}. cams: ${Script.CAMS.join(' ')}. cuts: ${Script.CUTS.join(' ')}.
poses: ${Cast.POSES.join(' ')}. feels: ${Cast.FEELS.join(' ')}.
props: ${PropKit.KINDS.join(' ')}. actions: walk enter exit sit drive point shrug jump facepalm laugh cry cheer think wave hold give.
bg is scenery only: no people, no bodies, no text.
acts: t is seconds from the start of that scene. id is a cast id or a prop id. do is the action. x is the destination from 0 to 1.
Output ONLY compact JSON, under 900 words:
{"title":"","youtubeTitle":"","description":"","hashtags":["#shorts"],"cast":[{"id":"a","name":"June","color":"#2A9D8F","hat":"cap","hair":"brown","costume":"vest"},{"id":"b","name":"Bo","color":"#E8B931","hat":"hardhat","hair":"black","costume":"vest"}],"scenes":[{"line":"","bg":"","set":"sky","cam":"push","cut":"whip","say":"a","who":[{"id":"a","x":0.3,"pose":"point","feel":"neutral","face":1},{"id":"b","x":0.7,"pose":"shrug","feel":"skeptical","face":-1}],"props":[{"id":"p","kind":"tree","x":0.8}],"acts":[{"t":0.3,"id":"a","do":"walk","x":0.42}]}]}`;
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
