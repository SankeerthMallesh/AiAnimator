// Loomy 2.0: 2.5D maps. Each map is a small 3D place built in code (a prison cell, a bank vault, mission
// control...) full of real objects, shaded with the world's two-tone materials so it matches the town, with the
// flat cartoon cast standing in it. Maps are built far from the town (past the fog), one per slot, on demand.
//
// Local coordinates: the floor is y = 0 at the cast's spot (0, 0, 0); the lens looks along +z from the -z side
// (the template's d = [0, -1]), so the back wall is behind the cast at +z and props line the sides and the back.
// spots: where an action happens (a chair to sit on, a bed, a hole to dig, a desk to type at), local x, y, z.
import * as THREE from "three";
import { lam } from "./build";
import { ctex, rep, rng } from "./paint";
import { D0 } from "./story";
import type { V3 } from "./story";
// the ink pass's no-outline layer (ink.ts NOINK; kept here so the 3D tab's copy needs no post chain)
const NOINK = 3;

export type SetInfo = { id: string; root: THREE.Group; origin: V3; spots: Record<string, V3>; outdoor: boolean; night?: boolean; front: number; boxes?: { o: THREE.Object3D; b: THREE.Box3 }[] };

type G = THREE.Object3D;
type Mat = THREE.Material;
const TAU = Math.PI * 2;

// ---------------- materials ----------------
// The cartoon engine's two-tone materials by default; the 3D tab swaps in its own (useMaterials).
type MatKit = { color: (c: string) => Mat; map: (key: string, tex: THREE.Texture) => Mat };
let MK: MatKit = {
  color: (c) => lam("set_" + c, () => ({ color: c })),
  map: (key, tex) => lam(key, () => ({ map: tex })),
};
const own = new Map<string, Mat>();
export function useMaterials(kit: MatKit) { MK = kit; own.clear(); }
const C = (c: string) => { const k = "c" + c; let m = own.get(k); if (!m) { m = MK.color(c); own.set(k, m); } return m; };
const T = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, rx = 1, ry = 1) => {
  const k = `set_${key}_${rx}x${ry}`; let m = own.get(k);
  if (!m) { m = MK.map(k, rep(ctex("set_" + key, w, h, draw), rx, ry)); own.set(k, m); }
  return m;
};
const glowCache = new Map<string, THREE.Material>();
/** unlit (screens, window views, lamps): stays bright whatever the light */
const GLOW = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let m = glowCache.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ map: ctex("glow_" + key, w, h, draw), toneMapped: false }); glowCache.set(key, m); }
  return m;
};
const glowCol = (c: string) => { const k = "c" + c; let m = glowCache.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); glowCache.set(k, m); } return m; };

// ---------------- painted textures ----------------
/** concrete blocks, two-tone like a cell: a pale upper wall over a coloured lower band */
const blocks = (top: string, low: string, band: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  const W = 512, H = 512, cut = H * 0.56;
  g.fillStyle = top; g.fillRect(0, 0, W, cut); g.fillStyle = low; g.fillRect(0, cut, W, H - cut);
  g.fillStyle = band; g.fillRect(0, cut - 10, W, 12);
  g.strokeStyle = "rgba(60,60,80,0.22)"; g.lineWidth = 3;
  for (let row = 0; row < 8; row++) { const y = row * 64; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (row % 2) * 64; x < W; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(80,80,90,${0.04 + r() * 0.06})`; g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 6, 0, TAU); g.fill(); }
};
const checker = (a: string, b: string, n = 4) => (g: CanvasRenderingContext2D) => {
  const s = 512 / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); }
};
const marble = (base: string, vein: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = vein; g.lineWidth = 2;
  for (let k = 0; k < 14; k++) { g.globalAlpha = 0.25 + r() * 0.3; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y);
    for (let s = 0; s < 8; s++) { x += (r() - 0.3) * 80; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);
};
const panels = (base: string, line: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 6;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(512, i * 256); g.stroke(); }
  g.fillStyle = line; for (const x of [18, 238, 274, 494]) for (const y of [18, 238, 274, 494]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
};
const planksFloor = (a: string, b: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, i * 64, 512, 3);
    const x = r() * 512; g.fillRect(x, i * 64, 3, 64); }
};
const carpet = (a: string, b: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) { g.fillStyle = r() < 0.5 ? b : "rgba(255,255,255,0.08)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
};
const dirt = (a: string, b: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 220; k++) { g.fillStyle = r() < 0.5 ? b : "rgba(255,255,255,0.07)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, TAU); g.fill(); }
};
const tiles = (a: string, grout: string, n = 8) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512); g.strokeStyle = grout; g.lineWidth = 4; const s = 512 / n;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke(); }
};
const boxesGrid = (face: string, dark: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = dark; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) { const x = i * 64 + 3, y = j * 42.6 + 3; g.fillStyle = face; g.fillRect(x, y, 58, 37);
    g.fillStyle = dark; g.fillRect(x + 25, y + 15, 8, 7); }
};
const spaceView = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#03040e"; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * 1024, r() * 300, 1 + r() * 2, 1 + r() * 2); }
  const gr = g.createRadialGradient(512, 1500, 1050, 512, 1500, 1260); gr.addColorStop(0, "#1d6fd8"); gr.addColorStop(0.82, "#4fb2f5"); gr.addColorStop(0.92, "#bfe8ff"); gr.addColorStop(1, "rgba(120,190,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(512, 1500, 1260, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.55)"; for (let k = 0; k < 30; k++) { g.beginPath(); g.ellipse(r() * 1024, 330 + r() * 180, 20 + r() * 60, 6 + r() * 10, r() - 0.5, 0, TAU); g.fill(); }
};
const starView = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#050818"; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * 1024, r() * 512, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const skyline = (g: CanvasRenderingContext2D, r: () => number) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5da8ec"); gr.addColorStop(1, "#d6ecfa"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 16; k++) { const w = 40 + r() * 70, h = 120 + r() * 260, x = k * 66 - 10; g.fillStyle = `rgb(${120 + r() * 30},${140 + r() * 30},${170 + r() * 30})`; g.fillRect(x, 512 - h, w, h);
    g.fillStyle = "rgba(255,255,255,0.35)"; for (let y = 512 - h + 12; y < 500; y += 22) for (let xx = x + 8; xx < x + w - 8; xx += 16) g.fillRect(xx, y, 7, 10); }
};
const countdown = (n: string, head: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#0f1c3c"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#2f5aa8"; g.lineWidth = 3; g.strokeRect(20, 20, 984, 472);
  g.fillStyle = "#ffffff"; g.font = "700 46px Arial, sans-serif"; g.fillText(head, 60, 90);
  g.fillStyle = "#ffd24a"; g.fillRect(40, 60, 8, 40);
  g.strokeStyle = "#ffd24a"; g.lineWidth = 14; g.beginPath(); g.arc(512, 290, 150, -1.2, 0.9); g.stroke();
  g.fillStyle = "#fff4c2"; g.font = "800 260px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, 512, 300);
};
const monitorUI = (seed: number) => (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#0e2440"; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = ["#46e08a", "#4fb2f5", "#ffd24a"][seed % 3]; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 100);
  for (let x = 10; x < 246; x += 12) g.lineTo(x, 60 + r() * 70); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.6)"; for (let y = 16; y < 50; y += 10) g.fillRect(14, y, 60 + r() * 120, 4);
};
const chalk = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#2f5a45"; g.fillRect(0, 0, 1024, 512); g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 4;
  for (let k = 0; k < 6; k++) { g.beginPath(); let x = 80 + r() * 200, y = 80 + k * 60; g.moveTo(x, y); for (let s = 0; s < 10; s++) { x += 30 + r() * 30; g.lineTo(x, y + (r() - 0.5) * 16); } g.stroke(); }
  g.beginPath(); g.arc(760, 220, 90, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(670, 220); g.lineTo(850, 220); g.stroke();
};
const bills = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#cfe3c3"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#7fae6e"; g.fillRect(8, 8, 240, 112); g.fillStyle = "#cfe3c3"; g.beginPath(); g.ellipse(128, 64, 30, 36, 0, 0, TAU); g.fill();
  g.fillStyle = "#e9d27a"; g.fillRect(110, 0, 36, 128);
};
const painting = (a: string, b: string) => (g: CanvasRenderingContext2D, r: () => number) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(80 + r() * 100, 80 + r() * 60, 30, 0, TAU); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.moveTo(0, 256); g.lineTo(90 + r() * 60, 150); g.lineTo(256, 256); g.fill();
};

// ---------------- building blocks ----------------
const mesh = (geo: THREE.BufferGeometry, mat: Mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
/** a box standing on y (its bottom), centred on x, z */
const B = (g: G, w: number, h: number, d: number, mat: Mat, x: number, y: number, z: number, ry = 0, cast = true) => {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, cast); m.position.set(x, y + h / 2, z); m.rotation.y = ry; g.add(m); return m;
};
const Cy = (g: G, r1: number, r2: number, h: number, mat: Mat, x: number, y: number, z: number, seg = 20, cast = true) => {
  const m = mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat, cast); m.position.set(x, y + h / 2, z); g.add(m); return m;
};
const S = (g: G, r: number, mat: Mat, x: number, y: number, z: number, sy = 1) => { const m = mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.position.set(x, y, z); m.scale.y = sy; g.add(m); return m; };
/** a flat panel; faces -z (toward the lens) unless turned */
const P = (g: G, w: number, h: number, mat: Mat, x: number, y: number, z: number, ry = Math.PI, rx = 0, cast = false) => {
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, cast); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, "YXZ"); g.add(m); return m;
};
/** a room: floor, back wall, side walls and (optionally) a ceiling; walls never block the sun */
const room = (g: G, o: { w: number; zb: number; zf?: number; h: number; floor: Mat; wall: Mat; side?: Mat; ceil?: Mat | null }) => {
  const zf = o.zf ?? -12, d = o.zb - zf, side = o.side ?? o.wall;
  P(g, o.w, d, o.floor, 0, 0, (o.zb + zf) / 2, 0, -Math.PI / 2);
  P(g, o.w, o.h, o.wall, 0, o.h / 2, o.zb, Math.PI);
  P(g, d, o.h, side, -o.w / 2, o.h / 2, (o.zb + zf) / 2, Math.PI / 2);
  P(g, d, o.h, side, o.w / 2, o.h / 2, (o.zb + zf) / 2, -Math.PI / 2);
  if (o.ceil) P(g, o.w, d, o.ceil, 0, o.h, (o.zb + zf) / 2, 0, Math.PI / 2);
};
/** a glowing light shaft (a window's light on the floor): additive, never outlined */
const beam = (g: G, x: number, y: number, z: number, w: number, h: number, tilt: number) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ctex("set_beam", 64, 256, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,250,230,0.55)"); gr.addColorStop(1, "rgba(255,250,230,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 256); }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.set(0, Math.PI, tilt); m.layers.set(NOINK); g.add(m); return m;
};

// ---------------- props (real objects) ----------------
const P_ = {
  bunk(g: G, x: number, z: number, ry = 0, sheet = "#3f63b8") {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    const metal = C("#c9ced6"), mat = C(sheet);
    for (const [px, pz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) B(f, 0.06, 1.7, 0.06, metal, px, 0, pz);
    for (const y of [0.42, 1.25]) { B(f, 2.0, 0.06, 0.86, metal, 0, y, 0); B(f, 1.9, 0.14, 0.8, mat, 0, y + 0.06, 0); B(f, 0.42, 0.1, 0.6, C("#f1f1ea"), 0.68, y + 0.2, 0); }
    for (let k = 0; k < 4; k++) B(f, 0.04, 0.04, 0.04, metal, 0.95, 0.6 + k * 0.18, -0.45);
    return f;
  },
  toilet(g: G, x: number, z: number, ry = Math.PI, steel = false) {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    const m = steel ? C("#b9c0c8") : C("#f4f4f0");
    Cy(f, 0.16, 0.2, 0.36, m, 0, 0, 0.05); B(f, 0.46, 0.08, 0.54, m, 0, 0.36, 0.08); B(f, 0.44, 0.5, 0.2, m, 0, 0.38, -0.22);
    B(f, 0.42, 0.04, 0.5, C("#e9e9e2"), 0, 0.44, 0.08);
    return f;
  },
  sink(g: G, x: number, z: number, ry = Math.PI) {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    B(f, 0.1, 0.8, 0.1, C("#b9c0c8"), 0, 0, 0); B(f, 0.5, 0.16, 0.4, C("#d9dde2"), 0, 0.8, 0.05); Cy(f, 0.015, 0.015, 0.22, C("#9aa2ac"), 0, 0.96, -0.1, 8);
    return f;
  },
  paper(g: G, x: number, y: number, z: number) { const m = Cy(g, 0.07, 0.07, 0.12, C("#ffffff"), x, y, z, 16); m.rotation.z = Math.PI / 2; return m; },
  window(g: G, x: number, y: number, z: number, w: number, h: number, view: Mat, frame = C("#5a6270"), bars = 0) {
    P(g, w, h, view, x, y, z + 0.02);
    const t = 0.08; B(g, w + t * 2, t, 0.12, frame, x, y - h / 2 - t, z); B(g, w + t * 2, t, 0.12, frame, x, y + h / 2, z);
    B(g, t, h, 0.12, frame, x - w / 2 - t / 2, y - h / 2, z); B(g, t, h, 0.12, frame, x + w / 2 + t / 2, y - h / 2, z);
    for (let k = 1; k <= bars; k++) B(g, 0.03, h, 0.03, C("#3c4250"), x - w / 2 + (k * w) / (bars + 1), y - h / 2, z - 0.04);
  },
  roundWindow(g: G, x: number, y: number, z: number, r: number, view: Mat) {
    const v = mesh(new THREE.CircleGeometry(r, 40), view, false); v.position.set(x, y, z + 0.02); v.rotation.y = Math.PI; g.add(v);
    const ring = mesh(new THREE.TorusGeometry(r, 0.09, 10, 40), C("#6b7280")); ring.position.set(x, y, z); g.add(ring);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; S(g, 0.025, C("#3c4250"), x + Math.cos(a) * (r + 0.05), y + Math.sin(a) * (r + 0.05), z - 0.08); }
  },
  bars(g: G, x0: number, x1: number, z: number, h: number, gap = 0.16) {
    const m = C("#3e4a58"); for (let x = x0; x <= x1 + 1e-6; x += gap) Cy(g, 0.022, 0.022, h, m, x, 0, z, 8);
    for (const y of [0.05, h * 0.55, h - 0.05]) B(g, x1 - x0 + 0.06, 0.06, 0.06, m, (x0 + x1) / 2, y, z);
  },
  shelf(g: G, x: number, y: number, z: number, w = 1.2, items = 3, seed = 1) {
    const r = rng(seed); B(g, w, 0.04, 0.3, C("#c9ced6"), x, y, z);
    for (let k = 0; k < items; k++) { const c = ["#d9534f", "#3f7fd9", "#f0b429", "#46b07a", "#f4f1ea"][Math.floor(r() * 5)]; B(g, 0.14 + r() * 0.1, 0.12 + r() * 0.16, 0.14, C(c), x - w / 2 + 0.2 + (k * (w - 0.3)) / Math.max(1, items - 1), y + 0.04, z); }
  },
  desk(g: G, x: number, z: number, w = 1.4, d = 0.7, top = C("#c08a55"), ry = 0) {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    B(f, w, 0.06, d, top, 0, 0.74, 0); for (const [px, pz] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) B(f, 0.05, 0.74, 0.05, C("#4a4f5a"), px, 0, pz);
    return f;
  },
  chair(g: G, x: number, z: number, ry = 0, col = "#3a3f4b") {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    B(f, 0.46, 0.06, 0.44, C(col), 0, 0.44, 0); B(f, 0.46, 0.5, 0.06, C(col), 0, 0.5, 0.2);
    for (const [px, pz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) B(f, 0.04, 0.44, 0.04, C("#2b2f38"), px, 0, pz);
    return f;
  },
  stool(g: G, x: number, z: number, col = "#d9534f") { Cy(g, 0.2, 0.2, 0.08, C(col), x, 0.7, z); Cy(g, 0.03, 0.03, 0.7, C("#9aa2ac"), x, 0, z, 8); Cy(g, 0.18, 0.18, 0.03, C("#9aa2ac"), x, 0, z); },
  monitor(g: G, x: number, y: number, z: number, seed = 1, ry = Math.PI) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; g.add(f);
    B(f, 0.56, 0.36, 0.04, C("#22262e"), 0, 0.12, 0); const s = P(f, 0.5, 0.3, GLOW("mon" + (seed % 6), 256, 160, monitorUI(seed)), 0, 0.3, -0.025, Math.PI); s.rotation.y = 0;
    B(f, 0.05, 0.12, 0.05, C("#22262e"), 0, 0, 0.02); return f;
  },
  plant(g: G, x: number, y: number, z: number, s = 1) {
    Cy(g, 0.1 * s, 0.08 * s, 0.16 * s, C("#e9e4da"), x, y, z, 14);
    for (let k = 0; k < 5; k++) { const m = mesh(new THREE.ConeGeometry(0.03 * s, 0.3 * s, 6), C(k % 2 ? "#4caf50" : "#3e9b47")); m.position.set(x + (k - 2) * 0.025 * s, y + 0.3 * s, z); m.rotation.z = (k - 2) * 0.25; g.add(m); }
  },
  lamp(g: G, x: number, y: number, z: number, w = 1.2) { B(g, w, 0.05, 0.3, C("#d7dbe2"), x, y - 0.05, z, 0, false); P(g, w - 0.1, 0.22, glowCol("#fffbe8"), x, y - 0.06, z, 0, Math.PI / 2); },
  crate(g: G, x: number, z: number, s = 0.6, col = "#b5824f") { B(g, s, s, s, C(col), x, 0, z); B(g, s + 0.02, 0.06, 0.06, C("#7a5232"), x, s * 0.5, z - s / 2); },
  barrel(g: G, x: number, z: number) { Cy(g, 0.3, 0.3, 0.9, C("#8a5a3c"), x, 0, z); Cy(g, 0.31, 0.31, 0.05, C("#4a4f5a"), x, 0.2, z); Cy(g, 0.31, 0.31, 0.05, C("#4a4f5a"), x, 0.65, z); },
  sandbags(g: G, x0: number, x1: number, z: number, rows = 3) {
    const m = C("#c9b48a"); for (let row = 0; row < rows; row++) for (let x = x0 + (row % 2) * 0.25; x < x1; x += 0.5) { const s = S(g, 0.26, m, x, 0.12 + row * 0.2, z, 0.45); s.scale.z = 0.6; }
  },
  tree(g: G, x: number, z: number, s = 1, leaf = "#3e9b47") { Cy(g, 0.12 * s, 0.16 * s, 1.4 * s, C("#7a5232"), x, 0, z, 10); S(g, 0.9 * s, C(leaf), x, 1.9 * s, z); S(g, 0.6 * s, C(leaf), x + 0.5 * s, 1.5 * s, z + 0.2); },
  pine(g: G, x: number, z: number, s = 1) { Cy(g, 0.1 * s, 0.12 * s, 0.6 * s, C("#6b4a2e"), x, 0, z, 8); for (let k = 0; k < 3; k++) { const m = mesh(new THREE.ConeGeometry((0.9 - k * 0.22) * s, 1.1 * s, 10), C(["#2f7d4f", "#358a57", "#3f9a60"][k])); m.position.set(x, (0.9 + k * 0.6) * s, z); g.add(m); } },
  rock(g: G, x: number, z: number, s = 0.4, col = "#9a958c") { const m = mesh(new THREE.DodecahedronGeometry(s, 0), C(col)); m.position.set(x, s * 0.6, z); m.scale.y = 0.6; g.add(m); },
  moneyStack(g: G, x: number, y: number, z: number, n = 3) { for (let k = 0; k < n; k++) { B(g, 0.3, 0.12, 0.14, C("#7fae6e"), x + (k % 2) * 0.32, y + Math.floor(k / 2) * 0.12, z); B(g, 0.05, 0.125, 0.145, C("#e9d27a"), x + (k % 2) * 0.32, y + Math.floor(k / 2) * 0.12, z); } },
  goldBars(g: G, x: number, y: number, z: number, n = 6) { const m = C("#e8b923"); for (let k = 0; k < n; k++) { const row = Math.floor(k / 3), i = k % 3; B(g, 0.24, 0.07, 0.11, m, x + i * 0.26 + row * 0.13, y + row * 0.07, z); } },
  moneyBag(g: G, x: number, z: number) { S(g, 0.28, C("#c9b48a"), x, 0.26, z, 1.1); Cy(g, 0.06, 0.1, 0.12, C("#b39e74"), x, 0.52, z, 10); },
  cart(g: G, x: number, z: number) { B(g, 1.0, 0.04, 0.6, C("#2e7d4f"), x, 0.75, z); B(g, 1.0, 0.04, 0.6, C("#2e7d4f"), x, 0.3, z); for (const [px, pz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) { B(g, 0.04, 0.78, 0.04, C("#c9ced6"), x + px, 0.08, z + pz); S(g, 0.06, C("#2b2f38"), x + px, 0.06, z + pz); } },
  vaultDoor(g: G, x: number, y: number, z: number, r = 1.5) {
    const ring = mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.3, 48), C("#9aa0a8")); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); g.add(ring);
    const door = mesh(new THREE.CylinderGeometry(r, r, 0.4, 48), C("#d9b44a")); door.rotation.x = Math.PI / 2; door.position.set(x, y, z - 0.12); g.add(door);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; B(g, 0.14, 0.34, 0.2, C("#8a9098"), x + Math.cos(a) * (r + 0.42), y + Math.sin(a) * (r + 0.42) - 0.17, z - 0.1, 0); }
    const wheel = mesh(new THREE.TorusGeometry(r * 0.38, 0.04, 8, 32), C("#c9ced6")); wheel.position.set(x, y, z - 0.4); g.add(wheel);
    for (let k = 0; k < 6; k++) { const sp = B(g, 0.03, r * 0.76, 0.03, C("#c9ced6"), x, y - r * 0.38, z - 0.4); sp.rotation.z = (k / 6) * Math.PI; sp.position.set(x, y, z - 0.4); }
    S(g, 0.1, C("#e8b923"), x, y, z - 0.42);
    for (let k = 0; k < 4; k++) { const c = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20), C("#f4f1ea")); c.rotation.x = Math.PI / 2; c.position.set(x - 0.45 + k * 0.3, y + r * 0.62, z - 0.35); g.add(c); }
  },
  console(g: G, x: number, z: number, w = 2.2, seed = 1) {
    B(g, w, 0.78, 0.7, C("#e8ebf0"), x, 0, z); B(g, w, 0.06, 0.8, C("#c9ced6"), x, 0.78, z);
    for (let k = 0; k < Math.round(w / 0.75); k++) P_.monitor(g, x - w / 2 + 0.4 + k * 0.75, 0.84, z + 0.15, seed + k);
    for (let k = 0; k < 5; k++) Cy(g, 0.05, 0.05, 0.04, glowCol(["#46e08a", "#ffd24a", "#ff5a5a"][k % 3]), x - w / 2 + 0.3 + k * 0.2, 0.84, z - 0.25, 12);
  },
  bigScreen(g: G, x: number, y: number, z: number, w: number, h: number, mat: Mat) { B(g, w + 0.16, h + 0.16, 0.1, C("#1c2233"), x, y - h / 2 - 0.08, z + 0.05); P(g, w, h, mat, x, y, z - 0.01); },
  seat(g: G, x: number, z: number, col = "#2e3a55") { B(g, 0.6, 0.12, 0.6, C(col), x, 0.42, z); B(g, 0.6, 0.85, 0.14, C(col), x, 0.5, z + 0.26); B(g, 0.3, 0.42, 0.3, C("#3c4250"), x, 0, z); },
  table(g: G, x: number, z: number, w = 1.2, d = 0.8, col = "#a8724a") { P_.desk(g, x, z, w, d, C(col)); },
  bed(g: G, x: number, z: number, ry = 0, sheet = "#7fb3d9") { const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); B(f, 1.0, 0.36, 2.0, C("#8a5a3c"), 0, 0, 0); B(f, 0.96, 0.14, 1.9, C("#f4f1ea"), 0, 0.36, 0); B(f, 0.98, 0.1, 1.3, C(sheet), 0, 0.46, -0.3); B(f, 0.6, 0.12, 0.34, C("#ffffff"), 0, 0.5, 0.7); B(f, 1.0, 0.8, 0.08, C("#6b4a2e"), 0, 0, 1.0); return f; },
  sofa(g: G, x: number, z: number, col = "#5b7fd6") { B(g, 2.0, 0.42, 0.9, C(col), x, 0, z); B(g, 2.0, 0.55, 0.22, C(col), x, 0.42, z + 0.34); B(g, 0.22, 0.6, 0.9, C(col), x - 1.0, 0, z); B(g, 0.22, 0.6, 0.9, C(col), x + 1.0, 0, z); },
  tv(g: G, x: number, y: number, z: number) { B(g, 1.2, 0.7, 0.06, C("#1a1d24"), x, y, z); P(g, 1.12, 0.62, GLOW("tv", 256, 160, monitorUI(4)), x, y + 0.35, z - 0.035); },
  bookshelf(g: G, x: number, z: number, seed = 3) { B(g, 1.1, 1.9, 0.35, C("#8a5a3c"), x, 0, z); for (let y = 0.3; y < 1.8; y += 0.4) P_.shelf(g, x, y, z - 0.03, 1.0, 5, seed + y * 10); },
  stove(g: G, x: number, z: number) { B(g, 0.8, 0.9, 0.65, C("#e8ebf0"), x, 0, z); for (const dx of [-0.2, 0.2]) Cy(g, 0.12, 0.12, 0.02, C("#2b2f38"), x + dx, 0.9, z - 0.05, 16); Cy(g, 0.18, 0.18, 0.24, C("#c8102e"), x - 0.2, 0.92, z - 0.05, 18); },
  fridge(g: G, x: number, z: number) { B(g, 0.8, 1.85, 0.7, C("#eef0f3"), x, 0, z); B(g, 0.04, 0.3, 0.04, C("#9aa2ac"), x - 0.32, 1.1, z - 0.37); B(g, 0.8, 0.02, 0.71, C("#c9ced6"), x, 1.2, z); },
  counter(g: G, x: number, z: number, w = 2, top = "#f2ede4", body = "#d8a06a") { B(g, w, 0.88, 0.65, C(body), x, 0, z); B(g, w + 0.04, 0.05, 0.7, C(top), x, 0.88, z); },
  ivStand(g: G, x: number, z: number) { Cy(g, 0.02, 0.02, 1.8, C("#c9ced6"), x, 0, z, 8); B(g, 0.14, 0.22, 0.06, C("#cfe8ff"), x, 1.55, z); Cy(g, 0.2, 0.2, 0.03, C("#9aa2ac"), x, 0, z, 16); },
  heartMonitor(g: G, x: number, y: number, z: number) { B(g, 0.6, 0.42, 0.18, C("#2b3440"), x, y, z); P(g, 0.52, 0.32, GLOW("ecg", 256, 160, (c) => { c.fillStyle = "#06150f"; c.fillRect(0, 0, 256, 160); c.strokeStyle = "#46f08a"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 90); for (let k = 0; k < 256; k += 4) c.lineTo(k, k % 80 > 34 && k % 80 < 46 ? 30 : 90); c.stroke(); }), x, y + 0.21, z - 0.095); },
  board(g: G, x: number, y: number, z: number, w = 3, h = 1.3) { B(g, w + 0.14, h + 0.14, 0.06, C("#8a5a3c"), x, y - 0.07, z); P(g, w, h, GLOW("chalk", 1024, 512, chalk), x, y + h / 2, z - 0.035); },
  schoolDesk(g: G, x: number, z: number) { B(g, 0.7, 0.05, 0.5, C("#c08a55"), x, 0.7, z); B(g, 0.05, 0.7, 0.05, C("#5a6270"), x - 0.3, 0, z - 0.2); B(g, 0.05, 0.7, 0.05, C("#5a6270"), x + 0.3, 0, z - 0.2); B(g, 0.05, 0.7, 0.05, C("#5a6270"), x - 0.3, 0, z + 0.2); B(g, 0.05, 0.7, 0.05, C("#5a6270"), x + 0.3, 0, z + 0.2); },
  clock(g: G, x: number, y: number, z: number) { const f = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28), C("#ffffff")); f.rotation.x = Math.PI / 2; f.position.set(x, y, z); g.add(f); const h = B(g, 0.02, 0.15, 0.02, C("#1a1d24"), x, y - 0.02, z - 0.03); h.rotation.z = 0.6; B(g, 0.02, 0.1, 0.02, C("#1a1d24"), x, y - 0.02, z - 0.03); },
  pickaxe(g: G, x: number, z: number) { const h = B(g, 0.04, 0.9, 0.04, C("#8a5a3c"), x, 0, z); h.rotation.z = 0.4; const p = B(g, 0.5, 0.05, 0.05, C("#7d8088"), x - 0.2, 0.75, z); p.rotation.z = 0.4; },
  shovel(g: G, x: number, z: number) { const h = B(g, 0.04, 1.0, 0.04, C("#c8a24a"), x, 0, z); h.rotation.z = -0.2; B(g, 0.22, 0.28, 0.03, C("#5a6270"), x + 0.02, 0, z); },
  hole(g: G, x: number, z: number, r = 0.7) {
    const rim = mesh(new THREE.CylinderGeometry(r + 0.12, r + 0.2, 0.14, 24), C("#8a7a66")); rim.position.set(x, 0.05, z); g.add(rim);
    const pit = mesh(new THREE.CircleGeometry(r, 24), glowCol("#1c120c"), false); pit.rotation.x = -Math.PI / 2; pit.position.set(x, 0.13, z); g.add(pit);
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; P_.rock(g, x + Math.cos(a) * (r + 0.4), z + Math.sin(a) * (r + 0.4), 0.06 + (k % 3) * 0.03, "#8f877a"); }
  },
  lantern(g: G, x: number, y: number, z: number) { B(g, 0.14, 0.2, 0.14, C("#3c4250"), x, y, z); B(g, 0.1, 0.14, 0.1, glowCol("#ffd58a"), x, y + 0.03, z); },
  railTrack(g: G, x: number, z0: number, z1: number) { for (const dx of [-0.35, 0.35]) B(g, 0.05, 0.05, z1 - z0, C("#7d8088"), x + dx, 0, (z0 + z1) / 2); for (let z = z0; z < z1; z += 0.5) B(g, 0.9, 0.04, 0.12, C("#6b4a2e"), x, 0, z); },
  mineCart(g: G, x: number, z: number) { B(g, 0.8, 0.5, 1.0, C("#5a6270"), x, 0.15, z); for (const dz of [-0.35, 0.35]) for (const dx of [-0.42, 0.42]) { const w = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 14), C("#2b2f38")); w.rotation.z = Math.PI / 2; w.position.set(x + dx, 0.12, z + dz); g.add(w); } for (let k = 0; k < 5; k++) P_.rock(g, x - 0.2 + k * 0.1, z - 0.2 + (k % 2) * 0.3, 0.12, "#6b5b45"); },
  tent(g: G, x: number, z: number, col = "#e8823a") { const m = mesh(new THREE.ConeGeometry(1.3, 1.6, 4), C(col)); m.position.set(x, 0.8, z); m.rotation.y = Math.PI / 4; g.add(m); P(g, 0.6, 0.8, C("#3a2a20"), x, 0.4, z - 0.7); },
  campfire(g: G, x: number, z: number) { for (let k = 0; k < 5; k++) { const l = B(g, 0.08, 0.08, 0.7, C("#6b4a2e"), x, 0.04, z); l.rotation.y = (k / 5) * Math.PI; } for (let k = 0; k < 3; k++) { const f = mesh(new THREE.ConeGeometry(0.16 - k * 0.04, 0.5 - k * 0.1, 8), glowCol(["#ff8a2a", "#ffc04a", "#fff1a8"][k]), false); f.position.set(x, 0.3, z); g.add(f); } },
  log(g: G, x: number, z: number, ry = 0) { const m = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), C("#7a5232")); m.rotation.set(0, ry, Math.PI / 2); m.position.set(x, 0.16, z); g.add(m); },
  umbrella(g: G, x: number, z: number) { Cy(g, 0.03, 0.03, 2.0, C("#f4f1ea"), x, 0, z, 8); const t = mesh(new THREE.ConeGeometry(1.2, 0.4, 12), C("#e5484d")); t.position.set(x, 2.1, z); g.add(t); },
  cactus(g: G, x: number, z: number) { Cy(g, 0.18, 0.2, 1.6, C("#4f9a4a"), x, 0, z, 12); Cy(g, 0.11, 0.11, 0.6, C("#4f9a4a"), x + 0.3, 0.7, z, 10); B(g, 0.3, 0.12, 0.12, C("#4f9a4a"), x + 0.15, 0.7, z); },
  fence(g: G, x0: number, x1: number, z: number) { for (let x = x0; x <= x1; x += 0.9) B(g, 0.08, 0.9, 0.08, C("#b5824f"), x, 0, z); for (const y of [0.35, 0.7]) B(g, x1 - x0, 0.08, 0.05, C("#c79260"), (x0 + x1) / 2, y, z); },
  hay(g: G, x: number, z: number) { const m = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 18), C("#e8c86a")); m.rotation.z = Math.PI / 2; m.position.set(x, 0.5, z); g.add(m); },
  column(g: G, x: number, z: number, h = 3.4) { Cy(g, 0.28, 0.3, h, C("#efe9dc"), x, 0, z, 18); B(g, 0.8, 0.16, 0.8, C("#e0d8c6"), x, 0, z); B(g, 0.8, 0.16, 0.8, C("#e0d8c6"), x, h - 0.16, z); },
  rope(g: G, x0: number, x1: number, z: number) { for (const x of [x0, x1]) { Cy(g, 0.04, 0.04, 0.9, C("#c9a13b"), x, 0, z, 10); Cy(g, 0.16, 0.16, 0.04, C("#c9a13b"), x, 0, z, 16); } const r = B(g, x1 - x0, 0.05, 0.05, C("#b0122a"), (x0 + x1) / 2, 0.78, z); return r; },
  frame(g: G, x: number, y: number, z: number, w: number, h: number, art: Mat) { B(g, w + 0.16, h + 0.16, 0.06, C("#b8892f"), x, y - h / 2 - 0.08, z); P(g, w, h, art, x, y, z - 0.035); },
  throne(g: G, x: number, z: number) { B(g, 1.0, 0.5, 0.9, C("#b8892f"), x, 0.2, z); B(g, 1.0, 1.8, 0.2, C("#c8102e"), x, 0.2, z + 0.4); B(g, 0.8, 0.12, 0.7, C("#c8102e"), x, 0.7, z); B(g, 1.2, 0.2, 1.4, C("#8a7a66"), x, 0, z); },
  banner(g: G, x: number, y: number, z: number, col = "#c8102e") { P(g, 0.7, 1.6, C(col), x, y, z - 0.02); B(g, 0.9, 0.05, 0.05, C("#b8892f"), x, y + 0.8, z - 0.04); },
  torch(g: G, x: number, y: number, z: number) { B(g, 0.08, 0.4, 0.08, C("#6b4a2e"), x, y, z); const f = mesh(new THREE.ConeGeometry(0.1, 0.26, 8), glowCol("#ffb04a"), false); f.position.set(x, y + 0.52, z); g.add(f); },
  bench(g: G, x: number, z: number, w = 2, col = "#8a5a3c") { B(g, w, 0.06, 0.4, C(col), x, 0.45, z); B(g, w, 0.5, 0.06, C(col), x, 0.5, z + 0.18); for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) B(g, 0.06, 0.45, 0.36, C("#5a3b2a"), x + dx, 0, z); },
  waterCooler(g: G, x: number, z: number) { B(g, 0.34, 1.0, 0.34, C("#e8ebf0"), x, 0, z); Cy(g, 0.15, 0.15, 0.4, C("#8fd0ff"), x, 1.0, z, 16); },
  register(g: G, x: number, y: number, z: number) { B(g, 0.4, 0.2, 0.34, C("#2b2f38"), x, y, z); B(g, 0.3, 0.2, 0.04, C("#2b2f38"), x, y + 0.2, z + 0.12); },
  storeShelf(g: G, x: number, z: number, seed = 1, ry = 0) { const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); B(f, 1.8, 1.7, 0.45, C("#e8ebf0"), 0, 0, 0); for (let y = 0.25; y < 1.6; y += 0.42) P_.shelf(f, 0, y, -0.1, 1.7, 7, seed + y * 7); },
  booth(g: G, x: number, z: number) { B(g, 1.6, 0.45, 0.5, C("#c8102e"), x, 0, z); B(g, 1.6, 0.6, 0.15, C("#c8102e"), x, 0.45, z + 0.2); P_.table(g, x, z - 0.6, 1.2, 0.6, "#f2ede4"); },
  judgeBench(g: G, x: number, z: number) { B(g, 3.0, 1.3, 0.9, C("#7a4f33"), x, 0, z); B(g, 3.1, 0.08, 1.0, C("#5a3b2a"), x, 1.3, z); B(g, 0.08, 0.06, 0.3, C("#3a2a20"), x + 0.6, 1.38, z - 0.2); },
  flask(g: G, x: number, y: number, z: number, col = "#46d17a") { Cy(g, 0.03, 0.03, 0.12, C("#dfeef5"), x, y + 0.12, z, 10); const b = mesh(new THREE.ConeGeometry(0.1, 0.16, 14), glowCol(col)); b.position.set(x, y + 0.08, z); g.add(b); },
  wire(g: G, x0: number, x1: number, z: number) { const m = C("#3a332c"); for (let x = x0; x <= x1; x += 1.4) B(g, 0.06, 0.7, 0.06, C("#4a3a2a"), x, 0, z); for (const y of [0.3, 0.55]) { for (let x = x0; x < x1; x += 0.2) { const s = B(g, 0.2, 0.015, 0.015, m, x + 0.1, y + Math.sin(x * 9) * 0.03, z); s.rotation.z = Math.sin(x * 7) * 0.4; } } },
  handrail(g: G, x0: number, x1: number, y: number, z: number, col = "#e8823a") { B(g, x1 - x0, 0.06, 0.06, C(col), (x0 + x1) / 2, y, z); for (const x of [x0 + 0.1, x1 - 0.1]) B(g, 0.05, 0.12, 0.12, C("#5a6270"), x, y - 0.06, z + 0.04); },
};

// ---------------- the maps ----------------
// front: how far in front of the sit spot the seated drawing goes (just past the seat's front edge; 0.3 for a chair)
type Build = (g: THREE.Group, r: () => number, seed: number) => { spots?: Record<string, V3>; outdoor?: boolean; night?: boolean; seated?: boolean; front?: number };
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length) % xs.length];

const MAPS: Record<string, Build> = {
  // a prison cell: two-tone block walls, a bunk, a steel toilet and sink, a high barred window and its light
  cell(g, r) {
    const low = pick(r, ["#4f6fa3", "#5b7fb0", "#6b7d8f"]);
    room(g, { w: 6, zb: 2.6, h: 3.4, floor: T("cellfloor", 512, 512, carpet("#5e3f4a", "#4a3038"), 4, 4), wall: T("cellwall" + low, 512, 512, blocks("#e8e4d8", low, "#2c3a52"), 2, 1), ceil: C("#d8d4c8") });
    P_.bunk(g, -2.0, 1.5, 0, pick(r, ["#3f63b8", "#2f6b8f", "#4a5aa8"]));
    P_.toilet(g, 1.6, 2.2, Math.PI, true); P_.sink(g, 2.3, 2.3); P_.paper(g, 2.0, 0.7, 2.5);
    P_.window(g, 1.0, 2.75, 2.58, 0.7, 0.45, GLOW("sky", 256, 128, (c) => { c.fillStyle = "#cfe8ff"; c.fillRect(0, 0, 256, 128); }), C("#5a6270"), 4);
    P_.shelf(g, 2.2, 1.6, 2.45, 1.0, 3, 7);
    return { spots: { bed: [-2.0, 0.6, 1.5], sit: [0.3, 0.45, 0.5], dig: [0.9, 0, 0.6] } };
  },
  // a cell block: a corridor of barred cell fronts, ceiling lights and painted numbers
  cellblock(g, r) {
    room(g, { w: 7, zb: 6, zf: -14, h: 3.6, floor: T("cbfloor", 512, 512, tiles("#8c8f96", "#73767d", 4), 6, 12), wall: T("cbwall", 512, 512, blocks("#e6e2d6", "#5b6f8a", "#2c3a52"), 3, 1), ceil: C("#cfcac0") });
    for (let z = -10; z < 5; z += 2.6) { for (const s of [-1, 1]) { const g2 = new THREE.Group(); g2.position.set(s * 3.45, 0, z); g2.rotation.y = s * Math.PI / 2; g.add(g2); P_.bars(g2, -1.0, 1.0, 0, 2.6); } P_.lamp(g, 0, 3.55, z, 1.0); }
    P_.bars(g, -3.4, 3.4, 5.9, 3.4, 0.22);
    return { spots: { sit: [2.6, 0.45, 1.0] } };
  },
  // a bank lobby: marble, columns, a teller counter with glass, rope barriers
  banklobby(g, r) {
    room(g, { w: 10, zb: 4, h: 4.2, floor: T("marble", 512, 512, marble("#efe9dc", "#b8ac96"), 4, 6), wall: T("bankwall", 512, 512, panels("#e9dfc9", "#cbbd9f"), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, 0, 3.0, 6, "#f2ede4", "#7a4f33"); for (let x = -2.5; x <= 2.5; x += 1.25) B(g, 0.04, 0.9, 0.04, C("#b8892f"), x, 0.93, 3.0);
    P(g, 6, 0.9, new THREE.MeshBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.25, depthWrite: false }), 0, 1.38, 2.8);
    for (const x of [-4.2, 4.2]) for (const z of [-3, 1.5]) P_.column(g, x, z, 4.2);
    P_.rope(g, -2, 0, 0.8); P_.rope(g, 0.4, 2.4, 0.8); P_.plant(g, -3.6, 0, 3.4, 2.5); P_.clock(g, 0, 3.3, 3.95);
    return { spots: { sit: [-3.2, 0.45, -0.5] } };
  },
  // a bank vault: a great round door, walls of deposit boxes, cash on a cart, gold bars and money bags
  vault(g, r) {
    room(g, { w: 9, zb: 3.4, h: 4.2, floor: T("vaultfloor", 512, 512, marble("#d9d0bd", "#a8977a"), 3, 5), wall: T("vaultwall", 512, 512, panels("#b8bcc4", "#8a9098"), 3, 1), side: T("boxes", 512, 512, boxesGrid("#c9a13b", "#7a5f24"), 4, 2), ceil: C("#bfc3ca") });
    P_.vaultDoor(g, -0.6, 2.1, 3.3, 1.55);
    P_.cart(g, 2.6, 1.6); P_.moneyStack(g, 2.3, 0.8, 1.6, 6); P_.moneyStack(g, 2.4, 0.35, 1.6, 4);
    P_.goldBars(g, -3.4, 0, 1.4, 6); P_.moneyBag(g, -2.6, 2.2); P_.moneyBag(g, -3.2, 2.5);
    return { spots: { sit: [1.8, 0.45, 0.2] } };
  },
  // a space station cabin: grey panels, a round window onto Earth, handrails, an orange stripe, a sleeping bag
  spacecabin(g, r) {
    room(g, { w: 6, zb: 2.6, h: 3.2, floor: T("spfloor", 512, 512, panels("#4a5060", "#2e333e"), 3, 6), wall: T("spwall", 512, 512, panels("#5b6272", "#3a404c"), 3, 1), ceil: T("spceil", 512, 512, panels("#4a5060", "#2e333e"), 3, 6) });
    P_.roundWindow(g, 0.6, 1.9, 2.55, 0.9, GLOW("earth", 1024, 512, spaceView));
    P_.handrail(g, -2.6, 2.6, 1.05, 2.5); P_.handrail(g, -2.9, -1.0, 2.6, 1.0);
    B(g, 0.7, 1.8, 0.25, C("#5aa84f"), -2.4, 0.5, 2.3); P_.plant(g, 2.2, 1.0, 2.45);
    P_.monitor(g, -1.6, 1.3, 2.45, 2); P_.lamp(g, 0, 3.15, 0.5);
    return { spots: { sit: [-1.2, 0.45, 0.8], bed: [-2.4, 1.2, 2.1] } };
  },
  // the toilet on a space station: a checker floor, a big window onto Earth, the toilet and its paper
  spacetoilet(g, r) {
    room(g, { w: 5.5, zb: 2.4, h: 3.2, floor: T("chk", 512, 512, checker("#f4f4f0", "#1e1f24", 4), 4, 6), wall: T("spwall2", 512, 512, panels("#454b58", "#2e333e"), 3, 1), ceil: C("#3a404c") });
    P_.window(g, 0, 2.2, 2.38, 3.4, 1.4, GLOW("earth2", 1024, 512, spaceView), C("#6b7280"));
    B(g, 5.5, 0.08, 0.35, C("#7a5232"), 0, 1.35, 2.2);
    P_.toilet(g, 1.0, 1.6, Math.PI, false); P_.paper(g, 1.8, 1.0, 2.2); P_.plant(g, 2.0, 1.43, 2.25, 0.8); B(g, 0.08, 2.6, 0.08, C("#e8823a"), 2.6, 0.2, 2.2);
    return { seated: true, front: 0.45, spots: { sit: [1.0, 0.45, 1.6] } };
  },
  // mission control: rows of consoles, a big screen counting down, a clock strip, ceiling light panels
  control(g, r) {
    room(g, { w: 11, zb: 5, h: 4.4, floor: T("ctrlfloor", 512, 512, carpet("#2c3b78", "#22306a"), 6, 8), wall: T("ctrlwall", 512, 512, panels("#28324f", "#1c2338"), 3, 1), ceil: T("ctrlceil", 512, 512, tiles("#3a4a7a", "#2a375e", 4), 4, 6) });
    const n = String(Math.floor(r() * 9) + 1);
    P_.bigScreen(g, 0, 2.7, 4.9, 5.6, 2.2, GLOW("cd" + n, 1024, 512, countdown(n, pick(r, ["LAUNCH WINDOW", "T-MINUS", "DOCKING", "COUNTDOWN"]))));
    P(g, 6, 0.36, GLOW("clocks", 1024, 64, (c) => { c.fillStyle = "#0b0f1a"; c.fillRect(0, 0, 1024, 64); c.fillStyle = "#ffb43a"; c.font = "700 40px monospace"; c.fillText("0 1204:17:35   164:1:59   12:02", 30, 46); }), 0, 4.05, 4.88);
    P_.console(g, -2.6, 2.2, 2.4, 3); P_.console(g, 2.6, 2.2, 2.4, 5); P_.console(g, -4.2, -3.4, 2.2, 7); P_.console(g, 4.2, -3.4, 2.2, 9);
    for (let z = -4; z < 5; z += 2) P_.lamp(g, 0, 4.35, z, 2.4);
    return { spots: { sit: [-2.6, 0.45, 1.4], type: [-2.6, 0, 1.5] } };
  },
  // a cockpit: two seats, consoles and a windshield full of stars
  cockpit(g, r) {
    room(g, { w: 5, zb: 2.4, h: 2.8, floor: T("ckfloor", 512, 512, panels("#3a404c", "#22262e"), 3, 5), wall: T("ckwall", 512, 512, panels("#4a5060", "#2e333e"), 2, 1), ceil: C("#2e333e") });
    P_.window(g, 0, 1.9, 2.38, 4.2, 1.3, GLOW("stars", 1024, 512, starView), C("#2e333e"));
    B(g, 4.6, 0.9, 0.7, C("#3c4250"), 0, 0, 2.0); for (let k = 0; k < 4; k++) P_.monitor(g, -1.5 + k, 0.9, 1.85, k + 11);
    P_.seat(g, -0.9, 0.9); P_.seat(g, 0.9, 0.9);
    return { seated: true, front: 0.4, spots: { sit: [-0.9, 0.48, 0.8] }, night: true };
  },
  classroom(g, r) {
    room(g, { w: 9, zb: 3, h: 3.4, floor: T("clsfloor", 512, 512, planksFloor("#c99a66", "#bb8c5a"), 4, 6), wall: T("clswall", 512, 512, blocks("#f1ead6", pick(r, ["#6f9a6a", "#7a8fb8", "#c9a06a"]), "#4a5a3a"), 3, 1), ceil: C("#efe9dc") });
    P_.board(g, 0, 1.0, 2.95, 4, 1.4); P_.clock(g, 3.2, 2.9, 2.95); P_.desk(g, 2.8, 1.6, 1.6, 0.8);
    for (const x of [-3, -1.2]) for (const z of [-1.5, -3.5]) { P_.schoolDesk(g, x, z); P_.chair(g, x, z - 0.5, Math.PI); }
    for (const x of [1.6, 3.2]) for (const z of [-1.5, -3.5]) { P_.schoolDesk(g, x, z); P_.chair(g, x, z - 0.5, Math.PI); }
    const side = new THREE.Group(); side.position.set(4.48, 0, 0); side.rotation.y = -Math.PI / 2; g.add(side);
    P_.window(side, 0, 1.8, 0, 2.4, 1.2, GLOW("skyline", 1024, 512, skyline));
    return { seated: true, spots: { sit: [-1.2, 0.45, -2.0] } };
  },
  office(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.2, floor: T("offfloor", 512, 512, carpet("#7d8792", "#6d7782"), 6, 8), wall: T("offwall", 512, 512, panels("#e9eef4", "#c9d1db"), 3, 1), ceil: C("#f2f4f7") });
    P_.window(g, 0, 1.9, 3.38, 7, 1.8, GLOW("skyline2", 1024, 512, skyline), C("#c9d1db"));
    for (const x of [-3, 0, 3]) { P_.desk(g, x, 1.4, 1.6, 0.8); P_.monitor(g, x, 0.8, 1.55, Math.floor(x + 9)); P_.chair(g, x, 0.8, Math.PI); }
    P_.waterCooler(g, 4.3, 2.8); P_.plant(g, -4.3, 0, 2.9, 3);
    return { seated: true, spots: { sit: [0, 0.45, 0.8], type: [0, 0, 0.9] } };
  },
  kitchen(g, r) {
    room(g, { w: 8, zb: 3, h: 3.2, floor: T("kfloor", 512, 512, checker("#f4f1ea", pick(r, ["#c8102e", "#2f6b8f", "#2b2f38"]), 6), 4, 6), wall: T("kwall", 512, 512, tiles("#f6f2ea", "#ddd5c6", 10), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, -1.2, 2.6, 4.4); P_.stove(g, 1.4, 2.6); P_.fridge(g, 2.8, 2.6);
    for (let k = 0; k < 4; k++) B(g, 1.0, 0.8, 0.4, C(pick(r, ["#e9876b", "#7fb3d9", "#f2d06b"])), -3.0 + k * 1.1, 2.0, 2.8);
    P_.table(g, -1.5, -0.6, 1.2, 0.8, "#c79260"); P_.chair(g, -2.3, -0.6, Math.PI / 2, "#a8724a"); P_.chair(g, -0.7, -0.6, -Math.PI / 2, "#a8724a");
    return { seated: true, spots: { sit: [-2.3, 0.45, -0.6], eat: [-1.5, 0.78, -0.6] } };
  },
  diner(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.4, floor: T("dfloor", 512, 512, checker("#f4f1ea", "#1e1f24", 6), 5, 8), wall: T("dwall", 512, 512, blocks("#fbe9c8", "#c8102e", "#f4f1ea"), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, 1.6, 2.7, 5, "#c9ced6", "#c8102e"); for (let x = -0.6; x < 4; x += 0.9) P_.stool(g, x, 1.9);
    P_.booth(g, -3.4, 1.6); P_.booth(g, -3.4, -1.4);
    P_.frame(g, 1.6, 2.6, 3.35, 3, 0.7, GLOW("menu", 512, 128, (c) => { c.fillStyle = "#1e1f24"; c.fillRect(0, 0, 512, 128); c.fillStyle = "#ffd24a"; c.font = "700 40px Arial"; c.fillText("BURGERS  SHAKES  FRIES", 24, 78); }));
    return { seated: true, spots: { sit: [-0.6, 0.7, 1.9], eat: [-3.4, 0.78, 1.0] } };
  },
  livingroom(g, r) {
    room(g, { w: 9, zb: 3, h: 3.2, floor: T("lfloor", 512, 512, planksFloor("#b07a4a", "#9e6c40"), 4, 6), wall: T("lwall", 512, 512, blocks(pick(r, ["#f3ddb0", "#d9e6f2", "#e8d8f0"]), "#c9935e", "#8a5a3c"), 3, 1), ceil: C("#f2ede4") });
    P_.sofa(g, -1.0, 2.2, pick(r, ["#5b7fd6", "#c8102e", "#46b07a"])); P_.tv(g, 2.8, 0.6, 2.9); B(g, 1.6, 0.6, 0.5, C("#6b4a2e"), 2.8, 0, 2.7);
    P_.bookshelf(g, -3.8, 2.6, 4); P_.plant(g, 4.0, 0, 2.6, 2.4); P_.window(g, 0.8, 2.0, 2.98, 1.8, 1.1, GLOW("skyday", 1024, 512, skyline));
    const rug = mesh(new THREE.PlaneGeometry(3.4, 2.2), C("#d9534f"), false); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.5, 0.01, 0.8); g.add(rug);
    return { seated: true, front: 0.5, spots: { sit: [-1.0, 0.45, 2.1] } };
  },
  bedroom(g, r) {
    room(g, { w: 8, zb: 3, h: 3.0, floor: T("bfloor", 512, 512, carpet("#b8a6d9", "#a896c9"), 4, 6), wall: T("bwall", 512, 512, blocks(pick(r, ["#cfe3f5", "#f5d9cf", "#e3f5cf"]), "#7a8fb8", "#4a5a8a"), 3, 1), ceil: C("#f2ede4") });
    P_.bed(g, -1.4, 1.6, Math.PI / 2, pick(r, ["#7fb3d9", "#e5484d", "#f0b429"])); B(g, 0.5, 0.6, 0.45, C("#8a5a3c"), -0.4, 0, 2.6); B(g, 0.2, 0.3, 0.2, glowCol("#ffe8a8"), -0.4, 0.6, 2.6);
    P_.frame(g, 1.6, 1.9, 2.97, 1.0, 1.3, GLOW("poster", 256, 256, painting("#5b7fd6", "#f2a65a"))); B(g, 1.2, 2.0, 0.6, C("#a8724a"), 3.2, 0, 2.5);
    return { seated: true, spots: { bed: [-1.4, 0.5, 1.6], sit: [-0.8, 0.45, 0.6] } };
  },
  hospital(g, r) {
    room(g, { w: 8, zb: 3, h: 3.2, floor: T("hfloor", 512, 512, tiles("#d8e6ea", "#c2d2d7", 6), 4, 6), wall: T("hwall", 512, 512, blocks("#eef6f7", "#9fcfd8", "#6fa9b6"), 3, 1), ceil: C("#f4f8fa") });
    P_.bed(g, 0.6, 1.5, Math.PI / 2, "#7fb3d9"); P_.heartMonitor(g, 2.0, 1.2, 2.5); P_.ivStand(g, -0.4, 2.0);
    B(g, 0.6, 0.9, 0.5, C("#e8ebf0"), 2.8, 0, 2.6); for (let k = 0; k < 6; k++) P(g, 0.4, 2.6, C(k % 2 ? "#9ccfd8" : "#8ec4ce"), -3.6 + k * 0.42, 1.5, 0.5 + k * 0.05, Math.PI / 2);
    return { spots: { bed: [0.6, 0.5, 1.5], sit: [-1.2, 0.45, 0.8] } };
  },
  lab(g, r) {
    room(g, { w: 9, zb: 3, h: 3.2, floor: T("labfloor", 512, 512, tiles("#e3eef2", "#cbd8dd", 6), 4, 6), wall: T("labwall", 512, 512, panels("#e9eef2", "#c9d1d8"), 3, 1), ceil: C("#f4f8fa") });
    P_.counter(g, 0, 2.5, 7, "#2e3440", "#dde3e8"); for (let k = 0; k < 7; k++) P_.flask(g, -3 + k, 0.93, 2.5, pick(r, ["#46d17a", "#4ca9f0", "#f05fa0", "#f0b429", "#9b6cf0"]));
    P_.monitor(g, 2.4, 0.93, 2.6, 21); P_.shelf(g, -2.2, 2.0, 2.85, 2.0, 6, 31); P_.shelf(g, 2.0, 2.0, 2.85, 2.0, 6, 37);
    return { spots: { sit: [2.0, 0.7, 1.6], type: [2.4, 0, 1.9] } };
  },
  courtroom(g, r) {
    room(g, { w: 10, zb: 3.6, h: 4.0, floor: T("crfloor", 512, 512, carpet("#7a2a2a", "#6a2222"), 4, 6), wall: T("crwall", 512, 512, panels("#a8724a", "#7a4f33"), 3, 1), ceil: C("#e9dfc9") });
    P_.judgeBench(g, 0, 3.0); P_.chair(g, 0, 3.4, Math.PI, "#3a2a20"); B(g, 1.2, 1.0, 0.8, C("#7a4f33"), 3.2, 0, 2.4);
    P_.bench(g, -2.6, -1.4, 2.6); P_.bench(g, 2.6, -1.4, 2.6); P_.bench(g, -2.6, -3.0, 2.6); P_.bench(g, 2.6, -3.0, 2.6);
    P_.clock(g, 0, 3.4, 3.55);
    return { seated: true, spots: { sit: [-2.6, 0.45, -1.4] } };
  },
  museum(g, r) {
    room(g, { w: 11, zb: 3.4, h: 4.0, floor: T("mfloor", 512, 512, planksFloor("#9c7350", "#8c6646"), 5, 7), wall: T("mwall", 512, 512, blocks("#e2d6bf", "#cbbb9c", "#a8977a"), 3, 1), ceil: C("#efe9dc") });
    P_.frame(g, -3.2, 2.2, 3.38, 1.6, 1.2, GLOW("art1", 256, 256, painting("#3e6fa8", "#e8c15a"))); P_.frame(g, 0, 2.3, 3.38, 1.8, 1.6, GLOW("art2", 256, 256, painting("#7e4e9c", "#f08a5d"))); P_.frame(g, 3.2, 2.2, 3.38, 1.6, 1.2, GLOW("art3", 256, 256, painting("#2f8f6a", "#f2e3a0")));
    B(g, 0.7, 1.0, 0.7, C("#f2eee6"), -1.6, 0, 1.6); S(g, 0.28, C("#c46a3a"), -1.6, 1.3, 1.6, 1.4); B(g, 0.7, 1.0, 0.7, C("#f2eee6"), 1.6, 0, 1.6); S(g, 0.3, C("#e9e4da"), 1.6, 1.4, 1.6);
    P_.rope(g, -3.4, -2.0, 2.4); P_.rope(g, 2.0, 3.4, 2.4);
    return { spots: { sit: [3.8, 0.45, 0.5] } };
  },
  castle(g, r) {
    room(g, { w: 10, zb: 5, h: 5.5, floor: T("castfloor", 512, 512, tiles("#a8a092", "#8a8274", 4), 5, 8), wall: T("castwall", 512, 512, blocks("#b8b2a6", "#a8a092", "#8a8274"), 3, 2), ceil: C("#6b6358") });
    const carpet_ = mesh(new THREE.PlaneGeometry(2, 16), C("#c8102e"), false); carpet_.rotation.x = -Math.PI / 2; carpet_.position.set(0, 0.01, -3); g.add(carpet_);
    P_.throne(g, 0, 4.0); for (const x of [-3.5, 3.5]) { P_.banner(g, x, 3.0, 4.95, pick(r, ["#c8102e", "#2f4fa8", "#2e7d4f"])); P_.torch(g, x * 0.6, 2.0, 4.9); P_.column(g, x, 0, 5.5); }
    return { seated: true, front: 0.55, spots: { sit: [0, 0.82, 3.8] } };
  },
  shop(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.4, floor: T("sfloor", 512, 512, tiles("#eef0f3", "#d4d8de", 6), 5, 8), wall: T("swall", 512, 512, blocks("#f6e6a6", "#e9876b", "#c8102e"), 3, 1), ceil: C("#f4f4f0") });
    P_.storeShelf(g, -3, 2.9, 3); P_.storeShelf(g, 0, 2.9, 9); P_.storeShelf(g, -3.6, -1, 13, Math.PI / 2);
    P_.counter(g, 3.0, 1.0, 2.4, "#2e3440", "#e8ebf0"); P_.register(g, 3.2, 0.93, 1.0);
    for (let k = 0; k < 3; k++) P_.lamp(g, -2 + k * 2.5, 3.35, 0.5, 1.6);
    return { spots: { sit: [2.4, 0.45, 2.0] } };
  },
  // a mine tunnel: dirt walls, timber frames, lanterns, a rail track and a cart; a hole to dig
  tunnel(g, r) {
    room(g, { w: 5, zb: 6, zf: -14, h: 3.0, floor: T("tfloor", 512, 512, dirt("#7a5a3a", "#5e4430"), 3, 10), wall: T("twall", 512, 512, dirt("#8a6a4a", "#6b4f35"), 3, 2), ceil: T("tceil", 512, 512, dirt("#6b4f35", "#5a422c"), 3, 10) });
    for (let z = -10; z < 6; z += 2.5) { B(g, 0.2, 2.9, 0.2, C("#7a5232"), -2.3, 0, z); B(g, 0.2, 2.9, 0.2, C("#7a5232"), 2.3, 0, z); B(g, 4.8, 0.2, 0.2, C("#7a5232"), 0, 2.85, z); P_.lantern(g, 2.15, 2.0, z + 0.2); }
    P_.railTrack(g, -1.4, -12, 6); P_.mineCart(g, -1.4, 2.6); P_.pickaxe(g, 1.6, 2.2); P_.hole(g, 1.0, 0.8, 0.6);
    return { spots: { dig: [1.0, 0, 0.8] }, night: true };
  },
  // a trench on a battlefield: sandbag walls, duckboards, barbed wire, mud, a smoky sky
  trench(g, r) {
    const ground = T("mud", 512, 512, dirt("#6b5b45", "#4e4232"), 8, 8);
    P(g, 40, 40, ground, 0, 0, 0, 0, -Math.PI / 2);
    for (let z = -12; z < 6; z += 0.6) B(g, 1.4, 0.04, 0.12, C("#7a5a3a"), 0, 0, z);
    P_.sandbags(g, -6, 6, 2.6, 4); P_.sandbags(g, -6, -1.2, -1.2, 2); P_.sandbags(g, 1.6, 6, -1.2, 2);
    P_.wire(g, -6, 6, 5.0); for (let k = 0; k < 4; k++) P_.crate(g, -4 + k * 2.6, 3.6 + (k % 2), 0.5, "#6b5b45");
    for (const [x, z] of [[-5, 9], [3, 12], [7, 8]]) { Cy(g, 0.12, 0.16, 2.6, C("#2e2620"), x, 0, z, 6); }
    return { spots: { dig: [1.2, 0, 1.0], sit: [-2.0, 0.4, 1.6] }, outdoor: true };
  },
  camp(g, r) {
    P(g, 40, 40, T("forestgr", 512, 512, dirt("#5f9a4a", "#4f8a3e"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    P_.tent(g, -2.4, 2.6, pick(r, ["#e8823a", "#3f7fd9", "#46b07a"])); P_.campfire(g, 0.8, 1.0); P_.log(g, 0.8, 0.2, 0); P_.log(g, 1.9, 1.2, 0.08);
    for (let k = 0; k < 10; k++) P_.pine(g, -8 + k * 1.8 + r(), 6 + r() * 6, 1.1 + r() * 0.8);
    return { seated: true, spots: { sit: [1.9, 0.32, 1.2] }, outdoor: true };
  },
  beach(g, r) {
    P(g, 40, 22, T("sand", 512, 512, dirt("#efd9a0", "#e2c78a"), 8, 5), 0, 0, -2, 0, -Math.PI / 2);
    const sea = mesh(new THREE.PlaneGeometry(80, 30), C("#2f9ad0"), false); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.02, 22); g.add(sea);
    P_.umbrella(g, -2.0, 2.0); const towel = mesh(new THREE.PlaneGeometry(0.9, 1.8), C("#e5484d"), false); towel.rotation.x = -Math.PI / 2; towel.position.set(-1.2, 0.01, 1.2); g.add(towel);
    P_.tree(g, 4.0, 3.0, 1.3, "#4caf50"); P_.crate(g, 2.4, 2.0, 0.5, "#c79260");
    return { spots: { bed: [-1.2, 0.05, 1.2] }, outdoor: true };
  },
  desert(g, r) {
    P(g, 50, 50, T("dsand", 512, 512, dirt("#e8c48a", "#d9b06e"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    for (let k = 0; k < 6; k++) { const d = S(g, 3 + r() * 2, C("#e2b56a"), -12 + k * 5, -1.5, 12 + r() * 6, 0.4); d.receiveShadow = true; }
    P_.cactus(g, -2.6, 2.0); P_.cactus(g, 3.4, 4.0); P_.rock(g, 1.6, 1.4, 0.5, "#b8864f"); P_.rock(g, -4, 4, 0.7, "#a8784a");
    return { seated: true, front: 0.55, spots: { sit: [1.6, 0.45, 1.4] }, outdoor: true };
  },
  farm(g, r) {
    P(g, 50, 50, T("farmgr", 512, 512, dirt("#79b85a", "#6aa84f"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    B(g, 5, 3.4, 4, C("#b8322a"), -2.5, 0, 7); const roof_ = mesh(new THREE.ConeGeometry(3.6, 1.6, 4), C("#5a3b2a")); roof_.position.set(-2.5, 4.2, 7); roof_.rotation.y = Math.PI / 4; g.add(roof_);
    P(g, 1.4, 2.0, C("#f4f1ea"), -2.5, 1.0, 4.98);
    P_.fence(g, -6, 6, 2.6); P_.hay(g, 2.4, 1.6); P_.hay(g, 3.6, 2.2); P_.tree(g, 5.2, 6, 1.4);
    return { seated: true, front: 0.55, spots: { sit: [2.4, 1.0, 1.6] }, outdoor: true };
  },
};
/** maps that have no ceiling show the sky; the rest are rooms */
export const SET_NAMES = Object.keys(MAPS);

const slots = new Map<string, SetInfo>();
let nextSlot = 0;
/** the map `id` built once per seed, placed in its own slot far from the town */
export function setFor(id: string, seed = 1, parent?: THREE.Object3D): SetInfo | null {
  const make = MAPS[id]; if (!make) return null;
  const key = `${id}|${seed}`;
  let s = slots.get(key);
  if (!s) {
    const root = new THREE.Group(); root.name = "set_" + id;
    const x = 2000 + (nextSlot++) * 120;
    root.position.set(x, D0, 0);
    const r = rng(seed * 7919 + id.length * 131);
    const info = make(root, r, seed) || {};
    // someone sits where the map has no seat of its own: a chair goes there, its back away from the lens
    const sp = info.spots?.sit;
    if (sp && !info.seated) P_.chair(root, sp[0], sp[2], 0, pick(r, ["#3a3f4b", "#5a6270", "#7a4f33"]));
    s = { id, root, origin: [x, D0, 0], spots: info.spots || {}, outdoor: !!info.outdoor, night: !!info.night, front: info.front ?? 0.3 };
    slots.set(key, s);
    if (parent) parent.add(root);
  } else if (parent && s.root.parent !== parent) parent.add(s.root);
  return s;
}
/** 2.0, the 3D tab: the map built at the origin of its own scene, turned so its open front faces a lens that looks
 *  along -z (the 3D engine's convention); spots come back in that scene's coordinates */
export function buildMapLocal(id: string, seed = 1): { root: THREE.Group; spots: Record<string, V3>; outdoor: boolean } | null {
  const make = MAPS[id]; if (!make) return null;
  const inner = new THREE.Group(), root = new THREE.Group(); root.add(inner); root.rotation.y = Math.PI; root.name = "map_" + id;
  const r = rng(seed * 7919 + id.length * 131);
  const info = make(inner, r, seed) || {};
  const sp = info.spots?.sit;
  if (sp && !info.seated) P_.chair(inner, sp[0], sp[2], 0, pick(r, ["#3a3f4b", "#5a6270", "#7a4f33"]));
  const spots: Record<string, V3> = {};
  for (const [k, v] of Object.entries(info.spots || {})) spots[k] = [-v[0], v[1], -v[2]];
  return { root, spots, outdoor: !!info.outdoor };
}
/** world position of a spot in a map */
export const spotIn = (s: SetInfo, name: string, fallback: V3 = [0, 0, 0]): V3 => {
  const p = s.spots[name] || fallback; return [s.origin[0] + p[0], s.origin[1] + p[1], s.origin[2] + p[2]];
};
export function disposeSets() {
  for (const s of slots.values()) { s.root.removeFromParent(); s.root.traverse((o: any) => { o.geometry?.dispose?.(); }); }
  slots.clear(); nextSlot = 0;
}
