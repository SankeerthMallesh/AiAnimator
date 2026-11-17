// Network helpers shared by the script, image and voice modules.

// fetch() that gives up after `ms` and still honours the caller's own abort signal.
// Free AI endpoints sometimes accept a request and then never answer; without a deadline that
// one request would hold a worker slot, and the whole video, hostage.
//
// With `kind` ('blob' | 'text' | 'arrayBuffer') the body is read inside the same deadline and
// returned as { res, data }. Without it the plain Response is returned (deadline covers headers).
export async function fetchTimeout(url, opts = {}, ms = 45000, kind = null) {
  const { signal: parent, ...rest } = opts;
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, ms);
  const onParentAbort = () => ctrl.abort();
  if (parent) {
    if (parent.aborted) ctrl.abort();
    else parent.addEventListener('abort', onParentAbort, { once: true });
  }
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal });
    if (!kind) return res;
    // Read the body even for errors, so callers can show the server's message.
    const data = await res[kind]();
    return { res, data };
  } catch (e) {
    if (timedOut && !parent?.aborted) {
      const err = new Error(`timed out after ${Math.round(ms / 1000)}s`);
      err.timeout = true;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onParentAbort);
  }
}
