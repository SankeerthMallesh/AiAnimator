// Animated cartoon props, drawn in code in the same thick-outline style as the host.
// Each one pops in beside the host and keeps moving: the globe spins, the ship sails, the clock ticks.

export const PROPS = ['none', 'earth', 'moon', 'sun', 'eclipse', 'ship', 'stick', 'train', 'car', 'rocket', 'bulb', 'question',
  'exclaim', 'money', 'clock', 'book', 'magnet', 'thermometer', 'heart', 'gear', 'atom', 'star', 'fire', 'drop', 'bolt'];

const INK = '#26262B';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; const x = clamp(t, 0, 1) - 1; return 1 + c3 * x * x * x + c1 * x * x; };

// All props are drawn in a box of about -1..1 units; `u` is half the prop's size in pixels.
export function drawProp(ctx, name, cx, cy, size, t) {
  if (!name || name === 'none') return;
  const pop = easeOutBack((t - 0.25) / 0.35);
  if (pop <= 0) return;
  const u = size / 2;
  const float = Math.sin(t * 2.1) * 0.06;
  ctx.save();
  ctx.translate(cx, cy + float * u);
  ctx.scale(pop, pop);
  ctx.lineWidth = 0.09 * u;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const P = (fn, fill) => { ctx.beginPath(); fn(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); };
  const circle = (x, y, r, fill) => P(() => ctx.arc(x * u, y * u, r * u, 0, TAU), fill);
  const rect = (x, y, w, h, fill, r = 0.08) => P(() => {
    const X = x * u, Y = y * u, Wd = w * u, Hh = h * u, R = r * u;
    ctx.moveTo(X + R, Y); ctx.arcTo(X + Wd, Y, X + Wd, Y + Hh, R); ctx.arcTo(X + Wd, Y + Hh, X, Y + Hh, R);
    ctx.arcTo(X, Y + Hh, X, Y, R); ctx.arcTo(X, Y, X + Wd, Y, R); ctx.closePath();
  }, fill);
  const poly = (pts, fill) => P(() => { pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u))); ctx.closePath(); }, fill);
  const line = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u))); ctx.stroke(); };
  const rays = (n, r0, r1, rot) => { for (let k = 0; k < n; k++) { const a = rot + (k / n) * TAU; line([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]]); } };

  switch (name) {
    case 'earth': {
      circle(0, 0, 0.9, '#3E8FE0');
      // Continents slide across to read as a spinning globe.
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 0.9 * u, 0, TAU); ctx.clip();
      ctx.fillStyle = '#58B368';
      const sh = (t * 0.35) % 2;
      for (const off of [-2, 0, 2]) {
        for (const [x, y, rx, ry] of [[-0.5, -0.3, 0.42, 0.3], [0.25, 0.1, 0.5, 0.36], [-0.2, 0.55, 0.3, 0.2], [0.8, -0.5, 0.3, 0.22]]) {
          ctx.beginPath(); ctx.ellipse((x + off + sh) * u, y * u, rx * u, ry * u, 0.3, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 0.9 * u, 0, TAU); ctx.stroke();
      break;
    }
    case 'moon': {
      circle(0, 0, 0.85, '#E9E6DA');
      ctx.fillStyle = '#CFCBBB';
      for (const [x, y, r] of [[-0.3, -0.25, 0.2], [0.3, 0.2, 0.26], [-0.1, 0.45, 0.13], [0.4, -0.4, 0.11]]) { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, TAU); ctx.fill(); }
      break;
    }
    case 'sun': {
      ctx.strokeStyle = '#F2A20C'; rays(12, 0.75, 1.0, t * 0.6); ctx.strokeStyle = INK;
      circle(0, 0, 0.62, '#FFD23F');
      break;
    }
    case 'eclipse': {
      circle(0, 0, 0.85, '#E9E6DA');
      // Earth's round shadow sweeping across the Moon.
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 0.85 * u, 0, TAU); ctx.clip();
      const sx = -1.9 + ((t * 0.45) % 3.8);
      ctx.beginPath(); ctx.arc(sx * u, 0.15 * u, 1.05 * u, 0, TAU); ctx.fillStyle = 'rgba(60,20,20,0.82)'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 0.85 * u, 0, TAU); ctx.stroke();
      break;
    }
    case 'ship': {
      // Sails toward the horizon and sinks hull-first behind the curve of the sea.
      const p = (t * 0.22) % 1;
      const sx = -0.6 + p * 1.2, sink = p * 0.55, sc = 1 - p * 0.45;
      ctx.save();
      ctx.beginPath(); ctx.rect(-1.2 * u, -1.2 * u, 2.4 * u, 1.55 * u); ctx.clip();
      ctx.translate(sx * u, (0.1 + sink) * u); ctx.scale(sc, sc);
      line([[0, 0], [0, -0.95]]);
      poly([[0.05, -0.9], [0.6, -0.2], [0.05, -0.2]], '#FFFFFF');
      poly([[-0.05, -0.75], [-0.45, -0.2], [-0.05, -0.2]], '#F4E3C1');
      poly([[-0.7, -0.1], [0.75, -0.1], [0.5, 0.3], [-0.5, 0.3]], '#A8693D');
      ctx.restore();
      // Curved sea in front.
      P(() => { ctx.moveTo(-1.15 * u, 0.9 * u); ctx.lineTo(-1.15 * u, 0.45 * u); ctx.quadraticCurveTo(0, 0.12 * u, 1.15 * u, 0.45 * u); ctx.lineTo(1.15 * u, 0.9 * u); ctx.closePath(); }, '#3E8FE0');
      break;
    }
    case 'stick': {
      // A stick in the ground whose shadow swings and changes length with the Sun.
      const a = Math.sin(t * 0.8) * 0.9;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.14 * u; line([[0, 0.6], [a * 0.9, 0.72]]); ctx.strokeStyle = INK; ctx.lineWidth = 0.09 * u;
      rect(-1.0, 0.6, 2.0, 0.28, '#D9B36C');
      rect(-0.07, -0.6, 0.14, 1.22, '#A8693D', 0.03);
      ctx.save(); ctx.translate(-a * 0.75 * u, -0.85 * u); ctx.strokeStyle = '#F2A20C'; rays(8, 0.2, 0.3, t); ctx.strokeStyle = INK; circle(0, 0, 0.16, '#FFD23F'); ctx.restore();
      break;
    }
    case 'train': {
      const chug = Math.sin(t * 14) * 0.015;
      ctx.save(); ctx.translate(0, chug * u);
      rect(-0.95, -0.35, 1.2, 0.7, '#D64545');
      rect(0.25, -0.65, 0.65, 1.0, '#B83232');
      rect(0.38, -0.5, 0.36, 0.3, '#BFE3FF');
      rect(-0.75, -0.7, 0.22, 0.38, '#3A3A42', 0.04);
      for (let k = 0; k < 3; k++) { const pt = (t * 0.9 + k * 0.33) % 1; ctx.globalAlpha = 1 - pt; circle(-0.64 - pt * 0.3, -0.85 - pt * 0.6, 0.1 + pt * 0.14, '#E8E8EE'); ctx.globalAlpha = 1; }
      ctx.restore();
      for (const x of [-0.65, -0.15, 0.55]) { circle(x, 0.45, 0.2, '#3A3A42'); line([[x, 0.45], [x + Math.cos(t * 8) * 0.18, 0.45 + Math.sin(t * 8) * 0.18]]); }
      line([[-1.1, 0.68], [1.1, 0.68]]);
      break;
    }
    case 'car': {
      const b = Math.sin(t * 12) * 0.012;
      ctx.save(); ctx.translate(0, b * u);
      poly([[-0.55, -0.2], [-0.35, -0.6], [0.4, -0.6], [0.6, -0.2]], '#BFE3FF');
      rect(-0.95, -0.2, 1.9, 0.5, '#E34B4B', 0.14);
      circle(0.82, 0.02, 0.07, '#FFD23F');
      ctx.restore();
      for (const x of [-0.55, 0.55]) { circle(x, 0.36, 0.24, '#3A3A42'); line([[x, 0.36], [x + Math.cos(t * 9) * 0.2, 0.36 + Math.sin(t * 9) * 0.2]]); }
      break;
    }
    case 'rocket': {
      const rise = Math.sin(t * 1.4) * 0.08;
      ctx.save(); ctx.translate(0, rise * u); ctx.rotate(0.3);
      const f = 0.3 + Math.abs(Math.sin(t * 22)) * 0.25;
      poly([[-0.18, 0.55], [0, 0.55 + f + 0.25], [0.18, 0.55]], '#FF9A3C');
      poly([[-0.3, 0.3], [-0.6, 0.65], [-0.3, 0.55]], '#D64545'); poly([[0.3, 0.3], [0.6, 0.65], [0.3, 0.55]], '#D64545');
      P(() => { ctx.moveTo(0, -0.95 * u); ctx.quadraticCurveTo(0.42 * u, -0.45 * u, 0.3 * u, 0.55 * u); ctx.lineTo(-0.3 * u, 0.55 * u); ctx.quadraticCurveTo(-0.42 * u, -0.45 * u, 0, -0.95 * u); ctx.closePath(); }, '#F2F2F5');
      circle(0, -0.2, 0.16, '#3E8FE0');
      ctx.restore();
      break;
    }
    case 'bulb': {
      const on = Math.sin(t * 5) > -0.2;
      if (on) { ctx.strokeStyle = '#F2A20C'; rays(9, 0.72, 0.95, -Math.PI * 1.05 + 0); ctx.strokeStyle = INK; }
      circle(0, -0.2, 0.55, on ? '#FFE066' : '#F2F2F5');
      rect(-0.24, 0.3, 0.48, 0.42, '#9AA0A8', 0.06);
      line([[-0.24, 0.45], [0.24, 0.45]]); line([[-0.24, 0.58], [0.24, 0.58]]);
      break;
    }
    case 'question': case 'exclaim': {
      ctx.rotate(Math.sin(t * 4) * 0.14);
      ctx.font = `900 ${1.9 * u}px "Montserrat", "Arial Black", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 0.24 * u;
      const ch = name === 'question' ? '?' : '!';
      ctx.strokeText(ch, 0, 0); ctx.fillStyle = name === 'question' ? '#FFD23F' : '#FF5A4D'; ctx.fillText(ch, 0, 0);
      break;
    }
    case 'money': {
      for (let k = 2; k >= 0; k--) {
        const hop = Math.abs(Math.sin(t * 4 + k * 0.9)) * 0.12;
        ctx.save(); ctx.translate((k - 1) * 0.5 * u, (0.15 - hop + k * 0.08) * u);
        circle(0, 0, 0.42, '#FFD23F'); circle(0, 0, 0.28, '#F2B705');
        ctx.font = `900 ${0.42 * u}px "Montserrat", "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('$', 0, 0.02 * u);
        ctx.restore();
      }
      break;
    }
    case 'clock': {
      circle(0, 0, 0.85, '#FFFFFF');
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; line([[Math.cos(a) * 0.68, Math.sin(a) * 0.68], [Math.cos(a) * 0.76, Math.sin(a) * 0.76]]); }
      const m = t * 2.2 - Math.PI / 2, h = t * 0.35 - Math.PI / 2;
      ctx.lineWidth = 0.11 * u; line([[0, 0], [Math.cos(h) * 0.4, Math.sin(h) * 0.4]]);
      ctx.lineWidth = 0.08 * u; line([[0, 0], [Math.cos(m) * 0.62, Math.sin(m) * 0.62]]);
      circle(0, 0, 0.07, INK);
      break;
    }
    case 'book': {
      const flap = Math.sin(t * 2.5) * 0.12;
      poly([[0, -0.45], [-0.95, -0.6 - flap], [-0.95, 0.5 - flap], [0, 0.65]], '#FFFDF5');
      poly([[0, -0.45], [0.95, -0.6 + flap], [0.95, 0.5 + flap], [0, 0.65]], '#FFFDF5');
      for (const y of [-0.25, 0, 0.25]) { line([[-0.78, y - 0.12], [-0.15, y]]); line([[0.15, y], [0.78, y - 0.12]]); }
      break;
    }
    case 'magnet': {
      ctx.rotate(Math.sin(t * 3) * 0.12);
      ctx.lineWidth = 0.42 * u; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, -0.05 * u, 0.5 * u, Math.PI, 0); ctx.lineTo(0.5 * u, 0.6 * u); ctx.moveTo(-0.5 * u, -0.05 * u); ctx.lineTo(-0.5 * u, 0.6 * u); ctx.stroke();
      ctx.lineWidth = 0.26 * u; ctx.strokeStyle = '#E34B4B'; ctx.beginPath(); ctx.arc(0, -0.05 * u, 0.5 * u, Math.PI, 0); ctx.lineTo(0.5 * u, 0.35 * u); ctx.moveTo(-0.5 * u, -0.05 * u); ctx.lineTo(-0.5 * u, 0.35 * u); ctx.stroke();
      ctx.strokeStyle = '#E8E8EE'; ctx.beginPath(); ctx.moveTo(0.5 * u, 0.38 * u); ctx.lineTo(0.5 * u, 0.58 * u); ctx.moveTo(-0.5 * u, 0.38 * u); ctx.lineTo(-0.5 * u, 0.58 * u); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.07 * u;
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const pt = (t * 1.5 + k * 0.5) % 1; ctx.globalAlpha = 1 - pt; line([[s * 0.5, 0.75 + pt * 0.2], [s * (0.5 - 0.12), 0.9 + pt * 0.2]]); ctx.globalAlpha = 1; }
      break;
    }
    case 'thermometer': {
      const lvl = 0.5 + 0.5 * Math.sin(t * 1.2 - 1.2);
      rect(-0.16, -0.95, 0.32, 1.45, '#FFFFFF', 0.16);
      ctx.fillStyle = '#E34B4B'; ctx.fillRect(-0.07 * u, (0.4 - lvl * 1.15) * u, 0.14 * u, (lvl * 1.15 + 0.15) * u);
      circle(0, 0.62, 0.32, '#E34B4B');
      for (const y of [-0.6, -0.3, 0, 0.3]) line([[0.2, y], [0.36, y]]);
      break;
    }
    case 'heart': {
      const beat = 1 + 0.12 * Math.max(Math.exp(-((t % 0.9) / 0.9) * 9), 0.7 * Math.exp(-Math.abs((t % 0.9) / 0.9 - 0.28) * 14));
      ctx.scale(beat, beat);
      P(() => { ctx.moveTo(0, 0.75 * u); ctx.bezierCurveTo(-1.25 * u, -0.1 * u, -0.6 * u, -1.0 * u, 0, -0.35 * u); ctx.bezierCurveTo(0.6 * u, -1.0 * u, 1.25 * u, -0.1 * u, 0, 0.75 * u); ctx.closePath(); }, '#E8455A');
      break;
    }
    case 'gear': {
      ctx.rotate(t * 1.2);
      P(() => { for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, r = k % 2 ? 0.62 : 0.88; const a2 = a + TAU / 32; ctx.lineTo(Math.cos(a) * r * u, Math.sin(a) * r * u); ctx.lineTo(Math.cos(a2) * r * u, Math.sin(a2) * r * u); } ctx.closePath(); }, '#9AA0A8');
      circle(0, 0, 0.26, '#F2F2F5');
      break;
    }
    case 'atom': {
      for (let k = 0; k < 3; k++) {
        ctx.save(); ctx.rotate((k / 3) * Math.PI);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.92 * u, 0.34 * u, 0, 0, TAU); ctx.stroke();
        const a = t * 3 + k * 2.1;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 0.92 * u, Math.sin(a) * 0.34 * u, 0.1 * u, 0, TAU); ctx.fillStyle = '#3E8FE0'; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      circle(0, 0, 0.2, '#E34B4B');
      break;
    }
    case 'star': {
      ctx.rotate(Math.sin(t * 2) * 0.2); const s = 1 + Math.sin(t * 6) * 0.06; ctx.scale(s, s);
      P(() => { for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, r = k % 2 ? 0.4 : 0.92; ctx.lineTo(Math.cos(a) * r * u, Math.sin(a) * r * u); } ctx.closePath(); }, '#FFD23F');
      break;
    }
    case 'fire': {
      const w = Math.sin(t * 9) * 0.1, h = 0.1 * Math.abs(Math.sin(t * 13));
      P(() => { ctx.moveTo(0, (-0.95 - h) * u); ctx.bezierCurveTo((0.7 + w) * u, -0.3 * u, 0.75 * u, 0.5 * u, 0, 0.8 * u); ctx.bezierCurveTo(-0.75 * u, 0.5 * u, (-0.6 + w) * u, -0.2 * u, 0, (-0.95 - h) * u); ctx.closePath(); }, '#FF7A2E');
      P(() => { ctx.moveTo(0, (-0.35 - h) * u); ctx.bezierCurveTo(0.38 * u, 0.1 * u, 0.4 * u, 0.55 * u, 0, 0.7 * u); ctx.bezierCurveTo(-0.4 * u, 0.55 * u, -0.3 * u, 0.1 * u, 0, (-0.35 - h) * u); ctx.closePath(); }, '#FFD23F');
      break;
    }
    case 'drop': {
      for (let k = 0; k < 3; k++) {
        const pt = (t * 0.8 + k / 3) % 1;
        ctx.save(); ctx.translate((k - 1) * 0.55 * u, (-0.9 + pt * 1.6) * u); ctx.globalAlpha = pt > 0.85 ? (1 - pt) / 0.15 : 1;
        P(() => { ctx.moveTo(0, -0.34 * u); ctx.bezierCurveTo(0.3 * u, 0.02 * u, 0.24 * u, 0.3 * u, 0, 0.3 * u); ctx.bezierCurveTo(-0.24 * u, 0.3 * u, -0.3 * u, 0.02 * u, 0, -0.34 * u); ctx.closePath(); }, '#5BB8F5');
        ctx.restore();
      }
      break;
    }
    case 'bolt': {
      const fl = Math.sin(t * 16) > 0 ? 1 : 0.92; ctx.scale(fl, fl);
      poly([[0.15, -0.95], [-0.5, 0.1], [-0.05, 0.1], [-0.25, 0.95], [0.55, -0.2], [0.1, -0.2]], '#FFD23F');
      break;
    }
    default:
  }
  ctx.restore();
}

// ---------- Emoji stickers ----------
// Any topic gets a picture of its key thing (a bee, a pizza, a volcano) as a sticker in the
// cartoon's own style: a thick ink outline around a white border, popping in and bobbing.
const stickerCache = new Map();
function stickerImage(emoji, px) {
  const key = `${emoji}|${px}`;
  if (stickerCache.has(key)) return stickerCache.get(key);
  const pad = Math.ceil(px * 0.22);
  const S = px + pad * 2;
  const glyph = document.createElement('canvas');
  glyph.width = glyph.height = S;
  const g = glyph.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(emoji, S / 2, S / 2 + px * 0.06);
  // Silhouette grown outward in a ring: ink first, then white, then the emoji on top.
  const ring = (radius, color) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU;
      x.drawImage(glyph, Math.cos(a) * radius, Math.sin(a) * radius);
    }
    x.drawImage(glyph, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, S, S);
    return c;
  };
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const o = out.getContext('2d');
  o.drawImage(ring(px * 0.13, INK), 0, 0);
  o.drawImage(ring(px * 0.085, '#FFFFFF'), 0, 0);
  o.drawImage(glyph, 0, 0);
  // An emoji the device cannot draw comes out empty; report that so the caller can skip it.
  const probe = g.getImageData(S / 2 - px / 4, S / 2 - px / 4, px / 2, px / 2).data;
  let ink = 0;
  for (let i = 3; i < probe.length; i += 16) if (probe[i] > 0) ink++;
  const result = ink > 3 ? out : null;
  if (stickerCache.size > 60) stickerCache.clear();
  stickerCache.set(key, result);
  return result;
}

export function drawSticker(ctx, emoji, cx, cy, size, t) {
  const pop = easeOutBack((t - 0.2) / 0.4);
  if (pop <= 0 || !emoji) return;
  const px = Math.max(24, Math.round(size * 0.78 / 8) * 8);
  const img = stickerImage(emoji, px);
  if (!img) return;
  const bob = Math.sin(t * 2.3) * size * 0.04;
  const tilt = Math.sin(t * 1.4) * 0.07;
  const sq = 1 + Math.sin(t * 4.6) * 0.015;
  ctx.save();
  // Soft shadow under the sticker.
  ctx.globalAlpha = 0.18 * Math.min(1, pop);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.62, size * 0.32, size * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.translate(cx, cy + bob);
  ctx.rotate(tilt);
  ctx.scale(pop * sq, pop / sq);
  const d = size * (img.width / px) * 0.78;
  // 1.6: the icon sits on a white glass disc with a red ring, so it reads on any picture.
  const R = size * 0.56;
  ctx.save();
  ctx.shadowColor = 'rgba(10,10,20,0.35)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.05;
  const face = ctx.createLinearGradient(0, -R, 0, R);
  face.addColorStop(0, 'rgba(255,255,255,0.97)'); face.addColorStop(1, 'rgba(238,240,246,0.93)');
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.lineWidth = size * 0.055; ctx.strokeStyle = '#FF2D47'; ctx.beginPath(); ctx.arc(0, 0, R - ctx.lineWidth / 2, 0, TAU); ctx.stroke();
  // The glass rim: a bright arc along the top.
  ctx.lineWidth = size * 0.02; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(0, 0, R * 0.82, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  const e = d * 0.86;
  ctx.drawImage(img, -e / 2, -e / 2, e, e);
  ctx.restore();
}
