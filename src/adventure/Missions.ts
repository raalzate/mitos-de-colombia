import type { AdventureState } from './State';
import { GUARDIANS } from './World';

/**
 * Misiones del modo aventura: qué le falta a Juan, qué paso sigue y dónde queda.
 * Puro: se calcula todo a partir de la partida, así nunca se desincroniza.
 */

export type MissionId = 'machete' | 'mapa' | 'perro' | 'caballo' | 'mitos';
export type ItemId = 'farol' | 'machete' | 'mapa' | 'perro' | 'caballo';

/** Un sitio del mundo: mapa y casilla. */
export interface Spot { map: string; x: number; y: number }

export interface MissionStep {
  /** lo que tiene que hacer Juan, con indicaciones de cómo llegar */
  text: string;
  /** a dónde ir, si es un sitio fijo */
  goal?: Spot;
}

export interface Mission {
  id: MissionId;
  title: string;
  done: boolean;
  step: MissionStep;
}

export const MISSION_IDS: MissionId[] = ['machete', 'mapa', 'perro', 'caballo', 'mitos'];

// sitios del campo donde se resuelve cada cosa
const TRAPICHE: Spot = { map: 'int:trapiche0', x: 7, y: 5 };
const CLARO: Spot = { map: 'monte', x: 25, y: 5 };
const CABO: Spot = { map: 'campo', x: 23, y: 24 };
const PERRO: Spot = { map: 'campo', x: 36, y: 30 };
const GLORIA: Spot = { map: 'campo', x: 46, y: 26 };
const RUBEN: Spot = { map: 'campo', x: 14, y: 26 };
const LLANO: Spot = { map: 'campo', x: 30, y: 8 };
const ABUELA: Spot = { map: 'campo', x: 6, y: 24 };

const has = (s: AdventureState, f: string) => s.flags.includes(f);

function step(s: AdventureState, id: MissionId): MissionStep {
  switch (id) {
    case 'machete':
      if (has(s, 'lena')) return { text: 'LLÉVELE LA LEÑA A DON JULIO, AL TRAPICHE: VEREDA ABAJO, ANTES DEL PUENTE.', goal: TRAPICHE };
      if (has(s, 'encargo_lena')) return { text: 'TRAIGA LEÑA SECA DEL MONTE PURO: DEL PUEBLO AL ORIENTE Y POR LA TROCHA AL NORTE.', goal: CLARO };
      return { text: 'HABLE CON DON JULIO EN EL TRAPICHE: VEREDA ABAJO, ANTES DEL PUENTE.', goal: TRAPICHE };
    case 'mapa':
      return { text: 'PÍDALE EL MAPA AL CABO RAMÍREZ, EN LA ENTRADA DEL PUEBLO.', goal: CABO };
    case 'perro':
      if (has(s, 'arepa')) return { text: 'DELE LA AREPA AL PERRITO FLACO DE LA PLAZA.', goal: PERRO };
      if (has(s, 'perro_visto')) return { text: 'CONSIGA UNA AREPA: DOÑA GLORIA, EN LA PLAZA, O DOÑA MARINA, EN LAS FIESTAS.', goal: GLORIA };
      return { text: 'EN LA PLAZA ANDA UN PERRITO FLACO SIN DUEÑO. VAYA A VERLO.', goal: PERRO };
    case 'caballo':
      if (s.calmed.includes('silbon')) return { text: 'VUELVA DONDE DON RUBÉN, EN LA VEREDA, POR SU CABALLO LUCERO.', goal: RUBEN };
      if (has(s, 'oferta_caballo')) return { text: 'CALME AL SILBÓN EN EL LLANO, AL NORTE, Y DON RUBÉN LE DA A LUCERO.', goal: LLANO };
      return { text: 'HABLE CON DON RUBÉN, EL ARRIERO DE LA VEREDA.', goal: RUBEN };
    case 'mitos': {
      const left = GUARDIANS.length - s.calmed.length;
      if (!left) return { text: 'LOS NUEVE MITOS ESTÁN CALMADOS. ¡VUELVA CON LA ABUELA ROSA!', goal: ABUELA };
      if (!has(s, 'machete')) return { text: 'SIN MACHETE NO SE PUEDE. PRIMERO GÁNESE EL MACHETE DEL ABUELO.' };
      return { text: `CALME A LOS MITOS: ${s.calmed.length} DE ${GUARDIANS.length}. SIGA SUS SEÑALES${has(s, 'mapa') ? ' Y MIRE EL MAPA (M)' : ''}.` };
    }
  }
}

const TITLES: Record<MissionId, string> = {
  machete: 'EL MACHETE DEL ABUELO',
  mapa: 'EL MAPA DEL CABO',
  perro: 'UN AMIGO FIEL',
  caballo: 'LUCERO, EL CABALLO',
  mitos: 'CALMAR A LOS MITOS',
};

const DONE: Record<MissionId, (s: AdventureState) => boolean> = {
  machete: (s) => has(s, 'machete'),
  mapa: (s) => has(s, 'mapa'),
  perro: (s) => has(s, 'perro'),
  caballo: (s) => has(s, 'caballo'),
  mitos: (s) => has(s, 'fin'),
};

export function missions(s: AdventureState): Mission[] {
  return MISSION_IDS.map((id) => ({ id, title: TITLES[id], done: DONE[id](s), step: step(s, id) }));
}

/** La misión que se ve en pantalla: la que Juan fijó, o la primera que falte. */
export function currentMission(s: AdventureState): Mission | null {
  const all = missions(s);
  const pinned = all.find((m) => m.id === s.pinned && !m.done);
  return pinned ?? all.find((m) => !m.done) ?? null;
}

/** Lo que carga Juan, en orden. */
export function items(s: AdventureState): ItemId[] {
  const out: ItemId[] = [];
  if (has(s, 'intro')) out.push('farol');
  for (const id of ['machete', 'mapa', 'perro', 'caballo'] as const) if (has(s, id)) out.push(id);
  return out;
}

export const ITEM_NAME: Record<ItemId, string> = { farol: 'EL FAROL', machete: 'EL MACHETE', mapa: 'EL MAPA', perro: 'FIRULAIS', caballo: 'LUCERO' };

export interface Exit { x: number; y: number; to: string; tx: number; ty: number }

const MONTE_IN: Spot = { map: 'campo', x: 88, y: 1 };
const MONTE_OUT: Spot = { map: 'monte', x: 20, y: 30 };

/**
 * Hacia dónde apuntar desde el mapa en el que está Juan: la meta si está aquí, o la salida que lleva hacia ella.
 * `exitOf` da la salida de un interior (su tapete y la puerta afuera). Desde las ciudades no se indica nada.
 */
export function waypoint(here: string, goal: Spot, exitOf: (map: string) => Exit | undefined): Spot | null {
  if (goal.map === here) return goal;
  if (here === 'monte') return MONTE_OUT;
  const inside = exitOf(here);
  if (inside) return { map: here, x: inside.x, y: inside.y };
  if (here !== 'campo') return null;
  if (goal.map === 'monte') return MONTE_IN;
  const door = exitOf(goal.map);
  return door?.to === 'campo' ? { map: 'campo', x: door.tx, y: door.ty } : null;
}
