import { READING_BANK_FR, READING_LESSONS_FR, READING_TOPICS_FR } from './readingBankFr';

// Printable characters only: ASCII, the non-breaking space, « », Latin-1
// letters (accents), œ/Œ. No emoji, no control characters.
const CHARS = /^[\x20-\x7e «»À-ÿŒœ]*$/;
const CHARS_NL = /^[\x20-\x7e «»À-ÿŒœ\n]*$/;

const TOPICS = [
  'fr-vocabulaire',
  'fr-synonymes',
  'fr-contraires',
  'fr-sons',
  'fr-orthographe',
  'fr-grammaire',
  'fr-homophones',
  'fr-lecture',
];

function checkTypography(s: string) {
  // Quebec style: no space before ? or !
  expect(/[  ][?!]/.test(s), s).toBe(false);
  // « » use a non-breaking space inside.
  expect(/«(?! )/.test(s), s).toBe(false);
  expect(/(?<! )»/.test(s), s).toBe(false);
}

describe('READING_BANK_FR', () => {
  it('has a healthy number of items', () => {
    expect(READING_BANK_FR.length).toBeGreaterThanOrEqual(240);
  });

  it('has exactly the expected topics, each with a label and a lesson', () => {
    expect(Object.keys(READING_TOPICS_FR).sort()).toEqual([...TOPICS].sort());
    for (const key of TOPICS) {
      expect(READING_TOPICS_FR[key]?.trim().length, key).toBeGreaterThan(0);
      const lesson = READING_LESSONS_FR[key];
      expect(lesson?.trim().length, key).toBeGreaterThan(0);
      expect(CHARS.test(lesson), key).toBe(true);
      checkTypography(lesson);
    }
  });

  it('covers every topic at two or more difficulties', () => {
    for (const key of TOPICS) {
      const levels = new Set(READING_BANK_FR.filter((it) => it.topic === key).map((it) => it.difficulty));
      expect(levels.size, key).toBeGreaterThanOrEqual(2);
      if (key !== 'fr-homophones') expect(levels.size, key).toBe(3);
    }
  });

  it('has at least 70 items per difficulty', () => {
    for (const d of [1, 2, 3]) {
      expect(READING_BANK_FR.filter((it) => it.difficulty === d).length, `difficulty ${d}`).toBeGreaterThanOrEqual(70);
    }
  });

  it('has no repeated prompts (case-insensitive)', () => {
    // Shared prompts are fine only for generic "pick from the choices"
    // questions, where the choices carry the content.
    const generic = new Set(['Quel mot est bien écrit?', 'Quelle phrase est bien écrite?'].map((p) => p.toLowerCase()));
    const seen = new Set<string>();
    for (const it of READING_BANK_FR) {
      const k = it.prompt.trim().toLowerCase();
      if (generic.has(k)) continue;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  it('has no duplicate prompt+answer pairs', () => {
    const seen = new Set<string>();
    for (const it of READING_BANK_FR) {
      const k = `${it.prompt}|${it.answer}`.toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });

  READING_BANK_FR.forEach((item, i) => {
    it(`item ${i} (${item.topic}): ${item.prompt.slice(0, 40)}`, () => {
      expect(TOPICS).toContain(item.topic);
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.wrong.length).toBeGreaterThanOrEqual(2);
      expect(item.wrong.length).toBeLessThanOrEqual(3);

      const all = [item.answer, ...item.wrong].map((s) => s.trim().toLowerCase());
      expect(new Set(all).size).toBe(all.length);
      for (const c of [item.answer, ...item.wrong]) {
        expect(c.trim().length).toBeGreaterThan(0);
        expect(c.length).toBeLessThanOrEqual(32);
        expect(CHARS.test(c), c).toBe(true);
        checkTypography(c);
      }

      const max = item.topic === 'fr-lecture' ? 340 : 170;
      expect(item.prompt.length).toBeLessThanOrEqual(max);
      expect(CHARS_NL.test(item.prompt)).toBe(true);
      checkTypography(item.prompt);
      if (item.topic === 'fr-lecture') expect(item.prompt).toContain('\n\n');
      else expect(item.prompt).not.toContain('\n');

      expect(item.explanation.trim().length).toBeGreaterThan(0);
      expect(item.explanation.length).toBeLessThanOrEqual(170);
      expect(CHARS.test(item.explanation)).toBe(true);
      checkTypography(item.explanation);
      expect(/^(correct|wrong|bravo|faux|oups)/i.test(item.explanation.trim())).toBe(false);
    });
  });
});
