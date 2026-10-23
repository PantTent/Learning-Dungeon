import { clearErrors, crumb, loadErrors, recordError, reportText, shortStack } from './errorLog';

// A tiny stand-in for the browser's localStorage.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, v),
  removeItem: (k) => void store.delete(k),
};

describe('error log', () => {
  beforeEach(() => clearErrors());

  it('saves errors with the screens open and what happened just before', () => {
    crumb('open Dungeon', 0);
    crumb('open chest', 1000);
    const e = recordError('error', "Cannot read properties of undefined (reading 'id')", 'TypeError: x\n    at openChest (https://site/assets/main-abc.js:1:2)', ['Dungeon'], 5000);
    expect(e).toBeDefined();
    const list = loadErrors();
    expect(list).toHaveLength(1);
    expect(list[0].scenes).toEqual(['Dungeon']);
    expect(list[0].crumbs.join('\n')).toContain('open chest');
    expect(list[0].stack).toContain('(main-abc.js:1:2)');
    expect(list[0].stack).not.toContain('https://');
  });

  it('does not save the same error over and over (a broken screen errors every frame)', () => {
    recordError('error', 'boom', undefined, [], 1000);
    expect(recordError('error', 'boom', undefined, [], 2000)).toBeUndefined();
    recordError('error', 'boom', undefined, [], 9000);
    expect(loadErrors()).toHaveLength(2);
  });

  it('keeps only the newest dozen', () => {
    for (let i = 0; i < 20; i++) recordError('error', `e${i}`, undefined, [], i * 10000);
    const list = loadErrors();
    expect(list).toHaveLength(12);
    expect(list[11].message).toBe('e19');
  });

  it('writes a readable report with the note, newest first', () => {
    recordError('error', 'first', undefined, ['Farm'], 1000);
    recordError('freeze', 'second', undefined, ['Dungeon'], 60000);
    const r = reportText(loadErrors(), 'It froze opening a chest', 'Android tablet', 70000);
    expect(r).toContain('What happened: It froze opening a chest');
    expect(r.indexOf('second')).toBeLessThan(r.indexOf('first'));
    expect(r).toContain('FREEZE');
    expect(reportText([], '', 'x')).toContain('No errors were saved');
  });

  it('shortens stacks to a few lines', () => {
    const s = shortStack(Array.from({ length: 20 }, (_, i) => `at f${i} (http://localhost:5173/src/a.ts:${i}:1)`).join('\n'))!;
    expect(s.split('\n')).toHaveLength(7);
    expect(s).toContain('(a.ts:0:1)');
  });
});
