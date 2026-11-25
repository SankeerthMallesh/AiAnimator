// Loomy Studio: three production engines, one pipeline. Every button does what it says; anything that needs a
// server service says so when it is not available, and nothing pretends to be rendered.
import { $, $$, esc, toast, download, copy, busy, words, fmtTime, slug } from './util.js';
import * as S from './store.js';
import { ENGINES, engineOf } from './engines.js';
import { writeStory, moreHooks, finishStory, scoreHook, HOOK_RUBRIC } from './story.js';
import { planScenes, segment, secondsFor, fixRepeats, promptsFor, sheet } from './scenes.js';
import { decompose, summary } from './actions.js';
import { check } from './qc.js';
import { analyze, RETENTION_NOTE } from './retention.js';
import { cuesFromVoice, cuesFromScenes, toSRT, toVTT, toASS } from './subs.js';
import { REAL_VOICES, elevenScript, makeVoice, estSeconds } from './voice.js';
import { FIELDS, ENDINGS, METRICS, parseCSV, learn, fmt, hookStyle } from './analytics.js';
import { zip } from './zip.js';
import { aiReady } from './ai.js';
import { OUTFITS, ACCESSORIES, outfitLook } from '../../cartoon/js/maps.js';
import { Pen, bodyFront, SKINS } from '../../cartoon/js/c3d/toon2d.js';

const main = $('#main');
let view = 'dash', engineSel = localStorage.getItem('loomy.studio.engine') || 'stick';
const P = () => S.project();
const castOf = (p) => (p?.cast || []).map(S.character).filter(Boolean);
const lines = (p) => p?.lines || [];

// ---------- pipeline (the 20 production steps, each from the project's real state) ----------
function pipeline(p) {
  const E = engineOf(p), cast = castOf(p), sc = p.scenes || [];
  const has = (x) => !!x;
  return [
    ['Engine chosen', true], ['Topic or idea', has(p.idea)], ['Length chosen', has(p.seconds)], ['Script written', lines(p).length > 0],
    ['Script approved', has(p.approved?.script)], ['Character list', !E.usesCast || cast.length > 0], ['Character references', !E.usesCast || (cast.length && cast.every((c) => c.engine !== 'cinema' || c.ref))],
    ['Scenes', sc.length > 0], ['Character actions', sc.length > 0], ['Environments & props', sc.length > 0 && sc.every((s) => s.background)], ['Camera', sc.length > 0 && sc.every((s) => s.shot && s.move)],
    ['Animation instructions', sc.length > 0 && sc.every((s) => s.animPrompt)], ['Scenes approved', has(p.approved?.scenes)], ['Narration', has(p.voice)], ['Sound effects', sc.length > 0 && sc.some((s) => s.sfx)],
    ['Subtitles', (p.subs || []).length > 0], ['Quality check passed', p.qc?.errors === 0], ['Sent to the renderer', has(p.handedAt)], ['Previewed', has(p.previewed)], ['Package exported', has(p.exportedAt)],
  ];
}
const progress = (p) => { const s = pipeline(p); return s.filter((x) => x[1]).length / s.length; };

// ---------- shell ----------
function go(v) { view = v; $$('.nav').forEach((b) => b.toggleAttribute('aria-current', b.dataset.go === v)); $$('.nav').forEach((b) => b.setAttribute('aria-current', b.dataset.go === v ? 'page' : 'false')); render(); window.scrollTo?.(0, 0); }
$$('.nav').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
S.onChange(() => sideProj());
function sideProj() {
  const p = P();
  $('#sideProj').innerHTML = p ? `<div class="mute">Open project</div><div style="font-weight:800;margin:2px 0 6px">${esc(p.title)}</div><span class="chip ${p.engine}">${esc(engineOf(p).short)}</span><div class="bar" style="margin-top:8px"><i style="width:${Math.round(progress(p) * 100)}%"></i></div>` : '<span class="mute">No project open</span>';
}
function needProject() {
  main.innerHTML = `<div class="view empty"><h3>No project open</h3><p>Pick an engine and start a project on the dashboard.</p><button class="btn primary" id="toDash">Go to the dashboard</button></div>`;
  $('#toDash').onclick = () => go('dash');
}
function render() {
  sideProj();
  const views = { dash, script, cast: castView, scenes: scenesView, voice: voiceView, qc: qcView, render: renderView, retention: retentionView, analytics: analyticsView };
  const needs = ['script', 'scenes', 'voice', 'qc', 'render'];
  if (needs.includes(view) && !P()) return needProject();
  views[view]();
}

// ---------- art ----------
const ENGINE_ART = {
  stick: '<svg viewBox="0 0 120 120"><circle cx="60" cy="38" r="22" fill="#fff" stroke="#1d1726" stroke-width="5"/><circle cx="52" cy="36" r="3" fill="#1d1726"/><circle cx="68" cy="36" r="3" fill="#1d1726"/><path d="M52 46q8 6 16 0" stroke="#1d1726" stroke-width="3" fill="none"/><rect x="44" y="62" width="32" height="34" rx="14" fill="#ff5a6b" stroke="#1d1726" stroke-width="4"/><path d="M48 70l-16 18M72 70l14-14M52 96l-6 22M68 96l6 22" stroke="#1d1726" stroke-width="4" stroke-linecap="round"/></svg>',
  blocky: '<svg viewBox="0 0 120 120"><rect x="42" y="14" width="36" height="32" rx="4" fill="#f1c9a0" stroke="#111" stroke-width="3"/><rect x="40" y="10" width="40" height="10" fill="#3b2416"/><circle cx="53" cy="30" r="3"/><circle cx="67" cy="30" r="3"/><rect x="36" y="48" width="48" height="36" rx="3" fill="#5b9dff" stroke="#111" stroke-width="3"/><rect x="22" y="48" width="14" height="34" fill="#5b9dff" stroke="#111" stroke-width="3"/><rect x="84" y="48" width="14" height="34" fill="#5b9dff" stroke="#111" stroke-width="3"/><rect x="40" y="84" width="18" height="30" fill="#2d3e6b" stroke="#111" stroke-width="3"/><rect x="62" y="84" width="18" height="30" fill="#2d3e6b" stroke="#111" stroke-width="3"/></svg>',
  cinema: '<svg viewBox="0 0 120 120"><defs><radialGradient id="g" cx=".4" cy=".35"><stop offset="0" stop-color="#ffe2b0"/><stop offset="1" stop-color="#b8743c"/></radialGradient></defs><circle cx="60" cy="60" r="34" fill="url(#g)"/><ellipse cx="60" cy="60" rx="54" ry="16" fill="none" stroke="#ffc44d" stroke-width="3" opacity=".7"/><circle cx="104" cy="62" r="7" fill="#5b9dff"/></svg>',
};
const ECOL = { stick: '#ff5a6b', blocky: '#5b9dff', cinema: '#ffc44d' };
/** a project cover (honestly a title card in the engine's colours, not a frame of the video) */
function drawCover(cv, p) {
  const g = cv.getContext('2d'), W = cv.width = 360, H = cv.height = 480;
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1b1b2c'); gr.addColorStop(1, ECOL[p.engine] + '55');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const c = castOf(p)[0];
  if (c && p.engine === 'stick') drawStick(g, c, 120, 120, 0.42, 'grin'); else { g.globalAlpha = 0.85; const img = new Image(); img.onload = () => { g.drawImage(img, 120, 90, 150, 150); title(); }; img.src = 'data:image/svg+xml,' + encodeURIComponent(ENGINE_ART[p.engine] || ENGINE_ART.stick); g.globalAlpha = 1; }
  function title() {
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H - 150, W, 150);
    g.fillStyle = '#fff'; g.font = '900 30px Montserrat, Arial'; g.textBaseline = 'top';
    const ws = words(p.title.toUpperCase()); let line = '', y = H - 132;
    for (const w of ws) { if (g.measureText(`${line} ${w}`).width > W - 36 && line) { g.fillText(line, 18, y); y += 34; line = w; } else line = line ? `${line} ${w}` : w; if (y > H - 50) break; }
    g.fillText(line, 18, y);
  }
  title();
}
/** a stickman character drawn by the Cartoons engine's own drawing code (the render uses the same drawing) */
function drawStick(g, c, x, y, scale = 0.4, expr = 'smile', prop = null) {
  const look = outfitLook({ outfit: c.outfit, color: c.color, hat: c.hat, hair: c.hair, acc: c.acc });
  const o = { ...look, skin: SKINS[c.skin || 0] || SKINS[0], acc: c.acc || [] };
  g.save(); g.translate(x, y); g.scale(scale, scale);
  try { bodyFront(new Pen(g), o, { mode: 'stand', expr, seed: 7, ...(prop ? { prop } : {}) }); } catch { /* an outfit the drawing does not know */ }
  g.restore();
}
function drawBlocky(g, c, x, y, s = 1) {
  const box = (bx, by, w, h, col) => { g.fillStyle = col; g.fillRect(x + bx * s, y + by * s, w * s, h * s); g.lineWidth = 3 * s; g.strokeStyle = '#111'; g.strokeRect(x + bx * s, y + by * s, w * s, h * s); };
  box(30, 0, 60, 56, c.skin || '#f1c9a0'); g.fillStyle = c.hair || '#3b2416'; g.fillRect(x + 28 * s, y - 6 * s, 64 * s, 16 * s);
  if (c.hatColor) { g.fillStyle = c.hatColor; g.fillRect(x + 24 * s, y - 14 * s, 72 * s, 12 * s); }
  g.fillStyle = '#111'; g.beginPath(); g.arc(x + 48 * s, y + 26 * s, 4 * s, 0, 7); g.arc(x + 72 * s, y + 26 * s, 4 * s, 0, 7); g.fill();
  g.lineWidth = 3 * s; g.beginPath(); g.arc(x + 60 * s, y + 34 * s, 9 * s, 0.2, Math.PI - 0.2); g.stroke();
  box(20, 58, 80, 62, c.shirt || '#5b9dff'); box(-2, 58, 22, 58, c.shirt || '#5b9dff'); box(100, 58, 22, 58, c.shirt || '#5b9dff');
  box(-2, 116, 22, 14, c.skin || '#f1c9a0'); box(100, 116, 22, 14, c.skin || '#f1c9a0');
  box(22, 120, 36, 58, c.pants || '#2d3e6b'); box(62, 120, 36, 58, c.pants || '#2d3e6b');
}
/** a character's reference sheet: the stickman in four expressions/poses, the blocky figure, or the uploaded picture */
function refSheet(c, el) {
  el.innerHTML = '';
  if (c.ref) { const img = new Image(); img.src = c.ref; img.alt = `${c.name} reference`; el.append(img); }
  if (c.engine === 'stick') {
    for (const [expr, prop] of [['neutral', null], ['grin', ['hold', 0.5, 'paper']], ['shock', ['panic', 0.3]], ['nervous', ['think', 0.5]]]) {
      const cv = document.createElement('canvas'); cv.width = 240; cv.height = 400; drawStick(cv.getContext('2d'), c, 0, 0, 0.4, expr, prop); el.append(cv);
    }
  } else if (c.engine === 'blocky') { const cv = document.createElement('canvas'); cv.width = 240; cv.height = 240; drawBlocky(cv.getContext('2d'), c, 60, 36, 1); el.append(cv); }
  else if (!c.ref) el.innerHTML = '<div class="mute" style="margin:auto;padding:12px;text-align:center">Add a reference picture (from your 3D tool or a photo) so every scene can match it.</div>';
}

// ---------- dashboard ----------
function dash() {
  const st = S.state(), list = st.projects.filter((p) => p.engine === engineSel);
  const E = ENGINES[engineSel];
  main.innerHTML = `<div class="view">
    <div class="head"><div><h1>Production dashboard</h1><p>Three separate engines. Pick one, then start or open a project in it. Each project stays in its engine: its characters, scenes and look never mix with the others.</p></div>
      <div class="row"><button class="btn ghost small" id="backup">Save backup</button><button class="btn ghost small" id="restore">Open backup…</button></div></div>
    <div class="engines">${Object.values(ENGINES).map((e) => `<button class="engine" style="--ec:${ECOL[e.id]}" data-eng="${e.id}" aria-pressed="${e.id === engineSel}"><span class="tag">${esc(e.tag)}</span><h3>${esc(e.label)}</h3><p>${esc(e.blurb)}</p><span class="art">${ENGINE_ART[e.id]}</span></button>`).join('')}</div>
    <div class="card"><div class="row" style="justify-content:space-between"><div><h2>${esc(E.label)}</h2><div class="mute">Renders in Loomy's ${esc(E.renderLabel)} · ${st.characters.filter((c) => c.engine === E.id).length} characters · ${list.length} projects</div></div>
      <form class="row" id="newForm" style="flex:1;max-width:560px"><input type="text" id="newIdea" placeholder="${esc(E.examples[0])}" aria-label="Topic or idea"><button class="btn primary" type="submit">New project</button></form></div>
      <div class="mute" style="margin-top:8px">Ideas: ${E.examples.map((x) => `<a href="#" class="ex">${esc(x)}</a>`).join(' · ')}</div></div>
    <div style="margin-top:18px">${list.length ? `<div class="projects">${list.map((p) => `<div class="pcard ${p.id === st.current ? 'on' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-label="Open ${esc(p.title)}"><canvas></canvas><div class="meta"><div class="t">${esc(p.title)}</div><div class="mute">${esc(statusOf(p))} · ${new Date(p.updated).toLocaleDateString()}</div><div class="bar"><i style="width:${Math.round(progress(p) * 100)}%"></i></div><div class="row"><button class="btn small" data-open="${p.id}">Open</button><button class="btn small ghost danger" data-del="${p.id}">Delete</button></div></div></div>`).join('')}</div>` : `<div class="empty"><h3>No ${esc(E.label)} projects yet</h3><p>Type a topic or idea above and press New project.</p></div>`}</div>
    ${P() && P().engine === engineSel ? `<div class="card" style="margin-top:18px"><h2>Production pipeline: ${esc(P().title)}</h2><p class="mute">Each step turns green from the project's real state. Steps 18-20 happen with the renderer and the preview.</p><div class="steps">${pipeline(P()).map(([n, d], i, a) => `<div class="step ${d ? 'done' : a.findIndex((x) => !x[1]) === i ? 'now' : ''}"><b>${d ? '✓' : i + 1}</b>${esc(n)}</div>`).join('')}</div></div>` : ''}
  </div>`;
  $$('.engine').forEach((b) => b.onclick = () => { setEngine(b.dataset.eng); dash(); });
  $$('.ex').forEach((a) => a.onclick = (e) => { e.preventDefault(); $('#newIdea').value = a.textContent; $('#newIdea').focus(); });
  $('#newForm').onsubmit = (e) => { e.preventDefault(); const idea = $('#newIdea').value.trim(); if (!idea) { toast('Type a topic or idea first.'); $('#newIdea').focus(); return; } const p = S.newProject(idea.slice(0, 70), Object.keys(E.genres)[0]); S.updateProject(p, { engine: engineSel, idea, seconds: E.seconds }); toast('Project created. Next: write the script.'); go('script'); };
  $$('.pcard').forEach((c) => { const p = st.projects.find((x) => x.id === c.dataset.id); drawCover(c.querySelector('canvas'), p); c.onclick = (e) => { if (e.target.closest('[data-del]')) return; S.select(p.id); setEngine(p.engine); go('script'); }; c.onkeydown = (e) => { if (e.key === 'Enter') c.click(); }; });
  $$('[data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const p = st.projects.find((x) => x.id === b.dataset.del); if (confirm(`Delete "${p.title}"? This cannot be undone.`)) { S.deleteProject(p.id); dash(); } });
  $('#backup').onclick = () => download(`loomy-studio-backup-${new Date().toISOString().slice(0, 10)}.json`, S.backup(), 'application/json');
  $('#restore').onclick = () => pickFile('.json,application/json', async (f) => { try { S.restore(await f.text()); toast('Backup restored.'); dash(); } catch (e) { toast(e.message, true); } });
}
/** the engine in use: the open project always belongs to it (switching engine closes a project of another one) */
function setEngine(id) {
  engineSel = id;
  try { localStorage.setItem('loomy.studio.engine', id); } catch { return; }
  if (P() && P().engine !== id) S.select(null);
}
const statusOf = (p) => { const s = pipeline(p), i = s.findIndex((x) => !x[1]); return i < 0 ? 'Complete' : `Next: ${s[i][0]}`; };
function pickFile(accept, fn) { const f = $('#fileIn'); f.accept = accept; f.value = ''; f.onchange = () => f.files[0] && fn(f.files[0]); f.click(); }

// ---------- script ----------
function script() {
  const p = P(), E = engineOf(p), st = p.story, cast = castOf(p);
  const libr = S.state().characters.filter((c) => c.engine === E.id);
  main.innerHTML = `<div class="view">
    <div class="head"><div><span class="chip ${p.engine}">${esc(E.label)}</span><h1 style="margin-top:6px">Script</h1><p>${esc(E.id === 'cinema' ? 'True, demonstrable narration: every sentence becomes a visible demonstration.' : E.id === 'blocky' ? 'An "In this town" premise built into a coherent story: law, motive, rising tension, twist, consequence.' : 'Every sentence describes something a character visibly does, so the stickmen can act it out.')}</p></div></div>
    <div class="grid g2">
      <div class="card stack">
        <label class="f">Title<input type="text" id="title" value="${esc(p.title)}"></label>
        <label class="f">${E.id === 'cinema' ? 'Subject' : 'Idea or premise'}<textarea id="idea" style="min-height:80px">${esc(p.idea || '')}</textarea></label>
        <div class="grid g2"><label class="f">${E.id === 'cinema' ? 'Topic area' : 'Genre'}<select id="genre">${Object.entries(E.genres).map(([k, v]) => `<option value="${k}" ${p.genre === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="f">Length<select id="secs">${E.lengths.map((s) => `<option value="${s}" ${(p.seconds || E.seconds) === s ? 'selected' : ''}>${s} seconds</option>`).join('')}</select></label></div>
        ${E.usesCast ? `<div class="f"><span>Cast (from this engine's character library)</span><div class="row">${libr.length ? libr.map((c) => `<label class="chip"><input type="checkbox" data-cast="${c.id}" ${p.cast.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('') : '<span class="mute">No characters yet: <a href="#" id="toCast">create them</a>, or let the writer invent names.</span>'}</div></div>` : '<div class="note">Full 3D explainers use anonymous figures and objects. Add characters only if this video needs a named person.</div>'}
        <div class="row"><button class="btn primary" id="gen">${st ? 'Write a new version' : 'Write the script'}</button>${st ? '<button class="btn" id="hooks">Three new hooks</button>' : ''}</div>
        <div class="mute">Uses Loomy's server writer. ${esc(HOOK_RUBRIC)}</div>
      </div>
      <div class="card stack">
        <div class="row" style="justify-content:space-between"><h2>Narration</h2><span class="mute" id="est"></span></div>
        <textarea id="lines" style="min-height:320px" placeholder="Write or paste the narration here, one or two sentences per line, or press Write the script.">${esc(lines(p).join('\n'))}</textarea>
        <div class="row"><button class="btn" id="save">Save edits</button><button class="btn primary" id="approve" ${p.approved?.script ? 'disabled' : ''}>${p.approved?.script ? 'Script approved ✓' : 'Approve script'}</button>${p.approved?.script ? '<button class="btn ghost small" id="unapprove">Edit again</button>' : ''}</div>
      </div>
    </div>
    ${st ? `<div class="card"><h2>Hooks</h2><p class="mute">Pick the opening line. Scores follow the rubric above (how the hook is built), not a view prediction.</p><div class="grid g3">${st.hooks.map((h, i) => `<div class="hook ${i === (st.pick || 0) ? 'on' : ''}" data-h="${i}" role="button" tabindex="0"><div class="row" style="justify-content:space-between"><span class="chip">Hook ${i + 1}</span><span class="score">${h.total}/25</span></div><div class="q" style="margin-top:8px">${esc(h.text)}</div><div class="rub">${h.rows.map(([n, s, why]) => `<span>${esc(n)}: <span class="mute">${esc(why)}</span></span><b>${s}</b>`).join('')}</div></div>`).join('')}</div>
      <div class="grid g3" style="margin-top:14px"><div><h3>Twist</h3><p class="dim small">${esc(st.twist || '–')}</p></div><div><h3>Why the ending works</h3><p class="dim small">${esc(st.ending || '–')}</p></div><div><h3>Sound ideas</h3><p class="dim small">${esc((st.sfx || []).join(' · ') || '–')}</p></div></div>
      ${st.facts?.length ? `<div class="note warn" style="margin-top:12px"><b>Check these facts before publishing:</b> ${esc(st.facts.join(' · '))}</div>` : ''}</div>` : ''}
    <div class="card" id="ret"></div>
  </div>`;
  const ta = $('#lines');
  const upd = () => { const ls = ta.value.split('\n').map((l) => l.trim()).filter(Boolean); $('#est').textContent = `${words(ls.join(' ')).length} words · about ${Math.round(estSeconds(ls))} s`; retentionInto($('#ret'), ls, true); };
  ta.oninput = upd; upd();
  $('#toCast')?.addEventListener('click', (e) => { e.preventDefault(); go('cast'); });
  const saveMeta = () => S.updateProject(p, { title: $('#title').value.trim() || p.title, idea: $('#idea').value.trim(), genre: $('#genre').value, seconds: Number($('#secs').value), cast: $$('[data-cast]').filter((x) => x.checked).map((x) => x.dataset.cast) });
  $$('#title,#idea,#genre,#secs,[data-cast]').forEach((el) => el.addEventListener('change', saveMeta));
  $('#save').onclick = () => { saveMeta(); S.updateProject(p, { lines: ta.value.split('\n').map((l) => l.trim()).filter(Boolean), approved: { ...p.approved, script: false, scenes: false } }); toast('Script saved.'); script(); };
  $('#approve').onclick = () => { const ls = ta.value.split('\n').map((l) => l.trim()).filter(Boolean); if (ls.length < 3) { toast('Write at least three lines before approving.', true); return; } saveMeta(); S.updateProject(p, { lines: ls, approved: { ...p.approved, script: Date.now() } }); toast('Script approved. Next: characters, then scenes.'); script(); };
  $('#unapprove')?.addEventListener('click', () => { S.updateProject(p, { approved: { ...p.approved, script: false, scenes: false } }); script(); });
  $('#gen').onclick = (e) => busy(e.currentTarget, 'Writing…', async () => {
    saveMeta();
    if (lines(p).length && !confirm('Replace the current narration with a new version?')) return;
    try { const s = await writeStory({ engine: p.engine, genre: p.genre, idea: p.idea || p.title, seconds: p.seconds, cast: castOf(p) }); S.updateProject(p, { story: s, title: s.title || p.title, lines: [s.hooks[0].text, ...s.lines], approved: {} }); toast('Script written. Pick a hook, edit, then approve.'); script(); }
    catch (err) { toast(err.message, true, 9000); }
  });
  $('#hooks')?.addEventListener('click', (e) => busy(e.currentTarget, 'Writing hooks…', async () => { try { const hs = await moreHooks({ ...st, lines: lines(p).slice(1) }); if (hs.length) { S.updateProject(p, { story: { ...st, hooks: hs, pick: 0 }, lines: [hs[0].text, ...lines(p).slice(1)], approved: {} }); script(); } } catch (err) { toast(err.message, true, 9000); } }));
  $$('.hook').forEach((h) => { const pickIt = () => { const i = Number(h.dataset.h); S.updateProject(p, { story: { ...st, pick: i }, lines: [st.hooks[i].text, ...lines(p).slice(1)], approved: {} }); script(); }; h.onclick = pickIt; h.onkeydown = (e) => e.key === 'Enter' && pickIt(); });
}
function retentionInto(el, ls, compact = false) {
  if (!ls.length) { el.innerHTML = '<h2>Retention check</h2><p class="mute">Appears when there is narration.</p>'; return; }
  const r = analyze(ls);
  el.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Retention check</h2><span class="score">${r.score}/100</span></div><p class="mute">${esc(RETENTION_NOTE)}</p>
    <div class="grid ${compact ? 'g4' : 'g2'}">${r.checks.map((c) => `<div><div class="row" style="justify-content:space-between"><b>${esc(c.name)}</b><span class="chip ${c.score >= 8 ? 'ok' : c.score >= 5 ? 'warn' : 'err'}">${c.score}/10</span></div><div class="mute">${esc(c.detail)}</div>${c.fix ? `<div class="small" style="color:var(--gold)">→ ${esc(c.fix)}</div>` : ''}</div>`).join('')}</div>
    ${r.flags.length ? `<h3 style="margin-top:14px">Lines to fix</h3>${r.flags.map((f) => `<div class="qi warn"><span class="d"></span><span><b>Line ${f.line}:</b> ${esc(f.why)}. <span style="color:var(--gold)">${esc(f.fix)}</span></span></div>`).join('')}` : ''}`;
}

// ---------- characters ----------
function castView() {
  const E = ENGINES[engineSel], list = S.state().characters.filter((c) => c.engine === E.id);
  main.innerHTML = `<div class="view"><div class="head"><div><span class="chip ${E.id}">${esc(E.label)}</span><h1 style="margin-top:6px">Characters</h1><p>Permanent design sheets for ${esc(E.label)}. The same words (and for stickmen, the same drawing) are used in every scene prompt and every render, so a character never changes between scenes. Characters stay in their engine.</p></div>
    <div class="row">${Object.values(ENGINES).map((e) => `<button class="btn small ${e.id === E.id ? 'primary' : 'ghost'}" data-e="${e.id}">${esc(e.short)}</button>`).join('')}<button class="btn primary" id="add">New character</button></div></div>
    <div id="form"></div>
    ${list.length ? `<div class="chars">${list.map((c) => `<div class="char"><div class="ref" data-ref="${c.id}"></div><div class="meta"><div class="row" style="justify-content:space-between"><h3>${esc(c.name)}</h3><span class="mute">${esc(c.id)}</span></div><div class="mute">${esc(c.role || '')}</div><div class="prompt" style="margin-top:8px">${esc(sheet(c))}</div><div class="row" style="margin-top:8px"><button class="btn small" data-edit="${c.id}">Edit</button><button class="btn small ghost" data-copy="${c.id}">Copy sheet</button><button class="btn small ghost danger" data-delc="${c.id}">Delete</button></div></div></div>`).join('')}</div>` : `<div class="empty"><h3>No ${esc(E.label)} characters yet</h3><p>Create the recurring cast once; reuse them in every episode.</p></div>`}</div>`;
  $$('[data-e]').forEach((b) => b.onclick = () => { setEngine(b.dataset.e); castView(); });
  $$('[data-ref]').forEach((el) => refSheet(S.character(el.dataset.ref), el));
  $('#add').onclick = () => charForm({ id: 'c-' + S.uid().slice(0, 6), engine: E.id, name: '', acc: [], colors: {} });
  $$('[data-edit]').forEach((b) => b.onclick = () => charForm({ ...S.character(b.dataset.edit) }));
  $$('[data-copy]').forEach((b) => b.onclick = () => copy(sheet(S.character(b.dataset.copy)), 'Design sheet copied'));
  $$('[data-delc]').forEach((b) => b.onclick = () => { const c = S.character(b.dataset.delc); if (confirm(`Delete ${c.name}? Projects that use them lose them.`)) { S.deleteCharacter(c.id); castView(); } });
}
function charForm(c) {
  const f = $('#form'), E = ENGINES[c.engine];
  const stick = c.engine === 'stick', blocky = c.engine === 'blocky';
  f.innerHTML = `<div class="card" style="margin-bottom:18px"><h2>${c.name ? `Edit ${esc(c.name)}` : 'New character'}</h2><div class="grid g2" style="margin-top:12px">
    <div class="stack"><label class="f">Name<input type="text" id="cName" value="${esc(c.name)}" required></label><label class="f">Role / type<input type="text" id="cRole" value="${esc(c.role || '')}" placeholder="${stick ? 'gold miner, 1890s' : blocky ? 'the youngest kid in town' : 'engineer in 1946'}"></label>
    ${stick ? `<div class="grid g2"><label class="f">Outfit<select id="cOutfit">${OUTFITS.map((o) => `<option ${c.outfit === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label><label class="f">Colour<input type="color" id="cColor" value="${c.color || '#3f6fb5'}"></label><label class="f">Hat<select id="cHat">${['none', 'cap', 'tophat', 'beanie', 'hardhat', 'chef', 'crown', 'helmet', 'officer', 'flatcap'].map((h) => `<option ${c.hat === h ? 'selected' : ''}>${h}</option>`).join('')}</select></label><label class="f">Hair<select id="cHair">${['brown', 'black', 'blonde', 'red', 'gray'].map((h) => `<option ${c.hair === h ? 'selected' : ''}>${h}</option>`).join('')}</select></label><label class="f">Skin<select id="cSkin">${SKINS.map((s, i) => `<option value="${i}" ${Number(c.skin || 0) === i ? 'selected' : ''}>Tone ${i + 1}</option>`).join('')}</select></label></div>
      <div class="f"><span>Accessories</span><div class="row">${ACCESSORIES.map((a) => `<label class="chip"><input type="checkbox" data-acc="${a}" ${(c.acc || []).includes(a) ? 'checked' : ''}> ${a}</label>`).join('')}</div></div>` : blocky ? `<div class="grid g3"><label class="f">Shirt<input type="color" id="bShirt" value="${c.shirt || '#5b9dff'}"></label><label class="f">Pants<input type="color" id="bPants" value="${c.pants || '#2d3e6b'}"></label><label class="f">Skin<input type="color" id="bSkin" value="${c.skin || '#f1c9a0'}"></label><label class="f">Hair<input type="color" id="bHair" value="${c.hair || '#3b2416'}"></label><label class="f">Hat (optional)<input type="color" id="bHat" value="${c.hatColor || '#000000'}"></label></div>` : ''}
    </div><div class="stack"><label class="f">Face design<input type="text" id="cFace" value="${esc(c.face || (stick ? 'big white round head, thick dark outline, simple expressive eyes, eyebrows and mouth' : blocky ? 'square head, two dot eyes, simple smile' : ''))}"></label>
    <label class="f">Body proportions<input type="text" id="cBody" value="${esc(c.body || (stick ? 'thin black arms and legs, rounded torso' : blocky ? 'blocky game-style proportions, cube head, rectangular arms and legs' : ''))}"></label>
    <label class="f">Clothing (words used in every prompt)<input type="text" id="cOut" value="${esc(c.outfitText || '')}" placeholder="orange jumpsuit, white headlamp"></label>
    <label class="f">Personality<input type="text" id="cPers" value="${esc(c.personality || '')}"></label><label class="f">Voice (description; ElevenLabs voice for dialogue)<input type="text" id="cVoice" value="${esc(c.voice || '')}" placeholder="raspy older man, slow"></label>
    <div class="row"><button class="btn small" id="cRef">${c.ref ? 'Replace' : 'Add'} reference picture</button>${c.ref ? '<button class="btn small ghost" id="cRefX">Remove picture</button>' : ''}</div></div></div>
    <div class="ref" id="cPrev" style="display:flex;height:220px;margin-top:12px;border-radius:12px;background:#1a1a2a"></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="cSave">Save character</button><button class="btn ghost" id="cCancel">Cancel</button></div></div>`;
  const read = () => {
    const n = { ...c, name: $('#cName').value.trim(), role: $('#cRole').value.trim(), face: $('#cFace').value.trim(), body: $('#cBody').value.trim(), personality: $('#cPers').value.trim(), voice: $('#cVoice').value.trim(), outfitText: $('#cOut').value.trim() };
    if (stick) Object.assign(n, { outfit: $('#cOutfit').value, color: $('#cColor').value, hat: $('#cHat').value === 'none' ? '' : $('#cHat').value, hair: $('#cHair').value, skin: Number($('#cSkin').value), acc: $$('[data-acc]').filter((x) => x.checked).map((x) => x.dataset.acc) });
    if (blocky) Object.assign(n, { shirt: $('#bShirt').value, pants: $('#bPants').value, skin: $('#bSkin').value, hair: $('#bHair').value, hatColor: $('#bHat').value === '#000000' ? '' : $('#bHat').value });
    n.outfit = stick ? n.outfit : n.outfitText;
    n.colors = stick ? { main: n.color } : blocky ? { main: n.shirt, accent: n.pants } : {};
    if (stick) n.outfitText = n.outfitText || `${n.outfit} outfit in ${n.color}${n.hat ? `, ${n.hat}` : ''}${n.acc.length ? `, ${n.acc.join(', ')}` : ''}`;
    return n;
  };
  const prev = () => refSheet(read(), $('#cPrev'));
  f.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', prev)); prev();
  $('#cRef').onclick = () => pickFile('image/*', (file) => { const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'), k = Math.min(1, 512 / Math.max(img.width, img.height)); cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); c.ref = cv.toDataURL('image/jpeg', 0.82); charForm({ ...read(), ref: c.ref }); }; img.src = URL.createObjectURL(file); });
  $('#cRefX')?.addEventListener('click', () => charForm({ ...read(), ref: '' }));
  $('#cCancel').onclick = () => { f.innerHTML = ''; };
  $('#cSave').onclick = () => { const n = read(); if (!n.name) { toast('Give the character a name.', true); return; } if (S.state().characters.some((x) => x.id !== n.id && x.engine === n.engine && x.name.toLowerCase() === n.name.toLowerCase())) { toast('This engine already has a character with that name.', true); return; } try { S.upsertCharacter({ ...n, first: n.first || null }); toast(`${n.name} saved.`); castView(); } catch (e) { toast(e.message, true); } };
  f.scrollIntoView({ behavior: 'smooth' });
}

// ---------- scenes & actions ----------
function scenesView() {
  const p = P(), E = engineOf(p), cast = castOf(p), sc = p.scenes || [];
  main.innerHTML = `<div class="view"><div class="head"><div><span class="chip ${p.engine}">${esc(E.label)}</span><h1 style="margin-top:6px">Scenes &amp; actions</h1><p>Each sentence becomes a scene with its exact narration; every verb becomes a chain of animation steps (anticipation → action → reaction) with body, hands, eyes, face, objects, timing, camera and sound. Edit anything, then approve.</p></div>
    <div class="row"><button class="btn primary" id="plan" ${p.approved?.script ? '' : 'disabled title="Approve the script first"'}>${sc.length ? 'Re-plan scenes' : 'Plan the scenes'}</button>${sc.length ? `<button class="btn" id="apS" ${p.approved?.scenes ? 'disabled' : ''}>${p.approved?.scenes ? 'Scenes approved ✓' : 'Approve scenes'}</button><button class="btn ghost" id="cp">Copy all prompts</button>` : ''}</div></div>
    ${!p.approved?.script ? '<div class="note warn">Approve the script first (Script tab): scenes are cut from the approved narration.</div>' : ''}
    ${p._planNote ? `<div class="note warn">The AI writer was not available (${esc(p._planNote)}), so this plan was made by Loomy's own scene planner from the narration. Edit the fields freely.</div>` : ''}
    <div id="list">${sc.length ? '' : '<div class="empty"><h3>No scenes yet</h3><p>Press Plan the scenes.</p></div>'}</div></div>`;
  let prevActor = '';
  sc.forEach((s, i) => {
    const plan = decompose(s, E.id, cast, prevActor); prevActor = plan.actor;
    const el = document.createElement('div'); el.className = 'scene';
    el.innerHTML = `<div class="frame"><canvas width="180" height="320"></canvas><span class="shot">${i + 1} · ${esc(s.shot)}</span><span style="position:relative">${esc(s.background)} · ${s.duration}s</span></div>
      <div><div class="narr">"${esc(s.narration)}"</div><div class="fields">
      ${[['description', 'What we see', 1], ['characters', 'Characters'], ['positions', 'Positions'], ['expressions', 'Expressions'], ['movement', 'Body movement'], ['background', 'Environment'], ['shot', 'Camera angle'], ['move', 'Camera movement'], ['lighting', 'Lighting'], ['sfx', 'Sound effects'], ['duration', 'Duration (s)'], ['reason', 'Why this shot']].map(([k, l, wide]) => `<label class="${wide ? 'wide' : ''}">${l}${wide ? `<textarea data-k="${k}">${esc(s[k])}</textarea>` : `<input type="${k === 'duration' ? 'number' : 'text'}" step="0.1" data-k="${k}" value="${esc(Array.isArray(s[k]) ? s[k].join(', ') : s[k])}">`}</label>`).join('')}</div>
      <details><summary>Character actions (${plan.steps.length} steps): ${esc(plan.actor)} · ${esc(summary(plan))}</summary><div class="scroll" style="max-height:340px"><table><tr><th>#</th><th>Step</th><th>Time</th><th>Body</th><th>Head / eyes</th><th>Face</th><th>Arms / hands</th><th>Legs</th><th>Object</th><th>Camera</th><th>Sound</th><th>Next</th></tr>${plan.steps.map((x) => `<tr><td>${x.n}</td><td><b>${esc(x.action)}</b><div class="mute">${esc(x.character)}</div></td><td>${x.start}-${x.end}s</td><td>${esc(x.body)}</td><td>${esc(x.head)}<div class="mute">${esc(x.eyes)}</div></td><td>${esc(x.face)}</td><td>${esc(x.arms)}<div class="mute">${esc(x.hands)}</div></td><td>${esc(x.legs)}</td><td>${esc(x.object)}</td><td>${esc(x.camera)}</td><td>${esc(x.sfx)}</td><td>${esc(x.transition)}</td></tr>`).join('')}</table></div></details>
      <details><summary>Image and animation prompts</summary><div class="prompt">${esc(s.imagePrompt)}</div><div class="row" style="margin:6px 0"><button class="btn small ghost" data-ci="${i}">Copy image prompt</button><button class="btn small ghost" data-ca="${i}">Copy animation prompt</button></div><div class="prompt">${esc(s.animPrompt)}</div></details></div>`;
    $('#list').append(el);
    const g = el.querySelector('canvas').getContext('2d'); drawFrame(g, 180, 320, p, s, plan, 0.5);
    el.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.k; s[k] = k === 'characters' ? inp.value.split(',').map((x) => x.trim()).filter(Boolean) : k === 'duration' ? Math.max(0.8, Number(inp.value) || s.duration) : inp.value;
      promptsFor(s, E, cast); S.updateProject(p, { scenes: sc, approved: { ...p.approved, scenes: false } }); scenesView();
    }));
  });
  $$('[data-ci]').forEach((b) => b.onclick = () => copy(sc[b.dataset.ci].imagePrompt, 'Image prompt copied'));
  $$('[data-ca]').forEach((b) => b.onclick = () => copy(sc[b.dataset.ca].animPrompt, 'Animation prompt copied'));
  $('#plan').onclick = (e) => busy(e.currentTarget, 'Planning scenes…', async () => {
    if (sc.length && !confirm('Re-plan every scene? Your edits to the scenes will be replaced.')) return;
    try { const r = await planScenes(p, cast); const note = r.source === 'local' ? p._planNote : ''; delete p._planNote; S.updateProject(p, { scenes: r.scenes, _planNote: note, approved: { ...p.approved, scenes: false }, subs: [], subsTimed: '' }); toast(r.source === 'ai' ? 'Scenes planned. Check them, then approve.' : 'Planned with Loomy\'s own planner (the AI writer was unavailable).'); scenesView(); }
    catch (err) { toast(err.message, true, 8000); }
  });
  $('#apS')?.addEventListener('click', () => { fixRepeats(sc, E); S.updateProject(p, { scenes: sc, approved: { ...p.approved, scenes: Date.now() } }); toast('Scenes approved. Next: voice and subtitles.'); scenesView(); });
  $('#cp')?.addEventListener('click', () => copy(sc.map((s, i) => `SCENE ${i + 1} (${s.duration}s)\nNarration: ${s.narration}\nImage: ${s.imagePrompt}\nAnimation: ${s.animPrompt}`).join('\n\n'), 'All prompts copied'));
}
/** a storyboard frame drawn in code: the place, the shot, the characters (the real stickman drawing for stickmen) */
function drawFrame(g, W, H, p, s, plan, k = 0.5, cues = null, t = 0) {
  const cast = castOf(p), E = engineOf(p);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, { stick: '#2b3550', blocky: '#203a63', cinema: '#2a2018' }[E.id]); gr.addColorStop(1, '#0c0c14'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, H * 0.68, W, H * 0.32);
  const who = (s.characters || []).map((n) => cast.find((c) => c.name.toLowerCase() === String(n).toLowerCase())).filter(Boolean);
  const close = /close/i.test(s.shot), sc = (close ? 0.62 : /wide|establish|aerial/i.test(s.shot) ? 0.24 : 0.38) * (W / 360);
  const step = plan?.steps?.[Math.min(plan.steps.length - 1, Math.floor(k * plan.steps.length))];
  const fam = step?.family, prop = { grab: ['hold', 0.5, 'paper'], read: ['read', 0.5], dig: ['shovel', k], eat: ['eat', k], drink: ['drink', k], press: ['press', k > 0.5 ? 1 : 0], point: ['point', 0.5], write: ['write', k], type: 'type', count: ['count', k], aim: ['aim', k], react: ['panic', k], discover: ['look', 0.5], carry: 'bag', wave: ['cheer', k] }[fam] || null;
  const expr = /react|realize/.test(step?.action || '') ? 'shock' : step?.face?.includes('smile') ? 'grin' : 'neutral';
  who.slice(0, 2).forEach((c, i) => {
    const x = W * (who.length > 1 ? (i ? 0.62 : 0.12) : 0.25), y = H * (close ? 0.18 : 0.3);
    if (E.id === 'stick') drawStick(g, c, x, y, sc, i ? 'neutral' : expr, i ? null : prop);
    else if (E.id === 'blocky') drawBlocky(g, c, x + 20, y + 40, sc * 1.4);
    else if (c.ref) { const img = new Image(); img.src = c.ref; g.drawImage(img, x, y, 140 * sc * 2, 200 * sc * 2); }
  });
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `700 ${Math.round(W / 20)}px Inter, Arial`; g.textAlign = 'left';
  g.fillText(`${s.shot} · ${s.move}`.slice(0, 40), 10, H - 14 - (cues ? H * 0.32 : 0));
  if (step) { g.fillStyle = '#ffc44d'; g.fillText(`${step.character}: ${step.action}`.slice(0, 40), 10, 20); }
  if (cues) drawCue(g, W, H, cues, t, p.subStyle || {});
}
function drawCue(g, W, H, cues, t, st) {
  const c = cues.find((x) => t >= x.start && t < x.end); if (!c) return;
  const size = Math.round((st.size || 92) / 1920 * H), y = H * ((st.pos ?? 70) / 100);
  g.font = `900 ${size}px ${st.font || 'Montserrat'}, Arial`; g.textAlign = 'center'; g.lineJoin = 'round';
  const ws = c.text.split(' '), widths = ws.map((w) => g.measureText(w + ' ').width), total = widths.reduce((a, b) => a + b, 0);
  let x = W / 2 - total / 2; const pop = st.anim === 'pop' ? 1 + 0.12 * Math.max(0, 1 - (t - c.start) / 0.15) : 1;
  g.save(); g.translate(W / 2, y); g.scale(pop, pop); g.translate(-W / 2, -y);
  ws.forEach((w, i) => {
    const ww = c.words?.[i], on = st.hl !== 'none' && ww && t >= ww.s && t < (c.words[i + 1]?.s ?? c.end);
    const cx = x + widths[i] / 2 - g.measureText(' ').width / 2;
    if (on && st.hl === 'box') { g.fillStyle = st.hlColor || '#ffd200'; g.fillRect(cx - g.measureText(w).width / 2 - 6, y - size * 0.85, g.measureText(w).width + 12, size * 1.1); }
    g.lineWidth = (st.outline ?? 7) / 1920 * H * 2; g.strokeStyle = '#000'; g.strokeText(w, cx, y);
    g.fillStyle = on && st.hl !== 'box' ? (st.hlColor || '#ffd200') : on ? '#000' : (st.color || '#ffffff'); g.fillText(w, cx, y);
    x += widths[i];
  });
  g.restore();
}

// ---------- voice & subtitles ----------
const SUB_DEFAULT = { font: 'Montserrat', size: 92, color: '#ffffff', hlColor: '#ffd200', outline: 7, pos: 70, anim: 'pop', hl: 'word' };
function voiceView() {
  const p = P(), ls = lines(p), st = { ...SUB_DEFAULT, ...(p.subStyle || {}) };
  if (!p.subs?.length && p.scenes?.length) { p.subs = cuesFromScenes(p.scenes); p.subsTimed = 'estimated'; }
  main.innerHTML = `<div class="view"><div class="head"><div><h1>Voice &amp; subtitles</h1><p>One voice for the whole video. A real voiceover gives real word timings for the subtitles; without it the timings are estimated from the scenes and labelled so.</p></div></div>
    <div class="grid g2"><div class="card stack"><h2>Narration</h2>
      <div class="grid g2"><label class="f">Voice<select id="vName">${Object.entries(REAL_VOICES).map(([k, [d]]) => `<option value="${k}" ${p.voiceName === k ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label class="f">Delivery<select id="vExp">${['natural', 'expressive', 'steady'].map((x) => `<option ${p.voiceExp === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <div class="row"><button class="btn primary" id="vGo" ${ls.length < 2 ? 'disabled' : ''}>Make the voiceover</button>${p.voice ? `<button class="btn ghost" id="vDl">Download WAV</button>` : ''}</div>
      <div id="vOut">${p.voice ? `<div class="note">Voiceover made by <b>${esc(p.voice.voiceUsed)}</b> (${p.voice.duration.toFixed(1)} s)${p.voice.note ? ` · ${esc(p.voice.note)}` : ''}.</div><audio id="vAud" controls style="width:100%;margin-top:8px"></audio>` : '<p class="mute">No voiceover yet. It uses the site\'s voice service (ElevenLabs when the server has its key).</p>'}</div>
      <details open><summary>ElevenLabs copy-and-paste narration</summary><div class="prompt" id="eTxt">${esc(elevenScript(ls))}</div><div class="row" style="margin-top:6px"><button class="btn small" id="eCopy">Copy with delivery tags</button><button class="btn small ghost" id="eCopy2">Copy plain</button></div></details></div>
    <div class="card stack"><h2>Subtitle style</h2><div class="grid g3">
      <label class="f">Font<select id="sFont">${['Montserrat', 'Inter', 'Arial Black', 'Impact'].map((x) => `<option ${st.font === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="f">Size<input type="number" id="sSize" value="${st.size}" min="40" max="160"></label><label class="f">Colour<input type="color" id="sColor" value="${st.color}"></label>
      <label class="f">Outline<input type="number" id="sOut" value="${st.outline}" min="0" max="16"></label><label class="f">Position (% from top)<input type="number" id="sPos" value="${st.pos}" min="20" max="85"></label><label class="f">Highlight colour<input type="color" id="sHl" value="${st.hlColor}"></label>
      <label class="f">Animation<select id="sAnim">${['pop', 'none'].map((x) => `<option ${st.anim === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="f">Highlight<select id="sHlS">${[['word', 'spoken word coloured'], ['box', 'box behind the word'], ['none', 'none']].map(([v, l]) => `<option value="${v}" ${st.hl === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <canvas id="sPrev" width="270" height="480" style="width:180px;border-radius:12px;align-self:center;border:1px solid var(--line2)"></canvas></div></div>
    <div class="card"><div class="row" style="justify-content:space-between"><div><h2>Subtitles</h2><span class="chip ${p.subsTimed === 'voice' ? 'ok' : 'warn'}">${p.subsTimed === 'voice' ? 'timed from the real voiceover' : p.subs?.length ? 'estimated timings' : 'none yet'}</span></div>
      <div class="row"><button class="btn small" id="reSub" ${p.scenes?.length || p.voice ? '' : 'disabled'}>Rebuild from ${p.voice ? 'the voiceover' : 'the scenes'}</button><button class="btn small" data-x="srt">SRT</button><button class="btn small" data-x="vtt">VTT</button><button class="btn small" data-x="ass">ASS (styled${p.subsTimed === 'voice' ? ', word highlight' : ''})</button></div></div>
      ${p.subs?.length ? `<div class="scroll" style="margin-top:10px"><table><tr><th>#</th><th>Start</th><th>End</th><th>Text</th></tr>${p.subs.map((c, i) => `<tr><td>${i + 1}</td><td><input type="number" step="0.01" data-i="${i}" data-f="start" value="${c.start}"></td><td><input type="number" step="0.01" data-i="${i}" data-f="end" value="${c.end}"></td><td><input type="text" data-i="${i}" data-f="text" value="${esc(c.text)}"></td></tr>`).join('')}</table></div>` : '<p class="mute">Plan the scenes (or make a voiceover) to create subtitles.</p>'}</div></div>`;
  const saveStyle = () => { p.subStyle = { font: $('#sFont').value, size: Number($('#sSize').value), color: $('#sColor').value, outline: Number($('#sOut').value), pos: Number($('#sPos').value), hlColor: $('#sHl').value, anim: $('#sAnim').value, hl: $('#sHlS').value }; S.updateProject(p, {}); prevSub(); };
  const prevSub = () => { const g = $('#sPrev').getContext('2d'); g.fillStyle = '#223'; g.fillRect(0, 0, 270, 480); const c = p.subs?.[0] || { start: 0, end: 2, text: 'YOUR CAPTION HERE', words: [{ s: 0, w: 'YOUR' }, { s: 0.5, w: 'CAPTION' }, { s: 1, w: 'HERE' }] }; drawCue(g, 270, 480, [c], c.start + 0.6, p.subStyle || SUB_DEFAULT); };
  $$('#sFont,#sSize,#sColor,#sOut,#sPos,#sHl,#sAnim,#sHlS').forEach((el) => el.addEventListener('input', saveStyle)); prevSub();
  $('#vName').onchange = () => S.updateProject(p, { voiceName: $('#vName').value }); $('#vExp').onchange = () => S.updateProject(p, { voiceExp: $('#vExp').value });
  if (p.voice) S.audioGet(p.id).then((b) => { if (b && $('#vAud')) $('#vAud').src = URL.createObjectURL(b); }).catch(() => {});
  $('#vDl')?.addEventListener('click', async () => { const b = await S.audioGet(p.id).catch(() => null); if (b) download(`${slug(p.title)}-voiceover.wav`, b); else toast('The voiceover file is not in this browser any more: make it again.', true); });
  $('#vGo').onclick = (e) => busy(e.currentTarget, 'Making the voiceover…', async () => {
    try {
      const v = await makeVoice(ls, $('#vName').value, $('#vExp').value);
      await S.audioPut(p.id, v.blob);
      const subs = v.perLine?.length ? cuesFromVoice(v.perLine) : cuesFromScenes(p.scenes || []);
      S.updateProject(p, { voice: { voiceUsed: v.voiceUsed, note: v.note, duration: v.duration, cuts: v.cuts, voiceName: $('#vName').value }, subs, subsTimed: v.perLine?.length ? 'voice' : 'estimated', voiceName: $('#vName').value, voiceExp: $('#vExp').value });
      // the scenes take the real timing of their lines
      toast(`Voiceover made (${v.voiceUsed}, ${v.duration.toFixed(1)} s).`); voiceView();
    } catch (err) { toast(err.message, true, 10000); }
  });
  $('#eCopy').onclick = () => copy(elevenScript(ls), 'Narration copied'); $('#eCopy2').onclick = () => copy(elevenScript(ls, { tags: false }), 'Narration copied');
  $('#reSub')?.addEventListener('click', () => { toast(p.voice ? 'Rebuilt from the scenes: make the voiceover again for real timings.' : 'Rebuilt from the scenes.'); S.updateProject(p, { subs: cuesFromScenes(p.scenes || []), subsTimed: 'estimated' }); voiceView(); });
  $$('[data-i]').forEach((inp) => inp.onchange = () => { const c = p.subs[inp.dataset.i]; c[inp.dataset.f] = inp.dataset.f === 'text' ? inp.value : Number(inp.value); if (inp.dataset.f === 'text') delete c.words; S.updateProject(p, {}); });
  $$('[data-x]').forEach((b) => b.onclick = () => { const x = b.dataset.x, f = `${slug(p.title)}.${x}`; if (!p.subs?.length) { toast('No subtitles yet.', true); return; } download(f, x === 'srt' ? toSRT(p.subs) : x === 'vtt' ? toVTT(p.subs) : toASS(p.subs, { karaoke: p.subsTimed === 'voice' && (p.subStyle?.hl ?? 'word') !== 'none', style: p.subStyle })); });
}

// ---------- quality check ----------
function qcView() {
  const p = P(), E = engineOf(p);
  if (!p.scenes?.length) { main.innerHTML = '<div class="view empty"><h3>No scenes to check</h3><p>Plan the scenes first.</p></div>'; return; }
  const r = check(p, castOf(p), E.id, p.subs || []);
  S.updateProject(p, { qc: { errors: r.errors, at: Date.now() } });
  const tot = r.coverage.full + r.coverage.approx + r.coverage.none || 1;
  main.innerHTML = `<div class="view"><div class="head"><div><h1>Quality check</h1><p>Every scene is checked against its narration before rendering. "Animated" means the ${esc(E.renderLabel)} renderer performs that action; "shown as" means it uses its closest action; red means it cannot.</p></div><span class="chip ${r.errors ? 'err' : 'ok'}">${r.errors ? `${r.errors} problem(s) to fix` : 'No blocking problems'}</span></div>
    <div class="card"><h2>Action coverage</h2><div class="bars" style="margin-top:8px">${[['Animated', r.coverage.full, 'var(--green)'], ['Shown as the closest action', r.coverage.approx, 'var(--gold)'], ['Not animated by this renderer', r.coverage.none, 'var(--red)']].map(([l, n, c]) => `<div class="b"><span>${l}</span><span class="t"><i style="width:${n / tot * 100}%;background:${c}"></i></span><span>${n}</span></div>`).join('')}</div></div>
    ${r.scenes.map((s, i) => `<div class="card"><div class="row" style="justify-content:space-between"><h3>Scene ${i + 1}: "${esc(p.scenes[i].narration)}"</h3><span class="mute">${esc(summary(s.plan))}</span></div>${s.items.map((x) => `<div class="qi ${x.level}"><span class="d"></span><span>${esc(x.msg)}</span></div>`).join('')}</div>`).join('')}
    <div class="card"><h3>Subtitles</h3>${r.subtitles.length ? r.subtitles.map((x) => `<div class="qi ${x.level}"><span class="d"></span><span>${esc(x.msg)}</span></div>`).join('') : '<div class="qi ok"><span class="d"></span><span>Subtitle timing looks right.</span></div>'}</div></div>`;
}

// ---------- preview & render ----------
let playing = null;
function renderView() {
  const p = P(), E = engineOf(p), sc = p.scenes || [];
  const total = sc.reduce((a, s) => a + Number(s.duration || 0), 0) || 1;
  main.innerHTML = `<div class="view"><div class="head"><div><h1>Preview &amp; render</h1><p>The preview plays the plan (storyboard frames, subtitles and the voiceover) so you can check timing. It is not the final video: that is rendered by Loomy's ${esc(E.renderLabel)} engine.</p></div></div>
    ${sc.length ? `<div class="player"><div class="screen"><canvas id="pv" width="540" height="960"></canvas></div><div class="stack">
      <div class="row"><button class="btn primary" id="play">Play preview</button><span class="mute" id="pt">0:00.0 / ${fmtTime(total)}</span></div>
      <div class="timeline" id="tl">${sc.map((s, i) => `<div class="blk" style="flex:${s.duration}" data-i="${i}" title="${esc(s.narration)}">${i + 1}. ${esc(s.shot)}</div>`).join('')}<div class="head" id="ph" style="left:0"></div></div>
      <div class="card"><h2>Render the video</h2><p class="dim small">Sends the approved script${E.id === 'stick' && castOf(p).length ? ' and your characters\' locked designs' : ''} to the <b>${esc(E.renderLabel)}</b> tab in "Use my script" mode. That engine renders a real 1080×1920 MP4 with the voice, captions, music and sound, then lets you preview, edit and download it. Nothing starts until you press its make button.</p>
        <div class="row"><button class="btn primary" id="rnd" ${p.approved?.script ? '' : 'disabled'}>Render in ${esc(E.renderLabel)}</button>${!p.approved?.script ? '<span class="mute">Approve the script first.</span>' : ''}</div>
        ${E.id !== 'stick' ? `<p class="mute">${E.id === 'blocky' ? 'Blocky uses its own block-world cast; your Blocky character sheets are the reference for outside tools.' : 'The 3D engine uses its own realistic figures; your references and prompts are for outside 3D tools.'}</p>` : ''}</div>
      <div class="card"><h2>Production package</h2><p class="dim small">A ZIP with the script, every scene (actions, camera, lighting, sound, prompts), the character sheets, the subtitles (SRT, VTT, ASS), the ElevenLabs narration, the voiceover WAV if made, the quality report and the checklist: everything to finish the video in another editor.</p><button class="btn" id="pkg">Download the package</button></div>
    </div></div>` : '<div class="empty"><h3>Nothing to preview yet</h3><p>Plan the scenes first.</p></div>'}</div>`;
  if (!sc.length) return;
  const cv = $('#pv'), g = cv.getContext('2d'), plans = []; let prev = '';
  sc.forEach((s) => { const pl = decompose(s, E.id, castOf(p), prev); prev = pl.actor; plans.push(pl); });
  const cues = p.subs?.length ? p.subs : cuesFromScenes(sc);
  const len = p.voice?.duration || total;
  const at = (t) => { let a = 0; for (let i = 0; i < sc.length; i++) { const d = Number(sc[i].duration) * (len / total); if (t < a + d || i === sc.length - 1) return [i, (t - a) / d]; a += d; } return [0, 0]; };
  const paint = (t) => { const [i, k] = at(t); drawFrame(g, 540, 960, p, sc[i], plans[i], Math.min(0.999, k), cues, t); $$('.blk').forEach((b, j) => b.classList.toggle('on', j === i)); $('#ph').style.left = `${(t / len) * 100}%`; $('#pt').textContent = `${fmtTime(t)} / ${fmtTime(len)}`; };
  paint(0.01);
  let audio = null;
  if (p.voice) S.audioGet(p.id).then((b) => { if (b) { audio = new Audio(URL.createObjectURL(b)); } }).catch(() => {});
  $('#play').onclick = () => {
    if (playing) { cancelAnimationFrame(playing.raf); audio?.pause(); playing = null; $('#play').textContent = 'Play preview'; return; }
    const t0 = performance.now(), start = audio ? (audio.currentTime >= len - 0.1 ? 0 : audio.currentTime) : 0;
    if (audio) { audio.currentTime = start; audio.play().catch(() => {}); }
    $('#play').textContent = 'Pause'; S.updateProject(p, { previewed: Date.now() });
    const tick = () => { const t = audio ? audio.currentTime : start + (performance.now() - t0) / 1000; if (t >= len) { playing = null; $('#play').textContent = 'Play preview'; paint(len - 0.01); return; } paint(t); playing = { raf: requestAnimationFrame(tick) }; };
    tick();
  };
  $('#tl').onclick = (e) => { const r = $('#tl').getBoundingClientRect(), t = ((e.clientX - r.left) / r.width) * len; if (audio) audio.currentTime = t; paint(t); };
  $('#rnd').onclick = () => handoff(p, E);
  $('#pkg').onclick = (e) => busy(e.currentTarget, 'Packing…', () => exportPackage(p));
}
function handoff(p, E) {
  const cast = E.id === 'stick' ? castOf(p).map((c, i) => ({ id: ['a', 'b', 'c', 'd'][i], name: c.name, color: c.color, hat: c.hat || 'hair', hair: c.hair, outfit: c.outfit, acc: c.acc || [] })) : [];
  const text = lines(p).join(' ');
  try { sessionStorage.setItem('loomy.studio.handoff', JSON.stringify({ tool: E.renderTab, title: p.title, text, cast, at: Date.now() })); } catch { toast('This browser blocked the hand-over storage.', true); return; }
  S.updateProject(p, { handedAt: Date.now() });
  let embedded = false; try { embedded = window.top !== window; } catch { embedded = true; }
  if (embedded) window.parent.postMessage({ loomy: 'studio-render', tool: E.renderTab }, location.origin);
  else location.href = `/#${E.renderTab === 'cartoon' ? '' : E.renderTab}`;
  toast(`Opened ${E.renderLabel} with your script. Press its make button to render.`);
}
async function exportPackage(p) {
  const E = engineOf(p), cast = castOf(p), sc = p.scenes || [], name = slug(p.title);
  const r = check(p, cast, E.id, p.subs || []);
  const md = [`# ${p.title}`, `Engine: ${E.label} · renders in Loomy ${E.renderLabel} · ${sc.length} scenes · ${Math.round(sc.reduce((a, s) => a + Number(s.duration), 0))} s · 1080×1920, 9:16`, '', '## Narration', ...lines(p).map((l, i) => `${i + 1}. ${l}`), '', '## Characters', ...(cast.length ? cast.map((c) => `- **${c.name}** (${c.id}): ${sheet(c)}. Personality: ${c.personality || '-'}. Voice: ${c.voice || '-'}`) : ['- none']),
    '', '## Scenes', ...sc.flatMap((s, i) => { const pl = decompose(s, E.id, cast, ''); return [`### Scene ${i + 1} (${s.duration} s): "${s.narration}"`, `- What we see: ${s.description}`, `- Characters: ${(s.characters || []).join(', ') || '-'} · positions: ${s.positions} · expressions: ${s.expressions}`, `- Movement: ${s.movement}`, `- Environment: ${s.background} · lighting: ${s.lighting}`, `- Camera: ${s.shot}, ${s.move} (${s.reason})`, `- Sound: ${s.sfx || '-'}`, `- Actions: ${summary(pl)}`, ...pl.steps.map((x) => `  - ${x.start}-${x.end}s **${x.action}**: body ${x.body}; head ${x.head}; eyes ${x.eyes}; face ${x.face}; arms ${x.arms}; hands ${x.hands}; legs ${x.legs}; object ${x.object || '-'}; camera ${x.camera}; sound ${x.sfx || '-'}; then ${x.transition}`), `- Image prompt: ${s.imagePrompt}`, `- Animation prompt: ${s.animPrompt}`, '']; }),
    '## Editing', ...E.editing.map((x) => `- ${x}`), `- Music: ${E.music}`, '', '## Checklist', ...pipeline(p).map(([n, d]) => `- [${d ? 'x' : ' '}] ${n}`), '', '## Quality check', ...r.scenes.flatMap((s, i) => s.items.filter((x) => x.level !== 'ok' && x.level !== 'info').map((x) => `- Scene ${i + 1}: ${x.msg}`))].join('\n');
  const files = [{ name: `${name}/production.md`, data: md }, { name: `${name}/scenes.json`, data: JSON.stringify({ engine: E.id, title: p.title, scenes: sc.map((s, i) => ({ ...s, actions: decompose(s, E.id, cast, '').steps })), characters: cast }, null, 1) }, { name: `${name}/narration-elevenlabs.txt`, data: elevenScript(lines(p)) }, { name: `${name}/narration-plain.txt`, data: lines(p).join('\n\n') }, { name: `${name}/prompts.txt`, data: sc.map((s, i) => `SCENE ${i + 1}\nIMAGE: ${s.imagePrompt}\nANIMATION: ${s.animPrompt}`).join('\n\n') }];
  if (p.subs?.length) files.push({ name: `${name}/subtitles.srt`, data: toSRT(p.subs) }, { name: `${name}/subtitles.vtt`, data: toVTT(p.subs) }, { name: `${name}/subtitles.ass`, data: toASS(p.subs, { karaoke: p.subsTimed === 'voice', style: p.subStyle }) });
  if (p.voice) { const b = await S.audioGet(p.id).catch(() => null); if (b) files.push({ name: `${name}/voiceover.wav`, data: new Uint8Array(await b.arrayBuffer()) }); }
  for (const c of cast) if (c.ref) files.push({ name: `${name}/characters/${slug(c.name)}.jpg`, data: Uint8Array.from(atob(c.ref.split(',')[1]), (x) => x.charCodeAt(0)) });
  download(`${name}-production.zip`, zip(files));
  S.updateProject(p, { exportedAt: Date.now() });
  toast(`Package downloaded (${files.length} files).`);
}

// ---------- retention (any script) ----------
function retentionView() {
  const p = P();
  main.innerHTML = `<div class="view"><div class="head"><div><h1>Retention check</h1><p>Paste any script (one line per sentence) or use the open project's narration.</p></div>${p ? '<button class="btn" id="useP">Use the open project</button>' : ''}</div>
    <div class="grid g2"><div class="card"><textarea id="rt" style="min-height:360px" placeholder="Paste a script here…">${esc(lines(p).join('\n'))}</textarea></div><div class="card" id="rr"></div></div></div>`;
  const run = () => retentionInto($('#rr'), $('#rt').value.split('\n').map((l) => l.trim()).filter(Boolean));
  $('#rt').oninput = run; run();
  $('#useP')?.addEventListener('click', () => { $('#rt').value = lines(p).join('\n'); run(); });
}

// ---------- analytics ----------
function analyticsView() {
  const vids = S.state().videos;
  const metric = localStorage.getItem('loomy.studio.metric') || 'views';
  const res = learn(vids, metric);
  main.innerHTML = `<div class="view"><div class="head"><div><h1>Analytics</h1><p>Only your real numbers: type them in or import a CSV from YouTube Studio (Analytics → Advanced mode → Export → CSV). Tag each video so Studio can compare what works for you.</p></div>
    <div class="row"><button class="btn" id="imp">Import CSV</button><button class="btn primary" id="addV">Add a video</button>${vids.length ? '<button class="btn ghost small" id="expV">Export CSV</button>' : ''}</div></div>
    <div class="card"><div class="row" style="justify-content:space-between"><h2>What your data says</h2><label class="f" style="flex-direction:row;align-items:center;gap:8px">Compare by<select id="met" style="width:auto">${Object.entries(METRICS).map(([k, v]) => `<option value="${k}" ${k === metric ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      ${res.enough ? `<div class="note" style="margin:10px 0">${esc(res.caveat)}</div><h3>Recommendations</h3><ul>${res.recs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="grid g2" style="margin-top:12px">${res.groups.map((g) => `<div><h3 style="text-transform:capitalize">${esc(g.name)}</h3><div class="bars">${g.rows.map((r) => `<div class="b"><span title="${esc(r.key)}">${esc(r.key)} <span class="mute">(${r.n})</span></span><span class="t"><i style="width:${Math.max(4, Math.min(100, r.avg / Math.max(...g.rows.map((x) => x.avg)) * 100))}%"></i></span><span>${fmt(r.avg, metric)}</span></div>`).join('')}</div></div>`).join('')}</div>
      <div class="grid g2" style="margin-top:12px"><div><h3>Your top third</h3>${res.top.map((r) => `<div class="small">${esc(r.v.title)} · <b>${fmt(r.m, metric)}</b> <span class="mute">${esc(hookStyle(r.v.hook))}</span></div>`).join('')}</div><div><h3>Your bottom third</h3>${res.low.map((r) => `<div class="small">${esc(r.v.title)} · <b>${fmt(r.m, metric)}</b> <span class="mute">${esc(hookStyle(r.v.hook))}</span></div>`).join('')}</div></div>` : `<p class="mute">${esc(res.note)}</p>`}</div>
    <div class="card"><h2>Your videos (${vids.length})</h2>${vids.length ? `<div class="scroll"><table><tr>${FIELDS.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr>${vids.map((v, i) => `<tr>${FIELDS.map(([k, , t]) => `<td>${t === 'engine' ? `<select data-v="${i}" data-k="${k}"><option value=""></option>${Object.values(ENGINES).map((e) => `<option value="${e.id}" ${v[k] === e.id ? 'selected' : ''}>${e.short}</option>`).join('')}</select>` : t === 'ending' ? `<select data-v="${i}" data-k="${k}"><option value=""></option>${ENDINGS.map((x) => `<option ${v[k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : `<input type="${t === 'num' ? 'number' : 'text'}" data-v="${i}" data-k="${k}" value="${esc(v[k] ?? '')}" style="min-width:${k === 'title' || k === 'hook' ? 180 : 70}px">`}</td>`).join('')}<td><button class="btn small ghost danger" data-rm="${i}" aria-label="Remove">✕</button></td></tr>`).join('')}</table></div>` : '<div class="empty"><h3>No videos yet</h3><p>Add your published Shorts with their numbers from YouTube Studio, or import its CSV.</p></div>'}</div></div>`;
  $('#met').onchange = () => { localStorage.setItem('loomy.studio.metric', $('#met').value); analyticsView(); };
  $('#addV').onclick = () => { S.setVideos([...vids, { id: S.uid(), title: 'New video', engine: '', category: '', hook: '', ending: '', scenes: '', length: '', views: '', subs: '', avd: '', apv: '', stayed: '', likes: '', comments: '' }]); analyticsView(); };
  $('#imp').onclick = () => pickFile('.csv,text/csv', async (f) => { try { const rows = parseCSV(await f.text()); S.setVideos([...vids, ...rows]); toast(`${rows.length} videos imported. Tag them (engine, category, hook, ending) to compare.`); analyticsView(); } catch (e) { toast(e.message, true, 9000); } });
  $('#expV')?.addEventListener('click', () => download('loomy-analytics.csv', [FIELDS.map(([, l]) => `"${l}"`).join(','), ...vids.map((v) => FIELDS.map(([k]) => `"${String(v[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'), 'text/csv'));
  $$('[data-v]').forEach((el) => el.onchange = () => { const v = vids[el.dataset.v], t = FIELDS.find((f) => f[0] === el.dataset.k)[2]; v[el.dataset.k] = t === 'num' ? (el.value === '' ? '' : Number(el.value)) : el.value; S.setVideos(vids); });
  $$('[data-rm]').forEach((b) => b.onclick = () => { if (confirm('Remove this video?')) { vids.splice(Number(b.dataset.rm), 1); S.setVideos(vids); analyticsView(); } });
}

// ---------- start ----------
aiReady();
const first = new URLSearchParams(location.search).get('view');
go(first && ['dash', 'script', 'cast', 'scenes', 'voice', 'qc', 'render', 'retention', 'analytics'].includes(first) ? first : 'dash');
window.loomyBusy = () => !!playing;
