import { getClass, type ClassDef, type StatKey } from '../data/classes';
import { isTwoHanded, slotsFor, starterItem, type Item, type Slot } from '../data/items';
import {
  defaultLearningSettings,
  newLearningStats,
  type LearningSettings,
  type LearningStats,
} from '../questions/engine';
import { uid } from '../util/rng';

export const LEVEL_CAP = 10;
export const BAG_SIZE = 30;

export interface Profile {
  version: 1;
  id: string;
  name: string;
  classId: string;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  mp: number;
  potions: { hp: number; mp: number };
  equipped: Partial<Record<Slot, Item>>;
  bag: Item[];
  /** Highest floor reached (0-based). 3 = boss lair unlocked. */
  maxFloor: number;
  bossKills: number;
  learning: LearningStats;
  settings: LearningSettings;
  createdAt: number;
  lastPlayed: number;
}

export interface DerivedStats {
  str: number;
  int: number;
  agi: number;
  sta: number;
  armor: number;
  crit: number;
  maxHp: number;
  maxMp: number;
  power: number;
  weaponDmg: [number, number];
}

export function xpToNext(level: number): number {
  return Math.round(45 + level * level * 14);
}

export function newProfile(name: string, classId: string): Profile {
  const cls = getClass(classId);
  const p: Profile = {
    version: 1,
    id: uid(),
    name,
    classId,
    level: 1,
    xp: 0,
    gold: 20,
    hp: 1,
    mp: 1,
    potions: { hp: 3, mp: 1 },
    equipped: {},
    bag: [],
    maxFloor: 0,
    bossKills: 0,
    learning: newLearningStats(),
    settings: defaultLearningSettings(),
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  };
  p.equipped.mainhand = starterItem(cls.startWeapon);
  if (cls.startOffhand) p.equipped.offhand = starterItem(cls.startOffhand);
  p.equipped.chest = starterItem('chest');
  p.equipped.chest.armor = 3;
  const s = derive(p);
  p.hp = s.maxHp;
  p.mp = s.maxMp;
  return p;
}

export function derive(p: Profile): DerivedStats {
  const cls = getClass(p.classId);
  const lv = p.level - 1;
  const s = {
    str: Math.round(cls.base.str + cls.growth.str * lv),
    int: Math.round(cls.base.int + cls.growth.int * lv),
    agi: Math.round(cls.base.agi + cls.growth.agi * lv),
    sta: Math.round(cls.base.sta + cls.growth.sta * lv),
    armor: 0,
    crit: 5,
  };
  let weaponDmg: [number, number] = [1, 2];
  for (const item of Object.values(p.equipped)) {
    if (!item) continue;
    if (item.armor) s.armor += item.armor;
    for (const [k, v] of Object.entries(item.stats) as [StatKey, number][]) s[k] += v;
    if (item.dmg) weaponDmg = item.dmg;
  }
  s.crit += Math.floor(s.agi / 5);
  const primary = s[cls.primary];
  return {
    ...s,
    maxHp: Math.round(30 + s.sta * 5 + p.level * 6),
    maxMp: Math.round(14 + p.level * 2 + (cls.primary === 'int' ? s.int * 0.8 : s.int * 0.4 + 6)),
    power: (weaponDmg[0] + weaponDmg[1]) / 2 + primary * 0.9 + p.level,
    weaponDmg,
  };
}

/** Adds XP, returns how many levels were gained. */
export function gainXp(p: Profile, xp: number): number {
  if (p.level >= LEVEL_CAP) return 0;
  p.xp += xp;
  let gained = 0;
  while (p.level < LEVEL_CAP && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    gained++;
  }
  if (p.level >= LEVEL_CAP) p.xp = 0;
  if (gained) {
    const s = derive(p);
    p.hp = s.maxHp;
    p.mp = s.maxMp;
  }
  return gained;
}

export function clampVitals(p: Profile): void {
  const s = derive(p);
  p.hp = Math.min(p.hp, s.maxHp);
  p.mp = Math.min(p.mp, s.maxMp);
}

/**
 * Equip an item from the bag. Handles rings (fills an empty ring slot first)
 * and two-handed weapons (which also remove the off-hand, and vice versa).
 * Returns false if the bag is too full to hold what comes off.
 */
export function equip(p: Profile, item: Item, slotHint?: Slot): boolean {
  const options = slotsFor(item.base);
  let slot = slotHint && options.includes(slotHint) ? slotHint : options.find((s) => !p.equipped[s]) ?? options[0];

  const removing: Item[] = [];
  if (p.equipped[slot]) removing.push(p.equipped[slot]!);
  if (slot === 'mainhand' && isTwoHanded(item.base) && p.equipped.offhand) removing.push(p.equipped.offhand);
  if (slot === 'offhand' && p.equipped.mainhand && isTwoHanded(p.equipped.mainhand.base)) removing.push(p.equipped.mainhand);

  const bagAfter = p.bag.length - 1 + removing.length;
  if (bagAfter > BAG_SIZE) return false;

  p.bag = p.bag.filter((b) => b.id !== item.id);
  for (const r of removing) {
    for (const s of Object.keys(p.equipped) as Slot[]) if (p.equipped[s]?.id === r.id) delete p.equipped[s];
    p.bag.push(r);
  }
  p.equipped[slot] = item;
  clampVitals(p);
  return true;
}

export function unequip(p: Profile, slot: Slot): boolean {
  const item = p.equipped[slot];
  if (!item || p.bag.length >= BAG_SIZE) return false;
  delete p.equipped[slot];
  p.bag.push(item);
  clampVitals(p);
  return true;
}

export function classOf(p: Profile): ClassDef {
  return getClass(p.classId);
}

// ---------- Saving ----------
// Saves live on the device for now. Cloud save (Google / email login) will
// plug in here later without changing the rest of the game.

const KEY = 'learning-dungeon.profiles.v1';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

export function saveProfile(p: Profile): void {
  p.lastPlayed = Date.now();
  const all = loadProfiles().filter((x) => x.id !== p.id);
  all.push(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked; the game keeps running from memory.
  }
}

export function deleteProfile(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadProfiles().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}

/** The profile currently being played, shared by all scenes. */
export const session: { profile: Profile | null } = { profile: null };

export function current(): Profile {
  if (!session.profile) throw new Error('No profile loaded');
  return session.profile;
}
