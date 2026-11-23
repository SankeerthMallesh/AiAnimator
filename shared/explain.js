// Loomy 2.2: explainer cutaways. When a line explains how or why something happens (a lake that explodes, a
// chemical reaction, pressure building, two armies meeting, a number climbing), the video cuts for a moment to an
// animated diagram drawn in code: a cross-section with bubbles and arrows, a formula, a battle map. The same
// drawings serve all three tabs (Cartoons, 3D, Blocky); each renderer calls drawExplain over its frame.

const INK = '#1d1726';
const FONT = '"Montserrat", "Arial Black", "Inter", system-ui, sans-serif';
// Ordered: the first kind whose words are in the line wins.
const KINDS = [
  ['battle', /\b(battle|war|army|armies|troops|soldiers|invad\w*|siege|fought|redcoats?|cavalry|regiments?|general \w+|charged|bunker hill|gettysburg|waterloo|musket\w*)\b/i],
  ['lake', /\b(lakes?|underwater|bubbles?|carbon dioxide|co2|methane|limnic|sea ?floor|ocean floor|seabed|deep water)\b/i],
  ['reaction', /\b(chemical\w*|reaction|molecules?|atoms?|acid\w*|oxygen|hydrogen|nitrogen|formula|elements?|compound|reacts?|catalyst)\b/i],
  ['pressure', /\b(pressure|explod\w*|explosion|burst\w*|erupt\w*|blast|blew up|boom|volcano\w*)\b/i],
  ['space', /\b(planets?|orbit\w*|the sun|the moon|earth'?s|gravity|asteroid\w*|comet\w*|galaxy|solar)\b/i],
  ['chart', /(\d[\d,.]*\s*(%|percent|million|billion|thousand|times)|\b(doubled|tripled|skyrocket\w*|soared|plummet\w*|grew to|rose to|dropped to)\b)/i],
];
/** the explainer kind for a line ('' when it is a story beat, not an explanation) */
export function explainKind(text = '') {
  for (const [k, re] of KINDS) if (re.test(text)) return k;
  return '';
}
const FORMULAS = {
  lake: 'CO₂ + H₂O ⇌ H₂CO₃', reaction: '2H₂ + O₂ → 2H₂O', pressure: 'P × V = n × R × T', space: 'F = G·m₁m₂ / r²',
};
const NUM = /(\d[\d,.]*)\s*(%|percent|million|billion|thousand|times)?/i;
/** a short label for the diagram from the line (its key noun phrase, or a number) */
function labelFor(kind, text) {
  const t = String(text || '');
  if (kind === 'chart') { const m = NUM.exec(t); return m ? `${m[1]}${m[2] ? (m[2] === '%' || /percent/i.test(m[2]) ? '%' : ` ${m[2].toUpperCase()}`) : ''}` : ''; }
  if (kind === 'battle') { const m = /\b(?:battle of|siege of)\s+([A-Z][\w']+(?:\s+[A-Z][\w']+)?)/.exec(t); return m ? m[0].toUpperCase() : 'THE BATTLE'; }
  const m = /\b(carbon dioxide|co2|methane|pressure|gravity|oxygen|hydrogen|acid|gas|magma|steam)\b/i.exec(t);
  return m ? (m[1].toLowerCase() === 'co2' ? 'CO₂' : m[1].toUpperCase()) : { lake: 'GAS BUILDS UP', reaction: 'THE REACTION', pressure: 'PRESSURE', space: 'ORBIT' }[kind] || '';
}

/** cutaways for a video's scenes: [{ start, end, kind, label, side }]; scenes = [{ start, dur, narration }] */
export function planExplains(scenes = []) {
  const out = [];
  let last = -9, lastKind = '';
  scenes.forEach((sc, i) => {
    const kind = explainKind(sc.narration || '');
    const dur = Number(sc.dur) || 0;
    // the hook stays on the story; a cutaway at most every other scene, and only when there is time for it
    if (!kind || i === 0 || (i - last < 2 && kind === lastKind) || dur < 1.8) return;
    last = i; lastKind = kind;
    const a = sc.start + dur * 0.3, b = sc.start + dur * 0.92;
    out.push({ start: a, end: b, kind, label: labelFor(kind, sc.narration), seed: i * 37 + 11 });
  });
  return out;
}
export const explainAt = (list = [], t) => list.find((e) => t >= e.start && t < e.end) || null;

// ---------- drawing ----------
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
function arrow(g, x0, y0, x1, y1, col, w = 14) {
  const a = Math.atan2(y1 - y0, x1 - x0), h = w * 2.6;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = INK; g.lineWidth = w + 8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * h * 0.6, y1 - Math.sin(a) * h * 0.6); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.5) * h, y1 - Math.sin(a - 0.5) * h); g.lineTo(x1 - Math.cos(a + 0.5) * h, y1 - Math.sin(a + 0.5) * h); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.restore();
}
function tag(g, text, x, y, size, fill = '#ffd24a', col = INK, maxW = 900) {
  if (!text) return;
  g.save(); g.font = `900 ${size}px ${FONT}`; let s = size;
  while (g.measureText(text).width > maxW && s > 20) { s -= 4; g.font = `900 ${s}px ${FONT}`; }
  const w = g.measureText(text).width + s * 0.9, h = s * 1.45;
  g.fillStyle = fill; g.strokeStyle = INK; g.lineWidth = 7;
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h * 0.28); g.fill(); g.stroke();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + s * 0.04); g.restore();
}
function blob(g, x, y, r, fill, ol = 6) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.stroke(); } }
function rect(g, x, y, w, h, fill, ol = 6) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeRect(x, y, w, h); } }

const DRAW = {
  // a lake in cross-section: gas seeping from the bed, bubbles rising, the layers, arrows and the formula
  lake(g, t, e) {
    rect(g, 0, 0, 1000, 300, '#8fd0ff', 0);
    g.fillStyle = '#5a9e4b'; g.beginPath(); g.moveTo(0, 300); g.lineTo(140, 250); g.lineTo(220, 300); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(1000, 300); g.lineTo(840, 230); g.lineTo(760, 300); g.closePath(); g.fill();
    const layers = [['#3f8fd9', 300], ['#2b6cb0', 470], ['#1d4b85', 640], ['#13325c', 790]];
    layers.forEach(([c, y], i) => rect(g, 0, y, 1000, (layers[i + 1]?.[1] ?? 900) - y, c, 0));
    g.fillStyle = '#6b4a2e'; g.beginPath(); g.moveTo(0, 900); for (let x = 0; x <= 1000; x += 50) g.lineTo(x, 880 + Math.sin(x * 0.03) * 16); g.lineTo(1000, 1000); g.lineTo(0, 1000); g.closePath(); g.fill();
    g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, 300); g.lineTo(1000, 300); g.stroke();
    for (let i = 0; i < 34; i++) {
      const sp = 0.25 + ((i * 53) % 17) / 40, x = 140 + ((i * 197) % 720) + Math.sin(t * 3 + i) * 12;
      const y = 900 - (((t * 260 * sp + i * 97) % 640)), r = 6 + ((i * 7) % 11) * (1 + (900 - y) / 900);
      blob(g, x, y, r, 'rgba(230,245,255,0.9)', 4);
    }
    arrow(g, 120, 820, 120, 420, '#ffd24a', 16); arrow(g, 880, 820, 880, 420, '#ffd24a', 16);
    tag(g, e.label || 'CO₂', 500, 590, 64, '#ffffff');
    tag(g, FORMULAS.lake, 500, 150, 52);
    tag(g, 'LAKE BED', 500, 950, 34, '#c79260');
  },
  reaction(g, t, e) {
    rect(g, 0, 0, 1000, 1000, '#18324f', 0);
    const flask = (x, col, k) => {
      g.save(); g.translate(x, 560);
      g.fillStyle = '#e8f4f8'; g.strokeStyle = INK; g.lineWidth = 8;
      g.beginPath(); g.moveTo(-40, -220); g.lineTo(40, -220); g.lineTo(40, -90); g.lineTo(150, 140); g.lineTo(-150, 140); g.lineTo(-40, -90); g.closePath(); g.fill();
      g.save(); g.clip(); g.fillStyle = col; g.fillRect(-160, 10 - 20 * Math.sin(t * 2 + k), 320, 200); g.restore(); g.stroke();
      for (let i = 0; i < 6; i++) blob(g, -60 + i * 25, 100 - ((t * 120 + i * 40) % 180), 8, '#ffffffcc', 3);
      g.restore();
    };
    flask(220, '#46d07a', 0); flask(780, '#e5484d', 1);
    arrow(g, 360, 560, 640, 560, '#ffd24a', 20);
    const p = (Math.sin(t * 6) + 1) / 2;
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + t; g.strokeStyle = '#fff4b0'; g.lineWidth = 8; g.beginPath(); g.moveTo(500 + Math.cos(a) * 60, 420 + Math.sin(a) * 60); g.lineTo(500 + Math.cos(a) * (90 + 30 * p), 420 + Math.sin(a) * (90 + 30 * p)); g.stroke(); }
    tag(g, FORMULAS.reaction, 500, 170, 60);
    tag(g, e.label || 'THE REACTION', 500, 830, 54, '#ffffff');
  },
  pressure(g, t, e) {
    rect(g, 0, 0, 1000, 1000, '#2b1d2e', 0);
    const k = ease((t % 2.4) / 2.0), swell = 1 + 0.12 * k;
    g.save(); g.translate(500, 560); g.scale(swell, swell);
    g.fillStyle = '#9aa2ac'; g.strokeStyle = INK; g.lineWidth = 10;
    g.beginPath(); g.roundRect(-190, -230, 380, 460, 90); g.fill(); g.stroke();
    g.fillStyle = '#e5484d'; g.globalAlpha = 0.35 + 0.5 * k; g.beginPath(); g.roundRect(-170, -210, 340, 420, 80); g.fill(); g.globalAlpha = 1;
    g.restore();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r0 = 260 * swell, r1 = r0 + 90 + 40 * k; arrow(g, 500 + Math.cos(a) * r0, 560 + Math.sin(a) * r0 * 1.1, 500 + Math.cos(a) * r1, 560 + Math.sin(a) * r1 * 1.1, '#ffb04a', 12); }
    // a gauge, its needle climbing into the red
    blob(g, 500, 180, 120, '#f4f1ea', 8);
    g.save(); g.beginPath(); g.arc(500, 180, 100, Math.PI * 1.65, Math.PI * 2); g.lineWidth = 22; g.strokeStyle = '#e5484d'; g.stroke(); g.restore();
    const na = Math.PI * (0.85 + 1.1 * k); g.lineWidth = 10; g.strokeStyle = INK; g.beginPath(); g.moveTo(500, 180); g.lineTo(500 + Math.cos(na) * 92, 180 + Math.sin(na) * 92); g.stroke(); blob(g, 500, 180, 14, INK, 0);
    tag(g, e.label || 'PRESSURE', 500, 900, 60);
  },
  // a battle map: the ground, a river and a hill, two armies' blocks advancing with arrows, smoke where they meet
  battle(g, t, e) {
    rect(g, 0, 0, 1000, 1000, '#cdb98a', 0);
    g.fillStyle = '#b8a372'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 211) % 1000, (i * 137) % 1000, 18 + (i % 5) * 6, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#4f8fd0'; g.lineWidth = 40; g.beginPath(); g.moveTo(0, 820); g.bezierCurveTo(300, 720, 600, 960, 1000, 860); g.stroke();
    g.fillStyle = '#9c8a5c'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.ellipse(620, 300, 200, 120, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(620, 300, 120, 70, -0.2, 0, Math.PI * 2); g.stroke();
    const k = ease(Math.min(1, t / 2.2));
    const block = (x, y, col) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) rect(g, x + c * 34, y + r * 34, 28, 28, col, 4); };
    const bx = 120 + 160 * k, rx = 760 - 120 * k;
    block(bx, 520, '#2f4fa8'); block(bx - 40, 620, '#2f4fa8'); block(rx, 380, '#c8102e'); block(rx + 30, 480, '#c8102e');
    arrow(g, bx + 140, 560, bx + 300, 470, '#2f4fa8', 18); arrow(g, rx, 420, rx - 170, 500, '#c8102e', 18);
    for (let i = 0; i < 7; i++) { const s = (t * 0.7 + i * 0.37) % 1; g.globalAlpha = 0.7 * (1 - s); blob(g, 470 + Math.sin(i * 2.1) * 80, 500 - s * 160, 30 + s * 50, '#f4f1ea', 0); }
    g.globalAlpha = 1;
    // crossed swords where they meet
    g.lineWidth = 14; g.strokeStyle = INK; g.lineCap = 'round';
    g.beginPath(); g.moveTo(430, 440); g.lineTo(530, 540); g.moveTo(530, 440); g.lineTo(430, 540); g.stroke();
    g.lineWidth = 8; g.strokeStyle = '#e8ebf0'; g.stroke();
    tag(g, e.label || 'THE BATTLE', 500, 120, 60);
    tag(g, 'ARMY', 180, 740, 34, '#2f4fa8', '#ffffff'); tag(g, 'ENEMY', 820, 300, 34, '#c8102e', '#ffffff');
  },
  space(g, t, e) {
    rect(g, 0, 0, 1000, 1000, '#0b1030', 0);
    for (let i = 0; i < 80; i++) blob(g, (i * 263) % 1000, (i * 157) % 1000, 2 + (i % 3), '#ffffff', 0);
    blob(g, 500, 520, 120, '#ffb04a', 8);
    g.strokeStyle = '#ffffff55'; g.lineWidth = 4; g.beginPath(); g.ellipse(500, 520, 330, 200, 0, 0, Math.PI * 2); g.stroke();
    const a = t * 0.9, px = 500 + Math.cos(a) * 330, py = 520 + Math.sin(a) * 200;
    blob(g, px, py, 50, '#3f8fd9', 7); g.fillStyle = '#46b07a'; g.beginPath(); g.arc(px - 10, py - 8, 20, 0, Math.PI * 2); g.fill();
    arrow(g, px, py, px + Math.cos(a) * -110, py + Math.sin(a) * -70, '#ffd24a', 12);
    tag(g, FORMULAS.space, 500, 150, 52); tag(g, e.label || 'ORBIT', 500, 880, 56, '#ffffff');
  },
  chart(g, t, e) {
    rect(g, 0, 0, 1000, 1000, '#f4f1ea', 0);
    g.strokeStyle = '#d8d2c4'; g.lineWidth = 3; for (let y = 300; y <= 850; y += 110) { g.beginPath(); g.moveTo(120, y); g.lineTo(900, y); g.stroke(); }
    const k = ease(Math.min(1, t / 1.4)), hs = [0.18, 0.3, 0.42, 0.95];
    hs.forEach((h, i) => { const H = 520 * h * k; rect(g, 170 + i * 180, 850 - H, 120, H, i === 3 ? '#e5484d' : '#3f6fb5', 7); });
    arrow(g, 200, 780, 820, 300 + 60 * (1 - k), '#ffd24a', 18);
    g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.moveTo(120, 250); g.lineTo(120, 850); g.lineTo(920, 850); g.stroke();
    tag(g, e.label || 'UP', 500, 170, 96, '#ffd24a');
  },
};

/** draws a cutaway over the frame: e = { start, end, kind, label }; the diagram pops in and out over 0.18 s */
export function drawExplain(g, W, H, e, t) {
  const draw = DRAW[e.kind]; if (!draw) return;
  const local = t - e.start, len = e.end - e.start, inK = ease(local / 0.18), outK = ease((e.end - t) / 0.14), k = Math.min(inK, outK);
  const S = Math.min(W, H * 0.62) / 1000 * (0.94 + 0.06 * k), ox = (W - 1000 * S) / 2, oy = (H - 1000 * S) / 2 + H * 0.02;
  g.save();
  g.globalAlpha = k;
  // the frame behind dims to a blur-like wash, so the diagram reads as a cutaway
  g.fillStyle = 'rgba(14,10,24,0.82)'; g.fillRect(0, 0, W, H);
  // the empty bands above and below the square are filled with the same diagram, blurred and darker (full bleed)
  if (H > W * 1.15 && 'filter' in g) {
    const B = Math.max(W, H) / 1000;
    g.save(); g.filter = `blur(${Math.round(W * 0.03)}px) brightness(0.55)`;
    g.translate((W - 1000 * B) / 2, (H - 1000 * B) / 2); g.scale(B, B);
    draw(g, Math.max(0, local) + (e.seed || 0) * 0.01, e);
    g.restore(); g.filter = 'none';
  }
  g.translate(ox, oy); g.scale(S, S);
  g.beginPath(); g.roundRect(0, 0, 1000, 1000, 46); g.save(); g.clip();
  draw(g, Math.max(0, local) + (e.seed || 0) * 0.01, e);
  g.restore();
  g.lineWidth = 14; g.strokeStyle = '#ffffff'; g.beginPath(); g.roundRect(0, 0, 1000, 1000, 46); g.stroke();
  g.restore();
  void len;
}
