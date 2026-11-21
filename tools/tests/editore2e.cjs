// Editor end to end, through the real page (E1): add two videos, split, trim, reorder by dragging,
// delete, undo, then export and check the MP4.
//   node editore2e.cjs [base=http://127.0.0.1:8773]   (cliptest/make-editor.sh makes the sources)
// Writes out/editor-*.png and out/editor-export.mp4; prints PASS/FAIL per step.
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
  const segs = async () => (await proj()).segments;

  await p.setInputFiles('#fileInput', [path.resolve('cliptest/ed_a.webm'), path.resolve('cliptest/ed_b.webm')]);
  await p.waitForFunction(() => window.loomyEditor.project.segments.length === 2, null, { timeout: 60000 });
  let s = await segs();
  check('two videos become two parts', s.length === 2, s.map(x => `${x.in}-${x.out}`).join(', '));
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'out/editor-1440.png' });

  // Split at 3 s with the toolbar button.
  await p.evaluate(() => window.loomyEditor.preview.show(3));
  await p.click('#btnSplit');
  s = await segs();
  check('Split at 3 s', s.length === 3 && Math.abs(s[0].out - 3) < 0.05 && Math.abs(s[1].in - 3) < 0.05, s.map(x => `${x.in}-${x.out}`).join(' | '));

  // Trim: drag the first part's left edge 1 s to the right.
  const first = p.locator('.seg').first();
  const bb = await first.boundingBox();
  const pps = await p.evaluate(() => document.querySelector('.seg').getBoundingClientRect().width / 3);
  await p.mouse.move(bb.x + 4, bb.y + bb.height / 2); await p.mouse.down();
  await p.mouse.move(bb.x + 4 + pps * 0.5, bb.y + bb.height / 2, { steps: 4 });
  await p.mouse.move(bb.x + 4 + pps * 1, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.up();
  s = await segs();
  check('drag the left edge 1 s to trim', Math.abs(s[0].in - 1) < 0.15, `first part now ${s[0].in}-${s[0].out}`);

  // Reorder: drag the last part (video B) to the front.
  const order0 = s.map(x => x.id);
  const last = await p.locator('.seg').last().boundingBox(), lead = await p.locator('.seg').first().boundingBox();
  await p.mouse.move(last.x + last.width / 2, last.y + last.height / 2); await p.mouse.down();
  await p.mouse.move(last.x + last.width / 2 - 30, last.y + last.height / 2, { steps: 5 });
  await p.mouse.move(lead.x + 5, lead.y + lead.height / 2, { steps: 10 }); await p.mouse.up();
  s = await segs();
  check('drag the last part to the front', s[0].id === order0[2] && s.length === 3, s.map(x => `${x.in}-${x.out}`).join(', '));

  // Delete the selected (moved) part, then undo it.
  await p.locator('.seg').first().click();
  await p.click('#btnDelete');
  check('Delete removes the selected part', (await segs()).length === 2, `${(await segs()).length} parts`);
  await p.keyboard.press('Control+z');
  check('Ctrl+Z brings it back', (await segs()).length === 3, `${(await segs()).length} parts`);

  // Inspector: the part that runs 3-8 s of video A now starts at 4.0 s.
  const long = (await segs()).find(x => x.out > 7);
  await p.locator(`.seg[data-id="${long.id}"]`).click();
  await p.fill('#inIn', '4'); await p.press('#inIn', 'Enter');
  const after = (await segs()).find(x => x.id === long.id);
  check('typing a start time trims the part', Math.abs(after.in - 4) < 0.01, `${after.in}-${after.out}`);

  // Preview plays: the time moves.
  await p.evaluate(() => window.loomyEditor.preview.show(0));
  await p.click('#btnPlay'); await p.waitForTimeout(1500); await p.click('#btnPlay');
  const tNow = await p.evaluate(() => window.loomyEditor.preview.t);
  check('Play moves the playhead', tNow > 0.8, `${tNow.toFixed(2)} s after 1.5 s`);

  const want = await p.evaluate(() => { const q = window.loomyEditor.project; return q.segments.reduce((n, x) => n + (x.out - x.in) / x.speed, 0); });
  await p.click('#btnExport');
  await p.waitForFunction(() => window.loomyEditorExport || /failed|cancelled/i.test(document.querySelector('#exportStatus').textContent), null, { timeout: 300000 });
  const status = await p.textContent('#exportStatus');
  check('export finishes', !!(await p.evaluate(() => window.loomyEditorExport)), status);
  const b64 = await p.evaluate(async () => { const u = window.loomyEditorExport?.url; if (!u) return ''; const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); });
  if (b64) {
    fs.writeFileSync('out/editor-export.mp4', Buffer.from(b64, 'base64'));
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,avg_frame_rate', '-of', 'json', 'out/editor-export.mp4']).toString());
    const v = info.streams.find(x => x.codec_type === 'video'), a = info.streams.find(x => x.codec_type === 'audio');
    const dur = Number(info.format.duration);
    check('MP4 is 1080x1920 with sound', v && v.width === 1080 && v.height === 1920 && !!a, `${v?.width}x${v?.height}, audio ${!!a}`);
    check('MP4 length matches the timeline (±0.15 s)', Math.abs(dur - want) <= 0.15, `${dur.toFixed(2)} s vs ${want.toFixed(2)} s`);
  }
  await p.screenshot({ path: 'out/editor-export-1440.png' });
  await p.click('#exportClose');

  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.route('**/api/**', r => r.fulfill({ json: {} }));
  await m.goto(base + '/editor/'); await m.waitForTimeout(800);
  await m.setInputFiles('#fileInput', [path.resolve('cliptest/ed_b.webm')]);
  await m.waitForFunction(() => window.loomyEditor.project.segments.length === 1, null, { timeout: 60000 });
  await m.waitForTimeout(600);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  check('phone width: no sideways scroll', sw <= 390, `${sw} / 390`);
  await m.screenshot({ path: 'out/editor-390.png', fullPage: true });
  check('no page errors', !errs.length, errs.slice(0, 3).join(' | ') || 'none');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
