import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx, type SfxName } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, inputManager, toggleFullscreen } from '../utils/game';
import { addPixmap, addSheet } from '../utils/textures';
import { drawnAnimKey } from '../art/DrawnAnim';
import { FIGHTERS } from '../data/fighters';
import type { FighterId } from '../combat/CombatTypes';
import { DialogBox } from '../adventure/DialogBox';
import {
  GUARDIANS, HERO_FIGHTER, LLORONA_EVENT_Y, PESCADOR_REFUGIO, RUSTLE_RATE, SPIRITS,
  STEP, inRect, walkable, type Cell, type Dir, type Guardian, type Mood, type Npc, type Spirit,
} from '../adventure/World';
import {
  areaIn, soundIn, buildingFootprint, buildingName, doorCell, getMap, interiorOf, moodIn, propFootprint,
  type GameMap, type MapBuilding, type MapProp, type Sound,
} from '../adventure/Maps';
import { STORIES, STORY_IDS } from '../adventure/Stories';
import {
  allCalmed, applyOutcome, clearAdventure, fightDifficulty, loadAdventure, newAdventure, saveAdventure,
  type AdventureFight, type AdventureState, type FightOutcome,
} from '../adventure/State';
import {
  GLIMPSE_MAX, GLIMPSE_MIN, HEAR_RADIUS, ambushChance, dist, popSpot, relocate, spawnHidden, vanishChance, wander, zoneCells, type Hidden,
} from '../adventure/Hunt';
import { getSettings, setSettings } from '../utils/game';
import {
  buildBridge, buildBubble, buildFlowers, buildShadow, buildSign, buildTallGrass, buildTree, buildWater,
} from '../adventure/OverworldArt';
import {
  BUILDING_FOOTPRINT, PROP_FOOTPRINT, SPIRIT_FRAMES, buildBuilding, buildClue, buildProp, buildSpirit, buildVillager,
  buildingLights, propLights, type BuildingKind, type PropKind, type SpiritKind, type VillagerKind,
} from '../adventure/TownArt';
import {
  CITY_BUILDING_FOOTPRINT, CITY_PROP_FOOTPRINT, buildCityBuilding, buildCityGround, buildCityProp, cityBuildingLights, cityPropLights,
  type CityBuildingKind, type CityGround, type CityPropKind,
} from '../adventure/CityArt';
import {
  FURNITURE_FOOTPRINT, WALL_HUNG, buildBackWall, buildDoorMat, buildFloor, buildFurniture, buildWallEdge, furnitureLights, type FurnitureKind,
} from '../adventure/InteriorArt';
import { buildDog } from '../adventure/OverworldArt';

/** Cada baldosa de 16 px del tileset se pinta al doble: los personajes de 48 px quedan a escala. */
const CELL = 32;
const WALK_FRAMES = 14;
const HERO_FRAMES: Record<Dir, { walk: number; idle: number; flip: boolean }> = {
  down: { walk: 0, idle: 12, flip: false },
  right: { walk: 4, idle: 13, flip: false },
  left: { walk: 4, idle: 13, flip: true },
  up: { walk: 8, idle: 14, flip: false },
};
const NPC_FRAME: Record<Dir, { f: number; flip: boolean }> = {
  down: { f: 0, flip: false }, right: { f: 1, flip: false }, left: { f: 1, flip: true }, up: { f: 2, flip: false },
};
const DIR_KEYS: [Dir, string[]][] = [['up', MENU_KEYS.up], ['down', MENU_KEYS.down], ['left', MENU_KEYS.left], ['right', MENU_KEYS.right]];
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Noche cerrada: azul muy oscuro encima de todo, con la luz del farol de Juan, faroles y ventanas recortados. */
const NIGHT_COLOR = 0x040818;
const LANTERN_R = 92;
const DEPTH_NIGHT = 3000;

export const VILLAGER_KINDS: VillagerKind[] = ['cantinero', 'cura', 'borracho', 'nina', 'arriero', 'vendedora', 'campesina', 'policia', 'cafetero', 'nino'];
export const SPIRIT_KINDS: SpiritKind[] = ['duende', 'pollo', 'mano'];

/** Lo que se oye cuando un mito anda cerca sin dejarse ver */
const MYTH_SOUND: Record<FighterId, SfxName> = {
  silbon: 'whistle', llorona: 'distantScream', patasola: 'land', madremonte: 'creak', mohan: 'wave',
  hombrecaiman: 'mist', bachue: 'mist', sombreron: 'whisper', muelona: 'whisper', juanmachete: 'whisper',
};
/** Los mitos del mapa usan el dibujo de la pelea (72 px): se achican para que queden un poco más altos que Juan. */
const MYTH_MAP_SCALE = 0.72;
/** Gente de la ciudad que no tiene hoja propia todavía: se dibuja como el aldeano más parecido. */
const NPC_FALLBACK: Record<string, VillagerKind> = { conductor: 'arriero', silletero: 'cafetero', acordeonero: 'arriero', bailarina: 'vendedora', rapero: 'nino' };
const CITY_GROUND: Partial<Record<Cell, CityGround>> = { a: 'asfalto', d: 'anden', z: 'cebra', l: 'ladrillo', o: 'adoquin', '.': 'grama', '=': 'tierra_roja' };

const SPIRIT_SCALE: Record<SpiritKind, number> = { duende: 0.72, pollo: 0.8, mano: 1 };
const SPIRIT_SOUND: Record<SpiritKind, SfxName> = { duende: 'duende', pollo: 'polloMaligno', mano: 'manoPeluda' };

const feetX = (cx: number) => cx * CELL + CELL / 2;
const feetY = (cy: number) => cy * CELL + CELL - 3;
const key = (x: number, y: number) => `${x},${y}`;

interface NpcView { npc: Npc; x: number; y: number; home: [number, number]; facing: Dir; sprite: Phaser.GameObjects.Sprite; scared: boolean; talks: number }
interface HiddenView { h: Hidden; g: Guardian }
interface SpiritView { s: Spirit; x: number; y: number; sprite: Phaser.GameObjects.Sprite; shown: boolean; steps: number; cooldown: number; procedural: boolean }
interface Light { x: number; y: number; r: number; flicker: number }

export class AdventureScene extends Phaser.Scene {
  private st!: AdventureState;
  private gm!: GameMap;
  private map: Cell[][] = [];
  private dog!: Phaser.GameObjects.Sprite;
  private dogAt = { x: 0, y: 0, facing: 'down' as Dir };
  private trains: Phaser.GameObjects.Image[] = [];
  private blinkers: { img: Phaser.GameObjects.Image; base: string }[] = [];
  private lightImg!: Phaser.GameObjects.Image;
  private darkness = 0.8;
  private soundNow: Sound | '' = '';
  private menu = new MenuInput();
  private dialog!: DialogBox;
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Image;
  private grassFront!: Phaser.GameObjects.Image;
  private npcs: NpcView[] = [];
  private hidden: HiddenView[] = [];
  private spirits: SpiritView[] = [];
  private clues = new Map<string, Phaser.GameObjects.Image>();
  private seenClues = new Set<FighterId>();
  private waters: { img: Phaser.GameObjects.Image; top: boolean; bottom: boolean }[] = [];
  private tallGrass = new Map<string, Phaser.GameObjects.Image>();
  private lamps: Light[] = [];
  private night!: Phaser.GameObjects.RenderTexture;
  private eyes!: Phaser.GameObjects.Container;
  private moving = false;
  private from = { x: 0, y: 0 };
  private progress = 0;
  private steps = 0;
  private turnDelay = 0;
  private locked = false;
  private frame = 0;
  private area = '';
  private areaLabel!: Phaser.GameObjects.Container;
  private rnd = Math.random;

  constructor() {
    super('AdventureScene');
  }

  create(data: { fresh?: boolean; outcome?: FightOutcome; arrive?: 'car' | 'door' }): void {
    this.st = (this.registry.get('adventure') as AdventureState | undefined) ?? (data.fresh ? null : loadAdventure()) ?? newAdventure();
    if (data.fresh) this.st = newAdventure();
    const fight = this.registry.get('adventureFight') as AdventureFight | undefined;
    this.registry.remove('adventureFight');
    if (fight && data.outcome) {
      if (data.outcome === 'lose') clearAdventure();
      this.st = applyOutcome(this.st, fight, data.outcome);
      if (data.outcome !== 'lose') saveAdventure(this.st);
    }
    this.registry.set('adventure', this.st);
    this.menu = new MenuInput();
    this.moving = false;
    this.locked = false;
    this.npcs = [];
    this.hidden = [];
    this.spirits = [];
    this.waters = [];
    this.lamps = [];
    this.trains = [];
    this.blinkers = [];
    this.tallGrass.clear();
    this.clues.clear();
    this.area = '';
    this.soundNow = '';
    sfx.setTension(0);

    this.gm = getMap(this.st.map);
    this.map = this.gm.grid;
    this.ensureTextures();
    this.buildGround();
    this.buildObjects();
    this.buildActors();
    this.buildNight();

    const mw = this.map[0].length * CELL, mh = this.map.length * CELL;
    // los cuartos pequeños quedan centrados en la pantalla
    const ox = Math.min(0, (mw - GAME_WIDTH) / 2), oy = Math.min(0, (mh - GAME_HEIGHT + 40) / 2);
    this.cameras.main.setBounds(ox, oy, Math.max(mw, GAME_WIDTH), Math.max(mh, GAME_HEIGHT - 40)).setBackgroundColor(this.gm.kind === 'interior' ? '#0a0806' : '#0c2414');
    this.cameras.main.startFollow(this.hero, true, 1, 1, 0, 20);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.dialog = new DialogBox(this);
    this.areaLabel = this.add.container(0, 0).setScrollFactor(0).setDepth(4000);
    this.updateMood();

    if (fight && data.outcome) void this.afterFight(fight, data.outcome);
    else if (!this.st.flags.includes('intro')) void this.intro();
    else if (data.arrive === 'car') void this.arriveByCar();
    else this.showArea();
  }

  // ---------------------------------------------------------------- recursos

  private ensureTextures(): void {
    const add = (k: string, pm: Parameters<typeof addPixmap>[2]) => { if (!this.textures.exists(k)) addPixmap(this, k, pm); };
    for (const f of [0, 1]) {
      add(`av_tall_${f}`, buildTallGrass(f));
      for (const t of [false, true]) for (const b of [false, true]) add(`av_water_${f}_${+t}${+b}`, buildWater(f, t, b));
    }
    add('av_bridge', buildBridge());
    add('av_flowers', buildFlowers());
    add('av_sign', buildSign());
    add('av_bubble_1', buildBubble('!'));
    add('av_bubble_2', buildBubble('!!'));
    add('av_bubble_3', buildBubble('...'));
    add('av_shadow', buildShadow(26));
    add('av_shadow_big', buildShadow(44));
    if (!this.textures.exists('av_tree')) add('av_tree', buildTree());
    for (const k of Object.keys(BUILDING_FOOTPRINT) as BuildingKind[]) add(`av_b_${k}`, buildBuilding(k));
    for (const k of Object.keys(PROP_FOOTPRINT) as PropKind[]) add(`av_p_${k}`, buildProp(k));
    for (const k of Object.keys(CITY_BUILDING_FOOTPRINT) as CityBuildingKind[]) add(`av_cb_${k}`, buildCityBuilding(k));
    for (const k of Object.keys(CITY_PROP_FOOTPRINT) as CityPropKind[]) for (const f of [0, 1]) add(`av_cp_${k}_${f}`, buildCityProp(k, f));
    for (const k of Object.keys(FURNITURE_FOOTPRINT) as FurnitureKind[]) for (const f of [0, 1]) add(`av_fu_${k}_${f}`, buildFurniture(k, f));
    for (const g of GUARDIANS) for (const f of [0, 1]) add(`av_clue_${g.clue}_${f}`, buildClue(g.clue, f));
    for (const v of VILLAGER_KINDS) if (!this.textures.exists(`av_${v}`)) addSheet(this, `av_${v}`, buildVillager(v), 48, 48);
    for (const s of SPIRIT_KINDS) if (!this.textures.exists(`av_spirit_${s}`)) addSheet(this, `av_spirit_${s}`, buildSpirit(s), 48, 48);
    if (!this.textures.exists('av_perro')) addSheet(this, 'av_perro', buildDog(), 48, 48);
    if (!this.textures.exists('av_mat')) add('av_mat', buildDoorMat());
    if (!this.textures.exists('av_light')) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('av_light', c);
    }
  }

  private isPath(x: number, y: number): boolean {
    const c = this.map[y]?.[x];
    return c === '=' || c === 'B';
  }

  private buildGround(): void {
    const W = this.map[0].length, H = this.map.length;
    const rt = this.add.renderTexture(0, 0, W * 16, H * 16).setOrigin(0).setScale(2).setDepth(-10000);
    if (this.gm.kind === 'interior') this.drawRoom(rt);
    else if (this.gm.kind === 'ciudad') this.drawCity(rt);
    else this.drawCampo(rt);
    const isWater = (x: number, y: number) => { const c = this.map[y]?.[x]; return c === '~' || c === 'B'; };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = this.map[y][x];
        if (c === '~') {
          const top = !isWater(x, y - 1);
          const bottom = !isWater(x, y + 1);
          const img = this.add.image(x * CELL, y * CELL, `av_water_0_${+top}${+bottom}`).setOrigin(0).setScale(2).setDepth(-9000);
          this.waters.push({ img, top, bottom });
        }
        if (c === '"') {
          const img = this.add.image(x * CELL, y * CELL, 'av_tall_0').setOrigin(0).setScale(2).setDepth(-8000);
          this.tallGrass.set(key(x, y), img);
        }
      }
    }
  }

  /** Suelo de hierba y camino con el tileset Wang de PixelLab (esquinas: camino si lo tocan dos casillas de camino). */
  private drawCampo(rt: Phaser.GameObjects.RenderTexture): void {
    const vertex = (vx: number, vy: number) => {
      let n = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (this.isPath(vx + dx, vy + dy)) n++;
      return n >= 2 ? 1 : 0;
    };
    const hasTiles = this.textures.exists('av_tiles');
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[0].length; x++) {
        const mask = vertex(x, y) * 8 + vertex(x + 1, y) * 4 + vertex(x, y + 1) * 2 + vertex(x + 1, y + 1);
        if (hasTiles) rt.drawFrame('av_tiles', mask, x * 16, y * 16);
        else rt.fill(mask ? 0xc89060 : 0x58b848, 1, x * 16, y * 16, 16, 16);
        const c = this.map[y][x];
        if (c === 'c') {
          rt.fill(0x4a3c30, 1, x * 16, y * 16, 16, 16);
          rt.fill(0x5c4a3a, 1, x * 16 + ((x * 5 + y * 3) % 12), y * 16 + ((x * 7 + y) % 12), 3, 2);
        }
        if (c === 'f') rt.drawFrame('av_flowers', undefined, x * 16, y * 16);
        if (c === 'B') rt.drawFrame('av_bridge', undefined, x * 16, y * 16);
      }
    }
  }

  /** Medellín: asfalto, andenes, cebras, plazas de ladrillo y adoquín, grama de los parques. */
  private drawCity(rt: Phaser.GameObjects.RenderTexture): void {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[0].length; x++) {
        const c = this.map[y][x];
        let kind = CITY_GROUND[c];
        if (!kind) {
          // bajo edificios, objetos y letreros: el suelo de al lado
          const below = this.map[y + 1]?.[x];
          kind = (below && CITY_GROUND[below]) || 'anden';
        }
        const v = (x * 7 + y * 13) % 4;
        const k = `av_cg_${kind}_${v}`;
        if (!this.textures.exists(k)) addPixmap(this, k, buildCityGround(kind, v));
        rt.draw(k, x * 16, y * 16);
        if (c === 'B') rt.drawFrame('av_bridge', undefined, x * 16, y * 16);
      }
    }
  }

  /** Cuarto: pared del fondo (dos baldosas), bordes, piso y el tapete de la salida. */
  private drawRoom(rt: Phaser.GameObjects.RenderTexture): void {
    const W = this.map[0].length, H = this.map.length;
    const floor = this.gm.floor ?? 'madera', wall = this.gm.wall ?? 'bahareque';
    const tex = (k: string, pm: () => Parameters<typeof addPixmap>[2]) => { if (!this.textures.exists(k)) addPixmap(this, k, pm()); return k; };
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const v = (x * 5 + y * 3) % 4;
      rt.draw(tex(`av_fl_${floor}_${v}`, () => buildFloor(floor, v)), x * 16, y * 16);
    }
    for (let x = 1; x < W - 1; x++) {
      const v = x % 4;
      rt.draw(tex(`av_bw_${wall}_${v}`, () => buildBackWall(wall, v)), x * 16, 0);
    }
    for (let y = 0; y < H; y++) {
      rt.draw(tex(`av_we_${wall}_left`, () => buildWallEdge(wall, 'left')), 0, y * 16);
      rt.draw(tex(`av_we_${wall}_right`, () => buildWallEdge(wall, 'right')), (W - 1) * 16, y * 16);
    }
    for (let x = 1; x < W - 1; x++) if (this.map[H - 1][x] !== 'M') rt.draw(tex(`av_we_${wall}_bottom`, () => buildWallEdge(wall, 'bottom')), x * 16, (H - 1) * 16);
    rt.draw(tex(`av_we_${wall}_corner_l`, () => buildWallEdge(wall, 'corner_l')), 0, (H - 1) * 16);
    rt.draw(tex(`av_we_${wall}_corner_r`, () => buildWallEdge(wall, 'corner_r')), (W - 1) * 16, (H - 1) * 16);
    if (this.gm.exit) {
      rt.draw(tex(`av_fl_${floor}_0`, () => buildFloor(floor, 0)), this.gm.exit.x * 16, this.gm.exit.y * 16);
      rt.draw('av_mat', this.gm.exit.x * 16, this.gm.exit.y * 16);
    }
  }

  /** Luces de un dibujo de 16 px/baldosa puesto a escala 2 con su esquina de abajo-centro en (cx, bottom). */
  private addLights(points: [number, number][], tex: string, cx: number, bottom: number, r: number): void {
    const src = this.textures.get(tex).getSourceImage();
    const left = cx - src.width, top = bottom - src.height * 2;
    for (const [px, py] of points) this.lamps.push({ x: left + px * 2, y: top + py * 2, r, flicker: Math.random() * 10 });
  }

  private buildingTex(b: MapBuilding): string {
    return b.set === 'town' ? `av_b_${b.kind}` : `av_cb_${b.kind}`;
  }

  private propTex(p: MapProp, f = 0): string {
    if (p.set === 'town') return `av_p_${p.kind}`;
    return p.set === 'city' ? `av_cp_${p.kind}_${f}` : `av_fu_${p.kind}_${f}`;
  }

  private buildObjects(): void {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[0].length; x++) {
        if (this.map[y][x] !== 'T') continue;
        // monte tupido: un árbol por casilla, con algo de desorden
        const jx = ((x * 7 + y * 13) % 5) - 2;
        this.add.image(feetX(x) + jx, feetY(y) + 4, 'av_tree').setOrigin(0.5, 1).setDepth(feetY(y) + 4);
      }
    }
    for (const b of this.gm.buildings) {
      const [bw, bh] = buildingFootprint(b);
      const cx = (b.x + bw / 2) * CELL, bottom = (b.y + bh) * CELL;
      const tex = this.buildingTex(b);
      this.add.image(cx, bottom, tex).setOrigin(0.5, 1).setScale(2).setDepth(bottom);
      this.addLights(b.set === 'town' ? buildingLights(b.kind as BuildingKind) : cityBuildingLights(b.kind as CityBuildingKind), tex, cx, bottom, 30);
    }
    for (const p of this.gm.props) {
      const [pw] = propFootprint(p);
      const x0 = p.x - Math.floor((Math.max(1, pw) - 1) / 2);
      // el tapete (32 px, sin huella) arranca en el borde izquierdo de su baldosa
      const cx = p.kind === 'tapete' ? (p.x + 1) * CELL : (x0 + Math.max(1, pw) / 2) * CELL;
      const hung = p.set === 'furniture' && WALL_HUNG.has(p.kind as FurnitureKind);
      // lo colgado va pegado arriba en la pared del fondo (dos baldosas de alto)
      const bottom = hung ? 2 * CELL : (p.y + 1) * CELL;
      const tex = this.propTex(p);
      // la vía del metro va por encima de todo: Juan pasa por debajo
      const depth = p.kind === 'metro_via' ? 2500 : hung ? -5000 : p.kind === 'tapete' ? -6000 : bottom - 2;
      const img = this.add.image(cx, bottom, tex).setOrigin(0.5, 1).setScale(2).setDepth(depth);
      if (p.set !== 'town') this.blinkers.push({ img, base: tex.slice(0, -2) });
      const lights = p.set === 'town' ? propLights(p.kind as PropKind) : p.set === 'city' ? cityPropLights(p.kind as CityPropKind) : furnitureLights(p.kind as FurnitureKind);
      this.addLights(lights, tex, cx, bottom, p.kind === 'farol' || p.kind === 'poste' ? 70 : 34);
    }
    if (this.gm.props.some((p) => p.kind === 'metro_via')) {
      const via = this.gm.props.find((p) => p.kind === 'metro_via')!;
      // las ruedas del tren van sobre el riel, 58 px (a escala 1) encima del pie del viaducto
      const t = this.add.image(-400, (via.y + 1) * CELL - 58 * 2, 'av_cp_metro_tren_0').setOrigin(0.5, 1).setScale(2).setDepth(2501);
      this.trains.push(t);
    }
    for (const s of this.gm.signs) this.add.image(feetX(s.x), feetY(s.y) + 3, 'av_sign').setOrigin(0.5, 1).setScale(2).setDepth(feetY(s.y));
  }

  private npcTexture(key: string): string {
    if (this.textures.exists(`av_${key}`)) return `av_${key}`;
    const alt = NPC_FALLBACK[key];
    return alt && this.textures.exists(`av_${alt}`) ? `av_${alt}` : 'av_hero';
  }

  private buildActors(): void {
    const campo = this.gm.kind === 'campo';
    for (const npc of this.gm.npcs) {
      let [x, y] = [npc.x, npc.y];
      if (campo && npc.key === 'pescador' && this.st.flags.includes('tono')) [x, y] = PESCADOR_REFUGIO;
      const sprite = this.add.sprite(feetX(x), feetY(y), this.npcTexture(npc.key), 0).setOrigin(0.5, 47 / 48);
      const view: NpcView = { npc, x, y, home: [x, y], facing: npc.facing, sprite, scared: false, talks: 0 };
      this.faceNpc(view, npc.facing);
      this.npcs.push(view);
    }
    this.heroShadow = this.add.image(0, 0, 'av_shadow');
    this.hero = this.add.sprite(feetX(this.st.x), feetY(this.st.y), 'av_hero', HERO_FRAMES[this.st.facing].idle).setOrigin(0.5, 47 / 48);
    this.grassFront = this.add.image(0, 0, 'av_tall_0').setOrigin(0.5, 0).setScale(2).setCrop(0, 9, 16, 7).setVisible(false);
    this.setHeroFrame();
    this.placeHero(feetX(this.st.x), feetY(this.st.y));
    this.buildDog();

    if (!campo) return;
    // los mitos no se ven: rondan escondidos lejos de Juan
    const left = GUARDIANS.filter((g) => !this.st.calmed.includes(g.id));
    const hs = spawnHidden(this.map, left, this.rnd, this.st);
    this.hidden = hs.map((h, i) => ({ h, g: left[i] }));
    for (const v of this.hidden) {
      v.h.escapes = this.st.escapes[v.g.id] ?? 0;
      for (let i = 0; i < 6; i++) wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
      this.syncClues(v);
    }
    for (const s of SPIRITS) {
      const tex = `av_spirit_${s.kind}`;
      const procedural = this.textures.get(tex).getSourceImage() instanceof HTMLCanvasElement;
      const sprite = this.add.sprite(0, 0, tex, 0).setOrigin(0.5, 1).setVisible(false);
      this.spirits.push({ s, x: -1, y: -1, sprite, shown: false, steps: 0, cooldown: 10, procedural });
    }
  }

  // ---------------------------------------------------------------- el perro

  /** Firulais sigue a Juan una casilla atrás, por donde él pasó. */
  private buildDog(): void {
    const [dx, dy] = STEP[OPPOSITE[this.st.facing]];
    let x = this.st.x + dx, y = this.st.y + dy;
    if (!walkable(this.map, x, y) || this.npcs.some((n) => n.x === x && n.y === y)) [x, y] = [this.st.x, this.st.y];
    this.dogAt = { x, y, facing: this.st.facing };
    this.dog = this.add.sprite(feetX(x), feetY(y), 'av_perro', 0).setOrigin(0.5, 47 / 48).setScale(0.75);
    this.faceDog(this.st.facing);
  }

  private faceDog(d: Dir): void {
    this.dogAt.facing = d;
    const f = NPC_FRAME[d];
    this.dog.setFrame(f.f).setFlipX(f.flip);
  }

  private followDog(): void {
    const { x: tx, y: ty } = this.from;
    const d: Dir = tx > this.dogAt.x ? 'right' : tx < this.dogAt.x ? 'left' : ty > this.dogAt.y ? 'down' : 'up';
    if (tx === this.dogAt.x && ty === this.dogAt.y) return;
    this.faceDog(d);
    this.dogAt.x = tx; this.dogAt.y = ty;
    this.tweens.add({ targets: this.dog, x: feetX(tx), y: feetY(ty), duration: (WALK_FRAMES * 1000) / 60 });
    // trotecito: brinca un poquito a cada paso (transformación del fotograma completo)
    this.tweens.add({ targets: this.dog, scaleY: 0.69, duration: 60, yoyo: true, repeat: 1 });
  }

  // ---------------------------------------------------------------- la noche y el ánimo

  private buildNight(): void {
    this.night = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_NIGHT);
    this.eyes = this.add.container(0, 0).setDepth(DEPTH_NIGHT + 1);
    this.lightImg = this.make.image({ key: 'av_light', add: false }).setOrigin(0.5);
  }

  /** Cada fotograma: noche encima y luces recortadas (solo las que caen en pantalla). */
  private drawNight(): void {
    const cam = this.cameras.main;
    const sx = cam.scrollX, sy = cam.scrollY;
    this.night.clear().fill(NIGHT_COLOR, this.darkness);
    const eraseScaled = (x: number, y: number, rr: number) => {
      if (x + rr < sx || y + rr < sy || x - rr > sx + GAME_WIDTH || y - rr > sy + GAME_HEIGHT) return;
      this.lightImg.setScale(rr / 64);
      this.night.erase(this.lightImg, Math.round(x - sx), Math.round(y - sy));
    };
    // el farol de Juan tiembla un poquito
    const r = LANTERN_R + Math.sin(this.frame / 7) * 2 + (this.frame % 23 === 0 ? -3 : 0);
    eraseScaled(this.hero.x, this.hero.y - 16, r);
    for (const l of this.lamps) eraseScaled(l.x, l.y, l.r + Math.sin(this.frame / 9 + l.flicker) * 2);
  }

  /** Lugares alegres: menos oscuridad, música de fiesta; el monte y el río: oscuro y tenso. */
  private updateMood(): void {
    const mood: Mood = moodIn(this.gm, this.st.x, this.st.y);
    const target = this.gm.darkness[mood];
    this.tweens.add({ targets: this, darkness: target, duration: 900 });
    if (this.soundNow === '') this.darkness = target;
    const snd = soundIn(this.gm, this.st.x, this.st.y);
    if (snd !== this.soundNow) {
      this.soundNow = snd;
      sfx.setSoundscape(snd);
    }
  }

  private occupied(x: number, y: number): boolean {
    if (this.st.x === x && this.st.y === y) return true;
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    if (this.dogAt.x === x && this.dogAt.y === y) return true;
    return this.hidden.some((v) => v.h.x === x && v.h.y === y);
  }

  /** Las señales que deja cada mito: se pintan en el suelo y solo se ven con el farol. */
  private syncClues(v: HiddenView): void {
    const want = new Set(v.h.trail.map(([x, y]) => `${v.g.id}:${key(x, y)}`));
    for (const [k, img] of this.clues) if (k.startsWith(`${v.g.id}:`) && !want.has(k)) { img.destroy(); this.clues.delete(k); }
    for (const [x, y] of v.h.trail) {
      const k = `${v.g.id}:${key(x, y)}`;
      if (this.clues.has(k)) continue;
      this.clues.set(k, this.add.image(feetX(x), y * CELL + CELL / 2, `av_clue_${v.g.clue}_0`).setScale(2).setDepth(-7000));
    }
  }

  private clearClues(id: FighterId): void {
    for (const [k, img] of this.clues) if (k.startsWith(`${id}:`)) { img.destroy(); this.clues.delete(k); }
  }

  // ---------------------------------------------------------------- héroe

  private placeHero(x: number, y: number): void {
    this.hero.setPosition(Math.round(x), Math.round(y)).setDepth(y + 1);
    this.heroShadow.setPosition(Math.round(x), Math.round(y) - 1).setDepth(y);
    const inGrass = this.map[this.st.y]?.[this.st.x] === '"' && (!this.moving || this.progress > 0.5);
    this.grassFront.setVisible(inGrass).setPosition(feetX(this.st.x), this.st.y * CELL).setDepth(y + 2);
  }

  private setHeroFrame(): void {
    const f = HERO_FRAMES[this.st.facing];
    const seq = [1, 2, 3, 0];
    const idx = this.moving ? f.walk + seq[((this.steps % 2) * 2 + (this.progress < 0.5 ? 0 : 1)) % 4] : f.idle;
    this.hero.setFrame(idx).setFlipX(f.flip);
  }

  private blocked(x: number, y: number): boolean {
    if (!walkable(this.map, x, y)) return true;
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    return this.spirits.some((s) => s.shown && s.x === x && s.y === y);
  }

  private heldDir(): Dir | null {
    for (const [d, codes] of DIR_KEYS) if (codes.some((c) => inputManager.isRawKeyDown(c))) return d;
    return null;
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    this.animateWorld();
    this.drawNight();
    this.dialog.update(this.menu);
    if (this.dialog.busy || this.locked) return;

    if (this.moving) {
      this.progress += 1 / WALK_FRAMES;
      const [dx, dy] = STEP[this.st.facing];
      const t = Math.min(1, this.progress);
      this.placeHero(feetX(this.from.x) + dx * CELL * t, feetY(this.from.y) + dy * CELL * t);
      this.setHeroFrame();
      if (this.progress >= 1) {
        this.moving = false;
        this.steps++;
        this.setHeroFrame();
        this.arrive();
      }
      return;
    }

    this.idleFear();
    if (this.frame % 90 === 0) this.wanderNpcs();
    if (this.menu.pressed(MENU_KEYS.confirm)) { void this.interact(); return; }
    if (this.menu.pressed(MENU_KEYS.back)) { void this.pauseMenu(); return; }

    const d = this.heldDir();
    if (!d) { this.turnDelay = 0; return; }
    if (d !== this.st.facing) {
      this.st.facing = d;
      this.turnDelay = 5;
      this.setHeroFrame();
      return;
    }
    if (this.turnDelay > 0) { this.turnDelay--; return; }
    const [dx, dy] = STEP[d];
    if (this.blocked(this.st.x + dx, this.st.y + dy)) {
      const door = d === 'up' ? this.doorAbove() : null;
      if (door) { void this.enter(door); return; }
      if (this.frame % 24 === 0) sfx.play('land');
      return;
    }
    this.from = { x: this.st.x, y: this.st.y };
    this.st.x += dx;
    this.st.y += dy;
    this.moving = true;
    this.progress = 0;
    const tg = this.tallGrass.get(key(this.st.x, this.st.y));
    if (tg) this.tweens.add({ targets: tg, y: tg.y + 2, duration: 80, yoyo: true });
  }

  private animateWorld(): void {
    const f = Math.floor(this.frame / 36) % 2;
    if (this.frame % 20 === 0) {
      const b = Math.floor(this.frame / 20) % 2;
      for (const { img, base } of this.blinkers) img.setTexture(`${base}_${b}`);
    }
    for (const t of this.trains) {
      // el metro pasa cada tanto de lado a lado
      t.x += 3;
      if (t.x > this.map[0].length * CELL + 300) t.x = -300 - Math.floor(this.rnd() * 6) * 200;
    }
    if (this.frame % 36 === 0) {
      for (const w of this.waters) w.img.setTexture(`av_water_${f}_${+w.top}${+w.bottom}`);
      for (const [k, img] of this.clues) {
        const clue = GUARDIANS.find((g) => k.startsWith(`${g.id}:`))!.clue;
        img.setTexture(`av_clue_${clue}_${f}`);
      }
    }
    for (const n of this.npcs) {
      const sx = n.scared ? (this.frame % 4 < 2 ? 1 : -1) : 0;
      if (!this.tweens.isTweening(n.sprite)) n.sprite.setPosition(feetX(n.x) + sx, feetY(n.y));
      n.sprite.setDepth(n.sprite.y);
    }
    for (const n of this.npcs) {
      if (n.npc.key === 'pescador') n.scared = this.st.flags.includes('tono') && !this.st.calmed.includes('llorona');
    }
    for (const s of this.spirits) {
      if (!s.shown) continue;
      // brinco suave del espíritu (transformación del fotograma completo)
      const k = SPIRIT_SCALE[s.s.kind];
      s.sprite.setScale(k, k * (1 + Math.sin(this.frame / 10) * 0.04)).setDepth(s.sprite.y);
      if (s.procedural && this.frame % 12 === 0) s.sprite.setFrame((Number(s.sprite.frame.name) + 1) % SPIRIT_FRAMES[s.s.kind]);
    }
  }

  /** Cerca de un espanto escondido Juan tiembla y a ratos suspira «...». */
  private idleFear(): void {
    const near = this.hidden.some((v) => dist(v.h.x, v.h.y, this.st.x, this.st.y) <= 5);
    const base = feetX(this.st.x);
    this.hero.x = near && this.frame % 6 < 3 ? base + 1 : base;
    if (near && this.frame % 240 === 0) void this.bubble(this.hero, 3, 900);
  }

  private faceNpc(n: NpcView, d: Dir): void {
    n.facing = d;
    const f = NPC_FRAME[d];
    if (n.sprite.texture.key === 'av_hero') n.sprite.setFrame(HERO_FRAMES[d].idle).setFlipX(HERO_FRAMES[d].flip).setTint(0xc0a080);
    else n.sprite.setFrame(f.f).setFlipX(f.flip);
  }

  /** Los aldeanos inquietos dan un pasito alrededor de su sitio. */
  private wanderNpcs(): void {
    for (const n of this.npcs) {
      const r = n.npc.wander ?? 0;
      if (!r || this.rnd() < 0.5) continue;
      const dirs: Dir[] = ['up', 'down', 'left', 'right'];
      const d = dirs[Math.floor(this.rnd() * 4)];
      const [dx, dy] = STEP[d];
      const nx = n.x + dx, ny = n.y + dy;
      this.faceNpc(n, d);
      if (Math.abs(nx - n.home[0]) + Math.abs(ny - n.home[1]) > r || this.blocked(nx, ny) || this.occupied(nx, ny)) continue;
      n.x = nx; n.y = ny;
      this.tweens.add({ targets: n.sprite, x: feetX(nx), y: feetY(ny), duration: 260 });
    }
  }

  // ---------------------------------------------------------------- puertas y viajes

  /** Edificio con interior justo encima de Juan, si está parado frente a su puerta. */
  private doorAbove(): MapBuilding | null {
    const b = this.gm.buildings.find((x) => {
      const [dx, dy] = doorCell(x);
      return dx === this.st.x && dy === this.st.y;
    });
    return b && interiorOf(b) ? b : null;
  }

  private async goTo(map: string, x: number, y: number, facing: Dir, arrive?: 'car' | 'door'): Promise<void> {
    this.locked = true;
    this.cameras.main.fadeOut(260, 0, 0, 0);
    await this.wait(280);
    Object.assign(this.st, { map, x, y, facing });
    saveAdventure(this.st);
    this.scene.restart({ arrive });
  }

  private async enter(b: MapBuilding): Promise<void> {
    const id = interiorOf(b)!;
    sfx.play('puerta');
    const m = getMap(id);
    await this.goTo(id, m.exit!.x, m.exit!.y - 1, 'up', 'door');
  }

  private async leave(): Promise<void> {
    const ex = this.gm.exit!;
    sfx.play('puerta');
    await this.goTo(ex.to, ex.tx, ex.ty, 'down', 'door');
  }

  /** El perro gruñe y mira hacia donde ronda un espanto escondido: otra señal para encontrarlo. */
  private dogSenses(): void {
    const near = this.hidden.find((v) => dist(v.h.x, v.h.y, this.st.x, this.st.y) <= 6);
    if (!near || this.rnd() > 0.25) return;
    const dx = near.h.x - this.dogAt.x, dy = near.h.y - this.dogAt.y;
    this.faceDog(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    sfx.play('grunido');
    this.tweens.add({ targets: this.dog, x: this.dog.x + 1, duration: 40, yoyo: true, repeat: 6 });
  }

  /** En el yipao entre San Agustín y Medellín: carretera de montaña con cafetales, de noche. */
  private async travel(): Promise<void> {
    this.locked = true;
    const toCity = this.gm.id === 'campo';
    const ok = await this.dialog.ask(toCity ? '¿SE VA PA\' MEDELLÍN?' : '¿VOLVEMOS A SAN AGUSTÍN?', ['¡VÁMONOS!', 'TODAVÍA NO'], { cancel: 1 });
    if (ok !== 0) { this.locked = false; return; }
    sfx.play('motor');
    const layer: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a1430).setScrollFactor(0).setDepth(8000).setAlpha(0);
    layer.push(bg);
    await this.tween({ targets: bg, alpha: 1, duration: 400 });
    const g = this.add.graphics().setScrollFactor(0).setDepth(8001);
    layer.push(g);
    const moon = this.add.circle(320, 40, 14, 0xf0f0d0).setScrollFactor(0).setDepth(8001);
    layer.push(moon);
    const hills = (seed: number, y: number, color: number, amp: number) => {
      g.fillStyle(color, 1).beginPath().moveTo(0, GAME_HEIGHT);
      for (let x = 0; x <= GAME_WIDTH * 3; x += 8) g.lineTo(x, y - Math.abs(Math.sin(x / 47 + seed) * amp + Math.sin(x / 19 + seed * 2) * amp * 0.4));
      g.lineTo(GAME_WIDTH * 3, GAME_HEIGHT).closePath().fillPath();
    };
    hills(1, 120, 0x14243c, 40);
    hills(4, 150, 0x1c3a2a, 26);
    for (let x = 0; x < GAME_WIDTH * 3; x += 14) { g.fillStyle(0x2a5a2a, 1).fillCircle(x, 166 + (x % 3), 5); g.fillStyle(0xc02020, 1).fillCircle(x + 2, 164, 1); }
    g.fillStyle(0x3a3028, 1).fillRect(0, 172, GAME_WIDTH * 3, 30);
    for (let x = 0; x < GAME_WIDTH * 3; x += 24) g.fillStyle(0xd8c070, 1).fillRect(x, 186, 10, 2);
    const village = toCity ? 'MEDELLÍN' : 'SAN AGUSTÍN';
    for (let i = 0; i < 40; i++) layer.push(this.add.circle(GAME_WIDTH * 2 + 40 + (i % 10) * 18, 110 + Math.floor(i / 10) * 10, 1.5, [0xf8d048, 0xf8f0c0, 0xf88848][i % 3]).setScrollFactor(0).setDepth(8001));
    const jeep = this.add.image(-60, 182, 'av_cp_jeep_0').setScale(2).setOrigin(0.5, 1).setScrollFactor(0).setDepth(8003);
    layer.push(jeep);
    const label = this.add.bitmapText(GAME_WIDTH / 2, 24, 'font', toCity ? 'BAJANDO A MEDELLÍN...' : 'SUBIENDO A SAN AGUSTÍN...').setOrigin(0.5).setScrollFactor(0).setDepth(8004).setTint(0xf8f0d8);
    layer.push(label);
    const bump = this.tweens.add({ targets: jeep, y: 180, duration: 120, yoyo: true, repeat: -1 });
    await this.tween({ targets: jeep, x: GAME_WIDTH / 2, duration: 1400, ease: 'Sine.out' });
    await this.tween({ targets: g, x: -GAME_WIDTH * 1.6, duration: 2600, ease: 'Sine.inOut',
      onUpdate: () => { for (const o of layer) if (o instanceof Phaser.GameObjects.Arc && o.radius < 2) o.x -= 1.4; } });
    sfx.play('pito');
    label.setText(`¡LLEGAMOS A ${village}!`);
    await this.tween({ targets: jeep, x: GAME_WIDTH + 80, duration: 900, ease: 'Sine.in' });
    bump.stop();
    const dest = toCity ? getMap('medellin') : getMap('campo');
    const [ax, ay] = dest.arrival!;
    Object.assign(this.st, { map: dest.id, x: ax, y: ay, facing: 'down' as Dir });
    saveAdventure(this.st);
    this.scene.restart({ arrive: 'car' });
  }

  private async arriveByCar(): Promise<void> {
    this.locked = true;
    sfx.play('pito');
    await this.wait(500);
    const first = !this.st.flags.includes(`llegó_${this.gm.id}`);
    if (first) {
      this.st.flags.push(`llegó_${this.gm.id}`);
      saveAdventure(this.st);
      await this.dialog.say(this.gm.kind === 'ciudad'
        ? ['¡AVE MARÍA, QUÉ BELLEZA! MEDELLÍN DE NOCHE, TODA ILUMINADA. AQUÍ NO HAY ESPANTOS... ¡HAY FIESTA!', 'PA\' VOLVER A SAN AGUSTÍN, BUSQUE A DON EVELIO EN LA TERMINAL DEL NORTE.']
        : ['DE VUELTA EN SAN AGUSTÍN. AQUÍ EL MONTE SE OYE DISTINTO... LOS ESPANTOS SIGUEN SUELTOS.'], { speaker: 'JUAN MACHETE' });
    }
    this.locked = false;
    this.showArea();
  }

  // ---------------------------------------------------------------- sucesos

  private arrive(): void {
    this.followDog();
    this.showArea();
    this.updateMood();
    const ex = this.gm.exit;
    if (ex && this.st.x === ex.x && this.st.y === ex.y) { void this.leave(); return; }
    if (!this.ready || this.gm.kind !== 'campo') return;
    this.dogSenses();
    const hero = { x: this.st.x, y: this.st.y };

    for (const v of this.hidden) {
      if (v.h.rest > 0) v.h.rest--;
      if (this.rnd() < 0.6) {
        wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
        this.syncClues(v);
      }
    }
    // ¿alguno salta de la nada?
    for (const v of this.hidden) {
      if (this.rnd() < ambushChance(dist(v.h.x, v.h.y, hero.x, hero.y), v.h.rest)) { void this.ambush(v); return; }
    }
    // Juan pisa una señal
    for (const v of this.hidden) {
      if (!v.h.trail.some(([x, y]) => x === hero.x && y === hero.y) || this.seenClues.has(v.g.id)) continue;
      this.seenClues.add(v.g.id);
      void this.clueEvent(v);
      return;
    }
    if (this.gm.kind === 'campo' && this.st.y >= LLORONA_EVENT_Y && this.st.x >= 28 && this.st.x <= 50 && !this.st.flags.includes('tono') && !this.st.calmed.includes('llorona')) {
      void this.tonoEvent();
      return;
    }
    for (const v of this.hidden) {
      const d = dist(v.h.x, v.h.y, hero.x, hero.y);
      if (d >= GLIMPSE_MIN && d <= GLIMPSE_MAX && this.rnd() < 0.07) { void this.glimpse(v); break; }
      if (d <= HEAR_RADIUS && this.rnd() < 0.12) { sfx.play(MYTH_SOUND[v.g.id]); break; }
    }
    if (this.spiritStep()) return;
    if (this.map[this.st.y][this.st.x] === '"' && this.rnd() < RUSTLE_RATE) void this.rustleEvent();
  }

  private showArea(): void {
    const name = areaIn(this.gm, this.st.x, this.st.y);
    if (name === this.area) return;
    this.area = name;
    this.areaLabel.removeAll(true);
    const t = this.add.bitmapText(10, 9, 'font', name).setTint(0xf8f0d8).setScrollFactor(0);
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x283048, 0.92).fillRoundedRect(4, 4, t.width + 12, 17, 3);
    g.lineStyle(1, 0xd8b070, 1).strokeRoundedRect(4, 4, t.width + 12, 17, 3);
    this.areaLabel.add([g, t]);
    this.areaLabel.setY(-24).setAlpha(1);
    this.tweens.killTweensOf(this.areaLabel);
    this.tweens.chain({ targets: this.areaLabel, tweens: [{ y: 0, duration: 250 }, { alpha: 0, delay: 1800, duration: 400 }] });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  private async bubble(target: Phaser.GameObjects.Sprite, kind: 1 | 2 | 3, ms = 700): Promise<void> {
    const top = target.y - target.displayHeight * target.originY;
    const b = this.add.image(target.x, top + 4, `av_bubble_${kind}`).setOrigin(0.5, 1).setDepth(4500);
    if (kind !== 3) sfx.play(kind === 2 ? 'sting' : 'select');
    await this.tween({ targets: b, y: top - 2, duration: 120, ease: 'Back.out' });
    await this.wait(ms);
    b.destroy();
  }

  private async shake(target: Phaser.GameObjects.Sprite, times = 6): Promise<void> {
    const x = target.x;
    await this.tween({ targets: target, x: x + 2, duration: 40, yoyo: true, repeat: times });
    target.x = x;
  }

  private get ready(): boolean {
    return this.st.flags.includes('intro');
  }

  private mythSprite(id: FighterId, x: number, y: number, anim: 'idle' | 'walk' = 'idle'): Phaser.GameObjects.Sprite {
    const k = drawnAnimKey(id, 'p1', anim);
    return this.add.sprite(feetX(x), feetY(y) + 2, this.textures.exists(k) ? k : 'av_hero', 0).setOrigin(0.5, 1).setDepth(feetY(y) + 2).setScale(MYTH_MAP_SCALE);
  }

  /** Ojos rojos que brillan en la oscuridad, por encima de la noche. */
  private eyesAt(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    for (const dx of [-3, 3]) c.add(this.add.rectangle(dx, 0, 2, 2, 0xff2020));
    this.eyes.add(c);
    return c;
  }

  /** Se deja ver un instante a lo lejos y se esfuma. */
  private async glimpse(v: HiddenView): Promise<void> {
    const sp = this.mythSprite(v.g.id, v.h.x, v.h.y).setAlpha(0).setFlipX(v.h.x > this.st.x);
    const eyes = this.eyesAt(sp.x, sp.y - sp.displayHeight * 0.78).setAlpha(0);
    sfx.monster(v.g.id, 'attack');
    await this.tween({ targets: [sp, eyes], alpha: 0.85, duration: 300 });
    await this.wait(500);
    await this.tween({ targets: [sp, eyes], alpha: 0, duration: 400 });
    sp.destroy(); eyes.destroy();
    for (let i = 0; i < 3; i++) wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
    this.syncClues(v);
  }

  private async clueEvent(v: HiddenView): Promise<void> {
    this.locked = true;
    await this.bubble(this.hero, 1, 400);
    sfx.play(MYTH_SOUND[v.g.id]);
    await this.dialog.say([v.g.clueText], { speaker: 'JUAN MACHETE' });
    this.locked = false;
  }

  /** El mito sale de la nada al lado de Juan: susto, y pelea... o se esfuma. */
  private async ambush(v: HiddenView): Promise<void> {
    this.locked = true;
    const spot = popSpot(this.map, this.st, STEP[this.st.facing], (x, y) => this.occupied(x, y) && !(x === v.h.x && y === v.h.y));
    if (!spot) { this.locked = false; return; }
    [v.h.x, v.h.y] = spot;
    const sp = this.mythSprite(v.g.id, spot[0], spot[1]).setAlpha(0).setFlipX(spot[0] > this.st.x);
    this.st.facing = spot[0] > this.st.x ? 'right' : spot[0] < this.st.x ? 'left' : spot[1] > this.st.y ? 'down' : 'up';
    this.setHeroFrame();
    sfx.play('screamer');
    this.cameras.main.flash(120, 120, 0, 0);
    this.cameras.main.shake(300, 0.01);
    sfx.monster(v.g.id, 'attack');
    sp.setScale(MYTH_MAP_SCALE * 1.3);
    await this.tween({ targets: sp, alpha: 1, scale: MYTH_MAP_SCALE, duration: 160, ease: 'Back.out' });
    await Promise.all([this.bubble(this.hero, 2, 600), this.shake(this.hero, 8)]);
    await this.dialog.say([v.g.fright], { speaker: 'JUAN MACHETE', shake: true });

    if (this.rnd() < vanishChance(v.h.escapes)) {
      await this.dialog.say([v.g.flee]);
      await this.vanish(sp);
      this.escaped(v);
      this.locked = false;
      return;
    }
    await this.dialog.say([v.g.taunt], { speaker: FIGHTERS[v.g.id].name });
    await this.startFight(v.g);
  }

  private async vanish(sp: Phaser.GameObjects.Sprite): Promise<void> {
    sfx.play('mist');
    await this.tween({ targets: sp, alpha: 0, scaleX: MYTH_MAP_SCALE * 0.2, scaleY: MYTH_MAP_SCALE * 1.4, duration: 380, ease: 'Cubic.in' });
    sp.destroy();
  }

  private escaped(v: HiddenView): void {
    v.h.escapes++;
    this.st.escapes[v.g.id] = v.h.escapes;
    v.h.rest = 12;
    relocate(this.map, v.h, v.g, this.rnd, this.st);
    this.clearClues(v.g.id);
    saveAdventure(this.st);
  }

  // ---------------------------------------------------------------- espíritus: duende, pollo maligno, mano peluda

  /** Devuelve true si algo pasó y la escena quedó ocupada. */
  private spiritStep(): boolean {
    for (const sv of this.spirits) {
      const inZone = inRect(sv.s.zone, this.st.x, this.st.y);
      if (sv.shown) {
        sv.steps++;
        const d = dist(sv.x, sv.y, this.st.x, this.st.y);
        if (d <= 1) { void this.spiritMeet(sv); return true; }
        if (sv.steps > 9 || !inZone) { void this.spiritLeave(sv); continue; }
        if (sv.s.kind === 'pollo') this.spiritMove(sv, true);
        else if (sv.s.kind === 'duende' && this.rnd() < 0.5) this.spiritMove(sv, d < 3);
        continue;
      }
      if (sv.cooldown > 0) { sv.cooldown--; continue; }
      if (!inZone) continue;
      if (sv.s.kind === 'mano') {
        if (this.map[this.st.y][this.st.x] === 'c' && this.rnd() < 0.1) { void this.manoEvent(sv); return true; }
        continue;
      }
      if (this.rnd() < 0.06) this.spiritAppear(sv);
    }
    return false;
  }

  private spiritAppear(sv: SpiritView): void {
    const cells = zoneCells(this.map, sv.s.zone).filter(([x, y]) => {
      const d = dist(x, y, this.st.x, this.st.y);
      return d >= 3 && d <= 4 && !this.occupied(x, y);
    });
    if (!cells.length) return;
    [sv.x, sv.y] = cells[Math.floor(this.rnd() * cells.length)];
    sv.shown = true;
    sv.steps = 0;
    sv.sprite.setPosition(feetX(sv.x), feetY(sv.y) + 2).setAlpha(0).setVisible(true).setFrame(0);
    sv.sprite.setFlipX(sv.x > this.st.x);
    this.tweens.add({ targets: sv.sprite, alpha: 1, duration: 300 });
    sfx.play(SPIRIT_SOUND[sv.s.kind]);
    if (sv.s.kind === 'pollo') this.eyesAt(sv.sprite.x, sv.sprite.y - 30).setData('pollo', true);
  }

  private spiritMove(sv: SpiritView, towards: boolean): void {
    const opts = (Object.keys(STEP) as Dir[]).map((d) => [sv.x + STEP[d][0], sv.y + STEP[d][1]] as [number, number])
      .filter(([x, y]) => walkable(this.map, x, y) && !this.occupied(x, y) && inRect(sv.s.zone, x, y))
      .sort((a, b) => (dist(a[0], a[1], this.st.x, this.st.y) - dist(b[0], b[1], this.st.x, this.st.y)) * (towards ? 1 : -1));
    if (!opts.length) return;
    [sv.x, sv.y] = opts[0];
    sv.sprite.setFlipX(sv.x > this.st.x);
    this.tweens.add({ targets: sv.sprite, x: feetX(sv.x), y: feetY(sv.y) + 2, duration: 200 });
    this.syncPolloEyes(sv);
  }

  private syncPolloEyes(sv: SpiritView): void {
    if (sv.s.kind !== 'pollo') return;
    for (const c of this.eyes.list as Phaser.GameObjects.Container[]) {
      if (c.getData('pollo')) this.tweens.add({ targets: c, x: feetX(sv.x), y: feetY(sv.y) + 2 - 30, duration: 200 });
    }
  }

  private async spiritLeave(sv: SpiritView): Promise<void> {
    sv.shown = false;
    sv.cooldown = 25;
    sv.x = sv.y = -1;
    for (const c of [...this.eyes.list] as Phaser.GameObjects.Container[]) if (c.getData('pollo')) c.destroy();
    await this.tween({ targets: sv.sprite, alpha: 0, duration: 300 });
    sv.sprite.setVisible(false).setAlpha(1);
  }

  private async spiritMeet(sv: SpiritView): Promise<void> {
    this.locked = true;
    sfx.play(SPIRIT_SOUND[sv.s.kind]);
    await Promise.all([this.bubble(this.hero, 2, 500), this.shake(this.hero, 6)]);
    const fright: Record<SpiritKind, string> = {
      duende: '¡UN DUENDE! ¡NO ME VAYA A ESCONDER EL MACHETE, CHIQUITO!',
      pollo: '¡ESE POLLO NEGRO TIENE LOS OJOS ROJOS! ¡ES EL POLLO MALIGNO! ¡PÍO DICE, PERO DE POLLO NO TIENE NADA!',
      mano: '¡AY, AY, AY! ¡UNA MANO PELUDA ME AGARRÓ EL TOBILLO!',
    };
    await this.dialog.say([fright[sv.s.kind]], { speaker: 'JUAN MACHETE', shake: true });
    await this.dialog.say([sv.s.hints[Math.floor(this.rnd() * sv.s.hints.length)]], { speaker: sv.s.name });
    await this.spiritLeave(sv);
    this.locked = false;
  }

  /** En el cementerio la mano peluda sale de la tierra junto a los pies de Juan. */
  private async manoEvent(sv: SpiritView): Promise<void> {
    const spot = popSpot(this.map, this.st, STEP[this.st.facing], (x, y) => this.occupied(x, y));
    if (!spot) return;
    this.locked = true;
    [sv.x, sv.y] = spot;
    sv.shown = true;
    sv.steps = 0;
    sv.sprite.setPosition(feetX(sv.x), feetY(sv.y) + 2).setVisible(true).setAlpha(1).setFrame(0);
    sv.sprite.setCrop(0, 0, 48, 0);
    sfx.play('creak');
    this.cameras.main.shake(200, 0.006);
    for (let h = 8; h <= 48; h += 8) {
      sv.sprite.setCrop(0, 48 - h, 48, h);
      await this.wait(60);
    }
    sv.sprite.setCrop();
    await this.spiritMeet(sv);
  }

  // ---------------------------------------------------------------- historia

  private async intro(): Promise<void> {
    this.locked = true;
    await this.wait(500);
    const abuela = this.npcs.find((n) => n.npc.key === 'abuela')!;
    this.faceNpc(abuela, 'down');
    await this.bubble(abuela.sprite, 1);
    await this.dialog.say(['¡JUAN! ¡JUAN MACHETE! ¡QUÉ BUENO QUE BAJÓ DE MEDELLÍN, MIJO! Y A ESTAS HORAS DE LA NOCHE...'], { speaker: 'ABUELA ROSA' });
    abuela.scared = true;
    sfx.play('whisper');
    await this.dialog.say([
      'LOS ESPANTOS ANDAN ALBOROTADOS... DE NOCHE SE OYEN SILBIDOS, LLANTOS EN EL RÍO Y PASOS DE UNA SOLA PATA EN EL MONTE.',
      'ANDAN SUELTOS TODOS LOS MITOS: EL SOMBRERÓN Y LA MUELONA EN EL PUEBLO, EL SILBÓN EN EL LLANO, LA LLORONA Y EL MOHÁN EN EL RÍO, EL HOMBRE CAIMÁN EN LA CIÉNAGA...',
      '...LA PATASOLA Y LA MADREMONTE EN EL MONTE Y BACHUÉ EN LA LAGUNA DEL SUR. ¡YA NADIE SE ATREVE A SALIR!',
    ], { speaker: 'ABUELA ROSA', shake: true });
    abuela.scared = false;
    await this.dialog.say([
      'PERO OJO, MIJO: A LOS ESPANTOS NO LOS VA A VER ASÍ NO MÁS. SE ESCONDEN, SE MUEVEN Y SALEN DE LA NADA.',
      'BUSQUE LAS SEÑALES QUE DEJAN: HUELLAS, HUESOS, LÁGRIMAS... Y PARE BIEN LA OREJA. PREGÚNTELE A LA GENTE DEL PUEBLO.',
    ], { speaker: 'ABUELA ROSA' });
    await this.dialog.say(['¡AVE MARÍA, ABUELA! MIEDO SÍ ME DA... PERO UN PAISA NO SE ARRUGA. ¡DEME ESE MACHETE Y ESE FAROL, PUES!'], { speaker: 'JUAN MACHETE' });
    sfx.play('ultimate');
    await this.dialog.say(['¡ESO, MIJO! SI LO TUMBAN, SE ACABÓ TODO Y TOCA EMPEZAR DE NUEVO. Y SI EL ESPANTO SE LE VUELA, TOCA IR A BUSCARLO OTRA VEZ. ¡VAYA CON DIOS!'], { speaker: 'ABUELA ROSA' });
    this.st.flags.push('intro');
    saveAdventure(this.st);
    this.locked = false;
    this.showArea();
  }

  /** Don Toño oye el llanto en el río, tiembla y sale corriendo al pueblo. */
  private async tonoEvent(): Promise<void> {
    this.locked = true;
    const tono = this.npcs.find((n) => n.npc.key === 'pescador')!;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan((this.hero.x + tono.sprite.x) / 2, (this.hero.y + tono.sprite.y) / 2 + 12, 500, 'Sine.easeInOut');
    sfx.play('distantScream');
    this.cameras.main.shake(300, 0.004);
    await this.dialog.say(['...AAAAAY... MIS HIJOOOOS...'], { speaker: '¿?', shake: true });
    this.faceNpc(tono, 'up');
    await this.bubble(tono.sprite, 2);
    tono.scared = true;
    await this.bubble(this.hero, 2, 400);
    await this.dialog.say(['¡¿OYÓ ESO, DON JUAN?! ¡ES LA LLORONA! ¡ME TIEMBLAN HASTA LAS CHANCLAS!', '¡YO ME VOY PA\'L PUEBLO! ¡USTED VERÁ SI SE ARRIESGA!'], { speaker: 'DON TOÑO', shake: true });
    tono.scared = false;
    await this.tween({ targets: tono.sprite, alpha: 0, duration: 400 });
    [tono.x, tono.y] = PESCADOR_REFUGIO;
    tono.home = [...PESCADOR_REFUGIO];
    tono.sprite.setPosition(feetX(tono.x), feetY(tono.y)).setAlpha(1);
    this.faceNpc(tono, 'down');
    cam.pan(this.hero.x, this.hero.y + 20, 400, 'Sine.easeInOut');
    await this.wait(420);
    cam.startFollow(this.hero, true, 1, 1, 0, 20);
    this.st.flags.push('tono');
    saveAdventure(this.st);
    this.locked = false;
  }

  /** De vuelta del combate: ganar calma al espanto; perder reinicia el juego; si se voló, toca buscarlo otra vez. */
  private async afterFight(fight: AdventureFight, outcome: FightOutcome): Promise<void> {
    this.locked = true;
    await this.wait(400);
    const name = FIGHTERS[fight.id].name;
    const g = GUARDIANS.find((x) => x.id === fight.id)!;
    if (outcome === 'lose') {
      const r = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setScrollFactor(0).setDepth(4900);
      const t1 = this.add.bitmapText(GAME_WIDTH / 2, 80, 'font', 'FIN DEL JUEGO').setScale(2).setOrigin(0.5).setTint(0xd82020).setScrollFactor(0).setDepth(4901);
      sfx.play('ko');
      await this.dialog.say([`${name} TUMBÓ A JUAN MACHETE...`, 'JUAN SE DESPIERTA EN LA VEREDA SIN SABER CUÁNTO TIEMPO PASÓ. TODO VUELVE A EMPEZAR.'], { shake: true });
      await this.tween({ targets: [r, t1], alpha: 0, duration: 800 });
      r.destroy(); t1.destroy();
      this.locked = false;
      void this.intro();
      return;
    }
    if (outcome === 'fled') {
      sfx.play(MYTH_SOUND[fight.id]);
      const v = this.hidden.find((x) => x.g.id === fight.id);
      if (v) v.h.rest = 12;
      await this.dialog.say([g.flee, `¡${name} SE VOLÓ DE LA PELEA! ANDA ESCONDIDO OTRA VEZ.`]);
      await this.dialog.say(['¡ESPERE Y VERÁ, QUE YO LO ENCUENTRO!'], { speaker: 'JUAN MACHETE' });
      this.locked = false;
      this.showArea();
      return;
    }
    sfx.play('ultimate');
    await this.dialog.say([g.defeat, `MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.${allCalmed(this.st) ? ' ¡VUELVE CON LA ABUELA ROSA!' : ''}`]);
    await this.dialog.say(['¡QUÉ PELEA TAN BERRACA, PUES! ¡SIGAMOS!'], { speaker: 'JUAN MACHETE' });
    this.locked = false;
    this.showArea();
  }

  private buildingAt(x: number, y: number): MapBuilding | undefined {
    return this.gm.buildings.find((b) => {
      const [bw, bh] = buildingFootprint(b);
      return x >= b.x && x < b.x + bw && y >= b.y && y < b.y + bh;
    });
  }

  private propAt(x: number, y: number): MapProp | undefined {
    return this.gm.props.find((p) => {
      const [pw, ph] = propFootprint(p);
      const x0 = p.x - Math.floor((Math.max(1, pw) - 1) / 2);
      return x >= x0 && x < x0 + Math.max(1, pw) && y > p.y - Math.max(1, ph) && y <= p.y;
    });
  }

  private async interact(): Promise<void> {
    const [dx, dy] = STEP[this.st.facing];
    const tx = this.st.x + dx, ty = this.st.y + dy;
    const npc = this.npcs.find((n) => n.x === tx && n.y === ty);
    this.locked = true;
    if (npc) {
      const before = npc.facing;
      this.faceNpc(npc, OPPOSITE[this.st.facing]);
      if (npc.npc.key === 'abuela') await this.talkAbuela(npc);
      else if (npc.npc.key === 'pescador' && this.gm.kind === 'campo') await this.talkTono(npc);
      else await this.talkVillager(npc);
      this.faceNpc(npc, before);
      this.locked = false;
      return;
    }
    if (this.dogAt.x === tx && this.dogAt.y === ty) {
      sfx.play('ladrido');
      this.tweens.add({ targets: this.dog, y: this.dog.y - 6, duration: 120, yoyo: true, repeat: 1 });
      await this.dialog.say([['FIRULAIS MUEVE LA COLA. ¡QUÉ PERRO TAN FIEL!', 'FIRULAIS LE LAME LA MANO. CON ÉL AL LADO, EL MIEDO ES MENOS.', '¿QUIÉN ES UN PERRO BERRACO? ¡USTED, FIRULAIS!'][this.frame % 3]]);
      this.locked = false;
      return;
    }
    const sign = this.gm.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      await this.dialog.say(sign.lines);
      this.locked = false;
      return;
    }
    const sv = this.spirits.find((s) => s.shown && s.x === tx && s.y === ty);
    if (sv) { await this.spiritMeet(sv); return; }
    const prop = this.propAt(tx, ty);
    if (prop && await this.useProp(prop)) { this.locked = false; return; }
    const b = this.buildingAt(tx, ty);
    if (b && this.st.facing === 'up') {
      const name = buildingName(b);
      await this.dialog.say([...(name ? [name + '.'] : []), interiorOf(b) ? 'LA PUERTA ESTÁ MÁS ALLÁ, EN LA MITAD DE LA FACHADA.' : 'ESTÁ CERRADO. A ESTA HORA NADIE ABRE.']);
    }
    this.locked = false;
  }

  /** Cada aldeano saluda, y si tiene una historia, se la ofrece a Juan. */
  private async talkVillager(n: NpcView): Promise<void> {
    const npc = n.npc;
    if (npc.lines?.length) await this.dialog.say(npc.lines[n.talks % npc.lines.length], { speaker: npc.name });
    n.talks++;
    if (npc.story) {
      const story = STORIES[npc.story];
      const heard = this.st.stories.includes(npc.story);
      const i = await this.dialog.ask(heard ? `¿OTRA VEZ ${story.title}?` : `¿LE CUENTO ${story.title}?`, ['¡CUÉNTEME!', 'OTRO DÍA'], { cancel: 1 });
      if (i === 0) {
        if (story.mood === 'miedo') sfx.play('whisper');
        await this.dialog.say(story.pages, { speaker: npc.name });
        if (!heard) {
          this.st.stories.push(npc.story);
          saveAdventure(this.st);
          sfx.play('confirm');
          await this.dialog.say([`HISTORIAS ESCUCHADAS: ${this.st.stories.length} DE ${STORY_IDS.length}.`]);
        }
      }
    }
    if (npc.action === 'carro') await this.travel();
    else if (npc.action === 'baile') await this.dance();
  }

  /** Cosas del mapa que se pueden usar: el tablado, el castillo de pólvora, la rockola, la silleta… */
  private async useProp(p: MapProp): Promise<boolean> {
    switch (p.kind) {
      case 'tarima': await this.dance(); return true;
      case 'castillo_polvora': await this.fireworks(); return true;
      case 'rockola':
        sfx.play('confirm');
        await this.dialog.say(['JUAN ECHA UNA MONEDA EN LA ROCKOLA... ¡SUENA UNA DE DARÍO GÓMEZ! «NADIE ES ETERNO EN EL MUNDO...»', '¡EL REY DEL DESPECHO! TODA LA CANTINA CANTA EN CORO.']);
        return true;
      case 'silleta': await this.dialog.say(['UNA SILLETA DE CLAVELES, AGAPANTOS Y ASTROMELIAS. ¡HUELE A FERIA DE LAS FLORES!']); return true;
      case 'botero_gorda': case 'botero_caballo': case 'botero_gato':
        await this.dialog.say(['UNA ESCULTURA DE BOTERO, GORDITA Y BRILLANTE DE TANTO QUE LA SOBAN. JUAN LE SOBA LA BARRIGA... ¡PA\' LA SUERTE!']); return true;
      case 'grafiti': await this.dialog.say(['UN MURAL LLENO DE COLORES: UNA ABUELA SONRIENDO, PÁJAROS, FLORES Y LA PALABRA «ESPERANZA».']); return true;
      case 'puesto_arepas': sfx.play('bloom'); await this.dialog.say(['¡UNA AREPA DE CHOCLO CON QUESITO! JUAN SE LA COME DE TRES MORDISCOS. ¡QUÉ DELICIA!']); return true;
      case 'puesto_fruta': sfx.play('bloom'); await this.dialog.say(['MANGO BICHE CON SAL, LIMÓN Y PIMIENTA. ¡JUAN HACE CARA DE ÁCIDO, PERO PIDE OTRO!']); return true;
      case 'fogon_lena': case 'olla': await this.dialog.say(['UN SANCOCHO HIRVIENDO EN EL FOGÓN DE LEÑA. ¡HUELE A DOMINGO EN FAMILIA!']); return true;
      case 'sagrado_corazon': case 'virgen': case 'altar': await this.dialog.say(['JUAN SE PERSIGNA. «QUE DIOS Y LA VIRGEN ME ACOMPAÑEN CONTRA LOS ESPANTOS».']); return true;
      case 'tiple': case 'guitarra': case 'acordeon': await this.dialog.say(['UN INSTRUMENTO COLGADO EN LA PARED. ALGUIEN EN ESTA CASA TOCA MUY BONITO.']); return true;
      case 'mula': sfx.play('ladrido'); await this.dialog.say(['LA MULA LE MUEVE LAS OREJAS A JUAN. FIRULAIS LE LADRA, PERO ELLA NI SE INMUTA.']); return true;
    }
    return false;
  }

  /** Momento alegre: Juan baila en el tablado mientras suena la música y revienta la pólvora. */
  private async dance(): Promise<void> {
    const i = await this.dialog.ask('¿SE ECHA UN BAILECITO?', ['¡CLARO QUE SÍ!', 'ME DA PENA'], { cancel: 1 });
    if (i !== 0) return;
    sfx.setSoundscape('fiesta');
    this.soundNow = 'fiesta';
    const order: Dir[] = ['down', 'right', 'up', 'left'];
    for (let k = 0; k < 16; k++) {
      this.st.facing = order[k % 4];
      this.setHeroFrame();
      this.tweens.add({ targets: this.hero, y: this.hero.y - 6, duration: 110, yoyo: true });
      if (k % 4 === 0) this.faceDog(order[(k + 2) % 4]);
      for (const n of this.npcs) if (Math.abs(n.x - this.st.x) + Math.abs(n.y - this.st.y) < 6) {
        this.faceNpc(n, order[(k + 1) % 4]);
        this.tweens.add({ targets: n.sprite, y: n.sprite.y - 4, duration: 110, yoyo: true });
      }
      await this.wait(250);
    }
    this.st.facing = 'down';
    this.setHeroFrame();
    await this.fireworks(false);
    await this.dialog.say(['¡ESO, JUAN! ¡ASÍ SE BAILA EN ANTIOQUIA!', 'POR UN RATO, NADIE SE ACORDÓ DE LOS ESPANTOS.']);
  }

  /** Castillo de pólvora: voladores de colores encima de la pantalla. */
  private async fireworks(ask = true): Promise<void> {
    if (ask) {
      const i = await this.dialog.ask('¿LE PRENDEMOS LA MECHA AL CASTILLO?', ['¡PRÉNDALO!', 'MEJOR NO'], { cancel: 1 });
      if (i !== 0) return;
    }
    const colors = [0xf84848, 0xf8d048, 0x48c8f8, 0x78f848, 0xf878f8, 0xffffff];
    for (let k = 0; k < 7; k++) {
      sfx.play('polvora');
      const x = 40 + this.rnd() * (GAME_WIDTH - 80), y = 30 + this.rnd() * 60;
      const c = colors[k % colors.length];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const dot = this.add.rectangle(x, y, 2, 2, c).setScrollFactor(0).setDepth(DEPTH_NIGHT + 2);
        this.tweens.add({ targets: dot, x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 34 + 10, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => dot.destroy() });
      }
      this.darkness = Math.max(0.2, this.darkness - 0.15);
      this.cameras.main.flash(80, (c >> 16) & 255, (c >> 8) & 255, c & 255, true);
      await this.wait(330);
    }
    this.updateMood();
  }

  private async talkAbuela(n: NpcView): Promise<void> {
    if (allCalmed(this.st)) {
      if (!this.st.flags.includes('fin')) { await this.ending(); return; }
      await this.dialog.say(['¡GRACIAS A USTED EL PUEBLO DUERME TRANQUILO, JUAN!'], { speaker: 'ABUELA ROSA' });
      return;
    }
    sfx.play('bloom');
    await this.dialog.say(['TÓMESE ESTE CALDITO DE GALLINA PARA EL SUSTO, MIJO.'], { speaker: 'ABUELA ROSA' });
    const left = GUARDIANS.length - this.st.calmed.length;
    n.scared = true;
    await this.dialog.say([`TODAVÍA QUEDAN ${left} MITOS SUELTOS... ACUÉRDESE: SIGA LAS SEÑALES Y PARE LA OREJA.`], { speaker: 'ABUELA ROSA', shake: true });
    n.scared = false;
    saveAdventure(this.st);
  }

  private async talkTono(n: NpcView): Promise<void> {
    if (!this.st.flags.includes('tono')) {
      await this.dialog.say(['AQUÍ PESCANDO BOCACHICOS, MIJO. DICEN QUE DE NOCHE SE OYE LLORAR A UNA MUJER EN EL RÍO... PURO CUENTO, ¿NO?'], { speaker: 'DON TOÑO' });
    } else if (!this.st.calmed.includes('llorona')) {
      await this.bubble(n.sprite, 2, 300);
      await this.dialog.say(['¡NO ME HAGA VOLVER A ESE RÍO! ¡TODAVÍA LA OIGO LLORAR POR LA ORILLA!'], { speaker: 'DON TOÑO', shake: true });
    } else {
      await this.dialog.say(['¿USTED CALMÓ A LA LLORONA, DON JUAN? ¡QUÉ PAISA TAN BERRACO! MAÑANA VUELVO A PESCAR.'], { speaker: 'DON TOÑO' });
    }
  }

  private async ending(): Promise<void> {
    sfx.play('ultimate');
    await this.dialog.say([
      '¡LO LOGRÓ, JUAN! LOS NUEVE MITOS SE CALMARON: YA NO ASUSTAN A NADIE EN EL PUEBLO, EN EL LLANO, EN EL RÍO, EN EL MONTE NI EN LA LAGUNA.',
      'LOS MITOS SON PARTE DE ESTA TIERRA. NO HAY QUE ACABARLOS: HAY QUE RESPETARLOS.',
    ], { speaker: 'ABUELA ROSA' });
    this.st.flags.push('fin');
    saveAdventure(this.st);
    const cam = this.cameras.main;
    const g = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setScrollFactor(0).setDepth(6000);
    await this.tween({ targets: g, fillAlpha: 0.85, duration: 800 });
    const t1 = this.add.bitmapText(GAME_WIDTH / 2, 90, 'font', 'FIN').setScale(3).setOrigin(0.5).setTint(0xf8d048).setScrollFactor(0).setDepth(6001);
    const t2 = this.add.bitmapText(GAME_WIDTH / 2, 130, 'font', 'SAN AGUSTÍN VUELVE A DORMIR EN PAZ').setOrigin(0.5).setScrollFactor(0).setDepth(6001);
    await this.wait(3000);
    await this.tween({ targets: [g, t1, t2], alpha: 0, duration: 600 });
    g.destroy(); t1.destroy(); t2.destroy();
    cam.flash(200);
  }

  private async pauseMenu(): Promise<void> {
    this.locked = true;
    const i = await this.dialog.ask('¿QUÉ QUIERES HACER?', ['ESPANTOS', 'GUARDAR', 'SALIR AL MENÚ', 'VOLVER'], { cancel: 3 });
    if (i === 0) {
      const left = GUARDIANS.filter((g) => !this.st.calmed.includes(g.id)).map((g) => FIGHTERS[g.id].name).join(', ');
      await this.dialog.say([`MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.`, left ? `FALTAN: ${left}. ANDAN ESCONDIDOS: BUSCA SUS SEÑALES.` : '¡YA NO FALTA NINGUNO!',
        `HISTORIAS ESCUCHADAS: ${this.st.stories.length} DE ${STORY_IDS.length}. HABLE CON LA GENTE, ENTRE A LAS CASAS Y A LAS CANTINAS.`]);
    } else if (i === 1) {
      saveAdventure(this.st);
      sfx.play('confirm');
      await this.dialog.say(['PARTIDA GUARDADA.']);
    } else if (i === 2) {
      saveAdventure(this.st);
      this.registry.remove('adventure');
      this.cameras.main.fadeOut(300);
      await this.wait(320);
      this.scene.start('MenuScene');
      return;
    }
    this.locked = false;
  }

  /** Algo se mueve en la hierba alta: Juan se asusta, pero no sale nada. */
  private async rustleEvent(): Promise<void> {
    this.locked = true;
    const tg = this.tallGrass.get(key(this.st.x, this.st.y));
    sfx.play('whisper');
    if (tg) await this.tween({ targets: tg, x: tg.x + 2, duration: 50, yoyo: true, repeat: 5 });
    await Promise.all([this.bubble(this.hero, 2, 500), this.shake(this.hero, 6)]);
    const lines = ['¿QUIÉN ANDA AHÍ?... ¡SALGA, PUES, QUE NO LE TENGO MIEDO!... BUENO, UN POQUITO.', '¡UY! ALGO SE MOVIÓ EN LA HIERBA... DEBE SER UN CONEJO... ¿CIERTO?'];
    await this.dialog.say([lines[Math.floor(this.rnd() * lines.length)]], { speaker: 'JUAN MACHETE', shake: true });
    this.locked = false;
  }

  /** Juan Machete contra el mito, en el combate de lucha y en el escenario de su leyenda. */
  private async startFight(g: Guardian): Promise<void> {
    this.locked = true;
    const id = g.id;
    const fight: AdventureFight = { id, escapes: this.st.escapes[id] ?? 0 };
    this.registry.set('adventureFight', fight);
    setSettings(this, { ...getSettings(this), mode: 'cpu', p1: HERO_FIGHTER, p2: id, stage: g.stage, difficulty: fightDifficulty(this.st) });
    saveAdventure(this.st);
    sfx.play(id === 'silbon' ? 'whistle' : 'screamer');
    const cam = this.cameras.main;
    for (let i = 0; i < 3; i++) {
      cam.flash(90, 255, 255, 255);
      await this.wait(140);
    }
    // persianas negras como en los juegos de bolsillo
    const bars: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 8; i++) {
      const y = i * (GAME_HEIGHT / 8);
      bars.push(this.add.rectangle(i % 2 ? GAME_WIDTH : 0, y, 0, GAME_HEIGHT / 8, 0x000000).setOrigin(i % 2 ? 1 : 0, 0).setScrollFactor(0).setDepth(7000));
    }
    await this.tween({ targets: bars, width: GAME_WIDTH, duration: 450, ease: 'Cubic.in' });
    this.scene.start('FightScene');
  }
}
