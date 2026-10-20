import { makeEnemy, makeGroup, makeRare, rollRareTier, type EnemyInstance } from '../data/enemies';
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
  /** When (Date.now() ms) beaten monsters come back. */
  respawns: number[];
}

/** Beaten monsters come back after this long. */
export const RESPAWN_MS = 2 * 60 * 1000;

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
  return { floor: place.index, map, monsters, openedChests: new Set(), player: { ...map.start }, respawns: [] };
}

/**
 * Bring one monster back on a random spawn spot away from the hero. Respawns
 * can be rare spawns (a single, tougher monster with better rewards).
 * Returns false if there was no good spot this time.
 */
export function respawnOne(w: World, heroLevel: number, tier = rollRareTier()): boolean {
  const def = placeOf(w.floor).floor;
  if (!def || w.map.spawns.length === 0) return false;
  const pos = pick(w.map.spawns);
  if (Math.abs(pos.x - w.player.x) + Math.abs(pos.y - w.player.y) < 8) return false;
  if (w.monsters.some((m) => m.pos.x === pos.x && m.pos.y === pos.y)) return false;
  const group = tier ? [makeRare(makeEnemy(pick(def.enemies), def.levels[1]), tier)] : makeGroup(def, heroLevel);
  w.monsters.push({ id: nextId++, pos: { ...pos }, group });
  return true;
}

export const worldState: { world: World | null } = { world: null };
