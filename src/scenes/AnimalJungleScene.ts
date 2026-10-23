import { tr } from '../i18n';
import { GORILLA, JUNGLE } from '../animal/data';
import { buildJungle } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const jungleState = newLandState();

const JUNGLE_LAND: LandConfig = {
  key: 'AnimalJungle',
  land: 'jungle',
  map: buildJungle(),
  state: jungleState,
  wilds: JUNGLE,
  byLevel: { 1: ['frog', 'parrot'], 2: ['monkey', 'toucan'], 3: ['sloth', 'tapir'], 4: ['croc', 'tiger'] },
  boss: GORILLA,
  bossLevel: 3,
  bossQuest: 'gorilla',
  exit: 'left',
  ground: 'jungle',
  sign: 'prop_sign',
  hidden: { quest: 'puppies', dust: [0x9a948c, 0x6e6862] },
  strong: ['push'],
  tree: () => ({ sprite: 'prop_jtree', scale: 3.2 }),
  fruitTree: 'prop_fruittree',
  fruit: 'apple',
  rock: 'prop_rock',
  rockCracked: 'prop_rock_cracked',
  solidRocks: true,
  stump: { sprite: 'prop_stump', scale: 3, acorns: 25, food: 'banana', n: 2 },
  decor: ['prop_flowers', 'prop_bush', 'prop_bush'],
  text: () => ({
    welcome: tr('The Jungle! Walk into grumpy animals to calm them down.'),
    home: tr('← Village'),
    noClimb: tr('The apples are way up high. A cat could climb up there!'),
    noFruit: tr('No ripe apples yet. Come back soon!'),
    climbed: tr('You climb up and pick an apple!'),
    stump: tr('A secret stump! 25 acorns and 2 bananas!'),
    rockTitle: tr('Push the rock!'),
    rockRight: tr('Answer: {answer}. The rock rolls away!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(Your elephant strength pushes it anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The rock cracks! One more question.)'),
    rockGo: tr('Push!'),
    crackedTitle: tr('The rock is cracked!'),
    crackedRight: tr('Answer: {answer}. Crack! The rock breaks!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! The cracked rock breaks anyway!)'),
    foundHidden: tr('You found a puppy! It will follow you home.'),
    foundAcorns: tr('No puppy here, but you found 8 acorns!'),
    bossRoar: tr('GRRR! This is MY jungle! Nobody gets past me!'),
    bossNotYet: tr('(This gorilla is too grumpy for now. Talk to Mayor Beaver in the village first.)'),
  }),
};

/** The Jungle: calm grumpy animals, find apples, rescue the puppies. */
export class AnimalJungleScene extends AnimalLandScene {
  constructor() {
    super(JUNGLE_LAND);
  }
}
