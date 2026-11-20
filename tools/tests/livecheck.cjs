const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 }, ignoreHTTPSErrors: true });
  const line = fs.readFileSync('live.txt', 'utf8').split('\n').find(l => /loomy_pass/.test(l)).split('\t');
  await ctx.addCookies([{ name: 'loomy_pass', value: line[6].trim(), domain: 'loomy-app.pages.dev', path: '/', secure: true, httpOnly: true }]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/TUNNEL_CONNECTION|ERR_TUNNEL/.test(m.text())) errs.push(`[console] ${m.text().slice(0, 160)}`); });
  p.on('response', r => { if (r.status() >= 400) errs.push(`[${r.status()}] ${r.url().slice(0, 100)}`); });
  await p.goto('https://loomy-app.pages.dev/'); await p.waitForTimeout(3000);
  for (const t of ['3d', 'blocky', 'clips', 'board', 'cartoon']) { await p.click(`#tab-${t}`); await p.waitForTimeout(3500); }
  console.log('tabs visited; errors so far:', errs.length);
  // Clips, fully live
  await p.click('#tab-clips'); await p.waitForTimeout(1500);
  const f = p.frames().find(x => /\/clip\//.test(x.url()));
  await f.setInputFiles('#fileInput', path.resolve('cliptest/wide.webm'));
  await f.waitForFunction(() => !document.querySelector('#btnGo').disabled, null, { timeout: 60000 });
  await f.selectOption('#count', '3');
  const t0 = Date.now();
  await f.click('#btnGo');
  await f.waitForFunction(() => { const li = document.querySelector('#steps li[data-step="clips"]'); return li.classList.contains('done') || document.querySelector('#steps li.fail'); }, null, { timeout: 900000 });
  console.log('clips:', Math.round((Date.now() - t0) / 1000), 's', await f.$$eval('#steps li', l => l.map(x => `${x.dataset.step}:${x.className}:${x.querySelector('.d').textContent}`).join(' | ')));
  console.log('headings:', await f.$$eval('.card input', l => l.map(i => i.value).join(' / ')));
  console.log('errors:', errs);
  await b.close();
})();
