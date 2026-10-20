import { sizedQuestion, SIZES } from './custom';
import { mentionsNumber } from './mathEarly';
import { defaultLearningSettings, newLearningStats, QuestionEngine } from './engine';
import { setLang } from '../i18n';

const nums = (prompt: string) => prompt.replace(/[,  ]/g, '').match(/\d+/g)!.map(Number);

describe('picked number sizes', () => {
  afterAll(() => setLang('en'));

  for (const lang of ['en', 'fr'] as const) {
    it(`multiplying answers are right and the numbers have the picked sizes (${lang})`, () => {
      setLang(lang);
      for (const s of SIZES.mul) {
        for (let i = 0; i < 300; i++) {
          const q = sizedQuestion('multiply', { sizes: [s.id] }, [])!;
          const [a, b] = nums(q.prompt);
          expect(Number(q.answer)).toBe(a * b);
          const len = [String(a).length, String(b).length].sort();
          expect(len.join('x')).toBe(s.id.split('x').sort().join('x'));
          expect(mentionsNumber(q.teach!, q.answer), q.prompt).toBe(false);
        }
      }
    });

    it(`dividing answers are whole and right (${lang})`, () => {
      setLang(lang);
      for (const s of SIZES.div) {
        for (let i = 0; i < 300; i++) {
          const q = sizedQuestion('divide', { sizes: [s.id] }, [])!;
          const [a, b] = nums(q.prompt);
          expect(a % b).toBe(0);
          expect(Number(q.answer)).toBe(a / b);
          if (s.id !== 'facts') expect(String(a).length).toBe(Number(s.id[0]));
          expect(mentionsNumber(q.teach!, q.answer), q.prompt).toBe(false);
        }
      }
    });

    it(`adding and subtracting answers are right, never below zero (${lang})`, () => {
      setLang(lang);
      for (const s of SIZES.addsub) {
        for (let i = 0; i < 300; i++) {
          const q = sizedQuestion('add-sub', { sizes: [s.id] }, [])!;
          const [a, b] = nums(q.prompt);
          const add = q.prompt.includes('+');
          expect(Number(q.answer)).toBe(add ? a + b : a - b);
          expect(Number(q.answer)).toBeGreaterThanOrEqual(0);
          for (const n of [a, b]) expect(String(n).length).toBeLessThanOrEqual(Number(s.id));
        }
      }
      for (let i = 0; i < 50; i++) expect(sizedQuestion('add-sub', { sizes: ['2'], ops: ['sub'] }, [])!.prompt).not.toContain('+');
    });
  }

  it('uses the picked times tables for the 1-digit number', () => {
    for (let i = 0; i < 200; i++) {
      const q = sizedQuestion('multiply', { sizes: ['1x1', '1x2'] }, [6, 7])!;
      const [a, b] = nums(q.prompt);
      expect([6, 7].includes(a) || [6, 7].includes(b), q.prompt).toBe(true);
    }
  });

  it('the engine only asks the picked sizes, and they never get harder', () => {
    const settings = { ...defaultLearningSettings('en'), groups: ['multiply'], mathPercent: 100, options: { multiply: { sizes: ['1x1', '1x2'] } } };
    const e = new QuestionEngine(newLearningStats(), settings);
    for (let i = 0; i < 200; i++) {
      const q = e.next();
      const [a, b] = nums(q.prompt);
      expect(Math.min(a, b)).toBeLessThan(10);
      expect(Math.max(a, b)).toBeLessThan(100);
      e.record(q, true);
    }
  });

  it('picked question types are the only ones asked', () => {
    const settings = { ...defaultLearningSettings('en'), groups: ['vocab', 'fractions'], mathPercent: 50, options: { vocab: { topics: ['antonyms'] }, fractions: { topics: ['fractions-compare'] } } };
    const e = new QuestionEngine(newLearningStats(), settings);
    for (let i = 0; i < 200; i++) {
      const q = e.next();
      expect(['antonyms', 'fractions-compare']).toContain(q.topic);
      e.record(q, i % 2 === 0);
    }
  });
});
