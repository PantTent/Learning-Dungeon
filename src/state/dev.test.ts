import { describe, expect, it } from 'vitest';
import { CLASSES } from '../data/classes';
import { PLACES } from '../data/areas';
import { canUse } from '../data/items';
import { derive, isDevCode, LEVEL_CAP, makeDeveloper, newProfile } from './profile';

describe('developer hero', () => {
  it('only accepts the secret code', () => {
    expect(isDevCode('ciscodog')).toBe(true);
    expect(isDevCode(' CiscoDog ')).toBe(true);
    expect(isDevCode('cisco')).toBe(false);
    expect(isDevCode('')).toBe(false);
  });

  it.each(CLASSES.map((c) => c.id))('unlocks everything for %s', (id) => {
    const p = newProfile('Dev', id);
    const before = derive(p);
    makeDeveloper(p);
    const cls = CLASSES.find((c) => c.id === id)!;
    expect(p.dev).toBe(true);
    expect(p.level).toBe(LEVEL_CAP);
    expect(p.maxFloor).toBe(PLACES.length - 1);
    expect(p.streak).toBe(3);
    expect(cls.skills.every((s) => s.unlock <= p.level)).toBe(true);
    for (const item of Object.values(p.equipped)) {
      expect(item!.rarity).toBe('mythic');
      expect(canUse(cls, item!)).toBe(true);
    }
    const after = derive(p);
    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    expect(p.hp).toBe(after.maxHp);
  });
});
