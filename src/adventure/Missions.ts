import type { AdventureState } from './State';
import { GUARDIANS } from './World';
import { MYTH_ARC, type MythId } from './Stories';

/**
 * Misiones del modo aventura: qué le falta a Juan, qué paso sigue y dónde queda.
 * Puro: se calcula todo a partir de la partida, así nunca se desincroniza.
 */

export type MissionId = 'machete' | 'mapa' | 'escapulario' | 'perro' | 'caballo' | 'mitos';
export type ItemId = 'farol' | 'machete' | 'mapa' | 'escapulario' | 'perro' | 'caballo';

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

export const MISSION_IDS: MissionId[] = ['machete', 'mapa', 'escapulario', 'perro', 'caballo', 'mitos'];

// sitios del campo donde se resuelve cada cosa
const TRAPICHE: Spot = { map: 'int:trapiche0', x: 7, y: 5 };
const CLARO: Spot = { map: 'monte', x: 25, y: 5 };
const CABO: Spot = { map: 'campo', x: 23, y: 24 };
const PADRE: Spot = { map: 'int:iglesia0', x: 6, y: 4 };
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
      return { text: 'LA RONDA EMPIEZA CON EL MACHETE DEL ABUELO: VAYA DONDE DON JULIO, AL TRAPICHE.', goal: TRAPICHE };
    case 'mapa':
      return { text: 'EL CABO RAMÍREZ APUNTA DÓNDE VEN ESPANTOS: PÍDALE EL MAPA EN LA ENTRADA DEL PUEBLO.', goal: CABO };
    case 'escapulario':
      if (has(s, 'escapulario_perdido')) return { text: 'SE LE PERDIÓ EL ESCAPULARIO: PÍDALE OTRO AL PADRE, EN LA IGLESIA.', goal: PADRE };
      return { text: 'CONTRA EL DUENDE Y LOS ESPÍRITUS: PÍDALE UN ESCAPULARIO AL PADRE ANSELMO, EN LA IGLESIA.', goal: PADRE };
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
      if (!left) return { text: 'LA RONDA ESTÁ COMPLETA: LOS NUEVE MITOS CALMADOS. ¡VUELVA CON LA ABUELA ROSA!', goal: ABUELA };
      if (!has(s, 'machete')) return { text: 'SIN MACHETE NO HAY RONDA. PRIMERO GÁNESE EL MACHETE DEL ABUELO.' };
      return { text: `CALME A LOS ${GUARDIANS.length} MITOS ANTES DE LAS DOCE (VAN ${s.calmed.length}). SIGA SUS SEÑALES${has(s, 'mapa') ? ' Y EL MAPA (M)' : ''}.` };
    }
  }
}

const TITLES: Record<MissionId, string> = {
  machete: 'EL MACHETE DEL ABUELO',
  mapa: 'EL MAPA DEL CABO',
  escapulario: 'EL ESCAPULARIO',
  perro: 'UN AMIGO FIEL',
  caballo: 'LUCERO, EL CABALLO',
  mitos: 'LA RONDA DEL ABUELO',
};

const DONE: Record<MissionId, (s: AdventureState) => boolean> = {
  machete: (s) => has(s, 'machete'),
  mapa: (s) => has(s, 'mapa'),
  escapulario: (s) => has(s, 'escapulario'),
  perro: (s) => has(s, 'perro'),
  caballo: (s) => has(s, 'caballo'),
  mitos: (s) => has(s, 'fin'),
};

/**
 * Lo que Juan sabe de su propósito: por qué está haciendo esto y qué le han contado los mitos ya calmados.
 * La primera línea siempre dice qué le toca; las demás, lo aprendido.
 */
export function purpose(s: AdventureState): string[] {
  const n = s.calmed.length, total = GUARDIANS.length;
  const lessons = s.calmed.map((id) => MYTH_ARC[id as MythId]?.lesson).filter((l): l is string => !!l);
  let head: string;
  if (has(s, 'fin')) head = 'SAN AGUSTÍN DUERME EN PAZ. EL AÑO ENTRANTE ME TOCA OTRA VEZ LA RONDA, COMO AL ABUELO.';
  else if (n >= total) head = 'LA RONDA ESTÁ COMPLETA. ME FALTA CONTÁRSELO A LA ABUELA ROSA.';
  else if (!has(s, 'machete')) head = 'ESTA NOCHE ME TOCA HACER LA RONDA DEL ABUELO JOAQUÍN. PRIMERO, SU MACHETE: LO TIENE DON JULIO, EN EL TRAPICHE.';
  else if (!n) head = `TENGO HASTA LAS DOCE PA' CALMAR A LOS ${total} MITOS. NO ES ACABARLOS: ES HACERME RESPETAR Y RESPETARLOS, COMO EL ABUELO.`;
  else head = `VAN ${n} DE ${total}. SI A LAS DOCE QUEDA UNO SUELTO, LA NOCHE SE REPITE. CADA MITO ME CUENTA ALGO DEL ABUELO.`;
  return lessons.length ? [head, `LO QUE HE APRENDIDO: ${lessons.join(' ')}`] : [head];
}

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
  for (const id of ['machete', 'mapa', 'escapulario', 'perro', 'caballo'] as const) if (has(s, id)) out.push(id);
  return out;
}

export const ITEM_NAME: Record<ItemId, string> = { farol: 'EL FAROL', machete: 'EL MACHETE', mapa: 'EL MAPA', escapulario: 'EL ESCAPULARIO', perro: 'FIRULAIS', caballo: 'LUCERO' };

export interface Exit { x: number; y: number; to: string; tx: number; ty: number }

const MONTE_IN: Spot = { map: 'campo', x: 88, y: 1 };
const MONTE_OUT: Spot = { map: 'monte', x: 20, y: 30 };
const CHARCO_OUT: Spot = { map: 'charco', x: 21, y: 1 };

/**
 * Hacia dónde apuntar desde el mapa en el que está Juan: la meta si está aquí, o la salida que lleva hacia ella.
 * `exitOf` da la salida de un interior (su tapete y la puerta afuera). Desde las ciudades no se indica nada.
 */
export function waypoint(here: string, goal: Spot, exitOf: (map: string) => Exit | undefined): Spot | null {
  if (goal.map === here) return goal;
  if (here === 'monte') return MONTE_OUT;
  if (here === 'charco') return CHARCO_OUT;
  const inside = exitOf(here);
  if (inside) return { map: here, x: inside.x, y: inside.y };
  if (here !== 'campo') return null;
  if (goal.map === 'monte') return MONTE_IN;
  const door = exitOf(goal.map);
  return door?.to === 'campo' ? { map: 'campo', x: door.tx, y: door.ty } : null;
}
