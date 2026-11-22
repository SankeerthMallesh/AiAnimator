// 1.5: the 3D town's people in every Cartoons video. The town draws its characters as flat drawings
// (cartoon/js/c3d/toon2d.js, built from tools/c3d-src/src/toon.ts) and lights them in 3D; here the same
// drawings stand on the painted sets: the same bodies, faces, shading and thick-thin outlines. The
// stage's state for a character (pose, feeling, talking, the thing in hand) maps to the town's options,
// and the held thing is drawn at the drawing's own hand.

import { Pen, bodyFront, SKINS } from './c3d/toon2d.js';
import { Cast, Ink } from './cast.js';

const TARGET = 5.9; // character height (crown to sole) in stage units, like the painted cast
const HAIR = { brown: '#7a4a28', black: '#2a2422', blonde: '#d8a845', red: '#b8522c' };
const CAPS = ['cap', 'officer', 'conductor', 'hardhat', 'beanie', 'flatcap', 'helmet', 'grad', 'chef', 'viking'];

// A character's look -> the town's outfit.
export function outfitFor(look = {}, skinIndex = 0) {
  const costume = look.costume || 'vest';
  const jacket = costume === 'labcoat' ? '#f2f4f7' : costume === 'suit' ? '#2c3e6b' : look.color || '#3f6fb5';
  const hat = look.hat === 'tophat' || look.hat === 'fedora' || look.hat === 'bowler' ? 'tophat' : CAPS.includes(look.hat) ? 'cap' : 'hair';
  const cap = look.hat === 'officer' ? '#2e3f73' : look.hat === 'hardhat' ? '#f2c230' : look.hat === 'chef' ? '#f4f1ea' : look.color || '#e2453c';
  return {
    jacket, pants: costume === 'suit' ? '#23304f' : '#3b3f52', boots: '#4a3426', hat, cap,
    hair: HAIR[look.hair] || HAIR.brown, buttons: costume === 'labcoat' ? '#9aa3ae' : '#f4f1ea',
    skin: SKINS[((skinIndex % SKINS.length) + SKINS.length) % SKINS.length],
  };
}

const BASE = { neutral: 'smile', happy: 'grin', sad: 'pained', angry: 'stern', shocked: 'shock', skeptical: 'neutral', smug: 'smile', sleepy: 'whistle', nervous: 'nervous', scared: 'nervous' };

// Feeling, pose and talking -> the town's face.
export function exprFor(st) {
  const pose = st.pose || 'idle';
  if (pose === 'laugh' || pose === 'cheer') return 'laugh';
  if (pose === 'cry' || pose === 'facepalm') return 'pained';
  if (pose === 'shock') return 'shock';
  const base = BASE[st.feel] || 'smile';
  const talking = (st.talk || 0) > 0.4;
  if (talking && (base === 'smile' || base === 'grin' || base === 'neutral')) return 'relief_open';
  return base;
}

// Pose -> how the drawing stands, walks, sits and where its arm goes.
export function optsFor(st) {
  const pose = st.pose || 'idle', t = st.t || 0, pt = st.poseT ?? t;
  const o = { mode: 'stand', expr: exprFor(st), facing: 1, seed: 1 + ((st.phase || 0) % 7), blink: ((t + (st.phase || 0)) % 3.6) < 0.12 };
  if (pose === 'walk' || pose === 'enter' || pose === 'exit') { o.mode = 'stroll'; o.phase = Math.round(((pt * 0.95) % 1) * 24) / 24; }
  else if (pose === 'sit' || pose === 'drive') o.mode = 'sit';
  if (st.use?.act === 'show' || pose === 'show') o.wave = 1;
  else if (pose === 'point') o.prop = ['reach', 0.42];
  else if (pose === 'present' || pose === 'give' || pose === 'hold' || st.use) o.prop = ['reach', 0.75];
  else if (pose === 'wave') o.wave = Math.round(Math.sin(t * 14) * 4) / 5;
  else if (pose === 'cheer' || pose === 'jump' || pose === 'shock' || pose === 'laugh') o.wave = 1;
  else if (st.hold) o.prop = ['reach', 0.8];
  if (pose === 'shrug') o.tilt = 4;
  if (pose === 'think') o.headTilt = 10;
  if (pose === 'facepalm' || pose === 'cry') o.headTilt = -8;
  return o;
}

// A small cache of drawings (one canvas each), most recently used last.
const cache = new Map();
const MAX = 18;
let measured = null;

function drawing(outfit, opts, s) {
  const key = `${JSON.stringify(outfit)}|${JSON.stringify(opts)}|${s.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const cw = Math.ceil(600 * s), ch = Math.ceil(1000 * s);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.scale(s, s);
  const info = bodyFront(new Pen(g), outfit, opts) || {};
  const out = { c, info };
  cache.set(key, out);
  while (cache.size > MAX) cache.delete(cache.keys().next().value);
  return out;
}

// The drawing's height in design units (crown to sole), measured once.
function designHeight() {
  if (measured) return measured;
  const c = document.createElement('canvas'); c.width = 60; c.height = 100;
  const g = c.getContext('2d'); g.scale(0.1, 0.1);
  const info = bodyFront(new Pen(g), outfitFor({}), { mode: 'stand', expr: 'smile' }) || {};
  measured = (info.sole ?? 975) - (info.crown ?? 190);
  return measured;
}

// Draw one character like Cast.draw does (same state object). parts: 'head' draws nothing (the town
// drawing is one piece), anything else draws the whole person.
export function drawToon(ctx, st, parts = 'all') {
  if (parts === 'head') return;
  const u = st.u, face = st.face === -1 ? -1 : 1, pose = st.pose || 'idle';
  const t = st.t || 0, pt = st.poseT ?? t;
  const hop = pose === 'jump' || pose === 'shock' ? Math.sin(Ink.clamp(pt / 0.55, 0, 1) * Math.PI) * 0.95
    : pose === 'cheer' || pose === 'laugh' ? Math.abs(Math.sin(t * 6)) * 0.18 : 0;
  // A soft shadow on the ground.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(st.x, st.ground + 6, (1.15 - hop * 0.25) * u, 0.28 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  ctx.restore();
  const s = (TARGET * u) / designHeight();
  const outfit = outfitFor(st, (st.phase || 0) + (st.color || '').length);
  const opts = optsFor(st);
  const { c, info } = drawing(outfit, opts, s);
  const sole = info.sole ?? 975;
  ctx.save();
  ctx.translate(st.x, st.ground - hop * u);
  ctx.scale(face, 1);
  ctx.drawImage(c, -300 * s, -sole * s);
  // The thing in hand, at the drawing's own hand.
  if (st.hold) {
    const hand = info.hand || [300, sole - 400];
    Cast.held(ctx, st.hold, [((hand[0] - 300) * s) / u, ((hand[1] - sole) * s) / u], u, st.use);
  }
  ctx.restore();
}
