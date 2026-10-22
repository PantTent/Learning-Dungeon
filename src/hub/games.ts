// The games in the collection. Each game is a separate part of the app that
// starts at its own scene; games without a scene are "coming soon".
export interface GameInfo {
  id: string;
  name: string;
  blurb: string;
  /** Sprite shown on the game's card. */
  icon: string;
  color: number;
  /** Scene that starts the game (undefined = not built yet). */
  scene?: string;
}

export const GAMES: GameInfo[] = [
  {
    id: 'dungeon',
    name: 'Learning Dungeon',
    blurb: 'Answer questions to battle monsters, beat bosses and find loot!',
    icon: 'hero_mage',
    color: 0xffd24a,
    scene: 'Title',
  },
  {
    id: 'farm',
    name: 'Learning Farm',
    blurb: 'Grow veggies, care for animals and answer questions to build your farm!',
    icon: 'animal_horse',
    color: 0x7ccb4c,
    scene: 'FarmSetup',
  },
  {
    id: 'space',
    name: 'Learning Space',
    blurb: 'Build a space base, mine asteroids and fly from planet to planet!',
    icon: 'ship_earth',
    color: 0x7fd3ff,
    scene: 'SpaceSetup',
  },
  {
    id: 'animals',
    name: 'Animal Kingdom Quest',
    blurb: 'Be an animal, help the village and calm grumpy jungle animals!',
    icon: 'pet_cat',
    color: 0xff9a5a,
    scene: 'AnimalSetup',
  },
];

/**
 * Every game is free to try (all grades and topics). The full game unlocks
 * the rest: the Dungeon's later areas, the Farm's bigger land and the magic world.
 */
export const FREE_LIMITS = {
  /** Dungeon areas playable for free (Mossfang Caverns, incl. Grukk). */
  dungeonAreas: 1,
  /** Farm land / stall upgrades allowed for free (6 plots, 2 stalls). */
  farmLandTier: 1,
  farmStallTier: 1,
  /** Space worlds playable for free (your starting planet). */
  spaceWorlds: 1,
};

/** Unlock id for the "everything" bundle. */
export const ALL_GAMES = 'all';

const PRICES = { game: 3.99, all: 7.99 };

/** "$3.99" / "3,99 $" for one game, or the everything bundle. */
export function unlockPrice(lang: 'en' | 'fr', what: 'game' | 'all' = 'game'): string {
  const n = PRICES[what].toFixed(2);
  return lang === 'fr' ? `${n.replace('.', ',')}\u00a0$` : `$${n}`;
}
