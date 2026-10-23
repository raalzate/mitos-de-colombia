import type { FighterId } from './CombatTypes';

/**
 * Conversación de reto antes de la primera ronda. Juan contra cada mito tiene diálogos propios;
 * cualquier otro cruce se arma con un reto y una respuesta de cada uno. Siempre al azar.
 */

export interface DuelLine { who: 'p1' | 'p2'; text: string }

type Script = [string, string, string];

/** Juan (p1) contra el mito (p2): [Juan, mito, Juan] o [mito, Juan, mito] según `first`. */
const VS_JUAN: Partial<Record<FighterId, { first: 'p1' | 'p2'; lines: Script }[]>> = {
  silbon: [
    { first: 'p2', lines: ['FIIIIIU... ¿OYES MI SILBIDO, CAMPESINO?', '¡LO OIGO CERQUITA, ASÍ QUE ESTÁ LEJOS!', '¡JA! ¡ESO CREES TÚ!'] },
    { first: 'p1', lines: ['¡SUELTE ESE COSTAL DE HUESOS, SEÑOR!', '¡ESTOS HUESOS SON MI CASTIGO, NO MI CARGA!', '¡PUES HOY DESCANSA, PUES!'] },
  ],
  llorona: [
    { first: 'p2', lines: ['¡AAAAY! ¿TÚ TIENES A MIS HIJOS?', 'NO, SEÑORA... ¡PERO LO SIENTO MUCHO!', '¡ENTONCES NO ME ESTORBES!'] },
    { first: 'p1', lines: ['¡DEJE DE ASUSTAR A LOS PESCADORES!', '¡EL RÍO ES MÍO Y MI LLANTO TAMBIÉN!', '¡PUES VAMOS A CALMAR ESE LLANTO!'] },
  ],
  patasola: [
    { first: 'p2', lines: ['¡TUM, TUM! ¿QUIÉN ENTRÓ A MI MONTE?', '¡UN PAISA QUE NO SE ARRUGA!', '¡CON UNA PATA TE VOY A GANAR!'] },
    { first: 'p1', lines: ['¡SEÑORA, ME PERDÍ EN EL MONTE!', '¡JE, JE! ¡AQUÍ NADIE SE ENCUENTRA!', '¡AVE MARÍA! ¡ENTONCES A PELEAR!'] },
  ],
  madremonte: [
    { first: 'p2', lines: ['¿POR QUÉ TRAES ESE MACHETE A MI MONTE?', '¡ES PA\' TRABAJAR, NO PA\' DAÑAR, SEÑORA!', '¡DEMUÉSTRALO!'] },
    { first: 'p1', lines: ['¡CON PERMISO, DOÑA MADREMONTE!', '¡AL MENOS ERES EDUCADO, CAMPESINO!', '¡Y BERRACO TAMBIÉN!'] },
  ],
  mohan: [
    { first: 'p2', lines: ['JE, JE... ¿VIENES A ROBARME EL ORO?', '¡YO SOLO VINE A PESCAR, DON MOHÁN!', '¡ENTONCES PRIMERO PESCA ESTO!'] },
    { first: 'p1', lines: ['¡DEVUÉLVALE LOS ANZUELOS A DON TOÑO!', '¡TRÁEME TABACO Y LO PENSARÉ!', '¡LE TRAIGO ES UN MACHETAZO!'] },
  ],
  hombrecaiman: [
    { first: 'p2', lines: ['¡GRRR! ¡NADIE ME MIRA EN EL RÍO!', '¡NADIE LO ESTÁ MIRANDO, SEÑOR CAIMÁN!', '¡AHORA SÍ ME MIRAS! ¡GRRR!'] },
    { first: 'p1', lines: ['¡SE VA EL CAIMÁN, SE VA EL CAIMÁN!', '¡NO ME CANTES ESA CANCIÓN!', '¡PUES BAILE CONMIGO!'] },
  ],
  bachue: [
    { first: 'p2', lines: ['SOY LA MADRE DE TODOS. ¿QUIÉN ERES TÚ?', 'JUAN MACHETE, PA\' SERVIRLE, SEÑORA.', 'DEMUÉSTRAME QUE ERES DIGNO.'] },
    { first: 'p1', lines: ['¡QUÉ SERPIENTE TAN GRANDE Y TAN BONITA!', 'LA LAGUNA PROTEGE A QUIEN LA RESPETA.', '¡PUES LA RESPETO PELEANDO LIMPIO!'] },
  ],
  sombreron: [
    { first: 'p2', lines: ['¿QUÉ HACES EN LA CALLE TAN TARDE?', '¡BUSCÁNDOLO A USTED, SEÑOR SOMBRERÓN!', '¡ENTONCES CUIDA TU CABEZA!'] },
    { first: 'p1', lines: ['¡QUÉ SOMBRERO TAN GRANDOTE!', '¡Y CABES TÚ ENTERO DEBAJO!', '¡ESO ESTÁ POR VERSE!'] },
  ],
  muelona: [
    { first: 'p2', lines: ['HOLA, PAISITA... ¿ME INVITAS A BAILAR?', '¡CON ESOS DIENTES, NI LOCO, SEÑORA!', '¡JI, JI! ¡ENTONCES A MORDISCOS!'] },
    { first: 'p1', lines: ['¡SEÑORA, CIERRE ESA BOCA, POR FAVOR!', '¡JI, JI, JI! ¿NO TE GUSTA MI SONRISA?', '¡ME DA ES MIEDO, PUES!'] },
  ],
};

/** reto con que abre cada uno y respuesta cuando lo retan */
const CHALLENGE: Record<FighterId, string> = {
  juanmachete: '¡VENGA, PUES, QUE NO LE TENGO MIEDO!',
  silbon: 'FIIIIIU... YA TE OÍ LLEGAR.',
  llorona: '¡AAAY! ¡TÚ NO ERES MI HIJO!',
  patasola: '¡TUM, TUM! ¡FUERA DE MI MONTE!',
  madremonte: '¿PEDISTE PERMISO PARA ENTRAR?',
  mohan: 'JE, JE... ¿VIENES POR MI ORO?',
  hombrecaiman: '¡GRRR! ¡NO ME MIRES!',
  bachue: 'DEMUÉSTRAME TU VALOR.',
  sombreron: 'MI SOMBRERO YA TE VIO...',
  muelona: 'JI, JI... ¡QUÉ RICO, VISITA!',
};

const REPLY: Record<FighterId, string> = {
  juanmachete: '¡AVE MARÍA! ¡PUES A PELEAR SE DIJO!',
  silbon: 'MIS HUESOS ESTÁN LISTOS.',
  llorona: 'BUAAA... ¡TE VAS A ARREPENTIR!',
  patasola: '¡CON UNA PATA ME BASTA!',
  madremonte: 'EL MONTE ESTÁ DE MI LADO.',
  mohan: '¡EL RÍO ME DA FUERZA!',
  hombrecaiman: '¡CHAPUZÓN DE PUÑOS!',
  bachue: 'LA LAGUNA ME PROTEGE.',
  sombreron: 'PÓRTATE BIEN... O VERÁS.',
  muelona: '¡MIRA QUÉ DIENTES TAN BONITOS!',
};

/** Arma la conversación de reto entre p1 y p2 (dos o tres frases), al azar. */
export function pickDuel(p1: FighterId, p2: FighterId, roll: number): DuelLine[] {
  const juanFirst = p1 === 'juanmachete' ? VS_JUAN[p2] : undefined;
  const juanSecond = p2 === 'juanmachete' ? VS_JUAN[p1] : undefined;
  const scripts = juanFirst ?? juanSecond;
  if (scripts?.length) {
    const s = scripts[Math.floor(roll * scripts.length) % scripts.length];
    // si Juan es p2, se invierten los papeles
    const flip = (w: 'p1' | 'p2'): 'p1' | 'p2' => (juanSecond ? (w === 'p1' ? 'p2' : 'p1') : w);
    const other = (w: 'p1' | 'p2'): 'p1' | 'p2' => (w === 'p1' ? 'p2' : 'p1');
    const a = flip(s.first);
    return [{ who: a, text: s.lines[0] }, { who: other(a), text: s.lines[1] }, { who: a, text: s.lines[2] }];
  }
  const first: 'p1' | 'p2' = roll < 0.5 ? 'p1' : 'p2';
  const second = first === 'p1' ? 'p2' : 'p1';
  const id = (w: 'p1' | 'p2') => (w === 'p1' ? p1 : p2);
  return [{ who: first, text: CHALLENGE[id(first)] }, { who: second, text: REPLY[id(second)] }];
}
