import { blocked, buildDesert, buildForest, buildJungle, buildMountains, buildSavanna, buildSeashore, reachable } from './world';

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

describe('the Desert map', () => {
  const m = buildDesert();

  it('is the same every time, with 5 fossil mounds, palms, an oasis and tougher animals', () => {
    expect(JSON.stringify(buildDesert())).toBe(JSON.stringify(m));
    expect(m.rocks.filter((r) => r.puppy).length).toBe(5);
    expect(m.fruit.length).toBeGreaterThanOrEqual(4);
    expect(m.spawns.length).toBeGreaterThanOrEqual(10);
    expect(m.spawns.every((s) => s.level >= 4 && s.level <= 6)).toBe(true);
    expect(m.oasis).toBeDefined();
  });

  it('uses its own names, so nothing found in the Jungle counts here', () => {
    const j = buildJungle();
    const ids = (x: typeof m) => [...x.rocks, ...x.fruit, ...x.golden, x.stump].map((p) => p.id);
    expect(ids(m).filter((id) => ids(j).includes(id))).toEqual([]);
  });

  it('everything important can be walked to from the start', () => {
    const oasisEdge = { x: m.oasis!.x, y: m.oasis!.y + m.oasis!.r + 30 };
    for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.burrows.outside, m.helper!, oasisEdge]) {
      expect(reachable(m, m.start, p), JSON.stringify(p)).toBe(true);
    }
  });

  it('the secret tent is closed off: only the burrow gets you in', () => {
    expect(reachable(m, m.start, m.stump)).toBe(false);
    expect(reachable(m, m.burrows.inside, m.stump)).toBe(true);
  });
});

describe('the Enchanted Forest and the Snowy Mountains', () => {
  for (const [name, build, lo, hi] of [
    ['Forest', buildForest, 7, 9],
    ['Mountains', buildMountains, 10, 12],
  ] as const) {
    const m = build();
    it(`${name}: same every time, 5 hidden finds, a spring, tougher animals`, () => {
      expect(JSON.stringify(build())).toBe(JSON.stringify(m));
      expect(m.rocks.filter((r) => r.puppy).length).toBe(5);
      expect(m.fruit.length).toBeGreaterThanOrEqual(4);
      expect(m.spawns.length).toBeGreaterThanOrEqual(10);
      expect(m.spawns.every((s) => s.level >= lo && s.level <= hi)).toBe(true);
    });
    it(`${name}: everything important can be walked to, the secret only through the burrow`, () => {
      const edge = { x: m.oasis!.x, y: m.oasis!.y + m.oasis!.r + 30 };
      for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.burrows.outside, m.helper!, edge]) {
        expect(reachable(m, m.start, p), JSON.stringify(p)).toBe(true);
      }
      expect(reachable(m, m.start, m.stump)).toBe(false);
      expect(reachable(m, m.burrows.inside, m.stump)).toBe(true);
    });
  }

  it('every land uses its own names', () => {
    const ids = [buildJungle, buildDesert, buildForest, buildMountains, buildSeashore, buildSavanna].flatMap((b) => {
      const m = b();
      return [...m.rocks, ...m.fruit, ...m.golden, m.stump].map((p) => p.id);
    });
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the Sunny Seashore', () => {
  const m = buildSeashore();
  it('has 5 turtle nests, coconut palms, a lagoon, and the sea you cannot walk into', () => {
    expect(JSON.stringify(buildSeashore())).toBe(JSON.stringify(m));
    expect(m.rocks.filter((r) => r.puppy).length).toBe(5);
    expect(m.spawns.every((s) => s.level >= 13 && s.level <= 15)).toBe(true);
    expect(blocked(m, { x: 500, y: m.waterY! + 20 }, 14, new Set())).toBe(true);
    for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.start]) expect(p.y).toBeLessThan(m.waterY! - 30);
  });
  it('everything important can be walked to, the secret only through the burrow', () => {
    const edge = { x: m.oasis!.x, y: m.oasis!.y + m.oasis!.r + 30 };
    for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.burrows.outside, m.helper!, edge]) {
      expect(reachable(m, m.start, p), JSON.stringify(p)).toBe(true);
    }
    expect(reachable(m, m.start, m.stump)).toBe(false);
    expect(reachable(m, m.burrows.inside, m.stump)).toBe(true);
  });
});

describe('the Savanna', () => {
  const m = buildSavanna();
  it('has 5 hidden calves, baobabs, a watering hole and the toughest animals', () => {
    expect(JSON.stringify(buildSavanna())).toBe(JSON.stringify(m));
    expect(m.rocks.filter((r) => r.puppy).length).toBe(5);
    expect(m.fruit.length).toBeGreaterThanOrEqual(4);
    expect(m.spawns.every((s) => s.level >= 16 && s.level <= 18)).toBe(true);
  });
  it('everything important can be walked to, the secret only through the burrow', () => {
    const edge = { x: m.oasis!.x, y: m.oasis!.y + m.oasis!.r + 30 };
    for (const p of [...m.rocks, ...m.fruit, ...m.golden, ...m.spawns, m.boss, m.burrows.outside, m.helper!, edge]) {
      expect(reachable(m, m.start, p), JSON.stringify(p)).toBe(true);
    }
    expect(reachable(m, m.start, m.stump)).toBe(false);
    expect(reachable(m, m.burrows.inside, m.stump)).toBe(true);
  });
});
