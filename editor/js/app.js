// Loomy Edit: wires the project, the media, the preview, the timeline and the inspector together.

import { newProject, addSource, addSegment, split, trim, move, remove, update, setFormat, History, timeline, duration, segLen, fmtTime, uid } from './model.js';
import { Media } from './media.js';
import { Preview } from './preview.js';
import { Timeline, escapeHtml } from './timeline.js';
import { exportProject } from './export.js';
import { canEncode } from '../../shared/encode.js';

document.title = 'Loomy · Edit';
const $ = (s) => document.querySelector(s);
const media = new Media();
const history = new History(newProject());
let project = history.now;
let selected = null;   // id of the selected part
let live = null;       // a project being dragged (trim), not yet in the history

const get = () => live || project;
const preview = new Preview($('#preview'), media, get, { onTime: (t) => tl.setTime(t, preview.playing) });
const tl = new Timeline($('#timeline'), {
  get, media, selected: () => selected,
  onSeek: (t) => { preview.pause(); setPlaying(); preview.show(t); },
  onSelect: (id, t) => { select(id); if (t != null) { preview.pause(); setPlaying(); preview.show(t); } },
  onTrim: (id, edge, value, final) => {
    live = trim(project, id, edge, value);
    const e = timeline(live).find(x => x.seg.id === id);
    if (e) preview.show(edge === 'in' ? e.start : Math.max(e.start, e.end - 0.03));
    if (final) commit(live); else tl.render();
  },
  onMove: (id, to) => commit(move(project, id, to)),
});

function commit(p, { keepTime = true } = {}) {
  live = null;
  project = history.push(p);
  if (selected && !project.segments.some(s => s.id === selected)) selected = null;
  render();
  if (keepTime) preview.refresh();
}

function render() {
  const p = get();
  tl.render();
  inspector();
  const has = p.segments.length > 0;
  $('#stageEmpty').hidden = has;
  $('#btnUndo').disabled = !history.past.length;
  $('#btnRedo').disabled = !history.future.length;
  $('#btnSplit').disabled = !has;
  $('#btnDelete').disabled = !selected;
  $('#btnExport').disabled = !has;
  $('#format').value = p.format;
}

function select(id) { selected = id; tl.select(id); inspector(); $('#btnDelete').disabled = !selected; }

// ---------- inspector: the selected part ----------
function inspector() {
  const box = $('#inspector'), p = get();
  const seg = p.segments.find(s => s.id === selected);
  if (!seg) { box.innerHTML = '<p class="hint">Select a part on the timeline to change it.</p>'; return; }
  const src = p.sources[seg.src] || {};
  box.innerHTML = `
    <h2>${escapeHtml(src.name || 'Video')}</h2>
    <p class="meta">Part ${p.segments.indexOf(seg) + 1} of ${p.segments.length} · ${fmtTime(segLen(seg))} long · from a ${fmtTime(src.duration || 0)} video</p>
    <div class="pair">
      <label class="field"><span>Starts at (s)</span><input type="number" id="inIn" min="0" step="0.1" value="${seg.in.toFixed(2)}"></label>
      <label class="field"><span>Ends at (s)</span><input type="number" id="inOut" min="0" step="0.1" value="${seg.out.toFixed(2)}"></label>
    </div>
    <div class="field"><span>Framing</span><div class="seg-choice" role="group" aria-label="Framing">
      <button type="button" data-fit="fill" aria-pressed="${seg.fit !== 'fit'}">Fill the frame</button>
      <button type="button" data-fit="fit" aria-pressed="${seg.fit === 'fit'}">Whole picture</button></div></div>
    <div class="seg-tools">
      <button class="btn" type="button" id="insSplit">Split here</button>
      <button class="btn" type="button" id="insDup">Duplicate</button>
      <button class="btn" type="button" id="insDel">Delete</button>
    </div>`;
  box.querySelector('#inIn').addEventListener('change', (e) => commit(trim(project, seg.id, 'in', e.target.value)));
  box.querySelector('#inOut').addEventListener('change', (e) => commit(trim(project, seg.id, 'out', e.target.value)));
  box.querySelectorAll('[data-fit]').forEach(b => b.addEventListener('click', () => commit(update(project, seg.id, { fit: b.dataset.fit }))));
  box.querySelector('#insSplit').addEventListener('click', doSplit);
  box.querySelector('#insDel').addEventListener('click', doDelete);
  box.querySelector('#insDup').addEventListener('click', () => {
    const i = project.segments.findIndex(s => s.id === seg.id);
    const q = structuredClone(project);
    const copy = { ...structuredClone(seg), id: uid('s') };
    q.segments.splice(i + 1, 0, copy);
    selected = copy.id; commit(q);
  });
}

// ---------- actions ----------
function doSplit() {
  const { project: q, id } = split(project, preview.t);
  if (!id) { toast('Move the playhead inside a part (not right at its edge) to split it.'); return; }
  selected = id; commit(q);
}
function doDelete() {
  if (!selected) return;
  const e = timeline(project).find(x => x.seg.id === selected);
  // The file stays loaded even when no part uses it any more: Undo can bring the part back.
  const q = remove(project, selected);
  selected = null;
  commit(q);
  if (e) preview.show(Math.min(e.start, Math.max(0, duration(q) - 1e-3)));
}
function setPlaying() { document.body.classList.toggle('playing', preview.playing); $('#btnPlay').setAttribute('aria-label', preview.playing ? 'Pause (Space)' : 'Play (Space)'); }

async function addFiles(files) {
  const list = [...files].filter(f => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name));
  if (!list.length) { toast('Those are not video files.', true); return; }
  const first = !project.segments.length;
  for (const f of list) {
    const id = uid('v');
    toast(`Opening ${f.name}…`);
    try {
      const info = await media.load(id, f);
      let q = addSource(project, id, info);
      const r = addSegment(q, id);
      selected = r.id;
      commit(r.project, { keepTime: false });
    } catch (e) { toast(e.message, true); }
  }
  if (first) tl.fit();
  await preview.show(first ? 0 : preview.t);
  toast(list.length > 1 ? `${list.length} videos added.` : 'Video added. Drag its ends to trim, or drag it to move it.');
}

$('#fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
$('#btnUndo').addEventListener('click', () => { project = history.undo(); fixSelection(); render(); preview.refresh(); });
$('#btnRedo').addEventListener('click', () => { project = history.redo(); fixSelection(); render(); preview.refresh(); });
$('#btnSplit').addEventListener('click', doSplit);
$('#btnDelete').addEventListener('click', doDelete);
$('#format').addEventListener('change', (e) => commit(setFormat(project, e.target.value)));
$('#btnPlay').addEventListener('click', () => { preview.toggle(); setPlaying(); });
$('#btnBack').addEventListener('click', () => { preview.pause(); setPlaying(); preview.show(0); tl.scroll.scrollLeft = 0; });
function fixSelection() { if (selected && !project.segments.some(s => s.id === selected)) selected = null; }

// Drop files anywhere on the page.
let dragDepth = 0;
addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('#dropCover').hidden = false; } });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#dropCover').hidden = true; } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; $('#dropCover').hidden = true; if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });

// Keyboard: Space play, S split, Delete, Ctrl+Z / Ctrl+Shift+Z, arrows step one frame (Shift: 1 s).
addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, [contenteditable]')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); preview.toggle(); setPlaying(); }
  else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('#btnRedo') : $('#btnUndo')).click(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); $('#btnRedo').click(); }
  else if (!mod && e.key.toLowerCase() === 's') { e.preventDefault(); doSplit(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { if (selected) { e.preventDefault(); doDelete(); } }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); preview.pause(); setPlaying();
    preview.show(preview.t + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 1 / 30));
  }
});

// ---------- export ----------
let exporting = null;
$('#btnExport').addEventListener('click', async () => {
  if (!canEncode()) { toast('Exporting needs Chrome or Edge on a computer.', true); return; }
  preview.pause(); setPlaying();
  const box = $('#exportBox'), bar = $('#exportBar'), status = $('#exportStatus'), dl = $('#exportDownload'), vid = $('#exportVideo'), close = $('#exportClose');
  box.hidden = false; dl.hidden = true; vid.hidden = true; bar.style.width = '0%'; close.textContent = 'Cancel';
  exporting = new AbortController();
  const t0 = performance.now();
  try {
    const blob = await exportProject(project, media, {
      signal: exporting.signal,
      onStage: (s) => { status.textContent = s; },
      onProgress: (f) => { bar.style.width = `${Math.round(f * 100)}%`; },
    });
    const url = URL.createObjectURL(blob);
    if (dl.href) URL.revokeObjectURL(dl.href);
    dl.href = url; dl.hidden = false; vid.src = url; vid.hidden = false;
    status.textContent = `Done: ${fmtTime(duration(project))} of video in ${Math.round((performance.now() - t0) / 1000)} s (${(blob.size / 1e6).toFixed(1)} MB).`;
    close.textContent = 'Close';
    window.loomyEditorExport = { size: blob.size, url, seconds: duration(project) };
  } catch (e) {
    status.textContent = e.name === 'AbortError' ? 'Export cancelled.' : `Export failed: ${e.message}`;
    close.textContent = 'Close';
  } finally { exporting = null; }
});
$('#exportClose').addEventListener('click', () => { if (exporting) exporting.abort(); else $('#exportBox').hidden = true; });

function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('bad', bad); t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, bad ? 6000 : 3000);
}

// For tests: the project as it stands.
window.loomyEditor = { get project() { return project; }, preview, media };
render();
preview.show(0);
addEventListener('resize', () => tl.render());
