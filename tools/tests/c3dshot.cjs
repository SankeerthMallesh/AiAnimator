// Stills of Loomy's 2.5D template shots: node c3dshot.cjs <shots.json in proof/> <out prefix> [w=540] [h=960] t1 t2 ...
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [shots, out, w = '540', h = '960', ...ts] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:8773/tools/tests/c3d/tmpl.html?shots=${shots}&w=${w}&h=${h}${process.env.LOOKS ? '&looks=' + process.env.LOOKS : ''}`);
  await p.waitForFunction(() => window.ready || window.__err, null, { timeout: 180000 }).catch(() => errs.push('not ready'));
  const times = ts.length ? ts.map(Number) : await p.evaluate(() => window.SHOTS.map(s => (s.start + s.end) / 2));
  for (const [i, t] of times.entries()) {
    const r = await p.evaluate((t) => window.still(t), t);
    const d = await p.evaluate(() => document.getElementById('view').toDataURL('image/jpeg', 0.85));
    fs.writeFileSync(`${out}-${i}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    console.log(`t=${t} ${r.ms} ms`);
  }
  console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
