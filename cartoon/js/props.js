// Code-drawn sets and props. Same thick-outline flat cartoon as the cast.
// A video looks finished with zero AI images; a plate, if one arrives, only fills a window.

import { Ink, PropMini } from './cast.js';

import { drawProp, drawSticker } from './toons.js';
import { drawSet } from './sets.js';
import { drawWorld } from './worlds.js';

// Animated floating props (spinning Earth, eclipse shadow, ship sinking below the horizon…).
const TOONS = ['earth', 'moon', 'eclipse', 'ship', 'stick', 'bulb', 'question', 'exclaim', 'clock', 'book', 'thermometer', 'gear', 'atom', 'star', 'fire', 'drop', 'bolt'];
// Fully drawn, animated sets with their own scenery.
const RICH_SETS = ['temple', 'sea', 'city', 'mountains', 'snow', 'forest', 'underwater'];

export class PropKit {
  static KINDS = ['car', 'train', 'boat', 'house', 'counter', 'desk', 'phone', 'money', 'ticket', 'rocket', 'planet', 'tree', 'sign', 'chair', 'heart', 'lungs', 'stomach', 'magnet', 'sun', 'coin', 'engine', 'bridge', ...TOONS];
  static TOONS = TOONS;

  static behind(kind) {
    return ['house', 'tree', 'planet', 'desk', 'counter', 'chair', 'bridge', 'sign', 'sun'].includes(kind);
  }

  static draw(ctx, prop, u, ground, t) {
    const kind = prop.kind;
    if (prop.delay) { t -= prop.delay; if (t < 0) return; }
    ctx.save();
    ctx.translate(prop.x, ground);
    const s = u;
    if (kind === 'icon') {
      const lift = prop.y != null ? prop.y : 9.6;
      drawSticker(ctx, prop.emoji, 0, -lift * s, (prop.small ? 3.0 : 3.9) * (prop.scale || 1) * s, t);
      ctx.restore();
      return;
    }
    if (TOONS.includes(kind)) {
      // Floats above the cast and keeps moving.
      const lift = prop.y != null ? prop.y : 9.6;
      drawProp(ctx, kind, 0, -lift * s, 3.9 * (prop.scale || 1) * s, t);
      ctx.restore();
      return;
    }
    if (kind === 'train') PropKit.train(ctx, s, t);
    else if (kind === 'car') PropKit.car(ctx, s, t);
    else if (kind === 'boat') PropKit.boat(ctx, s, t);
    else if (kind === 'house') PropKit.house(ctx, s);
    else if (kind === 'counter') PropKit.counter(ctx, s);
    else if (kind === 'desk') PropKit.desk(ctx, s);
    else if (kind === 'chair') PropKit.chair(ctx, s);
    else if (kind === 'tree') PropKit.tree(ctx, s, t);
    else if (kind === 'rocket') PropKit.rocket(ctx, s, t);
    else if (kind === 'planet') PropKit.planet(ctx, s, t);
    else if (kind === 'sign') PropKit.sign(ctx, s);
    else if (kind === 'bridge') PropKit.bridge(ctx, s);
    else if (kind === 'sun') PropKit.sun(ctx, s, t, prop);
    else if (kind === 'engine') PropKit.engine(ctx, s);
    else if (kind === 'heart') PropKit.organ(ctx, s, 'heart');
    else if (kind === 'lungs') PropKit.organ(ctx, s, 'lungs');
    else if (kind === 'stomach') PropKit.organ(ctx, s, 'stomach');
    else if (kind === 'magnet') PropKit.organ(ctx, s, 'magnet');
    else if (kind === 'money' || kind === 'coin' || kind === 'ticket' || kind === 'phone') {
      ctx.translate(0, -1.2 * s);
      ctx.scale(1.4, 1.4);
      PropMini.draw(ctx, kind);
    }
    ctx.restore();
  }

  static wheel(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 8);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2A2422';
    ctx.fill();
    ctx.lineWidth = Math.max(4, r * 0.18);
    ctx.strokeStyle = Ink.INK;
    ctx.stroke();
    ctx.strokeStyle = '#C8CDD4';
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke();
    ctx.restore();
  }

  static train(ctx, s, t) {
    const w = 4.6 * s, h = 1.7 * s;
    ctx.fillStyle = '#E85D4C';
    Ink.rrect(ctx, -w / 2, -h - 0.55 * s, w, h, 0.18 * s);
    ctx.fill(); ctx.lineWidth = 0.14 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    ctx.fillStyle = '#2C3E6B';
    Ink.rrect(ctx, w * 0.18, -h - 1.15 * s, w * 0.28, 0.7 * s, 0.1 * s);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9AD0FF';
    for (let i = 0; i < 3; i++) ctx.fillRect(-w * 0.42 + i * w * 0.22, -h - 0.15 * s, w * 0.14, 0.55 * s);
    ctx.strokeStyle = Ink.INK; ctx.strokeRect(-w * 0.42, -h - 0.15 * s, w * 0.14, 0.55 * s);
    PropKit.wheel(ctx, -w * 0.28, -0.15 * s, 0.38 * s, t);
    PropKit.wheel(ctx, w * 0.05, -0.15 * s, 0.38 * s, t);
    PropKit.wheel(ctx, w * 0.32, -0.15 * s, 0.32 * s, t);
    // Chimney puff
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const puff = (t * 40) % 30;
    ctx.beginPath(); ctx.arc(w * 0.32, -h - 1.3 * s - puff, 0.28 * s + puff * 0.01, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  static car(ctx, s, t) {
    const w = 3.3 * s;
    ctx.fillStyle = '#3D74E0';
    Ink.rrect(ctx, -w / 2, -1.15 * s, w, 0.85 * s, 0.25 * s);
    ctx.fill(); ctx.lineWidth = 0.14 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -1.15 * s);
    ctx.lineTo(-w * 0.05, -1.85 * s);
    ctx.lineTo(w * 0.28, -1.85 * s);
    ctx.lineTo(w * 0.42, -1.15 * s);
    ctx.closePath();
    ctx.fillStyle = '#9AD0FF'; ctx.fill(); ctx.stroke();
    PropKit.wheel(ctx, -w * 0.28, -0.28 * s, 0.32 * s, t);
    PropKit.wheel(ctx, w * 0.28, -0.28 * s, 0.32 * s, t);
  }

  static boat(ctx, s, t) {
    const bob = Math.sin(t * 2) * 0.08 * s;
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(-1.8 * s, -0.3 * s);
    ctx.lineTo(1.8 * s, -0.3 * s);
    ctx.lineTo(1.2 * s, 0.15 * s);
    ctx.lineTo(-1.2 * s, 0.15 * s);
    ctx.closePath();
    ctx.fillStyle = '#E85D4C'; ctx.fill(); ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -0.3 * s); ctx.lineTo(0, -2.1 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2.0 * s); ctx.lineTo(1.1 * s, -0.7 * s); ctx.lineTo(0, -0.7 * s); ctx.closePath();
    ctx.fillStyle = '#F4F1EA'; ctx.fill(); ctx.stroke();
  }

  static house(ctx, s) {
    Ink.rrect(ctx, -1.3 * s, -2.0 * s, 2.6 * s, 1.7 * s, 0.08 * s);
    ctx.fillStyle = '#F4F1EA'; ctx.fill(); ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    Ink.poly(ctx, [[-1.55, -2.0], [0, -3.15], [1.55, -2.0]], '#E85D4C', s, 0.12);
    ctx.fillStyle = '#9AD0FF';
    ctx.fillRect(-0.85 * s, -1.55 * s, 0.6 * s, 0.55 * s);
    ctx.strokeRect(-0.85 * s, -1.55 * s, 0.6 * s, 0.55 * s);
    ctx.fillStyle = '#2C3E6B';
    ctx.fillRect(0.25 * s, -1.15 * s, 0.55 * s, 0.85 * s);
    ctx.strokeRect(0.25 * s, -1.15 * s, 0.55 * s, 0.85 * s);
  }

  static counter(ctx, s) {
    Ink.rrect(ctx, -1.8 * s, -1.35 * s, 3.6 * s, 1.15 * s, 0.08 * s);
    ctx.fillStyle = '#2A9D8F'; ctx.fill(); ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(-1.8 * s, -1.5 * s, 3.6 * s, 0.22 * s);
    ctx.strokeRect(-1.8 * s, -1.5 * s, 3.6 * s, 0.22 * s);
  }

  static desk(ctx, s) {
    ctx.fillStyle = '#C48A4A';
    ctx.fillRect(-1.5 * s, -0.85 * s, 3.0 * s, 0.16 * s);
    ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.1 * s;
    ctx.strokeRect(-1.5 * s, -0.85 * s, 3.0 * s, 0.16 * s);
    ctx.beginPath();
    ctx.moveTo(-1.3 * s, -0.7 * s); ctx.lineTo(-1.3 * s, 0); ctx.moveTo(1.3 * s, -0.7 * s); ctx.lineTo(1.3 * s, 0);
    ctx.stroke();
  }

  static chair(ctx, s) {
    ctx.lineWidth = 0.1 * s; ctx.strokeStyle = Ink.INK; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, -1.45 * s); ctx.lineTo(-0.55 * s, 0);
    ctx.moveTo(0.5 * s, -1.45 * s); ctx.lineTo(0.55 * s, 0);
    ctx.moveTo(-0.5 * s, -2.55 * s); ctx.lineTo(-0.5 * s, -1.45 * s);
    ctx.moveTo(0.5 * s, -2.55 * s); ctx.lineTo(0.5 * s, -1.45 * s);
    ctx.stroke();
    Ink.rrect(ctx, -0.62 * s, -1.58 * s, 1.24 * s, 0.18 * s, 0.04 * s);
    ctx.fillStyle = '#E85D4C'; ctx.fill(); ctx.stroke();
    Ink.rrect(ctx, -0.62 * s, -2.6 * s, 1.24 * s, 0.95 * s, 0.08 * s);
    ctx.fillStyle = '#E85D4C'; ctx.fill(); ctx.stroke();
  }

  static tree(ctx, s, t) {
    ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK;
    ctx.fillStyle = '#8A5A32';
    ctx.fillRect(-0.16 * s, -1.3 * s, 0.32 * s, 1.3 * s);
    ctx.strokeRect(-0.16 * s, -1.3 * s, 0.32 * s, 1.3 * s);
    const sway = Math.sin(t * 1.4) * 0.06;
    ctx.translate(sway * s, 0);
    Ink.oval(ctx, 0, -1.9 * s / s, 0.85, 0.7, '#3E9A45', s, 0.1);
    Ink.oval(ctx, -0.55, -1.55 * s / s, 0.55, 0.48, '#2A9D8F', s, 0.1);
    Ink.oval(ctx, 0.6, -1.6 * s / s, 0.55, 0.5, '#3E9A45', s, 0.1);
  }

  static rocket(ctx, s, t) {
    const bob = Math.sin(t * 3) * 0.1 * s;
    ctx.translate(0, -0.4 * s + bob);
    Ink.poly(ctx, [[0, -2.6], [0.55, -1.3], [0.55, 0.2], [-0.55, 0.2], [-0.55, -1.3]], '#F4F1EA', s, 0.12);
    ctx.fillStyle = '#E85D4C';
    ctx.fillRect(-0.55 * s, -0.55 * s, 1.1 * s, 0.28 * s);
    Ink.oval(ctx, 0, -1.15 * s / s, 0.22, 0.28, '#9AD0FF', s, 0.08);
    ctx.fillStyle = '#F08A2A';
    const f = 0.4 + Math.sin(t * 20) * 0.15;
    Ink.poly(ctx, [[-0.28, 0.2], [0, 0.2 + f], [0.28, 0.2]], '#F2C230', s, 0.08);
  }

  static planet(ctx, s, t) {
    ctx.translate(0, -6.2 * s);
    ctx.rotate(t * 0.3);
    Ink.oval(ctx, 0, 0, 1.15, 1.15, '#3D74E0', s, 0.1);
    ctx.strokeStyle = '#F2C230'; ctx.lineWidth = 0.12 * s;
    ctx.beginPath(); ctx.ellipse(0, 0, 1.7 * s, 0.38 * s, -0.4, 0, Math.PI * 2); ctx.stroke();
  }

  static sign(ctx, s) {
    ctx.lineWidth = 0.1 * s; ctx.strokeStyle = Ink.INK;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -2.1 * s); ctx.stroke();
    Ink.rrect(ctx, -0.9 * s, -2.5 * s, 1.8 * s, 0.9 * s, 0.08 * s);
    ctx.fillStyle = '#F2C230'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = Ink.INK;
    ctx.fillRect(-0.35 * s, -2.2 * s, 0.7 * s, 0.12 * s);
    ctx.fillRect(-0.12 * s, -2.2 * s, 0.12 * s, 0.45 * s);
  }

  static bridge(ctx, s) {
    ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK;
    ctx.beginPath(); ctx.moveTo(-2.4 * s, -0.2 * s); ctx.lineTo(2.4 * s, -0.2 * s); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.2 * s, 2.2 * s, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#C8CDD4';
    ctx.fillRect(-2.5 * s, -0.45 * s, 5 * s, 0.28 * s);
    ctx.strokeRect(-2.5 * s, -0.45 * s, 5 * s, 0.28 * s);
  }

  static sun(ctx, s, t, prop) {
    const y = prop.sky ? -prop.sky : -3.2 * s;
    ctx.translate(0, y);
    ctx.strokeStyle = '#F2C230'; ctx.lineWidth = 0.1 * s;
    for (let i = 0; i < 10; i++) {
      const a = t * 0.4 + i * Math.PI / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.7 * s, Math.sin(a) * 0.7 * s);
      ctx.lineTo(Math.cos(a) * 1.15 * s, Math.sin(a) * 1.15 * s);
      ctx.stroke();
    }
    Ink.oval(ctx, 0, 0, 0.55, 0.55, '#F2C230', s, 0.1);
  }

  static engine(ctx, s) {
    Ink.rrect(ctx, -1.1 * s, -1.3 * s, 2.2 * s, 1.15 * s, 0.12 * s);
    ctx.fillStyle = '#C8CDD4'; ctx.fill(); ctx.lineWidth = 0.12 * s; ctx.strokeStyle = Ink.INK; ctx.stroke();
    Ink.oval(ctx, 0.55, -0.7 * s / s, 0.38, 0.38, '#E85D4C', s, 0.1);
    ctx.beginPath(); ctx.moveTo(-0.4 * s, -1.3 * s); ctx.lineTo(-0.4 * s, -1.8 * s); ctx.stroke();
  }

  static organ(ctx, s, kind) {
    ctx.translate(0, -2.15 * s);
    ctx.scale(s / 18, s / 18);
    if (kind === 'heart') PropMini.heart(ctx, 0, 6, 22, '#E85D4C');
    else PropMini.draw(ctx, kind);
  }
}

export class SetKit {
  static IDS = ['sky', 'room', 'shop', 'office', 'road', 'rails', 'bridge', 'deck', 'space', 'water', 'field', 'night', 'desert', 'lab', 'cabin', 'control', 'bunks', 'cockpit', 'battlefield', 'castle', 'hospital', 'museum', 'stadium', 'kitchen', 'jungle', 'volcano', ...RICH_SETS];
  static RICH = RICH_SETS;

  // Lighten (amt > 0) or darken (amt < 0) a #RRGGBB colour.
  static shadeHex(hex, amt) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (Number.isNaN(n)) return hex;
    const ch = (v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return `rgb(${r},${g},${b})`;
  }

  static farHills(ctx, W, H, horizon, sky, floor, set) {
    const y = H * horizon;
    const tint = set === 'desert' ? '#E9B87A' : set === 'night' ? '#2E3A63' : set === 'rails' ? '#D98A4E' : SetKit.shadeHex(floor, 0.35);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(-W * 0.2, y + 2);
    for (let k = 0; k <= 8; k++) {
      const x = -W * 0.2 + (k / 8) * W * 1.4;
      const hgt = H * (0.035 + 0.03 * Math.abs(Math.sin(k * 1.7 + set.length)));
      ctx.quadraticCurveTo(x - W * 0.09, y - hgt * 1.6, x, y - hgt * 0.4);
    }
    ctx.lineTo(W * 1.2, y + 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Small things on the ground that sell the scale: grass tufts, pebbles, floor boards, tiles.
  static groundDetail(ctx, W, H, horizon, floor, set, indoor) {
    if (set === 'rails' || set === 'road' || set === 'shop' || set === 'water' || set === 'bridge') return;
    let seed = set.length * 977 + 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const top = H * horizon;
    ctx.save();
    if (indoor) {
      // Floor boards with a soft wall-to-floor shadow.
      const g = ctx.createLinearGradient(0, top, 0, top + H * 0.05);
      g.addColorStop(0, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, top, W, H * 0.05);
      ctx.strokeStyle = SetKit.shadeHex(floor, -0.12); ctx.lineWidth = Math.max(2, W * 0.003);
      for (let k = 1; k < 9; k++) { const y = top + (H - top) * (k / 9) ** 1.35; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else {
      const dark = SetKit.shadeHex(floor, -0.18), light = SetKit.shadeHex(floor, 0.18);
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2.5, W * 0.0045);
      for (let k = 0; k < 26; k++) {
        const depth = rnd();                       // 0 = far, 1 = near
        const x = rnd() * W, y = top + (H - top) * (0.06 + depth * 0.9);
        const sz = W * (0.008 + depth * 0.02);
        if (set === 'space' || set === 'desert' || set === 'night') {
          ctx.fillStyle = k % 2 ? dark : light;
          ctx.beginPath(); ctx.ellipse(x, y, sz * 1.4, sz * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = k % 3 ? dark : light;
          ctx.beginPath(); ctx.moveTo(x - sz, y); ctx.lineTo(x - sz * 0.5, y - sz * 1.4);
          ctx.moveTo(x, y); ctx.lineTo(x, y - sz * 1.8); ctx.moveTo(x + sz, y); ctx.lineTo(x + sz * 0.6, y - sz * 1.3); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  static palette(id) {
    const set = SetKit.IDS.includes(id) ? id : 'sky';
    const sky = {
      sky: '#7EC8F2', room: '#F6E7A1', shop: '#F6E27A', office: '#E7EEF6', road: '#7EC8F2',
      rails: '#F08A3A', bridge: '#7EC8F2', space: '#1B2340', water: '#7EC8F2', field: '#7EC8F2',
      night: '#243056', desert: '#F2C230', lab: '#E7F2F6', cabin: '#2B3550', control: '#1A2550', bunks: '#243066', cockpit: '#0A0F2A',
      battlefield: '#8A8478', castle: '#6FB6EC', hospital: '#E6F0F2', museum: '#D9CBB4', stadium: '#2A4F8F', kitchen: '#F4EBDD', jungle: '#5FAE5A', volcano: '#A0523A',
    }[set];
    const floor = {
      sky: '#8FD18B', room: '#E6D3A3', shop: '#F7F4EE', office: '#D5DDE6', road: '#67B35A',
      rails: '#C4A074', bridge: '#8FD18B', space: '#3A4158', water: '#2F8FBF', field: '#67B35A',
      night: '#2A3148', desert: '#E2B56A', lab: '#F4F1EA', cabin: '#E8E8E8', control: '#2C3B78', bunks: '#2A3366', cockpit: '#3A4260',
      battlefield: '#6B5B45', castle: '#C8BBA0', hospital: '#CFE0E3', museum: '#8C6A4B', stadium: '#4FAE4A', kitchen: '#C9B08E', jungle: '#4F7A35', volcano: '#3A3030',
    }[set];
    const horizon = set === 'space' ? 0.72 : ['shop', 'room', 'office', 'lab', 'cabin', 'control', 'bunks', 'cockpit', 'hospital', 'museum', 'kitchen'].includes(set) ? 0.58 : 0.46;
    return { set, sky, floor, horizon };
  }

  static draw(ctx, W, H, id, t, plate, opts = {}) {
    if (plate && opts.scene) { SetKit.scenePlate(ctx, W, H, opts.blur ? SetKit.blurred(plate) : plate, t, !!opts.flip, opts); return; }
    // No AI picture: a painted 3D-style world, drawn in code.
    if (!plate && drawWorld(ctx, W, H, id, t)) return;
    if (RICH_SETS.includes(id)) {
      // Overscan in the set's own colours so a pan or whip never shows an empty edge.
      const m = Math.max(W, H) * 0.55;
      const [top, bottom] = { temple: ['#7CC8F2', '#D9C98F'], sea: ['#6EC6F5', '#F2D68A'], city: ['#7CC8F2', '#8D949E'], mountains: ['#7CC8F2', '#6CC070'], snow: ['#A9D8F5', '#FFFFFF'], forest: ['#8FD3F7', '#5DB868'], underwater: ['#3FB6E8', '#E8D08A'] }[id];
      ctx.fillStyle = top; ctx.fillRect(-m, -m, W + m * 2, H * 0.6 + m);
      ctx.fillStyle = bottom; ctx.fillRect(-m, H * 0.6, W + m * 2, H + m);
      drawSet(ctx, W, H, id, t, id.length * 31 + 7);
      return;
    }
    const { set, sky, floor, horizon } = SetKit.palette(id);
    // Overscan so a pan or a whip never reveals the empty canvas.
    const m = Math.max(W, H) * 0.55;
    const indoor = set === 'shop' || set === 'room' || set === 'office' || set === 'lab';
    // Depth: the sky fades lighter toward the horizon, the floor darkens toward the viewer.
    const skyG = ctx.createLinearGradient(0, -m * 0.2, 0, H * horizon);
    skyG.addColorStop(0, SetKit.shadeHex(sky, set === 'space' || set === 'night' ? -0.25 : -0.12));
    skyG.addColorStop(1, SetKit.shadeHex(sky, set === 'space' || set === 'night' ? 0.12 : 0.28));
    ctx.fillStyle = skyG;
    ctx.fillRect(-m, -m, W + m * 2, H * horizon + m);
    const floorG = ctx.createLinearGradient(0, H * horizon, 0, H + m * 0.3);
    floorG.addColorStop(0, SetKit.shadeHex(floor, 0.06));
    floorG.addColorStop(1, SetKit.shadeHex(floor, -0.13));
    ctx.fillStyle = floorG;
    ctx.fillRect(-m, H * horizon, W + m * 2, H + m);
    if (plate && !indoor && set !== 'space') SetKit.skyPlate(ctx, W, H, horizon, plate, sky);
    if (set === 'space' || set === 'night') SetKit.stars(ctx, W, H, t);
    else if (!indoor) SetKit.clouds(ctx, W, H * horizon, t, sky);
    if (plate && indoor) SetKit.windowPlate(ctx, W, H, horizon, plate);
    // Distant hills in the haze, so outdoor sets have a background and not just a line.
    if (!indoor && set !== 'space' && set !== 'water') SetKit.farHills(ctx, W, H, horizon, sky, floor, set);
    ctx.fillStyle = floorG;
    ctx.fillRect(0, H * horizon, W, H);
    SetKit.groundDetail(ctx, W, H, horizon, floor, set, indoor);
    ctx.strokeStyle = Ink.INK;
    ctx.lineWidth = Math.max(7, W * 0.012);
    ctx.beginPath();
    ctx.moveTo(-m, H * horizon);
    ctx.lineTo(W + m, H * horizon);
    ctx.stroke();
    if (set === 'rails') SetKit.rails(ctx, W, H, horizon);
    else if (set === 'shop') SetKit.shop(ctx, W, H, horizon);
    else if (set === 'road') SetKit.road(ctx, W, H, horizon);
    else if (set === 'lab' || set === 'office') SetKit.lab(ctx, W, H, horizon);
    else if (set === 'room') SetKit.room(ctx, W, H, horizon);
    else if (set === 'water') SetKit.water(ctx, W, H, horizon, t);
    else if (set === 'bridge') SetKit.bridgeDeck(ctx, W, H, horizon);
    else if (set === 'space') SetKit.moon(ctx, W, H, horizon);
    else if (set === 'desert') SetKit.dunes(ctx, W, H, horizon);
    else if (set === 'field' || set === 'sky') SetKit.hills(ctx, W, H, horizon);
  }

  // A full-frame 3D scene behind the cast, with overscan for pans, a slow drift for depth,
  // and a soft floor shade so the drawn characters sit in it.
  static scenePlate(ctx, W, H, plate, t, flip, v = {}) {
    const over = 1.3 * (v.vz || 1);
    const sc = Math.max((W * over) / plate.width, (H * over) / plate.height);
    const w = plate.width * sc, h = plate.height * sc;
    const drift = Math.sin(t * 0.08) * W * 0.012;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(W / 2 + drift + (v.vx || 0) * W, H * 0.5);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(SetKit.graded(plate), -w / 2, -h / 2, w, h);
    ctx.restore();
    if (v.tint) {
      // Time-of-day light, so scenes that share a picture still feel like different moments.
      ctx.fillStyle = { warm: 'rgba(255,140,60,0.16)', cool: 'rgba(60,110,255,0.16)', gold: 'rgba(255,200,80,0.14)' }[v.tint] || 'transparent';
      ctx.fillRect(-W * 0.5, -H * 0.5, W * 2, H * 2);
    }
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H * 1.1);
    g.addColorStop(0, 'rgba(10,12,30,0)');
    g.addColorStop(1, 'rgba(10,12,30,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(-W * 0.5, H * 0.55, W * 2, H);
  }

  // A little extra colour so the set pops like the reference renders. Done once per picture,
  // not every frame: a canvas filter on a full frame is slow.
  static graded(plate) {
    SetKit._graded ||= new WeakMap();
    let c = SetKit._graded.get(plate);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = plate.width; c.height = plate.height;
    const x = c.getContext('2d');
    if ('filter' in x) x.filter = 'saturate(1.18) contrast(1.06) brightness(1.04)';
    x.drawImage(plate, 0, 0);
    SetKit._graded.set(plate, c);
    return c;
  }

  // A soft, darkened copy of a photo to fill the frame behind the photo card.
  static blurred(plate) {
    SetKit._blur ||= new WeakMap();
    let c = SetKit._blur.get(plate);
    if (c) return c;
    const small = document.createElement('canvas');
    small.width = 48; small.height = Math.max(24, Math.round(48 * plate.height / plate.width));
    small.getContext('2d').drawImage(plate, 0, 0, small.width, small.height);
    c = document.createElement('canvas');
    c.width = 384; c.height = Math.round(384 * plate.height / plate.width);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(small, 0, 0, c.width, c.height);
    x.fillStyle = 'rgba(12,14,24,0.38)';
    x.fillRect(0, 0, c.width, c.height);
    SetKit._blur.set(plate, c);
    return c;
  }

  // The real picture as a framed card near the top of the frame, slightly tilted, with a slow push-in.
  static photoCard(ctx, W, H, img, t, dur, vx = 0, vz = 1) {
    const portrait = H >= W;
    const maxW = W * (portrait ? 0.9 : 0.56), maxH = H * (portrait ? 0.36 : 0.5);
    const sc = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * sc, h = img.height * sc;
    const cx = W / 2, cy = H * (portrait ? 0.06 : 0.06) + h / 2;
    const pop = Math.min(1, t / 0.35);
    const ease = 1 - Math.pow(1 - pop, 3);
    const zoom = vz * (1 + 0.06 * Math.min(1, t / Math.max(1, dur || 4)));
    const b = Math.max(6, W * 0.012);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.012);
    ctx.scale(0.9 + 0.1 * ease, 0.9 + 0.1 * ease);
    ctx.globalAlpha = ease;
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.012;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-w / 2 - b, -h / 2 - b, w + b * 2, h + b * 2);
    ctx.shadowColor = 'transparent';
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // A repeated photo is zoomed into a different part each time.
    const shift = Math.max(-1, Math.min(1, vx * 2)) * (w * zoom - w) / 2;
    ctx.drawImage(img, -w * zoom / 2 + shift, -h * zoom / 2, w * zoom, h * zoom);
    ctx.restore();
  }

  static stars(ctx, W, H, t) {
    ctx.fillStyle = '#F7F4EE';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97) % 100) / 100 * W;
      const y = ((i * 53) % 70) / 100 * H;
      const tw = 0.4 + Math.sin(t * 2 + i) * 0.4;
      ctx.globalAlpha = 0.45 + tw * 0.55;
      ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    ctx.globalAlpha = 1;
  }

  static clouds(ctx, W, H, t, sky) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const x = ((i * 0.37 + t * 0.012) % 1.2 - 0.1) * W;
      const y = H * (0.28 + i * 0.16);
      ctx.beginPath();
      ctx.ellipse(x, y, W * 0.09, H * 0.035, 0, 0, Math.PI * 2);
      ctx.ellipse(x + W * 0.06, y + 4, W * 0.07, H * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    void sky;
  }

  static skyPlate(ctx, W, H, horizon, plate, sky) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H * horizon);
    ctx.clip();
    const sc = Math.max(W / plate.width, (H * horizon) / plate.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(plate, (W - plate.width * sc) / 2, (H * horizon - plate.height * sc) / 2, plate.width * sc, plate.height * sc);
    ctx.fillStyle = sky;
    ctx.globalAlpha = 0.42;
    ctx.fillRect(0, 0, W, H * horizon);
    ctx.restore();
  }

  static windowPlate(ctx, W, H, horizon, plate) {
    const x = W * 0.58, y = H * 0.08, w = W * 0.34, h = H * horizon * 0.62;
    ctx.save();
    Ink.rrect(ctx, x, y, w, h, 10);
    ctx.clip();
    const sc = Math.max(w / plate.width, h / plate.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(plate, x + (w - plate.width * sc) / 2, y + (h - plate.height * sc) / 2, plate.width * sc, plate.height * sc);
    ctx.restore();
    ctx.lineWidth = Math.max(6, W * 0.01);
    ctx.strokeStyle = Ink.INK;
    Ink.rrect(ctx, x, y, w, h, 10);
    ctx.stroke();
  }

  static rails(ctx, W, H, horizon) {
    const y0 = H * horizon;
    const y1 = H * 0.98;
    const cx = W * 0.5;
    ctx.strokeStyle = '#E7C27A';
    ctx.lineCap = 'butt';
    const ties = 9;
    for (let i = 1; i <= ties; i++) {
      const p = i / ties;
      const y = y0 + (y1 - y0) * p * p;
      const half = (0.04 + p * 0.42) * W;
      ctx.lineWidth = Math.max(4, 6 + p * 10);
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
    const rail = (side, gapped) => {
      const x0 = cx + side * W * 0.035;
      const yStart = y0 + 6;
      const x1 = cx + side * W * 0.36;
      const segs = gapped ? [[0, 0.58], [0.7, 1]] : [[0, 1]];
      for (const [a, b] of segs) {
        ctx.strokeStyle = '#F7F4EE';
        ctx.lineWidth = Math.max(8, W * 0.016);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x0 + (x1 - x0) * a, yStart + (y1 - yStart) * a);
        ctx.lineTo(x0 + (x1 - x0) * b, yStart + (y1 - yStart) * b);
        ctx.stroke();
        ctx.strokeStyle = Ink.INK;
        ctx.lineWidth = Math.max(2.5, W * 0.004);
        ctx.stroke();
      }
    };
    rail(-1, false);
    rail(1, true);
  }

  static shop(ctx, W, H, horizon) {
    const y0 = H * horizon;
    ctx.strokeStyle = '#E4E0D4';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += W / 6) {
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x - W * 0.15, H); ctx.stroke();
    }
    for (let i = 1; i <= 5; i++) {
      const y = y0 + (H - y0) * (i / 5);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Door
    const dw = W * 0.16, dh = (y0 - H * 0.08) * 0.72;
    const dx = (W - dw) / 2, dy = y0 - dh;
    ctx.fillStyle = '#9AD0FF';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.lineWidth = Math.max(6, W * 0.01);
    ctx.strokeStyle = Ink.INK;
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.beginPath(); ctx.moveTo(W / 2, dy); ctx.lineTo(W / 2, y0); ctx.stroke();
    // Posters: shapes only, never fake readable text.
    const posters = [[0.06, '#E85D4C'], [0.22, '#3D74E0'], [0.74, '#2A9D8F'], [0.88, '#E8B931']];
    for (const [px, col] of posters) {
      const x = W * px, y = H * 0.12, w = W * 0.1, h = H * 0.12;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#F7F4EE';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.55, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ceiling lamps
    ctx.fillStyle = '#F7F4EE';
    for (const x of [W * 0.32, W * 0.68]) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, H * 0.07, W * 0.025, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  static road(ctx, W, H, horizon) {
    const y0 = H * horizon;
    ctx.fillStyle = '#4A5160';
    ctx.beginPath();
    ctx.moveTo(W * 0.42, y0);
    ctx.lineTo(W * 0.58, y0);
    ctx.lineTo(W * 1.05, H);
    ctx.lineTo(-W * 0.05, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F7F4EE';
    ctx.lineWidth = Math.max(4, W * 0.008);
    ctx.setLineDash([18, 16]);
    ctx.beginPath(); ctx.moveTo(W * 0.5, y0 + 10); ctx.lineTo(W * 0.5, H); ctx.stroke();
    ctx.setLineDash([]);
  }

  static lab(ctx, W, H, horizon) {
    ctx.fillStyle = '#F7F4EE';
    ctx.fillRect(W * 0.12, H * horizon - H * 0.015, W * 0.76, H * 0.02);
    ctx.strokeStyle = Ink.INK;
    ctx.lineWidth = Math.max(5, W * 0.008);
    ctx.strokeRect(W * 0.12, H * horizon - H * 0.015, W * 0.76, H * 0.02);
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H * horizon); ctx.lineTo(W * 0.18, H * horizon + H * 0.12);
    ctx.moveTo(W * 0.82, H * horizon); ctx.lineTo(W * 0.82, H * horizon + H * 0.12);
    ctx.stroke();
  }

  static room(ctx, W, H, horizon) {
    ctx.fillStyle = '#9AD0FF';
    const w = W * 0.28, h = H * 0.18;
    ctx.fillRect(W * 0.12, H * 0.12, w, h);
    ctx.lineWidth = Math.max(6, W * 0.01);
    ctx.strokeStyle = Ink.INK;
    ctx.strokeRect(W * 0.12, H * 0.12, w, h);
    ctx.beginPath();
    ctx.moveTo(W * 0.12 + w / 2, H * 0.12); ctx.lineTo(W * 0.12 + w / 2, H * 0.12 + h);
    ctx.moveTo(W * 0.12, H * 0.12 + h / 2); ctx.lineTo(W * 0.12 + w, H * 0.12 + h / 2);
    ctx.stroke();
    void horizon;
  }

  static water(ctx, W, H, horizon, t) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const y = H * horizon + 30 + i * ((H * (1 - horizon)) / 5);
      const shift = Math.sin(t * 1.5 + i) * 16;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(W * 0.25, y - 8 + shift, W * 0.5, y);
      ctx.quadraticCurveTo(W * 0.75, y + 8 - shift, W, y);
      ctx.stroke();
    }
  }

  static bridgeDeck(ctx, W, H, horizon) {
    ctx.strokeStyle = Ink.INK;
    ctx.lineWidth = Math.max(6, W * 0.01);
    ctx.beginPath();
    ctx.moveTo(0, H * horizon + H * 0.12);
    ctx.quadraticCurveTo(W * 0.5, H * horizon - H * 0.02, W, H * horizon + H * 0.12);
    ctx.stroke();
  }

  static moon(ctx, W, H, horizon) {
    ctx.fillStyle = '#C8CDD4';
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 1.05, W * 0.7, H * 0.28, 0, Math.PI, 0);
    ctx.fill();
    void horizon;
  }

  static dunes(ctx, W, H, horizon) {
    ctx.fillStyle = '#E8C27A';
    ctx.beginPath();
    ctx.moveTo(0, H * horizon + 20);
    ctx.quadraticCurveTo(W * 0.3, H * horizon - 30, W * 0.55, H * horizon + 10);
    ctx.quadraticCurveTo(W * 0.8, H * horizon + 40, W, H * horizon - 10);
    ctx.lineTo(W, H * horizon + 40);
    ctx.lineTo(0, H * horizon + 40);
    ctx.fill();
  }

  static hills(ctx, W, H, horizon) {
    ctx.fillStyle = '#3E9A45';
    ctx.beginPath();
    ctx.moveTo(0, H * horizon);
    ctx.quadraticCurveTo(W * 0.25, H * horizon - H * 0.08, W * 0.5, H * horizon);
    ctx.quadraticCurveTo(W * 0.75, H * horizon + H * 0.05, W, H * horizon - H * 0.02);
    ctx.lineTo(W, H * horizon + 4);
    ctx.lineTo(0, H * horizon + 4);
    ctx.fill();
    ctx.strokeStyle = Ink.INK;
    ctx.lineWidth = Math.max(5, W * 0.008);
    ctx.stroke();
  }
}
