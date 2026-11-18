// Loomy account API (Cloudflare Pages Functions + D1).
// Optional Google sign-in. A signed-in person's library, settings (minus API keys) and boards
// are stored under their Google account id so they follow them to other devices.
//
// Bindings (set by the deploy script):  DB = D1 database,  GOOGLE_CLIENT_ID = OAuth web client id.
// Without them the site still works; /api/config just reports that sign-in is off.

const SESSION_DAYS = 30;
const MAX_VALUE = 900_000;            // characters per stored item
const SYNC_KEYS = new Set([
  'storyforge.settings.v1', 'storyforge.history.v1',
  'explainer.settings.v1', 'explainer.history.v1',
  'ideaboard.v1',
]);
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let schemaReady = null;
let jwksCache = { keys: null, until: 0 };

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = (params.path || []).join('/');
  try {
    // Writes must come from this site (cookies are SameSite=Lax as well).
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('Origin');
      if (origin && new URL(origin).host !== url.host) return json({ error: 'Wrong origin' }, 403);
    }
    if (path === 'config' && request.method === 'GET') {
      return json({ googleClientId: env.GOOGLE_CLIENT_ID || null, sync: !!env.DB });
    }
    if (!env.DB || !env.GOOGLE_CLIENT_ID) return json({ error: 'Sign-in is not set up on this site.' }, 503);
    await ensureSchema(env.DB);

    if (path === 'login' && request.method === 'POST') return await login(request, env, url);
    if (path === 'logout' && request.method === 'POST') return await logout(request, env, url);

    const user = await currentUser(request, env);
    if (path === 'me' && request.method === 'GET') return user ? json({ user: publicUser(user) }) : json({ user: null }, 401);
    if (!user) return json({ error: 'Not signed in' }, 401);

    if (path === 'data' && request.method === 'GET') return await getData(env, user);
    if (path === 'data' && request.method === 'PUT') return await putData(request, env, user);
    if (path === 'account' && request.method === 'DELETE') return await deleteAccount(request, env, url, user);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.status ? e.message : 'Server error' }, e.status || 500);
  }
}

// ---------- auth ----------
async function login(request, env, url) {
  const body = await readJson(request, 20_000);
  const claims = await verifyGoogleToken(String(body.credential || ''), env);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO users (sub, email, name, picture, created, seen) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
    ON CONFLICT(sub) DO UPDATE SET email = ?2, name = ?3, picture = ?4, seen = ?5`)
    .bind(claims.sub, claims.email || '', claims.name || '', claims.picture || '', now).run();
  const token = randomHex(32);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires < ?1').bind(now),
    env.DB.prepare('INSERT INTO sessions (id, sub, expires) VALUES (?1, ?2, ?3)').bind(await sha256(token), claims.sub, now + SESSION_DAYS * 864e5),
  ]);
  return json({ user: publicUser(claims) }, 200, { 'Set-Cookie': cookie(url, token, SESSION_DAYS * 86400) });
}

async function logout(request, env, url) {
  const token = readCookie(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(url, '', 0) });
}

async function currentUser(request, env) {
  const token = readCookie(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return env.DB.prepare(`SELECT u.sub, u.email, u.name, u.picture FROM sessions s JOIN users u ON u.sub = s.sub
    WHERE s.id = ?1 AND s.expires > ?2`).bind(await sha256(token), Date.now()).first();
}

async function deleteAccount(request, env, url, user) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM data WHERE sub = ?1').bind(user.sub),
    env.DB.prepare('DELETE FROM sessions WHERE sub = ?1').bind(user.sub),
    env.DB.prepare('DELETE FROM users WHERE sub = ?1').bind(user.sub),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(url, '', 0) });
}

// ---------- data ----------
async function getData(env, user) {
  const { results } = await env.DB.prepare('SELECT k, v, updated FROM data WHERE sub = ?1').bind(user.sub).all();
  const items = {};
  for (const r of results || []) items[r.k] = { v: r.v, updated: r.updated };
  return json({ items });
}

async function putData(request, env, user) {
  const body = await readJson(request, 5 * MAX_VALUE + 10_000);
  const items = body && typeof body.items === 'object' ? body.items : {};
  const now = Date.now();
  const stmts = [];
  const saved = {};
  for (const [k, item] of Object.entries(items)) {
    if (!SYNC_KEYS.has(k) || typeof item?.v !== 'string') continue;
    if (item.v.length > MAX_VALUE) continue;
    const updated = Math.min(now, Math.max(0, Number(item.updated) || now));
    // Keep whichever copy is newer.
    stmts.push(env.DB.prepare(`INSERT INTO data (sub, k, v, updated) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(sub, k) DO UPDATE SET v = excluded.v, updated = excluded.updated WHERE excluded.updated >= data.updated`)
      .bind(user.sub, k, item.v, updated));
    saved[k] = updated;
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, saved });
}

// ---------- Google ID token ----------
async function verifyGoogleToken(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw httpError(400, 'Bad sign-in token');
  let header, claims;
  try { header = JSON.parse(b64urlText(parts[0])); claims = JSON.parse(b64urlText(parts[1])); }
  catch { throw httpError(400, 'Bad sign-in token'); }
  if (header.alg !== 'RS256') throw httpError(401, 'Bad sign-in token');
  const jwk = (await googleKeys(env)).find(k => k.kid === header.kid);
  if (!jwk) throw httpError(401, 'Sign-in key not recognised. Try again.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw httpError(401, 'Sign-in token failed its check');
  const now = Date.now() / 1000;
  if (!GOOGLE_ISS.has(claims.iss)) throw httpError(401, 'Token is not from Google');
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw httpError(401, 'Token is for a different app');
  if (!(claims.exp > now - 60)) throw httpError(401, 'Sign-in expired. Try again.');
  if (!claims.sub) throw httpError(401, 'Bad sign-in token');
  return claims;
}

async function googleKeys(env) {
  if (jwksCache.keys && jwksCache.until > Date.now()) return jwksCache.keys;
  // DEV_JWKS_URL exists only for local tests; production uses Google's keys.
  const res = await fetch(env.DEV_JWKS_URL || GOOGLE_JWKS);
  if (!res.ok) throw httpError(502, 'Could not reach Google. Try again.');
  const { keys } = await res.json();
  jwksCache = { keys, until: Date.now() + 3600e3 };
  return keys;
}

// ---------- helpers ----------
async function ensureSchema(db) {
  schemaReady ||= db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS users (sub TEXT PRIMARY KEY, email TEXT, name TEXT, picture TEXT, created INTEGER, seen INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, sub TEXT NOT NULL, expires INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS data (sub TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (sub, k))'),
  ]).catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}
function publicUser(u) { return { name: u.name || '', email: u.email || '', picture: u.picture || '' }; }
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
async function readJson(request, limit) {
  const text = await request.text();
  if (text.length > limit) throw httpError(413, 'Too much data');
  try { return JSON.parse(text); } catch { throw httpError(400, 'Bad request'); }
}
function cookie(url, value, maxAge) {
  return `loomy_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function readCookie(request) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)loomy_sid=([^;]+)/);
  return m ? m[1] : null;
}
function randomHex(n) { return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function b64urlText(s) { return new TextDecoder().decode(b64urlBytes(s)); }
