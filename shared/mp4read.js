// 1.1: reads the video track of an MP4 (a Blob) so WebCodecs can decode it: the decoder config and
// every sample's place, time and keyframe flag. Enough for the MP4s Loomy makes (H.264, VP9 or AV1
// from mp4-muxer) and most other plain MP4s. Nothing is decoded here.

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf']);

async function bytes(blob, start, end) { return new DataView(await blob.slice(start, end).arrayBuffer()); }

function boxes(dv, start = 0, end = dv.byteLength) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    let size = dv.getUint32(p), head = 8;
    const type = String.fromCharCode(dv.getUint8(p + 4), dv.getUint8(p + 5), dv.getUint8(p + 6), dv.getUint8(p + 7));
    if (size === 1) { size = Number(dv.getBigUint64(p + 8)); head = 16; } else if (size === 0) size = end - p;
    if (size < head) break;
    out.push({ type, start: p, body: p + head, end: Math.min(end, p + size) });
    p += size;
  }
  return out;
}

function find(dv, box, path) {
  let cur = [box];
  for (const name of path) {
    const next = [];
    for (const b of cur) for (const c of boxes(dv, b.body, b.end)) if (c.type === name) next.push(c);
    cur = next;
    if (!cur.length) return [];
  }
  return cur;
}
const one = (dv, box, path) => find(dv, box, path)[0] || null;
const hex = (n) => n.toString(16).padStart(2, '0');

function codecOf(dv, entry) {
  const kids = boxes(dv, entry.body + 78, entry.end);
  const kid = (t) => kids.find(k => k.type === t);
  const payload = (k) => new Uint8Array(dv.buffer, dv.byteOffset + k.body, k.end - k.body).slice();
  if (entry.type === 'avc1' || entry.type === 'avc3') {
    const c = kid('avcC'); if (!c) return null;
    return { codec: `avc1.${hex(dv.getUint8(c.body + 1))}${hex(dv.getUint8(c.body + 2))}${hex(dv.getUint8(c.body + 3))}`, description: payload(c) };
  }
  if (entry.type === 'hvc1' || entry.type === 'hev1') {
    const c = kid('hvcC'); if (!c) return null;
    return { codec: `${entry.type}.1.6.L${dv.getUint8(c.body + 12)}.B0`, description: payload(c) };
  }
  if (entry.type === 'vp09') {
    const c = kid('vpcC'); if (!c) return { codec: 'vp09.00.40.08' };
    const b = c.body + 4;
    return { codec: `vp09.${String(dv.getUint8(b)).padStart(2, '0')}.${String(dv.getUint8(b + 1)).padStart(2, '0')}.${String(dv.getUint8(b + 2) >> 4).padStart(2, '0')}` };
  }
  if (entry.type === 'av01') {
    const c = kid('av1C'); if (!c) return null;
    const b1 = dv.getUint8(c.body + 1), b2 = dv.getUint8(c.body + 2);
    const depth = b2 & 0x40 ? (b2 & 0x20 ? 12 : 10) : 8;
    return { codec: `av01.${b1 >> 5}.${String(b1 & 31).padStart(2, '0')}${b2 & 0x80 ? 'H' : 'M'}.${String(depth).padStart(2, '0')}`, description: payload(c) };
  }
  return null;
}

// -> { codec, description?, codedWidth, codedHeight, timescale, duration (s), fps, samples: [{ offset, size, time, dur, key }] }
// time and dur are in seconds, samples in decode order. Throws when there is no video track it knows.
export async function readVideoTrack(blob) {
  // Top-level boxes: find moov wherever it is (it is first in Loomy's files, last in many others).
  let moov = null;
  for (let p = 0; p + 8 <= blob.size;) {
    const h = await bytes(blob, p, Math.min(blob.size, p + 16));
    let size = h.getUint32(0);
    const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
    if (size === 1) size = Number(h.getBigUint64(8)); else if (size === 0) size = blob.size - p;
    if (size < 8) break;
    if (type === 'moov') { moov = { start: p, size }; break; }
    p += size;
  }
  if (!moov) throw new Error('This video has no MP4 index (moov).');
  const dv = await bytes(blob, moov.start, moov.start + moov.size);
  const root = { body: 8, end: dv.byteLength };
  for (const trak of find(dv, root, ['trak'])) {
    const hdlr = one(dv, trak, ['mdia', 'hdlr']);
    if (!hdlr || String.fromCharCode(...[0, 1, 2, 3].map(i => dv.getUint8(hdlr.body + 8 + i))) !== 'vide') continue;
    const mdhd = one(dv, trak, ['mdia', 'mdhd']);
    const timescale = dv.getUint8(mdhd.body) === 1 ? dv.getUint32(mdhd.body + 20) : dv.getUint32(mdhd.body + 12);
    const stbl = one(dv, trak, ['mdia', 'minf', 'stbl']);
    const t = (name) => one(dv, stbl, [name]);
    const stsd = t('stsd');
    const entry = boxes(dv, stsd.body + 8, stsd.end)[0];
    const codec = codecOf(dv, entry);
    if (!codec) throw new Error(`This video's codec (${entry.type}) cannot be cut here.`);
    const codedWidth = dv.getUint16(entry.body + 24), codedHeight = dv.getUint16(entry.body + 26);
    // Sizes.
    const stsz = t('stsz');
    const fixed = dv.getUint32(stsz.body + 4), count = dv.getUint32(stsz.body + 8);
    const sizes = new Array(count);
    for (let i = 0; i < count; i++) sizes[i] = fixed || dv.getUint32(stsz.body + 12 + i * 4);
    // Offsets: chunks (stco / co64) filled by stsc runs.
    const stco = t('stco'), co64 = t('co64');
    const chunkN = dv.getUint32((stco || co64).body + 4);
    const chunkAt = (i) => (stco ? dv.getUint32(stco.body + 8 + i * 4) : Number(dv.getBigUint64(co64.body + 8 + i * 8)));
    const stsc = t('stsc'), runs = dv.getUint32(stsc.body + 4);
    const offsets = new Array(count);
    let s = 0;
    for (let r = 0; r < runs; r++) {
      const first = dv.getUint32(stsc.body + 8 + r * 12) - 1, per = dv.getUint32(stsc.body + 12 + r * 12);
      const last = r + 1 < runs ? dv.getUint32(stsc.body + 8 + (r + 1) * 12) - 1 : chunkN;
      for (let c = first; c < last && s < count; c++) {
        let off = chunkAt(c);
        for (let k = 0; k < per && s < count; k++) { offsets[s] = off; off += sizes[s]; s++; }
      }
    }
    // Times: stts deltas, plus ctts composition offsets.
    const stts = t('stts'), deltas = new Array(count);
    for (let r = 0, n = dv.getUint32(stts.body + 4), i = 0; r < n; r++) {
      const c = dv.getUint32(stts.body + 8 + r * 8), d = dv.getUint32(stts.body + 12 + r * 8);
      for (let k = 0; k < c && i < count; k++) deltas[i++] = d;
    }
    const comp = new Array(count).fill(0), ctts = t('ctts');
    if (ctts) {
      const signed = dv.getUint8(ctts.body) === 1;
      for (let r = 0, n = dv.getUint32(ctts.body + 4), i = 0; r < n; r++) {
        const c = dv.getUint32(ctts.body + 8 + r * 8), o = signed ? dv.getInt32(ctts.body + 12 + r * 8) : dv.getUint32(ctts.body + 12 + r * 8);
        for (let k = 0; k < c && i < count; k++) comp[i++] = o;
      }
    }
    const stss = t('stss'), keys = stss ? new Set() : null;
    if (stss) for (let r = 0, n = dv.getUint32(stss.body + 4); r < n; r++) keys.add(dv.getUint32(stss.body + 8 + r * 4) - 1);
    const samples = [];
    let dts = 0;
    const minComp = Math.min(0, ...comp);
    for (let i = 0; i < count; i++) {
      samples.push({ offset: offsets[i], size: sizes[i], time: (dts + comp[i] - minComp) / timescale, dur: deltas[i] / timescale, key: keys ? keys.has(i) : true });
      dts += deltas[i];
    }
    const sorted = deltas.slice().sort((a, b) => a - b), mid = sorted[Math.floor(sorted.length / 2)] || timescale / 30;
    return { ...codec, codedWidth, codedHeight, timescale, duration: dts / timescale, fps: Math.round(timescale / mid * 1000) / 1000, samples };
  }
  throw new Error('This MP4 has no video track.');
}
