import { ANIMALS, GORILLA, JUNGLE, QUESTS } from './data';
import {
  accept, addFood, calmAmount, canTurnIn, dropsFor, eat, gainXp, makeFoe, maxHearts, moves, newAnimalSave, progress, startCalm, turnIn,
  xpToNext,
} from './state';

describe('Animal Kingdom Quest rules', () => {
  it('there are 8 animals, each with a different skill and 3 moves', () => {
    expect(ANIMALS.map((a) => a.id)).toEqual(['cat', 'dog', 'mouse', 'cheetah', 'owl', 'elephant', 'lion', 'snake']);
    expect(new Set(ANIMALS.map((a) => a.skill)).size).toBe(8);
    for (const a of ANIMALS) {
      expect(a.moves.map((m) => m.unlock)).toEqual([1, 3, 5]);
      for (const x of [a.name, a.skillName, a.skillInfo, a.fact, ...a.moves.map((m) => m.name)]) {
        expect(x.en.length).toBeGreaterThan(1);
        expect(x.fr.length).toBeGreaterThan(1);
        expect(x.fr).not.toMatch(/ [?!]/);
      }
    }
    // The elephant has the most hearts.
    expect(Math.max(...ANIMALS.map((a) => a.hearts))).toBe(ANIMALS.find((a) => a.id === 'elephant')!.hearts);
  });

  it('a new hero starts full of hearts, with a couple of berries; little ones get read-aloud', () => {
    const s = newAnimalSave('Mia', 'cat', 1, 0);
    expect(s.hearts).toBe(maxHearts(s));
    expect(s.foods.berries).toBe(2);
    expect(s.settings.readAloud).toBe(true);
    expect(newAnimalSave('Mia', 'cat', 4, 0).settings.readAloud).toBe(false);
  });

  it('leveling up adds hearts, power and new moves', () => {
    const s = newAnimalSave('Mia', 'dog', 2, 0);
    expect(moves(s).length).toBe(1);
    const before = maxHearts(s);
    const ups = gainXp(s, xpToNext(1) + xpToNext(2));
    expect(ups).toBe(2);
    expect(s.level).toBe(3);
    expect(maxHearts(s)).toBe(before + 4);
    expect(moves(s).length).toBe(2);
    expect(calmAmount(s, 1, true)).toBeGreaterThan(calmAmount(newAnimalSave('x', 'dog', 2, 0), 1, true));
  });

  it('calming: right answers calm fully, wrong ones half; the lion starts a quarter calm', () => {
    const s = newAnimalSave('Mia', 'lion', 2, 0);
    expect(calmAmount(s, 2, true)).toBe(2);
    expect(calmAmount(s, 2, false)).toBe(1);
    const f = makeFoe(JUNGLE[2], 1);
    expect(startCalm(s, f)).toBe(1);
    expect(startCalm(newAnimalSave('Mia', 'cat', 2, 0), f)).toBe(0);
    expect(makeFoe(GORILLA, 1).grump).toBeGreaterThan(makeFoe(JUNGLE[7], 1).grump);
  });

  it('some animals drop food (not all), and everyone gives acorns', () => {
    const frog = makeFoe(JUNGLE.find((w) => w.id === 'frog')!, 1);
    expect(dropsFor(frog, 0).food).toBeUndefined();
    const sloth = makeFoe(JUNGLE.find((w) => w.id === 'sloth')!, 2);
    expect(dropsFor(sloth, 0).food).toBe('apple');
    expect(dropsFor(sloth, 0.99).food).toBeUndefined();
    expect(dropsFor(sloth).acorns).toBeGreaterThan(0);
  });

  it('eating heals, but eaten apples no longer count for the pie quest', () => {
    const s = newAnimalSave('Mia', 'cat', 2, 0);
    accept(s, 'pie');
    addFood(s, 'apple', 5);
    expect(canTurnIn(s, 'pie')).toBe(true);
    s.hearts = 2;
    expect(eat(s, 'apple')).toBe(4);
    expect(progress(s, 'pie')).toBe(4);
    expect(canTurnIn(s, 'pie')).toBe(false);
    addFood(s, 'apple');
    const r = turnIn(s, 'pie')!;
    expect(r.acorns).toBe(30);
    expect(s.foods.apple).toBe(0);
    expect(s.foods.pie).toBe(2);
    expect(s.quests.pie).toBe('done');
    // Apple pie heals all the way.
    s.hearts = 1;
    eat(s, 'pie');
    expect(s.hearts).toBe(maxHearts(s));
  });

  it('the puppy and gorilla quests finish when the puppies are rescued and the gorilla is calm', () => {
    const s = newAnimalSave('Mia', 'elephant', 2, 0);
    accept(s, 'puppies');
    s.rescued = ['r1', 'r2', 'r3', 'r4'];
    expect(canTurnIn(s, 'puppies')).toBe(false);
    s.rescued.push('r5');
    expect(turnIn(s, 'puppies')).not.toBeNull();
    accept(s, 'gorilla');
    expect(canTurnIn(s, 'gorilla')).toBe(false);
    s.gorillaCalm = true;
    expect(turnIn(s, 'gorilla')!.xp).toBe(QUESTS[2].xp);
  });
});
