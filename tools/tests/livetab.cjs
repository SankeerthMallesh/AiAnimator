// Live end-to-end check on the real site (T3): node livetab.cjs cartoon|3d|blocky "topic" out.mp4 [seconds=30]
// Opens the tab itself (not the shell), makes one real video (real writer, voice, pictures where the look
// uses them) and saves it with its step list. Spends real allowance: one short video per tab per run.
// Needs live.txt (the loomy_pass cookie, never committed).
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [tab = 'cartoon', topic = 'Why do cats always land on their feet', out = `out/live-${tab}.mp4`, secs = '30'] = process.argv.slice(2);
  const url = { cartoon: 'cartoon/', '3d': 'explainer/', blocky: 'explainer/?style=blocky' }[tab];
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const line = fs.readFileSync('live.txt', 'utf8').split('\n').find(l => /loomy_pass/.test(l)).split('\t');
  await ctx.addCookies([{ name: 'loomy_pass', value: line[6].trim(), domain: 'loomy-app.pages.dev', path: '/', secure: true, httpOnly: true }]);
  const p = await ctx.newPage(); const msgs = [];
  p.on('console', m => { if (m.type() === 'error') msgs.push(`[error] ${m.text().slice(0, 200)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) msgs.push(`[${r.status()}] ${r.url().slice(0, 120)}`); });
  await p.goto('https://loomy-app.pages.dev/' + url); await p.waitForTimeout(4000);
  await p.locator('#topic').fill(topic);
  const dur = p.locator('#duration');
  if (await dur.count()) { const opts = await dur.locator('option').evaluateAll(o => o.map(x => x.value)); const want = opts.reduce((a, v) => (Math.abs(+v - +secs) < Math.abs(+a - +secs) ? v : a), opts[0]); await dur.selectOption(want).catch(() => {}); }
  const t0 = Date.now();
  await p.locator('#btnGo').click();
  await p.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3000000 }).catch(() => msgs.push('TIMEOUT'));
  const steps = await p.locator('#steps li').evaluateAll(l => l.map(x => `${x.dataset.step}: ${x.className.replace(/\s+/g, ' ')} | ${x.querySelector('.d')?.textContent || ''}`).join('\n'));
  console.log(`== live ${tab}: "${topic}" in ${Math.round((Date.now() - t0) / 1000)} s\n${steps}`);
  const href = await p.locator('#btnDownload').getAttribute('href').catch(() => null);
  if (href) {
    const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href);
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('saved', out);
  }
  console.log('ERRORS:', msgs.length ? msgs.slice(0, 12) : 'none');
  await b.close();
})();
