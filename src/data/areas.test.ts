import { AREAS, PLACES, campPlace, lairPlace, placeOf } from './areas';
import { ENEMIES } from './enemies';
import { POTIONS, tierForLevel, upgradePotions } from './potions';

describe('areas', () => {
  it('every area has floors then a boss lair, in order', () => {
    expect(AREAS.length).toBeGreaterThanOrEqual(2);
    AREAS.forEach((a, ai) => {
      const places = PLACES.filter((p) => p.area === ai);
      expect(places[places.length - 1].kind).toBe('lair');
      expect(places.slice(0, -1).every((p) => p.kind === 'floor')).toBe(true);
      expect(placeOf(campPlace(ai)).floorNo).toBe(0);
      expect(placeOf(lairPlace(ai)).kind).toBe('lair');
    });
    PLACES.forEach((p, i) => expect(p.index).toBe(i));
  });

  it('every floor only uses monsters that exist, and levels go up', () => {
    let last = 0;
    for (const a of AREAS) {
      for (const f of a.floors) {
        for (const id of f.enemies) expect(ENEMIES[id], id).toBeDefined();
        expect(f.levels[0]).toBeGreaterThan(last);
        last = f.levels[1];
      }
      expect(a.boss.level).toBeGreaterThan(last);
      last = a.boss.level;
    }
  });
});

describe('potions', () => {
  it('four tiers of health and mana, stronger and pricier each tier', () => {
    for (const kind of ['hp', 'mp'] as const) {
      const list = POTIONS.filter((p) => p.kind === kind);
      expect(list.length).toBe(4);
      for (let i = 1; i < 4; i++) {
        expect(list[i].amount).toBeGreaterThan(list[i - 1].amount);
        expect(list[i].price).toBeGreaterThan(list[i - 1].price);
      }
    }
  });

  it('higher level monsters drop stronger potions', () => {
    expect(tierForLevel(1)).toBe(1);
    expect(tierForLevel(8)).toBe(2);
    expect(tierForLevel(13)).toBe(3);
    expect(tierForLevel(20)).toBe(4);
  });

  it('old saves keep their potions', () => {
    expect(upgradePotions({ hp: 3, mp: 2 })).toEqual({ hp1: 3, mp1: 2 });
    expect(upgradePotions({ hp2: 1 })).toEqual({ hp2: 1 });
  });
});
