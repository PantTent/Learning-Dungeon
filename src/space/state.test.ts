import {
  addCargo, adminCost, alienReward, base, canAfford, cargoCap, cargoTotal, fuelCap, mineYield, newSpace, partCost, produce,
  rollMineral, shieldHits, travel, tripCheck, unload, upgradeAdmin, upgradePart, upgradePlant,
} from './state';
import { MINERAL_IDS, PLANETS, STARTS, toF } from './data';

const MIN = 60000;

describe('Learning Space rules', () => {
  it('starts on the chosen planet with a level 1 ship and empty storage', () => {
    const s = newSpace('Ava', 4, 'mars', 0);
    expect(s.at).toBe('mars');
    expect(s.world).toBe(1);
    expect(s.visited).toEqual(['mars']);
    expect(Object.values(s.ship).every((v) => v === 1)).toBe(true);
    expect(MINERAL_IDS.every((m) => s.minerals[m] === 0)).toBe(true);
  });

  it('fuel plants make fuel over time, up to what the tanks hold', () => {
    const s = newSpace('Ava', 4, 'earth', 0);
    produce(s, 5 * MIN);
    expect(base(s).lox).toBeCloseTo(20);
    expect(base(s).ch4).toBeCloseTo(20);
    produce(s, 600 * MIN);
    expect(base(s).lox).toBe(fuelCap(1));
  });

  it('Mercury makes 50% more fuel', () => {
    const s = newSpace('Ava', 4, 'mercury', 0);
    produce(s, 5 * MIN);
    expect(base(s).lox).toBeCloseTo(30);
  });

  it('mining: right answers give all, wrong ones half; skills and rich asteroids add more', () => {
    const e = newSpace('Ava', 4, 'venus', 0);
    for (let i = 0; i < 50; i++) {
      const right = mineYield(e, 'cu', false, true);
      expect(right).toBeGreaterThanOrEqual(4);
      expect(right).toBeLessThanOrEqual(5);
      expect(mineYield(e, 'cu', false, false)).toBeLessThan(right + 1);
      expect(mineYield(e, 'cu', true, true)).toBeGreaterThanOrEqual(12);
    }
    const mars = newSpace('Ava', 4, 'mars', 0);
    expect(Math.min(...Array.from({ length: 30 }, () => mineYield(mars, 'fe', false, true)))).toBeGreaterThanOrEqual(8);
  });

  it('the hold has a limit, and landing moves everything into storage', () => {
    const s = newSpace('Ava', 4, 'earth', 0);
    expect(addCargo(s, 'fe', 20)).toBe(20);
    expect(addCargo(s, 'au', 20)).toBe(cargoCap(1) - 20);
    expect(cargoTotal(s)).toBe(cargoCap(1));
    const moved = unload(s);
    expect(moved.fe).toBe(20);
    expect(s.minerals.fe).toBe(20);
    expect(cargoTotal(s)).toBe(0);
  });

  it('upgrades cost minerals and stop at the max', () => {
    const s = newSpace('Ava', 4, 'earth', 0);
    expect(upgradePart(s, 'engine')).toBe(false);
    s.minerals.fe = 100;
    s.minerals.ni = 100;
    expect(canAfford(s, partCost('engine', 2))).toBe(true);
    expect(upgradePart(s, 'engine')).toBe(true);
    expect(s.ship.engine).toBe(2);
    expect(s.minerals.fe).toBe(92);
    expect(partCost('engine', 6).au).toBe(3);
    // Plants are limited by the command center level.
    s.minerals.cu = 100;
    expect(upgradePlant(s, 'lox', 0)).toBe(true);
    expect(upgradePlant(s, 'lox', 0)).toBe(false);
    Object.assign(s.minerals, { fe: 100, al: 100, ag: 100, au: 100 });
    expect(adminCost(2)).toEqual({ fe: 12, al: 8, ag: 4, au: 1 });
    expect(upgradeAdmin(s, 0)).toBe(true);
    expect(upgradePlant(s, 'lox', 0)).toBe(true);
  });

  it('traveling to a new planet needs fuel and ship levels, and makes it the next world', () => {
    const s = newSpace('Ava', 4, 'mars', 0);
    expect(tripCheck(s, 'earth', 0).ok).toBe(false);
    s.ship.engine = 2;
    s.ship.tank = 2;
    produce(s, 15 * MIN);
    const c = tripCheck(s, 'earth', 15 * MIN);
    expect(c.isNew).toBe(true);
    expect(c.world).toBe(2);
    expect(c.ok).toBe(true);
    expect(travel(s, 'earth', 15 * MIN)).toBe(true);
    expect(s.at).toBe('earth');
    expect(s.world).toBe(2);
    expect(s.visited).toEqual(['mars', 'earth']);
    // Wherever you start, the second planet is world 2, the third world 3.
    expect(tripCheck(s, 'venus', 15 * MIN).world).toBe(3);
    // Going back to a planet you know is cheaper and is not a new world.
    expect(tripCheck(s, 'mars', 15 * MIN).isNew).toBe(false);
    expect(tripCheck(s, 'mars', 15 * MIN).world).toBe(2);
  });

  it('the gas giants and Pluto are not open yet', () => {
    const s = newSpace('Ava', 4, 'earth', 0);
    Object.assign(s.ship, { engine: 10, tank: 10 });
    produce(s, 1000 * MIN);
    expect(tripCheck(s, 'jupiter', 1000 * MIN).closed).toBe(true);
    expect(tripCheck(s, 'jupiter', 1000 * MIN).ok).toBe(false);
  });

  it('Venus shields are stronger', () => {
    expect(shieldHits(newSpace('A', 4, 'venus', 0))).toBeGreaterThan(shieldHits(newSpace('A', 4, 'earth', 0)));
  });

  it('aliens drop some minerals, and asteroids are mostly common minerals', () => {
    const s = newSpace('A', 4, 'earth', 0);
    const r = alienReward(s);
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const m = rollMineral();
      counts[m] = (counts[m] ?? 0) + 1;
    }
    expect(counts.fe).toBeGreaterThan(counts.au * 3);
  });

  it('planet data is complete', () => {
    expect(PLANETS.map((p) => p.id)).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
    expect(STARTS.map((s) => s.planet)).toEqual(['mercury', 'venus', 'earth', 'mars']);
    for (const p of PLANETS) {
      expect(p.young.length).toBe(3);
      expect(p.older.length).toBe(3);
      for (const f of [...p.young, ...p.older]) {
        expect(f.en.length).toBeGreaterThan(10);
        expect(f.fr.length).toBeGreaterThan(10);
        expect(f.fr).not.toMatch(/ [?!]/);
      }
    }
    expect(toF(15)).toBe(59);
    expect(toF(-65)).toBe(-85);
    expect(toF(464)).toBe(867);
  });
});
