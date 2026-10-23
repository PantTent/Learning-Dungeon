import { tr } from '../i18n';
import { RHINO, SAVANNA } from '../animal/data';
import { buildSavanna } from '../animal/world';
import { AnimalLandScene, newLandState, type LandConfig } from './AnimalLandScene';

/** What stays the same while you go into a battle and come back. */
export const savannaState = newLandState();

const SAVANNA_LAND: LandConfig = {
  key: 'AnimalSavanna',
  land: 'savanna',
  map: buildSavanna(),
  state: savannaState,
  wilds: SAVANNA,
  byLevel: { 16: ['zebra', 'warthog', 'gazelle'], 17: ['ostrich', 'baboon', 'hyena'], 18: ['hippo', 'buffalo', 'hyena'] },
  boss: RHINO,
  bossLevel: 18,
  bossQuest: 'rhino',
  exit: 'top',
  ground: 'savanna',
  sign: 'prop_savannasign',
  hidden: { quest: 'calves', list: 'calves', icon: 'npc_calf', dust: [0xd8b860, 0xb89040, 0x9a8a70], trotOff: true },
  strong: ['push', 'sniff'],
  spring: 0x5aa8d0,
  cold: true,
  coldCharm: 'hat',
  tree: (i) => (i % 4 === 3 ? { sprite: 'prop_kopje', scale: 3 } : i % 4 === 2 ? { sprite: 'prop_termitemound', scale: 3 } : { sprite: 'prop_acacia', scale: 3.2 }),
  fruitTree: 'prop_baobab',
  fruit: 'baobab',
  rock: 'prop_tallgrass',
  rockCracked: 'prop_tallgrass_open',
  solidRocks: false,
  stump: { sprite: 'prop_safaritent', scale: 2.6, acorns: 120, food: 'kebab', n: 2 },
  decor: ['prop_grasstuft'],
  decorCount: 60,
  exitProp: 'prop_balloon',
  text: () => ({
    welcome: tr('The Savanna! Search the tall grass for lost calves, and drink at the watering hole.'),
    home: tr('↑ Balloon home'),
    noClimb: tr('The baobab fruit is way up high. A cat could climb up there!'),
    noFruit: tr('No ripe baobab fruit yet. Come back soon!'),
    climbed: tr('You climb the baobab and pick a fruit!'),
    stump: tr('A secret safari tent! 120 acorns and 2 fruit kebabs!'),
    rockTitle: tr('Look in the tall grass!'),
    rockRight: tr('Answer: {answer}. You part the tall grass!'),
    rockWrongStrong: tr('You said: {given}\nRight answer: {answer}\n(You push the grass aside anyway!)'),
    rockWrong: tr('You said: {given}\nRight answer: {answer}\n(The grass is so thick! One more question.)'),
    rockGo: tr('Look!'),
    crackedTitle: tr('Almost through the grass!'),
    crackedRight: tr('Answer: {answer}. You can see now!'),
    crackedWrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! You part the grass anyway!)'),
    foundHidden: tr('A lost elephant calf! It trots off to find its mom.'),
    foundAcorns: tr('No calf here, but you found 8 acorns!'),
    bossRoar: tr('SNORT! This is MY savanna! Out of my way!'),
    bossNotYet: tr('(This rhino is too grumpy for now. Talk to Gigi Giraffe by the watering hole first.)'),
    springLabel: tr('Watering hole: rest here'),
    springRest: tr('A cool drink at the watering hole. All hearts back!'),
    cold: tr('Phew! The sun is so hot. A safari hat from the shop would help!'),
  }),
};

/** The Savanna: tall grass, baobab trees, a watering hole, the hot sun and a grumpy rhino. */
export class AnimalSavannaScene extends AnimalLandScene {
  constructor() {
    super(SAVANNA_LAND);
  }
}
