// Loomy Studio end-to-end, one sample production per engine (the AI writer and the voice service are faked so the
// test is free and repeatable; everything else is the real page): create a project, write the script, pick a hook,
// approve, make a character, plan scenes (actions), approve, make the voiceover, export subtitles, run the quality
// check, preview, export the package, hand over to the renderer; then analytics (CSV import + patterns) and phones.
//   node studiocheck.cjs [base=http://127.0.0.1:8773]
const { chromium, devices } = require('playwright'); const fs = require('fs');
const base = process.argv[2] || 'http://127.0.0.1:8773';
const STORY = {
  stick: { title: 'The Salted Mine', hooks: ['A miner got rich from a mine with no gold.', 'Why would anyone sell a mine for millions?', 'Abe grabbed the newspaper and froze.'], lines: ['In 1872 Abe worked a dusty mine in Colorado.', 'Abe picked up his newspaper and discovered the mine was worth millions.', 'He ran to the bank with the news.', 'Investors walked into the camp and opened the old cart.', 'They grabbed the shiny rocks and counted the gold.', 'But the gold was planted there by Abe the night before.', 'He sold the mine for a fortune and left town.', 'The investors dug for months and found nothing.'], twist: 'Abe salted the mine.', ending: 'The cheat wins and the buyers dig forever.', sfx: ['line 2: paper rustle'] },
  blocky: { title: 'The Oldest Secret', hooks: ['In this town, the youngest kid keeps the oldest secret.', 'Why does the youngest kid hold the only key?', 'Mia opened the forbidden basement door.'], lines: ['Every year the youngest kid gets a rusty key.', 'Mia is seven, and tonight the key is hers.', 'She walked to the town hall and opened the basement door.', 'She looked down the dark stairs and hesitated.', 'Then she crept down the stairs one step at a time.', 'You see, the basement was full of letters.', 'Each one was written by a kid who had kept the key.', 'Mia read the last one and gasped.', 'It was signed with her own name.'], twist: 'The letters are from her future self.', ending: 'The rule loops back to her.', sfx: ['line 3: door creak'] },
  cinema: { title: 'Room-Sized Computers', hooks: ['The first computers filled entire rooms.', 'How big was a computer in 1946?', 'Engineers walked inside the computer to fix it.'], lines: ['ENIAC weighed about 27 tons.', 'It filled a room the size of a small house.', 'An engineer walked along its panels to find a fault.', 'He opened a panel and examined the vacuum tubes.', 'He pressed a switch and the machine responded with blinking lights.', 'Here\'s the crazy part: your phone is millions of times faster.', 'And it fits in your pocket.'], twist: 'A phone beats it by millions of times.', ending: 'Scale flips completely.', sfx: ['line 5: relays click'], facts: ['ENIAC weighed about 27 tons'] },
};
const wav = (() => { const sr = 24000, n = sr * 3, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();
(async () => {
  const b = await chromium.launch(), bad = [], log = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  let engine = 'stick';
  await ctx.route('**/api/config', (r) => r.fulfill({ json: { ai: true } }));
  await ctx.route('**/api/me', (r) => r.fulfill({ json: { user: null } }));
  await ctx.route('**/api/write', async (r) => {
    const body = JSON.parse(r.request().postData()), u = body.messages.map((m) => m.content).join('\n');
    if (/narration segment/.test(u)) {
      const n = (u.match(/^\d+\. /gm) || []).length;
      return r.fulfill({ json: { ok: true, text: JSON.stringify({ scenes: Array.from({ length: n }, (_, i) => ({ n: i + 1, description: `shot ${i + 1}`, characters: [], shot: i % 2 ? 'medium' : 'medium', move: 'slow push-in', lighting: 'warm', background: 'a mining camp', positions: 'centre', expressions: 'focused', movement: 'acts', reason: 'show it', sfx: '' })) }) } });
    }
    return r.fulfill({ json: { ok: true, text: JSON.stringify(STORY[engine]) } });
  });
  await ctx.route('**/api/speakall', (r) => {
    const lines = JSON.parse(r.request().postData()).lines; let t = 0;
    const words = lines.map((l) => l.split(/\s+/).map((w) => { const s = t; t += 0.3; return [+s.toFixed(2), +(s + 0.28).toFixed(2), w]; }));
    return r.fulfill({ body: wav, headers: { 'Content-Type': 'audio/wav', 'X-Loomy-Voice': 'elevenlabs', 'X-Loomy-Words': JSON.stringify(words), 'X-Loomy-Cuts': '[]', 'Access-Control-Expose-Headers': '*' } });
  });
  const p = await ctx.newPage();
  process.on('unhandledRejection', (e) => { console.log(log.join('\n')); console.log('FAILED:', e.message.split('\n')[0]); console.log('PROBLEMS:', bad.slice(0, 12)); process.exit(1); });
  p.on('pageerror', (e) => bad.push(`[pageerror] ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) bad.push(`[console] ${m.text().slice(0, 200)}`); });
  p.on('dialog', (d) => d.accept());
  await p.goto(`${base}/studio/`); await p.waitForSelector('.engines');
  const dl = async (fn) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), fn()]); const path = `out/studio-${d.suggestedFilename()}`; await d.saveAs(path); return path; };
  for (const e of ['stick', 'blocky', 'cinema']) {
    engine = e;
    await p.click('[data-go="dash"]'); await p.click(`[data-eng="${e}"]`);
    if (e !== 'cinema') { // a character for this engine
      await p.click('[data-go="cast"]'); await p.click('#add'); await p.fill('#cName', e === 'stick' ? 'Abe' : 'Mia'); await p.fill('#cPers', 'stubborn and curious'); await p.click('#cSave');
      await p.waitForSelector('.char'); log.push(`${e}: character saved, reference drawn on ${await p.locator('.char .ref canvas').count()} canvas(es)`);
      await p.click('[data-go="dash"]');
    }
    await p.fill('#newIdea', STORY[e].hooks[0]); await p.click('#newForm button[type=submit]');
    await p.waitForSelector('#gen');
    if (e !== 'cinema') await p.check('[data-cast]');
    await p.click('#gen'); await p.waitForSelector('.hook');
    const hooks = await p.locator('.hook .score').allTextContents();
    await p.click('.hook[data-h="2"]'); await p.waitForSelector('.hook.on[data-h="2"]');
    await p.click('#approve'); await p.waitForSelector('#approve[disabled]');
    log.push(`${e}: script written, hooks scored ${hooks.join(' ')}, hook 3 picked, approved; retention ${await p.locator('#ret .score').textContent()}`);
    await p.click('[data-go="scenes"]'); await p.click('#plan'); await p.waitForSelector('.scene');
    const scenes = await p.locator('.scene').count(), steps = await p.locator('.scene details summary').first().textContent();
    const shots = await p.locator('.scene [data-k="shot"]').evaluateAll((l) => l.map((x) => x.value));
    const repeats = shots.filter((s, i) => i && s === shots[i - 1]).length;
    log.push(`${e}: ${scenes} scenes, ${repeats} back-to-back repeated shots; scene 1 ${steps.trim().slice(0, 110)}`);
    await p.click('#apS');
    await p.click('[data-go="voice"]'); await p.click('#vGo'); await p.waitForSelector('#vAud');
    log.push(`${e}: voiceover: ${await p.locator('#vOut .note').textContent()} · subtitles: ${await p.locator('.chip.ok, .chip.warn').first().textContent()} (${await p.locator('[data-f="text"]').count()} cues)`);
    const srt = await dl(() => p.click('[data-x="srt"]')); const ass = await dl(() => p.click('[data-x="ass"]'));
    log.push(`${e}: SRT ${fs.readFileSync(srt, 'utf8').split('\n\n').length} cues; ASS has karaoke: ${/\\k\d/.test(fs.readFileSync(ass, 'utf8'))}`);
    await p.click('[data-go="qc"]'); await p.waitForSelector('.bars');
    log.push(`${e}: QC ${await p.locator('.head .chip').textContent()} · ${(await p.locator('.bars .b').allTextContents()).map((x) => x.replace(/\s+/g, ' ')).join(' / ')}`);
    await p.click('[data-go="render"]'); await p.waitForSelector('#pv');
    await p.click('#play'); await p.waitForTimeout(1200); await p.click('#play');
    const zip = await dl(() => p.click('#pkg'));
    log.push(`${e}: package ${fs.statSync(zip).size} bytes`);
    await p.click('#rnd');
    const hand = await p.evaluate(() => JSON.parse(sessionStorage.getItem('loomy.studio.handoff') || 'null'));
    log.push(`${e}: hand-over to "${hand?.tool}" with ${hand?.text.split(' ').length} words, ${hand?.cast.length} cast`);
    await p.goto(`${base}/studio/`); await p.waitForSelector('.engines');
    await p.screenshot({ path: `out/studio-${e}.png` });
  }
  // analytics
  await p.click('[data-go="analytics"]');
  const csv = 'Content,Video title,Video publish time,Duration,Views,Subscribers,Average view duration,Average percentage viewed (%),Stayed to watch (%),Likes,Comments added\nTotal,,,,1000,,,,,,\n' + [['a', 'In this town, nobody sleeps', 58, 120000, 300, '0:00:45', 78, 70, 4000, 120], ['b', 'Why miners lied?', 47, 40000, 80, '0:00:30', 64, 61, 1200, 40], ['c', 'In this town, keys glow', 62, 90000, 210, '0:00:47', 76, 68, 3100, 90], ['d', 'ENIAC was huge', 40, 15000, 20, '0:00:22', 55, 50, 300, 10], ['e', 'In this town, mirrors lie', 59, 110000, 260, '0:00:46', 79, 72, 3900, 140], ['f', 'How phones beat rooms?', 44, 20000, 30, '0:00:25', 58, 52, 500, 15]].map((r) => `${r[0]},"${r[1]}",2026-11-01,${r[2]},${r[3]},${r[4]},${r[5]},${r[6]},${r[7]},${r[8]},${r[9]}`).join('\n');
  fs.writeFileSync('out/studio-yt.csv', csv);
  await p.setInputFiles('#fileIn', 'out/studio-yt.csv').catch(() => {});
  await p.evaluate(() => document.getElementById('imp').click()); await p.setInputFiles('#fileIn', 'out/studio-yt.csv'); await p.waitForSelector('[data-k="title"]');
  log.push(`analytics: ${await p.locator('[data-k="title"]').count()} videos imported; recommendations: ${(await p.locator('.card ul li').allTextContents()).join(' | ').slice(0, 300)}`);
  await p.screenshot({ path: 'out/studio-analytics.png' });
  // phone
  const m = await b.newContext({ ...devices['iPhone 13'] }); const mp = await m.newPage(); mp.on('pageerror', (e) => bad.push(`[phone] ${e.message}`));
  await mp.goto(`${base}/studio/`); await mp.waitForSelector('.engines');
  log.push(`phone: sideways scroll ${await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)}`);
  await mp.screenshot({ path: 'out/studio-phone.png' });
  console.log(log.join('\n')); console.log('PROBLEMS:', bad.slice(0, 12));
  await b.close();
})();
