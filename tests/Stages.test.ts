import { describe, expect, it } from 'vitest';
import { STAGES, STAGE_IDS, STAGE_LAYER_WIDTH, buildStage } from '../src/art/StageArtist';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config/game-config';
import { splashPose } from '../src/art/SplashPose';

describe('escenarios', () => {
  it('hay seis escenarios con nombre y subtítulo', () => {
    expect(STAGE_IDS.length).toBe(6);
    for (const id of STAGE_IDS) {
      expect(STAGES[id].id).toBe(id);
      expect(STAGES[id].name.length).toBeGreaterThan(3);
      expect(STAGES[id].subtitle.length).toBeGreaterThan(3);
    }
  });

  it('cada tema genera todas las capas con el tamaño esperado', () => {
    for (const id of STAGE_IDS) {
      const L = buildStage(STAGES[id]);
      expect([L.sky.width, L.sky.height]).toEqual([GAME_WIDTH, GAME_HEIGHT]);
      expect(L.clouds.width).toBe(STAGE_LAYER_WIDTH);
      expect(L.far.width).toBe(STAGE_LAYER_WIDTH);
      expect(L.river.length).toBe(3);
      expect(L.mid.width).toBe(STAGE_LAYER_WIDTH);
      expect(L.ground.width).toBe(STAGE_LAYER_WIDTH);
      expect(L.fore.width).toBe(STAGE_LAYER_WIDTH);
      expect(L.mist.width).toBe(256);
      // la capa media debe tener contenido (vegetación/casas) además del suelo
      let opaque = 0;
      for (let y = 0; y < 60; y++) for (let x = 0; x < L.mid.width; x += 4) if (L.mid.alpha(x, y) > 0) opaque++;
      expect(opaque).toBeGreaterThan(200);
    }
  });

  it('los escenarios se distinguen por su cielo', () => {
    const skies = STAGE_IDS.map((id) => STAGES[id].sky.join(','));
    expect(new Set(skies).size).toBe(STAGE_IDS.length);
  });
});

describe('poses del arte dibujado', () => {
  const base = { state: 'idle' as const, anim: 'idle', animFrame: 0, frame: 0, vy: 0, grounded: true };
  it('devuelve valores finitos para todas las animaciones', () => {
    const anims = ['idle', 'walk', 'jump', 'crouch', 'block', 'crouchblock', 'light', 'heavy', 'lightkick', 'heavykick',
      'hit', 'knockdown', 'getup', 'victory', 'airlight', 'airkick', 'special1', 'special2', 'ultimate', 'desconocida'];
    for (const anim of anims) {
      for (let f = 0; f < 3; f++) {
        const p = splashPose({ ...base, anim, animFrame: f, frame: f * 7 });
        for (const v of [p.dx, p.dy, p.rot, p.sx, p.sy]) expect(Number.isFinite(v)).toBe(true);
        expect(p.sx).toBeGreaterThan(0.5);
        expect(p.sy).toBeGreaterThan(0.5);
      }
    }
  });

  it('el derribo tumba al luchador y el ataque lo inclina hacia delante', () => {
    expect(splashPose({ ...base, state: 'knockdown', anim: 'knockdown' }).rot).toBeLessThan(-60);
    expect(splashPose({ ...base, state: 'attack', anim: 'heavy', animFrame: 1 }).rot).toBeGreaterThan(0);
    expect(splashPose({ ...base, state: 'crouch', anim: 'crouch' }).sy).toBeLessThan(0.8);
  });
});
