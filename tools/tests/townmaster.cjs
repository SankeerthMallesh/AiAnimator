// L5: a whole Cartoons video in the 3D cartoon town look (the new default) with mocked AI, at 720p 24 fps
// so it finishes on a CPU. Checks the steps (no backgrounds painted, film sound with effects, render),
// saves the MP4 and stills, prints console problems.   node townmaster.cjs [out/name] [captions]
const { chromium } = require('playwright'); const fs = require('fs');
const name = process.argv[2] || 'out/town', captions = process.argv[3] === 'captions';
// No picture may be asked for: the town look paints no backgrounds (not even early, while the script is written).
const lines = ['One windy morning, the old bridge started to sway.', 'Maya told Leo to get off it, right now!', 'Then, with a crack, the middle fell into the river!', 'By evening, the whole town came to help rebuild it.'];
const script = { title: 'The Day the Bridge Fell', youtubeTitle: 'The Day the Bridge Fell', description: 'A short story.', hashtags: ['#shorts'],
  cast: [{ id: 'a', name: 'Maya', color: '#E8A33D', hat: 'cap', hair: 'curly', costume: 'shirt' }, { id: 'b', name: 'Leo', color: '#3E8FE0', hat: 'hardhat', hair: 'short', costume: 'shirt' }],
  scenes: lines.map((line, i) => ({ line, narration: line, visual: line, set: ['city', 'bridge', 'night', 'field'][i], say: i % 2 ? 'b' : 'a',
    who: i === 3 ? [{ id: 'a', x: 0.3, pose: 'cheer' }, { id: 'b', x: 0.7, pose: 'cheer' }, { id: 'a', x: 0.5, pose: 'cheer' }] : i === 1 ? [{ id: 'a', x: 0.3, pose: 'point' }, { id: 'b', x: 0.7, pose: 'shock' }] : [{ id: i % 2 ? 'b' : 'a', x: 0.5, pose: i === 2 ? 'shock' : 'idle' }] })) };
(async () => {
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const images = [];
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
    if (path.endsWith('/api/image')) { images.push(path); return route.fulfill({ status: 500, json: { ok: false } }); }
    if (path.endsWith('/api/write')) {
      const sys = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      return route.fulfill({ json: { ok: true, text: /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script) } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  await ctx.route('https://*.wikipedia.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"query":{"search":[],"pages":[]}}' }));
  const p = await ctx.newPage();
  const msgs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|GPU stall|__access|404/.test(m.text())) msgs.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:8773/'); await p.waitForTimeout(2500);
  const f = p.frameLocator('#view-cartoon');
  const look = await f.locator('#look').inputValue();
  console.log('default look:', look);
  await f.locator('#look').selectOption('town3d'); // opt-in since the crash report: this test is about the town
  await f.locator('#btnMore').click().catch(() => {});
  await f.locator('#quality').selectOption('720'); await f.locator('#fps').selectOption('24');
  if (captions) await f.locator('#townCaptions').check();
  await f.locator('#topic').fill(script.title);
  const t0 = Date.now();
  await f.locator('#btnGo').click();
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => msgs.push('TIMEOUT'));
  console.log('seconds:', Math.round((Date.now() - t0) / 1000));
  const fr = p.frames().find(x => x.url().includes('/cartoon/'));
  const href = await f.locator('#btnDownload').getAttribute('href').catch(() => null);
  if (fr && href) {
    const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href);
    fs.writeFileSync(name + '.mp4', Buffer.from(b64, 'base64'));
    console.log('saved', name + '.mp4');
  }
  const steps = await f.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ':' + x.className + ':' + (x.querySelector('.d')?.textContent || '')));
  console.log(steps.join('\n'));
  const log = await f.locator('#log').textContent().catch(() => '');
  console.log('shots:', (log.match(/Shots: [^\n]*/) || [''])[0].slice(0, 700));
  const fails = [];
  if (!['painted', 'auto'].includes(look)) fails.push('default look ' + look); // 1.3: Auto picks the town only where it can be drawn
  if (images.length) fails.push(`${images.length} picture requests`);
  if (!steps.some(s => s.startsWith('plates:') && /3D cartoon town/.test(s))) fails.push('backgrounds not skipped');
  if (!steps.some(s => s.startsWith('sound:') && /film score/.test(s) && /sound effects/.test(s))) fails.push('no film sound');
  if (!steps.some(s => s.startsWith('render:done'))) fails.push('render not done');
  if (!(await f.locator('#btnEdit:not(.hidden)').count())) fails.push('no Edit button');
  console.log('CONSOLE:', msgs.length ? '\n' + [...new Set(msgs)].join('\n') : 'clean');
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
