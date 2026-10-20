import { activeSetBonus, makeSetItem, SETS, setCounts } from './sets';
import { getClass } from './classes';
import { derive, newProfile } from '../state/profile';
import type { Item } from './items';

describe('item sets', () => {
  it('every set has 5 pieces and 3 bonus steps', () => {
    for (const s of SETS) {
      expect(new Set(s.pieces).size).toBe(5);
      expect(s.bonuses.length).toBe(3);
    }
  });

  it('bonuses switch on at 3, 4 and 5 pieces and add up', () => {
    const set = SETS.find((s) => s.id === 'wild')!;
    const worn = (n: number) => Object.fromEntries(set.pieces.slice(0, n).map((b) => [b, { set: 'wild' } as Item]));
    expect(activeSetBonus(worn(2)).hpPct).toBe(0);
    expect(activeSetBonus(worn(3)).hpPct).toBe(10);
    expect(activeSetBonus(worn(4))).toMatchObject({ hpPct: 10, armorPct: 10 });
    expect(activeSetBonus(worn(5))).toMatchObject({ hpPct: 25, armorPct: 10 });
    expect(setCounts(worn(4)).get('wild')).toBe(4);
  });

  it('wearing a full set makes the hero stronger', () => {
    const p = newProfile('Sam', 'warrior');
    p.level = 10;
    const before = derive(p).maxHp;
    const set = SETS.find((s) => s.id === 'wild')!;
    for (const base of set.pieces) {
      const it = makeSetItem(10, getClass('warrior'), set);
      it.base = base;
      it.stats = {};
      it.armor = 0;
      p.equipped[base] = it;
    }
    expect(derive(p).maxHp).toBe(Math.round(before * 1.25));
  });

  it('set pieces are named after their set', () => {
    const it = makeSetItem(12, getClass('mage'), SETS[0]);
    expect(it.set).toBe(SETS[0].id);
    expect(it.name.startsWith(SETS[0].name)).toBe(true);
  });
});
