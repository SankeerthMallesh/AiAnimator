// Loomy 2.0: the 7-minute promise. A video under a minute is made in at most 7 minutes from pressing Make
// (longer videos get 7 minutes per minute). Before the export, Loomy times a few frames on this computer and keeps
// the asked quality if the render fits in the time left; otherwise it steps down (fewer frames a second first,
// then fewer pixels) to the best one that fits. "Best" in Speed never steps down.
export const BUDGET_S = 420;
export const budgetFor = (durationS) => BUDGET_S * Math.max(1, (Number(durationS) || 0) / 60);
/** [short side, fps], best first */
export const TIERS = [[1080, 30], [1080, 24], [720, 30], [720, 24], [540, 24]];
const ENCODE = 1.15; // encoding and muxing on top of drawing

/** the render that fits: asked = { short, fps }; msPerFrame measured at the asked size */
export function planRender({ elapsedS = 0, durationS = 60, asked = { short: 1080, fps: 30 }, msPerFrame = 50, budgetS = budgetFor(durationS), margin = 20 }) {
  const left = budgetS - elapsedS - margin;
  const est = ([q, f]) => durationS * f * msPerFrame * ENCODE * (q / asked.short) ** 2 / 1000;
  const options = [[asked.short, asked.fps], ...TIERS.filter(([q, f]) => q <= asked.short && f <= asked.fps && !(q === asked.short && f === asked.fps))];
  for (const o of options) if (est(o) <= left) return { short: o[0], fps: o[1], estS: Math.round(est(o)), leftS: Math.round(left), fits: true, changed: o[0] !== asked.short || o[1] !== asked.fps };
  const o = options[options.length - 1];
  return { short: o[0], fps: o[1], estS: Math.round(est(o)), leftS: Math.round(left), fits: false, changed: o[0] !== asked.short || o[1] !== asked.fps };
}

/** median milliseconds to draw one frame, over a few moments spread through the video */
export async function probeFrames(renderer, durationS, n = 6) {
  const ms = [];
  for (let i = 0; i < n; i++) {
    const t = (durationS * (i + 0.5)) / n;
    const t0 = performance.now();
    if (renderer.prepareFrame) await renderer.prepareFrame(t, { probe: true });
    renderer.drawFrame(t);
    ms.push(performance.now() - t0);
  }
  ms.sort((a, b) => a - b);
  return ms[Math.floor(ms.length / 2)];
}
