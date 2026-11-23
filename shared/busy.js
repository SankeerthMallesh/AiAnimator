// Loomy 2.3: while a tab is making a video it says so (the home page never unloads a busy tab to free a phone's
// memory) and keeps the screen awake (a phone that locks mid-render suspends the page and the video is lost).
let lock = null;
export function markBusy(on) {
  // (window.loomyBusy is the apps' own function; this flag sits beside it)
  try { window.loomyWorking = !!on; } catch { /* no window */ }
  if (on) {
    try { navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {}); } catch { /* not offered */ }
  } else { try { lock?.release(); } catch { /* gone */ } lock = null; }
}
// a released wake lock comes back when the page is shown again during a render
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && window.loomyWorking && !lock) markBusy(true); });
/** a phone: a touch screen that is small on its short side */
export const isPhone = () => {
  try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600; } catch { return false; }
};
