// The 3D engine: renders any moment of an "edit" (a list of shots) into a WebGL canvas, entirely in
// code. Adapted from the zach-d-films engine's main.js in claude-animation-skills (MIT, Copyright
// (c) 2026 Artem Novitckii; see LICENSE here): the page set-up is gone, the size is a parameter,
// and captions and fades are left to Loomy, which draws them over the frame so they are in the MP4.
//
// An edit is { shots: [{ start, end, build }] }. A shot's build({ makeStage, W, H }) returns
// { scene, camera, update(t, T) }, where t is the time inside the shot and T the time in the video;
// update may return { dof: { focus, aperture, maxblur }, bloom, exposure }. update must depend only
// on t, because a render can start anywhere.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const SKY_FRAG = `
  uniform vec3 top, mid, horizon, floorC; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 c = y > 0.0 ? mix(mix(horizon, mid, smoothstep(0.0,0.12,y)), top, smoothstep(0.1,0.8,y))
                     : mix(horizon, floorC, smoothstep(0.0,-0.08,y));
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
  }`;

export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0x2b78d6) }, mid: { value: new THREE.Color(0x5b9fea) },
      horizon: { value: new THREE.Color(0x92c3f2) }, floorC: { value: new THREE.Color(0xa9cdf1) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// width x height is the render size. Grain is off by default: it adds noise that video compression
// turns to mush (the skill's light grain; the cartoon skill found the same).
export function createEngine({ width = 1080, height = 1920, grain = false } = {}) {
  const W = width, H = height, px = H / 1280; // pixel-sized settings scale with the height
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Shared environment: a soft studio for reflections on metal.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  {
    const s = new THREE.Mesh(new THREE.SphereGeometry(20, 64, 32), skyMaterial());
    s.material.toneMapped = true; envScene.add(s);
    const u = s.material.uniforms;
    u.top.value.set(0x9aa6b6); u.mid.value.set(0xb7c2cf); u.horizon.value.set(0xe2e6ea); u.floorC.value.set(0x5c6066);
    const panel = (w, h, pos, inten) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(inten, inten, inten), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); envScene.add(m);
    };
    panel(8, 4, [-6, 8, 6], 3.2);
    panel(4, 10, [9, 3, -2], 1.6);
    panel(10, 3, [0, 4, -9], 1.0);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x55595f }));
    fl.rotation.x = -Math.PI / 2; fl.position.y = -1.2; envScene.add(fl);
  }
  const envTex = pmrem.fromScene(envScene, 0.02).texture;

  function makeStage({ shadowSize = 3, sunDir = [-3, 6, 4], sun = 2.3, sky = null } = {}) {
    const scene = new THREE.Scene();
    scene.environment = envTex;
    scene.environmentIntensity = 1.0;
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), skyMaterial());
    if (sky) for (const [k, v] of Object.entries(sky)) skyMesh.material.uniforms[k]?.value.set(v);
    skyMesh.frustumCulled = false; skyMesh.renderOrder = -10;
    scene.add(skyMesh); scene.userData.sky = skyMesh;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: 0x1a3a66, opacity: 0.32 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x7f93ad, 0.75));
    const key = new THREE.DirectionalLight(0xfff3e6, sun);
    key.position.set(...sunDir); key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    const c = key.shadow.camera; c.left = c.bottom = -shadowSize; c.right = c.top = shadowSize; c.near = 0.5; c.far = 30;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xdbe9ff, 1.2); rim.position.set(4, 3, -5); scene.add(rim);
    scene.userData.key = key;
    return scene;
  }

  // Post: depth of field, bloom, then a vignette and light grain.
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.setSize(W, H);
  const dummyScene = new THREE.Scene(), dummyCam = new THREE.PerspectiveCamera();
  const renderPass = new RenderPass(dummyScene, dummyCam);
  const bokeh = new BokehPass(dummyScene, dummyCam, { focus: 2, aperture: 0.002, maxblur: 0.01 });
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.25, 0.4 * px, 1.6);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.28 }, uGrain: { value: grain ? 0.018 : 0 }, uRes: { value: H } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uRes; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*7.13) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv);
        vec2 q = vUv - 0.5; q.x *= 0.5625;
        c.rgb *= 1.0 - uVig * smoothstep(0.18, 0.62, length(q));
        c.rgb += (h(floor(vUv*uRes)) - 0.5) * uGrain;
        gl_FragColor = c; }`,
  });
  composer.addPass(renderPass);
  composer.addPass(bokeh);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(grade);

  let edit = { shots: [] };
  const built = new Map();
  const getShot = (i) => {
    if (!built.has(i)) built.set(i, edit.shots[i].build({ makeStage, W, H }));
    return built.get(i);
  };

  return {
    canvas: renderer.domElement, width: W, height: H, makeStage, renderer,
    setEdit(e) { disposeShots(); edit = e; },
    // Renders time t (seconds) and returns which shot it was.
    renderAt(t) {
      const shots = edit.shots;
      if (!shots.length) return -1;
      let idx = shots.findIndex(s => t >= s.start && t < s.end);
      if (idx < 0) idx = t < shots[0].start ? 0 : shots.length - 1;
      const def = shots[idx], shot = getShot(idx);
      const r = shot.update(t - def.start, t) || {};
      const cam = shot.camera;
      cam.aspect = W / H; cam.updateProjectionMatrix();
      shot.scene.userData.sky?.position.copy(cam.position);
      renderPass.scene = bokeh.scene = shot.scene;
      renderPass.camera = bokeh.camera = cam;
      const dof = r.dof || { focus: 3, aperture: 0, maxblur: 0 };
      bokeh.enabled = dof.aperture > 0;
      bokeh.uniforms.focus.value = dof.focus;
      bokeh.uniforms.aperture.value = dof.aperture;
      bokeh.uniforms.maxblur.value = (dof.maxblur ?? 0.012);
      bokeh.uniforms.nearClip.value = cam.near; bokeh.uniforms.farClip.value = cam.far;
      bloom.strength = (r.bloom ?? 0.35) * 0.6;
      renderer.toneMappingExposure = r.exposure ?? 1.0;
      grade.uniforms.uTime.value = t;
      composer.render();
      // Shots far from t are freed, so long videos keep memory flat.
      for (const k of [...built.keys()]) if (Math.abs(k - idx) > 1) { disposeScene(built.get(k).scene); built.delete(k); }
      return idx;
    },
    dispose() { disposeShots(); composer.dispose?.(); rt.dispose(); envTex.dispose(); pmrem.dispose(); renderer.dispose(); },
  };

  function disposeShots() { for (const s of built.values()) disposeScene(s.scene); built.clear(); }
}

function disposeScene(scene) {
  scene?.traverse((o) => {
    o.geometry?.dispose?.();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { for (const v of Object.values(m)) if (v && v.isTexture && !v.isRenderTargetTexture && v !== scene.environment) v.dispose?.(); m.dispose?.(); }
  });
}
