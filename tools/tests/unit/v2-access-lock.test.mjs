// The access lock (functions/_middleware.js): full codes, the view-only code, expiry, and what each may do.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onRequest } from '../../../functions/_middleware.js';

const SECRET = 'test-secret';
const SITE = 'https://loomy-app.pages.dev';
const codeFor = (exp) => `LOOMY-${exp}-${createHmac('sha256', SECRET).update(`code:${exp}`).digest('hex').slice(0, 12).toUpperCase()}`;
const next = async () => new Response('<html>page</html>', { headers: { 'Content-Type': 'text/html' } });
const req = (path, { method = 'GET', cookie, form, accept = 'text/html' } = {}) => new Request(SITE + path, {
  method, headers: { Accept: accept, ...(cookie ? { Cookie: cookie } : {}) }, ...(form ? { body: new URLSearchParams(form) } : {}),
});
const run = (request, env = { ACCESS_SECRET: SECRET }) => onRequest({ request, env, next });
async function enter(code, env) {
  const r = await run(req('/__access', { method: 'POST', form: { code, back: '/cartoon/' }, accept: 'application/json' }), env);
  const j = await r.json();
  return { j, cookie: (r.headers.get('Set-Cookie') || '').split(';')[0] };
}

export const tests = [
  { name: 'without a secret the site is open', fn: async () => {
    const r = await run(req('/'), {});
    assert.equal(await r.text(), '<html>page</html>');
    assert.deepEqual(await (await run(req('/__access/status'), {})).json(), { role: 'full', locked: false });
  } },
  { name: 'locked: a page shows the gate, an API call gets 401', fn: async () => {
    assert.match(await (await run(req('/cartoon/'))).text(), /access code|code/i);
    assert.equal((await run(req('/api/write', { method: 'POST', accept: '*/*' }))).status, 401);
  } },
  { name: 'a full code (any letter case, with or without spaces) unlocks everything', fn: async () => {
    const { j, cookie } = await enter(' ' + codeFor('99991231').toLowerCase() + ' ');
    assert.deepEqual(j, { ok: true, role: 'full' });
    const api = await run(req('/api/write', { method: 'POST', cookie, accept: '*/*' }));
    assert.equal(await api.text(), '<html>page</html>', 'the API is reached');
    assert.deepEqual(await (await run(req('/__access/status', { cookie }))).json(), { role: 'full', locked: true });
  } },
  { name: 'an expired code and a wrong code are refused', fn: async () => {
    assert.equal((await enter(codeFor('20200101'))).j.ok, false);
    assert.equal((await enter('LOOMY-99991231-ABCDEF012345')).j.ok, false);
  } },
  { name: 'the view-only code opens the pages but not the AI', fn: async () => {
    const { j, cookie } = await enter('1111');
    assert.equal(j.role, 'view');
    assert.equal(await (await run(req('/cartoon/', { cookie }))).text(), '<html>page</html>');
    for (const p of ['/api/write', '/api/speak', '/api/image', '/api/speakall']) {
      const r = await (await run(req(p, { method: 'POST', cookie, accept: '*/*' }))).json();
      assert.equal(r.viewOnly, true, p);
    }
  } },
  { name: 'VIEW_CODE=off turns the view-only code off', fn: async () => {
    assert.equal((await enter('1111', { ACCESS_SECRET: SECRET, VIEW_CODE: 'off' })).j.ok, false);
  } },
  { name: 'a forged pass cookie is not accepted', fn: async () => {
    const r = await run(req('/api/write', { method: 'POST', cookie: `loomy_pass=99991231.${'0'.repeat(64)}`, accept: '*/*' }));
    assert.equal(r.status, 401);
  } },
];
