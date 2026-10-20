import { makeEnemy, makeRare, rollRareTier } from './enemies';

describe('rare spawns', () => {
  it('rolls 5% Legendary, 10% Elite, 15% Rare, else normal', () => {
    expect(rollRareTier(0.01)).toBe(3);
    expect(rollRareTier(0.049)).toBe(3);
    expect(rollRareTier(0.05)).toBe(2);
    expect(rollRareTier(0.149)).toBe(2);
    expect(rollRareTier(0.15)).toBe(1);
    expect(rollRareTier(0.299)).toBe(1);
    expect(rollRareTier(0.3)).toBeUndefined();
    expect(rollRareTier(0.99)).toBeUndefined();
  });

  it('rarer tiers are tougher and give more', () => {
    const base = makeEnemy('rat', 5);
    let last = base;
    for (const t of [1, 2, 3] as const) {
      const r = makeRare(base, t);
      expect(r.rare).toBe(t);
      expect(r.maxHp).toBeGreaterThan(last.maxHp);
      expect(r.hp).toBe(r.maxHp);
      expect(r.xp).toBeGreaterThan(last.xp);
      expect(r.gold).toBeGreaterThan(last.gold);
      last = r;
    }
  });
});
