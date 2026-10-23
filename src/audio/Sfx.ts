/**
 * Efectos de sonido sintetizados con WebAudio: ondas cuadradas, ruido y barridos,
 * en el espíritu de los chips de 16 bits, y un ambiente de terror (zumbido disonante,
 * caja de música desafinada, susurros, crujidos, latido según la tensión y gritos de
 * susto). Encima, sonidos grabados (machete, voces de los mitos, ambientes de la
 * aventura) que se cargan al desbloquear el audio; si faltan, suena lo sintetizado.
 */

import { heartbeatBpm } from '../combat/Fear';
import type { FighterId } from '../combat/CombatTypes';
import type { SoundLayer } from '../combat/CombatTypes';
import { MONSTER_VOICES, SAMPLE_IDS, canVoice, pickVoice, sampleUrl, type SampleId, type VoiceKind } from './Samples';
import {
  MUSIC, STAGE_SOUND, effectiveTension, midiToFreq, musicDuck, pickStageEvent, stepSeconds,
  type Instrument, type MusicId, type MusicTrack, type SoundscapeId, type StageEvent, type StageSoundTheme,
} from './StageSound';

export type SfxName =
  | 'hit' | 'heavy' | 'block' | 'whoosh' | 'jump' | 'land' | 'ko'
  | 'wave' | 'roots' | 'mist' | 'vortex' | 'bloom' | 'select' | 'confirm' | 'round' | 'timer' | 'ultimate'
  | 'scream' | 'fire' | 'whistle' | 'bolt' | 'slash'
  | 'screamer' | 'heartbeat' | 'whisper' | 'creak' | 'distantScream' | 'sting'
  | 'machete' | 'macheteHit' | 'macheteClang' | 'polloMaligno' | 'duende' | 'manoPeluda'
  | 'ladrido' | 'grunido' | 'motor' | 'pito' | 'polvora' | 'puerta' | 'galope' | 'relincho';

/** Envolvente por tramos: [segundos desde el inicio, valor]. */
type Ramp = [number, number][];

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneHigh: GainNode | null = null;
  private droneGain: GainNode | null = null;
  /** la música baja con la tensión; cada pieza tiene su propio bus para fundirla al cambiar */
  private musicDuckNode: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private trackId: MusicId | null = null;
  private track: MusicTrack | null = null;
  private trackStep = 0;
  private trackNext = 0;
  private nextTick = 0;
  private tickCount = 0;
  private reverbIn: GainNode | null = null;
  /** fuentes continuas del ambiente (zumbido, LFO, tono agudo) para pararlas al detener la música */
  private ambientSources: OscillatorNode[] = [];
  private droneOscs: OscillatorNode[] = [];
  private bedSource: AudioBufferSourceNode | null = null;
  private bedGain: GainNode | null = null;
  private bedLfo: OscillatorNode | null = null;
  private bedLfoGain: GainNode | null = null;
  private soundscape: SoundscapeId = 'menu';
  private theme: StageSoundTheme = STAGE_SOUND.menu;
  private tensionLevel = 0;
  private nextBeat = 0;
  private nextEvent = 0;
  private nextBox = 0;
  private samples = new Map<SampleId, AudioBuffer>();
  /** voz en curso y momento de la última por luchador (para no encimar ni repetir) */
  private voices = new Map<string, { src: AudioBufferSourceNode; at: number }>();
  enabled = true;

  /** Debe llamarse tras un gesto del usuario. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.loadSamples();
  }

  private loadSamples(): void {
    const ctx = this.ctx;
    if (!ctx || typeof fetch !== 'function') return;
    for (const id of SAMPLE_IDS) {
      fetch(sampleUrl(id))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((buf) => ctx.decodeAudioData(buf))
        .then((b) => { this.samples.set(id, b); })
        .catch(() => { /* sin la muestra se usa el sonido sintetizado */ });
    }
  }

  /** Reproduce una muestra grabada; false si aún no está cargada. */
  private sample(id: SampleId, vol: number, rate = 1, delay = 0): AudioBufferSourceNode | null {
    const buf = this.samples.get(id);
    if (!this.ctx || !this.master || !buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start(this.ctx.currentTime + delay);
    return src;
  }

  private sampleOf(ids: readonly SampleId[], vol: number, rateJitter = 0.08): boolean {
    const id = ids[Math.floor(Math.random() * ids.length)];
    return !!this.sample(id, vol, 1 - rateJitter / 2 + Math.random() * rateJitter);
  }

  /** Capas de un sonido declarado (grabaciones y sintetizados), cada una con su tono, volumen y retraso. */
  layers(ls: readonly SoundLayer[]): void {
    if (!this.ready) return;
    for (const l of ls) {
      const at = l.at ?? 0;
      if (l.s) {
        // la muestra puede no haber cargado: se cae al sintetizado si la capa trae uno
        if (this.sample(l.s, l.vol ?? 0.8, (l.rate ?? 1) * (0.97 + Math.random() * 0.06), at) || !l.fx) continue;
      }
      if (l.fx) {
        const fx = l.fx;
        if (at > 0) setTimeout(() => this.play(fx), at * 1000);
        else this.play(fx);
      }
    }
  }

  /**
   * Voz del luchador: grito/risa/rugido al atacar, quejido al recibir golpe, grito fuerte al soltar un poder. Una voz a la
   * vez por luchador (`slot`) y con pausa mínima para no saturar.
   */
  monster(id: FighterId, kind: VoiceKind, slot = 0): void {
    const set = MONSTER_VOICES[id];
    if (!this.ready || !this.ctx) return;
    const key = `${slot}:${id}`;
    const now = this.ctx.currentTime;
    const prev = this.voices.get(key);
    if (!canVoice(kind, now, prev?.at)) return;
    const v = pickVoice(set[kind], Math.random());
    const src = this.sample(v.id, kind === 'attack' ? 0.75 : 0.9, v.rate * (0.96 + Math.random() * 0.08));
    if (!src) return;
    if (prev) { try { prev.src.stop(); } catch { /* ya parado */ } }
    this.voices.set(key, { src, at: now });
  }

  get ready(): boolean {
    return !!this.ctx && this.enabled;
  }

  private distortion(amount: number): WaveShaperNode | null {
    if (!this.ctx) return null;
    const ws = this.ctx.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    ws.curve = curve;
    return ws;
  }

  /**
   * Grito de susto: varias voces de sierra desafinadas con vibrato rápido + ruido
   * barrido, saturadas. Fuerte y corto (~1,2 s).
   */
  private screamer(): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(2.2, t + 0.02);
    out.gain.setValueAtTime(2.2, t + 0.7);
    out.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    const shaper = this.distortion(40);
    if (!shaper) return;
    shaper.connect(out).connect(this.master);
    for (const [f, det] of [[620, 0], [930, 18], [1240, -25], [455, 9]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.4, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.15);
      o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 1.2);
      o.detune.value = det;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 28 + det;
      lfoG.gain.value = f * 0.06;
      lfo.connect(lfoG).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = 0.25;
      o.connect(g).connect(shaper);
      o.start(t); lfo.start(t);
      o.stop(t + 1.3); lfo.stop(t + 1.3);
    }
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 1.2);
    const ng = ctx.createGain();
    ng.gain.value = 0.6;
    n.connect(bp).connect(ng).connect(shaper);
    n.start(t);
    n.stop(t + 1.3);
    // golpe grave al inicio
    this.tone('sine', 90, 30, 0.5, 0.9);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFrom: number, filterTo: number, delay = 0, type: BiquadFilterType = 'lowpass', dest?: AudioNode): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFrom, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName): void {
    if (!this.ready) return;
    switch (name) {
      case 'hit':
        // golpe grabado; el sintetizado (sin pitido cuadrado) queda si la muestra no cargó
        if (!this.sampleOf(['punch_1', 'punch_2'], 0.75, 0.12)) this.noise(0.09, 0.5, 2400, 300);
        this.tone('sine', 120, 50, 0.08, 0.25);
        break;
      case 'heavy':
        if (!this.sampleOf(['punch_heavy'], 0.85, 0.1)) this.noise(0.16, 0.7, 1800, 120);
        this.tone('sine', 90, 35, 0.18, 0.4);
        break;
      case 'block':
        this.tone('square', 900, 500, 0.05, 0.2);
        this.noise(0.05, 0.25, 4000, 2000, 0, 'highpass');
        break;
      case 'whoosh':
        this.noise(0.12, 0.18, 600, 2200, 0, 'bandpass');
        break;
      case 'jump':
        // impulso del salto: aire y ropa, nada de "boing" de juguete
        this.noise(0.14, 0.14, 500, 1600, 0, 'bandpass');
        break;
      case 'land':
        this.noise(0.06, 0.2, 500, 120);
        break;
      case 'ko':
        this.tone('square', 440, 60, 0.6, 0.3);
        this.noise(0.4, 0.5, 2000, 100);
        this.tone('sawtooth', 120, 30, 0.7, 0.25, 0.05);
        break;
      case 'wave':
        this.noise(0.35, 0.35, 400, 1800, 0, 'bandpass');
        this.tone('sine', 180, 420, 0.3, 0.15);
        break;
      case 'roots':
        for (let i = 0; i < 4; i++) this.noise(0.06, 0.4, 900, 200, i * 0.05);
        this.tone('square', 90, 50, 0.3, 0.2);
        break;
      case 'mist':
        this.noise(0.4, 0.2, 1200, 3500, 0, 'highpass');
        this.tone('triangle', 600, 1200, 0.35, 0.12);
        break;
      case 'vortex':
        this.noise(0.9, 0.35, 300, 1200, 0, 'bandpass');
        this.tone('sawtooth', 60, 240, 0.9, 0.15);
        break;
      case 'bloom':
        this.noise(0.5, 0.5, 3000, 200);
        this.tone('square', 300, 900, 0.25, 0.2);
        this.tone('square', 450, 1350, 0.25, 0.15, 0.08);
        break;
      case 'ultimate':
        this.tone('sawtooth', 50, 200, 0.6, 0.3);
        this.tone('square', 100, 25, 0.8, 0.2);
        break;
      case 'scream':
        this.tone('sawtooth', 700, 300, 0.45, 0.18);
        this.tone('square', 1050, 450, 0.45, 0.1, 0.02);
        this.noise(0.4, 0.2, 1500, 600, 0, 'bandpass');
        break;
      case 'fire':
        this.noise(0.5, 0.5, 600, 2500, 0, 'lowpass');
        this.tone('sawtooth', 80, 40, 0.5, 0.2);
        break;
      case 'whistle':
        this.tone('sine', 1400, 2200, 0.25, 0.18);
        this.tone('sine', 2200, 1300, 0.3, 0.14, 0.22);
        break;
      case 'bolt':
        this.noise(0.12, 0.6, 6000, 300, 0, 'highpass');
        this.tone('square', 1800, 100, 0.2, 0.2);
        break;
      case 'slash':
        this.noise(0.1, 0.35, 3000, 8000, 0, 'highpass');
        this.tone('sawtooth', 600, 150, 0.1, 0.15);
        break;
      case 'select':
        this.tone('square', 660, 660, 0.05, 0.15);
        break;
      case 'confirm':
        this.tone('square', 520, 520, 0.07, 0.15);
        this.tone('square', 780, 780, 0.1, 0.15, 0.07);
        break;
      case 'round':
        this.tone('square', 392, 392, 0.12, 0.2);
        this.tone('square', 523, 523, 0.12, 0.2, 0.12);
        this.tone('square', 659, 659, 0.25, 0.2, 0.24);
        break;
      case 'timer':
        this.tone('square', 1200, 1200, 0.04, 0.1);
        break;
      case 'screamer':
        this.screamer();
        break;
      case 'heartbeat':
        this.tone('sine', 62, 38, 0.18, 0.9);
        this.tone('sine', 55, 34, 0.2, 0.7, 0.22);
        break;
      case 'whisper': {
        // tres ráfagas de ruido con formantes de voz, al fondo con eco
        const d = this.reverbIn ?? undefined;
        for (let i = 0; i < 3; i++) this.noise(0.22 + Math.random() * 0.2, 0.18, 2600, 1500, i * 0.28, 'bandpass', d);
        break;
      }
      case 'creak':
        this.tone('sawtooth', 190, 120, 0.9, 0.08, 0, this.reverbIn ?? undefined);
        this.tone('square', 95, 70, 0.9, 0.04, 0.05, this.reverbIn ?? undefined);
        break;
      case 'distantScream':
        this.tone('sawtooth', 820, 420, 1.4, 0.05, 0, this.reverbIn ?? undefined);
        this.tone('sawtooth', 860, 400, 1.4, 0.035, 0.03, this.reverbIn ?? undefined);
        break;
      case 'sting':
        // golpe de tensión: cluster disonante + grave
        for (const f of [233.08, 246.94, 349.23, 369.99]) this.tone('sawtooth', f, f * 0.98, 1.1, 0.07);
        this.tone('sine', 55, 30, 1.2, 0.6);
        this.noise(0.6, 0.3, 4000, 300);
        break;
      case 'machete':
        if (!this.sampleOf(['machete_swing_1', 'machete_swing_2'], 1.1)) this.play('slash');
        break;
      case 'macheteHit':
        if (!this.sampleOf(['machete_hit_1', 'machete_hit_2'], 1.2)) this.play('heavy');
        break;
      case 'macheteClang':
        if (!this.sampleOf(['machete_clang'], 1.1)) this.play('block');
        break;
      case 'polloMaligno':
        if (!this.sampleOf(['ambient_pollo'], 0.8, 0.15)) {
          for (let i = 0; i < 4; i++) this.tone('square', 700, 420, 0.07, 0.06, i * 0.14);
        }
        break;
      case 'duende':
        if (!this.sampleOf(['ambient_duende'], 0.8, 0.15)) {
          for (let i = 0; i < 5; i++) this.tone('triangle', 900 + i * 60, 700, 0.08, 0.08, i * 0.11);
        }
        break;
      case 'manoPeluda':
        if (!this.sampleOf(['ambient_mano'], 0.9, 0.15)) {
          this.noise(0.5, 0.25, 3000, 900, 0, 'bandpass');
          this.tone('sawtooth', 90, 60, 0.5, 0.12, 0.15);
        }
        break;
      case 'ladrido':
        this.bark(0, 1);
        this.bark(0.2, 0.85);
        break;
      case 'grunido': {
        const t = this.ctx!.currentTime;
        this.shaped('sawtooth', t, [[0, 82], [0.5, 90], [1.1, 74]], [[0.15, 0.22], [0.85, 0.2], [1.15, 0]], undefined, { type: 'lowpass', freq: 420, q: 4 }, { rate: 23, depth: 0.6 });
        this.shaped('noise', t, [[0, 500]], [[0.2, 0.05], [0.9, 0.04], [1.15, 0]], undefined, { type: 'lowpass', freq: 500 }, { rate: 23, depth: 0.7 });
        break;
      }
      case 'motor': {
        // jeep viejo: arranque que tose, el motor prende, acelera y se aleja
        const t = this.ctx!.currentTime;
        for (let i = 0; i < 4; i++) this.noise(0.08, 0.25, 900, 300, i * 0.13, 'bandpass');
        this.shaped('square', t, [[0, 22], [0.5, 26]], [[0.02, 0.06], [0.52, 0.06], [0.6, 0]], undefined, { type: 'lowpass', freq: 300 }, { rate: 8, depth: 0.8 });
        this.shaped('sawtooth', t + 0.6, [[0, 38], [0.2, 70], [0.5, 46], [1.1, 64], [1.9, 80]], [[0.05, 0.3], [0.7, 0.26], [1.9, 0]], undefined, { type: 'lowpass', freq: 700, q: 3 }, { rate: 30, depth: 0.5 });
        this.noise(0.25, 0.3, 1500, 200, 0.6);
        break;
      }
      case 'pito': {
        const t = this.ctx!.currentTime;
        for (const [d, len] of [[0, 0.12], [0.18, 0.26]] as const) {
          for (const f of [415, 523]) {
            this.shaped('square', t + d, [[0, f]], [[0.01, 0.1], [len, 0.09], [len + 0.03, 0]], undefined, { type: 'lowpass', freq: 2200, q: 2 });
          }
        }
        break;
      }
      case 'polvora':
        this.firework(1);
        break;
      case 'puerta': {
        // campanita de tienda al abrir y la bisagra de madera que cruje
        const t = this.ctx!.currentTime;
        for (const d of [0, 0.09, 0.24]) {
          for (const [k, v] of [[1, 0.08], [1.5, 0.04], [2.2, 0.025]]) this.tone('sine', 1850 * k, 1850 * k, 0.9, v, d);
        }
        this.shaped('sawtooth', t + 0.05, [[0, 170], [0.3, 240], [0.55, 200], [0.8, 150]], [[0.06, 0.05], [0.7, 0.04], [0.85, 0]], undefined, { type: 'bandpass', freq: 900, q: 3 }, { rate: 17, depth: 0.7 });
        break;
      }
      case 'galope':
        // cascos sobre la tierra: tres golpes y un silencio, una y otra vez
        for (let i = 0; i < 6; i++) for (const [d, v] of [[0, 0.5], [0.09, 0.35], [0.17, 0.45]] as const) {
          const at = i * 0.38 + d;
          this.tone('sine', 140, 55, 0.08, v * (1 - i * 0.1), at);
          this.noise(0.05, v * 0.25 * (1 - i * 0.1), 1400, 300, at, 'bandpass');
        }
        break;
      case 'relincho': {
        // relincho: chillido nasal que sube y baja temblando
        const t = this.ctx!.currentTime;
        this.shaped('sawtooth', t, [[0, 520], [0.15, 900], [0.5, 760], [0.9, 420], [1.2, 300]], [[0.04, 0.16], [0.9, 0.12], [1.25, 0]], undefined, { type: 'bandpass', freq: 1300, q: 2 }, { rate: 26, depth: 0.55 });
        this.noise(0.6, 0.06, 2000, 600, 0.6, 'bandpass');
        break;
      }
    }
  }

  /** Ladrido amistoso: tono que cae con formante de boca abierta y un golpe de aire. */
  private bark(delay: number, vol: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    this.shaped('sawtooth', t, [[0, 420], [0.03, 520], [0.11, 260]], [[0.01, 0.35 * vol], [0.08, 0.25 * vol], [0.13, 0]], undefined, { type: 'bandpass', freq: 1100, q: 1.5 });
    this.noise(0.07, 0.12 * vol, 1800, 700, delay, 'bandpass');
  }

  /** Cohete de pólvora: silbido que sube, estallido y chisporroteo. */
  private firework(vol: number, dest?: AudioNode): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.shaped('sine', t, [[0, 900], [0.7, 2600]], [[0.05, 0.05 * vol], [0.65, 0.07 * vol], [0.72, 0]], dest);
    this.noise(0.5, 0.5 * vol, 3000, 150, 0.74, 'lowpass', dest);
    this.tone('sine', 120, 40, 0.4, 0.4 * vol, 0.74, dest);
    for (let i = 0; i < 14; i++) this.noise(0.02, 0.15 * vol, 7000, 3000, 0.9 + Math.random() * 0.9, 'highpass', dest);
  }

  /**
   * Fuente con envolventes por tramos (frecuencia y volumen, desde 0) para sonidos
   * con forma: motor, gruñido, metro, silbidos. `am` modula el volumen (traqueteo).
   */
  private shaped(
    type: OscillatorType | 'noise', t0: number, freq: Ramp, gain: Ramp, dest?: AudioNode,
    filter?: { type: BiquadFilterType; freq: number; q?: number }, am?: { rate: number; depth: number },
  ): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const end = t0 + gain[gain.length - 1][0];
    let src: AudioScheduledSourceNode;
    let param: AudioParam | null = null;
    let node: AudioNode;
    if (type === 'noise') {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      n.loop = true;
      src = n;
      node = n;
    } else {
      const o = ctx.createOscillator();
      o.type = type;
      src = o;
      node = o;
      param = o.frequency;
    }
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      f.Q.value = filter.q ?? 0.7;
      if (type === 'noise') param = f.frequency;
      node.connect(f);
      node = f;
    }
    if (param) {
      param.setValueAtTime(freq[0][1], t0 + freq[0][0]);
      for (const [dt, v] of freq.slice(1)) param.linearRampToValueAtTime(v, t0 + dt);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    for (const [dt, v] of gain) g.gain.linearRampToValueAtTime(v, t0 + dt);
    node.connect(g);
    let out: AudioNode = g;
    const extra: AudioScheduledSourceNode[] = [];
    if (am) {
      const a = ctx.createGain();
      a.gain.value = 1 - am.depth;
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = am.rate;
      lg.gain.value = am.depth;
      lfo.connect(lg).connect(a.gain);
      g.connect(a);
      out = a;
      extra.push(lfo);
    }
    out.connect(dest ?? this.master);
    for (const s of [src, ...extra]) {
      s.start(t0);
      s.stop(end + 0.05);
    }
  }

  /** Nota con ataque suave (sin clics); `sustain` la mantiene y la suelta al final. */
  private note(type: OscillatorType, f: number, t: number, dur: number, vol: number, attack: number, dest: AudioNode, sustain = false, detune = 0): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    let end: number;
    if (sustain) {
      g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.1));
      end = t + dur + 0.4;
      g.gain.linearRampToValueAtTime(0, end);
    } else {
      end = t + attack + dur;
      g.gain.exponentialRampToValueAtTime(0.0005, end);
    }
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(end + 0.05);
  }

  /** Toca un paso de un instrumento de la música. */
  private instrument(inst: Instrument, val: number | number[], t: number, dur: number, vol: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const d = Math.max(0, t - this.ctx.currentTime);
    const f = typeof val === 'number' ? midiToFreq(val) : 0;
    const lvl = typeof val === 'number' ? val : 1;
    switch (inst) {
      case 'bass':
        this.note('triangle', f, t, dur, vol, 0.006, dest);
        this.note('sine', f, t, dur * 0.6, vol * 0.5, 0.006, dest);
        break;
      case 'brass': {
        const o = this.ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        lp.frequency.setValueAtTime(600, t);
        lp.frequency.linearRampToValueAtTime(2800, t + 0.04);
        lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.015);
        g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.05);
        o.connect(lp).connect(g).connect(dest);
        o.start(t);
        o.stop(t + dur + 0.1);
        break;
      }
      case 'pluck':
        this.note('triangle', f, t, dur, vol, 0.002, dest);
        this.note('square', f * 2, t, 0.05, vol * 0.25, 0.002, dest);
        break;
      case 'strum':
        if (Array.isArray(val)) val.forEach((n, i) => this.note('square', midiToFreq(n), t + i * 0.014, dur, vol, 0.002, dest));
        break;
      case 'keys':
        this.note('square', f, t, dur, vol, 0.003, dest);
        break;
      case 'organ':
        for (const n of Array.isArray(val) ? val : [val]) {
          const nf = midiToFreq(n);
          this.note('sine', nf, t, dur, vol, 0.25, dest, true);
          this.note('sine', nf * 2, t, dur, vol * 0.45, 0.25, dest, true);
          this.note('triangle', nf * 4, t, dur, vol * 0.12, 0.3, dest, true);
        }
        break;
      case 'choir':
        for (const det of [-7, 7]) this.note('sawtooth', f, t, dur, vol, 0.6, dest, true, det);
        break;
      case 'shaker':
        this.noise(0.045, vol * lvl, 7500, 5000, d, 'highpass', dest);
        break;
      case 'drum':
        this.tone('sine', 210, 90, 0.14, vol * lvl, d, dest);
        break;
      case 'clave':
        this.tone('sine', 2500, 2400, 0.035, vol * lvl, d, dest);
        this.tone('triangle', 1250, 1200, 0.03, vol * lvl * 0.5, d, dest);
        break;
      case 'cowbell':
        this.tone('square', 562, 560, 0.1, vol * lvl, d, dest);
        this.tone('square', 845, 842, 0.1, vol * lvl * 0.7, d, dest);
        break;
    }
  }

  /** Funde la pieza actual (si la hay) y arranca la del paisaje cuando la anterior ya calló. */
  private switchTrack(now: number): void {
    if (!this.ctx) return;
    const wanted = this.theme.music ?? null;
    if (wanted === this.trackId && (this.musicBus || !wanted)) return;
    const old = this.musicBus;
    if (old) {
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0, now + 1.2);
      window.setTimeout(() => old.disconnect(), 2500);
    }
    this.musicBus = null;
    this.track = null;
    this.trackId = wanted;
    if (!wanted || !this.musicDuckNode) return;
    const track = MUSIC[wanted];
    const start = now + (old ? 1.3 : 0.2);
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.setValueAtTime(0, start);
    bus.gain.linearRampToValueAtTime(track.gain, start + 1.5);
    if (track.muffle) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = track.muffle;
      bus.connect(lp).connect(this.musicDuckNode);
    } else {
      bus.connect(this.musicDuckNode);
    }
    this.musicBus = bus;
    this.track = track;
    this.trackStep = 0;
    this.trackNext = start;
  }

  private scheduleTrack(horizon: number): void {
    const ctx = this.ctx;
    const tr = this.track;
    const bus = this.musicBus;
    if (!ctx || !tr || !bus) return;
    const sd = stepSeconds(tr);
    // si la pestaña estuvo dormida, no se recupera el atraso de golpe
    if (this.trackNext < ctx.currentTime - 0.25) this.trackNext = ctx.currentTime + 0.05;
    while (this.trackNext < horizon) {
      for (const v of tr.voices) {
        const val = v.steps[this.trackStep % v.steps.length];
        if (val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        this.instrument(v.inst, val, this.trackNext, v.len * sd, v.vol, bus);
      }
      this.trackStep++;
      this.trackNext += sd;
    }
  }

  /**
   * 0..1: acelera el latido, abre el zumbido de fondo y baja la música. En los paisajes
   * alegres la tensión se guarda pero no suena.
   */
  setTension(t: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, t));
    if (this.ctx && this.droneFilter && this.droneHigh) {
      const now = this.ctx.currentTime;
      const eff = effectiveTension(this.theme, this.tensionLevel);
      this.droneFilter.frequency.setTargetAtTime(this.theme.droneCutoff + eff * 900, now, 0.4);
      this.droneHigh.gain.setTargetAtTime(eff * 0.05, now, 0.6);
      this.musicDuckNode?.gain.setTargetAtTime(musicDuck(this.theme, this.tensionLevel), now, 0.5);
    }
  }

  /**
   * Ambiente de terror: zumbido grave en segunda menor con filtro que respira, tono
   * agudo disonante que crece con la tensión, caja de música desafinada lejana,
   * susurros/crujidos/gritos lejanos al azar y latido según la tensión.
   */
  startMusic(): void {
    if (!this.ctx || !this.master || this.musicTimer !== null) return;
    const ctx = this.ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);

    // eco largo (delay con realimentación) para lo que suena "lejos"
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.55;
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    damp.connect(wet).connect(this.musicGain);
    this.reverbIn.connect(this.musicGain);

    // zumbido: La y Si bemol graves (segunda menor), con filtro que oscila lento
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 6;
    const droneG = ctx.createGain();
    droneG.gain.value = this.theme.droneGain ?? 0.16;
    this.droneGain = droneG;
    this.droneFilter.connect(droneG).connect(this.musicGain);
    this.musicDuckNode = ctx.createGain();
    this.musicDuckNode.gain.value = musicDuck(this.theme, this.tensionLevel);
    this.musicDuckNode.connect(this.musicGain);
    for (const f of this.theme.drone) {
      const o = ctx.createOscillator();
      o.type = f < 30 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      o.connect(this.droneFilter);
      o.start();
      this.ambientSources.push(o);
      this.droneOscs.push(o);
    }
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 120;
    lfo.connect(lfoG).connect(this.droneFilter.frequency);
    lfo.start();
    this.ambientSources.push(lfo);
    // tono agudo disonante (tritono) que solo se oye con tensión
    this.droneHigh = ctx.createGain();
    this.droneHigh.gain.value = 0;
    this.droneHigh.connect(this.musicGain);
    for (const f of [1244.5, 1318.5]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const v = ctx.createOscillator();
      const vg = ctx.createGain();
      v.frequency.value = 5.3;
      vg.gain.value = 6;
      v.connect(vg).connect(o.frequency);
      o.connect(this.droneHigh);
      o.start(); v.start();
      this.ambientSources.push(o, v);
    }

    // caja de música: frase en menor, desafinada, lenta
    const box = [659.25, 587.33, 523.25, 493.88, 523.25, 440, 415.3, 440];
    const now = ctx.currentTime;
    this.nextTick = now + 0.5;
    this.nextBeat = now + 1;
    this.nextEvent = now + 4;
    this.nextBox = now + 2;
    const schedule = () => {
      if (!this.ctx || !this.musicGain) return;
      const t0 = ctx.currentTime;
      const horizon = t0 + 0.5;
      const eff = effectiveTension(this.theme, this.tensionLevel);
      // latido
      while (this.nextBeat < horizon) {
        if (eff > 0.15) {
          const d = Math.max(0, this.nextBeat - t0);
          this.tone('sine', 62, 38, 0.18, 0.35 + eff * 0.6, d, this.musicGain);
          this.tone('sine', 55, 34, 0.2, 0.25 + eff * 0.5, d + 0.22, this.musicGain);
        }
        this.nextBeat += 60 / heartbeatBpm(eff);
      }
      this.scheduleTrack(horizon);
      // tic-tac del reloj de pared
      const tick = this.theme.tick;
      if (!tick) this.nextTick = horizon;
      while (tick && this.nextTick < horizon) {
        const odd = this.tickCount++ % 2 === 1;
        this.tone('sine', odd ? 1900 : 2300, odd ? 1850 : 2250, 0.03, 0.03, Math.max(0, this.nextTick - t0), this.musicGain);
        this.nextTick += tick;
      }
      // caja de música (solo en los paisajes que la usan)
      if (this.nextBox < horizon && !this.theme.musicBox) this.nextBox = horizon + 5;
      if (this.nextBox < horizon) {
        const d0 = Math.max(0, this.nextBox - t0);
        box.forEach((f, i) => {
          const off = (Math.random() - 0.5) * 0.03; // desafinada
          this.tone('sine', f * (1 + off), f * (1 + off), 0.9, 0.05, d0 + i * 0.55, this.reverbIn ?? undefined);
          this.tone('triangle', f * 2.01, f * 2.01, 0.4, 0.015, d0 + i * 0.55, this.reverbIn ?? undefined);
        });
        this.nextBox += 14 + Math.random() * 10;
      }
      // sucesos propios del escenario
      if (this.nextEvent < horizon) {
        this.stageEvent(pickStageEvent(this.theme, Math.random()));
        const [a, b] = this.theme.every;
        this.nextEvent = Math.max(this.nextEvent, t0) + a + Math.random() * (b - a) - eff * Math.min(2, a * 0.5);
      }
    };
    this.startBed();
    this.trackId = null;
    this.switchTrack(now);
    schedule();
    this.musicTimer = window.setInterval(schedule, 150);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
    for (const o of this.ambientSources) {
      try { o.stop(); } catch { /* ya parado */ }
    }
    this.ambientSources = [];
    this.droneOscs = [];
    this.stopBed();
    this.droneFilter = null;
    this.droneHigh = null;
    this.droneGain = null;
    this.musicDuckNode = null;
    this.musicBus = null;
    this.track = null;
    this.trackId = null;
    this.reverbIn = null;
  }

  /**
   * Cambia el paisaje sonoro (escenario, menú o zona de la aventura) con fundido: el
   * zumbido se desliza, los lechos se cruzan y la música anterior calla antes de que
   * entre la nueva (nunca suenan dos piezas a la vez).
   */
  setSoundscape(id: SoundscapeId): void {
    if (this.soundscape === id) return;
    this.soundscape = id;
    this.theme = STAGE_SOUND[id];
    if (!this.ctx || !this.droneFilter) return;
    const now = this.ctx.currentTime;
    this.theme.drone.forEach((f, i) => this.droneOscs[i]?.frequency.setTargetAtTime(f, now, 1.2));
    this.droneGain?.gain.setTargetAtTime(this.theme.droneGain ?? 0.16, now, 0.8);
    this.setTension(this.tensionLevel);
    this.stopBed();
    this.startBed();
    this.switchTrack(now);
    this.nextEvent = now + 1.5;
    this.nextTick = now + 0.5;
  }

  /** Lecho continuo del escenario: ruido filtrado con volumen que respira (agua, viento, fuego…). */
  private startBed(): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const b = this.theme.bed;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = b.type;
    f.frequency.value = b.freq;
    f.Q.value = b.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(b.gain, ctx.currentTime + 2);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = b.lfoRate;
    lg.gain.value = b.lfoDepth;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start();
    lfo.start();
    this.bedSource = src;
    this.bedGain = g;
    this.bedLfo = lfo;
    this.bedLfoGain = lg;
  }

  private stopBed(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.bedSource;
    const lfo = this.bedLfo;
    if (this.bedGain) {
      this.bedGain.gain.cancelScheduledValues(t);
      this.bedGain.gain.setTargetAtTime(0, t, 0.5);
    }
    this.bedLfoGain?.gain.setTargetAtTime(0, t, 0.3);
    if (src) { try { src.stop(t + 2); } catch { /* ya parado */ } }
    if (lfo) { try { lfo.stop(t + 2); } catch { /* ya parado */ } }
    this.bedSource = null;
    this.bedGain = null;
    this.bedLfo = null;
    this.bedLfoGain = null;
  }

  /** Sonidos característicos de cada escenario (todos suenan "lejos", con eco). */
  private stageEvent(name: StageEvent): void {
    if (!this.ready) return;
    const far = this.reverbIn ?? undefined;
    const r = Math.random;
    switch (name) {
      case 'whisper':
      case 'creak':
      case 'distantScream':
        this.play(name);
        break;
      case 'frog': {
        const base = 230 + r() * 120;
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) this.tone('square', base, base * 0.75, 0.05, 0.05, i * 0.09, far);
        break;
      }
      case 'owl':
        this.tone('sine', 430, 385, 0.35, 0.07, 0, far);
        this.tone('sine', 430, 360, 0.55, 0.07, 0.55, far);
        break;
      case 'thunder':
        this.noise(2.6, 0.45, 500, 60, 0, 'lowpass', far);
        this.tone('sine', 48, 28, 2.4, 0.4, 0.05, far);
        break;
      case 'whistleTune': {
        // el silbido del Silbón: do-re-mi-fa-sol-la-si, cada vez más agudo
        const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77];
        notes.forEach((f, i) => this.tone('sine', f * 0.97, f, 0.28, 0.05, i * 0.3, far));
        break;
      }
      case 'crickets':
        for (let i = 0; i < 6; i++) this.tone('sine', 4200 + r() * 300, 4100, 0.03, 0.02, i * 0.07 + (i > 2 ? 0.25 : 0), far);
        break;
      case 'flute': {
        const pent = [392, 440, 523.25, 587.33, 659.25];
        for (let i = 0; i < 4; i++) {
          const f = pent[Math.floor(r() * pent.length)];
          this.tone('sine', f * 1.01, f, 0.6, 0.04, i * 0.55, far);
          this.tone('triangle', f * 2, f * 2, 0.4, 0.008, i * 0.55, far);
        }
        break;
      }
      case 'drip':
        this.tone('sine', 1800 + r() * 600, 520, 0.07, 0.06, 0, far);
        if (r() < 0.5) this.tone('sine', 1600, 480, 0.07, 0.04, 0.45, far);
        break;
      case 'bubbles':
        for (let i = 0; i < 3 + Math.floor(r() * 3); i++) this.tone('sine', 180 + r() * 80, 520 + r() * 200, 0.06, 0.05, i * (0.08 + r() * 0.1), far);
        break;
      case 'splash':
        this.noise(0.45, 0.12, 1400, 300, 0, 'bandpass', far);
        break;
      case 'crackle':
        for (let i = 0; i < 9; i++) this.noise(0.015 + r() * 0.02, 0.18, 6000, 2500, r() * 0.7, 'highpass');
        break;
      case 'bull':
        this.tone('sawtooth', 115, 70, 1.3, 0.07, 0, far);
        this.tone('sawtooth', 118, 68, 1.3, 0.05, 0.02, far);
        break;
      case 'bell':
        // campana de iglesia: parciales inarmónicas que se apagan despacio
        for (const [k, v] of [[1, 0.07], [2, 0.04], [2.76, 0.03], [5.4, 0.015]]) this.tone('sine', 196 * k, 196 * k, 3.2, v, 0, far);
        break;
      case 'dogHowl':
        this.tone('sawtooth', 480, 690, 0.6, 0.025, 0, far);
        this.tone('sawtooth', 690, 430, 1.1, 0.025, 0.6, far);
        break;
      case 'hooves':
        for (const t of [0, 0.17, 0.5, 0.67, 1.0, 1.17]) this.noise(0.04, 0.14, 900, 300, t, 'lowpass', far);
        break;
      case 'steps':
        for (const t of [0, 0.55, 1.1]) this.noise(0.08, 0.16, 400, 120, t, 'lowpass', far);
        break;
      case 'chatter':
      case 'prayer': {
        // murmullo de voces: ráfagas con formantes; el rezo es más grave y parejo
        const low = name === 'prayer';
        const n = low ? 10 : 7;
        for (let i = 0; i < n; i++) {
          const f = (low ? 420 : 650) + r() * (low ? 260 : 800);
          this.noise(0.1 + r() * 0.2, low ? 0.04 : 0.06, f, f * 0.75, i * (low ? 0.22 : 0.17) + r() * 0.1, 'bandpass', far);
        }
        break;
      }
      case 'glass':
        for (const [d, f] of [[0, 2600 + r() * 500], [0.07, 3100 + r() * 400]]) {
          this.tone('sine', f, f, 0.3, 0.03, d, far);
          this.tone('sine', f * 2.7, f * 2.7, 0.15, 0.01, d, far);
        }
        break;
      case 'laugh': {
        const base = 240 + r() * 120;
        for (let i = 0; i < 4; i++) {
          this.tone('triangle', base * (1 - i * 0.04), base * 0.8, 0.09, 0.05, i * 0.15, far);
          this.noise(0.08, 0.025, 1400, 900, i * 0.15, 'bandpass', far);
        }
        break;
      }
      case 'firework':
        this.firework(0.35, far);
        break;
      case 'metro': {
        // el metro pasa por el viaducto: rumor que crece y se va, con su silbido eléctrico
        const t = this.ctx!.currentTime;
        this.shaped('noise', t, [[0, 260]], [[2, 0.12], [3, 0.12], [5.5, 0]], far, { type: 'lowpass', freq: 260 });
        this.shaped('sine', t, [[0, 480], [2.5, 720], [5.5, 520]], [[2, 0.015], [3, 0.015], [5.5, 0]], far);
        for (let i = 0; i < 6; i++) this.noise(0.05, 0.05, 700, 300, 1.6 + i * 0.32, 'lowpass', far);
        break;
      }
      case 'horn': {
        const t = this.ctx!.currentTime;
        const f = 380 + r() * 120;
        this.shaped('square', t, [[0, f]], [[0.01, 0.02], [0.2, 0.02], [0.24, 0]], far, { type: 'lowpass', freq: 1500 });
        break;
      }
      case 'moto': {
        const t = this.ctx!.currentTime;
        this.shaped('sawtooth', t, [[0, 70], [0.8, 140], [1.8, 85]], [[0.6, 0.03], [1.2, 0.03], [1.9, 0]], far, { type: 'lowpass', freq: 900 }, { rate: 35, depth: 0.4 });
        break;
      }
      case 'farWhistle': {
        // silbido humano largo en el monte: baja, para y vuelve a subir
        const t = this.ctx!.currentTime;
        this.shaped('sine', t, [[0, 1500], [0.9, 1080], [1.3, 1080], [1.7, 1320]], [[0.1, 0.035], [0.9, 0.03], [1.05, 0], [1.35, 0.03], [1.75, 0]], far);
        break;
      }
      case 'branch':
        this.noise(0.03, 0.18, 3000, 1500, 0, 'bandpass', far);
        this.noise(0.025, 0.1, 2500, 1200, 0.07, 'bandpass', far);
        this.tone('sine', 140, 60, 0.12, 0.08, 0.02, far);
        break;
      case 'bamboo': {
        // guaduas que se golpean con el viento: toques huecos irregulares
        const base = 280 + r() * 90;
        for (let i = 0; i < 2 + Math.floor(r() * 3); i++) this.tone('sine', base * (1 + r() * 0.15), base * 0.9, 0.12, 0.06, i * (0.12 + r() * 0.25), far);
        if (r() < 0.4) this.play('creak');
        break;
      }
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}

export const sfx = new Synth();
