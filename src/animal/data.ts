// Animal Kingdom Quest: the animals you can be, the wild animals you calm,
// food, villagers and their quests. All text in English and French.

export interface Text {
  en: string;
  fr: string;
}
const t = (en: string, fr: string): Text => ({ en, fr });

export type SkillId = 'climb' | 'sniff' | 'squeeze' | 'sprint' | 'eyes' | 'push' | 'roar' | 'sleep';

export interface MoveDef {
  name: Text;
  /** How much a right answer calms the animal (times the hero's power). */
  power: number;
  /** Hero level needed. */
  unlock: number;
}

export interface AnimalDef {
  id: string;
  name: Text;
  sprite: string;
  /** Hearts at level 1. */
  hearts: number;
  skill: SkillId;
  skillName: Text;
  skillInfo: Text;
  /** A real fact, shown when you pick it. */
  fact: Text;
  moves: MoveDef[];
  color: number;
}

const mv = (en: string, fr: string, power: number, unlock: number): MoveDef => ({ name: t(en, fr), power, unlock });

export const ANIMALS: AnimalDef[] = [
  {
    id: 'cat', name: t('Cat', 'Chat'), sprite: 'pet_cat', hearts: 10, skill: 'climb', color: 0xff9a3a,
    skillName: t('Climb', 'Grimper'), skillInfo: t('Climbs fruit trees to pick apples. Lucky in battle: extra-big calming!', 'Grimpe aux arbres fruitiers pour cueillir des pommes. Chanceux au combat : gros câlins!'),
    fact: t('Cats sleep about 15 hours a day!', 'Les chats dorment environ 15 heures par jour!'),
    moves: [mv('Purr', 'Ronron', 1, 1), mv('Head Bump', 'Coup de tête doux', 1.5, 3), mv('Cozy Curl', 'Boule douillette', 2.2, 5)],
  },
  {
    id: 'dog', name: t('Dog', 'Chien'), sprite: 'pet_dog', hearts: 11, skill: 'sniff', color: 0xb8864a,
    skillName: t('Sniff', 'Flair'), skillInfo: t('A paw-print arrow sniffs out the nearest thing your quest needs. Gets a little heart back each turn.', 'Une flèche de pattes trouve la chose la plus proche pour ta quête. Récupère un peu de cœur à chaque tour.'),
    fact: t('A dog’s nose is about 10,000 times better at smelling than ours.', 'Le nez d’un chien sent environ 10 000 fois mieux que le nôtre.'),
    moves: [mv('Wag', 'Remue-queue', 1, 1), mv('Play Bow', 'Invitation à jouer', 1.5, 3), mv('Happy Zoomies', 'Course de joie', 2.2, 5)],
  },
  {
    id: 'mouse', name: t('Mouse', 'Souris'), sprite: 'pet_mouse', hearts: 9, skill: 'squeeze', color: 0xb0b0c0,
    skillName: t('Squeeze', 'Se faufiler'), skillInfo: t('Slips through little burrows to secret places. Small and quick: often dodges grumpy swipes.', 'Passe par les petits terriers vers des endroits secrets. Petite et rapide : évite souvent les coups.'),
    fact: t('Mice can squeeze through a hole the size of a pencil!', 'Les souris peuvent passer par un trou de la taille d’un crayon!'),
    moves: [mv('Squeak', 'Couic', 1, 1), mv('Whisker Tickle', 'Chatouille de moustaches', 1.5, 3), mv('Cheese Gift', 'Cadeau de fromage', 2.2, 5)],
  },
  {
    id: 'cheetah', name: t('Cheetah', 'Guépard'), sprite: 'pet_cheetah', hearts: 10, skill: 'sprint', color: 0xf0c040,
    skillName: t('Sprint', 'Sprint'), skillInfo: t('Runs much faster everywhere. Calms animals a bit more with every move.', 'Court beaucoup plus vite partout. Calme les animaux un peu plus à chaque coup.'),
    fact: t('Cheetahs are the fastest land animals: about 70 mph (110 km/h).', 'Le guépard est l’animal terrestre le plus rapide : environ 110 km/h.'),
    moves: [mv('Friendly Dash', 'Course amicale', 1.1, 1), mv('Spotty Wink', 'Clin d’œil tacheté', 1.6, 3), mv('Super Sprint', 'Super sprint', 2.3, 5)],
  },
  {
    id: 'owl', name: t('Owl', 'Hibou'), sprite: 'pet_owl', hearts: 9, skill: 'eyes', color: 0xa07a4a,
    skillName: t('Night Eyes', 'Yeux de nuit'), skillInfo: t('Sees hidden golden acorns no one else can. Wise: one wrong answer per battle counts as right.', 'Voit les glands dorés cachés. Sage : une mauvaise réponse par combat compte comme bonne.'),
    fact: t('Owls can turn their heads almost all the way around: 270 degrees!', 'Les hiboux peuvent tourner la tête presque complètement : 270 degrés!'),
    moves: [mv('Hoot', 'Hou-hou', 1, 1), mv('Wise Words', 'Sages paroles', 1.5, 3), mv('Moonlight Song', 'Chant de lune', 2.2, 5)],
  },
  {
    id: 'elephant', name: t('Elephant', 'Éléphant'), sprite: 'pet_elephant', hearts: 14, skill: 'push', color: 0x9a9aaa,
    skillName: t('Push', 'Pousser'), skillInfo: t('Strong enough to push rocks away with just one question. The most hearts of all!', 'Assez fort pour pousser les rochers avec une seule question. Le plus de cœurs!'),
    fact: t('Elephants are the biggest land animals, and they never forget a friend.', 'Les éléphants sont les plus gros animaux terrestres et n’oublient jamais un ami.'),
    moves: [mv('Trunk Hug', 'Câlin de trompe', 1, 1), mv('Gentle Splash', 'Douce éclaboussure', 1.5, 3), mv('Big Hug', 'Gros câlin', 2.2, 5)],
  },
  {
    id: 'lion', name: t('Lion', 'Lion'), sprite: 'pet_lion', hearts: 12, skill: 'roar', color: 0xe0a840,
    skillName: t('Roar', 'Rugir'), skillInfo: t('A friendly roar starts every battle with the animal already a little calmer.', 'Un rugissement amical : chaque combat commence avec l’animal déjà un peu plus calme.'),
    fact: t('A lion’s roar can be heard 5 miles (8 km) away!', 'Le rugissement d’un lion s’entend à 8 km!'),
    moves: [mv('Mane Shake', 'Crinière secouée', 1, 1), mv('Royal Smile', 'Sourire royal', 1.5, 3), mv('Mighty Roar', 'Puissant rugissement', 2.2, 5)],
  },
  {
    id: 'snake', name: t('Snake', 'Serpent'), sprite: 'pet_snake', hearts: 10, skill: 'sleep', color: 0x5ac85a,
    skillName: t('Lullaby', 'Berceuse'), skillInfo: t('A soft hiss can make grumpy animals fall asleep and miss their turn.', 'Un doux sifflement peut endormir les animaux grognons : ils passent leur tour.'),
    fact: t('Snakes smell with their tongues!', 'Les serpents sentent avec leur langue!'),
    moves: [mv('Soft Hiss', 'Doux sifflement', 1, 1), mv('Swirly Dance', 'Danse en spirale', 1.5, 3), mv('Dreamy Lullaby', 'Berceuse de rêve', 2.2, 5)],
  },
];

export function animal(id: string): AnimalDef {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];
}

/** Foods: they heal hearts, and some are needed for quests. */
export interface FoodDef {
  id: string;
  name: Text;
  icon: string;
  heal: number;
}

export const FOODS: FoodDef[] = [
  { id: 'berries', name: t('Berries', 'Petits fruits'), icon: 'food_berries', heal: 3 },
  { id: 'apple', name: t('Apple', 'Pomme'), icon: 'food_apple', heal: 4 },
  { id: 'banana', name: t('Banana', 'Banane'), icon: 'food_banana', heal: 5 },
  { id: 'pie', name: t('Apple Pie', 'Tarte aux pommes'), icon: 'food_pie', heal: 99 },
];

export function food(id: string): FoodDef {
  return FOODS.find((f) => f.id === id) ?? FOODS[0];
}

/** Wild animals of the Jungle. Grump = how much calming they need. */
export interface WildDef {
  id: string;
  name: Text;
  sprite: string;
  grump: number;
  /** Hearts they knock off when grumpy. */
  swipe: number;
  /** What they might drop when calm: [food id, chance]. */
  drop?: [string, number];
  xp: number;
  fact: Text;
}

export const JUNGLE: WildDef[] = [
  { id: 'frog', name: t('Tree Frog', 'Rainette'), sprite: 'wild_frog', grump: 3, swipe: 1, xp: 6, fact: t('Some tree frogs can change color!', 'Certaines rainettes peuvent changer de couleur!') },
  { id: 'parrot', name: t('Parrot', 'Perroquet'), sprite: 'wild_parrot', grump: 3, swipe: 1, drop: ['berries', 0.5], xp: 7, fact: t('Parrots can copy the sounds they hear, even words!', 'Les perroquets peuvent imiter les sons, même des mots!') },
  { id: 'monkey', name: t('Monkey', 'Singe'), sprite: 'wild_monkey', grump: 4, swipe: 1, drop: ['banana', 0.5], xp: 9, fact: t('Monkeys use their tails like an extra hand.', 'Certains singes se servent de leur queue comme d’une main de plus.') },
  { id: 'toucan', name: t('Toucan', 'Toucan'), sprite: 'wild_toucan', grump: 4, swipe: 1, drop: ['apple', 0.45], xp: 9, fact: t('A toucan’s big beak is light, like a sponge inside.', 'Le gros bec du toucan est léger, comme une éponge à l’intérieur.') },
  { id: 'sloth', name: t('Sloth', 'Paresseux'), sprite: 'wild_sloth', grump: 5, swipe: 1, drop: ['apple', 0.6], xp: 11, fact: t('Sloths move so slowly that tiny plants grow in their fur!', 'Les paresseux bougent si lentement que de petites plantes poussent dans leur fourrure!') },
  { id: 'tapir', name: t('Tapir', 'Tapir'), sprite: 'wild_tapir', grump: 5, swipe: 2, drop: ['berries', 0.4], xp: 12, fact: t('A tapir’s nose is a short trunk it uses to grab leaves.', 'Le nez du tapir est une petite trompe pour attraper les feuilles.') },
  { id: 'croc', name: t('Crocodile', 'Crocodile'), sprite: 'wild_croc', grump: 6, swipe: 2, xp: 14, fact: t('Crocodiles have been around since the time of the dinosaurs.', 'Les crocodiles existent depuis l’époque des dinosaures.') },
  { id: 'tiger', name: t('Tiger Cub', 'Bébé tigre'), sprite: 'wild_tiger', grump: 6, swipe: 2, drop: ['apple', 0.35], xp: 15, fact: t('No two tigers have the same stripes.', 'Aucun tigre n’a les mêmes rayures qu’un autre.') },
];

export const GORILLA: WildDef = {
  id: 'gorilla', name: t('Grumpy Gorilla', 'Gorille grognon'), sprite: 'boss_gorilla', grump: 14, swipe: 2, xp: 60,
  fact: t('Gorillas are gentle giants: they eat mostly leaves and fruit.', 'Les gorilles sont de doux géants : ils mangent surtout des feuilles et des fruits.'),
};

export function wild(id: string): WildDef {
  return id === 'gorilla' ? GORILLA : JUNGLE.find((w) => w.id === id) ?? JUNGLE[0];
}

/** The village helpers and their quests. */
export interface QuestDef {
  id: 'pie' | 'puppies' | 'gorilla';
  giver: string;
  giverName: Text;
  sprite: string;
  title: Text;
  ask: Text;
  thanks: Text;
  /** How many of the thing are needed. */
  need: number;
  acorns: number;
  xp: number;
  /**
   * A boss quest is only offered when the hero is ready: the other quests of
   * that land are done, or the hero has reached the suggested level. A player
   * who feels ready can still ask for it early.
   */
  boss?: { level: number; after: QuestDef['id'][] };
}

export const QUESTS: QuestDef[] = [
  {
    id: 'pie', giver: 'badger', giverName: t('Grandma Badger', 'Grand-maman Blaireau'), sprite: 'npc_badger',
    title: t('Apples for a pie', 'Des pommes pour une tarte'),
    ask: t('Oh dear, I want to bake an apple pie, but I have no apples! Could you bring me 5 apples from the Jungle? Some jungle animals drop them when they calm down.', 'Oh là là, je veux faire une tarte aux pommes, mais je n’ai plus de pommes! Peux-tu m’en rapporter 5 de la jungle? Certains animaux en laissent tomber quand ils se calment.'),
    thanks: t('Wonderful! Here, take two slices of fresh apple pie. They make you feel all better!', 'Merveilleux! Tiens, voici deux pointes de tarte aux pommes. Elles te remettent en pleine forme!'),
    need: 5, acorns: 30, xp: 30,
  },
  {
    id: 'puppies', giver: 'dogmom', giverName: t('Mama Dog', 'Maman Toutou'), sprite: 'npc_dogmom',
    title: t('The lost puppies', 'Les chiots perdus'),
    ask: t('My 5 puppies ran into the Jungle to play, and now they are stuck behind big rocks! Please find them and bring them home.', 'Mes 5 chiots sont partis jouer dans la jungle et sont coincés derrière de gros rochers! Trouve-les et ramène-les, s’il te plaît.'),
    thanks: t('My puppies! Thank you, thank you! You are a true hero.', 'Mes chiots! Merci, merci! Tu es un vrai héros.'),
    need: 5, acorns: 50, xp: 50,
  },
  {
    id: 'gorilla', giver: 'beaver', giverName: t('Mayor Beaver', 'Maire Castor'), sprite: 'npc_mayor_beaver',
    title: t('The grumpy gorilla', 'Le gorille grognon'),
    ask: t('A big grumpy gorilla is blocking the jungle path. Everyone is scared! Can you calm him down? He lives at the far end of the Jungle.', 'Un gros gorille grognon bloque le sentier de la jungle. Tout le monde a peur! Peux-tu le calmer? Il vit tout au bout de la jungle.'),
    thanks: t('You did it! The gorilla is smiling again. The village is so proud of you!', 'Bravo! Le gorille sourit de nouveau. Le village est si fier de toi!'),
    need: 1, acorns: 80, xp: 80,
    boss: { level: 4, after: ['pie', 'puppies'] },
  },
];

export function quest(id: QuestDef['id']): QuestDef {
  return QUESTS.find((q) => q.id === id)!;
}

/** The four lands around the village. Only the Jungle is open in this version. */
export interface LandDef {
  id: string;
  name: Text;
  dir: 'right' | 'down' | 'left' | 'up';
  open: boolean;
}

export const LANDS: LandDef[] = [
  { id: 'jungle', name: t('Jungle', 'Jungle'), dir: 'right', open: true },
  { id: 'desert', name: t('Desert', 'Désert'), dir: 'down', open: false },
  { id: 'forest', name: t('Enchanted Forest', 'Forêt enchantée'), dir: 'left', open: false },
  { id: 'mountains', name: t('Snowy Mountains', 'Montagnes enneigées'), dir: 'up', open: false },
];
