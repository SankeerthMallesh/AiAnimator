const { chromium } = require('playwright'); const fs = require('fs');
const relay = []; const topic = process.argv[2] || 'Why do cats always land on their feet'; const out = process.argv[3] || 'fixed-cats';
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: '127.0.0.1' } : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const line = fs.readFileSync('live.txt', 'utf8').split('\n').find(l => /loomy_pass/.test(l)).split('\t');
  const cookie = `loomy_pass=${line[6].trim()}`;
  await ctx.route('http://127.0.0.1:8773/api/**', async (route) => {
    const req = route.request(); const u = new URL(req.url());
    try { const r = await route.fetch({ url: 'https://loomy-app.pages.dev' + u.pathname + u.search, headers: { ...req.headers(), cookie, origin: 'https://loomy-app.pages.dev' }, timeout: 180000 }); relay.push(u.pathname + ' ' + r.status()); await route.fulfill({ response: r }); }
    catch (e) { relay.push(u.pathname + ' FAIL ' + e.message.slice(0, 120)); await route.abort().catch(() => {}); }
  });
  const p = await ctx.newPage(); const msgs = []; const logs = [];
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  p.on('response', r => { if (r.status() >= 400 && !/__access/.test(r.url())) msgs.push(`[${r.status()}] ${r.url().slice(0, 120)}`); });
  await p.goto('http://127.0.0.1:8773/cartoon/'); await p.waitForTimeout(2000);
  await p.locator('#topic').fill(topic);
  await p.locator('#btnGo').click();
  await p.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 540000 }).catch(() => msgs.push('TIMEOUT'));
  console.log(await p.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ': ' + x.querySelector('.d').textContent).join('\n')));
  console.log((await p.locator('#log, .log').first().innerText().catch(() => '')).split('\n').filter(x => /Painted|picture|background|safety|unsafe|skip/i.test(x)).slice(-12).join('\n'));
  const href = await p.locator('#btnDownload').getAttribute('href');
  if (href) {
    const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s=''; for (let i=0;i<a.length;i+=32768) s+=String.fromCharCode.apply(null,a.subarray(i,i+32768)); return btoa(s); }, href);
    fs.writeFileSync(out + '.mp4', Buffer.from(b64, 'base64'));
  }
  console.log('RELAY:', [...new Set(relay)].slice(0, 30)); console.log('ERRORS:', msgs);
  await b.close();
})();
