// Unit tests: node tools/tests/unit/run.mjs [filter]
// Runs every *.test.mjs here. Each exports `tests`: [{ name, fn }]; fn throws (node:assert) on failure.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const dir = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || '';
let pass = 0, fail = 0;
for (const f of readdirSync(dir).filter(n => n.endsWith('.test.mjs')).sort()) {
  let mod;
  try { mod = await import(pathToFileURL(join(dir, f)).href); }
  catch (e) { console.log(`FAIL  ${f}: could not load (${e.message.split('\n')[0]})`); fail++; continue; }
  for (const t of mod.tests || []) {
    const name = `${f.replace('.test.mjs', '')} :: ${t.name}`;
    if (filter && !name.includes(filter)) continue;
    try { await t.fn(); console.log(`PASS  ${name}`); pass++; }
    catch (e) {
      const detail = e.code === 'ERR_ASSERTION' && 'expected' in e && typeof e.expected !== 'object'
        ? `got ${JSON.stringify(e.actual)}, expected ${JSON.stringify(e.expected)}${e.generatedMessage ? '' : ` (${String(e.message).split('\n')[0]})`}`
        : String(e.message || e).split('\n').slice(0, 3).join('\n        ');
      console.log(`FAIL  ${name}\n        ${detail}`); fail++;
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
