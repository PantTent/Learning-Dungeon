// Learning Farm save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang, type Lang } from '../i18n';
import { uid } from '../util/rng';
import { animal, crop, FEED_TRIES, LAND_TIERS, START_COINS, STALL_TIERS } from './data';
import type { Grade } from '../questions/curriculum';

export interface Plot {
  crop?: string;
  plantedAt?: number;
}

export interface FarmAnimal {
  id: string;
  kind: string;
  name: string;
  /** When it was last made happy. */
  fedAt: number;
  /** Wrong answers while feeding it this time. */
  wrongs: number;
  /** Coins earned but not collected yet (can be fractional). */
  pending: number;
  /** Time income was last counted up to. */
  paidTo: number;
}

export interface FarmSave {
  version: 1;
  farmer: string;
  coins: number;
  landTier: number;
  stallTier: number;
  plots: Plot[];
  animals: FarmAnimal[];
  /** Harvested crops waiting to be sold. */
  basket: Record<string, number>;
  settings: LearningSettings;
  learning: LearningStats;
  createdAt: number;
  lastPlayed: number;
}

const KEY = 'learning-farm.save.v1';

export function newFarm(farmer: string, grade?: Grade, lang: Lang = getLang(), now = Date.now()): FarmSave {
  const settings = defaultLearningSettings(lang);
  if (grade) settings.grade = grade;
  settings.readAloud = lang === 'fr' && settings.grade <= 2;
  const f: FarmSave = {
    version: 1,
    farmer,
    coins: START_COINS,
    landTier: 0,
    stallTier: 0,
    plots: Array.from({ length: LAND_TIERS[0].plots }, () => ({})),
    animals: [],
    basket: {},
    settings,
    learning: newLearningStats(),
    createdAt: now,
    lastPlayed: now,
  };
  // Every farm starts with a horse - hungry, so the first question comes right away.
  addAnimal(f, 'horse', now, true);
  return f;
}

export function addAnimal(f: FarmSave, kind: string, now = Date.now(), hungry = false): FarmAnimal {
  const def = animal(kind);
  const used = new Set(f.animals.map((a) => a.name));
  const name = def.names.find((n) => !used.has(n)) ?? `${def.names[0]} ${f.animals.length + 1}`;
  const a: FarmAnimal = { id: uid(), kind, name, fedAt: hungry ? now - def.hungryAfterMs : now, wrongs: 0, pending: 0, paidTo: now };
  f.animals.push(a);
  return a;
}

// ------------------------------------------------------------------ crops

export type PlotState = 'empty' | 'growing' | 'ready';

export function plotState(p: Plot, now = Date.now()): PlotState {
  if (!p.crop || p.plantedAt === undefined) return 'empty';
  return now - p.plantedAt >= crop(p.crop).growMs ? 'ready' : 'growing';
}

/** 0..1 growth progress. */
export function growth(p: Plot, now = Date.now()): number {
  if (!p.crop || p.plantedAt === undefined) return 0;
  return Math.min(1, (now - p.plantedAt) / crop(p.crop).growMs);
}

export function plant(f: FarmSave, i: number, cropId: string, now = Date.now()): boolean {
  const c = crop(cropId);
  const p = f.plots[i];
  if (!p || plotState(p, now) !== 'empty' || f.coins < c.seedCost) return false;
  f.coins -= c.seedCost;
  p.crop = c.id;
  p.plantedAt = now;
  return true;
}

export function harvest(f: FarmSave, i: number, now = Date.now()): string | undefined {
  const p = f.plots[i];
  if (!p || plotState(p, now) !== 'ready') return undefined;
  const id = p.crop!;
  f.basket[id] = (f.basket[id] ?? 0) + 1;
  p.crop = undefined;
  p.plantedAt = undefined;
  return id;
}

/** Coins for selling every crop of one kind: full price if right, half if wrong. */
export function saleValue(cropId: string, count: number, correct: boolean): number {
  const full = crop(cropId).price * count;
  return correct ? full : Math.round(full / 2);
}

export function sell(f: FarmSave, cropId: string, correct: boolean): number {
  const n = f.basket[cropId] ?? 0;
  if (n <= 0) return 0;
  const coins = saleValue(cropId, n, correct);
  f.coins += coins;
  delete f.basket[cropId];
  return coins;
}

// ---------------------------------------------------------------- animals

export function isHungry(a: FarmAnimal, now = Date.now()): boolean {
  return now - a.fedAt >= animal(a.kind).hungryAfterMs;
}

/** Milliseconds until the animal gets hungry (0 if hungry now). */
export function happyLeft(a: FarmAnimal, now = Date.now()): number {
  return Math.max(0, a.fedAt + animal(a.kind).hungryAfterMs - now);
}

/** Count up passive income: only while the animal is happy. */
export function accrue(a: FarmAnimal, now = Date.now()): void {
  const happyUntil = a.fedAt + animal(a.kind).hungryAfterMs;
  const end = Math.min(now, happyUntil);
  if (end > a.paidTo) a.pending += (animal(a.kind).incomePerMin * (end - a.paidTo)) / 60000;
  a.paidTo = Math.max(a.paidTo, now);
}

/**
 * Feeding answers a question. Right: happy. Wrong: not happy yet, unless it
 * was the 3rd wrong try - then happy anyway. Returns true if now happy.
 */
export function feed(a: FarmAnimal, correct: boolean, now = Date.now()): boolean {
  accrue(a, now);
  if (!isHungry(a, now)) return true;
  if (!correct) {
    a.wrongs++;
    if (a.wrongs < FEED_TRIES) return false;
  }
  a.fedAt = now;
  a.wrongs = 0;
  a.paidTo = now;
  return true;
}

export function collect(f: FarmSave, a: FarmAnimal, now = Date.now()): number {
  accrue(a, now);
  const coins = Math.floor(a.pending);
  a.pending -= coins;
  f.coins += coins;
  return coins;
}

// --------------------------------------------------------------- upgrades

export function stallCount(f: FarmSave): number {
  return STALL_TIERS[f.stallTier].stalls;
}

export function nextLand(f: FarmSave) {
  return LAND_TIERS[f.landTier + 1];
}

export function nextStalls(f: FarmSave) {
  return STALL_TIERS[f.stallTier + 1];
}

export function buyLand(f: FarmSave): boolean {
  const next = nextLand(f);
  if (!next || f.coins < next.cost) return false;
  f.coins -= next.cost;
  f.landTier++;
  while (f.plots.length < next.plots) f.plots.push({});
  return true;
}

export function buyStalls(f: FarmSave): boolean {
  const next = nextStalls(f);
  if (!next || f.coins < next.cost) return false;
  f.coins -= next.cost;
  f.stallTier++;
  return true;
}

export function buyAnimal(f: FarmSave, kind: string, now = Date.now()): FarmAnimal | undefined {
  const def = animal(kind);
  if (f.animals.length >= stallCount(f) || f.coins < def.cost) return undefined;
  f.coins -= def.cost;
  // New animals arrive hungry, so the child gets to feed them.
  return addAnimal(f, kind, now, true);
}

// ------------------------------------------------------------------- save

export function loadFarm(): FarmSave | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return undefined;
    const f = JSON.parse(raw) as FarmSave;
    f.settings = upgradeSettings(f.settings ?? {});
    f.learning ??= newLearningStats();
    f.basket ??= {};
    return f;
  } catch {
    return undefined;
  }
}

export function saveFarm(f: FarmSave): void {
  f.lastPlayed = Date.now();
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(f));
  } catch {
    /* storage full or blocked */
  }
}

export function deleteFarm(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** "1:05" style countdown. */
export function clock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
