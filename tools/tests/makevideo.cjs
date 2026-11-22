// Make a real Cartoons video from a written script (proof/<SCRIPT>), narrated by Loomy's free in-browser
// Kokoro voice (downloaded from Hugging Face; the network must allow huggingface.co, us.aws.cdn.hf.co and
// cdn.jsdelivr.net), with the page's own pipeline. CHARACTER= and MOOD= pick a narrator character and a score. No AI writer or picture
// service is called: the script is the one given, pictures fall back to Loomy's painted sets.
//   SCRIPT=ww1.json OUT=out/ww1 CHARACTER=storyteller MOOD=tickingclock node makevideo.cjs
const { chromium } = require('playwright'); const fs = require('fs');
const script = JSON.parse(fs.readFileSync('proof/' + (process.env.SCRIPT || 'ww1.json'), 'utf8'));
const out = process.env.OUT || 'out/video';
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy, bypass: '127.0.0.1' } : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => {
    try {
      const k = 'storyforge.settings.v1', s = JSON.parse(localStorage.getItem(k) || '{}');
      // settingsVersion matches the page's, so these choices are not reset to the defaults on load.
      localStorage.setItem(k, JSON.stringify({ ...s, settingsVersion: 10, ttsEngine: 'kokoro', captionStyle: 'punch', quality: '1080', fps: 30, speed: 'balanced', reviewFirst: false }));
    } catch { /* storage off */ }
  });
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/write')) {
      const body = JSON.parse(route.request().postData() || '{}'); const sys = JSON.stringify(body.messages || '');
      // A long-ish video is written in parts ("part k of n"): answer each part with its share of the scenes,
      // not the whole script again (that played the story three times over).
      const part = /part (\d+) of (\d+)/i.exec(sys);
      const share = part ? (() => { const k = +part[1], n = +part[2], L = script.scenes.length; return { ...script, scenes: script.scenes.slice(Math.round((k - 1) * L / n), Math.round(k * L / n)) }; })() : script;
      const text = /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(share);
      return route.fulfill({ json: { ok: true, text } });
    }
    return route.fulfill({ status: 503, json: { ok: false, error: 'not used for this video' } });
  });
  await ctx.route('https://*.wikipedia.org/**', r => r.fulfill({ status: 503, body: '' }));
  await ctx.route('https://upload.wikimedia.org/**', r => r.fulfill({ status: 503, body: '' }));
  const p = await ctx.newPage();
  const msgs = [];
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:8773/?test=1'); await p.waitForTimeout(2000);
  await p.click('#tab-cartoon').catch(() => {}); await p.waitForTimeout(1500);
  const f = p.frameLocator('#view-cartoon');
  if (process.env.CHARACTER) await f.locator('#character').selectOption(process.env.CHARACTER);
  if (process.env.MOOD) await f.locator('#mood').selectOption(process.env.MOOD);
  await f.locator('#topic').fill(script.title);
  const t0 = Date.now();
  await f.locator('#btnGo').click();
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => msgs.push('TIMEOUT'));
  console.log('seconds:', Math.round((Date.now() - t0) / 1000));
  const fr = p.frames().find(x => x.url().includes('/cartoon/'));
  const href = await f.locator('#btnDownload').getAttribute('href').catch(() => null);
  if (fr && href) {
    const b64 = await fr.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href);
    fs.writeFileSync(out + '.mp4', Buffer.from(b64, 'base64')); console.log('saved', out + '.mp4');
    await f.locator('.thumb-dl[href]').waitFor({ timeout: 180000 }).catch(() => console.log('no thumbnail yet'));
    const th = await fr.evaluate(async () => { const a = document.querySelector('.thumb-dl'); if (!a?.href) return null; const x = new Uint8Array(await (await fetch(a.href)).arrayBuffer()); let s = ''; for (let i = 0; i < x.length; i += 32768) s += String.fromCharCode.apply(null, x.subarray(i, i + 32768)); return btoa(s); }).catch(() => null);
    if (th) { fs.writeFileSync(out + '-thumbnail.jpg', Buffer.from(th, 'base64')); console.log('saved', out + '-thumbnail.jpg'); }
    const kit = await fr.evaluate(() => ({ title: document.getElementById('ytTitle').value, desc: document.getElementById('ytDesc').value, tags: document.getElementById('ytTags').value }));
    fs.writeFileSync(out + '-upload-kit.txt', `${kit.title}\n\n${kit.desc}\n\n${kit.tags}\n`);
  }
  console.log(await f.locator('#steps li').evaluateAll(l => l.map(x => x.dataset.step + ':' + x.className + ':' + x.querySelector('.d').textContent).join('\n')));
  console.log('PROBLEMS:', msgs.slice(0, 8));
  await b.close();
})();
