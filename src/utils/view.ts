import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';

/**
 * Lienzo al doble de densidad: todo el juego sigue pensando en 384x224 píxeles lógicos (reglas, escenarios,
 * HUD, aventura), pero se dibuja en un lienzo de 768x448. Cada píxel lógico ocupa 2x2 píxeles reales, así que
 * el arte de siempre se ve idéntico, y el arte de alta densidad (tiras con `res: 2`) puede mostrar el doble de
 * detalle dibujándose a escala 0,5.
 *
 * Cómo: la cámara principal de cada escena usa zoom 2 con origen en la esquina (setupView). Con el origen en
 * la esquina, scrollX/scrollY siguen siendo el borde izquierdo/superior de la vista en píxeles lógicos y los
 * objetos fijos a la pantalla (scrollFactor 0) y el paralaje quedan donde estaban. Phaser supone una cámara
 * centrada en sus cálculos de seguimiento, límites y paneo: aquí se corrigen para la vista lógica.
 */
export const RENDER_SCALE = 2;
export const CANVAS_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const CANVAS_HEIGHT = GAME_HEIGHT * RENDER_SCALE;

type Cam = Phaser.Cameras.Scene2D.Camera;
/** Lo interno de la cámara de Phaser que hace falta tocar (no está en los tipos públicos). */
interface CamInternals {
  _follow: { x: number; y: number } | null;
  _bounds: Phaser.Geom.Rectangle;
  matrix: Phaser.GameObjects.Components.TransformMatrix;
  renderList: unknown[];
  renderRoundPixels: boolean;
  emit(event: string, ...args: unknown[]): boolean;
  shakeEffect: Phaser.Cameras.Scene2D.Effects.Shake & ShakeInternals;
}
interface ShakeInternals {
  _elapsed: number;
  _offsetX: number;
  _offsetY: number;
  _onUpdate: ((cam: Cam, progress: number) => void) | null;
  _onUpdateScope: unknown;
  effectComplete(): void;
}

const viewW = (c: Cam) => c.width / c.zoomX;
const viewH = (c: Cam) => c.height / c.zoomY;

function clampX(this: Cam, x: number): number {
  const b = (this as unknown as CamInternals)._bounds;
  return Phaser.Math.Clamp(x, b.x, Math.max(b.x, b.x + b.width - viewW(this)));
}

function clampY(this: Cam, y: number): number {
  const b = (this as unknown as CamInternals)._bounds;
  return Phaser.Math.Clamp(y, b.y, Math.max(b.y, b.y + b.height - viewH(this)));
}

function centerOnX(this: Cam, x: number): Cam {
  this.midPoint.x = x;
  this.scrollX = x - viewW(this) / 2;
  if (this.useBounds) this.scrollX = this.clampX(this.scrollX);
  return this;
}

function centerOnY(this: Cam, y: number): Cam {
  this.midPoint.y = y;
  this.scrollY = y - viewH(this) / 2;
  if (this.useBounds) this.scrollY = this.clampY(this.scrollY);
  return this;
}

function getScroll(this: Cam, x: number, y: number, out?: Phaser.Math.Vector2): Phaser.Math.Vector2 {
  const o = out ?? new Phaser.Math.Vector2();
  o.x = x - viewW(this) / 2;
  o.y = y - viewH(this) / 2;
  if (this.useBounds) { o.x = this.clampX(o.x); o.y = this.clampY(o.y); }
  return o;
}

/** Camera.preRender de Phaser 3.90 para una cámara con origen (0, 0): seguimiento y vista en unidades lógicas. */
function preRender(this: Cam): void {
  const self = this as unknown as Cam & CamInternals;
  self.renderList.length = 0;
  const w = viewW(this), h = viewH(this);
  // el redondeo lo hace installPixelSnap a la rejilla lógica; el de Phaser (a píxel real) dejaría medios píxeles lógicos
  self.renderRoundPixels = false;
  let sx = this.scrollX, sy = this.scrollY;
  const follow = self._follow;
  const dz = this.deadzone;
  if (dz) Phaser.Geom.Rectangle.CenterOn(dz, this.midPoint.x, this.midPoint.y);
  let followed = false;
  if (follow && !this.panEffect.isRunning) {
    const fx = follow.x - this.followOffset.x;
    const fy = follow.y - this.followOffset.y;
    const L = Phaser.Math.Linear;
    if (dz) {
      if (fx < dz.x) sx = L(sx, sx - (dz.x - fx), this.lerp.x);
      else if (fx > dz.right) sx = L(sx, sx + (fx - dz.right), this.lerp.x);
      if (fy < dz.y) sy = L(sy, sy - (dz.y - fy), this.lerp.y);
      else if (fy > dz.bottom) sy = L(sy, sy + (fy - dz.bottom), this.lerp.y);
    } else {
      sx = L(sx, fx - w / 2, this.lerp.x);
      sy = L(sy, fy - h / 2, this.lerp.y);
    }
    followed = true;
  }
  if (this.roundPixels) { sx = Math.floor(sx); sy = Math.floor(sy); }
  if (this.useBounds) { sx = this.clampX(sx); sy = this.clampY(sy); }
  this.scrollX = sx;
  this.scrollY = sy;
  this.midPoint.set(sx + w / 2, sy + h / 2);
  this.worldView.setTo(Math.floor(sx + 0.5), Math.floor(sy + 0.5), Math.floor(w + 0.5), Math.floor(h + 0.5));
  self.matrix.applyITRS(Math.floor(this.x + 0.5), Math.floor(this.y + 0.5), (this as unknown as { rotation: number }).rotation, this.zoomX, this.zoomY);
  self.shakeEffect.preRender();
  if (followed) self.emit(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this, follow);
}

/** Temblor medido en la vista lógica (Phaser lo mediría en el lienzo y con el zoom, cuatro veces más fuerte). */
function shakeUpdate(this: Phaser.Cameras.Scene2D.Effects.Shake & ShakeInternals, _time: number, delta: number): void {
  if (!this.isRunning) return;
  this._elapsed += delta;
  this.progress = Phaser.Math.Clamp(this._elapsed / this.duration, 0, 1);
  if (this._onUpdate) this._onUpdate.call(this._onUpdateScope, this.camera, this.progress);
  if (this._elapsed < this.duration) {
    const w = viewW(this.camera), h = viewH(this.camera), i = this.intensity;
    this._offsetX = Math.random() * i.x * w * 2 - i.x * w;
    this._offsetY = Math.random() * i.y * h * 2 - i.y * h;
    // en píxeles lógicos enteros, como antes
    if (this.camera.roundPixels) { this._offsetX = Math.round(this._offsetX); this._offsetY = Math.round(this._offsetY); }
  } else {
    this.effectComplete();
  }
}

/**
 * Prepara la cámara principal de la escena para la vista lógica de 384x224 sobre el lienzo de 768x448.
 * Se llama al comienzo del create() de cada escena (la cámara principal se crea de nuevo en cada arranque).
 */
export function setupView(scene: Phaser.Scene): Cam {
  const cam = scene.cameras.main;
  Object.assign(cam, { preRender, clampX, clampY, centerOnX, centerOnY, getScroll });
  Object.assign((cam as unknown as CamInternals).shakeEffect, { update: shakeUpdate });
  cam.setOrigin(0, 0).setZoom(RENDER_SCALE);
  return cam;
}

/**
 * Redondeo a la rejilla lógica: Phaser redondea la esquina de cada cuadro a píxel real, y con zoom 2 eso deja
 * objetos a medio píxel lógico (centrados con ancho impar, textos, partículas). Aquí la esquina se lleva al
 * múltiplo de RENDER_SCALE más cercano, igual que antes se llevaba al píxel entero, y se mueve el cuadro entero.
 * Solo al dibujar en el lienzo: las texturas dinámicas y los filtros dibujan a su propia escala.
 */
let snapping = false;
/** Cuadro sin girar (lados horizontales y verticales): sus cuatro esquinas usan solo dos x y dos y. */
const twoValues = (p: number, q: number, r: number, t: number) => {
  const lo = Math.min(p, q, r, t), hi = Math.max(p, q, r, t);
  return (p === lo || p === hi) && (q === lo || q === hi) && (r === lo || r === hi) && (t === lo || t === hi);
};
const axisAligned = (a: number[]) => twoValues(a[1], a[3], a[5], a[7]) && twoValues(a[2], a[4], a[6], a[8]);
export function installPixelSnap(): void {
  if (snapping) return;
  snapping = true;
  const S = RENDER_SCALE;
  const P = Phaser.Renderer.WebGL as unknown as {
    WebGLPipeline: { prototype: Record<string, unknown> };
    Pipelines: { PreFXPipeline: { prototype: Record<string, unknown> }; LightPipeline: { prototype: Record<string, unknown> } };
  };
  const wrap = (proto: Record<string, unknown>) => {
    const orig = proto.batchQuad as (this: { renderer: { currentFramebuffer: unknown } }, ...a: unknown[]) => boolean;
    proto.batchQuad = function (this: { renderer: { currentFramebuffer: unknown } }, ...a: unknown[]): boolean {
      // de las líneas solo se ajustan las rectas horizontales o verticales: en un contorno curvo cada tramo se
      // movería por su lado y quedaría punteado
      if (this.renderer.currentFramebuffer === null && (a[0] || fillingRect || axisAligned(a as number[]))) {
        const x0 = a[1] as number, y0 = a[2] as number;
        // Con objeto (sprites, textos) Phaser redondeaba la mitad hacia arriba. Los rectángulos y las líneas no se
        // redondeaban y decidía la regla de relleno de la tarjeta: en x entra el píxel cuyo centro cae en el borde
        // izquierdo (mitad hacia abajo); en y, con el eje de WebGL invertido, mitad hacia arriba.
        const hx = a[0] ? Math.floor(x0 / S + 0.5) : Math.ceil(x0 / S - 0.5);
        const dx = S * hx - x0;
        const dy = S * Math.floor(y0 / S + 0.5) - y0;
        if (dx !== 0 || dy !== 0) for (let i = 1; i <= 7; i += 2) { a[i] = (a[i] as number) + dx; a[i + 1] = (a[i + 1] as number) + dy; }
      }
      return orig.apply(this, a);
    };
  };
  wrap(P.WebGLPipeline.prototype);
  wrap(P.Pipelines.PreFXPipeline.prototype);
  let fillingRect = false;
  const multi = (Phaser.Renderer.WebGL.Pipelines.MultiPipeline as unknown as { prototype: Record<string, unknown> }).prototype;
  const fillRect = multi.batchFillRect as (...a: unknown[]) => unknown;
  multi.batchFillRect = function (this: unknown, ...a: unknown[]): unknown {
    fillingRect = true;
    try { return fillRect.apply(this, a); } finally { fillingRect = false; }
  };
  // La luz con relieve (Light2D) mide distancias contra el tamaño del lienzo: se le da el lógico para que los
  // faroles alumbren igual que antes.
  const light = P.Pipelines.LightPipeline.prototype;
  const onRender = light.onRender as (this: LightLike, ...a: unknown[]) => void;
  light.onRender = function (this: LightLike, ...a: unknown[]): void {
    onRender.apply(this, a);
    this.set2f('uResolution', this.width / 2 / S, this.height / 2 / S);
  };
  // Las texturas que se desplazan (nubes, neblina) con un corrimiento fraccionario: antes cada píxel tomaba el
  // texel de su centro, que equivale a redondear el corrimiento; a doble densidad se verían medios texeles.
  const tile = Phaser.GameObjects.TileSprite.prototype as unknown as { renderWebGL: (...a: unknown[]) => void };
  const renderTile = tile.renderWebGL;
  tile.renderWebGL = function (this: { _tilePosition: Phaser.Math.Vector2; tileScaleX: number; tileScaleY: number }, ...a: unknown[]): void {
    const p = this._tilePosition, x = p.x, y = p.y;
    if (this.tileScaleX === 1) p.x = Math.floor(x + 0.5);
    if (this.tileScaleY === 1) p.y = Math.floor(y + 0.5);
    renderTile.apply(this, a);
    p.x = x;
    p.y = y;
  };
}
interface LightLike { width: number; height: number; set2f(name: string, x: number, y: number): unknown }

/**
 * La luz con relieve se calcula por píxel real: a doble densidad cada píxel lógico tendría cuatro tonos de luz
 * distintos. Se recompila su sombreador para que los cuatro tomen el centro del píxel lógico, como antes.
 * Se llama cuando el juego ya arrancó (el renderizador ya creó sus pipelines).
 */
export function snapLightShader(game: Phaser.Game): void {
  const r = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  const lp = r.pipelines?.get('Light2D') as unknown as {
    config: Record<string, unknown> & { fragShader: string };
    setShadersFromConfig(c: object): unknown;
    setProjectionMatrix(w: number, h: number): unknown;
    shaders: { rebind(): unknown }[];
    vertexBuffer: { webGLBuffer: WebGLBuffer | null };
  } | undefined;
  if (!lp || !lp.config?.fragShader?.includes('gl_FragCoord.xy')) return;
  const S = RENDER_SCALE.toFixed(1);
  const frag = lp.config.fragShader.replace(/gl_FragCoord\.xy/g, `(floor(gl_FragCoord.xy / ${S}) * ${S} + ${S} * 0.5)`);
  lp.config.fragShader = frag;
  lp.setShadersFromConfig(lp.config);
  // como en WebGLPipeline.boot: atributos (con el búfer de vértices del pipeline enlazado) y proyección
  const gl = r.gl;
  const bound = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
  gl.bindBuffer(gl.ARRAY_BUFFER, lp.vertexBuffer.webGLBuffer);
  for (const sh of lp.shaders) sh.rebind();
  gl.bindBuffer(gl.ARRAY_BUFFER, bound);
  lp.setProjectionMatrix(r.width, r.height);
}
