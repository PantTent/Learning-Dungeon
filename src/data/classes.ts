import { SPELL_LISTS } from './spells';
export type PrimaryStat = 'str' | 'int' | 'agi';
export type StatKey = 'str' | 'int' | 'agi' | 'sta' | 'armor' | 'crit';

export type WeaponType =
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'wand'
  | 'greatsword' | 'greataxe' | 'staff' | 'bow';
export type OffhandType = 'shield' | 'tome';

/** Visual effect used when an ability lands. */
export type Fx =
  | 'slash' | 'fire' | 'frost' | 'arcane' | 'arrow' | 'holy'
  | 'shadow' | 'nature' | 'fel' | 'heal' | 'lightning';

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  unlock: number;
  mp: number;
  kind: 'damage' | 'aoe' | 'heal' | 'drain' | 'summon' | 'stun';
  /** Damage multiplier, or fraction of max HP for heals. */
  power: number;
  fx: Fx;
  /** True if the hero runs up to the target (melee) instead of casting from place. */
  melee?: boolean;
  /** Area spells: chance to freeze/stun each enemy hit (on a right answer). */
  stunChance?: number;
  /** Special look for the spell's missile (default: a small glowing orb). */
  anim?:
    | 'orb' | 'snow'
    // warrior
    | 'cleave' | 'bash' | 'heroic' | 'execute' | 'storm' | 'thunderclap'
    // paladin
    | 'crusader' | 'holylight' | 'judge' | 'consecrate' | 'sunfire' | 'flamestrike' | 'hammerthrow'
    // ranger
    | 'aimed' | 'multishot' | 'concuss' | 'venom' | 'rapid' | 'thornvolley'
    // necromancer
    | 'raise' | 'drain' | 'bonespikes' | 'chill' | 'gravefrost' | 'lance';
}

export type PowerStyle = 'whirlwind' | 'meteor' | 'arrowstorm' | 'hammer' | 'bones' | 'vines' | 'infernal' | 'ice' | 'nova' | 'thunder' | 'wild' | 'tomb';

/** Super attack unlocked by answering 3 questions right in a row. */
export interface PowerDef {
  name: string;
  /** Spell school this ultimate belongs to (picked by the hero's chosen spells). */
  fx?: Fx;
  style: PowerStyle;
  color: number;
  css: string;
}

export interface ClassDef {
  id: string;
  name: string;
  role: string;
  blurb: string;
  sprite: string;
  color: number;
  primary: PrimaryStat;
  base: Record<'str' | 'int' | 'agi' | 'sta', number>;
  weapons: WeaponType[];
  offhands: OffhandType[];
  startWeapon: WeaponType;
  startOffhand?: OffhandType;
  summon?: { sprite: string; name: string };
  skills: SkillDef[];
  power: PowerDef;
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    power: { fx: 'slash', name: 'Whirlwind Slam', style: 'whirlwind', color: 0xff6040, css: '#ff7a5a' },
    name: 'Warrior',
    role: 'Tough fighter',
    blurb: 'Lots of health and heavy hits. Great for beginners!',
    sprite: 'hero_warrior',
    color: 0xd04a3a,
    primary: 'str',
    base: { str: 10, int: 3, agi: 5, sta: 10 },
    weapons: ['sword', 'axe', 'mace', 'greatsword', 'greataxe'],
    offhands: ['shield'],
    startWeapon: 'sword',
    startOffhand: 'shield',
    skills: [
      { id: 'strike', name: 'Strike', desc: 'A strong sword swing.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'slash', melee: true },
      { id: 'cleave', name: 'Cleave', desc: 'Hit ALL enemies.', unlock: 3, mp: 5, kind: 'aoe', power: 0.8, fx: 'slash', melee: true },
      { id: 'shieldslam', name: 'Shield Slam', desc: 'Big hit that stuns the enemy for a turn.', unlock: 6, mp: 7, kind: 'stun', power: 1.5, fx: 'slash', melee: true },
    ],
  },
  {
    id: 'mage',
    power: { fx: 'fire', name: 'Meteor', style: 'meteor', color: 0xff8a2a, css: '#ffa040' },
    name: 'Mage',
    role: 'Spell blaster',
    blurb: 'Fire and ice magic. Huge damage, less health.',
    sprite: 'hero_mage',
    color: 0x4a7ad0,
    primary: 'int',
    base: { str: 3, int: 12, agi: 5, sta: 7 },
    weapons: ['wand', 'dagger', 'staff'],
    offhands: ['tome'],
    startWeapon: 'staff',
    skills: [
      { id: 'firebolt', name: 'Firebolt', desc: 'Throw a ball of fire.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'fire' },
      { id: 'frostnova', name: 'Frost Nova', desc: 'Freeze ALL enemies.', unlock: 3, mp: 6, kind: 'aoe', power: 0.85, fx: 'frost' },
      { id: 'arcaneblast', name: 'Arcane Blast', desc: 'A massive blast of magic.', unlock: 6, mp: 8, kind: 'damage', power: 2, fx: 'arcane' },
    ],
  },
  {
    id: 'ranger',
    power: { fx: 'arrow', name: 'Arrow Storm', style: 'arrowstorm', color: 0x9aff6a, css: '#a8ff7a' },
    name: 'Ranger',
    role: 'Sharp shooter',
    blurb: 'An archer with high Dexterity, so lots of critical hits.',
    sprite: 'hero_ranger',
    color: 0x4ea84a,
    primary: 'agi',
    base: { str: 5, int: 4, agi: 11, sta: 8 },
    weapons: ['bow'],
    offhands: [],
    startWeapon: 'bow',
    skills: [
      { id: 'shoot', name: 'Shoot', desc: 'Fire an arrow.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'arrow' },
      { id: 'multishot', name: 'Multi-Shot', desc: 'Arrows hit ALL enemies.', unlock: 3, mp: 5, kind: 'aoe', power: 0.8, fx: 'arrow' },
      { id: 'aimedshot', name: 'Aimed Shot', desc: 'Take careful aim for huge damage.', unlock: 6, mp: 7, kind: 'damage', power: 1.9, fx: 'arrow' },
    ],
  },
  {
    id: 'paladin',
    power: { fx: 'holy', name: 'Divine Hammer', style: 'hammer', color: 0xffe066, css: '#ffe066' },
    name: 'Paladin',
    role: 'Holy knight',
    blurb: 'Armored hero who can heal with holy light.',
    sprite: 'hero_paladin',
    color: 0xe8c450,
    primary: 'str',
    base: { str: 9, int: 6, agi: 4, sta: 10 },
    weapons: ['mace', 'sword', 'greatsword'],
    offhands: ['shield'],
    startWeapon: 'mace',
    startOffhand: 'shield',
    skills: [
      { id: 'crusader', name: 'Crusader Strike', desc: 'A strike blessed with light.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'holy', melee: true },
      { id: 'holylight', name: 'Holy Light', desc: 'Heal yourself.', unlock: 3, mp: 6, kind: 'heal', power: 0.45, fx: 'heal' },
      { id: 'judgement', name: 'Judgement', desc: 'Big holy hit that stuns.', unlock: 6, mp: 7, kind: 'stun', power: 1.5, fx: 'holy' },
    ],
  },
  {
    id: 'necromancer',
    power: { fx: 'shadow', name: 'Army of Bones', style: 'bones', color: 0xb070ff, css: '#c08aff' },
    name: 'Necromancer',
    role: 'Master of bones',
    blurb: 'Raises skeletons to fight and drains life from foes.',
    sprite: 'hero_necromancer',
    color: 0x8a4ac8,
    primary: 'int',
    base: { str: 3, int: 11, agi: 5, sta: 8 },
    weapons: ['wand', 'dagger', 'staff'],
    offhands: ['tome'],
    startWeapon: 'staff',
    summon: { sprite: 'minion_skeleton', name: 'Skeleton' },
    skills: [
      { id: 'shadowbolt', name: 'Shadow Bolt', desc: 'A bolt of shadow.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'shadow' },
      { id: 'raisedead', name: 'Raise Skeleton', desc: 'A skeleton fights for you for a few turns.', unlock: 3, mp: 6, kind: 'summon', power: 0.6, fx: 'shadow' },
      { id: 'drainlife', name: 'Drain Life', desc: 'Steal health from an enemy.', unlock: 6, mp: 7, kind: 'drain', power: 1.4, fx: 'shadow' },
    ],
  },
  {
    id: 'druid',
    power: { fx: 'nature', name: 'Wrath of the Wild', style: 'vines', color: 0x6ad04a, css: '#8aff6a' },
    name: 'Druid',
    role: 'Nature guardian',
    blurb: 'Calls on nature to heal and to crush enemies with thorns.',
    sprite: 'hero_druid',
    color: 0x9a7a3a,
    primary: 'int',
    base: { str: 5, int: 10, agi: 5, sta: 9 },
    weapons: ['staff', 'mace', 'dagger'],
    offhands: ['tome'],
    startWeapon: 'staff',
    skills: [
      { id: 'wrath', name: 'Wrath', desc: 'A blast of nature energy.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'nature' },
      { id: 'rejuv', name: 'Rejuvenate', desc: 'Heal yourself with nature.', unlock: 3, mp: 6, kind: 'heal', power: 0.45, fx: 'heal' },
      { id: 'thornstorm', name: 'Thorn Storm', desc: 'Thorns hit ALL enemies.', unlock: 6, mp: 8, kind: 'aoe', power: 1.05, fx: 'nature' },
    ],
  },
  {
    id: 'demonologist',
    power: { fx: 'fel', name: 'Infernal', style: 'infernal', color: 0x5aff4a, css: '#7aff6a' },
    name: 'Demonologist',
    role: 'Imp summoner',
    blurb: 'Summons a fiery imp helper and rains green fire.',
    sprite: 'hero_demonologist',
    color: 0x5ad04a,
    primary: 'int',
    base: { str: 3, int: 11, agi: 5, sta: 8 },
    weapons: ['wand', 'dagger', 'staff'],
    offhands: ['tome'],
    startWeapon: 'wand',
    startOffhand: 'tome',
    summon: { sprite: 'minion_imp', name: 'Imp' },
    skills: [
      { id: 'felbolt', name: 'Fel Bolt', desc: 'A bolt of green fire.', unlock: 1, mp: 0, kind: 'damage', power: 1, fx: 'fel' },
      { id: 'summonimp', name: 'Summon Imp', desc: 'An imp fights for you for a few turns.', unlock: 3, mp: 6, kind: 'summon', power: 0.65, fx: 'fel' },
      { id: 'hellfire', name: 'Hellfire', desc: 'Green fire hits ALL enemies.', unlock: 6, mp: 8, kind: 'aoe', power: 1.0, fx: 'fel' },
    ],
  },
];

/** Stats gained per level: +2 to the class's main stat, +1 to everything else. */
export function growthPerLevel(cls: ClassDef): Record<'str' | 'int' | 'agi' | 'sta', number> {
  const g = { str: 1, int: 1, agi: 1, sta: 1 };
  g[cls.primary] = 2;
  return g;
}

export function getClass(id: string): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}

// Full spell lists live in spells.ts (10 per class, unlocking every 2 levels).
for (const c of CLASSES) c.skills = SPELL_LISTS[c.id];
