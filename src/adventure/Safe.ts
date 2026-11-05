import type { FighterId } from '../combat/CombatTypes';
import { GUARDIANS, inRect, type Rect } from './World';
import { INTERIORS, getMap, moodIn, type GameMap, type MapId } from './Maps';
import { homeOf, type AdventureState } from './State';

/**
 * Zonas sin miedo (FR-039): donde hay fiesta, música, luz y gente no asusta nada. Ni screamers, ni ojos rojos,
 * ni señales, ni ruidos de espanto, ni mitos que salten, ni duende, pollo o mano peluda, ni susurros.
 * Son los sitios de ánimo «alegre» de cada mapa:
 */
export const SAFE_ZONES: Record<MapId, string[] | 'todo'> = {
  campo: ['TERMINAL DE JEEPS', 'FIESTAS DE SAN AGUSTÍN', 'PLAZA PRINCIPAL'],
  // toda la ciudad: Plaza Botero, Parque Berrío, metro, Pueblito Paisa, Comuna 13, Feria de las Flores, Parque del Río
  medellin: 'todo',
  // Santa Fe de Antioquia: el casco urbano; el camino de herradura, el puente y el río siguen oscuros
  santafe: ['PLAZA MAYOR', 'CALLE DE LA AMARGURA', 'SANTA FE DE ANTIOQUIA'],
  // y todos los interiores (casas, cantinas, tiendas, iglesias, fondas, teatro…)
};

/** ¿Esta casilla es zona sin miedo? */
export function isSafe(m: GameMap, x: number, y: number): boolean {
  return moodIn(m, x, y) === 'alegre';
}

/**
 * La excepción: un mito cuya leyenda vive en un sitio alegre (el Sombrerón en la Plaza Botero, la Muelona en su
 * cantina) solo se manifiesta dentro de su guarida de esta noche, y nada más asusta ahí. Fuera de ella, nada.
 */
export function hauntHere(s: AdventureState, map: MapId, x: number, y: number): FighterId | null {
  for (const g of GUARDIANS) {
    if (s.calmed.includes(g.id)) continue;
    const h = homeOf(s, g);
    if (h.map === map && inRect(h.zone, x, y)) return g.id;
  }
  return null;
}

/**
 * ¿Puede asustar algo aquí? Fuera de las zonas sin miedo, cualquier cosa. Dentro, solo el mito de la guarida
 * (si se pasa `who` y es él, y Juan está en su guarida).
 */
export function scareAllowed(s: AdventureState, m: GameMap, x: number, y: number, who?: FighterId): boolean {
  if (!isSafe(m, x, y)) return true;
  return !!who && hauntHere(s, m.id, x, y) === who;
}

/** Mitos cuya guarida queda en una zona sin miedo: la excepción explícita. */
export function safeHaunters(): FighterId[] {
  return GUARDIANS.filter((g) => g.haunts.some((h) => {
    const m = getMap(h.map);
    return zoneCellsSafe(m, h.zone);
  })).map((g) => g.id);
}

function zoneCellsSafe(m: GameMap, r: Rect): boolean {
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (isSafe(m, x, y)) return true;
  return false;
}

/** Casas de familia: ahí el duende hace de las suyas (de travesura, nunca de susto). */
export const HOUSES = new Set<string>([
  'casa_blanca0', 'casa_blanca1', 'casa_azul0', 'casa_amarilla0', 'casa_verde0', 'casa_verde1', 'casa_roja0',
  'finca0', 'finca1', 'sf_casa', 'casa_comuna',
]);

export const isHouse = (map: MapId) => map.startsWith('int:') && HOUSES.has(map.slice(4)) && !!INTERIORS[map.slice(4)];
