// 1.1: a thumbnail for every video, made from the video itself (free, in the browser). It picks the
// most dramatic moments as frames to choose from, boosts the colour, and sets 2-4 huge words (the
// writer's "thumbText") with a thick outline and one word in yellow: the look that gets clicks.
// Wide (1280x720, YouTube) or tall (1080x1920, a Shorts cover); saved as a JPEG under YouTube's 2 MB.

export const SIZES = { wide: [1280, 720], tall: [1080, 1920] };
export const LAYOUTS = ['split', 'full', 'label'];
const YELLOW = '#FFD60A', FONT = '"Montserrat", "Inter", system-ui, sans-serif';
const LITTLE = /^(the|a|an|of|to|in|on|at|for|and|or|but|with|from|by|is|are|was|were|its|your|my|our|their)$/i;

// The words: the writer's thumbnail text, else its headline, else the title; capitals, 4 words at most.
export function thumbWords(script = {}) {
  const pick = [script.thumbText, script.hookText, script.youtubeTitle, script.title].find(t => String(t || '').trim()) || 'WATCH THIS';
  let words = String(pick).replace(/\p{Extended_Pictographic}\uFE0F?|\u200D/gu, '').replace(/[“”"]/g, '').trim().split(/\s+/).filter(Boolean);
  // Too many words: drop the little ones first, and never end on one ("IT FALLS THROUGH THE").
  if (words.length > 4) words = words.filter((w, i) => i === 0 || !LITTLE.test(w));
  words = words.slice(0, 4);
  while (words.length > 1 && LITTLE.test(words[words.length - 1])) words.pop();
  return words.join(' ').toUpperCase();
}

// The word to paint yellow: a number if there is one, else the longest word.
export function accentWord(words) {
  const list = words.split(/\s+/);
  const num = list.findIndex(w => /\d/.test(w));
  if (num >= 0) return num;
  let best = 0;
  list.forEach((w, i) => { if (w.replace(/\W/g, '').length > list[best].replace(/\W/g, '').length) best = i; });
  return list.length > 1 ? best : -1;
}

// Up to 4 moments (seconds) worth a thumbnail: the writer's teaser scene, punchy or reaction shots,
// then scenes spread over the video. Never the first 3 s (the headline sits on those frames).
export function pickMoments(scenes = [], { teaser = null, total = 0, max = 4 } = {}) {
  const at = (sc) => sc.start + Math.min(sc.dur * 0.55, Math.max(0.3, sc.dur - 0.3));
  const ok = scenes.filter(sc => sc && Number.isFinite(sc.start) && sc.dur > 0 && at(sc) >= 3);
  const out = [];
  const add = (sc) => { if (sc && out.length < max && !out.some(t => Math.abs(t - at(sc)) < 1.5)) out.push(at(sc)); };
  if (Number.isInteger(teaser)) add(ok.find(sc => sc === scenes[teaser]));
  // Faces and action first: reactions, impacts and objects in use, then close shots, then the rest.
  const score = (sc) => {
    const k = `${sc.camera || ''} ${sc.cam || ''} ${sc.frame || ''} ${sc.act || ''} ${sc.do || ''} ${sc.read || ''} ${sc.delivery || ''}`;
    return (/react|surprised|shock|flinch|cheer|break|drop|impact|punch|shake|crash/.test(k) ? 3 : 0) + (/talk|close|object|show|point|dramatic|excited/.test(k) ? 1 : 0) + (sc.thing ? 1 : 0) - (/wide|aerial|establish/.test(k) ? 1 : 0);
  };
  const scored = ok.map((sc, i) => ({ sc, i, s: score(sc) }));
  for (const { sc } of scored.filter(x => x.s >= 3).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 2)) add(sc);
  // Then, from each eighth of the video, its best-scoring scene.
  for (let i = 0; out.length < max && i < Math.max(8, max * 2); i++) {
    const n = Math.max(8, max * 2), a = Math.floor(i / n * ok.length), part = scored.slice(a, Math.max(a + 1, Math.floor((i + 1) / n * ok.length)));
    add(part.sort((x, y) => y.s - x.s)[0]?.sc);
  }
  if (!out.length && total > 0) out.push(Math.min(total - 0.1, Math.max(0, total * 0.4)));
  // Best first (the teaser, then reactions and impacts, then the rest): the first one is used.
  return out;
}

// Lines and size for `text` inside a box: the biggest size that fits in at most 3 lines.
export function fitText(measure, text, boxW, boxH, { max = 220, min = 40, lineGap = 0.98 } = {}) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = max; size >= min; size -= 4) {
    for (let lines = 1; lines <= Math.min(3, words.length); lines++) {
      const split = splitInto(words, lines, (s) => measure(s, size));
      const w = Math.max(...split.map(l => measure(l.join(' '), size)));
      if (w <= boxW && split.length * size * lineGap <= boxH) return { size, lines: split };
    }
  }
  return { size: min, lines: [words] };
}
function splitInto(words, n, width) {
  if (n <= 1) return [words];
  // Balanced: try every first break and keep the split whose widest line is smallest.
  let best = null, bestW = Infinity;
  for (let k = 1; k <= words.length - n + 1; k++) {
    const rest = splitInto(words.slice(k), n - 1, width), split = [words.slice(0, k), ...rest];
    const w = Math.max(...split.map(l => width(l.join(' '))));
    if (w < bestW) { bestW = w; best = split; }
  }
  return best;
}

// Draws the thumbnail. frame: a canvas or image of the video frame.
export function drawThumb(g, { W, H, frame, text, layout = 'split' }) {
  const fw = frame.width, fh = frame.height, tallFrame = fh > fw;
  g.save();
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const cover = (x, y, w, h, focusY = 0.38, zoom = 1) => {
    // Cover-crop the frame into the rect, keeping the upper middle (faces, the subject; captions sit low).
    const s = Math.max(w / fw, h / fh) * zoom, sw = w / s, sh = h / s;
    const sx = (fw - sw) / 2, sy = Math.max(0, Math.min(fh - sh, fh * focusY - sh / 2));
    g.drawImage(frame, sx, sy, sw, sh, x, y, w, h);
  };
  // Dark frames (night scenes) are lifted: thumbnails are seen small and bright ones win.
  const lift = Math.max(1.05, Math.min(1.9, 0.42 / Math.max(0.05, meanLight(frame))));
  const look = `saturate(1.4) contrast(1.15) brightness(${lift.toFixed(2)})`;
  g.filter = look;
  const wide = W > H;
  let box;
  if (wide && layout === 'split') {
    // Blurred, dark copy behind; the sharp subject on the right; the words on the left.
    g.filter = `blur(28px) saturate(1.3) brightness(${(0.55 * lift).toFixed(2)})`; cover(-40, -40, W + 80, H + 80, 0.4);
    g.filter = look;
    const pw = Math.round(W * (tallFrame ? 0.5 : 0.58)), px = W - pw;
    cover(px, 0, pw, H, 0.36, tallFrame ? 1 : 1.15);
    g.filter = 'none';
    const fade = g.createLinearGradient(px - 2, 0, px + pw * 0.28, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0.85)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(px - 2, 0, pw * 0.3, H);
    box = { x: W * 0.045, y: H * 0.1, w: px - W * 0.05, h: H * 0.8, align: 'left', vy: 0.5 };
  } else if (!wide && tallFrame) {
    // A 9:16 cover from a 9:16 video. The video's captions sit low (56-82% of the height), faces above
    // them: the top 60% of the frame stays sharp, the rest is a dark blur of the frame (no caption can be
    // read there), and the big words go on that.
    g.filter = `blur(${Math.round(W / 16)}px) brightness(${(0.42 * lift).toFixed(2)}) saturate(1.3)`; cover(-60, -60, W + 120, H + 120, 0.5, 1.1);
    g.filter = look;
    const top = H * 0.6;
    g.drawImage(frame, 0, 0, fw, fh * 0.6, 0, 0, W, top);
    g.filter = 'none';
    const fade = g.createLinearGradient(0, top - H * 0.1, 0, top + H * 0.01);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.75)');
    g.fillStyle = fade; g.fillRect(0, top - H * 0.1, W, H * 0.11);
    box = { x: W * 0.06, y: top + H * 0.02, w: W * 0.88, h: H * 0.3, align: 'center', vy: 0.45, label: layout === 'label' };
  } else {
    cover(0, 0, W, H, wide ? 0.42 : 0.38, wide ? 1.12 : 1.04);
    g.filter = 'none';
    if (layout === 'label') {
      box = wide ? { x: W * 0.05, y: H * 0.07, w: W * 0.62, h: H * 0.42, align: 'left', vy: 0, label: true }
        : { x: W * 0.07, y: H * 0.08, w: W * 0.86, h: H * 0.24, align: 'center', vy: 0, label: true };
    } else {
      const grad = g.createLinearGradient(0, H * 0.45, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.35, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = grad; g.fillRect(0, H * 0.45, W, H * 0.55);
      box = wide ? { x: W * 0.05, y: H * 0.5, w: W * 0.9, h: H * 0.44, align: 'left', vy: 1 }
        : { x: W * 0.06, y: H * 0.52, w: W * 0.88, h: H * 0.3, align: 'center', vy: 0.5 };
    }
  }
  // A vignette pulls the eye to the middle.
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // The words.
  const measure = (s, size) => { g.font = `900 ${size}px ${FONT}`; return g.measureText(s).width; };
  const pad = box.label ? 0.22 : 0;
  const fit = fitText(measure, text, box.w * (1 - pad * 0.6), box.h, { max: Math.round(Math.min(W, H) * (box.label ? 0.17 : 0.24)) });
  const size = fit.size, lh = size * 0.98, blockH = fit.lines.length * lh;
  const top = box.y + (box.h - blockH) * box.vy;
  const hot = accentWord(text);
  let wi = 0;
  g.font = `900 ${size}px ${FONT}`;
  g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  fit.lines.forEach((line, li) => {
    const lw = measure(line.join(' '), size), base = top + li * lh + size * 0.84;
    const x0 = box.align === 'center' ? box.x + (box.w - lw) / 2 : box.x + (box.label ? size * 0.3 : 0);
    if (box.label) {
      // A tilted yellow tag behind each line, the words in black.
      g.save(); g.translate(x0 + lw / 2, base - size * 0.36); g.rotate(-0.035);
      g.fillStyle = YELLOW; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = size * 0.25; g.shadowOffsetY = size * 0.06;
      g.fillRect(-lw / 2 - size * 0.22, -size * 0.58, lw + size * 0.44, size * 1.1);
      g.restore();
    }
    let x = x0;
    for (const word of line) {
      const ww = measure(word, size), isHot = wi === hot;
      g.font = `900 ${size}px ${FONT}`;
      if (!box.label) {
        g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size * 0.18; g.shadowOffsetY = size * 0.05;
        g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(word, x, base); g.restore();
        g.fillStyle = isHot ? YELLOW : '#FFFFFF';
      } else g.fillStyle = isHot ? '#D00000' : '#0B0B0B';
      g.fillText(word, x, base);
      x += ww + measure(' ', size); wi++;
    }
  });
  g.restore();
}

// The frame's average brightness, 0..1.
function meanLight(frame) {
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(frame, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4) / 255;
  } catch { return 0.42; }
}

// A frame of the video at t seconds, as a canvas (from a second, hidden player).
// One hidden video for all the moments: faster than a new one per frame, and every wait has a time
// limit so a browser that never answers (Safari can stall on hidden videos) cannot hang the cover.
const once = (el, ev, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('The video took too long to answer.')), ms);
  el.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true });
});
export async function openVideo(url) {
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
  v.style.cssText = 'position:fixed;left:-10000px;top:0;width:4px;height:4px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  const loaded = once(v, 'loadeddata', 10000);
  v.src = url;
  v.play?.()?.then(() => v.pause()).catch(() => {}); // Safari decodes nothing until a play starts
  try { await loaded; } catch (e) { if (v.readyState < 2) { closeVideo(v); throw e; } }
  return v;
}
export function closeVideo(v) { try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch { /* gone */ } }
export async function frameAt(v, t) {
  const to = Math.max(0, Math.min(t, (v.duration || t + 1) - 0.05));
  if (Math.abs(v.currentTime - to) > 0.01) { const sought = once(v, 'seeked', 8000); v.currentTime = to; await sought; }
  await new Promise(res => (v.requestVideoFrameCallback ? (v.requestVideoFrameCallback(() => res()), setTimeout(res, 300)) : setTimeout(res, 60)));
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  if (!c.width || !c.height) throw new Error('The video has no picture yet.');
  c.getContext('2d').drawImage(v, 0, 0);
  return c;
}
export async function grabFrame(url, t) {
  const v = await openVideo(url);
  try { return await frameAt(v, t); } finally { closeVideo(v); }
}
// How much is going on in a frame: the mean brightness change between neighbouring pixels, on a
// small copy. For a tall cover only the top 60% counts (that part stays sharp); the middle of a
// wide frame counts most. Empty sky or a flat wall scores low; faces, people and objects score high.
export function frameDetail(frame, tallOnly = false) {
  const w = 64, h = Math.max(8, Math.round(64 * frame.height / Math.max(1, frame.width)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(frame, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, rows = tallOnly ? Math.round(h * 0.6) : h;
  return detailOf(d, w, rows);
}
export function detailOf(d, w, rows) {
  const lum = (i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  let sum = 0, n = 0;
  for (let y = 1; y < rows; y++) for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 4;
    sum += Math.abs(lum(i) - lum(i - 4)) + Math.abs(lum(i) - lum(i - w * 4)); n++;
  }
  return n ? sum / n : 0;
}
export function frameFrom(video) {
  const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}

// A JPEG under 2 MB (YouTube's limit).
export async function toJpeg(canvas) {
  for (const q of [0.92, 0.85, 0.75, 0.6]) {
    const b = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
    if (b && b.size < 2_000_000) return b;
  }
  return new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.5));
}

// ---------------- the Upload kit section ----------------

const WAIT = 'Your thumbnail appears here when the video is made.';
const HTML = `
  <p class="sect-title">Thumbnail</p>
  <div class="thumb-wait fine" data-k="wait">${WAIT}</div>
  <div class="thumb-body hidden" data-k="body">
    <canvas class="thumb-view" data-k="view" aria-label="Thumbnail preview"></canvas>
    <div class="thumb-frames" data-k="frames" aria-label="Pick a frame"></div>
    <button class="btn small ghost thumb-now" type="button" data-k="now" title="Use the frame showing in the player">Use the player's frame</button>
    <label class="field"><span>Thumbnail words (2-4 big words)</span><input data-k="text" maxlength="40"></label>
    <div class="thumb-opts">
      <div class="seg" role="group" aria-label="Layout" data-k="layout">
        <button type="button" data-v="split">Split</button><button type="button" data-v="full">Big text</button><button type="button" data-v="label">Label</button>
      </div>
      <div class="seg" role="group" aria-label="Shape" data-k="shape">
        <button type="button" data-v="wide">Wide</button><button type="button" data-v="tall">Tall</button>
      </div>
    </div>
    <a class="btn small primary thumb-dl" data-k="dl" download="thumbnail.jpg">Download thumbnail</a>
  </div>`;

export function attachThumbnail({ card, before, player, toast = () => {} }) {
  const el = document.createElement('div');
  el.className = 'thumbkit';
  el.innerHTML = HTML;
  if (before?.parentElement) before.parentElement.insertBefore(el, before); else card.appendChild(el);
  const $ = (k) => el.querySelector(`[data-k="${k}"]`);
  const view = $('view');
  const st = { frames: [], frame: null, text: '', layout: 'split', shape: 'wide', name: 'thumbnail', url: null, job: 0 };

  const seg = (k) => $(k).querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === st[k]));
  async function paint() {
    if (!st.frame) return;
    const [W, H] = SIZES[st.shape];
    view.width = W; view.height = H;
    view.style.aspectRatio = `${W} / ${H}`;
    view.classList.toggle('tall', st.shape === 'tall');
    try { await document.fonts?.load(`900 100px Montserrat`); } catch { /* the fallback font is fine */ }
    drawThumb(view.getContext('2d'), { W, H, frame: st.frame, text: st.text || 'WATCH THIS', layout: st.shape === 'tall' && st.layout === 'split' ? 'full' : st.layout });
    seg('layout'); seg('shape');
    $('layout').querySelector('[data-v="split"]').disabled = st.shape === 'tall';
    const blob = await toJpeg(view);
    if (st.url) URL.revokeObjectURL(st.url);
    st.url = URL.createObjectURL(blob);
    const dl = $('dl');
    dl.href = st.url; dl.download = `${st.name}-thumbnail.jpg`;
    dl.textContent = `Download thumbnail · ${(blob.size / 1024).toFixed(0)} KB`;
  }
  function chips() {
    $('frames').replaceChildren(...st.frames.map((f) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'thumb-frame' + (f === st.frame ? ' on' : '');
      const c = document.createElement('canvas'); c.width = 96; c.height = Math.round(96 * f.height / f.width);
      c.getContext('2d').drawImage(f, 0, 0, c.width, c.height);
      b.appendChild(c); b.title = 'Use this frame';
      b.addEventListener('click', () => { st.frame = f; chips(); paint(); });
      return b;
    }));
  }
  $('text').addEventListener('input', (e) => {
    // Shown in capitals as typed, like on the thumbnail.
    const box = e.target, at = box.selectionStart;
    box.value = box.value.toUpperCase();
    try { box.setSelectionRange(at, at); } catch { /* not focused */ }
    st.text = box.value; paint();
  });
  $('layout').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.v; if (v && !e.target.disabled) { st.layout = v; paint(); } });
  $('shape').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.v; if (v) { st.shape = v; paint(); } });
  $('now').addEventListener('click', () => {
    if (!player?.videoWidth) { toast('Play or scrub the finished video first.'); return; }
    const f = frameFrom(player);
    st.frames = [f, ...st.frames].slice(0, 5); st.frame = f; chips(); paint();
  });

  return {
    reset() { st.job++; st.frames = []; st.frame = null; $('wait').textContent = WAIT; $('body').classList.add('hidden'); $('wait').classList.remove('hidden'); },
    // The video is made: grab the moments, start on the best one.
    async ready({ url, name, script, scenes, total, wideVideo }) {
      const job = ++st.job;
      st.name = name || 'loomy'; st.text = thumbWords(script);
      // 9:16 videos get a 9:16 cover first (Shorts, TikTok, Reels); wide videos a 16:9 YouTube thumbnail.
      // Tall covers use "Big text": the words sit low, over where the video's own captions are.
      st.shape = wideVideo ? 'wide' : 'tall'; st.layout = 'full';
      $('text').value = st.text;
      const times = pickMoments(scenes, { teaser: script?.teaser ?? null, total, max: 8 });
      const got = [];
      let v = null;
      try {
        v = await openVideo(url);
        for (const [rank, t] of times.entries()) {
          try { const f = await frameAt(v, t); const d = frameDetail(f, !wideVideo); if (d > 0.5) got.push({ f, rank, d }); } catch { /* skip this one */ }
          if (job !== st.job) return;
        }
      } catch { /* fall back to the player below */ } finally { if (v) closeVideo(v); }
      if (!got.length && player?.videoWidth) got.push({ f: frameFrom(player), rank: 0, d: 1 });
      if (!got.length) { $('wait').textContent = 'The frames could not be read here. Play the video, then press "Use the player\'s frame".'; $('body').classList.remove('hidden'); return; }
      // The moment's rank counts, but a frame with nothing in the part that stays sharp loses.
      const top = Math.max(...got.map(x => x.d), 1e-6);
      const frames = got.map(x => ({ ...x, s: x.d / top - x.rank * 0.06 })).sort((p, q) => q.s - p.s).slice(0, 4).map(x => x.f);
      st.frames = frames; st.frame = frames[0];
      $('wait').classList.add('hidden'); $('body').classList.remove('hidden');
      chips(); await paint();
    },
    el,
  };
}
