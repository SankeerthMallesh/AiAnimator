// 1.1: cut parts out on the export page. A short drawn-3D video (mocked writer and voice) is made in
// the 3D tab; while it exports the cut bar is already up; then a part is dragged out, long pauses are
// found, the cut video is saved and checked: shorter by what was cut (picture and sound), Download
// points at it, and "Back to the full video" puts the whole one back.
//   node cutmaster.cjs [out/name]
const { chromium } = require('playwright'); const fs = require('fs');
const name = process.argv[2] || 'out/cut-3d';
const script = JSON.parse(fs.readFileSync('proof/drawn-3d.json', 'utf8'));
script.youtubeTitle = script.title; script.description = 'Test.'; script.hashtags = ['#Test', '#RomanConcrete'];
(async () => {
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/api/config')) return route.fulfill({ json: { googleClientId: null, sync: false, ai: true } });
    if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
    if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
    if (path.endsWith('/api/write')) {
      const sys = JSON.stringify(JSON.parse(route.request().postData() || '{}').messages || '');
      const text = /fact-check|Check each line/i.test(sys) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(script);
      return route.fulfill({ json: { ok: true, text } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  const p = await ctx.newPage();
  const msgs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|GPU stall|__access/.test(m.text())) msgs.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
  p.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
  await p.goto('http://127.0.0.1:8773/'); await p.waitForTimeout(2000);
  await p.click('#tab-3d'); await p.waitForTimeout(2500);
  const f = p.frameLocator('#view-3d');
  await f.locator('#style').selectOption('drawn-3d');
  await f.locator('#btnMore').click().catch(() => {});
  await f.locator('#quality').selectOption('720'); await f.locator('#fps').selectOption('24');
  await f.locator('#topic').fill(script.title);
  const fails = [];
  await f.locator('#btnGo').click();
  // During the export: the bar is up, the save button waits for the video.
  await f.locator('.cutter:not(.hidden)').waitFor({ timeout: 900000 }).catch(() => fails.push('no cut bar during the export'));
  const during = await f.locator('[data-k="save"]').textContent().catch(() => '');
  const renderDone = await f.locator('#btnDownload:not(.hidden)').isVisible().catch(() => false);
  console.log('during export:', JSON.stringify(during), 'video already done:', renderDone);
  if (!renderDone && !/when the export is done/.test(during)) fails.push('save button not waiting for the export');
  await f.locator('#btnDownload:not(.hidden)').waitFor({ timeout: 3600000 }).catch(() => fails.push('TIMEOUT'));
  const fr = p.frames().find(x => x.url().includes('/explainer/'));
  const tags = await f.locator('#ytTags').inputValue();
  console.log('hashtags:', tags);
  if (tags !== tags.toLowerCase()) fails.push('hashtags not lowercase');
  // The thumbnail: made from the video; a 9:16 video starts on a 9:16 cover (1080x1920), Wide makes 1280x720.
  await f.locator('.thumb-dl[href]').waitFor({ timeout: 120000 }).catch(() => fails.push('no thumbnail'));
  const thumbOf = () => fr.evaluate(async () => {
    const a = document.querySelector('.thumb-dl'); const blob = await (await fetch(a.href)).blob();
    const img = await createImageBitmap(blob);
    return { w: img.width, h: img.height, size: blob.size, type: blob.type, words: document.querySelector('.thumbkit [data-k="text"]').value, frames: document.querySelectorAll('.thumb-frame').length, name: a.download };
  });
  const th = await thumbOf();
  console.log('thumbnail:', JSON.stringify(th));
  if (th.w !== 1080 || th.h !== 1920 || th.size > 2e6 || th.type !== 'image/jpeg' || !th.words || th.frames < 2) fails.push('thumbnail is wrong');
  await f.locator('#metaCard').screenshot({ path: name + '-kit.png' }).catch(() => {});
  await f.locator('.thumbkit [data-k="shape"] [data-v="wide"]').click();
  await f.locator('.thumbkit [data-k="layout"] [data-v="split"]').click();
  await p.waitForTimeout(600);
  const wide = await thumbOf();
  console.log('wide thumbnail:', JSON.stringify(wide));
  if (wide.w !== 1280 || wide.h !== 720) fails.push('wide thumbnail is wrong');
  await f.locator('.thumbkit [data-k="text"]').fill('mine now');
  await p.waitForTimeout(600);
  if ((await thumbOf()).words !== 'MINE NOW') fails.push('thumbnail words not editable');
  await p.waitForTimeout(800);
  const full = await fr.evaluate(() => document.getElementById('outVideo').duration);
  console.log('full length:', full.toFixed(2));
  // Drag across 30%..45% of the bar and cut it out.
  const bar = f.locator('.cut-bar');
  const box = await bar.boundingBox();
  await p.mouse.move(box.x + box.width * 0.30, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.38, box.y + box.height / 2, { steps: 4 });
  await p.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 4 }); await p.mouse.up();
  await f.locator('[data-k="cut"]').click();
  await f.locator('[data-k="pauses"]').click();
  await p.waitForTimeout(300);
  const chips = await f.locator('.cut-chip').allTextContents();
  const sum = await f.locator('[data-k="sum"]').textContent();
  console.log('cuts:', chips.join(' | '), '·', sum);
  if (!chips.length) fails.push('no cut made');
  const out = Number((sum.match(/([\d.]+) s out/) || [])[1]);
  // The player skips the cut parts: play from just before the first cut.
  const first = chips[0].match(/(\d+):([\d.]+) – (\d+):([\d.]+)/);
  const a = +first[1] * 60 + +first[2], bEnd = +first[3] * 60 + +first[4];
  const skipped = await fr.evaluate(async ([a, b]) => {
    const v = document.getElementById('outVideo'); v.muted = true; v.currentTime = Math.max(0, a - 0.4);
    await new Promise(r => v.addEventListener('seeked', r, { once: true }));
    let inside = 0; const t0 = performance.now();
    await v.play();
    await new Promise(r => { const f = () => { if (v.currentTime > a + 0.05 && v.currentTime < b - 0.15) inside++; if (v.currentTime > b + 0.3 || performance.now() - t0 > 6000) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    v.pause();
    return { inside, at: v.currentTime };
  }, [a, bEnd]);
  console.log('preview skip:', JSON.stringify(skipped));
  if (skipped.inside > 3) fails.push('the player played inside a cut');
  const t0 = Date.now();
  await f.locator('[data-k="save"]').click();
  await f.locator('[data-k="save"]:text("Saved ✓")').waitFor({ timeout: 900000 }).catch(() => fails.push('save never finished'));
  console.log('cut seconds:', Math.round((Date.now() - t0) / 1000));
  const label = await f.locator('#btnDownload').textContent();
  const href = await f.locator('#btnDownload').getAttribute('href');
  const dl = await f.locator('#btnDownload').getAttribute('download');
  console.log('download:', label, dl);
  if (!/cut/.test(label) || !/-cut\.mp4$/.test(dl)) fails.push('Download is not the cut video');
  const check = await fr.evaluate(async (u) => {
    const blob = await (await fetch(u)).blob();
    const { readVideoTrack } = await import('../shared/mp4read.js');
    const tr = await readVideoTrack(blob);
    const snd = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await blob.arrayBuffer());
    const v = document.createElement('video'); v.src = u; await new Promise(r => { v.onloadedmetadata = r; });
    // Every frame step is one frame long: no holes from the cut.
    const gaps = tr.samples.map(s => s.time).sort((x, y) => x - y).map((t, i, arr) => (i ? t - arr[i - 1] : 0)).slice(1);
    return { frames: tr.samples.length, fps: tr.fps, video: tr.duration, sound: snd.duration, element: v.duration, maxGap: Math.max(...gaps), size: blob.size, codec: tr.codec };
  }, href);
  console.log('cut file:', JSON.stringify(check));
  const buf = Buffer.from(await fr.evaluate(async (u) => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href), 'base64');
  fs.writeFileSync(name + '.mp4', buf); console.log('saved', name + '.mp4');
  const want = full - out;
  if (Math.abs(check.video - want) > 0.15) fails.push(`video ${check.video.toFixed(2)} s, want ${want.toFixed(2)}`);
  if (Math.abs(check.sound - want) > 0.15) fails.push(`sound ${check.sound.toFixed(2)} s, want ${want.toFixed(2)}`);
  if (check.maxGap > 1.5 / check.fps) fails.push(`a hole in the frames (${check.maxGap.toFixed(3)} s)`);
  // Back to the full video.
  await f.locator('[data-k="reset"]').click();
  const back = await f.locator('#btnDownload').textContent();
  console.log('after reset:', back);
  if (/cut/.test(back) || (await f.locator('.cut-chip').count())) fails.push('reset did not bring the full video back');
  console.log('CONSOLE:', msgs.length ? '\n' + [...new Set(msgs)].join('\n') : 'clean');
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
