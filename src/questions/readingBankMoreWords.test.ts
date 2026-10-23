import { READING_BANK_CORE as READING_BANK, READING_TOPICS } from './readingBank';
import { READING_BANK_MORE_WORDS } from './readingBankMoreWords';

/** Minimum new items per topic, for difficulty 1, 2 and 3 (grades 3, 4, 5). */
const TARGETS: Record<string, [number, number, number]> = {
  'prefixes-suffixes': [26, 44, 22],
  roots: [24, 42, 22],
  figurative: [26, 46, 20],
  homophones: [24, 44, 24],
};

describe('READING_BANK_MORE_WORDS', () => {
  it('meets the item targets for each topic and difficulty', () => {
    for (const [topic, targets] of Object.entries(TARGETS)) {
      targets.forEach((min, i) => {
        const n = READING_BANK_MORE_WORDS.filter(
          (it) => it.topic === topic && it.difficulty === i + 1,
        ).length;
        expect(n, `${topic} d${i + 1}`).toBeGreaterThanOrEqual(min);
      });
    }
  });

  it('only uses the four word-study topics', () => {
    for (const it of READING_BANK_MORE_WORDS) {
      expect(Object.keys(TARGETS), it.prompt).toContain(it.topic);
    }
  });

  it('has no prompt already in READING_BANK (case-insensitive)', () => {
    const existing = new Set(READING_BANK.map((it) => it.prompt.trim().toLowerCase()));
    for (const it of READING_BANK_MORE_WORDS) {
      const k = it.prompt.trim().toLowerCase();
      expect(existing.has(k), k).toBe(false);
    }
  });

  it('has no repeated prompts within the file (case-insensitive)', () => {
    const seen = new Set<string>();
    for (const it of READING_BANK_MORE_WORDS) {
      const k = it.prompt.trim().toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK_MORE_WORDS.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(Object.keys(READING_TOPICS)).toContain(item.topic);
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.wrong.length).toBe(3);

      const answer = item.answer.trim().toLowerCase();
      const wrong = item.wrong.map((s) => s.trim().toLowerCase());
      expect(wrong).not.toContain(answer);
      const all = [answer, ...wrong];
      expect(new Set(all).size).toBe(all.length);

      for (const c of [item.answer, ...item.wrong]) {
        expect(c.trim().length).toBeGreaterThan(0);
        expect(c.length).toBeLessThanOrEqual(32);
        expect(/^[\x20-\x7e]*$/.test(c)).toBe(true);
      }

      expect(item.prompt.length).toBeLessThanOrEqual(170);
      expect(/^[\x20-\x7e\n]*$/.test(item.prompt)).toBe(true);

      expect(item.explanation.trim().length).toBeGreaterThan(0);
      expect(item.explanation.length).toBeLessThanOrEqual(170);
      expect(/^[\x20-\x7e]*$/.test(item.explanation)).toBe(true);
      expect(/^(correct|wrong)/i.test(item.explanation)).toBe(false);
    });
  });
});
