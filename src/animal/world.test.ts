import { blocked, buildJungle, reachable } from './world';

describe('the Jungle map', () => {
  const m = buildJungle();

  it('is the same every time, with 5 puppy rocks, fruit trees, golden acorns and wild animals', () => {
    expect(JSON.stringify(buildJungle())).toBe(JSON.stringify(m));
    expect(m.rocks.filter((r) => r.puppy).length).toBe(5);
    expect(m.fruit.length).toBeGreaterThanOrEqual(4);
    expect(m.golden.length).toBeGreaterThanOrEqual(3);
    expect(m.spawns.length).toBeGreaterThanOrEqual(10);
  });

  it('everything important can be walked to from the start', () => {
    for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.burrows.outside]) {
      expect(reachable(m, m.start, p), JSON.stringify(p)).toBe(true);
    }
  });

  it('the secret glade is closed off: only the burrow gets you in', () => {
    expect(reachable(m, m.start, m.stump)).toBe(false);
    expect(reachable(m, m.burrows.inside, m.stump)).toBe(true);
  });

  it('rocks block the way until they break', () => {
    const r = m.rocks[0];
    expect(blocked(m, r, 14, new Set([r.id]))).toBe(true);
    expect(blocked(m, r, 14, new Set())).toBe(false);
  });
});
