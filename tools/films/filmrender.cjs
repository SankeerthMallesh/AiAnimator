// Renders a film module in pieces (resumable): node filmrender.cjs <film> <outdir> <duration> [piece=6]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [film, out, dur, piece = '6'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 720 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(`http://127.0.0.1:8773/tools/tests/z3d/film.html?film=${film}${process.env.Q || ''}`); await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  for (let s = 0; s < Number(dur) - 1e-6; s += Number(piece)) {
    const file = `${out}/part_${String(Math.round(s * 10)).padStart(4, '0')}.mp4`;
    if (fs.existsSync(file)) continue;
    const len = Math.min(Number(piece), Number(dur) - s), t0 = Date.now();
    const url = await p.evaluate(([a, l]) => window.clip(a, l), [s, len]);
    const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let x = ''; for (let i = 0; i < a.length; i += 32768) x += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); URL.revokeObjectURL(u); return btoa(x); }, url);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log(`piece ${s}-${s + len} s in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  await b.close();
})();
