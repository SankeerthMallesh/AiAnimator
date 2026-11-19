// Loomy account: optional "Sign in with Google" plus sync of saved work between devices.
// Signed out, everything stays in this browser like before. API keys are never uploaded.
(() => {
  const SYNC_KEYS = ['storyforge.settings.v1', 'storyforge.history.v1', 'explainer.settings.v1', 'explainer.history.v1', 'ideaboard.v1'];
  const MTIME = 'loomy.sync.mtime';          // when each key last changed in this browser
  const SECRET = /(Key|Token)$/;              // settings fields that stay on this device
  const $ = (id) => document.getElementById(id);
  const box = $('account');
  let user = null, clientId = null, pushTimer = null, applying = false, lastSync = 0;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  };
  const mtimes = () => { try { return JSON.parse(ls.get(MTIME) || '{}'); } catch { return {}; } };
  const touch = (k, t = Date.now()) => { const m = mtimes(); m[k] = t; ls.set(MTIME, JSON.stringify(m)); };

  async function api(path, opts = {}) {
    const res = await fetch('/api/' + path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    let body = null; try { body = await res.json(); } catch { /* empty */ }
    if (!res.ok) { const e = new Error(body?.error || `Request failed (${res.status})`); e.status = res.status; throw e; }
    return body;
  }

  // ----- what gets uploaded, and how a downloaded copy is merged in -----
  function outgoing(k, raw) {
    if (!k.endsWith('.settings.v1')) return raw;
    try { const o = JSON.parse(raw); for (const f of Object.keys(o)) if (SECRET.test(f)) delete o[f]; return JSON.stringify(o); }
    catch { return raw; }
  }
  function merged(k, local, remote) {
    if (k.endsWith('.history.v1')) {
      // Keep every project from both sides, newest first.
      try {
        const byId = new Map();
        for (const p of [...JSON.parse(remote || '[]'), ...JSON.parse(local || '[]')]) if (p?.id) byId.set(p.id, p);
        return JSON.stringify([...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30));
      } catch { return remote; }
    }
    if (k.endsWith('.settings.v1')) {
      // Take the synced settings but keep this device's own API keys.
      try { const l = JSON.parse(local || '{}'), r = JSON.parse(remote); for (const f of Object.keys(l)) if (SECRET.test(f)) r[f] = l[f]; return JSON.stringify(r); }
      catch { return remote; }
    }
    return remote;
  }

  // When this device last synced with which account. A device that never synced takes the
  // account's copy, combined with any real work it already had, so nothing is lost.
  const LAST = 'loomy.sync.last';
  function lastFor(u) { try { const l = JSON.parse(ls.get(LAST) || '{}'); return l.acct === u.email ? l.t || 0 : 0; } catch { return 0; } }
  function markSynced(u) { ls.set(LAST, JSON.stringify({ acct: u.email, t: Date.now() })); }

  // The starter notes every new board begins with; they never count as someone's work.
  const SAMPLE = new Set(['Video idea|Why do railroad tracks have gaps?', 'Hook|A "perfect" railroad would rip itself apart', 'Fact to check|How much does steel grow on a hot day?']);
  const isSampleNote = (n) => SAMPLE.has(`${n.title}|${n.body}`);
  function isSampleBoard(raw) {
    try { return (JSON.parse(raw).notes || []).every(isSampleNote); } catch { return false; }
  }
  function unionBoards(localRaw, remoteRaw) {
    try {
      const l = JSON.parse(localRaw), r = JSON.parse(remoteRaw);
      const ids = new Set(r.notes.map(n => n.id));
      const notes = [...r.notes, ...l.notes.filter(n => !ids.has(n.id) && !isSampleNote(n)).map(n => ({ ...n, x: n.x + 40, y: n.y + 40 }))];
      const key = (x) => [x.a, x.b].sort().join('|');
      const seen = new Set(r.links.map(key));
      const keep = new Set(notes.map(n => n.id));
      const links = [...r.links, ...l.links.filter(x => !seen.has(key(x)) && keep.has(x.a) && keep.has(x.b))];
      return JSON.stringify({ ...r, notes, links });
    } catch { return remoteRaw; }
  }

  // Pull the account copy, merge, and push back whatever this browser has that is newer.
  async function syncNow() {
    if (!user) return false;
    setStatus('Syncing…');
    const { items } = await api('data');
    const m = mtimes();
    const first = lastFor(user) === 0;
    const up = {};
    let changed = false;
    const take = (k, next) => { if (next !== ls.get(k)) { ls.set(k, next); changed = true; } };
    applying = true;
    for (const k of SYNC_KEYS) {
      const local = ls.get(k), remote = items[k];
      const lt = m[k] || 0;
      if (!remote) {
        if (local) up[k] = { v: outgoing(k, local), updated: lt || Date.now() };
        continue;
      }
      if (!local) { take(k, remote.v); touch(k, remote.updated); continue; }
      let next;
      if (k.endsWith('.history.v1')) next = merged(k, local, remote.v);
      else if (k === 'ideaboard.v1' && first) next = isSampleBoard(local) ? remote.v : unionBoards(local, remote.v);
      else if (first || remote.updated > lt) next = merged(k, local, remote.v);
      else if (lt > remote.updated) { up[k] = { v: outgoing(k, local), updated: lt }; continue; }
      else continue;
      take(k, next);
      touch(k, Math.max(remote.updated, lt));
      if (outgoing(k, next) !== remote.v) up[k] = { v: outgoing(k, next), updated: Date.now() };
    }
    applying = false;
    if (Object.keys(up).length) await api('data', { method: 'PUT', body: JSON.stringify({ items: up }) });
    lastSync = Date.now();
    markSynced(user);
    setStatus('Synced');
    return changed;
  }

  // Changes made inside any section show up here as storage events.
  addEventListener('storage', (e) => {
    if (applying || !e.key || !SYNC_KEYS.includes(e.key)) return;
    touch(e.key);
    if (!user) return;
    clearTimeout(pushTimer);
    setStatus('Changes not synced yet');
    pushTimer = setTimeout(push, 15000);
  });
  async function push(useKeepalive = false) {
    clearTimeout(pushTimer);
    if (!user) return;
    const m = mtimes();
    const items = {};
    for (const k of SYNC_KEYS) { const v = ls.get(k); if (v && (m[k] || 0) > lastSync) items[k] = { v: outgoing(k, v), updated: m[k] }; }
    if (!Object.keys(items).length) return;
    const body = JSON.stringify({ items });
    try {
      await fetch('/api/data', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body, keepalive: useKeepalive && body.length < 60000 });
      lastSync = Date.now();
      setStatus('Synced');
    } catch { setStatus('Offline: will sync later'); }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(true); });

  // ----- UI -----
  function setStatus(t) { const s = $('acctStatus'); if (s) s.textContent = t; }
  function initials(u) { return (u.name || u.email || '?').trim().charAt(0).toUpperCase(); }
  function render() {
    box.replaceChildren();
    if (!clientId) { box.hidden = true; return; }
    box.hidden = false;
    if (!user) {
      const slot = document.createElement('div');
      slot.className = 'gsi-slot';
      box.append(slot);
      if (window.google?.accounts?.id) {
        google.accounts.id.renderButton(slot, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin', type: innerWidth < 560 ? 'icon' : 'standard' });
      } else {
        const b = document.createElement('button');
        b.className = 'acct-btn'; b.textContent = 'Sign in';
        b.onclick = () => toast('Google sign-in did not load. Check your connection and refresh.');
        slot.append(b);
      }
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'avatar'; btn.setAttribute('aria-label', 'Your account'); btn.setAttribute('aria-expanded', 'false');
    if (user.picture) { const img = new Image(); img.src = user.picture; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.onerror = () => { img.replaceWith(initials(user)); }; btn.append(img); }
    else btn.textContent = initials(user);
    const menu = document.createElement('div');
    menu.className = 'acct-menu'; menu.hidden = true;
    menu.innerHTML = `<div class="who"><b></b><span></span></div><p class="status" id="acctStatus">Synced</p>
      <button data-a="sync">Sync now</button><button data-a="out">Sign out</button><button data-a="del" class="danger">Delete my synced data</button>`;
    menu.querySelector('b').textContent = user.name || 'Signed in';
    menu.querySelector('.who span').textContent = user.email || '';
    btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
    menu.onclick = async (e) => {
      const a = e.target.closest('button')?.dataset.a; if (!a) return;
      try {
        if (a === 'sync') { const changed = await syncNow(); if (changed) reloadSections(); toast('Synced.'); }
        if (a === 'out') { await push(); await api('logout', { method: 'POST' }); user = null; window.google?.accounts?.id?.disableAutoSelect?.(); render(); loadGis().then(() => { if (!user) render(); }); toast('Signed out. Your work stays in this browser.'); }
        if (a === 'del') {
          if (!confirm('Delete everything Loomy saved to your account? Work saved in this browser is kept.')) return;
          await api('account', { method: 'DELETE' }); user = null; render(); loadGis().then(() => { if (!user) render(); }); toast('Your synced data was deleted.');
        }
      } catch (err) { toast(err.message); }
    };
    box.append(btn, menu);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.acct-menu')) return;
    const m = box.querySelector('.acct-menu'); if (m) m.hidden = true;
    box.querySelector('.avatar')?.setAttribute('aria-expanded', 'false');
  });
  function toast(msg) {
    const t = $('toast'); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 3500);
  }
  function reloadSections() {
    for (const f of document.querySelectorAll('#views iframe')) {
      let busy = false;
      try { busy = !!f.contentWindow.loomyBusy?.(); } catch { /* not ready */ }
      if (!busy) f.contentWindow.location.reload();
    }
  }

  async function signIn(credential) {
    try {
      const r = await api('login', { method: 'POST', body: JSON.stringify({ credential }) });
      user = r.user; render();
      const changed = await syncNow();
      if (changed) reloadSections();
      toast(`Signed in as ${user.name || user.email}. Your work now syncs.`);
    } catch (e) { toast(`Sign-in failed: ${e.message}`); }
  }

  let gisLoading = null;
  function loadGis() {
    if (gisLoading) return gisLoading;
    return (gisLoading = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => {
        try { google.accounts.id.initialize({ client_id: clientId, callback: (r) => signIn(r.credential), auto_select: false, cancel_on_tap_outside: true, use_fedcm_for_prompt: true }); } catch { /* shown as fallback */ }
        resolve();
      };
      s.onerror = () => resolve();
      document.head.append(s);
      setTimeout(resolve, 4000);
    }));
  }

  // Before the sections load: find out who is signed in and bring their latest work into this browser.
  async function start() {
    try {
      const cfg = await api('config');
      clientId = cfg.googleClientId && cfg.sync ? cfg.googleClientId : null;
    } catch { clientId = null; }
    if (!clientId) { render(); return; }
    try { user = (await api('me')).user; } catch { user = null; }
    render();
    // Google's sign-in script is only needed to sign in, so a signed-in visit never loads it.
    if (!user) loadGis().then(() => { if (!user) render(); });
    if (user) { try { await syncNow(); } catch { setStatus('Offline: will sync later'); } }
  }

  window.LoomyAccount = {
    ready: Promise.race([start(), new Promise(r => setTimeout(r, 3000))]),
    signIn,                // used by tests; Google calls it through the button
  };
})();
