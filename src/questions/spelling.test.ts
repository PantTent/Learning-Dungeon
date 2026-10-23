import { defaultLearningSettings, isCorrect, newLearningStats, QuestionEngine } from './engine';
import { parseWordList, SPELL_WORDS_EN, SPELL_WORDS_FR, spellWords } from './spelling';
import type { Grade } from './curriculum';

describe('spelling tests', () => {
  it('word lists are clean: letters only, no repeats', () => {
    for (const list of [...Object.values(SPELL_WORDS_EN), ...Object.values(SPELL_WORDS_FR)]) {
      expect(list.length).toBeGreaterThanOrEqual(30);
      expect(new Set(list.map((w) => w.toLowerCase())).size).toBe(list.length);
      for (const w of list) expect(w, w).toMatch(/^[a-zA-Zàâçéèêëîïôûùü]+$/);
    }
    expect(Object.keys(SPELL_WORDS_FR).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    for (const g of [1, 2, 3, 4, 5, 6]) expect(spellWords('fr', g as Grade)).toBe(SPELL_WORDS_FR[g as 1 | 2 | 3 | 4 | 5 | 6]);
    // No English list for grade 6 yet: it falls back to grade 5.
    expect(spellWords('en', 6 as unknown as Grade)).toBe(SPELL_WORDS_EN[5]);
  });

  it('asks a spelling word out loud, and checks it without caring about capitals', () => {
    const settings = { ...defaultLearningSettings('en'), grade: 4 as Grade, groups: ['spell'], mathPercent: 0 };
    const e = new QuestionEngine(newLearningStats(), settings);
    for (let i = 0; i < 30; i++) {
      const q = e.next();
      expect(q.input).toBe('text');
      expect(q.say).toBe(q.answer);
      expect(q.prompt).not.toContain(q.answer);
      expect(Object.values(SPELL_WORDS_EN).flat()).toContain(q.answer);
      expect(isCorrect(q, ` ${q.answer.toUpperCase()} `)).toBe(true);
      expect(isCorrect(q, q.answer + 'x')).toBe(false);
    }
  });

  it("uses the child's own list when there is one", () => {
    const words = parseWordList('1. Apple\nbanana, cherry;\n\ncherry\n2) dragon fruit');
    expect(words).toEqual(['Apple', 'banana', 'cherry', 'dragon fruit']);
    const settings = { ...defaultLearningSettings('en'), groups: ['spell'], mathPercent: 0, spellWords: words };
    const e = new QuestionEngine(newLearningStats(), settings);
    const seen = new Set(Array.from({ length: 40 }, () => e.next().answer));
    expect([...seen].sort()).toEqual([...words].sort());
  });

  it('French dictée words keep their accents', () => {
    const settings = { ...defaultLearningSettings('fr'), grade: 3 as Grade, groups: ['fr-dictee'], mathPercent: 0 };
    const e = new QuestionEngine(newLearningStats(), settings);
    const q = e.next();
    expect(q.topic).toBe('fr-dictee');
    if (/[éèêàâçîôû]/.test(q.answer)) expect(isCorrect(q, q.answer.normalize('NFD').replace(/\p{M}/gu, ''))).toBe(false);
  });

  it('spelling is off for new heroes until it is picked', () => {
    expect(defaultLearningSettings('en').groups).not.toContain('spell');
    expect(defaultLearningSettings('fr').groups).not.toContain('fr-dictee');
  });
});
