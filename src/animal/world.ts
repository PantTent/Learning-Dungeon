// The maps of the wild lands. Built the same way every time (fixed seed), so
// rescued puppies, dug fossils and found treasures stay found.

export interface Pt {
  x: number;
  y: number;
}

export interface LandMap {
  w: number;
  h: number;
  start: Pt;
  /** Trees (or cacti and rocks) block the way. */
  trees: (Pt & { r: number })[];
  /** Fruit trees: cats can climb them (apples in the Jungle, dates on Desert palms). */
  fruit: (Pt & { id: string })[];
  /** Rocks with puppies in the Jungle; sand mounds with fossils in the Desert. */
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
  /** Desert only: the oasis pond (rest here) and Auntie Camel beside it. */
  oasis?: Pt & { r: number };
  helper?: Pt;
}
/** The Jungle map (kept as its own name for older code). */
export type JungleMap = LandMap;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export const TREE_R = 34;

interface LayoutOptions {
  seed: number;
  w: number;
  h: number;
  start: Pt;
  boss: Pt;
  glade: Pt & { r: number };
  burrows: { outside: Pt; inside: Pt };
  stump: Pt & { id: string };
  /** Id prefixes, so each land's things have their own names. */
  ids: { rock: string; fruit: string; gold: string };
  rocks: number;
  /** How many of the rocks hide something (puppies or fossils). */
  hidden: number;
  fruit: number;
  golden: number;
  spawns: number;
  trees: number;
  /** Level of the wild animal living here. */
  levelAt: (p: Pt) => number;
  /** Extra places that must stay open. */
  keep?: (Pt & { r: number })[];
}

/** Places everything at random, but always the same way for the same seed. */
function layout(o: LayoutOptions): LandMap {
  const rand = rng(o.seed);
  const { w, h, start, boss, glade, burrows, stump } = o;

  // The ring of trees around the secret glade (no gaps).
  const trees: (Pt & { r: number })[] = [];
  for (let a = 0; a < Math.PI * 2; a += 0.38) trees.push({ x: glade.x + Math.cos(a) * glade.r, y: glade.y + Math.sin(a) * glade.r, r: TREE_R });

  // Things that need open space around them.
  const keep: (Pt & { r: number })[] = [
    { ...start, r: 160 },
    { ...boss, r: 220 },
    { x: glade.x, y: glade.y, r: glade.r + 90 },
    { ...burrows.outside, r: 70 },
    ...(o.keep ?? []),
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

  const rocks: LandMap['rocks'] = [];
  for (let i = 0; i < o.rocks; i++) {
    const p = place(70);
    if (!p) continue;
    rocks.push({ ...p, id: `${o.ids.rock}${i}`, puppy: i < o.hidden });
    keep.push({ ...p, r: 60 });
  }
  const fruit: LandMap['fruit'] = [];
  for (let i = 0; i < o.fruit; i++) {
    const p = place(60);
    if (!p) continue;
    fruit.push({ ...p, id: `${o.ids.fruit}${i}` });
    keep.push({ ...p, r: 50 });
  }
  const golden: LandMap['golden'] = [];
  for (let i = 0; i < o.golden; i++) {
    const p = place(40);
    if (!p) continue;
    golden.push({ ...p, id: `${o.ids.gold}${i}` });
    keep.push({ ...p, r: 30 });
  }
  const spawns: LandMap['spawns'] = [];
  for (let i = 0; i < o.spawns; i++) {
    const p = place(50);
    if (!p) continue;
    spawns.push({ ...p, level: o.levelAt(p) });
    keep.push({ ...p, r: 60 });
  }
  // The rest: lots of trees, with paths left open.
  for (let i = 0; i < o.trees; i++) {
    const p = place(TREE_R + 26, 60);
    if (p) trees.push({ ...p, r: TREE_R });
  }
  return { w, h, start, trees, fruit, rocks, glade, burrows, stump, golden, spawns, boss };
}

export function buildJungle(): LandMap {
  const w = 2600;
  const h = 1500;
  return layout({
    seed: 20261022,
    w,
    h,
    start: { x: 90, y: h / 2 },
    boss: { x: w - 180, y: h / 2 },
    glade: { x: 1500, y: 300, r: 150 },
    burrows: { outside: { x: 1500, y: 520 }, inside: { x: 1500, y: 360 } },
    stump: { x: 1500, y: 250, id: 'stump1' },
    ids: { rock: 'rock', fruit: 'fruit', gold: 'gold' },
    rocks: 7,
    hidden: 5,
    fruit: 6,
    golden: 5,
    spawns: 14,
    trees: 70,
    // Stronger animals live deeper in the jungle (to the right).
    levelAt: (p) => 1 + Math.min(3, Math.floor((p.x / w) * 4)),
  });
}

/**
 * The Desert, south of the village: you come in at the top and the old
 * tortoise waits at the bottom. Cacti and rocks block the way; sand mounds
 * hide fossils; an oasis near the top is a place to rest.
 */
export function buildDesert(): LandMap {
  const w = 2000;
  const h = 2300;
  const oasis = { x: w / 2 + 300, y: 420, r: 90 };
  const helper = { x: oasis.x - 150, y: oasis.y - 20 };
  const m = layout({
    seed: 20261023,
    w,
    h,
    start: { x: w / 2, y: 90 },
    boss: { x: w / 2, y: h - 200 },
    glade: { x: 380, y: 1300, r: 150 },
    burrows: { outside: { x: 600, y: 1300 }, inside: { x: 440, y: 1300 } },
    stump: { x: 360, y: 1300, id: 'stump2' },
    ids: { rock: 'dig', fruit: 'palm', gold: 'dgold' },
    rocks: 8,
    hidden: 5,
    fruit: 6,
    golden: 5,
    spawns: 14,
    trees: 55,
    // Stronger animals live further from the village (lower down).
    levelAt: (p) => 4 + Math.min(2, Math.floor((p.y / h) * 3)),
    keep: [{ ...oasis, r: oasis.r + 60 }, { ...helper, r: 60 }],
  });
  // The oasis pond blocks the way like a big tree.
  m.trees.push({ ...oasis });
  return { ...m, oasis, helper };
}

/** Can a body of radius `r` stand here (not inside a tree or a rock that is still there)? */
export function blocked(m: LandMap, p: Pt, r: number, rocksLeft: Set<string>): boolean {
  if (p.x < r || p.y < r || p.x > m.w - r || p.y > m.h - r) return true;
  if (m.trees.some((t) => dist(t, p) < t.r + r - 8)) return true;
  return m.rocks.some((k) => rocksLeft.has(k.id) && dist(k, p) < 36 + r);
}

/**
 * Can you walk from `a` to `b` (ignoring rocks)? A coarse grid search, used
 * by the tests to make sure nothing important is walled in by trees.
 */
export function reachable(m: LandMap, a: Pt, b: Pt, r = 14): boolean {
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
