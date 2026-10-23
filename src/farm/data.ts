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
  /** What it gives while happy (an item id), and how often. */
  product?: string;
  productMs?: number;
}

export const ANIMALS: AnimalDef[] = [
  { id: 'horse', name: 'Horse', cost: 120, hungryAfterMs: 240 * S, incomePerMin: 4, sprite: 'animal_horse', names: ['Daisy', 'Thunder', 'Biscuit', 'Maple', 'Star'], product: 'horseshoe', productMs: 240 * S },
  { id: 'pig', name: 'Pig', cost: 60, hungryAfterMs: 180 * S, incomePerMin: 2, sprite: 'animal_pig', names: ['Peanut', 'Truffle', 'Wilbur', 'Rosie', 'Muddy'], product: 'truffle', productMs: 180 * S },
  { id: 'chicken', name: 'Chicken', cost: 30, hungryAfterMs: 150 * S, incomePerMin: 1, sprite: 'animal_chicken', names: ['Nugget', 'Clucky', 'Pepper', 'Sunny', 'Feathers'], product: 'egg', productMs: 60 * S },
  { id: 'goat', name: 'Goat', cost: 90, hungryAfterMs: 210 * S, incomePerMin: 3, sprite: 'animal_goat', names: ['Billy', 'Pebbles', 'Clover', 'Gizmo', 'Socks'], product: 'milk', productMs: 120 * S },
  { id: 'cow', name: 'Cow', cost: 150, hungryAfterMs: 240 * S, incomePerMin: 4, sprite: 'animal_cow', names: ['Bessie', 'Buttercup', 'Moo-Moo', 'Patches', 'Dottie'], product: 'milk', productMs: 90 * S },
  { id: 'sheep', name: 'Sheep', cost: 100, hungryAfterMs: 210 * S, incomePerMin: 3, sprite: 'animal_sheep', names: ['Fluffy', 'Cotton', 'Woolly', 'Snowball', 'Lamby'], product: 'wool', productMs: 150 * S },
];

/** Animals keep at most this many products waiting to be picked up. */
export const MAX_PRODUCTS = 3;

/**
 * Things that are not grown in the garden: animal products, orchard fruit and
 * kitchen dishes. They go in the basket and sell at the market like crops.
 */
const good = (id: string, name: string, price: number): CropDef => ({ id, name, seedCost: 0, growMs: 0, price, sprite: `item_${id}`, item: `item_${id}` });

export const PRODUCTS: CropDef[] = [
  good('egg', 'Egg', 8),
  good('milk', 'Milk', 14),
  good('wool', 'Wool', 20),
  good('truffle', 'Truffle', 26),
  good('horseshoe', 'Lucky Horseshoe', 22),
];

export const FRUITS: CropDef[] = [
  good('apple', 'Apples', 10),
  good('blueberry', 'Blueberries', 12),
  good('syrup', 'Maple Syrup', 30),
  good('cranberry', 'Cranberries', 12),
  good('honey', 'Honey', 28),
];

export const DISHES: CropDef[] = [
  good('muffin', 'Carrot Muffin', 32),
  good('jam', 'Strawberry Jam', 60),
  good('soup', 'Tomato Soup', 75),
  good('cornbread', 'Corn Bread', 115),
  good('cheese', 'Cheese', 60),
  good('pumpkinpie', 'Pumpkin Pie', 130),
  good('applepie', 'Apple Pie', 60),
  good('pancakes', 'Blueberry Pancakes', 120),
  good('cranberrysauce', 'Cranberry Sauce', 85),
  good('honeycake', 'Honey Cake', 120),
];

export interface RecipeDef {
  /** The dish (an item id in DISHES). */
  id: string;
  needs: Record<string, number>;
}

/** The Farm Kitchen: a dish is worth more than what goes in it. */
export const RECIPES: RecipeDef[] = [
  { id: 'muffin', needs: { carrot: 2, egg: 1 } },
  { id: 'jam', needs: { strawberry: 3 } },
  { id: 'soup', needs: { tomato: 2, milk: 1 } },
  { id: 'cheese', needs: { milk: 3 } },
  { id: 'cornbread', needs: { corn: 2, egg: 1, milk: 1 } },
  { id: 'pumpkinpie', needs: { pumpkin: 1, egg: 2, milk: 1 } },
  { id: 'applepie', needs: { apple: 3, egg: 1 } },
  { id: 'pancakes', needs: { blueberry: 2, egg: 1, milk: 1, syrup: 1 } },
  { id: 'cranberrysauce', needs: { cranberry: 3, honey: 1 } },
  { id: 'honeycake', needs: { honey: 2, egg: 2, milk: 1 } },
];

/** Trees, bushes and hives in the orchard: plant once, pick again and again. */
export interface OrchardDef {
  id: string;
  name: string;
  cost: number;
  /** Time until it can be picked again. */
  everyMs: number;
  /** What it gives (an item id in FRUITS), and how many for a right answer. */
  fruit: string;
  count: number;
  sprite: string;
  ready: string;
  fact: string;
}

export const ORCHARD: OrchardDef[] = [
  { id: 'apple', name: 'Apple Tree', cost: 120, everyMs: 150 * S, fruit: 'apple', count: 4, sprite: 'orchard_apple', ready: 'orchard_apple_ready', fact: 'Apple trees grow in Massachusetts and in the Annapolis Valley of Nova Scotia.' },
  { id: 'blueberry', name: 'Blueberry Bush', cost: 180, everyMs: 180 * S, fruit: 'blueberry', count: 4, sprite: 'orchard_blueberry', ready: 'orchard_blueberry_ready', fact: 'Nova Scotia grows lots of wild blueberries. They are small and very sweet.' },
  { id: 'maple', name: 'Maple Tree', cost: 260, everyMs: 240 * S, fruit: 'syrup', count: 2, sprite: 'orchard_maple', ready: 'orchard_maple_ready', fact: 'It takes about 40 buckets of maple sap to make 1 bucket of syrup!' },
  { id: 'cranberry', name: 'Cranberry Bog', cost: 300, everyMs: 240 * S, fruit: 'cranberry', count: 5, sprite: 'orchard_cranberry', ready: 'orchard_cranberry_ready', fact: 'Cranberries float! Farmers in Massachusetts flood the bog with water to pick them.' },
  { id: 'beehive', name: 'Beehive', cost: 280, everyMs: 210 * S, fruit: 'honey', count: 2, sprite: 'orchard_beehive', ready: 'orchard_beehive_ready', fact: 'Bees visit flowers to make honey, and they help apples and blueberries grow.' },
];

/** Places to plant in the orchard (the free farm can use the first two). */
export const ORCHARD_SLOTS = 6;

export function orchardDef(id: string): OrchardDef {
  return ORCHARD.find((o) => o.id === id) ?? ORCHARD[0];
}

export function recipe(id: string): RecipeDef | undefined {
  return RECIPES.find((r) => r.id === id);
}

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
  return CROPS.find((c) => c.id === id) ?? MAGIC_CROPS.find((c) => c.id === id) ?? GOODS.find((c) => c.id === id) ?? CROPS[0];
}

export function animal(id: string): AnimalDef {
  return ANIMALS.find((a) => a.id === id) ?? MAGIC_ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];
}

// ------------------------------------------------------------- part 2

/** Farmer gear: bought once, helps forever. */
export interface GearDef {
  id: 'can' | 'hat' | 'brush' | 'basket' | 'bell';
  name: string;
  desc: string;
  cost: number;
  icon: string;
}

export const GEAR: GearDef[] = [
  { id: 'can', name: 'Watering Can', desc: 'Crops grow 30% faster.', cost: 120, icon: 'gear_can' },
  { id: 'hat', name: 'Lucky Straw Hat', desc: 'Crops sell for 25% more.', cost: 150, icon: 'gear_hat' },
  { id: 'brush', name: 'Comfy Brush', desc: 'Animals stay happy 50% longer.', cost: 140, icon: 'gear_brush' },
  { id: 'basket', name: 'Big Basket', desc: '1 in 4 harvests gives 2 crops.', cost: 200, icon: 'gear_basket' },
  { id: 'bell', name: 'Golden Bell', desc: 'Happy animals earn 50% more.', cost: 250, icon: 'gear_bell' },
];

export const GEAR_EFFECT = { growSpeed: 1 / 0.7, sellBonus: 1.25, happyLonger: 1.5, doubleChance: 0.25, incomeBonus: 1.5 };

/** Hats for the animals (just for fun). */
export interface HatDef {
  id: string;
  name: string;
  cost: number;
  sprite: string;
  /** Only found in trail ride chests (not sold in the shop). */
  trail?: boolean;
}

export const HATS: HatDef[] = [
  { id: 'straw', name: 'Straw Hat', cost: 30, sprite: 'hat_straw' },
  { id: 'bow', name: 'Pink Bow', cost: 30, sprite: 'hat_bow' },
  { id: 'cap', name: 'Baseball Cap', cost: 40, sprite: 'hat_cap' },
  { id: 'flowers', name: 'Flower Crown', cost: 40, sprite: 'hat_flowers' },
  { id: 'party', name: 'Party Hat', cost: 50, sprite: 'hat_party' },
  { id: 'crown', name: 'Royal Crown', cost: 100, sprite: 'hat_crown' },
  { id: 'cowboy', name: 'Cowboy Hat', cost: 0, sprite: 'hat_cowboy', trail: true },
];

/** Neighbours who post orders on the board. */
export const NEIGHBOURS: { id: string; name: string; sprite: string }[] = [
  { id: 'moose', name: 'Mrs. Moose', sprite: 'npc_moose' },
  { id: 'beaver', name: 'Mr. Beaver', sprite: 'npc_beaver' },
  { id: 'owl', name: 'Granny Owl', sprite: 'npc_owl' },
  { id: 'raccoon', name: 'Rocky Raccoon', sprite: 'npc_raccoon' },
];

/** A rare shiny harvest worth much more. */
export const GOLDEN_CHANCE = 0.08;
export const GOLDEN_MULT = 5;
/** Orders pay this much more than the market. */
export const ORDER_BONUS = 1.6;
export const MAX_ORDERS = 3;
export const ORDER_EVERY_MS = 45 * S;

export function gear(id: string): GearDef | undefined {
  return GEAR.find((g) => g.id === id);
}

export function hat(id: string): HatDef | undefined {
  return HATS.find((h) => h.id === id);
}

// ------------------------------------------------------- the magic world

export type WorldId = 'home' | 'magic';

export const MAGIC_CROPS: CropDef[] = [
  { id: 'rainbowcarrot', name: 'Rainbow Carrot', seedCost: 30, growMs: 90 * S, price: 75, sprite: 'crop_rainbowcarrot', item: 'item_rainbowcarrot' },
  { id: 'starfruit', name: 'Star Fruit', seedCost: 45, growMs: 120 * S, price: 110, sprite: 'crop_starfruit', item: 'item_starfruit' },
  { id: 'moonmelon', name: 'Moon Melon', seedCost: 70, growMs: 180 * S, price: 170, sprite: 'crop_moonmelon', item: 'item_moonmelon' },
  { id: 'crystalberry', name: 'Crystal Berry', seedCost: 100, growMs: 240 * S, price: 250, sprite: 'crop_crystalberry', item: 'item_crystalberry' },
  { id: 'dragonpepper', name: 'Dragon Pepper', seedCost: 150, growMs: 300 * S, price: 380, sprite: 'crop_dragonpepper', item: 'item_dragonpepper' },
];

export const MAGIC_ANIMALS: AnimalDef[] = [
  { id: 'fairy', name: 'Fairy', cost: 300, hungryAfterMs: 240 * S, incomePerMin: 6, sprite: 'animal_fairy', names: ['Twinkle', 'Bluebell', 'Pip', 'Glimmer', 'Dewdrop'] },
  { id: 'unicorn', name: 'Unicorn', cost: 600, hungryAfterMs: 300 * S, incomePerMin: 12, sprite: 'animal_unicorn', names: ['Sparkle', 'Rainbow', 'Stardust', 'Moonbeam', 'Glitter'] },
  { id: 'griffin', name: 'Griffin', cost: 800, hungryAfterMs: 330 * S, incomePerMin: 15, sprite: 'animal_griffin', names: ['Talon', 'Goldwing', 'Sky', 'Breeze', 'Comet'] },
  { id: 'dragon', name: 'Baby Dragon', cost: 1000, hungryAfterMs: 360 * S, incomePerMin: 18, sprite: 'animal_dragon', names: ['Ember', 'Puff', 'Scorch', 'Ziggy', 'Blaze'] },
];

export const MAGIC_NEIGHBOURS: { id: string; name: string; sprite: string }[] = [
  { id: 'gnome', name: 'Gus the Gnome', sprite: 'npc_gnome' },
  { id: 'mermaid', name: 'Marina the Mermaid', sprite: 'npc_mermaid' },
  { id: 'wizard', name: 'Wally the Wizard', sprite: 'npc_wizard' },
  { id: 'pixie', name: 'Pip the Pixie', sprite: 'npc_pixie' },
];

export const MAGIC_LAND_TIERS: { plots: number; cost: number }[] = [
  { plots: 4, cost: 0 },
  { plots: 6, cost: 600 },
  { plots: 9, cost: 1500 },
  { plots: 12, cost: 3000 },
];

export const MAGIC_STALL_TIERS: { stalls: number; cost: number }[] = [
  { stalls: 1, cost: 0 },
  { stalls: 2, cost: 500 },
  { stalls: 3, cost: 1200 },
  { stalls: 4, cost: 2500 },
  { stalls: 6, cost: 5000 },
];

/** Building the portal to the magic world (full game). */
export const PORTAL_COST = 1000;

export interface WorldDef {
  crops: CropDef[];
  animals: AnimalDef[];
  neighbours: { id: string; name: string; sprite: string }[];
  land: { plots: number; cost: number }[];
  stalls: { stalls: number; cost: number }[];
  /** Textures: grass, soil, path, stall floor, fences, buildings, growth stages. */
  look: {
    grass: string; soil: string; path: string; floor: string; fence: string; fenceV: string;
    house: string; barn: string; market: string; tree: string; board: string; stages: [string, string, string];
  };
  music: string;
}

export const WORLDS: Record<WorldId, WorldDef> = {
  home: {
    crops: CROPS,
    animals: ANIMALS,
    neighbours: NEIGHBOURS,
    land: LAND_TIERS,
    stalls: STALL_TIERS,
    look: {
      grass: 'tile_grass', soil: 'farm_soil', path: 'farm_path', floor: 'farm_hay_floor', fence: 'farm_fence', fenceV: 'farm_fence_v',
      house: 'farm_house', barn: 'farm_barn', market: 'farm_market', tree: 'farm_tree', board: 'farm_board',
      stages: ['crop_seeds', 'crop_sprout', 'crop_growing'],
    },
    music: 'farm',
  },
  magic: {
    crops: MAGIC_CROPS,
    animals: MAGIC_ANIMALS,
    neighbours: MAGIC_NEIGHBOURS,
    land: MAGIC_LAND_TIERS,
    stalls: MAGIC_STALL_TIERS,
    look: {
      grass: 'tile_magic_grass', soil: 'magic_soil', path: 'magic_path', floor: 'magic_floor', fence: 'magic_fence', fenceV: 'magic_fence_v',
      house: 'magic_house', barn: 'magic_barn', market: 'magic_market', tree: 'magic_tree', board: 'magic_board',
      stages: ['crop_seeds', 'magic_sprout', 'magic_sprout'],
    },
    music: 'magic',
  },
};

export function neighbour(id: string) {
  return [...NEIGHBOURS, ...MAGIC_NEIGHBOURS].find((n) => n.id === id) ?? NEIGHBOURS[0];
}

/** Everything that can be in the basket besides crops. */
export const GOODS: CropDef[] = [...PRODUCTS, ...FRUITS, ...DISHES];

// ------------------------------------------------- the journal and the fair

export interface QuestDef {
  id: string;
  /** Neighbour who asks (NEIGHBOURS id). */
  who: string;
  /** What they say, and the goal. */
  ask: string;
  goal: string;
  reward: number;
  /** What finishing it opens up. */
  unlocks?: 'kitchen' | 'orchard' | 'fair';
}

export interface ChapterDef {
  title: string;
  quests: QuestDef[];
}

export const CHAPTERS: ChapterDef[] = [
  {
    title: 'Chapter 1: A Growing Farm',
    quests: [
      { id: 'harvest5', who: 'moose', ask: 'Welcome, neighbour! Let us see your green thumb.', goal: 'Harvest 5 crops.', reward: 20 },
      { id: 'sell3', who: 'raccoon', ask: 'The market is busy today. Go sell something!', goal: 'Sell at the market 3 times.', reward: 30 },
      { id: 'orders2', who: 'beaver', ask: 'Neighbours help neighbours. Fill some orders!', goal: 'Fill 2 orders from the board.', reward: 40 },
      { id: 'chicken', who: 'owl', ask: 'Every farm needs a chicken. Hoo-hoo!', goal: 'Have a chicken on your farm.', reward: 40 },
      { id: 'eggs3', who: 'moose', ask: 'Happy chickens lay eggs. Bring me some, and I will build you a kitchen!', goal: 'Collect 3 eggs.', reward: 50, unlocks: 'kitchen' },
    ],
  },
  {
    title: 'Chapter 2: Kitchen Time',
    quests: [
      { id: 'muffin', who: 'moose', ask: 'Your new kitchen is ready. Let us bake!', goal: 'Bake a Carrot Muffin.', reward: 50 },
      { id: 'milk3', who: 'beaver', ask: 'Cows and goats give milk. Milk makes soup, cheese and pies!', goal: 'Collect 3 bottles of milk.', reward: 70 },
      { id: 'cook3', who: 'raccoon', ask: 'Yum! Can you cook three different dishes?', goal: 'Cook 3 different dishes.', reward: 80 },
      { id: 'animals4', who: 'owl', ask: 'A busy farm has lots of friends. Hoo!', goal: 'Have 4 animals on your farm.', reward: 100, unlocks: 'orchard' },
    ],
  },
  {
    title: 'Chapter 3: The Orchard',
    quests: [
      { id: 'tree', who: 'beaver', ask: 'I cleared a path to the orchard. Plant a tree there!', goal: 'Plant something in the Orchard.', reward: 80 },
      { id: 'pick10', who: 'beaver', ask: 'Fruit is ready? Pick, pick, pick!', goal: 'Pick 10 fruits in the Orchard.', reward: 100 },
      { id: 'applepie', who: 'moose', ask: 'Nothing beats a warm apple pie.', goal: 'Bake an Apple Pie.', reward: 120 },
      { id: 'orders10', who: 'raccoon', ask: 'Everyone in town wants your food!', goal: 'Fill 10 orders in all.', reward: 150 },
      { id: 'golden', who: 'owl', ask: 'The County Fair is coming! Grow something special.', goal: 'Grow a golden crop.', reward: 150, unlocks: 'fair' },
    ],
  },
  {
    title: 'Chapter 4: The County Fair',
    quests: [
      { id: 'blue_harvest', who: 'owl', ask: 'Show the judges your biggest vegetables!', goal: 'Win a blue ribbon for Best Harvest.', reward: 200 },
      { id: 'blue_animal', who: 'owl', ask: 'A happy animal in a nice hat wins hearts.', goal: 'Win a blue ribbon for Best Animal.', reward: 200 },
      { id: 'blue_baking', who: 'owl', ask: 'The judges love pie. Hoo-hoo!', goal: 'Win a blue ribbon for Best Baking.', reward: 200 },
    ],
  },
];

export const QUESTS: QuestDef[] = CHAPTERS.flatMap((c) => c.quests);

export interface ContestDef {
  id: 'harvest' | 'animal' | 'baking';
  name: string;
  /** What to bring. */
  need: string;
  icon: string;
}

/** County Fair contests. Answer 3 questions; 2 right wins a blue ribbon. */
export const CONTESTS: ContestDef[] = [
  { id: 'harvest', name: 'Best Harvest', need: 'Bring 3 pumpkins.', icon: 'item_pumpkin' },
  { id: 'animal', name: 'Best Animal', need: 'A happy animal wearing a hat.', icon: 'hat_straw' },
  { id: 'baking', name: 'Best Baking', need: 'Bring a pie (pumpkin or apple).', icon: 'item_applepie' },
];
export const CONTEST_QUESTIONS = 3;
export const CONTEST_TO_WIN = 2;
