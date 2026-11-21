// "The Snow Fort" — a 59 s first-person story-time short in the blocky game world, played by the
// code-built blocky cast, timed to the voice (narrator: Jessica; Kai: Will; ElevenLabs).

import * as THREE from 'three';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake } from '../anim.js';
import { glowSprite } from '../props.js';
import { Avatar, LOOKS, makeWorld, roundBox, paintedMat, plainMat } from '../blocky.js';
import WORDS from './snowfort-words.js';

import { KNOTS, TOTAL } from './snowfort-time.js';
import { retime } from './retime.js';
export const DURATION = TOTAL;
export const CAPTION_STYLE = 'blocky';
const FADES0 = [[26.45, 26.7, 26.8, 27.05]];

const DAY = { top: 0x3f86d8, mid: 0x7fb6ec, horizon: 0xd4e8f8, floorC: 0xdfeaf5 };
const NIGHT = { top: 0x0c1430, mid: 0x1d2e5e, horizon: 0x4d5f96, floorC: 0x2a3550 };
const DAWN = { top: 0x5872b3, mid: 0xe49a87, horizon: 0xffc98e, floorC: 0xe8d2bf };
const STAGE = (o = {}) => ({ shadowSize: 12, sun: 3.0, sunDir: [-10, 9, 5], sunColor: 0xfff0dc, hemi: 0.8, rimLight: 1.8, rimDir: [7, 5, -6], shadowMap: 3072, fog: [35, 130], sky: DAY, ...o });
const LOOK = (o = {}) => ({ bloom: 0.2, ao: 0.85, grade: { sat: 1.1, con: 1.05, vig: 0.18 }, ...o });

// ---------- props ----------
const snowM = () => paintedMat('#f4f8fc', { spots: 900, spread: 0.04, seed: 61 });
// A fort: square walls of snow blocks with battlements and a corner tower. progress 0..1 builds
// it block by block from the bottom; size scales it.
function fort({ size = 1, seed = 1 } = {}) {
  const g = new THREE.Group(), m = snowM(), blocks = [];
  const B = 0.5 * size, W = 7, D = 5, rows = 4;
  const put = (x, y, z, s = 1) => { const o = new THREE.Mesh(roundBox(B * 0.98 * s, B * 0.98, B * 0.98 * s, 0.06 * size), m); o.position.set(x, y + B / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); blocks.push(o); };
  for (let r = 0; r < rows; r++) for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
    if (i > 0 && i < W - 1 && j > 0 && j < D - 1) continue;          // hollow inside
    if (j === D - 1 && i === 3 && r < 2) continue;                      // the gate
    put((i - (W - 1) / 2) * B, r * B, (j - (D - 1) / 2) * B);
  }
  for (let i = 0; i < W; i += 2) { put((i - (W - 1) / 2) * B, rows * B, -(D - 1) / 2 * B); put((i - (W - 1) / 2) * B, rows * B, (D - 1) / 2 * B); }
  for (let r = rows; r < rows + 3; r++) put(((W - 1) / 2) * B, r * B, -((D - 1) / 2) * B);  // tower
  blocks.forEach(b => { b.userData.y = b.position.y; });
  g.userData.top = (rows + 3) * B; g.userData.wall = rows * B; g.userData.B = B; g.userData.front = (D - 1) / 2 * B;
  g.userData.tower = new THREE.Vector3(((W - 1) / 2) * B, (rows + 3) * B, -((D - 1) / 2) * B);
  g.build = (k) => blocks.forEach((b, i) => { const a = clamp((k * blocks.length - i) / 3); b.visible = a > 0; b.position.y = b.userData.y + (1 - easeOut(a)) * 0.6 * size; b.scale.setScalar(0.6 + 0.4 * easeOut(a)); });
  g.build(1);
  return g;
}
function flag(color = '#e5483b') {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(roundBox(0.06, 1.6, 0.06, 0.02), plainMat('#5b4636')); pole.position.y = 0.8; g.add(pole);
  const cloth = new THREE.Mesh(roundBox(0.7, 0.42, 0.04, 0.02), plainMat(color, { roughness: 0.6 })); cloth.position.set(0.36, 1.35, 0); g.add(cloth);
  const star = new THREE.Mesh(roundBox(0.16, 0.16, 0.05, 0.03), plainMat('#ffe14d')); star.position.set(0.36, 1.35, 0.02); g.add(star);
  g.wave = (t) => { cloth.rotation.y = Math.sin(t * 6) * 0.25; cloth.scale.x = 1 - Math.abs(Math.sin(t * 6)) * 0.08; };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function pile() {
  const g = new THREE.Group(), m = snowM();
  const r = (s => () => ((s = (s * 16807) % 2147483647) / 2147483647))(9);
  for (let k = 0; k < 26; k++) { const s = 0.6 + r() * 0.9, o = new THREE.Mesh(roundBox(s, s * 0.6, s, 0.15), m); const a = r() * Math.PI * 2, d = r() * 1.8; o.position.set(Math.cos(a) * d, s * 0.3 + (1.8 - d) * 0.35 * r(), Math.sin(a) * d); o.rotation.y = r() * 3; o.castShadow = o.receiveShadow = true; g.add(o); }
  return g;
}
function shovel() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(roundBox(0.06, 1.1, 0.06, 0.02), plainMat('#8a5a33')); stick.position.y = -0.4; g.add(stick);
  const blade = new THREE.Mesh(roundBox(0.34, 0.36, 0.05, 0.03), plainMat('#9aa3ad', { roughness: 0.35, metalness: 0.4 })); blade.position.y = -1.0; g.add(blade);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function plow() {
  const g = new THREE.Group();
  const yellow = plainMat('#f2b41b', { roughness: 0.45 }), dark = plainMat('#2b2f35'), glass = plainMat('#9fd3f5', { roughness: 0.1, metalness: 0.2 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(roundBox(2.4, 1.2, 4.2, 0.12), yellow, 0, 1.2, 0);
  add(roundBox(2.2, 1.2, 1.6, 0.12), yellow, 0, 2.3, -0.6);
  add(roundBox(2.0, 0.7, 0.1, 0.05), glass, 0, 2.4, 0.22);
  for (const x of [-1.1, 1.1]) for (const z of [-1.3, 1.3]) { const w = add(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 20), dark, x, 0.55, z); w.rotation.z = Math.PI / 2; }
  const blade = add(roundBox(3.6, 1.2, 0.25, 0.08), plainMat('#c9ced4', { roughness: 0.3, metalness: 0.5 }), 0, 0.6, 2.6); blade.rotation.y = 0.25;
  for (const x of [-0.8, 0.8]) { const l = glowSprite(0xfff0b0, 0.9); l.position.set(x, 1.3, 2.12); g.add(l); }
  const beacon = glowSprite(0xff9a2a, 0.8); beacon.position.set(0, 3.05, -0.6); g.add(beacon); g.beacon = beacon;
  return g;
}

// ---------- cast ----------
const me = () => new Avatar(LOOKS[2]), maya = () => new Avatar(LOOKS[5]), kai = () => new Avatar(LOOKS[3]);
const camera = (fov = 36) => { const c = cam(fov); c.aspect = 9 / 16; c.near = 0.05; c.far = 500; return c; };
const at = (a, x, z, ry = 0, y = 0) => { a.object.position.set(x, y, z); a.object.rotation.set(0, ry, 0); return a.object; };
const wp = (f, x, y, z) => { f.updateMatrixWorld(true); return f.localToWorld(new THREE.Vector3(x, y, z)); };
const KAI_FORT = new THREE.Vector3(7, 0, -6), OUR_FORT = new THREE.Vector3(-6.5, 0, -3);

// ---------- shots ----------
// S1 0-4.6: the street; Kai on top of his huge fort waving his flag; we watch from the front.
function s1({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.4 }); f.position.copy(KAI_FORT); f.rotation.y = -0.4; scene.add(f);
  const k = kai(), a = me(), b = maya(), fl = flag('#2f6fd6');
  scene.add(k.object, a.object, b.object, fl);
  const u = f.userData, top = wp(f, 0, u.wall, u.front);
  at(k, top.x, top.z, -0.4, top.y); fl.position.copy(wp(f, 2 * u.B, u.wall, u.front));
  at(a, 1.6, 3.2, 0); at(b, 2.6, 3.5, 0); a.object.lookAt(top.x, 0, top.z); b.object.lookAt(top.x, 0, top.z);
  const c = camera(38);
  return { scene, camera: c, update(t) {
    k.pose('wave', t); a.pose('stand', t); b.pose('stand', t + 1); fl.wave(t);
    const q = easeInOut(range(t, 0, 4.6));
    place(c, [lerp(-0.4, 0.4, q), lerp(1.5, 1.8, q), lerp(11.5, 10.3, q)], [lerp(4.6, 5.0, q), 2.5, -3.0], 0.02);
    return LOOK();
  } };
}
// S2 4.6-8.9: at Kai's gate: he blocks it, arms folded, shaking his head; we droop.
function s2({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.4 }); f.position.copy(KAI_FORT); f.rotation.y = -0.4; scene.add(f);
  const k = kai(), a = me(), b = maya();
  const fr = f.userData.front; f.add(at(k, 0, fr + 0.5, 0), at(a, -1.05, fr + 3.0, Math.PI - 0.2), at(b, 1.0, fr + 3.3, Math.PI + 0.25));
  const C0 = wp(f, 0.15, 1.9, fr + 7.6), C1 = wp(f, -0.05, 1.8, fr + 6.8), T = wp(f, 0, 1.25, fr + 0.8);
  const c = camera(36);
  return { scene, camera: c, update(t) {
    k.pose('angry', t, { face: Math.sin(t * 3) > 0.6 ? 'smug' : 'angry' });
    k.neck.rotation.y = Math.sin(t * 6) * 0.25 * range(t, 1.0, 1.4) * (1 - range(t, 2.6, 3.0));
    k.armL.rotation.set(-1.2, 0, -1.0); k.armR.rotation.set(-1.2, 0, 1.0);
    a.pose(t > 2.4 ? 'sad' : 'stand', t); b.pose(t > 2.8 ? 'sad' : 'stand', t + 0.5);
    const q = easeInOut(range(t, 0, 4.3));
    place(c, [lerp(C0.x, C1.x, q), lerp(C0.y, C1.y, q), lerp(C0.z, C1.z, q)], [T.x, T.y, T.z], -0.02);
    return LOOK();
  } };
}
// S3 8.9-12.9: me and Maya, close, plotting.
function s3({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 12));
  const a = me(), b = maya(); scene.add(at(a, -0.42, 0, 0.4), at(b, 0.46, -0.2, -0.45));
  const c = camera(30);
  return { scene, camera: c, update(t) {
    a.pose('talk', t, { talking: t > 0.2 && t < 3.6 }); b.pose(t < 2.2 ? 'think' : 'talk', t + 0.3, { face: t > 2.2 ? 'grin' : null });
    const q = easeInOut(range(t, 0, 4.0));
    place(c, [lerp(0.35, 0.15, q), 1.5, lerp(5.6, 4.9, q)], [0, 1.22, 0]);
    return LOOK({ dof: { focus: 5.1, aperture: 0.0012, maxblur: 0.006 } });
  } };
}
// S4 12.9-17.0: the daydream: a gigantic fort, and Kai at its foot, begging to come in.
function s4({ makeStage }) {
  const scene = makeStage(STAGE({ sunColor: 0xffe6f0 })); scene.add(makeWorld('snow', 13));
  const f = fort({ size: 3.2 }); f.position.set(0, 0, -9); scene.add(f);
  const k = kai(), fl = flag('#e5483b'); fl.scale.setScalar(2.6);
  fl.position.copy(wp(f, f.userData.tower.x, f.userData.tower.y, f.userData.tower.z)); scene.add(fl);
  scene.add(at(k, 0.3, -0.6, 0));
  const c = camera(40);
  return { scene, camera: c, update(t) {
    k.pose('think', t, { face: 'worried' }); k.object.rotation.y = 0.25 + Math.sin(t * 2) * 0.08;
    k.armL.rotation.set(-2.4, 0, -0.3); k.armR.rotation.set(-2.4, 0, 0.3); // hands together, pleading
    fl.wave(t);
    const q = easeInOut(range(t, 0, 4.1));
    place(c, [lerp(1.3, 0.9, q), lerp(0.55, 0.45, q), lerp(4.6, 4.0, q)], [0, lerp(2.6, 3.4, q), -9], 0.03);
    return LOOK({ bloom: 0.4, grade: { sat: 1.2, con: 1.04, vig: 0.4 } });
  } };
}
// S5 17.0-23.1: three days of building: the fort rises block by block; we carry blocks; the flag goes up.
function s5({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.3 }); f.position.copy(OUR_FORT); f.rotation.y = 0.35; scene.add(f);
  const a = me(), b = maya(), fl = flag('#e5483b'); scene.add(a.object, b.object, fl); fl.visible = false;
  const blkA = new THREE.Mesh(roundBox(0.45, 0.45, 0.45, 0.06), snowM()), blkB = blkA.clone();
  a.armL.add(blkA); b.armR.add(blkB); blkA.position.set(-0.3, -0.55, 0.32); blkB.position.set(0.3, -0.55, 0.32);
  const c = camera(38);
  return { scene, camera: c, update(t) {
    const k = smooth(range(t, 0.2, 5.0));
    f.build(k);
    const lap = (t * 0.45) % 1;
    at(a, OUR_FORT.x + 3.0 - lap * 2.4, OUR_FORT.z + 4.2, -1.6); a.pose('walk', t); a.armL.rotation.x = -1.2; a.armR.rotation.x = -1.2;
    at(b, OUR_FORT.x - 2.4 + ((t * 0.38 + 0.5) % 1) * 2.2, OUR_FORT.z + 5.0, 1.6); b.pose('walk', t + 0.3); b.armL.rotation.x = -1.2; b.armR.rotation.x = -1.2;
    fl.visible = t > 5.0; fl.position.copy(wp(f, f.userData.tower.x, f.userData.tower.y, f.userData.tower.z)); fl.scale.setScalar(easeOut(range(t, 5.0, 5.4)) * 1.3 + 0.001); fl.wave(t);
    const q = easeInOut(range(t, 0, 6.1));
    place(c, [OUR_FORT.x + lerp(6.5, 4.5, q), lerp(4.6, 3.8, q), OUR_FORT.z + lerp(15.5, 13.5, q)], [OUR_FORT.x + 0.4, 1.5, OUR_FORT.z + 1.2], -0.02);
    return LOOK();
  } };
}
// S6 23.1-26.8: the last night: the fort glows under the lamps; we cheer on top.
function s6({ makeStage }) {
  const scene = makeStage(STAGE({ sky: NIGHT, sun: 0.8, sunColor: 0x9fb4ff, hemi: 0.35, rimLight: 1.2, fog: [25, 110] })); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.3 }); f.position.copy(OUR_FORT); f.rotation.y = 0.35; scene.add(f);
  const a = me(), b = maya(), fl = flag('#e5483b'); scene.add(a.object, b.object, fl); fl.scale.setScalar(1.3);
  fl.position.copy(wp(f, f.userData.tower.x, f.userData.tower.y, f.userData.tower.z));
  const u = f.userData; f.add(at(a, -2 * u.B, u.front, 0.15, u.wall), at(b, 2 * u.B, u.front, -0.15, u.wall));
  scene.environmentIntensity = 0.18;
  const lamp = new THREE.PointLight(0xffc77a, 30, 14, 2); lamp.position.copy(wp(f, 2.2, 3.4, 4.5)); scene.add(lamp);
  const c = camera(36);
  return { scene, camera: c, update(t) {
    a.pose('cheer', t); b.pose('cheer', t + 0.2); fl.wave(t);
    const q = easeInOut(range(t, 0, 3.7));
    const P = wp(f, lerp(0.4, 0.0, q), lerp(2.0, 2.5, q), lerp(14.0, 12.4, q)), T = wp(f, 0, 2.9, 0);
    place(c, [P.x, P.y, P.z], [T.x, T.y, T.z], 0.02);
    return LOOK({ bloom: 0.6, exposure: 0.95, grade: { sat: 1.05, con: 1.08, vig: 0.35 } });
  } };
}
// S7 26.9-31.7: the next morning: a flat pile where the fort stood; we stare.
function s7({ makeStage }) {
  const scene = makeStage(STAGE({ sky: DAY })); scene.add(makeWorld('snow', 11));
  const p = pile(); p.position.copy(OUR_FORT); scene.add(p);
  const a = me(), b = maya(); scene.add(at(a, OUR_FORT.x + 0.9, OUR_FORT.z + 4.0, Math.PI + 0.1), at(b, OUR_FORT.x + 2.0, OUR_FORT.z + 4.3, Math.PI - 0.15));
  const c = camera(36);
  return { scene, camera: c, update(t) {
    a.pose(t > 0.9 ? 'surprised' : 'stand', t); b.pose(t > 1.2 ? 'scared' : 'stand', t);
    const q = easeOut(range(t, 0.8, 2.0)), s = shake(t, 1 + 2 * Math.exp(-(t - 0.9) * 2) * (t > 0.9 ? 1 : 0), 3);
    place(c, [OUR_FORT.x + 1.9 + s[0], lerp(3.3, 2.9, q) + s[1], OUR_FORT.z + lerp(9.6, 8.6, q)], [OUR_FORT.x + 0.7, 0.7, OUR_FORT.z + 0.6]);
    return LOOK();
  } };
}
// S8 31.7-36.4: the reveal: tilt up the pile to Kai sitting on top with a shovel.
function s8({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const p = pile(); p.position.copy(OUR_FORT); scene.add(p);
  const k = kai(), sh = shovel(); scene.add(k.object); k.armR.add(sh); sh.position.set(0, -1.6 * 0.32, 0.25); sh.rotation.x = -0.4;
  at(k, OUR_FORT.x, OUR_FORT.z + 0.3, 0.2, 1.05);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    k.pose('sit', t, { face: t > 2.4 ? 'smug' : 'blink' }); k.armR.rotation.x = -0.9;
    const q = easeInOut(range(t, 0.2, 2.6));
    place(c, [OUR_FORT.x + 0.9, lerp(0.7, 2.0, q), OUR_FORT.z + lerp(5.6, 4.9, q)], [OUR_FORT.x, lerp(0.7, 1.75, q), OUR_FORT.z]);
    return LOOK();
  } };
}
// S9 36.4-40.0: Maya, furious, can't speak.
function s9({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 14));
  const b = maya(); scene.add(at(b, 0, 0, 0.1));
  const c = camera(30);
  return { scene, camera: c, update(t) {
    b.pose('angry', t, { face: 'angry' });
    b.object.position.y = Math.max(0, Math.sin(t * 22)) * 0.02 * range(t, 0.6, 1.0); // shaking with rage
    const q = easeOut(range(t, 0, 0.6)), s = shake(t, 1.5, 6);
    place(c, [0.1 + s[0], 1.45 + s[1], lerp(2.6, 1.9, q)], [0, 1.35, 0]);
    return LOOK({ dof: { focus: 1.9, aperture: 0.0015, maxblur: 0.006 } });
  } };
}
// S10 40.0-43.4: Kai stands up on the pile and turns to us.
function s10({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const p = pile(); p.position.copy(OUR_FORT); scene.add(p);
  const k = kai(), sh = shovel(); scene.add(k.object); k.armR.add(sh); sh.position.set(0, -1.6 * 0.32, 0.2);
  const c = camera(34);
  return { scene, camera: c, update(t) {
    const up = easeInOut(range(t, 0.3, 1.2));
    at(k, OUR_FORT.x, OUR_FORT.z + 0.3, 0.2, 1.05);
    k.pose(up < 0.5 ? 'sit' : 'stand', t, { face: 'worried' });
    const q = easeInOut(range(t, 0, 3.4));
    place(c, [OUR_FORT.x + lerp(2.2, 1.8, q), 2.0, OUR_FORT.z + lerp(4.8, 4.2, q)], [OUR_FORT.x, 1.9, OUR_FORT.z], -0.03);
    return LOOK();
  } };
}
// S11 43.4-45.6: Kai, close: "I didn't wreck it."
function s11({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 15));
  const k = kai(); scene.add(at(k, 0, 0, -0.1));
  const c = camera(30);
  return { scene, camera: c, update(t) {
    k.pose('talk', t, { talking: true, face: null });
    const q = easeInOut(range(t, 0, 2.2));
    place(c, [-0.25, 1.48, lerp(2.0, 1.75, q)], [0, 1.38, 0]);
    return LOOK({ dof: { focus: 1.85, aperture: 0.0016, maxblur: 0.006 } });
  } };
}
// S12 45.6-47.8: flashback: the snowplow drives through our fort, Kai chasing it, arms waving.
function s12({ makeStage }) {
  const scene = makeStage(STAGE({ sky: DAWN, sunDir: [10, 4, -6], sunColor: 0xffc58f, sun: 2.4, hemi: 0.6 })); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.3 }); f.position.copy(OUR_FORT); f.rotation.y = 0.35; scene.add(f);
  const pl = plow(); scene.add(pl); const k = kai(); scene.add(k.object);
  const c = camera(40);
  return { scene, camera: c, update(t) {
    const x = lerp(OUR_FORT.x + 9, OUR_FORT.x - 9, range(t, 0, 2.2));
    pl.position.set(x, 0, OUR_FORT.z + 0.5); pl.rotation.y = -Math.PI / 2;
    f.build(x > OUR_FORT.x + 2.6 ? 1 : 1 - range(x, OUR_FORT.x + 2.6, OUR_FORT.x - 2.6)); // blocks swept away
    pl.beacon.material.opacity = 0.5 + 0.5 * Math.sin(t * 14);
    at(k, x + 4.2, OUR_FORT.z + 3.0, -Math.PI / 2); k.pose('run', t, { face: 'scared' }); k.armL.rotation.set(Math.PI, 0, 0.4 + Math.sin(t * 12) * 0.3); k.armR.rotation.set(Math.PI, 0, -0.4 - Math.sin(t * 12) * 0.3);
    const s = shake(t, 2.5, 8);
    place(c, [OUR_FORT.x + 1.5 + s[0], 2.4 + s[1], OUR_FORT.z + 16.0], [(x + 1.8) * 0.45 + OUR_FORT.x * 0.55, 1.5, OUR_FORT.z]);
    return LOOK({ grade: { sat: 0.75, con: 1.1, vig: 0.45 }, bloom: 0.5 }); // a faded, remembered look
  } };
}
// S13 47.8-52.4: dawn: Kai alone, digging, tired.
function s13({ makeStage }) {
  const scene = makeStage(STAGE({ sky: DAWN, sunDir: [10, 3, -4], sunColor: 0xffb880, sun: 2.4, hemi: 0.55, rimLight: 2.4 })); scene.add(makeWorld('snow', 11));
  const p = pile(); p.position.copy(OUR_FORT); scene.add(p);
  const k = kai(), sh = shovel(); scene.add(k.object); k.armR.add(sh); sh.position.set(0, -1.6 * 0.32, 0.25);
  at(k, OUR_FORT.x + 2.2, OUR_FORT.z + 1.2, -1.2);
  const c = camera(36);
  return { scene, camera: c, update(t) {
    const dig = Math.sin(t * 3.2);
    k.pose('stand', t, { face: 'sad' }); k.torso.rotation.x = 0.35 + dig * 0.12; k.armR.rotation.set(-0.9 + dig * 0.5, 0, -0.2); k.armL.rotation.set(-1.0 + dig * 0.4, 0, 0.3);
    const q = easeInOut(range(t, 0, 4.6));
    place(c, [OUR_FORT.x + lerp(7.6, 6.8, q), 1.7, OUR_FORT.z + lerp(6.8, 5.8, q)], [OUR_FORT.x + 1.6, 1.0, OUR_FORT.z + 0.9], 0.02);
    return LOOK({ bloom: 0.45 });
  } };
}
// S14 52.4-59.0: the three of us build a giant fort together; Kai plants the flag; everyone cheers.
function s14({ makeStage }) {
  const scene = makeStage(STAGE()); scene.add(makeWorld('snow', 11));
  const f = fort({ size: 1.7 }); f.position.copy(OUR_FORT); f.rotation.y = 0.35; scene.add(f);
  const a = me(), b = maya(), k = kai(), fl = flag('#2f6fd6'); scene.add(a.object, b.object, k.object, fl);
  const tower = wp(f, f.userData.tower.x, f.userData.tower.y, f.userData.tower.z);
  const c = camera(38);
  return { scene, camera: c, update(t) {
    f.build(smooth(range(t, 0, 2.6)));
    const u = f.userData;
    if (!a.object.parent || a.object.parent === scene) f.add(a.object, b.object);
    at(a, -1.3, u.front + 2.6, 0.1); at(b, 1.2, u.front + 2.9, -0.1);
    at(k, tower.x, tower.z, 0.35, tower.y);
    k.object.visible = fl.visible = t > 2.5; // up on the tower once it is built
    const planted = t > 3.4;
    fl.position.set(tower.x + 0.3, tower.y + (planted ? 0 : 0.6 - easeIn(range(t, 2.8, 3.4)) * 0.6), tower.z); fl.scale.setScalar(1.5); fl.wave(t);
    k.pose(planted ? 'cheer' : 'point', t, { face: 'grin' });
    a.pose(t > 3.5 ? 'cheer' : 'walk', t); b.pose(t > 3.6 ? 'cheer' : 'walk', t + 0.4);
    const q = easeInOut(range(t, 0, 6.6));
    const P = wp(f, lerp(1.0, 2.2, q), lerp(2.0, 4.4, q), lerp(11.5, 16.0, q)), T = wp(f, 0.4, lerp(3.0, 3.3, q), 0);
    place(c, [P.x, P.y, P.z], [T.x, T.y, T.z], 0.02);
    return LOOK({ bloom: 0.3 });
  } };
}

const SHOTS0 = [
  [0, 4.6, s1], [4.6, 8.9, s2], [8.9, 12.9, s3], [12.9, 17.0, s4], [17.0, 23.1, s5], [23.1, 26.8, s6], [26.8, 31.7, s7],
  [31.7, 36.4, s8], [36.4, 40.0, s9], [40.0, 43.4, s10], [43.4, 45.6, s11], [45.6, 47.8, s12], [47.8, 52.4, s13], [52.4, 59.0, s14],
].map(([start, end, build]) => ({ start, end, build }));
export const { SHOTS, FADES } = retime(SHOTS0, FADES0, KNOTS);

// ---------- captions: 3-4 words, one key word in capitals (the Blocky rule) ----------
const SMALL = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'it', 'is', 'was', 'he', 'she', 'we', 'i', 'my', 'our', 'so', 'his', 'her', 'that', 'this', 'with', 'for', 'be', 'would', "we'd", "he'd", "won't", 'even', 'just', 'one', 'out', 'there', 'since']);
function captions() {
  const groups = []; let cur = [];
  const flush = () => { if (cur.length) groups.push(cur); cur = []; };
  WORDS.forEach((w) => {
    if (cur.length && (cur.length >= 4 || w.line !== cur[0].line || w.s - cur[cur.length - 1].e > 0.35)) flush();
    cur.push(w);
    if (/[.,!?;:"]$/.test(w.w) && cur.length >= 3) flush();
  });
  flush();
  // Fold a one- or two-word tail into the group before it (same line), so captions stay 3-4 words.
  for (let i = groups.length - 1; i > 0; i--) if (groups[i].length < 3 && groups[i][0].line === groups[i - 1][0].line && groups[i - 1].length + groups[i].length <= 4) { groups[i - 1].push(...groups[i]); groups.splice(i, 1); }
  return groups.map((g, i) => {
    const clean = (w) => w.replace(/^["']|[.,!?;:"]+$/g, '');
    const words = g.map(w => clean(w.w));
    let key = -1, best = 0;
    words.forEach((w, j) => { const l = w.replace(/[^a-z]/gi, '').length; if (!SMALL.has(w.toLowerCase()) && l > best) { best = l; key = j; } });
    const text = words.map((w, j) => (j === key ? `*${w}*` : w)).join(' ');
    const end = i + 1 < groups.length ? Math.min(groups[i + 1][0].s - 0.03, g[g.length - 1].e + 0.35) : g[g.length - 1].e + 0.5;
    return [g[0].s - 0.03, text, end];
  });
}
export async function prepare() { return { SHOTS, CAPTIONS: captions(), FADES, DURATION, CAPTION_STYLE }; }
