/**
 * Orden por profundidad para listas que ya vienen casi ordenadas (el mapa de la aventura tiene
 * miles de piezas quietas y solo unas pocas cambian de profundidad en cada fotograma).
 *
 * Phaser ordena toda la lista con un merge sort cada vez que algo llama a `setDepth`, aunque el
 * valor no cambie; en el celular eso era lo que más costaba del hilo principal en el mapa. Aquí,
 * si hay pocos desórdenes, basta una inserción (casi lineal); si hay muchos (la escena recién
 * armada), se usa el orden de siempre. Ambos son estables: el resultado es exactamente el mismo.
 */

/** La profundidad tal como la guarda Phaser (`_depth`): leer el campo evita una llamada al getter por pieza. */
export interface HasDepth {
  _depth: number;
}

/** Más desórdenes que esto y la inserción deja de compensar. */
export const MAX_INSERTION_DESCENTS = 32;

/** Ordena `list` por profundidad (estable). `fallback` ordena la lista entera cuando está muy revuelta. */
export function sortByDepthStable<T extends HasDepth>(list: T[], fallback: (list: T[]) => void): void {
  const n = list.length;
  let descents = 0;
  let prev = n > 0 ? list[0]._depth : 0;
  for (let i = 1; i < n; i++) {
    const d = list[i]._depth;
    if (d < prev && ++descents > MAX_INSERTION_DESCENTS) {
      fallback(list);
      return;
    }
    prev = d;
  }
  if (descents === 0) return;
  for (let i = 1; i < n; i++) {
    const item = list[i];
    const d = item._depth;
    let j = i - 1;
    if (list[j]._depth <= d) continue;
    while (j >= 0 && list[j]._depth > d) {
      list[j + 1] = list[j];
      j--;
    }
    list[j + 1] = item;
  }
}
