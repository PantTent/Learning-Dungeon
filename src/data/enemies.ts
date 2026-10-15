import { pick, ri } from '../util/rng';

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

export function makeEnemy(id: string, level: number): EnemyInstance {
  const def = ENEMIES[id];
  const maxHp = Math.round((16 + level * 9) * def.hp);
  return {
    def,
    level,
    maxHp,
    hp: maxHp,
    atk: Math.round((4 + level * 2.4) * def.atk),
    armor: Math.round(level * 1.5 * def.armor),
    xp: Math.round(8 + level * 4.5),
    gold: ri(1, 3) + level * 2,
    stunned: false,
  };
}

/** A random group for a floor, keeping groups smaller when the hero is low level. */
export function makeGroup(floor: FloorDef, heroLevel: number): EnemyInstance[] {
  const size = ri(1, Math.min(floor.maxGroup, heroLevel <= 2 ? 1 : heroLevel <= 4 ? 2 : 3));
  const group: EnemyInstance[] = [];
  for (let i = 0; i < size; i++) {
    group.push(makeEnemy(pick(floor.enemies), ri(floor.levels[0], floor.levels[1])));
  }
  return group;
}
