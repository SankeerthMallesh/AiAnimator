// UI controller for Storyforge.
import { resetVoiceReport } from './tts.js';
import { attachCutter } from '../../shared/cutter.js';
import { attachThumbnail } from '../../shared/thumbnail.js';
import { chapterLines, withChapters } from '../../shared/upload.js';
import { MOODS, VOICES, CLOUD_VOICES, LENGTHS, EXAMPLES, PACES, FORMATS, formatOf, townFits, autoLook } from './presets.js';
import { getNarrator, warmNarrator } from './tts.js';
import { preloadSafety } from './safety.js';
import { creditText } from './wiki.js';
import { hubRows, capabilities } from './router.js';
import { loadCrew, saveCrew, addToCrew } from './storage.js';
import { loadSettings, saveSettings, loadHistory, saveProjectToHistory, deleteFromHistory, DEFAULT_SETTINGS } from './storage.js';
import { Pipeline, STEPS, newProject } from './pipeline.js';
import { strongGraphics, markTownWeak } from './gpu.js';
import { decodeUserMusic } from './audio.js';
import { Stage, loadFonts } from './stage.js';
import { animateImage, videoProvider, videoProviderLabel, motionPrompt, openShotPack } from './videoai.js';
import { Script } from './script.js';
import { SetKit } from './props.js';
import { Cast } from './cast.js';
import { Demo } from './demo.js';
import { isSafeImage } from './safety.js';

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
  else fillSelect(sel, VOICES.map(([v, l]) => [v, l]), settings.voice);
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

const LONG_STARTS = [
  { label: 'Cartoon history', hint: '10 min · chapters', seconds: 600, example: 'The whole history of the Roman Empire', notes: 'A long, funny cartoon history explainer in chapters by era: big personalities with running jokes, real dates, places and numbers, maps when armies move, a cliffhanger at the end of every chapter.' },
  { label: 'Cartoon history', hint: '15 min · chapters', seconds: 900, example: 'World War One, explained', notes: 'A long, funny cartoon history explainer in chapters: who was who, why it started, every turning point in time order, real dates and numbers, a cliffhanger at the end of every chapter.' },
  { label: 'Cartoon explainer', hint: '5 min · chapters', seconds: 300, example: 'How the human body fights a cold', notes: 'A long cartoon explainer in chapters: one question answered step by step with a recurring cast, a twist at the end of every chapter.' },
];

function initComposer() {
  initLongStarts(LONG_STARTS);
  fillSelect($('#duration'), LENGTHS.map(([v, l]) => [v, l]), 60); // the reference Shorts run about a minute
  fillSelect($('#mood'), Object.entries(MOODS).map(([k, m]) => [k, m.label]), 'curious');
  fillSelect($('#pace'), Object.entries(PACES).map(([k, p]) => [k, p.label]), 'normal');
  $('#quality').value = String(settings.quality || '1080');
  $('#fps').value = String(settings.fps || 30);
  refreshVoiceSelect();
  $('#reviewFirst').checked = !!settings.reviewFirst;

  // Hear a narrator before choosing it: each voice says "Hello, my name is <name>".
const voicePreview = { ctx: null, src: null, cache: new Map() };
async function hearVoice() {
  const btn = $('#btnHear');
  const id = $('#voice').value;
  if (voicePreview.src) { try { voicePreview.src.stop(); } catch { /* already stopped */ } voicePreview.src = null; }
  if (!id || id === 'none') { toast('Pick a narrator first.'); return; }
  const label = $('#voice').selectedOptions[0]?.textContent || id;
  const name = label.split(/\s+[—-]\s+/)[0].trim();
  voicePreview.ctx = voicePreview.ctx || new AudioContext();
  voicePreview.ctx.resume();
  btn.classList.add('busy');
  try {
    let clip = voicePreview.cache.get(`${settings.ttsEngine}|${id}`);
    if (!clip) {
      const engineSettings = { ...settings };
      if (settings.ttsEngine === 'pollinations') engineSettings.cloudVoice = id; else engineSettings.voice = id;
      const n = getNarrator(engineSettings);
      n.settings = engineSettings;
      if (n.engine === 'kokoro') {
        if (!n.ready) toast('Loading the free voice model (about 90 MB, one time)…', false, 6000);
        await warmNarrator(n);
      }
      clip = await n.speak(`Hello, my name is ${name}.`);
      if (!clip) throw new Error('no audio');
      voicePreview.cache.set(`${settings.ttsEngine}|${id}`, clip);
    }
    const buf = voicePreview.ctx.createBuffer(1, clip.samples.length, clip.sampleRate);
    buf.copyToChannel(clip.samples, 0);
    const src = voicePreview.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(voicePreview.ctx.destination);
    src.onended = () => { btn.classList.remove('playing'); if (voicePreview.src === src) voicePreview.src = null; };
    voicePreview.src = src;
    btn.classList.remove('busy'); btn.classList.add('playing');
    src.start();
  } catch (e) {
    btn.classList.remove('busy', 'playing');
    toast(`Could not play that voice (${e.message}).`, true);
  }
}
$('#btnHear').addEventListener('click', hearVoice);

$('#voice').addEventListener('change', (e) => {
    if (settings.ttsEngine === 'pollinations') settings.cloudVoice = e.target.value;
    else if (settings.ttsEngine === 'kokoro') settings.voice = e.target.value;
    saveSettings(settings);
  });
  $('#reviewFirst').addEventListener('change', (e) => { settings.reviewFirst = e.target.checked; saveSettings(settings); });
  // Look: the 3D cartoon town (the best look) on a computer whose graphics can draw it, painted sets
  // on a weaker one; whatever the person picks themselves is kept.
  const look = $('#look');
  if (look) {
    const gpu = strongGraphics();
    // 1.2: Auto is the default; a look the person picked themselves is kept.
    look.value = ['town3d', 'painted', 'auto'].includes(settings.look) ? settings.look : 'auto';
    if (!gpu.ok) look.title = `Auto uses painted sets on this computer (${gpu.why}). The 3D town needs a strong graphics card.`;
    look.addEventListener('change', () => { settings.look = look.value; saveSettings(settings); });
  }

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
  // The town is the default only where it can show the story; a person's own pick always wins.
  const lookFor = (topic) => {
    const picked = $('#look')?.value || 'auto';
    if (picked === 'auto') {
      const a = autoLook(topic, strongGraphics());
      toast(`Auto look: ${a.look === 'town3d' ? '3D cartoon town' : 'painted sets'} (${a.why}).`);
      return a.look;
    }
    if (picked !== 'town3d' || settings.look === 'town3d' || townFits(topic)) return picked;
    toast('Painted sets for this one: the 3D town cannot build those places.');
    return 'painted';
  };
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
      style: 'cartoon',
      look: lookFor(topic || own),
      townCaptions: !!$('#townCaptions')?.checked,
      mood: $('#mood').value,
      pace: $('#pace').value,
      quality: $('#quality').value,
      fps: Number($('#fps').value),
      extra: $('#extra').value.trim(),
      plates: $('#patient').checked,
      photos: $('#photos').checked,
      crew: $('#useCrew')?.checked && !$('#crewBox').classList.contains('hidden') ? loadCrew().filter(c => c.on !== false).slice(0, 4) : null,
    });
  });
  $('#btnDemo').addEventListener('click', () => {
    startProject(Demo.topic(), Demo.options());
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
  p.factChecked = item.factChecked === true;
  p.factStatus = item.factStatus || (p.factChecked ? 'checked' : '');
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
  $('#btnDownload').classList.add('hidden'); $('#btnEdit')?.classList.add('hidden'); cutter().hide(); thumbs().reset(); if (project) project.cut = null;
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
  $('#projMeta').textContent = `${formatOf(p.options)} · cartoon cast · ${PACES[p.options.pace]?.label || 'Normal'} pace · ${MOODS[p.options.mood]?.label || ''}`;
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

// The Download button: the cut video once one is saved (1.1), otherwise the whole one.
function setDownload(video, cut = null) {
  const a = $('#btnDownload'), blob = cut?.blob || video.blob;
  a.href = cut?.url || video.url;
  a.download = `${slug(project.script.title)}${cut ? '-cut' : ''}.${video.ext}`;
  a.textContent = `Download ${video.ext.toUpperCase()}${cut ? ' · cut' : ''} · ${(blob.size / 1048576).toFixed(1)} MB`;
  a.classList.remove('hidden');
}

// 1.1: cut parts out (a lagging voice, a long pause) right here on the export page.
// 1.2: a long video's chapters in the description (YouTube shows them), matching the cut video.
function refreshChapters() {
  const tl = project?.timeline, box = document.getElementById('ytDesc');
  if (!tl || !box) return;
  const cut = project.cut;
  box.value = withChapters(box.value, chapterLines(tl.scenes || [], tl.total || 0, cut ? cut.mapForward : (t) => t));
}

// 1.1: a thumbnail for every video, in the Upload kit (made from the finished video's best moments).
function thumbs() {
  return thumbs.ui ||= attachThumbnail({
    card: document.getElementById('metaCard'),
    before: document.getElementById('musicFile')?.closest('.field'),
    player: document.getElementById('outVideo'),
    toast: (m, bad) => toast(m, bad),
  });
}

// Made on first use (a function, so the page's earlier code can call it at any time).
function cutter() {
  return cutter.ui ||= attachCutter({
    after: document.querySelector('.render-actions'),
    player: document.getElementById('outVideo'),
    toast: (m, bad) => toast(m, bad),
    onSaved: (cut) => { if (!project?.video) return; project.cut = cut; setDownload(project.video, cut); refreshChapters(); },
  });
}

async function doRender(pl = pipeline) {
  stopPreview();
  $('#btnDownload').classList.add('hidden'); $('#btnEdit')?.classList.add('hidden');
  $('#renderProg').classList.remove('hidden');
  $('#renderBar').style.width = '0%';
  $('#renderText').textContent = 'Starting…';
  // A drawn look keeps a whole 3D engine for the preview: free it first, so only one runs during the export.
  if (player.renderer?.ready) { player.renderer.dispose(); player.renderer = null; }
  // 1.1: the sound is ready before the pictures, so parts can be marked for cutting during the export.
  const fps = Number(project.options.fps || settings.fps) || 24;
  project.cut = null;
  cutter().prepare(project.audio || null, fps);
  const video = await pl.render().catch((e) => { cutter().hide(); throw e; });
  setDownload(video);
  refreshChapters();
  cutter().ready(video, fps);
  thumbs().ready({ url: video.url, name: slug(project.script.title), script: project.script, scenes: project.timeline?.scenes || [], total: project.timeline?.total || 0, wideVideo: video.width > video.height }).catch(() => {});
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
  {
    // The writer's description, then the Wikipedia articles and a credit for every picture shown.
    let desc = String(s.description || '').trim();
    const extra = creditText(project.sources || [], project.credits || []);
    if (extra) desc += (/sources\s*:/i.test(desc) ? '\n' : '\n\nSources:\n') + extra;
    $('#ytDesc').value = desc;
  }
  $('#ytTags').value = (s.hashtags || []).join(' ');
  $('#metaCard').classList.remove('hidden');
  showRunwayButton();
  showFacts();
  renderBoard();
}

function showFacts() {
  const status = project?.factStatus || '';
  const notes = project?.factCheckNotes || [];
  const card = $('#factNotes');
  const flag = $('#factFlag');
  const bad = status === 'unchecked' || status === 'flagged';
  card.classList.toggle('hidden', !bad && !notes.length);
  card.classList.toggle('bad', bad);
  $('#factTitle').textContent = status === 'unchecked' ? 'Not fact-checked' : status === 'flagged' ? 'Number flagged' : 'Fact-check notes';
  $('#factFine').textContent = status === 'unchecked'
    ? 'The checker did not run. Do not treat these lines as verified.'
    : 'AI can still be wrong. Read the script below before you publish.';
  $('#factList').innerHTML = '';
  for (const n of notes) $('#factList').append(el('li', {}, n));
  flag.classList.toggle('hidden', !bad);
  flag.textContent = status === 'unchecked'
    ? 'Not fact-checked. These lines were not verified.'
    : status === 'flagged'
      ? 'A quantity in this script is off by orders of magnitude.'
      : '';
}

function hasDirty() { return !!project?.script?.scenes.some(s => s.dirty); }
function markDirty(scene, card) {
  scene.dirty = true;
  card?.classList.add('dirty');
  $('#btnApply').disabled = running;
}

function actText(scene) {
  return (scene.acts || []).map(a => [a.t, a.id, a.do, a.x != null ? a.x : ''].filter(x => x !== '').join(' ')).join('\n');
}
function parseActs(text) {
  const acts = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const m = s.match(/^(\d*\.?\d+)\s+(\S+)\s+([a-z]+)(?:\s+(-?\d*\.?\d+))?/i);
    if (!m) return null;
    const act = { t: Number(m[1]), id: m[2].toLowerCase(), do: m[3].toLowerCase() };
    if (m[4] != null) act.x = Number(m[4]);
    acts.push(act);
  }
  return acts;
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

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  inspectors.clear();
  if (!project?.script) return;
  const ratio = FORMATS[formatOf(project.options)].ratio;
  const tl = project.timeline;
  const cast = project.script.cast || [];
  project.script.scenes.forEach((scene, i) => {
    const t = tl?.scenes.find(x => x.id === scene.id);
    const card = el('div', { class: `scene${scene.dirty ? ' dirty' : ''}`, 'data-id': scene.id });
    const thumb = el('div', { class: 'thumb', style: `aspect-ratio:${Math.max(ratio, 0.56)}` }, el('span', { class: 'num' }, String(i + 1)));
    thumb.addEventListener('click', () => scrubTo(t ? t.start + 0.25 : 0));
    const fileIn = el('input', { type: 'file', accept: 'image/*,video/*', onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (/^video\//.test(f.type) || /\.(mp4|mov|webm|m4v)$/i.test(f.name)) {
        // A clip from Kling, Vidu or anywhere else plays as this whole shot, under the voice and captions.
        try {
          toast('Reading the clip…');
          const clip = await readClip(f);
          const ok = await isSafeImage(clip.frames[Math.floor(clip.frames.length / 2)], scene.narration, (m) => log(m));
          if (!ok) { clip.frames.forEach(b => b.close?.()); toast('That clip was blocked by the safety check.', true); return; }
          project.plates.get(scene.id)?.clip?.frames.forEach(b => b.close?.());
          project.plates.set(scene.id, { key: 'custom', bitmap: clip.frames[0], clip, custom: true, scene: true });
          updateThumb(i);
          markDirty(scene, card);
          toast(`Clip added to shot ${i + 1} (${clip.seconds.toFixed(1)}s). It loops if the line is longer.`);
        } catch (err) { toast(err.message || 'Could not read that video.', true); }
        return;
      }
      try {
        const bmp = await createImageBitmap(f);
        const ok = await isSafeImage(bmp, scene.bg || scene.narration, (m) => log(m));
        if (!ok) { bmp.close?.(); toast('That picture was blocked by the safety check.', true); return; }
        project.plates.set(scene.id, { key: 'custom', bitmap: bmp, custom: true, scene: true });
        updateThumb(i);
        markDirty(scene, card);
      } catch { toast('Could not read that image.', true); }
    } });
    thumb.append(el('div', { class: 'thumb-tools' },
      el('button', { type: 'button', title: 'New background seed', onclick: (ev) => {
        ev.stopPropagation();
        scene.seed = Math.floor(Math.random() * 1e9);
        const cur = project.plates.get(scene.id);
        if (cur && !cur.custom) project.plates.delete(scene.id);
        markDirty(scene, card);
        if (!running) run({ render: false });
      } }, '↻'),
      el('label', { title: 'Use your own picture or video clip for this shot' }, '⤒', fileIn)));

    const narr = el('textarea', { class: 'narr', rows: '3', 'aria-label': `Scene ${i + 1} line` });
    narr.value = scene.narration;
    narr.addEventListener('input', () => { scene.narration = narr.value; markDirty(scene, card); });

    const setSel = el('select', { 'aria-label': 'Set' });
    fillSelect(setSel, SetKit.IDS.map(s => [s, s]), scene.set);
    setSel.addEventListener('change', () => { scene.set = setSel.value; markDirty(scene, card); updateThumb(i); });
    const bg = el('input', { type: 'text', 'aria-label': 'Background', value: scene.bg || '' });
    bg.addEventListener('input', () => { scene.bg = bg.value; markDirty(scene, card); });
    const cam = el('select', { 'aria-label': 'Camera' });
    fillSelect(cam, Script.CAMS.map(c => [c, c]), scene.cam);
    cam.addEventListener('change', () => { scene.cam = cam.value; markDirty(scene, card); updateThumb(i); });
    const cut = el('select', { 'aria-label': 'Cut' });
    fillSelect(cut, Script.CUTS.map(c => [c, c]), scene.cut);
    cut.addEventListener('change', () => { scene.cut = cut.value; markDirty(scene, card); });

    const whoEdits = (scene.who || []).map((w) => {
      const look = cast.find(c => c.id === w.id);
      const pose = el('select', { 'aria-label': `${w.id} pose` });
      fillSelect(pose, Cast.POSES.map(p => [p, p]), w.pose);
      pose.addEventListener('change', () => { w.pose = pose.value; markDirty(scene, card); updateThumb(i); });
      const x = el('input', { type: 'range', min: '0.1', max: '0.9', step: '0.02', value: String(w.x ?? 0.5), 'aria-label': `${w.id} position` });
      x.addEventListener('input', () => { w.x = Number(x.value); markDirty(scene, card); updateThumb(i); });
      return el('label', { class: 'who' }, `${look?.name || w.id}`, pose, x);
    });
    const acts = el('textarea', { class: 'visual', rows: '3', 'aria-label': 'Actions', spellcheck: 'false' });
    acts.value = actText(scene);
    acts.addEventListener('input', () => {
      const parsed = parseActs(acts.value);
      if (parsed) { scene.acts = parsed; markDirty(scene, card); }
    });

    const row = (label, ...ctl) => el('div', { class: 'insp-row' }, el('span', { class: 'insp-label' }, label), el('div', { class: 'insp-ctl' }, ...ctl));
    const inspector = el('div', { class: 'insp-body' },
      el('p', { class: 'sect-title' }, 'Shot'),
      row('Set', setSel), row('Camera', cam), row('Cut in', cut), row('Background', bg),
      ...(whoEdits.length ? [el('p', { class: 'sect-title' }, 'Characters'), ...whoEdits] : []),
      el('details', { class: 'insp-acts' }, el('summary', {}, 'Actions: time id do x'), acts));
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
    narration: 'And then something else happens.',
    bg: last?.bg || project.topic,
    set: last?.set || 'sky',
    cam: 'push', cut: 'whip', say: project.script.cast?.[0]?.id || 'a',
    who: (last?.who || []).map(w => ({ ...w })),
    props: (last?.props || []).map(p => ({ ...p })),
    acts: [],
    seed: Math.floor(Math.random() * 1e9), dirty: true,
  });
  renderBoard();
  $('#btnApply').disabled = running;
  const cards = $$('#board .scene');
  cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('textarea', cards[cards.length - 1])?.select();
});

// Turn a video file into frames the renderer can draw at any moment of the shot.
// 12 frames a second, up to 8 seconds, 720 pixels wide: smooth enough, and light on memory.
async function readClip(file, fps = 12, maxSeconds = 8) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await new Promise((resolve, reject) => {
      v.onloadeddata = resolve;
      v.onerror = () => reject(new Error('This browser cannot read that video. Try an MP4.'));
      setTimeout(() => reject(new Error('The video took too long to open.')), 20000);
    });
    if (!v.videoWidth) throw new Error('That file has no video picture.');
    const seconds = Math.min(maxSeconds, v.duration || 0);
    if (!(seconds > 0.2)) throw new Error('That clip is too short.');
    const w = Math.min(720, v.videoWidth);
    const h = Math.round(w * v.videoHeight / v.videoWidth);
    const frames = [];
    for (let t = 0; t < seconds - 0.01; t += 1 / fps) {
      await new Promise((resolve) => { v.onseeked = resolve; v.currentTime = t; });
      frames.push(await createImageBitmap(v, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }));
    }
    return { frames, fps, seconds };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function updateThumb(i) {
  const scene = project?.script?.scenes[i];
  const card = scene && $(`#board .scene[data-id="${scene.id}"]`);
  if (!card) return;
  const thumb = $('.thumb', card);
  thumb.querySelector('canvas')?.remove();
  const c = document.createElement('canvas');
  const ratio = FORMATS[formatOf(project.options)].ratio;
  c.width = ratio > 1 ? 320 : 180;
  c.height = ratio > 1 ? 180 : 320;
  const plate = project.plates?.get(scene.id) || null;
  try { Stage.still(c, project.script, scene, plate, 0.85); }
  catch (e) { log(`Preview frame failed: ${e.message}`); }
  thumb.prepend(c);
  copyThumbToClip(i);
}

function scrubTo(t) {
  if (!player.renderer) return;
  stopPreview();
  showStage('canvas');
  player.offset = t;
  player.renderer.drawFrame(t);
  updateTime(t);
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
  if (player.renderer.ready) { $('#playerInfo').textContent = 'Building the 3D cartoon town…'; await player.renderer.ready; }
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
  showRunwayButton();
  toast('Settings saved.');
});
$('#btnCheckKeys').addEventListener('click', async () => {
  // Check what is typed in the form right now, saved or not.
  const f = $('#settingsForm');
  const draft = { ...settings };
  for (const k of ['geminiKey', 'groqKey', 'openrouterKey', 'pollinationsKey', 'geminiModel', 'groqModel', 'openrouterModel', 'pollinationsTextModel']) {
    if (f.elements[k]) draft[k] = f.elements[k].value.trim();
  }
  const btn = $('#btnCheckKeys');
  btn.disabled = true; btn.textContent = 'Checking…';
  try {
    const { checkWriters } = await import('./llm.js');
    const res = await checkWriters(draft);
    const label = { gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', pollinations: 'Free writer (no key)' };
    toast(res.map(r => (r.ok ? `✓ ${label[r.name]} works (${(r.ms / 1000).toFixed(1)} s)` : `✗ ${label[r.name]}: ${r.error}`)).join('\n'), res.some(r => !r.ok), 12000);
  } finally { btn.disabled = false; btn.textContent = 'Check keys'; }
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

// ---------- Runway: turn each shot into a real animated clip (the visitor's own paid key) ----------
const RUNWAY_RATIO = { '9:16': ['720:1280', 720, 1280], '16:9': ['1280:720', 1280, 720], '1:1': ['960:960', 960, 960], '4:5': ['832:1104', 832, 1104] };
function showRunwayButton() {
  const ready = !!project?.timeline;
  const b = document.getElementById('btnRunway');
  if (b) {
    b.classList.toggle('hidden', !(ready && videoProvider(settings)));
    if (!b.disabled) b.textContent = `✨ Animate shots with ${videoProviderLabel(settings) || 'AI video'}`;
  }
  document.getElementById('btnShotPack')?.classList.toggle('hidden', !ready);
}
// Loomy's own drawing of a shot, without captions: the first frame a video model animates.
function shotFrame(sc, ratio) {
  const [, w, h] = ratio;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  Stage.still(c, project.script, sc, project.plates.get(sc.id) || null, 1.2, { captions: false });
  return c.toDataURL('image/jpeg', 0.88);
}
async function runwayShot(sc, i, ratio) {
  const blob = await animateImage({ image: shotFrame(sc, ratio), prompt: motionPrompt(sc.narration, 'cartoon'), format: formatOf(project.options), duration: 5 }, settings, { log: (m) => log(`Shot ${i + 1}: ${m}`) });
  return readClip(blob);
}
document.getElementById('btnShotPack')?.addEventListener('click', () => {
  if (blockedForViewer()) return;
  if (!project?.script) return;
  const ratio = RUNWAY_RATIO[formatOf(project.options)] || RUNWAY_RATIO['9:16'];
  openShotPack(project.script.scenes.map((sc, i) => ({ n: i + 1, line: sc.narration, image: shotFrame(sc, ratio), prompt: motionPrompt(sc.narration, 'cartoon') })), (m) => toast(m));
});
document.getElementById('btnRunway')?.addEventListener('click', async () => {
  if (blockedForViewer()) return;
  if (!videoProvider(settings)) { toast('Add a fal.ai or Runway key in Settings first, or use the Shot pack for free credits.', true); return; }
  if (running || !project?.timeline) return;
  const scenes = project.script.scenes;
  if (!confirm(`${videoProviderLabel(settings)} will animate ${scenes.length} shots, about 5 seconds each. This uses paid credit on your account (roughly $0.15–$0.50 a shot, more for Veo) and takes a few minutes. Continue?`)) return;
  const ratio = RUNWAY_RATIO[formatOf(project.options)] || RUNWAY_RATIO['9:16'];
  const btn = document.getElementById('btnRunway');
  btn.disabled = true;
  running = true;
  let done = 0, failed = 0;
  const queue = scenes.map((sc, i) => [sc, i]);
  const worker = async () => {
    while (queue.length) {
      const [sc, i] = queue.shift();
      try {
        btn.textContent = `✨ Animating… ${done}/${scenes.length}`;
        const clip = await runwayShot(sc, i, ratio);
        project.plates.get(sc.id)?.clip?.frames.forEach(b => b.close?.());
        project.plates.set(sc.id, { key: 'custom', bitmap: clip.frames[0], clip, custom: true, scene: true });
        updateThumb(i);
        done++;
      } catch (e) {
        failed++;
        log(`Shot ${i + 1}: animation failed (${e.message})`);
      }
    }
  };
  await Promise.all([worker(), worker()]);
  running = false;
  btn.disabled = false;
  btn.textContent = `✨ Animate shots with ${videoProviderLabel(settings) || 'AI video'}`;
  toast(failed ? `${done} shots animated, ${failed} failed (see the activity log). Press Export MP4.` : `All ${done} shots animated. Press Export MP4 to render the video.`, !!failed && !done, 9000);
  $('#btnRender').disabled = false;
});
const HUB_KIND = 'cartoon';

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

// ---------- My characters ----------
function renderCrew() {
  const box = $('#crewBox'), chips = $('#crewChips');
  if (!box || !chips) return;
  const crew = loadCrew();
  box.classList.toggle('hidden', !crew.length);
  chips.replaceChildren(...crew.map((c, i) => {
    const chip = el('button', { type: 'button', class: `crew-chip${c.on === false ? ' off' : ''}`, title: c.on === false ? 'Tap to use in the next video' : 'Tap to leave out of the next video', 'aria-pressed': String(c.on !== false) },
      el('i', { style: `background:${c.color || '#888'}` }), `${c.name}`, el('small', {}, [c.hat, c.costume].filter(x => x && x !== 'none').join(' · ')));
    chip.addEventListener('click', () => { const all = loadCrew(); all[i].on = all[i].on === false; saveCrew(all); renderCrew(); });
    const x = el('button', { type: 'button', class: 'crew-x', 'aria-label': `Delete ${c.name}`, title: `Delete ${c.name}` }, '×');
    x.addEventListener('click', () => { if (!confirm(`Delete ${c.name} from My characters?`)) return; const all = loadCrew(); all.splice(i, 1); saveCrew(all); renderCrew(); });
    return el('span', { class: 'crew-item' }, chip, x);
  }));
}
renderCrew();
document.getElementById('btnSaveCast')?.addEventListener('click', () => {
  const cast = project?.script?.cast;
  if (!cast?.length) { toast('Make a video first, then save its characters.', true); return; }
  const names = addToCrew(cast);
  renderCrew();
  toast(names.length ? `Saved ${names.join(', ')} to My characters. They star in your next videos (Create → More).` : 'My characters is full (8). Delete one on the Create page first.', !names.length);
});

// E5: the finished video and its word-timed captions go to the Edit tab.
document.getElementById('btnEdit')?.addEventListener('click', async () => {
  const video = project?.video, tl = project?.timeline;
  if (!video?.blob) return;
  // A cut video (1.1) goes with its words moved to match; words in a cut part are left out.
  const cut = project.cut, at = (t) => (cut ? cut.mapTime(t) : t);
  const words = (tl?.scenes || []).flatMap(sc => (sc.words || []).map(w => ({ text: w.text, start: at(sc.start + w.start), end: at(sc.start + w.end) })))
    .filter(w => w.start != null && w.end != null);
  try {
    const { sendToEditor, openEditTab } = await import('../../shared/handoff.js');
    await sendToEditor({ blob: cut?.blob || video.blob, name: `${project.script?.title || 'Loomy video'}.mp4`, words, captionsBurned: project.options?.look === 'town3d' ? !!project.options.townCaptions : settings.captionStyle !== 'off', duration: cut?.duration || tl?.total || 0, tab: 'cartoon' });
    openEditTab();
  } catch (e) { toast(`Could not open the editor: ${e.message}`, true); }
});
