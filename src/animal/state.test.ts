import { ANIMALS, GORILLA, JUNGLE, QUESTS, RECIPES, SHOP } from './data';
import {
  buy, canCook, cook, desertOpen, loadAnimals, questReady,
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

  it('the gorilla quest waits until the hero is ready (other quests done or level 4)', () => {
    const s = newAnimalSave('Mia', 'cat', 2, 0);
    expect(questReady(s, 'pie')).toBe(true);
    expect(questReady(s, 'gorilla')).toBe(false);
    s.quests.pie = 'done';
    expect(questReady(s, 'gorilla')).toBe(false);
    s.quests.puppies = 'done';
    expect(questReady(s, 'gorilla')).toBe(true);
    const t = newAnimalSave('Leo', 'dog', 2, 0);
    t.level = 4;
    expect(questReady(t, 'gorilla')).toBe(true);
  });

  it('the puppy and gorilla quests finish when the puppies are rescued and the gorilla is calm', () => {
    const s = newAnimalSave('Mia', 'elephant', 2, 0);
    accept(s, 'puppies');
    // The two empty rocks (rock5, rock6) do not count as puppies.
    s.rescued = ['rock0', 'rock1', 'rock2', 'rock3', 'rock5', 'rock6'];
    expect(canTurnIn(s, 'puppies')).toBe(false);
    s.rescued.push('rock4');
    expect(turnIn(s, 'puppies')).not.toBeNull();
    accept(s, 'gorilla');
    expect(canTurnIn(s, 'gorilla')).toBe(false);
    s.gorillaCalm = true;
    expect(turnIn(s, 'gorilla')!.xp).toBe(QUESTS[2].xp);
  });

  it('Part 2: fossils, cooking and the tortoise quest', () => {
    const s = newAnimalSave('Leo', 'dog', 3, 0);
    expect(desertOpen(s)).toBe(false);
    s.gorillaCalm = true;
    expect(desertOpen(s)).toBe(true);
    accept(s, 'fossils');
    s.fossils = ['dig0', 'dig1', 'dig2', 'dig3'];
    expect(canTurnIn(s, 'fossils')).toBe(false);
    s.fossils.push('dig4');
    expect(turnIn(s, 'fossils')).not.toBeNull();
    // The tortoise waits until the fossils and cooking are done (or level 8).
    expect(questReady(s, 'tortoise')).toBe(false);
    accept(s, 'cook');
    s.cooked = 3;
    expect(turnIn(s, 'cook')).not.toBeNull();
    expect(s.foods.salad).toBe(1);
    expect(questReady(s, 'tortoise')).toBe(true);
    accept(s, 'tortoise');
    s.tortoiseCalm = true;
    expect(canTurnIn(s, 'tortoise')).toBe(true);
  });

  it('cooking uses the ingredients, and a right answer makes two', () => {
    const s = newAnimalSave('Leo', 'cat', 3, 0);
    const salad = RECIPES.find((r) => r.id === 'salad')!;
    expect(canCook(s, salad)).toBe(false);
    s.foods = { berries: 2, apple: 1, banana: 1 };
    expect(cook(s, salad, true)).toBe(2);
    expect(s.foods).toMatchObject({ berries: 1, apple: 0, banana: 0, salad: 2 });
    expect(canCook(s, salad)).toBe(false);
    expect(cook(s, salad, false)).toBe(0);
    expect(s.cooked).toBe(1);
  });

  it('the shop sells food and charms (each charm once) for acorns', () => {
    const s = newAnimalSave('Leo', 'owl', 3, 0);
    const heart = SHOP.find((i) => i.id === 'heart')!;
    const apple = SHOP.find((i) => i.id === 'apple')!;
    expect(buy(s, apple)).toBe(false);
    s.acorns = 200;
    const before = maxHearts(s);
    expect(buy(s, heart)).toBe(true);
    expect(maxHearts(s)).toBe(before + 4);
    expect(s.hearts).toBe(before + 4);
    expect(buy(s, heart)).toBe(false);
    expect(buy(s, apple)).toBe(true);
    expect(s.acorns).toBe(200 - heart.price - apple.price);
    expect(s.foods.apple).toBe(1);
    // The clover charm calms a bit more.
    const n = calmAmount(s, 1, true);
    s.charms.push('clover');
    expect(calmAmount(s, 1, true)).toBeGreaterThan(n);
  });

  it('older saves get the new quests and fields', () => {
    const old = newAnimalSave('Old', 'cat', 2, 0) as unknown as Record<string, unknown>;
    old.quests = { pie: 'done', puppies: 'active', gorilla: 'new' };
    for (const k of ['dug', 'fossils', 'cooked', 'tortoiseCalm', 'charms']) delete old[k];
    const store = new Map<string, string>([['learning-animals.save.v1', JSON.stringify(old)]]);
    (globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = { getItem: (k) => store.get(k) ?? null, setItem: () => {} };
    const s = loadAnimals()!;
    expect(s.quests).toMatchObject({ pie: 'done', puppies: 'active', fossils: 'new', cook: 'new', tortoise: 'new' });
    expect(s.charms).toEqual([]);
    expect(s.cooked).toBe(0);
  });
});
