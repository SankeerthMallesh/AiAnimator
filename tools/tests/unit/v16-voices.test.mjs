// 1.6: real voices with a personality, and expression: what the server asks ElevenLabs for.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest } from '../../../functions/api/[[path]].js';
import { REAL_VOICES, EXPRESSIONS, realVoiceFor, expressionOf } from '../../../shared/voicechars.js';

const SITE = 'https://loomy-app.pages.dev';
const call = (path, body, env = { ELEVEN_KEY: 'e' }) => onRequest({
  request: new Request(`${SITE}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  env, params: { path: [path] },
});
const realFetch = globalThis.fetch;
// A fake ElevenLabs that records every request.
function fakeEleven() {
  const sent = [];
  globalThis.fetch = async (url, o = {}) => {
    const body = JSON.parse(o.body || '{}'); sent.push({ url: String(url), body });
    if (/with-timestamps/.test(url)) {
      const text = body.text, chars = [...text];
      return Response.json({ audio_base64: btoa(String.fromCharCode(...new Uint8Array(2400))), alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.01), character_end_times_seconds: chars.map((_, i) => i * 0.01 + 0.01) } });
    }
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  return sent;
}

export const tests = [
  { name: 'the page and the server list the same real voices, by the same ids', fn: () => {
    const src = readFileSync(new URL('../../../functions/api/[[path]].js', import.meta.url), 'utf8');
    const block = /const ELEVEN_VOICES = \{([\s\S]*?)\};/.exec(src)[1];
    const server = Object.fromEntries([...block.matchAll(/(\w+): '(\w+)'/g)].map(m => [m[1], m[2]]));
    assert.deepEqual(server, Object.fromEntries(Object.entries(REAL_VOICES).map(([k, [, id]]) => [k, id])));
    assert.ok(Object.keys(REAL_VOICES).length >= 12);
  } },
  { name: 'Auto picks a voice that suits the character, else the narrator', fn: () => {
    assert.equal(realVoiceFor({ character: 'hype' }), 'liam');
    assert.equal(realVoiceFor({ character: 'trailer' }), 'brian');
    assert.equal(realVoiceFor({ voice: 'bm_george' }), 'george');
    assert.equal(realVoiceFor({ voice: 'af_sky' }), 'sarah');
    assert.equal(realVoiceFor({ realVoice: 'harry', character: 'hype' }), 'harry');
    assert.equal(realVoiceFor({ realVoice: 'nobody' }), 'brian');
    assert.equal(expressionOf({}), 'expressive'); assert.equal(expressionOf({ expression: 'natural' }), 'natural');
    assert.equal(Object.keys(EXPRESSIONS).length, 3);
  } },
  { name: 'a named voice is used; an unknown name falls back to the site voice', fn: async () => {
    try {
      const sent = fakeEleven();
      await call('speak', { text: 'Hello there.', eleven: 'harry' });
      await call('speak', { text: 'Hello there.', eleven: 'not-a-voice' });
      assert.match(sent[0].url, /SOYHLrjzK2X1ezoPC6cr/);
      assert.match(sent[1].url, /JBFqnCBsd6RMkjVDRZzb/);
    } finally { globalThis.fetch = realFetch; }
  } },
  { name: 'very expressive (the default): creative stability, feeling read into neutral lines, and a gasp for a shock', fn: async () => {
    try {
      const sent = fakeEleven();
      await call('speak', { text: 'It never came back!', eleven: 'liam' });
      assert.equal(sent[0].body.voice_settings.stability, 0);
      assert.match(sent[0].body.text, /^\[excited\] It never/);
      await call('speak', { text: 'Then the lights went out.', delivery: 'shocked' });
      assert.match(sent[1].body.text, /^\[shocked\] \[gasps\] Then/);
      await call('speak', { text: 'It never came back!', expression: 'natural' });
      assert.equal(sent[2].body.voice_settings.stability, 0.5);
      assert.equal(sent[2].body.text, 'It never came back!');
      await call('speak', { text: 'Plain.', expression: 'steady' });
      assert.equal(sent[3].body.voice_settings.stability, 1);
    } finally { globalThis.fetch = realFetch; }
  } },
  { name: 'a whole read: at most three little sounds, never on two lines in a row, and the tags never reach the captions', fn: async () => {
    try {
      const sent = fakeEleven();
      const lines = ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.'];
      const r = await call('speakall', { lines, deliveries: ['shocked', 'shocked', 'amused', 'sad', 'happy', 'relieved'], eleven: 'jessica' });
      assert.equal(r.headers.get('X-Loomy-Voice'), 'elevenlabs');
      const texts = sent.map(s => s.body.text).sort((a, b) => lines.findIndex(l => a.endsWith(l)) - lines.findIndex(l => b.endsWith(l)));
      const withSound = texts.map(t => /\[(gasps|chuckles|sighs|exhales|laughs)\]/.test(t));
      assert.ok(withSound.filter(Boolean).length <= 3 && withSound.filter(Boolean).length >= 2, JSON.stringify(texts));
      for (let i = 1; i < withSound.length; i++) assert.ok(!(withSound[i] && withSound[i - 1]), JSON.stringify(texts));
      assert.ok(sent.every(s => /cgSgspJ2msm6clMCkdW9/.test(s.url)));
      const words = JSON.parse(r.headers.get('X-Loomy-Words') || '[]').flat().map(w => w[2]);
      assert.ok(words.length && words.every(w => !/[\[\]]/.test(w)), JSON.stringify(words));
    } finally { globalThis.fetch = realFetch; }
  } },
];
