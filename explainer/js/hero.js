// The recurring hero for shots with no AI picture: one original character, drawn in code, whose
// look comes from the script's main character (clothing colours, hair) and never changes.
// 3D uses the Cartoons cast drawer; Blocky gets a cube avatar: cube head, box torso, block arms and
// legs with square hands, flat shading under hard light. No studs, no claw hands.
import { Cast } from '../../cartoon/js/cast.js';

const COLORS = {
  red: '#D8403A', crimson: '#B32B33', maroon: '#7A2B30', orange: '#EE8A2E', yellow: '#F2C632', gold: '#D9A92E', green: '#3E9A4E', olive: '#6F7A3A', lime: '#8CC63F',
  teal: '#2A9D8F', turquoise: '#2BB5B0', cyan: '#3CC0D8', blue: '#3D74E0', navy: '#2C3E6B', 'sky blue': '#6CB4EE', 'light blue': '#7FB7EC', 'dark blue': '#24407A', purple: '#7A4EBF',
  violet: '#8A5CD1', pink: '#EE7FB0', magenta: '#C2408F', brown: '#7A4F30', tan: '#C9A06C', beige: '#D9C6A0', khaki: '#B5A56E', black: '#2A2A2E', white: '#F2F2EE', grey: '#8A8F98', gray: '#8A8F98', denim: '#3F5F8F',
};
const HAIR = { black: '#231F1E', brown: '#6B4428', 'dark brown': '#4A2F1E', 'light brown': '#8E6239', blonde: '#E0B654', blond: '#E0B654', red: '#B5532E', ginger: '#C25E2B', auburn: '#8F3F26', grey: '#9A9A9A', gray: '#9A9A9A', white: '#E8E8E8' };
const SKIN = ['#F1C9A5', '#E3B08A', '#C68A62', '#9C6644', '#6E4630'];
const NAMES = Object.keys(COLORS).sort((a, b) => b.length - a.length);
const colorIn = (text) => { for (const n of NAMES) if (new RegExp(`\\b${n}\\b`).test(text)) return COLORS[n]; return null; };

// Read the hero's look from the script (characters[0].look, or a host description).
export function heroLook(script, seed = 0) {
  const c = (script?.characters || [])[0] || {};
  const text = String(c.look || c.description || '').toLowerCase();
  const near = (re) => { const m = re.exec(text); return m ? colorIn(m[0]) : null; };
  const top = near(/\b((?:[a-z]+ ){0,2})(t-shirt|tshirt|shirt|hoodie|jacket|sweater|jumper|top|dress|coat|uniform|polo|vest|blouse)\b/);
  const bottom = near(/\b((?:[a-z]+ ){0,2})(jeans|pants|trousers|shorts|skirt|leggings|overalls)\b/);
  const hm = /\b(dark brown|light brown|black|brown|blonde|blond|red|ginger|auburn|grey|gray|white)\b(?:[a-z ,]{0,12})\bhair\b/.exec(text) || /\bhair\b[^.,;]{0,12}\b(black|brown|blonde|blond|red|ginger|grey|gray|white)\b/.exec(text);
  const hairName = hm ? hm[1] : 'brown';
  const hat = /\bbeanie\b/.test(text) ? 'beanie' : /\b(cap|baseball cap)\b/.test(text) ? 'cap' : /\bhelmet\b/.test(text) ? 'helmet' : 'none';
  const skinWord = /\b(dark|deep|brown|black)[- ]skin/.test(text) ? 3 : /\b(tan|olive|medium)[- ]skin/.test(text) ? 2 : /\b(pale|fair|light)[- ]skin/.test(text) ? 0 : (seed % 3);
  return {
    name: c.name || 'hero', id: c.id || c.name || 'hero',
    shirt: top || colorIn(text) || '#3D74E0', pants: bottom || '#2C3E6B', hair: HAIR[hairName] || HAIR.brown, hairName: hairName.replace('blond', 'blonde').replace('blondee', 'blonde'),
    hat, skin: SKIN[skinWord],
  };
}

// The hero's expression for a line: shocked at danger, sad at loss, angry at a rival, curious at a
// question, happy otherwise.
export function feelFor(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(danger\w*|deadly|die|dies|died|death|shock\w*|panic\w*|scar\w*|gasp\w*|worse|terrif\w*|crash\w*|sudden\w*|fell|falls?|explod\w*|attack\w*|stuck|trapped|warning|numb)\b/.test(t) || /!/.test(t)) return 'shocked';
  if (/\b(sad|lost|lose|cry|cried|tears|alone|miss(ed)?|sorry)\b/.test(t)) return 'sad';
  if (/\b(angry|furious|mad|rival|cheat\w*|steal\w*|stole|liar|unfair|revenge)\b/.test(t)) return 'angry';
  if (/\?/.test(t)) return 'skeptical';
  return 'happy';
}

// Draw the hero standing on `ground` (canvas pixels), `height` tall, centre `x`. Returns its body
// box and face box, [x0, y0, x1, y1] in canvas pixels.
export function drawHero(ctx, look, { x, ground, height, t = 0, talk = 0, face = 1, blocky = false, feel = 'happy' }) {
  return blocky ? drawCube(ctx, look, x, ground, height, t, talk, face, feel) : drawToon(ctx, look, x, ground, height, t, talk, face, feel);
}

function drawToon(ctx, look, x, ground, height, t, talk, face, feel) {
  const u = height / 6.1;
  const hair = ['black', 'brown', 'blonde', 'red'].includes(look.hairName) ? look.hairName : look.hairName === 'ginger' || look.hairName === 'auburn' ? 'red' : 'brown';
  Cast.draw(ctx, {
    x, ground, u, pose: feel === 'shocked' && talk > 0.05 ? 'shock' : talk > 0.05 && Math.sin(t * 0.8) > 0.3 ? 'point' : 'idle', poseT: (t % 2.4), feel, face, talk, t, phase: 1,
    color: look.shirt, hat: look.hat === 'none' ? 'hair' : look.hat, hair, costume: 'shirt',
  });
  return { box: [x - u * 1.6, ground - u * 6.1, x + u * 1.6, ground + u * 0.3], face: [x - u * 1.25, ground - u * 6.0, x + u * 1.25, ground - u * 3.55] };
}

// ---------- the cube avatar ----------
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch.join(',')})`;
}
// A lit box: front face, a darker side face to the right, a lighter top face, hard light, thin edge.
function cube(ctx, x, y, w, h, d, color, edge) {
  const dx = d * 0.7, dy = -d * 0.55;
  ctx.lineJoin = 'round';
  ctx.lineWidth = edge;
  ctx.strokeStyle = 'rgba(20,22,30,0.85)';
  ctx.fillStyle = shade(color, -0.3);
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w + dx, y + h + dy); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(color, 0.22);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
}

function drawCube(ctx, look, cx, ground, height, t, talk, face, feel) {
  const b = height / 8.2;
  const d = b * 0.55, edge = Math.max(1, b * 0.07);
  const bob = Math.sin(t * 3.1) * b * 0.05;
  const swing = talk > 0.05 ? Math.sin(t * 5.2) * 0.22 : Math.sin(t * 1.6) * 0.05;
  ctx.save();
  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx + d * 0.35, ground + b * 0.08, b * 2.1, b * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  const legH = 3.0 * b, torsoH = 2.7 * b, torsoW = 2.3 * b, headS = 2.2 * b;
  const hipY = ground - legH + bob;
  // Legs (trousers, then shoes as the bottom block).
  for (const side of [-1, 1]) {
    const lx = cx + (side < 0 ? -torsoW / 2 : 0.02 * b);
    const lw = torsoW / 2 - 0.02 * b;
    cube(ctx, lx, hipY, lw, legH - 0.55 * b, d, look.pants, edge);
    cube(ctx, lx, ground - 0.55 * b, lw, 0.55 * b, d, '#3A3A40', edge);
  }
  // Back arm (behind the torso), torso, front arm: square hands, no claws.
  const shoulderY = hipY - torsoH;
  const arm = (side, front) => {
    const ax = side < 0 ? cx - torsoW / 2 - 0.9 * b : cx + torsoW / 2;
    const ang = (side < 0 ? 1 : -1) * swing * (front ? 1 : 0.6);
    ctx.save();
    ctx.translate(ax + 0.45 * b, shoulderY + 0.2 * b);
    ctx.rotate(ang);
    cube(ctx, -0.45 * b, -0.2 * b, 0.9 * b, 1.85 * b, d * 0.8, look.shirt, edge);
    cube(ctx, -0.45 * b, 1.65 * b, 0.9 * b, 0.8 * b, d * 0.8, look.skin, edge);
    ctx.restore();
  };
  arm(1, false);
  cube(ctx, cx - torsoW / 2, shoulderY, torsoW, torsoH, d, look.shirt, edge);
  // A collar stripe so the shirt reads as clothing.
  ctx.fillStyle = shade(look.shirt, -0.18); ctx.fillRect(cx - torsoW * 0.18, shoulderY, torsoW * 0.36, 0.28 * b);
  arm(-1, true);
  // Head: a cube, painted face, hair block on top with a fringe.
  const hx = cx - headS / 2, hy = shoulderY - headS - 0.12 * b;
  cube(ctx, hx, hy, headS, headS, d, look.skin, edge);
  if (look.hat === 'cap' || look.hat === 'beanie' || look.hat === 'helmet') {
    const capC = look.hat === 'helmet' ? '#E8E8E8' : look.shirt;
    cube(ctx, hx - 0.05 * b, hy - 0.45 * b, headS + 0.1 * b, 0.75 * b, d, shade(capC, -0.1), edge);
    if (look.hat === 'cap') cube(ctx, hx + (face > 0 ? headS * 0.45 : -headS * 0.25), hy + 0.15 * b, headS * 0.8, 0.18 * b, d * 0.4, shade(capC, -0.2), edge);
  } else {
    cube(ctx, hx - 0.04 * b, hy - 0.3 * b, headS + 0.08 * b, 0.55 * b, d, look.hair, edge);
    ctx.fillStyle = look.hair; ctx.fillRect(hx, hy + 0.2 * b, headS, 0.32 * b);
    ctx.fillRect(hx, hy + 0.2 * b, 0.32 * b, 0.9 * b);
  }
  // Face: square eyes with a highlight, square brows, a mouth that opens with the voice.
  const ex = hx + headS * 0.5 + face * 0.12 * b, ey = hy + headS * 0.47;
  const blink = (t % 3.7) < 0.12;
  for (const s of [-1, 1]) {
    const x0 = ex + s * 0.48 * b - 0.2 * b;
    ctx.fillStyle = '#1E1E24';
    ctx.fillRect(x0, ey - (blink ? 0.04 : 0.3) * b, 0.4 * b, (blink ? 0.08 : 0.42) * b);
    if (!blink) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x0 + 0.06 * b, ey - 0.24 * b, 0.13 * b, 0.13 * b); }
    // Brows: raised for shock, slanted in for anger, slanted out for sadness.
    ctx.save();
    ctx.translate(x0 + 0.2 * b, ey - (feel === 'shocked' ? 0.68 : 0.5) * b);
    ctx.rotate(feel === 'angry' ? s * 0.35 : feel === 'sad' ? -s * 0.3 : feel === 'skeptical' && s > 0 ? -0.25 : 0);
    ctx.fillStyle = shade(look.hair, -0.1); ctx.fillRect(-0.24 * b, -0.06 * b, 0.48 * b, 0.12 * b);
    ctx.restore();
  }
  const open = Math.max(0, Math.min(1, talk)) * (0.5 + 0.5 * Math.abs(Math.sin(t * 17)));
  ctx.fillStyle = '#5A2A2A';
  if (feel === 'shocked') ctx.fillRect(ex - 0.28 * b, hy + headS * 0.68, 0.56 * b, (0.36 + open * 0.2) * b);
  else if (feel === 'sad' || feel === 'angry') { ctx.fillRect(ex - 0.45 * b, hy + headS * 0.76, 0.9 * b, (0.12 + open * 0.3) * b); }
  else {
    ctx.fillRect(ex - 0.45 * b, hy + headS * 0.72, 0.9 * b, (0.14 + open * 0.36) * b);
    if (feel === 'happy' && open < 0.2) { ctx.fillRect(ex - 0.6 * b, hy + headS * 0.68, 0.18 * b, 0.12 * b); ctx.fillRect(ex + 0.42 * b, hy + headS * 0.68, 0.18 * b, 0.12 * b); }
  }
  ctx.restore();
  const top = hy - 0.45 * b - d * 0.55;
  return { box: [cx - torsoW / 2 - 0.95 * b, top, cx + torsoW / 2 + 0.95 * b + d * 0.7, ground + b * 0.4], face: [hx - 0.05 * b, top, hx + headS + d * 0.7, hy + headS] };
}
