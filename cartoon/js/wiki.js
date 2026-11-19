// Real pictures for the topic from Wikipedia and Wikimedia Commons: photos, maps and paintings
// from the articles about the subject, matched to each scene's line. Free to use with credit;
// the credits and article links go into the upload kit's description.

const API = 'https://en.wikipedia.org/w/api.php';
const SKIP = /(flag|logo|icon|symbol|emblem|seal\b|coat[ _]of[ _]arms|signature|commons-|wikipedia|wiki|edit-|question|stub|disambig|portal|padlock|ambox|crystal|nuvola|folder|speaker|audio|pencil|\.gif$|\.ogg|\.webm|\.mp3|\.tif)/i;
const GRIM = /(dead|death|corpse|bodies|body|massacre|killed|killing|execution|executed|wounded|blood|casualt|genocide|victim|grave|lynch|torture|mutilat)/i;
const STOP = new Set('the and for with that this from what why how does into your about were was are is its their they them when who will have has had than then also just only very much many more most some file jpg jpeg png svg image photo picture'.split(' '));

const words = (t) => (String(t || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));

async function api(params, signal) {
  const q = new URLSearchParams({ format: 'json', origin: '*', formatversion: '2', ...params });
  // Wikimedia asks browser apps to name themselves in Api-User-Agent.
  const res = await fetch(`${API}?${q}`, { signal, headers: { 'Api-User-Agent': 'Loomy/1.0 (free educational video maker)' } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  return res.json();
}

const strip = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Candidate pictures for a topic: lead images of the top articles first, then the pictures inside
// the best-matching article.
async function candidates(topic, signal) {
  const search = await api({ action: 'query', list: 'search', srsearch: topic, srlimit: '4', srnamespace: '0' }, signal);
  const titles = (search.query?.search || []).map(r => r.title);
  if (!titles.length) return { titles, items: [] };
  const items = [];
  const seen = new Set();
  const take = (pages, lead) => {
    for (const pg of pages || []) {
      const ii = pg.imageinfo?.[0];
      if (!ii?.thumburl || seen.has(pg.title)) continue;
      const name = pg.title.replace(/^File:/, '');
      const md = ii.extmetadata || {};
      const desc = strip(md.ImageDescription?.value).slice(0, 200);
      if (SKIP.test(name) || GRIM.test(name) || GRIM.test(desc)) continue;
      if (!/jpe?g|png|svg/i.test(ii.mime || name)) continue;
      const w = ii.width || 0, h = ii.height || 0;
      const isSvg = /svg/i.test(ii.mime || name);
      if (!isSvg && (w < 480 || h < 320)) continue;
      if (w && h && (w / h > 4 || h / w > 4)) continue;
      seen.add(pg.title);
      items.push({
        file: pg.title, name, desc, lead, url: ii.thumburl, page: ii.descriptionurl,
        artist: strip(md.Artist?.value).slice(0, 80) || 'Unknown author',
        license: strip(md.LicenseShortName?.value) || 'see file page',
        map: /\bmap\b|_map|map_|territor|border|front|campaign|theatre|region/i.test(name + ' ' + desc),
        keys: new Set(words(`${name} ${desc}`)),
      });
    }
  };
  const info = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280', iiextmetadatafilter: 'Artist|LicenseShortName|ImageDescription' };
  // Lead images of the top articles.
  const leads = await api({ action: 'query', titles: titles.join('|'), prop: 'pageimages', piprop: 'name', pilimit: '4' }, signal);
  const leadFiles = (leads.query?.pages || []).map(p => p.pageimage).filter(Boolean).map(n => `File:${n}`);
  if (leadFiles.length) {
    const r = await api({ action: 'query', titles: leadFiles.join('|'), ...info }, signal);
    take(r.query?.pages, true);
  }
  // Pictures inside the top two articles.
  for (const t of titles.slice(0, 2)) {
    const r = await api({ action: 'query', generator: 'images', titles: t, gimlimit: '40', ...info }, signal);
    take(r.query?.pages, false);
    if (items.length >= 24) break;
  }
  return { titles, items };
}

async function load(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (blob.size < 3000) throw new Error('Too small');
  return createImageBitmap(blob);
}

/**
 * Pick and download a picture for each scene.
 * Returns { byScene: Map(sceneId -> {bitmap, credit}), sources: [{title,url}], credits: [...] }.
 */
export async function topicPictures(topic, scenes, { signal, log, isSafe, max = 8, timeout = 25000 } = {}) {
  const deadline = performance.now() + timeout;
  const { titles, items } = await candidates(topic, signal);
  const sources = titles.slice(0, 3).map(t => ({ title: t, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}` }));
  if (!items.length) return { byScene: new Map(), sources, credits: [] };
  // Score each picture for each scene: shared words, maps for lines about places and borders,
  // lead images for the first scene.
  const plan = [];
  const used = new Map();
  scenes.forEach((s, i) => {
    const w = new Set(words(s.narration));
    const wantsMap = /\b(map|border|region|territor|where|front|line|state|province|country|countries|east|west|north|south|partition)\b/i.test(s.narration);
    let best = items[0], bestScore = -Infinity;
    for (const it of items) {
      let score = 0;
      for (const k of it.keys) if (w.has(k)) score += 2;
      if (wantsMap && it.map) score += 3;
      if (i === 0 && it.lead) score += 3;
      score -= (used.get(it.file) || 0) * 4;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    used.set(best.file, (used.get(best.file) || 0) + 1);
    plan.push([s.id, best]);
  });
  // Download each chosen picture once.
  const unique = [...new Set(plan.map(([, it]) => it))].slice(0, max);
  const bitmaps = new Map();
  await Promise.all(unique.map(async (it) => {
    try {
      if (performance.now() > deadline) return;
      const bmp = await load(it.url, signal);
      if (isSafe && !(await isSafe(bmp, it.name))) { bmp.close?.(); log?.(`Skipped a picture that failed the safety check: ${it.name}`); return; }
      bitmaps.set(it, bmp);
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }));
  const byScene = new Map();
  const got = [...bitmaps.keys()];
  plan.forEach(([id, it], k) => {
    const pick = bitmaps.has(it) ? it : got[k % Math.max(1, got.length)];
    if (pick) byScene.set(id, { bitmap: bitmaps.get(pick), credit: pick });
  });
  const credits = got.map(it => ({ file: it.name, artist: it.artist, license: it.license, url: it.page }));
  return { byScene, sources, credits };
}

// Lines for the description: the articles used and a credit for every picture shown.
export function creditText(sources = [], credits = []) {
  const out = [];
  if (sources.length) out.push(...sources.map(s => `- Wikipedia: ${s.title} ${s.url}`));
  if (credits.length) {
    out.push('', 'Image credits (Wikimedia Commons):');
    out.push(...credits.map(c => `- ${c.file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')}: ${c.artist}, ${c.license}${c.url ? ` ${c.url}` : ''}`));
  }
  return out.join('\n');
}
