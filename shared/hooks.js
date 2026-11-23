// The hook stack: several hooks in a video's first seconds, so a viewer has a reason to stay at every beat.
//   0.0 s  a cold open: the most dramatic moment of the video flashes first (TEASE seconds)
//   0.0 s  the spoken hook (the writer's first line) starts at the same time
//   0.1 s  an on-screen headline pops in (2-6 words that tease the payoff, not the title)
//   TEASE  a riser builds into a hit and a white flash: the cut back to the start of the story
// Plain data and canvas drawing (no three.js), shared by the 3D, Blocky and Cartoons tabs.

export const TEASE = 0.9;        // how long the cold open lasts
export const HEADLINE_END = 2.8; // the headline leaves here

// Which scene to flash first: the writer's "teaser" if it is a real later scene, else the most dramatic one
// from the third scene on (a reaction, an impact, a shockwave or sparks, a flinch or a cheer, an
// exclamation; later scenes win ties), else the one at two thirds. A talking head is never a hook.
export function teaserIndex(scenes, wanted) {
  const n = scenes?.length || 0;
  if (n < 3) return -1;
  const w = Number(wanted);
  if (Number.isInteger(w) && w >= 1 && w < n) return w;
  const score = (s) => (s.frame === 'react' || s.shot === 'react' ? 3 : 0) + (s.frame === 'group' ? 1 : 0) + (s.camera === 'impact' || s.camera === 'vertigo' ? 2 : 0)
    + (s.effect === 'shockwave' ? 2 : ['sparks', 'pulse', 'bubbles'].includes(s.effect) ? 1 : 0) + (/!\s*$/.test(String(s.narration || '').trim()) ? 1 : 0)
    + (['surprised', 'flinch', 'cheer'].includes(s.act || s.pose) ? 1 : 0) + (s.do === 'break' || s.do === 'drop' ? 2 : s.thing ? 1 : 0);
  let best = -1, bestScore = 0;
  for (let i = 2; i < n; i++) { const sc = score(scenes[i]) + i / n * 0.5; if (sc >= 1 && sc > bestScore) { best = i; bestScore = sc; } }
  return best >= 0 ? best : Math.min(n - 1, Math.round(n * 0.66));
}

// The on-screen headline: the writer's hookText, cleaned to at most 6 words, or a fallback from the title.
export function headlineText(script) {
  const raw = String(script?.hookText || '').replace(/\p{Extended_Pictographic}️?|‍/gu, '').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
  if (raw) return raw.split(' ').slice(0, 6).join(' ').toUpperCase();
  const t = String(script?.title || '').replace(/\p{Extended_Pictographic}️?|‍/gu, '').trim();
  return t ? t.split(' ').slice(0, 6).join(' ').toUpperCase() : '';
}

// The shot plan with the cold open: a copy of the teaser scene's first shot plays 0..TEASE, and the
// first shot starts at TEASE (its camera move and words keep their own time).
export function withTeaser(specs, teaserScene) {
  if (teaserScene < 0 || !specs.length) return specs;
  const src = specs.find(s => s.scene === teaserScene);
  if (!src || specs[0].end <= TEASE + 0.4) return specs;
  const tease = { ...src, start: 0, end: TEASE, teaser: true, camera: src.camera === 'pull-out' ? 'push-in' : src.camera, offset: src.offset + Math.min(0.6, (src.end - src.start) * 0.3), words: [] };
  const first = { ...specs[0], start: TEASE, offset: specs[0].offset + TEASE };
  return [tease, first, ...specs.slice(1)];
}

// The hook's sounds (shared/filmsound.js cue kinds): a hit at 0, a riser into the cut, a boom on it.
export function hookCues() {
  return [{ t: 0, kind: 'thump', gain: 0.8 }, { t: 0.05, kind: 'riser', gain: 0.7, dur: TEASE - 0.1 }, { t: TEASE - 0.02, kind: 'boom', gain: 0.85 }, { t: TEASE - 0.2, kind: 'whoosh', gain: 0.8 }];
}

const ease = (x) => { const c = 1.70158, k = Math.max(0, Math.min(1, x)); return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
// Draws the headline at time t (seconds into the video): it pops in, the last word in yellow, a dark
// band behind it so it reads on any picture, and it leaves at HEADLINE_END. top: its centre (share of H).
export function drawHeadline(g, W, H, t, text, { top = 0.14, font = '"Montserrat", "Inter", system-ui, sans-serif' } = {}) {
  if (!text || t < 0.08 || t > HEADLINE_END) return;
  const pop = ease((t - 0.08) / 0.3), fade = Math.max(0, Math.min(1, (HEADLINE_END - t) / 0.25));
  let size = Math.round(Math.min(W * 0.085, H * 0.05));
  g.save();
  const lines = () => {
    g.font = `900 ${size}px ${font}`;
    const out = []; let cur = '';
    for (const w of text.split(' ')) { const next = cur ? `${cur} ${w}` : w; if (cur && g.measureText(next).width > W * 0.84) { out.push(cur); cur = w; } else cur = next; }
    if (cur) out.push(cur);
    return out;
  };
  let ls = lines();
  for (let i = 0; i < 5 && (ls.length > 2 || ls.some(l => g.measureText(l).width > W * 0.84)); i++) { size = Math.round(size * 0.88); ls = lines(); }
  const lh = size * 1.12, bandH = ls.length * lh + size * 0.7, y0 = H * top;
  g.translate(W / 2, y0); g.scale(pop, pop); g.globalAlpha = fade;
  g.fillStyle = 'rgba(0,0,0,.55)';
  g.fillRect(-W / 2, -bandH / 2, W, bandH);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  ls.forEach((l, k) => {
    const y = (k - (ls.length - 1) / 2) * lh;
    g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(l, 0, y);
    g.fillStyle = k === ls.length - 1 ? '#FFE14D' : '#FFFFFF'; g.fillText(l, 0, y);
  });
  g.restore();
}

// A white flash on the cut out of the cold open (3 frames' worth).
export function drawCutFlash(g, W, H, t) {
  const k = (t - TEASE) / 0.12;
  if (k < 0 || k >= 1) return;
  g.save(); g.globalAlpha = 0.7 * (1 - k); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore();
}

// ---------- long form: chapter cards ----------
// A chapter opens with a title card over its first shot: "CHAPTER 2" small, its title big, a gradient
// rule, for CHAPTER_CARD seconds (it slides in and fades out). local: seconds into the chapter's scene.
export const CHAPTER_CARD = 2.2;
export function drawChapterCard(g, W, H, local, n, title, { font = '"Montserrat", "Inter", system-ui, sans-serif' } = {}) {
  if (!title || local < 0 || local > CHAPTER_CARD) return;
  const inK = Math.min(1, local / 0.3), out = Math.min(1, (CHAPTER_CARD - local) / 0.3), a = Math.min(inK, out);
  const ease = 1 - (1 - inK) ** 3, portrait = H >= W;
  const big = Math.round(Math.min(W * (portrait ? 0.075 : 0.05), H * 0.06)), small = Math.round(big * 0.42);
  g.save();
  g.globalAlpha = a;
  // A dark band across the middle third, so the card reads on any picture.
  const bandH = big * 3.4, cy = H * (portrait ? 0.42 : 0.5);
  const grd = g.createLinearGradient(0, cy - bandH / 2, 0, cy + bandH / 2);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.25, 'rgba(0,0,0,.62)'); grd.addColorStop(0.75, 'rgba(0,0,0,.62)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, cy - bandH / 2, W, bandH);
  g.translate((1 - ease) * -W * 0.06, 0);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = `800 ${small}px ${font}`; g.fillStyle = '#FFC9CF';
  g.fillText(`CHAPTER ${n}`, W / 2, cy - big * 0.85);
  let size = big; g.font = `900 ${size}px ${font}`;
  const text = String(title).toUpperCase();
  while (g.measureText(text).width > W * 0.88 && size > 12) { size = Math.round(size * 0.9); g.font = `900 ${size}px ${font}`; }
  g.lineWidth = size * 0.14; g.strokeStyle = '#000'; g.strokeText(text, W / 2, cy + big * 0.15);
  g.fillStyle = '#FFFFFF'; g.fillText(text, W / 2, cy + big * 0.15);
  const rw = Math.min(W * 0.4, g.measureText(text).width * 0.6) * ease;
  const rule = g.createLinearGradient(W / 2 - rw / 2, 0, W / 2 + rw / 2, 0);
  rule.addColorStop(0, '#FF5A6B'); rule.addColorStop(0.55, '#FF2D47'); rule.addColorStop(1, '#D90F2B');
  g.fillStyle = rule; g.fillRect(W / 2 - rw / 2, cy + big * 0.95, rw, Math.max(2, big * 0.08));
  g.restore();
}
// The scene whose chapter card shows at time t (scenes: timeline scenes with .chapter = { n, title }).
export function chapterAt(scenes, t) {
  for (const s of scenes || []) if (s.chapter && t >= s.start && t < s.start + CHAPTER_CARD) return { ...s.chapter, local: t - s.start };
  return null;
}

// ---------- 2.2: the visual hook of the first two seconds ----------
// A white flash on frame one, a punch-in (the picture lands 18 % too big and settles with a small shake), then a red
// marker circle draws itself around the subject with an arrow swinging in to point at it, the way Shorts grab the
// eye before the first sentence ends. Drawn over the picture, under captions and the headline.
export const HOOK_END = 2.1;
export function hookFx(g, W, H, t) {
  if (!(t >= 0 && t < HOOK_END)) return;
  const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  // punch-in and shake: the frame redrawn over itself, scaled about the centre
  if (t < 0.5 && g.canvas) {
    const k = ease(t / 0.5), s = 1.18 - 0.18 * k, sh = t > 0.08 && t < 0.42 ? Math.sin(t * 90) * W * 0.008 * (1 - k) : 0;
    try { g.save(); g.drawImage(g.canvas, 0, 0, W, H, (W - W * s) / 2 + sh, (H - H * s) / 2 + sh * 0.6, W * s, H * s); g.restore(); } catch { g.restore(); }
  }
  if (t < 0.22) { g.save(); g.globalAlpha = 0.85 * (1 - t / 0.22); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  // the marker circle around the subject, then the arrow
  const cx = W / 2, cy = H * 0.5, rx = Math.min(W, H) * 0.3, ry = rx * 1.15, draw = ease((t - 0.35) / 0.55), out = t > 1.75 ? 1 - (t - 1.75) / 0.35 : 1;
  if (draw <= 0 || out <= 0) return;
  g.save(); g.globalAlpha = out; g.lineCap = 'round'; g.lineJoin = 'round';
  const lw = Math.max(6, W * 0.012), a0 = -Math.PI * 0.6, a1 = a0 + Math.PI * 2.08 * draw;
  for (const [col, w] of [['rgba(0,0,0,0.45)', lw * 1.9], ['#ff2d2d', lw]]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    for (let a = a0; a <= a1; a += 0.05) { const wob = 1 + 0.035 * Math.sin(a * 3 + 1); const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob; if (a === a0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  const ak = ease((t - 0.7) / 0.35);
  if (ak > 0) {
    // from the upper right, pointing down and in at the circle
    const tipX = cx + rx * 0.78, tipY = cy - ry * 0.72, len = Math.min(W, H) * 0.22 * ak, ang = Math.PI * 0.75 + Math.sin(t * 9) * 0.04;
    const bx = tipX - Math.cos(ang) * len, by = tipY - Math.sin(ang) * len, hx = Math.cos(ang), hy = Math.sin(ang), hs = lw * 3.2;
    for (const [col, w] of [['rgba(0,0,0,0.45)', lw * 1.9], ['#ff2d2d', lw * 1.1]]) {
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(tipX - hx * hs * 0.5, tipY - hy * hs * 0.5); g.stroke();
      g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX - hx * hs - hy * hs * 0.7, tipY - hy * hs + hx * hs * 0.7); g.lineTo(tipX - hx * hs + hy * hs * 0.7, tipY - hy * hs - hx * hs * 0.7); g.closePath(); g.fill();
    }
  }
  g.restore();
}
