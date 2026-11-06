/**
 * Efectos de sonido sintetizados con WebAudio, en el espíritu de los chips de 16 bits pero con
 * cuerpo: cada golpe se arma por capas (chasquido, cuero, cuerpo grave que cae de tono) y cambia
 * un poco cada vez para no sonar repetido. Todo pasa por un limitador final (nada recorta) y por
 * una reverberación de convolución cuya respuesta al impulso se genera por código.
 *
 * Ambiente de terror: zumbido disonante, lechos continuos por escenario (viento en ráfagas, río,
 * chicharras, fuego que chisporrotea, gentío), caja de música desafinada, susurros, crujidos,
 * latido según la tensión y gritos de susto. Música chiptune con swing, golpes fantasma y fundido
 * cruzado entre piezas. Encima, sonidos grabados (machete, voces de los mitos, ambientes de la
 * aventura) que se cargan al desbloquear el audio; si faltan, suena lo sintetizado.
 */

import { heartbeatBpm } from '../combat/Fear';
import type { FighterId } from '../combat/CombatTypes';
import type { SoundLayer } from '../combat/CombatTypes';
import { jitter, makeImpulse, makeNoise, softClipCurve, swingOffset, type NoiseColor } from './Dsp';
import { onLowSpec, perf } from '../config/perf';
import { MONSTER_VOICES, SAMPLE_IDS, canVoice, pickVoice, sampleUrl, type SampleId, type VoiceKind } from './Samples';
import {
  MUSIC, PERCUSSION, STAGE_SOUND, effectiveTension, midiToFreq, musicDuck, pickStageEvent, stepSeconds,
  type AmbienceLayer, type Instrument, type MusicId, type MusicTrack, type SoundscapeId, type StageEvent, type StageSoundTheme,
} from './StageSound';

export type SfxName =
  | 'hit' | 'heavy' | 'block' | 'whoosh' | 'jump' | 'land' | 'ko'
  | 'wave' | 'roots' | 'mist' | 'vortex' | 'bloom' | 'select' | 'confirm' | 'round' | 'timer' | 'ultimate'
  | 'scream' | 'fire' | 'whistle' | 'bolt' | 'slash'
  | 'screamer' | 'heartbeat' | 'whisper' | 'creak' | 'distantScream' | 'sting'
  | 'machete' | 'macheteHit' | 'macheteClang' | 'polloMaligno' | 'duende' | 'manoPeluda'
  | 'ladrido' | 'grunido' | 'motor' | 'pito' | 'polvora' | 'puerta' | 'galope' | 'relincho' | 'encuentro' | 'victoria'
  | 'calm';

/** Envolvente por tramos: [segundos desde el inicio, valor]. */
type Ramp = [number, number][];

/** Volumen base de la mezcla (antes del limitador). */
const MASTER = 0.35;
/** El paneo de los canales compartidos se redondea a este paso (inaudible): así hay pocos buses fijos. */
const PAN_STEP = 0.05;
/** Tasa del sintetizador en calidad ligera (Hz). */
const LITE_SAMPLE_RATE = 24000;
/** Sala ligera: [retardo s, realimentación, corte del apagado Hz] de cada eco (tiempos sin múltiplos comunes). */
const LITE_ROOM: readonly (readonly [number, number, number])[] = [[0.0437, 0.62, 2600], [0.0713, 0.55, 1900]];
/**
 * Entrada de la sala ligera: con esto su energía queda como la de la convolución (que el navegador
 * normaliza), calculado con la respuesta al impulso de los dos ecos; la mezcla no se seca en el celular.
 */
const LITE_ROOM_GAIN = 0.65;

/** Golpe por capas; cada campo se varía al azar en cada toque. */
interface Impact {
  /** cuerpo: seno que cae de `body` a `bodyEnd` Hz */
  body: number;
  bodyEnd: number;
  bodyVol: number;
  bodyDur: number;
  /** cuero/chasquido: ruido en banda alrededor de `crack` Hz */
  crack: number;
  crackVol: number;
  crackDur: number;
  /** grave extra largo (Hz) para los golpes fuertes */
  sub?: number;
  /** saturación del cuerpo (0 = limpio) */
  drive?: number;
  /** envío a la reverberación */
  wet?: number;
}

/** Una pieza sonando (o apagándose): su bus, una salida por voz y por dónde va. */
interface Playing {
  track: MusicTrack;
  bus: GainNode;
  outs: AudioNode[];
  step: number;
  next: number;
  /** se deja de programar a partir de aquí (las que se están apagando) */
  until: number;
}

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffers = new Map<NoiseColor, AudioBuffer>();
  /** reverberación de convolución compartida: lo que se manda aquí suena "en el lugar" */
  private roomSend: GainNode | null = null;
  private roomOut: GainNode | null = null;
  /** lo que hoy procesa la sala (convolución o, en calidad ligera, ecos realimentados) */
  private roomCore: AudioNode[] = [];
  private roomLite = false;
  /**
   * Buses de canal compartidos (seco con paneo + envío a la sala) por paneo y envío: los sonidos se
   * conectan a uno ya armado en vez de crear hasta tres nodos de ruteo por cada golpe.
   */
  private buses = new Map<string, GainNode>();
  /** paneos compartidos de los sucesos lejanos (van a `reverbIn`) */
  private spots = new Map<number, StereoPannerNode>();
  /** calidad ligera (celulares): sala barata, música sin adornos ni golpes fantasma */
  private lite = perf.low;
  private shaperCurve: Float32Array<ArrayBuffer> | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneHigh: GainNode | null = null;
  private droneGain: GainNode | null = null;
  /** la música baja con la tensión; cada pieza tiene su propio bus para fundirla al cambiar */
  private musicDuckNode: GainNode | null = null;
  /** envío de la música a la reverberación (baja con la tensión, igual que la música) */
  private musicRoom: GainNode | null = null;
  private trackId: MusicId | null = null;
  /** en combate suena la música de batalla, sea cual sea el escenario */
  private battle = false;
  private playing: Playing | null = null;
  private fading: Playing[] = [];
  private nextTick = 0;
  private tickCount = 0;
  private reverbIn: GainNode | null = null;
  /** fuentes continuas del ambiente (zumbido, LFO, tono agudo) para pararlas al detener la música */
  private ambientSources: OscillatorNode[] = [];
  private droneOscs: OscillatorNode[] = [];
  private bedOut: GainNode | null = null;
  private bedSources: AudioScheduledSourceNode[] = [];
  /** volumen del fuego del lecho: si hay, chisporrotea solo */
  private fireLevel = 0;
  private soundscape: SoundscapeId = 'menu';
  private theme: StageSoundTheme = STAGE_SOUND.menu;
  private tensionLevel = 0;
  private nextBeat = 0;
  private nextEvent = 0;
  private nextBox = 0;
  private samples = new Map<SampleId, AudioBuffer>();
  /** voz en curso y momento de la última por luchador (para no encimar ni repetir) */
  private voices = new Map<string, { src: AudioBufferSourceNode; at: number }>();
  /** último instante de cada efecto: el mismo dos veces en el mismo instante solo suma ruido */
  private lastPlayed = new Map<SfxName, number>();
  private volume = 1;
  enabled = true;

  /** Debe llamarse tras un gesto del usuario. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    // en calidad ligera el sintetizador trabaja a 24 kHz: la mitad de muestras que calcular en cada nodo,
    // y un parlante de celular no da más de eso; si el navegador no acepta la tasa, la de siempre
    let ctx: AudioContext;
    try {
      ctx = this.lite ? new Ctor({ sampleRate: LITE_SAMPLE_RATE }) : new Ctor();
    } catch {
      ctx = new Ctor();
    }
    this.ctx = ctx;
    // limitador final: los gritos y los golpes fuertes se aplastan antes de recortar
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    limiter.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = MASTER * this.volume;
    this.master.connect(limiter);
    const sr = ctx.sampleRate;
    for (const [color, secs] of [['white', 1], ['pink', 2], ['brown', 3]] as const) {
      const b = ctx.createBuffer(1, Math.floor(sr * secs), sr);
      b.getChannelData(0).set(makeNoise(color, b.length));
      this.noiseBuffers.set(color, b);
    }
    this.shaperCurve = softClipCurve(2.5) as Float32Array<ArrayBuffer>;
    this.roomSend = ctx.createGain();
    this.roomOut = ctx.createGain();
    this.roomOut.gain.value = this.roomLevel();
    this.roomOut.connect(this.master);
    this.buildRoom();
    this.loadSamples();
    onLowSpec(() => this.setLite(true));
  }

  /**
   * Arma la sala entre `roomSend` y `roomOut`. Completa: convolución estéreo con cola de 2,4 s que se
   * oscurece. Ligera (celulares): dos ecos realimentados y apagados en mono, que suenan a sala y cuestan
   * una fracción (la convolución larga era lo que más pesaba en el hilo de audio).
   */
  private buildRoom(): void {
    const ctx = this.ctx, send = this.roomSend, out = this.roomOut;
    if (!ctx || !send || !out) return;
    send.disconnect();
    for (const n of this.roomCore) n.disconnect();
    this.roomCore = [];
    this.roomLite = this.lite;
    if (!this.lite) {
      const sr = ctx.sampleRate;
      const [l, r] = makeImpulse(sr, { seconds: 2.4, decay: 2.8, preDelay: 0.012, damping: 0.75, early: [0.017, 0.029, 0.043] });
      const ir = ctx.createBuffer(2, l.length, sr);
      ir.getChannelData(0).set(l);
      ir.getChannelData(1).set(r);
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      send.connect(conv).connect(out);
      this.roomCore = [conv];
      return;
    }
    // la sala ligera trabaja en mono: el envío se mezcla a un canal antes de entrar
    const mono = ctx.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = 'explicit';
    mono.gain.value = LITE_ROOM_GAIN;
    send.connect(mono);
    this.roomCore = [mono];
    for (const [time, fb, cut] of LITE_ROOM) {
      const d = ctx.createDelay(0.2);
      d.delayTime.value = time;
      const damp = this.biquad();
      damp.type = 'lowpass';
      damp.frequency.value = cut;
      const g = ctx.createGain();
      g.gain.value = fb;
      mono.connect(d);
      d.connect(damp).connect(g).connect(d);
      damp.connect(out);
      this.roomCore.push(d, damp, g);
    }
  }

  /** Pasa a calidad ligera (o vuelve): rehace la sala; la música pierde adornos desde el próximo compás. */
  setLite(on: boolean): void {
    this.lite = on;
    if (this.ctx && this.roomLite !== on) this.buildRoom();
  }

  /** Volumen general 0..1 (además de `enabled`, que calla los efectos). */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(MASTER * this.volume, this.ctx.currentTime, 0.05);
  }

  /** Cuánta reverberación devuelve el lugar actual. */
  private roomLevel(): number {
    return 0.5 + (this.theme.reverb ?? 0.3) * 1.1;
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

  /** Reproduce una muestra grabada; null si aún no está cargada. */
  private sample(id: SampleId, vol: number, rate = 1, delay = 0, dest?: AudioNode): AudioBufferSourceNode | null {
    const buf = this.samples.get(id);
    if (!this.ctx || !this.master || !buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(dest ?? this.master);
    src.start(this.ctx.currentTime + delay);
    return src;
  }

  private sampleOf(ids: readonly SampleId[], vol: number, rateJitter = 0.08, dest?: AudioNode): boolean {
    const id = ids[Math.floor(Math.random() * ids.length)];
    return !!this.sample(id, jitter(vol, 0.1), 1 - rateJitter / 2 + Math.random() * rateJitter, 0, dest);
  }

  /** Capas de un sonido declarado (grabaciones y sintetizados), cada una con su tono, volumen y retraso. */
  layers(ls: readonly SoundLayer[]): void {
    if (!this.ready) return;
    const dest = this.chan(0.12);
    for (const l of ls) {
      const at = l.at ?? 0;
      if (l.s) {
        // la muestra puede no haber cargado: se cae al sintetizado si la capa trae uno
        if (this.sample(l.s, l.vol ?? 0.8, (l.rate ?? 1) * (0.97 + Math.random() * 0.06), at, dest) || !l.fx) continue;
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
    const src = this.sample(v.id, kind === 'attack' ? 0.75 : 0.9, v.rate * (0.96 + Math.random() * 0.08), 0, this.chan(kind === 'power' ? 0.2 : 0.08));
    if (!src) return;
    if (prev) { try { prev.src.stop(); } catch { /* ya parado */ } }
    this.voices.set(key, { src, at: now });
  }

  get ready(): boolean {
    return !!this.ctx && this.enabled;
  }

  /* ------------------------------------------------------------------ */
  /* Primitivas                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Canal de un sonido: entrada con paneo opcional que va seco a `dest` (o al maestro) y
   * con un envío `wet` a la reverberación. Los que van al maestro se arman una vez y se comparten.
   */
  private chan(wet: number, pan = 0, dest?: AudioNode): GainNode {
    if (!dest) {
      // los canales al maestro son solo ruteo (nadie les cambia el volumen): se comparten
      const p = Math.round(Math.max(-1, Math.min(1, pan)) / PAN_STEP) * PAN_STEP;
      const key = `${wet}|${p}`;
      const hit = this.buses.get(key);
      if (hit) return hit;
      const bus = this.makeChan(wet, p);
      this.buses.set(key, bus);
      return bus;
    }
    return this.makeChan(wet, pan, dest);
  }

  /**
   * Filtro con sus parámetros a ritmo de bloque (k-rate): con un barrido o un LFO encima, el navegador
   * recalcula los coeficientes una vez cada 128 muestras y no en cada muestra (hay decenas de notas y
   * golpes filtrados por segundo). En barridos de decenas de ms el oído no lo nota.
   */
  private biquad(): BiquadFilterNode {
    const f = this.ctx!.createBiquadFilter();
    for (const p of [f.frequency, f.Q, f.detune, f.gain]) {
      try { p.automationRate = 'k-rate'; } catch { /* navegador sin automationRate: se queda a-rate */ }
    }
    return f;
  }

  private makeChan(wet: number, pan: number, dest?: AudioNode): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    let o: AudioNode = g;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      o = p;
    }
    o.connect(dest ?? this.master!);
    if (wet > 0 && this.roomSend) {
      const s = ctx.createGain();
      s.gain.value = wet;
      o.connect(s).connect(this.roomSend);
    }
    return g;
  }

  /** Lugar lejano al azar en el estéreo, con eco (sucesos del escenario). */
  private spot(spread = 0.75): AudioNode | undefined {
    if (!this.ctx || !this.reverbIn) return undefined;
    if (typeof this.ctx.createStereoPanner !== 'function') return this.reverbIn;
    const pan = Math.round(((Math.random() * 2 - 1) * spread) / PAN_STEP) * PAN_STEP;
    let p = this.spots.get(pan);
    if (!p) {
      p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      p.connect(this.reverbIn);
      this.spots.set(pan, p);
    }
    return p;
  }

  /** Fuente de ruido en bucle que arranca en un punto al azar: dos golpes nunca suenan idénticos. */
  private noiseSrc(color: NoiseColor = 'white'): AudioBufferSourceNode | null {
    const buf = this.noiseBuffers.get(color);
    if (!this.ctx || !buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private startNoise(src: AudioBufferSourceNode, t: number): void {
    src.start(t, Math.random() * (src.buffer?.duration ?? 1));
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    // ataque de 2 ms: sin clic al empezar
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(
    dur: number, vol: number, filterFrom: number, filterTo: number, delay = 0, type: BiquadFilterType = 'lowpass',
    dest?: AudioNode, color: NoiseColor = 'white', q?: number, attack = 0.002,
  ): void {
    if (!this.ctx || !this.master) return;
    const src = this.noiseSrc(color);
    if (!src) return;
    const t = this.ctx.currentTime + delay;
    const f = this.biquad();
    f.type = type;
    if (q !== undefined) f.Q.value = q;
    f.frequency.setValueAtTime(filterFrom, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.master);
    this.startNoise(src, t);
    src.stop(t + dur + 0.02);
  }

  /** Saturación suave compartida (le da "puño" al cuerpo de los golpes). */
  private shaper(): WaveShaperNode | null {
    if (!this.ctx || !this.shaperCurve) return null;
    const ws = this.ctx.createWaveShaper();
    ws.curve = this.shaperCurve;
    return ws;
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
   * Golpe por capas: chasquido brillante de pocos milisegundos, cuero (ruido en banda que cae)
   * y cuerpo grave que baja de tono, con un sub opcional. Todo varía un poco en cada toque.
   */
  private impact(o: Impact, delay = 0): void {
    if (!this.ctx) return;
    const pan = (Math.random() * 2 - 1) * 0.25;
    const out = this.chan(o.wet ?? 0.06, pan);
    const v = () => jitter(1, 0.12);
    // chasquido
    this.noise(0.008, o.crackVol * 0.7 * v(), 9000, 4000, delay, 'highpass', out);
    // cuero
    const c = jitter(o.crack, 0.18);
    this.noise(jitter(o.crackDur, 0.15), o.crackVol * v(), c, c * 0.45, delay, 'bandpass', out, 'white', 1.1);
    // cuerpo
    let body: AudioNode = out;
    if (o.drive) {
      const ws = this.shaper();
      if (ws) {
        const pre = this.ctx.createGain();
        pre.gain.value = o.drive;
        const post = this.ctx.createGain();
        post.gain.value = 1 / Math.sqrt(o.drive);
        pre.connect(ws).connect(post).connect(out);
        body = pre;
      }
    }
    const b = jitter(o.body, 0.08);
    this.tone('sine', b, jitter(o.bodyEnd, 0.1), jitter(o.bodyDur, 0.12), o.bodyVol * v(), delay, body);
    this.tone('triangle', b * 1.5, o.bodyEnd, o.bodyDur * 0.5, o.bodyVol * 0.25 * v(), delay, body);
    if (o.sub) this.tone('sine', jitter(o.sub, 0.05), o.sub * 0.7, o.bodyDur * 2.2, o.bodyVol * 0.6 * v(), delay + 0.004, out);
  }

  /** Corte de aire: ruido en banda que sube y baja, cruzando el estéreo. */
  private swish(dur: number, vol: number, low: number, high: number, bright = 0, delay = 0): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const d = jitter(dur, 0.15);
    const peak = jitter(high, 0.2);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const out = ctx.createGain();
    let o: AudioNode = out;
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(-0.35 * dir, t);
      p.pan.linearRampToValueAtTime(0.35 * dir, t + d);
      out.connect(p);
      o = p;
    }
    o.connect(this.master!);
    for (const [lo, hi, q, k] of [[low, peak, 1.4, 1], [low * 3, peak * 2.2, 2.5, bright]] as const) {
      if (k <= 0) continue;
      const src = this.noiseSrc(lo < 600 ? 'pink' : 'white');
      if (!src) return;
      const f = this.biquad();
      f.type = 'bandpass';
      f.Q.value = q;
      f.frequency.setValueAtTime(lo, t);
      f.frequency.exponentialRampToValueAtTime(hi, t + d * 0.55);
      f.frequency.exponentialRampToValueAtTime(lo * 1.4, t + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(jitter(vol * k, 0.15), t + d * 0.45);
      g.gain.linearRampToValueAtTime(0, t + d);
      src.connect(f).connect(g).connect(out);
      this.startNoise(src, t);
      src.stop(t + d + 0.02);
    }
  }

  /** Campana: parciales inarmónicas que se apagan despacio (las agudas antes). */
  private bell(f: number, vol: number, delay: number, dur: number, dest: AudioNode | undefined, partials: readonly (readonly [number, number])[] = [[1, 1], [2.76, 0.32], [5.4, 0.12], [8.93, 0.05]]): void {
    partials.forEach(([k, v], i) => this.tone('sine', f * k, f * k * 0.999, dur / (1 + i * 0.8), vol * v, delay, dest));
  }

  /** Latido: "lub" grave que cae de tono con el golpe sordo del pecho, y el "dub" un poco más alto. */
  private beat(vol: number, delay: number, dest?: AudioNode): void {
    for (const [d, f, k] of [[0, 68, 1], [0.21, 78, 0.72]] as const) {
      this.tone('sine', jitter(f, 0.03), 34, 0.16, vol * k, delay + d, dest);
      this.noise(0.09, vol * k * 0.5, 180, 60, delay + d, 'lowpass', dest, 'brown');
    }
  }

  /** Pitido de menú suave: cuadrada filtrada con su octava en triángulo. */
  private blip(f: number, dur: number, vol: number, delay = 0, dest?: AudioNode): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const lp = this.biquad();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
    lp.connect(dest ?? this.master!);
    this.tone('square', f, f, dur, vol * 0.7, delay, lp);
    this.tone('triangle', f * 2, f * 2, dur * 0.6, vol * 0.4, delay, lp);
  }

  /**
   * Grito de susto: varias voces de sierra desafinadas con vibrato rápido + ruido
   * barrido, saturadas, con cola en la sala. Fuerte y corto (~1,2 s).
   */
  private screamer(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(1.5, t + 0.02);
    out.gain.setValueAtTime(1.5, t + 0.7);
    out.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    const shaper = this.distortion(40);
    if (!shaper) return;
    shaper.connect(out).connect(this.chan(0.35));
    for (const [f, det] of [[620, 0], [930, 18], [1240, -25], [455, 9]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const fj = jitter(f, 0.04);
      o.frequency.setValueAtTime(fj * 1.4, t);
      o.frequency.exponentialRampToValueAtTime(fj, t + 0.15);
      o.frequency.exponentialRampToValueAtTime(fj * 0.6, t + 1.2);
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
    this.noise(1.25, 0.6, 3200, 900, 0, 'bandpass', shaper, 'white', 2, 0.01);
    // golpe grave al inicio
    this.impact({ body: 95, bodyEnd: 30, bodyVol: 0.9, bodyDur: 0.5, crack: 1500, crackVol: 0.4, crackDur: 0.12, sub: 45, drive: 2, wet: 0.3 });
  }

  /**
   * Golpe de terror: aire que se aspira, luego un golpe sordo con un racimo disonante de cuerdas
   * que baja de filtro y un metal frotado que chirría, todo con mucha sala.
   */
  private sting(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.chan(0.55);
    // aspiración (ruido que crece y corta justo antes del golpe)
    this.shaped('noise', t, [[0, 600], [0.22, 5000]], [[0.22, 0.18], [0.24, 0]], out, { type: 'bandpass', freq: 600, q: 0.9 });
    const hit = 0.24;
    this.impact({ body: 70, bodyEnd: 28, bodyVol: 0.75, bodyDur: 0.9, crack: 900, crackVol: 0.35, crackDur: 0.4, sub: 38, drive: 1.6, wet: 0.5 }, hit);
    const lp = this.biquad();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(4500, t + hit);
    lp.frequency.exponentialRampToValueAtTime(300, t + hit + 1.6);
    lp.connect(out);
    for (const f of [233.08, 246.94, 349.23, 369.99, 493.88]) {
      for (const det of [-9, 9]) this.shaped('sawtooth', t + hit, [[0, jitter(f, 0.004) * 2 ** (det / 1200)], [1.6, f * 0.97]], [[0.01, 0.05], [0.5, 0.035], [1.7, 0]], lp);
    }
    // metal frotado: parciales inarmónicas con vibrato rápido
    for (const k of [1, 1.59, 2.14, 2.83]) {
      this.shaped('sine', t + hit, [[0, 820 * k], [1.4, 760 * k]], [[0.05, 0.018 / k], [1.3, 0.01 / k], [1.6, 0]], out, undefined, { rate: 7 + k * 3, depth: 0.5 });
    }
  }

  /** Paz: campanitas que suben (pentatónica mayor), un coro suave que se abre y un brillo de aire. */
  private calm(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = [72, 74, 76, 79, 81, 84, 88];
    notes.forEach((n, i) => {
      const pan = -0.6 + (1.2 * i) / (notes.length - 1);
      this.bell(midiToFreq(n), 0.07 * (1 - i * 0.06), 0.05 + i * 0.16 + Math.random() * 0.02, 2.6, this.chan(0.7, pan),
        [[1, 1], [2, 0.18], [3.01, 0.08], [4.2, 0.03]]);
    });
    // coro: Do mayor con séptima, sierra filtrada y desafinada que entra despacio
    const lp = this.biquad();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1600, t + 1.5);
    lp.frequency.linearRampToValueAtTime(700, t + 4);
    lp.connect(this.chan(0.8));
    for (const n of [48, 60, 64, 67, 71]) {
      for (const det of [-8, 8]) {
        this.shaped('sawtooth', t, [[0, midiToFreq(n) * 2 ** (det / 1200)]], [[0.9, n < 50 ? 0.03 : 0.022], [2.4, 0.02], [4.2, 0]], lp, undefined, { rate: 4.6 + det * 0.03, depth: 0.12 });
      }
    }
    // aire que brilla
    this.shaped('noise', t, [[0, 7000]], [[1.2, 0.025], [3.5, 0]], this.chan(0.9), { type: 'highpass', freq: 7000, q: 0.7 });
  }

  play(name: SfxName): void {
    if (!this.ready || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < 0.025) return;
    this.lastPlayed.set(name, now);
    switch (name) {
      case 'hit': {
        // golpe grabado y debajo un cuerpo sintetizado que cambia cada vez
        const rec = this.sampleOf(['punch_1', 'punch_2'], 0.75, 0.14);
        this.impact({ body: 150, bodyEnd: 55, bodyVol: 0.3, bodyDur: 0.1, crack: 1900, crackVol: rec ? 0.12 : 0.45, crackDur: 0.06, wet: 0.05 });
        break;
      }
      case 'heavy': {
        const rec = this.sampleOf(['punch_heavy'], 0.85, 0.12);
        this.impact({ body: 115, bodyEnd: 36, bodyVol: 0.5, bodyDur: 0.22, crack: 1200, crackVol: rec ? 0.18 : 0.6, crackDur: 0.12, sub: 48, drive: 2.2, wet: 0.12 });
        break;
      }
      case 'block': {
        // antebrazo que para el golpe: cuero seco y un golpe sordo corto, sin pitido
        this.impact({ body: 280, bodyEnd: 150, bodyVol: 0.22, bodyDur: 0.06, crack: 2600, crackVol: 0.32, crackDur: 0.045, wet: 0.08 });
        this.noise(0.03, 0.08, 5200, 3800, 0.004, 'bandpass', this.chan(0.05), 'white', 3);
        break;
      }
      case 'whoosh':
        this.swish(0.17, 0.2, 380, 2100, 0.35);
        break;
      case 'jump':
        // impulso del salto: aire y ropa, nada de "boing" de juguete
        this.swish(0.15, 0.12, 400, 1500);
        this.noise(0.05, 0.08, 900, 300, 0, 'lowpass', undefined, 'pink');
        break;
      case 'land':
        this.impact({ body: 120, bodyEnd: 45, bodyVol: 0.22, bodyDur: 0.09, crack: 700, crackVol: 0.12, crackDur: 0.08, wet: 0.03 });
        this.noise(0.18, 0.08, 700, 200, 0.01, 'lowpass', undefined, 'pink');
        break;
      case 'ko': {
        // golpe final: impacto enorme, un estruendo grave que se hunde y la sala que resuena
        this.impact({ body: 100, bodyEnd: 28, bodyVol: 0.8, bodyDur: 0.45, crack: 1100, crackVol: 0.6, crackDur: 0.25, sub: 40, drive: 2.5, wet: 0.45 });
        const out = this.chan(0.6);
        this.noise(1.1, 0.35, 2400, 70, 0.02, 'lowpass', out, 'brown');
        this.shaped('sawtooth', now + 0.05, [[0, 110], [1.5, 32]], [[0.05, 0.14], [0.8, 0.1], [1.6, 0]], out, { type: 'lowpass', freq: 380, q: 2 });
        this.bell(98, 0.12, 0.08, 3, out, [[1, 1], [2.32, 0.4], [4.1, 0.15]]);
        break;
      }
      case 'wave':
        this.swish(0.4, 0.3, 300, 1700, 0.3);
        this.noise(0.5, 0.15, 900, 300, 0.1, 'lowpass', this.chan(0.2), 'pink');
        break;
      case 'roots':
        for (let i = 0; i < 4; i++) this.impact({ body: 140, bodyEnd: 60, bodyVol: 0.18, bodyDur: 0.06, crack: jitter(1200, 0.3), crackVol: 0.3, crackDur: 0.05, wet: 0.1 }, i * jitter(0.05, 0.2));
        this.tone('sine', 90, 45, 0.35, 0.3);
        break;
      case 'mist':
        this.noise(0.6, 0.12, 1500, 4500, 0, 'highpass', this.chan(0.5), 'pink', undefined, 0.15);
        this.shaped('triangle', now, [[0, 600], [0.5, 1150]], [[0.2, 0.06], [0.55, 0]], this.chan(0.6), undefined, { rate: 6, depth: 0.3 });
        break;
      case 'vortex':
        this.noise(0.9, 0.3, 300, 1400, 0, 'bandpass', this.chan(0.3), 'pink', 1.5, 0.2);
        this.shaped('sawtooth', now, [[0, 60], [0.9, 240]], [[0.3, 0.12], [0.9, 0]], this.chan(0.2), { type: 'lowpass', freq: 700, q: 3 });
        break;
      case 'bloom':
        this.noise(0.5, 0.4, 3000, 200, 0, 'lowpass', this.chan(0.2));
        this.tone('triangle', 300, 900, 0.3, 0.18, 0, this.chan(0.3));
        this.tone('triangle', 450, 1350, 0.3, 0.12, 0.08, this.chan(0.3));
        break;
      case 'ultimate': {
        // descarga del definitivo: aire que se junta, estallido grave y subida brillante
        const out = this.chan(0.4);
        this.noise(0.45, 0.25, 300, 3500, 0, 'bandpass', out, 'pink', 1.2, 0.35);
        this.impact({ body: 90, bodyEnd: 30, bodyVol: 0.55, bodyDur: 0.6, crack: 900, crackVol: 0.3, crackDur: 0.2, sub: 40, drive: 2, wet: 0.4 }, 0.38);
        this.shaped('sawtooth', now + 0.38, [[0, 50], [0.6, 200]], [[0.05, 0.12], [0.7, 0]], out, { type: 'lowpass', freq: 900, q: 4 });
        break;
      }
      case 'scream':
        this.shaped('sawtooth', now, [[0, 700], [0.45, 300]], [[0.02, 0.15], [0.45, 0]], this.chan(0.3), { type: 'bandpass', freq: 1100, q: 1.2 }, { rate: 22, depth: 0.3 });
        this.tone('square', 1050, 450, 0.45, 0.05, 0.02, this.chan(0.3));
        this.noise(0.4, 0.15, 1500, 600, 0, 'bandpass', this.chan(0.3));
        break;
      case 'fire':
        this.noise(0.6, 0.45, 600, 2500, 0, 'lowpass', this.chan(0.2), 'pink', undefined, 0.05);
        for (let i = 0; i < 6; i++) this.noise(0.012, 0.2, 6000, 3000, Math.random() * 0.5, 'highpass');
        this.tone('sine', 80, 40, 0.5, 0.25);
        break;
      case 'whistle':
        this.tone('sine', 1400, 2200, 0.25, 0.14, 0, this.chan(0.4));
        this.tone('sine', 2200, 1300, 0.3, 0.11, 0.22, this.chan(0.4));
        break;
      case 'bolt':
        this.noise(0.15, 0.55, 7000, 300, 0, 'highpass', this.chan(0.3));
        this.impact({ body: 160, bodyEnd: 50, bodyVol: 0.35, bodyDur: 0.15, crack: 4000, crackVol: 0.3, crackDur: 0.06, drive: 2, wet: 0.3 });
        break;
      case 'slash': {
        // filo que corta el aire y un roce metálico que brilla
        this.swish(0.12, 0.2, 1200, 5500, 0.6);
        const out = this.chan(0.15, (Math.random() - 0.5) * 0.4);
        const f = jitter(3100, 0.08);
        for (const [k, v] of [[1, 0.035], [1.53, 0.022], [2.41, 0.012]]) this.tone('sine', f * k, f * k * 0.98, 0.18, v, 0.03, out);
        break;
      }
      case 'select':
        this.blip(660, 0.06, 0.13);
        break;
      case 'confirm':
        this.blip(523.25, 0.07, 0.13);
        this.blip(783.99, 0.12, 0.13, 0.07);
        break;
      case 'round': {
        const out = this.chan(0.25);
        this.blip(392, 0.12, 0.16, 0, out);
        this.blip(523.25, 0.12, 0.16, 0.12, out);
        this.blip(659.25, 0.3, 0.16, 0.24, out);
        this.bell(1318.5, 0.04, 0.24, 1.2, out);
        break;
      }
      case 'timer':
        this.blip(1200, 0.04, 0.08);
        break;
      case 'screamer':
        this.screamer();
        break;
      case 'heartbeat':
        this.beat(0.9, 0);
        break;
      case 'whisper': {
        // ráfagas de ruido rosado con formantes de voz que se mueven, cada una en otro lado
        for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
          const f = jitter(2400, 0.25);
          this.noise(0.2 + Math.random() * 0.25, 0.16, f, f * 0.6, i * jitter(0.27, 0.3), 'bandpass', this.spot(0.9), 'pink', 4, 0.05);
        }
        break;
      }
      case 'creak': {
        // madera que cede: fricción a tirones (golpecitos de sierra filtrada) que cambia de tono
        const far = this.spot();
        const f = jitter(170, 0.2);
        this.shaped('sawtooth', now, [[0, f], [0.4, f * 1.25], [0.9, f * 0.75]], [[0.05, 0.07], [0.8, 0.05], [0.95, 0]], far, { type: 'bandpass', freq: jitter(900, 0.2), q: 4 }, { rate: jitter(28, 0.3), depth: 0.85 });
        this.tone('square', f * 0.5, f * 0.4, 0.9, 0.02, 0.05, far);
        break;
      }
      case 'distantScream': {
        const far = this.spot();
        const f = jitter(820, 0.12);
        this.shaped('sawtooth', now, [[0, f * 0.9], [0.2, f], [1.4, f * 0.5]], [[0.1, 0.05], [1, 0.04], [1.45, 0]], far, { type: 'bandpass', freq: 1100, q: 2 }, { rate: 6.5, depth: 0.25 });
        this.shaped('sawtooth', now + 0.03, [[0, f * 1.05], [1.4, f * 0.52]], [[0.1, 0.03], [1, 0.025], [1.45, 0]], far, { type: 'bandpass', freq: 1400, q: 2 });
        break;
      }
      case 'sting':
        this.sting();
        break;
      case 'calm':
        this.calm();
        break;
      case 'machete':
        if (!this.sampleOf(['machete_swing_1', 'machete_swing_2'], 1.1)) this.play('slash');
        else this.swish(0.12, 0.08, 1200, 5000, 0.5);
        break;
      case 'macheteHit':
        if (!this.sampleOf(['machete_hit_1', 'machete_hit_2'], 1.2)) this.play('heavy');
        else this.impact({ body: 120, bodyEnd: 45, bodyVol: 0.3, bodyDur: 0.14, crack: 1600, crackVol: 0.1, crackDur: 0.06, wet: 0.1 });
        break;
      case 'macheteClang':
        if (!this.sampleOf(['machete_clang'], 1.1, 0.1, this.chan(0.2))) {
          this.play('block');
          this.bell(jitter(1650, 0.08), 0.05, 0, 0.6, this.chan(0.25), [[1, 1], [2.71, 0.5], [5.2, 0.2]]);
        }
        break;
      case 'polloMaligno':
        if (!this.sampleOf(['ambient_pollo'], 0.8, 0.15, this.chan(0.4))) {
          for (let i = 0; i < 4; i++) this.tone('square', 700, 420, 0.07, 0.06, i * 0.14, this.spot());
        }
        break;
      case 'duende':
        if (!this.sampleOf(['ambient_duende'], 0.8, 0.15, this.chan(0.4))) {
          for (let i = 0; i < 5; i++) this.tone('triangle', 900 + i * 60, 700, 0.08, 0.08, i * 0.11, this.spot());
        }
        break;
      case 'manoPeluda':
        if (!this.sampleOf(['ambient_mano'], 0.9, 0.15, this.chan(0.4))) {
          this.noise(0.5, 0.25, 3000, 900, 0, 'bandpass');
          this.tone('sawtooth', 90, 60, 0.5, 0.12, 0.15);
        }
        break;
      case 'ladrido':
        this.bark(0, 1);
        this.bark(jitter(0.2, 0.15), 0.85);
        break;
      case 'grunido': {
        this.shaped('sawtooth', now, [[0, 82], [0.5, 90], [1.1, 74]], [[0.15, 0.22], [0.85, 0.2], [1.15, 0]], this.chan(0.15), { type: 'lowpass', freq: 420, q: 4 }, { rate: 23, depth: 0.6 });
        this.shaped('noise', now, [[0, 500]], [[0.2, 0.05], [0.9, 0.04], [1.15, 0]], this.chan(0.15), { type: 'lowpass', freq: 500 }, { rate: 23, depth: 0.7 });
        break;
      }
      case 'motor': {
        // jeep viejo: arranque que tose, el motor prende, acelera y se aleja
        for (let i = 0; i < 4; i++) this.noise(0.08, 0.25, 900, 300, i * 0.13, 'bandpass');
        this.shaped('square', now, [[0, 22], [0.5, 26]], [[0.02, 0.06], [0.52, 0.06], [0.6, 0]], undefined, { type: 'lowpass', freq: 300 }, { rate: 8, depth: 0.8 });
        this.shaped('sawtooth', now + 0.6, [[0, 38], [0.2, 70], [0.5, 46], [1.1, 64], [1.9, 80]], [[0.05, 0.3], [0.7, 0.26], [1.9, 0]], undefined, { type: 'lowpass', freq: 700, q: 3 }, { rate: 30, depth: 0.5 });
        this.noise(0.25, 0.3, 1500, 200, 0.6);
        break;
      }
      case 'pito': {
        const out = this.chan(0.2);
        for (const [d, len] of [[0, 0.12], [0.18, 0.26]] as const) {
          for (const f of [415, 523]) {
            this.shaped('square', now + d, [[0, f]], [[0.01, 0.1], [len, 0.09], [len + 0.03, 0]], out, { type: 'lowpass', freq: 2200, q: 2 });
          }
        }
        break;
      }
      case 'polvora':
        this.firework(1, this.chan(0.35));
        break;
      case 'puerta': {
        // campanita de tienda al abrir y la bisagra de madera que cruje
        const out = this.chan(0.2);
        for (const d of [0, 0.09, 0.24]) this.bell(jitter(1850, 0.02), 0.08, d, 0.9, out, [[1, 1], [1.5, 0.5], [2.2, 0.3]]);
        this.shaped('sawtooth', now + 0.05, [[0, 170], [0.3, 240], [0.55, 200], [0.8, 150]], [[0.06, 0.05], [0.7, 0.04], [0.85, 0]], out, { type: 'bandpass', freq: 900, q: 3 }, { rate: 17, depth: 0.7 });
        break;
      }
      case 'encuentro': {
        // ¡apareció un mito!: golpe grave, viento que sube y un acorde disonante de cuerdas que se corta seco
        const out = this.chan(0.45);
        this.impact({ body: 70, bodyEnd: 30, bodyVol: 0.7, bodyDur: 0.9, crack: 800, crackVol: 0.25, crackDur: 0.3, sub: 40, drive: 1.5, wet: 0.4 });
        this.noise(0.7, 0.3, 300, 4000, 0, 'bandpass', out, 'pink', 1, 0.3);
        for (const [f, det] of [[110, 0], [116.5, 8], [164.8, -6]] as const) {
          this.shaped('sawtooth', now + 0.25, [[0, f]], [[0.05, 0.07], [0.55, 0.06], [0.75, 0]], out, { type: 'lowpass', freq: 900 }, { rate: 6 + det * 0.1, depth: 0.15 });
        }
        this.tone('sine', 55, 28, 0.8, 0.5, 0.25);
        break;
      }
      case 'victoria': {
        // victoria: acorde mayor de cuerdas que se abre despacio y un golpe grave, sin trompetica
        const lp = this.biquad();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(700, now);
        lp.frequency.linearRampToValueAtTime(2200, now + 1.2);
        lp.connect(this.chan(0.5));
        for (const n of [48, 55, 60, 64, 67]) {
          for (const det of [-6, 6]) this.shaped('sawtooth', now, [[0, midiToFreq(n) * 2 ** (det / 1200)]], [[0.4, 0.035], [1.4, 0.03], [2, 0]], lp);
        }
        this.impact({ body: 65, bodyEnd: 32, bodyVol: 0.5, bodyDur: 0.6, crack: 600, crackVol: 0.1, crackDur: 0.2, wet: 0.4 });
        break;
      }
      case 'galope': {
        // cascos sobre la tierra: tres golpes y un silencio, una y otra vez
        const out = this.chan(0.15);
        for (let i = 0; i < 6; i++) for (const [d, v] of [[0, 0.5], [0.09, 0.35], [0.17, 0.45]] as const) {
          const at = i * 0.38 + d + Math.random() * 0.01;
          const k = v * (1 - i * 0.1);
          this.tone('sine', jitter(140, 0.08), 55, 0.08, k, at, out);
          this.noise(0.05, k * 0.25, jitter(1400, 0.2), 300, at, 'bandpass', out);
        }
        break;
      }
      case 'relincho': {
        // relincho: chillido nasal que sube y baja temblando
        this.shaped('sawtooth', now, [[0, 520], [0.15, 900], [0.5, 760], [0.9, 420], [1.2, 300]], [[0.04, 0.16], [0.9, 0.12], [1.25, 0]], this.chan(0.3), { type: 'bandpass', freq: 1300, q: 2 }, { rate: 26, depth: 0.55 });
        this.noise(0.6, 0.06, 2000, 600, 0.6, 'bandpass');
        break;
      }
    }
  }

  /** Ladrido amistoso: tono que cae con formante de boca abierta y un golpe de aire. */
  private bark(delay: number, vol: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const f = jitter(420, 0.06);
    const out = this.chan(0.2);
    this.shaped('sawtooth', t, [[0, f], [0.03, f * 1.24], [0.11, f * 0.62]], [[0.01, 0.35 * vol], [0.08, 0.25 * vol], [0.13, 0]], out, { type: 'bandpass', freq: 1100, q: 1.5 });
    this.noise(0.07, 0.12 * vol, 1800, 700, delay, 'bandpass', out);
  }

  /** Cohete de pólvora: silbido que sube, estallido y chisporroteo. */
  private firework(vol: number, dest?: AudioNode): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.shaped('sine', t, [[0, 900], [0.7, jitter(2600, 0.1)]], [[0.05, 0.05 * vol], [0.65, 0.07 * vol], [0.72, 0]], dest);
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
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const end = t0 + gain[gain.length - 1][0];
    let src: AudioScheduledSourceNode;
    let param: AudioParam | null = null;
    let node: AudioNode;
    let noise: AudioBufferSourceNode | null = null;
    if (type === 'noise') {
      noise = this.noiseSrc();
      if (!noise) return;
      src = noise;
      node = noise;
    } else {
      const o = ctx.createOscillator();
      o.type = type;
      src = o;
      node = o;
      param = o.frequency;
    }
    if (filter) {
      const f = this.biquad();
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
    if (noise) this.startNoise(noise, t0);
    else src.start(t0);
    src.stop(end + 0.05);
    for (const s of extra) {
      s.start(t0);
      s.stop(end + 0.05);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Música                                                              */
  /* ------------------------------------------------------------------ */

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

  /** Nota que pasa por un filtro que se cierra (cuerda pulsada, bajo con mordida). */
  private filtNote(type: OscillatorType, f: number, t: number, dur: number, vol: number, from: number, to: number, q: number, dest: AudioNode, detune = 0): void {
    if (!this.ctx) return;
    const lp = this.biquad();
    lp.type = 'lowpass';
    lp.Q.value = q;
    lp.frequency.setValueAtTime(from, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + Math.max(0.05, dur));
    lp.connect(dest);
    this.note(type, f, t, dur, vol, 0.003, lp, false, detune);
  }

  /** Toca un paso de un instrumento de la música. */
  private instrument(inst: Instrument, val: number | number[], t: number, dur: number, vol: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const d = Math.max(0, t - this.ctx.currentTime);
    const f = typeof val === 'number' ? midiToFreq(val) : 0;
    const lvl = typeof val === 'number' ? val : 1;
    switch (inst) {
      case 'bass':
        // fundamental redonda y una sierra filtrada que muerde al principio
        this.note('sine', f, t, dur, vol * 0.85, 0.006, dest);
        this.filtNote('sawtooth', f, t, dur * 0.7, vol * 0.35, Math.min(1400, f * 10), f * 2, 2, dest);
        break;
      case 'brass': {
        // en calidad ligera una sola voz (un poco más fuerte) en vez de dos desafinadas
        for (const det of this.lite ? [0] : [-5, 5]) {
          const o = this.ctx.createOscillator();
          o.type = 'square';
          o.frequency.value = f;
          o.detune.value = det;
          const lp = this.biquad();
          lp.type = 'lowpass';
          lp.Q.value = 2;
          lp.frequency.setValueAtTime(600, t);
          lp.frequency.linearRampToValueAtTime(2800, t + 0.04);
          lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
          const g = this.ctx.createGain();
          const v = vol * (this.lite ? 0.85 : 0.6);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(v, t + 0.015);
          g.gain.setValueAtTime(v * 0.8, t + dur * 0.7);
          g.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.05);
          o.connect(lp).connect(g).connect(dest);
          o.start(t);
          o.stop(t + dur + 0.1);
        }
        break;
      }
      case 'pluck':
        // tiple/requinto: triángulo y una cuadrada que brilla un instante
        this.note('triangle', f, t, dur, vol, 0.002, dest);
        if (!this.lite) this.filtNote('square', f, t, Math.min(dur, 0.35), vol * 0.3, 3200, 500, 1, dest);
        break;
      case 'strum':
        if (Array.isArray(val)) {
          // rasgueo: cuerdas una tras otra, hacia abajo o hacia arriba
          const up = Math.random() < 0.35;
          const all = up ? [...val].reverse() : val;
          const ns = this.lite ? all.slice(0, 3) : all;
          ns.forEach((n, i) => this.filtNote('sawtooth', midiToFreq(n), t + i * jitter(0.013, 0.3), dur, vol * (up ? 0.8 : 1), 2600, 500, 0.8, dest));
        }
        break;
      case 'keys':
        // piano eléctrico: seno con un brillo de campana que se va pronto
        this.note('sine', f, t, dur, vol * 1.2, 0.003, dest);
        this.note('sine', f * 2, t, dur * 0.4, vol * 0.4, 0.002, dest);
        if (!this.lite) this.note('triangle', f * 4, t, 0.05, vol * 0.2, 0.001, dest);
        break;
      case 'organ':
        for (const n of Array.isArray(val) ? val : [val]) {
          const nf = midiToFreq(n);
          this.note('sine', nf, t, dur, vol, 0.25, dest, true);
          this.note('sine', nf * 2, t, dur, vol * 0.45, 0.25, dest, true);
          if (!this.lite) this.note('triangle', nf * 4, t, dur, vol * 0.12, 0.3, dest, true);
        }
        break;
      case 'choir': {
        // coro: sierras desafinadas por un filtro suave (sin zumbido de abeja)
        const lp = this.biquad();
        lp.type = 'lowpass';
        lp.frequency.value = 1300;
        lp.Q.value = 0.8;
        lp.connect(dest);
        for (const n of Array.isArray(val) ? val : [val]) for (const det of this.lite ? [0] : [-7, 7]) this.note('sawtooth', midiToFreq(n), t, dur, vol * (this.lite ? 1.8 : 1.3), 0.6, lp, true, det);
        break;
      }
      case 'shaker':
        this.noise(0.05, vol * lvl, 7500, 5000, d, 'highpass', dest, 'white', undefined, 0.006);
        break;
      case 'drum':
        this.tone('sine', jitter(210, 0.03), 90, 0.14, vol * lvl, d, dest);
        this.noise(0.03, vol * lvl * 0.2, 2000, 800, d, 'bandpass', dest);
        break;
      case 'taiko':
        // tambor grande: golpe grave que baja y el cuero que suena seco encima
        this.tone('sine', jitter(95, 0.03), 38, 0.35, vol * lvl, d, dest);
        this.noise(0.1, vol * lvl * 0.4, 700, 120, d, 'lowpass', dest, 'brown');
        break;
      case 'clave':
        this.tone('sine', 2500, 2400, 0.035, vol * lvl, d, dest);
        this.tone('triangle', 1250, 1200, 0.03, vol * lvl * 0.5, d, dest);
        break;
      case 'cowbell': {
        const bp = this.biquad();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 1.5;
        bp.connect(dest);
        this.tone('square', 562, 560, 0.12, vol * lvl * 1.4, d, bp);
        this.tone('square', 845, 842, 0.12, vol * lvl, d, bp);
        break;
      }
      case 'guacharaca': {
        // raspado de la caña: ruido agudo con los surcos (modulación rápida); largo en el tiempo, corto entre medio
        const long = lvl >= 0.7;
        const src = this.noiseSrc();
        if (!src) break;
        const len = long ? jitter(0.12, 0.1) : jitter(0.035, 0.15);
        const bp = this.biquad();
        bp.type = 'bandpass';
        bp.frequency.value = jitter(long ? 4200 : 5200, 0.06);
        bp.Q.value = 1.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * lvl, t + (long ? len * 0.7 : 0.004));
        g.gain.linearRampToValueAtTime(0, t + len);
        const ridges = this.ctx.createGain();
        ridges.gain.value = 0.55;
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.value = jitter(long ? 70 : 110, 0.1);
        const lg = this.ctx.createGain();
        lg.gain.value = 0.45;
        lfo.connect(lg).connect(ridges.gain);
        src.connect(bp).connect(g).connect(ridges).connect(dest);
        this.startNoise(src, t);
        lfo.start(t);
        src.stop(t + len + 0.02);
        lfo.stop(t + len + 0.02);
        break;
      }
      case 'tambora':
        if (lvl >= 0.6) {
          // cuero grave
          this.tone('sine', jitter(125, 0.03), 62, 0.26, vol * lvl, d, dest);
          this.noise(0.06, vol * lvl * 0.3, 500, 150, d, 'lowpass', dest, 'brown');
        } else {
          // aro de madera: clic seco
          this.tone('triangle', jitter(950, 0.05), 760, 0.025, vol * lvl * 0.8, d, dest);
          this.noise(0.025, vol * lvl * 0.5, 2400, 1800, d, 'bandpass', dest, 'white', 4);
        }
        break;
      case 'llamador':
        // tambor mediano y tapado: marca el contratiempo
        this.tone('sine', jitter(240, 0.03), 185, 0.11, vol * lvl, d, dest);
        this.noise(0.035, vol * lvl * 0.35, 1600, 900, d, 'bandpass', dest, 'white', 2);
        break;
      case 'conga':
        if (lvl >= 0.45) {
          // tono abierto con el cuero que sube un poquito al golpe
          const cf = jitter(lvl > 0.8 ? 300 : 345, 0.02);
          this.tone('sine', cf * 1.06, cf, 0.22, vol * lvl, d, dest);
          this.tone('triangle', cf * 2.1, cf * 2, 0.06, vol * lvl * 0.2, d, dest);
        } else {
          // golpe tapado / fantasma
          this.noise(0.04, vol * lvl * 0.8, 1300, 700, d, 'bandpass', dest, 'white', 1.5);
          this.tone('sine', 330, 300, 0.04, vol * lvl * 0.5, d, dest);
        }
        break;
    }
  }

  /**
   * Cambia la pieza con fundido cruzado: la anterior sigue sonando mientras se apaga y la nueva
   * entra despacio por encima (la batalla entra de golpe, como en los juegos de bolsillo).
   */
  private switchTrack(now: number): void {
    if (!this.ctx) return;
    const wanted = this.battle ? 'batalla' : this.theme.music ?? null;
    if (wanted === this.trackId && (this.playing || !wanted)) return;
    const old = this.playing;
    const fadeOut = this.battle ? 0.35 : 1.8;
    if (old) {
      const g = old.bus.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + fadeOut);
      old.until = now + fadeOut;
      this.fading.push(old);
      window.setTimeout(() => {
        old.bus.disconnect();
        this.fading = this.fading.filter((p) => p !== old);
      }, (fadeOut + 3) * 1000);
    }
    this.playing = null;
    this.trackId = wanted;
    if (!wanted || !this.musicDuckNode) return;
    const track = MUSIC[wanted];
    const start = now + (this.battle ? 0.05 : old ? 0.35 : 0.2);
    const fadeIn = this.battle ? 0.25 : 2;
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.setValueAtTime(0, start);
    bus.gain.linearRampToValueAtTime(track.gain, start + fadeIn);
    let post: AudioNode = bus;
    if (track.muffle) {
      const lp = this.biquad();
      lp.type = 'lowpass';
      lp.frequency.value = track.muffle;
      bus.connect(lp);
      post = lp;
    }
    post.connect(this.musicDuckNode);
    if (track.room && this.musicRoom) {
      const s = this.ctx.createGain();
      s.gain.value = track.room;
      post.connect(s).connect(this.musicRoom);
    }
    // una salida por voz, con su lugar en el estéreo
    const outs = track.voices.map((v) => {
      if (!v.pan || typeof this.ctx!.createStereoPanner !== 'function') return bus;
      const p = this.ctx!.createStereoPanner();
      p.pan.value = v.pan;
      p.connect(bus);
      return p;
    });
    this.playing = { track, bus, outs, step: 0, next: start, until: Infinity };
  }

  private scheduleTrack(horizon: number): void {
    if (this.playing) this.schedulePiece(this.playing, horizon);
    for (const p of this.fading) this.schedulePiece(p, Math.min(horizon, p.until));
  }

  /** Programa los pasos hasta `horizon`: swing, golpes fantasma y un poco de mano humana. */
  private schedulePiece(p: Playing, horizon: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const tr = p.track;
    const sd = stepSeconds(tr);
    // si la pestaña estuvo dormida, no se recupera el atraso de golpe
    if (p.next < ctx.currentTime - 0.25) p.next = ctx.currentTime + 0.05;
    while (p.next < horizon) {
      const sw = swingOffset(p.step, tr.swing ?? 0, sd);
      tr.voices.forEach((v, i) => {
        let val = v.steps[p.step % v.steps.length];
        const perc = PERCUSSION.includes(v.inst);
        if (val === 0 || (Array.isArray(val) && val.length === 0)) {
          if (!perc || !v.ghost || this.lite || Math.random() >= v.ghost) return;
          val = 0.15 + Math.random() * 0.25;
        }
        const human = Math.random() * (perc ? 0.006 : 0.004);
        this.instrument(v.inst, val, p.next + sw + human, v.len * sd, v.vol * jitter(1, perc ? 0.12 : 0.06), p.outs[i]);
      });
      p.step++;
      p.next += sd;
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
      this.musicDuckNode?.gain.setTargetAtTime(this.duck(), now, 0.5);
      this.musicRoom?.gain.setTargetAtTime(this.duck(), now, 0.5);
    }
  }

  /** En combate la música no se apaga con la tensión: apenas baja para que se oiga el latido. */
  private duck(): number {
    return this.battle ? 1 - 0.3 * this.tensionLevel : musicDuck(this.theme, this.tensionLevel);
  }

  /** Entra o sale la música de batalla. */
  setBattle(on: boolean): void {
    if (this.battle === on) return;
    this.battle = on;
    if (!this.ctx || !this.droneFilter) return;
    this.switchTrack(this.ctx.currentTime);
    this.musicDuckNode?.gain.setTargetAtTime(this.duck(), this.ctx.currentTime, 0.3);
    this.musicRoom?.gain.setTargetAtTime(this.duck(), this.ctx.currentTime, 0.3);
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

    // lo que suena "lejos": un poco seco y apagado, casi todo a la sala y un eco suave
    this.reverbIn = ctx.createGain();
    this.spots.clear();
    const dryLp = this.biquad();
    dryLp.type = 'lowpass';
    dryLp.frequency.value = 3200;
    const dry = ctx.createGain();
    dry.gain.value = 0.45;
    this.reverbIn.connect(dryLp).connect(dry).connect(this.musicGain);
    if (this.roomSend) {
      const toRoom = ctx.createGain();
      toRoom.gain.value = 0.9;
      this.reverbIn.connect(toRoom).connect(this.roomSend);
    }
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.4;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const damp = this.biquad();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;
    this.reverbIn.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    damp.connect(wet).connect(this.musicGain);

    // zumbido: La y Si bemol graves (segunda menor), con filtro que oscila lento
    this.droneFilter = this.biquad();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 6;
    const droneG = ctx.createGain();
    droneG.gain.value = this.theme.droneGain ?? 0.16;
    this.droneGain = droneG;
    this.droneFilter.connect(droneG).connect(this.musicGain);
    this.musicDuckNode = ctx.createGain();
    this.musicDuckNode.gain.value = this.duck();
    this.musicDuckNode.connect(this.musicGain);
    if (this.roomSend) {
      this.musicRoom = ctx.createGain();
      this.musicRoom.gain.value = this.duck();
      this.musicRoom.connect(this.roomSend);
    }
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
        if (eff > 0.15) this.beat(0.4 + eff * 0.6, Math.max(0, this.nextBeat - t0), this.musicGain);
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
      // el fuego del lecho chisporrotea solo
      if (this.fireLevel > 0 && Math.random() < 0.55) {
        for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
          this.noise(0.006 + Math.random() * 0.018, this.fireLevel * (1 + Math.random() * 2.5), jitter(5000, 0.3), 2000, Math.random() * 0.15, 'highpass', this.spot(0.5));
        }
      }
      // caja de música (solo en los paisajes que la usan)
      if (this.nextBox < horizon && !this.theme.musicBox) this.nextBox = horizon + 5;
      if (this.nextBox < horizon) {
        const d0 = Math.max(0, this.nextBox - t0);
        const far = this.spot(0.5);
        box.forEach((f, i) => {
          const off = (Math.random() - 0.5) * 0.03; // desafinada
          const at = d0 + i * jitter(0.55, 0.06);
          this.tone('sine', f * (1 + off), f * (1 + off), 0.9, 0.05, at, far);
          this.tone('sine', f * 3.01, f * 3.01, 0.25, 0.012, at, far);
          this.tone('triangle', f * 2.01, f * 2.01, 0.4, 0.015, at, far);
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
    this.reverbIn?.disconnect();
    this.musicRoom?.disconnect();
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
    this.musicRoom = null;
    this.playing?.bus.disconnect();
    for (const p of this.fading) p.bus.disconnect();
    this.playing = null;
    this.fading = [];
    this.trackId = null;
    this.reverbIn = null;
    this.spots.clear();
  }

  /**
   * Cambia el paisaje sonoro (escenario, menú o zona de la aventura) con fundido: el
   * zumbido se desliza, los lechos se cruzan, la sala cambia de tamaño y la música
   * anterior se apaga mientras entra la nueva.
   */
  setSoundscape(id: SoundscapeId): void {
    if (this.soundscape === id) return;
    this.soundscape = id;
    this.theme = STAGE_SOUND[id];
    if (this.ctx && this.roomOut) this.roomOut.gain.setTargetAtTime(this.roomLevel(), this.ctx.currentTime, 0.8);
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

  /* ------------------------------------------------------------------ */
  /* Lecho continuo del escenario                                        */
  /* ------------------------------------------------------------------ */

  /** Oscilador lento que mueve un parámetro alrededor de su valor (`depth` arriba y abajo). */
  private lfo(rate: number, depth: number, param: AudioParam, type: OscillatorType = 'sine'): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
    this.bedSources.push(o);
    return o;
  }

  private bedNoise(color: NoiseColor): AudioBufferSourceNode | null {
    const src = this.noiseSrc(color);
    if (!src || !this.ctx) return null;
    this.startNoise(src, this.ctx.currentTime);
    this.bedSources.push(src);
    return src;
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.biquad();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private gainNode(v: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    return g;
  }

  /** Una capa del lecho, conectada a `out`. */
  private ambienceLayer(l: AmbienceLayer, out: AudioNode): void {
    const ctx = this.ctx!;
    const rate = l.rate ?? 0.1;
    // cada capa en su lugar del estéreo, para que el lugar se sienta ancho
    let dest: AudioNode = out;
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = (Math.random() * 2 - 1) * 0.5;
      p.connect(out);
      dest = p;
      if (l.kind === 'wind') this.lfo(rate * 0.6, 0.45, p.pan);
    }
    switch (l.kind) {
      case 'wind': {
        // ráfagas: el filtro y el volumen respiran a ritmos que no coinciden
        const src = this.bedNoise('brown');
        if (!src) return;
        const bp = this.filter('bandpass', l.freq, 0.9);
        const g = this.gainNode(l.gain);
        src.connect(bp).connect(g).connect(dest);
        this.lfo(rate, l.freq * 0.45, bp.frequency);
        this.lfo(rate * 1.73 + 0.013, l.gain * 0.6, g.gain);
        break;
      }
      case 'river': {
        // agua que corre: el chapoteo en banda y el rumor grave debajo
        const src = this.bedNoise('pink');
        const low = this.bedNoise('brown');
        if (!src || !low) return;
        const bp = this.filter('bandpass', l.freq, 0.7);
        const g = this.gainNode(l.gain);
        src.connect(bp).connect(g).connect(dest);
        this.lfo(rate, l.freq * 0.25, bp.frequency);
        this.lfo(5.3, l.gain * 0.15, g.gain);
        const lp = this.filter('lowpass', 260);
        low.connect(lp).connect(this.gainNode(l.gain * 0.8)).connect(dest);
        break;
      }
      case 'insects': {
        // chicharra/grillo: tono agudo cortado a ritmo (`rate`) que crece y baja en coro
        const chirp = this.gainNode(0.5);
        const swell = this.gainNode(0.6);
        const g = this.gainNode(l.gain);
        for (const k of [1, 1.007]) {
          const o = ctx.createOscillator();
          o.frequency.value = l.freq * k;
          o.connect(chirp);
          o.start();
          this.bedSources.push(o);
        }
        // el corte va suavizado para que no haga clic
        const gate = ctx.createOscillator();
        gate.type = 'square';
        gate.frequency.value = rate;
        const smooth = this.filter('lowpass', 180);
        const depth = this.gainNode(0.5);
        gate.connect(smooth).connect(depth).connect(chirp.gain);
        gate.start();
        this.bedSources.push(gate);
        this.lfo(0.2 + Math.random() * 0.5, 0.4, swell.gain);
        chirp.connect(swell).connect(g).connect(dest);
        break;
      }
      case 'fire': {
        // rumor de la llama que titila; las chispas las pone el programador de sucesos
        const src = this.bedNoise('brown');
        if (!src) return;
        const lp = this.filter('lowpass', l.freq, 0.5);
        const g = this.gainNode(l.gain);
        src.connect(lp).connect(g).connect(dest);
        this.lfo(rate, l.gain * 0.45, g.gain);
        this.lfo(rate * 0.37, l.freq * 0.35, lp.frequency);
        this.fireLevel += l.gain * 0.6;
        break;
      }
      case 'rain': {
        const src = this.bedNoise('pink');
        if (!src) return;
        const hp = this.filter('highpass', l.freq);
        const lp = this.filter('lowpass', 7000);
        const g = this.gainNode(l.gain);
        src.connect(hp).connect(lp).connect(g).connect(dest);
        this.lfo(rate, l.gain * 0.2, g.gain);
        break;
      }
      case 'room': {
        const src = this.bedNoise('brown');
        if (!src) return;
        const lp = this.filter('lowpass', l.freq);
        const g = this.gainNode(l.gain);
        src.connect(lp).connect(g).connect(dest);
        this.lfo(0.05, l.gain * 0.25, g.gain);
        break;
      }
      case 'crowd': {
        // murmullo: voces en banda que suben y bajan a ritmo de sílabas
        const src = this.bedNoise('pink');
        if (!src) return;
        const bp = this.filter('bandpass', l.freq, 1.2);
        const g = this.gainNode(l.gain);
        src.connect(bp).connect(g).connect(dest);
        this.lfo(rate, l.gain * 0.4, g.gain);
        this.lfo(rate * 0.23, l.freq * 0.3, bp.frequency);
        break;
      }
    }
  }

  /** Lecho continuo del escenario por capas (viento, agua, insectos, fuego…), con fundido. */
  private startBed(): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
    out.connect(this.musicGain);
    this.bedOut = out;
    this.bedSources = [];
    this.fireLevel = 0;
    const amb = this.theme.ambience;
    if (amb?.length) {
      for (const l of amb) this.ambienceLayer(l, out);
      return;
    }
    // sin capas: el lecho simple de ruido filtrado
    const b = this.theme.bed;
    const src = this.bedNoise('pink');
    if (!src) return;
    const f = this.filter(b.type, b.freq, b.q);
    const g = this.gainNode(b.gain);
    src.connect(f).connect(g).connect(out);
    this.lfo(b.lfoRate, b.lfoDepth, g.gain);
  }

  private stopBed(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this.bedOut;
    if (out) {
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 2);
      window.setTimeout(() => out.disconnect(), 2600);
    }
    for (const s of this.bedSources) {
      try { s.stop(t + 2.2); } catch { /* ya parado */ }
    }
    this.bedSources = [];
    this.bedOut = null;
    this.fireLevel = 0;
  }

  /** Sonidos característicos de cada escenario (todos suenan "lejos", con eco y en un lugar del estéreo). */
  private stageEvent(name: StageEvent): void {
    if (!this.ready) return;
    const far = this.spot();
    const r = Math.random;
    const now = this.ctx!.currentTime;
    switch (name) {
      case 'whisper':
      case 'creak':
      case 'distantScream':
        this.play(name);
        break;
      case 'frog': {
        // croar: pulsos nasales con su formante, en ráfaga
        const base = 230 + r() * 120;
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          this.shaped('square', now + i * jitter(0.1, 0.2), [[0, base], [0.06, base * 0.75]], [[0.005, 0.05], [0.06, 0]], far, { type: 'bandpass', freq: base * 3, q: 3 }, { rate: 70, depth: 0.6 });
        }
        break;
      }
      case 'owl': {
        // búho: "uu-uu" hueco con un poquito de aire
        const f = jitter(420, 0.06);
        this.shaped('sine', now, [[0, f * 0.95], [0.08, f], [0.35, f * 0.9]], [[0.06, 0.07], [0.3, 0.05], [0.38, 0]], far);
        this.shaped('sine', now + 0.55, [[0, f * 0.95], [0.1, f], [0.55, f * 0.84]], [[0.08, 0.07], [0.45, 0.05], [0.6, 0]], far);
        this.noise(0.3, 0.008, f * 2, f * 2, 0.55, 'bandpass', far, 'pink', 3);
        break;
      }
      case 'thunder':
        // trueno: chasquido lejano y un rumor que rueda con golpes dentro
        this.noise(0.15, 0.2, 3000, 800, 0, 'bandpass', far, 'pink');
        this.noise(2.8, 0.5, 600, 50, 0.08, 'lowpass', far, 'brown', undefined, 0.15);
        for (let i = 0; i < 4; i++) this.noise(0.5, 0.25, 300, 60, 0.2 + r() * 1.4, 'lowpass', far, 'brown', undefined, 0.05);
        this.tone('sine', 48, 28, 2.4, 0.35, 0.05, far);
        break;
      case 'whistleTune': {
        // el silbido del Silbón: do-re-mi-fa-sol-la-si, cada vez más agudo, con aire y vibrato
        const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77];
        notes.forEach((f, i) => {
          this.shaped('sine', now + i * 0.3, [[0, f * 0.97], [0.06, f]], [[0.04, 0.05], [0.24, 0.04], [0.29, 0]], far, undefined, { rate: 5.5, depth: 0.15 });
          this.noise(0.25, 0.006, f * 2, f * 2, i * 0.3, 'bandpass', far, 'white', 6);
        });
        break;
      }
      case 'crickets':
        for (let i = 0; i < 6; i++) this.tone('sine', 4200 + r() * 300, 4100, 0.03, 0.02, i * 0.07 + (i > 2 ? 0.25 : 0), far);
        break;
      case 'flute': {
        // flauta de caña: seno con soplo y vibrato, frase pentatónica
        const pent = [392, 440, 523.25, 587.33, 659.25];
        for (let i = 0; i < 4; i++) {
          const f = pent[Math.floor(r() * pent.length)];
          this.shaped('sine', now + i * 0.55, [[0, f * 1.01], [0.08, f]], [[0.08, 0.04], [0.45, 0.03], [0.6, 0]], far, undefined, { rate: 5, depth: 0.12 });
          this.tone('triangle', f * 2, f * 2, 0.4, 0.008, i * 0.55, far);
          this.noise(0.4, 0.006, f * 3, f * 3, i * 0.55, 'bandpass', far, 'pink', 5, 0.06);
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
        this.noise(0.45, 0.12, 1400, 300, 0, 'bandpass', far, 'pink');
        this.noise(0.08, 0.06, 3000, 1500, 0, 'bandpass', far);
        break;
      case 'crackle':
        for (let i = 0; i < 9; i++) this.noise(0.006 + r() * 0.02, 0.18, jitter(5500, 0.3), 2500, r() * 0.7, 'highpass', this.spot(0.4));
        break;
      case 'bull':
        this.shaped('sawtooth', now, [[0, 115], [1.3, 70]], [[0.15, 0.07], [1.1, 0.06], [1.3, 0]], far, { type: 'lowpass', freq: 700, q: 2 }, { rate: 11, depth: 0.25 });
        this.shaped('sawtooth', now + 0.02, [[0, 118], [1.3, 68]], [[0.15, 0.05], [1.1, 0.04], [1.3, 0]], far, { type: 'lowpass', freq: 600 });
        break;
      case 'bell':
        // campana de iglesia: parciales inarmónicas que se apagan despacio
        this.bell(196, 0.07, 0, 3.4, far, [[1, 1], [2, 0.57], [2.76, 0.43], [5.4, 0.2], [0.5, 0.3]]);
        break;
      case 'dogHowl':
        this.shaped('sawtooth', now, [[0, 480], [0.6, 690], [1.7, 430]], [[0.15, 0.025], [1.4, 0.025], [1.7, 0]], far, { type: 'bandpass', freq: 900, q: 2 }, { rate: 5.5, depth: 0.2 });
        break;
      case 'hooves':
        for (const t of [0, 0.17, 0.5, 0.67, 1.0, 1.17]) this.noise(0.04, jitter(0.14, 0.2), jitter(900, 0.15), 300, t + r() * 0.01, 'lowpass', far);
        break;
      case 'steps':
        for (const t of [0, 0.55, 1.1]) this.noise(0.08, jitter(0.16, 0.2), jitter(400, 0.15), 120, t + r() * 0.02, 'lowpass', far, 'pink');
        break;
      case 'chatter':
      case 'prayer': {
        // murmullo de voces: ráfagas con formantes; el rezo es más grave y parejo
        const low = name === 'prayer';
        const n = low ? 10 : 7;
        for (let i = 0; i < n; i++) {
          const f = (low ? 420 : 650) + r() * (low ? 260 : 800);
          this.noise(0.1 + r() * 0.2, low ? 0.04 : 0.06, f, f * 0.75, i * (low ? 0.22 : 0.17) + r() * 0.1, 'bandpass', far, 'pink', 4, 0.02);
        }
        break;
      }
      case 'glass':
        for (const [d, f] of [[0, 2600 + r() * 500], [0.07, 3100 + r() * 400]]) this.bell(f, 0.03, d, 0.35, far, [[1, 1], [2.7, 0.35], [5.1, 0.12]]);
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
        this.shaped('noise', now, [[0, 260]], [[2, 0.12], [3, 0.12], [5.5, 0]], far, { type: 'lowpass', freq: 260 });
        this.shaped('sine', now, [[0, 480], [2.5, 720], [5.5, 520]], [[2, 0.015], [3, 0.015], [5.5, 0]], far);
        for (let i = 0; i < 6; i++) this.noise(0.05, 0.05, 700, 300, 1.6 + i * 0.32, 'lowpass', far);
        break;
      }
      case 'horn': {
        const f = 380 + r() * 120;
        this.shaped('square', now, [[0, f]], [[0.01, 0.02], [0.2, 0.02], [0.24, 0]], far, { type: 'lowpass', freq: 1500 });
        break;
      }
      case 'moto':
        this.shaped('sawtooth', now, [[0, 70], [0.8, 140], [1.8, 85]], [[0.6, 0.03], [1.2, 0.03], [1.9, 0]], far, { type: 'lowpass', freq: 900 }, { rate: 35, depth: 0.4 });
        break;
      case 'farWhistle':
        // silbido humano largo en el monte: baja, para y vuelve a subir
        this.shaped('sine', now, [[0, 1500], [0.9, 1080], [1.3, 1080], [1.7, 1320]], [[0.1, 0.035], [0.9, 0.03], [1.05, 0], [1.35, 0.03], [1.75, 0]], far, undefined, { rate: 6, depth: 0.1 });
        break;
      case 'branch':
        this.noise(0.03, 0.18, 3000, 1500, 0, 'bandpass', far);
        this.noise(0.025, 0.1, 2500, 1200, 0.07, 'bandpass', far);
        this.noise(0.5, 0.04, 2000, 800, 0.1, 'bandpass', far, 'pink', 1);
        this.tone('sine', 140, 60, 0.12, 0.08, 0.02, far);
        break;
      case 'bamboo': {
        // guaduas que se golpean con el viento: toques huecos irregulares
        const base = 280 + r() * 90;
        for (let i = 0; i < 2 + Math.floor(r() * 3); i++) {
          const f = base * (1 + r() * 0.15);
          this.bell(f, 0.06, i * (0.12 + r() * 0.25), 0.18, far, [[1, 1], [2.4, 0.25]]);
        }
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

/**
 * Sonido de paz (campanitas que suben y un coro suave, ~4 s): para cuando un mito vencido
 * se deshace y descansa. Respeta el silencio (`sfx.enabled`).
 */
export function playCalm(): void {
  sfx.play('calm');
}
