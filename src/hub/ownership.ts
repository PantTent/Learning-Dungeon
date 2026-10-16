// Which games this player has the full version of. Every game can be played
// for free (see FREE_LIMITS); buying a game, or the bundle, unlocks the rest.
// Kept on the device for now; later this moves to the player's account
// (Google / Apple sign-in) so purchases follow them.
import { ALL_GAMES } from './games';

export interface Ownership {
  /** Older versions gave one free game; it counts as the full game. */
  free?: string;
  /** Unlocked games (game ids, or ALL_GAMES). */
  bought: string[];
  /** Developer code: everything unlocked. */
  devAll?: boolean;
}

const KEY = 'learning-arcade.games';
const PROFILES_KEY = 'learning-dungeon.profiles.v1';

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadOwnership(): Ownership {
  const s = storage();
  try {
    const raw = s?.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Ownership>;
      return { free: o.free, bought: o.bought ?? [], devAll: o.devAll };
    }
  } catch {
    /* fall through */
  }
  // First check on this device. Players from before the game picker (they
  // already have heroes) keep the full Learning Dungeon. Saving right away
  // means heroes made later don't count.
  const heroes = s?.getItem(PROFILES_KEY);
  const o: Ownership = heroes && heroes !== '[]' ? { free: 'dungeon', bought: [] } : { bought: [] };
  saveOwnership(o);
  return o;
}

export function saveOwnership(o: Ownership): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(o));
  } catch {
    /* storage blocked */
  }
}

export function hasFullGame(o: Ownership, id: string): boolean {
  return !!o.devAll || o.free === id || o.bought.includes(id) || o.bought.includes(ALL_GAMES);
}

/** Shortcut for game code: does this device have the full version of a game? */
export function fullGame(id: string): boolean {
  return hasFullGame(loadOwnership(), id);
}

/** Record an unlock (called after a successful purchase). */
export function unlockGame(o: Ownership, id: string): void {
  if (!o.bought.includes(id)) o.bought.push(id);
  saveOwnership(o);
}
