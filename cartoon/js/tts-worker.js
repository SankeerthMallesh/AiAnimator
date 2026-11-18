// Runs the Kokoro text-to-speech model in a background thread, 100% in the browser.
// The model (~90 MB, quantized) is downloaded once from Hugging Face and cached by the browser.
import { KokoroTTS } from '../../vendor/kokoro.web.js';

let tts = null;
let loading = null;

function splitSentences(text) {
  const parts = text.match(/[^.!?;:]+[.!?;:]+["')\]]*|[^.!?;:]+$/g) || [text];
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 280 && cur) { chunks.push(cur.trim()); cur = p; } else cur += p;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function load(dtype) {
  if (tts) return tts;
  if (!loading) {
    loading = KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: dtype || 'q8',
      device: 'wasm',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
        }
      },
    }).then(m => (tts = m));
  }
  return loading;
}

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    if (type === 'load') {
      await load(e.data.dtype);
      self.postMessage({ id, type: 'ready' });
    } else if (type === 'speak') {
      const model = await load();
      const pieces = [];
      let sampleRate = 24000;
      for (const chunk of splitSentences(e.data.text)) {
        const out = await model.generate(chunk, { voice: e.data.voice || 'am_michael', speed: e.data.speed || 1 });
        sampleRate = out.sampling_rate;
        pieces.push(out.audio);
      }
      const gap = Math.round(sampleRate * 0.06);
      const total = pieces.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, pieces.length - 1);
      const samples = new Float32Array(total);
      let o = 0;
      for (const p of pieces) { samples.set(p, o); o += p.length + gap; }
      self.postMessage({ id, type: 'audio', samples, sampleRate }, [samples.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) });
  }
};
