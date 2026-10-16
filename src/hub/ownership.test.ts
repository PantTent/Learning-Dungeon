import { ALL_GAMES, unlockPrice } from './games';
import { hasFullGame, loadOwnership, unlockGame } from './ownership';

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

  it('new players have the free version of every game', () => {
    const o = loadOwnership();
    expect(hasFullGame(o, 'dungeon')).toBe(false);
    expect(hasFullGame(o, 'farm')).toBe(false);
  });

  it('heroes made after the first check do not unlock the full game', () => {
    loadOwnership();
    localStorage.setItem('learning-dungeon.profiles.v1', JSON.stringify([{ id: 'new' }]));
    expect(hasFullGame(loadOwnership(), 'dungeon')).toBe(false);
  });

  it('players who already had heroes keep the full Learning Dungeon', () => {
    localStorage.setItem('learning-dungeon.profiles.v1', JSON.stringify([{ id: 'x' }]));
    const o = loadOwnership();
    expect(hasFullGame(o, 'dungeon')).toBe(true);
    expect(hasFullGame(o, 'farm')).toBe(false);
  });

  it('unlocking one game, the bundle, and the developer code', () => {
    const o = loadOwnership();
    unlockGame(o, 'farm');
    expect(hasFullGame(loadOwnership(), 'farm')).toBe(true);
    expect(hasFullGame(loadOwnership(), 'dungeon')).toBe(false);
    unlockGame(o, ALL_GAMES);
    expect(hasFullGame(loadOwnership(), 'dungeon')).toBe(true);
    expect(hasFullGame({ bought: [], devAll: true }, 'anything')).toBe(true);
  });

  it('shows prices per language', () => {
    expect(unlockPrice('en')).toBe('$3.99');
    expect(unlockPrice('en', 'all')).toBe('$7.99');
    expect(unlockPrice('fr', 'all')).toBe('7,99\u00a0$');
  });
});
