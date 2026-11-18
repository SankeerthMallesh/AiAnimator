// Plays a storyboard on a canvas: code-drawn sets, props and a cast, with a camera,
// whip and zoom cuts, and one-or-two-word captions locked to the voice.

import { Ink, Cast } from './cast.js';
import { PropKit, SetKit } from './props.js';
import { wordTimings } from './tts.js';

const BEAT = 3.15;

export async function loadFonts() {
  try {
    if (!document.fonts?.load) return;
    await Promise.race([
      Promise.all([document.fonts.load('900 72px Montserrat'), document.fonts.load('700 28px Montserrat')]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch { /* a fallback font still draws the captions */ }
}

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.view = null;
  }
  get W() { return this.canvas.width; }
  get H() { return this.canvas.height; }
  setView(view) { this.view = view; }
  dispose() {}

  drawFrame(t) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const view = this.view;
    ctx.fillStyle = '#7EC8F2';
    ctx.fillRect(0, 0, W, H);
    if (!view?.timeline?.scenes?.length) return;
    const scenes = view.timeline.scenes;
    let scene = scenes.find(s => t >= s.start && t < s.start + s.dur) || scenes[scenes.length - 1];
    const local = Math.max(0, Math.min(scene.dur - 0.001, t - scene.start));
    const shot = Stage.shot(scene, local);
    Stage.world(ctx, W, H, view, scene, local, shot);
    // Finish: warm light from the top left and a gentle vignette tie every set together.
    if (!this._finish || this._finish.width !== W || this._finish.height !== H) {
      const f = document.createElement('canvas'); f.width = W; f.height = H;
      const fx = f.getContext('2d');
      const light = fx.createRadialGradient(W * 0.15, H * 0.05, 0, W * 0.15, H * 0.05, Math.hypot(W, H) * 0.7);
      light.addColorStop(0, 'rgba(255,246,222,0.18)'); light.addColorStop(1, 'rgba(255,244,214,0)');
      fx.fillStyle = light; fx.fillRect(0, 0, W, H);
      const vig = fx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
      vig.addColorStop(0, 'rgba(20,18,40,0)'); vig.addColorStop(1, 'rgba(20,18,40,0.15)');
      fx.fillStyle = vig; fx.fillRect(0, 0, W, H);
      this._finish = f;
    }
    ctx.drawImage(this._finish, 0, 0);
    if (shot.whip > 0) Stage.speedLines(ctx, W, H, shot.whip);
    if (view.settings?.captionStyle !== 'off') Stage.caption(ctx, W, H, scene, local);
  }

  static still(canvas, script, scene, plate, localT = 0.8) {
    const stage = new Stage(canvas);
    const dur = Math.max(2.4, Number(scene.hold) || 3.2);
    const fake = {
      ...scene,
      start: 0,
      dur,
      index: 0,
      voice: null,
      words: wordTimings(scene.narration || '', 0.15, dur * 0.75),
    };
    stage.setView({
      script,
      timeline: { scenes: [fake], total: dur },
      plates: new Map(plate ? [[scene.id, { bitmap: plate }]] : []),
      settings: { captionStyle: 'word' },
    });
    stage.drawFrame(Math.min(localT, dur - 0.05));
  }

  // One continuous camera move per scene, eased, with a gentle handheld drift, so a shot
  // never jumps mid-line. Transitions happen only at scene changes.
  static shot(scene, local) {
    const dur = Math.max(0.5, scene.dur);
    const p = Ink.smooth(Ink.clamp(local / dur, 0, 1));
    const cam = scene.cam || 'push';
    let whip = 0, z = 1, panX = 0, panY = 0, rot = 0;
    if (local < 0.22 && scene.cut === 'whip') whip = 1 - local / 0.22;
    if (local < 0.3 && scene.cut === 'zoom') z = 1.16 - 0.16 * Ink.smooth(local / 0.3);
    if (cam === 'push') z *= 1 + 0.07 * p;
    else if (cam === 'pull') z *= 1.07 - 0.07 * p;
    else if (cam === 'pan') { panX = (p - 0.5) * (scene.index % 2 ? -0.9 : 0.9); z *= 1.05; }
    else if (cam === 'tilt') { rot = (p - 0.5) * 0.035; z *= 1.04; }
    else if (cam === 'punch') {
      // A quick punch-in on the first beat of the line, then a slow settle.
      const k = local - 0.3;
      z *= 1.02 + (k > 0 && k < 0.5 ? 0.11 * Math.sin((k / 0.5) * Math.PI) * (k < 0.25 ? 1 : 0.6) : 0) + 0.03 * p;
    }
    // Breathing: barely visible, but it keeps every frame alive.
    z *= 1 + 0.006 * Math.sin(local * 0.9 + scene.index);
    panX += 0.02 * Math.sin(local * 0.6 + scene.index * 1.7);
    panY += 3 * Math.sin(local * 0.75 + scene.index);
    if (whip) panX += (scene.index % 2 ? 1 : -1) * whip * whip * 0.42;
    return { cam, z, panX, panY, rot, whip, lt: local };
  }

  static world(ctx, W, H, view, scene, local, shot) {
    const u = Cast.unit(H);
    const ground = H * (W < H ? 0.78 : 0.84);
    ctx.save();
    ctx.translate(W / 2, ground);
    ctx.rotate(shot.rot);
    ctx.scale(shot.z, shot.z);
    ctx.translate(-W / 2 + shot.panX * W * 0.18, -ground + shot.panY);
    const plate = view.plates?.get(scene.id)?.bitmap || null;
    SetKit.draw(ctx, W, H, scene.set, scene.start + local, plate);
    const cast = new Map((view.script?.cast || []).map(c => [c.id, c]));
    const actors = Stage.actors(scene, local, cast);
    const props = Stage.props(scene, local);
    // Interaction for this scene: who is using which prop, and how.
    const use = scene.use || null;
    const ua = use ? actors.find(a => a.id === use.who) : null;
    const up = use ? props.find(p => (p.id || p.kind) === use.prop) : null;
    if (ua && up && use.how === 'ride') { ua.pose = 'drive'; up.x = ua.x; }
    if (ua && up && use.how === 'push') { up.x = ua.x + ua.face * 0.21; if (ua.pose === 'walk' || ua.pose === 'idle') ua.pose = 'give'; }
    if (ua && up && use.how === 'carry') ua.pose = 'cheer';
    const vehicle = ua && up && use.how === 'ride' ? up : null;
    const carried = ua && up && use.how === 'carry' ? up : null;
    const driving = actors.some(a => a.pose === 'drive');
    for (const p of props) {
      if (p === vehicle || p === carried) continue;
      if (p.kind === 'car' && driving) continue;
      if (p.kind === 'sun') Stage.sun(ctx, p, W, u, H, local);
      else {
        let x = p.x;
        if (['tree', 'house', 'car', 'train', 'planet'].includes(p.kind) && !(p.kind === 'car' && driving)) {
          for (const a of actors) {
            if (Math.abs(x - a.x) < 0.18) x = Math.max(0.08, Math.min(0.92, a.x + (a.x < 0.5 ? 0.28 : -0.28)));
          }
        }
        PropKit.draw(ctx, { ...p, x: x * W }, u, ground, local);
      }
    }
    for (const a of actors.filter(a => a.pose === 'sit')) {
      PropKit.draw(ctx, { kind: 'chair', x: a.x * W }, u, ground, local);
    }
    const talkId = scene.say || actors[0]?.id;
    const talk = Stage.mouth(scene, local);
    // Talking with the hands: the speaker gestures on the first word of each sentence and on
    // long, important words, timed to the voice, then relaxes back.
    {
      const sp = actors.find(a => a.id === talkId);
      if (sp && sp.pose === 'idle') {
        const vt = local - (scene.voiceOffset || 0);
        const ws = scene.words || [];
        const moves = ['present', 'point', 'shrug', 'present'];
        let n = 0;
        for (let k = 0; k < ws.length; k++) {
          const w = ws[k];
          const first = k === 0 || /[.!?]["')]?$/.test(ws[k - 1].text);
          const big = w.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 8;
          if (!first && !big) continue;
          n++;
          if (vt >= w.start - 0.05 && vt < w.start + 0.75) { sp.pose = moves[n % moves.length]; sp.poseT = vt - w.start; break; }
        }
      }
    }
    for (const a of actors) {
      const look = cast.get(a.id) || {};
      Cast.draw(ctx, {
        x: a.x * W,
        ground,
        u,
        pose: a.pose,
        poseT: a.poseT,
        feel: a.feel,
        face: a.face,
        talk: a.id === talkId ? talk : 0,
        t: local + (look.name || '').length,
        phase: (look.name || '').length,
        color: look.color,
        hat: look.hat,
        hair: look.hair,
        costume: look.costume,
        hold: a.hold,
      }, a.pose === 'drive' ? 'body' : 'all');
    }
    if (driving) {
      for (const p of props) {
        // A ridden vehicle is drawn big enough to sit in.
        if (p === vehicle) PropKit.draw(ctx, { ...p, x: p.x * W }, u * 1.75, ground, local);
        else if (p.kind === 'car' && !vehicle) PropKit.draw(ctx, { ...p, x: p.x * W }, u, ground, local);
      }
    }
    if (carried) {
      // Held overhead, bobbing with the carrier's steps.
      const bob = Math.abs(Math.sin(local * 6)) * 0.25;
      const tall = ['tophat', 'chef', 'crown', 'helmet'].includes(cast.get(ua.id)?.hat);
      PropKit.draw(ctx, { ...carried, x: ua.x * W, y: (tall ? 10.9 : 9.8) + bob }, u * 0.8, ground, local);
    }
    if (driving) {
      for (const a of actors.filter(x => x.pose === 'drive')) {
        const look = cast.get(a.id) || {};
        Cast.draw(ctx, {
          x: a.x * W, ground, u, pose: 'drive', poseT: a.poseT, feel: a.feel, face: a.face,
          talk: a.id === talkId ? talk : 0, t: local, phase: 1,
          color: look.color, hat: look.hat, hair: look.hair, costume: look.costume, hold: '',
        }, 'head');
      }
    }
    const fly = Stage.flying(scene, local);
    if (fly) {
      const from = actors.find(a => a.id === fly.from);
      const to = actors.find(a => a.id === fly.to);
      if (from && to) {
        const x = Ink.lerp(from.x, to.x, fly.p) * W;
        const y = ground - u * 2.3;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.3, 1.3);
        PropMiniDraw(ctx, fly.kind);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  static sun(ctx, prop, W, u, H, t) {
    const y = prop.y != null ? prop.y * H : H * 0.16;
    ctx.save();
    ctx.translate(prop.x * W, y);
    const s = u;
    ctx.strokeStyle = '#F2C230';
    ctx.lineWidth = 0.1 * s;
    for (let i = 0; i < 10; i++) {
      const a = t * 0.5 + i * Math.PI / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.55 * s, Math.sin(a) * 0.55 * s);
      ctx.lineTo(Math.cos(a) * 0.95 * s, Math.sin(a) * 0.95 * s);
      ctx.stroke();
    }
    Ink.oval(ctx, 0, 0, 0.42, 0.42, '#F2C230', s, 0.1);
    ctx.restore();
  }

  static actors(scene, local, cast) {
    const rows = (scene.who || []).map(w => ({ ...Stage.sampleActor(w, scene.acts, local, scene.dur) }));
    rows.sort((a, b) => a.x - b.x);
    // Heads are wide. If the script parks two actors on the same spot, push them apart
    // so they don't draw through each other.
    const gap = 0.3;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].x - rows[i - 1].x < gap) rows[i].x = rows[i - 1].x + gap;
    }
    if (rows.length && rows[rows.length - 1].x > 0.84) {
      const shift = rows[rows.length - 1].x - 0.84;
      for (const a of rows) a.x = Math.max(0.14, a.x - shift);
    }
    void cast;
    return rows;
  }

  static sampleActor(who, acts, local, dur) {
    let x = who.x ?? 0.5;
    let pose = who.pose || 'idle';
    let feel = who.feel || 'neutral';
    let face = who.face === -1 ? -1 : 1;
    let hold = who.hold || '';
    let poseT = local;
    const mine = (acts || []).filter(a => a.id === who.id).sort((a, b) => a.t - b.t);
    for (let i = 0; i < mine.length; i++) {
      const a = mine[i];
      if (a.t > local) break;
      if (a.feel) feel = a.feel;
      if (a.face) face = a.face === -1 ? -1 : 1;
      if (a.hold) hold = a.hold;
      const motion = a.do === 'walk' || a.do === 'enter' || a.do === 'exit' || a.do === 'drive';
      if (motion) {
        const dest = a.do === 'exit' ? (a.x ?? (face > 0 ? 1.2 : -0.2)) : (a.x ?? x);
        const from = a.do === 'enter' ? (face > 0 ? -0.18 : 1.18) : x;
        const endT = Math.min(a.t + (a.dur || 1.15), mine[i + 1]?.t ?? dur);
        if (local >= endT) {
          x = dest;
          pose = a.do === 'drive' ? 'drive' : (who.pose && !['walk', 'enter', 'exit'].includes(who.pose) ? who.pose : 'idle');
          poseT = local - endT;
        }
        else {
          x = Ink.lerp(from, dest, Ink.smooth((local - a.t) / Math.max(0.2, endT - a.t)));
          pose = a.do === 'drive' ? 'drive' : 'walk';
          poseT = local - a.t;
          face = dest >= from ? 1 : -1;
        }
      } else if (a.do && a.do !== 'idle' && a.do !== 'turn') {
        const elapsed = local - a.t;
        const once = a.do === 'jump' || a.do === 'shock' || a.do === 'facepalm' || a.do === 'wave' || a.do === 'laugh';
        if (once && elapsed > 0.95) { pose = who.pose && who.pose !== a.do ? who.pose : 'idle'; poseT = elapsed - 0.95; }
        else { pose = a.do === 'give' ? 'give' : a.do; poseT = elapsed; }
        if (a.x != null) x = a.x;
      } else if (a.do === 'turn') {
        face = a.face || (face > 0 ? -1 : 1);
        poseT = local - a.t;
      }
    }
    return { id: who.id, x: Ink.clamp(x, -0.15, 1.15), pose, feel, face, hold, poseT };
  }

  static props(scene, local) {
    return (scene.props || []).map(p => {
      let x = p.x ?? 0.5;
      const id = p.id || p.kind;
      const mine = (scene.acts || []).filter(a => a.id === id && (a.do === 'drive' || a.do === 'move' || a.x != null)).sort((a, b) => a.t - b.t);
      for (const a of mine) {
        if (a.t > local) break;
        const from = x;
        const dest = a.x ?? x;
        const endT = a.t + (a.dur || 1.4);
        if (local >= endT) x = dest;
        else { x = Ink.lerp(from, dest, Ink.smooth((local - a.t) / Math.max(0.2, endT - a.t))); break; }
      }
      return { ...p, x };
    });
  }

  static flying(scene, local) {
    const gives = (scene.acts || []).filter(a => a.do === 'give' && a.hold && a.to).sort((a, b) => a.t - b.t);
    for (const g of gives) {
      const dur = 0.5;
      if (local >= g.t && local < g.t + dur) return { from: g.id, to: g.to, kind: g.hold, p: (local - g.t) / dur };
    }
    return null;
  }

  static mouth(scene, local) {
    const v = scene.voice;
    if (v?.env) {
      // Smoothed loudness of the real voice, read a hair early so the mouth leads the sound like real speech.
      const { env, rate } = v.env;
      const f = (local - (scene.voiceOffset || 0) + 0.03) * rate;
      if (f < 0 || f >= env.length - 1) return 0;
      const i = Math.floor(f), k = f - i;
      const x = env[i] * (1 - k) + env[i + 1] * k;
      return x < 0.08 ? 0 : Ink.clamp(Math.pow(x, 0.8) * 1.05, 0, 1);
    }
    if (v?.samples?.length) {
      const at = (local - (scene.voiceOffset || 0)) * v.sampleRate;
      if (at < 0 || at >= v.samples.length) return 0;
      const a0 = Math.max(0, at - v.sampleRate * 0.025);
      let s = 0, n = 0;
      for (let i = a0; i < at; i += 6) { s += v.samples[i | 0] ** 2; n++; }
      return Ink.clamp(Math.sqrt(s / (n || 1)) * 9, 0, 1);
    }
    const hit = (scene.words || []).some(w => local >= w.start && local < w.end);
    return hit ? 0.25 + 0.75 * Math.abs(Math.sin(local * 26)) : 0;
  }

  static chunks(words) {
    const out = [];
    const bare = (w) => String(w || '').replace(/[’‘]/g, "'").replace(/[—–-]/g, ' ').replace(/(\d)\.(?=\d)/g, '$1\u0001').replace(/(\d),(?=\d)/g, '$1\u0002').replace(/[^\p{L}\p{N}' \u0001\u0002]/gu, '').replace(/\u0001/g, '.').replace(/\u0002/g, ',').replace(/(^|\s)'+|'+(\s|$)/g, '$1$2').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < (words || []).length;) {
      const a = words[i];
      const b = words[i + 1];
      const short = (w) => bare(w.text).length > 0 && bare(w.text).length <= 7;
      if (b && short(a) && short(b)) {
        out.push({ text: `${bare(a.text)} ${bare(b.text)}`.toLowerCase(), start: a.start, end: b.end });
        i += 2;
      } else {
        const text = bare(a.text).toLowerCase();
        if (text) out.push({ text, start: a.start, end: a.end });
        i += 1;
      }
    }
    return out;
  }

  static caption(ctx, W, H, scene, local) {
    const chunks = Stage.chunks(scene.words);
    const c = chunks.find(w => local >= w.start && local <= w.end + 0.04);
    if (!c) return;
    const portrait = H >= W;
    let size = Math.round(W * (portrait ? 0.095 : 0.052));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const fit = () => { ctx.font = `900 ${size}px Montserrat, Arial, sans-serif`; };
    fit();
    while (ctx.measureText(c.text).width > W * 0.9 && size > 28) { size -= 2; fit(); }
    const age = local - c.start;
    const pop = age < 0.14 ? Ink.back(age / 0.14) : 1;
    const y = H * (portrait ? 0.9 : 0.86);
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(pop, pop);
    ctx.lineWidth = Math.max(8, size * 0.2);
    ctx.strokeStyle = '#141414';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }

  static speedLines(ctx, W, H, k) {
    ctx.save();
    ctx.strokeStyle = `rgba(20,20,20,${0.28 * k})`;
    ctx.lineWidth = Math.max(3, W * 0.008);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const y = H * (0.18 + i * 0.12);
      const span = W * (0.18 + (i % 3) * 0.08) * k;
      ctx.beginPath();
      ctx.moveTo(W * 0.12, y);
      ctx.lineTo(W * 0.12 + span, y);
      ctx.moveTo(W * 0.88 - span, y + 18);
      ctx.lineTo(W * 0.88, y + 18);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function PropMiniDraw(ctx, kind) {
  ctx.lineWidth = 6;
  ctx.strokeStyle = Ink.INK;
  ctx.lineJoin = 'round';
  if (kind === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-22, -8, -8, -22, 0, -8);
    ctx.bezierCurveTo(8, -22, 22, -8, 0, 10);
    ctx.fillStyle = '#E85D4C';
    ctx.fill(); ctx.stroke();
  } else if (kind === 'money' || kind === 'coin') {
    Ink.rrect(ctx, -22, -14, 44, 28, 4);
    ctx.fillStyle = '#3E9A45'; ctx.fill(); ctx.stroke();
  } else if (kind === 'ticket') {
    Ink.rrect(ctx, -22, -14, 48, 28, 4);
    ctx.fillStyle = '#F2C230'; ctx.fill(); ctx.stroke();
  } else {
    Ink.oval(ctx, 0, 0, 14, 14, '#F2C230', 1, 5);
  }
}
