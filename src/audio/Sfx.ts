/**
 * Efectos de sonido sintetizados con WebAudio: ondas cuadradas, ruido y barridos,
 * en el espíritu de los chips de 16 bits. Sin archivos externos.
 */

export type SfxName =
  | 'hit' | 'heavy' | 'block' | 'whoosh' | 'jump' | 'land' | 'ko'
  | 'wave' | 'roots' | 'mist' | 'vortex' | 'bloom' | 'select' | 'confirm' | 'round' | 'timer' | 'ultimate'
  | 'scream' | 'fire' | 'whistle' | 'bolt' | 'slash';

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
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

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFrom: number, filterTo: number, delay = 0, type: BiquadFilterType = 'lowpass'): void {
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
    src.connect(f).connect(g).connect(this.master);
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
    }
  }

  /** Música de fondo: secuenciador chiptune sencillo (bajo + arpegio). */
  startMusic(): void {
    if (!this.ctx || !this.master || this.musicTimer !== null) return;
    const ctx = this.ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    const bass = [55, 55, 65.41, 65.41, 49, 49, 58.27, 58.27];
    const arp = [220, 261.63, 329.63, 261.63, 196, 246.94, 293.66, 246.94];
    let step = 0;
    const stepDur = 0.22;
    let nextTime = ctx.currentTime + 0.05;
    const schedule = () => {
      if (!this.musicGain) return;
      while (nextTime < ctx.currentTime + 0.4) {
        const i = step % 8;
        const bar = Math.floor(step / 8) % 4;
        const t = nextTime;
        // bajo
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        b.type = 'triangle';
        b.frequency.value = bass[i] * (bar === 3 ? 0.75 : 1);
        bg.gain.setValueAtTime(0.5, t);
        bg.gain.exponentialRampToValueAtTime(0.01, t + stepDur * 0.9);
        b.connect(bg).connect(this.musicGain);
        b.start(t);
        b.stop(t + stepDur);
        // arpegio
        if (step % 2 === 0 || bar >= 2) {
          const a = ctx.createOscillator();
          const ag = ctx.createGain();
          a.type = 'square';
          a.frequency.value = arp[(i + bar * 2) % 8] * (bar === 1 ? 1.5 : 1);
          ag.gain.setValueAtTime(0.12, t);
          ag.gain.exponentialRampToValueAtTime(0.01, t + stepDur * 0.6);
          a.connect(ag).connect(this.musicGain);
          a.start(t);
          a.stop(t + stepDur * 0.7);
        }
        // percusión de ruido
        if (i % 2 === 0 && this.noiseBuffer) {
          const n = ctx.createBufferSource();
          n.buffer = this.noiseBuffer;
          const nf = ctx.createBiquadFilter();
          nf.type = i % 4 === 0 ? 'lowpass' : 'highpass';
          nf.frequency.value = i % 4 === 0 ? 200 : 5000;
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(i % 4 === 0 ? 0.5 : 0.15, t);
          ng.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
          n.connect(nf).connect(ng).connect(this.musicGain);
          n.start(t);
          n.stop(t + 0.1);
        }
        nextTime += stepDur;
        step++;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 120);
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
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}

export const sfx = new Synth();
