// The scene generator. The narration is cut into scenes HERE (one or two sentences each), so every scene's
// narration is exactly the script's words; the AI only fills in the picture for each given segment, using the
// project's engine (shots, moves, lights, places). The image and animation prompts are then assembled in code from
// the engine's style and each character's locked design sheet, so a character looks the same in every scene.
import { askJSON } from './ai.js';
import { ENGINES } from './engines.js';
import { words } from './util.js';
import { mapFor, actFor } from '../../cartoon/js/maps.js';
import { explainKind } from '../../shared/explain.js';

const WPS = 2.6; // spoken words a second (natural narration)
export const secondsFor = (text) => Math.max(1.6, Math.round((words(text).length / WPS + 0.35) * 10) / 10);

/** narration lines -> segments of about 2-6 seconds */
export function segment(lines) {
  const sentences = lines.flatMap((l) => String(l).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || []).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last && words(last).length + words(s).length <= 11 && words(s).length <= 6) out[out.length - 1] = `${last} ${s}`;
    else out.push(s);
  }
  return out;
}

/** one character's design sheet as prompt text (the same words every time it is used) */
export function sheet(c) {
  if (!c) return '';
  const col = c.colors || {};
  return `${c.name}: ${c.face || 'round white face with expressive eyebrows'}, ${c.body || 'thin black stick arms and legs, rounded torso'}, wearing ${c.outfit || 'a plain outfit'}${col.main ? ` (main colour ${col.main}${col.accent ? `, accent ${col.accent}` : ''})` : ''}`;
}

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

/** a complete plan made in code (used when the AI writer is not available, and to fill any gap it leaves) */
export function localPlan(E, segs, cast) {
  return segs.map((text, i) => {
    const place = E.id === 'cinema' ? pick(E.places, i + (explainKind(text) ? 1 : 0)) : (mapFor({ narration: text }) || pick(E.places, i));
    const act = actFor({ narration: text }, mapFor({ narration: text }), i).split(':')[0] || 'look';
    const [shot, why] = i === 0 ? E.shots[0] : pick(E.shots.slice(1), i - 1);
    return {
      narration: text, description: `${E.id === 'cinema' ? 'Visual explanation' : 'The moment'}: ${text}`, characters: E.usesCast ? cast.slice(0, i % 3 === 2 ? 2 : 1).map((c) => c.name) : [],
      positions: E.usesCast ? 'lead centre third, facing the lens slightly left' : 'subject centred in the upper two thirds', expressions: /!|\b(scream|panic|shock|terrif)/i.test(text) ? 'shocked, eyebrows up' : /\?/.test(text) ? 'curious, one eyebrow raised' : 'focused',
      movement: act, background: place, shot, reason: why, move: pick(E.moves, i), lighting: pick(E.lights, i + (i > segs.length * 0.6 ? 2 : 0)), sfx: '',
    };
  });
}

/** asks the AI for each segment's picture; keeps the narration exactly as given */
export async function planScenes(project, cast) {
  const E = ENGINES[project.engine] || ENGINES.stick;
  const segs = segment(project.lines || []);
  if (!segs.length) throw new Error('Write or generate the script first: the scenes are made from its narration.');
  let rows = null, source = 'ai';
  try {
    const user = `Engine: ${E.label}. Visual style: ${E.style}.
Places to choose from (or similar): ${E.places.join('; ')}.
Shot types: ${E.shots.map((s) => s[0]).join(', ')}. Camera moves: ${E.moves.join(', ')}. Lighting: ${E.lights.join('; ')}.
${E.usesCast && cast.length ? `Characters (use only these names): ${cast.map((c) => `${c.name} (${c.personality || ''})`).join('; ')}.` : 'No recurring cartoon characters: anonymous figures, objects, cutaways and diagrams.'}
For EACH numbered narration segment below, plan ONE shot that shows exactly what that segment says (no unrelated scenes). Never use the same shot type twice in a row. Each scene needs a reason to exist.
${segs.map((s, i) => `${i + 1}. ${s}`).join('\n')}
JSON: {"scenes": [{"n": 1, "description": what we see, "characters": [names], "positions": where each stands in the 9:16 frame, "expressions": faces, "movement": body movement, "background": the environment, "shot": shot type, "reason": why this shot, "move": camera movement, "lighting": lighting, "sfx": sound effects}, ...one per segment]}`;
    const r = await askJSON(`You are an animation director planning vertical 9:16 Shorts. ${E.id === 'cinema' ? 'Make every step of the explanation visible: cutaways, cross-sections, scale comparisons, labelled diagrams, reenactments.' : 'Suspense first: reveal the strange rule visually, keep the same places looking the same, build to the twist.'} Answer with JSON only.`, user, { temperature: 0.7, max_tokens: 7000 });
    rows = Array.isArray(r.scenes) ? r.scenes : null;
  } catch (e) { if (e.name === 'AbortError') throw e; source = 'local'; project._planNote = e.message; }
  const fallback = localPlan(E, segs, cast);
  const scenes = segs.map((text, i) => {
    const a = (rows || []).find((x) => Number(x.n) === i + 1) || (rows || [])[i] || {};
    const f = fallback[i];
    const str = (v, d) => (Array.isArray(v) ? v.join(', ') : String(v ?? '').trim()) || d;
    return {
      id: `s${i + 1}`, narration: text, description: str(a.description, f.description),
      characters: (Array.isArray(a.characters) ? a.characters.map(String) : f.characters).filter((n) => !E.usesCast || cast.some((c) => c.name.toLowerCase() === n.toLowerCase()) || !cast.length),
      positions: str(a.positions, f.positions), expressions: str(a.expressions, f.expressions), movement: str(a.movement, f.movement),
      background: str(a.background, f.background), shot: str(a.shot, f.shot), reason: str(a.reason, f.reason), move: str(a.move, f.move),
      lighting: str(a.lighting, f.lighting), sfx: str(a.sfx, ''), duration: secondsFor(text),
    };
  });
  fixRepeats(scenes, E);
  scenes.forEach((s) => promptsFor(s, E, cast));
  return { scenes, source };
}

/** never the same shot type twice in a row (a repeat takes the engine's next shot, with its reason) */
export function fixRepeats(scenes, E) {
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].shot.toLowerCase() === scenes[i - 1].shot.toLowerCase()) {
      const alt = E.shots.find(([s]) => s !== scenes[i - 1].shot.toLowerCase() && s !== scenes[i + 1]?.shot?.toLowerCase());
      if (alt) { scenes[i].shot = alt[0]; scenes[i].reason = `${alt[1]} (changed so two shots in a row are not the same)`; }
    }
  }
  return scenes;
}

/** the image and animation prompts, assembled from the scene and the locked character sheets */
export function promptsFor(s, E, cast) {
  const who = E.usesCast || s.characters.length ? s.characters.map((n) => cast.find((c) => c.name.toLowerCase() === n.toLowerCase())).filter(Boolean) : [];
  const people = who.length ? ` Characters (keep exactly this design): ${who.map(sheet).join('; ')}. Positions: ${s.positions}. Expressions: ${s.expressions}.` : '';
  s.imagePrompt = `${E.style}. ${s.shot} shot. ${s.description}. Setting: ${s.background}. Lighting: ${s.lighting}.${people} No text, no logos.`;
  s.animPrompt = `${E.animStyle}. Camera: ${s.move} on a ${s.shot}. Action: ${s.movement}. ${s.description}. ${Math.round(s.duration * 10) / 10} seconds, 9:16.${who.length ? ` Keep ${who.map((c) => c.name).join(' and ')} on model (same face, outfit and colours as the reference).` : ''}`;
  return s;
}
