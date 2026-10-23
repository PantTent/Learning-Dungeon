import { parseColumns, twoNumbers } from './columns';

describe('scrap paper', () => {
  it('reads the numbers and sign from column problems', () => {
    expect(parseColumns('275 + 341 = ?')).toEqual({ a: '275', b: '341', op: '+' });
    expect(parseColumns('1,204 - 387 = ?')).toEqual({ a: '1204', b: '387', op: '−' });
    expect(parseColumns('23 − 7 = ?')).toEqual({ a: '23', b: '7', op: '−' });
    expect(parseColumns('46 x 23 = ?')).toEqual({ a: '46', b: '23', op: '×' });
    expect(parseColumns('Combien font 1 250 + 375?')).toEqual({ a: '1250', b: '375', op: '+' });
  });

  it('leaves word problems blank for the child to fill in', () => {
    expect(parseColumns('Sam has 12 apples and gets 5 more. How many now?')).toBeNull();
    expect(parseColumns('3/4 + 1/4 = ?')).toBeNull();
    expect(parseColumns('84 / 4 = ?')).toBeNull();
  });

  it('copies the two numbers of a story problem (bigger first), when there are exactly two', () => {
    expect(twoNumbers('Sam has 12 apples and gets 25 more. How many now?')).toEqual({ a: '25', b: '12' });
    expect(twoNumbers('5 247 ÷ 3 = ?')).toEqual({ a: '5247', b: '3' });
    expect(twoNumbers('1,204 marbles are shared by 4 kids.')).toEqual({ a: '1204', b: '4' });
    expect(twoNumbers('3 bags of 4 apples and 2 more')).toBeNull();
    expect(twoNumbers('2.5 + 1.25 = ?')).toBeNull();
    expect(twoNumbers('3/4 of 12')).toBeNull();
    expect(twoNumbers('Which word is a noun?')).toBeNull();
  });
});
