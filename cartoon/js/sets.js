// Cartoon sets drawn and animated in code: no image service, no waiting.
// Bright flat colours with dark outlines, and something always moving (clouds, waves, stars, traffic).

export const SETS = ['field', 'sea', 'desert', 'city', 'space', 'night', 'mountains', 'room', 'lab', 'road', 'snow', 'forest', 'temple', 'underwater'];

const INK = '#26262B';
const TAU = Math.PI * 2;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Guess a set from the scene's words when the writer didn't choose one.
export function guessSet(text) {
  const t = String(text || '').toLowerCase();
  const has = (...w) => w.some(x => t.includes(x));
  if (has('space', 'planet', 'orbit', 'galaxy', 'astronaut', 'rocket', 'black hole', 'satellite')) return 'space';
  if (has('eclipse', 'moon', 'night', 'star')) return 'night';
  if (has('underwater', 'ocean floor', 'fish', 'dive', 'submarine', 'octopus')) return 'underwater';
  if (has('sea', 'ship', 'ocean', 'harbor', 'harbour', 'boat', 'horizon', 'beach', 'coast')) return 'sea';
  if (has('greek', 'greece', 'roman', 'rome', 'temple', 'athens', 'alexandria', 'ancient', 'philosopher')) return 'temple';
  if (has('desert', 'egypt', 'syene', 'sand', 'pyramid', 'camel')) return 'desert';
  if (has('city', 'street', 'building', 'skyscraper', 'shop', 'store', 'bank', 'office')) return 'city';
  if (has('lab', 'experiment', 'chemical', 'scientist', 'microscope', 'atom', 'cell')) return 'lab';
  if (has('road', 'car', 'truck', 'highway', 'drive', 'train', 'rail')) return 'road';
  if (has('snow', 'ice', 'arctic', 'winter', 'frozen')) return 'snow';
  if (has('forest', 'tree', 'jungle', 'wood')) return 'forest';
  if (has('mountain', 'volcano', 'hill', 'cliff')) return 'mountains';
  if (has('room', 'house', 'home', 'kitchen', 'school', 'class', 'inside', 'body', 'brain', 'heart', 'lung', 'stomach')) return 'room';
  return 'field';
}

export function drawSet(ctx, W, H, kind, t, seed = 1) {
  const r = rng(seed * 7919 + 13);
  const lw = Math.max(3, W * 0.0065);
  const horizon = H * 0.6;
  ctx.save();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sky = (top, bottom) => { const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const ground = (fill, y = horizon, bump = 0.02) => {
    ctx.beginPath(); ctx.moveTo(-10, y);
    ctx.bezierCurveTo(W * 0.3, y - H * bump, W * 0.7, y + H * bump, W + 10, y - H * bump * 0.5);
    ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  };
  const cloud = (x, y, s) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.9, s * 0.34, 0, 0, TAU); ctx.ellipse(x - s * 0.45, y + s * 0.08, s * 0.5, s * 0.26, 0, 0, TAU); ctx.ellipse(x + s * 0.5, y + s * 0.06, s * 0.55, s * 0.28, 0, 0, TAU);
    ctx.fill();
  };
  const clouds = (n = 4, speed = 0.012) => { for (let k = 0; k < n; k++) { const bx = r(), by = 0.06 + r() * 0.3, s = W * (0.1 + r() * 0.1); const x = ((bx + t * speed * (0.6 + r())) % 1.3) * W - W * 0.15; cloud(x, by * H, s); } };
  const sun = (x, y, rad, col = '#FFD23F') => {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#F2A20C';
    for (let k = 0; k < 12; k++) { const a = t * 0.3 + (k / 12) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * rad * 1.25, Math.sin(a) * rad * 1.25); ctx.lineTo(Math.cos(a) * rad * 1.6, Math.sin(a) * rad * 1.6); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.restore();
  };
  const stars = (n = 60) => { ctx.fillStyle = '#FFFFFF'; for (let k = 0; k < n; k++) { const x = r() * W, y = r() * horizon * 1.05, s = (0.6 + r() * 1.6) * lw * 0.45, tw = 0.5 + 0.5 * Math.sin(t * (1.5 + r() * 3) + r() * 6); ctx.globalAlpha = 0.35 + 0.65 * tw; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; };
  const hill = (x, y, w, h, fill) => { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - h * 2, x + w, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const peak = (x, y, w, h, fill, snow) => {
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
    if (snow) { ctx.beginPath(); ctx.moveTo(x - w * 0.28, y - h * 0.72); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.28, y - h * 0.72); ctx.lineTo(x + w * 0.1, y - h * 0.62); ctx.lineTo(x, y - h * 0.72); ctx.lineTo(x - w * 0.12, y - h * 0.6); ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.stroke(); }
  };
  const tree = (x, y, s, fill = '#3FA35B') => {
    ctx.fillStyle = '#8A5A33'; ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5); ctx.strokeRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
    const sway = Math.sin(t * 1.2 + x) * s * 0.03;
    ctx.beginPath(); ctx.arc(x + sway, y - s * 0.78, s * 0.42, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  };
  const building = (x, w, h, fill) => {
    ctx.fillStyle = fill; ctx.fillRect(x, horizon - h, w, h + 4); ctx.strokeRect(x, horizon - h, w, h + 4);
    ctx.fillStyle = '#FFE9A8';
    const cols = Math.max(2, Math.round(w / (W * 0.045))), rows = Math.max(2, Math.round(h / (H * 0.04)));
    for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) { if (r() < 0.25) continue; const ww = w / cols * 0.5, hh = h / rows * 0.5; ctx.fillRect(x + (cx + 0.25) * w / cols, horizon - h + (ry + 0.25) * h / rows, ww, hh); }
  };
  const waves = (y0, col) => { ctx.strokeStyle = col; for (let k = 0; k < 5; k++) { const y = y0 + k * H * 0.07; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 20) { const yy = y + Math.sin(x * 0.02 + t * 1.6 + k) * H * 0.006; if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); } ctx.strokeStyle = INK; };

  switch (kind) {
    case 'sea': {
      sky('#6EC6F5', '#CFEFFF'); sun(W * 0.78, H * 0.16, W * 0.07); clouds(3);
      ctx.fillStyle = '#2F8FD8'; ctx.fillRect(0, horizon - H * 0.08, W, H); ctx.beginPath(); ctx.moveTo(0, horizon - H * 0.08); ctx.lineTo(W, horizon - H * 0.08); ctx.stroke();
      waves(horizon - H * 0.03, 'rgba(255,255,255,0.55)');
      ground('#F2D68A', H * 0.74, 0.015);
      break;
    }
    case 'desert': {
      sky('#FFB86B', '#FFE7B8'); sun(W * 0.22, H * 0.15, W * 0.085, '#FFDF6B');
      hill(W * 0.25, horizon + 4, W * 0.5, H * 0.07, '#E9B565'); hill(W * 0.8, horizon + 4, W * 0.45, H * 0.05, '#DFA650');
      ground('#F2C97A');
      for (let k = 0; k < 3; k++) { const x = (0.15 + r() * 0.7) * W, y = horizon + H * (0.03 + r() * 0.06), s = H * 0.05; ctx.fillStyle = '#4FA35B'; ctx.beginPath(); ctx.roundRect(x - s * 0.18, y - s, s * 0.36, s, s * 0.18); ctx.fill(); ctx.stroke(); }
      break;
    }
    case 'city': {
      sky('#7CC8F2', '#D9F1FF'); clouds(3);
      const cols = ['#F28B6B', '#7FB6E6', '#F2C14E', '#9AD08B', '#C59AE0', '#F2A7B8'];
      let x = -W * 0.02; let k = 0;
      while (x < W) { const w = W * (0.13 + r() * 0.1), h = H * (0.16 + r() * 0.26); building(x, w, h, cols[k++ % cols.length]); x += w; }
      ground('#8D949E', horizon, 0.004);
      ctx.strokeStyle = '#FFFFFF'; ctx.setLineDash([W * 0.05, W * 0.05]); ctx.lineDashOffset = -t * W * 0.12; ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W, H * 0.8); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = INK;
      break;
    }
    case 'space': {
      ctx.fillStyle = '#141433'; ctx.fillRect(0, 0, W, H); stars(110);
      ctx.beginPath(); ctx.arc(W * 0.78, H * 0.2, W * 0.1, 0, TAU); ctx.fillStyle = '#E88B5A'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.2, W * 0.17, W * 0.035, -0.3, 0, TAU); ctx.strokeStyle = '#F2D08A'; ctx.stroke(); ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(W * 0.5, H * 1.25, W * 1.05, 0, TAU); ctx.fillStyle = '#8E8FA8'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A7B93'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(r() * W, H * (0.72 + r() * 0.25), W * (0.03 + r() * 0.04), W * 0.014, 0, 0, TAU); ctx.fill(); }
      break;
    }
    case 'night': {
      sky('#1B1E4B', '#4A3F7A'); stars(70);
      ctx.beginPath(); ctx.arc(W * 0.24, H * 0.17, W * 0.085, 0, TAU); ctx.fillStyle = '#F4F0D8'; ctx.fill(); ctx.stroke();
      hill(W * 0.3, horizon + 4, W * 0.55, H * 0.06, '#2F5D50'); hill(W * 0.85, horizon + 4, W * 0.5, H * 0.045, '#285045');
      ground('#356B5A');
      break;
    }
    case 'mountains': {
      sky('#7CC8F2', '#E3F5FF'); sun(W * 0.8, H * 0.14, W * 0.065); clouds(3);
      peak(W * 0.22, horizon + 4, W * 0.34, H * 0.3, '#8A93A8', true); peak(W * 0.62, horizon + 4, W * 0.42, H * 0.38, '#7B8499', true); peak(W * 0.95, horizon + 4, W * 0.3, H * 0.24, '#959DB0', true);
      ground('#6CC070');
      break;
    }
    case 'room': case 'lab': {
      const lab = kind === 'lab';
      ctx.fillStyle = lab ? '#DDEEF2' : '#FCE8C8'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = lab ? '#B9D3DA' : '#C98B5B'; ctx.fillRect(0, H * 0.66, W, H); ctx.beginPath(); ctx.moveTo(0, H * 0.66); ctx.lineTo(W, H * 0.66); ctx.stroke();
      // Window with drifting clouds.
      const wx = W * 0.58, wy = H * 0.12, ww = W * 0.3, wh = H * 0.17;
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); ctx.fillStyle = '#8FD3F7'; ctx.fillRect(wx, wy, ww, wh); cloud(wx + ((t * 0.03) % 1.4) * ww - ww * 0.2, wy + wh * 0.4, ww * 0.3); ctx.restore();
      ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
      if (lab) {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(W * 0.06, H * 0.5, W * 0.42, H * 0.16); ctx.strokeRect(W * 0.06, H * 0.5, W * 0.42, H * 0.16);
        const cols = ['#5BD08A', '#F2788F', '#6EB7F5'];
        for (let k = 0; k < 3; k++) { const x = W * (0.13 + k * 0.12), y = H * 0.5, s = H * 0.06; ctx.beginPath(); ctx.moveTo(x - s * 0.12, y - s); ctx.lineTo(x - s * 0.12, y - s * 0.55); ctx.lineTo(x - s * 0.4, y); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x + s * 0.12, y - s * 0.55); ctx.lineTo(x + s * 0.12, y - s); ctx.closePath(); ctx.fillStyle = cols[k]; ctx.fill(); ctx.stroke();
          const bp = (t * 0.7 + k * 0.37) % 1; ctx.globalAlpha = 1 - bp; ctx.beginPath(); ctx.arc(x, y - s * (1.05 + bp * 0.9), s * 0.09, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      } else {
        ctx.fillStyle = '#8A5A33'; ctx.fillRect(W * 0.08, H * 0.2, W * 0.3, H * 0.012); ctx.strokeRect(W * 0.08, H * 0.2, W * 0.3, H * 0.012);
        const cols = ['#E34B4B', '#3E8FE0', '#F2C14E', '#58B368', '#C59AE0'];
        for (let k = 0; k < 5; k++) { const bw = W * 0.04, bh = H * (0.05 + r() * 0.03); ctx.fillStyle = cols[k]; ctx.fillRect(W * 0.1 + k * bw * 1.15, H * 0.2 - bh, bw, bh); ctx.strokeRect(W * 0.1 + k * bw * 1.15, H * 0.2 - bh, bw, bh); }
      }
      break;
    }
    case 'road': {
      sky('#7CC8F2', '#DDF3FF'); sun(W * 0.2, H * 0.14, W * 0.065); clouds(3, 0.02);
      hill(W * 0.2, horizon + 4, W * 0.5, H * 0.05, '#7CC47A'); hill(W * 0.8, horizon + 4, W * 0.5, H * 0.06, '#6CBB6C');
      ground('#6CC070');
      ctx.fillStyle = '#555B66'; ctx.fillRect(0, H * 0.7, W, H * 0.16); ctx.strokeRect(-10, H * 0.7, W + 20, H * 0.16);
      ctx.strokeStyle = '#FFE066'; ctx.setLineDash([W * 0.07, W * 0.06]); ctx.lineDashOffset = t * W * 0.5; ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.lineTo(W, H * 0.78); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = INK;
      for (let k = 0; k < 4; k++) { const x = (((k / 4) - t * 0.12) % 1 + 1) % 1 * W * 1.2 - W * 0.1; tree(x, horizon + H * 0.03, H * 0.1); }
      break;
    }
    case 'snow': {
      sky('#A9D8F5', '#EAF6FF');
      peak(W * 0.3, horizon + 4, W * 0.4, H * 0.3, '#B8C6DA', true); peak(W * 0.8, horizon + 4, W * 0.36, H * 0.25, '#C6D2E3', true);
      ground('#FFFFFF');
      ctx.fillStyle = '#FFFFFF'; for (let k = 0; k < 70; k++) { const x = ((r() + Math.sin(t * 0.6 + k) * 0.01) % 1) * W, y = ((r() + t * (0.05 + r() * 0.06)) % 1) * H; ctx.beginPath(); ctx.arc(x, y, lw * (0.5 + r()), 0, TAU); ctx.fill(); }
      break;
    }
    case 'forest': {
      sky('#8FD3F7', '#E3F7E0'); clouds(2);
      for (let k = 0; k < 7; k++) tree(W * (k / 6), horizon + H * 0.01, H * (0.2 + r() * 0.08), '#2F8A4E');
      ground('#5DB868');
      for (let k = 0; k < 5; k++) tree(W * (0.08 + k * 0.21 + r() * 0.05), horizon + H * 0.06, H * (0.14 + r() * 0.05));
      break;
    }
    case 'temple': {
      sky('#7CC8F2', '#FFEFD0'); sun(W * 0.82, H * 0.13, W * 0.06); clouds(3);
      hill(W * 0.5, horizon + 4, W * 0.9, H * 0.05, '#C9D98A');
      // A small Greek temple on the hill.
      const tx = W * 0.2, tw = W * 0.6, ty = horizon - H * 0.02, th = H * 0.2;
      ctx.fillStyle = '#F4EEDC';
      ctx.fillRect(tx, ty - H * 0.012, tw, H * 0.022); ctx.strokeRect(tx, ty - H * 0.012, tw, H * 0.022);
      for (let k = 0; k < 6; k++) { const cx = tx + tw * (0.06 + k * 0.176), cw = tw * 0.07; ctx.fillRect(cx - cw / 2, ty - th, cw, th - H * 0.012); ctx.strokeRect(cx - cw / 2, ty - th, cw, th - H * 0.012); }
      ctx.fillRect(tx, ty - th - H * 0.02, tw, H * 0.022); ctx.strokeRect(tx, ty - th - H * 0.02, tw, H * 0.022);
      ctx.beginPath(); ctx.moveTo(tx - W * 0.02, ty - th - H * 0.02); ctx.lineTo(tx + tw / 2, ty - th - H * 0.1); ctx.lineTo(tx + tw + W * 0.02, ty - th - H * 0.02); ctx.closePath(); ctx.fillStyle = '#EADFC2'; ctx.fill(); ctx.stroke();
      ground('#D9C98F');
      break;
    }
    case 'underwater': {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3FB6E8'); g.addColorStop(1, '#0E4C8A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      for (let k = 0; k < 26; k++) { const x = (r() + Math.sin(t * 1.1 + k) * 0.012) * W, y = (((r() - t * (0.05 + r() * 0.07)) % 1) + 1) % 1 * H, s = lw * (1 + r() * 2.5); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = INK;
      ground('#E8D08A', H * 0.74, 0.02);
      for (let k = 0; k < 6; k++) { const x = W * (0.06 + k * 0.17 + r() * 0.05), y = H * 0.76, hgt = H * (0.08 + r() * 0.08); ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + Math.sin(t * 1.5 + k) * W * 0.04, y - hgt * 0.5, x - Math.sin(t * 1.5 + k) * W * 0.04, y - hgt * 0.8, x + Math.sin(t * 1.5 + k) * W * 0.02, y - hgt); ctx.strokeStyle = '#2F8A4E'; ctx.lineWidth = lw * 2; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = INK; }
      break;
    }
    default: { // field
      sky('#7CC8F2', '#DDF3FF'); sun(W * 0.8, H * 0.14, W * 0.07); clouds(4);
      hill(W * 0.2, horizon + 4, W * 0.5, H * 0.06, '#7CC47A'); hill(W * 0.78, horizon + 4, W * 0.55, H * 0.05, '#6CBB6C');
      ground('#6CC070');
      tree(W * 0.1, horizon + H * 0.02, H * 0.13); tree(W * 0.9, horizon + H * 0.03, H * 0.11);
    }
  }
  ctx.restore();
}
