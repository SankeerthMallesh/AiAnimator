// Loomy's own films, drawn in code: the shot library the writer picks from (place, shot type,
// who, pose, camera move, effect), turned into engine shots for renderFilm / composeFrame.
// The same craft as the hand-made "frozen lake" short: realistic people posed in code, a short
// zach-style edit (cuts every 2.5-4.5 s), depth of field on close shots, 1-3 word captions.
import * as THREE from 'three';
import { lerp, smooth, easeOut, easeInOut, range, clamp, V, cam, place, shake } from './anim.js';
import { glowSprite, sparks } from './props.js';
import { CAST, loadPerson, POSES, mix, talking, walking } from './people.js';
import { makeThing, thingAction } from './things.js';

import { SETS, SHOT_KINDS, POSE_NAMES, CAMERA_MOVES, EFFECTS3D, effect3d } from './vocab.js';
export { SETS, SHOT_KINDS, POSE_NAMES, CAMERA_MOVES, EFFECTS3D };

// ---------- small helpers ----------
export const rnd = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t;
}
const TEX = new Map();
function speckle(base, dots, seed, repeat = 8, extra = null) {
  const key = `${base}|${dots}|${seed}|${repeat}`;
  if (!TEX.has(key)) {
    const r = rnd(seed);
    TEX.set(key, canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) { const c = dots[i % dots.length]; g.fillStyle = c; g.globalAlpha = 0.08 + r() * 0.22; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 6, 1 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1; extra?.(g, w, h, r);
    }, repeat));
  }
  return TEX.get(key);
}
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
const shadowAll = (g) => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
function ground(scene, map, { size = 200, roughness = 0.9, metalness = 0, color = 0xffffff } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), std({ map, roughness, metalness, color }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.002; m.receiveShadow = true; scene.add(m); return m;
}
function pine(h, snowy) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.25, 8), std({ color: 0x4a3423 })); trunk.position.y = h * 0.12; g.add(trunk);
  const green = std({ color: 0x1f4a33 }), white = std({ color: 0xf4f8fc, roughness: 0.7 });
  for (let k = 0; k < 4; k++) {
    const rr = h * (0.32 - k * 0.065), hh = h * 0.34, y = h * (0.22 + k * 0.19);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 10), green); c.position.y = y + hh / 2; g.add(c);
    if (snowy) { const s = new THREE.Mesh(new THREE.ConeGeometry(rr * 0.8, hh * 0.35, 10), white); s.position.y = y + hh * 0.82; g.add(s); }
  }
  return shadowAll(g);
}
function roundTree(h, r) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h * 0.45, 8), std({ color: 0x5a3d26 })); trunk.position.y = h * 0.22; g.add(trunk);
  const leaf = std({ color: [0x3f8f3a, 0x4d9c40, 0x37803a][Math.floor(r() * 3)] });
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(h * (0.22 + r() * 0.1), 1), leaf); s.position.set((r() - 0.5) * h * 0.3, h * (0.55 + r() * 0.25), (r() - 0.5) * h * 0.3); g.add(s); }
  return shadowAll(g);
}
function building(w, h, d, color, r, lit = false) {
  const g = new THREE.Group();
  // At night only the lit windows glow: a second texture holds just them, black everywhere else.
  const on = [];
  const win = canvasTex(256, 512, (c, W, H) => {
    c.fillStyle = color; c.fillRect(0, 0, W, H);
    for (let y = 24; y < H - 30; y += 52) for (let x = 20; x < W - 30; x += 56) { const o = lit && r() < 0.45; if (o) on.push([x, y]); c.fillStyle = o ? '#ffd88a' : (r() < 0.5 ? '#8fb2cf' : '#6f93b2'); c.fillRect(x, y, 34, 34); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + 32, 34, 4); }
  }, 1);
  const glowMap = lit ? canvasTex(256, 512, (c, W, H) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffd88a'; for (const [x, y] of on) c.fillRect(x, y, 34, 34); }, 1) : null;
  for (const t of [win, glowMap]) t?.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 8)));
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std({ map: win, roughness: 0.7, emissive: lit ? 0xffffff : 0x000000, emissiveMap: glowMap, emissiveIntensity: lit ? 1.4 : 0, color: lit ? 0x8a8f9c : 0xffffff }));
  m.position.y = h / 2; g.add(m);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), std({ color: 0x55585e })); roof.position.y = h + 0.15; g.add(roof);
  return shadowAll(g);
}
function lamp(lit = false) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 8), std({ color: 0x2c2f35, metalness: 0.5, roughness: 0.4 })); pole.position.y = 2; g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), std({ color: 0x2c2f35, emissive: lit ? 0xffe3a6 : 0, emissiveIntensity: lit ? 2 : 0 })); head.position.set(0.2, 4, 0); g.add(head);
  if (lit) { const l = new THREE.PointLight(0xffd59a, 14, 12, 2); l.position.set(0.2, 3.8, 0); g.add(l); const gl = glowSprite(0xffd59a, 1.6); gl.position.set(0.2, 3.9, 0); g.add(gl); }
  return shadowAll(g);
}
function rock(s, r, color = 0x8a8f96) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std({ color })); m.scale.set(1 + r() * 0.6, 0.55 + r() * 0.3, 1 + r() * 0.5); m.rotation.y = r() * 3; m.position.y = s * 0.25; return shadowAll(m); }

// ---------- places ----------
const SKY = {
  studio: null,
  snow: { top: 0x5d8fd0, mid: 0x9cc0e8, horizon: 0xe6eef6, floorC: 0xdfe8f2 },
  park: { top: 0x3a7bd5, mid: 0x7fb2ea, horizon: 0xcfe5f7, floorC: 0x9fc98a },
  street: { top: 0x4a86d4, mid: 0x8dbbe9, horizon: 0xdbe8f3, floorC: 0xb9c1cb },
  room: { top: 0xd9d4cc, mid: 0xe2ddd5, horizon: 0xe8e3db, floorC: 0xb69a7c },
  beach: { top: 0x2f86d9, mid: 0x6fb6ee, horizon: 0xd9eef9, floorC: 0xe8d6a8 },
  night: { top: 0x0b1330, mid: 0x1b2a57, horizon: 0x3e4f86, floorC: 0x22293c },
  desert: { top: 0x3c86cf, mid: 0x8cbde4, horizon: 0xf2dcb0, floorC: 0xe2bd85 },
  lab: { top: 0xdfe6ec, mid: 0xe6ecf1, horizon: 0xeef2f5, floorC: 0xc9d1d8 },
};
export function stageFor(set) {
  const base = { shadowSize: 7, sun: 2.6, sunDir: [-6, 6, 7], sunColor: 0xfff1e0, hemi: 0.85, rimLight: 1.6, rimDir: [6, 4, -6], shadowMap: 2048, fog: [22, 130], sky: SKY[set] ?? null };
  if (set === 'night') return { ...base, sun: 0.3, sunColor: 0x9fb4ff, hemi: 0.18, rimLight: 1.0, rimDir: [5, 5, -6], fog: [14, 80] };
  if (set === 'room' || set === 'lab') return { ...base, sun: 2.0, sunDir: [-4, 5, 6], hemi: 1.0, rimLight: 1.0, fog: null };
  if (set === 'desert') return { ...base, sun: 3.1, sunColor: 0xffe2b8, fog: [30, 160] };
  if (set === 'beach') return { ...base, sun: 2.9, fog: [30, 170] };
  return base;
}
// Builds the place around the origin: people stand near (0, 0, 0), the camera looks along -z.
export function buildSet(scene, set, seed = 1) {
  const r = rnd(seed * 7919 + 13);
  if (set === 'night') scene.environmentIntensity = 0.1;
  if (set === 'studio') {
    ground(scene, speckle('#c9d6e3', ['#b9c8d8', '#dbe5ef'], 3, 10), { roughness: 0.55 });
    return;
  }
  if (set === 'snow') {
    ground(scene, speckle('#f2f6fb', ['#dfe8f2', '#ffffff', '#cfdcea'], 5, 10), { roughness: 0.75 });
    const snowM = std({ color: 0xf6f9fc, roughness: 0.8 });
    for (let k = 0; k < 22; k++) { const a = r() * Math.PI * 2, d = 16 + r() * 28; const s = new THREE.Mesh(new THREE.SphereGeometry(2 + r() * 3, 18, 10), snowM); s.scale.y = 0.35; s.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.receiveShadow = true; scene.add(s); }
    for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, d = 14 + r() * 40; const p = pine(5 + r() * 7, true); p.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); scene.add(p); }
    return;
  }
  if (set === 'park') {
    ground(scene, speckle('#5aa84a', ['#4c9a3f', '#6cbc57', '#3f8a37'], 7, 14));
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 200), std({ map: speckle('#cdb78d', ['#b9a37a', '#ddc9a2'], 8, 8) })); path.rotation.x = -Math.PI / 2; path.rotation.z = 0.35; path.position.set(1.5, 0.003, 0); path.receiveShadow = true; scene.add(path);
    for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 9 + r() * 35; const t = roundTree(4 + r() * 4, r); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); scene.add(t); }
    const bench = new THREE.Group(); const wood = std({ color: 0x8a5a33 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), wood); seat.position.y = 0.45; bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), wood); back.position.set(0, 0.75, -0.2); bench.add(back);
    for (const x of [-0.8, 0.8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), std({ color: 0x2c2f35 })); l.position.set(x, 0.22, 0); bench.add(l); }
    bench.position.set(-3.2, 0, -3.5); bench.rotation.y = 0.4; scene.add(shadowAll(bench));
    return;
  }
  if (set === 'street' || set === 'night') {
    const lit = set === 'night';
    ground(scene, speckle('#9aa1a9', ['#8a9199', '#b0b6bd'], 9, 12), { roughness: 0.8 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 7), std({ map: speckle('#3d4148', ['#34383e', '#4a4f57'], 10, 10), roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.004, -5.5); road.receiveShadow = true; scene.add(road);
    for (let x = -60; x < 60; x += 4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.15), std({ color: 0xf2f2f2 })); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.006, -5.5); scene.add(d); }
    const cols = ['#c98f6b', '#d9c7a3', '#9fb3c8', '#c7a2a2', '#b8c4a0', '#e0d3bf'];
    for (let x = -50; x < 50;) { const w = 6 + r() * 6, h = 8 + r() * 18; const b = building(w, h, 8, cols[Math.floor(r() * cols.length)], r, lit); b.position.set(x + w / 2, 0, -14 - r() * 3); scene.add(b); x += w + 0.6; }
    // Lamps sit off-centre so no pole stands behind the people at x = 0; at night one lights them.
    for (let x = -22; x <= 26; x += 8) { const l = lamp(lit); l.position.set(x, 0, -1.8); scene.add(l); }
    if (lit) {
      const f = new THREE.PointLight(0xffd59a, 9, 11, 2); f.position.set(1.6, 3.2, 1.2); scene.add(f);
      // Moonlight on the people: a soft, cool spot from above and in front, so a wide or walking shot at
      // night still shows them (only the street around them stays dark).
      const moon = new THREE.SpotLight(0xbfd0ff, 30, 22, 0.75, 0.9, 1.4); moon.position.set(-1.5, 6, 6); moon.target.position.set(0, 1, -1.5);
      scene.add(moon, moon.target);
    }
    return;
  }
  if (set === 'room' || set === 'lab') {
    const lab = set === 'lab';
    ground(scene, lab ? speckle('#d7dde3', ['#cfd6dd', '#e3e8ec'], 11, 14) : canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = y % 64 ? '#b08a63' : '#a47f59'; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y + 30, w, 2); } }, 10), { size: 30, roughness: 0.6 });
    const wallM = std({ color: lab ? 0xeef2f5 : 0xe9e1d3, roughness: 0.95 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), wallM); back.position.set(0, 4, -4.5); back.receiveShadow = true; scene.add(back);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), wallM); side.rotation.y = Math.PI / 2; side.position.set(-6, 4, 0); side.receiveShadow = true; scene.add(side);
    const winM = new THREE.MeshBasicMaterial({ color: 0xdff0ff, toneMapped: false });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), winM); w1.position.set(2.2, 2.1, -4.48); scene.add(w1);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.08), std({ color: 0xffffff })); frame.position.set(2.2, 2.1, -4.52); scene.add(frame);
    if (lab) {
      for (const x of [-3, 3.5]) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.9), std({ color: 0xf4f6f8, roughness: 0.4 })); t.position.set(x, 0.45, -3.6); scene.add(shadowAll(t)); const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), new THREE.MeshBasicMaterial({ color: 0x59c3ff, toneMapped: false })); s.position.set(x, 1.3, -3.7); scene.add(s); }
    } else {
      const couch = new THREE.Group(), cm = std({ color: 0x5b7aa6 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.9), cm); base.position.y = 0.3; couch.add(base);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.25), cm); bk.position.set(0, 0.75, -0.35); couch.add(bk);
      couch.position.set(-2.6, 0, -3.6); scene.add(shadowAll(couch));
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24), std({ color: 0x7a5236 })); table.position.set(1.6, 0.75, -2.6); scene.add(shadowAll(table));
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), std({ color: 0x3a3a3a })); leg.position.set(1.6, 0.37, -2.6); scene.add(shadowAll(leg));
    }
    return;
  }
  if (set === 'beach') {
    ground(scene, speckle('#e8d6a8', ['#dcc894', '#f2e4bf'], 13, 12));
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), std({ color: 0x1f7fb8, roughness: 0.15, metalness: 0.3 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, -110); scene.add(sea);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.8), std({ color: 0xf5fbff })); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.025, -10); scene.add(foam);
    for (let k = 0; k < 8; k++) { const p = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 5, 8), std({ color: 0x8a6a45 })); tr.position.y = 2.5; tr.rotation.z = 0.12; p.add(tr); for (let j = 0; j < 6; j++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 6), std({ color: 0x2f8a3a })); lf.position.set(0.3, 5, 0); lf.rotation.set(0, (j / 6) * Math.PI * 2, 1.9); p.add(lf); } p.position.set(-20 + r() * 40, 0, 4 + r() * 20); scene.add(shadowAll(p)); }
    return;
  }
  if (set === 'desert') {
    ground(scene, speckle('#e2bd85', ['#d4ab70', '#ecca97'], 15, 12));
    for (let k = 0; k < 20; k++) { const a = r() * Math.PI * 2, d = 18 + r() * 40; const s = new THREE.Mesh(new THREE.SphereGeometry(6 + r() * 8, 24, 12), std({ color: 0xdcb37a })); s.scale.y = 0.22; s.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.receiveShadow = true; scene.add(s); }
    for (let k = 0; k < 14; k++) { const rk = rock(0.4 + r() * 1.2, r, 0xa07850); const a = r() * Math.PI * 2, d = 5 + r() * 25; rk.position.x = Math.cos(a) * d; rk.position.z = Math.sin(a) * d; scene.add(rk); }
  }
}

// The cast and the shot plan live in plan.js (no three.js, so the sound and the tests can use them).
export { castFor, whoFor, planShots } from './plan.js';
export async function loadCast(ids) {
  const people = {};
  await Promise.all([...new Set(ids)].map(async (id) => { if (CAST[id]) people[id] = await loadPerson(id); }));
  return people;
}

// ---------- camera ----------
export function frameCam(c, target, { dist, height = 0, yaw = 0, side = 0 }, move, k, t, seed, fov0) {
  let d = dist, y = yaw, tx = target.x, ty = target.y, tz = target.z, f = fov0, lat = side;
  // Sideways and up-down moves are sized for a medium shot (3 m away) and shrink with the shot: on a
  // close-up a fixed 45 cm tilt swung the frame off the subject onto whatever stood below it.
  const m = Math.max(0.25, Math.min(1, dist / 3));
  switch (move) {
    case 'push-in': d *= lerp(1.14, 0.9, k); break;
    case 'pull-out': d *= lerp(0.88, 1.16, k); break;
    case 'orbit': y += lerp(-0.32, 0.32, k); break;
    case 'pan-left': lat += lerp(0.5, -0.5, k) * m; break;
    case 'pan-right': lat += lerp(-0.5, 0.5, k) * m; break;
    case 'tilt-up': ty += lerp(-0.45, 0.15, k) * m; break;
    case 'tilt-down': ty += lerp(0.35, -0.2, k) * m; break;
    case 'impact': d *= k < 0.3 ? 1.08 : lerp(1.08, 0.78, easeOut((k - 0.3) / 0.08)); break;
    case 'vertigo': d *= lerp(1.35, 0.85, k); f = fov0 * lerp(0.78, 1.18, k); break;
    default: d *= lerp(1.03, 0.97, k);
  }
  const s = shake(t, 0.8, seed);
  const px = tx + Math.sin(y) * d + Math.cos(y) * lat, pz = tz + Math.cos(y) * d - Math.sin(y) * lat;
  place(c, [px + s[0], ty + height + s[1], pz + s[2]], [tx + Math.cos(y) * lat * 0.6, ty, tz - Math.sin(y) * lat * 0.6]);
  if (c.fov !== f) { c.fov = f; c.updateProjectionMatrix(); }
  return Math.hypot(px - tx, ty + height - ty, pz - tz);
}

// Sideways moves would push one of several people out of a narrow frame: they become a slow push.
export const narrowMove = (m) => (m === 'pan-left' || m === 'pan-right' ? 'push-in' : m);

// ---------- effects ----------
export function emojiSprite(ch, size = 0.6) {
  const tex = canvasTex(256, 256, (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(ch, w / 2, h / 2 + 10); });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1, 1);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.setScalar(size); return s;
}
export function makeEffect(kind, scene, seed) {
  if (kind === 'pulse' || kind === 'shockwave') {
    // Rings in the air beside the subject (pulse: a beat every 0.6 s) or flat on the ground spreading from
    // their feet (shockwave). Never drawn on a person: a disc on the chest read as a wound.
    const mat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), mat()); m.renderOrder = 5; scene.add(m); return m; });
    const right = new THREE.Vector3();
    return (t, P, camPos) => {
      if (kind === 'pulse') {
        right.set(-(P.z - camPos.z), 0, P.x - camPos.x).normalize();
        rings.forEach((m, i) => {
          const beat = ((t + i * 0.3) / 0.6) % 1;
          m.position.copy(P).addScaledVector(right, 0.24).add(new THREE.Vector3(0, 0.5, 0.05));
          m.lookAt(camPos); m.scale.setScalar(0.03 + easeOut(beat) * 0.11);
          m.material.opacity = 0.9 * (1 - beat) * Math.min(1, t * 3);
        });
      } else {
        rings.forEach((m, i) => {
          const k = easeOut(range(t, 0.1 + i * 0.18, 1.3 + i * 0.18));
          m.position.set(P.x, 0.02, P.z); m.rotation.set(-Math.PI / 2, 0, 0);
          m.scale.setScalar(0.2 + k * 2.6); m.material.opacity = 0.8 * (1 - k) * (k > 0 ? 1 : 0);
        });
      }
    };
  }
  if (kind === 'sparks') {
    const sp = sparks(90, { seed, speed: 2.2, life: 0.8, size: 0.03 }); scene.add(sp);
    return (t, P) => { sp.position.copy(P); sp.update((t - 0.3) % 1.6); };
  }
  if (kind === 'glow') {
    const g = glowSprite(0xfff1b0, 0.7); scene.add(g);
    return (t, P) => { g.position.copy(P).add(new THREE.Vector3(0.45, 0.5, -0.45)); g.scale.setScalar(0.6 + Math.sin(t * 4) * 0.08); };
  }
  if (['snow', 'rain', 'dust', 'bubbles'].includes(kind)) {
    const n = kind === 'rain' ? 900 : 500, r = rnd(seed), pos = new Float32Array(n * 3), base = [];
    for (let i = 0; i < n; i++) base.push([(r() - 0.5) * 10, r() * 6, (r() - 0.5) * 10, r()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = { snow: 0xffffff, rain: 0xaFc8e8, dust: 0xf2e2c0, bubbles: 0xcff0ff }[kind];
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: kind === 'rain' ? 0.02 : 0.045, transparent: true, opacity: kind === 'dust' ? 0.5 : 0.85, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
    const fall = { snow: -0.6, rain: -9, dust: 0.05, bubbles: 0.8 }[kind];
    return (t, P, camPos) => {
      base.forEach(([x, y, z, ph], i) => {
        let yy = ((y + fall * t) % 6 + 6) % 6;
        pos[i * 3] = camPos.x + x + Math.sin(t * 0.8 + ph * 6) * (kind === 'snow' ? 0.25 : 0.05);
        pos[i * 3 + 1] = yy; pos[i * 3 + 2] = camPos.z - 3 + z;
      });
      geo.attributes.position.needsUpdate = true;
    };
  }
  return null;
}

// ---------- the shots ----------
export const speakingAt = (words, t) => words.some(w => t >= w.start - 0.05 && t <= w.end + 0.05);
function poseNow(p, name, t, { talk = 0, onset = 0.25, from = 'stand', seed = 0, extra = null } = {}) {
  let q = mix(POSES[from] || POSES.stand, POSES[name] || POSES.stand, smooth(range(t, onset, onset + 0.45)));
  if (talk) q = talking(q, t, talk);
  p.pose({ ...q, ...(extra || {}) }, t, { seed });
}
// Builds one engine shot from a spec. people: { id: Person }.
export function buildShot(spec, people, { makeStage, W, H }) {
  const scene = makeStage(stageFor(spec.set));
  buildSet(scene, spec.set, spec.seed);
  const wide = W > H, fov0 = wide ? 30 : 34;
  const c = cam(fov0); c.near = 0.03; c.far = 400;
  const P = spec.cast.map(id => people[id]).filter(Boolean);
  const dur = spec.end - spec.start;
  const r = rnd(spec.seed);
  const yawJ = (r() - 0.5) * 0.3;
  const fx = makeEffect(spec.effect, scene, spec.seed);
  // A real thing (things.js) in the shot replaces the emoji icon.
  const thing = spec.thing ? makeThing(spec.thing) : null;
  if (thing) scene.add(thing);
  const holds = thing && (spec.do === 'hold' || spec.do === 'show') && spec.kind !== 'object';
  const icon = !thing && spec.icon && (spec.kind === 'point' || r() < 0.5) ? emojiSprite(spec.icon, 0.55) : null;
  if (icon) scene.add(icon);
  if (spec.kind === 'object') {
    // The thing's stand: a small round table, so the close-up has a place to sit.
    const wood = std({ color: 0x6b4a2e, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 48), wood); top.position.y = 0.88;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.86, 16), wood); leg.position.y = 0.43;
    scene.add(shadowAll(top), shadowAll(leg));
  }
  const words = spec.words.map(w => ({ start: w.start - spec.offset, end: w.end - spec.offset }));
  const near = wide ? 0.85 : 1; // a wide frame needs the camera a little closer
  const tall = H > W * 1.2;     // 9:16 and 4:5: little room side to side
  const at = (p, x, z, ry) => { scene.add(p.object); p.object.position.set(x, 0, z); p.object.rotation.set(0, ry, 0); };
  const chest = (p) => { const h = p.headWorld(new THREE.Vector3()); return h.add(new THREE.Vector3(0, -0.32, 0.12)); };
  const lookAt = (p) => p.headWorld(new THREE.Vector3());

  return { scene, camera: c, update(t) {
    const k = easeInOut(range(t, 0, dur));
    let focusD = 0, ap = 0, target = V(0, 1.2, 0), eff = null;
    let spot = null, hand = null, tScale = 1;
    const A = P[0], B = P[1], C = P[2];
    const talk = speakingAt(words, t) ? 0.9 : 0;
    // Someone holding the thing raises it in the right hand (the show pose); the thing follows the hand.
    if (holds && A) hand = () => A.handWorld('r', new THREE.Vector3());
    const pose0 = holds ? 'show' : null;
    switch (spec.kind) {
      case 'object': {
        // The thing up close on its stand, the speaker soft behind it.
        const h = thing?.userData.h || 0.2;
        tScale = h < 0.12 ? 1.7 : h > 0.5 ? 0.7 : 1;
        spot = V(0, 0.9, 0);
        // The speaker stands inside the frame behind the thing. The lens aims at the middle of the
        // thing (lifted when it floats for a spin) and looks a little down on it, so the stand is a
        // small base at the bottom, not a table top across the lower half with the thing cut off above.
        // In a tall frame the lens looks down on the thing, which leaves no room above it for a speaker
        // behind (their head was cut off at the top, near or far): the tall close-up is the thing alone.
        if (A && !tall) { at(A, 0.7, -1.5, -0.35); poseNow(A, spec.pose === 'talk' ? 'think' : spec.pose, t, { talk, from: 'stand', seed: spec.seed }); }
        target = V(0, 0.9 + (spec.do === 'spin' ? 0.15 : 0) + h * tScale * 0.55, 0);
        // Far enough that the thing's widest side fills about 40 % of the frame's width.
        const big = (thing ? new THREE.Box3().setFromObject(thing).getSize(new THREE.Vector3()) : V(0.2, 0.2, 0.2));
        const span = Math.max(big.x, big.y, big.z, 0.12) * tScale;
        focusD = frameCam(c, target, { dist: Math.max(0.6, span * (tall ? 4.4 : 2.6)) * near, height: span * 1.1, yaw: 0.22 + yawJ }, spec.camera === 'impact' ? 'push-in' : spec.camera, k, t, spec.seed, fov0);
        ap = 0.005; eff = target.clone(); break;
      }
      case 'talk': {
        at(A, 0, 0, 0.18);
        poseNow(A, pose0 || (spec.pose === 'stand' ? 'talk' : spec.pose), t, { talk, from: 'talk', seed: spec.seed });
        target = lookAt(A).add(V(0, -0.12, 0));
        focusD = frameCam(c, target, { dist: 1.9 * near, height: 0.05, yaw: 0.18 + yawJ }, spec.camera, k, t, spec.seed, fov0);
        ap = 0.0018; eff = chest(A); break;
      }
      case 'two': {
        const gap = tall ? 0.34 : 0.55;
        at(A, -gap, 0, tall ? 0.55 : 0.9); at(B, gap, 0.05, tall ? -0.55 : -0.9);
        poseNow(A, pose0 || 'talk', t, { talk, from: 'talk', seed: spec.seed });
        poseNow(B, spec.pose, t, { from: 'stand', onset: dur * 0.4, seed: spec.seed + 1 });
        if (thing && !holds) { spot = lookAt(A).lerp(lookAt(B), 0.5).add(V(0, -0.75, 0.25)); tScale = 1.4; }
        target = lookAt(A).lerp(lookAt(B), 0.5).add(V(0, -0.2, 0));
        focusD = frameCam(c, target, { dist: (tall ? 3.7 : 2.9) * near, height: 0.05, yaw: tall ? 0.12 : 0.25 }, spec.camera === 'impact' ? 'push-in' : (tall ? narrowMove(spec.camera) : spec.camera), k, t, spec.seed, fov0);
        ap = 0.0011; eff = chest(B); break;
      }
      case 'react': {
        at(A, 0, 0, -0.1);
        poseNow(A, spec.pose === 'talk' ? 'surprised' : spec.pose, t, { from: 'stand', onset: 0.2, seed: spec.seed });
        target = lookAt(A).add(V(0, -0.02, 0));
        focusD = frameCam(c, target, { dist: 1.05 * near, height: 0.0, yaw: -0.12 }, spec.camera === 'pull-out' ? 'pull-out' : 'impact', k, t, spec.seed, fov0);
        ap = 0.0024; eff = chest(A); break;
      }
      case 'wide': {
        at(A, -0.4, 0, 0.3); if (B) at(B, 0.7, -0.6, -0.4);
        poseNow(A, spec.pose, t, { from: 'stand', onset: 0.4, seed: spec.seed }); if (B) poseNow(B, 'stand', t, { seed: spec.seed + 3 });
        target = V(0.1, 1.0, -0.2);
        focusD = frameCam(c, target, { dist: 7.5 * near, height: 1.6, yaw: 0.35 }, spec.camera === 'impact' ? 'pull-out' : spec.camera, k, t, spec.seed, fov0);
        eff = chest(A); break;
      }
      case 'walk': {
        const z = lerp(-3.5, -0.4, t / Math.max(dur, 0.1));
        at(A, 0, z, 0);
        A.pose(walking(t, 1), t, { seed: spec.seed });
        target = V(0, 1.35, z);
        focusD = frameCam(c, target, { dist: 2.6 * near, height: 0.1, yaw: 0.25 }, 'static', k, t, spec.seed, fov0);
        ap = 0.0014; eff = chest(A); break;
      }
      case 'point': {
        at(A, tall ? 0.2 : 0.5, 0, -0.6);
        poseNow(A, 'point', t, { talk, from: 'talk', onset: 0.3, seed: spec.seed, extra: { head: [0, -0.5, 0] } });
        const pt = tall ? V(-0.36, 1.62, -0.15) : V(-0.9, 1.45, -0.2);
        if (icon) { icon.position.copy(pt); icon.scale.setScalar(0.55 * (0.7 + 0.3 * easeOut(range(t, 0.3, 0.8))) + Math.sin(t * 3) * 0.02); }
        if (thing) { spot = pt.clone().add(V(0, -0.25, 0)); tScale = 2.2; }
        target = tall ? V(-0.04, 1.45, -0.1) : V(-0.1, 1.4, -0.1);
        focusD = frameCam(c, target, { dist: (tall ? 3.0 : 2.4) * near, height: 0.05, yaw: 0.05 }, spec.camera === 'orbit' ? 'orbit' : tall ? 'push-in' : 'pan-left', k, t, spec.seed, fov0);
        ap = 0.0012; eff = pt; break;
      }
      case 'group': {
        const side = tall ? 0.58 : 0.85, back = tall ? -0.45 : -0.2;
        at(A, 0, 0, 0); if (B) at(B, -side, back, 0.3); if (C) at(C, side, back, -0.3);
        const pz = spec.pose === 'talk' ? 'cheer' : spec.pose;
        poseNow(A, pz, t, { from: 'stand', onset: 0.25, seed: spec.seed }); if (B) poseNow(B, pz, t, { onset: 0.4, seed: spec.seed + 1 }); if (C) poseNow(C, pz, t, { onset: 0.55, seed: spec.seed + 2 });
        target = V(0, 1.3, -0.1);
        focusD = frameCam(c, target, { dist: (tall ? 4.9 : 3.6) * near, height: 0.15, yaw: 0.1 }, (tall ? narrowMove(spec.camera) : spec.camera), k, t, spec.seed, fov0);
        ap = 0.0009; eff = chest(A); break;
      }
    }
    if (thing) {
      if (!spot && !hand) {
        // Not held and not placed by the shot: it lands or spins beside the first person.
        const base = A ? A.object.position.clone() : V(0, 0, 0);
        const side = spec.kind === 'wide' ? 0.9 : 0.55;
        spot = base.add(V(tall ? side * 0.6 : side, spec.do === 'drop' || spec.do === 'break' ? 0 : 1.0, 0.35));
        tScale = spec.kind === 'wide' ? 2.6 : spec.kind === 'react' ? 1.2 : 1.8;
        if (thing.userData.h > 0.5) tScale = Math.min(tScale, 1.1);
      }
      thingAction(thing, spec.do, t, { spot: spot || V(0, 1, 0), hand, camPos: c.position, scale: tScale });
    }
    if (icon && spec.kind !== 'point') { icon.position.copy(target).add(V(0.55, 0.55, 0.1)); icon.material.opacity = easeOut(range(t, 0.2, 0.6)); }
    if (fx && eff) fx(t, eff, c.position);
    return { bloom: spec.set === 'night' ? 0.6 : 0.25, ao: icon || spec.effect === 'glow' ? 0 : 0.7, exposure: spec.set === 'night' ? 0.95 : 1.0, grade: { sat: 1.06, con: 1.04, vig: 0.22 }, ...(ap ? { dof: { focus: focusD, aperture: ap, maxblur: 0.009 } } : {}) };
  } };
}

// ---------- captions: 1-3 words, a new one at every pause or punctuation (captions.js) ----------
export { captions3d as captionsFrom } from './captions.js';
