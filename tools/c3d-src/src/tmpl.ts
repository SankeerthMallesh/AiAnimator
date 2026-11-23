// Loomy's templated shots for the cartoon-3d engine: a script's characters on places of the riverside town
// (the bridge deck, the riverbank by the bridge end, the park), framed by shot kind (Loomy's shot library:
// talk, two, react, wide, walk, point, group) with the bridge film's camera grammar: slow eased push-ins and
// pull-outs, a punch-in on impacts, gentle orbits. Every place is seen from the side the film's own cameras
// look from, so no house ever blocks the lens (world.ts leaves out the houses on the film's sight lines).
import { D0, PARK, V3 } from "./story";
import { LIGHTS } from "./lights";
import type { TPerson, TFx } from "./cast";
import type { Expr } from "./toon";

export type TWord = { start: number; end: number };
/** one shot of a Loomy video: times in seconds on the video's timeline */
export type TSpec = {
  start: number; end: number; kind: string; place: string; cast: number[]; pose: string; camera: string;
  light: "day" | "golden"; seed: number; words: TWord[]; effect?: string; icon?: string;
  /** 2.0: the map's build seed (one per video, so every shot in a place sees the same room) and its resolved anchor */
  mapSeed?: number; at?: { m: V3; d: [number, number] };
  /** 2.0: the lead's action (sit, sleep, dig, eat, drink, type, phone, carry) and its height (a bed, a chair); lip: mouths
   *  move with the narration (off: the narrator is off screen and the cast acts) */
  act?: string; actY?: number; lip?: boolean;
  /** 2.0: the lead's face for this line (from the script's feeling or the narrator's read) */
  expr?: string;
  /** 2.0: other people in the place (cast looks), going about their business behind the lead */
  extras?: number[];
  /** 2.1: what the second person in the shot and the background people are busy with */
  act2?: string; extraAct?: string;
  /** 2.1 insert shots: the line's words, for a headline or a label on the thing */
  label?: string;
};
export type TFrame = {
  cam: { pos: V3; look: V3; fov: number; roll: number }; light: "day" | "golden"; sun: [number, number, number];
  people: TPerson[]; effects: TFx[]; cInf: number; focus: V3;
};

/** m = where the cast stands, d = the ground direction from there toward the lens (as the film's cameras) */
export const PLACES: Record<string, { m: V3; d: [number, number] }> = {
  bridge: { m: [0, D0, -9], d: [0.253, -0.967] },      // shot 15: tourists on the deck
  bank: { m: [-4.6, D0, -33.6], d: [-0.013, -1] },     // shot 14: the bank at the bridge end
  park: { m: [PARK[0] + 0.55, D0, PARK[2] - 3.6], d: [0, -1] }, // shot 12: in front of the swing set
};
export const PLACE_NAMES = ["bridge", "bank", "park", "town"];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 2.1: the beat of an action (0..1) at time t: each action has its own rhythm, eased so the hands never snap */
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
export function beatOf(act: string, t: number, off = 0): number {
  const a = act.split(":")[0], T = t + off;
  switch (a) {
    case "dig": return (Math.sin(T * 4.2) + 1) / 2;
    case "aim": return (T * 0.55) % 1;
    case "press": { const u = (T % 1.3) / 1.3; return u < 0.22 ? ease(u / 0.22) : u < 0.4 ? 1 : u < 0.7 ? 1 - ease((u - 0.4) / 0.3) : 0; }
    case "write": return (T * 0.7) % 1;
    case "count": return (T * 1.8) % 1;
    case "cheer": case "wave": return (T * 1.7) % 1;
    case "clap": return Math.abs(Math.sin(T * 6.5));
    case "panic": return (T * 1.4) % 1;
    case "lift": return ease(t / 1.1) * (0.94 + 0.06 * Math.sin(T * 3));
    case "hold": return 0.5 + 0.5 * Math.sin(T * 1.8);
    case "sweep": return (Math.sin(T * 3.2) + 1) / 2;
    case "think": case "shrug": case "look": case "salute": case "point": return 0.5 + 0.5 * Math.sin(T * 2);
    default: return (Math.sin(T * 2.6) + 1) / 2;
  }
}
const MOVING = ["walk", "run"];
/** hand actions a person walks in to start, rather than already doing them when the shot cuts in */
const WALK_IN = ["press", "point", "write", "read", "hold", "lift", "count", "look", "think", "shrug", "salute", "wave", "phone", "sweep", "cheer", "clap"];
const speaking = (ws: TWord[], t: number) => ws.some((w) => t >= w.start - 0.04 && t <= w.end + 0.04);

/** Loomy pose words -> the toon faces (talking alternates an open and a closed mouth on the words) */
const FACE: Record<string, Expr> = { stand: "smile", talk: "smile", point: "grin", surprised: "shock", shrug: "nervous", cheer: "laugh", think: "nervous", flinch: "pained" };
const TALK: Expr[] = ["relief_open", "smile"];

/** the frame of one template shot at local time t (seconds from the shot's start) */
export function frameAt(s: TSpec, t: number): TFrame {
  const dur = Math.max(0.1, s.end - s.start), k = glide(t / dur);
  const place = s.at || PLACES[s.place] || PLACES.bridge;
  const [mx, my, mz] = place.m;
  let [dx, dz] = place.d;
  // orbit: the lens drifts around the cast by up to 0.3 rad (both ways keep it on the film's side)
  if (s.camera === "orbit") { const a = lerp(-0.18, 0.18, k), c = Math.cos(a), sn = Math.sin(a); [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c]; }
  const rx = dz, rz = -dx; // screen right
  const at = (r: number, d: number): [number, number] => [mx + rx * r + dx * d, mz + rz * r + dz * d];
  const words = s.words.map((w) => ({ start: w.start - s.start, end: w.end - s.start }));
  const talking = s.lip ? speaking(words, t) : false;
  const face = (pose: string, i: number): Expr => (pose === "talk" || (pose === "stand" && i === 0)) && talking && i === 0 ? TALK[Math.floor(t * 9) % 2] : FACE[pose] || "smile";
  const people: TPerson[] = [], effects: TFx[] = [];
  const who = (i: number) => s.cast[i % Math.max(1, s.cast.length)] ?? i;
  const onset = (a: number) => t >= a;
  // framing: [lens distance, lens height, look height, fov, side offset of the look, depth of field]
  let dist = 3.2, h = 1.5, lookY = 1.3, fov = 36, lookSide = 0, cInf = 8;
  switch (s.kind) {
    case "talk": {
      const [x, z] = at(0, 0);
      people.push({ look: who(0), x, z, expr: face(s.pose === "stand" ? "talk" : s.pose, 0), wave: s.pose === "talk" && talking ? Math.sin(t * 5) * 0.6 : undefined });
      dist = 3.0; h = 1.55; lookY = 1.35; fov = 34; cInf = 9; break;
    }
    case "two": {
      const [ax, az] = at(-0.62, 0), [bx, bz] = at(0.62, -0.15);
      people.push({ look: who(0), x: ax, z: az, expr: face("talk", 0), facing: 1 });
      people.push({ look: who(1), x: bx, z: bz, expr: onset(dur * 0.4) ? FACE[s.pose] || "smile" : "smile", facing: -1 });
      dist = 4.4; h = 1.6; lookY = 1.25; fov = 38; cInf = 6; break;
    }
    case "react": {
      const [x, z] = at(0, 0);
      people.push({ look: who(0), x, z, expr: onset(0.15) ? FACE[s.pose === "talk" ? "surprised" : s.pose] || "shock" : "neutral" });
      if (s.pose === "surprised" || s.pose === "flinch") effects.push({ kind: "stars", x: x + rx * 0.05, y: my + 2.2, z, u: clamp01((t - 0.15) / 0.5), size: 0.8 });
      dist = 2.5; h = 1.7; lookY = 1.72; fov = 32; cInf = 13; break;
    }
    case "insert": {
      // 2.1: the close-up of what the hands are doing, big in front of the lens; the lead stands soft behind it
      // (their own hands are together in front of them, hidden by the close-up, so no second pair shows)
      const [x, z] = at(0, 0), [ix, iz] = at(0.03, 0.95), [a0, it = ""] = (s.act || "hold").split(":");
      people.push({ look: who(0), x, z, expr: (s.expr as Expr) || "neutral", act: "clap", k: 1 });
      effects.push({ kind: "insert", x: ix, y: my + 1.12, z: iz, u: beatOf(s.act || "hold", t), size: 0.42, act: a0, item: it, label: s.label || "", look: who(0) });
      dist = 2.0; h = 1.2; lookY = 1.12; fov = 34; cInf = 14; break;
    }
    case "walk": {
      const d = lerp(-3.2, 0, clamp01(t / dur));
      const [x, z] = at(0, d);
      people.push({ look: who(0), x, z, expr: face("talk", 0), walk: t * 0.9 });
      dist = 4.6; h = 1.6; lookY = 1.2; fov = 38; cInf = 5; break;
    }
    case "point": {
      const [x, z] = at(0.22, 0), [sx, sz] = at(-0.62, -0.3);
      people.push({ look: who(0), x, z, expr: face("point", 0), wave: onset(0.3) ? 0.9 : undefined, facing: -1 });
      effects.push({ kind: "burst", x: sx, y: my + 1.7, z: sz, u: clamp01((t - 0.35) / 0.45), size: 1.0 });
      dist = 4.6; h = 1.55; lookY = 1.35; fov = 36; lookSide = -0.15; cInf = 7; break;
    }
    case "group": {
      [[-1.05, -0.35], [0, 0], [1.05, -0.35]].forEach(([r, d], i) => {
        const [x, z] = at(r, d), cheer = s.pose === "cheer" || s.pose === "talk";
        people.push({ look: who(i), x, z, expr: cheer ? "laugh" : FACE[s.pose] || "smile", wave: cheer ? Math.sin(t * 9 + i * 1.3) : undefined, hop: cheer ? Math.max(0, Math.sin(t * 7 + i)) * 0.16 : 0 });
      });
      dist = 6.0; h = 1.8; lookY = 1.2; fov = 40; cInf = 4; break;
    }
    default: { // wide: the place with the cast small in it
      const n = Math.min(2, Math.max(1, s.cast.length));
      for (let i = 0; i < n; i++) { const [x, z] = at(i ? 0.9 : -0.3, i ? -0.5 : 0); people.push({ look: who(i), x, z, expr: FACE[s.pose] || "smile" }); }
      dist = 9.5; h = 2.6; lookY = 1.4; fov = 42; cInf = 0;
    }
  }
  // camera move (the film's grammar: eased, symmetric, no hand-held float)
  let side = 0, roll = 0;
  switch (s.camera) {
    case "push-in": dist *= lerp(1.08, 0.92, k); break;
    case "pull-out": dist *= lerp(0.9, 1.1, k); break;
    case "pan-left": side += lerp(0.35, -0.35, k); break;
    case "pan-right": side += lerp(-0.35, 0.35, k); break;
    case "tilt-up": lookY += lerp(-0.4, 0.1, k); break;
    case "tilt-down": lookY += lerp(0.3, -0.15, k); break;
    case "impact": dist *= t < dur * 0.3 ? 1.05 : lerp(1.05, 0.8, glide((t - dur * 0.3) / 0.25)); roll = 0.03 * glide((t - dur * 0.3) / 0.25); break;
    case "vertigo": dist *= lerp(1.3, 0.85, k); fov *= lerp(0.8, 1.15, k); break;
    default: dist *= lerp(1.03, 0.97, k);
  }
  // 2.0: the lead does the shot's action (an even swing for eating, drinking and digging)
  const a0 = (s.act || "").split(":")[0];
  if (s.act && people.length && MOVING.includes(a0)) {
    // 2.1: walking or running across the place, past the lens's mark (in a walk shot they come toward the lens)
    const fast = a0 === "run", p0 = people[0];
    if (s.kind !== "walk") { const r = lerp(fast ? -2.2 : -1.3, fast ? 2.2 : 1.3, clamp01(t / dur)); const [x, z] = at(r, 0); p0.x = x; p0.z = z; p0.facing = 1; }
    Object.assign(p0, { act: a0, walk: t * (fast ? 1.7 : 0.9), wave: undefined });
  } else if (s.act && people.length && s.kind !== "insert") {
    // 2.1: hand actions start with a few steps onto the mark on every other shot, so the cut lands on movement
    const into = s.kind !== "react" && s.seed % 2 === 0 && WALK_IN.includes(a0) && !s.actY, tin = 0.85;
    const swing = beatOf(s.act, into ? Math.max(0, t - tin) : t);
    Object.assign(people[0], { act: s.act, k: swing, y: s.actY ?? 0, wave: undefined, walk: undefined });
    if (into && t < tin) {
      const [x, z] = at(lerp(-0.9, 0, ease(t / tin)), 0);
      Object.assign(people[0], { x: x + (people[0].x - mx), z: z + (people[0].z - mz), walk: t * 0.9, facing: 1 });
    }
    // asleep: the drawing lies along the bed (it turns about its feet, so they go at the bed's screen-right end)
    if (s.act === "sleep") { people[0].x = mx + rx * 0.95; people[0].z = mz + rz * 0.95; lookY = 0.85; h = Math.min(h, 1.5); }
  }
  // 2.0: inside a map the lens comes in closer and stays at eye height (less empty floor, the cast bigger), and
  // single shots are medium shots, so the place and what is in it stay in the picture
  // 2.1 (references): the cast a little bigger in the picture (medium shots fill about half the height)
  if (s.at && s.kind === "wide") { dist = Math.min(dist, 5.6); h = Math.min(h, 1.8); lookY = 1.2; fov = 40; }
  if (s.at && s.kind === "talk") { dist = 3.4; h = 1.5; lookY = 1.12; fov = 38; cInf = 6; }
  if (s.at && s.kind === "react") { dist = 2.9; h = 1.85; lookY = 1.82; fov = 34; }
  // background people stay readable (a strong blur turned the flat drawings into ghosts)
  if (s.at && s.kind !== "insert") cInf = Math.min(cInf, 2);
  if (s.expr && people.length && s.act !== "sleep") people[0].expr = s.expr as Expr;
  // 2.0: background people: one walks across the back of the room, another stands at the side
  // 2.2: a battle of the musket age: two armies on the field facing each other, volleys going off along the lines,
  // their general on horseback behind his men; the lead stays in front of them
  if (s.place === "battlefield" && s.kind !== "insert") {
    // in a tall frame the lines run diagonally: our army near and to the left, the enemy farther back on the right
    const ranks: [number, number, 1 | -1, "blue" | "red"][] = [];
    for (let i = 0; i < 6; i++) ranks.push([-1.55 + (i % 3) * 0.42, -0.9 - Math.floor(i / 3) * 0.9 - (i % 3) * 0.35, 1, "blue"]);
    for (let i = 0; i < 6; i++) ranks.push([0.45 + (i % 3) * 0.45, -3.6 - Math.floor(i / 3) * 0.9 - (i % 3) * 0.3, -1, "red"]);
    ranks.forEach(([r, d, f, u], i) => {
      const [x, z] = at(r, d), k = beatOf("aim", t, i * 0.29);
      people.push({ look: who(0), x, z, expr: i % 3 ? "stern" : "shock", uni: u, facing: f, act: "aim", k });
      // the smoke of the last shot drifts off the muzzle
      const since = (k - 0.85 + 1) % 1;
      if (since < 0.5) { const [sx, sz] = at(r + f * (0.75 + since * 0.6), d); effects.push({ kind: "smoke", x: sx, y: my + 1.35 + since * 0.4, z: sz, u: since * 2, size: 0.9 }); }
    });
    const [gx, gz] = at(-1.0, -3.0);
    people.push({ look: who(0), x: gx + Math.sin(t * 0.6) * 0.15, z: gz, expr: "stern", uni: "general", facing: 1, act: "point", k: 0.5, horse: true, y: 0.42, walk: t * 1.1 });
  }
  // 2.1: the second person in a two-shot is busy too (reacting with their hands or doing their own thing)
  if (s.act2 && s.kind === "two" && people[1]) Object.assign(people[1], { act: s.act2, k: beatOf(s.act2, t, 0.7) });
  if (s.at && s.extras?.length && ["talk", "two", "wide", "point"].includes(s.kind)) {
    const back = -1.9, a = s.extras[0], b = s.extras[1];
    const across = lerp(-1.4, 1.4, clamp01((t + (s.seed % 3)) / Math.max(dur, 2.5)));
    { const [x, z] = at(across * (s.seed % 2 ? 1 : -1), back); people.push({ look: a, x, z, expr: "neutral", walk: t * 0.9, facing: s.seed % 2 ? -1 : 1, ...(s.extraAct?.startsWith("hold") ? { act: s.extraAct } : {}) }); }
    if (b != null) {
      const [x, z] = at(s.seed % 2 ? -0.95 : 0.95, back + 0.3), ea = s.extraAct || "";
      people.push({ look: b, x, z, expr: FACE[s.pose] === "shock" ? "shock" : "neutral", ...(ea ? { act: ea, k: beatOf(ea, t, 1.3) } : {}) });
    }
  }
  const pos: V3 = [mx + dx * dist + rx * side, my + h, mz + dz * dist + rz * side];
  const look: V3 = [mx + rx * (lookSide + side * 0.6), my + lookY, mz + rz * (lookSide + side * 0.6)];
  // the sun: camera-relative like the film (its azimuth from the light preset, toward screen right)
  const L = LIGHTS[s.light], az = (L.az * Math.PI) / 180, el = (L.el * Math.PI) / 180;
  const fx = -dx, fz = -dz, hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  const n = Math.hypot(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)) || 1;
  const sun: [number, number, number] = [(hx * Math.cos(el)) / n, Math.sin(el) / n, (hz * Math.cos(el)) / n];
  const ins = effects.find((e) => e.kind === "insert");
  const focus: V3 = ins ? [ins.x, ins.y, ins.z] : people.length ? [people[0].x, my + 1.4, people[0].z] : look;
  return { cam: { pos, look, fov, roll }, light: s.light, sun, people, effects, cInf, focus };
}

/** the establishing aerial over the river and the bridge (the film's shot 8c / golden 11) */
export function aerialAt(light: "day" | "golden", k: number) {
  const golden = light === "golden";
  const a: V3 = golden ? [14, 10.5, -47] : [24, 26, -78], b: V3 = golden ? [-1, 7, -4] : [0, 4, -8];
  const m = lerp(1.04, 0.96, glide(k));
  return { pos: [b[0] + (a[0] - b[0]) * m, b[1] + (a[1] - b[1]) * m, b[2] + (a[2] - b[2]) * m] as V3, look: b, fov: golden ? 40 : 42, roll: 0 };
}
