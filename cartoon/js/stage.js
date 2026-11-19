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

function talkIdFor(scene, actors) { return scene.say || actors[0]?.id; }

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
    if (scene.index === 0 && view.settings?.hookTitle !== false) Stage.hook(ctx, W, H, view.script, local);
  }

  static still(canvas, script, scene, plate, localT = 0.8, opts = {}) {
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
      plates: new Map(plate ? [[scene.id, plate.bitmap ? plate : { bitmap: plate }]] : []),
      settings: { captionStyle: opts.captions === false ? 'off' : 'word', hookTitle: false },
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

  // Shot size for a scene, like an animator would cut it: an establishing wide shot first, then
  // mostly medium shots on whoever is talking (heads about half the frame wide), with a wide
  // two-shot every third scene and whenever someone rides, pushes or carries something.
  static framing(scene, actors, W, H, u, ground) {
    const wide = { z: 1, tx: W / 2, ty: ground, sx: W / 2, sy: ground, medium: false };
    const sp = actors.find(a => a.id === scene.say) || actors[0];
    // Questions and exclamations get a close-up on the speaker's face, like a punchline.
    const punch = /[!?]["')]?\s*$/.test(String(scene.narration || '').trim());
    const size = scene.frame || (scene.index === 0 || scene.use || !sp ? 'wide' : punch ? 'close' : scene.index % 3 === 2 ? 'wide' : 'medium');
    if ((size !== 'medium' && size !== 'close') || !sp) return wide;
    const portrait = H >= W;
    if (size === 'close') {
      const z = portrait ? 2.05 : 1.7;
      const tx = Ink.clamp(sp.x * W, W * 0.25, W * 0.75);
      return { z, tx, ty: ground - u * 5.1, sx: W / 2, sy: H * (portrait ? 0.46 : 0.5), medium: true, close: true, sp, dir: sp.x < 0.5 ? 1 : -1 };
    }
    const z = portrait ? 1.55 : 1.3;
    const tx = Ink.clamp(Ink.lerp(W / 2, sp.x * W, 0.85), W * 0.3, W * 0.7);
    return { z, tx, ty: ground - u * 4.2, sx: W / 2, sy: H * (portrait ? 0.5 : 0.52), medium: true, sp, dir: sp.x < 0.5 ? 1 : -1 };
  }

  static world(ctx, W, H, view, scene, local, shot) {
    const clipEntry = view.plates?.get(scene.id);
    if (clipEntry?.clip) { Stage.clip(ctx, W, H, clipEntry.clip, local, shot); return; }
    const u = Cast.unit(H);
    const ground = H * (W < H ? 0.78 : 0.84);
    const cast = new Map((view.script?.cast || []).map(c => [c.id, c]));
    const actors = Stage.actors(scene, local, cast);
    let props = Stage.props(scene, local);
    const pe = view.plates?.get(scene.id);
    const photo = !!pe?.photo;
    // With a real picture on screen, the picture is the visual: wide shot, no floating props.
    const fr = photo ? Stage.framing({ ...scene, frame: 'wide' }, actors, W, H, u, ground) : Stage.framing(scene, actors, W, H, u, ground);
    if (photo) props = props.filter(p => !(p.kind === 'icon' || PropKit.TOONS.includes(p.kind)));
    // In the opening shot the hook title owns the top of the frame; floating props pop in after it.
    if (scene.index === 0 && view.settings?.hookTitle !== false && (view.script?.youtubeTitle || view.script?.title)) {
      props = props.map(p => ((p.kind === 'icon' || PropKit.TOONS.includes(p.kind)) ? { ...p, delay: 2.6 } : p));
    }
    if (fr.medium) {
      // In a close shot the floating sticker sits above the speaker's head, toward the open side.
      props = props.map(p => ((p.kind === 'icon' || PropKit.TOONS.includes(p.kind)) && (p.y == null || p.small)
        ? (fr.close
          ? { ...p, x: fr.sp.x, y: 7.6, small: true, scale: 0.42 }
          : { ...p, x: Ink.clamp(fr.sp.x + fr.dir * 0.17, 0.14, 0.86), y: 7.7, small: true, scale: 0.68 }) : p));
    }
    ctx.save();
    ctx.translate(fr.sx, fr.sy);
    ctx.rotate(shot.rot);
    ctx.scale(shot.z * fr.z, shot.z * fr.z);
    ctx.translate(-fr.tx + shot.panX * W * 0.18, -fr.ty + shot.panY);
    // Orbit and walk-and-talk: the background moves on its own layer behind the cast.
    const mv = photo || fr.close ? null : Stage.motion(scene);
    let bgX = 0;
    if (mv) {
      const dur = Math.max(0.6, scene.dur || 3);
      const p = Ink.clamp(local / dur, 0, 1);
      const rich = SetKit.RICH?.includes(scene.set);
      const reach = W * (pe?.scene || rich ? 0.13 : 0.3);
      const dir = (scene.index || 0) % 4 < 2 ? 1 : -1;
      if (mv === 'walk') bgX = dir * reach * (0.5 - p) * 2;
      else bgX = dir * reach * Math.cos(Ink.smooth(p) * Math.PI);
    }
    ctx.save();
    ctx.translate(bgX, 0);
    if (mv && !pe?.scene && SetKit.RICH?.includes(scene.set)) {
      // Detailed sets end at the frame edge: enlarge them a little while they move.
      ctx.translate(W / 2, ground); ctx.scale(1.3, 1.3); ctx.translate(-W / 2, -ground);
    }
    SetKit.draw(ctx, W, H, scene.set, scene.start + local, pe?.bitmap || null, { flip: !!pe?.flip, scene: !!pe?.scene || photo, blur: photo, vx: pe?.vx || 0, vz: pe?.vz || 1, tint: pe?.tint || null });
    ctx.restore();
    if (mv) Stage.applyMotion(mv, actors, scene, local, talkIdFor(scene, actors), bgX, W);
    if (photo) {
      // The picture itself as a framed card at the top, steady on screen while the camera moves.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      SetKit.photoCard(ctx, W, H, pe.bitmap, local, scene.dur, pe.vx || 0, pe.vz || 1);
      ctx.restore();
    }
    // Interaction for this scene: who is using which prop, and how.
    const use = scene.use || null;
    const ua = use ? actors.find(a => a.id === use.who) : null;
    const up = use ? props.find(p => (p.id || p.kind) === use.prop) : null;
    if (ua && up && use.how === 'ride') { ua.pose = 'drive'; up.x = ua.x; }
    if (ua && up && use.how === 'ride') {
      // A vehicle shot belongs to its driver, like the references: anyone standing where the
      // vehicle is drawn leaves the shot instead of poking out from behind it.
      for (let k = actors.length - 1; k >= 0; k--) {
        if (actors[k] !== ua && Math.abs(actors[k].x - up.x) < 0.62) actors.splice(k, 1);
      }
    }
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
        if (['tree', 'house', 'car', 'train', 'planet', 'boat'].includes(p.kind) && !(p.kind === 'car' && driving)) {
          // Big ground props never stand in front of someone: they move to the open side of the frame.
          const reach = ['car', 'train', 'boat'].includes(p.kind) ? 0.3 : 0.18;
          if (actors.some(a => Math.abs(x - a.x) < reach)) {
            const spots = [0.06, 0.94, 0.5, 0.2, 0.8].filter(v => actors.every(a => Math.abs(v - a.x) >= reach));
            x = spots.length ? spots[0] : (actors.reduce((n, a) => n + a.x, 0) / actors.length < 0.5 ? 0.97 : 0.03);
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
    Stage.gagSetup(actors, talkId, scene, local);
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
    for (const a of actors) if (a.gag) Stage.gagDraw(ctx, a, W, u, ground, local);
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

  // Which scenes move: every third scene the cast walks and talks through the place, and every
  // third scene the camera swings around the speaker. Vehicle and prop scenes stay put.
  // An imported clip fills the frame for its shot; it already has its own characters and motion.
  static clip(ctx, W, H, clip, local, shot) {
    const n = clip.frames.length;
    if (!n) return;
    const img = clip.frames[Math.floor(local * clip.fps) % n];
    const sc = Math.max(W / img.width, H / img.height) * (shot?.z ? Math.min(1.08, shot.z) : 1);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
    ctx.restore();
  }

  static motion(scene) {
    if (scene.use || scene.motion === 'none') return null;
    if (scene.motion) return scene.motion;
    const k = (scene.index || 0) % 3;
    return k === 1 ? 'walk' : k === 2 ? 'orbit' : null;
  }

  static applyMotion(mv, actors, scene, local, talkId, bgX, W) {
    const dur = Math.max(0.6, scene.dur || 3);
    const p = Ink.clamp(local / dur, 0, 1);
    if (mv === 'walk') {
      // Everyone walks together in the direction the scenery suggests, without leaving the frame.
      const face = bgX >= 0 ? -1 : 1;
      for (const a of actors) {
        if (['sit', 'drive', 'give', 'jump'].includes(a.pose)) continue;
        a.pose = 'walk';
        a.face = face;
        a.walkInPlace = true;
      }
    } else {
      // Orbit: the speaker turns to the other side as the camera swings past, with a little
      // counter-motion on the cast for depth.
      const sp = actors.find(a => a.id === talkId) || actors[0];
      for (const a of actors) a.x += -bgX / W * 0.18;
      if (sp) {
        sp.face = p < 0.5 ? 1 : -1;
        if (Math.abs(p - 0.5) < 0.07) { sp.pose = 'turn'; sp.poseT = (p - 0.43) * dur; }
      }
    }
  }

  // Background gags: while one character talks, the others do quirky things, like the side jokes
  // in the reference Shorts. Each listener gets one gag per scene, picked by scene and character.
  static GAGS = ['zzz', 'coffee', 'fly', 'juggle', 'phone', 'popcorn', 'sneeze', 'balloon'];
  static gagSetup(actors, talkId, scene, local) {
    if (actors.length < 2) return;
    actors.forEach((a, i) => {
      if (a.id === talkId || a.hold || ['walk', 'enter', 'exit', 'drive', 'sit', 'give', 'jump'].includes(a.pose)) return;
      a.pose = 'idle';
      const k = ((scene.index || 0) * 3 + i * 5 + (scene.id || '').length) % (Stage.GAGS.length + 1);
      if (k === Stage.GAGS.length) return; // now and then, no gag, so it never feels like a loop
      const gag = Stage.GAGS[k];
      a.gag = gag;
      const cyc = (local + i * 0.9) % 3.2;
      if (gag === 'zzz') a.feel = 'happy';
      else if (gag === 'juggle') a.pose = 'cheer';
      else if (gag === 'fly' && cyc > 2.4 && cyc < 2.9) { a.pose = 'wave'; a.poseT = cyc - 2.4; }
      else if (gag === 'sneeze') {
        if (cyc > 1.6 && cyc < 2.3) { a.pose = 'think'; a.feel = 'shocked'; }
        else if (cyc >= 2.3 && cyc < 2.9) { a.pose = 'shock'; a.poseT = cyc - 2.3; }
      } else if (gag === 'balloon' || gag === 'phone' || gag === 'coffee' || gag === 'popcorn') a.pose = 'idle';
      a.gagT = local + i * 0.9;
    });
  }

  static gagDraw(ctx, a, W, u, ground, t) {
    const x = a.x * W, f = a.face === -1 ? -1 : 1;
    const hx = x, hy = ground - 4.72 * u;      // head centre
    const handX = x + f * 1.45 * u, handY = ground - 3.0 * u;
    const T = a.gagT ?? t;
    const cyc = T % 3.2;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const ink = (w = 0.12) => { ctx.strokeStyle = Ink.INK; ctx.lineWidth = w * u; };
    switch (a.gag) {
      case 'zzz': {
        ctx.font = `900 ${u * 0.9}px Montserrat, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let k = 0; k < 3; k++) {
          const p = ((T * 0.45 + k / 3) % 1);
          const zx = hx + f * (0.9 + p * 1.6) * u + Math.sin(p * 6) * 0.2 * u;
          const zy = hy - (1.2 + p * 2.4) * u;
          ctx.globalAlpha = Math.sin(p * Math.PI);
          ctx.lineWidth = u * 0.16; ctx.strokeStyle = '#FFFFFF';
          ctx.save(); ctx.translate(zx, zy); ctx.scale(0.6 + p * 0.7, 0.6 + p * 0.7);
          ctx.strokeText('Z', 0, 0); ctx.fillStyle = '#3E6FE0'; ctx.fillText('Z', 0, 0); ctx.restore();
        }
        break;
      }
      case 'coffee': {
        const sip = cyc > 2.2 && cyc < 3.0 ? Math.sin(((cyc - 2.2) / 0.8) * Math.PI) : 0;
        const mx = Ink.lerp(handX, hx + f * 0.95 * u, sip), my = Ink.lerp(handY, hy + 0.35 * u, sip);
        ctx.translate(mx, my);
        ink(0.11);
        ctx.fillStyle = '#E85D4C';
        ctx.beginPath(); ctx.roundRect(-0.42 * u, -0.5 * u, 0.84 * u, 0.95 * u, 0.12 * u); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(f * 0.52 * u, 0, 0.22 * u, -Math.PI / 2, Math.PI / 2, f < 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.09 * u;
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          for (let q = 0; q <= 10; q++) {
            const yy = -0.7 * u - q * 0.09 * u, xx = (k - 0.5) * 0.3 * u + Math.sin(q * 0.8 + T * 4 + k) * 0.1 * u;
            q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
        break;
      }
      case 'fly': {
        const fx = hx + Math.sin(T * 5.3) * 1.5 * u, fy = hy - 0.6 * u + Math.sin(T * 8.1) * 0.9 * u;
        ctx.strokeStyle = 'rgba(30,30,30,0.35)'; ctx.lineWidth = 0.05 * u; ctx.setLineDash([0.12 * u, 0.12 * u]);
        ctx.beginPath();
        for (let q = 0; q < 14; q++) { const tt = T - q * 0.03; const xx = hx + Math.sin(tt * 5.3) * 1.5 * u, yy = hy - 0.6 * u + Math.sin(tt * 8.1) * 0.9 * u; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(210,235,255,0.9)';
        const wing = Math.abs(Math.sin(T * 60)) * 0.22 * u + 0.08 * u;
        ctx.beginPath(); ctx.ellipse(fx - 0.12 * u, fy - 0.16 * u, wing, 0.12 * u, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(fx + 0.12 * u, fy - 0.16 * u, wing, 0.12 * u, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = Ink.INK; ctx.beginPath(); ctx.arc(fx, fy, 0.14 * u, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'juggle': {
        const cols = ['#E85D4C', '#F2C230', '#3E8FE0'];
        for (let k = 0; k < 3; k++) {
          const p = (T * 1.1 + k / 3) % 1;
          const side = Math.floor((T * 1.1 + k / 3) % 2) ? 1 : -1;
          const bx = x + side * (1 - 2 * p) * 1.1 * u, by = hy - 1.6 * u - Math.sin(p * Math.PI) * 2.0 * u;
          ink(0.08); ctx.fillStyle = cols[k];
          ctx.beginPath(); ctx.arc(bx, by, 0.3 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case 'phone': {
        ctx.translate(x + f * 0.95 * u, hy + 1.35 * u);
        ctx.rotate(f * -0.25);
        ink(0.09); ctx.fillStyle = '#26262B';
        ctx.beginPath(); ctx.roundRect(-0.3 * u, -0.55 * u, 0.6 * u, 1.05 * u, 0.1 * u); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `hsl(${(T * 80) % 360}, 80%, 65%)`;
        ctx.fillRect(-0.22 * u, -0.45 * u, 0.44 * u, 0.82 * u);
        ctx.font = `${u * 0.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center';
        for (let k = 0; k < 2; k++) {
          const p = (T * 0.7 + k / 2) % 1;
          ctx.globalAlpha = Math.sin(p * Math.PI);
          ctx.fillText(k ? '❤️' : '😂', f * 0.4 * u, -0.9 * u - p * 1.8 * u);
        }
        break;
      }
      case 'popcorn': {
        ctx.translate(handX, handY);
        ink(0.1);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(-0.5 * u, -0.6 * u); ctx.lineTo(0.5 * u, -0.6 * u); ctx.lineTo(0.38 * u, 0.55 * u); ctx.lineTo(-0.38 * u, 0.55 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#E85D4C'; ctx.lineWidth = 0.12 * u;
        for (const sx of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(sx * u, -0.5 * u); ctx.lineTo(sx * 0.8 * u, 0.45 * u); ctx.stroke(); }
        ctx.fillStyle = '#FFF4C4'; ink(0.05);
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc((k - 2) * 0.2 * u, -0.7 * u - (k % 2) * 0.12 * u, 0.16 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        const p = (T * 0.9) % 1;
        if (p < 0.6) {
          const kx = Math.sin(p * 5) * 0.4 * u, ky = -0.8 * u - Math.sin((p / 0.6) * Math.PI) * 1.4 * u;
          ctx.beginPath(); ctx.arc(kx, ky, 0.15 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case 'sneeze': {
        if (cyc >= 2.3 && cyc < 3.1) {
          const p = (cyc - 2.3) / 0.8;
          ctx.translate(hx + f * 2.1 * u, hy - 1.0 * u);
          ctx.rotate(f * -0.12);
          ctx.scale(0.7 + p * 0.5, 0.7 + p * 0.5);
          ctx.globalAlpha = 1 - Math.max(0, p - 0.7) / 0.3;
          ctx.font = `900 ${u * 0.95}px Montserrat, Arial, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = u * 0.22; ctx.strokeStyle = '#FFFFFF';
          ctx.strokeText('ACHOO!', 0, 0); ctx.fillStyle = '#E85D4C'; ctx.fillText('ACHOO!', 0, 0);
          ctx.fillStyle = 'rgba(190,230,255,0.9)';
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-f * (1.2 + k * 0.25) * u, (k - 2) * 0.25 * u + p * 0.3 * u, 0.1 * u, 0, Math.PI * 2); ctx.fill(); }
        } else if (cyc > 1.6 && cyc < 2.3) {
          ctx.font = `900 ${u * 0.6}px Montserrat, Arial, sans-serif`;
          ctx.textAlign = 'center'; ctx.lineWidth = u * 0.14; ctx.strokeStyle = '#FFFFFF';
          const txt = cyc < 1.95 ? 'ah…' : 'ah-ah…';
          ctx.strokeText(txt, hx + f * 1.7 * u, hy - 1.4 * u); ctx.fillStyle = Ink.INK; ctx.fillText(txt, hx + f * 1.7 * u, hy - 1.4 * u);
        }
        break;
      }
      case 'balloon': {
        const bx = handX + f * 0.6 * u + Math.sin(T * 1.3) * 0.35 * u, by = hy - 2.8 * u + Math.sin(T * 1.9) * 0.25 * u;
        ctx.strokeStyle = Ink.INK; ctx.lineWidth = 0.05 * u;
        ctx.beginPath(); ctx.moveTo(handX, handY); ctx.quadraticCurveTo(handX + f * 0.8 * u, (handY + by) / 2, bx, by + 1.05 * u); ctx.stroke();
        ink(0.1); ctx.fillStyle = '#E85D4C';
        ctx.beginPath(); ctx.ellipse(bx, by, 0.85 * u, 1.05 * u, Math.sin(T * 1.3) * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(bx - 0.3 * u, by - 0.4 * u, 0.16 * u, 0.28 * u, -0.4, 0, Math.PI * 2); ctx.fill();
        break;
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

  // The hook: the video's title, big at the top for the first seconds, like popular Shorts.
  static hook(ctx, W, H, script, local) {
    const text = String(script?.youtubeTitle || script?.title || '').replace(/\s+/g, ' ').trim();
    if (!text || local > 2.7) return;
    const portrait = H >= W;
    const k = Math.min(1, local / 0.22);
    const out = Math.min(1, Math.max(0, (2.7 - local) / 0.3));
    let size = Math.round(W * (portrait ? 0.082 : 0.05));
    const maxW = W * 0.86;
    const font = () => `900 ${size}px Montserrat, Arial, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    // Wrap into at most three lines, shrinking if needed.
    let lines = [];
    for (let tries = 0; tries < 6; tries++) {
      ctx.font = font();
      lines = [];
      let cur = '';
      for (const w of text.split(' ')) {
        const next = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
      }
      if (cur) lines.push(cur);
      if (lines.length <= 3 && lines.every(l => ctx.measureText(l).width <= maxW)) break;
      size = Math.round(size * 0.86);
    }
    const lh = size * 1.12;
    const top = H * (portrait ? 0.1 : 0.09);
    ctx.save();
    ctx.globalAlpha = out;
    ctx.translate(W / 2, top + (lines.length * lh) / 2);
    const pop = 0.7 + 0.3 * Ink.back(k);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = font();
    lines.forEach((l, i) => {
      const y = (i - (lines.length - 1) / 2) * lh;
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06;
      ctx.lineWidth = size * 0.22; ctx.strokeStyle = '#111';
      ctx.strokeText(l, 0, y);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = i === lines.length - 1 ? '#FFD43B' : '#FFFFFF';
      ctx.fillText(l, 0, y);
    });
    ctx.restore();
  }

  static caption(ctx, W, H, scene, local) {
    const chunks = Stage.chunks(scene.words);
    const c = chunks.find(w => local >= w.start && local <= w.end + 0.04);
    if (!c) return;
    const portrait = H >= W;
    // Matched to the reference Shorts: medium-size white words at about 70% height.
    let size = Math.round(W * (portrait ? 0.074 : 0.046));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const fit = () => { ctx.font = `900 ${size}px Montserrat, Arial, sans-serif`; };
    fit();
    while (ctx.measureText(c.text).width > W * 0.9 && size > 28) { size -= 2; fit(); }
    const age = local - c.start;
    // Pop in from 80% with a small overshoot, never from nothing, so no frame shows a tiny word.
    const k = Math.min(1, Math.max(0, age / 0.16));
    const pop = 0.8 + 0.2 * Ink.back(k);
    const y = H * (portrait ? 0.7 : 0.8) + (1 - k) * size * 0.12;
    // Numbers get a yellow highlight; everything else stays white like the references.
    const hot = /\d/.test(c.text);
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(pop, pop);
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = size * 0.2;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(6, size * 0.2);
    ctx.strokeStyle = '#141414';
    ctx.strokeText(c.text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = hot ? '#FFD43B' : '#FFFFFF';
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
