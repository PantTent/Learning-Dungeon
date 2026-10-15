import type { ClassDef, OffhandType, StatKey, WeaponType } from './classes';
import { chance, pick, rf, uid, weighted } from '../util/rng';

export type Slot = 'head' | 'chest' | 'legs' | 'hands' | 'feet' | 'neck' | 'ring1' | 'ring2' | 'mainhand' | 'offhand';
export const SLOTS: Slot[] = ['head', 'neck', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'mainhand', 'offhand'];
export const SLOT_LABEL: Record<Slot, string> = {
  head: 'Head', neck: 'Necklace', chest: 'Chest', hands: 'Gloves', legs: 'Pants',
  feet: 'Boots', ring1: 'Ring', ring2: 'Ring', mainhand: 'Main Hand', offhand: 'Off Hand',
};

export type ArmorType = 'head' | 'chest' | 'legs' | 'hands' | 'feet';
export type JewelryType = 'ring' | 'neck';
export type BaseType = ArmorType | JewelryType | WeaponType | OffhandType;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
/**
 * stats  = how many different stats the item rolls
 * budget = how many total stat points it gets, relative to an Uncommon item
 * mult   = scales weapon damage and armor
 */
export const RARITY: Record<Rarity, { name: string; color: number; css: string; stats: number; budget: number; mult: number; rank: number }> = {
  common: { name: 'Common', color: 0xd8d8d8, css: '#d8d8d8', stats: 1, budget: 0.6, mult: 1, rank: 0 },
  uncommon: { name: 'Uncommon', color: 0x3ed34a, css: '#3ed34a', stats: 2, budget: 1, mult: 1.1, rank: 1 },
  rare: { name: 'Rare', color: 0x3d8bff, css: '#3d8bff', stats: 2, budget: 1.5, mult: 1.2, rank: 2 },
  epic: { name: 'Epic', color: 0xb24dff, css: '#b24dff', stats: 3, budget: 2.2, mult: 1.35, rank: 3 },
  legendary: { name: 'Legendary', color: 0xff9a1f, css: '#ff9a1f', stats: 3, budget: 3, mult: 1.5, rank: 4 },
  mythic: { name: 'Mythic', color: 0xff4d6d, css: '#ff4d6d', stats: 4, budget: 3.8, mult: 1.7, rank: 5 },
};

/** Total stat points an item gets: small at low levels, growing with item level and rarity. */
export function statBudget(ilvl: number, rarity: Rarity): number {
  return Math.max(RARITY[rarity].stats, Math.round((0.5 + ilvl * 0.4) * RARITY[rarity].budget));
}

export const TWO_HANDED: WeaponType[] = ['greatsword', 'greataxe', 'staff', 'bow'];
const ONE_HANDED: WeaponType[] = ['sword', 'axe', 'mace', 'dagger', 'wand'];

export interface Item {
  id: string;
  base: BaseType;
  name: string;
  rarity: Rarity;
  ilvl: number;
  /** Weapon damage (weapons only). */
  dmg?: [number, number];
  armor?: number;
  stats: Partial<Record<StatKey, number>>;
  value: number;
}

const BASE_NAME: Record<BaseType, string> = {
  head: 'Helm', chest: 'Chestguard', legs: 'Pants', hands: 'Gloves', feet: 'Boots',
  ring: 'Ring', neck: 'Amulet',
  sword: 'Sword', axe: 'Axe', mace: 'Mace', dagger: 'Dagger', wand: 'Wand',
  greatsword: 'Greatsword', greataxe: 'Greataxe', staff: 'Staff', bow: 'Bow',
  shield: 'Shield', tome: 'Spellbook',
};

export const ICON: Record<BaseType, string> = {
  head: 'icon_head', chest: 'icon_chest', legs: 'icon_legs', hands: 'icon_hands', feet: 'icon_feet',
  ring: 'icon_ring', neck: 'icon_neck',
  sword: 'icon_sword', axe: 'icon_axe', mace: 'icon_mace', dagger: 'icon_dagger', wand: 'icon_wand',
  greatsword: 'icon_greatsword', greataxe: 'icon_greataxe', staff: 'icon_staff', bow: 'icon_bow',
  shield: 'icon_shield', tome: 'icon_tome',
};

const ARMOR_FACTOR: Partial<Record<BaseType, number>> = {
  chest: 1, legs: 0.8, head: 0.6, feet: 0.5, hands: 0.4, shield: 1.3,
};

export const STAT_LABEL: Record<StatKey, string> = {
  str: 'Strength', int: 'Intellect', agi: 'Dexterity', sta: 'Stamina', armor: 'Armor', crit: 'Crit %',
};

const PREFIX: Record<StatKey, string[]> = {
  str: ['Mighty', 'Brutal', 'Strong'],
  int: ['Wise', 'Arcane', 'Clever'],
  agi: ['Swift', 'Nimble', 'Quick'],
  sta: ['Sturdy', 'Hearty', 'Tough'],
  armor: ['Reinforced', 'Guarding', 'Plated'],
  crit: ['Keen', 'Lucky', 'Sharp'],
};
const SUFFIX: Record<StatKey, string> = {
  str: 'of the Bear', int: 'of the Owl', agi: 'of the Fox', sta: 'of the Turtle', armor: 'of the Wall', crit: 'of the Tiger',
};

function material(base: BaseType, ilvl: number): string {
  const tier = ilvl <= 3 ? 0 : ilvl <= 6 ? 1 : ilvl <= 9 ? 2 : 3;
  if (base === 'ring' || base === 'neck') return ['Copper', 'Silver', 'Gold', 'Moonstone'][tier];
  if (base === 'staff' || base === 'wand' || base === 'bow') return ['Oak', 'Ash', 'Yew', 'Elderwood'][tier];
  if (base === 'tome') return ['Dusty', 'Glowing', 'Runed', 'Ancient'][tier];
  return ['Copper', 'Iron', 'Steel', 'Mithril'][tier];
}

export function isWeapon(b: BaseType): b is WeaponType {
  return (ONE_HANDED as string[]).includes(b) || (TWO_HANDED as string[]).includes(b);
}
export function isTwoHanded(b: BaseType): boolean {
  return (TWO_HANDED as string[]).includes(b);
}
export function isOffhand(b: BaseType): b is OffhandType {
  return b === 'shield' || b === 'tome';
}

/** Slots this item can go in. */
export function slotsFor(b: BaseType): Slot[] {
  if (b === 'ring') return ['ring1', 'ring2'];
  if (isWeapon(b)) return ['mainhand'];
  if (isOffhand(b)) return ['offhand'];
  return [b as Slot];
}

export function canUse(cls: ClassDef, item: Item): boolean {
  if (isWeapon(item.base)) return cls.weapons.includes(item.base);
  if (isOffhand(item.base)) return cls.offhands.includes(item.base);
  return true;
}

export function rollRarity(boss: boolean): Rarity {
  return boss
    ? weighted({ rare: 55, epic: 33, legendary: 10, mythic: 2 } as Record<Rarity, number>)
    : weighted({ common: 52, uncommon: 32, rare: 13, epic: 3 } as Record<Rarity, number>);
}

/**
 * Make a random item. If `cls` is given, weapons/off-hands are usually ones
 * the class can actually use, so loot feels rewarding.
 */
export function makeItem(ilvl: number, opts: { rarity?: Rarity; cls?: ClassDef; base?: BaseType; boss?: boolean } = {}): Item {
  const rarity = opts.rarity ?? rollRarity(!!opts.boss);
  let base = opts.base;
  if (!base) {
    let kind = weighted({ armor: 50, jewelry: 18, weapon: 22, offhand: 10 });
    // Rangers have no off-hand, so give them something they can wear instead.
    if (kind === 'offhand' && opts.cls && !opts.cls.offhands.length) kind = 'armor';
    if (kind === 'armor') base = pick(['head', 'chest', 'legs', 'hands', 'feet'] as ArmorType[]);
    else if (kind === 'jewelry') base = pick(['ring', 'ring', 'neck'] as JewelryType[]);
    else if (kind === 'weapon') {
      base = opts.cls && (opts.boss || chance(0.8)) ? pick(opts.cls.weapons) : pick([...ONE_HANDED, ...TWO_HANDED]);
    } else {
      base = opts.cls && opts.cls.offhands.length && (opts.boss || chance(0.8)) ? pick(opts.cls.offhands) : pick(['shield', 'tome'] as OffhandType[]);
    }
  }
  const r = RARITY[rarity];
  const item: Item = { id: uid(), base, name: '', rarity, ilvl, stats: {}, value: 0 };

  if (isWeapon(base)) {
    const avg = (3 + ilvl * 1.7) * r.mult * (isTwoHanded(base) ? 1.6 : 1);
    const spread = base === 'dagger' || base === 'wand' ? 0.15 : 0.3;
    item.dmg = [Math.max(1, Math.round(avg * (1 - spread))), Math.round(avg * (1 + spread))];
  }
  const af = ARMOR_FACTOR[base];
  if (af) item.armor = Math.round((ilvl * 2 + 4) * af * r.mult * rf(0.9, 1.1));

  // Pick stats: favor the class main stat + stamina when we know the class.
  const pool: StatKey[] = ['str', 'int', 'agi', 'sta', 'sta', 'crit'];
  if (af) pool.push('armor');
  if (opts.cls) pool.push(opts.cls.primary, opts.cls.primary, opts.cls.primary);
  const chosen: StatKey[] = [];
  while (chosen.length < r.stats) {
    const s = pick(pool);
    if (!chosen.includes(s)) chosen.push(s);
  }
  // Split one shared budget across the stats (each gets at least 1).
  const total = Math.max(chosen.length, Math.round(statBudget(ilvl, rarity) * rf(0.9, 1.1)));
  const weights = chosen.map((_, i) => rf(1, 2) + (i === 0 ? 1 : 0));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const pts = weights.map((w) => Math.max(1, Math.floor((total * w) / wsum)));
  pts[0] += Math.max(0, total - pts.reduce((a, b) => a + b, 0));
  chosen.forEach((s, i) => {
    // Crit % is strong, so it costs double; armor is weak, so it gives more.
    const v = s === 'crit' ? Math.max(1, Math.round(pts[i] / 2)) : s === 'armor' ? pts[i] * 2 : pts[i];
    item.stats[s] = v;
  });

  const top = (Object.entries(item.stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1]);
  const mat = material(base, ilvl);
  if (rarity === 'mythic') {
    item.name = `${pick(['Starforged', 'Eternal', 'Dragonbone'])} ${BASE_NAME[base]} of Grukk`;
  } else if (rarity === 'legendary') {
    item.name = `Grukk's ${pick(['Royal', 'Golden', 'Mighty', 'Crowned'])} ${BASE_NAME[base]}`;
  } else {
    const prefix = rarity === 'common' ? '' : pick(PREFIX[top[0][0]]) + ' ';
    const suffix = r.rank >= 2 && top[1] ? ' ' + SUFFIX[top[1][0]] : '';
    item.name = `${prefix}${mat} ${BASE_NAME[base]}${suffix}`;
  }
  item.value = Math.round((ilvl * 3 + 4) * (1 + r.rank * 1.5));
  return item;
}

/** A simple starter item (common, no frills). */
export function starterItem(base: BaseType): Item {
  const it = makeItem(1, { rarity: 'common', base });
  it.name = `Old ${BASE_NAME[base]}`;
  it.stats = base === 'shield' || base === 'tome' ? { sta: 1 } : {};
  it.value = 1;
  return it;
}

/** A rough "how good is this" number, used for the green/red compare arrows. */
export function itemScore(item: Item | null | undefined, cls: ClassDef): number {
  if (!item) return 0;
  let s = 0;
  if (item.dmg) s += ((item.dmg[0] + item.dmg[1]) / 2) * 2.2;
  s += (item.armor ?? 0) * 0.5;
  for (const [k, v] of Object.entries(item.stats) as [StatKey, number][]) {
    s += v * (k === cls.primary ? 1.6 : k === 'sta' ? 1 : k === 'crit' ? 2 : k === 'armor' ? 0.5 : 0.3);
  }
  return s;
}

export function weaponLabel(base: BaseType): string {
  if (isWeapon(base)) return isTwoHanded(base) ? 'Two-Hand' : 'One-Hand';
  if (isOffhand(base)) return 'Off Hand';
  if (base === 'ring') return 'Ring';
  if (base === 'neck') return 'Necklace';
  return SLOT_LABEL[base as Slot];
}

