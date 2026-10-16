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
  { id: 'game2', name: 'Coming soon', blurb: 'A brand new game is on the way!', icon: 'tile_chest', color: 0x7fd3ff },
  { id: 'game3', name: 'Coming soon', blurb: 'Another adventure is being built.', icon: 'tile_chest', color: 0xb26bff },
];

/** Price shown for unlocking an extra game. */
export const UNLOCK_PRICE = '$1.99';
