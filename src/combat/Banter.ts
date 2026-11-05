import type { FighterId } from './CombatTypes';

/** Lo que dicen los luchadores cuando están alejados: frases al azar, aptas para niños. Máximo 40 letras. */
export const BANTER: Record<FighterId, string[]> = {
  juanmachete: [
    '¡AVE MARÍA, PUES!', '¡A MÍ NO ME ASUSTA NADIE!', '¿QUIUBO, PUES? ¡VENGA!', '¡QUÉ PEREZA TANTO ESPANTO!',
    '¡MI ABUELA PEGA MÁS DURO!', '¡ESTE MACHETE ES PA\' TRABAJAR!', '¡ÁNIMO, JUAN, QUE SÍ SE PUEDE!', '¡EH, AVE MARÍA, QUÉ SUSTO!',
    '¡NO VINE A ACABARLO: VINE A CALMARLO!', '¡ABUELO, ÉCHEME LA BENDICIÓN!', '¡CALMADO, QUE YO NO MUERDO!',
    '¡UN PAISA NO SE ARRUGA, PARCE!', '¡QUÉ PELEA TAN BERRACA, PUES!',
  ],
  silbon: [
    'FIIIIIIU...', 'DO, RE, MI, FA, SOL...', '¿ME OYES CERCA? ¡ESTOY LEJOS!', 'MIS HUESOS SUENAN, CLAC, CLAC...',
    'EN EL LLANO NADIE SE ME ESCAPA.', 'FIU, FIU... ¿Y TU PERRO DÓNDE ESTÁ?', 'NADIE ME SILBA DE VUELTA...',
    'ESTE SACO PESA MÁS QUE TÚ.', '...LA, SI... ¿DO?',
  ],
  llorona: [
    '¡AAAAY, MIS HIJOS!', '¿HAS VISTO A MIS NIÑOS?', 'SNIF... SNIF...', 'EL RÍO SE LOS LLEVÓ...',
    '¡NO TE VAYAS TAN LEJOS DEL AGUA!', 'BUAAAAA...', '¿QUIÉN PRENDE MI VELA AHORA?', 'EL AGUA ESTÁ FRÍA, MIJITO...',
  ],
  patasola: [
    '¡TUM, TUM, TUM!', 'CON UNA PATA ME BASTA.', '¡NO TE METAS A MI MONTE!', 'SALTO MÁS LEJOS QUE TÚ.',
    '¡JA! ¿Y TÚ CON DOS PATAS TAN LENTO?', 'EL MONTE ES MÍO.', '¿Y ESE MACHETE PA\' QUÉ ES?', '¡FUERA HACHAS DE MI MONTE!',
  ],
  madremonte: [
    '¡NO TUMBES MIS ÁRBOLES!', 'EL MONTE ME HABLA...', 'CUIDA EL AGUA DE LA QUEBRADA.', 'HOJAS, RAMAS... ¡A ÉL!',
    '¿PEDISTE PERMISO PARA ENTRAR?', 'LOS BEJUCOS TE VAN A ENREDAR.', 'EL MUSGO TIENE MEMORIA.', 'TE VA A DAR FIEBRE, MUCHACHO.',
  ],
  mohan: [
    'JE, JE, JE...', '¿VIENES POR MI ORO?', '¿TE TOCO UNA CANCIÓN EN EL TIPLE?', 'EL RÍO ES MI CASA.',
    'TRÁEME TABACO Y TE DEJO PESCAR.', '¡BLUB, BLUB!', '¿Y MI TABAQUITO, PUES?', 'EL AGUA ME HACE COSQUILLAS.',
  ],
  hombrecaiman: [
    '¡GRRRR!', '¡SE VA EL CAIMÁN, SE VA EL CAIMÁN!', 'TENGO HAMBRE DE BOCACHICO.', '¡NO ME MIRES ASÍ!',
    'SOY MITAD HOMBRE, MITAD CAIMÁN.', '¡CHAPUZÓN!', '¡NO ME CANTES ESA CANCIÓN!', 'AY, MI ESPALDA ESCAMOSA...',
  ],
  bachue: [
    'SOY LA MADRE DE TODOS.', 'LA LAGUNA ES SAGRADA.', 'SSSSSS...', 'DEMUÉSTRAME TU VALOR.',
    'RESPETA LA TIERRA, PEQUEÑO.', 'EL AGUA RECUERDA TODO.', 'DE LA LAGUNA VENIMOS TODOS.', 'TU ABUELO PELEABA MEJOR.',
  ],
  sombreron: [
    '¡MI SOMBRERO TE VA A ATRAPAR!', 'PÓRTATE BIEN...', 'TOC, TOC, LOS CASCOS DE MI CABALLO.', '¿A QUIÉN SE LE ESTÁ HACIENDO TARDE?',
    'MÁS GRANDE ES MI SOMBRERO.', 'JE, JE... TE ESTOY VIENDO.', '¿ANDAS TOMADO, MUCHACHO?', 'MIS PERROS YA TE OLIERON.',
  ],
  muelona: [
    'JI, JI, JI...', '¡MIRA MIS DIENTES TAN BONITOS!', 'VEN, PAISITA, VEN...', '¿ME INVITAS A UN TINTO?',
    'SONRÍE, QUE YO TAMBIÉN SONRÍO.', '¡ÑAM, ÑAM!', '¿UN AGUARDIENTICO, MI AMOR?', 'TENGO MUELA PA\' RATO.',
  ],
};

/**
 * Frases para un rival en particular: se mezclan con las de siempre cuando pelean esos dos.
 * Juan le habla distinto a cada mito, y los mitos que comparten tierra se pican entre ellos.
 */
export const BANTER_VS: Partial<Record<FighterId, Partial<Record<FighterId, string[]>>>> = {
  juanmachete: {
    silbon: ['¡FIU, FIU! ¡AHÍ LE SILBO DE VUELTA!', '¡SUELTE ESE COSTAL, SEÑOR!'],
    llorona: ['¡SEÑORA, YO LE PRENDO LA VELA!', '¡NO LLORE MÁS, QUE ME DA PESAR!'],
    patasola: ['¡NO VINE A TUMBAR NADA, SEÑORA!', '¡DOS PATAS Y IGUAL ME CANSO!'],
    madremonte: ['¡CON PERMISO, DOÑA MADREMONTE!', '¡SOLO COGÍ LEÑA CAÍDA, LO JURO!'],
    mohan: ['¡LE DEBO EL TABACO, DON MOHÁN!', '¡ESE ORO NO ME LO COJO!'],
    hombrecaiman: ['¡NO LE ESTOY MIRANDO NADA!', '¡SAÚL, HERMANO, CÁLMESE!'],
    bachue: ['¡CON RESPETO, MI SEÑORA!', '¡SOY EL NIETO DE JOAQUÍN!'],
    sombreron: ['¡YO NO ESTOY TOMADO, SEÑOR!', '¡GUARDE ESE SOMBRERO!'],
    muelona: ['¡CIERRE ESA BOCA, SEÑORA!', '¡YO NO TOMO, YO NO TOMO!'],
  },
  silbon: { juanmachete: ['¿VAS A SILBARME COMO TU ABUELO?'], sombreron: ['¡ESOS PERROS NO ME ASUSTAN!'] },
  llorona: { juanmachete: ['¿TÚ PRENDES LA VELA AHORA?'], mohan: ['¡DEVUÉLVEME A MIS NIÑOS, VIEJO!'], hombrecaiman: ['¡NO TE ARRIMES A MI ORILLA!'] },
  patasola: { juanmachete: ['¿PEDISTE PERMISO, MUCHACHO?'], madremonte: ['¡ESTE MONTE TAMBIÉN ES MÍO!'] },
  madremonte: { juanmachete: ['LA LEÑA CAÍDA SÍ, LO VIVO NO.'], patasola: ['¡DEJA DE BRINCAR EN MIS RAÍCES!'] },
  mohan: { juanmachete: ['¿Y EL TABACO DE JOAQUÍN?'], llorona: ['¡ESOS NIÑOS NO LOS TENGO YO!'], hombrecaiman: ['¡SAÚL, NO ME ESPANTES LOS PECES!'] },
  hombrecaiman: { juanmachete: ['¡TU ABUELO NO SE BURLABA!'], mohan: ['¡EL RÍO ES DE LOS DOS, BARBUDO!'], llorona: ['¡NO LLORE, QUE ME MOJA MÁS!'] },
  bachue: { juanmachete: ['¿CONOCES LA PROMESA, NIETO?'] },
  sombreron: { juanmachete: ['A TU ABUELO NUNCA LO PERSEGUÍ.'], muelona: ['¡SEÑORA, A SU CANTINA!'], silbon: ['¡SILBE MÁS BAJITO, COMPADRE!'] },
  muelona: { juanmachete: ['TU ABUELO SÍ ME INVITABA...'], sombreron: ['¡QUÉ SOMBRERO TAN FEO, MIJO!'] },
};

/** distancia mínima (px) entre los dos para que se pongan a hablar */
export const BANTER_DISTANCE = 120;
/** fotogramas mínimos entre una frase y la siguiente */
export const BANTER_GAP = 150;
/** probabilidad por fotograma, ya pasado el mínimo */
export const BANTER_CHANCE = 0.012;

/** ¿Toca que alguno hable ahora? Solo de lejos, sin prisa y de vez en cuando. */
export function wantsBanter(distance: number, framesSinceLast: number, roll: number): boolean {
  return distance >= BANTER_DISTANCE && framesSinceLast >= BANTER_GAP && roll < BANTER_CHANCE;
}

/** Las frases que puede decir `id` contra `foe`: las de siempre más las de esa pareja. */
export function linesFor(id: FighterId, foe?: FighterId): string[] {
  const extra = foe ? BANTER_VS[id]?.[foe] ?? [] : [];
  return [...BANTER[id], ...extra];
}

/** Frase al azar del luchador (contra `foe`, si se sabe), evitando repetir la última que dijo. */
export function pickLine(id: FighterId, roll: number, last?: string, foe?: FighterId): string {
  const lines = linesFor(id, foe);
  let i = Math.floor(roll * lines.length) % lines.length;
  if (lines[i] === last) i = (i + 1) % lines.length;
  return lines[i];
}
