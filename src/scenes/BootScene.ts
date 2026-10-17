import Phaser from 'phaser';
import { PALETTES, buildPortrait } from '../art/CharacterArtist';
import {
  buildBlockSpark, buildBloom, buildBolt, buildBones, buildDust, buildFlame, buildGeyser, buildHeavySpark, buildHitSpark,
  buildMist, buildOrb, buildParticles, buildRing, buildRootEruption, buildRootWhip, buildSlash, buildVortex, buildWave, buildWhip,
} from '../art/EffectsArtist';
import { buildCursor, buildLogo, buildWhite } from '../art/UiArtist';
import { FIGHTER_IDS } from '../data/fighters';
import { DRAWN_ANIM } from '../art/drawnAnimManifest';
import { drawnAnimFile, drawnAnimKey } from '../art/DrawnAnim';
import { preloadDrawnFx } from '../art/DrawnFx';
import { addPixmap, addRetroFont, addSheet, ensureCharacterSheet, ensureStage } from '../utils/textures';

/**
 * Genera todos los recursos gráficos de forma procedimental (pixel art en memoria).
 * No hay descargas: el juego funciona sin conexión.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  /** Arte dibujado (caras y cuerpos) desde public/assets. Si falta un archivo, el juego usa el arte procedimental. */
  preload(): void {
    this.load.setPath('assets');
    for (const id of FIGHTER_IDS) {
      for (const slot of ['p1', 'p2'] as const) {
        for (const size of [24, 48, 64, 96]) this.load.image(`face_${id}_${slot}_${size}`, `portraits/${id}_${slot}_${size}.png`);
        for (const size of [72, 128]) this.load.image(`splash_${id}_${slot}_${size}`, `splash/${id}_${slot}_${size}.png`);
        for (let n = 0; n < 4; n++) this.load.image(`splash_${id}_${slot}_pose${n}_72`, `splash/${id}_${slot}_pose${n}_72.png`);
        for (const action of ['walk', 'attack', 'hurt', 'idle', 'trans'] as const) {
          const m = DRAWN_ANIM[id][action];
          this.load.spritesheet(drawnAnimKey(id, slot, action), drawnAnimFile(id, slot, action), { frameWidth: m.w, frameHeight: m.h });
        }
      }
    }
    preloadDrawnFx(this.load);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`Recurso no disponible, se usa arte procedimental: ${file.key}`);
    });
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x07060d, 1).fillRect(0, 0, 384, 224);
    g.fillStyle(0xf8d048, 1).fillRect(120, 108, 144, 8);
    // Generar en el siguiente tick para que se vea el fondo.
    this.time.delayedCall(10, () => {
      this.buildAll();
      this.scene.start('MenuScene');
    });
  }

  private buildAll(): void {
    addRetroFont(this, 'font', { color: 0xffffff, outline: 0x140a10 });
    addRetroFont(this, 'font_plain', { color: 0xffffff });

    // Retratos de todos; las hojas de sprites se generan bajo demanda al entrar al combate.
    for (const id of FIGHTER_IDS) {
      for (const slot of ['p1', 'p2'] as const) {
        const pal = PALETTES[id][slot];
        const key = `${id}_${slot}`;
        addPixmap(this, `portrait_${key}_24`, buildPortrait(id, pal, 24));
        addPixmap(this, `portrait_${key}_48`, buildPortrait(id, pal, 48));
        addPixmap(this, `portrait_${key}_64`, buildPortrait(id, pal, 64));
      }
    }
    ensureCharacterSheet(this, 'madremonte', 'p1');
    ensureCharacterSheet(this, 'mohan', 'p1');

    const fx: Record<string, ReturnType<typeof buildHitSpark>> = {
      fx_hit: buildHitSpark(),
      fx_heavy: buildHeavySpark(),
      fx_block: buildBlockSpark(),
      fx_dust: buildDust(),
      fx_rootwhip: buildRootWhip(),
      fx_eruption: buildRootEruption(),
      fx_wave: buildWave(),
      fx_mist: buildMist(),
      fx_vortex: buildVortex(),
      fx_bloom: buildBloom(),
      fx_slash: buildSlash(),
      fx_ring: buildRing(),
      fx_orb: buildOrb(),
      fx_geyser: buildGeyser(),
      fx_flame: buildFlame(),
      fx_bones: buildBones(),
      fx_whip: buildWhip(),
      fx_bolt: buildBolt(),
    };
    for (const [key, sheet] of Object.entries(fx)) {
      addSheet(this, key, sheet.pixmap, sheet.frameWidth, sheet.frameHeight, sheet.frames);
    }
    const anim = (key: string, frameRate: number, repeat = 0) => {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: fx[key].frames - 1 }), frameRate, repeat });
    };
    anim('fx_hit', 24);
    anim('fx_heavy', 20);
    anim('fx_block', 24);
    anim('fx_dust', 16);
    anim('fx_rootwhip', 18);
    anim('fx_eruption', 14);
    anim('fx_wave', 12, -1);
    anim('fx_mist', 12);
    anim('fx_vortex', 16, -1);
    anim('fx_bloom', 14);
    anim('fx_slash', 20);
    anim('fx_ring', 16);
    anim('fx_orb', 12, -1);
    anim('fx_geyser', 14);
    anim('fx_flame', 14);
    anim('fx_bones', 14);
    anim('fx_whip', 18);
    anim('fx_bolt', 18);

    const particles = buildParticles();
    for (const [name, pm] of Object.entries(particles)) addPixmap(this, `p_${name}`, pm);

    // El escenario por defecto se genera ya; el resto bajo demanda al elegirlo.
    ensureStage(this, 'ribera');

    addPixmap(this, 'logo', buildLogo());
    addPixmap(this, 'cursor', buildCursor());
    addPixmap(this, 'white', buildWhite());
  }
}
