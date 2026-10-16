// Picks the next question for the child, adapting difficulty per subject
// and bringing missed questions back a few turns later for another try.
import type { Difficulty, Question, Subject } from './types';
import { makeMathQuestion, mathTopicLevels } from './math';
import { allGroupIds, defaultGrade, enabledTopics, fitGrade, gradeBand, mathTopicsForGrade, topicGroups, TOPIC_LESSONS, type Grade } from './curriculum';
import type { Lang } from '../i18n';
import { READING_BANK } from './readingBank';
import { READING_BANK_FR, READING_LESSONS_FR } from './readingBankFr';
import { getLang, type Lang as LangT } from '../i18n';
import { clamp, pick, shuffle } from '../util/rng';

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
}

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
  return { mathPercent: 60, readAloud: false, grade: defaultGrade(lang), groups: [...allGroupIds(lang)], focus: { multiply: [], divide: [] }, lang };
}

/** Fill in settings added after a save was created. */
export function upgradeSettings(s: Partial<LearningSettings>): LearningSettings {
  const lang: Lang = s.lang === 'fr' ? 'fr' : 'en';
  const d = defaultLearningSettings(lang);
  const valid = new Set(allGroupIds(lang));
  const groups = (s.groups ?? []).filter((g) => valid.has(g));
  return {
    mathPercent: s.mathPercent ?? d.mathPercent,
    readAloud: s.readAloud ?? d.readAloud,
    grade: fitGrade(s.grade ?? d.grade, lang),
    groups: groups.length ? groups : d.groups,
    focus: { multiply: s.focus?.multiply ?? [], divide: s.focus?.divide ?? [] },
    lang,
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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pickDifficulty(level: number, [lo, hi]: [Difficulty, Difficulty]): Difficulty {
  // Occasionally give an easier one to keep confidence up.
  if (Math.random() < 0.15) return clamp(Math.floor(level) - 1, lo, hi) as Difficulty;
  const base = Math.floor(level);
  const frac = level - base;
  return clamp(Math.random() < frac ? base + 1 : base, lo, hi) as Difficulty;
}

/** Normalize a typed answer so "1,200" and " 1200 " both match "1200". */
export function normalize(ans: string): string {
  return ans.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
}

export function isCorrect(q: Question, given: string): boolean {
  return normalize(given) === normalize(q.answer);
}

export class QuestionEngine {
  constructor(
    private stats: LearningStats,
    private settings: LearningSettings,
  ) {}

  /** Math topics allowed right now: in the child's grade AND in a chosen group. */
  private mathTopics(): string[] {
    const on = enabledTopics(this.settings.groups, this.settings.lang);
    const { multiply, divide } = this.settings.focus;
    const groups = this.settings.groups;
    // A focus (e.g. "only the 5s") replaces the whole group with focused questions.
    const focusMult = multiply.length > 0 && groups.includes('multiply');
    const focusDiv = divide.length > 0 && groups.includes('divide');
    const lang = this.settings.lang;
    const multTopics = new Set(topicGroups(lang).find((g) => g.id === 'multiply')?.topics ?? []);
    const divTopics = new Set(topicGroups(lang).find((g) => g.id === 'divide')?.topics ?? []);
    const topics = mathTopicsForGrade(this.settings.grade, lang).filter(
      (t) => on.has(t) && !(focusMult && multTopics.has(t)) && !(focusDiv && divTopics.has(t)),
    );
    if (focusMult) topics.push('times-table');
    if (focusDiv) topics.push('div-table');
    return topics;
  }

  private readingTopics(): Set<string> {
    const on = enabledTopics(this.settings.groups, this.settings.lang);
    return new Set(readingBank(this.settings.lang).bank.map((b) => b.topic).filter((t) => on.has(t)));
  }

  next(): Question {
    const mathTopics = this.mathTopics();
    const readingTopics = this.readingTopics();
    const allowed = (q: Question) => (q.subject === 'math' ? mathTopics.includes(q.topic) : readingTopics.has(q.topic));

    // Re-ask a missed question when it's due (if its topic is still chosen).
    this.stats.retry = this.stats.retry.filter((r) => allowed(r.q));
    const due = this.stats.retry.findIndex((r) => r.due <= this.stats.totalAsked);
    if (due >= 0) {
      const [r] = this.stats.retry.splice(due, 1);
      return { ...r.q, isRetry: true };
    }

    let subject: Subject = Math.random() * 100 < this.settings.mathPercent ? 'math' : 'reading';
    if (subject === 'math' && mathTopics.length === 0) subject = 'reading';
    if (subject === 'reading' && readingTopics.size === 0) subject = 'math';
    if (subject === 'math' && mathTopics.length === 0) subject = 'reading'; // nothing chosen at all: fall back to reading

    const band = gradeBand(this.settings.grade, this.settings.lang);
    this.stats.level[subject] = clamp(this.stats.level[subject], band[0], band[1] + 0.49);
    const d = pickDifficulty(this.stats.level[subject], band);
    const q = subject === 'math' ? this.mathQuestion(d, mathTopics) : this.readingQuestion(d, readingTopics);
    this.stats.recent.push(q.id);
    // Remember lots of past questions so repeats are rare.
    if (this.stats.recent.length > 250) this.stats.recent.shift();
    return q;
  }

  private mathQuestion(d: Difficulty, allowed: string[]): Question {
    const [lo, hi] = gradeBand(this.settings.grade, this.settings.lang);
    // Prefer topics that have questions at this difficulty; otherwise any allowed topic.
    let topics = allowed.filter((t) => mathTopicLevels(t).includes(d));
    if (!topics.length) topics = allowed.filter((t) => mathTopicLevels(t).some((l) => l >= lo && l <= hi));
    if (!topics.length) topics = allowed;
    // Favor topics the child is weaker at.
    const weights = topics.map((t) => {
      const s = this.stats.topics[t];
      if (!s || s.asked < 3) return 1.5;
      return 0.6 + (1 - s.correct / s.asked) * 2;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let topic = topics[0];
    for (let i = 0; i < topics.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        topic = topics[i];
        break;
      }
    }
    const factors = topic === 'times-table' ? this.settings.focus.multiply : topic === 'div-table' ? this.settings.focus.divide : undefined;
    for (let tries = 0; tries < 20; tries++) {
      const q = makeMathQuestion(topic, d, factors);
      if (!this.stats.recent.includes(q.id)) return q;
    }
    return makeMathQuestion(topic, d, factors);
  }

  private readingQuestion(d: Difficulty, topics: Set<string>): Question {
    const recent = new Set(this.stats.recent);
    const { bank, prefix } = readingBank(this.settings.lang);
    const all = bank.map((item, i) => ({ item, i })).filter((x) => topics.size === 0 || topics.has(x.item.topic));
    const [lo, hi] = gradeBand(this.settings.grade, this.settings.lang);
    let pool = all.filter((x) => x.item.difficulty === d && !recent.has(`${prefix}:${x.i}`));
    if (pool.length === 0) pool = all.filter((x) => x.item.difficulty >= lo && x.item.difficulty <= hi && !recent.has(`${prefix}:${x.i}`));
    // Out of new ones at this level: repeat ones from the grade, skipping the latest few.
    if (pool.length === 0) {
      const latest = new Set(this.stats.recent.slice(-20));
      pool = all.filter((x) => x.item.difficulty >= lo && x.item.difficulty <= hi && !latest.has(`${prefix}:${x.i}`));
    }
    if (pool.length === 0) pool = all.filter((x) => !recent.has(`${prefix}:${x.i}`));
    if (pool.length === 0) pool = all.length ? all : bank.map((item, i) => ({ item, i }));
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

    if (!correct && !s.retry.some((r) => r.q.id === q.id)) {
      // Ask it again in a few questions with fresh answer order.
      const again = { ...q, choices: q.choices ? shuffle([...q.choices]) : undefined };
      s.retry.push({ q: again, due: s.totalAsked + 3 + Math.floor(Math.random() * 4) });
      if (s.retry.length > 15) s.retry.shift();
    }
  }
}
