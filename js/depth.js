// Depth maps for the 3D camera. Uses the in-browser AI model, falls back to a synthetic map.
import { syntheticDepth } from './gl3d.js';

let worker = null;
let failed = false;
let nextId = 1;
const pending = new Map();
let progressFn = null;

function ensureWorker() {
  if (worker || failed) return worker;
  try {
    worker = new Worker(new URL('./depth-worker.js', import.meta.url), { type: 'module' });
  } catch { failed = true; return null; }
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'progress') { progressFn?.(d); return; }
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.type === 'error') p.reject(new Error(d.message)); else p.resolve(d);
  };
  worker.onerror = (e) => {
    failed = true;
    for (const p of pending.values()) p.reject(new Error(e.message || 'depth worker crashed'));
    pending.clear();
  };
  return worker;
}

function call(msg, transfer = [], timeoutMs = 120000) {
  const w = ensureWorker();
  if (!w) return Promise.reject(new Error('depth unavailable'));
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('depth timed out')); }, timeoutMs);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    w.postMessage({ ...msg, id }, transfer);
  });
}

export function onDepthProgress(fn) { progressFn = fn; }

export function preloadDepth() {
  return call({ type: 'load' }, [], 300000).then(() => true, () => false);
}

let modelOk = true;
// Returns { data, width, height } — never throws.
export async function estimateDepth(image, { log } = {}) {
  if (modelOk && !failed) {
    try {
      const bmp = await createImageBitmap(image);
      const d = await call({ type: 'estimate', bitmap: bmp }, [bmp], 90000);
      return { data: d.data, width: d.width, height: d.height };
    } catch (e) {
      modelOk = false; // don't keep waiting on a model that can't load on this device
      log?.(`3D depth model unavailable (${e.message}); using estimated depth.`);
    }
  }
  const portrait = image.height >= image.width;
  return portrait ? syntheticDepth(96, 160) : syntheticDepth(160, 96);
}
