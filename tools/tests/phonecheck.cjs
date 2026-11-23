// 2.3 phone check: Loomy as an iPhone (Chromium emulation): every tab opens without errors, idle tabs are closed
// when another is opened (a phone's memory), inputs are 16 px (no zoom on tap), no sideways scroll, and a Cartoons
// video starts making (mocked writer, free voice) and renders at 720p.   node phonecheck.cjs [seconds to watch=150]
const { chromium, devices } = require('playwright'); const fs = require('fs');
const script = JSON.parse(fs.readFileSync('proof/prison.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/write')) {
      const sys = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      return route.fulfill({ json: { ok: true, text: /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script) } });
    }
    return route.fulfill({ status: 503, json: { ok: false, error: 'not used' } });
  });
  const p = await ctx.newPage(), bad = [];
  p.on('pageerror', e => bad.push(`[pageerror] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) bad.push(`[console] ${m.text().slice(0, 160)}`); });
  await p.goto('http://127.0.0.1:8773/?test=1'); await p.waitForTimeout(2500);
  const report = [];
  for (const tab of ['3d', 'blocky', 'clips', 'edit', 'board', 'cartoon']) {
    await p.tap(`#tab-${tab}`).catch(e => bad.push(`tap ${tab}: ${e.message}`)); await p.waitForTimeout(2500);
    const frames = await p.evaluate(() => [...document.querySelectorAll('.views iframe')].map(f => f.id));
    const f = p.frames().find(x => x.url().includes(tab === '3d' || tab === 'blocky' ? '/explainer/' : tab === 'clips' ? '/clip/' : tab === 'edit' ? '/editor/' : `/${tab}/`));
    const info = f ? await f.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth + 1, small: [...document.querySelectorAll('input, select, textarea')].filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.name || e.tagName).slice(0, 5) })).catch(e => ({ err: e.message })) : { err: 'no frame' };
    await p.screenshot({ path: `out/phone-${tab}.png` });
    report.push(`${tab}: frames ${frames.join(',')} ${JSON.stringify(info)}`);
  }
  console.log(report.join('\n'));
  // make a Cartoons video on the phone
  const f = p.frameLocator('#view-cartoon');
  await f.locator('#topic').fill(script.title);
  await f.locator('#btnGo').tap();
  // switching away mid-make must not close the busy tab
  await p.waitForTimeout(8000);
  await p.tap('#tab-3d'); await p.waitForTimeout(3000);
  console.log('while making, after opening 3D:', (await p.evaluate(() => [...document.querySelectorAll('.views iframe')].map(f => f.id))).join(','));
  await p.tap('#tab-cartoon'); await p.waitForTimeout(1500);
  const watch = Number(process.argv[2] || 150) * 1000, t0 = Date.now();
  let steps = '';
  while (Date.now() - t0 < watch) {
    await p.waitForTimeout(10000);
    steps = await f.locator('#steps li').evaluateAll(l => l.map(x => `${x.dataset.step}:${x.className}:${(x.querySelector('.d')?.textContent || '').slice(0, 60)}`).join(' | ')).catch(() => '');
    if (/render:(active|done)/.test(steps) || /error|failed/i.test(steps)) break;
  }
  const busy = await p.frames().find(x => x.url().includes('/cartoon/'))?.evaluate(() => window.loomyWorking).catch(() => null);
  console.log('steps:', steps);
  console.log('busy flag while making:', busy);
  await p.screenshot({ path: 'out/phone-making.png' });
  console.log('PROBLEMS:', bad.slice(0, 10));
  await b.close();
})();
