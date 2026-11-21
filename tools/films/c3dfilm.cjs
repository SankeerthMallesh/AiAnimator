// Renders the bridge short in pieces of 150 frames (resumable): out/part_XXXX.mp4
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, total = '2025', piece = '150'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 720 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8773/tools/tests/c3d/'); await p.waitForFunction(() => window.ready);
  for (let f = 0; f < Number(total); f += Number(piece)) {
    const file = `${out}/part_${String(f).padStart(4, '0')}.mp4`;
    if (fs.existsSync(file)) continue;
    const n = Math.min(Number(piece), Number(total) - f), t0 = Date.now();
    const url = await p.evaluate(([a, c]) => window.film(a, c), [f, n]);
    const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); URL.revokeObjectURL(u); return btoa(s); }, url);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log(`part ${f}-${f + n} in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  await b.close();
})();
