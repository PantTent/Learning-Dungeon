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
  { id: 'game3', name: 'Coming soon', blurb: 'Another adventure is being built.', icon: 'tile_chest', color: 0xb26bff },
];

/** Price shown for unlocking an extra game ("$1.99", or "1,99 $" in French). */
export function unlockPrice(lang: 'en' | 'fr'): string {
  return lang === 'fr' ? '1,99\u00a0$' : '$1.99';
}
