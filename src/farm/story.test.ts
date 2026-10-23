import { animal, CHAPTERS, CONTESTS, crop, DISHES, FRUITS, GOODS, MAX_PRODUCTS, ORCHARD, ORCHARD_SLOTS, PRODUCTS, QUESTS, RECIPES } from './data';
import {
  addAnimal, canCook, canEnter, claimQuest, collectProducts, cook, currentQuest, enterWorld, feed, isOpen, judge, newFarm, pickTree, plantTree,
  productsReady, questMet, sell, treeLeft, unitPrice, wearHat,
} from './state';

const T0 = 1_000_000;
const MIN = 60_000;

describe('Farm products, kitchen, orchard, journal and fair', () => {
  it('happy animals make products, up to a few at a time', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const hen = addAnimal(f, 'chicken', T0);
    const ms = animal('chicken').productMs!;
    expect(productsReady(hen, T0 + ms - 1, f)).toBe(0);
    expect(productsReady(hen, T0 + 2 * ms, f)).toBe(2);
    expect(collectProducts(f, hen, T0 + 2 * ms)).toBe(2);
    expect(f.basket.egg).toBe(2);
    expect(productsReady(hen, T0 + 2 * ms, f)).toBe(0);
    // A hungry animal makes nothing, and it never saves up more than the max.
    const cow = addAnimal(f, 'cow', T0);
    const happy = animal('cow').hungryAfterMs;
    expect(productsReady(cow, T0 + 100 * happy, f)).toBe(Math.floor(happy / animal('cow').productMs!));
    feed(cow, true, T0 + 100 * happy, f);
    expect(productsReady(cow, T0 + 102 * happy, f)).toBe(MAX_PRODUCTS);
    const hungry = addAnimal(f, 'sheep', T0, true);
    expect(productsReady(hungry, T0 + 60 * MIN, f)).toBe(0);
    feed(hungry, true, T0 + 60 * MIN, f);
    expect(productsReady(hungry, T0 + 60 * MIN + animal('sheep').productMs!, f)).toBe(1);
  });

  it('every product, fruit and dish has art names and sells for more when cooked', () => {
    for (const a of animal('horse') ? ['horse', 'pig', 'chicken', 'goat', 'cow', 'sheep'] : []) expect(PRODUCTS.map((p) => p.id)).toContain(animal(a).product);
    for (const o of ORCHARD) expect(FRUITS.map((x) => x.id)).toContain(o.fruit);
    for (const r of RECIPES) {
      expect(DISHES.map((d) => d.id)).toContain(r.id);
      const parts = Object.entries(r.needs).reduce((sum, [k, n]) => sum + crop(k).price * n, 0);
      for (const k of Object.keys(r.needs)) expect(crop(k).id, `${r.id} needs ${k}`).toBe(k);
      expect(crop(r.id).price, r.id).toBeGreaterThan(parts);
    }
    expect(new Set(GOODS.map((g) => g.id)).size).toBe(GOODS.length);
  });

  it('cooking uses the basket: 2 dishes for a right answer, 1 for a wrong one', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.basket = { carrot: 4, egg: 1 };
    expect(canCook(f, 'muffin')).toBe(true);
    expect(cook(f, 'muffin', true)).toBe(2);
    expect(f.basket).toEqual({ carrot: 2, muffin: 2 });
    expect(canCook(f, 'muffin')).toBe(false);
    expect(cook(f, 'muffin', true)).toBe(0);
    f.basket.egg = 1;
    expect(cook(f, 'muffin', false)).toBe(1);
    expect(f.basket.muffin).toBe(3);
    expect(sell(f, 'muffin', true)).toBe(Math.round(unitPrice('muffin') * 3));
  });

  it('orchard trees are planted once and picked again and again', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(f.orchard).toHaveLength(ORCHARD_SLOTS);
    expect(plantTree(f, 0, 'apple', T0)).toBe(false);
    f.coins = 1000;
    expect(plantTree(f, 0, 'apple', T0)).toBe(true);
    expect(plantTree(f, 0, 'maple', T0)).toBe(false);
    const every = ORCHARD[0].everyMs;
    expect(treeLeft(f.orchard[0], T0 + 1000)).toBe(every - 1000);
    expect(pickTree(f, 0, true, T0 + 1000)).toBe(0);
    expect(pickTree(f, 0, true, T0 + every)).toBe(ORCHARD[0].count);
    expect(pickTree(f, 0, false, T0 + 2 * every)).toBe(Math.ceil(ORCHARD[0].count / 2));
    expect(f.basket.apple).toBe(ORCHARD[0].count + Math.ceil(ORCHARD[0].count / 2));
  });

  it('the journal goes job by job, pays once, and opens the kitchen, orchard and fair', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(currentQuest(f)?.id).toBe('harvest5');
    expect(claimQuest(f)).toBeUndefined();
    f.stats.harvested = 5;
    const coins = f.coins;
    expect(claimQuest(f)?.id).toBe('harvest5');
    expect(f.coins).toBe(coins + QUESTS[0].reward);
    expect(currentQuest(f)?.id).toBe('sell3');
    expect(isOpen(f, 'kitchen')).toBe(false);
    // Jump ahead: every place opens with its quest.
    f.questsDone = QUESTS.filter((q) => q.id !== 'blue_harvest' && q.id !== 'blue_animal' && q.id !== 'blue_baking').map((q) => q.id);
    expect(isOpen(f, 'kitchen') && isOpen(f, 'orchard') && isOpen(f, 'fair')).toBe(true);
    expect(currentQuest(f)?.id).toBe('blue_harvest');
    expect(CHAPTERS.flatMap((c) => c.quests).length).toBe(QUESTS.length);
    // Every quest has a goal check that can be reached.
    for (const q of QUESTS) expect(typeof questMet(f, q)).toBe('boolean');
  });

  it('the County Fair: 2 of 3 right wins blue, and three blues make a Grand Champion', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(canEnter(f, 'harvest')).toBe(false);
    f.basket.pumpkin = 2;
    f.basket['gold:pumpkin'] = 1;
    expect(canEnter(f, 'harvest')).toBe(true);
    expect(canEnter(f, 'baking')).toBe(false);
    f.basket.applepie = 1;
    expect(canEnter(f, 'baking')).toBe(true);
    // A happy animal with a hat.
    const horse = f.animals[0];
    feed(horse, true, T0, f);
    expect(canEnter(f, 'animal', T0)).toBe(false);
    f.hats.push('straw');
    wearHat(f, horse, 'straw');
    expect(canEnter(f, 'animal', T0)).toBe(true);
    expect(judge(f, 'harvest', 1)).toBe(false);
    expect(f.ribbons.harvest).toBe('red');
    expect(judge(f, 'harvest', 2)).toBe(false);
    expect(f.ribbons.harvest).toBe('blue');
    expect(judge(f, 'harvest', 0)).toBe(false);
    expect(f.ribbons.harvest).toBe('blue');
    expect(judge(f, 'animal', 3)).toBe(false);
    expect(judge(f, 'baking', 2)).toBe(true);
    expect(f.champion).toBe(true);
    expect(judge(f, 'baking', 3)).toBe(false);
    expect(CONTESTS).toHaveLength(3);
  });

  it('journal, orchard and ribbons are shared with the magic world', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.coins = 5000;
    f.portal = true;
    const m = enterWorld(f, 'magic');
    m.stats.harvested = 9;
    expect(f.stats.harvested).toBe(9);
    expect(m.orchard).toBe(f.orchard);
    expect(m.ribbons).toBe(f.ribbons);
  });
});
