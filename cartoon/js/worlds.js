// Painted worlds: the backgrounds Loomy draws itself when there is no AI picture (no key, the free
// allowance used up, or a picture that failed). They aim for the look of stylized 3D game worlds:
// soft gradients, light and shadow, haze that grows with distance, ground that runs off to a
// vanishing point, and real set dressing. The still part of each world is painted once and
// cached; only the moving bits (clouds, water, snow, bubbles, stars, lamps) are drawn every frame.

const TAU = Math.PI * 2;
const cache = new Map();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hex(c) {
  // Accepts #RRGGBB and rgb(r,g,b), since blended colours come back as rgb().
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  const n = parseInt(String(c).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, k) { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; }
function shade(c, k) { return k >= 0 ? mix(c, '#FFFFFF', k) : mix(c, '#000000', -k); }

// ---------- painting helpers ----------
function vGrad(g, x, y, w, h, stops) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([p, c]) => gr.addColorStop(p, c));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function glow(g, x, y, r, color, alpha = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha = alpha; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function shadow(g, x, y, rx, ry, a = 0.22) {
  g.save(); g.fillStyle = `rgba(20,25,40,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.restore();
}
// A ridge line across the frame, filled down to `bottom`, lit on top.
function ridge(g, W, y, amp, color, seed, { bottom, bumps = 5, sharp = false, light = 0.12 } = {}) {
  const r = rng(seed);
  const pts = [];
  const n = bumps * 6;
  const ph = [r() * TAU, r() * TAU, r() * TAU];
  for (let i = 0; i <= n; i++) {
    const x = -W * 0.25 + (i / n) * W * 1.5;
    const u = i / n * bumps;
    let v = Math.sin(u * 1.0 + ph[0]) * 0.55 + Math.sin(u * 2.3 + ph[1]) * 0.3 + Math.sin(u * 5.1 + ph[2]) * 0.15;
    if (sharp) v = 1 - Math.abs(Math.sin(u * 0.9 + ph[0])) * 1.6 + Math.sin(u * 3.7 + ph[1]) * 0.18;
    pts.push([x, y - amp * (0.5 + 0.5 * v)]);
  }
  const top = Math.min(...pts.map(p => p[1]));
  const gr = g.createLinearGradient(0, top, 0, bottom);
  gr.addColorStop(0, shade(color, light)); gr.addColorStop(1, shade(color, -0.08));
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(pts[0][0], bottom);
  pts.forEach(([x, yy]) => g.lineTo(x, yy));
  g.lineTo(pts[pts.length - 1][0], bottom); g.closePath(); g.fill();
  return pts;
}
function cloud(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha = a;
  const blobs = [[0, 0, 1], [-0.55, 0.12, 0.7], [0.55, 0.1, 0.75], [0.2, -0.28, 0.65], [-0.25, -0.2, 0.55]];
  for (const [dx, dy, k] of blobs) {
    const gr = g.createRadialGradient(x + dx * s - s * 0.12 * k, y + dy * s - s * 0.2 * k, 0, x + dx * s, y + dy * s, s * 0.5 * k);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.75, '#F3F7FC'); gr.addColorStop(1, '#D9E4F0');
    g.fillStyle = gr; g.beginPath(); g.arc(x + dx * s, y + dy * s, s * 0.5 * k, 0, TAU); g.fill();
  }
  g.restore();
}
function tree(g, x, y, s, leaf = '#3E9E4F', trunk = '#7A5232') {
  shadow(g, x + s * 0.15, y, s * 0.55, s * 0.12);
  g.fillStyle = trunk; g.fillRect(x - s * 0.07, y - s * 0.75, s * 0.14, s * 0.75);
  const blobs = [[0, -1.05, 0.5], [-0.3, -0.85, 0.36], [0.3, -0.82, 0.38], [0.05, -1.35, 0.34]];
  for (const [dx, dy, k] of blobs) {
    const cx = x + dx * s, cy = y + dy * s, rr = k * s;
    const gr = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    gr.addColorStop(0, shade(leaf, 0.28)); gr.addColorStop(0.7, leaf); gr.addColorStop(1, shade(leaf, -0.25));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
  }
}
function pine(g, x, y, s, color = '#2F7D4F', snow = false) {
  shadow(g, x + s * 0.1, y, s * 0.42, s * 0.1);
  g.fillStyle = '#6B4A2E'; g.fillRect(x - s * 0.05, y - s * 0.25, s * 0.1, s * 0.25);
  for (let k = 0; k < 3; k++) {
    const yy = y - s * (0.2 + k * 0.38), w = s * (0.5 - k * 0.12), h = s * 0.62;
    const gr = g.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, shade(color, 0.18)); gr.addColorStop(1, shade(color, -0.22));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - h); g.lineTo(x + w, yy); g.closePath(); g.fill();
    if (snow) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x - w * 0.45, yy - h * 0.55); g.lineTo(x, yy - h); g.lineTo(x + w * 0.45, yy - h * 0.55); g.quadraticCurveTo(x, yy - h * 0.45, x - w * 0.45, yy - h * 0.55); g.fill(); }
  }
}
function box(g, x, y, w, h, color, { side = 0, top = 0, sideColor, topColor } = {}) {
  // A lit box: front face, a darker side face going right, a lighter top face going back.
  if (side) { g.fillStyle = sideColor || shade(color, -0.25); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + side, y - top); g.lineTo(x + w + side, y + h - top); g.lineTo(x + w, y + h); g.closePath(); g.fill(); }
  if (top) { g.fillStyle = topColor || shade(color, 0.2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + side, y - top); g.lineTo(x + w + side, y - top); g.lineTo(x + w, y); g.closePath(); g.fill(); }
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, shade(color, 0.08)); gr.addColorStop(1, shade(color, -0.1));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function sunDisc(g, x, y, r, col = '#FFE27A') {
  glow(g, x, y, r * 6, 'rgba(255,240,190,0.55)');
  glow(g, x, y, r * 2.4, 'rgba(255,245,210,0.9)');
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// Ground that recedes: rows get closer together toward the horizon.
function rows(g, W, hz, bottom, n, color, width = 1) {
  g.save(); g.strokeStyle = color; g.lineWidth = width;
  for (let k = 1; k <= n; k++) { const y = hz + (bottom - hz) * Math.pow(k / n, 1.9); g.beginPath(); g.moveTo(-W * 0.3, y); g.lineTo(W * 1.3, y); g.stroke(); }
  g.restore();
}
function rays(g, W, H, vx, vy, n, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = Math.max(1, W * 0.002);
  for (let k = -n; k <= n; k++) { g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + k * W * 0.28, H * 1.3); g.stroke(); }
  g.restore();
}

// ---------- the worlds ----------
// Each painter gets (g, W, H, r) with the frame at (0,0)-(W,H); it may paint outside for overscan.
// HZ: where the horizon sits, as a share of the height (portrait frames keep it higher).
const P = {};

function skyBand(g, W, H, hz, top, bottom, sun = true, sx = 0.78, sy = 0.16) {
  vGrad(g, -W, -H, W * 3, hz + H, [[0, top], [0.55, top], [1, bottom]]);
  if (sun) sunDisc(g, W * sx, H * sy, Math.min(W, H) * 0.045);
}

P.field = P.sky = (g, W, H, r) => {
  const hz = H * 0.52;
  skyBand(g, W, H, hz, '#5FB2EC', '#CFEBFA');
  ridge(g, W, hz + H * 0.01, H * 0.09, mix('#7FBF8A', '#CFEBFA', 0.55), 11, { bottom: H * 2, bumps: 4 });
  ridge(g, W, hz + H * 0.045, H * 0.07, mix('#5FB061', '#CFEBFA', 0.25), 23, { bottom: H * 2, bumps: 5 });
  ridge(g, W, hz + H * 0.09, H * 0.05, '#55A84F', 37, { bottom: H * 2, bumps: 3 });
  vGrad(g, -W, hz + H * 0.11, W * 3, H, [[0, '#64B65A'], [1, '#3F8E3F']]);
  // A winding path into the distance.
  g.fillStyle = '#D8C08A';
  g.beginPath(); g.moveTo(W * 0.47, hz + H * 0.1); g.bezierCurveTo(W * 0.62, hz + H * 0.18, W * 0.2, hz + H * 0.28, W * 0.35, H * 1.05);
  g.lineTo(W * 0.78, H * 1.05); g.bezierCurveTo(W * 0.5, hz + H * 0.3, W * 0.72, hz + H * 0.18, W * 0.53, hz + H * 0.1); g.closePath(); g.fill();
  for (let k = 0; k < 7; k++) { const d = r(), x = r() < 0.5 ? r() * W * 0.3 : W * 0.75 + r() * W * 0.3; tree(g, x, hz + H * (0.12 + d * 0.06), H * (0.035 + d * 0.03), mix('#3E9E4F', '#9FCFB0', 0.35 - d * 0.3)); }
  tree(g, W * 0.08, hz + H * 0.36, H * 0.15); tree(g, W * 0.95, hz + H * 0.31, H * 0.12, '#4AA858');
  // Fence posts along the path.
  for (let k = 0; k < 5; k++) { const y = hz + H * (0.14 + k * k * 0.017), s = H * (0.012 + k * 0.006), x = W * (0.86 - k * 0.04); g.fillStyle = '#8A6240'; g.fillRect(x, y - s * 3, s * 0.6, s * 3); }
};

P.road = (g, W, H, r) => {
  const hz = H * 0.5;
  skyBand(g, W, H, hz, '#5AAFEA', '#D3EEFA', true, 0.2, 0.14);
  ridge(g, W, hz, H * 0.08, mix('#77B98A', '#D3EEFA', 0.5), 5, { bottom: H * 2 });
  vGrad(g, -W, hz, W * 3, H, [[0, '#71BC63'], [1, '#3F8B3B']]);
  const vx = W * 0.5;
  g.fillStyle = '#4A4F5C';
  g.beginPath(); g.moveTo(vx - W * 0.02, hz); g.lineTo(vx + W * 0.02, hz); g.lineTo(W * 1.25, H * 1.1); g.lineTo(-W * 0.25, H * 1.1); g.closePath(); g.fill();
  vGrad(g, -W, hz, W * 3, H * 0.08, [[0, 'rgba(211,238,250,0.55)'], [1, 'rgba(211,238,250,0)']]);
  g.fillStyle = '#F4F1E6';
  for (let k = 0; k < 9; k++) { const a = Math.pow(k / 9, 2), b = Math.pow((k + 0.5) / 9, 2); const ya = hz + (H * 1.1 - hz) * a, yb = hz + (H * 1.1 - hz) * b; const wa = W * 0.004 + a * W * 0.02, wb = W * 0.004 + b * W * 0.02; g.beginPath(); g.moveTo(vx - wa, ya); g.lineTo(vx + wa, ya); g.lineTo(vx + wb, yb); g.lineTo(vx - wb, yb); g.closePath(); g.fill(); }
  for (const side of [-1, 1]) for (let k = 1; k < 7; k++) { const d = Math.pow(k / 7, 2), y = hz + (H - hz) * d, x = vx + side * (W * 0.05 + d * W * 0.75), s = H * (0.02 + d * 0.12); g.fillStyle = '#E5E1D6'; g.fillRect(x - s * 0.03, y - s, s * 0.06, s); g.fillStyle = '#D9443B'; g.fillRect(x - s * 0.03, y - s, s * 0.06, s * 0.12); }
  tree(g, W * 0.06, hz + H * 0.13, H * 0.09); tree(g, W * 0.93, hz + H * 0.1, H * 0.07, '#4AA858');
};

P.rails = (g, W, H, r) => {
  // Like the train-canyon Shorts: warm sky, red rock walls in strata, tracks to the vanishing point.
  const hz = H * 0.48;
  skyBand(g, W, H, hz, '#4F9BE0', '#F6D7A8', true, 0.5, 0.36);
  const wall = (side) => {
    const x0 = side < 0 ? -W * 0.3 : W * 1.3, xin = W * (0.5 + side * 0.17);
    for (let k = 0; k < 14; k++) {
      const t0 = k / 14, t1 = (k + 1) / 14;
      const col = ['#C2462E', '#D9663B', '#B83A2B', '#E07A45', '#C9553A', '#A9342A', '#D86E3E'][k % 7];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x0, -H * 0.1 + t0 * (H * 0.95));
      g.lineTo(xin, hz - H * 0.18 + t0 * H * 0.18);
      g.lineTo(xin, hz - H * 0.18 + t1 * H * 0.18);
      g.lineTo(x0, -H * 0.1 + t1 * (H * 0.95));
      g.closePath(); g.fill();
    }
    vGrad(g, side < 0 ? -W * 0.3 : xin, -H, W * 0.8, H * 2, [[0, 'rgba(255,220,180,0)'], [1, 'rgba(255,200,150,0)']]);
  };
  wall(-1);
  // The far canyon floor and haze.
  vGrad(g, -W, hz, W * 3, H, [[0, '#D9A26E'], [0.2, '#C98F5C'], [1, '#8C6544']]);
  glow(g, W * 0.5, hz, W * 0.5, 'rgba(255,225,180,0.6)');
  const vx = W * 0.5, by = H * 1.1;
  // Ballast bed.
  g.fillStyle = '#9C8670'; g.beginPath(); g.moveTo(vx - W * 0.01, hz); g.lineTo(vx + W * 0.01, hz); g.lineTo(W * 0.95, by); g.lineTo(W * 0.05, by); g.closePath(); g.fill();
  // Sleepers.
  for (let k = 1; k < 24; k++) { const d = Math.pow(k / 24, 2.2), y = hz + (by - hz) * d, half = W * 0.008 + d * W * 0.36, th = H * (0.002 + d * 0.012); g.fillStyle = '#6B4B33'; g.fillRect(vx - half, y - th / 2, half * 2, th); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(vx - half, y - th / 2, half * 2, th * 0.3); }
  // Rails.
  for (const s of [-1, 1]) {
    g.strokeStyle = '#B9BCC4'; g.lineWidth = W * 0.007;
    g.beginPath(); g.moveTo(vx + s * W * 0.004, hz); g.lineTo(vx + s * W * 0.25, by); g.stroke();
    g.strokeStyle = '#5B5F69'; g.lineWidth = W * 0.003;
    g.beginPath(); g.moveTo(vx + s * W * 0.005, hz + 2); g.lineTo(vx + s * W * 0.258, by + 4); g.stroke();
  }
  wall(1);
  // Telegraph poles.
  for (let k = 1; k < 6; k++) { const d = Math.pow(k / 6, 2), y = hz + (H - hz) * d, x = vx + W * (0.05 + d * 0.32), s = H * (0.03 + d * 0.3); g.fillStyle = '#5E4430'; g.fillRect(x, y - s, s * 0.035, s); g.fillRect(x - s * 0.08, y - s * 0.92, s * 0.2, s * 0.02); }
};

P.sea = P.water = (g, W, H, r) => {
  const hz = H * 0.46;
  skyBand(g, W, H, hz, '#4FA6E8', '#DDF1FB', true, 0.72, 0.18);
  vGrad(g, -W, hz, W * 3, H * 0.4, [[0, '#7CC3E8'], [0.4, '#2F8FCB'], [1, '#1F6EA8']]);
  glow(g, W * 0.72, hz + H * 0.02, W * 0.35, 'rgba(255,250,220,0.35)');
  // Distant island and ship.
  ridge(g, W, hz + 2, H * 0.02, mix('#5E9C7A', '#DDF1FB', 0.5), 4, { bottom: hz + 3, bumps: 2 });
  g.fillStyle = '#2F3540'; g.beginPath(); g.moveTo(W * 0.18, hz - H * 0.004); g.lineTo(W * 0.27, hz - H * 0.004); g.lineTo(W * 0.255, hz + H * 0.004); g.lineTo(W * 0.195, hz + H * 0.004); g.closePath(); g.fill();
  g.fillRect(W * 0.21, hz - H * 0.012, W * 0.012, H * 0.008); g.fillRect(W * 0.235, hz - H * 0.016, W * 0.01, H * 0.012);
  // Beach in front.
  const beach = hz + H * 0.24;
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(-W * 0.3, beach - H * 0.012); g.bezierCurveTo(W * 0.3, beach - H * 0.03, W * 0.7, beach + H * 0.005, W * 1.3, beach - H * 0.02); g.lineTo(W * 1.3, beach + H * 0.01); g.lineTo(-W * 0.3, beach + H * 0.01); g.fill();
  g.fillStyle = '#EED7A0'; g.beginPath(); g.moveTo(-W * 0.3, beach); g.bezierCurveTo(W * 0.3, beach - H * 0.02, W * 0.7, beach + H * 0.012, W * 1.3, beach - H * 0.01); g.lineTo(W * 1.3, H * 1.2); g.lineTo(-W * 0.3, H * 1.2); g.closePath(); g.fill();
  vGrad(g, -W, beach + H * 0.02, W * 3, H, [[0, 'rgba(200,160,100,0)'], [1, 'rgba(180,140,90,0.45)']]);
  // Palm.
  const px = W * 0.9, py = beach + H * 0.12;
  shadow(g, px + W * 0.05, py, W * 0.12, H * 0.012);
  g.strokeStyle = '#8B6A43'; g.lineWidth = W * 0.025; g.lineCap = 'round';
  g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - W * 0.04, py - H * 0.12, px - W * 0.1, py - H * 0.24); g.stroke();
  for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.05 + k * 0.17); g.fillStyle = k % 2 ? '#3E9B57' : '#4FB062'; g.beginPath(); const cx = px - W * 0.1, cy = py - H * 0.24; g.ellipse(cx + Math.cos(a) * W * 0.09, cy + Math.sin(a) * W * 0.05 + W * 0.03, W * 0.11, W * 0.025, a, 0, TAU); g.fill(); }
};

P.desert = (g, W, H, r) => {
  const hz = H * 0.5;
  skyBand(g, W, H, hz, '#5FA9E4', '#F6E2B6', true, 0.75, 0.15);
  // Pyramids in the haze.
  for (const [x, s] of [[0.22, 0.13], [0.34, 0.08]]) {
    const px = W * x, ph = H * s, pw = ph * 1.2;
    g.fillStyle = mix('#D9A15B', '#F6E2B6', 0.45); g.beginPath(); g.moveTo(px - pw, hz + 2); g.lineTo(px, hz - ph); g.lineTo(px + pw, hz + 2); g.closePath(); g.fill();
    g.fillStyle = mix('#B9813F', '#F6E2B6', 0.45); g.beginPath(); g.moveTo(px, hz - ph); g.lineTo(px + pw, hz + 2); g.lineTo(px + pw * 0.25, hz + 2); g.closePath(); g.fill();
  }
  ridge(g, W, hz + H * 0.03, H * 0.06, '#E8B972', 3, { bottom: H * 2, bumps: 3, light: 0.2 });
  ridge(g, W, hz + H * 0.1, H * 0.07, '#DDA75E', 17, { bottom: H * 2, bumps: 2, light: 0.22 });
  vGrad(g, -W, hz + H * 0.16, W * 3, H, [[0, '#E2AE66'], [1, '#C48A45']]);
  // Cacti.
  for (const [x, y, s] of [[0.1, 0.78, 0.13], [0.86, 0.66, 0.08]]) {
    const cx = W * x, cy = H * y, h = H * s;
    shadow(g, cx + h * 0.15, cy, h * 0.3, h * 0.06);
    g.fillStyle = '#3F9A55'; g.fillRect(cx - h * 0.07, cy - h, h * 0.14, h);
    g.fillRect(cx - h * 0.28, cy - h * 0.62, h * 0.12, h * 0.3); g.fillRect(cx - h * 0.28, cy - h * 0.38, h * 0.25, h * 0.08);
    g.fillRect(cx + h * 0.16, cy - h * 0.75, h * 0.12, h * 0.32); g.fillRect(cx + h * 0.05, cy - h * 0.48, h * 0.23, h * 0.08);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(cx - h * 0.07, cy - h, h * 0.04, h);
  }
};

P.mountains = (g, W, H, r) => {
  const hz = H * 0.52;
  skyBand(g, W, H, hz, '#4C9DE3', '#DCEFFA', true, 0.8, 0.12);
  const peaks = (y, amp, col, seed, snow) => {
    const pts = ridge(g, W, y, amp, col, seed, { bottom: H * 2, bumps: 3, sharp: true, light: 0.18 });
    if (!snow) return;
    // Snow on the high parts only: clip to the mountain, then whiten everything above a wavy line.
    g.save();
    g.beginPath(); g.moveTo(pts[0][0], H * 2); pts.forEach(([x, yy]) => g.lineTo(x, yy)); g.lineTo(pts[pts.length - 1][0], H * 2); g.closePath(); g.clip();
    const line = y - amp * 0.68;
    g.beginPath(); g.moveTo(-W, -H);
    for (let i = 0; i <= 40; i++) { const x = -W * 0.25 + (i / 40) * W * 1.5; g.lineTo(x, line + Math.sin(i * 1.9 + seed) * amp * 0.06 + (i % 2 ? amp * 0.05 : 0)); }
    g.lineTo(W * 2, -H); g.closePath();
    const sg = g.createLinearGradient(0, y - amp, 0, line);
    sg.addColorStop(0, '#FFFFFF'); sg.addColorStop(1, '#E3ECF7');
    g.fillStyle = sg; g.fill();
    g.restore();
  };
  peaks(hz - H * 0.02, H * 0.3, mix('#8293B5', '#DCEFFA', 0.45), 9, true);
  peaks(hz + H * 0.03, H * 0.22, mix('#6D7FA3', '#DCEFFA', 0.15), 21, true);
  ridge(g, W, hz + H * 0.09, H * 0.06, '#4E9A55', 31, { bottom: H * 2, bumps: 4 });
  vGrad(g, -W, hz + H * 0.12, W * 3, H, [[0, '#58A757'], [1, '#367F3A']]);
  for (let k = 0; k < 9; k++) { const d = r(), x = r() * W * 1.1 - W * 0.05; pine(g, x, hz + H * (0.11 + d * 0.06), H * (0.04 + d * 0.03), mix('#2F7D4F', '#A9CDBA', 0.3 - d * 0.25)); }
  pine(g, W * 0.07, hz + H * 0.4, H * 0.19); pine(g, W * 0.94, hz + H * 0.33, H * 0.14, '#3A8A57');
};

P.snow = (g, W, H, r) => {
  const hz = H * 0.52;
  skyBand(g, W, H, hz, '#8EC1EA', '#EEF6FC', true, 0.25, 0.16);
  ridge(g, W, hz, H * 0.18, mix('#AFC3DE', '#EEF6FC', 0.35), 8, { bottom: H * 2, bumps: 3, sharp: true, light: 0.3 });
  ridge(g, W, hz + H * 0.06, H * 0.06, '#F4F8FC', 19, { bottom: H * 2, bumps: 3, light: 0.05 });
  vGrad(g, -W, hz + H * 0.1, W * 3, H, [[0, '#F7FAFD'], [1, '#D6E3F0']]);
  for (let k = 0; k < 8; k++) { const d = r(), x = r() * W * 1.1 - W * 0.05; pine(g, x, hz + H * (0.1 + d * 0.06), H * (0.04 + d * 0.03), mix('#2F6B4F', '#C7D8E6', 0.35 - d * 0.3), true); }
  // A cabin with a lit window.
  const cx = W * 0.72, cy = hz + H * 0.2, cw = W * 0.2, ch = H * 0.07;
  shadow(g, cx + cw * 0.5, cy, cw * 0.7, H * 0.012);
  box(g, cx, cy - ch, cw, ch, '#8A5A3A', { side: cw * 0.25, top: ch * 0.18 });
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(cx - cw * 0.08, cy - ch); g.lineTo(cx + cw * 0.5, cy - ch * 1.9); g.lineTo(cx + cw * 1.08, cy - ch); g.closePath(); g.fill();
  g.fillStyle = '#FFD27A'; g.fillRect(cx + cw * 0.38, cy - ch * 0.7, cw * 0.22, ch * 0.4); glow(g, cx + cw * 0.49, cy - ch * 0.5, cw * 0.4, 'rgba(255,210,120,0.6)');
  pine(g, W * 0.1, hz + H * 0.4, H * 0.2, '#2F6B4F', true);
};

P.forest = (g, W, H, r) => {
  const hz = H * 0.55;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#9ED38A'], [0.6, '#C8E8AE'], [1, '#EAF5CF']]);
  // Three layers of trees: pale and thin far away, dark and thick up close. Each canopy is a
  // cluster of shaded blobs, so the treetops have a bumpy edge with light on top.
  for (let layer = 0; layer < 3; layer++) {
    const d = layer / 2, n = 8 - layer * 2;
    const trunkCol = mix('#4C3A2A', '#C8E8AE', 0.72 - d * 0.62);
    const leaf = mix('#2F7A3E', '#C8E8AE', 0.62 - d * 0.55);
    for (let k = 0; k < n; k++) {
      const x = (k / Math.max(1, n - 1)) * W * 1.3 - W * 0.15 + (r() - 0.5) * W * 0.1, w = W * (0.02 + d * 0.04);
      const base = hz + H * (0.02 + d * 0.12), crown = H * (0.18 + r() * 0.1 - d * 0.08);
      g.fillStyle = trunkCol; g.fillRect(x - w / 2, crown, w, base - crown);
      for (let b = 0; b < 6; b++) {
        const cx = x + (r() - 0.5) * w * 7, cy = crown - H * (0.02 + r() * 0.1), rr = w * (2.2 + r() * 2.2);
        const gr = g.createRadialGradient(cx - rr * 0.3, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
        gr.addColorStop(0, shade(leaf, 0.22)); gr.addColorStop(0.75, leaf); gr.addColorStop(1, shade(leaf, -0.18));
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
      }
    }
  }
  g.save(); g.beginPath(); g.rect(-W, -H, W * 3, hz + H); g.clip(); rays(g, W, H, W * 0.3, -H * 0.1, 3, 'rgba(255,250,210,0.14)'); g.restore();
  vGrad(g, -W, hz, W * 3, H, [[0, '#7FAF4E'], [1, '#4E7F33']]);
  g.fillStyle = '#B79A6A';
  g.beginPath(); g.moveTo(W * 0.47, hz); g.bezierCurveTo(W * 0.56, hz + H * 0.1, W * 0.3, hz + H * 0.2, W * 0.3, H * 1.1); g.lineTo(W * 0.8, H * 1.1); g.bezierCurveTo(W * 0.62, hz + H * 0.2, W * 0.6, hz + H * 0.08, W * 0.53, hz); g.closePath(); g.fill();
  for (const [x, y, s] of [[0.06, 0.92, 0.07], [0.93, 0.85, 0.05]]) { g.fillStyle = '#C94A3A'; g.beginPath(); g.ellipse(W * x, H * y - H * s * 0.6, H * s * 0.45, H * s * 0.25, 0, Math.PI, 0); g.fill(); g.fillStyle = '#F2EEE3'; g.fillRect(W * x - H * s * 0.1, H * y - H * s * 0.6, H * s * 0.2, H * s * 0.6); }
};

P.city = (g, W, H, r) => {
  const hz = H * 0.5, vx = W * 0.5;
  skyBand(g, W, H, hz, '#5AA9E8', '#E3F1FA', true, 0.5, 0.2);
  // Skyline in the haze at the end of the street.
  for (let k = 0; k < 10; k++) { const x = W * (0.3 + k * 0.045), h = H * (0.05 + r() * 0.1); g.fillStyle = mix('#7E8FA8', '#E3F1FA', 0.55); g.fillRect(x, hz - h, W * 0.04, h); }
  // Street.
  vGrad(g, -W, hz, W * 3, H, [[0, '#9AA2AE'], [1, '#5D6470']]);
  g.fillStyle = '#C9CDD3';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(vx + s * W * 0.02, hz); g.lineTo(vx + s * W * 0.09, hz); g.lineTo(vx + s * W * 1.1, H * 1.1); g.lineTo(vx + s * W * 0.55, H * 1.1); g.closePath(); g.fill(); }
  g.fillStyle = '#F4F1E6';
  for (let k = 0; k < 8; k++) { const a = Math.pow(k / 8, 2), b = Math.pow((k + 0.45) / 8, 2); const ya = hz + (H * 1.1 - hz) * a, yb = hz + (H * 1.1 - hz) * b; const wa = W * 0.003 + a * W * 0.014, wb = W * 0.003 + b * W * 0.014; g.beginPath(); g.moveTo(vx - wa, ya); g.lineTo(vx + wa, ya); g.lineTo(vx + wb, yb); g.lineTo(vx - wb, yb); g.closePath(); g.fill(); }
  // Building fronts on both sides, receding.
  const cols = ['#E4826A', '#F2C46D', '#7FB3E0', '#B59AD9', '#8CCB9A', '#F29BB5'];
  for (const s of [-1, 1]) {
    for (let k = 6; k >= 0; k--) {
      const d0 = Math.pow(k / 7, 1.7), d1 = Math.pow((k + 1) / 7, 1.7);
      const x0 = vx + s * (W * 0.09 + d0 * W * 1.0), x1 = vx + s * (W * 0.09 + d1 * W * 1.0);
      const yb0 = hz + (H * 1.1 - hz) * d0 * 0.55, yb1 = hz + (H * 1.1 - hz) * d1 * 0.55;
      const ht = H * (0.18 + r() * 0.2);
      const top0 = yb0 - ht * (0.35 + d0 * 1.4), top1 = yb1 - ht * (0.35 + d1 * 1.4);
      const col = cols[(k * 2 + (s > 0 ? 1 : 0)) % cols.length];
      g.fillStyle = shade(col, s > 0 ? -0.12 : 0.02);
      g.beginPath(); g.moveTo(x0, yb0); g.lineTo(x0, top0); g.lineTo(x1, top1); g.lineTo(x1, yb1); g.closePath(); g.fill();
      // Windows.
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let wy = 0.15; wy < 0.9; wy += 0.18) for (let wx = 0.15; wx < 0.85; wx += 0.3) {
        const xa = x0 + (x1 - x0) * wx, xb = x0 + (x1 - x0) * (wx + 0.15);
        const ta = top0 + (yb0 - top0) * wy, tb = top1 + (yb1 - top1) * wy, ha = (yb0 - top0) * 0.09, hb = (yb1 - top1) * 0.09;
        g.beginPath(); g.moveTo(xa, ta + (tb - ta) * wx); g.lineTo(xb, ta + (tb - ta) * (wx + 0.15)); g.lineTo(xb, ta + (tb - ta) * (wx + 0.15) + hb); g.lineTo(xa, ta + (tb - ta) * wx + ha); g.closePath(); g.fill();
      }
    }
  }
  // Street lamps.
  for (const s of [-1, 1]) for (let k = 1; k < 4; k++) { const d = Math.pow(k / 4, 2), y = hz + (H - hz) * d * 0.9, x = vx + s * (W * 0.1 + d * W * 0.5), h = H * (0.05 + d * 0.3); g.fillStyle = '#3A3F4B'; g.fillRect(x, y - h, h * 0.03, h); g.fillRect(x - s * h * 0.12, y - h, h * 0.14, h * 0.02); }
};

P.night = (g, W, H, r) => {
  const hz = H * 0.52, vx = W * 0.5;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#0E1636'], [0.6, '#22306A'], [1, '#4A4C8A']]);
  // Moon.
  glow(g, W * 0.78, H * 0.14, W * 0.3, 'rgba(200,215,255,0.35)');
  g.fillStyle = '#F4F1DC'; g.beginPath(); g.arc(W * 0.78, H * 0.14, W * 0.06, 0, TAU); g.fill();
  g.fillStyle = 'rgba(200,190,160,0.5)'; g.beginPath(); g.arc(W * 0.765, H * 0.13, W * 0.012, 0, TAU); g.arc(W * 0.795, H * 0.155, W * 0.008, 0, TAU); g.fill();
  // Houses with lit windows.
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const d = Math.pow((k + 1) / 4, 1.6), x = vx + s * (W * 0.12 + d * W * 0.55), y = hz + (H - hz) * d * 0.45, w = W * (0.1 + d * 0.3), h = w * 0.8;
    const left = s < 0 ? x - w : x;
    g.fillStyle = mix('#2B2F55', '#4A4C8A', 0.4 - d * 0.3); g.fillRect(left, y - h, w, h);
    g.beginPath(); g.moveTo(left - w * 0.05, y - h); g.lineTo(left + w * 0.5, y - h * 1.55); g.lineTo(left + w * 1.05, y - h); g.closePath(); g.fillStyle = '#1C2042'; g.fill();
    for (const [wx, wy] of [[0.2, 0.35], [0.62, 0.35]]) { g.fillStyle = r() < 0.75 ? '#FFD37A' : '#3A3E66'; g.fillRect(left + w * wx, y - h + h * wy, w * 0.18, h * 0.22); }
  }
  vGrad(g, -W, hz + H * 0.02, W * 3, H, [[0, '#2B2F4F'], [1, '#171A30']]);
  g.fillStyle = '#3A3E5C'; g.beginPath(); g.moveTo(vx - W * 0.03, hz + H * 0.02); g.lineTo(vx + W * 0.03, hz + H * 0.02); g.lineTo(W * 0.95, H * 1.1); g.lineTo(W * 0.05, H * 1.1); g.closePath(); g.fill();
  for (const s of [-1, 1]) { const x = vx + s * W * 0.36, y = hz + H * 0.3, h = H * 0.26; g.fillStyle = '#14172C'; g.fillRect(x, y - h, W * 0.012, h); g.fillStyle = '#FFE6A8'; g.beginPath(); g.arc(x + W * 0.006, y - h, W * 0.022, 0, TAU); g.fill(); }
};

P.space = (g, W, H, r) => {
  const hz = H * 0.62;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#070A1C'], [0.7, '#141B3E'], [1, '#2B2758']]);
  glow(g, W * 0.25, H * 0.25, W * 0.6, 'rgba(140,80,190,0.25)');
  glow(g, W * 0.8, H * 0.4, W * 0.5, 'rgba(60,120,200,0.2)');
  // Earth.
  const ex = W * 0.72, ey = H * 0.2, er = W * 0.13;
  glow(g, ex, ey, er * 1.6, 'rgba(110,170,255,0.4)');
  const eg = g.createRadialGradient(ex - er * 0.4, ey - er * 0.4, er * 0.1, ex, ey, er);
  eg.addColorStop(0, '#7FC4FF'); eg.addColorStop(0.7, '#2B76D2'); eg.addColorStop(1, '#123E86');
  g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.clip(); g.fillStyle = '#4CAF6A';
  g.beginPath(); g.ellipse(ex - er * 0.3, ey - er * 0.1, er * 0.35, er * 0.22, 0.6, 0, TAU); g.ellipse(ex + er * 0.35, ey + er * 0.3, er * 0.25, er * 0.15, -0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,30,0.35)'; g.beginPath(); g.arc(ex + er * 0.45, ey + er * 0.2, er, 0, TAU); g.fill(); g.restore();
  // Moon surface with craters in perspective.
  ridge(g, W, hz, H * 0.04, '#9A9CA8', 13, { bottom: H * 2, bumps: 3, light: 0.25 });
  vGrad(g, -W, hz + H * 0.03, W * 3, H, [[0, '#A9ABB6'], [1, '#6D6F7C']]);
  for (let k = 0; k < 9; k++) { const d = r(), x = r() * W, y = hz + H * (0.05 + d * 0.33), rx = W * (0.02 + d * 0.08); g.fillStyle = 'rgba(60,62,75,0.35)'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.3, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x, y + rx * 0.06, rx * 0.9, rx * 0.25, 0, 0, Math.PI); g.fill(); }
};

P.temple = (g, W, H, r) => {
  const hz = H * 0.5;
  skyBand(g, W, H, hz, '#4FA3E6', '#E4F3FB', true, 0.82, 0.12);
  vGrad(g, -W, hz - H * 0.01, W * 3, H * 0.05, [[0, '#6FB7E6'], [1, '#3D8FC8']]);
  ridge(g, W, hz + H * 0.06, H * 0.08, '#B9C77E', 6, { bottom: H * 2, bumps: 2, light: 0.2 });
  vGrad(g, -W, hz + H * 0.1, W * 3, H, [[0, '#D8C98E'], [1, '#B69D62']]);
  // Temple.
  const tx = W * 0.5, ty = hz + H * 0.03, tw = W * 0.62, th = H * 0.17;
  shadow(g, tx + tw * 0.08, ty + H * 0.005, tw * 0.62, H * 0.012);
  for (let k = 0; k < 3; k++) box(g, tx - tw / 2 - k * W * 0.02, ty - H * 0.008 * (k + 1), tw + k * W * 0.04, H * 0.008, '#EDE5D0');
  const n = 6;
  for (let k = 0; k < n; k++) {
    const x = tx - tw / 2 + tw * 0.06 + (k / (n - 1)) * tw * 0.82, cw = tw * 0.065;
    const gr = g.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.55, '#EFE7D3'); gr.addColorStop(1, '#C9BEA2');
    g.fillStyle = gr; g.fillRect(x - cw / 2, ty - th, cw, th - H * 0.024);
  }
  box(g, tx - tw * 0.52, ty - th - H * 0.03, tw * 1.04, H * 0.03, '#EAE1C9');
  g.fillStyle = '#F4EEDD'; g.beginPath(); g.moveTo(tx - tw * 0.54, ty - th - H * 0.03); g.lineTo(tx, ty - th - H * 0.1); g.lineTo(tx + tw * 0.54, ty - th - H * 0.03); g.closePath(); g.fill();
  g.fillStyle = 'rgba(150,130,90,0.25)'; g.beginPath(); g.moveTo(tx, ty - th - H * 0.1); g.lineTo(tx + tw * 0.54, ty - th - H * 0.03); g.lineTo(tx, ty - th - H * 0.03); g.closePath(); g.fill();
  // Olive trees.
  tree(g, W * 0.07, hz + H * 0.36, H * 0.12, '#7E9E57', '#6A5238'); tree(g, W * 0.92, hz + H * 0.3, H * 0.1, '#86A55E', '#6A5238');
};

// Indoor rooms share a shell: back wall, floor in perspective, light from a window.
function roomShell(g, W, H, wall, floor, hz) {
  vGrad(g, -W, -H, W * 3, hz + H, [[0, shade(wall, -0.08)], [1, shade(wall, 0.06)]]);
  g.fillStyle = shade(wall, -0.18); g.fillRect(-W, hz - H * 0.015, W * 3, H * 0.015);
  vGrad(g, -W, hz, W * 3, H, [[0, shade(floor, 0.06)], [1, shade(floor, -0.16)]]);
  g.save(); g.strokeStyle = shade(floor, -0.12); g.lineWidth = Math.max(1, W * 0.002);
  for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(W * 0.5 + k * W * 0.05, hz); g.lineTo(W * 0.5 + k * W * 0.5, H * 1.3); g.stroke(); }
  g.restore();
  rows(g, W, hz, H * 1.2, 10, shade(floor, -0.1), Math.max(1, W * 0.0015));
  vGrad(g, -W, hz, W * 3, H * 0.04, [[0, 'rgba(0,0,0,0.18)'], [1, 'rgba(0,0,0,0)']]);
}

P.room = (g, W, H, r) => {
  const hz = H * 0.58;
  roomShell(g, W, H, '#F3DDB0', '#C9935E', hz);
  // Window with a light pool on the floor.
  const wx = W * 0.12, wy = H * 0.14, ww = W * 0.34, wh = H * 0.2;
  // (the view is painted with its own local coordinates)
  vGrad(g, wx, wy, ww, wh, [[0, '#6FB8EE'], [1, '#D7EEFA']]);
  g.fillStyle = '#7FBF84'; g.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28);
  g.fillStyle = '#FFFFFF';
  g.fillRect(wx - ww * 0.05, wy - ww * 0.05, ww * 1.1, ww * 0.05); g.fillRect(wx - ww * 0.06, wy + wh, ww * 1.12, ww * 0.07);
  g.fillRect(wx - ww * 0.05, wy, ww * 0.05, wh); g.fillRect(wx + ww, wy, ww * 0.05, wh); g.fillRect(wx + ww / 2 - ww * 0.02, wy, ww * 0.04, wh);
  g.fillStyle = '#D9534F'; g.fillRect(wx - ww * 0.22, wy - ww * 0.08, ww * 0.18, wh * 1.35); g.fillRect(wx + ww * 1.04, wy - ww * 0.08, ww * 0.18, wh * 1.35);
  g.save(); g.globalAlpha = 0.22; g.fillStyle = '#FFF6D8'; g.beginPath(); g.moveTo(wx, hz); g.lineTo(wx + ww, hz); g.lineTo(wx + ww * 1.9, H); g.lineTo(wx + ww * 0.6, H); g.closePath(); g.fill(); g.restore();
  // Picture frame and a shelf with books.
  box(g, W * 0.6, H * 0.15, W * 0.24, H * 0.12, '#8A5A3A'); vGrad(g, W * 0.615, H * 0.158, W * 0.21, H * 0.104, [[0, '#F2A65A'], [1, '#6FB8EE']]);
  box(g, W * 0.56, H * 0.38, W * 0.34, H * 0.012, '#8A5A3A', { top: H * 0.008, side: 0 });
  for (let k = 0; k < 9; k++) { const c = ['#D9534F', '#3F7FD9', '#F0B429', '#4AAE6A', '#8E6CCF'][k % 5]; g.fillStyle = c; const bh = H * (0.04 + r() * 0.025); g.fillRect(W * (0.575 + k * 0.035), H * 0.38 - bh, W * 0.028, bh); }
  // A rug in perspective and a lamp.
  g.fillStyle = '#5B7FD6'; g.beginPath(); g.moveTo(W * 0.25, hz + H * 0.12); g.lineTo(W * 0.75, hz + H * 0.12); g.lineTo(W * 0.92, hz + H * 0.32); g.lineTo(W * 0.08, hz + H * 0.32); g.closePath(); g.fill();
  g.strokeStyle = '#F2D06B'; g.lineWidth = W * 0.008; g.stroke();
  const lx = W * 0.9, ly = hz + H * 0.03;
  shadow(g, lx, ly, W * 0.05, H * 0.006); g.fillStyle = '#3A3F4B'; g.fillRect(lx - W * 0.004, ly - H * 0.2, W * 0.008, H * 0.2);
  g.fillStyle = '#F7E0A3'; g.beginPath(); g.moveTo(lx - W * 0.05, ly - H * 0.18); g.lineTo(lx + W * 0.05, ly - H * 0.18); g.lineTo(lx + W * 0.03, ly - H * 0.24); g.lineTo(lx - W * 0.03, ly - H * 0.24); g.closePath(); g.fill();
  glow(g, lx, ly - H * 0.18, W * 0.2, 'rgba(255,230,160,0.45)');
};

P.shop = (g, W, H, r) => {
  const hz = H * 0.58;
  roomShell(g, W, H, '#F6E6A6', '#EDEAE3', hz);
  // Shelves full of goods.
  for (let row = 0; row < 3; row++) {
    const y = H * (0.18 + row * 0.12);
    box(g, W * 0.06, y, W * 0.88, H * 0.012, '#9C6B43', { top: H * 0.01 });
    for (let k = 0; k < 14; k++) { const c = ['#E5484D', '#3F7FD9', '#F0B429', '#46B07A', '#F28C38', '#8E6CCF'][(k + row) % 6]; const h = H * (0.04 + r() * 0.04), w = W * 0.05; box(g, W * (0.08 + k * 0.061), y - h, w, h, c, { top: h * 0.08 }); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(W * (0.088 + k * 0.061), y - h * 0.6, w * 0.6, h * 0.18); }
  }
  // Counter.
  box(g, W * 0.1, hz + H * 0.02, W * 0.55, H * 0.1, '#B7794A', { top: H * 0.025, topColor: '#E8D5B5' });
  g.fillStyle = '#3A3F4B'; g.fillRect(W * 0.45, hz - H * 0.03, W * 0.12, H * 0.05);
  // Hanging lamps.
  for (const x of [0.25, 0.75]) { g.fillStyle = '#3A3F4B'; g.fillRect(W * x - 1, -H * 0.2, 2, H * 0.27); g.beginPath(); g.ellipse(W * x, H * 0.075, W * 0.05, H * 0.015, 0, Math.PI, 0); g.fill(); glow(g, W * x, H * 0.09, W * 0.25, 'rgba(255,236,170,0.5)'); }
};

P.office = (g, W, H, r) => {
  const hz = H * 0.58;
  roomShell(g, W, H, '#E9EEF4', '#B9C3D0', hz);
  // Big window with a skyline.
  const wx = W * 0.08, wy = H * 0.1, ww = W * 0.84, wh = H * 0.3;
  vGrad(g, wx, wy, ww, wh, [[0, '#5FA9E8'], [1, '#D5ECFA']]);
  for (let k = 0; k < 12; k++) { const h = wh * (0.2 + r() * 0.45); g.fillStyle = mix('#7E8FA8', '#D5ECFA', 0.4); g.fillRect(wx + k * ww / 12 + 2, wy + wh - h, ww / 12 - 6, h); }
  g.fillStyle = '#FFFFFF'; for (let k = 0; k <= 4; k++) g.fillRect(wx + k * ww / 4 - W * 0.006, wy, W * 0.012, wh); g.fillRect(wx, wy - W * 0.012, ww, W * 0.012); g.fillRect(wx, wy + wh, ww, W * 0.014);
  // Desk, monitor, plant.
  box(g, W * 0.18, hz + H * 0.03, W * 0.64, H * 0.014, '#C08A55', { top: H * 0.03, topColor: '#D9A774' });
  g.fillStyle = '#8A6240'; g.fillRect(W * 0.2, hz + H * 0.044, W * 0.02, H * 0.08); g.fillRect(W * 0.78, hz + H * 0.044, W * 0.02, H * 0.08);
  box(g, W * 0.4, hz - H * 0.05, W * 0.2, H * 0.07, '#2B2F3A'); vGrad(g, W * 0.41, hz - H * 0.045, W * 0.18, H * 0.058, [[0, '#4C8CE0'], [1, '#2A5FB0']]);
  const px = W * 0.88, py = hz + H * 0.06; shadow(g, px, py, W * 0.05, H * 0.006); box(g, px - W * 0.035, py - H * 0.04, W * 0.07, H * 0.04, '#D9774A'); for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#3E9B57' : '#4FB062'; g.beginPath(); g.ellipse(px + (k - 2) * W * 0.015, py - H * 0.07, W * 0.012, H * 0.035, (k - 2) * 0.35, 0, TAU); g.fill(); }
};

P.lab = (g, W, H, r) => {
  const hz = H * 0.58;
  roomShell(g, W, H, '#E3EEF2', '#DCE3E8', hz);
  // Whiteboard with scribbles.
  box(g, W * 0.08, H * 0.12, W * 0.44, H * 0.17, '#FFFFFF'); g.strokeStyle = '#9AA6B2'; g.lineWidth = W * 0.008; g.strokeRect(W * 0.08, H * 0.12, W * 0.44, H * 0.17);
  g.strokeStyle = '#3F7FD9'; g.lineWidth = W * 0.004; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(W * 0.11, H * (0.15 + k * 0.035)); for (let x = 0; x < 10; x++) g.lineTo(W * (0.11 + x * 0.03), H * (0.15 + k * 0.035) + Math.sin(x * 1.7 + k) * H * 0.006); g.stroke(); }
  g.strokeStyle = '#E5484D'; g.beginPath(); g.arc(W * 0.44, H * 0.22, W * 0.035, 0, TAU); g.stroke();
  // Shelf of glowing flasks.
  box(g, W * 0.58, H * 0.3, W * 0.36, H * 0.012, '#9AA6B2', { top: H * 0.008 });
  for (let k = 0; k < 5; k++) { const c = ['#46D17A', '#4CA9F0', '#F05FA0', '#F0B429', '#9B6CF0'][k], x = W * (0.62 + k * 0.065), y = H * 0.3; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - W * 0.008, y - H * 0.07, W * 0.016, H * 0.03); g.fillStyle = c; g.beginPath(); g.moveTo(x - W * 0.008, y - H * 0.045); g.lineTo(x - W * 0.025, y); g.lineTo(x + W * 0.025, y); g.lineTo(x + W * 0.008, y - H * 0.045); g.closePath(); g.fill(); glow(g, x, y - H * 0.015, W * 0.06, c, 0.25); }
  // Lab bench with beakers.
  box(g, W * 0.05, hz + H * 0.025, W * 0.9, H * 0.11, '#DDE3E8', { top: H * 0.022, topColor: '#2E3440' });
  for (let k = 0; k < 4; k++) { const c = ['#46D17A', '#F05FA0', '#4CA9F0', '#F0B429'][k], x = W * (0.15 + k * 0.2); g.fillStyle = 'rgba(220,240,255,0.7)'; g.fillRect(x, hz - H * 0.035, W * 0.06, H * 0.06); g.fillStyle = c; g.fillRect(x, hz - H * 0.005, W * 0.06, H * 0.03); }
  for (const x of [0.25, 0.75]) { g.fillStyle = '#F5F8FA'; g.fillRect(W * x - W * 0.12, -H * 0.02, W * 0.24, H * 0.03); glow(g, W * x, H * 0.02, W * 0.3, 'rgba(230,245,255,0.6)'); }
};

P.bridge = (g, W, H, r) => {
  const hz = H * 0.48, vx = W * 0.5;
  skyBand(g, W, H, hz, '#5AA9E8', '#E3F1FA', true, 0.75, 0.13);
  ridge(g, W, hz, H * 0.06, mix('#77B98A', '#E3F1FA', 0.5), 4, { bottom: H * 2, bumps: 3 });
  vGrad(g, -W, hz, W * 3, H, [[0, '#6FB7E6'], [1, '#2F86C2']]);
  // The deck runs from the viewer to the far bank.
  g.fillStyle = '#7C828E'; g.beginPath(); g.moveTo(vx - W * 0.03, hz); g.lineTo(vx + W * 0.03, hz); g.lineTo(W * 1.05, H * 1.1); g.lineTo(-W * 0.05, H * 1.1); g.closePath(); g.fill();
  g.fillStyle = '#F4F1E6'; for (let k = 0; k < 8; k++) { const a = Math.pow(k / 8, 2), b = Math.pow((k + 0.45) / 8, 2); const ya = hz + (H * 1.1 - hz) * a, yb = hz + (H * 1.1 - hz) * b; const wa = W * 0.002 + a * W * 0.012, wb = W * 0.002 + b * W * 0.012; g.beginPath(); g.moveTo(vx - wa, ya); g.lineTo(vx + wa, ya); g.lineTo(vx + wb, yb); g.lineTo(vx - wb, yb); g.closePath(); g.fill(); }
  // Steel truss on both sides.
  for (const s of [-1, 1]) {
    const nearX = vx + s * W * 0.62, farX = vx + s * W * 0.035;
    g.strokeStyle = '#D9443B'; g.lineCap = 'round';
    const pt = (d, up) => [farX + (nearX - farX) * d, hz + (H * 1.1 - hz) * d - up * (H * 0.03 + d * H * 0.55)];
    g.lineWidth = W * 0.012;
    g.beginPath(); g.moveTo(...pt(0, 1)); g.lineTo(...pt(1, 1)); g.stroke();
    g.beginPath(); g.moveTo(...pt(0, 0)); g.lineTo(...pt(1, 0)); g.stroke();
    for (let k = 0; k <= 10; k++) { const d = Math.pow(k / 10, 1.8), d2 = Math.pow((k + 1) / 10, 1.8); g.lineWidth = W * (0.003 + d * 0.012); g.beginPath(); g.moveTo(...pt(d, 0)); g.lineTo(...pt(d, 1)); g.lineTo(...pt(Math.min(1, d2), 0)); g.stroke(); }
  }
};

P.underwater = (g, W, H, r) => {
  const hz = H * 0.6;
  vGrad(g, -W, -H, W * 3, H * 2, [[0, '#59C3EE'], [0.45, '#1F8FC9'], [1, '#0F4F86']]);
  rays(g, W, H, W * 0.4, -H * 0.2, 4, 'rgba(255,255,255,0.08)');
  ridge(g, W, hz, H * 0.05, mix('#C9B17A', '#1F8FC9', 0.45), 7, { bottom: H * 2, bumps: 3 });
  vGrad(g, -W, hz + H * 0.03, W * 3, H, [[0, '#D8C38A'], [1, '#A88E58']]);
  // Rocks and coral.
  for (const [x, y, s, c] of [[0.12, 0.86, 0.09, '#E5605C'], [0.85, 0.8, 0.07, '#F29BB5'], [0.66, 0.92, 0.05, '#F0B429']]) {
    const cx = W * x, cy = H * y, h = H * s;
    shadow(g, cx, cy, h * 0.7, h * 0.12);
    g.fillStyle = '#6B7486'; g.beginPath(); g.ellipse(cx, cy - h * 0.15, h * 0.7, h * 0.3, 0, Math.PI, 0); g.fill();
    g.strokeStyle = c; g.lineWidth = h * 0.12; g.lineCap = 'round';
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * h * 0.15, cy - h * 0.3); g.quadraticCurveTo(cx + k * h * 0.35, cy - h * 0.8, cx + k * h * 0.2, cy - h * 1.1); g.stroke(); }
  }
};

// The colours to paint beyond the world's edges, for camera pans and whips.
const EDGE = {
  sky: ['#5FB2EC', '#3F8E3F'], field: ['#5FB2EC', '#3F8E3F'], road: ['#5AAFEA', '#3F8B3B'], rails: ['#4F9BE0', '#8C6544'],
  sea: ['#4FA6E8', '#C48A45'], water: ['#4FA6E8', '#C48A45'], desert: ['#5FA9E4', '#C48A45'], mountains: ['#4C9DE3', '#367F3A'],
  snow: ['#8EC1EA', '#D6E3F0'], forest: ['#8CCB74', '#4E7F33'], city: ['#5AA9E8', '#5D6470'], night: ['#0E1636', '#171A30'],
  space: ['#070A1C', '#6D6F7C'], temple: ['#4FA3E6', '#B69D62'], room: ['#E8D0A2', '#A9784A'], shop: ['#EDDB98', '#C9C6BE'],
  office: ['#DCE2E9', '#98A3B2'], lab: ['#D6E2E6', '#B9C1C8'], bridge: ['#5AA9E8', '#2F86C2'], underwater: ['#59C3EE', '#A88E58'],
};
export const WORLD_IDS = Object.keys(P);

function still(id, W, H) {
  const key = `${id}|${W}|${H}`;
  if (cache.has(key)) { const c = cache.get(key); cache.delete(key); cache.set(key, c); return c; }
  const mx = Math.round(W * 0.2), my = Math.round(H * 0.1);
  const c = document.createElement('canvas'); c.width = W + mx * 2; c.height = H + my * 2;
  const g = c.getContext('2d');
  g.translate(mx, my);
  g.save(); g.beginPath(); g.rect(-mx, -my, W + mx * 2, H + my * 2); g.clip();
  P[id](g, W, H, rng(id.length * 7919 + 17));
  g.restore();
  c.mx = mx; c.my = my;
  cache.set(key, c);
  while (cache.size > 6) cache.delete(cache.keys().next().value);
  return c;
}

// ---------- what moves ----------
function animate(ctx, W, H, id, t) {
  const r = rng(id.length * 131 + 5);
  const outdoor = !['room', 'shop', 'office', 'lab', 'underwater', 'space', 'night'].includes(id);
  if (outdoor && id !== 'forest') {
    for (let k = 0; k < 3; k++) { const s = W * (0.08 + r() * 0.07), y = H * (0.04 + r() * 0.2), sp = 0.008 + r() * 0.01; const x = (((r() + t * sp) % 1.4) - 0.2) * W; cloud(ctx, x, y, s, 0.95); }
    // A pair of birds crossing now and then.
    const bt = (t * 0.05 + r()) % 1;
    if (bt < 0.5) { const bx = W * (bt * 2.4 - 0.2), by = H * 0.12; ctx.strokeStyle = 'rgba(40,40,50,0.7)'; ctx.lineWidth = W * 0.003; for (const o of [0, 1]) { const x = bx + o * W * 0.05, y = by + o * H * 0.01, f = Math.sin(t * 9 + o) * W * 0.008; ctx.beginPath(); ctx.moveTo(x - W * 0.015, y - f); ctx.quadraticCurveTo(x - W * 0.005, y - W * 0.008, x, y); ctx.quadraticCurveTo(x + W * 0.005, y - W * 0.008, x + W * 0.015, y - f); ctx.stroke(); } }
  }
  if (id === 'sea' || id === 'water' || id === 'bridge') {
    const hz = H * (id === 'bridge' ? 0.48 : 0.46);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(1.5, W * 0.003); ctx.lineCap = 'round';
    for (let k = 0; k < 26; k++) { const d = r(), y = hz + H * (0.01 + d * d * 0.22), x = ((r() + t * 0.01 * (0.5 + d)) % 1.2) * W - W * 0.1, w = W * (0.01 + d * 0.05); ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + k)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
    ctx.restore();
  }
  if (id === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let k = 0; k < 70; k++) { const x = ((r() + Math.sin(t * 0.6 + k) * 0.02) % 1) * W, y = ((r() + t * (0.04 + r() * 0.05)) % 1.05) * H, s = W * (0.003 + r() * 0.005); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  }
  if (id === 'underwater') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = Math.max(1.5, W * 0.0025);
    for (let k = 0; k < 22; k++) { const x = r() * W + Math.sin(t * 1.5 + k) * W * 0.01, y = H - ((r() + t * (0.05 + r() * 0.06)) % 1.1) * H, s = W * (0.005 + r() * 0.012); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke(); }
    for (let k = 0; k < 4; k++) { const y = H * (0.25 + r() * 0.3), x = (((r() + t * 0.03 * (k % 2 ? 1 : -1)) % 1.3) + 1.3) % 1.3 * W - W * 0.15, s = W * 0.03; ctx.fillStyle = ['#F0B429', '#F28C38', '#4CA9F0', '#F05FA0'][k]; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); const dir = k % 2 ? -1 : 1; ctx.moveTo(x - dir * s, y); ctx.lineTo(x - dir * s * 1.6, y - s * 0.5); ctx.lineTo(x - dir * s * 1.6, y + s * 0.5); ctx.fill(); }
  }
  if (id === 'night' || id === 'space') {
    ctx.fillStyle = '#FFFFFF';
    for (let k = 0; k < 70; k++) { const x = r() * W, y = r() * H * (id === 'space' ? 0.6 : 0.45), s = W * (0.001 + r() * 0.0025); ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + r() * 2) + k)); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (id === 'forest') {
    ctx.fillStyle = 'rgba(255,250,200,0.8)';
    for (let k = 0; k < 18; k++) { const x = (r() + Math.sin(t * 0.4 + k) * 0.03) * W, y = H * (0.35 + r() * 0.4) + Math.sin(t * 0.7 + k * 2) * H * 0.01, s = W * (0.002 + r() * 0.003); ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + k)); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (id === 'rails' || id === 'desert') {
    ctx.save(); ctx.globalAlpha = 0.08 + 0.04 * Math.sin(t * 2); ctx.fillStyle = '#FFE8C0'; ctx.fillRect(0, H * 0.42, W, H * 0.1); ctx.restore();
  }
}

// Draw the world for `id` filling the frame (and beyond, for camera moves). Returns false if the
// id has no painted world.
export function drawWorld(ctx, W, H, id, t) {
  if (!P[id]) return false;
  const [top, bottom] = EDGE[id] || ['#7EC8F2', '#67B35A'];
  const m = Math.max(W, H) * 0.55;
  ctx.fillStyle = top; ctx.fillRect(-m, -m, W + m * 2, H * 0.5 + m);
  ctx.fillStyle = bottom; ctx.fillRect(-m, H * 0.5, W + m * 2, H * 0.5 + m);
  const c = still(id, Math.round(W), Math.round(H));
  ctx.drawImage(c, -c.mx, -c.my);
  animate(ctx, W, H, id, t);
  return true;
}
