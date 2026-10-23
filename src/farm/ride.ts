// Trail rides: take a happy horse for a gallop through the forest. Jump over
// logs, pick up things along the way, answer questions at the forks, and find
// a treasure chest at the end. Horses get XP and level up.
import { HATS } from './data';
import { rootOf, type FarmAnimal, type FarmSave } from './state';

export interface TrailDef {
  id: 'meadow' | 'maple' | 'deep';
  name: string;
  /** Horse level needed. */
  level: number;
  /** Trail length in pixels, and gallop speed (pixels per second). */
  length: number;
  speed: number;
  /** Forks in the trail (a question each). */
  forks: number;
  /** XP for finishing it. */
  xp: number;
  /** Things to find along the way (basket item ids); "coin" is coins. */
  finds: string[];
  /** Coins in the chest at the end. */
  chest: number;
}

export const TRAILS: TrailDef[] = [
  { id: 'meadow', name: 'Sunny Meadow Trail', level: 1, length: 11000, speed: 320, forks: 3, xp: 20, finds: ['coin', 'coin', 'apple', 'blueberry'], chest: 30 },
  { id: 'maple', name: 'Maple Forest Trail', level: 3, length: 15000, speed: 360, forks: 4, xp: 35, finds: ['coin', 'coin', 'apple', 'syrup', 'horseshoe'], chest: 60 },
  { id: 'deep', name: 'Deep Woods Trail', level: 5, length: 19000, speed: 400, forks: 5, xp: 55, finds: ['coin', 'coin', 'truffle', 'honey', 'horseshoe', 'blueberry'], chest: 100 },
];

export const MAX_HORSE_LEVEL = 10;
/** XP from one level to the next. */
export const xpForLevel = (lv: number) => 40 * lv;

/** Horse level from its total XP (1..MAX_HORSE_LEVEL). */
export function horseLevel(xp = 0): number {
  let lv = 1;
  let left = xp;
  while (lv < MAX_HORSE_LEVEL && left >= xpForLevel(lv)) {
    left -= xpForLevel(lv);
    lv++;
  }
  return lv;
}

/** XP into the current level, and how much the level needs. */
export function levelProgress(xp = 0): { have: number; need: number } {
  let lv = 1;
  let left = xp;
  while (lv < MAX_HORSE_LEVEL && left >= xpForLevel(lv)) {
    left -= xpForLevel(lv);
    lv++;
  }
  return lv >= MAX_HORSE_LEVEL ? { have: 1, need: 1 } : { have: left, need: xpForLevel(lv) };
}

/** Each horse level adds 10% to what a ride gives. */
export const rideBonus = (lv: number) => 1 + 0.1 * (lv - 1);

export const canRide = (a: FarmAnimal) => a.kind === 'horse';
export const trailOpen = (a: FarmAnimal, t: TrailDef) => horseLevel(a.xp) >= t.level;

/** Hats only found in trail chests. */
export const TRAIL_HATS = HATS.filter((h) => h.trail).map((h) => h.id);

export interface RideResult {
  /** Items put in the basket. */
  items: Record<string, number>;
  coins: number;
  xp: number;
  /** Level before and after. */
  from: number;
  to: number;
  /** A hat found in the chest. */
  hat?: string;
}

/**
 * The ride is over: the things found go in the basket, coins and XP are
 * added, and the horse is tired and hungry. `finished` = reached the end
 * (the chest, and the XP for the whole trail).
 */
export function finishRide(
  f: FarmSave, a: FarmAnimal, t: TrailDef, found: Record<string, number>, right: number, bumps: number, finished: boolean,
  now = Date.now(), rand: () => number = Math.random,
): RideResult {
  const root = rootOf(f);
  const from = horseLevel(a.xp);
  const bonus = rideBonus(from);
  const items: Record<string, number> = {};
  let coins = 0;
  for (const [id, n] of Object.entries(found)) {
    if (n <= 0) continue;
    if (id === 'coin') coins += n * 2;
    else items[id] = (items[id] ?? 0) + n;
  }
  let hat: string | undefined;
  if (finished) {
    coins += t.chest;
    // Sometimes the chest has a hat you don't have yet.
    const missing = TRAIL_HATS.filter((h) => !root.hats.includes(h));
    if (missing.length && rand() < 0.4) hat = missing[Math.floor(rand() * missing.length)];
  }
  coins = Math.round(coins * bonus);
  const itemTotal = Object.values(items).reduce((s, n) => s + n, 0) + (found.coin ?? 0);
  const xp = (finished ? t.xp : 0) + 2 * itemTotal + 10 * right + (finished && bumps === 0 ? 15 : 0);
  for (const [id, n] of Object.entries(items)) root.basket[id] = (root.basket[id] ?? 0) + n;
  root.coins += coins;
  if (hat) root.hats.push(hat);
  a.xp = (a.xp ?? 0) + xp;
  // Galloping is hard work: time for a snack.
  a.fedAt = now - 10 ** 9;
  a.wrongs = 0;
  a.paidTo = now;
  root.stats ??= {};
  root.stats.rides = (root.stats.rides ?? 0) + (finished ? 1 : 0);
  return { items, coins, xp, from, to: horseLevel(a.xp), hat };
}
