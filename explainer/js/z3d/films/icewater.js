// "What happens if you jump into ice water?" — a 60 s 3D explainer in the zach-d-films format
// (hook, misconception, "But" turn, examples that build, the mechanism, a payoff), played by the
// realistic cast, timed to the voice (see tools/films/icewater: lines.json, words.json).
// Facts: cold shock response and the 1-10-1 rule (one minute of cold shock, about ten minutes of
// useful movement, about an hour before hypothermia causes unconsciousness), as taught by
// cold-water rescue and safety bodies; peripheral vasoconstriction protects the core.

import * as THREE from 'three';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake } from '../anim.js';
import { sparks, glowSprite, rippleOverlay } from '../props.js';
import { loadPerson, POSES, mix, talking } from '../people.js';

export const DURATION = 60.0;
// Dips to black: before the "But" turn.
export const FADES = [[9.05, 9.3, 9.38, 9.62]];

const WINTER_SKY = { top: 0x5d8fd0, mid: 0x9cc0e8, horizon: 0xe6eef6, floorC: 0xdfe8f2 };
const DUSK_SKY = { top: 0x3d4f86, mid: 0xc48a92, horizon: 0xf3c38f, floorC: 0xd8c3b0 };
const STAGE = (o = {}) => ({ shadowSize: 6, sun: 2.6, sunDir: [-6, 5, 7], sunColor: 0xfff1e0, hemi: 0.85, rimLight: 1.6, rimDir: [6, 4, -6], shadowMap: 2048, fog: [18, 110], sky: WINTER_SKY, ...o });
const LOOK = (o = {}) => ({ bloom: 0.25, ao: 0.8, grade: { sat: 1.06, con: 1.04, vig: 0.22 }, ...o });
const HOLE = 1.3;            // radius of the hole in the ice (m)
const WATER_Y = -0.12;       // water surface
const SUNK = -1.28;          // person standing in the water: surface at mid-chest

// ---------- the frozen lake ----------
function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t;
}
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function iceTexture() {
  const r = rnd(5);
  return canvasTex(1024, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#cfe3f1'); grd.addColorStop(1, '#b6d2e6');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 120, 8 + r() * 40, r() * 3, 0, Math.PI * 2); g.fill(); } // snow drifts
    g.strokeStyle = 'rgba(90,130,160,.55)'; g.lineWidth = 1.4;
    for (let i = 0; i < 40; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); } // cracks
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.8;
    for (let i = 0; i < 30; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  }, 6);
}
function waterTexture() {
  const r = rnd(9);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0c3442'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(160,220,235,${0.04 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h, l = 10 + r() * 40; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 8, x + l, y); g.stroke(); }
  }, 2);
}
function pine(h, snowy = true) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.9 }));
  trunk.position.y = h * 0.12; g.add(trunk);
  const green = new THREE.MeshStandardMaterial({ color: 0x1f4a33, roughness: 0.85 }), white = new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.7 });
  for (let k = 0; k < 4; k++) {
    const rr = h * (0.32 - k * 0.065), hh = h * 0.34, y = h * (0.22 + k * 0.19);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 10), green); c.position.y = y + hh / 2; g.add(c);
    if (snowy) { const s = new THREE.Mesh(new THREE.ConeGeometry(rr * 0.8, hh * 0.35, 10), white); s.position.y = y + hh * 0.82; g.add(s); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function lake(scene, { dusk = false } = {}) {
  const ice = new THREE.Mesh(new THREE.RingGeometry(HOLE, 90, 96, 4), new THREE.MeshStandardMaterial({ map: iceTexture(), roughness: 0.22, metalness: 0.0, envMapIntensity: 0.9 }));
  ice.rotation.x = -Math.PI / 2; ice.receiveShadow = true; scene.add(ice);
  // The edge of the hole: ice is about 12 cm thick, a little translucent blue.
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(HOLE, HOLE, 0.14, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x9cc7dd, roughness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  edge.position.y = -0.07; scene.add(edge);
  const wt = waterTexture();
  const water = new THREE.Mesh(new THREE.CircleGeometry(HOLE + 0.02, 64), new THREE.MeshStandardMaterial({ map: wt, color: 0xffffff, roughness: 0.08, metalness: 0.25, envMapIntensity: 1.4 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; water.receiveShadow = true; scene.add(water);
  // Broken ice chunks floating in the hole.
  const chunkM = new THREE.MeshStandardMaterial({ color: 0xd9ebf5, roughness: 0.2 });
  const r = rnd(17);
  chunkM.transparent = true; chunkM.opacity = 0.9;
  for (let k = 0; k < 9; k++) { const a = r() * Math.PI * 2, d = 0.75 + r() * 0.45; const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + r() * 0.09, 0), chunkM); c.scale.set(1.2 + r(), 0.28, 1 + r() * 0.8); c.position.set(Math.cos(a) * d, WATER_Y + 0.015, Math.sin(a) * d); c.rotation.set(r() * 0.15, r() * 3, r() * 0.15); c.castShadow = true; scene.add(c); }
  // Snowbanks and pines around the lake.
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf6f9fc, roughness: 0.8 });
  for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, d = 22 + r() * 30; const s = new THREE.Mesh(new THREE.SphereGeometry(2 + r() * 3, 18, 10), snowM); s.scale.y = 0.35; s.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.receiveShadow = true; scene.add(s); }
  for (let k = 0; k < 70; k++) { const a = r() * Math.PI * 2, d = 26 + r() * 40; const p = pine(5 + r() * 7); p.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); scene.add(p); }
  return { water, wt, ice };
}
// Rings spreading on the water from (x, z) after time t0.
function rings(scene, x = 0, z = 0) {
  const m = new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0, depthWrite: false });
  const list = [0, 1, 2].map(() => { const o = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 64), m.clone()); o.rotation.x = -Math.PI / 2; o.position.set(x, WATER_Y + 0.005, z); scene.add(o); return o; });
  return (t) => list.forEach((o, i) => { const k = t - i * 0.35; const s = k > 0 ? 0.15 + k * 0.6 : 0.01; o.scale.setScalar(Math.min(s, HOLE)); o.material.opacity = k > 0 ? Math.max(0, 0.32 - k * 0.22) : 0; });
}
// A red force ripple on a small invisible disc in front of the chest (the cold shock / the heart).
function chestRipple(person) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  const holder = new THREE.Group(); holder.add(disc); person.object.add(holder);
  holder.userData.ripple = true; holder.visible = false;
  holder.position.set(0.03, 1.3, 0.15);
  const rp = rippleOverlay(disc);
  rp.material.uniforms.uRings.value = 120;
  const set = (t, amp, radius, spot = 0.05) => { only(person, holder); const u = rp.material.uniforms; u.uAmp.value = amp; u.uRadius.value = radius; u.uSpot.value = spot; u.uTime.value = t; };
  set.holder = holder;
  return set;
}
// The cast is shared between shots: show only this shot's ripple (or none).
function only(person, holder = null) { for (const c of person.object.children) if (c.userData.ripple) c.visible = c === holder; }

// ---------- the cast ----------
let cast = null;
export async function prepare() {
  const [nathan, carla, eric] = await Promise.all([loadPerson('nathan'), loadPerson('carla'), loadPerson('eric')]);
  cast = { nathan, carla, eric };
  return { SHOTS, CAPTIONS: captions(), FADES, DURATION };
}
const camera = (fov = 34) => { const c = cam(fov); c.aspect = 9 / 16; c.near = 0.02; c.far = 400; return c; };
const at = (p, x, y, z, ry = 0) => { p.object.position.set(x, y, z); p.object.rotation.set(0, ry, 0); return p; };
const pose = (p, name, t, extra = {}) => { let q = POSES[name] || POSES.stand; if (extra.talk) q = talking(q, t, extra.talk); if (extra.mix) q = mix(q, POSES[extra.mix[0]], extra.mix[1]); p.pose({ ...q, ...(extra.set || {}) }, t, { seed: extra.seed || 0 }); };
const TREAD = { armL: { upper: [0.55, -0.35, 0.45], lower: [0.35, 0.05, 0.95] }, armR: { upper: [-0.55, -0.35, 0.45], lower: [-0.35, 0.05, 0.95] }, head: [-0.05, 0, 0] };
const tread = (t, k = 1) => ({ ...TREAD, armL: { upper: [0.55, -0.35 + Math.sin(t * 3) * 0.15 * k, 0.45], lower: [0.35 + Math.sin(t * 3.4) * 0.2 * k, 0.05, 0.95] }, armR: { upper: [-0.55, -0.35 + Math.sin(t * 3 + 1.5) * 0.15 * k, 0.45], lower: [-0.35 - Math.sin(t * 3.4 + 1.5) * 0.2 * k, 0.05, 0.95] } });
const bob = (t, k = 1) => Math.sin(t * 2.1) * 0.025 * k;

// ---------- the shots ----------
// S1 0.0-2.6: wide, he stands at the hole's edge looking down; slow push in.
function s1({ makeStage }) {
  const scene = makeStage(STAGE()); lake(scene);
  const n = cast.nathan; scene.add(at(n, 0, 0, -1.35).object);
  const c = camera(32);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n);
    pose(n, 'stand', t, { set: { head: [0.35, 0, 0], spine: [0.08, 0, 0] } });
    const k = easeInOut(range(t, 0, 2.6)), s = shake(t, 0.5, 1);
    place(c, [lerp(3.2, 2.7, k) + s[0], lerp(1.9, 1.75, k) + s[1], lerp(3.6, 3.0, k)], [0, 0.9, -0.6], -0.03);
    return LOOK({ dof: { focus: c.position.distanceTo(V(0, 1.2, -1.35)), aperture: 0.0008, maxblur: 0.004 } });
  } };
}
// S2 2.6-5.3: the jump, slow motion: he springs, drops through the hole; a burst of spray and rings.
function s2({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const spray = sparks(220, { speed: 3.4, spread: 0.9, gravity: -9.8, life: 1.4, color: [0.8, 0.92, 1], size: 0.06, seed: 3, dir: V(0, 1, 0) });
  spray.position.set(0, WATER_Y + 0.05, 0); scene.add(spray);
  const ring = rings(scene);
  const c = camera(36);
  const T0 = 1.05; // hits the water (slow motion before, real time after)
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n);
    const air = range(t, 0.15, T0);
    const y = t < T0 ? lerp(0, 0.55, Math.sin(air * Math.PI * 0.62)) - easeIn(range(t, 0.6, T0)) * 1.1 : lerp(-0.6, SUNK, easeOut(range(t, T0, T0 + 0.6))) + (t > T0 + 0.6 ? bob(t) : 0);
    const z = lerp(-1.35, 0, smooth(range(t, 0.15, T0)));
    at(n, 0, y, z, 0);
    pose(n, t < T0 ? 'cheer' : 'surprised', t, { set: t < T0 ? { legL: { upper: [0, -1, 0.35], lower: [0, -1, -0.2] }, legR: { upper: [0, -1, 0.1], lower: [0, -1, -0.35] }, jaw: 0.3 } : { brows: 1 } });
    spray.update(t - T0); ring(t - T0);
    L.wt.offset.set(t * 0.01, t * 0.004);
    const s = shake(t, t > T0 ? 4 * Math.exp(-(t - T0) * 3) + 0.4 : 0.4, 2);
    place(c, [1.9 + s[0], 0.75 + s[1], 2.2], [0, lerp(0.7, 0.05, smooth(range(t, 0.4, T0 + 0.3))), -0.2], 0.05);
    return LOOK({ bloom: 0.5, dof: { focus: 2.6, aperture: 0.0012, maxblur: 0.006 } });
  } };
}
// S3 5.3-9.4: "Most people think...": Carla on the ice, talking to camera, a shrug on "seconds".
function s3({ makeStage }) {
  const scene = makeStage(STAGE({ sunDir: [-5, 6, 8] })); lake(scene);
  const p = cast.carla; scene.add(at(p, -2.2, 0, 1.0, 0.25).object);
  const c = camera(30);
  return { scene, camera: c, update(t) {
    scene.add(p.object);
    const shrug = smooth(range(t, 2.4, 2.9)) * (1 - smooth(range(t, 3.6, 4.0)));
    pose(p, 'talk', t, { talk: 1, mix: ['shrug', shrug], seed: 2 });
    const k = easeInOut(range(t, 0, 4.1));
    place(c, [lerp(-1.6, -1.75, k), 1.5, lerp(3.3, 2.85, k)], [-2.2, 1.42, 1.0], 0.04);
    return LOOK({ dof: { focus: c.position.distanceTo(V(-2.2, 1.5, 1.0)), aperture: 0.0016, maxblur: 0.009 } });
  } };
}
// S4 9.4-13.2: "But for the first minute...": he is in the water to the chest; a slow orbit.
function s4({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene); const ring = rings(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(32);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n); at(n, 0, SUNK + bob(t), 0, 0);
    n.pose({ ...tread(t), brows: -0.4, jaw: 0.2 + Math.abs(Math.sin(t * 7)) * 0.3 }, t, { seed: 1 });
    ring(t % 2.2); L.wt.offset.set(t * 0.012, t * 0.005);
    const a = lerp(-0.5, 0.15, easeInOut(range(t, 0, 3.8)));
    place(c, [Math.sin(a) * 2.1, 0.55, Math.cos(a) * 2.1], [0, 0.12, 0], -0.02);
    return LOOK({ dof: { focus: 2.1, aperture: 0.0018, maxblur: 0.008 } });
  } };
}
// S5 13.2-15.8: the gasp: extreme close-up, eyes wide, a punch-in on "gasp".
function s5({ makeStage }) {
  const scene = makeStage(STAGE()); lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(28);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n); at(n, 0, SUNK + bob(t, 0.6), 0, 0);
    const g = smooth(range(t, 0.25, 0.45));
    n.pose({ ...tread(t, 0.5), head: [-0.18 * g, 0, 0], brows: g, jaw: g, blink: 0 }, t, { blinks: false });
    const k = easeOut(range(t, 0.25, 0.6)), s = shake(t, 1 + 2 * g * Math.exp(-(t - 0.3) * 2), 4);
    place(c, [0.05 + s[0], 0.5 + s[1], lerp(0.95, 0.7, k)], [0, 0.42, 0]);
    return LOOK({ dof: { focus: lerp(0.95, 0.7, k), aperture: 0.003, maxblur: 0.01 } });
  } };
}
// S6 15.8-19.0: "...if your head is under, that gasp pulls in water": he sinks; bubbles rise.
function s6({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene); const ring = rings(scene);
  const n = cast.nathan; scene.add(n.object);
  const bub = sparks(90, { speed: 1.2, spread: 0.6, gravity: 1.5, life: 1.6, color: [0.85, 0.95, 1], size: 0.035, seed: 6, dir: V(0, 1, 0) });
  bub.position.set(0.05, WATER_Y - 0.25, 0.1); scene.add(bub);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n);
    const d = easeInOut(range(t, 0.4, 1.4)) * (1 - easeOut(range(t, 2.3, 3.0)));
    at(n, 0, SUNK - d * 0.55 + bob(t), 0, 0);
    n.pose({ ...tread(t, 1.6), brows: 1, jaw: 0.6, head: [-0.25, 0, 0] }, t);
    bub.update(t - 1.0); ring(t - 2.4); L.wt.offset.set(t * 0.012, t * 0.005);
    const s = shake(t, 1.2, 5);
    place(c, [0.9 + s[0], 0.35 + s[1], 1.35], [0, -0.05, 0], 0.04);
    return LOOK({ dof: { focus: 1.6, aperture: 0.0016, maxblur: 0.007 } });
  } };
}
// S7 19.0-24.6: heart and breathing: the red ripple pulses from his chest with each beat; fast breaths.
function s7({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const rip = chestRipple(n);
  const c = camera(30);
  return { scene, camera: c, update(t) {
    scene.add(n.object); at(n, 0, SUNK + 0.18 + bob(t), 0, 0);
    const beat = (t * 2.2) % 1, pulse = Math.exp(-beat * 5);
    n.pose({ ...tread(t, 0.6), brows: 0.6, jaw: Math.abs(Math.sin(t * 9)) * 0.7, spine: [Math.sin(t * 9) * 0.03, 0, 0] }, t);
    rip(t, 0.35 + pulse * 0.65, 0.05 + easeOut(beat) * 0.12, 0.05);
    L.wt.offset.set(t * 0.012, t * 0.005);
    const k = easeInOut(range(t, 0, 5.6)), s = shake(t, 0.8 + pulse * 1.2, 7);
    place(c, [lerp(-0.55, -0.35, k) + s[0], 0.62 + s[1], lerp(1.15, 0.95, k)], [0, 0.45, 0], -0.05);
    return LOOK({ bloom: 0.55, dof: { focus: 1.05, aperture: 0.0024, maxblur: 0.009 } });
  } };
}
// S8 24.6-28.4: the 1-10-1 rule: Eric on the ice, counts it out with his hand.
function s8({ makeStage }) {
  const scene = makeStage(STAGE({ sunDir: [-6, 7, 7] })); lake(scene);
  const e = cast.eric; scene.add(at(e, 2.4, 0, 0.6, -0.35).object);
  const c = camera(30);
  return { scene, camera: c, update(t) {
    scene.add(e.object);
    const up = smooth(range(t, 1.8, 2.2));
    pose(e, 'talk', t, { talk: 1, mix: ['point', up * 0.75], seed: 3, set: { brows: 0.4 } });
    const k = easeOut(range(t, 0, 0.5)), s = shake(t, 0.5, 8);
    place(c, [lerp(3.6, 3.15, k) + s[0], 1.55 + s[1], lerp(3.6, 2.6, k)], [2.35, 1.42, 0.6], 0.035);
    return LOOK({ dof: { focus: c.position.distanceTo(V(2.4, 1.5, 0.6)), aperture: 0.0016, maxblur: 0.009 } });
  } };
}
// S9 28.4-30.6: "one minute to calm your breathing": he slows down, eyes closed, calm.
function s9({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(30);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n); at(n, 0, SUNK + 0.1 + bob(t, 0.4), 0, 0.3);
    const calm = smooth(range(t, 0.2, 1.4));
    n.pose({ ...tread(t, 1 - calm * 0.7), blink: calm * 0.9, brows: lerp(0.5, -0.1, calm), jaw: 0.1, head: [lerp(-0.1, 0.08, calm), 0, 0] }, t, { blinks: false });
    L.wt.offset.set(t * 0.008, t * 0.003);
    const k = easeInOut(range(t, 0, 2.2));
    place(c, [0.55, 0.62, lerp(1.25, 1.1, k)], [0.05, 0.5, 0]);
    return LOOK({ dof: { focus: 1.2, aperture: 0.0022, maxblur: 0.008 } });
  } };
}
// S10 30.6-33.2: "Don't fight it. Float.": top shot, he lies back on the water, arms out.
function s10({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene); const ring = rings(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n);
    const lie = easeInOut(range(t, 0.1, 1.3));
    n.object.position.set(0, lerp(SUNK + 0.1, WATER_Y - 0.03, lie), lerp(0, 0.95, lie));
    n.object.rotation.set(-Math.PI / 2 * lie, 0, 0);
    n.pose({ armL: { upper: [1, 0.1, 0], lower: [1, 0.2, 0] }, armR: { upper: [-1, 0.1, 0], lower: [-1, 0.2, 0] }, blink: 0.85, jaw: 0.05, legL: { upper: [0.1, -1, 0], lower: [0.1, -1, 0] }, legR: { upper: [-0.1, -1, 0], lower: [-0.1, -1, 0] } }, t, { blinks: false });
    ring(t % 2.6); L.wt.offset.set(t * 0.006, t * 0.002);
    const k = easeInOut(range(t, 0, 2.6));
    // Straight down at him, his head towards the top of the frame, slowly lowering and turning.
    c.position.set(0.02, lerp(3.4, 2.9, k), 0.05); c.up.set(Math.sin(lerp(0, 0.12, k)), 0, -Math.cos(lerp(0, 0.12, k))); c.lookAt(0, WATER_Y, 0.05);
    return LOOK({ dof: { focus: 3.1, aperture: 0.001, maxblur: 0.005 } });
  } };
}
// S11 33.2-37.9: "...your arms stop listening": close on the arms at the surface, slowing; colder grade.
function s11({ makeStage }) {
  const scene = makeStage(STAGE({ sun: 2.2 })); const L = lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(30);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n); at(n, 0, SUNK + 0.12, 0, 0);
    const slow = smooth(range(t, 0.8, 4.2));
    n.pose({ ...tread(t * lerp(1, 0.25, slow), lerp(1.4, 0.2, slow)), brows: lerp(0.2, 0.7, slow), jaw: 0.15, head: [0.15, -0.1, 0] }, t);
    L.wt.offset.set(t * 0.01, t * 0.004);
    const k = easeInOut(range(t, 0, 4.7));
    place(c, [lerp(0.8, 0.65, k), 0.42, lerp(0.85, 0.75, k)], [0.05, 0.2, 0.2], -0.06);
    return LOOK({ grade: { sat: lerp(1.0, 0.72, slow), con: 1.05, vig: 0.3 }, exposure: lerp(1, 0.92, slow), dof: { focus: 0.95, aperture: 0.0024, maxblur: 0.009 } });
  } };
}
// S12 37.9-42.3: blood pulls back to protect the heart: a red glow shrinks from wide to the chest.
function s12({ makeStage }) {
  const scene = makeStage(STAGE({ sun: 2.2 })); const L = lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const rip = chestRipple(n);
  const c = camera(32);
  return { scene, camera: c, update(t) {
    scene.add(n.object); at(n, 0, SUNK + 0.2, 0, -0.15);
    n.pose({ ...tread(t, 0.3), brows: 0.3, jaw: 0.1, head: [0.1, 0, 0] }, t);
    const pull = easeInOut(range(t, 0.5, 3.6));
    rip(t, 0.9, lerp(0.16, 0.03, pull), lerp(0.02, 0.07, pull));
    L.wt.offset.set(t * 0.01, t * 0.004);
    const k = easeInOut(range(t, 0, 4.4));
    place(c, [lerp(0.2, 0.05, k), lerp(0.75, 0.68, k), lerp(1.55, 1.25, k)], [0, 0.5, 0]);
    return LOOK({ bloom: 0.6, grade: { sat: 0.85, con: 1.06, vig: 0.32 }, dof: { focus: 1.4, aperture: 0.002, maxblur: 0.008 } });
  } };
}
// S13 42.3-46.8: "about an hour": a crane up and away while the light goes from day to dusk.
function s13({ makeStage }) {
  const scene = makeStage(STAGE({ sky: DUSK_SKY, sunDir: [-8, 2.5, -4], sunColor: 0xffb070, sun: 2.0, hemi: 0.55, fog: [14, 80] })); lake(scene);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n); at(n, 0, SUNK + 0.15, 0, 0);
    n.pose({ ...tread(t, 0.15), blink: 0.4, head: [0.25, 0, 0] }, t);
    const k = easeInOut(range(t, 0, 4.5));
    place(c, [lerp(2.0, 6.5, k), lerp(1.4, 7.5, k), lerp(2.6, 8.0, k)], [0, 0, 0]);
    return LOOK({ bloom: 0.45, grade: { sat: 1.1, con: 1.06, vig: 0.35 }, exposure: lerp(1.0, 0.85, k) });
  } };
}
// S14 46.8-50.8: Carla, close, calm and direct: "don't panic in that first minute".
function s14({ makeStage }) {
  const scene = makeStage(STAGE({ sunDir: [-7, 6, 6] })); lake(scene);
  const p = cast.carla; scene.add(at(p, -2.2, 0, 1.0, 0.2).object);
  const c = camera(28);
  return { scene, camera: c, update(t) {
    scene.add(p.object);
    const finger = smooth(range(t, 2.2, 2.6)) * (1 - smooth(range(t, 3.4, 3.8)));
    pose(p, 'talk', t, { talk: 0.9, mix: ['point', finger * 0.6], seed: 5 });
    const k = easeInOut(range(t, 0, 4.0));
    place(c, [lerp(-1.95, -2.05, k), 1.58, lerp(2.4, 2.05, k)], [-2.2, 1.55, 1.0]);
    return LOOK({ dof: { focus: c.position.distanceTo(V(-2.2, 1.55, 1.0)), aperture: 0.0022, maxblur: 0.01 } });
  } };
}
// S15 50.8-53.0: "kick your legs": he reaches over the edge, legs kicking behind him, low angle.
function s15({ makeStage }) {
  const scene = makeStage(STAGE()); const L = lake(scene); const ring = rings(scene, 0, -0.4);
  const n = cast.nathan; scene.add(n.object);
  const c = camera(32);
  return { scene, camera: c, update(t) {
    scene.add(n.object); only(n);
    // Leaning forward over the ice edge (towards +z), half out of the water.
    n.object.position.set(0, WATER_Y - 0.6 + easeOut(range(t, 0, 2)) * 0.22, HOLE - 0.85);
    n.object.rotation.set(1.05, 0, 0);
    const kick = Math.sin(t * 11);
    n.pose({ armL: { upper: [0.35, 0.1, 1], lower: [0.15, 0.05, 1] }, armR: { upper: [-0.35, 0.1, 1], lower: [-0.15, 0.05, 1] }, legL: { upper: [0, -1, -0.25 * kick], lower: [0, -1, -0.3 * kick - 0.2] }, legR: { upper: [0, -1, 0.25 * kick], lower: [0, -1, 0.3 * kick - 0.2] }, head: [-0.35, 0, 0], brows: 0.5, jaw: 0.3 }, t);
    ring(t % 1.2); L.wt.offset.set(t * 0.02, t * 0.01);
    const s = shake(t, 1.2, 9);
    place(c, [1.25 + s[0], 0.75 + s[1], HOLE + 2.5], [0, 0.1, HOLE - 0.45], 0.04);
    return LOOK({ dof: { focus: 2.3, aperture: 0.0014, maxblur: 0.006 } });
  } };
}
// S16 53.0-55.2: "roll out flat across the ice": he rolls away from the hole, low tracking shot.
function s16({ makeStage }) {
  const scene = makeStage(STAGE()); lake(scene);
  const n = cast.nathan;
  const roller = new THREE.Group(); scene.add(roller);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    roller.add(n.object); only(n);
    const k = range(t, 0, 2.2);
    roller.position.set(lerp(1.1, 3.2, easeOut(k)), 0.13, 0.2);
    roller.rotation.set(0, 0, -easeOut(k) * Math.PI * 1.6);  // rolling about the body's long axis
    n.object.position.set(0, 0, -0.9); n.object.rotation.set(Math.PI / 2, 0, 0); // lying along z
    n.pose({ armL: { upper: [0.15, 1, 0.1], lower: [0.1, 1, 0.1] }, armR: { upper: [-0.15, 1, 0.1], lower: [-0.1, 1, 0.1] }, legL: { upper: [0.05, -1, 0], lower: [0.05, -1, 0] }, legR: { upper: [-0.05, -1, 0], lower: [-0.05, -1, 0] }, blink: 0.6 }, t, { blinks: false });
    place(c, [lerp(1.6, 3.0, easeOut(k)), 0.55, 2.4], [lerp(1.9, 3.1, easeOut(k)), 0.15, -0.2], 0.03);
    return LOOK({ dof: { focus: 2.5, aperture: 0.0012, maxblur: 0.006 } });
  } };
}
// S17 55.2-60.0: payoff: he stands safe on the ice, Carla beside him; the camera pulls back wide.
function s17({ makeStage }) {
  const scene = makeStage(STAGE({ sunDir: [-7, 4, 6], sunColor: 0xffe2c0 })); lake(scene);
  const n = cast.nathan, p = cast.carla;
  scene.add(at(n, 3.4, 0, 0.3, -0.5).object, at(p, 4.3, 0, 0.9, -0.9).object);
  const c = camera(32);
  return { scene, camera: c, update(t) {
    scene.add(n.object, p.object); only(n);
    pose(n, 'stand', t, { set: { armL: { upper: [0.15, -1, 0.45], lower: [-0.85, 0.2, 0.45] }, armR: { upper: [-0.15, -1, 0.45], lower: [0.85, 0.25, 0.45] }, head: [0.12, -0.2, 0], spine: [0.08, 0, 0], brows: -0.3 }, seed: 1 });
    const pat = smooth(range(t, 1.2, 1.7));
    pose(p, 'stand', t, { set: { armR: { upper: [-0.6, -0.4, 0.4], lower: [-0.9, 0.15, 0.2] }, head: [0.05, 0.45 * pat, 0] }, seed: 4 });
    const k = easeInOut(range(t, 0, 4.8));
    place(c, [lerp(2.6, 1.2, k), lerp(1.55, 2.4, k), lerp(3.0, 6.2, k)], [3.7, lerp(1.25, 1.0, k), 0.5], 0.02);
    return LOOK({ grade: { sat: 1.08, con: 1.04, vig: 0.28 }, dof: { focus: c.position.distanceTo(V(3.7, 1.2, 0.5)), aperture: lerp(0.0014, 0.0006, k), maxblur: 0.006 } });
  } };
}

export const SHOTS = [
  [0, 2.6, s1], [2.6, 5.3, s2], [5.3, 9.4, s3], [9.4, 13.2, s4], [13.2, 15.8, s5], [15.8, 19.0, s6], [19.0, 24.6, s7],
  [24.6, 28.4, s8], [28.4, 30.6, s9], [30.6, 33.2, s10], [33.2, 37.9, s11], [37.9, 42.3, s12], [42.3, 46.8, s13],
  [46.8, 50.8, s14], [50.8, 53.0, s15], [53.0, 55.2, s16], [55.2, 60.0, s17],
].map(([start, end, build]) => ({ start, end, build }));

// ---------- captions: 1 to 3 words, white bold, timed to the voice ----------
import WORDS from './icewater-words.js';
function captions() {
  const out = []; let cur = [];
  const flush = () => { if (!cur.length) return; out.push([cur[0].s - 0.03, cur.map(w => w.w).join(' ').replace(/[.,!?;:]+$/, ''), cur[cur.length - 1].e + 0.25]); cur = []; };
  WORDS.forEach((w, i) => {
    const chars = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    if (cur.length && (cur.length >= 3 || chars > 17 || w.line !== cur[0].line || w.s - cur[cur.length - 1].e > 0.3)) flush();
    cur.push(w);
    if (/[.,!?;:]$/.test(w.w)) flush();
  });
  flush();
  // A caption ends where the next starts.
  for (let i = 0; i < out.length - 1; i++) out[i][2] = Math.min(out[i][2], out[i + 1][0]);
  return out;
}
