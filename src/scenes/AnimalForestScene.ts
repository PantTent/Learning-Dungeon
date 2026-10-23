import { tr } from '../i18n';
import { FOREST, MOOSE } from '../animal/data';
import { buildForest } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const forestState = newLandState();

const FOREST_LAND: LandConfig = {
  key: 'AnimalForest',
  land: 'forest',
  map: buildForest(),
  state: forestState,
  wilds: FOREST,
  byLevel: { 7: ['squirrel', 'bat', 'skunk'], 8: ['deer', 'porcupine', 'boar'], 9: ['wolf', 'bearcub', 'boar'] },
  boss: MOOSE,
  bossLevel: 9,
  bossQuest: 'moose',
  exit: 'right',
  ground: 'forest',
  sign: 'prop_forestsign',
  hidden: { quest: 'mushrooms', list: 'mushrooms', icon: 'item_mushroom', dust: [0x6a4a2a, 0x8a6a3a, 0x7fe0d0] },
  strong: ['push'],
  spring: 0x58c8c0,
  tree: () => ({ sprite: 'prop_oak', scale: 3.2 }),
  fruitTree: 'prop_honeytree',
  fruit: 'honey',
  rock: 'prop_hollowlog',
  rockCracked: 'prop_hollowlog_open',
  solidRocks: true,
  stump: { sprite: 'prop_fairyring', scale: 3, acorns: 60, food: 'honey', n: 2 },
  decor: ['prop_glowshroom', 'prop_fern', 'prop_fern'],
  text: () => ({
    welcome: tr('The Enchanted Forest! Look inside the hollow logs, and rest at the fairy spring.'),
    home: tr('Village →'),
    noClimb: tr('The honey is way up high. A cat could climb up there!'),
    noFruit: tr('The bees are still making honey. Come back soon!'),
    climbed: tr('You climb up and gently take some honey!'),
    stump: tr('A secret fairy ring! 60 acorns and 2 pots of honey!'),
    rockTitle: tr('Roll the log!'),
    rockRight: tr('Answer: {answer}. The log rolls open!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(Your elephant strength rolls it anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The log wobbles! One more question.)'),
    rockGo: tr('Roll!'),
    crackedTitle: tr('The log is wobbling!'),
    crackedRight: tr('Answer: {answer}. The log rolls open!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! The log rolls open anyway!)'),
    foundHidden: tr('A glowing mushroom! Grandma Badger will love it.'),
    foundAcorns: tr('No mushroom here, but you found 8 acorns!'),
    bossRoar: tr('HRRUMPH! This is MY forest! Nobody passes!'),
    bossNotYet: tr('(This moose is too grumpy for now. Talk to the Old Stag by the fairy spring first.)'),
    springLabel: tr('Fairy spring: rest here'),
    springRest: tr('The fairy spring sparkles. All hearts back!'),
  }),
};

/** The Enchanted Forest: hollow logs, honey trees, a fairy spring and a grumpy moose. */
export class AnimalForestScene extends AnimalLandScene {
  constructor() {
    super(FOREST_LAND);
  }
}
