// Stress test runner (T1): node fuzz.cjs [n=1000] [buildEvery=10] [tabs=3d,blocky,cartoon]
// Needs the site served on 127.0.0.1:8773. Writes out/fuzz-<tab>.json and prints a summary.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const n = Number(process.argv[2] || 1000), every = Number(process.argv[3] ?? 10), tabs = (process.argv[4] || '3d,blocky,cartoon').split(',');
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8773/tools/tests/fuzz/'); await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  fs.mkdirSync('out', { recursive: true });
  for (const tab of tabs) {
    const r = await p.evaluate(([t, n, e]) => window.run(t, n, e), [tab, n, tab === 'cartoon' ? 0 : every]);
    fs.writeFileSync(`out/fuzz-${tab}.json`, JSON.stringify(r, null, 1));
    const kinds = {};
    for (const f of r.fails) { const key = f.what.replace(/\d+(\.\d+)?/g, '#').slice(0, 90); kinds[key] = (kinds[key] || 0) + 1; }
    console.log(`\n== ${tab}: ${r.n} scripts in ${Math.round(r.ms / 1000)} s | passed ${r.ok} | rejected as empty ${r.rejected} | FAILED ${r.fails.length} | built ${r.built} plans, ${r.frames} frames drawn | up to ${r.maxScenes} scenes, ${r.maxShots} shots`);
    for (const [k, c] of Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${c}x  ${k}`);
  }
  console.log('\npage errors:', errs.length ? errs.slice(0, 10).join('\n  ') : 'none');
  await b.close();
})();
