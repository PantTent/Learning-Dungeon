import { allReachable, findPath, FLOOR, generateFloor } from './mapgen';

describe('map generation', () => {
  it('never lets a chest (or camp object) cut off part of the floor', () => {
    for (let i = 0; i < 300; i++) {
      const m = generateFloor(i % 3 === 0);
      const solid = new Set([...m.chests, ...(m.camp ? [m.camp.fire, m.camp.fountain, m.camp.merchant, m.camp.dummy] : [])].map((p) => p.y * m.w + p.x));
      expect(allReachable(m, m.start, solid)).toBe(true);
      // The exit can always be reached around the chests.
      expect(findPath(m, m.start, m.exit, (p) => solid.has(p.y * m.w + p.x))).not.toBeNull();
    }
  });

  it('walks diagonally without squeezing past wall corners', () => {
    const F = FLOOR;
    const W = 1 - FLOOR;
    const make = (tiles: number[][]) => ({ w: tiles[0].length, h: tiles.length, tiles, rooms: [], start: { x: 0, y: 0 }, exit: { x: 0, y: 0 }, chests: [], spawns: [] });
    // Open floor: one diagonal step.
    expect(findPath(make([[F, F], [F, F]]), { x: 0, y: 0 }, { x: 1, y: 1 }, () => false)!.length).toBe(1);
    // A wall at the corner: has to go around, no cutting through.
    const m = make([[F, W, F], [F, F, F]]);
    expect(findPath(m, { x: 0, y: 0 }, { x: 2, y: 0 }, () => false)!.length).toBe(4);
  });
});
