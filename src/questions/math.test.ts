import { MATH_TOPICS, makeMathQuestion, mathTopicsFor } from './math';
import { QuestionEngine, isCorrect, newLearningStats, defaultLearningSettings, teacherHelp } from './engine';
import { type Grade } from './curriculum';
import { ladderFor, ladderRange } from './ladders';
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

  it('comparing-numbers answers are right', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeMathQuestion('compare', (1 + (i % 2)) as Difficulty);
      const [a, b] = q.prompt.replace(/,/g, '').match(/\d+/g)!.map(Number);
      const sym = a > b ? '>' : a < b ? '<' : '=';
      expect(q.answer.startsWith(sym), q.prompt).toBe(true);
      expect(q.prompt).toContain('______');
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

describe('teacher hints and grades', () => {
  const fmtN = (n: string) => Number(n).toLocaleString('en-US');

  it('every math question has a teacher hint that does not give away the answer', () => {
    for (const topic of Object.keys(MATH_TOPICS)) {
      for (const d of [1, 2, 3] as Difficulty[]) {
        for (let i = 0; i < 200; i++) {
          const q = makeMathQuestion(topic, d);
          expect(q.teach, topic).toBeTruthy();
          expect(q.teach).not.toMatch(/NaN|undefined/);
          // (Skip when the answer already appears in the question, e.g. 361 / 19 = 19.)
          if (q.input === 'number' && Number(q.answer) > 12 && !q.prompt.replace(/,/g, '').match(new RegExp(`\\b${q.answer}\\b`))) {
            const re = new RegExp(`(^|[^\\d,.])(${q.answer}|${fmtN(q.answer).replace(/,/g, ',')})(?![\\d,])`);
            expect(re.test(q.teach!), `${topic}: "${q.prompt}" -> ${q.teach}`).toBe(false);
          }
        }
      }
    }
  });

  it('teacherHelp falls back to a topic lesson for reading', () => {
    const e = new QuestionEngine(newLearningStats(), { ...defaultLearningSettings(), mathPercent: 0 });
    for (let i = 0; i < 30; i++) expect(teacherHelp(e.next()).length).toBeGreaterThan(30);
  });

  it('new grade 5 answers are right', () => {
    for (let i = 0; i < 500; i++) {
      const v = makeMathQuestion('volume', 3);
      const [l, w, h] = v.prompt.match(/\d+/g)!.map(Number);
      expect(Number(v.answer)).toBe(l * w * h);
      const o = makeMathQuestion('order-ops', (2 + (i % 2)) as Difficulty);
      const expr = o.prompt.replace(' = ?', '').replace(/x/g, '*');
      expect(Number(o.answer), o.prompt).toBe(Function(`return ${expr}`)());
      const f = makeMathQuestion('fractions-unlike', 3);
      const [a, b, c, d] = f.prompt.match(/\d+/g)!.map(Number);
      const [n, m = 1] = f.answer.split('/').map(Number);
      expect(n / m, f.prompt).toBeCloseTo(a / b + c / d, 9);
      for (const w of f.choices!.filter((x) => x !== f.answer)) {
        const [wn, wm = 1] = w.split('/').map(Number);
        expect(Math.abs(wn / wm - (a / b + c / d)) > 1e-9, `${f.prompt} wrong ${w}`).toBe(true);
      }
      const dq = makeMathQuestion('decimal-ops', (2 + (i % 2)) as Difficulty);
      const dm = dq.prompt.match(/^([\d.]+) ([+-]) ([\d.]+)/)!;
      const want = dm[2] === '+' ? Number(dm[1]) + Number(dm[3]) : Number(dm[1]) - Number(dm[3]);
      expect(Number(dq.answer)).toBeCloseTo(want, 9);
      expect(new Set(dq.choices!.map(Number)).size).toBe(dq.choices!.length);
      const dv = makeMathQuestion('div-2digit', 3);
      const [x, y] = dv.prompt.replace(/,/g, '').match(/\d+/g)!.map(Number);
      expect(Number(dv.answer)).toBe(x / y);
    }
  });

  it('grade and topic choices are respected (topics come from the chosen ladders)', () => {
    for (const grade of [3, 4, 5] as Grade[]) {
      const settings = { ...defaultLearningSettings(), grade, mathPercent: 100 };
      const e = new QuestionEngine(newLearningStats(), settings);
      for (let i = 0; i < 300; i++) {
        const q = e.next();
        const steps = ladderFor(q.group!, 'en');
        const { max } = ladderRange(steps, grade);
        const ok = steps.slice(0, max + 1).some((st) => st.topics.includes(q.topic));
        expect(ok, `grade ${grade}: ${q.group} ${q.topic}`).toBe(true);
        e.record(q, i % 4 !== 0);
      }
    }
    const e = new QuestionEngine(newLearningStats(), { ...defaultLearningSettings(), groups: ['fractions', 'figurative'] });
    const fractionTopics = new Set(ladderFor('fractions', 'en').flatMap((st) => st.topics));
    for (let i = 0; i < 200; i++) {
      const q = e.next();
      expect(fractionTopics.has(q.topic) || q.topic === 'figurative', q.topic).toBe(true);
      e.record(q, i % 3 !== 0);
    }
  });
});

describe('focus practice', () => {
  it('times-table questions only use the chosen tables and are correct', () => {
    for (let i = 0; i < 2000; i++) {
      const d = (1 + (i % 3)) as Difficulty;
      const q = makeMathQuestion('times-table', d, [5]);
      expect(q.prompt).toMatch(/5/);
      const p = q.prompt;
      let m: RegExpMatchArray | null;
      if ((m = p.match(/^(\d+) x (\d+) = \?$/))) expect(Number(q.answer)).toBe(Number(m[1]) * Number(m[2]));
      else if ((m = p.match(/^What is (\d+) times (\d+)\?$/))) expect(Number(q.answer)).toBe(Number(m[1]) * Number(m[2]));
      else if ((m = p.match(/^\? x (\d+) = (\d+)$/))) expect(Number(q.answer) * Number(m[1])).toBe(Number(m[2]));
      else if ((m = p.match(/^(\d+) x (\d+) x 10 = \?$/))) expect(Number(q.answer)).toBe(Number(m[1]) * Number(m[2]) * 10);
      else if (p.startsWith('Which number is a MULTIPLE of 5')) {
        expect(Number(q.answer) % 5).toBe(0);
        for (const c of q.choices!.filter((x) => x !== q.answer)) expect(Number(c) % 5).not.toBe(0);
      } else if (p.startsWith('Count by 5s')) {
        const seq = p.split('\n')[1].match(/\d+/g)!.map(Number);
        expect(Number(q.answer)).toBe(seq[seq.length - 1] + 5);
      } else {
        const nums = p.match(/\d+/g)!.map(Number);
        expect(Number(q.answer), p).toBe(nums[0] * nums[1]);
      }
    }
  });

  it('works for every table 1-12 without getting stuck', () => {
    for (let f = 1; f <= 12; f++) for (let i = 0; i < 200; i++) {
      const q = makeMathQuestion('times-table', 2, [f]);
      if (q.choices) expect(q.choices).toContain(q.answer);
      const dq = makeMathQuestion('div-table', (1 + (i % 3)) as Difficulty, [f]);
      const m = dq.prompt.match(/^(\d+) \/ (\d+) = \?$/);
      if (m) expect(Number(dq.answer)).toBe(Number(m[1]) / Number(m[2]));
    }
  });

  it('the engine sends only focused multiplying when 5s are chosen', () => {
    const e = new QuestionEngine(newLearningStats(), { ...defaultLearningSettings(), mathPercent: 100, groups: ['multiply'], focus: { multiply: [5], divide: [] } });
    for (let i = 0; i < 300; i++) {
      const q = e.next();
      expect(q.topic).toBe('times-table');
      e.record(q, i % 4 !== 0);
    }
  });
});
