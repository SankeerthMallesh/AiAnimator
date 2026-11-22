// Stacks contact sheets into one image: node stack.cjs out.jpg a.jpg b.jpg ...
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, ...files] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  const imgs = files.filter(f => fs.existsSync(f)).map(f => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64'));
  const d = await p.evaluate(async (imgs) => { const els = await Promise.all(imgs.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }))); const W = Math.max(...els.map(e => e.width)); const H = els.reduce((h, e) => h + e.height + 4, 0); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); let y = 0; for (const e of els) { g.drawImage(e, 0, y); y += e.height + 4; } return c.toDataURL('image/jpeg', 0.85); }, imgs);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); await b.close();
})();
