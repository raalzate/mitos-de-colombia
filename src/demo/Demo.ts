/**
 * Modo demostración (`?demo`): el juego se juega solo, de la presentación al final, para grabarlo en video.
 * Juan pelea con la IA, los mitos no se vuelan y todo va un poco más rápido. La partida va aparte de la del jugador.
 */
export const DEMO = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

/** En la demo Juan anda más ligero (fotogramas por casilla). */
export const DEMO_WALK_FRAMES = 8;
/** Ritmo de los sustos en la demo: menos espera entre uno y otro. */
export const DEMO_AMBUSH_GAP_MS = 3_000;
export const DEMO_OMEN_GAP_MS = 15_000;
/** En la demo la gente da pistas desde el principio y más seguido, para que se vea. */
export const DEMO_HINT_GAP_MS = 14_000;
export const DEMO_HINT_CHANCE = 0.35;
export const DEMO_HINT_RADIUS = 7;
/** Lo que aguanta cada uno en la pelea: Juan recibe menos daño y pega más duro. */
export const DEMO_HERO_DAMAGE = 0.5;
export const DEMO_MYTH_DAMAGE = 1.6;
/** Fotogramas de pelea antes de que el mito se meta al fondo del escenario (una vez por pelea). */
export const DEMO_LURK_AFTER = 150;
/** La demo arranca una sola partida: al volver al menú tras el final, se queda ahí. */
export const demoRun = { started: false };
