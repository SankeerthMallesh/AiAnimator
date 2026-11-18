// Safety gate for generated pictures. Returns true when a picture may be used.
let worker = null;
let dead = false;
let nextId = 1;
const pending = new Map();

function call(msg, transfer = [], timeoutMs = 90000) {
  if (dead) return Promise.reject(new Error('safety check unavailable'));
  if (!worker) {
    try {
      const u = new URL('./safety-worker.js', import.meta.url);
      u.search = new URL(import.meta.url).search;
      worker = new Worker(u, { type: 'module' });
    } catch (e) { dead = true; return Promise.reject(e); }
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.type === 'error') p.reject(new Error(e.data.message)); else p.resolve(e.data);
    };
    worker.onerror = (e) => {
      dead = true;
      for (const p of pending.values()) p.reject(new Error(e.message || 'safety worker crashed'));
      pending.clear();
    };
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('safety check timed out')); }, timeoutMs);
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    worker.postMessage({ ...msg, id }, transfer);
  });
}

export function preloadSafety() { return call({ type: 'load' }, [], 300000).then(() => true, () => false); }

// Prompts about bodies are where the free model goes wrong; if the checker can't run, those are refused.
const RISKY = /\b(body|bodies|torso|chest|abdomen|belly|stomach|intestin|organ|anatom|medical|skin|flesh|muscle|lung|heart|breath|swallow|digest|blood|vein|naked|nude|person|people|man|woman|human|girl|boy|patient)\b/i;

export async function isSafeImage(bitmap, prompt, log) {
  try {
    const copy = await createImageBitmap(bitmap);
    const { score } = await call({ type: 'check', bitmap: copy }, [copy]);
    if (score >= 0.35) { log?.(`Picture rejected by the safety check (${Math.round(score * 100)}% explicit).`); return false; }
    return true;
  } catch (e) {
    const risky = RISKY.test(prompt || '');
    log?.(`Safety check could not run (${e.message}); ${risky ? 'refusing this body-related picture to be safe.' : 'allowing this low-risk picture.'}`);
    return !risky;
  }
}
