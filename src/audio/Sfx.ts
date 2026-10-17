/**
 * Efectos de sonido sintetizados con WebAudio: ondas cuadradas, ruido y barridos,
 * en el espíritu de los chips de 16 bits, y un ambiente de terror (zumbido disonante,
 * caja de música desafinada, susurros, crujidos, latido según la tensión y gritos de
 * susto). Sin archivos externos.
 */

import { heartbeatBpm } from '../combat/Fear';

export type SfxName =
  | 'hit' | 'heavy' | 'block' | 'whoosh' | 'jump' | 'land' | 'ko'
  | 'wave' | 'roots' | 'mist' | 'vortex' | 'bloom' | 'select' | 'confirm' | 'round' | 'timer' | 'ultimate'
  | 'scream' | 'fire' | 'whistle' | 'bolt' | 'slash'
  | 'screamer' | 'heartbeat' | 'whisper' | 'creak' | 'distantScream' | 'sting';

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneHigh: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  /** fuentes continuas del ambiente (zumbido, LFO, tono agudo) para pararlas al detener la música */
  private ambientSources: OscillatorNode[] = [];
  private tensionLevel = 0;
  private nextBeat = 0;
  private nextEvent = 0;
  private nextBox = 0;
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
        this.noise(0.09, 0.5, 2400, 300);
        this.tone('square', 220, 80, 0.08, 0.25);
        break;
      case 'heavy':
        this.noise(0.16, 0.7, 1800, 120);
        this.tone('square', 160, 40, 0.16, 0.35);
        this.tone('sawtooth', 90, 30, 0.2, 0.2, 0.01);
        break;
      case 'block':
        this.tone('square', 900, 500, 0.05, 0.2);
        this.noise(0.05, 0.25, 4000, 2000, 0, 'highpass');
        break;
      case 'whoosh':
        this.noise(0.12, 0.18, 600, 2200, 0, 'bandpass');
        break;
      case 'jump':
        this.tone('square', 240, 520, 0.12, 0.12);
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
    }
  }

  /** 0..1: acelera el latido y abre el zumbido de fondo. */
  setTension(t: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, t));
    if (this.ctx && this.droneFilter && this.droneHigh) {
      const now = this.ctx.currentTime;
      this.droneFilter.frequency.setTargetAtTime(220 + this.tensionLevel * 900, now, 0.4);
      this.droneHigh.gain.setTargetAtTime(this.tensionLevel * 0.05, now, 0.6);
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
    droneG.gain.value = 0.16;
    this.droneFilter.connect(droneG).connect(this.musicGain);
    for (const f of [55, 58.27, 27.5]) {
      const o = ctx.createOscillator();
      o.type = f < 30 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      o.connect(this.droneFilter);
      o.start();
      this.ambientSources.push(o);
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
    this.nextBeat = now + 1;
    this.nextEvent = now + 4;
    this.nextBox = now + 2;
    const schedule = () => {
      if (!this.ctx || !this.musicGain) return;
      const t0 = ctx.currentTime;
      const horizon = t0 + 0.5;
      // latido
      while (this.nextBeat < horizon) {
        if (this.tensionLevel > 0.15) {
          const d = Math.max(0, this.nextBeat - t0);
          this.tone('sine', 62, 38, 0.18, 0.35 + this.tensionLevel * 0.6, d, this.musicGain);
          this.tone('sine', 55, 34, 0.2, 0.25 + this.tensionLevel * 0.5, d + 0.22, this.musicGain);
        }
        this.nextBeat += 60 / heartbeatBpm(this.tensionLevel);
      }
      // caja de música
      if (this.nextBox < horizon) {
        const d0 = Math.max(0, this.nextBox - t0);
        box.forEach((f, i) => {
          const off = (Math.random() - 0.5) * 0.03; // desafinada
          this.tone('sine', f * (1 + off), f * (1 + off), 0.9, 0.05, d0 + i * 0.55, this.reverbIn ?? undefined);
          this.tone('triangle', f * 2.01, f * 2.01, 0.4, 0.015, d0 + i * 0.55, this.reverbIn ?? undefined);
        });
        this.nextBox += 14 + Math.random() * 10;
      }
      // sucesos al azar
      if (this.nextEvent < horizon) {
        const r = Math.random();
        this.play(r < 0.4 ? 'whisper' : r < 0.75 ? 'creak' : 'distantScream');
        this.nextEvent += 5 + Math.random() * 9 - this.tensionLevel * 3;
      }
    };
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
    this.droneFilter = null;
    this.droneHigh = null;
    this.reverbIn = null;
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}

export const sfx = new Synth();
