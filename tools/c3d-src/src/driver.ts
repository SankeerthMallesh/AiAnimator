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
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt, D0 } from "./story";
import { frameAt, aerialAt, TSpec, PLACE_NAMES } from "./tmpl";
import type { V3 } from "./story";
import { setCardMax, setTheme, setLooks } from "./cast";
import { setFor, SET_NAMES, disposeSets, SetInfo } from "./sets";
export { SET_NAMES };
import { longship, themeFor } from "./viking";
export { themeFor };
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
    disposeSets();
    this.composer.dispose(); this.ink.dispose(); this.lens.dispose();
    this.world.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }

  /** one frame of a Loomy template shot (tmpl.ts) */
  drawTemplate(s: TSpec, t: number) {
    const cam = this.camera, local = t - s.start;
    // 2.0: a map from sets.ts: built once per video seed, the only one shown; the lens looks in from its open front
    const set = SET_NAMES.includes(s.place) ? setFor(s.place, s.mapSeed ?? 1, this.world.root) : null;
    for (const c of this.world.root.children) if (c.name.startsWith("set_")) c.visible = !!set && c === set.root;
    // the lead's action happens at its spot in the map (the bed, the chair, the hole): the shot is anchored there
    // asleep with no bed in the map: dozing in the map's chair, or nodding off on their feet where it has no seat
    let act = s.act === "sleep" && !(set && set.spots.bed) ? (set && set.spots.sit ? "doze" : "dozeup") : s.act;
    // 2.2: sitting or typing where the place has no seat (an open battlefield): they stand and watch instead
    if (set && !set.spots.sit && (act === "sit" || act === "type")) act = set.id === "battlefield" ? "aim" : "look";
    const SPOT: Record<string, string[]> = { sleep: ["bed"], doze: ["sit"], sit: ["sit"], type: ["type", "sit"], eat: ["eat", "sit"], drink: ["sit"], dig: ["dig"], phone: ["sit"] };
    let at: { m: V3; d: [number, number] } | null = null, actY = 0;
    if (set) {
      const name = (SPOT[(act || "").split(":")[0]] || []).find((n) => set.spots[n]);
      const sp = name ? set.spots[name] : null;
      // a seat's spot is its middle: the flat drawing goes just in front of the seat's edge, so the legs hang over
      // it instead of disappearing behind it
      // 2.1: a shot that does not use the map's seat stands to one side of it, so an empty chair is never centre frame
      const seat = set.spots.sit, aside = !sp && seat && Math.abs(seat[0]) < 1.2 && Math.abs(seat[2]) < 1.6 ? (seat[0] >= 0 ? seat[0] - 1.5 : seat[0] + 1.5) : 0;
      // 2.1: in a two-shot or a point shot the lead stands off centre: the anchor moves so the lead is the one at the spot
      const leadR = s.kind === "two" ? -0.62 : s.kind === "point" ? 0.22 : 0;
      at = { m: sp ? [set.origin[0] + sp[0] + leadR, set.origin[1], set.origin[2] + sp[2] - (name === "sit" ? set.front : act === "type" ? 0.05 : 0)] : [set.origin[0] + aside, set.origin[1], set.origin[2]], d: [0, -1] };
      // a high seat (a stool, a throne, a hay bale) lifts the seated drawing to it; its feet hang in front
      actY = sp && act === "sleep" ? sp[1] + 0.3 : sp && name === "sit" && (act === "sit" || act === "doze") ? Math.max(-0.15, sp[1] - 0.45) : 0;
    }
    const fr = frameAt(set ? { ...s, act, at: at!, actY } : s, local);
    if (s.place === "town") { fr.cam = aerialAt(s.light, local / Math.max(0.1, s.end - s.start)); fr.people = []; fr.effects = []; fr.cInf = 0; fr.focus = fr.cam.look; }
    if (set) clearView(set, fr, s.kind === "wide" || s.kind === "group");
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
export async function createTemplated({ width = 1080, height = 1920, shots = [] as TSpec[], perf = {} as { msaa?: number; shadow?: number; cardMax?: number }, theme = "town", looks = [] as any[] } = {}) {
  const kit = await loadKit();
  setLooks(looks);
  setCardMax(perf.cardMax ?? 1080);
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const g = canvas.getContext("2d", { alpha: false })!;
  setTheme(theme);
  const view = new View(kit, width, height, { msaa: perf.msaa ?? 2, shadow: perf.shadow ?? 2048 });
  if (theme === "viking") {
    // two longships on the river in view of the bank and the bridge
    // beached on the quay behind the people, as Vikings drew their ships up the shore on a raid (the river
    // itself sits below the embankment walls, out of the bank shots)
    const a = longship(); a.position.set(-0.5, D0 + 0.05, -29.9); a.rotation.y = 0.22; a.scale.setScalar(0.82); view.world.root.add(a);
    const b = longship(); b.position.set(-12, D0 + 0.05, -29.2); b.rotation.y = -0.18; b.scale.setScalar(0.74); view.world.root.add(b);
  }
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

// 2.0: a film set's "wild walls": props standing between the lens and the cast (a front row of desks, a counter, a
// bench) are left out of that shot, as a film crew moves them, so a desk never hides who the story is about
// in a wide shot the room's furniture is the point: only what is tall enough to hide a face goes
function clearView(set: SetInfo, fr: ReturnType<typeof frameAt>, wide = false) {
  if (!set.boxes) {
    set.root.updateMatrixWorld(true);
    set.boxes = set.root.children.map((o) => ({ o, b: new THREE.Box3().setFromObject(o) }));
  }
  const lead = fr.people[0], camZ = fr.cam.pos[2];
  const cast = lead ? fr.people.filter((p) => Math.abs(p.z - lead.z) < 0.6) : [];
  for (const { o, b } of set.boxes) {
    o.visible = !cast.length || !cast.some((p) =>
      b.max.z < p.z - 0.08 && b.min.z > camZ && b.max.y > set.origin[1] + (wide ? 1.15 : 0.25) && b.min.y < set.origin[1] + 1.7 &&
      b.max.x > p.x - 0.55 && b.min.x < p.x + 0.55 && b.max.x - b.min.x < 8);
  }
}
