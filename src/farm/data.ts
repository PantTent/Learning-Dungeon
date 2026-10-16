// Learning Farm: crops, animals and upgrades.

export interface CropDef {
  id: string;
  name: string;
  /** Cost to plant one seed. */
  seedCost: number;
  /** Time to grow, in milliseconds (keeps growing while the app is closed). */
  growMs: number;
  /** Coins for one harvested crop (full price for a right answer). */
  price: number;
  sprite: string;
  item: string;
}

const S = 1000;

export const CROPS: CropDef[] = [
  { id: 'carrot', name: 'Carrot', seedCost: 2, growMs: 30 * S, price: 6, sprite: 'crop_carrot', item: 'item_carrot' },
  { id: 'strawberry', name: 'Strawberry', seedCost: 6, growMs: 60 * S, price: 15, sprite: 'crop_strawberry', item: 'item_strawberry' },
  { id: 'tomato', name: 'Tomato', seedCost: 10, growMs: 90 * S, price: 24, sprite: 'crop_tomato', item: 'item_tomato' },
  { id: 'corn', name: 'Corn', seedCost: 15, growMs: 120 * S, price: 36, sprite: 'crop_corn', item: 'item_corn' },
  { id: 'pumpkin', name: 'Pumpkin', seedCost: 25, growMs: 180 * S, price: 60, sprite: 'crop_pumpkin', item: 'item_pumpkin' },
];

export interface AnimalDef {
  id: string;
  name: string;
  cost: number;
  /** How long a fed animal stays happy before it gets hungry again. */
  hungryAfterMs: number;
  /** Coins earned per minute while happy (small passive income). */
  incomePerMin: number;
  sprite: string;
  /** Default names for new animals of this kind. */
  names: string[];
}

export const ANIMALS: AnimalDef[] = [
  { id: 'horse', name: 'Horse', cost: 120, hungryAfterMs: 240 * S, incomePerMin: 4, sprite: 'animal_horse', names: ['Daisy', 'Thunder', 'Biscuit', 'Maple', 'Star'] },
  { id: 'pig', name: 'Pig', cost: 60, hungryAfterMs: 180 * S, incomePerMin: 2, sprite: 'animal_pig', names: ['Peanut', 'Truffle', 'Wilbur', 'Rosie', 'Muddy'] },
  { id: 'chicken', name: 'Chicken', cost: 30, hungryAfterMs: 150 * S, incomePerMin: 1, sprite: 'animal_chicken', names: ['Nugget', 'Clucky', 'Pepper', 'Sunny', 'Feathers'] },
  { id: 'goat', name: 'Goat', cost: 90, hungryAfterMs: 210 * S, incomePerMin: 3, sprite: 'animal_goat', names: ['Billy', 'Pebbles', 'Clover', 'Gizmo', 'Socks'] },
];

/** Garden plots for each land size, and the price to reach that size. */
export const LAND_TIERS: { plots: number; cost: number }[] = [
  { plots: 4, cost: 0 },
  { plots: 6, cost: 80 },
  { plots: 9, cost: 200 },
  { plots: 12, cost: 450 },
];

/** Animal stalls for each pen size, and the price to reach that size. */
export const STALL_TIERS: { stalls: number; cost: number }[] = [
  { stalls: 1, cost: 0 },
  { stalls: 2, cost: 60 },
  { stalls: 3, cost: 150 },
  { stalls: 4, cost: 300 },
  { stalls: 6, cost: 600 },
];

/** Wrong answers in a row that still count as feeding (the animal is happy anyway). */
export const FEED_TRIES = 3;
export const START_COINS = 20;

export function crop(id: string): CropDef {
  return CROPS.find((c) => c.id === id) ?? CROPS[0];
}

export function animal(id: string): AnimalDef {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];
}
