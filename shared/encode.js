// MP4 writing for any size: picks a video and audio codec the browser can encode (H.264 first,
// then VP9 or AV1; AAC first, then Opus), and muxes them with mp4-muxer.

import { Muxer, ArrayBufferTarget } from '../vendor/mp4-muxer.mjs';

export function canEncode() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

export async function videoConfig(width, height, fps, bitrate = 10_000_000) {
  for (const accel of ['prefer-hardware', 'no-preference']) {
    for (const [mux, codec] of [['avc', 'avc1.640034'], ['avc', 'avc1.640028'], ['avc', 'avc1.4D0034'], ['avc', 'avc1.42003E'], ['vp9', 'vp09.00.40.08'], ['av1', 'av01.0.08M.08']]) {
      const config = { codec, width, height, bitrate, framerate: fps, hardwareAcceleration: accel, latencyMode: 'quality' };
      if (mux === 'avc') config.avc = { format: 'avc' };
      try { const r = await VideoEncoder.isConfigSupported(config); if (r.supported) return { mux, config: r.config || config }; } catch { /* next */ }
    }
  }
  return null;
}

export async function audioConfig(sampleRate, ch) {
  for (const [mux, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const config = { codec, sampleRate, numberOfChannels: ch, bitrate: 160000 };
    try { const r = await AudioEncoder.isConfigSupported(config); if (r.supported) return { mux, config: r.config || config }; } catch { /* next */ }
  }
  return null;
}

// An encoder for one MP4: addFrame(canvas or VideoFrame, seconds) as often as needed, then finish() -> Blob.
// The audio (an AudioBuffer) is encoded up front.
export async function mp4Writer({ width, height, fps = 30, audio, bitrate }) {
  const v = await videoConfig(width, height, fps, bitrate);
  const a = audio ? await audioConfig(audio.sampleRate, audio.numberOfChannels) : null;
  if (!v || (audio && !a)) throw new Error('This browser cannot make MP4 files. Please use Chrome or Edge on a computer.');
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: v.mux, width, height, frameRate: fps },
    ...(a ? { audio: { codec: a.mux, sampleRate: audio.sampleRate, numberOfChannels: audio.numberOfChannels } } : {}),
    fastStart: 'in-memory', firstTimestampBehavior: 'offset',
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failure = e; } });
  venc.configure(v.config);
  let aenc = null;
  if (a) {
    aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failure = e; } });
    aenc.configure(a.config);
    const ch = audio.numberOfChannels, sr = audio.sampleRate, block = Math.floor(sr / 2);
    const chans = Array.from({ length: ch }, (_, c) => audio.getChannelData(c));
    for (let off = 0; off < audio.length; off += block) {
      const n = Math.min(block, audio.length - off);
      const data = new Float32Array(n * ch);
      for (let c = 0; c < ch; c++) data.set(chans[c].subarray(off, off + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(off / sr * 1e6), data });
      aenc.encode(ad); ad.close();
    }
  }
  let lastTs = -1, frames = 0;
  return {
    get frames() { return frames; },
    get failure() { return failure; },
    async addFrame(canvas, seconds) {
      if (failure) throw failure;
      const ts = Math.max(lastTs + 1000, Math.round(seconds * 1e6));
      const frame = new VideoFrame(canvas, { timestamp: ts, duration: Math.round(1e6 / fps) });
      venc.encode(frame, { keyFrame: frames % (fps * 2) === 0 });
      frame.close();
      lastTs = ts; frames++;
      // Keep the encoder's queue short so memory stays flat on long videos.
      if (venc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 0));
    },
    async finish() {
      await venc.flush(); if (aenc) await aenc.flush();
      if (failure) throw failure;
      muxer.finalize();
      venc.close(); aenc?.close();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    },
  };
}
