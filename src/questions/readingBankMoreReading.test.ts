import { READING_BANK_CORE as READING_BANK } from './readingBank';
import { READING_BANK_MORE_READING } from './readingBankMoreReading';

const MORE = READING_BANK_MORE_READING;

// Shared prompts are fine only for these generic "pick from the choices"
// questions, where the choices carry the content (same list as readingBank.test.ts).
const GENERIC = new Set(
  ['Which word is spelled correctly?', 'Which phrase has the adjectives in the correct order?'].map((p) =>
    p.toLowerCase(),
  ),
);

const TARGETS: Record<string, [number, number, number]> = {
  grammar: [28, 48, 22],
  spelling: [22, 40, 26],
  comprehension: [42, 62, 38],
};

describe('READING_BANK_MORE_READING', () => {
  it('only uses grammar, spelling and comprehension topics', () => {
    for (const it of MORE) expect(Object.keys(TARGETS)).toContain(it.topic);
  });

  for (const [topic, counts] of Object.entries(TARGETS)) {
    counts.forEach((min, i) => {
      it(`has at least ${min} ${topic} items at difficulty ${i + 1}`, () => {
        const n = MORE.filter((it) => it.topic === topic && it.difficulty === i + 1).length;
        expect(n).toBeGreaterThanOrEqual(min);
      });
    });
  }

  it('has no repeated prompts, within itself or against the existing bank', () => {
    const seen = new Set<string>();
    for (const it of [...READING_BANK, ...MORE]) {
      const k = it.prompt.trim().toLowerCase();
      if (GENERIC.has(k)) continue;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  it('has no duplicate prompt+answer pairs against the existing bank', () => {
    const seen = new Set<string>();
    for (const it of [...READING_BANK, ...MORE]) {
      const k = `${it.prompt}|${it.answer}`.toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  MORE.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.wrong.length).toBe(3);

      const lower = (s: string) => s.trim().toLowerCase();
      expect(item.wrong.map(lower)).not.toContain(lower(item.answer));
      const all = [item.answer, ...item.wrong].map(lower);
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
