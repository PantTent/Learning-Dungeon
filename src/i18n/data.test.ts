import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLASSES, type Fx } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { AREAS } from '../data/areas';
import { POTIONS } from '../data/potions';
import { BASE_NAME, makeItem, RARITY, SLOT_LABEL, STAT_LABEL, starterItem, weaponLabel, type BaseType, type Rarity } from '../data/items';
import { activePower, SCHOOL_POWERS, SPELL_LISTS } from '../data/spells';
import { WEAPON_NAMES } from '../scenes/shared';
import { FR_DATA } from './fr/data';
import { getLang, setLang, tr } from './index';
import { itemName } from './itemNames';

function dataStrings(): string[] {
  const out: string[] = [];
  for (const c of CLASSES) {
    out.push(c.name, c.role, c.blurb, c.power.name);
    if (c.summon) out.push(c.summon.name);
    for (const s of c.skills) out.push(s.name, s.desc);
    // Every ultimate a class can get, including class-flavored names.
    const fxs = new Set(c.skills.map((s) => s.fx));
    for (const fx of fxs) {
      const chosen = c.skills.filter((s) => s.fx === fx && s.unlock > 1).map((s) => s.id).slice(0, 3);
      out.push(activePower(c, 20, chosen).name);
    }
  }
  for (const list of Object.values(SPELL_LISTS)) for (const s of list) out.push(s.name, s.desc);
  for (const p of Object.values(SCHOOL_POWERS)) out.push(p!.name);
  for (const e of Object.values(ENEMIES)) out.push(e.name, e.verb);
  for (const a of AREAS) {
    out.push(a.name, ...a.floors.map((f) => f.name));
    const b = a.boss;
    out.push(b.name, b.shortName, b.lairName, b.lairSub, b.verb, b.lootName, ...b.intro);
  }
  for (const p of POTIONS) out.push(p.name);
  out.push(...Object.values(SLOT_LABEL), ...Object.values(STAT_LABEL), ...Object.values(RARITY).map((r) => r.name));
  out.push(...Object.values(WEAPON_NAMES), ...Object.values(BASE_NAME));
  for (const b of Object.keys(BASE_NAME) as BaseType[]) out.push(weaponLabel(b));
  return [...new Set(out)];
}

describe('French data dictionary', () => {
  it('has a French entry for every data string', () => {
    const missing = dataStrings().filter((s) => !FR_DATA[s]?.trim());
    expect(missing).toEqual([]);
  });

  it('covers every class-flavored ultimate', () => {
    // Spot-check the special names reached through activePower().
    for (const n of ['Starfall', 'Thunder Crash', 'Call of the Wild', 'Wrath of the Sun', 'Frozen Tomb', 'Void Rift']) {
      expect(FR_DATA[n]).toBeTruthy();
    }
    const fx: Fx[] = Object.keys(SCHOOL_POWERS) as Fx[];
    expect(fx.length).toBeGreaterThan(5);
  });
});

describe('French item names', () => {
  let prev: ReturnType<typeof getLang>;
  beforeAll(() => {
    prev = getLang();
    setLang('fr');
  });
  afterAll(() => setLang(prev));

  const bases = Object.keys(BASE_NAME) as BaseType[];
  const rarities = Object.keys(RARITY) as Rarity[];

  function check(name: string) {
    expect(name.trim().length).toBeGreaterThan(0);
    expect(name).not.toMatch(/undefined|null|NaN|\?|  /);
    expect(name.length).toBeLessThanOrEqual(40);
    // No English words left over.
    expect(name).not.toMatch(/\b(of|the|Old)\b|'s\b/);
  }

  it('builds a clean name for random items of every rarity and base', () => {
    for (let i = 0; i < 2000; i++) {
      const base = bases[i % bases.length];
      const rarity = rarities[Math.floor(i / bases.length) % rarities.length];
      const ilvl = 1 + (i % 20);
      const cls = i % 3 === 0 ? CLASSES[i % CLASSES.length] : undefined;
      const lootName = i % 2 ? "Gnarlroot's" : "Grukk's";
      const it = makeItem(ilvl, { base, rarity, cls, lootName });
      check(itemName(it));
    }
  });

  it('is stable for the same item', () => {
    const it = makeItem(12, { rarity: 'epic', base: 'sword' });
    expect(itemName(it)).toBe(itemName({ ...it }));
  });

  it('names starter items', () => {
    for (const b of bases) {
      const n = itemName(starterItem(b));
      check(n);
      expect(n).toMatch(/^Vie(ux|il|ille|illes) /);
    }
    expect(itemName(starterItem('sword'))).toBe('Vieille épée');
    expect(itemName(starterItem('staff'))).toBe('Vieux bâton');
    expect(itemName(starterItem('bow'))).toBe('Vieil arc');
  });

  it('reads naturally for legendary and mythic loot', () => {
    const leg = makeItem(10, { rarity: 'legendary', base: 'head', lootName: "Grukk's" });
    leg.name = "Grukk's Golden Helm";
    expect(itemName(leg)).toBe('Heaume doré de Grukk');
    const myth = makeItem(20, { rarity: 'mythic', base: 'axe', lootName: "Gnarlroot's" });
    myth.name = 'Eternal Axe of Gnarlroot';
    expect(itemName(myth)).toBe('Hache éternelle de Gnarlroot');
    const ep = makeItem(5, { rarity: 'rare', base: 'sword' });
    ep.name = 'Mighty Iron Sword of the Owl';
    expect(itemName(ep)).toBe('Épée puissante en fer du Hibou');
  });

  it('keeps English names in English', () => {
    setLang('en');
    const it = makeItem(5, { rarity: 'rare', base: 'bow' });
    expect(itemName(it)).toBe(it.name);
    expect(tr('Warrior')).toBe('Warrior');
    setLang('fr');
    expect(tr('Warrior')).toBe('Guerrier');
  });
});
