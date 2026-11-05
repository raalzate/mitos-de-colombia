import type { AdventureState } from './State';
import type { Npc } from './World';
import { STORIES, type StoryId } from './Stories';

/**
 * La gente se acuerda de Juan (FR-032): la primera vez le dice todo lo que tiene que decir; las siguientes,
 * algo cortico que se acuerda de lo que ya hablaron, la frase que le faltaba oír o un recordatorio de la pista.
 * La memoria va en la partida guardada, sobrevive al cambiar de mapa y se borra con la partida nueva. Puro, sin Phaser.
 */

/** Quién es quién: el mismo nombre en otro mapa es otra persona. */
export const talkKey = (map: string, name: string) => `${map}:${name}`;

const memo = (s: AdventureState) => (s.talked ??= {});

/** Veces que Juan ya le habló a alguien (o que ya oyó un tema). */
export function timesTalked(s: AdventureState, key: string): number {
  return memo(s)[key] ?? 0;
}

/** Anota una conversación más y devuelve cuántas iban antes. */
export function markTalked(s: AdventureState, key: string): number {
  const before = timesTalked(s, key);
  memo(s)[key] = before + 1;
  return before;
}

/**
 * ¿Es la primera vez que Juan oye este tema? Lo deja anotado. Los temas que cambian con el progreso
 * llevan el progreso en el nombre («abuela:ronda:3»): la información nueva se cuenta una vez.
 */
export function firstTime(s: AdventureState, topic: string): boolean {
  return markTalked(s, `tema:${topic}`) === 0;
}

/** Primera oración de un parlamento, con su puntuación: para recordar sin repetir el discurso entero. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?(?:\.\.\.|[.!?])(?=\s|$)/);
  return (m ? m[0] : text).trim();
}

/** Lo que suena a pista (mitos, espíritus y sus sitios): eso se recuerda; lo demás no hace falta repetirlo. */
const HINT = /SILB|LLORONA|LLORAR|PATASOLA|MADREMONTE|MOH[AÁ]N|CAIM[AÁ]N|BACHU[EÉ]|SOMBRER|MUELONA|DIENTE|SEÑORA|DUENDE|POLLO|MANO PELUDA|ESPANTO|SEÑAL|HUESOS|HUELLAS|ESCAMAS|(?:^|[^A-ZÁÉÍÓÚÑ])ORO(?:[^A-ZÁÉÍÓÚÑ]|$)/;

/** Frases de pista que alguien ya le dijo a Juan. */
export function hintLines(npc: Npc): string[] {
  return (npc.lines ?? []).flat().filter((l) => HINT.test(l));
}

const KIDS = new Set<string>(['nina', 'nino']);

/** Saludo corto de quien ya habló con Juan, sin pista que recordar. */
function greeting(npc: Npc, n: number, story?: StoryId): string {
  const kid = KIDS.has(npc.key);
  const title = story ? STORIES[story].title : '';
  const opts = kid
    ? [`¡OTRA VEZ USTED! YA LE CONTÉ TODO, SEÑOR. ${title ? `¿LE GUSTÓ LO DE ${title}?` : '¡NO SEA CANSÓN!'}`, '¡HOLA OTRA VEZ, SEÑOR! YA HABLAMOS HACE UN RATICO.']
    : title
      ? [`YA LE CONTÉ LO DE ${title}, MIJO. ¿QUÉ MÁS SE LE OFRECE?`, `¿OTRA VEZ POR AQUÍ, MIJO? LO DE ${title} YA SE LO CONTÉ TODITO.`]
      : ['¡QUIUBO OTRA VEZ, MIJO! YA LE DIJE LO QUE SABÍA.', 'YA HABLAMOS HACE UN RATICO, MIJO. ¡QUE LE VAYA BONITO!'];
  return opts[n % opts.length];
}

/**
 * Lo que dice un aldeano la vez número `heard` (0 = la primera). Mientras le queden frases nuevas, dice la
 * siguiente que Juan no ha oído; cuando ya se las dijo todas, un acuse corto que se acuerda de la conversación
 * y, si dio una pista, se la recuerda en una línea.
 */
export function villagerLines(npc: Npc, heard: number, storyTold?: StoryId): { lines: string[]; fresh: boolean } {
  const all = npc.lines ?? [];
  if (heard < all.length) return { lines: all[heard], fresh: true };
  const n = heard - all.length;
  const hints = hintLines(npc);
  if (hints.length) {
    const h = firstSentence(hints[n % hints.length]);
    return { lines: [`${KIDS.has(npc.key) ? 'YA LE DIJE, SEÑOR' : 'COMO YA LE DIJE, MIJO'}: «${h}» ¡NO SE LE OLVIDE!`], fresh: false };
  }
  return { lines: [greeting(npc, n, storyTold)], fresh: false };
}

/** Si otro ya le contó a Juan esta historia, no se la vuelven a contar entera: una línea y listo. */
export function storyAgain(story: StoryId): string {
  return `¿YA LE CONTARON LO DE ${STORIES[story].title}? PUES ASÍ MISMITO FUE, MIJO. ¡NO LE AGREGO NADA!`;
}
