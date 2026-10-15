import { FLOORS, makeGroup, type EnemyInstance } from '../data/enemies';
import { generateFloor, generateLair, type DungeonMap, type Pt } from '../data/mapgen';
import { pick } from '../util/rng';

export interface WorldMonster {
  id: number;
  pos: Pt;
  group: EnemyInstance[];
}

/**
 * The live state of the current dungeon floor. Kept in memory between the
 * map and battle screens; a fresh floor is generated each time you enter it.
 */
export interface World {
  floor: number;
  map: DungeonMap;
  monsters: WorldMonster[];
  openedChests: Set<string>;
  player: Pt;
}

export const LAIR = FLOORS.length; // floor index of the boss lair

let nextId = 1;

export function enterFloor(floor: number, heroLevel: number): World {
  const map = floor === LAIR ? generateLair() : generateFloor(floor);
  const monsters: WorldMonster[] = [];
  if (floor < LAIR) {
    const def = FLOORS[floor];
    const spots = map.spawns.filter((s) => !map.chests.some((c) => c.x === s.x && c.y === s.y));
    for (let i = 0; i < def.monsters && spots.length; i++) {
      const idx = Math.floor(Math.random() * spots.length);
      const [pos] = spots.splice(idx, 1);
      monsters.push({ id: nextId++, pos, group: makeGroup(def, heroLevel) });
    }
  }
  return { floor, map, monsters, openedChests: new Set(), player: { ...map.start } };
}

export function respawnOne(w: World, heroLevel: number): void {
  if (w.floor >= LAIR || w.map.spawns.length === 0) return;
  const pos = pick(w.map.spawns);
  if (Math.abs(pos.x - w.player.x) + Math.abs(pos.y - w.player.y) < 8) return;
  w.monsters.push({ id: nextId++, pos: { ...pos }, group: makeGroup(FLOORS[w.floor], heroLevel) });
}

export const worldState: { world: World | null } = { world: null };
