// Can this computer draw the 3D cartoon town (L5) without struggling? The town is the best-looking
// Cartoons look, but it is a full WebGL film engine: on a computer with software graphics or a weak
// card it is slow and once took a PC down. So it is the default only where the graphics look strong,
// and never again on a computer where a town render failed.
const WEAK_KEY = 'loomy.townWeak';

export function markTownWeak() { try { localStorage.setItem(WEAK_KEY, '1'); } catch { /* storage off */ } }

export function strongGraphics() {
  try { if (localStorage.getItem(WEAK_KEY)) return { ok: false, why: 'a 3D town render failed here before' }; } catch { /* storage off */ }
  let gl = null;
  try { gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true }); } catch { gl = null; }
  if (!gl) return { ok: false, why: 'no hardware WebGL 2' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i.test(name)) return { ok: false, why: `software graphics (${name})` };
  if (maxTex < 8192) return { ok: false, why: `small graphics card (${maxTex}px textures)` };
  // Older or low-power integrated chips (common in cheap laptops and Chromebooks).
  if (/intel.*(hd graphics [2-5]\d{2}\b|hd graphics$|uhd graphics 6\d{2}|gma)|mali-[gt][0-7]\d\b|adreno.*[3-5]\d{2}\b|powervr/i.test(name)) return { ok: false, why: `low-power graphics (${name})` };
  const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency || 0;
  if ((mem && mem < 8) || (cores && cores < 6)) return { ok: false, why: `${mem ? `${mem} GB memory, ` : ''}${cores} cores` };
  return { ok: true, why: name };
}
