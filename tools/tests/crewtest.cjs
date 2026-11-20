const { chromium } = require('playwright'); const fs = require('fs');
const prompts = [];
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
      prompts.push(sys); const text = /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script);
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
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const make = async (topic) => {
    await p.locator('#topic').fill(topic);
    if (await p.locator('#morePanel').isHidden()) await p.locator('#btnMore').click();
    await p.locator('#reviewFirst').check();
    await p.locator('#btnGo').click();
    await p.locator('#board .scene').first().waitFor({ timeout: 120000 });
    await p.waitForTimeout(1500);
  };
  await p.goto('http://127.0.0.1:8773/cartoon/'); await p.waitForTimeout(1500);
  console.log('crew box hidden with empty library:', await p.locator('#crewBox').isHidden());
  await make('How bees make honey');
  console.log('first prompt has crew rule:', /recurring characters/.test(prompts[0]));
  await p.locator('#btnSaveCast').click(); await p.waitForTimeout(400);
  console.log('toast:', await p.locator('.toast').last().textContent().catch(() => '?'));
  const lib = await p.evaluate(() => JSON.parse(localStorage.getItem('loomy.crew.v1')));
  console.log('library:', JSON.stringify(lib));
  // Change Maya's look in the library, as a returning star.
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('loomy.crew.v1')); c[0] = { ...c[0], name: 'Zed', color: '#9B5DE5', hat: 'crown', costume: 'suit' }; localStorage.setItem('loomy.crew.v1', JSON.stringify(c)); });
  await p.goto('http://127.0.0.1:8773/cartoon/'); await p.waitForTimeout(1500);
  if (await p.locator('#morePanel').isHidden()) await p.locator('#btnMore').click();
  console.log('chips:', await p.locator('.crew-chip').allInnerTexts(), 'useCrew checked:', await p.locator('#useCrew').isChecked());
  await p.screenshot({ path: 'crew-home.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
  prompts.length = 0;
  await make('Why the sky is blue');
  const pr = prompts.find(x => /recurring characters/.test(x)) || '';
  console.log('second prompt has crew rule with Zed:', /Zed/.test(pr), /crown/.test(pr));
  console.log('storyboard characters:', [...new Set(await p.locator('#board label.who').allInnerTexts())].map(s => s.split('\n')[0]).slice(0, 4));
  // Normalize unit check: writer ignored the crew (Maya/Leo), saved looks still win.
  const norm = await p.evaluate(async () => {
    const { Script } = await import('./js/script.js');
    const crew = JSON.parse(localStorage.getItem('loomy.crew.v1'));
    const s = Script.normalize({ cast: [{ id: 'a', name: 'Maya', hat: 'cap', color: '#E8A33D' }, { id: 'b', name: 'Leo', hat: 'hardhat' }], scenes: [{ line: 'One.' }, { line: 'Two.' }, { line: 'Three.' }] }, { crew });
    return s.cast.map(c => `${c.id}:${c.name}:${c.color}:${c.hat}:${c.costume}`);
  });
  console.log('normalized cast:', norm);
  // Toggle off and delete.
  await p.locator('#btnHome, .brand').first().click().catch(() => {});
  console.log('errors:', errs);
  await b.close();
})();
