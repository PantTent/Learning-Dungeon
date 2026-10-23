import { READING_BANK_EARLY_MORE } from './readingBankEarlyMore';
import { READING_BANK_EARLY } from './readingBankEarly';
import { READING_TOPICS } from './readingBank';

const TOPICS = [
  'antonyms',
  'comprehension',
  'context-clues',
  'figurative',
  'grammar',
  'homophones',
  'prefixes-suffixes',
  'spelling',
  'synonyms',
  'vocabulary',
];

describe('READING_BANK_EARLY_MORE (more English grades 1-2)', () => {
  it.each(TOPICS)('has 20 new %s questions per grade (figurative only in grade 2)', (topic) => {
    const count = (d: number) => READING_BANK_EARLY_MORE.filter((b) => b.topic === topic && b.difficulty === d).length;
    expect(count(1)).toBe(topic === 'figurative' ? 0 : 20);
    expect(count(2)).toBe(20);
  });

  it('only uses known topics', () => {
    expect(READING_BANK_EARLY_MORE.length).toBe(380);
    for (const it of READING_BANK_EARLY_MORE) expect(TOPICS).toContain(it.topic);
  });

  it('has no repeated prompts, here or in the first early bank', () => {
    const seen = new Set(READING_BANK_EARLY.map((b) => b.prompt.trim().toLowerCase()));
    for (const it of READING_BANK_EARLY_MORE) {
      const k = it.prompt.trim().toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK_EARLY_MORE.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(Object.keys(READING_TOPICS)).toContain(item.topic);
      expect([1, 2]).toContain(item.difficulty);
      expect(item.wrong.length).toBeGreaterThanOrEqual(1);
      expect(item.wrong.length).toBeLessThanOrEqual(3);
      expect(item.wrong.map((w) => w.trim().toLowerCase())).not.toContain(item.answer.trim().toLowerCase());
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
      else expect(item.prompt).not.toContain('\n');
      expect(item.explanation.trim().length).toBeGreaterThan(0);
      expect(item.explanation.length).toBeLessThanOrEqual(170);
      expect(/^[\x20-\x7e]*$/.test(item.explanation)).toBe(true);
    });
  });
});
