import { READING_BANK_CORE as READING_BANK, READING_TOPICS } from './readingBank';
import { READING_BANK_MORE_VOCAB } from './readingBankMoreVocab';

const TARGETS: Record<string, [number, number, number]> = {
  synonyms: [28, 44, 22],
  antonyms: [28, 44, 22],
  vocabulary: [40, 66, 34],
  'context-clues': [40, 62, 36],
};

describe('READING_BANK_MORE_VOCAB', () => {
  it('only uses the four word-meaning topics', () => {
    for (const it of READING_BANK_MORE_VOCAB) {
      expect(Object.keys(TARGETS), it.prompt).toContain(it.topic);
    }
  });

  for (const [topic, counts] of Object.entries(TARGETS)) {
    counts.forEach((min, i) => {
      const d = i + 1;
      it(`has at least ${min} ${topic} items at difficulty ${d}`, () => {
        const n = READING_BANK_MORE_VOCAB.filter((it) => it.topic === topic && it.difficulty === d).length;
        expect(n).toBeGreaterThanOrEqual(min);
      });
    });
  }

  it('has no prompt already in READING_BANK (case-insensitive)', () => {
    const existing = new Set(READING_BANK.map((it) => it.prompt.trim().toLowerCase()));
    for (const it of READING_BANK_MORE_VOCAB) {
      expect(existing.has(it.prompt.trim().toLowerCase()), it.prompt).toBe(false);
    }
  });

  it('has no repeated prompts within the file (case-insensitive)', () => {
    const seen = new Set<string>();
    for (const it of READING_BANK_MORE_VOCAB) {
      const k = it.prompt.trim().toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK_MORE_VOCAB.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(Object.keys(READING_TOPICS)).toContain(item.topic);
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.wrong.length).toBe(3);

      const answer = item.answer.trim().toLowerCase();
      expect(item.wrong.map((w) => w.trim().toLowerCase())).not.toContain(answer);

      const all = [item.answer, ...item.wrong].map((s) => s.trim().toLowerCase());
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
