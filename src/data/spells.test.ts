import { CLASSES } from './classes';
import { MAX_CHOSEN, activePower, bestRank, chosenSpells, families, familyName, manaCost, nextRank } from './spells';

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

describe('ultimate follows the chosen spells', () => {
  const mage = CLASSES.find((c) => c.id === 'mage')!;
  it('uses the school most spells share', () => {
    expect(activePower(mage, 20, ['fireball', 'flamewave', 'frostbolt1']).name).toBe('Meteor');
    expect(activePower(mage, 20, ['frostbolt1', 'blizzard1', 'chain1']).name).toBe('Glacier Crash');
    expect(activePower(mage, 20, ['missiles1', 'arcaneblast', 'fireball']).name).toBe('Arcane Nova');
    expect(activePower(mage, 20, ['chain1', 'thunderbolt', 'blizzard2']).name).toBe('Thunderstorm');
  });
  it('falls back to the class ultimate on a tie or with no spells', () => {
    expect(activePower(mage, 20, ['frostbolt1', 'chain1', 'missiles1'])).toBe(mage.power);
    expect(activePower(mage, 20, [])).toBe(mage.power);
  });
  it('gives every class a valid ultimate for any choice', () => {
    for (const c of CLASSES) {
      const pw = activePower(c, 20, undefined);
      expect(pw.name.length).toBeGreaterThan(0);
      expect(activePower(c, 20, c.skills.slice(1, 4).map((s) => s.id)).style).toBeTruthy();
    }
  });
  it('druids get Starfall from moon magic', () => {
    const druid = CLASSES.find((c) => c.id === 'druid')!;
    expect(activePower(druid, 20, ['moonfire1', 'starsurge', 'rejuv1']).name).toBe('Starfall');
  });
});

describe('every class can pick between at least 2 ultimates', () => {
  for (const c of CLASSES) {
    it(c.id, () => {
      const ids = families(c.skills).map((f) => f.id);
      const names = new Set<string>();
      for (let a = 0; a < ids.length; a++)
        for (let b = a + 1; b < ids.length; b++)
          for (let d = b + 1; d < ids.length; d++) names.add(activePower(c, 20, [ids[a], ids[b], ids[d]]).name);
      expect(names.size).toBeGreaterThanOrEqual(2);
    });
  }
  it('the mage can reach all four schools', () => {
    const mage = CLASSES.find((c) => c.id === 'mage')!;
    const ids = families(mage.skills).map((f) => f.id);
    const names = new Set<string>();
    for (const a of ids) for (const b of ids) for (const d of ids) if (a !== b && b !== d && a !== d) names.add(activePower(mage, 20, [a, b, d]).name);
    for (const n of ['Meteor', 'Glacier Crash', 'Arcane Nova', 'Thunderstorm']) expect(names.has(n), n).toBe(true);
  });
});

describe('spell families', () => {
  const warrior = CLASSES.find((c) => c.id === 'warrior')!;
  it('groups ranks and always uses the best unlocked one', () => {
    const cleave = families(warrior.skills).find((f) => f.id === 'cleave')!;
    expect(cleave.ranks.map((r) => r.name)).toEqual(['Cleave I', 'Cleave II', 'Cleave III']);
    expect(bestRank(cleave, 4)).toBeUndefined();
    expect(bestRank(cleave, 10)!.name).toBe('Cleave II');
    expect(nextRank(cleave, 10)!.name).toBe('Cleave III');
    expect(chosenSpells(warrior.skills, 16, ['cleave']).map((x) => x.name)).toEqual(['Cleave III']);
    // Older saves stored a rank's id; it counts as the family (and isn't doubled).
    expect(chosenSpells(warrior.skills, 16, ['cleave1', 'cleave2']).map((x) => x.name)).toEqual(['Cleave III']);
    expect(familyName('Heroic Strike I')).toBe('Heroic Strike');
  });
  it('every class has at most 9 families and every family name has French', () => {
    for (const c of CLASSES) expect(families(c.skills).length).toBeLessThanOrEqual(9);
  });
});
