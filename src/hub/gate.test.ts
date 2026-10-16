import { isAdultBirthYear } from './gate';

describe('parent gate', () => {
  it('accepts adult birth years only', () => {
    expect(isAdultBirthYear(1985, 2026)).toBe(true);
    expect(isAdultBirthYear(2008, 2026)).toBe(true);
    expect(isAdultBirthYear(2009, 2026)).toBe(false);
    expect(isAdultBirthYear(2017, 2026)).toBe(false);
    expect(isAdultBirthYear(1234, 2026)).toBe(false);
    expect(isAdultBirthYear(0, 2026)).toBe(false);
  });
});
