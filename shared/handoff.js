// E5: hands a finished Loomy video to the Edit tab. The video (an MP4 blob) and its captions' words
// ([{ text, start, end }] in video seconds) wait in this browser's IndexedDB until the editor takes
// them; a BroadcastChannel tells an editor that is already open. Nothing leaves the computer.

const DB = 'loomy-handoff', STORE = 'videos', KEY = 'edit';
const CHANNEL = 'loomy-edit';

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function tx(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => { db.close(); resolve(out?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  }));
}

// From a video tab: { blob, name, words, duration, tab }.
export async function sendToEditor(item) {
  await tx('readwrite', st => st.put({ ...item, at: Date.now() }, KEY));
  try { const c = new BroadcastChannel(CHANNEL); c.postMessage({ ready: true }); c.close(); } catch { /* old browser: the editor checks on load */ }
}

// In the editor: the waiting video (once), or null.
export async function takeFromHandoff() {
  try {
    const item = await tx('readonly', st => st.get(KEY));
    if (!item) return null;
    await tx('readwrite', st => st.delete(KEY));
    return item;
  } catch { return null; }
}

export function onHandoff(fn) {
  try { const c = new BroadcastChannel(CHANNEL); c.onmessage = () => fn(); return () => c.close(); } catch { return () => {}; }
}

// Switches the Loomy page to the Edit tab (the video tabs live in frames of the hub page).
export function openEditTab() {
  try { if (window.top !== window && window.top.location.origin === location.origin) { window.top.location.hash = '#edit'; return; } } catch { /* cross-origin */ }
  location.href = '/#edit';
}
