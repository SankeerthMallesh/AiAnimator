// MP4 export. Uses WebCodecs (hardware video encoding, faster than real time) + mp4-muxer.
// Falls back to real-time MediaRecorder on browsers without WebCodecs.

import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.mjs';

const VIDEO_CODECS = [
  ['avc', 'avc1.640034'], ['avc', 'avc1.64002A'], ['avc', 'avc1.640028'], ['avc', 'avc1.4D0034'],
  ['avc', 'avc1.42003E'], ['avc', 'avc1.42001F'],
  ['vp9', 'vp09.00.40.08'], ['av1', 'av01.0.08M.08'],
];

async function pickVideoConfig(width, height, fps) {
  // ~10.5 Mbps at 1080x1920@30, capped at 14 Mbps for 60 fps: clean edges on flat cartoon colours.
  const bitrate = Math.min(14_000_000, Math.round(width * height * fps * 0.17));
  for (const accel of ['prefer-hardware', 'no-preference']) {
    for (const [mux, codec] of VIDEO_CODECS) {
      const config = { codec, width, height, bitrate, framerate: fps, hardwareAcceleration: accel, latencyMode: 'quality' };
      if (mux === 'avc') config.avc = { format: 'avc' };
      try {
        const r = await VideoEncoder.isConfigSupported(config);
        if (r.supported) return { mux, config: r.config || config };
      } catch { /* try next */ }
    }
  }
  return null;
}

async function pickAudioConfig(sampleRate, channels) {
  for (const [mux, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const config = { codec, sampleRate, numberOfChannels: channels, bitrate: 192000 };
    try {
      const r = await AudioEncoder.isConfigSupported(config);
      if (r.supported) return { mux, config: r.config || config };
    } catch { /* try next */ }
  }
  return null;
}

export function canFastExport() {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

export async function exportVideo({ renderer, audio, fps, onProgress, signal }) {
  if (canFastExport()) {
    const v = await pickVideoConfig(renderer.W, renderer.H, fps);
    const a = await pickAudioConfig(audio.sampleRate, audio.numberOfChannels);
    if (v && a) return exportWebCodecs({ renderer, audio, fps, onProgress, signal, v, a });
  }
  return exportRealtime({ renderer, audio, fps, onProgress, signal });
}

async function exportWebCodecs({ renderer, audio, fps, onProgress, signal, v, a }) {
  const { W, H, canvas } = renderer;
  const duration = audio.duration;
  const totalFrames = Math.ceil(duration * fps);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: v.mux, width: W, height: H, frameRate: fps },
    audio: { codec: a.mux, sampleRate: audio.sampleRate, numberOfChannels: audio.numberOfChannels },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let failure = null;
  const venc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { failure = e; },
  });
  venc.configure(v.config);
  const aenc = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => { failure = e; },
  });
  aenc.configure(a.config);

  // Audio first (fast): planar float32 chunks of ~0.5 s.
  const ch = audio.numberOfChannels, sr = audio.sampleRate;
  const block = Math.floor(sr / 2);
  const channels = Array.from({ length: ch }, (_, c) => audio.getChannelData(c));
  for (let off = 0; off < audio.length; off += block) {
    const n = Math.min(block, audio.length - off);
    const data = new Float32Array(n * ch);
    for (let c = 0; c < ch; c++) data.set(channels[c].subarray(off, off + n), c * n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(off / sr * 1e6), data });
    aenc.encode(ad);
    ad.close();
  }

  const started = performance.now();
  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) { venc.close(); aenc.close(); throw new DOMException('Cancelled', 'AbortError'); }
    if (failure) throw failure;
    if (renderer.prepareFrame) await renderer.prepareFrame(f / fps);
    renderer.drawFrame(f / fps);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    venc.encode(frame, { keyFrame: f % (fps * 2) === 0 });
    frame.close();
    // Back-pressure: keep the encoder queue short so memory stays low on small laptops.
    while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
    if (f % 6 === 0) {
      const el = (performance.now() - started) / 1000;
      onProgress?.({ frame: f, total: totalFrames, eta: f ? el / f * (totalFrames - f) : null });
      await new Promise(r => setTimeout(r, 0));
    }
  }
  await venc.flush();
  await aenc.flush();
  if (failure) throw failure;
  muxer.finalize();
  venc.close(); aenc.close();
  onProgress?.({ frame: totalFrames, total: totalFrames, eta: 0 });
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4', codec: `${v.config.codec} + ${a.config.codec}` };
}

async function exportRealtime({ renderer, audio, fps, onProgress, signal }) {
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const mimeType = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error('This browser cannot export video. Please use Chrome, Edge or Firefox.');
  const ctx = new AudioContext({ sampleRate: audio.sampleRate });
  const dest = ctx.createMediaStreamDestination();
  const src = ctx.createBufferSource();
  src.buffer = audio;
  src.connect(dest);
  const stream = renderer.canvas.captureStream(fps);
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 9_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise(r => (rec.onstop = r));
  renderer.drawFrame(0);
  rec.start(500);
  const t0 = ctx.currentTime + 0.05;
  src.start(t0);
  await new Promise((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) { rec.stop(); src.stop(); reject(new DOMException('Cancelled', 'AbortError')); return; }
      const t = ctx.currentTime - t0;
      if (t >= audio.duration) { resolve(); return; }
      renderer.drawFrame(Math.max(0, t));
      onProgress?.({ frame: Math.floor(t * fps), total: Math.ceil(audio.duration * fps), eta: audio.duration - t, realtime: true });
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  await done;
  ctx.close();
  const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), ext, codec: mimeType };
}
