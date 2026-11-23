// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  /** 2.0: what the clothes are (prison, guard, astro, coat, suit, chef) and what they wear on top (shades, glasses,
   *  cigar, headset, headlamp, chain, tie, badge, nametag, patch) */
  suit?: string; acc?: string[];
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

/** Viking-era townsfolk: wool tunics in earth colours, a round steel helmet, beards on most. */
export const vikingfolk = (v = 0): Outfit => {
  const tunics = ["#8c3b2e", "#3f5f7a", "#5d6b3a", "#7a5a3a", "#6a4a7a", "#a0703a"];
  const o: Outfit = { jacket: tunics[v % 6], pants: "#4e4234", boots: "#3e2c1e", belt: "#6b4a2b", skin: SKINS[v % 4], hat: "viking" };
  return v % 3 === 2 ? { ...o, hat: "hair", hair: ["#c9a24a", "#8a5a2b", "#d8b76a"][v % 3] } : { ...o, moustache: ["#c9a24a", "#8a5a2b", "#5a3b22"][v % 3] };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
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
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
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

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "viking") {
    // a round steel cap with a brow band and a nose guard (real Viking helmets had no horns)
    const yb = crown + 0.36 * HH, ht = 0.42 * HH, wb = 0.5 * W;
    const dome: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = Math.PI * (i / 16); dome.push([cx - wb * Math.cos(t), yb - ht * Math.sin(t)]); }
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
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number] | ["reach", number]
  // 2.0: actions with the hands
  | "phone" | "type" | "bag" | ["eat", number] | ["drink", number] | ["shovel", number]
  // 2.1: hands that do things (the number is the action's beat 0..1; hold and lift carry their thing)
  | ["hold", number, string] | ["lift", number, string] | ["press", number] | ["point", number] | ["write", number] | ["read", number]
  | ["cheer", number] | ["think", number] | ["shrug", number] | ["panic", number] | ["sweep", number] | ["look", number]
  | ["salute", number] | ["clap", number] | ["count", number];

/** 2.1: a thing held in the hands, drawn about its middle (x, y); s = size unit */
export const drawItem = (p: Pen, item: string, x: number, y: number, s: number) => {
  const box = (w: number, h: number, fill: string, ol = 2.2) => p.poly([[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h]], fill, ol * s);
  switch (item) {
    case "key":
      p.ell(x - 10 * s, y, 9 * s, 9 * s, "#e8b93a", 2.2 * s); p.ell(x - 10 * s, y, 3.5 * s, 3.5 * s, "#8a6a1e", 0);
      p.band([[x - 2 * s, y], [x + 20 * s, y]], "#e8b93a", 4.5 * s, 1.6 * s); p.band([[x + 14 * s, y], [x + 14 * s, y + 7 * s]], "#e8b93a", 3.5 * s, 1.4 * s);
      p.band([[x + 19 * s, y], [x + 19 * s, y + 6 * s]], "#e8b93a", 3.5 * s, 1.4 * s); break;
    case "map":
      p.poly([[x - 26 * s, y - 18 * s], [x - 8 * s, y - 14 * s], [x + 9 * s, y - 18 * s], [x + 26 * s, y - 14 * s], [x + 26 * s, y + 18 * s], [x + 9 * s, y + 14 * s], [x - 8 * s, y + 18 * s], [x - 26 * s, y + 14 * s]], "#efd9a6", 2.2 * s);
      p.stroke([[x - 18 * s, y + 8 * s], [x - 6 * s, y - 2 * s], [x + 6 * s, y + 4 * s], [x + 15 * s, y - 6 * s]], 2 * s, "#c8102e");
      p.stroke([[x + 12 * s, y - 9 * s], [x + 18 * s, y - 3 * s]], 2.2 * s, "#c8102e"); p.stroke([[x + 18 * s, y - 9 * s], [x + 12 * s, y - 3 * s]], 2.2 * s, "#c8102e"); break;
    case "paper": case "sign":
      box(item === "sign" ? 26 : 17, item === "sign" ? 17 : 22, item === "sign" ? "#f4f1ea" : "#fbfaf6");
      for (let i = 0; i < 4; i++) p.stroke([[x - 11 * s, y - 12 * s + i * 7 * s], [x + (i === 3 ? 2 : 11) * s, y - 12 * s + i * 7 * s]], 1.8 * s, "#9aa2ac");
      if (item === "sign") p.stroke([[x - 18 * s, y - 14 * s], [x + 18 * s, y - 14 * s]], 3 * s, "#c8102e"); break;
    case "news": {
      p.poly([[x - 30 * s, y - 34 * s], [x + 30 * s, y - 32 * s], [x + 31 * s, y + 34 * s], [x - 31 * s, y + 33 * s]], "#f4ecd6", 2.4 * s);
      p.poly([[x - 26 * s, y - 29 * s], [x + 26 * s, y - 27 * s], [x + 26 * s, y - 19 * s], [x - 26 * s, y - 21 * s]], "#2b2622", 0);
      for (let i = 0; i < 2; i++) p.stroke([[x - 24 * s, y - 13 * s + i * 7 * s], [x + 24 * s, y - 12 * s + i * 7 * s]], 4 * s, "#2b2622");
      p.poly([[x - 24 * s, y + 3 * s], [x - 2 * s, y + 3 * s], [x - 2 * s, y + 20 * s], [x - 24 * s, y + 20 * s]], "#d8ccae", 1.2 * s);
      for (let i = 0; i < 5; i++) p.stroke([[x + 3 * s, y + 4 * s + i * 6 * s], [x + 24 * s, y + 4 * s + i * 6 * s]], 1.6 * s, "#9a8f78");
      break;
    }
    case "book":
      p.poly([[x - 26 * s, y - 16 * s], [x, y - 12 * s], [x + 26 * s, y - 16 * s], [x + 26 * s, y + 16 * s], [x, y + 20 * s], [x - 26 * s, y + 16 * s]], "#fbfaf6", 2.2 * s);
      p.stroke([[x, y - 12 * s], [x, y + 20 * s]], 2 * s, "#8a5a3c");
      for (let i = 0; i < 3; i++) for (const d of [-1, 1]) p.stroke([[x + d * 5 * s, y - 6 * s + i * 7 * s], [x + d * 20 * s, y - 8 * s + i * 7 * s]], 1.6 * s, "#9aa2ac"); break;
    case "money":
      for (let i = 2; i >= 0; i--) { p.poly([[x - 22 * s + i * 3 * s, y - 11 * s - i * 3 * s], [x + 22 * s + i * 3 * s, y - 11 * s - i * 3 * s], [x + 22 * s + i * 3 * s, y + 11 * s - i * 3 * s], [x - 22 * s + i * 3 * s, y + 11 * s - i * 3 * s]], "#7fc27a", 2 * s); }
      p.ell(x + 6 * s, y - 6 * s, 6 * s, 6 * s, "#a8dca0", 1.6 * s); p.stroke([[x + 6 * s, y - 9 * s], [x + 6 * s, y - 3 * s]], 1.6 * s, "#2e6b2a"); break;
    case "gold":
      p.poly([[x - 22 * s, y + 10 * s], [x + 22 * s, y + 10 * s], [x + 15 * s, y - 10 * s], [x - 15 * s, y - 10 * s]], "#f2c230", 2.2 * s);
      p.poly([[x - 11 * s, y - 6 * s], [x + 11 * s, y - 6 * s], [x + 8 * s, y - 1 * s], [x - 8 * s, y - 1 * s]], "#ffe28a", 0); break;
    case "gem":
      p.poly([[x - 16 * s, y - 6 * s], [x - 8 * s, y - 15 * s], [x + 8 * s, y - 15 * s], [x + 16 * s, y - 6 * s], [x, y + 16 * s]], "#5bc8f0", 2.2 * s);
      p.poly([[x - 6 * s, y - 12 * s], [x + 2 * s, y - 12 * s], [x - 4 * s, y - 4 * s]], "#c8f0ff", 0); break;
    case "flask":
      p.poly([[x - 5 * s, y - 20 * s], [x + 5 * s, y - 20 * s], [x + 5 * s, y - 8 * s], [x + 16 * s, y + 14 * s], [x - 16 * s, y + 14 * s], [x - 5 * s, y - 8 * s]], "#e8f4f8", 2.2 * s);
      p.poly([[x - 11 * s, y + 4 * s], [x + 11 * s, y + 4 * s], [x + 15 * s, y + 12 * s], [x - 15 * s, y + 12 * s]], "#46d07a", 0);
      p.dot(x - 3 * s, y + 7 * s, 2 * s, "#c8f8d8"); p.dot(x + 4 * s, y + 9 * s, 1.5 * s, "#c8f8d8"); break;
    case "cup":
      p.poly([[x - 11 * s, y - 13 * s], [x + 11 * s, y - 13 * s], [x + 9 * s, y + 13 * s], [x - 9 * s, y + 13 * s]], "#f4f1ea", 2.2 * s);
      p.arc(x + 13 * s, y, 6 * s, 7 * s, -90, 90, 2.6 * s); p.poly([[x - 10 * s, y - 6 * s], [x + 10 * s, y - 6 * s], [x + 9.6 * s, y - 1 * s], [x - 9.6 * s, y - 1 * s]], "#c8102e", 0); break;
    case "tool":
      p.band([[x - 18 * s, y + 14 * s], [x + 10 * s, y - 8 * s]], "#9aa2ac", 5 * s, 1.6 * s, "round");
      p.ell(x + 14 * s, y - 12 * s, 8 * s, 8 * s, "#9aa2ac", 2.2 * s); p.poly([[x + 12 * s, y - 22 * s], [x + 20 * s, y - 18 * s], [x + 16 * s, y - 12 * s]], "#f4f1ea", 0); break;
    case "flashlight":
      p.poly([[x - 6 * s, y + 18 * s], [x + 6 * s, y + 18 * s], [x + 7 * s, y - 8 * s], [x - 7 * s, y - 8 * s]], "#3a3f4b", 2 * s);
      p.poly([[x - 10 * s, y - 8 * s], [x + 10 * s, y - 8 * s], [x + 9 * s, y - 16 * s], [x - 9 * s, y - 16 * s]], "#c9ced6", 2 * s);
      p.ell(x, y - 16 * s, 8 * s, 2.5 * s, "#fff4b0", 1.2 * s); break;
    case "remote":
      p.poly([[x - 7 * s, y - 18 * s], [x + 7 * s, y - 18 * s], [x + 7 * s, y + 18 * s], [x - 7 * s, y + 18 * s]], "#2b2f38", 2 * s);
      p.dot(x, y - 10 * s, 3.2 * s, "#e5484d"); for (let i = 0; i < 3; i++) p.dot(x, y + i * 6 * s, 2 * s, "#9aa2ac"); break;
    case "food":
      p.ell(x, y + 6 * s, 20 * s, 8 * s, "#f4f1ea", 2 * s);
      p.ell(x, y - 2 * s, 14 * s, 9 * s, "#c8823a", 2 * s, 180, 360); p.band([[x - 14 * s, y + 1 * s], [x + 14 * s, y + 1 * s]], "#46b07a", 3 * s, 1 * s); break;
    case "bomb":
      p.ell(x, y + 3 * s, 15 * s, 15 * s, "#2b2f38", 2.2 * s); p.band([[x + 8 * s, y - 10 * s], [x + 14 * s, y - 18 * s]], "#8a5a3c", 3 * s, 1 * s);
      p.dot(x + 15 * s, y - 20 * s, 4 * s, "#ffb04a"); p.dot(x - 5 * s, y - 3 * s, 3 * s, "#5a6270"); break;
    default: // a cardboard box
      box(24, 18, "#9c6a3c", 2.6); p.poly([[x - 24 * s, y - 18 * s], [x + 24 * s, y - 18 * s], [x + 24 * s, y - 11 * s], [x - 24 * s, y - 11 * s]], "#7d5230", 1.8 * s);
      p.band([[x, y - 18 * s], [x, y - 2 * s]], "#efe0bd", 6 * s, 1.2 * s); p.stroke([[x - 16 * s, y + 8 * s], [x - 6 * s, y + 8 * s]], 2 * s, "#5a3b22");
  }
};

/** 2.1: an insert, the close-up of what the hands are doing (1000 x 1000 units): the button being pressed, the
 *  newspaper with its headline, the key or the cash held up, the page being written. k = the action's beat. */
export const drawInsert = (p: Pen, act: string, item: string, k: number, label: string, sleeve: string, skin = SKIN) => {
  const g = p.g, ink = INK;
  const hand = (fx: number, fy: number, x: number, y: number, point = 0) => {
    p.band([[fx, fy], [x, y]], sleeve, 92, 7, "round");
    p.ell(x, y, 50, 46, skin, 6);
    if (point) { const a = Math.atan2(y - fy, x - fx); p.band([[x, y], [x + Math.cos(a) * point, y + Math.sin(a) * point]], skin, 30, 6, "round"); }
  };
  const text = (t: string, x: number, y: number, size: number, col: string, font = "900", max = 900) => {
    g.save(); g.font = `${font} ${size}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    let sz = size; while (g.measureText(t).width > max && sz > 12) { sz -= 4; g.font = `${font} ${sz}px "Arial Black", Arial, sans-serif`; }
    g.fillStyle = col; g.fillText(t, x, y); g.restore();
  };
  const words = String(label || "").toUpperCase().replace(/[^A-Z0-9 '!?$]/g, "").split(/\s+/).filter(Boolean);
  switch (act) {
    case "press": {
      const d = 16 * k;
      p.poly([[170, 560], [830, 560], [920, 770], [80, 770]], "#4a5160", 7);
      p.poly([[80, 770], [920, 770], [920, 900], [80, 900]], "#353b47", 7);
      p.poly([[250, 790], [750, 790], [750, 880], [250, 880]], "#f2c230", 5);
      text(words.length ? words.slice(-2).join(" ") : "DO NOT PRESS", 500, 836, 58, "#c8102e", "900", 470);
      for (const [x, y] of [[200, 600], [800, 600], [140, 740], [860, 740]]) p.dot(x, y, 9, "#2b2f38");
      p.ell(500, 660, 250, 92, "#f2c230", 6);
      g.save(); p.path([[250, 660], [500, 568], [750, 660], [500, 752]], true); g.clip();
      for (let i = -6; i < 8; i++) p.band([[250 + i * 70, 760], [330 + i * 70, 560]], "#1e1f24", 24, 0);
      g.restore();
      p.ell(500, 660, 250, 92, null, 6);
      p.ell(500, 655 + d, 165, 62, "#7a1414", 6);
      p.ell(500, 640 + d, 155, 112 - d * 2, k > 0.6 ? "#ff5a4e" : "#e5484d", 6, 180, 360);
      p.ell(440, 580 + d, 46, 24, "#ffb3ab", 0);
      if (k > 0.6) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.band([[500 + Math.cos(a) * 200, 560 + Math.sin(a) * 120], [500 + Math.cos(a) * 250, 560 + Math.sin(a) * 150]], "#fff4b0", 12, 0, "round"); }
      hand(1060, 60, 600, 360 + 170 * k, 120);
      break;
    }
    case "read": {
      g.save(); g.translate(500, 520); g.rotate(-0.06); g.translate(-500, -520);
      p.poly([[150, 90], [850, 110], [860, 930], [140, 940]], "#f4ecd6", 7);
      text("THE DAILY TIMES", 500, 170, 64, "#2b2622", "700", 640);
      p.stroke([[190, 215], [810, 225]], 5, "#2b2622"); p.stroke([[190, 232], [810, 242]], 2.5, "#2b2622");
      const h1 = words.slice(0, Math.ceil(Math.min(words.length, 6) / 2)).join(" ") || "BREAKING", h2 = words.slice(Math.ceil(Math.min(words.length, 6) / 2), 6).join(" ");
      text(h1, 500, 320, 104, "#1e1f24", "900", 660); if (h2) text(h2, 500, 430, 104, "#1e1f24", "900", 660);
      p.poly([[330, 500], [670, 500], [670, 720], [330, 720]], "#d8ccae", 4); p.ell(500, 610, 70, 70, "#b8a77f", 3); p.ell(500, 720, 120, 70, "#b8a77f", 3, 180, 360);
      for (let i = 0; i < 8; i++) { p.stroke([[190, 500 + i * 28], [300, 500 + i * 28]], 5, "#9a8f78"); p.stroke([[700, 500 + i * 28], [810, 500 + i * 28]], 5, "#9a8f78"); }
      for (let i = 0; i < 5; i++) p.stroke([[190, 770 + i * 30], [810, 770 + i * 30]], 5, "#9a8f78");
      g.restore();
      hand(-60, 1080, 140, 700 + 8 * k); hand(1060, 1080, 860, 680 - 8 * k);
      break;
    }
    case "write": {
      p.poly([[200, 140], [800, 140], [820, 960], [180, 960]], "#8a5a3c", 7);
      p.poly([[240, 210], [760, 210], [770, 930], [230, 930]], "#fbfaf6", 5);
      p.poly([[400, 110], [600, 110], [600, 200], [400, 200]], "#c9ced6", 5);
      const n = 1 + Math.floor(k * 7);
      for (let i = 0; i < n; i++) {
        const y = 290 + i * 80, len = i === n - 1 ? 0.25 + 0.75 * ((k * 7) % 1) : 1, pts: P2[] = [];
        for (let x = 0; x <= 440 * len; x += 22) pts.push([290 + x, y + Math.sin(x * 0.11 + i) * 12]);
        if (pts.length > 1) p.stroke(pts, 7, "#2b3a6b");
      }
      const last = 290 + (n - 1) * 80, px = 290 + 440 * (n === 0 ? 0 : 0.25 + 0.75 * ((k * 7) % 1));
      p.band([[px, last], [px + 150, last - 210]], "#f2c230", 34, 6, "round"); p.poly([[px - 14, last + 8], [px + 14, last - 22], [px - 2, last + 22]], "#2b2622", 3);
      hand(1060, 900, px + 110, last - 140);
      hand(-60, 1060, 200, 700);
      break;
    }
    case "type": {
      p.poly([[60, 420], [940, 420], [1000, 900], [0, 900]], "#3a3f4b", 7);
      const hit = Math.floor(k * 37) % 30;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
        const y = 470 + r * 105, x0 = 110 + r * 18 - (y - 470) * 0.12, w = (780 + (y - 470) * 0.24) / 10, x = x0 + c * w;
        p.poly([[x + 6, y], [x + w - 6, y], [x + w - 4, y + 86], [x + 4, y + 86]], r * 10 + c === hit ? "#ffd24a" : "#e8ebf0", 4);
      }
      hand(-60, 1080, 320 + 30 * Math.sin(k * 20), 620 + 20 * Math.cos(k * 17), 70);
      hand(1060, 1080, 680 - 30 * Math.sin(k * 23), 640 + 20 * Math.cos(k * 19), 70);
      break;
    }
    case "phone": {
      p.poly([[300, 60], [700, 60], [720, 960], [280, 960]], "#1e1f24", 8);
      p.poly([[330, 130], [670, 130], [688, 890], [312, 890]], "#3f6fb5", 0);
      text("CALLING", 500, 260, 62, "#ffffff", "700", 320);
      const ci = words.findIndex((w) => /^(CALL|CALLS|CALLED|CALLING|PHONED|DIALED|TEXTED|RANG)$/.test(w));
      const callee = (ci >= 0 ? words.slice(ci + 1) : []).find((w) => !/^(HIS|HER|THE|A|AN|THEIR|MY|OUR|UP|BACK|TO)$/.test(w));
      text(callee || words.slice(-1)[0] || "MOM", 500, 340, 70, "#ffffff", "900", 330);
      p.ell(500, 520, 100, 100, "#d8e4f5", 5); p.ell(500, 495, 40, 40, "#3f6fb5", 0); p.ell(500, 580, 64, 40, "#3f6fb5", 0, 180, 360);
      p.ell(410, 780, 52, 52, "#e5484d", 5); p.ell(590, 780, 52, 52, "#46b07a", 5);
      hand(1080, 1080, 700, 700 + 10 * Math.sin(k * 6));
      break;
    }
    case "count": {
      for (let i = 0; i < 5; i++) {
        const a = -0.5 + i * 0.25 + (i === 4 ? -0.35 * k : 0);
        g.save(); g.translate(500, 760); g.rotate(a); g.translate(-500, -760);
        p.poly([[300, 300], [700, 300], [700, 760], [300, 760]], "#7fc27a", 6);
        p.poly([[330, 330], [670, 330], [670, 730], [330, 730]], null, 3);
        p.ell(500, 520, 80, 90, "#a8dca0", 4); text("$", 500, 525, 110, "#2e6b2a");
        text("100", 380, 380, 42, "#2e6b2a", "900", 120);
        g.restore();
      }
      hand(-60, 1080, 420, 800); hand(1060, 980, 700 - 60 * k, 520 + 80 * k);
      break;
    }
    default: {
      // the thing held up to the lens in both hands (a key, the gold, a flask, the box...)
      const it = item || (act === "eat" ? "food" : act === "drink" ? "cup" : act === "dig" ? "tool" : "box");
      const bob = Math.sin(k * Math.PI * 2) * 10;
      p.ell(500, 520 + bob, 360, 300, "#ffffff22", 0);
      drawItem(p, it, 500, 470 + bob, 13);
      hand(-60, 1080, 250, 640 + bob); hand(1060, 1080, 750, 640 + bob);
    }
  }
};

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

// ---------------- 2.0: clothes, hats and accessories ----------------
const EXTRA_HATS = ["beanie", "hardhat", "chef", "crown", "helmet"];
/** markings on a torso (drawn inside its clip): collars, pockets, lapels, a tie, patches */
const suitDecor = (p: Pen, o: Outfit, x: number, chin: number, bot: number, ta: number, HH: number, u: number) => {
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
/** things worn on the chest, over the torso's outline */
const chestAcc = (p: Pen, o: Outfit, x: number, chin: number, bot: number, ta: number, HH: number, u: number) => {
  const a = o.acc || [];
  if (a.includes("chain")) {
    const pts = curve([x - 0.55 * ta, chin + 2 * u], [x, chin + 0.42 * HH], [x + 0.55 * ta, chin + 2 * u], 14);
    p.stroke(pts, 4.5 * u, INK); p.stroke(pts, 3 * u, "#e8b923");
    p.ell(x, chin + 0.32 * HH, 9 * u, 9 * u, "#e8b923", 1.6 * u);
    p.stroke([[x + 3 * u, chin + 0.3 * HH - 4 * u], [x - 3 * u, chin + 0.32 * HH], [x + 3 * u, chin + 0.34 * HH], [x - 3 * u, chin + 0.32 * HH + 5 * u]], 1.4 * u, "#7a5f12");
  }
  if (a.includes("tie") && o.suit !== "suit") p.poly([[x - 3 * u, chin + 2 * u], [x + 3 * u, chin + 2 * u], [x + 4 * u, chin + 0.38 * HH], [x, chin + 0.44 * HH], [x - 4 * u, chin + 0.38 * HH]], "#c8102e", 1.2 * u);
  if (a.includes("badge")) p.poly(Array.from({ length: 10 }, (_, i) => { const r = (i % 2 ? 4 : 9) * u, t = -Math.PI / 2 + (i * Math.PI) / 5; return [x - 0.55 * ta + Math.cos(t) * r, chin + 0.3 * HH + Math.sin(t) * r] as P2; }), "#e8b923", 1.4 * u);
  if (a.includes("nametag")) p.poly([[x + 0.3 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.26 * HH], [x + 0.85 * ta, chin + 0.36 * HH], [x + 0.3 * ta, chin + 0.36 * HH]], "#f4f1ea", 1.4 * u);
  if (a.includes("patch")) p.ell(x - 0.6 * ta, chin + 0.3 * HH, 7 * u, 7 * u, "#2f4fa8", 1.4 * u);
};
/** hats the town did not have: drawn over the head, before the face */
const hatExtra = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, u: number) => {
  const k = o.hat, top = hc - H.b, A = H.a;
  if (!k || !EXTRA_HATS.includes(k)) return;
  if (k === "beanie") {
    p.ell(cx, hc - 0.38 * H.b, A * 1.02, H.b * 0.66, o.cap || "#c8102e", 2.2 * u, 180, 360);
    p.poly([[cx - A * 1.04, hc - 0.4 * H.b], [cx + A * 1.04, hc - 0.4 * H.b], [cx + A * 1.0, hc - 0.22 * H.b], [cx - A * 1.0, hc - 0.22 * H.b]], shade(o.cap || "#c8102e", 0.82), 2 * u);
  } else if (k === "hardhat" || k === "helmet") {
    const col = k === "hardhat" ? (o.cap || "#f2c230") : (o.cap || "#4a5a3a");
    p.ell(cx, hc - 0.35 * H.b, A * 0.98, H.b * 0.7, col, 2.2 * u, 180, 360);
    p.poly([[cx - A * 1.15, hc - 0.36 * H.b], [cx + A * 1.15, hc - 0.36 * H.b], [cx + A * 1.1, hc - 0.26 * H.b], [cx - A * 1.1, hc - 0.26 * H.b]], shade(col, 0.85), 2 * u);
    if (k === "hardhat") p.stroke([[cx, top - 0.02 * H.b], [cx, hc - 0.4 * H.b]], 4 * u, shade(col, 0.8));
  } else if (k === "chef") {
    p.poly([[cx - A * 0.7, hc - 0.55 * H.b], [cx + A * 0.7, hc - 0.55 * H.b], [cx + A * 0.72, hc - 0.32 * H.b], [cx - A * 0.72, hc - 0.32 * H.b]], "#f4f1ea", 2 * u);
    for (const [dx, r] of [[-0.42, 0.42], [0.42, 0.42], [0, 0.5]] as [number, number][]) p.ell(cx + dx * A, top - 0.2 * H.b, r * A, r * A * 0.9, "#ffffff", 2 * u);
  } else if (k === "crown") {
    const y0 = hc - 0.52 * H.b, y1 = top - 0.38 * H.b, w = A * 0.75;
    p.poly([[cx - w, y0], [cx - w, y1 + 10 * u], [cx - w * 0.5, y0 - 18 * u], [cx, y1], [cx + w * 0.5, y0 - 18 * u], [cx + w, y1 + 10 * u], [cx + w, y0]], "#e8b923", 2.2 * u);
    for (const dx of [-0.5, 0, 0.5]) p.dot(cx + dx * w, y0 - 6 * u, 3.4 * u, "#c8102e");
  }
};
/** things worn on the face and head: drawn after the face */
const headAcc = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, u: number, facing: number) => {
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
    p.ell(fx, hc - 0.5 * H.b, 9 * u, 8 * u, "#9aa2ac", 1.8 * u); p.dot(fx, hc - 0.5 * H.b, 4.5 * u, "#fff6c8");
  }
  if (a.includes("shades")) {
    for (const s of [-1, 1]) { p.ell(fx + s * 13 * u, hc + 1 * u, 11.5 * u, 8.5 * u, "#15171c", 1.6 * u); p.stroke([[fx + s * 13 * u - 6 * u, hc - 3 * u], [fx + s * 13 * u - 1 * u, hc - 5 * u]], 2 * u, "rgba(255,255,255,0.75)"); }
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

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
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
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
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
  // 2.0: actions with the hands (standing or sitting): eating and drinking bring the hand to the mouth, a phone sits
  // at the ear, typing reaches both hands to a keyboard, a shovel is held in both hands, a bag hangs from one
  {
    const S1 = sh(1), S0 = sh(-1), last = arms.length - 1;
    if (Array.isArray(prop) && (prop[0] === "eat" || prop[0] === "drink")) {
      const k = clamp(prop[1], 0, 1), rest: P2 = [tcx + 0.6 * T.a, S1[1] + 0.55 * HH], mouthAt: P2 = [300 + 8 * u * facing + 14 * u, chin - 0.12 * HH];
      arms[last] = { pts: [S1, [tcx + 1.2 * T.a + 6 * u, S1[1] + 0.32 * HH - k * 0.22 * HH], lerp2(rest, mouthAt, k)], front: true };
    } else if (prop === "phone") {
      arms[last] = { pts: [S1, [tcx + 1.25 * T.a + 8 * u, S1[1] + 0.1 * HH], [300 + H.a * 0.9, hc + 6 * u]], front: true };
    } else if (prop === "type") {
      arms.length = 0;
      for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.05 * T.a + 2 * u), sh(side)[1] + 0.38 * HH], [tcx + side * 0.38 * T.a, torsoBot + 0.02 * HH]], front: true });
    } else if (Array.isArray(prop) && prop[0] === "shovel") {
      const lift = clamp(prop[1], 0, 1) * 0.28 * HH;
      arms.length = 0;
      arms.push({ pts: [S0, [tcx - 0.95 * T.a, S0[1] + 0.32 * HH], [tcx - 0.15 * T.a, chin + 0.28 * HH - lift]], front: true });
      arms.push({ pts: [S1, [tcx + 1.1 * T.a + 4 * u, S1[1] + 0.36 * HH], [tcx + 0.6 * T.a, torsoBot - 0.04 * HH - lift]], front: true });
    } else if (prop === "bag") arms[last] = { pts: hang(1, 0), front: true };
    else if (Array.isArray(prop)) {
      // 2.1: both hands at work; k is the beat of the action
      const k = clamp(prop[1] as number, 0, 1), two = (L: P2, R: P2, eL: P2, eR: P2) => { arms.length = 0; arms.push({ pts: [S0, eL, L], front: true }, { pts: [S1, eR, R], front: true }); };
      const elbow = (side: number, dy: number, out = 0): P2 => [tcx + side * (1.12 * T.a + (4 + out) * u), sh(side)[1] + dy * HH];
      const chest = chin + 0.55 * HH;
      switch (prop[0]) {
        case "hold": case "count": {
          const y = chest - 0.08 * HH * k;
          two([tcx - 0.42 * T.a, y], [tcx + 0.42 * T.a, y + (prop[0] === "count" ? -0.06 * HH * k : 0)], elbow(-1, 0.42), elbow(1, 0.42)); break;
        }
        case "lift": {
          // heaved up from the waist to the chest (above the head it would leave the drawing)
          const y = lerp2([0, torsoBot + 0.02 * HH], [0, chin + 0.42 * HH], k)[1];
          two([tcx - 0.55 * T.a, y], [tcx + 0.55 * T.a, y], elbow(-1, lerp2([0, 0.5], [0, 0.3], k)[1], 6), elbow(1, lerp2([0, 0.5], [0, 0.3], k)[1], 6)); break;
        }
        case "read": two([tcx - 0.5 * T.a, chest - 0.02 * HH], [tcx + 0.5 * T.a, chest - 0.02 * HH - 0.02 * HH * k], elbow(-1, 0.4), elbow(1, 0.4)); break;
        case "write": two([tcx - 0.35 * T.a, chest], [tcx + (0.05 + 0.3 * k) * T.a, chest - 0.04 * HH + 3 * u * Math.sin(k * 12)], elbow(-1, 0.42), elbow(1, 0.45)); break;
        case "press": {
          const reach = 1.85 * T.a - 8 * u * k;
          arms[last] = { pts: [S1, [tcx + 1.2 * T.a + 10 * u, S1[1] + 0.2 * HH], [tcx + reach, S1[1] + 0.18 * HH]], front: true }; break;
        }
        case "point": arms[last] = { pts: [S1, [tcx + 1.4 * T.a + 12 * u, S1[1] - 0.08 * HH], [tcx + 1.95 * T.a + 2 * u * k, S1[1] - 0.24 * HH - 2 * u * k]], front: true }; break;
        case "cheer": {
          const a = Math.sin(k * Math.PI * 2) * 6 * u;
          two([tcx - 1.3 * T.a - 12 * u + a, crown - 0.05 * HH], [tcx + 1.3 * T.a + 12 * u + a, crown - 0.05 * HH], elbow(-1, -0.25, 8), elbow(1, -0.25, 8)); break;
        }
        case "clap": { const g = (1 - k) * 0.35 * T.a + 4 * u; two([300 - g, chest - 0.05 * HH], [300 + g, chest - 0.05 * HH], elbow(-1, 0.4), elbow(1, 0.4)); break; }
        case "think": two([tcx + 0.15 * T.a, chest + 0.02 * HH], [300 + H.a * 0.5, chin - 0.04 * HH - 2 * u * k], elbow(-1, 0.45), [tcx + 1.05 * T.a, S1[1] + 0.42 * HH]); break;
        case "shrug": two([tcx - 1.7 * T.a, S0[1] + 0.05 * HH - 4 * u * k], [tcx + 1.7 * T.a, S1[1] + 0.05 * HH - 4 * u * k], elbow(-1, 0.38, 4), elbow(1, 0.38, 4)); break;
        case "panic": { const j = Math.sin(k * Math.PI * 4) * 2 * u; two([300 - H.a * 0.98 + j, hc + 0.1 * H.b], [300 + H.a * 0.98 + j, hc + 0.1 * H.b], elbow(-1, 0.05, 14), elbow(1, 0.05, 14)); break; }
        case "look": two([300 - 0.32 * H.a, hc + 0.22 * H.b], [300 + 0.32 * H.a, hc + 0.22 * H.b], elbow(-1, 0.35, -6), elbow(1, 0.35, -6)); break;
        case "salute": arms[last] = { pts: [S1, [tcx + 1.35 * T.a + 8 * u, S1[1] - 0.05 * HH], [300 + H.a * 0.55, hc - 0.35 * H.b]], front: true }; break;
        case "wave": break;
        case "sweep": {
          const sx = (k - 0.5) * 14 * u;
          two([tcx - 0.2 * T.a + sx, chin + 0.3 * HH], [tcx + 0.45 * T.a + sx, torsoBot - 0.02 * HH], elbow(-1, 0.32), elbow(1, 0.38)); break;
        }
      }
    }
  }
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
      suitDecor(p, o, tcx + 2 * u * facing, chin, torsoBot, T.a, HH, u);
    });
    chestAcc(p, o, tcx + 2 * u * facing, chin, torsoBot, T.a, HH, u);
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  if (Array.isArray(prop) && prop[0] === "shovel" && arms.length === 2) {
    const L = arms[0].pts[2], R = arms[1].pts[2], dx = R[0] - L[0], dy = R[1] - L[1];
    const top: P2 = [L[0] - dx * 0.45, L[1] - dy * 0.45], tip: P2 = [R[0] + dx * 1.25, R[1] + dy * 1.25];
    p.band([top, tip], "#c8a24a", 4.5 * u, 1.4 * u, "round");
    const n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, px = -uy, py = ux;
    p.poly([[tip[0] + px * 11 * u, tip[1] + py * 11 * u], [tip[0] - px * 11 * u, tip[1] - py * 11 * u], [tip[0] - px * 9 * u + ux * 24 * u, tip[1] - py * 9 * u + uy * 24 * u], [tip[0] + ux * 30 * u, tip[1] + uy * 30 * u], [tip[0] + px * 9 * u + ux * 24 * u, tip[1] + py * 9 * u + uy * 24 * u]], "#6b7480", 2 * u);
  }
  // 2.1: a broom is held across the body like the shovel
  if (Array.isArray(prop) && prop[0] === "sweep" && arms.length === 2) {
    const L = arms[0].pts[2], R = arms[1].pts[2], dx = R[0] - L[0], dy = R[1] - L[1];
    const top: P2 = [L[0] - dx * 0.6, L[1] - dy * 0.6], foot: P2 = [R[0] + dx * 1.1, Math.min(sole - 10 * u, R[1] + dy * 1.6)];
    p.band([top, foot], "#b5824f", 4 * u, 1.3 * u, "round");
    p.poly([[foot[0] - 16 * u, foot[1] - 4 * u], [foot[0] + 16 * u, foot[1] - 4 * u], [foot[0] + 20 * u, foot[1] + 14 * u], [foot[0] - 20 * u, foot[1] + 14 * u]], "#e8c86a", 2 * u);
  }
  // 2.1: the held thing sits between the hands, in front of the body (the hands are drawn over it)
  if (Array.isArray(prop) && arms.length === 2 && ["hold", "count", "read", "write", "lift"].includes(prop[0] as string)) {
    const L = arms[0].pts[2], R = arms[1].pts[2], mx = (L[0] + R[0]) / 2, my = (L[1] + R[1]) / 2;
    const it = prop[0] === "read" ? "news" : prop[0] === "write" ? "paper" : prop[0] === "count" ? "money" : String(prop[2] || "box");
    const lifted = prop[0] === "lift";
    // 2.1 (references): props big enough to read on a phone; a newspaper covers half the body
    drawItem(p, it, mx, my + (lifted ? -10 * u : prop[0] === "write" ? 8 * u : prop[0] === "read" ? -14 * u : -6 * u), u * (lifted ? 2.1 : prop[0] === "read" ? 2.3 : 1.9));
    if (prop[0] === "write") { const [hx, hy] = R; p.band([[hx - 2 * u, hy - 2 * u], [hx - 12 * u, hy + 12 * u]], "#f2c230", 3 * u, 1 * u, "round"); }
  }
  if (Array.isArray(prop) && prop[0] === "press") {
    const [hx, hy] = arms[arms.length - 1].pts[2];
    p.poly([[hx + 4 * u, hy - 26 * u], [hx + 30 * u, hy - 26 * u], [hx + 30 * u, hy + 26 * u], [hx + 4 * u, hy + 26 * u]], "#5a6270", 2.2 * u);
    p.ell(hx + 17 * u, hy - 10 * u, 7 * u, 7 * u, (prop[1] as number) > 0.6 ? "#ff7a6e" : "#e5484d", 1.8 * u);
    p.ell(hx + 17 * u, hy + 10 * u, 5 * u, 5 * u, "#46d07a", 1.6 * u);
  }
  if (Array.isArray(prop) && prop[0] === "point") {
    const [hx, hy] = arms[arms.length - 1].pts[2]; p.band([[hx, hy], [hx + 14 * u, hy - 5 * u]], armCol, 3.2 * u, 1.2 * u, "round");
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
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
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
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
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
    for (const d of [-1, 1]) { p.ell(300 + d * 0.32 * H.a, hc - 0.02 * H.b, 0.27 * H.a, 0.25 * H.a, "#2b2f38", 2.4 * u); p.ell(300 + d * 0.32 * H.a, hc - 0.02 * H.b, 0.15 * H.a, 0.14 * H.a, "#5bc8f0", 1.2 * u); }
    p.band([[300 - 0.1 * H.a, hc - 0.02 * H.b], [300 + 0.1 * H.a, hc - 0.02 * H.b]], "#2b2f38", 4 * u, 1 * u);
    for (const a of arms) { p.dot(a.pts[2][0], a.pts[2][1] + 8 * u, 5.5 * u); }
  }
  if (prop === "phone") { const [hx, hy] = arms[arms.length - 1].pts[2]; p.poly([[hx - 6 * u, hy - 20 * u], [hx + 6 * u, hy - 20 * u], [hx + 6 * u, hy + 12 * u], [hx - 6 * u, hy + 12 * u]], "#22262e", 1.8 * u); p.dot(hx, hy + 4 * u, 5.5 * u); }
  p.rot = null;
  // Loomy 1.5: where the hands and the head are (600 x 1000 design units), for things held in the hand.
  const rh = arms[arms.length - 1]?.pts[2] ?? [300, hipY], lh = arms[0]?.pts[2] ?? [300, hipY];
  return { hand: rh as P2, left: lh as P2, crown, headCenter: hc, sole };
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
