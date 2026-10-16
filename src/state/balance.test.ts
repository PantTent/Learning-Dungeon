import { CLASSES } from '../data/classes';
import { makeEnemy } from '../data/enemies';
import { makeItem } from '../data/items';
import { derive, newProfile } from './profile';

/** Average right answers needed to beat a same-level single monster, with typical gear. */
function hitsToKill(classId: string, level: number): number {
  const p = newProfile('T', classId);
  p.level = level;
  const cls = CLASSES.find((c) => c.id === classId)!;
  // Typical uncommon weapon for the level (and off-hand if the class starts with one).
  p.equipped.mainhand = makeItem(level, { base: cls.startWeapon, rarity: 'uncommon' });
  if (cls.startOffhand) p.equipped.offhand = makeItem(level, { base: cls.startOffhand, rarity: 'uncommon' });
  const s = derive(p);
  let total = 0;
  const ids = ['slime', 'rat', 'bat', 'mushroom', 'spider', 'goblin', 'wolf', 'skeleton'];
  for (const id of ids) {
    const e = makeEnemy(id, level);
    const hit = Math.max(1, s.power - e.armor * 0.4);
    total += e.maxHp / hit;
  }
  return total / ids.length;
}

describe('class balance', () => {
  it('every class needs about the same number of hits (no class falls behind)', () => {
    for (const lv of [1, 3, 5, 7, 10, 13, 16, 20]) {
      // Average a few runs because gear rolls are random.
      const hits = CLASSES.map((c) => {
        let t = 0;
        for (let i = 0; i < 20; i++) t += hitsToKill(c.id, lv);
        return t / 20;
      });
      const min = Math.min(...hits);
      const max = Math.max(...hits);
      expect(min, `level ${lv}`).toBeGreaterThan(1.7);
      expect(max, `level ${lv}`).toBeLessThan(3.2);
      expect(max / min, `level ${lv}: ${hits.map((h) => h.toFixed(2))}`).toBeLessThan(1.2);
    }
  });
});
