// Skill ladders: each topic group is a ladder of steps from very basic to
// hard, reaching below (and a little above) the child's grade. Every group
// has its own position on its ladder: right answers climb, wrong answers step
// down, so a child who finds 7 x 143 hard goes back to times tables, then
// "groups of", and climbs again as they get better.
import type { Lang } from '../i18n';
import { mathTopicLevels } from './math';
import { READING_BANK } from './readingBank';
import { READING_BANK_FR } from './readingBankFr';
import { topicGroups, type Grade } from './curriculum';
import type { Difficulty } from './types';

export interface Step {
  /** Topics asked on this step (one is picked at random). */
  topics: string[];
  d: Difficulty;
  /** School grade this step belongs to. */
  g: Grade;
}

const st = (topics: string | string[], d: Difficulty, g: Grade): Step => ({ topics: typeof topics === 'string' ? [topics] : topics, d, g });

/** English math ladders (Massachusetts grades), easiest first. Early steps use the bilingual early-grade questions. */
const EN_MATH: Record<string, Step[]> = {
  multiply: [
    st('e-doubles', 1, 1),
    st('e-doubles', 2, 2),
    st('e-mult', 3, 2),
    st('mult-facts', 1, 3),
    st('mult-2x1', 1, 3),
    st('mult-2x1', 2, 4),
    st('mult-big', 2, 4),
    st('mult-big', 3, 4),
    st('mult-2x2', 2, 4),
    st('mult-2x2', 3, 5),
    st('mult-3x2', 3, 5),
  ],
  divide: [
    st('e-div', 3, 2),
    st('div-facts', 1, 3),
    st('div-remainder', 2, 4),
    st('div-long', 3, 4),
    st('div-2digit', 3, 5),
  ],
  'add-sub': [
    st(['e-add', 'e-sub'], 1, 1),
    st(['e-add', 'e-sub', 'e-missing'], 2, 2),
    st(['e-add', 'e-sub'], 3, 3),
    st('add-sub', 1, 3),
    st('add-sub', 2, 4),
    st('add-sub', 3, 5),
  ],
  numbers: [
    st(['e-count', 'e-compare', 'e-place', 'e-skip'], 1, 1),
    st(['e-place', 'e-compare', 'e-skip'], 2, 2),
    st(['place-value', 'compare', 'patterns', 'rounding'], 1, 3),
    st(['place-value', 'compare', 'patterns', 'rounding', 'factors'], 2, 4),
    st(['place-value', 'rounding', 'factors', 'order-ops'], 3, 5),
  ],
  fractions: [
    st('e-fractions', 2, 2),
    st('e-fractions', 3, 3),
    st('fractions-equiv', 2, 3),
    st(['fractions-equiv', 'fractions-add'], 3, 4),
    st(['fractions-compare', 'fractions-mult'], 3, 4),
    st('fractions-unlike', 3, 5),
  ],
  decimals: [
    st('decimals', 2, 4),
    st(['decimals', 'decimal-ops'], 3, 5),
  ],
  measure: [
    st('e-shapes', 1, 1),
    st(['e-measure', 'e-time', 'e-shapes'], 2, 2),
    st(['measurement', 'area-perimeter', 'e-measure'], 1, 3),
    st(['measurement', 'area-perimeter', 'angles'], 2, 4),
    st(['area-perimeter', 'angles', 'volume'], 3, 5),
  ],
  word: [
    st('e-word', 1, 1),
    st('e-word', 2, 2),
    st('e-word', 3, 3),
    st('word-problems', 1, 3),
    st('word-problems', 2, 4),
    st('word-problems', 3, 5),
  ],
};

/** Spelling tests: word lists from grade 1 up, in both languages. */
const SPELLING: Record<string, Step[]> = {
  spell: [st('spell-1', 1, 1), st('spell-2', 1, 2), st('spell-3', 1, 3), st('spell-4', 2, 4), st('spell-5', 3, 5)],
  'fr-dictee': [st('dictee-1', 1, 1), st('dictee-2', 2, 2), st('dictee-3', 3, 3)],
};

function hasReading(lang: Lang, topic: string, d: Difficulty): boolean {
  const bank = lang === 'fr' ? READING_BANK_FR : READING_BANK;
  return bank.some((b) => b.topic === topic && b.difficulty === d);
}

/** Ladder for any group without a hand-made one: its topics at difficulty 1, 2, 3. */
function generic(groupId: string, lang: Lang): Step[] {
  const group = topicGroups(lang).find((g) => g.id === groupId);
  if (!group) return [];
  const steps: Step[] = [];
  for (const d of [1, 2, 3] as Difficulty[]) {
    const topics = group.topics.filter((t) => (group.subject === 'math' ? mathTopicLevels(t).includes(d) : hasReading(lang, t, d)));
    // In French the difficulty is the school year; English reading spans grades 3-5.
    if (topics.length) steps.push({ topics, d, g: (lang === 'fr' ? d : d + 2) as Grade });
  }
  return steps;
}

const cache = new Map<string, Step[]>();

export function ladderFor(groupId: string, lang: Lang): Step[] {
  const key = `${lang}:${groupId}`;
  let steps = cache.get(key);
  if (!steps) {
    steps = SPELLING[groupId] ?? ((lang === 'en' && EN_MATH[groupId]) || generic(groupId, lang));
    cache.set(key, steps);
  }
  return steps;
}

export interface GradeRange {
  /** Grades this ladder has, easiest first. */
  grades: Grade[];
  /** Lowest and highest grade allowed. */
  lo: Grade;
  hi: Grade;
  /** Where a child of this grade starts. */
  start: Grade;
}

/**
 * The grades a group can move between. Normally the child can drop all the
 * way to the ladder's first grade and climb one grade past their own. A
 * parent can pin a group to one grade.
 */
export function gradeRange(steps: Step[], grade: Grade, pinned?: Grade): GradeRange {
  const grades = ladderGrades(steps);
  if (!grades.length) return { grades, lo: grade, hi: grade, start: grade };
  const atOrBelow = (g: Grade) => [...grades].reverse().find((x) => x <= g) ?? grades[0];
  if (pinned) {
    const g = atOrBelow(pinned);
    return { grades, lo: g, hi: g, start: g };
  }
  const start = atOrBelow(grade);
  const hi = grades.find((x) => x === grade + 1) ?? start;
  return { grades, lo: grades[0], hi: Math.max(hi, start) as Grade, start };
}

/** Grades that have steps on this ladder (for the parent's level picker). */
export function ladderGrades(steps: Step[]): Grade[] {
  return [...new Set(steps.map((s) => s.g))].sort((a, b) => a - b);
}
