import { makeGroup, type EnemyInstance } from '../data/enemies';
import { generateFloor, generateLair, type DungeonMap, type Pt } from '../data/mapgen';
import { placeOf } from '../data/areas';
import { pick } from '../util/rng';

export interface WorldMonster {
  id: number;
  pos: Pt;
  group: EnemyInstance[];
}

/**
 * The live state of the current place (a floor or a boss lair). Kept in
 * memory between the map and battle screens; a fresh map is generated each
 * time you enter it.
 */
export interface World {
  /** Global place index (see PLACES in areas.ts). */
  floor: number;
  map: DungeonMap;
  monsters: WorldMonster[];
  openedChests: Set<string>;
  player: Pt;
}

let nextId = 1;

export function enterFloor(index: number, heroLevel: number): World {
  const place = placeOf(index);
  const map = place.kind === 'lair' ? generateLair() : generateFloor(place.floorNo === 0);
  const monsters: WorldMonster[] = [];
  if (place.floor) {
    const def = place.floor;
    const spots = map.spawns.filter((s) => !map.chests.some((c) => c.x === s.x && c.y === s.y));
    for (let i = 0; i < def.monsters && spots.length; i++) {
      const idx = Math.floor(Math.random() * spots.length);
      const [pos] = spots.splice(idx, 1);
      monsters.push({ id: nextId++, pos, group: makeGroup(def, heroLevel) });
    }
  }
  return { floor: place.index, map, monsters, openedChests: new Set(), player: { ...map.start } };
}

export function respawnOne(w: World, heroLevel: number): void {
  const def = placeOf(w.floor).floor;
  if (!def || w.map.spawns.length === 0) return;
  const pos = pick(w.map.spawns);
  if (Math.abs(pos.x - w.player.x) + Math.abs(pos.y - w.player.y) < 8) return;
  w.monsters.push({ id: nextId++, pos: { ...pos }, group: makeGroup(def, heroLevel) });
}

export const worldState: { world: World | null } = { world: null };
