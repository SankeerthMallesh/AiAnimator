// Many full videos in a row with stand-in AI, each with different choices, and every MP4 checked.
//   node mass.cjs <first> <count> [sections]      e.g.  node mass.cjs 0 25 cartoon,3d,blocky,clip
// Sections: cartoon (painted sets), town (3D cartoon town), 3d (AI pictures), auto (the 3D tab's
// default), drawn3d, blocky (drawn, the Blocky default), blockyai (Blocky with AI pictures), clip.
// Writes one JSON line per run to mass/results.jsonl and a 12-frame contact sheet per video
// (mass/<n>-<section>-sheet.jpg). A video that passes is deleted after its checks (KEEP=1 keeps it),
// so a 1000-video run fits on a small disk. Needs the site served locally (bash serve.sh) and ffmpeg.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const first = +(process.argv[2] || 0), count = +(process.argv[3] || 4);
const SECTIONS = (process.argv[4] || 'cartoon,town,3d,auto,drawn3d,blocky,blockyai,clip').split(',');
// Looks drawn with WebGL render on the GPU, like a real browser; the rest on software rendering
// (headless Chromium paints the Cartoons backgrounds about 5x slower with the GPU flags).
const GPU_SECTIONS = new Set(['town', 'auto', 'drawn3d', 'blocky']);
const DRAWN_SECTIONS = new Set(['auto', 'drawn3d', 'blocky']);
// The drawn shot words (explainer/js/z3d/vocab.js), so mocked scripts direct the drawn looks like the writer does.
const D_SETS = ['studio', 'snow', 'park', 'street', 'room', 'beach', 'night', 'desert', 'lab'];
const D_FRAMES = ['talk', 'two', 'react', 'wide', 'walk', 'point', 'group', 'object'];
const D_ACTS = ['stand', 'talk', 'point', 'surprised', 'shrug', 'cheer', 'think', 'show', 'flinch'];
const D_THINGS = ['brick', 'phone', 'book', 'ball', 'globe', 'magnet', 'coins', 'clock', 'bulb', 'key', 'trophy'];
const D_THING_ACTS = ['hold', 'show', 'drop', 'grow', 'spin', 'break'];
const D_CAMS = ['push-in', 'pull-out', 'orbit', 'pan-left', 'pan-right', 'tilt-up', 'impact', 'static'];
const D_FX = ['none', 'none', 'pulse', 'shockwave', 'sparks', 'snow', 'rain', 'glow', 'bubbles', 'dust'];
const D_DELIVERY = ['curious', 'excited', 'calm', 'tense', 'urgent', 'shocked', 'dramatic', 'amused', 'firm'];
const DIR = path.join(__dirname, 'mass');
fs.mkdirSync(DIR, { recursive: true });

// ---------- a small seeded random ----------
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s ^ (s << 13)) >>> 0, s = (s ^ (s >>> 17)) >>> 0, s = (s ^ (s << 5)) >>> 0) / 4294967296); }

// ---------- topics: lines with numbers, fractions, money, years, questions, quotes ----------
const TOPICS = [
  ['Why the Titanic sank', 'ship', ['In April 1912, the Titanic left Southampton on her first trip.', 'She carried about 2,224 people and only 20 lifeboats.', 'At 11:40 pm, the lookout shouted, "Iceberg, right ahead!"', 'The ice scraped open 5 of her 16 compartments.', 'She could float with 4 flooded, but not with 5.', 'Why did so many lifeboats leave half empty?', 'Crews feared the boats would buckle when lowered full.', 'In 2 hours and 40 minutes, the ship was gone.', 'About 1,500 people died in water near 28 degrees F.', 'Her wreck was found in 1985, 12,500 feet down.'], ['deck', 'ocean', 'deck', 'ship', 'ocean', 'deck', 'deck', 'ocean', 'ocean', 'ocean']],
  ['How bread rises', 'kitchen', ['Mix 3 1/2 cups of flour with 1 1/2 cups of warm water.', 'Add 2 1/4 teaspoons of yeast and a pinch of salt.', 'Yeast eats sugar and burps out carbon dioxide.', 'Gluten traps those bubbles like tiny balloons.', 'Let it rise for 1 to 2 hours at 75°F.', 'Why does it collapse if you wait too long?', 'The gluten stretches until the bubbles pop.', 'Bake it at 450°F for about 30 minutes.', 'The heat sets the bubbles into a fluffy crumb.'], ['kitchen', 'kitchen', 'lab', 'lab', 'kitchen', 'kitchen', 'lab', 'kitchen', 'kitchen']],
  ['The cost of a moon landing', 'space', ['Apollo cost about $25.8 billion in the 1960s.', "That's roughly $257 billion in today's money.", 'At its peak, 400,000 people worked on it.', 'The Saturn V was 363 feet tall.', 'It burned 20 tons of fuel every second at launch.', 'On July 20, 1969, Eagle touched down.', 'Was it worth it?', 'It gave us better computers, materials and photos of Earth.'], ['space', 'city', 'lab', 'space', 'space', 'space', 'city', 'space']],
  ['Why cats purr', 'room', ['Cats purr at 25 to 150 vibrations a second.', 'They purr when happy, but also when hurt.', 'Some scientists think it helps bones heal!', 'The sound comes from muscles in the voice box.', 'Lions cannot purr, but they can roar.', 'Cheetahs purr, but cannot roar at all.', 'So a purr is part comfort, part self repair.'], ['room', 'room', 'lab', 'lab', 'savanna', 'savanna', 'room']],
  ['How volcanoes erupt', 'volcano', ['Deep underground, rock melts into magma at 2,200°F.', 'Magma is lighter than solid rock, so it rises.', 'Gas trapped inside builds huge pressure.', 'When the pressure wins, the volcano blows!', 'Mount St. Helens lost 1,300 feet of its top in 1980.', 'Ash can travel thousands of miles.', 'Yet volcanic soil grows some of the best crops on Earth.'], ['volcano', 'volcano', 'lab', 'volcano', 'mountain', 'sky', 'field']],
  ['The Great Wall of China', 'mountain', ['The Great Wall is about 13,171 miles long.', 'It was built over 2,000 years by many dynasties.', 'Workers used stone, brick, and even rice glue.', "Can you see it from space? Not with your eyes.", "It's long, but only about 30 feet wide.", 'Today 10 million people visit it every year.'], ['mountain', 'mountain', 'city', 'space', 'mountain', 'city']],
  ['Why the sky is blue', 'sky', ['Sunlight looks white, but it holds every color.', 'Air molecules scatter blue light the most.', 'Blue waves are short, about 450 nanometers.', 'So blue light bounces all over the sky.', 'At sunset, light passes through more air.', 'The blue scatters away, and reds and oranges are left.', 'Why not violet? Our eyes are less sensitive to it.'], ['sky', 'sky', 'lab', 'sky', 'beach', 'beach', 'lab']],
  ['How a penguin stays warm', 'snow', ['Emperor penguins live at -40°F.', 'They have 4 layers of overlapping feathers.', 'Under that is a thick layer of fat.', 'In storms, thousands huddle together.', 'They take turns standing on the cold outside edge.', 'The middle of a huddle can reach 99°F!', 'Teamwork keeps every penguin alive.'], ['snow', 'snow', 'lab', 'snow', 'snow', 'snow', 'snow']],
  ['The first airplane flight', 'field', ['On December 17, 1903, the Wright brothers flew.', 'The first flight lasted just 12 seconds.', 'It covered 120 feet, shorter than a jumbo jet.', 'They built their own engine with 12 horsepower.', 'By the fourth flight, they flew 852 feet.', 'Only 66 years later, people walked on the moon.'], ['field', 'field', 'field', 'garage', 'field', 'space']],
  ['How much water you need', 'city', ['Your body is about 60% water.', 'Most adults need around 2 1/2 to 3 liters a day.', 'About 1/5 of that comes from food.', 'Thirsty? You are already a little dehydrated.', 'Losing just 2% can make you tired and slow.', 'So keep a bottle nearby and sip all day.'], ['room', 'kitchen', 'kitchen', 'city', 'office', 'city']],
  ['Why leaves change color', 'forest', ['Leaves are green because of chlorophyll.', 'In fall, days get shorter and colder.', 'Trees stop making chlorophyll to save energy.', 'Yellow and orange were hiding there all along!', 'Reds are made fresh from sugar trapped in the leaf.', 'Then the tree drops its leaves for winter.', 'Next spring, the green comes back.'], ['forest', 'forest', 'lab', 'forest', 'forest', 'forest', 'field']],
  ['How the pyramids were built', 'desert', ['The Great Pyramid has about 2.3 million blocks.', 'Some weigh as much as 80 tons.', 'Workers wet the sand to drag sledges more easily.', 'It took about 20 years to finish.', 'The builders were paid workers, not slaves.', 'For 3,800 years it was the tallest building on Earth.'], ['desert', 'desert', 'desert', 'desert', 'city', 'desert']],
];
const NAMES = [['Maya', 'Leo'], ['Zoe', 'Sam'], ['Ava', 'Kai'], ['Nia', 'Omar'], ['Lily', 'Ravi']];
const ICONS = ['🚢', '🍞', '🚀', '🐱', '🌋', '🧱', '☀️', '🐧', '✈️', '💧', '🍂', '🏜️'];

function scriptFor(seed, section) {
  if (process.env.SCRIPT) return JSON.parse(fs.readFileSync(path.resolve(__dirname, process.env.SCRIPT), 'utf8'));
  const r = rng(seed + 7), t = TOPICS[seed % TOPICS.length];
  const take = Math.max(5, t[2].length - Math.floor(r() * 3));
  const [a, b] = NAMES[seed % NAMES.length];
  const scenes = t[2].slice(0, take).map((line, i) => ({
    line, narration: line, set: t[3][i] || t[1], say: i % 2 ? 'b' : 'a', highlight: i % 3 === 0,
    visual: `${t[0].toLowerCase()}, shot ${i + 1}: ${line.replace(/[^\w ,.'-]/g, '')}`,
    icon: ICONS[seed % ICONS.length], who: [{ id: 'a', x: 0.3, pose: ['point', 'idle', 'wave', 'think'][i % 4] }, { id: 'b', x: 0.7, pose: 'idle' }],
  }));
  if (DRAWN_SECTIONS.has(section)) {
    // What the writer sends for a drawn look: a place, framing, who, an action, maybe a thing.
    const pk = (a) => a[Math.floor(r() * a.length)];
    let set = pk(D_SETS);
    scenes.forEach((sc, i) => {
      if (i && r() < 0.35) set = pk(D_SETS);
      const frame = i === 0 ? pk(['wide', 'react', 'talk']) : pk(D_FRAMES);
      Object.assign(sc, { set, frame, who: frame === 'two' || frame === 'group' ? [a, b] : [r() < 0.7 ? a : b], act: pk(D_ACTS), camera: pk(D_CAMS), effect: pk(D_FX), delivery: pk(D_DELIVERY) });
      if (frame === 'object' || r() < 0.2) Object.assign(sc, { thing: pk(D_THINGS), do: pk(D_THING_ACTS) });
    });
  }
  return { title: t[0], youtubeTitle: `${t[0]} 🤯`, description: `${t[0]}.\nSources: Wikipedia`, hashtags: ['#shorts', '#facts', '#learn'],
    character: section !== 'cartoon' ? { name: a, look: 'a friendly young explorer in a teal jacket and boots' } : undefined,
    characters: DRAWN_SECTIONS.has(section) ? [{ name: a, look: r() < 0.5 ? 'woman in her 20s, red coat' : 'man in his 30s, grey jacket' }, { name: b, look: r() < 0.5 ? 'man, blue hoodie' : 'girl, yellow striped shirt' }] : undefined,
    cast: [{ id: 'a', name: a, color: '#E8A33D', hat: 'cap', hair: 'curly', costume: 'shirt' }, { id: 'b', name: b, color: '#3E8FE0', hat: 'none', hair: 'short', costume: 'shirt' }],
    scenes };
}

// ---------- fixture pictures: real photos plus generated ones ----------
const PICS = ['ref/gw.jpg', 'ref/p1.jpg', 'ref/p3.jpg', 'ref/p4.jpg', 'wk_map.jpg', 'wk_tank.jpg'].map(f => path.join(__dirname, f)).filter(f => fs.existsSync(f));
for (const [i, src] of ['mandelbrot=s=768x1344', 'testsrc2=s=768x1344', 'cellauto=s=768x1344:rule=110', 'gradients=s=768x1344:n=5'].entries()) {
  const out = path.join(DIR, `pic${i}.jpg`);
  if (!fs.existsSync(out)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', src, '-frames:v', '1', '-q:v', '3', out]);
  PICS.push(out);
}

// ---------- the stand-in voice ----------
// The fixture read looped and cut so each line lasts as long as its words take at 190 words a
// minute: lengths and pacing like a real narrator (the sound itself is the same clip throughout).
const PCM = fs.readFileSync(path.join(DIR, 'speech.pcm'));
const WPM = 190;
function speechPcm(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length || 1;
  const bytes = Math.round(words * 60 / WPM * 24000) * 2;
  const out = Buffer.alloc(bytes);
  for (let o = 0; o < bytes; o += PCM.length) PCM.copy(out, o, 0, Math.min(PCM.length, bytes - o));
  return out;
}
function wav(data) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
function wholeRead(lines) {
  const gap = Buffer.alloc(24000 * 2 * 0.2);
  const parts = [], cuts = [], heard = []; let t = 0;
  lines.forEach((line, i) => {
    const p = speechPcm(line); parts.push(p);
    // What a recogniser would hear: the spoken words, evenly through the line.
    const ws = String(line).split(/\s+/).filter(Boolean), d = p.length / 48000;
    heard.push(ws.map((w, k) => [+(t + (k / ws.length) * d).toFixed(2), +(t + ((k + 0.85) / ws.length) * d).toFixed(2), w]));
    t += d;
    if (i < lines.length - 1) { parts.push(gap); cuts.push(+(t + 0.1).toFixed(3)); t += 0.2; }
  });
  return { body: wav(Buffer.concat(parts)), cuts, heard };
}

// ---------- Clips sources in many formats ----------
const WIDE = path.join(__dirname, 'cliptest/wide.webm');
const CLIP_SOURCES = [
  ['wide.webm', null],
  ['h264-1080.mp4', ['-vf', 'scale=1920:1080', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac']],
  ['phone.mov', ['-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-f', 'mov']],
  ['vertical.mp4', ['-vf', 'crop=405:720,scale=720:1280', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac']],
  ['old-4x3.mkv', ['-vf', 'scale=640:480', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'libopus']],
  ['vp8.webm', ['-vf', 'scale=854:480', '-c:v', 'libvpx', '-b:v', '800k', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libvorbis']],
  ['hevc.mp4', ['-vf', 'scale=1280:720', '-c:v', 'libx265', '-preset', 'ultrafast', '-crf', '30', '-tag:v', 'hvc1', '-c:a', 'aac']],
  ['30fps-1440.mp4', ['-vf', 'scale=2560:1440,fps=30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-c:a', 'aac']],
];
function clipSource(i) {
  const [name, args] = CLIP_SOURCES[i % CLIP_SOURCES.length];
  if (!args) return WIDE;
  const out = path.join(DIR, 'src-' + name);
  if (!fs.existsSync(out)) {
    try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', WIDE, '-t', '150', ...args, out], { timeout: 600000 }); }
    catch { return WIDE; }
  }
  return out;
}

// ---------- check an MP4 ----------
function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  const dur = +j.format.duration;
  const r = { dur: +dur.toFixed(2), w: v?.width, h: v?.height, vcodec: v?.codec_name, acodec: a?.codec_name || null, fps: v ? eval(v.avg_frame_rate) : 0 };
  return r;
}
function check(file, want) {
  const problems = [];
  let info;
  try { info = probe(file); } catch (e) { return { problems: ['cannot read MP4: ' + String(e.message).slice(0, 120)] }; }
  const errs = execFileSync('bash', ['-c', `ffmpeg -v error -i "${file}" -f null - 2>&1 | head -5`]).toString().trim();
  if (errs) problems.push('decode errors: ' + errs.slice(0, 160));
  const stats = execFileSync('bash', ['-c', `ffmpeg -v error -i "${file}" -vf "fps=2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null | grep YAVG | cut -d= -f2`]).toString().trim().split('\n').map(Number).filter(n => !isNaN(n));
  const dark = stats.filter(y => y < 18).length;
  info.frames = stats.length; info.darkFrames = dark; info.minY = Math.round(Math.min(...stats)); info.meanY = Math.round(stats.reduce((s, y) => s + y, 0) / stats.length);
  if (dark > stats.length * 0.15) problems.push(`${dark}/${stats.length} sampled frames are black`);
  const frz = execFileSync('bash', ['-c', `ffmpeg -v info -i "${file}" -vf freezedetect=n=0.002:d=2.5 -map 0:v -f null - 2>&1 | grep -o 'freeze_duration: [0-9.]*' | cut -d' ' -f2`]).toString().trim().split('\n').filter(Boolean).map(Number);
  info.frozen = frz.length ? Math.max(...frz) : 0;
  if (want.motion && info.frozen > 4) problems.push(`picture frozen for ${info.frozen.toFixed(1)} s`);
  if (info.acodec) {
    const vol = execFileSync('bash', ['-c', `ffmpeg -v info -i "${file}" -map 0:a -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume' | grep -o '\\-\\?[0-9.]* dB'`]).toString().trim().split('\n');
    info.meanDb = parseFloat(vol[0]); info.maxDb = parseFloat(vol[1]);
    info.lufs = parseFloat(execFileSync('bash', ['-c', `ffmpeg -v info -i "${file}" -map 0:a -af ebur128 -f null - 2>&1 | grep -o 'I: *-[0-9.]* LUFS' | tail -1 | grep -o '\\-[0-9.]*'`]).toString());
    if (!(info.meanDb > -40)) problems.push(`audio is near silent (${info.meanDb} dB)`);
    if (info.maxDb > -0.05) problems.push(`audio clips (${info.maxDb} dB peak)`);
    if (want.lufs && !(info.lufs >= want.lufs[0] && info.lufs <= want.lufs[1])) problems.push(`loudness ${info.lufs} LUFS`);
  } else if (want.audio) problems.push('no audio track');
  // Picture quality: sharpness (blur 0 = sharp; flagged when most of the video is soft), cuts (a video
  // whose picture never changes shot is static), and a contact sheet of 12 frames to look at.
  try {
    const blur = execFileSync('bash', ['-c', `ffmpeg -v error -i "${file}" -vf "fps=1,scale=540:-2,blurdetect=block_width=32:block_height=32,metadata=print:key=lavfi.blur:file=-" -f null - 2>/dev/null | grep lavfi.blur | cut -d= -f2`]).toString().trim().split('\n').map(Number).filter(n => !isNaN(n));
    if (blur.length) { const sorted = blur.slice().sort((x, y) => x - y); info.blurMed = +sorted[Math.floor(sorted.length / 2)].toFixed(2); info.blurMax = +sorted[sorted.length - 1].toFixed(2); }
    const cuts = execFileSync('bash', ['-c', `ffmpeg -v error -i "${file}" -vf "scale=270:-2,scdet=t=12,metadata=print:key=lavfi.scd.time:file=-" -f null - 2>/dev/null | grep -c lavfi.scd.time || true`]).toString().trim();
    info.cuts = +cuts || 0;
    if (want.scenes >= 4 && info.cuts === 0) problems.push(`only ${info.cuts} shot changes for ${want.scenes} scenes`);
    if (want.blurMax != null && info.blurMed > want.blurMax) problems.push(`soft picture (median blur ${info.blurMed})`);
    const sheet = file.replace(/\.mp4$/, '-sheet.jpg');
    execFileSync('bash', ['-c', `ffmpeg -v error -y -i "${file}" -vf "fps=12/${Math.max(1, info.dur)},scale=180:-2,tile=6x2" -frames:v 1 -q:v 4 "${sheet}"`]);
    const ad = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', file]).toString().trim();
    if (ad && Math.abs(+ad - info.dur) > 0.6) problems.push(`audio ${(+ad).toFixed(1)} s vs video ${info.dur} s`);
  } catch (e) { info.qualityError = String(e.message).slice(0, 120); }
  if (info.vcodec !== 'h264') problems.push('video is ' + info.vcodec);
  if (want.w && (info.w !== want.w || info.h !== want.h)) problems.push(`size ${info.w}x${info.h}, wanted ${want.w}x${want.h}`);
  if (want.minDur && info.dur < want.minDur) problems.push(`only ${info.dur} s long`);
  if (want.maxDur && info.dur > want.maxDur) problems.push(`${info.dur} s long, over ${want.maxDur}`);
  return { info, problems };
}

// ---------- one run ----------
async function run(browser, n) {
  const section = SECTIONS[n % SECTIONS.length];
  const r = rng(n + 1);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const t0 = Date.now();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const errs = [], calls = {};
  const script = scriptFor(n, section);
  const picsFail = section !== 'clip' && !process.env.PICS && (!!process.env.NOPICS || r() < 0.2);      // one run in five: the picture service is out
  const voiceMode = process.env.VOICE || pick(['whole', 'whole', 'whole', 'lines']); // whole-script read or one line at a time
  let pi = Math.floor(r() * PICS.length);
  await ctx.route('**/api/**', async (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname.replace(/^.*\/api\//, '');
    calls[p] = (calls[p] || 0) + 1;
    if (p === 'config') return route.fulfill({ json: { googleClientId: null, sync: false, ai: true, writer: 'groq', voice: 'gemini' } });
    if (p === 'me') return route.fulfill({ json: { user: null } });
    // No pictures: answer exactly as the live server does when the daily allowance is used up.
    if (p === 'image') return picsFail ? route.fulfill({ status: 200, json: { ok: false, used: true, error: 'The free daily picture allowance is used up.' } }) : route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(PICS[pi++ % PICS.length]) });
    if (p === 'speakall') {
      if (voiceMode !== 'whole') return route.fulfill({ status: 503, json: { ok: false } });
      const body = JSON.parse(req.postData() || '{}'); const w = wholeRead(body.lines);
      return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'X-Loomy-Cuts': JSON.stringify(w.cuts), 'X-Loomy-Wpm': String(WPM), 'X-Loomy-Voice': 'gemini', 'X-Loomy-Words': JSON.stringify(w.heard), 'Access-Control-Expose-Headers': '*' }, body: w.body });
    }
    if (p === 'speak') { const body = JSON.parse(req.postData() || '{}'); return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav(speechPcm(body.text)) }); }
    if (p === 'write') {
      const body = JSON.parse(req.postData() || '{}'); const sys = JSON.stringify(body.messages || '');
      if (section === 'clip') {
        const times = [...(body.messages?.[1]?.content || '').matchAll(/\[(\d+\.\d)\]/g)].map(m => +m[1]);
        if (!times.length) return route.fulfill({ json: { ok: true, text: '{"clips":[]}' } });
        const a = times[0], z = times[times.length - 1];
        const clips = [0, 1, 2, 3].map(k => ({ start: a + 3 + k * 33, end: Math.min(z, a + 30 + k * 33), payoffEnd: Math.min(z, a + 24.5 + k * 33), heading: ['He Tried To Break It 💀', 'It Survived EVERYTHING', 'Chat Could Not Believe This', 'The Fire Test 🔥'][k], score: 9 - k, why: 'Big reaction and a payoff.', highlight: ['indestructible', 'insane'], emoji: [{ t: a + 8 + k * 33, e: '💀' }] })).filter(c => c.end - c.start > 10);
        return route.fulfill({ json: { ok: true, text: JSON.stringify({ clips }) } });
      }
      let text;
      if (/fact-check|Check each line/i.test(sys)) text = JSON.stringify({ notes: [], fixes: [], unverified: [] });
      else {
        // Long scripts are asked for in parts: answer each part with its slice of the script.
        const user = String(body.messages?.[body.messages.length - 1]?.content || '');
        const first = /write only the first (\d+) scenes/.exec(user), next = /Write the next (\d+) scenes/.exec(user);
        if (next) { const done = (user.match(/^\d+\. /gm) || []).length; text = JSON.stringify({ scenes: script.scenes.slice(done, done + +next[1]) }); }
        else if (first) text = JSON.stringify({ ...script, scenes: script.scenes.slice(0, +first[1]) });
        else text = JSON.stringify(script);
      }
      return route.fulfill({ json: { ok: true, text, model: 'mock' } });
    }
    if (p === 'transcribe') {
const SUBJ = ['Bro', 'Chat', 'Okay so', 'Wait', 'Honestly', 'Listen', 'No way', 'Yo', 'Alright', 'Look'];
      const MID = ['this thing is literally indestructible', 'watch what happens when I drop it', 'it survived that somehow', 'we are going one floor higher', 'the glass did not even crack', 'I need to try fire next', 'my hands are shaking right now', 'that was the loudest bang ever', 'the box says it is waterproof', 'somebody clip that right now', 'I paid forty dollars for this', 'the neighbors are going to hate me', 'it bounced off the car roof', 'we have one shot left', 'the timer says ten seconds', 'I really thought it would explode'];
      const END = ['!', '.', '?', '!!', '.'];
      const lineAt = (k) => `${SUBJ[(k * 7) % SUBJ.length]} ${MID[(k * 5 + Math.floor(k / 16)) % MID.length]}${END[k % END.length]}`;
      const words = [], segments = []; let t = 0.5, k = 0;
      while (t < 148) { const line = lineAt(k++); const st = t; for (const w of line.split(' ')) { words.push({ w, s: t, e: t + 0.32 }); t += 0.38; } segments.push({ s: st, e: t, t: line }); t += 0.6; }
      return route.fulfill({ json: { ok: true, model: 'mock', language: 'english', duration: 150, text: 'x', words, segments } });
    }
    return route.fulfill({ json: { ok: false } });
  });
  await ctx.route('https://en.wikipedia.org/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"query":{"search":[],"pages":[]}}' }));
  await ctx.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ status: 404, body: '' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`[pageerror] ${e.message.slice(0, 200)}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|__access/.test(m.text())) errs.push(`[console] ${m.text().slice(0, 200)}`); });
  const result = { n, section, ms: 0 };
  try {
    if (section === 'clip') {
      const src = clipSource(n >> 2);
      const choices = { count: pick(['3', '5']), length: pick(['15-30', '25-60', '25-60']), framing: pick(['auto', 'auto', 'crop', 'fit']), heading: r() < 0.85, captions: r() < 0.85, emoji: r() < 0.7 };
      Object.assign(result, { source: path.basename(src), choices });
      await p.goto('http://127.0.0.1:8773/clip/');
      await p.setInputFiles('#fileInput', src);
      await p.waitForFunction(() => !document.querySelector('#btnGo').disabled || /could not|can't|cannot/i.test(document.querySelector('#fileMeta').textContent), null, { timeout: 300000 });
      for (const k of ['count', 'length', 'framing']) await p.selectOption('#' + k, choices[k]);
      for (const [id, on] of [['optHeading', choices.heading], ['optCaptions', choices.captions], ['optEmoji', choices.emoji]]) await p.setChecked('#' + id, on);
      await p.click('#btnGo');
      await p.waitForFunction(() => document.querySelector('#steps li[data-step="clips"]').classList.contains('done') || document.querySelector('#steps li.fail'), null, { timeout: 1500000 });
      const LOGN = +process.env.LOGN || 3;
      const failed = await p.$$eval('#steps li.fail', l => l.map(x => x.dataset.step + ': ' + x.querySelector('.d').textContent));
      if (failed.length) throw new Error('step failed: ' + failed.join('; ') + ' | ' + await p.$$eval('#log div', (l, n) => l.slice(-n).map(x => x.textContent).join(' | '), LOGN));
      const hrefs = await p.$$eval('.card .dl', l => l.map(a => a.href));
      result.outputs = [];
      const [lo, hi] = choices.length.split('-').map(Number);
      for (const [i, h] of hrefs.slice(0, 2).entries()) {
        const out = path.join(DIR, `${n}-clip-${i}.mp4`);
        fs.writeFileSync(out, Buffer.from(await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, h), 'base64'));
        const man = await p.evaluate((k) => (window.loomyClipManifests || [])[k] || null, i);
        if (man) fs.writeFileSync(out.replace(/\.mp4$/, '.loomy-manifest.json'), JSON.stringify(man, null, 1));
        result.outputs.push({ file: path.basename(out), ...check(out, { audio: true, w: 1080, h: 1920, minDur: Math.min(lo, 10) - 1, maxDur: hi + 8, motion: true }) });
      }
      if (!hrefs.length) throw new Error('no clips made');
      result.clips = hrefs.length;
    } else {
      const url = { cartoon: '/cartoon/', town: '/cartoon/', '3d': '/explainer/?style=story-3d', auto: '/explainer/', drawn3d: '/explainer/?style=drawn-3d', blocky: '/explainer/?style=blocky', blockyai: '/explainer/?style=blocky' }[section];
      const cartoonish = section === 'cartoon' || section === 'town';
      // Settings-panel choices are saved the way the app saves them, before the page loads.
      const set = { quality: pick(['720', '1080', '1080', '1080', '1440']), fps: pick(['24', '30', '30', '60']), captionStyle: pick(['word', 'classic', 'bold', 'box', 'minimal', 'off']),
        bgLook: pick(['3d', '3d', 'flat']), stickers: r() < 0.15, showTitle: r() < 0.3, factCheck: r() < 0.8, settingsVersion: cartoonish ? 10 : 7 };
      if (set.quality === '1440' && set.fps === '60') set.fps = '30';
      // Proof renders: the app's defaults at 1080x1920, 30 fps (only the picture service may be off).
      if (process.env.FIXED) Object.assign(set, { quality: '1080', fps: '30', captionStyle: cartoonish ? 'word' : 'classic', bgLook: '3d', stickers: false, showTitle: false, factCheck: true });
      await p.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [cartoonish ? 'storyforge.settings.v1' : 'explainer.settings.v1', JSON.stringify(set)]);
      // STEM=voice|music renders only that part of the soundtrack (same master gain); MUSICSEED fixes the score.
      const extra = [process.env.STEM && `stem=${process.env.STEM}`, process.env.MUSICSEED && `musicseed=${process.env.MUSICSEED}`].filter(Boolean).join('&');
      await p.goto('http://127.0.0.1:8773' + url + (extra ? (url.includes('?') ? '&' : '?') + extra : '')); await p.waitForTimeout(800);
      const choices = { ...set };
      for (const id of process.env.FIXED ? [] : ['duration', 'pace', 'voice', 'mood']) {
        const vals = await p.$$eval(`#${id} option`, l => l.map(o => o.value)).catch(() => []);
        if (!vals.length) continue;
        // Lengths: mostly Shorts (up to 90 s); one run in 25 goes long (up to 3 min).
        const fit = id === 'duration' ? vals.filter(x => +x <= (r() < 0.04 ? 180 : 90)) : vals;
        const v = pick(fit.length ? fit : vals);
        choices[id] = v; await p.selectOption('#' + id, v).catch(() => {});
      }
      if (section === 'town' || section === 'cartoon') { const lk = section === 'town' ? 'town3d' : 'painted'; await p.selectOption('#look', lk); choices.look = lk; }
      if (section === 'blockyai') { await p.selectOption('#style', 'blocky'); choices.style = 'blocky'; }
      choices.style ||= await p.$eval('#style', el => el.value).catch(() => undefined);
      Object.assign(result, { topic: script.title, choices, picsFail, voiceMode });
      await p.fill('#topic', script.title);
      await p.click('#btnGo');
      await p.waitForSelector('#btnDownload:not(.hidden)', { timeout: 900000 });
      const href = await p.getAttribute('#btnDownload', 'href');
      const out = path.join(DIR, `${n}-${section}.mp4`);
      fs.writeFileSync(out, Buffer.from(await p.evaluate(async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }, href), 'base64'));
      const man = await p.evaluate(() => window.loomyManifest || null);
      if (man) fs.writeFileSync(out.replace(/\.mp4$/, '.loomy-manifest.json'), JSON.stringify(man, null, 1));
      const q = +(choices.quality || 1080); const w = q === 720 ? 720 : q === 1440 ? 1440 : 1080;
      result.outputs = [{ file: path.basename(out), ...check(out, { audio: true, w, h: Math.round(w * 16 / 9), minDur: script.scenes.length * 1.2, motion: true, lufs: [-15, -11], scenes: script.scenes.length, blurMax: 8 }) }];
      result.log = await p.$$eval('#log div, #log li', l => l.map(x => x.textContent).filter(t => /fail|error|could not|fallback|instead/i.test(t)).slice(-6)).catch(() => []);
    }
  } catch (e) {
    result.error = String(e.message || e).split('\n')[0].slice(0, 300);
    await p.screenshot({ path: path.join(DIR, `${n}-${section}-fail.png`) }).catch(() => {});
  }
  result.ms = Date.now() - t0; result.calls = calls; result.errors = [...new Set(errs)].slice(0, 8);
  result.ok = !result.error && !result.errors.length && (result.outputs || []).every(o => !o.problems.length);
  await ctx.close();
  return result;
}

(async () => {
  const sw = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const gpu = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] });
  for (let n = first; n < first + count; n++) {
    let res;
    try { res = await run(GPU_SECTIONS.has(SECTIONS[n % SECTIONS.length]) ? gpu : sw, n); } catch (e) { res = { n, ok: false, error: 'harness: ' + e.message }; }
    // A video that passed every check is not kept (the sheet and render log stay); KEEP=1 keeps all.
    // Failed videos are kept for a look, up to MAXKEEP (default 20) in the folder, so a bad batch cannot fill the disk.
    const kept = () => fs.readdirSync(DIR).filter(f => /^\d+-.*\.mp4$/.test(f)).length;
    if ((res.ok && !process.env.KEEP) || (!res.ok && kept() > (+process.env.MAXKEEP || 20))) for (const o of res.outputs || []) fs.rmSync(path.join(DIR, o.file), { force: true });
    fs.appendFileSync(path.join(DIR, 'results.jsonl'), JSON.stringify(res) + '\n');
    const o = (res.outputs || []).map(x => `${x.info ? `${x.info.w}x${x.info.h}@${x.info.fps} ${x.info.dur}s ${x.info.lufs}LUFS Y${x.info.meanY} frz${x.info.frozen} blur${x.info.blurMed} cuts${x.info.cuts}` : ''} ${x.problems.join('; ')}`).join(' | ');
    console.log(`${res.ok ? 'PASS' : 'FAIL'} #${n} ${res.section} ${Math.round(res.ms / 1000)}s ${o} ${res.error || ''} ${(res.errors || []).join(' ')}`);
  }
  await sw.close(); await gpu.close();
})();
