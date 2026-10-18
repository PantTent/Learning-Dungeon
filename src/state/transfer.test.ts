import { applySave, collectSave, decodeSave, describeSave, exportSave } from './transfer';

// Node has no localStorage: a small in-memory one.
const mem = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() {
      return mem.size;
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  },
});

describe('move my save', () => {
  beforeEach(() => mem.clear());

  it('round-trips every saved game and setting, and nothing else', async () => {
    const heroes = [{ name: 'Sam', level: 12, bag: Array.from({ length: 30 }, (_, i) => ({ id: `item${i}`, name: 'Iron Sword of the Owl' })) }];
    localStorage.setItem('learning-dungeon.profiles.v1', JSON.stringify(heroes));
    localStorage.setItem('learning-farm.save.v1', JSON.stringify({ farmer: 'Sam', coins: 500 }));
    localStorage.setItem('learning-arcade.games', JSON.stringify({ free: 'dungeon', bought: [] }));
    localStorage.setItem('learning-dungeon.lang', 'fr');
    localStorage.setItem('someone-else', 'keep me');
    const code = await exportSave();
    expect(code.startsWith('LD1.z.')).toBe(true);
    expect(code.length).toBeLessThan(JSON.stringify(collectSave()).length);

    // Another device with its own saves.
    mem.clear();
    localStorage.setItem('learning-dungeon.profiles.v1', '[]');
    localStorage.setItem('learning-farm.save.v1', '{"farmer":"Old"}');
    localStorage.setItem('someone-else', 'keep me');
    const values = await decodeSave(`  ${code.slice(0, 20)}\n${code.slice(20)} `);
    expect(describeSave(values)).toEqual({ heroes: ['Sam (12)'], farm: 'Sam' });
    applySave(values);
    expect(JSON.parse(localStorage.getItem('learning-dungeon.profiles.v1')!)[0].name).toBe('Sam');
    expect(JSON.parse(localStorage.getItem('learning-farm.save.v1')!).coins).toBe(500);
    expect(localStorage.getItem('learning-dungeon.lang')).toBe('fr');
    expect(localStorage.getItem('someone-else')).toBe('keep me');
  });

  it('rejects things that are not save codes', async () => {
    await expect(decodeSave('hello')).rejects.toThrow();
    await expect(decodeSave('LD1.z.notbase64!!')).rejects.toThrow();
    const fake = `LD1.r.${btoa(JSON.stringify({ evil: 'x' }))}`;
    await expect(decodeSave(fake)).rejects.toThrow();
  });
});
