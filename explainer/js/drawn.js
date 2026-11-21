// The renderer for looks drawn in code (no AI pictures): the zach-d-films engine with Loomy's shot
// library (z3d/auto3d.js) for realistic people, or the blocky world (z3d/autoblocky.js). It has the
// same face as Renderer for the encoder: canvas, W, H, drawFrame(t), dispose().
import { createEngine } from './z3d/engine.js';
import { composeFrame } from './z3d/film.js';
import * as A3 from './z3d/auto3d.js';

export class DrawnRenderer {
  constructor(canvas, { timeline, script, kind = '3d', W, H, perf = {} }) {
    this.canvas = canvas; this.W = W; this.H = H;
    canvas.width = W; canvas.height = H;
    this.g = canvas.getContext('2d');
    this.kind = kind;
    this.ready = this.init(timeline, script, perf);
  }

  async init(timeline, script, perf) {
    if (this.kind === 'blocky') {
      const AB = await import('./z3d/autoblocky.js');
      const castMap = AB.castFor(script.characters || []);
      this.specs = AB.planShots(timeline.scenes, castMap);
      this.shots = this.specs.map(spec => ({ start: spec.start, end: spec.end, build: (ctx) => AB.buildShot(spec, ctx) }));
      this.captions = AB.captionsFrom(timeline.scenes);
      this.captionStyle = 'blocky';
    } else {
      const castMap = A3.castFor(script.characters || []);
      this.specs = A3.planShots(timeline.scenes, castMap);
      const people = await A3.loadCast(this.specs.flatMap(s => s.cast));
      this.shots = this.specs.map(spec => ({ start: spec.start, end: spec.end, build: (ctx) => A3.buildShot(spec, people, ctx) }));
      this.captions = A3.captionsFrom(timeline.scenes);
      this.captionStyle = 'classic';
    }
    if (this.shots.length) this.shots[this.shots.length - 1].end = Math.max(this.shots[this.shots.length - 1].end, timeline.total + 0.5);
    this.engine = createEngine({ width: this.W, height: this.H, perf });
    this.engine.setEdit({ shots: this.shots });
  }

  // The whole plan in words, for the render log.
  describe() { return (this.specs || []).map(s => `${s.start.toFixed(1)}-${s.end.toFixed(1)} ${s.kind} ${s.set || s.world || ''} ${(s.cast || []).join('+')} ${s.pose || ''} ${s.camera || ''}`.trim()); }

  drawFrame(t) {
    if (!this.engine) return;
    composeFrame(this.engine, this.g, this.W, this.H, t, { captions: this.captions, captionStyle: this.captionStyle });
  }

  dispose() { this.engine?.dispose(); this.engine = null; }
}
