import type { FighterId } from '../combat/CombatTypes';
import { GUARDIANS, STEP, walkable, type Cell, type Dir } from '../adventure/World';
import { ALL_MAP_IDS, campoSpot, cellsOf, doorCell, getMap, interiorOf, type GameMap, type MapId, type MapProp } from '../adventure/Maps';
import { homeOf, type AdventureState } from '../adventure/State';
import { Pilot } from './Pilot';

/** Lo que el bot ve de la escena del mapa en cada fotograma. */
export interface BotView {
  st: AdventureState;
  gm: GameMap;
  grid: Cell[][];
  npcs: { x: number; y: number; name: string }[];
  hidden: { id: FighterId; x: number; y: number }[];
  /** el último mito del que la gente le dio pista a Juan */
  hinted: FighterId | null;
  /** la escena espera a Juan: sin diálogo, sin suceso en curso y quieto */
  free: boolean;
  mapOpen: boolean;
  dialog: { busy: boolean; typing: boolean; page: string; choice: { question: string; options: string[]; index: number } | null };
  blocked(x: number, y: number): boolean;
  taken(p: MapProp): boolean;
}

type Goal =
  | { kind: 'wait' }
  | { kind: 'talk'; name: string }
  | { kind: 'wood' }
  | { kind: 'cemetery' }
  | { kind: 'hunt'; id: FighterId };

interface Edge { x: number; y: number; to: MapId; door: boolean }

const KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const k = (x: number, y: number) => `${x},${y}`;
/** respuestas que no alargan la demo: sin cuentos, sin bailes, sin viajes, sin guardar */
const NO = ['OTRO DÍA', 'TODAVÍA NO', 'ME DA PENA', 'NO'];
const CLARO: [number, number] = [25, 5];
/** el cementerio, donde sale la mano peluda */
const CEMENTERIO = { x0: 44, y0: 8, x1: 58, y1: 16 };
/** si la mano peluda no sale en este rato, el bot sigue con lo suyo */
const CEMETERY_FRAMES = 60 * 40;

/** Los mapas de San Agustín por los que anda el bot (las ciudades no hacen falta para terminar). */
const WORLD = ALL_MAP_IDS.filter((id) => id === 'campo' || id === 'monte' || id === 'charco' || (id.startsWith('int:') && getMap(id).exit?.to === 'campo'));

function edgesOf(id: MapId): Edge[] {
  const m = getMap(id);
  const out: Edge[] = (m.links ?? []).map((l) => ({ x: l.x, y: l.y, to: l.to, door: false }));
  if (m.exit) out.push({ x: m.exit.x, y: m.exit.y, to: m.exit.to, door: false });
  for (const b of m.buildings) {
    const to = interiorOf(b);
    if (to && WORLD.includes(to)) {
      const [x, y] = doorCell(b);
      out.push({ x, y, to, door: true });
    }
  }
  return out.filter((e) => WORLD.includes(e.to));
}

/** Primera salida a tomar para ir de un mapa a otro. */
function nextEdge(from: MapId, to: MapId): Edge | null {
  const prev = new Map<MapId, { via: MapId; e: Edge }>();
  const q = [from];
  const seen = new Set([from]);
  while (q.length) {
    const m = q.shift()!;
    if (m === to) break;
    for (const e of edgesOf(m)) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { via: m, e });
      q.push(e.to);
    }
  }
  let cur = to;
  while (prev.has(cur)) {
    const p = prev.get(cur)!;
    if (p.via === from) return p.e;
    cur = p.via;
  }
  return null;
}

/** En qué mapa vive alguien, por su nombre. */
function homeMapOf(name: string): MapId | null {
  return WORLD.find((id) => getMap(id).npcs.some((n) => n.name === name)) ?? null;
}

/**
 * Juega el modo aventura solo: sigue las misiones en orden (machete, mapa, escapulario, perro, caballo),
 * sale a buscar a los mitos uno por uno, el más cercano primero, y vuelve donde la abuela para el final.
 */
export class AdventureBot {
  private pilot = new Pilot();
  private wait = 0;
  private page = '';
  private hunting: FighterId | null = null;
  private lastPos = '';
  private still = 0;
  private wiggle = 0;
  private cemetery = 0;
  private hintUsed: FighterId | null = null;
  /** va pa'l yipao: a la pregunta del viaje dice que sí */
  private trip = false;
  /** fotogramas buscando a Lucero; si no lo alcanza en un rato, sigue a pie hasta la próxima pelea */
  private toHorse = 0;
  private horseCalmed = -1;

  tick(v: BotView): void {
    this.pilot.frame();
    if (v.mapOpen) {
      this.pilot.release();
      if (++this.wait > 120) { this.pilot.tap('Space', 20); this.wait = 0; }
      return;
    }
    if (v.dialog.choice) { this.choose(v.dialog.choice); return; }
    if (v.dialog.busy) { this.read(v.dialog); return; }
    this.wait = 0;
    this.page = '';
    if (!v.free) { this.pilot.release(); return; }
    this.walk(v);
  }

  /** Lee cada página con calma para que se alcance a ver, y sigue. */
  private read(d: BotView['dialog']): void {
    this.pilot.release();
    if (d.page !== this.page) { this.page = d.page; this.wait = 0; }
    if (d.typing) return;
    if (++this.wait > 30 + d.page.length * 0.2) {
      if (this.pilot.tap('Space', 8)) this.wait = 0;
    }
  }

  private choose(c: NonNullable<BotView['dialog']['choice']>): void {
    this.pilot.release();
    const go = c.question.includes('AREPA') || c.question.includes('LUCERO') || (this.trip && c.options.includes('¡VÁMONOS!'));
    let want = go ? 0 : c.options.findIndex((o) => NO.includes(o));
    if (want < 0) want = 0;
    if (c.index !== want) { this.pilot.tap('ArrowDown', 14); this.wait = 0; return; }
    if (++this.wait > 40 && this.pilot.tap('Space', 20)) this.wait = 0;
  }

  private goal(v: BotView): Goal {
    const s = v.st;
    const f = (x: string) => s.flags.includes(x);
    if (f('fin') || !f('intro')) return { kind: 'wait' };
    if (!f('machete')) return f('encargo_lena') && !f('lena') ? { kind: 'wood' } : { kind: 'talk', name: 'DON JULIO' };
    if (!f('mapa')) return { kind: 'talk', name: 'CABO RAMÍREZ' };
    // primero el susto de la mano peluda en el cementerio; después el padre da el escapulario que la ahuyenta
    if (!f('escapulario') && !f('escapulario_perdido')) {
      if (!f('espiritu_mano') && this.cemetery < CEMETERY_FRAMES) return { kind: 'cemetery' };
      return { kind: 'talk', name: 'PADRE ANSELMO' };
    }
    if (!f('perro')) {
      if (f('arepa') || !f('perro_visto')) return { kind: 'talk', name: 'PERRO CALLEJERO' };
      return { kind: 'talk', name: 'DOÑA GLORIA' };
    }
    if (!f('oferta_caballo')) return { kind: 'talk', name: 'DON RUBÉN' };
    if (!s.calmed.includes('silbon')) return { kind: 'hunt', id: 'silbon' };
    if (!f('caballo')) return { kind: 'talk', name: 'DON RUBÉN' };
    // ya se hundió en el barrizal: de ahí en adelante anda en Lucero
    if (s.calmed.length !== this.horseCalmed) { this.horseCalmed = s.calmed.length; this.toHorse = 0; }
    if (f('lodo') && !s.riding && v.gm.id === 'campo' && v.npcs.some((n) => n.name === 'LUCERO') && this.toHorse++ < 60 * 20) return { kind: 'talk', name: 'LUCERO' };
    const left = GUARDIANS.filter((g) => !s.calmed.includes(g.id));
    if (!left.length) return { kind: 'talk', name: 'ABUELA ROSA' };
    if (!this.hunting || s.calmed.includes(this.hunting)) {
      // la gente le dio una pista: al escoger el próximo, Juan le hace caso
      if (v.hinted && v.hinted !== this.hintUsed && !s.calmed.includes(v.hinted)) {
        this.hintUsed = v.hinted;
        this.hunting = v.hinted;
        return { kind: 'hunt', id: this.hunting };
      }
      // el más cercano, contado sobre el campo
      const [hx, hy] = campoSpot(s.map, s.x, s.y) ?? [s.x, s.y];
      const d = (id: FighterId) => {
        const { map, zone } = homeOf(s, GUARDIANS.find((g) => g.id === id)!);
        const [cx, cy] = campoSpot(map, (zone.x0 + zone.x1) >> 1, (zone.y0 + zone.y1) >> 1) ?? [0, 0];
        return Math.abs(cx - hx) + Math.abs(cy - hy);
      };
      this.hunting = left.map((g) => g.id).sort((a, b) => d(a) - d(b))[0];
    }
    return { kind: 'hunt', id: this.hunting };
  }

  private walk(v: BotView): void {
    const here = k(v.st.x, v.st.y);
    this.still = here === this.lastPos ? this.still + 1 : 0;
    this.lastPos = here;
    // atascado (alguien en el camino): un paso a un lado
    if (this.still > 150) { this.still = 0; this.wiggle = 20; }
    if (this.wiggle > 0) {
      this.wiggle--;
      const d = DIRS.find((x) => !v.blocked(v.st.x + STEP[x][0], v.st.y + STEP[x][1]));
      this.pilot.hold(d ? KEY[d] : null);
      return;
    }

    const g = this.goal(v);
    if (g.kind === 'wait') { this.pilot.release(); return; }
    const target = g.kind === 'talk' ? (g.name === 'LUCERO' ? 'campo' : homeMapOf(g.name)) : g.kind === 'wood' ? 'monte' : g.kind === 'cemetery' ? 'campo' : homeOf(v.st, GUARDIANS.find((x) => x.id === g.id)!).map;
    if (!target) { this.pilot.release(); return; }
    if (target !== v.gm.id) {
      // a Medellín y de vuelta se va en el yipao de don Evelio, desde la terminal
      const city = target === 'medellin' || v.gm.id === 'medellin';
      if (city && (v.gm.id === 'campo' || v.gm.id === 'medellin')) {
        this.trip = true;
        const evelio = v.npcs.find((n) => n.name === 'DON EVELIO');
        if (evelio) this.face(v, [[evelio.x, evelio.y]]);
        else this.pilot.release();
        return;
      }
      this.trip = false;
      this.travel(v, target === 'medellin' ? 'campo' : target);
      return;
    }
    this.trip = false;

    if (g.kind === 'talk') {
      const n = v.npcs.find((x) => x.name === g.name);
      if (n) this.face(v, [[n.x, n.y]]);
      else this.pilot.release();
      return;
    }
    if (g.kind === 'cemetery') { this.haunt(v); return; }
    if (g.kind === 'wood') {
      const logs = v.gm.props.filter((p) => p.kind === 'tronco' && !v.taken(p));
      const near = logs.sort((a, b) => Math.abs(a.x - CLARO[0]) + Math.abs(a.y - CLARO[1]) - Math.abs(b.x - CLARO[0]) - Math.abs(b.y - CLARO[1]))[0];
      if (near) this.face(v, cellsOf(near));
      return;
    }
    this.hunt(v, g.id);
  }

  /** Anda por la tierra del cementerio, de tumba en tumba, hasta que sale la mano peluda. */
  private haunt(v: BotView): void {
    const { x, y } = v.st;
    const inside = x >= CEMENTERIO.x0 && x <= CEMENTERIO.x1 && y >= CEMENTERIO.y0 && y <= CEMENTERIO.y1 && v.grid[y][x] === 'c';
    if (!inside) {
      const goals = new Set<string>();
      for (let cy = CEMENTERIO.y0; cy <= CEMENTERIO.y1; cy++) for (let cx = CEMENTERIO.x0; cx <= CEMENTERIO.x1; cx++) if (v.grid[cy][cx] === 'c') goals.add(k(cx, cy));
      this.step(v, goals);
      return;
    }
    this.cemetery++;
    // un paso a una casilla de tierra vecina, sin devolverse siempre por el mismo lado
    const opts = DIRS.filter((d) => v.grid[y + STEP[d][1]]?.[x + STEP[d][0]] === 'c' && !v.blocked(x + STEP[d][0], y + STEP[d][1]));
    const keep = opts.includes(v.st.facing) && (this.cemetery >> 5) % 3 ? v.st.facing : opts[(this.cemetery >> 4) % Math.max(1, opts.length)];
    this.pilot.hold(keep ? KEY[keep] : null);
  }

  /** Hacia la salida que lleva al mapa de destino. */
  private travel(v: BotView, target: MapId): void {
    const e = nextEdge(v.gm.id, target);
    if (!e) { this.pilot.release(); return; }
    if (v.st.x === e.x && v.st.y === e.y) {
      // frente a la puerta: arriba para entrar
      this.pilot.hold(e.door ? KEY.up : null);
      return;
    }
    this.step(v, new Set([k(e.x, e.y)]));
  }

  /** Se arrima a algo (una persona, un tronco), lo mira y le da al botón. */
  private face(v: BotView, cells: [number, number][]): void {
    const spots = new Map<string, Dir>();
    for (const [x, y] of cells) for (const d of DIRS) {
      const [dx, dy] = STEP[d];
      const sx = x - dx, sy = y - dy;
      if (!cells.some(([a, b]) => a === sx && b === sy)) spots.set(k(sx, sy), d);
    }
    // nunca se para en una salida para hablarle a alguien: se iría de mapa
    for (const e of edgesOf(v.gm.id)) if (!e.door) spots.delete(k(e.x, e.y));
    const look = spots.get(k(v.st.x, v.st.y));
    if (!look) { this.step(v, new Set(spots.keys())); return; }
    if (v.st.facing !== look) { this.pilot.hold(KEY[look]); return; }
    this.pilot.release();
    this.pilot.tap('Space', 30);
  }

  /** Va a donde ronda el mito y anda por ahí cerquita hasta que salte. */
  private hunt(v: BotView, id: FighterId): void {
    const h = v.hidden.find((x) => x.id === id);
    if (!h) {
      const { zone } = homeOf(v.st, GUARDIANS.find((x) => x.id === id)!);
      this.step(v, new Set([k((zone.x0 + zone.x1) >> 1, (zone.y0 + zone.y1) >> 1)]), true);
      return;
    }
    const d = Math.abs(h.x - v.st.x) + Math.abs(h.y - v.st.y);
    if (d > 1) { this.step(v, new Set([k(h.x, h.y)])); return; }
    // ya está encima: va y viene para que el espanto tenga ocasión de saltar
    const opts = DIRS.filter((x) => !v.blocked(v.st.x + STEP[x][0], v.st.y + STEP[x][1]));
    const back = opts.find((x) => Math.abs(h.x - v.st.x - STEP[x][0]) + Math.abs(h.y - v.st.y - STEP[x][1]) <= 2) ?? opts[0];
    this.pilot.hold(back ? KEY[back] : null);
  }

  /** Un paso por el camino más corto hacia cualquiera de las metas. */
  private step(v: BotView, goals: Set<string>, loose = false): void {
    const dir = this.route(v, goals, (x, y) => !v.blocked(x, y)) ?? this.route(v, goals, (x, y) => walkable(v.grid, x, y));
    if (!dir && loose) {
      // la meta cae encima de un árbol: basta con llegar cerca
      const [gx, gy] = [...goals][0].split(',').map(Number);
      const near = new Set<string>();
      for (let r = 1; r < 6 && !near.size; r++) for (let y = gy - r; y <= gy + r; y++) for (let x = gx - r; x <= gx + r; x++) if (walkable(v.grid, x, y)) near.add(k(x, y));
      const d2 = this.route(v, near, (x, y) => !v.blocked(x, y));
      this.pilot.hold(d2 ? KEY[d2] : null);
      return;
    }
    this.pilot.hold(dir ? KEY[dir] : null);
  }

  private route(v: BotView, goals: Set<string>, ok: (x: number, y: number) => boolean): Dir | null {
    const { x: sx, y: sy } = v.st;
    if (goals.has(k(sx, sy))) return null;
    // las salidas solo se pisan si son la meta: si no, el bot se iría de mapa sin querer
    const avoid = new Set(edgesOf(v.gm.id).filter((e) => !e.door).map((e) => k(e.x, e.y)));
    const first = new Map<string, Dir>();
    const q: [number, number][] = [[sx, sy]];
    first.set(k(sx, sy), 'down');
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const d of DIRS) {
        const [dx, dy] = STEP[d];
        const nx = x + dx, ny = y + dy, nk = k(nx, ny);
        if (first.has(nk)) continue;
        if (!goals.has(nk) && (!ok(nx, ny) || avoid.has(nk))) continue;
        if (goals.has(nk) && !walkable(v.grid, nx, ny)) continue;
        const dir = x === sx && y === sy ? d : first.get(k(x, y))!;
        first.set(nk, dir);
        if (goals.has(nk)) return dir;
        q.push([nx, ny]);
      }
    }
    return null;
  }
}
