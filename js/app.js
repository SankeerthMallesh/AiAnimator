// UI controller for Storyforge Studio.
import { STYLES, MOODS, VOICES, CLOUD_VOICES, LENGTHS, EXAMPLES, CAMERAS, TRANSITIONS, EFFECTS, PACES, FORMATS, formatOf } from './presets.js';
import { getNarrator, warmNarrator } from './tts.js';
import { preloadDepth } from './depth.js';
import { preloadSafety } from './safety.js';
import { PROPS } from './props.js';
import { POSES } from './mascot.js';
import { loadSettings, saveSettings, loadHistory, saveProjectToHistory, deleteFromHistory, DEFAULT_SETTINGS } from './storage.js';
import { Pipeline, STEPS, newProject } from './pipeline.js';
import { decodeUserMusic } from './audio.js';
import { loadFonts } from './renderer.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const slug = (s) => (s || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'video';

let settings = loadSettings();
let project = null;
let pipeline = null;
let running = false;
const ui = { mode: 'ai', format: '9:16' };

// ---------------- theme ----------------
function applyTheme() {
  const t = settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  $('#themeLabel').textContent = `Theme: ${t}`;
}
$('#btnTheme').addEventListener('click', () => {
  settings.theme = { system: 'light', light: 'dark', dark: 'system' }[settings.theme] || 'system';
  saveSettings(settings); applyTheme();
});

// ---------------- toasts ----------------
let toastTimer;
function toast(msg, isErr = false, ms = 4200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', isErr);
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

// ---------------- composer ----------------
function fillSelect(sel, entries, value) {
  sel.innerHTML = '';
  for (const [v, label] of entries) sel.append(el('option', { value: v }, label));
  if (value != null) sel.value = String(value);
}

function refreshVoiceSelect() {
  const sel = $('#voice');
  if (settings.ttsEngine === 'none') fillSelect(sel, [['none', 'None']], 'none');
  else if (settings.ttsEngine === 'elevenlabs' && settings.elevenKey) fillSelect(sel, [['eleven', 'ElevenLabs']], 'eleven');
  else if (settings.ttsEngine === 'pollinations') fillSelect(sel, CLOUD_VOICES.map(v => [v, v]), settings.cloudVoice);
  else fillSelect(sel, VOICES.map(([v, l]) => [v, l.split(' — ')[0]]), settings.voice);
}

function initComposer() {
  fillSelect($('#duration'), LENGTHS.map(([v, l]) => [v, l]), 30);
  fillSelect($('#style'), Object.entries(STYLES).map(([k, s]) => [k, s.label]), 'toon-host');
  fillSelect($('#mood'), Object.entries(MOODS).map(([k, m]) => [k, m.label]), 'curious');
  fillSelect($('#pace'), Object.entries(PACES).map(([k, p]) => [k, p.label]), 'normal');
  $('#quality').value = String(settings.quality || '1080');
  $('#fps').value = String(settings.fps || 30);
  refreshVoiceSelect();
  $('#reviewFirst').checked = !!settings.reviewFirst;

  $('#voice').addEventListener('change', (e) => {
    if (settings.ttsEngine === 'pollinations') settings.cloudVoice = e.target.value;
    else if (settings.ttsEngine === 'kokoro') settings.voice = e.target.value;
    saveSettings(settings);
  });
  $('#reviewFirst').addEventListener('change', (e) => { settings.reviewFirst = e.target.checked; saveSettings(settings); });

  $$('#formatSeg button').forEach(b => b.addEventListener('click', () => {
    ui.format = b.dataset.format;
    $$('#formatSeg button').forEach(x => x.classList.toggle('on', x === b));
    const d = $('#duration');
    if (ui.format === '16:9' && Number(d.value) < 90) d.value = '180';
    if (ui.format !== '16:9' && Number(d.value) > 90) d.value = '60';
  }));
  $$('.mode-seg button').forEach(b => b.addEventListener('click', () => {
    ui.mode = b.dataset.mode;
    $$('.mode-seg button').forEach(x => x.classList.toggle('on', x === b));
    $('#ownWrap').classList.toggle('hidden', ui.mode !== 'own');
    $('#topic').placeholder = ui.mode === 'own'
      ? 'What it is about, so the visuals match (e.g. Ancient Greek astronomy)'
      : 'How ancient Greeks proved the Earth was round using a lunar eclipse and a stick in Egypt';
    $('#duration').closest('.slot').classList.toggle('hidden', ui.mode === 'own');
  }));
  $('#btnMore').addEventListener('click', () => {
    const p = $('#morePanel');
    p.classList.toggle('hidden');
    $('#btnMore').setAttribute('aria-expanded', String(!p.classList.contains('hidden')));
  });

  const ex = $('#examples');
  for (const e of EXAMPLES) ex.append(el('button', { type: 'button', onclick: () => { $('#topic').value = e; $('#topic').focus(); } }, e));

  $('#topic').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); }
  });
  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = $('#topic').value.trim();
    const own = $('#ownScript').value.trim();
    if (ui.mode === 'own' && own.split(/\s+/).length < 8) { toast('Paste a script of at least a couple of sentences.', true); return; }
    if (!topic && ui.mode !== 'own') { $('#topic').focus(); toast('Type what the video should be about.'); return; }
    startProject(topic || own.split(/[.!?]/)[0].slice(0, 80), {
      mode: ui.mode,
      ownScript: own,
      format: ui.format,
      duration: Number($('#duration').value),
      style: $('#style').value,
      mood: $('#mood').value,
      pace: $('#pace').value,
      quality: $('#quality').value,
      fps: Number($('#fps').value),
      extra: $('#extra').value.trim(),
      patient: $('#patient').checked,
    });
  });
}

// ---------------- views ----------------
function showHome() {
  $('#viewHome').classList.remove('hidden');
  $('#viewProject').classList.add('hidden');
  $('#app').classList.remove('menu-open');
  renderHistory();
  setTimeout(() => $('#topic').focus(), 50);
}
function showProject() {
  $('#viewHome').classList.add('hidden');
  $('#viewProject').classList.remove('hidden');
  $('#app').classList.remove('menu-open');
  window.scrollTo(0, 0);
}
$('#btnNew').addEventListener('click', () => { if (confirmLeave()) showHome(); });
$('#btnHome').addEventListener('click', (e) => { e.preventDefault(); if (confirmLeave()) showHome(); });
function setLibrary(open) {
  $('#app').classList.toggle('menu-open', open);
  $('#btnLibrary').setAttribute('aria-expanded', String(open));
}
$('#btnLibrary').addEventListener('click', () => setLibrary(!$('#app').classList.contains('menu-open')));
$('#btnCloseLib').addEventListener('click', () => setLibrary(false));
$('#scrim').addEventListener('click', () => setLibrary(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setLibrary(false); });

function confirmLeave() {
  if (!running) return true;
  if (!confirm('A video is still being made. Stop it?')) return false;
  pipeline?.cancel();
  return true;
}
window.addEventListener('beforeunload', (e) => { if (running) { e.preventDefault(); e.returnValue = ''; } });

// ---------------- history ----------------
function renderHistory() {
  const h = $('#history');
  h.innerHTML = '';
  const list = loadHistory();
  $('#libCount').textContent = list.length ? String(list.length) : '';
  if (!list.length) { h.append(el('div', { class: 'empty' }, 'Your videos show up here.')); return; }
  for (const item of list) {
    h.append(el('div', {
      class: 'item' + (project?.id === item.id ? ' on' : ''), role: 'button', tabindex: '0',
      onclick: () => openFromHistory(item),
      onkeydown: (e) => { if (e.key === 'Enter') openFromHistory(item); },
    },
    el('span', {}, item.script?.title || item.topic),
    el('button', {
      class: 'x', 'aria-label': 'Delete', title: 'Delete',
      onclick: (e) => { e.stopPropagation(); deleteFromHistory(item.id); renderHistory(); },
    }, '×')));
  }
}

function openFromHistory(item) {
  if (!confirmLeave()) return;
  const p = newProject(item.topic, item.options);
  p.id = item.id;
  p.createdAt = item.createdAt;
  p.script = item.script;
  p.factCheckNotes = item.factCheckNotes || [];
  p.factChecked = true;
  openProject(p, { render: false });
}

// ---------------- steps ----------------
function renderSteps() {
  const ol = $('#steps');
  ol.innerHTML = '';
  for (const [id, label] of STEPS) {
    ol.append(el('li', { 'data-step': id }, el('span', { class: 'ic' }), el('span', {}, label), el('span', { class: 'd' }, '')));
  }
}
function setStep(id, state, detail) {
  const li = $(`#steps li[data-step="${id}"]`);
  if (!li) return;
  li.className = state;
  if (detail !== undefined) $('.d', li).textContent = detail;
}
function log(msg) {
  const pre = $('#log');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  pre.textContent += `[${time}] ${msg}\n`;
  pre.scrollTop = pre.scrollHeight;
}

// ---------------- project flow ----------------
function startProject(topic, options) {
  if (!confirmLeave()) return;
  openProject(newProject(topic, options), { render: !settings.reviewFirst });
}

function openProject(p, { render }) {
  stopPreview();
  if (project?.video?.url) URL.revokeObjectURL(project.video.url);
  project = p;
  showProject();
  renderSteps();
  $('#log').textContent = '';
  $('#board').innerHTML = '';
  $('#factNotes').classList.add('hidden');
  $('#metaCard').classList.add('hidden');
  $('#btnDownload').classList.add('hidden');
  $('#renderProg').classList.add('hidden');
  const ratio = FORMATS[formatOf(p.options)].ratio;
  $('#stage').style.aspectRatio = String(ratio);
  const cv = $('#preview');
  cv.width = Math.round(ratio < 1 ? 540 : 540 * ratio);
  cv.height = Math.round(ratio < 1 ? 540 / ratio : 540);
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  showStage('canvas');
  $('#stageEmpty').classList.remove('hidden');
  $('#projTitle').textContent = p.script?.title || p.topic;
  $('#projMeta').textContent = `${formatOf(p.options)} · ${STYLES[p.options.style]?.label || ''} · ${PACES[p.options.pace]?.label || 'Normal'} pace · ${MOODS[p.options.mood]?.label || ''}`;
  if (p.script) onScriptReady();
  renderHistory();
  run({ render });
}

function hooks() {
  return {
    step: setStep,
    log,
    scriptReady: onScriptReady,
    scene: (i) => updateThumb(i),
    progress: (id, frac, text) => {
      $('#renderProg').classList.remove('hidden');
      $('#renderBar').style.width = `${Math.round(frac * 100)}%`;
      $('#renderText').textContent = text;
    },
  };
}

function setBusy(b) {
  running = b;
  $('#btnCancel').classList.toggle('hidden', !b);
  $('#btnRender').disabled = b || !project?.audio;
  $('#btnApply').disabled = b || !hasDirty();
  $('#btnPlay').disabled = b || !project?.audio;
  $('#scrub').disabled = b || !project?.audio;
}

async function run({ render }) {
  pipeline?.cancel();
  pipeline = new Pipeline(project, settings, hooks());
  const mine = pipeline;
  $('#btnRetry').classList.add('hidden');
  setBusy(true);
  if (!render) setStep('render', '', project.video ? 'Done earlier — re-render after edits' : 'Waiting for you');
  try {
    await mine.prepare();
    if (mine !== pipeline) return;
    project.script.scenes.forEach(s => { delete s.dirty; });
    saveProjectToHistory(project);
    renderHistory();
    renderBoard();
    await setupPreview();
    if (render) await doRender(mine);
    else toast('Storyboard ready. Preview it, tweak anything, then hit Render MP4.');
  } catch (e) {
    if (mine !== pipeline) return;
    handleError(e);
  } finally {
    if (mine === pipeline) setBusy(false);
  }
}

function handleError(e) {
  const active = $('#steps li.active');
  if (e?.name === 'AbortError') {
    if (active) setStep(active.dataset.step, 'warn', 'Stopped');
    toast('Stopped.');
    return;
  }
  console.error(e);
  log(`Error: ${e.message || e}`);
  if (active) setStep(active.dataset.step, 'error', e.message || 'Failed');
  toast(`${friendly(e)} Press "Try again".`, true, 9000);
  $('#btnRetry').classList.remove('hidden');
}

// Plain-language version of the most common failures.
function friendly(e) {
  const m = String(e?.message || e);
  if (/script writers failed/i.test(m)) return 'The free script services did not answer.';
  if (/Failed to fetch|NetworkError|timed out/i.test(m)) return 'A network request failed. Check your connection.';
  if (/encod|VideoEncoder|export/i.test(m)) return 'The video could not be encoded in this browser. Chrome or Edge work best.';
  return m.length > 140 ? m.slice(0, 140) + '…' : m;
}

$('#btnRetry').addEventListener('click', () => {
  if (running || !project) return;
  $('#btnRetry').classList.add('hidden');
  run({ render: !settings.reviewFirst });
});

// Nothing should ever fail silently: surface unexpected errors in the activity log.
window.addEventListener('unhandledrejection', (ev) => {
  if (ev.reason?.name === 'AbortError') return;
  log(`Unexpected problem: ${ev.reason?.message || ev.reason}`);
});
window.addEventListener('error', (ev) => { if (ev.message) log(`Unexpected problem: ${ev.message}`); });

async function doRender(pl = pipeline) {
  stopPreview();
  $('#btnDownload').classList.add('hidden');
  $('#renderProg').classList.remove('hidden');
  $('#renderBar').style.width = '0%';
  $('#renderText').textContent = 'Starting…';
  const video = await pl.render();
  const a = $('#btnDownload');
  a.href = video.url;
  a.download = `${slug(project.script.title)}.${video.ext}`;
  a.textContent = `Download ${video.ext.toUpperCase()} · ${(video.blob.size / 1048576).toFixed(1)} MB`;
  a.classList.remove('hidden');
  const v = $('#outVideo');
  v.src = video.url;
  v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.min(0.8, v.duration / 2); } catch { /* ignore */ } }, { once: true });
  showStage('video');
  $('#renderText').textContent = `Done · ${video.width}×${video.height}`;
  toast('Your video is ready. Hit Download.');
}

$('#btnRender').addEventListener('click', async () => {
  if (running || !project) return;
  const pl = pipeline && !pipeline.signal.aborted ? pipeline : new Pipeline(project, settings, hooks());
  pipeline = pl;
  setBusy(true);
  try {
    if (hasDirty()) { await pl.prepare(); project.script.scenes.forEach(s => { delete s.dirty; }); renderBoard(); await setupPreview(); saveProjectToHistory(project); }
    await doRender(pl);
  } catch (e) { handleError(e); } finally { if (pl === pipeline) setBusy(false); }
});

$('#btnCancel').addEventListener('click', () => { pipeline?.cancel(); });

$('#btnApply').addEventListener('click', () => { if (!running) run({ render: false }); });

// ---------------- script + storyboard ----------------
function onScriptReady() {
  const s = project.script;
  $('#projTitle').textContent = s.title;
  $('#ytTitle').value = s.youtubeTitle || s.title;
  $('#ytDesc').value = s.description || '';
  $('#ytTags').value = (s.hashtags || []).join(' ');
  $('#metaCard').classList.remove('hidden');
  const notes = project.factCheckNotes || [];
  $('#factNotes').classList.toggle('hidden', !notes.length);
  $('#factList').innerHTML = '';
  for (const n of notes) $('#factList').append(el('li', {}, n));
  renderBoard();
}

function hasDirty() { return !!project?.script?.scenes.some(s => s.dirty); }
function markDirty(scene, card) {
  scene.dirty = true;
  card?.classList.add('dirty');
  $('#btnApply').disabled = running;
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  if (!project?.script) return;
  const ratio = FORMATS[formatOf(project.options)].ratio;
  const landscape = ratio > 1;
  const tl = project.timeline;
  project.script.scenes.forEach((scene, i) => {
    const t = tl?.scenes.find(x => x.id === scene.id);
    const card = el('div', { class: `scene${landscape ? ' landscape' : ''}${scene.dirty ? ' dirty' : ''}`, 'data-id': scene.id });
    const thumb = el('div', { class: 'thumb', style: `aspect-ratio:${Math.max(ratio, 0.8)}` }, el('div', { class: 'shimmer' }), el('span', { class: 'num' }, String(i + 1)));
    const fileIn = el('input', { type: 'file', accept: 'image/*', onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        project.images.set(scene.id, { key: 'custom', bitmap: bmp, custom: true });
        updateThumb(i);
        markDirty(scene, card);
      } catch { toast('Could not read that image.', true); }
    } });
    thumb.append(el('div', { class: 'thumb-tools' },
      el('button', { type: 'button', title: 'Generate a new image', onclick: () => {
        scene.seed = Math.floor(Math.random() * 1e9);
        const cur = project.images.get(scene.id);
        if (cur?.custom) project.images.delete(scene.id);
        markDirty(scene, card);
        if (!running) run({ render: false });
      } }, '↻'),
      el('label', { title: 'Use your own image' }, '⤒', fileIn)));

    const narr = el('textarea', { class: 'narr', rows: '3', 'aria-label': `Scene ${i + 1} narration` });
    narr.value = scene.narration;
    narr.addEventListener('input', () => { scene.narration = narr.value; markDirty(scene, card); });

    const visual = el('textarea', { class: 'visual', rows: '4', 'aria-label': 'Image prompt' });
    visual.value = scene.visual;
    visual.addEventListener('input', () => { scene.visual = visual.value; markDirty(scene, card); });

    const label = el('input', { type: 'text', placeholder: 'on-screen label', 'aria-label': 'On-screen label' });
    label.value = scene.onScreenText || '';
    label.addEventListener('input', () => { scene.onScreenText = label.value; markDirty(scene, card); });

    const cam = el('select', { 'aria-label': 'Camera move' });
    fillSelect(cam, CAMERAS.map(c => [c, `cam: ${c}`]), scene.camera);
    cam.addEventListener('change', () => { scene.camera = cam.value; markDirty(scene, card); });
    const tr = el('select', { 'aria-label': 'Transition in' });
    fillSelect(tr, TRANSITIONS.map(c => [c, `in: ${c}`]), scene.transition);
    tr.addEventListener('change', () => { scene.transition = tr.value; markDirty(scene, card); });
    const fx = el('select', { 'aria-label': 'Motion effect' });
    fillSelect(fx, EFFECTS.map(c => [c, `fx: ${c}`]), scene.effect || 'none');
    fx.addEventListener('change', () => { scene.effect = fx.value; markDirty(scene, card); });

    const prop = el('select', { 'aria-label': 'Prop' });
    fillSelect(prop, PROPS.map(c => [c, `prop: ${c}`]), scene.prop || 'none');
    prop.addEventListener('change', () => { scene.prop = prop.value; markDirty(scene, card); });
    const pose = el('select', { 'aria-label': 'Host pose' });
    fillSelect(pose, POSES.map(c => [c, `pose: ${c}`]), scene.pose || 'idle');
    pose.addEventListener('change', () => { scene.pose = pose.value; markDirty(scene, card); });

    const body = el('div', { class: 'scene-body' },
      el('div', { class: 'scene-top' },
        el('span', { class: 'tc' }, t ? `${fmt(t.start)} → ${fmt(t.start + t.dur)} · ${t.dur.toFixed(1)}s` : `scene ${i + 1}`),
        el('button', { class: 'del', type: 'button', onclick: () => {
          if (project.script.scenes.length <= 1) return;
          project.script.scenes.splice(project.script.scenes.indexOf(scene), 1);
          if (project.script.scenes[0]) project.script.scenes[0].dirty = true;
          renderBoard();
          $('#btnApply').disabled = running;
        } }, 'remove')),
      narr,
      el('details', {},
        el('summary', {}, 'visual · label · motion'),
        visual,
        el('div', { class: 'grid3' }, label, cam, tr, fx, prop, pose)));
    card.append(thumb, body);
    board.append(card);
    updateThumb(i);
  });
}

$('#btnAddScene').addEventListener('click', () => {
  if (!project?.script) return;
  const last = project.script.scenes[project.script.scenes.length - 1];
  project.script.scenes.push({
    id: 's' + Math.random().toString(36).slice(2, 9),
    narration: 'New line of narration.',
    visual: last ? last.visual : project.topic,
    onScreenText: '', keywords: [], camera: 'push-in', transition: 'whip',
    seed: Math.floor(Math.random() * 1e9), dirty: true,
  });
  renderBoard();
  $('#btnApply').disabled = running;
  const cards = $$('#board .scene');
  cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('textarea', cards[cards.length - 1])?.select();
});

function updateThumb(i) {
  const scene = project?.script?.scenes[i];
  const card = scene && $(`#board .scene[data-id="${scene.id}"]`);
  if (!card) return;
  const thumb = $('.thumb', card);
  const entry = project.images.get(scene.id);
  if (!entry) return;
  $('.shimmer', thumb)?.remove();
  thumb.querySelector('canvas')?.remove();
  const c = document.createElement('canvas');
  const ratio = FORMATS[formatOf(project.options)].ratio;
  c.width = ratio > 1 ? 320 : Math.round(320 * ratio); c.height = ratio > 1 ? Math.round(320 / ratio) : 320;
  const x = c.getContext('2d');
  if (entry.bitmap) {
    const s = Math.max(c.width / entry.bitmap.width, c.height / entry.bitmap.height);
    const w = entry.bitmap.width * s, h = entry.bitmap.height * s;
    x.drawImage(entry.bitmap, (c.width - w) / 2, (c.height - h) / 2, w, h);
  } else {
    x.fillStyle = '#2A2D20'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#A8AA8D'; x.font = '12px monospace'; x.textAlign = 'center';
    x.fillText('fallback art', c.width / 2, c.height / 2);
    x.fillText('tap ↻ to retry', c.width / 2, c.height / 2 + 16);
  }
  thumb.prepend(c);
}

// ---------------- preview player ----------------
const player = { renderer: null, ctx: null, src: null, startAt: 0, offset: 0, raf: 0, playing: false };

function showStage(which) {
  $('#preview').classList.toggle('hidden', which !== 'canvas');
  $('#outVideo').classList.toggle('hidden', which !== 'video');
  if (which !== 'video') $('#outVideo').pause();
}

async function setupPreview() {
  stopPreview();
  await loadFonts();
  player.renderer?.dispose();
  player.renderer = pipeline.makeRenderer($('#preview'));
  player.offset = 0;
  $('#stageEmpty').classList.add('hidden');
  if (!project.video) showStage('canvas');
  player.renderer.drawFrame(0.6);
  updateTime(0);
}

function updateTime(t) {
  const total = project?.timeline?.total || 0;
  $('#time').textContent = `${fmt(t)} / ${fmt(total)}`;
  $('#scrub').value = total ? String(Math.round(t / total * 1000)) : '0';
}

function playPreview() {
  if (!player.renderer || !project.audio) return;
  showStage('canvas');
  player.ctx = player.ctx || new AudioContext();
  player.ctx.resume();
  const total = project.timeline.total;
  if (player.offset >= total - 0.05) player.offset = 0;
  player.src = player.ctx.createBufferSource();
  player.src.buffer = project.audio;
  player.src.connect(player.ctx.destination);
  player.startAt = player.ctx.currentTime + 0.05;
  player.src.start(player.startAt, player.offset);
  player.playing = true;
  $('#btnPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
  const tick = () => {
    if (!player.playing) return;
    const t = player.offset + Math.max(0, player.ctx.currentTime - player.startAt);
    if (t >= total) { player.offset = total; stopPreview(); return; }
    player.renderer.drawFrame(t);
    updateTime(t);
    player.raf = requestAnimationFrame(tick);
  };
  tick();
}

function stopPreview() {
  if (player.playing && player.ctx) {
    player.offset = Math.min(player.offset + Math.max(0, player.ctx.currentTime - player.startAt), project?.timeline?.total || 0);
  }
  player.playing = false;
  cancelAnimationFrame(player.raf);
  try { player.src?.stop(); } catch { /* not started */ }
  player.src = null;
  $('#btnPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>';
}

$('#btnPlay').addEventListener('click', () => (player.playing ? stopPreview() : playPreview()));
$('#scrub').addEventListener('input', (e) => {
  if (!player.renderer) return;
  stopPreview();
  showStage('canvas');
  const t = Number(e.target.value) / 1000 * (project.timeline?.total || 0);
  player.offset = t;
  player.renderer.drawFrame(t);
  updateTime(t);
});

// ---------------- metadata copy + music ----------------
$$('[data-copy]').forEach(b => b.addEventListener('click', async (e) => {
  e.preventDefault();
  const v = $('#' + b.dataset.copy).value;
  try { await navigator.clipboard.writeText(v); toast('Copied.'); } catch { $('#' + b.dataset.copy).select(); }
}));
$('#musicFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f || !project) return;
  try {
    project.userMusic = await decodeUserMusic(f);
    project.musicKey = '';
    if (project.script.scenes[0]) project.script.scenes[0].dirty = true;
    $('#btnApply').disabled = running;
    toast('Music loaded. Hit Apply edits (or Render) to use it.');
  } catch { toast('Could not read that audio file.', true); }
});

// ---------------- settings ----------------
function openSettings() {
  const f = $('#settingsForm');
  for (const [k, v] of Object.entries(settings)) {
    const input = f.elements[k];
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = !!v; else input.value = v;
  }
  $('#speedOut').textContent = `${settings.voiceSpeed}×`;
  $('#settingsDlg').showModal();
}
$('#settingsForm').elements.voiceSpeed.addEventListener('input', (e) => { $('#speedOut').textContent = `${e.target.value}×`; });
$('#btnSettings').addEventListener('click', openSettings);
$('#settingsDlg').addEventListener('close', () => {
  if ($('#settingsDlg').returnValue !== 'save') return;
  const f = $('#settingsForm');
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    const input = f.elements[k];
    if (!input) continue;
    if (input.type === 'checkbox') settings[k] = input.checked;
    else if (input.type === 'range') settings[k] = Number(input.value);
    else settings[k] = input.value.trim();
  }
  saveSettings(settings);
  refreshVoiceSelect();
  toast('Settings saved.');
});
$('#btnResetKeys').addEventListener('click', () => {
  for (const k of ['geminiKey', 'groqKey', 'openrouterKey', 'pollinationsKey', 'hfToken']) {
    settings[k] = '';
    $('#settingsForm').elements[k].value = '';
  }
  saveSettings(settings);
  toast('Keys cleared from this browser.');
});

// ---------------- boot ----------------
applyTheme();
initComposer();
renderHistory();
// Zero setup: quietly download the free voice and 3D models while you type.
function preloadModels() {
  if (navigator.connection?.saveData) return;
  if (settings.ttsEngine === 'kokoro') warmNarrator(getNarrator(settings)).catch(() => {});
  if (settings.depth3d !== 'off') preloadDepth();
  if (settings.imageProvider !== 'none') preloadSafety();
}
(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(preloadModels, { timeout: 4000 });
const params = new URLSearchParams(location.search);
if (params.get('topic')) $('#topic').value = params.get('topic');
