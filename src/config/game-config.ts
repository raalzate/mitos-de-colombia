/** Resolución interna fija: la ventana nunca altera reglas ni velocidades. */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 224;

/** Lógica a paso fijo de 60 Hz. */
export const LOGIC_FPS = 60;
export const LOGIC_STEP_MS = 1000 / LOGIC_FPS;

/** Arena */
export const ARENA_WIDTH = 560;
export const ARENA_MARGIN = 14;
export const GROUND_Y = 196;

/** Física (px por frame lógico) */
export const GRAVITY = 0.38;
export const MAX_FALL_SPEED = 7;

/** Partida */
export const ROUND_TIME_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 5;
export const MAX_HP = 100;
export const MAX_METER = 100;
export const ULTIMATE_COST = 100;

/** Reducción de daño al bloquear (fracción del daño original que sí entra). */
export const BLOCK_DAMAGE_FACTOR = 0.2;
export const MIN_CHIP_DAMAGE = 1;

/** Separación mínima entre luchadores (empuje de cuerpos). */
export const BODY_PUSH_DISTANCE = 22;

export const COLORS = {
  hpYellow: 0xf8e048,
  hpRed: 0xd82828,
  hpDamage: 0xf87858,
  meterBlue: 0x48a8f8,
  meterFull: 0xf8f8f8,
  hudFrame: 0x201818,
  hudBorder: 0xd8b070,
};
