// Loomy 2.1: the things people hold while they act (a key, a box of money, a broom, binoculars, a button on a
// pedestal), built in code for the 3D tab (auto3d.js) and the blocky world (autoblocky.js).
import * as THREE from 'three';
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });

// 2.1: things held in both hands (they sit between the hands) and in one
export const TWO_HANDS = ['hold', 'count', 'read', 'write', 'lift'];
export function itemMesh(item) {
  const g = new THREE.Group(), m = (geo, col, o = {}) => { const x = new THREE.Mesh(geo, std({ color: col, roughness: 0.7, ...o })); g.add(x); return x; };
  switch (item) {
    case 'key': { m(new THREE.TorusGeometry(0.035, 0.012, 8, 20), 0xe8b93a, { metalness: 0.8, roughness: 0.3 }).position.x = -0.05; m(new THREE.BoxGeometry(0.09, 0.015, 0.01), 0xe8b93a, { metalness: 0.8, roughness: 0.3 }).position.x = 0.03; break; }
    case 'map': case 'paper': case 'sign': { const w = item === 'paper' ? 0.21 : 0.34; m(new THREE.BoxGeometry(w, item === 'paper' ? 0.28 : 0.24, 0.006), item === 'map' ? 0xefd9a6 : 0xfbfaf6).rotation.x = -0.35; break; }
    case 'book': { m(new THREE.BoxGeometry(0.3, 0.22, 0.03), 0xfbfaf6).rotation.x = -0.5; m(new THREE.BoxGeometry(0.31, 0.225, 0.01), 0x8a5a3c).rotation.x = -0.5; break; }
    case 'money': { for (let i = 0; i < 3; i++) m(new THREE.BoxGeometry(0.16, 0.012, 0.07), 0x7fc27a).position.y = i * 0.013; break; }
    case 'gold': { m(new THREE.BoxGeometry(0.2, 0.06, 0.09), 0xf2c230, { metalness: 0.9, roughness: 0.25 }); break; }
    case 'gem': { m(new THREE.OctahedronGeometry(0.06), 0x5bc8f0, { metalness: 0.3, roughness: 0.1 }); break; }
    case 'flask': { m(new THREE.ConeGeometry(0.06, 0.12, 16), 0x9ee8c0, { transparent: true, opacity: 0.85 }); m(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), 0xe8f4f8).position.y = 0.09; break; }
    case 'cup': { m(new THREE.CylinderGeometry(0.045, 0.038, 0.12, 16), 0xf4f1ea); break; }
    case 'tool': { m(new THREE.BoxGeometry(0.03, 0.22, 0.02), 0x9aa2ac, { metalness: 0.7, roughness: 0.35 }); break; }
    case 'flashlight': { const b = m(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), 0x3a3f4b); b.rotation.x = Math.PI / 2; const l = new THREE.Mesh(new THREE.CircleGeometry(0.03, 14), new THREE.MeshBasicMaterial({ color: 0xfff4b0 })); l.position.z = 0.105; g.add(l); break; }
    case 'remote': { m(new THREE.BoxGeometry(0.05, 0.16, 0.02), 0x2b2f38); break; }
    case 'food': { m(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 20), 0xf4f1ea); m(new THREE.SphereGeometry(0.06, 14, 10), 0xc8823a).position.y = 0.03; break; }
    case 'bomb': { m(new THREE.SphereGeometry(0.08, 16, 12), 0x2b2f38); break; }
    default: { m(new THREE.BoxGeometry(0.3, 0.22, 0.24), 0x9c6a3c, { roughness: 0.95 }); m(new THREE.BoxGeometry(0.06, 0.225, 0.245), 0xefe0bd); }
  }
  return g;
}
export function handThing(act, item = '') {
  const g = new THREE.Group();
  if (TWO_HANDS.includes(act)) g.add(itemMesh(act === 'read' ? 'book' : act === 'write' ? 'paper' : act === 'count' ? 'money' : item || 'box'));
  else if (act === 'aim') {
    // 2.2: a musket held level, pointing the way they face
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.62), std({ color: 0x6b3f22 })); stock.position.z = 0.05; g.add(stock);
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.16), std({ color: 0x6b3f22 })); butt.position.set(0, -0.03, -0.3); g.add(butt);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), std({ color: 0x3a3f4b, metalness: 0.8, roughness: 0.3 })); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.028, 0.6); g.add(barrel);
  }
  else if (act === 'press') {
    // a waist-high pedestal with a big red button on top, beside the right hand (sized once the hand is measured)
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1, 0.24), std({ color: 0x5a6270, roughness: 0.6 })); ped.name = 'ped'; g.add(ped);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 20), std({ color: 0xe5484d, emissive: 0x551010 })); btn.name = 'btn'; g.add(btn);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), new THREE.MeshBasicMaterial({ color: 0x46d07a })); led.position.set(0.07, -0.08, 0.125); g.add(led);
    g.userData.fixed = true;
  }
  else if (act === 'look') { for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.11, 14), std({ color: 0x2b2f38 })); b.rotation.x = Math.PI / 2; b.position.x = s * 0.035; g.add(b); } }
  else if (act === 'sweep') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 10), std({ color: 0xb5824f })); shaft.position.y = -0.4; g.add(shaft);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), std({ color: 0xe8c86a, roughness: 1 })); head.position.y = -1.0; g.add(head);
  } else if (act === 'dig') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 10), std({ color: 0xc8a24a })); shaft.position.y = -0.35; g.add(shaft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.02), std({ color: 0x6b7480, metalness: 0.6, roughness: 0.4 })); blade.position.y = -0.98; g.add(blade);
  } else if (act === 'carry') {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), std({ color: 0xb59a68, roughness: 0.95 })); bag.scale.y = 1.2; bag.position.y = -0.15; g.add(bag);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.08, 10), std({ color: 0xa8935f })); tie.position.y = -0.02; g.add(tie);
  } else if (act === 'eat') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), std({ color: 0xc8823a })); m.scale.set(1.3, 0.9, 0.9); g.add(m);
  } else if (act === 'drink') {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.12, 16), std({ color: 0xf4f1ea })); g.add(cup);
  } else if (act === 'phone') {
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 0.075), std({ color: 0x22262e, roughness: 0.3 })); g.add(ph);
  } else return null;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
