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

export async function synthMusic(moodKey, seconds) {
  const mood = MOODS[moodKey];
  if (!mood || !mood.scale) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * (seconds + 1)), SAMPLE_RATE);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(master);

  const scale = SCALES[mood.scale];
  const beat = 60 / mood.bpm;
  const barLen = beat * 4 * (mood.pulse ? 1 : 2);
  const bars = Math.ceil(seconds / barLen) + 1;
  const noise = noiseBuffer(ctx, 0.5);

  const note = (degree, octave = 0) => {
    const o = Math.floor(degree / 7);
    const d = ((degree % 7) + 7) % 7;
    return mood.root + scale[d] + 12 * (o + octave);
  };

  // Fade the whole bed in and out.
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.exponentialRampToValueAtTime(0.9, 2.5);
  master.gain.setValueAtTime(0.9, Math.max(2.6, seconds - 1.5));
  master.gain.linearRampToValueAtTime(0.0001, seconds + 0.8);

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * barLen;
    if (t0 > seconds + 1) break;
    const deg = mood.prog[bar % mood.prog.length];

    // Pad chord: detuned saws through a soft low-pass.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t0);
    lp.frequency.linearRampToValueAtTime(mood.pulse ? 1400 : 1000, t0 + barLen * 0.6);
    lp.frequency.linearRampToValueAtTime(600, t0 + barLen + 0.6);
    lp.Q.value = 0.4;
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, t0);
    padGain.gain.linearRampToValueAtTime(0.05, t0 + Math.min(0.9, barLen * 0.3));
    padGain.gain.setValueAtTime(0.05, t0 + barLen - 0.1);
    padGain.gain.linearRampToValueAtTime(0.0001, t0 + barLen + 0.7);
    lp.connect(padGain);
    padGain.connect(master);
    padGain.connect(reverb);
    for (const step of [0, 2, 4]) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(note(deg + step));
        o.detune.value = det;
        o.connect(lp);
        o.start(t0);
        o.stop(t0 + barLen + 0.8);
      }
    }

    // Sub bass.
    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = mtof(note(deg, -2));
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t0);
    bg.gain.linearRampToValueAtTime(0.16, t0 + 0.08);
    bg.gain.setTargetAtTime(0.07, t0 + 0.2, 0.6);
    bg.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
    b.connect(bg).connect(master);
    b.start(t0); b.stop(t0 + barLen + 0.05);

    // Plucked arpeggio (sparse for calm moods).
    const steps = mood.pulse ? 8 : 6;
    const stepLen = barLen / steps;
    const pattern = [0, 2, 4, 7, 4, 2, 4, 9];
    for (let s = 0; s < steps; s++) {
      if (!mood.pulse && s % 2 === 1 && Math.random() < 0.5) continue;
      const tt = t0 + s * stepLen;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = mtof(note(deg + pattern[s % pattern.length], 1));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(mood.pulse ? 0.035 : 0.045, tt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + stepLen * 1.8);
      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      o.start(tt); o.stop(tt + stepLen * 2);
    }

    // Soft kick + hats for driving moods.
    if (mood.pulse && bar > 0) {
      for (let k = 0; k < 4; k++) {
        const tt = t0 + k * beat;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(110, tt);
        o.frequency.exponentialRampToValueAtTime(42, tt + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(k % 2 === 0 ? 0.22 : 0.12, tt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.32);
        o.connect(g).connect(master);
        o.start(tt); o.stop(tt + 0.35);

        const h = ctx.createBufferSource();
        h.buffer = noise;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 7000;
        const hg = ctx.createGain();
        const th = tt + beat / 2;
        hg.gain.setValueAtTime(0.0001, th);
        hg.gain.linearRampToValueAtTime(0.025, th + 0.003);
        hg.gain.exponentialRampToValueAtTime(0.0001, th + 0.06);
        h.connect(hp).connect(hg).connect(master);
        h.start(th); h.stop(th + 0.08);
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

export async function mixSoundtrack(timeline, { music = null, musicVolume = 0.55, sfx = true } = {}) {
  const total = timeline.total;
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * total), SAMPLE_RATE);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5;
  comp.attack.value = 0.005; comp.release.value = 0.2;
  comp.connect(ctx.destination);

  const voiceBus = ctx.createGain();
  voiceBus.gain.value = 1;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 70;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking'; presence.frequency.value = 3200; presence.gain.value = 2.5; presence.Q.value = 0.8;
  voiceBus.connect(hp).connect(presence).connect(comp);

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
