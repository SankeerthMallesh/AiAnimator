const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [film, out, list] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 720 } });
  p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
  await p.goto(`http://127.0.0.1:8773/tools/tests/z3d/film.html?film=${film}`); await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  for (const t of list.split(',').map(Number)) {
    const r = await p.evaluate(t => window.still(t), t);
    const data = await p.evaluate(() => document.getElementById('view').toDataURL('image/jpeg', 0.9));
    fs.writeFileSync(`${out}/t${t.toFixed(1).padStart(5, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
    console.log('t', t, JSON.stringify(r));
  }
  await b.close();
})();
