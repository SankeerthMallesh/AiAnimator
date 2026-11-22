// Realistic people for the 3D engine: rigged, scanned humans (glTF) posed in code.
//
// The cast are Renderpeople's free models on Sketchfab (CC-BY 4.0; credits in CAST and on the
// credits page). They share one skeleton (89 bones: spine, arms, fingers, legs, jaw, eyes, eyelids,
// eyebrows), so every pose works on every person. Bones point along their local +X; units are cm.
//
// A pose is plain data (see POSES): directions for arms and legs in the person's own frame
// (x = their left, y = up, z = forward, toward the camera when they face it), turns for the spine,
// neck and head, and face values (jaw 0..1, blink 0..1, brows -1..1). Poses blend with mix().

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CAST = {
  eric: { file: 'eric.glb', name: 'Eric', sex: 'm', height: 1.8, look: 'man, 30s, short dark hair, white shirt, black waistcoat and tie', credit: '"Eric Rigged 001" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/a46bc9f67aaa415bb4f3241eef900e7f' },
  carla: { file: 'carla.glb', name: 'Carla', sex: 'f', height: 1.68, look: 'woman, 30s, business clothes', credit: '"Carla Rigged 001" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/acf520f450d14dd799f98a6fede3edf5' },
  claudia: { file: 'claudia.glb', name: 'Claudia', sex: 'f', height: 1.68, look: 'woman, 30s, business clothes', credit: '"Claudia Rigged 002" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/c659bd0accab47c6bbe390cf822a2b92' },
  nathan: { file: 'nathan.glb', name: 'Nathan', sex: 'm', height: 1.8, look: 'man, casual clothes', credit: '"Nathan Animated 003" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/143a2b1ea5eb4385ae90a73657aca3bc' },
  sophia: { file: 'sophia.glb', name: 'Sophia', sex: 'f', height: 1.68, look: 'woman, casual clothes', credit: '"Sophia Animated 003" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/dc448c3be0e74f96a55fb475a13433cf' },
  manuel: { file: 'manuel.glb', name: 'Manuel', sex: 'm', height: 1.8, look: 'man, casual clothes', credit: '"Manuel Animated 001" by Renderpeople (CC-BY 4.0)', source: 'https://sketchfab.com/3d-models/e65e0fef4e0743868c8d5bff36d61116' },
};

// Canonical bone names (the files add a prefix and a number: "rp_nathan_..._upperarm_l_024").
const CANON = /(?:^|_)(root|hip|spine_0[123]|neck|head|jaw|eye_[lr]|eyelid_[lr]|eyebrow_[lr]|mouth_[lr]|shoulder_[lr]|upperarm_[lr]|lowerarm_[lr]|hand_[lr]|(?:thumb|index|middle|ring|pinky)_0[123]_[lr]|upperleg_[lr]|lowerleg_[lr]|foot_[lr]|ball_[lr])_\d+$/;

const loader = new GLTFLoader();
const files = new Map();
let base = new URL('../../people/', import.meta.url).href; // explainer/people/
export function setPeopleBase(url) { base = url.endsWith('/') ? url : url + '/'; }

export async function loadPerson(id) {
  const c = CAST[id] || CAST.eric;
  if (!files.has(c.file)) files.set(c.file, loader.loadAsync(base + c.file));
  const gltf = await files.get(c.file);
  return new Person(gltf, c);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

export class Person {
  constructor(gltf, info) {
    this.info = info;
    const root = this.root = gltf.scene.clone(true);
    // A cloned skinned mesh needs its own skeleton pointing at the cloned bones.
    root.traverse(o => {
      if (o.isSkinnedMesh) {
        const sk = o.skeleton.clone();
        sk.bones = sk.bones.map(b => root.getObjectByName(b.name) || b);
        o.bind(sk, o.bindMatrix);
        o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      }
    });
    this.bones = {};
    root.traverse(o => { if (o.isBone) { const m = CANON.exec(o.name); if (m && !this.bones[m[1]]) this.bones[m[1]] = o; } });
    this.rest = new Map();
    for (const b of Object.values(this.bones)) this.rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() });
    // The body inside a holder: the holder is what scenes place and turn; the body is scaled so
    // the person is their real height and stands on y = 0.
    this.body = new THREE.Group(); this.body.add(root);
    this.holder = new THREE.Group(); this.holder.add(this.body);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const s = info.height / (box.max.y - box.min.y);
    this.body.scale.setScalar(s);
    this.body.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
    this.hipRest = this.bones.hip?.position.clone();
    this.holder.userData.keep = true; // shared between shots: never freed with one
    this.holder.updateMatrixWorld(true);
  }

  get object() { return this.holder; }

  // Head (eye level) in world space, for cameras and eye lines.
  // Where a hand is in the world (side 'l' or 'r'): things held are placed there every frame.
  handWorld(side = 'r', out = new THREE.Vector3()) { this.holder.updateMatrixWorld(true); const b = this.bones[`hand_${side}`] || this.bones.head || this.root; return out.setFromMatrixPosition(b.matrixWorld); }
  headWorld(out = new THREE.Vector3()) { this.holder.updateMatrixWorld(true); return out.setFromMatrixPosition((this.bones.head || this.root).matrixWorld); }

  reset() {
    for (const [b, r] of this.rest) { b.quaternion.copy(r.q); b.position.copy(r.p); }
    this.holder.updateMatrixWorld(true);
  }

  // The person's frame in world space (their facing), as a quaternion.
  frame(out = new THREE.Quaternion()) { return this.holder.getWorldQuaternion(out); }

  // Turns bone b by angle around an axis given in the person's frame.
  turn(name, axis, angle) {
    const b = this.bones[name]; if (!b || !angle) return;
    b.parent.updateMatrixWorld(true);
    const ax = tmpV.copy(axis).applyQuaternion(this.frame(tmpQ2)).normalize();
    const q = tmpQ.setFromAxisAngle(ax, angle);
    const wq = new THREE.Quaternion(); b.getWorldQuaternion(wq);
    const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq);
    b.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    b.updateMatrixWorld(true);
  }

  // Aims bone `name` so the direction to `child` points along dir (person's frame).
  aim(name, child, dir) {
    const b = this.bones[name], c = this.bones[child]; if (!b || !c || !dir) return;
    b.updateMatrixWorld(true);
    const a = tmpV.setFromMatrixPosition(b.matrixWorld), cp = tmpV2.setFromMatrixPosition(c.matrixWorld);
    const cur = cp.sub(a).normalize();
    const want = new THREE.Vector3(...dir).normalize().applyQuaternion(this.frame(tmpQ2));
    const q = new THREE.Quaternion().setFromUnitVectors(cur, want);
    const wq = new THREE.Quaternion(); b.getWorldQuaternion(wq);
    const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq);
    b.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    b.updateMatrixWorld(true);
  }

  // Curls the fingers of one hand: 0 open, 1 fist. point = true keeps the index straight.
  fingers(side, k, point = false) {
    for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) for (const j of ['01', '02', '03']) {
      const b = this.bones[`${f}_${j}_${side}`]; if (!b) continue;
      const r = this.rest.get(b).q;
      const kk = point && f === 'index' ? 0.05 : f === 'thumb' ? k * 0.5 : k;
      const a = (j === '01' ? 0.9 : j === '02' ? 1.1 : 0.8) * kk * (side === 'l' ? -1 : 1);
      b.quaternion.copy(r).multiply(tmpQ.setFromAxisAngle(f === 'thumb' ? V(0, 1, 0) : V(0, 0, 1), a));
    }
  }

  // Applies a pose (see POSES and mix()); t is the time in seconds, for idle motion and blinks.
  pose(p, t = 0, { breathe = true, blinks = true, seed = 0 } = {}) {
    this.reset();
    const b = this.bones;
    if (p.hipDrop && b.hip) b.hip.position.y -= p.hipDrop;
    if (p.hipTurn) this.turn('hip', V(0, 1, 0), p.hipTurn);
    // Spine: pitch (forward +), yaw (to their left +), roll, spread over the three spine bones.
    const breath = breathe ? Math.sin(t * 1.7 + seed) * 0.012 : 0;
    const sp = p.spine || [0, 0, 0];
    for (const s of ['spine_01', 'spine_02', 'spine_03']) {
      this.turn(s, V(1, 0, 0), (sp[0] + breath) / 3);
      this.turn(s, V(0, 1, 0), sp[1] / 3);
      this.turn(s, V(0, 0, 1), sp[2] / 3);
    }
    const hd = p.head || [0, 0, 0];
    this.turn('neck', V(1, 0, 0), hd[0] * 0.4); this.turn('neck', V(0, 1, 0), hd[1] * 0.4);
    this.turn('head', V(1, 0, 0), hd[0] * 0.6); this.turn('head', V(0, 1, 0), hd[1] * 0.6); this.turn('head', V(0, 0, 1), hd[2] || 0);
    // Shoulders up (shrug) before the arms.
    if (p.shrug) for (const s of ['l', 'r']) this.turn(`shoulder_${s}`, V(0, 0, 1), (s === 'l' ? 1 : -1) * p.shrug);
    for (const s of ['l', 'r']) {
      const arm = p[s === 'l' ? 'armL' : 'armR'];
      if (arm) {
        this.aim(`upperarm_${s}`, `lowerarm_${s}`, arm.upper);
        this.aim(`lowerarm_${s}`, `hand_${s}`, arm.lower);
      }
      this.fingers(s, arm?.fist ?? 0.25, !!arm?.point);
      const leg = p[s === 'l' ? 'legL' : 'legR'];
      if (leg) {
        this.aim(`upperleg_${s}`, `lowerleg_${s}`, leg.upper);
        this.aim(`lowerleg_${s}`, `foot_${s}`, leg.lower);
      }
    }
    // Face.
    // The scanned faces have no lip shapes, so a wide jaw drop looks like puffed cheeks: the jaw stays
    // small (talking reads from its rhythm) and surprise is carried by the eyes and brows.
    if (b.jaw) b.jaw.quaternion.copy(this.rest.get(b.jaw).q).multiply(tmpQ.setFromAxisAngle(V(0, 0, 1), 0.09 * Math.min(1, p.jaw || 0)));
    let blink = p.blink || 0;
    if (blinks) { const ph = ((t + seed * 1.7) % 3.1); if (ph < 0.14) blink = Math.max(blink, Math.sin(ph / 0.14 * Math.PI)); }
    for (const s of ['l', 'r']) {
      const e = b[`eyelid_${s}`]; if (e) e.quaternion.copy(this.rest.get(e).q).multiply(tmpQ.setFromAxisAngle(V(0, 0, 1), -0.5 * blink + 0.12 * Math.max(0, p.brows || 0)));
      const br = b[`eyebrow_${s}`]; if (br) br.position.copy(this.rest.get(br).p).add(tmpV.set(1.2 * (p.brows || 0), 0, 0));
    }
    this.holder.updateMatrixWorld(true);
  }
}

// ---------- the pose library ----------
const A = (ux, uy, uz, lx, ly, lz, extra = {}) => ({ upper: [ux, uy, uz], lower: [lx, ly, lz], ...extra });
export const POSES = {
  stand: { armL: A(0.2, -1, 0.02, 0.12, -1, 0.2), armR: A(-0.2, -1, 0.02, -0.12, -1, 0.2), head: [0, 0, 0] },
  talk: { armL: A(0.25, -1, 0.15, 0.25, 0.1, 1), armR: A(-0.25, -1, 0.2, -0.35, 0.2, 1, { fist: 0.15 }), head: [0.03, 0, 0], brows: 0.2 },
  point: { armL: A(0.2, -1, 0.02, 0.12, -1, 0.2), armR: A(-0.35, 0.05, 1, -0.3, 0.12, 1, { fist: 0.9, point: true }), head: [0, -0.25, 0], spine: [0, -0.15, 0] },
  surprised: { armL: A(0.55, -0.6, 0.45, -0.15, 1, 0.35, { fist: 0 }), armR: A(-0.55, -0.6, 0.45, 0.15, 1, 0.35, { fist: 0 }), head: [-0.12, 0, 0], spine: [-0.1, 0, 0], jaw: 1, brows: 1 },
  shrug: { armL: A(0.12, -1, 0.12, 0.6, 0.2, 0.8, { fist: 0 }), armR: A(-0.12, -1, 0.12, -0.6, 0.2, 0.8, { fist: 0 }), head: [0.05, 0, 0.12], shrug: 0.07, brows: 0.6 },
  cheer: { armL: A(0.75, 0.75, 0.1, 0.05, 1, 0.3, { fist: 0.9 }), armR: A(-0.75, 0.75, 0.1, -0.05, 1, 0.3, { fist: 0.9 }), head: [-0.15, 0, 0], jaw: 0.8, brows: 0.6 },
  think: { armL: A(0.15, -1, 0.3, -0.9, 0.05, 0.4), armR: A(-0.12, -1, 0.35, 0.35, 1, 0.3, { fist: 0.7 }), head: [0.1, 0.15, 0.08], brows: -0.4 },
  // Holding a thing up in front of the chest to show it (the right hand; things.js puts the thing there).
  show: { armL: A(0.2, -1, 0.02, 0.12, -1, 0.2), armR: A(-0.22, -0.82, 0.5, 0.02, 0.3, 1, { fist: 0.55 }), head: [0.12, 0.08, 0], brows: 0.3 },
  flinch: { armL: A(0.3, -0.3, 0.8, -0.4, 1, 0.3, { fist: 0.5 }), armR: A(-0.3, -0.3, 0.8, 0.4, 1, 0.3, { fist: 0.5 }), head: [0.25, 0.3, 0], spine: [0.25, 0.2, 0], blink: 1, brows: -0.6, hipDrop: 4 },
};

// Blends two poses (k = 0 gives a, 1 gives b). Directions are mixed and renormalised in pose().
export function mix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const lerp = (x, y) => x + (y - x) * k;
  const arr = (x, y, n = 3) => Array.from({ length: n }, (_, i) => lerp(x?.[i] ?? 0, y?.[i] ?? 0));
  const limb = (x, y) => (x || y) ? { upper: arr(x?.upper, y?.upper), lower: arr(x?.lower, y?.lower), fist: lerp(x?.fist ?? 0.25, y?.fist ?? 0.25), point: k < 0.5 ? x?.point : y?.point } : undefined;
  return {
    armL: limb(a.armL, b.armL), armR: limb(a.armR, b.armR), legL: a.legL || b.legL ? limb(a.legL, b.legL) : undefined, legR: a.legR || b.legR ? limb(a.legR, b.legR) : undefined,
    spine: arr(a.spine, b.spine), head: arr(a.head, b.head),
    jaw: lerp(a.jaw || 0, b.jaw || 0), blink: lerp(a.blink || 0, b.blink || 0), brows: lerp(a.brows || 0, b.brows || 0),
    shrug: lerp(a.shrug || 0, b.shrug || 0), hipDrop: lerp(a.hipDrop || 0, b.hipDrop || 0), hipTurn: lerp(a.hipTurn || 0, b.hipTurn || 0),
  };
}

// Talking: the jaw follows the syllables (about 5 a second) while speaking; hands drift a little.
export function talking(p, t, amount = 1) {
  const syl = Math.max(0, Math.sin(t * 2 * Math.PI * 4.7) * 0.6 + Math.sin(t * 2 * Math.PI * 2.3 + 1) * 0.4);
  const q = { ...p, jaw: Math.max(p.jaw || 0, syl * 0.55 * amount) };
  if (q.armR) q.armR = { ...q.armR, lower: [q.armR.lower[0] + Math.sin(t * 2.1) * 0.15, q.armR.lower[1] + Math.sin(t * 2.9) * 0.15, q.armR.lower[2]] };
  if (q.armL) q.armL = { ...q.armL, lower: [q.armL.lower[0] + Math.sin(t * 1.7 + 2) * 0.1, q.armL.lower[1] + Math.sin(t * 2.3 + 1) * 0.1, q.armL.lower[2]] };
  q.head = [(p.head?.[0] || 0) + Math.sin(t * 3.1) * 0.03, (p.head?.[1] || 0) + Math.sin(t * 1.3) * 0.05, p.head?.[2] || 0];
  return q;
}

// Walking in place (the scene moves the holder): legs swing, arms counter-swing, the hips bob.
export function walking(t, speed = 1) {
  const ph = t * 2 * Math.PI * 0.95 * speed, s = Math.sin(ph), c = Math.cos(ph);
  const legF = (k) => ({ upper: [0, -1, 0.42 * k], lower: [0, -1, 0.42 * k - Math.max(0, -k) * 0.6 - 0.05] });
  return {
    legL: legF(s), legR: legF(-s),
    armL: A(0.18, -1, -0.35 * s, 0.1, -1, -0.35 * s + 0.35), armR: A(-0.18, -1, 0.35 * s, -0.1, -1, 0.35 * s + 0.35),
    spine: [0.04, 0.06 * s, 0], head: [0, -0.04 * s, 0], hipDrop: Math.abs(c) * 2.5, hipTurn: 0.08 * s,
  };
}
