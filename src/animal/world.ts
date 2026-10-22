// The Jungle map. Built the same way every time (fixed seed), so rescued
// puppies and found treasures stay found.

export interface Pt {
  x: number;
  y: number;
}

export interface JungleMap {
  w: number;
  h: number;
  start: Pt;
  /** Trees block the way. */
  trees: (Pt & { r: number })[];
  /** Fruit trees: cats can climb them for apples. */
  fruit: (Pt & { id: string })[];
  /** Rocks: five hide a puppy, the rest some acorns. */
  rocks: (Pt & { id: string; puppy: boolean })[];
  /** A ring of trees with a secret stump inside: only the mouse gets in, through the burrow. */
  glade: Pt & { r: number };
  burrows: { outside: Pt; inside: Pt };
  stump: Pt & { id: string };
  /** Hidden golden acorns: only the owl can see them. */
  golden: (Pt & { id: string })[];
  /** Where wild animals live, and how strong they are. */
  spawns: (Pt & { level: number })[];
  boss: Pt;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export const TREE_R = 34;

export function buildJungle(): JungleMap {
  const rand = rng(20261022);
  const w = 2600;
  const h = 1500;
  const start: Pt = { x: 90, y: h / 2 };
  const boss: Pt = { x: w - 180, y: h / 2 };
  const glade = { x: 1500, y: 300, r: 150 };
  const burrows = { outside: { x: 1500, y: 520 }, inside: { x: 1500, y: 360 } };
  const stump = { x: 1500, y: 250, id: 'stump1' };

  // The ring of trees around the secret glade (no gaps).
  const trees: (Pt & { r: number })[] = [];
  for (let a = 0; a < Math.PI * 2; a += 0.38) trees.push({ x: glade.x + Math.cos(a) * glade.r, y: glade.y + Math.sin(a) * glade.r, r: TREE_R });

  // Things that need open space around them.
  const keep: (Pt & { r: number })[] = [
    { ...start, r: 160 },
    { ...boss, r: 220 },
    { x: glade.x, y: glade.y, r: glade.r + 90 },
    { ...burrows.outside, r: 70 },
  ];
  const free = (p: Pt, r: number) =>
    p.x > 40 && p.y > 40 && p.x < w - 40 && p.y < h - 40 && keep.every((k) => dist(k, p) > k.r + r) && trees.every((t) => dist(t, p) > t.r + r);
  const place = (r: number, tries = 200): Pt | null => {
    for (let i = 0; i < tries; i++) {
      const p = { x: 140 + rand() * (w - 280), y: 80 + rand() * (h - 160) };
      if (free(p, r)) return p;
    }
    return null;
  };

  const rocks: JungleMap['rocks'] = [];
  for (let i = 0; i < 7; i++) {
    const p = place(70);
    if (!p) continue;
    rocks.push({ ...p, id: `rock${i}`, puppy: i < 5 });
    keep.push({ ...p, r: 60 });
  }
  const fruit: JungleMap['fruit'] = [];
  for (let i = 0; i < 6; i++) {
    const p = place(60);
    if (!p) continue;
    fruit.push({ ...p, id: `fruit${i}` });
    keep.push({ ...p, r: 50 });
  }
  const golden: JungleMap['golden'] = [];
  for (let i = 0; i < 5; i++) {
    const p = place(40);
    if (!p) continue;
    golden.push({ ...p, id: `gold${i}` });
    keep.push({ ...p, r: 30 });
  }
  const spawns: JungleMap['spawns'] = [];
  for (let i = 0; i < 14; i++) {
    const p = place(50);
    if (!p) continue;
    // Stronger animals live deeper in the jungle (to the right).
    spawns.push({ ...p, level: 1 + Math.min(3, Math.floor((p.x / w) * 4)) });
    keep.push({ ...p, r: 60 });
  }
  // The rest of the jungle: lots of trees, with paths left open.
  for (let i = 0; i < 70; i++) {
    const p = place(TREE_R + 26, 60);
    if (p) trees.push({ ...p, r: TREE_R });
  }
  return { w, h, start, trees, fruit, rocks, glade, burrows, stump, golden, spawns, boss };
}

/** Can a body of radius `r` stand here (not inside a tree or a rock that is still there)? */
export function blocked(m: JungleMap, p: Pt, r: number, rocksLeft: Set<string>): boolean {
  if (p.x < r || p.y < r || p.x > m.w - r || p.y > m.h - r) return true;
  if (m.trees.some((t) => dist(t, p) < t.r + r - 8)) return true;
  return m.rocks.some((k) => rocksLeft.has(k.id) && dist(k, p) < 36 + r);
}

/**
 * Can you walk from `a` to `b` (ignoring rocks)? A coarse grid search, used
 * by the tests to make sure nothing important is walled in by trees.
 */
export function reachable(m: JungleMap, a: Pt, b: Pt, r = 14): boolean {
  const step = 20;
  const cols = Math.ceil(m.w / step);
  const rows = Math.ceil(m.h / step);
  const key = (c: number, rr: number) => rr * cols + c;
  const seen = new Set<number>();
  const q: [number, number][] = [[Math.round(a.x / step), Math.round(a.y / step)]];
  seen.add(key(q[0][0], q[0][1]));
  const none = new Set<string>();
  while (q.length) {
    const [c, rr] = q.shift()!;
    if (Math.hypot(c * step - b.x, rr * step - b.y) < 60) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = rr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(key(nc, nr))) continue;
      if (blocked(m, { x: nc * step, y: nr * step }, r, none)) continue;
      seen.add(key(nc, nr));
      q.push([nc, nr]);
    }
  }
  return false;
}
