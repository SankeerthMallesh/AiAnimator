// Big upgrade: the Feedback card grades the video from the script, then from the finished video, and
// "Fix it for me" asks the writer for a better script and makes the video again (mocked AI).
//   node fbmaster.cjs [3d|cartoon]
const { chromium } = require('playwright'); const fs = require('fs');
const tab = process.argv[2] === 'cartoon' ? 'cartoon' : '3d';
const script = JSON.parse(fs.readFileSync(tab === 'cartoon' ? 'proof/cartoon-objects.json' : 'proof/drawn-3d.json', 'utf8'));
script.youtubeTitle = 'THE STORY OF THE MAN WHO FELL THROUGH THE ICE ON A COLD WINTER NIGHT'; script.description = 'Test.'; script.hashtags = ['#Ice'];
(async () => {
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let revise = 0;
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
    if (path.endsWith('/api/write')) {
      const sys = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      if (/fact-check|Check each line/i.test(sys)) return route.fulfill({ json: { ok: true, text: JSON.stringify({ notes: [], fixes: [], unverified: [] }) } });
      if (/script doctor/.test(sys)) {
        revise++;
        const better = { ...script, youtubeTitle: 'Why He Fell Through the Ice', thumbText: 'THE ICE CRACKED', hashtags: ['#shorts', '#ice', '#survival'],
          scenes: script.scenes.map((s, i) => (i === 0 ? { ...s, narration: 'If you fall through ice, you have about ten minutes.', line: 'If you fall through ice, you have about ten minutes.' } : s)) };
        return route.fulfill({ json: { ok: true, text: JSON.stringify(better) } });
      }
      return route.fulfill({ json: { ok: true, text: JSON.stringify(script) } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  const p = await ctx.newPage();
  const msgs = [];
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:8773/'); await p.waitForTimeout(2000);
  await p.click(`#tab-${tab}`).catch(() => {}); await p.waitForTimeout(2500);
  const f = p.frameLocator(`#view-${tab}`);
  if (tab === '3d') await f.locator('#style').selectOption('drawn-3d');
  await f.locator('#btnMore').click().catch(() => {});
  await f.locator('#quality').selectOption('720'); await f.locator('#fps').selectOption('24');
  await f.locator('#topic').fill(script.title);
  await f.locator('#btnGo').click();
  const fails = [];
  await f.locator('.feedback:not(.hidden) .fb-row').first().waitFor({ timeout: 300000 }).catch(() => fails.push('no feedback after the script'));
  const g1 = await f.locator('.fb-grade').textContent().catch(() => '');
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => fails.push('TIMEOUT 1'));
  await p.waitForTimeout(500);
  const g2 = await f.locator('.fb-grade').textContent();
  const rows = await f.locator('.fb-row').count();
  const note = await f.locator('.fb-note').textContent();
  const fixShown = await f.locator('.fb-fix:not(.hidden)').count();
  console.log('grade after script:', g1, '| after video:', g2, '| sections:', rows, '| fix button:', fixShown, '|', note);
  await f.locator('.feedback').screenshot({ path: 'out/feedback-card.png' }).catch(() => {});
  if (rows !== 8) fails.push('not 8 sections');
  if (!fixShown) fails.push('no fix button on a weak video');
  else {
    await f.locator('.fb-fix').click();
    await f.locator('#btnDownload.hidden').waitFor({ timeout: 120000 }).catch(() => {});
    await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => fails.push('TIMEOUT 2'));
    await p.waitForTimeout(500);
    const g3 = await f.locator('.fb-grade').textContent();
    const title = await f.locator('#ytTitle').inputValue();
    console.log('after fix: grade', g3, '| title:', title, '| revise calls:', revise);
    if (revise !== 1) fails.push('the writer was not asked to revise');
    if (!/Why He Fell Through the Ice/.test(title)) fails.push('the revised script was not used');
    const order = 'A+ A A- B+ B B- C+ C C- D F'.split(' ');
    if (order.indexOf(g3) > order.indexOf(g2)) fails.push(`the grade went down (${g2} -> ${g3})`);
  }
  console.log('CONSOLE:', msgs.length ? msgs.join('\n') : 'clean');
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
