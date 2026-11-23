// src/toon.ts
var INK = "#241726";
var SKIN = "#ffe2c2";
var WHITE = "#ffffff";
var MOUTH = "#5a1e28";
var TONGUE = "#e86e78";
var SH_SKIN = [0.96, 0.86, 0.84];
var SH_CLOTH = [0.64, 0.66, 0.74];
var SH_FELT = [0.62, 0.62, 0.7];
var rad = (d) => d * Math.PI / 180;
var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
var mul = (c, m) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v, k) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch(n >> 16 & 255, m[0])}${ch(n >> 8 & 255, m[1])}${ch(n & 255, m[2])}`;
};
var shade = (c, k) => mul(c, [k, k, k]);
var mix = (a, b, t) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round((A >> s & 255) * (1 - t) + (B >> s & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
var rnd = (seed, k) => {
  const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var rotPts = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
var rotAbout = (q, a, c) => rotPts([q], a, c[0], c[1])[0];
var lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
var curve = (a, k, b, n = 10) => {
  const c = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};
var RIFLEMAN = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
var OFFICER = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
var SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];
var townsfolk = (v = 0) => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};
var Pen = class {
  g;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot = null;
  constructor(g) {
    this.g = g;
  }
  P(x, y) {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts, close) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = this.P(p[0], p[1]);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts, fill, ol) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (w) {
      g.lineWidth = w;
      g.strokeStyle = INK;
      g.lineJoin = "round";
      g.stroke();
    }
  }
  ell(cx, cy, rx, ry, fill, ol, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts, fill, w, ink = true) {
    const g = this.g;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (ink) {
      this.path(pts, false);
      g.strokeStyle = INK;
      g.lineWidth = w + 2 * this.ol * 0.9;
      g.stroke();
    }
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
  }
  stroke(pts, w, fill = INK) {
    const g = this.g;
    g.lineCap = "round";
    g.lineJoin = "round";
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
  }
  arc(cx, cy, rx, ry, a0, a1, w, fill = INK) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + (a1 - a0) * i / 24)), cy + ry * Math.sin(rad(a0 + (a1 - a0) * i / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx, cy, r, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath();
    this.g.arc(x, y, r, 0, Math.PI * 2);
    this.g.fillStyle = fill;
    this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts, fn) {
    const g = this.g;
    g.save();
    this.path(pts, true);
    g.clip();
    fn();
    g.restore();
  }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts, base, shadow, light, R, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
    }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base);
    gr.addColorStop(r0 / r1, base);
    gr.addColorStop(1, shadow);
    this.path(pts, true);
    g.fillStyle = gr;
    g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts, base, shadow, light, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
      const d = x * dx + y * dy;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base);
    gr.addColorStop(flat, base);
    gr.addColorStop(1, shadow);
    this.path(pts, true);
    g.fillStyle = gr;
    g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts, w0, thick, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
    }
    const out = [], inn = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]);
      inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r) => {
      r.forEach(([x0, y0], i) => {
        const [x, y] = this.P(x0, y0);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.closePath();
    };
    g.beginPath();
    trace(out);
    trace(inn.reverse());
    g.fillStyle = col;
    g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts, fill, w, rim, cap = "butt") {
    const g = this.g;
    g.lineCap = cap;
    g.lineJoin = "round";
    this.path(pts, false);
    g.strokeStyle = INK;
    g.lineWidth = w + 2 * rim;
    g.stroke();
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
    g.lineCap = "round";
  }
};
var ellPts = (cx, cy, rx, ry, a0 = 0, a1 = 360, rot = 0, n = 48) => {
  const r = rad(rot), pts = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + (a1 - a0) * i / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};
var taper = (p, a, b, wa, wb, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([
    [a[0] + nx * wa / 2, a[1] + ny * wa / 2],
    [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2],
    [a[0] - nx * wa / 2, a[1] - ny * wa / 2]
  ], col, 0);
  p.dot(a[0], a[1], wa / 2, col);
  p.dot(b[0], b[1], wb / 2, col);
};
var blobPts = (cx, cy, B, n = 72) => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};
var headBlob = (seed, a = 118, facing = 0) => ({
  a,
  b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5),
  nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)),
  noise: 8e-3,
  seed
});
var thickAngle = (light) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
var DEF_LIGHT = rad(-120);
var FACE = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" }
};
var halfLid = (k) => k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k;
var eyeKind = (k, lid) => lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
var lidOf = (b) => b === true ? 1 : Number(b) || 0;
var eye = (p, kind, x, ey, u, side, look, skin) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot":
      p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0);
      break;
    case "small":
      p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0);
      break;
    case "lid":
      p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw);
      break;
    case "slit":
      p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw);
      break;
    case "happy":
      p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw);
      break;
    case "dash":
      p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw);
      break;
    case "squeeze":
      p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw);
      break;
    case "shock":
    case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u);
      p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") {
        p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360);
        p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u);
      }
      break;
    default: {
      const s = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};
var dmouth = (p, mx, y, rx, ry, u, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};
var mouth = (p, kind, mx, my, u, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash":
      p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw);
      break;
    case "frown":
      p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw);
      break;
    case "smirk":
      p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw);
      break;
    case "smile":
      p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw);
      break;
    case "smileWide":
      p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw);
      break;
    case "grin":
      dmouth(p, mx, my - u, 12 * u * k, 8 * u, u);
      break;
    case "laugh":
      dmouth(p, mx, my, 16 * u * k, 11 * u, u, true);
      break;
    case "o":
      p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u);
      break;
    case "O":
      p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u);
      break;
    case "wave": {
      const s = [];
      for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]);
      p.stroke(s, 3 * u);
      break;
    }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick":
      p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw);
      p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u);
      break;
  }
};
var faceFront = (p, cx, cy, W, expr, facing, look, lid, brim, skin, moustache, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};
var BONNET = "#e9cf8f";
var BONNET_BRIM = "#d6b46a";
var hatBehind = (p, o, H, cx, hc, light, thick, ow, side) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};
var hatOn = (p, o, hp, H, cx, hc, light, seed, facing, side) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5));
  const R = (pts) => rotPts(pts, a, cx, hc);
  const sag = (yb, wb) => {
    const base = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]);
    }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = a * 180 / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg);
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg);
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x, y) => y < cut || side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b;
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03]);
    if (arc.length < 3) return;
    if (o.hat === "hair") {
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap : o.hair;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = a * 180 / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "viking") {
    const yb = crown + 0.36 * HH, ht = 0.42 * HH, wb = 0.5 * W;
    const dome = [];
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI * (i / 16);
      dome.push([cx - wb * Math.cos(t), yb - ht * Math.sin(t)]);
    }
    const body = R(dome);
    p.shadedFill(body, "#a7afb8", "#6f7780", light, wb, 0.45);
    p.poly(body, null, ow);
    p.band(R([[cx - wb - 2 * u, yb - 0.02 * HH], [cx + wb + 2 * u, yb - 0.02 * HH]]), "#8c7a5b", 0.07 * HH, 1.4 * u);
    if (!side) p.band(R([[cx + 2 * u * facing, yb - 0.04 * HH], [cx + 2 * u * facing, yb + 0.2 * HH]]), "#8f98a3", 7 * u, 1.4 * u);
    else p.band(R([[cx + 30 * u, yb - 0.04 * HH], [cx + 30 * u, yb + 0.16 * HH]]), "#8f98a3", 6 * u, 1.4 * u);
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, a * 180 / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};
var drawItem = (p, item, x, y, s) => {
  const box = (w, h, fill, ol = 2.2) => p.poly([[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h]], fill, ol * s);
  switch (item) {
    case "key":
      p.ell(x - 10 * s, y, 9 * s, 9 * s, "#e8b93a", 2.2 * s);
      p.ell(x - 10 * s, y, 3.5 * s, 3.5 * s, "#8a6a1e", 0);
      p.band([[x - 2 * s, y], [x + 20 * s, y]], "#e8b93a", 4.5 * s, 1.6 * s);
      p.band([[x + 14 * s, y], [x + 14 * s, y + 7 * s]], "#e8b93a", 3.5 * s, 1.4 * s);
      p.band([[x + 19 * s, y], [x + 19 * s, y + 6 * s]], "#e8b93a", 3.5 * s, 1.4 * s);
      break;
    case "map":
      p.poly([[x - 26 * s, y - 18 * s], [x - 8 * s, y - 14 * s], [x + 9 * s, y - 18 * s], [x + 26 * s, y - 14 * s], [x + 26 * s, y + 18 * s], [x + 9 * s, y + 14 * s], [x - 8 * s, y + 18 * s], [x - 26 * s, y + 14 * s]], "#efd9a6", 2.2 * s);
      p.stroke([[x - 18 * s, y + 8 * s], [x - 6 * s, y - 2 * s], [x + 6 * s, y + 4 * s], [x + 15 * s, y - 6 * s]], 2 * s, "#c8102e");
      p.stroke([[x + 12 * s, y - 9 * s], [x + 18 * s, y - 3 * s]], 2.2 * s, "#c8102e");
      p.stroke([[x + 18 * s, y - 9 * s], [x + 12 * s, y - 3 * s]], 2.2 * s, "#c8102e");
      break;
    case "paper":
    case "sign":
      box(item === "sign" ? 26 : 17, item === "sign" ? 17 : 22, item === "sign" ? "#f4f1ea" : "#fbfaf6");
      for (let i = 0; i < 4; i++) p.stroke([[x - 11 * s, y - 12 * s + i * 7 * s], [x + (i === 3 ? 2 : 11) * s, y - 12 * s + i * 7 * s]], 1.8 * s, "#9aa2ac");
      if (item === "sign") p.stroke([[x - 18 * s, y - 14 * s], [x + 18 * s, y - 14 * s]], 3 * s, "#c8102e");
      break;
    case "book":
      p.poly([[x - 26 * s, y - 16 * s], [x, y - 12 * s], [x + 26 * s, y - 16 * s], [x + 26 * s, y + 16 * s], [x, y + 20 * s], [x - 26 * s, y + 16 * s]], "#fbfaf6", 2.2 * s);
      p.stroke([[x, y - 12 * s], [x, y + 20 * s]], 2 * s, "#8a5a3c");
      for (let i = 0; i < 3; i++) for (const d of [-1, 1]) p.stroke([[x + d * 5 * s, y - 6 * s + i * 7 * s], [x + d * 20 * s, y - 8 * s + i * 7 * s]], 1.6 * s, "#9aa2ac");
      break;
    case "money":
      for (let i = 2; i >= 0; i--) {
        p.poly([[x - 22 * s + i * 3 * s, y - 11 * s - i * 3 * s], [x + 22 * s + i * 3 * s, y - 11 * s - i * 3 * s], [x + 22 * s + i * 3 * s, y + 11 * s - i * 3 * s], [x - 22 * s + i * 3 * s, y + 11 * s - i * 3 * s]], "#7fc27a", 2 * s);
      }
      p.ell(x + 6 * s, y - 6 * s, 6 * s, 6 * s, "#a8dca0", 1.6 * s);
      p.stroke([[x + 6 * s, y - 9 * s], [x + 6 * s, y - 3 * s]], 1.6 * s, "#2e6b2a");
      break;
    case "gold":
      p.poly([[x - 22 * s, y + 10 * s], [x + 22 * s, y + 10 * s], [x + 15 * s, y - 10 * s], [x - 15 * s, y - 10 * s]], "#f2c230", 2.2 * s);
      p.poly([[x - 11 * s, y - 6 * s], [x + 11 * s, y - 6 * s], [x + 8 * s, y - 1 * s], [x - 8 * s, y - 1 * s]], "#ffe28a", 0);
      break;
    case "gem":
      p.poly([[x - 16 * s, y - 6 * s], [x - 8 * s, y - 15 * s], [x + 8 * s, y - 15 * s], [x + 16 * s, y - 6 * s], [x, y + 16 * s]], "#5bc8f0", 2.2 * s);
      p.poly([[x - 6 * s, y - 12 * s], [x + 2 * s, y - 12 * s], [x - 4 * s, y - 4 * s]], "#c8f0ff", 0);
      break;
    case "flask":
      p.poly([[x - 5 * s, y - 20 * s], [x + 5 * s, y - 20 * s], [x + 5 * s, y - 8 * s], [x + 16 * s, y + 14 * s], [x - 16 * s, y + 14 * s], [x - 5 * s, y - 8 * s]], "#e8f4f8", 2.2 * s);
      p.poly([[x - 11 * s, y + 4 * s], [x + 11 * s, y + 4 * s], [x + 15 * s, y + 12 * s], [x - 15 * s, y + 12 * s]], "#46d07a", 0);
      p.dot(x - 3 * s, y + 7 * s, 2 * s, "#c8f8d8");
      p.dot(x + 4 * s, y + 9 * s, 1.5 * s, "#c8f8d8");
      break;
    case "cup":
      p.poly([[x - 11 * s, y - 13 * s], [x + 11 * s, y - 13 * s], [x + 9 * s, y + 13 * s], [x - 9 * s, y + 13 * s]], "#f4f1ea", 2.2 * s);
      p.arc(x + 13 * s, y, 6 * s, 7 * s, -90, 90, 2.6 * s);
      p.poly([[x - 10 * s, y - 6 * s], [x + 10 * s, y - 6 * s], [x + 9.6 * s, y - 1 * s], [x - 9.6 * s, y - 1 * s]], "#c8102e", 0);
      break;
    case "tool":
      p.band([[x - 18 * s, y + 14 * s], [x + 10 * s, y - 8 * s]], "#9aa2ac", 5 * s, 1.6 * s, "round");
      p.ell(x + 14 * s, y - 12 * s, 8 * s, 8 * s, "#9aa2ac", 2.2 * s);
      p.poly([[x + 12 * s, y - 22 * s], [x + 20 * s, y - 18 * s], [x + 16 * s, y - 12 * s]], "#f4f1ea", 0);
      break;
    case "flashlight":
      p.poly([[x - 6 * s, y + 18 * s], [x + 6 * s, y + 18 * s], [x + 7 * s, y - 8 * s], [x - 7 * s, y - 8 * s]], "#3a3f4b", 2 * s);
      p.poly([[x - 10 * s, y - 8 * s], [x + 10 * s, y - 8 * s], [x + 9 * s, y - 16 * s], [x - 9 * s, y - 16 * s]], "#c9ced6", 2 * s);
      p.ell(x, y - 16 * s, 8 * s, 2.5 * s, "#fff4b0", 1.2 * s);
      break;
    case "remote":
      p.poly([[x - 7 * s, y - 18 * s], [x + 7 * s, y - 18 * s], [x + 7 * s, y + 18 * s], [x - 7 * s, y + 18 * s]], "#2b2f38", 2 * s);
      p.dot(x, y - 10 * s, 3.2 * s, "#e5484d");
      for (let i = 0; i < 3; i++) p.dot(x, y + i * 6 * s, 2 * s, "#9aa2ac");
      break;
    case "food":
      p.ell(x, y + 6 * s, 20 * s, 8 * s, "#f4f1ea", 2 * s);
      p.ell(x, y - 2 * s, 14 * s, 9 * s, "#c8823a", 2 * s, 180, 360);
      p.band([[x - 14 * s, y + 1 * s], [x + 14 * s, y + 1 * s]], "#46b07a", 3 * s, 1 * s);
      break;
    case "bomb":
      p.ell(x, y + 3 * s, 15 * s, 15 * s, "#2b2f38", 2.2 * s);
      p.band([[x + 8 * s, y - 10 * s], [x + 14 * s, y - 18 * s]], "#8a5a3c", 3 * s, 1 * s);
      p.dot(x + 15 * s, y - 20 * s, 4 * s, "#ffb04a");
      p.dot(x - 5 * s, y - 3 * s, 3 * s, "#5a6270");
      break;
    default:
      box(24, 18, "#9c6a3c", 2.6);
      p.poly([[x - 24 * s, y - 18 * s], [x + 24 * s, y - 18 * s], [x + 24 * s, y - 11 * s], [x - 24 * s, y - 11 * s]], "#7d5230", 1.8 * s);
      p.band([[x, y - 18 * s], [x, y - 2 * s]], "#efe0bd", 6 * s, 1.2 * s);
      p.stroke([[x - 16 * s, y + 8 * s], [x - 6 * s, y + 8 * s]], 2 * s, "#5a3b22");
  }
};
var BUILD = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1, tw: 0.72 }
};
var footStroke = (p, a, b, w, col) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
var EXTRA_HATS = ["beanie", "hardhat", "chef", "crown", "helmet"];
var suitDecor = (p, o, x, chin, bot, ta, HH, u) => {
  const k = o.suit;
  if (!k) return;
  if (k === "prison") {
    p.poly([[x - 15 * u, chin - 4 * u], [x + 15 * u, chin - 4 * u], [x, chin + 20 * u]], "#f4f1ea", 1.6 * u);
    p.poly([[x + 0.35 * ta, chin + 0.3 * HH], [x + 0.75 * ta, chin + 0.3 * HH], [x + 0.75 * ta, chin + 0.48 * HH], [x + 0.35 * ta, chin + 0.48 * HH]], null, 1.5 * u);
    for (let i = 0; i < 3; i++) p.stroke([[x - 0.55 * ta + i * 4 * u, bot - 0.32 * HH], [x - 0.55 * ta + i * 4 * u + 2 * u, bot - 0.36 * HH]], 1.4 * u, "rgba(60,40,20,0.5)");
  } else if (k === "guard") {
    p.poly([[x - 20 * u, chin - 4 * u], [x - 2 * u, chin + 14 * u], [x - 14 * u, chin + 16 * u]], shade(o.jacket, 0.8), 1.4 * u);
    p.poly([[x + 20 * u, chin - 4 * u], [x + 2 * u, chin + 14 * u], [x + 14 * u, chin + 16 * u]], shade(o.jacket, 0.8), 1.4 * u);
    for (const s of [-1, 1]) p.poly([[x + s * 0.3 * ta, chin + 0.3 * HH], [x + s * 0.7 * ta, chin + 0.3 * HH], [x + s * 0.7 * ta, chin + 0.42 * HH], [x + s * 0.3 * ta, chin + 0.42 * HH]], shade(o.jacket, 0.85), 1.4 * u);
  } else if (k === "astro") {
    p.poly([[x - 0.75 * ta, chin + 0.24 * HH], [x - 0.35 * ta, chin + 0.24 * HH], [x - 0.35 * ta, chin + 0.36 * HH], [x - 0.75 * ta, chin + 0.36 * HH]], "#f4f1ea", 1.4 * u);
    for (let i = 0; i < 3; i++) p.stroke([[x - 0.75 * ta, chin + 0.27 * HH + i * 0.035 * HH], [x - 0.35 * ta, chin + 0.27 * HH + i * 0.035 * HH]], 1.2 * u, "#c8102e");
    p.poly([[x - 0.75 * ta, chin + 0.24 * HH], [x - 0.6 * ta, chin + 0.24 * HH], [x - 0.6 * ta, chin + 0.3 * HH], [x - 0.75 * ta, chin + 0.3 * HH]], "#2f4fa8", 0);
    p.poly([[x + 0.3 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.36 * HH], [x + 0.3 * ta, chin + 0.36 * HH]], "#f4f1ea", 1.4 * u);
  } else if (k === "coat") {
    p.poly([[x - 8 * u, chin - 4 * u], [x + 8 * u, chin - 4 * u], [x + 6 * u, bot], [x - 6 * u, bot]], "#7fb3d9", 0);
    for (const s of [-1, 1]) p.stroke([[x + s * 8 * u, chin - 2 * u], [x + s * 18 * u, chin + 0.35 * HH], [x + s * 8 * u, chin + 0.6 * HH]], 1.8 * u);
    p.poly([[x + 0.45 * ta, bot - 0.45 * HH], [x + 0.8 * ta, bot - 0.45 * HH], [x + 0.8 * ta, bot - 0.3 * HH], [x + 0.45 * ta, bot - 0.3 * HH]], null, 1.4 * u);
  } else if (k === "suit") {
    p.poly([[x - 10 * u, chin - 4 * u], [x + 10 * u, chin - 4 * u], [x, chin + 0.45 * HH]], "#f4f1ea", 1.4 * u);
    p.poly([[x - 3 * u, chin + 2 * u], [x + 3 * u, chin + 2 * u], [x + 4 * u, chin + 0.38 * HH], [x, chin + 0.44 * HH], [x - 4 * u, chin + 0.38 * HH]], "#c8102e", 1.2 * u);
  } else if (k === "chef") {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(x + s * 9 * u, chin + 0.15 * HH + i * 0.18 * HH, 2.6 * u, "#c9ced6");
  }
};
var chestAcc = (p, o, x, chin, bot, ta, HH, u) => {
  const a = o.acc || [];
  if (a.includes("chain")) {
    const pts = curve([x - 0.55 * ta, chin + 2 * u], [x, chin + 0.42 * HH], [x + 0.55 * ta, chin + 2 * u], 14);
    p.stroke(pts, 4.5 * u, INK);
    p.stroke(pts, 3 * u, "#e8b923");
    p.ell(x, chin + 0.32 * HH, 9 * u, 9 * u, "#e8b923", 1.6 * u);
    p.stroke([[x + 3 * u, chin + 0.3 * HH - 4 * u], [x - 3 * u, chin + 0.32 * HH], [x + 3 * u, chin + 0.34 * HH], [x - 3 * u, chin + 0.32 * HH + 5 * u]], 1.4 * u, "#7a5f12");
  }
  if (a.includes("tie") && o.suit !== "suit") p.poly([[x - 3 * u, chin + 2 * u], [x + 3 * u, chin + 2 * u], [x + 4 * u, chin + 0.38 * HH], [x, chin + 0.44 * HH], [x - 4 * u, chin + 0.38 * HH]], "#c8102e", 1.2 * u);
  if (a.includes("badge")) p.poly(Array.from({ length: 10 }, (_, i) => {
    const r = (i % 2 ? 4 : 9) * u, t = -Math.PI / 2 + i * Math.PI / 5;
    return [x - 0.55 * ta + Math.cos(t) * r, chin + 0.3 * HH + Math.sin(t) * r];
  }), "#e8b923", 1.4 * u);
  if (a.includes("nametag")) p.poly([[x + 0.3 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.36 * HH], [x + 0.3 * ta, chin + 0.36 * HH]], "#f4f1ea", 1.4 * u);
  if (a.includes("patch")) p.ell(x - 0.6 * ta, chin + 0.3 * HH, 7 * u, 7 * u, "#2f4fa8", 1.4 * u);
};
var hatExtra = (p, o, H, cx, hc, u) => {
  const k = o.hat, top = hc - H.b, A = H.a;
  if (!k || !EXTRA_HATS.includes(k)) return;
  if (k === "beanie") {
    p.ell(cx, hc - 0.38 * H.b, A * 1.02, H.b * 0.66, o.cap || "#c8102e", 2.2 * u, 180, 360);
    p.poly([[cx - A * 1.04, hc - 0.4 * H.b], [cx + A * 1.04, hc - 0.4 * H.b], [cx + A * 1, hc - 0.22 * H.b], [cx - A * 1, hc - 0.22 * H.b]], shade(o.cap || "#c8102e", 0.82), 2 * u);
  } else if (k === "hardhat" || k === "helmet") {
    const col = k === "hardhat" ? o.cap || "#f2c230" : o.cap || "#4a5a3a";
    p.ell(cx, hc - 0.35 * H.b, A * 0.98, H.b * 0.7, col, 2.2 * u, 180, 360);
    p.poly([[cx - A * 1.15, hc - 0.36 * H.b], [cx + A * 1.15, hc - 0.36 * H.b], [cx + A * 1.1, hc - 0.26 * H.b], [cx - A * 1.1, hc - 0.26 * H.b]], shade(col, 0.85), 2 * u);
    if (k === "hardhat") p.stroke([[cx, top - 0.02 * H.b], [cx, hc - 0.4 * H.b]], 4 * u, shade(col, 0.8));
  } else if (k === "chef") {
    p.poly([[cx - A * 0.7, hc - 0.55 * H.b], [cx + A * 0.7, hc - 0.55 * H.b], [cx + A * 0.72, hc - 0.32 * H.b], [cx - A * 0.72, hc - 0.32 * H.b]], "#f4f1ea", 2 * u);
    for (const [dx, r] of [[-0.42, 0.42], [0.42, 0.42], [0, 0.5]]) p.ell(cx + dx * A, top - 0.2 * H.b, r * A, r * A * 0.9, "#ffffff", 2 * u);
  } else if (k === "crown") {
    const y0 = hc - 0.52 * H.b, y1 = top - 0.38 * H.b, w = A * 0.75;
    p.poly([[cx - w, y0], [cx - w, y1 + 10 * u], [cx - w * 0.5, y0 - 18 * u], [cx, y1], [cx + w * 0.5, y0 - 18 * u], [cx + w, y1 + 10 * u], [cx + w, y0]], "#e8b923", 2.2 * u);
    for (const dx of [-0.5, 0, 0.5]) p.dot(cx + dx * w, y0 - 6 * u, 3.4 * u, "#c8102e");
  }
};
var headAcc = (p, o, H, cx, hc, u, facing) => {
  const a = o.acc || [];
  const fx = cx + 7 * u * facing, mx = cx + 8 * u * facing, my = hc + 20 * u;
  if (a.includes("headset")) {
    p.stroke(curve([cx - H.a * 0.98, hc - 0.05 * H.b], [cx, hc - H.b * 1.35], [cx + H.a * 0.98, hc - 0.05 * H.b], 18), 5 * u, "#2b2f38");
    for (const s of [-1, 1]) p.ell(cx + s * H.a * 0.96, hc + 2 * u, 7 * u, 11 * u, "#2b2f38", 1.8 * u);
    p.stroke(curve([cx + H.a * 0.96, hc + 8 * u], [cx + H.a * 0.8, my + 6 * u], [mx + 12 * u, my + 2 * u], 10), 2.6 * u, "#2b2f38");
    p.dot(mx + 12 * u, my + 2 * u, 3.6 * u, "#2b2f38");
  }
  if (a.includes("headlamp")) {
    p.band([[cx - H.a * 0.98, hc - 0.5 * H.b], [cx + H.a * 0.98, hc - 0.5 * H.b]], "#f4f1ea", 6 * u, 1.4 * u);
    p.ell(fx, hc - 0.5 * H.b, 9 * u, 8 * u, "#9aa2ac", 1.8 * u);
    p.dot(fx, hc - 0.5 * H.b, 4.5 * u, "#fff6c8");
  }
  if (a.includes("shades")) {
    for (const s of [-1, 1]) {
      p.ell(fx + s * 13 * u, hc + 1 * u, 11.5 * u, 8.5 * u, "#15171c", 1.6 * u);
      p.stroke([[fx + s * 13 * u - 6 * u, hc - 3 * u], [fx + s * 13 * u - 1 * u, hc - 5 * u]], 2 * u, "rgba(255,255,255,0.75)");
    }
    p.stroke([[fx - 2 * u, hc - 1 * u], [fx + 2 * u, hc - 1 * u]], 2.4 * u, "#15171c");
  } else if (a.includes("glasses")) {
    for (const s of [-1, 1]) p.ell(fx + s * 13 * u, hc, 10 * u, 9 * u, null, 2.2 * u);
    p.stroke([[fx - 3 * u, hc - 1 * u], [fx + 3 * u, hc - 1 * u]], 2.2 * u);
  }
  if (a.includes("cigar")) {
    p.band([[mx + 5 * u, my + 1 * u], [mx + 27 * u, my + 6 * u]], "#7a4a2a", 4.6 * u, 1.2 * u, "round");
    p.dot(mx + 28 * u, my + 6.3 * u, 2.4 * u, "#ff7a2a");
    for (let i = 0; i < 3; i++) p.ell(mx + 31 * u + i * 4 * u, my - 6 * u - i * 9 * u, (3 + i) * u, (3 + i) * u, "rgba(210,210,215,0.7)", 0);
  }
};
var bodyFront = (p, o, opts) => {
  const {
    phase = 0,
    expr = "neutral",
    mode = "march",
    look = 0,
    blink = false,
    lift = 60,
    prop = null,
    tilt = 0,
    headTilt = 0,
    wave,
    light = DEF_LIGHT,
    facing = 0,
    seed = 1
  } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h = [300 + side * 15 * u, hipY], k = [300 + side * 36 * u, hipY + 0.2 * HH], f = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]]
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T = {
    a: Bd.tw / 2 * W / 1.06,
    b: 0.5 * (torsoBot - (chin - 0.25 * HH)),
    nTop: 2.2,
    nBot: 2.6,
    egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing,
    rot: 0,
    noise: 6e-3,
    seed: seed + 7
  };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side, fwd) => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  const R0 = [300 + 47 * u, torsoBot + 0.12 * HH], R1 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  const arms = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== void 0) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  {
    const S1 = sh(1), S0 = sh(-1), last = arms.length - 1;
    if (Array.isArray(prop) && (prop[0] === "eat" || prop[0] === "drink")) {
      const k = clamp(prop[1], 0, 1), rest = [tcx + 0.6 * T.a, S1[1] + 0.55 * HH], mouthAt = [300 + 8 * u * facing + 14 * u, chin - 0.12 * HH];
      arms[last] = { pts: [S1, [tcx + 1.2 * T.a + 6 * u, S1[1] + 0.32 * HH - k * 0.22 * HH], lerp2(rest, mouthAt, k)], front: true };
    } else if (prop === "phone") {
      arms[last] = { pts: [S1, [tcx + 1.25 * T.a + 8 * u, S1[1] + 0.1 * HH], [300 + H.a * 0.9, hc + 6 * u]], front: true };
    } else if (prop === "type") {
      arms.length = 0;
      for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.05 * T.a + 2 * u), sh(side)[1] + 0.38 * HH], [tcx + side * 0.38 * T.a, torsoBot + 0.02 * HH]], front: true });
    } else if (Array.isArray(prop) && prop[0] === "shovel") {
      const lift2 = clamp(prop[1], 0, 1) * 0.28 * HH;
      arms.length = 0;
      arms.push({ pts: [S0, [tcx - 0.95 * T.a, S0[1] + 0.32 * HH], [tcx - 0.15 * T.a, chin + 0.28 * HH - lift2]], front: true });
      arms.push({ pts: [S1, [tcx + 1.1 * T.a + 4 * u, S1[1] + 0.36 * HH], [tcx + 0.6 * T.a, torsoBot - 0.04 * HH - lift2]], front: true });
    } else if (prop === "bag") arms[last] = { pts: hang(1, 0), front: true };
    else if (Array.isArray(prop)) {
      const k = clamp(prop[1], 0, 1), two2 = (L, R, eL, eR) => {
        arms.length = 0;
        arms.push({ pts: [S0, eL, L], front: true }, { pts: [S1, eR, R], front: true });
      };
      const elbow = (side, dy, out = 0) => [tcx + side * (1.12 * T.a + (4 + out) * u), sh(side)[1] + dy * HH];
      const chest = chin + 0.55 * HH;
      switch (prop[0]) {
        case "hold":
        case "count": {
          const y = chest - 0.08 * HH * k;
          two2([tcx - 0.42 * T.a, y], [tcx + 0.42 * T.a, y + (prop[0] === "count" ? -0.06 * HH * k : 0)], elbow(-1, 0.42), elbow(1, 0.42));
          break;
        }
        case "lift": {
          const y = lerp2([0, torsoBot + 0.02 * HH], [0, chin + 0.42 * HH], k)[1];
          two2([tcx - 0.55 * T.a, y], [tcx + 0.55 * T.a, y], elbow(-1, lerp2([0, 0.5], [0, 0.3], k)[1], 6), elbow(1, lerp2([0, 0.5], [0, 0.3], k)[1], 6));
          break;
        }
        case "read":
          two2([tcx - 0.5 * T.a, chest - 0.02 * HH], [tcx + 0.5 * T.a, chest - 0.02 * HH - 0.02 * HH * k], elbow(-1, 0.4), elbow(1, 0.4));
          break;
        case "write":
          two2([tcx - 0.35 * T.a, chest], [tcx + (0.05 + 0.3 * k) * T.a, chest - 0.04 * HH + 3 * u * Math.sin(k * 12)], elbow(-1, 0.42), elbow(1, 0.45));
          break;
        case "press": {
          const reach = 1.85 * T.a - 8 * u * k;
          arms[last] = { pts: [S1, [tcx + 1.2 * T.a + 10 * u, S1[1] + 0.2 * HH], [tcx + reach, S1[1] + 0.18 * HH]], front: true };
          break;
        }
        case "point":
          arms[last] = { pts: [S1, [tcx + 1.4 * T.a + 12 * u, S1[1] - 0.08 * HH], [tcx + 1.95 * T.a + 2 * u * k, S1[1] - 0.24 * HH - 2 * u * k]], front: true };
          break;
        case "cheer": {
          const a = Math.sin(k * Math.PI * 2) * 6 * u;
          two2([tcx - 1.3 * T.a - 12 * u + a, crown - 0.05 * HH], [tcx + 1.3 * T.a + 12 * u + a, crown - 0.05 * HH], elbow(-1, -0.25, 8), elbow(1, -0.25, 8));
          break;
        }
        case "clap": {
          const g = (1 - k) * 0.35 * T.a + 4 * u;
          two2([300 - g, chest - 0.05 * HH], [300 + g, chest - 0.05 * HH], elbow(-1, 0.4), elbow(1, 0.4));
          break;
        }
        case "think":
          two2([tcx + 0.15 * T.a, chest + 0.02 * HH], [300 + H.a * 0.5, chin - 0.04 * HH - 2 * u * k], elbow(-1, 0.45), [tcx + 1.05 * T.a, S1[1] + 0.42 * HH]);
          break;
        case "shrug":
          two2([tcx - 1.7 * T.a, S0[1] + 0.05 * HH - 4 * u * k], [tcx + 1.7 * T.a, S1[1] + 0.05 * HH - 4 * u * k], elbow(-1, 0.38, 4), elbow(1, 0.38, 4));
          break;
        case "panic": {
          const j = Math.sin(k * Math.PI * 4) * 2 * u;
          two2([300 - H.a * 0.98 + j, hc + 0.1 * H.b], [300 + H.a * 0.98 + j, hc + 0.1 * H.b], elbow(-1, 0.05, 14), elbow(1, 0.05, 14));
          break;
        }
        case "look":
          two2([300 - 0.32 * H.a, hc + 0.22 * H.b], [300 + 0.32 * H.a, hc + 0.22 * H.b], elbow(-1, 0.35, -6), elbow(1, 0.35, -6));
          break;
        case "salute":
          arms[last] = { pts: [S1, [tcx + 1.35 * T.a + 8 * u, S1[1] - 0.05 * HH], [300 + H.a * 0.55, hc - 0.35 * H.b]], front: true };
          break;
        case "wave":
          break;
        case "sweep": {
          const sx = (k - 0.5) * 14 * u;
          two2([tcx - 0.2 * T.a + sx, chin + 0.3 * HH], [tcx + 0.45 * T.a + sx, torsoBot - 0.02 * HH], elbow(-1, 0.32), elbow(1, 0.38));
          break;
        }
      }
    }
  }
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u);
  };
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  if (dress) {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * (sole - 0.35 * HH - (chin - 0.2 * HH)), nTop: 2, nBot: 3, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 6e-3, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress, mul(o.dress, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 6e-3, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK);
        p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
      suitDecor(p, o, tcx + 2 * u * facing, chin, torsoBot, T.a, HH, u);
    });
    chestAcc(p, o, tcx + 2 * u * facing, chin, torsoBot, T.a, HH, u);
    if (o.sash) {
      const s = facing || 1;
      p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u);
    }
    p.inkRing(tp, ow, thick);
  }
  if (Array.isArray(prop) && prop[0] === "shovel" && arms.length === 2) {
    const L = arms[0].pts[2], R = arms[1].pts[2], dx = R[0] - L[0], dy = R[1] - L[1];
    const top = [L[0] - dx * 0.45, L[1] - dy * 0.45], tip = [R[0] + dx * 1.25, R[1] + dy * 1.25];
    p.band([top, tip], "#c8a24a", 4.5 * u, 1.4 * u, "round");
    const n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, px = -uy, py = ux;
    p.poly([[tip[0] + px * 11 * u, tip[1] + py * 11 * u], [tip[0] - px * 11 * u, tip[1] - py * 11 * u], [tip[0] - px * 9 * u + ux * 24 * u, tip[1] - py * 9 * u + uy * 24 * u], [tip[0] + ux * 30 * u, tip[1] + uy * 30 * u], [tip[0] + px * 9 * u + ux * 24 * u, tip[1] + py * 9 * u + uy * 24 * u]], "#6b7480", 2 * u);
  }
  if (Array.isArray(prop) && prop[0] === "sweep" && arms.length === 2) {
    const L = arms[0].pts[2], R = arms[1].pts[2], dx = R[0] - L[0], dy = R[1] - L[1];
    const top = [L[0] - dx * 0.6, L[1] - dy * 0.6], foot = [R[0] + dx * 1.1, Math.min(sole - 10 * u, R[1] + dy * 1.6)];
    p.band([top, foot], "#b5824f", 4 * u, 1.3 * u, "round");
    p.poly([[foot[0] - 16 * u, foot[1] - 4 * u], [foot[0] + 16 * u, foot[1] - 4 * u], [foot[0] + 20 * u, foot[1] + 14 * u], [foot[0] - 20 * u, foot[1] + 14 * u]], "#e8c86a", 2 * u);
  }
  if (Array.isArray(prop) && arms.length === 2 && ["hold", "count", "read", "write", "lift"].includes(prop[0])) {
    const L = arms[0].pts[2], R = arms[1].pts[2], mx = (L[0] + R[0]) / 2, my = (L[1] + R[1]) / 2;
    const it = prop[0] === "read" ? "book" : prop[0] === "write" ? "paper" : prop[0] === "count" ? "money" : String(prop[2] || "box");
    const lifted = prop[0] === "lift";
    drawItem(p, it, mx, my + (lifted ? -10 * u : prop[0] === "write" ? 8 * u : -6 * u), u * (lifted ? 1.9 : 1.5));
    if (prop[0] === "write") {
      const [hx, hy] = R;
      p.band([[hx - 2 * u, hy - 2 * u], [hx - 12 * u, hy + 12 * u]], "#f2c230", 3 * u, 1 * u, "round");
    }
  }
  if (Array.isArray(prop) && prop[0] === "press") {
    const [hx, hy] = arms[arms.length - 1].pts[2];
    p.poly([[hx + 4 * u, hy - 26 * u], [hx + 30 * u, hy - 26 * u], [hx + 30 * u, hy + 26 * u], [hx + 4 * u, hy + 26 * u]], "#5a6270", 2.2 * u);
    p.ell(hx + 17 * u, hy - 10 * u, 7 * u, 7 * u, prop[1] > 0.6 ? "#ff7a6e" : "#e5484d", 1.8 * u);
    p.ell(hx + 17 * u, hy + 10 * u, 5 * u, 5 * u, "#46d07a", 1.6 * u);
  }
  if (Array.isArray(prop) && prop[0] === "point") {
    const [hx, hy] = arms[arms.length - 1].pts[2];
    p.band([[hx, hy], [hx + 14 * u, hy - 5 * u]], armCol, 3.2 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "hammer") {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "eat") {
      p.ell(hx + 7 * u, hy - 9 * u, 11 * u, 8 * u, "#c8823a", 2 * u, 0, 360, -30);
      p.band([[hx - 1 * u, hy - 1 * u], [hx - 9 * u, hy + 8 * u]], "#f4f1ea", 4 * u, 1.2 * u, "round");
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "drink") {
      p.poly([[hx - 8 * u, hy - 18 * u], [hx + 8 * u, hy - 18 * u], [hx + 6.5 * u, hy + 6 * u], [hx - 6.5 * u, hy + 6 * u]], "#f4f1ea", 2 * u);
      p.poly([[hx - 7.5 * u, hy - 8 * u], [hx + 7.5 * u, hy - 8 * u], [hx + 7 * u, hy - 2 * u], [hx - 7 * u, hy - 2 * u]], "#c8102e", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "bag" && a === arms[arms.length - 1]) {
      p.ell(hx + 2 * u, hy + 24 * u, 17 * u, 19 * u, "#c9b48a", 2.2 * u);
      p.band([[hx - 6 * u, hy + 6 * u], [hx + 10 * u, hy + 6 * u]], "#a8935f", 4 * u, 1 * u);
      p.stroke([[hx + 6 * u, hy + 16 * u], [hx - 2 * u, hy + 20 * u], [hx + 6 * u, hy + 26 * u], [hx - 2 * u, hy + 31 * u]], 2.4 * u, "#5a4a2a");
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") {
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  hatExtra(p, o, H, 300, hc, u);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && !EXTRA_HATS.includes(o.hat);
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  headAcc(p, o, H, 300, hc, u, facing);
  if (Array.isArray(prop) && prop[0] === "look") {
    for (const d of [-1, 1]) {
      p.ell(300 + d * 0.32 * H.a, hc - 0.02 * H.b, 0.27 * H.a, 0.25 * H.a, "#2b2f38", 2.4 * u);
      p.ell(300 + d * 0.32 * H.a, hc - 0.02 * H.b, 0.15 * H.a, 0.14 * H.a, "#5bc8f0", 1.2 * u);
    }
    p.band([[300 - 0.1 * H.a, hc - 0.02 * H.b], [300 + 0.1 * H.a, hc - 0.02 * H.b]], "#2b2f38", 4 * u, 1 * u);
    for (const a of arms) {
      p.dot(a.pts[2][0], a.pts[2][1] + 8 * u, 5.5 * u);
    }
  }
  if (prop === "phone") {
    const [hx, hy] = arms[arms.length - 1].pts[2];
    p.poly([[hx - 6 * u, hy - 20 * u], [hx + 6 * u, hy - 20 * u], [hx + 6 * u, hy + 12 * u], [hx - 6 * u, hy + 12 * u]], "#22262e", 1.8 * u);
    p.dot(hx, hy + 4 * u, 5.5 * u);
  }
  p.rot = null;
  const rh = arms[arms.length - 1]?.pts[2] ?? [300, hipY], lh = arms[0]?.pts[2] ?? [300, hipY];
  return { hand: rh, left: lh, crown, headCenter: hc, sole };
};
export {
  Pen,
  SKIN,
  SKINS,
  bodyFront,
  townsfolk
};
