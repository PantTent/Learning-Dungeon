// The game world: areas, each with a few floors and a boss lair.
// Every floor and lair is a "place" with a global index (used for saving
// progress and the campfire travel menu).
import type { FloorDef } from './enemies';

export interface Theme {
  floor: string;
  floorAlt: string;
  wall: string;
  wallTop: string;
  exit: string;
  bossDoor: string;
  spring: string;
  /** Small decorations scattered on the floor. */
  deco: string[];
  /** Cave torches on walls, or fireflies and sunlight outdoors. */
  outdoor: boolean;
  bg: number;
  music: string;
}

export interface BossDef {
  id: string;
  name: string;
  shortName: string;
  sprite: string;
  level: number;
  /** Hero level needed to open the boss door. */
  minLevel: number;
  lairName: string;
  lairSub: string;
  verb: string;
  intro: string[];
  /** Used in Legendary/Mythic item names, e.g. "Grukk's Golden Helm". */
  lootName: string;
}

export interface AreaDef {
  id: string;
  name: string;
  theme: Theme;
  floors: FloorDef[];
  boss: BossDef;
}

export const AREAS: AreaDef[] = [
  {
    id: 'caverns',
    name: 'Mossfang Caverns',
    theme: {
      floor: 'tile_floor',
      floorAlt: 'tile_floor_moss',
      wall: 'tile_wall',
      wallTop: 'tile_wall_top',
      exit: 'tile_stairs_down',
      bossDoor: 'tile_door',
      spring: 'tile_fountain',
      deco: [],
      outdoor: false,
      bg: 0x0d0a14,
      music: 'dungeon',
    },
    floors: [
      { name: 'Mossfang Caverns - Floor 1', levels: [1, 3], enemies: ['slime', 'rat', 'bat', 'mushroom'], maxGroup: 2, monsters: 9 },
      { name: 'Mossfang Caverns - Floor 2', levels: [4, 6], enemies: ['mushroom', 'spider', 'goblin', 'bat', 'wolf'], maxGroup: 3, monsters: 10 },
      { name: 'Mossfang Caverns - Floor 3', levels: [7, 9], enemies: ['goblin', 'wolf', 'skeleton', 'spider'], maxGroup: 3, monsters: 11 },
    ],
    boss: {
      id: 'grukk',
      name: 'Grukk the Goblin King',
      shortName: 'Grukk',
      sprite: 'boss_goblin_king',
      level: 10,
      minLevel: 7,
      lairName: "Grukk's Throne Room",
      lairSub: 'The Goblin King awaits...',
      verb: 'smashes',
      intro: [
        'GRUKK: "Who dares enter my throne room?!"',
        'GRUKK: "Only the smartest heroes can beat Grukk!"',
        'Answer 4 of 5 questions right to defeat him!',
      ],
      lootName: "Grukk's",
    },
  },
  {
    id: 'forest',
    name: 'Whisperwood Forest',
    theme: {
      floor: 'tile_grass',
      floorAlt: 'tile_grass_flowers',
      wall: 'tile_tree',
      wallTop: 'tile_tree_top',
      exit: 'tile_forest_exit',
      bossDoor: 'tile_forest_gate',
      spring: 'tile_spring',
      deco: ['deco_bush', 'deco_mushrooms', 'deco_log', 'deco_flowers'],
      outdoor: true,
      bg: 0x1c3a1c,
      music: 'forest',
    },
    floors: [
      { name: 'Whisperwood Forest - The Edge', levels: [11, 13], enemies: ['boar', 'pixie', 'snapper', 'sapling'], maxGroup: 2, monsters: 10 },
      { name: 'Whisperwood Forest - Deep Woods', levels: [14, 16], enemies: ['sapling', 'beetle', 'bandit', 'pixie', 'boar'], maxGroup: 3, monsters: 11 },
      { name: 'Whisperwood Forest - Ancient Grove', levels: [17, 19], enemies: ['owlbear', 'mossgolem', 'bandit', 'beetle'], maxGroup: 3, monsters: 12 },
    ],
    boss: {
      id: 'gnarlroot',
      name: 'Old Gnarlroot the Treant',
      shortName: 'Gnarlroot',
      sprite: 'boss_treant',
      level: 20,
      minLevel: 17,
      lairName: "Gnarlroot's Grove",
      lairSub: 'The ancient tree is waking up...',
      verb: 'whomps',
      intro: [
        'GNARLROOT: "Hmmm... who is stomping on my roots?"',
        'GNARLROOT: "I have stood here for a thousand years. Show me how much YOU know!"',
        'Answer 4 of 5 questions right to defeat him!',
      ],
      lootName: "Gnarlroot's",
    },
  },
];

export interface Place {
  index: number;
  area: number;
  kind: 'floor' | 'lair';
  /** Floor number inside its area (0-based), for floors. */
  floorNo: number;
  floor?: FloorDef;
  name: string;
}

export const PLACES: Place[] = AREAS.flatMap((a, ai) => [
  ...a.floors.map((f, fi) => ({ area: ai, kind: 'floor' as const, floorNo: fi, floor: f, name: f.name })),
  { area: ai, kind: 'lair' as const, floorNo: a.floors.length, name: a.boss.lairName },
]).map((p, index) => ({ ...p, index }));

export function placeOf(index: number): Place {
  return PLACES[Math.max(0, Math.min(PLACES.length - 1, index))];
}

export function areaOf(index: number): AreaDef {
  return AREAS[placeOf(index).area];
}

/** First floor of an area (where its camp is). */
export function campPlace(area: number): number {
  return PLACES.findIndex((p) => p.area === area && p.kind === 'floor');
}

export function lairPlace(area: number): number {
  return PLACES.findIndex((p) => p.area === area && p.kind === 'lair');
}
