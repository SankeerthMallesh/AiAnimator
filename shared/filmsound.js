// Film sound for the looks drawn in code, ported from the hand-made shorts' soundtrack script
// (tools/films/score.py): a score in sections (pluck, glockenspiel, vibes, pad, brush and snare,
// timpani, cymbal) that follows the story's shape, and sound effects placed on the shot plan
// (whoosh, splash, bubbles, heartbeat, breath, crunch, thump, cheer, engine, beeps, scrape, boom,
// riser). The mixer (explainer/js/audio.js) sets the music under the voice and masters the mix.
//
// cueSheet() and scoreSections() are plain data (unit-tested); filmScore() and renderCues() need
// Web Audio.

const SR = 48000;
const rng = (seed) => { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- where the sounds go ----------
// specs: the shot plan (z3d/plan.js planShots: { start, end, kind, set, pose, camera, effect, icon }).
// Returns [{ t, kind, gain, dur? }] sorted by time. No two cues of one kind within 0.25 s.
export const CUE_KINDS = ['whoosh', 'splash', 'bubbles', 'heartbeat', 'breath', 'crunch', 'thump', 'cheer', 'engine', 'beeps', 'scrape', 'boom', 'riser', 'zap', 'step', 'wind'];
export function cueSheet(specs, total = Infinity) {
  const cues = [];
  const add = (t, kind, gain = 1, dur) => { if (t >= 0 && t < total) cues.push(dur ? { t, kind, gain, dur } : { t, kind, gain }); };
  if (specs.length) add(0, 'boom', 0.55);
  specs.forEach((s, i) => {
    const d = s.end - s.start;
    if (i > 0) add(Math.max(0, s.start - 0.2), 'whoosh', s.camera === 'impact' || /pan/.test(s.camera) ? 0.85 : 0.55);
    if (s.kind === 'react') {
      add(Math.max(0, s.start - 0.85), 'riser', 0.6, 0.85);
      add(s.start, 'thump', 0.9);
      if (s.pose === 'surprised' || s.pose === 'flinch') add(s.start + 0.12, 'breath', 0.8);
    }
    if (s.camera === 'impact' && s.kind !== 'react') add(s.start + 0.05, 'boom', 0.5);
    if (s.kind === 'walk') for (let t = s.start + 0.15, k = 0; t < s.end - 0.1; t += 0.46, k++) add(t, s.set === 'snow' ? 'crunch' : 'step', k % 2 ? 0.55 : 0.7);
    if (s.kind === 'group' && (s.pose === 'cheer' || s.pose === 'talk')) add(s.start + 0.35, 'cheer', 0.9, Math.min(2.4, d));
    if (s.kind === 'point' && s.icon) add(s.start + 0.45, 'beeps', 0.6);
    if (s.kind === 'wide' && (s.set === 'street' || s.set === 'night') && i % 2 === 0) add(s.start + 0.3, 'engine', 0.5, Math.min(2.6, d));
    if (s.kind === 'wide' && s.set === 'snow') add(s.start + 0.6, 'scrape', 0.45);
    if (s.set === 'snow' && (s.kind === 'wide' || s.kind === 'walk')) add(s.start, 'wind', 0.5, d);
    // A new chapter (long form) lands with a boom under its title card, a riser into it.
    if (s.chapter && s.offset === 0 && s.start > 1) { add(Math.max(0, s.start - 0.7), 'riser', 0.5, 0.7); add(s.start, 'boom', 0.75); }
    // Things (z3d/things.js): what happens to them is heard.
    if (s.thing) {
      if (s.do === 'drop') { add(s.start + 0.1, 'whoosh', 0.5); add(s.start + 0.55, 'thump', 0.9); }
      if (s.do === 'break') { add(s.start + 0.45, 'riser', 0.4, 0.15); add(s.start + 0.6, 'crunch', 1); add(s.start + 0.62, 'boom', 0.6); }
      if (s.do === 'grow') add(s.start + 0.15, 'thump', 0.55);
      if (s.do === 'spin') add(s.start + 0.05, 'whoosh', 0.4);
    }
    switch (s.effect) {
      case 'pulse': for (let t = s.start + 0.1; t < s.end - 0.3; t += 0.9) add(t, 'heartbeat', 0.85); break;
      case 'shockwave': add(s.start + 0.15, 'boom', 0.95); break;
      case 'bubbles': add(s.start + 0.05, 'splash', 0.8); add(s.start + 0.4, 'bubbles', 0.7, Math.max(0.6, d - 0.5)); break;
      case 'sparks': for (let k = 0; k < 3; k++) add(s.start + 0.2 + k * (d / 3.2), 'zap', 0.7); break;
      case 'rain': add(s.start, 'wind', 0.35, d); break;
      default: break;
    }
  });
  cues.sort((a, b) => a.t - b.t);
  const last = {};
  return cues.filter(c => { const ok = !(c.kind in last) || c.t - last[c.kind] >= 0.25; if (ok) last[c.kind] = c.t; return ok; });
}

// The score follows the story: intro (the hook), build, tension (the cliffhanger: from the first
// reaction after a quarter of the film), payoff (the last quarter, or the last reaction), outro.
export function scoreSections(specs, total) {
  if (!(total > 0)) return [];
  const reacts = specs.filter(s => s.kind === 'react' || s.camera === 'impact' || s.effect === 'shockwave').map(s => s.start);
  const introEnd = Math.min(Math.max(specs[0] ? specs[0].end : 3, 2.5), total * 0.25);
  let tension = reacts.find(t => t >= total * 0.25 && t <= total * 0.65) ?? total * 0.45;
  let payoff = Math.max(tension + 3, total * 0.74);
  const lateReact = reacts.filter(t => t > tension + 3 && t < total - 4).pop();
  if (lateReact && lateReact > payoff - 4) payoff = lateReact;
  payoff = Math.min(payoff, total - 2.5);
  tension = Math.min(tension, payoff - 2);
  const outro = Math.max(payoff + 2, total - 2.2);
  const out = [['intro', 0, introEnd], ['build', introEnd, tension], ['tension', tension, payoff], ['payoff', payoff, outro], ['outro', outro, total]];
  return out.filter(([, a, b]) => b - a > 0.4).map(([kind, start, end]) => ({ kind, start, end }));
}

// ---------- instruments (Web Audio) ----------
function noiseBuf(ctx, seconds, seed = 7) {
  const r = rng(seed), b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return b;
}
function env(ctx, t, peak, attack, decay, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest); return g;
}
function osc(ctx, type, f, t, dur, dest, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(ctx, nb, t, dur, dest, { type = 'bandpass', f = 1000, q = 1, f2 = null } = {}) {
  const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  // A different stretch of noise each time, the same every render.
  s.connect(fl).connect(dest); s.start(t, (t * 7.31) % 0.5); s.stop(t + dur + 0.05); return fl;
}
const pan = (ctx, p, dest) => { const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(dest); return n; };

const INST = {
  pluck(ctx, out, f, t, v = 0.5, p = 0) {
    const d = pan(ctx, p, out);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.5); lp.connect(d);
    const g = env(ctx, t, v * 0.35, 0.004, 0.75, lp);
    osc(ctx, 'triangle', f, t, 0.8, g); osc(ctx, 'sine', f * 2, t, 0.4, env(ctx, t, v * 0.12, 0.003, 0.3, d));
  },
  glock(ctx, out, f, t, v = 0.5, p = 0) {
    const d = pan(ctx, p, out);
    for (const [m, a, dec] of [[1, 0.3, 1.3], [2.76, 0.12, 0.5], [5.4, 0.06, 0.25]]) osc(ctx, 'sine', f * m, t, dec, env(ctx, t, v * a, 0.002, dec, d));
  },
  vibes(ctx, out, f, t, v = 0.5, p = 0) {
    const d = pan(ctx, p, out);
    const trem = ctx.createGain(); trem.gain.value = 1; trem.connect(d);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = 0.25; lfo.connect(lg).connect(trem.gain); lfo.start(t); lfo.stop(t + 1.8);
    osc(ctx, 'sine', f, t, 1.7, env(ctx, t, v * 0.3, 0.005, 1.6, trem)); osc(ctx, 'sine', f * 4, t, 0.4, env(ctx, t, v * 0.05, 0.003, 0.35, trem));
  },
  pad(ctx, out, notes, t, dur, v = 0.5, warm = 900) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = warm; lp.Q.value = 0.5; lp.connect(out);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.07, t + Math.min(0.6, dur * 0.3));
    g.gain.setValueAtTime(v * 0.07, Math.max(t + 0.6, t + dur - 0.9)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3); g.connect(lp);
    for (const n of notes) for (const dt of [-7, 7]) osc(ctx, 'sawtooth', mtof(n), t, dur + 0.35, g, dt);
  },
  brush(ctx, out, nb, t, v = 0.5) { noise(ctx, nb, t, 0.22, env(ctx, t, v * 0.12, 0.01, 0.2, pan(ctx, -0.2, out)), { type: 'highpass', f: 4000 }); },
  snare(ctx, out, nb, t, v = 0.5) {
    const d = pan(ctx, 0.12, out);
    noise(ctx, nb, t, 0.2, env(ctx, t, v * 0.32, 0.002, 0.16, d), { type: 'bandpass', f: 2200, q: 0.8 });
    osc(ctx, 'triangle', 185, t, 0.1, env(ctx, t, v * 0.25, 0.002, 0.08, d));
  },
  kick(ctx, out, t, v = 0.5) { const o = osc(ctx, 'sine', 110, t, 0.3, env(ctx, t, v * 0.7, 0.003, 0.28, out)); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); },
  timpani(ctx, out, nb, f, t, v = 0.6) {
    const o = osc(ctx, 'sine', f * 1.06, t, 1.6, env(ctx, t, v * 0.6, 0.005, 1.5, out)); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    osc(ctx, 'sine', f * 1.5, t, 0.8, env(ctx, t, v * 0.15, 0.005, 0.7, out));
    noise(ctx, nb, t, 0.12, env(ctx, t, v * 0.2, 0.002, 0.1, out), { type: 'lowpass', f: 500 });
  },
  cymbal(ctx, out, nb, t, v = 0.5, swell = 0) {
    const g = ctx.createGain();
    if (swell) { g.gain.setValueAtTime(0.0001, t - swell); g.gain.exponentialRampToValueAtTime(v * 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); }
    else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.14, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); }
    g.connect(pan(ctx, 0.25, out));
    noise(ctx, nb, swell ? t - swell : t, (swell || 0) + 2.7, g, { type: 'highpass', f: 5500, q: 0.6 });
  },
};

// ---------- the score ----------
// mood: { root (midi), scale: 'major'|'minor', bpm, prog: [degrees] } as in the explainer's MOODS.
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
export async function filmScore(total, { mood = { root: 52, scale: 'major', bpm: 100, prog: [0, 4, 5, 3] }, sections = null, seed = 1 } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * (total + 0.5)), SR);
  const r = rng(seed);
  const out = ctx.createGain(); out.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; out.connect(comp).connect(ctx.destination);
  // A small hall, so the instruments sit in one room.
  const rev = ctx.createConvolver(), irN = Math.round(SR * 2.2), ir = ctx.createBuffer(2, irN, SR), rr = rng(seed + 9);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irN; i++) d[i] = (rr() * 2 - 1) * Math.pow(1 - i / irN, 3.5); }
  rev.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.22; out.connect(rev).connect(wet).connect(ctx.destination);
  const nb = noiseBuf(ctx, 3, seed);
  const sc = SCALES[mood.scale] || SCALES.major, root = mood.root || 52;
  const prog = mood.prog || [0, 4, 5, 3];
  const beat = 60 / (mood.bpm || 100), bar = beat * 4;
  const deg = (d, oct = 0) => root + 12 * (oct + Math.floor(d / 7)) + sc[((d % 7) + 7) % 7];
  const chordAt = (t) => prog[Math.floor(t / bar) % prog.length];
  const triad = (d, oct = 0) => [deg(d, oct), deg(d + 2, oct), deg(d + 4, oct)];
  const secs = sections || [{ kind: 'build', start: 0, end: total }];
  const arpPat = [[0, 2, 4, 7, 4, 2, 4, 9], [0, 4, 7, 4, 9, 7, 4, 2], [7, 4, 2, 0, 2, 4, 7, 9]][Math.floor(r() * 3)];
  const mel = [0, 2, 4, 2, 7, 4, 5, 4].map(x => x + (r() < 0.3 ? 2 : 0));
  for (const s of secs) {
    const a = Math.floor(s.start / bar) * bar;
    // Pads: one chord per bar, warmer and lower in the tension.
    for (let t = a; t < s.end; t += bar) {
      const st = Math.max(t, s.start), d = Math.min(t + bar, s.end) - st;
      if (d <= 0.2) continue;
      INST.pad(ctx, out, triad(chordAt(t), s.kind === 'tension' ? -1 : 0), st, d, s.kind === 'tension' ? 0.8 : s.kind === 'intro' || s.kind === 'outro' ? 0.6 : 0.5, s.kind === 'tension' ? 600 : 1000);
    }
    // Plucked arpeggio: half speed in the intro, eighths in the build and payoff (vibes in the payoff).
    if (s.kind !== 'tension' && s.kind !== 'outro') {
      const step = s.kind === 'intro' ? beat : beat / 2;
      let k = 0;
      for (let t = Math.ceil(s.start / step) * step; t < s.end - 0.05; t += step, k++) {
        const n = deg(chordAt(t) + arpPat[k % arpPat.length], 1);
        (s.kind === 'payoff' ? INST.vibes : INST.pluck)(ctx, out, mtof(n), t, 0.45 + 0.15 * (k % 4 === 0), k % 2 ? 0.3 : -0.3);
      }
    }
    // Glockenspiel melody over the build and the payoff.
    if (s.kind === 'build' || s.kind === 'payoff') {
      let k = 0;
      for (let t = Math.ceil(s.start / (beat * 2)) * beat * 2; t < s.end - 0.3; t += beat * 2, k++) if (r() < 0.8) INST.glock(ctx, out, mtof(deg(chordAt(t) + mel[k % mel.length], 2)), t, 0.4, 0.1);
    }
    // Drums: brushes in the build, snare backbeat and kick in the payoff.
    if (s.kind === 'build' || s.kind === 'payoff') {
      let k = 0;
      for (let t = Math.ceil(s.start / beat) * beat; t < s.end - 0.05; t += beat, k++) {
        if (s.kind === 'payoff') { if (k % 2) INST.snare(ctx, out, nb, t, 0.55); else INST.kick(ctx, out, t, 0.6); }
        else if (k % 2) INST.brush(ctx, out, nb, t, 0.6); else INST.brush(ctx, out, nb, t, 0.35);
      }
    }
    // Tension: timpani on each bar, a snare roll and a cymbal swell into the payoff.
    if (s.kind === 'tension') {
      for (let t = a; t < s.end - 0.2; t += bar) if (t >= s.start - 0.01) INST.timpani(ctx, out, nb, mtof(deg(chordAt(t), -2)), t, 0.7);
      const rollFrom = Math.max(s.start, s.end - 1.6);
      for (let t = rollFrom, k = 0; t < s.end - 0.02; t += 0.07, k++) INST.snare(ctx, out, nb, t, 0.15 + 0.5 * (t - rollFrom) / 1.6);
      INST.cymbal(ctx, out, nb, s.end, 0.6, 1.4);
    }
    if (s.kind === 'payoff') INST.cymbal(ctx, out, nb, s.start, 0.7);
    if (s.kind === 'outro') INST.glock(ctx, out, mtof(deg(0, 2)), s.start + 0.1, 0.55);
  }
  // Fade out over the last second.
  out.gain.setValueAtTime(0.9, Math.max(0, total - 1.2)); out.gain.linearRampToValueAtTime(0.0001, total + 0.3);
  return ctx.startRendering();
}

// ---------- sound effects ----------
// Adds the cues to ctx (an OfflineAudioContext), into dest. Each cue is shaped like score.py's.
export function renderCues(ctx, dest, cues, seed = 3) {
  const nb = noiseBuf(ctx, 2, seed), r = rng(seed);
  for (const c of cues) {
    const t = c.t, v = c.gain ?? 1, dur = c.dur || 1;
    switch (c.kind) {
      case 'whoosh': { const f = noise(ctx, nb, t, 0.45, env(ctx, t, 0.22 * v, 0.2, 0.25, dest), { f: 300, q: 1.2, f2: 3200 }); f.frequency.exponentialRampToValueAtTime(900, t + 0.45); break; }
      case 'boom': { const o = osc(ctx, 'sine', 90, t, 1.3, env(ctx, t, 0.5 * v, 0.01, 1.2, dest)); o.frequency.exponentialRampToValueAtTime(32, t + 0.9); noise(ctx, nb, t, 0.4, env(ctx, t, 0.18 * v, 0.005, 0.38, dest), { type: 'lowpass', f: 900 }); break; }
      case 'thump': { const o = osc(ctx, 'sine', 80, t, 0.3, env(ctx, t, 0.7 * v, 0.008, 0.25, dest)); o.frequency.exponentialRampToValueAtTime(40, t + 0.16); break; }
      case 'heartbeat': for (const [dt, f0, a] of [[0, 52, 1], [0.17, 46, 0.7]]) { const o = osc(ctx, 'sine', f0 * 1.4, t + dt, 0.35, env(ctx, t + dt, 0.6 * v * a, 0.004, 0.3, dest)); o.frequency.exponentialRampToValueAtTime(f0, t + dt + 0.05); } break;
      case 'breath': noise(ctx, nb, t, 0.42, env(ctx, t, 0.2 * v, 0.08, 0.32, dest), { f: 1500, q: 0.9, f2: 2600 }); break;
      case 'crunch': case 'step': {
        const snow = c.kind === 'crunch';
        noise(ctx, nb, t, 0.18, env(ctx, t, (snow ? 0.22 : 0.12) * v, 0.003, snow ? 0.15 : 0.08, dest), { f: snow ? 2600 : 700, q: snow ? 1.4 : 1 });
        osc(ctx, 'sine', snow ? 140 : 95, t, 0.08, env(ctx, t, 0.18 * v, 0.003, 0.06, dest)); break;
      }
      case 'cheer': for (let k = 0; k < 7; k++) { const tk = t + r() * 0.25, f = 500 + r() * 900; noise(ctx, nb, tk, dur, env(ctx, tk, 0.05 * v, 0.15, dur, pan(ctx, r() * 1.6 - 0.8, dest)), { f, q: 2.5, f2: f * (1.1 + r() * 0.3) }); } break;
      case 'engine': {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur); g.connect(dest);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(g);
        const o = osc(ctx, 'sawtooth', 38, t, dur, lp); o.frequency.linearRampToValueAtTime(46, t + dur * 0.5); o.frequency.linearRampToValueAtTime(36, t + dur);
        osc(ctx, 'square', 76, t, dur, lp, 8); break;
      }
      case 'beeps': for (let k = 0; k < 2; k++) osc(ctx, 'square', 1050, t + k * 0.16, 0.1, env(ctx, t + k * 0.16, 0.06 * v, 0.004, 0.08, dest)); break;
      case 'scrape': noise(ctx, nb, t, 0.5, env(ctx, t, 0.12 * v, 0.12, 0.38, dest), { f: 700, q: 1.5, f2: 2600 }); break;
      case 'splash': noise(ctx, nb, t, 0.7, env(ctx, t, 0.3 * v, 0.01, 0.65, dest), { type: 'lowpass', f: 6000, f2: 500 }); osc(ctx, 'sine', 70, t, 0.3, env(ctx, t, 0.3 * v, 0.005, 0.25, dest)); break;
      case 'bubbles': for (let tb = t; tb < t + dur; tb += 0.06 + r() * 0.14) { const f = 400 + r() * 900, o = osc(ctx, 'sine', f, tb, 0.08, env(ctx, tb, 0.05 * v, 0.004, 0.06, dest)); o.frequency.exponentialRampToValueAtTime(f * 1.8, tb + 0.06); } break;
      case 'zap': noise(ctx, nb, t, 0.15, env(ctx, t, 0.12 * v, 0.004, 0.13, dest), { f: 5200, q: 3, f2: 1400 }); break;
      case 'riser': { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 * v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05); g.connect(dest); noise(ctx, nb, t, dur, g, { f: 300, q: 2, f2: 3500 }); break; }
      case 'wind': { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + Math.min(0.6, dur / 3)); g.gain.linearRampToValueAtTime(0.0001, t + dur); g.connect(dest); noise(ctx, nb, t, dur, g, { f: 500, q: 0.7, f2: 800 }); break; }
      default: break;
    }
  }
}
