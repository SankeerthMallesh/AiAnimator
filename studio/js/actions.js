// Script-to-action: every sentence -> who acts, what they do, with what, where -> a chain of animation steps
// (anticipation, action, reaction) with body, head, eyes, face, arms, hands, legs, the object's response, timing,
// camera, sound and transition. Rule-based and deterministic, so it always works and every step can be edited.
import { words } from './util.js';

// verb families: [pattern, key]. Order matters: the more specific first.
const VERBS = [
  [/\b(pick(ed|s|ing)? up|grab(bed|s|bing)?|took|take[sn]?|snatch\w*|seiz\w*|lift(ed|s)?)\b/i, 'grab'],
  [/\b(read(s|ing)?|stud(y|ied|ies)|scann?(ed|ing)?|unfold\w*)\b/i, 'read'],
  [/\b(open(ed|s|ing)?|unlock\w*)\b/i, 'open'],
  [/\b(clos(e|ed|es|ing)|shut|slamm?ed|lock(ed|s)?)\b/i, 'close'],
  [/\b(gave|give[sn]?|hand(ed|s)? (over|it|him|her|the)|pass(ed|es)? (it|the)|offer(ed|s)?)\b/i, 'give'],
  [/\b(dug|dig(s|ging)?|mine[ds]?|mining|chipp?ed|swung (his|her|the) pick\w*|(broke|break(s|ing)?|smash\w*|crack\w*) (the |a )?(rock|stone|wall|ground))\b/i, 'dig'],
  [/\b(ate|eat(s|ing)?|bit(e|es)?|chew\w*|tast(ed|es))\b/i, 'eat'],
  [/\b(drank|drink(s|ing)?|sipp?(ed|ing)?)\b/i, 'drink'],
  [/\b(sat|sit(s|ting)?|took a seat)\b/i, 'sit'],
  [/\b(stood up|stand(s|ing)? up|got up|rose)\b/i, 'stand'],
  [/\b(ran|run(s|ning)?|sprint\w*|rush(ed|es)|fled|chas(ed|es|ing))\b/i, 'run'],
  [/\b(walk(ed|s|ing)?|went|stepp?ed|enter(ed|s)?|came|arriv\w*|approach\w*|snuck|sneak\w*|crept|headed)\b/i, 'walk'],
  [/\b(carr(y|ied|ies)|haul\w*|dragg?(ed|ing)?|push(ed|es|ing)? (the|a) (cart|wheelbarrow|box|crate))\b/i, 'carry'],
  [/\b(press(ed|es|ing)?|push(ed|es)? the button|flipp?ed|switch(ed)?|turned (it )?on|activat\w*)\b/i, 'press'],
  [/\b(operat\w*|start(ed)? the (machine|engine)|ran the machine|cranked|pulled the lever)\b/i, 'operate'],
  [/\b(drove|drive[sn]?|driving|steer\w*)\b/i, 'drive'],
  [/\b(built|build(s|ing)?|hammer(ed|s|ing)?|nail(ed|s)?|assembl\w*|fix(ed|es|ing)?)\b/i, 'build'],
  [/\b(wrote|writ(e|es|ing)|sign(ed|s)|drew|sketch\w*)\b/i, 'write'],
  [/\b(typ(ed|es|ing)|hack(ed|s|ing)?)\b/i, 'type'],
  [/\b(count(ed|s|ing)?|paid|pay(s|ing)?)\b/i, 'count'],
  [/\b(threw|throw[sn]?|toss(ed|es)?|hurl\w*)\b/i, 'throw'],
  [/\b(fell|fall(s|ing)?|tripp?ed|collaps\w*|slipp?ed)\b/i, 'fall'],
  [/\b(climb(ed|s|ing)?|scal(ed|es))\b/i, 'climb'],
  [/\b(hid|hide[sn]?|hiding|duck(ed|s)?)\b/i, 'hide'],
  [/\b(fired|shot|aim(ed|s)?|volley)\b/i, 'aim'],
  [/\b(point(ed|s|ing)?|show(ed|s)? (him|her|them))\b/i, 'point'],
  [/\b(said|say[s]?|told|tell[s]?|ask(ed|s)?|shout(ed|s)?|yell(ed|s)?|whisper(ed|s)?|explain(ed|s)?|announc\w*)\b/i, 'talk'],
  [/\b(discover\w*|found|notic\w*|realiz\w*|spott?ed|saw|see[ns]?|look(ed|s)? (at|around|up|down))\b/i, 'discover'],
  [/\b(scream\w*|panick\w*|gasp\w*|cried|cry|laugh(ed|s)?|cheer(ed|s)?|celebrat\w*|shock\w*|froze)\b/i, 'react'],
  [/\b(slept|sleep(s|ing)?|nap\w*|fell asleep)\b/i, 'sleep'],
  [/\b(wav(ed|es|ing))\b/i, 'wave'],
];
const DET = /^(the|a|an|his|her|their|its|my|your|our|this|that|some|one|two|every|all)$/i;
const PREP = /^(to|into|onto|in|on|at|from|with|toward|towards|through|under|over|behind|before|after|and|but|then|while|because|so|as|until)$/i;
const MATERIAL = [[/paper|newspaper|letter|note|map|ticket|book|page|contract|check/i, 'paper', 'paper rustle'], [/key|coin|pickaxe|shovel|tool|wrench|hammer|gun|musket|sword|lock|metal|gold|bar/i, 'metal', 'metal clink'], [/door|gate|lid|chest|drawer|basement/i, 'door', 'door creak'], [/box|crate|cart|chair|table|wood/i, 'wood', 'wood knock'], [/glass|cup|bottle|flask|jar/i, 'glass', 'glass clink'], [/cash|money|bills|dollar/i, 'paper', 'bills flick'], [/button|switch|lever|machine|computer|engine|panel/i, 'machine', 'click and hum'], [/food|burger|bread|apple|sandwich|meal|chocolate|bean/i, 'food', 'crunch']];
const materialOf = (obj) => MATERIAL.find(([re]) => re.test(obj || '')) || [null, 'object', 'soft tap'];

/** the object of a verb: the words after it, without the article, up to a preposition or the end */
function objectAfter(sentence, re) {
  const m = re.exec(sentence); if (!m) return '';
  const rest = words(sentence.slice(m.index + m[0].length).replace(/[.,!?;:"]/g, ' ')).filter((w) => !DET.test(w));
  const out = [];
  if (/^(he|she|they|it|that|him|her|them|we|you|i|was|were|is|had)$/i.test(rest[0] || '')) return ''; // a clause, not a thing
  for (const w of rest) { if (PREP.test(w) || out.length >= 3) break; out.push(w); }
  return out.join(' ').toLowerCase();
}
const PLACE = /\b(?:in|into|at|inside|on|onto|through|near)\s+(?:the\s+|a\s+|his\s+|her\s+)?([a-z]+(?:\s+[a-z]+)?)/i;

/** step templates: [name, body, head, eyes, face, arms, hands, legs, object, weight(share of time)] */
const T = (o) => (who, obj, place) => o.map(([n, body, head, eyes, face, arms, hands, legs, objx, w]) => {
  if (typeof objx === 'number') { w = objx; objx = ''; } // a step with a weight and no object change
  return { name: n, body, head, eyes, face, arms, hands, legs, object: String(objx || '').replace(/\{o\}/g, obj || 'it'), weight: w || 1, who, place };
});
const LOOK = ['notices it', 'weight settles, a small breath', 'turns toward {o}', 'locks onto {o}', 'eyebrows lift slightly, focused', 'at rest by the sides', 'relaxed', 'feet planted, one small step to square up', '', 0.7];
const REST = ['settles', 'back to the conversation partner or the lens', 'blink, then forward', 'holds the reaction a beat', 'lower back toward rest', 'relax', 'weight shifts back to both feet', '', 0.6];
const STEPS = {
  grab: T([LOOK, ['reach', 'leans toward {o}, bending slightly at the waist', 'tilts down to {o}', 'on {o}', 'concentrating', 'right arm extends toward {o}', 'open hand, fingers spread', 'front knee bends a little', '{o} waits on its surface'], ['grip', 'holds the lean', 'steady', 'on the hand', 'mouth tight', 'arm stops at {o}', 'fingers close around {o}', 'still', '{o} shifts and bends slightly in the grip', 0.6], ['lift', 'straightens up', 'follows {o} up', 'on {o}', 'curious', 'arm lifts {o} to chest height', 'other hand comes in to steady {o}', 'weight back on both feet', '{o} rises with the hand'], ['react', 'small step back', 'tilts', 'widen on {o}', 'eyebrows up, mouth opens', 'both hands hold {o} up', 'grip tightens', 'knees lock', '{o} held toward the lens', 1.2]]),
  read: T([LOOK, ['raise', 'straightens', 'down to {o}', 'on {o}', 'curious', 'both arms bring {o} up to chest height', 'thumbs and fingers on the edges', 'still', '{o} lifts, edges flex'], ['unfold', 'shoulders open', 'slight tilt', 'on {o}', 'focused', 'arms spread apart', 'hands pull the edges open', 'still', '{o} unfolds, paper bends', 0.8], ['scan', 'leans in', 'moves left to right in small steps', 'track the lines', 'concentrating, brows knit', 'hold steady', 'grip adjusts once', 'still', '{o} held steady', 1.2], ['react', 'jolts back', 'snaps up from {o}', 'wide', 'eyebrows shoot up, mouth drops open', 'arms lower {o} a little', 'grip tightens on {o}', 'small hop back', '{o} crinkles in the tight grip', 1.2]]),
  open: T([['approach', 'walks toward {o}', 'facing {o}', 'on {o}', 'cautious', 'natural swing', 'relaxed', 'walk cycle, 3-4 steps', ''], ['reach', 'stops, leans in', 'down to the handle', 'on the handle', 'hesitant', 'right arm reaches for the handle', 'hand opens', 'feet together', ''], ['grip and turn', 'holds', 'steady', 'on the handle', 'tense', 'arm stays out', 'fingers close and turn the handle', 'still', '{o} handle turns with a click', 0.7], ['push/pull', 'leans weight into it', 'follows the gap', 'into the gap', 'breath held', 'arm pushes {o} open', 'flat palm on {o}', 'one step forward', '{o} swings open, light spills through'], ['look in', 'leans to peek', 'cranes forward', 'search the inside', 'wary, then surprised', 'hand stays on {o}', 'still', 'weight on front foot', '', 1.1]]),
  close: T([LOOK, ['reach', 'leans', 'on {o}', 'on {o}', 'determined', 'arm extends', 'palm flat', 'step', ''], ['shut', 'pushes', 'follows {o}', 'on {o}', 'firm', 'arm pushes {o} shut', 'hand presses', 'braced', '{o} swings shut with a thud', 0.8], REST]),
  give: T([['turn', 'turns toward the other character', 'to the other character', 'eye contact', 'friendly or serious', 'holds {o} close', 'grip on {o}', 'feet pivot'], ['offer', 'leans forward', 'tilts down to {o}', 'on {o}, then on the partner', 'expectant', 'arm extends {o} toward the partner', 'fingers hold the edge of {o}', 'small step forward', '{o} moves between them'], ['transfer', 'holds', 'steady', 'on the hands', 'focused', 'partner\'s hand meets {o}', 'giver releases as the receiver grips', 'still', '{o} changes hands', 0.6], ['react', 'both lean back', 'to each other', 'eye contact', 'the receiver reacts', 'arms return', 'receiver holds {o} up to look', 'settle', '{o} in the receiver\'s hands', 1.1]]),
  dig: T([LOOK, ['bend and grab', 'bends at the waist', 'down to the tool', 'on the handle', 'determined', 'right arm reaches for the tool', 'both hands close on the handle', 'knees bend', 'the tool lifts off the ground'], ['raise', 'twists back, loading the swing', 'up with the tool', 'on the target', 'teeth gritted', 'both arms raise the tool overhead', 'grip tightens', 'feet wide, weight back'], ['swing', 'drives forward', 'follows the strike', 'on the impact point', 'effort', 'arms swing down hard', 'grip holds through impact', 'weight transfers forward', 'impact: rock chips and dust burst out'], ['recover', 'straightens, breathes', 'checks the result', 'on the hole', 'tired, satisfied', 'arms reset for the next swing', 'regrip', 'reset stance', 'debris settles', 0.8]]),
  eat: T([LOOK, ['pick up', 'leans', 'down to {o}', 'on {o}', 'hungry', 'arm reaches', 'fingers close on {o}', 'still', '{o} lifts'], ['bite', 'still', 'tilts forward', 'half closed', 'mouth opens wide then closes', 'arm brings {o} to the mouth', 'holds {o}', 'still', 'a bite is missing from {o}'], ['chew', 'small bob', 'small nods', 'blink', 'cheeks puff, chewing', 'arm lowers a little', 'holds {o}', 'still', '', 1.2], ['react', 'leans back', 'tilts', 'widen', 'delight or disgust', 'free hand gestures', 'holds {o}', 'settle', '']]),
  drink: T([LOOK, ['lift', 'straight', 'to {o}', 'on {o}', 'calm', 'arm raises {o}', 'fingers wrap {o}', 'still', '{o} lifts'], ['sip', 'tilts back slightly', 'tips back', 'closed', 'lips on the rim', 'arm tips {o}', 'wrist turns', 'still', 'liquid tilts inside {o}'], ['react', 'settles', 'forward', 'open', 'satisfied', 'lowers {o}', 'holds', 'still', '']]),
  sit: T([['turn', 'turns its back to the seat', 'glance over the shoulder at the seat', 'on the seat', 'calm', 'hands drift back toward the seat', 'open', 'feet shuffle around'], ['lower', 'bends at the hips and knees', 'forward', 'forward', 'relaxed', 'hands touch the seat or armrests', 'press down to steady', 'knees bend, body lowers', 'the seat creaks and shifts slightly'], ['settle', 'settles back', 'level', 'forward', 'relaxed', 'arms rest on the knees', 'open', 'feet flat', '', 0.7]]),
  stand: T([['prepare', 'leans forward', 'forward', 'forward', 'determined', 'hands push on knees', 'press', 'feet under the body'], ['rise', 'straightens up', 'up', 'forward', 'determined', 'arms swing slightly', 'relax', 'legs straighten', 'the seat slides back a little'], REST]),
  walk: T([['start', 'leans into the first step', 'toward the destination', 'ahead', 'purposeful', 'opposite arm swings forward', 'relaxed', 'first step'], ['walk', 'walk cycle with a small bob', 'ahead, a glance around', 'ahead', 'focused', 'arms swing in opposition', 'relaxed', 'steady walk cycle, 4-6 steps', 'footsteps; the camera follows', 2], ['arrive', 'slows and stops', 'looks at the destination', 'on the destination', 'curious', 'arms settle', 'relaxed', 'last step, feet together', '']]),
  run: T([['burst', 'leans hard forward', 'toward the goal', 'ahead', 'urgent', 'arms pump', 'fists', 'drives off the back foot'], ['run', 'run cycle, body leaning', 'ahead', 'ahead, darting', 'panicked or determined', 'arms pump fast', 'fists', 'fast run cycle', 'dust kicks up behind the feet', 2], ['stop', 'skids', 'looks back or ahead', 'wide', 'breathless', 'arms out for balance', 'open', 'feet brake', 'a puff of dust']]),
  carry: T([LOOK, ['lift', 'bends and lifts with the legs', 'down to {o}', 'on {o}', 'strain', 'both arms wrap {o}', 'grip both sides', 'knees bend then straighten', '{o} lifts off the ground'], ['carry', 'leans back to balance the weight', 'ahead over {o}', 'ahead', 'effort', 'arms hold {o} at the chest', 'grip adjusts', 'heavy walk, short steps', '{o} sways with each step', 1.8], ['set down', 'bends', 'down', 'on the spot', 'relief', 'arms lower {o}', 'release', 'knees bend', '{o} lands with a thud']]),
  press: T([LOOK, ['reach', 'leans toward {o}', 'on {o}', 'on {o}', 'tense', 'arm extends, finger out', 'index finger points', 'still'], ['press', 'small push', 'steady', 'on {o}', 'determined', 'finger pushes in', 'finger presses {o}', 'still', '{o} clicks down and lights up', 0.6], ['react', 'steps back', 'up to see the effect', 'wide', 'anticipation, then surprise', 'arm pulls back', 'relax', 'step back', 'the machine responds (lights, sound, movement)', 1.2]]),
  operate: T([LOOK, ['work the controls', 'leans over the controls', 'between the controls and the machine', 'on the gauges', 'concentrating', 'both arms work the levers and switches', 'grip, turn, flip', 'braced', 'levers move, dials turn', 1.6], ['the machine responds', 'steps back', 'up at the machine', 'wide', 'impressed', 'arms lower', 'relax', 'still', 'the machine moves, lights blink, gears turn', 1.2]]),
  drive: T([['grip the wheel', 'seated, leaning forward', 'ahead', 'on the road', 'focused', 'arms out to the wheel', 'both hands grip the wheel', 'foot on the pedal'], ['steer', 'sways with the turn', 'follows the road', 'ahead', 'focused', 'arms turn the wheel', 'hand-over-hand', 'foot presses', 'the vehicle turns; scenery slides by', 1.8], REST]),
  build: T([LOOK, ['position', 'kneels or leans', 'down to the work', 'on the joint', 'concentrating', 'one hand holds the piece', 'fingers steady it', 'braced', 'the piece slides into place'], ['strike', 'rhythmic movement', 'on the work', 'on the nail', 'effort', 'tool arm strikes 2-3 times', 'grip on the tool', 'braced', 'each strike: a small jolt and a puff of dust', 1.5], ['check', 'leans back', 'tilts', 'on the result', 'proud', 'arms lower', 'relax', 'settle', 'the piece holds']]),
  write: T([LOOK, ['write', 'hunched over {o}', 'down', 'follow the pen', 'concentrating', 'writing arm moves in small strokes', 'pen grip, the other hand steadies {o}', 'still', 'ink lines appear on {o}', 1.6], ['finish', 'straightens', 'up', 'on the result', 'satisfied', 'pen lifts', 'relax', 'still', '']]),
  type: T([['ready', 'sits forward', 'to the screen', 'on the screen', 'focused', 'hands hover over the keys', 'fingers curl', 'feet flat'], ['type', 'small rhythmic movement', 'on the screen', 'flick between keys and screen', 'concentrating', 'hands move over the keyboard', 'fingers tap fast', 'still', 'the screen fills with text', 1.8], ['react', 'leans back', 'to the screen', 'widen', 'surprise', 'hands lift off the keys', 'open', 'still', 'the screen shows the result']]),
  count: T([LOOK, ['count', 'leans over {o}', 'down', 'follow each bill', 'concentrating', 'one hand holds the stack', 'thumb flicks each bill over', 'still', 'bills flick one by one', 1.8], ['react', 'straightens', 'up', 'wide', 'greedy grin or shock', 'stack held up', 'grip', 'still', '']]),
  throw: T([LOOK, ['wind up', 'twists back', 'on the target', 'on the target', 'determined', 'arm pulls back with {o}', 'grip', 'weight on back foot'], ['throw', 'twists forward', 'follows {o}', 'follow {o}', 'effort', 'arm whips forward', 'release', 'step forward', '{o} flies away'], ['watch', 'still', 'tracks {o}', 'follow', 'anticipation', 'arm follows through', 'open', 'settle', '{o} lands']]),
  fall: T([['lose balance', 'tips', 'jerks', 'wide', 'alarm', 'arms flail out', 'open', 'a foot slips', ''], ['fall', 'drops to the ground', 'turned away from impact', 'shut', 'wince', 'arms brace the fall', 'palms out', 'legs fold', 'a puff of dust on impact'], ['recover', 'sits up slowly', 'shakes', 'blink', 'dazed', 'one hand on the head', 'rub', 'push back up', '', 1.1]]),
  climb: T([LOOK, ['climb', 'pulls up', 'up', 'on the next hold', 'effort', 'arms reach and pull alternately', 'grip each hold', 'legs push alternately', 'small debris falls', 1.8], ['top', 'pulls over the top', 'looks out', 'wide', 'relief', 'arms push up', 'press', 'stands', '']]),
  hide: T([['spot the danger', 'freezes', 'snaps toward the danger', 'wide', 'fear', 'arms tense', 'open', 'still'], ['duck', 'crouches behind cover', 'down', 'over the cover', 'fear', 'arms pull in', 'cover the mouth', 'knees bend', ''], ['peek', 'stays low', 'peeks over the edge', 'darting', 'held breath', 'one hand on the cover', 'grip', 'still', '', 1.2]]),
  aim: T([['raise', 'squares toward the target', 'toward the target', 'on the target', 'stern', 'both arms lift the weapon to the shoulder', 'grip and trigger finger', 'feet apart'], ['aim', 'still', 'cheek to the stock', 'one eye closed', 'focused', 'steady', 'finger on the trigger', 'braced', ''], ['fire', 'jolts with the recoil', 'jerks back', 'blink', 'flinch', 'arms kick up', 'grip', 'braced', 'muzzle flash and a cloud of smoke'], REST]),
  point: T([['notice', 'turns toward it', 'toward it', 'on it', 'alert', 'at the sides', 'relaxed', 'feet pivot'], ['point', 'leans in', 'between it and the partner', 'on it', 'urgent', 'arm extends straight toward it', 'index finger out', 'still', ''], REST]),
  talk: T([['face', 'turns to the listener', 'to the listener', 'eye contact', 'engaged', 'relaxed', 'open', 'still'], ['talk', 'small gestures with each phrase', 'small nods', 'eye contact', 'mouth moves with the words', 'one hand gestures', 'open palm', 'weight shifts', '', 1.8], ['listen', 'still', 'tilts', 'eye contact', 'reaction to the reply', 'relaxed', 'relaxed', 'still', '']]),
  discover: T([['notice', 'freezes mid-step', 'snaps toward it', 'lock on', 'curious', 'stop swinging', 'relaxed', 'stop'], ['approach', 'leans in', 'tilts closer', 'widen', 'eyebrows rise', 'one hand lifts', 'fingers half open', 'one slow step', ''], ['realize', 'jolts', 'pulls back a little', 'wide', 'eyebrows shoot up, mouth drops', 'hands come up', 'open', 'small step back', '', 1.2]]),
  react: T([['react', 'whole body jolts', 'snaps back', 'wide', 'the emotion at full strength', 'arms fly up', 'spread', 'small hop', '', 1.2], ['hold', 'holds the pose', 'still', 'blink', 'the emotion settles', 'arms lower slowly', 'relax', 'settle', '']]),
  sleep: T([['yawn', 'stretches', 'tips back', 'heavy', 'yawn', 'arms stretch up', 'open', 'still'], ['drift off', 'slumps', 'nods down', 'close', 'peaceful', 'arms drop', 'limp', 'still', 'Z\'s float up', 1.6]]),
  wave: T([['wave', 'turns to them', 'to them', 'eye contact', 'smile', 'arm raises', 'hand waves side to side 3 times', 'still', ''], REST]),
};
const GENERIC = T([LOOK, ['act', 'performs the described action', 'on the action', 'on the action', 'matches the line', 'arms do the action', 'hands do the action', 'support the action', '{o} responds'], REST]);

const CAM = {
  stick: { approach: 'tracking side shot', reach: 'insert close-up on hand and object', grip: 'insert close-up', react: 'slow push-in to a close-up', realize: 'slow push-in to a close-up', default: 'medium shot', walk: 'side tracking shot', run: 'tracking shot, slight low angle', transfer: 'two-shot, both hands in frame', fire: 'medium wide', swing: 'medium, low angle' },
  blocky: { approach: 'follow from behind', reach: 'over-the-shoulder', grip: 'insert close-up on the hand', react: 'snap zoom to the face', realize: 'slow push-in', default: 'medium shot', walk: 'follow from behind', run: 'tracking follow', 'look in': 'over-the-shoulder into the dark', transfer: 'two-shot', fire: 'wide' },
  cinema: { approach: 'establishing wide, then dolly-in', reach: 'macro close-up on the hand', grip: 'macro close-up', react: 'push-in, shallow depth of field', realize: 'push-in', default: 'medium shot, shallow depth of field', walk: 'tracking alongside for scale', run: 'tracking shot', 'the machine responds': 'crane up for scale', 'work the controls': 'over-the-shoulder on the controls', transfer: 'two-shot', swing: 'slow motion medium' },
};
const SFX = { walk: 'footsteps', run: 'fast footsteps, panting', sit: 'chair creak', fall: 'thud and dust', swing: 'whoosh then rock impact', fire: 'musket crack and echo', press: 'button click, machine hum', 'push/pull': 'door creak', shut: 'door thud', bite: 'crunch', chew: 'chewing', sip: 'sip', type: 'keyboard clatter', write: 'pen scratch', count: 'bills flicking', strike: 'hammer knocks', 'drift off': 'soft snore', react: 'gasp', realize: 'sting', 'the machine responds': 'gears whir, lights buzz', throw: 'whoosh', transfer: 'paper rustle' };

/** who acts in a sentence: a named cast member, else the previous actor (pronouns), else the lead */
function actorOf(sentence, cast, prev) {
  const named = cast.find((c) => new RegExp(`\\b${c.name.replace(/[^\w ]/g, '')}\\b`, 'i').test(sentence));
  if (named) return named.name;
  if (/\b(he|she|they|his|her|him)\b/i.test(sentence) && prev) return prev;
  const role = /\b(the (?:[a-z]+ )?(miner|boy|girl|man|woman|guard|prisoner|king|soldier|scientist|worker|teacher|kid|cashier|farmer|engineer|doctor|general|inventor|chef|driver|player|stranger|mayor))\b/i.exec(sentence);
  return role ? role[1].replace(/^the /i, 'The ') : prev || cast[0]?.name || 'The lead';
}

/** the action plan for one scene: every verb family found in its narration, in order, as animation steps */
export function decompose(scene, engineId, cast = [], prevActor = '') {
  const text = scene.narration;
  const found = [];
  for (const [re, key] of VERBS) { const m = re.exec(text); if (m && !found.some((f) => f.key === key)) found.push({ key, at: m.index, re }); }
  found.sort((a, b) => a.at - b.at);
  const who = actorOf(text, cast, prevActor);
  const place = (PLACE.exec(text)?.[1] || scene.background || '').toLowerCase();
  let last = '';
  const plan = (found.length ? found : [{ key: 'generic', re: /$^/ }]).slice(0, 3).flatMap((f) => {
    // a verb with no object of its own acts on the previous one ("picked up the paper and discovered...")
    const obj = (f.key === 'generic' ? '' : objectAfter(text, f.re)) || last; last = obj;
    const [, material, sound] = materialOf(obj);
    return (STEPS[f.key] || GENERIC)(who, obj, place).map((s) => ({ ...s, action: f.key, material, objSound: sound, target: obj }));
  });
  const total = Number(scene.duration) || 3, W = plan.reduce((a, s) => a + s.weight, 0);
  const cams = CAM[engineId] || CAM.stick;
  let t = 0;
  return {
    actor: who, verbs: found.map((f) => f.key),
    steps: plan.map((s, i) => {
      const d = Math.round((total * s.weight / W) * 100) / 100, start = Math.round(t * 100) / 100; t += d;
      const next = plan[i + 1];
      return {
        n: i + 1, action: s.name, family: s.action, character: who, start, end: Math.round(t * 100) / 100, duration: d,
        startPos: i === 0 ? `${who} in position${s.place ? ` (${s.place})` : ''}` : `as the previous step ended`,
        endPos: next ? `ready for "${next.name}"` : 'holding the final pose', body: s.body.replace(/\{o\}/g, s.target || 'it'), head: s.head.replace(/\{o\}/g, s.target || 'it'), eyes: s.eyes.replace(/\{o\}/g, s.target || 'it'),
        face: s.face, arms: s.arms.replace(/\{o\}/g, s.target || 'it'), hands: s.hands.replace(/\{o\}/g, s.target || 'it'), legs: s.legs, object: s.object || (s.target ? `${s.target} stays put` : ''),
        camera: cams[s.name] || cams.default, sfx: SFX[s.name] || (/grip|lift|pick|set down|transfer|unfold|raise/.test(s.name) && s.target ? s.objSound : ''),
        transition: next ? (next.action !== s.action ? 'cut on the action' : 'continuous') : 'cut',
      };
    }),
  };
}

/** a readable list of what the action plan contains, for the scene card */
export const summary = (plan) => plan.steps.map((s) => s.action).join(' → ');
