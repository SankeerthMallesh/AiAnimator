// src/driver.ts
import * as THREE9 from "three";

// node_modules/postprocessing/build/index.js
import {
  DepthStencilFormat,
  DepthTexture,
  LinearFilter as LinearFilter2,
  SRGBColorSpace as SRGBColorSpace2,
  UnsignedByteType as UnsignedByteType2,
  UnsignedIntType,
  UnsignedInt248Type,
  Vector2,
  WebGLRenderTarget as WebGLRenderTarget3
} from "three";
import {
  BasicDepthPacking,
  BufferAttribute,
  BufferGeometry,
  Camera,
  Material,
  Mesh,
  Scene,
  Texture,
  WebGLRenderTarget
} from "three";
import { LinearFilter, SRGBColorSpace, UnsignedByteType, WebGLRenderTarget as WebGLRenderTarget2 } from "three";
import { NoBlending, ShaderMaterial, Uniform } from "three";
import { Color } from "three";
import { LinearSRGBColorSpace } from "three";
import { BackSide, DoubleSide, FrontSide, ShaderMaterial as ShaderMaterial2 } from "three";
import { EventDispatcher, Vector2 as Vector22 } from "three";
import { EventDispatcher as EventDispatcher2, Uniform as Uniform2 } from "three";
import { SRGBColorSpace as SRGBColorSpace5, Uniform as Uniform7, WebGLRenderTarget as WebGLRenderTarget8 } from "three";
import { SRGBColorSpace as SRGBColorSpace3, UnsignedByteType as UnsignedByteType3, WebGLRenderTarget as WebGLRenderTarget4 } from "three";
import { NoBlending as NoBlending2, ShaderMaterial as ShaderMaterial3, Uniform as Uniform3, Vector4 } from "three";
import { UnsignedByteType as UnsignedByteType4, WebGLRenderTarget as WebGLRenderTarget5 } from "three";
import { NoBlending as NoBlending3, REVISION, ShaderMaterial as ShaderMaterial4, Uniform as Uniform4 } from "three";
import { SRGBColorSpace as SRGBColorSpace4, UnsignedByteType as UnsignedByteType5, Vector2 as Vector25, WebGLRenderTarget as WebGLRenderTarget6 } from "three";
import { NoBlending as NoBlending4, ShaderMaterial as ShaderMaterial5, Uniform as Uniform5, Vector2 as Vector23 } from "three";
import { NoBlending as NoBlending5, ShaderMaterial as ShaderMaterial6, Uniform as Uniform6, Vector2 as Vector24 } from "three";
import {
  BasicDepthPacking as BasicDepthPacking2,
  EventDispatcher as EventDispatcher3,
  LinearSRGBColorSpace as LinearSRGBColorSpace2,
  Material as Material2,
  NoColorSpace,
  Texture as Texture2,
  WebGLRenderTarget as WebGLRenderTarget7
} from "three";
import { Uniform as Uniform8 } from "three";
import { SRGBColorSpace as SRGBColorSpace6, Uniform as Uniform9 } from "three";
import { Uniform as Uniform10 } from "three";
import { Uniform as Uniform11, Vector2 as Vector26 } from "three";
import { BasicDepthPacking as BasicDepthPacking4, SRGBColorSpace as SRGBColorSpace7, Uniform as Uniform15, UnsignedByteType as UnsignedByteType8, WebGLRenderTarget as WebGLRenderTarget9 } from "three";
import { NoBlending as NoBlending6, ShaderMaterial as ShaderMaterial7, Uniform as Uniform12, Vector2 as Vector27 } from "three";
import { BasicDepthPacking as BasicDepthPacking3, NoBlending as NoBlending7, PerspectiveCamera, ShaderMaterial as ShaderMaterial8, Uniform as Uniform13 } from "three";
import { NoBlending as NoBlending8, ShaderMaterial as ShaderMaterial9, Uniform as Uniform14, UnsignedByteType as UnsignedByteType6 } from "three";
import { UnsignedByteType as UnsignedByteType7 } from "three";
import { Uniform as Uniform16, Vector2 as Vector28 } from "three";
import { Uniform as Uniform17 } from "three";
import { NearestFilter, RepeatWrapping, RGBAFormat as RGBAFormat2, Uniform as Uniform18, Vector2 as Vector29 } from "three";
import {
  DataTexture,
  LuminanceFormat,
  RedFormat,
  RGFormat,
  RGBAFormat,
  UnsignedByteType as UnsignedByteType9
} from "three";
import {
  BasicDepthPacking as BasicDepthPacking6,
  Color as Color2,
  DepthTexture as DepthTexture2,
  Matrix4,
  Scene as Scene2,
  SRGBColorSpace as SRGBColorSpace8,
  Uniform as Uniform21,
  Vector2 as Vector211,
  Vector3,
  WebGLRenderTarget as WebGLRenderTarget10
} from "three";
import {
  AlwaysDepth,
  BasicDepthPacking as BasicDepthPacking5,
  EqualDepth,
  GreaterDepth,
  GreaterEqualDepth,
  LessDepth,
  LessEqualDepth,
  NeverDepth,
  NoBlending as NoBlending9,
  NotEqualDepth,
  PerspectiveCamera as PerspectiveCamera2,
  ShaderMaterial as ShaderMaterial10,
  Uniform as Uniform19,
  Vector2 as Vector210
} from "three";
import { NoBlending as NoBlending10, ShaderMaterial as ShaderMaterial11, Uniform as Uniform20 } from "three";
import { Uniform as Uniform22, Vector2 as Vector212 } from "three";
import { Uniform as Uniform23, Vector3 as Vector32 } from "three";
import { Uniform as Uniform24, Vector2 as Vector213 } from "three";
import { FloatType, HalfFloatType, Uniform as Uniform25 } from "three";
import {
  Data3DTexture as Data3DTexture2,
  FloatType as FloatType3,
  HalfFloatType as HalfFloatType2,
  LinearFilter as LinearFilter4,
  NearestFilter as NearestFilter2,
  SRGBColorSpace as SRGBColorSpace10,
  Uniform as Uniform26,
  Vector3 as Vector34
} from "three";
import {
  Color as Color3,
  ClampToEdgeWrapping,
  DataTexture as DataTexture2,
  Data3DTexture,
  FloatType as FloatType2,
  LinearFilter as LinearFilter3,
  LinearSRGBColorSpace as LinearSRGBColorSpace3,
  RGBAFormat as RGBAFormat3,
  SRGBColorSpace as SRGBColorSpace9,
  UnsignedByteType as UnsignedByteType10,
  Vector3 as Vector33
} from "three";
import { Color as Color5, RepeatWrapping as RepeatWrapping2, Uniform as Uniform29, UnsignedByteType as UnsignedByteType11, WebGLRenderTarget as WebGLRenderTarget12 } from "three";
import { NoBlending as NoBlending11, PerspectiveCamera as PerspectiveCamera3, RGBADepthPacking, ShaderMaterial as ShaderMaterial12, Uniform as Uniform27 } from "three";
import { NoBlending as NoBlending12, ShaderMaterial as ShaderMaterial13, Uniform as Uniform28, Vector2 as Vector214 } from "three";
import { Color as Color4, MeshDepthMaterial, NearestFilter as NearestFilter3, RGBADepthPacking as RGBADepthPacking2, WebGLRenderTarget as WebGLRenderTarget11 } from "three";
import { Uniform as Uniform30, Vector2 as Vector215, Vector4 as Vector42 } from "three";
import { Uniform as Uniform31, Vector4 as Vector43 } from "three";
import { Uniform as Uniform32, Vector2 as Vector216 } from "three";
import { Uniform as Uniform33, Vector2 as Vector217, Vector3 as Vector35 } from "three";
import {
  BasicDepthPacking as BasicDepthPacking7,
  Color as Color6,
  NotEqualDepth as NotEqualDepth2,
  EqualDepth as EqualDepth2,
  RGBADepthPacking as RGBADepthPacking3,
  SRGBColorSpace as SRGBColorSpace11,
  WebGLRenderTarget as WebGLRenderTarget13
} from "three";
import { Uniform as Uniform34, Vector3 as Vector36 } from "three";
import {
  BasicDepthPacking as BasicDepthPacking9,
  Color as Color7,
  LinearFilter as LinearFilter5,
  LoadingManager,
  NearestFilter as NearestFilter4,
  Texture as Texture3,
  Uniform as Uniform37,
  WebGLRenderTarget as WebGLRenderTarget14
} from "three";
import { BasicDepthPacking as BasicDepthPacking8, NoBlending as NoBlending13, REVISION as REVISION2, ShaderMaterial as ShaderMaterial14, Uniform as Uniform35, Vector2 as Vector218 } from "three";
import { NoBlending as NoBlending14, ShaderMaterial as ShaderMaterial15, Uniform as Uniform36, Vector2 as Vector219 } from "three";
import { BasicDepthPacking as BasicDepthPacking13, Color as Color8, RepeatWrapping as RepeatWrapping3, RGBAFormat as RGBAFormat4, Uniform as Uniform40, WebGLRenderTarget as WebGLRenderTarget16 } from "three";
import { BasicDepthPacking as BasicDepthPacking10, Matrix4 as Matrix42, NoBlending as NoBlending15, PerspectiveCamera as PerspectiveCamera4, ShaderMaterial as ShaderMaterial16, Uniform as Uniform38, Vector2 as Vector220 } from "three";
import { BasicDepthPacking as BasicDepthPacking12, FloatType as FloatType4, NearestFilter as NearestFilter5, WebGLRenderTarget as WebGLRenderTarget15 } from "three";
import { BasicDepthPacking as BasicDepthPacking11, NoBlending as NoBlending16, ShaderMaterial as ShaderMaterial17, Uniform as Uniform39, Vector2 as Vector221 } from "three";
import { Uniform as Uniform41, UnsignedByteType as UnsignedByteType12 } from "three";
import { SRGBColorSpace as SRGBColorSpace12, Uniform as Uniform43, Vector2 as Vector223, WebGLRenderTarget as WebGLRenderTarget17 } from "three";
import { Uniform as Uniform42, Vector2 as Vector222, Vector4 as Vector44 } from "three";
import { LinearMipmapLinearFilter, REVISION as REVISION3, Uniform as Uniform45, WebGLRenderTarget as WebGLRenderTarget19 } from "three";
import { NearestFilter as NearestFilter6, WebGLRenderTarget as WebGLRenderTarget18 } from "three";
import { NoBlending as NoBlending17, ShaderMaterial as ShaderMaterial18, Uniform as Uniform44 } from "three";
import { Uniform as Uniform46 } from "three";
import { FileLoader, Loader, LoadingManager as LoadingManager2 } from "three";
import { FileLoader as FileLoader2, Loader as Loader2, LoadingManager as LoadingManager3, Vector3 as Vector37 } from "three";
import { Loader as Loader3, LoadingManager as LoadingManager4 } from "three";
import { NoBlending as NoBlending18, PerspectiveCamera as PerspectiveCamera5, ShaderMaterial as ShaderMaterial19, Uniform as Uniform47, Vector2 as Vector224 } from "three";
import { BasicDepthPacking as BasicDepthPacking14, NoBlending as NoBlending19, ShaderMaterial as ShaderMaterial20, Uniform as Uniform48, Vector2 as Vector225 } from "three";
import { BasicDepthPacking as BasicDepthPacking15, NoBlending as NoBlending20, PerspectiveCamera as PerspectiveCamera6, REVISION as REVISION4, ShaderMaterial as ShaderMaterial21, Uniform as Uniform49, Vector2 as Vector226 } from "three";
import { NoBlending as NoBlending21, ShaderMaterial as ShaderMaterial22, Uniform as Uniform50, Vector2 as Vector227 } from "three";
import { BasicDepthPacking as BasicDepthPacking16, SRGBColorSpace as SRGBColorSpace13, UnsignedByteType as UnsignedByteType13, WebGLRenderTarget as WebGLRenderTarget20 } from "three";
import { BasicDepthPacking as BasicDepthPacking18, FloatType as FloatType6, REVISION as REVISION5, RGBADepthPacking as RGBADepthPacking5 } from "three";
import {
  BasicDepthPacking as BasicDepthPacking17,
  FloatType as FloatType5,
  NearestFilter as NearestFilter7,
  RGBADepthPacking as RGBADepthPacking4,
  UnsignedByteType as UnsignedByteType14,
  WebGLRenderTarget as WebGLRenderTarget21
} from "three";
import { BasicDepthPacking as BasicDepthPacking19, NoColorSpace as NoColorSpace2, SRGBColorSpace as SRGBColorSpace14, UnsignedByteType as UnsignedByteType15 } from "three";
import { SRGBColorSpace as SRGBColorSpace15, UnsignedByteType as UnsignedByteType16, WebGLRenderTarget as WebGLRenderTarget22 } from "three";
import { Color as Color9, MeshNormalMaterial, NearestFilter as NearestFilter8, WebGLRenderTarget as WebGLRenderTarget23 } from "three";
import { LoadingManager as LoadingManager5 } from "three";
var MILLISECONDS_TO_SECONDS = 1 / 1e3;
var SECONDS_TO_MILLISECONDS = 1e3;
var Timer = class {
  /**
   * Constructs a new timer.
   */
  constructor() {
    this.startTime = performance.now();
    this.previousTime = 0;
    this.currentTime = 0;
    this._delta = 0;
    this._elapsed = 0;
    this._fixedDelta = 1e3 / 60;
    this.timescale = 1;
    this.useFixedDelta = false;
    this._autoReset = false;
  }
  /**
   * Enables or disables auto reset based on page visibility.
   *
   * If enabled, the timer will be reset when the page becomes visible. This effectively pauses the timer when the page
   * is hidden. Has no effect if the API is not supported.
   *
   * @type {Boolean}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
   */
  get autoReset() {
    return this._autoReset;
  }
  set autoReset(value) {
    if (typeof document !== "undefined" && document.hidden !== void 0) {
      if (value) {
        document.addEventListener("visibilitychange", this);
      } else {
        document.removeEventListener("visibilitychange", this);
      }
      this._autoReset = value;
    }
  }
  get delta() {
    return this._delta * MILLISECONDS_TO_SECONDS;
  }
  get fixedDelta() {
    return this._fixedDelta * MILLISECONDS_TO_SECONDS;
  }
  set fixedDelta(value) {
    this._fixedDelta = value * SECONDS_TO_MILLISECONDS;
  }
  get elapsed() {
    return this._elapsed * MILLISECONDS_TO_SECONDS;
  }
  /**
   * Updates this timer.
   *
   * @param {Boolean} [timestamp] - The current time in milliseconds.
   */
  update(timestamp) {
    if (this.useFixedDelta) {
      this._delta = this.fixedDelta;
    } else {
      this.previousTime = this.currentTime;
      this.currentTime = (timestamp !== void 0 ? timestamp : performance.now()) - this.startTime;
      this._delta = this.currentTime - this.previousTime;
    }
    this._delta *= this.timescale;
    this._elapsed += this._delta;
  }
  /**
   * Resets this timer.
   */
  reset() {
    this._delta = 0;
    this._elapsed = 0;
    this.currentTime = performance.now() - this.startTime;
  }
  getDelta() {
    return this.delta;
  }
  getElapsed() {
    return this.elapsed;
  }
  handleEvent(e) {
    if (!document.hidden) {
      this.currentTime = performance.now() - this.startTime;
    }
  }
  dispose() {
    this.autoReset = false;
  }
};
var fullscreenGeometry = /* @__PURE__ */ (() => {
  const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
  const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  return geometry;
})();
var Pass = class _Pass {
  /**
   * A shared fullscreen triangle.
   *
   * The screen size is 2x2 units (NDC). A triangle needs to be 4x4 units to fill the screen.
   * @see https://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/
   * @type {BufferGeometry}
   * @internal
   */
  static get fullscreenGeometry() {
    return fullscreenGeometry;
  }
  /**
   * Constructs a new pass.
   *
   * @param {String} [name] - The name of this pass. Does not have to be unique.
   * @param {Scene} [scene] - The scene to render. The default scene contains a single mesh that fills the screen.
   * @param {Camera} [camera] - A camera. Fullscreen effect passes don't require a camera.
   */
  constructor(name = "Pass", scene = new Scene(), camera = new Camera()) {
    this.name = name;
    this.renderer = null;
    this.scene = scene;
    this.camera = camera;
    this.screen = null;
    this.rtt = true;
    this.needsSwap = true;
    this.needsDepthTexture = false;
    this.enabled = true;
  }
  /**
   * Sets the render to screen flag.
   *
   * If this flag is changed, the fullscreen material will be updated as well.
   *
   * @type {Boolean}
   */
  get renderToScreen() {
    return !this.rtt;
  }
  set renderToScreen(value) {
    if (this.rtt === value) {
      const material = this.fullscreenMaterial;
      if (material !== null) {
        material.needsUpdate = true;
      }
      this.rtt = !value;
    }
  }
  /**
   * Sets the main scene.
   *
   * @type {Scene}
   */
  set mainScene(value) {
  }
  /**
   * Sets the main camera.
   *
   * @type {Camera}
   */
  set mainCamera(value) {
  }
  /**
   * Sets the renderer
   *
   * @deprecated
   * @param {WebGLRenderer} renderer - The renderer.
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }
  /**
   * Indicates whether this pass is enabled.
   *
   * @deprecated Use enabled instead.
   * @return {Boolean} Whether this pass is enabled.
   */
  isEnabled() {
    return this.enabled;
  }
  /**
   * Enables or disables this pass.
   *
   * @deprecated Use enabled instead.
   * @param {Boolean} value - Whether the pass should be enabled.
   */
  setEnabled(value) {
    this.enabled = value;
  }
  /**
   * The fullscreen material.
   *
   * @type {Material}
   */
  get fullscreenMaterial() {
    return this.screen !== null ? this.screen.material : null;
  }
  set fullscreenMaterial(value) {
    let screen = this.screen;
    if (screen !== null) {
      screen.material = value;
    } else {
      screen = new Mesh(_Pass.fullscreenGeometry, value);
      screen.frustumCulled = false;
      if (this.scene === null) {
        this.scene = new Scene();
      }
      this.scene.add(screen);
      this.screen = screen;
    }
  }
  /**
   * Returns the current fullscreen material.
   *
   * @deprecated Use fullscreenMaterial instead.
   * @return {Material} The current fullscreen material, or null if there is none.
   */
  getFullscreenMaterial() {
    return this.fullscreenMaterial;
  }
  /**
   * Sets the fullscreen material.
   *
   * @deprecated Use fullscreenMaterial instead.
   * @protected
   * @param {Material} value - A fullscreen material.
   */
  setFullscreenMaterial(value) {
    this.fullscreenMaterial = value;
  }
  /**
   * Returns the current depth texture.
   *
   * @return {Texture} The current depth texture, or null if there is none.
   */
  getDepthTexture() {
    return null;
  }
  /**
   * Sets the depth texture.
   *
   * This method will be called automatically by the {@link EffectComposer}.
   * You may override this method if your pass relies on the depth information of a preceding {@link RenderPass}.
   *
   * @param {Texture} depthTexture - A depth texture.
   * @param {DepthPackingStrategy} [depthPacking=BasicDepthPacking] - The depth packing.
   */
  setDepthTexture(depthTexture, depthPacking = BasicDepthPacking) {
  }
  /**
   * Renders this pass.
   *
   * This is an abstract method that must be overridden.
   *
   * @abstract
   * @throws {Error} An error is thrown if the method is not overridden.
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    throw new Error("Render method not implemented!");
  }
  /**
   * Sets the size.
   *
   * You may override this method if you want to be informed about the size of the backbuffer/canvas.
   * This method is called before {@link initialize} and every time the size of the {@link EffectComposer} changes.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
  }
  /**
   * Performs initialization tasks.
   *
   * This method is called when this pass is added to an {@link EffectComposer}.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
  }
  /**
   * Performs a shallow search for disposable properties and deletes them.
   *
   * The {@link EffectComposer} calls this method when it is being destroyed. You can use it independently to free
   * memory when you're certain that you don't need this pass anymore.
   */
  dispose() {
    for (const key of Object.keys(this)) {
      const property = this[key];
      const isDisposable = property instanceof WebGLRenderTarget || property instanceof Material || property instanceof Texture || property instanceof _Pass;
      if (isDisposable) {
        this[key].dispose();
      }
    }
    if (this.fullscreenMaterial !== null) {
      this.fullscreenMaterial.dispose();
    }
  }
};
var ClearMaskPass = class extends Pass {
  /**
   * Constructs a new clear mask pass.
   */
  constructor() {
    super("ClearMaskPass", null, null);
    this.needsSwap = false;
  }
  /**
   * Disables the global stencil test.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const stencil = renderer.state.buffers.stencil;
    stencil.setLocked(false);
    stencil.setTest(false);
  }
};
var copy_default = "#include <common>\n#include <dithering_pars_fragment>\n#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;\n#else\nuniform lowp sampler2D inputBuffer;\n#endif\nuniform float opacity;varying vec2 vUv;void main(){vec4 texel=texture2D(inputBuffer,vUv);gl_FragColor=opacity*texel;\n#include <colorspace_fragment>\n#include <dithering_fragment>\n}";
var common_default = "varying vec2 vUv;void main(){vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,1.0,1.0);}";
var CopyMaterial = class extends ShaderMaterial {
  /**
   * Constructs a new copy material.
   */
  constructor() {
    super({
      name: "CopyMaterial",
      uniforms: {
        inputBuffer: new Uniform(null),
        opacity: new Uniform(1)
      },
      blending: NoBlending,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: copy_default,
      vertexShader: common_default
    });
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Sets the input buffer.
   *
   * @deprecated Use inputBuffer instead.
   * @param {Number} value - The buffer.
   */
  setInputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Returns the opacity.
   *
   * @deprecated Use opacity instead.
   * @return {Number} The opacity.
   */
  getOpacity(value) {
    return this.uniforms.opacity.value;
  }
  /**
   * Sets the opacity.
   *
   * @deprecated Use opacity instead.
   * @param {Number} value - The opacity.
   */
  setOpacity(value) {
    this.uniforms.opacity.value = value;
  }
};
var CopyPass = class extends Pass {
  /**
   * Constructs a new save pass.
   *
   * @param {WebGLRenderTarget} [renderTarget] - A render target.
   * @param {Boolean} [autoResize=true] - Whether the render target size should be updated automatically.
   */
  constructor(renderTarget, autoResize = true) {
    super("CopyPass");
    this.fullscreenMaterial = new CopyMaterial();
    this.needsSwap = false;
    this.renderTarget = renderTarget;
    if (renderTarget === void 0) {
      this.renderTarget = new WebGLRenderTarget2(1, 1, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        stencilBuffer: false,
        depthBuffer: false
      });
      this.renderTarget.texture.name = "CopyPass.Target";
    }
    this.autoResize = autoResize;
  }
  /**
   * Enables or disables auto resizing of the render target.
   *
   * @deprecated Use autoResize instead.
   * @type {Boolean}
   */
  get resize() {
    return this.autoResize;
  }
  set resize(value) {
    this.autoResize = value;
  }
  /**
   * The output texture.
   *
   * @type {Texture}
   */
  get texture() {
    return this.renderTarget.texture;
  }
  /**
   * Returns the output texture.
   *
   * @deprecated Use texture instead.
   * @return {Texture} The texture.
   */
  getTexture() {
    return this.renderTarget.texture;
  }
  /**
   * Enables or disables auto resizing of the render target.
   *
   * @deprecated Use autoResize instead.
   * @param {Boolean} value - Whether the render target size should be updated automatically.
   */
  setAutoResizeEnabled(value) {
    this.autoResize = value;
  }
  /**
   * Saves the input buffer.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    this.fullscreenMaterial.inputBuffer = inputBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : this.renderTarget);
    renderer.render(this.scene, this.camera);
  }
  /**
   * Updates the size of this pass.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    if (this.autoResize) {
      this.renderTarget.setSize(width, height);
    }
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - A renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    if (frameBufferType !== void 0) {
      this.renderTarget.texture.type = frameBufferType;
      if (frameBufferType !== UnsignedByteType) {
        this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
      } else if (renderer !== null && renderer.outputColorSpace === SRGBColorSpace) {
        this.renderTarget.texture.colorSpace = SRGBColorSpace;
      }
    }
  }
};
var color = /* @__PURE__ */ new Color();
var ClearPass = class extends Pass {
  /**
   * Constructs a new clear pass.
   *
   * @param {Boolean} [color=true] - Determines whether the color buffer should be cleared.
   * @param {Boolean} [depth=true] - Determines whether the depth buffer should be cleared.
   * @param {Boolean} [stencil=false] - Determines whether the stencil buffer should be cleared.
   */
  constructor(color2 = true, depth = true, stencil = false) {
    super("ClearPass", null, null);
    this.needsSwap = false;
    this.color = color2;
    this.depth = depth;
    this.stencil = stencil;
    this.overrideClearColor = null;
    this.overrideClearAlpha = -1;
  }
  /**
   * Sets the clear flags.
   *
   * @param {Boolean} color - Whether the color buffer should be cleared.
   * @param {Boolean} depth - Whether the depth buffer should be cleared.
   * @param {Boolean} stencil - Whether the stencil buffer should be cleared.
   */
  setClearFlags(color2, depth, stencil) {
    this.color = color2;
    this.depth = depth;
    this.stencil = stencil;
  }
  /**
   * Returns the override clear color. Default is null.
   *
   * @deprecated Use overrideClearColor instead.
   * @return {Color} The clear color.
   */
  getOverrideClearColor() {
    return this.overrideClearColor;
  }
  /**
   * Sets the override clear color.
   *
   * @deprecated Use overrideClearColor instead.
   * @param {Color} value - The clear color.
   */
  setOverrideClearColor(value) {
    this.overrideClearColor = value;
  }
  /**
   * Returns the override clear alpha. Default is -1.
   *
   * @deprecated Use overrideClearAlpha instead.
   * @return {Number} The clear alpha.
   */
  getOverrideClearAlpha() {
    return this.overrideClearAlpha;
  }
  /**
   * Sets the override clear alpha.
   *
   * @deprecated Use overrideClearAlpha instead.
   * @param {Number} value - The clear alpha.
   */
  setOverrideClearAlpha(value) {
    this.overrideClearAlpha = value;
  }
  /**
   * Clears the input buffer or the screen.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const overrideClearColor = this.overrideClearColor;
    const overrideClearAlpha = this.overrideClearAlpha;
    const clearAlpha = renderer.getClearAlpha();
    const hasOverrideClearColor = overrideClearColor !== null;
    const hasOverrideClearAlpha = overrideClearAlpha >= 0;
    if (hasOverrideClearColor) {
      renderer.getClearColor(color);
      renderer.setClearColor(overrideClearColor, hasOverrideClearAlpha ? overrideClearAlpha : clearAlpha);
    } else if (hasOverrideClearAlpha) {
      renderer.setClearAlpha(overrideClearAlpha);
    }
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.clear(this.color, this.depth, this.stencil);
    if (hasOverrideClearColor) {
      renderer.setClearColor(color, clearAlpha);
    } else if (hasOverrideClearAlpha) {
      renderer.setClearAlpha(clearAlpha);
    }
  }
};
var MaskPass = class extends Pass {
  /**
   * Constructs a new mask pass.
   *
   * @param {Scene} scene - The scene to render.
   * @param {Camera} camera - The camera to use.
   */
  constructor(scene, camera) {
    super("MaskPass", scene, camera);
    this.needsSwap = false;
    this.clearPass = new ClearPass(false, false, true);
    this.inverse = false;
  }
  set mainScene(value) {
    this.scene = value;
  }
  set mainCamera(value) {
    this.camera = value;
  }
  /**
   * Indicates whether the mask should be inverted.
   *
   * @type {Boolean}
   */
  get inverted() {
    return this.inverse;
  }
  set inverted(value) {
    this.inverse = value;
  }
  /**
   * Indicates whether this pass should clear the stencil buffer.
   *
   * @type {Boolean}
   * @deprecated Use clearPass.enabled instead.
   */
  get clear() {
    return this.clearPass.enabled;
  }
  set clear(value) {
    this.clearPass.enabled = value;
  }
  /**
   * Returns the internal clear pass.
   *
   * @deprecated Use clearPass.enabled instead.
   * @return {ClearPass} The clear pass.
   */
  getClearPass() {
    return this.clearPass;
  }
  /**
   * Indicates whether the mask is inverted.
   *
   * @deprecated Use inverted instead.
   * @return {Boolean} Whether the mask is inverted.
   */
  isInverted() {
    return this.inverted;
  }
  /**
   * Enables or disable mask inversion.
   *
   * @deprecated Use inverted instead.
   * @param {Boolean} value - Whether the mask should be inverted.
   */
  setInverted(value) {
    this.inverted = value;
  }
  /**
   * Renders the effect.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const context = renderer.getContext();
    const buffers = renderer.state.buffers;
    const scene = this.scene;
    const camera = this.camera;
    const clearPass = this.clearPass;
    const writeValue = this.inverted ? 0 : 1;
    const clearValue = 1 - writeValue;
    buffers.color.setMask(false);
    buffers.depth.setMask(false);
    buffers.color.setLocked(true);
    buffers.depth.setLocked(true);
    buffers.stencil.setTest(true);
    buffers.stencil.setOp(context.REPLACE, context.REPLACE, context.REPLACE);
    buffers.stencil.setFunc(context.ALWAYS, writeValue, 4294967295);
    buffers.stencil.setClear(clearValue);
    buffers.stencil.setLocked(true);
    if (this.clearPass.enabled) {
      if (this.renderToScreen) {
        clearPass.render(renderer, null);
      } else {
        clearPass.render(renderer, inputBuffer);
        clearPass.render(renderer, outputBuffer);
      }
    }
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    } else {
      renderer.setRenderTarget(inputBuffer);
      renderer.render(scene, camera);
      renderer.setRenderTarget(outputBuffer);
      renderer.render(scene, camera);
    }
    buffers.color.setLocked(false);
    buffers.depth.setLocked(false);
    buffers.stencil.setLocked(false);
    buffers.stencil.setFunc(context.EQUAL, 1, 4294967295);
    buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
    buffers.stencil.setLocked(true);
  }
};
var EffectComposer = class {
  /**
   * Constructs a new effect composer.
   *
   * @param {WebGLRenderer} renderer - The renderer that should be used.
   * @param {Object} [options] - The options.
   * @param {Boolean} [options.depthBuffer=true] - Whether the main render targets should have a depth buffer.
   * @param {Boolean} [options.stencilBuffer=false] - Whether the main render targets should have a stencil buffer.
   * @param {Boolean} [options.alpha] - Deprecated. Buffers are always RGBA since three r137.
   * @param {Number} [options.multisampling=0] - The number of samples used for multisample antialiasing. Requires WebGL 2.
   * @param {Number} [options.frameBufferType] - The type of the internal frame buffers. It's recommended to use HalfFloatType if possible.
   */
  constructor(renderer = null, {
    depthBuffer = true,
    stencilBuffer = false,
    multisampling = 0,
    frameBufferType
  } = {}) {
    this.renderer = null;
    this.inputBuffer = this.createBuffer(depthBuffer, stencilBuffer, frameBufferType, multisampling);
    this.outputBuffer = this.inputBuffer.clone();
    this.copyPass = new CopyPass();
    this.depthTexture = null;
    this.passes = [];
    this.timer = new Timer();
    this.autoRenderToScreen = true;
    this.setRenderer(renderer);
  }
  /**
   * The current amount of samples used for multisample anti-aliasing.
   *
   * @type {Number}
   */
  get multisampling() {
    return this.inputBuffer.samples || 0;
  }
  /**
   * Sets the amount of MSAA samples.
   *
   * Requires WebGL 2. Set to zero to disable multisampling.
   *
   * @type {Number}
   */
  set multisampling(value) {
    const buffer = this.inputBuffer;
    const multisampling = this.multisampling;
    if (multisampling > 0 && value > 0) {
      this.inputBuffer.samples = value;
      this.outputBuffer.samples = value;
      this.inputBuffer.dispose();
      this.outputBuffer.dispose();
    } else if (multisampling !== value) {
      this.inputBuffer.dispose();
      this.outputBuffer.dispose();
      this.inputBuffer = this.createBuffer(
        buffer.depthBuffer,
        buffer.stencilBuffer,
        buffer.texture.type,
        value
      );
      this.inputBuffer.depthTexture = this.depthTexture;
      this.outputBuffer = this.inputBuffer.clone();
    }
  }
  /**
   * Returns the internal timer.
   *
   * @return {Timer} The timer.
   */
  getTimer() {
    return this.timer;
  }
  /**
   * Returns the renderer.
   *
   * @return {WebGLRenderer} The renderer.
   */
  getRenderer() {
    return this.renderer;
  }
  /**
   * Sets the renderer.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   */
  setRenderer(renderer) {
    this.renderer = renderer;
    if (renderer !== null) {
      const size = renderer.getSize(new Vector2());
      const alpha = renderer.getContext().getContextAttributes().alpha;
      const frameBufferType = this.inputBuffer.texture.type;
      if (frameBufferType === UnsignedByteType2 && renderer.outputColorSpace === SRGBColorSpace2) {
        this.inputBuffer.texture.colorSpace = SRGBColorSpace2;
        this.outputBuffer.texture.colorSpace = SRGBColorSpace2;
        this.inputBuffer.dispose();
        this.outputBuffer.dispose();
      }
      renderer.autoClear = false;
      this.setSize(size.width, size.height);
      for (const pass of this.passes) {
        pass.initialize(renderer, alpha, frameBufferType);
      }
    }
  }
  /**
   * Replaces the current renderer with the given one.
   *
   * The auto clear mechanism of the provided renderer will be disabled. If the new render size differs from the
   * previous one, all passes will be updated.
   *
   * By default, the DOM element of the current renderer will automatically be removed from its parent node and the DOM
   * element of the new renderer will take its place.
   *
   * @deprecated Use setRenderer instead.
   * @param {WebGLRenderer} renderer - The new renderer.
   * @param {Boolean} updateDOM - Indicates whether the old canvas should be replaced by the new one in the DOM.
   * @return {WebGLRenderer} The old renderer.
   */
  replaceRenderer(renderer, updateDOM = true) {
    const oldRenderer = this.renderer;
    const parent = oldRenderer.domElement.parentNode;
    this.setRenderer(renderer);
    if (updateDOM && parent !== null) {
      parent.removeChild(oldRenderer.domElement);
      parent.appendChild(renderer.domElement);
    }
    return oldRenderer;
  }
  /**
   * Creates a depth texture attachment that will be provided to all passes.
   *
   * Note: When a shader reads from a depth texture and writes to a render target that uses the same depth texture
   * attachment, the depth information will be lost. This happens even if `depthWrite` is disabled.
   *
   * @private
   * @return {DepthTexture} The depth texture.
   */
  createDepthTexture() {
    const depthTexture = this.depthTexture = new DepthTexture();
    this.inputBuffer.depthTexture = depthTexture;
    this.inputBuffer.dispose();
    if (this.inputBuffer.stencilBuffer) {
      depthTexture.format = DepthStencilFormat;
      depthTexture.type = UnsignedInt248Type;
    } else {
      depthTexture.type = UnsignedIntType;
    }
    return depthTexture;
  }
  /**
   * Deletes the current depth texture.
   *
   * @private
   */
  deleteDepthTexture() {
    if (this.depthTexture !== null) {
      this.depthTexture.dispose();
      this.depthTexture = null;
      this.inputBuffer.depthTexture = null;
      this.inputBuffer.dispose();
      for (const pass of this.passes) {
        pass.setDepthTexture(null);
      }
    }
  }
  /**
   * Creates a new render target.
   *
   * @deprecated Create buffers manually via WebGLRenderTarget instead.
   * @param {Boolean} depthBuffer - Whether the render target should have a depth buffer.
   * @param {Boolean} stencilBuffer - Whether the render target should have a stencil buffer.
   * @param {Number} type - The frame buffer type.
   * @param {Number} multisampling - The number of samples to use for antialiasing.
   * @return {WebGLRenderTarget} A new render target that equals the renderer's canvas.
   */
  createBuffer(depthBuffer, stencilBuffer, type, multisampling) {
    const renderer = this.renderer;
    const size = renderer === null ? new Vector2() : renderer.getDrawingBufferSize(new Vector2());
    const options = {
      minFilter: LinearFilter2,
      magFilter: LinearFilter2,
      stencilBuffer,
      depthBuffer,
      type
    };
    const renderTarget = new WebGLRenderTarget3(size.width, size.height, options);
    if (multisampling > 0) {
      renderTarget.ignoreDepthForMultisampleCopy = false;
      renderTarget.samples = multisampling;
    }
    if (type === UnsignedByteType2 && renderer !== null && renderer.outputColorSpace === SRGBColorSpace2) {
      renderTarget.texture.colorSpace = SRGBColorSpace2;
    }
    renderTarget.texture.name = "EffectComposer.Buffer";
    renderTarget.texture.generateMipmaps = false;
    return renderTarget;
  }
  /**
   * Can be used to change the main scene for all registered passes and effects.
   *
   * @param {Scene} scene - The scene.
   */
  setMainScene(scene) {
    for (const pass of this.passes) {
      pass.mainScene = scene;
    }
  }
  /**
   * Can be used to change the main camera for all registered passes and effects.
   *
   * @param {Camera} camera - The camera.
   */
  setMainCamera(camera) {
    for (const pass of this.passes) {
      pass.mainCamera = camera;
    }
  }
  /**
   * Adds a pass, optionally at a specific index.
   *
   * @param {Pass} pass - A new pass.
   * @param {Number} [index] - An index at which the pass should be inserted.
   */
  addPass(pass, index) {
    const passes = this.passes;
    const renderer = this.renderer;
    const drawingBufferSize = renderer.getDrawingBufferSize(new Vector2());
    const alpha = renderer.getContext().getContextAttributes().alpha;
    const frameBufferType = this.inputBuffer.texture.type;
    pass.setRenderer(renderer);
    pass.setSize(drawingBufferSize.width, drawingBufferSize.height);
    pass.initialize(renderer, alpha, frameBufferType);
    if (this.autoRenderToScreen) {
      if (passes.length > 0) {
        passes[passes.length - 1].renderToScreen = false;
      }
      if (pass.renderToScreen) {
        this.autoRenderToScreen = false;
      }
    }
    if (index !== void 0) {
      passes.splice(index, 0, pass);
    } else {
      passes.push(pass);
    }
    if (this.autoRenderToScreen) {
      passes[passes.length - 1].renderToScreen = true;
    }
    if (pass.needsDepthTexture || this.depthTexture !== null) {
      if (this.depthTexture === null) {
        const depthTexture = this.createDepthTexture();
        for (pass of passes) {
          pass.setDepthTexture(depthTexture);
        }
      } else {
        pass.setDepthTexture(this.depthTexture);
      }
    }
  }
  /**
   * Removes a pass.
   *
   * @param {Pass} pass - The pass.
   */
  removePass(pass) {
    const passes = this.passes;
    const index = passes.indexOf(pass);
    const exists = index !== -1;
    const removed = exists && passes.splice(index, 1).length > 0;
    if (removed) {
      if (this.depthTexture !== null) {
        const reducer = (a, b) => a || b.needsDepthTexture;
        const depthTextureRequired = passes.reduce(reducer, false);
        if (!depthTextureRequired) {
          if (pass.getDepthTexture() === this.depthTexture) {
            pass.setDepthTexture(null);
          }
          this.deleteDepthTexture();
        }
      }
      if (this.autoRenderToScreen) {
        if (index === passes.length) {
          pass.renderToScreen = false;
          if (passes.length > 0) {
            passes[passes.length - 1].renderToScreen = true;
          }
        }
      }
    }
  }
  /**
   * Removes all passes.
   */
  removeAllPasses() {
    const passes = this.passes;
    this.deleteDepthTexture();
    if (passes.length > 0) {
      if (this.autoRenderToScreen) {
        passes[passes.length - 1].renderToScreen = false;
      }
      this.passes = [];
    }
  }
  /**
   * Renders all enabled passes in the order in which they were added.
   *
   * @param {Number} [deltaTime] - The time since the last frame in seconds.
   */
  render(deltaTime) {
    const renderer = this.renderer;
    const copyPass = this.copyPass;
    let inputBuffer = this.inputBuffer;
    let outputBuffer = this.outputBuffer;
    let stencilTest = false;
    let context, stencil, buffer;
    if (deltaTime === void 0) {
      this.timer.update();
      deltaTime = this.timer.getDelta();
    }
    for (const pass of this.passes) {
      if (pass.enabled) {
        pass.render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest);
        if (pass.needsSwap) {
          if (stencilTest) {
            copyPass.renderToScreen = pass.renderToScreen;
            context = renderer.getContext();
            stencil = renderer.state.buffers.stencil;
            stencil.setFunc(context.NOTEQUAL, 1, 4294967295);
            copyPass.render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest);
            stencil.setFunc(context.EQUAL, 1, 4294967295);
          }
          buffer = inputBuffer;
          inputBuffer = outputBuffer;
          outputBuffer = buffer;
        }
        if (pass instanceof MaskPass) {
          stencilTest = true;
        } else if (pass instanceof ClearMaskPass) {
          stencilTest = false;
        }
      }
    }
  }
  /**
   * Sets the size of the buffers, passes and the renderer.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   * @param {Boolean} [updateStyle] - Determines whether the style of the canvas should be updated.
   */
  setSize(width, height, updateStyle) {
    const renderer = this.renderer;
    const currentSize = renderer.getSize(new Vector2());
    if (width === void 0 || height === void 0) {
      width = currentSize.width;
      height = currentSize.height;
    }
    if (currentSize.width !== width || currentSize.height !== height) {
      renderer.setSize(width, height, updateStyle);
    }
    const drawingBufferSize = renderer.getDrawingBufferSize(new Vector2());
    this.inputBuffer.setSize(drawingBufferSize.width, drawingBufferSize.height);
    this.outputBuffer.setSize(drawingBufferSize.width, drawingBufferSize.height);
    for (const pass of this.passes) {
      pass.setSize(drawingBufferSize.width, drawingBufferSize.height);
    }
  }
  /**
   * Resets this composer by deleting all passes and creating new buffers.
   */
  reset() {
    this.dispose();
    this.autoRenderToScreen = true;
  }
  /**
   * Disposes this composer and all passes.
   */
  dispose() {
    for (const pass of this.passes) {
      pass.dispose();
    }
    this.passes = [];
    if (this.inputBuffer !== null) {
      this.inputBuffer.dispose();
    }
    if (this.outputBuffer !== null) {
      this.outputBuffer.dispose();
    }
    this.deleteDepthTexture();
    this.copyPass.dispose();
    this.timer.dispose();
    Pass.fullscreenGeometry.dispose();
  }
};
var EffectAttribute = {
  NONE: 0,
  DEPTH: 1,
  CONVOLUTION: 2
};
var EffectShaderSection = {
  FRAGMENT_HEAD: "FRAGMENT_HEAD",
  FRAGMENT_MAIN_UV: "FRAGMENT_MAIN_UV",
  FRAGMENT_MAIN_IMAGE: "FRAGMENT_MAIN_IMAGE",
  VERTEX_HEAD: "VERTEX_HEAD",
  VERTEX_MAIN_SUPPORT: "VERTEX_MAIN_SUPPORT"
};
var EffectShaderData = class {
  /**
   * Constructs new shader data.
   */
  constructor() {
    this.shaderParts = /* @__PURE__ */ new Map([
      [EffectShaderSection.FRAGMENT_HEAD, null],
      [EffectShaderSection.FRAGMENT_MAIN_UV, null],
      [EffectShaderSection.FRAGMENT_MAIN_IMAGE, null],
      [EffectShaderSection.VERTEX_HEAD, null],
      [EffectShaderSection.VERTEX_MAIN_SUPPORT, null]
    ]);
    this.defines = /* @__PURE__ */ new Map();
    this.uniforms = /* @__PURE__ */ new Map();
    this.blendModes = /* @__PURE__ */ new Map();
    this.extensions = /* @__PURE__ */ new Set();
    this.attributes = EffectAttribute.NONE;
    this.varyings = /* @__PURE__ */ new Set();
    this.uvTransformation = false;
    this.readDepth = false;
    this.colorSpace = LinearSRGBColorSpace;
  }
};
var workaroundEnabled = false;
var OverrideMaterialManager = class {
  /**
   * Constructs a new override material manager.
   *
   * @param {Material} [material=null] - An override material.
   */
  constructor(material = null) {
    this.originalMaterials = /* @__PURE__ */ new Map();
    this.material = null;
    this.materials = null;
    this.materialsBackSide = null;
    this.materialsDoubleSide = null;
    this.materialsFlatShaded = null;
    this.materialsFlatShadedBackSide = null;
    this.materialsFlatShadedDoubleSide = null;
    this.setMaterial(material);
    this.meshCount = 0;
    this.replaceMaterial = (node) => {
      if (node.isMesh) {
        let materials;
        if (node.material.flatShading) {
          switch (node.material.side) {
            case DoubleSide:
              materials = this.materialsFlatShadedDoubleSide;
              break;
            case BackSide:
              materials = this.materialsFlatShadedBackSide;
              break;
            default:
              materials = this.materialsFlatShaded;
              break;
          }
        } else {
          switch (node.material.side) {
            case DoubleSide:
              materials = this.materialsDoubleSide;
              break;
            case BackSide:
              materials = this.materialsBackSide;
              break;
            default:
              materials = this.materials;
              break;
          }
        }
        this.originalMaterials.set(node, node.material);
        if (node.isSkinnedMesh) {
          node.material = materials[2];
        } else if (node.isInstancedMesh) {
          node.material = materials[1];
        } else {
          node.material = materials[0];
        }
        ++this.meshCount;
      }
    };
  }
  /**
   * Clones the given material.
   *
   * @private
   * @param {Material} material - The material.
   * @return {Material} The cloned material.
   */
  cloneMaterial(material) {
    if (!(material instanceof ShaderMaterial2)) {
      return material.clone();
    }
    const uniforms = material.uniforms;
    const textureUniforms = /* @__PURE__ */ new Map();
    for (const key in uniforms) {
      const value = uniforms[key].value;
      if (value.isRenderTargetTexture) {
        uniforms[key].value = null;
        textureUniforms.set(key, value);
      }
    }
    const clone = material.clone();
    for (const entry of textureUniforms) {
      uniforms[entry[0]].value = entry[1];
      clone.uniforms[entry[0]].value = entry[1];
    }
    return clone;
  }
  /**
   * Sets the override material.
   *
   * @param {Material} material - The material.
   */
  setMaterial(material) {
    this.disposeMaterials();
    this.material = material;
    if (material !== null) {
      const materials = this.materials = [
        this.cloneMaterial(material),
        this.cloneMaterial(material),
        this.cloneMaterial(material)
      ];
      for (const m2 of materials) {
        m2.uniforms = Object.assign({}, material.uniforms);
        m2.side = FrontSide;
      }
      materials[2].skinning = true;
      this.materialsBackSide = materials.map((m2) => {
        const c2 = this.cloneMaterial(m2);
        c2.uniforms = Object.assign({}, material.uniforms);
        c2.side = BackSide;
        return c2;
      });
      this.materialsDoubleSide = materials.map((m2) => {
        const c2 = this.cloneMaterial(m2);
        c2.uniforms = Object.assign({}, material.uniforms);
        c2.side = DoubleSide;
        return c2;
      });
      this.materialsFlatShaded = materials.map((m2) => {
        const c2 = this.cloneMaterial(m2);
        c2.uniforms = Object.assign({}, material.uniforms);
        c2.flatShading = true;
        return c2;
      });
      this.materialsFlatShadedBackSide = materials.map((m2) => {
        const c2 = this.cloneMaterial(m2);
        c2.uniforms = Object.assign({}, material.uniforms);
        c2.flatShading = true;
        c2.side = BackSide;
        return c2;
      });
      this.materialsFlatShadedDoubleSide = materials.map((m2) => {
        const c2 = this.cloneMaterial(m2);
        c2.uniforms = Object.assign({}, material.uniforms);
        c2.flatShading = true;
        c2.side = DoubleSide;
        return c2;
      });
    }
  }
  /**
   * Renders the scene with the override material.
   *
   * @private
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Scene} scene - A scene.
   * @param {Camera} camera - A camera.
   */
  render(renderer, scene, camera) {
    const shadowMapEnabled = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false;
    if (workaroundEnabled) {
      const originalMaterials = this.originalMaterials;
      this.meshCount = 0;
      scene.traverse(this.replaceMaterial);
      renderer.render(scene, camera);
      for (const entry of originalMaterials) {
        entry[0].material = entry[1];
      }
      if (this.meshCount !== originalMaterials.size) {
        originalMaterials.clear();
      }
    } else {
      const overrideMaterial = scene.overrideMaterial;
      scene.overrideMaterial = this.material;
      renderer.render(scene, camera);
      scene.overrideMaterial = overrideMaterial;
    }
    renderer.shadowMap.enabled = shadowMapEnabled;
  }
  /**
   * Deletes cloned override materials.
   *
   * @private
   */
  disposeMaterials() {
    if (this.material !== null) {
      const materials = this.materials.concat(this.materialsBackSide).concat(this.materialsDoubleSide).concat(this.materialsFlatShaded).concat(this.materialsFlatShadedBackSide).concat(this.materialsFlatShadedDoubleSide);
      for (const m2 of materials) {
        m2.dispose();
      }
    }
  }
  /**
   * Performs cleanup tasks.
   */
  dispose() {
    this.originalMaterials.clear();
    this.disposeMaterials();
  }
  /**
   * Indicates whether the override material workaround is enabled.
   *
   * @type {Boolean}
   */
  static get workaroundEnabled() {
    return workaroundEnabled;
  }
  /**
   * Enables or disables the override material workaround globally.
   *
   * This only affects post processing passes and effects.
   *
   * @type {Boolean}
   */
  static set workaroundEnabled(value) {
    workaroundEnabled = value;
  }
};
var AUTO_SIZE = -1;
var Resolution = class extends EventDispatcher {
  /**
   * Constructs a new resolution.
   *
   * TODO Remove resizable param.
   * @param {Resizable} resizable - A resizable object.
   * @param {Number} [width=Resolution.AUTO_SIZE] - The preferred width.
   * @param {Number} [height=Resolution.AUTO_SIZE] - The preferred height.
   * @param {Number} [scale=1.0] - A resolution scale.
   */
  constructor(resizable, width = AUTO_SIZE, height = AUTO_SIZE, scale = 1) {
    super();
    this.resizable = resizable;
    this.baseSize = new Vector22(1, 1);
    this.preferredSize = new Vector22(width, height);
    this.target = this.preferredSize;
    this.s = scale;
    this.effectiveSize = new Vector22();
    this.addEventListener("change", () => this.updateEffectiveSize());
    this.updateEffectiveSize();
  }
  /**
   * Calculates the effective size.
   *
   * @private
   */
  updateEffectiveSize() {
    const base2 = this.baseSize;
    const preferred = this.preferredSize;
    const effective = this.effectiveSize;
    const scale = this.scale;
    if (preferred.width !== AUTO_SIZE) {
      effective.width = preferred.width;
    } else if (preferred.height !== AUTO_SIZE) {
      effective.width = Math.round(preferred.height * (base2.width / Math.max(base2.height, 1)));
    } else {
      effective.width = Math.round(base2.width * scale);
    }
    if (preferred.height !== AUTO_SIZE) {
      effective.height = preferred.height;
    } else if (preferred.width !== AUTO_SIZE) {
      effective.height = Math.round(preferred.width / Math.max(base2.width / Math.max(base2.height, 1), 1));
    } else {
      effective.height = Math.round(base2.height * scale);
    }
  }
  /**
   * The effective width.
   *
   * If the preferred width and height are set to {@link Resizer.AUTO_SIZE}, the base width will be returned.
   *
   * @type {Number}
   */
  get width() {
    return this.effectiveSize.width;
  }
  set width(value) {
    this.preferredWidth = value;
  }
  /**
   * The effective height.
   *
   * If the preferred width and height are set to {@link Resizer.AUTO_SIZE}, the base height will be returned.
   *
   * @type {Number}
   */
  get height() {
    return this.effectiveSize.height;
  }
  set height(value) {
    this.preferredHeight = value;
  }
  /**
   * Returns the effective width.
   *
   * If the preferred width and height are set to {@link Resizer.AUTO_SIZE}, the base width will be returned.
   *
   * @deprecated Use width instead.
   * @return {Number} The effective width.
   */
  getWidth() {
    return this.width;
  }
  /**
   * Returns the effective height.
   *
   * If the preferred width and height are set to {@link Resizer.AUTO_SIZE}, the base height will be returned.
   *
   * @deprecated Use height instead.
   * @return {Number} The effective height.
   */
  getHeight() {
    return this.height;
  }
  /**
   * The resolution scale.
   *
   * @type {Number}
   */
  get scale() {
    return this.s;
  }
  set scale(value) {
    if (this.s !== value) {
      this.s = value;
      this.preferredSize.setScalar(AUTO_SIZE);
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Returns the current resolution scale.
   *
   * @deprecated Use scale instead.
   * @return {Number} The scale.
   */
  getScale() {
    return this.scale;
  }
  /**
   * Sets the resolution scale.
   *
   * Also sets the preferred resolution to {@link Resizer.AUTO_SIZE}.
   *
   * @deprecated Use scale instead.
   * @param {Number} value - The scale.
   */
  setScale(value) {
    this.scale = value;
  }
  /**
   * The base width.
   *
   * @type {Number}
   */
  get baseWidth() {
    return this.baseSize.width;
  }
  set baseWidth(value) {
    if (this.baseSize.width !== value) {
      this.baseSize.width = value;
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Returns the base width.
   *
   * @deprecated Use baseWidth instead.
   * @return {Number} The base width.
   */
  getBaseWidth() {
    return this.baseWidth;
  }
  /**
   * Sets the base width.
   *
   * @deprecated Use baseWidth instead.
   * @param {Number} value - The width.
   */
  setBaseWidth(value) {
    this.baseWidth = value;
  }
  /**
   * The base height.
   *
   * @type {Number}
   */
  get baseHeight() {
    return this.baseSize.height;
  }
  set baseHeight(value) {
    if (this.baseSize.height !== value) {
      this.baseSize.height = value;
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Returns the base height.
   *
   * @deprecated Use baseHeight instead.
   * @return {Number} The base height.
   */
  getBaseHeight() {
    return this.baseHeight;
  }
  /**
   * Sets the base height.
   *
   * @deprecated Use baseHeight instead.
   * @param {Number} value - The height.
   */
  setBaseHeight(value) {
    this.baseHeight = value;
  }
  /**
   * Sets the base size.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setBaseSize(width, height) {
    if (this.baseSize.width !== width || this.baseSize.height !== height) {
      this.baseSize.set(width, height);
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * The preferred width.
   *
   * @type {Number}
   */
  get preferredWidth() {
    return this.preferredSize.width;
  }
  set preferredWidth(value) {
    if (this.preferredSize.width !== value) {
      this.preferredSize.width = value;
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Returns the preferred width.
   *
   * @deprecated Use preferredWidth instead.
   * @return {Number} The preferred width.
   */
  getPreferredWidth() {
    return this.preferredWidth;
  }
  /**
   * Sets the preferred width.
   *
   * Use {@link Resizer.AUTO_SIZE} to automatically calculate the width based on the height and aspect ratio.
   *
   * @deprecated Use preferredWidth instead.
   * @param {Number} value - The width.
   */
  setPreferredWidth(value) {
    this.preferredWidth = value;
  }
  /**
   * The preferred height.
   *
   * @type {Number}
   */
  get preferredHeight() {
    return this.preferredSize.height;
  }
  set preferredHeight(value) {
    if (this.preferredSize.height !== value) {
      this.preferredSize.height = value;
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Returns the preferred height.
   *
   * @deprecated Use preferredHeight instead.
   * @return {Number} The preferred height.
   */
  getPreferredHeight() {
    return this.preferredHeight;
  }
  /**
   * Sets the preferred height.
   *
   * Use {@link Resizer.AUTO_SIZE} to automatically calculate the height based on the width and aspect ratio.
   *
   * @deprecated Use preferredHeight instead.
   * @param {Number} value - The height.
   */
  setPreferredHeight(value) {
    this.preferredHeight = value;
  }
  /**
   * Sets the preferred size.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setPreferredSize(width, height) {
    if (this.preferredSize.width !== width || this.preferredSize.height !== height) {
      this.preferredSize.set(width, height);
      this.dispatchEvent({ type: "change" });
      this.resizable.setSize(this.baseSize.width, this.baseSize.height);
    }
  }
  /**
   * Copies the given resolution.
   *
   * @param {Resolution} resolution - The resolution.
   */
  copy(resolution) {
    this.s = resolution.scale;
    this.baseSize.set(resolution.baseWidth, resolution.baseHeight);
    this.preferredSize.set(resolution.preferredWidth, resolution.preferredHeight);
    this.dispatchEvent({ type: "change" });
    this.resizable.setSize(this.baseSize.width, this.baseSize.height);
  }
  /**
   * An auto sizing constant.
   *
   * Can be used to automatically calculate the width or height based on the original aspect ratio.
   *
   * @type {Number}
   */
  static get AUTO_SIZE() {
    return AUTO_SIZE;
  }
};
var BlendFunction = {
  SKIP: 9,
  SET: 30,
  ADD: 0,
  ALPHA: 1,
  AVERAGE: 2,
  COLOR: 3,
  COLOR_BURN: 4,
  COLOR_DODGE: 5,
  DARKEN: 6,
  DIFFERENCE: 7,
  DIVIDE: 8,
  DST: 9,
  EXCLUSION: 10,
  HARD_LIGHT: 11,
  HARD_MIX: 12,
  HUE: 13,
  INVERT: 14,
  INVERT_RGB: 15,
  LIGHTEN: 16,
  LINEAR_BURN: 17,
  LINEAR_DODGE: 18,
  LINEAR_LIGHT: 19,
  LUMINOSITY: 20,
  MULTIPLY: 21,
  NEGATION: 22,
  NORMAL: 23,
  OVERLAY: 24,
  PIN_LIGHT: 25,
  REFLECT: 26,
  SATURATION: 27,
  SCREEN: 28,
  SOFT_LIGHT: 29,
  SRC: 30,
  SUBTRACT: 31,
  VIVID_LIGHT: 32
};
var add_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,x+y,opacity);}";
var alpha_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,y,min(y.a,opacity));}";
var average_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,(x+y)*0.5,opacity);}";
var color_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec3 xHSL=RGBToHSL(x.rgb);vec3 yHSL=RGBToHSL(y.rgb);vec3 z=HSLToRGB(vec3(yHSL.rg,xHSL.b));return vec4(mix(x.rgb,z,opacity),y.a);}";
var color_burn_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 z=mix(step(0.0,y)*(1.0-min(vec4(1.0),(1.0-x)/y)),vec4(1.0),step(1.0,x));return mix(x,z,opacity);}";
var color_dodge_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 z=step(0.0,x)*mix(min(vec4(1.0),x/max(1.0-y,1e-9)),vec4(1.0),step(1.0,y));return mix(x,z,opacity);}";
var darken_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,min(x,y),opacity);}";
var difference_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,abs(x-y),opacity);}";
var divide_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,x/max(y,1e-12),opacity);}";
var exclusion_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,(x+y-2.0*x*y),opacity);}";
var hard_light_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 a=min(x,1.0),b=min(y,1.0);vec4 z=mix(2.0*a*b,1.0-2.0*(1.0-a)*(1.0-b),step(0.5,y));return mix(x,z,opacity);}";
var hard_mix_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,step(1.0,x+y),opacity);}";
var hue_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec3 xHSL=RGBToHSL(x.rgb);vec3 yHSL=RGBToHSL(y.rgb);vec3 z=HSLToRGB(vec3(yHSL.r,xHSL.gb));return vec4(mix(x.rgb,z,opacity),y.a);}";
var invert_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,1.0-y,opacity);}";
var invert_rgb_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,y*(1.0-x),opacity);}";
var lighten_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,max(x,y),opacity);}";
var linear_burn_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,clamp(y+x-1.0,0.0,1.0),opacity);}";
var linear_dodge_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,min(x+y,1.0),opacity);}";
var linear_light_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,clamp(2.0*y+x-1.0,0.0,1.0),opacity);}";
var luminosity_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec3 xHSL=RGBToHSL(x.rgb);vec3 yHSL=RGBToHSL(y.rgb);vec3 z=HSLToRGB(vec3(xHSL.rg,yHSL.b));return vec4(mix(x.rgb,z,opacity),y.a);}";
var multiply_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,x*y,opacity);}";
var negation_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,1.0-abs(1.0-x-y),opacity);}";
var normal_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,y,opacity);}";
var overlay_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 z=mix(2.0*y*x,1.0-2.0*(1.0-y)*(1.0-x),step(0.5,x));return mix(x,z,opacity);}";
var pin_light_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 y2=2.0*y;vec4 z=mix(mix(y2,x,step(0.5*x,y)),max(vec4(0.0),y2-1.0),step(x,(y2-1.0)));return mix(x,z,opacity);}";
var reflect_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 z=mix(min(x*x/max(1.0-y,1e-12),1.0),y,step(1.0,y));return mix(x,z,opacity);}";
var saturation_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec3 xHSL=RGBToHSL(x.rgb);vec3 yHSL=RGBToHSL(y.rgb);vec3 z=HSLToRGB(vec3(xHSL.r,yHSL.g,xHSL.b));return vec4(mix(x.rgb,z,opacity),y.a);}";
var screen_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,x+y-min(x*y,1.0),opacity);}";
var soft_light_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 y2=2.0*y;vec4 w=step(0.5,y);vec4 z=mix(x-(1.0-y2)*x*(1.0-x),mix(x+(y2-1.0)*(sqrt(x)-x),x+(y2-1.0)*x*((16.0*x-12.0)*x+3.0),w*(1.0-step(0.25,x))),w);return mix(x,z,opacity);}";
var src_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return y;}";
var subtract_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){return mix(x,max(x+y-1.0,0.0),opacity);}";
var vivid_light_default = "vec4 blend(const in vec4 x,const in vec4 y,const in float opacity){vec4 z=mix(max(1.0-min((1.0-x)/(2.0*y),1.0),0.0),min(x/(2.0*(1.0-y)),1.0),step(0.5,y));return mix(x,z,opacity);}";
var blendFunctions = /* @__PURE__ */ new Map([
  [BlendFunction.ADD, add_default],
  [BlendFunction.ALPHA, alpha_default],
  [BlendFunction.AVERAGE, average_default],
  [BlendFunction.COLOR, color_default],
  [BlendFunction.COLOR_BURN, color_burn_default],
  [BlendFunction.COLOR_DODGE, color_dodge_default],
  [BlendFunction.DARKEN, darken_default],
  [BlendFunction.DIFFERENCE, difference_default],
  [BlendFunction.DIVIDE, divide_default],
  [BlendFunction.DST, null],
  [BlendFunction.EXCLUSION, exclusion_default],
  [BlendFunction.HARD_LIGHT, hard_light_default],
  [BlendFunction.HARD_MIX, hard_mix_default],
  [BlendFunction.HUE, hue_default],
  [BlendFunction.INVERT, invert_default],
  [BlendFunction.INVERT_RGB, invert_rgb_default],
  [BlendFunction.LIGHTEN, lighten_default],
  [BlendFunction.LINEAR_BURN, linear_burn_default],
  [BlendFunction.LINEAR_DODGE, linear_dodge_default],
  [BlendFunction.LINEAR_LIGHT, linear_light_default],
  [BlendFunction.LUMINOSITY, luminosity_default],
  [BlendFunction.MULTIPLY, multiply_default],
  [BlendFunction.NEGATION, negation_default],
  [BlendFunction.NORMAL, normal_default],
  [BlendFunction.OVERLAY, overlay_default],
  [BlendFunction.PIN_LIGHT, pin_light_default],
  [BlendFunction.REFLECT, reflect_default],
  [BlendFunction.SATURATION, saturation_default],
  [BlendFunction.SCREEN, screen_default],
  [BlendFunction.SOFT_LIGHT, soft_light_default],
  [BlendFunction.SRC, src_default],
  [BlendFunction.SUBTRACT, subtract_default],
  [BlendFunction.VIVID_LIGHT, vivid_light_default]
]);
var BlendMode = class extends EventDispatcher2 {
  /**
   * Constructs a new blend mode.
   *
   * @param {BlendFunction} blendFunction - The blend function.
   * @param {Number} opacity - The opacity of the color that will be blended with the base color.
   */
  constructor(blendFunction, opacity = 1) {
    super();
    this._blendFunction = blendFunction;
    this.opacity = new Uniform2(opacity);
  }
  /**
   * Returns the opacity.
   *
   * @return {Number} The opacity.
   */
  getOpacity() {
    return this.opacity.value;
  }
  /**
   * Sets the opacity.
   *
   * @param {Number} value - The opacity.
   */
  setOpacity(value) {
    this.opacity.value = value;
  }
  /**
   * The blend function.
   *
   * @type {BlendFunction}
   */
  get blendFunction() {
    return this._blendFunction;
  }
  set blendFunction(value) {
    this._blendFunction = value;
    this.dispatchEvent({ type: "change" });
  }
  /**
   * Returns the blend function.
   *
   * @deprecated Use blendFunction instead.
   * @return {BlendFunction} The blend function.
   */
  getBlendFunction() {
    return this.blendFunction;
  }
  /**
   * Sets the blend function.
   *
   * @deprecated Use blendFunction instead.
   * @param {BlendFunction} value - The blend function.
   */
  setBlendFunction(value) {
    this.blendFunction = value;
  }
  /**
   * Returns the blend function shader code.
   *
   * @return {String} The blend function shader code.
   */
  getShaderCode() {
    return blendFunctions.get(this.blendFunction);
  }
};
var KernelSize = {
  VERY_SMALL: 0,
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  VERY_LARGE: 4,
  HUGE: 5
};
var convolution_kawase_default = "#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;\n#else\nuniform lowp sampler2D inputBuffer;\n#endif\nvarying vec2 vUv0;varying vec2 vUv1;varying vec2 vUv2;varying vec2 vUv3;void main(){vec4 sum=texture2D(inputBuffer,vUv0);sum+=texture2D(inputBuffer,vUv1);sum+=texture2D(inputBuffer,vUv2);sum+=texture2D(inputBuffer,vUv3);gl_FragColor=sum*0.25;\n#include <colorspace_fragment>\n}";
var convolution_kawase_default2 = "uniform vec4 texelSize;uniform float kernel;uniform float scale;varying vec2 vUv0;varying vec2 vUv1;varying vec2 vUv2;varying vec2 vUv3;void main(){vec2 uv=position.xy*0.5+0.5;vec2 dUv=(texelSize.xy*vec2(kernel)+texelSize.zw)*scale;vUv0=vec2(uv.x-dUv.x,uv.y+dUv.y);vUv1=vec2(uv.x+dUv.x,uv.y+dUv.y);vUv2=vec2(uv.x+dUv.x,uv.y-dUv.y);vUv3=vec2(uv.x-dUv.x,uv.y-dUv.y);gl_Position=vec4(position.xy,1.0,1.0);}";
var kernelPresets = [
  new Float32Array([0, 0]),
  new Float32Array([0, 1, 1]),
  new Float32Array([0, 1, 1, 2]),
  new Float32Array([0, 1, 2, 2, 3]),
  new Float32Array([0, 1, 2, 3, 4, 4, 5]),
  new Float32Array([0, 1, 2, 3, 4, 5, 7, 8, 9, 10])
];
var KawaseBlurMaterial = class extends ShaderMaterial3 {
  /**
   * Constructs a new convolution material.
   *
   * TODO Remove texelSize param.
   * @param {Vector4} [texelSize] - Deprecated.
   */
  constructor(texelSize = new Vector4()) {
    super({
      name: "KawaseBlurMaterial",
      uniforms: {
        inputBuffer: new Uniform3(null),
        texelSize: new Uniform3(new Vector4()),
        scale: new Uniform3(1),
        kernel: new Uniform3(0)
      },
      blending: NoBlending2,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: convolution_kawase_default,
      vertexShader: convolution_kawase_default2
    });
    this.setTexelSize(texelSize.x, texelSize.y);
    this.kernelSize = KernelSize.MEDIUM;
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Sets the input buffer.
   *
   * @deprecated Use inputBuffer instead.
   * @param {Texture} value - The input buffer.
   */
  setInputBuffer(value) {
    this.inputBuffer = value;
  }
  /**
   * The kernel sequence for the current kernel size.
   *
   * @type {Float32Array}
   */
  get kernelSequence() {
    return kernelPresets[this.kernelSize];
  }
  /**
   * The blur scale.
   *
   * @type {Number}
   */
  get scale() {
    return this.uniforms.scale.value;
  }
  set scale(value) {
    this.uniforms.scale.value = value;
  }
  /**
   * Returns the blur scale.
   *
   * @deprecated Use scale instead.
   * @return {Number} The scale.
   */
  getScale() {
    return this.uniforms.scale.value;
  }
  /**
   * Sets the blur scale.
   *
   * @deprecated Use scale instead.
   * @return {Number} value - The scale.
   */
  setScale(value) {
    this.uniforms.scale.value = value;
  }
  /**
   * Returns the kernel.
   *
   * @return {Float32Array} The kernel.
   * @deprecated Implementation detail, removed with no replacement.
   */
  getKernel() {
    return null;
  }
  /**
   * The current kernel.
   *
   * @type {Number}
   */
  get kernel() {
    return this.uniforms.kernel.value;
  }
  set kernel(value) {
    this.uniforms.kernel.value = value;
  }
  /**
   * Sets the current kernel.
   *
   * @deprecated Use kernel instead.
   * @param {Number} value - The kernel.
   */
  setKernel(value) {
    this.kernel = value;
  }
  /**
   * Sets the texel size.
   *
   * @deprecated Use setSize() instead.
   * @param {Number} x - The texel width.
   * @param {Number} y - The texel height.
   */
  setTexelSize(x, y) {
    this.uniforms.texelSize.value.set(x, y, x * 0.5, y * 0.5);
  }
  /**
   * Sets the size of this object.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const x = 1 / width, y = 1 / height;
    this.uniforms.texelSize.value.set(x, y, x * 0.5, y * 0.5);
  }
};
var KawaseBlurPass = class extends Pass {
  /**
   * Constructs a new Kawase blur pass.
   *
   * @param {Object} [options] - The options.
   * @param {KernelSize} [options.kernelSize=KernelSize.MEDIUM] - The blur kernel size.
   * @param {Number} [options.resolutionScale=0.5] - The resolution scale.
   * @param {Number} [options.resolutionX=Resolution.AUTO_SIZE] - The horizontal resolution.
   * @param {Number} [options.resolutionY=Resolution.AUTO_SIZE] - The vertical resolution.
   * @param {Number} [options.width=Resolution.AUTO_SIZE] - Deprecated. Use resolutionX instead.
   * @param {Number} [options.height=Resolution.AUTO_SIZE] - Deprecated. Use resolutionY instead.
   */
  constructor({
    kernelSize = KernelSize.MEDIUM,
    resolutionScale = 0.5,
    width = Resolution.AUTO_SIZE,
    height = Resolution.AUTO_SIZE,
    resolutionX = width,
    resolutionY = height
  } = {}) {
    super("KawaseBlurPass");
    this.renderTargetA = new WebGLRenderTarget4(1, 1, { depthBuffer: false });
    this.renderTargetA.texture.name = "Blur.Target.A";
    this.renderTargetB = this.renderTargetA.clone();
    this.renderTargetB.texture.name = "Blur.Target.B";
    const resolution = this.resolution = new Resolution(this, resolutionX, resolutionY, resolutionScale);
    resolution.addEventListener("change", (e) => this.setSize(resolution.baseWidth, resolution.baseHeight));
    this._blurMaterial = new KawaseBlurMaterial();
    this._blurMaterial.kernelSize = kernelSize;
    this.copyMaterial = new CopyMaterial();
  }
  /**
   * Returns the resolution settings.
   *
   * @deprecated Use resolution instead.
   * @return {Resolution} The resolution.
   */
  getResolution() {
    return this.resolution;
  }
  /**
   * The blur material.
   *
   * @type {KawaseBlurMaterial}
   */
  get blurMaterial() {
    return this._blurMaterial;
  }
  /**
   * The blur material.
   *
   * @type {KawaseBlurMaterial}
   * @protected
   */
  set blurMaterial(value) {
    this._blurMaterial = value;
  }
  /**
   * Indicates whether dithering is enabled.
   *
   * @type {Boolean}
   * @deprecated Use copyMaterial.dithering instead.
   */
  get dithering() {
    return this.copyMaterial.dithering;
  }
  set dithering(value) {
    this.copyMaterial.dithering = value;
  }
  /**
   * The kernel size.
   *
   * @type {KernelSize}
   * @deprecated Use blurMaterial.kernelSize instead.
   */
  get kernelSize() {
    return this.blurMaterial.kernelSize;
  }
  set kernelSize(value) {
    this.blurMaterial.kernelSize = value;
  }
  /**
   * The current width of the internal render targets.
   *
   * @type {Number}
   * @deprecated Use resolution.width instead.
   */
  get width() {
    return this.resolution.width;
  }
  /**
   * Sets the render width.
   *
   * @type {Number}
   * @deprecated Use resolution.preferredWidth instead.
   */
  set width(value) {
    this.resolution.preferredWidth = value;
  }
  /**
   * The current height of the internal render targets.
   *
   * @type {Number}
   * @deprecated Use resolution.height instead.
   */
  get height() {
    return this.resolution.height;
  }
  /**
   * Sets the render height.
   *
   * @type {Number}
   * @deprecated Use resolution.preferredHeight instead.
   */
  set height(value) {
    this.resolution.preferredHeight = value;
  }
  /**
   * The current blur scale.
   *
   * @type {Number}
   * @deprecated Use blurMaterial.scale instead.
   */
  get scale() {
    return this.blurMaterial.scale;
  }
  set scale(value) {
    this.blurMaterial.scale = value;
  }
  /**
   * Returns the current blur scale.
   *
   * @deprecated Use blurMaterial.scale instead.
   * @return {Number} The scale.
   */
  getScale() {
    return this.blurMaterial.scale;
  }
  /**
   * Sets the blur scale.
   *
   * @deprecated Use blurMaterial.scale instead.
   * @param {Number} value - The scale.
   */
  setScale(value) {
    this.blurMaterial.scale = value;
  }
  /**
   * Returns the kernel size.
   *
   * @deprecated Use blurMaterial.kernelSize instead.
   * @return {KernelSize} The kernel size.
   */
  getKernelSize() {
    return this.kernelSize;
  }
  /**
   * Sets the kernel size.
   *
   * Larger kernels require more processing power but scale well with larger render resolutions.
   *
   * @deprecated Use blurMaterial.kernelSize instead.
   * @param {KernelSize} value - The kernel size.
   */
  setKernelSize(value) {
    this.kernelSize = value;
  }
  /**
   * Returns the current resolution scale.
   *
   * @return {Number} The resolution scale.
   * @deprecated Use resolution instead.
   */
  getResolutionScale() {
    return this.resolution.scale;
  }
  /**
   * Sets the resolution scale.
   *
   * @param {Number} scale - The new resolution scale.
   * @deprecated Use resolution instead.
   */
  setResolutionScale(scale) {
    this.resolution.scale = scale;
  }
  /**
   * Renders the blur.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const scene = this.scene;
    const camera = this.camera;
    const renderTargetA = this.renderTargetA;
    const renderTargetB = this.renderTargetB;
    const material = this.blurMaterial;
    const kernelSequence = material.kernelSequence;
    let previousBuffer = inputBuffer;
    this.fullscreenMaterial = material;
    for (let i = 0, l = kernelSequence.length; i < l; ++i) {
      const buffer = (i & 1) === 0 ? renderTargetA : renderTargetB;
      material.kernel = kernelSequence[i];
      material.inputBuffer = previousBuffer.texture;
      renderer.setRenderTarget(buffer);
      renderer.render(scene, camera);
      previousBuffer = buffer;
    }
    this.fullscreenMaterial = this.copyMaterial;
    this.copyMaterial.inputBuffer = previousBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(scene, camera);
  }
  /**
   * Updates the size of this pass.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const resolution = this.resolution;
    resolution.setBaseSize(width, height);
    const w = resolution.width, h = resolution.height;
    this.renderTargetA.setSize(w, h);
    this.renderTargetB.setSize(w, h);
    this.blurMaterial.setSize(width, height);
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    if (frameBufferType !== void 0) {
      this.renderTargetA.texture.type = frameBufferType;
      this.renderTargetB.texture.type = frameBufferType;
      if (frameBufferType !== UnsignedByteType3) {
        this.blurMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
        this.copyMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
      } else if (renderer !== null && renderer.outputColorSpace === SRGBColorSpace3) {
        this.renderTargetA.texture.colorSpace = SRGBColorSpace3;
        this.renderTargetB.texture.colorSpace = SRGBColorSpace3;
      }
    }
  }
  /**
   * An auto sizing flag.
   *
   * @type {Number}
   * @deprecated Use {@link Resolution.AUTO_SIZE} instead.
   */
  static get AUTO_SIZE() {
    return Resolution.AUTO_SIZE;
  }
};
var luminance_default = "#include <common>\n#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;\n#else\nuniform lowp sampler2D inputBuffer;\n#endif\n#ifdef RANGE\nuniform vec2 range;\n#elif defined(THRESHOLD)\nuniform float threshold;uniform float smoothing;\n#endif\nvarying vec2 vUv;void main(){vec4 texel=texture2D(inputBuffer,vUv);float l=luminance(texel.rgb);\n#ifdef RANGE\nfloat low=step(range.x,l);float high=step(l,range.y);l*=low*high;\n#elif defined(THRESHOLD)\nl=smoothstep(threshold,threshold+smoothing,l)*l;\n#endif\n#ifdef COLOR\ngl_FragColor=vec4(texel.rgb*clamp(l,0.0,1.0),l);\n#else\ngl_FragColor=vec4(l);\n#endif\n}";
var LuminanceMaterial = class extends ShaderMaterial4 {
  /**
   * Constructs a new luminance material.
   *
   * @param {Boolean} [colorOutput=false] - Defines whether the shader should output colors scaled with their luminance value.
   * @param {Vector2} [luminanceRange] - If provided, the shader will mask out texels that aren't in the specified luminance range.
   */
  constructor(colorOutput = false, luminanceRange = null) {
    super({
      name: "LuminanceMaterial",
      defines: {
        THREE_REVISION: REVISION.replace(/\D+/g, "")
      },
      uniforms: {
        inputBuffer: new Uniform4(null),
        threshold: new Uniform4(0),
        smoothing: new Uniform4(1),
        range: new Uniform4(null)
      },
      blending: NoBlending3,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: luminance_default,
      vertexShader: common_default
    });
    this.colorOutput = colorOutput;
    this.luminanceRange = luminanceRange;
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Sets the input buffer.
   *
   * @deprecated Use inputBuffer instead.
   * @param {Texture} value - The input buffer.
   */
  setInputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * The luminance threshold.
   *
   * @type {Number}
   */
  get threshold() {
    return this.uniforms.threshold.value;
  }
  set threshold(value) {
    if (this.smoothing > 0 || value > 0) {
      this.defines.THRESHOLD = "1";
    } else {
      delete this.defines.THRESHOLD;
    }
    this.uniforms.threshold.value = value;
  }
  /**
   * Returns the luminance threshold.
   *
   * @deprecated Use threshold instead.
   * @return {Number} The threshold.
   */
  getThreshold() {
    return this.threshold;
  }
  /**
   * Sets the luminance threshold.
   *
   * @deprecated Use threshold instead.
   * @param {Number} value - The threshold.
   */
  setThreshold(value) {
    this.threshold = value;
  }
  /**
   * The luminance threshold smoothing.
   *
   * @type {Number}
   */
  get smoothing() {
    return this.uniforms.smoothing.value;
  }
  set smoothing(value) {
    if (this.threshold > 0 || value > 0) {
      this.defines.THRESHOLD = "1";
    } else {
      delete this.defines.THRESHOLD;
    }
    this.uniforms.smoothing.value = value;
  }
  /**
   * Returns the luminance threshold smoothing factor.
   *
   * @deprecated Use smoothing instead.
   * @return {Number} The smoothing factor.
   */
  getSmoothingFactor() {
    return this.smoothing;
  }
  /**
   * Sets the luminance threshold smoothing factor.
   *
   * @deprecated Use smoothing instead.
   * @param {Number} value - The smoothing factor.
   */
  setSmoothingFactor(value) {
    this.smoothing = value;
  }
  /**
   * Indicates whether the luminance threshold is enabled.
   *
   * @type {Boolean}
   * @deprecated Adjust the threshold or smoothing factor instead.
   */
  get useThreshold() {
    return this.threshold > 0 || this.smoothing > 0;
  }
  set useThreshold(value) {
  }
  /**
   * Indicates whether color output is enabled.
   *
   * @type {Boolean}
   */
  get colorOutput() {
    return this.defines.COLOR !== void 0;
  }
  set colorOutput(value) {
    if (value) {
      this.defines.COLOR = "1";
    } else {
      delete this.defines.COLOR;
    }
    this.needsUpdate = true;
  }
  /**
   * Indicates whether color output is enabled.
   *
   * @deprecated Use colorOutput instead.
   * @return {Boolean} Whether color output is enabled.
   */
  isColorOutputEnabled(value) {
    return this.colorOutput;
  }
  /**
   * Enables or disables color output.
   *
   * @deprecated Use colorOutput instead.
   * @param {Boolean} value - Whether color output should be enabled.
   */
  setColorOutputEnabled(value) {
    this.colorOutput = value;
  }
  /**
   * Indicates whether luminance masking is enabled.
   *
   * @type {Boolean}
   * @deprecated
   */
  get useRange() {
    return this.luminanceRange !== null;
  }
  set useRange(value) {
    this.luminanceRange = null;
  }
  /**
   * The luminance range. Set to null to disable.
   *
   * @type {Boolean}
   */
  get luminanceRange() {
    return this.uniforms.range.value;
  }
  set luminanceRange(value) {
    if (value !== null) {
      this.defines.RANGE = "1";
    } else {
      delete this.defines.RANGE;
    }
    this.uniforms.range.value = value;
    this.needsUpdate = true;
  }
  /**
   * Returns the current luminance range.
   *
   * @deprecated Use luminanceRange instead.
   * @return {Vector2} The luminance range.
   */
  getLuminanceRange() {
    return this.luminanceRange;
  }
  /**
   * Sets a luminance range. Set to null to disable.
   *
   * @deprecated Use luminanceRange instead.
   * @param {Vector2} value - The luminance range.
   */
  setLuminanceRange(value) {
    this.luminanceRange = value;
  }
};
var LuminancePass = class extends Pass {
  /**
   * Constructs a new luminance pass.
   *
   * @param {Object} [options] - The options. See {@link LuminanceMaterial} for additional options.
   * @param {WebGLRenderTarget} [options.renderTarget] - A custom render target.
   * @param {Number} [options.resolutionScale=1.0] - The resolution scale.
   * @param {Number} [options.resolutionX=Resolution.AUTO_SIZE] - The horizontal resolution.
   * @param {Number} [options.resolutionY=Resolution.AUTO_SIZE] - The vertical resolution.
   * @param {Number} [options.width=Resolution.AUTO_SIZE] - Deprecated. Use resolutionX instead.
   * @param {Number} [options.height=Resolution.AUTO_SIZE] - Deprecated. Use resolutionY instead.
   */
  constructor({
    renderTarget,
    luminanceRange,
    colorOutput,
    resolutionScale = 1,
    width = Resolution.AUTO_SIZE,
    height = Resolution.AUTO_SIZE,
    resolutionX = width,
    resolutionY = height
  } = {}) {
    super("LuminancePass");
    this.fullscreenMaterial = new LuminanceMaterial(colorOutput, luminanceRange);
    this.needsSwap = false;
    this.renderTarget = renderTarget;
    if (this.renderTarget === void 0) {
      this.renderTarget = new WebGLRenderTarget5(1, 1, { depthBuffer: false });
      this.renderTarget.texture.name = "LuminancePass.Target";
    }
    const resolution = this.resolution = new Resolution(this, resolutionX, resolutionY, resolutionScale);
    resolution.addEventListener("change", (e) => this.setSize(resolution.baseWidth, resolution.baseHeight));
  }
  /**
   * The luminance texture.
   *
   * @type {Texture}
   */
  get texture() {
    return this.renderTarget.texture;
  }
  /**
   * Returns the luminance texture.
   *
   * @deprecated Use texture instead.
   * @return {Texture} The texture.
   */
  getTexture() {
    return this.renderTarget.texture;
  }
  /**
   * Returns the resolution settings.
   *
   * @deprecated Use resolution instead.
   * @return {Resolution} The resolution.
   */
  getResolution() {
    return this.resolution;
  }
  /**
   * Renders the luminance.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const material = this.fullscreenMaterial;
    material.inputBuffer = inputBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : this.renderTarget);
    renderer.render(this.scene, this.camera);
  }
  /**
   * Updates the size of this pass.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const resolution = this.resolution;
    resolution.setBaseSize(width, height);
    this.renderTarget.setSize(resolution.width, resolution.height);
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - A renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    if (frameBufferType !== void 0 && frameBufferType !== UnsignedByteType4) {
      this.renderTarget.texture.type = frameBufferType;
      this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
    }
  }
};
var convolution_downsampling_default = "#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;\n#else\nuniform lowp sampler2D inputBuffer;\n#endif\n#define WEIGHT_INNER 0.125\n#define WEIGHT_OUTER 0.0555555\nvarying vec2 vUv;varying vec2 vUv00;varying vec2 vUv01;varying vec2 vUv02;varying vec2 vUv03;varying vec2 vUv04;varying vec2 vUv05;varying vec2 vUv06;varying vec2 vUv07;varying vec2 vUv08;varying vec2 vUv09;varying vec2 vUv10;varying vec2 vUv11;float clampToBorder(const in vec2 uv){return float(uv.s>=0.0&&uv.s<=1.0&&uv.t>=0.0&&uv.t<=1.0);}void main(){vec4 c=vec4(0.0);vec4 w=WEIGHT_INNER*vec4(clampToBorder(vUv00),clampToBorder(vUv01),clampToBorder(vUv02),clampToBorder(vUv03));c+=w.x*texture2D(inputBuffer,vUv00);c+=w.y*texture2D(inputBuffer,vUv01);c+=w.z*texture2D(inputBuffer,vUv02);c+=w.w*texture2D(inputBuffer,vUv03);w=WEIGHT_OUTER*vec4(clampToBorder(vUv04),clampToBorder(vUv05),clampToBorder(vUv06),clampToBorder(vUv07));c+=w.x*texture2D(inputBuffer,vUv04);c+=w.y*texture2D(inputBuffer,vUv05);c+=w.z*texture2D(inputBuffer,vUv06);c+=w.w*texture2D(inputBuffer,vUv07);w=WEIGHT_OUTER*vec4(clampToBorder(vUv08),clampToBorder(vUv09),clampToBorder(vUv10),clampToBorder(vUv11));c+=w.x*texture2D(inputBuffer,vUv08);c+=w.y*texture2D(inputBuffer,vUv09);c+=w.z*texture2D(inputBuffer,vUv10);c+=w.w*texture2D(inputBuffer,vUv11);c+=WEIGHT_OUTER*texture2D(inputBuffer,vUv);gl_FragColor=c;\n#include <colorspace_fragment>\n}";
var convolution_downsampling_default2 = "uniform vec2 texelSize;varying vec2 vUv;varying vec2 vUv00;varying vec2 vUv01;varying vec2 vUv02;varying vec2 vUv03;varying vec2 vUv04;varying vec2 vUv05;varying vec2 vUv06;varying vec2 vUv07;varying vec2 vUv08;varying vec2 vUv09;varying vec2 vUv10;varying vec2 vUv11;void main(){vUv=position.xy*0.5+0.5;vUv00=vUv+texelSize*vec2(-1.0,1.0);vUv01=vUv+texelSize*vec2(1.0,1.0);vUv02=vUv+texelSize*vec2(-1.0,-1.0);vUv03=vUv+texelSize*vec2(1.0,-1.0);vUv04=vUv+texelSize*vec2(-2.0,2.0);vUv05=vUv+texelSize*vec2(0.0,2.0);vUv06=vUv+texelSize*vec2(2.0,2.0);vUv07=vUv+texelSize*vec2(-2.0,0.0);vUv08=vUv+texelSize*vec2(2.0,0.0);vUv09=vUv+texelSize*vec2(-2.0,-2.0);vUv10=vUv+texelSize*vec2(0.0,-2.0);vUv11=vUv+texelSize*vec2(2.0,-2.0);gl_Position=vec4(position.xy,1.0,1.0);}";
var DownsamplingMaterial = class extends ShaderMaterial5 {
  /**
   * Constructs a new downsampling material.
   */
  constructor() {
    super({
      name: "DownsamplingMaterial",
      uniforms: {
        inputBuffer: new Uniform5(null),
        texelSize: new Uniform5(new Vector23())
      },
      blending: NoBlending4,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: convolution_downsampling_default,
      vertexShader: convolution_downsampling_default2
    });
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Sets the size of this object.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    this.uniforms.texelSize.value.set(1 / width, 1 / height);
  }
};
var convolution_upsampling_default = "#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;uniform mediump sampler2D supportBuffer;\n#else\nuniform lowp sampler2D inputBuffer;uniform lowp sampler2D supportBuffer;\n#endif\nuniform float radius;varying vec2 vUv;varying vec2 vUv0;varying vec2 vUv1;varying vec2 vUv2;varying vec2 vUv3;varying vec2 vUv4;varying vec2 vUv5;varying vec2 vUv6;varying vec2 vUv7;void main(){vec4 c=vec4(0.0);c+=texture2D(inputBuffer,vUv0)*0.0625;c+=texture2D(inputBuffer,vUv1)*0.125;c+=texture2D(inputBuffer,vUv2)*0.0625;c+=texture2D(inputBuffer,vUv3)*0.125;c+=texture2D(inputBuffer,vUv)*0.25;c+=texture2D(inputBuffer,vUv4)*0.125;c+=texture2D(inputBuffer,vUv5)*0.0625;c+=texture2D(inputBuffer,vUv6)*0.125;c+=texture2D(inputBuffer,vUv7)*0.0625;vec4 baseColor=texture2D(supportBuffer,vUv);gl_FragColor=mix(baseColor,c,radius);\n#include <colorspace_fragment>\n}";
var convolution_upsampling_default2 = "uniform vec2 texelSize;varying vec2 vUv;varying vec2 vUv0;varying vec2 vUv1;varying vec2 vUv2;varying vec2 vUv3;varying vec2 vUv4;varying vec2 vUv5;varying vec2 vUv6;varying vec2 vUv7;void main(){vUv=position.xy*0.5+0.5;vUv0=vUv+texelSize*vec2(-1.0,1.0);vUv1=vUv+texelSize*vec2(0.0,1.0);vUv2=vUv+texelSize*vec2(1.0,1.0);vUv3=vUv+texelSize*vec2(-1.0,0.0);vUv4=vUv+texelSize*vec2(1.0,0.0);vUv5=vUv+texelSize*vec2(-1.0,-1.0);vUv6=vUv+texelSize*vec2(0.0,-1.0);vUv7=vUv+texelSize*vec2(1.0,-1.0);gl_Position=vec4(position.xy,1.0,1.0);}";
var UpsamplingMaterial = class extends ShaderMaterial6 {
  /**
   * Constructs a new upsampling material.
   */
  constructor() {
    super({
      name: "UpsamplingMaterial",
      uniforms: {
        inputBuffer: new Uniform6(null),
        supportBuffer: new Uniform6(null),
        texelSize: new Uniform6(new Vector24()),
        radius: new Uniform6(0.85)
      },
      blending: NoBlending5,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: convolution_upsampling_default,
      vertexShader: convolution_upsampling_default2
    });
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * A support buffer.
   *
   * @type {Texture}
   */
  set supportBuffer(value) {
    this.uniforms.supportBuffer.value = value;
  }
  /**
   * The blur radius.
   *
   * @type {Number}
   */
  get radius() {
    return this.uniforms.radius.value;
  }
  set radius(value) {
    this.uniforms.radius.value = value;
  }
  /**
   * Sets the size of this object.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    this.uniforms.texelSize.value.set(1 / width, 1 / height);
  }
};
var MipmapBlurPass = class extends Pass {
  /**
   * Constructs a new mipmap blur pass.
   *
   * @param {Object} [options] - The options.
   */
  constructor() {
    super("MipmapBlurPass");
    this.needsSwap = false;
    this.renderTarget = new WebGLRenderTarget6(1, 1, { depthBuffer: false });
    this.renderTarget.texture.name = "Upsampling.Mipmap0";
    this.downsamplingMipmaps = [];
    this.upsamplingMipmaps = [];
    this.downsamplingMaterial = new DownsamplingMaterial();
    this.upsamplingMaterial = new UpsamplingMaterial();
    this.resolution = new Vector25();
  }
  /**
   * A texture that contains the blurred result.
   *
   * @type {Texture}
   */
  get texture() {
    return this.renderTarget.texture;
  }
  /**
   * The MIP levels. Default is 8.
   *
   * @type {Number}
   */
  get levels() {
    return this.downsamplingMipmaps.length;
  }
  set levels(value) {
    if (this.levels !== value) {
      const renderTarget = this.renderTarget;
      this.dispose();
      this.downsamplingMipmaps = [];
      this.upsamplingMipmaps = [];
      for (let i = 0; i < value; ++i) {
        const mipmap = renderTarget.clone();
        mipmap.texture.name = "Downsampling.Mipmap" + i;
        this.downsamplingMipmaps.push(mipmap);
      }
      this.upsamplingMipmaps.push(renderTarget);
      for (let i = 1, l = value - 1; i < l; ++i) {
        const mipmap = renderTarget.clone();
        mipmap.texture.name = "Upsampling.Mipmap" + i;
        this.upsamplingMipmaps.push(mipmap);
      }
      this.setSize(this.resolution.x, this.resolution.y);
    }
  }
  /**
   * The blur radius.
   *
   * @type {Number}
   */
  get radius() {
    return this.upsamplingMaterial.radius;
  }
  set radius(value) {
    this.upsamplingMaterial.radius = value;
  }
  /**
   * Renders the blur.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const { scene, camera } = this;
    const { downsamplingMaterial, upsamplingMaterial } = this;
    const { downsamplingMipmaps, upsamplingMipmaps } = this;
    let previousBuffer = inputBuffer;
    this.fullscreenMaterial = downsamplingMaterial;
    for (let i = 0, l = downsamplingMipmaps.length; i < l; ++i) {
      const mipmap = downsamplingMipmaps[i];
      downsamplingMaterial.setSize(previousBuffer.width, previousBuffer.height);
      downsamplingMaterial.inputBuffer = previousBuffer.texture;
      renderer.setRenderTarget(mipmap);
      renderer.render(scene, camera);
      previousBuffer = mipmap;
    }
    this.fullscreenMaterial = upsamplingMaterial;
    for (let i = upsamplingMipmaps.length - 1; i >= 0; --i) {
      const mipmap = upsamplingMipmaps[i];
      upsamplingMaterial.setSize(previousBuffer.width, previousBuffer.height);
      upsamplingMaterial.inputBuffer = previousBuffer.texture;
      upsamplingMaterial.supportBuffer = downsamplingMipmaps[i].texture;
      renderer.setRenderTarget(mipmap);
      renderer.render(scene, camera);
      previousBuffer = mipmap;
    }
  }
  /**
   * Updates the size of this pass.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const resolution = this.resolution;
    resolution.set(width, height);
    let w = resolution.width, h = resolution.height;
    for (let i = 0, l = this.downsamplingMipmaps.length; i < l; ++i) {
      w = Math.round(w * 0.5);
      h = Math.round(h * 0.5);
      this.downsamplingMipmaps[i].setSize(w, h);
      if (i < this.upsamplingMipmaps.length) {
        this.upsamplingMipmaps[i].setSize(w, h);
      }
    }
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    if (frameBufferType !== void 0) {
      const mipmaps = this.downsamplingMipmaps.concat(this.upsamplingMipmaps);
      for (const mipmap of mipmaps) {
        mipmap.texture.type = frameBufferType;
      }
      if (frameBufferType !== UnsignedByteType5) {
        this.downsamplingMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
        this.upsamplingMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
      } else if (renderer !== null && renderer.outputColorSpace === SRGBColorSpace4) {
        for (const mipmap of mipmaps) {
          mipmap.texture.colorSpace = SRGBColorSpace4;
        }
      }
    }
  }
  /**
   * Deletes internal render targets and textures.
   */
  dispose() {
    super.dispose();
    for (const mipmap of this.downsamplingMipmaps.concat(this.upsamplingMipmaps)) {
      mipmap.dispose();
    }
  }
};
var Effect = class extends EventDispatcher3 {
  /**
   * Constructs a new effect.
   *
   * @param {String} name - The name of this effect. Doesn't have to be unique.
   * @param {String} fragmentShader - The fragment shader. This shader is required.
   * @param {Object} [options] - Additional options.
   * @param {EffectAttribute} [options.attributes=EffectAttribute.NONE] - The effect attributes that determine the execution priority and resource requirements.
   * @param {BlendFunction} [options.blendFunction=BlendFunction.NORMAL] - The blend function of this effect.
   * @param {Map<String, String>} [options.defines] - Custom preprocessor macro definitions. Keys are names and values are code.
   * @param {Map<String, Uniform>} [options.uniforms] - Custom shader uniforms. Keys are names and values are uniforms.
   * @param {Set<WebGLExtension>} [options.extensions] - WebGL extensions.
   * @param {String} [options.vertexShader=null] - The vertex shader. Most effects don't need one.
   */
  constructor(name, fragmentShader, {
    attributes = EffectAttribute.NONE,
    blendFunction = BlendFunction.NORMAL,
    defines = /* @__PURE__ */ new Map(),
    uniforms = /* @__PURE__ */ new Map(),
    extensions = null,
    vertexShader = null
  } = {}) {
    super();
    this.name = name;
    this.renderer = null;
    this.attributes = attributes;
    this.fragmentShader = fragmentShader;
    this.vertexShader = vertexShader;
    this.defines = defines;
    this.uniforms = uniforms;
    this.extensions = extensions;
    this.blendMode = new BlendMode(blendFunction);
    this.blendMode.addEventListener("change", (event) => this.setChanged());
    this._inputColorSpace = LinearSRGBColorSpace2;
    this._outputColorSpace = NoColorSpace;
  }
  /**
   * The input color space.
   *
   * @type {ColorSpace}
   * @experimental
   */
  get inputColorSpace() {
    return this._inputColorSpace;
  }
  /**
   * @type {ColorSpace}
   * @protected
   * @experimental
   */
  set inputColorSpace(value) {
    this._inputColorSpace = value;
    this.setChanged();
  }
  /**
   * The output color space.
   *
   * Should only be changed if this effect converts the input colors to a different color space.
   *
   * @type {ColorSpace}
   * @experimental
   */
  get outputColorSpace() {
    return this._outputColorSpace;
  }
  /**
   * @type {ColorSpace}
   * @protected
   * @experimental
   */
  set outputColorSpace(value) {
    this._outputColorSpace = value;
    this.setChanged();
  }
  /**
   * Sets the main scene.
   *
   * @type {Scene}
   */
  set mainScene(value) {
  }
  /**
   * Sets the main camera.
   *
   * @type {Camera}
   */
  set mainCamera(value) {
  }
  /**
   * Returns the name of this effect.
   *
   * @deprecated Use name instead.
   * @return {String} The name.
   */
  getName() {
    return this.name;
  }
  /**
   * Sets the renderer.
   *
   * @deprecated
   * @param {WebGLRenderer} renderer - The renderer.
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }
  /**
   * Returns the preprocessor macro definitions.
   *
   * @deprecated Use defines instead.
   * @return {Map<String, String>} The extensions.
   */
  getDefines() {
    return this.defines;
  }
  /**
   * Returns the uniforms of this effect.
   *
   * @deprecated Use uniforms instead.
   * @return {Map<String, Uniform>} The extensions.
   */
  getUniforms() {
    return this.uniforms;
  }
  /**
   * Returns the WebGL extensions that are required by this effect.
   *
   * @deprecated Use extensions instead.
   * @return {Set<WebGLExtension>} The extensions.
   */
  getExtensions() {
    return this.extensions;
  }
  /**
   * Returns the blend mode.
   *
   * The result of this effect will be blended with the result of the previous effect using this blend mode.
   *
   * @deprecated Use blendMode instead.
   * @return {BlendMode} The blend mode.
   */
  getBlendMode() {
    return this.blendMode;
  }
  /**
   * Returns the effect attributes.
   *
   * @return {EffectAttribute} The attributes.
   */
  getAttributes() {
    return this.attributes;
  }
  /**
   * Sets the effect attributes.
   *
   * Effects that have the same attributes will be executed in the order in which they were registered. Some attributes
   * imply a higher priority.
   *
   * @protected
   * @param {EffectAttribute} attributes - The attributes.
   */
  setAttributes(attributes) {
    this.attributes = attributes;
    this.setChanged();
  }
  /**
   * Returns the fragment shader.
   *
   * @return {String} The fragment shader.
   */
  getFragmentShader() {
    return this.fragmentShader;
  }
  /**
   * Sets the fragment shader.
   *
   * @protected
   * @param {String} fragmentShader - The fragment shader.
   */
  setFragmentShader(fragmentShader) {
    this.fragmentShader = fragmentShader;
    this.setChanged();
  }
  /**
   * Returns the vertex shader.
   *
   * @return {String} The vertex shader.
   */
  getVertexShader() {
    return this.vertexShader;
  }
  /**
   * Sets the vertex shader.
   *
   * @protected
   * @param {String} vertexShader - The vertex shader.
   */
  setVertexShader(vertexShader) {
    this.vertexShader = vertexShader;
    this.setChanged();
  }
  /**
   * Informs the associated {@link EffectPass} that this effect requires a shader recompilation.
   *
   * Should be called after changing macros or extensions and after adding/removing uniforms.
   *
   * @protected
   */
  setChanged() {
    this.dispatchEvent({ type: "change" });
  }
  /**
   * Sets the depth texture.
   *
   * You may override this method if your effect requires direct access to the depth texture that is bound to the
   * associated {@link EffectPass}.
   *
   * @param {Texture} depthTexture - A depth texture.
   * @param {DepthPackingStrategies} [depthPacking=BasicDepthPacking] - The depth packing.
   */
  setDepthTexture(depthTexture, depthPacking = BasicDepthPacking2) {
  }
  /**
   * Updates this effect by performing supporting operations.
   *
   * This method is called by the {@link EffectPass} right before the main fullscreen render operation, even if the
   * blend function is set to `SKIP`.
   *
   * You may override this method if you need to update custom uniforms or render additional off-screen textures.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   */
  update(renderer, inputBuffer, deltaTime) {
  }
  /**
   * Updates the size of this effect.
   *
   * You may override this method if you want to be informed about the size of the backbuffer/canvas.
   * This method is called before {@link initialize} and every time the size of the {@link EffectComposer} changes.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
  }
  /**
   * Performs initialization tasks.
   *
   * This method is called when the associated {@link EffectPass} is added to an {@link EffectComposer}.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   * @example if(!alpha && frameBufferType === UnsignedByteType) { this.myRenderTarget.texture.format = RGBFormat; }
   */
  initialize(renderer, alpha, frameBufferType) {
  }
  /**
   * Performs a shallow search for properties that define a dispose method and deletes them.
   *
   * The {@link EffectComposer} calls this method when it is being destroyed.
   */
  dispose() {
    for (const key of Object.keys(this)) {
      const property = this[key];
      const isDisposable = property instanceof WebGLRenderTarget7 || property instanceof Material2 || property instanceof Texture2 || property instanceof Pass;
      if (isDisposable) {
        this[key].dispose();
      }
    }
  }
};
var bloom_default = "#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D map;\n#else\nuniform lowp sampler2D map;\n#endif\nuniform float intensity;void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){vec4 texel=texture2D(map,uv);outputColor=vec4(texel.rgb*intensity,texel.a);}";
var BloomEffect = class extends Effect {
  /**
   * Constructs a new bloom effect.
   *
   * @param {Object} [options] - The options.
   * @param {BlendFunction} [options.blendFunction=BlendFunction.SCREEN] - The blend function of this effect.
   * @param {Number} [options.luminanceThreshold=0.9] - The luminance threshold. Raise this value to mask out darker elements in the scene.
   * @param {Number} [options.luminanceSmoothing=0.025] - Controls the smoothness of the luminance threshold.
   * @param {Boolean} [options.mipmapBlur=false] - Enables or disables mipmap blur.
   * @param {Number} [options.intensity=1.0] - The bloom intensity.
   * @param {Number} [options.radius=0.85] - The blur radius. Only applies to mipmap blur.
   * @param {Number} [options.levels=8] - The amount of MIP levels. Only applies to mipmap blur.
   * @param {KernelSize} [options.kernelSize=KernelSize.LARGE] - Deprecated. Use mipmapBlur instead.
   * @param {Number} [options.resolutionScale=0.5] - Deprecated. Use mipmapBlur instead.
   * @param {Number} [options.resolutionX=Resolution.AUTO_SIZE] - Deprecated. Use mipmapBlur instead.
   * @param {Number} [options.resolutionY=Resolution.AUTO_SIZE] - Deprecated. Use mipmapBlur instead.
   * @param {Number} [options.width=Resolution.AUTO_SIZE] - Deprecated. Use mipmapBlur instead.
   * @param {Number} [options.height=Resolution.AUTO_SIZE] - Deprecated. Use mipmapBlur instead.
   */
  constructor({
    blendFunction = BlendFunction.SCREEN,
    luminanceThreshold = 0.9,
    luminanceSmoothing = 0.025,
    mipmapBlur = false,
    intensity = 1,
    radius = 0.85,
    levels = 8,
    kernelSize = KernelSize.LARGE,
    resolutionScale = 0.5,
    width = Resolution.AUTO_SIZE,
    height = Resolution.AUTO_SIZE,
    resolutionX = width,
    resolutionY = height
  } = {}) {
    super("BloomEffect", bloom_default, {
      blendFunction,
      uniforms: /* @__PURE__ */ new Map([
        ["map", new Uniform7(null)],
        ["intensity", new Uniform7(intensity)]
      ])
    });
    this.renderTarget = new WebGLRenderTarget8(1, 1, { depthBuffer: false });
    this.renderTarget.texture.name = "Bloom.Target";
    this.blurPass = new KawaseBlurPass({ kernelSize });
    this.luminancePass = new LuminancePass({ colorOutput: true });
    this.luminanceMaterial.threshold = luminanceThreshold;
    this.luminanceMaterial.smoothing = luminanceSmoothing;
    this.mipmapBlurPass = new MipmapBlurPass();
    this.mipmapBlurPass.enabled = mipmapBlur;
    this.mipmapBlurPass.radius = radius;
    this.mipmapBlurPass.levels = levels;
    this.uniforms.get("map").value = mipmapBlur ? this.mipmapBlurPass.texture : this.renderTarget.texture;
    const resolution = this.resolution = new Resolution(this, resolutionX, resolutionY, resolutionScale);
    resolution.addEventListener("change", (e) => this.setSize(resolution.baseWidth, resolution.baseHeight));
  }
  /**
   * A texture that contains the intermediate result of this effect.
   *
   * @type {Texture}
   */
  get texture() {
    return this.mipmapBlurPass.enabled ? this.mipmapBlurPass.texture : this.renderTarget.texture;
  }
  /**
   * Returns the generated bloom texture.
   *
   * @deprecated Use texture instead.
   * @return {Texture} The texture.
   */
  getTexture() {
    return this.texture;
  }
  /**
   * Returns the resolution settings.
   *
   * @deprecated Use resolution instead.
   * @return {Resolution} The resolution.
   */
  getResolution() {
    return this.resolution;
  }
  /**
   * Returns the blur pass.
   *
   * @deprecated
   * @return {KawaseBlurPass} The blur pass.
   */
  getBlurPass() {
    return this.blurPass;
  }
  /**
   * Returns the luminance pass.
   *
   * @deprecated Use luminancePass instead.
   * @return {LuminancePass} The luminance pass.
   */
  getLuminancePass() {
    return this.luminancePass;
  }
  /**
   * The luminance material.
   *
   * @type {LuminanceMaterial}
   */
  get luminanceMaterial() {
    return this.luminancePass.fullscreenMaterial;
  }
  /**
   * Returns the luminance material.
   *
   * @deprecated Use luminanceMaterial instead.
   * @return {LuminanceMaterial} The material.
   */
  getLuminanceMaterial() {
    return this.luminancePass.fullscreenMaterial;
  }
  /**
   * The current width of the internal render targets.
   *
   * @type {Number}
   * @deprecated
   */
  get width() {
    return this.resolution.width;
  }
  set width(value) {
    this.resolution.preferredWidth = value;
  }
  /**
   * The current height of the internal render targets.
   *
   * @type {Number}
   * @deprecated
   */
  get height() {
    return this.resolution.height;
  }
  set height(value) {
    this.resolution.preferredHeight = value;
  }
  /**
   * Indicates whether dithering is enabled.
   *
   * @type {Boolean}
   * @deprecated Use EffectPass.dithering instead.
   */
  get dithering() {
    return this.blurPass.dithering;
  }
  set dithering(value) {
    this.blurPass.dithering = value;
  }
  /**
   * The blur kernel size.
   *
   * @type {KernelSize}
   * @deprecated
   */
  get kernelSize() {
    return this.blurPass.kernelSize;
  }
  set kernelSize(value) {
    this.blurPass.kernelSize = value;
  }
  /**
   * @type {Number}
   * @deprecated
   */
  get distinction() {
    console.warn(this.name, "distinction was removed");
    return 1;
  }
  set distinction(value) {
    console.warn(this.name, "distinction was removed");
  }
  /**
   * The bloom intensity.
   *
   * @type {Number}
   */
  get intensity() {
    return this.uniforms.get("intensity").value;
  }
  set intensity(value) {
    this.uniforms.get("intensity").value = value;
  }
  /**
   * The bloom intensity.
   *
   * @deprecated Use intensity instead.
   * @return {Number} The intensity.
   */
  getIntensity() {
    return this.intensity;
  }
  /**
   * Sets the bloom intensity.
   *
   * @deprecated Use intensity instead.
   * @param {Number} value - The intensity.
   */
  setIntensity(value) {
    this.intensity = value;
  }
  /**
   * Returns the current resolution scale.
   *
   * @return {Number} The resolution scale.
   * @deprecated
   */
  getResolutionScale() {
    return this.resolution.scale;
  }
  /**
   * Sets the resolution scale.
   *
   * @param {Number} scale - The new resolution scale.
   * @deprecated
   */
  setResolutionScale(scale) {
    this.resolution.scale = scale;
  }
  /**
   * Updates this effect.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   */
  update(renderer, inputBuffer, deltaTime) {
    const renderTarget = this.renderTarget;
    const luminancePass = this.luminancePass;
    if (luminancePass.enabled) {
      luminancePass.render(renderer, inputBuffer);
      if (this.mipmapBlurPass.enabled) {
        this.mipmapBlurPass.render(renderer, luminancePass.renderTarget);
      } else {
        this.blurPass.render(renderer, luminancePass.renderTarget, renderTarget);
      }
    } else {
      if (this.mipmapBlurPass.enabled) {
        this.mipmapBlurPass.render(renderer, inputBuffer);
      } else {
        this.blurPass.render(renderer, inputBuffer, renderTarget);
      }
    }
  }
  /**
   * Updates the size of internal render targets.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const resolution = this.resolution;
    resolution.setBaseSize(width, height);
    this.renderTarget.setSize(resolution.width, resolution.height);
    this.blurPass.resolution.copy(resolution);
    this.luminancePass.setSize(width, height);
    this.mipmapBlurPass.setSize(width, height);
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    this.blurPass.initialize(renderer, alpha, frameBufferType);
    this.luminancePass.initialize(renderer, alpha, frameBufferType);
    this.mipmapBlurPass.initialize(renderer, alpha, frameBufferType);
    if (frameBufferType !== void 0) {
      this.renderTarget.texture.type = frameBufferType;
      if (renderer !== null && renderer.outputColorSpace === SRGBColorSpace5) {
        this.renderTarget.texture.colorSpace = SRGBColorSpace5;
      }
    }
  }
};
var RenderPass = class extends Pass {
  /**
   * Constructs a new render pass.
   *
   * @param {Scene} scene - The scene to render.
   * @param {Camera} camera - The camera to use to render the scene.
   * @param {Material} [overrideMaterial=null] - An override material.
   */
  constructor(scene, camera, overrideMaterial = null) {
    super("RenderPass", scene, camera);
    this.needsSwap = false;
    this.clearPass = new ClearPass();
    this.overrideMaterialManager = overrideMaterial === null ? null : new OverrideMaterialManager(overrideMaterial);
    this.ignoreBackground = false;
    this.skipShadowMapUpdate = false;
    this.selection = null;
  }
  set mainScene(value) {
    this.scene = value;
  }
  set mainCamera(value) {
    this.camera = value;
  }
  get renderToScreen() {
    return super.renderToScreen;
  }
  set renderToScreen(value) {
    super.renderToScreen = value;
    this.clearPass.renderToScreen = value;
  }
  /**
   * The current override material.
   *
   * @type {Material}
   */
  get overrideMaterial() {
    const manager = this.overrideMaterialManager;
    return manager !== null ? manager.material : null;
  }
  set overrideMaterial(value) {
    const manager = this.overrideMaterialManager;
    if (value !== null) {
      if (manager !== null) {
        manager.setMaterial(value);
      } else {
        this.overrideMaterialManager = new OverrideMaterialManager(value);
      }
    } else if (manager !== null) {
      manager.dispose();
      this.overrideMaterialManager = null;
    }
  }
  /**
   * Returns the current override material.
   *
   * @deprecated Use overrideMaterial instead.
   * @return {Material} The material.
   */
  getOverrideMaterial() {
    return this.overrideMaterial;
  }
  /**
   * Sets the override material.
   *
   * @deprecated Use overrideMaterial instead.
   * @return {Material} value - The material.
   */
  setOverrideMaterial(value) {
    this.overrideMaterial = value;
  }
  /**
   * Indicates whether the target buffer should be cleared before rendering.
   *
   * @type {Boolean}
   * @deprecated Use clearPass.enabled instead.
   */
  get clear() {
    return this.clearPass.enabled;
  }
  set clear(value) {
    this.clearPass.enabled = value;
  }
  /**
   * Returns the selection. Default is `null` (no restriction).
   *
   * @deprecated Use selection instead.
   * @return {Selection} The selection.
   */
  getSelection() {
    return this.selection;
  }
  /**
   * Sets the selection. Set to `null` to disable.
   *
   * @deprecated Use selection instead.
   * @param {Selection} value - The selection.
   */
  setSelection(value) {
    this.selection = value;
  }
  /**
   * Indicates whether the scene background is disabled.
   *
   * @deprecated Use ignoreBackground instead.
   * @return {Boolean} Whether the scene background is disabled.
   */
  isBackgroundDisabled() {
    return this.ignoreBackground;
  }
  /**
   * Enables or disables the scene background.
   *
   * @deprecated Use ignoreBackground instead.
   * @param {Boolean} value - Whether the scene background should be disabled.
   */
  setBackgroundDisabled(value) {
    this.ignoreBackground = value;
  }
  /**
   * Indicates whether the shadow map auto update is disabled.
   *
   * @deprecated Use skipShadowMapUpdate instead.
   * @return {Boolean} Whether the shadow map update is disabled.
   */
  isShadowMapDisabled() {
    return this.skipShadowMapUpdate;
  }
  /**
   * Enables or disables the shadow map auto update.
   *
   * @deprecated Use skipShadowMapUpdate instead.
   * @param {Boolean} value - Whether the shadow map auto update should be disabled.
   */
  setShadowMapDisabled(value) {
    this.skipShadowMapUpdate = value;
  }
  /**
   * Returns the clear pass.
   *
   * @deprecated Use clearPass.enabled instead.
   * @return {ClearPass} The clear pass.
   */
  getClearPass() {
    return this.clearPass;
  }
  /**
   * Renders the scene.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    const scene = this.scene;
    const camera = this.camera;
    const selection = this.selection;
    const mask = camera.layers.mask;
    const background = scene.background;
    const shadowMapAutoUpdate = renderer.shadowMap.autoUpdate;
    const renderTarget = this.renderToScreen ? null : inputBuffer;
    if (selection !== null) {
      camera.layers.set(selection.getLayer());
    }
    if (this.skipShadowMapUpdate) {
      renderer.shadowMap.autoUpdate = false;
    }
    if (this.ignoreBackground || this.clearPass.overrideClearColor !== null) {
      scene.background = null;
    }
    if (this.clearPass.enabled) {
      this.clearPass.render(renderer, inputBuffer);
    }
    renderer.setRenderTarget(renderTarget);
    if (this.overrideMaterialManager !== null) {
      this.overrideMaterialManager.render(renderer, scene, camera);
    } else {
      renderer.render(scene, camera);
    }
    camera.layers.mask = mask;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowMapAutoUpdate;
  }
};
var ToneMappingMode = {
  LINEAR: 0,
  REINHARD: 1,
  REINHARD2: 2,
  REINHARD2_ADAPTIVE: 3,
  UNCHARTED2: 4,
  OPTIMIZED_CINEON: 5,
  CINEON: 5,
  ACES_FILMIC: 6,
  AGX: 7,
  NEUTRAL: 8
};
var HALF_PI = Math.PI * 0.5;
var adaptive_luminance_default = "#include <packing>\n#define packFloatToRGBA(v) packDepthToRGBA(v)\n#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)\nuniform lowp sampler2D luminanceBuffer0;uniform lowp sampler2D luminanceBuffer1;uniform float minLuminance;uniform float deltaTime;uniform float tau;varying vec2 vUv;void main(){float l0=unpackRGBAToFloat(texture2D(luminanceBuffer0,vUv));\n#if __VERSION__ < 300\nfloat l1=texture2DLodEXT(luminanceBuffer1,vUv,MIP_LEVEL_1X1).r;\n#else\nfloat l1=textureLod(luminanceBuffer1,vUv,MIP_LEVEL_1X1).r;\n#endif\nl0=max(minLuminance,l0);l1=max(minLuminance,l1);float adaptedLum=l0+(l1-l0)*(1.0-exp(-deltaTime*tau));gl_FragColor=(adaptedLum==1.0)?vec4(1.0):packFloatToRGBA(adaptedLum);}";
var AdaptiveLuminanceMaterial = class extends ShaderMaterial18 {
  /**
   * Constructs a new adaptive luminance material.
   */
  constructor() {
    super({
      name: "AdaptiveLuminanceMaterial",
      defines: {
        MIP_LEVEL_1X1: "0.0"
      },
      uniforms: {
        luminanceBuffer0: new Uniform44(null),
        luminanceBuffer1: new Uniform44(null),
        minLuminance: new Uniform44(0.01),
        deltaTime: new Uniform44(0),
        tau: new Uniform44(1)
      },
      extensions: {
        shaderTextureLOD: true
      },
      blending: NoBlending17,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      fragmentShader: adaptive_luminance_default,
      vertexShader: common_default
    });
  }
  /**
   * The primary luminance buffer that contains the downsampled average luminance.
   *
   * @type {Texture}
   */
  set luminanceBuffer0(value) {
    this.uniforms.luminanceBuffer0.value = value;
  }
  /**
   * Sets the primary luminance buffer that contains the downsampled average luminance.
   *
   * @deprecated Use luminanceBuffer0 instead.
   * @param {Texture} value - The buffer.
   */
  setLuminanceBuffer0(value) {
    this.uniforms.luminanceBuffer0.value = value;
  }
  /**
   * The secondary luminance buffer.
   *
   * @type {Texture}
   */
  set luminanceBuffer1(value) {
    this.uniforms.luminanceBuffer1.value = value;
  }
  /**
   * Sets the secondary luminance buffer.
   *
   * @deprecated Use luminanceBuffer1 instead.
   * @param {Texture} value - The buffer.
   */
  setLuminanceBuffer1(value) {
    this.uniforms.luminanceBuffer1.value = value;
  }
  /**
   * The 1x1 mipmap level.
   *
   * This level is used to identify the smallest mipmap of the primary luminance buffer.
   *
   * @type {Number}
   */
  set mipLevel1x1(value) {
    this.defines.MIP_LEVEL_1X1 = value.toFixed(1);
    this.needsUpdate = true;
  }
  /**
   * Sets the 1x1 mipmap level.
   *
   * @deprecated Use mipLevel1x1 instead.
   * @param {Number} value - The level.
   */
  setMipLevel1x1(value) {
    this.mipLevel1x1 = value;
  }
  /**
   * The delta time.
   *
   * @type {Number}
   */
  set deltaTime(value) {
    this.uniforms.deltaTime.value = value;
  }
  /**
   * Sets the delta time.
   *
   * @deprecated Use deltaTime instead.
   * @param {Number} value - The delta time.
   */
  setDeltaTime(value) {
    this.uniforms.deltaTime.value = value;
  }
  /**
   * The lowest possible luminance value.
   *
   * @type {Number}
   */
  get minLuminance() {
    return this.uniforms.minLuminance.value;
  }
  set minLuminance(value) {
    this.uniforms.minLuminance.value = value;
  }
  /**
   * Returns the lowest possible luminance value.
   *
   * @deprecated Use minLuminance instead.
   * @return {Number} The minimum luminance.
   */
  getMinLuminance() {
    return this.uniforms.minLuminance.value;
  }
  /**
   * Sets the minimum luminance.
   *
   * @deprecated Use minLuminance instead.
   * @param {Number} value - The minimum luminance.
   */
  setMinLuminance(value) {
    this.uniforms.minLuminance.value = value;
  }
  /**
   * The luminance adaptation rate.
   *
   * @type {Number}
   */
  get adaptationRate() {
    return this.uniforms.tau.value;
  }
  set adaptationRate(value) {
    this.uniforms.tau.value = value;
  }
  /**
   * Returns the luminance adaptation rate.
   *
   * @deprecated Use adaptationRate instead.
   * @return {Number} The adaptation rate.
   */
  getAdaptationRate() {
    return this.uniforms.tau.value;
  }
  /**
   * Sets the luminance adaptation rate.
   *
   * @deprecated Use adaptationRate instead.
   * @param {Number} value - The adaptation rate.
   */
  setAdaptationRate(value) {
    this.uniforms.tau.value = value;
  }
};
var AdaptiveLuminancePass = class extends Pass {
  /**
   * Constructs a new adaptive luminance pass.
   *
   * @param {Texture} luminanceBuffer - A buffer that contains the current scene luminance.
   * @param {Object} [options] - The options.
   * @param {Number} [options.minLuminance=0.01] - The minimum luminance.
   * @param {Number} [options.adaptationRate=1.0] - The luminance adaptation rate.
   */
  constructor(luminanceBuffer, { minLuminance = 0.01, adaptationRate = 1 } = {}) {
    super("AdaptiveLuminancePass");
    this.fullscreenMaterial = new AdaptiveLuminanceMaterial();
    this.needsSwap = false;
    this.renderTargetPrevious = new WebGLRenderTarget18(1, 1, {
      minFilter: NearestFilter6,
      magFilter: NearestFilter6,
      depthBuffer: false
    });
    this.renderTargetPrevious.texture.name = "Luminance.Previous";
    const material = this.fullscreenMaterial;
    material.luminanceBuffer0 = this.renderTargetPrevious.texture;
    material.luminanceBuffer1 = luminanceBuffer;
    material.minLuminance = minLuminance;
    material.adaptationRate = adaptationRate;
    this.renderTargetAdapted = this.renderTargetPrevious.clone();
    this.renderTargetAdapted.texture.name = "Luminance.Adapted";
    this.copyPass = new CopyPass(this.renderTargetPrevious, false);
  }
  /**
   * The adaptive luminance texture.
   *
   * @type {Texture}
   */
  get texture() {
    return this.renderTargetAdapted.texture;
  }
  /**
   * Returns the adaptive 1x1 luminance texture.
   *
   * @deprecated Use texture instead.
   * @return {Texture} The texture.
   */
  getTexture() {
    return this.renderTargetAdapted.texture;
  }
  /**
   * Sets the 1x1 mipmap level.
   *
   * This level is used to identify the smallest mipmap of the main luminance texture which contains the downsampled
   * average scene luminance.
   *
   * @type {Number}
   * @deprecated Use fullscreenMaterial.mipLevel1x1 instead.
   */
  set mipLevel1x1(value) {
    this.fullscreenMaterial.mipLevel1x1 = value;
  }
  /**
   * The luminance adaptation rate.
   *
   * @type {Number}
   * @deprecated Use fullscreenMaterial.adaptationRate instead.
   */
  get adaptationRate() {
    return this.fullscreenMaterial.adaptationRate;
  }
  /**
   * @type {Number}
   * @deprecated Use fullscreenMaterial.adaptationRate instead.
   */
  set adaptationRate(value) {
    this.fullscreenMaterial.adaptationRate = value;
  }
  /**
   * Renders the scene normals.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    this.fullscreenMaterial.deltaTime = deltaTime;
    renderer.setRenderTarget(this.renderToScreen ? null : this.renderTargetAdapted);
    renderer.render(this.scene, this.camera);
    this.copyPass.render(renderer, this.renderTargetAdapted);
  }
};
var tone_mapping_default = "#include <tonemapping_pars_fragment>\nuniform float whitePoint;\n#if TONE_MAPPING_MODE == 2 || TONE_MAPPING_MODE == 3\nuniform float middleGrey;\n#if TONE_MAPPING_MODE == 3\nuniform lowp sampler2D luminanceBuffer;\n#else\nuniform float averageLuminance;\n#endif\nvec3 Reinhard2ToneMapping(vec3 color){color*=toneMappingExposure;float l=luminance(color);\n#if TONE_MAPPING_MODE == 3\nfloat lumAvg=unpackRGBAToFloat(texture2D(luminanceBuffer,vec2(0.5)));\n#else\nfloat lumAvg=averageLuminance;\n#endif\nfloat lumScaled=(l*middleGrey)/max(lumAvg,1e-6);float lumCompressed=lumScaled*(1.0+lumScaled/(whitePoint*whitePoint));lumCompressed/=(1.0+lumScaled);return clamp(lumCompressed*color,0.0,1.0);}\n#elif TONE_MAPPING_MODE == 4\n#define A 0.15\n#define B 0.50\n#define C 0.10\n#define D 0.20\n#define E 0.02\n#define F 0.30\nvec3 Uncharted2Helper(const in vec3 x){return((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;}vec3 Uncharted2ToneMapping(vec3 color){color*=toneMappingExposure;return clamp(Uncharted2Helper(color)/Uncharted2Helper(vec3(whitePoint)),0.0,1.0);}\n#endif\nvoid mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){\n#if TONE_MAPPING_MODE == 2 || TONE_MAPPING_MODE == 3\noutputColor=vec4(Reinhard2ToneMapping(inputColor.rgb),inputColor.a);\n#elif TONE_MAPPING_MODE == 4\noutputColor=vec4(Uncharted2ToneMapping(inputColor.rgb),inputColor.a);\n#else\noutputColor=vec4(toneMapping(inputColor.rgb),inputColor.a);\n#endif\n}";
var ToneMappingEffect = class extends Effect {
  /**
   * Constructs a new tone mapping effect.
   *
   * The additional parameters only affect the Reinhard2 operator.
   *
   * @param {Object} [options] - The options.
   * @param {BlendFunction} [options.blendFunction=BlendFunction.SRC] - The blend function of this effect.
   * @param {Boolean} [options.adaptive=false] - Deprecated. Use mode instead.
   * @param {ToneMappingMode} [options.mode=ToneMappingMode.AGX] - The tone mapping mode.
   * @param {Number} [options.resolution=256] - The resolution of the luminance texture. Must be a power of two.
   * @param {Number} [options.maxLuminance=4.0] - Deprecated. Same as whitePoint.
   * @param {Number} [options.whitePoint=4.0] - The white point.
   * @param {Number} [options.middleGrey=0.6] - The middle grey factor.
   * @param {Number} [options.minLuminance=0.01] - The minimum luminance. Prevents very high exposure in dark scenes.
   * @param {Number} [options.averageLuminance=1.0] - The average luminance. Used for the non-adaptive Reinhard operator.
   * @param {Number} [options.adaptationRate=1.0] - The luminance adaptation rate.
   */
  constructor({
    blendFunction = BlendFunction.SRC,
    adaptive = false,
    mode = adaptive ? ToneMappingMode.REINHARD2_ADAPTIVE : ToneMappingMode.AGX,
    resolution = 256,
    maxLuminance = 4,
    whitePoint = maxLuminance,
    middleGrey = 0.6,
    minLuminance = 0.01,
    averageLuminance = 1,
    adaptationRate = 1
  } = {}) {
    super("ToneMappingEffect", tone_mapping_default, {
      blendFunction,
      uniforms: /* @__PURE__ */ new Map([
        ["luminanceBuffer", new Uniform45(null)],
        ["maxLuminance", new Uniform45(maxLuminance)],
        // Unused
        ["whitePoint", new Uniform45(whitePoint)],
        ["middleGrey", new Uniform45(middleGrey)],
        ["averageLuminance", new Uniform45(averageLuminance)]
      ])
    });
    this.renderTargetLuminance = new WebGLRenderTarget19(1, 1, {
      minFilter: LinearMipmapLinearFilter,
      depthBuffer: false
    });
    this.renderTargetLuminance.texture.generateMipmaps = true;
    this.renderTargetLuminance.texture.name = "Luminance";
    this.luminancePass = new LuminancePass({
      renderTarget: this.renderTargetLuminance
    });
    this.adaptiveLuminancePass = new AdaptiveLuminancePass(this.luminancePass.texture, {
      minLuminance,
      adaptationRate
    });
    this.uniforms.get("luminanceBuffer").value = this.adaptiveLuminancePass.texture;
    this.resolution = resolution;
    this.mode = mode;
  }
  /**
   * The tone mapping mode.
   *
   * @type {ToneMappingMode}
   */
  get mode() {
    return Number(this.defines.get("TONE_MAPPING_MODE"));
  }
  set mode(value) {
    if (this.mode === value) {
      return;
    }
    const revision = REVISION3.replace(/\D+/g, "");
    const cineonToneMapping = revision >= 168 ? "CineonToneMapping(texel)" : "OptimizedCineonToneMapping(texel)";
    this.defines.clear();
    this.defines.set("TONE_MAPPING_MODE", value.toFixed(0));
    switch (value) {
      case ToneMappingMode.LINEAR:
        this.defines.set("toneMapping(texel)", "LinearToneMapping(texel)");
        break;
      case ToneMappingMode.REINHARD:
        this.defines.set("toneMapping(texel)", "ReinhardToneMapping(texel)");
        break;
      case ToneMappingMode.CINEON:
      case ToneMappingMode.OPTIMIZED_CINEON:
        this.defines.set("toneMapping(texel)", cineonToneMapping);
        break;
      case ToneMappingMode.ACES_FILMIC:
        this.defines.set("toneMapping(texel)", "ACESFilmicToneMapping(texel)");
        break;
      case ToneMappingMode.AGX:
        this.defines.set("toneMapping(texel)", "AgXToneMapping(texel)");
        break;
      case ToneMappingMode.NEUTRAL:
        this.defines.set("toneMapping(texel)", "NeutralToneMapping(texel)");
        break;
      default:
        this.defines.set("toneMapping(texel)", "texel");
        break;
    }
    this.adaptiveLuminancePass.enabled = value === ToneMappingMode.REINHARD2_ADAPTIVE;
    this.setChanged();
  }
  /**
   * Returns the current tone mapping mode.
   *
   * @deprecated Use mode instead.
   * @return {ToneMappingMode} The tone mapping mode.
   */
  getMode() {
    return this.mode;
  }
  /**
   * Sets the tone mapping mode.
   *
   * @deprecated Use mode instead.
   * @param {ToneMappingMode} value - The tone mapping mode.
   */
  setMode(value) {
    this.mode = value;
  }
  /**
   * The white point. Default is `4.0`.
   *
   * Only applies to Reinhard2 (Modified & Adaptive).
   *
   * @type {Number}
   */
  get whitePoint() {
    return this.uniforms.get("whitePoint").value;
  }
  set whitePoint(value) {
    this.uniforms.get("whitePoint").value = value;
  }
  /**
   * The middle grey factor. Default is `0.6`.
   *
   * Only applies to Reinhard2 (Modified & Adaptive).
   *
   * @type {Number}
   */
  get middleGrey() {
    return this.uniforms.get("middleGrey").value;
  }
  set middleGrey(value) {
    this.uniforms.get("middleGrey").value = value;
  }
  /**
   * The average luminance.
   *
   * Only applies to Reinhard2 (Modified).
   *
   * @type {Number}
   */
  get averageLuminance() {
    return this.uniforms.get("averageLuminance").value;
  }
  set averageLuminance(value) {
    this.uniforms.get("averageLuminance").value = value;
  }
  /**
   * The adaptive luminance material.
   *
   * @type {AdaptiveLuminanceMaterial}
   */
  get adaptiveLuminanceMaterial() {
    return this.adaptiveLuminancePass.fullscreenMaterial;
  }
  /**
   * Returns the adaptive luminance material.
   *
   * @deprecated Use adaptiveLuminanceMaterial instead.
   * @return {AdaptiveLuminanceMaterial} The material.
   */
  getAdaptiveLuminanceMaterial() {
    return this.adaptiveLuminanceMaterial;
  }
  /**
   * The resolution of the luminance texture. Must be a power of two.
   *
   * @type {Number}
   */
  get resolution() {
    return this.luminancePass.resolution.width;
  }
  set resolution(value) {
    const exponent = Math.max(0, Math.ceil(Math.log2(value)));
    const size = Math.pow(2, exponent);
    this.luminancePass.resolution.setPreferredSize(size, size);
    this.adaptiveLuminanceMaterial.mipLevel1x1 = exponent;
  }
  /**
   * Returns the resolution of the luminance texture.
   *
   * @deprecated Use resolution instead.
   * @return {Number} The resolution.
   */
  getResolution() {
    return this.resolution;
  }
  /**
   * Sets the resolution of the luminance texture. Must be a power of two.
   *
   * @deprecated Use resolution instead.
   * @param {Number} value - The resolution.
   */
  setResolution(value) {
    this.resolution = value;
  }
  /**
   * Indicates whether this pass uses adaptive luminance.
   *
   * @type {Boolean}
   * @deprecated Use mode instead.
   */
  get adaptive() {
    return this.mode === ToneMappingMode.REINHARD2_ADAPTIVE;
  }
  set adaptive(value) {
    this.mode = value ? ToneMappingMode.REINHARD2_ADAPTIVE : ToneMappingMode.REINHARD2;
  }
  /**
   * The luminance adaptation rate.
   *
   * @type {Number}
   * @deprecated Use adaptiveLuminanceMaterial.adaptationRate instead.
   */
  get adaptationRate() {
    return this.adaptiveLuminanceMaterial.adaptationRate;
  }
  set adaptationRate(value) {
    this.adaptiveLuminanceMaterial.adaptationRate = value;
  }
  /**
   * @type {Number}
   * @deprecated
   */
  get distinction() {
    console.warn(this.name, "distinction was removed.");
    return 1;
  }
  set distinction(value) {
    console.warn(this.name, "distinction was removed.");
  }
  /**
   * Updates this effect.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   */
  update(renderer, inputBuffer, deltaTime) {
    if (this.adaptiveLuminancePass.enabled) {
      this.luminancePass.render(renderer, inputBuffer);
      this.adaptiveLuminancePass.render(renderer, null, null, deltaTime);
    }
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    this.adaptiveLuminancePass.initialize(renderer, alpha, frameBufferType);
  }
};
var effect_default = "#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#define packFloatToRGBA(v) packDepthToRGBA(v)\n#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)\n#ifdef FRAMEBUFFER_PRECISION_HIGH\nuniform mediump sampler2D inputBuffer;\n#else\nuniform lowp sampler2D inputBuffer;\n#endif\n#if DEPTH_PACKING == 3201\nuniform lowp sampler2D depthBuffer;\n#elif defined(GL_FRAGMENT_PRECISION_HIGH)\nuniform highp sampler2D depthBuffer;\n#else\nuniform mediump sampler2D depthBuffer;\n#endif\nuniform vec2 resolution;uniform vec2 texelSize;uniform float cameraNear;uniform float cameraFar;uniform float aspect;uniform float time;varying vec2 vUv;vec4 sRGBToLinear(const in vec4 value){return vec4(mix(pow(value.rgb*0.9478672986+vec3(0.0521327014),vec3(2.4)),value.rgb*0.0773993808,vec3(lessThanEqual(value.rgb,vec3(0.04045)))),value.a);}float readDepth(const in vec2 uv){\n#if DEPTH_PACKING == 3201\nreturn unpackRGBAToDepth(texture2D(depthBuffer,uv));\n#else\nreturn texture2D(depthBuffer,uv).r;\n#endif\n}float getViewZ(const in float depth){\n#ifdef PERSPECTIVE_CAMERA\nreturn perspectiveDepthToViewZ(depth,cameraNear,cameraFar);\n#else\nreturn orthographicDepthToViewZ(depth,cameraNear,cameraFar);\n#endif\n}vec3 RGBToHCV(const in vec3 RGB){vec4 P=mix(vec4(RGB.bg,-1.0,2.0/3.0),vec4(RGB.gb,0.0,-1.0/3.0),step(RGB.b,RGB.g));vec4 Q=mix(vec4(P.xyw,RGB.r),vec4(RGB.r,P.yzx),step(P.x,RGB.r));float C=Q.x-min(Q.w,Q.y);float H=abs((Q.w-Q.y)/(6.0*C+EPSILON)+Q.z);return vec3(H,C,Q.x);}vec3 RGBToHSL(const in vec3 RGB){vec3 HCV=RGBToHCV(RGB);float L=HCV.z-HCV.y*0.5;float S=HCV.y/(1.0-abs(L*2.0-1.0)+EPSILON);return vec3(HCV.x,S,L);}vec3 HueToRGB(const in float H){float R=abs(H*6.0-3.0)-1.0;float G=2.0-abs(H*6.0-2.0);float B=2.0-abs(H*6.0-4.0);return clamp(vec3(R,G,B),0.0,1.0);}vec3 HSLToRGB(const in vec3 HSL){vec3 RGB=HueToRGB(HSL.x);float C=(1.0-abs(2.0*HSL.z-1.0))*HSL.y;return(RGB-0.5)*C+HSL.z;}FRAGMENT_HEAD void main(){FRAGMENT_MAIN_UV vec4 color0=texture2D(inputBuffer,UV);vec4 color1=vec4(0.0);FRAGMENT_MAIN_IMAGE color0.a=clamp(color0.a,0.0,1.0);gl_FragColor=color0;\n#ifdef ENCODE_OUTPUT\n#include <colorspace_fragment>\n#endif\n#include <dithering_fragment>\n}";
var effect_default2 = "uniform vec2 resolution;uniform vec2 texelSize;uniform float cameraNear;uniform float cameraFar;uniform float aspect;uniform float time;varying vec2 vUv;VERTEX_HEAD void main(){vUv=position.xy*0.5+0.5;VERTEX_MAIN_SUPPORT gl_Position=vec4(position.xy,1.0,1.0);}";
var EffectMaterial = class extends ShaderMaterial21 {
  /**
   * Constructs a new effect material.
   *
   * @param {Map<String, String>} [shaderParts] - Deprecated. Use setShaderData instead.
   * @param {Map<String, String>} [defines] - Deprecated. Use setShaderData instead.
   * @param {Map<String, Uniform>} [uniforms] - Deprecated. Use setShaderData instead.
   * @param {Camera} [camera] - A camera.
   * @param {Boolean} [dithering=false] - Deprecated.
   */
  constructor(shaderParts, defines, uniforms, camera, dithering = false) {
    super({
      name: "EffectMaterial",
      defines: {
        THREE_REVISION: REVISION4.replace(/\D+/g, ""),
        DEPTH_PACKING: "0",
        ENCODE_OUTPUT: "1"
      },
      uniforms: {
        inputBuffer: new Uniform49(null),
        depthBuffer: new Uniform49(null),
        resolution: new Uniform49(new Vector226()),
        texelSize: new Uniform49(new Vector226()),
        cameraNear: new Uniform49(0.3),
        cameraFar: new Uniform49(1e3),
        aspect: new Uniform49(1),
        time: new Uniform49(0)
      },
      blending: NoBlending20,
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      dithering
    });
    if (shaderParts) {
      this.setShaderParts(shaderParts);
    }
    if (defines) {
      this.setDefines(defines);
    }
    if (uniforms) {
      this.setUniforms(uniforms);
    }
    this.copyCameraSettings(camera);
  }
  /**
   * The input buffer.
   *
   * @type {Texture}
   */
  set inputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * Sets the input buffer.
   *
   * @deprecated Use inputBuffer instead.
   * @param {Texture} value - The input buffer.
   */
  setInputBuffer(value) {
    this.uniforms.inputBuffer.value = value;
  }
  /**
   * The depth buffer.
   *
   * @type {Texture}
   */
  get depthBuffer() {
    return this.uniforms.depthBuffer.value;
  }
  set depthBuffer(value) {
    this.uniforms.depthBuffer.value = value;
  }
  /**
   * The depth packing strategy.
   *
   * @type {DepthPackingStrategies}
   */
  get depthPacking() {
    return Number(this.defines.DEPTH_PACKING);
  }
  set depthPacking(value) {
    this.defines.DEPTH_PACKING = value.toFixed(0);
    this.needsUpdate = true;
  }
  /**
   * Sets the depth buffer.
   *
   * @deprecated Use depthBuffer and depthPacking instead.
   * @param {Texture} buffer - The depth texture.
   * @param {DepthPackingStrategies} [depthPacking=BasicDepthPacking] - The depth packing strategy.
   */
  setDepthBuffer(buffer, depthPacking = BasicDepthPacking15) {
    this.depthBuffer = buffer;
    this.depthPacking = depthPacking;
  }
  /**
   * Sets the shader data.
   *
   * @param {EffectShaderData} data - The shader data.
   * @return {EffectMaterial} This material.
   */
  setShaderData(data) {
    this.setShaderParts(data.shaderParts);
    this.setDefines(data.defines);
    this.setUniforms(data.uniforms);
    this.setExtensions(data.extensions);
  }
  /**
   * Sets the shader parts.
   *
   * @deprecated Use setShaderData instead.
   * @param {Map<String, String>} shaderParts - A collection of shader snippets. See {@link EffectShaderSection}.
   * @return {EffectMaterial} This material.
   */
  setShaderParts(shaderParts) {
    this.fragmentShader = effect_default.replace(EffectShaderSection.FRAGMENT_HEAD, shaderParts.get(EffectShaderSection.FRAGMENT_HEAD) || "").replace(EffectShaderSection.FRAGMENT_MAIN_UV, shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_UV) || "").replace(EffectShaderSection.FRAGMENT_MAIN_IMAGE, shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_IMAGE) || "");
    this.vertexShader = effect_default2.replace(EffectShaderSection.VERTEX_HEAD, shaderParts.get(EffectShaderSection.VERTEX_HEAD) || "").replace(EffectShaderSection.VERTEX_MAIN_SUPPORT, shaderParts.get(EffectShaderSection.VERTEX_MAIN_SUPPORT) || "");
    this.needsUpdate = true;
    return this;
  }
  /**
   * Sets the shader macros.
   *
   * @deprecated Use setShaderData instead.
   * @param {Map<String, String>} defines - A collection of preprocessor macro definitions.
   * @return {EffectMaterial} This material.
   */
  setDefines(defines) {
    for (const entry of defines.entries()) {
      this.defines[entry[0]] = entry[1];
    }
    this.needsUpdate = true;
    return this;
  }
  /**
   * Sets the shader uniforms.
   *
   * @deprecated Use setShaderData instead.
   * @param {Map<String, Uniform>} uniforms - A collection of uniforms.
   * @return {EffectMaterial} This material.
   */
  setUniforms(uniforms) {
    for (const entry of uniforms.entries()) {
      this.uniforms[entry[0]] = entry[1];
    }
    return this;
  }
  /**
   * Sets the required shader extensions.
   *
   * @deprecated Use setShaderData instead.
   * @param {Set<WebGLExtension>} extensions - A collection of extensions.
   * @return {EffectMaterial} This material.
   */
  setExtensions(extensions) {
    this.extensions = {};
    for (const extension of extensions) {
      this.extensions[extension] = true;
    }
    return this;
  }
  /**
   * Indicates whether output encoding is enabled.
   *
   * @type {Boolean}
   */
  get encodeOutput() {
    return this.defines.ENCODE_OUTPUT !== void 0;
  }
  set encodeOutput(value) {
    if (this.encodeOutput !== value) {
      if (value) {
        this.defines.ENCODE_OUTPUT = "1";
      } else {
        delete this.defines.ENCODE_OUTPUT;
      }
      this.needsUpdate = true;
    }
  }
  /**
   * Indicates whether output encoding is enabled.
   *
   * @deprecated Use encodeOutput instead.
   * @return {Boolean} Whether output encoding is enabled.
   */
  isOutputEncodingEnabled(value) {
    return this.encodeOutput;
  }
  /**
   * Enables or disables output encoding.
   *
   * @deprecated Use encodeOutput instead.
   * @param {Boolean} value - Whether output encoding should be enabled.
   */
  setOutputEncodingEnabled(value) {
    this.encodeOutput = value;
  }
  /**
   * The time in seconds.
   *
   * @type {Number}
   */
  get time() {
    return this.uniforms.time.value;
  }
  set time(value) {
    this.uniforms.time.value = value;
  }
  /**
   * Sets the delta time.
   *
   * @deprecated Use time instead.
   * @param {Number} value - The delta time in seconds.
   */
  setDeltaTime(value) {
    this.uniforms.time.value += value;
  }
  /**
   * Copies the settings of the given camera.
   *
   * @deprecated Use copyCameraSettings instead.
   * @param {Camera} camera - A camera.
   */
  adoptCameraSettings(camera) {
    this.copyCameraSettings(camera);
  }
  /**
   * Copies the settings of the given camera.
   *
   * @param {Camera} camera - A camera.
   */
  copyCameraSettings(camera) {
    if (camera) {
      this.uniforms.cameraNear.value = camera.near;
      this.uniforms.cameraFar.value = camera.far;
      if (camera instanceof PerspectiveCamera6) {
        this.defines.PERSPECTIVE_CAMERA = "1";
      } else {
        delete this.defines.PERSPECTIVE_CAMERA;
      }
      this.needsUpdate = true;
    }
  }
  /**
   * Sets the resolution.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    const uniforms = this.uniforms;
    uniforms.resolution.value.set(width, height);
    uniforms.texelSize.value.set(1 / width, 1 / height);
    uniforms.aspect.value = width / height;
  }
  /**
   * An enumeration of shader code placeholders.
   *
   * @deprecated Use EffectShaderSection instead.
   * @type {Object}
   */
  static get Section() {
    return EffectShaderSection;
  }
};
var threeRevision = Number(REVISION5.replace(/\D+/g, ""));
var unpackDownscale = 255 / 256;
var unpackFactorsLegacy = new Float32Array([
  unpackDownscale / 256 ** 3,
  unpackDownscale / 256 ** 2,
  unpackDownscale / 256,
  unpackDownscale
]);
var unpackFactors = new Float32Array([
  unpackDownscale,
  unpackDownscale / 256,
  unpackDownscale / 256 ** 2,
  1 / 256 ** 3
]);
function prefixSubstrings(prefix, substrings, strings) {
  for (const substring of substrings) {
    const prefixed = "$1" + prefix + substring.charAt(0).toUpperCase() + substring.slice(1);
    const regExp = new RegExp("([^\\.])(\\b" + substring + "\\b)", "g");
    for (const entry of strings.entries()) {
      if (entry[1] !== null) {
        strings.set(entry[0], entry[1].replace(regExp, prefixed));
      }
    }
  }
}
function integrateEffect(prefix, effect, data) {
  let fragmentShader = effect.getFragmentShader();
  let vertexShader = effect.getVertexShader();
  const mainImageExists = fragmentShader !== void 0 && /mainImage/.test(fragmentShader);
  const mainUvExists = fragmentShader !== void 0 && /mainUv/.test(fragmentShader);
  data.attributes |= effect.getAttributes();
  if (fragmentShader === void 0) {
    throw new Error(`Missing fragment shader (${effect.name})`);
  } else if (mainUvExists && (data.attributes & EffectAttribute.CONVOLUTION) !== 0) {
    throw new Error(`Effects that transform UVs are incompatible with convolution effects (${effect.name})`);
  } else if (!mainImageExists && !mainUvExists) {
    throw new Error(`Could not find mainImage or mainUv function (${effect.name})`);
  } else {
    const functionRegExp = /\w+\s+(\w+)\([\w\s,]*\)\s*{/g;
    const shaderParts = data.shaderParts;
    let fragmentHead = shaderParts.get(EffectShaderSection.FRAGMENT_HEAD) || "";
    let fragmentMainUv = shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_UV) || "";
    let fragmentMainImage = shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_IMAGE) || "";
    let vertexHead = shaderParts.get(EffectShaderSection.VERTEX_HEAD) || "";
    let vertexMainSupport = shaderParts.get(EffectShaderSection.VERTEX_MAIN_SUPPORT) || "";
    const varyings = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    if (mainUvExists) {
      fragmentMainUv += `	${prefix}MainUv(UV);
`;
      data.uvTransformation = true;
    }
    if (vertexShader !== null && /mainSupport/.test(vertexShader)) {
      const needsUv = /mainSupport *\([\w\s]*?uv\s*?\)/.test(vertexShader);
      vertexMainSupport += `	${prefix}MainSupport(`;
      vertexMainSupport += needsUv ? "vUv);\n" : ");\n";
      for (const m2 of vertexShader.matchAll(/(?:varying\s+\w+\s+([\S\s]*?);)/g)) {
        for (const n of m2[1].split(/\s*,\s*/)) {
          data.varyings.add(n);
          varyings.add(n);
          names.add(n);
        }
      }
      for (const m2 of vertexShader.matchAll(functionRegExp)) {
        names.add(m2[1]);
      }
    }
    for (const m2 of fragmentShader.matchAll(functionRegExp)) {
      names.add(m2[1]);
    }
    for (const d of effect.defines.keys()) {
      names.add(d.replace(/\([\w\s,]*\)/g, ""));
    }
    for (const u of effect.uniforms.keys()) {
      names.add(u);
    }
    names.delete("while");
    names.delete("for");
    names.delete("if");
    effect.uniforms.forEach((val, key) => data.uniforms.set(prefix + key.charAt(0).toUpperCase() + key.slice(1), val));
    effect.defines.forEach((val, key) => data.defines.set(prefix + key.charAt(0).toUpperCase() + key.slice(1), val));
    const shaders = /* @__PURE__ */ new Map([["fragment", fragmentShader], ["vertex", vertexShader]]);
    prefixSubstrings(prefix, names, data.defines);
    prefixSubstrings(prefix, names, shaders);
    fragmentShader = shaders.get("fragment");
    vertexShader = shaders.get("vertex");
    const blendMode = effect.blendMode;
    data.blendModes.set(blendMode.blendFunction, blendMode);
    if (mainImageExists) {
      if (effect.inputColorSpace !== null && effect.inputColorSpace !== data.colorSpace) {
        fragmentMainImage += effect.inputColorSpace === SRGBColorSpace14 ? "color0 = sRGBTransferOETF(color0);\n	" : "color0 = sRGBToLinear(color0);\n	";
      }
      if (effect.outputColorSpace !== NoColorSpace2) {
        data.colorSpace = effect.outputColorSpace;
      } else if (effect.inputColorSpace !== null) {
        data.colorSpace = effect.inputColorSpace;
      }
      const depthParamRegExp = /MainImage *\([\w\s,]*?depth[\w\s,]*?\)/;
      fragmentMainImage += `${prefix}MainImage(color0, UV, `;
      if ((data.attributes & EffectAttribute.DEPTH) !== 0 && depthParamRegExp.test(fragmentShader)) {
        fragmentMainImage += "depth, ";
        data.readDepth = true;
      }
      fragmentMainImage += "color1);\n	";
      const blendOpacity = prefix + "BlendOpacity";
      data.uniforms.set(blendOpacity, blendMode.opacity);
      fragmentMainImage += `color0 = blend${blendMode.blendFunction}(color0, color1, ${blendOpacity});

	`;
      fragmentHead += `uniform float ${blendOpacity};

`;
    }
    fragmentHead += fragmentShader + "\n";
    if (vertexShader !== null) {
      vertexHead += vertexShader + "\n";
    }
    shaderParts.set(EffectShaderSection.FRAGMENT_HEAD, fragmentHead);
    shaderParts.set(EffectShaderSection.FRAGMENT_MAIN_UV, fragmentMainUv);
    shaderParts.set(EffectShaderSection.FRAGMENT_MAIN_IMAGE, fragmentMainImage);
    shaderParts.set(EffectShaderSection.VERTEX_HEAD, vertexHead);
    shaderParts.set(EffectShaderSection.VERTEX_MAIN_SUPPORT, vertexMainSupport);
    if (effect.extensions !== null) {
      for (const extension of effect.extensions) {
        data.extensions.add(extension);
      }
    }
  }
}
var EffectPass = class extends Pass {
  /**
   * Constructs a new effect pass.
   *
   * @param {Camera} camera - The main camera.
   * @param {...Effect} effects - The effects that will be rendered by this pass.
   */
  constructor(camera, ...effects) {
    super("EffectPass");
    this.fullscreenMaterial = new EffectMaterial(null, null, null, camera);
    this.listener = (event) => this.handleEvent(event);
    this.effects = [];
    this.setEffects(effects);
    this.skipRendering = false;
    this.minTime = 1;
    this.maxTime = Number.POSITIVE_INFINITY;
    this.timeScale = 1;
  }
  set mainScene(value) {
    for (const effect of this.effects) {
      effect.mainScene = value;
    }
  }
  set mainCamera(value) {
    this.fullscreenMaterial.copyCameraSettings(value);
    for (const effect of this.effects) {
      effect.mainCamera = value;
    }
  }
  /**
   * Indicates whether this pass encodes its output when rendering to screen.
   *
   * @type {Boolean}
   * @deprecated Use fullscreenMaterial.encodeOutput instead.
   */
  get encodeOutput() {
    return this.fullscreenMaterial.encodeOutput;
  }
  set encodeOutput(value) {
    this.fullscreenMaterial.encodeOutput = value;
  }
  /**
   * Indicates whether dithering is enabled.
   *
   * @type {Boolean}
   */
  get dithering() {
    return this.fullscreenMaterial.dithering;
  }
  set dithering(value) {
    const material = this.fullscreenMaterial;
    material.dithering = value;
    material.needsUpdate = true;
  }
  /**
   * Sets the effects.
   *
   * @param {Effect[]} effects - The effects.
   * @protected
   */
  setEffects(effects) {
    for (const effect of this.effects) {
      effect.removeEventListener("change", this.listener);
    }
    this.effects = effects.sort((a, b) => b.attributes - a.attributes);
    for (const effect of this.effects) {
      effect.addEventListener("change", this.listener);
    }
  }
  /**
   * Updates the compound shader material.
   *
   * @protected
   */
  updateMaterial() {
    const data = new EffectShaderData();
    let id = 0;
    for (const effect of this.effects) {
      if (effect.blendMode.blendFunction === BlendFunction.DST) {
        data.attributes |= effect.getAttributes() & EffectAttribute.DEPTH;
      } else if ((data.attributes & effect.getAttributes() & EffectAttribute.CONVOLUTION) !== 0) {
        throw new Error(`Convolution effects cannot be merged (${effect.name})`);
      } else {
        integrateEffect("e" + id++, effect, data);
      }
    }
    let fragmentHead = data.shaderParts.get(EffectShaderSection.FRAGMENT_HEAD);
    let fragmentMainImage = data.shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_IMAGE);
    let fragmentMainUv = data.shaderParts.get(EffectShaderSection.FRAGMENT_MAIN_UV);
    const blendRegExp = /\bblend\b/g;
    for (const blendMode of data.blendModes.values()) {
      fragmentHead += blendMode.getShaderCode().replace(blendRegExp, `blend${blendMode.blendFunction}`) + "\n";
    }
    if ((data.attributes & EffectAttribute.DEPTH) !== 0) {
      if (data.readDepth) {
        fragmentMainImage = "float depth = readDepth(UV);\n\n	" + fragmentMainImage;
      }
      this.needsDepthTexture = this.getDepthTexture() === null;
    } else {
      this.needsDepthTexture = false;
    }
    if (data.colorSpace === SRGBColorSpace14) {
      fragmentMainImage += "color0 = sRGBToLinear(color0);\n	";
    }
    if (data.uvTransformation) {
      fragmentMainUv = "vec2 transformedUv = vUv;\n" + fragmentMainUv;
      data.defines.set("UV", "transformedUv");
    } else {
      data.defines.set("UV", "vUv");
    }
    data.shaderParts.set(EffectShaderSection.FRAGMENT_HEAD, fragmentHead);
    data.shaderParts.set(EffectShaderSection.FRAGMENT_MAIN_IMAGE, fragmentMainImage);
    data.shaderParts.set(EffectShaderSection.FRAGMENT_MAIN_UV, fragmentMainUv);
    for (const [key, value] of data.shaderParts) {
      if (value !== null) {
        data.shaderParts.set(key, value.trim().replace(/^#/, "\n#"));
      }
    }
    this.skipRendering = id === 0;
    this.needsSwap = !this.skipRendering;
    this.fullscreenMaterial.setShaderData(data);
  }
  /**
   * Rebuilds the shader material.
   */
  recompile() {
    this.updateMaterial();
  }
  /**
   * Returns the current depth texture.
   *
   * @return {Texture} The current depth texture, or null if there is none.
   */
  getDepthTexture() {
    return this.fullscreenMaterial.depthBuffer;
  }
  /**
   * Sets the depth texture.
   *
   * @param {Texture} depthTexture - A depth texture.
   * @param {DepthPackingStrategies} [depthPacking=BasicDepthPacking] - The depth packing.
   */
  setDepthTexture(depthTexture, depthPacking = BasicDepthPacking19) {
    this.fullscreenMaterial.depthBuffer = depthTexture;
    this.fullscreenMaterial.depthPacking = depthPacking;
    for (const effect of this.effects) {
      effect.setDepthTexture(depthTexture, depthPacking);
    }
  }
  /**
   * Renders the effect.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
   * @param {WebGLRenderTarget} outputBuffer - A frame buffer that serves as the output render target unless this pass renders to screen.
   * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
   * @param {Boolean} [stencilTest] - Indicates whether a stencil mask is active.
   */
  render(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) {
    for (const effect of this.effects) {
      effect.update(renderer, inputBuffer, deltaTime);
    }
    if (!this.skipRendering || this.renderToScreen) {
      const material = this.fullscreenMaterial;
      material.inputBuffer = inputBuffer.texture;
      material.time += deltaTime * this.timeScale;
      renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
      renderer.render(this.scene, this.camera);
    }
  }
  /**
   * Updates the size of this pass.
   *
   * @param {Number} width - The width.
   * @param {Number} height - The height.
   */
  setSize(width, height) {
    this.fullscreenMaterial.setSize(width, height);
    for (const effect of this.effects) {
      effect.setSize(width, height);
    }
  }
  /**
   * Performs initialization tasks.
   *
   * @param {WebGLRenderer} renderer - The renderer.
   * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
   * @param {Number} frameBufferType - The type of the main frame buffers.
   */
  initialize(renderer, alpha, frameBufferType) {
    this.renderer = renderer;
    for (const effect of this.effects) {
      effect.initialize(renderer, alpha, frameBufferType);
    }
    this.updateMaterial();
    if (frameBufferType !== void 0 && frameBufferType !== UnsignedByteType15) {
      this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH = "1";
    }
  }
  /**
   * Deletes disposable objects.
   */
  dispose() {
    super.dispose();
    for (const effect of this.effects) {
      effect.removeEventListener("change", this.listener);
      effect.dispose();
    }
  }
  /**
   * Handles events.
   *
   * @param {Event} event - An event.
   */
  handleEvent(event) {
    switch (event.type) {
      case "change":
        this.recompile();
        break;
    }
  }
};
var P = [
  new Float32Array(3),
  new Float32Array(3)
];
var C = [
  new Float32Array(3),
  new Float32Array(3),
  new Float32Array(3),
  new Float32Array(3)
];
var T = [
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([1, 0, 0]),
    new Float32Array([1, 1, 0]),
    new Float32Array([1, 1, 1])
  ],
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([1, 0, 0]),
    new Float32Array([1, 0, 1]),
    new Float32Array([1, 1, 1])
  ],
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([0, 0, 1]),
    new Float32Array([1, 0, 1]),
    new Float32Array([1, 1, 1])
  ],
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([0, 1, 0]),
    new Float32Array([1, 1, 0]),
    new Float32Array([1, 1, 1])
  ],
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([0, 1, 0]),
    new Float32Array([0, 1, 1]),
    new Float32Array([1, 1, 1])
  ],
  [
    new Float32Array([0, 0, 0]),
    new Float32Array([0, 0, 1]),
    new Float32Array([0, 1, 1]),
    new Float32Array([1, 1, 1])
  ]
];
var area = [
  new Float32Array(2),
  new Float32Array(2)
];
var orthogonalSubsamplingOffsets = new Float32Array([
  0,
  -0.25,
  0.25,
  -0.125,
  0.125,
  -0.375,
  0.375
]);
var diagonalSubsamplingOffsets = [
  new Float32Array([0, 0]),
  new Float32Array([0.25, -0.25]),
  new Float32Array([-0.25, 0.25]),
  new Float32Array([0.125, -0.125]),
  new Float32Array([-0.125, 0.125])
];
var orthogonalEdges = [
  new Uint8Array([0, 0]),
  new Uint8Array([3, 0]),
  new Uint8Array([0, 3]),
  new Uint8Array([3, 3]),
  new Uint8Array([1, 0]),
  new Uint8Array([4, 0]),
  new Uint8Array([1, 3]),
  new Uint8Array([4, 3]),
  new Uint8Array([0, 1]),
  new Uint8Array([3, 1]),
  new Uint8Array([0, 4]),
  new Uint8Array([3, 4]),
  new Uint8Array([1, 1]),
  new Uint8Array([4, 1]),
  new Uint8Array([1, 4]),
  new Uint8Array([4, 4])
];
var diagonalEdges = [
  new Uint8Array([0, 0]),
  new Uint8Array([1, 0]),
  new Uint8Array([0, 2]),
  new Uint8Array([1, 2]),
  new Uint8Array([2, 0]),
  new Uint8Array([3, 0]),
  new Uint8Array([2, 2]),
  new Uint8Array([3, 2]),
  new Uint8Array([0, 1]),
  new Uint8Array([1, 1]),
  new Uint8Array([0, 3]),
  new Uint8Array([1, 3]),
  new Uint8Array([2, 1]),
  new Uint8Array([3, 1]),
  new Uint8Array([2, 3]),
  new Uint8Array([3, 3])
];
var edges = /* @__PURE__ */ new Map([
  [bilinear(0, 0, 0, 0), new Float32Array([0, 0, 0, 0])],
  [bilinear(0, 0, 0, 1), new Float32Array([0, 0, 0, 1])],
  [bilinear(0, 0, 1, 0), new Float32Array([0, 0, 1, 0])],
  [bilinear(0, 0, 1, 1), new Float32Array([0, 0, 1, 1])],
  [bilinear(0, 1, 0, 0), new Float32Array([0, 1, 0, 0])],
  [bilinear(0, 1, 0, 1), new Float32Array([0, 1, 0, 1])],
  [bilinear(0, 1, 1, 0), new Float32Array([0, 1, 1, 0])],
  [bilinear(0, 1, 1, 1), new Float32Array([0, 1, 1, 1])],
  [bilinear(1, 0, 0, 0), new Float32Array([1, 0, 0, 0])],
  [bilinear(1, 0, 0, 1), new Float32Array([1, 0, 0, 1])],
  [bilinear(1, 0, 1, 0), new Float32Array([1, 0, 1, 0])],
  [bilinear(1, 0, 1, 1), new Float32Array([1, 0, 1, 1])],
  [bilinear(1, 1, 0, 0), new Float32Array([1, 1, 0, 0])],
  [bilinear(1, 1, 0, 1), new Float32Array([1, 1, 0, 1])],
  [bilinear(1, 1, 1, 0), new Float32Array([1, 1, 1, 0])],
  [bilinear(1, 1, 1, 1), new Float32Array([1, 1, 1, 1])]
]);
function lerp2(a, b, p) {
  return a + (b - a) * p;
}
function bilinear(e0, e1, e2, e3) {
  const a = lerp2(e0, e1, 1 - 0.25);
  const b = lerp2(e2, e3, 1 - 0.25);
  return lerp2(a, b, 1 - 0.125);
}

// src/world.ts
import * as THREE7 from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// src/shim/remotion.ts
var base = "./";
var setStaticBase = (b) => {
  base = b.endsWith("/") ? b : b + "/";
};
var staticFile = (p) => base + p;

// src/build.ts
import * as THREE3 from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// src/story.ts
var FPS = 30;
var TOTAL = 2025;
var D0 = 6;
var HALF = 27;
var FILES = [-1.65, -0.55, 0.55, 1.65];
var ROW_GAP = 1.3;
var COUNT = 74;
var PARK = [70, D0, -75];
var clamp01 = (x) => Math.max(0, Math.min(1, x));
var smooth = (x) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
var easeOut = (u) => 1 - (1 - clamp01(u)) ** 4;
var lin = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
var front = (tau) => 26 - 1.6 * (tau - 4.4);
var marchPhase = (tau) => (tau % 1 + 1) % 1;
var SNAP = 34.62;
var DROP0 = 36.35;
var DROP1 = 36.95;
var amp = (tau) => lin([[14.85, 0], [17.8, 0.07], [21.4, 0.13], [27.4, 0.26], [33, 0.46], [SNAP, 0.55], [SNAP + 0.35, 0]], tau);
var stomp = (tau) => lin([[21.4, 1], [27.4, 1.35], [33, 1.5]], tau);
var shapeZ = (z) => Math.abs(z) < HALF ? Math.cos(Math.PI * z / (2 * HALF)) : 0;
var dropW = (z) => smooth((20 - z) / 26);
var dropU = (tau) => tau < DROP0 ? 0 : Math.min(1, ((tau - DROP0) / (DROP1 - DROP0)) ** 2);
var DROP_H = 6.6;
var deckY = (z, b) => D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z);
var SHOTS = [
  { id: 1, a: 0, b: 130, light: "day", crowd: "march", tau: (t) => 29.5 + t },
  { id: 2, a: 130, b: 283, light: "day", crowd: "march", tau: (t) => t, towns: true },
  { id: 3, a: 283, b: 444, light: "day", crowd: "march", tau: (t) => t },
  { id: 4, a: 444, b: 534, light: "day", crowd: "march", tau: (t) => t },
  { id: 5, a: 534, b: 643, light: "day", crowd: "march", tau: (t) => t },
  { id: 6, a: 643, b: 823, light: "day", crowd: "march", tau: (t) => t },
  { id: 7, a: 823, b: 987, light: "day", crowd: "march", tau: (t) => t },
  { id: 8, a: 987, b: 1134, light: "day", crowd: "fall", tau: (t) => t },
  { id: 9, a: 1134, b: 1212, light: "day", crowd: "water", tau: (t) => t },
  { id: 10, a: 1212, b: 1303, light: "day", crowd: "water", tau: (t) => t },
  { id: 11, a: 1303, b: 1411, light: "golden", crowd: "none", tau: (t) => t },
  { id: 12, a: 1411, b: 1620, light: "golden", crowd: "none", tau: (t) => t },
  { id: 13, a: 1620, b: 1735, light: "golden", crowd: "march", tau: (t) => t - 31 },
  { id: 14, a: 1735, b: 1863, light: "day", crowd: "bank", tau: (t) => t },
  { id: 15, a: 1863, b: TOTAL, light: "day", crowd: "tourists", tau: (t) => t, towns: true }
];
var XFADE = { 9: 6, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8 };
var FLASH_AT = 130;
var shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
var layersAt = (f) => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
var bridgeState = (id, t) => {
  const s = SHOTS[id - 1];
  const tau = s.tau(t);
  if (id === 9 || id === 10 || id === 14) return { bounce: 0, drop: 1, snap: 1, collapsed: true };
  if (id === 11) return { bounce: 0.75 * Math.sin(2 * Math.PI * 0.7 * (t - 43.4)), drop: 0, snap: 0, collapsed: false };
  if (id === 12 || id === 15) return { bounce: 0, drop: 0, snap: 0, collapsed: false };
  const bounce = -amp(tau) * Math.cos(4 * Math.PI * marchPhase(tau));
  if (id === 8) return { bounce, drop: dropU(tau), snap: clamp01((tau - SNAP) / 0.7), collapsed: tau >= DROP1 };
  return { bounce, drop: 0, snap: 0, collapsed: false };
};
var glide = (u) => {
  const x = clamp01(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};
var mix = (a, b, k) => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k),
  look: a.look.map((v, i) => v + (b.look[i] - v) * k),
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k
});
var full = (c) => ({ fov: 40, roll: 0, ...c });
var run = (keys, f) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
var T2 = (f) => f / FPS;
var Fz = (id, f) => front(SHOTS[id - 1].tau(T2(f)));
var pushK = (f, f0, rate, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
var dolly = (pos, look, k, rest = {}) => ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
var zoom = (pos, look, fov, k, rest = {}) => ({ pos, look, fov: 360 / Math.PI * Math.atan(Math.tan(fov * Math.PI / 360) * k), ...rest });
var rolled = (s, roll) => (f) => ({ ...s(f), roll });
var ANCHOR = [-2.7, D0 + 0.62, -37];
var snapEnd = (snap) => {
  const u = easeOut(snap);
  return [ANCHOR[0] - 0.6 * u, ANCHOR[1] + 5.5 * u - 2 * u * u, ANCHOR[2] + 4.5 * u];
};
var S1a = (f) => {
  const F = Fz(1, f);
  return dolly([7.5, D0 + 2.6, F - 13], [0, D0 + 2.4, F + 5], pushK(f, 0, 25e-4), { fov: 44 });
};
var S1b = (f) => {
  const F = Fz(1, f);
  return dolly([1.4, D0 + 1.4, F - 7.2], [0, D0 + 1.7, F + 1.5], pushK(f, 30, 2e-3), { fov: 40, roll: -0.04 });
};
var S1c = (f) => {
  const F = Fz(1, f);
  return dolly([-0.9, D0 + 0.4, F - 4.2], [0, D0 + 0.55, F + 0.8], pushK(f, 72, 3e-3), { fov: 38, roll: 0.04 });
};
var S2a = (f) => zoom([17, 13, -52], [0, 9, 4], 44, pushK(f, 126, 2e-3));
var S2b = (f) => zoom([10, 10.5, -42], [0, 8, 8], 42, pushK(f, 181, 2e-3));
var S2c = (f) => zoom([5, 10, -31], [0, 8.6, 30], 40, pushK(f, 237, 15e-4, 6e-3, 35));
var S3a = (f) => {
  const F = Fz(3, f);
  return dolly([1.1, D0 + 1.45, F - 6.2], [0, D0 + 1.3, F + 0.6], pushK(f, 283, 25e-4));
};
var S3b = (f) => {
  const F = Fz(3, f);
  return dolly([0.5, D0 + 0.36, F - 3.5], [0, D0 + 0.3, F + 0.4], pushK(f, 333, 18e-4), { fov: 36 });
};
var S4a = (f) => {
  const F = Fz(4, f);
  return dolly([13, D0 + 2.4, F + 7], [0, D0 + 1.2, F + 7], pushK(f, 444, 2e-3));
};
var S4b = (f) => {
  const F = Fz(4, f);
  return dolly([9.5, D0 + 1.2, F + 5.5], [0, D0 + 0.95, F + 5.5], pushK(f, 497, 15e-4, 6e-3, 30), { fov: 38, roll: -0.035 });
};
var S5a = (f) => {
  const F = Fz(5, f);
  return dolly([0.3, D0 + 1.8, F - 4.7], [0, D0 + 1.55, F + 1.2], pushK(f, 534, 25e-4), { fov: 38 });
};
var S5b = (f) => {
  const F = Fz(5, f);
  return dolly([-0.5, D0 + 1.7, F - 3.5], [0, D0 + 1.6, F + 0.6], pushK(f, 576, 2e-3), { fov: 36, roll: 0.04 });
};
var S6a = (f) => {
  const F = Fz(6, f);
  return dolly([0.8, D0 + 1.95, F - 2.5], [0.55, D0 + 1.85, F], pushK(f, 643, 3e-3), { fov: 34 });
};
var S6b = (f) => {
  const F = Fz(6, f);
  return dolly([5.5, D0 + 5.5, F - 9], [0, D0 + 0.8, F + 7], pushK(f, 717, 2e-3), { fov: 44, roll: -0.03 });
};
var S6c = (f) => {
  const F = Fz(6, f);
  return zoom([3, D0 + 1.1, F - 6.2], [0, D0 + 0.8, F + 2], 40, pushK(f, 754, 3e-3), { roll: 0.04 });
};
var S7a = (f) => {
  const F = Fz(7, f);
  return zoom([-3, D0 + 1.4, F - 11], [0, D0 + 1.7, F + 3], 46, pushK(f, 823, 2e-3), { roll: -0.03 });
};
var S7b = (f) => {
  const F = Fz(7, f);
  return dolly([-5.4, D0 + 4.6, F - 2], [-2.7, D0 + 3.4, F + 2.5], pushK(f, 871, 3e-3), { fov: 40, roll: 0.02 });
};
var S7c = (f) => {
  const F = Fz(7, f);
  return dolly([0, D0 + 1.8, F - 3.7], [0, D0 + 1.75, F + 0.3], pushK(f, 925, 25e-4), { fov: 36 });
};
var S8a = (f) => dolly([-2.35, D0 + 1.25, -38.9], [ANCHOR[0], ANCHOR[1] + 0.3, ANCHOR[2]], pushK(f, 987, 25e-4, 6e-3, 35), { fov: 34 });
var S8b = (f) => {
  const u = glide((f - 1039) / 22);
  return { pos: [0.9, D0 + 2.2 + 0.3 * u, -41.2 - 0.4 * u], look: [-2.9 - 0.2 * u, ANCHOR[1] + 1.6 + 1 * u, -35 + 1.2 * u], fov: 38, roll: 0.04 };
};
var S8c = (f) => dolly([4.5, 15, -45], [0, 3.2, -14], pushK(f, 1062, 25e-4), { fov: 42 });
var S8d = (f) => dolly([7.5, 2.4, -25], [0, 2, -17.5], pushK(f, 1099, 2e-3), { fov: 44, roll: -0.04 });
var S9a = (f) => dolly([1.5, 0.55, -24.6], [0, 0.62, -18], pushK(f, 1128, 18e-4), { fov: 40, roll: -0.03 });
var S10a = (f) => dolly([0.9, 0.5, -24.2], [0, 0.65, -19], pushK(f, 1208, 18e-4), { fov: 37, roll: 0.04 });
var S11a = (f) => zoom([14, 10.5, -47], [-1, 7, -4], 40, pushK(f, 1295, 16e-4));
var S12a = (f) => dolly([PARK[0] + 0.55, D0 + 1.5, PARK[2] - 8], [PARK[0] + 0.55, D0 + 1.75, PARK[2]], pushK(f, 1405, 1e-3), { fov: 40 });
var S12b = (f) => dolly([PARK[0] - 1.6, D0 + 1.9, PARK[2] - 9.5], [PARK[0] + 0.4, D0 + 1.95, PARK[2]], pushK(f, 1546, 15e-4), { fov: 42 });
var S13a = (f) => {
  const F = Fz(13, f);
  return dolly([5.75, D0 + 2.45, F + 3.1], [0, D0 + 1.5, F + 6.5], pushK(f, 1614, 2e-3), { fov: 44 });
};
var S13b = (f) => {
  const F = Fz(13, f);
  return dolly([4.8, D0 + 2.45, F + 4], [0, D0 + 1.3, F + 4], pushK(f, 1685, 25e-4), { fov: 40 });
};
var S14a = (f) => dolly([-4.7, D0 + 1.5, -40.4], [-4.6, D0 + 0.85, -33], pushK(f, 1729, 2e-3), { fov: 42 });
var S14b = (f) => zoom([1.3, D0 + 1.6, -36.6], [2.9, D0 + 1.3, -31.2], 42, pushK(f, 1770, 25e-4, 4e-3, 24));
var S15a = (f) => dolly([1.7, D0 + 1.75, -15.5], [0, D0 + 1.5, -9], pushK(f, 1857, 25e-4), { fov: 40 });
var S15b = (f) => dolly([-1.3, D0 + 1.6, -13], [0, D0 + 1.5, -7.5], pushK(f, 1890, 15e-4, 6e-3, 32), { fov: 38 });
var CRANE = [[0, 18, -16], [17, 15, -44], [0, 7, 2]];
var S15c = (f) => {
  const a = S15b(1932), s = glide((f - 1932) / 93), r = 1 - s, [C2, B, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C2[i] + s * s * B[i]),
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s),
    fov: (a.fov ?? 40) + (44 - (a.fov ?? 40)) * s,
    roll: 0
  };
};
var CAMS = {
  1: [
    { f: 0, s: S1a },
    { f: 30, dur: 37, s: S1b },
    // centred on 48 ("knock down"), 129 px + 64 % zoom
    { f: 72, dur: 32, s: S1c }
    // centred on 88 ("just"), roll -0.04 -> +0.04 (4.6 deg)
  ],
  2: [
    { f: 126, s: S2a },
    { f: 181, dur: 18, s: S2b },
    { f: 237, dur: 18, s: S2c }
  ],
  3: [
    { f: 283, s: S3a },
    // cut (the copy of shot 2's framing is gone)
    { f: 333, dur: 40, s: S3b }
    // centred on 353 ("every boot")
  ],
  4: [
    { f: 444, s: S4a },
    // cut on "Halfway"
    { f: 497, cut: true, s: S4b },
    // cut on "bouncing"
    { f: 497, dur: 20, s: rolled(S4b, 0.035) }
    // roll 4 deg through level
  ],
  5: [
    { f: 534, s: S5a },
    // cut on "A normal person"
    { f: 576, dur: 18, s: S5b },
    // centred on 585, roll 0 -> 0.04
    { f: 600, dur: 20, s: rolled(S5b, -0.035) }
    // "think it's hilarious": roll back 4.3 deg
  ],
  6: [
    { f: 643, s: S6a },
    // cut to the whistler
    { f: 717, cut: true, s: S6b },
    // cut up over the column on "whole column"
    { f: 754, dur: 29, s: S6c }
    // centred on 768
  ],
  7: [
    { f: 823, s: S7a },
    // cut on "The bounce gets bigger"
    { f: 871, cut: true, s: S7b },
    // cut on "chains"
    { f: 925, cut: true, s: S7c }
    // cut on "nobody"
  ],
  8: [
    { f: 987, s: S8a },
    // cut to the bolt
    { f: 1039, cut: true, s: S8b },
    // cut on the snap (+ kick); the end whips up through the frame, the lens tilts after it
    { f: 1062, cut: true, s: S8c },
    // cut to the aerial
    { f: 1099, cut: true, s: S8d }
    // "drops": down to the water (+ kick at the slam)
  ],
  9: [
    { f: 1128, s: S9a },
    { f: 1208, dur: 18, s: S10a }
    // centred on 1217 ("Unluckily"), runs across the invisible 9 -> 10 change
  ],
  11: [{ f: 1295, s: S11a }],
  12: [
    { f: 1405, s: S12a },
    { f: 1546, dur: 28, s: S12b }
    // centred on 1560 ("higher and higher" pull-back)
  ],
  13: [
    { f: 1614, s: S13a },
    { f: 1685, cut: true, s: S13b }
    // cut on "pushing"
  ],
  14: [
    { f: 1729, s: S14a },
    { f: 1770, cut: true, s: S14b }
    // cut to the officer
  ],
  15: [
    { f: 1857, s: S15a },
    { f: 1890, dur: 30, s: S15b },
    // centred on 1905 ("best drilled")
    { f: 1932, cut: true, s: S15c }
    // crane pull-out on its own curved path, starts where S15b is (fastest ~1978, whoosh at 1962 mid-acceleration)
  ]
};
CAMS[10] = CAMS[9];
var KICKS = [[SNAP, 1], [DROP1, 1.6], [59.79, 0.5], [60.33, 0.5], [61.69, 0.7]];
var kickAt = (t) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
var camAt = (id, f) => {
  const c = run(CAMS[id], f), a = kickAt(T2(f));
  if (!a) return c;
  const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = 3 / 640 * Math.tan(c.fov * Math.PI / 360) * L * a;
  return { ...c, look: [c.look[0] - d[2] / h * m, c.look[1] + 0.6 * m, c.look[2] + d[0] / h * m], roll: c.roll + a * 4e-3 };
};
var eyes = (id) => (f) => [0, D0 + 1.6, Fz(id, f)];
var boots = (id) => (f) => [0, D0 + 0.3, Fz(id, f)];
var DOF = [
  { f: 0, cInf: 15, focus: eyes(1) },
  // hook wide: front row sharp, town as soft as the f650 close-up (~13 px)
  { f: 30, dur: 37, cInf: 15, focus: eyes(1) },
  // eye-level MS of the front row
  { f: 72, dur: 32, cInf: 15, focus: boots(1) },
  // boot level
  { f: 130, cInf: 0 },
  // town aerial (establishing, under the flash)
  { f: 333, dur: 40, cInf: 14, focus: boots(3) },
  // boots CU (ramps with the glide down)
  { f: 444, cInf: 0 },
  // side views
  { f: 534, cInf: 10, focus: eyes(5) },
  // MS faces "a normal person would slow down"
  { f: 576, dur: 18, cInf: 12, focus: eyes(5) },
  // closer MS "these guys think it's hilarious"
  { f: 643, cInf: 14 },
  // whistler CU, focus = look (his face)
  { f: 717, cInf: 0 },
  // high wide, low 3/4, wide ahead, chain close-up
  { f: 925, cInf: 12, focus: eyes(7) },
  // MS "nobody wants to be the one who breaks step"
  { f: 987, cInf: 14 },
  // anchor insert, focus = look (the bolt)
  { f: 1039, cInf: 10 },
  // snap insert
  { f: 1062, cInf: 0 },
  // aerial + water-level drop: kept readable
  { f: 1134, cInf: 16, focus: () => [0.6, 0.6, -21.6] },
  // river sitters (shots 9-10): first-row faces sharp, quay ~13 px
  { f: 1303, cInf: 5 },
  // golden sway: mild, focus = look (mid-span)
  { f: 1411, cInf: 7 },
  // park: focus = look (the swing plane: kid + parent), bush in front; mild so the facade ink holds
  { f: 1620, cInf: 0 },
  // golden march (riding with the column)
  { f: 1735, cInf: 8 },
  // bank, dazed soldiers behind a foreground cart, focus = look
  { f: 1770, cInf: 12, focus: () => [3.35, D0 + 1.6, -31.55] },
  // officer MS at the sign (his eyes), bush in front
  { f: 1863, cInf: 0 }
  // tourists (busy crowd beat, kept sharp), crane out
];
var dofAt = (f) => {
  let i = 0;
  while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
var FOREGROUND = [
  // ranges stay inside one shot (world.ts shows an entry only inside its own shot, so crossfade layers never see it).
  // sizes fitted to the silhouette (Kenney bushes are sparse: ellipsoid at 0.55 x bbox width matched the renders).
  // river sitters (shots 9-10): no prop since round 4 (the lens sits 2-3 m from the first row; CHAR floats hats/planks there)
  // bank, dazed soldiers (S14a, focus ~7.4 m): a cart in the bottom-left corner at ~2.6 m
  { a: 1735, b: 1770, kit: "cart", pos: [-3.8, D0, -38], s: 0.85, yaw: 0.6 },
  // officer at the sign (S14b, focus 5.7 m): a bush in the bottom-right corner under the sign post, clear of the officer
  // park swing (S12a/b, focus 7-9.5 m): a bush in the bottom-right corner, below the kid's arc
  { a: 1411, b: 1620, kit: "plant_bushDetailed", pos: [69.65, D0, -79.4], s: 1.2, yaw: 0.4 }
  // w 15-27 %, h 18-31 %, 0.36-0.52 x focus
];

// src/paint.ts
import * as THREE from "three";
var rng = (seed) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
};
var cache = /* @__PURE__ */ new Map();
var ctex = (key, w, h, draw) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d"), rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
var rep = (t, x, y) => {
  const c = t.clone();
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};
var pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
var _jc = new THREE.Color();
var _hsl = { h: 0, s: 0, l: 0 };
var jit = (r, hex, dv = 0.1, dh = 5, ds = 0.15) => {
  _jc.set(hex).getHSL(_hsl);
  const k = (a) => 1 + (r() * 2 - 1) * a;
  _jc.setHSL((_hsl.h + (r() * 2 - 1) * dh / 360 + 1) % 1, Math.min(1, _hsl.s * k(ds)), Math.min(0.97, _hsl.l * k(dv)));
  return "#" + _jc.getHexString();
};
var beam = () => ctex("beam", 256, 256, (g, r) => {
  g.fillStyle = "#a8743f";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(85,48,20,.16)";
  g.lineWidth = 2.5;
  for (let i = 0; i < 22; i++) {
    const y = r() * 256;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(90, y + 5, 170, y - 5, 256, y);
    g.stroke();
  }
});
var bed = () => ctex("bed", 512, 512, (g, r) => {
  g.fillStyle = "#a88f62";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = pick(r, ["#8f7a52", "#bca37a", "#9c8a66", "#7d6c4c"]);
    g.beginPath();
    g.ellipse(r() * 512, r() * 512, 4 + r() * 9, 3 + r() * 6, r() * 3, 0, 7);
    g.fill();
  }
});
var brickCol = (r) => {
  const c = jit(r, pick(r, ["#c0583a", "#b44f35", "#c8643f", "#a94a33", "#cf6e45", "#b9603f"]), 0.24, 6, 0.15), u = r();
  return u < 0.12 ? dim(c, 0.68) : u > 0.9 ? dim(c, 1.22) : c;
};
var dim = (hex, k) => {
  _jc.set(hex).getHSL(_hsl);
  _jc.setHSL(_hsl.h, _hsl.s, Math.min(0.92, _hsl.l * k));
  return "#" + _jc.getHexString();
};
var brick = () => ctex("brick", 512, 512, (g, r) => {
  g.fillStyle = "#e6d3b3";
  g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let i = 0; i < 8; i++) {
    const c = brickCol(r);
    const x = i * 64 + row % 2 * 32 + 2, y = row * 32 + 2;
    for (const ox of [0, -512]) {
      g.fillStyle = c;
      g.fillRect(x + ox, y, 60, 28);
      g.fillStyle = "rgba(255,235,210,0.16)";
      g.fillRect(x + ox + 2, y, 56, 3);
      g.fillStyle = "rgba(70,30,20,0.14)";
      g.fillRect(x + ox + 2, y + 25, 56, 3);
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = r() * 512, y = r() * 512, rad2 = 30 + r() * 70;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      g.save();
      g.translate(x + ox, y + oy);
      g.scale(1.3, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad2);
      gr.addColorStop(0, "rgba(70,45,35,0.13)");
      gr.addColorStop(1, "rgba(70,45,35,0)");
      g.fillStyle = gr;
      g.fillRect(-rad2, -rad2, 2 * rad2, 2 * rad2);
      g.restore();
    }
  }
});
var U = (r, a, b) => a + (b - a) * r();
var TAU = Math.PI * 2;
var wrapX = (W, x, w, fn) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};
var wrap2 = (W, H, x, y, rad2, fn) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad2 > 0 && X - rad2 < W && Y + rad2 > 0 && Y - rad2 < H) fn(X, Y);
  }
};
var rr = (g, x, y, w, h, k) => {
  k = Math.max(0, Math.min(k, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
};
var blotch = (g, x, y, rad2, sx, rgb, a) => {
  g.save();
  g.translate(x, y);
  g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad2);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(-rad2, -rad2, rad2 * 2, rad2 * 2);
  g.restore();
};
var grain = (g, r, W, x, y, len, amp2, lw, col) => {
  const n = Math.max(2, Math.round(len / 180));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp2);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + len * i / n;
      g.quadraticCurveTo(x1 - len / n / 2, y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp2, x1, y + dy[i]);
    }
    g.stroke();
  });
};
var nail = (g, x, y, rad2, col = "#3a2212") => {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, rad2, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(255,240,215,0.55)";
  g.beginPath();
  g.arc(x - rad2 * 0.32, y - rad2 * 0.32, rad2 * 0.36, 0, TAU);
  g.fill();
};
var planksHD = () => ctex("planksHD", 2048, 2048, (g, r) => {
  const S = 2048, B = 256, GAP = 12;
  const fills = ["#c99669", "#c18e64", "#d19f6e", "#bb8961", "#c69466", "#c79b6f"];
  for (let i = 0; i < 8; i++) {
    const y = i * B;
    g.save();
    g.beginPath();
    g.rect(0, y, S, B);
    g.clip();
    g.fillStyle = jit(r, pick(r, fills), 0.05, 3, 0.08);
    g.fillRect(0, y, S, B);
    for (let k = 0; k < 5; k++) {
      const x = U(r, 0, S), rad2 = U(r, 120, 260), light = r() > 0.5;
      wrapX(S, x - rad2 * 3, rad2 * 6, (xx) => blotch(g, xx + rad2 * 3, y + B / 2, rad2, 3, light ? "255,236,200" : "110,60,25", light ? 0.12 : 0.1));
    }
    for (let k = 0; k < 18; k++) {
      const light = r() < 0.25;
      grain(
        g,
        r,
        S,
        U(r, 0, S),
        y + U(r, 16, B - 16),
        U(r, 500, 1600),
        U(r, 2, 8),
        U(r, 2, 4),
        light ? "rgba(255,232,195,0.2)" : "rgba(95,48,18,0.3)"
      );
    }
    for (let k = 0; k < 4; k++)
      grain(g, r, S, U(r, 0, S), y + U(r, 30, B - 30), U(r, 900, 1900), U(r, 4, 10), 3.5, "rgba(70,32,10,0.4)");
    if (r() < 0.35) {
      const kx = U(r, 120, S - 120), ky = y + U(r, 70, B - 70), rx = U(r, 14, 24), ry = rx * U(r, 0.45, 0.6);
      g.strokeStyle = "rgba(140,82,36,0.20)";
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(kx, ky, rx * 2.3, ry * 1.9, 0, 0, TAU);
      g.stroke();
      g.fillStyle = "rgba(150,88,38,0.30)";
      g.beginPath();
      g.ellipse(kx, ky, rx, ry, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(105,55,22,0.55)";
      g.lineWidth = 2.5;
      g.stroke();
    }
    for (let k = 0; k < 3; k++) blotch(g, U(r, 100, S - 100), y + U(r, 40, B - 40), U(r, 40, 110), 1.6, "120,70,30", 0.06);
    g.fillStyle = "rgba(255,238,200,0.35)";
    g.fillRect(0, y + GAP / 2 + 1, S, 3);
    const sh = g.createLinearGradient(0, y + B - GAP / 2 - 18, 0, y + B - GAP / 2);
    sh.addColorStop(0, "rgba(80,35,10,0)");
    sh.addColorStop(1, "rgba(80,35,10,0.24)");
    g.fillStyle = sh;
    g.fillRect(0, y + B - GAP / 2 - 18, S, 18);
    const jx = U(r, 90, S - 90);
    g.fillStyle = "#24110a";
    g.fillRect(jx - 3, y, 7, B);
    g.fillStyle = "rgba(255,238,200,0.30)";
    g.fillRect(jx + 4, y, 2, B);
    for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 5, "#22140c");
    for (const nx of [512, 1536]) for (const f of [0.3, 0.7]) nail(g, nx + U(r, -3, 3), y + B * f, 5, "#22140c");
    g.restore();
  }
  for (let i = 0; i <= 8; i++) {
    g.fillStyle = "rgba(40,18,8,0.6)";
    g.fillRect(0, i * B - GAP / 2 - 3, S, GAP + 6);
    g.fillStyle = "#1c0c05";
    g.fillRect(0, i * B - GAP / 2, S, GAP);
  }
});
var beamHD = () => ctex("beamHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512, T3 = H / 7;
  for (let k = 0; k < 7; k++) {
    const y = k * T3;
    g.save();
    g.beginPath();
    g.rect(0, y, W, T3);
    g.clip();
    g.fillStyle = pick(r, ["#a8743f", "#9e6b39", "#b07a44"]);
    g.fillRect(0, y, W, T3);
    for (let i = 0; i < 6; i++) {
      const light = r() < 0.3;
      grain(g, r, W, U(r, 0, W), y + U(r, 8, T3 - 8), U(r, 250, 700), U(r, 1.5, 4), U(r, 1.5, 3), light ? "rgba(255,232,190,0.12)" : "rgba(85,48,20,0.16)");
    }
    g.fillStyle = "rgba(255,235,195,0.30)";
    g.fillRect(0, y + 3, W, 3);
    const sh = g.createLinearGradient(0, y + T3 - 12, 0, y + T3);
    sh.addColorStop(0, "rgba(60,28,8,0)");
    sh.addColorStop(1, "rgba(60,28,8,0.26)");
    g.fillStyle = sh;
    g.fillRect(0, y + T3 - 12, W, 12);
    const jx = U(r, 120, W - 120);
    g.fillStyle = "#4a2510";
    g.fillRect(jx - 2, y, 4, T3);
    for (const bx of [jx - 30, jx + 30]) nail(g, bx, y + T3 / 2, 7, "#2f2a2a");
    g.restore();
    g.fillStyle = "#4a2510";
    g.fillRect(0, y - 1.5, W, 3);
  }
});
var STONE_PAL = {
  stoneHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  towerHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  tstoneHD: { cols: ["#e2d5bc", "#d7c8ac", "#e9dec9", "#ccbca1"], mortar: "#a69881" },
  wallHD: { cols: ["#c3b198", "#b8a68b", "#cdbda3", "#af9c83", "#beac94"], mortar: "#887762" },
  copeHD: { cols: ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], mortar: "#a99982" }
};
var STONE_BIG = /* @__PURE__ */ new Set(["towerHD", "tstoneHD", "wallHD", "stoneHD"]);
var stoneHD = (key = "stoneHD", cols = ["#ddd0bf", "#d3c5b3", "#e5d9c9", "#cabba8"], mortar = "#a39584") => {
  const pal = STONE_PAL[key];
  if (pal) {
    cols = pal.cols;
    mortar = pal.mortar;
  }
  const S = STONE_BIG.has(key) ? 2048 : 1024;
  const t = ctex(key, S, S, (g, r) => {
    const RH = 128, J = 7;
    g.fillStyle = mortar;
    g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / RH; row++) {
      const y = row * RH, ws = [];
      let sum = 0;
      while (sum < S) {
        const w = U(r, 200, 360);
        ws.push(w);
        sum += w;
      }
      const k = S / sum;
      let x = row % 2 * 140 + U(r, 0, 60);
      for (const w0 of ws) {
        const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 5, 0.18), dl = U(r, -1, 1);
        const sp = Array.from({ length: 16 }, () => [r(), r(), U(r, 1, 2.2), r() < 0.6 ? 1 : 0]);
        const crack = r() < 0.15 ? Array.from({ length: 4 }, () => [r(), r()]) : null;
        wrapX(S, x % S, w, (xx) => {
          const X = xx + J / 2, Y = y + J / 2, BW = w - J, BH = RH - J;
          rr(g, X, Y, BW, BH, 5);
          g.fillStyle = col;
          g.fill();
          g.fillStyle = dl > 0 ? `rgba(255,252,245,${0.07 * dl})` : `rgba(70,55,45,${-0.06 * dl})`;
          g.fill();
          g.fillStyle = "rgba(255,252,245,0.22)";
          g.fillRect(X + 3, Y, BW - 6, 6);
          g.fillStyle = "rgba(255,252,245,0.10)";
          g.fillRect(X, Y + 4, 4, BH - 8);
          g.fillStyle = "rgba(70,55,45,0.14)";
          g.fillRect(X + 3, Y + BH - 5, BW - 6, 5);
          for (const [u, v, s, dark] of sp) {
            g.fillStyle = dark ? "rgba(95,82,72,0.38)" : "rgba(255,255,255,0.35)";
            g.beginPath();
            g.arc(X + 6 + u * (BW - 12), Y + 8 + v * (BH - 16), s, 0, TAU);
            g.fill();
          }
          if (crack) {
            g.strokeStyle = "rgba(110,90,70,0.45)";
            g.lineWidth = 1.2;
            g.beginPath();
            crack.forEach(([u, v], i) => {
              const px = X + 10 + u * (BW - 20), py = Y + 10 + v * (BH - 20);
              if (i) g.lineTo(px, py);
              else g.moveTo(px, py);
            });
            g.stroke();
          }
        });
        x += w;
      }
    }
    const n = (S / 1024) ** 2;
    for (let i = 0; i < 14 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rad2 = U(r, 50, 170), dark = r() < 0.75;
      wrap2(S, S, x, y, rad2 * 1.4, (xx, yy) => blotch(g, xx, yy, rad2, 1.4, dark ? "105,82,55" : "255,246,225", dark ? U(r, 0.07, 0.13) : 0.09));
    }
    for (let i = 0; i < 8 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S * 0.8), w = U(r, 8, 26), h = U(r, 90, 300);
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, "rgba(95,75,52,0.14)");
      gr.addColorStop(1, "rgba(95,75,52,0)");
      wrapX(S, x, w, (xx) => {
        g.fillStyle = gr;
        g.fillRect(xx, y, w, h);
      });
    }
    for (let i = 0; i < 160 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1.2, 3), d = r() < 0.65;
      g.fillStyle = d ? "rgba(90,70,50,0.32)" : "rgba(255,248,230,0.35)";
      g.beginPath();
      g.arc(x, y, s, 0, TAU);
      g.fill();
    }
  });
  t.repeat.set(1024 / S, 1024 / S);
  return t;
};
var cobbleHD = () => {
  const t = ctex("cobbleHD", 2048, 2048, (g, r) => {
    const S = 2048, N = 48, CH = S / N, J = 5;
    g.fillStyle = "#867967";
    g.fillRect(0, 0, S, S);
    const cols = ["#c4b6a0", "#b8aa93", "#cdc1ab", "#af9f88", "#c7baa3", "#bdb19b", "#b8ad9c"];
    for (let row = 0; row < N; row++) {
      const y = row * CH, ws = [];
      let sum = 0;
      while (sum < S) {
        const w = U(r, 48, 72);
        ws.push(w);
        sum += w;
      }
      const k = S / sum;
      let x = U(r, 0, 60);
      for (const w0 of ws) {
        const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 6, 0.2), dy = U(r, -1.5, 1.5), rad2 = U(r, 7, 12);
        const sp = Array.from({ length: 3 }, () => [r(), r(), r() < 0.5 ? 1 : 0]);
        wrapX(S, x % S, w, (xx) => {
          const X = xx + J / 2, Y = y + J / 2 + dy, W = w - J, H = CH - J;
          rr(g, X, Y, W, H, rad2);
          g.fillStyle = col;
          g.fill();
          g.save();
          rr(g, X, Y, W, H, rad2);
          g.clip();
          const gr = g.createLinearGradient(X, Y, X + W * 0.6, Y + H);
          gr.addColorStop(0, "rgba(255,250,240,0.20)");
          gr.addColorStop(0.5, "rgba(255,250,240,0)");
          gr.addColorStop(1, "rgba(70,58,45,0.16)");
          g.fillStyle = gr;
          g.fillRect(X, Y, W, H);
          g.restore();
          for (const [u, v, d] of sp) {
            g.fillStyle = d ? "rgba(90,80,68,0.35)" : "rgba(255,255,255,0.3)";
            g.beginPath();
            g.arc(X + 5 + u * (W - 10), Y + 5 + v * (H - 10), 1.4, 0, TAU);
            g.fill();
          }
        });
        x += w;
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rad2 = U(r, 60, 220), d = r() < 0.7;
      wrap2(S, S, x, y, rad2 * 1.3, (xx, yy) => blotch(g, xx, yy, rad2, 1.3, d ? "90,70,48" : "255,244,220", d ? U(r, 0.06, 0.12) : 0.1));
    }
    for (let i = 0; i < 260; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rx = U(r, 2, 5), d = r() < 0.4;
      wrap2(S, S, x, y, 8, (xx, yy) => {
        g.fillStyle = d ? "rgba(95,78,58,0.55)" : pick(r, ["rgba(245,232,205,0.8)", "rgba(230,214,185,0.8)"]);
        g.beginPath();
        g.ellipse(xx, yy, rx, rx * 0.75, 0, 0, TAU);
        g.fill();
      });
    }
  });
  t.repeat.set(0.5, 0.5);
  return t;
};
var roofHD = (col, slate = false) => ctex("roofHD" + col, 1024, 1024, (g, r) => {
  const S = 1024, C2 = 64, TW = slate ? 52 : 77;
  g.fillStyle = col;
  g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / C2; row++) {
    const y = row * C2, off = row % 2 * TW / 2 + U(r, -6, 6);
    const n = Math.ceil(S / TW) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * TW - off, tone = U(r, -1, 1);
      const fill = tone > 0 ? `rgba(255,240,225,${0.1 * tone})` : `rgba(60,25,20,${-0.1 * tone})`;
      wrapX(S, x, TW, (xx) => {
        g.fillStyle = fill;
        g.fillRect(xx, y, TW, C2);
        const gr = g.createLinearGradient(xx, 0, xx + TW, 0);
        gr.addColorStop(0, "rgba(255,240,225,0.12)");
        gr.addColorStop(0.55, "rgba(255,240,225,0)");
        gr.addColorStop(1, slate ? "rgba(20,25,35,0.10)" : "rgba(60,25,20,0.12)");
        g.fillStyle = gr;
        g.fillRect(xx, y, TW, C2);
        g.fillStyle = slate ? "rgba(20,25,35,0.25)" : "rgba(60,25,20,0.22)";
        g.fillRect(xx, y, 2, C2);
      });
    }
    g.fillStyle = slate ? "rgba(220,230,245,0.18)" : "rgba(255,235,220,0.22)";
    g.fillRect(0, y + C2 - 9, S, 3);
    g.fillStyle = slate ? "rgba(15,20,30,0.32)" : "rgba(55,22,18,0.32)";
    g.fillRect(0, y + C2 - 5, S, 5);
  }
  for (let i = 0; i < 18; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad2 = U(r, 40, 120);
    wrap2(S, S, x, y, rad2 * 1.5, (xx, yy) => blotch(g, xx, yy, rad2, 1.5, "70,60,40", 0.08));
  }
});
var grassHD = () => ctex("grassHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#73b23d";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad2 = U(r, 120, 320), light = r() > 0.5;
    wrap2(S, S, x, y, rad2 * 1.4, (xx, yy) => blotch(g, xx, yy, rad2, 1.4, light ? "140,198,80" : "92,154,48", 0.35));
  }
  g.lineWidth = 2;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let i = 0; i < 1400; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 7, 16), lean = U(r, -3, 3), light = r() < 0.4;
    wrap2(S, S, x, y, 20, (xx, yy) => {
      g.strokeStyle = light ? "rgba(165,218,98,0.35)" : "rgba(78,138,38,0.45)";
      g.beginPath();
      g.moveTo(xx - 3 + lean, yy - h);
      g.lineTo(xx, yy);
      g.lineTo(xx + 3 + lean, yy - h * 0.8);
      g.stroke();
    });
  }
  for (let i = 0; i < 12; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#f7f3e8", "#f4d24a", "#f3a9bb", "#f7f3e8"]);
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(xx, yy, 3.5, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(240,190,60,0.9)";
      g.beginPath();
      g.arc(xx, yy, 1.3, 0, TAU);
      g.fill();
    });
  }
});
var facadeHD = (key, wm, hm, o) => {
  const PX = Math.min(72, 2048 / Math.max(wm, hm));
  const W = Math.round(wm * PX), H = Math.round(hm * PX), m = (v) => v * PX;
  return ctex("facHD" + key, W, H, (g, r) => {
    if (o.brick) {
      g.fillStyle = "#e9d3b4";
      g.fillRect(0, 0, W, H);
      const bw = m(0.25), bh = m(0.085);
      for (let y = 0, row = 0; y < H; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
        g.fillStyle = brickCol(r);
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
      const n = Math.round(wm * hm / 12) + 3;
      for (let i = 0; i < n; i++) blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.4)), 1.4, "70,40,30", U(r, 0.06, 0.12));
    } else {
      g.fillStyle = o.wall;
      g.fillRect(0, 0, W, H);
      const n = Math.round(wm * hm / 3) + 6;
      for (let i = 0; i < n; i++) {
        const light = r() > 0.5;
        blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.5)), 1.5, light ? "255,255,255" : "120,90,60", light ? 0.07 : 0.05);
      }
      for (let i = 0; i < 4; i++) {
        let x = U(r, 0, W), y = U(r, 0, H * 0.8);
        g.strokeStyle = "rgba(120,100,80,0.35)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += m(U(r, -0.08, 0.08));
          y += m(U(r, 0.04, 0.12));
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    g.fillStyle = "rgba(70,55,45,0.28)";
    g.fillRect(0, H - m(0.45), W, m(0.45));
    g.fillStyle = "rgba(70,55,45,0.35)";
    g.fillRect(0, H - m(0.45), W, 2);
    const timberBeam = (x, y, w, h) => {
      g.fillStyle = "#6e4a30";
      g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(40,25,15,0.5)";
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "rgba(255,230,200,0.22)";
      g.fillRect(x + 2, y + 2, w - 4, 2);
    };
    if (o.timber) {
      const t = m(0.18);
      timberBeam(0, 0, t, H);
      timberBeam(W - t, 0, t, H);
      timberBeam(0, 0, W, t);
      for (let fl = 1; fl < floors; fl++) timberBeam(0, H - m(fl * 2.8) - t / 2, W, t);
      for (let i = 1; i < nWin; i++) timberBeam(i * W / nWin - t / 2, 0, t, H - m(2.8));
    }
    const door = (cx) => {
      const dw = m(1.1), dh = m(2.1);
      const path = (k) => {
        g.beginPath();
        g.moveTo(cx - dw / 2 - k, H);
        g.lineTo(cx - dw / 2 - k, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2 + k, Math.PI, 0);
        g.lineTo(cx + dw / 2 + k, H);
        g.closePath();
      };
      path(m(0.1));
      g.fillStyle = "#e9e2d4";
      g.fill();
      g.strokeStyle = "rgba(60,45,40,0.6)";
      g.lineWidth = 1.5;
      g.stroke();
      path(0);
      g.fillStyle = "#7a4a2c";
      g.fill();
      g.save();
      path(0);
      g.clip();
      for (let x = cx - dw / 2 + m(0.14); x < cx + dw / 2; x += m(0.14)) {
        g.fillStyle = "rgba(40,20,10,0.45)";
        g.fillRect(x - 1, H - dh, 2, dh);
        g.fillStyle = "rgba(255,225,190,0.15)";
        g.fillRect(x + 1, H - dh, 2, dh);
      }
      g.restore();
      path(0);
      g.strokeStyle = "rgba(40,25,15,0.7)";
      g.lineWidth = 2;
      g.stroke();
      nail(g, cx + dw / 3, H - dh / 2, m(0.035), "#d9b04a");
    };
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = (i + 0.5) * W / nWin, by = H - m(fl * 2.8 + 0.9);
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) {
        door(cx);
        continue;
      }
      const ww = m(0.85), wh = m(1.25), x0 = cx - ww / 2, y0 = by - wh, tr = m(0.08), sw = m(0.45);
      for (const sx of [x0 - tr - sw - m(0.02), x0 + ww + tr + m(0.02)]) {
        g.fillStyle = o.shutter;
        g.fillRect(sx, y0, sw, wh);
        const lw = Math.max(1.5, m(0.012));
        for (let ly = y0 + m(0.06); ly < y0 + wh - m(0.04); ly += m(0.06)) {
          g.fillStyle = "rgba(0,0,0,0.22)";
          g.fillRect(sx + m(0.04), ly, sw - m(0.08), lw);
          g.fillStyle = "rgba(255,255,255,0.14)";
          g.fillRect(sx + m(0.04), ly + lw, sw - m(0.08), 1);
        }
        g.strokeStyle = "rgba(0,0,0,0.18)";
        g.lineWidth = m(0.03);
        g.strokeRect(sx + m(0.015), y0 + m(0.015), sw - m(0.03), wh - m(0.03));
        g.strokeStyle = "rgba(40,30,40,0.55)";
        g.lineWidth = 1.5;
        g.strokeRect(sx, y0, sw, wh);
      }
      g.fillStyle = "#f7f2e8";
      g.fillRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      const gl = g.createLinearGradient(0, y0, 0, y0 + wh);
      gl.addColorStop(0, "#8d9cdb");
      gl.addColorStop(1, "#5761a8");
      g.fillStyle = gl;
      g.fillRect(x0, y0, ww, wh);
      if (r() < 0.35) {
        g.fillStyle = pick(r, ["#f5c4c8", "#f3e3c6", "#d7e6cf"]);
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x0 + ww * 0.42, y0);
        g.lineTo(x0, y0 + wh * 0.75);
        g.fill();
        g.beginPath();
        g.moveTo(x0 + ww, y0);
        g.lineTo(x0 + ww * 0.58, y0);
        g.lineTo(x0 + ww, y0 + wh * 0.75);
        g.fill();
      }
      g.save();
      g.beginPath();
      g.rect(x0, y0, ww, wh);
      g.clip();
      g.fillStyle = "rgba(255,255,255,0.5)";
      for (const [a, b] of [[0.3, m(0.07)], [0.58, m(0.035)]]) {
        g.save();
        g.translate(x0 + ww * a, y0 + wh * 0.5);
        g.rotate(Math.PI / 4);
        g.fillRect(-b / 2, -wh, b, wh * 2);
        g.restore();
      }
      g.restore();
      g.fillStyle = "#f7f2e8";
      g.fillRect(cx - m(0.02), y0, m(0.04), wh);
      g.fillRect(x0, y0 + wh * 0.45 - m(0.02), ww, m(0.04));
      g.strokeStyle = "rgba(60,45,40,0.6)";
      g.lineWidth = 1.5;
      g.strokeRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      g.strokeStyle = "rgba(60,45,40,0.45)";
      g.strokeRect(x0, y0, ww, wh);
      g.fillStyle = "#ebe3d4";
      g.fillRect(x0 - tr - m(0.06), by + tr, ww + 2 * tr + m(0.12), m(0.07));
      g.fillStyle = "rgba(60,45,40,0.35)";
      g.fillRect(x0 - tr - m(0.06), by + tr + m(0.07), ww + 2 * tr + m(0.12), m(0.03));
    }
  });
};
var waterMarks = (key, nCrest, nGlint) => ctex("waterMarks" + key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  for (let i = 0; i < nCrest; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 18, 44), sag = w * U(r, 0.3, 0.45), lw = U(r, 3, 5), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save();
      g.translate(xx, yy);
      g.rotate(a);
      const arc = (dy, col, k) => {
        g.strokeStyle = col;
        g.lineWidth = lw * k;
        g.beginPath();
        g.moveTo(-w / 2, dy);
        g.quadraticCurveTo(0, dy - sag * 2, w / 2, dy);
        g.stroke();
      };
      arc(0, "rgb(255,0,0)", 1);
      arc(lw * 1.5, "rgb(0,255,0)", 0.9);
      g.restore();
    });
  }
  for (let i = 0; i < nGlint; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 40, 140), lw = U(r, 1.2, 2.4), a = U(r, 0, Math.PI);
    wrap2(S, S, x, y, len, (xx, yy) => {
      g.save();
      g.translate(xx, yy);
      g.rotate(a);
      g.strokeStyle = "rgb(0,0,255)";
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(-len / 2, 0);
      g.lineTo(len / 2, 0);
      g.stroke();
      g.restore();
    });
  }
  g.globalCompositeOperation = "source-over";
});
var waterNear = () => waterMarks("near", 28, 5);
var waterFar = () => waterMarks("far", 220, 30);
var CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" };
var cloudHD = (seed, pal = CLOUD_DAY) => ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 17);
  const W = 1024, H = 512, base2 = 400;
  const n = 6 + Math.floor(r() * 4), lobes = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, rad2 = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base2 - rad2 * U(r, 0.35, 0.65), r: rad2 });
  }
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const t = U(r, 0.25, 0.75), rad2 = U(r, 60, 110);
    lobes.push({ x: 150 + t * 724, y: base2 - 150 - rad2 * U(r, 0.3, 0.7), r: rad2 });
  }
  const layer = (dx, dy, k, col, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.fillStyle = col;
    g.beginPath();
    for (const l of lobes) {
      const x = l.x + dx * l.r, y = l.y + dy * l.r;
      g.moveTo(x + l.r * k, y);
      g.arc(x, y, l.r * k, 0, TAU);
    }
    g.fill();
    g.restore();
  };
  layer(0, 0, 1, pal.shade, 6);
  layer(-0.04, -0.12, 0.9, pal.mid, 8);
  layer(-0.1, -0.26, 0.72, pal.lit, 10);
  g.globalCompositeOperation = "destination-in";
  const m = g.createLinearGradient(0, base2 - 18, 0, base2 + 6);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});
var chainHD = () => ctex("chainHD", 256, 1024, (g) => {
  const F = 64, P2 = 128;
  g.fillStyle = "#4a5160";
  g.fillRect(0, 0, 256, 1024);
  for (let f = 0; f < 4; f++) {
    const cx = f * F + F / 2;
    for (let i = 0; i < 1024 / P2; i++) {
      const cy = i * P2 + P2 / 2;
      if (i % 2 === 0) {
        g.lineWidth = 15;
        g.strokeStyle = "#8a93a3";
        g.beginPath();
        g.ellipse(cx, cy, 22, 58, 0, 0, TAU);
        g.stroke();
        g.lineWidth = 2.5;
        g.strokeStyle = "#3a404d";
        for (const d of [-7.5, 7.5]) {
          g.beginPath();
          g.ellipse(cx, cy, 22 + d, 58 + d, 0, 0, TAU);
          g.stroke();
        }
        g.lineWidth = 5;
        g.strokeStyle = "#e4e6ea";
        g.beginPath();
        g.ellipse(cx, cy, 22, 58, 0, Math.PI * 1.05, Math.PI * 1.55);
        g.stroke();
        g.fillStyle = "#fbfaf4";
        g.beginPath();
        g.arc(cx - 15, cy - 40, 2.5, 0, TAU);
        g.fill();
      } else {
        rr(g, cx - 8, cy - 62, 16, 124, 8);
        g.fillStyle = "#7d8696";
        g.fill();
        g.strokeStyle = "#3a404d";
        g.lineWidth = 2.5;
        g.stroke();
        g.fillStyle = "#d9dce3";
        g.fillRect(cx - 5, cy - 52, 3, 104);
      }
    }
  }
});

// src/shade.ts
import * as THREE2 from "three";
var TONE = {
  uLitCol: { value: new THREE2.Vector3(1.5, 1.44, 1.32) },
  uShadeCol: { value: new THREE2.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE2.Vector3() },
  uLambert: { value: 0.35 },
  uSideK: { value: 0.84 },
  uTerm: { value: 0.2 },
  uBounce: { value: new THREE2.Vector3() },
  // warm bounce on shaded faces turned to the camera (golden only; day = 0)
  uSat: { value: 1 }
  // world albedo saturation around its luminance (characters are not twoTone, so unaffected)
};
var CHAR = {
  uCharTint: { value: new THREE2.Vector3(1, 0.94, 0.92) },
  uCharShade: { value: 0.86 },
  uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 },
  uSideTint: { value: new THREE2.Vector3(0.92, 0.9, 0.96) }
};
var LFB = THREE2.ShaderChunk.lights_fragment_begin.replace(
  "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
  "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]"
).replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n		directLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");
var TWO_TONE = (
  /* glsl */
  `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );                     // 0 = cast/form shadow, 1 = lit
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );    // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );        // 1 = faces the lens
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  reflectedLight.directDiffuse = alb * ( mix( uShadeCol, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + uShadeLift * LIFT_K * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`
);
var DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;";
function twoTone(m, liftK = 1) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", DECL + `
#define LIFT_K ${liftK.toFixed(3)}`).replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB).replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone5_" + liftK.toFixed(3);
  return m;
}
var neutral = (c) => {
  const x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const v = c.map((k) => k - off), peak = Math.max(v[0], v[1], v[2]), S = 0.76;
  if (peak < S) return v;
  const d = 1 - S, np = 1 - d * d / (peak + d - S), g = 1 - 1 / (0.15 * (peak - np) + 1);
  return v.map((k) => k * np / peak * (1 - g) + np * g);
};
var untone = (target, out = new THREE2.Color()) => {
  const t = new THREE2.Color(target);
  const tt = [t.r, t.g, t.b].map((k) => Math.min(k, 0.985));
  let c = tt.slice();
  for (let i = 0; i < 60; i++) {
    const y = neutral(c);
    c = c.map((k, j) => Math.max(0, k + (tt[j] - y[j])));
  }
  return out.setRGB(c[0], c[1], c[2]);
};

// src/build.ts
var V = (x, y, z) => new THREE3.Vector3(x, y, z);
var mats = /* @__PURE__ */ new Map();
var CHAIN_MATS = /* @__PURE__ */ new WeakSet();
var lam = (key, make) => {
  let m = mats.get(key);
  if (!m) {
    if (key === "chainHD") {
      const c = twoTone(new THREE3.MeshPhongMaterial({ color: "#7a8490", specular: "#6c727b", shininess: 30 }));
      CHAIN_MATS.add(c);
      m = c;
    } else m = twoTone(new THREE3.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};
var lamOf = /* @__PURE__ */ new Map();
var GREENS = ["#62ae4c", "#56a447", "#72b853"];
var RECOLOR = {
  grass: "#6aab4f",
  leafsDark: "#4a9142",
  woodBark: "#8a5a3c",
  woodInner: "#e8cfa4",
  wood: "#a8724a",
  woodDark: "#7a4f33",
  dirt: "#8a6a4a",
  stone: "#b7b4ad"
};
var toLambert = (m) => {
  let l = lamOf.get(m.uuid);
  if (!l) {
    const s = m;
    const col = m.name === "leafsGreen" ? GREENS[lamOf.size % 3] : RECOLOR[m.name];
    l = twoTone(new THREE3.MeshLambertMaterial({ color: col ? new THREE3.Color(col) : s.color?.clone() ?? new THREE3.Color("#ffffff"), map: s.map ?? null, side: s.side, alphaTest: s.alphaTest }));
    lamOf.set(m.uuid, l);
  }
  return l;
};
var f32 = (a) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE3.Float32BufferAttribute(out, a.itemSize);
};
var quad = (a, b, c, d, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE3.BufferGeometry();
  const n = new THREE3.Vector3().subVectors(b, a).cross(new THREE3.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE3.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE3.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE3.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
var tri = (a, b, c) => {
  const g = new THREE3.BufferGeometry();
  const n = new THREE3.Vector3().subVectors(b, a).cross(new THREE3.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE3.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE3.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE3.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
var boxGeo = (min, max, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a) => tile ? a / tile : 1;
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d))
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};
var Batch = class {
  g = /* @__PURE__ */ new Map();
  add(geo, mat, m) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE3.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal));
    else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE3.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x);
    else this.g.set(mat, [x]);
  }
  addObject(o, m) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      const mesh = c;
      if (!mesh.isMesh) return;
      this.add(mesh.geometry, toLambert(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material), new THREE3.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
    });
  }
  build(parent, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE3.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
};
var LNS = 16;
var LNR = 6;
var linkTemplate = (h) => {
  const ow = h * 0.85, rb = ow * 0.14, ol = ow * 1.62, rc = ow / 2 - rb, hl = ol / 2 - rb - rc;
  const p = new Float32Array(LNS * LNR * 3), n = new Float32Array(LNS * LNR * 3), idx = [];
  for (let j = 0; j < LNS; j++) {
    const th = 2 * Math.PI * (j + 0.5) / LNS, nx = Math.cos(th), ny = Math.sin(th);
    const cx = rc * nx + Math.sign(nx) * hl, cy = rc * ny;
    for (let k = 0; k < LNR; k++) {
      const ph = 2 * Math.PI * k / LNR, cp = Math.cos(ph), sp = Math.sin(ph), o = (j * LNR + k) * 3;
      p[o] = cx + rb * cp * nx;
      p[o + 1] = cy + rb * cp * ny;
      p[o + 2] = rb * sp;
      n[o] = cp * nx;
      n[o + 1] = cp * ny;
      n[o + 2] = sp;
      const a = j * LNR + k, b = j * LNR + (k + 1) % LNR, c = (j + 1) % LNS * LNR + (k + 1) % LNR, d = (j + 1) % LNS * LNR + k;
      idx.push(a, d, c, a, c, b);
    }
  }
  return { p, n, idx, pitch: ol - 4 * rb };
};
var Strand = class {
  constructor(n, w, h, mat, tile = 1, cast = true) {
    this.n = n;
    this.w = w;
    this.h = h;
    this.tile = tile;
    const g = new THREE3.BufferGeometry();
    if (CHAIN_MATS.has(mat)) {
      const lt = this.lt = linkTemplate(h), nv = LNS * LNR;
      this.maxLinks = 440;
      this.pos = new Float32Array(this.maxLinks * nv * 3);
      this.nor = new Float32Array(this.maxLinks * nv * 3);
      this.uv = new Float32Array(this.maxLinks * nv * 2);
      const idx = new Uint32Array(this.maxLinks * lt.idx.length);
      for (let l = 0; l < this.maxLinks; l++) for (let i = 0; i < lt.idx.length; i++) idx[l * lt.idx.length + i] = lt.idx[i] + l * nv;
      g.setAttribute("position", new THREE3.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE3.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE3.BufferAttribute(this.uv, 2));
      g.setIndex(new THREE3.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
    } else {
      this.pos = new Float32Array(n * 12);
      this.nor = new Float32Array(n * 12);
      this.uv = new Float32Array(n * 8);
      g.setAttribute("position", new THREE3.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE3.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE3.BufferAttribute(this.uv, 2));
      const idx = [];
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) {
        const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = (i + 1) * 4 + (k + 1) % 4, d = (i + 1) * 4 + k;
        idx.push(a, b, c, a, c, d);
      }
      g.setIndex(idx);
    }
    this.mesh = new THREE3.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = cast;
    this.mesh.receiveShadow = true;
  }
  mesh;
  pos;
  nor;
  uv;
  lt = null;
  maxLinks = 0;
  T = new THREE3.Vector3();
  S = new THREE3.Vector3();
  N = new THREE3.Vector3();
  /** link mode: links every `pitch` along the polyline, centred, alternating ring plane (vertical / horizontal) */
  setLinks(pts, lt) {
    const { T: T3, S, N } = this, nv = LNS * LNR;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1], count = Math.max(0, Math.min(this.maxLinks, Math.floor(total / lt.pitch)));
    const s0 = (total - (count - 1) * lt.pitch) / 2;
    let seg = 1;
    for (let l = 0; l < count; l++) {
      const s = s0 + l * lt.pitch;
      while (seg < pts.length - 1 && cum[seg] < s) seg++;
      const a = pts[seg - 1], b = pts[seg], u = (s - cum[seg - 1]) / Math.max(1e-6, cum[seg] - cum[seg - 1]);
      const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u;
      T3.subVectors(b, a).normalize();
      S.set(-T3.z, 0, T3.x);
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize();
      N.crossVectors(S, T3).normalize();
      const odd = l % 2 === 1;
      const yx = odd ? S.x : N.x, yy = odd ? S.y : N.y, yz = odd ? S.z : N.z;
      const zx = odd ? -N.x : S.x, zy = odd ? -N.y : S.y, zz = odd ? -N.z : S.z;
      const base2 = l * nv * 3;
      for (let v = 0; v < nv * 3; v += 3) {
        const x = lt.p[v], y = lt.p[v + 1], z = lt.p[v + 2], o = base2 + v;
        this.pos[o] = px + T3.x * x + yx * y + zx * z;
        this.pos[o + 1] = py + T3.y * x + yy * y + zy * z;
        this.pos[o + 2] = pz + T3.z * x + yz * y + zz * z;
        const nx = lt.n[v], ny = lt.n[v + 1], nz = lt.n[v + 2];
        this.nor[o] = T3.x * nx + yx * ny + zx * nz;
        this.nor[o + 1] = T3.y * nx + yy * ny + zy * nz;
        this.nor[o + 2] = T3.z * nx + yz * ny + zz * nz;
      }
    }
    const g = this.mesh.geometry;
    g.setDrawRange(0, count * lt.idx.length);
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
  }
  set(pts) {
    if (this.lt) {
      this.setLinks(pts, this.lt);
      return;
    }
    const { T: T3, S, N } = this;
    let len = 0;
    for (let i = 0; i < this.n; i++) {
      const p = pts[Math.min(i, pts.length - 1)];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      T3.subVectors(b, a).normalize();
      S.crossVectors(T3, V(0, 1, 0));
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize();
      N.crossVectors(S, T3).normalize();
      if (i) len += p.distanceTo(pts[Math.min(i - 1, pts.length - 1)]);
      for (let k = 0; k < 4; k++) {
        const sx = k === 0 || k === 3 ? -1 : 1, sy = k < 2 ? -1 : 1, j = (i * 4 + k) * 3;
        this.pos[j] = p.x + S.x * sx * this.w / 2 + N.x * sy * this.h / 2;
        this.pos[j + 1] = p.y + S.y * sx * this.w / 2 + N.y * sy * this.h / 2;
        this.pos[j + 2] = p.z + S.z * sx * this.w / 2 + N.z * sy * this.h / 2;
        const nx = S.x * sx + N.x * sy, ny = S.y * sx + N.y * sy, nz = S.z * sx + N.z * sy, nl = Math.hypot(nx, ny, nz);
        this.nor[j] = nx / nl;
        this.nor[j + 1] = ny / nl;
        this.nor[j + 2] = nz / nl;
        this.uv[(i * 4 + k) * 2] = k / 4;
        this.uv[(i * 4 + k) * 2 + 1] = len / this.tile;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
  }
};
var sight = [];
var inTheWay = (x0, x1, y0, y1, z0, z1, coreOnly = false) => {
  for (const { o, d, len, core } of sight) {
    if (coreOnly && !core) continue;
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) {
        if (oo < a || oo > b) t0 = Infinity;
        continue;
      }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb));
      t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};
var VEG = {
  tree_oak: "round",
  tree_default: "round",
  tree_detailed: "round",
  tree_fat: "fat",
  "tree-high-round": "tall",
  tree: "tall",
  tree_cone: "cone",
  plant_bushLarge: "bush",
  plant_bushDetailed: "bush",
  plant_bush: "bush",
  hedge: "hedge"
};
var LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
var leafTex = (i) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base2 = new THREE3.Color(LEAF[i]), top = base2.clone().offsetHSL(0.012, 0.03, 0.08), bot = base2.clone().offsetHSL(-0.015, 0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString());
  gr.addColorStop(0.42, "#" + base2.getHexString());
  gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad2 = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)";
      g.lineWidth = 2.5;
      g.lineCap = "round";
      g.beginPath();
      g.arc(x + ox, y + rad2 * 0.6, rad2, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
  }
});
var leafMat = (i) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
var barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
var vegGeo = /* @__PURE__ */ new Map();
var lobeGeo = (q2) => {
  const k = "lobe" + q2;
  let g = vegGeo.get(k);
  if (!g) {
    g = new THREE3.SphereGeometry(1, [20, 14, 10][q2], [14, 10, 7][q2]);
    vegGeo.set(k, g);
  }
  return g;
};
var trunkGeo = () => {
  let g = vegGeo.get("trunk");
  if (!g) {
    g = new THREE3.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0);
    vegGeo.set("trunk", g);
  }
  return g;
};
var hedgeGeo = () => {
  let g = vegGeo.get("hedge");
  if (!g) {
    g = new THREE3.BoxGeometry(1, 1, 1, 18, 10, 10);
    const p = g.attributes.position, n = g.attributes.normal;
    const R = [0.106, 0.29, 0.385], v = new THREE3.Vector3(), e = new THREE3.Vector3(), q2 = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      for (let a = 0; a < 3; a++) {
        const c = v.getComponent(a), lim = a === 1 && c < 0 ? 0.5 : 0.5 - R[a];
        q2[a] = THREE3.MathUtils.clamp(c, -lim, lim);
        e.setComponent(a, (c - q2[a]) / R[a]);
      }
      const L = e.length();
      if (L < 1e-6) continue;
      e.divideScalar(L);
      p.setXYZ(i, q2[0] + e.x * R[0], q2[1] + e.y * R[1], q2[2] + e.z * R[2]);
      const nn = new THREE3.Vector3(e.x / R[0], e.y / R[1], e.z / R[2]).normalize();
      n.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.translate(0, 0.5, 0);
    vegGeo.set("hedge", g);
  }
  return g;
};
var yawQ = (a) => new THREE3.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
var vegRad = (k, h) => k === "hedge" ? 1.7 : k === "bush" ? 0.85 * h : k === "tall" ? 0.2 * h : k === "cone" ? 0.27 * h : k === "fat" ? 0.44 * h : 0.39 * h;
var addVeg = (b, k, x, y, z, h, seed, q2 = 0) => {
  const r = rng(Math.abs(Math.floor(seed)) % 2e5 + 7), U2 = (a, c) => a + (c - a) * r();
  const leaf = leafMat(k === "cone" ? 4 : k === "hedge" ? 1 : Math.floor(r() * 4)), lobe = lobeGeo(q2), yaw = r() * 6.28;
  const put = (px, py, pz, rad2, sy = 0.9) => b.add(lobe, leaf, new THREE3.Matrix4().compose(V(x + px, y + py, z + pz), yawQ(r() * 6.28), V(rad2, rad2 * sy, rad2)));
  const trunk = (th, tr) => b.add(trunkGeo(), barkMat(), new THREE3.Matrix4().compose(V(x, y - 0.15, z), yawQ(yaw), V(tr, th + 0.15, tr)));
  const ring = (n, dist, r0, r1, cy, dy) => {
    const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 6.28 / n + U2(-0.35, 0.35), dd = dist * U2(0.85, 1.12);
      put(Math.cos(a) * dd, cy + U2(-dy, dy), Math.sin(a) * dd, U2(r0, r1));
    }
  };
  if (k === "round" || k === "fat") {
    const f = k === "fat";
    trunk((f ? 0.4 : 0.48) * h, 0.055 * h);
    const cy = (f ? 0.58 : 0.64) * h;
    put(0, cy, 0, (f ? 0.29 : 0.26) * h);
    ring(f ? 5 : 4, (f ? 0.22 : 0.18) * h, (f ? 0.19 : 0.17) * h, (f ? 0.23 : 0.21) * h, cy - 0.05 * h, 0.04 * h);
    put(U2(-0.05, 0.05) * h, cy + (f ? 0.15 : 0.17) * h, U2(-0.05, 0.05) * h, (f ? 0.19 : 0.17) * h);
  } else if (k === "tall") {
    trunk(0.34 * h, 0.045 * h);
    put(0, 0.47 * h, 0, 0.17 * h, 1.3);
    put(U2(-0.03, 0.03) * h, 0.65 * h, U2(-0.03, 0.03) * h, 0.15 * h, 1.3);
    put(0, 0.82 * h, 0, 0.11 * h, 1.25);
    ring(3, 0.1 * h, 0.1 * h, 0.12 * h, 0.55 * h, 0.06 * h);
  } else if (k === "cone") {
    trunk(0.2 * h, 0.05 * h);
    put(0, 0.3 * h, 0, 0.26 * h, 0.62);
    put(0, 0.5 * h, 0, 0.2 * h, 0.66);
    put(0, 0.68 * h, 0, 0.14 * h, 0.75);
    put(0, 0.84 * h, 0, 0.08 * h, 1);
  } else if (k === "bush") {
    put(0, 0.46 * h, 0, 0.5 * h);
    ring(3, 0.42 * h, 0.32 * h, 0.38 * h, 0.32 * h, 0.04 * h);
  } else {
    b.add(hedgeGeo(), leaf, new THREE3.Matrix4().compose(V(x, y - 0.06, z), new THREE3.Quaternion(), V(3.3, h + 0.06, Math.max(0.9, h * 0.78))));
  }
};
var BANNER_COL = { "banner-red": "#b8553a", "banner-green": "#4f8a5a" };
var FOLD = 0.27;
var CLOTH_W = 1.1;
var CLOTH_H = 2.6;
var bannerTex = (col) => ctex("bannerHD" + col, 256, 700, (g) => {
  const W = 256, H = 700, base2 = new THREE3.Color(col);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#" + base2.clone().offsetHSL(0, 0, 0.04).getHexString());
  gr.addColorStop(1, "#" + base2.clone().offsetHSL(0, 0, -0.06).getHexString());
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) {
    const s = Math.sin(x / W * (CLOTH_W / FOLD) * Math.PI * 2);
    g.fillStyle = s > 0 ? `rgba(255,235,215,${0.1 * s})` : `rgba(60,15,15,${-0.12 * s})`;
    g.fillRect(x, 0, 1, H);
  }
  g.fillStyle = "#" + base2.clone().offsetHSL(0, -0.05, -0.12).getHexString();
  g.fillRect(0, 0, W, 54);
  g.strokeStyle = "#d1aa5c";
  g.lineWidth = 9;
  g.strokeRect(20, 66, W - 40, H - 86);
  g.strokeStyle = "rgba(60,30,20,0.45)";
  g.lineWidth = 2;
  g.strokeRect(14, 60, W - 28, H - 74);
  g.strokeRect(26, 72, W - 52, H - 98);
  g.fillStyle = "#d1aa5c";
  g.fillRect(0, 46, W, 8);
  const cx = W / 2, cy = 250;
  g.fillStyle = "#efe2c2";
  g.beginPath();
  g.arc(cx, cy, 62, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(60,30,20,0.55)";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "#d1aa5c";
  g.beginPath();
  g.moveTo(cx, cy - 46);
  g.lineTo(cx + 34, cy);
  g.lineTo(cx, cy + 46);
  g.lineTo(cx - 34, cy);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(60,30,20,0.6)";
  g.lineWidth = 2.5;
  g.stroke();
});
var bannerGeo = () => {
  let geo = vegGeo.get("banner");
  if (!geo) {
    const w = CLOTH_W, hh2 = CLOTH_H, notch = 0.42;
    geo = new THREE3.PlaneGeometry(w, hh2, 16, 20).translate(0, -hh2 / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = -y / hh2;
      p.setY(i, y + notch * (1 - Math.abs(x) / (w / 2)) * t * t);
      p.setZ(i, (0.025 + 0.055 * t) * Math.sin(x / FOLD * Math.PI * 2 + 0.6) + 0.04 * t * t);
    }
    geo.computeVertexNormals();
    vegGeo.set("banner", geo);
  }
  return geo;
};
var bannerProp = (b, name, x0, y, z0, h, yaw0) => {
  const off = 0.4 * (h / 0.84), x = x0 + Math.cos(yaw0) * off, z = z0 - Math.sin(yaw0) * off, yaw = yaw0 + Math.PI / 2;
  if (inTheWay(x - 0.7, x + 0.7, y, y + h, z - 0.7, z + 0.7, true)) return;
  const col = BANNER_COL[name] ?? "#b4524b";
  const M = (px, py, pz) => new THREE3.Matrix4().makeRotationY(yaw).setPosition(x, y, z).multiply(new THREE3.Matrix4().makeTranslation(px, py, pz));
  const pole = lam("bannerPole", () => ({ color: "#6e4b33" })), gold = lam("bannerGold", () => ({ color: "#c9a24e" }));
  b.add(new THREE3.CylinderGeometry(0.045, 0.06, h, 10).translate(0, h / 2, 0), pole, M(0, 0, 0));
  b.add(new THREE3.SphereGeometry(0.1, 14, 10), gold, M(0, h + 0.06, 0));
  b.add(new THREE3.CylinderGeometry(0.03, 0.03, CLOTH_W + 0.2, 8).rotateZ(Math.PI / 2), pole, M(0, h - 0.18, 0.06));
  for (const s of [-1, 1]) b.add(new THREE3.SphereGeometry(0.045, 10, 8), gold, M(s * (CLOTH_W / 2 + 0.12), h - 0.18, 0.06));
  b.add(bannerGeo(), lam("bannerHD" + col, () => ({ map: bannerTex(col), side: THREE3.DoubleSide })), M(0, h - 0.2, 0.1));
};
var boxes = /* @__PURE__ */ new Map();
var prop = (b, kit, name, x, y, z, h, yaw = 0) => {
  if (name.startsWith("banner")) {
    bannerProp(b, name, x, y, z, h, yaw);
    return;
  }
  const vk = VEG[name];
  if (vk) {
    const rad2 = vegRad(vk, h);
    if (inTheWay(x - rad2, x + rad2, y, y + h, z - rad2, z + rad2, true)) return;
    const d = Math.hypot(x, z);
    addVeg(b, vk, x, y, z, h, x * 92.7 + z * 31.3 + yaw * 1e3, d > 200 ? 2 : Math.abs(z) > 45 && d > 60 ? 1 : 0);
    return;
  }
  const o = kit[name];
  if (!o) return;
  let box = boxes.get(o);
  if (!box) {
    box = new THREE3.Box3().setFromObject(o);
    boxes.set(o, box);
  }
  const s = h / Math.max(0.01, box.max.y - box.min.y), r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * s * 0.5;
  if (inTheWay(x - r, x + r, y, y + h, z - r, z + r, true)) return;
  b.addObject(o, new THREE3.Matrix4().compose(V(x, y - box.min.y * s, z), new THREE3.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s)));
};
var kitClone = (kit, name, h) => {
  const vk = VEG[name];
  if (vk) {
    const vb = new Batch(), grp = new THREE3.Group();
    addVeg(vb, vk, 0, 0, 0, h, name.length * 977 + h * 131, 0);
    vb.build(grp, false);
    grp.traverse((x) => {
      const m = x;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = true;
        m.matrixAutoUpdate = true;
      }
    });
    return grp;
  }
  const o = kit[name];
  if (!o) return null;
  let box = boxes.get(o);
  if (!box) {
    box = new THREE3.Box3().setFromObject(o);
    boxes.set(o, box);
  }
  const c = o.clone(true), s = h / Math.max(0.01, box.max.y - box.min.y);
  c.traverse((x) => {
    const m = x;
    if (m.isMesh) {
      m.material = toLambert(Array.isArray(m.material) ? m.material[0] : m.material);
      m.castShadow = false;
      m.receiveShadow = true;
    }
  });
  const g = new THREE3.Group();
  c.position.y = -box.min.y * s;
  c.scale.setScalar(s);
  g.add(c);
  return g;
};
var STYLES = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },
  // cream
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },
  // ochre
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },
  // muted brick-red plaster
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true },
  // cream timber frame
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },
  // straw ochre
  { wall: "#cc9a6c", shutter: "#3f6fb5", roof: "#8e7aa0" },
  // terracotta sand
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },
  // warm sandstone
  { wall: "#e3d2b8", shutter: "#2f6a43", roof: "#8f97a8", brick: true }
];
var roofMat = (col) => lam("roof" + col, () => ({ map: roofHD(col, col === "#8f97a8"), side: THREE3.DoubleSide }));
var house = (b, x, z, yaw, w, d, h, si, y = D0) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.6, hz = (across ? w : d) / 2 + 0.6;
  if (inTheWay(x - hx, x + hx, y, y + h + d * 0.42 + 1.2, z - hz, z + hz)) return;
  const st = STYLES[si % STYLES.length];
  const m = new THREE3.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const front2 = lam(`hf${si}_${w}_${h}`, () => ({ map: facadeHD(`hf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`hs${si}_${h}`, () => ({ map: facadeHD(`hs${si}_${h}`, 8, h, st) }));
  const wall = lam("wall" + st.wall, () => ({ color: st.brick ? "#c8643f" : st.wall }));
  const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front2, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0)), wall, m);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0)), wall, m);
  const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4, rm = roofMat(st.roof);
  b.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), ru, rv), rm, m);
  b.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), ru, rv), rm, m);
  const cx = hw * 0.45 * (si % 2 ? 1 : -1);
  b.add(boxGeo(V(cx - 0.4, h + rh * 0.3, -hd * 0.35 - 0.4), V(cx + 0.4, h + rh + 1.1, -hd * 0.35 + 0.4), 2), lam("chim", () => ({ map: rep(brick(), 1, 1) })), m);
  houseDetail(b, m, w, d, h, rh, cx);
};
var UB = new THREE3.BoxGeometry(1, 1, 1);
var trimM = () => lam("trimStone", () => ({ color: "#efe3c8" }));
var capM = () => lam("chimCap", () => ({ color: "#9a8778" }));
var plinthM = () => lam("plinthHD", () => ({ map: stoneHD("copeHD") }));
var ub = (b, mat, m, x0, x1, y0, y1, z0, z1) => b.add(UB, mat, m.clone().multiply(new THREE3.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE3.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0))));
var houseDetail = (b, m, w, d, h, rh, chx) => {
  const hw = w / 2, hd = d / 2, tm = trimM(), floors = Math.max(1, Math.floor(h / 2.8));
  b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd + 0.07), 2), plinthM(), m);
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, hd, hd + 0.17);
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, -hd - 0.17, -hd);
  for (const s of [-1, 1]) ub(b, tm, m, s < 0 ? -hw - 0.17 : hw, s < 0 ? -hw : hw + 0.17, h - 0.52, h - 0.25, -hd - 0.12, hd + 0.12);
  const wins = (len, door, at, out) => {
    const n = Math.max(1, Math.floor(len / 2.2));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
      const [px, pz] = at((i + 0.5) / n), yb = fl * 2.8 + 0.9;
      if (door && fl === 0 && i === Math.floor(n / 2)) {
        const along = (k) => [px + out[1] * k, pz - out[0] * k];
        const [ax, az] = along(-0.82), [bx, bz] = along(0.82), [cx2, cz2] = along(-0.78), [dx2, dz2] = along(0.78);
        ub(b, plinthM(), m, Math.min(ax, bx, ax + out[0] * 0.5), Math.max(ax, bx, ax + out[0] * 0.5), 0, 0.2, Math.min(az, bz, az + out[1] * 0.5), Math.max(az, bz, az + out[1] * 0.5));
        ub(b, tm, m, Math.min(cx2, dx2, cx2 + out[0] * 0.34), Math.max(cx2, dx2, cx2 + out[0] * 0.34), 2.3, 2.44, Math.min(cz2, dz2, cz2 + out[1] * 0.34), Math.max(cz2, dz2, cz2 + out[1] * 0.34));
        continue;
      }
      for (const [y0, y1, dep, half] of [[yb - 0.2, yb - 0.08, 0.14, 0.6], [yb + 1.33, yb + 1.43, 0.08, 0.55]]) {
        const ax = px - out[1] * half, az = pz + out[0] * half, bx = px + out[1] * half, bz = pz - out[0] * half;
        ub(b, tm, m, Math.min(ax, bx, ax + out[0] * dep), Math.max(ax, bx, ax + out[0] * dep), y0, y1, Math.min(az, bz, az + out[1] * dep), Math.max(az, bz, az + out[1] * dep));
      }
    }
  };
  wins(w, true, (u) => [-hw + u * w, hd], [0, 1]);
  wins(8, false, (u) => [hw - u * w, -hd], [0, -1]);
  wins(8, false, (u) => [-hw, -hd + u * d], [-1, 0]);
  wins(8, false, (u) => [hw, hd - u * d], [1, 0]);
  const cz = -hd * 0.35, top = h + rh + 1.1;
  ub(b, capM(), m, chx - 0.52, chx + 0.52, top, top + 0.16, cz - 0.52, cz + 0.52);
  b.add(new THREE3.CylinderGeometry(0.13, 0.16, 0.42, 10).translate(0, 0.21, 0), lam("chimPot", () => ({ color: "#b8684a" })), m.clone().multiply(new THREE3.Matrix4().makeTranslation(chx, top + 0.16, cz)));
};
var chapelTex = () => ctex("chapel", 512, 512, (g) => {
  g.fillStyle = "#e9e0cc";
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(0,0,0,.06)";
  for (let y = 0; y < 512; y += 32) g.fillRect(0, y, 512, 2);
  for (const cx of [128, 384]) {
    g.fillStyle = "#33406b";
    g.strokeStyle = "rgba(40,30,40,.85)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx - 40, 430);
    g.lineTo(cx - 40, 190);
    g.arc(cx, 190, 40, Math.PI, 0);
    g.lineTo(cx + 40, 430);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(160,200,255,.35)";
    g.fillRect(cx - 30, 200, 16, 220);
    g.strokeStyle = "#d9c9a0";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(cx, 160);
    g.lineTo(cx, 430);
    g.moveTo(cx - 40, 300);
    g.lineTo(cx + 40, 300);
    g.stroke();
  }
});
var clockTex = () => ctex("clock", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1";
  g.strokeStyle = "#221f2e";
  g.lineWidth = 12;
  g.beginPath();
  g.arc(128, 128, 112, 0, 7);
  g.fill();
  g.stroke();
  g.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a));
    g.lineTo(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a));
    g.stroke();
  }
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(128, 128);
  g.lineTo(128, 62);
  g.stroke();
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(128, 128);
  g.lineTo(178, 150);
  g.stroke();
});
var flagTex = () => ctex("flagStGeorge", 256, 160, (g) => {
  g.fillStyle = "#f4f0e6";
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#c8323a";
  g.fillRect(0, 62, 256, 36);
  g.fillRect(110, 0, 36, 160);
  g.fillStyle = "rgba(120,100,90,0.10)";
  g.fillRect(0, 150, 256, 10);
});
var inPark = (x, z) => z < 0 && x > 46 && x < 96 && z > -100 && z < -49;
var inMill = (x, z) => z < 0 && x > -66 && x < -14 && z > -90 && z < -54;
var inChurch = (x, z) => z > 0 && x > 10 && x < 38 && z > 46 && z < 84 || z > 0 && x > 86 && x < 110 && z > 60 && z < 84;
var buildTown = (root, kit, rays = []) => {
  const b = new Batch(), r = rng(11);
  sight = rays;
  const pick2 = (a) => a[Math.floor(r() * a.length) % a.length];
  for (const bank of [-1, 1]) {
    const away = bank > 0 ? Math.PI : 0;
    for (const sx of [-1, 1]) {
      let x = 8.5;
      while (x < 134) {
        const w = pick2([7, 9]), h = pick2([7, 8.4, 9.8]), cx = sx * (x + w / 2), cz = bank * 40.5;
        house(b, cx, cz, away, w, 8, h, Math.floor(r() * 8));
        x += w + (r() < 0.25 ? 2.5 : 0.25);
      }
    }
    for (const sx of [-1, 1]) {
      let z = 46;
      while (z < 150) {
        const w = pick2([7, 9]), h = pick2([7, 8.4, 9.8]);
        if (!inChurch(sx * 10, bank * (z + w / 2))) house(b, sx * 10, bank * (z + w / 2), sx < 0 ? Math.PI / 2 : -Math.PI / 2, w, 8, h, Math.floor(r() * 8));
        z += w + (r() < 0.2 ? 3 : 0.3);
      }
    }
    for (const zf of [52, 66, 80, 96]) for (const sx of [-1, 1]) {
      let x = 17 + r() * 4;
      while (x < 124) {
        const w = pick2([7, 9]), h = pick2([7, 8.4, 9.8]), cx = sx * (x + w / 2), cz = bank * (zf + 4 + r() * 2);
        if (r() > 0.22 && !inPark(cx, cz) && !inMill(cx, cz) && !inChurch(cx, cz)) house(b, cx, cz, away, w, 8, h, Math.floor(r() * 8));
        x += w + 1 + r() * 4;
      }
    }
  }
  const ch = lam("chapel", () => ({ map: chapelTex() })), st = lam("towerstone", () => ({ map: stoneHD("tstoneHD") }));
  b.add(boxGeo(V(18.5, D0, 57), V(29.5, D0 + 9, 80), 6), ch);
  const sl = roofMat("#8f97a8");
  b.add(quad(V(18.1, D0 + 8.8, 57), V(18.1, D0 + 8.8, 80.4), V(24, D0 + 13.5, 80.4), V(24, D0 + 13.5, 57), 6, 2), sl);
  b.add(quad(V(29.9, D0 + 8.8, 80.4), V(29.9, D0 + 8.8, 57), V(24, D0 + 13.5, 57), V(24, D0 + 13.5, 80.4), 6, 2), sl);
  b.add(tri(V(18.5, D0 + 9, 80), V(29.5, D0 + 9, 80), V(24, D0 + 13.5, 80)), st);
  b.add(boxGeo(V(21.4, D0, 51.6), V(26.6, D0 + 19, 57), 4), st);
  b.add(boxGeo(V(21.1, D0 + 18.6, 51.3), V(26.9, D0 + 19.4, 57.3), 4), st);
  const spire = new THREE3.ConeGeometry(4, 13, 4, 1);
  spire.rotateY(Math.PI / 4);
  b.add(spire, sl, new THREE3.Matrix4().makeTranslation(24, D0 + 19.4 + 6.5, 54.3));
  b.add(tri(V(29.5, D0 + 9, 57), V(18.5, D0 + 9, 57), V(24, D0 + 13.5, 57)), st);
  b.add(quad(V(25.1, D0 + 12.4, 51.55), V(22.9, D0 + 12.4, 51.55), V(22.9, D0 + 14.6, 51.55), V(25.1, D0 + 14.6, 51.55)), lam("clock", () => ({ map: clockTex(), alphaTest: 0.5 })));
  const mill = lam("mill", () => ({ map: facadeHD("mill", 30, 13, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
  const millS = lam("mills", () => ({ map: facadeHD("mills", 12, 13, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
  b.add(quad(V(-58, D0, -70), V(-28, D0, -70), V(-28, D0 + 13, -70), V(-58, D0 + 13, -70)), mill);
  b.add(quad(V(-28, D0, -82), V(-58, D0, -82), V(-58, D0 + 13, -82), V(-28, D0 + 13, -82)), mill);
  b.add(quad(V(-58, D0, -82), V(-58, D0, -70), V(-58, D0 + 13, -70), V(-58, D0 + 13, -82)), millS);
  b.add(quad(V(-28, D0, -70), V(-28, D0, -82), V(-28, D0 + 13, -82), V(-28, D0 + 13, -70)), millS);
  b.add(quad(V(-58.4, D0 + 12.8, -69.6), V(-27.6, D0 + 12.8, -69.6), V(-27.6, D0 + 16.5, -76), V(-58.4, D0 + 16.5, -76), 8, 2), sl);
  b.add(quad(V(-27.6, D0 + 12.8, -82.4), V(-58.4, D0 + 12.8, -82.4), V(-58.4, D0 + 16.5, -76), V(-27.6, D0 + 16.5, -76), 8, 2), sl);
  b.add(tri(V(-58, D0 + 13, -82), V(-58, D0 + 13, -70), V(-58, D0 + 16.5, -76)), millS);
  b.add(tri(V(-28, D0 + 13, -70), V(-28, D0 + 13, -82), V(-28, D0 + 16.5, -76)), millS);
  const chim = lam("chimney", () => ({ map: rep(brick(), 2, 8) })), soot = lam("soot", () => ({ color: "#4a3442" }));
  for (const [x, z, hh2] of [[-22, -77, 30], [-80, 93, 24]]) {
    b.add(new THREE3.CylinderGeometry(0.95, 1.35, hh2, 14, 1, true), chim, new THREE3.Matrix4().makeTranslation(x, D0 + hh2 / 2, z));
    b.add(new THREE3.CylinderGeometry(1.15, 1.1, 1.3, 14), soot, new THREE3.Matrix4().makeTranslation(x, D0 + hh2 + 0.3, z));
  }
  house(b, -80, 100, Math.PI, 16, 10, 9.8, 7);
  const hill = new THREE3.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  [
    [-360, 250, 190, 52, 120],
    [140, 380, 240, 64, 140],
    [430, 150, 170, 48, 130],
    [-440, -130, 190, 44, 150],
    [-90, -390, 250, 58, 140],
    [320, -330, 210, 54, 130],
    [520, -60, 160, 40, 120],
    [-560, 60, 200, 46, 140]
  ].forEach(([x, z, sx, sy, sz], i) => b.add(hill, hm[i % 3], new THREE3.Matrix4().compose(V(x, D0 - 2, z), new THREE3.Quaternion(), V(sx, sy, sz))));
  const trees = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree-high-round", "tree"];
  for (const bank of [-1, 1]) for (let x = -130; x <= 130; x += 22) if (Math.abs(x) > 12) prop(b, kit, pick2(trees), x + r() * 4, D0, bank * 33.6, 7 + r() * 2.5, r() * 6);
  for (let i = 0; i < 140; i++) {
    const x = (r() - 0.5) * 520, z = (r() < 0.5 ? -1 : 1) * (48 + r() * 220);
    if (inPark(x, z) || inMill(x, z) || inChurch(x, z) || Math.abs(x) < 16) continue;
    prop(b, kit, pick2(trees), x, D0, z, 7 + r() * 4, r() * 6);
  }
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = 230 + r() * 160;
    prop(b, kit, pick2(["tree_cone", "tree_default", "tree_oak"]), Math.cos(a) * d * 1.3, D0, Math.sin(a) * d, 12 + r() * 6, r() * 6);
  }
  for (const bank of [-1, 1]) {
    for (let x = -126; x <= 126; x += 12) if (Math.abs(x) > 5) prop(b, kit, "lantern", x, D0, bank * 31, 2.8);
    prop(b, kit, "banner-red", 5.4, D0, bank * 31.6, 3.6, bank > 0 ? Math.PI : 0);
  }
  prop(b, kit, "stall-red", -14, D0, -34, 3.2);
  prop(b, kit, "stall-green", -21.5, D0, -34.4, 3.2, 0.1);
  prop(b, kit, "cart", 17, D0, -34, 2.2, 1.2);
  prop(b, kit, "stall-bench", 20, D0, -32.2, 1);
  prop(b, kit, "stall-green", 16, D0, 34, 3.2, Math.PI);
  prop(b, kit, "stall-red", 23.5, D0, 34.3, 3.2, Math.PI);
  prop(b, kit, "cart", -15, D0, 33.6, 2.2, 2.4);
  prop(b, kit, "windmill", 98, D0, 72, 16, -0.6);
  prop(b, kit, "canoe", -19, 0.02, 27.6, 0.7, 1.5);
  prop(b, kit, "canoe", 31, 0.02, -28.2, 0.7, -1.4);
  for (let i = 0; i < 14; i++) prop(b, kit, "lily_large", (r() - 0.5) * 120, 0.03, (r() < 0.5 ? -1 : 1) * (27.2 + r() * 2.2), 0.08, r() * 6);
  for (const [n, x, z, h] of [
    ["tree_oak", 58, -66, 9.5],
    ["tree_fat", 84, -64, 8],
    ["tree_detailed", 54, -84, 9],
    ["tree_default", 88, -86, 9],
    ["tree_oak", 79, -95, 10],
    ["tree-high-round", 61, -94, 9],
    ["tree_default", 92, -73, 8.5]
  ]) prop(b, kit, n, x, D0, z, h, x);
  for (let x = 50; x < 92; x += 3.2) prop(b, kit, "hedge", x, D0, -57, 1.5);
  for (const [x, z] of [[62, -76], [77, -71], [66, -82], [75, -80], [57, -73]]) prop(b, kit, pick2(["plant_bushLarge", "plant_bushDetailed", "plant_bush"]), x, D0, z, 1.3);
  for (let i = 0; i < 26; i++) {
    const f = pick2(["flower_redA", "flower_yellowA", "flower_purpleA"]), x = 56 + r() * 30, z = -60 - r() * 32;
    if (Math.hypot(x - 70, z + 75) > 4) prop(b, kit, f, x, D0, z, 0.5);
  }
  prop(b, kit, "stall-bench", 76.5, D0, -79.5, 1, Math.PI);
  prop(b, kit, "lantern", 64.5, D0, -71, 2.8);
  b.build(root);
  sight = [];
};

// src/toon.ts
var INK = "#241726";
var SKIN = "#ffe2c2";
var WHITE = "#ffffff";
var MOUTH = "#5a1e28";
var TONGUE = "#e86e78";
var SH_SKIN = [0.96, 0.86, 0.84];
var SH_CLOTH = [0.64, 0.66, 0.74];
var SH_FELT = [0.62, 0.62, 0.7];
var rad = (d) => d * Math.PI / 180;
var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
var mul = (c, m) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v, k) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch(n >> 16 & 255, m[0])}${ch(n >> 8 & 255, m[1])}${ch(n & 255, m[2])}`;
};
var shade = (c, k) => mul(c, [k, k, k]);
var mix2 = (a, b, t) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round((A >> s & 255) * (1 - t) + (B >> s & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
var rnd = (seed, k) => {
  const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var rotPts = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
var rotAbout = (q2, a, c) => rotPts([q2], a, c[0], c[1])[0];
var lerp22 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
var curve = (a, k, b, n = 10) => {
  const c = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};
var RIFLEMAN = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
var OFFICER = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
var KID = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
var PARENT = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
var SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];
var soldier = (v = 0, extra = {}) => {
  const o = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};
var vikingfolk = (v = 0) => {
  const tunics = ["#8c3b2e", "#3f5f7a", "#5d6b3a", "#7a5a3a", "#6a4a7a", "#a0703a"];
  const o = { jacket: tunics[v % 6], pants: "#4e4234", boots: "#3e2c1e", belt: "#6b4a2b", skin: SKINS[v % 4], hat: "viking" };
  return v % 3 === 2 ? { ...o, hat: "hair", hair: ["#c9a24a", "#8a5a2b", "#d8b76a"][v % 3] } : { ...o, moustache: ["#c9a24a", "#8a5a2b", "#5a3b22"][v % 3] };
};
var townsfolk = (v = 0) => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};
var Pen = class {
  g;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot = null;
  constructor(g) {
    this.g = g;
  }
  P(x, y) {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts, close) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = this.P(p[0], p[1]);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts, fill, ol) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (w) {
      g.lineWidth = w;
      g.strokeStyle = INK;
      g.lineJoin = "round";
      g.stroke();
    }
  }
  ell(cx, cy, rx, ry, fill, ol, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts, fill, w, ink = true) {
    const g = this.g;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (ink) {
      this.path(pts, false);
      g.strokeStyle = INK;
      g.lineWidth = w + 2 * this.ol * 0.9;
      g.stroke();
    }
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
  }
  stroke(pts, w, fill = INK) {
    const g = this.g;
    g.lineCap = "round";
    g.lineJoin = "round";
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
  }
  arc(cx, cy, rx, ry, a0, a1, w, fill = INK) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + (a1 - a0) * i / 24)), cy + ry * Math.sin(rad(a0 + (a1 - a0) * i / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx, cy, r, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath();
    this.g.arc(x, y, r, 0, Math.PI * 2);
    this.g.fillStyle = fill;
    this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts, fn) {
    const g = this.g;
    g.save();
    this.path(pts, true);
    g.clip();
    fn();
    g.restore();
  }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts, base2, shadow, light, R, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
    }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base2);
    gr.addColorStop(r0 / r1, base2);
    gr.addColorStop(1, shadow);
    this.path(pts, true);
    g.fillStyle = gr;
    g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts, base2, shadow, light, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
      const d = x * dx + y * dy;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base2);
    gr.addColorStop(flat, base2);
    gr.addColorStop(1, shadow);
    this.path(pts, true);
    g.fillStyle = gr;
    g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts, w0, thick, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) {
      cx += x / n;
      cy += y / n;
    }
    const out = [], inn = [];
    pts.forEach((q2, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q2[1] - cy, q2[0] - cx) - thick));
      out.push([q2[0] + nx * h, q2[1] + ny * h]);
      inn.push([q2[0] - nx * h, q2[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r) => {
      r.forEach(([x0, y0], i) => {
        const [x, y] = this.P(x0, y0);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.closePath();
    };
    g.beginPath();
    trace(out);
    trace(inn.reverse());
    g.fillStyle = col;
    g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts, fill, w, rim, cap = "butt") {
    const g = this.g;
    g.lineCap = cap;
    g.lineJoin = "round";
    this.path(pts, false);
    g.strokeStyle = INK;
    g.lineWidth = w + 2 * rim;
    g.stroke();
    this.path(pts, false);
    g.strokeStyle = fill;
    g.lineWidth = w;
    g.stroke();
    g.lineCap = "round";
  }
};
var ellPts = (cx, cy, rx, ry, a0 = 0, a1 = 360, rot = 0, n = 48) => {
  const r = rad(rot), pts = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + (a1 - a0) * i / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};
var rrect = (x0, y0, x1, y1, r, n = 8) => {
  const pts = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + 90 * i / n)), cy + r * Math.sin(rad(a + 90 * i / n))]);
  return pts;
};
var taper = (p, a, b, wa, wb, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([
    [a[0] + nx * wa / 2, a[1] + ny * wa / 2],
    [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2],
    [a[0] - nx * wa / 2, a[1] - ny * wa / 2]
  ], col, 0);
  p.dot(a[0], a[1], wa / 2, col);
  p.dot(b[0], b[1], wb / 2, col);
};
var blobPts = (cx, cy, B, n = 72) => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};
var headBlob = (seed, a = 118, facing = 0) => ({
  a,
  b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5),
  nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)),
  noise: 8e-3,
  seed
});
var thickAngle = (light) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
var DEF_LIGHT = rad(-120);
var FACE = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" }
};
var halfLid = (k) => k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k;
var eyeKind = (k, lid) => lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
var lidOf = (b) => b === true ? 1 : Number(b) || 0;
var eye = (p, kind, x, ey, u, side, look, skin) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot":
      p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0);
      break;
    case "small":
      p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0);
      break;
    case "lid":
      p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw);
      break;
    case "slit":
      p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw);
      break;
    case "happy":
      p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw);
      break;
    case "dash":
      p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw);
      break;
    case "squeeze":
      p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw);
      break;
    case "shock":
    case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u);
      p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") {
        p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360);
        p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u);
      }
      break;
    default: {
      const s = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};
var dmouth = (p, mx, y, rx, ry, u, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};
var mouth = (p, kind, mx, my, u, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash":
      p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw);
      break;
    case "frown":
      p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw);
      break;
    case "smirk":
      p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw);
      break;
    case "smile":
      p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw);
      break;
    case "smileWide":
      p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw);
      break;
    case "grin":
      dmouth(p, mx, my - u, 12 * u * k, 8 * u, u);
      break;
    case "laugh":
      dmouth(p, mx, my, 16 * u * k, 11 * u, u, true);
      break;
    case "o":
      p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u);
      break;
    case "O":
      p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u);
      break;
    case "wave": {
      const s = [];
      for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]);
      p.stroke(s, 3 * u);
      break;
    }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick":
      p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw);
      p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u);
      break;
  }
};
var faceFront = (p, cx, cy, W, expr, facing, look, lid, brim, skin, moustache, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};
var faceSide = (p, hx, hy, W, expr, lid, brim, skin, moustache, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};
var BONNET = "#e9cf8f";
var BONNET_BRIM = "#d6b46a";
var hatBehind = (p, o, H, cx, hc, light, thick, ow, side) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};
var hatOn = (p, o, hp, H, cx, hc, light, seed, facing, side) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5));
  const R = (pts) => rotPts(pts, a, cx, hc);
  const sag = (yb, wb) => {
    const base2 = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      base2.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]);
    }
    return base2;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = a * 180 / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg);
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg);
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x, y) => y < cut || side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b;
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03]);
    if (arc.length < 3) return;
    if (o.hat === "hair") {
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap : o.hair;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = a * 180 / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "viking") {
    const yb = crown + 0.36 * HH, ht = 0.42 * HH, wb = 0.5 * W;
    const dome = [];
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI * (i / 16);
      dome.push([cx - wb * Math.cos(t), yb - ht * Math.sin(t)]);
    }
    const body = R(dome);
    p.shadedFill(body, "#a7afb8", "#6f7780", light, wb, 0.45);
    p.poly(body, null, ow);
    p.band(R([[cx - wb - 2 * u, yb - 0.02 * HH], [cx + wb + 2 * u, yb - 0.02 * HH]]), "#8c7a5b", 0.07 * HH, 1.4 * u);
    if (!side) p.band(R([[cx + 2 * u * facing, yb - 0.04 * HH], [cx + 2 * u * facing, yb + 0.2 * HH]]), "#8f98a3", 7 * u, 1.4 * u);
    else p.band(R([[cx + 30 * u, yb - 0.04 * HH], [cx + 30 * u, yb + 0.16 * HH]]), "#8f98a3", 6 * u, 1.4 * u);
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, a * 180 / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};
var BUILD = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1, tw: 0.72 }
};
var footStroke = (p, a, b, w, col) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
var bodyFront = (p, o, opts) => {
  const {
    phase = 0,
    expr = "neutral",
    mode = "march",
    look = 0,
    blink = false,
    lift = 60,
    prop: prop2 = null,
    tilt = 0,
    headTilt = 0,
    wave,
    light = DEF_LIGHT,
    facing = 0,
    seed = 1
  } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix2(o.pants, INK, 0.55), armCol = mix2(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h = [300 + side * 15 * u, hipY], k = [300 + side * 36 * u, hipY + 0.2 * HH], f = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]]
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T3 = {
    a: Bd.tw / 2 * W / 1.06,
    b: 0.5 * (torsoBot - (chin - 0.25 * HH)),
    nTop: 2.2,
    nBot: 2.6,
    egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing,
    rot: 0,
    noise: 6e-3,
    seed: seed + 7
  };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T3.b, tp = blobPts(tcx, tcy, T3);
  const sh = (side) => [tcx + side * 0.85 * T3.a, chin + 0.12 * HH];
  const hang = (side, fwd) => {
    const S = sh(side), ex = tcx + side * (1.12 * T3.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  const R0 = [300 + 47 * u, torsoBot + 0.12 * HH], R1 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  const arms = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T3.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T3.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T3.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T3.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop2 === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp22(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T3.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== void 0) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T3.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T3.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop2 === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T3.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T3.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop2)) {
      const S = sh(1), k = clamp(prop2[1], 0, 1);
      const E = lerp22([tcx + 1.1 * T3.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T3.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp22([tcx + 1.15 * T3.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T3.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u);
  };
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp22(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0 = [tcx - 0.75 * T3.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  if (dress) {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * (sole - 0.35 * HH - (chin - 0.2 * HH)), nTop: 2, nBot: 3, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 6e-3, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress, mul(o.dress, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 6e-3, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T3.a, chin - 0.05 * HH], [tcx + s * 0.8 * T3.a, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T3.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T3.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T3.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK);
        p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) {
      const s = facing || 1;
      p.poly([[tcx + s * 0.55 * T3.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T3.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T3.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u);
    }
    p.inkRing(tp, ow, thick);
  }
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop2 === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop2)) {
      const ang = rad(-70 + 105 * clamp(prop2[1], 0, 1));
      const Rh = (pts) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop2 === "shako") {
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};
var ik = (hip, ank, l1, l2) => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};
var SWING_HIP = 733;
var bodySide = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp: stomp2 = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix2(o.pants, INK, 0.55), farCol = mix2(o.pants, INK, 0.75), footCol = o.boots;
  const legs = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S2 = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp2 - 1));
    const st = (ph) => {
      const c = ((phase + ph) % 1 + 1) % 1;
      if (c < 0.5) {
        const s2 = c / 0.5;
        return { x: S2 / 2 - S2 * s2, h: 0, stance: true, s: s2 };
      }
      const s = (c - 0.5) / 0.5;
      return { x: -S2 / 2 + S2 * s - S2 / Math.PI * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near2] of [[fL, false], [nL, true]])
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near: near2 });
    lean = 4 + 3 * Math.cos(2 * two * phase);
    nearFwd = nL.x / (S2 / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near2] of [[-6, false], [0, true]]) {
      const knee = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near: near2 });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? [300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] : ik(hip, L.ank, l1, l2);
    const hp0 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(
      p,
      [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s],
      [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u,
      L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82)
    );
  }
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T3 = {
    a: (o.build === "stout" ? 0.36 : 0.31) * W,
    b: 0.5 * (torsoBot - (chin - 0.25 * HH)),
    nTop: 2.2,
    nBot: 2.5,
    egg: 0.1,
    asym: 0.06,
    rot: 0,
    noise: 6e-3,
    seed: seed + 7
  };
  const tcx = 300 + 2 * u, tcy = torsoBot - T3.b, tp = blobPts(tcx, tcy, T3);
  const armCol = mix2(o.jacket, INK, 0.5), farArm = mix2(o.jacket, INK, 0.68);
  const S = [tcx + 0.05 * T3.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang) => {
    const e = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0 = [tcx + 0.72 * T3.a, chin + 0.58 * HH], B1 = [tcx - 0.95 * T3.a - 22 * u, crown - 0.4 * HH];
  let near, far;
  if (mode === "swing") {
    near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]];
    far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]];
  } else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) {
    near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0];
    far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0);
  } else {
    near = swingArm(rad(-30) * nearFwd);
    far = mode === "march" ? swingArm(rad(30) * nearFwd) : null;
  }
  if (far) {
    p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm);
    p.dot(far[2][0], far[2][1], 5.5 * u);
  }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T3.a, chin - 0.05 * HH], [tcx + 0.75 * T3.a, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T3.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T3.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) {
      const y = chin + 0.16 * HH + i * 0.24 * HH;
      p.dot(tcx + 0.8 * T3.a, y, 3 * u, INK);
      p.dot(tcx + 0.8 * T3.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
    }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp22(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol);
  p.dot(near[2][0], near[2][1], 5.5 * u);
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};
var swingKid = (p, o, kick, expr, light = DEF_LIGHT, blink = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};
var fxNote = (p, kind, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};
var fxBurst = (p, t, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad(i * 360 / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([
      [c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)],
      [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]
    ], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};
var fxSplash = (p, t) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + 660 * i / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};
var fxStars = (p, t) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + i * Math.PI / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90);
      pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]);
    }
    p.poly(pts, "#ffd84a", 6);
  }
};
var fxCreak = (p, t) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([
      [150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)],
      [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]
    ], 10);
  }
};
var fxRing = (p, t) => {
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath();
    g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa";
    g.lineWidth = 9 * (1 - u) + 3;
    g.stroke();
  }
};
var fxSign = (p) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath();
  g.moveTo(112, 470);
  g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK;
  g.lineWidth = 16;
  g.lineCap = "round";
  g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};
var fxShadow = (p, col) => {
  const g = p.g;
  g.fillStyle = WHITE;
  g.fillRect(0, 0, 128, 256);
  g.save();
  g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix2(col, WHITE, 0.08));
  lg.addColorStop(0.55, mix2(col, WHITE, 0.3));
  lg.addColorStop(1, mix2(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath();
  g.moveTo(40, 205);
  g.bezierCurveTo(36, 120, 46, 50, 64, 30);
  g.bezierCurveTo(82, 50, 92, 120, 88, 205);
  g.closePath();
  g.fill();
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
};
var fxContact = (p, col) => {
  const g = p.g;
  g.fillStyle = WHITE;
  g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]]) gr.addColorStop(r, mix2(col, WHITE, k));
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
};
var fxPlank = (p) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK);
  p.dot(284, 54, 5, INK);
};
var fxDrum = (p) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

// src/lights.ts
var LIGHTS = {
  day: {
    az: 75,
    el: 48,
    lit: [1.58, 1.5, 1.33],
    shade: [0.3, 0.29, 0.36],
    lift: [0.05, 0.06, 0.11],
    lambert: 0.35,
    sideK: 0.84,
    term: 0.2,
    charTint: [1, 0.94, 0.92],
    charShade: 0.86,
    charGrad: 0.07,
    bodyGrad: 0.2,
    sideTint: [0.92, 0.9, 0.96],
    blob: [0.62, 0.58, 0.58],
    actorShadow: false,
    top: "#3e7fd2",
    hor: "#b8d0ec",
    skyCurve: [0, 0.5, 0.6],
    fog: "#b8d0ec",
    fogNear: 25,
    fogFar: 300,
    sunDisc: "#000000",
    sunCol: "#fff3e0",
    sunI: 2.8,
    sky: "#dcecff",
    ground: "#b49a78",
    hemiI: 0.55,
    bias: -25e-5,
    normalBias: 0.015
  },
  golden: {
    az: 6,
    el: 7,
    lit: [1.5, 0.68, 0.24],
    shade: [0.15, 0.15, 0.3],
    lift: [0.04, 0.06, 0.17],
    lambert: 0.35,
    sideK: 0.82,
    term: 0.07,
    charTint: [1, 0.78, 0.56],
    charShade: 0.88,
    charGrad: 0.1,
    bodyGrad: 0.25,
    sideTint: [0.85, 0.8, 0.95],
    blob: [0.75, 0.74, 0.9],
    actorShadow: true,
    top: "#6a4f8c",
    hor: "#ffd08a",
    skyCurve: [0.05, 0.6, 1],
    fog: "#efb489",
    fogNear: 50,
    fogFar: 380,
    sunDisc: "#ffcf9e",
    sunCol: "#ffab5e",
    sunI: 5.5,
    sky: "#d8b0b8",
    ground: "#8a6a60",
    hemiI: 0.5,
    bias: -6e-4,
    normalBias: 0.03
  }
};
var LOOK = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0],
    sat: 1.1
  }
};

// src/ink.ts
import * as THREE4 from "three";
var NOINK = 3;
var DEF = {
  // round 2 (reviewer: "world outlines ~1.5x thicker, pure black on every silhouette"): widths x1.5 (creases follow
  // via creaseScale), pure near-black, far opacity 0.75 -> 0.95; fog tint of the ink 0.6 -> 0.3 (compMat fogInk)
  color: "#030303",
  strength: 1,
  widthNear: 5.1,
  widthFar: 3.3,
  distNear: 6,
  distFar: 90,
  creaseScale: 0.8,
  // round 3: creases 0.64 -> 0.8 (building corners)
  depthLo: 0.01,
  depthHi: 0.03,
  angleLo: 35,
  angleHi: 50,
  concaveGain: 0.7,
  // depth jumps from 1 %; creases from 35 deg (roof eaves)
  farOpacity: 0.95,
  fadeNear: 150,
  fadeFar: 450
};
var FS_VERT = (
  /* glsl */
  `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
);
var NORMAL_VERT = (
  /* glsl */
  `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`
);
var NORMAL_FRAG = (
  /* glsl */
  `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));   // geometry without normals
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);            // back faces of double-sided planes
  gl_FragColor = vec4(n, 1.0);
}`
);
var MASK_FRAG = (
  /* glsl */
  `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
uniform float pxScale;   // output px per 1080x1920 px
uniform vec2 fogRange;   // scene fog near / far (m); far <= near = no fog tint
uniform float fogStart;  // ink stays pure black up to here (m), then tints toward the fog colour
varying vec2 vUv;

// pixel steps along x, y and both diagonals, and their length in px
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9   // covers 5.1 px x pxScale 1.333 = 6.8 px at 1440x2560 (+0.5 AA ramp)

// textureLod: explicit LOD inside loops (nearest-filtered targets, no derivatives needed)
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

// crease strength between this pixel (n0, P0) and a neighbour
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;       // sky / depth jump: not a crease
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;        // neighbour in front of our tangent plane: concave
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }          // sky / empty: ink lives on the near object only
  float zc = dist(tDepth, vUv);

  // characters, cards etc. (not in the world buffer) in front of this pixel: no world ink over them
  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale;           // silhouette line width (output px) at this distance, near side only
  float hc = 0.5 * w * creaseScale;                  // crease line half width (px), drawn on both faces
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];          // distance of this pixel's centre to an edge first seen at r
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);       // continuous coverage -> no width popping, built-in AA
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      // depth jump: this pixel is in front of its neighbours (2nd difference of 1/z < 0; exactly 0 on planes)
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      // crease: normal turns towards a neighbour at the same depth
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`
);
var COMP_FRAG = (
  /* glsl */
  `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform vec3 fogColor;
uniform float fogInk;   // how far fully fogged ink moves toward the fog colour (0.3)
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;   // 1-2-1 tent = anti-aliasing
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }               // mask only
  if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); return; } // world normals
  // blend in display (gamma) space like Canvas2D does for the character drawings: coverage -> darkness is linear
  // on screen, so the measured line widths equal the coverage widths (a linear-light blend reads ~30 % thinner)
  float fk = texture2D(tMask, vUv).g;                       // fog amount of the line (max over the AA footprint)
  fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
  fk = max(fk, max(texture2D(tMask, vUv + vec2(0.0, texel.y)).g, texture2D(tMask, vUv - vec2(0.0, texel.y)).g));
  vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
}`
);
var COPY_FRAG = (
  /* glsl */
  `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
  #include <colorspace_fragment>
}`
);
var InkPass = class extends Pass {
  /** 0 = normal, 1 = show the ink mask, 2 = show the world normal buffer */
  debug = 0;
  world;
  cam;
  rt;
  maskRT;
  tmpRT;
  normalMat;
  maskMat;
  compMat;
  copyMat;
  fsScene = new THREE4.Scene();
  fsCam = new THREE4.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad;
  clearCol = new THREE4.Color();
  constructor(scene, camera, options = {}) {
    super("InkPass");
    const o = { ...DEF, ...options };
    this.world = scene;
    this.cam = camera;
    this.cam.layers.enable(NOINK);
    this.needsSwap = false;
    this.needsDepthTexture = true;
    this.rt = new THREE4.WebGLRenderTarget(1, 1, {
      type: THREE4.HalfFloatType,
      minFilter: THREE4.NearestFilter,
      magFilter: THREE4.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
      samples: 0,
      depthTexture: new THREE4.DepthTexture(1, 1, THREE4.UnsignedIntType)
    });
    this.maskRT = new THREE4.WebGLRenderTarget(1, 1, {
      type: THREE4.UnsignedByteType,
      minFilter: THREE4.NearestFilter,
      magFilter: THREE4.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false
    });
    this.tmpRT = new THREE4.WebGLRenderTarget(1, 1, {
      type: THREE4.HalfFloatType,
      minFilter: THREE4.LinearFilter,
      magFilter: THREE4.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false
    });
    this.normalMat = new THREE4.ShaderMaterial({
      vertexShader: NORMAL_VERT,
      fragmentShader: NORMAL_FRAG,
      side: THREE4.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE4.Matrix3() } }
    });
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {
      const mat = object.material;
      const gi = group?.materialIndex ?? 0;
      const src = Array.isArray(mat) ? mat[gi] : mat;
      const u = this.normalMat.uniforms;
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map;
      u.cut.value = map ? src.alphaTest : 0;
      if (map) {
        map.updateMatrix();
        u.cutUv.value.copy(map.matrix);
      }
      this.normalMat.uniformsNeedUpdate = true;
    };
    const fs = (fragmentShader, uniforms) => new THREE4.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = new THREE4.Vector2(1, 1);
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.rt.texture },
      tDepth: { value: this.rt.depthTexture },
      tMainDepth: { value: null },
      texel: { value: texel },
      cNear: { value: 0.2 },
      cFar: { value: 1500 },
      p00: { value: 1 },
      p11: { value: 1 },
      wNear: { value: o.widthNear },
      wFar: { value: o.widthFar },
      dNear: { value: o.distNear },
      dFar: { value: o.distFar },
      creaseScale: { value: o.creaseScale },
      depthLo: { value: o.depthLo },
      depthHi: { value: o.depthHi },
      cosLo: { value: Math.cos(o.angleLo * Math.PI / 180) },
      cosHi: { value: Math.cos(o.angleHi * Math.PI / 180) },
      concaveGain: { value: o.concaveGain },
      farOpacity: { value: o.farOpacity },
      fadeNear: { value: o.fadeNear },
      fadeFar: { value: o.fadeFar },
      strength: { value: o.strength },
      useMain: { value: 0 },
      pxScale: { value: 1 },
      fogRange: { value: new THREE4.Vector2(0, 0) },
      fogStart: { value: 60 }
    });
    this.compMat = fs(COMP_FRAG, {
      inputBuffer: { value: null },
      tMask: { value: this.maskRT.texture },
      tNormal: { value: this.rt.texture },
      texel: { value: texel },
      inkColor: { value: new THREE4.Color(o.color) },
      debug: { value: 0 },
      fogColor: { value: new THREE4.Color() },
      fogInk: { value: 0.3 }
    });
    this.copyMat = fs(COPY_FRAG, { tSrc: { value: this.tmpRT.texture } });
    this.quad = new THREE4.Mesh(new THREE4.PlaneGeometry(2, 2), this.maskMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }
  /** live tuning, e.g. ink.set({ widthNear: 4.2, concaveGain: 0.5 }) */
  set(options) {
    const u = this.maskMat.uniforms;
    const map = [
      ["widthNear", "wNear"],
      ["widthFar", "wFar"],
      ["distNear", "dNear"],
      ["distFar", "dFar"],
      ["creaseScale", "creaseScale"],
      ["depthLo", "depthLo"],
      ["depthHi", "depthHi"],
      ["concaveGain", "concaveGain"],
      ["farOpacity", "farOpacity"],
      ["fadeNear", "fadeNear"],
      ["fadeFar", "fadeFar"],
      ["strength", "strength"]
    ];
    for (const [k, n] of map) if (options[k] !== void 0) u[n].value = options[k];
    if (options.angleLo !== void 0) u.cosLo.value = Math.cos(options.angleLo * Math.PI / 180);
    if (options.angleHi !== void 0) u.cosHi.value = Math.cos(options.angleHi * Math.PI / 180);
    if (options.color !== void 0) this.compMat.uniforms.inkColor.value.set(options.color);
  }
  setDepthTexture(depthTexture) {
    this.maskMat.uniforms.tMainDepth.value = depthTexture ?? null;
    this.maskMat.uniforms.useMain.value = depthTexture ? 1 : 0;
  }
  setSize(width, height) {
    this.rt.setSize(width, height);
    this.maskRT.setSize(width, height);
    this.tmpRT.setSize(width, height);
    this.maskMat.uniforms.texel.value.set(1 / width, 1 / height);
    this.maskMat.uniforms.pxScale.value = height / 1920;
  }
  render(renderer, inputBuffer) {
    const scene = this.world, cam = this.cam;
    const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate;
    const mask = cam.layers.mask, override = scene.overrideMaterial, background = scene.background;
    renderer.getClearColor(this.clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    cam.layers.disable(NOINK);
    scene.overrideMaterial = this.normalMat;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    cam.layers.mask = mask;
    scene.overrideMaterial = override;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clearCol, clearAlpha);
    const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
    u.cNear.value = cam.near;
    u.cFar.value = cam.far;
    u.p00.value = e[0];
    u.p11.value = e[5];
    const fog = scene.fog;
    if (fog && fog.isFog) {
      u.fogRange.value.set(fog.near, fog.far);
      this.compMat.uniforms.fogColor.value.copy(fog.color);
    } else u.fogRange.value.set(0, 0);
    this.quad.material = this.maskMat;
    renderer.setRenderTarget(this.maskRT);
    renderer.render(this.fsScene, this.fsCam);
    this.compMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.compMat.uniforms.debug.value = this.debug;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.tmpRT);
    renderer.render(this.fsScene, this.fsCam);
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.fsScene, this.fsCam);
    renderer.autoClear = autoClear;
  }
  dispose() {
    this.rt.depthTexture?.dispose();
    this.rt.dispose();
    this.maskRT.dispose();
    this.tmpRT.dispose();
    this.normalMat.dispose();
    this.maskMat.dispose();
    this.compMat.dispose();
    this.copyMat.dispose();
    this.quad.geometry.dispose();
  }
};
function noInkFallback(root) {
  root.traverse((o) => {
    const m = o;
    if (!(m.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
    if (o.layers.mask === 1 << NOINK) return;
    const mats2 = Array.isArray(m.material) ? m.material : [m.material];
    const card = !!m.customDepthMaterial || o.isSprite || o.isPoints || o.isLine;
    const noDepth = mats2.some((x) => x && x.depthWrite === false);
    const basicCut = mats2.some((x) => x && x.isMeshBasicMaterial && x.alphaTest > 0);
    if (card || noDepth || basicCut) o.layers.set(NOINK);
  });
}

// src/cast.ts
import * as THREE6 from "three";

// src/cardshade.ts
import * as THREE5 from "three";
var GRAD_K = 5.5;
var GRAD_KB = 1.6;
var TINT_K = 0.55;
var CARD = (
  /* glsl */
  `
vec3 tintK = mix( vec3( 1.0 ), uCharTint, uTintK );
tintK /= pow( max( dot( tintK, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.2 ), uNorm );             // same face value day and golden
vec3 outgoingLight = diffuseColor.rgb * tintK;
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                                          // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = sign( sunV.x ) * smoothstep( 0.0, 0.35, abs( sunV.x ) );                     // saturates: even a near-frontal sun shades one side                                          // + = sun on screen right
  float head = smoothstep( 0.565, 0.6, vMapUv.y );                                        // head zone vs body
  float hw = mix( 0.15, 0.2, head );
  float uu = clamp( ( vMapUv.x - 0.5 ) / hw, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 ); // -1..1 screen left..right
  float t = uu * side;                                                                     // +1 = edge facing the sun
  float g = mix( uBodyGrad * uGradKB, min( uGrad * uGradK, 0.4 ), head );
  float dark = smoothstep( -0.15, 0.9, -t );                                                 // far side
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * clamp( g / max( min( uGrad * uGradK, 0.4 ), 1e-3 ), 0.0, 1.5 ) * 0.5 );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - 0.69 ) / 0.11, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.04 * smoothstep( 0.0, 0.9, t );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift * uGain;
  #ifdef USE_MAP
  {
    // INNER warm rim, golden only: the outermost ~2 px (at 1080 wide) of the HEAD skin / TORSO silhouette on the
    // sun-facing edge. No offset copy: we only test whether the next pixels toward the sun are outside the card.
    // Hats, legs, rifles and other thin parts are skipped (inner sample must be skin, or torso at least ~40 units thick).
    float warm = smoothstep( 0.2, 0.4, 1.0 - uCharTint.b );
    float sl = length( sunV.xy );
    vec2 d2 = sunV.xy / max( sl, 1e-4 );
    vec2 duv = 2.0 * uPx * ( d2.x * dFdx( vMapUv ) + d2.y * dFdy( vMapUv ) );
    float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
    vec2 dirU = normalize( duv + vec2( 1e-9 ) );
    vec4 c1 = texture2D( map, vMapUv - dirU * vec2( 0.027, 0.016 ) );   // ~16 design units inward (past the ink line)
    vec4 c2 = texture2D( map, vMapUv - dirU * vec2( 0.067, 0.04 ) );    // ~40 units inward: thick parts only
    float skin = step( 0.5, c1.a ) * step( 0.3, c1.r ) * step( c1.b + 0.12, c1.r ) * step( c1.g, c1.r + 0.02 );
    float torso = step( 0.27, vMapUv.y ) * step( vMapUv.y, 0.57 ) * step( 0.5, c1.a ) * step( 0.5, c2.a ) * step( 0.04, max( c1.r, max( c1.g, c1.b ) ) );
    float rim = warm * smoothstep( 0.1, 0.4, sl ) * edge * max( skin * head, torso ) * mix( 0.6, 1.0, sunVis );
    outgoingLight += vec3( 0.95, 0.52, 0.16 ) * rim;
  }
  #endif
}
#endif
`
);
var DECL2 = "#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint; uniform float uGradK; uniform float uGradKB; uniform float uTintK; uniform float uNorm; uniform float uGain; uniform float uPx;";
var CARD_K = { uGradK: { value: GRAD_K }, uGradKB: { value: GRAD_KB }, uTintK: { value: TINT_K }, uNorm: { value: 0.7 }, uGain: { value: 1.03 }, uPx: { value: 0.5 } };
function cardShade(m) {
  m.emissive.set(0);
  m.emissiveIntensity = 0;
  m.emissiveMap = null;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CHAR, CARD_K);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", DECL2).replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB).replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;", CARD);
  };
  m.customProgramCacheKey = () => "card9";
  return m;
}
var blobMaterial = (map) => new THREE5.MeshBasicMaterial({
  map,
  transparent: false,
  depthWrite: false,
  fog: false,
  toneMapped: false,
  blending: THREE5.CustomBlending,
  blendEquation: THREE5.AddEquation,
  blendSrc: THREE5.ZeroFactor,
  blendDst: THREE5.SrcColorFactor,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  side: THREE5.DoubleSide
});

// src/cast.ts
var makeEntry = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const tex = new THREE6.CanvasTexture(cv);
  tex.colorSpace = THREE6.SRGBColorSpace;
  tex.anisotropy = 8;
  return { cv, tex, w, h };
};
var Pool = class {
  live = /* @__PURE__ */ new Map();
  free = [];
  reqs = [];
  req(key, w, h, k, draw) {
    const r = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = /* @__PURE__ */ new Map();
    for (const r of this.reqs) {
      const l = want.get(r.key);
      if (l) l.push(r);
      else want.set(r.key, [r]);
    }
    for (const [key, e] of this.live) if (!want.has(key)) {
      this.live.delete(key);
      this.free.push(e);
    }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d");
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, e.w, e.h);
        g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
  /** frees every drawing and its GPU texture */
  dispose() {
    for (const e of [...this.live.values(), ...this.free]) {
      e.tex.dispose();
      e.cv.width = e.cv.height = 0;
    }
    this.live.clear();
    this.free = [];
    this.reqs = [];
  }
};
var blank = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  return new THREE6.CanvasTexture(c);
})();
var SU = 216e-5;
var SU_SWING = 2.3 / 1830;
var BODY = (() => {
  const g = new THREE6.PlaneGeometry(600 * SU, 1e3 * SU);
  g.translate(0, (975 - 500) * SU, 0);
  return g;
})();
var CARD2 = new THREE6.PlaneGeometry(1, 1);
var ROOTS = /* @__PURE__ */ new Set();
var Actor = class {
  mesh;
  mat;
  dmat;
  r = null;
  constructor(parent, geo = BODY) {
    this.mat = cardShade(new THREE6.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE6.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE6.MeshDepthMaterial({ depthPacking: THREE6.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE6.DoubleSide });
    this.mesh = new THREE6.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => {
      const rt = r.getRenderTarget();
      CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920;
    };
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ";
    this.mesh.renderOrder = 1;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() {
    const t = this.r?.tex;
    if (t) {
      this.mat.map = t;
      this.dmat.map = t;
    }
  }
};
var Fx = class {
  mesh;
  mat;
  soft;
  blob;
  r = null;
  constructor(parent) {
    this.mat = new THREE6.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE6.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE6.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE6.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE6.Mesh(CARD2, this.mat);
    this.mesh.visible = false;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft) {
    this.mesh.material = soft ? this.soft : this.mat;
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r.key.includes("|blob|")) {
      if (t.generateMipmaps) {
        t.generateMipmaps = false;
        t.minFilter = THREE6.LinearFilter;
        t.needsUpdate = true;
      }
      this.blob.map = t;
      this.mesh.material = this.blob;
      this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t;
      this.soft.map = t;
      this.mesh.renderOrder = 0;
    }
  }
};
var hh = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
var q = (v, n = 120) => Math.round(v * n) / n;
var SOLDIER = [0, 1, 2, 3].map((v) => soldier(v));
var BARE = [0, 1, 2, 3].map((v) => soldier(v, { hat: null }));
var TOWNFOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
var VIKINGFOLK = [0, 1, 2, 3, 4, 5].map((v) => vikingfolk(v));
var FOLK = TOWNFOLK;
var setTheme = (t) => {
  FOLK = t === "viking" ? VIKINGFOLK : TOWNFOLK;
};
var vOf = (i) => (i * 7 + (i >> 2)) % 4;
var seedOf = (i) => (i * 5 + 3) % 7 + 1;
var tierFull = (d) => d < 3.2 ? [1800, 3e3, 3] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
var CARD_MAX = 1800;
var setCardMax = (w) => {
  CARD_MAX = w;
};
var tier = (d) => {
  const t = tierFull(d);
  if (t[0] <= CARD_MAX) return t;
  const k = CARD_MAX / t[0];
  return [Math.round(t[0] * k), Math.round(t[1] * k), t[2] * k];
};
var SUN = new THREE6.Vector3(0.5, 0.75, -0.4).normalize();
var tmp = new THREE6.Vector3();
var LNAME = "day";
var sunOf = (root) => {
  let s = null;
  root.traverse((o) => {
    if (!s && o instanceof THREE6.DirectionalLight && o.castShadow) s = o;
  });
  return s;
};
var findSun = (cam, out) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) {
      err = e;
      best = s;
    }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
var light2D = (cam, mirror) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
var viewOf = (cam, x, z, dx, dz) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};
var LEAD = 2 / FPS;
var LID = [0.5, 1, 1, 0.5];
var SWAPS = { 4: [16.17, 17.3], 5: [19.48, 20.6], 6: [21.9, 23.7], 7: [29.4, 30.6], 8: [SNAP] };
var lidAt = (t, i, swaps = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) {
    const k = f - Math.round((ts - LEAD) * FPS) + 1;
    if (k >= 0 && k < 4) return LID[k];
  }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
var fkey = (o) => JSON.stringify(o, (_k, v) => typeof v === "number" ? q(v) : v);
var person = (cam, who, x, y, z, view, fo, so, scale = 1) => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2 = { ...fo, light, seed }, s2 = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key,
    x,
    y,
    z,
    scale,
    mirror,
    tierKey: `${w}`,
    draw: (p) => view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2),
    size: [w, h, k]
  };
};
var CONTACT = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
var TAIL = [0.42, 0.44, 0.62];
var toSrgb = (v) => {
  const c = clamp01(v);
  return c <= 31308e-7 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
var hexOf = (c, k) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
var blob = (out, x, y, z, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({
      key: `blob|shadow|${tc}`,
      cw: 128,
      ch: 256,
      draw: (p) => fxShadow(p, tc),
      x: x + ox * c,
      y: y + 0.018,
      z: z + oz * c,
      w: 0.72 * sc,
      h,
      flat: true,
      rot
    });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({
    key: `blob|contact|${cc}`,
    cw: 128,
    ch: 128,
    draw: (p) => fxContact(p, cc),
    x: x + ox * 0.03 * sc,
    y: y + 0.022,
    z: z + oz * 0.03 * sc,
    w: 0.52 * sc,
    h: 0.4 * sc,
    flat: true,
    rot
  });
};
var exprMarch = (id, t, i, tau) => {
  const lau = i % 3 === 0, whi = i % 5 === 1, L = LEAD;
  switch (id) {
    case 1:
      return { expr: lau ? "laugh" : whi ? "whistle" : "grin", look: 0 };
    case 2:
    case 3:
      return { expr: i % 4 === 3 ? "smile_closed" : i % 2 ? "neutral" : "stern", look: 0 };
    case 4:
      return t < 16.17 - L ? { expr: i % 2 ? "neutral" : "stern", look: 0 } : t < 17.3 - L ? { expr: lau ? "shock" : "nervous", look: 0 } : { expr: "neutral", look: 0 };
    case 5:
      return { expr: t < 19.48 - L ? "neutral" : t < 20.6 - L ? "grin" : i % 2 ? "laugh" : "grin", look: 0 };
    case 6:
      return { expr: i === 2 && t > 21.9 - L || t > 23.7 - L && i % 4 === 1 ? "whistle" : t > 23.7 - L && lau ? "laugh" : "grin", look: 0 };
    case 7:
      return t < 29.4 - L ? { expr: lau ? "laugh" : "grin", look: 0 } : t < 30.6 - L ? { expr: i % 2 ? "nervous" : "grin", look: -1 } : { expr: "nervous", look: 0 };
    case 8:
      return { expr: tau < SNAP - L ? "nervous" : "shock", look: tau < SNAP + 0.6 ? -1 : 0 };
    default:
      return { expr: whi ? "whistle" : "grin", look: 0 };
  }
};
var column = (id, t, b, cam, out) => {
  const s = SHOTS[id - 1], tau = s.tau(t);
  const stopT = SNAP + 0.3, walkT = id === 8 ? Math.min(tau, stopT) : tau;
  const F = front(walkT), ph = marchPhase(walkT), st = stomp(tau);
  const falling = id === 8 && tau >= DROP0;
  for (let i = 0; i < COUNT; i++) {
    const row = i >> 2, x0 = FILES[i & 3] + (hh(i) - 0.5) * 0.08, z = F + row * ROW_GAP + (hh(i, 2) - 0.5) * 0.1;
    let x = x0, y = Math.abs(z) <= 30 ? deckY(z, b) : D0;
    const who = { i, o: SOLDIER[vOf(i)], okey: `s${vOf(i)}` };
    let { expr, look } = exprMarch(id, t, i, tau);
    let mode = id === 8 && tau >= SNAP + 0.25 ? "stand" : "march";
    let tilt = 0;
    if (falling) {
      const lagY = D0 + b.bounce * shapeZ(z) - dropU(tau - 0.13) * DROP_H * dropW(z);
      const air = Math.max(0, lagY - y);
      y += air;
      const u = clamp01((tau - DROP0) / (DROP1 - DROP0));
      x = x0 + (hh(i, 3) - 0.5) * 0.7 * u;
      mode = tau < DROP1 + 0.13 ? "fall" : "sit";
      tilt = mode === "fall" ? (hh(i, 4) - 0.5) * 50 * u : 0;
      if (mode === "sit") expr = i % 3 ? "dazed" : "shock";
    }
    const view = viewOf(cam, x, z, 0, -1);
    const blink = expr !== "whistle" ? lidAt(t, i, SWAPS[id]) : 0;
    const fo = { phase: mode === "march" ? ph : 0, expr, mode, look, blink, lift: 60 * st, tilt };
    const so = { phase: mode === "march" ? ph : 0, expr, mode: mode === "march" ? "march" : "stand", blink, stomp: st, stride: view.fs };
    out.places.push(person(cam, who, x, y, z, mode === "fall" || mode === "sit" ? { side: false, mirror: false } : view, fo, so));
    if (mode === "march" || mode === "stand") blob(out, x, y, z);
    if (expr === "whistle" && (id === 6 || id === 1 || id === 13) && cam.pos.distanceTo(tmp.set(x, y, z)) < 16) {
      for (let n = 0; n < 4; n++) {
        const age = (t - 21.9 + n * 0.42 + hh(i, 5)) % 1.68 / 1.68;
        const pop = Math.min(1, age * 7) * (age > 0.82 ? (1 - age) / 0.18 : 1);
        if (pop <= 0.02) continue;
        const kind = (n + i) % 2, side = 0.16 + 0.32 * age + 0.05 * Math.sin(age * 9 + n);
        out.fx.push({
          key: `note${kind}`,
          cw: 220,
          ch: 260,
          draw: (p) => fxNote(p, kind),
          x: x + cam.right.x * side,
          y: y + 1.5 + 0.85 * age,
          z: z + cam.right.z * side - 0.1,
          w: 0.17 * pop,
          h: 0.2 * pop,
          rot: 0.3 * Math.sin(age * 6 + n)
        });
      }
    }
  }
};
var sitters = (cam, t, out, spots, exprs, stars, water) => {
  spots.forEach(([x, y, z], i) => {
    const bare = i % 3 === 1;
    const v = vOf(i + 3), who = { i, o: bare ? BARE[v] : SOLDIER[v], okey: `${bare ? "b" : "s"}${v}` };
    const expr = exprs(i), bob = water ? 0.03 * Math.sin(t * 2.2 + i) : 0;
    out.places.push(person(cam, who, x, y + bob, z, { side: false, mirror: false }, { mode: "sit", expr, blink: lidAt(t, i), look: 0 }, {}));
    if (stars(i)) {
      const u = (t * 0.9 + hh(i)) % 1;
      out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x, y: y + bob + 1.3, z, w: 0.75, h: 0.375 });
    }
    if (water) {
      const u = (t + hh(i, 7) * 2) % 2.2 / 2.2;
      out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x, y: 0.03, z, w: 2, h: 2, flat: true });
      out.fx.push({ key: `blob|contact|${WATERLINE}`, cw: 128, ch: 128, draw: (p) => fxContact(p, WATERLINE), x, y: 0.034 + bob * 0.3, z, w: 0.7, h: 0.5, flat: true });
      if (bare) out.fx.push({ key: "shako", cw: 200, ch: 200, draw: shakoAlone, x: x + 0.55 + 0.3 * hh(i, 8), y: 0.12 + 0.03 * Math.sin(t * 2 + i), z: z - 0.3, w: 0.42, h: 0.42, rot: -0.5 + hh(i, 6) });
    } else {
      out.fx.push({ key: "puddle", cw: 300, ch: 150, draw: puddle, x, y: D0 + 0.02, z: z - 0.05, w: 1.5, h: 0.75, flat: true });
      blob(out, x, y, z, 1.05, 0.8);
    }
  });
};
var WATERLINE = hexOf([0.3, 0.36, 0.52], 1);
var FLOAT = [
  // round-4 river cameras sit at z -24.6 / -24.2: the two nearest pieces were 0.7-1.5 m from the lens (cut-off blobs)
  { kind: "shako", x: -0.25, z: -22.5, s: 0.46, r: 0.6 },
  // (drum removed: cut by the frame edge it read as a blob)
  { kind: "shako", x: 0.95, z: -24.6, s: 0.42, r: 0.25 }
  // (near plank removed: cut by the frame edge)
];
var flotsam = (t, out) => FLOAT.forEach((f, i) => {
  const bob = 0.03 * Math.sin(t * 1.9 + i * 1.7), r = f.r + 0.08 * Math.sin(t * 1.3 + i);
  const [cw, ch, draw, ar] = f.kind === "shako" ? [200, 200, shakoAlone, 1] : f.kind === "plank" ? [320, 110, fxPlank, 110 / 320] : [260, 240, fxDrum, 240 / 260];
  const w = f.s, h = f.s * ar;
  out.fx.push({ key: f.kind, cw, ch, draw, x: f.x, y: 0.28 * h + bob, z: f.z, w, h, rot: r });
  out.fx.push({ key: `ring${q((t * 0.45 + i * 0.3) % 1, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q((t * 0.45 + i * 0.3) % 1, 30)), x: f.x, y: 0.03, z: f.z, w: 1.1 * f.s + 0.5, h: 1.1 * f.s + 0.5, flat: true });
});
var shakoAlone = (p) => {
  p.poly([[42, 160], [158, 160], [166, 50], [34, 50]], "#3a3d47", 8);
  p.ell(100, 158, 60, 10, "#16171b", 7, 0, 180);
  p.ell(100, 96, 14, 12, "#c9ccd2", 6);
  p.ell(100, 36, 14, 14, "#2b7a4b", 6);
};
var puddle = (p) => {
  p.ell(150, 75, 140, 58, "#6f97c6", 0);
  p.ell(120, 62, 60, 16, "#a9c9ea", 0);
};
var CHEER = [[8.01 - LEAD, 9.45], [65.96 - LEAD, 67.5]];
var townsfolkAt = (cam, t, out) => {
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const bank = i < 13 ? -1 : 1, k = i % 13, sx = k % 2 ? 1 : -1;
    spots.push([sx * (5.2 + (k >> 1) * 1.7 + hh(i) * 0.6), bank * (31.6 + hh(i, 2) * 3.2)]);
  }
  const on = CHEER.some(([a, b]) => t >= a && t < b);
  spots.forEach(([x, z], i) => {
    const kid = i % 5 === 2, o = kid ? KID : FOLK[i % 6], hop = kid && on ? Math.max(0, Math.sin(t * 7 + i)) * 0.18 : 0;
    const who = { i: i + 200, o, okey: kid ? "kid" : `f${i % 6}` };
    const expr = ["smile", "grin", "laugh", "smile_closed"][i % 4];
    const fo = { mode: "stand", expr, wave: i % 3 === 2 || !on ? void 0 : q(Math.sin(t * 9 + i * 1.3), 30), blink: lidAt(t, i + 40) };
    out.places.push(person(cam, who, x, D0 + hop, z, { side: false, mirror: false }, fo, {}, kid ? 0.72 : 1));
    blob(out, x, D0, z, kid ? 0.72 : 1, hop > 0 ? 0.6 : 1);
  });
};
var tourists = (cam, t, out) => {
  const t0 = 62.08;
  for (let i = 0; i < 24; i++) {
    const sp = 0.55 + hh(i) * 0.5, z = -4 + i / 24 * 28 + hh(i, 2) * 1.5 - sp * (t - t0), x = (hh(i, 3) - 0.5) * 4;
    const bare = i % 5 === 2, v = vOf(i), who = { i, o: bare ? BARE[v] : SOLDIER[v], okey: `${bare ? "b" : "s"}${v}` };
    const prop2 = i % 7 === 3 ? "icecream" : bare ? "shako" : null;
    const lick = prop2 === "icecream" && (t * 0.7 + hh(i, 4)) % 1 < 0.45;
    const expr = lick ? "lick" : ["smile", "smile_closed", "grin", "smile"][i % 4];
    const phase = q(((t - t0) * sp / 1.4 + hh(i, 5)) % 1, 120);
    const look = Math.round(Math.sin(t * 0.8 + i * 1.7) * 1.2);
    const fo = { mode: "stroll", phase, expr, look: Math.max(-1, Math.min(1, look)), prop: prop2, blink: lidAt(t, i) };
    const view = viewOf(cam, x, z, 0, -1);
    const so = { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs };
    out.places.push(person(cam, who, x, D0, z, view, fo, so));
    blob(out, x, D0, z);
  }
};
var HITS = [59.79, 60.33, 61.69];
var SIGN_AT = [2.25, D0, -30.9];
var hammerK = (t) => {
  let k = 1;
  for (const th of HITS) {
    const n = (t - th) * FPS;
    if (n >= -11 && n < -7) k = Math.min(k, 1 - smooth((n + 11) / 4));
    else if (n >= -7 && n < 0) k = 0;
  }
  return k;
};
var officer = (cam, t, out) => {
  const fo = { mode: "stand", expr: "stern", prop: ["hammer", q(hammerK(t), 30)], blink: lidAt(t, 99), facing: 1 };
  out.places.push(person(cam, { i: 99, o: OFFICER, okey: "off" }, 3.35, D0, -31.55, { side: false, mirror: false }, fo, {}));
  blob(out, 3.35, D0, -31.55, 1.1);
  for (const th of HITS) if (t >= th && t < th + 5 / FPS) {
    const u = (t - th) / (5 / FPS);
    out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: 2.95, y: D0 + 1.55, z: -31, w: 0.9, h: 0.9 });
  }
};
var SWING_T = 1.55;
var PUSH0 = 48.79;
var pushes = [0, 1, 2, 3].map((k) => PUSH0 + k * SWING_T);
var swingAmp = (t) => 6 + pushes.reduce((a, tp) => a + 11 * smooth((t - tp) / 0.3), 0);
var swingAngle = (t) => -(swingAmp(t) * Math.PI / 180) * Math.cos(2 * Math.PI * (t - PUSH0) / SWING_T);
var kidBack = (th) => {
  const lx = -0.083, ly = -2.174;
  return [PARK[0] - (lx * Math.cos(th) - ly * Math.sin(th)), PARK[1] + 2.88 + lx * Math.sin(th) + ly * Math.cos(th)];
};
var pushSpot = (k) => {
  const A = swingAmp(pushes[k]) * Math.PI / 180, [bx, by] = kidBack(-A);
  const cy = 975 - (by - D0) / SU, dy = cy - 515, dx = Math.sqrt(Math.max(120 * 120, 222 * 222 - dy * dy));
  return { px: bx + (53 + dx) * SU, hand: [300 + 53 + dx, cy] };
};
var park = (cam, t, out) => {
  const th = swingAngle(t), vel = Math.sin(2 * Math.PI * (t - PUSH0) / SWING_T);
  const A = swingAmp(t) * Math.PI / 180, kick = q(0.35 + 0.55 * vel, 40);
  const expr = A < 0.35 ? "smile" : A < 0.6 ? "grin" : "laugh";
  const light = light2D(cam, true), lid = lidAt(t, 78);
  out.places.push({
    key: `swing|${kick}|${expr}|${q(light)}|${lid}`,
    geo: "swing",
    x: PARK[0],
    y: PARK[1] + 2.88,
    z: PARK[2],
    yaw: Math.PI,
    roll: th,
    draw: (p) => swingKid(p, KID, kick, expr, light, lid),
    size: [490, 1610, 0.7]
  });
  const push = Math.max(0, ...pushes.map((tp) => 1 - Math.abs(t - tp + 0.05) / 0.32));
  let k = 0;
  while (k < pushes.length - 1 && t > pushes[k] + 0.35) k++;
  const cur = pushSpot(k), prev = pushSpot(Math.max(0, k - 1));
  const step = k > 0 ? smooth((t - (pushes[k - 1] + 0.35)) / (SWING_T - 0.7)) : 1;
  const px = prev.px + (cur.px - prev.px) * step, pz = PARK[2] + 0.1;
  const so = { mode: "push", pose: q(push, 40), expr: push > 0.3 ? "grin" : "smile", blink: lidAt(t, 77), hand: cur.hand };
  out.places.push({ ...person(cam, { i: 77, o: PARENT, okey: "parent" }, px, D0, pz, { side: true, mirror: true }, {}, so), mirror: false, yaw: Math.PI });
  blob(out, px, D0, pz);
};
var stage = (id, t, b, cam) => {
  const out = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.crowd === "march" || s.crowd === "fall") column(id, t, b, cam, out);
  if (s.towns) townsfolkAt(cam, t, out);
  if (s.crowd === "water") {
    const spots = [];
    for (let i = 0; i < 40; i++) spots.push([FILES[i & 3] * 1.12 + (hh(i, 11) - 0.5) * 0.6, -0.6, -21.6 + (i >> 2) * 1.6 + (hh(i, 12) - 0.5) * 0.7]);
    const happy = ["relief", "relief_open", "smile", "relief"], hurt = ["pained", "dazed", "pained", "dazed"];
    sitters(cam, t, out, spots, (i) => (id === 9 ? happy : hurt)[i % 4], (i) => id === 10 && i % 4 === 1, true);
    flotsam(t, out);
  }
  if (s.crowd === "bank") {
    const spots = [
      [-7.2, D0, -33.6],
      [-6.1, D0, -32.1],
      [-5, D0, -34.3],
      [-4.3, D0, -31.6],
      [-3.4, D0, -33.2],
      [-2.4, D0, -31.9],
      [-6.8, D0, -35.4],
      [-4.1, D0, -35.6],
      [-1.9, D0, -34.6]
    ];
    const ex = ["dazed", "relief", "smile_closed", "pained"];
    sitters(cam, t, out, spots, (i) => ex[i % 4], (i) => i % 4 === 0, false);
    officer(cam, t, out);
  }
  if (s.crowd === "tourists") tourists(cam, t, out);
  if (id === 12) park(cam, t, out);
  return out;
};
var snapFx = (tau, at, out) => {
  if (tau >= SNAP && tau < SNAP + 0.45) {
    const u = (tau - SNAP) / 0.45;
    out.fx.push({ key: `bigburst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: at[0], y: at[1] + 0.12, z: at[2] - 0.15, w: 1.5, h: 1.5 });
  }
};
var splashFx = (tau, out) => {
  const u = (tau - DROP1) / 1.1;
  if (u < 0 || u >= 1) return;
  for (const [x, z, s] of [[-2.9, -24, 1], [2.9, -21, 0.9], [-2.9, -15, 0.85], [2.9, -9, 0.8], [0, -27.5, 1.2], [-2.9, -5, 0.6]])
    out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x, y: 2.6 * s, z, w: 7 * s, h: 7 * s });
};
var creakFx = (t, pts, out, size = 0.8) => pts.forEach(([x, y, z], i) => {
  const u = q((t * 1.3 + i * 0.37) % 1, 30);
  out.fx.push({ key: `creak${u}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, u), x, y, z, w: size, h: size, rot: i * 0.6 - 0.6 });
});
var stageTemplate = (people, effects, cam, t, light) => {
  const out = { places: [], fx: [] };
  LNAME = light;
  findSun(cam, SUN);
  people.forEach((m, i) => {
    const o = m.kid ? KID : FOLK[(m.look % 6 + 6) % 6];
    const who = { i: 500 + i * 13 + m.look, o, okey: m.kid ? "kid" : `${FOLK === VIKINGFOLK ? "v" : "f"}${(m.look % 6 + 6) % 6}` };
    const walking = m.walk != null;
    const fo = {
      mode: walking ? "stroll" : "stand",
      phase: walking ? q(m.walk % 1, 120) : 0,
      expr: m.expr,
      blink: lidAt(t, 500 + i * 7),
      wave: m.wave == null ? void 0 : q(m.wave, 30),
      facing: m.facing ?? 0
    };
    const y = D0 + (m.hop || 0);
    out.places.push(person(cam, who, m.x, y, m.z, { side: false, mirror: false }, fo, {}, m.kid ? 0.72 : 1));
    blob(out, m.x, D0, m.z, m.kid ? 0.72 : 1, m.hop ? 0.6 : 1);
  });
  for (const e of effects) {
    const u = q(clamp01(e.u), 30), w = e.size ?? 0.9;
    const draw = e.kind === "stars" ? (p) => fxStars(p, u) : e.kind === "ring" ? (p) => fxRing(p, u) : e.kind === "note" ? (p) => fxNote(p, Math.floor(u * 3) % 3) : (p) => fxBurst(p, u);
    out.fx.push({ key: `t${e.kind}${u}`, cw: e.kind === "stars" ? 420 : 500, ch: e.kind === "stars" ? 210 : 500, draw, x: e.x, y: e.y, z: e.z, w, h: e.kind === "stars" ? w / 2 : w });
  }
  return out;
};

// src/world.ts
var KENNEY = [
  "tree_oak",
  "tree_default",
  "tree_detailed",
  "tree_fat",
  "tree_cone",
  "tree-high-round",
  "tree",
  "plant_bushLarge",
  "plant_bushDetailed",
  "plant_bush",
  "hedge",
  "flower_redA",
  "flower_yellowA",
  "flower_purpleA",
  "grass_large",
  "grass",
  "lily_large",
  "lantern",
  "cart",
  "stall-red",
  "stall-green",
  "stall-bench",
  "banner-red",
  "banner-green",
  "windmill",
  "canoe"
];
var kitP = null;
var loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene]).catch(() => [n, null]))).then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s])));
  }
  return kitP;
};
var NZ = 121;
var ZS = Array.from({ length: NZ }, (_, j) => -30 + j * 0.5);
var POSTS = Array.from({ length: 41 }, (_, k) => -30 + k * 1.5);
var HANG = Array.from({ length: 35 }, (_, k) => -25.5 + k * 1.5);
var CZ = Array.from({ length: 73 }, (_, k) => -27 + k * 0.75);
var FLAGS = Array.from({ length: 47 }, (_, k) => -25.3 + k * 1.1);
var catY = (z) => 8.5 + 8.1 * (z / 27) ** 2;
var chainY = (z, b) => {
  const intact = catY(z) + b.bounce * shapeZ(z) * 0.85, k = b.drop * dropW(z);
  return intact + (deckY(z, b) + 0.3 - intact) * k;
};
var BOLT = [ANCHOR[0], ANCHOR[1] + 0.24, ANCHOR[2]];
var TOP = 16.6;
var beamBetween = (a, b, th) => {
  const g = new THREE7.BoxGeometry(th, a.distanceTo(b), th);
  const m = new THREE7.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE7.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()),
    V(1, 1, 1)
  );
  return g.applyMatrix4(m);
};
var discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
});
var haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
    im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
var SUN_SHOT = { 2: { az: 120 }, 11: { az: -70, el: 8 }, 12: { az: -30, el: 18 } };
var smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]]) p.ell(x, y, r, r * 0.85, c, 0);
});
var sightLines = () => {
  const out = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan(c.fov * Math.PI / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
var World = class {
  root = new THREE7.Group();
  pool = new Pool();
  actors = [];
  fxs = [];
  swing;
  hemi;
  sun;
  fill;
  sky;
  skyMat;
  fog = new THREE7.Fog("#bccbec", 25, 420);
  WU;
  sunDisc;
  sunHalo;
  sunCache = /* @__PURE__ */ new Map();
  cloudMaps;
  fgs = [];
  deckTop;
  deckSide;
  posts;
  hangers;
  ribs;
  bunting;
  rails = [];
  chains = [];
  stays = [];
  boltA;
  boltB;
  eye;
  flags = [];
  smoke = [];
  clouds = [];
  sign = new THREE7.Group();
  frustum = new THREE7.Frustum();
  m4 = new THREE7.Matrix4();
  v = new THREE7.Vector3();
  sph = new THREE7.Sphere();
  constructor(kit) {
    const R = this.root, M = {};
    this.skyMat = new THREE7.ShaderMaterial({
      uniforms: {
        c0: { value: new THREE7.Color() },
        c1: { value: new THREE7.Color() },
        c2: { value: new THREE7.Color() },
        c3: { value: new THREE7.Color() },
        c4: { value: new THREE7.Color() },
        e: { value: new THREE7.Vector4() }
      },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE7.BackSide,
      depthWrite: false,
      fog: false
    });
    this.sky = new THREE7.Mesh(new THREE7.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE7.Sprite(new THREE7.SpriteMaterial({ map: discTex(), color: new THREE7.Color(6, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE7.Sprite(new THREE7.SpriteMaterial({
      map: haloTex(),
      color: new THREE7.Color(1, 1, 1),
      fog: false,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      blending: THREE7.AdditiveBlending
    }));
    this.sunDisc.renderOrder = -0.5;
    this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) {
      m.frustumCulled = false;
      m.layers.set(NOINK);
      R.add(m);
    }
    this.hemi = new THREE7.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE7.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE7.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.3, d = 620 + i % 3 * 60;
      const m = new THREE7.Mesh(new THREE7.PlaneGeometry(1, 1), new THREE7.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE7.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + i % 4 * 30;
      m.position.set(Math.cos(a) * d, 120 + i % 4 * 38, Math.sin(a) * d);
      m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m);
      R.add(m);
    }
    const b = new Batch();
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.wall = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    M.cope = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    M.tower = lam("towerHD", () => ({ map: stoneHD("towerHD") }));
    M.iron = twoTone(new THREE7.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    M.steel = twoTone(new THREE7.MeshPhongMaterial({ color: "#7d8088", specular: "#b0b0b0", shininess: 45 }), 0.15);
    M.wood = lam("wood", () => ({ map: beam() }));
    M.bed = lam("bed", () => ({ map: bed() }));
    M.sand = lam("sand", () => ({ color: "#e2c992" }));
    for (const s of [-1, 1]) {
      const zn = s * 30, zf = s * 900;
      b.add(s < 0 ? quadUp(-900, 900, zf, zn, 450, 217.5) : quadUp(-900, 900, zn, zf, 450, 217.5), M.grass);
      b.add(s < 0 ? quadUp(-160, 160, -36.5, -30, 80, 1.625, 0.012) : quadUp(-160, 160, 30, 36.5, 80, 1.625, 0.012), M.cobble);
      b.add(s < 0 ? quadUp(-6, 6, -170, -36.5, 3, 33.375, 0.012) : quadUp(-6, 6, 36.5, 170, 3, 33.375, 0.012), M.cobble);
      b.add(s < 0 ? wallQuad(-900, 900, -30, 1) : wallQuad(900, -900, 30, -1), M.wall);
      for (const [x0, x1] of [[-600, -4.6], [4.6, 600]]) b.add(boxGeo(V(x0, D0, s < 0 ? -30.5 : 30), V(x1, D0 + 0.75, s < 0 ? -30 : 30.5), 2), M.cope);
      b.add(boxGeo(V(-600, D0 - 0.05, s < 0 ? -30.6 : 29.4), V(600, D0 + 0.02, s < 0 ? -29.4 : 30.6), 2), M.cope);
    }
    b.add(quadUp(-900, 900, -30, 30, 225, 7.5, -0.6 - D0), M.bed);
    for (const zc of [-27, 27]) {
      for (const xc of [-3.35, 3.35]) {
        b.add(boxGeo(V(xc - 0.7, -0.6, zc - 0.8), V(xc + 0.7, 15.6, zc + 0.8), 2), M.tower);
        b.add(boxGeo(V(xc - 0.95, -0.6, zc - 1.05), V(xc + 0.95, 1.1, zc + 1.05), 2), M.tower);
        b.add(boxGeo(V(xc - 0.71, D0 + 3, zc - 0.81), V(xc + 0.71, D0 + 3.45, zc + 0.81), 2), M.cope);
        const cap = new THREE7.ConeGeometry(0.98, 1.5, 4);
        cap.rotateY(Math.PI / 4);
        b.add(cap, M.tower, new THREE7.Matrix4().makeTranslation(xc, 17.9 + 0.75, zc));
      }
      b.add(boxGeo(V(-4.05, 15.6, zc - 0.8), V(4.05, 17.4, zc + 0.8), 2, true), M.tower);
      b.add(boxGeo(V(-4.3, 17.4, zc - 1), V(4.3, 17.9, zc + 1), 2, true), M.cope);
      for (const x of [-2.7, 2.7]) b.add(boxGeo(V(x - 0.22, 16.25, zc - 0.92), V(x + 0.22, 16.95, zc + 0.92), 0, true), M.iron);
      b.add(boxGeo(V(-0.07, 17.9, zc - 0.07), V(0.07, 21.4, zc + 0.07)), M.wood);
      for (const x of [-2.7, 2.7]) {
        const za = Math.sign(zc) * 37;
        b.add(boxGeo(V(x - 1, D0 - 0.4, za - 1.3), V(x + 1, D0 + 0.5, za + 1.3), 2), M.cope);
        b.add(boxGeo(V(x - 0.45, D0 + 0.5, za - 0.6), V(x + 0.45, D0 + 0.58, za + 0.6)), M.iron);
        for (const s of [-1, 1]) b.add(boxGeo(V(x + s * 0.15 - 0.045, D0 + 0.58, za - 0.22), V(x + s * 0.15 + 0.045, D0 + 1.02, za + 0.22)), M.iron);
        if (!(x < 0 && za < 0)) {
          const bolt = new THREE7.CylinderGeometry(0.075, 0.075, 0.62, 10);
          bolt.rotateZ(Math.PI / 2);
          b.add(bolt, M.steel, new THREE7.Matrix4().makeTranslation(x, D0 + 0.86, za));
          const eye2 = new THREE7.TorusGeometry(0.17, 0.05, 8, 18);
          eye2.rotateY(Math.PI / 2);
          b.add(eye2, M.steel, new THREE7.Matrix4().makeTranslation(x, D0 + 0.86, za));
        }
      }
    }
    for (const zz of [-2.2, 2.2]) for (const s of [-1, 1])
      b.add(beamBetween(V(PARK[0], D0 + 3, PARK[2] + zz), V(PARK[0] + s * 3, D0, PARK[2] + zz), 0.15), M.wood);
    b.add(beamBetween(V(PARK[0], D0 + 3, PARK[2] - 2.35), V(PARK[0], D0 + 3, PARK[2] + 2.35), 0.17), M.wood);
    const sandG = new THREE7.CircleGeometry(3.4, 32);
    sandG.rotateX(-Math.PI / 2);
    b.add(sandG, M.sand, new THREE7.Matrix4().makeTranslation(PARK[0], D0 + 0.012, PARK[2]));
    b.build(R);
    buildTown(R, kit, sightLines());
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) {
      t.colorSpace = THREE7.NoColorSpace;
      t.anisotropy = 16;
      t.needsUpdate = true;
    }
    this.WU = {
      wNearC: { value: new THREE7.Color() },
      wMidC: { value: new THREE7.Color() },
      wFarC: { value: new THREE7.Color() },
      wCrest: { value: new THREE7.Color() },
      wTrough: { value: new THREE7.Color() },
      wGlint: { value: new THREE7.Color() },
      wShade: { value: new THREE7.Vector3(0.5, 0.56, 0.72) },
      wNearTex: { value: wNear },
      wFarTex: { value: wFar },
      wTime: { value: 0 }
    };
    const waterM = new THREE7.MeshLambertMaterial({ color: 16777215 });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL).replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB).replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river1";
    const wm = new THREE7.Mesh(quadUp(-900, 900, -30, 30, 1, 1, -D0), waterM);
    wm.receiveShadow = true;
    R.add(wm);
    this.deckTop = new THREE7.BufferGeometry();
    this.deckTop.setAttribute("position", new THREE7.BufferAttribute(new Float32Array(NZ * 2 * 3), 3));
    this.deckTop.setAttribute("normal", new THREE7.BufferAttribute(new Float32Array(NZ * 2 * 3), 3));
    this.deckTop.setAttribute("uv", new THREE7.BufferAttribute(new Float32Array(ZS.flatMap((z) => [0, z / 2, 2.5, z / 2])), 2));
    const ti = [];
    for (let j = 0; j < NZ - 1; j++) {
      const a = j * 2, c = j * 2 + 1, d = (j + 1) * 2, e = (j + 1) * 2 + 1;
      ti.push(a, d, e, a, e, c);
    }
    this.deckTop.setIndex(ti);
    this.deckSide = new THREE7.BufferGeometry();
    this.deckSide.setAttribute("position", new THREE7.BufferAttribute(new Float32Array(NZ * 6 * 3), 3));
    const sn = [], su = [], si = [];
    ZS.forEach((z) => {
      sn.push(-1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 0, -1, 0);
      su.push(z / 3, 0, z / 3, 0.3, z / 3, 0, z / 3, 0.3, z / 3, 0, z / 3, 1.2);
    });
    for (let j = 0; j < NZ - 1; j++) {
      const A = (k) => j * 6 + k, B = (k) => (j + 1) * 6 + k;
      si.push(A(0), A(1), B(1), A(0), B(1), B(0), A(2), B(2), B(3), A(2), B(3), A(3), A(4), A(5), B(5), A(4), B(5), B(4));
    }
    this.deckSide.setAttribute("normal", new THREE7.Float32BufferAttribute(sn, 3));
    this.deckSide.setAttribute("uv", new THREE7.Float32BufferAttribute(su, 2));
    this.deckSide.setIndex(si);
    const deckM = lam("planksHD", () => ({ map: planksHD() })), sideM = lam("deckSide", () => ({ map: beamHD() }));
    for (const mm of [deckM, sideM]) if (mm.map) {
      mm.map.anisotropy = 16;
      mm.map.needsUpdate = true;
    }
    for (const [g, m] of [[this.deckTop, deckM], [this.deckSide, sideM]]) {
      const mesh = new THREE7.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      R.add(mesh);
    }
    const inst = (g, m, n) => {
      const im = new THREE7.InstancedMesh(g, m, n);
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      R.add(im);
      return im;
    };
    this.posts = inst(new THREE7.BoxGeometry(0.11, 1.12, 0.11).translate(0, 0.56, 0), M.wood, POSTS.length * 2);
    this.ribs = inst(new THREE7.BoxGeometry(5.7, 0.26, 0.24), M.wood, POSTS.length);
    const chainM = twoTone(lam("chainHD", () => ({ map: rep(chainHD(), 1, 1), side: THREE7.DoubleSide })), 0.15);
    chainM.color.set("#8c847c");
    this.hangers = inst(new THREE7.CylinderGeometry(0.035, 0.035, 1, 5).translate(0, 0.5, 0), M.iron, HANG.length * 2);
    const pen = new THREE7.BufferGeometry();
    pen.setAttribute("position", new THREE7.Float32BufferAttribute([0, 0, -0.17, 0, 0, 0.17, 0, -0.42, 0], 3));
    pen.computeVertexNormals();
    this.bunting = inst(pen, lam("pennant", () => ({ side: THREE7.DoubleSide })), FLAGS.length * 2);
    const cols = ["#d23b3b", "#f3d35a", "#3f6fb5", "#f7f1e1", "#2f8a4f"].map((c) => new THREE7.Color(c));
    for (let i = 0; i < FLAGS.length * 2; i++) this.bunting.setColorAt(i, cols[i % 5]);
    for (const [w, h] of [[0.1, 0.1], [0.07, 0.07], [0.1, 0.1], [0.07, 0.07]]) {
      const s = new Strand(NZ, w, h, M.wood, 3);
      this.rails.push(s);
      R.add(s.mesh);
    }
    for (let i = 0; i < 2; i++) {
      const s = new Strand(CZ.length, 0.14, 0.3, chainM, 2);
      this.chains.push(s);
      R.add(s.mesh);
    }
    for (let i = 0; i < 4; i++) {
      const s = new Strand(18, 0.14, 0.3, chainM, 2);
      this.stays.push(s);
      R.add(s.mesh);
    }
    const half = new THREE7.CylinderGeometry(0.075, 0.075, 0.31, 10);
    half.rotateZ(Math.PI / 2);
    this.boltA = new THREE7.Mesh(half, M.steel);
    this.boltB = new THREE7.Mesh(half, M.steel);
    const eyeG = new THREE7.TorusGeometry(0.17, 0.05, 8, 18);
    eyeG.rotateY(Math.PI / 2);
    this.eye = new THREE7.Mesh(eyeG, M.steel);
    for (const m of [this.boltA, this.boltB, this.eye]) {
      m.castShadow = true;
      R.add(m);
    }
    const flagM = lam("flagM", () => ({ map: flagTex(), side: THREE7.DoubleSide }));
    for (const zc of [-27, 27]) {
      const f = new THREE7.Mesh(new THREE7.PlaneGeometry(1.7, 1, 12, 1), flagM);
      f.position.set(0, 20.75, zc);
      f.castShadow = true;
      f.frustumCulled = false;
      this.flags.push(f);
      R.add(f);
    }
    const smokeT = smokeTex();
    for (const [top, n] of [[[-22, D0 + 30.6, -77], 7], [[-80, D0 + 24.6, 93], 6]])
      for (let k = 0; k < n; k++) {
        const mat = new THREE7.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false });
        const m = new THREE7.Mesh(new THREE7.PlaneGeometry(1, 1), mat);
        m.layers.set(NOINK);
        this.smoke.push({ m, mat, top, k: k / n });
        R.add(m);
      }
    const board = new THREE7.Mesh(new THREE7.PlaneGeometry(1.4, 1.04), new THREE7.MeshBasicMaterial({ map: ctex("sign", 700, 520, (g) => fxSign(new Pen(g))), alphaTest: 0.5, color: 15132390 }));
    board.layers.set(NOINK);
    board.position.set(SIGN_AT[0], D0 + 1.62, SIGN_AT[2] - 0.04);
    board.rotation.y = Math.PI;
    const back = new THREE7.Mesh(new THREE7.BoxGeometry(1.46, 1.1, 0.06), M.wood);
    back.position.set(SIGN_AT[0], D0 + 1.62, SIGN_AT[2] + 0);
    this.sign.add(board, back);
    for (const s of [-1, 1]) {
      const p = new THREE7.Mesh(new THREE7.BoxGeometry(0.12, 2.15, 0.12), M.wood);
      p.position.set(SIGN_AT[0] + s * 0.52, D0 + 1.07, SIGN_AT[2] + 0.07);
      this.sign.add(p);
    }
    this.sign.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    R.add(this.sign);
    this.swing = new Actor(R, swingGeo);
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos);
      o.rotation.y = fg.yaw ?? 0;
      o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b });
      R.add(o);
    }
  }
  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  shotSun(id, s, L) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n2 = Math.hypot(x, z) || 1;
      fx += x / n2;
      fz += z / n2;
    }
    const n = Math.hypot(fx, fz) || 1;
    fx /= n;
    fz /= n;
    const ss = s;
    const az = THREE7.MathUtils.degToRad(ss.sunAz ?? SUN_SHOT[id]?.az ?? L.az), el = THREE7.MathUtils.degToRad(ss.sunEl ?? SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE7.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  actor(i) {
    while (this.actors.length <= i) this.actors.push(new Actor(this.root));
    return this.actors[i];
  }
  fx(i) {
    while (this.fxs.length <= i) this.fxs.push(new Fx(this.root));
    return this.fxs[i];
  }
  update(id, f, cam, scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), b = bridgeState(id, t);
    const focus = this.view(camAt(id, f), s.light, this.shotSun(id, s, LIGHTS[s.light]), t, cam, scene);
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    this.poseBridge(b, t, tau, id);
    this.sign.visible = id >= 14;
    this.moveSmoke(t, cam);
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    if (id === 8) {
      snapFx(tau, BOLT, st);
      splashFx(tau, st);
      if (tau > 33.1 && tau < SNAP) creakFx(t, [[BOLT[0] + 0.3, BOLT[1] + 0.14, BOLT[2] - 0.12], [BOLT[0] - 0.32, BOLT[1] + 0.08, BOLT[2] - 0.12]], st, 0.3);
    }
    if (id === 7 && t > 28.9) {
      const F = front(tau);
      creakFx(t, [3, 5.5, 8].map((dz) => [-2.7, chainY(F + dz, b) + 0.35, F + dz]), st);
    }
    this.cards(st, cam, s.light);
    return focus;
  }
  /** shadow-map size (the film uses 4096; the browser templates a smaller one) */
  setShadowSize(n) {
    this.sun.shadow.mapSize.set(n, n);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }
  /** frees every geometry, material, texture and drawing of the world (GPU memory) */
  dispose() {
    const seen = /* @__PURE__ */ new Set();
    this.root.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
      for (const m of [].concat(o.material || [])) {
        if (!m || seen.has(m)) continue;
        seen.add(m);
        for (const v of Object.values(m)) if (v?.isTexture && !seen.has(v)) {
          seen.add(v);
          v.dispose();
        }
        m.dispose();
      }
    });
    this.sun.shadow.map?.dispose();
    this.pool.dispose();
  }
  /** a Loomy template frame (tmpl.ts): the bridge stands rebuilt and at rest, no sign, no framing props */
  updateTemplate(fr, t, cam, scene) {
    const focus = this.view(fr.cam, fr.light, new THREE7.Vector3(...fr.sun), t, cam, scene);
    for (const g of this.fgs) g.o.visible = false;
    this.poseBridge({ bounce: 0, drop: 0, snap: 0, collapsed: false }, t, 0, 15);
    this.sign.visible = false;
    this.moveSmoke(t, cam);
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    this.cards(stageTemplate(fr.people, fr.effects, { pos: cam.position, right }, t, fr.light), cam, fr.light);
    return focus;
  }
  /** the lens, the light rig, the sky and the river for one frame (shared by the film and the templates) */
  view(c, light, sunDir, t, cam, scene) {
    const L = LIGHTS[light];
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.look);
    cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.2;
    cam.far = 1500;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[light];
    this.hemi.color.set(L.sky);
    this.hemi.groundColor.set(L.ground);
    this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol);
    this.sun.intensity = L.sunI;
    let Rr = THREE7.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220);
    this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr;
    sc.right = Rr;
    sc.top = Rr;
    sc.bottom = -Rr;
    sc.near = 20;
    sc.far = 480;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias;
    this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit);
    TONE.uShadeCol.value.set(...L.shade);
    TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert;
    TONE.uSideK.value = L.sideK;
    TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...LOOK[light].bounce);
    TONE.uSat.value = LOOK[light].sat;
    CHAR.uCharTint.value.set(...L.charTint);
    CHAR.uCharShade.value = L.charShade;
    CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad;
    CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE7.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    scene.fog = this.fog;
    scene.background = null;
    const showSun = light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE7.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position);
      this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE7.MathUtils.degToRad(24)));
      this.sunHalo.material.color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value);
    untone(wc.mid, W.wMidC.value);
    untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value);
    untone(wc.trough, W.wTrough.value);
    untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade);
    W.wTime.value = t;
    return focus;
  }
  /** chimney smoke drifting downwind */
  moveSmoke(t, cam) {
    for (const sm of this.smoke) {
      const u = (t * 0.11 + sm.k) % 1, sz = 3 + u * 9;
      sm.m.position.set(sm.top[0] - u * 18, sm.top[1] + u * 13 + u * u * 4, sm.top[2] + u * 3);
      sm.m.scale.set(sz, sz, 1);
      sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.85 * (1 - u) ** 1.2;
    }
  }
  /** the cast and effects of a frame as camera-facing cards (shared by the film and the templates) */
  cards(st, cam, light) {
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (p.geo !== "swing" && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "swing" ? this.swing : this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = p.geo === "swing" ? true : LIGHTS[light].actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    if (!used.includes(this.swing)) this.swing.mesh.visible = false;
    let fi = 0;
    const fused = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else {
        e.mesh.quaternion.copy(cam.quaternion);
        e.mesh.rotateZ(p.rot ?? 0);
      }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
  }
  poseBridge(b, t, tau, id) {
    const dy = ZS.map((z) => deckY(z, b));
    const top = this.deckTop.attributes.position.array, tn = this.deckTop.attributes.normal.array;
    const side = this.deckSide.attributes.position.array;
    for (let j = 0; j < NZ; j++) {
      const z = ZS[j], y = dy[j], slope = (dy[Math.min(NZ - 1, j + 1)] - dy[Math.max(0, j - 1)]) / ((Math.min(NZ - 1, j + 1) - Math.max(0, j - 1)) * 0.5);
      const nl = Math.hypot(1, slope);
      top.set([-2.5, y, z, 2.5, y, z], j * 6);
      tn.set([0, 1 / nl, -slope / nl, 0, 1 / nl, -slope / nl], j * 6);
      side.set([-2.5, y, z, -2.5, y - 0.45, z, 2.5, y, z, 2.5, y - 0.45, z, -2.5, y - 0.45, z, 2.5, y - 0.45, z], j * 18);
    }
    this.deckTop.attributes.position.needsUpdate = true;
    this.deckTop.attributes.normal.needsUpdate = true;
    this.deckSide.attributes.position.needsUpdate = true;
    const q2 = new THREE7.Quaternion(), one = V(1, 1, 1), pos = V(0, 0, 0), scl = V(1, 1, 1);
    POSTS.forEach((z, k) => {
      const y = deckY(z, b);
      for (const [i, x] of [[0, -2.42], [1, 2.42]]) this.posts.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, y, z), q2, one));
      this.ribs.setMatrixAt(k, this.m4.compose(pos.set(0, y - 0.58, z), q2, one));
    });
    this.posts.instanceMatrix.needsUpdate = true;
    this.ribs.instanceMatrix.needsUpdate = true;
    [[-2.42, 1.08], [-2.42, 0.6], [2.42, 1.08], [2.42, 0.6]].forEach(([x, h], i) => this.rails[i].set(ZS.map((z, j) => V(x, dy[j] + h, z))));
    [-2.7, 2.7].forEach((x, i) => this.chains[i].set(CZ.map((z) => V(x, chainY(z, b), z))));
    HANG.forEach((z, k) => {
      const base2 = deckY(z, b), up = Math.max(0.01, chainY(z, b) - base2);
      for (const [i, x] of [[0, -2.62], [1, 2.62]]) this.hangers.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, base2, z), q2, scl.set(1, up, 1)));
    });
    this.hangers.instanceMatrix.needsUpdate = true;
    FLAGS.forEach((z, k) => {
      const s = catY(z) - D0 > 3.3 ? 1 : 0;
      for (const [i, x] of [[0, -2.78], [1, 2.78]]) this.bunting.setMatrixAt(k * 2 + i, this.m4.compose(pos.set(x, chainY(z, b) - 0.1, z), q2, scl.set(s, s, s)));
    });
    this.bunting.instanceMatrix.needsUpdate = true;
    const sag = (a, e2, n2, dip) => Array.from({ length: n2 }, (_, i) => {
      const u = i / (n2 - 1);
      return a.clone().lerp(e2, u).add(V(0, -dip * 4 * u * (1 - u), 0));
    });
    const drape = (a, x, e2, n2) => {
      const w = V(x, D0 + 0.12, -30.1), h = Math.floor(n2 / 2);
      return Array.from({ length: n2 }, (_, i) => {
        if (i < h) {
          const u2 = i / h;
          return V(a.x + (w.x - a.x) * u2, a.y + (w.y - a.y) * u2 * u2, a.z + (w.z - a.z) * u2);
        }
        const u = (i - h) / (n2 - 1 - h);
        return V(w.x + (e2.x - w.x) * u, D0 + 0.12 + (e2.y - D0 - 0.12) * u ** 3, w.z + (e2.z - w.z) * u);
      });
    };
    const blend = (a, c, k) => a.map((p, i) => p.clone().lerp(c[i], k));
    const n = 18, kd = smooth(b.drop);
    this.stays[2].set(sag(V(-2.7, TOP, 27), V(-2.7, D0 + 0.86, 37), n, 0.5));
    this.stays[3].set(sag(V(2.7, TOP, 27), V(2.7, D0 + 0.86, 37), n, 0.5));
    const endR = V(2.7, D0 + 0.86, -37);
    this.stays[1].set(blend(sag(V(2.7, TOP, -27), endR, n, 0.5), drape(V(2.7, chainY(-27, b), -27), 2.7, endR, n), kd));
    const jerk = id === 8 && b.snap === 0 ? 0.06 * b.bounce : 0;
    const e = V(...snapEnd(b.snap)).add(V(0, 0.24 + 0.4 * jerk, jerk));
    const whip = sag(V(-2.7, TOP, -27), e, n, b.snap > 0 ? 0.25 + 0.6 * Math.sin(Math.min(1, b.snap) * Math.PI) : 0.5);
    const fallenEnd = e.clone().lerp(V(-3.3, D0 + 0.12, -33.2), kd);
    this.stays[0].set(blend(whip, drape(V(-2.7, chainY(-27, b), -27), -2.9, fallenEnd, n), kd));
    this.eye.position.copy(b.drop > 0 ? fallenEnd : e);
    const ts = id === 15 || b.snap === 0 ? -1 : Math.max(0, id >= 9 ? 9 : tau - SNAP);
    if (ts < 0) {
      this.boltA.position.set(BOLT[0] - 0.155, BOLT[1] + 0.4 * jerk, BOLT[2] + jerk);
      this.boltB.position.set(BOLT[0] + 0.155, BOLT[1] + 0.4 * jerk, BOLT[2] + jerk);
      this.boltA.rotation.set(0, 0, 0);
      this.boltB.rotation.set(0, 0, 0);
      this.eye.position.copy(e);
    } else {
      for (const [m, vx, vy, vz, sp] of [[this.boltA, -2.4, 4.4, 1.1, 17], [this.boltB, 2.1, 3.7, -0.9, -14]]) {
        const tl = Math.min(ts, (vy + Math.sqrt(vy * vy + 2 * 9.8 * (BOLT[1] - D0 - 0.08))) / 9.8);
        m.position.set(BOLT[0] + vx * tl + (vx > 0 ? 0.155 : -0.155), BOLT[1] + vy * tl - 4.9 * tl * tl, BOLT[2] + vz * tl);
        m.rotation.set(sp * tl * 0.4, sp * tl, 0);
      }
    }
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = i % 13 / 12, y = i < 13 ? 0.5 : -0.5;
        p.setXYZ(i, -u * 1.7, y + 0.05 * u * Math.sin(t * 4 - u * 3), 0.24 * u * Math.sin(t * 5.5 - u * 5 + fl.position.z));
      }
      p.needsUpdate = true;
    }
  }
};
var WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
var WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));       // depression angle of the view ray
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);         // 1 at the horizon .. 0 at 24 deg down
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);           // slow river along +x
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
var swingGeo = (() => {
  const g = new THREE7.PlaneGeometry(700 * SU_SWING, 2300 * SU_SWING);
  g.translate(0, -(1150 - 20) * SU_SWING, 0);
  return g;
})();
function quadUp(x0, x1, z0, z1, u, v, dy = 0) {
  const y = D0 + dy, g = new THREE7.BufferGeometry();
  g.setAttribute("position", new THREE7.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE7.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE7.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
function wallQuad(x0, x1, z, dir) {
  const g = new THREE7.BufferGeometry(), y0 = -0.6, y1 = D0;
  g.setAttribute("position", new THREE7.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z], 3));
  g.setAttribute("normal", new THREE7.Float32BufferAttribute(Array(6).fill([0, 0, dir]).flat(), 3));
  const u = Math.abs(x1 - x0) / 4, v = (y1 - y0) / 4;
  g.setAttribute("uv", new THREE7.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}

// src/lensblur.ts
import { Uniform as Uniform51 } from "three";
var frag = (
  /* glsl */
  `
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px at 1080x1920) of things at infinity; 0 = off
uniform float nearScale;  // extra blur for things in front of the focus plane
uniform float maxCoC;     // px at 1080x1920
#define GOLDEN 2.39996323

float cocAt(float d, float s) {               // signed CoC radius in output px
  float c = cInf * s * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * s, maxCoC * s);
}
float distAt(vec2 uv) { return -getViewZ(readDepth(uv)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (cInf < 0.25) { outputColor = inputColor; return; }
  float s = resolution.y / 1920.0;             // output px per 1080x1920 px
  float d0 = -getViewZ(depth);
  float r0 = abs(cocAt(d0, s));
  float R = r0 * SPREAD;
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R;
      float a = float(i) * GOLDEN + ROT;
      vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds, s)) * SPREAD;
      if (ds > d0) rs = min(rs, R);            // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0); // does the sample's disc reach us?
      acc += texture2D(inputBuffer, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;                      // already covered by the disc gather
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;              // only things in front of us
    float rs = abs(cocAt(ds, s));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(inputBuffer, suv).rgb * w; fw += w;
    cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  outputColor = vec4(col, inputColor.a);
}`
);
var PRE = { taps: 16, spread: 0.287, nearTaps: 0, rot: 0.61 };
var MAIN = { taps: 64, spread: 0.958, nearTaps: 32, rot: 0 };
var LensBlurEffect = class extends Effect {
  constructor({ maxCoC = 24, nearScale = 1.2, stage: stage2 = MAIN } = {}) {
    super("LensBlurEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      defines: /* @__PURE__ */ new Map([
        ["TAPS", String(stage2.taps)],
        ["SPREAD", stage2.spread.toFixed(4)],
        ["NEAR_TAPS", String(stage2.nearTaps)],
        ["ROT", stage2.rot.toFixed(4)]
      ]),
      uniforms: /* @__PURE__ */ new Map([
        ["focus", new Uniform51(10)],
        ["cInf", new Uniform51(0)],
        ["nearScale", new Uniform51(nearScale)],
        ["maxCoC", new Uniform51(maxCoC)]
      ])
    });
  }
  set focus(v) {
    this.uniforms.get("focus").value = v;
  }
  get focus() {
    return this.uniforms.get("focus").value;
  }
  set cInf(v) {
    this.uniforms.get("cInf").value = v;
  }
  get cInf() {
    return this.uniforms.get("cInf").value;
  }
};
var LensBlur = class {
  pre;
  main;
  constructor({ maxCoC = 24, nearScale = 1.2 } = {}) {
    this.pre = new LensBlurEffect({ maxCoC, nearScale, stage: PRE });
    this.main = new LensBlurEffect({ maxCoC, nearScale, stage: MAIN });
  }
  set focus(v) {
    this.pre.focus = v;
    this.main.focus = v;
  }
  set cInf(v) {
    this.pre.cInf = v;
    this.main.cInf = v;
  }
  dispose() {
    this.pre.dispose();
    this.main.dispose();
  }
};

// src/grade.ts
import { Uniform as Uniform52, Vector3 as Vector312, Vector2 as Vector229 } from "three";
var frag2 = (
  /* glsl */
  `
uniform float gradeKy[7];
uniform float gradeKm[7];
uniform vec3 gradeSat;      // x = shadows, y = mids, z = highlights
uniform vec3 gradeTintS;    // zero-luma RGB offsets (sRGB-encoded units)
uniform vec3 gradeTintM;
uniform vec3 gradeTintH;
uniform vec2 gradeVig;      // x = strength k, y = start radius r0
uniform float gradeAmount;

vec3 gradeEncode(vec3 c) {   // linear -> sRGB
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 gradeDecode(vec3 c) {   // sRGB -> linear
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
float gradeHermite(float v, float x0, float x1, float y0, float y1, float m0, float m1) {
  float h = x1 - x0, t = (v - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2.0 * t3 - 3.0 * t2 + 1.0) * y0 + (t3 - 2.0 * t2 + t) * h * m0 + (-2.0 * t3 + 3.0 * t2) * y1 + (t3 - t2) * h * m1;
}
float gradeCurve(float v) {
  v = clamp(v, 0.0, 1.0);
  if (v < 0.1)  return gradeHermite(v, 0.0, 0.1, gradeKy[0], gradeKy[1], gradeKm[0], gradeKm[1]);
  if (v < 0.25) return gradeHermite(v, 0.1, 0.25, gradeKy[1], gradeKy[2], gradeKm[1], gradeKm[2]);
  if (v < 0.5)  return gradeHermite(v, 0.25, 0.5, gradeKy[2], gradeKy[3], gradeKm[2], gradeKm[3]);
  if (v < 0.75) return gradeHermite(v, 0.5, 0.75, gradeKy[3], gradeKy[4], gradeKm[3], gradeKm[4]);
  if (v < 0.9)  return gradeHermite(v, 0.75, 0.9, gradeKy[4], gradeKy[5], gradeKm[4], gradeKm[5]);
  return gradeHermite(v, 0.9, 1.0, gradeKy[5], gradeKy[6], gradeKm[5], gradeKm[6]);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 src = gradeEncode(inputColor.rgb);
  vec3 c = vec3(gradeCurve(src.r), gradeCurve(src.g), gradeCurve(src.b));
  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(c, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y);
  float wH = smoothstep(0.45, 1.0, y);
  float wM = 1.0 - wS - wH;
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH;
  c = vec3(y) + s * (c - vec3(y));
  c += wS * gradeTintS + wM * gradeTintM + wH * gradeTintH;
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p) * 0.70710678;
  c *= 1.0 - gradeVig.x * smoothstep(gradeVig.y, 1.0, r);
  c = clamp(c, 0.0, 1.0);
  outputColor = vec4(gradeDecode(mix(src, c, gradeAmount)), inputColor.a);
}`
);
var E_CB = [0, -0.18733, 1.8556];
var E_CR = [1.5748, -0.46813, 0];
var tintRGB = (cb, cr) => new Vector312(cb * E_CB[0] + cr * E_CR[0], cb * E_CB[1] + cr * E_CR[1], cb * E_CB[2] + cr * E_CR[2]);
var KX = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
function monoTangents(ky) {
  const n = KX.length, h = [], d = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) {
    h.push(KX[k + 1] - KX[k]);
    d.push((ky[k + 1] - ky[k]) / h[k]);
  }
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) {
      m[k] = 0;
      continue;
    }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  return m;
}
var GradeEffect = class extends Effect {
  constructor(p, amount = 1) {
    super("GradeEffect", frag2, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: /* @__PURE__ */ new Map([
        ["gradeKy", new Uniform52(p.ky.slice())],
        ["gradeKm", new Uniform52(monoTangents(p.ky))],
        ["gradeSat", new Uniform52(new Vector312(...p.sat))],
        ["gradeTintS", new Uniform52(tintRGB(...p.tintS))],
        ["gradeTintM", new Uniform52(tintRGB(...p.tintM))],
        ["gradeTintH", new Uniform52(tintRGB(...p.tintH))],
        ["gradeVig", new Uniform52(new Vector229(...p.vig))],
        ["gradeAmount", new Uniform52(amount)]
      ])
    });
  }
  /** switch preset per shot (day <-> golden) or blend two presets during a crossfade/time-of-day change */
  set(p, q2, t = 0) {
    const L = (a, b) => a + (b - a) * t;
    const r = q2 ? {
      ky: p.ky.map((v, i) => L(v, q2.ky[i])),
      sat: [L(p.sat[0], q2.sat[0]), L(p.sat[1], q2.sat[1]), L(p.sat[2], q2.sat[2])],
      tintS: [L(p.tintS[0], q2.tintS[0]), L(p.tintS[1], q2.tintS[1])],
      tintM: [L(p.tintM[0], q2.tintM[0]), L(p.tintM[1], q2.tintM[1])],
      tintH: [L(p.tintH[0], q2.tintH[0]), L(p.tintH[1], q2.tintH[1])],
      vig: [L(p.vig[0], q2.vig[0]), L(p.vig[1], q2.vig[1])]
    } : p;
    const u = this.uniforms;
    u.get("gradeKy").value = r.ky.slice();
    u.get("gradeKm").value = monoTangents(r.ky);
    u.get("gradeSat").value.set(...r.sat);
    u.get("gradeTintS").value = tintRGB(...r.tintS);
    u.get("gradeTintM").value = tintRGB(...r.tintM);
    u.get("gradeTintH").value = tintRGB(...r.tintH);
    u.get("gradeVig").value.set(...r.vig);
  }
  get amount() {
    return this.uniforms.get("gradeAmount").value;
  }
  set amount(v) {
    this.uniforms.get("gradeAmount").value = v;
  }
};
var GRADE_DAY2 = {
  ky: [0, 0.1, 0.28, 0.6, 0.835, 0.945, 1],
  sat: [1, 1.05, 1],
  tintS: [0.01, 2e-3],
  tintM: [0, 0],
  tintH: [6e-3, 0],
  vig: [0.12, 0.45]
};
var GRADE_GOLDEN2 = {
  ky: [0, 0.09, 0.245, 0.54, 0.8, 0.93, 1],
  sat: [1, 1.12, 1.15],
  tintS: [0.02, 2e-3],
  tintM: [0, 0],
  tintH: [-0.012, 6e-3],
  vig: [0.2, 0.4]
};
var GRADES = { day: GRADE_DAY2, golden: GRADE_GOLDEN2 };
var GRADE_STRENGTH = { day: 1, golden: 1 };
function gradeFor(fx, light) {
  const tag = fx;
  if (tag._light !== light) {
    fx.set(GRADES[light]);
    tag._light = light;
  }
  fx.amount = GRADE_STRENGTH[light];
}

// src/tmpl.ts
var PLACES = {
  bridge: { m: [0, D0, -9], d: [0.253, -0.967] },
  // shot 15: tourists on the deck
  bank: { m: [-4.6, D0, -33.6], d: [-0.013, -1] },
  // shot 14: the bank at the bridge end
  park: { m: [PARK[0] + 0.55, D0, PARK[2] - 3.6], d: [0, -1] }
  // shot 12: in front of the swing set
};
var PLACE_NAMES = ["bridge", "bank", "park", "town"];
var clamp012 = (x) => Math.max(0, Math.min(1, x));
var glide2 = (u) => {
  const x = clamp012(u);
  return x * x * x * (x * (6 * x - 15) + 10);
};
var lerp = (a, b, k) => a + (b - a) * k;
var speaking = (ws, t) => ws.some((w) => t >= w.start - 0.04 && t <= w.end + 0.04);
var FACE2 = { stand: "smile", talk: "smile", point: "grin", surprised: "shock", shrug: "nervous", cheer: "laugh", think: "nervous", flinch: "pained" };
var TALK = ["relief_open", "smile"];
function frameAt(s, t) {
  const dur = Math.max(0.1, s.end - s.start), k = glide2(t / dur);
  const place = PLACES[s.place] || PLACES.bridge;
  const [mx, my, mz] = place.m;
  let [dx, dz] = place.d;
  if (s.camera === "orbit") {
    const a = lerp(-0.18, 0.18, k), c = Math.cos(a), sn = Math.sin(a);
    [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c];
  }
  const rx = dz, rz = -dx;
  const at = (r, d) => [mx + rx * r + dx * d, mz + rz * r + dz * d];
  const words = s.words.map((w) => ({ start: w.start - s.start, end: w.end - s.start }));
  const talking = speaking(words, t);
  const face = (pose, i) => (pose === "talk" || pose === "stand" && i === 0) && talking && i === 0 ? TALK[Math.floor(t * 9) % 2] : FACE2[pose] || "smile";
  const people = [], effects = [];
  const who = (i) => s.cast[i % Math.max(1, s.cast.length)] ?? i;
  const onset = (a) => t >= a;
  let dist = 3.2, h = 1.5, lookY = 1.3, fov = 36, lookSide = 0, cInf = 8;
  switch (s.kind) {
    case "talk": {
      const [x, z] = at(0, 0);
      people.push({ look: who(0), x, z, expr: face(s.pose === "stand" ? "talk" : s.pose, 0), wave: s.pose === "talk" && talking ? Math.sin(t * 5) * 0.6 : void 0 });
      dist = 3;
      h = 1.55;
      lookY = 1.35;
      fov = 34;
      cInf = 9;
      break;
    }
    case "two": {
      const [ax, az2] = at(-0.62, 0), [bx, bz] = at(0.62, -0.15);
      people.push({ look: who(0), x: ax, z: az2, expr: face("talk", 0), facing: 1 });
      people.push({ look: who(1), x: bx, z: bz, expr: onset(dur * 0.4) ? FACE2[s.pose] || "smile" : "smile", facing: -1 });
      dist = 4.4;
      h = 1.6;
      lookY = 1.25;
      fov = 38;
      cInf = 6;
      break;
    }
    case "react": {
      const [x, z] = at(0, 0);
      people.push({ look: who(0), x, z, expr: onset(0.15) ? FACE2[s.pose === "talk" ? "surprised" : s.pose] || "shock" : "neutral" });
      if (s.pose === "surprised" || s.pose === "flinch") effects.push({ kind: "stars", x: x + rx * 0.05, y: my + 2.2, z, u: clamp012((t - 0.15) / 0.5), size: 0.8 });
      dist = 2.5;
      h = 1.7;
      lookY = 1.72;
      fov = 32;
      cInf = 13;
      break;
    }
    case "walk": {
      const d = lerp(-3.2, 0, clamp012(t / dur));
      const [x, z] = at(0, d);
      people.push({ look: who(0), x, z, expr: face("talk", 0), walk: t * 0.9 });
      dist = 4.6;
      h = 1.6;
      lookY = 1.2;
      fov = 38;
      cInf = 5;
      break;
    }
    case "point": {
      const [x, z] = at(0.22, 0), [sx, sz] = at(-0.62, -0.3);
      people.push({ look: who(0), x, z, expr: face("point", 0), wave: onset(0.3) ? 0.9 : void 0, facing: -1 });
      effects.push({ kind: "burst", x: sx, y: my + 1.7, z: sz, u: clamp012((t - 0.35) / 0.45), size: 1 });
      dist = 4.6;
      h = 1.55;
      lookY = 1.35;
      fov = 36;
      lookSide = -0.15;
      cInf = 7;
      break;
    }
    case "group": {
      [[-1.05, -0.35], [0, 0], [1.05, -0.35]].forEach(([r, d], i) => {
        const [x, z] = at(r, d), cheer = s.pose === "cheer" || s.pose === "talk";
        people.push({ look: who(i), x, z, expr: cheer ? "laugh" : FACE2[s.pose] || "smile", wave: cheer ? Math.sin(t * 9 + i * 1.3) : void 0, hop: cheer ? Math.max(0, Math.sin(t * 7 + i)) * 0.16 : 0 });
      });
      dist = 6;
      h = 1.8;
      lookY = 1.2;
      fov = 40;
      cInf = 4;
      break;
    }
    default: {
      const n2 = Math.min(2, Math.max(1, s.cast.length));
      for (let i = 0; i < n2; i++) {
        const [x, z] = at(i ? 0.9 : -0.3, i ? -0.5 : 0);
        people.push({ look: who(i), x, z, expr: FACE2[s.pose] || "smile" });
      }
      dist = 9.5;
      h = 2.6;
      lookY = 1.4;
      fov = 42;
      cInf = 0;
    }
  }
  let side = 0, roll = 0;
  switch (s.camera) {
    case "push-in":
      dist *= lerp(1.08, 0.92, k);
      break;
    case "pull-out":
      dist *= lerp(0.9, 1.1, k);
      break;
    case "pan-left":
      side += lerp(0.35, -0.35, k);
      break;
    case "pan-right":
      side += lerp(-0.35, 0.35, k);
      break;
    case "tilt-up":
      lookY += lerp(-0.4, 0.1, k);
      break;
    case "tilt-down":
      lookY += lerp(0.3, -0.15, k);
      break;
    case "impact":
      dist *= t < dur * 0.3 ? 1.05 : lerp(1.05, 0.8, glide2((t - dur * 0.3) / 0.25));
      roll = 0.03 * glide2((t - dur * 0.3) / 0.25);
      break;
    case "vertigo":
      dist *= lerp(1.3, 0.85, k);
      fov *= lerp(0.8, 1.15, k);
      break;
    default:
      dist *= lerp(1.03, 0.97, k);
  }
  const pos = [mx + dx * dist + rx * side, my + h, mz + dz * dist + rz * side];
  const look = [mx + rx * (lookSide + side * 0.6), my + lookY, mz + rz * (lookSide + side * 0.6)];
  const L = LIGHTS[s.light], az = L.az * Math.PI / 180, el = L.el * Math.PI / 180;
  const fx = -dx, fz = -dz, hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  const n = Math.hypot(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)) || 1;
  const sun = [hx * Math.cos(el) / n, Math.sin(el) / n, hz * Math.cos(el) / n];
  const focus = people.length ? [people[0].x, my + 1.4, people[0].z] : look;
  return { cam: { pos, look, fov, roll }, light: s.light, sun, people, effects, cInf, focus };
}
function aerialAt(light, k) {
  const golden = light === "golden";
  const a = golden ? [14, 10.5, -47] : [24, 26, -78], b = golden ? [-1, 7, -4] : [0, 4, -8];
  const m = lerp(1.04, 0.96, glide2(k));
  return { pos: [b[0] + (a[0] - b[0]) * m, b[1] + (a[1] - b[1]) * m, b[2] + (a[2] - b[2]) * m], look: b, fov: golden ? 40 : 42, roll: 0 };
}

// src/viking.ts
import * as THREE8 from "three";
var lam2 = (color2) => new THREE8.MeshLambertMaterial({ color: color2 });
var stripes = () => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#f3ead6" : "#c0392b";
    g.fillRect(0, i * 32, 64, 32);
  }
  const t = new THREE8.CanvasTexture(c);
  t.colorSpace = THREE8.SRGBColorSpace;
  return t;
};
function longship() {
  const g = new THREE8.Group();
  const wood = lam2(9067059), dark = lam2(6044192), shieldCols = [12597547, 15320170, 2781079, 15985366];
  const L = 7, p = new THREE8.Shape();
  p.moveTo(-L, 1.9);
  p.quadraticCurveTo(-L + 1.2, 0.1, -L + 3, 0);
  p.lineTo(L - 3, 0);
  p.quadraticCurveTo(L - 1.2, 0.1, L, 1.9);
  p.lineTo(L - 0.4, 1.9);
  p.quadraticCurveTo(L - 1.6, 0.85, L - 3.2, 0.8);
  p.lineTo(-L + 3.2, 0.8);
  p.quadraticCurveTo(-L + 1.6, 0.85, -L + 0.4, 1.9);
  p.closePath();
  const hull = new THREE8.ExtrudeGeometry(p, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.15, bevelSegments: 2, curveSegments: 16 });
  hull.translate(0, 0, -1.3);
  g.add(new THREE8.Mesh(hull, wood));
  for (const y of [0.35, 0.6]) for (const z of [-1.42, 1.42]) {
    const s = new THREE8.Mesh(new THREE8.BoxGeometry(2 * L - 5.5, 0.06, 0.04), dark);
    s.position.set(0, y, z);
    g.add(s);
  }
  const neck = new THREE8.Mesh(new THREE8.CylinderGeometry(0.16, 0.24, 1.6, 10), wood);
  neck.position.set(L - 0.05, 2.55, 0);
  neck.rotation.z = -0.35;
  g.add(neck);
  const head = new THREE8.Mesh(new THREE8.BoxGeometry(0.75, 0.42, 0.36), wood);
  head.position.set(L + 0.35, 3.3, 0);
  head.rotation.z = -0.15;
  g.add(head);
  const jaw = new THREE8.Mesh(new THREE8.ConeGeometry(0.16, 0.55, 8), wood);
  jaw.position.set(L + 0.85, 3.2, 0);
  jaw.rotation.z = -Math.PI / 2;
  g.add(jaw);
  for (const z of [-0.19, 0.19]) {
    const eye2 = new THREE8.Mesh(new THREE8.SphereGeometry(0.06, 8, 6), lam2(15909424));
    eye2.position.set(L + 0.45, 3.38, z);
    g.add(eye2);
  }
  const tail = new THREE8.Mesh(new THREE8.TorusGeometry(0.42, 0.12, 8, 18, Math.PI * 1.4), wood);
  tail.position.set(-L - 0.1, 2.35, 0);
  tail.rotation.z = 0.6;
  g.add(tail);
  const mast = new THREE8.Mesh(new THREE8.CylinderGeometry(0.11, 0.14, 7.2, 10), dark);
  mast.position.set(0.3, 4.4, 0);
  g.add(mast);
  const yard = new THREE8.Mesh(new THREE8.CylinderGeometry(0.07, 0.07, 5.6, 8), dark);
  yard.rotation.x = Math.PI / 2;
  yard.position.set(0.45, 7.3, 0);
  g.add(yard);
  const sail = new THREE8.Mesh(new THREE8.PlaneGeometry(5.2, 4.2, 6, 4), new THREE8.MeshLambertMaterial({ map: stripes(), side: THREE8.DoubleSide }));
  const pos = sail.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.55 * (1 - (pos.getX(i) / 2.6) ** 2) * (0.6 + 0.4 * (1 - pos.getY(i) / 2.1)));
  sail.geometry.computeVertexNormals();
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0.55, 5.2, 0);
  g.add(sail);
  for (let i = 0; i < 9; i++) for (const z of [-1, 1]) {
    const x = -L + 3.4 + i * ((2 * L - 6.8) / 8);
    const sh = new THREE8.Mesh(new THREE8.CylinderGeometry(0.42, 0.42, 0.07, 18), lam2(shieldCols[(i + (z > 0 ? 1 : 0)) % 4]));
    sh.rotation.x = Math.PI / 2;
    sh.position.set(x, 1.25, z * 1.52);
    g.add(sh);
    const boss = new THREE8.Mesh(new THREE8.SphereGeometry(0.1, 8, 6), lam2(12107462));
    boss.position.set(x, 1.25, z * 1.58);
    g.add(boss);
    if (i % 2 === 0) {
      const oar = new THREE8.Mesh(new THREE8.CylinderGeometry(0.04, 0.04, 3.4, 6), dark);
      oar.position.set(x + 0.4, 0.45, z * 2.6);
      oar.rotation.x = z * 1;
      g.add(oar);
    }
  }
  g.traverse((o) => {
    const m = o;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}
var themeFor = (text) => /\b(vikings?|norse|norsemen|longships?|danes|lindisfarne|ragnar|danelaw)\b/i.test(text) ? "viking" : "town";

// src/driver.ts
var makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w, h) => setSize(Math.round(1920 * w / Math.max(h, 1)), 1920);
  return b;
};
var View = class {
  renderer;
  scene = new THREE9.Scene();
  camera;
  world;
  composer;
  ink;
  lens;
  grade;
  target = new THREE9.Vector3();
  constructor(kit, w, h, perf = {}) {
    const r = this.renderer = new THREE9.WebGLRenderer({ antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE9.PCFSoftShadowMap;
    r.toneMapping = THREE9.NoToneMapping;
    r.outputColorSpace = THREE9.SRGBColorSpace;
    this.camera = new THREE9.PerspectiveCamera(40, w / h, 0.2, 1500);
    this.world = new World(kit);
    this.scene.add(this.world.root);
    if (perf.shadow) this.world.setShadowSize(perf.shadow);
    this.composer = new EffectComposer(r, { multisampling: perf.msaa ?? 4, frameBufferType: THREE9.HalfFloatType });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ink = new InkPass(this.scene, this.camera);
    this.composer.addPass(this.ink);
    this.lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
    this.composer.addPass(new EffectPass(this.camera, this.lens.pre));
    this.composer.addPass(new EffectPass(this.camera, this.lens.main));
    this.grade = new GradeEffect(GRADES.day, GRADE_STRENGTH.day);
    this.composer.addPass(new EffectPass(this.camera, makeBloom(), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), this.grade));
    this.composer.setSize(w, h);
  }
  draw(id, f) {
    const cam = this.camera;
    this.target.copy(this.world.update(id, f, cam, this.scene));
    noInkFallback(this.world.root);
    const d = dofAt(f);
    const fwd = new THREE9.Vector3(), fpt = new THREE9.Vector3();
    cam.getWorldDirection(fwd);
    if (d.focus) fpt.set(...d.focus(f));
    else fpt.copy(this.target);
    this.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    this.lens.cInf = d.cInf;
    gradeFor(this.grade, SHOTS[id - 1].light);
    this.composer.render();
    return this.renderer.domElement;
  }
  /** frees the GPU: the post chain, the world, the drawings and the WebGL context itself */
  dispose() {
    this.composer.dispose();
    this.ink.dispose();
    this.lens.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
  /** one frame of a Loomy template shot (tmpl.ts) */
  drawTemplate(s, t) {
    const cam = this.camera, local = t - s.start;
    const fr = frameAt(s, local);
    if (s.place === "town") {
      fr.cam = aerialAt(s.light, local / Math.max(0.1, s.end - s.start));
      fr.people = [];
      fr.effects = [];
      fr.cInf = 0;
      fr.focus = fr.cam.look;
    }
    this.world.updateTemplate(fr, t, cam, this.scene);
    noInkFallback(this.world.root);
    const fwd = new THREE9.Vector3(), fpt = new THREE9.Vector3(...fr.focus);
    cam.getWorldDirection(fwd);
    this.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    this.lens.cInf = fr.cInf;
    gradeFor(this.grade, fr.light);
    this.composer.render();
    return this.renderer.domElement;
  }
};
async function createTemplated({ width = 1080, height = 1920, shots = [], perf = {}, theme = "town" } = {}) {
  const kit = await loadKit();
  setCardMax(perf.cardMax ?? 1080);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d", { alpha: false });
  setTheme(theme);
  const view = new View(kit, width, height, { msaa: perf.msaa ?? 2, shadow: perf.shadow ?? 2048 });
  if (theme === "viking") {
    const a = longship();
    a.position.set(-0.5, D0 + 0.05, -29.9);
    a.rotation.y = 0.22;
    a.scale.setScalar(0.82);
    view.world.root.add(a);
    const b = longship();
    b.position.set(-12, D0 + 0.05, -29.2);
    b.rotation.y = -0.18;
    b.scale.setScalar(0.74);
    view.world.root.add(b);
  }
  const list = [...shots].sort((a, b) => a.start - b.start);
  const at = (t) => list.find((s) => t >= s.start && t < s.end) ?? list[list.length - 1];
  return {
    canvas,
    shots: list,
    renderAt(t) {
      const s = at(t);
      g.globalAlpha = 1;
      g.drawImage(view.drawTemplate(s, t), 0, 0, width, height);
      const i = list.indexOf(s), prev = list[i - 1];
      if (prev && prev.place !== s.place) {
        const k = (t - s.start) * 30;
        if (k < 6) {
          g.globalAlpha = 0.55 * (1 - k / 6);
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, width, height);
          g.globalAlpha = 1;
        }
      }
      return canvas;
    },
    dispose() {
      view.dispose();
    }
  };
}
async function createBridge({ width = 1080, height = 1920 } = {}) {
  const kit = await loadKit();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d", { alpha: false });
  const views = [];
  const view = (i) => views[i] ||= new View(kit, width, height);
  return {
    canvas,
    total: TOTAL,
    kitCount: Object.keys(kit).length,
    renderFrame(f) {
      g.globalAlpha = 1;
      g.fillStyle = "#cfe3f2";
      g.fillRect(0, 0, width, height);
      layersAt(f).forEach((l, i) => {
        g.globalAlpha = l.alpha;
        g.drawImage(view(i).draw(l.id, f), 0, 0, width, height);
      });
      g.globalAlpha = 1;
      const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
      if (flash > 0) {
        g.globalAlpha = flash;
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, width, height);
        g.globalAlpha = 1;
      }
      return canvas;
    }
  };
}
export {
  PLACE_NAMES,
  SHOTS,
  TOTAL,
  createBridge,
  createTemplated,
  setStaticBase,
  themeFor
};
/*! Bundled license information:

postprocessing/build/index.js:
  (**
   * postprocessing v6.36.4 build Tue Nov 05 2024
   * https://github.com/pmndrs/postprocessing
   * Copyright 2015-2024 Raoul van Rüschen
   * @license Zlib
   *)
*/
