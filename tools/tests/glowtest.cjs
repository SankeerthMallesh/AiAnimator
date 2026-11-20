const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: '127.0.0.1' } : undefined });
  const ctx = await b.newContext({ ignoreHTTPSErrors: true });
  await ctx.route('**/testimg/*', r => r.fulfill({ body: fs.readFileSync('ref3d/' + r.request().url().split('/').pop()), contentType: 'image/png' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8773/explainer/');
  for (const name of ['slide.png', 'man.png']) {
    const url = await p.evaluate(async (name) => {
      const { estimateDepth } = await import('./js/depth.js'); const { glowImage } = await import('./js/glow.js');
      const bmp = await createImageBitmap(await (await fetch('/testimg/' + name)).blob());
      const d = await estimateDepth(bmp, { log: () => {} });
      const out = glowImage(bmp, d);
      if (!out) return 'none:' + d.width + 'x' + d.height;
      return out.toDataURL('image/jpeg', 0.85);
    }, name);
    if (url.startsWith('none')) console.log(name, url); else fs.writeFileSync('ref3d/glow_' + name.replace('.png', '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('errors', errs); await b.close();
})();
