import { setLang } from '../i18n';
import { equation, mathVisual, story, THINGS } from './visual';
import { QuestionEngine, defaultLearningSettings, newLearningStats } from './engine';
import type { Grade } from './curriculum';

describe('math pictures', () => {
  afterAll(() => setLang('en'));

  it('reads simple sums in both languages', () => {
    expect(mathVisual('8 + 2 = ?')).toEqual({ op: 'add', a: 8, b: 2, r: 10 });
    expect(mathVisual('12 − 5 = ?')).toEqual({ op: 'sub', a: 12, b: 5, r: 7 });
    expect(mathVisual('3 x 4 = ?')).toEqual({ op: 'mul', a: 3, b: 4, r: 12 });
    expect(mathVisual('3 × 4 = ?')).toEqual({ op: 'mul', a: 3, b: 4, r: 12 });
    expect(mathVisual('12 / 3 = ?')).toEqual({ op: 'div', a: 12, b: 3, r: 4 });
    expect(mathVisual('12 ÷ 3 = ?')).toEqual({ op: 'div', a: 12, b: 3, r: 4 });
    expect(mathVisual('8 + ? = 10')).toEqual({ op: 'missing', a: 8, b: 2, r: 10 });
    expect(mathVisual('? + 8 = 10')).toEqual({ op: 'missing', a: 8, b: 2, r: 10 });
  });

  it('skips numbers too big to draw, and other questions', () => {
    expect(mathVisual('47 + 36 = ?')).toBeNull();
    expect(mathVisual('9 x 9 = ?')).toBeNull();
    expect(mathVisual('13 / 4 = ?')).toBeNull();
    expect(mathVisual('How many tens are in 47?')).toBeNull();
    expect(mathVisual('3 - 5 = ?')).toBeNull();
  });

  it('tells a story that ends with the right sum', () => {
    const t = THINGS[0];
    const add = story({ op: 'add', a: 8, b: 2, r: 10 }, t);
    expect(add.join(' ')).toBe('If you have 8 apples, and you add 2 more, you have 10 apples. So 8 + 2 = 10.');
    expect(story({ op: 'sub', a: 5, b: 1, r: 4 }, t).join(' ')).toBe('If you have 5 apples, and you take away 1 apple, you have 4 apples left. So 5 − 1 = 4.');
    expect(story({ op: 'mul', a: 3, b: 4, r: 12 }, t)[1]).toBe('Count by 4s: 4, 8, 12.');
    expect(story({ op: 'missing', a: 8, b: 2, r: 10 }, t)[2]).toBe('Count on: 9, 10.');
    setLang('fr');
    expect(story({ op: 'add', a: 8, b: 2, r: 10 }, t).join(' ')).toContain('10 pommes');
    expect(equation({ op: 'mul', a: 3, b: 4, r: 12 })).toBe('3 × 4 = 12');
    setLang('en');
  });

  it('every early-grade sum it can draw has the right answer', () => {
    for (const grade of [1, 2, 3] as Grade[]) {
      for (const lang of ['en', 'fr'] as const) {
        setLang(lang);
        const e = new QuestionEngine(newLearningStats(), { ...defaultLearningSettings(lang), grade, mathPercent: 100 });
        for (let i = 0; i < 300; i++) {
          const q = e.next();
          const v = mathVisual(q.prompt);
          if (v) expect(String(v.op === 'missing' ? v.b : v.r), q.prompt).toBe(q.answer);
          e.record(q, i % 3 === 0);
        }
      }
    }
    setLang('en');
  });
});
