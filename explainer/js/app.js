// UI controller for Storyforge Studio.
import { resetVoiceReport } from './tts.js';
import { STYLES, AUTO_STYLE, pickLook, MOODS, VOICES, CLOUD_VOICES, LENGTHS, EXAMPLES, CAMERAS, TRANSITIONS, EFFECTS, PACES, FORMATS, formatOf } from './presets.js';
import { getNarrator, warmNarrator } from './tts.js';
import { preloadDepth } from './depth.js';
import { preloadSafety } from './safety.js';
import { PROPS } from './props.js';
import { POSES } from './mascot.js';
import { hubRows, capabilities } from './router.js';
import { loadSettings, saveSettings, loadHistory, saveProjectToHistory, deleteFromHistory, DEFAULT_SETTINGS } from './storage.js';
import { Pipeline, STEPS, newProject } from './pipeline.js';
import { decodeUserMusic } from './audio.js';
import { loadFonts } from './renderer.js';
import { clipFromBlob } from './clips.js';
import { motionPrompt, openShotPack } from './videoai.js';

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

// The 3D tab opens on Auto (3D people drawn in code for stories about people, the AI-picture look for
// things, places, history and science: pickLook), the Blocky tab (?style=blocky) on the drawn blocky
// world; every look stays in the list. Any other ?style= opens that style.
function defaultStyle() {
  const q = new URLSearchParams(location.search).get('style');
  if (q === 'blocky') return 'drawn-blocky';
  return STYLES[q] ? q : AUTO_STYLE;
}

// "Made with Loomy": real frames of this tab's looks under the composer.
const SHOWCASE = {
  '3d': [['3d-break', 'A brick on a stand with the headline THIS WALL IS 2,000 YEARS OLD', 'Hook + 3D objects'], ['3d-hold', 'A man holding a brick', '3D people'], ['3d-atom', 'A woman pointing at an atom', '3D objects'], ['3d-object', 'A brick close-up with a woman behind it', 'Object close-ups']],
  blocky: [['blocky-react', 'A blocky character with a shocked face', 'Cold open'], ['blocky-wide', 'A blocky kid in a snowy street', 'Blocky world'], ['blocky-group', 'Three blocky friends cheering', 'Blocky cast'], ['town-group', 'Cartoon townsfolk cheering', 'Also in Cartoons']],
};
function fillShowcase() {
  const row = document.getElementById('showcase'); if (!row) return;
  const tab = new URLSearchParams(location.search).get('style') === 'blocky' ? 'blocky' : '3d';
  row.replaceChildren(...SHOWCASE[tab].map(([f, alt, cap]) => el('figure', {}, el('img', { src: `../shared/showcase/${f}.jpg`, alt, loading: 'lazy', width: 270, height: 480 }), el('figcaption', {}, cap))));
}


// ---------- long form: one click sets up a long video in chapters (16:9, the length, the style notes) ----------
function initLongStarts(starts) {
  const row = document.getElementById('longStarts'); if (!row) return;
  row.replaceChildren(...starts.map(st => {
    const b = el('button', { type: 'button', class: 'long-start' }, el('b', {}, st.label), el('span', {}, st.hint));
    b.addEventListener('click', () => {
      document.querySelector('#formatSeg button[data-format="16:9"]')?.click();
      const d = $('#duration'); if ([...d.options].some(o => o.value === String(st.seconds))) d.value = String(st.seconds);
      $('#extra').value = st.notes;
      const topic = $('#topic'); if (!topic.value.trim()) topic.placeholder = st.example;
      row.querySelectorAll('.long-start').forEach(x => x.classList.toggle('on', x === b));
      toast(`${st.label}: ${Math.round(st.seconds / 60)} minutes in chapters, 16:9. Type your topic and roll.`);
      topic.focus();
    });
    return b;
  }));
}

const LONG_STARTS = {
  '3d': [
    { label: '3D explainer', hint: '10 min · chapters', seconds: 600, example: 'Why the Roman Empire really fell', notes: 'A long 3D explainer in chapters: one big question answered step by step, real objects people hold, break and point at, a reveal at the end of every chapter.' },
    { label: 'History in 3D', hint: '15 min · chapters', seconds: 900, example: 'The whole history of the Titanic, from the shipyard to the seabed', notes: 'A long history documentary in chapters, in time order: who, where and when at the start of each chapter, real dates and places, a cliffhanger at the end of every chapter.' },
  ],
  blocky: [
    { label: 'Game-world story', hint: '8 min · chapters', seconds: 480, example: 'The server where my best friend became the villain', notes: 'A long first-person game-world story in chapters: a mystery set up in chapter 1, rivals, betrayals and a big reveal; every chapter ends on a cliffhanger.' },
    { label: 'Game-world saga', hint: '15 min · chapters', seconds: 900, example: 'I built a whole kingdom, and then the griefers came', notes: 'A long first-person game-world saga in chapters: the build-up, the war, the comeback; named friends and rivals, a cliffhanger at the end of every chapter.' },
  ],
};

function initComposer() {
  fillShowcase();
  initLongStarts(LONG_STARTS[new URLSearchParams(location.search).get('style') === 'blocky' ? 'blocky' : '3d']);
  // Blocky stories run longer, like the reference (about 75 s); 3D explainers about 30 s.
  fillSelect($('#duration'), LENGTHS.map(([v, l]) => [v, l]), new URLSearchParams(location.search).get('style') === 'blocky' ? 75 : 30);
  const blockyTab = new URLSearchParams(location.search).get('style') === 'blocky';
  fillSelect($('#style'), [...(blockyTab ? [] : [[AUTO_STYLE, 'Auto: drawn 3D people or AI pictures, by topic']]), ...Object.entries(STYLES).map(([k, s]) => [k, s.label])], defaultStyle());
  // The Blocky tab opens this page with ?style=blocky: give it its own heading.
  if (new URLSearchParams(location.search).get('style') === 'blocky') {
    const badge = document.querySelector('.hero-badge b'), h = document.querySelector('.view.home .headline'), lede = document.querySelector('.view.home .lede');
    if (badge) badge.textContent = 'Blocky';
    document.title = 'Loomy · Blocky';
    const topic = document.querySelector('#topic'); if (topic) topic.placeholder = 'The day my best friend and I found a secret door under the spawn';
    if (h) h.textContent = 'Tell a blocky game story';
    if (lede) lede.textContent = 'Give it a story or a topic. Loomy writes it like a game story Short, builds every shot in a blocky game world, narrates it with captions and hands you an MP4.';
  }
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
  if (!list.length) {
    h.append(el('div', { class: 'empty' },
      el('b', {}, 'No videos yet'),
      el('span', {}, 'Every video you make is listed here, so you can reopen it, edit the shots and export again.')));
    return;
  }
  for (const item of list) {
    h.append(el('div', {
      class: 'item' + (project?.id === item.id ? ' on' : ''), role: 'button', tabindex: '0',
      onclick: () => openFromHistory(item),
      onkeydown: (e) => { if (e.key === 'Enter') openFromHistory(item); },
    },
    el('span', { class: 'item-main' },
      el('b', {}, item.script?.title || item.topic),
      el('small', {}, [
        item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
        item.options?.format || '',
        item.script?.scenes?.length ? `${item.script.scenes.length} shots` : '',
      ].filter(Boolean).join(' · '))),
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
  if (!STYLES[options.style]) {
    // Auto: the look that can show this topic (people drawn in code, or AI pictures of the things in it).
    options = { ...options, style: pickLook(`${topic} ${options.mode === 'own' ? options.ownScript || '' : ''}`), autoLook: true };
    toast(`Look: ${STYLES[options.style].label} (picked for this topic; change it under Look).`);
  }
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
  $('#btnDownload').classList.add('hidden'); $('#btnEdit')?.classList.add('hidden');
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
  if (blockedForViewer()) return;
  pipeline?.cancel();
  resetVoiceReport(); // a new video: its render log reports only its own voice
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
  // Shown in the activity log and as a message on screen, not as a console error.
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
  $('#btnDownload').classList.add('hidden'); $('#btnEdit')?.classList.add('hidden');
  $('#renderProg').classList.remove('hidden');
  $('#renderBar').style.width = '0%';
  $('#renderText').textContent = 'Starting…';
  // A drawn look keeps a whole 3D engine for the preview: free it first, so only one runs during the export.
  if (player.renderer?.ready) { player.renderer.dispose(); player.renderer = null; }
  const video = await pl.render();
  const a = $('#btnDownload');
  a.href = video.url;
  a.download = `${slug(project.script.title)}.${video.ext}`;
  a.textContent = `Download ${video.ext.toUpperCase()} · ${(video.blob.size / 1048576).toFixed(1)} MB`;
  a.classList.remove('hidden');
  $('#btnEdit')?.classList.remove('hidden');
  const v = $('#outVideo');
  v.src = video.url;
  v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.min(0.8, v.duration / 2); } catch { /* ignore */ } }, { once: true });
  showStage('video');
  $('#renderText').textContent = `Done · ${video.width}×${video.height}`;
  toast('Your video is ready. Hit Download.');
}

$('#btnRender').addEventListener('click', async () => {
  if (blockedForViewer()) return;
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
  document.getElementById('btnShotPack')?.classList.remove('hidden');
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

const inspectors = new Map();
let selectedShot = null;

// Select a shot: highlight it in the storyboard and timeline and show its controls in the inspector.
function selectShot(id, seek) {
  selectedShot = id;
  const idx = project?.script?.scenes.findIndex(x => x.id === id) ?? -1;
  $$('#board .scene').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  $$('#tlVideo .clip').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  const ins = $('#inspector');
  ins.replaceChildren();
  const panel = inspectors.get(id);
  ins.append(panel || el('p', { class: 'fine insp-empty' }, 'Pick a shot in the storyboard or the timeline to edit it.'));
  $('#inspName').textContent = idx >= 0 ? `Shot ${idx + 1}` : 'No shot selected';
  if (seek) {
    const t = project?.timeline?.scenes.find(x => x.id === id);
    if (t) scrubTo(t.start + 0.05);
  }
}

// ---------------- timeline: filmstrip, waveform, playhead ----------------
function renderTimeline() {
  const lane = $('#tlVideo'), ruler = $('#tlRuler');
  lane.replaceChildren();
  ruler.replaceChildren();
  const tl = project?.timeline;
  const total = tl?.total || 0;
  if (!project?.script || !total) { drawWave(); moveHead(0); return; }
  project.script.scenes.forEach((scene, i) => {
    const t = tl.scenes.find(x => x.id === scene.id);
    if (!t) return;
    const clip = el('button', { class: 'clip', type: 'button', 'data-id': scene.id, title: `Shot ${i + 1}: ${scene.narration.slice(0, 80)}`,
      style: `left:${t.start / total * 100}%;width:${t.dur / total * 100}%` }, el('span', {}, String(i + 1)));
    clip.addEventListener('click', (ev) => { ev.stopPropagation(); selectShot(scene.id, true); });
    lane.append(clip);
    copyThumbToClip(i);
  });
  const step = total > 90 ? 15 : total > 40 ? 5 : 2;
  for (let x = 0; x <= total + 0.01; x += step) ruler.append(el('span', { style: `left:${x / total * 100}%` }, tc(x)));
  drawWave();
  moveHead(player.offset || 0);
}
function copyThumbToClip(i) {
  const scene = project?.script?.scenes[i];
  const src = scene && $(`#board .scene[data-id="${scene.id}"] .thumb canvas`);
  const clip = scene && $(`#tlVideo .clip[data-id="${scene.id}"]`);
  if (!src || !clip) return;
  try { clip.style.backgroundImage = `url(${src.toDataURL('image/jpeg', 0.6)})`; } catch { /* canvas unavailable */ }
}
function drawWave() {
  const c = $('#tlWave');
  const w = Math.max(200, Math.round(c.clientWidth * devicePixelRatio)), h = Math.max(20, Math.round(c.clientHeight * devicePixelRatio));
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const buf = project?.audio;
  if (!buf) return;
  const data = buf.getChannelData(0), per = Math.max(1, Math.floor(data.length / w));
  g.fillStyle = getComputedStyle(c).color || '#3D8BFF';
  for (let x = 0; x < w; x++) {
    let peak = 0;
    for (let k = x * per, e = Math.min(data.length, k + per); k < e; k += 8) peak = Math.max(peak, Math.abs(data[k]));
    const bh = Math.max(1, peak * h * 0.9);
    g.fillRect(x, (h - bh) / 2, 1, bh);
  }
}
function tc(t) {
  const f = Math.floor((t % 1) * 30), sec = Math.floor(t) % 60, m = Math.floor(t / 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
function moveHead(t) {
  const total = project?.timeline?.total || 0;
  $('#tlHead').style.setProperty('--x', total ? `${Math.min(1, t / total) * 100}%` : '0%');
  if (!total) return;
  const cur = project.timeline.scenes.find(x => t >= x.start && t < x.start + x.dur);
  $$('#tlVideo .clip').forEach(c => c.classList.toggle('now', c.dataset.id === cur?.id));
}
for (const id of ['#tlVideo', '#tlAudio', '#tlRuler']) {
  $(id).addEventListener('pointerdown', (e) => {
    if (e.target.closest('.clip')) return;
    const total = project?.timeline?.total;
    if (!total || !player.renderer) return;
    const r = $('#tlVideo').getBoundingClientRect();
    scrubTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total);
  });
}
addEventListener('resize', () => { if (project?.audio) drawWave(); });

function scrubTo(t) {
  if (!player.renderer) return;
  stopPreview();
  showStage('canvas');
  player.offset = t;
  player.renderer.drawFrame(t);
  updateTime(t);
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  inspectors.clear();
  if (!project?.script) return;
  const ratio = FORMATS[formatOf(project.options)].ratio;
  const landscape = ratio > 1;
  const tl = project.timeline;
  project.script.scenes.forEach((scene, i) => {
    const t = tl?.scenes.find(x => x.id === scene.id);
    const card = el('div', { class: `scene${landscape ? ' landscape' : ''}${scene.dirty ? ' dirty' : ''}`, 'data-id': scene.id });
    const thumb = el('div', { class: 'thumb', style: `aspect-ratio:${Math.max(ratio, 0.8)}` }, el('div', { class: 'shimmer' }), el('span', { class: 'num' }, String(i + 1)));
    const fileIn = el('input', { type: 'file', accept: 'image/*,video/*', onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (/^video\//.test(f.type) || /\.(mp4|mov|webm|m4v)$/i.test(f.name)) {
        // A clip from Google Flow, Kling, Magic Hour or anywhere else plays as this shot.
        try {
          const clip = await clipFromBlob(f);
          project.clips = project.clips || new Map();
          const old = project.clips.get(scene.id);
          if (old?.clip?.url) URL.revokeObjectURL(old.clip.url);
          project.clips.set(scene.id, { key: 'custom', clip, custom: true });
          markDirty(scene, card);
          toast(`Clip added to shot ${i + 1}. Press Apply edits, then Export.`);
        } catch (err) { toast(err.message || 'Could not read that video.', true); }
        return;
      }
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
    fillSelect(cam, CAMERAS.map(c => [c, c]), scene.camera);
    cam.addEventListener('change', () => { scene.camera = cam.value; markDirty(scene, card); });
    const tr = el('select', { 'aria-label': 'Transition in' });
    fillSelect(tr, TRANSITIONS.map(c => [c, c]), scene.transition);
    tr.addEventListener('change', () => { scene.transition = tr.value; markDirty(scene, card); });
    const fx = el('select', { 'aria-label': 'Motion effect' });
    fillSelect(fx, EFFECTS.map(c => [c, c]), scene.effect || 'none');
    fx.addEventListener('change', () => { scene.effect = fx.value; markDirty(scene, card); });

    const prop = el('select', { 'aria-label': 'Prop' });
    fillSelect(prop, PROPS.map(c => [c, c]), scene.prop || 'none');
    prop.addEventListener('change', () => { scene.prop = prop.value; markDirty(scene, card); });
    const pose = el('select', { 'aria-label': 'Host pose' });
    fillSelect(pose, POSES.map(c => [c, c]), scene.pose || 'idle');
    pose.addEventListener('change', () => { scene.pose = pose.value; markDirty(scene, card); });

    const row = (lbl, ...ctl) => el('div', { class: 'insp-row' }, el('span', { class: 'insp-label' }, lbl), el('div', { class: 'insp-ctl' }, ...ctl));
    const inspector = el('div', { class: 'insp-body' },
      el('p', { class: 'sect-title' }, 'Picture'),
      el('div', { class: 'insp-row insp-wide' }, el('span', { class: 'insp-label' }, 'Image prompt'), visual),
      row('Label', label),
      el('p', { class: 'sect-title' }, 'Motion'),
      row('Camera', cam), row('Transition', tr), row('Effect', fx),
      el('p', { class: 'sect-title' }, 'Host'),
      row('Prop', prop), row('Pose', pose));
    inspectors.set(scene.id, inspector);

    const play = el('button', { class: 'thumb-play', type: 'button', 'aria-label': `Play from shot ${i + 1}`, onclick: (ev) => {
      ev.stopPropagation(); selectShot(scene.id, true);
      if (player.renderer && project.audio) playPreview();
    } }, el('i'));
    thumb.append(play);
    const body = el('div', { class: 'scene-body' },
      el('div', { class: 'scene-top' },
        el('span', { class: 'tc' }, t ? `${fmt(t.start)} → ${fmt(t.start + t.dur)} · ${t.dur.toFixed(1)}s` : `scene ${i + 1}`),
        el('button', { class: 'del', type: 'button', onclick: (ev) => {
          ev.stopPropagation();
          if (project.script.scenes.length <= 1) return;
          project.script.scenes.splice(project.script.scenes.indexOf(scene), 1);
          if (project.script.scenes[0]) project.script.scenes[0].dirty = true;
          renderBoard();
          $('#btnApply').disabled = running;
        } }, 'remove')),
      narr,
      el('button', { class: 'btn small ghost edit-shot', type: 'button', onclick: (ev) => { ev.stopPropagation(); selectShot(scene.id, true); } }, 'Edit shot'));
    card.addEventListener('click', (ev) => { if (!ev.target.closest('textarea, input, select, label, button')) selectShot(scene.id, false); });
    card.append(thumb, body);
    board.append(card);
    updateThumb(i);
  });
  renderTimeline();
  const keep = project.script.scenes.find(x => x.id === selectedShot);
  selectShot(keep ? keep.id : project.script.scenes[0]?.id, false);
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
  copyThumbToClip(i);
}

// Looks drawn in code have no pictures: each scene's thumbnail is a frame from the middle of its shot.
function drawnThumbs(renderer) {
  const scenes = project?.timeline?.scenes || [];
  scenes.forEach((sc, i) => {
    const card = $(`#board .scene[data-id="${sc.id}"]`);
    const thumb = card && $('.thumb', card);
    if (!thumb) return;
    renderer.drawFrame(sc.start + Math.min(sc.dur * 0.5, 1.6));
    $('.shimmer', thumb)?.remove();
    thumb.querySelector('canvas')?.remove();
    const c = document.createElement('canvas');
    const k = 320 / Math.max(renderer.W, renderer.H);
    c.width = Math.round(renderer.W * k); c.height = Math.round(renderer.H * k);
    c.getContext('2d').drawImage(renderer.canvas, 0, 0, c.width, c.height);
    thumb.prepend(c);
    copyThumbToClip(i);
  });
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
  if (player.renderer.ready) { await player.renderer.ready; drawnThumbs(player.renderer); }
  player.offset = 0;
  $('#stageEmpty').classList.add('hidden');
  if (!project.video) showStage('canvas');
  player.renderer.drawFrame(0.6);
  updateTime(0);
  $('#playerInfo').textContent = `${formatOf(project.options)} · ${fmt(project.timeline?.total || 0)}`;
}

function updateTime(t) {
  const total = project?.timeline?.total || 0;
  $('#time').textContent = `${tc(t)} / ${tc(total)}`;
  $('#scrub').value = total ? String(Math.round(t / total * 1000)) : '0';
  moveHead(t);
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
  // Drawn looks (the Blocky tab's default) never use depth: don't download its model for them.
  if (settings.depth3d !== 'off' && !STYLES[$('#style')?.value]?.drawn) preloadDepth();
  if (settings.imageProvider !== 'none') preloadSafety();
}
(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(preloadModels, { timeout: 4000 });
const params = new URLSearchParams(location.search);
if (params.get('topic')) $('#topic').value = params.get('topic');

// Inside Loomy's combined view, the Board can hand a note over as the topic.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.loomy !== 'topic' || typeof e.data.topic !== 'string') return;
  if ($('#viewHome').classList.contains('hidden') && !confirmLeave()) return;
  showHome();
  $('#topic').value = e.data.topic.slice(0, 600);
  toast('Topic added from your board. Check it, then press the make button.');
});

// Loomy's top bar asks this before reloading a section after a sync.
window.loomyBusy = () => running;
// For tests: the open project's script (chapters, scenes).
window.loomyScript = () => project?.script || null;

// ---------- access: view-only visitors can look around but not make videos ----------
let viewOnly = false;
function setViewOnly(on) {
  viewOnly = on;
  document.documentElement.classList.toggle('viewonly', on);
  for (const id of ['btnGo', 'btnDemo', 'btnRender', 'btnRetry', 'btnApply', 'btnAddScene']) {
    const b = document.getElementById(id);
    if (b) { b.disabled = on; b.title = on ? 'View-only: enter your access code in Settings' : ''; }
  }
  const banner = document.getElementById('viewBanner');
  if (banner) banner.hidden = !on;
  const st = document.getElementById('accessState');
  if (st) st.textContent = on ? 'View only. Enter an access code to make videos.' : 'Full access.';
}
function blockedForViewer() {
  if (!viewOnly) return false;
  toast('View-only: open Settings and enter your access code to make videos.', true, 6000);
  return true;
}
(async () => {
  try {
    const r = await fetch('/__access/status', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok || !(r.headers.get('Content-Type') || '').includes('json')) return;
    const j = await r.json();
    const box = document.getElementById('accessBox');
    if (box) box.hidden = false;
    setViewOnly(j.role === 'view');
  } catch { /* no lock on this site */ }
})();
document.getElementById('btnUnlock')?.addEventListener('click', async () => {
  const input = document.getElementById('accessCode');
  const code = (input?.value || '').trim();
  if (!code) { input?.focus(); return; }
  const fd = new FormData(); fd.set('code', code); fd.set('back', '/');
  try {
    const r = await fetch('/__access', { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const j = await r.json();
    if (!j.ok) { toast(j.error || 'That code did not work.', true); return; }
    toast(j.role === 'full' ? 'Unlocked. Full access on this device.' : 'View-only code accepted.');
    setTimeout(() => window.top.location.reload(), 700);
  } catch { toast('Could not check the code. Try again.', true); }
});

// Shot pack: each shot's picture and an animation prompt, for the free credits of video apps.
document.getElementById('btnShotPack')?.addEventListener('click', () => {
  if (typeof blockedForViewer === 'function' && blockedForViewer()) return;
  if (!project?.script) return;
  const shots = project.script.scenes.map((sc, i) => {
    const bmp = project.images?.get(sc.id)?.bitmap;
    let image = '';
    if (bmp) {
      const c = document.createElement('canvas');
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      image = c.toDataURL('image/jpeg', 0.88);
    }
    return { n: i + 1, line: sc.narration, image, prompt: motionPrompt(sc.visual || sc.narration, '3d') };
  });
  openShotPack(shots, (m) => toast(m));
});
const HUB_KIND = '3d';

// ---------- Model Hub: what each production step uses in the chosen mode ----------
async function renderHub() {
  const box = document.getElementById('modelHub');
  if (!box) return;
  const f = document.getElementById('settingsForm');
  const draft = { ...settings };
  for (const k of Object.keys(DEFAULT_SETTINGS)) { const input = f?.elements[k]; if (input && input.type !== 'checkbox' && input.type !== 'range') draft[k] = input.value.trim(); }
  const caps = await capabilities();
  box.replaceChildren(...hubRows(draft, caps, HUB_KIND).map(r => {
    const row = document.createElement('div');
    row.className = 'hub-row';
    const a = document.createElement('span'); a.textContent = r.step;
    const b = document.createElement('span'); const bb = document.createElement('b'); bb.textContent = r.model; const sm = document.createElement('small'); sm.textContent = r.fallback && !['—', 'none'].includes(r.fallback) ? `Fallback: ${r.fallback}` : ''; b.append(bb, sm);
    const c = document.createElement('span'); c.className = 'cost' + (/paid|plan/i.test(r.cost) ? ' paid' : ''); c.textContent = r.cost;
    row.append(a, b, c);
    return row;
  }));
}
document.getElementById('settingsForm')?.addEventListener('input', () => renderHub());
document.getElementById('btnSettings')?.addEventListener('click', () => setTimeout(renderHub, 50));

// E5: the finished video and its word-timed captions go to the Edit tab.
document.getElementById('btnEdit')?.addEventListener('click', async () => {
  const video = project?.video, tl = project?.timeline;
  if (!video?.blob) return;
  const words = (tl?.scenes || []).flatMap(sc => (sc.words || []).map(w => ({ text: w.text, start: sc.start + w.start, end: sc.start + w.end })));
  try {
    const { sendToEditor, openEditTab } = await import('../../shared/handoff.js');
    await sendToEditor({ blob: video.blob, name: `${project.script?.title || 'Loomy video'}.mp4`, words, captionsBurned: settings.captionStyle !== 'off', duration: tl?.total || 0, tab: '3d' });
    openEditTab();
  } catch (e) { toast(`Could not open the editor: ${e.message}`, true); }
});
