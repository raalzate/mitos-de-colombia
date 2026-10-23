import type { FighterId } from './CombatTypes';

/** Lo que dicen los luchadores cuando están alejados: frases al azar, aptas para niños. */
export const BANTER: Record<FighterId, string[]> = {
  juanmachete: [
    '¡AVE MARÍA, PUES!', '¡A MÍ NO ME ASUSTA NADIE!', '¿QUIUBO, PUES? ¡VENGA!', '¡QUÉ PEREZA TANTO ESPANTO!',
    '¡MI ABUELA PEGA MÁS DURO!', '¡ESTE MACHETE ES PA\' TRABAJAR!', '¡ÁNIMO, JUAN, QUE SÍ SE PUEDE!', '¡EH, AVE MARÍA, QUÉ SUSTO!',
  ],
  silbon: [
    'FIIIIIIU...', 'DO, RE, MI, FA, SOL...', '¿ME OYES CERCA? ¡ESTOY LEJOS!', 'MIS HUESOS SUENAN, CLAC, CLAC...',
    'EN EL LLANO NADIE SE ME ESCAPA.', 'FIU, FIU... ¿Y TU PERRO DÓNDE ESTÁ?',
  ],
  llorona: [
    '¡AAAAY, MIS HIJOS!', '¿HAS VISTO A MIS NIÑOS?', 'SNIF... SNIF...', 'EL RÍO SE LOS LLEVÓ...',
    '¡NO TE VAYAS TAN LEJOS DEL AGUA!', 'BUAAAAA...',
  ],
  patasola: [
    '¡TUM, TUM, TUM!', 'CON UNA PATA ME BASTA.', '¡NO TE METAS A MI MONTE!', 'SALTO MÁS LEJOS QUE TÚ.',
    '¡JA! ¿Y TÚ CON DOS PATAS TAN LENTO?', 'EL MONTE ES MÍO.',
  ],
  madremonte: [
    '¡NO TUMBES MIS ÁRBOLES!', 'EL MONTE ME HABLA...', 'CUIDA EL AGUA DE LA QUEBRADA.', 'HOJAS, RAMAS... ¡A ÉL!',
    '¿PEDISTE PERMISO PARA ENTRAR?', 'LOS BEJUCOS TE VAN A ENREDAR.',
  ],
  mohan: [
    'JE, JE, JE...', '¿VIENES POR MI ORO?', '¿TE TOCO UNA CANCIÓN EN EL TIPLE?', 'EL RÍO ES MI CASA.',
    'TRÁEME TABACO Y TE DEJO PESCAR.', '¡BLUB, BLUB!',
  ],
  hombrecaiman: [
    '¡GRRRR!', '¡SE VA EL CAIMÁN, SE VA EL CAIMÁN!', 'TENGO HAMBRE DE BOCACHICO.', '¡NO ME MIRES ASÍ!',
    'SOY MITAD HOMBRE, MITAD CAIMÁN.', '¡CHAPUZÓN!',
  ],
  bachue: [
    'SOY LA MADRE DE TODOS.', 'LA LAGUNA ES SAGRADA.', 'SSSSSS...', 'DEMUÉSTRAME TU VALOR.',
    'RESPETA LA TIERRA, PEQUEÑO.', 'EL AGUA RECUERDA TODO.',
  ],
  sombreron: [
    '¡MI SOMBRERO TE VA A ATRAPAR!', 'PÓRTATE BIEN...', 'TOC, TOC, LOS CASCOS DE MI CABALLO.', '¿A QUIÉN SE LE ESTÁ HACIENDO TARDE?',
    'MÁS GRANDE ES MI SOMBRERO.', 'JE, JE... TE ESTOY VIENDO.',
  ],
  muelona: [
    'JI, JI, JI...', '¡MIRA MIS DIENTES TAN BONITOS!', 'VEN, PAISITA, VEN...', '¿ME INVITAS A UN TINTO?',
    'SONRÍE, QUE YO TAMBIÉN SONRÍO.', '¡ÑAM, ÑAM!',
  ],
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

/** Frase al azar del luchador, evitando repetir la última que dijo. */
export function pickLine(id: FighterId, roll: number, last?: string): string {
  const lines = BANTER[id];
  let i = Math.floor(roll * lines.length) % lines.length;
  if (lines[i] === last) i = (i + 1) % lines.length;
  return lines[i];
}
