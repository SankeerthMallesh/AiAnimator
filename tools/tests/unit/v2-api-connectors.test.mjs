// The site's connectors (functions/api): every endpoint against fake AI services, so a broken
// connection shows up here instead of on the live site. No real key or network is used.
import assert from 'node:assert/strict';
import { onRequest } from '../../../functions/api/[[path]].js';

const SITE = 'https://loomy-app.pages.dev';
const call = (path, { method = 'POST', body, env = {}, origin } = {}) => onRequest({
  request: new Request(`${SITE}/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  env, params: { path: path.split('/') },
});
// A fake internet: each test says what the services answer.
function fakeFetch(routes) {
  const seen = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); seen.push(u);
    for (const [re, fn] of routes) if (re.test(u)) return fn(u, opts);
    return new Response('{}', { status: 404 });
  };
  return seen;
}
const realFetch = globalThis.fetch;
const done = () => { globalThis.fetch = realFetch; };
const wavB64 = btoa(String.fromCharCode(...new Uint8Array(48000 * 0.2 * 2)));

export const tests = [
  { name: 'config reports which writer and voice the stored keys give', fn: async () => {
    let j = await (await call('config', { method: 'GET', env: { GROQ_KEY: 'g', ELEVEN_KEY: 'e', GEMINI_KEY: 'm' } })).json();
    assert.deepEqual([j.ai, j.writer, j.voice], [true, 'groq', 'elevenlabs']);
    j = await (await call('config', { method: 'GET', env: {} })).json();
    assert.deepEqual([j.ai, j.writer, j.voice, j.sync], [false, null, null, false]);
  } },
  { name: 'a write from another site is refused', fn: async () => {
    const r = await call('write', { env: { GROQ_KEY: 'g' }, body: { messages: [{ role: 'user', content: 'hi' }] }, origin: 'https://evil.example' });
    assert.equal(r.status, 403);
  } },
  { name: 'write: Groq answers first; if Groq fails, Gemini; the reason is kept', fn: async () => {
    try {
      let seen = fakeFetch([[/groq\.com.*chat/, () => Response.json({ choices: [{ message: { content: '{"title":"ok"}' } }] })]]);
      let j = await (await call('write', { env: { GROQ_KEY: 'g', GEMINI_KEY: 'm' }, body: { messages: [{ role: 'user', content: 'Write' }] } })).json();
      assert.equal(j.ok, true); assert.equal(j.by, 'groq'); assert.equal(j.text, '{"title":"ok"}');
      assert.ok(seen.every(u => /groq/.test(u)), 'Gemini not asked when Groq answers');
      seen = fakeFetch([[/groq\.com/, () => Response.json({ error: { message: 'rate limited' } }, { status: 429 })],
        [/generativelanguage.*generateContent/, () => Response.json({ candidates: [{ content: { parts: [{ text: '{"title":"from gemini"}' }] } }] })]]);
      j = await (await call('write', { env: { GROQ_KEY: 'g', GEMINI_KEY: 'm' }, body: { messages: [{ role: 'user', content: 'Write' }] } })).json();
      assert.equal(j.ok, true); assert.equal(j.by, 'gemini'); assert.match(j.text, /from gemini/);
    } finally { done(); }
  } },
  { name: 'write: no messages, bad JSON and too much data get clear answers', fn: async () => {
    let j = await (await call('write', { env: { GROQ_KEY: 'g' }, body: { messages: [] } })).json();
    assert.equal(j.ok, false);
    const bad = await onRequest({ request: new Request(`${SITE}/api/write`, { method: 'POST', body: '{not json' }), env: { GROQ_KEY: 'g' }, params: { path: ['write'] } });
    assert.equal(bad.status, 400);
    j = await (await call('write', { env: {} , body: { messages: [{ role: 'user', content: 'x' }] } })).json();
    assert.equal(j.ok, false); assert.match(j.error, /not connected/);
  } },
  { name: 'write: the "Fix it for me" request (a whole script, about 30 kB) goes through', fn: async () => {
    try {
      fakeFetch([[/groq\.com.*chat/, (u, o) => Response.json({ choices: [{ message: { content: JSON.parse(o.body).messages.at(-1).content.length > 30000 ? 'ok-long' : 'short' } }] })]]);
      const script = JSON.stringify({ scenes: Array.from({ length: 120 }, (_, i) => ({ narration: `Line ${i} `.repeat(30) })) });
      const j = await (await call('write', { env: { GROQ_KEY: 'g' }, body: { messages: [{ role: 'system', content: 'doctor' }, { role: 'user', content: script }] } })).json();
      assert.equal(j.ok, true); assert.equal(j.text, 'ok-long');
    } finally { done(); }
  } },
  { name: 'speak: ElevenLabs first, with the delivery tag; Gemini when it fails, and why', fn: async () => {
    try {
      let sent = null;
      fakeFetch([[/elevenlabs\.io/, (u, o) => { sent = JSON.parse(o.body); return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } }); }]]);
      let r = await call('speak', { env: { ELEVEN_KEY: 'e' }, body: { text: 'If you flush in space, it floats.', delivery: 'excited' } });
      assert.equal(r.headers.get('X-Loomy-Voice'), 'elevenlabs'); assert.match(sent.text, /^\[excited\] If you flush/);
      fakeFetch([[/elevenlabs\.io/, () => Response.json({ detail: { status: 'quota_exceeded' } }, { status: 401 })],
        [/generativelanguage.*generateContent/, () => Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: wavB64 } }] } }] })]]);
      r = await call('speak', { env: { ELEVEN_KEY: 'e', GEMINI_KEY: 'm' }, body: { text: 'Hello there.', speaker: 'luna' } });
      assert.equal(r.headers.get('X-Loomy-Voice'), 'gemini');
      assert.ok((await r.arrayBuffer()).byteLength > 1000);
    } finally { done(); }
  } },
  { name: 'speak: with every voice down the answer says what was tried', fn: async () => {
    try {
      fakeFetch([[/elevenlabs\.io/, () => Response.json({ detail: 'nope' }, { status: 500 })]]);
      const j = await (await call('speak', { env: { ELEVEN_KEY: 'e' }, body: { text: 'Hello.' } })).json();
      assert.equal(j.ok, false); assert.match(j.error, /ElevenLabs said 500/);
      const e = await (await call('speak', { env: { ELEVEN_KEY: 'e' }, body: { text: '   ' } })).json();
      assert.match(e.error, /No text/);
    } finally { done(); }
  } },
  { name: 'image: a picture comes back from Cloudflare AI; a used-up allowance says so', fn: async () => {
    const pic = btoa('\xff\xd8\xff\xe0fakejpeg');
    let r = await call('image', { env: { AI: { run: async () => ({ image: pic }) } }, body: { prompt: 'a red rocket' } });
    assert.equal(r.headers.get('Content-Type'), 'image/jpeg');
    const j = await (await call('image', { env: { AI: { run: async () => { throw new Error('4006: daily neuron limit exceeded'); } } }, body: { prompt: 'x' } })).json();
    assert.equal(j.used, true); assert.match(j.error, /allowance is used up/);
    const n = await (await call('image', { env: {}, body: { prompt: 'x' } })).json();
    assert.equal(n.ok, false);
  } },
  { name: 'sign-in endpoints answer calmly when sign-in is not set up', fn: async () => {
    const me = await (await call('me', { method: 'GET', env: {} })).json();
    assert.deepEqual(me, { user: null });
    const d = await call('data', { method: 'GET', env: {} });
    assert.equal(d.status, 503);
  } },
];
