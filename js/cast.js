// Rigged cartoon cast in the hand-drawn Short style: big white heads, thick ink,
// dot eyes, stick limbs, a costume that fits the role. Everything important is drawn
// here so a video never depends on an image model for characters or motion.

export class Ink {
  static INK = '#161616';
  static clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  static lerp(a, b, t) { return a + (b - a) * t; }
  static smooth(t) { t = Ink.clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  static back(t) {
    const c1 = 1.70158;
    const x = Ink.clamp(t, 0, 1) - 1;
    return 1 + (c1 + 1) * x * x * x + c1 * x * x;
  }
  static line(ctx, pts, u, width = 0.14) {
    if (!pts?.length) return;
    ctx.lineWidth = width * u;
    ctx.strokeStyle = Ink.INK;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * u, pts[0][1] * u);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u);
    ctx.stroke();
  }
  // Cel shading for the current path: a soft shadow on the side away from the light (upper left)
  // and a small highlight on the lit side. Call right after filling, before stroking.
  static shade(ctx, cx, cy, rx, ry, u, dark = 0.16, rebuild = null) {
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse((cx - rx * 0.32) * u, (cy - ry * 0.3) * u, rx * 1.18 * u, ry * 1.18 * u, 0, 0, Math.PI * 2);
    ctx.rect(-1e4, -1e4, 2e4, 2e4);
    ctx.fillStyle = `rgba(30,35,60,${dark})`;
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.ellipse((cx - rx * 0.42) * u, (cy - ry * 0.5) * u, rx * 0.26 * u, ry * 0.16 * u, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.restore();
    // Paths are not part of save/restore: put the shape's outline back so the caller strokes the right thing.
    ctx.beginPath();
    if (rebuild) rebuild();
  }

  static oval(ctx, x, y, rx, ry, fill, u, width = 0.15) {
    ctx.beginPath();
    ctx.ellipse(x * u, y * u, Math.max(0.01, Math.abs(rx)) * u, Math.max(0.01, Math.abs(ry)) * u, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.lineWidth = width * u;
    ctx.strokeStyle = Ink.INK;
    ctx.stroke();
  }
  static poly(ctx, pts, fill, u, width = 0.15) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * u, pts[0][1] * u);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width * u;
    ctx.strokeStyle = Ink.INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  static rrect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

export class Cast {
  static HATS = ['none', 'hair', 'cap', 'hardhat', 'fedora', 'beanie', 'tophat', 'crown', 'chef', 'grad', 'helmet', 'bowler', 'laurel'];
  static FEELS = ['neutral', 'happy', 'sad', 'angry', 'shocked', 'skeptical'];
  static POSES = ['idle', 'walk', 'turn', 'sit', 'drive', 'hold', 'give', 'point', 'shrug', 'jump', 'shock', 'facepalm', 'laugh', 'cry', 'cheer', 'think', 'wave', 'enter', 'exit'];
  static HAIR = ['none', 'brown', 'black', 'blonde', 'red'];
  static COSTUMES = ['vest', 'suit', 'shirt', 'coat'];
  static PALETTE = ['#2A9D8F', '#E8B931', '#E85D4C', '#3D74E0', '#2C3E6B', '#F08A2A', '#7A4EBF', '#3E9A45'];

  // Pixel scale. One character is a bit under half the frame, big head, short body.
  static unit(H) { return H * 0.064; }

  static limbs(pose, t) {
    const sw = Math.sin(t * 2.2);
    const stride = (pose === 'walk' || pose === 'enter' || pose === 'exit') ? Math.sin(t * 9.5) : 0;
    const sy = -3.05;
    let back = [[-0.95, sy], [-1.25, sy + 1.05], [-1.15 + stride * 0.45, sy + 2.05]];
    let front = [[0.95, sy], [1.25, sy + 1.05], [1.15 - stride * 0.45, sy + 2.05]];
    const up = (arm, hand) => { arm[1] = [hand[0] * 0.55, sy - 0.15]; arm[2] = hand; };
    switch (pose) {
      case 'point': up(front, [2.55, sy - 0.55 + sw * 0.08]); break;
      case 'present':
      case 'hold':
      case 'give': up(front, [2.15, sy + 0.35]); break;
      case 'shrug':
        back = [[-0.95, sy], [-1.55, sy - 0.15], [-1.85, sy - 1.15 + sw * 0.08]];
        front = [[0.95, sy], [1.55, sy - 0.15], [1.85, sy - 1.15 + sw * 0.08]];
        break;
      case 'think': front = [[0.95, sy], [1.35, sy + 0.15], [0.45, sy - 1.35]]; break;
      case 'facepalm': front = [[0.95, sy], [1.15, sy - 0.4], [0.35, sy - 1.55]]; break;
      case 'cry': front = [[0.95, sy], [1.2, sy - 0.2], [0.55, sy - 1.2]]; break;
      case 'cheer':
      case 'jump':
      case 'shock':
      case 'laugh':
        back = [[-0.95, sy], [-1.35, sy - 0.9], [-1.15, sy - 1.85 + sw * 0.1]];
        front = [[0.95, sy], [1.35, sy - 0.9], [1.15, sy - 1.85 - sw * 0.1]];
        break;
      case 'wave': front = [[0.95, sy], [1.45, sy - 0.85], [1.7 + Math.sin(t * 14) * 0.18, sy - 1.7]]; break;
      case 'sit':
        back = [[-0.9, sy + 0.15], [-1.35, sy + 0.85], [-1.15, sy + 1.45]];
        front = [[0.9, sy + 0.15], [1.45, sy + 0.55], [1.7, sy + 0.15]];
        break;
      case 'drive':
        back = [[-0.85, sy + 0.1], [-0.2, sy + 0.45], [0.15, sy + 0.25]];
        front = [[0.85, sy + 0.1], [1.15, sy + 0.35], [0.55, sy + 0.2]];
        break;
      default: break;
    }
    const sit = pose === 'sit' || pose === 'drive';
    const leg = pose === 'sit'
      ? { a: [[-0.42, -1.45], [-0.95, -0.72], [-1.05, -0.02]], b: [[0.42, -1.45], [0.95, -0.72], [1.05, -0.02]] }
      : pose === 'drive'
      ? { a: [[-0.4, -1.65], [0.55, -1.45], [0.7, -0.05]], b: [[0.35, -1.65], [0.9, -1.2], [1.05, -0.05]] }
      : {
        // Front view: each foot stays on its own side and only lifts, so the legs never cross.
        a: [[-0.46, -1.52], [-0.52, -0.78], [-0.62 - stride * 0.12, -0.02 - Math.max(0, stride) * 0.28]],
        b: [[0.46, -1.52], [0.52, -0.78], [0.62 + stride * 0.12, -0.02 - Math.max(0, -stride) * 0.28]],
      };
    return { back, front, leg, stride, sit };
  }

  static draw(ctx, st, parts = 'all') {
    const u = st.u;
    const t = st.t || 0;
    const pose = st.pose || 'idle';
    const { back, front, leg, stride, sit } = Cast.limbs(pose, t);
    const bob = sit ? 0 : Math.sin(t * 3 + (st.phase || 0)) * 0.06;
    const poseT = st.poseT ?? t;
    const hop = pose === 'jump' || pose === 'shock'
      ? Math.sin(Ink.clamp(poseT / 0.55, 0, 1) * Math.PI) * 0.95
      : pose === 'cheer' || pose === 'laugh' ? Math.abs(Math.sin(t * 6)) * 0.18 : 0;
    const face = st.face === -1 ? -1 : 1;
    if (parts !== 'head') {
      ctx.save();
      ctx.translate(st.x, st.ground + hop * u);
      ctx.beginPath();
      ctx.ellipse(0, 6, (1.15 - hop * 0.25) * u, 0.28 * u, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(st.x, st.ground - bob * u - hop * u);
    ctx.rotate((pose === 'walk' ? 0.05 : 0) * face + (st.feel === 'skeptical' ? 0.04 : 0));
    ctx.scale(face, 1);
    if (parts !== 'head') {
      Ink.line(ctx, leg.a, u, 0.16);
      Ink.line(ctx, leg.b, u, 0.16);
      Ink.oval(ctx, leg.a[2][0], 0.04, 0.3, 0.13, Ink.INK, u, 0.07);
      Ink.oval(ctx, leg.b[2][0], 0.04, 0.3, 0.13, Ink.INK, u, 0.07);
      Cast.body(ctx, st, u, bob, sit);
      Ink.line(ctx, back, u, 0.15);
      Cast.hand(ctx, back[2], u);
      Ink.line(ctx, front, u, 0.15);
      Cast.hand(ctx, front[2], u);
      if (st.hold && parts === 'all') Cast.held(ctx, st.hold, front[2], u);
    }
    if (parts !== 'body') Cast.head(ctx, st, u, bob, front[2]);
    ctx.restore();
    if (pose === 'walk' || pose === 'enter' || pose === 'exit') {
      st._stride = stride;
    }
  }

  static hand(ctx, pt, u) {
    Ink.oval(ctx, pt[0], pt[1], 0.22, 0.22, '#fff', u, 0.12);
  }

  static held(ctx, kind, pt, u) {
    ctx.save();
    ctx.translate(pt[0] * u, pt[1] * u);
    ctx.scale(u / 70, u / 70);
    PropMini.draw(ctx, kind);
    ctx.restore();
  }

  static body(ctx, st, u, bob, sit) {
    const y = -3.42 + bob * 0.2 + (sit ? 0.15 : 0);
    const h = (st.costume === 'coat' ? 2.15 : 1.82) - (sit ? 0.1 : 0);
    const color = st.color || '#2A9D8F';
    const costume = st.costume || 'vest';
    if (costume === 'suit' || costume === 'coat') {
      Ink.rrect(ctx, -1.05 * u, y * u, 2.1 * u, h * u, 0.48 * u);
      ctx.fillStyle = costume === 'suit' ? '#2C3E6B' : color;
      ctx.fill();
      Ink.shade(ctx, 0, y + h / 2, 1.05, h / 2, u, 0.2, () => Ink.rrect(ctx, -1.05 * u, y * u, 2.1 * u, h * u, 0.48 * u));
      ctx.lineWidth = 0.16 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      // Shirt placket and tie, so the torso never reads as bare skin.
      Ink.poly(ctx, [[-0.28, y + 0.05], [0.28, y + 0.05], [0.08, y + 0.55], [-0.08, y + 0.55]], '#F4F1EA', u, 0.1);
      Ink.poly(ctx, [[0, y + 0.42], [-0.16, y + 1.15], [0, y + 1.35], [0.16, y + 1.15]], st.tie || '#E85D4C', u, 0.1);
    } else {
      Ink.rrect(ctx, -1.0 * u, (y + 0.08) * u, 2.0 * u, (h - 0.05) * u, 0.42 * u);
      ctx.fillStyle = '#F7F4EE';
      ctx.fill();
      ctx.lineWidth = 0.15 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      Ink.rrect(ctx, -0.95 * u, (y + 0.35) * u, 1.9 * u, (h - 0.4) * u, 0.38 * u);
      ctx.fillStyle = color;
      ctx.fill();
      Ink.shade(ctx, 0, y + 0.35 + (h - 0.4) / 2, 0.95, (h - 0.4) / 2, u, 0.2, () => Ink.rrect(ctx, -0.95 * u, (y + 0.35) * u, 1.9 * u, (h - 0.4) * u, 0.38 * u));
      ctx.lineWidth = 0.15 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.22 * u, (y + 0.35) * u);
      ctx.lineTo(0, (y + 0.85) * u);
      ctx.lineTo(0.22 * u, (y + 0.35) * u);
      ctx.lineWidth = 0.1 * u;
      ctx.stroke();
      ctx.fillStyle = '#F2C230';
      for (const k of [0.7, 1.15]) {
        ctx.beginPath();
        ctx.arc(0, (y + k) * u, 0.07 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    // Belt, so the hip is a costume and not a body.
    ctx.fillStyle = Ink.INK;
    ctx.fillRect(-0.95 * u, (y + h - 0.28) * u, 1.9 * u, 0.16 * u);
  }

  static head(ctx, st, u, bob, hand) {
    const hy = -4.72 + bob;
    ctx.save();
    ctx.translate(0, hy * u);
    const tilt = ({ skeptical: 0.18, sad: -0.12, angry: -0.04, think: 0.12 }[st.feel] || 0) + (st.pose === 'think' ? 0.12 : 0);
    ctx.rotate(tilt + Math.sin((st.t || 0) * 1.6) * 0.03);
    ctx.translate(0, -hy * u);
    if (st.pose === 'facepalm') {
      // Hand is redrawn over the forehead after the face.
    }
    Cast.hairBack(ctx, st, u, hy);
    Ink.oval(ctx, 0, hy, 1.34, 1.26, '#FFFFFF', u, 0.18);
    ctx.beginPath(); ctx.ellipse(0, hy * u, 1.34 * u, 1.26 * u, 0, 0, Math.PI * 2);
    Ink.shade(ctx, 0, hy, 1.34, 1.26, u, 0.09, () => ctx.ellipse(0, hy * u, 1.34 * u, 1.26 * u, 0, 0, Math.PI * 2));
    ctx.lineWidth = 0.18 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
    Cast.face(ctx, st, u, hy);
    Cast.hat(ctx, st, u, hy);
    if (st.pose === 'facepalm') {
      Ink.oval(ctx, 0.15, hy - 0.15, 0.55, 0.38, '#fff', u, 0.12);
    }
    if (st.pose === 'cry' || st.feel === 'sad') {
      const drip = ((st.t || 0) % 1.4) / 1.4;
      Ink.oval(ctx, 0.55, hy + 0.15 + drip * 0.7, 0.08, 0.12 + drip * 0.08, '#7EC8F2', u, 0.06);
    }
    ctx.restore();
    void hand;
  }

  static hairBack(ctx, st, u, hy) {
    const col = { brown: '#8A5A32', black: '#2A2422', blonde: '#E2B656', red: '#C45A32' }[st.hair] || null;
    if (!col || st.hat === 'helmet') return;
    ctx.beginPath();
    ctx.arc(0, (hy + 0.05) * u, 1.4 * u, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(0.2 * u, (hy - 1.55) * u, -1.15 * u, (hy - 0.85) * u);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 0.12 * u;
    ctx.strokeStyle = Ink.INK;
    ctx.stroke();
  }

  static face(ctx, st, u, hy) {
    const feel = st.feel || 'neutral';
    const talk = Ink.clamp(st.talk || 0, 0, 1);
    const blink = ((st.t || 0) + (st.phase || 0)) % 3.6 < 0.12;
    const eyeY = hy - 0.18;
    ctx.fillStyle = Ink.INK;
    const drawEye = (x, wide) => {
      if (feel === 'happy' || st.pose === 'laugh') {
        ctx.lineWidth = 0.14 * u;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x * u, eyeY * u, 0.28 * u, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        return;
      }
      const ry = blink ? 0.05 : 0.16 * (feel === 'shocked' ? 1.45 : 1);
      ctx.beginPath();
      ctx.ellipse(x * u, eyeY * u, 0.13 * u * wide, ry * u, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEye(-0.48, 1);
    drawEye(0.48, 1);
    ctx.lineWidth = 0.11 * u;
    ctx.strokeStyle = Ink.INK;
    ctx.lineCap = 'round';
    const brow = (x0, y0, x1, y1) => {
      ctx.beginPath();
      ctx.moveTo(x0 * u, (hy + y0) * u);
      ctx.lineTo(x1 * u, (hy + y1) * u);
      ctx.stroke();
    };
    if (feel === 'angry') { brow(-0.78, -0.55, -0.22, -0.32); brow(0.22, -0.32, 0.78, -0.55); }
    else if (feel === 'sad' || st.pose === 'cry') { brow(-0.78, -0.32, -0.22, -0.55); brow(0.22, -0.55, 0.78, -0.32); }
    else if (feel === 'skeptical' || st.pose === 'think') { brow(-0.78, -0.48, -0.22, -0.38); brow(0.22, -0.28, 0.78, -0.58); }
    else if (feel === 'shocked') { brow(-0.78, -0.62, -0.22, -0.7); brow(0.22, -0.7, 0.78, -0.62); }
    const my = hy + 0.48;
    ctx.fillStyle = Ink.INK;
    if (feel === 'happy' || st.pose === 'laugh' || st.pose === 'cheer') {
      ctx.beginPath();
      ctx.arc(0, (my - 0.18) * u, (0.42 + talk * 0.12) * u, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.closePath();
      ctx.fill();
      if (talk > 0.25) {
        ctx.fillStyle = '#F099A8';
        ctx.beginPath();
        ctx.ellipse(0, (my + 0.08) * u, 0.18 * u, 0.08 * u, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if ((feel === 'sad' || st.pose === 'cry') && talk < 0.2) {
      ctx.beginPath();
      ctx.arc(0, (my + 0.28) * u, 0.32 * u, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      const open = (feel === 'shocked' ? 0.16 : 0.045) + talk * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, my * u, (0.13 + talk * 0.06) * u, open * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static hat(ctx, st, u, hy) {
    const kind = st.hat || 'none';
    const color = st.color || '#2A9D8F';
    const top = hy - 1.05;
    ctx.lineJoin = 'round';
    if (kind === 'laurel') {
      // Green laurel wreath for ancient Greeks and Romans.
      ctx.lineWidth = 0.1 * u; ctx.strokeStyle = Ink.INK; ctx.fillStyle = '#4E9A4A';
      for (let k = -4; k <= 4; k++) {
        if (k === 0) continue;
        const a = Math.PI * 1.5 + k * 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 1.08 * u, (hy + Math.sin(a) * 1.08) * u, 0.3 * u, 0.14 * u, a + (k < 0 ? -0.9 : 0.9), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      return;
    }
    if (kind === 'cap') {
      Ink.rrect(ctx, -0.85 * u, (top - 0.55) * u, 1.7 * u, 0.7 * u, 0.2 * u);
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 0.12 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.fillStyle = '#F4F1EA';
      for (let i = -2; i <= 2; i++) ctx.fillRect((i * 0.22 - 0.06) * u, (top - 0.5) * u, 0.1 * u, 0.58 * u);
      Ink.oval(ctx, 0.95, top + 0.05, 0.7, 0.18, color, u, 0.1);
    } else if (kind === 'hardhat') {
      ctx.beginPath();
      ctx.arc(0, (top + 0.15) * u, 1.15 * u, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#F5C518'; ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.12 * u; ctx.stroke();
      Ink.rrect(ctx, -1.35 * u, (top + 0.05) * u, 2.7 * u, 0.28 * u, 0.1 * u);
      ctx.fillStyle = '#F5C518'; ctx.fill(); ctx.stroke();
    } else if (kind === 'fedora' || kind === 'bowler') {
      const crown = kind === 'bowler' ? 0.7 : 0.85;
      Ink.rrect(ctx, -0.7 * u, (top - crown) * u, 1.4 * u, crown * u, kind === 'bowler' ? 0.5 * u : 0.15 * u);
      ctx.fillStyle = '#2A2422'; ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.12 * u; ctx.stroke();
      Ink.oval(ctx, 0.15, top + 0.08, 1.25, 0.2, '#2A2422', u, 0.1);
    } else if (kind === 'beanie') {
      ctx.beginPath();
      ctx.arc(0, (top + 0.2) * u, 1.05 * u, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.12 * u; ctx.stroke();
      Ink.oval(ctx, 0, top - 0.85, 0.22, 0.22, '#F4F1EA', u, 0.08);
    } else if (kind === 'tophat') {
      Ink.rrect(ctx, -0.62 * u, (top - 1.35) * u, 1.24 * u, 1.4 * u, 0.08 * u);
      ctx.fillStyle = '#222'; ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.12 * u; ctx.stroke();
      Ink.rrect(ctx, -1.15 * u, top * u, 2.3 * u, 0.22 * u, 0.08 * u);
      ctx.fillStyle = '#222'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-0.6 * u, (top - 0.15) * u, 1.2 * u, 0.16 * u);
    } else if (kind === 'crown') {
      Ink.poly(ctx, [[-1.1, top + 0.15], [-1.25, top - 0.85], [-0.55, top - 0.25], [0, top - 1.05], [0.55, top - 0.25], [1.25, top - 0.85], [1.1, top + 0.15]], '#F2C230', u, 0.1);
    } else if (kind === 'chef') {
      Ink.oval(ctx, -0.55, top - 0.35, 0.48, 0.4, '#fff', u, 0.1);
      Ink.oval(ctx, 0.55, top - 0.35, 0.48, 0.4, '#fff', u, 0.1);
      Ink.oval(ctx, 0, top - 0.7, 0.5, 0.42, '#fff', u, 0.1);
    } else if (kind === 'grad') {
      Ink.poly(ctx, [[-1.3, top], [0, top - 0.45], [1.3, top], [0, top + 0.28]], '#222', u, 0.1);
    } else if (kind === 'helmet') {
      Ink.oval(ctx, 0, hy - 0.15, 1.48, 1.4, 'rgba(180,220,255,0.35)', u, 0.12);
    } else if (kind === 'hair') {
      Cast.hairBack(ctx, { ...st, hair: st.hair && st.hair !== 'none' ? st.hair : 'brown', hat: 'none' }, u, hy);
    }
  }
}

// Tiny props that sit in a hand. Kept here so the rig does not import the whole set library.
class PropMini {
  static draw(ctx, kind) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = Ink.INK;
    ctx.lineJoin = 'round';
    if (kind === 'phone') {
      Ink.rrect(ctx, -16, -28, 32, 52, 6);
      ctx.fillStyle = '#2C3E6B'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9AD0FF'; ctx.fillRect(-10, -18, 20, 28);
    } else if (kind === 'money' || kind === 'coin') {
      Ink.rrect(ctx, -26, -16, 52, 32, 4);
      ctx.fillStyle = '#3E9A45'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#F2C230'; ctx.lineWidth = 4;
      ctx.strokeRect(-8, -8, 16, 16);
    } else if (kind === 'ticket') {
      Ink.rrect(ctx, -24, -16, 52, 30, 4);
      ctx.fillStyle = '#F2C230'; ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.lineWidth = 6; ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(8, -16); ctx.lineTo(8, 14); ctx.stroke(); ctx.setLineDash([]);
    } else if (kind === 'heart') {
      PropMini.heart(ctx, 0, 2, 16, '#E85D4C');
    } else if (kind === 'magnet') {
      ctx.strokeStyle = '#E85D4C'; ctx.lineWidth = 12; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(0, 0, 18, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = '#C8CDD4'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, 16); ctx.moveTo(18, 0); ctx.lineTo(18, 16); ctx.stroke();
    } else if (kind === 'lungs') {
      Ink.oval(ctx, -14, 0, 14, 20, '#F2A3B3', 1, 5);
      Ink.oval(ctx, 14, 0, 14, 20, '#F2A3B3', 1, 5);
    } else if (kind === 'stomach') {
      Ink.oval(ctx, 0, 4, 18, 22, '#F0B39A', 1, 5);
    } else {
      Ink.oval(ctx, 0, 0, 14, 14, '#F2C230', 1, 5);
    }
  }
  static heart(ctx, x, y, s, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.6, x - s * 0.4, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.4, y - s, x + s * 1.1, y - s * 0.6, x, y + s * 0.3);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = Ink.INK;
    ctx.stroke();
  }
}

export { PropMini };
