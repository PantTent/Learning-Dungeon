// Skill ladders: each topic group is a ladder of steps from very basic to
// hard, reaching below (and a little above) the child's grade. Every group
// has its own position on its ladder: right answers climb, wrong answers step
// down, so a child who finds 7 x 143 hard goes back to times tables, then
// "groups of", and climbs again as they get better.
import { getRegion, type Lang } from '../i18n';
import { mathTopicLevels } from './math';
import { READING_BANK } from './readingBank';
import { READING_BANK_FR } from './readingBankFr';
import { READING_BANK_FR_UPPER } from './readingBankFrUpper';
import { READING_BANK_EARLY } from './readingBankEarly';
import { topicGroups, type Grade } from './curriculum';
import type { Difficulty } from './types';

export interface Step {
  /** Topics asked on this step (one is picked at random). */
  topics: string[];
  d: Difficulty;
  /** School grade this step belongs to. */
  g: Grade;
  /** English reading for grades 1-2 (its own question set). */
  early?: boolean;
  /** French reading for 4e-6e (its own question set). */
  upper?: boolean;
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

/**
 * Nova Scotia math ladders in English (grades 1-5). Times tables to 5 x 5 in
 * grade 3 (the early questions shrink to 5 x 5 when Nova Scotia is picked),
 * money and fractions from grade 3, decimals in grades 4-5, and no adding
 * fractions, angles or order of operations yet (those come in grades 6-7).
 */
const NS_MATH: Record<string, Step[]> = {
  multiply: [
    st('e-doubles', 1, 1),
    st('e-doubles', 2, 2),
    st('e-mult', 3, 3),
    st('mult-facts', 1, 4),
    st('mult-2x1', 1, 4),
    st('mult-big', 2, 4),
    st('mult-2x1', 2, 5),
    st('mult-2x2', 2, 5),
    st('mult-big', 3, 5),
  ],
  divide: [
    st('e-div', 3, 3),
    st('div-facts', 1, 4),
    st('div-remainder', 2, 4),
    st('div-long', 3, 5),
  ],
  'add-sub': [
    st(['e-add', 'e-sub'], 1, 1),
    st(['e-add', 'e-sub', 'e-missing'], 2, 2),
    st(['e-add', 'e-sub', 'add-sub'], 3, 3),
    st('add-sub', 2, 4),
    st('add-sub', 3, 5),
  ],
  numbers: [
    st(['e-count', 'e-compare', 'e-skip'], 1, 1),
    st(['e-place', 'e-compare', 'e-skip'], 2, 2),
    st(['place-value', 'compare', 'patterns'], 1, 3),
    st(['place-value', 'compare', 'patterns', 'rounding'], 2, 4),
    st(['place-value', 'rounding', 'compare'], 3, 5),
  ],
  fractions: [
    st('e-fractions', 2, 3),
    st('e-fractions', 3, 3),
    st('fractions-equiv', 2, 4),
    st(['fractions-equiv', 'fractions-compare'], 3, 5),
  ],
  decimals: [
    st(['decimals', 'decimal-ops'], 2, 4),
    st(['decimals', 'decimal-ops'], 3, 5),
  ],
  measure: [
    st('e-shapes', 1, 1),
    st(['e-time', 'e-shapes'], 2, 2),
    st(['e-measure', 'e-time', 'e-shapes', 'measurement'], 3, 3),
    st(['measurement', 'area-perimeter', 'e-time'], 2, 4),
    st(['area-perimeter', 'volume', 'measurement'], 3, 5),
  ],
  word: [
    st('e-word', 1, 1),
    st('e-word', 2, 2),
    st(['e-word', 'word-problems'], 3, 3),
    st('word-problems', 2, 4),
    st('word-problems', 3, 5),
  ],
};

/** Nova Scotia math ladders in French (CSAP programs, 1re to 3e annee, checked against the 2016 documents). */
const NS_MATH_FR: Record<string, Step[]> = {
  'fr-nombres': [
    st(['e-count', 'e-compare', 'e-skip'], 1, 1),
    st(['e-count', 'e-compare', 'e-place', 'e-skip', 'e-even-odd'], 2, 2),
    st(['e-count', 'e-compare', 'e-place', 'e-skip', 'e-even-odd'], 3, 3),
  ],
  'fr-add-sub': [
    st(['e-add', 'e-sub', 'e-missing', 'e-doubles'], 1, 1),
    st(['e-add', 'e-sub', 'e-missing', 'e-doubles'], 2, 2),
    st(['e-add', 'e-sub', 'e-missing'], 3, 3),
  ],
  'fr-mult': [st(['e-mult', 'e-div'], 3, 3)],
  // Measuring in 2e uses everyday objects (no cm yet) and money is not in the CSAP program.
  'fr-mesure': [st('e-time', 2, 2), st(['e-time', 'e-measure'], 3, 3)],
  'fr-formes': [st('e-shapes', 1, 1), st('e-shapes', 2, 2), st(['e-shapes', 'e-fractions'], 3, 3)],
  'fr-problemes': [st('e-word', 1, 1), st('e-word', 2, 2), st('e-word', 3, 3)],
};

/**
 * French 4e to 6e (Quebec): the grade 3-5 questions (in French), then percent,
 * exponents and negative numbers. Added after the 1re-3e steps.
 */
const FR_UPPER: Record<string, Step[]> = {
  'fr-nombres': [
    st(['place-value', 'compare', 'patterns', 'rounding'], 2, 4),
    st(['place-value', 'rounding', 'factors', 'order-ops', 'exponents'], 2, 5),
    st(['factors', 'order-ops', 'exponents', 'integers'], 3, 6),
  ],
  'fr-add-sub': [st('add-sub', 2, 4), st('add-sub', 3, 5)],
  'fr-mult': [
    st(['mult-facts', 'mult-2x1'], 1, 4),
    st(['mult-big', 'div-facts', 'div-remainder'], 2, 4),
    st(['mult-2x2', 'div-long', 'div-remainder'], 3, 5),
    st(['mult-3x2', 'div-2digit', 'div-long'], 3, 6),
  ],
  'fr-fractions': [
    st(['fractions-equiv', 'fractions-compare', 'decimals', 'decimal-ops'], 2, 4),
    st(['fractions-add', 'fractions-mult', 'decimal-ops', 'decimal-muldiv', 'percent'], 3, 5),
    st(['fractions-unlike', 'fractions-mixed', 'decimal-muldiv', 'percent'], 3, 6),
  ],
  'fr-mesure': [st(['measurement', 'area-perimeter', 'angles'], 2, 4), st(['area-perimeter', 'volume', 'angles'], 2, 5), st(['area-perimeter', 'volume', 'angles'], 3, 6)],
  'fr-problemes': [st('word-problems', 2, 4), st('word-problems', 3, 5), st('word-problems', 3, 6)],
};

/** French 4e to 6e in Nova Scotia (CSAP): ratio and percent in 6e, no exponents. */
const NS_UPPER_FR: Record<string, Step[]> = {
  'fr-nombres': [
    st(['place-value', 'compare', 'patterns', 'rounding'], 2, 4),
    st(['place-value', 'rounding', 'compare'], 3, 5),
    st(['factors', 'order-ops', 'integers'], 3, 6),
  ],
  'fr-add-sub': [st('add-sub', 2, 4), st('add-sub', 3, 5)],
  'fr-mult': [
    st(['mult-facts', 'mult-2x1'], 1, 4),
    st(['mult-big', 'div-facts', 'div-remainder'], 2, 4),
    st(['mult-2x2', 'div-long', 'div-remainder'], 2, 5),
    st(['mult-3x2', 'div-long'], 3, 6),
  ],
  'fr-fractions': [
    st(['fractions-equiv', 'decimals', 'decimal-ops'], 2, 4),
    st(['fractions-equiv', 'fractions-compare', 'decimals', 'decimal-ops'], 3, 5),
    st(['fractions-mixed', 'decimal-muldiv', 'percent', 'ratio'], 3, 6),
  ],
  'fr-mesure': [st(['measurement', 'area-perimeter', 'e-time'], 2, 4), st(['area-perimeter', 'volume', 'measurement'], 3, 5), st(['angles', 'area-perimeter', 'volume'], 3, 6)],
  'fr-problemes': [st('word-problems', 2, 4), st('word-problems', 3, 5), st('word-problems', 3, 6)],
};

/** Spelling tests: word lists from grade 1 up, in both languages. */
const SPELLING: Record<string, Step[]> = {
  spell: [st('spell-1', 1, 1), st('spell-2', 1, 2), st('spell-3', 1, 3), st('spell-4', 2, 4), st('spell-5', 3, 5)],
  'fr-dictee': [st('dictee-1', 1, 1), st('dictee-2', 2, 2), st('dictee-3', 3, 3), st('dictee-4', 1, 4), st('dictee-5', 2, 5), st('dictee-6', 3, 6)],
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
  // English reading starts with the grade 1 and 2 set, then grades 3-5.
  if (lang === 'en' && group.subject === 'reading') {
    for (const g of [1, 2] as Grade[]) {
      const topics = group.topics.filter((t) => READING_BANK_EARLY.some((b) => b.topic === t && b.difficulty === g));
      if (topics.length) steps.push({ topics, d: g as Difficulty, g, early: true });
    }
  }
  for (const d of [1, 2, 3] as Difficulty[]) {
    // (French math groups also hold the 4e-6e topics; those have their own steps.)
    const early = (t: string) => lang === 'en' || t.startsWith('e-');
    const topics = group.topics.filter((t) => (group.subject === 'math' ? early(t) && mathTopicLevels(t).includes(d) : hasReading(lang, t, d)));
    // In French the difficulty is the school year; English reading spans grades 3-5.
    if (topics.length) steps.push({ topics, d, g: (lang === 'fr' ? d : d + 2) as Grade });
  }
  // French reading goes on to 4e-6e with its own set.
  if (lang === 'fr' && group.subject === 'reading') {
    for (const d of [1, 2, 3] as Difficulty[]) {
      const topics = group.topics.filter((t) => READING_BANK_FR_UPPER.some((b) => b.topic === t && b.difficulty === d));
      if (topics.length) steps.push({ topics, d, g: (d + 3) as Grade, upper: true });
    }
  }
  return steps;
}

const cache = new Map<string, Step[]>();

export function ladderFor(groupId: string, lang: Lang): Step[] {
  const ns = getRegion() === 'ns';
  const key = `${lang}:${ns ? 'ns' : ''}:${groupId}`;
  let steps = cache.get(key);
  if (!steps) {
    const math = ns ? (lang === 'en' ? NS_MATH : NS_MATH_FR) : lang === 'en' ? EN_MATH : {};
    const upper = lang === 'fr' ? (ns ? NS_UPPER_FR : FR_UPPER)[groupId] ?? [] : [];
    steps = SPELLING[groupId] ?? [...(math[groupId] ?? generic(groupId, lang)), ...upper];
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
