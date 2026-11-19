// Loomy access lock. When the site has an ACCESS_SECRET, every page and file needs an access code
// first. Codes are made only on the owner's computer (tools/access-code.sh) from that secret, so the
// server checks them without keeping a list. A browser that entered a valid code gets a signed pass
// and is not asked again until the code expires. Without ACCESS_SECRET the site is open.
//
// Code format: LOOMY-<YYYYMMDD expiry>-<12 hex of HMAC-SHA256(secret, "code:"+expiry)>
// "forever" codes use the expiry 99991231.

const COOKIE = 'loomy_pass';
// A shared "just looking" code: it opens the pages but not the tools. Change it with a VIEW_CODE
// secret; set VIEW_CODE to "off" to turn view-only codes off.
const DEFAULT_VIEW_CODE = '1111';
// What a view-only pass may not use on the server (the AI that makes videos).
const VIEW_BLOCKED = /^\/api\/(image|write)\b/;
const MAX_AGE = 400 * 86400; // browsers cap cookies at 400 days; the pass is renewed on every visit

export async function onRequest(context) {
  const { request, env, next } = context;
  const secret = env.ACCESS_SECRET;
  if (!secret) {
    // No lock on this site: everyone has full access.
    if (new URL(request.url).pathname === '/__access/status') return Response.json({ role: 'full', locked: false }, { headers: { 'Cache-Control': 'no-store' } });
    return next();
  }
  const url = new URL(request.url);

  const viewCode = String(env.VIEW_CODE || DEFAULT_VIEW_CODE).trim().toUpperCase();
  if (url.pathname === '/__access' && request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const code = String(form?.get('code') || '').trim().toUpperCase().replace(/\s+/g, '');
    const back = safePath(String(form?.get('back') || '/'));
    const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
    let pass = null;
    const exp = await checkCode(code, secret);
    if (exp) pass = { exp, role: 'full' };
    else if (viewCode !== 'OFF' && code && code === viewCode) pass = { exp: '99991231', role: 'view' };
    if (!pass) {
      if (wantsJson) return Response.json({ ok: false, error: 'That code is not valid or has expired.' }, { headers: { 'Cache-Control': 'no-store' } });
      return gate(back, 'That code is not valid or has expired.', 200);
    }
    const cookie = await passCookie(pass, secret, url);
    if (wantsJson) return Response.json({ ok: true, role: pass.role }, { headers: { 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
    return new Response(null, { status: 303, headers: { Location: back, 'Set-Cookie': cookie } });
  }

  const pass = await checkPass(request, secret);
  if (url.pathname === '/__access/status') {
    return Response.json({ role: pass ? pass.role : 'none', locked: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
  // View-only visitors can look around, but the server will not make anything for them.
  if (pass?.role === 'view' && VIEW_BLOCKED.test(url.pathname)) {
    return Response.json({ ok: false, viewOnly: true, error: 'View-only access: enter a full access code in Settings to make videos.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (!pass) {
    // Pages get the code screen; files and the API just get a refusal.
    const wantsPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
    if (wantsPage) return gate(url.pathname + url.search + url.hash, '', 200);
    return new Response('Locked: enter an access code on the Loomy home page first.', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const res = await next();
  // Renew the pass on page visits, so a browser that already got in is never asked again
  // until its code expires.
  if ((res.headers.get('Content-Type') || '').includes('text/html')) {
    const out = new Response(res.body, res);
    out.headers.append('Set-Cookie', await passCookie(pass, secret, url));
    out.headers.set('Cache-Control', 'no-store');
    return out;
  }
  return res;
}

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function expired(exp) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return exp < today;
}

// Returns the expiry (YYYYMMDD) for a valid code, or null.
async function checkCode(code, secret) {
  const m = code.match(/^(?:LOOMY-)?(\d{8})-([0-9A-F]{12})$/);
  if (!m || expired(m[1])) return null;
  const want = (await hmacHex(secret, `code:${m[1]}`)).slice(0, 12).toUpperCase();
  return same(want, m[2]) ? m[1] : null;
}

// Pass cookie: "<exp>.<sig>" for full access, "v<exp>.<sig>" for view-only.
async function passCookie(pass, secret, url) {
  const view = pass.role === 'view';
  const sig = await hmacHex(secret, `${view ? 'view' : 'pass'}:${pass.exp}`);
  return `${COOKIE}=${view ? 'v' : ''}${pass.exp}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${url.protocol === 'https:' ? '; Secure' : ''}`;
}

async function checkPass(request, secret) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=(v?)(\\d{8})\\.([0-9a-f]{64})`));
  if (!m || expired(m[2])) return null;
  const view = m[1] === 'v';
  const ok = same(await hmacHex(secret, `${view ? 'view' : 'pass'}:${m[2]}`), m[3]);
  return ok ? { exp: m[2], role: view ? 'view' : 'full' } : null;
}

function safePath(p) {
  return p.startsWith('/') && !p.startsWith('//') ? p.slice(0, 500) : '/';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gate(back, error, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loomy</title><meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27%233D8BFF%27/%3E%3C/svg%3E">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(800px 380px at 50% -80px,rgba(61,139,255,.28),transparent 70%),#121212;color:#ECECEC;font:15px/1.5 Inter,ui-sans-serif,-apple-system,"Segoe UI",sans-serif}
main{width:min(420px,100%);padding:28px;border-radius:20px;border:1px solid transparent;background:linear-gradient(#1B1B1B,#1B1B1B) padding-box,linear-gradient(135deg,rgba(61,139,255,.75),rgba(168,85,247,.45) 45%,rgba(255,255,255,.08)) border-box;box-shadow:0 40px 90px -40px rgba(61,139,255,.55)}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:22px;letter-spacing:-.02em;margin-bottom:18px}
.logo i{width:32px;height:32px;border-radius:9px;background:#3D8BFF;display:grid;place-items:center;font-style:normal}
h1{font-size:20px;margin:0 0 6px}p{margin:0 0 18px;color:#A1A1A1}
input{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #383838;background:#222;color:#ECECEC;font:600 15px ui-monospace,Menlo,monospace;letter-spacing:.01em;text-transform:uppercase}
input:focus{outline:none;border-color:#3D8BFF;box-shadow:0 0 0 3px rgba(61,139,255,.25)}
button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,#3D8BFF,#7C5CFF);color:#fff;font:600 15px inherit;font-family:inherit;cursor:pointer}
.err{margin:12px 0 0;color:#FF6B61;font-size:14px}
small{display:block;margin-top:16px;color:#6C6C6C;font-size:12.5px}
</style></head><body><main>
<div class="logo"><i>🎬</i>Loomy</div>
<h1>Enter your access code</h1>
<p>Loomy is private. Ask the owner for a code. You only need to enter it once on this device.</p>
<form method="post" action="/__access">
<input name="code" placeholder="LOOMY-20261231-ABC123DEF456" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" required autofocus>
<input type="hidden" name="back" value="${esc(back)}">
<button type="submit">Unlock Loomy</button>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
</form>
<small>This device stays unlocked until the code expires.</small>
</main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
