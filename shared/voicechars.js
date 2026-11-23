// Narrator characters (big upgrade): a voice with a personality. Each one is a base voice, a pace, a
// way of reading lines (its "lean": the writer's delivery for a line is moved toward the character's,
// which ElevenLabs v3 acts out with its delivery tags and the other voices hear as pace), and a sound
// (old radio, a whisper, a deep trailer voice, a bright host). The sound is plain JavaScript filtering
// on the finished line, so it works with every voice engine and in tests.

export const CHARACTERS = {
  storyteller: { label: 'The Storyteller: warm, unhurried', voice: 'bm_george', speed: 0.95, fx: 'warm',
    lean: { neutral: 'warm', serious: 'calm', excited: 'curious' } },
  hype: { label: 'Hype Host: fast and excited', voice: 'am_puck', speed: 1.1, fx: 'bright',
    lean: { neutral: 'excited', calm: 'excited', serious: 'urgent', curious: 'excited', warm: 'happy' } },
  secret: { label: 'Secret Teller: hushed and mysterious', voice: 'af_nicole', speed: 0.93, fx: 'whisper',
    lean: { neutral: 'mysterious', excited: 'curious', curious: 'whispering', serious: 'tense' } },
  newsreel: { label: '1940s Newsreel: old radio announcer', voice: 'am_michael', speed: 1.06, fx: 'radio',
    lean: { neutral: 'dramatic', calm: 'proud', curious: 'urgent' } },
  deadpan: { label: 'Deadpan Comic: dry, perfectly timed', voice: 'am_fenrir', speed: 0.97, fx: null,
    lean: { neutral: 'deadpan', excited: 'amused', happy: 'deadpan', shocked: 'deadpan' } },
  professor: { label: 'The Professor: British and precise', voice: 'bm_fable', speed: 0.98, fx: 'warm',
    lean: { neutral: 'curious', excited: 'proud', urgent: 'firm' } },
  trailer: { label: 'Movie Trailer: deep and epic', voice: 'am_michael', speed: 0.9, fx: 'deep',
    lean: { neutral: 'dramatic', curious: 'mysterious', excited: 'dramatic', calm: 'serious' } },
  bestie: { label: 'Your Bestie: chatty and upbeat', voice: 'af_bella', speed: 1.07, fx: 'bright',
    lean: { neutral: 'amused', serious: 'warm', calm: 'happy' } },
};

export const characterOf = (key) => CHARACTERS[key] || null;

// The delivery a character gives a line the writer marked `delivery`.
export function characterDelivery(delivery, ch) {
  if (!ch) return delivery || '';
  const d = delivery || 'neutral';
  return ch.lean[d] || d;
}

// ---------- 1.6: real voices ----------
// Human-sounding ElevenLabs voices with a personality, used whenever the site reads with ElevenLabs
// (the server only accepts these names; functions/api keeps the same list). "auto" picks the one that
// suits the narrator character, else the narrator voice.
export const REAL_VOICES = {
  // 2.2: human-sounding storytellers from the voice library (natural, conversational, not "announcer-y")
  edgar: ['Edgar: natural, conversational storyteller', '1qz7q3ZW54FIyiWDvo33'],
  chris: ['Chris: deep, friendly, like a friend telling you', 'dVgrl3DfAp8V0tM7LCsE'],
  pj: ['PJ: casual young Shorts storyteller', '74JBhfOHNPZlaH7OrVs9'],
  amir: ['Amir: calm, natural documentary voice', 'YPRmL2oHPibcUwJtQnPM'],
  desiree: ['Desiree: warm, natural storyteller', 'HvylbcEdW4ILK4GRwetV'],
  george: ['George: warm British storyteller', 'JBFqnCBsd6RMkjVDRZzb'],
  brian: ['Brian: deep, rich narrator', 'nPczCjzI2devNBz1zQrb'],
  liam: ['Liam: energetic Shorts creator', 'TX3LPaxmHKxFdv7VOQHJ'],
  harry: ['Harry: fierce and intense', 'SOYHLrjzK2X1ezoPC6cr'],
  callum: ['Callum: husky, a little sinister', 'N2lVS1w4EtoT3dr4eOWO'],
  charlie: ['Charlie: confident Aussie', 'IKne3meq5aSn9XLyUdCD'],
  daniel: ['Daniel: British news anchor', 'onwK4e9ZLuTAKqWW03F9'],
  bill: ['Bill: wise old grandpa', 'pqHfZKP75CvOlQylNhV4'],
  roger: ['Roger: laid-back and dry', 'CwhRBWXzGAHq8TQ4Fs17'],
  jessica: ['Jessica: playful and bright', 'cgSgspJ2msm6clMCkdW9'],
  laura: ['Laura: quirky and excited', 'FGY2WhTYpPnrIDTdsKH5'],
  lily: ['Lily: velvety British actress', 'pFZP5JQG7iQjIQuC4Bku'],
  sarah: ['Sarah: warm and confident', 'EXAVITQu4vr4xnSDxMaL'],
  alice: ['Alice: clear British teacher', 'Xb7hH8MSUJpSbSDYk0k2'],
};
export const EXPRESSIONS = {
  expressive: 'Very expressive: big feelings, gasps and laughs',
  natural: 'Natural: true to life, calmer',
  steady: 'Steady: even, like a documentary',
};
const BY_CHARACTER = { storyteller: 'edgar', hype: 'pj', secret: 'lily', newsreel: 'daniel', deadpan: 'chris', professor: 'amir', trailer: 'brian', bestie: 'desiree' };
const BY_NARRATOR = { am_michael: 'edgar', bm_george: 'george', bm_fable: 'daniel', am_puck: 'liam', am_fenrir: 'callum', af_heart: 'desiree', af_bella: 'laura', af_nicole: 'lily', bf_emma: 'alice' };
export function realVoiceFor(settings = {}) {
  if (REAL_VOICES[settings.realVoice]) return settings.realVoice;
  return BY_CHARACTER[settings.character] || BY_NARRATOR[settings.voice] || (/^[ab]f_/.test(settings.voice || '') ? 'desiree' : 'edgar');
}
// 2.2: Natural by default (it sounds like a person talking; Very expressive can sound acted)
export const expressionOf = (settings = {}) => (EXPRESSIONS[settings.expression] ? settings.expression : 'natural');

// ---------- the sound ----------
// RBJ biquads, run in place on a Float32Array.
function biquad(x, sr, type, f, q = 0.707, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40), w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'lowshelf') {
    const r = 2 * Math.sqrt(A) * al;
    b0 = A * ((A + 1) - (A - 1) * c + r); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - r);
    a0 = (A + 1) + (A - 1) * c + r; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - r;
  } else { // highshelf
    const r = 2 * Math.sqrt(A) * al;
    b0 = A * ((A + 1) + (A - 1) * c + r); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - r);
    a0 = (A + 1) - (A - 1) * c + r; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - r;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}

function peak(x) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }

// The character's sound on one line's samples (a new array, the same length and loudness).
export function characterFx(samples, sr, fx, seed = 1) {
  if (!fx || !samples?.length) return samples;
  const x = Float32Array.from(samples), before = peak(x) || 1;
  if (fx === 'warm') { biquad(x, sr, 'lowshelf', 220, 0.7, 2.5); biquad(x, sr, 'lowpass', 9000); }
  else if (fx === 'bright') { biquad(x, sr, 'highshelf', 4000, 0.7, 3.5); biquad(x, sr, 'highpass', 90); }
  else if (fx === 'deep') { biquad(x, sr, 'lowshelf', 140, 0.7, 5); biquad(x, sr, 'lowpass', 7000); }
  else if (fx === 'whisper') { biquad(x, sr, 'highpass', 320); biquad(x, sr, 'highshelf', 5000, 0.7, 2.5); }
  else if (fx === 'radio') {
    // A 1940s set: narrow band, a little valve drive, and crackle.
    biquad(x, sr, 'highpass', 380, 0.9); biquad(x, sr, 'lowpass', 3100, 0.9);
    const k = 1.8 / before, n = Math.tanh(1.8);
    let s = (seed * 9301 + 49297) % 233280;
    for (let i = 0; i < x.length; i++) {
      x[i] = Math.tanh(x[i] * k) / n * before;
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 < 0.0009) x[i] += (s / 233280 - 0.00045) * 90 * before * 0.04;
    }
  }
  const after = peak(x) || 1, g = before / after;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

// A finished voice line ({ samples, sampleRate, ... }) in the character's sound.
export function characterLine(data, ch) {
  if (!ch?.fx || !data?.samples) return data;
  return { ...data, samples: characterFx(data.samples, data.sampleRate, ch.fx) };
}
