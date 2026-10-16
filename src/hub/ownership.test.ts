import { chooseFree, loadOwnership, owns, unlockGame } from './ownership';

// Tests run in Node: give them a small in-memory localStorage.
const mem = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  },
});

describe('game ownership', () => {
  beforeEach(() => localStorage.clear());

  it('new players pick exactly one free game', () => {
    const o = loadOwnership();
    expect(o.free).toBeUndefined();
    expect(owns(o, 'dungeon')).toBe(false);
    expect(chooseFree(o, 'dungeon')).toBe(true);
    expect(owns(o, 'dungeon')).toBe(true);
    expect(chooseFree(o, 'dungeon')).toBe(false);
    expect(loadOwnership().free).toBe('dungeon');
  });

  it('cannot pick a game that is not built yet', () => {
    expect(chooseFree(loadOwnership(), 'game2')).toBe(false);
  });

  it('players who already had heroes keep Learning Dungeon', () => {
    localStorage.setItem('learning-dungeon.profiles.v1', JSON.stringify([{ id: 'x' }]));
    expect(owns(loadOwnership(), 'dungeon')).toBe(true);
  });

  it('unlocking and the developer code', () => {
    const o = loadOwnership();
    unlockGame(o, 'game2');
    expect(owns(loadOwnership(), 'game2')).toBe(true);
    expect(owns({ bought: [], devAll: true }, 'game3')).toBe(true);
  });
});
