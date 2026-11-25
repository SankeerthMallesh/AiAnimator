// Loomy Studio: everything is kept in this browser (localStorage for text, IndexedDB for voiceover audio).
// Nothing is invented: projects, characters and analytics are only what you make or enter.
const KEY = 'loomy.studio.v1';
const blank = () => ({ projects: [], characters: [], videos: [], current: null });
let db = load();
const subs = new Set();

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && Array.isArray(d.projects) ? { ...blank(), ...d } : blank(); } catch { return blank(); }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { throw new Error('This browser is out of storage space for Studio. Remove a character picture or an old project, or save a backup and clear.'); }
  subs.forEach((f) => f());
}
export const state = () => db;
export const onChange = (f) => subs.add(f);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function project(id = db.current) { return db.projects.find((p) => p.id === id) || null; }
export function newProject(title = 'Untitled story', genre = 'mystery') {
  const p = { id: uid(), title, genre, created: Date.now(), updated: Date.now(), story: null, scenes: [], cast: [], voice: null, subs: [], subsTimed: '', checks: {} };
  db.projects.unshift(p); db.current = p.id; save(); return p;
}
export function updateProject(p, patch = {}) { Object.assign(p, patch, { updated: Date.now() }); save(); }
export function deleteProject(id) { db.projects = db.projects.filter((p) => p.id !== id); if (db.current === id) db.current = db.projects[0]?.id || null; audioDel(id).catch(() => {}); save(); }
export function select(id) { db.current = id; save(); }

export function character(id) { return db.characters.find((c) => c.id === id) || null; }
export function upsertCharacter(c) { const i = db.characters.findIndex((x) => x.id === c.id); if (i >= 0) db.characters[i] = c; else db.characters.push(c); save(); }
export function deleteCharacter(id) { db.characters = db.characters.filter((c) => c.id !== id); db.projects.forEach((p) => { p.cast = (p.cast || []).filter((x) => x !== id); }); save(); }

export function setVideos(rows) { db.videos = rows; save(); }

/** a whole backup (text data; voiceovers stay in this browser) */
export const backup = () => JSON.stringify({ app: 'loomy-studio', v: 1, saved: new Date().toISOString(), ...db }, null, 1);
export function restore(text) {
  const d = JSON.parse(text);
  if (d?.app !== 'loomy-studio' || !Array.isArray(d.projects)) throw new Error('That file is not a Loomy Studio backup.');
  db = { ...blank(), projects: d.projects, characters: d.characters || [], videos: d.videos || [], current: d.current || d.projects[0]?.id || null };
  save();
}

// ---------- voiceover audio (IndexedDB) ----------
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('loomy-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (mode, fn) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('audio', mode), s = t.objectStore('audio'), r = fn(s); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };
export const audioPut = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const audioGet = (id) => tx('readonly', (s) => s.get(id));
export const audioDel = (id) => tx('readwrite', (s) => s.delete(id));
