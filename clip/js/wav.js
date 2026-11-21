// Read the 16-bit WAV that ffmpeg writes, without the browser's decoder (which fails on some files).
// Tolerates a streamed header (data size 0 or -1). Returns planar Float32 channels.
export function parseWav(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
  let o = 12, channels = 2, sampleRate = 48000, bits = 16, dataAt = -1, dataLen = 0;
  while (o + 8 <= bytes.length) {
    const id = tag(o), size = dv.getUint32(o + 4, true);
    if (id === 'fmt ') { channels = dv.getUint16(o + 10, true); sampleRate = dv.getUint32(o + 12, true); bits = dv.getUint16(o + 22, true); }
    if (id === 'data') { dataAt = o + 8; dataLen = (size === 0 || size === 0xFFFFFFFF || dataAt + size > bytes.length) ? bytes.length - dataAt : size; break; }
    o += 8 + size + (size & 1);
  }
  if (dataAt < 0 || bits !== 16) throw new Error('Unsupported WAV');
  const frames = Math.floor(dataLen / (2 * channels));
  const out = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let i = 0, p = dataAt; i < frames; i++) for (let c = 0; c < channels; c++, p += 2) out[c][i] = dv.getInt16(p, true) / 32768;
  return { sampleRate, channels: out };
}
