// Which topics belong to which grade, how topics are grouped for the
// "What do you want to practice?" screen, and the teacher lessons used for
// reading questions (math questions carry their own step-by-step hints).
import type { Difficulty, Subject } from './types';
import { getLang, type Lang } from '../i18n';

export type Grade = 1 | 2 | 3 | 4 | 5;
/** English questions follow Massachusetts grades 1-5. */
export const GRADES: Grade[] = [1, 2, 3, 4, 5];
/** French questions follow the Quebec curriculum, 1re to 3e annee. */
export const GRADES_FR: Grade[] = [1, 2, 3];

export function gradesFor(lang: Lang = getLang()): Grade[] {
  return lang === 'fr' ? GRADES_FR : GRADES;
}

export function defaultGrade(lang: Lang = getLang()): Grade {
  return lang === 'fr' ? 2 : 4;
}

/** "4" in English, "1re" / "2e" / "3e" (annee) in French. */
export function gradeLabel(g: Grade, lang: Lang = getLang()): string {
  if (lang === 'fr') return g === 1 ? '1re' : `${g}e`;
  return `${g}`;
}

/** Keep a saved grade valid for the language (e.g. after switching language). */
export function fitGrade(g: Grade, lang: Lang = getLang()): Grade {
  return gradesFor(lang).includes(g) ? g : defaultGrade(lang);
}

export interface TopicGroup {
  id: string;
  subject: Subject;
  label: string;
  topics: string[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  { id: 'multiply', subject: 'math', label: 'Multiplying', topics: ['mult-facts', 'mult-2x1', 'mult-big', 'mult-2x2', 'mult-3x2', 'e-doubles', 'e-mult'] },
  { id: 'divide', subject: 'math', label: 'Dividing', topics: ['div-facts', 'div-remainder', 'div-long', 'div-2digit', 'e-div'] },
  { id: 'add-sub', subject: 'math', label: 'Adding & Subtracting', topics: ['add-sub', 'e-add', 'e-sub', 'e-missing'] },
  { id: 'numbers', subject: 'math', label: 'Place Value & Number Sense', topics: ['place-value', 'rounding', 'compare', 'factors', 'patterns', 'order-ops', 'e-count', 'e-compare', 'e-place', 'e-skip'] },
  { id: 'fractions', subject: 'math', label: 'Fractions', topics: ['fractions-equiv', 'fractions-compare', 'fractions-add', 'fractions-unlike', 'fractions-mult', 'e-fractions'] },
  { id: 'decimals', subject: 'math', label: 'Decimals', topics: ['decimals', 'decimal-ops'] },
  { id: 'measure', subject: 'math', label: 'Measurement & Shapes', topics: ['measurement', 'area-perimeter', 'volume', 'angles', 'e-measure', 'e-time', 'e-shapes'] },
  { id: 'word', subject: 'math', label: 'Word Problems', topics: ['word-problems', 'e-word'] },
  { id: 'vocab', subject: 'reading', label: 'Vocabulary', topics: ['synonyms', 'antonyms', 'vocabulary'] },
  { id: 'word-parts', subject: 'reading', label: 'Word Parts & Roots', topics: ['prefixes-suffixes', 'roots'] },
  { id: 'context', subject: 'reading', label: 'Context Clues', topics: ['context-clues'] },
  { id: 'figurative', subject: 'reading', label: 'Figurative Language', topics: ['figurative'] },
  { id: 'grammar', subject: 'reading', label: 'Grammar & Spelling', topics: ['homophones', 'grammar', 'spelling'] },
  { id: 'comprehension', subject: 'reading', label: 'Reading Passages', topics: ['comprehension'] },
  { id: 'spell', subject: 'reading', label: 'Spelling Test', topics: ['spell-words'] },
];

/** Topic groups for the French (Quebec) questions. */
export const TOPIC_GROUPS_FR: TopicGroup[] = [
  { id: 'fr-nombres', subject: 'math', label: 'Les nombres', topics: ['e-count', 'e-compare', 'e-place', 'e-skip', 'e-even-odd'] },
  { id: 'fr-add-sub', subject: 'math', label: 'Additions et soustractions', topics: ['e-add', 'e-sub', 'e-missing', 'e-doubles'] },
  { id: 'fr-mult', subject: 'math', label: 'Multiplier et partager', topics: ['e-mult', 'e-div'] },
  { id: 'fr-mesure', subject: 'math', label: "L'argent, l'heure et la mesure", topics: ['e-money', 'e-time', 'e-measure'] },
  { id: 'fr-formes', subject: 'math', label: 'Formes et fractions', topics: ['e-shapes', 'e-fractions'] },
  { id: 'fr-problemes', subject: 'math', label: 'Problèmes', topics: ['e-word'] },
  { id: 'fr-vocab', subject: 'reading', label: 'Vocabulaire', topics: ['fr-vocabulaire', 'fr-synonymes', 'fr-contraires'] },
  { id: 'fr-sons', subject: 'reading', label: 'Sons et syllabes', topics: ['fr-sons'] },
  { id: 'fr-ortho', subject: 'reading', label: 'Orthographe et homophones', topics: ['fr-orthographe', 'fr-homophones'] },
  { id: 'fr-grammaire', subject: 'reading', label: 'Grammaire', topics: ['fr-grammaire'] },
  { id: 'fr-lecture', subject: 'reading', label: 'Lecture', topics: ['fr-lecture'] },
  { id: 'fr-dictee', subject: 'reading', label: 'Dictée', topics: ['fr-dictee'] },
];

/** Spelling-test groups (the word is read out loud and typed). Off until chosen. */
export const SPELLING_GROUPS = ['spell', 'fr-dictee'];

export function topicGroups(lang: Lang = getLang()): TopicGroup[] {
  return lang === 'fr' ? TOPIC_GROUPS_FR : TOPIC_GROUPS;
}

export const ALL_GROUP_IDS = TOPIC_GROUPS.map((g) => g.id);
export const ALL_GROUP_IDS_FR = TOPIC_GROUPS_FR.map((g) => g.id);

export function allGroupIds(lang: Lang = getLang()): string[] {
  return lang === 'fr' ? ALL_GROUP_IDS_FR : ALL_GROUP_IDS;
}

/** Math topics taught in each grade (Massachusetts frameworks). */
const MATH_BY_GRADE: Partial<Record<Grade, string[]>> = {
  1: ['e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-doubles', 'e-shapes', 'e-word'],
  2: [
    'e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-doubles', 'e-mult', 'e-time', 'e-shapes',
    'e-fractions', 'e-measure', 'e-word',
  ],
  3: ['mult-facts', 'mult-2x1', 'div-facts', 'add-sub', 'place-value', 'rounding', 'compare', 'patterns', 'fractions-equiv', 'measurement', 'area-perimeter', 'word-problems'],
  4: [
    'mult-facts', 'mult-2x1', 'mult-big', 'mult-2x2', 'div-facts', 'div-remainder', 'div-long', 'add-sub', 'place-value', 'rounding',
    'compare', 'factors', 'patterns', 'fractions-equiv', 'fractions-compare', 'fractions-add', 'fractions-mult', 'decimals',
    'measurement', 'area-perimeter', 'angles', 'word-problems',
  ],
  5: [
    'mult-2x2', 'mult-big', 'mult-3x2', 'div-long', 'div-2digit', 'add-sub', 'place-value', 'rounding', 'factors', 'order-ops',
    'fractions-compare', 'fractions-add', 'fractions-unlike', 'fractions-mult', 'decimals', 'decimal-ops', 'measurement',
    'area-perimeter', 'volume', 'angles', 'word-problems',
  ],
};

/** French math topics by Quebec school year (difficulty 1 = 1re, 2 = 2e, 3 = 3e). */
const MATH_BY_GRADE_FR: Partial<Record<Grade, string[]>> = {
  1: ['e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-doubles', 'e-shapes', 'e-word'],
  2: [
    'e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-doubles', 'e-even-odd', 'e-money', 'e-time',
    'e-shapes', 'e-fractions', 'e-measure', 'e-word',
  ],
  3: [
    'e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-even-odd', 'e-money', 'e-time', 'e-shapes',
    'e-mult', 'e-div', 'e-fractions', 'e-measure', 'e-word',
  ],
};

/** Difficulty range for each grade (1 = warm-up, 3 = stretch). */
export const GRADE_BAND: Partial<Record<Grade, [Difficulty, Difficulty]>> = {
  1: [1, 1],
  2: [1, 2],
  3: [1, 2],
  4: [1, 3],
  5: [2, 3],
};
/** In French, difficulty is the school year itself. */
const GRADE_BAND_FR: Partial<Record<Grade, [Difficulty, Difficulty]>> = {
  1: [1, 1],
  2: [1, 2],
  3: [2, 3],
};

export function gradeBand(grade: Grade, lang: Lang = getLang()): [Difficulty, Difficulty] {
  const g = fitGrade(grade, lang);
  return (lang === 'fr' ? GRADE_BAND_FR : GRADE_BAND)[g]!;
}

export function mathTopicsForGrade(grade: Grade, lang: Lang = getLang()): string[] {
  const g = fitGrade(grade, lang);
  return (lang === 'fr' ? MATH_BY_GRADE_FR : MATH_BY_GRADE)[g]!;
}

/** Topics turned on by the chosen groups. */
export function enabledTopics(groupIds: string[], lang: Lang = getLang()): Set<string> {
  const on = new Set<string>();
  for (const g of topicGroups(lang)) if (groupIds.includes(g.id)) g.topics.forEach((t) => on.add(t));
  return on;
}

/** Groups worth showing for a grade (hides math groups with nothing for that grade). */
export function groupsForGrade(grade: Grade, lang: Lang = getLang()): TopicGroup[] {
  const math = new Set(mathTopicsForGrade(grade, lang));
  return topicGroups(lang).filter((g) => g.subject === 'reading' || g.topics.some((t) => math.has(t)));
}

/** "I need a teacher!" lessons for reading topics, and a fallback for any math topic. */
export const TOPIC_LESSONS: Record<string, string> = {
  synonyms:
    'A SYNONYM is a word that means the same thing, or almost the same thing. Try putting each choice in place of the word. Which one keeps the meaning the same?',
  antonyms:
    'An ANTONYM is a word that means the OPPOSITE. Think: what is the opposite of this word? Like hot and cold, or up and down.',
  vocabulary:
    'Think about where you have heard this word before. Read it in a sentence in your head. Cross out choices that clearly do not fit, then pick the best one left.',
  'context-clues':
    'CONTEXT CLUES are hints in the rest of the sentence. Read the whole sentence again. What is happening? The words around the tricky word tell you what it probably means.',
  'prefixes-suffixes':
    'A PREFIX goes at the START of a word (un- means not, re- means again, pre- means before). A SUFFIX goes at the END (-ful means full of, -less means without). Break the word into parts!',
  roots:
    'Many English words are built from old Greek and Latin ROOTS. For example, "tele" means far, "graph" means write, "port" means carry. Find the root inside the word, then think about what it means.',
  figurative:
    'Figurative language does not mean exactly what the words say. A SIMILE compares using "like" or "as". A METAPHOR says one thing IS another. An IDIOM is a saying, like "it\'s raining cats and dogs". What is the writer REALLY trying to say?',
  homophones:
    'HOMOPHONES sound the same but are spelled differently and mean different things. "There" is a place, "their" means it belongs to them, "they\'re" means they are. Read the sentence with each choice and check which meaning fits.',
  grammar:
    'Read the sentence out loud in your head with each choice. Which one sounds right AND follows the rules? Check who is doing the action, and whether it is happening now, in the past or in the future.',
  spelling:
    'Look carefully at each letter. Sound the word out slowly, syllable by syllable. Watch for tricky parts like double letters, silent letters and "ie" or "ei".',
  comprehension:
    'Read the short story again slowly. Then read the question carefully: is it asking for the MAIN idea, a detail, or what you can figure out (infer)? Find the sentence in the story that proves your answer.',
};
