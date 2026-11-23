// src/maps3d.ts
import * as THREE5 from "three";

// src/sets.ts
import * as THREE4 from "three";

// src/build.ts
import * as THREE3 from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// src/story.ts
var FPS = 30;
var TOTAL = 2025;
var D0 = 6;
var PARK = [70, D0, -75];
var clamp01 = (x) => Math.max(0, Math.min(1, x));
var front = (tau) => 26 - 1.6 * (tau - 4.4);
var SHOTS = [
  { id: 1, a: 0, b: 130, light: "day", crowd: "march", tau: (t) => 29.5 + t },
  { id: 2, a: 130, b: 283, light: "day", crowd: "march", tau: (t) => t, towns: true },
  { id: 3, a: 283, b: 444, light: "day", crowd: "march", tau: (t) => t },
  { id: 4, a: 444, b: 534, light: "day", crowd: "march", tau: (t) => t },
  { id: 5, a: 534, b: 643, light: "day", crowd: "march", tau: (t) => t },
  { id: 6, a: 643, b: 823, light: "day", crowd: "march", tau: (t) => t },
  { id: 7, a: 823, b: 987, light: "day", crowd: "march", tau: (t) => t },
  { id: 8, a: 987, b: 1134, light: "day", crowd: "fall", tau: (t) => t },
  { id: 9, a: 1134, b: 1212, light: "day", crowd: "water", tau: (t) => t },
  { id: 10, a: 1212, b: 1303, light: "day", crowd: "water", tau: (t) => t },
  { id: 11, a: 1303, b: 1411, light: "golden", crowd: "none", tau: (t) => t },
  { id: 12, a: 1411, b: 1620, light: "golden", crowd: "none", tau: (t) => t },
  { id: 13, a: 1620, b: 1735, light: "golden", crowd: "march", tau: (t) => t - 31 },
  { id: 14, a: 1735, b: 1863, light: "day", crowd: "bank", tau: (t) => t },
  { id: 15, a: 1863, b: TOTAL, light: "day", crowd: "tourists", tau: (t) => t, towns: true }
];
var glide = (u) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};
var T = (f) => f / FPS;
var Fz = (id, f) => front(SHOTS[id - 1].tau(T(f)));
var pushK = (f, f0, rate, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
var dolly = (pos, look, k, rest = {}) => ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
var zoom = (pos, look, fov, k, rest = {}) => ({ pos, look, fov: 360 / Math.PI * Math.atan(Math.tan(fov * Math.PI / 360) * k), ...rest });
var rolled = (s, roll) => (f) => ({ ...s(f), roll });
var ANCHOR = [-2.7, D0 + 0.62, -37];
var S1a = (f) => {
  const F = Fz(1, f);
  return dolly([7.5, D0 + 2.6, F - 13], [0, D0 + 2.4, F + 5], pushK(f, 0, 25e-4), { fov: 44 });
};
var S1b = (f) => {
  const F = Fz(1, f);
  return dolly([1.4, D0 + 1.4, F - 7.2], [0, D0 + 1.7, F + 1.5], pushK(f, 30, 2e-3), { fov: 40, roll: -0.04 });
};
var S1c = (f) => {
  const F = Fz(1, f);
  return dolly([-0.9, D0 + 0.4, F - 4.2], [0, D0 + 0.55, F + 0.8], pushK(f, 72, 3e-3), { fov: 38, roll: 0.04 });
};
var S2a = (f) => zoom([17, 13, -52], [0, 9, 4], 44, pushK(f, 126, 2e-3));
var S2b = (f) => zoom([10, 10.5, -42], [0, 8, 8], 42, pushK(f, 181, 2e-3));
var S2c = (f) => zoom([5, 10, -31], [0, 8.6, 30], 40, pushK(f, 237, 15e-4, 6e-3, 35));
var S3a = (f) => {
  const F = Fz(3, f);
  return dolly([1.1, D0 + 1.45, F - 6.2], [0, D0 + 1.3, F + 0.6], pushK(f, 283, 25e-4));
};
var S3b = (f) => {
  const F = Fz(3, f);
  return dolly([0.5, D0 + 0.36, F - 3.5], [0, D0 + 0.3, F + 0.4], pushK(f, 333, 18e-4), { fov: 36 });
};
var S4a = (f) => {
  const F = Fz(4, f);
  return dolly([13, D0 + 2.4, F + 7], [0, D0 + 1.2, F + 7], pushK(f, 444, 2e-3));
};
var S4b = (f) => {
  const F = Fz(4, f);
  return dolly([9.5, D0 + 1.2, F + 5.5], [0, D0 + 0.95, F + 5.5], pushK(f, 497, 15e-4, 6e-3, 30), { fov: 38, roll: -0.035 });
};
var S5a = (f) => {
  const F = Fz(5, f);
  return dolly([0.3, D0 + 1.8, F - 4.7], [0, D0 + 1.55, F + 1.2], pushK(f, 534, 25e-4), { fov: 38 });
};
var S5b = (f) => {
  const F = Fz(5, f);
  return dolly([-0.5, D0 + 1.7, F - 3.5], [0, D0 + 1.6, F + 0.6], pushK(f, 576, 2e-3), { fov: 36, roll: 0.04 });
};
var S6a = (f) => {
  const F = Fz(6, f);
  return dolly([0.8, D0 + 1.95, F - 2.5], [0.55, D0 + 1.85, F], pushK(f, 643, 3e-3), { fov: 34 });
};
var S6b = (f) => {
  const F = Fz(6, f);
  return dolly([5.5, D0 + 5.5, F - 9], [0, D0 + 0.8, F + 7], pushK(f, 717, 2e-3), { fov: 44, roll: -0.03 });
};
var S6c = (f) => {
  const F = Fz(6, f);
  return zoom([3, D0 + 1.1, F - 6.2], [0, D0 + 0.8, F + 2], 40, pushK(f, 754, 3e-3), { roll: 0.04 });
};
var S7a = (f) => {
  const F = Fz(7, f);
  return zoom([-3, D0 + 1.4, F - 11], [0, D0 + 1.7, F + 3], 46, pushK(f, 823, 2e-3), { roll: -0.03 });
};
var S7b = (f) => {
  const F = Fz(7, f);
  return dolly([-5.4, D0 + 4.6, F - 2], [-2.7, D0 + 3.4, F + 2.5], pushK(f, 871, 3e-3), { fov: 40, roll: 0.02 });
};
var S7c = (f) => {
  const F = Fz(7, f);
  return dolly([0, D0 + 1.8, F - 3.7], [0, D0 + 1.75, F + 0.3], pushK(f, 925, 25e-4), { fov: 36 });
};
var S8a = (f) => dolly([-2.35, D0 + 1.25, -38.9], [ANCHOR[0], ANCHOR[1] + 0.3, ANCHOR[2]], pushK(f, 987, 25e-4, 6e-3, 35), { fov: 34 });
var S8b = (f) => {
  const u = glide((f - 1039) / 22);
  return { pos: [0.9, D0 + 2.2 + 0.3 * u, -41.2 - 0.4 * u], look: [-2.9 - 0.2 * u, ANCHOR[1] + 1.6 + 1 * u, -35 + 1.2 * u], fov: 38, roll: 0.04 };
};
var S8c = (f) => dolly([4.5, 15, -45], [0, 3.2, -14], pushK(f, 1062, 25e-4), { fov: 42 });
var S8d = (f) => dolly([7.5, 2.4, -25], [0, 2, -17.5], pushK(f, 1099, 2e-3), { fov: 44, roll: -0.04 });
var S9a = (f) => dolly([1.5, 0.55, -24.6], [0, 0.62, -18], pushK(f, 1128, 18e-4), { fov: 40, roll: -0.03 });
var S10a = (f) => dolly([0.9, 0.5, -24.2], [0, 0.65, -19], pushK(f, 1208, 18e-4), { fov: 37, roll: 0.04 });
var S11a = (f) => zoom([14, 10.5, -47], [-1, 7, -4], 40, pushK(f, 1295, 16e-4));
var S12a = (f) => dolly([PARK[0] + 0.55, D0 + 1.5, PARK[2] - 8], [PARK[0] + 0.55, D0 + 1.75, PARK[2]], pushK(f, 1405, 1e-3), { fov: 40 });
var S12b = (f) => dolly([PARK[0] - 1.6, D0 + 1.9, PARK[2] - 9.5], [PARK[0] + 0.4, D0 + 1.95, PARK[2]], pushK(f, 1546, 15e-4), { fov: 42 });
var S13a = (f) => {
  const F = Fz(13, f);
  return dolly([5.75, D0 + 2.45, F + 3.1], [0, D0 + 1.5, F + 6.5], pushK(f, 1614, 2e-3), { fov: 44 });
};
var S13b = (f) => {
  const F = Fz(13, f);
  return dolly([4.8, D0 + 2.45, F + 4], [0, D0 + 1.3, F + 4], pushK(f, 1685, 25e-4), { fov: 40 });
};
var S14a = (f) => dolly([-4.7, D0 + 1.5, -40.4], [-4.6, D0 + 0.85, -33], pushK(f, 1729, 2e-3), { fov: 42 });
var S14b = (f) => zoom([1.3, D0 + 1.6, -36.6], [2.9, D0 + 1.3, -31.2], 42, pushK(f, 1770, 25e-4, 4e-3, 24));
var S15a = (f) => dolly([1.7, D0 + 1.75, -15.5], [0, D0 + 1.5, -9], pushK(f, 1857, 25e-4), { fov: 40 });
var S15b = (f) => dolly([-1.3, D0 + 1.6, -13], [0, D0 + 1.5, -7.5], pushK(f, 1890, 15e-4, 6e-3, 32), { fov: 38 });
var CRANE = [[0, 18, -16], [17, 15, -44], [0, 7, 2]];
var S15c = (f) => {
  const a = S15b(1932), s = glide((f - 1932) / 93), r = 1 - s, [C2, B2, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C2[i] + s * s * B2[i]),
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s),
    fov: (a.fov ?? 40) + (44 - (a.fov ?? 40)) * s,
    roll: 0
  };
};
var CAMS = {
  1: [
    { f: 0, s: S1a },
    { f: 30, dur: 37, s: S1b },
    // centred on 48 ("knock down"), 129 px + 64 % zoom
    { f: 72, dur: 32, s: S1c }
    // centred on 88 ("just"), roll -0.04 -> +0.04 (4.6 deg)
  ],
  2: [
    { f: 126, s: S2a },
    { f: 181, dur: 18, s: S2b },
    { f: 237, dur: 18, s: S2c }
  ],
  3: [
    { f: 283, s: S3a },
    // cut (the copy of shot 2's framing is gone)
    { f: 333, dur: 40, s: S3b }
    // centred on 353 ("every boot")
  ],
  4: [
    { f: 444, s: S4a },
    // cut on "Halfway"
    { f: 497, cut: true, s: S4b },
    // cut on "bouncing"
    { f: 497, dur: 20, s: rolled(S4b, 0.035) }
    // roll 4 deg through level
  ],
  5: [
    { f: 534, s: S5a },
    // cut on "A normal person"
    { f: 576, dur: 18, s: S5b },
    // centred on 585, roll 0 -> 0.04
    { f: 600, dur: 20, s: rolled(S5b, -0.035) }
    // "think it's hilarious": roll back 4.3 deg
  ],
  6: [
    { f: 643, s: S6a },
    // cut to the whistler
    { f: 717, cut: true, s: S6b },
    // cut up over the column on "whole column"
    { f: 754, dur: 29, s: S6c }
    // centred on 768
  ],
  7: [
    { f: 823, s: S7a },
    // cut on "The bounce gets bigger"
    { f: 871, cut: true, s: S7b },
    // cut on "chains"
    { f: 925, cut: true, s: S7c }
    // cut on "nobody"
  ],
  8: [
    { f: 987, s: S8a },
    // cut to the bolt
    { f: 1039, cut: true, s: S8b },
    // cut on the snap (+ kick); the end whips up through the frame, the lens tilts after it
    { f: 1062, cut: true, s: S8c },
    // cut to the aerial
    { f: 1099, cut: true, s: S8d }
    // "drops": down to the water (+ kick at the slam)
  ],
  9: [
    { f: 1128, s: S9a },
    { f: 1208, dur: 18, s: S10a }
    // centred on 1217 ("Unluckily"), runs across the invisible 9 -> 10 change
  ],
  11: [{ f: 1295, s: S11a }],
  12: [
    { f: 1405, s: S12a },
    { f: 1546, dur: 28, s: S12b }
    // centred on 1560 ("higher and higher" pull-back)
  ],
  13: [
    { f: 1614, s: S13a },
    { f: 1685, cut: true, s: S13b }
    // cut on "pushing"
  ],
  14: [
    { f: 1729, s: S14a },
    { f: 1770, cut: true, s: S14b }
    // cut to the officer
  ],
  15: [
    { f: 1857, s: S15a },
    { f: 1890, dur: 30, s: S15b },
    // centred on 1905 ("best drilled")
    { f: 1932, cut: true, s: S15c }
    // crane pull-out on its own curved path, starts where S15b is (fastest ~1978, whoosh at 1962 mid-acceleration)
  ]
};
CAMS[10] = CAMS[9];
var eyes = (id) => (f) => [0, D0 + 1.6, Fz(id, f)];
var boots = (id) => (f) => [0, D0 + 0.3, Fz(id, f)];
var DOF = [
  { f: 0, cInf: 15, focus: eyes(1) },
  // hook wide: front row sharp, town as soft as the f650 close-up (~13 px)
  { f: 30, dur: 37, cInf: 15, focus: eyes(1) },
  // eye-level MS of the front row
  { f: 72, dur: 32, cInf: 15, focus: boots(1) },
  // boot level
  { f: 130, cInf: 0 },
  // town aerial (establishing, under the flash)
  { f: 333, dur: 40, cInf: 14, focus: boots(3) },
  // boots CU (ramps with the glide down)
  { f: 444, cInf: 0 },
  // side views
  { f: 534, cInf: 10, focus: eyes(5) },
  // MS faces "a normal person would slow down"
  { f: 576, dur: 18, cInf: 12, focus: eyes(5) },
  // closer MS "these guys think it's hilarious"
  { f: 643, cInf: 14 },
  // whistler CU, focus = look (his face)
  { f: 717, cInf: 0 },
  // high wide, low 3/4, wide ahead, chain close-up
  { f: 925, cInf: 12, focus: eyes(7) },
  // MS "nobody wants to be the one who breaks step"
  { f: 987, cInf: 14 },
  // anchor insert, focus = look (the bolt)
  { f: 1039, cInf: 10 },
  // snap insert
  { f: 1062, cInf: 0 },
  // aerial + water-level drop: kept readable
  { f: 1134, cInf: 16, focus: () => [0.6, 0.6, -21.6] },
  // river sitters (shots 9-10): first-row faces sharp, quay ~13 px
  { f: 1303, cInf: 5 },
  // golden sway: mild, focus = look (mid-span)
  { f: 1411, cInf: 7 },
  // park: focus = look (the swing plane: kid + parent), bush in front; mild so the facade ink holds
  { f: 1620, cInf: 0 },
  // golden march (riding with the column)
  { f: 1735, cInf: 8 },
  // bank, dazed soldiers behind a foreground cart, focus = look
  { f: 1770, cInf: 12, focus: () => [3.35, D0 + 1.6, -31.55] },
  // officer MS at the sign (his eyes), bush in front
  { f: 1863, cInf: 0 }
  // tourists (busy crowd beat, kept sharp), crane out
];

// src/paint.ts
import * as THREE from "three";
var rng = (seed) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
};
var cache = /* @__PURE__ */ new Map();
var ctex = (key, w, h, draw) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d"), rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
var rep = (t, x, y) => {
  const c = t.clone();
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};
var _jc = new THREE.Color();
var TAU = Math.PI * 2;

// src/shade.ts
import * as THREE2 from "three";
var TONE = {
  uLitCol: { value: new THREE2.Vector3(1.5, 1.44, 1.32) },
  uShadeCol: { value: new THREE2.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE2.Vector3() },
  uLambert: { value: 0.35 },
  uSideK: { value: 0.84 },
  uTerm: { value: 0.2 },
  uBounce: { value: new THREE2.Vector3() },
  // warm bounce on shaded faces turned to the camera (golden only; day = 0)
  uSat: { value: 1 }
  // world albedo saturation around its luminance (characters are not twoTone, so unaffected)
};
var CHAR = {
  uCharTint: { value: new THREE2.Vector3(1, 0.94, 0.92) },
  uCharShade: { value: 0.86 },
  uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 },
  uSideTint: { value: new THREE2.Vector3(0.92, 0.9, 0.96) }
};
var LFB = THREE2.ShaderChunk.lights_fragment_begin.replace(
  "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
  "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]"
).replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n		directLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");
var TWO_TONE = (
  /* glsl */
  `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );                     // 0 = cast/form shadow, 1 = lit
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );    // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );        // 1 = faces the lens
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  reflectedLight.directDiffuse = alb * ( mix( uShadeCol, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + uShadeLift * LIFT_K * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`
);
var DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;";
function twoTone(m, liftK = 1) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", DECL + `
#define LIFT_K ${liftK.toFixed(3)}`).replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB).replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone5_" + liftK.toFixed(3);
  return m;
}

// src/build.ts
var mats = /* @__PURE__ */ new Map();
var CHAIN_MATS = /* @__PURE__ */ new WeakSet();
var lam = (key, make) => {
  let m = mats.get(key);
  if (!m) {
    if (key === "chainHD") {
      const c = twoTone(new THREE3.MeshPhongMaterial({ color: "#7a8490", specular: "#6c727b", shininess: 30 }));
      CHAIN_MATS.add(c);
      m = c;
    } else m = twoTone(new THREE3.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};
var UB = new THREE3.BoxGeometry(1, 1, 1);

// src/sets.ts
var NOINK = 3;
var TAU2 = Math.PI * 2;
var MK = {
  color: (c) => lam("set_" + c, () => ({ color: c })),
  map: (key, tex) => lam(key, () => ({ map: tex }))
};
var own = /* @__PURE__ */ new Map();
function useMaterials(kit) {
  MK = kit;
  own.clear();
}
var C = (c) => {
  const k = "c" + c;
  let m = own.get(k);
  if (!m) {
    m = MK.color(c);
    own.set(k, m);
  }
  return m;
};
var T2 = (key, w, h, draw, rx = 1, ry = 1) => {
  const k = `set_${key}_${rx}x${ry}`;
  let m = own.get(k);
  if (!m) {
    m = MK.map(k, rep(ctex("set_" + key, w, h, draw), rx, ry));
    own.set(k, m);
  }
  return m;
};
var glowCache = /* @__PURE__ */ new Map();
var GLOW = (key, w, h, draw) => {
  let m = glowCache.get(key);
  if (!m) {
    m = new THREE4.MeshBasicMaterial({ map: ctex("glow_" + key, w, h, draw), toneMapped: false });
    glowCache.set(key, m);
  }
  return m;
};
var glowCol = (c) => {
  const k = "c" + c;
  let m = glowCache.get(k);
  if (!m) {
    m = new THREE4.MeshBasicMaterial({ color: c, toneMapped: false });
    glowCache.set(k, m);
  }
  return m;
};
var blocks = (top, low, band) => (g, r) => {
  const W = 512, H = 512, cut = H * 0.56;
  g.fillStyle = top;
  g.fillRect(0, 0, W, cut);
  g.fillStyle = low;
  g.fillRect(0, cut, W, H - cut);
  g.fillStyle = band;
  g.fillRect(0, cut - 10, W, 12);
  g.strokeStyle = "rgba(60,60,80,0.22)";
  g.lineWidth = 3;
  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
    for (let x = row % 2 * 64; x < W; x += 128) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 64);
      g.stroke();
    }
  }
  for (let k = 0; k < 40; k++) {
    g.fillStyle = `rgba(80,80,90,${0.04 + r() * 0.06})`;
    g.beginPath();
    g.arc(r() * W, r() * H, 2 + r() * 6, 0, TAU2);
    g.fill();
  }
};
var checker = (a, b, n = 4) => (g) => {
  const s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? a : b;
    g.fillRect(i * s, j * s, s, s);
  }
};
var marble = (base, vein) => (g, r) => {
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = vein;
  g.lineWidth = 2;
  for (let k = 0; k < 14; k++) {
    g.globalAlpha = 0.25 + r() * 0.3;
    g.beginPath();
    let x = r() * 512, y = r() * 512;
    g.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += (r() - 0.3) * 80;
      y += (r() - 0.5) * 60;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.strokeStyle = "rgba(0,0,0,0.12)";
  g.lineWidth = 3;
  g.strokeRect(0, 0, 512, 512);
};
var panels = (base, line) => (g) => {
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = line;
  g.lineWidth = 6;
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 256, 0);
    g.lineTo(i * 256, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * 256);
    g.lineTo(512, i * 256);
    g.stroke();
  }
  g.fillStyle = line;
  for (const x of [18, 238, 274, 494]) for (const y of [18, 238, 274, 494]) {
    g.beginPath();
    g.arc(x, y, 5, 0, TAU2);
    g.fill();
  }
};
var planksFloor = (a, b) => (g, r) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, i * 64, 512, 3);
    const x = r() * 512;
    g.fillRect(x, i * 64, 3, 64);
  }
};
var carpet = (a, b) => (g, r) => {
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) {
    g.fillStyle = r() < 0.5 ? b : "rgba(255,255,255,0.08)";
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
};
var dirt = (a, b) => (g, r) => {
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 220; k++) {
    g.fillStyle = r() < 0.5 ? b : "rgba(255,255,255,0.07)";
    g.beginPath();
    g.ellipse(r() * 512, r() * 512, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, TAU2);
    g.fill();
  }
};
var tiles = (a, grout, n = 8) => (g) => {
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = grout;
  g.lineWidth = 4;
  const s = 512 / n;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * s);
    g.lineTo(512, i * s);
    g.stroke();
  }
};
var boxesGrid = (face, dark) => (g) => {
  g.fillStyle = dark;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) {
    const x = i * 64 + 3, y = j * 42.6 + 3;
    g.fillStyle = face;
    g.fillRect(x, y, 58, 37);
    g.fillStyle = dark;
    g.fillRect(x + 25, y + 15, 8, 7);
  }
};
var spaceView = (g, r) => {
  g.fillStyle = "#03040e";
  g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 260; k++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    g.fillRect(r() * 1024, r() * 300, 1 + r() * 2, 1 + r() * 2);
  }
  const gr = g.createRadialGradient(512, 1500, 1050, 512, 1500, 1260);
  gr.addColorStop(0, "#1d6fd8");
  gr.addColorStop(0.82, "#4fb2f5");
  gr.addColorStop(0.92, "#bfe8ff");
  gr.addColorStop(1, "rgba(120,190,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(512, 1500, 1260, 0, TAU2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.55)";
  for (let k = 0; k < 30; k++) {
    g.beginPath();
    g.ellipse(r() * 1024, 330 + r() * 180, 20 + r() * 60, 6 + r() * 10, r() - 0.5, 0, TAU2);
    g.fill();
  }
};
var starView = (g, r) => {
  g.fillStyle = "#050818";
  g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 400; k++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    g.fillRect(r() * 1024, r() * 512, 1 + r() * 2.5, 1 + r() * 2.5);
  }
};
var skyline = (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#5da8ec");
  gr.addColorStop(1, "#d6ecfa");
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 16; k++) {
    const w = 40 + r() * 70, h = 120 + r() * 260, x = k * 66 - 10;
    g.fillStyle = `rgb(${120 + r() * 30},${140 + r() * 30},${170 + r() * 30})`;
    g.fillRect(x, 512 - h, w, h);
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = 512 - h + 12; y < 500; y += 22) for (let xx = x + 8; xx < x + w - 8; xx += 16) g.fillRect(xx, y, 7, 10);
  }
};
var countdown = (n, head) => (g) => {
  g.fillStyle = "#0f1c3c";
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#2f5aa8";
  g.lineWidth = 3;
  g.strokeRect(20, 20, 984, 472);
  g.fillStyle = "#ffffff";
  g.font = "700 46px Arial, sans-serif";
  g.fillText(head, 60, 90);
  g.fillStyle = "#ffd24a";
  g.fillRect(40, 60, 8, 40);
  g.strokeStyle = "#ffd24a";
  g.lineWidth = 14;
  g.beginPath();
  g.arc(512, 290, 150, -1.2, 0.9);
  g.stroke();
  g.fillStyle = "#fff4c2";
  g.font = "800 260px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(n, 512, 300);
};
var monitorUI = (seed) => (g, r) => {
  g.fillStyle = "#0e2440";
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = ["#46e08a", "#4fb2f5", "#ffd24a"][seed % 3];
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(10, 100);
  for (let x = 10; x < 246; x += 12) g.lineTo(x, 60 + r() * 70);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.6)";
  for (let y = 16; y < 50; y += 10) g.fillRect(14, y, 60 + r() * 120, 4);
};
var chalk = (g, r) => {
  g.fillStyle = "#2f5a45";
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 4;
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    let x = 80 + r() * 200, y = 80 + k * 60;
    g.moveTo(x, y);
    for (let s = 0; s < 10; s++) {
      x += 30 + r() * 30;
      g.lineTo(x, y + (r() - 0.5) * 16);
    }
    g.stroke();
  }
  g.beginPath();
  g.arc(760, 220, 90, 0, TAU2);
  g.stroke();
  g.beginPath();
  g.moveTo(670, 220);
  g.lineTo(850, 220);
  g.stroke();
};
var painting = (a, b) => (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, a);
  gr.addColorStop(1, b);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.arc(80 + r() * 100, 80 + r() * 60, 30, 0, TAU2);
  g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath();
  g.moveTo(0, 256);
  g.lineTo(90 + r() * 60, 150);
  g.lineTo(256, 256);
  g.fill();
};
var mesh = (geo, mat, cast = true) => {
  const m = new THREE4.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
};
var B = (g, w, h, d, mat, x, y, z, ry = 0, cast = true) => {
  const m = mesh(new THREE4.BoxGeometry(w, h, d), mat, cast);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
};
var Cy = (g, r1, r2, h, mat, x, y, z, seg = 20, cast = true) => {
  const m = mesh(new THREE4.CylinderGeometry(r1, r2, h, seg), mat, cast);
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
};
var S = (g, r, mat, x, y, z, sy = 1) => {
  const m = mesh(new THREE4.SphereGeometry(r, 18, 12), mat);
  m.position.set(x, y, z);
  m.scale.y = sy;
  g.add(m);
  return m;
};
var P = (g, w, h, mat, x, y, z, ry = Math.PI, rx = 0, cast = false) => {
  const m = mesh(new THREE4.PlaneGeometry(w, h), mat, cast);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, "YXZ");
  g.add(m);
  return m;
};
var room = (g, o) => {
  const zf = o.zf ?? -12, d = o.zb - zf, side = o.side ?? o.wall;
  P(g, o.w, d, o.floor, 0, 0, (o.zb + zf) / 2, 0, -Math.PI / 2);
  P(g, o.w, o.h, o.wall, 0, o.h / 2, o.zb, Math.PI);
  P(g, d, o.h, side, -o.w / 2, o.h / 2, (o.zb + zf) / 2, Math.PI / 2);
  P(g, d, o.h, side, o.w / 2, o.h / 2, (o.zb + zf) / 2, -Math.PI / 2);
  if (o.ceil) P(g, o.w, d, o.ceil, 0, o.h, (o.zb + zf) / 2, 0, Math.PI / 2);
};
var beam = (g, x, y, z, w, h, tilt) => {
  const m = new THREE4.Mesh(new THREE4.PlaneGeometry(w, h), new THREE4.MeshBasicMaterial({
    map: ctex("set_beam", 64, 256, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "rgba(255,250,230,0.55)");
      gr.addColorStop(1, "rgba(255,250,230,0)");
      c.fillStyle = gr;
      c.fillRect(0, 0, 64, 256);
    }),
    transparent: true,
    depthWrite: false,
    blending: THREE4.AdditiveBlending,
    side: THREE4.DoubleSide,
    toneMapped: false
  }));
  m.position.set(x, y, z);
  m.rotation.set(0, Math.PI, tilt);
  m.layers.set(NOINK);
  g.add(m);
  return m;
};
var P_ = {
  bunk(g, x, z, ry = 0, sheet = "#3f63b8") {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    const metal = C("#c9ced6"), mat = C(sheet);
    for (const [px, pz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) B(f, 0.06, 1.7, 0.06, metal, px, 0, pz);
    for (const y of [0.42, 1.25]) {
      B(f, 2, 0.06, 0.86, metal, 0, y, 0);
      B(f, 1.9, 0.14, 0.8, mat, 0, y + 0.06, 0);
      B(f, 0.42, 0.1, 0.6, C("#f1f1ea"), 0.68, y + 0.2, 0);
    }
    for (let k = 0; k < 4; k++) B(f, 0.04, 0.04, 0.04, metal, 0.95, 0.6 + k * 0.18, -0.45);
    return f;
  },
  toilet(g, x, z, ry = Math.PI, steel = false) {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    const m = steel ? C("#b9c0c8") : C("#f4f4f0");
    Cy(f, 0.16, 0.2, 0.36, m, 0, 0, 0.05);
    B(f, 0.46, 0.08, 0.54, m, 0, 0.36, 0.08);
    B(f, 0.44, 0.5, 0.2, m, 0, 0.38, -0.22);
    B(f, 0.42, 0.04, 0.5, C("#e9e9e2"), 0, 0.44, 0.08);
    return f;
  },
  sink(g, x, z, ry = Math.PI) {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, 0.1, 0.8, 0.1, C("#b9c0c8"), 0, 0, 0);
    B(f, 0.5, 0.16, 0.4, C("#d9dde2"), 0, 0.8, 0.05);
    Cy(f, 0.015, 0.015, 0.22, C("#9aa2ac"), 0, 0.96, -0.1, 8);
    return f;
  },
  paper(g, x, y, z) {
    const m = Cy(g, 0.07, 0.07, 0.12, C("#ffffff"), x, y, z, 16);
    m.rotation.z = Math.PI / 2;
    return m;
  },
  window(g, x, y, z, w, h, view, frame = C("#5a6270"), bars = 0) {
    P(g, w, h, view, x, y, z + 0.02);
    const t = 0.08;
    B(g, w + t * 2, t, 0.12, frame, x, y - h / 2 - t, z);
    B(g, w + t * 2, t, 0.12, frame, x, y + h / 2, z);
    B(g, t, h, 0.12, frame, x - w / 2 - t / 2, y - h / 2, z);
    B(g, t, h, 0.12, frame, x + w / 2 + t / 2, y - h / 2, z);
    for (let k = 1; k <= bars; k++) B(g, 0.03, h, 0.03, C("#3c4250"), x - w / 2 + k * w / (bars + 1), y - h / 2, z - 0.04);
  },
  roundWindow(g, x, y, z, r, view) {
    const v = mesh(new THREE4.CircleGeometry(r, 40), view, false);
    v.position.set(x, y, z + 0.02);
    v.rotation.y = Math.PI;
    g.add(v);
    const ring = mesh(new THREE4.TorusGeometry(r, 0.09, 10, 40), C("#6b7280"));
    ring.position.set(x, y, z);
    g.add(ring);
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU2;
      S(g, 0.025, C("#3c4250"), x + Math.cos(a) * (r + 0.05), y + Math.sin(a) * (r + 0.05), z - 0.08);
    }
  },
  bars(g, x0, x1, z, h, gap = 0.16) {
    const m = C("#3e4a58");
    for (let x = x0; x <= x1 + 1e-6; x += gap) Cy(g, 0.022, 0.022, h, m, x, 0, z, 8);
    for (const y of [0.05, h * 0.55, h - 0.05]) B(g, x1 - x0 + 0.06, 0.06, 0.06, m, (x0 + x1) / 2, y, z);
  },
  shelf(g, x, y, z, w = 1.2, items = 3, seed = 1) {
    const r = rng(seed);
    B(g, w, 0.04, 0.3, C("#c9ced6"), x, y, z);
    for (let k = 0; k < items; k++) {
      const c = ["#d9534f", "#3f7fd9", "#f0b429", "#46b07a", "#f4f1ea"][Math.floor(r() * 5)];
      B(g, 0.14 + r() * 0.1, 0.12 + r() * 0.16, 0.14, C(c), x - w / 2 + 0.2 + k * (w - 0.3) / Math.max(1, items - 1), y + 0.04, z);
    }
  },
  desk(g, x, z, w = 1.4, d = 0.7, top = C("#c08a55"), ry = 0) {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, w, 0.06, d, top, 0, 0.74, 0);
    for (const [px, pz] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) B(f, 0.05, 0.74, 0.05, C("#4a4f5a"), px, 0, pz);
    return f;
  },
  chair(g, x, z, ry = 0, col = "#3a3f4b") {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, 0.46, 0.06, 0.44, C(col), 0, 0.44, 0);
    B(f, 0.46, 0.5, 0.06, C(col), 0, 0.5, 0.2);
    for (const [px, pz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) B(f, 0.04, 0.44, 0.04, C("#2b2f38"), px, 0, pz);
    return f;
  },
  stool(g, x, z, col = "#d9534f") {
    Cy(g, 0.2, 0.2, 0.08, C(col), x, 0.7, z);
    Cy(g, 0.03, 0.03, 0.7, C("#9aa2ac"), x, 0, z, 8);
    Cy(g, 0.18, 0.18, 0.03, C("#9aa2ac"), x, 0, z);
  },
  monitor(g, x, y, z, seed = 1, ry = Math.PI) {
    const f = new THREE4.Group();
    f.position.set(x, y, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, 0.56, 0.36, 0.04, C("#22262e"), 0, 0.12, 0);
    const s = P(f, 0.5, 0.3, GLOW("mon" + seed % 6, 256, 160, monitorUI(seed)), 0, 0.3, -0.025, Math.PI);
    s.rotation.y = 0;
    B(f, 0.05, 0.12, 0.05, C("#22262e"), 0, 0, 0.02);
    return f;
  },
  plant(g, x, y, z, s = 1) {
    Cy(g, 0.1 * s, 0.08 * s, 0.16 * s, C("#e9e4da"), x, y, z, 14);
    for (let k = 0; k < 5; k++) {
      const m = mesh(new THREE4.ConeGeometry(0.03 * s, 0.3 * s, 6), C(k % 2 ? "#4caf50" : "#3e9b47"));
      m.position.set(x + (k - 2) * 0.025 * s, y + 0.3 * s, z);
      m.rotation.z = (k - 2) * 0.25;
      g.add(m);
    }
  },
  lamp(g, x, y, z, w = 1.2) {
    B(g, w, 0.05, 0.3, C("#d7dbe2"), x, y - 0.05, z, 0, false);
    P(g, w - 0.1, 0.22, glowCol("#fffbe8"), x, y - 0.06, z, 0, Math.PI / 2);
  },
  crate(g, x, z, s = 0.6, col = "#b5824f") {
    B(g, s, s, s, C(col), x, 0, z);
    B(g, s + 0.02, 0.06, 0.06, C("#7a5232"), x, s * 0.5, z - s / 2);
  },
  barrel(g, x, z) {
    Cy(g, 0.3, 0.3, 0.9, C("#8a5a3c"), x, 0, z);
    Cy(g, 0.31, 0.31, 0.05, C("#4a4f5a"), x, 0.2, z);
    Cy(g, 0.31, 0.31, 0.05, C("#4a4f5a"), x, 0.65, z);
  },
  sandbags(g, x0, x1, z, rows = 3) {
    const m = C("#c9b48a");
    for (let row = 0; row < rows; row++) for (let x = x0 + row % 2 * 0.25; x < x1; x += 0.5) {
      const s = S(g, 0.26, m, x, 0.12 + row * 0.2, z, 0.45);
      s.scale.z = 0.6;
    }
  },
  tree(g, x, z, s = 1, leaf = "#3e9b47") {
    Cy(g, 0.12 * s, 0.16 * s, 1.4 * s, C("#7a5232"), x, 0, z, 10);
    S(g, 0.9 * s, C(leaf), x, 1.9 * s, z);
    S(g, 0.6 * s, C(leaf), x + 0.5 * s, 1.5 * s, z + 0.2);
  },
  pine(g, x, z, s = 1) {
    Cy(g, 0.1 * s, 0.12 * s, 0.6 * s, C("#6b4a2e"), x, 0, z, 8);
    for (let k = 0; k < 3; k++) {
      const m = mesh(new THREE4.ConeGeometry((0.9 - k * 0.22) * s, 1.1 * s, 10), C(["#2f7d4f", "#358a57", "#3f9a60"][k]));
      m.position.set(x, (0.9 + k * 0.6) * s, z);
      g.add(m);
    }
  },
  rock(g, x, z, s = 0.4, col = "#9a958c") {
    const m = mesh(new THREE4.DodecahedronGeometry(s, 0), C(col));
    m.position.set(x, s * 0.6, z);
    m.scale.y = 0.6;
    g.add(m);
  },
  moneyStack(g, x, y, z, n = 3) {
    for (let k = 0; k < n; k++) {
      B(g, 0.3, 0.12, 0.14, C("#7fae6e"), x + k % 2 * 0.32, y + Math.floor(k / 2) * 0.12, z);
      B(g, 0.05, 0.125, 0.145, C("#e9d27a"), x + k % 2 * 0.32, y + Math.floor(k / 2) * 0.12, z);
    }
  },
  goldBars(g, x, y, z, n = 6) {
    const m = C("#e8b923");
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 3), i = k % 3;
      B(g, 0.24, 0.07, 0.11, m, x + i * 0.26 + row * 0.13, y + row * 0.07, z);
    }
  },
  moneyBag(g, x, z) {
    S(g, 0.28, C("#c9b48a"), x, 0.26, z, 1.1);
    Cy(g, 0.06, 0.1, 0.12, C("#b39e74"), x, 0.52, z, 10);
  },
  cart(g, x, z) {
    B(g, 1, 0.04, 0.6, C("#2e7d4f"), x, 0.75, z);
    B(g, 1, 0.04, 0.6, C("#2e7d4f"), x, 0.3, z);
    for (const [px, pz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) {
      B(g, 0.04, 0.78, 0.04, C("#c9ced6"), x + px, 0.08, z + pz);
      S(g, 0.06, C("#2b2f38"), x + px, 0.06, z + pz);
    }
  },
  vaultDoor(g, x, y, z, r = 1.5) {
    const ring = mesh(new THREE4.CylinderGeometry(r + 0.35, r + 0.35, 0.3, 48), C("#9aa0a8"));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, z);
    g.add(ring);
    const door = mesh(new THREE4.CylinderGeometry(r, r, 0.4, 48), C("#d9b44a"));
    door.rotation.x = Math.PI / 2;
    door.position.set(x, y, z - 0.12);
    g.add(door);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU2;
      B(g, 0.14, 0.34, 0.2, C("#8a9098"), x + Math.cos(a) * (r + 0.42), y + Math.sin(a) * (r + 0.42) - 0.17, z - 0.1, 0);
    }
    const wheel = mesh(new THREE4.TorusGeometry(r * 0.38, 0.04, 8, 32), C("#c9ced6"));
    wheel.position.set(x, y, z - 0.4);
    g.add(wheel);
    for (let k = 0; k < 6; k++) {
      const sp = B(g, 0.03, r * 0.76, 0.03, C("#c9ced6"), x, y - r * 0.38, z - 0.4);
      sp.rotation.z = k / 6 * Math.PI;
      sp.position.set(x, y, z - 0.4);
    }
    S(g, 0.1, C("#e8b923"), x, y, z - 0.42);
    for (let k = 0; k < 4; k++) {
      const c = mesh(new THREE4.CylinderGeometry(0.11, 0.11, 0.05, 20), C("#f4f1ea"));
      c.rotation.x = Math.PI / 2;
      c.position.set(x - 0.45 + k * 0.3, y + r * 0.62, z - 0.35);
      g.add(c);
    }
  },
  console(g, x, z, w = 2.2, seed = 1) {
    B(g, w, 0.78, 0.7, C("#e8ebf0"), x, 0, z);
    B(g, w, 0.06, 0.8, C("#c9ced6"), x, 0.78, z);
    for (let k = 0; k < Math.round(w / 0.75); k++) P_.monitor(g, x - w / 2 + 0.4 + k * 0.75, 0.84, z + 0.15, seed + k);
    for (let k = 0; k < 5; k++) Cy(g, 0.05, 0.05, 0.04, glowCol(["#46e08a", "#ffd24a", "#ff5a5a"][k % 3]), x - w / 2 + 0.3 + k * 0.2, 0.84, z - 0.25, 12);
  },
  bigScreen(g, x, y, z, w, h, mat) {
    B(g, w + 0.16, h + 0.16, 0.1, C("#1c2233"), x, y - h / 2 - 0.08, z + 0.05);
    P(g, w, h, mat, x, y, z - 0.01);
  },
  seat(g, x, z, col = "#2e3a55") {
    B(g, 0.6, 0.12, 0.6, C(col), x, 0.42, z);
    B(g, 0.6, 0.85, 0.14, C(col), x, 0.5, z + 0.26);
    B(g, 0.3, 0.42, 0.3, C("#3c4250"), x, 0, z);
  },
  table(g, x, z, w = 1.2, d = 0.8, col = "#a8724a") {
    P_.desk(g, x, z, w, d, C(col));
  },
  bed(g, x, z, ry = 0, sheet = "#7fb3d9") {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, 1, 0.36, 2, C("#8a5a3c"), 0, 0, 0);
    B(f, 0.96, 0.14, 1.9, C("#f4f1ea"), 0, 0.36, 0);
    B(f, 0.98, 0.1, 1.3, C(sheet), 0, 0.46, -0.3);
    B(f, 0.6, 0.12, 0.34, C("#ffffff"), 0, 0.5, 0.7);
    B(f, 1, 0.8, 0.08, C("#6b4a2e"), 0, 0, 1);
    return f;
  },
  sofa(g, x, z, col = "#5b7fd6") {
    B(g, 2, 0.42, 0.9, C(col), x, 0, z);
    B(g, 2, 0.55, 0.22, C(col), x, 0.42, z + 0.34);
    B(g, 0.22, 0.6, 0.9, C(col), x - 1, 0, z);
    B(g, 0.22, 0.6, 0.9, C(col), x + 1, 0, z);
  },
  tv(g, x, y, z) {
    B(g, 1.2, 0.7, 0.06, C("#1a1d24"), x, y, z);
    P(g, 1.12, 0.62, GLOW("tv", 256, 160, monitorUI(4)), x, y + 0.35, z - 0.035);
  },
  bookshelf(g, x, z, seed = 3) {
    B(g, 1.1, 1.9, 0.35, C("#8a5a3c"), x, 0, z);
    for (let y = 0.3; y < 1.8; y += 0.4) P_.shelf(g, x, y, z - 0.03, 1, 5, seed + y * 10);
  },
  stove(g, x, z) {
    B(g, 0.8, 0.9, 0.65, C("#e8ebf0"), x, 0, z);
    for (const dx of [-0.2, 0.2]) Cy(g, 0.12, 0.12, 0.02, C("#2b2f38"), x + dx, 0.9, z - 0.05, 16);
    Cy(g, 0.18, 0.18, 0.24, C("#c8102e"), x - 0.2, 0.92, z - 0.05, 18);
  },
  fridge(g, x, z) {
    B(g, 0.8, 1.85, 0.7, C("#eef0f3"), x, 0, z);
    B(g, 0.04, 0.3, 0.04, C("#9aa2ac"), x - 0.32, 1.1, z - 0.37);
    B(g, 0.8, 0.02, 0.71, C("#c9ced6"), x, 1.2, z);
  },
  counter(g, x, z, w = 2, top = "#f2ede4", body = "#d8a06a") {
    B(g, w, 0.88, 0.65, C(body), x, 0, z);
    B(g, w + 0.04, 0.05, 0.7, C(top), x, 0.88, z);
  },
  ivStand(g, x, z) {
    Cy(g, 0.02, 0.02, 1.8, C("#c9ced6"), x, 0, z, 8);
    B(g, 0.14, 0.22, 0.06, C("#cfe8ff"), x, 1.55, z);
    Cy(g, 0.2, 0.2, 0.03, C("#9aa2ac"), x, 0, z, 16);
  },
  heartMonitor(g, x, y, z) {
    B(g, 0.6, 0.42, 0.18, C("#2b3440"), x, y, z);
    P(g, 0.52, 0.32, GLOW("ecg", 256, 160, (c) => {
      c.fillStyle = "#06150f";
      c.fillRect(0, 0, 256, 160);
      c.strokeStyle = "#46f08a";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(0, 90);
      for (let k = 0; k < 256; k += 4) c.lineTo(k, k % 80 > 34 && k % 80 < 46 ? 30 : 90);
      c.stroke();
    }), x, y + 0.21, z - 0.095);
  },
  board(g, x, y, z, w = 3, h = 1.3) {
    B(g, w + 0.14, h + 0.14, 0.06, C("#8a5a3c"), x, y - 0.07, z);
    P(g, w, h, GLOW("chalk", 1024, 512, chalk), x, y + h / 2, z - 0.035);
  },
  schoolDesk(g, x, z) {
    B(g, 0.7, 0.05, 0.5, C("#c08a55"), x, 0.7, z);
    B(g, 0.05, 0.7, 0.05, C("#5a6270"), x - 0.3, 0, z - 0.2);
    B(g, 0.05, 0.7, 0.05, C("#5a6270"), x + 0.3, 0, z - 0.2);
    B(g, 0.05, 0.7, 0.05, C("#5a6270"), x - 0.3, 0, z + 0.2);
    B(g, 0.05, 0.7, 0.05, C("#5a6270"), x + 0.3, 0, z + 0.2);
  },
  clock(g, x, y, z) {
    const f = mesh(new THREE4.CylinderGeometry(0.22, 0.22, 0.05, 28), C("#ffffff"));
    f.rotation.x = Math.PI / 2;
    f.position.set(x, y, z);
    g.add(f);
    const h = B(g, 0.02, 0.15, 0.02, C("#1a1d24"), x, y - 0.02, z - 0.03);
    h.rotation.z = 0.6;
    B(g, 0.02, 0.1, 0.02, C("#1a1d24"), x, y - 0.02, z - 0.03);
  },
  pickaxe(g, x, z) {
    const h = B(g, 0.04, 0.9, 0.04, C("#8a5a3c"), x, 0, z);
    h.rotation.z = 0.4;
    const p = B(g, 0.5, 0.05, 0.05, C("#7d8088"), x - 0.2, 0.75, z);
    p.rotation.z = 0.4;
  },
  shovel(g, x, z) {
    const h = B(g, 0.04, 1, 0.04, C("#c8a24a"), x, 0, z);
    h.rotation.z = -0.2;
    B(g, 0.22, 0.28, 0.03, C("#5a6270"), x + 0.02, 0, z);
  },
  hole(g, x, z, r = 0.7) {
    const rim = mesh(new THREE4.CylinderGeometry(r + 0.12, r + 0.2, 0.14, 24), C("#8a7a66"));
    rim.position.set(x, 0.05, z);
    g.add(rim);
    const pit = mesh(new THREE4.CircleGeometry(r, 24), glowCol("#1c120c"), false);
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(x, 0.13, z);
    g.add(pit);
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * TAU2;
      P_.rock(g, x + Math.cos(a) * (r + 0.4), z + Math.sin(a) * (r + 0.4), 0.06 + k % 3 * 0.03, "#8f877a");
    }
  },
  lantern(g, x, y, z) {
    B(g, 0.14, 0.2, 0.14, C("#3c4250"), x, y, z);
    B(g, 0.1, 0.14, 0.1, glowCol("#ffd58a"), x, y + 0.03, z);
  },
  railTrack(g, x, z0, z1) {
    for (const dx of [-0.35, 0.35]) B(g, 0.05, 0.05, z1 - z0, C("#7d8088"), x + dx, 0, (z0 + z1) / 2);
    for (let z = z0; z < z1; z += 0.5) B(g, 0.9, 0.04, 0.12, C("#6b4a2e"), x, 0, z);
  },
  mineCart(g, x, z) {
    B(g, 0.8, 0.5, 1, C("#5a6270"), x, 0.15, z);
    for (const dz of [-0.35, 0.35]) for (const dx of [-0.42, 0.42]) {
      const w = mesh(new THREE4.CylinderGeometry(0.12, 0.12, 0.06, 14), C("#2b2f38"));
      w.rotation.z = Math.PI / 2;
      w.position.set(x + dx, 0.12, z + dz);
      g.add(w);
    }
    for (let k = 0; k < 5; k++) P_.rock(g, x - 0.2 + k * 0.1, z - 0.2 + k % 2 * 0.3, 0.12, "#6b5b45");
  },
  tent(g, x, z, col = "#e8823a") {
    const m = mesh(new THREE4.ConeGeometry(1.3, 1.6, 4), C(col));
    m.position.set(x, 0.8, z);
    m.rotation.y = Math.PI / 4;
    g.add(m);
    P(g, 0.6, 0.8, C("#3a2a20"), x, 0.4, z - 0.7);
  },
  campfire(g, x, z) {
    for (let k = 0; k < 5; k++) {
      const l = B(g, 0.08, 0.08, 0.7, C("#6b4a2e"), x, 0.04, z);
      l.rotation.y = k / 5 * Math.PI;
    }
    for (let k = 0; k < 3; k++) {
      const f = mesh(new THREE4.ConeGeometry(0.16 - k * 0.04, 0.5 - k * 0.1, 8), glowCol(["#ff8a2a", "#ffc04a", "#fff1a8"][k]), false);
      f.position.set(x, 0.3, z);
      g.add(f);
    }
  },
  log(g, x, z, ry = 0) {
    const m = mesh(new THREE4.CylinderGeometry(0.16, 0.16, 1.4, 12), C("#7a5232"));
    m.rotation.set(0, ry, Math.PI / 2);
    m.position.set(x, 0.16, z);
    g.add(m);
  },
  umbrella(g, x, z) {
    Cy(g, 0.03, 0.03, 2, C("#f4f1ea"), x, 0, z, 8);
    const t = mesh(new THREE4.ConeGeometry(1.2, 0.4, 12), C("#e5484d"));
    t.position.set(x, 2.1, z);
    g.add(t);
  },
  cactus(g, x, z) {
    Cy(g, 0.18, 0.2, 1.6, C("#4f9a4a"), x, 0, z, 12);
    Cy(g, 0.11, 0.11, 0.6, C("#4f9a4a"), x + 0.3, 0.7, z, 10);
    B(g, 0.3, 0.12, 0.12, C("#4f9a4a"), x + 0.15, 0.7, z);
  },
  fence(g, x0, x1, z) {
    for (let x = x0; x <= x1; x += 0.9) B(g, 0.08, 0.9, 0.08, C("#b5824f"), x, 0, z);
    for (const y of [0.35, 0.7]) B(g, x1 - x0, 0.08, 0.05, C("#c79260"), (x0 + x1) / 2, y, z);
  },
  hay(g, x, z) {
    const m = mesh(new THREE4.CylinderGeometry(0.5, 0.5, 0.9, 18), C("#e8c86a"));
    m.rotation.z = Math.PI / 2;
    m.position.set(x, 0.5, z);
    g.add(m);
  },
  column(g, x, z, h = 3.4) {
    Cy(g, 0.28, 0.3, h, C("#efe9dc"), x, 0, z, 18);
    B(g, 0.8, 0.16, 0.8, C("#e0d8c6"), x, 0, z);
    B(g, 0.8, 0.16, 0.8, C("#e0d8c6"), x, h - 0.16, z);
  },
  rope(g, x0, x1, z) {
    for (const x of [x0, x1]) {
      Cy(g, 0.04, 0.04, 0.9, C("#c9a13b"), x, 0, z, 10);
      Cy(g, 0.16, 0.16, 0.04, C("#c9a13b"), x, 0, z, 16);
    }
    const r = B(g, x1 - x0, 0.05, 0.05, C("#b0122a"), (x0 + x1) / 2, 0.78, z);
    return r;
  },
  frame(g, x, y, z, w, h, art) {
    B(g, w + 0.16, h + 0.16, 0.06, C("#b8892f"), x, y - h / 2 - 0.08, z);
    P(g, w, h, art, x, y, z - 0.035);
  },
  throne(g, x, z) {
    B(g, 1, 0.5, 0.9, C("#b8892f"), x, 0.2, z);
    B(g, 1, 1.8, 0.2, C("#c8102e"), x, 0.2, z + 0.4);
    B(g, 0.8, 0.12, 0.7, C("#c8102e"), x, 0.7, z);
    B(g, 1.2, 0.2, 1.4, C("#8a7a66"), x, 0, z);
  },
  banner(g, x, y, z, col = "#c8102e") {
    P(g, 0.7, 1.6, C(col), x, y, z - 0.02);
    B(g, 0.9, 0.05, 0.05, C("#b8892f"), x, y + 0.8, z - 0.04);
  },
  torch(g, x, y, z) {
    B(g, 0.08, 0.4, 0.08, C("#6b4a2e"), x, y, z);
    const f = mesh(new THREE4.ConeGeometry(0.1, 0.26, 8), glowCol("#ffb04a"), false);
    f.position.set(x, y + 0.52, z);
    g.add(f);
  },
  bench(g, x, z, w = 2, col = "#8a5a3c") {
    B(g, w, 0.06, 0.4, C(col), x, 0.45, z);
    B(g, w, 0.5, 0.06, C(col), x, 0.5, z + 0.18);
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) B(g, 0.06, 0.45, 0.36, C("#5a3b2a"), x + dx, 0, z);
  },
  waterCooler(g, x, z) {
    B(g, 0.34, 1, 0.34, C("#e8ebf0"), x, 0, z);
    Cy(g, 0.15, 0.15, 0.4, C("#8fd0ff"), x, 1, z, 16);
  },
  register(g, x, y, z) {
    B(g, 0.4, 0.2, 0.34, C("#2b2f38"), x, y, z);
    B(g, 0.3, 0.2, 0.04, C("#2b2f38"), x, y + 0.2, z + 0.12);
  },
  storeShelf(g, x, z, seed = 1, ry = 0) {
    const f = new THREE4.Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    g.add(f);
    B(f, 1.8, 1.7, 0.45, C("#e8ebf0"), 0, 0, 0);
    for (let y = 0.25; y < 1.6; y += 0.42) P_.shelf(f, 0, y, -0.1, 1.7, 7, seed + y * 7);
  },
  booth(g, x, z) {
    B(g, 1.6, 0.45, 0.5, C("#c8102e"), x, 0, z);
    B(g, 1.6, 0.6, 0.15, C("#c8102e"), x, 0.45, z + 0.2);
    P_.table(g, x, z - 0.6, 1.2, 0.6, "#f2ede4");
  },
  judgeBench(g, x, z) {
    B(g, 3, 1.3, 0.9, C("#7a4f33"), x, 0, z);
    B(g, 3.1, 0.08, 1, C("#5a3b2a"), x, 1.3, z);
    B(g, 0.08, 0.06, 0.3, C("#3a2a20"), x + 0.6, 1.38, z - 0.2);
  },
  flask(g, x, y, z, col = "#46d17a") {
    Cy(g, 0.03, 0.03, 0.12, C("#dfeef5"), x, y + 0.12, z, 10);
    const b = mesh(new THREE4.ConeGeometry(0.1, 0.16, 14), glowCol(col));
    b.position.set(x, y + 0.08, z);
    g.add(b);
  },
  wire(g, x0, x1, z) {
    const m = C("#3a332c");
    for (let x = x0; x <= x1; x += 1.4) B(g, 0.06, 0.7, 0.06, C("#4a3a2a"), x, 0, z);
    for (const y of [0.3, 0.55]) {
      for (let x = x0; x < x1; x += 0.2) {
        const s = B(g, 0.2, 0.015, 0.015, m, x + 0.1, y + Math.sin(x * 9) * 0.03, z);
        s.rotation.z = Math.sin(x * 7) * 0.4;
      }
    }
  },
  handrail(g, x0, x1, y, z, col = "#e8823a") {
    B(g, x1 - x0, 0.06, 0.06, C(col), (x0 + x1) / 2, y, z);
    for (const x of [x0 + 0.1, x1 - 0.1]) B(g, 0.05, 0.12, 0.12, C("#5a6270"), x, y - 0.06, z + 0.04);
  }
};
var pick = (r, xs) => xs[Math.floor(r() * xs.length) % xs.length];
var MAPS = {
  // a prison cell: two-tone block walls, a bunk, a steel toilet and sink, a high barred window and its light
  cell(g, r) {
    const low = pick(r, ["#4f6fa3", "#5b7fb0", "#6b7d8f"]);
    room(g, { w: 6, zb: 2.6, h: 3.4, floor: T2("cellfloor", 512, 512, carpet("#5e3f4a", "#4a3038"), 4, 4), wall: T2("cellwall" + low, 512, 512, blocks("#e8e4d8", low, "#2c3a52"), 2, 1), ceil: C("#d8d4c8") });
    P_.bunk(g, -2, 1.5, 0, pick(r, ["#3f63b8", "#2f6b8f", "#4a5aa8"]));
    P_.toilet(g, 1.6, 2.2, Math.PI, true);
    P_.sink(g, 2.3, 2.3);
    P_.paper(g, 2, 0.7, 2.5);
    P_.window(g, 1, 2.75, 2.58, 0.7, 0.45, GLOW("sky", 256, 128, (c) => {
      c.fillStyle = "#cfe8ff";
      c.fillRect(0, 0, 256, 128);
    }), C("#5a6270"), 4);
    beam(g, 0.4, 1.4, 1.2, 1.4, 3.6, -0.5);
    P_.shelf(g, 2.2, 1.6, 2.45, 1, 3, 7);
    return { spots: { bed: [-2, 0.6, 1.5], sit: [0.3, 0.45, 0.5], dig: [0.9, 0, 0.6] } };
  },
  // a cell block: a corridor of barred cell fronts, ceiling lights and painted numbers
  cellblock(g, r) {
    room(g, { w: 7, zb: 6, zf: -14, h: 3.6, floor: T2("cbfloor", 512, 512, tiles("#8c8f96", "#73767d", 4), 6, 12), wall: T2("cbwall", 512, 512, blocks("#e6e2d6", "#5b6f8a", "#2c3a52"), 3, 1), ceil: C("#cfcac0") });
    for (let z = -10; z < 5; z += 2.6) {
      for (const s of [-1, 1]) {
        const g2 = new THREE4.Group();
        g2.position.set(s * 3.45, 0, z);
        g2.rotation.y = s * Math.PI / 2;
        g.add(g2);
        P_.bars(g2, -1, 1, 0, 2.6);
      }
      P_.lamp(g, 0, 3.55, z, 1);
    }
    P_.bars(g, -3.4, 3.4, 5.9, 3.4, 0.22);
    return { spots: { sit: [2.6, 0.45, 1] } };
  },
  // a bank lobby: marble, columns, a teller counter with glass, rope barriers
  banklobby(g, r) {
    room(g, { w: 10, zb: 4, h: 4.2, floor: T2("marble", 512, 512, marble("#efe9dc", "#b8ac96"), 4, 6), wall: T2("bankwall", 512, 512, panels("#e9dfc9", "#cbbd9f"), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, 0, 3, 6, "#f2ede4", "#7a4f33");
    for (let x = -2.5; x <= 2.5; x += 1.25) B(g, 0.04, 0.9, 0.04, C("#b8892f"), x, 0.93, 3);
    P(g, 6, 0.9, new THREE4.MeshBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.25, depthWrite: false }), 0, 1.38, 2.8);
    for (const x of [-4.2, 4.2]) for (const z of [-3, 1.5]) P_.column(g, x, z, 4.2);
    P_.rope(g, -2, 0, 0.8);
    P_.rope(g, 0.4, 2.4, 0.8);
    P_.plant(g, -3.6, 0, 3.4, 2.5);
    P_.clock(g, 0, 3.3, 3.95);
    return { spots: { sit: [-3.2, 0.45, -0.5] } };
  },
  // a bank vault: a great round door, walls of deposit boxes, cash on a cart, gold bars and money bags
  vault(g, r) {
    room(g, { w: 9, zb: 3.4, h: 4.2, floor: T2("vaultfloor", 512, 512, marble("#d9d0bd", "#a8977a"), 3, 5), wall: T2("vaultwall", 512, 512, panels("#b8bcc4", "#8a9098"), 3, 1), side: T2("boxes", 512, 512, boxesGrid("#c9a13b", "#7a5f24"), 4, 2), ceil: C("#bfc3ca") });
    P_.vaultDoor(g, -0.6, 2.1, 3.3, 1.55);
    P_.cart(g, 2.6, 1.6);
    P_.moneyStack(g, 2.3, 0.8, 1.6, 6);
    P_.moneyStack(g, 2.4, 0.35, 1.6, 4);
    P_.goldBars(g, -3.4, 0, 1.4, 6);
    P_.moneyBag(g, -2.6, 2.2);
    P_.moneyBag(g, -3.2, 2.5);
    return { spots: { sit: [1.8, 0.45, 0.2] } };
  },
  // a space station cabin: grey panels, a round window onto Earth, handrails, an orange stripe, a sleeping bag
  spacecabin(g, r) {
    room(g, { w: 6, zb: 2.6, h: 3.2, floor: T2("spfloor", 512, 512, panels("#4a5060", "#2e333e"), 3, 6), wall: T2("spwall", 512, 512, panels("#5b6272", "#3a404c"), 3, 1), ceil: T2("spceil", 512, 512, panels("#4a5060", "#2e333e"), 3, 6) });
    P_.roundWindow(g, 0.6, 1.9, 2.55, 0.9, GLOW("earth", 1024, 512, spaceView));
    P_.handrail(g, -2.6, 2.6, 1.05, 2.5);
    P_.handrail(g, -2.9, -1, 2.6, 1);
    B(g, 0.7, 1.8, 0.25, C("#5aa84f"), -2.4, 0.5, 2.3);
    P_.plant(g, 2.2, 1, 2.45);
    P_.monitor(g, -1.6, 1.3, 2.45, 2);
    P_.lamp(g, 0, 3.15, 0.5);
    return { spots: { sit: [-1.2, 0.45, 0.8], bed: [-2.4, 1.2, 2.1] } };
  },
  // the toilet on a space station: a checker floor, a big window onto Earth, the toilet and its paper
  spacetoilet(g, r) {
    room(g, { w: 5.5, zb: 2.4, h: 3.2, floor: T2("chk", 512, 512, checker("#f4f4f0", "#1e1f24", 4), 4, 6), wall: T2("spwall2", 512, 512, panels("#454b58", "#2e333e"), 3, 1), ceil: C("#3a404c") });
    P_.window(g, 0, 2.2, 2.38, 3.4, 1.4, GLOW("earth2", 1024, 512, spaceView), C("#6b7280"));
    B(g, 5.5, 0.08, 0.35, C("#7a5232"), 0, 1.35, 2.2);
    P_.toilet(g, 1, 1.6, Math.PI, false);
    P_.paper(g, 1.8, 1, 2.2);
    P_.plant(g, 2, 1.43, 2.25, 0.8);
    B(g, 0.08, 2.6, 0.08, C("#e8823a"), 2.6, 0.2, 2.2);
    return { seated: true, spots: { sit: [1, 0.45, 1.6] } };
  },
  // mission control: rows of consoles, a big screen counting down, a clock strip, ceiling light panels
  control(g, r) {
    room(g, { w: 11, zb: 5, h: 4.4, floor: T2("ctrlfloor", 512, 512, carpet("#2c3b78", "#22306a"), 6, 8), wall: T2("ctrlwall", 512, 512, panels("#28324f", "#1c2338"), 3, 1), ceil: T2("ctrlceil", 512, 512, tiles("#3a4a7a", "#2a375e", 4), 4, 6) });
    const n = String(Math.floor(r() * 9) + 1);
    P_.bigScreen(g, 0, 2.7, 4.9, 5.6, 2.2, GLOW("cd" + n, 1024, 512, countdown(n, pick(r, ["LAUNCH WINDOW", "T-MINUS", "DOCKING", "COUNTDOWN"]))));
    P(g, 6, 0.36, GLOW("clocks", 1024, 64, (c) => {
      c.fillStyle = "#0b0f1a";
      c.fillRect(0, 0, 1024, 64);
      c.fillStyle = "#ffb43a";
      c.font = "700 40px monospace";
      c.fillText("0 1204:17:35   164:1:59   12:02", 30, 46);
    }), 0, 4.05, 4.88);
    P_.console(g, -2.6, 2.2, 2.4, 3);
    P_.console(g, 2.6, 2.2, 2.4, 5);
    P_.console(g, -4.2, -3.4, 2.2, 7);
    P_.console(g, 4.2, -3.4, 2.2, 9);
    for (let z = -4; z < 5; z += 2) P_.lamp(g, 0, 4.35, z, 2.4);
    return { spots: { sit: [-2.6, 0.45, 1.4], type: [-2.6, 0, 1.5] } };
  },
  // a cockpit: two seats, consoles and a windshield full of stars
  cockpit(g, r) {
    room(g, { w: 5, zb: 2.4, h: 2.8, floor: T2("ckfloor", 512, 512, panels("#3a404c", "#22262e"), 3, 5), wall: T2("ckwall", 512, 512, panels("#4a5060", "#2e333e"), 2, 1), ceil: C("#2e333e") });
    P_.window(g, 0, 1.9, 2.38, 4.2, 1.3, GLOW("stars", 1024, 512, starView), C("#2e333e"));
    B(g, 4.6, 0.9, 0.7, C("#3c4250"), 0, 0, 2);
    for (let k = 0; k < 4; k++) P_.monitor(g, -1.5 + k, 0.9, 1.85, k + 11);
    P_.seat(g, -0.9, 0.9);
    P_.seat(g, 0.9, 0.9);
    return { seated: true, spots: { sit: [-0.9, 0.45, 0.8] }, night: true };
  },
  classroom(g, r) {
    room(g, { w: 9, zb: 3, h: 3.4, floor: T2("clsfloor", 512, 512, planksFloor("#c99a66", "#bb8c5a"), 4, 6), wall: T2("clswall", 512, 512, blocks("#f1ead6", pick(r, ["#6f9a6a", "#7a8fb8", "#c9a06a"]), "#4a5a3a"), 3, 1), ceil: C("#efe9dc") });
    P_.board(g, 0, 1, 2.95, 4, 1.4);
    P_.clock(g, 3.2, 2.9, 2.95);
    P_.desk(g, 2.8, 1.6, 1.6, 0.8);
    for (const x of [-3, -1.2]) for (const z of [-1.5, -3.5]) {
      P_.schoolDesk(g, x, z);
      P_.chair(g, x, z - 0.5, Math.PI);
    }
    for (const x of [1.6, 3.2]) for (const z of [-1.5, -3.5]) {
      P_.schoolDesk(g, x, z);
      P_.chair(g, x, z - 0.5, Math.PI);
    }
    const side = new THREE4.Group();
    side.position.set(4.48, 0, 0);
    side.rotation.y = -Math.PI / 2;
    g.add(side);
    P_.window(side, 0, 1.8, 0, 2.4, 1.2, GLOW("skyline", 1024, 512, skyline));
    return { seated: true, spots: { sit: [-1.2, 0.45, -2] } };
  },
  office(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.2, floor: T2("offfloor", 512, 512, carpet("#7d8792", "#6d7782"), 6, 8), wall: T2("offwall", 512, 512, panels("#e9eef4", "#c9d1db"), 3, 1), ceil: C("#f2f4f7") });
    P_.window(g, 0, 1.9, 3.38, 7, 1.8, GLOW("skyline2", 1024, 512, skyline), C("#c9d1db"));
    for (const x of [-3, 0, 3]) {
      P_.desk(g, x, 1.4, 1.6, 0.8);
      P_.monitor(g, x, 0.8, 1.55, Math.floor(x + 9));
      P_.chair(g, x, 0.8, Math.PI);
    }
    P_.waterCooler(g, 4.3, 2.8);
    P_.plant(g, -4.3, 0, 2.9, 3);
    return { seated: true, spots: { sit: [0, 0.45, 0.8], type: [0, 0, 0.9] } };
  },
  kitchen(g, r) {
    room(g, { w: 8, zb: 3, h: 3.2, floor: T2("kfloor", 512, 512, checker("#f4f1ea", pick(r, ["#c8102e", "#2f6b8f", "#2b2f38"]), 6), 4, 6), wall: T2("kwall", 512, 512, tiles("#f6f2ea", "#ddd5c6", 10), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, -1.2, 2.6, 4.4);
    P_.stove(g, 1.4, 2.6);
    P_.fridge(g, 2.8, 2.6);
    for (let k = 0; k < 4; k++) B(g, 1, 0.8, 0.4, C(pick(r, ["#e9876b", "#7fb3d9", "#f2d06b"])), -3 + k * 1.1, 2, 2.8);
    P_.table(g, -1.5, -0.6, 1.2, 0.8, "#c79260");
    P_.chair(g, -2.3, -0.6, Math.PI / 2, "#a8724a");
    P_.chair(g, -0.7, -0.6, -Math.PI / 2, "#a8724a");
    return { seated: true, spots: { sit: [-2.3, 0.45, -0.6], eat: [-1.5, 0.78, -0.6] } };
  },
  diner(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.4, floor: T2("dfloor", 512, 512, checker("#f4f1ea", "#1e1f24", 6), 5, 8), wall: T2("dwall", 512, 512, blocks("#fbe9c8", "#c8102e", "#f4f1ea"), 3, 1), ceil: C("#f2ede4") });
    P_.counter(g, 1.6, 2.7, 5, "#c9ced6", "#c8102e");
    for (let x = -0.6; x < 4; x += 0.9) P_.stool(g, x, 1.9);
    P_.booth(g, -3.4, 1.6);
    P_.booth(g, -3.4, -1.4);
    P_.frame(g, 1.6, 2.6, 3.35, 3, 0.7, GLOW("menu", 512, 128, (c) => {
      c.fillStyle = "#1e1f24";
      c.fillRect(0, 0, 512, 128);
      c.fillStyle = "#ffd24a";
      c.font = "700 40px Arial";
      c.fillText("BURGERS  SHAKES  FRIES", 24, 78);
    }));
    return { seated: true, spots: { sit: [-0.6, 0.7, 1.9], eat: [-3.4, 0.78, 1] } };
  },
  livingroom(g, r) {
    room(g, { w: 9, zb: 3, h: 3.2, floor: T2("lfloor", 512, 512, planksFloor("#b07a4a", "#9e6c40"), 4, 6), wall: T2("lwall", 512, 512, blocks(pick(r, ["#f3ddb0", "#d9e6f2", "#e8d8f0"]), "#c9935e", "#8a5a3c"), 3, 1), ceil: C("#f2ede4") });
    P_.sofa(g, -1, 2.2, pick(r, ["#5b7fd6", "#c8102e", "#46b07a"]));
    P_.tv(g, 2.8, 0.6, 2.9);
    B(g, 1.6, 0.6, 0.5, C("#6b4a2e"), 2.8, 0, 2.7);
    P_.bookshelf(g, -3.8, 2.6, 4);
    P_.plant(g, 4, 0, 2.6, 2.4);
    P_.window(g, 0.8, 2, 2.98, 1.8, 1.1, GLOW("skyday", 1024, 512, skyline));
    const rug = mesh(new THREE4.PlaneGeometry(3.4, 2.2), C("#d9534f"), false);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.5, 0.01, 0.8);
    g.add(rug);
    return { seated: true, spots: { sit: [-1, 0.45, 2.1] } };
  },
  bedroom(g, r) {
    room(g, { w: 8, zb: 3, h: 3, floor: T2("bfloor", 512, 512, carpet("#b8a6d9", "#a896c9"), 4, 6), wall: T2("bwall", 512, 512, blocks(pick(r, ["#cfe3f5", "#f5d9cf", "#e3f5cf"]), "#7a8fb8", "#4a5a8a"), 3, 1), ceil: C("#f2ede4") });
    P_.bed(g, -1.4, 1.6, Math.PI / 2, pick(r, ["#7fb3d9", "#e5484d", "#f0b429"]));
    B(g, 0.5, 0.6, 0.45, C("#8a5a3c"), -0.4, 0, 2.6);
    B(g, 0.2, 0.3, 0.2, glowCol("#ffe8a8"), -0.4, 0.6, 2.6);
    P_.frame(g, 1.6, 1.9, 2.97, 1, 1.3, GLOW("poster", 256, 256, painting("#5b7fd6", "#f2a65a")));
    B(g, 1.2, 2, 0.6, C("#a8724a"), 3.2, 0, 2.5);
    return { seated: true, spots: { bed: [-1.4, 0.5, 1.6], sit: [-0.8, 0.45, 0.6] } };
  },
  hospital(g, r) {
    room(g, { w: 8, zb: 3, h: 3.2, floor: T2("hfloor", 512, 512, tiles("#d8e6ea", "#c2d2d7", 6), 4, 6), wall: T2("hwall", 512, 512, blocks("#eef6f7", "#9fcfd8", "#6fa9b6"), 3, 1), ceil: C("#f4f8fa") });
    P_.bed(g, 0.6, 1.5, Math.PI / 2, "#7fb3d9");
    P_.heartMonitor(g, 2, 1.2, 2.5);
    P_.ivStand(g, -0.4, 2);
    B(g, 0.6, 0.9, 0.5, C("#e8ebf0"), 2.8, 0, 2.6);
    for (let k = 0; k < 6; k++) P(g, 0.4, 2.6, C(k % 2 ? "#9ccfd8" : "#8ec4ce"), -3.6 + k * 0.42, 1.5, 0.5 + k * 0.05, Math.PI / 2);
    return { spots: { bed: [0.6, 0.5, 1.5], sit: [-1.2, 0.45, 0.8] } };
  },
  lab(g, r) {
    room(g, { w: 9, zb: 3, h: 3.2, floor: T2("labfloor", 512, 512, tiles("#e3eef2", "#cbd8dd", 6), 4, 6), wall: T2("labwall", 512, 512, panels("#e9eef2", "#c9d1d8"), 3, 1), ceil: C("#f4f8fa") });
    P_.counter(g, 0, 2.5, 7, "#2e3440", "#dde3e8");
    for (let k = 0; k < 7; k++) P_.flask(g, -3 + k, 0.93, 2.5, pick(r, ["#46d17a", "#4ca9f0", "#f05fa0", "#f0b429", "#9b6cf0"]));
    P_.monitor(g, 2.4, 0.93, 2.6, 21);
    P_.shelf(g, -2.2, 2, 2.85, 2, 6, 31);
    P_.shelf(g, 2, 2, 2.85, 2, 6, 37);
    return { spots: { sit: [2, 0.7, 1.6], type: [2.4, 0, 1.9] } };
  },
  courtroom(g, r) {
    room(g, { w: 10, zb: 3.6, h: 4, floor: T2("crfloor", 512, 512, carpet("#7a2a2a", "#6a2222"), 4, 6), wall: T2("crwall", 512, 512, panels("#a8724a", "#7a4f33"), 3, 1), ceil: C("#e9dfc9") });
    P_.judgeBench(g, 0, 3);
    P_.chair(g, 0, 3.4, Math.PI, "#3a2a20");
    B(g, 1.2, 1, 0.8, C("#7a4f33"), 3.2, 0, 2.4);
    P_.bench(g, -2.6, -1.4, 2.6);
    P_.bench(g, 2.6, -1.4, 2.6);
    P_.bench(g, -2.6, -3, 2.6);
    P_.bench(g, 2.6, -3, 2.6);
    P_.clock(g, 0, 3.4, 3.55);
    return { seated: true, spots: { sit: [-2.6, 0.45, -1.4] } };
  },
  museum(g, r) {
    room(g, { w: 11, zb: 3.4, h: 4, floor: T2("mfloor", 512, 512, planksFloor("#9c7350", "#8c6646"), 5, 7), wall: T2("mwall", 512, 512, blocks("#e2d6bf", "#cbbb9c", "#a8977a"), 3, 1), ceil: C("#efe9dc") });
    P_.frame(g, -3.2, 2.2, 3.38, 1.6, 1.2, GLOW("art1", 256, 256, painting("#3e6fa8", "#e8c15a")));
    P_.frame(g, 0, 2.3, 3.38, 1.8, 1.6, GLOW("art2", 256, 256, painting("#7e4e9c", "#f08a5d")));
    P_.frame(g, 3.2, 2.2, 3.38, 1.6, 1.2, GLOW("art3", 256, 256, painting("#2f8f6a", "#f2e3a0")));
    B(g, 0.7, 1, 0.7, C("#f2eee6"), -1.6, 0, 1.6);
    S(g, 0.28, C("#c46a3a"), -1.6, 1.3, 1.6, 1.4);
    B(g, 0.7, 1, 0.7, C("#f2eee6"), 1.6, 0, 1.6);
    S(g, 0.3, C("#e9e4da"), 1.6, 1.4, 1.6);
    P_.rope(g, -3.4, -2, 2.4);
    P_.rope(g, 2, 3.4, 2.4);
    return { spots: { sit: [3.8, 0.45, 0.5] } };
  },
  castle(g, r) {
    room(g, { w: 10, zb: 5, h: 5.5, floor: T2("castfloor", 512, 512, tiles("#a8a092", "#8a8274", 4), 5, 8), wall: T2("castwall", 512, 512, blocks("#b8b2a6", "#a8a092", "#8a8274"), 3, 2), ceil: C("#6b6358") });
    const carpet_ = mesh(new THREE4.PlaneGeometry(2, 16), C("#c8102e"), false);
    carpet_.rotation.x = -Math.PI / 2;
    carpet_.position.set(0, 0.01, -3);
    g.add(carpet_);
    P_.throne(g, 0, 4);
    for (const x of [-3.5, 3.5]) {
      P_.banner(g, x, 3, 4.95, pick(r, ["#c8102e", "#2f4fa8", "#2e7d4f"]));
      P_.torch(g, x * 0.6, 2, 4.9);
      P_.column(g, x, 0, 5.5);
    }
    return { seated: true, spots: { sit: [0, 0.75, 3.8] } };
  },
  shop(g, r) {
    room(g, { w: 10, zb: 3.4, h: 3.4, floor: T2("sfloor", 512, 512, tiles("#eef0f3", "#d4d8de", 6), 5, 8), wall: T2("swall", 512, 512, blocks("#f6e6a6", "#e9876b", "#c8102e"), 3, 1), ceil: C("#f4f4f0") });
    P_.storeShelf(g, -3, 2.9, 3);
    P_.storeShelf(g, 0, 2.9, 9);
    P_.storeShelf(g, -3.6, -1, 13, Math.PI / 2);
    P_.counter(g, 3, 1, 2.4, "#2e3440", "#e8ebf0");
    P_.register(g, 3.2, 0.93, 1);
    for (let k = 0; k < 3; k++) P_.lamp(g, -2 + k * 2.5, 3.35, 0.5, 1.6);
    return { spots: { sit: [2.4, 0.45, 2] } };
  },
  // a mine tunnel: dirt walls, timber frames, lanterns, a rail track and a cart; a hole to dig
  tunnel(g, r) {
    room(g, { w: 5, zb: 6, zf: -14, h: 3, floor: T2("tfloor", 512, 512, dirt("#7a5a3a", "#5e4430"), 3, 10), wall: T2("twall", 512, 512, dirt("#8a6a4a", "#6b4f35"), 3, 2), ceil: T2("tceil", 512, 512, dirt("#6b4f35", "#5a422c"), 3, 10) });
    for (let z = -10; z < 6; z += 2.5) {
      B(g, 0.2, 2.9, 0.2, C("#7a5232"), -2.3, 0, z);
      B(g, 0.2, 2.9, 0.2, C("#7a5232"), 2.3, 0, z);
      B(g, 4.8, 0.2, 0.2, C("#7a5232"), 0, 2.85, z);
      P_.lantern(g, 2.15, 2, z + 0.2);
    }
    P_.railTrack(g, -1.4, -12, 6);
    P_.mineCart(g, -1.4, 2.6);
    P_.pickaxe(g, 1.6, 2.2);
    P_.hole(g, 1, 0.8, 0.6);
    return { spots: { dig: [1, 0, 0.8] }, night: true };
  },
  // a trench on a battlefield: sandbag walls, duckboards, barbed wire, mud, a smoky sky
  trench(g, r) {
    const ground = T2("mud", 512, 512, dirt("#6b5b45", "#4e4232"), 8, 8);
    P(g, 40, 40, ground, 0, 0, 0, 0, -Math.PI / 2);
    for (let z = -12; z < 6; z += 0.6) B(g, 1.4, 0.04, 0.12, C("#7a5a3a"), 0, 0, z);
    P_.sandbags(g, -6, 6, 2.6, 4);
    P_.sandbags(g, -6, -1.2, -1.2, 2);
    P_.sandbags(g, 1.6, 6, -1.2, 2);
    P_.wire(g, -6, 6, 5);
    for (let k = 0; k < 4; k++) P_.crate(g, -4 + k * 2.6, 3.6 + k % 2, 0.5, "#6b5b45");
    for (const [x, z] of [[-5, 9], [3, 12], [7, 8]]) {
      Cy(g, 0.12, 0.16, 2.6, C("#2e2620"), x, 0, z, 6);
    }
    return { spots: { dig: [1.2, 0, 1], sit: [-2, 0.4, 1.6] }, outdoor: true };
  },
  camp(g, r) {
    P(g, 40, 40, T2("forestgr", 512, 512, dirt("#5f9a4a", "#4f8a3e"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    P_.tent(g, -2.4, 2.6, pick(r, ["#e8823a", "#3f7fd9", "#46b07a"]));
    P_.campfire(g, 0.8, 1);
    P_.log(g, 0.8, 0.2, 0);
    P_.log(g, 1.9, 1.2, 1.4);
    for (let k = 0; k < 10; k++) P_.pine(g, -8 + k * 1.8 + r(), 6 + r() * 6, 1.1 + r() * 0.8);
    return { seated: true, spots: { sit: [1.9, 0.3, 1.2] }, outdoor: true };
  },
  beach(g, r) {
    P(g, 40, 22, T2("sand", 512, 512, dirt("#efd9a0", "#e2c78a"), 8, 5), 0, 0, -2, 0, -Math.PI / 2);
    const sea = mesh(new THREE4.PlaneGeometry(80, 30), C("#2f9ad0"), false);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.02, 22);
    g.add(sea);
    P_.umbrella(g, -2, 2);
    const towel = mesh(new THREE4.PlaneGeometry(0.9, 1.8), C("#e5484d"), false);
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(-1.2, 0.01, 1.2);
    g.add(towel);
    P_.tree(g, 4, 3, 1.3, "#4caf50");
    P_.crate(g, 2.4, 2, 0.5, "#c79260");
    return { spots: { bed: [-1.2, 0.05, 1.2] }, outdoor: true };
  },
  desert(g, r) {
    P(g, 50, 50, T2("dsand", 512, 512, dirt("#e8c48a", "#d9b06e"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    for (let k = 0; k < 6; k++) {
      const d = S(g, 3 + r() * 2, C("#e2b56a"), -12 + k * 5, -1.5, 12 + r() * 6, 0.4);
      d.receiveShadow = true;
    }
    P_.cactus(g, -2.6, 2);
    P_.cactus(g, 3.4, 4);
    P_.rock(g, 1.6, 1.4, 0.5, "#b8864f");
    P_.rock(g, -4, 4, 0.7, "#a8784a");
    return { seated: true, spots: { sit: [1.6, 0.4, 1.4] }, outdoor: true };
  },
  farm(g, r) {
    P(g, 50, 50, T2("farmgr", 512, 512, dirt("#79b85a", "#6aa84f"), 8, 8), 0, 0, 0, 0, -Math.PI / 2);
    B(g, 5, 3.4, 4, C("#b8322a"), -2.5, 0, 7);
    const roof_ = mesh(new THREE4.ConeGeometry(3.6, 1.6, 4), C("#5a3b2a"));
    roof_.position.set(-2.5, 4.2, 7);
    roof_.rotation.y = Math.PI / 4;
    g.add(roof_);
    P(g, 1.4, 2, C("#f4f1ea"), -2.5, 1, 4.98);
    P_.fence(g, -6, 6, 2.6);
    P_.hay(g, 2.4, 1.6);
    P_.hay(g, 3.6, 2.2);
    P_.tree(g, 5.2, 6, 1.4);
    return { seated: true, spots: { sit: [2.4, 1, 1.6] }, outdoor: true };
  }
};
var SET_NAMES = Object.keys(MAPS);
function buildMapLocal(id, seed = 1) {
  const make = MAPS[id];
  if (!make) return null;
  const inner = new THREE4.Group(), root = new THREE4.Group();
  root.add(inner);
  root.rotation.y = Math.PI;
  root.name = "map_" + id;
  const r = rng(seed * 7919 + id.length * 131);
  const info = make(inner, r, seed) || {};
  const sp = info.spots?.sit;
  if (sp && !info.seated) P_.chair(inner, sp[0], sp[2] + 0.12, 0, pick(r, ["#3a3f4b", "#5a6270", "#7a4f33"]));
  const spots = {};
  for (const [k, v] of Object.entries(info.spots || {})) spots[k] = [-v[0], v[1], -v[2]];
  return { root, spots, outdoor: !!info.outdoor };
}

// src/maps3d.ts
function buildMapInto(scene, id, seed = 1) {
  useMaterials({
    color: (c) => new THREE5.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0 }),
    map: (_k, tex) => {
      tex.colorSpace = THREE5.SRGBColorSpace;
      return new THREE5.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
    }
  });
  const m = buildMapLocal(id, seed);
  if (m) scene.add(m.root);
  return m;
}
export {
  SET_NAMES,
  buildMapInto
};
