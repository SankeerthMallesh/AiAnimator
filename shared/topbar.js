// The Loomy pill-tab header for a section page opened on its own (inside Loomy the main page shows
// it already). Text labels on every tab; the current one is white; each tab opens Loomy on it.
const TABS = [['cartoon', 'Cartoons', '/'], ['3d', '3D', '/#3d'], ['blocky', 'Blocky', '/#blocky'], ['clips', 'Clips', '/#clips'], ['edit', 'Edit', '/#edit'], ['board', 'Board', '/#board']];
function current() {
  const p = location.pathname, style = new URLSearchParams(location.search).get('style');
  if (p.includes('/explainer')) return style === 'blocky' ? 'blocky' : '3d';
  if (p.includes('/clip')) return 'clips';
  if (p.includes('/editor')) return 'edit';
  if (p.includes('/board')) return 'board';
  return 'cartoon';
}
function mount() {
  let embedded = true;
  try { embedded = window.top !== window; } catch { embedded = true; }
  if (embedded || document.querySelector('.loomy-topbar')) return;
  const cur = current();
  const bar = document.createElement('header');
  bar.className = 'loomy-topbar';
  bar.innerHTML = `<a class="lt-brand" href="/" aria-label="Loomy home"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#FAFAFA"/><circle cx="16" cy="11" r="4.5" fill="#0A0A0A"/><path d="M16 15.5v7M11 18.5h10M16 22.5l-3.5 5M16 22.5l3.5 5" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round"/></svg><span>Loomy</span></a>
    <nav class="lt-tabs" aria-label="Sections">${TABS.map(([id, label, href]) => `<a class="lt-tab" href="${href}"${id === cur ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
  document.body.prepend(bar);
  document.documentElement.classList.add('has-topbar');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
