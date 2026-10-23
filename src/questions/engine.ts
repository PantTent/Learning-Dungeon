// Picks the next question for the child, adapting difficulty per subject
// and bringing missed questions back a few turns later for another try.
import type { Difficulty, Question, Subject } from './types';
import { makeMathQuestion } from './math';
import { allGroupIds, defaultGrade, fitGrade, gradeBand, mathTopicsForGrade, SPELLING_GROUPS, topicGroups, TOPIC_LESSONS, type Grade } from './curriculum';
import { spellOut, spellWords } from './spelling';
import { sizedQuestion, type GroupOptions } from './custom';
import type { Lang } from '../i18n';
import { READING_BANK } from './readingBank';
import { READING_BANK_FR_UPPER } from './readingBankFrUpper';
import { READING_BANK_FR, READING_LESSONS_FR } from './readingBankFr';
import { READING_BANK_EARLY_ALL } from './readingBankEarlyMore';
import { getLang, type Lang as LangT } from '../i18n';
import { clamp, pick, shuffle } from '../util/rng';
import { gradeRange, ladderFor, type Step } from './ladders';

export interface TopicStat {
  asked: number;
  correct: number;
}

export interface LearningStats {
  /** Adaptive level per subject, 1.0 - 3.49 (rounded to choose difficulty). */
  level: Record<Subject, number>;
  topics: Record<string, TopicStat & { subject: Subject }>;
  /** Questions answered wrong, waiting to be asked again. */
  retry: { q: Question; due: number }[];
  recent: string[];
  totalAsked: number;
  totalCorrect: number;
  /** Per-day totals, key "YYYY-MM-DD". */
  days: Record<string, TopicStat>;
  /** Old saves: position on each group's ladder (now `gradeAt`). */
  ladder?: Record<string, number>;
  /** The grade each topic group is on now (see ladders.ts). */
  gradeAt?: Record<string, Grade>;
  /** Answers since the group last changed grade (1 = right), newest last. */
  sinceMove?: Record<string, number[]>;
  /** Last answers per group (1 = right, 0 = wrong), newest last. */
  recentByGroup?: Record<string, number[]>;
}

export interface LearningSettings {
  /** 0-100: share of questions that are math (the rest are reading). */
  mathPercent: number;
  readAloud: boolean;
  /** School grade the questions are pitched at. */
  grade: Grade;
  /** Topic groups the child chose to practice (see curriculum.ts). */
  groups: string[];
  /** Focus practice: only these times tables / divisors (empty = everything for the grade). */
  focus: { multiply: number[]; divide: number[] };
  /** Language of the questions (and the whole game for this hero). */
  lang: Lang;
  /** Parent-pinned grade for a group (missing = automatic). */
  levels?: Record<string, Grade>;
  /** The child's own spelling list (e.g. this week's test). Empty = grade words. */
  spellWords?: string[];
  /** Grown-up choices per topic group: question types, number sizes (see custom.ts). */
  options?: Record<string, GroupOptions>;
  /** Topic groups that existed when these settings were saved (new ones get turned on). */
  knownGroups?: string[];
}

/** Topic groups added after the first version (older saves turn them on). */
const NEW_GROUPS = ['fr-fractions'];

export function newLearningStats(): LearningStats {
  return {
    level: { math: 1.6, reading: 1.6 },
    topics: {},
    retry: [],
    recent: [],
    totalAsked: 0,
    totalCorrect: 0,
    days: {},
  };
}

export function defaultLearningSettings(lang: Lang = 'en'): LearningSettings {
  // Spelling tests are picked on purpose (they need sound), so they start off.
  const groups = allGroupIds(lang).filter((g) => !SPELLING_GROUPS.includes(g));
  return { mathPercent: 60, readAloud: false, grade: defaultGrade(lang), groups, focus: { multiply: [], divide: [] }, lang, knownGroups: allGroupIds(lang) };
}

/** Fill in settings added after a save was created. */
export function upgradeSettings(s: Partial<LearningSettings>): LearningSettings {
  const lang: Lang = s.lang === 'fr' ? 'fr' : 'en';
  const d = defaultLearningSettings(lang);
  const all = allGroupIds(lang);
  const valid = new Set(all);
  const groups = (s.groups ?? []).filter((g) => valid.has(g));
  // Groups added since this save was made start turned on (except spelling tests).
  const known = new Set(s.knownGroups ?? all.filter((g) => !NEW_GROUPS.includes(g)));
  for (const g of all) if (!known.has(g) && !groups.includes(g) && !SPELLING_GROUPS.includes(g) && groups.length) groups.push(g);
  return {
    mathPercent: s.mathPercent ?? d.mathPercent,
    readAloud: s.readAloud ?? d.readAloud,
    grade: fitGrade(s.grade ?? d.grade, lang),
    groups: groups.length ? groups : d.groups,
    focus: { multiply: s.focus?.multiply ?? [], divide: s.focus?.divide ?? [] },
    lang,
    levels: s.levels ?? {},
    spellWords: s.spellWords ?? [],
    options: s.options ?? {},
    knownGroups: all,
  };
}

/** The "I need a teacher!" text for a question. */
export function teacherHelp(q: Question): string {
  if (q.teach) return q.teach;
  if (getLang() === 'fr') {
    return READING_LESSONS_FR[q.topic] ?? 'Relis la question lentement. Que dois-tu trouver? Élimine les choix qui ne peuvent pas être bons, puis choisis le meilleur.';
  }
  return TOPIC_LESSONS[q.topic] ?? 'Read the question again slowly. What is it asking you to find? Cross out choices that cannot be right, then pick the best one left.';
}

/** The reading bank for a language (and the prefix for its question ids). */
function readingBank(lang: LangT) {
  return lang === 'fr' ? { bank: READING_BANK_FR, prefix: 'rf' } : { bank: READING_BANK, prefix: 'r' };
}

/** Strength label for a group, from the last answers. */
export type Strength = 'new' | 'strong' | 'good' | 'practice';

export interface GroupReport {
  /** Recent answers counted (up to RECENT). */
  answered: number;
  /** Share right among recent answers (0..1). */
  accuracy: number;
  strength: Strength;
  /** Grade of the step the child is on now. */
  grade: Grade;
  /** True when a parent pinned the level. */
  pinned: boolean;
}

/** How many recent answers per group decide its strength. */
export const RECENT = 20;
/**
 * Moving between grades, by percent right since the last move:
 * under 70% (after at least 10 answers) drops a grade, and 95% or more over
 * the last 20 answers moves up a grade.
 */
export const DROP_BELOW = 0.7;
export const DROP_AFTER = 10;
export const CLIMB_AT = 0.95;
export const CLIMB_AFTER = 20;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalize a typed answer so "1,200" and " 1200 " both match "1200". */
export function normalize(ans: string): string {
  return ans.trim().toLowerCase().replace(/[,\u00a0\u202f]/g, '').replace(/[’`]/g, "'").replace(/\s+/g, ' ');
}

export function isCorrect(q: Question, given: string): boolean {
  // A tapped choice must be exactly that choice: in French "34,5" and "345"
  // are different answers, so commas only get ignored for typed numbers.
  if (q.input === 'choice') return sameChoice(given, q.answer);
  return normalize(given) === normalize(q.answer);
}

function sameChoice(a: string, b: string): boolean {
  const tidy = (s: string) => s.trim().toLowerCase().replace(/[\u00a0\u202f]/g, ' ').replace(/[’`]/g, "'").replace(/\s+/g, ' ');
  return tidy(a) === tidy(b);
}

/** The grade a group is on now, and the grades it can move between. */
function gradeState(stats: LearningStats, settings: LearningSettings, groupId: string) {
  const steps = ladderFor(groupId, settings.lang);
  const pinned = settings.levels?.[groupId];
  const range = gradeRange(steps, settings.grade, pinned);
  // Old saves kept a step number instead of a grade.
  const old = stats.ladder?.[groupId];
  const saved = stats.gradeAt?.[groupId] ?? (old !== undefined ? steps[Math.floor(old)]?.g : undefined);
  let grade = pinned ? range.start : (saved ?? range.start);
  grade = Math.min(range.hi, Math.max(range.lo, grade)) as Grade;
  // Snap to a grade the ladder really has.
  if (!range.grades.includes(grade)) grade = [...range.grades].reverse().find((g) => g <= grade) ?? range.lo;
  return { steps, range, grade, pinned };
}

export function groupReport(stats: LearningStats, settings: LearningSettings, groupId: string): GroupReport {
  const recent = stats.recentByGroup?.[groupId] ?? [];
  const answered = recent.length;
  const accuracy = answered ? recent.reduce((a, b) => a + b, 0) / answered : 0;
  const strength: Strength = answered < 5 ? 'new' : accuracy >= 0.85 ? 'strong' : accuracy >= 0.65 ? 'good' : 'practice';
  const { grade, pinned } = gradeState(stats, settings, groupId);
  return { answered, accuracy, strength, grade, pinned: !!pinned };
}

export class QuestionEngine {
  private lastWasRetry = false;

  constructor(
    private stats: LearningStats,
    private settings: LearningSettings,
  ) {}

  /** The chosen groups for a subject that have questions in this grade. */
  private groups(subject: Subject) {
    const lang = this.settings.lang;
    const inGrade = new Set(mathTopicsForGrade(this.settings.grade, lang));
    return topicGroups(lang).filter(
      (g) =>
        g.subject === subject &&
        this.settings.groups.includes(g.id) &&
        ladderFor(g.id, lang).length > 0 &&
        (subject === 'reading' || g.topics.some((t) => inGrade.has(t))),
    );
  }

  /** Focus practice (e.g. only the 5s) replaces the multiply / divide ladders. */
  private focusTopic(groupId: string): { topic: string; factors: number[] } | undefined {
    const { multiply, divide } = this.settings.focus;
    if (groupId === 'multiply' && multiply.length) return { topic: 'times-table', factors: multiply };
    if (groupId === 'divide' && divide.length) return { topic: 'div-table', factors: divide };
    return undefined;
  }

  private allowed(q: Question): boolean {
    if (!q.group) return true;
    return this.settings.groups.includes(q.group);
  }

  next(): Question {
    // Re-ask a missed question when it's due (if its group is still chosen).
    this.stats.retry = this.stats.retry.filter((r) => this.allowed(r.q));
    // At most every other question is a retry, so new questions keep coming too.
    const due = this.lastWasRetry ? -1 : this.stats.retry.findIndex((r) => r.due <= this.stats.totalAsked);
    this.lastWasRetry = due >= 0;
    if (due >= 0) {
      const [r] = this.stats.retry.splice(due, 1);
      return { ...r.q, isRetry: true };
    }

    const math = this.groups('math');
    const reading = this.groups('reading');
    let subject: Subject = Math.random() * 100 < this.settings.mathPercent ? 'math' : 'reading';
    if (subject === 'math' && !math.length) subject = 'reading';
    if (subject === 'reading' && !reading.length) subject = 'math';
    const groups = subject === 'math' ? math : reading;
    // Nothing chosen at all: fall back to everything for the grade.
    const pool = groups.length ? groups : topicGroups(this.settings.lang).filter((g) => g.subject === subject && ladderFor(g.id, this.settings.lang).length);

    // Weaker groups come up more often.
    const weights = pool.map((g) => {
      const rep = groupReport(this.stats, this.settings, g.id);
      return rep.answered < 5 ? 1.3 : 0.5 + (1 - rep.accuracy) * 1.5;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let group = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        group = pool[i];
        break;
      }
    }

    const q = this.questionFor(group.id, subject);
    q.group = group.id;
    this.stats.recent.push(q.id);
    // Remember lots of past questions so repeats are rare.
    if (this.stats.recent.length > 250) this.stats.recent.shift();
    return q;
  }

  private questionFor(groupId: string, subject: Subject): Question {
    const { steps, grade } = gradeState(this.stats, this.settings, groupId);
    const opts = this.settings.options?.[groupId];
    // Picked number sizes: only those, never harder.
    if (subject === 'math') {
      const sized = this.sizedQuestion(groupId);
      if (sized) return sized;
    }
    // Picked question types: only steps that have them, as close to the group's grade as possible.
    const want = new Set(opts?.topics ?? []);
    let pool = steps;
    if (want.size) {
      const has = steps.filter((st) => st.topics.some((t) => want.has(t)));
      if (has.length) {
        const best = Math.min(...has.map((st) => Math.abs(st.g - grade) + (st.g > grade ? 0.5 : 0)));
        pool = has.filter((st) => Math.abs(st.g - grade) + (st.g > grade ? 0.5 : 0) === best);
      }
    }
    // Any step of the group's current grade.
    const here = want.size ? pool : pool.filter((st) => st.g === grade);
    const step: Step = pick(here.length ? here : pool);
    const topics = want.size && step.topics.some((t) => want.has(t)) ? step.topics.filter((t) => want.has(t)) : step.topics;
    if (subject === 'math') {
      const focus = this.focusTopic(groupId);
      if (focus && !want.size) return this.mathQuestion(focus.topic, step.d, focus.factors);
      return this.mathQuestion(pick(topics), step.d);
    }
    if (SPELLING_GROUPS.includes(groupId)) return this.spellingQuestion(step);
    return this.readingQuestion(step.d, new Set(topics), step.early, step.upper);
  }

  /** Times tables picked for a group (the 1-digit number, or the divisor). */
  private tables(groupId: string): number[] {
    const { multiply, divide } = this.settings.focus;
    return groupId === 'divide' ? divide : groupId === 'multiply' || groupId === 'fr-mult' ? multiply : [];
  }

  private sizedQuestion(groupId: string): Question | undefined {
    const opts = this.settings.options?.[groupId];
    for (let tries = 0; tries < 20; tries++) {
      const q = sizedQuestion(groupId, opts, this.tables(groupId));
      if (!q) return undefined;
      const full: Question = { ...q, id: `c:${q.prompt}`, subject: 'math', difficulty: 2 };
      if (!this.stats.recent.includes(full.id) || tries === 19) return full;
    }
    return undefined;
  }

  /** "Listen and spell the word": from the child's own list, or the grade list for this step. */
  private spellingQuestion(step: Step): Question {
    const lang = this.settings.lang;
    const own = this.settings.spellWords ?? [];
    const words = own.length ? own : spellWords(lang, step.g);
    const recent = new Set(this.stats.recent.slice(-Math.min(30, Math.floor(words.length * 0.7))));
    const fresh = words.filter((w) => !recent.has(`sp:${w}`));
    const word = pick(fresh.length ? fresh : words);
    const fr = lang === 'fr';
    return {
      id: `sp:${word}`,
      subject: 'reading',
      topic: fr ? 'fr-dictee' : 'spell-words',
      difficulty: step.d,
      prompt: fr ? 'Écoute bien, puis écris le mot que tu entends.' : 'Listen, then spell the word you hear.',
      say: word,
      input: 'text',
      answer: word,
      explanation: fr ? `« ${word} » s'écrit ${spellOut(word)}.` : `"${word}" is spelled ${spellOut(word)}.`,
      teach: fr
        ? 'Dis le mot lentement dans ta tête et écoute chaque son. Coupe les longs mots en syllabes et écris une syllabe à la fois. Attention aux accents, aux lettres muettes et aux lettres doubles!'
        : 'Say the word slowly in your head and listen for each sound. Break long words into syllables and spell one part at a time. Watch for silent letters, double letters and tricky endings.',
    };
  }

  private mathQuestion(topic: string, d: Difficulty, factors?: number[]): Question {
    for (let tries = 0; tries < 20; tries++) {
      const q = makeMathQuestion(topic, d, factors);
      if (!this.stats.recent.includes(q.id)) return q;
    }
    return makeMathQuestion(topic, d, factors);
  }

  private readingQuestion(d: Difficulty, topics: Set<string>, early = false, upper = false): Question {
    const recent = new Set(this.stats.recent);
    const { bank, prefix } = early
      ? { bank: READING_BANK_EARLY_ALL, prefix: 're' }
      : upper
        ? { bank: READING_BANK_FR_UPPER, prefix: 'ru' }
        : readingBank(this.settings.lang);
    const all = bank.map((item, i) => ({ item, i })).filter((x) => topics.has(x.item.topic));
    const id = (x: { i: number }) => `${prefix}:${x.i}`;
    let pool = all.filter((x) => x.item.difficulty === d && !recent.has(id(x)));
    // Out of new ones at this level: repeat ones from this level, skipping the latest few.
    if (!pool.length) {
      const latest = new Set(this.stats.recent.slice(-20));
      pool = all.filter((x) => x.item.difficulty === d && !latest.has(id(x)));
    }
    if (!pool.length) pool = all.filter((x) => x.item.difficulty === d);
    if (!pool.length) pool = all.length ? all : bank.map((item, i) => ({ item, i }));
    const { item, i } = pick(pool);
    return {
      id: `${prefix}:${i}`,
      subject: 'reading',
      topic: item.topic,
      difficulty: item.difficulty,
      prompt: item.prompt,
      input: 'choice',
      answer: item.answer,
      choices: shuffle([item.answer, ...item.wrong]),
      explanation: item.explanation,
    };
  }

  record(q: Question, correct: boolean): void {
    const s = this.stats;
    s.totalAsked++;
    if (correct) s.totalCorrect++;
    const t = (s.topics[q.topic] ??= { asked: 0, correct: 0, subject: q.subject });
    t.asked++;
    if (correct) t.correct++;
    const day = (s.days[today()] ??= { asked: 0, correct: 0 });
    day.asked++;
    if (correct) day.correct++;

    const [lo, hi] = gradeBand(this.settings.grade, this.settings.lang);
    s.level[q.subject] = clamp(s.level[q.subject] + (correct ? 0.12 : -0.22), lo, hi + 0.49);

    // Move the group down a grade when it's under 70% right, up a grade at 95%+.
    if (q.group) {
      const { range, grade, pinned } = gradeState(s, this.settings, q.group);
      s.gradeAt ??= {};
      s.sinceMove ??= {};
      s.gradeAt[q.group] = grade;
      const since = (s.sinceMove[q.group] ??= []);
      since.push(correct ? 1 : 0);
      if (since.length > CLIMB_AFTER) since.shift();
      const acc = since.reduce((a, b) => a + b, 0) / since.length;
      const i = range.grades.indexOf(grade);
      if (!pinned && since.length >= DROP_AFTER && acc < DROP_BELOW && grade > range.lo) {
        s.gradeAt[q.group] = range.grades[i - 1];
        s.sinceMove[q.group] = [];
      } else if (!pinned && since.length >= CLIMB_AFTER && acc >= CLIMB_AT && grade < range.hi) {
        s.gradeAt[q.group] = range.grades[i + 1];
        s.sinceMove[q.group] = [];
      }
      s.recentByGroup ??= {};
      const rec = (s.recentByGroup[q.group] ??= []);
      rec.push(correct ? 1 : 0);
      if (rec.length > RECENT) rec.shift();
    }

    if (!correct && !s.retry.some((r) => r.q.id === q.id)) {
      // Ask it again in a few questions with fresh answer order.
      const again = { ...q, choices: q.choices ? shuffle([...q.choices]) : undefined };
      s.retry.push({ q: again, due: s.totalAsked + 3 + Math.floor(Math.random() * 4) });
      if (s.retry.length > 15) s.retry.shift();
    }
  }
}
