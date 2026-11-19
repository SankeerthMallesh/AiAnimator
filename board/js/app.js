// Idea board: pin notes on a cork board, tie them together with red yarn, share by link.
// Everything is saved in this browser; a share link carries a full copy of the board.

const $ = (s) => document.querySelector(s);
const STORE = 'ideaboard.v1';
const COLORS = ['#FFF6A8', '#FFFFFF', '#CDE8FF', '#FFD3DF', '#D4F5C9', '#FFE0B8'];
const uid = () => Math.random().toString(36).slice(2, 9);

const stage = $('#stage'), world = $('#world'), cardsEl = $('#cards'), yarnEl = $('#yarn');
let board = null;
let color = COLORS[0];
let selNote = null, selLink = null;
let saveTimer = null;
const embedded = window.top !== window;

// ---------- storage ----------
function blank() {
  return { name: 'Idea board', notes: [], links: [], view: { x: 0, y: 0, z: 1 } };
}
function sample() {
  const b = blank();
  const a = { id: uid(), x: 80, y: 120, w: 220, title: 'Video idea', body: 'Why do railroad tracks have gaps?', color: COLORS[0], tilt: -2 };
  const c = { id: uid(), x: 420, y: 80, w: 220, title: 'Hook', body: 'A "perfect" railroad would rip itself apart', color: COLORS[2], tilt: 1.5 };
  const d = { id: uid(), x: 400, y: 330, w: 220, title: 'Fact to check', body: 'How much does steel grow on a hot day?', color: COLORS[3], tilt: -1 };
  b.notes.push(a, c, d);
  b.links.push({ a: a.id, b: c.id }, { a: a.id, b: d.id });
  return b;
}
function load() {
  try { const raw = localStorage.getItem(STORE); if (raw) return JSON.parse(raw); } catch { /* storage blocked */ }
  return null;
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE, JSON.stringify(board)); } catch { /* storage full or blocked */ }
  }, 150);
}

// ---------- view ----------
function applyView() {
  const v = board.view;
  world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
  $('#zoomVal').textContent = `${Math.round(v.z * 100)}%`;
  stage.style.backgroundPosition = `${v.x}px ${v.y}px, ${v.x}px ${v.y}px, ${v.x}px ${v.y}px, 0 0`;
}
function toWorld(cx, cy) {
  const r = stage.getBoundingClientRect(), v = board.view;
  return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
}
function zoomAt(cx, cy, factor) {
  const v = board.view;
  const z = Math.min(2.5, Math.max(0.25, v.z * factor));
  const r = stage.getBoundingClientRect();
  const px = cx - r.left, py = cy - r.top;
  v.x = px - (px - v.x) * (z / v.z);
  v.y = py - (py - v.y) * (z / v.z);
  v.z = z;
  applyView(); save();
}
function fit() {
  if (!board.notes.length) { board.view = { x: 0, y: 60, z: 1 }; applyView(); return; }
  const xs = board.notes.flatMap(n => [n.x, n.x + n.w]);
  const ys = board.notes.flatMap(n => { const el = cardEl(n.id); return [n.y, n.y + (el ? el.offsetHeight : 140)]; });
  const minX = Math.min(...xs) - 40, maxX = Math.max(...xs) + 40, minY = Math.min(...ys) - 50, maxY = Math.max(...ys) + 40;
  const r = stage.getBoundingClientRect();
  const top = document.querySelector('.bar').offsetHeight + 16;
  const z = Math.min(1.4, Math.max(0.25, Math.min(r.width / (maxX - minX), (r.height - top - 20) / (maxY - minY))));
  board.view = { z, x: (r.width - (maxX - minX) * z) / 2 - minX * z, y: top + (r.height - top - (maxY - minY) * z) / 2 - minY * z };
  applyView(); save();
}

// ---------- drawing ----------
const cardEl = (id) => cardsEl.querySelector(`.card[data-id="${id}"]`);
function pinPoint(n) { return { x: n.x + n.w / 2, y: n.y + 4 }; }
function yarnPath(p, q) {
  // A loose string sags under its own weight.
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  const sag = Math.min(90, Math.hypot(q.x - p.x, q.y - p.y) * 0.16);
  return `M${p.x},${p.y} Q${mx},${my + sag} ${q.x},${q.y}`;
}
function drawYarn(ghost) {
  const byId = new Map(board.notes.map(n => [n.id, n]));
  let html = '';
  board.links.forEach((l, i) => {
    const a = byId.get(l.a), b = byId.get(l.b);
    if (!a || !b) return;
    const d = yarnPath(pinPoint(a), pinPoint(b));
    html += `<path class="hit" data-link="${i}" d="${d}"/><path class="${selLink === i ? 'sel' : ''}" d="${d}"/>`;
  });
  if (ghost) html += `<path class="ghost" d="${yarnPath(ghost.from, ghost.to)}"/>`;
  yarnEl.innerHTML = html;
}
function render() {
  cardsEl.innerHTML = '';
  for (const n of board.notes) {
    const el = document.createElement('div');
    el.className = 'card' + (selNote === n.id ? ' sel' : '');
    el.dataset.id = n.id;
    el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; el.style.width = `${n.w}px`;
    el.style.setProperty('--paper', n.color);
    el.style.setProperty('--tilt', `${n.tilt || 0}deg`);
    el.innerHTML = `<div class="pin" title="Drag to another note to connect"></div>
      <div class="title" data-ph="Title"></div><div class="body" data-ph="Write your idea…"></div>
      <div class="tools"><button data-act="video" title="Make a cartoon video from this note">Cartoon</button><button data-act="explainer" title="Make a 3D explainer video from this note">3D</button><button data-act="del" title="Delete note" aria-label="Delete note">✕</button></div>`;
    el.querySelector('.title').textContent = n.title || '';
    el.querySelector('.body').textContent = n.body || '';
    cardsEl.append(el);
  }
  drawYarn();
  $('#hint').hidden = board.notes.length > 0;
  $('#boardName').value = board.name || 'Idea board';
}

// ---------- editing ----------
function addNote(at, opts = {}) {
  if (typeof boardViewOnly !== 'undefined' && boardViewOnly) return null;
  const n = { id: uid(), x: Math.round(at.x - 110), y: Math.round(at.y - 30), w: 220, title: '', body: '', color, tilt: Math.round((Math.random() * 4 - 2) * 10) / 10, ...opts };
  board.notes.push(n);
  selNote = n.id; selLink = null;
  render(); save();
  startEdit(n.id, 'title');
  return n;
}
function startEdit(id, part) {
  if (typeof boardViewOnly !== 'undefined' && boardViewOnly) return;
  const el = cardEl(id); if (!el) return;
  const f = el.querySelector(`.${part}`);
  f.contentEditable = 'true'; f.focus();
  const range = document.createRange(); range.selectNodeContents(f); range.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(range);
}
cardsEl.addEventListener('focusout', (e) => {
  const f = e.target; if (!f.matches?.('.title, .body')) return;
  const n = board.notes.find(x => x.id === f.closest('.card').dataset.id); if (!n) return;
  n[f.classList.contains('title') ? 'title' : 'body'] = f.innerText.trim();
  f.contentEditable = 'false';
  save();
});
cardsEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') e.target.blur();
  if (e.key === 'Enter' && e.target.classList.contains('title')) { e.preventDefault(); startEdit(e.target.closest('.card').dataset.id, 'body'); }
});
cardsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const n = board.notes.find(x => x.id === b.closest('.card').dataset.id); if (!n) return;
  const topic = [n.title, n.body].filter(Boolean).join(': ');
  if (b.dataset.act === 'del') { removeNote(n.id); return; }
  if (!topic) { toast('Write something on the note first.'); return; }
  if (embedded) { parent.postMessage({ loomy: 'open', tool: b.dataset.act === 'video' ? 'cartoon' : '3d', topic }, location.origin); return; }
  const url = new URL(b.dataset.act === 'video' ? '../cartoon/' : '../explainer/', location.href);
  url.searchParams.set('topic', topic);
  window.open(url.toString(), '_blank', 'noopener');
});
function removeNote(id) {
  board.notes = board.notes.filter(n => n.id !== id);
  board.links = board.links.filter(l => l.a !== id && l.b !== id);
  if (selNote === id) selNote = null;
  selLink = null; render(); save();
}

// ---------- pointer: drag notes, tie yarn, pan, pinch ----------
const touches = new Map();
let gesture = null;
let lastTap = { t: 0, x: 0, y: 0, id: null };
function isDoubleTap(e, id) {
  const now = performance.now();
  const hit = now - lastTap.t < 400 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 14 && lastTap.id === id;
  lastTap = hit ? { t: 0, x: 0, y: 0, id: null } : { t: now, x: e.clientX, y: e.clientY, id };
  return hit;
}
stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('[contenteditable="true"], .tools, .zoom')) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    gesture = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  // Viewers can pan and zoom, nothing else.
  if (typeof boardViewOnly !== 'undefined' && boardViewOnly && (e.target.closest('.card') || e.target.closest('path.hit'))) {
    stage.setPointerCapture(e.pointerId);
    gesture = { kind: 'pan', x: e.clientX, y: e.clientY, vx: board.view.x, vy: board.view.y };
    return;
  }
  const hitLink = e.target.closest('path.hit');
  const pin = e.target.closest('.pin');
  const card = e.target.closest('.card');
  stage.setPointerCapture(e.pointerId);
  if (hitLink) {
    const idx = Number(hitLink.dataset.link);
    const again = selLink === idx;
    selLink = idx; selNote = null; render();
    if (!again) toast('String selected. Press Delete, or tap it again to cut it.', 2400);
    gesture = { kind: 'link', idx, again };
  } else if (pin) {
    const n = board.notes.find(x => x.id === card.dataset.id);
    gesture = { kind: 'yarn', from: n.id };
  } else if (card) {
    const n = board.notes.find(x => x.id === card.dataset.id);
    if (isDoubleTap(e, n.id)) {
      const f = e.target.closest('.title, .body');
      e.preventDefault(); gesture = null; touches.delete(e.pointerId);
      startEdit(n.id, f?.classList.contains('title') ? 'title' : 'body');
      return;
    }
    const p = toWorld(e.clientX, e.clientY);
    // Bring to the front.
    board.notes = board.notes.filter(x => x !== n).concat(n);
    const hadLink = selLink != null;
    selNote = n.id; selLink = null;
    cardsEl.querySelectorAll('.card.sel').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel', 'lifted');
    cardsEl.append(card); // bring to front without rebuilding, so double-click still lands
    if (hadLink) drawYarn();
    gesture = { kind: 'drag', id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
  } else {
    if (isDoubleTap(e, 'board')) {
      e.preventDefault(); gesture = null; touches.delete(e.pointerId);
      addNote(toWorld(e.clientX, e.clientY));
      return;
    }
    if (selNote || selLink != null) { selNote = null; selLink = null; render(); }
    gesture = { kind: 'pan', x: e.clientX, y: e.clientY, vx: board.view.x, vy: board.view.y };
    stage.classList.add('panning');
  }
});
stage.addEventListener('pointermove', (e) => {
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (gesture.kind === 'pinch' && touches.size === 2) {
    const [a, b] = [...touches.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt(gesture.cx, gesture.cy, dist / gesture.dist);
    gesture.dist = dist;
  } else if (gesture.kind === 'drag') {
    const n = board.notes.find(x => x.id === gesture.id); if (!n) return;
    const p = toWorld(e.clientX, e.clientY);
    n.x = Math.round(p.x - gesture.dx); n.y = Math.round(p.y - gesture.dy); gesture.moved = true;
    const el = cardEl(n.id); el.style.left = `${n.x}px`; el.style.top = `${n.y}px`;
    drawYarn();
  } else if (gesture.kind === 'yarn') {
    const n = board.notes.find(x => x.id === gesture.from);
    drawYarn({ from: pinPoint(n), to: toWorld(e.clientX, e.clientY) });
  } else if (gesture.kind === 'pan') {
    board.view.x = gesture.vx + (e.clientX - gesture.x);
    board.view.y = gesture.vy + (e.clientY - gesture.y);
    applyView();
  }
});
function endPointer(e) {
  touches.delete(e.pointerId);
  if (!gesture) return;
  if (gesture.kind === 'yarn') {
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card');
    const to = under?.dataset.id;
    if (to && to !== gesture.from && !board.links.some(l => (l.a === gesture.from && l.b === to) || (l.b === gesture.from && l.a === to))) {
      board.links.push({ a: gesture.from, b: to });
      save();
    }
    drawYarn();
  } else if (gesture.kind === 'link' && gesture.again) {
    deleteSelected();
  } else if (gesture.kind === 'drag') {
    cardEl(gesture.id)?.classList.remove('lifted');
    if (gesture.moved) save();
  } else if (gesture.kind === 'pan') {
    stage.classList.remove('panning'); save();
  }
  gesture = touches.size ? gesture : null;
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  else { board.view.x -= e.deltaX; board.view.y -= e.deltaY; applyView(); save(); }
}, { passive: false });

function deleteSelected() {
  if (typeof boardViewOnly !== 'undefined' && boardViewOnly) return false;
  if (selLink != null) { board.links.splice(selLink, 1); selLink = null; render(); save(); return true; }
  if (selNote) { removeNote(selNote); return true; }
  return false;
}
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('[contenteditable="true"], input')) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && deleteSelected()) e.preventDefault();
  if (e.key.toLowerCase() === 'n') { const r = stage.getBoundingClientRect(); addNote(toWorld(r.left + r.width / 2, r.top + r.height / 2)); e.preventDefault(); }
});

// ---------- toolbar ----------
const sw = $('#swatches');
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.style.background = c; b.setAttribute('aria-label', `Colour ${i + 1}`); b.setAttribute('role', 'radio');
  if (i === 0) b.classList.add('on');
  b.addEventListener('click', () => {
    color = c;
    sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const n = board.notes.find(x => x.id === selNote);
    if (n) { n.color = c; render(); save(); }
  });
  sw.append(b);
});
$('#addNote').addEventListener('click', () => { const r = stage.getBoundingClientRect(); addNote(toWorld(r.left + r.width / 2, r.top + r.height / 2 + 20)); });
$('#fitBtn').addEventListener('click', fit);
$('#zoomIn').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); });
$('#zoomOut').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2); });
$('#boardName').addEventListener('input', (e) => { board.name = e.target.value; save(); });
const menu = $('#menu');
$('#moreBtn').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; $('#moreBtn').setAttribute('aria-expanded', String(!menu.hidden)); });
document.addEventListener('click', (e) => { if (!e.target.closest('#menu, #moreBtn')) menu.hidden = true; });

// ---------- share, save, open ----------
async function pack(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const zipped = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
  let s = ''; const a = new Uint8Array(zipped);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpack(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  const text = await new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  return JSON.parse(text);
}
function clean(obj) {
  // Accept only the shape we expect, so a shared link or file can't inject anything else.
  const s = (v, n) => String(v ?? '').slice(0, n);
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const notes = (Array.isArray(obj?.notes) ? obj.notes : []).slice(0, 500).map(n => ({
    id: s(n.id, 12) || uid(), x: num(n.x, 0), y: num(n.y, 0), w: Math.min(400, Math.max(140, num(n.w, 220))),
    title: s(n.title, 200), body: s(n.body, 2000), color: /^#[0-9a-f]{6}$/i.test(n.color) ? n.color : COLORS[0], tilt: Math.max(-4, Math.min(4, num(n.tilt, 0))),
  }));
  const ids = new Set(notes.map(n => n.id));
  const links = (Array.isArray(obj?.links) ? obj.links : []).filter(l => ids.has(l.a) && ids.has(l.b)).slice(0, 2000).map(l => ({ a: l.a, b: l.b }));
  return { name: s(obj?.name, 80) || 'Idea board', notes, links, view: { x: 0, y: 0, z: 1 } };
}
$('#shareBtn').addEventListener('click', async () => {
  const code = await pack({ name: board.name, notes: board.notes, links: board.links });
  const url = embedded ? `${new URL('../', location.href).href}#board:b=${code}` : `${location.origin}${location.pathname}#b=${code}`;
  try { await navigator.clipboard.writeText(url); toast('Link copied. Anyone who opens it gets their own copy of this board to edit.', 4500); }
  catch { prompt('Copy this link to share the board:', url); }
});
$('#exportBtn').addEventListener('click', () => {
  menu.hidden = true;
  const blob = new Blob([JSON.stringify({ name: board.name, notes: board.notes, links: board.links }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(board.name || 'idea-board').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('#importBtn').addEventListener('click', () => { menu.hidden = true; $('#importFile').click(); });
$('#importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { board = clean(JSON.parse(await f.text())); render(); fit(); save(); toast('Board opened.'); }
  catch { toast('That file is not a board.'); }
  e.target.value = '';
});
$('#newBoardBtn').addEventListener('click', () => {
  menu.hidden = true;
  if (board.notes.length && !confirm('Start a new, empty board? Save or share this one first if you want to keep it.')) return;
  board = blank(); selNote = null; selLink = null; render(); applyView(); save();
});
$('#clearBtn').addEventListener('click', () => {
  menu.hidden = true;
  if (!confirm('Remove every note and string from this board?')) return;
  board.notes = []; board.links = []; render(); save();
});

let toastTimer;
function toast(msg, ms = 3000) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- start ----------
(async () => {
  const m = location.hash.match(/#b=([\w-]+)/);
  if (m) {
    try {
      board = clean(await unpack(m[1]));
      history.replaceState(null, '', location.pathname);
      render(); fit(); save();
      toast('Opened a shared board. It is now saved in this browser.', 4000);
      return;
    } catch { toast('That share link is damaged. Opening your own board instead.'); }
  }
  board = load() || sample();
  if (!board.view) board.view = { x: 0, y: 60, z: 1 };
  render(); applyView();
  if (!load()) { fit(); save(); }
})();

// View-only visitors can look at the board but not change it.
let boardViewOnly = false;
(async () => {
  try {
    const r = await fetch('/__access/status', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok || !(r.headers.get('Content-Type') || '').includes('json')) return;
    boardViewOnly = (await r.json()).role === 'view';
    if (boardViewOnly) {
      document.documentElement.classList.add('viewonly');
      for (const id of ['addNote', 'shareBtn', 'moreBtn']) { const b = document.getElementById(id); if (b) b.disabled = true; }
      toast('View only: the board can be looked at but not changed.', 4000);
    }
  } catch { /* no lock on this site */ }
})();
