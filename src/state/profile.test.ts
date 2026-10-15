import { getClass } from '../data/classes';
import { makeItem, type Rarity } from '../data/items';
import { derive, equip, gainXp, newProfile, LEVEL_CAP } from './profile';

describe('gear', () => {
  it('two-handed weapon removes the off-hand, and an off-hand removes a 2H weapon', () => {
    const p = newProfile('T', 'warrior');
    expect(p.equipped.offhand).toBeDefined();
    const gs = makeItem(3, { base: 'greatsword', rarity: 'rare' });
    p.bag.push(gs);
    expect(equip(p, gs)).toBe(true);
    expect(p.equipped.mainhand?.id).toBe(gs.id);
    expect(p.equipped.offhand).toBeUndefined();
    expect(p.bag.length).toBe(2); // old sword + old shield

    const shield = p.bag.find((i) => i.base === 'shield')!;
    expect(equip(p, shield)).toBe(true);
    expect(p.equipped.offhand?.id).toBe(shield.id);
    expect(p.equipped.mainhand).toBeUndefined();
  });

  it('rings fill both ring slots', () => {
    const p = newProfile('T', 'mage');
    const r1 = makeItem(2, { base: 'ring' });
    const r2 = makeItem(2, { base: 'ring' });
    p.bag.push(r1, r2);
    equip(p, r1);
    equip(p, r2);
    expect(p.equipped.ring1?.id).toBe(r1.id);
    expect(p.equipped.ring2?.id).toBe(r2.id);
  });

  it('levels cap at 10', () => {
    const p = newProfile('T', 'ranger');
    gainXp(p, 1e6);
    expect(p.level).toBe(LEVEL_CAP);
    expect(p.hp).toBe(derive(p).maxHp);
  });
});

describe('boss rule', () => {
  // Boss HP = 4.5 full hits; right = 1 hit, wrong = half a hit.
  it('needs exactly 4 of 5 right', () => {
    for (let right = 0; right <= 5; right++) {
      const unit = 14;
      const hp = (unit * 9) / 2;
      const dealt = right * unit + (5 - right) * (unit / 2);
      expect(dealt >= hp).toBe(right >= 4);
    }
  });
});

describe('leveling and loot balance', () => {
  it('each level gives +2 main stat and +1 to the others', () => {
    for (const id of ['warrior', 'mage', 'ranger', 'paladin', 'necromancer', 'druid', 'demonologist']) {
      const p = newProfile('T', id);
      const a = derive(p);
      p.level = 2;
      const b = derive(p);
      const main = getClass(id).primary;
      for (const k of ['str', 'int', 'agi', 'sta'] as const) expect(b[k] - a[k]).toBe(k === main ? 2 : 1);
    }
  });

  it('rangers can only use bows', () => {
    const ranger = getClass('ranger');
    expect(ranger.weapons).toEqual(['bow']);
    for (let i = 0; i < 300; i++) {
      const it = makeItem(3, { cls: ranger, boss: true, base: undefined });
      if (it.dmg) expect(it.base).toBe('bow');
    }
  });

  it('low level items have small stats, higher rarity has more', () => {
    const total = (r: Rarity, ilvl: number) => {
      let sum = 0;
      for (let i = 0; i < 300; i++) {
        const it = makeItem(ilvl, { rarity: r, base: 'hands' });
        sum += Object.entries(it.stats).reduce((s, [k, v]) => s + (k === 'armor' ? v / 2 : k === 'crit' ? v * 2 : v), 0);
      }
      return sum / 300;
    };
    expect(total('uncommon', 3)).toBeLessThanOrEqual(3);
    expect(total('legendary', 3)).toBeLessThanOrEqual(7);
    const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    for (let i = 1; i < order.length; i++) expect(total(order[i], 8)).toBeGreaterThan(total(order[i - 1], 8));
  });
});
