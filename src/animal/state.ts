// Animal Kingdom Quest save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang } from '../i18n';
import type { Grade } from '../questions/curriculum';
import { ri } from '../util/rng';
import { buildJungle } from './world';
import { animal, FOODS, food, quest, QUESTS, type QuestDef, type RecipeDef, type ShopItem, type WildDef } from './data';

export type QuestState = 'new' | 'active' | 'done';

export interface AnimalSave {
  version: 1;
  name: string;
  animal: string;
  level: number;
  xp: number;
  hearts: number;
  acorns: number;
  /** Food in the backpack. */
  foods: Record<string, number>;
  quests: Record<QuestDef['id'], QuestState>;
  /** Rocks broken (their puppy is rescued). */
  rescued: string[];
  /** Hidden golden acorns found. */
  golden: string[];
  /** Secret stumps opened. */
  stumps: string[];
  gorillaCalm: boolean;
  /** Part 2: sand mounds dug in the Desert, and the fossils found in them. */
  dug: string[];
  fossils: string[];
  /** Dishes cooked in Chef Raccoon's kitchen. */
  cooked: number;
  tortoiseCalm: boolean;
  /** Charms bought at the shop (they help for good). */
  charms: string[];
  /** Animal facts seen (wild animal ids). */
  facts: string[];
  /** The mayor has said hello. */
  welcomed?: boolean;
  settings: LearningSettings;
  learning: LearningStats;
  createdAt: number;
  lastPlayed: number;
}

const KEY = 'learning-animals.save.v1';
export const MAX_LEVEL = 20;

export function newAnimalSave(name: string, animalId: string, grade: Grade, now = Date.now()): AnimalSave {
  const lang = getLang();
  const settings = { ...defaultLearningSettings(lang), grade };
  // Young players get the questions read out loud.
  if (grade <= 2) settings.readAloud = true;
  const s: AnimalSave = {
    version: 1,
    name,
    animal: animalId,
    level: 1,
    xp: 0,
    hearts: 0,
    acorns: 0,
    foods: { berries: 2 },
    quests: newQuests(),
    rescued: [],
    golden: [],
    stumps: [],
    gorillaCalm: false,
    dug: [],
    fossils: [],
    cooked: 0,
    tortoiseCalm: false,
    charms: [],
    facts: [],
    settings,
    learning: newLearningStats(),
    createdAt: now,
    lastPlayed: now,
  };
  s.hearts = maxHearts(s);
  return s;
}

function newQuests(): AnimalSave['quests'] {
  return Object.fromEntries(QUESTS.map((q) => [q.id, 'new'])) as AnimalSave['quests'];
}

export function loadAnimals(): AnimalSave | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AnimalSave;
    s.settings = upgradeSettings(s.settings);
    s.foods = { ...s.foods };
    s.quests = { ...newQuests(), ...s.quests };
    s.stumps ??= [];
    s.dug ??= [];
    s.fossils ??= [];
    s.cooked ??= 0;
    s.tortoiseCalm ??= false;
    s.charms ??= [];
    return s;
  } catch {
    return null;
  }
}

export function saveAnimals(s: AnimalSave): void {
  s.lastPlayed = Date.now();
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

// ---------------------------------------------------------------- hero
export const hasCharm = (s: AnimalSave, id: string) => s.charms.includes(id);
export const maxHearts = (s: AnimalSave) => animal(s.animal).hearts + (s.level - 1) * 2 + (hasCharm(s, 'heart') ? 4 : 0);
/** How strong each calming move is. */
export const power = (s: AnimalSave) => 1 + (s.level - 1) * 0.25;
export const xpToNext = (level: number) => 20 + level * 15;
export const skill = (s: AnimalSave) => animal(s.animal).skill;

/** Add XP; returns the number of levels gained. Leveling up fills your hearts. */
export function gainXp(s: AnimalSave, xp: number): number {
  let ups = 0;
  s.xp += xp;
  while (s.level < MAX_LEVEL && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    ups++;
  }
  if (s.level >= MAX_LEVEL) s.xp = 0;
  if (ups) s.hearts = maxHearts(s);
  return ups;
}

/** Moves the hero knows at their level. */
export const moves = (s: AnimalSave) => animal(s.animal).moves.filter((m) => m.unlock <= s.level);

// ---------------------------------------------------------------- food
export function eat(s: AnimalSave, foodId: string): number {
  if (!s.foods[foodId]) return 0;
  const before = s.hearts;
  s.foods[foodId]--;
  s.hearts = Math.min(maxHearts(s), s.hearts + food(foodId).heal);
  return s.hearts - before;
}

export const hasFood = (s: AnimalSave) => FOODS.some((f) => s.foods[f.id] > 0);

/** Do we have everything a recipe needs? */
export const canCook = (s: AnimalSave, r: RecipeDef) => Object.entries(r.needs).every(([id, n]) => (s.foods[id] ?? 0) >= n);

/** Cook a recipe: uses the ingredients; a right answer makes one extra. Returns how many were made. */
export function cook(s: AnimalSave, r: RecipeDef, correct: boolean): number {
  if (!canCook(s, r)) return 0;
  for (const [id, n] of Object.entries(r.needs)) s.foods[id] -= n;
  const made = correct ? 2 : 1;
  addFood(s, r.makes, made);
  s.cooked++;
  return made;
}

/** Buy at the shop. Charms are bought once. */
export function buy(s: AnimalSave, item: ShopItem): boolean {
  if (s.acorns < item.price || (item.kind === 'charm' && hasCharm(s, item.id))) return false;
  s.acorns -= item.price;
  if (item.kind === 'food') addFood(s, item.id);
  else {
    s.charms.push(item.id);
    if (item.id === 'heart') s.hearts += 4;
  }
  return true;
}

export function rest(s: AnimalSave): void {
  s.hearts = maxHearts(s);
}

// ---------------------------------------------------------------- battle
export interface Foe {
  def: WildDef;
  level: number;
  grump: number;
  calm: number;
}

export function makeFoe(def: WildDef, level: number): Foe {
  return { def, level, grump: Math.round(def.grump * (1 + 0.2 * (level - 1))), calm: 0 };
}

/** How much one move calms the animal: right answer = full, wrong = half. */
export function calmAmount(s: AnimalSave, movePower: number, correct: boolean, lucky = false): number {
  let n = movePower * power(s);
  if (hasCharm(s, 'clover')) n *= 1.15;
  if (!correct) n /= 2;
  if (lucky) n *= 1.5;
  return Math.round(n * 10) / 10;
}

/** Hearts a grumpy animal knocks off (stronger in higher levels). */
export const swipe = (f: Foe) => f.def.swipe + Math.floor((f.level - 1) / 2);

/** A lion's roar starts the battle a quarter calm. */
export const startCalm = (s: AnimalSave, f: Foe) => (skill(s) === 'roar' ? Math.round(f.grump * 0.25 * 10) / 10 : 0);

export function xpFor(f: Foe): number {
  return Math.round(f.def.xp * (1 + 0.3 * (f.level - 1)));
}

/** What a calm animal leaves behind: maybe a food, and some acorns. */
export function dropsFor(f: Foe, roll = Math.random()): { food?: string; acorns: number } {
  const out: { food?: string; acorns: number } = { acorns: ri(1, 3) * f.level };
  if (f.def.drop && roll < f.def.drop[1]) out.food = f.def.drop[0];
  return out;
}

export function addFood(s: AnimalSave, id: string, n = 1): void {
  s.foods[id] = (s.foods[id] ?? 0) + n;
}

// ---------------------------------------------------------------- quests
export function progress(s: AnimalSave, id: QuestDef['id']): number {
  const need = quest(id).need;
  if (id === 'pie') return Math.min(s.foods.apple ?? 0, need);
  if (id === 'puppies') return Math.min(puppiesFound(s), need);
  if (id === 'fossils') return Math.min(s.fossils.length, need);
  if (id === 'cook') return Math.min(s.cooked, need);
  return bossCalm(s, id) ? 1 : 0;
}

/** Rocks in the Jungle that hide a puppy (the other rocks only hide acorns). */
const PUPPY_ROCKS = new Set(buildJungle().rocks.filter((r) => r.puppy).map((r) => r.id));
export const puppiesFound = (s: AnimalSave) => s.rescued.filter((id) => PUPPY_ROCKS.has(id)).length;

/** Has this boss been calmed? */
export function bossCalm(s: AnimalSave, id: string): boolean {
  return id === 'gorilla' ? s.gorillaCalm : id === 'tortoise' ? s.tortoiseCalm : false;
}

export function setBossCalm(s: AnimalSave, id: string): void {
  if (id === 'gorilla') s.gorillaCalm = true;
  if (id === 'tortoise') s.tortoiseCalm = true;
}

/** The Desert opens once the gorilla in the Jungle is calm. */
export const desertOpen = (s: AnimalSave) => s.gorillaCalm;

export const canTurnIn = (s: AnimalSave, id: QuestDef['id']) => s.quests[id] === 'active' && progress(s, id) >= quest(id).need;

/** Is the hero ready to be offered this quest? (Only boss quests wait.) */
export function questReady(s: AnimalSave, id: QuestDef['id']): boolean {
  const b = quest(id).boss;
  return !b || s.level >= b.level || b.after.every((a) => s.quests[a] === 'done');
}

export function accept(s: AnimalSave, id: QuestDef['id']): void {
  if (s.quests[id] === 'new') s.quests[id] = 'active';
}

/** Hand in a finished quest: rewards, and the apples go into the pie. */
export function turnIn(s: AnimalSave, id: QuestDef['id']): { acorns: number; xp: number; levels: number } | null {
  if (!canTurnIn(s, id)) return null;
  const q = quest(id);
  if (id === 'pie') {
    s.foods.apple -= q.need;
    addFood(s, 'pie', 2);
  }
  if (id === 'cook') addFood(s, 'salad');
  s.quests[id] = 'done';
  s.acorns += q.acorns;
  return { acorns: q.acorns, xp: q.xp, levels: gainXp(s, q.xp) };
}
