import { pick, ri, shuffle } from '../util/rng';

export const WALL = 0;
export const FLOOR = 1;

export interface Pt {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonMap {
  w: number;
  h: number;
  tiles: number[][];
  rooms: Room[];
  start: Pt;
  /** Stairs down, or the boss door on the last floor. */
  exit: Pt;
  chests: Pt[];
  spawns: Pt[];
  camp?: { fire: Pt; fountain: Pt; merchant: Pt; dummy: Pt };
  boss?: Pt;
  /** Lairs only: magic portal to the next area (shown once the boss is beaten). */
  portal?: Pt;
}

const center = (r: Room): Pt => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });

function overlaps(a: Room, b: Room, pad = 2): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

function carve(tiles: number[][], r: Room) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y][x] = FLOOR;
}

function corridor(tiles: number[][], a: Pt, b: Pt) {
  let { x, y } = a;
  const horizFirst = Math.random() < 0.5;
  const stepX = () => {
    while (x !== b.x) {
      tiles[y][x] = FLOOR;
      x += Math.sign(b.x - x);
    }
  };
  const stepY = () => {
    while (y !== b.y) {
      tiles[y][x] = FLOOR;
      y += Math.sign(b.y - y);
    }
  };
  if (horizFirst) {
    stepX();
    stepY();
  } else {
    stepY();
    stepX();
  }
  tiles[y][x] = FLOOR;
}

/** Breadth-first distances from a point over floor tiles (-1 = unreachable). */
export function distances(m: { w: number; h: number; tiles: number[][] }, from: Pt): number[][] {
  const d = m.tiles.map((row) => row.map(() => -1));
  const q: Pt[] = [from];
  d[from.y][from.x] = 0;
  while (q.length) {
    const p = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      if (m.tiles[ny][nx] !== FLOOR || d[ny][nx] >= 0) continue;
      d[ny][nx] = d[p.y][p.x] + 1;
      q.push({ x: nx, y: ny });
    }
  }
  return d;
}

/**
 * True if every floor tile (except the `solid` ones) can be walked to from
 * `from`. Solid tiles are keyed y * w + x.
 */
export function allReachable(m: { w: number; h: number; tiles: number[][] }, from: Pt, solid: Set<number>): boolean {
  const seen = new Set<number>([from.y * m.w + from.x]);
  const q: Pt[] = [from];
  while (q.length) {
    const p = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      const k = ny * m.w + nx;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(k) || solid.has(k) || m.tiles[ny][nx] !== FLOOR) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  let floor = 0;
  m.tiles.forEach((row, y) => row.forEach((t, x) => t === FLOOR && !solid.has(y * m.w + x) && floor++));
  return seen.size === floor;
}

/** A random floor. The first floor of each area has a camp in its first room. */
export function generateFloor(hasCamp: boolean): DungeonMap {
  const w = 46;
  const h = 34;
  const tiles = Array.from({ length: h }, () => Array(w).fill(WALL));
  const rooms: Room[] = [];

  // The first room on floor 1 is a roomy camp.
  const first: Room = hasCamp ? { x: 3, y: 3, w: 9, h: 7 } : { x: ri(2, 8), y: ri(2, 8), w: ri(6, 8), h: ri(5, 6) };
  rooms.push(first);
  let attempts = 0;
  while (rooms.length < 10 && attempts++ < 400) {
    const r: Room = { w: ri(5, 10), h: ri(4, 7), x: 0, y: 0 };
    r.x = ri(2, w - r.w - 3);
    r.y = ri(2, h - r.h - 3);
    if (rooms.some((o) => overlaps(o, r))) continue;
    rooms.push(r);
  }
  rooms.forEach((r) => carve(tiles, r));

  // Connect rooms in order of distance so corridors stay short-ish.
  const ordered = [rooms[0]];
  const rest = rooms.slice(1);
  while (rest.length) {
    const last = center(ordered[ordered.length - 1]);
    rest.sort((a, b) => {
      const ca = center(a);
      const cb = center(b);
      return Math.abs(ca.x - last.x) + Math.abs(ca.y - last.y) - (Math.abs(cb.x - last.x) + Math.abs(cb.y - last.y));
    });
    ordered.push(rest.shift()!);
  }
  for (let i = 1; i < ordered.length; i++) corridor(tiles, center(ordered[i - 1]), center(ordered[i]));
  // A couple of extra loops so it's not a single line.
  for (let i = 0; i < 2; i++) corridor(tiles, center(pick(ordered)), center(pick(ordered)));

  const start = center(rooms[0]);
  const map: DungeonMap = { w, h, tiles, rooms: ordered, start, exit: start, chests: [], spawns: [] };

  const dist = distances(map, start);
  // Exit goes in the room farthest from the start.
  let far = rooms[1] ?? rooms[0];
  let farD = -1;
  for (const r of rooms.slice(1)) {
    const c = center(r);
    if (dist[c.y][c.x] > farD) {
      farD = dist[c.y][c.x];
      far = r;
    }
  }
  // Exit sits against the room's top wall so it looks like a doorway/stairwell.
  map.exit = { x: center(far).x, y: far.y };

  if (hasCamp) {
    map.camp = {
      fire: { x: start.x, y: start.y - 1 },
      fountain: { x: rooms[0].x + 1, y: rooms[0].y + 1 },
      merchant: { x: rooms[0].x + rooms[0].w - 2, y: rooms[0].y + 1 },
      dummy: { x: rooms[0].x + rooms[0].w - 2, y: rooms[0].y + rooms[0].h - 2 },
    };
    map.start = { x: start.x, y: start.y + 1 };
  }

  // Chests and monster spawns in the other rooms.
  const others = shuffle(rooms.filter((r) => r !== rooms[0]));
  const chestCount = ri(1, 2);
  // Chests are solid, so a chest must never block a doorway or corridor:
  // every floor tile has to stay reachable with it in place.
  const solid = new Set<number>([map.exit, ...(map.camp ? [map.camp.fire, map.camp.fountain, map.camp.merchant, map.camp.dummy] : [])].map((p) => p.y * w + p.x));
  for (let i = 0; i < chestCount && i < others.length; i++) {
    const r = others[i];
    for (let tries = 0; tries < 20; tries++) {
      const c = { x: r.x + ri(0, r.w - 1), y: r.y + r.h - 1 - (tries > 10 ? ri(0, r.h - 1) : 0) };
      const k = c.y * w + c.x;
      if (tiles[c.y][c.x] !== FLOOR || solid.has(k) || (c.x === map.start.x && c.y === map.start.y)) continue;
      solid.add(k);
      if (allReachable(map, map.start, solid)) {
        map.chests.push(c);
        break;
      }
      solid.delete(k);
    }
  }
  for (const r of others) {
    for (let k = 0; k < 3; k++) map.spawns.push({ x: r.x + ri(1, r.w - 2), y: r.y + ri(1, r.h - 2) });
  }
  return map;
}

/** The Goblin King's throne room. */
export function generateLair(): DungeonMap {
  const w = 17;
  const h = 15;
  const tiles = Array.from({ length: h }, () => Array(w).fill(WALL));
  const room: Room = { x: 2, y: 2, w: 13, h: 11 };
  carve(tiles, room);
  return {
    w,
    h,
    tiles,
    rooms: [room],
    start: { x: 8, y: 9 },
    exit: { x: 8, y: 12 },
    chests: [],
    spawns: [],
    boss: { x: 8, y: 4 },
    portal: { x: 13, y: 9 },
  };
}

/** Shortest path (excluding start) using BFS, or null. */
/** Straight steps first so paths prefer clean lines, then diagonals. */
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** A diagonal step is allowed only when both side tiles are open (no squeezing past corners). */
export function canCut(m: DungeonMap, p: Pt, dx: number, dy: number, blocked: (p: Pt) => boolean): boolean {
  const a = { x: p.x + dx, y: p.y };
  const b = { x: p.x, y: p.y + dy };
  return m.tiles[a.y]?.[a.x] === FLOOR && m.tiles[b.y]?.[b.x] === FLOOR && !blocked(a) && !blocked(b);
}

export function findPath(m: DungeonMap, from: Pt, to: Pt, blocked: (p: Pt) => boolean): Pt[] | null {
  if (to.x < 0 || to.y < 0 || to.x >= m.w || to.y >= m.h || m.tiles[to.y][to.x] !== FLOOR) return null;
  const prev = new Map<number, number>();
  const key = (p: Pt) => p.y * m.w + p.x;
  const q: Pt[] = [from];
  prev.set(key(from), -1);
  while (q.length) {
    const p = q.shift()!;
    if (p.x === to.x && p.y === to.y) break;
    for (const [dx, dy] of STEPS) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= m.w || n.y >= m.h) continue;
      if (m.tiles[n.y][n.x] !== FLOOR || prev.has(key(n))) continue;
      if (blocked(n) && !(n.x === to.x && n.y === to.y)) continue;
      if (dx && dy && !canCut(m, p, dx, dy, blocked)) continue;
      prev.set(key(n), key(p));
      q.push(n);
    }
  }
  if (!prev.has(key(to))) return null;
  const path: Pt[] = [];
  let k = key(to);
  while (k !== key(from)) {
    path.unshift({ x: k % m.w, y: Math.floor(k / m.w) });
    k = prev.get(k)!;
  }
  return path;
}
