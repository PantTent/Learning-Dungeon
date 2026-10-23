// Learning Farm save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang, type Lang } from '../i18n';
import { uid } from '../util/rng';
import {
  animal, crop, CONTEST_TO_WIN, FEED_TRIES, GEAR, GEAR_EFFECT, GOLDEN_CHANCE, GOLDEN_MULT, HATS, MAX_ORDERS, MAX_PRODUCTS, ORCHARD_SLOTS,
  orchardDef, ORDER_BONUS, ORDER_EVERY_MS, PORTAL_COST, QUESTS, recipe, START_COINS, WORLDS, type ContestDef, type QuestDef, type WorldId,
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
  /** Happy time (ms) saved up toward its next products (eggs, milk...). */
  prod?: number;
}

/** One spot in the orchard: empty, or a tree that was last picked at pickedAt. */
export interface OrchardSpot {
  kind?: string;
  pickedAt?: number;
}

export type Ribbon = 'blue' | 'red';

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
  /** Counts of things done (harvests, sales, dishes...) for the journal. */
  stats: Record<string, number>;
  /** Journal jobs finished and rewarded, in order. */
  questsDone: string[];
  orchard: OrchardSpot[];
  /** County Fair ribbons won. */
  ribbons: Partial<Record<ContestDef['id'], Ribbon>>;
  /** Grand Champion of the County Fair (the end of the story). */
  champion?: boolean;
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
    stats: {},
    questsDone: [],
    orchard: Array.from({ length: ORCHARD_SLOTS }, () => ({})),
    ribbons: {},
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
  count1(f, 'harvested', count);
  if (golden) count1(f, 'golden');
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
  count1(f, 'sold');
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
  if (end > a.paidTo) {
    a.pending += (rate * (end - a.paidTo)) / 60000;
    // Products (eggs, milk...) also come while it is happy, up to a few at a time.
    const def = animal(a.kind);
    if (def.productMs) a.prod = Math.min(MAX_PRODUCTS * def.productMs, (a.prod ?? 0) + end - a.paidTo);
  }
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

/** Products waiting to be picked up. */
export function productsReady(a: FarmAnimal, now = Date.now(), f?: FarmSave): number {
  accrue(a, now, f);
  const ms = animal(a.kind).productMs;
  return ms ? Math.floor((a.prod ?? 0) / ms) : 0;
}

/** Put an animal's products in the basket. Returns how many. */
export function collectProducts(f: FarmSave, a: FarmAnimal, now = Date.now()): number {
  const n = productsReady(a, now, f);
  const def = animal(a.kind);
  if (!n || !def.product) return 0;
  a.prod = (a.prod ?? 0) - n * def.productMs!;
  f.basket[def.product] = (f.basket[def.product] ?? 0) + n;
  count1(f, `got_${def.product}`, n);
  return n;
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
  count1(f, 'orders');
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
const SHARED_KEYS = [
  'version', 'farmer', 'coins', 'gear', 'hats', 'settings', 'learning', 'createdAt', 'lastPlayed', 'portal', 'magic', 'stats', 'questsDone',
  'orchard', 'ribbons', 'champion',
] as const;

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
    f.stats ??= {};
    f.questsDone ??= [];
    f.orchard ??= [];
    while (f.orchard.length < ORCHARD_SLOTS) f.orchard.push({});
    f.ribbons ??= {};
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

// ------------------------------------------------------------- counting

/** Add to a journal counter (always on the whole save). */
export function count1(f: FarmSave, key: string, n = 1): void {
  const root = rootOf(f);
  root.stats ??= {};
  root.stats[key] = (root.stats[key] ?? 0) + n;
}

const stat = (f: FarmSave, key: string) => rootOf(f).stats?.[key] ?? 0;

// -------------------------------------------------------------- kitchen

export function canCook(f: FarmSave, id: string): boolean {
  const r = recipe(id);
  return !!r && Object.entries(r.needs).every(([k, n]) => (f.basket[k] ?? 0) >= n);
}

/** Cook a dish from the basket: a right answer makes 2, a wrong one makes 1. */
export function cook(f: FarmSave, id: string, correct: boolean): number {
  const r = recipe(id);
  if (!r || !canCook(f, id)) return 0;
  for (const [k, n] of Object.entries(r.needs)) {
    f.basket[k] -= n;
    if (f.basket[k] <= 0) delete f.basket[k];
  }
  const made = correct ? 2 : 1;
  f.basket[id] = (f.basket[id] ?? 0) + made;
  count1(f, 'cooked');
  count1(f, `cook_${id}`);
  return made;
}

// -------------------------------------------------------------- orchard

export function plantTree(f: FarmSave, i: number, kind: string, now = Date.now()): boolean {
  const root = rootOf(f);
  const spot = root.orchard[i];
  const def = orchardDef(kind);
  if (!spot || spot.kind || root.coins < def.cost) return false;
  root.coins -= def.cost;
  spot.kind = def.id;
  spot.pickedAt = now;
  count1(root, 'trees');
  return true;
}

/** Milliseconds until a tree can be picked (0 = ready now). */
export function treeLeft(spot: OrchardSpot, now = Date.now(), f?: FarmSave): number {
  if (!spot.kind) return Infinity;
  return Math.max(0, (spot.pickedAt ?? now) + orchardDef(spot.kind).everyMs / growSpeed(f) - now);
}

/** Pick a ready tree: all its fruit for a right answer, half for a wrong one. */
export function pickTree(f: FarmSave, i: number, correct: boolean, now = Date.now()): number {
  const root = rootOf(f);
  const spot = root.orchard[i];
  if (!spot?.kind || treeLeft(spot, now, root) > 0) return 0;
  const def = orchardDef(spot.kind);
  const n = correct ? def.count : Math.ceil(def.count / 2);
  root.basket[def.fruit] = (root.basket[def.fruit] ?? 0) + n;
  spot.pickedAt = now;
  count1(root, 'picked', n);
  return n;
}

// -------------------------------------------------------------- journal

/** Is a journal job's goal reached? (Counts things done since the journal started.) */
export function questMet(f: FarmSave, q: QuestDef): boolean {
  const root = rootOf(f);
  const home = root.animals;
  switch (q.id) {
    case 'harvest5': return stat(root, 'harvested') >= 5;
    case 'sell3': return stat(root, 'sold') >= 3;
    case 'orders2': return stat(root, 'orders') >= 2;
    case 'chicken': return home.some((a) => a.kind === 'chicken');
    case 'eggs3': return stat(root, 'got_egg') >= 3;
    case 'muffin': return stat(root, 'cook_muffin') >= 1;
    case 'milk3': return stat(root, 'got_milk') >= 3;
    case 'cook3': return Object.keys(root.stats ?? {}).filter((k) => k.startsWith('cook_')).length >= 3;
    case 'animals4': return home.length >= 4;
    case 'tree': return root.orchard.some((o) => o.kind);
    case 'pick10': return stat(root, 'picked') >= 10;
    case 'applepie': return stat(root, 'cook_applepie') >= 1;
    case 'orders10': return stat(root, 'orders') >= 10;
    case 'golden': return stat(root, 'golden') >= 1;
    case 'blue_harvest': return root.ribbons.harvest === 'blue';
    case 'blue_animal': return root.ribbons.animal === 'blue';
    case 'blue_baking': return root.ribbons.baking === 'blue';
  }
  return false;
}

/** The job the journal is on now (undefined when the story is done). */
export function currentQuest(f: FarmSave): QuestDef | undefined {
  const done = rootOf(f).questsDone;
  return QUESTS.find((q) => !done.includes(q.id));
}

/** Finish the current job: get its coins. Returns the quest, or undefined if it isn't done yet. */
export function claimQuest(f: FarmSave): QuestDef | undefined {
  const root = rootOf(f);
  const q = currentQuest(root);
  if (!q || !questMet(root, q)) return undefined;
  root.coins += q.reward;
  root.questsDone.push(q.id);
  return q;
}

/** Kitchen, orchard and fair open up as the story goes on. */
export function isOpen(f: FarmSave, place: 'kitchen' | 'orchard' | 'fair'): boolean {
  const done = rootOf(f).questsDone;
  return QUESTS.some((q) => q.unlocks === place && done.includes(q.id));
}

// ----------------------------------------------------------- county fair

/** Do you have what this contest needs? (Nothing is used up.) */
export function canEnter(f: FarmSave, id: ContestDef['id'], now = Date.now()): boolean {
  const root = rootOf(f);
  const b = root.basket;
  if (id === 'harvest') return (b.pumpkin ?? 0) + (b['gold:pumpkin'] ?? 0) >= 3;
  if (id === 'baking') return (b.pumpkinpie ?? 0) + (b.applepie ?? 0) >= 1;
  return root.animals.some((a) => a.hat && !isHungry(a, now, root));
}

/**
 * The judges asked their questions: enough right answers win a blue ribbon,
 * otherwise a red one (try again any time). A blue ribbon is never lost.
 * Returns true the moment all three are blue (Grand Champion!).
 */
export function judge(f: FarmSave, id: ContestDef['id'], right: number): boolean {
  const root = rootOf(f);
  if (root.ribbons[id] !== 'blue') root.ribbons[id] = right >= CONTEST_TO_WIN ? 'blue' : 'red';
  const all = (['harvest', 'animal', 'baking'] as const).every((k) => root.ribbons[k] === 'blue');
  if (all && !root.champion) {
    root.champion = true;
    return true;
  }
  return false;
}
