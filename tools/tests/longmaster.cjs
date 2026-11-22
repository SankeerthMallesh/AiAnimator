// Long form (Loomy 1.0): a long video is written chapter by chapter with mocked AI, through the real page.
// Checks the writer was asked for each chapter with the story so far, and that every chapter's first scene
// carries its title. Stops at the storyboard (no render).   node longmaster.cjs 3d|blocky|cartoon
const { chromium } = require('playwright');
const tab = process.argv[2] || '3d';
const line = (c, i) => `Chapter ${c} line ${i}: the story moves on.`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const asks = [];
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/write')) {
      const msg = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      if (/fact-check|Check each line/i.test(msg)) return route.fulfill({ json: { ok: true, text: JSON.stringify({ notes: [], fixes: [], unverified: [] }) } });
      const c = Number((/CHAPTER (\d+)/.exec(msg) || [])[1] || 1), n = Number((/exactly (\d+) scenes/.exec(msg) || /next (\d+) scenes/.exec(msg) || /exactly (\d+) scenes/.exec(msg) || [])[1] || 8);
      asks.push({ c, n, soFar: (msg.match(/the story moves on/g) || []).length });
      const scenes = Array.from({ length: n }, (_, i) => ({ narration: line(c, i + 1), line: line(c, i + 1), visual: 'a scene', set: 'street', frame: 'talk', who: [{ id: 'a', x: 0.5, pose: 'idle' }], say: 'a' }));
      return route.fulfill({ json: { ok: true, text: JSON.stringify({ title: 'The Long Story', youtubeTitle: 'The Long Story', description: 'x', hashtags: ['#x'], chapter: `Chapter title ${c}`, characters: [{ name: 'Mia', look: 'woman, red coat' }], cast: [{ id: 'a', name: 'Mia' }], scenes }) } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const url = tab === 'cartoon' ? '/cartoon/' : tab === 'blocky' ? '/explainer/?style=blocky' : '/explainer/';
  await p.goto('http://127.0.0.1:8773' + url); await p.waitForTimeout(1500);
  await p.locator('.long-start').last().click();
  await p.locator('#btnMore').click().catch(() => {});
  await p.locator('#reviewFirst').check().catch(() => {});
  await p.fill('#topic', 'A long story');
  await p.click('#btnGo');
  await p.waitForFunction(() => window.loomyScript?.()?.scenes?.length > 0, null, { timeout: 180000 }).catch(() => errs.push('no script'));
  const s = await p.evaluate(() => { const sc = window.loomyScript(); return { n: sc?.scenes.length, chapters: sc?.scenes.filter(x => x.chapter).map(x => [x.chapter.n, x.chapter.title]) }; });
  const dur = await p.evaluate(() => document.querySelector('#duration')?.value);
  const chapters = s.chapters || [], want = asks.filter(a => true).length;
  const fails = [];
  if (asks.length < 3) fails.push(`only ${asks.length} writer calls`);
  if (asks.slice(1).some(a => a.soFar === 0)) fails.push('a later chapter did not get the story so far');
  if (chapters.length < 2) fails.push(`${chapters.length} chapter titles`);
  if (chapters.some(([n], i) => n !== i + 1)) fails.push('chapters out of order');
  if (errs.length) fails.push(errs.join(' | '));
  console.log(`${tab}: ${dur} s · ${asks.length} writer calls (${asks.map(a => `ch${a.c}:${a.n} scenes, ${a.soFar} earlier lines`).join('; ')})`);
  console.log(`scenes: ${s.n} · chapters: ${chapters.map(([n, t]) => `${n} "${t}"`).join(', ')}`);
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
