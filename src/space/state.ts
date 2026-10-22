// Learning Space save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang } from '../i18n';
import type { Grade } from '../questions/curriculum';
import { pick, ri, weighted } from '../util/rng';
import { MAX_PART, MINERAL_IDS, MINERALS, PARTS, planet, type PartDef } from './data';

export type PartId = PartDef['id'];

/** One planet's base: fuel plants, their stock, and the command center. */
export interface Base {
  loxLv: number;
  ch4Lv: number;
  adminLv: number;
  /** Fuel made and waiting in the tanks. */
  lox: number;
  ch4: number;
  /** Time production was last counted up to. */
  paidTo: number;
}

export interface SpaceSave {
  version: 1;
  commander: string;
  /** The planet the player started on (decides ship and special skill). */
  start: string;
  /** Planet the player is on now. */
  at: string;
  /** World number: 1 on the first planet, +1 for each new planet reached. */
  world: number;
  /** Planets reached, in order. */
  visited: string[];
  bases: Record<string, Base>;
  /** Minerals stored at the bases (shared). */
  minerals: Record<string, number>;
  /** Minerals in the ship's hold, not unloaded yet. */
  cargo: Record<string, number>;
  ship: Record<PartId, number>;
  /** Minerals seen at least once (for the "new mineral" lesson). */
  seen: string[];
  settings: LearningSettings;
  learning: LearningStats;
  createdAt: number;
  lastPlayed: number;
}

const KEY = 'learning-space.save.v1';

// ---------------------------------------------------------------- balance
/** Fuel made per minute by a plant of this level. */
export const fuelPerMinute = (lv: number) => 4 * lv;
/** Fuel each tank at a base can hold. */
export const fuelCap = (adminLv: number) => 60 * adminLv;
/** Plants can be upgraded up to twice the command center level. */
export const plantMax = (adminLv: number) => Math.min(10, adminLv * 2);
export const MAX_ADMIN = 5;
/** Minerals the hold carries. */
export const cargoCap = (lv: number) => 15 + 10 * lv;
/** Ship speed in pixels per second. */
export const shipSpeed = (lv: number) => 220 + 40 * lv;
/** Fuel (of each kind) for a trip to a new planet, and to a planet already visited. */
export const tripFuel = (newWorld: number) => 40 * (newWorld - 1);
export const RETURN_FUEL = 20;

function newBase(now: number): Base {
  return { loxLv: 1, ch4Lv: 1, adminLv: 1, lox: 0, ch4: 0, paidTo: now };
}

const zero = () => Object.fromEntries(MINERAL_IDS.map((m) => [m, 0])) as Record<string, number>;

export function newSpace(commander: string, grade: Grade, start: string, now = Date.now()): SpaceSave {
  const lang = getLang();
  return {
    version: 1,
    commander,
    start,
    at: start,
    world: 1,
    visited: [start],
    bases: { [start]: newBase(now) },
    minerals: zero(),
    cargo: zero(),
    ship: { engine: 1, tank: 1, cargo: 1, laser: 1, shield: 1 },
    seen: [],
    settings: { ...defaultLearningSettings(lang), grade },
    learning: newLearningStats(),
    createdAt: now,
    lastPlayed: now,
  };
}

export function loadSpace(): SpaceSave | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SpaceSave;
    s.settings = upgradeSettings(s.settings);
    s.minerals = { ...zero(), ...s.minerals };
    s.cargo = { ...zero(), ...s.cargo };
    s.seen ??= [];
    return s;
  } catch {
    return null;
  }
}

export function saveSpace(s: SpaceSave): void {
  s.lastPlayed = Date.now();
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

export function base(s: SpaceSave): Base {
  return (s.bases[s.at] ??= newBase(Date.now()));
}

// ---------------------------------------------------------------- skills
const skill = (s: SpaceSave, p: string) => s.start === p;
/** Mercury: fuel plants make 50% more. */
export const fuelBoost = (s: SpaceSave) => (skill(s, 'mercury') ? 1.5 : 1);
/** Venus: shields 50% stronger. */
export const shieldHits = (s: SpaceSave) => Math.floor((2 + s.ship.shield) * (skill(s, 'venus') ? 1.5 : 1));

// ---------------------------------------------------------------- fuel
/** Count up fuel made since last time (plants stop when the tanks are full). */
export function produce(s: SpaceSave, now = Date.now()): void {
  const b = base(s);
  const minutes = Math.max(0, now - b.paidTo) / 60000;
  const cap = fuelCap(b.adminLv);
  b.lox = Math.min(cap, b.lox + minutes * fuelPerMinute(b.loxLv) * fuelBoost(s));
  b.ch4 = Math.min(cap, b.ch4 + minutes * fuelPerMinute(b.ch4Lv) * fuelBoost(s));
  b.paidTo = now;
}

// ---------------------------------------------------------------- costs
export type Cost = Record<string, number>;

export function partCost(part: PartId, toLevel: number): Cost {
  const def = PARTS.find((p) => p.id === part)!;
  const c: Cost = {};
  for (const [m, n] of Object.entries(def.cost)) c[m] = n * toLevel;
  // Higher levels also need some gold.
  if (toLevel >= 4) c.au = (c.au ?? 0) + Math.floor(toLevel / 2);
  return c;
}

export function plantCost(kind: 'lox' | 'ch4', toLevel: number): Cost {
  return kind === 'lox' ? { fe: 3 * toLevel, cu: 2 * toLevel } : { fe: 3 * toLevel, ni: 2 * toLevel };
}

export function adminCost(toLevel: number): Cost {
  return { fe: 6 * toLevel, al: 4 * toLevel, ag: 2 * toLevel, au: toLevel - 1 };
}

export function canAfford(s: SpaceSave, c: Cost): boolean {
  return Object.entries(c).every(([m, n]) => (s.minerals[m] ?? 0) >= n);
}

function pay(s: SpaceSave, c: Cost): boolean {
  if (!canAfford(s, c)) return false;
  for (const [m, n] of Object.entries(c)) s.minerals[m] -= n;
  return true;
}

export function upgradePart(s: SpaceSave, part: PartId): boolean {
  const lv = s.ship[part];
  if (lv >= MAX_PART || !pay(s, partCost(part, lv + 1))) return false;
  s.ship[part] = lv + 1;
  return true;
}

export function upgradePlant(s: SpaceSave, kind: 'lox' | 'ch4', now = Date.now()): boolean {
  produce(s, now);
  const b = base(s);
  const key = kind === 'lox' ? 'loxLv' : 'ch4Lv';
  if (b[key] >= plantMax(b.adminLv) || !pay(s, plantCost(kind, b[key] + 1))) return false;
  b[key]++;
  return true;
}

export function upgradeAdmin(s: SpaceSave, now = Date.now()): boolean {
  produce(s, now);
  const b = base(s);
  if (b.adminLv >= MAX_ADMIN || !pay(s, adminCost(b.adminLv + 1))) return false;
  b.adminLv++;
  return true;
}

// ---------------------------------------------------------------- mining
export const cargoTotal = (s: SpaceSave) => Object.values(s.cargo).reduce((a, b) => a + b, 0);

/** A random mineral for a new asteroid (gold and silver are rare). */
export function rollMineral(): string {
  return weighted(Object.fromEntries(MINERALS.map((m) => [m.id, m.weight])) as Record<string, number>);
}

/** Minerals from one asteroid: right answer = all, wrong = half. */
export function mineYield(s: SpaceSave, mineralId: string, rich: boolean, correct: boolean): number {
  let n = 3 + s.ship.laser + ri(0, 1);
  if (skill(s, 'earth')) n *= 1.25;
  if (skill(s, 'mars') && mineralId === 'fe') n *= 2;
  if (rich) n *= 3;
  if (!correct) n /= 2;
  return Math.max(1, Math.round(n));
}

/** Put minerals in the hold; returns how many fit. */
export function addCargo(s: SpaceSave, mineralId: string, n: number): number {
  const room = Math.max(0, cargoCap(s.ship.cargo) - cargoTotal(s));
  const got = Math.min(room, n);
  s.cargo[mineralId] = (s.cargo[mineralId] ?? 0) + got;
  return got;
}

/** Landing: everything in the hold goes into storage. */
export function unload(s: SpaceSave): Record<string, number> {
  const moved: Record<string, number> = {};
  for (const m of MINERAL_IDS) {
    if (s.cargo[m]) moved[m] = s.cargo[m];
    s.minerals[m] += s.cargo[m];
    s.cargo[m] = 0;
  }
  return moved;
}

// ---------------------------------------------------------------- aliens
/** Alien hit points grow a little with each world. */
export const alienHits = (s: SpaceSave) => 2 + s.world;

/** Minerals for chasing an alien away. */
export function alienReward(s: SpaceSave): Record<string, number> {
  const out: Record<string, number> = {};
  const kinds = ri(2, 3);
  for (let i = 0; i < kinds; i++) {
    const m = Math.random() < 0.2 ? pick(['ag', 'au']) : rollMineral();
    out[m] = (out[m] ?? 0) + 3 + s.world + ri(0, 2);
  }
  return out;
}

/** Losing to an alien: the ship hurries home and drops half of its hold. */
export function loseHalfCargo(s: SpaceSave): void {
  for (const m of MINERAL_IDS) s.cargo[m] = Math.floor(s.cargo[m] / 2);
}

// ---------------------------------------------------------------- travel
export interface TripCheck {
  /** Reaching it makes it a new world. */
  isNew: boolean;
  world: number;
  lox: number;
  ch4: number;
  engine: number;
  tank: number;
  ok: boolean;
  /** Not open yet (gas giants, ice giants, Pluto). */
  closed: boolean;
}

export function tripCheck(s: SpaceSave, target: string, now = Date.now()): TripCheck {
  produce(s, now);
  const b = base(s);
  const isNew = !s.visited.includes(target);
  const world = isNew ? s.world + 1 : s.world;
  const fuel = isNew ? tripFuel(world) : RETURN_FUEL;
  const need = isNew ? world : 1;
  const closed = !planet(target).open;
  const ok = !closed && target !== s.at && b.lox >= fuel && b.ch4 >= fuel && s.ship.engine >= need && s.ship.tank >= need;
  return { isNew, world, lox: fuel, ch4: fuel, engine: need, tank: need, ok, closed };
}

/** Fly to another planet. Returns false if the ship isn't ready. */
export function travel(s: SpaceSave, target: string, now = Date.now()): boolean {
  const c = tripCheck(s, target, now);
  if (!c.ok) return false;
  const b = base(s);
  b.lox -= c.lox;
  b.ch4 -= c.ch4;
  if (c.isNew) {
    s.visited.push(target);
    s.world = c.world;
  }
  s.at = target;
  // A new base starts fresh; an old one made fuel while you were away.
  if (!s.bases[target]) s.bases[target] = newBase(now);
  produce(s, now);
  return true;
}
