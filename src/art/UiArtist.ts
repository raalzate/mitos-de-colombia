import { Pixmap, hexToRgba, seededRandom } from './PixelPainter';
import { drawText, textWidth } from './PixelFont';

/** Logotipo pixel art: título en dos líneas con relieve y ornamento de hojas/olas. */
export function buildLogo(): Pixmap {
  const line1 = 'MITOS DE';
  const line2 = 'COLOMBIA';
  const scale = 3;
  const w = Math.max(textWidth(line1, scale), textWidth(line2, scale)) + 24;
  const h = 7 * scale * 2 + 8 + 20;
  const pm = new Pixmap(w, h);
  const gold = hexToRgba(0xf8d048);
  const goldD = hexToRgba(0xb08020);
  const red = hexToRgba(0xc82838);
  const redD = hexToRgba(0x701020);
  const dark = hexToRgba(0x1a0c10);
  const green = hexToRgba(0x3c8a2c);
  const greenD = hexToRgba(0x1c4320);
  const x1 = (w - textWidth(line1, scale)) / 2;
  const x2 = (w - textWidth(line2, scale)) / 2;
  const y1 = 6;
  const y2 = y1 + 7 * scale + 4;
  // relieve
  for (let d = 2; d >= 1; d--) {
    drawText(pm, line1, x1 + d, y1 + d, goldD, scale);
    drawText(pm, line2, x2 + d, y2 + d, redD, scale);
  }
  drawText(pm, line1, x1, y1, gold, scale);
  drawText(pm, line2, x2, y2, red, scale);
  // brillo superior
  for (let x = 0; x < w; x++) {
    for (let y = y1; y < y1 + 4; y++) {
      const c = pm.get(x, y);
      if (c[3] === 255 && c[0] === gold[0] && c[1] === gold[1]) pm.set(x, y, hexToRgba(0xfff0a0));
    }
    for (let y = y2; y < y2 + 4; y++) {
      const c = pm.get(x, y);
      if (c[3] === 255 && c[0] === red[0] && c[1] === red[1]) pm.set(x, y, hexToRgba(0xf05060));
    }
  }
  // ornamento: hojas a la izquierda, ola a la derecha
  const rnd = seededRandom(3);
  for (let i = 0; i < 8; i++) {
    const lx = 2 + rnd() * 10;
    const ly = h - 14 + rnd() * 8;
    pm.rect(lx, ly, 3, 2, green);
    pm.set(lx + 3, ly - 1, greenD);
  }
  for (let x = w - 40; x < w - 4; x++) {
    const y = h - 8 + Math.sin(x * 0.4) * 2;
    pm.set(x, y, hexToRgba(0x6ac0ff));
    pm.set(x, y + 2, hexToRgba(0x2a78c8));
  }
  pm.outline(dark);
  return pm;
}

/** Marco de HUD de 9 secciones básico (esquinas talladas). */
export function buildHudFrame(w: number, h: number, fill: number, border: number): Pixmap {
  const pm = new Pixmap(w, h);
  pm.rect(0, 0, w, h, hexToRgba(fill));
  pm.rectOutline(0, 0, w, h, hexToRgba(border));
  pm.set(0, 0, [0, 0, 0, 0]);
  pm.set(w - 1, 0, [0, 0, 0, 0]);
  pm.set(0, h - 1, [0, 0, 0, 0]);
  pm.set(w - 1, h - 1, [0, 0, 0, 0]);
  return pm;
}

/** Cursor/flecha de menú. */
export function buildCursor(): Pixmap {
  const pm = new Pixmap(8, 8);
  pm.polygon([[0, 0], [7, 4], [0, 8]], hexToRgba(0xf8d048));
  pm.outline(hexToRgba(0x1a0c10));
  return pm;
}

/** Píxel blanco 1x1 para rectángulos escalados. */
export function buildWhite(): Pixmap {
  const pm = new Pixmap(2, 2);
  pm.rect(0, 0, 2, 2, hexToRgba(0xffffff));
  return pm;
}
