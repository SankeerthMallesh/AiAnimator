// Blocky game-world characters and places, all made in code: rounded block avatars (head, torso,
// arms, legs on pivots), faces drawn on the head with a set of expressions, clothes painted on the
// blocks, and a bright block world (grass, paths, trees, houses, fences, clouds). Generic game
// style: no studs, logos or anyone's characters.
//
// makeAvatar(look) -> Avatar with .object (place it in a scene), .pose(name, t) and .face(name).
// makeWorld(kind) -> THREE.Group for 'town', 'park', 'school', 'snow' or 'studio'.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const U = 0.32; // one block unit in metres: an avatar is 5 units (1.6 m) tall
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const tex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const box = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });

// ---------- faces ----------
export const FACES = ['smile', 'grin', 'talk', 'surprised', 'worried', 'angry', 'sad', 'smug', 'blink', 'scared'];
function drawFace(g, w, h, kind, skin) {
  g.fillStyle = skin; g.fillRect(0, 0, w, h);
  const ink = '#1d1a1c';
  const eye = (x, y, rx, ry) => { g.fillStyle = ink; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + rx * 0.35, y - ry * 0.4, rx * 0.32, 0, Math.PI * 2); g.fill(); };
  const brow = (x, y, a) => { g.strokeStyle = ink; g.lineWidth = w * 0.035; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - w * 0.07, y + a); g.lineTo(x + w * 0.07, y - a); g.stroke(); };
  const ex = w * 0.33, ey = h * 0.42, rx = w * 0.055, ry = h * 0.085;
  const k = kind;
  if (k === 'blink') { g.strokeStyle = ink; g.lineWidth = w * 0.03; for (const x of [ex, w - ex]) { g.beginPath(); g.moveTo(x - rx, ey); g.quadraticCurveTo(x, ey + ry * 0.6, x + rx, ey); g.stroke(); } }
  else if (k === 'surprised' || k === 'scared') { eye(ex, ey, rx * 1.2, ry * 1.25); eye(w - ex, ey, rx * 1.2, ry * 1.25); }
  else { eye(ex, ey, rx, ry); eye(w - ex, ey, rx, ry); }
  if (k === 'angry') { brow(ex, ey - ry * 1.5, -h * 0.03); brow(w - ex, ey - ry * 1.5, h * 0.03); }
  if (k === 'worried' || k === 'sad' || k === 'scared') { brow(ex, ey - ry * 1.6, h * 0.03); brow(w - ex, ey - ry * 1.6, -h * 0.03); }
  if (k === 'surprised') { brow(ex, ey - ry * 2.0, 0); brow(w - ex, ey - ry * 2.0, 0); }
  if (k === 'smug') { brow(ex, ey - ry * 1.5, h * 0.015); brow(w - ex, ey - ry * 1.8, -h * 0.02); }
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = w * 0.03; g.lineCap = 'round';
  const my = h * 0.68;
  g.beginPath();
  if (k === 'smile' || k === 'blink') { g.arc(w / 2, my - h * 0.07, w * 0.16, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  else if (k === 'grin') { g.moveTo(w * 0.32, my - h * 0.02); g.quadraticCurveTo(w / 2, my + h * 0.16, w * 0.68, my - h * 0.02); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(w * 0.38, my - h * 0.015, w * 0.24, h * 0.035); }
  else if (k === 'talk') { g.ellipse(w / 2, my, w * 0.09, h * 0.07, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c4545a'; g.beginPath(); g.ellipse(w / 2, my + h * 0.03, w * 0.05, h * 0.025, 0, 0, Math.PI * 2); g.fill(); }
  else if (k === 'surprised' || k === 'scared') { g.ellipse(w / 2, my + h * 0.02, w * 0.06, h * 0.085, 0, 0, Math.PI * 2); g.fill(); }
  else if (k === 'sad' || k === 'worried') { g.arc(w / 2, my + h * 0.08, w * 0.12, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
  else if (k === 'angry') { g.moveTo(w * 0.38, my + h * 0.02); g.lineTo(w * 0.62, my + h * 0.02); g.stroke(); }
  else if (k === 'smug') { g.moveTo(w * 0.4, my); g.quadraticCurveTo(w * 0.55, my + h * 0.05, w * 0.66, my - h * 0.05); g.stroke(); }
}

// ---------- clothes ----------
function shirtTex(c) {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = c.shirt; g.fillRect(0, 0, w, h);
    if (c.pattern === 'stripes') { g.fillStyle = c.accent; for (let y = h * 0.18; y < h; y += h * 0.2) g.fillRect(0, y, w, h * 0.08); }
    if (c.pattern === 'logo') { g.fillStyle = c.accent; g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.16, 0, Math.PI * 2); g.fill(); }
    if (c.pattern === 'hoodie') { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(w * 0.18, h * 0.62, w * 0.64, h * 0.2); g.strokeStyle = c.accent; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.42, 0); g.lineTo(w * 0.42, h * 0.3); g.moveTo(w * 0.58, 0); g.lineTo(w * 0.58, h * 0.3); g.stroke(); }
    if (c.pattern === 'jacket') { g.fillStyle = c.accent; g.fillRect(w * 0.44, 0, w * 0.12, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(w * 0.08, h * 0.55, w * 0.22, h * 0.12); g.fillRect(w * 0.7, h * 0.55, w * 0.22, h * 0.12); }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h * 0.92, w, h * 0.08); // belt line shadow
  });
}

// ---------- avatar ----------
export const LOOKS = [
  { skin: '#f1c9a0', shirt: '#e5483b', accent: '#ffffff', pattern: 'logo', pants: '#2d3e6b', shoes: '#222', hair: '#3b2416', hairStyle: 'short' },
  { skin: '#8d5a3c', shirt: '#3aa357', accent: '#1c6b34', pattern: 'hoodie', pants: '#33302e', shoes: '#f2f2f2', hair: '#1b1414', hairStyle: 'puff' },
  { skin: '#f6d7b8', shirt: '#f2c33c', accent: '#d9822b', pattern: 'stripes', pants: '#5a3d8a', shoes: '#ffffff', hair: '#e8b04a', hairStyle: 'long' },
  { skin: '#c98d62', shirt: '#2f6fd6', accent: '#f2f2f2', pattern: 'jacket', pants: '#1f1f24', shoes: '#3a2a22', hair: '#111', hairStyle: 'cap', hat: '#d33a2c' },
  { skin: '#ffe0bd', shirt: '#9b59d0', accent: '#ffffff', pattern: 'plain', pants: '#26867a', shoes: '#222', hair: '#7a3b1c', hairStyle: 'spiky' },
  { skin: '#a8714d', shirt: '#ffffff', accent: '#e74c3c', pattern: 'stripes', pants: '#3b4a5c', shoes: '#e74c3c', hair: '#2a1a12', hairStyle: 'bun' },
];

export class Avatar {
  constructor(look = LOOKS[0]) {
    this.look = look;
    const L = look, g = this.object = new THREE.Group();
    const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
    const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); return p; };
    const skin = mat(L.skin), pants = mat(L.pants), shoes = mat(L.shoes, { roughness: 0.4 });
    const shirtMat = new THREE.MeshStandardMaterial({ map: shirtTex(L), roughness: 0.6 });
    const sleeve = mat(L.shirt, { roughness: 0.6 });
    // Body: torso 2x2x1 units, legs and arms 1x2x1, head 1.25 wide; feet on y = 0.
    this.hips = pivot(0, 2 * U, 0); g.add(this.hips);
    this.torso = pivot(0, 0, 0); this.hips.add(this.torso);
    this.torso.add(part(box(2 * U, 2 * U, 1 * U, 0.05), shirtMat, 0, U, 0));
    // Legs (pivot at the hip), trousers with shoes.
    this.legL = pivot(0.5 * U, 0, 0); this.legR = pivot(-0.5 * U, 0, 0);
    for (const leg of [this.legL, this.legR]) {
      this.hips.add(leg);
      leg.add(part(box(0.96 * U, 1.7 * U, 0.96 * U, 0.05), pants, 0, -0.85 * U, 0));
      leg.add(part(box(1.0 * U, 0.34 * U, 1.08 * U, 0.05), shoes, 0, -1.83 * U, 0.04 * U));
    }
    // Arms (pivot at the shoulder): sleeve then skin hand.
    this.armL = pivot(1.5 * U, 1.85 * U, 0); this.armR = pivot(-1.5 * U, 1.85 * U, 0);
    for (const arm of [this.armL, this.armR]) {
      this.torso.add(arm);
      arm.add(part(box(0.94 * U, 1.25 * U, 0.94 * U, 0.05), sleeve, 0, -0.55 * U, 0));
      arm.add(part(box(0.9 * U, 0.75 * U, 0.9 * U, 0.08), skin, 0, -1.55 * U, 0));
    }
    // Head on a neck pivot; the face is a texture on the front, swapped for expressions.
    this.neck = pivot(0, 2 * U, 0); this.torso.add(this.neck);
    this.faces = {};
    this.faceMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const headSide = mat(L.skin, { roughness: 0.5 });
    const headGeo = box(1.25 * U, 1.2 * U, 1.15 * U, 0.12);
    const head = part(headGeo, headSide, 0, 0.62 * U, 0); this.neck.add(head); this.head = head;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08 * U, 1.05 * U), this.faceMat);
    face.position.set(0, 0.62 * U, 0.578 * U); this.neck.add(face);
    this.setFace('smile');
    this.addHair(L);
    this.object.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.pose('stand', 0);
  }

  addHair(L) {
    const hm = mat(L.hair, { roughness: 0.7 });
    const n = this.neck, y = 0.62 * U;
    const add = (w, h, d, x, yy, z, m = hm, r = 0.05) => { const o = new THREE.Mesh(box(w, h, d, r), m); o.position.set(x, y + yy, z); o.castShadow = true; n.add(o); return o; };
    const s = L.hairStyle;
    if (s === 'cap') {
      const cm = mat(L.hat, { roughness: 0.6 });
      add(1.32 * U, 0.42 * U, 1.22 * U, 0, 0.5 * U, 0, cm);
      add(1.1 * U, 0.08 * U, 0.55 * U, 0, 0.32 * U, 0.75 * U, cm, 0.03);
    } else {
      add(1.32 * U, 0.34 * U, 1.22 * U, 0, 0.55 * U, -0.02 * U);            // top
      add(1.32 * U, 0.9 * U, 0.3 * U, 0, 0.12 * U, -0.48 * U);              // back
      if (s === 'short' || s === 'spiky' || s === 'bun') add(1.3 * U, 0.2 * U, 0.2 * U, 0.05 * U, 0.4 * U, 0.55 * U); // fringe
      if (s === 'spiky') for (let i = -2; i <= 2; i++) { const o = add(0.22 * U, 0.38 * U, 0.22 * U, i * 0.24 * U, 0.82 * U, 0); o.rotation.z = i * 0.18; }
      if (s === 'puff') add(1.5 * U, 0.6 * U, 1.35 * U, 0, 0.72 * U, -0.05 * U, hm, 0.2);
      if (s === 'long') { add(0.28 * U, 1.3 * U, 1.0 * U, 0.68 * U, -0.15 * U, -0.1 * U); add(0.28 * U, 1.3 * U, 1.0 * U, -0.68 * U, -0.15 * U, -0.1 * U); }
      if (s === 'bun') add(0.6 * U, 0.5 * U, 0.6 * U, 0, 0.9 * U, -0.25 * U, hm, 0.2);
    }
  }

  setFace(kind) {
    if (this.faceKind === kind) return;
    this.faceKind = kind;
    this.faces[kind] ||= tex(256, 256, (g, w, h) => drawFace(g, w, h, kind, this.look.skin));
    this.faceMat.map = this.faces[kind]; this.faceMat.needsUpdate = true;
  }

  // Poses as joint angles (radians): arms swing forward (+x) and out (z); t animates the cycles.
  pose(name, t = 0, { face = null, talking = false } = {}) {
    const s = Math.sin, set = (o, x = 0, y = 0, z = 0) => o.rotation.set(x, y, z);
    for (const o of [this.armL, this.armR, this.legL, this.legR, this.neck, this.torso]) set(o);
    this.hips.position.y = 2 * U; this.hips.rotation.set(0, 0, 0);
    const breath = s(t * 2) * 0.015;
    let f = 'smile';
    switch (name) {
      case 'walk': case 'run': {
        const r = name === 'run', ph = t * (r ? 9 : 6), a = r ? 0.95 : 0.6;
        set(this.legL, s(ph) * a); set(this.legR, -s(ph) * a);
        set(this.armL, -s(ph) * a * 0.9, 0, 0.05); set(this.armR, s(ph) * a * 0.9, 0, -0.05);
        this.hips.position.y = 2 * U + Math.abs(Math.cos(ph)) * (r ? 0.06 : 0.025);
        set(this.torso, r ? 0.18 : 0.04);
        f = r ? 'grin' : 'smile'; break;
      }
      case 'talk': set(this.armR, -0.55 + s(t * 3) * 0.15, 0, -0.25); set(this.armL, -0.15 + s(t * 2.3) * 0.08, 0, 0.1); set(this.neck, s(t * 3.3) * 0.05, s(t * 1.4) * 0.12); f = 'talk'; break;
      case 'point': set(this.armR, -1.5, 0, -0.1); set(this.neck, 0, -0.25); f = 'grin'; break;
      case 'wave': set(this.armR, Math.PI, 0, -0.35 + s(t * 9) * 0.35); f = 'grin'; break;
      case 'surprised': set(this.armL, -0.4, 0, 1.6); set(this.armR, -0.4, 0, -1.6); set(this.neck, -0.12); set(this.torso, -0.06); f = 'surprised'; break;
      case 'scared': set(this.armL, -1.3, 0, 0.6); set(this.armR, -1.3, 0, -0.6); set(this.torso, 0.15); f = 'scared'; break;
      case 'cheer': set(this.armL, Math.PI, 0, 0.35); set(this.armR, Math.PI, 0, -0.35); this.hips.position.y = 2 * U + Math.max(0, s(t * 7)) * 0.18; f = 'grin'; break;
      case 'sad': set(this.armL, 0.05, 0, 0.05); set(this.armR, 0.05, 0, -0.05); set(this.neck, 0.35); set(this.torso, 0.12); f = 'sad'; break;
      case 'angry': set(this.armL, -0.1, 0, 0.35); set(this.armR, -0.1, 0, -0.35); set(this.neck, 0.08); f = 'angry'; break;
      case 'think': set(this.armR, -2.3, 0, 0.55); set(this.armL, -0.6, 0, -0.4); set(this.neck, 0.05, 0.15, 0.12); f = 'worried'; break;
      case 'shrug': set(this.armL, -0.35, 0, 0.75); set(this.armR, -0.35, 0, -0.75); set(this.neck, 0, 0, 0.15); f = 'smug'; break;
      case 'sit': set(this.legL, -1.5); set(this.legR, -1.5); this.hips.position.y = 1.15 * U; set(this.armL, -0.5); set(this.armR, -0.5); break;
      default: set(this.armL, 0, 0, 0.06); set(this.armR, 0, 0, -0.06); f = 'smile';
    }
    this.torso.rotation.x += breath;
    if (talking && f !== 'surprised' && f !== 'scared') f = Math.sin(t * 2 * Math.PI * 4.2) > 0.1 ? 'talk' : f;
    // Blink every ~3 s for 0.12 s.
    if (((t + 0.7) % 3.1) < 0.12 && f !== 'surprised' && f !== 'scared') f = 'blink';
    this.setFace(face || f);
  }
}

// ---------- world ----------
export function makeWorld(kind = 'town', seed = 7) {
  const r = rng(seed), g = new THREE.Group();
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  const snow = kind === 'snow';
  // Ground: big tiles in two tones (no studs), a path.
  const tileA = mat(snow ? '#f4f7fb' : '#5fbf4a', { roughness: 0.9 }), tileB = mat(snow ? '#e8eef6' : '#57b244', { roughness: 0.9 });
  const T = 4;
  for (let i = -8; i < 8; i++) for (let j = -10; j < 6; j++) add(new THREE.BoxGeometry(T, 0.4, T), (i + j) % 2 ? tileA : tileB, i * T + T / 2, -0.2, j * T + T / 2);
  const pathM = mat(kind === 'school' ? '#9a9ea6' : '#c9b48c', { roughness: 0.95 });
  add(new THREE.BoxGeometry(3.2, 0.42, 64), pathM, 0, -0.19, -8);
  if (kind === 'studio') return g;
  // Trees: trunk + stacked leaf blocks.
  const trunk = mat('#7a4f2c'), leafA = mat(snow ? '#e9f1f7' : '#2f9e41'), leafB = mat(snow ? '#dbe7f1' : '#3db450');
  const tree = (x, z, h = 2.4) => {
    add(box(0.5, h, 0.5, 0.04), trunk, x, h / 2, z);
    add(box(2.2, 1.4, 2.2, 0.15), leafA, x, h + 0.5, z);
    add(box(1.5, 1.0, 1.5, 0.15), leafB, x, h + 1.5, z);
  };
  // Houses: block walls, door, windows, wedge roof.
  const wallCols = ['#f0e2c8', '#cfe0f0', '#f3c9b9', '#e0d4f0', '#fff1b8'], roofCols = ['#c0392b', '#2e5a88', '#7b4a2a', '#3d7a4b'];
  const house = (x, z, w = 5, d = 4, h = 3.2, rot = 0) => {
    const hg = new THREE.Group(); hg.position.set(x, 0, z); hg.rotation.y = rot; g.add(hg);
    const put = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; hg.add(o); return o; };
    put(box(w, h, d, 0.08), mat(wallCols[Math.floor(r() * wallCols.length)]), 0, h / 2, 0);
    const roofM = mat(roofCols[Math.floor(r() * roofCols.length)]);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.78, w + 0.4, 3, 1), roofM);
    roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.8);
    roof.position.set(0, h + 0.75, 0); roof.castShadow = true; hg.add(roof);
    put(box(1.0, 1.9, 0.12, 0.03), mat('#6b4226'), -w * 0.18, 0.95, d / 2 + 0.03);
    const glass = mat('#9fd3f5', { roughness: 0.15, metalness: 0.1, emissive: '#0b2a40' });
    put(box(0.95, 0.85, 0.1, 0.03), glass, w * 0.22, h * 0.6, d / 2 + 0.03);
    put(box(0.95, 0.85, 0.1, 0.03), glass, -w * 0.38 + 1.6, h * 0.82, d / 2 + 0.03).visible = w > 4.5;
  };
  if (kind === 'town' || kind === 'snow') {
    house(-6.5, -6, 5, 4, 3.2, 0.12); house(6.8, -7.5, 5.5, 4.2, 3.6, -0.1); house(-8, -15, 6, 4.5, 4, 0.05); house(8.5, -17, 5, 4, 3.2, -0.2);
    tree(-3.2, -2.5); tree(3.6, -3.4, 2.8); tree(-11, -9); tree(11.5, -11, 2.6); tree(-4, -20); tree(5, -24, 3);
    // Fence along the path.
    const fm = mat('#f5f0e6');
    for (let z = -1; z > -12; z -= 1.2) { add(box(0.18, 0.9, 0.18, 0.03), fm, 2.2, 0.45, z); add(box(0.18, 0.9, 0.18, 0.03), fm, -2.2, 0.45, z); }
    add(box(0.12, 0.16, 11, 0.02), fm, 2.2, 0.65, -6.5); add(box(0.12, 0.16, 11, 0.02), fm, -2.2, 0.65, -6.5);
  }
  if (kind === 'park') { for (let k = 0; k < 9; k++) tree((r() - 0.5) * 26, -4 - r() * 22, 2 + r()); add(box(3, 0.25, 0.8, 0.05), mat('#8a5a33'), 3.5, 0.75, -3); }
  if (kind === 'school') {
    const sm = mat('#d9534f'), wm = mat('#f2e6d0');
    add(box(18, 6, 6, 0.1), sm, 0, 3, -16); add(box(4, 3, 0.2, 0.05), wm, 0, 1.5, -12.9);
    for (const x of [-6, -3, 3, 6]) add(box(1.6, 1.4, 0.12, 0.04), mat('#9fd3f5', { roughness: 0.15 }), x, 3.5, -12.9);
    tree(-9, -6); tree(9, -7);
  }
  // Clouds: flat white blocks high up.
  const cm = mat('#ffffff', { roughness: 1, emissive: '#3a4a5a' });
  for (let k = 0; k < 7; k++) { const x = (r() - 0.5) * 70, z = -30 - r() * 40, y = 16 + r() * 10; add(box(6 + r() * 6, 1.2, 3 + r() * 2, 0.4), cm, x, y, z).castShadow = false; }
  return g;
}

export { U as BLOCK };
