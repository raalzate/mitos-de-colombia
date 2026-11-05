import type { FighterId } from './CombatTypes';

/**
 * Conversación de reto antes de la primera ronda. Juan contra cada mito tiene diálogos propios (que siguen la
 * historia de la ronda del abuelo); los mitos que comparten tierra tienen sus piques; cualquier otro cruce se arma
 * con un reto y una respuesta de cada uno. Siempre al azar. Cada frase cabe en el globo (máximo 44 letras).
 */

export interface DuelLine { who: 'p1' | 'p2'; text: string }

type Script = [string, string, string];
interface Scripted { first: 'p1' | 'p2'; lines: Script }

/** Juan (p1) contra el mito (p2): [Juan, mito, Juan] o [mito, Juan, mito] según `first`. */
const VS_JUAN: Partial<Record<FighterId, Scripted[]>> = {
  silbon: [
    { first: 'p2', lines: ['FIIIIIU... ¿OYES MI SILBIDO, CAMPESINO?', '¡LO OIGO CERQUITA, ASÍ QUE ESTÁ LEJOS!', '¡JA! ¡ESO CREES TÚ!'] },
    { first: 'p1', lines: ['¡SUELTE ESE COSTAL DE HUESOS, SEÑOR!', '¡ESTOS HUESOS SON MI CASTIGO!', '¡PUES HOY DESCANSA UN RATICO!'] },
    { first: 'p2', lines: ['TU ABUELO ME SILBABA DE VUELTA...', '¡Y YO TAMBIÉN, SI ME DEJA, SEÑOR!', 'PRIMERO GÁNATE EL SILBIDO.'] },
  ],
  llorona: [
    { first: 'p2', lines: ['¡AAAAY! ¿TÚ TIENES A MIS HIJOS?', 'NO, SEÑORA... ¡PERO LO SIENTO MUCHO!', '¡ENTONCES NO ME ESTORBES!'] },
    { first: 'p1', lines: ['¡DEJE DE ASUSTAR A LOS PESCADORES!', '¡EL RÍO ES MÍO Y MI LLANTO TAMBIÉN!', '¡PUES VAMOS A CALMAR ESE LLANTO!'] },
    { first: 'p2', lines: ['NADIE ME PRENDIÓ LA VELA ESTE AÑO...', 'EL ABUELO SE MURIÓ, SEÑORA. VINE YO.', '¡AAAY! ¡DEMUÉSTRAME QUE ERES SU NIETO!'] },
  ],
  patasola: [
    { first: 'p2', lines: ['¡TUM, TUM! ¿QUIÉN ENTRÓ A MI MONTE?', '¡UN PAISA QUE NO SE ARRUGA!', '¡CON UNA PATA TE VOY A GANAR!'] },
    { first: 'p1', lines: ['¡SEÑORA, ME PERDÍ EN EL MONTE!', '¡JE, JE! ¡AQUÍ NADIE SE ENCUENTRA!', '¡AVE MARÍA! ¡ENTONCES A PELEAR!'] },
    { first: 'p2', lines: ['¿ESE MACHETE VIENE A TUMBAR MONTE?', '¡NO, SEÑORA! ¡ES EL DE MI ABUELO!', '¡TUM! ¡ESO LO VEREMOS!'] },
  ],
  madremonte: [
    { first: 'p2', lines: ['¿POR QUÉ TRAES ESE MACHETE A MI MONTE?', '¡ES PA\' TRABAJAR, NO PA\' DAÑAR, SEÑORA!', '¡DEMUÉSTRALO!'] },
    { first: 'p1', lines: ['¡CON PERMISO, DOÑA MADREMONTE!', '¡AL MENOS ERES EDUCADO, CAMPESINO!', '¡Y BERRACO TAMBIÉN!'] },
    { first: 'p2', lines: ['JOAQUÍN PEDÍA PERMISO. ¿Y TÚ?', '¡CON PERMISO Y CON RESPETO, SEÑORA!', 'EL MONTE TE ESTÁ ESCUCHANDO...'] },
  ],
  mohan: [
    { first: 'p2', lines: ['JE, JE... ¿VIENES A ROBARME EL ORO?', '¡YO SOLO VINE A PESCAR, DON MOHÁN!', '¡ENTONCES PRIMERO PESCA ESTO!'] },
    { first: 'p1', lines: ['¡DEVUÉLVALE LOS ANZUELOS A DON TOÑO!', '¡TRÁEME TABACO Y LO PENSARÉ!', '¡LE DEBO EL TABACO, PERO NO LE CORRO!'] },
    { first: 'p2', lines: ['¿Y EL TABACO QUE ME TRAÍA JOAQUÍN?', '¡SE LO QUEDO DEBIENDO, DON MOHÁN!', '¡JE! ¡LOS QUE ME DEBEN, ME PAGAN!'] },
  ],
  hombrecaiman: [
    { first: 'p2', lines: ['¡GRRR! ¡NADIE ME MIRA EN EL RÍO!', '¡NADIE LO ESTÁ MIRANDO, SEÑOR CAIMÁN!', '¡AHORA SÍ ME MIRAS! ¡GRRR!'] },
    { first: 'p1', lines: ['¡SE VA EL CAIMÁN, SE VA EL CAIMÁN!', '¡NO ME CANTES ESA CANCIÓN!', '¡PUES BAILE CONMIGO!'] },
    { first: 'p2', lines: ['¿TÚ TAMBIÉN TE VAS A BURLAR DE MÍ?', '¡NO, SAÚL! ¡MI ABUELO LO QUERÍA!', '¡GRRR! ¡IGUAL TE VOY A MORDER!'] },
  ],
  bachue: [
    { first: 'p2', lines: ['SOY LA MADRE DE TODOS. ¿QUIÉN ERES TÚ?', 'JUAN MACHETE, PA\' SERVIRLE, SEÑORA.', 'DEMUÉSTRAME QUE ERES DIGNO.'] },
    { first: 'p1', lines: ['¡QUÉ SERPIENTE TAN GRANDE Y TAN BONITA!', 'LA LAGUNA PROTEGE A QUIEN LA RESPETA.', '¡PUES LA RESPETO PELEANDO LIMPIO!'] },
    { first: 'p2', lines: ['TU ABUELO HIZO UNA PROMESA AQUÍ.', '¿CUÁL PROMESA, MI SEÑORA?', 'GÁNATE EL DERECHO A SABERLO.'] },
  ],
  sombreron: [
    { first: 'p2', lines: ['¿QUÉ HACES EN LA CALLE TAN TARDE?', '¡BUSCÁNDOLO A USTED, SEÑOR SOMBRERÓN!', '¡ENTONCES CUIDA TU CABEZA!'] },
    { first: 'p1', lines: ['¡QUÉ SOMBRERO TAN GRANDOTE!', '¡Y CABES TÚ ENTERO DEBAJO!', '¡ESO ESTÁ POR VERSE!'] },
    { first: 'p2', lines: ['¿ANDAS TOMADO, MUCHACHO?', '¡NI UN AGUARDIENTE! ¡ANDO DE RONDA!', '¿DE RONDA? ¡COMO EL VIEJO JOAQUÍN!'] },
  ],
  muelona: [
    { first: 'p2', lines: ['HOLA, PAISITA... ¿ME INVITAS A BAILAR?', '¡CON ESOS DIENTES, NI LOCO, SEÑORA!', '¡JI, JI! ¡ENTONCES A MORDISCOS!'] },
    { first: 'p1', lines: ['¡SEÑORA, CIERRE ESA BOCA, POR FAVOR!', '¡JI, JI, JI! ¿NO TE GUSTA MI SONRISA?', '¡ME DA ES MIEDO, PUES!'] },
    { first: 'p2', lines: ['TU ABUELO ME DEJABA UN AGUARDIENTE...', '¡YO LE DEJO ES UN TINTICO, SEÑORA!', '¡JI, JI! ¡QUÉ TACAÑO EL NIETO!'] },
  ],
};

/** Piques entre mitos que comparten tierra: [a, b, a], con `a` el primero de la clave. */
const RIVALS: Record<string, Script[]> = {
  'llorona|mohan': [['¡TÚ TE ROBAS A LOS NIÑOS DEL RÍO!', '¡JE! ¡YO SOLO ME ROBO ANZUELOS, MUJER!', '¡MENTIROSO! ¡AAAAY!']],
  'hombrecaiman|mohan': [['¡BARBUDO, ME ESPANTAS LOS BOCACHICOS!', '¡Y TÚ ME ENLODAS LA CUEVA, SAÚL!', '¡EL RÍO ES DE LOS DOS, GRRR!']],
  'hombrecaiman|llorona': [['¡SEÑORA, NO LLORE QUE ME MOJA!', '¡AAAY! ¿TÚ HAS VISTO A MIS HIJOS?', '¡YO NO VI NADA, YO NO MIRO A NADIE!']],
  'madremonte|patasola': [['¡NO BRINQUES ENCIMA DE MIS RAÍCES!', '¡EL MONTE TAMBIÉN ES MÍO, VIEJA!', '¡PUES A VER QUIÉN LO CUIDA MEJOR!']],
  'muelona|sombreron': [['¡QUÉ SOMBRERO TAN FEO, MIJO!', '¡SEÑORA, A SU CANTINA, QUE ES TARDE!', '¡JI, JI! ¡SACA EL SOMBRERO, PUES!']],
  'silbon|sombreron': [['FIIIIU... ¡TUS PERROS NO ME ASUSTAN!', '¡SILBE MÁS BAJITO, COMPADRE!', '¡DO, RE, MI... AQUÍ VOY!']],
  'bachue|madremonte': [['HIJA DEL MONTE, ¿ME RECONOCES?', 'MADRE DEL AGUA... ¡PERO AQUÍ MANDO YO!', 'ENTONCES QUE DECIDA LA TIERRA.']],
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

const other = (w: 'p1' | 'p2'): 'p1' | 'p2' => (w === 'p1' ? 'p2' : 'p1');

/** Arma la conversación de reto entre p1 y p2 (dos o tres frases), al azar. */
export function pickDuel(p1: FighterId, p2: FighterId, roll: number): DuelLine[] {
  const juanFirst = p1 === 'juanmachete' ? VS_JUAN[p2] : undefined;
  const juanSecond = p2 === 'juanmachete' ? VS_JUAN[p1] : undefined;
  const scripts = juanFirst ?? juanSecond;
  if (scripts?.length) {
    const s = scripts[Math.floor(roll * scripts.length) % scripts.length];
    // si Juan es p2, se invierten los papeles
    const a = juanSecond ? other(s.first) : s.first;
    return [{ who: a, text: s.lines[0] }, { who: other(a), text: s.lines[1] }, { who: a, text: s.lines[2] }];
  }
  // piques entre mitos vecinos: abre el primero de la clave, esté en p1 o en p2
  const rival = RIVALS[`${p1}|${p2}`] ?? RIVALS[`${p2}|${p1}`];
  if (rival?.length && p1 !== p2) {
    const lines = rival[Math.floor(roll * rival.length) % rival.length];
    const a: 'p1' | 'p2' = RIVALS[`${p1}|${p2}`] ? 'p1' : 'p2';
    return [{ who: a, text: lines[0] }, { who: other(a), text: lines[1] }, { who: a, text: lines[2] }];
  }
  const first: 'p1' | 'p2' = roll < 0.5 ? 'p1' : 'p2';
  const second = other(first);
  const id = (w: 'p1' | 'p2') => (w === 'p1' ? p1 : p2);
  return [{ who: first, text: CHALLENGE[id(first)] }, { who: second, text: REPLY[id(second)] }];
}
