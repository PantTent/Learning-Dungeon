import { MATH_TOPICS, makeMathQuestion, mathTopicsFor } from './math';
import { QuestionEngine, isCorrect, newLearningStats, defaultLearningSettings } from './engine';
import type { Difficulty } from './types';

const N = 400;

describe('math generators', () => {
  for (const topic of Object.keys(MATH_TOPICS)) {
    it(`${topic} produces well-formed questions`, () => {
      for (const d of [1, 2, 3] as Difficulty[]) {
        if (!mathTopicsFor(d).includes(topic)) continue;
        for (let i = 0; i < N; i++) {
          const q = makeMathQuestion(topic, d);
          expect(q.prompt.length).toBeGreaterThan(3);
          expect(q.explanation.length).toBeGreaterThan(3);
          expect(q.explanation).not.toMatch(/NaN|undefined|Infinity/);
          expect(q.prompt).not.toMatch(/NaN|undefined|Infinity/);
          if (q.input === 'number') {
            expect(q.answer).toMatch(/^\d+$/);
          } else {
            expect(q.choices).toBeDefined();
            expect(q.choices!.length).toBeGreaterThanOrEqual(2);
            expect(q.choices).toContain(q.answer);
            expect(new Set(q.choices).size).toBe(q.choices!.length);
          }
        }
      }
    });
  }

  // Independently re-compute answers for the pure-arithmetic prompts.
  it('arithmetic answers are right', () => {
    const n = (s: string) => Number(s.replace(/,/g, ''));
    for (let i = 0; i < 3000; i++) {
      const topic = ['mult-facts', 'mult-2x1', 'mult-big', 'mult-2x2', 'div-facts', 'div-long', 'add-sub'][i % 7];
      const q = makeMathQuestion(topic, (1 + (i % 3)) as Difficulty);
      const m = q.prompt.match(/^([\d,]+) ([x/+-]) ([\d,]+) = \?$/);
      expect(m, q.prompt).not.toBeNull();
      const [a, op, b] = [n(m![1]), m![2], n(m![3])];
      const expected = op === 'x' ? a * b : op === '/' ? a / b : op === '+' ? a + b : a - b;
      expect(Number(q.answer), q.prompt).toBe(expected);
    }
  });

  it('remainder answers are right', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeMathQuestion('div-remainder', 2);
      const [, a, b] = q.prompt.match(/^(\d+) \/ (\d+)/)!.map(Number);
      expect(q.answer).toBe(`${Math.floor(a / b)} R ${a % b}`);
    }
  });

  it('rounding answers are right', () => {
    const places: Record<string, number> = { ten: 10, hundred: 100, thousand: 1000, 'ten thousand': 10000, 'hundred thousand': 100000 };
    for (let i = 0; i < 1000; i++) {
      const q = makeMathQuestion('rounding', (1 + (i % 3)) as Difficulty);
      const m = q.prompt.match(/^Round ([\d,]+) to the nearest (.+)\.$/)!;
      const v = Number(m[1].replace(/,/g, ''));
      const p = places[m[2]];
      expect(Number(q.answer)).toBe(Math.round(v / p) * p);
    }
  });

  it('fraction compare answers are right', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeMathQuestion('fractions-compare', 3);
      const [, a, b, c, d] = q.prompt.match(/(\d+)\/(\d+)\s+or\s+(\d+)\/(\d+)/)!.map(Number);
      const want = a / b > c / d ? `${a}/${b}` : a / b < c / d ? `${c}/${d}` : 'They are equal';
      expect(q.answer).toBe(want);
    }
  });
});

describe('engine', () => {
  it('normalizes typed answers', () => {
    const q = makeMathQuestion('mult-facts', 1);
    expect(isCorrect(q, ` ${q.answer} `)).toBe(true);
    expect(isCorrect(q, `${Number(q.answer) + 1}`)).toBe(false);
  });

  it('re-asks missed questions and adapts level', () => {
    const stats = newLearningStats();
    const e = new QuestionEngine(stats, { ...defaultLearningSettings(), mathPercent: 100 });
    const first = e.next();
    e.record(first, false);
    expect(stats.level.math).toBeLessThan(1.6);
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const q = e.next();
      seen.push(q.id);
      e.record(q, true);
    }
    expect(seen).toContain(first.id);
    expect(stats.topics[first.topic].asked).toBeGreaterThanOrEqual(2);
  });

  it('serves reading questions', () => {
    const e = new QuestionEngine(newLearningStats(), { ...defaultLearningSettings(), mathPercent: 0 });
    for (let i = 0; i < 50; i++) {
      const q = e.next();
      expect(q.subject).toBe('reading');
      expect(q.choices).toContain(q.answer);
    }
  });
});
