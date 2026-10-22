import { angleBetween, heliocentric } from './orbits';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('real planet positions', () => {
  // At an opposition (or Venus/Mercury inferior conjunction) the planet and
  // Earth line up with the Sun, so their heliocentric longitudes match.
  const lineUps: [string, string][] = [
    ['mars', '2025-01-16'], // Mars opposition
    ['jupiter', '2024-12-07'], // Jupiter opposition
    ['saturn', '2025-09-21'], // Saturn opposition
    ['venus', '2025-03-23'], // Venus inferior conjunction
    ['mars', '2022-12-08'], // Mars opposition
    ['uranus', '2024-11-17'], // Uranus opposition
    ['neptune', '2025-09-23'], // Neptune opposition
  ];
  it.each(lineUps)('%s lines up with Earth on %s', (planet, day) => {
    const p = heliocentric(planet, at(day));
    const e = heliocentric('earth', at(day));
    expect(angleBetween(p.lon, e.lon)).toBeLessThan(3);
  });

  it('Earth is near perihelion in early January and aphelion in early July', () => {
    expect(heliocentric('earth', at('2026-01-03')).r).toBeCloseTo(0.983, 2);
    expect(heliocentric('earth', at('2026-07-06')).r).toBeCloseTo(1.017, 2);
  });

  it('planets move a little every day, inner ones faster', () => {
    const d1 = at('2026-10-01');
    const d2 = at('2026-10-02');
    const step = (p: string) => angleBetween(heliocentric(p, d1).lon, heliocentric(p, d2).lon);
    expect(step('mercury')).toBeGreaterThan(step('earth'));
    expect(step('earth')).toBeGreaterThan(step('jupiter'));
    expect(step('earth')).toBeCloseTo(0.986, 1);
  });
});
