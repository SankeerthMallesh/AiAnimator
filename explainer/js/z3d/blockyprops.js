// Props for the blocky world, built from rounded blocks: a snow fort that can build itself block by
// block, a flag, a snow pile, a shovel and a plow. Made for "The Snow Fort" film, shared with the
// Blocky tab's shot library (autoblocky.js).
import * as THREE from 'three';
import { clamp, easeOut } from './anim.js';
import { glowSprite } from './props.js';
import { roundBox, paintedMat, plainMat } from './blocky.js';

export const snowM = () => paintedMat('#f4f8fc', { spots: 900, spread: 0.04, seed: 61 });
// A fort: square walls of snow blocks with battlements and a corner tower. progress 0..1 builds
// it block by block from the bottom; size scales it.
export function fort({ size = 1, seed = 1 } = {}) {
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
export function flag(color = '#e5483b') {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(roundBox(0.06, 1.6, 0.06, 0.02), plainMat('#5b4636')); pole.position.y = 0.8; g.add(pole);
  const cloth = new THREE.Mesh(roundBox(0.7, 0.42, 0.04, 0.02), plainMat(color, { roughness: 0.6 })); cloth.position.set(0.36, 1.35, 0); g.add(cloth);
  const star = new THREE.Mesh(roundBox(0.16, 0.16, 0.05, 0.03), plainMat('#ffe14d')); star.position.set(0.36, 1.35, 0.02); g.add(star);
  g.wave = (t) => { cloth.rotation.y = Math.sin(t * 6) * 0.25; cloth.scale.x = 1 - Math.abs(Math.sin(t * 6)) * 0.08; };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function pile() {
  const g = new THREE.Group(), m = snowM();
  const r = (s => () => ((s = (s * 16807) % 2147483647) / 2147483647))(9);
  for (let k = 0; k < 26; k++) { const s = 0.6 + r() * 0.9, o = new THREE.Mesh(roundBox(s, s * 0.6, s, 0.15), m); const a = r() * Math.PI * 2, d = r() * 1.8; o.position.set(Math.cos(a) * d, s * 0.3 + (1.8 - d) * 0.35 * r(), Math.sin(a) * d); o.rotation.y = r() * 3; o.castShadow = o.receiveShadow = true; g.add(o); }
  return g;
}
export function shovel() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(roundBox(0.06, 1.1, 0.06, 0.02), plainMat('#8a5a33')); stick.position.y = -0.4; g.add(stick);
  const blade = new THREE.Mesh(roundBox(0.34, 0.36, 0.05, 0.03), plainMat('#9aa3ad', { roughness: 0.35, metalness: 0.4 })); blade.position.y = -1.0; g.add(blade);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function plow() {
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

