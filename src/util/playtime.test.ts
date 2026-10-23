import { addMinutes, cleanMinutes, clockText, isLocked, loadPlayTime, MAX_MINUTES, savePlayTime, setMinutes, spend, turnOff } from './playtime';

describe('play timer', () => {
  it('is off by default: no limit', () => {
    const p = loadPlayTime();
    expect(p.on).toBe(false);
    expect(isLocked(p)).toBe(false);
    expect(spend(p, 999999)).toBe(false);
  });

  it('counts down only what is played, then locks until time is added', () => {
    const p = { on: false, leftMs: 0 };
    expect(setMinutes(p, 2)).toBe(true);
    expect(p).toEqual({ on: true, leftMs: 120000 });
    expect(spend(p, 60000)).toBe(false);
    expect(isLocked(p)).toBe(false);
    expect(spend(p, 90000)).toBe(true);
    expect(p.leftMs).toBe(0);
    expect(isLocked(p)).toBe(true);
    expect(spend(p, 1000)).toBe(false);
    expect(addMinutes(p, 15)).toBe(true);
    expect(isLocked(p)).toBe(false);
    expect(p.leftMs).toBe(15 * 60000);
    turnOff(p);
    expect(isLocked(p)).toBe(false);
  });

  it('only takes sensible minutes', () => {
    expect(cleanMinutes(0)).toBe(0);
    expect(cleanMinutes(-5)).toBe(0);
    expect(cleanMinutes(NaN)).toBe(0);
    expect(cleanMinutes(12.7)).toBe(12);
    expect(cleanMinutes(5000)).toBe(MAX_MINUTES);
    const p = { on: false, leftMs: 0 };
    expect(setMinutes(p, 0)).toBe(false);
    expect(p.on).toBe(false);
    addMinutes(p, MAX_MINUTES);
    addMinutes(p, 30);
    expect(p.leftMs).toBe(MAX_MINUTES * 60000);
  });

  it('shows minutes and seconds', () => {
    expect(clockText(0)).toBe('0:00');
    expect(clockText(61000)).toBe('1:01');
    expect(clockText(59500)).toBe('1:00');
    expect(clockText(3725000)).toBe('1:02:05');
  });

  it('saves and loads', () => {
    const store: Record<string, string> = {};
    const ls = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) };
    const g = globalThis as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = ls;
    savePlayTime({ on: true, leftMs: 5000 });
    expect(loadPlayTime()).toEqual({ on: true, leftMs: 5000 });
    g.localStorage = before;
  });
});
