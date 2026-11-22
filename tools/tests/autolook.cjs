// The 3D tab's Auto look in the page: it opens on Auto, and each topic starts with the look that can show it.
const { chromium } = require('playwright');
const CASES = [['How Roman concrete has lasted 2,000 years', '3D story short'], ['What would happen if you fell through the ice', '3D people, drawn in code']];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [topic, want] of CASES) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route('**/api/**', r => r.fulfill({ json: { ok: false } }));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8773/explainer/'); await p.waitForTimeout(1500);
    const def = await p.locator('#style').inputValue();
    await p.fill('#topic', topic); await p.click('#btnGo');
    await p.waitForFunction(() => /·/.test(document.querySelector('#projMeta')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    const meta = await p.textContent('#projMeta'), toast = await p.textContent('#toast').catch(() => '');
    const ok = def === 'auto' && meta.includes(want) && !errs.length;
    if (!ok) bad++;
    console.log(ok ? 'PASS' : 'FAIL', `default=${def} | ${topic} -> ${meta.trim()} | ${toast.trim().slice(0, 90)} ${errs.join(' ')}`);
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
