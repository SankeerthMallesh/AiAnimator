// Loomy's Viking-era theme for the cartoon town: a longship on the river (dragon prow, striped square sail,
// a row of round shields, oars), built from simple shapes so the ink pass outlines it like the rest of the town.
import * as THREE from "three";

const lam = (color: number) => new THREE.MeshLambertMaterial({ color });
const stripes = () => {
  const c = document.createElement("canvas"); c.width = 64; c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f3ead6" : "#c0392b"; g.fillRect(0, i * 32, 64, 32); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

/** A longship about 14 m long along x, the keel at y = 0, bow toward +x. */
export function longship(): THREE.Group {
  const g = new THREE.Group();
  const wood = lam(0x8a5a33), dark = lam(0x5c3a20), shieldCols = [0xc0392b, 0xe9c46a, 0x2a6f97, 0xf3ead6];
  // hull: a side profile that sweeps up into the bow and stern, extruded to the ship's width
  const L = 7, p = new THREE.Shape();
  p.moveTo(-L, 1.9); p.quadraticCurveTo(-L + 1.2, 0.1, -L + 3, 0);
  p.lineTo(L - 3, 0); p.quadraticCurveTo(L - 1.2, 0.1, L, 1.9);
  p.lineTo(L - 0.4, 1.9); p.quadraticCurveTo(L - 1.6, 0.85, L - 3.2, 0.8);
  p.lineTo(-L + 3.2, 0.8); p.quadraticCurveTo(-L + 1.6, 0.85, -L + 0.4, 1.9); p.closePath();
  const hull = new THREE.ExtrudeGeometry(p, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.15, bevelSegments: 2, curveSegments: 16 });
  hull.translate(0, 0, -1.3);
  g.add(new THREE.Mesh(hull, wood));
  // planking lines along the side
  for (const y of [0.35, 0.6]) for (const z of [-1.42, 1.42]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2 * L - 5.5, 0.06, 0.04), dark); s.position.set(0, y, z); g.add(s);
  }
  // dragon neck and head at the bow, a curl at the stern
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 10), wood); neck.position.set(L - 0.05, 2.55, 0); neck.rotation.z = -0.35; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.36), wood); head.position.set(L + 0.35, 3.3, 0); head.rotation.z = -0.15; g.add(head);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), wood); jaw.position.set(L + 0.85, 3.2, 0); jaw.rotation.z = -Math.PI / 2; g.add(jaw);
  for (const z of [-0.19, 0.19]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lam(0xf2c230)); eye.position.set(L + 0.45, 3.38, z); g.add(eye); }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 18, Math.PI * 1.4), wood); tail.position.set(-L - 0.1, 2.35, 0); tail.rotation.z = 0.6; g.add(tail);
  // mast, yard and the striped square sail
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.2, 10), dark); mast.position.set(0.3, 4.4, 0); g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.6, 8), dark); yard.rotation.x = Math.PI / 2; yard.position.set(0.45, 7.3, 0); g.add(yard);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.2, 6, 4), new THREE.MeshLambertMaterial({ map: stripes(), side: THREE.DoubleSide }));
  const pos = sail.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.55 * (1 - (pos.getX(i) / 2.6) ** 2) * (0.6 + 0.4 * (1 - pos.getY(i) / 2.1))); // belly in the wind
  sail.geometry.computeVertexNormals();
  sail.rotation.y = Math.PI / 2; sail.position.set(0.55, 5.2, 0); g.add(sail);
  // round shields along both sides, and oars
  for (let i = 0; i < 9; i++) for (const z of [-1, 1]) {
    const x = -L + 3.4 + i * ((2 * L - 6.8) / 8);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 18), lam(shieldCols[(i + (z > 0 ? 1 : 0)) % 4]));
    sh.rotation.x = Math.PI / 2; sh.position.set(x, 1.25, z * 1.52); g.add(sh);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lam(0xb8bec6)); boss.position.set(x, 1.25, z * 1.58); g.add(boss);
    if (i % 2 === 0) { const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), dark); oar.position.set(x + 0.4, 0.45, z * 2.6); oar.rotation.x = z * 1.0; g.add(oar); }
  }
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

/** Which era theme a story wants. "viking" dresses the town's people and puts longships on the river. */
export const themeFor = (text: string) => (/\b(vikings?|norse|norsemen|longships?|danes|lindisfarne|ragnar|danelaw)\b/i.test(text) ? "viking" : "town");
