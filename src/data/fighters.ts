import type { AttackDef, AttackKind, FighterId, FighterStats, SpecialSpec, UltimateSpec } from '../combat/CombatTypes';

/**
 * Datos de combate separados del comportamiento.
 * Frames = frames lógicos a 60 Hz. Cajas relativas a los pies (centro), mirando a la derecha.
 */

const base = (partial: Partial<AttackDef> & Pick<AttackDef, 'id' | 'name' | 'kind'>): AttackDef => ({
  startup: 4,
  active: 3,
  recovery: 8,
  damage: 5,
  hitstun: 14,
  blockstun: 8,
  knockback: 2,
  launch: 0,
  knockdown: false,
  blockable: true,
  hitbox: { x: 10, y: -44, w: 26, h: 12 },
  meterOnHit: 6,
  meterCost: 0,
  cooldown: 0,
  hitstop: 4,
  air: false,
  forwardStep: 0,
  ...partial,
});

/** Arquetipos de normales: pesado (lento, mucho daño), equilibrado y rápido (poco daño, veloz). */
type Archetype = 'heavy' | 'balanced' | 'fast';

const ARCH: Record<Archetype, { dmg: number; spd: number; reach: number; kb: number }> = {
  heavy: { dmg: 1.1, spd: 1.25, reach: 1.1, kb: 1.15 },
  balanced: { dmg: 1, spd: 1, reach: 1, kb: 1 },
  fast: { dmg: 0.9, spd: 0.8, reach: 0.92, kb: 0.9 },
};

function normals(prefix: string, arch: Archetype, names: [string, string, string, string]): Pick<Record<AttackKind, AttackDef>, 'light' | 'heavy' | 'lightkick' | 'heavykick'> {
  const a = ARCH[arch];
  const r = (n: number) => Math.round(n);
  const w = (n: number) => r(n * a.reach);
  return {
    light: base({
      id: `${prefix}_light`, name: names[0], kind: 'light',
      startup: r(4 * a.spd), active: 3, recovery: r(7 * a.spd),
      damage: r(5 * a.dmg), hitstun: 13, blockstun: 7, knockback: 1.6 * a.kb,
      hitbox: { x: 10, y: -50, w: w(26), h: 12 }, air: true,
    }),
    heavy: base({
      id: `${prefix}_heavy`, name: names[1], kind: 'heavy',
      startup: r(9 * a.spd), active: 4, recovery: r(15 * a.spd),
      damage: r(10 * a.dmg), hitstun: 20, blockstun: 12, knockback: 3.2 * a.kb,
      hitbox: { x: 10, y: -58, w: w(30), h: 22 }, meterOnHit: 10, hitstop: 7, forwardStep: 0.7,
    }),
    lightkick: base({
      id: `${prefix}_lkick`, name: names[2], kind: 'lightkick',
      startup: r(5 * a.spd), active: 4, recovery: r(8 * a.spd),
      damage: r(6 * a.dmg), hitstun: 14, blockstun: 8, knockback: 2 * a.kb,
      hitbox: { x: 10, y: -26, w: w(30), h: 12 }, air: true,
    }),
    heavykick: base({
      id: `${prefix}_hkick`, name: names[3], kind: 'heavykick',
      startup: r(10 * a.spd), active: 5, recovery: r(17 * a.spd),
      damage: r(11 * a.dmg), hitstun: 22, blockstun: 13, knockback: 3.6 * a.kb,
      knockdown: true, hitbox: { x: 8, y: -40, w: w(36), h: 16 }, meterOnHit: 10, hitstop: 7,
    }),
  };
}

/** Plantillas de ataques especiales por tipo. */
const S = {
  strikeMid: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special1', startup: 12, active: 7, recovery: 20, damage: 10, hitstun: 22, blockstun: 14, knockback: 4,
      hitbox: { x: 14, y: -30, w: 78, h: 22 }, meterOnHit: 12, cooldown: 70, hitstop: 6, ...extra }),
  dash: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special1', startup: 8, active: 10, recovery: 18, damage: 11, hitstun: 22, blockstun: 12, knockback: 3.5,
      hitbox: { x: 6, y: -54, w: 34, h: 40 }, meterOnHit: 12, cooldown: 80, hitstop: 6, forwardStep: 4.5, ...extra }),
  ring: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special2', startup: 14, active: 6, recovery: 22, damage: 7, hitstun: 30, blockstun: 16, knockback: 5,
      hitbox: { x: -48, y: -70, w: 96, h: 70 }, meterOnHit: 10, cooldown: 150, hitstop: 5, ...extra }),
  projectile: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special1', startup: 14, active: 1, recovery: 22, damage: 8, hitstun: 20, blockstun: 12, knockback: 3.5,
      hitbox: null, meterOnHit: 12, cooldown: 60, hitstop: 5, ...extra }),
  eruption: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special2', startup: 24, active: 8, recovery: 22, damage: 14, hitstun: 26, blockstun: 16, knockback: 2.5,
      launch: -5.5, knockdown: true, hitbox: { x: -18, y: -60, w: 36, h: 60 }, meterOnHit: 14, cooldown: 170, hitstop: 8, ...extra }),
  teleport: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'special2', startup: 6, active: 14, recovery: 8, damage: 0, hitstun: 0, blockstun: 0, knockback: 0,
      hitbox: null, meterOnHit: 0, cooldown: 130, hitstop: 0, air: true, ...extra }),
  ultimate: (id: string, name: string, extra: Partial<AttackDef> = {}): AttackDef =>
    base({ id, name, kind: 'ultimate', startup: 13, active: 10, recovery: 25, damage: 30, hitstun: 40, blockstun: 0, knockback: 7,
      launch: -6, knockdown: true, blockable: false, hitbox: { x: 8, y: -56, w: 88, h: 56 }, meterOnHit: 0, meterCost: 100, cooldown: 0, hitstop: 0, ...extra }),
};

interface Def {
  id: FighterId;
  name: string;
  title: string;
  description: string;
  arch: Archetype;
  walkSpeed: number;
  backSpeed: number;
  jumpForce: number;
  weight: number;
  height: number; // altura de hurtbox de pie
  normals: [string, string, string, string];
  s1: AttackDef;
  s1spec: SpecialSpec;
  s2: AttackDef;
  s2spec: SpecialSpec;
  ult: AttackDef;
  ultSpec: UltimateSpec;
}

function build(d: Def): FighterStats {
  const hw = d.height >= 64 ? 11 : 10;
  const s2 = { ...d.s2, kind: 'special2' as const };
  const s1 = { ...d.s1, kind: 'special1' as const };
  return {
    id: d.id,
    name: d.name,
    title: d.title,
    description: d.description,
    walkSpeed: d.walkSpeed,
    backSpeed: d.backSpeed,
    jumpForce: d.jumpForce,
    weight: d.weight,
    hurtStand: { x: -hw, y: -d.height, w: hw * 2, h: d.height },
    hurtCrouch: { x: -hw, y: -Math.round(d.height * 0.64), w: hw * 2, h: Math.round(d.height * 0.64) },
    hurtAir: { x: -hw + 1, y: -d.height + 6, w: hw * 2 - 2, h: d.height - 14 },
    pushBox: { x: -hw, y: -d.height + 6, w: hw * 2, h: d.height - 6 },
    attacks: { ...normals(d.id.slice(0, 3), d.arch, d.normals), special1: s1, special2: s2, ultimate: d.ult },
    special1: d.s1spec,
    special2: d.s2spec,
    ultimateSpec: d.ultSpec,
  };
}

const DEFS: Def[] = [
  {
    id: 'madremonte', name: 'LA MADREMONTE', title: 'Guardiana del monte',
    description: 'Fuerza y control del espacio. Raíces de alcance medio.',
    arch: 'heavy', walkSpeed: 1.25, backSpeed: 1.0, jumpForce: -7.4, weight: 1.1, height: 66,
    normals: ['Zarpazo', 'Mazo de tronco', 'Patada de raíz', 'Barrido de ceiba'],
    s1: S.strikeMid('mm_roots', 'Latigazo de raíces'),
    s1spec: { type: 'strike', short: 'LATIGAZO', fx: 'fx_rootwhip', tint: 0xffffff, sound: 'roots', particle: 'leaf' },
    s2: S.eruption('mm_fury', 'Furia del bosque'),
    s2spec: { type: 'eruption', short: 'FURIA', fx: 'fx_eruption', tint: 0xffffff, sound: 'bloom', particle: 'leaf' },
    ult: S.ultimate('mm_judgement', 'Juicio de la selva'),
    ultSpec: { style: 'bloom', short: 'JUICIO', tint: 0xffffff, particle: 'leaf', sound: 'bloom' },
  },
  {
    id: 'patasola', name: 'LA PATASOLA', title: 'Terror de la espesura',
    description: 'Veloz y feroz. Salta sobre su única pierna y desgarra.',
    arch: 'fast', walkSpeed: 1.7, backSpeed: 1.3, jumpForce: -8.2, weight: 0.85, height: 62,
    normals: ['Garra', 'Desgarro', 'Patada única', 'Salto de pata'],
    s1: S.dash('pa_claw', 'Zarpazo sangriento', { damage: 14, cooldown: 70 }),
    s1spec: { type: 'strike', short: 'ZARPAZO', fx: 'fx_slash', tint: 0xff4060, sound: 'slash', particle: 'spark' },
    s2: S.ring('pa_scream', 'Grito del monte'),
    s2spec: { type: 'strike', short: 'GRITO', fx: 'fx_ring', tint: 0xff80a0, sound: 'scream', particle: 'none' },
    ult: S.ultimate('pa_hunt', 'Cacería nocturna', { hitbox: { x: 6, y: -56, w: 70, h: 56 } }),
    ultSpec: { style: 'slash', short: 'CACERÍA', tint: 0xff4060, particle: 'spark', sound: 'slash' },
  },
  {
    id: 'hombrecaiman', name: 'EL HOMBRE CAIMÁN', title: 'Bestia del Magdalena',
    description: 'Pesado y letal de cerca. Mordidas y coletazos.',
    arch: 'heavy', walkSpeed: 1.2, backSpeed: 0.95, jumpForce: -7.2, weight: 1.2, height: 66,
    normals: ['Garra escamosa', 'Mandíbula', 'Coletazo', 'Cola de caimán'],
    s1: S.dash('hc_bite', 'Mordida del río', { damage: 14, startup: 10, forwardStep: 3.5, hitbox: { x: 8, y: -52, w: 36, h: 30 } }),
    s1spec: { type: 'strike', short: 'MORDIDA', fx: 'fx_slash', tint: 0x80e060, sound: 'heavy', particle: 'drop' },
    s2: S.teleport('hc_dive', 'Inmersión', { cooldown: 140 }),
    s2spec: { type: 'teleport', short: 'INMERSIÓN', fx: 'fx_mist', tint: 0x60a0ff, sound: 'wave', particle: 'drop', distance: 120 },
    ult: S.ultimate('hc_drag', 'Arrastre al fondo'),
    ultSpec: { style: 'vortex', short: 'ARRASTRE', tint: 0x80e0a0, particle: 'drop', sound: 'vortex' },
  },
  {
    id: 'llorona', name: 'LA LLORONA', title: 'Alma en pena del río',
    description: 'Zona y castigo. Lamentos que cruzan la arena y lágrimas que brotan.',
    arch: 'balanced', walkSpeed: 1.3, backSpeed: 1.1, jumpForce: -7.6, weight: 0.9, height: 64,
    normals: ['Palma helada', 'Abrazo frío', 'Velo', 'Giro del velo'],
    s1: S.projectile('ll_wail', 'Lamento', { damage: 9, cooldown: 70 }),
    s1spec: { type: 'projectile', short: 'LAMENTO', fx: 'fx_orb', tint: 0xc0e8ff, sound: 'scream', particle: 'drop', speed: 2.6, life: 160, offsetY: -34 },
    s2: S.eruption('ll_tears', 'Lágrimas del río', { damage: 12 }),
    s2spec: { type: 'eruption', short: 'LÁGRIMAS', fx: 'fx_geyser', tint: 0x80c8ff, sound: 'wave', particle: 'drop' },
    ult: S.ultimate('ll_grief', 'Llanto eterno'),
    ultSpec: { style: 'storm', short: 'LLANTO', tint: 0xa0d8ff, particle: 'drop', sound: 'scream' },
  },
  {
    id: 'sombreron', name: 'EL SOMBRERÓN', title: 'Jinete de la noche',
    description: 'Engaño y sombra. Se desvanece y azota con su látigo.',
    arch: 'balanced', walkSpeed: 1.45, backSpeed: 1.15, jumpForce: -7.8, weight: 0.95, height: 66,
    normals: ['Bofetón', 'Golpe de sombrero', 'Espuela', 'Patada del jinete'],
    s1: S.strikeMid('so_whip', 'Látigo de sombra', { hitbox: { x: 14, y: -44, w: 86, h: 16 }, damage: 9, startup: 11 }),
    s1spec: { type: 'strike', short: 'LÁTIGO', fx: 'fx_whip', tint: 0x9060c0, sound: 'slash', particle: 'none' },
    s2: S.teleport('so_shadow', 'Paso de sombra', { cooldown: 110 }),
    s2spec: { type: 'teleport', short: 'SOMBRA', fx: 'fx_mist', tint: 0x503070, sound: 'mist', particle: 'none', distance: 110 },
    ult: S.ultimate('so_ride', 'Cabalgata maldita'),
    ultSpec: { style: 'slash', short: 'CABALGATA', tint: 0x9060c0, particle: 'spark', sound: 'slash' },
  },
  {
    id: 'mohan', name: 'EL MOHÁN', title: 'Señor de las aguas',
    description: 'Velocidad y engaño. Proyectiles y niebla.',
    arch: 'fast', walkSpeed: 1.55, backSpeed: 1.2, jumpForce: -7.9, weight: 0.9, height: 62,
    normals: ['Garra de río', 'Golpe de anzuelo', 'Coletazo', 'Patada de remolino'],
    s1: S.projectile('mo_wave', 'Oleada del Magdalena', { damage: 9 }),
    s1spec: { type: 'projectile', short: 'OLEADA', fx: 'fx_wave', tint: 0xffffff, sound: 'wave', particle: 'drop', speed: 3.2, life: 140, offsetY: 0 },
    s2: S.teleport('mo_mist', 'Niebla encantada'),
    s2spec: { type: 'teleport', short: 'NIEBLA', fx: 'fx_mist', tint: 0xffffff, sound: 'mist', particle: 'drop', distance: 110 },
    ult: S.ultimate('mo_abyss', 'Abismo del río', { hitbox: { x: 6, y: -56, w: 92, h: 56 } }),
    ultSpec: { style: 'vortex', short: 'ABISMO', tint: 0xffffff, particle: 'drop', sound: 'vortex' },
  },
  {
    id: 'muelona', name: 'LA MUELONA', title: 'Sonrisa devoradora',
    description: 'Agresiva. Sus mordiscos le devuelven vida.',
    arch: 'balanced', walkSpeed: 1.5, backSpeed: 1.2, jumpForce: -7.7, weight: 0.9, height: 64,
    normals: ['Arañazo', 'Dentellada', 'Taconazo', 'Patada voraz'],
    s1: S.dash('mu_bite', 'Mordisco', { damage: 11, startup: 9, forwardStep: 4 }),
    s1spec: { type: 'strike', short: 'MORDISCO', fx: 'fx_slash', tint: 0xff2040, sound: 'heavy', particle: 'spark', drain: 0.6 },
    s2: S.ring('mu_laugh', 'Risa macabra'),
    s2spec: { type: 'strike', short: 'RISA', fx: 'fx_ring', tint: 0xff6080, sound: 'scream', particle: 'none' },
    ult: S.ultimate('mu_feast', 'Festín de dientes'),
    ultSpec: { style: 'bloom', short: 'FESTÍN', tint: 0xff3050, particle: 'spark', sound: 'heavy' },
  },
  {
    id: 'silbon', name: 'EL SILBÓN', title: 'El que silba en la llanura',
    description: 'Distancia. Silbidos que viajan y huesos que caen.',
    arch: 'fast', walkSpeed: 1.4, backSpeed: 1.2, jumpForce: -7.6, weight: 0.85, height: 68,
    normals: ['Manotazo', 'Golpe de saco', 'Patada larga', 'Patada de zancudo'],
    s1: S.projectile('si_whistle', 'Silbido', { damage: 7, cooldown: 50, startup: 12 }),
    s1spec: { type: 'projectile', short: 'SILBIDO', fx: 'fx_ring', tint: 0xe0ffe0, sound: 'whistle', particle: 'none', speed: 3.8, life: 130, offsetY: -40 },
    s2: S.eruption('si_bones', 'Lluvia de huesos', { damage: 12, startup: 22 }),
    s2spec: { type: 'eruption', short: 'HUESOS', fx: 'fx_bones', tint: 0xffffff, sound: 'bolt', particle: 'spark' },
    ult: S.ultimate('si_sack', 'Saco de huesos'),
    ultSpec: { style: 'storm', short: 'SACO', tint: 0xf0f0e0, particle: 'spark', sound: 'bolt' },
  },
  {
    id: 'juanmachete', name: 'JUAN MACHETE', title: 'El que pactó con el diablo',
    description: 'Pesado. Machetazos y llamaradas infernales.',
    arch: 'heavy', walkSpeed: 1.2, backSpeed: 1.0, jumpForce: -7.3, weight: 1.15, height: 66,
    normals: ['Puño de hacendado', 'Machetazo corto', 'Patada de bota', 'Patada de potro'],
    s1: S.strikeMid('jm_slash', 'Machetazo', { hitbox: { x: 12, y: -56, w: 56, h: 40 }, damage: 12, startup: 11, recovery: 18 }),
    s1spec: { type: 'strike', short: 'MACHETE', fx: 'fx_slash', tint: 0xffe0a0, sound: 'slash', particle: 'spark' },
    s2: S.eruption('jm_flame', 'Llamarada', { damage: 13 }),
    s2spec: { type: 'eruption', short: 'LLAMA', fx: 'fx_flame', tint: 0xff8020, sound: 'fire', particle: 'ember' },
    ult: S.ultimate('jm_hell', 'Pacto infernal'),
    ultSpec: { style: 'storm', short: 'PACTO', tint: 0xff6010, particle: 'ember', sound: 'fire' },
  },
  {
    id: 'bachue', name: 'BACHUÉ', title: 'Madre de la laguna',
    description: 'Equilibrio. Serpientes de agua y manantiales que lanzan.',
    arch: 'balanced', walkSpeed: 1.35, backSpeed: 1.1, jumpForce: -7.6, weight: 0.95, height: 64,
    normals: ['Palma de agua', 'Golpe de caracol', 'Patada de orilla', 'Patada de laguna'],
    s1: S.projectile('ba_snake', 'Serpiente de agua', { damage: 9 }),
    s1spec: { type: 'projectile', short: 'SERPIENTE', fx: 'fx_orb', tint: 0x40e0c0, sound: 'wave', particle: 'drop', speed: 3.0, life: 150, offsetY: -22 },
    s2: S.eruption('ba_spring', 'Manantial', { damage: 12, launch: -6.5 }),
    s2spec: { type: 'eruption', short: 'MANANTIAL', fx: 'fx_geyser', tint: 0x40e0c0, sound: 'wave', particle: 'drop' },
    ult: S.ultimate('ba_lagoon', 'Abrazo de la laguna'),
    ultSpec: { style: 'vortex', short: 'LAGUNA', tint: 0x40e0c0, particle: 'drop', sound: 'vortex' },
  },
];

export const FIGHTERS: Record<FighterId, FighterStats> = Object.fromEntries(DEFS.map((d) => [d.id, build(d)])) as Record<FighterId, FighterStats>;

export const FIGHTER_IDS: FighterId[] = DEFS.map((d) => d.id);

/** Indicación corta de habilidades para el HUD. */
export function specialHint(id: FighterId, specialKey: string, ultKey: string): string {
  const f = FIGHTERS[id];
  return `${specialKey}:${f.special1.short} ABAJO+${specialKey}:${f.special2.short} ${ultKey}:${f.ultimateSpec.short}`;
}
