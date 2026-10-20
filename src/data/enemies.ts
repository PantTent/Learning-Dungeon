import { chance, pick, ri } from '../util/rng';

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  atk: number;
  armor: number;
  /** Words used in the battle log, e.g. "bites", "slashes". */
  verb: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // Developer mode only: never attacks, never dies (not in any area's list).
  dummy: { id: 'dummy', name: 'Training Dummy', sprite: 'enemy_dummy', hp: 1, atk: 0, armor: 0, verb: 'wobbles at' },
  slime: { id: 'slime', name: 'Moss Slime', sprite: 'enemy_slime', hp: 0.8, atk: 0.8, armor: 0.5, verb: 'splats' },
  rat: { id: 'rat', name: 'Cave Rat', sprite: 'enemy_rat', hp: 0.7, atk: 0.9, armor: 0.5, verb: 'bites' },
  bat: { id: 'bat', name: 'Gloom Bat', sprite: 'enemy_bat', hp: 0.65, atk: 1, armor: 0.3, verb: 'swoops at' },
  mushroom: { id: 'mushroom', name: 'Grumpshroom', sprite: 'enemy_mushroom', hp: 1, atk: 0.9, armor: 0.8, verb: 'headbutts' },
  spider: { id: 'spider', name: 'Web Spinner', sprite: 'enemy_spider', hp: 0.9, atk: 1.1, armor: 0.6, verb: 'bites' },
  goblin: { id: 'goblin', name: 'Goblin Sneak', sprite: 'enemy_goblin', hp: 1, atk: 1.1, armor: 1, verb: 'stabs' },
  wolf: { id: 'wolf', name: 'Cave Wolf', sprite: 'enemy_wolf', hp: 1.1, atk: 1.15, armor: 0.8, verb: 'bites' },
  skeleton: { id: 'skeleton', name: 'Rattlebones', sprite: 'enemy_skeleton', hp: 1.2, atk: 1.1, armor: 1.3, verb: 'slashes' },
  // Area 2: Whisperwood Forest
  boar: { id: 'boar', name: 'Tusk Boar', sprite: 'enemy_boar', hp: 1.1, atk: 1.1, armor: 0.9, verb: 'charges at' },
  pixie: { id: 'pixie', name: 'Prank Pixie', sprite: 'enemy_pixie', hp: 0.7, atk: 1.1, armor: 0.3, verb: 'zaps' },
  beetle: { id: 'beetle', name: 'Stag Beetle', sprite: 'enemy_beetle', hp: 1.0, atk: 1.0, armor: 1.4, verb: 'pinches' },
  sapling: { id: 'sapling', name: 'Grumpy Sapling', sprite: 'enemy_sapling', hp: 1.0, atk: 0.95, armor: 1.0, verb: 'whacks' },
  snapper: { id: 'snapper', name: 'Snap Plant', sprite: 'enemy_snapper', hp: 0.9, atk: 1.2, armor: 0.6, verb: 'chomps' },
  owlbear: { id: 'owlbear', name: 'Fluffy Owlbear', sprite: 'enemy_owlbear', hp: 1.25, atk: 1.15, armor: 1.0, verb: 'swipes at' },
  bandit: { id: 'bandit', name: 'Leaf Bandit', sprite: 'enemy_bandit', hp: 0.95, atk: 1.15, armor: 0.8, verb: 'shoots at' },
  mossgolem: { id: 'mossgolem', name: 'Moss Golem', sprite: 'enemy_mossgolem', hp: 1.3, atk: 1.0, armor: 1.5, verb: 'thumps' },
};

export interface FloorDef {
  name: string;
  levels: [number, number];
  enemies: string[];
  maxGroup: number;
  monsters: number;
}

export interface EnemyInstance {
  def: EnemyDef;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  armor: number;
  xp: number;
  gold: number;
  stunned: boolean;
  /** Rare spawn tier: 1 = Rare, 2 = Elite, 3 = Legendary (missing = normal). */
  rare?: RareTier;
}

export type RareTier = 1 | 2 | 3;

/**
 * Rare spawns can appear when a monster comes back after being beaten.
 * The rarer they are, the tougher: higher level, more health, harder hits
 * and more armor. They give more XP, gold and better loot.
 */
export const RARE_TIERS: Record<
  RareTier,
  { name: string; color: number; css: string; chance: number; levels: number; hp: number; atk: number; armor: number; xp: number; gold: number }
> = {
  1: { name: 'Rare', color: 0x3d8bff, css: '#6aa8ff', chance: 0.15, levels: 1, hp: 1.5, atk: 1.15, armor: 1.2, xp: 1.75, gold: 2.5 },
  2: { name: 'Elite', color: 0xb24dff, css: '#c98aff', chance: 0.1, levels: 2, hp: 2.1, atk: 1.35, armor: 1.4, xp: 2.5, gold: 4 },
  3: { name: 'Legendary', color: 0xff9a1f, css: '#ffb24a', chance: 0.05, levels: 3, hp: 2.8, atk: 1.6, armor: 1.6, xp: 4, gold: 6 },
};

/** Roll a rare tier for a respawn: 5% Legendary, 10% Elite, 15% Rare. */
export function rollRareTier(r = Math.random()): RareTier | undefined {
  // Work in whole percents so 5 + 10 is exactly 15.
  const pct = r * 100;
  let edge = 0;
  for (const t of [3, 2, 1] as RareTier[]) {
    edge += Math.round(RARE_TIERS[t].chance * 100);
    if (pct < edge) return t;
  }
  return undefined;
}

/** Turn a normal monster into a rare spawn of the given tier. */
export function makeRare(e: EnemyInstance, tier: RareTier): EnemyInstance {
  const t = RARE_TIERS[tier];
  const up = makeEnemy(e.def.id, Math.min(20, e.level + t.levels));
  const maxHp = Math.round(up.maxHp * t.hp);
  return {
    ...up,
    rare: tier,
    maxHp,
    hp: maxHp,
    atk: Math.round(up.atk * t.atk),
    armor: Math.round(up.armor * t.armor),
    xp: Math.round(up.xp * t.xp),
    gold: Math.round(up.gold * t.gold),
  };
}

/**
 * Roughly how hard a hero of this level hits with level-appropriate gear.
 * Enemy health is set from this so a same-level fight takes 2-3 right answers.
 */
export function expectedHeroHit(level: number): number {
  return 12.4 + level * 5.2;
}

/** Hits needed (with right answers) to beat a same-level enemy, before per-monster variety. */
export const HITS_TO_KILL = 2.4;

export function makeEnemy(id: string, level: number, groupSize = 1): EnemyInstance {
  const def = ENEMIES[id];
  // Groups are a bit squishier per monster so fights don't drag on.
  const groupScale = groupSize === 1 ? 1 : groupSize === 2 ? 0.7 : 0.55;
  const maxHp = Math.round(expectedHeroHit(level) * HITS_TO_KILL * def.hp * groupScale + level * 1.5 * def.armor * 0.4 * HITS_TO_KILL);
  return {
    def,
    level,
    maxHp,
    hp: maxHp,
    atk: Math.round((4 + level * 2.4) * def.atk),
    armor: Math.round(level * 1.5 * def.armor),
    xp: Math.round(12 + level * 6),
    gold: ri(1, 3) + level * 2,
    stunned: false,
  };
}

/** A random group for a floor, keeping groups smaller when the hero is low level. */
export function makeGroup(floor: FloorDef, heroLevel: number): EnemyInstance[] {
  let size = heroLevel <= 3 ? 1 : chance(0.6) ? 1 : 2;
  if (floor.maxGroup >= 3 && heroLevel >= 7 && chance(0.15)) size = 3;
  size = Math.min(size, floor.maxGroup);
  const group: EnemyInstance[] = [];
  for (let i = 0; i < size; i++) {
    group.push(makeEnemy(pick(floor.enemies), ri(floor.levels[0], floor.levels[1]), size));
  }
  return group;
}

/**
 * XP for beating a monster, adjusted by level difference: monsters below
 * your level give much less, so heroes move on to deeper floors.
 */
export function xpFor(e: EnemyInstance, heroLevel: number): number {
  const diff = e.level - heroLevel;
  const factor = diff >= 0 ? Math.min(1.3, 1 + diff * 0.1) : Math.max(0.1, 1 + diff * 0.25);
  return Math.max(1, Math.round(e.xp * factor));
}
