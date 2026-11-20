const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const line = fs.readFileSync('live.txt', 'utf8').split('\n').find(l => /loomy_pass/.test(l)).split('\t');
  await ctx.addCookies([{ name: 'loomy_pass', value: line[6].trim(), domain: 'loomy-app.pages.dev', path: '/', secure: true, httpOnly: true }]);
  const p = await ctx.newPage(); const msgs = [];
  p.on('console', m => { if (['error'].includes(m.type())) msgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  p.on('response', r => { if (r.status() >= 400) msgs.push(`[${r.status()}] ${r.url().slice(0, 120)}`); });
  await p.goto('https://loomy-app.pages.dev/'); await p.waitForTimeout(3000);
  const f = p.frameLocator('#view-cartoon');
  await f.locator('#topic').fill(process.argv[2] || 'Why do cats always land on their feet');
  await f.locator('#btnGo').click();
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 540000 }).catch(() => msgs.push('TIMEOUT'));
  console.log(await f.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ': ' + x.querySelector('.d').textContent).join('\n')));
  const href = await f.locator('#btnDownload').getAttribute('href');
  if (href) {
    const fr = p.frames().find(x => /cartoon/.test(x.url()));
    const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s=''; for (let i=0;i<a.length;i+=32768) s+=String.fromCharCode.apply(null,a.subarray(i,i+32768)); return btoa(s); }, href);
    fs.writeFileSync(process.argv[3] || 'live-cats.mp4', Buffer.from(b64, 'base64'));
  }
  await p.screenshot({ path: 'live-done.png' });
  console.log('ERRORS:', msgs);
  await b.close();
})();
