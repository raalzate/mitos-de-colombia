import Phaser from 'phaser';
import { drawnAnimKey } from '../art/DrawnAnim';

/**
 * Luz con relieve (Light2D de Phaser) para los muñecos del mapa de noche: piloto con Juan y el Sombrerón.
 * Los mapas de normales salen de tools/generar_normales.sh y tienen la misma rejilla que la hoja de color.
 * La oscuridad sigue siendo la capa de noche con agujeros; esto solo sombrea los muñecos según de dónde
 * les llega la luz (farol de Juan y faroles cercanos). Sin WebGL no se hace nada y todo se ve como antes.
 */

/** Textura del juego → imagen de normales que se carga en el arranque. */
export const NORMAL_MAPS: Record<string, { key: string; file: string }> = {
  av_hero: { key: 'av_hero_n', file: 'aventura/hero_n.png' },
  [drawnAnimKey('sombreron', 'p1', 'idle')]: { key: 'av_sombreron_idle_n', file: 'aventura/sombreron_idle_n.png' },
  [drawnAnimKey('sombreron', 'p1', 'walk')]: { key: 'av_sombreron_walk_n', file: 'aventura/sombreron_walk_n.png' },
};

/** Mapas donde se prenden las luces con relieve: el pueblo (calle del Sombrerón) y Medellín (Plaza Botero). */
export const LIT_MAPS = new Set(['campo', 'medellin']);

/** Faroles con luz propia además del de Juan; el shader de Phaser admite 10 por defecto. */
export const MAX_LAMPS = 6;
/** Luz de fondo: los muñecos quedan algo apagados lejos de los faroles y el farol de Juan les da volumen. */
const AMBIENT = 0x9090a4;
const LANTERN_COLOR = 0xffd8a0;
const LAMP_COLOR = 0xffc070;
/** Sufijo de la textura espejo: al voltear el sprite las normales en X quedan al revés y hay que invertirlas. */
const MIRROR = '__espejo';

export function preloadNormals(load: Phaser.Loader.LoaderPlugin): void {
  for (const { key, file } of Object.values(NORMAL_MAPS)) load.image(key, file);
}

export function isWebGL(scene: Phaser.Scene): boolean {
  return scene.sys.game.renderer.type === Phaser.WEBGL;
}

/** Engancha cada mapa de normales a su textura (una vez) y prepara la versión espejo para cuando el sprite mira a la izquierda. */
export function attachNormals(scene: Phaser.Scene): void {
  const tm = scene.textures;
  for (const [tex, { key }] of Object.entries(NORMAL_MAPS)) {
    if (!tm.exists(tex) || !tm.exists(key)) continue;
    const base = tm.get(tex);
    const normal = tm.get(key).getSourceImage() as HTMLImageElement;
    if (base.dataSource.length === 0) base.setDataSource(normal);
    const mk = tex + MIRROR;
    if (tm.exists(mk)) continue;
    const src = base.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (src.width !== normal.width || src.height !== normal.height) continue;
    const mirror = tm.addImage(mk, src as HTMLImageElement);
    if (!mirror) continue;
    for (const name of base.getFrameNames()) {
      const f = base.get(name);
      mirror.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    }
    mirror.setDataSource(flipNormalX(normal));
  }
}

/** Mismo mapa de normales con la componente X invertida (rojo = 255 − rojo), en la misma posición. */
function flipNormalX(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) d.data[i] = 255 - d.data[i];
  ctx.putImageData(d, 0, 0);
  return c;
}

interface Lamp { x: number; y: number; r: number; flicker: number }

export class NightLights {
  readonly on: boolean;
  private scene: Phaser.Scene;
  private lantern: Phaser.GameObjects.Light | null = null;
  private pool: Phaser.GameObjects.Light[] = [];

  constructor(scene: Phaser.Scene, mapId: string) {
    this.scene = scene;
    this.on = LIT_MAPS.has(mapId) && isWebGL(scene);
    // al reiniciar la escena (otro mapa) Phaser ya borró las luces de antes; si este mapa no lleva, se apagan
    if (!this.on) { scene.lights.disable(); return; }
    attachNormals(scene);
    scene.lights.enable().setAmbientColor(AMBIENT);
    this.lantern = scene.lights.addLight(0, 0, 120, LANTERN_COLOR, 0);
    for (let i = 0; i < MAX_LAMPS; i++) this.pool.push(scene.lights.addLight(0, 0, 80, LAMP_COLOR, 0));
  }

  /** Pone al objeto a recibir luz con relieve (si hay WebGL y el mapa lleva luces). */
  light<T extends Phaser.GameObjects.Components.Pipeline>(obj: T): T {
    if (this.on) obj.setPipeline('Light2D');
    return obj;
  }

  /** Textura que debe usar un sprite con normales según mire a la izquierda (volteado) o no. */
  texture(base: string, flip: boolean): string {
    if (!this.on || !flip) return base;
    const k = base + MIRROR;
    return this.scene.textures.exists(k) ? k : base;
  }

  /**
   * Cada fotograma: el farol de Juan en la mano y los faroles más cercanos a la cámara
   * (no más de MAX_LAMPS, para no pasarse del máximo del shader).
   */
  update(lx: number, ly: number, lantern: boolean, lamps: readonly Lamp[], frame: number): void {
    if (!this.on || !this.lantern) return;
    this.lantern.setPosition(lx, ly).setIntensity(lantern ? 0.42 + Math.sin(frame / 7) * 0.03 : 0);
    if (frame % 10 !== 0) return;
    const cam = this.scene.cameras.main;
    const cx = cam.scrollX + cam.width / 2, cy = cam.scrollY + cam.height / 2;
    const near = lamps
      .filter((l) => l.r >= 34)
      .map((l) => ({ l, d: (l.x - cx) ** 2 + (l.y - cy) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_LAMPS);
    this.pool.forEach((p, i) => {
      const n = near[i];
      if (!n) { p.setIntensity(0); return; }
      p.setPosition(n.l.x, n.l.y).setRadius(n.l.r * 1.6).setIntensity(0.7 + Math.sin(frame / 9 + n.l.flicker) * 0.05);
    });
  }
}
