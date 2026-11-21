// Brief guard: fails on anything the owner ruled out.
//   node tools/tests/briefguard.mjs [render logs or folders ...]
// With no arguments it checks the site's own text (pages, titles, prompts). With paths it also
// checks every *.loomy-manifest.json found. Exit code 1 if anything breaks the brief.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const GAGS = /\b(achoo|a+choo+|sneez\w*|gesundheit|bless you)\b/i;
const BRANDS = /\b(roblox|profound)\b/i;
const BLOCKY_WORDS = /\b(blocky|pixel|pixels|pixelated|voxels?)\b/i;
const BANNED_3D = [/\bbeckons?\b/i, /\bembrac\w*/i, /\bdance of\b/i, /\btestament to\b/i, /\bRemember,/, /\bIn the end,/, /\bjourney\b/i];

// A sticker or prop must stand for a thing named in its line, used literally.
const COLOURS = new Set('red orange yellow green blue purple violet pink brown black white grey gray gold golden silver crimson scarlet teal cyan magenta beige'.split(' '));
const ADJECTIVES = new Set('cool hot cold warm big small huge tiny fast slow sweet sour bitter sharp bright dark happy sad angry funny weird strange crazy wild smart dumb good bad great awesome amazing nice cute ugly heavy light loud quiet soft hard new old young rich poor tall short long fresh dry wet sick'.split(' '));
const FIGURATIVE = [
  /\b(orange|red|pink|golden|purple) (sunsets?|skies|sky|glow|light|dawn|dusk)\b/,
  /\b(felt|feel|feeling|feels|is|was|looked|looking) blue\b/, /\bcool (idea|move|trick|thing|guy|kid)\b/,
  /\bapple of (my|his|her|your|their|our) eyes?\b/, /\bbrain ?freeze\b/, /\btime flies\b/,
  /\bpiece of cake\b/, /\bbreak the ice\b/, /\bcold feet\b/, /\bunder the weather\b/, /\braining cats and dogs\b/,
  /\bon fire\b/, /\bheart of gold\b/, /\bspill the beans\b/, /\bhot potato\b/, /\bbig cheese\b/, /\bin hot water\b/,
];
export function propViolation(trigger, narration) {
  const w = String(trigger || '').toLowerCase().trim();
  const n = String(narration || '').toLowerCase();
  if (!w) return 'has no trigger word';
  if (!new RegExp(`\\b${w.replace(/[^a-z0-9' -]/g, '')}\\b`).test(n)) return `trigger word "${w}" is not in the line`;
  if (COLOURS.has(w)) return `trigger word "${w}" is a colour`;
  if (ADJECTIVES.has(w)) return `trigger word "${w}" is an adjective`;
  for (const re of FIGURATIVE) { const m = re.exec(n); if (m && new RegExp(`\\b${w}\\b`).test(m[0])) return `"${w}" is used figuratively ("${m[0]}")`; }
  return '';
}

// Emoji in Clips are reactions; they must not picture a word being said near them.
const MIRRORS = [[/🤔/u, /\b(think|thinking|thought|wonder)/], [/🔥/u, /\b(fire|hot|burn)/], [/💰|💵|🤑/u, /\b(money|cash|rich|dollars?)/], [/⏰|⌛|⏳/u, /\b(time|clock|hour|minute)/],
  [/🍊/u, /\borange/], [/❤️|💔/u, /\b(love|heart)/], [/👀/u, /\b(look|see|watch|eyes?)/], [/🧠/u, /\b(brain|smart)/], [/💀/u, /\b(dead|die|skull)/], [/😂|🤣/u, /\b(funny|laugh)/]];

export function guardScript({ tab = '', lines = [], title = '', prompts = [] }) {
  const out = [];
  lines.forEach((l, i) => {
    if (GAGS.test(l)) out.push(`line ${i + 1}: gag word: "${l}"`);
    if (BRANDS.test(l)) out.push(`line ${i + 1}: brand name: "${l}"`);
    if (tab === 'blocky' && BLOCKY_WORDS.test(l)) out.push(`line ${i + 1}: says "${BLOCKY_WORDS.exec(l)[0]}" in Blocky narration`);
    if (tab === '3d') for (const re of BANNED_3D) if (re.test(l)) out.push(`line ${i + 1}: banned phrase "${re.exec(l)[0]}"`);
  });
  if (BRANDS.test(title)) out.push(`title has a brand name: "${title}"`);
  prompts.forEach((p, i) => { if (BRANDS.test(p)) out.push(`picture prompt ${i + 1} has a brand name`); });
  return out;
}

export function guardManifest(m) {
  const out = [];
  const tab = m.tab;
  const lines = m.script?.lines || [];
  out.push(...guardScript({ tab, lines, title: m.script?.title || '', prompts: (m.shots || []).map(s => s.picturePrompt || '') }));
  (m.voice?.spokenText || []).forEach((l, i) => { if (GAGS.test(l)) out.push(`spoken line ${i + 1}: gag word`); });
  for (const s of m.shots || []) {
    const at = `shot ${s.start}-${s.end}s`;
    const props = s.props || [];
    const objectProps = props.filter(p => !String(p.kind).startsWith('emoji:'));
    if (objectProps.length > 2) out.push(`${at}: ${objectProps.length} props in one shot (max 2)`);
    for (const p of objectProps) {
      const why = propViolation(p.triggerWord, lines[s.scene] ?? '');
      if (why) out.push(`${at}: prop ${p.kind} ${why}`);
    }
    // Clips reaction emoji: never a picture of a word said within 1.6 s.
    for (const p of props.filter(p => String(p.kind).startsWith('emoji:'))) {
      const e = String(p.kind).slice(6);
      const near = (m.captions || []).filter(c => c.end >= s.start - 1.6 && c.start <= s.end + 1.6).map(c => c.text.toLowerCase()).join(' ');
      for (const [em, word] of MIRRORS) if (em.test(e) && word.test(near)) out.push(`${at}: emoji ${e} pictures a word in the captions ("${word.exec(near)[0]}")`);
    }
  }
  for (const c of m.captions || []) if (GAGS.test(c.text) || BRANDS.test(c.text)) out.push(`caption "${c.text}" breaks the brief`);
  if (m.clip && BRANDS.test(m.clip.heading || '')) out.push('clip heading has a brand name');
  return out;
}

// The site's own text: page text and titles, and the prompt strings in the code (comments removed).
export function guardSite(root = ROOT) {
  const out = [];
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { if (/^(\.|node_modules|vendor|tools)$/.test(n)) continue; const p = join(d, n); const st = statSync(p); if (st.isDirectory()) walk(p); else if (/\.(html|js|webmanifest)$/.test(n)) files.push(p); } };
  walk(root);
  for (const f of files) {
    let s = readFileSync(f, 'utf8');
    if (f.endsWith('.html')) s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1'));
    else s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    const m = BRANDS.exec(s);
    if (m) out.push(`${f.slice(root.length + 1)}: "${m[0]}" in site text or prompts`);
    if (GAGS.test(s) && !/briefguard/.test(f)) { const g = GAGS.exec(s); out.push(`${f.slice(root.length + 1)}: gag word "${g[0]}" in site text or prompts`); }
  }
  return out;
}

function manifestsIn(p) {
  const st = statSync(p);
  if (st.isFile()) return p.endsWith('.json') ? [p] : [];
  return readdirSync(p).flatMap(n => manifestsIn(join(p, n))).filter(f => f.endsWith('.loomy-manifest.json'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let bad = 0;
  const site = guardSite();
  console.log(`site text and prompts: ${site.length ? 'FAIL' : 'PASS'}`);
  for (const v of site) console.log(`  - ${v}`);
  bad += site.length;
  for (const f of process.argv.slice(2).flatMap(manifestsIn)) {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    const v = guardManifest(m);
    console.log(`${basename(f)} (${m.tab}): ${v.length ? 'FAIL' : 'PASS'}`);
    for (const x of v) console.log(`  - ${x}`);
    bad += v.length;
  }
  process.exit(bad ? 1 : 0);
}
