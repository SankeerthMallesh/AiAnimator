// Timeline + soundtrack: narration, royalty-free generated music, whooshes and impacts.
// Everything is synthesized locally with the Web Audio API, so there is nothing to license.

import { MOODS } from './presets.js';
import { speechBounds, wordTimings } from './tts.js';

export const SAMPLE_RATE = 48000;
const WPS = 2.55;

export function buildTimeline(scenes, voices, { endPad = 0.9, wps = WPS } = {}) {
  let t = 0;
  const out = scenes.map((scene, i) => {
    const v = voices[i];
    const lead = i === 0 ? 0.08 : 0.04;
    let dur, words;
    if (v && v.samples?.length) {
      const b = speechBounds(v.samples, v.sampleRate);
      dur = lead + b.end + 0.16;
      words = wordTimings(scene.narration, lead + b.start, lead + b.end);
    } else {
      const n = scene.narration.split(/\s+/).filter(Boolean).length;
      const speak = n / wps;
      dur = Math.max(1.8, speak + 0.45);
      words = wordTimings(scene.narration, 0.15, 0.15 + speak);
    }
    dur = Math.max(1.6, dur);
    if (i === scenes.length - 1) dur += endPad;
    const item = { ...scene, index: i, start: t, dur, voice: v || null, voiceOffset: lead, words };
    t += dur;
    return item;
  });
  return { scenes: out, total: t };
}

// ---------- generated music ----------

const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function makeImpulse(ctx, seconds = 2.6, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function noiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export async function synthMusic(moodKey, seconds, seed = Math.floor(Math.random() * 1e9)) {
  const mood = MOODS[moodKey];
  if (!mood || !mood.scale) return null;
  // Every video gets its own track: the mood sets the feel, the seed picks the key, tempo, chords,
  // instruments, melody pattern and groove, so two videos never share the same music.
  let rs = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const minor = mood.scale === 'minor';
  const PROGS = minor
    ? [[0, 5, 2, 6], [0, 3, 4, 0], [0, 5, 3, 4], [0, 6, 5, 6], [0, 1, 5, 4], [0, 3, 6, 4], [5, 3, 0, 4], [0, 4, 5, 3]]
    : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4], [0, 2, 3, 4], [0, 4, 3, 4], [3, 4, 0, 5], [0, 5, 1, 4]];
  const ARPS = [[0, 2, 4, 7, 4, 2, 4, 9], [0, 4, 7, 4, 9, 7, 4, 2], [0, 2, 0, 4, 2, 7, 4, 9], [7, 4, 2, 0, 2, 4, 7, 9], [0, 7, 4, 7, 2, 7, 4, 7], [4, 2, 0, 2, 4, 4, 4, 7], [0, 4, 2, 7, 4, 9, 7, 11]];
  const KICKS = [[1, 0, 0, 0, 1, 0, 0, 0], [1, 0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 0, 0, 1, 0, 0], [1, 0, 0, 0, 1, 0, 1, 0], [1, 1, 0, 0, 1, 0, 0, 0]];
  const prog = pick(PROGS);
  const arp = pick(ARPS);
  const kicks = pick(KICKS);
  const root = mood.root + pick([-3, -2, 0, 0, 2, 3, 5]);
  const bpm = Math.round(mood.bpm * (0.88 + rnd() * 0.27));
  const padWave = pick(['sawtooth', 'sawtooth', 'triangle', 'square']);
  const leadWave = pick(['triangle', 'sine', 'square', 'triangle']);
  const bellOn = rnd() < 0.6;
  const clapOn = mood.pulse && rnd() < 0.7;
  const steps = mood.pulse ? pick([8, 8, 12]) : pick([6, 8]);
  const brightness = 900 + rnd() * 900;

  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * (seconds + 1)), SAMPLE_RATE);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.45 + rnd() * 0.2;
  reverb.connect(wet).connect(master);
  const panL = ctx.createStereoPanner(); panL.pan.value = -0.35; panL.connect(master);
  const panR = ctx.createStereoPanner(); panR.pan.value = 0.35; panR.connect(master);

  const scale = SCALES[mood.scale];
  const beat = 60 / bpm;
  const barLen = beat * 4 * (mood.pulse ? 1 : 2);
  const bars = Math.ceil(seconds / barLen) + 1;
  const noise = noiseBuffer(ctx, 0.5);
  const note = (degree, octave = 0) => {
    const o = Math.floor(degree / 7);
    const d = ((degree % 7) + 7) % 7;
    return root + scale[d] + 12 * (o + octave);
  };

  master.gain.setValueAtTime(0.0001, 0);
  master.gain.exponentialRampToValueAtTime(0.9, 2.5);
  master.gain.setValueAtTime(0.9, Math.max(2.6, seconds - 1.5));
  master.gain.linearRampToValueAtTime(0.0001, seconds + 0.8);

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * barLen;
    if (t0 > seconds + 1) break;
    const deg = prog[bar % prog.length];
    const section = Math.floor(bar / 4) % 3; // 0 calm, 1 full, 2 lifted
    const lift = section === 2 ? 1 : 0;

    // Pad chord.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(450, t0);
    lp.frequency.linearRampToValueAtTime(brightness + lift * 400, t0 + barLen * 0.6);
    lp.frequency.linearRampToValueAtTime(600, t0 + barLen + 0.6);
    lp.Q.value = 0.4;
    const padGain = ctx.createGain();
    const padLevel = padWave === 'square' ? 0.025 : 0.045;
    padGain.gain.setValueAtTime(0.0001, t0);
    padGain.gain.linearRampToValueAtTime(padLevel, t0 + Math.min(0.9, barLen * 0.3));
    padGain.gain.setValueAtTime(padLevel, t0 + barLen - 0.1);
    padGain.gain.linearRampToValueAtTime(0.0001, t0 + barLen + 0.7);
    lp.connect(padGain);
    padGain.connect(master);
    padGain.connect(reverb);
    for (const step of [0, 2, 4]) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = padWave;
        o.frequency.value = mtof(note(deg + step));
        o.detune.value = det;
        o.connect(lp);
        o.start(t0);
        o.stop(t0 + barLen + 0.8);
      }
    }

    // Bass, following the groove.
    const bassHits = mood.pulse ? kicks.map((k, i) => (k ? i : -1)).filter(i => i >= 0) : [0];
    for (const hi of bassHits) {
      const tb = t0 + hi * (barLen / 8);
      const b = ctx.createOscillator();
      b.type = 'triangle';
      b.frequency.value = mtof(note(deg, -2));
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, tb);
      bg.gain.linearRampToValueAtTime(0.15, tb + 0.02);
      bg.gain.setTargetAtTime(0.06, tb + 0.12, 0.4);
      bg.gain.linearRampToValueAtTime(0.0001, tb + (mood.pulse ? barLen / 4 : barLen));
      b.connect(bg).connect(master);
      b.start(tb); b.stop(tb + (mood.pulse ? barLen / 4 : barLen) + 0.05);
    }

    // Plucked arpeggio, alternating left and right.
    const stepLen = barLen / steps;
    for (let s = 0; s < steps; s++) {
      if (section === 0 && s % 2 === 1 && rnd() < 0.5) continue;
      const tt = t0 + s * stepLen;
      const o = ctx.createOscillator();
      o.type = leadWave;
      o.frequency.value = mtof(note(deg + arp[s % arp.length], 1));
      const g = ctx.createGain();
      const lvl = (leadWave === 'square' ? 0.018 : 0.035) * (mood.pulse ? 1 : 1.2);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(lvl, tt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + stepLen * 1.8);
      o.connect(g);
      g.connect(s % 2 ? panR : panL);
      g.connect(reverb);
      o.start(tt); o.stop(tt + stepLen * 2);
    }

    // A bell melody on top in the full sections.
    if (bellOn && section > 0) {
      for (let k = 0; k < 2; k++) {
        const tt = t0 + k * (barLen / 2) + barLen / 8;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = mtof(note(deg + pick([4, 7, 9, 11]), 2));
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(0.03, tt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + barLen / 2);
        o.connect(g); g.connect(master); g.connect(reverb);
        o.start(tt); o.stop(tt + barLen / 2 + 0.05);
      }
    }

    // Drums for driving moods: the picked kick groove, off-beat hats, and sometimes a clap.
    if (mood.pulse && bar > 0) {
      const eighth = barLen / 8;
      for (let k = 0; k < 8; k++) {
        const tt = t0 + k * eighth;
        if (kicks[k]) {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(115, tt);
          o.frequency.exponentialRampToValueAtTime(42, tt + 0.18);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, tt);
          g.gain.linearRampToValueAtTime(0.22, tt + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.32);
          o.connect(g).connect(master);
          o.start(tt); o.stop(tt + 0.35);
        }
        if (k % 2 === 1 || (section > 0 && steps === 12)) {
          const h = ctx.createBufferSource();
          h.buffer = noise;
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass'; hp.frequency.value = 7000;
          const hg = ctx.createGain();
          hg.gain.setValueAtTime(0.0001, tt);
          hg.gain.linearRampToValueAtTime(k % 2 ? 0.025 : 0.012, tt + 0.003);
          hg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
          h.connect(hp).connect(hg).connect(k % 4 === 1 ? panL : panR);
          h.start(tt); h.stop(tt + 0.08);
        }
        if (clapOn && section > 0 && (k === 2 || k === 6)) {
          const c = ctx.createBufferSource();
          c.buffer = noise;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
          const cg = ctx.createGain();
          cg.gain.setValueAtTime(0.0001, tt);
          cg.gain.linearRampToValueAtTime(0.06, tt + 0.004);
          cg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16);
          c.connect(bp).connect(cg); cg.connect(master); cg.connect(reverb);
          c.start(tt); c.stop(tt + 0.2);
        }
      }
    }
  }
  return ctx.startRendering();
}

export async function decodeUserMusic(file) {
  const buf = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, 1, SAMPLE_RATE);
  return ctx.decodeAudioData(buf);
}

// ---------- final mix ----------

function whoosh(ctx, dest, t, noise, strength = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.22);
  bp.frequency.exponentialRampToValueAtTime(900, t + 0.42);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22 * strength, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  src.connect(bp).connect(g).connect(dest);
  src.start(t); src.stop(t + 0.5);
}

function boom(ctx, dest, t, noise, strength = 1) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(32, t + 0.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5 * strength, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + 1.3);
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.linearRampToValueAtTime(0.18 * strength, t + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  n.connect(lp).connect(ng).connect(dest);
  n.start(t); n.stop(t + 0.45);
}

function thump(ctx, dest, t, strength) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(75, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(strength, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + 0.26);
}

function zap(ctx, dest, t, noise) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(5200, t);
  f.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  src.connect(f).connect(g).connect(dest);
  src.start(t); src.stop(t + 0.16);
}

export async function mixSoundtrack(timeline, { music = null, musicVolume = 0.55, sfx = true } = {}) {
  const total = timeline.total;
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * total), SAMPLE_RATE);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5;
  comp.attack.value = 0.005; comp.release.value = 0.2;
  comp.connect(ctx.destination);

  // Studio voice chain: clean the low end, add warmth and presence, tame the "s" sounds, add air,
  // even the level like a broadcast narrator, and place the voice in a small, warm room.
  const voiceBus = ctx.createGain();
  voiceBus.gain.value = 1;
  const eq = (type, f, g, q = 0.8) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.gain.value = g; n.Q.value = q; return n; };
  // Gentle and warm: the synthetic sheen of AI voices lives in the top band, so it is softened
  // rather than boosted, and light compression keeps the natural rise and fall of a real reader.
  const hp = eq('highpass', 80, 0, 0.7);
  const warm = eq('lowshelf', 180, 2);
  const mud = eq('peaking', 420, -1.5, 1.1);
  const presence = eq('peaking', 2800, 1.2, 0.8);
  const harsh = eq('peaking', 5200, -1.5, 1.4);
  const deess = eq('peaking', 7000, -4, 2.2);
  const soften = eq('lowpass', 9800, 0, 0.6);
  const vcomp = ctx.createDynamicsCompressor();
  vcomp.threshold.value = -21; vcomp.knee.value = 10; vcomp.ratio.value = 2.2; vcomp.attack.value = 0.008; vcomp.release.value = 0.2;
  const makeup = ctx.createGain(); makeup.gain.value = 1.12;
  voiceBus.connect(hp).connect(warm).connect(mud).connect(presence).connect(harsh).connect(deess).connect(soften).connect(vcomp).connect(makeup);
  makeup.connect(comp);
  // A short room: decaying noise as an impulse, mixed in quietly.
  const room = ctx.createConvolver();
  const irLen = Math.round(SAMPLE_RATE * 0.32);
  const ir = ctx.createBuffer(2, irLen, SAMPLE_RATE);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let seed = 17 + ch * 31;
    for (let i = 0; i < irLen; i++) { seed = (seed * 16807) % 2147483647; d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
  }
  room.buffer = ir;
  const roomLp = eq('lowpass', 4200, 0, 0.7);
  const wet = ctx.createGain(); wet.gain.value = 0.075;
  makeup.connect(room).connect(roomLp).connect(wet).connect(comp);

  for (const s of timeline.scenes) {
    if (!s.voice) continue;
    const buf = ctx.createBuffer(1, s.voice.samples.length, s.voice.sampleRate);
    buf.copyToChannel(s.voice.samples, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(voiceBus);
    src.start(s.start + s.voiceOffset);
  }

  if (music) {
    const src = ctx.createBufferSource();
    src.buffer = music;
    src.loop = music.duration < total;
    const mg = ctx.createGain();
    const vol = Math.max(0, Math.min(1, musicVolume));
    const hasVoice = timeline.scenes.some(s => s.voice);
    const loud = vol * 0.55, ducked = vol * (hasVoice ? 0.2 : 0.55);
    mg.gain.setValueAtTime(ducked, 0);
    // Duck under narration, lift in the gaps.
    if (hasVoice) {
      for (const s of timeline.scenes) {
        if (!s.voice || !s.words.length) continue;
        const a = s.start + s.voiceOffset + s.words[0].start - 0.1;
        const b = s.start + s.voiceOffset + s.words[s.words.length - 1].end;
        mg.gain.setTargetAtTime(ducked, Math.max(0, a - 0.15), 0.05);
        mg.gain.setTargetAtTime(loud, b + 0.05, 0.12);
      }
    }
    mg.gain.setTargetAtTime(0.0001, Math.max(0, total - 0.8), 0.25);
    src.connect(mg).connect(comp);
    src.start(0);
  }

  if (sfx) {
    const noise = noiseBuffer(ctx, 1.5);
    const fx = ctx.createGain();
    fx.gain.value = 0.8;
    fx.connect(comp);
    boom(ctx, fx, 0.0, noise, 0.8);
    timeline.scenes.forEach((s, i) => {
      if (i > 0 && s.transition !== 'fade') whoosh(ctx, fx, Math.max(0, s.start - 0.22), noise, s.transition === 'whip' ? 1 : 0.7);
      if (s.camera === 'impact' && i > 0) boom(ctx, fx, s.start, noise, 0.7);
      const end = s.start + s.dur;
      if (s.effect === 'pulse') {
        // Heartbeat: lub-dub in time with the on-screen pulse.
        for (let t = s.start; t < end - 0.3; t += 0.9) { thump(ctx, fx, t, 0.5); thump(ctx, fx, t + 0.25, 0.32); }
      } else if (s.effect === 'shockwave') {
        boom(ctx, fx, s.start + 0.15, noise, 0.9);
      } else if (s.effect === 'rain' || s.effect === 'smoke' || s.effect === 'speed') {
        // A soft bed of filtered noise: rain patter, hiss of steam, or rushing air.
        const src = ctx.createBufferSource();
        src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = s.effect === 'rain' ? 'highpass' : 'bandpass';
        f.frequency.value = s.effect === 'rain' ? 2500 : s.effect === 'speed' ? 900 : 400;
        const g = ctx.createGain();
        const level = s.effect === 'rain' ? 0.07 : 0.05;
        g.gain.setValueAtTime(0.0001, s.start);
        g.gain.linearRampToValueAtTime(level, s.start + 0.4);
        g.gain.setValueAtTime(level, Math.max(s.start + 0.4, end - 0.4));
        g.gain.linearRampToValueAtTime(0.0001, end);
        src.connect(f).connect(g).connect(fx);
        src.start(s.start); src.stop(end + 0.05);
      } else if (s.effect === 'sparks') {
        for (let k = 0; k < 3; k++) zap(ctx, fx, s.start + 0.2 + k * (s.dur / 3.2), noise);
      }
    });
  }

  const out = await ctx.startRendering();
  // Normalize to a healthy peak.
  let peak = 0;
  for (let c = 0; c < out.numberOfChannels; c++) {
    const d = out.getChannelData(c);
    for (let i = 0; i < d.length; i += 2) peak = Math.max(peak, Math.abs(d[i]));
  }
  if (peak > 0.001) {
    const g = 0.93 / peak;
    if (g < 1 || g > 1.05) {
      for (let c = 0; c < out.numberOfChannels; c++) {
        const d = out.getChannelData(c);
        for (let i = 0; i < d.length; i++) d[i] = Math.max(-1, Math.min(1, d[i] * g));
      }
    }
  }
  return out;
}
