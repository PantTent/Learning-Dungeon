import { ANIMALS, CROPS, FEED_TRIES, LAND_TIERS, STALL_TIERS } from './data';
import { accrue, buyAnimal, buyLand, buyStalls, clock, collect, feed, harvest, isHungry, newFarm, plant, plotState, saleValue, sell } from './state';

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
    expect(harvest(f, 0, T0 + carrot.growMs)).toBe('carrot');
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
