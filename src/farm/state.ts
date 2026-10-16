// Learning Farm save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang, type Lang } from '../i18n';
import { uid } from '../util/rng';
import {
  animal, crop, FEED_TRIES, GEAR, GEAR_EFFECT, GOLDEN_CHANCE, GOLDEN_MULT, HATS, MAX_ORDERS, ORDER_BONUS, ORDER_EVERY_MS,
  PORTAL_COST, START_COINS, WORLDS, type WorldId,
} from './data';
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
  /** Hat it is wearing (HATS id). */
  hat?: string;
}

export interface Order {
  id: string;
  /** Neighbour who asked (NEIGHBOURS id). */
  who: string;
  items: { crop: string; n: number }[];
  reward: number;
}

/** One farm's land: the home farm, or the farm in the magic world. */
export interface WorldState {
  /** Which world this is ('home' when missing, for older saves). */
  world?: WorldId;
  landTier: number;
  stallTier: number;
  plots: Plot[];
  animals: FarmAnimal[];
  /** Harvested crops waiting to be sold (golden ones use the key "gold:<crop>"). */
  basket: Record<string, number>;
  /** Neighbour orders on the board, and when the next one arrives. */
  orders: Order[];
  nextOrderAt: number;
}

export interface FarmSave extends WorldState {
  version: 1;
  farmer: string;
  coins: number;
  /** The magic portal has been built. */
  portal?: boolean;
  /** The farm in the magic world (once the portal is built). */
  magic?: WorldState;
  landTier: number;
  stallTier: number;
  plots: Plot[];
  animals: FarmAnimal[];
  /** Harvested crops waiting to be sold (golden ones use the key "gold:<crop>"). */
  basket: Record<string, number>;
  /** Farmer gear owned (GEAR ids). */
  gear: string[];
  /** Hats owned (HATS ids); any animal can wear them. */
  hats: string[];
  /** Neighbour orders on the board, and when the next one arrives. */
  orders: Order[];
  nextOrderAt: number;
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
    plots: Array.from({ length: WORLDS.home.land[0].plots }, () => ({})),
    animals: [],
    basket: {},
    gear: [],
    hats: [],
    orders: [],
    nextOrderAt: now,
    settings,
    learning: newLearningStats(),
    createdAt: now,
    lastPlayed: now,
  };
  // Every farm starts with a horse - hungry, so the first question comes right away.
  addAnimal(f, 'horse', now, true);
  // Two neighbours are already waiting with orders.
  f.orders.push(newOrder(f), newOrder(f));
  f.nextOrderAt = now + ORDER_EVERY_MS;
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

export function hasGear(f: FarmSave | undefined, id: string): boolean {
  return !!f?.gear?.includes(id);
}

/** Growing speed (the Watering Can makes crops grow faster). */
export function growSpeed(f?: FarmSave): number {
  return hasGear(f, 'can') ? GEAR_EFFECT.growSpeed : 1;
}

export function growTime(cropId: string, f?: FarmSave): number {
  return crop(cropId).growMs / growSpeed(f);
}

export function plotState(p: Plot, now = Date.now(), f?: FarmSave): PlotState {
  if (!p.crop || p.plantedAt === undefined) return 'empty';
  return now - p.plantedAt >= growTime(p.crop, f) ? 'ready' : 'growing';
}

/** 0..1 growth progress. */
export function growth(p: Plot, now = Date.now(), f?: FarmSave): number {
  if (!p.crop || p.plantedAt === undefined) return 0;
  return Math.min(1, (now - p.plantedAt) / growTime(p.crop, f));
}

export function plant(f: FarmSave, i: number, cropId: string, now = Date.now()): boolean {
  const c = crop(cropId);
  const p = f.plots[i];
  if (!p || plotState(p, now, f) !== 'empty' || f.coins < c.seedCost) return false;
  f.coins -= c.seedCost;
  p.crop = c.id;
  p.plantedAt = now;
  return true;
}

export interface Harvest {
  crop: string;
  count: number;
  golden: boolean;
}

/** Pick a ready crop. Sometimes it's golden; the Big Basket sometimes gives 2. */
export function harvest(f: FarmSave, i: number, now = Date.now(), rand: () => number = Math.random): Harvest | undefined {
  const p = f.plots[i];
  if (!p || plotState(p, now, f) !== 'ready') return undefined;
  const id = p.crop!;
  const golden = rand() < GOLDEN_CHANCE;
  const count = hasGear(f, 'basket') && rand() < GEAR_EFFECT.doubleChance ? 2 : 1;
  const key = golden ? goldKey(id) : id;
  f.basket[key] = (f.basket[key] ?? 0) + count;
  p.crop = undefined;
  p.plantedAt = undefined;
  return { crop: id, count, golden };
}

export function goldKey(cropId: string): string {
  return `gold:${cropId}`;
}

/** Basket key -> crop id and whether it is golden. */
export function parseKey(key: string): { crop: string; golden: boolean } {
  return key.startsWith('gold:') ? { crop: key.slice(5), golden: true } : { crop: key, golden: false };
}

/** Price of one crop at the market (golden x5, Lucky Straw Hat +25%). */
export function unitPrice(key: string, f?: FarmSave): number {
  const { crop: id, golden } = parseKey(key);
  return crop(id).price * (golden ? GOLDEN_MULT : 1) * (hasGear(f, 'hat') ? GEAR_EFFECT.sellBonus : 1);
}

/** Coins for selling every crop of one kind: full price if right, half if wrong. */
export function saleValue(key: string, count: number, correct: boolean, f?: FarmSave): number {
  const full = Math.round(unitPrice(key, f) * count);
  return correct ? full : Math.round(full / 2);
}

export function sell(f: FarmSave, key: string, correct: boolean): number {
  const n = f.basket[key] ?? 0;
  if (n <= 0) return 0;
  const coins = saleValue(key, n, correct, f);
  f.coins += coins;
  delete f.basket[key];
  return coins;
}

// ---------------------------------------------------------------- animals

/** How long a fed animal stays happy (longer with the Comfy Brush). */
export function happyFor(a: FarmAnimal, f?: FarmSave): number {
  return animal(a.kind).hungryAfterMs * (hasGear(f, 'brush') ? GEAR_EFFECT.happyLonger : 1);
}

export function isHungry(a: FarmAnimal, now = Date.now(), f?: FarmSave): boolean {
  return now - a.fedAt >= happyFor(a, f);
}

/** Milliseconds until the animal gets hungry (0 if hungry now). */
export function happyLeft(a: FarmAnimal, now = Date.now(), f?: FarmSave): number {
  return Math.max(0, a.fedAt + happyFor(a, f) - now);
}

/** Count up passive income: only while the animal is happy (more with the Golden Bell). */
export function accrue(a: FarmAnimal, now = Date.now(), f?: FarmSave): void {
  const happyUntil = a.fedAt + happyFor(a, f);
  const end = Math.min(now, happyUntil);
  const rate = animal(a.kind).incomePerMin * (hasGear(f, 'bell') ? GEAR_EFFECT.incomeBonus : 1);
  if (end > a.paidTo) a.pending += (rate * (end - a.paidTo)) / 60000;
  a.paidTo = Math.max(a.paidTo, now);
}

/**
 * Feeding answers a question. Right: happy. Wrong: not happy yet, unless it
 * was the 3rd wrong try - then happy anyway. Returns true if now happy.
 */
export function feed(a: FarmAnimal, correct: boolean, now = Date.now(), f?: FarmSave): boolean {
  accrue(a, now, f);
  if (!isHungry(a, now, f)) return true;
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
  accrue(a, now, f);
  const coins = Math.floor(a.pending);
  a.pending -= coins;
  f.coins += coins;
  return coins;
}

// ------------------------------------------------------------ gear & hats

export function buyGear(f: FarmSave, id: string): boolean {
  const g = GEAR.find((x) => x.id === id);
  if (!g || hasGear(f, id) || f.coins < g.cost) return false;
  f.coins -= g.cost;
  f.gear.push(id);
  return true;
}

export function buyHat(f: FarmSave, id: string): boolean {
  const h = HATS.find((x) => x.id === id);
  if (!h || f.hats.includes(id) || f.coins < h.cost) return false;
  f.coins -= h.cost;
  f.hats.push(id);
  return true;
}

/** Put a hat on (or take it off with undefined). Hats can be shared, one animal at a time. */
export function wearHat(f: FarmSave, a: FarmAnimal, id: string | undefined): boolean {
  if (id && !f.hats.includes(id)) return false;
  if (id) for (const other of f.animals) if (other.hat === id) other.hat = undefined;
  a.hat = id;
  return true;
}

export function renameAnimal(a: FarmAnimal, name: string): void {
  const n = name.trim().slice(0, 12).trim();
  if (n) a.name = n;
}

// ---------------------------------------------------------------- orders

/** A new neighbour order. Bigger farms get bigger orders. */
export function newOrder(f: FarmSave, rand: () => number = Math.random): Order {
  const pickOne = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  // Cheaper crops come up more often.
  const w = WORLDS[worldOf(f)];
  const pool = w.crops.flatMap((c, i) => Array.from({ length: w.crops.length - i }, () => c.id));
  const kinds = rand() < 0.4 ? 2 : 1;
  const items: { crop: string; n: number }[] = [];
  while (items.length < kinds) {
    const id = pickOne(pool);
    if (items.some((x) => x.crop === id)) continue;
    items.push({ crop: id, n: 1 + Math.floor(rand() * (2 + f.landTier)) });
  }
  const value = items.reduce((sum, x) => sum + crop(x.crop).price * x.n, 0);
  return { id: uid(), who: pickOne(w.neighbours).id, items, reward: Math.round(value * ORDER_BONUS + 5) };
}

/** A new order arrives every so often, up to MAX_ORDERS on the board. */
export function refreshOrders(f: FarmSave, now = Date.now(), rand: () => number = Math.random): boolean {
  if (f.orders.length >= MAX_ORDERS || now < f.nextOrderAt) return false;
  f.orders.push(newOrder(f, rand));
  f.nextOrderAt = now + ORDER_EVERY_MS;
  return true;
}

export function canFill(f: FarmSave, o: Order): boolean {
  return o.items.every((x) => (f.basket[x.crop] ?? 0) >= x.n);
}

/** Hand over the crops: full reward for a right answer, half for a wrong one. */
export function fillOrder(f: FarmSave, orderId: string, correct: boolean, now = Date.now()): number {
  const o = f.orders.find((x) => x.id === orderId);
  if (!o || !canFill(f, o)) return 0;
  for (const x of o.items) {
    f.basket[x.crop] -= x.n;
    if (f.basket[x.crop] <= 0) delete f.basket[x.crop];
  }
  const coins = correct ? o.reward : Math.round(o.reward / 2);
  f.coins += coins;
  f.orders = f.orders.filter((x) => x.id !== orderId);
  if (f.orders.length < MAX_ORDERS && f.nextOrderAt < now) f.nextOrderAt = now + ORDER_EVERY_MS;
  return coins;
}

// --------------------------------------------------------------- upgrades

export function stallCount(f: FarmSave): number {
  return WORLDS[worldOf(f)].stalls[f.stallTier].stalls;
}

export function nextLand(f: FarmSave) {
  return WORLDS[worldOf(f)].land[f.landTier + 1];
}

export function nextStalls(f: FarmSave) {
  return WORLDS[worldOf(f)].stalls[f.stallTier + 1];
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

// ------------------------------------------------------------ magic world

export function worldOf(w: WorldState): WorldId {
  return w.world ?? 'home';
}

function newMagicWorld(now: number): WorldState {
  const w: WorldState = {
    world: 'magic',
    landTier: 0,
    stallTier: 0,
    plots: Array.from({ length: WORLDS.magic.land[0].plots }, () => ({})),
    animals: [],
    basket: {},
    orders: [],
    nextOrderAt: now + ORDER_EVERY_MS,
  };
  return w;
}

/** Build the portal (full game). Creates the magic farm, with a unicorn waiting. */
export function buyPortal(root: FarmSave, now = Date.now()): boolean {
  if (root.portal || root.coins < PORTAL_COST) return false;
  root.coins -= PORTAL_COST;
  root.portal = true;
  root.magic = newMagicWorld(now);
  const view = enterWorld(root, 'magic');
  addAnimal(view, 'unicorn', now, true);
  view.orders.push(newOrder(view), newOrder(view));
  return true;
}

const WORLD_KEYS = ['world', 'landTier', 'stallTier', 'plots', 'animals', 'basket', 'orders', 'nextOrderAt'] as const;
const SHARED_KEYS = ['version', 'farmer', 'coins', 'gear', 'hats', 'settings', 'learning', 'createdAt', 'lastPlayed', 'portal', 'magic'] as const;

/**
 * The farm as seen from one world: land, animals, basket and orders belong to
 * that world, while coins, gear, hats and settings are shared. Everything in
 * this file works on the result.
 */
export function enterWorld(root: FarmSave, id: WorldId): FarmSave {
  if (id === 'home' || !root.portal) return root;
  root.magic ??= newMagicWorld(Date.now());
  const w = root.magic;
  const view = {} as FarmSave;
  for (const k of WORLD_KEYS) {
    Object.defineProperty(view, k, { get: () => w[k], set: (v) => ((w as unknown as Record<string, unknown>)[k] = v), enumerable: true });
  }
  for (const k of SHARED_KEYS) {
    Object.defineProperty(view, k, { get: () => root[k], set: (v) => ((root as unknown as Record<string, unknown>)[k] = v), enumerable: true });
  }
  Object.defineProperty(view, 'root', { value: root, enumerable: false });
  return view;
}

/** The whole save behind a world view. */
export function rootOf(f: FarmSave): FarmSave {
  return (f as FarmSave & { root?: FarmSave }).root ?? f;
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
    f.gear ??= [];
    f.hats ??= [];
    f.orders ??= [];
    f.nextOrderAt ??= Date.now();
    if (f.magic) {
      f.magic.world = 'magic';
      f.magic.basket ??= {};
      f.magic.orders ??= [];
    }
    return f;
  } catch {
    return undefined;
  }
}

export function saveFarm(view: FarmSave): void {
  const f = rootOf(view);
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
