// Stills of the 3D tab's drawn look from a script: node d3shot.cjs <script in proof/> <out prefix> [w] [h]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [script, out, w = '540', h = '960'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:8773/tools/tests/z3d/drawn.html?kind=3d&w=${w}&h=${h}&script=${script}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 240000 }).catch(() => errs.push('not ready'));
  const scenes = await p.evaluate(() => window.scenesAt ? window.scenesAt() : []);
  for (const [i, [s, d]] of scenes.entries()) {
    const r = await p.evaluate((t) => window.still(t), s + d * 0.55);
    const data = await p.evaluate(() => document.getElementById('view').toDataURL('image/jpeg', 0.85));
    fs.writeFileSync(`${out}-${i}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
    console.log(`scene ${i} ${r.ms} ms`);
  }
  console.log('errors:', errs.slice(0, 6));
  await b.close();
})();
