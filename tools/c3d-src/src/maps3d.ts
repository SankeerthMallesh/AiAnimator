// The 3D tab's copy of the 2.5D maps (sets.ts) with its own materials: explainer/js/z3d/maps3d.js.
import * as THREE from "three";
import { useMaterials, buildMapLocal, SET_NAMES } from "./sets";
export { SET_NAMES };
/** builds map `id` into `scene` at the origin (lens along -z) with the 3D tab's standard materials */
export function buildMapInto(scene: THREE.Object3D, id: string, seed = 1) {
  useMaterials({
    color: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0 }),
    map: (_k, tex) => { tex.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 }); },
  });
  const m = buildMapLocal(id, seed);
  if (m) scene.add(m.root);
  return m;
}
