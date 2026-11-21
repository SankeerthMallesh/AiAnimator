// The code-drawn 3D engine inside Loomy: stills, then a stretch of MP4 through Loomy's encoder.
//   node z3de2e.cjs [start=8] [length=4] [base=http://127.0.0.1:8773]
// Writes out/z3d-still-*.png and out/z3d-film.mp4.
const { chromium } = require('playwright');
const fs = require('fs');
const [start = '8', length = '4', base = 'http://127.0.0.1:8773'] = process.argv.slice(2);
(async () => {
  fs.mkdirSync('out', { recursive: true });
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(base + '/tools/tests/z3d/');
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  for (const t of [1.5, 5, 8, 14.5, 22]) {
    const r = await p.evaluate(t => window.still(t), t);
    const data = await p.evaluate(() => document.getElementById('view').toDataURL('image/png'));
    fs.writeFileSync(`out/z3d-still-${t}.png`, Buffer.from(data.split(',')[1], 'base64'));
    console.log(`still ${t} s: shot ${r.shot}, ${r.ms} ms`);
  }
  const t0 = Date.now();
  const url = await p.evaluate(([s, l]) => window.film(s, l), [Number(start), Number(length)]);
  const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, url);
  fs.writeFileSync('out/z3d-film.mp4', Buffer.from(b64, 'base64'));
  console.log(`film ${length} s from ${start} s in ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
  await b.close();
})();
