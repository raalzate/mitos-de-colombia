import Phaser from 'phaser';
import {
  ARENA_WIDTH, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, LOGIC_FPS, LOGIC_STEP_MS, MAX_HP, MAX_ROUNDS, ROUND_TIME_SECONDS,
} from '../config/game-config';
import type { Facing, FighterId, InputState, MatchSettings, PlayerSlot, RoundWinner, UltimateStyle } from '../combat/CombatTypes';
import { EMPTY_INPUT } from '../combat/CombatTypes';
import {
  applyRoundResult, emptyScore, forcedWinner, framesToDisplaySeconds, matchWinner, resolveHit, resolveRoundEnd, type Score,
} from '../combat/CombatRules';
import { CombatSystem, type HitEvent } from '../combat/CombatSystem';
import { Fighter, type EffectRequest } from '../entities/Fighter';
import { SpecBehavior } from '../entities/SpecBehavior';
import type { Projectile } from '../entities/Projectile';
import { FighterAI } from '../ai/FighterAI';
import { CombatHUD } from '../ui/CombatHUD';
import { FIGHTERS, specialHint } from '../data/fighters';
import { ORIGIN_Y } from '../art/CharacterArtist';
import { splashPose, splashPoseIndex, type SplashPose } from '../art/SplashPose';
import { WALK_STRIDE_PX, drawnAnimKey, drawnFrame, drawnMotion, frameCenterY, hitShake, standHeight, stripAnchor, walkPhase } from '../art/DrawnAnim';
import { DRAWN_ANIM } from '../art/drawnAnimManifest';
import { DRAWN_FX_FRAMES, drawnFxFor, drawnFxMotion, type DrawnFxKind } from '../art/DrawnFx';
import { sfx, type SfxName } from '../audio/Sfx';
import { isMacheteAttack } from '../audio/Samples';
import { SCARE_COOLDOWN, shouldRandomScare, tension } from '../combat/Fear';
import { playScreamer } from '../ui/Screamer';
import { FINISH_FRAMES, bloodDrops, cpuWantsFatality, finishPrompt, isFatalityInput } from '../combat/Finish';
import { LOOKS } from '../art/CharacterArtist';
import { MENU_KEYS, MenuInput, getSettings, inputManager, toggleFullscreen } from '../utils/game';
import { ANIM_TABLES, ensureCharacterSheet, ensureStage, portraitKey, splashKey, text, type StageKeys } from '../utils/textures';
import { STAGES, STAGE_IDS, type StageId, type StageTheme } from '../art/StageArtist';
import type { ResultData } from './ResultScene';
import { TwoButtonReader, toInput } from '../combat/TwoButton';
import { pickLine, wantsBanter } from '../combat/Banter';
import { pickDuel, type DuelLine } from '../combat/Duels';
import { canUseUltimate } from '../combat/CombatRules';
import type { AdventureFight } from '../adventure/State';
import { fleeFightChance } from '../adventure/Hunt';

/** fotogramas de la presentación VS y de cada frase de la charla de reto */
const VS_FRAMES = 90;
const DUEL_STEP = 110;

type Phase = 'intro' | 'fight' | 'finish' | 'roundEnd' | 'matchEnd' | 'flee';

interface FighterView {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  key: string;
  flash: number;
  /** true: arte dibujado de cuerpo entero animado por transformaciones */
  drawn: boolean;
  /** pose suavizada actual (modo dibujado) */
  pose: SplashPose;
  lastFootfallIndex: number;
  /** aterrizaje: si estaba en el suelo el paso anterior y paso lógico en que aterrizó (-1 = no) */
  wasGrounded: boolean;
  landAt: number;
  /** aturdimiento al recibir el golpe (para el retroceso) */
  stunStart: number;
  /** distancia andada acumulada para el ciclo de andar por distancia */
  walkDist: number;
  lastX: number;
  /** giro: paso lógico en que empezó el estrechamiento al cambiar de lado (-1 = sin giro), y lado anterior */
  turn: number;
  lastFacing: number;
  /** último paso lógico renderizado: los fundidos avanzan por paso lógico, no por refresco del monitor */
  lastRenderLf: number;
  /** identificador y paleta del arte dibujado (para elegir la textura de pose) */
  id: FighterId;
  pal: 'p1' | 'p2';
}

interface Cinematic {
  attacker: Fighter;
  defender: Fighter;
  frame: number;
  startX: number;
  style: UltimateStyle;
  tint: number;
  hold: Phaser.GameObjects.Sprite | null;
  attackerStartX: number;
}

interface TimedFx {
  obj: Phaser.GameObjects.GameObject;
  frames: number;
}

/** Efecto dibujado (imagen fija animada por transformación). */
interface DrawnFxView {
  sp: Phaser.GameObjects.Image;
  kind: DrawnFxKind;
  frame: number;
  total: number;
  flip: boolean;
  scale: number;
  /** si sigue a un proyectil, no se destruye por tiempo */
  projectile: boolean;
}

const START_X: Record<PlayerSlot, number> = { 1: 190, 2: 370 };
const ARENA_MARGIN_SAFE = 30;

export class FightScene extends Phaser.Scene {
  private settings!: MatchSettings;
  private p1!: Fighter;
  private p2!: Fighter;
  private views!: Record<PlayerSlot, FighterView>;
  private combat!: CombatSystem;
  private ai: FighterAI | null = null;
  private readers: Record<PlayerSlot, TwoButtonReader> = { 1: new TwoButtonReader(), 2: new TwoButtonReader() };
  private hud!: CombatHUD;
  private menu = new MenuInput();

  private phase: Phase = 'intro';
  private phaseFrame = 0;
  /** modo aventura: el mito ya intentó volarse en este combate */
  private fleeTried = false;
  private score: Score = emptyScore();
  private roundNumber = 0;
  private timerFrames = ROUND_TIME_SECONDS * LOGIC_FPS;
  private lastShownSecond = ROUND_TIME_SECONDS;
  private roundWinner: RoundWinner | null = null;
  private matchWinnerSlot: PlayerSlot | null = null;
  private paused = false;
  private accumulator = 0;
  private logicFrame = 0;
  private cinematic: Cinematic | null = null;
  private overlayTarget = 0;
  private timedFx: TimedFx[] = [];
  private drawnFx: DrawnFxView[] = [];
  private projectileSprites = new Map<number, Phaser.GameObjects.Sprite | Phaser.GameObjects.Image>();
  private debugHitboxes = false;

  private stageId: StageId = 'ribera';
  private theme: StageTheme = STAGES.ribera;
  private stageTex!: StageKeys;
  private clouds!: Phaser.GameObjects.TileSprite;
  private river!: Phaser.GameObjects.Image;
  private mist!: Phaser.GameObjects.TileSprite;
  private lightningRect: Phaser.GameObjects.Rectangle | null = null;
  private lightningFrames = 0;
  private vsGroup: Phaser.GameObjects.GameObject[] = [];
  /** susto en curso: la lógica queda en pausa mientras dura */
  private scaring = false;
  private scareUsedRound = false;
  private framesSinceScare = SCARE_COOLDOWN;
  /** globo de texto de quien está hablando (solo uno a la vez) */
  private bubble: { box: Phaser.GameObjects.Container; slot: PlayerSlot; life: number } | null = null;
  private framesSinceBanter = 0;
  /** conversación de reto antes de la primera ronda */
  private duel: DuelLine[] = [];
  private lastLine: Record<PlayerSlot, string> = { 1: '', 2: '' };
  private finalScareDone = false;
  private bloodR!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodL!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splats: Phaser.GameObjects.Image[] = [];
  /** la CPU decide una vez por remate si hace la fatalidad */
  private cpuFatality: boolean | null = null;
  private message!: Phaser.GameObjects.BitmapText;
  private subMessage!: Phaser.GameObjects.BitmapText;
  private overlay!: Phaser.GameObjects.Rectangle;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.BitmapText;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private leafEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dropEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private emberEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private onBlur = () => this.setPaused(true);

  constructor() {
    super('FightScene');
  }

  create(): void {
    this.settings = getSettings(this);
    this.resetState();
    this.buildStage();
    this.buildFighters();
    this.buildUi();

    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);

    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur);
      this.anims.resumeAll();
      this.projectileSprites.clear();
      this.timedFx = [];
      this.drawnFx = [];
      this.cinematic = null;
    });

    this.startRound();
  }

  private resetState(): void {
    this.fleeTried = false;
    this.phase = 'intro';
    this.phaseFrame = 0;
    this.score = emptyScore();
    this.roundNumber = 0;
    this.roundWinner = null;
    this.matchWinnerSlot = null;
    this.paused = false;
    this.accumulator = 0;
    this.logicFrame = 0;
    this.cinematic = null;
    this.overlayTarget = 0;
    this.timedFx = [];
    this.drawnFx = [];
    this.projectileSprites = new Map();
    this.debugHitboxes = false;
    this.menu = new MenuInput();
    this.scaring = false;
    this.scareUsedRound = false;
    this.framesSinceScare = SCARE_COOLDOWN;
    this.finalScareDone = false;
  }

  /* ------------------------------------------------------------------ */
  /* Construcción                                                        */
  /* ------------------------------------------------------------------ */

  private buildStage(): void {
    const choice = this.settings.stage;
    this.stageId = choice === 'random' ? STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)] : choice;
    this.theme = STAGES[this.stageId];
    sfx.setSoundscape(this.stageId);
    const k = ensureStage(this, this.stageId);
    this.stageTex = k;
    this.add.image(0, 0, k.sky).setOrigin(0).setScrollFactor(0).setDepth(0);
    this.clouds = this.add.tileSprite(0, 8, GAME_WIDTH, 90, k.clouds).setOrigin(0).setScrollFactor(0).setDepth(1);
    this.add.image(-60, 60, k.far).setOrigin(0).setScrollFactor(0.25).setDepth(2);
    this.river = this.add.image(-40, 150, k.river(0)).setOrigin(0).setScrollFactor(0.4).setDepth(3);
    this.add.image(-60, 88, k.mid).setOrigin(0).setScrollFactor(0.6).setDepth(4);
    this.mist = this.add.tileSprite(0, 152, GAME_WIDTH, 40, k.mist).setOrigin(0).setScrollFactor(0).setDepth(5).setAlpha(this.theme.mist.alpha);
    this.add.image(-40, GROUND_Y - 40, k.ground).setOrigin(0).setScrollFactor(1).setDepth(6);
    this.add.image(-60, GAME_HEIGHT - 38, k.fore).setOrigin(0).setScrollFactor(1.2).setDepth(30);
    this.lightningRect = this.theme.lightning
      ? this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff0ff, 1).setOrigin(0).setScrollFactor(0).setDepth(2.5).setAlpha(0)
      : null;
    this.lightningFrames = 0;

    this.buildAmbient();

    this.leafEmitter = this.add.particles(0, 0, 'p_leaf', {
      speed: { min: 30, max: 90 },
      angle: { min: 200, max: 340 },
      gravityY: 120,
      lifespan: { min: 400, max: 900 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    }).setDepth(25);
    this.dropEmitter = this.add.particles(0, 0, 'p_drop', {
      speed: { min: 40, max: 110 },
      angle: { min: 200, max: 340 },
      gravityY: 240,
      lifespan: { min: 300, max: 700 },
      emitting: false,
    }).setDepth(25);
    this.emberEmitter = this.add.particles(0, 0, 'p_ember', {
      speed: { min: 20, max: 80 },
      angle: { min: 220, max: 320 },
      gravityY: -60,
      lifespan: { min: 300, max: 800 },
      tint: [0xffb040, 0xff6020, 0xfff0a0],
      emitting: false,
    }).setDepth(26);
    // sangre: hacia delante del atacante (dos emisores, uno por lado)
    const bloodCfg = (angle: { min: number; max: number }) => ({
      speed: { min: 70, max: 230 }, angle, gravityY: 560, lifespan: { min: 600, max: 1200 },
      scale: { start: 2, end: 1 }, emitting: false,
    });
    this.bloodR = this.add.particles(0, 0, 'p_blood', bloodCfg({ min: -75, max: 5 })).setDepth(24);
    this.bloodL = this.add.particles(0, 0, 'p_blood', bloodCfg({ min: 175, max: 255 })).setDepth(24);
    this.splats = [];
    this.sparkEmitter = this.add.particles(0, 0, 'p_spark', {
      speed: { min: 40, max: 140 },
      gravityY: 160,
      lifespan: { min: 150, max: 400 },
      tint: [0xffffff, 0xffd040, 0xff7030],
      emitting: false,
    }).setDepth(26);
  }

  /** Partículas ambientales según el tema del escenario. */
  private buildAmbient(): void {
    const t = this.theme;
    const common = { x: { min: 0, max: ARENA_WIDTH }, alpha: { start: 1, end: 0, ease: 'Sine.easeInOut' }, quantity: 1 };
    switch (t.ambient) {
      case 'fly':
        this.add.particles(0, 0, 'p_fly', {
          ...common, y: { min: 100, max: 190 }, lifespan: { min: 2000, max: 4000 },
          speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 4 }, frequency: 400, maxParticles: 14, tint: t.ambientTint,
        }).setDepth(7);
        break;
      case 'ember':
        this.add.particles(0, 0, 'p_ember', {
          ...common, y: { min: 150, max: 210 }, lifespan: { min: 1500, max: 3200 },
          speedX: { min: -10, max: 14 }, speedY: { min: -30, max: -12 }, frequency: 90, maxParticles: 40,
          tint: [0xffb040, 0xff6020, 0xfff0a0], scale: { start: 1, end: 0.4 },
        }).setDepth(7);
        this.add.particles(0, 0, 'p_ember', {
          x: { min: 0, max: ARENA_WIDTH }, y: -4, lifespan: { min: 2500, max: 4000 }, alpha: { start: 0.9, end: 0 },
          speedX: { min: -6, max: 6 }, speedY: { min: 10, max: 24 }, frequency: 160, maxParticles: 24, tint: 0x3a2020, quantity: 1,
        }).setDepth(29);
        break;
      case 'leaf':
        this.add.particles(0, 0, 'p_leaf', {
          ...common, y: -6, lifespan: { min: 3000, max: 5000 }, speedX: { min: -14, max: 6 }, speedY: { min: 10, max: 22 },
          rotate: { min: 0, max: 360 }, frequency: 350, maxParticles: 16, tint: t.ambientTint,
        }).setDepth(29);
        break;
      case 'drop':
        this.add.particles(0, 0, 'p_drop', {
          ...common, y: -6, lifespan: { min: 700, max: 1000 }, speedX: -20, speedY: 260, frequency: 25, maxParticles: 60, tint: t.ambientTint,
        }).setDepth(29);
        break;
      case 'none':
        break;
    }
  }

  private spriteKey(slot: PlayerSlot): string {
    const id = slot === 1 ? this.settings.p1 : this.settings.p2;
    const mirror = this.settings.p1 === this.settings.p2;
    return ensureCharacterSheet(this, id, slot === 2 && mirror ? 'p2' : 'p1');
  }

  private buildFighters(): void {
    this.p1 = new Fighter(1, FIGHTERS[this.settings.p1], START_X[1], 1);
    this.p2 = new Fighter(2, FIGHTERS[this.settings.p2], START_X[2], -1);
    for (const f of [this.p1, this.p2]) {
      f.behavior = new SpecBehavior();
      f.events = {
        sound: (n) => this.fighterSound(f, n),
        effect: (e) => this.spawnEffect(e, f.stats.id),
        projectile: (p) => this.combat.spawnProjectile(p),
      };
    }
    this.combat = new CombatSystem(this.p1, this.p2, {
      onHit: (e) => this.onHit(e),
      onUltimateConnect: (a, d) => this.startCinematic(a, d),
      onProjectileSpawn: (p) => this.onProjectileSpawn(p),
      onProjectileEnd: (p, reason) => this.onProjectileEnd(p, reason),
    });
    this.ai = this.settings.mode === 'cpu' ? new FighterAI(this.p2, this.p1, this.settings.difficulty) : null;
    inputManager.setGamepadEnabled(2, this.settings.mode === 'versus');

    const mk = (slot: PlayerSlot): FighterView => {
      const key = this.spriteKey(slot);
      const shadow = this.add.image(0, GROUND_Y, 'white').setOrigin(0.5).setTint(0x000000).setAlpha(0.35).setDepth(8).setScale(14, 2);
      const id = slot === 1 ? this.settings.p1 : this.settings.p2;
      const pal = slot === 2 && mirror ? 'p2' : 'p1';
      const splash = this.settings.art === 'drawn' ? splashKey(this, id, pal, 72) : null;
      const pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
      if (splash) {
        const sprite = this.add.sprite(0, 0, splash).setOrigin(0.5, 1).setDepth(slot === 1 ? 11 : 10);
        return { sprite, shadow, key, flash: 0, drawn: true, id, pal, pose, walkDist: 0, lastX: 0, lastFootfallIndex: -1, wasGrounded: true, landAt: -1, stunStart: 0, turn: -1, lastFacing: slot === 1 ? 1 : -1, lastRenderLf: -1 };
      }
      const sprite = this.add.sprite(0, 0, key, 0).setOrigin(0.5, ORIGIN_Y).setDepth(slot === 1 ? 11 : 10);
      return { sprite, shadow, key, flash: 0, drawn: false, id, pal, pose, walkDist: 0, lastX: 0, lastFootfallIndex: -1, wasGrounded: true, landAt: -1, stunStart: 0, turn: -1, lastFacing: slot === 1 ? 1 : -1, lastRenderLf: -1 };
    };
    const mirror = this.settings.p1 === this.settings.p2;
    this.views = { 1: mk(1), 2: mk(2) };
  }

  private buildUi(): void {
    const mirror = this.settings.p1 === this.settings.p2;
    this.hud = new CombatHUD(this, this.p1, this.p2, portraitKey(this, this.settings.p1, 'p1', 24), portraitKey(this, this.settings.p2, mirror ? 'p2' : 'p1', 24));
    const hint = (slot: PlayerSlot) => specialHint(slot === 1 ? this.settings.p1 : this.settings.p2, 'Z', 'X');
    this.hud.setHints(hint(1), this.settings.mode === 'cpu' ? 'CPU: ' + FIGHTERS[this.settings.p2].name : hint(2));

    this.overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05030a, 1).setOrigin(0).setScrollFactor(0).setDepth(15).setAlpha(0);
    this.flashRect = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1).setOrigin(0).setScrollFactor(0).setDepth(90).setAlpha(0);
    this.message = text(this, GAME_WIDTH / 2, 96, '', 2, 0xf8d048).setScrollFactor(0).setDepth(110);
    this.subMessage = text(this, GAME_WIDTH / 2, 120, '', 1, 0xf8f0c8).setScrollFactor(0).setDepth(110);
    this.pauseText = text(this, GAME_WIDTH / 2, 110, 'PAUSA\n\nENTER: CONTINUAR\nESC: MENÚ', 1, 0xf8f0c8)
      .setScrollFactor(0).setDepth(120).setVisible(false).setCenterAlign();
    this.debugGfx = this.add.graphics().setDepth(80);
    this.buildVersusIntro();
  }

  /** Pantalla "VS" con el arte de cuerpo entero de ambos luchadores, antes de la primera ronda. */
  private buildVersusIntro(): void {
    const mirror = this.settings.p1 === this.settings.p2;
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07060d, 0.82).setOrigin(0).setScrollFactor(0).setDepth(115);
    const band = this.add.rectangle(0, 92, GAME_WIDTH, 40, 0x2a0c14, 0.9).setOrigin(0).setScrollFactor(0).setDepth(115);
    const objs: Phaser.GameObjects.GameObject[] = [bg, band];
    const place = (slot: PlayerSlot) => {
      const id = slot === 1 ? this.settings.p1 : this.settings.p2;
      const pal = slot === 2 && mirror ? 'p2' : 'p1';
      const x = slot === 1 ? 96 : GAME_WIDTH - 96;
      const sk = splashKey(this, id, pal, 128);
      if (sk) {
        objs.push(this.add.image(x, 118, sk).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(116).setFlipX(slot === 2));
      } else {
        objs.push(this.add.image(x, 110, portraitKey(this, id, pal, 96)).setOrigin(0.5).setScrollFactor(0).setDepth(116).setFlipX(slot === 2));
      }
      const name = FIGHTERS[id].name;
      const label = slot === 1 ? 'JUGADOR 1' : this.settings.mode === 'cpu' ? 'CPU' : 'JUGADOR 2';
      objs.push(text(this, x, 196, name, 1, slot === 1 ? 0xf8d048 : 0x80c8ff).setScrollFactor(0).setDepth(117));
      objs.push(text(this, x, 208, label, 1, 0xe8e8f0).setScrollFactor(0).setDepth(117).setAlpha(0.8));
    };
    place(1);
    place(2);
    objs.push(text(this, GAME_WIDTH / 2, 112, 'VS', 3, 0xf05060).setScrollFactor(0).setDepth(117));
    objs.push(text(this, GAME_WIDTH / 2, 20, this.theme.name.toUpperCase(), 1, 0xf8f0c8).setScrollFactor(0).setDepth(117));
    objs.push(text(this, GAME_WIDTH / 2, 32, this.theme.subtitle.toUpperCase(), 1, 0x9088b0).setScrollFactor(0).setDepth(117).setAlpha(0.9));
    this.vsGroup = objs;
    this.hud.setVisible(false);
  }

  private updateVersusIntro(): void {
    if (!this.vsGroup.length) return;
    const f = this.phaseFrame;
    const fade = f > 70 ? Math.max(0, 1 - (f - 70) / 20) : 1;
    for (const o of this.vsGroup) (o as Phaser.GameObjects.Image).setAlpha(fade);
    if (fade <= 0) {
      for (const o of this.vsGroup) o.destroy();
      this.vsGroup = [];
      this.hud.setVisible(true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Flujo de rondas                                                     */
  /* ------------------------------------------------------------------ */

  private startRound(): void {
    this.hideBubble();
    this.framesSinceBanter = 0;
    this.readers[1].reset();
    this.readers[2].reset();
    this.roundNumber++;
    this.scareUsedRound = false;
    this.phase = 'intro';
    this.phaseFrame = 0;
    this.timerFrames = ROUND_TIME_SECONDS * LOGIC_FPS;
    this.lastShownSecond = ROUND_TIME_SECONDS;
    this.roundWinner = null;
    this.cinematic = null;
    this.overlayTarget = 0;
    this.combat.clearProjectiles();
    for (const fx of this.timedFx) fx.obj.destroy();
    this.timedFx = [];
    this.p1.resetForRound(START_X[1], 1);
    this.p2.resetForRound(START_X[2], -1);
    this.views[1].flash = 0;
    this.views[2].flash = 0;
    this.hud.resetDelayed();
    if (this.roundNumber > 1) this.showMessage(this.roundNumber >= 3 ? 'RONDA FINAL' : `RONDA ${this.roundNumber}`, '');
    sfx.play('round');
  }

  private showMessage(main: string, sub: string): void {
    this.message.setText(main);
    this.subMessage.setText(sub);
    this.message.setVisible(true);
    this.subMessage.setVisible(true);
  }

  private hideMessage(): void {
    this.message.setVisible(false);
    this.subMessage.setVisible(false);
  }

  private endRound(winner: RoundWinner): void {
    this.hideBubble();
    this.phase = 'roundEnd';
    this.phaseFrame = 0;
    this.roundWinner = winner;
    this.score = applyRoundResult(this.score, winner);
    this.combat.clearProjectiles();
    const ko = this.p1.hp <= 0 || this.p2.hp <= 0;
    if (ko) {
      sfx.play('ko');
      this.cameras.main.shake(300, 0.01);
      this.showMessage('K.O.', '');
    } else if (winner === 'draw') {
      this.showMessage('TIEMPO', 'EMPATE');
    } else {
      this.showMessage('TIEMPO', '');
    }
    this.matchWinnerSlot = matchWinner(this.score);
    if (!this.matchWinnerSlot && this.score.roundsPlayed >= MAX_ROUNDS) {
      this.matchWinnerSlot = forcedWinner(this.score, this.p1.hp, this.p2.hp);
    }
    // KO que decide el combate: ventana de remate al estilo Mortal Kombat
    if (ko && this.matchWinnerSlot && (this.matchWinnerSlot === 1 ? this.p2 : this.p1).hp <= 0) {
      this.phase = 'finish';
      this.phaseFrame = 0;
      this.cpuFatality = null;
    }
  }

  /** «¡ACÁBALO!»: el ganador tiene unos segundos para hacer la fatalidad. */
  private stepFinish(): void {
    this.p1.update(EMPTY_INPUT);
    this.p2.update(EMPTY_INPUT);
    const slot = this.matchWinnerSlot!;
    const winner = slot === 1 ? this.p1 : this.p2;
    const loser = slot === 1 ? this.p2 : this.p1;
    const start = 50;
    if (this.phaseFrame === start) {
      this.showMessage(finishPrompt(LOOKS[loser.stats.id].female), 'DEFINITIVO O GOLPE FUERTE: FATALIDAD');
      sfx.play('sting');
    }
    if (this.phaseFrame < start) return;
    const t = this.phaseFrame - start;
    this.message.setVisible(Math.floor(t / 12) % 2 === 0);
    const isCpu = this.settings.mode === 'cpu' && slot === 2;
    let go = false;
    if (isCpu) {
      if (this.cpuFatality === null) this.cpuFatality = cpuWantsFatality(this.settings.difficulty, Math.random());
      go = this.cpuFatality && t === 70;
    } else {
      const p = inputManager.snapshot(slot).pressed;
      go = isFatalityInput({ ultimate: p.ultimate, heavy: p.heavy, heavykick: p.heavykick });
    }
    if (go) {
      this.fatality(winner, loser, slot);
      return;
    }
    if (t >= FINISH_FRAMES) {
      // no remató: sigue el final normal (con el susto de la cara del ganador)
      this.message.setVisible(true);
      this.showMessage('K.O.', '');
      this.phase = 'roundEnd';
      this.phaseFrame = 30;
    }
  }

  /** FATALIDAD: chorro de sangre, manchas, golpe de tensión y la cara del ganador. */
  private fatality(winner: Fighter, loser: Fighter, slot: PlayerSlot): void {
    this.message.setVisible(true);
    this.showMessage('FATALIDAD', winner.stats.name);
    winner.setState('victory');
    sfx.play('heavy');
    sfx.play('sting');
    this.cameras.main.shake(500, 0.02);
    this.flashRect.setFillStyle(0x900000).setAlpha(0.6);
    // fuente de sangre durante ~1 s desde el cuerpo del rival
    const by = loser.y - 14;
    this.time.addEvent({
      delay: 80,
      repeat: 12,
      callback: () => {
        this.bleed(loser.x + Phaser.Math.Between(-6, 6), by, 1, 14, 1);
        this.bleed(loser.x + Phaser.Math.Between(-6, 6), by, -1, 14, 1);
      },
    });
    this.finalScareDone = true;
    this.time.delayedCall(1100, () => {
      this.flashRect.setFillStyle(0xffffff);
      this.triggerScare(slot);
    });
    this.phase = 'roundEnd';
    this.phaseFrame = 40;
  }

  /* ------------------------------------------------------------------ */
  /* Bucle                                                               */
  /* ------------------------------------------------------------------ */

  override update(_time: number, delta: number): void {
    if (this.scaring) {
      this.accumulator = 0;
      return;
    }
    this.accumulator += Math.min(delta, 250);
    let steps = 0;
    while (this.accumulator >= LOGIC_STEP_MS && steps < 5) {
      this.logicStep();
      this.accumulator -= LOGIC_STEP_MS;
      steps++;
    }
    if (steps >= 5) this.accumulator = 0;
    this.render();
  }

  private setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    this.pauseText.setVisible(p);
    if (p) this.anims.pauseAll();
    else this.anims.resumeAll();
    if (p) inputManager.clearAll();
  }

  private logicStep(): void {
    inputManager.update();
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    if (this.menu.pressed(MENU_KEYS.debug)) this.debugHitboxes = !this.debugHitboxes;
    if (this.menu.pressed(['Enter'])) this.setPaused(!this.paused);
    if (this.menu.pressed(['Escape'])) {
      if (this.paused) {
        this.registry.remove('adventureFight');
        this.registry.remove('adventure');
        this.scene.start('MenuScene');
        return;
      }
      this.setPaused(true);
    }
    if (this.paused) return;

    this.logicFrame++;
    this.phaseFrame++;
    for (let i = this.timedFx.length - 1; i >= 0; i--) {
      const fx = this.timedFx[i];
      fx.frames--;
      if (fx.frames <= 0) {
        fx.obj.destroy();
        this.timedFx.splice(i, 1);
      }
    }
    for (const v of [this.views[1], this.views[2]]) if (v.flash > 0) v.flash--;
    for (const f of this.drawnFx) {
      const m = drawnFxMotion(f.kind, f.frame++);
      f.sp.setAngle(m.rot * (f.flip ? -1 : 1)).setScale(f.scale * m.sx, f.scale * m.sy).setAlpha(f.projectile ? 1 : m.alpha);
      if (!f.projectile && f.frame > f.total) f.sp.destroy();
    }
    this.drawnFx = this.drawnFx.filter((f) => f.sp.active);

    switch (this.phase) {
      case 'intro': {
        this.p1.update(EMPTY_INPUT);
        this.p2.update(EMPTY_INPUT);
        if (this.roundNumber === 1 && this.phaseFrame === 1) this.duel = pickDuel(this.settings.p1, this.settings.p2, Math.random());
        const chatEnd = VS_FRAMES + (this.roundNumber === 1 ? this.duel.length * DUEL_STEP : 0);
        const delay = this.roundNumber === 1 ? chatEnd : 0;
        this.updateVersusIntro();
        if (this.roundNumber === 1 && this.phaseFrame > VS_FRAMES && this.phaseFrame < chatEnd) {
          const i = (this.phaseFrame - VS_FRAMES) / DUEL_STEP;
          if (Number.isInteger(i)) this.say(this.duel[i].who === 'p1' ? 1 : 2, this.duel[i].text, DUEL_STEP - 8);
          this.ageBubble();
          // los niños impacientes saltan la charla con cualquiera de los dos botones
          const pad = inputManager.snapshot(1).pressed;
          if (this.phaseFrame > VS_FRAMES + 20 && (pad.light || pad.lightkick)) {
            this.hideBubble();
            this.phaseFrame = chatEnd;
          }
        }
        if (this.phaseFrame === chatEnd) this.hideBubble();
        if (this.phaseFrame === delay + 1 && this.roundNumber === 1) this.showMessage('RONDA 1', '');
        if (this.phaseFrame === delay + 60) {
          this.showMessage('¡LUCHA!', '');
          sfx.play('confirm');
        }
        if (this.phaseFrame >= delay + 100) {
          this.phase = 'fight';
          this.phaseFrame = 0;
          this.hideMessage();
        }
        break;
      }
      case 'fight':
        this.stepFight();
        break;
      case 'finish':
        this.stepFinish();
        break;
      case 'roundEnd':
        this.stepRoundEnd();
        break;
      case 'flee':
        this.stepFlee();
        break;
      case 'matchEnd':
        this.p1.update(EMPTY_INPUT);
        this.p2.update(EMPTY_INPUT);
        if (this.phaseFrame >= 110) this.goToResult();
        break;
    }
    this.hud.update(framesToDisplaySeconds(this.timerFrames, LOGIC_FPS), this.score, this.logicFrame);
    this.framesSinceScare++;
    if (this.phase === 'fight') sfx.setTension(tension(this.p1.hp, this.p2.hp, framesToDisplaySeconds(this.timerFrames, LOGIC_FPS)));
  }

  /** De lejos, de vez en cuando, uno de los dos dice algo al azar en un globo. */
  /** El globo abierto sigue al que habla y se apaga solo; devuelve true si sigue abierto. */
  private ageBubble(): boolean {
    if (!this.bubble) return false;
    const f = this.bubble.slot === 1 ? this.p1 : this.p2;
    const b = this.bubble;
    b.life--;
    if (b.life <= 0 || f.state === 'hitstun' || f.state === 'knockdown') { this.hideBubble(); return false; }
    this.placeBubble(b.box, f);
    b.box.setAlpha(Math.min(1, b.life / 20));
    return true;
  }

  private updateBanter(): void {
    this.framesSinceBanter++;
    if (this.bubble) { this.ageBubble(); return; }
    const calm = (f: Fighter) => ['idle', 'walk', 'crouch', 'block', 'jump'].includes(f.state);
    if (!calm(this.p1) || !calm(this.p2)) return;
    if (!wantsBanter(Math.abs(this.p1.x - this.p2.x), this.framesSinceBanter, Math.random())) return;
    const slot: PlayerSlot = Math.random() < 0.5 ? 1 : 2;
    const f = slot === 1 ? this.p1 : this.p2;
    const line = pickLine(f.stats.id, Math.random(), this.lastLine[slot]);
    this.lastLine[slot] = line;
    this.say(slot, line);
  }

  private say(slot: PlayerSlot, line: string, life = 150): void {
    this.hideBubble();
    const f = slot === 1 ? this.p1 : this.p2;
    const t = this.add.bitmapText(0, 0, 'font_plain', line).setMaxWidth(118).setTint(0x201418).setOrigin(0.5, 1);
    const w = Math.ceil(t.width) + 10, h = Math.ceil(t.height) + 8;
    t.setPosition(0, -10);
    const g = this.add.graphics();
    g.fillStyle(0xfff8e8, 1).fillRoundedRect(-w / 2, -h - 6, w, h, 4);
    g.lineStyle(1, 0x201418, 1).strokeRoundedRect(-w / 2, -h - 6, w, h, 4);
    // colita del globo hacia la cabeza de quien habla
    g.fillStyle(0xfff8e8, 1).fillTriangle(-4, -7, 4, -7, 0, 0);
    g.lineStyle(1, 0x201418, 1).lineBetween(-4, -6, 0, 0).lineBetween(4, -6, 0, 0);
    const box = this.add.container(0, 0, [g, t]).setDepth(30).setData('w', w);
    this.placeBubble(box, f);
    box.setScale(0.6);
    this.tweens.add({ targets: box, scale: 1, duration: 140, ease: 'Back.out' });
    this.bubble = { box, slot, life };
    this.framesSinceBanter = 0;
  }

  /** Encima de la cabeza, sin salirse de la pantalla. */
  private placeBubble(box: Phaser.GameObjects.Container, f: Fighter): void {
    const cam = this.cameras.main;
    const half = (box.getData('w') as number) / 2 + 4;
    const x = Phaser.Math.Clamp(f.x, cam.scrollX + half, cam.scrollX + GAME_WIDTH - half);
    box.setPosition(Math.round(x), Math.round(f.y - standHeight(f.stats.id) - 6));
  }

  private hideBubble(): void {
    this.bubble?.box.destroy();
    this.bubble = null;
  }

  /** Dos botones (golpe y patada): lo fuerte, los poderes y el definitivo salen por combinaciones. */
  private twoButton(slot: PlayerSlot, f: Fighter, opp: Fighter): InputState {
    const raw = inputManager.snapshot(slot);
    const r = this.readers[slot];
    const intent = r.update(raw.light, raw.lightkick, canUseUltimate(f.meter));
    const back = f.facing === 1 ? raw.left : raw.right;
    const threatened = opp.isAttacking() || this.combat.projectiles.some((p) => p.owner !== slot && Math.abs(p.x - f.x) < 140);
    // poder cargado: chispas alrededor del luchador para que el niño sepa que ya puede soltar
    if (r.charge >= 1 && this.logicFrame % 6 === 0) this.sparkEmitter.explode(3, f.x + (Math.random() - 0.5) * 30, f.y - 20 - Math.random() * 40);
    return toInput(raw, intent, back, threatened);
  }

  private stepFight(): void {
    if (this.cinematic) {
      this.updateCinematic();
    } else {
      const in1: InputState = this.twoButton(1, this.p1, this.p2);
      const in2: InputState = this.ai ? this.ai.update() : this.twoButton(2, this.p2, this.p1);
      const before = [this.p1.attack, this.p2.attack];
      this.p1.update(in1);
      this.p2.update(in2);
      if (this.p1.attack && this.p1.attack !== before[0]) this.readers[1].consume();
      if (this.p2.attack && this.p2.attack !== before[1]) this.readers[2].consume();
      this.combat.step();
      this.timerFrames--;
      const sec = framesToDisplaySeconds(this.timerFrames, LOGIC_FPS);
      if (sec !== this.lastShownSecond) {
        this.lastShownSecond = sec;
        if (sec <= 10 && sec > 0) sfx.play('timer');
      }
    }
    if (this.cinematic) return;
    const lowest = Math.min(this.p1.hp, this.p2.hp);
    if (shouldRandomScare({ enabled: this.settings.scares, usedThisRound: this.scareUsedRound, lowestHp: lowest, framesSinceLast: this.framesSinceScare }, Math.random())) {
      this.scareUsedRound = true;
      // la cara del que está ganando: el monstruo que está a punto de acabar contigo
      this.triggerScare(this.p1.hp >= this.p2.hp ? 1 : 2);
      return;
    }
    this.updateBanter();
    if (this.tryFlee()) return;
    const winner = resolveRoundEnd(this.p1.hp, this.p2.hp, this.timerFrames);
    if (winner !== null) this.endRound(winner);
  }

  /** Modo aventura: con poca vida el mito puede volarse de la pelea, como un salvaje que huye. */
  private tryFlee(): boolean {
    const fight = this.registry.get('adventureFight') as AdventureFight | undefined;
    const f = this.p2;
    if (!fight || this.fleeTried || f.hp <= 0 || f.hp > MAX_HP * 0.3 || !f.grounded || f.state !== 'idle' && f.state !== 'walk') return false;
    this.fleeTried = true;
    if (Math.random() >= fleeFightChance(fight.escapes ?? 0)) return false;
    this.hideBubble();
    this.phase = 'flee';
    this.phaseFrame = 0;
    this.ai = null;
    sfx.monster(f.stats.id, 'attack', 2);
    sfx.play('mist');
    this.showMessage('¡SE ESTÁ VOLANDO!', f.stats.name);
    return true;
  }

  private stepFlee(): void {
    this.p1.update(EMPTY_INPUT);
    this.p2.update(EMPTY_INPUT);
    const t = this.phaseFrame;
    if (t > 30) {
      this.p2.alpha = Math.max(0, 1 - (t - 30) / 40);
      this.p2.x += this.p2.facing * -2;
    }
    if (t === 70) this.showMessage('¡SE ESCAPÓ!', this.p2.stats.name);
    if (t >= 140) this.scene.start('AdventureScene', { outcome: 'fled' });
  }

  private stepRoundEnd(): void {
    this.p1.update(EMPTY_INPUT);
    this.p2.update(EMPTY_INPUT);
    const w = this.roundWinner;
    // remate del combate: la cara del ganador se abalanza sobre la pantalla
    if (this.phaseFrame === 35 && this.matchWinnerSlot && !this.finalScareDone && this.settings.scares && (this.p1.hp <= 0 || this.p2.hp <= 0)) {
      this.finalScareDone = true;
      this.triggerScare(this.matchWinnerSlot);
    }
    if (this.phaseFrame === 50 && (w === 1 || w === 2)) {
      const f = w === 1 ? this.p1 : this.p2;
      if (f.hp > 0 && f.grounded && f.state !== 'knockdown') f.setState('victory');
      const name = f.stats.name;
      this.showMessage(this.message.text, `${this.settings.mode === 'cpu' && w === 2 ? 'CPU' : 'JUGADOR ' + w}: ${name}`);
    }
    if (this.phaseFrame >= 170) {
      if (this.matchWinnerSlot) {
        this.phase = 'matchEnd';
        this.phaseFrame = 0;
        const f = this.matchWinnerSlot === 1 ? this.p1 : this.p2;
        if (f.state !== 'victory' && f.grounded) f.setState('victory');
        this.showMessage('¡VICTORIA!', f.stats.name);
      } else {
        this.startRound();
      }
    }
  }

  /** Susto con la cara del luchador indicado; la lógica se pausa mientras dura. */
  private triggerScare(slot: PlayerSlot): void {
    if (!this.settings.scares || this.scaring) return;
    const id = slot === 1 ? this.settings.p1 : this.settings.p2;
    const pal = slot === 2 && this.settings.p1 === this.settings.p2 ? 'p2' : 'p1';
    this.scaring = true;
    this.framesSinceScare = 0;
    this.anims.pauseAll();
    void playScreamer(this, portraitKey(this, id, pal, 96)).then(() => {
      this.scaring = false;
      if (!this.paused) this.anims.resumeAll();
      inputManager.clearAll();
    });
  }

  private goToResult(): void {
    const slot = this.matchWinnerSlot ?? 1;
    // modo aventura: se vuelve al mapa; ganar sigue la historia y perder la reinicia
    if (this.registry.get('adventureFight')) {
      this.scene.start('AdventureScene', { outcome: slot === 1 ? 'win' : 'lose' });
      return;
    }
    const data: ResultData = {
      winner: slot,
      settings: this.settings,
      score: { p1: this.score.p1, p2: this.score.p2 },
      spriteKey: this.spriteKey(slot),
      stage: this.stageId,
    };
    this.scene.start('ResultScene', data);
  }

  /* ------------------------------------------------------------------ */
  /* Definitivos (cinemática)                                            */
  /* ------------------------------------------------------------------ */

  private emitterFor(p: 'leaf' | 'drop' | 'spark' | 'ember' | 'none'): Phaser.GameObjects.Particles.ParticleEmitter | null {
    if (p === 'leaf') return this.leafEmitter;
    if (p === 'drop') return this.dropEmitter;
    if (p === 'spark') return this.sparkEmitter;
    if (p === 'ember') return this.emberEmitter;
    return null;
  }

  private startCinematic(attacker: Fighter, defender: Fighter): void {
    const spec = attacker.stats.ultimateSpec;
    this.combat.clearProjectiles();
    attacker.setState('cinematic');
    attacker.anim = 'ultimate';
    attacker.animFrame = 1;
    attacker.vx = 0;
    defender.setState('cinematic');
    defender.anim = 'hit';
    defender.animFrame = 1;
    defender.vx = 0;
    defender.vy = 0;
    defender.y = GROUND_Y;
    defender.grounded = true;
    this.overlayTarget = 0.65;
    let hold: Phaser.GameObjects.Sprite | null = null;
    switch (spec.style) {
      case 'bloom':
        hold = this.add.sprite(defender.x, GROUND_Y, 'fx_eruption', 2).setOrigin(0.5, 1).setDepth(20).setTint(spec.tint);
        break;
      case 'vortex':
        hold = this.add.sprite(defender.x, GROUND_Y - 26, 'fx_vortex').setOrigin(0.5).setDepth(20).setTint(spec.tint);
        hold.play('fx_vortex');
        break;
      case 'storm':
        hold = this.add.sprite(defender.x, GROUND_Y - 26, 'fx_ring').setOrigin(0.5).setDepth(20).setTint(spec.tint).setScale(2);
        hold.play('fx_ring');
        break;
      case 'slash':
        hold = null;
        break;
    }
    sfx.play(spec.sound);
    this.cinematic = { attacker, defender, frame: 0, startX: defender.x, style: spec.style, tint: spec.tint, hold, attackerStartX: attacker.x };
    this.cameras.main.shake(200, 0.006);
  }

  private updateCinematic(): void {
    const c = this.cinematic!;
    c.frame++;
    const d = c.defender;
    const a = c.attacker;
    const em = this.emitterFor(a.stats.ultimateSpec.particle);
    const spark = (x: number, y: number, key = 'fx_heavy') => {
      const sp = this.add.sprite(x, y, key).setDepth(22).setTint(c.tint);
      sp.play(key);
      sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
    };
    switch (c.style) {
      case 'bloom':
        if (c.frame === 18) em?.explode(16, d.x, d.y - 30);
        if (c.frame === 36) a.animFrame = 2;
        if (c.frame === 50) {
          const bloom = this.add.sprite(d.x, d.y - 30, 'fx_bloom').setOrigin(0.5).setDepth(21).setTint(c.tint);
          bloom.play('fx_bloom');
          bloom.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => bloom.destroy());
          this.flashRect.setAlpha(0.9);
          em?.explode(30, d.x, d.y - 30);
          this.cameras.main.shake(350, 0.015);
          sfx.play(a.stats.ultimateSpec.sound);
        }
        if (c.frame >= 56) this.releaseCinematic();
        break;
      case 'vortex': {
        const t = c.frame * 0.22;
        d.x = c.startX + Math.cos(t) * 14;
        d.y = GROUND_Y - 18 - Math.abs(Math.sin(t)) * 16;
        d.facing = (Math.cos(t) > 0 ? -1 : 1) as Facing;
        if (c.frame % 6 === 0) em?.explode(4, d.x, d.y - 20);
        if (c.frame === 40) a.animFrame = 2;
        if (c.frame === 58) {
          this.flashRect.setAlpha(0.7);
          this.cameras.main.shake(300, 0.012);
          sfx.play('heavy');
          em?.explode(30, d.x, d.y - 20);
        }
        if (c.frame >= 60) this.releaseCinematic();
        break;
      }
      case 'storm': {
        // rayos / huesos / fuego cayendo del cielo sobre el rival
        if (c.frame % 9 === 3 && c.frame < 50) {
          const x = d.x + (Math.random() - 0.5) * 50;
          const key = a.stats.id === 'silbon' ? 'fx_bones' : a.stats.id === 'juanmachete' ? 'fx_flame' : 'fx_bolt';
          const sp = this.add.sprite(x, GROUND_Y, key).setOrigin(0.5, 1).setDepth(21).setTint(c.tint);
          sp.play(key);
          sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
          em?.explode(8, x, GROUND_Y - 30);
          this.cameras.main.shake(120, 0.008);
          sfx.play(a.stats.ultimateSpec.sound);
          d.x = Math.max(ARENA_MARGIN_SAFE, Math.min(ARENA_WIDTH - ARENA_MARGIN_SAFE, c.startX + (Math.random() - 0.5) * 6));
        }
        if (c.frame === 30) a.animFrame = 2;
        if (c.frame === 56) {
          this.flashRect.setAlpha(0.9);
          this.cameras.main.shake(350, 0.015);
          spark(d.x, d.y - 30);
          em?.explode(30, d.x, d.y - 30);
        }
        if (c.frame >= 60) this.releaseCinematic();
        break;
      }
      case 'slash': {
        // el atacante atraviesa al rival varias veces
        const passes = Math.floor(c.frame / 12);
        const t = (c.frame % 12) / 12;
        const side = passes % 2 === 0 ? -1 : 1;
        a.x = d.x + side * (60 - t * 120);
        a.facing = (side === -1 ? 1 : -1) as Facing;
        a.alpha = t > 0.3 && t < 0.7 ? 0.5 : 1;
        if (c.frame % 12 === 6 && c.frame < 60) {
          spark(d.x + (Math.random() - 0.5) * 16, d.y - 20 - Math.random() * 30, 'fx_slash');
          em?.explode(8, d.x, d.y - 30);
          sfx.play('slash');
          this.cameras.main.shake(100, 0.006);
          d.animFrame = d.animFrame === 1 ? 0 : 1;
        }
        if (c.frame === 60) {
          a.x = d.x - d.facing * 40;
          a.alpha = 1;
          a.facing = (a.x < d.x ? 1 : -1) as Facing;
          this.flashRect.setAlpha(0.8);
          this.cameras.main.shake(300, 0.012);
          spark(d.x, d.y - 30);
        }
        if (c.frame >= 62) this.releaseCinematic();
        break;
      }
    }
  }

  private releaseCinematic(): void {
    const c = this.cinematic!;
    const attack = c.attacker.stats.attacks.ultimate;
    const result = resolveHit(attack, false);
    c.attacker.alpha = 1;
    const pushDir: Facing = c.defender.x >= c.attacker.x ? 1 : -1;
    c.defender.grounded = true;
    c.defender.y = GROUND_Y;
    c.defender.takeHit(result, pushDir, 0);
    c.attacker.setState('idle');
    c.attacker.hitsLanded++;
    if (c.hold) c.hold.destroy();
    this.overlayTarget = 0;
    this.cinematic = null;
    const sp = this.add.sprite(c.defender.x, c.defender.y - 30, 'fx_heavy').setDepth(22);
    sp.play('fx_heavy');
    sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
  }

  /* ------------------------------------------------------------------ */
  /* Eventos de combate / efectos                                        */
  /* ------------------------------------------------------------------ */

  /** Machetazo para Juan Machete; rugidos, risas y siseos de los mitos al atacar. */
  private fighterSound(f: Fighter, n: SfxName): void {
    if (n === 'jump' || n === 'land') {
      sfx.play(n);
      return;
    }
    sfx.play(isMacheteAttack(f.stats.id, f.attack?.kind) ? 'machete' : n);
    if (n !== 'whoosh' || Math.random() < 0.5) sfx.monster(f.stats.id, 'attack', f.slot);
  }

  private onHit(e: HitEvent): void {
    const key = e.result.blocked ? 'fx_block' : e.heavy ? 'fx_heavy' : 'fx_hit';
    const sp = this.add.sprite(e.x, e.y, key).setDepth(22).setFlipX(e.attacker.facing === -1);
    sp.play(key);
    sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
    const machete = !e.projectile && isMacheteAttack(e.attacker.stats.id, e.attacker.attack?.kind);
    if (e.result.blocked) {
      sfx.play(machete ? 'macheteClang' : 'block');
    } else {
      sfx.play(machete ? 'macheteHit' : e.heavy ? 'heavy' : 'hit');
      sfx.monster(e.defender.stats.id, 'hurt', e.defender.slot);
      this.views[e.defender.slot].flash = 4;
      this.bleed(e.x, e.y, e.attacker.facing, bloodDrops(false, e.heavy, e.result.damage), e.heavy ? 3 : 1);
      this.sparkEmitter.explode(e.heavy ? 10 : 5, e.x, e.y);
      if (e.heavy) this.cameras.main.shake(120, 0.006);
      const kind = e.projectile ? e.projectile.attack.kind : e.attacker.attack?.kind;
      const spec = kind === 'special1' ? e.attacker.stats.special1 : kind === 'special2' ? e.attacker.stats.special2 : null;
      if (spec) this.emitterFor(spec.particle)?.explode(10, e.x, e.y);
      if (spec?.drain) this.views[e.attacker.slot].flash = 0;
    }
  }

  /** Sangre: gotas en la dirección del golpe y manchas en el suelo que se desvanecen. */
  private bleed(x: number, y: number, facing: number, drops: number, splats: number): void {
    if (drops > 0) (facing === 1 ? this.bloodR : this.bloodL).explode(drops, x, y);
    for (let i = 0; i < splats; i++) {
      const sp = this.add.image(x + facing * Phaser.Math.Between(4, 30), GROUND_Y + 1, 'p_splat').setOrigin(0.5, 1).setDepth(7);
      sp.setScale(Phaser.Math.FloatBetween(0.8, 1.8), 1);
      this.tweens.add({ targets: sp, alpha: 0, delay: 5000, duration: 2500, onComplete: () => sp.destroy() });
      this.splats.push(sp);
    }
    while (this.splats.length > 40) this.splats.shift()?.destroy();
  }

  private addDrawnFx(key: string, kind: DrawnFxKind, anchor: 'center' | 'bottom' | 'left', x: number, y: number, flip: boolean, depth: number, scale: number, projectile: boolean): Phaser.GameObjects.Image {
    const ox = anchor === 'left' ? (flip ? 1 : 0) : 0.5;
    const oy = anchor === 'bottom' ? 1 : 0.5;
    const sp = this.add.image(x, anchor === 'bottom' ? GROUND_Y : y, key).setOrigin(ox, oy).setDepth(depth).setFlipX(flip).setScale(scale);
    const m = drawnFxMotion(kind, 0);
    sp.setScale(scale * m.sx, scale * m.sy).setAlpha(projectile ? 1 : m.alpha);
    this.drawnFx.push({ sp, kind, frame: 0, total: DRAWN_FX_FRAMES[kind], flip, scale, projectile });
    return sp;
  }

  private onProjectileSpawn(p: Projectile): void {
    const owner = p.owner === 1 ? this.p1 : this.p2;
    const spec = owner.stats.special1.type === 'projectile' ? owner.stats.special1 : owner.stats.special2;
    if (this.settings.art === 'drawn') {
      const d = drawnFxFor({ fx: p.kind, type: 'projectile' }, owner.stats.id);
      if (d && this.textures.exists(d.key)) {
        const img = this.addDrawnFx(d.key, d.kind, 'center', p.x, p.y, p.facing === -1, 19, 1, true);
        this.projectileSprites.set(p.id, img);
        return;
      }
    }
    const sp = this.add.sprite(p.x, p.y, p.kind).setOrigin(0.5, p.kind === 'fx_wave' ? 1 : 0.5).setDepth(19).setFlipX(p.facing === -1).setTint(spec.tint);
    sp.play(p.kind);
    this.projectileSprites.set(p.id, sp);
  }

  private onProjectileEnd(p: Projectile, reason: 'hit' | 'expired' | 'cancelled'): void {
    const sp = this.projectileSprites.get(p.id);
    if (sp) sp.destroy();
    this.projectileSprites.delete(p.id);
    if (reason === 'cancelled') this.sparkEmitter.explode(12, p.x, p.y - 12);
  }

  private spawnEffect(e: EffectRequest, ownerId: FighterId): void {
    const flip = e.facing === -1;
    const drawn = this.settings.art === 'drawn';
    const tint = Number(e.data?.tint ?? 0xffffff);
    const oneShot = (key: string, x: number, y: number, ox: number, oy: number, depth = 12) => {
      const sp = this.add.sprite(x, y, key).setOrigin(ox, oy).setDepth(depth).setFlipX(flip).setTint(tint);
      sp.play(key);
      sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
      return sp;
    };
    /** Versión dibujada del efecto (modo dibujado); false si no hay imagen para este efecto. */
    const spawnDrawn = (fx: string, type: string | undefined, x: number, y: number, depth = 12, scale = 1): boolean => {
      if (!drawn) return false;
      const d = drawnFxFor({ fx, type }, ownerId);
      if (!d || !this.textures.exists(d.key)) return false;
      this.addDrawnFx(d.key, d.kind, d.anchor, x, y, flip, depth, scale, false);
      return true;
    };
    switch (e.kind) {
      case 'dust': {
        const sp = this.add.sprite(e.x, e.y + 1, 'fx_dust').setOrigin(0.5, 1).setDepth(9);
        if (e.data?.big) sp.setScale(2);
        if (e.data?.small) sp.setScale(0.6).setAlpha(0.7);
        sp.play('fx_dust');
        sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
        break;
      }
      case 'strikefx': {
        const key = String(e.data?.fx ?? 'fx_slash');
        if (key === 'fx_rootwhip' && spawnDrawn(key, 'eruption', e.x - e.facing * 20, GROUND_Y, 12)) break;
        if (key === 'fx_rootwhip' || key === 'fx_whip') {
          // látigos: nacen en el luchador y se extienden hacia delante
          const w = Number(e.data?.w ?? 80);
          const sp = this.add.sprite(e.x - e.facing * (w / 2), e.y, key).setOrigin(flip ? 1 : 0, 0.5).setDepth(12).setFlipX(flip).setTint(tint);
          sp.play(key);
          this.timedFx.push({ obj: sp, frames: 22 });
        } else if (key === 'fx_ring') {
          oneShot(key, e.x, e.y + 10, 0.5, 0.5, 13).setScale(1.5);
        } else {
          oneShot(key, e.x, e.y, 0.5, 0.5, 13);
        }
        break;
      }
      case 'warning': {
        const w = this.add.image(e.x, GROUND_Y - 1, 'white').setOrigin(0.5, 1).setScale(18, 1).setTint(tint === 0xffffff ? 0x8ae060 : tint).setAlpha(0.8).setDepth(9);
        this.timedFx.push({ obj: w, frames: 16 });
        break;
      }
      case 'eruption': {
        if (!spawnDrawn(String(e.data?.fx ?? 'fx_eruption'), 'eruption', e.x, GROUND_Y, 12)) {
          oneShot(String(e.data?.fx ?? 'fx_eruption'), e.x, GROUND_Y, 0.5, 1, 12);
        }
        this.emitterFor(String(e.data?.particle ?? 'none') as 'leaf')?.explode(10, e.x, GROUND_Y - 30);
        break;
      }
      case 'puff':
        oneShot(String(e.data?.fx ?? 'fx_mist'), e.x, e.y + 2, 0.5, 1, 13);
        break;
      case 'ultwind': {
        const style = String(e.data?.style ?? 'bloom');
        const key = style === 'vortex' ? 'fx_vortex' : style === 'storm' ? 'fx_ring' : style === 'slash' ? 'fx_slash' : 'fx_rootwhip';
        if (style === 'vortex' && spawnDrawn('fx_vortex', undefined, e.x, e.y, 12, 1.2)) break;
        if (key === 'fx_rootwhip' && spawnDrawn('fx_rootwhip', 'eruption', e.x, GROUND_Y, 12, 1.2)) break;
        if (key === 'fx_rootwhip') {
          const sp = this.add.sprite(e.x - e.facing * 30, e.y + 20, key).setOrigin(flip ? 1 : 0, 0.5).setDepth(12).setFlipX(flip).setTint(tint).setScale(1, 2);
          sp.play(key);
          this.timedFx.push({ obj: sp, frames: 24 });
        } else {
          const sp = this.add.sprite(e.x, e.y, key).setOrigin(0.5).setDepth(12).setFlipX(flip).setTint(tint);
          sp.play(key);
          this.timedFx.push({ obj: sp, frames: 24 });
        }
        break;
      }
      case 'particles':
        this.emitterFor(String(e.data?.particle ?? 'spark') as 'spark')?.explode(Number(e.data?.count ?? 10), e.x, e.y);
        break;
      case 'shake':
        this.cameras.main.shake(200, Number(e.data?.power ?? 2) * 0.003);
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  private render(): void {
    for (const slot of [1, 2] as PlayerSlot[]) {
      const f = slot === 1 ? this.p1 : this.p2;
      const v = this.views[slot];
      // solo tiembla quien recibe el golpe; el atacante se congela en su pose de impacto
      const shake = f.isAttacking() ? 0 : hitShake(f.hitstop);
      v.sprite.setFlipX(f.facing === -1);
      if (v.drawn) {
        const newStep = v.lastRenderLf !== this.logicFrame;
        v.lastRenderLf = this.logicFrame;
        if (f.anim === 'walk') v.walkDist += Math.abs(f.x - v.lastX);
        else v.walkDist = 0;
        v.lastX = f.x;
        if (newStep) {
          // aterrizaje de un salto o golpe aéreo: aplastamiento y polvo; caída derribado: temblor de cámara
          if (!v.wasGrounded && f.grounded) {
            if (f.state === 'knockdown') this.cameras.main.shake(90, 0.004);
            else v.landAt = this.logicFrame;
          }
          if (!f.grounded) v.landAt = -1;
          v.wasGrounded = f.grounded;
          if (f.state === 'hitstun' && f.stun > v.stunStart) v.stunStart = f.stun;
          if (f.state !== 'hitstun') v.stunStart = 0;
        }
        const landing = v.landAt >= 0 && (f.state === 'idle' || f.state === 'walk') ? this.logicFrame - v.landAt : undefined;
        // durante el hitstop la lógica no actualiza la animación: el golpe se ve ya en el primer frame
        const struck = (f.state === 'hitstun' || f.state === 'knockdown') && f.anim !== 'hit' && f.anim !== 'knockdown';
        const input = {
          state: f.state, anim: struck ? 'hit' : f.anim, animFrame: struck ? 1 : f.animFrame, frame: this.logicFrame, vy: f.vy, grounded: f.grounded,
          backward: f.anim === 'walk' && f.vx * f.facing < 0, rising: f.vy < -0.5, walkDistance: v.walkDist,
          vxForward: f.vx * f.facing, stateFrame: f.stateFrame, lying: f.knockdownLying, landing,
          stun: struck ? 20 : f.stun, stunStart: struck ? 20 : v.stunStart, hitstop: f.hitstop,
          attackProgress: f.attack && (f.state === 'attack' || f.state === 'special')
            ? { frame: f.attackFrame, startup: f.attack.startup, active: f.attack.active, recovery: f.attack.recovery }
            : undefined,
        };
        const df = drawnFrame(v.id, input);
        const animKey = df ? drawnAnimKey(v.id, v.pal, df.action) : null;
        if (animKey && this.textures.exists(animKey)) {
          // un solo fotograma original visible; el movimiento sale del ritmo y de transformar el fotograma entero
          if (v.sprite.texture.key !== animKey || v.sprite.frame.name !== String(df!.index)) v.sprite.setTexture(animKey, df!.index);
          if (f.anim === 'walk') {
            const ph = walkPhase(v.walkDist, DRAWN_ANIM[v.id].walk.frames, WALK_STRIDE_PX, input.backward);
            if (ph.footfall && v.lastFootfallIndex !== ph.index && f.grounded) {
              v.lastFootfallIndex = ph.index;
              this.spawnEffect({ kind: 'dust', x: f.x - f.facing * 6, y: f.y, facing: f.facing, data: { small: true } }, v.id);
            }
          } else v.lastFootfallIndex = -1;
          if (newStep && landing === 0) this.spawnEffect({ kind: 'dust', x: f.x, y: f.y, facing: f.facing }, v.id);
          const pose = drawnMotion(v.id, input);
          const anchor = stripAnchor(v.id, df!.action, df!.index, f.grounded);
          const turn = this.turnScale(v, f.facing);
          v.sprite.setFlipX(turn.flip);
          const x = Math.round(f.x + (pose.dx + anchor.dx) * f.facing) + shake;
          if (pose.center) {
            // volteretas: gira alrededor del centro del cuerpo, a media altura de la figura de pie
            const fh = v.sprite.frame.height;
            v.sprite.setOrigin(0.5, 1 - frameCenterY(v.id, df!.action, df!.index) / fh);
            v.sprite.setPosition(x, Math.round(f.y - standHeight(v.id) / 2 + pose.dy));
          } else {
            v.sprite.setOrigin(0.5, 1);
            v.sprite.setPosition(x, Math.round(f.y + pose.dy + anchor.dy));
          }
          v.sprite.setAngle(pose.rot * f.facing);
          v.sprite.setScale(pose.sx * turn.sx, pose.sy);
        } else {
          const target: SplashPose = splashPose(input);
          let snap = false;
          const n = splashPoseIndex(f.anim, f.animFrame);
          const poseKey = n === null ? null : `splash_${v.id}_${v.pal}_pose${n}_72`;
          const tex = poseKey && this.textures.exists(poseKey) ? poseKey : `splash_${v.id}_${v.pal}_72`;
          if (v.sprite.texture.key !== tex) {
            v.sprite.setTexture(tex);
            snap = v.sprite.texture.key.includes('_pose');
          }
          // transición suave entre poses del arte de cuerpo entero (sin tiras)
          const k = snap ? 1 : f.anim === 'hit' || f.anim === 'knockdown' ? 0.6 : 0.35;
          const cp = v.pose;
          const kk = snap ? 1 : newStep ? k : 0;
          cp.dx += (target.dx - cp.dx) * kk;
          cp.dy += (target.dy - cp.dy) * kk;
          cp.rot += (target.rot - cp.rot) * kk;
          cp.sx += (target.sx - cp.sx) * kk;
          cp.sy += (target.sy - cp.sy) * kk;
          const turn = this.turnScale(v, f.facing);
          v.sprite.setFlipX(turn.flip).setOrigin(0.5, 1);
          v.sprite.setPosition(Math.round(f.x + cp.dx * f.facing) + shake, Math.round(f.y + cp.dy));
          v.sprite.setAngle(cp.rot * f.facing);
          v.sprite.setScale(cp.sx * turn.sx, cp.sy);
        }
      } else {
        const table = ANIM_TABLES[v.key];
        const frames = table[f.anim] ?? table.idle;
        const idx = frames[Math.min(f.animFrame, frames.length - 1)] ?? 0;
        v.sprite.setFrame(idx);
        v.sprite.setPosition(Math.round(f.x) + shake, Math.round(f.y));
      }
      v.sprite.setAlpha(f.alpha);
      if (v.flash > 0) v.sprite.setTintFill(0xffffff);
      else if (f.invuln > 0 && f.state === 'getup') v.sprite.setTint(0xa0c0ff);
      else v.sprite.clearTint();
      const h = Math.max(0, GROUND_Y - f.y);
      v.shadow.setPosition(Math.round(f.x), GROUND_Y + 1).setScale(Math.max(4, 14 - h * 0.15), 2).setAlpha(f.alpha * 0.35);
    }
    for (const p of this.combat.projectiles) {
      const sp = this.projectileSprites.get(p.id);
      if (sp) sp.setPosition(Math.round(p.x), Math.round(p.y));
    }

    // cámara: sigue el punto medio con suavizado
    const cam = this.cameras.main;
    const mid = (this.p1.x + this.p2.x) / 2;
    const target = Phaser.Math.Clamp(mid - GAME_WIDTH / 2, 0, ARENA_WIDTH - GAME_WIDTH);
    cam.scrollX += (target - cam.scrollX) * 0.12;

    // ambiente
    this.river.setTexture(this.stageTex.river(Math.floor(this.logicFrame / 9) % 3));
    this.clouds.tilePositionX = this.logicFrame * 0.06 + cam.scrollX * 0.1;
    this.mist.tilePositionX = this.logicFrame * 0.25 + cam.scrollX * 0.8;
    if (this.lightningRect) {
      if (this.lightningFrames > 0) {
        this.lightningFrames--;
        const a = this.lightningFrames > 6 ? 0.55 : this.lightningFrames % 2 === 0 ? 0.35 : 0.1;
        this.lightningRect.setAlpha(a);
      } else {
        this.lightningRect.setAlpha(0);
        if (!this.paused && Math.random() < 0.004) this.lightningFrames = 10;
      }
    }

    // superposiciones
    const o = this.overlay.alpha;
    this.overlay.setAlpha(o + (this.overlayTarget - o) * 0.12);
    if (this.flashRect.alpha > 0) this.flashRect.setAlpha(Math.max(0, this.flashRect.alpha - 0.08));

    this.renderDebug();
  }

  /** Giro al cambiar de lado: la figura se estrecha hasta casi cero y se vuelve a abrir ya volteada. */
  private turnScale(v: FighterView, facing: number): { sx: number; flip: boolean } {
    const TURN = 8;
    if (facing !== v.lastFacing) { v.turn = this.logicFrame; v.lastFacing = facing; }
    let sx = 1;
    let flip = facing === -1;
    if (v.turn >= 0) {
      const t = (this.logicFrame - v.turn) / TURN;
      if (t >= 1) v.turn = -1;
      else {
        sx = Math.max(0.08, Math.abs(Math.cos(t * Math.PI)));
        if (t < 0.5) flip = !flip;
      }
    }
    return { sx, flip };
  }

  private renderDebug(): void {
    const g = this.debugGfx;
    g.clear();
    if (!this.debugHitboxes) return;
    for (const f of [this.p1, this.p2]) {
      const hurt = f.hurtbox();
      if (hurt) g.lineStyle(1, 0x40c0ff, 1).strokeRect(hurt.left, hurt.top, hurt.right - hurt.left, hurt.bottom - hurt.top);
      const hit = f.activeHitbox();
      if (hit) g.lineStyle(1, 0xff4040, 1).strokeRect(hit.left, hit.top, hit.right - hit.left, hit.bottom - hit.top);
      const push = f.pushbox();
      g.lineStyle(1, 0xffff40, 0.5).strokeRect(push.left, push.top, push.right - push.left, push.bottom - push.top);
    }
    for (const p of this.combat.projectiles) {
      const b = p.worldBox();
      g.lineStyle(1, 0xff4040, 1).strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    }
  }
}
