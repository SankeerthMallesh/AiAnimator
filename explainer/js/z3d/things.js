// Things for the looks drawn in code, built from simple shapes (no models, no brands): each is a group
// standing on y = 0, real size in metres, with userData.h (height) and, for some, userData.anim(t).
// thingAction() moves one for what the scene does with it: hold, show, drop, grow, spin or break.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { THINGS } from './vocab.js';
export { THINGS };

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), m);
const cyl = (r1, r2, h, m, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const sph = (r, m, seg = 32) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const canvasMat = (w, h, draw, o = {}) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return std(0xffffff, { map: t, ...o }); };
const speck = (base, dots, n = 900) => canvasMat(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = dots[i % dots.length]; g.globalAlpha = 0.25 + Math.random() * 0.4; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4); } g.globalAlpha = 1; }, { roughness: 0.9 });

const BUILD = {
  brick() { const g = new THREE.Group(); g.add(at(rbox(0.3, 0.16, 0.15, 0.01, speck('#b9b4aa', ['#9c978e', '#d4cfc4', '#857f75'])), 0, 0.08, 0)); g.userData.h = 0.16; return g; },
  wall() {
    const g = new THREE.Group(), m = speck('#bdb5a6', ['#a39b8c', '#d6cfbf', '#8f8778'], 1600);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) g.add(at(rbox(0.29, 0.15, 0.2, 0.012, m), (c - 1.5 + (r % 2) * 0.5) * 0.3, 0.075 + r * 0.155, 0));
    g.userData.h = 0.78; return g;
  },
  phone() { const g = new THREE.Group(); g.add(at(rbox(0.075, 0.155, 0.009, 0.008, std(0x1c1d22, { roughness: 0.3 })), 0, 0.078, 0)); g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x5ab4ff, toneMapped: false })), 0, 0.078, 0.0047)); g.userData.h = 0.155; return g; },
  book() { const g = new THREE.Group(); g.add(at(rbox(0.16, 0.23, 0.035, 0.004, std(0xb23a3a)), 0, 0.115, 0)); g.add(at(rbox(0.15, 0.22, 0.03, 0.002, std(0xf4efe2)), 0.006, 0.115, 0)); g.userData.h = 0.23; return g; },
  laptop() {
    const g = new THREE.Group(), al = std(0xb8bcc4, { metalness: 0.6, roughness: 0.35 });
    g.add(at(rbox(0.32, 0.015, 0.22, 0.006, al), 0, 0.0075, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.015, -0.11); lid.rotation.x = -0.25; g.add(lid);
    lid.add(at(rbox(0.32, 0.21, 0.008, 0.006, al), 0, 0.105, 0)); lid.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.18), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, toneMapped: false })), 0, 0.105, 0.0045));
    g.userData.h = 0.22; return g;
  },
  mug() { const g = new THREE.Group(), m = std(0xf2f2f2, { roughness: 0.25 }); g.add(at(cyl(0.045, 0.042, 0.1, m), 0, 0.05, 0)); g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 12, 24), m), 0.05, 0.05, 0, 0, 0, 0)); g.add(at(cyl(0.04, 0.04, 0.004, std(0x4a2c1a)), 0, 0.095, 0)); g.userData.h = 0.1; return g; },
  ball() { const g = new THREE.Group(); g.add(at(sph(0.11, canvasMat(256, 128, (c, w, h) => { c.fillStyle = '#e8572a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a1a12'; c.lineWidth = 5; for (const x of [0.25, 0.75]) { c.beginPath(); c.moveTo(w * x, 0); c.lineTo(w * x, h); c.stroke(); } c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke(); })), 0, 0.11, 0)); g.userData.h = 0.22; return g; },
  globe() {
    const g = new THREE.Group();
    const earth = sph(0.12, canvasMat(512, 256, (c, w, h) => { c.fillStyle = '#2f7fd0'; c.fillRect(0, 0, w, h); c.fillStyle = '#5fae4a'; for (const [x, y, rx, ry] of [[0.2, 0.35, 0.09, 0.14], [0.27, 0.65, 0.05, 0.12], [0.52, 0.3, 0.06, 0.08], [0.55, 0.6, 0.06, 0.14], [0.75, 0.35, 0.13, 0.1], [0.85, 0.7, 0.05, 0.05]]) { c.beginPath(); c.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2); c.fill(); } }));
    earth.position.y = 0.2; earth.rotation.z = 0.4; g.add(earth);
    g.add(at(cyl(0.006, 0.006, 0.08, std(0x8a6a3a, { metalness: 0.5 })), 0, 0.05, 0)); g.add(at(cyl(0.06, 0.07, 0.02, std(0x3a2a1a)), 0, 0.01, 0));
    g.userData.h = 0.32; g.userData.anim = (t) => { earth.rotation.y = t * 0.8; }; return g;
  },
  magnet() {
    const g = new THREE.Group(), red = std(0xd23030, { roughness: 0.35 }), steel = std(0xd8dce2, { metalness: 0.8, roughness: 0.25 });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 16, 32, Math.PI), red); arc.position.y = 0.16; g.add(arc);
    for (const x of [-0.06, 0.06]) { g.add(at(cyl(0.022, 0.022, 0.1, red), x, 0.11, 0)); g.add(at(cyl(0.0225, 0.0225, 0.035, steel), x, 0.0425, 0)); }
    g.rotation.z = Math.PI; g.position.y = 0.2; const w = new THREE.Group(); w.add(g); w.userData.h = 0.2; return w;
  },
  coins() { const g = new THREE.Group(), m = std(0xe0b040, { metalness: 0.9, roughness: 0.3 }); for (let i = 0; i < 9; i++) g.add(at(cyl(0.03, 0.03, 0.007, m), (Math.sin(i * 2.3) * 0.004), 0.0035 + i * 0.0075, Math.cos(i * 1.7) * 0.004)); g.userData.h = 0.07; return g; },
  clock() {
    const g = new THREE.Group(); const face = canvasMat(256, 256, (c, w) => { c.fillStyle = '#fbf8f0'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill(); c.fillStyle = '#222'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.fillRect(w / 2 + Math.sin(a) * w * 0.4 - 3, w / 2 - Math.cos(a) * w * 0.4 - 8, 6, 16); } });
    const body = cyl(0.11, 0.11, 0.04, std(0xc0392b)); body.rotation.x = Math.PI / 2; body.position.y = 0.12; g.add(body);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.095, 48), face); f.position.set(0, 0.12, 0.021); g.add(f);
    const hand = (len, w) => { const p = new THREE.Group(); p.position.set(0, 0.12, 0.024); p.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.003), std(0x111111)), 0, len / 2, 0)); g.add(p); return p; };
    const hr = hand(0.05, 0.008), mn = hand(0.075, 0.005);
    g.userData.h = 0.23; g.userData.anim = (t) => { mn.rotation.z = -t * 2.2; hr.rotation.z = -t * 0.18 - 1; }; return g;
  },
  hourglass() {
    const g = new THREE.Group(), wood = std(0x7a4f2c), glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.35 });
    for (const y of [0.01, 0.23]) g.add(at(cyl(0.07, 0.07, 0.02, wood), 0, y, 0));
    for (const [y, r] of [[0.065, [0.055, 0.008]], [0.175, [0.008, 0.055]]]) g.add(at(cyl(r[1], r[0], 0.11, glass), 0, y, 0));
    const sand = at(cyl(0.004, 0.045, 0.05, std(0xe2c27a)), 0, 0.045, 0); g.add(sand);
    g.userData.h = 0.24; g.userData.anim = (t) => { sand.scale.y = 0.6 + 0.4 * Math.min(1, t / 3); }; return g;
  },
  bulb() {
    const g = new THREE.Group();
    const glassM = std(0xfff3c0, { emissive: 0xffd970, emissiveIntensity: 1.6, transparent: true, opacity: 0.95 });
    g.add(at(sph(0.06, glassM), 0, 0.12, 0)); g.add(at(cyl(0.025, 0.03, 0.04, std(0xbfc3c8, { metalness: 0.8 })), 0, 0.05, 0));
    const l = new THREE.PointLight(0xffd59a, 2, 2); l.position.y = 0.12; g.add(l);
    g.userData.h = 0.18; return g;
  },
  key() { const g = new THREE.Group(), m = std(0xd9b44a, { metalness: 0.85, roughness: 0.3 }); g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 12, 28), m), 0, 0.12, 0)); g.add(at(cyl(0.006, 0.006, 0.09, m), 0, 0.05, 0)); for (const y of [0.01, 0.025]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.006), m), 0.012, y, 0)); g.userData.h = 0.15; return g; },
  trophy() { const g = new THREE.Group(), m = std(0xe8b923, { metalness: 0.95, roughness: 0.22 }); g.add(at(rbox(0.12, 0.04, 0.12, 0.005, std(0x2b2b2b)), 0, 0.02, 0)); g.add(at(cyl(0.012, 0.02, 0.08, m), 0, 0.08, 0)); g.add(at(cyl(0.07, 0.03, 0.1, m), 0, 0.17, 0)); for (const x of [-0.075, 0.075]) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 10, 20), m), x, 0.17, 0)); g.userData.h = 0.22; return g; },
  gift() { const g = new THREE.Group(); g.add(at(rbox(0.2, 0.18, 0.2, 0.01, std(0x2f80d0)), 0, 0.09, 0)); const rib = std(0xf2c230); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.185, 0.03), rib), 0, 0.09, 0)); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.185, 0.205), rib), 0, 0.09, 0)); for (const r of [0.6, -0.6]) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 20), rib), 0, 0.2, 0, 0, r, 0)); g.userData.h = 0.22; return g; },
  apple() { const g = new THREE.Group(); const a = sph(0.045, std(0xc8202a, { roughness: 0.3 })); a.scale.set(1, 0.9, 1); a.position.y = 0.042; g.add(a); g.add(at(cyl(0.003, 0.003, 0.02, std(0x5a3a1a)), 0, 0.09, 0)); const leaf = sph(0.012, std(0x3a9a3a)); leaf.scale.set(1.6, 0.4, 0.8); leaf.position.set(0.012, 0.095, 0); g.add(leaf); g.userData.h = 0.1; return g; },
  bottle() { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x5ec27a, transmission: 0.6, roughness: 0.1, transparent: true, opacity: 0.8 }); g.add(at(cyl(0.035, 0.035, 0.16, m), 0, 0.08, 0)); g.add(at(cyl(0.013, 0.035, 0.05, m), 0, 0.185, 0)); g.add(at(cyl(0.014, 0.014, 0.015, std(0xd8d8d8)), 0, 0.215, 0)); g.userData.h = 0.22; return g; },
  scale() {
    const g = new THREE.Group(), m = std(0xc9a44a, { metalness: 0.85, roughness: 0.3 });
    g.add(at(cyl(0.06, 0.07, 0.02, m), 0, 0.01, 0)); g.add(at(cyl(0.008, 0.008, 0.26, m), 0, 0.14, 0));
    const beam = new THREE.Group(); beam.position.y = 0.27; g.add(beam); beam.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), m), 0, 0, 0));
    const pans = [-0.14, 0.14].map(x => { const p = new THREE.Group(); p.position.set(x, 0, 0); beam.add(p); p.add(at(cyl(0.002, 0.002, 0.1, m), 0, -0.05, 0)); p.add(at(cyl(0.055, 0.04, 0.012, m), 0, -0.1, 0)); return p; });
    g.userData.h = 0.29; g.userData.anim = (t) => { beam.rotation.z = Math.sin(t * 1.3) * 0.18; for (const p of pans) p.rotation.z = -beam.rotation.z; }; return g;
  },
  rocket() {
    const g = new THREE.Group(), white = std(0xf4f4f4), red = std(0xd8352a);
    g.add(at(cyl(0.035, 0.035, 0.18, white), 0, 0.12, 0)); g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 32), red), 0, 0.245, 0));
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.04), red); const a = k / 3 * Math.PI * 2; f.position.set(Math.sin(a) * 0.04, 0.05, Math.cos(a) * 0.04); f.rotation.y = a; g.add(f); }
    g.add(at(sph(0.012, new THREE.MeshBasicMaterial({ color: 0x4aa3ff, toneMapped: false })), 0, 0.16, 0.034));
    g.userData.h = 0.28; return g;
  },
  car() {
    const g = new THREE.Group(), paint = std(0x2a6fd6, { metalness: 0.4, roughness: 0.3 }), dark = std(0x1a1a1a);
    g.add(at(rbox(0.3, 0.07, 0.14, 0.02, paint), 0, 0.06, 0)); g.add(at(rbox(0.16, 0.06, 0.12, 0.02, std(0x9fd0f2, { roughness: 0.1 })), -0.02, 0.115, 0));
    for (const x of [-0.1, 0.1]) for (const z of [-0.07, 0.07]) { const w = cyl(0.03, 0.03, 0.02, dark); w.rotation.x = Math.PI / 2; w.position.set(x, 0.03, z); g.add(w); }
    g.userData.h = 0.15; return g;
  },
  gem() { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x3fd0ff, transmission: 0.6, roughness: 0.05, metalness: 0.1, emissive: 0x0a4a6a, emissiveIntensity: 0.4 }); const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), m); d.scale.y = 1.4; d.position.y = 0.1; g.add(d); g.userData.h = 0.2; g.userData.anim = (t) => { d.rotation.y = t * 0.9; }; return g; },
  atom() {
    const g = new THREE.Group(); g.add(at(sph(0.035, std(0xe0533a)), 0, 0.15, 0));
    const orbits = [0, 1, 2].map(k => { const o = new THREE.Group(); o.position.y = 0.15; o.rotation.set(k * 1.05, k * 0.7, 0); g.add(o); o.add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.0025, 8, 64), std(0x9fd8ff, { emissive: 0x3a8ad0, emissiveIntensity: 0.6 }))); const e = sph(0.012, new THREE.MeshBasicMaterial({ color: 0x7fe0ff, toneMapped: false })); o.add(e); return { o, e, k }; });
    g.userData.h = 0.3; g.userData.anim = (t) => { for (const { e, k } of orbits) { const a = t * (2.4 + k * 0.6) + k * 2; e.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0); } }; return g;
  },
  dna() {
    const g = new THREE.Group(), a = std(0x3a8ad0), b = std(0xd04a6a), rung = std(0xdddddd);
    for (let i = 0; i < 16; i++) { const y = 0.02 + i * 0.018, ang = i * 0.5; const p1 = [Math.cos(ang) * 0.05, y, Math.sin(ang) * 0.05], p2 = [-p1[0], y, -p1[2]]; g.add(at(sph(0.011, a, 12), ...p1)); g.add(at(sph(0.011, b, 12), ...p2)); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 6), rung); r.position.set(0, y, 0); r.rotation.set(0, -ang, Math.PI / 2); g.add(r); }
    g.userData.h = 0.31; g.userData.anim = (t) => { g.rotation.y = t * 0.7; }; return g;
  },
  ice() { const g = new THREE.Group(); const c = rbox(0.09, 0.09, 0.09, 0.015, new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, transmission: 0.8, roughness: 0.15, transparent: true, opacity: 0.85 })); c.position.y = 0.045; c.rotation.y = 0.4; g.add(c); g.userData.h = 0.09; return g; },
  flame() {
    const g = new THREE.Group(); const layers = [[0.06, 0.18, 0xff7a1a], [0.04, 0.13, 0xffc23a], [0.022, 0.08, 0xfff2b0]].map(([r, h, c]) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false })); m.position.y = h / 2; g.add(m); return m; });
    const l = new THREE.PointLight(0xff9a3a, 3, 3); l.position.y = 0.1; g.add(l);
    g.userData.h = 0.18; g.userData.anim = (t) => layers.forEach((m, i) => { m.scale.set(1 + Math.sin(t * 9 + i) * 0.08, 1 + Math.sin(t * 7 + i * 2) * 0.12, 1); }); return g;
  },
};

// A thing by name (unknown names fall back to a gift box), shadows on.
export function makeThing(name) {
  const g = (BUILD[name] || BUILD.gift)();
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.name = BUILD[name] ? name : 'gift';
  return g;
}

const easeOutBack = (x) => { const c = 1.70158, k = Math.max(0, Math.min(1, x)); return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const easeOut = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;

// Moves thing `g` for action `act` at shot time t. spot: where it shows (a Vector3 on or above the ground);
// hand: a function giving the holding hand's world position (for hold/show); camPos: the lens.
// break: the first time it runs it splits the thing's meshes into flying pieces.
export function thingAction(g, act, t, { spot, hand = null, camPos = null, scale = 1 }) {
  const anim = g.userData.anim; anim?.(t);
  g.visible = true;
  const s = scale;
  // A flat thing (a clock, a phone, coins, a book) seen edge-on is a sliver: it rocks toward the lens
  // instead of turning all the way round.
  if (g.userData.flat == null) { const b = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); const d = [b.x, b.y, b.z].sort((x, y) => x - y); g.userData.flat = d[0] < d[2] * 0.35; }
  const turn = (speed) => {
    if (!g.userData.flat) return t * speed;
    const face = camPos ? Math.atan2(camPos.x - g.position.x, camPos.z - g.position.z) : 0;
    return face + Math.sin(t * Math.min(speed, 1.6)) * 0.6;
  };
  switch (act) {
    case 'hold': case 'show': {
      const h = hand?.();
      if (h) {
        // In the hand, a little in front of it and up, turned toward the lens.
        g.position.copy(h).add(new THREE.Vector3(0, -0.02, 0.04));
        if (camPos) g.rotation.set(0, Math.atan2(camPos.x - g.position.x, camPos.z - g.position.z) + (act === 'show' ? Math.sin(t * 0.8) * 0.4 : 0), 0);
        g.scale.setScalar(s);
      } else { g.position.copy(spot); g.scale.setScalar(s * easeOutBack(t / 0.4)); g.rotation.y = turn(0.6); }
      break;
    }
    case 'drop': {
      // Falls from 2.2 m above the spot, lands at 0.55 s with a squash and two small bounces.
      const k = t / 0.55, y = k < 1 ? (1 - k * k) * 2.2 : Math.abs(Math.sin((t - 0.55) * 9)) * 0.12 * Math.exp(-(t - 0.55) * 5);
      g.position.set(spot.x, spot.y + y, spot.z);
      const sq = k >= 1 ? 1 - 0.18 * Math.exp(-(t - 0.55) * 12) : 1;
      g.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq)); g.rotation.y = k < 1 ? k * 1.2 : 1.2;
      break;
    }
    case 'grow': g.position.copy(spot); g.scale.setScalar(s * easeOutBack((t - 0.1) / 0.5) * 1.0 + 0.0001); g.rotation.y = turn(0.5); break;
    case 'spin': g.position.set(spot.x, spot.y + 0.15 + Math.sin(t * 2.2) * 0.04, spot.z); g.rotation.y = turn(2.4); g.scale.setScalar(s * Math.min(1, easeOut(t / 0.3))); break;
    case 'break': {
      g.position.copy(spot); g.scale.setScalar(s);
      if (!g.userData.parts) {
        g.userData.parts = [];
        const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
        // A thing of one or two pieces gets chunks of its own material to shatter into (shown at the break).
        if (meshes.length < 4) {
          const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()).divideScalar(Math.max(1e-6, g.scale.x)), mat = meshes[0]?.material || std(0xcccccc);
          for (let i = 0; i < 10; i++) {
            const cs = Math.max(size.x, size.y, size.z) * (0.16 + Math.random() * 0.14);
            const m = new THREE.Mesh(new THREE.DodecahedronGeometry(cs * 0.6, 0), mat); m.castShadow = true;
            m.position.set((Math.random() - 0.5) * size.x * 0.8, size.y * (0.2 + Math.random() * 0.6), (Math.random() - 0.5) * size.z * 0.8);
            m.visible = false; m.userData.chunk = true; g.add(m);
          }
        }
        g.traverse(o => { if (o.isMesh) g.userData.parts.push({ o, p: o.position.clone(), r: o.rotation.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 1.6, 1 + Math.random() * 1.4, (Math.random() - 0.3) * 1.2), w: (Math.random() - 0.5) * 8 }); });
        g.userData.whole = meshes;
      }
      // Whole for 0.6 s, then the pieces fly apart and fall (pieces of a one-piece thing tumble away).
      const u = Math.max(0, t - 0.6);
      const chunks = g.userData.parts.some(x => x.o.userData.chunk);
      for (const m of g.userData.whole) m.visible = !chunks || u === 0;
      for (const { o, p, r, v, w } of g.userData.parts) {
        if (o.userData.chunk) o.visible = u > 0;
        else if (chunks) continue;
        o.position.set(p.x + v.x * u / s, p.y + (v.y * u - 4.9 * u * u) / s, p.z + v.z * u / s);
        if (o.position.y < -p.y) o.position.y = -p.y;
        o.rotation.set(r.x + w * u, r.y + w * u * 0.7, r.z + w * u * 0.4);
      }
      break;
    }
    default: g.position.copy(spot); g.scale.setScalar(s);
  }
}
