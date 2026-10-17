import { Pixmap, hexToRgba, seededRandom } from './PixelPainter';

/** Hojas de efectos: chispas de golpe, bloqueo, polvo, raíces, olas, niebla, vórtice, partículas. */

export interface EffectSheet {
  pixmap: Pixmap;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

function pack(frames: Pixmap[]): EffectSheet {
  const fw = frames[0].width;
  const fh = frames[0].height;
  const pm = new Pixmap(fw * frames.length, fh);
  frames.forEach((f, i) => pm.blit(f, i * fw, 0));
  return { pixmap: pm, frameWidth: fw, frameHeight: fh, frames: frames.length };
}

function starburst(size: number, rays: number, radius: number, c1: number, c2: number, core: number, seed: number): Pixmap {
  const pm = new Pixmap(size, size);
  const rnd = seededRandom(seed);
  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rnd() * 0.5;
    const r = radius * (0.6 + rnd() * 0.5);
    pm.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 === 0 ? 2 : 1, hexToRgba(i % 2 === 0 ? c1 : c2));
  }
  pm.circle(cx, cy, radius * 0.35, hexToRgba(c2));
  pm.circle(cx, cy, radius * 0.2, hexToRgba(core));
  return pm;
}

export function buildHitSpark(): EffectSheet {
  return pack([
    starburst(32, 8, 7, 0xfff0a0, 0xffffff, 0xffffff, 1),
    starburst(32, 10, 12, 0xffb040, 0xfff0a0, 0xffffff, 2),
    starburst(32, 12, 15, 0xff6030, 0xffb040, 0xfff0a0, 3),
    starburst(32, 12, 15, 0xa03020, 0xff6030, 0xffb040, 4),
  ]);
}

export function buildHeavySpark(): EffectSheet {
  return pack([
    starburst(48, 10, 10, 0xffffff, 0xfff0a0, 0xffffff, 11),
    starburst(48, 14, 18, 0xffd040, 0xffffff, 0xffffff, 12),
    starburst(48, 16, 23, 0xff7030, 0xffd040, 0xfff0a0, 13),
    starburst(48, 16, 23, 0xc03020, 0xff7030, 0xffd040, 14),
    starburst(48, 12, 20, 0x602020, 0xc03020, 0xff7030, 15),
  ]);
}

export function buildBlockSpark(): EffectSheet {
  const frames: Pixmap[] = [];
  for (let i = 0; i < 3; i++) {
    const pm = new Pixmap(24, 24);
    const r = 5 + i * 3;
    for (let a = 0; a < 360; a += 30) {
      const x = 12 + Math.cos((a * Math.PI) / 180) * r;
      const y = 12 + Math.sin((a * Math.PI) / 180) * r;
      pm.rect(x - 1, y - 1, 2, 2, hexToRgba(i === 0 ? 0xffffff : 0x80c8ff));
    }
    pm.circle(12, 12, 3 - i, hexToRgba(0xd0f0ff));
    frames.push(pm);
  }
  return pack(frames);
}

export function buildDust(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(77);
  for (let i = 0; i < 4; i++) {
    const pm = new Pixmap(24, 12);
    const n = 6 - i;
    for (let k = 0; k < n; k++) {
      const x = 12 + (rnd() - 0.5) * (10 + i * 6);
      const y = 9 - i * 1.5 - rnd() * 2;
      pm.circle(x, y, 2 - i * 0.3, hexToRgba(i < 2 ? 0xc8b088 : 0x8a7a60));
    }
    frames.push(pm);
  }
  return pack(frames);
}

/** Látigo de raíces: 3 frames que avanzan horizontalmente desde la izquierda. */
export function buildRootWhip(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(31);
  const lengths = [40, 72, 96, 96];
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(100, 32);
    const len = lengths[f];
    const dark = hexToRgba(0x3a2a14);
    const mid = hexToRgba(0x6a4a22);
    const light = hexToRgba(0x8a6a32);
    const green = hexToRgba(0x3c8a2c);
    // tronco principal ondulado
    let py = 18;
    for (let x = 0; x < len; x++) {
      const y = 18 + Math.sin(x * 0.25 + f) * 3;
      pm.line(x, py, x, y, 4 - (x / len) * 2, mid);
      py = y;
      if (x % 7 === 0) pm.set(x, y - 2, light);
      if (x % 5 === 0) pm.set(x, y + 2, dark);
    }
    // ramificaciones espinosas
    for (let x = 6; x < len; x += 9) {
      const dir = rnd() > 0.5 ? -1 : 1;
      const h = 4 + rnd() * 6;
      pm.line(x, 18, x + 3, 18 + dir * h, 1.5, dark);
      pm.set(x + 3, 18 + dir * h, green);
    }
    // punta
    if (f > 0) {
      pm.polygon([[len - 6, 13], [len + 2, 17], [len - 6, 23]], light);
    }
    pm.outline(hexToRgba(0x14100a));
    frames.push(pm);
  }
  return pack(frames);
}

/** Erupción de raíces: crecen desde el suelo. */
export function buildRootEruption(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(57);
  const spikes: { x: number; h: number; w: number; lean: number }[] = [];
  for (let i = 0; i < 7; i++) spikes.push({ x: 8 + i * 7 + rnd() * 3, h: 24 + rnd() * 30, w: 3 + rnd() * 3, lean: (rnd() - 0.5) * 10 });
  const growth = [0.25, 0.6, 1.0, 1.0, 0.8];
  for (let f = 0; f < 5; f++) {
    const pm = new Pixmap(64, 64);
    const g = growth[f];
    for (const s of spikes) {
      const h = s.h * g;
      pm.polygon(
        [
          [s.x - s.w, 63],
          [s.x + s.w, 63],
          [s.x + s.lean * g, 63 - h],
        ],
        hexToRgba(0x5a3a1a),
      );
      pm.line(s.x, 63, s.x + s.lean * g * 0.7, 63 - h * 0.7, 1, hexToRgba(0x8a6a32));
      pm.set(s.x + s.lean * g, 63 - h, hexToRgba(f >= 2 ? 0x6ad04a : 0x3c8a2c));
    }
    // tierra levantada
    for (let i = 0; i < 10; i++) {
      pm.rect(4 + i * 6, 58 + (i % 2) * 2, 3, 2, hexToRgba(0x4a3a24));
    }
    if (f >= 2) {
      // hojas saliendo
      for (let i = 0; i < 6; i++) {
        pm.rect(10 + i * 8, 20 + (i % 3) * 8 - (f - 2) * 6, 2, 2, hexToRgba(0x8ae060));
      }
    }
    pm.outline(hexToRgba(0x14100a));
    frames.push(pm);
  }
  return pack(frames);
}

/** Proyectil de agua: ola rodante con espuma. */
export function buildWave(): EffectSheet {
  const frames: Pixmap[] = [];
  const deep = hexToRgba(0x1a4a8a);
  const mid = hexToRgba(0x2a78c8);
  const light = hexToRgba(0x6ac0ff);
  const foam = hexToRgba(0xe8ffff);
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(36, 30);
    const ph = f * 1.5;
    pm.polygon([[2, 28], [34, 28], [34, 18 - ph], [26, 8 + ph * 0.5], [16, 4], [8, 10], [2, 20]], deep);
    pm.polygon([[6, 26], [30, 26], [30, 18 - ph], [24, 11 + ph * 0.5], [16, 8], [10, 13], [6, 20]], mid);
    pm.polygon([[10, 22], [24, 22], [26, 16 - ph * 0.5], [18, 11], [12, 15]], light);
    // cresta de espuma
    pm.circle(16 + f, 5 + (f % 2), 3, foam);
    pm.circle(24 + f, 9 - (f % 2), 2, foam);
    pm.circle(9 - (f % 2), 12, 2, foam);
    for (let i = 0; i < 4; i++) pm.set(4 + i * 8 + f, 26, foam);
    pm.outline(hexToRgba(0x0a1a30));
    frames.push(pm);
  }
  return pack(frames);
}

/** Niebla encantada: nubes que se expanden y disipan. */
export function buildMist(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(99);
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 9; i++) puffs.push({ x: 24 + (rnd() - 0.5) * 30, y: 36 + (rnd() - 0.5) * 50, r: 5 + rnd() * 6 });
  for (let f = 0; f < 5; f++) {
    const pm = new Pixmap(48, 72);
    const grow = 1 + f * 0.25;
    for (const p of puffs) {
      const a = f < 3 ? 200 : 200 - (f - 2) * 70;
      pm.circle(p.x + (p.x - 24) * (grow - 1), p.y, p.r * grow * (f === 4 ? 0.8 : 1), [180, 230, 255, a]);
      pm.circle(p.x + (p.x - 24) * (grow - 1) - 1, p.y - 1, p.r * grow * 0.5, [235, 250, 255, a]);
    }
    frames.push(pm);
  }
  return pack(frames);
}

/** Vórtice de agua para el Abismo del río. */
export function buildVortex(): EffectSheet {
  const frames: Pixmap[] = [];
  for (let f = 0; f < 6; f++) {
    const pm = new Pixmap(96, 96);
    const cx = 48;
    const cy = 48;
    for (let r = 44; r > 4; r -= 6) {
      for (let a = 0; a < 360; a += 4) {
        const ang = ((a + f * 18 + r * 6) * Math.PI) / 180;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * 0.55;
        const band = Math.floor((a + f * 18) / 60) % 3;
        const c = band === 0 ? 0x1a4a8a : band === 1 ? 0x2a78c8 : 0x6ac0ff;
        pm.rect(x, y, 2, 2, hexToRgba(c));
        if (band === 2 && a % 24 === 0) pm.set(x, y - 1, hexToRgba(0xe8ffff));
      }
    }
    frames.push(pm);
  }
  return pack(frames);
}

/** Explosión de vegetación para el Juicio de la selva. */
export function buildBloom(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(5);
  const pts: { a: number; d: number; c: number }[] = [];
  const cols = [0x3c8a2c, 0x6ad04a, 0xd84a6a, 0xffd04a, 0x8ae060];
  for (let i = 0; i < 40; i++) pts.push({ a: rnd() * Math.PI * 2, d: 10 + rnd() * 40, c: cols[i % cols.length] });
  for (let f = 0; f < 6; f++) {
    const pm = new Pixmap(112, 112);
    const t = (f + 1) / 6;
    pm.circle(56, 56, 46 * t, [60, 140, 60, f < 2 ? 120 : 60]);
    for (const p of pts) {
      const d = p.d * t;
      const x = 56 + Math.cos(p.a) * d;
      const y = 56 + Math.sin(p.a) * d * 0.9;
      pm.rect(x - 1, y - 1, 3, 2, hexToRgba(p.c));
      pm.set(x, y - 2, hexToRgba(0x1c4320));
    }
    if (f < 3) pm.circle(56, 56, 12 - f * 3, hexToRgba(0xffffff));
    frames.push(pm);
  }
  return pack(frames);
}

/** Partículas diminutas: hoja, gota, chispa, luciérnaga. */
export function buildParticles(): Record<string, Pixmap> {
  const leaf = new Pixmap(4, 4);
  leaf.rect(0, 1, 3, 2, hexToRgba(0x6ad04a));
  leaf.set(3, 0, hexToRgba(0x3c8a2c));
  const drop = new Pixmap(3, 4);
  drop.rect(1, 0, 1, 2, hexToRgba(0x6ac0ff));
  drop.rect(0, 2, 3, 2, hexToRgba(0xd8ffff));
  const spark = new Pixmap(2, 2);
  spark.rect(0, 0, 2, 2, hexToRgba(0xffffff));
  const fly = new Pixmap(2, 2);
  fly.rect(0, 0, 2, 2, hexToRgba(0xd8ff80));
  const ember = new Pixmap(2, 2);
  ember.rect(0, 0, 2, 2, hexToRgba(0xffb040));
  // sangre: gota (2x3) y mancha de suelo (7x2)
  const blood = new Pixmap(2, 3);
  blood.rect(0, 0, 2, 2, hexToRgba(0xb00010));
  blood.set(0, 2, hexToRgba(0x70000a));
  const splat = new Pixmap(7, 2);
  splat.rect(1, 0, 5, 1, hexToRgba(0x8a0010));
  splat.rect(0, 1, 7, 1, hexToRgba(0x5a0008));
  return { leaf, drop, spark, fly, ember, blood, splat };
}

/** Arco de corte (blanco, para teñir): 4 frames. */
export function buildSlash(): EffectSheet {
  const frames: Pixmap[] = [];
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(64, 64);
    const a0 = -70 + f * 10;
    const a1 = 40 + f * 15;
    for (let a = a0; a < a1; a += 3) {
      const r = 26 - Math.abs(a - (a0 + a1) / 2) * 0.08;
      const x = 20 + Math.cos((a * Math.PI) / 180) * r;
      const y = 32 + Math.sin((a * Math.PI) / 180) * r;
      pm.dab(x, y, f === 3 ? 1 : 2.2, [255, 255, 255, 255]);
      pm.set(x - 2, y, [220, 220, 220, 255]);
    }
    if (f < 3) pm.polygon([[18, 28], [52, 20], [50, 30]], [255, 255, 255, 255]);
    pm.outline([255, 255, 255, 90]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Anillos concéntricos que se expanden (grito, silbido). */
export function buildRing(): EffectSheet {
  const frames: Pixmap[] = [];
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(64, 64);
    for (let k = 0; k < 3; k++) {
      const r = 6 + f * 7 + k * 6;
      if (r > 30) continue;
      for (let a = 0; a < 360; a += 4) {
        const x = 32 + Math.cos((a * Math.PI) / 180) * r;
        const y = 32 + Math.sin((a * Math.PI) / 180) * r * 0.8;
        if ((a / 4 + k) % 2 === 0) pm.rect(x, y, 2, 2, [255, 255, 255, k === 0 ? 255 : 200]);
      }
    }
    frames.push(pm);
  }
  return pack(frames);
}

/** Orbe con estela (proyectil genérico). */
export function buildOrb(): EffectSheet {
  const frames: Pixmap[] = [];
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(36, 24);
    pm.ellipse(24, 12, 7, 6, [200, 200, 200, 255]);
    pm.ellipse(25, 11, 5, 4, [255, 255, 255, 255]);
    pm.set(27, 9, [255, 255, 255, 255]);
    for (let i = 0; i < 4; i++) {
      const x = 16 - i * 4 - (f % 2);
      pm.ellipse(x, 12 + Math.sin(f + i) * 2, 3 - i * 0.5, 2.5 - i * 0.4, [230, 230, 230, 220 - i * 40]);
    }
    pm.outline([120, 120, 120, 200]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Géiser vertical (lágrimas, manantial). */
export function buildGeyser(): EffectSheet {
  const frames: Pixmap[] = [];
  const growth = [0.3, 0.7, 1, 1, 0.7];
  for (let f = 0; f < 5; f++) {
    const pm = new Pixmap(64, 72);
    const h = 64 * growth[f];
    pm.polygon([[22, 71], [42, 71], [36, 71 - h], [28, 71 - h]], [200, 220, 255, 255]);
    pm.polygon([[27, 71], [37, 71], [34, 71 - h * 0.9], [30, 71 - h * 0.9]], [255, 255, 255, 255]);
    for (let i = 0; i < 8; i++) {
      const y = 71 - (i / 8) * h;
      pm.set(20 - (i % 3) * 2, y, [255, 255, 255, 255]);
      pm.set(44 + (i % 3) * 2, y + 3, [255, 255, 255, 255]);
    }
    pm.ellipse(32, 70, 16 * growth[f] + 4, 3, [220, 230, 255, 200]);
    pm.outline([120, 150, 200, 200]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Columna de llamas (se tiñe de naranja). */
export function buildFlame(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(66);
  for (let f = 0; f < 5; f++) {
    const pm = new Pixmap(64, 72);
    const h = f < 2 ? 30 + f * 18 : f === 4 ? 40 : 66;
    const pts: [number, number][] = [[14, 71]];
    for (let i = 0; i <= 8; i++) {
      const x = 14 + i * 4.5;
      const peak = i % 2 === 0 ? h : h * (0.5 + rnd() * 0.3);
      pts.push([x, 71 - peak * (0.6 + 0.4 * Math.sin((i / 8) * Math.PI))]);
    }
    pts.push([50, 71]);
    pm.polygon(pts, [255, 200, 120, 255]);
    const inner: [number, number][] = [[22, 71]];
    for (let i = 0; i <= 4; i++) inner.push([22 + i * 5, 71 - h * 0.55 * (0.6 + 0.4 * Math.sin((i / 4) * Math.PI)) * (i % 2 === 0 ? 1 : 0.7)]);
    inner.push([42, 71]);
    pm.polygon(inner, [255, 255, 255, 255]);
    for (let i = 0; i < 6; i++) pm.rect(12 + rnd() * 40, 71 - h - rnd() * 10, 2, 2, [255, 230, 160, 255]);
    pm.outline([180, 60, 0, 200]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Huesos que caen del cielo. */
export function buildBones(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(13);
  const bones: { x: number; delay: number; rot: number }[] = [];
  for (let i = 0; i < 7; i++) bones.push({ x: 8 + i * 8 + rnd() * 3, delay: rnd() * 2, rot: rnd() });
  for (let f = 0; f < 5; f++) {
    const pm = new Pixmap(64, 72);
    for (const b of bones) {
      const t = Math.max(0, f - b.delay) / 3;
      const y = Math.min(66, 4 + t * 62);
      const vertical = b.rot > 0.5;
      if (vertical) {
        pm.rect(b.x, y - 6, 2, 10, [240, 235, 220, 255]);
        pm.rect(b.x - 1, y - 7, 4, 2, [255, 255, 255, 255]);
        pm.rect(b.x - 1, y + 3, 4, 2, [255, 255, 255, 255]);
      } else {
        pm.rect(b.x - 5, y, 10, 2, [240, 235, 220, 255]);
        pm.rect(b.x - 6, y - 1, 2, 4, [255, 255, 255, 255]);
        pm.rect(b.x + 4, y - 1, 2, 4, [255, 255, 255, 255]);
      }
    }
    if (f >= 3) for (let i = 0; i < 6; i++) pm.rect(6 + i * 9, 64 + (i % 2) * 3, 3, 2, [200, 200, 190, 255]);
    pm.outline([60, 50, 40, 220]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Látigo recto (sombra): 4 frames que se extienden. */
export function buildWhip(): EffectSheet {
  const frames: Pixmap[] = [];
  const lengths = [36, 70, 96, 96];
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(100, 24);
    const len = lengths[f];
    for (let x = 0; x < len; x++) {
      const y = 12 + Math.sin(x * 0.18 + f * 1.3) * (2 + (x / len) * 3);
      pm.dab(x, y, 1.6 - (x / len), [230, 230, 230, 255]);
    }
    pm.circle(len, 12 + Math.sin(len * 0.18 + f * 1.3) * 4, 2.5, [255, 255, 255, 255]);
    pm.outline([40, 40, 40, 220]);
    frames.push(pm);
  }
  return pack(frames);
}

/** Rayo / impacto vertical para tormentas (se tiñe). */
export function buildBolt(): EffectSheet {
  const frames: Pixmap[] = [];
  const rnd = seededRandom(21);
  for (let f = 0; f < 4; f++) {
    const pm = new Pixmap(48, 96);
    let x = 24;
    let y = 0;
    while (y < 90) {
      const ny = y + 6 + rnd() * 6;
      const nx = Math.max(6, Math.min(42, x + (rnd() - 0.5) * 14));
      pm.line(x, y, nx, ny, f === 0 ? 3 : f < 3 ? 2 : 1, [255, 255, 255, 255]);
      x = nx;
      y = ny;
    }
    if (f < 3) pm.ellipse(24, 92, 14 - f * 3, 3, [255, 255, 255, 230]);
    pm.outline([200, 200, 255, 120]);
    frames.push(pm);
  }
  return pack(frames);
}
