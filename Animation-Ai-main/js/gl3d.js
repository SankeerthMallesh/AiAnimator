// "2.5D" cinematic camera: renders an image + its depth map with real parallax.
// Near objects move and grow faster than far ones, so a still frame feels like a camera
// moving through a 3D set (dolly, truck, crane, orbit, vertigo), with depth of field,
// atmospheric haze and a film grade. Pure WebGL 1, so it runs on old integrated GPUs.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uFrac;      // visible fraction of the image on each axis (cover fit)
uniform float uAspect;   // output width / height
uniform float uZoom;
uniform float uRot;
uniform vec2 uPan;
uniform vec2 uPar;
uniform float uDolly;
uniform float uFocus;
uniform float uDof;
uniform float uHaze;
uniform vec3 uHazeColor;
uniform vec2 uTexel;
uniform float uGrade;

vec2 baseUV(vec2 s) {
  vec2 p = (s - 0.5 - uPan) * vec2(uAspect, 1.0);
  float c = cos(uRot), sn = sin(uRot);
  p = vec2(c * p.x + sn * p.y, -sn * p.x + c * p.y);
  p /= vec2(uAspect, 1.0);
  p /= uZoom;
  return 0.5 + p * uFrac;
}

void main() {
  vec2 uv0 = baseUV(vUv);
  vec2 uv = uv0;
  // Fixed-point search for the surface point the moved camera actually sees.
  for (int i = 0; i < 7; i++) {
    float d = texture2D(uDepth, clamp(uv, 0.0, 1.0)).r;
    float k = d - uFocus;
    // Near layers grow freely; far layers shrink only a little, so the frame never runs off the image.
    float kd = clamp(k, -0.3, 0.6);
    uv = 0.5 + (uv0 - 0.5) / (1.0 + kd * uDolly) - k * uPar;
  }
  uv = clamp(uv, uTexel, 1.0 - uTexel);
  float d = texture2D(uDepth, uv).r;

  // Depth of field: blur grows with distance from the focal plane.
  float r = clamp(abs(d - uFocus) - 0.12, 0.0, 1.0) * uDof * 9.0;
  vec3 col = texture2D(uImg, uv).rgb * 0.2;
  if (r > 0.4) {
    vec2 o = uTexel * r;
    col += texture2D(uImg, uv + o * vec2( 1.0,  0.0)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2(-1.0,  0.0)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2( 0.0,  1.0)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2( 0.0, -1.0)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2( 0.7,  0.7)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2(-0.7,  0.7)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2( 0.7, -0.7)).rgb * 0.1;
    col += texture2D(uImg, uv + o * vec2(-0.7, -0.7)).rgb * 0.1;
  } else {
    col = texture2D(uImg, uv).rgb;
  }

  // Atmospheric perspective: distant things fade into the air.
  col = mix(col, uHazeColor, (1.0 - d) * (1.0 - d) * uHaze);

  // Film grade: gentle S-curve, a touch more saturation, teal shadows / warm highlights.
  vec3 g = col;
  g = g * g * (3.0 - 2.0 * g) * 0.35 + g * 0.65;
  float l = dot(g, vec3(0.299, 0.587, 0.114));
  g = mix(vec3(l), g, 1.1);
  g += vec3(0.025, 0.008, -0.02) * smoothstep(0.45, 1.0, l) + vec3(-0.02, 0.005, 0.03) * (1.0 - smoothstep(0.0, 0.45, l));
  col = mix(col, g, uGrade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error');
  return s;
}

export class DepthStage {
  constructor(width, height) {
    this.W = width; this.H = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width; this.canvas.height = height;
    const gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link error');
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uImg', 'uDepth', 'uFrac', 'uAspect', 'uZoom', 'uRot', 'uPan', 'uPar', 'uDolly', 'uFocus', 'uDof', 'uHaze', 'uHazeColor', 'uTexel', 'uGrade']) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    gl.uniform1i(this.u.uImg, 0);
    gl.uniform1i(this.u.uDepth, 1);
    gl.viewport(0, 0, width, height);
    this.cache = new Map(); // scene index -> { img, depth, iw, ih, haze }
    this.lru = [];
    this.lastKey = '';
  }

  _texture(source, isDepth) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (isDepth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, source.width, source.height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, source.data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  _entry(index, image, depth) {
    let e = this.cache.get(index);
    if (e && e.image === image && e.depthSrc === depth) {
      this.lru = this.lru.filter(i => i !== index); this.lru.push(index);
      return e;
    }
    if (e) this._free(index);
    e = {
      image, depthSrc: depth,
      img: this._texture(image, false),
      depth: this._texture(depth, true),
      iw: image.width, ih: image.height,
      haze: averageTop(image),
    };
    this.cache.set(index, e);
    this.lru.push(index);
    while (this.lru.length > 4) this._free(this.lru.shift());
    return e;
  }

  _free(index) {
    const e = this.cache.get(index);
    if (!e) return;
    this.gl.deleteTexture(e.img); this.gl.deleteTexture(e.depth);
    this.cache.delete(index);
    this.lru = this.lru.filter(i => i !== index);
  }

  // cam: { zoom, x, y, rot, px, py, dolly, focus, dof } in output pixels / normalized units
  render(index, image, depth, cam, look) {
    const key = `${index}|${cam.zoom}|${cam.x}|${cam.y}|${cam.rot}|${cam.px}|${cam.py}|${cam.dolly}`;
    if (key === this.lastKey) return this.canvas;
    const gl = this.gl;
    const e = this._entry(index, image, depth);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, e.img);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, e.depth);
    const cover = Math.max(this.W / e.iw, this.H / e.ih);
    gl.uniform2f(this.u.uFrac, this.W / (e.iw * cover), this.H / (e.ih * cover));
    gl.uniform1f(this.u.uAspect, this.W / this.H);
    gl.uniform1f(this.u.uZoom, cam.zoom);
    gl.uniform1f(this.u.uRot, cam.rot);
    gl.uniform2f(this.u.uPan, cam.nx, cam.ny);
    gl.uniform2f(this.u.uPar, cam.px || 0, cam.py || 0);
    gl.uniform1f(this.u.uDolly, cam.dolly || 0);
    gl.uniform1f(this.u.uFocus, cam.focus ?? 0.6);
    gl.uniform1f(this.u.uDof, look.dof);
    gl.uniform1f(this.u.uHaze, look.haze);
    gl.uniform3f(this.u.uHazeColor, e.haze[0], e.haze[1], e.haze[2]);
    gl.uniform2f(this.u.uTexel, 1 / e.iw, 1 / e.ih);
    gl.uniform1f(this.u.uGrade, look.grade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.lastKey = key;
    return this.canvas;
  }

  dispose() {
    for (const i of [...this.cache.keys()]) this._free(i);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// Haze takes the color of the image's own sky / background.
function averageTop(image) {
  try {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(image, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 5).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return [r / n / 255, g / n / 255, b / n / 255];
  } catch { return [0.5, 0.5, 0.55]; }
}

// A plausible depth map when the AI depth model isn't available:
// ground plane (bottom is near) + a soft subject bump in the middle.
export function syntheticDepth(w = 96, h = 160) {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ny = y / (h - 1), nx = x / (w - 1);
      const ground = Math.pow(ny, 1.4) * 0.75;
      const dx = (nx - 0.5) / 0.32, dy = (ny - 0.58) / 0.36;
      const subject = Math.exp(-(dx * dx + dy * dy)) * 0.55;
      data[y * w + x] = Math.round(Math.min(1, ground + subject) * 255);
    }
  }
  return { data, width: w, height: h, synthetic: true };
}

// True when the browser has no usable GPU and WebGL runs on the CPU (much slower).
let softwareGL = null;
export function isSoftwareGL() {
  if (softwareGL !== null) return softwareGL;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    softwareGL = /swiftshader|llvmpipe|software|basic render/i.test(name);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { softwareGL = false; }
  return softwareGL;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}
