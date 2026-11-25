// Automatic quality control before rendering: scene-by-scene checks of action coverage, objects, characters,
// camera, narration match, subtitles, sound and repetition, plus an honest map of what each engine's renderer can
// actually perform for every action family (fully, approximately, or not at all).
import { content, words } from './util.js';
import { decompose } from './actions.js';

// what the Loomy renderers animate for each action family: [how, note]
const FULL = 'full', APPROX = 'approx', NONE = 'none';
const RENDER = {
  stick: { grab: [FULL, 'hold'], read: [FULL, 'read (newspaper)'], open: [APPROX, 'reaches and holds; doors do not swing'], close: [APPROX, 'points'], give: [APPROX, 'two-shot, both holding'], dig: [FULL, 'dig with a shovel'], eat: [FULL, 'eat'], drink: [FULL, 'drink'], sit: [FULL, 'sit on the seat'], stand: [FULL, 'stand'], walk: [FULL, 'walks onto the mark'], run: [FULL, 'runs across'], carry: [FULL, 'carry'], press: [FULL, 'presses the button panel'], operate: [APPROX, 'press'], drive: [NONE, 'no vehicles'], build: [APPROX, 'dig/hammer swing'], write: [FULL, 'write'], type: [FULL, 'type'], count: [FULL, 'count cash'], throw: [NONE, ''], fall: [APPROX, 'panic'], climb: [NONE, ''], hide: [APPROX, 'look'], aim: [FULL, 'aim and fire'], point: [FULL, 'point'], talk: [APPROX, 'gestures (no lip-sync: the narrator is the voice)'], discover: [FULL, 'look, then react'], react: [FULL, 'panic/cheer'], sleep: [FULL, 'sleep or doze'], wave: [FULL, 'wave'], generic: [APPROX, 'what people do in that place'] },
  blocky: { grab: [FULL, 'hold'], read: [FULL, 'read'], open: [APPROX, 'reach'], close: [APPROX, 'reach'], give: [APPROX, 'hold'], dig: [FULL, 'dig'], eat: [FULL, 'eat'], drink: [FULL, 'drink'], sit: [APPROX, 'think (no chairs in block towns)'], stand: [FULL, 'stand'], walk: [FULL, 'walk'], run: [FULL, 'run'], carry: [FULL, 'carry'], press: [FULL, 'press the button pedestal'], operate: [APPROX, 'press'], drive: [NONE, ''], build: [APPROX, 'dig'], write: [FULL, 'write'], type: [APPROX, 'press'], count: [FULL, 'count'], throw: [NONE, ''], fall: [APPROX, 'scared'], climb: [NONE, ''], hide: [APPROX, 'look'], aim: [FULL, 'aim'], point: [FULL, 'point'], talk: [FULL, 'talk gestures'], discover: [FULL, 'look, then surprised'], react: [FULL, 'panic/cheer'], sleep: [APPROX, 'think'], wave: [FULL, 'wave'], generic: [APPROX, 'what people do there'] },
  cinema: { grab: [FULL, 'hold'], read: [FULL, 'read'], open: [APPROX, 'reach'], close: [APPROX, 'reach'], give: [APPROX, 'hold'], dig: [FULL, 'dig'], eat: [FULL, 'eat'], drink: [FULL, 'drink'], sit: [FULL, 'sit'], stand: [FULL, 'stand'], walk: [FULL, 'walk'], run: [FULL, 'run'], carry: [FULL, 'carry'], press: [FULL, 'press the button pedestal'], operate: [APPROX, 'press'], drive: [NONE, ''], build: [APPROX, 'dig'], write: [FULL, 'write'], type: [FULL, 'type at a laptop'], count: [FULL, 'count'], throw: [NONE, ''], fall: [APPROX, 'flinch'], climb: [NONE, ''], hide: [APPROX, 'look'], aim: [FULL, 'aim'], point: [FULL, 'point'], talk: [APPROX, 'talk pose (lip-sync off)'], discover: [FULL, 'surprised'], react: [FULL, 'surprised/cheer'], sleep: [FULL, 'sleep'], wave: [FULL, 'wave'], generic: [APPROX, 'show pose'] },
};
const THINGS = /\b(newspaper|paper|letter|map|key|door|box|crate|cart|pickaxe|shovel|button|lever|machine|computer|book|money|cash|coins?|gold|chest|bag|gun|musket|cannon|horse|car|truck|train|phone|knife|sword|flag|bottle|cup|food|bread|apple|ticket|rock|tree|pod|beans?|ladder|rope|bridge|wall|window|basement|stairs|lamp|clock|bell|wheel|engine|panel|switch)\b/gi;

/** checks a project; returns { scenes: [{ id, items: [{ level, msg }] }], coverage: {full, approx, none}, total } */
export function check(project, cast, engineId, cues = []) {
  const scenes = project.scenes || [];
  const out = [], cov = { full: 0, approx: 0, none: 0 };
  let prevActor = '';
  scenes.forEach((s, i) => {
    const items = [], plan = decompose(s, engineId, cast, prevActor); prevActor = plan.actor;
    const say = (level, msg) => items.push({ level, msg });
    // action coverage
    if (!plan.verbs.length) say('warn', 'No action verb in this line: the character may stand still. Add a visible action (grabs, opens, walks, points...) or make it a reaction shot.');
    for (const v of plan.verbs) {
      const [how, note] = (RENDER[engineId] || RENDER.stick)[v] || [APPROX, ''];
      cov[how]++;
      if (how === NONE) say('error', `"${v}" is planned but this engine's renderer cannot animate it yet. Reword the line, or render this shot with an outside tool.`);
      else if (how === APPROX) say('warn', `"${v}" will be shown as ${note}.`);
      else say('ok', `"${v}" is animated (${note}).`);
    }
    // characters
    const castEngine = engineId !== 'cinema';
    if (castEngine && plan.verbs.length && !s.characters?.length) say('error', 'Someone acts in this line but no character is assigned to the scene.');
    for (const n of s.characters || []) {
      const c = cast.find((x) => x.name.toLowerCase() === n.toLowerCase());
      if (!c) say('error', `"${n}" is not in this project's character list: their look is not locked.`);
      else if (!c.outfit || !c.face) say('warn', `${c.name}'s design sheet is missing ${!c.outfit ? 'an outfit' : 'a face design'}: fill it in so every scene draws them the same.`);
    }
    // objects
    const named = [...new Set((s.narration.match(THINGS) || []).map((x) => x.toLowerCase()))];
    const shown = `${s.description} ${s.background} ${s.movement}`.toLowerCase();
    for (const o of named) if (!shown.includes(o.replace(/s$/, ''))) say('warn', `The line mentions "${o}" but the scene description does not show it.`);
    // narration match
    const overlap = content(s.narration).filter((w) => content(`${s.description} ${s.background} ${s.movement}`).includes(w));
    if (content(s.narration).length > 2 && !overlap.length) say('error', 'The scene description shares nothing with the narration: it may show the wrong thing.');
    // camera
    if (i === 0 && !/wide|establish|aerial/i.test(s.shot) && engineId !== 'cinema') say('warn', 'The first scene is not a wide/establishing shot: viewers may not know where they are.');
    if (i > 0 && s.shot === scenes[i - 1].shot) say('warn', `Same shot type as the scene before (${s.shot}).`);
    if (!s.move) say('warn', 'No camera movement planned.');
    // repetition
    if (i > 0 && s.background === scenes[i - 1].background && s.shot === scenes[i - 1].shot && s.movement === scenes[i - 1].movement) say('error', 'This scene repeats the one before (same place, shot and movement).');
    // sound
    const wantSfx = plan.steps.filter((x) => x.sfx).map((x) => x.sfx);
    if (wantSfx.length && !String(s.sfx || '').trim()) say('warn', `No sound effects listed; the actions suggest: ${[...new Set(wantSfx)].join(', ')}.`);
    say('info', 'Physical plausibility is not checked automatically: watch the preview.');
    out.push({ id: s.id, items, plan });
  });
  // subtitles
  const subItems = [];
  cues.forEach((c, i) => {
    const cps = c.text.length / Math.max(0.1, c.end - c.start);
    if (cps > 20) subItems.push({ level: 'warn', msg: `Cue ${i + 1} "${c.text}" flashes by (${cps.toFixed(0)} characters a second).` });
    if (i && c.start < cues[i - 1].end - 0.01) subItems.push({ level: 'error', msg: `Cue ${i + 1} overlaps the one before.` });
    if (words(c.text).length > 5) subItems.push({ level: 'warn', msg: `Cue ${i + 1} has ${words(c.text).length} words: keep 2-4 for Shorts.` });
  });
  if (!cues.length) subItems.push({ level: 'warn', msg: 'No subtitles yet: make them in Voice & subtitles.' });
  return { scenes: out, subtitles: subItems, coverage: cov, errors: out.reduce((a, s) => a + s.items.filter((x) => x.level === 'error').length, 0) + subItems.filter((x) => x.level === 'error').length };
}
export { RENDER };
