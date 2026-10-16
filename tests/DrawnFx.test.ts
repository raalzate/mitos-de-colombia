import { describe, expect, it } from 'vitest';
import { DRAWN_FX, DRAWN_FX_FRAMES, drawnFxFor, drawnFxKey, drawnFxMotion, preloadDrawnFx, type DrawnFxKind } from '../src/art/DrawnFx';
import { FIGHTERS, FIGHTER_IDS } from '../src/data/fighters';

const KINDS: DrawnFxKind[] = ['orb', 'summon', 'vortex', 'beam'];
// Sin @types/node en el proyecto: la existencia de archivos se comprueba con el
// glob de Vite (resuelto en tiempo de transformación por Vitest).
const FX_FILES = new Set(Object.keys(import.meta.glob('../public/assets/fx/*.png')).map((p) => p.replace('../public/assets/', '')));

describe('efectos dibujados: manifiesto', () => {
  it('cada archivo del manifiesto existe en public/assets/fx', () => {
    let count = 0;
    for (const id of FIGHTER_IDS) {
      for (const kind of KINDS) {
        const e = DRAWN_FX[id][kind];
        if (!e) continue;
        count++;
        expect(e.file).toBe(`fx/${id}_${kind}.png`);
        expect(FX_FILES.has(e.file), e.file).toBe(true);
        expect(e.height).toBeGreaterThan(0);
        expect(['center', 'bottom', 'left']).toContain(e.anchor);
      }
    }
    expect(count).toBe(35);
    expect(FX_FILES.size).toBe(35);
  });

  it('todos los luchadores tienen summon y orb', () => {
    for (const id of FIGHTER_IDS) {
      expect(DRAWN_FX[id].summon, id).toBeDefined();
      expect(DRAWN_FX[id].orb, id).toBeDefined();
    }
  });

  it('las claves y el precargador siguen el manifiesto', () => {
    expect(drawnFxKey('mohan', 'vortex')).toBe('fxd_mohan_vortex');
    const loaded: [string, string][] = [];
    preloadDrawnFx({ image: (key: string, file: string) => loaded.push([key, file]) } as never);
    expect(loaded.length).toBe(35);
    expect(loaded).toContainEqual(['fxd_bachue_summon', 'fx/bachue_summon.png']);
  });
});

describe('efectos dibujados: mapeo desde fx_*', () => {
  it('proyectiles, erupciones y vórtices resuelven a su tipo', () => {
    expect(drawnFxFor({ fx: 'fx_orb', type: 'projectile' }, 'llorona')).toMatchObject({ key: 'fxd_llorona_orb', anchor: 'center' });
    expect(drawnFxFor({ fx: 'fx_wave', type: 'projectile' }, 'mohan')).toMatchObject({ key: 'fxd_mohan_beam', anchor: 'left' });
    expect(drawnFxFor({ fx: 'fx_ring', type: 'projectile' }, 'silbon')).toMatchObject({ key: 'fxd_silbon_beam' });
    expect(drawnFxFor({ fx: 'fx_vortex' }, 'hombrecaiman')).toMatchObject({ key: 'fxd_hombrecaiman_vortex' });
    expect(drawnFxFor({ fx: 'fx_eruption' }, 'madremonte')).toMatchObject({ key: 'fxd_madremonte_summon', anchor: 'bottom' });
    expect(drawnFxFor({ fx: 'fx_geyser' }, 'bachue')).toMatchObject({ key: 'fxd_bachue_summon' });
    expect(drawnFxFor({ fx: 'fx_flame' }, 'juanmachete')).toMatchObject({ key: 'fxd_juanmachete_summon' });
    expect(drawnFxFor({ fx: 'fx_bones' }, 'silbon')).toMatchObject({ key: 'fxd_silbon_summon' });
    expect(drawnFxFor({ fx: 'fx_rootwhip' }, 'madremonte')).toMatchObject({ key: 'fxd_madremonte_summon' });
  });

  it('cae al segundo tipo o devuelve null cuando falta el archivo', () => {
    // madremonte no tiene beam: fx_ring cae a orb
    expect(drawnFxFor({ fx: 'fx_ring' }, 'madremonte')?.key).toBe('fxd_madremonte_orb');
    // llorona no tiene vortex
    expect(drawnFxFor({ fx: 'fx_vortex' }, 'llorona')).toBeNull();
    expect(drawnFxFor({ fx: 'fx_slash' }, 'patasola')).toBeNull();
    expect(drawnFxFor({ fx: 'fx_mist', type: 'teleport' }, 'mohan')).toBeNull();
  });

  it('toda habilidad de proyectil o erupción del plantel tiene efecto dibujado', () => {
    for (const id of FIGHTER_IDS) {
      for (const spec of [FIGHTERS[id].special1, FIGHTERS[id].special2]) {
        if (spec.type === 'projectile' || spec.type === 'eruption') {
          expect(drawnFxFor(spec, id), `${id} ${spec.short}`).not.toBeNull();
        }
      }
    }
  });
});

describe('efectos dibujados: animación por transformación', () => {
  it('devuelve valores finitos para todos los tipos y frames', () => {
    for (const kind of KINDS) {
      for (let f = 0; f <= DRAWN_FX_FRAMES[kind] + 5; f++) {
        const m = drawnFxMotion(kind, f);
        for (const v of [m.rot, m.sx, m.sy, m.alpha]) expect(Number.isFinite(v)).toBe(true);
        expect(m.alpha).toBeGreaterThanOrEqual(0);
        expect(m.alpha).toBeLessThanOrEqual(1);
        expect(m.sx).toBeGreaterThan(0);
        expect(m.sy).toBeGreaterThan(0);
      }
    }
  });

  it('summon empieza pequeño, crece desde el suelo y se desvanece', () => {
    expect(drawnFxMotion('summon', 0).sy).toBeCloseTo(0.2);
    expect(drawnFxMotion('summon', 4).sy).toBeGreaterThan(0.5);
    expect(drawnFxMotion('summon', 8).sy).toBeGreaterThanOrEqual(0.95);
    expect(drawnFxMotion('summon', 0).alpha).toBe(1);
    expect(drawnFxMotion('summon', DRAWN_FX_FRAMES.summon).alpha).toBe(0);
  });

  it('vortex gira de forma continua y orb pulsa', () => {
    expect(drawnFxMotion('vortex', 5).rot).not.toBe(drawnFxMotion('vortex', 6).rot);
    expect(drawnFxMotion('orb', 0).sx).not.toBe(drawnFxMotion('orb', 3).sx);
    expect(drawnFxMotion('beam', 0).sx).toBeLessThan(drawnFxMotion('beam', 6).sx);
  });
});
