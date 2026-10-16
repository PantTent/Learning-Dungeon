import { ANIMALS, CROPS, FEED_TRIES, GOLDEN_MULT, LAND_TIERS, MAGIC_CROPS, ORDER_EVERY_MS, PORTAL_COST, STALL_TIERS } from './data';
import {
  accrue, buyAnimal, buyGear, buyPortal, enterWorld, rootOf, buyHat, buyLand, buyStalls, canFill, clock, collect, feed, fillOrder, goldKey, harvest, isHungry, newFarm, newOrder, plant,
  plotState, refreshOrders, renameAnimal, saleValue, sell, wearHat,
} from './state';

const T0 = 1_000_000;

describe('Learning Farm rules', () => {
  it('a new farm has 4 plots, 1 stall and a hungry horse', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(f.plots).toHaveLength(LAND_TIERS[0].plots);
    expect(f.animals).toHaveLength(1);
    expect(f.animals[0].kind).toBe('horse');
    expect(isHungry(f.animals[0], T0)).toBe(true);
  });

  it('crops grow over time, then go to the basket', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const carrot = CROPS[0];
    expect(plant(f, 0, 'carrot', T0)).toBe(true);
    expect(f.coins).toBe(20 - carrot.seedCost);
    expect(plant(f, 0, 'carrot', T0)).toBe(false);
    expect(plotState(f.plots[0], T0 + carrot.growMs - 1)).toBe('growing');
    expect(harvest(f, 0, T0 + 1000)).toBeUndefined();
    expect(plotState(f.plots[0], T0 + carrot.growMs)).toBe('ready');
    expect(harvest(f, 0, T0 + carrot.growMs, () => 0.99)?.crop).toBe('carrot');
    expect(f.basket.carrot).toBe(1);
    expect(plotState(f.plots[0], T0 + carrot.growMs)).toBe('empty');
  });

  it('cannot plant without enough coins', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.coins = 1;
    expect(plant(f, 0, 'pumpkin', T0)).toBe(false);
  });

  it('selling pays full price when right and half when wrong', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.basket = { tomato: 3 };
    const before = f.coins;
    expect(saleValue('tomato', 3, false)).toBe(Math.round((CROPS.find((c) => c.id === 'tomato')!.price * 3) / 2));
    expect(sell(f, 'tomato', true)).toBe(CROPS.find((c) => c.id === 'tomato')!.price * 3);
    expect(f.coins).toBe(before + 72);
    expect(f.basket.tomato).toBeUndefined();
    expect(sell(f, 'tomato', true)).toBe(0);
  });

  it('feeding: 1 right = happy, 3 wrongs = happy too', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const h = f.animals[0];
    expect(feed(h, true, T0)).toBe(true);
    expect(isHungry(h, T0)).toBe(false);
    const later = T0 + ANIMALS[0].hungryAfterMs;
    expect(isHungry(h, later)).toBe(true);
    for (let i = 1; i < FEED_TRIES; i++) expect(feed(h, false, later)).toBe(false);
    expect(feed(h, false, later)).toBe(true);
    expect(isHungry(h, later)).toBe(false);
  });

  it('happy animals earn a little; hungry ones earn nothing', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const h = f.animals[0];
    accrue(h, T0 + 60_000);
    expect(h.pending).toBe(0); // started hungry
    feed(h, true, T0);
    expect(collect(f, h, T0 + 60_000)).toBe(ANIMALS[0].incomePerMin);
    // Long after it got hungry, only the happy time counted.
    const coins = collect(f, h, T0 + 60 * 60_000);
    expect(coins).toBe(Math.floor((ANIMALS[0].incomePerMin * (ANIMALS[0].hungryAfterMs - 60_000)) / 60_000));
  });

  it('upgrades cost coins and add plots / stalls / animals', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(buyLand(f)).toBe(false);
    expect(buyAnimal(f, 'chicken', T0)).toBeUndefined(); // no free stall
    f.coins = 10_000;
    expect(buyLand(f)).toBe(true);
    expect(f.plots).toHaveLength(LAND_TIERS[1].plots);
    expect(buyStalls(f)).toBe(true);
    expect(buyAnimal(f, 'chicken', T0)?.kind).toBe('chicken');
    expect(buyAnimal(f, 'pig', T0)).toBeUndefined(); // stalls full again
    while (buyLand(f));
    while (buyStalls(f));
    expect(f.plots).toHaveLength(LAND_TIERS[LAND_TIERS.length - 1].plots);
    expect(f.stallTier).toBe(STALL_TIERS.length - 1);
  });

  it('formats countdowns', () => {
    expect(clock(65_000)).toBe('1:05');
    expect(clock(400)).toBe('0:01');
  });
});

describe('Learning Farm part 2', () => {
  const always = () => 0; // rand() -> 0: golden + double every time
  const never = () => 0.99;

  it('golden crops sell for 5x, and the Lucky Straw Hat adds 25%', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    plant(f, 0, 'carrot', T0);
    const h = harvest(f, 0, T0 + 60_000, always)!;
    expect(h.golden).toBe(true);
    expect(f.basket[goldKey('carrot')]).toBe(1);
    expect(saleValue(goldKey('carrot'), 1, true, f)).toBe(CROPS[0].price * GOLDEN_MULT);
    f.gear.push('hat');
    expect(saleValue('carrot', 4, true, f)).toBe(Math.round(CROPS[0].price * 4 * 1.25));
  });

  it('the Big Basket sometimes doubles a harvest; the Watering Can speeds growth', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.coins = 1000;
    expect(buyGear(f, 'basket')).toBe(true);
    expect(buyGear(f, 'basket')).toBe(false);
    plant(f, 0, 'carrot', T0);
    expect(harvest(f, 0, T0 + 60_000, () => 0.1)!.count).toBe(2);
    expect(buyGear(f, 'can')).toBe(true);
    plant(f, 1, 'carrot', T0);
    expect(plotState(f.plots[1], T0 + CROPS[0].growMs * 0.75, f)).toBe('ready');
    expect(plotState(f.plots[1], T0 + CROPS[0].growMs * 0.6, f)).toBe('growing');
    expect(harvest(f, 1, T0 + 60_000, never)!.count).toBe(1);
  });

  it('the Comfy Brush keeps animals happy longer; the Golden Bell earns more', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const a = f.animals[0];
    feed(a, true, T0, f);
    const normal = ANIMALS[0].hungryAfterMs;
    expect(isHungry(a, T0 + normal, f)).toBe(true);
    f.gear.push('brush', 'bell');
    expect(isHungry(a, T0 + normal, f)).toBe(false);
    expect(collect(f, a, T0 + 60_000)).toBe(ANIMALS[0].incomePerMin * 1.5);
  });

  it('hats: buy, wear, move to another animal; rename', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.coins = 1000;
    f.stallTier = 1;
    const pig = buyAnimal(f, 'pig', T0)!;
    expect(wearHat(f, f.animals[0], 'crown')).toBe(false);
    expect(buyHat(f, 'crown')).toBe(true);
    expect(wearHat(f, f.animals[0], 'crown')).toBe(true);
    expect(wearHat(f, pig, 'crown')).toBe(true);
    expect(f.animals[0].hat).toBeUndefined();
    expect(pig.hat).toBe('crown');
    renameAnimal(pig, '  Sir Oinks a Lot  ');
    expect(pig.name).toBe('Sir Oinks a');
  });

  it('orders: start with two, fill from the basket, a new one arrives later', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(f.orders).toHaveLength(2);
    const o = f.orders[0];
    expect(canFill(f, o)).toBe(false);
    expect(fillOrder(f, o.id, true, T0)).toBe(0);
    for (const x of o.items) f.basket[x.crop] = x.n;
    const before = f.coins;
    expect(fillOrder(f, o.id, false, T0)).toBe(Math.round(o.reward / 2));
    expect(f.coins).toBe(before + Math.round(o.reward / 2));
    expect(f.orders).toHaveLength(1);
    expect(refreshOrders(f, T0 + 1000)).toBe(false);
    expect(refreshOrders(f, T0 + ORDER_EVERY_MS)).toBe(true);
    expect(f.orders).toHaveLength(2);
  });

  it('orders always pay more than the market', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    for (let i = 0; i < 300; i++) {
      const o = newOrder(f);
      const market = o.items.reduce((s, x) => s + CROPS.find((c) => c.id === x.crop)!.price * x.n, 0);
      expect(o.reward).toBeGreaterThan(market);
      expect(o.items.length).toBeGreaterThanOrEqual(1);
      expect(new Set(o.items.map((x) => x.crop)).size).toBe(o.items.length);
    }
  });
});

describe('the magic world', () => {
  it('needs 1000 coins; starts with 4 plots and a hungry unicorn', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    expect(buyPortal(f, T0)).toBe(false);
    f.coins = PORTAL_COST + 50;
    expect(buyPortal(f, T0)).toBe(true);
    expect(buyPortal(f, T0)).toBe(false);
    expect(f.coins).toBe(50);
    const m = enterWorld(f, 'magic');
    expect(m.plots).toHaveLength(4);
    expect(m.animals.map((a) => a.kind)).toEqual(['unicorn']);
    expect(isHungry(m.animals[0], T0)).toBe(true);
    expect(m.orders).toHaveLength(2);
    for (const o of m.orders) for (const x of o.items) expect(MAGIC_CROPS.some((c) => c.id === x.crop)).toBe(true);
  });

  it('shares coins and gear with home but keeps its own land and animals', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    f.coins = 5000;
    buyPortal(f, T0);
    const m = enterWorld(f, 'magic');
    expect(plant(m, 0, 'starfruit', T0)).toBe(true);
    expect(f.coins).toBe(5000 - PORTAL_COST - 45);
    expect(f.plots[0].crop).toBeUndefined();
    expect(m.plots[0].crop).toBe('starfruit');
    f.gear.push('can');
    expect(plotState(m.plots[0], T0 + 120_000 * 0.75, m)).toBe('ready');
    expect(buyLand(m)).toBe(true);
    expect(m.plots).toHaveLength(6);
    expect(f.plots).toHaveLength(4);
    expect(m.landTier).toBe(1);
    expect(f.landTier).toBe(0);
    // Saving through the view saves the whole farm.
    expect(rootOf(m)).toBe(f);
    expect(JSON.parse(JSON.stringify(f)).magic.plots).toHaveLength(6);
  });
});
