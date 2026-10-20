import { READING_BANK_EARLY } from './readingBankEarly';
import { READING_TOPICS } from './readingBank';
import { defaultLearningSettings, isCorrect, newLearningStats, QuestionEngine } from './engine';
import { topicGroups, type Grade } from './curriculum';
import { ladderFor } from './ladders';

describe('READING_BANK_EARLY (English grades 1-2)', () => {
  it('has plenty for both grades, in every reading group (figurative starts in grade 2)', () => {
    expect(READING_BANK_EARLY.filter((b) => b.difficulty === 1).length).toBeGreaterThanOrEqual(80);
    expect(READING_BANK_EARLY.filter((b) => b.difficulty === 2).length).toBeGreaterThanOrEqual(90);
    for (const g of topicGroups('en').filter((x) => x.subject === 'reading' && x.id !== 'spell')) {
      const grades = ladderFor(g.id, 'en').filter((s) => s.early).map((s) => s.g);
      expect(grades, g.id).toEqual(g.id === 'figurative' ? [2] : [1, 2]);
    }
  });

  it('has no repeated questions', () => {
    const seen = new Set<string>();
    for (const it of READING_BANK_EARLY) {
      const k = `${it.prompt}|${it.answer}`.toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK_EARLY.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(Object.keys(READING_TOPICS)).toContain(item.topic);
      expect([1, 2]).toContain(item.difficulty);
      expect(item.wrong.length).toBeGreaterThanOrEqual(1);
      expect(item.wrong.length).toBeLessThanOrEqual(3);
      const all = [item.answer, ...item.wrong].map((s) => s.trim().toLowerCase());
      expect(new Set(all).size).toBe(all.length);
      for (const c of [item.answer, ...item.wrong]) {
        expect(c.trim().length).toBeGreaterThan(0);
        expect(c.length).toBeLessThanOrEqual(32);
        expect(/^[\x20-\x7e]*$/.test(c)).toBe(true);
      }
      expect(item.prompt.length).toBeLessThanOrEqual(item.topic === 'comprehension' ? 320 : 170);
      expect(/^[\x20-\x7e\n]*$/.test(item.prompt)).toBe(true);
      if (item.topic === 'comprehension') expect(item.prompt).toContain('\n\n');
      expect(item.explanation.length).toBeLessThanOrEqual(170);
      expect(/^[\x20-\x7e]*$/.test(item.explanation)).toBe(true);
    });
  });

  it.each([1, 2] as Grade[])('a grade %i child gets reading questions from their grade', (grade) => {
    const settings = { ...defaultLearningSettings('en'), grade, mathPercent: 0 };
    const e = new QuestionEngine(newLearningStats(), settings);
    const early = new Set(READING_BANK_EARLY.filter((b) => b.difficulty === grade).map((b) => b.prompt));
    for (let i = 0; i < 100; i++) {
      const q = e.next();
      expect(q.subject).toBe('reading');
      // Figurative language starts in grade 2.
      if (q.group === 'figurative' && grade === 1) expect(q.difficulty).toBe(2);
      else expect(early.has(q.prompt), q.prompt).toBe(true);
      expect(q.choices).toContain(q.answer);
      expect(isCorrect(q, q.answer)).toBe(true);
    }
  });
});
