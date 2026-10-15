import { READING_BANK, READING_TOPICS } from './readingBank';

describe('READING_BANK', () => {
  it('has a healthy number of items', () => {
    expect(READING_BANK.length).toBeGreaterThanOrEqual(500);
  });

  it('covers every topic', () => {
    for (const key of Object.keys(READING_TOPICS)) {
      expect(READING_BANK.some((it) => it.topic === key), key).toBe(true);
    }
  });

  it('has no repeated prompts (case-insensitive)', () => {
    // Shared prompts are fine only for these generic "pick from the choices"
    // questions, where the choices carry the content.
    const generic = new Set(
      [
        'Which word is spelled correctly?',
        'Which phrase has the adjectives in the correct order?',
      ].map((p) => p.toLowerCase()),
    );
    const seen = new Set<string>();
    for (const it of READING_BANK) {
      const k = it.prompt.trim().toLowerCase();
      if (generic.has(k)) continue;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  it('has no duplicate prompt+answer pairs', () => {
    const seen = new Set<string>();
    for (const it of READING_BANK) {
      const k = `${it.prompt}|${it.answer}`.toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(Object.keys(READING_TOPICS)).toContain(item.topic);
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.wrong.length).toBeGreaterThanOrEqual(2);
      expect(item.wrong.length).toBeLessThanOrEqual(3);

      const all = [item.answer, ...item.wrong].map((s) => s.trim().toLowerCase());
      expect(new Set(all).size).toBe(all.length);
      for (const c of [item.answer, ...item.wrong]) {
        expect(c.trim().length).toBeGreaterThan(0);
        expect(c.length).toBeLessThanOrEqual(32);
        expect(/^[\x20-\x7e]*$/.test(c)).toBe(true);
      }

      const max = item.topic === 'comprehension' ? 320 : 170;
      expect(item.prompt.length).toBeLessThanOrEqual(max);
      expect(/^[\x20-\x7e\n]*$/.test(item.prompt)).toBe(true);
      if (item.topic === 'comprehension') expect(item.prompt).toContain('\n\n');

      expect(item.explanation.trim().length).toBeGreaterThan(0);
      expect(item.explanation.length).toBeLessThanOrEqual(170);
      expect(/^[\x20-\x7e]*$/.test(item.explanation)).toBe(true);
      expect(/^(correct|wrong)/i.test(item.explanation)).toBe(false);
    });
  });
});
