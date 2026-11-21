// S19 front-end check (and the Edit page, E1): each page opened directly, at 390 px and 1440 px wide.
//   node uicheck.cjs [base=http://127.0.0.1:8773]   (screenshots in out/ui-*.png)
// Checks: the shared pill-tab header with text labels, the page title, no sideways scroll, every
// visible tab and button at least 44 px tall, every visible text at least 4.5:1 contrast against
// what is behind it, and no placeholder cut off.
const { chromium } = require('playwright');
const fs = require('fs');
const base = process.argv[2] || 'http://127.0.0.1:8773';
const PAGES = [['Cartoons', '/cartoon/', 'Loomy · Cartoons'], ['3D', '/explainer/', 'Loomy · 3D'], ['Blocky', '/explainer/?style=blocky', 'Loomy · Blocky'], ['Clips', '/clip/', 'Loomy · Clips'], ['Edit', '/editor/', 'Loomy · Edit']];
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  fs.mkdirSync('out', { recursive: true });
  for (const width of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 1 });
    await ctx.route('**/api/config', r => r.fulfill({ json: { ai: true } }));
    await ctx.route('**/api/me', r => r.fulfill({ json: { user: null } }));
    for (const [name, path, title] of PAGES) {
      const p = await ctx.newPage();
      await p.goto(base + path); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const vis = (el) => { const s = getComputedStyle(el), rc = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && rc.width > 1 && rc.height > 1 && !el.closest('[hidden], dialog:not([open]), .hidden'); };
        const parse = (c) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : [0, 0, 0, 0]; };
        const lum = ([r, g, bl]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
        const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let out = [0, 0, 0]; for (const c of layers.reverse()) out = out.map((v, i) => v * (1 - c[3]) + c[i] * c[3]); return out; };
        const ratio = (a, b2) => { const [x, y] = [lum(a), lum(b2)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const header = document.querySelector('.loomy-topbar, header.top');
        const tabs = header ? [...header.querySelectorAll('a, button')].filter(vis).map(t => t.textContent.trim()) : [];
        const small = [...document.querySelectorAll('button, a.btn, a.nav-btn, a.tab, [role=tab], select, input[type=text], input[type=url], .slot-btn, label.drop')].filter(vis).filter(el => el.getBoundingClientRect().height < 44 - 0.5).map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].slice(0, 2).join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(el.getBoundingClientRect().height)}px`);
        const lowContrast = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement; if (!el || seen.has(el) || !n.textContent.trim() || !vis(el) || el.closest('svg, script, style, option, canvas')) continue;
          seen.add(el);
          const cs = getComputedStyle(el), fg = parse(cs.color);
          if (fg[3] < 0.05) continue;
          const bg = bgOf(el), fgm = fg.map((v, i) => (i < 3 ? v * fg[3] + bg[i] * (1 - fg[3]) : v));
          const cr = ratio(fgm, bg);
          if (cr < 4.5) lowContrast.push(`"${n.textContent.trim().slice(0, 24)}" ${cr.toFixed(2)}:1 (${parseFloat(cs.fontSize)}px)`);
        }
        const cut = [...document.querySelectorAll('input[placeholder], textarea[placeholder]')].filter(vis).filter(el => {
          if (el.tagName === 'TEXTAREA') return false;
          const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          return c.measureText(el.placeholder).width > el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;
        }).map(el => `#${el.id} "${el.placeholder}"`);
        return { title: document.title, tabs, scroll: document.documentElement.scrollWidth, vw: innerWidth, small, lowContrast: lowContrast.slice(0, 12), nLow: lowContrast.length, cut };
      });
      await p.screenshot({ path: `out/ui-${name}-${width}.png` });
      const rows = [
        ['shared pill-tab header with text labels', ['Cartoons', '3D', 'Blocky', 'Clips', 'Edit', 'Board'].every(t => r.tabs.some(x => x === t)), r.tabs.join(', ') || 'none'],
        [`title "${title}"`, r.title === title, r.title],
        ['no sideways scroll', r.scroll <= r.vw, `${r.scroll} / ${r.vw}`],
        ['tabs and buttons >= 44 px', !r.small.length, r.small.slice(0, 6).join('; ') || 'all'],
        ['text contrast >= 4.5:1', !r.nLow, r.nLow ? `${r.nLow}: ${r.lowContrast.join('; ')}` : 'all'],
        ['no placeholder cut off', !r.cut.length, r.cut.join('; ') || 'none'],
      ];
      console.log(`${name} @ ${width}px`);
      for (const [n, ok, v] of rows) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}: ${v}`); if (!ok) bad++; }
      await p.close();
    }
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
