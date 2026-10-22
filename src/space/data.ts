// Learning Space: the planets, minerals, ships and base buildings.
// Facts are written for two age groups (grades 1-2 and grades 3-5), in
// English and French. Temperatures and distances are NASA averages.

export interface Text {
  en: string;
  fr: string;
}

export type PlanetKind = 'rocky' | 'giant' | 'ice' | 'dwarf';

export interface PlanetDef {
  id: string;
  name: Text;
  kind: PlanetKind;
  /** Average temperature, in degrees Celsius (Fahrenheit is worked out). */
  tempC: number;
  /** Average distance from the Sun, in millions of km and of miles. */
  distKm: number;
  distMi: number;
  /** Known moons. */
  moons: number;
  /** Colors used to draw it: [main, second, third]. */
  colors: [number, number, number];
  /** Map dot size (relative). */
  size: number;
  /** Facts for grades 1-2 and for grades 3-5. */
  young: Text[];
  older: Text[];
  /** Can a base be built here yet (the gas giants and Pluto come later). */
  open: boolean;
}

const t = (en: string, fr: string): Text => ({ en, fr });

export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: t('Mercury', 'Mercure'),
    kind: 'rocky',
    tempC: 167,
    distKm: 58,
    distMi: 36,
    moons: 0,
    colors: [0x9a948c, 0x6e6862, 0xc4bdb2],
    size: 0.6,
    open: true,
    young: [
      t('Mercury is the closest planet to the Sun.', 'Mercure est la planète la plus proche du Soleil.'),
      t('Mercury is the smallest planet.', 'Mercure est la plus petite planète.'),
      t('A year on Mercury is only 88 Earth days.', 'Une année sur Mercure dure seulement 88 jours terrestres.'),
    ],
    older: [
      t('Mercury has almost no air, so its days are very hot and its nights are freezing (about -180 °C / -290 °F).', 'Mercure n’a presque pas d’air : ses journées sont très chaudes et ses nuits glaciales (environ -180 °C).'),
      t('Mercury is covered in craters, a lot like our Moon.', 'Mercure est couverte de cratères, un peu comme notre Lune.'),
      t('One day on Mercury, from sunrise to sunrise, lasts about 176 Earth days: longer than its year!', 'Une journée sur Mercure, d’un lever de Soleil au suivant, dure environ 176 jours terrestres : plus longtemps que son année!'),
    ],
  },
  {
    id: 'venus',
    name: t('Venus', 'Vénus'),
    kind: 'rocky',
    tempC: 464,
    distKm: 108,
    distMi: 67,
    moons: 0,
    colors: [0xe8c27a, 0xc89650, 0xf4e0a8],
    size: 0.95,
    open: true,
    young: [
      t('Venus is the hottest planet, even hotter than Mercury.', 'Vénus est la planète la plus chaude, encore plus que Mercure.'),
      t('Venus is covered in thick yellow clouds.', 'Vénus est couverte d’épais nuages jaunes.'),
      t('Venus is the brightest planet in our night sky.', 'Vénus est la planète la plus brillante dans notre ciel la nuit.'),
    ],
    older: [
      t('The air on Venus is mostly carbon dioxide. It traps heat like a thick blanket: the greenhouse effect.', 'L’air de Vénus est surtout du dioxyde de carbone. Il garde la chaleur comme une épaisse couverture : c’est l’effet de serre.'),
      t('Venus spins backwards, so on Venus the Sun rises in the west.', 'Vénus tourne à l’envers : sur Vénus, le Soleil se lève à l’ouest.'),
      t('Venus takes 243 Earth days to spin once, but only 225 days to go around the Sun.', 'Vénus prend 243 jours terrestres pour faire un tour sur elle-même, mais seulement 225 jours pour faire le tour du Soleil.'),
    ],
  },
  {
    id: 'earth',
    name: t('Earth', 'Terre'),
    kind: 'rocky',
    tempC: 15,
    distKm: 150,
    distMi: 93,
    moons: 1,
    colors: [0x2f6fd0, 0x3fa64a, 0xf2f6ff],
    size: 1,
    open: true,
    young: [
      t('Earth is the only planet we know that has life.', 'La Terre est la seule planète connue où il y a de la vie.'),
      t('Most of Earth is covered by water.', 'La plus grande partie de la Terre est couverte d’eau.'),
      t('Earth has one moon: the Moon!', 'La Terre a un seul satellite : la Lune!'),
    ],
    older: [
      t('Earth’s air is mostly nitrogen and oxygen. We breathe the oxygen.', 'L’air de la Terre est surtout de l’azote et de l’oxygène. Nous respirons l’oxygène.'),
      t('Earth spins once every 24 hours and goes around the Sun once every 365 days.', 'La Terre fait un tour sur elle-même en 24 heures et le tour du Soleil en 365 jours.'),
      t('Earth is tilted, and that tilt gives us the seasons.', 'La Terre est penchée, et c’est ce qui nous donne les saisons.'),
    ],
  },
  {
    id: 'mars',
    name: t('Mars', 'Mars'),
    kind: 'rocky',
    tempC: -65,
    distKm: 228,
    distMi: 142,
    moons: 2,
    colors: [0xc8582a, 0x8a3a1c, 0xe8a070],
    size: 0.7,
    open: true,
    young: [
      t('Mars is called the Red Planet.', 'Mars est surnommée la planète rouge.'),
      t('Mars has two small moons, Phobos and Deimos.', 'Mars a deux petites lunes : Phobos et Déimos.'),
      t('Robots called rovers drive around on Mars.', 'Des robots appelés astromobiles roulent sur Mars.'),
    ],
    older: [
      t('Mars is red because its dust has rusty iron in it (iron oxide).', 'Mars est rouge parce que sa poussière contient du fer rouillé (de l’oxyde de fer).'),
      t('Olympus Mons on Mars is the tallest volcano in the solar system.', 'Olympus Mons, sur Mars, est le plus haut volcan du système solaire.'),
      t('A year on Mars lasts about 687 Earth days.', 'Une année sur Mars dure environ 687 jours terrestres.'),
    ],
  },
  {
    id: 'jupiter',
    name: t('Jupiter', 'Jupiter'),
    kind: 'giant',
    tempC: -110,
    distKm: 778,
    distMi: 484,
    moons: 95,
    colors: [0xd8b088, 0xa86a40, 0xf0e0c8],
    size: 2.2,
    open: false,
    young: [
      t('Jupiter is the biggest planet.', 'Jupiter est la plus grosse planète.'),
      t('Jupiter has a giant storm called the Great Red Spot.', 'Jupiter a une tempête géante appelée la Grande Tache rouge.'),
      t('Jupiter has lots and lots of moons.', 'Jupiter a beaucoup, beaucoup de lunes.'),
    ],
    older: [
      t('Jupiter is a gas giant: it has no solid ground to stand on.', 'Jupiter est une géante gazeuse : il n’y a pas de sol pour se tenir debout.'),
      t('More than 1,300 Earths could fit inside Jupiter.', 'Plus de 1 300 Terres pourraient entrer dans Jupiter.'),
      t('Ganymede, one of Jupiter’s moons, is the biggest moon in the solar system.', 'Ganymède, une lune de Jupiter, est la plus grosse lune du système solaire.'),
    ],
  },
  {
    id: 'saturn',
    name: t('Saturn', 'Saturne'),
    kind: 'giant',
    tempC: -140,
    distKm: 1434,
    distMi: 891,
    moons: 274,
    colors: [0xe8d098, 0xb89860, 0xf8ecc8],
    size: 1.9,
    open: false,
    young: [
      t('Saturn has beautiful rings.', 'Saturne a de magnifiques anneaux.'),
      t('Saturn’s rings are made of ice and rock.', 'Les anneaux de Saturne sont faits de glace et de roche.'),
      t('Saturn is the second biggest planet.', 'Saturne est la deuxième plus grosse planète.'),
    ],
    older: [
      t('Saturn is so light for its size that it could float in a giant bathtub of water.', 'Saturne est si légère pour sa taille qu’elle pourrait flotter dans une baignoire d’eau géante.'),
      t('Titan, Saturn’s biggest moon, has thick air and lakes of liquid methane.', 'Titan, la plus grosse lune de Saturne, a une atmosphère épaisse et des lacs de méthane liquide.'),
      t('A year on Saturn lasts about 29 Earth years.', 'Une année sur Saturne dure environ 29 années terrestres.'),
    ],
  },
  {
    id: 'uranus',
    name: t('Uranus', 'Uranus'),
    kind: 'ice',
    tempC: -195,
    distKm: 2871,
    distMi: 1784,
    moons: 28,
    colors: [0x8ad8e0, 0x5ab0c0, 0xc8f0f4],
    size: 1.4,
    open: false,
    young: [
      t('Uranus is a blue-green ice giant.', 'Uranus est une géante de glace bleu-vert.'),
      t('Uranus spins on its side.', 'Uranus tourne couchée sur le côté.'),
      t('Uranus is very, very cold.', 'Il fait très, très froid sur Uranus.'),
    ],
    older: [
      t('Uranus gets its blue-green color from methane gas in its air.', 'Uranus doit sa couleur bleu-vert au méthane dans son atmosphère.'),
      t('Because it spins on its side, each pole gets about 42 years of sunlight, then 42 years of darkness.', 'Comme elle tourne sur le côté, chaque pôle a environ 42 ans de soleil, puis 42 ans de noirceur.'),
      t('A year on Uranus lasts about 84 Earth years.', 'Une année sur Uranus dure environ 84 années terrestres.'),
    ],
  },
  {
    id: 'neptune',
    name: t('Neptune', 'Neptune'),
    kind: 'ice',
    tempC: -200,
    distKm: 4495,
    distMi: 2793,
    moons: 16,
    colors: [0x3a5ad8, 0x2a3aa0, 0x8aa8ff],
    size: 1.35,
    open: false,
    young: [
      t('Neptune is the farthest planet from the Sun.', 'Neptune est la planète la plus éloignée du Soleil.'),
      t('Neptune is a deep blue color.', 'Neptune est d’un bleu foncé.'),
      t('Neptune has the fastest winds in the solar system.', 'Neptune a les vents les plus rapides du système solaire.'),
    ],
    older: [
      t('Winds on Neptune can blow faster than 2,000 km/h (1,200 mph).', 'Sur Neptune, les vents peuvent souffler à plus de 2 000 km/h.'),
      t('Neptune was found using math before anyone saw it in a telescope, in 1846.', 'Neptune a été trouvée grâce aux mathématiques avant d’être vue au télescope, en 1846.'),
      t('A year on Neptune lasts about 165 Earth years.', 'Une année sur Neptune dure environ 165 années terrestres.'),
    ],
  },
  {
    id: 'pluto',
    name: t('Pluto', 'Pluton'),
    kind: 'dwarf',
    tempC: -225,
    distKm: 5906,
    distMi: 3670,
    moons: 5,
    colors: [0xd8c0a0, 0x9a7a60, 0xf4ece0],
    size: 0.45,
    open: false,
    young: [
      t('Pluto is a dwarf planet.', 'Pluton est une planète naine.'),
      t('Pluto has a big heart-shaped patch of ice.', 'Pluton a une grande tache de glace en forme de cœur.'),
      t('Pluto is smaller than our Moon.', 'Pluton est plus petite que notre Lune.'),
    ],
    older: [
      t('In 2006, scientists decided to call Pluto a dwarf planet.', 'En 2006, les scientifiques ont décidé que Pluton serait une planète naine.'),
      t('The New Horizons spacecraft flew past Pluto in 2015 and took the first close-up pictures.', 'La sonde New Horizons est passée près de Pluton en 2015 et a pris les premières photos de près.'),
      t('A year on Pluto lasts about 248 Earth years.', 'Une année sur Pluton dure environ 248 années terrestres.'),
    ],
  },
];

export function planet(id: string): PlanetDef {
  return PLANETS.find((p) => p.id === id) ?? PLANETS[2];
}

/** Degrees Fahrenheit from Celsius, rounded. */
export const toF = (c: number) => Math.round((c * 9) / 5 + 32);

/** The four planets you can start on, each with its own ship and skill. */
export interface StartDef {
  planet: string;
  ship: Text;
  /** Sprite of the ship. */
  sprite: string;
  skill: Text;
  skillInfo: Text;
}

export const STARTS: StartDef[] = [
  {
    planet: 'mercury',
    ship: t('Sunrunner', 'Coureur solaire'),
    sprite: 'ship_mercury',
    skill: t('Solar Power', 'Énergie solaire'),
    skillInfo: t('Closest to the Sun: your fuel plants make 50% more.', 'Tout près du Soleil : tes usines de carburant produisent 50 % de plus.'),
  },
  {
    planet: 'venus',
    ship: t('Cloudpiercer', 'Perce-nuages'),
    sprite: 'ship_venus',
    skill: t('Heat Shield', 'Bouclier thermique'),
    skillInfo: t('Built for the hottest planet: your shields are 50% stronger.', 'Fait pour la planète la plus chaude : tes boucliers sont 50 % plus forts.'),
  },
  {
    planet: 'earth',
    ship: t('Pioneer', 'Pionnier'),
    sprite: 'ship_earth',
    skill: t('Home Team', 'Équipe de la maison'),
    skillInfo: t('Lots of help from home: mining gives 25% more minerals.', 'Beaucoup d’aide de la maison : tu récoltes 25 % plus de minéraux.'),
  },
  {
    planet: 'mars',
    ship: t('Red Rover', 'Rôdeur rouge'),
    sprite: 'ship_mars',
    skill: t('Iron Hunters', 'Chasseurs de fer'),
    skillInfo: t('Mars is red from rusty iron: iron asteroids give double iron.', 'Mars est rouge à cause du fer rouillé : les astéroïdes de fer donnent le double de fer.'),
  },
];

export function startOf(planetId: string): StartDef {
  return STARTS.find((s) => s.planet === planetId) ?? STARTS[2];
}

/** Minerals found in asteroids. */
export interface MineralDef {
  id: string;
  symbol: string;
  name: Text;
  /** Where the symbol comes from. */
  why: Text;
  /** What it is used for. */
  use: Text;
  /** How common it is in asteroids. */
  weight: number;
  color: number;
}

export const MINERALS: MineralDef[] = [
  {
    id: 'fe',
    symbol: 'Fe',
    name: t('Iron', 'Fer'),
    why: t('Fe comes from ferrum, the Latin word for iron.', 'Fe vient de ferrum, le mot latin pour fer.'),
    use: t('Iron is strong. It is used to build ship frames.', 'Le fer est solide. On s’en sert pour construire la structure des vaisseaux.'),
    weight: 30,
    color: 0xb8582a,
  },
  {
    id: 'ni',
    symbol: 'Ni',
    name: t('Nickel', 'Nickel'),
    why: t('Ni is short for nickel.', 'Ni est l’abréviation de nickel.'),
    use: t('Nickel mixed with iron makes stainless steel, which does not rust.', 'Le nickel mélangé au fer donne de l’acier inoxydable, qui ne rouille pas.'),
    weight: 22,
    color: 0xa8c4a0,
  },
  {
    id: 'cu',
    symbol: 'Cu',
    name: t('Copper', 'Cuivre'),
    why: t('Cu comes from cuprum, the Latin name for copper.', 'Cu vient de cuprum, le nom latin du cuivre.'),
    use: t('Copper carries electricity through wires.', 'Le cuivre fait passer l’électricité dans les fils.'),
    weight: 18,
    color: 0xe0844a,
  },
  {
    id: 'al',
    symbol: 'Al',
    name: t('Aluminum', 'Aluminium'),
    why: t('Al is short for aluminum.', 'Al est l’abréviation d’aluminium.'),
    use: t('Aluminum is light and strong, great for rockets and airplanes.', 'L’aluminium est léger et solide, parfait pour les fusées et les avions.'),
    weight: 16,
    color: 0xd8e0ec,
  },
  {
    id: 'ag',
    symbol: 'Ag',
    name: t('Silver', 'Argent'),
    why: t('Ag comes from argentum, the Latin word for silver.', 'Ag vient de argentum, le mot latin pour argent.'),
    use: t('Silver carries electricity better than any other metal.', 'L’argent conduit l’électricité mieux que tous les autres métaux.'),
    weight: 9,
    color: 0xf4f6ff,
  },
  {
    id: 'au',
    symbol: 'Au',
    name: t('Gold', 'Or'),
    why: t('Au comes from aurum, the Latin word for gold.', 'Au vient de aurum, le mot latin pour or.'),
    use: t('Gold never rusts. Spacecraft use thin gold foil to block heat.', 'L’or ne rouille jamais. Les vaisseaux utilisent de minces feuilles d’or pour bloquer la chaleur.'),
    weight: 5,
    color: 0xffd24a,
  },
];

export const MINERAL_IDS = MINERALS.map((m) => m.id);

export function mineral(id: string): MineralDef {
  return MINERALS.find((m) => m.id === id) ?? MINERALS[0];
}

/** Ship parts. Each goes from level 1 to MAX_PART. */
export interface PartDef {
  id: 'engine' | 'cargo' | 'laser' | 'shield' | 'tank';
  name: Text;
  info: Text;
  /** Minerals per level (times the new level), e.g. { fe: 4 } = 4 x level iron. */
  cost: Record<string, number>;
}

export const MAX_PART = 10;

export const PARTS: PartDef[] = [
  { id: 'engine', name: t('Engine', 'Moteur'), info: t('Fly faster. Needed to reach far planets.', 'Vole plus vite. Nécessaire pour atteindre les planètes lointaines.'), cost: { fe: 4, ni: 2 } },
  { id: 'tank', name: t('Fuel tank', 'Réservoir'), info: t('Holds fuel for the trip to the next planet.', 'Contient le carburant pour aller à la prochaine planète.'), cost: { fe: 3, cu: 2 } },
  { id: 'cargo', name: t('Cargo hold', 'Soute'), info: t('Carry more minerals before you land.', 'Transporte plus de minéraux avant d’atterrir.'), cost: { fe: 3, al: 3 } },
  { id: 'laser', name: t('Mining laser', 'Laser de minage'), info: t('Get more minerals from each asteroid.', 'Récolte plus de minéraux sur chaque astéroïde.'), cost: { cu: 3, ag: 1 } },
  { id: 'shield', name: t('Shields', 'Boucliers'), info: t('Take more hits from aliens.', 'Encaisse plus de coups des extraterrestres.'), cost: { al: 3, ni: 2 } },
];

/** Base buildings. */
export interface BuildingDef {
  id: 'lox' | 'ch4' | 'admin' | 'pad' | 'launch';
  name: Text;
  info: Text;
  sprite: string;
}

export const BUILDINGS: BuildingDef[] = [
  { id: 'admin', name: t('Command Center', 'Centre de commande'), info: t('Upgrade your base and see your planet.', 'Améliore ta base et découvre ta planète.'), sprite: 'base_admin' },
  { id: 'lox', name: t('Oxygen Plant', 'Usine d’oxygène'), info: t('Makes liquid oxygen (LOX), written O2: two oxygen atoms stuck together.', 'Fabrique de l’oxygène liquide (LOX), écrit O2 : deux atomes d’oxygène collés ensemble.'), sprite: 'base_lox' },
  { id: 'ch4', name: t('Methane Plant', 'Usine de méthane'), info: t('Makes methane, written CH4: one carbon atom and four hydrogen atoms.', 'Fabrique du méthane, écrit CH4 : un atome de carbone et quatre atomes d’hydrogène.'), sprite: 'base_methane' },
  { id: 'pad', name: t('Ship Upgrade Pad', 'Atelier du vaisseau'), info: t('Use minerals to make your ship better.', 'Utilise des minéraux pour améliorer ton vaisseau.'), sprite: 'base_pad' },
  { id: 'launch', name: t('Launch Pad', 'Rampe de lancement'), info: t('Fly to space, or travel to another planet.', 'Envole-toi dans l’espace ou voyage vers une autre planète.'), sprite: 'base_launch' },
];
