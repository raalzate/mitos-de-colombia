/**
 * Utilidades de señal puras (sin WebAudio) para el sintetizador: ruidos de colores con bucle
 * sin costura, respuesta al impulso de la reverberación generada por código, curvas de
 * saturación, variación aleatoria de cada golpe y swing de la música. Todo se calcula una
 * vez al desbloquear el audio, así en el celular no cuesta nada mientras se juega.
 */

export type Rand = () => number;

export type NoiseColor = 'white' | 'pink' | 'brown';

/**
 * Ruido de color en [-1, 1]. El final se funde con el principio (`fade` muestras) para que el
 * bucle no haga clic: el ruido café se va lejos del cero y sin el fundido salta al repetir.
 */
export function makeNoise(color: NoiseColor, length: number, rand: Rand = Math.random, fade = Math.min(2048, Math.floor(length / 8))): Float32Array {
  const total = length + Math.max(0, fade);
  const raw = new Float32Array(total);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let last = 0;
  for (let i = 0; i < total; i++) {
    const w = rand() * 2 - 1;
    if (color === 'white') {
      raw[i] = w;
    } else if (color === 'pink') {
      // filtro de Paul Kellet: -3 dB por octava
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      // paseo aleatorio con fuga: -6 dB por octava, rumor de río y viento
      last = (last + 0.02 * w) / 1.02;
      raw[i] = last * 3.5;
    }
  }
  // quita el desvío medio (el café se puede ir hacia un lado)
  let mean = 0;
  for (let i = 0; i < total; i++) mean += raw[i];
  mean /= total;
  for (let i = 0; i < total; i++) raw[i] -= mean;
  // lo que sobra después del final se funde sobre el principio: al repetir, el último valor
  // lleva sin escalón al primero (que es casi el que seguía en la señal original)
  const out = raw.slice(0, length);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] = raw[i] * k + raw[length + i] * (1 - k);
  }
  normalize(out, 0.95);
  return out;
}

/** Escala para que el pico quede en `peak`. */
export function normalize(data: Float32Array, peak: number): void {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  if (max === 0) return;
  const k = peak / max;
  for (let i = 0; i < data.length; i++) data[i] *= k;
}

export interface ImpulseOptions {
  /** duración de la cola (s) */
  seconds: number;
  /** curvatura del decaimiento: más alto = se apaga antes */
  decay: number;
  /** retardo antes de la cola (s) */
  preDelay?: number;
  /** 0..1: cuánto se oscurece la cola con el tiempo (piedra/monte húmedo) */
  damping?: number;
  /** primeras reflexiones (s desde el inicio) */
  early?: number[];
}

/**
 * Respuesta al impulso estéreo para un ConvolverNode: primeras reflexiones y una cola de ruido
 * que decae y se oscurece, distinta en cada canal (da amplitud). Devuelve [izquierda, derecha].
 */
export function makeImpulse(sampleRate: number, o: ImpulseOptions, rand: Rand = Math.random): [Float32Array, Float32Array] {
  const len = Math.max(1, Math.floor(sampleRate * o.seconds));
  const pre = Math.floor(sampleRate * (o.preDelay ?? 0.01));
  const damping = o.damping ?? 0.5;
  const chans: [Float32Array, Float32Array] = [new Float32Array(len), new Float32Array(len)];
  chans.forEach((d, c) => {
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      const env = Math.pow(1 - t, o.decay);
      // filtro de un polo que se cierra con el tiempo: los agudos mueren antes
      const a = 1 - Math.min(0.97, damping * t * 0.97);
      lp += a * ((rand() * 2 - 1) - lp);
      d[i] = lp * env;
    }
    for (const [k, e] of (o.early ?? []).entries()) {
      const i = Math.floor(sampleRate * (e + (c ? 0.0031 : 0)));
      if (i < len) d[i] += (k % 2 ? -1 : 1) * 0.5 * Math.pow(0.7, k);
    }
    normalize(d, 0.6);
  });
  return chans;
}

/** Curva de saturación suave (tanh) para dar cuerpo sin recortar duro. */
export function softClipCurve(drive: number, n = 1024): Float32Array {
  const curve = new Float32Array(n);
  const k = Math.tanh(drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / k;
  }
  return curve;
}

/** Valor con variación relativa ±amount (0.1 = ±10 %). */
export function jitter(base: number, amount: number, rand: Rand = Math.random): number {
  return base * (1 + (rand() * 2 - 1) * amount);
}

/** Retraso del paso por el swing: los pasos impares se atrasan `swing` (0..0.5) de un paso. */
export function swingOffset(step: number, swing: number, stepDur: number): number {
  return step % 2 === 1 ? Math.max(0, Math.min(0.5, swing)) * stepDur : 0;
}
