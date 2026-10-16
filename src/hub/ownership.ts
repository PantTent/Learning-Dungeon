// Which games this player can play: one free pick, plus games they unlock.
// Kept on the device for now; later this moves to the player's account
// (Google / Apple sign-in) so a reinstall can't switch the free pick.
import { GAMES } from './games';

export interface Ownership {
  /** The game picked for free (set once). */
  free?: string;
  /** Games unlocked with a purchase. */
  bought: string[];
  /** Developer code: every game unlocked. */
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
  // Players from before the game picker already have Learning Dungeon.
  const hadHeroes = !!s?.getItem(PROFILES_KEY) && s.getItem(PROFILES_KEY) !== '[]';
  const o: Ownership = hadHeroes ? { free: 'dungeon', bought: [] } : { bought: [] };
  if (hadHeroes) saveOwnership(o);
  return o;
}

export function saveOwnership(o: Ownership): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(o));
  } catch {
    /* storage blocked */
  }
}

export function owns(o: Ownership, id: string): boolean {
  return !!o.devAll || o.free === id || o.bought.includes(id);
}

/** Pick the one free game. Only works once. */
export function chooseFree(o: Ownership, id: string): boolean {
  if (o.free || !GAMES.some((g) => g.id === id && g.scene)) return false;
  o.free = id;
  saveOwnership(o);
  return true;
}

/** Record an unlocked game (called after a successful purchase). */
export function unlockGame(o: Ownership, id: string): void {
  if (!o.bought.includes(id)) o.bought.push(id);
  saveOwnership(o);
}
