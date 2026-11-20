const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [sec, key] of [['cartoon', 'storyforge.settings.v1'], ['explainer', null]]) {
    const p = await b.newPage({ viewport: { width: 420, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/api/config', r => r.fulfill({ json: { ai: true, sync: false } }));
    await p.goto(`http://127.0.0.1:8773/${sec}/`);
    await p.waitForTimeout(800);
    await p.click('#btnSettings');
    await p.waitForTimeout(400);
    await p.fill('[name=falKey]', 'fal_test');
    await p.fill('[name=elevenKey]', 'el_test').catch(() => {});
    for (const m of ['auto', 'best', 'free', 'cheap', 'fast', 'manual']) {
      await p.selectOption('#routeMode', m);
      await p.waitForTimeout(250);
      const rows = await p.$$eval('#modelHub .hub-row', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ')));
      console.log(`[${sec}] ${m}:`); rows.forEach(r => console.log('   ' + r));
    }
    await p.selectOption('#routeMode', 'best');
    if (sec === 'cartoon') await p.screenshot({ path: 'hub.png', fullPage: false });
    // Save and confirm the module-level router decisions use the saved mode.
    await p.click('#settingsForm button[value=save], #settingsForm button[type=submit]').catch(() => {});
    await p.waitForTimeout(300);
    const res = await p.evaluate(async () => {
      const v = await import('./js/videoai.js'); const l = await import('./js/llm.js');
      const s = { routeMode: 'best', falKey: 'k', falModel: 'fal-ai/kling-video/v2.1/standard/image-to-video', geminiKey: 'g' };
      return { best: v.videoProviderLabel(s), free: v.videoProvider({ ...s, routeMode: 'free' }), cheap: v.videoProviderLabel({ ...s, routeMode: 'cheap' }), auto: v.videoProviderLabel({ ...s, routeMode: 'auto' }), writers: l.providerOrder(s), freeWriters: l.providerOrder({ ...s, routeMode: 'free' }) };
    });
    console.log(`[${sec}] module:`, JSON.stringify(res), 'errors:', errs);
    await p.close();
  }
  await b.close();
})();
