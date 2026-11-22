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

P.deck = (g, W, H, r) => {
  // On board an old ocean liner: planks running to the bow, railings, lifeboats, a funnel, the sea.
  const hz = H * 0.44, vx = W * 0.5;
  skyBand(g, W, H, hz, '#4FA6E8', '#DDF1FB', true, 0.8, 0.12);
  vGrad(g, -W, hz, W * 3, H * 1.2, [[0, '#7CC3E8'], [0.25, '#2F86C2'], [1, '#1D5F93']]);
  // Funnel and mast at the far end.
  box(g, W * 0.56, hz - H * 0.2, W * 0.09, H * 0.17, '#C8432E');
  g.fillStyle = '#23262E'; g.fillRect(W * 0.56, hz - H * 0.2, W * 0.09, H * 0.04);
  g.strokeStyle = '#4A3A2C'; g.lineWidth = W * 0.008; g.beginPath(); g.moveTo(W * 0.42, hz + H * 0.03); g.lineTo(W * 0.42, hz - H * 0.22); g.stroke();
  g.lineWidth = W * 0.002; g.beginPath(); g.moveTo(W * 0.42, hz - H * 0.22); g.lineTo(W * 0.05, hz + H * 0.02); g.moveTo(W * 0.42, hz - H * 0.22); g.lineTo(W * 0.9, hz + H * 0.02); g.stroke();
  // Deck planks to the vanishing point.
  g.fillStyle = '#C9965E'; g.beginPath(); g.moveTo(vx - W * 0.12, hz + H * 0.04); g.lineTo(vx + W * 0.12, hz + H * 0.04); g.lineTo(W * 1.3, H * 1.1); g.lineTo(-W * 0.3, H * 1.1); g.closePath(); g.fill();
  g.save(); g.strokeStyle = 'rgba(90,55,30,0.35)'; g.lineWidth = Math.max(1, W * 0.002);
  for (let k = -14; k <= 14; k++) { g.beginPath(); g.moveTo(vx + k * W * 0.0085, hz + H * 0.04); g.lineTo(vx + k * W * 0.11, H * 1.1); g.stroke(); }
  g.restore();
  vGrad(g, -W, hz + H * 0.04, W * 3, H, [[0, 'rgba(255,240,210,0.25)'], [1, 'rgba(60,35,20,0.25)']]);
  // White railings and a line of lifeboats on both sides.
  for (const s of [-1, 1]) {
    const far = vx + s * W * 0.12, near = vx + s * W * 0.82;
    const top = (d) => hz + H * 0.04 + (H * 1.1 - hz) * d * 0.62 - H * (0.012 + d * 0.13);
    const xAt = (d) => far + (near - far) * d;
    g.strokeStyle = '#F5F2EA'; g.lineCap = 'round';
    g.lineWidth = W * 0.008; g.beginPath(); g.moveTo(xAt(0), top(0)); g.lineTo(xAt(1), top(1)); g.stroke();
    for (let k = 0; k <= 12; k++) { const d = Math.pow(k / 12, 1.7); g.lineWidth = W * (0.002 + d * 0.006); g.beginPath(); g.moveTo(xAt(d), top(d)); g.lineTo(xAt(d), hz + H * 0.04 + (H * 1.1 - hz) * d * 0.62); g.stroke(); }
    for (let k = 1; k <= 3; k++) {
      // Lifeboats hang from davits just above the railing: white hull, dark keel line, a cover.
      const d = Math.pow(k / 4, 1.6), x = xAt(d) - s * W * 0.01, w = W * (0.06 + d * 0.2), h = w * 0.32, y = top(d) - h * 1.2;
      g.strokeStyle = '#6E737D'; g.lineWidth = W * (0.002 + d * 0.004);
      g.beginPath(); g.moveTo(x - w * 0.38, top(d)); g.quadraticCurveTo(x - w * 0.45, y - h * 0.9, x - w * 0.3, y - h * 0.4); g.moveTo(x + w * 0.38, top(d)); g.quadraticCurveTo(x + w * 0.45, y - h * 0.9, x + w * 0.3, y - h * 0.4); g.stroke();
      g.fillStyle = '#F7F4EC'; g.beginPath(); g.moveTo(x - w / 2, y - h * 0.2); g.quadraticCurveTo(x, y + h * 0.9, x + w / 2, y - h * 0.2); g.closePath(); g.fill();
      g.fillStyle = '#B8562F'; g.fillRect(x - w * 0.42, y - h * 0.38, w * 0.84, h * 0.22);
      g.strokeStyle = 'rgba(30,30,40,0.5)'; g.lineWidth = W * 0.002; g.beginPath(); g.moveTo(x - w * 0.45, y + h * 0.05); g.quadraticCurveTo(x, y + h * 0.55, x + w * 0.45, y + h * 0.05); g.stroke();
    }
  }
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

// An ancient stone wall winding over green hills, with square watchtowers (landmark walls).
P.wall = (g, W, H, r) => {
  const hz = H * 0.5;
  skyBand(g, W, H, hz, '#5AA9E6', '#DDF0FA', true, 0.82, 0.13);
  ridge(g, W, hz + H * 0.0, H * 0.12, mix('#7FAF8E', '#DDF0FA', 0.55), 7, { bottom: H * 2, bumps: 4 });
  ridge(g, W, hz + H * 0.06, H * 0.1, mix('#5E9E62', '#DDF0FA', 0.25), 19, { bottom: H * 2, bumps: 3 });
  vGrad(g, -W, hz + H * 0.13, W * 3, H, [[0, '#5DA758'], [1, '#3C8040']]);
  // The wall: a band following a curve over the hills, nearer (wider) toward the bottom right.
  const path = (k) => {
    const x = -W * 0.25 + k * W * 1.5;
    const y = hz + H * (0.02 + 0.22 * k * k) + Math.sin(k * 7.5 + 0.6) * H * 0.035;
    return [x, y, H * (0.012 + 0.05 * k * k)];
  };
  const N = 60;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) { const [x, y, h] = path(i / N); top.push([x, y - h]); bot.push([x, y]); }
  g.fillStyle = '#B9A68A';
  g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); [...bot].reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
  // Walkway top and shadowed face.
  g.strokeStyle = '#8E7B62'; g.lineWidth = Math.max(1, W * 0.003);
  g.beginPath(); bot.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  for (let i = 0; i <= N; i += 2) { const [x, y, h] = path(i / N); g.fillStyle = '#A8957A'; g.fillRect(x - h * 0.22, y - h * 1.45, h * 0.44, h * 0.5); }
  // Stone courses on the near part.
  g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#7E6C55';
  for (let i = N / 2; i < N; i++) { const [x, y, h] = path(i / N); for (let c = 1; c < 4; c++) { g.beginPath(); g.moveTo(x - h * 0.6, y - h * c / 4); g.lineTo(x + h * 0.6, y - h * c / 4); g.stroke(); } }
  g.restore();
  // Watchtowers along it.
  for (const k of [0.22, 0.5, 0.82]) {
    const [x, y, h] = path(k);
    box(g, x - h * 1.1, y - h * 2.6, h * 2.2, h * 2.6, '#C2AF92', { side: h * 0.5, top: h * 0.3 });
    g.fillStyle = '#5A4A38'; g.fillRect(x - h * 0.25, y - h * 1.9, h * 0.5, h * 0.7);
    for (let c = 0; c < 4; c++) { g.fillStyle = '#B09D80'; g.fillRect(x - h * 1.1 + c * h * 0.62, y - h * 3.0, h * 0.36, h * 0.42); }
  }
  for (let k = 0; k < 8; k++) { const d = r(), x = r() * W; tree(g, x, hz + H * (0.3 + d * 0.15), H * (0.03 + d * 0.04), mix('#3E8E4A', '#A9CDBA', 0.3 - d * 0.25)); }
};

// A school classroom (also stands in for halls and cafeterias): chalkboard, windows, clock, desks.
P.school = (g, W, H, r) => {
  const hz = H * 0.6;
  roomShell(g, W, H, '#E8E2C8', '#B98C5E', hz);
  // Windows along the left wall with daylight.
  for (let k = 0; k < 2; k++) {
    const wx = W * (0.04 + k * 0.2), wy = H * 0.16, ww = W * 0.16, wh = H * 0.24;
    vGrad(g, wx, wy, ww, wh, [[0, '#7CC0EE'], [1, '#DDF1FB']]);
    g.fillStyle = '#86C28A'; g.fillRect(wx, wy + wh * 0.75, ww, wh * 0.25);
    g.fillStyle = '#FFFFFF'; g.fillRect(wx - W * 0.008, wy - W * 0.008, ww + W * 0.016, W * 0.01); g.fillRect(wx + ww / 2 - W * 0.004, wy, W * 0.008, wh); g.fillRect(wx - W * 0.01, wy + wh, ww + W * 0.02, W * 0.012);
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#FFF6D8'; g.beginPath(); g.moveTo(wx, hz); g.lineTo(wx + ww, hz); g.lineTo(wx + ww * 2.2, H); g.lineTo(wx + ww * 0.8, H); g.closePath(); g.fill(); g.restore();
  }
  // Chalkboard with chalk scribbles, and a clock above it.
  const bx = W * 0.47, by = H * 0.17, bw = W * 0.48, bh = H * 0.2;
  g.fillStyle = '#7A5A3A'; g.fillRect(bx - W * 0.012, by - W * 0.012, bw + W * 0.024, bh + W * 0.024);
  vGrad(g, bx, by, bw, bh, [[0, '#2F5D4A'], [1, '#264C3C']]);
  g.save(); g.strokeStyle = 'rgba(240,240,230,0.75)'; g.lineWidth = Math.max(1, W * 0.003); g.lineCap = 'round';
  for (let k = 0; k < 4; k++) { g.beginPath(); const y = by + bh * (0.2 + k * 0.18); g.moveTo(bx + bw * 0.08, y); for (let i = 1; i < 10; i++) g.lineTo(bx + bw * (0.08 + i * 0.07 * (0.6 + r() * 0.5)), y + (r() - 0.5) * bh * 0.04); g.stroke(); }
  g.restore();
  g.fillStyle = '#F5F2E8'; g.beginPath(); g.arc(W * 0.71, H * 0.1, W * 0.035, 0, TAU); g.fill();
  g.strokeStyle = '#3A3F4B'; g.lineWidth = Math.max(1, W * 0.004); g.stroke();
  g.beginPath(); g.moveTo(W * 0.71, H * 0.1); g.lineTo(W * 0.71, H * 0.1 - W * 0.022); g.moveTo(W * 0.71, H * 0.1); g.lineTo(W * 0.71 + W * 0.016, H * 0.1); g.stroke();
  // Rows of desks in perspective.
  for (let row = 0; row < 3; row++) {
    const y = hz + H * (0.04 + row * row * 0.05 + row * 0.04), s = 0.6 + row * 0.35;
    for (let c = 0; c < 4; c++) {
      const x = W * (0.12 + c * 0.25) + (row - 1) * W * 0.03 * (c - 1.5);
      const dw = W * 0.14 * s, dh = H * 0.018 * s;
      shadow(g, x + dw / 2, y + H * 0.05 * s, dw * 0.55, H * 0.006 * s);
      g.fillStyle = '#6E5236'; g.fillRect(x + dw * 0.08, y, dw * 0.05, H * 0.05 * s); g.fillRect(x + dw * 0.87, y, dw * 0.05, H * 0.05 * s);
      box(g, x, y - dh, dw, dh, '#D6A66B', { top: dh * 0.9, side: 0 });
    }
  }
};

// ---------- 1.4: space-station rooms (lit like 3D cartoon shorts: cool panels, warm accents) ----------
function panels(g, W, H, top, bottom, color, cols = 5, rows = 3) {
  vGrad(g, -W, top - H, W * 3, bottom - top + H, [[0, shade(color, -0.25)], [1, shade(color, 0.04)]]);
  g.save(); g.strokeStyle = shade(color, -0.35); g.lineWidth = Math.max(2, W * 0.004);
  for (let c = -2; c <= cols + 2; c++) { const x = c * W / cols; g.beginPath(); g.moveTo(x, top - H); g.lineTo(x, bottom); g.stroke(); }
  for (let r = 0; r <= rows; r++) { const y = top + (bottom - top) * r / rows; g.beginPath(); g.moveTo(-W, y); g.lineTo(W * 2, y); g.stroke(); }
  g.fillStyle = shade(color, 0.25);
  for (let c = -2; c <= cols + 2; c++) for (let r = 0; r < rows; r++) {
    const x = c * W / cols, y = top + (bottom - top) * r / rows;
    for (const [dx, dy] of [[0.06, 0.08], [0.94, 0.08], [0.06, 0.92], [0.94, 0.92]]) { g.beginPath(); g.arc(x + dx * W / cols, y + dy * (bottom - top) / rows, W * 0.0035, 0, TAU); g.fill(); }
  }
  g.restore();
}
function porthole(g, x, y, w, h, rad, earth = true) {
  g.save();
  g.fillStyle = '#5A6275'; g.beginPath(); g.roundRect(x - w * 0.06, y - w * 0.06, w * 1.12, h + w * 0.12, rad * 1.3); g.fill();
  g.beginPath(); g.roundRect(x, y, w, h, rad); g.clip();
  vGrad(g, x, y, w, h, [[0, '#03050F'], [1, '#0B1030']]);
  const r = rng(Math.round(x + y));
  g.fillStyle = '#FFFFFF';
  for (let k = 0; k < 60; k++) { g.globalAlpha = 0.4 + r() * 0.6; g.beginPath(); g.arc(x + r() * w, y + r() * h, Math.max(0.8, w * 0.004 * r()), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  if (earth) {
    const R = w * 1.3, cx = x + w * 0.42, cy = y + h + R * 0.8;
    const eg = g.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.2, cx, cy, R);
    eg.addColorStop(0, '#5FD0FF'); eg.addColorStop(0.85, '#2F7FD8'); eg.addColorStop(1, '#1C4FA0');
    g.fillStyle = eg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (r() - 0.5) * 1.1, d = R * (0.86 + r() * 0.12); g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * (0.05 + r() * 0.08), w * 0.018, a + Math.PI / 2, 0, TAU); g.fill(); }
    glow(g, cx, cy - R, w * 0.5, 'rgba(140,210,255,0.55)');
  }
  g.restore();
  g.save(); g.strokeStyle = '#2A2F3C'; g.lineWidth = w * 0.03; g.beginPath(); g.roundRect(x, y, w, h, rad); g.stroke(); g.restore();
}
function checker(g, W, H, hz, a = '#F2F2F2', b = '#151515') {
  // A checkered floor in perspective, wide enough for pans and whips (a base colour under it too).
  g.fillStyle = '#7c7c80'; g.fillRect(-W * 1.5, hz, W * 4, H * 1.5);
  const n = 26;
  for (let row = 0; row < 8; row++) {
    const y0 = hz + (H - hz) * Math.pow(row / 8, 1.6), y1 = hz + (H - hz) * Math.pow((row + 1) / 8, 1.6) + 1;
    const s0 = 0.35 + 0.65 * (row / 8), s1 = 0.35 + 0.65 * ((row + 1) / 8);
    for (let c = -n; c < n; c++) {
      g.fillStyle = (row + c) % 2 ? a : b;
      const xa = W / 2 + c * W * 0.16 * s0 * 1.6, xb = W / 2 + (c + 1) * W * 0.16 * s0 * 1.6, xc = W / 2 + (c + 1) * W * 0.16 * s1 * 1.6, xd = W / 2 + c * W * 0.16 * s1 * 1.6;
      g.beginPath(); g.moveTo(xa, y0); g.lineTo(xb, y0); g.lineTo(xc, y1); g.lineTo(xd, y1); g.closePath(); g.fill();
    }
  }
  vGrad(g, -W, hz, W * 3, H * 0.06, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
}

P.cabin = (g, W, H, r) => {
  const hz = H * 0.6;
  panels(g, W, H, H * 0.02, hz, '#2B3550', 4, 3);
  porthole(g, W * 0.12, H * 0.08, W * 0.76, H * 0.28, W * 0.09, true);
  // A wooden ledge under the window, a little plant, a pole and a light strip.
  box(g, -W * 0.1, H * 0.385, W * 1.2, H * 0.014, '#8A5A3A', { top: H * 0.01, topColor: '#A8714A' });
  const px = W * 0.8, py = H * 0.385;
  box(g, px - W * 0.02, py - H * 0.022, W * 0.04, H * 0.022, '#F4F1EA');
  for (let k = 0; k < 4; k++) { g.fillStyle = '#4FB062'; g.beginPath(); g.ellipse(px + (k - 1.5) * W * 0.008, py - H * 0.035, W * 0.004, H * 0.016, (k - 1.5) * 0.3, 0, TAU); g.fill(); }
  g.fillStyle = '#E07B2C'; g.fillRect(W * 0.93, -H * 0.1, W * 0.016, hz + H * 0.1);
  glow(g, W * 0.938, H * 0.25, W * 0.12, 'rgba(255,170,90,0.35)');
  g.fillStyle = '#9FE7FF'; g.fillRect(-W, H * 0.015, W * 3, H * 0.006); glow(g, W * 0.5, H * 0.02, W * 0.6, 'rgba(150,220,255,0.25)');
  checker(g, W, H, hz);
};

P.control = (g, W, H, r) => {
  const hz = H * 0.62;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#1A2550'], [1, '#26356E']]);
  // Ceiling grid and a cyan light strip.
  g.save(); g.strokeStyle = 'rgba(160,190,255,0.35)'; g.lineWidth = Math.max(1, W * 0.002);
  for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(W / 2 + k * W * 0.12, -H * 0.1); g.lineTo(W / 2 + k * W * 0.3, H * 0.1); g.stroke(); }
  g.restore();
  g.fillStyle = '#8FEFFF'; g.fillRect(-W, H * 0.105, W * 3, H * 0.007); glow(g, W * 0.5, H * 0.11, W * 0.7, 'rgba(120,230,255,0.3)');
  // The big screen: a header bar with clocks, a ring and a big number.
  const sx = W * 0.04, sy = H * 0.16, sw = W * 0.92, sh = H * 0.3;
  box(g, sx - W * 0.015, sy - W * 0.015, sw + W * 0.03, sh + W * 0.03, '#11182F');
  vGrad(g, sx, sy, sw, sh, [[0, '#1C2A52'], [1, '#142040']]);
  g.fillStyle = '#0B1126'; g.fillRect(sx, sy, sw, sh * 0.16);
  g.fillStyle = '#FFC93C'; g.font = `700 ${Math.round(sh * 0.08)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
  ['0:12:04:17', '16:41:59', '12:02'].forEach((txt, i) => g.fillText(txt, sx + sw * (0.04 + i * 0.34), sy + sh * 0.08));
  g.strokeStyle = 'rgba(255,201,60,0.9)'; g.lineWidth = sh * 0.025; g.beginPath(); g.arc(sx + sw * 0.5, sy + sh * 0.58, sh * 0.26, -Math.PI / 2, Math.PI * 0.9); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(sx + sw * 0.03, sy + sh * 0.2, sw * 0.4, sh * 0.006);
  // Side monitors with lines.
  for (const mx of [-0.02, 0.84]) { box(g, W * mx, H * 0.48, W * 0.18, H * 0.1, '#11182F'); g.strokeStyle = '#7BE38A'; g.lineWidth = W * 0.003; g.beginPath(); for (let k = 0; k <= 10; k++) g.lineTo(W * (mx + 0.01 + k * 0.016), H * (0.54 + Math.sin(k * 1.7 + mx * 9) * 0.015)); g.stroke(); }
  // Consoles in front, with buttons.
  vGrad(g, -W, hz, W * 3, H, [[0, '#2C3B78'], [1, '#1D2754']]);
  g.save(); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < 160; k++) { g.fillRect(r() * W * 1.4 - W * 0.2, hz + r() * (H - hz), W * 0.004, W * 0.004); } g.restore();
  for (const cx of [0.02, 0.62]) {
    box(g, W * cx, hz - H * 0.02, W * 0.36, H * 0.05, '#E9EDF5', { top: H * 0.015, topColor: '#FFFFFF' });
    box(g, W * cx, hz + H * 0.03, W * 0.36, H * 0.08, '#3A4466');
    g.fillStyle = cx < 0.5 ? '#3EE08A' : '#FFD23C'; g.beginPath(); g.ellipse(W * (cx + 0.27), hz - H * 0.025, W * 0.035, H * 0.012, 0, 0, TAU); g.fill();
    glow(g, W * (cx + 0.27), hz - H * 0.03, W * 0.08, cx < 0.5 ? 'rgba(80,255,160,0.5)' : 'rgba(255,220,80,0.5)');
  }
};

P.bunks = (g, W, H, r) => {
  const hz = H * 0.62;
  panels(g, W, H, H * 0.0, hz, '#243066', 4, 4);
  // A purple-blue wash, a small window, a sleeping bag on the wall and a drawing pinned up.
  vGrad(g, -W, -H, W * 3, hz + H, [[0, 'rgba(90,60,200,0.18)'], [1, 'rgba(40,60,160,0)']]);
  porthole(g, W * 0.08, H * 0.3, W * 0.22, H * 0.18, W * 0.05, false);
  g.fillStyle = '#5CC46A'; g.beginPath(); g.roundRect(W * 0.52, H * 0.16, W * 0.3, H * 0.4, W * 0.08); g.fill();
  g.strokeStyle = '#2E7D3A'; g.lineWidth = W * 0.008; g.stroke();
  g.fillStyle = '#7FDB8A'; g.beginPath(); g.roundRect(W * 0.55, H * 0.19, W * 0.24, H * 0.12, W * 0.05); g.fill();
  box(g, W * 0.08, H * 0.12, W * 0.18, H * 0.1, '#FFFFFF');
  g.fillStyle = '#5CB85C'; g.fillRect(W * 0.08, H * 0.2, W * 0.18, H * 0.02);
  g.strokeStyle = '#333'; g.lineWidth = W * 0.003; g.beginPath(); g.moveTo(W * 0.12, H * 0.2); g.lineTo(W * 0.15, H * 0.15); g.lineTo(W * 0.18, H * 0.2); g.stroke();
  g.fillStyle = '#FFC93C'; g.beginPath(); g.arc(W * 0.22, H * 0.145, W * 0.012, 0, TAU); g.fill();
  vGrad(g, -W, hz, W * 3, H, [[0, '#2A3366'], [1, '#1B2147']]);
  glow(g, W * 0.6, H * 0.05, W * 0.5, 'rgba(255,230,190,0.25)');
};

P.cockpit = (g, W, H, r) => {
  const hz = H * 0.66;
  vGrad(g, -W, -H, W * 3, H * 2, [[0, '#03050F'], [1, '#0A0F2A']]);
  const rr = rng(77);
  g.fillStyle = '#FFFFFF';
  for (let k = 0; k < 220; k++) { g.globalAlpha = 0.35 + rr() * 0.65; g.beginPath(); g.arc(rr() * W * 1.4 - W * 0.2, rr() * hz, Math.max(0.8, W * 0.003 * rr()), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  // The windshield frame: a trapezoid of struts, lit at the edges.
  g.fillStyle = '#2B3148';
  g.beginPath(); g.moveTo(-W, -H); g.lineTo(W * 2, -H); g.lineTo(W * 2, H * 0.06); g.lineTo(W * 0.78, H * 0.1); g.lineTo(W * 0.22, H * 0.1); g.lineTo(-W, H * 0.06); g.closePath(); g.fill();
  for (const [x0, x1] of [[0.22, -0.05], [0.78, 1.05]]) { g.strokeStyle = '#3A4260'; g.lineWidth = W * 0.05; g.beginPath(); g.moveTo(W * x0, H * 0.1); g.lineTo(W * x1, hz); g.stroke(); g.strokeStyle = 'rgba(160,200,255,0.5)'; g.lineWidth = W * 0.006; g.stroke(); }
  // Hanging handles.
  for (const x of [0.4, 0.6]) { g.strokeStyle = '#8A93A8'; g.lineWidth = W * 0.008; g.beginPath(); g.moveTo(W * x, H * 0.1); g.lineTo(W * x, H * 0.2); g.stroke(); g.fillStyle = '#F2A65A'; g.fillRect(W * x - W * 0.01, H * 0.2, W * 0.02, H * 0.04); }
  // The control panel along the bottom.
  vGrad(g, -W, hz, W * 3, H, [[0, '#3A4260'], [1, '#1E2338']]);
  g.fillStyle = '#AEB6C8'; g.fillRect(-W, hz - H * 0.01, W * 3, H * 0.012);
  for (let k = 0; k < 18; k++) { const c = ['#3EE08A', '#FFD23C', '#FF5A5A', '#5AC8FF'][k % 4]; g.fillStyle = c; g.fillRect(W * (0.04 + k * 0.053), hz + H * 0.025 + (k % 3) * H * 0.012, W * 0.024, H * 0.008); }
};

// ---------- 1.6: more places for the narrator ----------
// A battlefield: smoky sky, mud, craters, a sandbag trench line, barbed wire and broken trees.
P.battlefield = (g, W, H, r) => {
  const hz = H * 0.5;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#5D6168'], [0.55, '#8A8478'], [1, '#C9B79A']]);
  glow(g, W * 0.72, H * 0.2, W * 0.5, 'rgba(255,190,120,0.35)');
  for (let k = 0; k < 4; k++) { const x = W * (0.1 + k * 0.27 + r() * 0.08); g.save(); g.globalAlpha = 0.5; for (let j = 0; j < 6; j++) { const cx = x + (r() - 0.5) * W * 0.08, cy = hz - H * (0.04 + j * 0.05), rr = H * (0.04 + j * 0.012); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(70,68,66,0.8)'); gr.addColorStop(1, 'rgba(70,68,66,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); } g.restore(); }
  ridge(g, W, hz + H * 0.01, H * 0.05, '#6E6656', 71, { bottom: H * 2, bumps: 4 });
  vGrad(g, -W, hz + H * 0.03, W * 3, H, [[0, '#6B5B45'], [1, '#3E3226']]);
  // Craters, near ones bigger.
  for (let k = 0; k < 9; k++) { const d = r(), x = r() * W, y = hz + H * (0.06 + d * d * 0.36), rx = W * (0.03 + d * 0.09), ry = rx * 0.28; g.fillStyle = '#2F271F'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.strokeStyle = '#7D6A50'; g.lineWidth = Math.max(1, rx * 0.12); g.beginPath(); g.ellipse(x, y - ry * 0.2, rx * 1.05, ry * 1.1, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  // Broken trees.
  for (const [x, h] of [[0.12, 0.2], [0.83, 0.15], [0.62, 0.09]]) { const bx = W * x, by = hz + H * 0.08 + h * H * 0.4; g.fillStyle = '#2E2620'; g.beginPath(); g.moveTo(bx - W * 0.008, by); g.lineTo(bx - W * 0.004, by - H * h); g.lineTo(bx + W * 0.006, by - H * h * 0.82); g.lineTo(bx + W * 0.009, by); g.closePath(); g.fill(); g.strokeStyle = '#2E2620'; g.lineWidth = W * 0.004; g.beginPath(); g.moveTo(bx, by - H * h * 0.6); g.lineTo(bx + W * 0.03, by - H * h * 0.78); g.stroke(); }
  // A sandbag wall across the foreground.
  const sy = H * 0.86;
  for (let row = 0; row < 3; row++) for (let k = -1; k < 14; k++) { const x = W * (k * 0.08 + (row % 2) * 0.04), y = sy - row * H * 0.028, w = W * 0.085, h = H * 0.032; const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); gr.addColorStop(0, '#C9B48A'); gr.addColorStop(1, '#8E7A55'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); g.fill(); }
  // Barbed wire on posts.
  g.strokeStyle = '#3A332C'; g.lineWidth = Math.max(1, W * 0.002);
  for (let k = 0; k < 7; k++) { const x = W * (0.04 + k * 0.16), y = hz + H * 0.17; g.fillStyle = '#4A3A2A'; g.fillRect(x, y - H * 0.06, W * 0.006, H * 0.06); }
  for (let line = 0; line < 2; line++) { g.beginPath(); for (let x = -W * 0.05; x < W * 1.05; x += W * 0.012) { const y = hz + H * (0.125 + line * 0.025) + Math.sin(x / W * 60) * H * 0.006; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
};
// A castle: stone walls, towers, red banners, a gate and a courtyard.
P.castle = (g, W, H, r) => {
  const hz = H * 0.56;
  skyBand(g, W, H, hz, '#6FB6EC', '#DCEFFA', true, 0.82, 0.12);
  ridge(g, W, hz, H * 0.06, mix('#6FAE73', '#DCEFFA', 0.45), 9, { bottom: H * 2, bumps: 3 });
  const stone = '#B8B2A6';
  // Wall and towers.
  box(g, W * 0.05, H * 0.24, W * 0.9, hz - H * 0.24, stone);
  for (let k = 0; k < 18; k++) { g.fillStyle = shade(stone, -0.05); g.fillRect(W * (0.05 + k * 0.05), H * 0.215, W * 0.03, H * 0.03); }
  for (const x of [0.02, 0.8]) { box(g, W * x, H * 0.12, W * 0.18, hz - H * 0.12, shade(stone, 0.04)); g.fillStyle = '#8C2F39'; g.beginPath(); g.moveTo(W * (x - 0.01), H * 0.12); g.lineTo(W * (x + 0.09), H * 0.02); g.lineTo(W * (x + 0.19), H * 0.12); g.closePath(); g.fill(); g.fillStyle = '#3A3530'; g.fillRect(W * (x + 0.075), H * 0.2, W * 0.03, H * 0.06); }
  // Stone courses.
  g.strokeStyle = shade(stone, -0.14); g.lineWidth = Math.max(1, W * 0.0015);
  for (let y = H * 0.27; y < hz; y += H * 0.035) { g.beginPath(); g.moveTo(W * 0.2, y); g.lineTo(W * 0.8, y); g.stroke(); }
  // Gate.
  g.fillStyle = '#3E2E22'; g.beginPath(); g.moveTo(W * 0.42, hz); g.lineTo(W * 0.42, H * 0.38); g.arc(W * 0.5, H * 0.38, W * 0.08, Math.PI, 0); g.lineTo(W * 0.58, hz); g.closePath(); g.fill();
  g.strokeStyle = '#6B5640'; g.lineWidth = W * 0.006; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(W * (0.42 + k * 0.032), H * 0.33); g.lineTo(W * (0.42 + k * 0.032), hz); g.stroke(); }
  // Red banners.
  for (const x of [0.3, 0.66]) { g.fillStyle = '#C8102E'; g.beginPath(); g.moveTo(W * x, H * 0.27); g.lineTo(W * (x + 0.05), H * 0.27); g.lineTo(W * (x + 0.05), H * 0.42); g.lineTo(W * (x + 0.025), H * 0.39); g.lineTo(W * x, H * 0.42); g.closePath(); g.fill(); g.fillStyle = '#F2C230'; g.beginPath(); g.arc(W * (x + 0.025), H * 0.32, W * 0.012, 0, TAU); g.fill(); }
  // Courtyard.
  vGrad(g, -W, hz, W * 3, H, [[0, '#C8BBA0'], [1, '#9A8B6E']]);
  rows(g, W, hz, H * 1.2, 9, 'rgba(90,75,55,0.35)', Math.max(1, W * 0.0015));
};
// A hospital room: pale walls, a bed, a heart monitor and a red cross.
P.hospital = (g, W, H, r) => {
  const hz = H * 0.58;
  roomShell(g, W, H, '#E6F0F2', '#CFE0E3', hz);
  box(g, W * 0.3, H * 0.12, W * 0.16, H * 0.16, '#FFFFFF'); g.fillStyle = '#E5242F'; g.fillRect(W * 0.365, H * 0.14, W * 0.03, H * 0.12); g.fillRect(W * 0.32, H * 0.185, W * 0.12, W * 0.03);
  // Monitor on an arm.
  box(g, W * 0.66, H * 0.14, W * 0.24, H * 0.14, '#2B3440'); vGrad(g, W * 0.675, H * 0.152, W * 0.21, H * 0.116, [[0, '#0E2A22'], [1, '#06150F']]);
  g.fillStyle = '#8A96A3'; g.fillRect(W * 0.775, H * 0.28, W * 0.01, H * 0.1);
  // Bed with a blanket.
  box(g, W * 0.2, hz - H * 0.02, W * 0.6, H * 0.06, '#FFFFFF', { top: H * 0.03, topColor: '#F4F8FA' });
  g.fillStyle = '#7FB3D9'; g.fillRect(W * 0.38, hz - H * 0.045, W * 0.42, H * 0.045);
  box(g, W * 0.2, hz - H * 0.1, W * 0.04, H * 0.14, '#B7C3CC');
  g.fillStyle = '#B7C3CC'; for (const x of [0.22, 0.78]) g.fillRect(W * x, hz + H * 0.04, W * 0.01, H * 0.07);
  // A curtain rail.
  g.fillStyle = '#9FB8C4'; g.fillRect(W * 0.02, H * 0.05, W * 0.96, H * 0.008);
  for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#9CCFD8' : '#8EC4CE'; g.fillRect(W * (0.02 + k * 0.025), H * 0.058, W * 0.025, H * 0.42); }
  for (const x of [0.3, 0.7]) glow(g, W * x, 0, W * 0.3, 'rgba(235,250,255,0.6)');
};
// A museum hall: framed paintings, a statue on a plinth, rope barriers and spotlights.
P.museum = (g, W, H, r) => {
  const hz = H * 0.6;
  roomShell(g, W, H, '#D9CBB4', '#8C6A4B', hz);
  const frames = [[0.06, 0.16, 0.2, 0.18, ['#3E6FA8', '#E8C15A']], [0.4, 0.12, 0.2, 0.24, ['#7E4E9C', '#F08A5D']], [0.74, 0.16, 0.2, 0.18, ['#2F8F6A', '#F2E3A0']]];
  for (const [x, y, w, h, [a, b]] of frames) { box(g, W * (x - 0.012), H * (y - 0.012), W * (w + 0.024), H * (h + 0.024), '#B8892F'); vGrad(g, W * x, H * y, W * w, H * h, [[0, a], [1, b]]); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(W * (x + w * 0.6), H * (y + h * 0.4), W * w * 0.18, 0, TAU); g.fill(); glow(g, W * (x + w / 2), H * (y - 0.03), W * 0.18, 'rgba(255,240,200,0.55)'); }
  // A plinth with a vase.
  box(g, W * 0.44, hz - H * 0.1, W * 0.12, H * 0.12, '#F2EEE6', { top: H * 0.012, topColor: '#FFFFFF' });
  g.fillStyle = '#C46A3A'; g.beginPath(); g.moveTo(W * 0.48, hz - H * 0.1); g.quadraticCurveTo(W * 0.455, hz - H * 0.15, W * 0.485, hz - H * 0.18); g.lineTo(W * 0.515, hz - H * 0.18); g.quadraticCurveTo(W * 0.545, hz - H * 0.15, W * 0.52, hz - H * 0.1); g.closePath(); g.fill();
  // Rope barriers.
  for (const x of [0.15, 0.35, 0.65, 0.85]) { g.fillStyle = '#C9A13B'; g.fillRect(W * x, hz + H * 0.02, W * 0.008, H * 0.07); }
  g.strokeStyle = '#B0122A'; g.lineWidth = W * 0.006; for (const [a, b] of [[0.15, 0.35], [0.65, 0.85]]) { g.beginPath(); g.moveTo(W * a, hz + H * 0.03); g.quadraticCurveTo(W * (a + b) / 2, hz + H * 0.06, W * b, hz + H * 0.03); g.stroke(); }
};
// A stadium: stands full of people, floodlights and a striped pitch.
P.stadium = (g, W, H, r) => {
  const hz = H * 0.5;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#2A4F8F'], [1, '#86B7E8']]);
  vGrad(g, -W, H * 0.16, W * 3, hz - H * 0.16, [[0, '#3B3F4E'], [1, '#575C6C']]);
  for (let k = 0; k < 900; k++) { const x = r() * W * 1.2 - W * 0.1, y = H * (0.18 + r() * 0.3); g.fillStyle = ['#E5484D', '#FFFFFF', '#F0B429', '#3F7FD9', '#2E3440'][k % 5]; g.fillRect(x, y, W * 0.006, H * 0.006); }
  for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-W, H * (0.2 + k * 0.06), W * 3, H * 0.004); }
  for (const x of [0.1, 0.9]) { g.fillStyle = '#4A505E'; g.fillRect(W * x - W * 0.006, H * 0.02, W * 0.012, H * 0.16); box(g, W * x - W * 0.05, H * 0.0, W * 0.1, H * 0.04, '#E8EEF5'); glow(g, W * x, H * 0.02, W * 0.3, 'rgba(255,255,240,0.7)'); }
  vGrad(g, -W, hz, W * 3, H, [[0, '#4FAE4A'], [1, '#2F7E33']]);
  for (let k = 0; k < 8; k++) { const y0 = hz + (H - hz) * Math.pow(k / 8, 1.8), y1 = hz + (H - hz) * Math.pow((k + 1) / 8, 1.8); if (k % 2) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(-W, y0, W * 3, y1 - y0); } }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(2, W * 0.004);
  g.beginPath(); g.moveTo(-W, hz + H * 0.04); g.lineTo(W * 2, hz + H * 0.04); g.stroke();
  g.beginPath(); g.ellipse(W * 0.5, hz + H * 0.2, W * 0.22, H * 0.06, 0, 0, TAU); g.stroke();
};
// A kitchen: tiles, a stove with a pot, a fridge and a counter.
P.kitchen = (g, W, H, r) => {
  const hz = H * 0.6;
  roomShell(g, W, H, '#F4EBDD', '#C9B08E', hz);
  g.strokeStyle = 'rgba(160,140,110,0.35)'; g.lineWidth = Math.max(1, W * 0.0015);
  for (let y = H * 0.26; y < hz - H * 0.08; y += H * 0.03) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += W * 0.05) { g.beginPath(); g.moveTo(x, H * 0.26); g.lineTo(x, hz - H * 0.08); g.stroke(); }
  // Cabinets up top.
  for (let k = 0; k < 4; k++) box(g, W * (0.04 + k * 0.17), H * 0.06, W * 0.15, H * 0.16, '#E9876B', { top: 0 });
  // Fridge.
  box(g, W * 0.78, H * 0.12, W * 0.18, hz - H * 0.1, '#E8EDF2'); g.fillStyle = '#9AA6B2'; g.fillRect(W * 0.8, H * 0.2, W * 0.008, H * 0.1); g.fillRect(W * 0.78, H * 0.33, W * 0.18, H * 0.004);
  // Counter and stove.
  box(g, W * 0.0, hz - H * 0.08, W * 0.76, H * 0.12, '#D8A06A', { top: H * 0.02, topColor: '#F2EDE4' });
  g.fillStyle = '#2E3440'; for (const x of [0.3, 0.42]) { g.beginPath(); g.ellipse(W * x, hz - H * 0.088, W * 0.04, H * 0.008, 0, 0, TAU); g.fill(); }
  box(g, W * 0.26, hz - H * 0.15, W * 0.1, H * 0.06, '#C8102E', { top: H * 0.01 });
  g.fillStyle = '#7A4E2E'; g.fillRect(W * 0.08, hz - H * 0.11, W * 0.12, H * 0.012);
};
// A jungle: layers of big leaves, hanging vines, light shafts.
P.jungle = (g, W, H, r) => {
  const hz = H * 0.62;
  vGrad(g, -W, -H, W * 3, H * 2, [[0, '#BFE6A8'], [0.5, '#5FAE5A'], [1, '#2E6B33']]);
  rays(g, W, H, W * 0.6, -H * 0.1, 3, 'rgba(255,255,220,0.12)');
  const leaf = (x, y, s, a, c) => { g.save(); g.translate(x, y); g.rotate(a); const gr = g.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, shade(c, 0.2)); gr.addColorStop(1, shade(c, -0.2)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.5, 0, -s * 1.3); g.quadraticCurveTo(-s * 0.5, -s * 0.5, 0, 0); g.fill(); g.restore(); };
  for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 18; k++) { const x = r() * W * 1.2 - W * 0.1, y = H * (0.25 + layer * 0.18 + r() * 0.12), c = mix(['#2F7D3F', '#3E9A4A', '#4FB25A'][layer], '#BFE6A8', 0.35 - layer * 0.15); leaf(x, y, H * (0.06 + layer * 0.03), (r() - 0.5) * 1.6, c); }
  g.strokeStyle = '#3E6B2E'; g.lineWidth = Math.max(2, W * 0.004);
  for (let k = 0; k < 6; k++) { const x = r() * W; g.beginPath(); g.moveTo(x, -H * 0.1); g.quadraticCurveTo(x + W * 0.03, H * 0.2, x - W * 0.01, H * (0.3 + r() * 0.2)); g.stroke(); }
  vGrad(g, -W, hz, W * 3, H, [[0, '#4F7A35'], [1, '#2E4A22']]);
  for (let k = 0; k < 10; k++) leaf(r() * W, H * (0.95 + r() * 0.1), H * 0.14, (r() - 0.5) * 1.2, '#2F7D3F');
};
// A volcano: a cone with a glowing crater, lava rivers and an ash sky.
P.volcano = (g, W, H, r) => {
  const hz = H * 0.6;
  vGrad(g, -W, -H, W * 3, hz + H, [[0, '#3A2E3A'], [0.6, '#A0523A'], [1, '#E8A060']]);
  g.fillStyle = '#4A3A3A'; g.beginPath(); g.moveTo(W * 0.05, hz); g.lineTo(W * 0.4, H * 0.18); g.lineTo(W * 0.6, H * 0.18); g.lineTo(W * 0.95, hz); g.closePath(); g.fill();
  const lg = g.createLinearGradient(W * 0.4, 0, W * 0.95, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = lg; g.fill();
  glow(g, W * 0.5, H * 0.18, W * 0.3, 'rgba(255,140,40,0.75)');
  g.fillStyle = '#FF7A1A'; g.beginPath(); g.ellipse(W * 0.5, H * 0.185, W * 0.1, H * 0.015, 0, 0, TAU); g.fill();
  g.strokeStyle = '#FF8C2A'; g.lineWidth = W * 0.012; g.lineCap = 'round';
  for (const [a, b] of [[0.46, 0.3], [0.55, 0.72]]) { g.beginPath(); g.moveTo(W * a, H * 0.2); g.quadraticCurveTo(W * (a + b) / 2 + W * 0.04, H * 0.38, W * b, hz); g.stroke(); }
  vGrad(g, -W, hz, W * 3, H, [[0, '#3A3030'], [1, '#1E1818']]);
  for (let k = 0; k < 12; k++) { const x = r() * W, y = hz + H * (0.05 + r() * 0.3); g.fillStyle = '#2A2222'; g.beginPath(); g.ellipse(x, y, W * 0.04, H * 0.012, 0, 0, TAU); g.fill(); }
};

// The colours to paint beyond the world's edges, for camera pans and whips.
const EDGE = {
  sky: ['#5FB2EC', '#3F8E3F'], field: ['#5FB2EC', '#3F8E3F'], road: ['#5AAFEA', '#3F8B3B'], rails: ['#4F9BE0', '#8C6544'],
  sea: ['#4FA6E8', '#C48A45'], water: ['#4FA6E8', '#C48A45'], desert: ['#5FA9E4', '#C48A45'], mountains: ['#4C9DE3', '#367F3A'],
  snow: ['#8EC1EA', '#D6E3F0'], forest: ['#8CCB74', '#4E7F33'], city: ['#5AA9E8', '#5D6470'], night: ['#0E1636', '#171A30'],
  space: ['#070A1C', '#6D6F7C'], temple: ['#4FA3E6', '#B69D62'], room: ['#E8D0A2', '#A9784A'], shop: ['#EDDB98', '#C9C6BE'],
  office: ['#DCE2E9', '#98A3B2'], lab: ['#D6E2E6', '#B9C1C8'], cabin: ['#2B3550', '#7c7c80'], control: ['#1A2550', '#1D2754'], bunks: ['#243066', '#1B2147'], cockpit: ['#03050F', '#1E2338'], school: ['#E8E2C8', '#B98C5E'], wall: ['#5AA9E6', '#3C8040'], bridge: ['#5AA9E8', '#2F86C2'], underwater: ['#59C3EE', '#A88E58'],
  battlefield: ['#5D6168', '#3E3226'], castle: ['#6FB6EC', '#9A8B6E'], hospital: ['#DDE9EC', '#B9CDD1'], museum: ['#CBBBA2', '#7A5B3E'], stadium: ['#2A4F8F', '#2F7E33'], kitchen: ['#EADFCB', '#B89C78'], jungle: ['#BFE6A8', '#2E4A22'], volcano: ['#3A2E3A', '#1E1818'],
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
  const outdoor = !['room', 'shop', 'office', 'lab', 'school', 'underwater', 'space', 'night', 'cabin', 'control', 'bunks', 'cockpit', 'battlefield', 'hospital', 'museum', 'kitchen', 'jungle', 'volcano', 'stadium'].includes(id);
  if (outdoor && id !== 'forest') {
    for (let k = 0; k < 3; k++) { const s = W * (0.08 + r() * 0.07), y = H * (0.04 + r() * 0.2), sp = 0.008 + r() * 0.01; const x = (((r() + t * sp) % 1.4) - 0.2) * W; cloud(ctx, x, y, s, 0.95); }
    // A pair of birds crossing now and then.
    const bt = (t * 0.05 + r()) % 1;
    if (bt < 0.5) { const bx = W * (bt * 2.4 - 0.2), by = H * 0.12; ctx.strokeStyle = 'rgba(40,40,50,0.7)'; ctx.lineWidth = W * 0.003; for (const o of [0, 1]) { const x = bx + o * W * 0.05, y = by + o * H * 0.01, f = Math.sin(t * 9 + o) * W * 0.008; ctx.beginPath(); ctx.moveTo(x - W * 0.015, y - f); ctx.quadraticCurveTo(x - W * 0.005, y - W * 0.008, x, y); ctx.quadraticCurveTo(x + W * 0.005, y - W * 0.008, x + W * 0.015, y - f); ctx.stroke(); } }
  }
  if (id === 'sea' || id === 'water' || id === 'bridge' || id === 'deck') {
    const hz = H * (id === 'bridge' ? 0.48 : id === 'deck' ? 0.44 : 0.46);
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
  if (id === 'cockpit') {
    // Stars streaming past the windshield.
    ctx.fillStyle = '#FFFFFF';
    for (let k = 0; k < 40; k++) { const a = r() * TAU, d = ((r() + t * (0.08 + r() * 0.1)) % 1), x = W / 2 + Math.cos(a) * d * W * 0.8, y = H * 0.36 + Math.sin(a) * d * H * 0.35; if (y > H * 0.62) continue; ctx.globalAlpha = d; ctx.beginPath(); ctx.arc(x, y, W * 0.002 * (1 + d * 2), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (id === 'control') {
    // The big number counts down on the screen.
    const n = 3 - (Math.floor(t) % 4);
    ctx.save(); ctx.fillStyle = '#FFF4C2'; ctx.shadowColor = 'rgba(255,220,120,0.9)'; ctx.shadowBlur = W * 0.03;
    ctx.font = `800 ${Math.round(H * 0.13)}px Montserrat, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), W * 0.5, H * (0.16 + 0.3 * 0.58)); ctx.restore();
  }
  if (id === 'forest') {
    ctx.fillStyle = 'rgba(255,250,200,0.8)';
    for (let k = 0; k < 18; k++) { const x = (r() + Math.sin(t * 0.4 + k) * 0.03) * W, y = H * (0.35 + r() * 0.4) + Math.sin(t * 0.7 + k * 2) * H * 0.01, s = W * (0.002 + r() * 0.003); ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + k)); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (id === 'battlefield') {
    // Smoke drifting across, and now and then a distant flash.
    for (let k = 0; k < 5; k++) { const x = (((r() + t * 0.012 * (1 + k * 0.2)) % 1.4) - 0.2) * W, y = H * (0.3 + r() * 0.15), rr = W * (0.12 + r() * 0.1); const gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,115,110,0.28)'); gr.addColorStop(1, 'rgba(120,115,110,0)'); ctx.fillStyle = gr; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    const f = (t * 0.6) % 3; if (f < 0.15) glow(ctx, W * (0.2 + ((Math.floor(t * 0.6 / 3) * 0.37) % 0.6)), H * 0.47, W * 0.25, 'rgba(255,200,120,0.6)', 1 - f / 0.15);
  }
  if (id === 'volcano') {
    for (let k = 0; k < 30; k++) { const life = (r() + t * (0.2 + r() * 0.3)) % 1, x = W * (0.5 + (r() - 0.5) * 0.2 * (1 + life * 2)), y = H * 0.18 - life * H * 0.2; ctx.globalAlpha = 1 - life; ctx.fillStyle = k % 3 ? '#FFB347' : '#FF5A1F'; ctx.beginPath(); ctx.arc(x, y, W * 0.004, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (id === 'kitchen') {
    // Steam from the pot.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(2, W * 0.004); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const x = W * (0.29 + k * 0.025), ph = t * 2 + k; ctx.beginPath(); for (let j = 0; j < 12; j++) { const y = H * 0.44 - j * H * 0.012 - ((t * 0.05) % 0.02) * H; const xx = x + Math.sin(ph + j * 0.6) * W * 0.008; j ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); } ctx.stroke(); }
  }
  if (id === 'hospital') {
    // The heartbeat line on the monitor.
    const x0 = W * 0.675, x1 = W * 0.885, yc = H * 0.21;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, H * 0.152, x1 - x0, H * 0.116); ctx.clip();
    ctx.strokeStyle = '#46F08A'; ctx.lineWidth = Math.max(2, W * 0.003); ctx.beginPath();
    for (let x = x0; x <= x1; x += W * 0.003) { const u = ((x - x0) / (x1 - x0) + t * 0.5) % 1; const beat = u > 0.45 && u < 0.55 ? Math.sin((u - 0.45) / 0.1 * TAU) * H * 0.035 : 0; x === x0 ? ctx.moveTo(x, yc - beat) : ctx.lineTo(x, yc - beat); }
    ctx.stroke(); ctx.restore();
  }
  if (id === 'stadium') {
    // Camera flashes in the crowd.
    for (let k = 0; k < 6; k++) { const ph = (t * 1.3 + k * 0.37) % 1; if (ph < 0.08) glow(ctx, W * ((k * 0.17 + Math.floor(t * 1.3) * 0.23) % 1), H * (0.22 + (k % 3) * 0.08), W * 0.03, 'rgba(255,255,255,0.9)'); }
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
