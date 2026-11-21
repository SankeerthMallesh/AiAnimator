const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2] || 'cliptest/stream.webm', framing = process.argv[3] || 'auto', live = process.argv[4] === 'live';
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: '127.0.0.1' } : undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 }, ignoreHTTPSErrors: true });
  const errs = [], calls = { transcribe: 0, write: 0 };
  if (live) {
    const line = require('fs').readFileSync('live.txt', 'utf8').split('\n').find(l => /loomy_pass/.test(l)).split('\t');
    const cookie = `loomy_pass=${line[6].trim()}`;
    await ctx.route('http://127.0.0.1:8773/api/**', async (route) => {
      const req = route.request(); const u = new URL(req.url());
      calls[u.pathname.split('/').pop()] = (calls[u.pathname.split('/').pop()] || 0) + 1;
      try { const r = await route.fetch({ url: 'https://loomy-app.pages.dev' + u.pathname, headers: { ...req.headers(), cookie, origin: 'https://loomy-app.pages.dev' }, timeout: 180000 }); await route.fulfill({ response: r }); }
      catch (e) { console.log('relay fail', e.message); await route.abort(); }
    });
  } else {
  await ctx.route('**/api/transcribe', async (route) => {
    calls.transcribe++;
    const words = []; const segments = [];
const SUBJ = ['Bro', 'Chat', 'Okay so', 'Wait', 'Honestly', 'Listen', 'No way', 'Yo', 'Alright', 'Look'];
      const MID = ['this thing is literally indestructible', 'watch what happens when I drop it', 'it survived that somehow', 'we are going one floor higher', 'the glass did not even crack', 'I need to try fire next', 'my hands are shaking right now', 'that was the loudest bang ever', 'the box says it is waterproof', 'somebody clip that right now', 'I paid forty dollars for this', 'the neighbors are going to hate me', 'it bounced off the car roof', 'we have one shot left', 'the timer says ten seconds', 'I really thought it would explode'];
      const END = ['!', '.', '?', '!!', '.'];
      const lineAt = (k) => `${SUBJ[(k * 7) % SUBJ.length]} ${MID[(k * 5 + Math.floor(k / 16)) % MID.length]}${END[k % END.length]}`;
    if (process.env.NOSPEECH) return route.fulfill({ json: { ok: true, model: 'mock', language: 'english', duration: 40, text: '', words: [], segments: [] } });
    let t = 0.5, k = 0;
    while (t < 598) {
      const line = lineAt(k++); const st = t;
      for (const w of line.split(' ')) { words.push({ w, s: t, e: t + 0.32 }); t += 0.38; }
      segments.push({ s: st, e: t, t: line }); t += 0.6;
    }
    await route.fulfill({ json: { ok: true, model: 'mock', language: 'english', duration: 600, text: 'x', words, segments } });
  });
  await ctx.route('**/api/write', async (route) => {
    calls.write++;
    const body = JSON.parse(route.request().postData());
    const times = [...body.messages[1].content.matchAll(/\[(\d+\.\d)\]/g)].map(m => +m[1]);
    const a = times[0], z = times[times.length - 1];
    const clips = [{ start: a + 3, end: Math.min(z, a + 38), payoffEnd: Math.min(z, a + 24.6), heading: 'He Tried To Break It 💀', score: 9, why: 'Big reaction and a payoff.', highlight: ['indestructible', 'insane', 'fire'], emoji: [{ t: a + 8, e: '💀' }, { t: a + 16, e: '😳' }] },
                   { start: a + 60, end: Math.min(z, a + 92), payoffEnd: Math.min(z, a + 81.3), heading: 'It Survived EVERYTHING', score: 7, why: 'Suspense then a surprise.', highlight: ['survived'], emoji: [{ t: a + 70, e: '🔥' }] },
                   { start: a + 100, end: Math.min(z, a + 125), payoffEnd: Math.min(z, a + 119.2), heading: 'Chat Called It First', score: 6, why: 'A callback.', highlight: [], emoji: [] }];
    await route.fulfill({ json: { ok: true, text: JSON.stringify({ clips }) } });
  });
  }
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/__access/.test(m.text())) errs.push(`[console] ${m.text().slice(0, 200)}`); });
  p.on('response', r => { if (r.status() >= 400 && !/__access/.test(r.url())) errs.push(`[${r.status()}] ${r.url().slice(0, 100)}`); });
  await p.goto('http://127.0.0.1:8773/clip/' + (process.env.JSLEVEL ? '?jslevel=1' : ''));
  await p.setInputFiles('#fileInput', path.resolve(file));
  await p.waitForFunction(() => !document.querySelector('#btnGo').disabled, null, { timeout: 60000 });
  console.log('file meta:', await p.textContent('#fileMeta'));
  await p.selectOption('#count', process.env.COUNT || '3'); await p.selectOption('#framing', framing); if (process.env.HEADSTYLE) await p.selectOption('#headStyle', process.env.HEADSTYLE);
  if (process.env.EMOJI) await p.check('#optEmoji');
  const t0 = Date.now();
  await p.click('#btnGo');
  await p.waitForFunction(() => { const li = document.querySelector('#steps li[data-step="clips"]'); return li.classList.contains('done') || document.querySelector('#steps li.fail'); }, null, { timeout: 900000 });
  console.log('time:', Math.round((Date.now() - t0) / 1000), 's', 'heap MB:', Math.round((await p.evaluate(() => performance.memory?.usedJSHeapSize || 0)) / 1e6));
  console.log(await p.$$eval('#steps li', l => l.map(x => `${x.dataset.step}: ${x.className} ${x.querySelector('.d').textContent}`).join('\n')));
  console.log('log tail:', await p.$$eval('#log div', l => l.slice(-10).map(x => x.textContent).join(' | ')));
  const hrefs = await p.$$eval('.card .dl', l => l.map(a => a.href));
  console.log('clips:', hrefs.length, 'calls:', JSON.stringify(calls));
  for (const [i, h] of hrefs.entries()) {
    const b64 = await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, h);
    require('fs').writeFileSync(`cliptest/out_${framing}_${i}.mp4`, Buffer.from(b64, 'base64'));
    const man = await p.evaluate((k) => (window.loomyClipManifests || [])[k] || null, i);
    if (man) require('fs').writeFileSync(`cliptest/out_${framing}_${i}.loomy-manifest.json`, JSON.stringify(man, null, 1));
  }
  await p.screenshot({ path: `cliptest/page_${framing}.png`, fullPage: true });
  console.log('cards:', JSON.stringify(await p.$$eval('.card', l => l.map(c => ({ score: c.querySelector('.score').textContent, when: c.querySelector('.when').textContent, heading: c.querySelector('input').value, why: c.querySelector('.why').textContent }))), null, 1));
  console.log('errors:', errs);
  await b.close();
})();
