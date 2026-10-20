import { hasFullGame, isUnlockCode, unlockEverything, type Ownership } from './ownership';

describe('family unlock code', () => {
  it('rcaf unlocks every full game, without developer mode', () => {
    expect(isUnlockCode('rcaf')).toBe(true);
    expect(isUnlockCode(' RCAF ')).toBe(true);
    expect(isUnlockCode('ciscodog')).toBe(false);
    const o: Ownership = { bought: [] };
    expect(hasFullGame(o, 'dungeon')).toBe(false);
    unlockEverything(o);
    expect(hasFullGame(o, 'dungeon')).toBe(true);
    expect(hasFullGame(o, 'farm')).toBe(true);
    expect(o.devAll).toBeFalsy();
  });
});
