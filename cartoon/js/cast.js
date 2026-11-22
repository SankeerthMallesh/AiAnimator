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
  static HATS = ['none', 'hair', 'cap', 'flatcap', 'conductor', 'hardhat', 'fedora', 'beanie', 'tophat', 'crown', 'chef', 'grad', 'helmet', 'bowler', 'laurel', 'viking', 'headset', 'officer', 'bun'];
  static FEELS = ['neutral', 'happy', 'sad', 'angry', 'shocked', 'skeptical', 'smug', 'sleepy', 'nervous'];
  static POSES = ['idle', 'walk', 'turn', 'sit', 'drive', 'hold', 'give', 'point', 'shrug', 'jump', 'shock', 'facepalm', 'laugh', 'cry', 'cheer', 'think', 'wave', 'enter', 'exit'];
  static HAIR = ['none', 'brown', 'black', 'blonde', 'red'];
  static COSTUMES = ['vest', 'suit', 'shirt', 'coat', 'apron', 'tunic', 'jumpsuit', 'labcoat'];
  // Things a character can hold or use, drawn in the hand.
  static HOLDS = ['phone', 'money', 'coin', 'ticket', 'heart', 'magnet', 'map', 'letter', 'key', 'book', 'lantern', 'cup', 'bag', 'wrench', 'hammer', 'newspaper', 'clipboard', 'watch', 'camera', 'ruler', 'rail'];
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
      case 'show': front = [[0.95, sy], [1.75, sy - 0.6], [2.35, sy - 1.35 + sw * 0.05]]; break;
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
      if (st.hold && parts === 'all') Cast.held(ctx, st.hold, front[2], u, st.use);
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

  // 1.2: what a character does with the thing in the hand (use = { act, p } with p in seconds since
  // the act began): show (raised to the camera, bigger, with a glow), grow, spin, drop (falls to the
  // ground and stays) and break (shakes, then flies apart in four pieces).
  static USES = ['show', 'drop', 'grow', 'spin', 'break'];
  static held(ctx, kind, pt, u, use = null) {
    const e = use?.p ?? 0, act = use?.act || '';
    const ease = (v) => 1 - Math.pow(1 - Ink.clamp(v, 0, 1), 3);
    const back = (v) => { const c = 1.9; const x = Ink.clamp(v, 0, 1) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
    // In use, a thing is drawn a bit bigger so the action reads at phone size.
    let x = pt[0], y = pt[1], scale = act ? 1.45 : 1, rot = 0;
    const draw = () => { ctx.save(); ctx.translate(x * u, y * u); ctx.rotate(rot); ctx.scale(scale * u / 70, scale * u / 70); PropMini.draw(ctx, kind); ctx.restore(); };
    if (act === 'show') {
      // The arm is raised (pose 'show'); the thing sits just above the hand and swells a little.
      const k = ease(e / 0.45);
      y = pt[1] - 0.45 * k; scale = 1.45 + 0.6 * k;
      // A soft glow and turning rays behind the thing.
      ctx.save(); ctx.translate(x * u, y * u); ctx.globalAlpha = 0.55 * k;
      const r = 1.35 * u * scale;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(255,236,150,0.95)'); g.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(e * 0.6); ctx.fillStyle = 'rgba(255,214,90,0.5)';
      for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.05, -r * 0.08); ctx.lineTo(r * 1.05, r * 0.08); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      return draw();
    }
    if (act === 'grow') { scale = 1.2 + 1.7 * back(e / 0.8); return draw(); }
    if (act === 'spin') { rot = 4 * Math.PI * ease(e / 1.1) + Math.max(0, e - 1.1) * 1.2; scale = 1.7; y -= 0.2; return draw(); }
    if (act === 'drop') {
      const T = 0.45, groundY = -0.32;
      if (e < T) { const k = e / T; x = pt[0] + 0.45 * k; y = Ink.lerp(pt[1], groundY, k * k); rot = 1.3 * k; }
      else {
        const b = e - T; x = pt[0] + 0.45 + Math.min(b, 0.3) * 0.5; rot = 1.3 + Math.min(b, 0.3) * 0.8;
        y = groundY - Math.max(0, Math.sin(Ink.clamp(b / 0.3, 0, 1) * Math.PI)) * 0.35;
        if (b < 0.5) { // dust where it lands
          ctx.save(); ctx.globalAlpha = 0.5 * (1 - b / 0.5); ctx.fillStyle = '#CFC6B4';
          for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse((pt[0] + 0.45 + d * (0.35 + b)) * u, -0.08 * u, (0.28 + b * 0.4) * u, 0.12 * u, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      }
      return draw();
    }
    if (act === 'break') {
      const crack = 0.35;
      scale = 1.8; y -= 0.25;
      if (e < crack) { x += Math.sin(e * 90) * 0.08; return draw(); }
      const b = e - crack;
      if (b > 1.1) return undefined; // gone
      ctx.save(); ctx.globalAlpha = Ink.clamp(1.6 - b / 0.7, 0, 1);
      // A white flash on the crack, then four pieces fly out and fall.
      if (b < 0.3) {
        // A comic burst on the crack.
        ctx.save(); ctx.globalAlpha = 1 - b / 0.3; ctx.translate(x * u, y * u);
        const R = (1.1 + b * 2) * u;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? R * 0.5 : R; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = '#FFE14D'; ctx.fill(); ctx.lineWidth = 0.08 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
        ctx.restore();
      }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], i) => {
        ctx.save();
        ctx.translate((x + dx * b * 1.6) * u, (y + dy * b * 0.7 + b * b * 3.2) * u);
        ctx.rotate(dx * b * (2 + i * 0.4));
        const sc = scale * u / 70;
        ctx.scale(sc, sc);
        ctx.beginPath(); ctx.rect(dx < 0 ? -60 : 0, dy < 0 ? -60 : 0, 60, 60); ctx.clip();
        ctx.translate(-dx * 4, -dy * 4);
        PropMini.draw(ctx, kind);
        ctx.restore();
      });
      ctx.restore();
      return undefined;
    }
    return draw();
  }

  static body(ctx, st, u, bob, sit) {
    const y = -3.42 + bob * 0.2 + (sit ? 0.15 : 0);
    const h = (st.costume === 'coat' ? 2.15 : 1.82) - (sit ? 0.1 : 0);
    const color = st.color || '#2A9D8F';
    const costume = st.costume || 'vest';
    if (costume === 'tunic') {
      // A belted wool tunic with a fur collar: Vikings, the Middle Ages, the ancient world.
      Ink.rrect(ctx, -1.02 * u, (y + 0.05) * u, 2.04 * u, (h + 0.12) * u, 0.42 * u);
      ctx.fillStyle = color; ctx.fill();
      Ink.shade(ctx, 0, y + h / 2, 1.02, h / 2, u, 0.22, () => Ink.rrect(ctx, -1.02 * u, (y + 0.05) * u, 2.04 * u, (h + 0.12) * u, 0.42 * u));
      ctx.lineWidth = 0.15 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      // the hem, a little lighter
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-0.98 * u, (y + h - 0.02) * u, 1.96 * u, 0.12 * u);
      // fur over the shoulders
      Ink.oval(ctx, 0, y + 0.16, 1.12, 0.34, '#8A6240', u, 0.12);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (const fx of [-0.7, -0.35, 0, 0.35, 0.7]) { ctx.beginPath(); ctx.arc(fx * u, (y + 0.1) * u, 0.07 * u, 0, Math.PI * 2); ctx.fill(); }
    } else if (costume === 'jumpsuit') {
      // 1.2: a crew jumpsuit: polo collar, two buttons, a flag patch, a round mission patch, a name tag.
      Ink.rrect(ctx, -1.02 * u, (y + 0.02) * u, 2.04 * u, (h + 0.1) * u, 0.5 * u);
      ctx.fillStyle = color; ctx.fill();
      Ink.shade(ctx, 0, y + h / 2, 1.02, h / 2, u, 0.2, () => Ink.rrect(ctx, -1.02 * u, (y + 0.02) * u, 2.04 * u, (h + 0.1) * u, 0.5 * u));
      ctx.lineWidth = 0.15 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      Ink.poly(ctx, [[-0.5, y + 0.04], [0, y + 0.3], [-0.28, y + 0.42]], color, u, 0.09);
      Ink.poly(ctx, [[0.5, y + 0.04], [0, y + 0.3], [0.28, y + 0.42]], color, u, 0.09);
      ctx.fillStyle = '#FFFFFF';
      for (const k of [0.45, 0.68]) { ctx.beginPath(); ctx.arc(0, (y + k) * u, 0.07 * u, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.05 * u; ctx.stroke(); }
      // flag patch
      ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-0.78 * u, (y + 0.42) * u, 0.36 * u, 0.24 * u);
      ctx.fillStyle = '#C8312F'; for (const k of [0, 2, 4]) ctx.fillRect(-0.78 * u, (y + 0.42 + k * 0.048) * u, 0.36 * u, 0.03 * u);
      ctx.fillStyle = '#2C3E6B'; ctx.fillRect(-0.78 * u, (y + 0.42) * u, 0.16 * u, 0.12 * u);
      ctx.lineWidth = 0.04 * u; ctx.strokeRect(-0.78 * u, (y + 0.42) * u, 0.36 * u, 0.24 * u);
      // mission patch
      Ink.oval(ctx, 0.6, y + 0.62, 0.2, 0.2, '#203A6B', u, 0.05);
      ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.arc(0.6 * u, (y + 0.62) * u, 0.07 * u, 0, Math.PI * 2); ctx.fill();
      // name tag
      Ink.rrect(ctx, 0.25 * u, (y + 0.9) * u, 0.62 * u, 0.2 * u, 0.04 * u); ctx.fillStyle = '#F7F4EE'; ctx.fill(); ctx.lineWidth = 0.04 * u; ctx.stroke();
      ctx.fillStyle = Ink.INK; ctx.fillRect(0.32 * u, (y + 0.99) * u, 0.48 * u, 0.03 * u);
    } else if (costume === 'labcoat') {
      // 1.2: a white lab coat, open over a coloured shirt, with an ID card on a lanyard.
      Ink.rrect(ctx, -1.05 * u, y * u, 2.1 * u, (h + 0.25) * u, 0.48 * u);
      ctx.fillStyle = '#F6F7F9'; ctx.fill();
      Ink.shade(ctx, 0, y + h / 2, 1.05, h / 2, u, 0.16, () => Ink.rrect(ctx, -1.05 * u, y * u, 2.1 * u, (h + 0.25) * u, 0.48 * u));
      ctx.lineWidth = 0.15 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      Ink.poly(ctx, [[-0.3, y + 0.04], [0.3, y + 0.04], [0.16, y + h], [-0.16, y + h]], color, u, 0.1);
      ctx.beginPath(); ctx.moveTo(-0.3 * u, (y + 0.04) * u); ctx.lineTo(0, (y + 0.75) * u); ctx.lineTo(0.3 * u, (y + 0.04) * u); ctx.lineWidth = 0.04 * u; ctx.strokeStyle = '#2C3E6B'; ctx.stroke();
      Ink.rrect(ctx, -0.12 * u, (y + 0.75) * u, 0.24 * u, 0.3 * u, 0.03 * u); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 0.05 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.fillStyle = '#C8312F'; ctx.fillRect(-0.6 * u, (y + 0.4) * u, 0.18 * u, 0.12 * u);
    } else if (costume === 'suit' || costume === 'coat') {
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
    // Belt, so the hip is a costume and not a body (a jumpsuit or lab coat has none).
    ctx.fillStyle = Ink.INK;
    if (costume !== 'jumpsuit' && costume !== 'labcoat') ctx.fillRect(-0.95 * u, (y + h - 0.28) * u, 1.9 * u, 0.16 * u);
    if (costume === 'apron') {
      // A work apron over the shirt: bib, straps and a pocket, in off-white.
      Ink.rrect(ctx, -0.62 * u, (y + 0.32) * u, 1.24 * u, (h + 0.2) * u, 0.16 * u);
      ctx.fillStyle = '#F3EEDF'; ctx.fill(); ctx.lineWidth = 0.12 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.5 * u, (y + 0.36) * u); ctx.lineTo(-0.72 * u, (y + 0.05) * u); ctx.moveTo(0.5 * u, (y + 0.36) * u); ctx.lineTo(0.72 * u, (y + 0.05) * u); ctx.stroke();
      Ink.rrect(ctx, -0.32 * u, (y + h * 0.62) * u, 0.64 * u, 0.36 * u, 0.06 * u); ctx.stroke();
    }
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
    // Angry goes purple, like a cartoon about to blow its top.
    Ink.oval(ctx, 0, hy, 1.34, 1.26, st.feel === 'angry' ? '#9C6BDB' : '#FFFFFF', u, 0.18);
    ctx.beginPath(); ctx.ellipse(0, hy * u, 1.34 * u, 1.26 * u, 0, 0, Math.PI * 2);
    Ink.shade(ctx, 0, hy, 1.34, 1.26, u, 0.09, () => ctx.ellipse(0, hy * u, 1.34 * u, 1.26 * u, 0, 0, Math.PI * 2));
    ctx.lineWidth = 0.18 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
    Cast.face(ctx, st, u, hy);
    Cast.hat(ctx, st, u, hy);
    if (st.feel === 'angry') Cast.steam(ctx, st, u, hy);
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
      if (feel === 'smug') {
        // Half-closed, pleased with itself.
        ctx.beginPath(); ctx.ellipse(x * u, eyeY * u, 0.15 * u, 0.12 * u, 0, 0, Math.PI); ctx.fill();
        ctx.lineWidth = 0.1 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo((x - 0.22) * u, (eyeY - 0.01) * u); ctx.lineTo((x + 0.22) * u, (eyeY - 0.01) * u); ctx.stroke();
        return;
      }
      if (feel === 'sleepy') {
        // Heavy lids: two flat lines.
        ctx.lineWidth = 0.12 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo((x - 0.24) * u, eyeY * u); ctx.lineTo((x + 0.24) * u, eyeY * u); ctx.stroke();
        return;
      }
      if (feel === 'shocked' && !blink) {
        // 1.2: wide ring eyes with small pupils, the classic stunned look.
        ctx.save(); ctx.beginPath(); ctx.arc(x * u, eyeY * u, 0.27 * u, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.lineWidth = 0.09 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
        ctx.fillStyle = Ink.INK; ctx.beginPath(); ctx.arc(x * u, eyeY * u, 0.1 * u, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        return;
      }
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
    else if (feel === 'nervous') { brow(-0.78, -0.42, -0.22, -0.58); brow(0.22, -0.58, 0.78, -0.42); }
    else if (feel === 'smug') { brow(-0.78, -0.5, -0.22, -0.36); brow(0.22, -0.36, 0.78, -0.5); }
    else if (feel === 'sleepy') { brow(-0.72, -0.42, -0.26, -0.42); brow(0.26, -0.42, 0.72, -0.42); }
    // A sweat drop for the sleepy and the nervous.
    if (feel === 'sleepy' || feel === 'nervous') {
      ctx.save(); ctx.fillStyle = '#8FD3F5'; ctx.lineWidth = 0.06 * u; ctx.strokeStyle = Ink.INK;
      const dy = ((st.t || 0) * 0.35) % 0.25;
      ctx.beginPath(); ctx.moveTo(1.05 * u, (hy - 0.95 + dy) * u); ctx.quadraticCurveTo(1.42 * u, (hy - 0.38 + dy) * u, 1.05 * u, (hy - 0.26 + dy) * u); ctx.quadraticCurveTo(0.68 * u, (hy - 0.38 + dy) * u, 1.05 * u, (hy - 0.95 + dy) * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(0.98 * u, (hy - 0.45 + dy) * u, 0.05 * u, 0.09 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.lineWidth = 0.11 * u; ctx.strokeStyle = Ink.INK;
    }
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
    } else if (feel === 'angry' && talk < 0.3) {
      // Gritted teeth.
      const w = 0.66, h = 0.27;
      ctx.beginPath(); ctx.roundRect((-w / 2) * u, (my - h / 2) * u, w * u, h * u, 0.06 * u);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.lineWidth = 0.07 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((-w / 2) * u, my * u); ctx.lineTo((w / 2) * u, my * u);
      for (const fx of [-0.165, 0, 0.165]) { ctx.moveTo(fx * u, (my - h / 2) * u); ctx.lineTo(fx * u, (my + h / 2) * u); }
      ctx.lineWidth = 0.045 * u; ctx.stroke();
      ctx.fillStyle = Ink.INK;
    } else if (feel === 'smug' && talk < 0.3) {
      // A sly, toothy grin, higher on one side.
      const grin = () => { ctx.beginPath(); ctx.moveTo(-0.5 * u, (my - 0.1) * u); ctx.quadraticCurveTo(0.0 * u, (my - 0.02) * u, 0.55 * u, (my - 0.26) * u); ctx.quadraticCurveTo(0.2 * u, (my + 0.42) * u, -0.5 * u, (my - 0.1) * u); ctx.closePath(); };
      grin(); ctx.fillStyle = Ink.INK; ctx.fill();
      ctx.save(); grin(); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-0.55 * u, (my - 0.3) * u, 1.15 * u, 0.3 * u); ctx.restore();
      ctx.lineWidth = 0.05 * u; ctx.strokeStyle = Ink.INK; ctx.beginPath(); for (const tx of [-0.2, 0.05, 0.3]) { ctx.moveTo(tx * u, (my - 0.22) * u); ctx.lineTo(tx * u, (my - 0.02) * u); } ctx.stroke();
      grin(); ctx.lineWidth = 0.1 * u; ctx.stroke();
      ctx.fillStyle = Ink.INK;
    } else if (feel === 'sleepy' && talk < 0.3) {
      ctx.lineWidth = 0.1 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-0.12 * u, (my + 0.04) * u); ctx.lineTo(0.12 * u, (my + 0.04) * u); ctx.stroke();
    } else if (feel === 'nervous' && talk < 0.3) {
      // A wobbly line.
      ctx.lineWidth = 0.1 * u; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const xx = -0.36 + k * 0.12, yy = my + 0.04 + (k % 2 ? -0.06 : 0.05); if (k) ctx.lineTo(xx * u, yy * u); else ctx.moveTo(xx * u, yy * u); }
      ctx.stroke();
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

  // Steam puffs rising from both sides of an angry head.
  static steam(ctx, st, u, hy) {
    for (const side of [-1, 1]) {
      for (const lag of [0, 0.5]) {
        const k = (((st.t || 0) * 0.95 + (side > 0 ? 0.25 : 0) + lag) % 1);
        const x = side * (1.55 + k * 0.6), y = hy - 0.3 - k * 1.35, r = 0.3 + k * 0.32;
        ctx.save();
        ctx.globalAlpha *= Math.max(0, 1 - k * 1.1);
        for (const [dx, dy, rr] of [[0, 0, 1], [side * 0.55, 0.12, 0.8], [side * 0.2, -0.45, 0.75]]) {
          ctx.beginPath(); ctx.arc((x + dx * r) * u, (y + dy * r) * u, r * rr * u, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF'; ctx.fill();
          ctx.lineWidth = 0.07 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
        }
        ctx.restore();
      }
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
    } else if (kind === 'flatcap') {
      // A low flat cap with a short peak (1900s workers, paperboys).
      ctx.beginPath();
      ctx.moveTo(-1.0 * u, (top + 0.1) * u); ctx.quadraticCurveTo(-0.9 * u, (top - 0.62) * u, 0.2 * u, (top - 0.62) * u);
      ctx.quadraticCurveTo(1.05 * u, (top - 0.58) * u, 1.05 * u, (top + 0.05) * u); ctx.closePath();
      ctx.fillStyle = '#6B5B4E'; ctx.fill(); ctx.lineWidth = 0.12 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      Ink.oval(ctx, 0.95, top + 0.08, 0.62, 0.15, '#5A4B40', u, 0.1);
    } else if (kind === 'conductor') {
      // A stiff railway conductor's cap with a peak and a gold badge.
      Ink.rrect(ctx, -0.95 * u, (top - 0.62) * u, 1.9 * u, 0.7 * u, 0.12 * u);
      ctx.fillStyle = '#23304F'; ctx.fill(); ctx.lineWidth = 0.12 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.fillStyle = '#F2C230'; ctx.fillRect(-0.95 * u, (top - 0.12) * u, 1.9 * u, 0.12 * u);
      Ink.oval(ctx, 0, top - 0.36, 0.17, 0.17, '#F2C230', u, 0.07);
      Ink.oval(ctx, 0.85, top + 0.08, 0.6, 0.15, '#151D33', u, 0.1);
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
    } else if (kind === 'viking') {
      // A Viking's round steel cap with a nose guard (real Viking helmets had no horns).
      const cy = hy - 0.62; // the brim sits above the eyes
      ctx.beginPath(); ctx.arc(0, cy * u, 1.1 * u, Math.PI, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#A3ABB5'; ctx.fill(); ctx.lineWidth = 0.13 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-0.42 * u, (cy - 0.62) * u, 0.22 * u, 0.12 * u, -0.5, 0, Math.PI * 2); ctx.fill();
      Ink.rrect(ctx, -1.2 * u, (cy - 0.14) * u, 2.4 * u, 0.3 * u, 0.1 * u); ctx.fillStyle = '#8C7A5B'; ctx.fill(); ctx.stroke();
      Ink.rrect(ctx, -0.075 * u, (cy - 0.2) * u, 0.15 * u, 0.9 * u, 0.05 * u); ctx.fillStyle = '#8F98A3'; ctx.fill(); ctx.stroke();
    } else if (kind === 'headset') {
      // 1.2: a headset over the hair: band, ear cup and a mic on a boom.
      if (st.hair && st.hair !== 'none') Cast.hairBack(ctx, { ...st, hat: 'none' }, u, hy);
      ctx.beginPath(); ctx.arc(0, (hy + 0.05) * u, 1.42 * u, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = 0.16 * u; ctx.strokeStyle = '#2A2D33'; ctx.stroke();
      Ink.oval(ctx, 1.3, hy + 0.15, 0.32, 0.42, '#3A3F4B', u, 0.1);
      ctx.beginPath(); ctx.moveTo(1.3 * u, (hy + 0.45) * u); ctx.quadraticCurveTo(1.1 * u, (hy + 0.95) * u, 0.45 * u, (hy + 0.78) * u); ctx.lineWidth = 0.08 * u; ctx.strokeStyle = '#2A2D33'; ctx.stroke();
      Ink.oval(ctx, 0.4, hy + 0.78, 0.12, 0.1, '#2A2D33', u, 0.05);
    } else if (kind === 'officer') {
      // 1.2: a navy peaked cap with a gold star badge.
      Ink.rrect(ctx, -1.05 * u, (top - 0.62) * u, 2.1 * u, 0.62 * u, 0.3 * u);
      ctx.fillStyle = '#2E3F73'; ctx.fill(); ctx.lineWidth = 0.12 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      Ink.rrect(ctx, -1.0 * u, (top - 0.08) * u, 2.0 * u, 0.2 * u, 0.06 * u); ctx.fillStyle = '#1E2A4F'; ctx.fill(); ctx.stroke();
      Ink.oval(ctx, 0.25, top + 0.2, 1.0, 0.16, '#1E2A4F', u, 0.1);
      Ink.oval(ctx, 0, top - 0.32, 0.22, 0.22, '#F2C230', u, 0.06);
      ctx.fillStyle = '#2E3F73'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.06 : 0.14; ctx.lineTo(Math.cos(a) * r * u, (top - 0.32 + Math.sin(a) * r) * u); }
      ctx.closePath(); ctx.fill();
    } else if (kind === 'bun') {
      // 1.2: hair in a bun on top, a headband, and a pencil stuck through the bun.
      const col = { brown: '#8A5A32', black: '#2A2422', blonde: '#E2B656', red: '#C45A32' }[st.hair] || '#8A5A32';
      Cast.hairBack(ctx, { ...st, hair: st.hair && st.hair !== 'none' ? st.hair : 'brown', hat: 'none' }, u, hy);
      ctx.save(); ctx.translate(0.35 * u, (top - 0.5) * u); ctx.rotate(0.5);
      Ink.rrect(ctx, -0.06 * u, -0.6 * u, 0.12 * u, 0.9 * u, 0.03 * u); ctx.fillStyle = '#F2C230'; ctx.fill(); ctx.lineWidth = 0.05 * u; ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.restore();
      Ink.oval(ctx, 0, top - 0.32, 0.5, 0.45, col, u, 0.12);
      ctx.beginPath(); ctx.arc(0, (hy + 0.15) * u, 1.32 * u, Math.PI * 1.12, Math.PI * 1.88); ctx.lineWidth = 0.17 * u; ctx.strokeStyle = '#8A5A32'; ctx.stroke();
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
    if (kind === 'camera') {
      Ink.rrect(ctx, -28, -18, 56, 38, 6); ctx.fillStyle = '#3A3F4B'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2A2A2E'; ctx.fillRect(-18, -26, 16, 9); ctx.fillStyle = '#9FD3F2'; ctx.beginPath(); ctx.arc(4, 1, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (kind === 'ruler') {
      ctx.save(); ctx.rotate(-0.5); Ink.rrect(ctx, -36, -8, 72, 16, 2); ctx.fillStyle = '#E8C547'; ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2; for (let k = -30; k <= 30; k += 6) { ctx.beginPath(); ctx.moveTo(k, -8); ctx.lineTo(k, k % 12 ? -3 : 1); ctx.stroke(); } ctx.restore();
    } else if (kind === 'rail') {
      // A short piece of steel rail, end on: head, web and foot.
      ctx.save(); ctx.rotate(-0.3); ctx.fillStyle = '#8D949E';
      ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(34, -10); ctx.lineTo(34, -2); ctx.lineTo(28, -2); ctx.lineTo(28, 6); ctx.lineTo(36, 10); ctx.lineTo(-36, 10); ctx.lineTo(-28, 6); ctx.lineTo(-28, -2); ctx.lineTo(-34, -2); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.fillStyle = '#B9C0C9'; ctx.fillRect(-32, -9, 64, 3); ctx.restore();
    } else if (kind === 'wrench') {
      ctx.fillStyle = '#9AA3AE'; ctx.save(); ctx.rotate(-0.6); Ink.rrect(ctx, -6, -30, 12, 52, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -32, 13, 0.35 * Math.PI, 2.65 * Math.PI); ctx.lineTo(4, -32); ctx.lineTo(-4, -32); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (kind === 'hammer') {
      ctx.save(); ctx.rotate(-0.4); ctx.fillStyle = '#8A5A32'; Ink.rrect(ctx, -5, -22, 10, 50, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5F6670'; Ink.rrect(ctx, -22, -34, 44, 16, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (kind === 'newspaper') {
      Ink.rrect(ctx, -30, -24, 60, 48, 2); ctx.fillStyle = '#EFEDE6'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2A2A2E'; ctx.fillRect(-24, -18, 48, 8); ctx.fillStyle = '#9A9AA0';
      for (let k = 0; k < 4; k++) ctx.fillRect(-24, -4 + k * 7, k % 2 ? 20 : 48, 3);
    } else if (kind === 'clipboard') {
      Ink.rrect(ctx, -22, -30, 44, 60, 4); ctx.fillStyle = '#B5844E'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-16, -20, 32, 44); ctx.fillStyle = '#9AA3AE'; ctx.fillRect(-10, -34, 20, 8);
      ctx.fillStyle = '#B0B0B5'; for (let k = 0; k < 4; k++) ctx.fillRect(-12, -12 + k * 9, 24, 3);
    } else if (kind === 'watch') {
      ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(14, -40, 20, -30); ctx.stroke();
      ctx.fillStyle = '#E8C547'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = Ink.INK; ctx.stroke();
      ctx.fillStyle = '#FFFDF5'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.moveTo(0, 0); ctx.lineTo(7, 3); ctx.stroke();
    } else if (kind === 'map') {
      Ink.rrect(ctx, -30, -22, 60, 44, 3); ctx.fillStyle = '#F1E2B8'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(-20, 12); ctx.quadraticCurveTo(0, -18, 18, 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = Ink.INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(22, 8); ctx.moveTo(22, 0); ctx.lineTo(14, 8); ctx.stroke();
    } else if (kind === 'letter') {
      Ink.rrect(ctx, -28, -18, 56, 36, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-28, -18); ctx.lineTo(0, 4); ctx.lineTo(28, -18); ctx.stroke();
      ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(0, 6, 5, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'key') {
      ctx.lineWidth = 6; ctx.strokeStyle = '#D4A017'; ctx.beginPath(); ctx.arc(-14, 0, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(26, 0); ctx.moveTo(18, 0); ctx.lineTo(18, 9); ctx.moveTo(25, 0); ctx.lineTo(25, 7); ctx.stroke();
    } else if (kind === 'book') {
      Ink.rrect(ctx, -24, -28, 48, 56, 4); ctx.fillStyle = '#7A3E2E'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F4EBD0'; ctx.fillRect(16, -24, 6, 48); ctx.strokeStyle = '#E8C15A'; ctx.lineWidth = 3; ctx.strokeRect(-16, -18, 26, 12);
    } else if (kind === 'lantern') {
      ctx.strokeStyle = Ink.INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -30, 9, Math.PI, 0); ctx.stroke();
      Ink.rrect(ctx, -16, -26, 32, 44, 5); ctx.fillStyle = 'rgba(255,214,102,0.95)'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3A3F4B'; ctx.fillRect(-18, -30, 36, 6); ctx.fillRect(-18, 16, 36, 6);
    } else if (kind === 'cup') {
      Ink.rrect(ctx, -18, -20, 32, 38, 5); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(18, -2, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = '#6F4E37'; ctx.fillRect(-14, -16, 24, 6);
    } else if (kind === 'bag') {
      Ink.rrect(ctx, -26, -14, 52, 40, 8); ctx.fillStyle = '#B5763C'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -14, 14, Math.PI, 0); ctx.stroke();
    } else if (kind === 'phone') {
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
