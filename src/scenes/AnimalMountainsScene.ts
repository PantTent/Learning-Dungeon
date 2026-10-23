import { tr } from '../i18n';
import { MOUNTAINS, SNOW_LEOPARD } from '../animal/data';
import { buildMountains } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const mountainsState = newLandState();

const MOUNTAINS_LAND: LandConfig = {
  key: 'AnimalMountains',
  land: 'mountains',
  map: buildMountains(),
  state: mountainsState,
  wilds: MOUNTAINS,
  byLevel: { 10: ['pika', 'marmot', 'arcticfox'], 11: ['snowyowl', 'goat', 'eagle'], 12: ['ibex', 'yak', 'eagle'] },
  boss: SNOW_LEOPARD,
  bossLevel: 12,
  bossQuest: 'leopard',
  exit: 'bottom',
  ground: 'snow',
  sign: 'prop_snowsign',
  hidden: { quest: 'crystals', list: 'crystals', icon: 'item_crystal', dust: [0xffffff, 0xd2e0ee, 0x9ad0ff] },
  strong: ['push', 'sniff'],
  spring: 0x6ab8e8,
  cold: true,
  tree: (i) => (i % 3 === 2 ? { sprite: 'prop_snowrock', scale: 3 } : { sprite: 'prop_pine', scale: 3.2 }),
  fruitTree: 'prop_pine',
  fruit: 'pinenuts',
  fruitBadge: 'food_pinenuts',
  rock: 'prop_snowpile',
  rockCracked: 'prop_snowpile_dug',
  solidRocks: false,
  stump: { sprite: 'prop_igloo', scale: 2.6, acorns: 80, food: 'cocoa', n: 2 },
  decor: ['prop_snowman'],
  decorCount: 10,
  text: () => ({
    welcome: tr('The Snowy Mountains! Dig in the snow piles, and warm up at the hot spring.'),
    home: tr('↓ Village'),
    noClimb: tr('The pine cones are way up high. A cat could climb up there!'),
    noFruit: tr('No pine nuts yet. Come back soon!'),
    climbed: tr('You climb the pine and find some pine nuts!'),
    stump: tr('A secret igloo! 80 acorns and 2 hot cocoas!'),
    rockTitle: tr('Dig in the snow!'),
    rockRight: tr('Answer: {answer}. You dig it up!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(You are a great digger: you dig it up anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The snow is deep! One more question.)'),
    rockGo: tr('Dig!'),
    crackedTitle: tr('Keep digging!'),
    crackedRight: tr('Answer: {answer}. You reach the bottom!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! You dig it up anyway!)'),
    foundHidden: tr('A sparkly ice crystal! Mayor Beaver will love it.'),
    foundAcorns: tr('No crystal here, but you found 8 acorns!'),
    bossRoar: tr('GRRRR! These are MY mountains! Go back down!'),
    bossNotYet: tr('(This snow leopard is too grumpy for now. Talk to Grandpa Goat by the hot spring first.)'),
    springLabel: tr('Hot spring: rest here'),
    springRest: tr('Ahh, the warm hot spring. All hearts back!'),
    cold: tr('Brrr! It is cold up here. A warm scarf from the shop would help!'),
  }),
};

/** The Snowy Mountains: snow piles, a hot spring, the cold, and a grumpy snow leopard. */
export class AnimalMountainsScene extends AnimalLandScene {
  constructor() {
    super(MOUNTAINS_LAND);
  }
}
