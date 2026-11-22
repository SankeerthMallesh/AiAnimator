// Browser driver for the cartoon-3d-short engine (MIT, the claude-animated-shorts bridge template):
// the same world, story and post chain as Bridge.tsx, without React or Remotion.
//   ink -> lens blur pre -> lens blur main -> [bloom, NEUTRAL tone map, grade] -> output, MSAA 4.
// renderFrame(f) draws frame f (30 fps) into `canvas`; crossfades between places use a second view.
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";
import { frameAt, aerialAt, TSpec, PLACE_NAMES } from "./tmpl";
import { setCardMax, setLooks } from "./cast";
export { PLACE_NAMES };
export { setStaticBase } from "./shim/remotion";
export { TOTAL, SHOTS };

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = (b as any).mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

class View {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; world: World;
  composer: EffectComposer; ink: InkPass; lens: LensBlur; grade: GradeEffect; target = new THREE.Vector3();
  constructor(kit: any, w: number, h: number, perf: { msaa?: number; shadow?: number } = {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.2, 1500);
    this.world = new World(kit);
    this.scene.add(this.world.root);
    if (perf.shadow) this.world.setShadowSize(perf.shadow);
    this.composer = new EffectComposer(r, { multisampling: perf.msaa ?? 4, frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ink = new InkPass(this.scene, this.camera);
    this.composer.addPass(this.ink as any);
    this.lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
    this.composer.addPass(new EffectPass(this.camera, this.lens.pre));
    this.composer.addPass(new EffectPass(this.camera, this.lens.main));
    this.grade = new GradeEffect(GRADES.day, GRADE_STRENGTH.day);
    this.composer.addPass(new EffectPass(this.camera, makeBloom(), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), this.grade));
    this.composer.setSize(w, h);
  }
  draw(id: number, f: number) {
    const cam = this.camera;
    this.target.copy(this.world.update(id, f, cam, this.scene));
    noInkFallback(this.world.root);
    const d = dofAt(f);
    const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    if (d.focus) fpt.set(...(d.focus(f) as [number, number, number])); else fpt.copy(this.target);
    this.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    this.lens.cInf = d.cInf;
    gradeFor(this.grade, SHOTS[id - 1].light);
    this.composer.render();
    return this.renderer.domElement;
  }
  /** frees the GPU: the post chain, the world, the drawings and the WebGL context itself */
  dispose() {
    this.composer.dispose(); this.ink.dispose(); this.lens.dispose();
    this.world.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }

  /** one frame of a Loomy template shot (tmpl.ts) */
  drawTemplate(s: TSpec, t: number) {
    const cam = this.camera, local = t - s.start;
    const fr = frameAt(s, local);
    if (s.place === "town") { fr.cam = aerialAt(s.light, local / Math.max(0.1, s.end - s.start)); fr.people = []; fr.effects = []; fr.cInf = 0; fr.focus = fr.cam.look; }
    this.world.updateTemplate(fr, t, cam, this.scene);
    noInkFallback(this.world.root);
    const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(...fr.focus);
    cam.getWorldDirection(fwd);
    this.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    this.lens.cInf = fr.cInf;
    gradeFor(this.grade, fr.light);
    this.composer.render();
    return this.renderer.domElement;
  }
}

// Loomy's own videos with this engine: shots from a script (tmpl.ts TSpec, times in seconds). renderAt(t)
// draws the frame at time t; a 6-frame dip through white marks a change of place (the film's crossfade feel).
// perf: the browser defaults are lighter than the film's offline settings (which can stall a weaker graphics
// card): MSAA 2, a 2048 shadow map, character drawings at most 1080 px wide.
export async function createTemplated({ width = 1080, height = 1920, shots = [] as TSpec[], perf = {} as { msaa?: number; shadow?: number; cardMax?: number }, looks = [] as any[] } = {}) {
  const kit = await loadKit();
  setLooks(looks);
  setCardMax(perf.cardMax ?? 1080);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const g = canvas.getContext("2d", { alpha: false })!;
  const view = new View(kit, width, height, { msaa: perf.msaa ?? 2, shadow: perf.shadow ?? 2048 });
  const list = [...shots].sort((a, b) => a.start - b.start);
  const at = (t: number) => list.find((s) => t >= s.start && t < s.end) ?? list[list.length - 1];
  return {
    canvas, shots: list,
    renderAt(t: number) {
      const s = at(t);
      g.globalAlpha = 1;
      g.drawImage(view.drawTemplate(s, t), 0, 0, width, height);
      const i = list.indexOf(s), prev = list[i - 1];
      if (prev && prev.place !== s.place) {
        const k = (t - s.start) * 30;
        if (k < 6) { g.globalAlpha = 0.55 * (1 - k / 6); g.fillStyle = "#ffffff"; g.fillRect(0, 0, width, height); g.globalAlpha = 1; }
      }
      return canvas;
    },
    dispose() { view.dispose(); },
  };
}

export async function createBridge({ width = 1080, height = 1920 } = {}) {
  const kit = await loadKit();
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const g = canvas.getContext("2d", { alpha: false })!;
  const views: View[] = [];
  const view = (i: number) => (views[i] ||= new View(kit, width, height));
  return {
    canvas, total: TOTAL, kitCount: Object.keys(kit).length,
    renderFrame(f: number) {
      g.globalAlpha = 1; g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, width, height);
      layersAt(f).forEach((l, i) => { g.globalAlpha = l.alpha; g.drawImage(view(i).draw(l.id, f), 0, 0, width, height); });
      g.globalAlpha = 1;
      const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
      if (flash > 0) { g.globalAlpha = flash; g.fillStyle = "#ffffff"; g.fillRect(0, 0, width, height); g.globalAlpha = 1; }
      return canvas;
    },
  };
}
