/**
 * Mini rasterizador de pixel art. Todo se dibuja píxel a píxel sobre un buffer RGBA,
 * sin suavizado, con paletas limitadas y contorno automático.
 */

export type Rgba = [number, number, number, number];

export function hexToRgba(hex: number | string, alpha = 255): Rgba {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

export class Pixmap {
  readonly data: Uint8ClampedArray;
  constructor(public readonly width: number, public readonly height: number) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  clone(): Pixmap {
    const p = new Pixmap(this.width, this.height);
    p.data.set(this.data);
    return p;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, c: Rgba): void {
    x |= 0;
    y |= 0;
    if (!this.inBounds(x, y)) return;
    const i = (y * this.width + x) * 4;
    const a = c[3];
    if (a >= 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const da = this.data[i + 3] / 255;
    const sa = a / 255;
    const oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) {
      this.data[i + k] = (c[k] * sa + this.data[i + k] * da * (1 - sa)) / (oa || 1);
    }
    this.data[i + 3] = oa * 255;
  }

  get(x: number, y: number): Rgba {
    if (!this.inBounds(x, y)) return [0, 0, 0, 0];
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.data[(y * this.width + x) * 4 + 3];
  }

  clear(c?: Rgba): void {
    if (!c) {
      this.data.fill(0);
      return;
    }
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = c[3];
    }
  }

  rect(x: number, y: number, w: number, h: number, c: Rgba): void {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x0 + i, y0 + j, c);
  }

  rectOutline(x: number, y: number, w: number, h: number, c: Rgba): void {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }

  hline(x0: number, x1: number, y: number, c: Rgba): void {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: Rgba): void {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = Math.round(y0); y <= Math.round(y1); y++) this.set(x, y, c);
  }

  /** Elipse rellena centrada en (cx, cy). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Rgba): void {
    const rx2 = rx * rx;
    const ry2 = ry * ry;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) this.set(x, y, c);
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: Rgba): void {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Línea gruesa (Bresenham + disco por píxel). */
  line(x0: number, y0: number, x1: number, y1: number, thickness: number, c: Rgba): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    const r = thickness / 2;
    for (;;) {
      this.dab(ax, ay, r, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  /** Mancha cuadrada/redonda de radio r centrada en (x, y). */
  dab(x: number, y: number, r: number, c: Rgba): void {
    if (r <= 0.5) {
      this.set(x, y, c);
      return;
    }
    if (r <= 1) {
      this.set(x, y, c);
      this.set(x + 1, y, c);
      this.set(x, y + 1, c);
      this.set(x + 1, y + 1, c);
      return;
    }
    const ri = Math.ceil(r);
    for (let j = -ri; j <= ri; j++) {
      for (let i = -ri; i <= ri; i++) {
        if (i * i + j * j <= r * r + 0.5) this.set(x + i, y + j, c);
      }
    }
  }

  /** Polígono relleno (par-impar). */
  polygon(points: [number, number][], c: Rgba): void {
    if (points.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      const sy = y + 0.5;
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
          xs.push(x0 + ((sy - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
      }
    }
  }

  /** Contorno exterior: cada píxel transparente adyacente a uno opaco se pinta de `c`. */
  outline(c: Rgba, diagonal = false): void {
    const src = this.clone();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (src.alpha(x, y) > 0) continue;
        const n =
          src.alpha(x + 1, y) > 0 ||
          src.alpha(x - 1, y) > 0 ||
          src.alpha(x, y + 1) > 0 ||
          src.alpha(x, y - 1) > 0 ||
          (diagonal &&
            (src.alpha(x + 1, y + 1) > 0 ||
              src.alpha(x - 1, y - 1) > 0 ||
              src.alpha(x + 1, y - 1) > 0 ||
              src.alpha(x - 1, y + 1) > 0));
        if (n) this.set(x, y, c);
      }
    }
  }

  /** Sombreado simple: píxeles opacos cuya fila superior es transparente reciben luz; filas inferiores, sombra. */
  shade(light: Rgba, dark: Rgba, lightAlpha = 70, darkAlpha = 70): void {
    const src = this.clone();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (src.alpha(x, y) < 255) continue;
        if (src.alpha(x, y - 1) === 0 || src.alpha(x - 1, y) === 0) {
          this.set(x, y, [light[0], light[1], light[2], lightAlpha]);
        } else if (src.alpha(x, y + 1) === 0 || src.alpha(x + 1, y) === 0) {
          this.set(x, y, [dark[0], dark[1], dark[2], darkAlpha]);
        }
      }
    }
  }

  /** Copia otra pixmap sobre esta. */
  blit(src: Pixmap, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const c = src.get(x, y);
        if (c[3] === 0) continue;
        this.set(dx + (flipX ? src.width - 1 - x : x), dy + y, c);
      }
    }
  }

  /** Patrón de tramado (dither) tipo tablero de ajedrez sobre un rectángulo. */
  dither(x: number, y: number, w: number, h: number, c: Rgba, phase = 0): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if ((i + j + phase) % 2 === 0) this.set(x + i, y + j, c);
      }
    }
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(this.width, this.height);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

/** Generador pseudoaleatorio determinista (mulberry32) para arte reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Une varias pixmaps del mismo tamaño en una hoja horizontal. */
export function packSheet(frames: Pixmap[]): { sheet: Pixmap; frameWidth: number; frameHeight: number } {
  const fw = frames[0].width;
  const fh = frames[0].height;
  const sheet = new Pixmap(fw * frames.length, fh);
  frames.forEach((f, i) => sheet.blit(f, i * fw, 0));
  return { sheet, frameWidth: fw, frameHeight: fh };
}
