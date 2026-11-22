// L2/L3/L4: a whole video in the 3D or Blocky tab with the look drawn in code, mocked AI (writer and
// voice), at 720p 24 fps so it finishes on a CPU. Checks the steps (pictures skipped, voice, film
// sound with effects, render), saves the MP4 and the render log, and prints console problems.
//   node drawnmaster.cjs 3d|blocky [out/name]
const { chromium } = require('playwright'); const fs = require('fs');
const tab = process.argv[2] === 'blocky' ? 'blocky' : '3d';
const name = process.argv[3] || `out/drawn-${tab}`;
const script = JSON.parse(fs.readFileSync(`proof/drawn-${tab}.json`, 'utf8'));
script.youtubeTitle = script.title; script.description = 'Test.'; script.hashtags = ['#test'];
(async () => {
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let writes = 0;
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
    if (path.endsWith('/api/write')) {
      writes++;
      const sys = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      const text = /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script);
      return route.fulfill({ json: { ok: true, text } });
    }
    if (path.endsWith('/api/image')) return route.fulfill({ status: 500, json: { ok: false, error: 'pictures must not be asked for' } });
    return route.fulfill({ json: { ok: false } });
  });
  const images = [];
  ctx.on('request', r => { if (/\/api\/image/.test(r.url())) images.push(r.url()); });
  const p = await ctx.newPage();
  const msgs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|GPU stall|__access/.test(m.text())) msgs.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:8773/'); await p.waitForTimeout(2000);
  await p.click(`#tab-${tab}`); await p.waitForTimeout(2500);
  const f = p.frameLocator(`#view-${tab}`);
  const style = await f.locator('#style').inputValue();
  console.log('default look:', style);
  // The 3D tab opens on Auto; this test is about the drawn look, so it picks it.
  if (tab === '3d') await f.locator('#style').selectOption('drawn-3d');
  await f.locator('#btnMore').click().catch(() => {});
  await f.locator('#quality').selectOption('720'); await f.locator('#fps').selectOption('24');
  await f.locator('#topic').fill(script.title);
  const t0 = Date.now();
  await f.locator('#btnGo').click();
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => msgs.push('TIMEOUT'));
  console.log('seconds:', Math.round((Date.now() - t0) / 1000));
  const fr = p.frames().find(x => x.url().includes('/explainer/'));
  const href = await f.locator('#btnDownload').getAttribute('href').catch(() => null);
  if (fr && href) {
    const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href);
    fs.writeFileSync(name + '.mp4', Buffer.from(b64, 'base64'));
    const man = await fr.evaluate(() => window.loomyManifest || null);
    if (man) fs.writeFileSync(name + '.loomy-manifest.json', JSON.stringify(man, null, 1));
    console.log('saved', name + '.mp4');
  }
  const steps = await f.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ':' + x.className + ':' + x.querySelector('.d').textContent));
  console.log(steps.join('\n'));
  const log = await f.locator('#log').textContent().catch(() => '');
  console.log('shots:', (log.match(/Shots: [^\n]*/) || [''])[0].slice(0, 600));
  const fails = [];
  if (style !== (tab === 'blocky' ? 'drawn-blocky' : 'auto')) fails.push('wrong default look ' + style);
  if (images.length) fails.push(`${images.length} picture requests`);
  for (const id of ['visuals', 'depth', 'motion']) if (!steps.some(s => s.startsWith(id + ':') && /Drawn in code/.test(s))) fails.push(`${id} not skipped as drawn`);
  if (!steps.some(s => s.startsWith('sound:') && /film score/.test(s) && /sound effects/.test(s))) fails.push('no film sound');
  if (!steps.some(s => s.startsWith('render:done'))) fails.push('render not done');
  if (!steps.some(s => s.startsWith('voice:done'))) fails.push('voice not done');
  console.log('CONSOLE:', msgs.length ? '\n' + [...new Set(msgs)].join('\n') : 'clean');
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
