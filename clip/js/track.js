// Keeping the speaker in a vertical crop: a person detector (MediaPipe, loaded on first use) looks at
// the clip twice a second; the crop then glides to follow the main person (the biggest, and the one
// nearest where the crop already is), and holds still between sightings. It finds people at any
// distance, which suits IRL streams. If nobody is seen often enough, the clip uses the full frame
// on a blurred background.

const TV = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
let detectorP = null;

// The detector's engine prints start-up notes ("Created TensorFlow Lite XNNPACK delegate…") as
// console errors; keep those out of the console while it starts and runs.
async function quiet(fn) {
  const err = console.error, info = console.info, warn = console.warn;
  const skip = (orig) => (...a) => { if (/TensorFlow|XNNPACK|delegate|gl_context|OpenGL/i.test(String(a[0]))) return; orig.apply(console, a); };
  console.error = skip(err); console.info = skip(info); console.warn = skip(warn);
  try { return await fn(); } finally { setTimeout(() => { console.error = err; console.info = info; console.warn = warn; }, 1500); }
}

function getDetector() {
  if (detectorP) return detectorP;
  detectorP = (async () => {
    const vision = await import(`${TV}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${TV}/wasm`);
    return quiet(() => vision.ObjectDetector.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL }, runningMode: 'IMAGE', scoreThreshold: 0.35, categoryAllowlist: ['person'], maxResults: 5 }));
  })();
  detectorP.catch(() => { detectorP = null; });
  return detectorP;
}

function seek(video, t) {
  return new Promise((resolve) => {
    const done = () => { video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done);
    video.currentTime = t;
    setTimeout(done, 4000);
  });
}

// Returns { mode: 'crop' | 'fit', at(t) -> centre x as a share of the frame width }
export async function trackSpeaker(video, s, e, { log } = {}) {
  let detector;
  try { detector = await getDetector(); } catch { log?.('Face finder unavailable; using the full frame.'); return { mode: 'fit', at: () => 0.5 }; }
  const W = 320, H = Math.max(2, Math.round(320 * video.videoHeight / video.videoWidth));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const points = [];
  let seen = 0, looked = 0;
  for (let t = s; t <= e; t += 0.5) {
    await seek(video, t);
    g.drawImage(video, 0, 0, W, H);
    looked++;
    let best = null, bestScore = -1;
    const prev = points.length ? points[points.length - 1].x : 0.5;
    try {
      for (const d of detector.detect(c).detections || []) {
        const b = d.boundingBox;
        const area = (b.width * b.height) / (W * H);
        const x = (b.originX + b.width / 2) / W;
        const score = area * 2 + (d.categories?.[0]?.score || 0) * 0.3 - Math.abs(x - prev) * 0.5;
        if (score > bestScore) { bestScore = score; best = b; }
      }
    } catch { /* skip frame */ }
    if (best) { seen++; points.push({ t, x: (best.originX + best.width / 2) / W }); }
  }
  if (seen < looked * 0.35) return { mode: 'fit', at: () => 0.5 };
  // Smooth: median of neighbours, then limit how fast the crop may move.
  const xs = points.map((p, i) => {
    const near = points.slice(Math.max(0, i - 2), i + 3).map(q => q.x).sort((a, b) => a - b);
    return { t: p.t, x: near[Math.floor(near.length / 2)] };
  });
  return {
    mode: 'crop',
    at(t) {
      if (t <= xs[0].t) return xs[0].x;
      for (let i = 1; i < xs.length; i++) {
        if (t <= xs[i].t) {
          const a = xs[i - 1], b = xs[i];
          // Hold, then ease across the last 40% of the gap, so the frame does not wobble.
          const k = Math.max(0, ((t - a.t) / (b.t - a.t) - 0.6) / 0.4);
          const ease = k * k * (3 - 2 * k);
          return Math.abs(b.x - a.x) < 0.04 ? a.x : a.x + (b.x - a.x) * ease;
        }
      }
      return xs[xs.length - 1].x;
    },
  };
}
