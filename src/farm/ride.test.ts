import { HATS } from './data';
import { buyHat, isHungry, newFarm } from './state';
import { finishRide, horseLevel, levelProgress, MAX_HORSE_LEVEL, rideBonus, STOP_XP, TRAILS, trailOpen, xpForLevel } from './ride';

const T0 = 1_000_000;

describe('trail rides', () => {
  it('horses level up with XP', () => {
    expect(horseLevel(0)).toBe(1);
    expect(horseLevel(xpForLevel(1) - 1)).toBe(1);
    expect(horseLevel(xpForLevel(1))).toBe(2);
    expect(horseLevel(xpForLevel(1) + xpForLevel(2))).toBe(3);
    expect(horseLevel(1e9)).toBe(MAX_HORSE_LEVEL);
    expect(levelProgress(xpForLevel(1) + 5)).toEqual({ have: 5, need: xpForLevel(2) });
    expect(rideBonus(1)).toBe(1);
  });

  it('longer trails open at higher levels', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const horse = f.animals[0];
    expect(TRAILS.map((t) => trailOpen(horse, t))).toEqual([true, false, false]);
    horse.xp = xpForLevel(1) + xpForLevel(2);
    expect(TRAILS.map((t) => trailOpen(horse, t))).toEqual([true, true, false]);
  });

  it('finishing puts the finds in the basket, pays the chest, gives XP and makes the horse hungry', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const horse = f.animals[0];
    const coins = f.coins;
    const t = TRAILS[0];
    const r = finishRide(f, horse, t, { coin: 5, apple: 2, blueberry: 0 }, 2, 0, true, T0, () => 0.9);
    expect(r.items).toEqual({ apple: 2 });
    expect(f.basket.apple).toBe(2);
    expect(r.coins).toBe(10 + t.chest);
    expect(f.coins).toBe(coins + r.coins);
    expect(r.xp).toBe(t.xp + 2 * 7 + 20 + 15);
    expect(horse.xp).toBe(r.xp);
    expect(r.to).toBe(horseLevel(r.xp));
    expect(isHungry(horse, T0, f)).toBe(true);
    expect(r.hat).toBeUndefined();
    // The water stop and the chest lock add a little XP for right answers.
    const g = newFarm('Sam', undefined, 'en', T0);
    const r3 = finishRide(g, g.animals[0], t, { coin: 5, apple: 2 }, 2, 0, true, T0, () => 0.9, 2 * STOP_XP);
    expect(r3.xp).toBe(r.xp + 2 * STOP_XP);
  });

  it('stopping early keeps the finds but gives no chest; the chest can hold the cowboy hat', () => {
    const f = newFarm('Sam', undefined, 'en', T0);
    const r = finishRide(f, f.animals[0], TRAILS[0], { coin: 3 }, 0, 2, false, T0, () => 0);
    expect(r.coins).toBe(6);
    expect(r.hat).toBeUndefined();
    const g = newFarm('Sam', undefined, 'en', T0);
    const r2 = finishRide(g, g.animals[0], TRAILS[0], {}, 0, 1, true, T0, () => 0);
    expect(r2.hat).toBe('cowboy');
    expect(g.hats).toContain('cowboy');
    // Not for sale in the shop.
    g.coins = 1000;
    expect(HATS.find((h) => h.id === 'cowboy')!.trail).toBe(true);
    expect(buyHat(newFarm('X', undefined, 'en', T0), 'cowboy')).toBe(false);
  });
});
