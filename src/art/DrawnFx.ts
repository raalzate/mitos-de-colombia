import type Phaser from 'phaser';
import type { FighterId } from '../combat/CombatTypes';

/**
 * Efectos de combate dibujados, extraídos de las hojas de referencia de `images/`
 * (copia izquierda de cada fila, apunta hacia la derecha). Son imágenes fijas en
 * `public/assets/fx/{id}_{kind}.png`; se animan por transformación (`drawnFxMotion`).
 *
 *  - orb:    proyectil o bola de energía (24 px de alto, origen centrado)
 *  - beam:   chorro u onda sónica que nace en el luchador (32 px, origen a la izquierda)
 *  - summon: invocación o erupción que brota del suelo (56 px, origen abajo)
 *  - vortex: tornado o torbellino (64 px, origen centrado)
 */
export type DrawnFxKind = 'orb' | 'summon' | 'vortex' | 'beam';
export type DrawnFxAnchor = 'center' | 'bottom' | 'left';

export interface DrawnFxEntry {
  file: string;
  height: number;
  anchor: DrawnFxAnchor;
}

const HEIGHT: Record<DrawnFxKind, number> = { orb: 24, beam: 32, summon: 56, vortex: 64 };
const ANCHOR: Record<DrawnFxKind, DrawnFxAnchor> = { orb: 'center', beam: 'left', summon: 'bottom', vortex: 'center' };

function entry(id: FighterId, kind: DrawnFxKind): DrawnFxEntry {
  return { file: `fx/${id}_${kind}.png`, height: HEIGHT[kind], anchor: ANCHOR[kind] };
}

function entries(id: FighterId, kinds: DrawnFxKind[]): Partial<Record<DrawnFxKind, DrawnFxEntry>> {
  return Object.fromEntries(kinds.map((k) => [k, entry(id, k)]));
}

/** Manifiesto de los archivos realmente generados por `extract_fx.py`. */
export const DRAWN_FX: Record<FighterId, Partial<Record<DrawnFxKind, DrawnFxEntry>>> = {
  madremonte: entries('madremonte', ['summon', 'vortex', 'orb']),
  patasola: entries('patasola', ['beam', 'summon', 'orb']),
  hombrecaiman: entries('hombrecaiman', ['beam', 'summon', 'vortex', 'orb']),
  llorona: entries('llorona', ['beam', 'summon', 'orb']),
  sombreron: entries('sombreron', ['beam', 'summon', 'vortex', 'orb']),
  mohan: entries('mohan', ['beam', 'summon', 'vortex', 'orb']),
  muelona: entries('muelona', ['beam', 'summon', 'orb']),
  silbon: entries('silbon', ['beam', 'summon', 'vortex', 'orb']),
  juanmachete: entries('juanmachete', ['vortex', 'summon', 'orb']),
  bachue: entries('bachue', ['beam', 'summon', 'vortex', 'orb']),
};

export function drawnFxKey(id: FighterId, kind: DrawnFxKind): string {
  return `fxd_${id}_${kind}`;
}

/** Encola todas las imágenes del manifiesto (el BootScene ya hace `setPath('assets')`). */
export function preloadDrawnFx(loader: Phaser.Loader.LoaderPlugin): void {
  for (const id of Object.keys(DRAWN_FX) as FighterId[]) {
    const kinds = DRAWN_FX[id];
    for (const kind of Object.keys(kinds) as DrawnFxKind[]) {
      const e = kinds[kind];
      if (e) loader.image(drawnFxKey(id, kind), e.file);
    }
  }
}

/** Clave procedimental (`fx_*`) → tipo de efecto dibujado, en orden de preferencia. */
const FX_TO_KINDS: Record<string, DrawnFxKind[]> = {
  fx_orb: ['orb', 'beam'],
  fx_bolt: ['orb', 'beam'],
  fx_wave: ['beam', 'orb'],
  fx_ring: ['beam', 'orb'],
  fx_vortex: ['vortex'],
  fx_eruption: ['summon'],
  fx_geyser: ['summon'],
  fx_flame: ['summon'],
  fx_bones: ['summon'],
  fx_rootwhip: ['summon'],
};

/**
 * Devuelve la clave de textura dibujada equivalente a una habilidad procedimental,
 * o null si el personaje no tiene archivo para ese tipo de efecto.
 */
export function drawnFxFor(spec: { fx: string; type?: string }, id: FighterId): { key: string; anchor: DrawnFxAnchor; kind: DrawnFxKind } | null {
  let kinds = FX_TO_KINDS[spec.fx];
  if (!kinds && spec.type === 'projectile') kinds = ['orb', 'beam'];
  if (!kinds && spec.type === 'eruption') kinds = ['summon'];
  if (!kinds) return null;
  for (const kind of kinds) {
    const e = DRAWN_FX[id]?.[kind];
    if (e) return { key: drawnFxKey(id, kind), anchor: e.anchor, kind };
  }
  return null;
}

export interface DrawnFxMotion {
  rot: number;
  sx: number;
  sy: number;
  alpha: number;
}

/** Duración sugerida (frames a 60 Hz) de cada animación por transformación. */
export const DRAWN_FX_FRAMES: Record<DrawnFxKind, number> = { orb: 60, beam: 22, summon: 40, vortex: 48 };

/**
 * Animación por transformación de una imagen fija, en función del frame (60 Hz).
 * Los valores son relativos: se multiplican por la escala/giro base del sprite.
 */
export function drawnFxMotion(kind: DrawnFxKind, frame: number): DrawnFxMotion {
  const f = Math.max(0, frame);
  switch (kind) {
    case 'orb': {
      const pulse = 1 + 0.12 * Math.sin(f * 0.6);
      return { rot: 6 * Math.sin(f * 0.35), sx: pulse, sy: 2 - pulse, alpha: 1 };
    }
    case 'vortex': {
      const total = DRAWN_FX_FRAMES.vortex;
      const fade = f > total - 10 ? Math.max(0, (total - f) / 10) : 1;
      return { rot: (f * 22) % 360, sx: 1 + 0.18 * Math.sin(f * 0.5), sy: 1 + 0.06 * Math.sin(f * 0.31), alpha: fade };
    }
    case 'summon': {
      const total = DRAWN_FX_FRAMES.summon;
      const grow = Math.min(1, f / 8);
      const sy = 0.2 + 0.8 * grow + (grow >= 1 ? 0.04 * Math.sin(f * 0.7) : 0);
      const fadeStart = total - 12;
      const alpha = f > fadeStart ? Math.max(0, (total - f) / 12) : 1;
      return { rot: 0, sx: 0.85 + 0.15 * grow, sy, alpha };
    }
    case 'beam': {
      const total = DRAWN_FX_FRAMES.beam;
      const stretch = Math.min(1, f / 6);
      const sx = 0.3 + 1.2 * stretch + 0.08 * Math.sin(f * 0.9);
      const alpha = f > total - 6 ? Math.max(0, (total - f) / 6) : 1;
      return { rot: 0, sx, sy: 0.9 + 0.1 * Math.sin(f * 0.8), alpha };
    }
  }
}
