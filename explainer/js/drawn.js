// The renderer for looks drawn in code (no AI pictures): the zach-d-films engine with Loomy's shot
// library (z3d/auto3d.js) for realistic people, or the blocky world (z3d/autoblocky.js). It has the
// same face as Renderer for the encoder: canvas, W, H, drawFrame(t), dispose().
import { createEngine } from './z3d/engine.js';
import { composeFrame } from './z3d/film.js';
import * as A3 from './z3d/auto3d.js';
import { planExplains, explainAt, drawExplain } from '../../shared/explain.js';
import { hookFx } from '../../shared/hooks.js';
import { teaserIndex, withTeaser, headlineText, drawHeadline, drawCutFlash, drawChapterCard, chapterAt, TEASE } from '../../shared/hooks.js';

export class DrawnRenderer {
  constructor(canvas, { timeline, script, kind = '3d', W, H, perf = {}, captions = true, hooks = true }) {
    this.canvas = canvas; this.W = W; this.H = H;
    canvas.width = W; canvas.height = H;
    this.g = canvas.getContext('2d');
    this.kind = kind;
    this.showCaptions = captions; // the Captions: Off setting
    // The hook stack (shared/hooks.js): a cold open on the teaser scene, a headline, a flash on the cut.
    this.teaser = hooks ? teaserIndex(timeline.scenes, script.teaser) : -1;
    this.headline = hooks ? headlineText(script) : '';
    this.scenes = timeline.scenes;
    this.explains = planExplains(timeline.scenes); // 2.2: diagram cutaways for the lines that explain something
    this.ready = this.init(timeline, script, perf);
  }

  async init(timeline, script, perf) {
    if (this.kind === 'blocky') {
      const AB = await import('./z3d/autoblocky.js');
      const castMap = AB.castFor(script.characters || []);
      this.specs = withTeaser(AB.planShots(timeline.scenes, castMap), this.teaser);
      this.shots = this.specs.map(spec => ({ start: spec.start, end: spec.end, build: (ctx) => AB.buildShot(spec, ctx) }));
      this.captions = AB.captionsFrom(timeline.scenes);
      this.captionStyle = 'blocky';
    } else {
      const castMap = A3.castFor(script.characters || []);
      this.specs = withTeaser(A3.planShots(timeline.scenes, castMap), this.teaser);
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
    const under = (g, tt) => { hookFx(g, this.W, this.H, tt); const ex = explainAt(this.explains, tt); if (ex) drawExplain(g, this.W, this.H, ex, tt); };
    composeFrame(this.engine, this.g, this.W, this.H, t, { captions: this.showCaptions ? this.captions : [], captionStyle: this.captionStyle, under });
    if (this.teaser >= 0) drawCutFlash(this.g, this.W, this.H, t);
    // Blocky captions sit at 23 % of the height, so its headline sits higher.
    drawHeadline(this.g, this.W, this.H, t, this.headline, { top: this.kind === 'blocky' ? 0.09 : 0.14 });
    const ch = chapterAt(this.scenes, t); // long form: a title card opens each chapter
    if (ch && ch.n > 1) drawChapterCard(this.g, this.W, this.H, ch.local, ch.n, ch.title);
  }

  dispose() { this.engine?.dispose(); this.engine = null; }
}
