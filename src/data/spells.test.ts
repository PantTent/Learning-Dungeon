import { CLASSES } from './classes';
import { MAX_CHOSEN, chosenSpells, manaCost } from './spells';

describe('spellbooks', () => {
  for (const c of CLASSES) {
    it(`${c.name}: 10 spells, one every 2 levels, free basic attack`, () => {
      expect(c.skills.length).toBe(10);
      expect(c.skills[0].unlock).toBe(1);
      expect(c.skills[0].mp).toBe(0);
      c.skills.forEach((s, i) => {
        expect(s.unlock).toBe(i === 0 ? 1 : 1 + i * 2);
        if (i > 0) expect(s.mp).toBeGreaterThan(0);
      });
      expect(new Set(c.skills.map((s) => s.id)).size).toBe(10);
      // At level 7 a hero already has 3 spells to choose from (plus the basic attack).
      expect(c.skills.filter((s) => s.unlock <= 7).length - 1).toBeGreaterThanOrEqual(3);
    });
  }

  it('the mage has fire, ice, arcane and lightning, including area spells', () => {
    const mage = CLASSES.find((c) => c.id === 'mage')!;
    for (const fx of ['fire', 'frost', 'arcane', 'lightning']) expect(mage.skills.some((s) => s.fx === fx), fx).toBe(true);
    expect(mage.skills.filter((s) => s.kind === 'aoe').length).toBeGreaterThanOrEqual(3);
  });

  it('stronger and later spells cost more mana', () => {
    expect(manaCost('damage', 2, 9)).toBeGreaterThan(manaCost('damage', 1.2, 3));
    expect(manaCost('aoe', 1, 7)).toBeGreaterThan(manaCost('damage', 1, 7));
  });

  it('battle slots: up to 3, defaults to the newest unlocked', () => {
    const mage = CLASSES.find((c) => c.id === 'mage')!;
    expect(chosenSpells(mage.skills, 1, undefined)).toEqual([]);
    expect(chosenSpells(mage.skills, 9, undefined).map((s) => s.id)).toEqual(['missiles1', 'chain1', 'fireball']);
    expect(chosenSpells(mage.skills, 9, ['frostbolt1', 'blizzard1']).map((s) => s.id)).toEqual(['frostbolt1']);
    expect(chosenSpells(mage.skills, 20, ['a', 'frostbolt1', 'chain2', 'arcaneblast', 'fireball']).length).toBeLessThanOrEqual(MAX_CHOSEN);
  });
});
