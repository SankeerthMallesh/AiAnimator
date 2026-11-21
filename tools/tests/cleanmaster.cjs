const { chromium } = require('playwright'); const fs = require('fs');
const script = { title: 'How Bees Make Honey', youtubeTitle: 'Bees Turn Flowers Into Gold 🍯', description: 'Bees are tiny chemists. Here is how nectar becomes honey.\nSources: Wikipedia – Honey bee', hashtags: ['#shorts', '#bees', '#honey', '#nature', '#science', '#facts', '#didyouknow', '#insects'],
  cast: [{ id: 'a', name: 'Maya', color: '#E8A33D', hat: 'cap', hair: 'curly', costume: 'shirt' }, { id: 'b', name: 'Leo', color: '#3E8FE0', hat: 'hardhat', hair: 'short', costume: 'shirt' }],
  scenes: ['A single bee visits up to 1,500 flowers to fill her honey stomach.', 'Back at the hive, she passes the nectar mouth to mouth to other workers.', 'Enzymes start turning the sugar into something new.', 'Then the bees fan their wings to dry it out!', 'When it is thick enough, they seal it under wax.', 'Why does honey never spoil?', 'It is so dry and acidic that germs cannot grow in it.', 'Archaeologists found edible honey in Egyptian tombs.', 'So every spoonful is a lifetime of bee work.'].map((line, i) => ({ line, set: ['field', 'forest', 'lab', 'field', 'room', 'lab', 'lab', 'desert', 'field'][i], say: i % 2 ? 'b' : 'a', icon: ['🐝', '🍯', '🧪', '💨', '🍯', '🤔', '🦠', '🏺', '🥄'][i], who: [{ id: 'a', x: 0.3, pose: 'point' }, { id: 'b', x: 0.7, pose: 'idle' }] })) };
const pics = ['ref/gw.jpg', 'ref/p1.jpg', 'ref/p3.jpg', 'ref/p4.jpg', 'wk_map.jpg', 'wk_tank.jpg'].filter(f => fs.existsSync(f));
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: '127.0.0.1' } : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  let n = 0;
  await ctx.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); const path = u.pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/image')) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(pics[n++ % pics.length]) });
    if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
    if (path.endsWith('/api/fal')) {
      const body = JSON.parse(route.request().postData() || '{}');
      globalThis.falModels = (globalThis.falModels || new Set()); if (body.model) globalThis.falModels.add(body.model);
      if (body.action === 'start') return route.fulfill({ json: { ok: true, status_url: 'https://queue.fal.run/x/status', response_url: 'https://queue.fal.run/x' } });
      if (body.action === 'poll') return route.fulfill({ json: { ok: true, status: 'COMPLETED' } });
      if (body.action === 'result') return route.fulfill({ json: { ok: true, url: 'https://v3.fal.media/clip.webm' } });
      if (body.action === 'fetch') return route.fulfill({ status: 200, contentType: 'video/webm', body: fs.readFileSync('rclip.webm') });
    }
    if (path.endsWith('/api/runway')) {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.action === 'start') return route.fulfill({ json: { ok: true, id: 'task' + Math.random() } });
      if (body.action === 'poll') return route.fulfill({ json: { ok: true, status: 'SUCCEEDED', output: ['https://cdn.example/clip.webm'] } });
      if (body.action === 'fetch') return route.fulfill({ status: 200, contentType: 'video/webm', body: fs.readFileSync('rclip.webm') });
    }
    if (path.endsWith('/api/write')) {
      const body = JSON.parse(route.request().postData() || '{}'); const sys = JSON.stringify(body.messages || '');
      const text = /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script);
      return route.fulfill({ json: { ok: true, text } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  // Wikipedia is rate-limited for this test machine: give it a small fixture.
  const file = (nm, desc) => ({ title: `File:${nm}`, imageinfo: [{ thumburl: `https://upload.wikimedia.org/t/${nm}`, width: 1200, height: 800, mime: 'image/jpeg', descriptionurl: `https://commons.wikimedia.org/wiki/File:${nm}`, extmetadata: { Artist: { value: 'Tester' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, ImageDescription: { value: desc } } }] });
  await ctx.route('https://en.wikipedia.org/**', async (route) => {
    const q = new URL(route.request().url()).searchParams; let body;
    if (q.get('list') === 'search') body = { query: { search: [{ title: 'Honey bee' }, { title: 'Honey' }] } };
    else if (q.get('prop') === 'pageimages') body = { query: { pages: [{ title: 'Honey bee', pageimage: 'Bee_on_flower.jpg' }] } };
    else if (q.get('generator') === 'images') body = { query: { pages: [file('Honeycomb_cells.jpg', 'honeycomb with honey'), file('Beehive_frames.jpg', 'hive frames workers'), file('Egyptian_honey_jar.jpg', 'honey jar from a tomb in Egypt')] } };
    else body = { query: { pages: [file('Bee_on_flower.jpg', 'A honey bee collecting nectar from a flower')] } };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await ctx.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(pics[(n++) % pics.length]) }));
  const p = await ctx.newPage();
  const msgs = []; const issues = []; const thirdParty = new Set();
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) msgs.push(`[${m.type()}] ${m.text().slice(0, 220)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  p.on('request', r => { const h = new URL(r.url()).host; if (!/127\.0\.0\.1/.test(h)) thirdParty.add(h); });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Audits.enable'); await cdp.send('Log.enable');
  cdp.on('Audits.issueAdded', e => issues.push(e.issue.code + ' ' + JSON.stringify(e.issue.details).slice(0, 260)));
  cdp.on('Log.entryAdded', e => { if (['error', 'warning'].includes(e.entry.level)) msgs.push(`[log ${e.entry.level}] ${e.entry.source} ${e.entry.text.slice(0, 200)} ${e.entry.url || ''}`); });
  await p.goto('http://127.0.0.1:8773/'); await p.waitForTimeout(2000);
  const f = p.frameLocator('#view-cartoon');
  await f.locator('#topic').fill('How bees make honey');
  await f.locator('#btnGo').click();
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 600000 }).catch(() => msgs.push('TIMEOUT'));
  { // Save the first render and its render log.
    const fr = p.frames().find(x => x.url().includes('/cartoon/')); const href = await f.locator('#btnDownload').getAttribute('href');
    if (fr && href) {
      const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s=''; for (let i=0;i<a.length;i+=32768) s+=String.fromCharCode.apply(null,a.subarray(i,i+32768)); return btoa(s); }, href);
      const name = process.env.OUT || 'out/cleanmaster';
      fs.writeFileSync(name + '.mp4', Buffer.from(b64, 'base64'));
      const man = await fr.evaluate(() => window.loomyManifest || null);
      if (man) fs.writeFileSync(name + '.loomy-manifest.json', JSON.stringify(man, null, 1));
      console.log('saved', name + '.mp4', man ? '+ render log' : '(no render log)');
    }
  }
  console.log(await f.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ':' + x.className + ':' + x.querySelector('.d').textContent).join('\n')));
  console.log('runway button hidden before key:', await f.locator('#btnRunway').isHidden());
  await f.locator('#btnSettings').click(); await p.waitForTimeout(400);
  await f.locator('input[name=falKey]').fill('fal_' + 'b'.repeat(40));
  await f.locator('select[name=falModel]').selectOption('fal-ai/kling-video/v2.1/standard/image-to-video');
  await f.locator('#settingsForm button.btn.primary, #settingsForm button[value=save], #btnSave').first().click().catch(() => {});
  await p.waitForTimeout(600);
  console.log('animate button:', await f.locator('#btnRunway').innerText());
  await f.locator('#btnShotPack').click(); await p.waitForTimeout(800);
  console.log('shot pack rows:', await f.locator('#shotPack .shot-row').count(), '| tools:', await f.locator('#shotPack .tool-row a').count());
  await p.screenshot({ path: 'frames/shotpack.png' });
  await f.locator('#shotPack [data-close]').click(); await p.waitForTimeout(300);
  p.on('dialog', d => d.accept());
  await f.locator('#btnRunway').click();
  await f.locator('#btnRunway:not([disabled])').waitFor({ timeout: 600000 });
  const oldHref = await f.locator('#btnDownload').getAttribute('href');
  const lg = await f.locator('#log').textContent();
  console.log('runway log:', lg.split('\n').filter(l => /Runway/.test(l)).slice(-3).join(' | '));
  await f.locator('#btnRender').click(); await p.waitForTimeout(1500);
  await p.waitForFunction((old) => { const fr = [...document.querySelectorAll('iframe')].find(x => x.id === 'view-cartoon'); const a = fr?.contentDocument?.getElementById('btnDownload'); return a && !a.classList.contains('hidden') && a.getAttribute('href') !== old; }, oldHref, { timeout: 600000 });
  { const fr = p.frames().find(x => x.url().includes('/cartoon/')); const href = await f.locator('#btnDownload').getAttribute('href');
    const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s=''; for (let i=0;i<a.length;i+=32768) s+=String.fromCharCode.apply(null,a.subarray(i,i+32768)); return btoa(s); }, href);
    fs.writeFileSync('out/runway_test.mp4', Buffer.from(b64, 'base64')); }
  await p.click('#tab-3d'); await p.waitForTimeout(2500);
  await p.click('#tab-board'); await p.waitForTimeout(2000);
  await p.frameLocator('#view-cartoon').locator('#btnSettings').click().catch(() => {}); await p.waitForTimeout(800);
  console.log('fal models used:', [...(globalThis.falModels||[])].join(','));
  console.log('THIRD-PARTY HOSTS:', [...thirdParty].join(', '));
  console.log('CONSOLE:', msgs.length ? '\n' + [...new Set(msgs)].join('\n') : 'clean');
  console.log('ISSUES:', issues.length ? '\n' + [...new Set(issues)].slice(0, 40).join('\n') : 'none');
  await b.close();
})();
