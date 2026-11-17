// A hand-drawn style cartoon host, drawn and animated entirely in code:
// round white head, thick ink outline, simple face, a costume that fits the topic.
// It hops in, bobs, blinks, tilts its head, gestures, and its mouth moves with the narration.

export const HATS = ['none', 'hair', 'cap', 'hardhat', 'laurel', 'tophat', 'crown', 'helmet', 'chef', 'grad', 'beanie'];
export const POSES = ['idle', 'point', 'shrug', 'think', 'shock', 'wave', 'present', 'walk', 'cheer', 'facepalm'];
export const EMOTIONS = ['neutral', 'skeptical', 'happy', 'shocked', 'sad', 'angry'];
export const SIDES = ['left', 'center', 'right'];

const INK = '#26262B';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; const x = clamp(t, 0, 1) - 1; return 1 + c3 * x * x * x + c1 * x * x; };
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function limb(ctx, pts, u) {
  ctx.lineWidth = 0.34 * u;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * u, pts[0][1] * u);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u);
  ctx.stroke();
}

function blob(ctx, x, y, rx, ry, fill, u, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x * u, y * u, rx * u, ry * u, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.3 * u;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hat(ctx, kind, color, u) {
  ctx.lineWidth = 0.3 * u;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  const S = (x, y, w, h, r, fill) => { roundRect(ctx, x * u, y * u, w * u, h * u, r * u); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  switch (kind) {
    case 'hair': {
      // Brown side-swept hair with a little tuft on top.
      ctx.beginPath();
      ctx.arc(0, -6.2 * u, 2.07 * u, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(0.9 * u, -7.4 * u, 0, -7.1 * u);
      ctx.quadraticCurveTo(-1.1 * u, -6.9 * u, -2.07 * u, -6.3 * u);
      ctx.closePath();
      ctx.fillStyle = '#8A5A33'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.2 * u, -8.2 * u); ctx.quadraticCurveTo(0.2 * u, -9.4 * u, 0.9 * u, -8.9 * u); ctx.quadraticCurveTo(0.4 * u, -8.8 * u, 0.4 * u, -8.2 * u); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'cap': {
      S(-1.75, -9.0, 3.5, 1.5, 0.7, color);                 // crown
      S(-1.9, -7.75, 3.8, 0.55, 0.25, '#1b1b22');           // band
      ctx.fillStyle = '#F2C230'; ctx.fillRect(-1.85 * u, -7.62 * u, 3.7 * u, 0.14 * u);
      ctx.beginPath(); ctx.ellipse(1.1 * u, -7.2 * u, 1.5 * u, 0.36 * u, 0.12, 0, Math.PI * 2); ctx.fillStyle = '#1b1b22'; ctx.fill(); ctx.stroke(); // brim
      break;
    }
    case 'hardhat': {
      ctx.beginPath(); ctx.arc(0, -7.5 * u, 2.0 * u, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#F5C518'; ctx.fill(); ctx.stroke();
      S(-2.4, -7.6, 4.8, 0.5, 0.25, '#F5C518');
      break;
    }
    case 'helmet': {
      ctx.beginPath(); ctx.arc(0, -6.2 * u, 2.45 * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(190,225,255,0.28)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-0.9 * u, -7.3 * u, 0.9 * u, Math.PI * 1.05, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke(); ctx.strokeStyle = INK;
      break;
    }
    case 'laurel': {
      ctx.fillStyle = '#4E9A4A';
      for (let k = -4; k <= 4; k++) {
        if (k === 0) continue;
        const a = Math.PI * 1.5 + k * 0.27;
        const x = Math.cos(a) * 2.0, y = -6.2 + Math.sin(a) * 2.0;
        ctx.beginPath(); ctx.ellipse(x * u, y * u, 0.5 * u, 0.24 * u, a + (k < 0 ? -0.9 : 0.9), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'tophat': {
      S(-1.25, -10.4, 2.5, 2.7, 0.2, '#22222A');
      S(-2.1, -7.95, 4.2, 0.5, 0.25, '#22222A');
      ctx.fillStyle = color; ctx.fillRect(-1.22 * u, -8.5 * u, 2.44 * u, 0.4 * u);
      break;
    }
    case 'crown': {
      ctx.beginPath();
      ctx.moveTo(-1.7 * u, -7.5 * u); ctx.lineTo(-1.9 * u, -9.3 * u); ctx.lineTo(-0.9 * u, -8.4 * u); ctx.lineTo(0, -9.7 * u);
      ctx.lineTo(0.9 * u, -8.4 * u); ctx.lineTo(1.9 * u, -9.3 * u); ctx.lineTo(1.7 * u, -7.5 * u); ctx.closePath();
      ctx.fillStyle = '#F2C230'; ctx.fill(); ctx.stroke();
      break;
    }
    case 'chef': {
      blob(ctx, -0.9, -9.3, 0.95, 0.85, '#fff', u); blob(ctx, 0.9, -9.3, 0.95, 0.85, '#fff', u); blob(ctx, 0, -9.7, 1.0, 0.9, '#fff', u);
      S(-1.5, -8.7, 3.0, 1.2, 0.2, '#fff');
      break;
    }
    case 'grad': {
      S(-1.5, -8.3, 3.0, 0.8, 0.2, '#22222A');
      ctx.beginPath(); ctx.moveTo(-2.6 * u, -8.5 * u); ctx.lineTo(0, -9.3 * u); ctx.lineTo(2.6 * u, -8.5 * u); ctx.lineTo(0, -7.9 * u); ctx.closePath();
      ctx.fillStyle = '#22222A'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.6 * u, -8.5 * u); ctx.lineTo(1.9 * u, -7.1 * u); ctx.strokeStyle = '#F2C230'; ctx.stroke(); ctx.strokeStyle = INK;
      break;
    }
    case 'beanie': {
      ctx.beginPath(); ctx.arc(0, -7.3 * u, 1.95 * u, Math.PI, 0); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.stroke();
      S(-2.05, -7.6, 4.1, 0.6, 0.3, '#fff');
      blob(ctx, 0, -9.4, 0.4, 0.4, '#fff', u);
      break;
    }
    default:
  }
}

// state: { pose, emotion, side, hat, color, lt (seconds into the shot), dur, talking (0..1 mouth open), seed }
export function drawMascot(ctx, W, H, st) {
  const tall = H / W > 1.5;
  const close = st.shot === 'close';
  const height = (tall ? H * 0.4 : H * 0.62) * (close ? 1.5 : 1);      // head-to-toe size on screen
  const u = height / 10;
  const baseX = { left: 0.3, center: 0.5, right: 0.7 }[st.side] ?? 0.5;
  const faceDir = st.side === 'right' ? -1 : 1;  // look toward the middle of the frame
  // In a close-up the host is bigger and its feet drop out of frame behind the captions.
  const groundY = (tall ? H * 0.665 : H * 0.9) + (close ? height * 0.36 : 0);
  const t = st.lt;
  const ph = (st.seed % 100) / 10;

  // Entrance hop, idle bob, and pose-driven motion.
  const enter = easeOutBack(t / 0.42);
  let x = baseX * W, y = groundY + (1 - enter) * height * 0.9;
  const bob = Math.sin(t * 3.1 + ph) * 0.1;
  let lean = Math.sin(t * 1.3 + ph) * 0.03;
  let jump = 0;
  if (st.pose === 'shock') jump = Math.max(0, Math.sin(clamp(t / 0.45, 0, 1) * Math.PI)) * 1.3;
  if (st.pose === 'cheer') jump = Math.abs(Math.sin(t * 5)) * 0.7;
  jump += (st.hop || 0) * 0.55;   // little hop on key words
  if (st.pose === 'walk') {
    const p = smooth(t / Math.max(1.2, st.dur));
    x = lerp(baseX - 0.16 * faceDir, baseX + 0.12 * faceDir, p) * W;
    lean += 0.06 * faceDir * (1 - p);
  }
  const walkCycle = st.pose === 'walk' ? Math.sin(t * 9) * (1 - smooth(t / Math.max(1.2, st.dur)) * 0.6) : 0;

  ctx.save();
  ctx.translate(x, y - jump * u);
  // Soft ground shadow.
  ctx.save();
  ctx.translate(0, jump * u);
  ctx.beginPath(); ctx.ellipse(0, 0.1 * u, (2.3 - jump * 0.4) * u, 0.42 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
  ctx.restore();

  ctx.rotate(lean);
  ctx.scale(faceDir, 1);
  const squash = 1 + Math.sin(t * 3.1 + ph) * 0.012;
  ctx.scale(1 / squash, squash);

  // Legs (thin stick legs with a knee) and feet.
  const hipY = -1.25 + bob * 0.3;
  const stride = walkCycle * 0.9;
  limb(ctx, [[-0.6, hipY], [-0.85 - stride * 0.5, -0.65], [-0.75 - stride, -0.05]], u);
  limb(ctx, [[0.6, hipY], [0.85 + stride * 0.5, -0.65], [0.75 + stride, -0.05]], u);
  blob(ctx, -0.45 - stride, -0.05, 0.5, 0.2, INK, u);
  blob(ctx, 1.05 + stride, -0.05, 0.5, 0.2, INK, u);

  // Arms: [shoulder, elbow, hand] per pose. Front arm = +x side (toward the scene).
  const sy = -3.9 + bob;
  const sw = Math.sin(t * 2.4 + ph);
  let back = [[-1.35, sy], [-2.0, sy + 1.2], [-1.9, sy + 2.3 + sw * 0.1]];
  let front = [[1.35, sy], [2.0, sy + 1.2], [1.9, sy + 2.3 - sw * 0.1]];
  switch (st.pose) {
    case 'point': front = [[1.35, sy], [2.5, sy - 0.5], [3.7, sy - 1.3 + sw * 0.12]]; break;
    case 'present': front = [[1.35, sy], [2.5, sy + 0.5], [3.6, sy + 0.2 + sw * 0.12]]; break;
    case 'shrug': back = [[-1.35, sy], [-2.3, sy + 0.5], [-3.0, sy - 0.5 + sw * 0.1]]; front = [[1.35, sy], [2.3, sy + 0.5], [3.0, sy - 0.5 + sw * 0.1]]; break;
    case 'think': front = [[1.35, sy], [2.1, sy + 0.9], [1.25, sy - 0.75]]; break;
    case 'facepalm': front = [[1.35, sy], [2.3, sy - 0.2], [0.9, sy - 2.2]]; break;
    case 'shock': case 'cheer': back = [[-1.35, sy], [-2.4, sy - 1.0], [-2.7, sy - 2.5 + sw * 0.15]]; front = [[1.35, sy], [2.4, sy - 1.0], [2.7, sy - 2.5 - sw * 0.15]]; break;
    case 'wave': front = [[1.35, sy], [2.4, sy - 0.8], [2.9 + Math.sin(t * 9) * 0.5, sy - 2.3]]; break;
    case 'walk': back = [[-1.35, sy], [-1.9 + stride, sy + 1.2], [-1.7 + stride * 1.6, sy + 2.2]]; front = [[1.35, sy], [1.9 - stride, sy + 1.2], [1.7 - stride * 1.6, sy + 2.2]]; break;
    default:
  }
  limb(ctx, back, u);
  blob(ctx, back[2][0], back[2][1], 0.36, 0.36, '#fff', u);

  // Body: a rounded costume with belt and buttons.
  const by = -5.0 + bob;
  roundRect(ctx, -1.6 * u, by * u, 3.2 * u, 3.9 * u, 1.3 * u);
  ctx.fillStyle = st.color || '#2F5DA8'; ctx.fill();
  ctx.lineWidth = 0.32 * u; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(-1.5 * u, (by + 2.35) * u, 3.0 * u, 0.3 * u);
  ctx.fillStyle = '#F2C230';
  ctx.fillRect(-0.25 * u, (by + 2.28) * u, 0.5 * u, 0.44 * u);
  for (const k of [0.9, 1.5]) { ctx.beginPath(); ctx.arc(0.25 * u, (by + k) * u, 0.11 * u, 0, Math.PI * 2); ctx.fill(); }

  limb(ctx, front, u);
  blob(ctx, front[2][0], front[2][1], 0.36, 0.36, '#fff', u);

  // Head group: tilts and nods, carries the face and hat.
  const tiltBase = { skeptical: 0.2, sad: -0.12, think: 0.14 }[st.emotion] || 0;
  const tilt = tiltBase + Math.sin(t * 1.7 + ph) * 0.05 + (st.pose === 'think' ? 0.1 : 0) + st.talking * Math.sin(t * 11) * 0.025;
  ctx.save();
  ctx.translate(0, (-4.6 + bob) * u);
  ctx.rotate(tilt);
  ctx.translate(0, (4.6 - bob) * u);
  const hy = -6.3 + bob * 1.3;
  ctx.translate(0, (hy + 6.2) * u);
  blob(ctx, 0, -6.2, 2.05, 1.95, '#FFFFFF', u);

  // Face. Blink every few seconds.
  const blinkT = (t + ph) % 3.4;
  const blink = blinkT < 0.12 ? 0.12 : 1;
  const wide = st.emotion === 'shocked' ? 1.35 : 1;
  ctx.fillStyle = INK;
  for (const ex of [0.35, 1.25]) {
    if (st.emotion === 'happy') {
      // Laughing eyes: little upward arcs.
      ctx.lineWidth = 0.2 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex * u, -6.2 * u, 0.3 * u, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(ex * u, -6.35 * u, 0.2 * u * wide, 0.3 * u * wide * blink, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Brows carry the emotion.
  ctx.lineWidth = 0.2 * u; ctx.lineCap = 'round';
  const brow = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0 * u, y0 * u); ctx.lineTo(x1 * u, y1 * u); ctx.stroke(); };
  if (st.emotion === 'skeptical') { brow(0.05, -7.0, 0.65, -6.85); brow(0.95, -6.95, 1.6, -7.25); }
  else if (st.emotion === 'angry') { brow(0.05, -7.15, 0.65, -6.85); brow(0.95, -6.85, 1.6, -7.15); }
  else if (st.emotion === 'sad') { brow(0.05, -6.9, 0.65, -7.15); brow(0.95, -7.15, 1.6, -6.9); }
  else if (st.emotion === 'shocked') { brow(0.05, -7.35, 0.65, -7.45); brow(0.95, -7.45, 1.6, -7.35); }
  // Mouth: opens with the narration.
  const open = st.talking;
  const mx = 0.85, my = -5.45;
  if (st.emotion === 'happy') {
    // Big open grin that widens while talking.
    ctx.beginPath(); ctx.arc(mx * u, (my - 0.3) * u, (0.5 + open * 0.12) * u, 0.08 * Math.PI, 0.92 * Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E8687A'; ctx.beginPath(); ctx.ellipse(mx * u, (my + 0.08) * u, 0.24 * u, 0.1 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = INK;
  } else if (st.emotion === 'sad' && open < 0.15) {
    ctx.beginPath(); ctx.arc(mx * u, (my + 0.3) * u, 0.4 * u, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  } else {
    const base = st.emotion === 'shocked' ? 0.3 : 0.07;
    ctx.beginPath(); ctx.ellipse(mx * u, my * u, (0.2 + open * 0.08) * u, (base + open * 0.28) * u, 0, 0, Math.PI * 2); ctx.fill();
  }
  hat(ctx, st.hat, st.color || '#2F5DA8', u);
  ctx.restore();
  ctx.restore();
}
