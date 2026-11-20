// ffmpeg in the browser (ffmpeg.wasm). The wrapper lives in /vendor/ffmpeg; the 32 MB core is fetched
// from jsDelivr once and then comes from the browser cache. The video file itself is never copied into
// memory: it is mounted read-only (WORKERFS), so even a multi-hour stream only has its audio read.

const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
let loading = null;
let mountedFile = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.FFmpegWASM) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the video tools'));
    document.head.append(s);
  });
}

async function blobURL(url, type, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the video tools (HTTP ${res.status})`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  if (!res.body || !onBytes) return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type }));
  const reader = res.body.getReader();
  const parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    onBytes(got, total);
  }
  return URL.createObjectURL(new Blob(parts, { type }));
}

// Returns a ready FFmpeg instance. onProgress(fraction) while the core downloads.
export function getFFmpeg(onProgress) {
  if (loading) return loading;
  loading = (async () => {
    await loadScript('../vendor/ffmpeg/ffmpeg.js?v=0.12.15');
    const ff = new window.FFmpegWASM.FFmpeg();
    const coreURL = await blobURL(`${CORE}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await blobURL(`${CORE}/ffmpeg-core.wasm`, 'application/wasm', (got, total) => onProgress?.(total ? got / total : 0));
    await ff.load({ coreURL, wasmURL });
    return ff;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

// Mount the chosen file read-only at /in. Returns its path inside ffmpeg.
export async function mountFile(ff, file) {
  if (mountedFile === file) return `/in/${file.name}`;
  if (mountedFile) { try { await ff.unmount('/in'); } catch { /* not mounted */ } }
  try { await ff.createDir('/in'); } catch { /* exists */ }
  await ff.mount('WORKERFS', { files: [file] }, '/in');
  mountedFile = file;
  return `/in/${file.name}`;
}

// Run ffmpeg, reporting progress as seconds of output written (from its log).
export async function run(ff, args, { onTime } = {}) {
  const logs = [];
  const onLog = ({ message }) => {
    logs.push(message);
    if (logs.length > 400) logs.shift();
    const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(message);
    if (m && onTime) onTime(+m[1] * 3600 + +m[2] * 60 + +m[3]);
  };
  ff.on('log', onLog);
  try {
    const code = await ff.exec(args);
    if (code !== 0) throw new Error(`Video tools failed: ${logs.filter(l => /error|invalid|not/i.test(l)).slice(-2).join(' / ') || `code ${code}`}`);
    return logs;
  } finally {
    ff.off('log', onLog);
  }
}

// The file's duration in seconds, read from ffmpeg's own report.
export async function probeDuration(ff, path) {
  const logs = [];
  const onLog = ({ message }) => logs.push(message);
  ff.on('log', onLog);
  try { await ff.exec(['-hide_banner', '-i', path]); } catch { /* "no output" is expected */ }
  ff.off('log', onLog);
  const m = logs.map(l => /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(l)).find(Boolean);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

export async function removeFiles(ff, names) {
  for (const n of names) { try { await ff.deleteFile(n); } catch { /* gone */ } }
}
