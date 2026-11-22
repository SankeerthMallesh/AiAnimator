// 1.6: yield to the page without timers. Browsers slow timers down in a background tab (at least 1 s,
// and up to a minute after 5 minutes), so an export that paused with setTimeout crawled whenever the
// person switched tabs while waiting. Message-channel tasks are not slowed that way.
const ch = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const waiting = [];
if (ch) ch.port1.onmessage = () => { const r = waiting.shift(); if (r) r(); };
export function nextTask() {
  if (!ch) return new Promise(r => setTimeout(r, 0));
  return new Promise(r => { waiting.push(r); ch.port2.postMessage(0); });
}

// Wait until the encoder's queue is down to `max`: on its 'dequeue' event where the browser has it,
// else by yielding (never a timer).
export async function drain(enc, max = 6) {
  while (enc.encodeQueueSize > max) {
    if ('ondequeue' in enc) await new Promise(r => { enc.addEventListener('dequeue', r, { once: true }); nextTask().then(() => { if (enc.encodeQueueSize <= max) r(); }); });
    else await nextTask();
  }
}
