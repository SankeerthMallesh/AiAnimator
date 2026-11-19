// Real AI video for a shot, from whichever service the visitor connected:
//   fal.ai  (one key: Kling, Google Veo, Hailuo, Wan)   - paid per clip, through /api/fal
//   Runway  (Gen-4 Turbo)                                - paid per clip, through /api/runway
// Keys are sent with each request to the site's own server, which passes them on and stores nothing.
// For the free daily credits of web apps (Google Flow, Kling, Magic Hour, Firefly, Vids, Canva)
// there is the Shot pack: a frame and a prompt per shot, then the clip goes back on the shot.

export const FAL_MODELS = [
  ['fal-ai/kling-video/v2.1/standard/image-to-video', 'Kling 2.1 (people and faces stay stable)'],
  ['fal-ai/veo3/fast/image-to-video', 'Google Veo 3 Fast (most realistic, costs more)'],
  ['fal-ai/minimax/hailuo-02/standard/image-to-video', 'Hailuo 02 by MiniMax (lively motion)'],
  ['fal-ai/wan/v2.2-a14b/image-to-video', 'Wan 2.2 (open model, cheapest)'],
];

export function videoProvider(s) {
  if (s.videoProvider === 'runway' && s.runwayKey) return 'runway';
  if (s.videoProvider === 'fal' && s.falKey) return 'fal';
  if (s.falKey) return 'fal';
  if (s.runwayKey) return 'runway';
  return null;
}

export function videoProviderLabel(s) {
  const p = videoProvider(s);
  if (p === 'runway') return 'Runway Gen-4 Turbo';
  if (p === 'fal') return (FAL_MODELS.find(m => m[0] === (s.falModel || FAL_MODELS[0][0]))?.[1] || s.falModel || 'fal.ai').split(' (')[0];
  return null;
}

const RATIOS = { '9:16': '720:1280', '16:9': '1280:720', '1:1': '960:960', '4:5': '832:1104' };

async function post(path, body, signal) {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res;
}
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
});

// image: a data: URL (JPEG). Returns a Blob with the finished clip.
export async function animateImage({ image, prompt, format = '9:16', duration = 5 }, s, { signal, log } = {}) {
  const provider = videoProvider(s);
  if (!provider) throw new Error('Connect Runway or fal.ai in Settings first.');
  const until = Date.now() + 10 * 60 * 1000;
  if (provider === 'runway') {
    const start = await (await post('/api/runway', { key: s.runwayKey, action: 'start', image, prompt, ratio: RATIOS[format] || RATIOS['9:16'], duration }, signal)).json();
    if (!start.ok) throw new Error(start.error || 'Runway refused the shot');
    while (Date.now() < until) {
      await wait(5000, signal);
      const st = await (await post('/api/runway', { key: s.runwayKey, action: 'poll', id: start.id }, signal)).json();
      if (!st.ok) throw new Error(st.error || 'Runway status failed');
      log?.(`Runway: ${st.status}${st.progress != null ? ` ${Math.round(st.progress * 100)}%` : ''}`);
      if (st.status === 'SUCCEEDED' && st.output?.[0]) return download('/api/runway', s.runwayKey, st.output[0], signal);
      if (st.status === 'FAILED' || st.status === 'CANCELLED') throw new Error(st.failure || `Runway ${String(st.status).toLowerCase()}`);
    }
    throw new Error('Runway took too long');
  }
  const model = s.falModel || FAL_MODELS[0][0];
  const start = await (await post('/api/fal', { key: s.falKey, action: 'start', model, input: { prompt, image_url: image } }, signal)).json();
  if (!start.ok) throw new Error(start.error || 'fal.ai refused the shot');
  while (Date.now() < until) {
    await wait(5000, signal);
    const st = await (await post('/api/fal', { key: s.falKey, action: 'poll', status_url: start.status_url }, signal)).json();
    if (!st.ok) throw new Error(st.error || 'fal.ai status failed');
    log?.(`fal.ai: ${st.status}`);
    if (st.status === 'COMPLETED') {
      const r = await (await post('/api/fal', { key: s.falKey, action: 'result', response_url: start.response_url }, signal)).json();
      if (!r.ok) throw new Error(r.error || 'fal.ai gave no clip');
      return download('/api/fal', s.falKey, r.url, signal);
    }
  }
  throw new Error('fal.ai took too long');
}

async function download(path, key, url, signal) {
  const res = await post(path, { key, action: 'fetch', url }, signal);
  if (!/^video\//.test(res.headers.get('Content-Type') || '')) throw new Error('Could not download the clip');
  return res.blob();
}

// The prompt that turns a still into motion, written for image-to-video models.
export function motionPrompt(line, kind = 'cartoon') {
  return kind === 'cartoon'
    ? `Animate this 2D cartoon. The stick-figure characters move naturally: they talk, gesture and react with lively, bouncy cartoon motion. Keep the exact art style, colors, outlines and characters. Gentle camera push-in. No new text. Story beat: ${line}`
    : `Animate this scene with smooth, cinematic, realistic motion and a slow camera move. Keep the picture's look and subject. No text. Story beat: ${line}`;
}

// ---------- Shot pack: use the free daily credits of web video apps ----------
export const FREE_TOOLS = [
  ['Google Flow (Veo)', 'https://labs.google/fx/tools/flow'],
  ['Kling', 'https://app.klingai.com/'],
  ['Magic Hour', 'https://magichour.ai/'],
  ['Adobe Firefly', 'https://firefly.adobe.com/generate/video'],
  ['Google Vids', 'https://vids.google.com/'],
  ['Canva', 'https://www.canva.com/'],
];

// shots: [{ n, line, image (data URL), prompt }]. toast(msg) shows a message.
export function openShotPack(shots, toast) {
  document.getElementById('shotPack')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'shotPack';
  dlg.className = 'dlg shot-pack';
  const tools = FREE_TOOLS.map(([name, url]) => `<a class="btn small ghost" href="${url}" target="_blank" rel="noopener">${name} ↗</a>`).join('');
  dlg.innerHTML = `<div class="dlg-inner">
    <div class="dlg-head"><h3>Shot pack</h3><button class="icon-btn" type="button" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="fine">Use the free daily credits of a video app: for each shot, save the frame and copy the prompt, then in the app choose <b>image to video</b>, upload the frame and paste the prompt. Download the clip and drop it on the same shot in the storyboard with <b>⤒</b>. Loomy adds the voice, captions and music when you export.</p>
    <div class="tool-row">${tools}</div>
    <div class="shot-list"></div>
  </div>`;
  const list = dlg.querySelector('.shot-list');
  for (const sh of shots) {
    const row = document.createElement('div');
    row.className = 'shot-row';
    row.innerHTML = `<img alt="Shot ${sh.n}"><div class="shot-info"><b>Shot ${sh.n}</b><p></p><div class="shot-btns"><a class="btn small" download="loomy-shot-${sh.n}.jpg">Save frame</a><button class="btn small ghost" type="button">Copy prompt</button></div></div>`;
    row.querySelector('img').src = sh.image;
    row.querySelector('p').textContent = sh.line;
    row.querySelector('a').href = sh.image;
    row.querySelector('button').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(sh.prompt); toast(`Prompt for shot ${sh.n} copied.`); }
      catch { window.prompt('Copy this prompt:', sh.prompt); }
    });
    list.append(row);
  }
  dlg.querySelector('[data-close]').addEventListener('click', () => { dlg.close(); dlg.remove(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

export const SHOT_PACK_CSS = `
.shot-pack { width: min(760px, calc(100vw - 24px)); }
.shot-pack .tool-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 14px; }
.shot-pack .shot-list { display: grid; gap: 10px; max-height: 60vh; overflow: auto; }
.shot-pack .shot-row { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; align-items: start; padding: 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
.shot-pack .shot-row img { width: 96px; border-radius: 8px; display: block; }
.shot-pack .shot-row p { margin: 4px 0 8px; color: var(--muted); font-size: 13px; }
.shot-pack .shot-btns { display: flex; gap: 6px; flex-wrap: wrap; }
`;
