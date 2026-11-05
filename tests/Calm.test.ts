import { describe, expect, it, vi } from 'vitest';
import { CALM_COLOR, CALM_FRAMES, CALM_HOLD, calmAt, dissolvesOnDefeat, finishStyle, steppedAlpha } from '../src/combat/Finish';
import { BODY_WEIGHT, PANT_HP, drawnMotion, idleLife } from '../src/art/DrawnAnim';
import { buildShadowBlob, buildParticles, SHADOW_H, SHADOW_W } from '../src/art/EffectsArtist';
import { FIGHTER_IDS } from '../src/data/fighters';

// el HUD importa Phaser solo por los tipos y la escena; para su lógica pura basta un sustituto
vi.mock('phaser', () => ({ default: {} }));
const { DRAIN_FLASH, DRAIN_HOLD, drainHit, drainStep } = await import('../src/ui/CombatHUD');

describe('el mito se calma', () => {
  it('Juan es humano y no se disuelve; los mitos sí', () => {
    expect(dissolvesOnDefeat('juanmachete')).toBe(false);
    for (const id of FIGHTER_IDS) if (id !== 'juanmachete') expect(dissolvesOnDefeat(id)).toBe(true);
  });

  it('en la aventura calmar reemplaza la fatalidad; en arcade sigue la fatalidad', () => {
    expect(finishStyle(true, 'madremonte')).toBe('calm');
    expect(finishStyle(false, 'madremonte')).toBe('fatality');
    // si pierde Juan en la aventura, el mito lo remata como siempre
    expect(finishStyle(true, 'juanmachete')).toBe('fatality');
  });

  it('sostiene la pose, luego se desvanece, se desenfoca y sube hasta desaparecer', () => {
    const start = calmAt(0);
    expect(start.alpha).toBe(1);
    expect(start.blur).toBe(0);
    expect(start.rise).toBe(0);
    const hold = calmAt(CALM_HOLD);
    expect(hold.alpha).toBe(1);
    expect(hold.glow).toBeCloseTo(1);
    const end = calmAt(CALM_FRAMES);
    expect(end.done).toBe(true);
    expect(end.alpha).toBe(0);
    expect(end.blur).toBe(1);
    expect(end.motes).toBe(0);
    expect(end.soften).toBeCloseTo(0);
    expect(calmAt(CALM_FRAMES - 1).done).toBe(false);
    // la opacidad nunca sube y el ascenso nunca baja
    let prev = calmAt(0);
    for (let f = 1; f <= CALM_FRAMES; f++) {
      const s = calmAt(f);
      expect(s.alpha).toBeLessThanOrEqual(prev.alpha);
      expect(s.rise).toBeGreaterThanOrEqual(prev.rise);
      expect(Number.isInteger(s.rise)).toBe(true);
      prev = s;
    }
  });

  it('suelta luces mientras se deshace', () => {
    let motes = 0;
    for (let f = 0; f < CALM_FRAMES; f++) motes += calmAt(f).motes;
    expect(motes).toBeGreaterThan(60);
  });

  it('en Canvas se apaga en escalones de 1/8 que promedian la opacidad', () => {
    for (const a of [0, 0.3, 0.55, 1]) {
      let sum = 0;
      for (let f = 0; f < 4; f++) {
        const s = steppedAlpha(a, f);
        expect((s * 8) % 1).toBe(0);
        sum += s;
      }
      expect(sum / 4).toBeCloseTo(a, 1);
    }
  });

  it('cada personaje tiene color de calma', () => {
    for (const id of FIGHTER_IDS) expect(CALM_COLOR[id]).toBeGreaterThan(0);
  });
});

describe('luchadores vivos en reposo', () => {
  it('respiran desde los pies: estiran hacia arriba sin despegarse del suelo', () => {
    for (const id of FIGHTER_IDS) {
      expect(BODY_WEIGHT[id]).toBeDefined();
      let maxSy = 1;
      for (let f = 0; f < 240; f++) {
        const b = idleLife(id, f);
        expect(b.dy).toBe(0);
        expect(Number.isInteger(b.dx)).toBe(true);
        expect(Math.abs(b.dx)).toBeLessThanOrEqual(1);
        expect(b.sy).toBeGreaterThanOrEqual(1);
        expect(b.sy).toBeLessThan(1.05);
        maxSy = Math.max(maxSy, b.sy);
      }
      // en un cuerpo de ~72 px se nota: al menos 1 px de pecho
      expect((maxSy - 1) * 72).toBeGreaterThanOrEqual(1);
    }
  });

  it('los pesados respiran más lento que los ligeros', () => {
    // frame en que termina de inhalar (empieza a bajar): proporcional al periodo
    const period = (id: 'madremonte' | 'mohan', hp = 1) => {
      let f = 1;
      while (f < 400 && idleLife(id, f, hp).sy >= idleLife(id, f - 1, hp).sy) f++;
      return f;
    };
    expect(period('madremonte')).toBeGreaterThan(period('mohan'));
    // con poca vida jadea: más rápido
    expect(period('madremonte', PANT_HP / 2)).toBeLessThan(period('madremonte'));
  });

  it('la pose de reposo usa la respiración y los dos luchadores van desfasados', () => {
    const base = { state: 'idle' as const, anim: 'idle', animFrame: 0, grounded: true };
    const a = drawnMotion('mohan', { ...base, frame: 30, breathPhase: 0 });
    const b = drawnMotion('mohan', { ...base, frame: 30, breathPhase: 37 });
    expect(a.sy).not.toBe(b.sy);
    expect(a.sy).toBeGreaterThan(1);
  });
});

describe('sombra de contacto y luces', () => {
  it('la sombra es una elipse más oscura en el centro y transparente en las esquinas', () => {
    const pm = buildShadowBlob();
    expect(pm.width).toBe(SHADOW_W);
    expect(pm.height).toBe(SHADOW_H);
    expect(pm.alpha(0, 0)).toBe(0);
    expect(pm.alpha(SHADOW_W / 2, Math.floor(SHADOW_H / 2))).toBeGreaterThan(pm.alpha(2, Math.floor(SHADOW_H / 2)));
  });

  it('las partículas incluyen la luz de calma y la sombra', () => {
    const p = buildParticles();
    expect(p.mote).toBeDefined();
    expect(p.shadow).toBeDefined();
  });
});

describe('barra de daño retardada', () => {
  it('se queda quieta tras el golpe, destella y luego se vacía hasta la vida real', () => {
    let s = { shown: 100, hold: 0, flash: 0 };
    s = drainHit(s);
    s = drainStep(s, 70);
    expect(s.shown).toBe(100);
    expect(s.flash).toBe(DRAIN_FLASH - 1);
    for (let i = 0; i < DRAIN_HOLD; i++) s = drainStep(s, 70);
    expect(s.shown).toBeLessThan(100);
    for (let i = 0; i < 200; i++) s = drainStep(s, 70);
    expect(s.shown).toBe(70);
  });

  it('si la vida sube (nueva ronda), la sigue al instante', () => {
    expect(drainStep({ shown: 40, hold: 10, flash: 2 }, 100)).toEqual({ shown: 100, hold: 0, flash: 0 });
  });
});
