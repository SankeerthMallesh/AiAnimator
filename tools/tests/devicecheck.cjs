// Big upgrade: every page on a phone, a tablet (both ways) and a laptop. For each: no sideways
// scrolling, nothing visible past the right edge, tap targets big enough on touch sizes, and a
// screenshot. The Cartoons and 3D workspaces are checked with a storyboard open (mocked AI).
//   node devicecheck.cjs
const { chromium } = require('playwright'); const fs = require('fs');
const DEVICES = [['phone', 390, 844, true], ['tablet', 820, 1180, true], ['tablet-wide', 1180, 820, true], ['laptop', 1440, 900, false]];
const PAGES = [['hub', '/'], ['cartoon', '/cartoon/'], ['3d', '/explainer/'], ['blocky', '/explainer/?style=blocky'], ['clip', '/clip/'], ['edit', '/editor/'], ['board', '/board/']];
const script = JSON.parse(fs.readFileSync('proof/cartoon-space.json', 'utf8'));
const s3d = JSON.parse(fs.readFileSync('proof/drawn-3d.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const fails = [];
  for (const [dev, w, h, touch] of DEVICES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: dev === 'phone' });
    await ctx.addInitScript(() => { try { localStorage.setItem('storyforge.settings.v1', JSON.stringify({ reviewFirst: true })); localStorage.setItem('explainer.settings.v1', JSON.stringify({ reviewFirst: true })); } catch {} });
    await ctx.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname, body = route.request().postData() || '';
      if (path.endsWith('/api/config')) return route.fulfill({ json: { ai: true, sync: false } });
      if (path.endsWith('/api/me')) return route.fulfill({ json: { user: null } });
      if (path.endsWith('/api/speak')) return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('speech.mp3') });
      if (path.endsWith('/api/write')) return route.fulfill({ json: { ok: true, text: /fact-check|Check each line/i.test(body) ? JSON.stringify({ notes: [], fixes: [], unverified: [] }) : JSON.stringify(/\/cartoon\//.test(route.request().headers().referer || '') ? script : s3d) } });
      return route.fulfill({ status: 503, json: { ok: false } });
    });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    const audit = async (name) => {
      const r = await p.evaluate((touch) => {
        const W = innerWidth, out = { scrollW: document.documentElement.scrollWidth, over: [], small: [] };
        const vis = (el) => { const s = getComputedStyle(el), rc = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && rc.width > 1 && rc.height > 1 && !el.closest('[hidden], .hidden, dialog:not([open])'); };
        const scrollParent = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return e; } return null; };
        for (const el of document.querySelectorAll('body *')) {
          if (!vis(el) || scrollParent(el)) continue;
          const rc = el.getBoundingClientRect();
          if (rc.right > W + 1 && rc.left < W) out.over.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]} ${Math.round(rc.right)}`);
        }
        if (touch) for (const el of document.querySelectorAll('button, a[href], select, input[type=checkbox], [role=tab]')) {
          if (!vis(el)) continue;
          // A checkbox is tapped through its label.
          const rc = (el.type === 'checkbox' && el.closest('label') ? el.closest('label') : el).getBoundingClientRect();
          if (Math.min(rc.width, rc.height) < 30 && !el.closest('.ib-cats, .fb-rows, #stage .card')) out.small.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${el.textContent.trim().slice(0, 18) || el.getAttribute('aria-label') || ''} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
        }
        out.over = [...new Set(out.over)].slice(0, 6); out.small = [...new Set(out.small)].slice(0, 6);
        return out;
      }, touch);
      const bad = [];
      if (r.scrollW > w + 1) bad.push(`scrolls sideways (${r.scrollW}px)`);
      if (r.over.length) bad.push(`past the edge: ${r.over.join(', ')}`);
      if (r.small.length) bad.push(`small taps: ${r.small.join(', ')}`);
      console.log(`${dev} ${w}x${h} ${name}: ${bad.length ? bad.join(' | ') : 'ok'}`);
      if (bad.length) fails.push(`${dev} ${name}`);
      await p.screenshot({ path: `out/dev-${dev}-${name}.png` });
    };
    for (const [name, url] of PAGES) {
      await p.goto('http://127.0.0.1:8773' + url + (url.includes('?') ? '&' : '?') + 'test=1'); await p.waitForTimeout(1600);
      await audit(name);
    }
    // Workspaces with a storyboard open.
    for (const [name, url] of [['cartoon-work', '/cartoon/'], ['3d-work', '/explainer/']]) {
      await p.goto('http://127.0.0.1:8773' + url + '?test=1'); await p.waitForTimeout(1500);
      if (name === '3d-work') await p.selectOption('#style', 'drawn-3d').catch(() => {});
      await p.fill('#topic', 'Why astronauts cannot flush in space');
      await p.click('#btnGo');
      await p.locator('#board .scene, #board > *').first().waitFor({ timeout: 240000 }).catch(() => {});
      await p.waitForTimeout(2500);
      await audit(name);
    }
    if (errs.length) { console.log(`${dev} page errors:`, errs.slice(0, 3)); fails.push(`${dev} errors`); }
    await ctx.close();
  }
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
