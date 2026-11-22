// Loomy Edit: wires the project, the media, the preview, the timeline and the inspector together.

import { newProject, addSource, addSegment, split, trim, move, remove, update, setFormat, History, timeline, duration, segLen, fmtTime, uid, addText, setCaptions, setMusic, setAudio, setSpeed, setZoom, setTransition, SPEEDS, ZOOMS, TRANSITIONS, TEXT_LOOKS, TEXT_SPOTS } from './model.js';
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
  onMoveText: (id, dt) => {
    const x = project.texts.find(y => y.id === id); if (!x) return;
    const len = x.end - x.start, start = Math.max(0, Math.min(x.start + dt, Math.max(0, duration(project) - 0.1)));
    commit(update(project, id, { start: Math.round(start * 100) / 100, end: Math.round((start + len) * 100) / 100 }));
  },
});

function commit(p, { keepTime = true } = {}) {
  live = null;
  project = history.push(p);
  if (selected && !project.segments.some(s => s.id === selected) && !project.texts.some(x => x.id === selected)) selected = null;
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
  $('#btnText').disabled = !has;
  $('#format').value = p.format;
}

function select(id) { selected = id; tl.select(id); inspector(); $('#btnDelete').disabled = !selected; }

// ---------- inspector: the selected part, the selected text, or the whole video ----------
const opt = (v, label, cur) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${label}</option>`;
const LABEL = { cut: 'Cut', fade: 'Fade', whip: 'Whip pan', zoom: 'Zoom', none: 'None', 'push-in': 'Slow push in', 'pull-out': 'Slow pull out', punch: 'Punch in', bold: 'Bold', box: 'White box', outline: 'Outline', top: 'Top', middle: 'Middle', bottom: 'Bottom' };
function inspector() {
  const box = $('#inspector'), p = get();
  const text = p.texts.find(x => x.id === selected);
  if (text) return textInspector(box, p, text);
  const seg = p.segments.find(s => s.id === selected);
  if (!seg) return videoInspector(box, p);
  const src = p.sources[seg.src] || {};
  const i = p.segments.indexOf(seg);
  box.innerHTML = `
    <h2>${escapeHtml(src.name || 'Video')}</h2>
    <p class="meta">Part ${i + 1} of ${p.segments.length} · ${fmtTime(segLen(seg))} long · from a ${fmtTime(src.duration || 0)} video</p>
    <div class="pair">
      <label class="field"><span>Starts at (s)</span><input type="number" id="inIn" min="0" step="0.1" value="${seg.in.toFixed(2)}"></label>
      <label class="field"><span>Ends at (s)</span><input type="number" id="inOut" min="0" step="0.1" value="${seg.out.toFixed(2)}"></label>
    </div>
    <div class="field"><span>Framing</span><div class="seg-choice" role="group" aria-label="Framing">
      <button type="button" data-fit="fill" aria-pressed="${seg.fit !== 'fit'}">Fill the frame</button>
      <button type="button" data-fit="fit" aria-pressed="${seg.fit === 'fit'}">Whole picture</button></div></div>
    <div class="row2">
      <label class="field"><span>Speed</span><select id="inSpeed">${SPEEDS.map(v => opt(v, `${v}×`, seg.speed)).join('')}</select></label>
      <label class="field"><span>Zoom</span><select id="inZoom">${Object.keys(ZOOMS).map(k => opt(k, LABEL[k], seg.zoom?.kind || 'none')).join('')}</select></label>
    </div>
    <div class="row2">
      <label class="field"><span>${i ? 'Into this part' : 'Into this part (not on the first)'}</span><select id="inTrans" ${i ? '' : 'disabled'}>${TRANSITIONS.map(k => opt(k, LABEL[k], seg.transition?.kind || 'cut')).join('')}</select></label>
      <label class="field"><span>Its sound</span><input type="range" id="inVol" min="0" max="2" step="0.05" value="${seg.vol ?? 1}" aria-label="Volume of this part"></label>
    </div>
    <div class="seg-tools">
      <button class="btn" type="button" id="insSplit">Split here</button>
      <button class="btn" type="button" id="insDup">Duplicate</button>
      <button class="btn" type="button" id="insDel">Delete</button>
    </div>`;
  box.querySelector('#inIn').addEventListener('change', (e) => commit(trim(project, seg.id, 'in', e.target.value)));
  box.querySelector('#inOut').addEventListener('change', (e) => commit(trim(project, seg.id, 'out', e.target.value)));
  box.querySelectorAll('[data-fit]').forEach(b => b.addEventListener('click', () => commit(update(project, seg.id, { fit: b.dataset.fit }))));
  box.querySelector('#inSpeed').addEventListener('change', (e) => commit(setSpeed(project, seg.id, e.target.value)));
  box.querySelector('#inZoom').addEventListener('change', (e) => commit(setZoom(project, seg.id, e.target.value)));
  box.querySelector('#inTrans').addEventListener('change', (e) => commit(setTransition(project, seg.id, e.target.value)));
  box.querySelector('#inVol').addEventListener('change', (e) => commit(update(project, seg.id, { vol: Number(e.target.value) })));
  box.querySelector('#insSplit').addEventListener('click', doSplit);
  box.querySelector('#insDel').addEventListener('click', doDelete);
  box.querySelector('#insDup').addEventListener('click', () => {
    const j = project.segments.findIndex(s => s.id === seg.id);
    const q = structuredClone(project);
    const copy = { ...structuredClone(seg), id: uid('s') };
    q.segments.splice(j + 1, 0, copy);
    selected = copy.id; commit(q);
  });
}

// E2: one text box.
function textInspector(box, p, x) {
  box.innerHTML = `
    <h2>Text</h2>
    <label class="field"><span>Words</span><textarea id="txText" maxlength="200">${escapeHtml(x.text)}</textarea></label>
    <div class="pair">
      <label class="field"><span>From (s)</span><input type="number" id="txStart" min="0" step="0.1" value="${x.start.toFixed(2)}"></label>
      <label class="field"><span>To (s)</span><input type="number" id="txEnd" min="0" step="0.1" value="${x.end.toFixed(2)}"></label>
    </div>
    <div class="field"><span>Where</span><div class="seg-choice" role="group" aria-label="Where">${Object.keys(TEXT_SPOTS).map(k => `<button type="button" data-spot="${k}" aria-pressed="${x.spot === k}">${LABEL[k]}</button>`).join('')}</div></div>
    <div class="field"><span>Look</span><div class="seg-choice" role="group" aria-label="Look">${TEXT_LOOKS.map(k => `<button type="button" data-look="${k}" aria-pressed="${x.look === k}">${LABEL[k]}</button>`).join('')}</div></div>
    <div class="row2">
      <label class="field"><span>Size</span><input type="range" id="txSize" min="0.5" max="2.5" step="0.1" value="${x.size}" aria-label="Text size"></label>
      <label class="field"><span>Colour</span><input type="color" id="txColor" value="${x.color || '#ffffff'}" aria-label="Text colour"></label>
    </div>
    <div class="seg-tools"><button class="btn" type="button" id="txDel">Delete text</button></div>`;
  const set = (patch) => commit(update(project, x.id, patch));
  box.querySelector('#txText').addEventListener('change', (e) => set({ text: e.target.value.slice(0, 200) || ' ' }));
  box.querySelector('#txStart').addEventListener('change', (e) => { const v = Math.max(0, Number(e.target.value) || 0); set({ start: v, end: Math.max(v + 0.1, x.end) }); });
  box.querySelector('#txEnd').addEventListener('change', (e) => set({ end: Math.max(x.start + 0.1, Number(e.target.value) || 0) }));
  box.querySelectorAll('[data-spot]').forEach(b => b.addEventListener('click', () => set({ spot: b.dataset.spot })));
  box.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => set({ look: b.dataset.look })));
  box.querySelector('#txSize').addEventListener('change', (e) => set({ size: Number(e.target.value) }));
  box.querySelector('#txColor').addEventListener('change', (e) => set({ color: e.target.value }));
  box.querySelector('#txDel').addEventListener('click', () => { selected = null; commit(remove(project, x.id)); });
}

// Nothing selected: the whole video's sound, captions and texts.
function videoInspector(box, p) {
  if (!p.segments.length) { box.innerHTML = '<p class="hint">Select a part on the timeline to change it.</p>'; return; }
  const a = p.audio, caps = p.captions.length;
  box.innerHTML = `
    <h2>The whole video</h2>
    <p class="meta">${fmtTime(duration(p))} · ${p.segments.length} part${p.segments.length > 1 ? 's' : ''}. Select a part or a text on the timeline to change it.</p>
    <h3>Music</h3>
    ${p.music ? `<p class="meta">♪ ${escapeHtml(p.music.name)}</p>
    <label class="field"><span>Music volume</span><input type="range" id="muVol" min="0" max="1" step="0.05" value="${a.musicVol}" aria-label="Music volume"></label>
    <label class="check"><input type="checkbox" id="muDuck" ${a.duck ? 'checked' : ''}> Quieter under the videos' own sound</label>
    <div class="seg-tools"><button class="btn" type="button" id="muDel">Remove music</button></div>` : '<p class="meta">No music. Use Music in the toolbar to add a song or a beat.</p>'}
    <h3>Sound</h3>
    <label class="field"><span>Videos' own sound</span><input type="range" id="auSrc" min="0" max="2" step="0.05" value="${a.sourceVol}" aria-label="Volume of the videos"></label>
    <div class="row2">
      <label class="field"><span>Fade in (s)</span><input type="number" id="auIn" min="0" max="5" step="0.5" value="${a.fadeIn}"></label>
      <label class="field"><span>Fade out (s)</span><input type="number" id="auOut" min="0" max="5" step="0.5" value="${a.fadeOut}"></label>
    </div>
    <h3>Captions</h3>
    ${caps ? `<div class="seg-choice" role="group" aria-label="Captions">${['bold', 'outline', 'off'].map(k => `<button type="button" data-cap="${k}" aria-pressed="${(p.captionStyle?.look || 'bold') === k}">${k === 'off' ? 'Off' : LABEL[k]}</button>`).join('')}</div>
    <label class="field"><span>Caption height</span><input type="range" id="capY" min="0.15" max="0.9" step="0.01" value="${p.captionStyle?.y ?? 0.7}" aria-label="Caption height"></label>` : '<p class="meta">Videos made in Loomy bring their captions here (use Edit on a finished Loomy video; export it with Captions off in Loomy to restyle them here).</p>'}
    <h3>Texts</h3>
    ${p.texts.length ? `<div class="list">${p.texts.map(x => `<button type="button" data-text="${x.id}">${fmtTime(x.start)} · ${escapeHtml(x.text)}</button>`).join('')}</div>` : '<p class="meta">Use Text in the toolbar to put words on the video.</p>'}`;
  const q = (s2) => box.querySelector(s2);
  q('#muVol')?.addEventListener('change', (e) => commit(setAudio(project, { musicVol: e.target.value })));
  q('#muDuck')?.addEventListener('change', (e) => commit(setAudio(project, { duck: e.target.checked })));
  q('#muDel')?.addEventListener('click', () => commit(setMusic(project, null)));
  q('#auSrc').addEventListener('change', (e) => commit(setAudio(project, { sourceVol: e.target.value })));
  q('#auIn').addEventListener('change', (e) => commit(setAudio(project, { fadeIn: e.target.value })));
  q('#auOut').addEventListener('change', (e) => commit(setAudio(project, { fadeOut: e.target.value })));
  box.querySelectorAll('[data-cap]').forEach(b => b.addEventListener('click', () => { const r = structuredClone(project); r.captionStyle = { ...r.captionStyle, look: b.dataset.cap }; commit(r); }));
  q('#capY')?.addEventListener('change', (e) => { const r = structuredClone(project); r.captionStyle = { ...r.captionStyle, y: Number(e.target.value) }; commit(r); });
  box.querySelectorAll('[data-text]').forEach(b => b.addEventListener('click', () => { select(b.dataset.text); preview.show(project.texts.find(x => x.id === b.dataset.text)?.start ?? 0); }));
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
$('#btnText').addEventListener('click', () => {
  if (!project.segments.length) { toast('Add a video first.'); return; }
  const { project: q, id } = addText(project, { text: 'Your text', start: preview.t });
  selected = id; commit(q);
  setTimeout(() => $('#txText')?.select(), 0);
});
$('#musicInput').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  try {
    const id = uid('m');
    toast(`Opening ${f.name}…`);
    const info = await media.loadMusic(id, f);
    selected = null;
    commit(setMusic(project, id, info));
    toast('Music added under the whole video. Change its volume with nothing selected.');
  } catch (err) { toast(err.message, true); }
});
$('#btnUndo').addEventListener('click', () => { project = history.undo(); fixSelection(); render(); preview.refresh(); });
$('#btnRedo').addEventListener('click', () => { project = history.redo(); fixSelection(); render(); preview.refresh(); });
$('#btnSplit').addEventListener('click', doSplit);
$('#btnDelete').addEventListener('click', doDelete);
$('#format').addEventListener('change', (e) => commit(setFormat(project, e.target.value)));
$('#btnPlay').addEventListener('click', () => { preview.toggle(); setPlaying(); });
$('#btnBack').addEventListener('click', () => { preview.pause(); setPlaying(); preview.show(0); tl.scroll.scrollLeft = 0; });
function fixSelection() { if (selected && !project.segments.some(s => s.id === selected) && !project.texts.some(x => x.id === selected)) selected = null; }

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
