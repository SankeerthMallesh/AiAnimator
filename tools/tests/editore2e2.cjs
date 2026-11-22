// Editor end to end for E2-E5, through the real page: text boxes, the music track, speed, zoom and
// transitions, export (checks text in the picture and music in the sound), and a Loomy video handed
// over with its captions (Edit this video).
//   node editore2e2.cjs [base=http://127.0.0.1:8773]   (cliptest/make-editor.sh makes the sources)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const base = process.argv[2] || 'http://127.0.0.1:8773';
let bad = 0;
const check = (name, ok, val) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}: ${val}`); if (!ok) bad++; };
(async () => {
  fs.mkdirSync('out', { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/__access|404/.test(m.text())) errs.push(m.text()); });
  await p.route('**/api/**', r => r.fulfill({ json: {} }));
  await p.goto(base + '/editor/');
  const proj = () => p.evaluate(() => JSON.parse(JSON.stringify(window.loomyEditor.project)));

  await p.setInputFiles('#fileInput', [path.resolve('cliptest/ed_a.webm'), path.resolve('cliptest/ed_b.webm')]);
  await p.waitForFunction(() => window.loomyEditor.project.segments.length === 2, null, { timeout: 60000 });

  // E2: a text box at 1 s.
  await p.evaluate(() => window.loomyEditor.preview.show(1));
  await p.click('#btnText');
  await p.fill('#txText', 'BIG NEWS'); await p.press('#txText', 'Tab');
  await p.click('[data-look="box"]');
  let q = await proj();
  check('Text adds a box at the playhead', q.texts.length === 1 && Math.abs(q.texts[0].start - 1) < 0.05 && q.texts[0].text === 'BIG NEWS' && q.texts[0].look === 'box', JSON.stringify(q.texts[0]));
  check('the text shows on the text lane', await p.locator('.lane-block.text').count() === 1, 'lane block');

  // E3: music under the whole video.
  await p.setInputFiles('#musicInput', path.resolve('cliptest/ed_music.wav'));
  await p.waitForFunction(() => !!window.loomyEditor.project.music, null, { timeout: 30000 });
  q = await proj();
  check('Music adds a track', q.music?.name === 'ed_music.wav', JSON.stringify(q.music));
  await p.locator('#muVol').fill('0.8'); await p.locator('#muVol').dispatchEvent('change');
  await p.fill('#auOut', '1'); await p.press('#auOut', 'Tab');
  q = await proj();
  check('music volume and fade out are set', q.audio.musicVol === 0.8 && q.audio.fadeOut === 1, JSON.stringify(q.audio));

  // E4: the second part at 2x, pushing in, with a whip into it.
  const second = q.segments[1].id;
  await p.locator(`.seg[data-id="${second}"]`).click();
  await p.selectOption('#inSpeed', '2'); await p.selectOption('#inZoom', 'push-in'); await p.selectOption('#inTrans', 'whip');
  q = await proj();
  const s2 = q.segments[1];
  check('speed, zoom and transition are set', s2.speed === 2 && s2.zoom.kind === 'push-in' && s2.transition.kind === 'whip', JSON.stringify([s2.speed, s2.zoom, s2.transition]));
  const total = q.segments.reduce((n, x) => n + (x.out - x.in) / x.speed, 0);
  check('2x halves that part', Math.abs(total - (8 + 3)) < 0.1, `${total.toFixed(2)} s`);
  // The preview draws the whip: half way through it, the frame is a mix (no crash, not black).
  await p.evaluate(() => window.loomyEditor.preview.show(8.1));
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'out/editor-e4.png' });

  await p.click('#btnExport');
  await p.waitForFunction(() => window.loomyEditorExport || /failed|cancelled/i.test(document.querySelector('#exportStatus').textContent), null, { timeout: 300000 });
  check('export finishes', !!(await p.evaluate(() => window.loomyEditorExport)), await p.textContent('#exportStatus'));
  const b64 = await p.evaluate(async () => { const u = window.loomyEditorExport?.url; if (!u) return ''; const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); });
  if (b64) {
    fs.writeFileSync('out/editor-e2e2.mp4', Buffer.from(b64, 'base64'));
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'out/editor-e2e2.mp4']).toString());
    check('the MP4 is as long as the edit', Math.abs(dur - total) < 0.2, `${dur.toFixed(2)} s vs ${total.toFixed(2)}`);
    // The white text box: frame at 2 s has a bright box in the top part, frame at 0.5 s does not.
    const bright = (t) => { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', 'out/editor-e2e2.mp4', '-frames:v', '1', '-vf', 'crop=iw*0.6:ih*0.1:iw*0.2:ih*0.13,scale=60:20,format=rgb24', '-f', 'rawvideo', 'out/_px.raw']); const a = fs.readFileSync('out/_px.raw'); let n = 0; for (let i = 0; i < a.length; i += 3) if (a[i] > 225 && a[i + 1] > 225 && a[i + 2] > 225) n++; return n / (a.length / 3); }; // white, not yellow
    const on = bright(2), off = bright(0.5);
    check('the text box is in the picture at 2 s, not at 0.5 s', on > 0.15 && off < 0.02, `${(on * 100).toFixed(0)}% vs ${(off * 100).toFixed(0)}% white`);
    // The music: the 495 Hz tone is in the sound; the end fades out.
    const vol = (ss, t) => { const o = execFileSync('ffmpeg', ['-v', 'info', '-ss', String(ss), '-t', String(t), '-i', 'out/editor-e2e2.mp4', '-af', 'bandpass=f=495:w=40,volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); return o; };
    const lvl = (o) => Number((/mean_volume: (-?[\d.]+)/.exec(o) || [])[1]);
    let mid = NaN, end = NaN;
    try { mid = lvl(execFileSync('sh', ['-c', `ffmpeg -v info -ss 3 -t 1 -i out/editor-e2e2.mp4 -af bandpass=f=495:w=40,volumedetect -f null - 2>&1`]).toString()); end = lvl(execFileSync('sh', ['-c', `ffmpeg -v info -ss ${(total - 0.25).toFixed(2)} -t 0.2 -i out/editor-e2e2.mp4 -af bandpass=f=495:w=40,volumedetect -f null - 2>&1`]).toString()); } catch (e) { void vol; }
    check('the music is heard, and it fades out at the end', mid > -45 && end < mid - 6, `${mid} dB mid, ${end} dB in the last 0.25 s`);
  }
  await p.click('#exportClose');

  // E5: a Loomy video handed over with its captions (rendered without burned captions).
  await p.evaluate(async () => {
    const r = await fetch('../tools/tests/cliptest/ed_b.webm'); const blob = await r.blob();
    const { sendToEditor } = await import('../shared/handoff.js');
    await sendToEditor({ blob, name: 'How bees make honey.mp4', words: [{ text: 'Bees', start: 0.5, end: 0.8 }, { text: 'make', start: 0.85, end: 1.1 }, { text: 'honey.', start: 1.15, end: 1.5 }], captionsBurned: false, duration: 6, tab: '3d' });
  });
  await p.waitForFunction(() => window.loomyEditor.project.segments.length === 3, null, { timeout: 30000 }).catch(() => {});
  q = await proj();
  const src = q.segments[2]?.src;
  check('Edit this video brings the Loomy video in', q.sources[src]?.kind === 'loomy' && q.sources[src]?.name === 'How bees make honey.mp4', JSON.stringify(q.sources[src]));
  check('with its captions, on', q.captions.filter(c => c.src === src).map(c => c.text).join('|') === 'Bees make honey' && q.captionStyle.look !== 'off', q.captions.map(c => c.text).join('|') + ' / ' + q.captionStyle.look);
  await p.screenshot({ path: 'out/editor-e5.png' });

  check('no page errors', errs.length === 0, errs.join(' | ') || 'none');
  console.log(bad ? `FAIL (${bad})` : 'PASS');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
