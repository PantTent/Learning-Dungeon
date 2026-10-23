import { tr } from '../i18n';
import { OCTOPUS, SEASHORE } from '../animal/data';
import { buildSeashore } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const seashoreState = newLandState();

const SEASHORE_LAND: LandConfig = {
  key: 'AnimalSeashore',
  land: 'seashore',
  map: buildSeashore(),
  state: seashoreState,
  wilds: SEASHORE,
  byLevel: { 13: ['crab', 'seagull', 'starfish'], 14: ['puffin', 'lobster', 'seal'], 15: ['otter', 'walrus', 'seal'] },
  boss: OCTOPUS,
  bossLevel: 15,
  bossQuest: 'octopus',
  exit: 'left',
  ground: 'beach',
  sign: 'prop_beachsign',
  hidden: { quest: 'turtles', list: 'turtles', icon: 'npc_babyturtle', dust: [0xf0d9a0, 0xe2c486, 0xffffff], toSea: true },
  strong: ['push', 'sniff'],
  spring: 0x48c8e0,
  tree: (i) => (i % 3 === 2 ? { sprite: 'prop_beachrock', scale: 3 } : { sprite: 'prop_coconutpalm', scale: 3.2 }),
  fruitTree: 'prop_coconutpalm',
  fruit: 'coconut',
  fruitBadge: 'food_coconut',
  rock: 'prop_nest',
  rockCracked: 'prop_nest_open',
  solidRocks: false,
  stump: { sprite: 'prop_chest', scale: 3, acorns: 100, food: 'mango', n: 3 },
  decor: ['prop_shells', 'prop_tidepool', 'prop_sandcastle', 'prop_umbrella'],
  decorCount: 40,
  exitProp: 'prop_boat',
  landmark: { sprite: 'prop_lighthouse', dx: -150, dy: -20 },
  text: () => ({
    welcome: tr('The Sunny Seashore! Look for turtle nests in the sand, and rest at the lagoon.'),
    home: tr('← Boat home'),
    noClimb: tr('The coconuts are way up high. A cat could climb up there!'),
    noFruit: tr('No ripe coconuts yet. Come back soon!'),
    climbed: tr('You climb the palm and pick a coconut!'),
    stump: tr('A pirate chest in a secret cave! 100 acorns and 3 mangoes!'),
    rockTitle: tr('Help the baby turtle!'),
    rockRight: tr('Answer: {answer}. You gently open the nest!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(You dig so gently: the nest opens anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The sand is packed tight! One more question.)'),
    rockGo: tr('Dig gently!'),
    crackedTitle: tr('Almost there!'),
    crackedRight: tr('Answer: {answer}. The nest is open!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! The nest opens anyway!)'),
    foundHidden: tr('A baby sea turtle! It waddles off to the sea.'),
    foundAcorns: tr('This nest is empty, but you found 8 acorns!'),
    bossRoar: tr('SPLOOSH! This is MY beach! Go away, landlubber!'),
    bossNotYet: tr('(This octopus is too grumpy for now. Talk to Captain Pelican by the lagoon first.)'),
    springLabel: tr('Lagoon: rest here'),
    springRest: tr('A cool swim in the lagoon. All hearts back!'),
  }),
};

/** The Sunny Seashore: turtle nests, coconut palms, a lagoon and a grumpy octopus. */
export class AnimalSeashoreScene extends AnimalLandScene {
  constructor() {
    super(SEASHORE_LAND);
  }
}
