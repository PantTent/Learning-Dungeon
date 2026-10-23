import { tr } from '../i18n';
import { DESERT, TORTOISE } from '../animal/data';
import { buildDesert } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const desertState = newLandState();

const DESERT_LAND: LandConfig = {
  key: 'AnimalDesert',
  land: 'desert',
  map: buildDesert(),
  state: desertState,
  wilds: DESERT,
  byLevel: { 4: ['gecko', 'jackrabbit', 'meerkat'], 5: ['fennec', 'armadillo', 'vulture'], 6: ['camel', 'scorpion', 'armadillo'] },
  boss: TORTOISE,
  bossLevel: 7,
  bossQuest: 'tortoise',
  exit: 'top',
  tree: (i) => (i % 3 === 2 ? { sprite: 'prop_desertrock', scale: 3 } : { sprite: 'prop_cactus', scale: 3 }),
  fruitTree: 'prop_palm',
  fruit: 'date',
  rock: 'prop_sandmound',
  rockCracked: 'prop_dug',
  solidRocks: false,
  stump: { sprite: 'prop_tent', scale: 2.6, acorns: 40, food: 'cactusfruit', n: 3 },
  decor: ['prop_tumbleweed'],
  text: () => ({
    welcome: tr('The Desert! It is hot here. Rest at the oasis, and dig in the sand mounds.'),
    home: tr('↑ Village'),
    noClimb: tr('The dates are way up high. A cat could climb up there!'),
    noFruit: tr('No ripe dates yet. Come back soon!'),
    climbed: tr('You climb the palm and pick some dates!'),
    stump: tr('A secret tent! 40 acorns and 3 cactus fruits!'),
    rockTitle: tr('Dig in the sand!'),
    rockRight: tr('Answer: {answer}. You dig it up!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(You are a great digger: you dig it up anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The sand is deep! One more question.)'),
    rockGo: tr('Dig!'),
    crackedTitle: tr('Keep digging!'),
    crackedRight: tr('Answer: {answer}. You reach the bottom!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! You dig it up anyway!)'),
    foundHidden: tr('A dinosaur fossil! Professor Mole will love it.'),
    foundAcorns: tr('No fossil here, but you found 8 acorns!'),
    bossRoar: tr('HMPF! This is MY well! Go away, little one!'),
    bossNotYet: tr('(This tortoise is too grumpy for now. Talk to Auntie Camel at the oasis first.)'),
  }),
};

/** The Desert: hot sand, an oasis, fossils to dig and a grumpy old tortoise. */
export class AnimalDesertScene extends AnimalLandScene {
  constructor() {
    super(DESERT_LAND);
  }
}
