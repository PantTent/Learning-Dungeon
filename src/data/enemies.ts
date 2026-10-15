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
  slime: { id: 'slime', name: 'Moss Slime', sprite: 'enemy_slime', hp: 0.8, atk: 0.8, armor: 0.5, verb: 'splats' },
  rat: { id: 'rat', name: 'Cave Rat', sprite: 'enemy_rat', hp: 0.7, atk: 0.9, armor: 0.5, verb: 'bites' },
  bat: { id: 'bat', name: 'Gloom Bat', sprite: 'enemy_bat', hp: 0.65, atk: 1, armor: 0.3, verb: 'swoops at' },
  mushroom: { id: 'mushroom', name: 'Grumpshroom', sprite: 'enemy_mushroom', hp: 1, atk: 0.9, armor: 0.8, verb: 'headbutts' },
  spider: { id: 'spider', name: 'Web Spinner', sprite: 'enemy_spider', hp: 0.9, atk: 1.1, armor: 0.6, verb: 'bites' },
  goblin: { id: 'goblin', name: 'Goblin Sneak', sprite: 'enemy_goblin', hp: 1, atk: 1.1, armor: 1, verb: 'stabs' },
  wolf: { id: 'wolf', name: 'Cave Wolf', sprite: 'enemy_wolf', hp: 1.1, atk: 1.15, armor: 0.8, verb: 'bites' },
  skeleton: { id: 'skeleton', name: 'Rattlebones', sprite: 'enemy_skeleton', hp: 1.2, atk: 1.1, armor: 1.3, verb: 'slashes' },
};

export const BOSS = {
  id: 'grukk',
  name: 'Grukk the Goblin King',
  sprite: 'boss_goblin_king',
  level: 10,
  intro: [
    'GRUKK: "Who dares enter my throne room?!"',
    'GRUKK: "Only the smartest heroes can beat Grukk!"',
    'Answer 4 of 5 questions right to defeat him!',
  ],
};

export interface FloorDef {
  name: string;
  levels: [number, number];
  enemies: string[];
  maxGroup: number;
  monsters: number;
}

/** Area 1: Mossfang Caverns. Floor index 0..2, then the boss lair. */
export const FLOORS: FloorDef[] = [
  { name: 'Mossfang Caverns - Floor 1', levels: [1, 3], enemies: ['slime', 'rat', 'bat', 'mushroom'], maxGroup: 2, monsters: 9 },
  { name: 'Mossfang Caverns - Floor 2', levels: [4, 6], enemies: ['mushroom', 'spider', 'goblin', 'bat', 'wolf'], maxGroup: 3, monsters: 10 },
  { name: 'Mossfang Caverns - Floor 3', levels: [7, 9], enemies: ['goblin', 'wolf', 'skeleton', 'spider'], maxGroup: 3, monsters: 11 },
];

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
